// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import { MSG91, SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { PAGE_LIMIT, legalString } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k409ErrorMessage,
  kInvalidParamValue,
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
  kWrongDetails,
} from 'src/constants/responses';
import {
  ContactVerifiedSuccess,
  kNoDataFound,
  kNotEligible,
  SContactNotVerify,
  SContactVerification,
  SelfieverificationSuccess,
  SSelfieNotVerify,
  SSelfieVerification,
  kCoolOffPeriodOverTitle,
  kCoolOffPeriodOverContent,
} from 'src/constants/strings';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { ContactLogRepository } from 'src/repositories/contact.log.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { MigrationSharedService } from 'src/shared/migration.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { DateService } from 'src/utils/date.service';
import { ReasonsEntity } from 'src/entities/Reasons.entity';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { SequelOptions } from 'src/interfaces/include.options';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { FramesEntity } from 'src/entities/frames_entity';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { EmiEntity } from 'src/entities/emi.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { EmiSharedService } from 'src/shared/emi.service';
import { StringService } from 'src/utils/string.service';
import { PredictionService } from '../eligibility/prediction.service';
import { ESignRepository } from 'src/repositories/esign.repository';
import { RedisService } from 'src/redis/redis.service';
import { NUMBERS } from 'src/constants/numbers';
@Injectable()
export class UserService {
  constructor(
    private readonly fileService: FileService,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly promoCodeService: PromoCodeService,
    private readonly userSelfieRepo: UserSelfieRepository,
    private readonly masterRepo: MasterRepository,
    @Inject(forwardRef(() => MigrationSharedService))
    private readonly sharedMigration: MigrationSharedService,
    @Inject(forwardRef(() => UserServiceV4))
    private readonly userService: UserServiceV4,
    private readonly adminRepo: AdminRepository,
    private readonly allSmsService: AllsmsService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly loanRepo: LoanRepository,
    private readonly userBlockHistoryRepo: BlockUserHistoryRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly eligibilitySharedService: EligibilitySharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly templateRepo: TemplateRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly kycRepo: KYCRepository,
    private readonly installAppRepo: InstallAppRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly contactLogRepo: ContactLogRepository,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly deviceSIMRepo: DeviceSIMRepository,
    private readonly userPermissionRepo: UserPermissionRepository,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly predictRepo: PredictionRepository,
    private readonly dateService: DateService,
    private readonly userActivityRepo: UserActivityRepository,
    private readonly eSignRepo: ESignRepository,
    // Database
    private readonly repo: RepositoryManager,
    @Inject(forwardRef(() => EmiSharedService))
    private readonly emiSharedService: EmiSharedService,
    private readonly StringService: StringService,
    private readonly predictionService: PredictionService,
    private readonly redisService: RedisService,
  ) {}

