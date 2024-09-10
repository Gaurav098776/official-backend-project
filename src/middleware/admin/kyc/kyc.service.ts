// Imports
import { Injectable } from '@nestjs/common/decorators';
import { Op } from 'sequelize';
import { PAGE_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  nKYCNotPAN,
  nKYCPAN,
  PanVerificationSuccess,
} from 'src/constants/strings';
import { KYCEntity } from 'src/entities/kyc.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { PredictionService } from '../eligibility/prediction.service';

@Injectable()
export class KycDashboardService {
  constructor(
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly kycRepo: KYCRepository,
    private readonly masterRepo: MasterRepository,
    private readonly UserService: UserServiceV4,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly eligibilitySharedService: EligibilitySharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly predictionService: PredictionService,
    // Utils services
    private readonly fileService: FileService,
  ) {}

  async getVerificationData(query) {
    try {
      const userAttr = [
        'id',
        'fullName',
        'phone',
        'city',
        'email',
        'contactApproveBy',
      ];
      const userOptions = await this.prepareKycVerificationOptions(
        query.status,
        query.page,
        query.searchText,
        query.startDate,
        query.endDate,
        query.newOrRepeated,
        query.download,
      );
      const userData = await this.userRepo.getTableWhereDataWithCounts(
        userAttr,
        userOptions,
      );
      if (userData === k500Error) return k500Error;
      const data = await this.preparDataForKycData(userData.rows);

      if (data == k500Error) return k500Error;

      return { count: userData.count, rows: data };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  
  async getUserKycDetailsHistory(reqData: any) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const attributes = [
        'id',
        'createdAt',
        'updatedAt',
        'maskedAadhaar',
        'kycCompletionDate',
        'aadhaarFront',
        'aadhaarBack',
        'aadhaarVerifiedAdmin',
        'aadhaarStatus',
        'panCardNumber',
        'pan',
        'panUploadedAdmin',
        'panVerifiedAdmin',
        'panStatus',
        'otherDocType',
        'kycCompletionDate',
        'otherDocFront',
        'otherDocBack',
        'otherDocBack',
        'otherDocUploadedAdmin',
        'otherDocVerifiedAdmin',
        'otherDocStatus',
      ];
      const options = {
        where: { userId },
        order: [['id', 'DESC']],
      };
      const kycData = await this.kycRepo.getTableWhereData(attributes, options);
      if (kycData == k500Error) return kInternalError;
      if (!kycData) return k422ErrorMessage('No data found');
      await this.addGetAdminData(kycData);
      return kycData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async addGetAdminData(kycData) {
    try {
      for (let index = 0; index < kycData.length; index++) {
        const data = kycData[index];
        const aadhaarVerifiedAdminData =
          await this.commonSharedService.getAdminData(
            data?.aadhaarVerifiedAdmin,
          );
        data.aadhaarVerifiedAdminData = {
          id: aadhaarVerifiedAdminData.id,
          fullName: aadhaarVerifiedAdminData.fullName,
        };
        const panVerifiedAdminData =
          await this.commonSharedService.getAdminData(data?.panVerifiedAdmin);
        data.panVerifiedAdminData = {
          id: panVerifiedAdminData.id,
          fullName: panVerifiedAdminData.fullName,
        };
        const panUploadedAdminData =
          await this.commonSharedService.getAdminData(data?.panUploadedAdmin);
        data.panUploadedAdminData = {
          id: panUploadedAdminData.id,
          fullName: panUploadedAdminData.fullName,
        };
        const otherDocVerifiedAdminData =
          await this.commonSharedService.getAdminData(
            data?.otherDocVerifiedAdmin,
          );
        data.otherDocVerifiedAdminData = {
          id: otherDocVerifiedAdminData.id,
          fullName: otherDocVerifiedAdminData.fullName,
        };
        const otherDocUploadedAdminData =
          await this.commonSharedService.getAdminData(
            data?.otherDocUploadedAdmin,
          );
        data.otherDocUploadedAdminData = {
          id: otherDocUploadedAdminData.id,
          fullName: otherDocUploadedAdminData.fullName,
        };
      }
    } catch (error) {}
  }

  async prepareKycVerificationOptions(
    status,
    page = 1,
    searchText,
    startDate = null,
    endDate = null,
    newOrRepeated = null,
    download = 'false',
  ) {
    try {
      let searchWhere: any = {};
      const toDay = this.typeService.getGlobalDate(new Date());
      if (searchText) {
        let encSearch = '';
        if (!isNaN(searchText)) {
          encSearch = this.cryptService.encryptPhone(searchText);
          encSearch = encSearch.split('===')[1];
        }
        searchWhere = {
          [Op.or]: [
            { fullName: { [Op.iRegexp]: searchText } },
            { phone: { [Op.like]: encSearch ? '%' + encSearch + '%' : null } },
          ],
        };
      }
      if (startDate && endDate) {
        const range = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        searchWhere.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      }
      if (newOrRepeated == '1') searchWhere.completedLoans = 0;
      else if (newOrRepeated == '0')
        searchWhere.completedLoans = { [Op.gt]: 0 };
      const kycAttr = [
        'id',
        'userId',
        'maskedAadhaar',
        'aadhaarStatus',
        'aadhaarFront',
        'aadhaarBack',
        'aadhaarVerifiedAdmin',
        'aadhaarRejectReason',
        'aadhaarResponse',
        'pan',
        'panCardNumber',
        'panStatus',
        'panResponse',
        'panVerifiedAdmin',
        'panUploadedAdmin',
        'panRejectReason',
        'otherDocType',
        'otherDocFront',
        'otherDocBack',
        'otherDocStatus',
        'otherDocResponse',
        'otherDocRejectReason',
        'otherDocVerifiedAdmin',
        'otherDocUploadedAdmin',
      ];

      let kycInclude = {
        model: KYCEntity,
        attributes: kycAttr,
        where: {},
      };
      const userOptions: any = {
        where: {
          isBlacklist: '0',
          quantity_status: { [Op.or]: ['1', '3'] },
          ...searchWhere,
        },
        distinct: true,
      };
      const where: any = {};
      if (status == '1') {
        where[Op.or] = [
          { aadhaarStatus: { [Op.or]: ['1', '3'] } },
          { panStatus: { [Op.or]: ['1', '3'] } },
          // { otherDocStatus: { [Op.or]: ['1', '3'] } },
        ];
      } else if (status != '4') {
        userOptions.include.push({
          model: UserSelfieEntity,
          attributes: ['id', 'status'],
          where: { status: { [Op.or]: ['1', '3'] } },
        });
        where[Op.or] = [{ aadhaarStatus: status }, { panStatus: status }];
      }
      kycInclude.where = where;
      userOptions.include.push(kycInclude);
      if (status == '0') {
        userOptions.where['NextDateForApply'] = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
      }
      if (status != '0' && download != 'true') {
        userOptions.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        userOptions.limit = PAGE_LIMIT;
      }
      return userOptions;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  //#region pre pare condtect Data
  private async preparDataForKycData(data) {
    try {
      const finalData = [];

      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        try {
          const tmpData: any = {};
          const verification = this.typeService.getVerificationLastData(
            item?.verificationTrackerData,
          );
          const kycData = item?.kycData;

          let successStatus = ['1', '3'];
          let status: any = '0';
          if (
            successStatus.includes(kycData.aadhaarStatus) &&
            successStatus.includes(kycData.panStatus) &&
            (successStatus.includes(kycData.otherDocStatus) ||
              kycData.otherDocStatus == '-1')
          )
            status = '1';
          else if (
            kycData.aadhaarStatus == '2' ||
            kycData.panStatus == '2' ||
            kycData.otherDocStatus == '2'
          )
            status = '2';
          tmpData['userId'] = item?.id;
          tmpData['Waiting time'] = verification.waitingTime;
          tmpData['Difference in minutes'] = verification.minutes;
          tmpData['Mobile number'] = this.cryptService.decryptPhone(item.phone);
          tmpData['Name'] = item?.fullName;
          //aadhaar doc data
          tmpData['aadhaarFront'] = kycData?.aadhaarFront;
          tmpData['aadhaarBack'] = kycData?.aadhaarBack;
          tmpData['aadhaarNumber'] = kycData?.maskedAadhaar;
          tmpData['Aadhaar card'] = kycData?.aadhaarStatus;
          tmpData['aadhaarStatus'] = kycData?.aadhaarStatus;
          tmpData['aadhaarRejectReason'] = kycData?.aadhaarRejectReason;
          tmpData['aadhaarVerifiedAdmin'] = kycData?.aadhaarVerifiedAdmin;
          tmpData['aadhaarVerifiedAdminName'] =
            (
              await this.commonSharedService.getAdminData(
                kycData.aadhaarVerifiedAdmin,
              )
            )?.fullName ?? '-';
          if (kycData?.aadhaarResponse) {
            const aadhaarResponse = JSON.parse(kycData?.aadhaarResponse);
            tmpData['Aadhaar name'] = aadhaarResponse?.full_name ?? '-';
          }
          //pan card  data
          tmpData['Pan card'] = kycData?.panStatus;
          tmpData['pan'] = kycData?.pan;
          tmpData['panCardNumber'] = kycData?.panCardNumber;
          tmpData['panStatus'] = kycData?.panStatus;
          tmpData['panRejectReason'] = kycData?.panRejectReason;
          if (kycData?.panResponse) {
            const panResponse = JSON.parse(kycData?.panResponse);
            const panSuccess = panResponse?.success;
            tmpData['Pan name'] = panSuccess
              ? panResponse?.result?.user_full_name ?? '-'
              : '-';
          }
          //other doc data
          tmpData['otherDocFront'] = kycData?.otherDocFront;
          tmpData['otherDocBack'] = kycData?.otherDocBack;
          tmpData['Optional status'] = kycData?.otherDocStatus;
          tmpData['City'] = item?.city;
          tmpData['Last action by'] =
            (
              await this.commonSharedService.getAdminData(
                kycData?.panVerifiedAdmin,
              )
            )?.fullName ?? '-';
          tmpData['otherDocRejectReason'] = kycData?.otherDocRejectReason;
          tmpData['otherDocType'] = kycData?.otherDocType;
          tmpData['otherDocVerifiedAdmin'] = kycData?.otherDocVerifiedAdmin;
          tmpData['Status'] = status;
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async funChangeKycStatus(body) {
    if (!body.userId || !body.status || !body.adminId) return kParamsMissing;
    if (body.status == 2)
      if (!body.rejectReason) return kParamMissing('rejectReason');

    const updatedData: any = await this.updateKycDetails(
      body.userId,
      body.status,
      body.adminId,
      body.rejectReason,
    );
    if (updatedData.message) return updatedData;
    await this.UserService.routeDetails({ id: body.userId });
    return updatedData;
  }

  async updateKycDetails(userId, status, adminId, rejectReason) {
    try {
      const attr = ['id', 'kycId', 'fullName', 'fcmToken', 'phone'];
      const kycInclude = {
        model: KYCEntity,
        attributes: ['aadhaarStatus', 'panStatus', 'otherDocStatus'],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'loanId', 'status', 'dates', 'rejection'],
      };
      const userOptions = {
        where: { id: userId },
        include: [kycInclude, masterInclude],
      };
      const userData: any = await this.userRepo.getRowWhereData(
        attr,
        userOptions,
      );
      if (!userData || userData == k500Error)
        return k422ErrorMessage('User data not found!');

      const prepareUpdateData: any = this.prepareUpdateData(
        status,
        userData,
        adminId,
        rejectReason,
      );
      if (prepareUpdateData.message) return kInternalError;

      const updatedKyc = prepareUpdateData?.kycUpdate;
      const updateMaster = prepareUpdateData?.masterUpdate;
      const kycId = userData.kycId;
      const kycUpdated = await this.kycRepo.updateRowData(updatedKyc, kycId);
      if (kycUpdated == k500Error || kycUpdated[0] == 0)
        return k422ErrorMessage('Kyc status not updated!');
      const masterData = userData.masterData;
      await this.masterRepo.updateRowData(updateMaster, masterData.id);
      /// check final approval when bank is approved
      const approvedStatus = [1, 3];
      if (
        approvedStatus.includes(updateMaster?.status?.bank) &&
        approvedStatus.includes(updateMaster?.status?.pan)
      ) {
        const finalData = { loanId: masterData.loanId, userId };
        const finalApproval = await this.eligibilitySharedService.finalApproval(
          finalData,
        );
        if (finalApproval.message) return finalApproval;
      }
      await this.predictionService.assignToAdmin(masterData.loanId);
      this.sendKYCUpdateNotification(userData, status, rejectReason, adminId);
      return 'Kyc status changed!';
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  prepareUpdateData(status, userData, adminId, rejectReason) {
    try {
      const masterData = userData.masterData;
      const statusData = masterData?.status ?? {};
      const rejection = masterData?.rejection ?? {};
      const dates = masterData?.dates ?? {};
      let updateData: any = {};
      updateData = { panStatus: status, panVerifiedAdmin: adminId };
      statusData.pan = +status;
      if (status == '2') {
        updateData.panRejectReason = rejectReason;
        rejection.pan = rejectReason;
      }
      const isAadhaarVerified =
        status.aadhaar == '1' || statusData.aadhaar == '3';
      const isPanVerified = status.pan == '1' || statusData.pan == '3';
      dates.pan = new Date().getTime();
      if (isAadhaarVerified && isPanVerified)
        updateData.kycCompletionDate = new Date().toJSON();
      const approved = [1, 3, 4];
      if (
        approved.includes(statusData.pan) &&
        approved.includes(statusData.selfie) &&
        approved.includes(statusData.contact) &&
        approved.includes(statusData.reference)
      ) {
        statusData.loan = 0;
        statusData.eligibility = 0;
      }
      return {
        kycUpdate: updateData,
        masterUpdate: { status: statusData, dates, rejection },
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async sendKYCUpdateNotification(
    userData,
    status,
    rejectionReason,
    adminId,
  ) {
    try {
      userData.phone = await this.cryptService.decryptPhone(userData.phone);
      let title;
      let body;
      if (status == 3 || status == 1) {
        title = nKYCPAN;
        body = PanVerificationSuccess;
      } else if (status == 2) {
        title = nKYCNotPAN;
        body = rejectionReason;
      } else return {};

      // Push notification
      await this.sharedNotificationService.sendPushNotification(
        userData.fcmToken,
        title,
        body,
        {},
        true,
        adminId,
      );
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getKYCDocuments(query) {
    try {
      const userId = query.userId;
      if (!userId) return kParamsMissing;
      const attributes = [
        'aadhaarFront',
        'aadhaarBack',
        'pan',
        'panCardNumber',
        'aadhaarVerifiedAdmin',
        'panUploadedAdmin',
        'panVerifiedAdmin',
      ];
      let data = await this.kycRepo.getRowWhereData(attributes, {
        where: { userId },
        order: [['id', 'DESC']],
      });
      if (!data) return {};
      if (data == k500Error) return kInternalError;
      data.aadhaarUploadBy = 'System';
      const panUploadData = await this.commonSharedService.getAdminData(
        data?.panUploadedAdmin,
      );
      data.panUploadBy = panUploadData?.fullName ?? null;
      const panApproveData = await this.commonSharedService.getAdminData(
        data?.panVerifiedAdmin,
      );
      data.panApprovedBy = panApproveData?.fullName ?? null;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async funMigratePincode() {
    try {
      const data = await this.kycRepo.getTableWhereData(
        ['id', 'aadhaarAddress', 'aadhaarResponse'],
        {
          where: { aadhaarStatus: ['1', '3'], pincode: { [Op.eq]: null } },
        },
      );
      if (data == k500Error) return kInternalError;
      if (data.length == 0) return [];
      const finalData = {};
      for (let i = 0; i < data.length; i++) {
        try {
          const kyc = data[i];
          try {
            let pincode = this.typeService.getPincodeFromAddress(
              kyc.aadhaarResponse,
            );
            if (pincode)
              if (finalData[pincode]) finalData[pincode].push(kyc.id);
              else finalData[pincode] = [kyc.id];
          } catch (error) {}
        } catch (error) {}
      }
      for (let key in finalData) {
        try {
          let kycIDs = finalData[key];
          await this.kycRepo.updateRowData({ pincode: key }, kycIDs);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async idToPanNumber(reqData) {
    // Params validation
    const kycIds = reqData.kycIds;
    if (!kycIds) return kParamMissing('kycIds');

    const attributes = ['id', 'panCardNumber'];
    const options = { where: { id: kycIds } };
    const kycList = await this.kycRepo.getTableWhereData(attributes, options);
    if (kycList == k500Error) return kInternalError;

    const rawExcelData = {
      sheets: ['Pan numbers'],
      data: [kycList],
      sheetName: 'panNumbers.xlsx',
    };
    const fileUrl = await this.fileService.objectToExcelURL(rawExcelData);
    if (fileUrl?.message) return fileUrl;

    return { fileUrl };
  }
}
