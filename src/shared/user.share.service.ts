// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import {
  ENTERED_SALARY_IS_BELOW,
  kCoolOffPeriodOverTitle,
  kCoolOffPeriodOverContent,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kNoDataFound,
  FINALBUCKETADMINS,
} from 'src/constants/strings';
import { UserRepository } from 'src/repositories/user.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MasterEntity } from 'src/entities/master.entity';
import {
  MAX_LOAN_AMOUNT,
  NotAppliedUserSMSId,
  SYSTEM_ADMIN_ID,
  UAT_PHONE_NUMBER,
  LSP_APP_LINK,
  nbfcAppLink,
  gIsPROD,
  GLOBAL_RANGES,
} from 'src/constants/globals';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { EligibilitySharedService } from './eligibility.shared.service';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { HealthDataRepository } from 'src/repositories/healthData.repository';
import { Op } from 'sequelize';
import { TypeService } from 'src/utils/type.service';
import { OtherPermissionDataRepository } from 'src/repositories/otherPermissionData.repository';
import { SharedNotificationService } from './services/notification.service';
import { UserStage, kKeyTypes, week } from 'src/constants/objects';
import { CommonSharedService } from './common.shared.service';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { CRMSelectorService } from 'src/thirdParty/crm-services/crm-services.service';
import { registeredUsers } from 'src/entities/user.entity';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { CryptService } from 'src/utils/crypt.service';
import { DateService } from 'src/utils/date.service';
import { UserActivityEntity } from 'src/entities/user.activity.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class UserSharedService {
  constructor(
    private readonly masterRepo: MasterRepository,
    private readonly repository: UserRepository,
    private readonly userBlockHistoryRepo: BlockUserHistoryRepository,
    private readonly empRepo: EmploymentRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly loanRepo: LoanRepository,
    private readonly healthDataRepo: HealthDataRepository,
    private readonly typeService: TypeService,
    private readonly otherPermissionDataRepo: OtherPermissionDataRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly commonSharedService: CommonSharedService,
    private readonly whatsappService: WhatsAppService,
    private readonly cryptService: CryptService,
    private readonly dateService: DateService,
    private readonly repoManager: RepositoryManager,

    // Repositories
    private readonly subscriptionRepo: SubscriptionRepository,
  ) {}

  async submitProfessionalDetails(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const empInfo = (reqData.empInfo ?? '').toLowerCase();
      if (!empInfo) return kParamMissing('empInfo');
      const salaryInfo = reqData.salaryInfo ?? 0;
      // code comment due to missing repeater proffetional salaryInfo
      // if (!salaryInfo) return kParamMissing('salaryInfo');
      // if (isNaN(salaryInfo)) return kInvalidParamValue('salaryInfo');
      const toDay = this.typeService.getGlobalDate(new Date());

      // Get user data
      const att = [
        'coolOffData',
        'dates',
        'rejection',
        'otherInfo',
        'empId',
        'loanId',
      ];
      const userData = await this.getUserData(
        reqData,
        ['completedLoans', 'isCibilConsent', 'isRedProfile', 'maybeGoodCibil'],
        att,
      );
      if (userData.message) return userData;

      const masterId = userData.masterId;
      const dates = userData.masterData?.dates ?? {};
      const rejection = userData.masterData?.rejection ?? {};
      const statusData = userData.masterData?.status ?? {};
      const otherInfo = userData.masterData?.otherInfo ?? {};
      const coolOffData = userData.masterData?.coolOffData ?? {};
      const isRedProfile = (userData?.isRedProfile ?? 0) === 2;
      const updatedData: any = {
        status: statusData,
        otherInfo,
        dates,
        rejection,
      };

      // Check professional eligibility
      let reason;
      let isCoolOff = false;
      let isBlackList = false;
      const targetDate = this.typeService.getGlobalDate(new Date());
      const empApprove = [
        'salaried professional',
        'salaried',
        'consultant',
        kKeyTypes.SELF_EMPLOYED,
      ];
      let count = coolOffData?.count ?? 0;
      /// if old defulter then skip this step
      if (!isRedProfile) {
        if (!empApprove.includes(empInfo) && empInfo != 'student') {
          reason = 'User is not salaried';
          isBlackList = true;
        } else if (empInfo == 'student') {
          reason = 'Not eligible employment sector';
          targetDate.setDate(targetDate.getDate() + 180);
          isCoolOff = true;
        }
        // 3 months cool off < 20000 salary
        else if (salaryInfo && salaryInfo < GLOBAL_RANGES.MIN_SALARY_AMOUNT) {
          reason = ENTERED_SALARY_IS_BELOW;
          if (!count || count == 0)
            targetDate.setDate(targetDate.getDate() + 3);
          else targetDate.setDate(targetDate.getDate() + 90);
          isCoolOff = true;
        }
      }
      // Mark user as cool off temporary
      if (isCoolOff) {
        updatedData.coolOffData = userData.masterData?.coolOffData ?? {};
        updatedData.coolOffData.reason = reason ?? '';
        updatedData.coolOffData.count = count + 1;
        updatedData.coolOffData.coolOffStartedOn = toDay.toJSON();
        updatedData.coolOffData.coolOffEndsOn = targetDate.toJSON();

        // Update user data
        const userUpdateData = { NextDateForApply: targetDate };
        const userUpdateResult = await this.repository.updateRowData(
          userUpdateData,
          userId,
        );
        if (userUpdateResult == k500Error) return kInternalError;
      }
      // Block the user permanently
      else if (isBlackList) {
        const userUpdateResult = await this.repository.updateRowData(
          { isBlacklist: '1' },
          userId,
        );
        if (userUpdateResult == k500Error) return kInternalError;
        await this.userBlockHistoryRepo.createRowData({
          isBlacklist: '1',
          userId,
          blockedBy: SYSTEM_ADMIN_ID,
        });
      }

      if ((isCoolOff || isBlackList) && updatedData.status.loan == -1) {
        updatedData.status.loan = 2;
        updatedData.status.eligibility = 2;
        updatedData.dates.loan = new Date().getTime();
        const update: any = { loanStatus: 'Rejected' };
        if (reason) {
          update.remark = reason;
          update.manualVerification = '2';
          update.manualVerificationAcceptId = SYSTEM_ADMIN_ID;
          updatedData.rejection.loan = reason;
        }
        const loanId = userData.masterData?.loanId;
        const where = { userId, loanStatus: 'InProcess' };
        if (loanId) await this.loanRepo.updateWhere(update, loanId, where);
      }
      // Update master data
      if (!isCoolOff && !isBlackList) {
        updatedData.status.professional = 1;
        updatedData.dates.professionalDetails = new Date().getTime();
      }
      updatedData.otherInfo.salaryInfo = salaryInfo;
      updatedData.otherInfo.employmentInfo = empInfo;
      const updateResult = await this.masterRepo.updateRowData(
        updatedData,
        masterId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Check eligibility as per state salary

      /// if old defulter then skip this step
      if (
        !isCoolOff &&
        !isBlackList &&
        statusData.aadhaar == 1 &&
        !isRedProfile
      ) {
        const eligibility =
          await this.sharedEligibility.validateStateWiseEligibility({ userId });
        if (eligibility.message) return eligibility;
      }

      const empId = userData.masterData?.empId;
      if (empId)
        await this.empRepo.updateRowData({ salary: salaryInfo }, empId);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region get user info
  private async getUserData(reqData, extraAttr = [], extraFields = []) {
    try {
      const id = reqData.userId;
      if (!id) return kParamMissing('userId');
      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status', 'miscData', ...extraFields];
      const include = [masterInclude];
      const attributes = ['masterId', ...extraAttr];
      const options = { include, where: { id } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      return userData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  async fetchHealthData(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      let healthInfo = reqData?.healthInfo ?? '';
      if (!healthInfo) return kParamMissing('healthInfo');
      if (typeof healthInfo == 'string') healthInfo = JSON.parse(healthInfo);
      const query = [];
      const infoData = [];
      for (let index = 0; index < healthInfo.length; index++) {
        try {
          const ele = healthInfo[index];
          const value = ele?.value;
          const unit = ele?.unit;
          const dataType = ele?.data_type;
          const platform = ele?.platform_type;
          const deviceId = ele?.device_id;
          const sourceId = ele?.source_id;
          const sourceName = ele?.source_name;
          const dateFrom = new Date(ele?.date_from).getTime().toString();
          const dateTo = new Date(ele?.date_to).getTime().toString();
          const condition = { dateFrom, dateTo, dataType };
          query.push(condition);
          const rowData = {
            userId,
            value,
            unit,
            dateFrom,
            dateTo,
            dataType,
            platform,
            deviceId,
            sourceId,
            sourceName,
          };
          infoData.push(rowData);
        } catch (error) {}
      }
      const attr = ['dateFrom', 'dateTo', 'dataType'];
      const healthData = await this.healthDataRepo.getTableWhereData(attr, {
        where: { userId, [Op.or]: query },
      });
      if (healthData === k500Error) return kInternalError;
      const addData = [];
      infoData.forEach((el) => {
        try {
          const find = healthData.find(
            (f) =>
              f.dateFrom == el.dateFrom &&
              f.dateTo == el.dateTo &&
              f.dataType == el.dataType,
          );
          if (!find) addData.push(el);
        } catch (error) {}
      });
      if (addData.length > 0) {
        const createData = await this.healthDataRepo.bulkCreate(addData);
        if (createData === k500Error) return kInternalError;
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getUserTimeStatics(userId) {
    try {
      const sqlQuery = `SELECT
      DATE_TRUNC('hour', tran."updatedAt") AS date,
      count(tran."id") as count
      FROM
      public."UserActivityEntities" AS tran
      WHERE
      type = 'LAST_ONLINE'
      and tran."userId" ='${userId}'
      GROUP BY
      DATE_TRUNC('hour', tran."updatedAt");`;

      const queryData: any = await this.repoManager.injectRawQuery(
        UserActivityEntity,
        sqlQuery,
      );
      if (queryData == k500Error) return kInternalError;
      var maxCount = 0;
      var maxCountForDate = 0;
      var currentDate;
      var previousDate = new Date(queryData[0].date).getDate();
      var previousCount = +queryData[0].count;
      var resultHour;
      var resultDate;
      for (let i = 0; i < queryData.length; i++) {
        if (i != 0) {
          let count = +queryData[i].count;
          let date = queryData[i].date;
          if (count > maxCount) {
            maxCount = count;
            resultHour = date;
          }
          currentDate = new Date(date).getDate();
          if (currentDate == previousDate) previousCount += count;
          else previousCount = count;
          if (maxCountForDate < previousCount) {
            maxCountForDate = previousCount;
            resultDate = date;
          }
          previousDate = currentDate;
        } else {
          resultDate = previousDate;
          resultHour = new Date(queryData[0].date);
        }
      }
      const timeRange = this.dateService.readableTimeWithRange(resultHour);
      const date = new Date(resultDate).getDay();
      const day = week[date];
      let updatedData = {
        mostFrequentHour: timeRange,
        mostFrequentDay: day,
      };
      const update = await this.repository.updateRowData(
        updatedData,
        userId,
        true,
      );
      if (update == k500Error) return kInternalError;
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async fetchOtherPermissionData(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      const type = reqData?.type;
      if (!type) return kParamMissing('type');
      let resData = reqData?.response;
      if (!resData) return kParamMissing('response');
      if (typeof resData == 'string') resData = JSON.parse(resData);
      const loanId = reqData?.loanId;
      const infoData = [];
      for (let index = 0; index < resData.length; index++) {
        try {
          const ele = resData[index];
          const response = JSON.stringify(ele);
          const rowData = {
            userId,
            loanId,
            type,
            response,
          };
          infoData.push(rowData);
        } catch (error) {}
      }
      if (infoData.length > 0) {
        const createData = await this.otherPermissionDataRepo.bulkCreate(
          infoData,
        );
        if (createData === k500Error) return kInternalError;
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // notification On-time user does not apply for the new loans
  async sendNotificationToNotAppliedUser() {
    try {
      /* Temporarily disabled
      Source - https://github.com/Lenditt-Innovation/backend-service/issues/889 */
      return {};
      // loan completed ontime 15 day ago
      const from = new Date();
      from.setDate(from.getDate() - 15);

      const masterInc = {
        model: MasterEntity,
        attributes: [],
        where: { status: { loan: 7 }, updatedAt: { [Op.lte]: from } },
      };
      const include = [masterInc];
      const options = { where: { loanStatus: 1 }, include };
      const userData = await this.repository.getTableWhereData(
        ['id', 'appType'],
        options,
      );
      if (userData === k500Error) return kInternalError;
      const length = userData.length;
      for (let index = 0; index <= length; index++) {
        try {
          const user = userData[index];
          const userId = user.id;
          const appType = user.appType;
          const interest: any =
            await this.commonSharedService.getEligibleInterestRate({
              userId,
            });
          const var1 = this.typeService.amountNumberWithCommas(MAX_LOAN_AMOUNT);
          const var2 = interest + '%';
          const var3 =
            user?.appType == 1
              ? `Apply Now! ${nbfcAppLink}`
              : `Apply Now! ${LSP_APP_LINK};`;
          const var4 = user?.appType == 1 ? kInfoBrandNameNBFC : kInfoBrandName;
          const title = `You’ve qualified for a loan up to Rs. ${var1}`;
          const content = `Congratulations! You’ve qualified for a loan up to Rs. ${var1} at an unbeatable interest rate of ${var2} per day. Don’t miss out on this opportunity. ${var3} Brand: ${var4}`;
          const userList = [];
          userList.push({ userId, appType });
          const body = {
            userData: userList,
            title,
            content,
            isMsgSent: true,
            smsId: NotAppliedUserSMSId,
            smsOptions: { var1, var2, var3 },
          };
          await this.sharedNotification.sendNotificationToUser(body);
        } catch (error) {}
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  getUserStage(stage) {
    try {
      switch (stage) {
        case UserStage.PHONE_VERIFICATION:
          return 'PHONE_VERIFICATION';

        case UserStage.BASIC_DETAILS:
          return 'BASIC DETAILS';

        case UserStage.SELFIE:
          return 'SELFIE';

        case UserStage.NOT_ELIGIBLE:
          return 'NOT_ELIGIBLE';

        case UserStage.PIN:
          return 'PIN';

        case UserStage.AADHAAR:
          return 'AADHAAR';

        case UserStage.EMPLOYMENT:
          return 'EMPLOYMENT DETAILS';

        case UserStage.BANKING:
          return 'BANK VERIFICATION';

        case UserStage.RESIDENCE:
          return 'RESIDENCE';

        case UserStage.LOAN_ACCEPT:
          return 'LOAN ACCEPT';

        case UserStage.CONTACT:
          return 'CONTACT VERIFICATION';

        case UserStage.PAN:
          return 'PAN VERIFICATION';

        case UserStage.FINAL_VERIFICATION:
          return 'FINAL_VERIFICATION';

        case UserStage.MANDATE:
          return 'EMANDATE';

        case UserStage.ESIGN:
          return 'ESIGN';

        case UserStage.DISBURSEMENT:
          return 'DISBURSEMENT';

        case UserStage.REPAYMENT:
          return 'REPAYMENT';

        case UserStage.DEFAULTER:
          return 'DEFAULTER';

        case UserStage.EXPRESS_REAPPLY:
          return 'EXPRESS REAPPLY';

        case UserStage.REAPPLY:
          return 'REAPPLY';

        default:
          return '-';
      }
    } catch (error) {
      return '-';
    }
  }

  // if old defulter then stop user at successful mandate registration
  async resetRedProfile(userId, currentLoanId) {
    if (!userId) return kParamMissing('userId');
    const userOps = { where: { id: userId, isRedProfile: 2 } };
    const userData = await this.repository.getRowWhereData(['id'], userOps);
    if (userData === k500Error) return kInternalError;
    if (!userData) return {};
    // Get old active loan data and make it current loan for app flow
    let attributes = ['id', 'loanId', 'status'];
    let options: any = {
      order: [['id', 'DESC']],
      where: { status: { loan: 6 }, userId },
    };
    const oldMasterData = await this.masterRepo.getRowWhereData(
      attributes,
      options,
    );
    if (oldMasterData == k500Error) return kInternalError;
    if (!oldMasterData) return k422ErrorMessage(kNoDataFound);
    const oldMasterId = oldMasterData.id;
    if (oldMasterData.loanId == currentLoanId) return {};
    // Get latest mandate data and add in overdue loan
    attributes = ['id'];
    options = {
      order: [['id', 'DESC']],
      where: { umrn: { [Op.ne]: null }, userId },
    };
    const newSubcriptionData: any = await this.subscriptionRepo.getRowWhereData(
      attributes,
      options,
    );
    if (newSubcriptionData == k500Error) return kInternalError;
    if (!newSubcriptionData) return k422ErrorMessage(kNoDataFound);
    let updatedData: any = { subscriptionId: newSubcriptionData.id };
    let updatedResponse: any = await this.loanRepo.updateRowData(
      updatedData,
      oldMasterData.loanId,
    );

    // Update old loan data for user
    updatedData = {
      isRedProfile: 3,
      lastLoanId: oldMasterData.loanId,
      masterId: oldMasterId,
    };
    updatedResponse = await this.repository.updateRowData(updatedData, userId);
    if (updatedResponse == k500Error) return kInternalError;

    // Reject new loan with new mandate
    attributes = ['id', 'loanId', 'status'];
    options = {
      where: { loanId: currentLoanId },
    };
    const currentMasterData = await this.masterRepo.getRowWhereData(
      attributes,
      options,
    );
    if (currentMasterData == k500Error) return kInternalError;
    if (!currentMasterData) return k422ErrorMessage(kNoDataFound);

    // Update current loan's master data with rejection
    const currentStatusData = currentMasterData.status ?? {};
    currentStatusData.loan = 2;
    currentStatusData.eligibility = 2;
    currentStatusData.isRedProfile = 3;
    updatedData = { status: currentStatusData };
    updatedResponse = await this.masterRepo.updateRowData(updatedData, userId);
    if (updatedResponse == k500Error) return kInternalError;
    // Update current loan data with rejection
    updatedData = { loanStatus: 'Rejected', manualVerification: '2' };
    updatedResponse = await this.loanRepo.updateRowData(
      updatedData,
      currentLoanId,
    );
    if (updatedResponse == k500Error) return kInternalError;

    return kInternalError;
  }

  // check stuck user's RouteDetails (ex.after disbursement)
  async checkStuckRouteDetails(query) {
    try {
      const userId = query?.userId;
      const masterInc = {
        model: MasterEntity,
        attributes: ['id', 'loanId'],
        where: { status: { disbursement: 1 } },
      };
      let option: any = { where: { stage: 16 }, include: [masterInc] };
      if (userId) option = { where: { id: userId } };
      const userData = await this.repository.getTableWhereData(['id'], option);
      if (userData === k500Error) return kInternalError;
      const length = userData.length;
      if (length == 0) return [];
      return userData.map((u) => u?.id);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //Send notification and Whatsapp Message whose CoolOff completes Today
  async completionOfCoolOffUSer() {
    try {
      const date = this.typeService.getGlobalDate(new Date());
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'loanId', 'coolOffData'],
        where: {
          coolOffData: {
            coolOffEndsOn: date.toJSON(),
          },
        },
      };

      //get coolOffUser with respect to todays completion
      const option = {
        include: masterInclude,
        order: [['id', 'DESC']],
      };
      const userData = await this.repository.getTableWhereData(
        ['id', 'fcmToken', 'fullName', 'email', 'phone', 'appType'],
        option,
      );
      if (userData === k500Error) return kInternalError;
      if (!gIsPROD) userData.length = 1;
      for (let i = 0; i < userData?.length; i++) {
        try {
          const fcmToken = userData[i]?.fcmToken;
          const preparedData = {
            loanId: userData[i]?.masterData?.loanId ?? '-',
            userId: userData[i]?.id ?? '-',
            customerName: userData[i]?.fullName ?? 'Dear User',
            email: userData[i]?.email ?? '-',
            number: gIsPROD
              ? this.cryptService.decryptPhone(userData[i]?.phone)
              : UAT_PHONE_NUMBER[i],
            title: kCoolOffPeriodOverTitle,
            requestData: kCoolOffPeriodOverTitle,
            appType: userData[i]?.appType,
          };
          let coolOffData = userData[i]?.masterData?.coolOffData ?? '';

          // await this.whatsappService.sendWhatsAppMessage(preparedData);
          this.whatsappService.sendWhatsAppMessageMicroService(preparedData);

          if (fcmToken) {
            await this.sharedNotification.sendPushNotification(
              fcmToken,
              kCoolOffPeriodOverTitle,
              kCoolOffPeriodOverContent,
              {},
              true,
              SYSTEM_ADMIN_ID,
            );
          }

          coolOffData.coolOffEndsOn = '';
          coolOffData.coolOffStartsOn = '';
          await this.masterRepo.updateRowWhereData(
            { coolOffData },
            {
              where: { id: userData[i].masterData?.id },
            },
          );
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