  async getAllSelfieRetakeData(query) {
    try {
      const options = await this.selfieVerificationOptions(query);
      if (options?.message) return options;
      const selfieData = await this.findSelfieData(options);
      if (selfieData?.message) return selfieData;
      const finalData: any = await this.prepareSelfieRowData(selfieData?.rows);
      if (finalData?.message) return finalData;
      return { count: selfieData.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region  pre pare option for selfie verification
  async selfieVerificationOptions(query) {
    try {
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const searchText = query?.searchText;
      const startDate = query?.startDate ?? null;
      const endDate = query?.endDate ?? null;
      const download = query?.download ?? 'false';
      const toDay = this.typeService.getGlobalDate(new Date());
      const where: any = { status: '0' };
      if (status != '0' && startDate && endDate) {
        const range = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      }
      const selfieInclude: any = {
        model: UserSelfieEntity,
        where,
        attributes: [
          'id',
          'image',
          'status',
          'verifiedDate',
          'tempImage',
          'adminId',
          'response',
          'rejectReason',
          'updatedAt',
        ],
      };
      const userOptions: any = {
        where: { isBlacklist: { [Op.ne]: '1' } },
        include: [selfieInclude],
      };

      if (status && status != '4') {
        if (status == '1' || status == '3')
          selfieInclude.where.status = { [Op.or]: ['1', '3'] };
        else selfieInclude.where.status = status;
        if (status == '0') {
          userOptions.where['NextDateForApply'] = {
            [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
          };
        }
      } else selfieInclude.where['status'] = { [Op.or]: ['1', '3', '2', '0'] };

      if (searchText) {
        let encryptedData = '';
        if (!isNaN(searchText)) {
          encryptedData = await this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];
        }
        userOptions.where = {
          ...userOptions.where,
          ...{
            [Op.or]: [
              { fullName: { [Op.iRegexp]: searchText } },
              {
                phone: {
                  [Op.like]: encryptedData ? '%' + encryptedData + '%' : null,
                },
              },
              { email: { [Op.iRegexp]: searchText } },
            ],
          },
        };
      }
      if (status != '0' && download != 'true') {
        userOptions.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        userOptions.limit = PAGE_LIMIT;
      }
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async findSelfieData(options) {
    try {
      const userAttr = [
        'id',
        'phone',
        'fullName',
        'createdAt',
        'completedLoans',
      ];
      const result = await this.userRepo.getTableWhereDataWithCounts(
        userAttr,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      result.rows.forEach((element) => {
        element.phone = this.cryptService.decryptPhone(element.phone);
      });
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async prepareSelfieRowData(list: any[]) {
    try {
      const finalData = [];
      for (let index = 0; index < list.length; index++) {
        const ele = list[index];
        try {
          const tempData: any = {};
          const selfieData = ele?.selfieData;
          const date = selfieData?.verifiedDate ?? selfieData?.updatedAt;
          const lastUpdate = this.typeService.getDateFormatted(date);
          tempData['Mobile number'] = ele?.phone;
          tempData['Name'] = ele?.fullName;
          tempData['Completed loans'] = ele?.completedLoans;
          tempData['Profile image'] = selfieData?.image ?? '-';
          tempData['Profile_tempImg'] = selfieData?.tempImage ?? '-';
          tempData['Last updated'] = lastUpdate;
          tempData['Last action by'] =
            (await this.commonSharedService.getAdminData(selfieData?.adminId))
              ?.fullName ?? 'SYSTEM';
          tempData['Status'] = selfieData?.status ?? '-';
          tempData['Reject reason'] = selfieData?.rejectReason ?? '-';
          tempData['userId'] = ele?.id ?? '-';
          tempData['selfieId'] = selfieData?.id ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funChanegSelfieStatus(body) {
    try {
      if (!body.status || !body.userId) return kParamsMissing;
      if (body.status == '2' && !body.rejectReason)
        return kParamMissing('rejectReason');
      if (!body.adminId) return kParamMissing('adminId');
      const userId = body.userId;
      const adminId = body.adminId;
      const rejectReason = body.rejectReason;
      const status = body.status;
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'loanId', 'status', 'dates', 'rejection'],
      };
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = [
        'id',
        'image',
        'status',
        'adminId',
        'tempImage',
      ];
      const userAttr = ['id', 'phone', 'fullName', 'fcmToken'];
      const userOptions = {
        where: { id: userId },
        include: [selfieInclude, masterInclude],
      };
      const userData = await this.userRepo.getRowWhereData(
        userAttr,
        userOptions,
      );
      if (userData === k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage('User data not found!');
      const approved = [1, 3, 4];
      const selfieData = userData?.selfieData ?? {};
      const masterData = userData?.masterData;
      const statusData = masterData?.status ?? {};
      const rejection = masterData?.rejection ?? {};
      if ([1, 3].includes(statusData?.eSign))
        return k422ErrorMessage('Selfie status not updated!');
      const aadhaarStatus = statusData?.aadhaar ?? -1;
      const dates = masterData?.dates ?? {};
      const isAadhaarVerified = aadhaarStatus == '1' || aadhaarStatus == '3';
      const isApproved = status == '1' || status == '3';
      const verifiedDate = new Date();
      const rawData: any = {
        status,
        adminId,
        rejectReason: status == '2' ? rejectReason : null,
        verifiedDate: verifiedDate.toJSON(),
      };
      statusData.selfie = +status;
      dates.selfie = verifiedDate.getTime();
      rejection.selfie = rejectReason;
      const id = selfieData?.id;
      const selfieURL = selfieData?.tempImage;
      if (isApproved && selfieURL) {
        rawData.image = selfieURL;
        const updatedData = { selfieId: id, image: selfieURL };
        const userUpdate = await this.userRepo.updateRowData(
          updatedData,
          userId,
        );
        if (userUpdate === k500Error) return kInternalError;
      }

      if (isApproved && !isAadhaarVerified) {
        statusData.selfie = 5;
        rawData.status = '5';
      }

      const updateDataRes = await this.userSelfieRepo.updateRowData(
        rawData,
        id,
      );
      if (updateDataRes === k500Error) return kInternalError;
      if (
        approved.includes(statusData?.pan) &&
        approved.includes(statusData?.selfie) &&
        approved.includes(statusData?.contact) &&
        approved.includes(statusData?.reference) &&
        ![1, 3, 2].includes(statusData?.loan)
      ) {
        statusData.loan = 0;
        statusData.eligibility = 0;
      }
      await this.masterRepo.updateRowData(
        { status: statusData, dates, rejection },
        masterData?.id,
      );
      let rejectReasonData: any = {};
      if (rejectReason && status == '2') {
        rejectReasonData =
          await this.commonSharedService.getRejectReasonTemplate(rejectReason);
        if (rejectReasonData?.message) return rejectReasonData;
      }

      const key = `${userId}_USER_BASIC_DETAILS`;
      await this.redisService.del(key);
      
      /// check final approval when bank is approved
      if (
        (statusData?.bank == 1 || statusData?.bank == 3) &&
        masterData?.loanId &&
        statusData?.selfie == 3 &&
        statusData?.loan != 1 &&
        statusData?.loan != 3
      ) {
        const finalData = { loanId: masterData?.loanId, userId };
        const finalApproval = await this.eligibilitySharedService.finalApproval(
          finalData,
        );
        if (finalApproval.message) return finalApproval;
      }
      await this.predictionService.assignToAdmin(masterData?.loanId);
      const routData = await this.userService.routeDetails({ id: userId });
      await this.sendSelfieVerificationNotify(
        userData,
        status,
        rejectReasonData,
        adminId,
        routData,
      );
      return 'Selfie status updated!';
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendSelfieVerificationNotify(
    userData,
    status,
    rejectionReason,
    adminId,
    routData,
  ) {
    try {
      userData.phone = await this.cryptService.decryptPhone(userData.phone);
      let title;
      let body;
      if (status == 3 || status == 1) {
        title = SSelfieVerification;
        body = SelfieverificationSuccess;
      } else if (status == 2) {
        title = SSelfieNotVerify;
        body = rejectionReason?.content;
      } else return {};

      // Push notification
      await this.sharedNotificationService.sendPushNotification(
        userData.fcmToken,
        title,
        body,
        routData,
        true,
        adminId,
      );
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funChangesContactStatus(body) {
    try {
      const userId = body?.userId;
      const adminId = body?.adminId;
      const status = body?.status;
      const reject = body?.reject;
      if (!status || !userId || !adminId) return kParamsMissing;
      if (status == 2 && !reject) return kParamMissing('reject');
      let rejectReason;
      if (status == 2) {
        const tempOps = { where: { type: 'CONTACT', isActive: true } };
        const reasonTemp = await this.templateRepo.getRowWhereData(
          ['content'],
          tempOps,
        );
        if (!reasonTemp || reasonTemp === k500Error)
          rejectReason = kNotEligible;
        else rejectReason = reasonTemp?.content;
      }
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus'],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: [
          'id',
          'loanId',
          'status',
          'dates',
          'coolOffData',
          'rejection',
        ],
        include: [loanInclude],
      };
      const userData = await this.userRepo.getRowWhereData(
        ['id', 'quantity_status', 'fcmToken', 'fullName', 'phone', 'stage'],
        { where: { id: userId }, include: [masterInclude] },
      );
      if (userData === k500Error)
        return k422ErrorMessage('User data not found!');
      const masterData = userData?.masterData;
      const statusData = masterData?.status ?? {};
      const coolOffData = masterData?.coolOffData ?? {};
      const dates = masterData?.dates ?? {};
      const rejection = masterData?.rejection ?? {};
      const adminData = await this.adminRepo.getRoweData(['id', 'fullName'], {
        where: { id: adminId },
      });
      if (!adminData || adminData === k500Error)
        return k422ErrorMessage('Admin data not found!');
      const adminName = adminData.fullName;
      const contactUpdateData = {
        quantity_status: status,
        contactApproveBy: adminName,
        contactApprovedId: adminId,
        contactRejectReason: status == 2 ? rejectReason : '',
      };

      if (status == 2 && reject == 'LOAN') {
        const loanRejectData: any = await this.rejectLoanWithContacts(
          userData,
          rejectReason,
          adminId,
        );
        if (loanRejectData.message) return kInternalError;
        statusData.loan = loanRejectData.statusData.loan;
        statusData.eligibility = loanRejectData.statusData.eligibility;
        rejection.loan = loanRejectData.rejection.loan;
        dates.loan = loanRejectData.dates.loan;
        dates.eligibility = loanRejectData.dates.eligibility;
        dates.eligibility = loanRejectData.dates.eligibility;
        coolOffData.count = loanRejectData.coolOffData.count;
        coolOffData.coolOffStartedOn =
          loanRejectData.coolOffData.coolOffStartedOn;
        coolOffData.coolOffEndsOn = loanRejectData.coolOffData.coolOffEndsOn;
      }
      const updateUser = await this.userRepo.updateRowData(
        contactUpdateData,
        userData.id,
      );
      if (updateUser === k500Error)
        return k422ErrorMessage('Contact not updated!');
      statusData.contact = +status;
      statusData.reference = +status;
      dates.contact = new Date().getTime();
      rejection.contact = rejectReason ?? '';
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
      const masterUpdate: any = {
        status: statusData,
        dates,
        rejection,
        coolOffData,
      };

      await this.masterRepo.updateRowData(masterUpdate, masterData.id);
      await this.sendContactVerificationNotify(
        userData,
        status,
        rejectReason,
        adminId,
      );
      // check final approval when loan status is 0
      if (statusData?.loan == 0 && masterData.loanId) {
        const finalData = { loanId: masterData.loanId, userId };
        await this.eligibilitySharedService.finalApproval(finalData);
      }

      await this.userService.routeDetails({ id: userId });
      return 'Contact status updated!';
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async rejectLoanWithContacts(userData, reason, adminId) {
    try {
      const statusData: any = {};
      const dates: any = {};
      const masterData = userData.masterData;
      const coolOffData = masterData?.coolOffData ?? {};
      const rejection: any = {};
      const userId = userData?.id;
      const loanData = masterData.loanData;
      const toDay = this.typeService.getGlobalDate(new Date());
      statusData.loan = 2;
      statusData.eligibility = 2;
      rejection.loan = reason;
      dates.loan = new Date().getTime();
      dates.eligibility = new Date().getTime();
      await this.loanRepo.updateRowData(
        {
          loanStatus: 'Rejected',
          loanRejectReason: reason,
          loanRejectDate: toDay.toJSON(),
          verifiedDate: toDay.toJSON(),
          softApprovalFlag: '0',
          manualVerification: '2',
          manualVerificationAcceptId: adminId,
          lastStage: (userData?.stage ?? '').toString(),
        },
        loanData?.id,
      );

      // 1 day coolOff time
      const nextApplyDate = this.typeService.getGlobalDate(new Date());
      nextApplyDate.setDate(nextApplyDate.getDate() + 3);
      coolOffData.count = (coolOffData?.count ?? 0) + 1;
      coolOffData.coolOffStartedOn = toDay.toJSON();
      coolOffData.coolOffEndsOn = nextApplyDate.toJSON();
      coolOffData.reason = reason;
      await this.userRepo.updateRowData(
        { NextDateForApply: nextApplyDate },
        userId,
      );
      await this.userBlockHistoryRepo.createRowData({
        userId,
        coolOfDate: nextApplyDate,
        reason,
        blockedBy: adminId,
      });
      await this.userService.routeDetails({ id: userId });
      return { statusData, coolOffData, rejection, dates };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendContactVerificationNotify(userData, status, reason, adminId) {
    try {
      userData.phone = await this.cryptService.decryptPhone(userData.phone);
      let title;
      let body;
      let smsId;
      if (status == 3 || status == 1) {
        title = SContactVerification;
        body = ContactVerifiedSuccess;
      } else if (status == 2) {
        title = SContactNotVerify;
        body = reason;
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

      // send sms to users Number
      const smsOptions: any = { fullName: userData.fullName };
      if (status == '2') smsOptions.reason = reason;
      await this.allSmsService.sendSMS(userData.phone, MSG91, {
        smsId,
        adminId,
        ...smsOptions,
      });
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funSetNextEligibiltyDate(data) {
    try {
      const userId = data?.userId;
      const adminId = data?.adminId;
      if (!userId || !adminId) return kParamsMissing;
      let nextApplyDate = data?.eligibilityDate;
      nextApplyDate = nextApplyDate
        ? this.typeService.getGlobalDate(nextApplyDate)
        : null;
      const toDay = this.typeService.getGlobalDate(new Date());
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'coolOffData'],
      };
      const options = { where: { id: userId }, include: [masterInclude] };
      const userData = await this.userRepo.getRowWhereData(
        ['id', 'fullName', 'masterId', 'fcmToken'],
        options,
      );
      if (!userData || userData == k500Error)
        return k422ErrorMessage('User not found!');
      const masterData = userData?.masterData ?? {};
      const coolOffData = masterData?.coolOffData ?? {};
      const masterId = masterData.id;
      const fcmToken = userData?.fcmToken;
      if (nextApplyDate) {
        coolOffData.coolOffStartedOn = toDay.toJSON();
        coolOffData.coolOffEndsOn = nextApplyDate.toJSON();
        coolOffData.count = (coolOffData?.count ?? 0) + 1;
      } else {
        coolOffData.coolOffStartedOn = '';
        coolOffData.coolOffEndsOn = '';
      }
      const update = await this.masterRepo.updateRowData(
        { coolOffData },
        masterId,
      );
      if (!nextApplyDate) {
        nextApplyDate = toDay;
        if (fcmToken) {
          await this.sharedNotificationService.sendPushNotification(
            fcmToken,
            kCoolOffPeriodOverTitle,
            kCoolOffPeriodOverContent,
            {},
            true,
            adminId,
          );
        }
      }
      await this.userBlockHistoryRepo.createRowData({
        coolOfDate: nextApplyDate.toJSON(),
        userId,
        blockedBy: adminId,
      });
      await this.userService.routeDetails({ id: userId });
      return update;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateBulkEligibility(reqData) {
    const numbers = reqData.numbers ?? [];
    if (numbers.length > 0) {
      for (let index = 0; index < numbers.length; index++) {
        try {
          const number = this.cryptService
            .encryptPhone(numbers[index])
            .split('===')[1];

          const attributes = ['id'];
          const options = { where: { phone: { [Op.like]: '%' + number } } };
          const userData = await this.repo.getRowWhereData(
            registeredUsers,
            attributes,
            options,
          );
          console.log(userData);
          if (!userData || userData === k500Error) continue;

          const body = {
            userId: userData.id,
            eligibilityDate: null,
            adminId: reqData.adminId ?? SYSTEM_ADMIN_ID,
          };
          await this.funSetNextEligibiltyDate(body);
          console.log(userData, index, numbers.length);
        } catch (error) {}
      }
    }

    const userIds = reqData.userIds ?? [];
    if (userIds.length > 0) {
      for (let index = 0; index < userIds.length; index++) {
        try {
          const body = {
            userId: userIds[index],
            eligibilityDate: null,
            adminId: reqData.adminId ?? SYSTEM_ADMIN_ID,
          };
          await this.funSetNextEligibiltyDate(body);
          console.log(index, userIds.length);
        } catch (error) {}
      }
    }

    return {};
  }

  // Get customer details page
  async getUserProfile(reqData) {
    // Params validation
    const userId = reqData.userId?.trim();
    if (!userId) return kParamMissing('userId');

    const key = `${userId}_USER_PROFILE`;
    const userProfileData = await this.redisService.getKeyDetails(key);
    if (userProfileData) return JSON.parse(userProfileData);

    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['miscData', 'loanId'];
    const include = [masterInclude];
    const attributes = ['isBlacklist'];
    const options = { include, where: { id: userId } };
    const userDetails = await this.userRepo.getRowWhereData(
      attributes,
      options,
    );
    if (userDetails == k500Error) return kInternalError;
    if (!userDetails) return k422ErrorMessage(kNoDataFound);
    const loanId = userDetails.masterData?.loanId;

    // get prediction data
    const predictData = await this.predictRepo.getRowWhereData(['reason'], {
      where: { loanId },
      order: [['id', 'DESC']],
    });
    if (predictData == k500Error) return kInternalError;
    const reasonData = predictData
      ? JSON.parse(predictData?.reason) ?? '-'
      : '-';
    const matchLatLongCount = reasonData?.matchLatLongCount ?? '0';
    const exactAadhaarAddressCount = reasonData?.exactMatchAddressCount ?? 0;

    // add and update last location
    const userData = {
      id: userId,
      otherDetails: {},
      docCounts: {},
      matchLatLongCount,
      exactAadhaarAddressCount,
    };
    userData.docCounts = await this.documentSCounts(userId);
    await this.getOtherDetails(userDetails, userData);

    await this.redisService.set(
      key,
      JSON.stringify(userData),
      NUMBERS.SEVEN_DAYS_IN_SECONDS,
    );
    return userData;
  }

  async documentSCounts(userId) {
    const data = { otherDoc: 0, kycDoc: 0, totalDoc: 0 };
    try {
      const obj = { [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }] };
      const mediaOptions = {
        where: {
          userId,
          isDeleted: obj,
        },
      };
      let [otherDoc, homeProof] = await Promise.all([
        this.mediaRepo.getCountsWhere(mediaOptions),
        this.mediaRepo.getCountsWhere({
          where: { ...mediaOptions.where, docType: 'addressProof' },
        }),
      ]);
      data.otherDoc = otherDoc === k500Error ? 0 : otherDoc;
      if (homeProof == 0) {
        let userData = await this.userRepo.getCountsWhere({
          where: { id: userId, homeProofImage: { [Op.ne]: null } },
        });
        if (userData === k500Error) userData = 0;
        otherDoc = +otherDoc + +userData;
      }

      let rawQuery = `SELECT COUNT("id") FROM "loanTransactions"
      WHERE "userId" = '${userId}' AND "nocURL" IS NOT NULL`;

      let [nocDoc, loanDoc] = await Promise.all([
        this.repo.injectRawQuery(loanTransaction, rawQuery, {
          source: 'REPLICA',
        }),
        this.eSignRepo.getCountsWhere({
          where: { userId },
        }),
      ]);
      if (nocDoc === k500Error) nocDoc = 0;
      else nocDoc = +(nocDoc[0].count ?? '0');

      if (loanDoc === k500Error) loanDoc = 0;
      data.otherDoc = otherDoc + nocDoc + loanDoc + homeProof;
      const attributes = ['aadhaarFront', 'aadhaarBack', 'pan'];
      let kycData = await this.kycRepo.getRowWhereData(attributes, {
        where: { userId },
        order: [['id', 'DESC']],
      });
      if (kycData === k500Error) kycData = {};
      let kycDoc = 0;
      if (kycData?.aadhaarFront) kycDoc++;
      if (kycData?.aadhaarBack) kycDoc++;
      if (kycData?.pan) kycDoc++;
      data.kycDoc = kycDoc;
      data.totalDoc = data.otherDoc + data.kycDoc;
      return data;
    } catch (error) {
      return data;
    }
  }

  // Other details
  async getOtherDetails(userDetails, userData) {
    const masterData = userDetails.masterData ?? {};
    const miscData = masterData.miscData ?? {};
    const legalData = userDetails.legalData;
    let legalStepDate = userDetails?.legalData?.dates?.disposalDate ?? null;
    legalStepDate = this.typeService.getGlobalDate(legalStepDate);
    legalStepDate = this.typeService.dateToJsonStr(legalStepDate, 'DD/MM/YYYY');
    // Last location
    let lastLocation = miscData.lastLocation ?? '-';
    let lastLocationDateTime = miscData.lastLocationDateTime ?? '-';

    if (lastLocation != '-') {
      const migratedData: any = await this.sharedMigration.migrateLastLocation(
        userData.id,
      );
      if (migratedData.message) return migratedData;
      lastLocation = migratedData.lastLocation;
      lastLocationDateTime = migratedData.lastLocationDateTime;
    }

    const otherDetails: any = {
      lastLocation: '-',
      lastLocationDateTime,
    };
    otherDetails.lastLocation = lastLocation;
    otherDetails.lastLocationDateTime =
      lastLocationDateTime != '-' ? new Date(lastLocationDateTime) : '-';
    // last summons date
    if (legalData?.createdAt) {
      let createdAt = legalData.createdAt;
      let legalCreatedAt: any = this.typeService.getGlobalDate(createdAt);
      let type = legalData.type;
      legalCreatedAt = this.typeService.dateToJsonStr(
        legalCreatedAt,
        'DD/MM/YYYY',
      );
      let legalStep = legalString[type];
      if (legalData.type === 9) {
        legalCreatedAt = legalStepDate;
        otherDetails.legalData = { legalStep, legalCreatedAt };
      } else {
        otherDetails.legalData = { legalStep, legalCreatedAt };
      }
      otherDetails;
    }
    userData.otherDetails = otherDetails;
  }

  // user basic details
  async funGetUserBasicDetails(query) {
    // Validation -> Parameters
    if (!query.userId) return kParamMissing('userId');

    const userId = query.userId;
    const attributes = [
      'id',
      'fullName',
      'phone',
      'email',
      'communicationLanguage',
      'gender',
      'interestRate',
      'isRedProfile',
      'NextDateForApply',
      'createdAt',
      'lastOnlineTime',
      'defaulterCount',
      'defaulterContactCount',
      'isBlacklist',
      'loanStatus',
      'isDeleted',
      'totalContact',
      'phoneStatusVerified',
      'eligibleForPromoCode',
      'otherPhone',
      'otherEmail',
      'addedBy',
      'isCibilConsent',
      'typeOfDevice',
      'userSelectedGender',
      'lastCrm',
      'recentDeviceId',
      'installAppCount',
      'mostFrequentHour',
      'mostFrequentDay',
      'gmvAmount',
      'uniqueId',
      'politicallyExposed',
      'categoryScore',
      'pinCrm',
    ];
    const selfieInclude: any = { model: UserSelfieEntity };
    selfieInclude.attributes = ['image', 'tempImage', 'status', 'response'];
    const kycInclude: any = { model: KYCEntity };
    kycInclude.attributes = [
      'maskedAadhaar',
      'aadhaarStatus',
      'aadhaarDOB',
      'aadhaarAddress',
      'panCardNumber',
      'panStatus',
      'aadhaarLatLong',
      'profileImage',
      'updatedAt',
      'kyc_mode',
    ];

    const emiInclude: any = { model: EmiEntity, required: false };
    emiInclude.attributes = [
      'payment_status',
      'payment_due_status',
      'principalCovered',
      'legalCharge',
      'paid_principal',
    ];
    emiInclude.where = { payment_due_status: '1', payment_status: '0' };
    const include = [kycInclude, selfieInclude, emiInclude];
    let options: any = { include, where: { id: userId } };

    // temporary redis code commented due to PROD issue
    // const key = `${userId}_USER_BASIC_DETAILS`;
    // let userData = await this.redisService.getKeyDetails(key);
    // if (!userData) {
    // Hit -> Query
    const userData = await this.userRepo.getRowWhereData(attributes, options);
    // Validation -> Query data
    if (userData === k500Error) throw new Error();
    if (!userData) return k422ErrorMessage(kNoDataFound);
    // } else userData = JSON.parse(userData);

    //master include for get loanId and inside the include of loantrasaction
    const masterOptions = {
      where: { userId },
      include: {
        model: loanTransaction,
        attributes: ['id', 'followerId', 'loanStatus'],
      },
      order: [['id', 'desc']],
    };

    const masterData = await this.masterRepo.getRowWhereData(
      ['id', 'loanId', 'miscData', 'coolOffData', 'status'],
      masterOptions,
    );
    if (masterData == k500Error) return kInternalError;
    if (!masterData) return k422ErrorMessage(kNoDataFound);

    // Checks -> Email status
    if (masterData) {
      const emailStatus = (masterData.status ?? {}).email;
      if (emailStatus == 1 || emailStatus == 3) userData.isEmailVerified = true;
      else userData.isEmailVerified = false;
    }
    const approvedStatus = ['1', '3'];
    // if (
    //   userData?.isEmailVerified &&
    //   approvedStatus.includes(userData?.kycData?.aadhaarStatus) &&
    //   approvedStatus.includes(userData?.kycData?.panStatus)
    // ) {
    //   await this.redisService.set(
    //     key,
    //     JSON.stringify(userData),
    //     NUMBERS.SEVEN_DAYS_IN_SECONDS,
    //   );
    // }
    //get promo code data (waveofamount,percentage,promocode)
    let reqData: any = { userId };
    let promoCodeData;
    if (
      masterData?.loanData?.loanStatus === 'Active' &&
      userData?.eligibleForPromoCode
    ) {
      reqData = { userId, loanId: masterData?.loanId };
      promoCodeData = await this.promoCodeService.getUserWaiveOffEligibility(
        reqData,
      );
    }
    const discountPercentage = promoCodeData?.emiDetails?.discount ?? '-';
    let waiveOffamount = await this.typeService.amountNumberWithCommas(
      parseInt(promoCodeData?.emiDetails?.discountAmount ?? 0),
    );
    const promoCode = promoCodeData?.emiDetails?.promoCode ?? '-';

    //user's data
    let lastActiveAgoMinutes: any = Infinity;
    if (userData?.lastOnlineTime) {
      const lastOnlineTime = this.typeService.dateTimeToDate(
        userData?.lastOnlineTime,
      );
      lastActiveAgoMinutes = this.typeService.dateDifference(
        lastOnlineTime,
        new Date(),
        'Minutes',
      );
      userData.lastOnlineTime =
        this.typeService.convertMinutesToHours(lastOnlineTime);
      userData.isOnline = lastActiveAgoMinutes < 5;
    }

    userData.phone = this.cryptService.decryptPhone(userData.phone);
    userData.lastCrm = {
      remark: userData?.lastCrm?.remark ?? '-',
      titleName: userData?.lastCrm?.titleName ?? '-',
      statusName: userData?.lastCrm?.statusName ?? '-',
      adminName: userData?.lastCrm?.adminName ?? '-',
      createdAt: userData?.lastCrm?.createdAt ?? '-',
    };
    userData.followerName =
      (
        await this.commonSharedService.getAdminData(
          masterData?.loanData?.followerId,
        )
      ).fullName ?? '-';

    userData.lastLocation = masterData?.miscData?.lastLocation ?? '-';
    delete userData?.masterData;

    userData.promoCodeData = {
      discountPercentage,
      waiveOffamount,
      promoCode,
    };
    // selfie data
    if (userData.selfieData) {
      let similarity = 0;
      let confidence = 0;
      let response = userData?.selfieData?.response;
      if (response) {
        response = JSON.parse(response);
        similarity = response?.FaceMatches[0]?.Similarity ?? 0;
        confidence = response?.SourceImageFace?.Confidence ?? 0;
        if (response?.UnmatchedFaces?.length > 0 && similarity <= 50)
          userData.selfieData.isImageMessage = 'Face not matched';
        else if (similarity <= 50)
          userData.selfieData.isImageMessage = 'Face not matched';
      } else userData.selfieData.isImageMessage = 'Face not Detected';
      userData.selfieData.Similarity = Math.round(similarity);
      userData.selfieData.Confidence = Math.round(confidence);
      userData.profileUpdatedBy =
        (
          await this.commonSharedService.getAdminData(
            userData?.selfieData?.adminId,
          )
        ).fullName ?? '-';
    }
    // User's Communication Language
    const language = { 1: 'ENGLISH', 2: 'HINDI' };
    userData.communicationLanguage =
      language[userData?.communicationLanguage] ?? '-';
    const politicallyStatus = {
      1: 'Yes',
      0: 'No',
    };
    userData.politicallyExposed =
      politicallyStatus[userData?.politicallyExposed] ?? 'No';

    // User cool off data
    let coolOffEndDate = masterData?.coolOffData?.coolOffEndsOn ?? '';
    let coolOffStartDate = masterData?.coolOffData?.coolOffStartedOn ?? '';
    coolOffEndDate = this.typeService.getGlobalDate(coolOffEndDate) ?? '';
    coolOffStartDate = this.typeService.getGlobalDate(coolOffEndDate) ?? '';
    const totalDays =
      this.typeService.dateDifference(coolOffEndDate, coolOffStartDate) ?? '-';
    userData.coolOffDays = totalDays;

    //kyc data
    if (userData.kycData) {
      if (userData?.kycData?.aadhaarAddress) {
        userData.kycData.aadhaarAddress =
          this.typeService.getAadhaarAddress(userData?.kycData)?.address ?? '-';
      }
      userData.kycData.aadhaarImage = userData?.kycData?.profileImage ?? '-';
      delete userData.kycData.profileImage;
      if (userData?.kycData?.aadhaarDOB) {
        userData.kycData.aadhaarDOB =
          await this.typeService.getDateAsPerAadhaarDOB(
            userData?.kycData?.aadhaarDOB,
          );
        const dateFormat = this.typeService.getDateFormated(
          userData?.kycData?.aadhaarDOB,
        );
        const modifiedDateFormat = `${dateFormat.slice(0, 6)}${dateFormat.slice(
          -2,
        )}`;
        const dateOfBirth = this.typeService.getAgeFromAadhar(
          userData?.kycData?.aadhaarDOB ?? '-',
        );
        const kycMode = userData?.kycData?.kyc_mode
          ? userData.kycData.kyc_mode == 'DIGILOCKER_IN_HOUSE'
            ? 'DIGILOCKER'
            : userData.kycData.kyc_mode
          : '-';
        userData.kycData.kyc_mode = kycMode;
        userData.kycData.dateOfBirth = `${modifiedDateFormat} (${dateOfBirth} Years)`;
        delete userData.kycData.aadhaarDOB;
      } else userData.kycData.dateOfBirth = '-';
    }

    // Frames Session count
    const ops = {
      where: { userId, sessionId: { [Op.ne]: null } },
      group: 'sessionId',
    };
    const framesSession = await this.repo.getCountsWhere(FramesEntity, ops);
    if (framesSession === k500Error) throw new Error();
    userData.framesSessionCount = framesSession.length;

    // if old defulter then check red profile tag
    if ((userData.isRedProfile ?? 0) != 0) {
      switch (userData.isRedProfile) {
        case 1:
          userData.redProfileStage = 'Invited';
          break;
        case 2:
          userData.redProfileStage = 'New loan in process';
          break;
        case 3:
          userData.redProfileStage = 'New mandate registered';
          break;
        default:
          break;
      }
      userData.isRedProfile = true;
    } else userData.isRedProfile = false;

    // Type of device
    if (userData.typeOfDevice == '0') userData.typeOfDevice = 'ANDROID';
    else if (userData.typeOfDevice == '1') userData.typeOfDevice = 'IOS';
    else if (userData.typeOfDevice == '2') userData.typeOfDevice = 'WEB';

    // Risk Category
    if (userData.categoryScore !== null) {
      if (userData.categoryScore < 0) userData.categoryScore = 'High Risk';
      else if (userData.categoryScore >= 0 && userData.categoryScore <= 25)
        userData.categoryScore = 'Moderate Risk';
      else if (userData.categoryScore > 25) userData.categoryScore = 'Low Risk';
    }
    let principalEMI = 0;
    let legalFees = 0;
    let paidPrincipal = 0;
    userData?.emiData?.map((ele) => {
      principalEMI += ele?.principalCovered ?? 0;
      legalFees += ele?.legalCharge ?? 0;
      paidPrincipal += ele?.paid_principal ?? 0;
    });
    const defaultedAmount = principalEMI - paidPrincipal;
    if (defaultedAmount) {
      userData.principalEMI = defaultedAmount;
    }
    if (legalFees) {
      userData.legalFees = legalFees;
    }
    // Pin crm description
    if (userData.pinCrm) {
      userData.pinDescription = userData.pinCrm?.remark;
      userData.pinAdminName = userData.pinCrm?.adminName;
      userData.pinCreatedAt = userData.pinCrm?.createdAt;
    }
    delete userData.pinCrm;
    return userData;
  }

  async getAllAddressData(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamsMissing;
      const attributes = [
        'address',
        'lat',
        'long',
        'type',
        'probability',
        'subType',
        'status',
        'addressFlag',
        'updatedAt',
      ];
      const data = await this.addressRepo.getTableWhereData(attributes, {
        where: { userId },
      });
      if (data === k500Error) return kInternalError;
      // sorting and arrange by type
      const userAdd = [];
      const bankAdd = [];
      const typeAdd = [];
      const otherAdd = [];
      const cibilAdd = [];
      const addressFlag = [1, 2, 3];
      for (let index = 0; index < data.length; index++) {
        try {
          const ele = data[index];
          const type = ele?.type;
          const flag = ele?.addressFlag;
          ele.updatedAt = this.typeService.getDateFormatted(ele.updatedAt);
          if (type == '11') bankAdd.push(ele);
          else if (type == '12') typeAdd.push(ele);
          else if (type == '13') {
            if (addressFlag.includes(flag)) userAdd.push(ele);
            else cibilAdd.push(ele);
          } else otherAdd.push(ele);
        } catch (error) {}
      }
      const finalAdd = [
        ...userAdd,
        ...bankAdd,
        ...typeAdd,
        ...otherAdd,
        ...cibilAdd,
      ];
      return finalAdd;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // # start region get user block and cool off details
  async getUserBlockDetails(query) {
    try {
      // Params validation
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');

      const todayDate = this.typeService.getGlobalDate(new Date());
      let responseObject: any = {
        isBlacklist: '0',
        isCoolOff: '0',
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['coolOffData'],
      };

      const userAtr = ['isBlacklist'];
      const userOptions = {
        where: { id: userId },
        include: [masterInclude],
      };
      const userData = await this.userRepo.getRowWhereData(
        userAtr,
        userOptions,
      );
      if (userData === k500Error) return kInternalError;

      //get block details
      const reasonInclude = {
        model: ReasonsEntity,
        attributes: ['reason'],
      };
      const blockAtr = ['reason', 'isBlacklist', 'blockedBy', 'reasonId'];
      const blockOptions = {
        where: { userId },
        order: [['id', 'desc']],
        include: [reasonInclude],
      };
      const blockData = await this.userBlockHistoryRepo.getRowWhereData(
        blockAtr,
        blockOptions,
      );
      if (blockData === k500Error) return kInternalError;

      // // Get admin details
      const adminData = await this.commonSharedService.getAdminData(
        blockData?.blockedBy,
      );

      if (adminData) responseObject.adminName = adminData?.fullName ?? null;
      let coolOffEndsOn = userData?.masterData?.coolOffData?.coolOffEndsOn;
      coolOffEndsOn = coolOffEndsOn
        ? this.typeService.getGlobalDate(coolOffEndsOn)
        : coolOffEndsOn;

      // if user is blackList
      if (userData?.isBlacklist === '1') {
        responseObject.isBlacklist = userData?.isBlacklist;
        responseObject.reason = blockData?.reasonData?.reason;
        responseObject.blockedBy = blockData?.blockedBy;
        responseObject.userId = userId;
        responseObject.reasonId = blockData?.reasonId;
        let title = `User is blocked | Blocked by: ${responseObject?.adminName}`;
        if (responseObject?.reason) {
          title += `| Reason: ${responseObject.reason}`;
        }
        responseObject.title = title;
      } else if (coolOffEndsOn && coolOffEndsOn > todayDate) {
        //if user is not blocked but cooloff
        responseObject.isBlacklist = userData?.isBlacklist;
        responseObject.coolOffEndsOn = coolOffEndsOn;
        responseObject.coolOffStartedOn =
          userData?.masterData?.coolOffData?.coolOffStartedOn;
        responseObject.coolOffCount = userData?.masterData?.coolOffData?.count;
        responseObject.isCoolOff = '1';
        responseObject.reason = blockData?.reasonData?.reason
          ? blockData.reasonData.reason
          : blockData?.reason ?? userData?.masterData?.coolOffData?.reason;
        const date = new Date(coolOffEndsOn);
        const options: any = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        let nextEligibleDate = date.toLocaleDateString('en-IN', options);
        nextEligibleDate = nextEligibleDate.replace(',', '');
        responseObject.nextEligibleDate = nextEligibleDate;
      } else if (
        responseObject.isBlacklist === '0' &&
        responseObject.isCoolOff === '0' &&
        responseObject.adminName === 'System'
      ) {
        delete responseObject.adminName;
      }
      return responseObject;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  async resetTodaysCoolOff() {
    try {
      // Get target list
      const attributes = ['userId'];
      const coolOffEndsOn = this.typeService.getGlobalDate(new Date()).toJSON();
      const where = { coolOffData: { coolOffEndsOn } };
      let options: any = { where };
      const masterList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;
      const userIds = [...new Set(masterList.map((el) => el.userId))];

      // Update target list
      options = { where: { id: userIds, NextDateForApply: { [Op.ne]: null } } };
      const updatedData = { NextDateForApply: null };
      const updateResult = await this.userRepo.updateRowWhereData(
        updatedData,
        options,
      );
      if (updateResult == k500Error) return kInternalError;
      return {
        totalUpdatedRecords: +updateResult.toString(),
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async addMissingAppsFlyerIds() {
    try {
      const loanIds = [];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['appsFlyerId', 'recentDeviceId'];
      const include = [userInclude];
      const targetList = await this.loanRepo.getTableWhereData(
        ['id', 'userId'],
        {
          include,
          where: { id: loanIds },
        },
      );
      if (targetList == k500Error) return kInternalError;

      const finalizedList = [];
      for (let index = 0; index < targetList.length; index++) {
        try {
          const loanData = targetList[index];
          const userId = loanData.userId;
          const userData = loanData.registeredUsers ?? {};
          // if (!userData.appsFlyerId) {
          //   const appsFlyerId = await this.googleService.appsFlyerDetails({
          //     deviceId: userData.recentDeviceId,
          //   });
          //   if (appsFlyerId.message) continue;
          //   userData.appsFlyerId = appsFlyerId;
          //   await this.userRepo.updateRowData({ appsFlyerId }, userId);
          // }
          finalizedList.push({
            loanId: loanData.id,
            appsFlyerId: userData.appsFlyerId,
          });
        } catch (error) {}
      }
      const rawExcelData = {
        sheets: ['Ap'],
        data: [finalizedList],
        sheetName: 'data.xlsx',
        needFindTuneKey: false,
      };
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;
    } catch (error) {}
  }

  async getUserInstalledApps(reqData) {
    try {
      let { userId } = reqData;
      if (!userId) return kParamMissing('userId');

      // retriving the PK of recent deviceId
      const registerUserAttributes = ['recentDeviceId'];
      const registerUserOptions = {
        where: {
          id: userId,
        },
      };

      const registerUserResult = await this.userRepo.getRowWhereData(
        registerUserAttributes,
        registerUserOptions,
      );

      if (!registerUserResult) return k422ErrorMessage(kNoDataFound);

      if (registerUserResult === k500Error) return registerUserResult;

      const { recentDeviceId } = registerUserResult;

      if (!recentDeviceId) return k422ErrorMessage('recentDeviceId not found');

      const attributes = ['id'];
      const options = {
        where: {
          deviceId: recentDeviceId,
          userId,
        },
      };

      const deviceResult = await this.deviceRepo.getRowWhereData(
        attributes,
        options,
      );

      if (!deviceResult) return k422ErrorMessage(kNoDataFound);

      if (deviceResult === k500Error) return deviceResult;

      const { id: deviceIdPK } = deviceResult;

      const installAppAttributes = [
        'appName',
        'packageName',
        'category',
        'status',
      ];
      const installAppOptions = {
        where: {
          deviceId: deviceIdPK,
        },
      };

      const installAppResult = await this.installAppRepo.getTableWhereData(
        installAppAttributes,
        installAppOptions,
      );

      if (installAppResult === k500Error) return installAppResult;

      // preparing data

      return {
        length: installAppResult.length,
        apps: installAppResult,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get call log
  async getCallLog(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const options = { where: { userId } };
      const att = ['phone', 'name', 'timeStamps', 'duration'];
      const result = await this.contactLogRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      let finalList = [];
      result.forEach((ele) => {
        try {
          ele.phone = this.cryptService.decryptPhone(ele.phone);
          const timeStamps = ele?.timeStamps ?? [];
          const durationData = ele?.duration ?? {};
          const temp = {
            phone: ele.phone,
            name: ele.name == 'null' ? 'Unknown' : ele.name,
          };
          timeStamps.forEach((time) => {
            try {
              const date = new Date(time).toJSON();
              const duration = durationData[time] ?? 0;
              finalList.push({ ...temp, date, duration });
            } catch (er) {}
          });
        } catch (error) {}
      });
      finalList = finalList.sort(
        (b, a) => new Date(a?.date).getTime() - new Date(b?.date).getTime(),
      );
      return finalList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // ADD and DELETE other phone and email
  async updateOtherPhoneEmail(body) {
    try {
      const userId = body?.userId;
      const adminId = body?.adminId;
      const request = body?.request;
      const phone = body?.phone;
      const email = body?.email;
      if (!userId) return kParamMissing('userId');
      if (!adminId) return kParamMissing('adminId');
      if (!request) return kParamMissing('request');
      if (!phone && !email) return kParamMissing('phone or email');
      const requestType = ['ADD', 'DELETE'];
      if (!requestType.includes(request)) return kInvalidParamValue('request');
      const attributes = [
        'id',
        'otherPhone',
        'otherEmail',
        'allPhone',
        'allEmail',
        'addedBy',
      ];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData === k500Error) return kInternalError;
      const otherPhone = userData?.otherPhone;
      const otherEmail = userData?.otherEmail;
      const allPhone = userData?.allPhone;
      const allEmail = userData?.allEmail;
      const addedBy = userData?.addedBy;
      const adminName =
        (await this.commonSharedService.getAdminData(adminId)).fullName ?? '-';
      if (phone) {
        if (request == 'ADD') {
          if (!allPhone.includes(phone)) {
            allPhone.push(phone);
            otherPhone.push(phone);
            addedBy[phone] = adminName;
          } else return k409ErrorMessage();
        } else if (request == 'DELETE' && allPhone.includes(phone)) {
          const index = allPhone.indexOf(phone);
          if (index > -1) allPhone.splice(index, 1);
          const ind = otherPhone.indexOf(phone);
          if (ind > -1) otherPhone.splice(ind, 1);
        } else return kWrongDetails;
      } else if (email) {
        if (request == 'ADD') {
          if (!allEmail.includes(email)) {
            allEmail.push(email);
            otherEmail.push(email);
            addedBy[email] = adminName;
          } else return k409ErrorMessage();
        } else if (request == 'DELETE' && allEmail.includes(email)) {
          const index = allEmail.indexOf(email);
          if (index > -1) allEmail.splice(index, 1);
          const ind = otherEmail.indexOf(email);
          if (ind > -1) otherEmail.splice(ind, 1);
        } else return kWrongDetails;
      } else return kWrongDetails;
      const updateUser = {
        otherPhone,
        otherEmail,
        allPhone,
        allEmail,
        addedBy,
      };
      await this.userRepo.updateRowData(updateUser, userId);
      const data = {
        userId,
        type: 'User',
        subType: `${request} ${phone ?? email} user other ${
          phone ? 'PHONE' : 'EMAIL'
        }`,
        oldData: request == 'DELETE' ? phone ?? email : '',
        newData: request == 'ADD' ? phone ?? email : '',
        adminId,
        ip: body.ip,
      };
      await this.changeLogsRepo.create(data);
      return userData;
    } catch (error) {}
  }

  // remove coollOff and blackList
  async removeCoollOffAndBlackList(body) {
    try {
      const userId = body?.userId;
      const phone = body?.phone;
      const adminId = body?.adminId;
      const reason = body?.reason;
      if (!userId && !phone) return kParamMissing('userId or phone');
      if (!adminId) return kParamMissing('adminId');
      let userWhere: any = { id: userId };
      if (phone) {
        if (Array.isArray(phone)) {
          const encPhone: any = [];
          for (let i = 0; i < phone.length; i++) {
            try {
              const ph = phone[i];
              if (!isNaN(ph)) {
                let searchText = this.cryptService.encryptPhone(ph);
                searchText = searchText.split('===')[1];
                encPhone.push({ [Op.iRegexp]: searchText });
              }
            } catch (error) {}
          }
          userWhere = { phone: { [Op.or]: encPhone } };
        } else {
          let searchText = this.cryptService.encryptPhone(phone);
          searchText = searchText.split('===')[1];
          userWhere = { phone: { [Op.iRegexp]: searchText } };
        }
      }
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'coolOffData'],
      };
      const checkUser = await this.userRepo.getTableWhereData(
        ['id', 'isBlacklist', 'fullName', 'phone'],
        { where: userWhere, include: [masterInclude] },
      );
      if (checkUser === k500Error) return kInternalError;
      const length = checkUser.length;
      if (length == 0) return {};
      const finalData = [];
      for (let index = 0; index < length; index++) {
        try {
          const ele = checkUser[index];
          const id = ele.id;
          const name = ele?.fullName;
          const phone = this.cryptService.decryptPhone(ele?.phone);
          const masterData = ele?.masterData;
          const coolOffData = masterData?.coolOffData ?? {};
          const updatedData = { isBlacklist: '0', NextDateForApply: null };
          const updateUser = await this.userRepo.updateRowData(updatedData, id);
          if (updateUser === k500Error) continue;
          coolOffData.coolOffStartedOn = '';
          coolOffData.coolOffEndsOn = '';
          const updateMaster = await this.masterRepo.updateRowData(
            { coolOffData },
            masterData?.id,
          );
          if (updateMaster === k500Error) continue;
          await this.userService.routeDetails({ id });
          const obj = { userId: id, name, phone };
          finalData.push(obj);
          const historyData = {
            userId: id,
            reason,
            isBlacklist: '0',
            blockedBy: adminId,
          };
          await this.userBlockHistoryRepo.createRowData(historyData);
        } catch (error) {}
      }
      const fileName = `removeCoollOffAndBlackList_${new Date().getTime()}`;
      const excelData: any = {
        sheets: [fileName],
        data: [finalData],
        sheetName: `${fileName}.xlsx`,
      };
      await this.typeService._objectToExcel(excelData);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getUserByDeviceId(query) {
    try {
      const deviceId = query?.deviceId;
      if (!deviceId) return kParamMissing('deviceId');
      if (deviceId.includes('-')) return deviceId;
      const deviceData = await this.deviceRepo.getRowWhereData(
        ['id', 'userId', 'deviceId'],
        { where: { deviceId: deviceId }, order: [['id', 'DESC']] },
      );
      if (deviceData === k500Error) return kInternalError;
      return deviceData?.userId;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //Get Device SIM Info Data
  async getDeviceSIMInfo(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const att = [
        'id',
        'simNumber',
        'operatorName',
        'isActive',
        'simNumber2',
        'operatorName2',
      ];
      const option = { where: { userId }, order: [['isActive', 'desc']] };
      const result = await this.deviceSIMRepo.getTableWhereData(att, option);
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #start region get user permission
  async getUserPermission(query) {
    const searchText: string = query?.searchText;
    const page: number = query?.page;
    const attributes = [
      'id',
      'title',
      'img',
      'asset',
      'android',
      'IOS',
      'description',
    ];
    const options: any = {};
    if (page) {
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      options.offset = offset;
      options.limit = PAGE_LIMIT;
    }
    if (searchText) {
      options.where = { title: { [Op.iRegexp]: searchText } };
    }
    const result = await this.userPermissionRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (result === k500Error) return kInternalError;
    const preparedList = [];
    const data = result?.rows;
    for (let i = 0; i < data.length; i++) {
      const id = data[i].id;
      const title = data[i].title;
      const img = data[i].img;
      const asset = data[i].asset;
      const Android = data[i].android;
      const IOS = data[i].IOS;
      const Description = data[i].description;
      preparedList.push({
        id: id,
        Title: title,
        img: img,
        asset: asset,
        Android,
        IOS,
        Description,
      });
    }
    return { count: result.count, rows: preparedList };
  }

  //#region
  async getMailTrackerLogsByUser(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      const trackAttr = [
        'id',
        'status',
        'type',
        'title',
        'subStatus',
        'createdAt',
        'refrenceId',
        'requestData',
        'sentBy',
        'statusDate',
        'loanId',
        'content',
        'source',
      ];
      const trackOptions = await this.prepareOptionsForMailTracker(reqData);
      if (trackOptions?.message) return kInternalError;
      // finding the data
      const trackData: any =
        await this.mailTrackerRepo.getTableWhereDataWithCounts(
          trackAttr,
          trackOptions,
        );
      if (trackData === k500Error) return kInternalError;
      // preparing the data
      const filteredData: any = await this.prepareDataMailTrakerUser(
        trackData.rows,
      );
      trackData.rows.forEach((row) => {
        let formattedDate: any = new Date(row?.createdAt);
        formattedDate = this.dateService.readableDate(formattedDate);
        row.createdAt = formattedDate;
      });
      if (filteredData?.message) return kInternalError;
      trackData.rows = filteredData;
      return trackData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async prepareOptionsForMailTracker(reqData) {
    try {
      const userId = reqData.userId;
      const loanId = reqData.loanId;
      const searchText = reqData?.searchText;
      const download = reqData?.download ?? false;
      const page = reqData?.page ?? 1;
      const dropdownStatus = reqData?.dropdownStatus;

      const options: any = {
        where: { userId, isSender: { [Op.or]: [false, null] } },
        order: [['id', 'DESC']],
      };
      if (loanId) options.where.loanId = loanId;
      if (dropdownStatus) options.where.status = dropdownStatus;
      //For search Text
      if (searchText) {
        if (searchText?.toLowerCase().startsWith('l-')) {
          options.where.loanId = searchText.replace('l-', '');
        } else options.where.title = { [Op.iRegexp]: searchText };
      }
      //For pagination
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion
  async prepareDataMailTrakerUser(trackData) {
    const filteredData = [];
    try {
      const length = trackData.length;
      if (length.length == 0) return k422ErrorMessage(kNoDataFound);
      for (let index = 0; index < length; index++) {
        try {
          const ele = trackData[index];
          const refrenceId = ele.refrenceId != '' ? ele.refrenceId : '-';
          const sentBy = ele?.sentBy ?? 'system';
          const loanId = ele?.loanId ?? '-';
          let title = ele?.title ?? '-';
          let description = ele?.content ?? '-';
          const requestData = ele?.requestData;
          let source = ele.source;
          if ((ele.type == 'TEXT' || ele.type == 'WHATSAPP') && source)
            source = this.cryptService.decryptPhone(source);

          if (requestData) {
            // get data from redis
            let key = `TEMPLATE_DATA_BY_TEMPID`;
            let template = await this.redisService.get(key);
            template = template ?? null;
            template = JSON.parse(template) ?? [];

            //filter data from template id
            if (template.length) {
              template = template.filter(
                (el) =>
                  el.templateId == requestData ||
                  el.lspTemplateId == requestData,
              );
              if (template.length > 0) {
                title = template[0]?.title ?? '-';
                description = template[0]?.content ?? '-';
              }
            }
          }
          if (ele.type == 'EMAIL') description = '-';

          let date: any = new Date(ele?.statusDate ?? ele?.createdAt);
          date.setHours(date.getHours() + 5);
          date.setMinutes(date.getMinutes() + 30);
          date = this.dateService.dateToReadableFormat(date);
          date = `${date.readableStr} at ${date.hours}:${date.minutes} ${date.meridiem}`;

          filteredData.push({
            type: ele.type,
            refrenceId: refrenceId ?? '-',
            title: title.includes('Verification code')
              ? 'Verification code'
              : title,
            description,
            source,
            sentBy,
            loanId,
            id: ele.id,
            status: ele.status,
            sub: ele.subStatus,
            date,
          });
        } catch (error) {}
      }
      return filteredData;
    } catch (error) {
      kInternalError;
    }
  }

  async trackAppInstallForRegUser(body) {
    try {
      const days = body?.days ?? 7;

      const today = new Date();
      const date = today;
      date.setDate(date.getDate() - days);

      const date1 = this.typeService.getUTCDate(date.toString());

      const attributes = ['id', 'fcmToken'];
      const options: any = {
        where: {
          createdAt: { [Op.gte]: date1 },
          completedLoans: 0,
          fcmToken: {
            [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
          },
        },
      };
      const userData = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;

      const length = userData.length;
      const spans = await this.typeService.splitToNChunks(userData, 50);

      for (let index = 0; index < spans.length; index++) {
        const list = [];
        const targetList = spans[index];
        for (let i = 0; i < targetList.length; i++) {
          const item = targetList[i];
          list.push(this.updateCheckAppInstalled(item));
        }
        await Promise.all(list);
      }
      return length;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region update install data
  async updateCheckAppInstalled(data: any) {
    try {
      const id = data?.id;
      const fcm = data?.fcmToken;
      const loanData = data?.loanData;

      if (id) {
        const result = await this.sharedNotificationService.checkAppIsInstall(
          fcm,
        );

        const isUnInstallApp = this.typeService
          .getGlobalDate(new Date())
          .toJSON();
        let loanId;
        if (loanData)
          try {
            loanId = loanData[0]?.id;
          } catch (error) {}

        const updateData: any = {
          userId: id,
          type: result ? 'INSTALL_APP_CHECK' : 'UNINSTALL_APP_CHECK',
          date: isUnInstallApp,
        };
        if (loanId) data.loanId = loanId;
        await this.userActivityRepo.findOrCreate(updateData, updateData);

        if (!result) {
          if (!data?.isUnInstallApp)
            await this.userRepo.updateRowDataWithOptions(
              { isUnInstallApp },
              { isUnInstallApp: { [Op.eq]: null } },
              id,
            );
        } else await this.userRepo.updateRowData({ isUnInstallApp: null }, id);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async removeFromCoolOff(reqData) {
    // Preparation -> Parameters
    const userIds = reqData.userIds;
    if (!userIds) return kParamMissing('userIds');

    // Preparation -> Query
    const userAttr = ['id'];
    const masterInclude: SequelOptions = { model: MasterEntity };
    masterInclude.attributes = ['userId'];
    masterInclude.where = { status: { loan: 2 } };
    const include = [masterInclude];
    const userOptions = { include, where: { id: { [Op.in]: userIds } } };
    // Hit -> Query
    const userList = await this.repo.getTableWhereData(
      registeredUsers,
      userAttr,
      userOptions,
    );
    // Validation -> Query
    if (userList === k500Error) throw new Error();

    for (let index = 0; index < userList.length; index++) {
      try {
        const userData = userList[index];
        await this.funSetNextEligibiltyDate({
          userId: userData.id,
          eligibilityDate: null,
          adminId: SYSTEM_ADMIN_ID,
        });
      } catch (error) {}
    }

    return {};
  }

  async getFramesSessionList(reqData) {
    const userId = reqData.userId;
    const options = {
      where: { userId, sessionId: { [Op.ne]: null } },
      group: ['sessionId', 'createdAt'],
      order: [['createdAt']],
    };
    const sessionId = await this.repo.getTableWhereData(
      FramesEntity,
      ['sessionId'],
      options,
    );
    if (sessionId == k500Error) throw new Error();
    const sessionList = [...new Set(sessionId.map((ele) => ele?.sessionId))];
    return sessionList;
  }

  async getFrames(reqData) {
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');
    const sessionId = reqData?.id;
    if (!sessionId) return kParamMissing('sessionId');
    const options: any = {
      where: { userId, sessionId },
      order: [['createdAt']],
    };
    const userData = await this.repo.getTableCountWhereData(
      FramesEntity,
      ['url', 'screenName', 'createdAt'],
      options,
    );
    if (userData == k500Error) throw new Error();
    userData?.rows?.forEach((ele) => {
      ele.createdAt = this.dateService.readableDate(ele?.createdAt);
    });
    return userData;
  }

  // region start get user repayment details
  async userRepaymentDetails(query) {
    try {
      const loanId = query?.loanId;
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const emiAtrr = [
        'id',
        'userId',
        'emi_amount',
        'emi_date',
        'payment_done_date',
        'payment_status',
        'payment_due_status',
        'principalCovered',
        'interestCalculate',
        'penalty_update_date',
        'penalty',
        'penalty_days',
        'bounceCharge',
        'penalty_days',
        'partPaymentPenaltyAmount',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
        'fullPayPrincipal',
        'fullPayPenalty',
        'fullPayInterest',
        'pay_type',
        'gstOnBounceCharge',
        'legalCharge',
        'legalChargeGST',
        'fullPayLegalCharge',
        'regInterestAmount',
        'dpdAmount',
        'penaltyChargesGST',
        'fullPayPenal',
        'fullPayRegInterest',
        'fullPayBounce',
        'waived_regInterest',
        'waived_bounce',
        'waived_penal',
        'waived_legal',
        'paid_principal',
        'paid_interest',
      ];
      // emi Include
      const emiInclude = { model: EmiEntity, emiAtrr };
      const loanAttr = [
        'id',
        'userId',
        'netApprovedAmount',
        'interestRate',
        'loanStatus',
        'emiSelection',
        'loan_disbursement_date',
        'penaltyCharges',
      ];
      // transaction include
      const transInclude = {
        model: TransactionEntity,
        required: false,
        attributes: [
          'id',
          'userId',
          'paidAmount',
          'status',
          'completionDate',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
          'subscriptionDate',
          'transactionId',
          'type',
          'response',
          'subSource',
          'createdAt',
          'cgstOnLegalCharge',
          'sgstOnLegalCharge',
          'legalCharge',
          'cgstOnPenalCharge',
          'sgstOnPenalCharge',
          'penalCharge',
          'regInterestAmount',
          'bounceCharge',
          'cgstOnBounceCharge',
          'sgstOnBounceCharge',
        ],
      };
      // esign include
      const eSignInclude = {
        model: esignEntity,
        attributes: ['id', 'signed_document_upload'],
        required: false,
      };

      const empInclude = {
        model: employmentDetails,
        attributes: ['id', 'otherInfo'],
        required: false,
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['completedLoans'],
        required: false,
        include: [empInclude],
      };
      let options: any = {
        where: { userId },
        include: [userInclude, emiInclude, transInclude, eSignInclude],
        order: [['id', 'desc']],
      };
      if (loanId) options.where = { id: loanId };
      const loanData = await this.loanRepo.getRowWhereData(loanAttr, options);
      if (loanData == k500Error) return kInternalError;

      // calculate repaidAmount , dueAmount, remaningAmount
      let obj = {};
      let amountData;
      if (['Active', 'Complete'].includes(loanData?.loanStatus)) {
        amountData = await this.emiSharedService.prepareEMIDetails(loanData);
      }
      // seperate transaction from loanData
      const emiData = loanData?.emiData ?? [];
      const penalty_days = this.typeService.getOverDueDay(emiData);
      const transData = loanData?.transactionData ?? [];
      transData.sort((a, b) => b?.id - a?.id);
      let autoDebitData: any = {};
      let autoDebitDate;
      const autodebit = transData?.find((f) => f?.subSource == 'AUTODEBIT');
      if (autodebit) {
        let subscriptionDate = autodebit?.subscriptionDate;
        autoDebitDate = subscriptionDate
          ? subscriptionDate
          : autodebit.createdAt;
        autoDebitDate = this.typeService.dateToJsonStr(
          autoDebitDate,
          'DD/MM/YYYY',
        );
        if (autodebit.status === 'INITIALIZED') {
          autoDebitData.amount = autodebit.paidAmount ?? '-';
          autoDebitData.date = autodebit.subscriptionDate ?? '-';
        } else if (autodebit.status === 'COMPLETED') {
          autoDebitData.status = 'COMPLETED';
          autoDebitData.message = 'SUCCESS';
        } else {
          const response = autodebit?.response
            ? JSON.parse(autodebit?.response)
            : {};
          autoDebitData.message = response?.payment?.failureReason ?? '';
          autoDebitData.status = autodebit.status;
          if (!autoDebitData.message)
            autoDebitData.message =
              response?.response?.data?.message ||
              response?.error_description ||
              response?.error_message ||
              response?.reason ||
              '-';
        }
      }

      // get legalStep and create legal date
      let legalStepAndDate = !loanData?.id
        ? {}
        : await this.commonSharedService.getLegalDataByLoanId(loanData?.id);
      if (legalStepAndDate?.createdAt) {
        let type = legalStepAndDate.type;
        let createdAt = legalStepAndDate.createdAt;
        if (type === 9) createdAt = legalStepAndDate.dates.disposalDate ?? null;
        let legalCreatedAt: any = this.typeService.getGlobalDate(createdAt);
        legalCreatedAt = this.typeService.dateToJsonStr(
          legalCreatedAt,
          'DD/MM/YYYY',
        );
        let legalStep = legalString[type];
        legalStepAndDate = { legalStep, legalCreatedAt };
      }
      let nexSalaryDate =
        loanData?.registeredUsers?.employmentData?.otherInfo?.nextPayDate;

      if (nexSalaryDate)
        nexSalaryDate = this.typeService.dateToJsonStr(
          nexSalaryDate,
          'DD/MM/YYYY',
        );
      obj['loanId'] = loanData?.id ?? '-';
      obj['nextSalaryDate'] = nexSalaryDate ?? '-';
      obj['interestRatePerDay'] = loanData?.interestRate
        ? `@${loanData.interestRate}%`
        : '-';
      obj['loanAmount'] =
        this.StringService.readableAmount(loanData?.netApprovedAmount) ?? '-';
      obj['userSelectEMIsDate'] =
        loanData?.emiSelection?.selectedEmiDate ?? '-';
      obj['overdueNotice'] = loanData?.legalData?.url ?? '-';
      obj['overdueDays'] = penalty_days;
      obj['legalStep'] = legalStepAndDate?.legalStep ?? '-';
      obj['legalDate'] = legalStepAndDate?.legalCreatedAt ?? '-';
      obj['loanAgreement'] = loanData?.eSignData?.signed_document_upload ?? '-';
      obj['totalReceivable'] =
        this.StringService.readableAmount(amountData?.totalReceivable) ?? '-';
      obj['totalReceived'] =
        this.StringService.readableAmount(amountData?.totalReceived) ?? '-';
      obj['totalRemaining'] =
        this.StringService.readableAmount(amountData?.totalRemaining) ?? '-';
      obj['autoDebitDate'] = autoDebitDate ?? '-';
      obj['last_auto_debit_status'] = autoDebitData?.status ?? '-';
      obj['last_auto_debit_message'] = autoDebitData?.message ?? '-';
      obj['last_auto_debit_amount'] =
        this.StringService.readableAmount(autoDebitData?.amount) ?? '-';
      //prepare emi Data
      let dueDate = '-';
      let paidEmi = 0;
      emiData.sort((a, b) => b?.id - a?.id);
      for (let i = 0; i < emiData?.length; i++) {
        try {
          const el = emiData[i];
          if (el.payment_status == '1') paidEmi++;
          if (el.payment_status == '0')
            dueDate =
              this.typeService.dateToJsonStr(el?.emi_date, 'DD/MM/YYYY') ?? '-';
        } catch (error) {}
      }
      obj['dueDate'] = dueDate;
      obj['emiCount'] = `${paidEmi}/${emiData?.length ?? 0}`;
      return obj;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async decryptedPhoneNumbers(reqData): Promise<any> {
    const userIds = reqData.userIds;
    if (!userIds) return kParamMissing('userIds');
    const needExcel = reqData.needExcel == true;

    // Preparation -> Query
    const userAttr = ['id', 'phone'];
    const userOptions = { where: { id: userIds } };
    // Hit -> Query
    const userList = await this.userRepo.getTableWhereData(
      userAttr,
      userOptions,
    );
    if (userList == k500Error) throw new Error();

    userList.forEach((el) => {
      el.phone = this.cryptService.decryptPhone(el.phone);
    });
    if (!needExcel) return userList;

    // Generation -> Excel
    const rawExcelData = {
      sheets: ['Users'],
      data: [userList],
      sheetName: 'Users.xlsx',
    };
    const url: any = await this.fileService.objectToExcelURL(rawExcelData);
    if (!url || url.message) throw new Error();

    return { url };
  }
}
