import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { MasterRepository } from 'src/repositories/master.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { UserRepository } from 'src/repositories/user.repository';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class PassCodeServiceV4 {
  constructor(
    private readonly commonService: CommonService,
    private readonly cryptService: CryptService,
    private readonly masterRepo: MasterRepository,
    private readonly repository: UserRepository,
    private readonly allsmsService: AllsmsService,
    private readonly repoManager: RepositoryManager,
    private readonly typeService: TypeService,
  ) {}

  async setPasscode(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      let passCode = reqData.passCode;
      if (!passCode) return kParamMissing('passCode');
      if (isNaN(passCode)) return kInvalidParamValue('passCode');
      if (passCode.length != 4) return kInvalidParamValue('passCode');

      // User validation
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['id', 'status'];
      const include = [masterInclude];
      const attributes = ['pin'];
      const options = { include, where: { id: userId } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      if (userData.pin?.length == 4)
        userData.pin = await this.cryptService.getMD5Hash(userData.pin);

      passCode = await this.cryptService.getMD5Hash(passCode);

      if (userData.pin == passCode)
        return k422ErrorMessage(
          'The passcode you entered already exists. Please choose another.',
        );

      // Update user data
      let updatedData: any = {
        pin: passCode,
        lastPasscodeSetAt: new Date().toUTCString(),
      };
      let updateResult = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      const masterId = userData.masterData?.id;
      const statusData = userData.masterData.status ?? {};
      updatedData = { status: statusData };
      updatedData.status.pin = 1;
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkPassCode(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    let passCode = reqData.passCode;
    if (!passCode) return kParamMissing('passCode');
    if (isNaN(passCode)) return kInvalidParamValue('passCode');
    if (passCode.length != 4) return kInvalidParamValue('passCode');
    // Get user data
    const attributes = ['pin', 'phone', 'lastPasscodeSetAt'];
    const options = { where: { id: reqData.userId } };
    const userData = await this.repository.getRowWhereData(attributes, options);
    if (userData == k500Error) return kInternalError;
    if (!userData) return k422ErrorMessage(kNoDataFound);
    if (!userData.pin)
      return k422ErrorMessage(
        'Kindly set the passcode before proceeding for checking',
      );

    if (userData.pin.length == 4) {
      if (userData.pin != passCode)
        return k422ErrorMessage(
          'Incorrect passcode, Kindly provide the correct passcode',
        );
    } else {
      passCode = await this.cryptService.getMD5Hash(passCode);
      if (userData.pin != passCode)
        return k422ErrorMessage(
          'Incorrect passcode, Kindly provide the correct passcode',
        );
    }
    const jwtToken = await this.cryptService.generateJWT({
      phone: this.cryptService.decryptPhone(userData.phone),
      userId,
    });
    const typeOfDevice = reqData.typeOfDevice
    await this.repository.updateRowData({ jwtToken, typeOfDevice }, userId);

    return { needUserInfo: true, jwtToken };
  }

  async updateBulkPasscodeMigrate() {
    try {
      let userDetails: any = await this.repository.getTableWhereData(
        ['id', 'pin', 'updatedAt'],
        {
          where: {
            [Op.and]: [
              { pin: { [Op.not]: null } },
              Sequelize.where(Sequelize.fn('LENGTH', Sequelize.col('pin')), 4),
            ],
          },
          order: [['id', 'DESC']],
          limit: 1000,
        },
      );

      if (userDetails.length === 0) return true;
      const hashPinUpdates = userDetails.map((user) => ({
        id: user.id,
        hashPin: this.cryptService.getMD5Hash(user.pin),
        passcodeSetDate: new Date(user.updatedAt).toUTCString(),
      }));
      const updateQueries = hashPinUpdates
        .map(
          (update) => `
            UPDATE public."registeredUsers" 
            SET "pin" = '${update.hashPin}', "lastPasscodeSetAt" = '${update.passcodeSetDate}' 
            WHERE id = '${update.id}';
        `,
        )
        .join('');

      const updatePin = await this.repoManager.injectRawQuery(
        registeredUsers,
        updateQueries,
      );

      if (updatePin == k500Error) return kInternalError;
      await this.updateBulkPasscodeMigrate();
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async changePasscode(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      let passCode = reqData.passCode;
      if (!passCode) return kParamMissing('passCode');
      if (passCode.length != 4 || isNaN(passCode))
        return kInvalidParamValue('passCode');

      // Get user data
      const attributes = ['pin'];
      const options = { where: { id: userId } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      if (!userData.pin)
        return k422ErrorMessage(
          'Please submit passCode before proceeding for change',
        );

      if (userData.pin.length == 4) {
        userData.pin = await this.cryptService.getMD5Hash(userData.pin);
      }
      passCode = await this.cryptService.getMD5Hash(passCode);

      if (userData.pin == passCode)
        return k422ErrorMessage(
          'The passcode you entered already exists. Please choose another.',
        );
      // Update user data
      let updatedData: any = {
        pin: passCode,
        lastPasscodeSetAt: new Date().toUTCString(),
      };
      const updateResult = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async forgetPassCode(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const smsKey = reqData?.smsKey;

      // Get user data
      const attributes = ['pin', 'phone'];
      const options = { where: { id: userId } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      if (!userData.pin)
        return k422ErrorMessage(
          'Please submit passCode before proceeding for change',
        );

      const otp = this.commonService.generateOTP();
      const phone = this.cryptService.decryptPhone(userData.phone);

      await this.allsmsService.sendOtp(otp, phone, smsKey);

      // Update user data
      const updatedData = { otp };
      const updateResult = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (updateResult == k500Error) return kInternalError;

      return {
        showOTPBox: true,
        type: 'passcode',
        otpBoxValue: '+91 ' + phone,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
