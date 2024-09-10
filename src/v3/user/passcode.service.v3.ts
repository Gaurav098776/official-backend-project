import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';

@Injectable()
export class PassCodeServiceV3 {
  constructor(
    private readonly commonService: CommonService,
    private readonly cryptService: CryptService,
    private readonly masterRepo: MasterRepository,
    private readonly repository: UserRepository,
    private readonly allsmsService: AllsmsService,
  ) {}

  async setPasscode(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const passCode = reqData.passCode;
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
      // if (userData.pin) return k422ErrorMessage('PassCode already exists');

      // Update user data
      let updatedData: any = { pin: passCode };
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
      return kInternalError;
    }
  }

  async checkPassCode(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const passCode = reqData.passCode;
    if (!passCode) return kParamMissing('passCode');
    if (isNaN(passCode)) return kInvalidParamValue('passCode');
    if (passCode.length != 4) return kInvalidParamValue('passCode');

    // Get user data
    const attributes = ['pin', 'phone'];
    const options = { where: { id: reqData.userId } };
    const userData = await this.repository.getRowWhereData(attributes, options);
    if (userData == k500Error) return kInternalError;
    if (!userData) return k422ErrorMessage(kNoDataFound);
    if (!userData.pin)
      return k422ErrorMessage(
        'Kindly set the passcode before proceeding for checking',
      );

    if (userData.pin != passCode)
      return k422ErrorMessage(
        'Incorrect passcode, Kindly provide the correct passcode',
      );
    const jwtToken = await this.cryptService.generateJWT({
      phone: this.cryptService.decryptPhone(userData.phone),
      userId,
    });
    await this.repository.updateRowData({ jwtToken }, userId);

    return { needUserInfo: true, jwtToken };
  }

  async changePasscode(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const passCode = reqData.passCode;
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

      // Update user data
      const updatedData = { pin: passCode };
      const updateResult = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
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
      return kInternalError;
    }
  }
}
