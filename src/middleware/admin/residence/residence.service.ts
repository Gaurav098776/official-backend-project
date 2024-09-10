// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import {
  ResidenceVerificationSuccess,
  SResidenceNotVerify,
  SResidenceVerification,
  vResidence,
} from 'src/constants/strings';
import { UserRepository } from 'src/repositories/user.repository';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import { Op } from 'sequelize';
import { MasterRepository } from 'src/repositories/master.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CryptService } from 'src/utils/crypt.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';

@Injectable()
export class ResidenceService {
  constructor(
    private readonly addressRepo: AddressesRepository,
    private readonly userRepository: UserRepository,
    private readonly userService: UserServiceV4,
    private readonly masterRepository: MasterRepository,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly cryptService: CryptService,
    private readonly commonSharedService: CommonSharedService,
  ) {}

  async changeResidenceStatus(body) {
    try {
      if (!body.userId || !body.status || !body.adminId) return kParamsMissing;
      if (body.status == '2' && !body.rejectReason)
        return kParamMissing('rejectReason');
      const userId = body.userId;
      const status = body.status;
      const adminId = body.adminId;
      const rejectReason = body.rejectReason;
      const userAttr = ['id', 'fullName', 'phone', 'fcmToken'];
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'status', 'dates'],
      };
      const userOptions = {
        where: { id: userId, isBlacklist: { [Op.ne]: '1' } },
        include: [masterInclude],
      };
      const userData = await this.userRepository.getRowWhereData(
        userAttr,
        userOptions,
      );
      if (!userData || userData === k500Error)
        return k422ErrorMessage('User not found!');

      const updateUserData = await this.userRepository.updateRowData(
        {
          homeStatus: status,
          residenceRejectReason: rejectReason,
          residenceAdminId: adminId,
        },
        userData.id,
      );
      if (updateUserData === k500Error || updateUserData[0] <= 0)
        return k422ErrorMessage('Residence not updated!');
      const masterData = userData.masterData;
      const statusData = masterData?.status ?? {};
      const dates = masterData?.dates ?? {};
      const rejection = masterData?.rejection ?? {};
      rejection.residence = rejectReason ?? '';
      statusData.residence = +status;
      dates.residence = new Date().getTime();
      const approved = [1, 3, 4];
      if (
        approved.includes(statusData.pan) &&
        approved.includes(statusData.selfie) &&
        approved.includes(statusData.contact) &&
        approved.includes(statusData.reference) &&
        approved.includes(statusData.residence)
      ) {
        statusData.loan = 0;
        statusData.eligibility = 0;
      }
      const masterUpdate = { status: statusData, dates, rejection };
      const masterUpdateRecord = await this.masterRepository.updateRowData(
        masterUpdate,
        masterData.id,
      );
      if (masterUpdateRecord == k500Error || masterUpdateRecord[0] == 0)
        return kInternalError;

      if (status == '2' && rejectReason) {
        const rejectReasonData =
          await this.commonSharedService.getRejectReasonTemplate(rejectReason);
        if (rejectReasonData.message) return rejectReasonData;
        this.sendResidenceNotification(
          userData,
          status,
          rejectReasonData,
          adminId,
        );
      } else this.sendResidenceNotification(userData, status, {}, adminId);
      await this.userService.routeDetails({ id: userId });
      return kSUCCESSMessage('Residence updated!');
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async sendResidenceNotification(userData, status, rejectReasonData, adminId) {
    try {
      userData.phone = await this.cryptService.decryptPhone(userData.phone);
      let title;
      let body;
      if (status == '3' || status == '1') {
        title = SResidenceVerification;
        body = ResidenceVerificationSuccess;
      } else if (status == '2') {
        title = SResidenceNotVerify;
        body = rejectReasonData?.content;
      } else return {};

      // Push notification
      this.sharedNotificationService.sendNotificationToUser({
        userList: [userData.id],
        title,
        content: body,
        adminId,
      });

      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async addressList(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');

      const attributes = [
        'address',
        'lat',
        'long',
        'type',
        'probability',
        'subType',
        'status',
      ];
      const data = await this.addressRepo.getTableWhereData(attributes, {
        where: { userId },
      });
      if (data == k500Error) return kInternalError;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
