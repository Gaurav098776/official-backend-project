// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  UAT_PHONE_NUMBER,
  gIsPROD,
  SYSTEM_ADMIN_ID,
  GLOBAL_RANGES,
  LSP_APP_LINK,
  NBFC_APP_LINK,
} from 'src/constants/globals';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { TypeService } from 'src/utils/type.service';
import { CryptService } from 'src/utils/crypt.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { PAGE_LIMIT } from 'src/constants/globals';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { CrmRepository } from 'src/repositories/crm.repository';
import {
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kPending,
  kUnder_Verification,
} from 'src/constants/strings';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserStage, kMonths } from 'src/constants/objects';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { CallingService } from '../calling/calling.service';
import { TemplateRepository } from 'src/repositories/template.repository';
@Injectable()
export class AnalysisService {
  constructor(
    private readonly downloadAppTrackRepo: DownloaAppTrackRepo,
    private readonly userRepo: UserRepository,
    private readonly requestSupportRepo: RequestSupportRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly exotelService: exotelService,
    private readonly callingService: CallingService,
    private readonly crmRepo: CrmRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly loanRepository: LoanRepository,
    private readonly CommonSharedService: CommonSharedService,
    private readonly transactionRepository: TransactionRepository,
    private readonly whatsappService: WhatsAppService,
    private readonly templateRepo: TemplateRepository,
  ) {}
  async getUserAppDownloadReport(query) {
    try {
      let startDate = query?.startDate;
      let endDate = query?.endDate;
      if (!startDate || !endDate) return kParamsMissing;
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const downloadAtt: any = ['typeOfDevice', 'isRegistered', 'isExits'];
      const options = {
        where: {
          registeredDate: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
      };
      const userData: any = await this.downloadAppTrackRepo.getTableWhereData(
        downloadAtt,
        options,
      );
      if (userData == k500Error) return kInternalError;
      const preparedData = this.getFormateData(userData);
      if (preparedData.message) return preparedData;
      let finalData: any = [];
      for (let key in preparedData) {
        try {
          finalData.push({ typeOfDevice: key, ...preparedData[key] });
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  private getFormateData(data) {
    try {
      const formatedData: any = {};
      for (let i = 0; i < data.length; i++) {
        try {
          const user = data[i];
          if (formatedData[user.typeOfDevice]) {
            formatedData[user.typeOfDevice].totalUser += 1;
            if (user?.isExits)
              formatedData[user.typeOfDevice].alreadyRegistered += 1;
          } else {
            formatedData[user.typeOfDevice] = {
              totalUser: 1,
              alreadyRegistered: 0,
            };
            if (user?.isExits)
              formatedData[user.typeOfDevice].alreadyRegistered = 1;
          }
        } catch (error) {}
      }
      return formatedData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region getting users count stucked at stages
  async funGetUserStuckDataCounts(query) {
    try {
      ///Date filter
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      let dateRange: any = this.typeService.getUTCDateRange(startDate, endDate);
      dateRange = { [Op.gte]: dateRange.fromDate, [Op.lte]: dateRange.endDate };
      query.dateRange = dateRange;
      query.counts = 'true';

      const inProCount = await this.allInProgressUserStuckData(query);
      if (inProCount.message) return inProCount;
      const regisCount = await this.getRegistrationStuckedData(query);
      if (regisCount?.message) return regisCount;
      const aadhaarCount = await this.getAadhaarStuckData(query);
      if (aadhaarCount?.message) return aadhaarCount;
      const missingBankStatement = await this.missingBankSatement(query);
      if (missingBankStatement?.message) return missingBankStatement;
      const qualityUserCount = await this.getQualityUserData(query);
      if (qualityUserCount?.message) return qualityUserCount;

      return {
        IN_PROGRESS: inProCount,
        REGISTRATION: regisCount,
        AADHAAR: aadhaarCount,
        MISSING_STATEMENT: missingBankStatement,
        QUALITY_USER: qualityUserCount,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //common user options for userStuck count
  private commonUserOptionsForCounts(query, masterWhere) {
    try {
      masterWhere.updatedAt = query.dateRange;
      const masterInclude: any = {
        model: MasterEntity,
        attributes: ['id'],
        where: masterWhere,
        required: true,
      };
      const toDay = this.typeService.getGlobalDate(new Date());
      const userOptions: any = {
        where: {
          isBlacklist: { [Op.ne]: '1' },
          NextDateForApply: {
            [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
          },
        },
        include: [masterInclude],
      };
      return userOptions;
    } catch (error) {}
  }

  //#region getting user stuck data
  async funGetUserStuckData(query) {
    try {
      const stage = query?.stage;
      if (!stage) return kParamMissing('stage');
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      let dateRange: any = this.typeService.getUTCDateRange(startDate, endDate);
      dateRange = { [Op.gte]: dateRange.fromDate, [Op.lte]: dateRange.endDate };
      query.dateRange = dateRange;
      if (stage == 'REGISTRATION')
        return await this.getRegistrationStuckedData(query);
      else if (stage == 'AADHAAR') return await this.getAadhaarStuckData(query);
      else if (stage == 'MISSING_BANK')
        return await this.missingBankSatement(query);
      else if (stage == 'QUALITY') return await this.getQualityUserData(query);
      else return await this.getUsersInProgressData(query);
    } catch (errr) {
      return kInternalError;
    }
  }
  //#endregion

  async selfieStuckWhatsappMsg(query) {
    try {
      const endDate: any = new Date();
      const startDate: any = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      let dateRange: any = this.typeService.getUTCDateRange(startDate, endDate);
      dateRange = { [Op.gte]: dateRange.fromDate, [Op.lte]: dateRange.endDate };
      const queryData = {
        stage: 'IN_PROGRESS',
        subKey: 'SELFIE',
        key: 'PENDING',
        dateRange,
      };
      const data: any = await this.getSelfieStuckData(queryData);

      if (query?.list == 'true') return data;

      for (let i = 0; i < data.rows.length; i++) {
        try {
          const ele = data.rows[i];
          const userId = ele?.userId;
          const customerName = ele?.Name ?? 'User';
          const loanId = ele['Loan id'];
          const email = ele?.Email;
          let number = ele['Mobile number'];
          if (!gIsPROD) number = UAT_PHONE_NUMBER[i];
          const whatsappOption: any = {
            userId,
            customerName,
            loanId,
            email,
            number,
            title: 'Selfie stuck',
            requestData: 'Selfie_stuck',
            appLink: ele?.appType == '0' ? LSP_APP_LINK : NBFC_APP_LINK,
          };
          // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
          this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
        } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async kycStuckWhatsappMsg(query) {
    try {
      const endDate: any = new Date();
      const startDate: any = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      let dateRange: any = this.typeService.getUTCDateRange(startDate, endDate);
      dateRange = { [Op.gte]: dateRange.fromDate, [Op.lte]: dateRange.endDate };
      const attributes = ['fullName', 'id', 'email', 'phone', 'appType'];
      const masterInclude: any = {
        model: MasterEntity,
        where: {
          [Op.and]: {
            'status.aadhaar': {
              [Op.or]: ['-1', '0', '2'],
            },
            'status.permission': '1',
            'status.phone': '1',
            'status.basic': '1',
            'status.selfie': '5',
            'status.pan': '5',
            'status.pin': '1',
            'status.email': '1',
            'status.personal': '1',
            'status.professional': '1',
            updatedAt: dateRange,
            'coolOffData.count': 0,
          },
        },
        attributes: ['loanId'],
      };
      const options: any = {
        include: masterInclude,
        where: {
          isBlacklist: '0',
        },
      };
      if (!gIsPROD) options.limit = 3;
      const data = await this.userRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (data === k500Error) return kInternalError;

      if (query?.list == 'true') return data;
      for (let i = 0; i < data.rows.length; i++) {
        try {
          const ele = data.rows[i];
          const userId = ele?.id;
          const customerName = ele?.fullName ?? 'User';
          const loanId = ele?.masterData?.loanId;
          const email = ele?.email;
          let number = this.cryptService.decryptPhone(ele?.phone);
          if (!gIsPROD) number = UAT_PHONE_NUMBER[i];
          const whatsappOption: any = {
            userId,
            customerName,
            loanId,
            email,
            number,
            title: 'Kyc stuck',
            requestData: 'Kyc_stuck',
            appLink: ele?.appType == '0' ? LSP_APP_LINK : NBFC_APP_LINK,
          };
          // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
          this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
        } catch (error) {
          console.log(error, 'check error>>>>>>>.');
          return kInternalError;
        }
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region get all in progress loan data
  async getUsersInProgressData(query) {
    try {
      const stage = query?.subKey ?? 'ALL';
      if (stage == 'EMPLOYMENT')
        return await this.getEmploymentStuckData(query);
      else if (stage == 'EXPRESSREAPPLY')
        return await this.getExpressReapplyStuckData(query);
      else if (stage == 'BANKSTATEMENT')
        return await this.getBankStatementStuckData(query);
      else if (stage == 'RESIDENCE')
        return await this.getResidenceStuckData(query);
      else if (stage == 'SELFIE') return await this.getSelfieStuckData(query);
      else if (stage == 'LOAN_ACCEPT')
        return await this.getLoanAcceptStuckData(query);
      else if (stage == 'PAN') return await this.getPanStuckData(query);
      else if (stage == 'ADD_REFERENCE')
        return await this.getReferenceStuckData(query);
      else if (stage == 'EMANDATE')
        return await this.getMandateStuckData(query);
      else if (stage == 'ESIGN') return await this.getEsignStuckData(query);
      else return await this.allInProgressUserStuckData(query);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //get all inprogress userStuck
  async allInProgressUserStuckData(query) {
    try {
      const approved = [1, 3];
      const masterWhere: any = {
        updatedAt: query.dateRange,
        status: {
          // We need users who's loan is started but not approved yet
          loan: { [Op.notIn]: [-2, 2, 6, 7] },
          phone: { [Op.or]: approved },
          email: { [Op.or]: approved },
          permission: { [Op.or]: approved },
          basic: { [Op.or]: approved },
          personal: { [Op.or]: approved },
          professional: { [Op.or]: approved },
          selfie: { [Op.or]: [0, 1, 2, 3, 5] },
          disbursement: -1,
        },
      };
      if (query?.counts == 'true') {
        const opts = this.commonUserOptionsForCounts(query, masterWhere);
        const counts = await this.userRepo.getCountsWhere(opts);
        if (counts === k500Error) return kInternalError;
        return counts;
      }
      const options = this.commonUserOptions(query);
      const data: any = await this.getAllUserStuckDataQuery(
        options,
        'inProgress',
        query,
      );
      query.download = 'true';
      const options1 = this.commonUserOptions(query);
      const data1: any = await this.getAllUserStuckDataQuery(
        options1,
        'inProgress',
        query,
      );
      data.totalAmount = data1.totalAmount;
      return data;
    } catch (error) {}
  }

  //#region preparing user stuck data
  async prepareUserStuckData(users, stage?, reqDetails: any = {}, reqList?) {
    try {
      let crmList: any = await this.getLastCrmList(users);
      const isWhatsapp = reqDetails?.isWhatsapp;
      if (!crmList || crmList.message) crmList = [];
      const finalData = [];
      for (let index = 0; index < users.length; index++) {
        try {
          const user = users[index];
          const appType = user?.masterData?.loanData?.appType ?? user?.appType;
          const temp: any = {};
          const reqData = reqList.find((ele) => ele?.userId == user?.id);
          const activeResponse = this.typeService.getLastActiveUserTime(
            user?.lastOnlineTime,
          );
          const loan = user?.masterData?.loanData;
          const bankData = loan?.bankingData;
          let missingMonth = bankData?.dataOfMonth;
          if (missingMonth) {
            missingMonth = JSON.parse(missingMonth);
            missingMonth = Object.keys(missingMonth).find((ele) => {
              return missingMonth[ele] == true;
            });
          }
          const lastCrm = crmList.find((f) => f?.userId == user?.id);
          temp['userId'] = user?.id ?? '-';
          temp['Name'] = user?.fullName ?? '-';
          temp['Loan id'] = user?.masterData?.loanId ?? '-';
          temp['Mobile number'] =
            this.cryptService.decryptPhone(user?.phone) ?? '-';
          temp['Email'] = user?.email ?? '-';
          temp['Applied amount'] = +(loan?.netApprovedAmount ?? '0');
          temp['Completed loans'] = user?.completedLoans ?? 0;
          temp['Reg. Date'] =
            this.typeService.getDateFormatted(user?.createdAt) ?? '-';
          temp['AA Response'] = bankData?.aaDataStatus == 1 ? true : false;
          temp['Assigned CSE'] =
            (
              await this.CommonSharedService.getAdminData(
                user?.masterData?.assignedCSE,
              )
            )?.fullName ?? '-';

          // Response pending from account aggregator
          if (reqDetails?.subKey == 'AA_RESPONSE') {
            temp['Attempts'] = bankData?.attempts ?? '1';
            temp['Action track'] = 'BANK VERIFICATION';
          } else if (bankData?.aaDataStatus == 1)
            temp['Action track'] = 'BANK VERIFICATION';
          else temp['Action track'] = this.getActionTrack(user.stage);
          temp['Employment information'] =
            user?.masterData?.otherInfo?.employmentInfo === ''
              ? '-'
              : user?.masterData?.otherInfo?.employmentInfo ?? '-';
          temp['Error Meassage'] = reqData?.reason ?? '-';
          temp['Connect With'] = reqData?.connectVia ?? '-';
          temp['Platform'] = user?.typeOfDevice == '0' ? 'Android' : 'IOS';
          temp['Salary'] = user?.masterData?.otherInfo?.salaryInfo ?? '-';
          temp['Company name'] = user?.masterData?.empData?.companyName ?? '-';
          temp['Pan'] = user?.kycData?.panCardNumber ?? '-';
          temp['City'] = user?.city ?? '-';
          temp['Account number'] = bankData?.accountNumber ?? '-';
          temp['IFSC code'] = bankData?.ifsCode ?? '-';
          temp['Mandate Bank'] = bankData?.mandateBank ?? '-';
          temp['Emandate via'] = loan?.subscriptionData?.mode ?? '-';
          temp['Emandate type'] = loan?.subscriptionData?.subType ?? '-';
          temp['E-sign via'] = loan?.eSignData?.esign_mode ?? '-';
          temp['CRM date'] = lastCrm?.createdAt
            ? this.typeService.getDateFormatted(lastCrm?.createdAt)
            : '-';
          temp['CRM created by'] =
            (await this.CommonSharedService.getAdminData(lastCrm?.adminId))
              ?.fullName ?? '-';
          temp['CRM remark'] = lastCrm?.remark ?? '-';
          const statusObj = user?.masterData?.status;
          const rejection = user?.masterData?.rejection;
          const check =
            stage == 'inProgress'
              ? this.getInProgressStatusReason(statusObj, rejection)
              : this.checkStatusAndReason(stage, statusObj, rejection);
          temp['Reject reason'] = check?.reason ?? '-';
          temp['Status'] =
            stage == 'missing_bank' ? kPending : check?.status ?? '-';
          temp['isOnline'] =
            activeResponse?.lastActiveAgoMinutes < 5 &&
            activeResponse?.lastActiveAgo != '';
          temp['Last Active ago'] =
            activeResponse?.lastActiveAgo == ''
              ? null
              : activeResponse?.lastActiveAgo;
          temp.appType = appType;

          finalData.push(temp);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {}
  }
  //#endregion

  private getActionTrack(stage) {
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

  checkStatusAndReason(stage, statusObj, rejection) {
    try {
      let arr = [stage];
      let pending = [-1, 2, 5];
      let underVerification = [0];
      if (stage == 'registration')
        arr = [
          'phone',
          'email',
          'permission',
          'basic',
          'personal',
          'professional',
          'selfie',
        ];
      else if (stage == 'employment')
        arr = ['company', 'workMail', 'salarySlip'];
      else if (stage == 'bank') pending = [-1, 2, 4];
      else if (stage == 'residence') {
        pending = [-1, 2, 4, 5, 6];
        underVerification = [0];
      } else if (stage == 'selfie') {
        pending = [-1, 2];
        underVerification = [0, 5];
      } else if (stage == 'pan') pending = [-1, 2, 5, 6];

      let status = '-';
      let reason = '-';
      for (let index = 0; index < arr.length; index++) {
        try {
          let el = arr[index];
          if (status != '-') break;
          if (underVerification.includes(statusObj[el])) {
            status = kUnder_Verification;
            const empS = [0, 1, 3];
            if (stage == 'employment' && !empS.includes(statusObj['bank']))
              status = 'In Process';
            if (stage == 'eSign') status = 'Initiated';
          } else if (pending.includes(statusObj[el])) {
            status = kPending;
            if (stage == 'eSign') status = 'Not Initiated';
          }

          if (reason == '-') {
            if (el == 'bank') el = 'banking';
            reason = rejection?.el ?? rejection?.eligibility ?? '-';
            if (reason == '') reason = '-';
          }
        } catch (error) {}
      }
      return { status, reason };
    } catch (error) {}
  }

  getInProgressStatusReason(statusObj, rejection) {
    try {
      const allStage = [
        'registration',
        'aadhaar',
        'employment',
        'bank',
        'residence',
        'selfie',
        'pan',
        'loan',
        'reference',
        'eMandate',
        'eSign',
      ];
      let status = '-';
      let reason = '-';
      for (let index = 0; index < allStage.length; index++) {
        try {
          const stage = allStage[index];
          const check = this.checkStatusAndReason(stage, statusObj, rejection);
          status = check?.status ?? '-';
          reason == '-' ? check?.reason : '-';
          if (status != '-') break;
        } catch (error) {}
      }
      return { status, reason };
    } catch (error) {}
  }

  //for filter
  getStageWhere(stage, type) {
    try {
      const where: any = {};
      const pending = { [Op.or]: [-1, 2] };
      if (stage == 'EMPLOYMENT') {
        if (type == 'PENDING')
          where.status = {
            [Op.or]: [
              { company: pending },
              { workMail: pending },
              { salarySlip: pending },
            ],
          };
        else if (type == 'UNDERVERIFICATION')
          where.status = {
            [Op.or]: [{ company: 0 }, { workMail: 0 }, { salarySlip: 0 }],
          };
      } else if (stage == 'BANKSTATEMENT') {
        if (type == 'PENDING') where.status = { bank: { [Op.or]: [-1, 2, 4] } };
        else if (type == 'UNDERVERIFICATION') where.status = { bank: 0 };
      } else if (stage == 'RESIDENCE') {
        if (type == 'PENDING')
          where.status = { residence: { [Op.or]: [-1, 2, 5, 6] } };
        else if (type == 'UNDERVERIFICATION')
          where.status = { residence: { [Op.or]: [0] } };
      } else if (stage == 'SELFIE') {
        if (type == 'PENDING') where.status = { selfie: pending };
        else if (type == 'UNDERVERIFICATION')
          where.status = { selfie: { [Op.or]: [0, 5] } };
      } else if (stage == 'LOAN_ACCEPT') {
        if (type == 'PENDING') where.status = { loan: -1 };
        else if (type == 'UNDERVERIFICATION') where.status = { loan: 0 };
      } else if (stage == 'ADD_REFERENCE') {
        if (type == 'PENDING') where.status = { reference: pending };
        else if (type == 'UNDERVERIFICATION') where.status = { reference: 0 };
      } else if (stage == 'PAN') {
        if (type == 'PENDING')
          where.status = { pan: { [Op.or]: [-1, 2, 5, 6] } };
        else if (type == 'UNDERVERIFICATION') where.status = { pan: 0 };
      } else if (stage == 'EMANDATE') {
        if (type == 'PENDING') where.status = { eMandate: -1 };
        else if (type == 'UNDERVERIFICATION') where.status = { eMandate: 0 };
      } else if (stage == 'ESIGN') {
        if (type == 'PENDING') where.status = { eSign: -1 };
        else if (type == 'UNDERVERIFICATION') where.status = { eSign: 0 };
      }
      return where;
    } catch (error) {
      return {};
    }
  }

  //common user options for stuck
  private commonUserOptions(query: any = {}) {
    try {
      const mainStage = query?.stage;
      let stage = query?.subKey ?? '';
      let searchText = query?.searchText;
      const download = query?.download ?? 'false';
      const page = query?.page ?? 1;
      let type = query?.key ?? 'ALL';
      const userWhere: any = {};
      let masterWhere: any = {};
      let bankWhere: any = {};
      let loanWhere: any = {};
      let cseAdmin = query?.cseAdmin;

      const isJoinRequired =
        mainStage == 'MISSING_BANK' || stage == 'AA_RESPONSE' ? true : false;

      userWhere.stageTime = query?.dateRange;
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        if (firstTwoLetters == 'l-') {
          const restOfString = searchText.substring(2);
          masterWhere.loanId = +restOfString;
        } else {
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userWhere.phone = { [Op.iRegexp]: searchText };
          } else
            userWhere[Op.or] = [
              { fullName: { [Op.iRegexp]: searchText } },
              { email: { [Op.iRegexp]: searchText } },
            ];
        }
      }
      //Quality User(good cibil)
      if (mainStage == 'QUALITY') {
        userWhere.maybeGoodCibil = 1;
        userWhere.stage = { [Op.lte]: 15, [Op.ne]: 4 };
      }
      // Missing bank statement
      if (mainStage == 'MISSING_BANK') {
        bankWhere = {
          salaryVerification: '4',
          dataOfMonth: { [Op.ne]: null },
        };
      }
      // AA Response pending from aa side
      else if (stage == 'AA_RESPONSE') {
        bankWhere = {
          salaryVerification: '4',
          consentId: { [Op.ne]: null },
        };
        loanWhere = { loanStatus: 'InProcess' };
      }
      if (stage) {
        stage = this.getStageNumber(stage);
        if (stage != -1) stage = { stage: { [Op.in]: stage } };
        else stage = '';
      } else {
        stage = this.getStageNumber(mainStage);
        if (stage != -1) stage = { stage: { [Op.in]: stage } };
        else stage = '';
      }

      const allInProgressStage = [3, 7, 8, 9, 10, 11, 12, 14, 15, 20];
      if (type && type != 'ALL') {
        if (type == 'PENDING') type = { stageStatus: { [Op.in]: [-1] } };
        else type = { stageStatus: { [Op.in]: [0] } };
      } else if (mainStage == 'IN_PROGRESS' && (stage ?? '') == '') {
        bankWhere = { aaDataStatus: 1 };
        type = {};
        stage = {
          stage: {
            [Op.in]: allInProgressStage,
          },
        };
        // In process user has started the loan process
        if (!masterWhere?.loanId) masterWhere.loanId = { [Op.ne]: null };
      } else type = {};
      if (cseAdmin) userWhere['$masterData.assignedCSE$'] = +cseAdmin;
      const kycInclude = {
        model: KYCEntity,
        attributes: ['id', 'panCardNumber'],
        required: isJoinRequired,
      };
      const empInclude = {
        model: employmentDetails,
        attributes: ['id', 'companyName'],
        required: isJoinRequired,
      };
      const bankInclude = {
        model: BankingEntity,
        where: bankWhere,
        attributes: [
          'attempts',
          'id',
          'accountNumber',
          'ifsCode',
          'mandateBank',
          'isNeedTagSalary',
          'dataOfMonth',
          'aaDataStatus',
        ],
        required: isJoinRequired,
      };
      const subscInclude = {
        model: SubScriptionEntity,
        attributes: ['id', 'mode', 'subType'],
        required: false,
      };
      const eSignInclude = {
        model: esignEntity,
        attributes: ['id', 'esign_mode'],
        required: false,
      };
      const loanInclude: SequelOptions = {
        model: loanTransaction,
        attributes: ['id', 'netApprovedAmount'],
        include: [bankInclude, subscInclude, eSignInclude],
        required: isJoinRequired,
        where: loanWhere,
      };
      const masterInclude: SequelOptions = {
        where: masterWhere,
        model: MasterEntity,
        attributes: [
          'id',
          'loanId',
          'status',
          'otherInfo',
          'rejection',
          'assignedCSE',
        ],
        include: [empInclude, loanInclude],
        required: isJoinRequired || masterWhere?.loanId ? true : false,
      };
      const userOptions: any = {
        where: {
          ...stage,
          ...type,
          ...userWhere,
        },
        order: [['stageTime', 'DESC']],
        include: [masterInclude, kycInclude],
      };
      if (download != 'true') {
        userOptions.offset = +page * PAGE_LIMIT - PAGE_LIMIT;
        userOptions.limit = PAGE_LIMIT;
      }
      return userOptions;
    } catch (error) {}
  }

  private getStageNumber(stage) {
    try {
      switch (stage) {
        case 'REGISTRATION':
          return [
            UserStage.BASIC_DETAILS,
            UserStage.PHONE_VERIFICATION,
            UserStage.SELFIE,
          ];
        case 'SELFIE':
          return [UserStage.SELFIE];
        case 'PAN':
          return [UserStage.PAN];
        case 'EMPLOYMENT':
          return [UserStage.EMPLOYMENT];
        case 'BANKSTATEMENT':
          return [UserStage.BANKING];
        case 'MISSING_BANK':
          return [UserStage.BANKING];
        case 'AA_RESPONSE':
          return [UserStage.NO_ROUTE];
        case 'RESIDENCE':
          return [UserStage.RESIDENCE];
        case 'REFERENCE':
          return [UserStage.CONTACT];
        case 'AADHAAR':
          return [UserStage.AADHAAR];
        case 'FINALBUCKET':
          return [UserStage.FINAL_VERIFICATION];
        case 'EMANDATE':
          return [UserStage.MANDATE];
        case 'ESIGN':
          return [UserStage.ESIGN];
        case 'LOAN_ACCEPT':
          return [UserStage.LOAN_ACCEPT];
        default:
          return -1;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async getAllUserStuckDataQuery(options, stage?, reqData: any = {}) {
    try {
      const masterInclude = {
        model: MasterEntity,
        attributes: ['loanId'],
        include: [
          {
            model: loanTransaction,
            attributes: ['appType'],
          },
        ],
      };
      const attributes = [
        'id',
        'fullName',
        'phone',
        'email',
        'typeOfDevice',
        'completedLoans',
        'lastOnlineTime',
        'city',
        'createdAt',
        'stage',
        'appType',
      ];

      const userData = await this.userRepo.getTableWhereDataWithCounts(
        attributes,
        { ...options },
      );
      const userIds = userData.rows.map((d) => d.id);
      if (userData === k500Error) return kInternalError;

      // get data from requestSupportRepo Entity
      const reqOpts: any = {
        where: { userId: userIds },
        order: [['id', 'DESC']],
      };
      if (stage != 'inProgress') reqOpts.where.lastStep = stage;
      const reqList = await this.requestSupportRepo.getTableWhereData(
        ['userId', 'reason', 'connectVia'],
        reqOpts,
      );

      const finalData = await this.prepareUserStuckData(
        userData?.rows,
        stage,
        reqData,
        reqList,
      );
      let totalAmount = 0;
      for (let i = 0; i < finalData.length; i++) {
        totalAmount += finalData[i]?.['Applied amount'] ?? 0;
      }
      return { count: userData?.count, rows: finalData, totalAmount };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //get user last crm data
  async getLastCrmList(userList: any = []) {
    try {
      const userIds = userList.map((el) => el?.id);

      const crmAttr = ['id', 'userId', 'createdAt', 'remark', 'adminId'];
      const crmOps: any = {
        where: { userId: userIds },
        order: [['id', 'DESC']],
      };

      const crmList = await this.crmRepo.getTableWhereData(crmAttr, crmOps);
      if (crmList === k500Error) return kInternalError;
      return crmList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#region get registration stucked user data
  async getRegistrationStuckedData(query) {
    try {
      const masterWhere = {
        [Op.and]: [
          {
            status: {
              [Op.or]: [
                { phone: { [Op.or]: [-1, 5] } },
                { email: { [Op.or]: [-1, 5] } },
                { permission: -1 },
                { basic: -1 },
                { personal: -1 },
                { professional: -1 },
                { selfie: -1 },
              ],
            },
          },
          { status: { loan: { [Op.ne]: 6 } } },
        ],
      };
      if (query?.counts == 'true') {
        const opts = this.commonUserOptionsForCounts(query, masterWhere);
        const counts = await this.userRepo.getCountsWhere(opts);
        if (counts === k500Error) return kInternalError;
        return counts;
      }
      const options = this.commonUserOptions(query);
      return await this.getAllUserStuckDataQuery(options, 'registration');
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get aadhaar stucked user data
  async getAadhaarStuckData(query) {
    try {
      const approvedStatus = [1, 3];
      const previousApproved = {
        phone: { [Op.or]: approvedStatus },
        email: { [Op.or]: approvedStatus },
        permission: { [Op.or]: approvedStatus },
        basic: { [Op.or]: approvedStatus },
        personal: { [Op.or]: approvedStatus },
        professional: { [Op.or]: approvedStatus },
        selfie: { [Op.or]: [1, 3, 5] },
      };
      const masterWhere = {
        status: { ...previousApproved, aadhaar: -1 },
      };
      if (query?.counts == 'true') {
        const opts = this.commonUserOptionsForCounts(query, masterWhere);
        const counts = await this.userRepo.getCountsWhere(opts);
        if (counts === k500Error) return kInternalError;
        return counts;
      }
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'aadhaar', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async missingBankSatement(query) {
    try {
      const approvedStatus = [1, 3];
      const previousApproved = {
        aadhaar: { [Op.or]: approvedStatus },
        company: { [Op.or]: [0, 1, 3] },
        workMail: { [Op.or]: [0, 1, 3, 4] },
        salarySlip: { [Op.or]: [0, 1, 3] },
        loan: { [Op.or]: [-2, -1] },
      };
      const masterWhere = {
        status: { ...previousApproved, bank: 4 },
      };
      if (query?.counts == 'true') {
        const opts = this.commonUserOptionsForCounts(query, masterWhere);
        const counts = await this.userRepo.getCountsWhere(opts);
        if (counts === k500Error) return kInternalError;
        return counts;
      }

      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'missing_bank', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region user stuck
  async getQualityUserData(query) {
    try {
      const approvedStatus = [1, 3];
      const previousApproved = {
        aadhaar: { [Op.or]: approvedStatus },
        esign: { [Op.ne]: 1 },
      };
      const masterWhere = {
        status: { ...previousApproved },
      };
      if (query?.counts == 'true') {
        const opts = this.commonUserOptionsForCounts(query, masterWhere);
        const counts = await this.userRepo.getCountsWhere(opts);
        if (counts === k500Error) return kInternalError;
        return counts;
      }
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'inProgress', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get employment stucked user data
  async getEmploymentStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'employment', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get Bank statement stucked user data
  async getBankStatementStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'bank', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get Bank statement stucked user data
  async getExpressReapplyStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      return await this.getAllUserStuckDataQuery(options, 'expressReapply');
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region get residence stucked user data
  async getResidenceStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'residence', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get selfie stucked user data
  async getSelfieStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'selfie', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region get loan accept stucked user data
  async getLoanAcceptStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;

      const data: any = await this.getAllUserStuckDataQuery(options, 'loan', {
        isWhatsapp,
      });

      query.download = 'true';
      const optionsNew: any = this.commonUserOptions(query);
      const dataNew: any = await this.getAllUserStuckDataQuery(
        optionsNew,
        'loan',
        {
          isWhatsapp,
        },
      );

      data.totalAmount = dataNew.totalAmount;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get reference stucked user data
  async getReferenceStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'reference', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get pan stucked user data
  async getPanStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'pan', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get Mandate stucked user data
  async getMandateStuckData(query) {
    try {
      const approvedStatus = [1, 3];
      const previousApproved = { loan: { [Op.or]: approvedStatus } };
      const masterWhere = {
        status: { ...previousApproved, eMandate: { [Op.or]: [-1, 0, 2] } },
      };
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'eMandate', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get Esign stucked user data
  async getEsignStuckData(query) {
    try {
      const options = this.commonUserOptions(query);
      const isWhatsapp = query?.isWhatsapp;
      return await this.getAllUserStuckDataQuery(options, 'eSign', {
        isWhatsapp,
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region calling stucked user
  async callStuckUser(query) {
    try {
      const adminId = query?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const stage = query?.stage == 'ALL' ? 'IN_PROGRESS' : query?.stage;
      if (!stage) return kParamMissing(stage);

      const stuckData = await this.funGetUserStuckData(query);
      if (stuckData?.message) return stuckData;
      const targetList = [];
      stuckData.rows.forEach((ele) => {
        try {
          const userObj = {
            userId: ele?.userId,
            phone: ele['Mobile number'] == '-' ? null : ele['Mobile number'],
            loanId: ele['Loan id'] == '-' ? null : ele['Loan id'],
          };
          targetList.push(userObj);
        } catch (error) {}
      });
      const subKey = query?.subKey ?? null;
      const key =
        stage == 'IN_PROGRESS' && subKey != 'ALL'
          ? query?.subKey ?? stage
          : stage;
      const category =
        key.substr(key.length - 5) != 'STUCK' ? `${key}_STUCK` : key;
      const callData = { category, adminId, targetList };
      const placeCall = await this.callingService.placeCall(callData);
      if (placeCall.message) return placeCall;
      return targetList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region getting keys and subkeys for users in progress
  async funGetInProcessLoanUserStuckList() {
    try {
      const keyList = [
        { key: 'ALL', value: 'ALL' },
        { key: 'Pending', value: 'PENDING' },
        { key: 'Under Verification', value: 'UNDERVERIFICATION' },
      ];
      const subKeyList = [
        { key: 'ALL', value: 'ALL' },
        { key: 'Employment', value: 'EMPLOYMENT' },
        { key: 'Bank Statement', value: 'BANKSTATEMENT' },
        { key: 'AA Response', value: 'AA_RESPONSE' },
        { key: 'Selfie', value: 'SELFIE' },
        { key: 'Loan Accept', value: 'LOAN_ACCEPT' },
        { key: 'Pan', value: 'PAN' },
        { key: 'E-Mandate', value: 'EMANDATE' },
        { key: 'E-Sign', value: 'ESIGN' },
      ];
      return { keyList, subKeyList };
    } catch (error) {}
  }
  //#endregion

  async funSentNotificationInProcess() {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const data: any = await this.funGetUserStuckData({
        stage: 'IN_PROGRESS',
        startDate,
        endDate: new Date(),
        download: 'true',
        isWhatsapp: true,
      });

      const tempOpt = { where: { title: 'Complete your process' } };
      const template = await this.templateRepo.getRowWhereData(['id'], tempOpt);
      if (template === k500Error) return kInternalError;

      await this.sharedNotification.sendNotificationToUser({
        userData: data.rows,
        isMsgSent: true,
        id: template?.id,
      });
      //user stuck whatsapp message stop temp
      // await this.sendUserStuckWhatsappMsg(data?.rows);

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region get query for month wise loan analytics
  getLoanAnalyticsMonthWiseQuery(fromMonth, attributes) {
    try {
      fromMonth.setFullYear(fromMonth.getFullYear() - 1);
      fromMonth.setMonth(fromMonth.getMonth() - 11);
      const disDate = 'loan_disbursement_date';
      attributes.push(
        this.typeService.manageDateAttr('year', '', disDate),
        this.typeService.manageDateAttr('month', '', disDate),
        'completedLoan',
      );
      const group = [
        this.typeService.manageDateAttr('year', '', disDate, false),
        this.typeService.manageDateAttr('month', '', disDate, false),
        'completedLoan',
      ];
      return { attributes, group };
    } catch (error) {
      k500Error;
    }
  }
  //#endregion

  //#region get query for day wise loan analytics
  getLoanAnalyticsDayWiseQuery(fromMonth, attributes) {
    try {
      fromMonth.setMonth(fromMonth.getMonth() - 1);
      fromMonth.setDate(1);
      const disDate = 'loan_disbursement_date';
      attributes.push(
        this.typeService.manageDateAttr('year', '', disDate),
        this.typeService.manageDateAttr('month', '', disDate),
        this.typeService.manageDateAttr('day', '', disDate),
        'completedLoan',
      );
      const group = [
        this.typeService.manageDateAttr('year', '', disDate, false),
        this.typeService.manageDateAttr('month', '', disDate, false),
        this.typeService.manageDateAttr('day', '', disDate, false),
        'completedLoan',
      ];
      return { attributes, group };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region get loan anaytics type wise
  async funGetLoanAnalyticsTypeWise(query) {
    try {
      const type = query?.type ?? 'MONTH';
      /// find row Data
      const loanData = await this.getRowDataAnalytics(type);
      if (loanData?.message) return loanData;

      let finalData;
      let previousMonthData;
      let currentMonthData;
      let _others;

      if (type == 'MONTH')
        finalData = { previousYearData: [], currentYearData: [] };
      else if (type == 'DAY') {
        finalData = { previousMonthData: [], currentMonthData: [] };
        const monthData = [
          ...new Set(loanData.map((item) => item.loan_disbursement_datemonth)),
        ].sort((a: any, b: any) => a - b);
        [previousMonthData, currentMonthData, ..._others] = monthData;
      }
      /// pre pare Data
      for (let i = 0; i < loanData.length; i++) {
        try {
          const loan = loanData[i];
          const loanYear = loan.loan_disbursement_dateyear;
          const loanMonth = loan.loan_disbursement_datemonth;
          let date = loanMonth + '-01-' + loanYear;
          const loanDisDate = new Date(date);
          let loanDay = loan.loan_disbursement_dateday;
          if (type != 'DAY') loanDay = 1;
          date =
            loanYear +
            (loanMonth < 10 ? '-0' + loanMonth : '-' + loanMonth) +
            (loanDay < 10 ? '-0' + loanDay : '-' + loanDay);

          const currDate = new Date();
          currDate.setFullYear(currDate.getFullYear() - 1);
          const key =
            type == 'DAY'
              ? previousMonthData == loanMonth
                ? 'previousMonthData'
                : 'currentMonthData'
              : currDate > loanDisDate
              ? 'previousYearData'
              : 'currentYearData';

          const loanCounts = +loan?.totalLoan ?? 0;
          const newUsersCount = loan?.completedLoan === 0 ? loanCounts : 0;
          const repeatedUsersCount = loan?.completedLoan > 0 ? loanCounts : 0;
          const year = loanDisDate.getFullYear();
          const month = loanDisDate
            .toLocaleDateString('default', { month: 'short' })
            .toUpperCase();

          const temp = {
            date,
            year,
            month,
            loanCounts,
            newUsersCount,
            repeatedUsersCount,
          };
          if (type == 'DAY') {
            delete temp.month;
            delete temp.year;
          }
          const index = finalData[key].findIndex((item) => item?.date === date);
          if (index != -1) {
            const find = finalData[key][index];
            temp.loanCounts += find.loanCounts;
            temp.newUsersCount += find.newUsersCount;
            temp.repeatedUsersCount += find.repeatedUsersCount;
            finalData[key][index] = temp;
          } else finalData[key].push(temp);
        } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
        try {
          if (type == 'MONTH') {
            finalData.currentYearData.sort((b: any, a: any) => {
              return new Date(a?.date).getTime() - new Date(b?.date).getTime();
            });
            finalData.previousYearData.sort((b: any, a: any) => {
              return new Date(a?.date).getTime() - new Date(b?.date).getTime();
            });
          }
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get row Data
  private async getRowDataAnalytics(type) {
    try {
      const fromMonth = new Date();
      const currentMonth = new Date();
      /// attributes
      let attributes: any = [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalLoan'],
      ];
      /// options
      let options;
      if (type == 'MONTH')
        options = this.getLoanAnalyticsMonthWiseQuery(fromMonth, attributes);
      else if (type == 'DAY')
        options = this.getLoanAnalyticsDayWiseQuery(fromMonth, attributes);
      if (options == k500Error) return kInternalError;
      /// where
      const where = {
        loan_disbursement_date: { [Op.gte]: fromMonth, [Op.lte]: currentMonth },
        loanStatus: { [Op.or]: ['Active', 'Complete'] },
      };

      const result = await this.loanRepository.getTableWhereData(
        options?.attributes,
        { where, group: options?.group },
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get query for day wise loan repayment analytics
  getLoanRepaymentAnalyticsDayWiseQuery(attributes) {
    try {
      attributes.push(
        this.typeService.manageDateAttr('year', '', 'completionDate'),
        this.typeService.manageDateAttr('month', '', 'completionDate'),
        this.typeService.manageDateAttr('day', '', 'completionDate'),
      );
      const group = [
        this.typeService.manageDateAttr('year', '', 'completionDate', false),
        this.typeService.manageDateAttr('month', '', 'completionDate', false),
        this.typeService.manageDateAttr('day', '', 'completionDate', false),
      ];
      return { attributes, group };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region get query for month wise loan repayment analytics
  getLoanRepaymentAnalyticsMonthWiseQuery(from, attributes) {
    try {
      from.setMonth(from.getMonth() - 23);
      from.setDate(1);
      attributes.push(
        this.typeService.manageDateAttr('year', '', 'completionDate'),
        this.typeService.manageDateAttr('month', '', 'completionDate'),
      );
      const group = [
        this.typeService.manageDateAttr('year', '', 'completionDate', false),
        this.typeService.manageDateAttr('month', '', 'completionDate', false),
      ];
      return { attributes, group };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region get loan repayment analytics
  async funGetLoanRepaymentAnalyticsTypeWise(query) {
    try {
      const type: 'MONTH' | 'DAY' = query?.type ?? 'MONTH';
      const loanData = await this.getLoanRepaymentRowData(type);
      if (loanData == k500Error) return kInternalError;
      let finalData;
      let currentDate: any = this.typeService.getGlobalDate(new Date());

      if (type == 'DAY') {
        currentDate.setDate(1);
        finalData = { currMonthData: [], lastMonthData: [] };
      } else if (type == 'MONTH') {
        currentDate.setMonth(currentDate.getMonth() - 11);
        currentDate.setDate(1);
        finalData = { currYearData: [], lastYearData: [] };
      }
      currentDate = this.typeService.getGlobalDate(currentDate.toString());
      loanData.forEach((curr) => {
        try {
          const currMonth =
            +curr.completionDatemonth < 10
              ? '0' + curr.completionDatemonth
              : curr.completionDatemonth;
          const currDay =
            type == 'DAY'
              ? +curr.completionDateday < 10
                ? '0' + curr.completionDateday
                : curr.completionDateday
              : '01';
          const currYear = curr.completionDateyear;
          let date: any = currMonth + '-' + currDay + '-' + currYear;
          let completionDate: any = this.typeService.getGlobalDate(date);
          const key =
            type == 'DAY'
              ? completionDate < currentDate
                ? 'lastMonthData'
                : 'currMonthData'
              : completionDate < currentDate
              ? 'lastYearData'
              : 'currYearData';
          completionDate = this.typeService.getGlobalDate(new Date(date));
          date = currYear + '-' + currMonth + '-' + currDay;
          const tempObj: any = {
            date,
            totalRepaymentAmount: curr?.totalRepayAmount,
            totalRepaymentCounts: +curr?.count ?? 0,
          };
          if (type == 'MONTH') {
            tempObj.year = completionDate.getFullYear();
            tempObj.month = kMonths[+currMonth - 1]
              .substring(0, 3)
              .toUpperCase();
          }
          const existingDate = finalData[key].findIndex((item) => {
            return item.date == date;
          });

          if (existingDate != -1) {
            const find = finalData[key][existingDate];
            tempObj.totalRepaymentAmount += find.totalRepaymentAmount;
            tempObj.totalRepaymentCounts += +curr?.count ?? 0;
            finalData[key][existingDate] = tempObj;
          } else finalData[key].push(tempObj);
        } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
      });
      try {
        const keys =
          type == 'MONTH'
            ? ['currYearData', 'lastYearData']
            : ['currMonthData', 'lastMonthData'];
        keys.forEach((key) => {
          finalData[key] = finalData[key].map((item) => {
            item.totalRepaymentCounts = +item.totalRepaymentCounts;
            item.totalRepaymentAmount = +item.totalRepaymentAmount.toFixed();
            return item;
          });
          if (type == 'MONTH')
            finalData[key].sort(
              (b: any, a: any) =>
                new Date(a?.date).getTime() - new Date(b?.date).getTime(),
            );
        });
      } catch (error) {}
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get rowData for loan repayment analytics
  private async getLoanRepaymentRowData(type) {
    try {
      const from = this.typeService.getGlobalDate(new Date());
      const to = this.typeService.getGlobalDate(new Date());
      const attributes = [
        [Sequelize.fn('count', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'totalRepayAmount'],
      ];

      let loanRepaymentAnalyticsQuery;
      if (type == 'DAY') {
        from.setMonth(from.getMonth() - 1);
        from.setDate(1);
        // get day wise loan repayment analytics query
        loanRepaymentAnalyticsQuery =
          this.getLoanRepaymentAnalyticsDayWiseQuery(attributes);
      } else if (type == 'MONTH') {
        // get month wise loan repayment
        loanRepaymentAnalyticsQuery =
          this.getLoanRepaymentAnalyticsMonthWiseQuery(from, attributes);
      }

      if (loanRepaymentAnalyticsQuery == k500Error) return kInternalError;
      const loanData = await this.transactionRepository.getTableWhereData(
        attributes,
        {
          where: {
            completionDate: {
              [Op.gte]: from.toJSON(),
              [Op.lte]: to.toJSON(),
            },
            status: 'COMPLETED',
            type: { [Op.ne]: 'REFUND' },
          },
          group: [...loanRepaymentAnalyticsQuery?.group],
        },
      );
      return loanData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // #start region send whatsapp message to user stuck

  async sendUserStuckWhatsappMsg(userData) {
    try {
      const dataLength = !gIsPROD ? UAT_PHONE_NUMBER.length : userData.length;
      const adminId = userData?.adminId ?? SYSTEM_ADMIN_ID;
      const maxLoanAmount = this.typeService.amountNumberWithCommas(
        GLOBAL_RANGES.MAX_LOAN_AMOUNT,
      );
      for (let i = 0; i < dataLength; i++) {
        try {
          const ele = userData[i];
          const userId = ele?.userId;
          const customerName = ele?.Name;
          const loanId = ele?.['Loan id'];
          const email = ele?.Email;
          const appType = ele?.appType;
          let number = ele?.['Mobile number'];
          if (!gIsPROD) number = UAT_PHONE_NUMBER[i];

          const whatsappOption: any = {
            userId,
            customerName,
            loanId,
            email,
            number,
            adminId,
            loanAmount: maxLoanAmount,
            title: 'User stuck',
            requestData: 'user_stuck',
            appType,
          };
          // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
          this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
