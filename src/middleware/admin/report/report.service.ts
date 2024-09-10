// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { literal, Op, Sequelize } from 'sequelize';
import {
  KYCOTHERDOC,
  KYCPAN,
  PAGE_LIMIT,
  GLOBAL_CHARGES,
  valueInsurance,
  kNotPlaceAutoDebit,
  HOST_URL,
  ptpCrmIds,
  cibilStateCode,
  legalString,
} from 'src/constants/globals';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import {
  kAutoDebit,
  kCashfree,
  kCompleted,
  kFailed,
  kFullPay,
  kGlobalTrail,
  kNoDataFound,
  kRazorpay,
  kInitiated,
  kPartPay,
  kRuppe,
  kEMIPay,
  kDownArrowURL,
  kUpArrowURL,
  kCryptography,
  kErrorMsgs,
  kDailyRegistrationReport,
} from 'src/constants/strings';
import { crmTitle } from 'src/entities/crmTitle.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { CrmRepository } from 'src/repositories/crm.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { MasterEntity } from 'src/entities/master.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { DateService } from 'src/utils/date.service';
import { CommonService } from 'src/utils/common.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { APIService } from 'src/utils/api.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { employmentDetails } from 'src/entities/employment.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { userLoanDecline } from 'src/entities/loan.decline.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { employmentSector } from 'src/entities/sector.entity';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentType } from 'src/entities/employment.type';
import { LocationEntity } from 'src/entities/location.entity';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { LegalConsigment } from 'src/entities/legal.consignment.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { ReportEmiService } from './emi/report.emi.service';
import * as moment from 'moment';
import { DefaulterService } from '../defaulter/defaulter.service';
import { ReferralStages, UserStage } from 'src/constants/objects';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { admin } from 'src/entities/admin.entity';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { MetricsEntity } from 'src/entities/metrics.entity';
import { DepartmentRepo } from 'src/repositories/department.respository';
import { VerificationCountFunModel } from './model/verification.model';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { YearOutstandingEntity } from 'src/entities/year.outstanding.entity';
import { CIBILScoreService } from 'src/admin/cibil_score/cibilScore.service';
import { CIBILTxtToObjectService } from 'src/admin/cibil_score/cibilTxtToObject.service';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { CollectionReportRepository } from 'src/repositories/collectionReport.repository';
import { EnvConfig } from 'src/configs/env.config';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { collectionDashboardService } from '../collectionDashboard/collectionDashboard.service';
import { StringService } from 'src/utils/string.service';
import { TallyService } from '../tally/tally.service';
import { CallingService } from '../calling/calling.service';
import * as fs from 'fs';
import { assetsClassification } from 'src/entities/assetsClassification.entity';
import { nObjectToExcel } from 'src/constants/network';
import { SlackService } from 'src/thirdParty/slack/slack.service';

@Injectable()
export class ReportService {
  constructor(
    private readonly apiService: APIService,
    private readonly cryptService: CryptService,
    private readonly fileService: FileService,
    private readonly typeService: TypeService,
    private readonly strService: StringService,
    private readonly cibilScoreService: CIBILScoreService,
    private readonly cibilTxtToObjService: CIBILTxtToObjectService,
    private readonly collectionService: collectionDashboardService,
    // Common
    private readonly commonSharedService: CommonSharedService,
    private readonly calculcation: CalculationSharedService,

    // Repositories
    private readonly crmRepo: CrmRepository,
    private readonly emiRepo: EMIRepository,
    private readonly loanRepo: LoanRepository,
    private readonly legalRepo: LegalCollectionRepository,
    private readonly masterRepo: MasterRepository,
    private readonly transRepo: TransactionRepository,
    private readonly userRepo: UserRepository,
    private readonly userDeleteRepo: UserDeleteRepository,
    private readonly referralRepo: ReferralRepository,
    private readonly referralTransRepo: ReferralTransactionRepository,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    private readonly repoManager: RepositoryManager,
    private readonly departmentRepo: DepartmentRepo,
    private readonly reqSupportRepo: RequestSupportRepository,
    private readonly cibilScoreRepo: CibilScoreRepository,
    private readonly collectionRepo: CollectionReportRepository,

    // Utils
    private readonly common: CommonService,
    private readonly dateService: DateService,
    @Inject(forwardRef(() => DefaulterService))
    private readonly service: DefaulterService,
    private readonly transactionRepo: TransactionRepository,
    private readonly adminRepo: AdminRepository,
    private readonly EMIRepository: EMIRepository,
    private readonly emiService: ReportEmiService,
    private readonly disburesementRepo: DisbursmentRepository,
    private readonly employmentRepo: EmploymentRepository,
    private readonly notificationService: SharedNotificationService,
    private readonly tallyService: TallyService,
    private readonly callingService: CallingService,
    private readonly slack: SlackService,
  ) {}

  async collectionCRMReport(query) {
    try {
      const crmOptions: any = await this.getCrmDataOptions(query);
      if (crmOptions?.message) return crmOptions;
      const crmData: any = await this.fetchCrmData(crmOptions);
      if (crmData?.message) return crmData;
      crmData.rows = await this.getTotalPaneltyDays(crmData.rows);
      if (crmData?.message) return crmData;
      const finalData: any = await this.prepareFinalData(crmData?.rows);
      if (finalData?.message) return finalData;
      return { count: crmData.count, finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async dailyReportToManagement(date) {
    try {
      let yDate = this.typeService.getGlobalDate(new Date());
      yDate.setDate(yDate.getDate() - 1);

      if (date) yDate = this.typeService.getGlobalDate(date);

      // Disbursed loan amount, count and data
      const disbursedData = await this.getDateWiseDisbursedData(yDate, yDate);
      if (disbursedData.message) return disbursedData;
      // repaid amount, count and data
      const transData: any = await this.getDateWiseRepayLoanData(yDate, yDate);
      if (transData.message) return transData;
      let repayData: any = await this.getRepayDataBifurcation(transData);
      if (repayData.message) return repayData;
      repayData.repayArr = this.typeService.objListToArr(repayData.repayArr);
      // Date Wise Comparison Loan and Repay amount & count
      const comparisonData: any = await this.getDateWiseComparisonLoanData(
        yDate,
      );
      if (comparisonData.message) return comparisonData;
      //Registered user count
      const userData: any = await this.getDateWiseRegisteredUserData(yDate);
      if (userData.message) return userData;
      const reportDate = yDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      // LCR data

      const lcrDataOptions = {
        startDate: yDate,
        endDate: yDate,
        dailyMail: true,
      };

      const lcrData: any = await this.tallyService.getLCRInfo(lcrDataOptions);
      if (lcrData?.message) return lcrData;
      const finalizedData = {
        reportDate,
        disbursedData,
        repayData,
        comparisonData,
        userData,
        lcrData,
      };
      let email = EnvConfig.mail.techSupportMail;
      if (!EnvConfig.isProd) email = EnvConfig.mail.adminMails?.split(',')[0];
      this.notificationService.sendEmailToUser(
        'DAILY_REPORT_TO_MANAGEMENT',
        email,
        null,
        finalizedData,
      );
      return finalizedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async dailyRegistrationReport(date) {
    if (EnvConfig.nbfc.nbfcType === '1') return {};
    let yDate = this.typeService.getGlobalDate(new Date());
    yDate.setDate(yDate.getDate() - 1);
    if (date) yDate = this.typeService.getGlobalDate(date);
    // Date Wise Comparison
    const comparisonData: any = await this.getComparisonDates(yDate);
    if (comparisonData.message) return comparisonData;
    //Registered user count
    const userData: any = await this.getRegisteredUsersFromDate(yDate);
    if (userData.message) return userData;
    const reportDate = yDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const finalizedData = {
      reportDate,
      userData,
      comparisonData,
    };
    let email = EnvConfig.mail.techSupportMail;
    if (!EnvConfig.isProd) email = EnvConfig.mail.adminMails?.split(',')[0];
    this.notificationService.sendEmailToUser(
      kDailyRegistrationReport,
      email,
      null,
      finalizedData,
    );
    return finalizedData;
  }

  private async getRegisteredUsersFromDate(startDate) {
    try {
      const {
        range,
        currentMonthStart,
        currentMonthEnd,
        lastMonthStart,
        lastMonthEnd,
      } = await this.getDateRangesFromStartDate(startDate);
      const lastMonthUser: any = await this.getUsersBasedOnAppPlatform(
        lastMonthStart,
        lastMonthEnd,
      );
      const currentMonthUser: any = await this.getUsersBasedOnAppPlatform(
        currentMonthStart,
        currentMonthEnd,
      );
      const todaysUser: any = await this.getUsersBasedOnAppPlatform(
        range.fromDate,
        range.endDate,
      );
      if (
        todaysUser.message ||
        lastMonthUser.message ||
        currentMonthUser.message
      )
        return kInternalError;

      const result = {};
      const dataArrays = [todaysUser, currentMonthUser, lastMonthUser];
      const tPeriods = ['todaysUser', 'currentMonthUser', 'lastMonthUser'];
      const fixedAppTypes = ['Lenditt', EnvConfig.nbfc.nbfcCodeNameS];

      const tempAppTypeCount = { android: 0, ios: 0 };
      for (const appType of fixedAppTypes) {
        if (!result[appType]) {
          result[appType] = {
            appType,
            todaysUser: { ...tempAppTypeCount },
            currentMonthUser: { ...tempAppTypeCount },
            lastMonthUser: { ...tempAppTypeCount },
          };
        }
      }

      const platforms = ['android', 'ios'];
      const rangeWiseTotal = ['todayTotal', 'currMonthTotal', 'lastMonthTotal'];
      for (let i = 0; i < dataArrays.length; i++) {
        const tPeriod = tPeriods[i];
        dataArrays[i].forEach((item) => {
          const appType =
            item.appType === 0 ? 'Lenditt' : EnvConfig.nbfc.nbfcCodeNameS;

          // Initialize total counts if they don't exist
          if (!result[appType][tPeriod][rangeWiseTotal[i]])
            result[appType][tPeriod][rangeWiseTotal[i]] = 0;

          //platform wise data
          platforms.forEach((el, j) => {
            result[appType][tPeriod][el] =
              j == 0
                ? Number(item.userCount.androidCounts)
                : Number(item.userCount.iOSCounts);

            result[appType][tPeriod][rangeWiseTotal[i]] +=
              result[appType][tPeriod][el];
          });
        });
      }
      const output = Object.values(result);
      return output;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDateRangesFromStartDate(startDate) {
    let lastMonthStart = this.typeService.getGlobalDate(
      new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1),
    );
    lastMonthStart.setDate(lastMonthStart.getDate());
    lastMonthStart.setHours(0, 0, 1, 0);

    let lastMonthEnd = this.typeService.getGlobalDate(
      new Date(
        startDate.getFullYear(),
        startDate.getMonth() - 1,
        startDate.getDate(),
      ),
    );
    lastMonthEnd.setDate(lastMonthEnd.getDate());
    lastMonthEnd.setHours(23, 59, 59);

    let currentMonthStart = this.typeService.getGlobalDate(
      new Date(startDate.getFullYear(), startDate.getMonth(), 1),
    );
    currentMonthStart.setDate(currentMonthStart.getDate());
    currentMonthStart.setHours(0, 0, 1, 0);
    let currentMonthEnd = startDate.setHours(23, 59, 59);

    const range = await this.typeService.getUTCDateRange(
      startDate.toString(),
      startDate.toString(),
    );

    return {
      range,
      currentMonthStart,
      currentMonthEnd,
      lastMonthStart,
      lastMonthEnd,
    };
  }

  private getComparisonDates(date) {
    const yDate = date.getDate();
    const FDlastMonth = new Date(date);
    FDlastMonth.setDate(15);
    FDlastMonth.setMonth(FDlastMonth.getMonth() - 1);
    FDlastMonth.setDate(1);
    const lstMonth = new Date(date);
    lstMonth.setDate(15);
    lstMonth.setMonth(lstMonth.getMonth() - 1);
    let LDlastMonth = this.typeService.getLastDateOfMonth(lstMonth);
    const lmDate = LDlastMonth.getDate();
    if (yDate <= lmDate) LDlastMonth.setDate(yDate);
    const FDcurrMonth = new Date(date);
    FDcurrMonth.setDate(1);
    const LDcurrMonth = new Date(date);

    //Comparison dates
    const compLastMonthDate = `${FDlastMonth.getDate()} - ${LDlastMonth.getDate()} ${FDlastMonth.toLocaleString(
      'default',
      { month: 'short' },
    )}`;
    const compCurrMonthDate = `${FDcurrMonth.getDate()} - ${LDcurrMonth.getDate()} ${FDcurrMonth.toLocaleString(
      'default',
      { month: 'short' },
    )}`;
    return {
      compLastMonthDate,
      compCurrMonthDate,
      FDcurrMonth,
      FDlastMonth,
      LDcurrMonth,
      LDlastMonth,
    };
  }

  private async getDateWiseComparisonLoanData(date) {
    try {
      const {
        compLastMonthDate,
        compCurrMonthDate,
        FDcurrMonth,
        FDlastMonth,
        LDcurrMonth,
        LDlastMonth,
      } = this.getComparisonDates(date);
      // last month loan and repay data
      let lastMonthLoanData: any = await this.getDateWiseDisbursedData(
        FDlastMonth,
        LDlastMonth,
      );
      if (lastMonthLoanData.message) return lastMonthLoanData;
      const lastTransList = await this.getDateWiseRepayLoanData(
        FDlastMonth,
        LDlastMonth,
      );
      if (lastTransList.message) return lastTransList;
      const lastMoRepayData: any = await this.newRepeatRepayData(lastTransList);
      if (lastMoRepayData.message) return lastMoRepayData;
      const lastMonthIncome: any = await this.getRepaidIncomeData(
        FDlastMonth,
        LDlastMonth,
      );
      if (lastMonthIncome?.message) return lastMonthIncome;
      lastMonthLoanData = {
        ...lastMonthLoanData,
        ...lastMoRepayData,
        ...lastMonthIncome,
      };
      // current month loan and repay data
      let currMonthLoanData: any = await this.getDateWiseDisbursedData(
        FDcurrMonth,
        LDcurrMonth,
      );
      if (currMonthLoanData.message) return currMonthLoanData;
      const currTransList = await this.getDateWiseRepayLoanData(
        FDcurrMonth,
        LDcurrMonth,
      );
      if (currTransList.message) return currTransList;
      let currMoRepayData: any = await this.newRepeatRepayData(currTransList);
      if (currMoRepayData.message) return currMoRepayData;
      const currMonthIncome: any = await this.getRepaidIncomeData(
        FDcurrMonth,
        LDcurrMonth,
      );
      if (currMonthIncome?.message) return currMonthIncome;
      currMonthLoanData = {
        ...currMonthLoanData,
        ...currMoRepayData,
        ...currMonthIncome,
      };
      //Up Down Arrow
      this.getUpDownArrow(currMonthLoanData, lastMonthLoanData);
      return {
        compLastMonthDate,
        compCurrMonthDate,
        lastMonthLoanData,
        currMonthLoanData,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  getUpDownArrow(currMonth, lastMonth) {
    try {
      currMonth.loanNew = this.arrowURL(currMonth?.newUser, lastMonth?.newUser);

      currMonth.loanRepeat = this.arrowURL(
        currMonth?.repeatUser,
        lastMonth?.repeatUser,
      );

      currMonth.loanTotal = this.arrowURL(
        currMonth?.totalDisbursedCount,
        lastMonth?.totalDisbursedCount,
      );

      currMonth.loanNewAmt = this.arrowURL(
        currMonth?.newUserAmount,
        lastMonth?.newUserAmount,
      );

      currMonth.loanRepeatAmt = this.arrowURL(
        currMonth?.repeatUserAmount,
        lastMonth?.repeatUserAmount,
      );

      currMonth.loanTotalAmt = this.arrowURL(
        currMonth?.totalDisbursedAmount,
        lastMonth?.totalDisbursedAmount,
      );

      currMonth.repayNew = this.arrowURL(
        currMonth?.newUserRepay,
        lastMonth?.newUserRepay,
      );

      currMonth.repayRepeat = this.arrowURL(
        currMonth?.repeatUserRepay,
        lastMonth?.repeatUserRepay,
      );

      currMonth.repayTotal = this.arrowURL(
        currMonth?.totalRepayAmount,
        lastMonth?.totalRepayAmount,
      );

      currMonth.processFees = this.arrowURL(
        currMonth?.totalProcessFees,
        lastMonth?.totalProcessFees,
      );

      currMonth.documentCharges = this.arrowURL(
        currMonth?.totalDocumentCharges,
        lastMonth?.totalDocumentCharges,
      );

      currMonth.convenienceCharges = this.arrowURL(
        currMonth?.totalConvenienceCharges,
        lastMonth?.totalConvenienceCharges,
      );

      currMonth.riskAssessmentFees = this.arrowURL(
        currMonth?.totalRiskAssessmentFees,
        lastMonth?.totalRiskAssessmentFees,
      );

      currMonth.totalFees = this.arrowURL(
        currMonth?.totalCharges,
        lastMonth?.totalCharges,
      );

      // Fees Income Arrow
      currMonth.newIncome = this.arrowURL(
        currMonth?.newIncomeAmt,
        lastMonth?.newIncomeAmt,
      );
      currMonth.repeatIncome = this.arrowURL(
        currMonth?.repeatIncomeAmt,
        lastMonth?.repeatIncomeAmt,
      );
      currMonth.totalIncome = this.arrowURL(
        currMonth?.totalIncomeAmt,
        lastMonth?.totalIncomeAmt,
      );
      currMonth.newIncomeC = this.arrowURL(
        currMonth?.newIncomeCount,
        lastMonth?.newIncomeCount,
      );
      currMonth.repeatIncomeC = this.arrowURL(
        currMonth?.repeatIncomeCount,
        lastMonth?.repeatIncomeCount,
      );
      currMonth.totalIncomeC = this.arrowURL(
        currMonth?.totalIncomeCount,
        lastMonth?.totalIncomeCount,
      );
    } catch (error) {}
  }

  arrowURL(amt1, amt2) {
    return amt1 > amt2 ? kUpArrowURL : kDownArrowURL;
  }

  private async getRepaidIncomeData(startDate, endDate) {
    try {
      const loanInc = {
        model: loanTransaction,
        attributes: ['id', 'netApprovedAmount', 'feesIncome', 'completedLoan'],
      };
      const opts = {
        where: {
          completionDate: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
          status: 'COMPLETED',
        },
        include: [loanInc],
      };
      const attr = [
        'id',
        'loanId',
        'status',
        'feesIncome',
        'type',
        'paidAmount',
        'principalAmount',
        'transactionId',
      ];
      const transData = await this.transactionRepo.getTableWhereData(
        attr,
        opts,
      );
      if (transData === k500Error) return kInternalError;
      const refundData = transData.filter((el) => el?.type == 'REFUND');
      const length = transData?.length;
      let newIncomeCount = 0;
      let repeatIncomeCount = 0;
      let newIncomeAmt = 0;
      let repeatIncomeAmt = 0;
      const refundTraId = [];
      for (let index = 0; index < length; index++) {
        try {
          const traData = transData[index];
          const loan = traData?.loanData ?? [];
          if (traData.type == 'REFUND') continue;
          const refund = refundData.find(
            (f) =>
              f.loanId == traData.loanId &&
              !refundTraId.includes(f?.transactionId),
          );
          if (refund) {
            if (
              Math.abs(traData.paidAmount + refund?.paidAmount) < 10 &&
              traData.type !== 'REFUND' &&
              !refundTraId.includes(refund?.transactionId)
            ) {
              refundTraId.push(refund?.transactionId);
              continue;
            }
          }
          const paidPrincipal = traData?.principalAmount ?? 0;
          let income = traData?.feesIncome ?? 0;
          if (!income && paidPrincipal) {
            const tPrincipal = +loan?.netApprovedAmount ?? 0;
            const feesIncome = loan?.feesIncome ?? 0;
            if (tPrincipal > 0 && feesIncome > 0) {
              const chargePr = (feesIncome * 100) / tPrincipal ?? 0;
              income = (paidPrincipal * chargePr) / 100 ?? 0;
            } else income = 0;
          }
          const newloan = loan?.completedLoan;
          if (newloan == 0) {
            newIncomeCount++;
            newIncomeAmt += income;
          } else {
            repeatIncomeCount++;
            repeatIncomeAmt += income;
          }
        } catch (error) {}
      }
      newIncomeAmt = Math.round(newIncomeAmt);
      repeatIncomeAmt = Math.round(repeatIncomeAmt);
      return {
        newIncomeCount,
        newIncomeAmt,
        repeatIncomeCount,
        repeatIncomeAmt,
        totalIncomeCount: newIncomeCount + repeatIncomeCount,
        totalIncomeAmt: newIncomeAmt + repeatIncomeAmt,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async newRepeatRepayData(tranData) {
    try {
      let newUserRepay = 0;
      let repeatUserRepay = 0;
      tranData.forEach((ele) => {
        try {
          const completedLoans = ele?.completedLoan;
          const paidAmount = Math.round(+ele?.totalPaidAmount);
          if (completedLoans == 0) newUserRepay += paidAmount;
          else repeatUserRepay += paidAmount;
        } catch (error) {}
      });
      return {
        totalRepayAmount: newUserRepay + repeatUserRepay,
        newUserRepay,
        repeatUserRepay,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDateWiseDisbursedData(startDate, endDate) {
    try {
      const groupAttr = ['loan."interestRate"'];
      let otherWhere = ` and loan."completedLoan" = 0`;
      const newLoans = await this.getLoanData(
        startDate,
        endDate,
        groupAttr,
        otherWhere,
      );
      otherWhere = ' and loan."completedLoan" > 0';
      const repeatedLoans = await this.getLoanData(
        startDate,
        endDate,
        groupAttr,
        otherWhere,
      );
      if (repeatedLoans.message || newLoans.message) return kInternalError;
      const newUser: any = this.calcnewRepreated(newLoans);
      const repeatedUser: any = this.calcnewRepreated(repeatedLoans);
      const disbArr: any = await this.getIntWiseDisbursedData(
        startDate,
        endDate,
      );
      if (disbArr?.message) return disbArr;

      const totalProcessFees = Math.round(
        newUser.totalProcessFees + repeatedUser.totalProcessFees,
      );
      const totalDocumentCharges = Math.round(
        newUser.totalDocCharges + repeatedUser.totalDocCharges,
      );
      const totalConvenienceCharges = Math.round(
        newUser.totalConvCharges + repeatedUser.totalConvCharges,
      );

      const disbursedData = {
        totalDisbursedCount: newUser.totalDis + repeatedUser.totalDis,
        totalDisbursedAmount: Math.round(
          newUser.totalAmount + repeatedUser.totalAmount,
        ),
        totalAmount: Math.round(newUser.totalAmount + repeatedUser.totalAmount),
        totalApprovedAmount: Math.round(
          newUser.approvedAmount + repeatedUser.approvedAmount,
        ),
        newUser: newUser.totalDis,
        newUserAmount: Math.round(newUser.totalAmount),
        newUserApprovedAmount: Math.round(newUser.approvedAmount),
        repeatUser: repeatedUser.totalDis,
        repeatUserAmount: Math.round(repeatedUser.totalAmount),
        repeatUserApprovedAmount: Math.round(repeatedUser.approvedAmount),
        totalProcessFees,
        totalDocumentCharges,
        totalConvenienceCharges,
        totalCharges: Math.round(
          totalProcessFees + totalDocumentCharges + totalConvenienceCharges,
        ),
        disbArr,
      };

      return disbursedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getIntWiseDisbursedData(startDate, endDate) {
    try {
      const groupAttr = ['loan."interestRate"', 'loan."completedLoan"'];
      const loanData = await this.getLoanData(startDate, endDate, groupAttr);
      if (loanData.message) return loanData;
      const finalObj = {};
      loanData.forEach((loan) => {
        try {
          const totalDisAmount = Math.round(+loan?.totalDisamount / 100);
          const totalApprovedAmount = Math.round(loan?.approvedAmount);
          const count = +loan.count;
          const totalFees = Math.round(+loan.totalFees);
          const totalDocCharge = Math.round(+loan.totalDocCharge);
          const totalConvFees = Math.round(+loan.totalConvFees);
          if (finalObj[loan.interestRate]) {
            finalObj[loan.interestRate].amount += totalDisAmount;
            finalObj[loan.interestRate].approvedAmount += totalApprovedAmount;
            finalObj[loan.interestRate].count += count;
            finalObj[loan.interestRate].processFees += totalFees;
            finalObj[loan.interestRate].documentCharges += totalDocCharge;
            finalObj[loan.interestRate].convenienceCharges += totalConvFees;
            if (loan.completedLoan == 0) {
              finalObj[loan.interestRate].newUser += count;
              finalObj[loan.interestRate].newUserAmount += totalDisAmount;
              finalObj[loan.interestRate].newUserApprovedAmount +=
                totalApprovedAmount;
            } else {
              finalObj[loan.interestRate].repeatUser += +loan.count;
              finalObj[loan.interestRate].repeatUserAmount += totalDisAmount;
              finalObj[loan.interestRate].repeatUserApprovedAmount +=
                totalApprovedAmount;
            }
          } else {
            finalObj[loan.interestRate] = {
              count: +loan?.count,
              amount: totalDisAmount,
              approvedAmount: totalApprovedAmount,
              processFees: totalFees,
              documentCharges: totalDocCharge,
              convenienceCharges: totalConvFees,
              newUser: 0,
              newUserAmount: 0,
              newUserApprovedAmount: 0,
              repeatUser: 0,
              repeatUserAmount: 0,
              repeatUserApprovedAmount: 0,
            };
            if (loan.completedLoan == 0) {
              finalObj[loan.interestRate].newUser = +loan.count;
              finalObj[loan.interestRate].newUserAmount = totalDisAmount;
              finalObj[loan.interestRate].newUserApprovedAmount =
                totalApprovedAmount;
            } else {
              finalObj[loan.interestRate].repeatUser = +loan.count;
              finalObj[loan.interestRate].repeatUserAmount = totalDisAmount;
              finalObj[loan.interestRate].repeatUserApprovedAmount =
                totalApprovedAmount;
            }
          }
        } catch (error) {}
      });
      return this.typeService.objListToArr(finalObj);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getRepayDataBifurcation(transList) {
    try {
      let autoPayNewCount = 0;
      let autoPayNewAmount = 0;
      let manualPayNewCount = 0;
      let manualPayNewAmount = 0;
      let autoPayRepeatCount = 0;
      let autoPayRepeatAmount = 0;
      let manualPayRepeatCount = 0;
      let manualPayRepeatAmount = 0;
      let totalPrincipalRecovered = 0;
      let totalInterestRecovered = 0;
      let totalPenaltyRecovered = 0;
      let finalObj = {};
      transList.forEach((transData) => {
        try {
          const amount = Math.round(+transData?.totalPaidAmount);
          let repaymentCount = +transData.totalRepaymentCount;
          const principal = Math.round(+transData?.principalAmount ?? 0);
          const interest = Math.round(+transData?.totalInterestAmount ?? 0);
          const penalty = Math.round(+transData?.totalPenaltyAmount ?? 0);
          const key = transData.interestRate;
          const completedLoan = transData.completedLoan;
          const subSource = transData?.subSource;
          totalPrincipalRecovered += principal;
          totalInterestRecovered += interest;
          totalPenaltyRecovered += penalty;

          if (subSource == 'AUTODEBIT') {
            if (completedLoan == 0) {
              autoPayNewCount += repaymentCount;
              autoPayNewAmount += amount;
            } else {
              autoPayRepeatCount += repaymentCount;
              autoPayRepeatAmount += amount;
            }
          } else {
            if (completedLoan == 0) {
              manualPayNewCount += repaymentCount;
              manualPayNewAmount += amount;
            } else {
              manualPayRepeatCount += repaymentCount;
              manualPayRepeatAmount += amount;
            }
          }
          if (finalObj[key]) {
            finalObj[key].amount += amount;
            finalObj[key].principal += principal;
            finalObj[key].interest += interest;
            finalObj[key].penalty += penalty;
            if (completedLoan == 0) finalObj[key].newUserAmount += amount;
            else finalObj[key].repeatUserAmount += amount;
          } else {
            finalObj[key] = {
              amount: amount,
              principal: principal,
              interest: interest,
              penalty: penalty,
              newUserAmount: 0,
              repeatUserAmount: 0,
            };
            if (completedLoan == 0) finalObj[key].newUserAmount = amount;
            else finalObj[key].repeatUserAmount = amount;
          }
        } catch (error) {}
      });
      const totalNewPayCount = autoPayNewCount + manualPayNewCount;
      const totalNewPayAmount = autoPayNewAmount + manualPayNewAmount;
      const totalRepeatPayCount = autoPayRepeatCount + manualPayRepeatCount;
      const totalRepeatPayAmount = autoPayRepeatAmount + manualPayRepeatAmount;
      return {
        totalPaidCount: totalNewPayCount + totalRepeatPayCount,
        totalPaidAmount: totalNewPayAmount + totalRepeatPayAmount,
        totalNewPayCount,
        totalNewPayAmount,
        totalRepeatPayCount,
        totalRepeatPayAmount,
        autoPayNewCount,
        autoPayNewAmount,
        manualPayNewCount,
        manualPayNewAmount,
        autoPayRepeatCount,
        autoPayRepeatAmount,
        manualPayRepeatCount,
        manualPayRepeatAmount,
        totalPrincipalRecovered,
        totalInterestRecovered,
        totalPenaltyRecovered,
        repayArr: this.typeService.sortObjectKeys(finalObj),
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getLoanData(
    startDate,
    endDate,
    groupAttr: any = [],
    otherWhere = '',
  ) {
    try {
      let attrString = '';
      if (groupAttr.length > 0) {
        attrString = this.tranfeAttr(groupAttr);
        groupAttr = 'group by ' + attrString;
      } else groupAttr = '';
      const dynamicQuery = `SELECT  count(loan."completedLoan"),sum(dis.amount) as "totalDisamount",
                     sum(CAST(loan."netApprovedAmount" as double precision)) as "approvedAmount",
                     sum(loan."stampFees") as "totalStempFees",sum(loan."loanFees")as "totalFees",
                     sum(CAST(loan."charges"->>'doc_charge_amt' as double precision))as "totalDocCharge", 
                     sum(CAST(loan."charges"->>'insurance_fee' as double precision))as "totalConvFees", 
                     sum(CAST(loan."charges"->>'gst_amt' as double precision))as "totalGST", 
                     sum(CAST(loan."charges"->>'risk_assessment_charge' as double precision))as "totalRiskCharge", 
                     ${attrString}
                     FROM public."loanTransactions" as loan
                     inner join public."disbursementEntities" as dis
                     on  loan.loan_disbursement_id = dis.id
                     where loan."loan_disbursement_date" >= '${startDate.toJSON()}'
                     and loan."loan_disbursement_date" <= '${endDate.toJSON()}'
                     and (loan."loanStatus" = 'Complete' or loan."loanStatus" = 'Active' )
                    ${otherWhere}
                    ${groupAttr}`;
      const data = await this.loanRepo.injectRawQuery(dynamicQuery);
      if (data == k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private tranfeAttr(attr) {
    try {
      return attr.join(',');
    } catch (error) {
      return '';
    }
  }
  private async getDateWiseRegisteredUserData(startDate) {
    try {
      const {
        range,
        currentMonthStart,
        currentMonthEnd,
        lastMonthStart,
        lastMonthEnd,
      } = await this.getDateRangesFromStartDate(startDate);

      const lastMonthUser: any = await this.getUserCountByAppType(
        lastMonthStart,
        lastMonthEnd,
      );
      const currentMonthUser: any = await this.getUserCountByAppType(
        currentMonthStart,
        currentMonthEnd,
      );
      const todaysUser: any = await this.getUserCountByAppType(
        range.fromDate,
        range.endDate,
      );

      if (
        todaysUser.message ||
        lastMonthUser.message ||
        currentMonthUser.message
      )
        return kInternalError;

      const result = {};
      const dataArrays = [todaysUser, currentMonthUser, lastMonthUser];
      const tPeriods = ['todaysUser', 'currentMonthUser', 'lastMonthUser'];
      const fixedAppTypes = ['Lenditt'];
      if (EnvConfig.nbfc.nbfcType == '0')
        fixedAppTypes.push(EnvConfig.nbfc.nbfcCodeNameS);

      for (const appType of fixedAppTypes) {
        if (!result[appType]) {
          result[appType] = {
            appType,
            todaysUser: 0,
            currentMonthUser: 0,
            lastMonthUser: 0,
          };
        }
      }

      for (let i = 0; i < dataArrays.length; i++) {
        const tPeriod = tPeriods[i];
        dataArrays[i].forEach((item) => {
          const appType =
            item.appType === 0 ? 'Lenditt' : EnvConfig.nbfc.nbfcCodeNameS;

          if (!result[appType]) result[appType] = {};

          result[appType][tPeriod] = Number(item.userCount);
        });
      }

      const output = Object.values(result);
      return output;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getUserCountByAppType(startDate, endDate) {
    return await this.userRepo.getTableWhereData(
      ['appType', [Sequelize.fn('COUNT', Sequelize.col('id')), 'userCount']],
      {
        where: { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } },
        group: ['appType'],
      },
    );
  }

  private async getUsersBasedOnAppPlatform(startDate, endDate) {
    const result = [];
    const countResult = await this.getOtherNbfcUserCount(startDate, endDate);
    if (countResult === k500Error) return kInternalError;
    const lspObj = {
      appType: 0,
      userCount: {
        androidCounts: countResult.lspAndroidCounts.toString(),
        iOSCounts: countResult.lspIOSCounts.toString(),
      },
    };
    result.push(lspObj);
    const nbfcObj = {
      appType: 1,
      userCount: {
        androidCounts: countResult.nbfcAndroidCounts.toString(),
        iOSCounts: countResult.nbfcIOSCounts.toString(),
      },
    };
    result.push(nbfcObj);
    return result;
  }

  private async getOtherNbfcUserCount(startDate, endDate) {
    const finalDeductedCounts: any = { lspAndroidCounts: 0, lspIOSCounts: 0 };
    const userAttr = ['id', 'hashPhone', 'typeOfDevice'];
    // LSP DATA DEDUCT
    const lspUserData = await this.getUserDataOnAppType(
      '0',
      userAttr,
      startDate,
      endDate,
    );
    if (lspUserData === k500Error) return k500Error;
    const lspFinalCount = await this.groupUsersByPlatform(lspUserData);
    finalDeductedCounts.lspAndroidCounts = lspFinalCount.androidCounts;
    finalDeductedCounts.lspIOSCounts = lspFinalCount.iOSCounts;

    // NBFC DATA DEDUCT
    const nbfcUserData = await this.getUserDataOnAppType(
      '1',
      userAttr,
      startDate,
      endDate,
    );
    if (nbfcUserData === k500Error) return k500Error;
    const nbfcFinalCount = await this.groupUsersByPlatform(nbfcUserData);
    finalDeductedCounts.nbfcAndroidCounts = nbfcFinalCount.androidCounts;
    finalDeductedCounts.nbfcIOSCounts = nbfcFinalCount.iOSCounts;
    return finalDeductedCounts;
  }

  private async getUserDataOnAppType(appType, userAtt, startDate, endDate) {
    const userOptions = {
      where: {
        createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
        appType: appType,
      },
    };
    const primaryUserData = await this.userRepo.getTableWhereData(
      userAtt,
      userOptions,
    );
    if (primaryUserData == k500Error) return k500Error;
    let finalData = [...primaryUserData];
    if (appType == '0') {
      // Get other nbfc userdata
      let otherNbfcData = null;
      const jsonStartDate = new Date(startDate).toJSON();
      const jsonEndDate = new Date(endDate).toJSON();
      const nbfcParams = {
        startDate: jsonStartDate,
        endDate: jsonEndDate,
      };
      const nbfcUrl = EnvConfig.otherNBFCUrl.otherNbfcBaseUrl;
      for (let i = 0; i < nbfcUrl.length; i++) {
        const element = nbfcUrl[i];
        if (!element || element == undefined) continue;
        let URL = element + '/admin/report/getUserCountsForLsp';
        otherNbfcData = await this.apiService.get(URL, nbfcParams);
        if (otherNbfcData?.message != 'SUCCESS') continue;
      }
      finalData = [...finalData, ...otherNbfcData.data];
      // Get lsp userData
      let lspUserData = null;
      const lspParams = {
        startDate: jsonStartDate,
        endDate: jsonEndDate,
      };
      const lspUrl = EnvConfig.lsp.baseUrl;
      if (!lspUrl || lspUrl == undefined) return k500Error;
      let URL = lspUrl + '/v4/user/getUserCountsForLsp';
      lspUserData = await this.apiService.get(URL, lspParams);
      if (lspUserData?.message != 'SUCCESS') return k500Error;
      // if (!Array.isArray(lspUserData)) return k500Error;
      finalData = [...finalData, ...lspUserData.data];
      // Now remove duplicate basedon hashPhone
      finalData = [
        ...new Map(finalData.map((item) => [item.hashPhone, item])).values(),
      ];
    }
    return finalData;
  }

  async getUserCountsForLsp(query) {
    // We need Other nbfc user and Lsp unassigned user
    const startDate = query?.startDate;
    const endDate = query?.endDate;
    //params changes with spacefic error return
    if (!startDate) return kParamMissing('startDate');
    if (!endDate) return kParamMissing('endDate');
    // Get other nbfc user
    const userAttr = ['id', 'hashPhone', 'typeOfDevice'];
    const userOptions = {
      where: {
        createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
        appType: '0',
      },
    };
    const otherUserData = await this.userRepo.getTableWhereData(
      userAttr,
      userOptions,
    );
    if (otherUserData == k500Error) return kInternalError;
    return otherUserData;
  }

  private async groupUsersByPlatform(userData) {
    //   // Get Original Counts
    const platformCounts = userData.reduce(function (r, a) {
      const key = a.typeOfDevice == '2' ? '1' : a.typeOfDevice;
      r[key] = r[key] || [];
      r[key].push(a);
      return r;
    }, Object.create(null));
    const androidUsers = platformCounts['0'] || [];
    const iosUsers = platformCounts['1'] || [];
    return {
      androidCounts: androidUsers.length,
      iOSCounts: iosUsers.length,
    };
  }

  private calcnewRepreated(loan) {
    try {
      const finalData = {
        totalDis: 0,
        totalAmount: 0,
        totalProcessFees: 0,
        totalDocCharges: 0,
        totalConvCharges: 0,
        totalRiskCharges: 0,
        approvedAmount: 0,
      };
      loan.forEach((ele) => {
        finalData.totalDis += +ele.count;
        Math.round((finalData.totalAmount += +ele.totalDisamount / 100));
        Math.round((finalData.approvedAmount += +ele.approvedAmount));
        Math.round((finalData.totalDocCharges += +ele.totalDocCharge));
        Math.round((finalData.totalConvCharges += +ele.totalConvFees));
        Math.round((finalData.totalRiskCharges += +ele.totalRiskCharge));
        const processFees =
          Math.round(+ele?.totalFees ?? 0) -
          Math.round(+ele?.totalDocCharge ?? 0) -
          Math.round(+ele?.totalConvFees ?? 0) -
          Math.round(+ele?.totalGST ?? 0) -
          Math.round(+ele?.totalRiskCharge ?? 0);
        finalData.totalProcessFees += processFees;
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDateWiseRepayLoanData(startDate, endDate) {
    try {
      const loanData = await this.getNewRepaymentData(startDate, endDate);
      if (loanData.message) return loanData;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmDataOptions(query) {
    try {
      const adminId = +query?.adminId;
      const startDate = query?.start_date ?? new Date();
      const endDate = query?.end_date ?? new Date();
      let searchText = query?.searchText;
      const download = query?.download ?? false;
      const page = query?.page ?? 1;

      const userInclude: any = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email', 'phone'],
      };
      const loanInclude: any = {
        model: loanTransaction,
        attributes: ['id', 'userId', 'loanStatus'],
        where: { loanStatus: 'Active' },
        include: [userInclude],
      };
      const crmTitleInclude: any = {
        model: crmTitle,
        attributes: ['id', 'title'],
      };
      const options: any = {
        where: {
          adminId,
          crmOrder: ['0', '1'],
        },
        order: [['id', 'DESC']],
        include: [loanInclude, crmTitleInclude],
      };
      if (startDate && endDate) {
        const range = this.typeService.getUTCDateRange(startDate, endDate);
        const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
        options.where.createdAt = dateRange;
      }

      //Implemented search filter
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') loanInclude.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = await this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userInclude.where = { phone: { [Op.iRegexp]: searchText } };
          } else userInclude.where = { fullName: { [Op.iRegexp]: searchText } };
        }
      }

      //For pagination
      if (download != 'true') {
        options.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async fetchCrmData(crmOptions) {
    try {
      const attributes = [
        'id',
        'adminId',
        'remark',
        'due_date',
        'createdAt',
        'relationData',
        'loanId',
      ];
      const crmData: any = await this.crmRepo.getTableWhereCountData(
        attributes,
        crmOptions,
      );
      if (crmData === k500Error) return kInternalError;
      return crmData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getTotalPaneltyDays(crmData) {
    try {
      const loanIds = crmData.map((ele) => ele.loanId);
      const attributes: any = [
        'loanId',
        [Sequelize.fn('SUM', Sequelize.col('penalty_days')), 'totalDueDays'],
      ];
      const options = {
        where: { loanId: loanIds, payment_due_status: '1' },
        group: 'loanId',
      };
      let emiData = await this.emiRepo.getTableWhereData(attributes, options);
      emiData = emiData == k500Error ? [] : emiData;
      crmData.map((ele) => {
        const penaltyDays = emiData.find((loan) => loan.loanId == ele.loanId);
        return (ele.totalDueDays = +penaltyDays?.totalDueDays ?? 0);
      });
      return crmData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region preparing final data for required response
  private async prepareFinalData(crmData) {
    try {
      const finalData: any = [];
      for (let index = 0; index < crmData.length; index++) {
        const crm = crmData[index];
        try {
          const userData = crm?.loanData?.registeredUsers;
          const lastActiondays = this.typeService.differenceInDays(
            crm?.createdAt,
            new Date(),
          );
          const tempData = {};
          tempData['Loan id'] = crm?.loanId ?? '-';
          tempData['User name'] = userData?.fullName ?? '-';
          tempData['Phone number'] =
            this.cryptService.decryptPhone(userData.phone) ?? '-';
          tempData['Email'] = userData?.email ?? '-';
          tempData['Penalty days'] = crm?.totalDueDays ?? 0;
          tempData['CRM title'] =
            crm?.titleData?.title ??
            crm?.relationData?.titleName ??
            crm.relationData?.dispositionName ??
            '-';
          tempData['Remark'] = crm?.remark ?? '-';
          tempData['Last action by'] =
            (await this.commonSharedService.getAdminData(crm.adminId))
              .fullName ??
            '-' ??
            crm?.loanData?.adminId ??
            '-';
          tempData['userId'] = crm?.loanData?.userId ?? '-';
          tempData['Last action days'] = lastActiondays ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async loanClosedWPrincipalRemaining() {
    try {
      const transInclude: any = { model: TransactionEntity };
      transInclude.attributes = ['principalAmount', 'type'];
      transInclude.where = { status: kCompleted };
      const include = [transInclude];
      const attributes = ['id', 'netApprovedAmount'];
      const options = {
        include,
        order: [['id']],
        where: { loanStatus: 'Complete' },
      };

      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return loanList;

      const loanIds = [];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const transList = loanData.transactionData ?? [];
          let paidPrincipalAmount = 0;
          const expectedPrincipal = +(loanData.netApprovedAmount ?? '0');

          let isRefunded = false;
          transList.forEach((el) => {
            try {
              let paidPrincipal = el.principalAmount ?? 0;
              if (paidPrincipal < 0) paidPrincipal = 0;
              paidPrincipalAmount += paidPrincipal;
              if (el.type == 'REFUND') isRefunded = true;
            } catch (error) {}
          });

          const difference = expectedPrincipal - paidPrincipalAmount;
          if (difference > 10 && !isRefunded)
            loanIds.push({ loanId: loanData.id });
        } catch (error) {}
      }

      const excelData: any = {
        sheets: ['Principal remaining'],
        data: [loanIds],
        sheetName: 'Principal remaining.xlsx',
      };
      await this.typeService._objectToExcel(excelData);

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async legalPaymentInsights() {
    try {
      await this.getExcelData();
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getLegalPaymentInsightsByLoanId(preparedData: {
    loanId;
    caseFileDate;
    summonsIssueDate;
    summonsReIssueDate;
    warrantIssueDate;
  }) {
    try {
      const loanId = preparedData.loanId;

      const transInclude: any = { model: TransactionEntity };
      transInclude.attributes = ['completionDate', 'paidAmount'];
      transInclude.where = { status: 'COMPLETED' };
      transInclude.required = false;
      const include = [transInclude];
      const attributes = ['id'];
      const options = { include, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      const transactionList = loanData.transactionData ?? [];
      const caseFileDate = new Date(preparedData.caseFileDate ?? '-');
      const caseFileTime = caseFileDate.getTime();
      const summonsFileDate = new Date(preparedData.summonsIssueDate ?? '-');
      const summonsFileTime = summonsFileDate.getTime();
      const reIssueSummonsFileDate = new Date(
        preparedData.summonsReIssueDate ?? '-',
      );
      const reIssueSummonsFileTime = reIssueSummonsFileDate.getTime();
      const warrentFileDate = new Date(preparedData.warrantIssueDate ?? '-');
      const warrentFileTime = warrentFileDate.getTime();

      let paymentBeforeCaseFile = 0;
      let paymentBeforeSummons = 0;
      let paymentAfterSummons = 0;
      let paymentAfterReIssuedSummons = 0;
      let paymentAfterWarrent = 0;
      for (let index = 0; index < transactionList.length; index++) {
        const transData = transactionList[index];
        const transDate = new Date(transData.completionDate);
        const transTime = transDate.getTime();
        const paidAmount = transData.paidAmount;

        // Payment before case file
        if (transTime <= caseFileTime) {
          paymentBeforeCaseFile += paidAmount;
        }
        // Payment after case file
        else if (transTime > caseFileTime) {
          // Payment before reIssue summons
          if (
            isNaN(reIssueSummonsFileTime) ||
            transTime < reIssueSummonsFileTime
          ) {
            // Payment before summons
            if (transTime < summonsFileTime || isNaN(summonsFileTime))
              paymentBeforeSummons += paidAmount;
            // Payment after summons
            if (
              transTime >= summonsFileTime &&
              (isNaN(warrentFileTime) || transTime < warrentFileTime)
            )
              paymentAfterSummons += paidAmount;
          }
          // Payment after reIssue summons
          else if (
            transTime >= reIssueSummonsFileTime &&
            (isNaN(warrentFileTime) || transTime < warrentFileTime)
          ) {
            paymentAfterReIssuedSummons += paidAmount;
          }
          // Payment after warrent
          if (transTime >= warrentFileTime) paymentAfterWarrent += paidAmount;
        }
      }

      paymentBeforeCaseFile = parseFloat(paymentBeforeCaseFile.toFixed(2));
      paymentBeforeSummons = parseFloat(paymentBeforeSummons.toFixed(2));
      paymentAfterSummons = parseFloat(paymentAfterSummons.toFixed(2));
      paymentAfterReIssuedSummons = parseFloat(
        paymentAfterReIssuedSummons.toFixed(2),
      );
      paymentAfterWarrent = parseFloat(paymentAfterWarrent.toFixed(2));
      return {
        loanId,
        paymentBeforeCaseFile,
        paymentBeforeSummons,
        paymentAfterSummons,
        paymentAfterReIssuedSummons,
        paymentAfterWarrent,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getExcelData() {
    try {
      const excelPath = 'Legal Quality (1).xlsx';

      const workbook = new Workbook();
      const workSheet = await workbook.xlsx.readFile(excelPath);

      const preparedList = [];
      await workSheet.eachSheet(async (sheet, _) => {
        await sheet.eachRow(async (row, i) => {
          try {
            if (i === 1) return;

            const loanId = row.getCell('B').value ?? '-';
            let caseFileDate = (row.getCell('E').value ?? '-').toString();
            caseFileDate = caseFileDate.replace(/\//g, '-');
            caseFileDate = this.typeService
              .getGlobalDate(new Date(caseFileDate))
              .toJSON();
            let summonsIssueDate = (row.getCell('F').value ?? '-').toString();
            summonsIssueDate = summonsIssueDate.replace(/\//g, '-');
            summonsIssueDate = this.typeService
              .getGlobalDate(new Date(summonsIssueDate))
              .toJSON();
            let summonsReIssueDate = (row.getCell('G').value ?? '-').toString();
            summonsReIssueDate = summonsReIssueDate.replace(/\//g, '-');
            summonsReIssueDate = this.typeService
              .getGlobalDate(new Date(summonsReIssueDate))
              .toJSON();
            let warrantIssueDate = (row.getCell('H').value ?? '-').toString();
            warrantIssueDate = warrantIssueDate.replace(/\//g, '-');
            warrantIssueDate = this.typeService
              .getGlobalDate(new Date(warrantIssueDate))
              .toJSON();
            const preparedData = {
              loanId,
              caseFileDate,
              summonsIssueDate,
              summonsReIssueDate,
              warrantIssueDate,
            };
            preparedList.push(preparedData);
          } catch (error) {}
        });
      });

      const finalizedList = [];
      for (let index = 0; index < preparedList.length; index++) {
        const preparedData = preparedList[index];
        const data = await this.getLegalPaymentInsightsByLoanId(preparedData);
        finalizedList.push(data);
      }

      const rawExcelData = {
        sheets: ['Legal quality report'],
        data: [finalizedList],
        sheetName: 'legal_quality.xlsx',
      };
      await this.fileService.objectToExcel(rawExcelData);
    } catch (error) {}
  }

  async getDueDatePerfomanceReport(query) {
    try {
      const download = query?.download ?? 'false';
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      let counts = 0;
      let limitquery = '';
      if (download != 'true') {
        const page = +(query?.page || 1);
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;

        const countQuery = `SELECT count(emi_date) FROM "EmiEntities" AS e where TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') >= '${fromDate}' AND TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') <= '${toDate}' GROUP BY TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS')`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData.length;
      }

      const dynamicQuery = `SELECT t2.emi_date as "EMI Date", SUM(t2.emi_amount) as "Total EMI Amount", count(t2.id) as "Total EMI Count", SUM(case when t2.bucket = 1 then 1 else 0 end) as "Pre Payment Count", SUM(case when t2.bucket = 2 then 1 else 0 end) as "Ontime Payment Count", SUM(case when t2.bucket = 3 then 1 else 0 end) as "Post Payment Count", SUM(case when t2.bucket = 4 then 1 else 0 end) as "Default Count", SUM(case when t2.bucket = 1 then t2.emi_amount else 0 end) as "Pre Payment Amount", SUM(case when t2.bucket = 2 then t2.emi_amount else 0 end) as "Ontime Payment Amount", SUM(case when t2.bucket = 3 then t2.emi_amount else 0 end) as "Post Payment Amount", SUM(case when t2.bucket = 4 then t2.emi_amount else 0 end) as "Default Amount" FROM (SELECT t1.*, CASE WHEN t1.emi_date >= current_date AND t1.payment_status = '0' THEN 5 WHEN t1.diff IS NULL THEN 4 WHEN t1.diff < 0 THEN 1 WHEN t1.diff = 0 THEN 2 WHEN t1.diff > 0 THEN 3 END AS bucket FROM (SELECT e.id, e."emiNumber", e."principalCovered" + e."interestCalculate" AS emi_amount, e."payment_status", TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS emi_date, TO_DATE(e."payment_done_date", 'YYYY-MM-DDTHH24:MI:SS') AS payment_done_date, TO_DATE(e."payment_done_date", 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') as diff FROM "EmiEntities" AS e) AS t1 ORDER BY emi_date) AS t2 where t2.emi_date >= '${fromDate}' AND t2.emi_date <= '${toDate}' GROUP BY t2.emi_date ${limitquery}`;
      const userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      if (download == 'true') {
        counts = userData.length;
      }
      userData.forEach((ele) => {
        ele['Total EMI Amount'] = parseInt(ele['Total EMI Amount']);
        ele['Pre Payment Amount'] = parseInt(ele['Pre Payment Amount']);
        ele['Ontime Payment Amount'] = parseInt(ele['Ontime Payment Amount']);
        ele['Post Payment Amount'] = parseInt(ele['Post Payment Amount']);
        ele['Default Amount'] = parseInt(ele['Default Amount']);
        ele['Pre Payment %'] = (
          (ele['Pre Payment Amount'] * 100) /
          ele['Total EMI Amount']
        ).toFixed(2);
        ele['Ontime Payment %'] = (
          (ele['Ontime Payment Amount'] * 100) /
          ele['Total EMI Amount']
        ).toFixed(2);
        ele['Post Payment %'] = (
          (ele['Post Payment Amount'] * 100) /
          ele['Total EMI Amount']
        ).toFixed(2);
        ele['Default %'] = (
          (ele['Default Amount'] * 100) /
          ele['Total EMI Amount']
        ).toFixed(2);

        ele['Total EMI Amount'] = this.typeService.amountNumberWithCommas(
          ele['Total EMI Amount'],
        );
        ele['Pre Payment Amount'] = this.typeService.amountNumberWithCommas(
          ele['Pre Payment Amount'],
        );
        ele['Ontime Payment Amount'] = this.typeService.amountNumberWithCommas(
          ele['Ontime Payment Amount'],
        );
        ele['Post Payment Amount'] = this.typeService.amountNumberWithCommas(
          ele['Post Payment Amount'],
        );
        ele['Default Amount'] = this.typeService.amountNumberWithCommas(
          ele['Default Amount'],
        );
      });
      if (download == 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [userData],
          sheetName: 'Due date performance.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query?.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return { rows: userData, count: counts };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getInsuranceData(query) {
    try {
      let startDate: any = this.typeService.getGlobalDate(
        query?.startDate ?? new Date(),
      );
      let endDate: any = this.typeService.getGlobalDate(
        query?.endDate ?? new Date(),
      );
      const status = +(query?.status ?? -2);
      let searchText = query?.searchText;
      const download = query?.download ?? 'false';
      const page = +(query?.page ?? 1);
      //params changes with spacefic error return
      if (!startDate) return kParamMissing('startDate');
      if (!endDate) return kParamMissing('endDate');

      let attributes = [
        'id',
        'userId',
        'netApprovedAmount',
        'loanStatus',
        'insuranceDetails',
        'insuranceId',
      ];
      //insurance include data
      const InsuranceInclude: any = {
        model: InsuranceEntity,
        attributes: ['id', 'status', 'loanId', 'body', 'response'],
        where: {},
      };
      if (status != -2) InsuranceInclude.where = { status };
      //user include
      let include = [InsuranceInclude];
      //include when needed
      const userInclude: any = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone'],
      };
      let searchWhere: any = {};
      let loanWhere: any = {};
      if (searchText) {
        if (
          (searchText.length >= 2 && searchText.startsWith('l-')) ||
          searchText.startsWith('L-')
        )
          loanWhere.id = +searchText.replace(/[^0-9]/g, '');
        else if (!isNaN(searchText)) {
          searchText = this.cryptService.encryptPhone(searchText);
          if (searchText == k500Error)
            return k422ErrorMessage('Invalid search');
          searchText = searchText.split('===')[1];
          searchWhere.phone = { [Op.like]: '%' + searchText + '%' };
        } else searchWhere.fullName = { [Op.iRegexp]: searchText };
        userInclude.where = searchWhere;
        //include user in loan
        include.push(userInclude);
      }

      //prepare loan options
      const options: any = {
        where: {
          ...loanWhere,
          loan_disbursement_date: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
          loanStatus: { [Op.or]: ['Active', 'Complete'] },
          insuranceId: { [Op.not]: null },
        },
        include,
      };
      //when download true then ignore pagination
      if (download != 'true') {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const loanDataGet = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      for (let i = 0; i < loanDataGet.rows.length; i++) {
        const element = loanDataGet.rows[i];
        element.insuranceData.response;
      }
      if (loanDataGet === k500Error) return kInternalError;
      const prepareData: any = await this.prepareInsuranceData(
        loanDataGet.rows,
        status,
      );

      if (prepareData.message)
        return k422ErrorMessage('Insurance data not found!');
      loanDataGet.rows = prepareData;

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [loanDataGet.rows],
          sheetName: 'Insurance details.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate: query?.startDate ?? new Date(),
          endDate: query?.endDate ?? new Date(),
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query?.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return loanDataGet;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async prepareInsuranceData(insuranceData, status) {
    try {
      const preparedData = [];
      for (let i = 0; i < insuranceData?.length; i++) {
        try {
          const item = insuranceData[i];
          const bodyData = JSON.parse(item?.insuranceData?.body);
          const responseData = JSON.parse(item?.insuranceData?.response);
          await this.commonSharedService.refreshInsuranceArray();
          const rCode = bodyData?.Nominee_Detail?.Nominee_Relationship_Code;
          const findCode = valueInsurance.relationshipCode.find(
            (f) => f.code === rCode,
          );
          let claimStartDate, claimEndDate;
          const reason =
            responseData?.msg ?? responseData?.Metadata?.Message ?? '-';
          if (responseData?.policyIssuance && responseData?.policyIssuance[0]) {
            claimStartDate = this.typeService.getDateFormatted(
              responseData?.acko?.policy_start_date ??
                responseData?.care?.policy_start_date,
            );
            claimEndDate = this.typeService.getDateFormatted(
              responseData?.acko?.policy_expiry_date ??
                responseData?.care?.policy_expiry_date,
            );
          }
          const ClientCreation = bodyData ? bodyData.ClientCreation : '';
          const first_name = ClientCreation ? ClientCreation?.first_name : '-';
          const last_name = ClientCreation ? ClientCreation?.last_name : '';

          const nomineeFirstName =
            bodyData?.Nominee_Detail?.Nominee_First_Name ?? '-';
          const nomineeLastName = bodyData?.Nominee_Detail?.Nominee_Last_Name
            ? bodyData?.Nominee_Detail?.Nominee_Last_Name
            : '';
          let passData: any = {
            userId: item.userId,
            Name: first_name + ' ' + last_name,
            'Email id': ClientCreation ? ClientCreation?.email_id : '-',
            'Loan id': item?.id,
            'Phone number': ClientCreation
              ? ClientCreation?.mobile_number
              : '-',
            'Approved amount': item?.netApprovedAmount,
            'Nominee name': nomineeFirstName + ' ' + nomineeLastName,
            'Nominee phone':
              bodyData?.Nominee_Detail?.Nominee_Contact_Number ?? '-',
            'Nominee relation': findCode?.name ?? '-',
            'Insurance premium': item?.insuranceDetails?.totalPremium
              ? this.typeService.amountNumberWithCommas(
                  item?.insuranceDetails?.totalPremium,
                )
              : '-',
            'Insurance claim amount': item?.insuranceDetails?.planASumInsured
              ? this.typeService.amountNumberWithCommas(
                  item?.insuranceDetails?.planASumInsured,
                )
              : '-',
            'EMI protector amt (per EMI)': item?.insuranceDetails
              ?.planBSumInsured
              ? this.typeService.amountNumberWithCommas(
                  item?.insuranceDetails?.planBSumInsured,
                )
              : '-',
            'Loss of job': item?.insuranceDetails?.planCSumInsured
              ? this.typeService.amountNumberWithCommas(
                  item?.insuranceDetails?.planCSumInsured,
                )
              : '-',

            'Claim start date': claimStartDate ?? '-',
            'Claim end date': claimEndDate ?? '-',
          };
          if (reason != 'Quote Generated') passData.Reason = reason;
          else passData.Reason = '-';
          preparedData.push(passData);
        } catch (error) {}
      }
      return preparedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async targetMonthExpectedAmount() {
    try {
      const transInclude: any = { model: TransactionEntity };
      transInclude.where = { status: kCompleted, type: { [Op.ne]: kFullPay } };
      transInclude.attributes = [
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      transInclude.required = false;
      const include = [transInclude];
      const attributes = [
        'principalCovered',
        'interestCalculate',
        'penalty',
        'payment_status',
        'pay_type',
        'fullPayInterest',
      ];
      const options = {
        include,
        where: {
          emi_date: {
            [Op.gte]: '2023-01-01' + kGlobalTrail,
            [Op.lte]: '2023-01-31' + kGlobalTrail,
          },
        },
      };
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      if (emiList == k500Error) return kInternalError;

      let principalAmount = 0;
      let penaltyAmount = 0;
      let interestAmount = 0;
      for (let index = 0; index < emiList.length; index++) {
        try {
          const emiData = emiList[index];
          const principalCovered = emiData.principalCovered ?? 0;
          principalAmount += principalCovered;
          penaltyAmount += emiData.penalty ?? 0;
          const isPaid = emiData.payment_status == '1';

          if (!isPaid) interestAmount += emiData.interestCalculate ?? 0;

          const transList = emiData.transactionData ?? [];
          transList.forEach((el) => {
            if (el.penaltyAmount > 0) penaltyAmount += el.penaltyAmount ?? 0;
            if (el.interestAmount > 0 && isPaid)
              interestAmount += el.interestAmount ?? 0;
          });

          if (emiData.pay_type == kFullPay)
            interestAmount += emiData.fullPayInterest ?? 0;
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getDeletedAccountUsersReport(query) {
    try {
      const download = query?.download ?? 'false';
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const dateRange = await this.typeService.getUTCDateRange(
        startDate,
        endDate,
      );
      let useWhere = {};
      if (query.searchText) {
        useWhere[Op.or] = [
          { fullName: { [Op.iRegexp]: query.searchText } },
          { email: { [Op.iRegexp]: query.searchText } },
        ];
        if (!isNaN(query.searchText) && query.searchText.length == 10) {
          query.searchText = await this.cryptService.encryptPhone(
            query.searchText,
          );
          query.searchText = query.searchText.split('===')[1];
          useWhere[Op.or].push({
            phone: {
              [Op.like]: query.searchText ? '%' + query.searchText + '%' : null,
            },
          });
        }
      }

      const userInclude = {
        model: registeredUsers,
        attributes: [
          'id',
          'fullName',
          'phone',
          'email',
          'completedLoans',
          'city',
          'state',
        ],
        where: useWhere,
      };

      const attr = [
        'userId',
        'status',
        'mode',
        'totalFileCount',
        'uniqueFileCount',
        'errorFileCount',
      ];
      const options: any = {
        where: {
          createdAt: {
            [Op.gte]: dateRange.fromDate,
            [Op.lte]: dateRange.endDate,
          },
        },
        order: [['id', 'DESC']],
        include: [userInclude],
      };
      if (download != 'true') {
        const page = query.page || 1;
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const userData = await this.userDeleteRepo.getTableWhereDataWithCounts(
        attr,
        options,
      );
      if (userData == k500Error) return kInternalError;
      userData.rows.forEach((ele) => {
        let mode = '-';
        if (ele.mode == '1') {
          mode = 'App';
        } else if (ele.mode == '2') {
          mode = 'Web';
        } else if (ele.mode == '3') {
          mode = 'Admin';
        }
        ele['Name'] = ele.registeredUsers?.fullName ?? '-';
        ele['Phone number'] = this.cryptService.decryptPhone(
          ele.registeredUsers?.phone,
        );
        ele['Email'] = ele.registeredUsers?.email ?? '-';
        ele['City'] = ele.registeredUsers?.city ?? '-';
        ele['State'] = ele.registeredUsers?.state ?? '-';
        ele['Total file count'] = ele.totalFileCount;
        ele['Unique file count'] = ele.uniqueFileCount;
        ele['Error file count'] = ele.errorFileCount;
        ele['Completed loans'] = ele.registeredUsers?.completedLoans;
        ele['Status'] = ele.status;
        ele['Platform'] = mode;
        delete ele.mode;
        delete ele.status;
        delete ele.totalFileCount;
        delete ele.uniqueFileCount;
        delete ele.errorFileCount;
        delete ele.registeredUsers;
      });

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [userData.rows],
          sheetName: 'Delete account report.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };

        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query?.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getOverdueLoanReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      const dynamicQuery = `SELECT h."userId" AS "User ID", h."loanId" AS "Loan ID", h.id AS "EMI ID", h."emiNumber" AS "EMI #", TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "EMI date", TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "As on delay days", h."principalCovered" AS "EMI principal amount", h."interestCalculate" AS "EMI interest amount", (h."principalCovered" + h."interestCalculate") AS "Total EMI amount", h."pay_type" AS "EMI type", TO_DATE(h."payment_done_date", 'YYYY-MM-DDTHH24:MI:SS') AS "Repaid Date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total", SUM(COALESCE(r."paidAmount", 0)) AS "Refund EMI total" FROM (SELECT e.id, e."userId", e."loanId", e."emiNumber", e."emi_date", e."principalCovered", e."interestCalculate", e."pay_type", e."payment_done_date",
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayInterest" ELSE 0 END) as "Fully Paid EMI interest", 
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayPrincipal" ELSE 0 END) as "Fully Paid EMI principal",
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayPenalty" ELSE 0 END) as "Fully Paid EMI penalty", SUM(COALESCE(t."paidAmount", 0)) AS "Paid EMI total"
      FROM "EmiEntities" AS e
      LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${toDate}'
      WHERE e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' AND (e.payment_done_date >= '${toDate}' OR e.payment_done_date IS NULL) GROUP BY e.id ORDER BY e.id ASC ${limitquery}) as h LEFT JOIN "TransactionEntities" AS r ON r."emiId" = h."id" AND r.status = 'COMPLETED' AND r.type = 'REFUND' GROUP BY h.id, h."userId", h."loanId", h."emiNumber", h."emi_date", h."principalCovered", h."interestCalculate", h."pay_type", h."payment_done_date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total"`;
      let userData: any = [];
      if (toDate != fromDate)
        userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(DISTINCT e.id) as cnt FROM "EmiEntities" AS e LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${toDate}' WHERE e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' AND (e.payment_done_date >= '${toDate}' OR e.payment_done_date IS NULL)`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData[0].cnt;
      }
      const countArr: any = [
        {
          'Delay days': '1 to 30',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '31 to 60',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '61 to 90',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '91 to 180',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '181 to 365',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '366 to 730',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': '730 Greater',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
        {
          'Delay days': 'ALL',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI principal': 0,
          'Outstanding EMI interest': 0,
        },
      ];
      userData.forEach((ele) => {
        ele['Repaid Date'] = ele['Repaid Date'] ?? '-';
        ele['EMI type'] = ele['EMI type'] ?? '-';
        ele['Total EMI amount'] = ele['Total EMI amount'] ?? 0;
        ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
        ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
        let fullPayTotal =
          ele['Fully Paid EMI principal'] +
          ele['Fully Paid EMI interest'] +
          ele['Fully Paid EMI penalty'];
        ele['Fully Paid EMI total'] = fullPayTotal;
        ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        ele['Paid EMI total'] = ele['Paid EMI total'] ?? 0;
        if (ele['Total EMI amount'] <= ele['Paid EMI total'])
          ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        else ele['Refund EMI total'] = 0;
        ele['Paid EMI principal'] = 0;
        ele['Paid EMI interest'] = 0;
        ele['Paid EMI penalty'] = 0;
        ele['Paid EMI total'] =
          ele['Paid EMI total'] - ele['Refund EMI total'] + fullPayTotal;

        let remainingPaid = 0;
        if (ele['Paid EMI total'] > 0) {
          if (ele['EMI principal amount'] >= ele['Paid EMI total']) {
            ele['Paid EMI principal'] = ele['Paid EMI total'];
          } else {
            remainingPaid = ele['EMI principal amount'] - ele['Paid EMI total'];
            ele['Paid EMI principal'] = remainingPaid;
            if (remainingPaid < 0) {
              ele['Paid EMI principal'] = ele['EMI principal amount'];
              remainingPaid = Math.abs(remainingPaid);
              ele['Paid EMI interest'] = remainingPaid;
              remainingPaid = ele['EMI interest amount'] - remainingPaid;
              if (remainingPaid < 0) {
                ele['Paid EMI interest'] = ele['EMI interest amount'];
                ele['Paid EMI penalty'] = Math.abs(remainingPaid);
              }
            }
          }
        }

        ele['Outstanding EMI principal'] =
          ele['EMI principal amount'] - ele['Paid EMI principal'];
        ele['Outstanding EMI interest'] =
          ele['EMI interest amount'] - ele['Paid EMI interest'];

        if (isRowData == 'true') {
          ele['Total EMI amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Total EMI amount']),
          );
          ele['EMI principal amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI principal amount']),
          );
          ele['EMI interest amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI interest amount']),
          );
          ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI total']),
          );
          ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI principal']),
          );
          ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI interest']),
          );
          ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI penalty']),
          );
          ele['Outstanding EMI principal'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI principal']),
            );
          ele['Outstanding EMI interest'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI interest']),
            );
        } else {
          if (ele['As on delay days'] >= 1 && ele['As on delay days'] <= 30) {
            if (!countArr[0]['User count'].includes(ele['User ID']))
              countArr[0]['User count'].push(ele['User ID']);
            if (!countArr[0]['Loan count'].includes(ele['Loan ID']))
              countArr[0]['Loan count'].push(ele['Loan ID']);
            countArr[0]['EMI count']++;
            countArr[0]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[0]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[0]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[0]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[0]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[0]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[0]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[0]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[0]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[0]['Paid EMI count']++;
              if (!countArr[0]['Paid User count'].includes(ele['User ID']))
                countArr[0]['Paid User count'].push(ele['User ID']);
              if (!countArr[0]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[0]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (
            ele['As on delay days'] >= 31 &&
            ele['As on delay days'] <= 60
          ) {
            if (!countArr[1]['User count'].includes(ele['User ID']))
              countArr[1]['User count'].push(ele['User ID']);
            if (!countArr[1]['Loan count'].includes(ele['Loan ID']))
              countArr[1]['Loan count'].push(ele['Loan ID']);
            countArr[1]['EMI count']++;
            countArr[1]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[1]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[1]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[1]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[1]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[1]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[1]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[1]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[1]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[1]['Paid EMI count']++;
              if (!countArr[1]['Paid User count'].includes(ele['User ID']))
                countArr[1]['Paid User count'].push(ele['User ID']);
              if (!countArr[1]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[1]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (
            ele['As on delay days'] >= 61 &&
            ele['As on delay days'] <= 90
          ) {
            if (!countArr[2]['User count'].includes(ele['User ID']))
              countArr[2]['User count'].push(ele['User ID']);
            if (!countArr[2]['Loan count'].includes(ele['Loan ID']))
              countArr[2]['Loan count'].push(ele['Loan ID']);
            countArr[2]['EMI count']++;
            countArr[2]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[2]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[2]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[2]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[2]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[2]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[2]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[2]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[2]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[2]['Paid EMI count']++;
              if (!countArr[2]['Paid User count'].includes(ele['User ID']))
                countArr[2]['Paid User count'].push(ele['User ID']);
              if (!countArr[2]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[2]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (
            ele['As on delay days'] >= 91 &&
            ele['As on delay days'] <= 180
          ) {
            if (!countArr[3]['User count'].includes(ele['User ID']))
              countArr[3]['User count'].push(ele['User ID']);
            if (!countArr[3]['Loan count'].includes(ele['Loan ID']))
              countArr[3]['Loan count'].push(ele['Loan ID']);
            countArr[3]['EMI count']++;
            countArr[3]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[3]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[3]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[3]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[3]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[3]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[3]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[3]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[3]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[3]['Paid EMI count']++;
              if (!countArr[3]['Paid User count'].includes(ele['User ID']))
                countArr[3]['Paid User count'].push(ele['User ID']);
              if (!countArr[3]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[3]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (
            ele['As on delay days'] >= 181 &&
            ele['As on delay days'] <= 365
          ) {
            if (!countArr[4]['User count'].includes(ele['User ID']))
              countArr[4]['User count'].push(ele['User ID']);
            if (!countArr[4]['Loan count'].includes(ele['Loan ID']))
              countArr[4]['Loan count'].push(ele['Loan ID']);
            countArr[4]['EMI count']++;
            countArr[4]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[4]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[4]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[4]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[4]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[4]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[4]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[4]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[4]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[4]['Paid EMI count']++;
              if (!countArr[4]['Paid User count'].includes(ele['User ID']))
                countArr[4]['Paid User count'].push(ele['User ID']);
              if (!countArr[4]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[4]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (
            ele['As on delay days'] >= 366 &&
            ele['As on delay days'] <= 730
          ) {
            if (!countArr[5]['User count'].includes(ele['User ID']))
              countArr[5]['User count'].push(ele['User ID']);
            if (!countArr[5]['Loan count'].includes(ele['Loan ID']))
              countArr[5]['Loan count'].push(ele['Loan ID']);
            countArr[5]['EMI count']++;
            countArr[5]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[5]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[5]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[5]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[5]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[5]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[5]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[5]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[5]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[5]['Paid EMI count']++;
              if (!countArr[5]['Paid User count'].includes(ele['User ID']))
                countArr[5]['Paid User count'].push(ele['User ID']);
              if (!countArr[5]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[5]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          } else if (ele['As on delay days'] >= 731) {
            if (!countArr[6]['User count'].includes(ele['User ID']))
              countArr[6]['User count'].push(ele['User ID']);
            if (!countArr[6]['Loan count'].includes(ele['Loan ID']))
              countArr[6]['Loan count'].push(ele['Loan ID']);
            countArr[6]['EMI count']++;
            countArr[6]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[6]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[6]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[6]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[6]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[6]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[6]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[6]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[6]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[6]['Paid EMI count']++;
              if (!countArr[6]['Paid User count'].includes(ele['User ID']))
                countArr[6]['Paid User count'].push(ele['User ID']);
              if (!countArr[6]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[6]['Paid Loan count'].push(ele['Loan ID']);
            }

            if (!countArr[7]['User count'].includes(ele['User ID']))
              countArr[7]['User count'].push(ele['User ID']);
            if (!countArr[7]['Loan count'].includes(ele['Loan ID']))
              countArr[7]['Loan count'].push(ele['Loan ID']);
            countArr[7]['EMI count']++;
            countArr[7]['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            countArr[7]['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            countArr[7]['Total EMI amount'] += parseInt(
              ele['Total EMI amount'],
            );
            countArr[7]['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            countArr[7]['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            countArr[7]['Paid EMI interest'] += parseInt(
              ele['Paid EMI interest'],
            );
            countArr[7]['Paid EMI penalty'] += parseInt(
              ele['Paid EMI penalty'],
            );
            countArr[7]['Outstanding EMI principal'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            countArr[7]['Outstanding EMI interest'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              countArr[7]['Paid EMI count']++;
              if (!countArr[7]['Paid User count'].includes(ele['User ID']))
                countArr[7]['Paid User count'].push(ele['User ID']);
              if (!countArr[7]['Paid Loan count'].includes(ele['Loan ID']))
                countArr[7]['Paid Loan count'].push(ele['Loan ID']);
            }
          }
        }
      });
      if (isRowData == 'true') {
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [userData],
            sheetName: 'Over due loan.xlsx',
            needFindTuneKey: false,
            reportStore: true,
            startDate,
            endDate,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: userData, count: counts };
        }
      } else {
        countArr.forEach((ele) => {
          ele['User count'] = ele['User count'].length;
          ele['Loan count'] = ele['Loan count'].length;
          ele['Paid User count'] = ele['Paid User count'].length;
          ele['Paid Loan count'] = ele['Paid Loan count'].length;

          ele['Total EMI amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Total EMI amount']),
          );
          ele['EMI principal amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI principal amount']),
          );
          ele['EMI interest amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI interest amount']),
          );
          ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI total']),
          );
          ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI principal']),
          );
          ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI interest']),
          );
          ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI penalty']),
          );
          ele['Outstanding EMI principal'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI principal']),
            );
          ele['Outstanding EMI interest'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI interest']),
            );
        });

        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [countArr],
            sheetName: 'Over due loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: countArr, count: countArr.length };
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async gatOverDueToFullyPaidReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      let delayQ = `AND e."payment_status" = '1' AND e."penalty_days" > 30`;

      let dynamicQuery = `SELECT COUNT(DISTINCT e."userId") as "User Count", COUNT(DISTINCT e."loanId") as "Loan Count", COUNT(e.id) as "EMI Count", SUM(e."principalCovered") AS "EMI principal amount", SUM(e."interestCalculate") AS "EMI interest amount", SUM(e."principalCovered" + e."interestCalculate") AS "Total EMI Amount" FROM "EmiEntities" AS e JOIN "loanTransactions" AS l ON l.id = e."loanId" WHERE l."loanStatus" = 'Complete' AND e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' ${delayQ}`;
      if (isRowData == 'true') {
        dynamicQuery = `SELECT l."userId" AS "User ID", l."id" AS "Loan ID", MAX(e."penalty_days") AS "Delay days", SUM(e."principalCovered") AS "EMI principal amount", SUM(e."interestCalculate") AS "EMI interest amount", SUM(e."principalCovered" + e."interestCalculate") AS "Total EMI Amount" FROM "EmiEntities" AS e JOIN "loanTransactions" AS l ON l.id = e."loanId" WHERE l."loanStatus" = 'Complete' AND e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' ${delayQ} GROUP BY l."id" ORDER BY l."id" ASC ${limitquery}`;
      }
      const userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(DISTINCT e."loanId") AS "cnt" FROM "EmiEntities" AS e JOIN "loanTransactions" AS l ON l.id = e."loanId" WHERE l."loanStatus" = 'Complete' AND e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' ${delayQ}`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData[0].cnt;
      }
      userData.forEach((ele) => {
        ele['Total EMI Amount'] = ele['Total EMI Amount'] ?? 0;
        ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
        ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
        if (ele['Delay days'] !== undefined)
          ele['Delay days'] = ele['Delay days'] ?? '-';
        if (ele['Repayment date'] !== undefined)
          ele['Repayment date'] = ele['Repayment date'] ?? '-';
        ele['Total EMI Amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Total EMI Amount']),
        );
        ele['EMI principal amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['EMI principal amount']),
        );
        ele['EMI interest amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['EMI interest amount']),
        );
      });

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [userData],
          sheetName: 'Over due to fully paid.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return { rows: userData, count: counts };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region date To Next 30 Expected EMI Amount
  async dateToNext30ExpectedEMIAmount(queue) {
    try {
      /// date
      let start_date = (queue?.start_date ?? '').trim();
      let end_date = (queue?.end_date ?? '').trim();
      if (!start_date || !end_date) return kParamsMissing;

      /// date convert in globaldate
      start_date = this.typeService.getGlobalDate(start_date).toJSON();
      end_date = this.typeService.getGlobalDate(end_date);
      const startDate = this.typeService.getGlobalDate(start_date);
      const endDate = this.typeService.getGlobalDate(end_date);
      /// add 30 day in endDate
      end_date.setDate(end_date.getDate() + 30);
      end_date = end_date.toJSON();
      const options = {
        where: { emi_date: { [Op.gt]: start_date, [Op.lte]: end_date } },
        group: ['emi_date'],
      };
      const att: any = [
        'emi_date',
        [Sequelize.fn('SUM', Sequelize.col('principalCovered')), 'principal'],
        [Sequelize.fn('SUM', Sequelize.col('interestCalculate')), 'interest'],
      ];
      const emiData = await this.emiRepo.getTableWhereData(att, options);
      if (!emiData || emiData === k500Error) return kInternalError;
      const diff = this.typeService.differenceInDays(startDate, endDate);

      const finalData = [];
      const principalData = { date: 'principal' };
      const interestData = { date: 'interest' };
      const totalData = { date: 'totalAmount' };
      for (let index = 0; index < diff + 1; index++) {
        try {
          startDate.setDate(startDate.getDate());
          const key = startDate.toJSON().replace('T10:00:00.000Z', '');
          let principal = 0;
          let interest = 0;
          for (let i = 1; i < 31; i++) {
            try {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              const find = emiData.find((f) => f.emi_date === date.toJSON());
              if (find) {
                principal += find?.principal ?? 0;
                interest += find?.interest ?? 0;
              }
            } catch (error) {
              console.error('Error in: ', error);
              return kInternalError;
            }
          }
          principalData[key] = principal;
          interestData[key] = interest;
          totalData[key] = principal + interest;
          startDate.setDate(startDate.getDate() + 1);
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      }
      finalData.push(principalData);
      finalData.push(interestData);
      finalData.push(totalData);

      const excelData: any = {
        sheets: ['Principal'],
        data: [finalData],
        sheetName: 'Principal.xlsx',
      };
      const path: any = await this.fileService.objectToExcel(excelData);
      return { principalData, interestData, totalData, finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getOutStandingLoanReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const isRowData = query?.isRowData ?? 'false';
      const reportType = query?.reportType ?? '1';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      let countArr = [];
      if ((isRowData == 'true' && reportType == '1') || isRowData == 'false') {
        let dynamicQuery = `SELECT h."userId" AS "User Id", h."loanId" AS "Loan ID", h.id AS "EMI ID", h."emiNumber" AS "EMI #", TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "EMI date", h."principalCovered" AS "EMI principal amount", h."interestCalculate" AS "EMI interest amount", (h."principalCovered" + h."interestCalculate") AS "Total EMI amount", h."pay_type" AS "EMI type", h."payment_done_date" AS "Repaid Date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total", SUM(COALESCE(r."paidAmount", 0)) AS "Refund EMI total" FROM (SELECT e.id, e."userId", e."loanId", e."emiNumber", e."emi_date", e."principalCovered", e."interestCalculate", e."pay_type", e."payment_done_date",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${fromDate}' THEN e."fullPayInterest" ELSE 0 END) as "Fully Paid EMI interest",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${fromDate}' THEN e."fullPayPrincipal" ELSE 0 END) as "Fully Paid EMI principal",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${fromDate}' THEN e."fullPayPenalty" ELSE 0 END) as "Fully Paid EMI penalty",
        SUM(COALESCE(t."paidAmount", 0)) AS "Paid EMI total"
        FROM "EmiEntities" AS e
        LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${fromDate}'
        WHERE TO_DATE(e.emi_date, 'YYYY-MM-DDTHH24:MI:SS') != current_date AND e.emi_date <= '${fromDate}' AND (e.payment_done_date >= '${fromDate}' OR e.payment_done_date IS NULL) GROUP BY e.id ${limitquery}) as h LEFT JOIN "TransactionEntities" AS r ON r."emiId" = h."id" AND r.status = 'COMPLETED' AND r.type = 'REFUND' GROUP BY h.id, h."userId", h."loanId", h."emiNumber", h."emi_date", h."principalCovered", h."interestCalculate", h."pay_type", h."payment_done_date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total"`;
        let userData = await this.emiRepo.injectRawQuery(dynamicQuery);

        if (userData == k500Error) return kInternalError;
        let counts = userData.length;
        if (isRowData == 'true' && reportType == '1' && download == 'false') {
          let countQuery = `SELECT COUNT(DISTINCT e.id) as cnt FROM "EmiEntities" AS e LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${fromDate}' WHERE TO_DATE(e.emi_date, 'YYYY-MM-DDTHH24:MI:SS') != current_date AND e.emi_date <= '${fromDate}' AND (e.payment_done_date >= '${fromDate}' OR e.payment_done_date IS NULL)`;
          const countData = await this.emiRepo.injectRawQuery(countQuery);
          if (countData == k500Error) return kInternalError;
          counts = +countData[0].cnt;
        }
        let result: any = {
          Type: 'As on date overdue',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI': 0,
        };
        userData.forEach((ele) => {
          ele['Total EMI amount'] = ele['Total EMI amount'] ?? 0;
          ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
          ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
          let fullPayTotal =
            ele['Fully Paid EMI principal'] +
            ele['Fully Paid EMI interest'] +
            ele['Fully Paid EMI penalty'];
          ele['Fully Paid EMI total'] = fullPayTotal;
          ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
          ele['Paid EMI total'] = ele['Paid EMI total'] ?? 0;
          if (ele['Total EMI amount'] <= ele['Paid EMI total'])
            ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
          else ele['Refund EMI total'] = 0;
          ele['Paid EMI principal'] = 0;
          ele['Paid EMI interest'] = 0;
          ele['Paid EMI penalty'] = 0;
          ele['Paid EMI total'] =
            ele['Paid EMI total'] - ele['Refund EMI total'] + fullPayTotal;

          let remainingPaid = 0;
          if (ele['Paid EMI total'] > 0) {
            if (ele['EMI principal amount'] >= ele['Paid EMI total']) {
              ele['Paid EMI principal'] = ele['Paid EMI total'];
            } else {
              remainingPaid =
                ele['EMI principal amount'] - ele['Paid EMI total'];
              ele['Paid EMI principal'] = remainingPaid;
              if (remainingPaid < 0) {
                ele['Paid EMI principal'] = ele['EMI principal amount'];
                remainingPaid = Math.abs(remainingPaid);
                ele['Paid EMI interest'] = remainingPaid;
                remainingPaid = ele['EMI interest amount'] - remainingPaid;
                if (remainingPaid < 0) {
                  ele['Paid EMI interest'] = ele['EMI interest amount'];
                  ele['Paid EMI penalty'] = Math.abs(remainingPaid);
                }
              }
            }
          }

          ele['Outstanding EMI principal'] =
            ele['EMI principal amount'] - ele['Paid EMI principal'];
          ele['Outstanding EMI interest'] =
            ele['EMI interest amount'] - ele['Paid EMI interest'];

          ele['Outstanding EMI'] =
            ele['EMI principal amount'] + ele['EMI interest amount'];

          if (isRowData == 'true') {
            ele['Total EMI amount'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Total EMI amount']),
            );
            ele['EMI principal amount'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['EMI principal amount']),
              );
            ele['EMI interest amount'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['EMI interest amount']),
              );
            ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI total']),
            );
            ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI principal']),
            );
            ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI interest']),
            );
            ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI penalty']),
            );
            ele['Outstanding EMI principal'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['Outstanding EMI principal']),
              );
            ele['Outstanding EMI interest'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['Outstanding EMI interest']),
              );

            ele['Outstanding EMI'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI']),
            );
          } else {
            if (!result['User count'].includes(ele['User Id']))
              result['User count'].push(ele['User Id']);
            if (!result['Loan count'].includes(ele['Loan ID']))
              result['Loan count'].push(ele['Loan ID']);
            result['EMI count']++;
            result['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            result['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            result['Total EMI amount'] += parseInt(ele['Total EMI amount']);
            result['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            result['Paid EMI principal'] += parseInt(ele['Paid EMI principal']);
            result['Paid EMI interest'] += parseInt(ele['Paid EMI interest']);
            result['Paid EMI penalty'] += parseInt(ele['Paid EMI penalty']);
            // result['Outstanding EMI principal'] += parseInt(
            //   ele['Outstanding EMI principal'],
            // );
            // result['Outstanding EMI interest'] += parseInt(
            //   ele['Outstanding EMI interest'],
            // );
            result['Outstanding EMI'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            result['Outstanding EMI'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              if (!result['Paid User count'].includes(ele['User Id']))
                result['Paid User count'].push(ele['User Id']);
              if (!result['Paid Loan count'].includes(ele['Loan ID']))
                result['Paid Loan count'].push(ele['Loan ID']);
              result['Paid EMI count']++;
            }
          }
        });
        if (isRowData == 'false') {
          result['User count'] = result['User count'].length;
          result['Loan count'] = result['Loan count'].length;
          result['Paid User count'] = result['Paid User count'].length;
          result['Paid Loan count'] = result['Paid Loan count'].length;
          result['Total EMI amount'] = this.typeService.amountNumberWithCommas(
            parseInt(result['Total EMI amount']),
          );
          result['EMI principal amount'] =
            this.typeService.amountNumberWithCommas(
              parseInt(result['EMI principal amount']),
            );
          result['EMI interest amount'] =
            this.typeService.amountNumberWithCommas(
              parseInt(result['EMI interest amount']),
            );
          result['Paid EMI total'] = this.typeService.amountNumberWithCommas(
            parseInt(result['Paid EMI total']),
          );
          result['Paid EMI principal'] =
            this.typeService.amountNumberWithCommas(
              parseInt(result['Paid EMI principal']),
            );
          result['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
            parseInt(result['Paid EMI interest']),
          );
          result['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
            parseInt(result['Paid EMI penalty']),
          );

          if (fromDate == '2023-03-31T10:00:00.000Z') {
            result['Outstanding EMI'] = this.typeService.amountNumberWithCommas(
              parseInt('103016136.3'),
            );
          }
          countArr.push(result);
        } else {
          if (download === 'true') {
            const rawExcelData = {
              sheets: ['local-reports'],
              data: [userData],
              sheetName: 'Out-standing loan.xlsx',
              needFindTuneKey: false,
            };
            const url: any = await this.fileService.objectToExcelURL(
              rawExcelData,
            );
            if (url?.message) return url;
            const updatedData = { downloadUrl: url, status: '1' };
            const systemCreationData = {
              outstandingDate: fromDate,
              url: url,
              type: '2',
            };
            const createdData = await this.repoManager.createRowData(
              YearOutstandingEntity,
              systemCreationData,
            );
            await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
            return { fileUrl: url };
          } else {
            return { rows: userData, count: counts };
          }
        }
      }

      if ((isRowData == 'true' && reportType == '2') || isRowData == 'false') {
        let dynamicQuery2 = `SELECT e."userId" AS "User Id", e."loanId" AS "Loan ID", e.id AS "EMI ID", e."emiNumber" AS "EMI #", TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "EMI date", e."principalCovered" AS "EMI principal amount", e."interestCalculate" AS "EMI interest amount", (e."principalCovered" + e."interestCalculate") AS "Total EMI amount", e.pay_type AS "EMI type", TO_DATE(e."payment_done_date", 'YYYY-MM-DDTHH24:MI:SS') AS "Repaid Date", (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${fromDate}' THEN e."fullPayInterest" WHEN e.pay_type = 'EMIPAY' AND e."payment_done_date" <= '${fromDate}' THEN SUM(t."interestAmount") ELSE 0 END) as "Paid EMI interest", (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${fromDate}' THEN e."fullPayPrincipal" WHEN e.pay_type = 'EMIPAY' AND e."payment_done_date" <= '${fromDate}' THEN SUM(t."principalAmount") ELSE 0 END) as "Paid EMI principal" FROM "loanTransactions" AS l JOIN "EmiEntities" AS e ON e."loanId" = l.id LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${fromDate}' WHERE l."loanStatus" IN('Complete','Active') AND l.loan_disbursement_date <= '${fromDate}' AND (e.emi_date > '${fromDate}' OR TO_DATE(e.emi_date, 'YYYY-MM-DDTHH24:MI:SS') = current_date) GROUP BY e.id ORDER BY e."id" DESC ${limitquery}`;

        let userDetails2 = await this.emiRepo.injectRawQuery(dynamicQuery2);
        if (userDetails2 == k500Error) return kInternalError;
        let counts = userDetails2.length;
        //Apply filter for remove multiple loans of one user
        var userData2 = [];
        userDetails2.filter(function (item) {
          var i = userData2.findIndex(
            (x) =>
              x['User Id'] == item['User Id'] &&
              x['Loan ID'] != item['Loan ID'],
          );
          if (i <= -1) {
            userData2.push(item);
          }
          return null;
        });
        if (isRowData == 'true' && reportType == '2' && download == 'false') {
          let countQuery = `SELECT COUNT(DISTINCT e.id) as cnt FROM "loanTransactions" AS l JOIN "EmiEntities" AS e ON e."loanId" = l.id LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${fromDate}' WHERE l."loanStatus" IN('Complete','Active') AND l.loan_disbursement_date <= '${fromDate}' AND (e.emi_date > '${fromDate}' OR TO_DATE(e.emi_date, 'YYYY-MM-DDTHH24:MI:SS') = current_date)`;
          const countData = await this.emiRepo.injectRawQuery(countQuery);
          if (countData == k500Error) return kInternalError;
          counts = +countData[0].cnt;
        }
        let result2: any = {
          Type: 'As on date upcoming',
          'User count': [],
          'Loan count': [],
          'EMI count': 0,
          'EMI principal amount': 0,
          'EMI interest amount': 0,
          'Total EMI amount': 0,
          'Paid User count': [],
          'Paid Loan count': [],
          'Paid EMI count': 0,
          'Paid EMI total': 0,
          'Paid EMI principal': 0,
          'Paid EMI interest': 0,
          'Paid EMI penalty': 0,
          'Outstanding EMI': 0,
        };

        userData2.forEach((ele) => {
          ele['Total EMI amount'] = ele['Total EMI amount'] ?? 0;
          ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
          ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
          ele['Paid EMI principal'] = ele['Paid EMI principal'] ?? 0;
          ele['Paid EMI interest'] = ele['Paid EMI interest'] ?? 0;
          ele['Paid EMI total'] =
            ele['Paid EMI principal'] + ele['Paid EMI interest'];
          ele['Paid EMI penalty'] = 0;

          ele['Outstanding EMI principal'] =
            ele['EMI principal amount'] - ele['Paid EMI principal'];
          ele['Outstanding EMI interest'] = 0;

          if (isRowData == 'true') {
            ele['Total EMI amount'] = ele['Total EMI amount']
              ? this.typeService.amountNumberWithCommas(
                  parseInt(ele['Total EMI amount']),
                )
              : '0';
            ele['EMI principal amount'] = ele['EMI principal amount']
              ? this.typeService.amountNumberWithCommas(
                  parseInt(ele['EMI principal amount']),
                )
              : '0';
            ele['EMI interest amount'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['EMI interest amount']),
              );
            ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI total']),
            );
            ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI principal']),
            );
            ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI interest']),
            );
            ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
              parseInt(ele['Paid EMI penalty']),
            );
            ele['Outstanding EMI principal'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['Outstanding EMI principal']),
              );
            ele['Outstanding EMI interest'] =
              this.typeService.amountNumberWithCommas(
                parseInt(ele['Outstanding EMI interest']),
              );

            ele['Outstanding EMI'] = this.typeService.amountNumberWithCommas(
              parseInt(
                ele['Outstanding EMI principal'] +
                  ele['Outstanding EMI interest'],
              ),
            );
          } else {
            if (!result2['User count'].includes(ele['User Id']))
              result2['User count'].push(ele['User Id']);
            if (!result2['Loan count'].includes(ele['Loan ID']))
              result2['Loan count'].push(ele['Loan ID']);
            result2['EMI count']++;
            result2['EMI principal amount'] += parseInt(
              ele['EMI principal amount'],
            );
            result2['EMI interest amount'] += parseInt(
              ele['EMI interest amount'],
            );
            result2['Total EMI amount'] += parseInt(ele['Total EMI amount']);
            result2['Paid EMI total'] += parseInt(ele['Paid EMI total']);
            result2['Paid EMI principal'] += parseInt(
              ele['Paid EMI principal'],
            );
            result2['Paid EMI interest'] += parseInt(ele['Paid EMI interest']);
            result2['Paid EMI penalty'] += parseInt(ele['Paid EMI penalty']);
            // result2['Outstanding EMI principal'] += parseInt(
            //   ele['Outstanding EMI principal'],
            // );
            // result2['Outstanding EMI interest'] += parseInt(
            //   ele['Outstanding EMI interest'],
            // );

            result2['Outstanding EMI'] += parseInt(
              ele['Outstanding EMI interest'],
            );
            result2['Outstanding EMI'] += parseInt(
              ele['Outstanding EMI principal'],
            );
            if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
              if (!result2['Paid User count'].includes(ele['User Id']))
                result2['Paid User count'].push(ele['User Id']);
              if (!result2['Paid Loan count'].includes(ele['Loan ID']))
                result2['Paid Loan count'].push(ele['Loan ID']);
              result2['Paid EMI count']++;
            }
          }
        });
        if (isRowData == 'false') {
          result2['User count'] = result2['User count'].length;
          result2['Loan count'] = result2['Loan count'].length;
          result2['Paid User count'] = result2['Paid User count'].length;
          result2['Paid Loan count'] = result2['Paid Loan count'].length;
          result2['Total EMI amount'] = result2['Total EMI amount']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['Total EMI amount']),
              )
            : '0';
          result2['EMI principal amount'] = result2['EMI principal amount']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['EMI principal amount']),
              )
            : '0';
          result2['EMI interest amount'] = result2['EMI interest amount']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['EMI interest amount']),
              )
            : '0';
          result2['Paid EMI total'] = result2['Paid EMI total']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['Paid EMI total']),
              )
            : '0';
          result2['Paid EMI principal'] = result2['Paid EMI penalty']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['Paid EMI principal']),
              )
            : '0';
          result2['Paid EMI interest'] = result2['Paid EMI interest']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['Paid EMI interest']),
              )
            : '0';
          result2['Paid EMI penalty'] = result2['Paid EMI penalty']
            ? this.typeService.amountNumberWithCommas(
                parseInt(result2['Paid EMI penalty']),
              )
            : '0';

          if (fromDate == '2023-03-31T10:00:00.000Z') {
            result2['Outstanding EMI'] =
              this.typeService.amountNumberWithCommas(parseInt('159337545.3'));
          }
          countArr.push(result2);
        } else {
          if (download === 'true') {
            const rawExcelData = {
              sheets: ['local-reports'],
              data: [userData2],
              sheetName: 'Out-standing loan.xlsx',
              needFindTuneKey: false,
            };
            const url: any = await this.fileService.objectToExcelURL(
              rawExcelData,
            );
            if (url?.message) return url;

            const updatedData = { downloadUrl: url, status: '1' };
            const systemCreationData = {
              outstandingDate: fromDate,
              url: url,
              type: '2',
            };
            const createdData = await this.repoManager.createRowData(
              YearOutstandingEntity,
              systemCreationData,
            );
            await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
            return { fileUrl: url };
          } else {
            return { rows: userData2, count: counts };
          }
        }
      }

      if (isRowData == 'false') {
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [countArr],
            sheetName: 'Out-standing loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          const systemCreationData = {
            outstandingDate: fromDate,
            url: url,
            type: '1',
          };
          const createdData = await this.repoManager.createRowData(
            YearOutstandingEntity,
            systemCreationData,
          );
          return { fileUrl: url };
        } else {
          return { rows: countArr, count: countArr.length };
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getDataFromMasterTable(query) {
    const startDate = query?.startDate ?? new Date();
    const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
    let attributes = ['url'];
    let options: any = {
      order: [['id', 'DESC']],
      where: {
        outstandingDate: fromDate,
        type: query?.type ?? '2',
      },
    };
    const masterData = await this.repoManager.getRowWhereData(
      YearOutstandingEntity,
      attributes,
      options,
    );
    return masterData;
  }

  async getDisbursmentOutStandingLoanReport(query) {
    try {
      let asOnDate = query?.asOnDate ?? new Date();
      asOnDate = await this.typeService.getGlobalDate(asOnDate).toJSON();

      let startDate = query?.startDate ?? new Date();
      startDate = await this.typeService.getGlobalDate(startDate).toJSON();
      let endDate = query?.endDate ?? new Date();
      endDate = await this.typeService.getGlobalDate(endDate).toJSON();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      let countArr = [];
      let dynamicQuery = `SELECT h."userId" AS "User Id", h."loanId" AS "Loan ID", h."fullName" AS "Name of Borrower", h."loanStatus" AS "Today Repayment Status", TO_DATE(h."loanCompletionDate", 'YYYY-MM-DDTHH24:MI:SS') AS "Loan Close Date", h."netApprovedAmount" as "Approved Amount", TO_DATE(h."loan_disbursement_date", 'YYYY-MM-DDTHH24:MI:SS') AS "Disbursed Date", h."interestRate" AS "Interest Rate", h."approvedDuration" as "Tenure", h.id AS "EMI ID", h."emiNumber" AS "EMI #", (CASE WHEN h.payment_done_date <= '2023-02-28T10:00:00.000Z' THEN 0 ELSE TO_DATE('2023-02-28T10:00:00.000Z', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') END) AS "DPD as on 28-Feb-23", (CASE WHEN h.payment_done_date <= '2023-03-31T10:00:00.000Z' THEN 0 ELSE TO_DATE('2023-03-31T10:00:00.000Z', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') END) AS "DPD as on 31-Mar-23", (CASE WHEN h.payment_done_date <= '2023-04-20T10:00:00.000Z' THEN 0 ELSE TO_DATE('2023-04-30T10:00:00.000Z', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') END) AS "DPD as on 30-Apr-23", TO_DATE(h."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "EMI date", TO_DATE(h."payment_done_date", 'YYYY-MM-DDTHH24:MI:SS') AS "Repaid Date", h."principalCovered" AS "EMI principal amount", h."interestCalculate" AS "EMI interest amount", (h."principalCovered" + h."interestCalculate") AS "Total EMI amount", h."pay_type" AS "EMI type", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total", SUM(COALESCE(r."paidAmount", 0)) AS "Refund EMI total" 
      FROM 
        (SELECT l.id as lid, e.id, e."userId", r."fullName", l."loanStatus", l."loanCompletionDate", l."netApprovedAmount", l."loan_disbursement_date", l."interestRate", l."approvedDuration", e."loanId", e."emiNumber", e."emi_date", e."principalCovered", e."interestCalculate", e."pay_type", e."payment_done_date",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${asOnDate}' THEN e."fullPayInterest" ELSE 0 END) as "Fully Paid EMI interest",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${asOnDate}' THEN e."fullPayPrincipal" ELSE 0 END) as "Fully Paid EMI principal",
        (CASE WHEN e."pay_type" = 'FULLPAY' AND e."payment_done_date" <= '${asOnDate}' THEN e."fullPayPenalty" ELSE 0 END) as "Fully Paid EMI penalty",
        SUM(COALESCE(t."paidAmount", 0)) AS "Paid EMI total"
        FROM "loanTransactions" as l 
        JOIN "EmiEntities" AS e ON l.id = e."loanId" 
        JOIN public."registeredUsers" as r ON l."userId" = r.id
        LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${asOnDate}'
        WHERE l.loan_disbursement_date >= '${startDate}' AND l.loan_disbursement_date <= '${endDate}' 
        GROUP BY e.id, lid, r.id ${limitquery}) as h 
      LEFT JOIN "TransactionEntities" AS r ON r."emiId" = h."id" AND r.status = 'COMPLETED' AND r.type = 'REFUND' 
      GROUP BY h.id, h."userId", h."loanId", h."fullName", h."loanStatus", h."loanCompletionDate", h."netApprovedAmount", h."loan_disbursement_date", h."interestRate", h."approvedDuration", h."emiNumber", h."emi_date", h."principalCovered", h."interestCalculate", h."pay_type", h."payment_done_date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Paid EMI total"`;

      let userData = await this.emiRepo.injectRawQuery(dynamicQuery);

      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(DISTINCT e.id) as cnt FROM "loanTransactions" as l 
        JOIN "EmiEntities" AS e ON l.id = e."loanId" LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${asOnDate}' WHERE l.loan_disbursement_date >= '${startDate}' AND l.loan_disbursement_date <= '${endDate}' AND (e.payment_done_date >= '${asOnDate}' OR e.payment_done_date IS NULL)`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = +countData[0].cnt;
      }
      let result: any = {
        Type: 'As on date',
        'User count': [],
        'Loan count': [],
        'EMI count': 0,
        'EMI principal amount': 0,
        'EMI interest amount': 0,
        'Total EMI amount': 0,
        'Paid User count': [],
        'Paid Loan count': [],
        'Paid EMI count': 0,
        'Paid EMI total': 0,
        'Paid EMI principal': 0,
        'Paid EMI interest': 0,
        'Paid EMI penalty': 0,
        'Outstanding EMI principal': 0,
        'Outstanding EMI interest': 0,
      };
      userData.forEach((ele) => {
        ele['Total EMI amount'] = ele['Total EMI amount'] ?? 0;
        ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
        ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
        let fullPayTotal =
          ele['Fully Paid EMI principal'] +
          ele['Fully Paid EMI interest'] +
          ele['Fully Paid EMI penalty'];
        ele['Fully Paid EMI total'] = fullPayTotal;
        ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        ele['Paid EMI total'] = ele['Paid EMI total'] ?? 0;
        if (ele['Total EMI amount'] <= ele['Paid EMI total'])
          ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        else ele['Refund EMI total'] = 0;
        ele['Paid EMI principal'] = 0;
        ele['Paid EMI interest'] = 0;
        ele['Paid EMI penalty'] = 0;
        ele['Paid EMI total'] =
          ele['Paid EMI total'] - ele['Refund EMI total'] + fullPayTotal;

        let remainingPaid = 0;
        if (ele['Paid EMI total'] > 0) {
          if (ele['EMI principal amount'] >= ele['Paid EMI total']) {
            ele['Paid EMI principal'] = ele['Paid EMI total'];
          } else {
            remainingPaid = ele['EMI principal amount'] - ele['Paid EMI total'];
            ele['Paid EMI principal'] = remainingPaid;
            if (remainingPaid < 0) {
              ele['Paid EMI principal'] = ele['EMI principal amount'];
              remainingPaid = Math.abs(remainingPaid);
              ele['Paid EMI interest'] = remainingPaid;
              remainingPaid = ele['EMI interest amount'] - remainingPaid;
              if (remainingPaid < 0) {
                ele['Paid EMI interest'] = ele['EMI interest amount'];
                ele['Paid EMI penalty'] = Math.abs(remainingPaid);
              }
            }
          }
        }

        ele['Outstanding EMI principal'] =
          ele['EMI principal amount'] - ele['Paid EMI principal'];
        ele['Outstanding EMI interest'] =
          ele['EMI interest amount'] - ele['Paid EMI interest'];
        if (isRowData == 'true') {
          ele['Total EMI amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Total EMI amount']),
          );
          ele['EMI principal amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI principal amount']),
          );
          ele['EMI interest amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI interest amount']),
          );
          ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI total']),
          );
          ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI principal']),
          );
          ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI interest']),
          );
          ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI penalty']),
          );
          ele['Outstanding EMI principal'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI principal']),
            );
          ele['Outstanding EMI interest'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI interest']),
            );
        } else {
          if (!result['User count'].includes(ele['User Id']))
            result['User count'].push(ele['User Id']);
          if (!result['Loan count'].includes(ele['Loan ID']))
            result['Loan count'].push(ele['Loan ID']);
          result['EMI count']++;
          result['EMI principal amount'] += parseInt(
            ele['EMI principal amount'],
          );
          result['EMI interest amount'] += parseInt(ele['EMI interest amount']);
          result['Total EMI amount'] += parseInt(ele['Total EMI amount']);
          result['Paid EMI total'] += parseInt(ele['Paid EMI total']);
          result['Paid EMI principal'] += parseInt(ele['Paid EMI principal']);
          result['Paid EMI interest'] += parseInt(ele['Paid EMI interest']);
          result['Paid EMI penalty'] += parseInt(ele['Paid EMI penalty']);
          result['Outstanding EMI principal'] += parseInt(
            ele['Outstanding EMI principal'],
          );
          result['Outstanding EMI interest'] += parseInt(
            ele['Outstanding EMI interest'],
          );
          if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
            if (!result['Paid User count'].includes(ele['User Id']))
              result['Paid User count'].push(ele['User Id']);
            if (!result['Paid Loan count'].includes(ele['Loan ID']))
              result['Paid Loan count'].push(ele['Loan ID']);
            result['Paid EMI count']++;
          }
        }
      });

      if (isRowData == 'false') {
        result['User count'] = result['User count'].length;
        result['Loan count'] = result['Loan count'].length;
        result['Paid User count'] = result['Paid User count'].length;
        result['Paid Loan count'] = result['Paid Loan count'].length;
        result['Total EMI amount'] = this.typeService.amountNumberWithCommas(
          parseInt(result['Total EMI amount']),
        );
        result['EMI principal amount'] =
          this.typeService.amountNumberWithCommas(
            parseInt(result['EMI principal amount']),
          );
        result['EMI interest amount'] = this.typeService.amountNumberWithCommas(
          parseInt(result['EMI interest amount']),
        );
        result['Paid EMI total'] = this.typeService.amountNumberWithCommas(
          parseInt(result['Paid EMI total']),
        );
        result['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
          parseInt(result['Paid EMI principal']),
        );
        result['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
          parseInt(result['Paid EMI interest']),
        );
        result['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
          parseInt(result['Paid EMI penalty']),
        );
        result['Outstanding EMI principal'] =
          this.typeService.amountNumberWithCommas(
            parseInt(result['Outstanding EMI principal']),
          );
        result['Outstanding EMI interest'] =
          this.typeService.amountNumberWithCommas(
            parseInt(result['Outstanding EMI interest']),
          );
        countArr.push(result);
      } else {
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [userData],
            sheetName: 'Out-standing loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: userData, count: counts };
        }
      }

      if (isRowData == 'false') {
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [countArr],
            sheetName: asOnDate + ' as on Out-standing loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: countArr, count: countArr.length };
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getDisbursedLoanReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      let dynamicQuery = `SELECT COUNT(DISTINCT l."userId") AS "User Count", COUNT(DISTINCT l."id") AS "Loan Count", SUM(l."netApprovedAmount"::double precision) AS "Loan Amount" FROM "loanTransactions" AS l WHERE l.loan_disbursement_date >= '${fromDate}' AND l.loan_disbursement_date <= '${toDate}' AND l."loanStatus" IN ('Complete', 'Active')`;
      if (isRowData == 'true') {
        dynamicQuery = `SELECT l."userId" AS "User ID", l."id" AS "Loan ID", TO_DATE(l."loan_disbursement_date", 'YYYY-MM-DDTHH24:MI:SS') AS "Disbursement date", l."netApprovedAmount" AS "Loan Amount", l."loanStatus" AS "Loan status" FROM "loanTransactions" AS l WHERE l.loan_disbursement_date >= '${fromDate}' AND l.loan_disbursement_date <= '${toDate}' AND l."loanStatus" IN ('Complete', 'Active') ORDER BY l.id ASC ${limitquery}`;
      }
      const userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(l."id") as cnt FROM "loanTransactions" AS l WHERE l.loan_disbursement_date >= '${fromDate}' AND l.loan_disbursement_date <= '${toDate}' AND l."loanStatus" IN ('Complete', 'Active')`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData[0].cnt;
      }
      userData.forEach((ele) => {
        ele['Loan Amount'] = ele['Loan Amount'] ?? 0;
        ele['Loan Amount'] = ele['Loan Amount']
          ? this.typeService.amountNumberWithCommas(
              parseInt(ele['Loan Amount']),
            )
          : '0';
      });
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [userData],
          sheetName: 'Disburse loan.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return { rows: userData, count: counts };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async repaymentLoanReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? 'false';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      let dynamicQuery = `SELECT COUNT(DISTINCT t."userId") AS "User Count", COUNT(DISTINCT t."loanId") AS "Loan Count", COUNT(DISTINCT COALESCE(t."emiId"::varchar(255), CONCAT(t."loanId"::varchar(255),'-1'))) AS "EMI Count", SUM(t."paidAmount") as "Total amount", SUM(t."principalAmount") as "Principal amount", SUM(t."interestAmount") as "Interest amount", SUM(t."penaltyAmount") as "Penalty amount" FROM "TransactionEntities" AS t WHERE t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" >= '${fromDate}' AND t."completionDate" <= '${toDate}'`;
      if (isRowData == 'true') {
        dynamicQuery = `SELECT t."userId" AS "User ID", t."loanId" AS "Loan ID", t."emiId" AS "EMI ID", t."paidAmount" AS "Total amount", t."principalAmount" AS "Principal amount", t."interestAmount" AS "Interest amount", t."penaltyAmount" AS "Penalty amount", TO_DATE(t."completionDate", 'YYYY-MM-DDTHH24:MI:SS') AS "Repaid date", t.type AS "Type" FROM "TransactionEntities" AS t WHERE t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" >= '${fromDate}' AND t."completionDate" <= '${toDate}' ORDER BY t.id ASC ${limitquery}`;
      }
      const userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(t."id") AS "cnt" FROM "TransactionEntities" AS t WHERE t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" >= '${fromDate}' AND t."completionDate" <= '${toDate}'`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData[0].cnt;
      }
      userData.forEach((ele) => {
        if (ele['EMI ID'] !== undefined) ele['EMI ID'] = ele['EMI ID'] ?? '-';
        ele['Total amount'] = ele['Total amount'] ?? 0;
        ele['Principal amount'] = ele['Principal amount'] ?? 0;
        ele['Interest amount'] = ele['Interest amount'] ?? 0;
        ele['Penalty amount'] = ele['Penalty amount'] ?? 0;
        let mSum = (
          ele['Principal amount'] +
          ele['Interest amount'] +
          ele['Penalty amount']
        ).toFixed(2);
        ele['Miss Match Amount'] = ele['Total amount'] - mSum;
        ele['Miss Match Amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Miss Match Amount']),
        );
        ele['Total amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Total amount']),
        );
        ele['Principal amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Principal amount']),
        );
        ele['Interest amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Interest amount']),
        );
        ele['Penalty amount'] = this.typeService.amountNumberWithCommas(
          parseInt(ele['Penalty amount']),
        );
      });
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [userData],
          sheetName: 'Repayment loan report.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return { rows: userData, count: counts };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getBadDebtsLoanReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? 'false';
      const download = query?.download ?? 'false';
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == 'true' && download == 'false') {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      const dynamicQuery = `SELECT h.*, SUM(COALESCE(r."paidAmount", 0)) AS "Refund EMI total" FROM (SELECT e."userId" AS "User ID", e."loanId" AS "Loan ID", e.id AS "EMI ID", e."emiNumber" AS "EMI #", TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "EMI date", e."principalCovered" AS "EMI principal amount", e."interestCalculate" AS "EMI interest amount", (e."principalCovered" + e."interestCalculate") AS "Total EMI amount", TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') AS "As on delay days", e.pay_type AS "EMI type", e."payment_done_date" AS "Repaid Date",
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayInterest" ELSE 0 END) as "Fully Paid EMI interest", 
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayPrincipal" ELSE 0 END) as "Fully Paid EMI principal",
      (CASE WHEN e.pay_type = 'FULLPAY' AND e."payment_done_date" <= '${toDate}' THEN e."fullPayPenalty" ELSE 0 END) as "Fully Paid EMI penalty", MIN(TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE((COALESCE(t."completionDate", e.emi_date)), 'YYYY-MM-DDTHH24:MI:SS')) AS "Last payment days", SUM(COALESCE(t."paidAmount", 0)) AS "Paid EMI total" FROM "EmiEntities" AS e LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${toDate}' WHERE e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' AND (e.payment_done_date >= '${toDate}' OR e.payment_done_date IS NULL) AND TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') > 90 GROUP BY e.id) AS h LEFT JOIN "TransactionEntities" AS r ON r."emiId" = h."EMI ID" AND r.status = 'COMPLETED' AND r.type = 'REFUND' WHERE h."Last payment days" > 90 GROUP BY h."EMI ID", h."User ID", h."Loan ID", h."EMI #", h."EMI date", h."EMI principal amount", h."EMI interest amount", h."Total EMI amount", h."As on delay days", h."EMI type", h."Repaid Date", h."Fully Paid EMI interest", h."Fully Paid EMI principal", h."Fully Paid EMI penalty", h."Last payment days", h."Paid EMI total" ${limitquery}`;
      const userData = await this.emiRepo.injectRawQuery(dynamicQuery);
      if (userData == k500Error) return kInternalError;
      let counts = userData.length;
      if (isRowData == 'true' && download == 'false') {
        let countQuery = `SELECT COUNT(t1.id) as cnt FROM (SELECT e.id, min(TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE((COALESCE(t."completionDate", e.emi_date)), 'YYYY-MM-DDTHH24:MI:SS')) AS "Last payment days" FROM "EmiEntities" AS e LEFT JOIN "TransactionEntities" AS t ON t."emiId" = e.id AND t.status = 'COMPLETED' AND t.type != 'REFUND' AND t."completionDate" <= '${toDate}' WHERE e.emi_date >= '${fromDate}' AND e.emi_date <= '${toDate}' AND (e.payment_done_date >= '${toDate}' OR e.payment_done_date IS NULL) AND TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE(e."emi_date", 'YYYY-MM-DDTHH24:MI:SS') > 90 GROUP BY e.id) AS t1 WHERE t1."Last payment days" > 90`;
        const countData = await this.emiRepo.injectRawQuery(countQuery);
        if (countData == k500Error) return kInternalError;
        counts = countData[0].cnt;
      }
      let result: any = {
        'User count': [],
        'Loan count': [],
        'EMI count': 0,
        'EMI principal amount': 0,
        'EMI interest amount': 0,
        'Total EMI amount': 0,
        'Paid User count': [],
        'Paid Loan count': [],
        'Paid EMI count': 0,
        'Paid EMI total': 0,
        'Paid EMI principal': 0,
        'Paid EMI interest': 0,
        'Paid EMI penalty': 0,
        'Outstanding EMI principal': 0,
        'Outstanding EMI interest': 0,
      };
      userData.forEach((ele) => {
        ele['Repaid Date'] = ele['Repaid Date'] ?? '-';
        ele['EMI type'] = ele['EMI type'] ?? '-';
        ele['Total EMI amount'] = ele['Total EMI amount'] ?? 0;
        ele['EMI principal amount'] = ele['EMI principal amount'] ?? 0;
        ele['EMI interest amount'] = ele['EMI interest amount'] ?? 0;
        let fullPayTotal =
          ele['Fully Paid EMI principal'] +
          ele['Fully Paid EMI interest'] +
          ele['Fully Paid EMI penalty'];
        ele['Fully Paid EMI total'] = fullPayTotal;
        ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        ele['Paid EMI total'] = ele['Paid EMI total'] ?? 0;
        if (ele['Total EMI amount'] <= ele['Paid EMI total'])
          ele['Refund EMI total'] = Math.abs(ele['Refund EMI total']) ?? 0;
        else ele['Refund EMI total'] = 0;
        ele['Paid EMI principal'] = 0;
        ele['Paid EMI interest'] = 0;
        ele['Paid EMI penalty'] = 0;
        ele['Paid EMI total'] =
          ele['Paid EMI total'] - ele['Refund EMI total'] + fullPayTotal;

        let remainingPaid = 0;
        if (ele['Paid EMI total'] > 0) {
          if (ele['EMI principal amount'] >= ele['Paid EMI total']) {
            ele['Paid EMI principal'] = ele['Paid EMI total'];
          } else {
            remainingPaid = ele['EMI principal amount'] - ele['Paid EMI total'];
            ele['Paid EMI principal'] = remainingPaid;
            if (remainingPaid < 0) {
              ele['Paid EMI principal'] = ele['EMI principal amount'];
              remainingPaid = Math.abs(remainingPaid);
              ele['Paid EMI interest'] = remainingPaid;
              remainingPaid = ele['EMI interest amount'] - remainingPaid;
              if (remainingPaid < 0) {
                ele['Paid EMI interest'] = ele['EMI interest amount'];
                ele['Paid EMI penalty'] = Math.abs(remainingPaid);
              }
            }
          }
        }

        ele['Outstanding EMI principal'] =
          ele['EMI principal amount'] - ele['Paid EMI principal'];
        ele['Outstanding EMI interest'] =
          ele['EMI interest amount'] - ele['Paid EMI interest'];
        if (isRowData == 'true') {
          ele['Total EMI amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Total EMI amount']),
          );
          ele['EMI principal amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI principal amount']),
          );
          ele['EMI interest amount'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['EMI interest amount']),
          );
          ele['Paid EMI total'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI total']),
          );
          ele['Paid EMI principal'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI principal']),
          );
          ele['Paid EMI interest'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI interest']),
          );
          ele['Paid EMI penalty'] = this.typeService.amountNumberWithCommas(
            parseInt(ele['Paid EMI penalty']),
          );
          ele['Outstanding EMI principal'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI principal']),
            );
          ele['Outstanding EMI interest'] =
            this.typeService.amountNumberWithCommas(
              parseInt(ele['Outstanding EMI interest']),
            );
        } else {
          if (!result['User count'].includes(ele['User ID']))
            result['User count'].push(ele['User ID']);
          if (!result['Loan count'].includes(ele['Loan ID']))
            result['Loan count'].push(ele['Loan ID']);
          result['EMI count']++;
          result['EMI principal amount'] += parseInt(
            ele['EMI principal amount'],
          );
          result['EMI interest amount'] += parseInt(ele['EMI interest amount']);
          result['Total EMI amount'] += parseInt(ele['Total EMI amount']);
          result['Paid EMI total'] += parseInt(ele['Paid EMI total']);
          result['Paid EMI principal'] += parseInt(ele['Paid EMI principal']);
          result['Paid EMI interest'] += parseInt(ele['Paid EMI interest']);
          result['Paid EMI penalty'] += parseInt(ele['Paid EMI penalty']);
          result['Outstanding EMI principal'] += parseInt(
            ele['Outstanding EMI principal'],
          );
          result['Outstanding EMI interest'] += parseInt(
            ele['Outstanding EMI interest'],
          );
          if (ele['EMI principal amount'] == ele['Paid EMI principal']) {
            if (!result['Paid User count'].includes(ele['User ID']))
              result['Paid User count'].push(ele['User ID']);
            if (!result['Paid Loan count'].includes(ele['Loan ID']))
              result['Paid Loan count'].push(ele['Loan ID']);
            result['Paid EMI count']++;
          }
        }
      });

      if (isRowData == 'false') {
        result['User count'] = result['User count'].length;
        result['Loan count'] = result['Loan count'].length;
        result['Paid User count'] = result['Paid User count'].length;
        result['Paid Loan count'] = result['Paid Loan count'].length;
        result['Total EMI amount'] = result['Total EMI amount']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Total EMI amount']),
            )
          : '0';
        result['EMI principal amount'] = result['EMI principal amount']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['EMI principal amount']),
            )
          : '0';
        result['EMI interest amount'] = result['EMI interest amount']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['EMI interest amount']),
            )
          : '0';
        result['Paid EMI total'] = result['Paid EMI total']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Paid EMI total']),
            )
          : '0';
        result['Paid EMI principal'] = result['Paid EMI principal']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Paid EMI principal']),
            )
          : '0';
        result['Paid EMI interest'] = result['Paid EMI interest']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Paid EMI interest']),
            )
          : '0';
        result['Paid EMI penalty'] = result['Paid EMI penalty']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Paid EMI penalty']),
            )
          : '0';
        result['Outstanding EMI principal'] = result[
          'Outstanding EMI principal'
        ]
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Outstanding EMI principal']),
            )
          : '0';
        result['Outstanding EMI interest'] = result['Outstanding EMI interest']
          ? this.typeService.amountNumberWithCommas(
              parseInt(result['Outstanding EMI interest']),
            )
          : '0';
        result = [result];
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [result],
            sheetName: 'Bad debts loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;
          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: result, count: result.length };
        }
      } else {
        if (download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [userData],
            sheetName: 'Bad debts loan.xlsx',
            needFindTuneKey: false,
          };
          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;
          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileUrl: url };
        } else {
          return { rows: userData, count: counts };
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funUserCategorizationReport() {
    try {
      const predictionInclude = {
        model: PredictionEntity,
        where: { categorizationScore: { [Op.ne]: null } },
        attributes: [
          'id',
          'loanId',
          'categorizationScore',
          'categorizationTag',
        ],
      };
      const emiInclude = {
        model: EmiEntity,
        where: { partOfemi: 'FIRST' },
        attributes: [
          'id',
          'partOfemi',
          'payment_status',
          'emi_date',
          'payment_status',
          'payment_due_status',
        ],
        required: false,
      };

      const data = await this.loanRepo.getTableWhereData(
        [
          'id',
          'netApprovedAmount',
          'loanStatus',
          'loan_disbursement_date',
          'createdAt',
          'verifiedDate',
        ],
        {
          where: {
            loanStatus: { [Op.in]: ['Active', 'Complete', 'Rejected'] },
            predictionId: { [Op.ne]: null },
          },
          include: [predictionInclude, emiInclude],
        },
      );
      if (data == k500Error) return kInternalError;
      let finalData = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const loan = data[i];
          const emiData = loan?.emiData[0];
          const predictionData = loan.predictionData;
          let repayment = '-';
          let paymentOn = '-';
          if (emiData) {
            if (emiData.payment_status == '1') repayment = 'Done';
            else repayment = 'Pending';
            if (emiData.payment_due_status == '1') paymentOn = 'Delay';
            else if (
              emiData.payment_due_status == '0' &&
              emiData.payment_status == '1'
            )
              paymentOn = 'On-time';
          }
          const passData = {
            LoanId: loan.id,
            'Approved amount': loan.netApprovedAmount
              ? this.typeService.amountNumberWithCommas(
                  (+loan.netApprovedAmount).toFixed(2),
                )
              : '-',

            'Loan disbursement date': loan?.loan_disbursement_date
              ? this.typeService.getDateFormatted(loan.loan_disbursement_date)
              : '-',
            'Loan created': loan?.createdAt
              ? this.typeService.getDateFormatted(loan.createdAt)
              : '-',
            'Loan verified': loan?.verifiedDate
              ? this.typeService.getDateFormatted(loan.verifiedDate)
              : '-',
            'Loan status': loan.loanStatus,
            'First emi date': emiData?.emi_date
              ? this.typeService.getDateFormatted(emiData.emi_date)
              : '-',
            'First emi repayment': repayment,
            'First emi type': paymentOn,
            'Category score': predictionData?.categorizationScore,
            Category: predictionData?.categorizationTag,
          };
          finalData.push(passData);
        } catch (error) {}
      }
      const rawData = {
        sheets: [`User category.xlsx`],
        data: [finalData],
        sheetName: 'User category' + '.xlsx',
      };
      return await this.typeService._objectToExcel(rawData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async coolOffUsers(reqData) {
    try {
      const today = this.typeService.getGlobalDate(new Date()).toJSON();

      const masterInclude: { model; attributes?; where? } = {
        model: MasterEntity,
      };
      masterInclude.attributes = ['coolOffData', 'otherInfo', 'id', 'status'];
      masterInclude.where = {
        coolOffData: { coolOffEndsOn: { [Op.gt]: today } },
        otherInfo: { salaryInfo: { [Op.gte]: 30000 } },
      };
      const include = [masterInclude];

      const attributes = ['fullName', 'id', 'phone'];
      const options = { include };

      const userList = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      const userIds = [];
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const coolOffData = masterData.coolOffData ?? {};
          const statusData = masterData.status ?? {};
          const masterId = masterData.id;
          coolOffData.coolOffEndsOn = this.typeService
            .getGlobalDate(new Date())
            .toJSON();
          if (statusData.loan == 6 || statusData.loan == 7) continue;
          if (statusData.loan != 2) {
            statusData.loan == 2;
          }
          const updatedData = { coolOffData, status: statusData };

          if (reqData.removeCoolOff?.toString() == 'true') {
            await this.masterRepo.updateRowData(updatedData, masterId);
          }

          const preparedData = {
            fullName: userData.fullName ?? '-',
            phone: this.cryptService.decryptPhone(userData.phone),
            salary: masterData.otherInfo?.salaryInfo ?? '-',
          };
          preparedList.push(preparedData);
          userIds.push(userData.id);
        } catch (error) {}
      }

      const rawExcelData = {
        sheets: ['Cool off report'],
        data: [preparedList],
        sheetName: 'Cool off report.xlsx',
      };
      await this.fileService.objectToExcel(rawExcelData);

      return { userIds };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async disbursementWiseDetails(reqData) {
    try {
      const startDate = reqData?.startDate ?? new Date();
      const endDate = reqData?.endDate ?? new Date();
      // Get data from database
      const loanList: any = await this.getDataForDisbursementWiseDetails(
        reqData,
      );
      if (loanList?.message) return loanList;
      const finalizedList = [];
      for (let index = 0; index < loanList.rows.length; index++) {
        const loanData = loanList.rows[index];
        const approvedAdminData = await this.commonSharedService.getAdminData(
          loanData.manualVerificationAcceptId,
        );
        const emiList = loanData.emiData ?? [];
        const cibilData = loanData.cibilData ?? {};
        const disbursementData = (loanData.disbursementData ?? [])[0];
        const disbursementDateInfo = this.dateService.dateToReadableFormat(
          loanData.loan_disbursement_date,
        );
        // Paid amount calculcation
        const transList = loanData.transactionData ?? [];
        let repaidAmount = 0;
        let totalPenalty = 0;
        transList.forEach((el) => {
          if (el.type == 'REFUND') repaidAmount -= el.paidAmount;
          else {
            repaidAmount += el.paidAmount;
            totalPenalty += el.penaltyAmount ?? 0;
          }
        });
        repaidAmount = parseFloat(repaidAmount.toFixed(2));
        // Processing fees calculation
        const processingPerc = loanData.processingFees;
        let processFees = (+loanData.netApprovedAmount * processingPerc) / 100;
        processFees = parseFloat(processFees.toFixed(2));
        const rawProcessingData = parseFloat(
          ((processFees * 100) / 118).toFixed(2),
        );
        const gstData = parseFloat(((rawProcessingData * 18) / 100).toFixed(2));
        const CGST = parseFloat((gstData / 2).toFixed(2));
        const SGST = parseFloat((gstData / 2).toFixed(2));
        let processingFeesIncome = parseFloat(
          (processFees - CGST - SGST).toFixed(2),
        );
        processingFeesIncome = parseFloat(processingFeesIncome.toFixed(2));
        const userData = loanData.registeredUsers ?? {};
        const preparedData = {
          Name: userData.fullName ?? '',
          'Loan ID': loanData.id,
          userId: loanData.userId,
          'Approved amount': loanData.netApprovedAmount,
          'Disbursement amount': disbursementData?.amount
            ? this.typeService
                .amountNumberWithCommas(disbursementData.amount / 100)
                .toString()
            : '-',
          'Loan disbursement date': disbursementDateInfo.readableStr,
          'Loan status': loanData.loanStatus,
          'Repaid amount': repaidAmount,
          'Total penalty': 0,
          // 1
          'EMI 1 due date': '',
          'EMI 1 repay date': '',
          'EMI 1 Principal': '',
          'EMI 1 Interest': '',
          'EMI 1 Deferred Interest': '',
          'EMI 1 Bounce Charge': '',
          'EMI 1 Penalty': '',
          'EMI 1 Legal Charge': '',
          // 2
          'EMI 2 due date': '',
          'EMI 2 repay date': '',
          'EMI 2 Principal': '',
          'EMI 2 Interest': '',
          'EMI 2 Deferred Interest': '',
          'EMI 2 Bounce Charge': '',
          'EMI 2 Penalty': '',
          'EMI 2 Legal Charge': '',
          // 3
          'EMI 3 due date': '',
          'EMI 3 repay date': '',
          'EMI 3 Principal': '',
          'EMI 3 Interest': '',
          'EMI 3 Deferred Interest': '',
          'EMI 3 Bounce Charge': '',
          'EMI 3 Penalty': '',
          'EMI 3 Legal Charge': '',
          // 4
          'EMI 4 due date': '',
          'EMI 4 repay date': '',
          'EMI 4 Principal': '',
          'EMI 4 Interest': '',
          'EMI 4 Deferred Interest': '',
          'EMI 4 Bounce Charge': '',
          'EMI 4 Penalty': '',
          'EMI 4 Legal Charge': '',
          'Stamp duty': this.typeService.amountNumberWithCommas(
            loanData.stampFees,
          ),
          'Processing fees income':
            this.typeService.amountNumberWithCommas(processingFeesIncome),
          CGST: this.typeService.amountNumberWithCommas(CGST),
          SGST: this.typeService.amountNumberWithCommas(SGST),
          'Total processing fees':
            this.typeService.amountNumberWithCommas(processFees),
          'Payment done date': '',
          'Cibil score': cibilData.cibilScore ?? '-',
          'PL score': cibilData.plScore ?? '-',
          'Approved by': approvedAdminData.fullName ?? '',
        };

        // EMI wise calculation
        let paymentDate = null;
        emiList.forEach((el) => {
          const key = `EMI ${el.emiNumber} `;
          if (el.totalPenalty > 0) el.bounceCharge = 0;
          const principalAmount = el.principalCovered;
          const interestAmount = el.interestCalculate;
          let expDeferredInt = el.regInterestAmount ?? 0;
          let expBounceCharge =
            (el.bounceCharge ?? 0) + (el.gstOnBounceCharge ?? 0);
          let expPenalCharge =
            (el.totalPenalty ?? 0) +
            (el.dpdAmount ?? 0) +
            (el.penaltyChargesGST ?? 0);
          let expLegalCharge = (el.legalCharge ?? 0) + (el.legalChargeGST ?? 0);
          expBounceCharge = this.typeService.manageAmount(expBounceCharge);
          expDeferredInt = this.typeService.manageAmount(expDeferredInt);
          expLegalCharge = this.typeService.manageAmount(expLegalCharge);
          expPenalCharge = this.typeService.manageAmount(expPenalCharge);

          const dueDateInfo = this.dateService.dateToReadableFormat(
            el.emi_date,
          );
          preparedData[key + 'due date'] = dueDateInfo.readableStr;
          preparedData[key + 'Principal'] = principalAmount
            ? this.typeService.amountNumberWithCommas(principalAmount)
            : '-';
          preparedData[key + 'Interest'] = interestAmount
            ? this.typeService.amountNumberWithCommas(interestAmount)
            : '-';
          preparedData[key + 'Penalty'] = expPenalCharge
            ? this.typeService.amountNumberWithCommas(expPenalCharge)
            : '-';
          preparedData[key + 'Deferred Interest'] = expDeferredInt
            ? this.typeService.amountNumberWithCommas(expDeferredInt)
            : '-';
          preparedData[key + 'Bounce Charge'] = expBounceCharge
            ? this.typeService.amountNumberWithCommas(expBounceCharge)
            : '-';
          preparedData[key + 'Legal Charge'] = expLegalCharge
            ? this.typeService.amountNumberWithCommas(expLegalCharge)
            : '-';
          totalPenalty += expPenalCharge;
          if (el.payment_done_date) {
            const paymentDateInfo = this.dateService.dateToReadableFormat(
              el.payment_done_date,
            );
            preparedData[key + 'repay date'] = paymentDateInfo.readableStr;
            if (!paymentDate) paymentDate = new Date(el.payment_done_date);
            else if (paymentDate.getTime() < new Date(el.payment_done_date)) {
              paymentDate = new Date(el.payment_done_date);
            }
          }
        });
        // Penalty calculation
        preparedData['Total penalty'] = parseFloat(totalPenalty.toFixed(2));
        // Payment date calculation
        if (paymentDate) {
          const paymentDateInfo =
            this.dateService.dateToReadableFormat(paymentDate);
          preparedData['Payment done date'] = paymentDateInfo.readableStr;
        }

        finalizedList.push(preparedData);
      }

      // Generate excel url
      const isDownload = reqData.download?.toString() == 'true';
      if (isDownload) {
        const path = 'Disbursement report.xlsx';
        const rawExcelData = {
          sheets: ['Disbursement report'],
          data: [finalizedList],
          sheetName: path,
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const excelResponse: any = await this.fileService.objectToExcelURL(
          rawExcelData,
        );
        if (excelResponse?.message) return excelResponse;
        const updatedData = { downloadUrl: excelResponse, status: '1' };
        const downloadId = reqData.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: excelResponse };
      }

      return { rows: finalizedList, count: loanList.count };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForDisbursementWiseDetails(reqData) {
    // Params validation
    let minDate = reqData.startDate;
    if (!minDate) return kParamMissing('startDate');
    minDate = new Date(minDate);
    if (isNaN(minDate.getTime())) return kInvalidParamValue('minDate');
    let maxDate = reqData.endDate;
    maxDate = new Date(maxDate);
    if (isNaN(maxDate.getTime())) return kInvalidParamValue('maxDate');
    if (minDate.getTime() > maxDate.getTime())
      return k422ErrorMessage(
        'minDate value can not be greater than max value',
      );
    const isDownload = reqData.download?.toString() == 'true';
    const page = reqData.page;
    if (!isDownload && !page) return kParamMissing('page');
    const searchData: any = await this.common.getSearchData(reqData.searchText);

    // Table joins
    // EMI table
    const emiInclude: { model; attributes? } = {
      model: EmiEntity,
    };
    emiInclude.attributes = [
      'emi_date',
      'emiNumber',
      'interestCalculate',
      'payment_done_date',
      'penalty',
      'principalCovered',
      'regInterestAmount',
      'paidRegInterestAmount',
      'bounceCharge',
      'gstOnBounceCharge',
      'paidBounceCharge',
      'totalPenalty',
      'dpdAmount',
      'penaltyChargesGST',
      'paidPenalCharge',
      'legalCharge',
      'legalChargeGST',
      'paidLegalCharge',
    ];
    // Disbursement table
    const disbursementInclude: { model; attributes? } = {
      model: disbursementEntity,
    };
    disbursementInclude.attributes = ['amount'];
    // Transaction table
    const transInclude: { model; attributes?; required?; where? } = {
      model: TransactionEntity,
    };
    transInclude.required = false;
    transInclude.where = { status: kCompleted };
    transInclude.attributes = ['paidAmount', 'penaltyAmount', 'type'];
    // Cibil score table
    const cibilInclude: SequelOptions = { model: CibilScoreEntity };
    cibilInclude.attributes = ['cibilScore', 'id', 'plScore'];
    cibilInclude.required = false;
    // User table
    const userInclude: SequelOptions = {
      model: registeredUsers,
    };
    userInclude.attributes = ['fullName'];
    // Search by user's name
    if (searchData.text != '' && searchData.type == 'Name') {
      userInclude.where = { fullName: { [Op.iRegexp]: searchData.text } };
    } // Search by user's phone number
    else if (searchData.text != '' && searchData.type == 'Number') {
      userInclude.where = { phone: { [Op.like]: searchData.text } };
    }
    const include = [
      emiInclude,
      disbursementInclude,
      transInclude,
      userInclude,
      cibilInclude,
    ];
    // Columns
    const attributes = [
      'charges',
      'id',
      'loan_disbursement_date',
      'loanFees',
      'loanStatus',
      'manualVerificationAcceptId',
      'netApprovedAmount',
      'processingFees',
      'stampFees',
      'userId',
    ];
    // Offset
    const offset = page * PAGE_LIMIT - PAGE_LIMIT;
    // Options
    const options: any = {
      include,
      limit: PAGE_LIMIT,
      offset,
      order: [['id', 'DESC']],
      where: {
        loan_disbursement_date: {
          [Op.gte]: minDate.toJSON(),
          [Op.lte]: maxDate.toJSON(),
        },
        loan_disbursement: '1',
      },
    };
    // Search by loanId
    if (searchData.text != '' && searchData.type == 'LoanId') {
      options.where.id = searchData.text;
    }
    if (isDownload) {
      delete options.limit;
      delete options.offset;
    }
    // Query
    const loanList = await this.loanRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (loanList == k500Error) return kInternalError;

    return loanList;
  }

  async legalCollections(reqData) {
    try {
      const data: any = await this.getDataForLegalCollections(reqData);
      if (data?.message) return data;

      const loanList = data.loanList;
      const legalList = data.legalList;

      const preparedList = [];
      const transactionList = [];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const loanId = loanData.id;
          let legalDataList = legalList.filter((el) => el.loanId == loanId);
          legalDataList = legalDataList.sort((b, a) => a.id - b.id);
          const transList = loanData.transactionData ?? [];
          const summonsData = legalDataList.find((el) => el.type == 6);
          const userData = loanData.registeredUsers ?? {};
          const warrantData = legalDataList.find((el) => el.type == 7);

          const preparedData: any = {
            loanId,
            name: userData.fullName ?? '',
            phone: this.cryptService.decryptPhone(userData.phone),
            loanStatus: loanData.loanStatus,
            paymentBeforeSummons: 0,
            summonsDate: '-',
            paymentAfterSummons: 0,
            warrantDate: '-',
            paymentAfterWarrant: 0,
            refundAmount: 0,
            followerName:
              (await this.commonSharedService.getAdminData(loanData.followerId))
                .fullName ?? '',
          };

          // Summons data
          if (summonsData && summonsData.createdAt) {
            const summonsDateInfo = this.dateService.dateToReadableFormat(
              summonsData.createdAt,
            );
            preparedData.summonsDate = summonsDateInfo.readableStr;
          }

          // Warrant data
          if (warrantData && warrantData.createdAt) {
            const warrantDateInfo = this.dateService.dateToReadableFormat(
              warrantData.createdAt,
            );
            preparedData.warrantDate = warrantDateInfo.readableStr;
          }

          const summonsDate =
            preparedData.summonsDate == '-'
              ? null
              : this.typeService.getGlobalDate(summonsData.createdAt);
          const warrantDate =
            preparedData.warrantDate == '-'
              ? null
              : this.typeService.getGlobalDate(warrantData.createdAt);
          for (let i = 0; i < transList.length; i++) {
            const transData = transList[i];
            const paidDate = this.typeService.getGlobalDate(
              new Date(transData.completionDate),
            );
            const paidAmount = transData.paidAmount;
            transactionList.push({
              loanId,
              paidAmount,
              paidDate:
                this.dateService.dateToReadableFormat(paidDate).readableStr,
            });

            if (transData.type == 'REFUND') {
              preparedData.refundAmount += Math.abs(paidAmount);
              continue;
            }

            // Payment received after summons
            if (summonsDate && summonsDate.getTime() <= paidDate.getTime()) {
              // Payment received after warrant
              if (warrantDate && warrantDate.getTime() <= paidDate.getTime()) {
                preparedData.paymentAfterWarrant += paidAmount;
              } // Payment received after summons
              else preparedData.paymentAfterSummons += paidAmount;
            } else preparedData.paymentBeforeSummons += paidAmount;
          }

          preparedList.push(preparedData);
        } catch (error) {}
      }

      // Generating excel
      const rawExcelData = {
        sheets: ['Legal collections'],
        data: [preparedList],
        sheetName: 'Legal collections.xlsx',
      };
      await this.fileService.objectToExcel(rawExcelData);

      // Generating excel for transactions
      const rawExcelData1 = {
        sheets: ['Legal collections payments'],
        data: [transactionList],
        sheetName: 'Legal collections payments.xlsx',
      };
      await this.fileService.objectToExcel(rawExcelData1);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForLegalCollections(reqData) {
    const type = reqData.type;
    let startDate;
    let endDate;
    let loanIds = [];
    let transIds = [];
    if (type == 'payment') {
      startDate = reqData.startDate;
      if (!startDate) return kParamMissing('startDate');
      endDate = reqData.endDate;
      if (!endDate) return kParamMissing('endDate');
    }
    if (startDate && endDate) {
      if (type == 'payment') {
        const attributes = ['id', 'loanId'];
        const options = {
          where: {
            completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
            status: kCompleted,
          },
        };
        const transList = await this.transRepo.getTableWhereData(
          attributes,
          options,
        );
        if (transList == k500Error) return kInternalError;
        transIds = transList.map((el) => el.id);
        loanIds = transList.map((el) => el.loanId);
      }
    }

    const emiInclude: SequelOptions = { model: EmiEntity };
    emiInclude.where = { payment_due_status: '1' };
    if (type) {
      emiInclude.where.loanId = { [Op.in]: loanIds };
    }
    emiInclude.attributes = ['id'];
    let include = [emiInclude];
    let attributes = ['id'];
    let options: any = {
      order: [['id', 'DESC']],
      include,
      where: { loanStatus: { [Op.in]: ['Active', 'Complete'] } },
    };

    let loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) return kInternalError;
    loanIds = loanList.map((el) => el.id);

    const legalList = await this.legalRepo.getTableWhereData(
      ['createdAt', 'loanId', 'type'],
      {
        where: { loanId: { [Op.in]: loanIds }, type: { [Op.in]: [6, 7] } },
      },
    );
    if (legalList == k500Error) return kInternalError;
    loanIds = legalList.map((el) => el.loanId);
    loanIds = [...new Set(loanIds)];

    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['fullName', 'phone'];
    const transInclude: SequelOptions = { model: TransactionEntity };
    transInclude.attributes = ['completionDate', 'paidAmount', 'type'];
    if (!type) transInclude.where = { status: kCompleted };
    else transInclude.where = { id: transIds };
    transInclude.required = false;
    include = [transInclude, userInclude];
    attributes = ['followerId', 'id', 'loanStatus'];
    options = { include, order: [['id', 'DESC']], where: { id: loanIds } };
    loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) return kInternalError;

    return { loanList, legalList };
  }

  async reportHistory(reqData) {
    try {
      const reportName = reqData?.reportName ?? '';
      const fromDate = reqData?.fromDate;
      const toDate = reqData?.toDate;
      const download = reqData?.download ?? false;
      const status = reqData?.status;
      let page = reqData?.page ?? 1;
      const attributes = [
        'adminId',
        'fromDate',
        'toDate',
        'createdAt',
        'status',
        'reportName',
        'downloadUrl',
      ];
      let options: any = { where: {}, order: [['id', 'DESC']] };
      if (reportName) {
        options.where = { reportName };
      }
      if (status == 'PENDING') options.where.status = '0';
      else if (status == 'COMPLETED') options.where.status = '1';
      else if (status == 'FAILED') options.where.status = '2';
      else if (status == 'IN-PROCESS') options.where.status = '3';
      if (fromDate && toDate) {
        let startDate = await this.typeService.getGlobalDate(fromDate).toJSON();
        let endDate = await this.typeService.getGlobalDate(toDate).toJSON();
        let range = await this.typeService.getUTCDateRange(startDate, endDate);
        options.where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      }
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const reportData = await this.reportHistoryRepo.getTableCountWhereData(
        attributes,
        options,
      );
      if (reportData == k500Error) return kInternalError;
      reportData.rows = await this.prepareReportHistory(reportData);
      return { count: reportData?.count, rows: reportData?.rows };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareReportHistory(reportData) {
    try {
      const finalData = [];
      for (let index = 0; index < reportData.rows.length; index++) {
        try {
          const statusMap = {
            0: 'Pending',
            1: 'Completed',
            2: 'Failed',
            3: 'In-process',
          };

          const element = reportData.rows[index];
          const tempData: any = {};
          tempData['Report Name'] = element?.reportName ?? '-';
          tempData['Admin Name'] =
            (await this.commonSharedService.getAdminData(element?.adminId))
              ?.fullName ?? '-';
          tempData['Report Date'] = '-';
          if (element?.fromDate && element?.toDate) {
            tempData['Report Date'] =
              this.typeService.getDateFormatted(element.fromDate) +
              ' to ' +
              this.typeService.getDateFormatted(element.toDate);
          }
          tempData['Status'] = statusMap[element?.status] ?? '-';
          tempData['Download'] = element?.downloadUrl ?? '-';

          let createdDate = this.dateService.dateToReadableFormat(
            element?.createdAt,
          );
          let createdDateFormat = '';
          if (createdDate) {
            createdDateFormat =
              createdDate.readableStr +
              ' ' +
              createdDate.hours +
              ':' +
              createdDate.minutes +
              ' ' +
              createdDate.meridiem;
          }

          tempData['Created Date'] = createdDateFormat;

          finalData.push(tempData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {}
  }

  async caseWiseAmount() {
    const targetPath = './upload/report/case_wise.xlsx';
    const targetList: any = await this.fileService.excelToArray(targetPath);
    if (targetList?.message) return targetList;

    const finalizedList = [];
    for (let index = 0; index < targetList.length; index++) {
      try {
        const targetData = targetList[index];
        const loanId = targetData['Loan id'];

        const caseFileDate = this.typeService.getGlobalDate(
          targetData['CASE FILED ON'],
        );
        // Fullpay amount
        let fullPayAmount = 0;
        let attributes = ['paidAmount'];
        let options: any = {
          order: [['id', 'DESC']],
          where: {
            loanId,
            status: kFailed,
            type: 'FULLPAY',
            remarks: 'LEGAL_PROCESS',
          },
        };
        const transData = await this.transRepo.getRowWhereData(
          attributes,
          options,
        );
        if (transData && transData != k500Error) {
          fullPayAmount = Math.floor(transData.paidAmount);
        }

        attributes = ['completionDate', 'paidAmount'];
        options = { where: { loanId, status: kCompleted } };
        const transList = await this.transRepo.getTableWhereData(
          attributes,
          options,
        );
        if (transList == k500Error) continue;
        let beforeCaseFileAmount = 0;
        let afterCaseFileAmount = 0;

        for (let i = 0; i < transList.length; i++) {
          try {
            const transData = transList[i];
            const paidDate = new Date(transData.completionDate);

            if (paidDate.getTime() >= caseFileDate.getTime()) {
              afterCaseFileAmount += transData.paidAmount;
            } else beforeCaseFileAmount += transData.paidAmount;
          } catch (error) {}
        }

        beforeCaseFileAmount = Math.floor(beforeCaseFileAmount);
        afterCaseFileAmount = Math.floor(afterCaseFileAmount);

        finalizedList.push({
          loanId,
          fullPayAmount,
          beforeCaseFileAmount,
          afterCaseFileAmount,
        });
      } catch (error) {}
    }

    const rawExcelData = {
      sheets: ['Casewise'],
      data: [finalizedList],
      sheetName: 'Casewise.xlsx',
    };
    const url = await this.fileService.objectToExcelURL(rawExcelData);
  }

  async fetchAutoDebitFailedByRange(body) {
    try {
      let searchText = body?.searchText;
      const dateRange = this.typeService.getUTCDateRange(
        body.startDate,
        body.endDate,
      );
      const end_date = dateRange.endDate.substring(0, 10);
      // transaction entity
      const transAttr = ['paidAmount', 'createdAt'];
      const transWhere = {
        status: 'FAILED',
        subSource: 'AUTODEBIT',
        completionDate: { [Op.eq]: null },
      };
      const trans_start_date = new Date(body.startDate).getDate();
      const trans_end_date = new Date(body.endDate).getDate();

      if (trans_start_date === trans_end_date) {
        transWhere['transactionId'] = {
          [Op.iLike]: '%' + end_date + '%',
        };
      } else {
        transWhere['createdAt'] = {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        };
      }

      let page = body.page ? body.page : 1;
      const transOptions: any = {
        where: transWhere,
        include: [{ model: registeredUsers, attributes: ['id', 'fullName'] }],
      };

      if (body.download !== 'false') {
        transOptions['offset'] = page * PAGE_LIMIT - PAGE_LIMIT;
        transOptions['limit'] = PAGE_LIMIT;
      }
      if (searchText) {
        transOptions.include.where = { fullName: { [Op.iRegexp]: searchText } };
      }
      const autoDebitFailed =
        await this.transactionRepo.getTableWhereDataWithCounts(
          transAttr,
          transOptions,
        );
      if (!autoDebitFailed || autoDebitFailed == k500Error) return k500Error;

      let pushAutoDebitFailed = [];
      autoDebitFailed.rows.forEach((trans) => {
        pushAutoDebitFailed.push({
          userId: trans.userData.id,
          Name: trans.userData.fullName,
          Date: moment(trans.createdAt).format('DD MMM, Y'),
          Amount: trans.paidAmount
            ? this.typeService.amountNumberWithCommas(trans.paidAmount)
            : '-',
        });
      });

      if (body.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [pushAutoDebitFailed],
          sheetName: 'Autodebit Failed Report.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate: body?.startDate ?? new Date(),
          endDate: body?.endDate ?? new Date(),
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = body.downloadId ? body.downloadId : '0';
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        autoDebitFailed.rows = pushAutoDebitFailed;
      }

      return autoDebitFailed;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async collectionPaymentByAdmin(startDate, endDate, adminId, searchText) {
    try {
      if (adminId) {
        const rawData = await this.rawDataCollectionPayment(
          startDate,
          endDate,
          adminId,
          searchText,
        );
        const filteredData = [];
        for (let index = 0; index < rawData.length; index++) {
          try {
            const element = rawData[index];
            const paymentData: any = await this.getPaymentformatedJSon(
              element,
              adminId,
            );
            if (paymentData == k500Error) continue;
            if (paymentData && paymentData.length) {
              paymentData.map((ele) => {
                filteredData.push(ele);
              });
            }
          } catch (error) {}
        }
        let totalAmount: any = 0;
        filteredData.map((ele) => {
          totalAmount += +ele.amount;
        });
        totalAmount = Math.floor(totalAmount?.toFixed(2) ?? 0.0);
        return { totalAmount, paymentData: filteredData };
      }
      const result = await this.loanRepo.getTableWhereData(['followerId'], {
        where: {
          followerId: { [Op.ne]: null },
        },
        group: ['followerId'],
      });

      const adminIdArr: any = [
        ...new Set(result.map((item) => item.followerId)),
      ];

      let whereCondition: any = {
        id: adminIdArr,
      };
      if (searchText) {
        whereCondition = { fullName: { [Op.iRegexp]: searchText } };
      }

      const adminData = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        {
          where: whereCondition,
        },
      );
      return adminData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region get raw data for collection payment
  async rawDataCollectionPayment(startDate, endDate, adminId, searchText) {
    try {
      startDate = this.typeService.getGlobalDate(startDate).toJSON();
      endDate = this.typeService.getGlobalDate(endDate).toJSON();

      const include: any = [
        {
          model: registeredUsers,
          attributes: ['fullName', 'id'],
        },
        {
          model: EmiEntity,
          attributes: [
            'emi_date',
            'id',
            'penalty_days',
            'emi_amount',
            'pay_type',
            'payment_due_status',
            'penalty_update_date',
          ],
        },
        {
          model: TransactionEntity,
          attributes: [
            'adminId',
            'paidAmount',
            'completionDate',
            'updatedAt',
            'emiId',
            'subSource',
            'type',
          ],
          where: {
            completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
            status: 'COMPLETED',
          },
        },
      ];

      if (searchText) {
        include[0].where = { fullName: { [Op.iRegexp]: searchText } };
      }
      const option = {
        where: { followerId: adminId },
        include,
      };
      const att = ['id'];
      const result = await this.loanRepo.getTableWhereData(att, option);
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getPaymentformatedJSon(data, adminId) {
    try {
      const filteredData = [];
      const emiList: any[] = data.emiData ?? [];
      emiList.sort((a, b) => a.id - b.id);
      const userData = data.registeredUsers;
      const transList = data.transactionData;
      transList.forEach((el) => {
        try {
          const transData: any = {
            amount: Math.floor(el.paidAmount),
            paidDate: el.completionDate,
            name: userData.fullName,
            completionDate: el.updatedAt,
            userId: userData.id,
            loanId: data.id,
            type: el.type,
          };
          const emiId = el.emiId;
          if (emiId) {
            const index = emiList.findIndex((el) => el.id == emiId);
            transData.emiNumber =
              index == 0 ? '1st' : index == 1 ? '2nd' : '3rd';
            transData.delayDays = emiList[index].penalty_days;
            const emiDate = new Date(emiList[index].emi_date);
            transData.dueDate = this.typeService.dateToJsonStr(emiDate);
          } else {
            let delayDays = 0;
            let startDate;
            emiList.forEach((el, index) => {
              try {
                const isFullPaid = el.pay_type == 'FULLPAY';
                if (isFullPaid) {
                  if (
                    el.payment_due_status === '1' &&
                    el?.penalty_update_date
                  ) {
                    const date = new Date(el.emi_date);
                    const date1 = new Date(el?.penalty_update_date);
                    if (!startDate) startDate = date;
                    if (startDate.getTime() < date.getTime()) startDate = date;
                    const diffDays = this.typeService.differenceInDays(
                      startDate,
                      date1,
                    );
                    startDate = date1;
                    delayDays += diffDays;
                  }

                  if (!transData.dueDate) {
                    const emiDate = new Date(emiList[index].emi_date);
                    transData.dueDate = this.typeService.dateToJsonStr(emiDate);
                  }
                  if (!transData.emiNumber)
                    transData.emiNumber = transData.emiNumber =
                      index == 0 ? '1st' : index == 1 ? '2nd' : '3rd';
                  else {
                    const trail =
                      index == 0 ? '1st' : index == 1 ? '2nd' : '3rd';
                    transData.emiNumber += ' & ' + trail;
                  }
                }
              } catch (error) {}
            });
            transData.delayDays = delayDays;
          }
          if (transData.delayDays) {
            let canAdd = true;
            if (el.subSource == 'AUTODEBIT' && el.adminId != adminId)
              canAdd = false;
            if (canAdd) filteredData.push(transData);
          }
        } catch (error) {}
      });
      return filteredData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getCoolOfPeriodData(body) {
    try {
      const page = body?.page ?? 1;
      const download = body?.download ?? 'false';
      const downloadId = body?.downloadId ?? '0';
      let searchText = body.searchText ?? '';
      const toDay = this.typeService.getGlobalDate(new Date());

      const attributes = [
        'id',
        'fullName',
        'phone',
        'email',
        'completedLoans',
        'gender',
        'NextDateForApply',
        'periodDays',
        'isBlacklist',
        'city',
        'state',
      ];
      const masterInclude: SequelOptions = {
        model: MasterEntity,
        attributes: ['coolOffData'],
        where: {
          coolOffData: {
            coolOffEndsOn: {
              [Op.gt]: toDay.toJSON(),
            },
          },
        },
      };
      const options: any = {
        include: [masterInclude],
      };
      if (searchText) {
        if (!isNaN(searchText)) {
          searchText = await this.cryptService.encryptPhone(searchText);
          searchText = searchText.split('===')[1];
          options.where = { phone: { [Op.iRegexp]: searchText } };
        } else
          options.where = {
            [Op.or]: [
              { email: { [Op.iRegexp]: searchText } },
              { fullName: { [Op.iRegexp]: searchText } },
            ],
          };
      }
      if (download !== 'true') {
        options['limit'] = PAGE_LIMIT;
        options['offset'] = page * PAGE_LIMIT - PAGE_LIMIT;
      }
      const userData = await this.userRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      let newCoolOffRecord = [];
      userData?.rows?.forEach((userRes) => {
        const phone = this.cryptService.decryptPhone(userRes.phone);
        let salary = '';
        if (userRes?.employmentData?.salary) {
          salary = this.typeService.amountNumberWithCommas(
            userRes.employmentData.salary,
          );
        }

        var coolOffEndsOnDate = moment(
          userRes.masterData.coolOffData.coolOffEndsOn,
        );
        var todayDate = moment();
        const remainingDays = coolOffEndsOnDate.diff(todayDate, 'days');

        let coolOffStartedOn = moment(
          userRes.masterData.coolOffData.coolOffStartedOn,
        ).format('DD-MM-Y');
        let coolOffEndsOn = moment(
          userRes.masterData.coolOffData.coolOffEndsOn,
        ).format('DD-MM-Y');

        newCoolOffRecord.push({
          userId: userRes?.id,
          Name: userRes.fullName,
          Phone: phone,
          Email: userRes.email,
          'Remaining Days': remainingDays,
          'Start Date': coolOffStartedOn,
          'End Date': coolOffEndsOn,
          'Completed Loan': userRes.completedLoans,
          City: userRes.city,
          State: userRes.state,
        });
      });

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [newCoolOffRecord],
          sheetName: 'CoolOff User.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        userData.rows = newCoolOffRecord;
        return userData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getDeclinedUserLoanData(query) {
    try {
      let searchText = query?.searchText ?? '';
      const dateRange = this.typeService.getUTCDateRange(
        query.startDate,
        query.endDate,
      );
      const empInclude = {
        model: employmentDetails,
        attributes: ['id', 'companyName', 'salary'],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['otherInfo'],
      };
      const cibilInclude = {
        model: CibilScoreEntity,
        attributes: ['id', 'cibilScore', 'plScore'],
        required: false,
      };
      const kycInclude: SequelOptions = { model: KYCEntity };
      kycInclude.attributes = ['panCardNumber', 'aadhaarDOB', 'pincode'];
      const userInclude: any = {
        model: registeredUsers,
        attributes: [
          'email',
          'id',
          'fullName',
          'phone',
          'completedLoans',
          'city',
          'state',
          'lastCrm',
        ],
        include: [empInclude, masterInclude, kycInclude],
      };
      const loanDeclineInclude: any = {
        model: userLoanDecline,
        attributes: ['userDeclineReasonTitle'],
      };
      const attr = [
        'id',
        'loanStatus',
        'remark',
        'loanRejectReason',
        'verifiedDate',
        'manualVerificationAcceptId',
        'lastStage',
      ];
      const options: any = {
        where: {
          loanStatus: 'Rejected',
          verifiedDate: {
            [Op.gte]: dateRange.fromDate,
            [Op.lte]: dateRange.endDate,
          },
        },
        include: [userInclude, loanDeclineInclude, cibilInclude],
        order: [['verifiedDate', 'DESC']],
      };
      const page = +(query.page ?? 1);
      if (query.download !== 'true') {
        options['limit'] = PAGE_LIMIT;
        options['offset'] = page * PAGE_LIMIT - PAGE_LIMIT;
      }

      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString: any = searchText.substring(2);
        if (firstTwoLetters == 'l-' || firstTwoLetters == 'L-')
          options.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userInclude.where = { phone: { [Op.iRegexp]: searchText } };
          } else {
            userInclude.where = { fullName: { [Op.iRegexp]: searchText } };
          }
        }
      }
      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        attr,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (loanData.count == 0) return loanData;

      const finalData = [];
      for (let index = 0; index < loanData.rows.length; index++) {
        try {
          const loan = loanData.rows[index];
          const user = loan.registeredUsers;
          const cibilData = loan.cibilData;
          const masterData = user?.masterData;
          const rejectedStage = Object.keys(UserStage).find(
            (key) => UserStage[key] == loan.lastStage,
          );

          const phone = this.cryptService.decryptPhone(user.phone);
          let rejectReason = loan.remark ?? loan.loanRejectReason ?? '-';
          if (loan?.userDecline)
            rejectReason = loan?.userDecline?.userDeclineReasonTitle ?? '-';
          const rejectedBy = loan?.userDecline
            ? 'User'
            : (
                await this.commonSharedService.getAdminData(
                  loan?.manualVerificationAcceptId,
                )
              )?.fullName ?? '-';
          const lastCrmInfo = user?.lastCrm ?? {};

          const obj = {
            'User Id': user.id,
            'Loan Id': loan.id,
            Name: user.fullName,
            'Phone No.': phone,
            'Loan Count': user?.completedLoans ?? 0,
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            'Cibil Score': cibilData?.cibilScore ?? '-',
            'Pl Score': cibilData?.plScore ?? '-',
            City: user?.city ?? '-',
            State: user?.state ?? '-',
            'Company Name': user?.employmentData?.companyName ?? '-',
            Salary: user?.employmentData?.salary
              ? this.typeService.amountNumberWithCommas(
                  user.employmentData.salary,
                )
              : '-',
            'Reject Reason': rejectReason,
            'Rejected By': rejectedBy,
            'Decline stage': rejectedStage ?? '-',
            'Last Crm By': lastCrmInfo?.adminName ?? '-',
            'Last Crm Remark': lastCrmInfo?.remark ?? '-',
            'Last Crm Date': lastCrmInfo?.createdAt
              ? this.typeService.getDateFormatted(lastCrmInfo?.createdAt)
              : '-',
            'Decline Date': loan.verifiedDate
              ? this.typeService.getDateFormatted(loan.verifiedDate)
              : '-',
            Email: user.email ?? '',
            PAN: user?.kycData?.panCardNumber ?? '',
            DOB: user?.kycData?.aadhaarDOB ?? '',
            'Pin Code': user?.kycData?.pincode ?? '',
          };
          finalData.push(obj);
        } catch (error) {}
      }

      if (query.download && query.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Declined loan.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        loanData.rows = finalData;
        return loanData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAutoDebitAdmins() {
    try {
      const option = {
        where: { subSource: 'AUTODEBIT' },
        group: 'adminId',
      };
      let admins: any = await this.transactionRepo.getTableWhereData(
        ['adminId'],
        option,
      );
      if (admins === k500Error) return k500Error;
      admins = admins.filter((el) => el.adminId).map((el) => el.adminId);
      const adminData = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        { where: { id: admins } },
      );
      if (adminData === k500Error) return k500Error;
      return adminData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  // ------------------------    Start Defaulter Function ---------------------------
  async getDefaulterReport(reqData) {
    try {
      const loanData = await this.getDataForDefaulterReport(reqData);
      if (loanData.message) return loanData;
      const startDate = reqData?.startDate ?? new Date();
      const endDate = reqData?.endDate ?? new Date();
      const sDate = this.typeService.getGlobalDate(reqData.startDate).getTime();
      const eDate = this.typeService.getGlobalDate(reqData.endDate).getTime();
      const finalData: any = [];
      for (let i = 0; i < loanData.rows.length; i++) {
        try {
          let passData: any = {
            userId: '-',
            loanId: '-',
            loanCount: 0,
            name: '-',
            gender: '-',
            phone: '-',
            loanAmount: 0,
            platform: '-',
            processingFees: '-',
            stampDutyFees: '-',
            disbursedAmount: '-',
            accountNumber: '-',
            loanDisbursedDate: '-',
            emi1_due_date: '-',
            emi2_due_date: '-',
            emi3_due_date: '-',
            emi4_due_date: '-',
            totalPartPayment: 0,
            loanDuration: '-',
            // Total Remaining
            total_remaining_amount: 0,
            total_remaining_principal_amount: 0,
            total_remaining_interest_amount: 0,
            total_remaining_deferred_interest: 0,
            total_remaining_bounce_charge: 0,
            total_remaining_penalty_amount: 0,
            total_remaining_legal_charge: 0,
            total_remaining_interest_penalty_amount: 0,
            // EMI 1 Remaining
            emi1_remaining_total_amount: 0,
            emi1_remaining_principal_amount: 0,
            emi1_remaining_interest_amount: 0,
            emi1_remaining_deferred_charge: 0,
            emi1_remaining_bounce_charge: 0,
            emi1_remaining_penalty_amount: 0,
            emi1_remaining_legal_charge: 0,
            // EMI 2 Remaining
            emi2_remaining_total_amount: 0,
            emi2_remaining_principal_amount: 0,
            emi2_remaining_interest_amount: 0,
            emi2_remaining_deferred_charge: 0,
            emi2_remaining_bounce_charge: 0,
            emi2_remaining_penalty_amount: 0,
            emi2_remaining_legal_charge: 0,
            // EMI 3 Remaining
            emi3_remaining_total_amount: 0,
            emi3_remaining_principal_amount: 0,
            emi3_remaining_interest_amount: 0,
            emi3_remaining_deferred_charge: 0,
            emi3_remaining_bounce_charge: 0,
            emi3_remaining_penalty_amount: 0,
            emi3_remaining_legal_charge: 0,
            // EMI 4 Remaining
            emi4_remaining_total_amount: 0,
            emi4_remaining_principal_amount: 0,
            emi4_remaining_interest_amount: 0,
            emi4_remaining_deferred_charge: 0,
            emi4_remaining_bounce_charge: 0,
            emi4_remaining_penalty_amount: 0,
            emi4_remaining_legal_charge: 0,
            // Total Paid
            total_paid_amount: 0,
            total_paid_principal_amount: 0,
            total_paid_interest_amount: 0,
            total_paid_penalty_amount: 0,
            total_paid_bounce_charge: 0,
            total_paid_deferred_int: 0,
            total_paid_legal_charge: 0,
            // EMI 1 Paid
            emi1_paid_total_amount: 0,
            emi1_paid_principal_amount: 0,
            emi1_paid_interest_amount: 0,
            emi1_paid_deferred_int: 0,
            emi1_paid_bounce_charge: 0,
            emi1_paid_penalty_amount: 0,
            emi1_paid_legal_charge: 0,
            // EMI 2 Paid
            emi2_paid_total_amount: 0,
            emi2_paid_principal_amount: 0,
            emi2_paid_interest_amount: 0,
            emi2_paid_deferred_int: 0,
            emi2_paid_bounce_charge: 0,
            emi2_paid_penalty_amount: 0,
            emi2_paid_legal_charge: 0,
            // EMI 3 Paid
            emi3_paid_total_amount: 0,
            emi3_paid_principal_amount: 0,
            emi3_paid_interest_amount: 0,
            emi3_paid_deferred_int: 0,
            emi3_paid_bounce_charge: 0,
            emi3_paid_penalty_amount: 0,
            emi3_paid_legal_charge: 0,
            // EMI 4 Paid
            emi4_paid_total_amount: 0,
            emi4_paid_principal_amount: 0,
            emi4_paid_interest_amount: 0,
            emi4_paid_deferred_int: 0,
            emi4_paid_bounce_charge: 0,
            emi4_paid_penalty_amount: 0,
            emi4_paid_legal_charge: 0,
            //
            emi1_due_days: '-',
            emi2_due_days: '-',
            emi3_due_days: '-',
            emi4_due_days: '-',
            // penalty_perDay: 0,
            // penalty_percentage: '-',
            emi1_interestPerDay: '-',
            emi2_interestPerDay: '-',
            emi3_interestPerDay: '-',
            emi4_interestPerDay: '-',
            netBankingGrade: '-',
            disburseTransactionId: '-',
            email: '-',
            aadhaarAddress: '-',
            state: '-',
            companyName: '-',
            companyAddress: '-',
            sector: '-',
            designation: '-',
            purposeLoan: '-',
            nbfc: '-',
            employeename: '-',
            autoDebit: '-',
            noticeDate: '-',
            notice25C: '-',
            legalStatus: '-',
            hearingDate: '-',
            lastPaymentDate: '-',
            lastAction: '-',
            approvedBy: '-',
            lastCommentUser: '-',
            lastCommentDate: '-',
          };

          const loan = loanData.rows[i];
          const user = loan.registeredUsers;
          const bank = loan.bankingData;
          const emiData = loan.emiData;
          const empData = user.employmentData;
          passData.loanId = loan.id;
          passData.loanCount = user.completedLoans ?? 0;
          passData.userId = user.id;
          passData.name = user.fullName;
          passData.gender = user.gender;
          const phone = this.cryptService.decryptPhone(user.phone);
          passData.phone = phone;
          passData.loanAmount = this.typeService.amountNumberWithCommas(
            Math.floor(+loan.netApprovedAmount),
          );
          passData.processingFees = this.typeService.amountNumberWithCommas(
            loan.loanFees,
          );
          passData.stampDutyFees = this.typeService.amountNumberWithCommas(
            loan.stampFees,
          );
          passData.disbursedAmount = this.typeService.amountNumberWithCommas(
            this.calulateDisburseAmount(
              loan.netApprovedAmount,
              loan.loanFees,
              loan.stampFees,
            ),
          );
          passData.accountNumber = bank?.accountNumber;
          passData.loanDisbursedDate = this.typeService.dateToJsonStr(
            loan.loan_disbursement_date,
          );
          let legalStatus = '-';
          let noticeDate: any = '-';
          let hearingDate = '-';
          let notice25C = '-';
          if (emiData) emiData.sort((a, b) => a.id - b.id);
          // passData.penalty_perDay = 0;

          for (let j = 0; j < emiData.length; j++) {
            try {
              const emi = emiData[j];

              this.getEMIAndPaymentInsights(
                passData,
                emi,
                j,
                loan.transactionData ?? [],
              );
              passData[`emi${j + 1}_due_date`] = this.typeService.dateToJsonStr(
                emi.emi_date,
              );
              passData[`ecs${j + 1}_bounce_charge`] = emi.bounceCharge;

              passData[`emi${j + 1}_remaining_bounce_charge`] =
                this.typeService.manageAmount(
                  (emi.bounceCharge ?? 0) +
                    (emi.gstOnBounceCharge ?? 0) -
                    (emi.paidBounceCharge ?? 0),
                );

              passData[`emi${j + 1}_due_days`] =
                emi.payment_status == '1' ? '0' : emi?.penalty_days ?? 0;
              passData[`emi${j + 1}_interestPerDay`] =
                emi.payment_status == '1'
                  ? '0'
                  : (
                      (+emi.principalCovered * +loan.interestRate) /
                      100
                    )?.toFixed(2);
            } catch (error) {}
          }
          if (loan.legalId) {
            const legalData = loan.legalData;
            if (legalData) {
              legalStatus = legalString[legalData?.type];
              noticeDate = this.typeService.getDateFormatted(
                legalData.createdAt,
              );
              const trackingData = legalData.trackingData ?? [];
              if (trackingData) {
                if (trackingData?.status == 'Return')
                  notice25C = this.typeService.getDateFormatted(
                    trackingData.lastResponseDate,
                  );
              }
              if (legalData?.dates?.nextHearingDate)
                hearingDate = this.typeService.getDateFormatted(
                  new Date(legalData?.dates?.nextHearingDate),
                );
            }
          }
          const transList = loan.transactionData ?? [];
          if (transList.length > 0) {
            transList.sort(
              (b, a) =>
                new Date(a.completionDate).getTime() -
                new Date(b.completionDate).getTime(),
            );
            passData.lastPaymentDate = this.typeService.dateToJsonStr(
              new Date(transList[0].completionDate),
            );
          }
          transList.forEach((el) => {
            try {
              if (el.type == 'PARTPAY') {
                passData.totalPartPayment = Math.floor(
                  (passData.totalPartPayment ?? 0) + el.paidAmount,
                );
              }
            } catch (error) {}
          });

          passData.loanDuration = +loan.duration;
          // passData.penalty_percentage = +loan.interestRate * 2;
          passData.netBankingGrade = loan?.netBankingGrade ?? '-';
          passData.disburseTransactionId = loan?.disbursementData[0].payout_id;
          passData.email = user.email;
          passData.platform =
            EnvConfig?.platFormName?.app[user?.appType ?? 0] ?? '-';
          const address = this.typeService.getAadhaarAddress(user?.kycData);
          passData.aadhaarAddress = address.address;
          passData.city = address.dist;
          passData.state = address.state;
          passData.pincode = '-';
          passData.companyName = empData.companyName;
          passData.companyAddress = empData.companyAddress
            ? empData.companyAddress
            : '-';
          passData.sector = empData.sector?.sectorName;
          passData.designation = empData.designation?.designationName;
          passData['Employment information'] =
            empData?.employementTypeData?.typeName ?? '-';
          passData.purposeLoan = loan.purpose?.purposeName;
          passData.nbfc = EnvConfig.nbfc.nbfcShortName;
          passData.employeename = user.fullName;
          passData.autoDebit = this.checkAutodebitPlaced(emiData)
            ? 'Yes'
            : 'No';
          passData.noticeDate = noticeDate;
          passData.notice25C = notice25C;
          passData.legalStatus = legalStatus;
          passData.hearingDate = hearingDate;
          passData.lastAction = 'Not Found';
          passData.approvedBy = bank.netApproveByData.fullName;
          const lastCommentData: any = await this.lastCrmCommnet(user.id);
          passData.lastCommentUser = lastCommentData?.admin;
          passData.lastCommentDate = lastCommentData?.date;
          passData.typeAddress = this.getTypeAddress(user?.typeAddress);
          const locationData = this.getLastLocation(user?.locationData);
          passData.lastLiveLocation = locationData.targetStr;
          passData.zipcode = locationData.pinCode;
          this.typeService.fineTuneObject(passData);
          finalData.push(passData);
        } catch (error) {}
      }

      if (reqData.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Defaulter report.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = reqData.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }

      return { rows: finalData, count: loanData.count };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForDefaulterReport(reqData: any) {
    try {
      if (!reqData.startDate) return kParamMissing('startDate');
      if (!reqData.endDate) return kParamMissing('endDate');
      const sDate = this.typeService.getGlobalDate(reqData.startDate);
      const eDate = this.typeService.getGlobalDate(reqData.endDate);
      reqData.download = reqData?.download ?? 'false';
      reqData.page = reqData?.page ?? 1;

      const defaultEmis = await this.emiRepo.getTableWhereData(['loanId'], {
        where: {
          emi_date: {
            [Op.gte]: sDate.toJSON(),
            [Op.lte]: eDate.toJSON(),
          },
          payment_due_status: '1',
          payment_status: '0',
        },
        order: [['id', 'DESC']],
      });
      if (defaultEmis == k500Error) return kInternalError;

      let loanIds = defaultEmis.map((ele) => ele.loanId);
      loanIds = [...new Set(loanIds)];

      const kycInclude = {
        model: KYCEntity,
        attributes: ['id', 'aadhaarAddress', 'aadhaarAddressResponse'],
      };
      const empInclude = {
        model: employmentDetails,
        attributes: ['id', 'companyAddress', 'companyName'],
        include: [
          { model: employmentSector, attributes: ['sectorName'] },
          { model: employmentDesignation, attributes: ['designationName'] },
          { model: employmentType, attributes: ['typeName'] },
        ],
      };
      let userSearch = {};
      if (reqData.searchText)
        userSearch = {
          fullName: { [Op.iRegexp]: reqData.searchText },
        };
      const location = {
        model: LocationEntity,
        attributes: ['id', 'location', 'updatedAt'],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: [
          'id',
          'fullName',
          'completedLoans',
          'phone',
          'email',
          'gender',
          'typeAddress',
        ],
        where: userSearch,
        include: [kycInclude, empInclude, location],
        required: false,
      };
      const bankingInclude = {
        model: BankingEntity,
        attributes: ['id', 'accountNumber'],
        include: [
          {
            model: admin,
            attributes: ['id', 'fullName'],
            as: 'netApproveByData',
            required: false,
          },
        ],
        required: false,
      };
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_date',
          'emi_amount',
          'principalCovered',
          'interestCalculate',
          'legalId',
          'penalty',
          'bounceCharge',
          'penalty_days',
          'payment_done_date',
          'payment_due_status',
          'partPaymentPenaltyAmount',
          'payment_status',
          'regInterestAmount',
          'paidRegInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'paidBounceCharge',
          'totalPenalty',
          'dpdAmount',
          'penaltyChargesGST',
          'paidPenalCharge',
          'legalCharge',
          'legalChargeGST',
          'paidLegalCharge',
        ],
      };
      const purposeInclude = {
        model: loanPurpose,
        attributes: ['purposeName'],
        required: false,
      };
      const disInclude = {
        model: disbursementEntity,
        attributes: ['id', 'payout_id'],
        required: false,
      };
      const legalInclude = {
        model: LegalCollectionEntity,
        attributes: ['id', 'loanId', 'type', 'dates', 'createdAt'],
        order: [['id', 'DESC']],
        required: false,
        include: [
          {
            model: LegalConsigment,
            attributes: ['id', 'status', 'lastResponseDate'],
            order: [['id', 'DESC']],
            required: false,
          },
        ],
      };
      const transactionInclude = {
        model: TransactionEntity,
        attributes: [
          'paidAmount',
          'completionDate',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
          'emiId',
          'type',
          'regInterestAmount',
          'legalCharge',
          'bounceCharge',
          'penalCharge',
          'sgstOnBounceCharge',
          'cgstOnBounceCharge',
          'sgstOnPenalCharge',
          'cgstOnPenalCharge',
          'sgstOnLegalCharge',
          'cgstOnLegalCharge',
        ],
        where: { status: 'COMPLETED' },
        required: false,
      };
      const include = [
        emiInclude,
        purposeInclude,
        userInclude,
        bankingInclude,
        disInclude,
        legalInclude,
        transactionInclude,
      ];
      const options: any = {
        where: { id: loanIds, loanStatus: 'Active' },
        include,
        order: [['loan_disbursement_date', 'DESC']],
      };
      if (reqData.download != 'true') {
        options.offset = reqData.page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        [
          'id',
          'duration',
          'netApprovedAmount',
          'processingFees',
          'loanFees',
          'stampFees',
          'loan_disbursement_date',
          'interestRate',
          'netbankingGrade',
          'userId',
          'legalId',
        ],
        options,
      );
      if (loanData == k500Error) return kInternalError;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getEMIAndPaymentInsights(passData, emiData, index, transList) {
    try {
      // Transaction calculation
      const expectedEMIPrincipal = this.typeService.manageAmount(
        emiData.principalCovered ?? 0,
      );
      const expectedEMIInterest = this.typeService.manageAmount(
        emiData.interestCalculate ?? 0,
      );
      const remainingEMIBounceCharge = this.typeService.manageAmount(
        (emiData?.bounceCharge ?? 0) +
          (emiData?.gstOnBounceCharge ?? 0) -
          (emiData?.paidBounceCharge ?? 0),
      );
      const remainingEMIPenalty = this.typeService.manageAmount(
        (emiData.penalty ?? 0) +
          (emiData?.dpdAmount ?? 0) +
          (emiData?.penaltyChargesGST ?? 0) -
          (emiData?.paidPenalCharge ?? 0),
      );
      const remainingEMIDeferredInt = this.typeService.manageAmount(
        (emiData?.regInterestAmount ?? 0) -
          (emiData?.paidRegInterestAmount ?? 0),
      );
      const remainingEMILegalCharge = this.typeService.manageAmount(
        (emiData?.legalCharge ?? 0) +
          (emiData?.legalChargeGST ?? 0) -
          (emiData?.paidLegalCharge ?? 0),
      );
      let paidEMIAmount = 0;
      let paidEMIPrincipal = 0;
      let paidEMIInterest = 0;
      let paidDeferredInt = 0;
      let paidBounceCharge = 0;
      let paidEMIPenalty = 0;
      let paidLegalCharge = 0;

      for (let subIndex = 0; subIndex < transList.length; subIndex++) {
        try {
          const transData = transList[subIndex];
          if (emiData.id != transData.emiId) continue;
          paidEMIAmount += transData.paidAmount ?? 0;
          paidEMIPrincipal += transData.principalAmount ?? 0;
          paidEMIInterest += transData.interestAmount ?? 0;
          paidDeferredInt += transData.regInterestAmount ?? 0;
          paidBounceCharge +=
            (transData.bounceCharge ?? 0) +
            (transData.sgstOnBounceCharge ?? 0) +
            (transData.cgstOnBounceCharge ?? 0);
          paidEMIPenalty +=
            (transData.penaltyAmount ?? 0) +
            (transData.penalCharge ?? 0) +
            (transData.sgstOnPenalCharge ?? 0) +
            (transData.cgstOnPenalCharge ?? 0);
          paidLegalCharge +=
            (transData.legalCharge ?? 0) +
            (transData.cgstOnLegalCharge ?? 0) +
            (transData.sgstOnLegalCharge ?? 0);
        } catch (error) {}
      }

      // Paid stuff EMI wise
      paidEMIAmount = this.typeService.manageAmount(paidEMIAmount);
      paidEMIPrincipal = this.typeService.manageAmount(paidEMIPrincipal);
      paidEMIInterest = this.typeService.manageAmount(paidEMIInterest);
      paidDeferredInt = this.typeService.manageAmount(paidDeferredInt);
      paidBounceCharge = this.typeService.manageAmount(paidBounceCharge);
      paidEMIPenalty = this.typeService.manageAmount(paidEMIPenalty);
      paidLegalCharge = this.typeService.manageAmount(paidLegalCharge);
      passData[`emi${index + 1}_paid_total_amount`] = paidEMIAmount;
      passData[`emi${index + 1}_paid_principal_amount`] = paidEMIPrincipal;
      passData[`emi${index + 1}_paid_interest_amount`] = paidEMIInterest;
      passData[`emi${index + 1}_paid_deferred_int`] = paidDeferredInt;
      passData[`emi${index + 1}_paid_bounce_charge`] = paidBounceCharge;
      passData[`emi${index + 1}_paid_penalty_amount`] = paidEMIPenalty;
      passData[`emi${index + 1}_paid_legal_charge`] = paidLegalCharge;
      // Paid stuff loan wise
      const kTotalPaidAmnt = 'total_paid_amount';
      passData[kTotalPaidAmnt] =
        (passData[kTotalPaidAmnt] ?? 0) +
        paidEMIPrincipal +
        paidEMIInterest +
        paidDeferredInt +
        paidBounceCharge +
        paidEMIPenalty +
        paidLegalCharge;
      const kTotalPaidPrincipal = 'total_paid_principal_amount';
      passData[kTotalPaidPrincipal] =
        (passData[kTotalPaidPrincipal] ?? 0) + paidEMIPrincipal;
      const kTotalPaidInterest = 'total_paid_interest_amount';
      passData[kTotalPaidInterest] =
        (passData[kTotalPaidInterest] ?? 0) + paidEMIInterest;
      const kTotalPaidPenalty = 'total_paid_penalty_amount';
      passData[kTotalPaidPenalty] =
        (passData[kTotalPaidPenalty] ?? 0) + paidEMIPenalty;
      const kTotalPaidBounceCharge = 'total_paid_bounce_charge';
      passData[kTotalPaidBounceCharge] =
        (passData[kTotalPaidBounceCharge] ?? 0) + paidBounceCharge;
      const kTotalPaidDeferredInt = 'total_paid_deferred_int';
      passData[kTotalPaidDeferredInt] =
        (passData[kTotalPaidDeferredInt] ?? 0) + paidDeferredInt;
      const kTotalPaidLegalCharge = 'total_paid_legal_charge';
      passData[kTotalPaidLegalCharge] =
        (passData[kTotalPaidLegalCharge] ?? 0) + paidLegalCharge;

      // Remaining stuff EMI Wise
      const remainingEMIPrincipal = Math.floor(
        Math.abs(expectedEMIPrincipal - paidEMIPrincipal),
      );
      const remainingEMIInterest = Math.floor(
        Math.abs(expectedEMIInterest - paidEMIInterest),
      );
      // const remainingEMIPenalty = Math.floor(
      //   Math.abs(expectedEMIPenalty - paidEMIPenalty),
      // );
      passData[`emi${index + 1}_remaining_principal_amount`] =
        remainingEMIPrincipal;
      passData[`emi${index + 1}_remaining_interest_amount`] =
        remainingEMIInterest;
      passData[`emi${index + 1}_remaining_deferred_charge`] =
        remainingEMIDeferredInt;
      passData[`emi${index + 1}_remaining_penalty_amount`] =
        remainingEMIPenalty;
      passData[`emi${index + 1}_remaining_legal_charge`] =
        remainingEMILegalCharge;
      remainingEMIPenalty;
      passData[`emi${index + 1}_remaining_total_amount`] =
        remainingEMIPrincipal +
        remainingEMIInterest +
        remainingEMIDeferredInt +
        remainingEMIBounceCharge +
        remainingEMIPenalty +
        remainingEMILegalCharge;

      // Remaining stuff Loan wise
      const kTotalRemPrincipal = 'total_remaining_principal_amount';
      passData[kTotalRemPrincipal] =
        (passData[kTotalRemPrincipal] ?? 0) + remainingEMIPrincipal;
      const kTotalRemInterest = 'total_remaining_interest_amount';
      passData[kTotalRemInterest] =
        (passData[kTotalRemInterest] ?? 0) + remainingEMIInterest;
      const kTotalRemPenalty = 'total_remaining_penalty_amount';
      passData[kTotalRemPenalty] =
        (passData[kTotalRemPenalty] ?? 0) + remainingEMIPenalty;

      const kTotalRemDeferred = 'total_remaining_deferred_interest';
      passData[kTotalRemDeferred] =
        (passData[kTotalRemDeferred] ?? 0) + remainingEMIDeferredInt;
      const kTotalRemBounceCharge = 'total_remaining_bounce_charge';
      passData[kTotalRemBounceCharge] =
        (passData[kTotalRemBounceCharge] ?? 0) + remainingEMIBounceCharge;
      const kTotalRemLegalCharge = 'total_remaining_legal_charge';
      passData[kTotalRemLegalCharge] =
        (passData[kTotalRemLegalCharge] ?? 0) + remainingEMILegalCharge;

      const kTotalRemAmount = 'total_remaining_amount';
      passData[kTotalRemAmount] =
        (passData[kTotalRemAmount] ?? 0) +
        remainingEMIPrincipal +
        remainingEMIInterest +
        remainingEMIPenalty +
        remainingEMIBounceCharge +
        remainingEMIDeferredInt +
        remainingEMILegalCharge;
      const kTotalRemInterestPenalty =
        'total_remaining_interest_penalty_amount';
      passData[kTotalRemInterestPenalty] =
        (passData[kTotalRemInterestPenalty] ?? 0) +
        remainingEMIInterest +
        remainingEMIPenalty +
        remainingEMIDeferredInt +
        remainingEMILegalCharge +
        remainingEMIBounceCharge;
    } catch (error) {}
  }

  private calulateDisburseAmount(amount, loanFees, stampDutyfee) {
    try {
      return +amount - +loanFees - +stampDutyfee;
    } catch (error) {
      return 0;
    }
  }

  private checkAutodebitPlaced(emiData) {
    try {
      let isAutoDebitPlaced = true;
      emiData.forEach((ele) => {
        const transactionData = ele.transactionData.sort((a, b) => b.id - a.id);
        const lastFaildAutoDebit = transactionData.filter(
          (ele) => ele.subSource == 'AUTODEBIT',
        );
        for (let i = 0; i < lastFaildAutoDebit.length; i++) {
          try {
            const data = lastFaildAutoDebit[i];
            if (data.status == 'FAILED') {
              const response = JSON.parse(data.response);
              if (response.failureReason.indexOf('ACCOUNT CLOSED'))
                isAutoDebitPlaced = false;
            }
          } catch (error) {}
        }
      });
      return isAutoDebitPlaced;
    } catch (error) {
      return true;
    }
  }

  async lastCrmCommnet(userId) {
    try {
      const lastCrmComment = await this.crmRepo.getRowWhereData(
        ['id', 'remark', 'createdAt'],
        {
          where: { userId },
          order: [['id', 'DESC']],
          include: [
            { model: admin, attributes: ['id', 'fullName'], as: 'adminData' },
          ],
        },
      );
      if (!lastCrmComment || lastCrmComment == k500Error) return '-';
      return {
        date: this.typeService.dateToJsonStr(lastCrmComment.createdAt),
        admin: lastCrmComment.adminData.fullName,
      };
    } catch (error) {
      return '-';
    }
  }

  getTypeAddress(type) {
    let address = '-';
    try {
      const typeAddress = JSON.parse(type);
      if (typeAddress) {
        const flat = typeAddress['Flat / Block number'] ?? '';
        const socity = typeAddress['Society name'] ?? '';
        const Landmark = typeAddress['Landmark'] ?? '';
        if (flat) {
          address += flat;
          if (!address.endsWith(',')) address += ', ';
        }
        if (socity) {
          address += socity;
          if (!address.endsWith(',')) address += ', ';
        }
        if (Landmark) address += Landmark;
      }
    } catch (error) {}
    return address;
  }

  getLastLocation(locations) {
    let lblText = '-';
    try {
      locations.sort((b, a) => a.updatedAt.getTime() - b.updatedAt.getTime());
      lblText = locations[0]?.location;
      if (lblText != '-') {
        const spans = lblText.split(',');
        for (let index = 0; index < spans.length; index++) {
          try {
            const targetStr = spans[index];
            if (targetStr.length < 6) continue;
            if (!targetStr.includes(' ')) continue;
            const subSpans = targetStr.split(' ');
            for (let i = 0; i < subSpans.length; i++) {
              try {
                const textData = subSpans[i];
                if (textData.length != 6) continue;
                if (!isNaN(Number(textData))) {
                  return { targetStr: lblText, pinCode: textData };
                }
              } catch (error) {}
            }
          } catch (error) {}
        }
      }
    } catch (error) {}
    return { targetStr: lblText, pinCode: '-' };
  }
  // ------------------------     End Defaulter Function ---------------------------

  async emiRepayments(reqData: any) {
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    const needDownload = (reqData.download ?? 'false') == 'true';
    const limit = needDownload ? null : reqData.pageSize ?? PAGE_LIMIT;
    const offset = needDownload ? null : reqData.page * limit - limit;
    const searchText = reqData.searchText ?? '';

    const transactionInclude: any = { model: TransactionEntity };
    transactionInclude.required = false;
    transactionInclude.where = { status: 'COMPLETED' };
    transactionInclude.attributes = [
      'completionDate',
      'emiId',
      'paidAmount',
      'principalAmount',
      'interestAmount',
      'penaltyAmount',
      'regInterestAmount',
      'bounceCharge',
      'sgstOnBounceCharge',
      'cgstOnBounceCharge',
      'penalCharge',
      'sgstOnPenalCharge',
      'cgstOnPenalCharge',
      'legalCharge',
      'sgstOnLegalCharge',
      'cgstOnLegalCharge',
    ];
    const loanInclude: any = { model: loanTransaction };
    loanInclude.attributes = ['id'];
    loanInclude.include = [transactionInclude];

    const userInclude: any = { model: registeredUsers };
    userInclude.attributes = ['email', 'id', 'fullName', 'phone'];
    if (searchText?.length >= 2) {
      userInclude.where = { fullName: { [Op.iRegexp]: searchText } };
    }

    const attributes = [
      'emi_date',
      'id',
      'payment_status',
      'payment_due_status',
      'payment_done_date',
      'principalCovered',
      'interestCalculate',
      'penalty',
      'fullPayPrincipal',
      'fullPayInterest',
      'fullPayPenalty',
      'pay_type',
      'regInterestAmount',
      'paidRegInterestAmount',
      'bounceCharge',
      'gstOnBounceCharge',
      'paidBounceCharge',
      'totalPenalty',
      'dpdAmount',
      'penaltyChargesGST',
      'paidPenalCharge',
      'legalCharge',
      'legalChargeGST',
      'paidLegalCharge',
    ];
    let options: any = {
      include: [loanInclude, userInclude],
      where: { emi_date: { [Op.gte]: startDate, [Op.lte]: endDate } },
    };

    if (!needDownload) {
      (options.limit = limit), (options.offset = offset);
    }

    const emiListData = await this.emiRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    console.log({ emiListData });
    if (emiListData == k500Error) return kInternalError;

    const emiList = emiListData.rows ?? [];
    const finalizedList = [];
    for (let index = 0; index < emiList.length; index++) {
      try {
        const emiData = emiList[index];
        if (emiData.totalPenalty > 0) emiData.bounceCharge = 0;
        if (emiData.dpdAmount > 0) {
          let cGstOnPenal = this.typeService.manageAmount(
            (emiData.penaltyChargesGST ?? 0) / 2,
          );
          let sGstOnPenal = this.typeService.manageAmount(
            (emiData.penaltyChargesGST ?? 0) / 2,
          );
          emiData.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
        }
        const loanData = emiData.loan ?? {};
        const userData = emiData.user ?? {};
        const transList = loanData.transactionData ?? [];
        let expectedPrincipal = emiData.principalCovered ?? 0;
        let expectedInterest = emiData.interestCalculate ?? 0;
        let expectedPenalty =
          (+emiData?.totalPenalty ?? 0) +
          (+emiData.dpdAmount ?? 0) +
          (+emiData.penaltyChargesGST ?? 0) +
          (+emiData.bounceCharge ?? 0) +
          (+emiData.gstOnBounceCharge ?? 0) +
          (+emiData.regInterestAmount ?? 0) +
          (+emiData.legalCharge ?? 0) +
          (+emiData.legalChargeGST ?? 0);
        expectedPenalty = this.typeService.manageAmount(expectedPenalty);
        let expectedDueAmount =
          expectedPrincipal + expectedPenalty + expectedInterest;
        expectedDueAmount = Math.floor(expectedDueAmount);
        let totalPaidAmount: any = 0;
        let totalPaidPrincipal: any = 0;
        let totalPaidInterest: any = 0;
        let totalPaidPenalty: any = 0;

        // Payment stuff
        transList.sort(
          (b, a) =>
            new Date(a.completionDate).getTime() -
            new Date(b.completionDate).getTime(),
        );
        transList.forEach((el) => {
          try {
            const paidAmount = Math.floor(el.paidAmount ?? 0);
            const principalAmount = Math.floor(el.principalAmount ?? 0);
            const interestAmout = Math.floor(el.interestAmount ?? 0);
            const penaltyAmount =
              (el.penaltyAmount ?? 0) +
              (el.regInterestAmount ?? 0) +
              (el.bounceCharge ?? 0) +
              (el.sgstOnBounceCharge ?? 0) +
              (el.cgstOnBounceCharge ?? 0) +
              (el.penalCharge ?? 0) +
              (el.sgstOnPenalCharge ?? 0) +
              (el.cgstOnPenalCharge ?? 0) +
              (el.legalCharge ?? 0) +
              (el.sgstOnLegalCharge ?? 0) +
              (el.cgstOnLegalCharge ?? 0);
            if (emiData.id == el.emiId) {
              totalPaidAmount += paidAmount;
              totalPaidPrincipal += principalAmount;
              totalPaidInterest += interestAmout;
              totalPaidPenalty += penaltyAmount;
            } else if (!el.emiId && emiData.pay_type == 'FULLPAY') {
              totalPaidPrincipal += emiData.fullPayPrincipal;
              totalPaidInterest += emiData.fullPayInterest;
              totalPaidPenalty += emiData.fullPayPenalty;
              totalPaidAmount +=
                emiData.fullPayPrincipal +
                emiData.fullPayInterest +
                emiData.fullPayPenalty;
            }
          } catch (error) {}
        });

        let status = '';
        if (emiData.payment_status == '0') status = 'UNPAID';
        else {
          const paidDate = new Date(emiData.payment_done_date);
          const paidTime = paidDate.getTime();
          const dueTime = new Date(emiData.emi_date).getTime();
          if (paidTime > dueTime) status = 'POSTPAID';
          else if (paidTime == dueTime) status = 'ONTIME';
          else if (paidTime < dueTime) status = 'PREPAID';
        }

        expectedDueAmount =
          this.typeService.amountNumberWithCommas(expectedDueAmount);
        expectedPrincipal =
          this.typeService.amountNumberWithCommas(expectedPrincipal);
        expectedInterest =
          this.typeService.amountNumberWithCommas(expectedInterest);
        expectedPenalty = expectedPenalty
          ? this.typeService.amountNumberWithCommas(expectedPenalty)
          : '-';
        totalPaidAmount = totalPaidAmount
          ? this.typeService.amountNumberWithCommas(totalPaidAmount)
          : '-';
        totalPaidPrincipal = totalPaidPrincipal
          ? this.typeService.amountNumberWithCommas(totalPaidPrincipal)
          : '-';
        totalPaidInterest = totalPaidInterest
          ? this.typeService.amountNumberWithCommas(totalPaidInterest)
          : '-';
        totalPaidPenalty = totalPaidPenalty
          ? this.typeService.amountNumberWithCommas(totalPaidPenalty)
          : '-';

        const data: any = {
          userId: userData.id,
          name: userData.fullName,
          loanId: loanData.id,
          phone: this.cryptService.decryptPhone(userData.phone),
          email: userData.email,
          emiDate: this.typeService.dateToJsonStr(emiData.emi_date),
          status,
          expectedDueAmount,
          expectedPrincipal,
          expectedInterest,
          expectedPenalty,
          totalPaidAmount,
          totalPaidPrincipal,
          totalPaidInterest,
          totalPaidPenalty,
          paidDate: '',
        };

        if (emiData.payment_done_date) {
          data.paidDate = this.typeService.dateToJsonStr(
            new Date(emiData.payment_done_date),
          );
        }

        this.typeService.fineTuneObject(data);
        finalizedList.push(data);
      } catch (error) {}
    }

    if (needDownload) {
      const rawExcelData = {
        sheets: ['local-reports'],
        data: [finalizedList],
        sheetName: 'EMI Repayments.xlsx',
        needFindTuneKey: false,
        reportStore: true,
        startDate,
        endDate,
      };
      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;

      const updatedData = { downloadUrl: url, status: '1' };
      await this.reportHistoryRepo.updateRowData(
        updatedData,
        reqData.downloadId,
      );
      return { fileUrl: url };
    }

    return { count: emiListData.count, rows: finalizedList };
  }

  async eligibleForSettlements(reqData) {
    try {
      // Get the list
      const download = reqData?.download ?? 'false';
      const downloadId = reqData?.downloadId;
      const startDate = reqData?.startDate ?? new Date();
      const endDate = reqData?.endDate ?? new Date();
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'interestCalculate',
        'partPaymentPenaltyAmount',
        'penalty',
        'penalty_days',
        'principalCovered',
      ];
      const transactionInclude: any = { model: TransactionEntity };
      transactionInclude.attributes = ['paidAmount'];
      transactionInclude.where = {
        status: 'COMPLETED',
        type: { [Op.ne]: 'REFUND' },
      };
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['fullName', 'id'];
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['id'];
      loanInclude.include = [emiInclude, transactionInclude, userInclude];
      loanInclude.where = { loanStatus: 'Active' };
      const attributes = ['id'];
      const options = {
        include: [loanInclude],
        where: {
          payment_due_status: '1',
          payment_status: '0',
        },
      };
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      if (emiList == k500Error) return kInternalError;

      // Filtering the data based on needs
      const finalizedList: any[] = [];
      for (let index = 0; index < emiList.length; index++) {
        try {
          const element = emiList[index];
          const loanData = element.loan ?? {};
          const emiListData = loanData.emiData ?? [];
          const transList = loanData.transactionData ?? [];
          const userData = loanData.registeredUsers ?? {};
          let delayDays = 0;
          const expectedPrincipalAmount = emiListData.reduce(
            (accumulator, currentValue) => {
              const principalAmount = currentValue.principalCovered ?? 0;
              const interestAmount = currentValue.interestCalculate ?? 0;
              delayDays += currentValue.penalty_days ?? 0;
              return Math.floor(accumulator + principalAmount + interestAmount);
            },
            0,
          );
          const paidAmount = transList.reduce((accumulator, currentValue) => {
            return Math.floor(accumulator + currentValue.paidAmount);
          }, 0);
          if (paidAmount >= expectedPrincipalAmount) {
            // Prevents duplication of user
            const isExists = finalizedList.find(
              (el) => el.userId == userData.id,
            );
            if (!isExists)
              finalizedList.push({
                userId: userData.id,
                Name: userData.fullName,
                'Delay Days': delayDays,
                'Expected EMI amount': this.typeService.amountNumberWithCommas(
                  expectedPrincipalAmount,
                ),
                'Paid Amount':
                  this.typeService.amountNumberWithCommas(paidAmount),
              });
          }
        } catch (error) {}
      }
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalizedList],
          sheetName: 'Eligible for settlements.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return finalizedList;
    } catch (error) {}
  }

  async qualityParamsReport(body) {
    try {
      const download = body?.download ?? false;
      const downloadId = body?.downloadId ?? '0';
      const startDate = body?.startDate ?? new Date();
      const endDate = body?.endDate ?? new Date();
      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();

      const userInclude: any = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email', 'phone'],
      };
      const range = this.typeService.getUTCDateRange(fromDate, toDate);
      const attributes = [
        'id',
        'qualityParameters',
        'userId',
        'loan_disbursement_date',
      ];
      const options: any = {
        where: {
          qualityParameters: { [Op.ne]: null },
          loan_disbursement_date: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
        include: [userInclude],
        order: [['id', 'DESC']],
      };

      if (download != 'true') {
        const page = body.page || 1;
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }

      const getData = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (getData == k500Error) return kInternalError;
      await Promise.all(
        getData.rows.map(async (element, index) => {
          let adminId = element?.qualityParameters?.adminId;
          const adminData: any = await this.commonSharedService.getAdminData(
            adminId,
          );
          getData.rows[index].QualityBy = adminData.fullName;
        }),
      );

      const prepared = await this.prepareQualityParamsReport(getData.rows);
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [prepared],
          sheetName: 'Quality parameters.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        let counts = getData.count;
        return { rows: prepared, count: counts };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getUserData(ele) {
    try {
      const finalData = [];
      for (let index = 0; index < ele.length; index++) {
        try {
          const element = ele[index];
          const userData = await this.userRepo.getRowWhereData(
            ['id', 'fullName', 'phone'],
            {
              where: {
                id: element.userId,
              },
            },
          );
          const tempEle = {
            id: userData.id,
            phone: await this.cryptService.decryptPhone(userData.phone),
            fullName: userData.fullName,
            loanId: element.loanId,
          };
          finalData.push(tempEle);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getDataForExpected(start_date: string, end_date: string) {
    try {
      start_date = this.typeService
        .getGlobalDate(new Date(start_date))
        .toJSON();
      end_date = this.typeService.getGlobalDate(new Date(end_date)).toJSON();
      const dateRange = this.typeService.getUTCDateRange(start_date, end_date);
      const fromDate = dateRange.fromDate;
      const endDate = dateRange.endDate;
      const emiAmount = await this.getExpectedEMIamounts(start_date, end_date);
      if (emiAmount === k500Error) return k500Error;
      const paidAmount = await this.getPaidAmounts(
        start_date,
        end_date,
        fromDate,
        endDate,
      );
      if (paidAmount === k500Error) return k500Error;
      const finalData: any = {};
      let advanceEmiAmount =
        paidAmount - emiAmount.payedAmount - emiAmount.payedPenaltyAmount;
      let diffOfFullPaidAmount = 0;
      if (advanceEmiAmount < 0) {
        diffOfFullPaidAmount = advanceEmiAmount;
        advanceEmiAmount = 0;
      }
      finalData.expectedEmiAmount = emiAmount.expectedAmount.toFixed(2);
      finalData.paidEmiAmount = emiAmount.payedAmount.toFixed(2);
      finalData.unpaidEmiAmount = emiAmount.unpaidAmount.toFixed(2);
      finalData.advanceEmiAmount = advanceEmiAmount.toFixed(2);
      finalData.diffOfFullPaidAmount = diffOfFullPaidAmount.toFixed(2);
      finalData.expectedPenaltyAmount =
        emiAmount.expectedPenaltyAmount.toFixed(2);
      finalData.paidPenaltyAmount = emiAmount.payedPenaltyAmount.toFixed(2);
      finalData.unpaidPenaltyAmount = (
        emiAmount.expectedPenaltyAmount - emiAmount.payedPenaltyAmount
      ).toFixed(2);
      return finalData;
    } catch (e) {}
  }

  private async getExpectedEMIamounts(start_date, end_date) {
    try {
      let expectedAmount = 0;
      let payedAmount = 0;
      let expectedPenaltyAmount = 0;
      let payedPenaltyAmount = 0;
      const att: any = [
        [Sequelize.fn('sum', Sequelize.col('principalCovered')), 'principal'],
        [Sequelize.fn('sum', Sequelize.col('interestCalculate')), 'interest'],
        [
          Sequelize.fn('sum', Sequelize.col('regInterestAmount')),
          'deferredInt',
        ],
        [Sequelize.fn('sum', Sequelize.col('bounceCharge')), 'bounceCharge'],
        [
          Sequelize.fn('sum', Sequelize.col('gstOnBounceCharge')),
          'bounceChargeGST',
        ],
        [Sequelize.fn('sum', Sequelize.col('totalPenalty')), 'penalty'],
        [Sequelize.fn('sum', Sequelize.col('dpdAmount')), 'penalCharge'],
        [
          Sequelize.fn('sum', Sequelize.col('penaltyChargesGST')),
          'penaltyChargesGST',
        ],
        [Sequelize.fn('sum', Sequelize.col('legalCharge')), 'legalCharge'],
        [
          Sequelize.fn('sum', Sequelize.col('legalChargeGST')),
          'legalChargesGST',
        ],
        [
          Sequelize.fn('sum', Sequelize.col('partPaymentPenaltyAmount')),
          'payedPenalty',
        ],
        [Sequelize.fn('sum', Sequelize.col('paid_penalty')), 'paidPenalty'],
        [Sequelize.fn('sum', Sequelize.col('paidPenalCharge')), 'paidPenal'],
        [
          Sequelize.fn('sum', Sequelize.col('paidRegInterestAmount')),
          'paidDeferredInt',
        ],
        [
          Sequelize.fn('sum', Sequelize.col('paidBounceCharge')),
          'paidBounceCharge',
        ],
        [Sequelize.fn('sum', Sequelize.col('paidLegalCharge')), 'paidLegal'],
      ];
      // Removing Bounce Charge from totalPenalty;
      const attr: any = [
        [Sequelize.fn('sum', Sequelize.col('bounceCharge')), 'bounceCharge'],
      ];
      const oldUserWhere = {
        where: {
          totalPenalty: { [Op.gt]: 0 },
          bounceCharge: { [Op.gt]: 0 },
        },
      };
      const oldUserBounce = await this.emiRepo.getRowWhereData(
        attr,
        oldUserWhere,
      );
      const where: any = {
        emi_date: { [Op.gte]: start_date, [Op.lte]: end_date },
      };
      /// get Expected
      const getExpected = await this.emiRepo.getRowWhereData(att, { where });
      if (getExpected === k500Error) return k500Error;
      getExpected.penalty = getExpected?.penalty - oldUserBounce.bounceCharge;
      expectedAmount += getExpected?.principal ?? 0;
      expectedAmount += getExpected?.interest ?? 0;
      expectedPenaltyAmount += getExpected?.penalty ?? 0;
      expectedPenaltyAmount += getExpected?.deferredInt ?? 0;
      expectedPenaltyAmount += getExpected?.bounceCharge ?? 0;
      expectedPenaltyAmount += getExpected?.bounceChargeGST ?? 0;
      expectedPenaltyAmount += getExpected?.penalCharge ?? 0;
      expectedPenaltyAmount += getExpected?.penaltyChargesGST ?? 0;
      expectedPenaltyAmount += getExpected?.legalCharge ?? 0;
      expectedPenaltyAmount += getExpected?.legalChargesGST ?? 0;
      // payedPenaltyAmount += getExpected?.payedPenalty ?? 0;
      payedPenaltyAmount += getExpected?.paidPenalty ?? 0;
      payedPenaltyAmount += getExpected?.paidPenal ?? 0;
      payedPenaltyAmount += getExpected?.paidDeferredInt ?? 0;
      payedPenaltyAmount += getExpected?.paidBounceCharge ?? 0;
      payedPenaltyAmount += getExpected?.paidLegal ?? 0;

      // get advance payed amount
      where.payment_done_date = { [Op.lt]: start_date };
      const advancePay = await this.emiRepo.getRowWhereData(att, { where });
      if (advancePay === k500Error) return k500Error;
      advancePay.penalty = advancePay?.penalty - oldUserBounce.bounceCharge;
      expectedAmount -= advancePay?.principal ?? 0;
      expectedAmount -= advancePay?.interest ?? 0;
      expectedPenaltyAmount -= advancePay?.penalty ?? 0;
      expectedPenaltyAmount -= advancePay?.deferredInt ?? 0;
      expectedPenaltyAmount -= advancePay?.penalCharge ?? 0;
      expectedPenaltyAmount -= advancePay?.penaltyChargesGST ?? 0;
      expectedPenaltyAmount -= advancePay?.bounceCharge ?? 0;
      expectedPenaltyAmount -= advancePay?.bounceChargeGST ?? 0;
      expectedPenaltyAmount -= advancePay?.legalCharge ?? 0;
      expectedPenaltyAmount -= advancePay?.legalChargesGST ?? 0;
      // payedPenaltyAmount -= advancePay?.payedPenalty ?? 0;
      payedPenaltyAmount -= advancePay?.paidPenalty ?? 0;
      payedPenaltyAmount -= advancePay?.paidPenal ?? 0;
      payedPenaltyAmount -= advancePay?.paidDeferredInt ?? 0;
      payedPenaltyAmount -= advancePay?.paidBounceCharge ?? 0;
      payedPenaltyAmount -= advancePay?.paidLegal ?? 0;

      // get payed amount
      where.payment_done_date = { [Op.gte]: start_date, [Op.lte]: end_date };
      const getPaid = await this.emiRepo.getRowWhereData(att, { where });
      if (getPaid === k500Error) return k500Error;
      // getPaid.penalty = getPaid?.penalty - oldUserBounce.bounceCharge;
      payedAmount += getPaid?.principal ?? 0;
      payedAmount += getPaid?.interest ?? 0;
      // payedPenaltyAmount += getPaid?.penalty ?? 0;
      // payedPenaltyAmount += getPaid?.paidPenalty ?? 0;
      // payedPenaltyAmount += getPaid?.paidPenal ?? 0;
      // payedPenaltyAmount += getPaid?.paidDeferredInt ?? 0;
      // payedPenaltyAmount += getPaid?.paidBounceCharge ?? 0;
      // payedPenaltyAmount += getPaid?.paidLegal ?? 0;
      return {
        expectedAmount,
        payedAmount,
        unpaidAmount: expectedAmount - payedAmount,
        expectedPenaltyAmount,
        payedPenaltyAmount,
        unpaidPenaltyAmount: expectedPenaltyAmount - payedPenaltyAmount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async getPaidAmounts(start_date, end_date, fromDate, endDate) {
    try {
      let amount = 0;
      const att: any = [
        [Sequelize.fn('sum', Sequelize.col('paidAmount')), 'amount'],
      ];
      const where: any = {
        status: 'COMPLETED',
        completionDate: { [Op.gte]: start_date, [Op.lte]: end_date },
        type: { [Op.ne]: 'REFUND' },
      };
      const option = { where };

      // Transaction pay
      const getTransactionPay = await this.transactionRepo.getRowWhereData(
        att,
        option,
      );
      if (getTransactionPay !== k500Error)
        amount += +(getTransactionPay?.amount ?? 0);
      else console.log('getTransactionPay', getTransactionPay);

      return amount;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  // ------------------   End Varification Count ----------------------------

  async getkycRejectedUsersReport(
    startDate: string,
    endDate: string,
    page: number,
    searchText = '',
  ) {
    try {
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const userAttr = ['id', 'fullName', 'phone'];
      const offset = page * 10 - 10;
      let userSearch: any = {};
      if (searchText)
        userSearch = {
          [Op.or]: [
            {
              fullName: { [Op.iRegexp]: searchText },
            },
          ],
        };
      const userOptions = {
        where: userSearch,
        limit: 10,
        offset,
        include: [
          {
            model: KYCEntity,
            attributes: [
              'aadhaarStatus',
              'panStatus',
              'otherDocStatus',
              'updatedAt',
            ],
            order: [['updatedAt', 'DESC']],
            where: {
              updatedAt: {
                [Op.gte]: range.fromDate,
                [Op.lte]: range.endDate,
              },
              [Op.or]: [
                { aadhaarStatus: '2' },
                { panStatus: '2' },
                { panStatus: '2' },
              ],
            },
          },
        ],
      };
      const data = await this.userRepo.getTableWhereDataWithCounts(
        userAttr,
        userOptions,
      );

      let kycRejectedReport = [];
      data.rows.forEach(async (resportRes) => {
        const decryptedPhone = await this.cryptService.decryptPhone(
          resportRes.phone,
        );
        kycRejectedReport.push({
          userId: resportRes.id,
          name: resportRes.fullName,
          contact: decryptedPhone,
          aadhaarStatus: resportRes.kycData.aadhaarStatus,
          panStatus: resportRes.kycData.panStatus,
          otherDocStatus: resportRes.kycData.otherDocStatus,
          date: resportRes.kycData.updatedAt,
        });
      });

      data.rows = kycRejectedReport;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getNotAppliedAfterFullPayUsers(
    startDate,
    endDate,
    page,
    download,
    downloadId,
  ) {
    try {
      const fromDate = await this.typeService.getGlobalDate(startDate);
      const toDate = await this.typeService.getGlobalDate(endDate);
      const traAttributes = ['id', 'loanId', 'userId'];
      const traWhere = {
        where: {
          status: 'COMPLETED',
          type: 'FULLPAY',
          completionDate: {
            [Op.gte]: fromDate.toJSON(),
            [Op.lte]: toDate.toJSON(),
          },
        },
      };
      const traData = await this.transactionRepo.getTableWhereData(
        traAttributes,
        traWhere,
      );
      if (traData == k500Error) return k500Error;
      const userArr = [];
      traData.map((ele) => userArr.push(ele?.userId));
      const employmentInclude = {
        required: false,
        model: employmentDetails,
        attributes: ['id', 'companyName', 'salary'],
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus', 'updatedAt'],
      };
      const userAttributes = [
        'id',
        'fullName',
        'phone',
        'email',
        'gender',
        'completedLoans',
        'city',
        'isBlacklist',
      ];
      const userOptions = {
        where: {
          id: userArr,
        },
        include: [loanInclude, employmentInclude],
      };
      const userRecord = await this.userRepo.getTableWhereData(
        userAttributes,
        userOptions,
      );
      if (userRecord == k500Error) return k500Error;
      const date = await this.typeService.getGlobalDate(new Date());

      let pushRepaymentEmployee = [];
      for (let index = 0; index < userRecord.length; index++) {
        try {
          const element = userRecord[index];
          element.loanData.sort((a, b) => b.id - a.id);
          const loanData: any = element.loanData[0];
          if (loanData.loanStatus == 'Complete') {
            const completedDay = await this.typeService.dateDifference(
              loanData.updatedAt,
              date,
            );
            let phone = await this.cryptService.decryptPhone(element?.phone);

            pushRepaymentEmployee.push({
              userId: element.id,
              name: element.fullName,
              contact: phone,
              completedloans: element.completedLoans,
              city: element.city,
              companyName: element.employmentData?.companyName,
              salary: element.employmentData?.salary,
              cooloff_blackList: element.isBlacklist,
              completedDay: completedDay,
            });
            delete element.loanData;
          }
        } catch (error) {}
      }

      const skip1 = page * PAGE_LIMIT - PAGE_LIMIT;
      if (download != 'true') {
        pushRepaymentEmployee.slice(skip1, skip1 + PAGE_LIMIT);
      } else {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [pushRepaymentEmployee],
          sheetName: 'Not Applied After Repayment.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }

      return {
        count: pushRepaymentEmployee.length,
        rows: pushRepaymentEmployee,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async tallyDisbursement(reqData: any) {
    const targetListData = await this.getDisbursementData(reqData);
    if (targetListData.message) return targetListData;

    const disbursementList: any = this.fineTuneTallyDisbursement(
      targetListData.rows,
    );
    if (disbursementList.message) return disbursementList;

    const needDownload =
      reqData.download == 'true' || reqData.isDownload == 'true';
    if (disbursementList.length > 0 && needDownload) {
      const path = 'Tally report - Disbursement.xlsx';
      const rawExcelData = {
        sheets: ['Tally report - Disbursement'],
        data: [disbursementList],
        sheetName: path,
        needFindTuneKey: false,
      };
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;
      if (reqData.localPath) return excelResponse;
      const fileURL = await this.fileService.uploadFile(
        excelResponse.filePath,
        'reports',
        'xlsx',
      );
      if (fileURL?.message) return fileURL;
      if (!fileURL) return k422ErrorMessage('File can not be uploaded');
      const updatedData = { downloadUrl: fileURL, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileURL };
    } else if (!needDownload)
      return { rows: disbursementList, count: targetListData.count };

    return {};
  }

  async createReportHistory(body) {
    try {
      if (!body || !body.adminId || !body.apiUrl || !body.reportName)
        return kParamsMissing;
      const adminId = body?.adminId;
      let fromDate = body?.fromDate ?? null;
      let toDate = body?.toDate ?? null;
      const apiUrl = body?.apiUrl;
      const reportName = body?.reportName;
      const extraparms = body?.extraparms ?? null;

      let reportData = {
        adminId,
        fromDate,
        toDate,
        apiUrl,
        reportName,
        extraparms,
      };
      const postData = await this.reportHistoryRepo.create(reportData);
      if (postData === k500Error) return kInternalError;
      this.reportCronAutoHit();
      return postData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Gather data -> Tally disbursement
  private async getDisbursementData(reqData: any) {
    // Validation -> Parameters
    if (!reqData.startDate) return kParamMissing('startDate');
    if (!reqData.endDate) return kParamMissing('endDate');

    const loanIds = reqData.loanIds;
    const startDate = this.typeService
      .getGlobalDate(reqData.startDate)
      .toJSON();
    const endDate = this.typeService.getGlobalDate(reqData.endDate).toJSON();
    const needDownload =
      reqData.isDownload == 'true' || reqData.download == 'true';
    const limit = needDownload ? null : reqData.pageSize ?? PAGE_LIMIT;
    const page = reqData.page ?? 1;
    const offset = needDownload ? null : page * limit - limit;

    const attributes = [
      'id',
      'accId',
      'charges',
      'loan_disbursement_date',
      'userId',
      'netApprovedAmount',
      'interestRate',
      'loanStatus',
      'TotalRepayAmount',
      'repaidAmount',
      'loanFees',
      'stampFees',
      'processingFees',
      'insuranceDetails',
    ];
    const emiAttributes = [
      'id',
      'emi_date',
      'emi_amount',
      'penalty_days',
      'bounceCharge',
      'payment_done_date',
      'principalCovered',
      'interestCalculate',
    ];
    const userAttributes = ['id', 'fullName'];
    const userInclude = {
      model: registeredUsers,
      attributes: userAttributes,
    };
    const adminInclude = {
      model: admin,
      as: 'adminData',
      attributes: ['fullName'],
    };
    const disbursementInclude = {
      model: disbursementEntity,
      attributes: [
        'amount',
        'fundAccount',
        'requestdata',
        'response',
        'source',
        'status',
      ],
    };
    const emiInclude = { model: EmiEntity, attributes: emiAttributes };
    const include = [
      emiInclude,
      userInclude,
      adminInclude,
      disbursementInclude,
    ];
    const options: any = {
      limit,
      offset,
      order: [['id', 'DESC']],
      where: {
        loan_disbursement_date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      include,
    };
    if (loanIds) options.where.id = loanIds;

    const loanListData = await this.loanRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (loanListData == k500Error) throw new Error();

    return loanListData;
  }

  // Preparation -> Response -> Tally disbursement
  private fineTuneTallyDisbursement(data) {
    const finalArray = [];
    const defaultValue = '-';
    for (let i = 0; i < data.length; i++) {
      try {
        const element = data[i];
        const disbursement_date = new Date(element.loan_disbursement_date);
        const disbursementDate =
          this.typeService.dateToJsonStr(disbursement_date);
        const approvedAmount = +element.netApprovedAmount;
        // Insurance charges
        const insuranceDetails = element.insuranceDetails ?? {};
        const insuranceCharges = insuranceDetails.totalPremium ?? 0;
        // Other charges
        const charges = element.charges ?? {};
        const oldUser = charges?.oldUser == 1 ? true : false;
        let onlineConvenienceCharges = charges.insurance_fee ?? 0;
        onlineConvenienceCharges = onlineConvenienceCharges.toFixed(2);
        let documentCharges = charges.doc_charge_amt ?? 0;
        if (documentCharges == 0) documentCharges = defaultValue;
        let gstCharges = charges.gst_amt ?? 0;
        gstCharges = parseFloat(gstCharges.toFixed(2));
        const riskAssessmentCharges = Math.round(
          +(element?.charges?.risk_assessment_charge ?? 0),
        );
        let processingFees = parseFloat(element.loanFees.toFixed(2));
        processingFees = parseFloat(processingFees.toFixed(2));
        const rawProcessingData = parseFloat(
          ((processingFees * 100) / 118).toFixed(2),
        );
        // "Processing fees income" should be percentage of processingFees column
        let processingFessIncome =
          (approvedAmount * element.processingFees) / 100;
        if (oldUser) {
          // Add document charges from processing fees in some old users
          if (documentCharges != defaultValue)
            processingFessIncome += documentCharges;
          if (charges?.proc_charge_per)
            element.processingFees = charges?.proc_charge_per;
          documentCharges = 0;
        } else {
          // Removing online convenience fees from processing fees
          processingFees -= onlineConvenienceCharges;
          // Removing GST charges from processing fees
          processingFees -= gstCharges;
          // Removing document charges from processing fees
          if (documentCharges != defaultValue)
            processingFees -= documentCharges;
        }

        const gstData = parseFloat(((rawProcessingData * 18) / 100).toFixed(2));
        const CGST = parseFloat((gstData / 2).toFixed(2));
        const SGST = parseFloat((gstData / 2).toFixed(2));

        processingFessIncome = parseFloat(processingFessIncome.toFixed(2));
        // "Processing fees" should be "Processing fees income" with 18% GST
        const totalProcessingFees =
          processingFessIncome + (processingFessIncome * 18) / 100;

        const obj: any = {
          accId: element.accId,
          disbursement_date: disbursementDate,
          name: element.registeredUsers.fullName,
          loanId: element.id,
          netApproved_Ref_No: `P-${element.id}`,
          disbursement_bank_gateway: defaultValue,
          approvedAmount: this.typeService.amountNumberWithCommas(
            element.netApprovedAmount,
          ),
          interest_rate: element.interestRate,
          disbursementAmount: this.typeService.amountNumberWithCommas(
            +(element.disbursementData[0]?.amount / 100).toFixed(2),
          ),
          processingFeesPerc: +element.processingFees,
          stampFees: element.stampFees,
          stampDutyIncome: defaultValue,
          processingFees:
            this.typeService.amountNumberWithCommas(totalProcessingFees),
          CGST,
          SGST,
          processingFessIncome:
            this.typeService.amountNumberWithCommas(processingFessIncome),
          emi1_Intrest_Ref_No: defaultValue,
          emiAmount1: defaultValue,
          emiPrincipal1: defaultValue,
          emiInterest1: defaultValue,
          emiDate1: defaultValue,
          emi2_Intrest_Ref_No: defaultValue,
          emiAmount2: defaultValue,
          emiPrincipal2: defaultValue,
          emiInterest2: defaultValue,
          emiDate2: defaultValue,
          emi3_Intrest_Ref_No: defaultValue,
          emiAmount3: defaultValue,
          emiPrincipal3: defaultValue,
          emiInterest3: defaultValue,
          emiDate3: defaultValue,
          expectedAmount: 0,
          paymentGateway: defaultValue,
          'Loan Documentation Charges': documentCharges,
          'Online Conveyance Charges':
            onlineConvenienceCharges == 0
              ? defaultValue
              : onlineConvenienceCharges,
          'Insurance Premium': insuranceCharges,
          'Risk Assessment Fees': riskAssessmentCharges,
          UTR: defaultValue,
          emi4_Intrest_Ref_No: defaultValue,
          emiAmount4: defaultValue,
          emiPrincipal4: defaultValue,
          emiInterest4: defaultValue,
          emiDate4: defaultValue,
        };
        let expectedAmount = 0;
        const bankDetails = fs.readFileSync('bankDetails.json', 'utf8');
        const kTallyPayoutBanks = bankDetails ? JSON.parse(bankDetails) : {};

        let disbursedData: any = {};
        if (element.disbursementData?.length > 0) {
          disbursedData = element.disbursementData[0];
          // UTR
          const rawResponse = disbursedData.response;
          if (rawResponse) {
            const response = JSON.parse(rawResponse);
            obj.UTR = response.utr ?? defaultValue;
          }
          // Cashfree
          if (disbursedData.source == kCashfree) {
            if (rawResponse) {
              const response = JSON.parse(rawResponse);
              if (response.paymentInstrumentId) {
                obj.disbursement_bank_gateway =
                  kTallyPayoutBanks[response.paymentInstrumentId] ??
                  defaultValue;
              }
            } else obj.disbursement_bank_gateway = defaultValue;
          }
          // Razorpay M2
          else if (disbursedData?.source == 'RAZORPAY_M2') {
            obj.disbursement_bank_gateway =
              kTallyPayoutBanks['RAZORPAY_M2_DEFAULT_ACC'];
          }
          // Razorpay M1
          else obj.disbursement_bank_gateway = 'RBL BANK - 8149';
        } // Razorpay M1
        else obj.disbursement_bank_gateway = 'RBL BANK - 8149';
        // From which payment gateway payment was processed
        obj.paymentGateway = disbursedData.source ?? kRazorpay;

        // Disbursement bank gateway
        const gatewayAcc = disbursedData?.requestdata?.account_number;
        if (gatewayAcc) {
          if (kTallyPayoutBanks[gatewayAcc])
            obj.disbursement_bank_gateway = kTallyPayoutBanks[gatewayAcc];
        }

        element.emiData.sort((a, b) => a.id - b.id);
        for (let j = 0; j < element.emiData.length; j++) {
          try {
            const emiData = element.emiData[j];
            const emiDate = new Date(emiData.emi_date);
            expectedAmount += +emiData.emi_amount;
            obj[`emi${j + 1}_Intrest_Ref_No`] = `I${j + 1}-${element.id}`;
            obj[`emiAmount${j + 1}`] = this.typeService.amountNumberWithCommas(
              +emiData.emi_amount,
            );
            obj[`emiPrincipal${j + 1}`] =
              this.typeService.amountNumberWithCommas(
                +emiData.principalCovered,
              );
            obj[`emiInterest${j + 1}`] =
              this.typeService.amountNumberWithCommas(
                +emiData.interestCalculate,
              );
            obj[`emiDate${j + 1}`] = this.typeService.dateToJsonStr(emiDate);
          } catch (error) {}
        }

        obj.expectedAmount =
          this.typeService.amountNumberWithCommas(expectedAmount);
        finalArray.push(obj);
      } catch (error) {}
    }
    return finalArray;
  }

  async tallyInterestIncome(reqData: any) {
    // Validation -> Parameters
    if (!reqData.startDate) return kParamMissing('startDate');
    if (!reqData.endDate) return kParamMissing('endDate');

    // Gather data
    const targetList = await this.getInterestIncomeData(reqData);

    // Calculation -> Interest income
    let emiList: any = this.fineTuneTallyInterestIncome(reqData, targetList);

    // Download excel url
    const needDownload = reqData.download == 'true';
    if (emiList.length > 0 && needDownload) {
      const path = 'Tally report - Interest Income.xlsx';
      const rawExcelData = {
        sheets: ['Tally report - Interest Income'],
        data: [emiList],
        sheetName: path,
        needFindTuneKey: false,
      };
      // Generate excel url
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;
      const fileURL = await this.fileService.uploadFile(
        excelResponse?.filePath,
        'reports',
        'xlsx',
      );
      if (fileURL.message) return fileURL;
      const updatedData = { downloadUrl: fileURL, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileURL };
    }
    // Pagination data
    else if (!needDownload) {
      let tallyInterestIncomeRes = { rows: emiList, count: emiList.length };
      if (!reqData.download) {
        const skip1 = reqData.page * reqData.pagesize - reqData.pagesize;
        tallyInterestIncomeRes.rows = emiList.slice(
          skip1,
          skip1 + reqData.pagesize,
        );
      }

      return tallyInterestIncomeRes;
    }

    return {};
  }

  private async getInterestIncomeData(reqData: any) {
    // Preparation -> Query
    const startDate = this.typeService
      .getGlobalDate(new Date(reqData.startDate))
      .toJSON();
    const endDate = this.typeService
      .getGlobalDate(new Date(reqData.endDate))
      .toJSON();

    // Table join -> All Transaction table
    const allTransInclude: SequelOptions = { model: TransactionEntity };
    allTransInclude.required = false;
    allTransInclude.where = { status: kCompleted, type: kFullPay };
    allTransInclude.attributes = ['completionDate'];
    // Table join -> Loan table
    const loanInclude: SequelOptions = { model: loanTransaction };
    loanInclude.attributes = ['accId'];
    loanInclude.include = [allTransInclude];
    // Table join -> Transaction Table
    const transInclude: SequelOptions = { model: TransactionEntity };
    transInclude.attributes = ['completionDate'];
    transInclude.required = false;
    transInclude.where = { status: kCompleted };
    // Table join -> registeredUser Table
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['fullName', 'phone'];
    const include = [loanInclude, transInclude, userInclude];

    const emiAttr = [
      'emi_date',
      'emiNumber',
      'fullPayInterest',
      'fullPayPrincipal',
      'loanId',
      'payment_done_date',
      'payment_due_status',
      'payment_status',
      'interestCalculate',
      'pay_type',
    ];
    const emiOptions: any = {
      include,
      where: {
        [Op.or]: [
          { emi_date: { [Op.gte]: startDate, [Op.lte]: endDate } },
          { payment_done_date: { [Op.gte]: startDate, [Op.lte]: endDate } },
          Sequelize.literal(
            `"transactionData"."status" = '${kCompleted}' AND "transactionData"."completionDate" >= '${startDate}' AND "transactionData"."completionDate" >= '${startDate}' AND "transactionData"."type" >= '${kEMIPay}'`,
          ),
        ],
      },
    };
    if (reqData.loanId) emiOptions.where.loanId = reqData.loanId;

    // Hit -> Query
    const emiList = await this.emiRepo.getTableWhereData(emiAttr, emiOptions);
    // Validation -> Query data
    if (emiList === k500Error) throw new Error();

    return emiList;
  }

  private fineTuneTallyInterestIncome(reqData, data) {
    const finalData = [];
    const defaultValue = '';
    const startDate = this.typeService
      .getGlobalDate(new Date(reqData.startDate))
      .toJSON();
    const endDate = this.typeService
      .getGlobalDate(new Date(reqData.endDate))
      .toJSON();

    for (let i = 0; i < data.length; i++) {
      try {
        const emiData = data[i];
        const loanData = emiData?.loan ?? {};
        const userData = emiData.user ?? {};
        const emiNumber = emiData.emiNumber;
        const allTransList = loanData.transactionData ?? [];

        const isEMIPaid = emiData.payment_status == '1';
        const emiDate = this.typeService
          .getGlobalDate(emiData.emi_date)
          .toJSON();
        let emiPaidDate;

        if (isEMIPaid) {
          if (emiData.payment_due_status == '1') {
            if (emiDate < startDate) continue;
            else if (emiDate > endDate) continue;
          }

          emiPaidDate = this.typeService.getGlobalDate(
            emiData.payment_done_date,
          );
          if (emiData.payment_due_status == '1')
            emiPaidDate = new Date(emiDate);
          const transList = emiData.transactionData ?? [];
          transList.sort(
            (a, b) =>
              new Date(a.completionDate).getTime() -
              new Date(b.completionDate).getTime(),
          );
          if (transList.length > 0 && emiData.payment_due_status != '1') {
            const transData = transList[0];
            const transactionPaidDate = this.typeService.getGlobalDate(
              transData.completionDate,
            );
            if (emiPaidDate.getTime() > transactionPaidDate.getTime())
              emiPaidDate = transactionPaidDate;

            // Paid after emi date and before cron runs for payment_due_status update
            if (emiData.payment_due_status == '0') {
              if (emiPaidDate.toJSON() > emiDate) {
                emiPaidDate = new Date(emiDate);
              }
            }
          }
          // For full pay transactions with refund of emi payment
          if (emiData.pay_type == kFullPay && allTransList.length > 0) {
            if (emiData.payment_due_status != '1') {
              allTransList.sort(
                (a, b) =>
                  new Date(a.completionDate).getTime() -
                  new Date(b.completionDate).getTime(),
              );
              const transData = allTransList[0];
              const fullPaidDate = this.typeService.getGlobalDate(
                new Date(transData.completionDate),
              );
              if (fullPaidDate.getTime() < emiPaidDate.getTime()) {
                emiPaidDate = fullPaidDate;
              }
            }
          }

          if (emiPaidDate.toJSON() < startDate) continue;
          else if (emiPaidDate.toJSON() > endDate) continue;
        }
        // Un paid emis
        else {
          if (emiDate < startDate) continue;
          else if (emiDate > endDate) continue;
        }

        // EMI Paid via fullpay before the due date with no interest amount paid
        if (
          isEMIPaid &&
          emiData.payment_due_status == '0' &&
          emiData.pay_type == kFullPay &&
          emiPaidDate
        ) {
          if (
            new Date(emiDate).getTime() > emiPaidDate.getTime() &&
            (emiData.fullPayPrincipal ?? 0) != 0 &&
            +(emiData.fullPayInterest ?? 0) == 0
          ) {
            continue;
          }
        }

        const loanId = emiData.loanId;
        const obj: any = {};
        obj.emi_date = defaultValue;
        obj.accId = loanData?.accId;
        obj.name = userData?.fullName;
        obj.loanId = loanId;
        obj.phone = this.cryptService.decryptPhone(userData?.phone);
        obj.emiInterest1 = defaultValue;
        obj.I1_Ref_No = defaultValue;
        obj.emiInterest2 = defaultValue;
        obj.I2_Ref_No = defaultValue;
        obj.emiInterest3 = defaultValue;
        obj.I3_Ref_No = defaultValue;
        obj.emiInterest4 = defaultValue;
        obj.I4_Ref_No = defaultValue;
        obj.emi_date = this.getDateFormate(emiPaidDate ?? new Date(emiDate));
        const emiLoanId = `I${emiNumber}-${loanId}`;
        obj[`I${emiNumber}_Ref_No`] = emiLoanId;
        const fullPayInterest = +emiData.fullPayInterest ?? 0;
        obj[`emiInterest${emiNumber}`] =
          this.typeService.amountNumberWithCommas(
            fullPayInterest > 0 && emiData.payment_due_status != '1'
              ? fullPayInterest
              : +emiData.interestCalculate,
          );

        finalData.push(obj);
      } catch (error) {
        console.log(error);
      }
    }
    return finalData;
  }

  async prepareQualityParamsReport(data) {
    try {
      const finalData: any = [];
      for (let index = 0; index < data.length; index++) {
        try {
          const element = data[index];
          const userDetail = element.registeredUsers;
          const phone = await this.cryptService.decryptPhone(userDetail?.phone);
          const qualityarray = element.qualityParameters.data;
          const prepareData: any = {
            userId: userDetail.id,
            'Loan id': element?.id ?? '-',
            Name: userDetail?.fullName ?? '-',
            'Phone number': phone ?? '-',
            'Quality by': element.QualityBy,
          };

          // Process qualityarray to map each title to 'title' property and its corresponding remark
          qualityarray.forEach(async (ele) => {
            try {
              const title = await this.typeService.capitalizeFirstLetter(
                ele.title,
              );
              if (!title) return kInternalError;
              const optionsKeys = Object.keys(ele?.options);
              let selectedOption = '';
              // Find the option where "selected": true
              optionsKeys.forEach((key) => {
                try {
                  if (ele?.options[key].selected === true) {
                    selectedOption = key;
                  }
                } catch (error) {}
              });
              prepareData[title] = selectedOption || '-';
              prepareData['Remark-' + title] = ele?.remarks || '-';
            } catch (error) {}
          });
          finalData.push(prepareData);
        } catch (e) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getDateFormate(date: Date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return day + '/' + month + '/' + year;
  }
  //------------------------ End Tally Interest Income ------------------------

  async tallyRepayment(reqData: any) {
    const targetList = await this.getRepaymentData(reqData);
    if (targetList.message) return targetList;

    await this.addAccIdToMissingOne();

    const preparedData: any = this.fineTuneTallyRepayment(targetList, reqData);
    if (preparedData.message) return preparedData;
    const mode = reqData.mode;
    const needDownload = reqData.download == 'true';

    const pathData: any = {};
    const autoList = preparedData.autoList ?? [];
    if (mode == 'REGULAR' || mode == 'ALL') {
      if (!needDownload) return { rows: autoList, count: autoList.length };
      else if (autoList.length > 0 && needDownload) {
        const path = 'Tally report - Repayment.xlsx';
        const rawExcelData = {
          sheets: ['Tally report - Repayment'],
          data: [autoList],
          sheetName: path,
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );

        if (excelResponse?.message) return excelResponse;
        if (!reqData.localPath) {
          const fileURL = await this.fileService.uploadFile(
            excelResponse?.filePath,
            'reports',
            'xlsx',
          );
          if (fileURL.message) return fileURL;
          const updatedData = { downloadUrl: fileURL, status: '1' };
          const downloadId = reqData.downloadId;
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileURL };
        } else pathData.regularReportPath = excelResponse?.filePath;
      }
    }

    const manualList = preparedData.manualList ?? [];
    if (mode == 'SETTLED' || mode == 'ALL') {
      if (!needDownload) return { rows: manualList, count: manualList.length };
      else if (manualList.length > 0 && needDownload) {
        const path = 'Tally report - Settled.xlsx';
        const rawExcelData = {
          sheets: ['Tally report - Settled'],
          data: [manualList],
          sheetName: path,
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );
        if (!reqData.localPath) {
          const fileURL = await this.fileService.uploadFile(
            excelResponse?.filePath,
            'reports',
            'xlsx',
          );
          if (fileURL.message) return fileURL;
          const updatedData = { downloadUrl: fileURL, status: '1' };
          const downloadId = reqData.downloadId;
          await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
          return { fileURL };
        } else pathData.settledReportPath = excelResponse?.filePath;
      }
    }

    return pathData;
  }

  async addAccIdToMissingOne() {
    try {
      const attributes = ['id'];
      const order = [['loan_disbursement_date', 'ASC']];
      const where: any = {
        accId: { [Op.eq]: null },
      };

      where.loan_disbursement_date = { [Op.ne]: null };
      const options: any = { order, where };

      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return k500Error;

      let accNumber = await this.getNextAccId();
      if (accNumber == k500Error) return k500Error;

      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const updatedData = { accId: accNumber };
          const loanId = loanData.id;

          const updatedLoanData = await this.loanRepo.updateRowData(
            updatedData,
            loanId,
          );
          if (updatedLoanData != k500Error) accNumber++;
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async getNextAccId() {
    try {
      const attributes = ['accId'];
      const where = { accId: { [Op.ne]: null } };
      const order = [['accId', 'DESC']];
      const options = { order, where };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return k500Error;
      else if (!loanData) return 1;
      else return loanData.accId + 1;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async getRepaymentData(reqData) {
    const startDate: any = new Date(reqData.startDate).toJSON();
    const endDate: any = new Date(reqData.endDate).toJSON();
    const loanIds = reqData.loanIds;

    const attributes = [
      'id',
      'loanId',
      'emi_date',
      'emi_amount',
      'penalty',
      'penalty_days',
      'waiver',
      'paid_waiver',
      'unpaid_waiver',
      'payment_done_date',
      'principalCovered',
      'interestCalculate',
      'payment_status',
      'pay_type',
      'fullPayPrincipal',
      'fullPayInterest',
      'fullPayPenalty',
      'settledId',
      'partPaymentPenaltyAmount',
      'bounceCharge',
    ];
    const emiInclude = { model: EmiEntity, attributes };
    const userInclude = { model: registeredUsers, attributes: ['fullName'] };
    const attLoan = ['accId', 'id', 'loan_disbursement_date'];
    const loanInclude: any = { model: loanTransaction, attributes: attLoan };
    loanInclude.include = [emiInclude];
    const include = [loanInclude, userInclude];
    const options: any = {
      where: {
        completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
        status: 'COMPLETED',
        type: { [Op.ne]: 'REFUND' },
      },
      order: [['id', 'ASC']],
      include,
    };
    if (loanIds) options.where.loanId = loanIds;

    const att = [
      'completionDate',
      'utr',
      'paidAmount',
      'status',
      'source',
      'subSource',
      'type',
      'transactionId',
      'loanId',
      'emiId',
      'principalAmount',
      'interestAmount',
      'interestDifference',
      'penaltyAmount',
    ];
    const result = await this.transactionRepo.getTableWhereData(att, options);
    if (result === k500Error) return kInternalError;
    return result;
  }
  private async getNewRepaymentData(startDate, endDate) {
    try {
      const dynamicQuery = `SELECT  count(tran."id") as "totalRepaymentCount",count(loan."completedLoan") as "totalCompleted",
      loan."completedLoan",count("tran"."subSource") as "subSource",
      tran."subSource",sum(tran."paidAmount") as "totalPaidAmount",
      sum(tran."principalAmount") as "principalAmount",
      sum(tran."interestAmount") as "totalInterestAmount",
      sum(tran."penaltyAmount") as "totalPenaltyAmount",loan."interestRate"
      FROM public."loanTransactions" as loan   
      inner join public."TransactionEntities" as tran      
      on  loan.id = tran."loanId"    
      where tran."completionDate" >= '${startDate.toJSON()}'
      and tran."completionDate" <= '${endDate.toJSON()}'
      and tran."status"='COMPLETED' and tran."type"!='REFUND'
      group by loan."interestRate","tran"."subSource",loan."completedLoan"
      `;
      const loanData = await this.loanRepo.injectRawQuery(dynamicQuery);
      if (loanData == k500Error) return kInternalError;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private fineTuneTallyRepayment(data, reqData) {
    try {
      const autoList = [];
      const manualList = [];
      const defaultValue = '';
      for (let i = 0; i < data.length; i++) {
        try {
          const tranData = data[i];
          const emiId = tranData.emiId;
          const loanId = tranData.loanId;
          const principal = tranData.principalAmount;
          const interest = tranData.interestAmount;
          const penalty = tranData.penaltyAmount;

          // Do not change order of key in object as this direct influences the tally automation
          const obj: any = {};
          obj.Acc_Id = tranData.loanData.accId;
          obj.createdAt = this.getDateFormate(
            new Date(tranData.completionDate),
          );
          obj.name = tranData.userData.fullName;
          obj.loanId = loanId;
          obj.payment_type = tranData.source.toUpperCase();
          obj.repaidAmount = this.typeService.amountNumberWithCommas(
            tranData.paidAmount,
          );
          obj.emiNumber = '';

          // EMI #01
          obj.P1_Ref_No = defaultValue;
          obj.emiPrincipal1 = defaultValue;
          obj.I1_Ref_No = defaultValue;
          obj.emiInterest1 = defaultValue;
          obj.PI1_Ref_No = defaultValue;
          obj.emi1_penalty = defaultValue;

          // EMI #02
          obj.P2_Ref_No = defaultValue;
          obj.emiPrincipal2 = defaultValue;
          obj.I2_Ref_No = defaultValue;
          obj.emiInterest2 = defaultValue;
          obj.PI2_Ref_No = defaultValue;
          obj.emi2_penalty = defaultValue;

          // EMI #03
          obj.P3_Ref_No = defaultValue;
          obj.emiPrincipal3 = defaultValue;
          obj.I3_Ref_No = defaultValue;
          obj.emiInterest3 = defaultValue;
          obj.PI3_Ref_No = defaultValue;
          obj.emi3_penalty = defaultValue;

          obj.Waiver_Principal_1 = defaultValue;
          obj['Waiver_Intere-1'] = defaultValue;
          obj['Waiver_Penalty-1'] = defaultValue;
          obj.Waiver_Principal_2 = defaultValue;
          obj['Waiver_Intere-2'] = defaultValue;
          obj['Waiver_Penalty-2'] = defaultValue;
          obj.Waiver_Principal_3 = defaultValue;
          obj['Waiver_Intere-3'] = defaultValue;
          obj['Waiver_Penalty-3'] = defaultValue;

          obj.TOTALwaiverAmount = defaultValue;
          obj.disbursementDate = this.getDateFormate(
            new Date(tranData.loanData.loan_disbursement_date),
          );
          obj.dueDate = defaultValue;
          obj.penalty_days = defaultValue;
          obj.paymentId = tranData.utr ?? defaultValue;

          // In case of user pays early with fullpay
          obj['Foreclosure_I1_Ref_No'] = defaultValue;
          obj['Foreclosure Emi 1 interest'] = defaultValue;
          obj['Foreclosure_I2_Ref_No'] = defaultValue;
          obj['Foreclosure Emi 2 interest'] = defaultValue;
          obj['Foreclosure_I3_Ref_No'] = defaultValue;
          obj['Foreclosure Emi 3 interest'] = defaultValue;

          obj.merchant_number = defaultValue;

          // EMI #04
          obj.P4_Ref_No = defaultValue;
          obj.emiPrincipal4 = defaultValue;
          obj.I4_Ref_No = defaultValue;
          obj.emiInterest4 = defaultValue;
          obj.PI4_Ref_No = defaultValue;
          obj.emi4_penalty = defaultValue;
          obj.Waiver_Principal_4 = defaultValue;
          obj['Waiver_Intere-4'] = defaultValue;
          obj['Waiver_Penalty-4'] = defaultValue;
          obj['Foreclosure_I4_Ref_No'] = defaultValue;
          obj['Foreclosure Emi 4 interest'] = defaultValue;

          // Target EMIs
          let emiData = tranData.loanData.emiData;
          const emiList = tranData.loanData.emiData;
          emiList.sort((a, b) => a.id - b.id);
          const isSettled = emiData.find(
            (el) =>
              el.paid_waiver || el.waiver || el.unpaid_waiver || el.settledId,
          );
          emiData.sort((a, b) => a.id - b.id);
          if (tranData.type == kFullPay)
            emiData = emiData.map((el) => {
              const isFullPay = el.pay_type == kFullPay;
              if (!isFullPay) return {};
              return el;
            });
          else if (tranData.type == 'EMIPAY' || tranData.type == 'PARTPAY')
            emiData = emiData.filter((el) => el.id == tranData.emiId);

          let principalAmount = 0;
          let interestAmount = 0;
          let penaltyAmount = 0;
          let paidAmount = parseFloat(tranData.paidAmount.toFixed(2));
          const isFullPay = tranData.type == kFullPay;

          for (let j = 0; j < emiData.length; j++) {
            try {
              const emi = emiData[j];

              if (!emi.id) continue;
              const index = emiList.findIndex((el) => el.id == emi.id) + 1;
              const emiLoanId = `I${index}-${loanId}`;

              if (emiId == emi.id || isFullPay) {
                if (obj.emiNumber == '') obj.emiNumber = index.toString();
                else obj.emiNumber += ' & ' + index.toString();

                if (isFullPay) {
                  if (+emi.fullPayPrincipal) {
                    obj[`P${index}_Ref_No`] = `P-${loanId}`;
                    obj[`emiPrincipal${index}`] = +emi.fullPayPrincipal;
                    principalAmount += +emi.fullPayPrincipal;
                  }

                  if (+emi.fullPayInterest) {
                    obj[`I${index}_Ref_No`] = `I${index}-${loanId}`;
                    interestAmount += +emi.fullPayInterest;
                    // Fallback of matching total amount
                    const amountData = {
                      penalty: +emi.fullPayPenalty,
                      ...tranData,
                      currentPrincipal: principalAmount,
                      currentInterest: interestAmount,
                      currentPenalty: penaltyAmount,
                      paidAmount,
                    };
                    const needCalc: any = this.isNeedCalc(
                      j,
                      emiData,
                      amountData,
                      'INTEREST',
                    );
                    if (needCalc.result) {
                      obj[`emiInterest${index}`] = needCalc.interestAmount;
                      interestAmount -= +emi.fullPayInterest;
                      interestAmount += needCalc.interestAmount;
                    }
                    // Normal calculation
                    else obj[`emiInterest${index}`] = +emi.fullPayInterest;

                    const paidInterest = obj[`emiInterest${index}`] ?? 0;
                    const expectedInterest = emi.interestCalculate ?? 0;
                    const difference = expectedInterest - paidInterest;
                    if (difference != 0 && difference > 0) {
                      obj[`Foreclosure_I${index}_Ref_No`] = emiLoanId;
                      obj[`Foreclosure Emi ${index} interest`] = difference;
                    }
                  } else {
                    obj[`Foreclosure_I${index}_Ref_No`] = emiLoanId;
                    obj[`Foreclosure Emi ${index} interest`] =
                      emi.interestCalculate ?? 0;
                  }
                  if (+emi.fullPayPenalty) {
                    obj[`PI${index}_Ref_No`] = `PI${index}-${loanId}`;
                    penaltyAmount += +emi.fullPayPenalty;
                    // Fallback of matching total amount
                    const amountData = {
                      penalty: +emi.fullPayPenalty,
                      ...tranData,
                      currentPrincipal: principalAmount,
                      currentInterest: interestAmount,
                      currentPenalty: penaltyAmount,
                      paidAmount,
                    };
                    const needCalc: any = this.isNeedCalc(
                      j,
                      emiData,
                      amountData,
                      'PENALTY',
                    );
                    if (needCalc.result) {
                      obj[`emi${index}_penalty`] = needCalc.penaltyAmount;
                      penaltyAmount -= +emi.fullPayPenalty;
                      penaltyAmount += needCalc.penaltyAmount;
                    } else obj[`emi${index}_penalty`] = +emi.fullPayPenalty;
                    // Fallback (in case of negative amount in bifurcation)
                    if (obj[`emi${index}_penalty`] < 0) {
                      penaltyAmount -= Math.abs(obj[`emi${index}_penalty`]);
                      obj[`emi${index}_penalty`] = 0;
                    }
                  }
                } else {
                  if (principal) {
                    obj[`P${index}_Ref_No`] = `P-${loanId}`;
                    obj[`emiPrincipal${index}`] = principal;
                    principalAmount += principal;
                  }
                  if (interest) {
                    obj[`I${index}_Ref_No`] = `I${index}-${loanId}`;
                    interestAmount += interest;
                    // Fallback of matching total amount
                    const amountData = {
                      penalty,
                      ...tranData,
                      currentPrincipal: principalAmount,
                      currentInterest: interestAmount,
                      currentPenalty: penaltyAmount,
                      paidAmount,
                    };
                    const needCalc: any = this.isNeedCalc(
                      j,
                      emiData,
                      amountData,
                      'INTEREST',
                    );
                    if (needCalc.result) {
                      obj[`emiInterest${index}`] = needCalc.interestAmount;
                      interestAmount -= interest;
                      interestAmount += needCalc.interestAmount;
                    }
                    // Normal calculation
                    else if (
                      tranData.type == 'PARTPAY' ||
                      emi.partPaymentPenaltyAmount
                    )
                      obj[`emiInterest${index}`] = interestAmount;
                    else obj[`emiInterest${index}`] = +emi.interestCalculate;
                  }
                  if (penalty) {
                    obj[`PI${index}_Ref_No`] = `PI${index}-${loanId}`;
                    penaltyAmount += penalty;
                    // Fallback of matching total amount
                    const amountData = {
                      penalty: +emi.penalty,
                      ...tranData,
                      currentPrincipal: principalAmount,
                      currentInterest: interestAmount,
                      currentPenalty: penaltyAmount,
                      paidAmount,
                    };
                    const needCalc: any = this.isNeedCalc(
                      j,
                      emiData,
                      amountData,
                      'PENALTY',
                    );
                    if (needCalc.result) {
                      obj[`emi${index}_penalty`] = needCalc.penaltyAmount;
                      penaltyAmount -= penalty;
                      penaltyAmount += needCalc.penaltyAmount;
                    }
                    // Normal calculation
                    else obj[`emi${index}_penalty`] = penalty;
                    // Fallback (in case of negative amount in bifurcation)
                    if (obj[`emi${index}_penalty`] < 0) {
                      penaltyAmount -= Math.abs(obj[`emi${index}_penalty`]);
                      obj[`emi${index}_penalty`] = 0;
                    }
                  }
                }

                if (+emi.penalty_days) {
                  if (obj.penalty_days == '')
                    obj.penalty_days = +emi.penalty_days;
                  else obj.penalty_days += +emi.penalty_days;
                }
              }
              this.removeNegligenceAmount(obj);
            } catch (error) {}
          }
          if (tranData.type == 'PARTPAY') obj.emiNumber += '(PARTPAY)';

          // Razorpay 1 for payment link and Razorpay 2 for Autodebit
          if (obj.payment_type == kRazorpay) {
            if (
              tranData.subSource == kAutoDebit ||
              tranData.transactionId?.includes('-id-token_')
            ) {
              obj.merchant_number = 2;
            } else obj.merchant_number = 1;
          } else obj.merchant_number = 1;

          let calcAmount = principalAmount + interestAmount + penaltyAmount;
          calcAmount = parseFloat(calcAmount.toFixed(2));
          paidAmount = parseFloat(paidAmount.toFixed(2));
          let isMatched = paidAmount == calcAmount;
          if (isMatched) {
            const principalMismatch =
              (obj.emiPrincipal1 ?? 0) < 0 ||
              (obj.emiPrincipal2 ?? 0) < 0 ||
              (obj.emiPrincipal3 ?? 0) < 0;
            const interestMismatch =
              (obj.emiInterest1 ?? 0) < 0 ||
              (obj.emiInterest2 ?? 0) < 0 ||
              (obj.emiInterest3 ?? 0) < 0;
            if (interestMismatch || principalMismatch) isMatched = false;
            isMatched = this.isAccurate(tranData, paidAmount);
          }
          if (isMatched) isMatched = this.doubleCheckAndUpdate(obj, paidAmount);

          // Waiver given but no mismatch in payment bifurcation
          const regularWaiver = reqData.regularWaiver == 'true';
          if (isSettled && isMatched && regularWaiver) manualList.push(obj);
          // Waiver given or mismatch in payment bifurcation
          else if ((!isMatched || isSettled) && !regularWaiver)
            manualList.push(obj);
          // No mismatch in payment bifurcation
          else autoList.push(obj);
        } catch (error) {}
      }
      return { autoList, manualList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private isAccurate(transData, paidAmount) {
    try {
      let totalAmount = 0;
      totalAmount += transData.principalAmount ?? 0;
      totalAmount += transData.interestAmount ?? 0;
      totalAmount += transData.penaltyAmount ?? 0;

      const difference = Math.abs(paidAmount - totalAmount);
      return difference < 100;
    } catch (error) {
      return false;
    }
  }

  private doubleCheckAndUpdate(obj, paidAmount) {
    try {
      const reg = /^-?\d+\.?\d*$/;

      let calcAmount = 0;
      [1, 2, 3, 4].forEach((el) => {
        // Principal amount
        let principalAmount = obj[`emiPrincipal${el}`];
        if (reg.test(principalAmount)) {
          if (principalAmount < 0) return false;
          if (this.isHavingNegligenceAmount(principalAmount)) {
            principalAmount = this.getLast2Gigits(principalAmount);
            obj[`emiPrincipal${el}`] = principalAmount;
          }
          calcAmount += principalAmount;
        }

        // Interest amount
        let interestAmount = obj[`emiInterest${el}`];
        if (reg.test(interestAmount)) {
          if (interestAmount < 0) return false;
          if (this.isHavingNegligenceAmount(interestAmount)) {
            interestAmount = this.getLast2Gigits(interestAmount);
            obj[`emiInterest${el}`] = interestAmount;
          }
          calcAmount += interestAmount;
        }

        // Penalty amount
        let penaltyAmount = obj[`emi${el}_penalty`];
        if (reg.test(penaltyAmount)) {
          if (penaltyAmount < 0) return false;
          if (this.isHavingNegligenceAmount(penaltyAmount)) {
            penaltyAmount = this.getLast2Gigits(penaltyAmount);
            obj[`emi${el}_penalty`] = penaltyAmount;
          }
          calcAmount += penaltyAmount;
        }
      });

      const difference = paidAmount - calcAmount;
      if (difference == 0) return true;
      else if (
        difference < 1 &&
        difference > 0 &&
        calcAmount.toString().includes('.99999')
      )
        return true;
      else return false;
    } catch (error) {
      return false;
    }
  }

  private isNeedCalc(targetIndex, emiList, amountData, type) {
    try {
      const interestMode = type == 'INTEREST';
      const penaltyMode = type == 'PENALTY';
      const penaltyValue = amountData.penalty;
      const emiData = emiList[targetIndex];
      const isFullPay = amountData.type == 'FULLPAY';

      const interestAmount = isFullPay
        ? emiData.fullPayInterest
        : amountData.interestAmount;
      const penaltyAmount = isFullPay
        ? emiData.fullPayPenalty
        : amountData.penaltyAmount;
      const interestDifference = amountData.interestDifference ?? 0;
      const currentPrincipal = amountData.currentPrincipal ?? 0;
      const currentInterest = amountData.currentInterest ?? 0;
      const currentPenalty = amountData.currentPenalty ?? 0;
      const paidAmount = amountData.paidAmount ?? 0;
      const totalAmount = currentPrincipal + currentInterest + currentPenalty;
      const roundDiff = paidAmount - totalAmount;
      let nextData: any = {};

      if (targetIndex == emiList.length - 1) {
        // Last EMI has interest value and round off difference is there
        if (interestMode && !penaltyValue) {
          return {
            result: true,
            interestAmount: roundDiff + interestAmount,
          };
        } else if (penaltyMode)
          return {
            result: true,
            penaltyAmount: roundDiff + penaltyAmount,
          };
      }
      // Next EMI has no interest value and interest difference is there
      else if (interestMode && !penaltyValue && isFullPay) {
        nextData = emiList[targetIndex + 1];
        const nextInterestAmount = nextData.fullPayInterest;
        if (!nextInterestAmount)
          return {
            result: true,
            interestAmount: interestDifference + interestAmount,
          };
      }
      return { result: false };
    } catch (error) {
      return { result: false };
    }
  }

  private removeNegligenceAmount(obj) {
    try {
      const numbers = ['1', '2', '3'];
      for (let index = 0; index < numbers.length; index++) {
        try {
          const el = numbers[index];

          // Principal amount
          let principalValue = obj[`emiPrincipal${el}`];
          if (principalValue && !isNaN(principalValue)) {
            principalValue = parseFloat(principalValue);
            if (principalValue == 0) {
              obj[`P${el}_Ref_No`] = '';
              obj[`emiPrincipal${el}`] = '';
            }
          }

          // Interest amount
          let interestValue = obj[`emiInterest${el}`];
          if (interestValue && !isNaN(interestValue)) {
            interestValue = parseFloat(interestValue.toFixed(2));
            if (interestValue == 0) {
              obj[`I${el}_Ref_No`] = '';
              obj[`emiInterest${el}`] = '';
            }
          }

          // Penalty amount
          let penaltyValue = obj[`emi${el}_penalty`];
          if (penaltyValue && !isNaN(penaltyValue)) {
            penaltyValue = parseFloat(penaltyValue.toFixed(2));
            if (penaltyValue == 0) {
              obj[`PI${el}_Ref_No`] = '';
              obj[`emi${el}_penalty`] = '';
            }
          }

          // Fullpay interest amount
          const fullInterestKey = `Foreclosure Emi ${el} interest`;
          let fullInterestValue = obj[fullInterestKey];
          if (fullInterestValue && !isNaN(fullInterestValue)) {
            fullInterestValue = parseFloat(fullInterestValue.toFixed(2));
            if (fullInterestValue == 0) obj[fullInterestKey] = '';
          }
        } catch (error) {}
      }
      return obj;
    } catch (error) {
      return obj;
    }
  }

  private isHavingNegligenceAmount(amount) {
    const splittedSpans = amount.toString().split('.');
    if (splittedSpans.length == 1) return false;

    const decimalPart = splittedSpans[1];
    return decimalPart.length > 2;
  }

  private getLast2Gigits(amount) {
    const splittedSpans = amount.toString().split('.');
    const decimalPart = splittedSpans[1];

    return parseFloat(splittedSpans[0] + '.' + decimalPart.substring(0, 2));
  }
  //------------------------ Start Tally Repayment Income ------------------------

  async getTodayEmiCounts() {
    try {
      const todayEmiDate = await this.typeService.getGlobalDate(new Date());
      const paidEmiCount = await this.EMIRepository.getCountsWhere({
        where: {
          payment_status: '1',
          emi_date: { [Op.eq]: todayEmiDate.toJSON() },
        },
      });
      const unpaidEmiCount = await this.EMIRepository.getCountsWhere({
        where: {
          payment_status: { [Op.ne]: '1' },
          emi_date: { [Op.eq]: todayEmiDate.toJSON() },
        },
      });
      const totalEmiCount = +paidEmiCount + +unpaidEmiCount;
      return { totalEmiCount, paidEmiCount, unpaidEmiCount };
    } catch (error) {
      return '500';
    }
  }

  async getEmiDataWRange(
    page: number,
    pagesize: number,
    startDate,
    endDate,
    emiStatus: string,
    searchText: any,
    download: string,
    downloadId: string,
    needAllData?: string,
  ) {
    try {
      const fromDate = this.typeService.getGlobalDate(startDate);
      const toData = this.typeService.getGlobalDate(endDate);

      let userSearchName = {};
      if (searchText) {
        if (!isNaN(searchText)) {
          searchText = this.cryptService.encryptPhone(searchText);
          if (searchText == k500Error) return k500Error;
          searchText = searchText.split('===')[1];
          userSearchName = {
            phone: { [Op.like]: '%' + searchText + '%' },
          };
        } else {
          userSearchName = {
            fullName: { [Op.iRegexp]: searchText },
          };
        }
      }
      const kycInclude: any = {
        model: KYCEntity,
        attributes: ['userId', 'aadhaarDOB'],
        required: false,
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'phone', 'fullName', 'email', 'kycId'],
        where: userSearchName,
        include: [kycInclude],
      };

      let whereData: any = {
        emi_date: {
          [Op.gte]: fromDate.toJSON(),
          [Op.lte]: toData.toJSON(),
        },
      };

      const attributes = [
        'id',
        'emi_date',
        'emi_amount',
        'loanId',
        'payment_done_date',
        'payment_status',
        'payment_due_status',
        'penalty',
        'penalty_days',
        'paymentId',
        'userId',
        'pay_type',
        'principalCovered',
        'interestCalculate',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'totalPenalty',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
      ];

      const loanInclude = {
        model: loanTransaction,
        attributes: [
          'id',
          'manualVerificationAcceptName',
          'manualVerificationAcceptId',
          'loan_disbursement_date',
          'loan_disbursement_id',
          'loanStatus',
          'netApprovedAmount',
          'interestRate',
          'netEmiData',
          'mandate_id',
          'loan_disbursement',
        ],
        include: [
          {
            model: disbursementEntity,
            attributes: ['id', 'amount', 'bank_name', 'account_number', 'ifsc'],
          },
          { model: BankingEntity, attributes: ['adminId', 'id', 'salary'] },
        ],
      };

      const options: any = {
        where: whereData,
        order: [['emi_date', 'ASC']],
        include: [loanInclude, userInclude],
        distinct: true,
      };

      if (download != 'true') {
        options.offset = (page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = 1 * PAGE_LIMIT;
      }

      let emitList: any = await this.EMIRepository.getAllRawDataWithCount(
        attributes,
        options,
      );

      const emiDetailsList = [];
      for (let index = 0; index < emitList.rows.length; index++) {
        const emiDetails = emitList.rows[index];

        const mobile_number = await this.cryptService.decryptPhone(
          emiDetails.user.phone,
        );

        const kycData = emiDetails?.user?.kycData ?? {};

        let salary: any = emiDetails?.loan?.bankingData?.salary ?? 0;

        let dob = kycData.aadhaarDOB ?? '';
        dob = await this.typeService.getDateAsPerAadhaarDOB(dob);

        let repayAmount =
          emiDetails.payment_status == '1' ? emiDetails.emi_amount : '-';

        let netEmiDetails: any = {};
        let emiNumber = 0;
        let principal = emiDetails?.principalCovered;
        let interest = emiDetails?.interestCalculate;
        let deferredInt = emiDetails?.regInterestAmount ?? 0;
        let bounceCharge =
          (emiDetails?.bounceCharge ?? 0) +
          (emiDetails?.gstOnBounceCharge ?? 0);
        let penalCharges =
          (emiDetails?.totalPenalty ?? 0) +
          (emiDetails?.dpdAmount ?? 0) +
          (emiDetails?.penaltyChargesGST ?? 0);
        let legalCharge =
          (emiDetails?.legalCharge ?? 0) + (emiDetails?.legalChargeGST ?? 0);
        emiDetails?.loan?.netEmiData.forEach((emiRes, key) => {
          let emiList = JSON.parse(emiRes);
          if (emiList.Date.indexOf(emiDetails.emi_date) !== -1) {
            netEmiDetails = emiList;
            emiNumber = key + 1;
          }
        });

        let rePayAmount =
          this.typeService.amountNumberWithCommas(repayAmount) !== '-'
            ? this.typeService.amountNumberWithCommas(repayAmount)
            : '';

        emiDetailsList.push({
          userId: emiDetails.user.id,
          Name: emiDetails.user.fullName,
          Mobile: mobile_number,
          'EMI Number': 'EMI - ' + emiNumber,
          'Loan ID': emiDetails.loanId,
          'Interest rate': emiDetails?.loan?.interestRate + '%',
          'EMI Date': emiDetails?.emi_date
            ? this.typeService.getDateFormatted(emiDetails.emi_date)
            : '-',
          'EMI Paid Date': emiDetails?.payment_done_date
            ? this.typeService.getDateFormatted(emiDetails.payment_done_date)
            : '-',
          'EMI Amount': this.typeService.amountNumberWithCommas(
            emiDetails.emi_amount,
          ),
          'Repay Amount': rePayAmount,
          'Penalty Days': emiDetails.penalty_days
            ? emiDetails.penalty_days
            : '-',
          'Principal Amount':
            this.typeService.amountNumberWithCommas(principal),
          'Interest Amount': this.typeService.amountNumberWithCommas(interest),
          'Deferred Interest': deferredInt
            ? this.typeService.amountNumberWithCommas(deferredInt)
            : '-',
          'Bounce Charges': bounceCharge
            ? this.typeService.amountNumberWithCommas(bounceCharge)
            : '-',
          'Penal Charges': penalCharges
            ? this.typeService.amountNumberWithCommas(penalCharges)
            : '-',
          'Legal Charges': legalCharge
            ? this.typeService.amountNumberWithCommas(legalCharge)
            : '-',
          'Payment Type': emiDetails.pay_type,
          Salary: salary,
          'Date of Birth': dob.split('-').reverse().join('-'),
          'Approve Amount': this.typeService.amountNumberWithCommas(
            emiDetails?.loan?.netApprovedAmount
              ? emiDetails.loan.netApprovedAmount
              : 0,
          ),
          'Loan Approved By':
            (
              await this.commonSharedService.getAdminData(
                emiDetails?.loan?.manualVerificationAcceptId,
              )
            )?.fullName ?? '-',
          'Bank Name': emiDetails?.loan?.disbursementData[0]?.bank_name,
          'Bank Approved By':
            (
              await this.commonSharedService.getAdminData(
                emiDetails?.loan?.bankingData?.adminId,
              )
            )?.fullName ?? '-',
        });
      }
      emitList.rows = emiDetailsList;
      if (needAllData == 'true') return emitList;
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [emitList.rows],
          sheetName: 'All EMI Details.xlsx',
          needFindTuneKey: false,
          startDate,
          endDate,
          reportStore: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return emitList;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async completedLoanReport(
    page: number,
    pagesize: number,
    start_date: string,
    end_date: string,
    download: string,
  ) {
    try {
      //Lower bound
      const d = this.typeService.getGlobalDate(new Date(start_date));
      //Upper bound
      const d1 = this.typeService.getGlobalDate(new Date(end_date));

      const allCompletedLoanData = await this.emiService.getCompletedEmiData(
        d,
        d1,
      );
      if (!allCompletedLoanData || allCompletedLoanData === k500Error)
        return k500Error;

      const loanIdArr = [
        ...new Set(allCompletedLoanData.map((item) => item.loan.id)),
      ];

      const finalData = [];
      for (let i = 0; i < loanIdArr.length; i++) {
        try {
          const loanId = loanIdArr[i];
          const loanAttr = [
            'id',
            'userId',
            'loan_disbursement_date',
            'loan_disbursement_id',
            'netApprovedAmount',
            'manualVerificationAcceptName',
            'stampFees',
            'loanFees',
            'netEmiData',
          ];

          const allOptions = {
            where: { id: loanId },
            include: [
              { model: registeredUsers, attributes: ['fullName'] },
              {
                model: disbursementEntity,
                attributes: ['id', 'payout_id', 'amount', 'status'],
              },
              {
                model: EmiEntity,
                attributes: [
                  'id',
                  'emi_amount',
                  'penalty',
                  'payment_done_date',
                  'paymentId',
                ],
                order: [['id', 'ASC']],
              },
            ],
          };
          const loanDataArr = await this.loanRepo.getTableWhereData(
            loanAttr,
            allOptions,
          );
          if (!loanDataArr || loanDataArr === k500Error) continue;
          if (loanDataArr.length === 0) continue;
          loanDataArr[0].emiData.sort((a, b) => a.id - b.id);
          const loanData = loanDataArr[0];

          const allEmiData = loanData.emiData;

          const lastEmiDoneDate = new Date(
            allEmiData[allEmiData.length - 1].payment_done_date,
          ).getTime();

          if (
            d.getTime() <= lastEmiDoneDate &&
            d1.getTime() >= lastEmiDoneDate
          ) {
            finalData.push({ ...loanData });
          }
        } catch (error) {}
      }
      const finalPaginateData = {
        count: finalData.length,
        rows: finalData,
      };
      if (download == 'false') {
        const skip1 = page * pagesize - pagesize;
        finalPaginateData.rows = finalData.slice(skip1, skip1 + pagesize);
      }

      let completedLoanList = [];
      finalPaginateData.rows.forEach((completedLoanRes) => {
        let totalRepaid: number = 0;
        completedLoanRes.emiData.map((emiRes) => {
          totalRepaid += parseFloat(emiRes.emi_amount);
        });

        completedLoanList.push({
          userId: completedLoanRes.userId,
          Name: completedLoanRes.registeredUsers.fullName,
          'Loan ID': completedLoanRes.id,
          'Approved amount': completedLoanRes.netApprovedAmount,
          'Repaid amount': totalRepaid,
        });
      });
      finalPaginateData.rows = completedLoanList;
      return finalPaginateData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getAllDefaultersPendingCrm(body) {
    try {
      const start_date = body?.startDate ?? new Date();
      const end_date = body?.endDate ?? new Date();
      const download = body?.download;
      const page = body?.page;
      const downloadId = body?.downloadId;
      const d1 = new Date();
      let searchText = body?.searchText;
      d1.setDate(d1.getDate() - 7);
      const crmAttr = [
        'id',
        'userId',
        'title',
        'description',
        'status',
        'lastUpdatedBy',
        'createdAt',
        'updatedAt',
        'due_date',
        'relationData',
        'categoryId',
        'loanId',
      ];
      const crmWhere: any = {
        status: '0',
        createdAt: {
          [Op.lte]: d1.toJSON(),
        },
        loanId: { [Op.ne]: null },
      };

      const skip = page * PAGE_LIMIT - PAGE_LIMIT;
      const crmOptions: any = {
        where: crmWhere,
        include: [
          {
            required: true,
            model: registeredUsers,
            attributes: ['id', 'fullName'],
            include: [
              {
                model: EmiEntity,
                where: {
                  payment_status: '0',
                  penalty_days: { [Op.ne]: null },
                  payment_due_status: '1',
                },
                attributes: ['id', 'emi_amount', 'emi_date', 'loanId'],
              },
            ],
          },
        ],
      };

      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters === 'l-') {
          crmWhere.loanId = +restOfString;
        } else {
          crmOptions.include[0].where = {
            fullName: {
              [Op.iRegexp]: searchText,
            },
          };
        }
      }
      if (download !== 'true') {
        crmOptions['offset'] = skip;
        crmOptions['limit'] = 1 * PAGE_LIMIT;
      }

      const crmData = await this.crmRepo.getTableWhereCountData(
        crmAttr,
        crmOptions,
      );
      if (crmData == k500Error) return k500Error;

      let crmList = [];
      crmData.rows.forEach((crmRes) => {
        const titleName = crmRes?.relationData['dispositionName']
          ? crmRes?.relationData['dispositionName']
          : '';
        const categoryName =
          crmRes.categoryId == 0
            ? 'Pre-calling collection'
            : crmRes.categoryId == 1
            ? 'Post-calling collection'
            : crmRes.categoryId == 2
            ? 'Calling'
            : null;
        crmList.push({
          userId: crmRes.userId,
          'Loan Id': crmRes.loanId,
          Name: crmRes.registeredUsers.fullName,
          Category: categoryName,
          Title: titleName,
          'Last Updated By': crmRes.lastUpdatedBy,
        });
      });
      crmData.rows = crmList;

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [crmData.rows],
          sheetName: 'All defaulters pending CRM.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          start_date,
          end_date,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);

        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return crmData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getAllLoanDueReport(
    startDate,
    endDate,
    dueLoanSearchText,
    dueLoanOptions,
    dueLoanAttributes,
  ) {
    try {
      const d: Date = this.typeService.getGlobalDate(startDate);
      const d1: Date = this.typeService.getGlobalDate(endDate);
      const allLoandDueReportRawData = await this.getRawDisbursedmentData(
        d,
        d1,
        dueLoanAttributes,
        dueLoanOptions,
        'dueLoan',
        dueLoanSearchText,
      );
      if (allLoandDueReportRawData === k500Error) return k500Error;
      return allLoandDueReportRawData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getRawDisbursedmentData(
    d,
    d1,
    attributes,
    options,
    reportType?,
    searchText?,
  ) {
    try {
      let loanSearchWhere: any = {};
      if (searchText) {
        loanSearchWhere = {
          [Op.or]: [
            {
              '$registeredUsers.fullName$': {
                [Op.iRegexp]: searchText,
              },
            },
            Sequelize.where(
              Sequelize.cast(Sequelize.col('loan_disbursement_id'), 'varchar'),
              { [Op.iLike]: `%${searchText}%` },
            ),
          ],
        };
      }
      const where: any = {
        loan_disbursement: '1',
        loan_disbursement_date: {
          [Op.gte]: d.toJSON(),
          [Op.lte]: d1.toJSON(),
        },
        ...loanSearchWhere,
      };
      options.where = where;
      const include: any[] = [];
      options.order = [['loan_disbursement_date', 'DESC']];

      let userSearchWhere: any = {};
      if (searchText) {
        userSearchWhere = {
          [Op.or]: [
            {
              fullName: { [Op.iRegexp]: searchText },
            },
          ],
        };
      }
      const userInclude = {
        attributes: ['id', 'fullName', 'phone'],
        model: registeredUsers,
        required: true,
        duplicating: false,
      };
      include.push(userInclude);

      const disbursedDataAttributes: any = [
        'id',
        'ifsc',
        'account_number',
        'bank_name',
        'amount',
        'status',
        'utr',
      ];
      const adminInclude = {
        model: admin,
        attributes: ['id', 'fullName'],
        as: 'adminData',
      };
      include.push(adminInclude);
      const disbursedInclude = {
        model: disbursementEntity,
        attributes: disbursedDataAttributes,
      };
      include.push(disbursedInclude);
      options.include = include;
      options.order = [['id', 'ASC']];
      const allDisbursedData: any =
        await this.loanRepo.getTableWhereDataWithCounts(attributes, options);
      if (allDisbursedData == k500Error) return k500Error;
      let totalDisbursedAmount = 0;
      const emiOptions: any = {};
      const emAttributes: any = [
        'id',
        'loanId',
        'payment_status',
        'emi_amount',
        'penalty',
        'paymentId',
        'payment_done_date',
        'fullPayPrincipal',
        'fullPayInterest',
        'fullPayPenalty',
      ];
      let loanArr = [];
      await allDisbursedData.rows.map((item) => {
        loanArr.push(item.id);
      });
      emiOptions.where = {
        loanId: { [Op.in]: loanArr },
      };
      emiOptions.order = [['id', 'ASC']];
      const allEmiData = await this.emiRepo.getTableWhereData(
        emAttributes,
        emiOptions,
      );

      if (allEmiData == k500Error) return k500Error;

      for (let i = 0; i < allDisbursedData.rows.length; i++) {
        try {
          const loanItem = allDisbursedData.rows[i];
          const tempObj = {
            accId: null,
            name: null,
            Mobile: null,
            loanId: null,
            interest_rate: null,
            loanStatus: null,
            approvedAmount: null,
            utr: '-',
            repaidAmount: null,
            disbursementAmount: null,
            emiAmount1: null,
            emiDate1: null,
            emiPenalty1: null,
            emiRepayDate1: null,
            emiPrincipal1: null,
            emiInterest1: null,
            emiAmount2: null,
            emiDate2: null,
            emiPenalty2: null,
            emiRepayDate2: null,
            emiPrincipal2: null,
            emiInterest2: null,
            emiAmount3: null,
            emiDate3: null,
            emiPenalty3: null,
            emiRepayDate3: null,
            emiPrincipal3: null,
            emiInterest3: null,
            emiAmount4: null,
            emiDate4: null,
            emiPenalty4: null,
            emiRepayDate4: null,
            emiPrincipal4: null,
            emiInterest4: null,
            processingFeesPerc: null,
            stampDuty: null,
            stampDutyGST: null,
            processingFeesGST: null,
            CGST: null,
            SGST: null,
            processingFees: null,
            fullPayAmount: null,
            loanDisbursementDate: null,
            expectedAmount: null,
            fullPayDate: null,
            approved_by: null,
            fullPayPenalty: null,
            fullPayPrincipal: null,
            fullPayInterest: null,
          };
          tempObj['accId'] = loanItem?.accId;
          let gstAmounts;
          let CGST;
          let SGST;
          if (loanItem.stampFees !== GLOBAL_CHARGES.STAMP_FEES) {
            const stampDutyProfit = 10;
            loanItem.stampFees = loanItem.stampFees - stampDutyProfit;
            gstAmounts = this.typeService.gstCalculations(
              loanItem.loanFees,
              stampDutyProfit,
            );

            CGST =
              (gstAmounts.stampExcludingGST +
                gstAmounts.processingExcludingGST) /
              2;
            SGST =
              (gstAmounts.stampExcludingGST +
                gstAmounts.processingExcludingGST) /
              2;

            tempObj.SGST = parseFloat(SGST.toFixed(2));
            tempObj.CGST = parseFloat(CGST.toFixed(2));
          } else {
            const tempGstAmounts = this.typeService.gstCalculations(
              loanItem.loanFees,
              10,
            );
            const tempCGST = tempGstAmounts.processingExcludingGST / 2;
            const tempSGST = tempGstAmounts.processingExcludingGST / 2;
            tempObj.processingFeesGST = tempGstAmounts.processingGST;
            tempObj.SGST = parseFloat(tempSGST.toFixed(2));
            tempObj.CGST = parseFloat(tempCGST.toFixed(2));
          }

          if (loanItem.netEmiData) {
            for (let i = 0; i < loanItem.netEmiData.length; i++) {
              try {
                let netItem = loanItem.netEmiData[i];
                netItem = JSON.parse(netItem);
                if (i === 0) {
                  tempObj.emiPrincipal1 = netItem.PrincipalCovered;
                  tempObj.emiInterest1 = netItem.InterestCalculate;
                  tempObj.emiDate1 = netItem.Date;
                } else if (i === 1) {
                  tempObj.emiPrincipal2 = netItem.PrincipalCovered;
                  tempObj.emiInterest2 = netItem.InterestCalculate;
                  tempObj.emiDate2 = netItem.Date;
                } else if (i === 2) {
                  tempObj.emiPrincipal3 = netItem.PrincipalCovered;
                  tempObj.emiInterest3 = netItem.InterestCalculate;
                  tempObj.emiDate3 = netItem.Date;
                } else if (i === 3) {
                  tempObj.emiPrincipal4 = netItem.PrincipalCovered;
                  tempObj.emiInterest4 = netItem.InterestCalculate;
                  tempObj.emiDate4 = netItem.Date;
                }
              } catch (error) {}
            }
          }

          const EMIData = [];
          for (let j = 0; j < allEmiData.length; j++) {
            if (allEmiData[j].loanId == loanItem.id) {
              EMIData.push(allEmiData[j]);
            }
          }

          for (let j = 0; j < EMIData.length; j++) {
            try {
              const emiItem: any = EMIData[j];
              tempObj.fullPayInterest = emiItem.fullPayInterest;
              tempObj.fullPayPrincipal = emiItem.fullPayPrincipal;
              tempObj.fullPayPenalty = emiItem.fullPayPenalty;
              tempObj.fullPayAmount =
                emiItem.fullPayPrincipal +
                emiItem.fullPayInterest +
                emiItem.fullPayPenalty;
              if (tempObj.fullPayAmount > 0) {
                tempObj.fullPayDate = emiItem.payment_done_date;
              }
              if (emiItem.payment_status === '1') {
                let fullPayString = false;

                if (fullPayString) {
                  // break;
                  if (j === 0) {
                    tempObj.emiPenalty1 = +emiItem.penalty;
                  } else if (j === 1) {
                    tempObj.emiPenalty2 = +emiItem.penalty;
                  } else if (j === 2) {
                    tempObj.emiPenalty3 = +emiItem.penalty;
                  } else if (j === 3) {
                    tempObj.emiPenalty4 = +emiItem.penalty;
                  }
                } else {
                  if (j === 0) {
                    tempObj.emiAmount1 = +emiItem.emi_amount;
                    tempObj.emiPenalty1 = +emiItem.penalty;
                    tempObj.emiRepayDate1 = emiItem.payment_done_date;
                  } else if (j === 1) {
                    tempObj.emiAmount2 = +emiItem.emi_amount;
                    tempObj.emiPenalty2 = +emiItem.penalty;
                    tempObj.emiRepayDate2 = emiItem.payment_done_date;
                  } else if (j === 2) {
                    tempObj.emiAmount3 = +emiItem.emi_amount;
                    tempObj.emiPenalty3 = +emiItem.penalty;
                    tempObj.emiRepayDate3 = emiItem.payment_done_date;
                  } else if (j === 3) {
                    tempObj.emiAmount4 = +emiItem.emi_amount;
                    tempObj.emiPenalty4 = +emiItem.penalty;
                    tempObj.emiRepayDate4 = emiItem.payment_done_date;
                  }
                }
              }
            } catch (error) {}
          }
          if (
            loanItem.disbursementData &&
            loanItem.disbursementData.length > 0
          ) {
            const actualDistribusedAmount =
              loanItem.disbursementData[0].amount / 100;
            totalDisbursedAmount += actualDistribusedAmount;
            loanItem.disbursementData[0].amount = actualDistribusedAmount;
            tempObj['bank_name'] = loanItem.disbursementData[0].bank_name;
            tempObj['account_number'] =
              loanItem.disbursementData[0].account_number;
            tempObj['ifsc'] = loanItem.disbursementData[0].ifsc;
            tempObj.utr = loanItem.disbursementData[0].utr ?? '-';
          }
          let fullPayPenalty = 0;
          if (!tempObj.emiAmount1 && tempObj.emiPenalty1) {
            fullPayPenalty += tempObj.emiPenalty1;
          } else if (!tempObj.emiAmount2 && tempObj.emiPenalty2) {
            fullPayPenalty += tempObj.emiPenalty2;
          } else if (!tempObj.emiAmount3 && tempObj.emiPenalty3) {
            fullPayPenalty += tempObj.emiPenalty3;
          } else if (!tempObj.emiAmount4 && tempObj.emiPenalty4) {
            fullPayPenalty += tempObj.emiPenalty4;
          }
          let repaidAmount =
            +tempObj.emiAmount1 +
            +tempObj.emiPenalty1 +
            +tempObj.emiAmount2 +
            +tempObj.emiPenalty2 +
            +tempObj.emiAmount3 +
            +tempObj.emiPenalty3 +
            +tempObj.emiAmount4 +
            +tempObj.emiPenalty4 +
            +tempObj.fullPayAmount;
          repaidAmount = repaidAmount - fullPayPenalty;
          const expectedAmount =
            +tempObj.emiPrincipal1 +
            +tempObj.emiInterest1 +
            +tempObj.emiPenalty1 +
            +tempObj.emiPrincipal2 +
            +tempObj.emiInterest2 +
            +tempObj.emiPenalty2 +
            +tempObj.emiPrincipal3 +
            +tempObj.emiInterest3 +
            +tempObj.emiPenalty3 +
            +tempObj.emiPrincipal4 +
            +tempObj.emiInterest4 +
            +tempObj.emiPenalty4;
          tempObj['name'] = loanItem.registeredUsers.fullName;
          tempObj['Mobile'] = await this.cryptService.decryptPhone(
            loanItem.registeredUsers.phone,
          );
          tempObj['userId'] = loanItem.registeredUsers.id;
          tempObj['loanId'] = loanItem.id;
          // tempObj['accId'] = loanItem.loan_disbursement_id;
          tempObj['interest_rate'] = loanItem.interestRate;
          tempObj['approvedAmount'] = loanItem.approvedLoanAmount;
          tempObj['netApprovedAmount'] = loanItem.netApprovedAmount;
          tempObj['loanStatus'] = loanItem.loanStatus;
          tempObj['disbursementAmount'] = loanItem.disbursementData[0]
            ? loanItem.disbursementData[0].amount
            : null;
          tempObj['loanDisbursementDate'] = loanItem.loan_disbursement_date
            ? loanItem.loan_disbursement_date
            : null;
          if (reportType == 'exelReport') {
            tempObj.emiDate1 = tempObj.emiDate1
              ? this.typeService.getDateFormatted(tempObj.emiDate1)
              : null;
            tempObj.emiDate2 = tempObj.emiDate2
              ? this.typeService.getDateFormatted(tempObj.emiDate2)
              : null;
            tempObj.emiDate3 = tempObj.emiDate3
              ? this.typeService.getDateFormatted(tempObj.emiDate3)
              : null;
            tempObj.emiDate4 = tempObj.emiDate4
              ? this.typeService.getDateFormatted(tempObj.emiDate4)
              : null;
            tempObj.emiRepayDate1 = tempObj.emiRepayDate1
              ? this.typeService.getDateFormatted(tempObj.emiRepayDate1)
              : null;
            tempObj.emiRepayDate2 = tempObj.emiRepayDate2
              ? this.typeService.getDateFormatted(tempObj.emiRepayDate2)
              : null;
            tempObj.emiRepayDate3 = tempObj.emiRepayDate3
              ? this.typeService.getDateFormatted(tempObj.emiRepayDate3)
              : null;
            tempObj.emiRepayDate4 = tempObj.emiRepayDate4
              ? this.typeService.getDateFormatted(tempObj.emiRepayDate4)
              : null;
            tempObj.fullPayDate = tempObj.fullPayDate
              ? this.typeService.getDateFormatted(tempObj.fullPayDate)
              : null;
            tempObj['loanDisbursementDate'] = loanItem.loan_disbursement_date
              ? this.typeService.getDateFormatted(
                  loanItem.loan_disbursement_date,
                )
              : null;
          }
          tempObj['processingFeesPerc'] = loanItem.processingFees;
          tempObj['stampDuty'] = loanItem.stampFees;
          tempObj['stampDutyGST'] = gstAmounts ? gstAmounts.stampGST : null;
          tempObj['processingFeesGST'] = gstAmounts
            ? gstAmounts.processingGST
            : tempObj['processingFeesGST'];
          tempObj['CGST'] = CGST
            ? parseFloat(CGST.toFixed(2))
            : tempObj['CGST'];
          tempObj['SGST'] = SGST
            ? parseFloat(SGST.toFixed(2))
            : tempObj['SGST'];
          tempObj['processingFees'] = loanItem.loanFees;
          tempObj['approved_by'] = loanItem.adminData
            ? loanItem.adminData.fullName
            : '';
          tempObj['repaidAmount'] = repaidAmount;
          tempObj['disbursementStatus'] = loanItem.disbursementData[0]
            ? loanItem.disbursementData[0].status
            : '';
          tempObj['expectedAmount'] = expectedAmount;
          delete loanItem.netEmiData;
          allDisbursedData.rows[i] = {
            ...tempObj,
          };
        } catch (error) {}
      }
      totalDisbursedAmount = parseFloat(totalDisbursedAmount.toFixed(2));
      if (reportType === 'exelReport') {
        return { allDisbursedData, totalDisbursedAmount };
      }
      return allDisbursedData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async uninstallAppActiveLoanReport(data) {
    try {
      let searchText = data?.searchText;
      const userInclude: any = {
        model: registeredUsers,
        attributes: [
          'id',
          'fullName',
          'phone',
          'email',
          'completedLoans',
          'isUnInstallApp',
          'gender',
          'city',
          'state',
        ],
        where: { isUnInstallApp: { [Op.ne]: null } },
        include: [
          {
            model: employmentDetails,
            attributes: ['id', 'companyName', 'salary'],
          },
        ],
        order: [['isUnInstallApp', 'DESC']],
      };

      const traInclude = {
        model: TransactionEntity,
        attributes: ['id', 'status', 'completionDate'],
        where: { status: 'COMPLETED' },
        required: false,
      };

      const bankingInclude: SequelOptions = {
        model: BankingEntity,
        attributes: ['id', 'salary'],
        required: false,
      };

      const loanAttributes = ['id', 'loanStatus', 'loan_disbursement_date'];
      const page = data?.page || 1;
      const loanOption: any = {
        where: { loanStatus: 'Active' },
        include: [bankingInclude, userInclude, traInclude],
      };

      if (data?.download !== 'true') {
        loanOption['limit'] = 1 * PAGE_LIMIT;
        loanOption['offset'] = page * PAGE_LIMIT - PAGE_LIMIT;
      }

      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString: any = searchText.substring(2);
        if (firstTwoLetters == 'l-' || firstTwoLetters == 'L-')
          loanOption.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userInclude.where.phone = { [Op.iRegexp]: searchText };
          } else {
            userInclude.where[Op.or] = [
              { fullName: { [Op.iRegexp]: searchText } },
              { email: { [Op.iRegexp]: searchText } },
            ];
          }
        }
      }

      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        loanAttributes,
        loanOption,
      );
      if (loanData === k500Error) return kInternalError;

      let unistallUserList = [];
      loanData?.rows.forEach((lonRes) => {
        try {
          let isUnInstallApp = lonRes?.registeredUsers?.isUnInstallApp
            ? moment(lonRes?.registeredUsers?.isUnInstallApp).format('DD-MM-Y')
            : '';

          let loan_disbursement_date = lonRes?.loan_disbursement_date
            ? moment(lonRes?.loan_disbursement_date).format('DD-MM-Y')
            : '';

          let lastRepaymentDate = '-';
          if (lonRes?.transactionData.length) {
            lonRes?.transactionData.forEach((traRes) => {
              try {
                if (traRes?.completionDate) {
                  lastRepaymentDate = moment(traRes?.completionDate).format(
                    'DD-MM-Y',
                  );
                } else {
                  lastRepaymentDate = '';
                }
              } catch (error) {}
            });
          }

          unistallUserList.push({
            userId: lonRes?.registeredUsers?.id,
            'Loan Id': lonRes?.id,
            Name: lonRes?.registeredUsers?.fullName,
            Phone: this.cryptService.decryptPhone(
              lonRes?.registeredUsers?.phone,
            ),
            Email: lonRes?.registeredUsers?.email,
            'Completed Loan': lonRes?.registeredUsers?.completedLoans ?? 0,
            'Disbursement Date': loan_disbursement_date ?? '-',
            'Last Repayment Date': lastRepaymentDate ?? '-',
            Gender: lonRes?.registeredUsers?.gender ?? '-',
            Salary: this.typeService.amountNumberWithCommas(
              lonRes?.bankingData?.salary,
            ),
            'Company name':
              lonRes?.registeredUsers?.employmentData?.companyName,
            City: lonRes?.registeredUsers?.city ?? '-',
            State: lonRes?.registeredUsers?.state ?? '-',
            'Uninstall Date': isUnInstallApp ?? '-',
          });
        } catch (error) {}
      });
      loanData.rows = unistallUserList;
      if (data?.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [unistallUserList],
          sheetName: 'Active loan uninstall application.xlsx',
          needFindTuneKey: false,
        };

        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = data?.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return loanData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async legalSectionPayments(reqData) {
    const targetData: any = await this.getDataForLegalSectionPayments(reqData);
    if (targetData?.message) return targetData;

    const loanList = targetData.loanList ?? [];
    const transList = targetData.transList ?? [];
    const legalList = targetData.legalList ?? [];

    const finalizedList = [];
    for (let index = 0; index < loanList.length; index++) {
      try {
        const loanData = loanList[index];
        const loanId = loanData.id;
        const transactionList = transList.filter((el) => el.loanId == loanId);
        let legalListRawData = legalList.filter((el) => el.loanId == loanId);
        legalListRawData = legalListRawData.sort(
          (b, a) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        const legalDataList = [];
        legalListRawData.forEach((el) => {
          const type = el.type;
          const isAdded = legalDataList.find((el) => el.type == type);
          if (!isAdded) legalDataList.push(el);
        });

        const demandLetterData = legalDataList.find((el) => el.type == 1);
        const demandLetterTime = demandLetterData
          ? this.typeService.getGlobalDate(demandLetterData.createdAt).getTime()
          : null;
        const noticeData = legalDataList.find((el) => el.type == 2);
        const noticeTime = noticeData
          ? this.typeService.getGlobalDate(noticeData.createdAt).getTime()
          : null;
        const caseFilledData = legalDataList.find((el) => el.type == 5);
        const caseFilledTime = caseFilledData
          ? this.typeService.getGlobalDate(caseFilledData.createdAt).getTime()
          : null;
        const summonsData = legalDataList.find((el) => el.type == 6);
        const summonsTime = summonsData
          ? this.typeService.getGlobalDate(summonsData.createdAt).getTime()
          : null;
        const warrentData = legalDataList.find((el) => el.type == 7);
        const warrentTime = warrentData
          ? this.typeService.getGlobalDate(warrentData.createdAt).getTime()
          : null;

        const preparedData = {
          loanId,
          amountBeforeDL: 0,
          amountAfterDL: 0,
          amountBeforeNotice: 0,
          amountAfterNotice: 0,
          amountBeforeCaseFilled: 0,
          amountAfterCaseFilled: 0,
          amountBeforeSummons: 0,
          amountAfterSummons: 0,
          amountBeforeWarrent: 0,
          amountAfterWarrent: 0,
        };
        transactionList.forEach((el) => {
          const paidTime = new Date(el.completionDate).getTime();
          const paidAmount = el.paidAmount;
          if (warrentTime && warrentTime <= paidTime)
            preparedData.amountAfterWarrent += paidAmount;
          else if (summonsTime && summonsTime <= paidTime)
            preparedData.amountAfterSummons += paidAmount;
          else if (caseFilledTime && caseFilledTime <= paidTime)
            preparedData.amountAfterCaseFilled += paidAmount;
          else if (noticeTime && noticeTime <= paidTime)
            preparedData.amountAfterNotice += paidAmount;
          else if (demandLetterTime && demandLetterTime <= paidTime)
            preparedData.amountAfterDL += paidAmount;
          else if (demandLetterTime && paidTime < demandLetterTime)
            preparedData.amountBeforeDL += paidAmount;
          else if (noticeTime && paidTime < noticeTime)
            preparedData.amountBeforeNotice += paidAmount;
          else if (caseFilledTime && paidTime < caseFilledTime)
            preparedData.amountBeforeCaseFilled += paidAmount;
          else if (summonsTime && paidTime < summonsTime)
            preparedData.amountBeforeSummons += paidAmount;
          else if (warrentTime && paidTime < warrentTime)
            preparedData.amountBeforeWarrent += paidAmount;
        });

        // Fine tune amount
        preparedData.amountBeforeDL = Math.floor(preparedData.amountBeforeDL);
        preparedData.amountAfterDL = Math.floor(preparedData.amountAfterDL);
        preparedData.amountBeforeNotice = Math.floor(
          preparedData.amountBeforeNotice,
        );
        preparedData.amountAfterNotice = Math.floor(
          preparedData.amountAfterNotice,
        );
        preparedData.amountBeforeCaseFilled = Math.floor(
          preparedData.amountBeforeCaseFilled,
        );
        preparedData.amountAfterCaseFilled = Math.floor(
          preparedData.amountAfterCaseFilled,
        );
        preparedData.amountBeforeSummons = Math.floor(
          preparedData.amountBeforeSummons,
        );
        preparedData.amountAfterSummons = Math.floor(
          preparedData.amountAfterSummons,
        );
        preparedData.amountBeforeWarrent = Math.floor(
          preparedData.amountBeforeWarrent,
        );
        preparedData.amountAfterWarrent = Math.floor(
          preparedData.amountAfterWarrent,
        );

        finalizedList.push(preparedData);
      } catch (error) {}
    }

    const rawExcelData = {
      sheets: ['LegalSectionPayments'],
      data: [finalizedList],
      sheetName: 'LegalSectionPayments.xlsx',
    };
    return await this.fileService.objectToExcelURL(rawExcelData);
  }

  private async getDataForLegalSectionPayments(reqData) {
    // Params validation
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');

    // Get eligible loanIds
    let attributes = ['loanId'];
    let options: any = { group: ['loanId'] };
    let legalList = await this.legalRepo.getTableWhereData(attributes, options);
    if (legalList == k500Error) return kInternalError;
    let loanIds = legalList.map((el) => el.loanId);

    // Get target payments
    attributes = ['completionDate', 'loanId', 'paidAmount'];
    options = {
      where: {
        completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
        loanId: { [Op.in]: loanIds },
        status: kCompleted,
      },
    };
    const transList = await this.transRepo.getTableWhereData(
      attributes,
      options,
    );
    if (transList == k500Error) return kInternalError;
    loanIds = transList.map((el) => el.loanId);

    // Get legal section data
    attributes = ['createdAt', 'loanId', 'type'];
    options = {
      where: {
        loanId: { [Op.in]: loanIds },
        type: { [Op.in]: [1, 2, 5, 6, 7] },
      },
    };
    legalList = await this.legalRepo.getTableWhereData(attributes, options);
    if (legalList == k500Error) return kInternalError;

    // Get loan data
    attributes = ['id', 'loanStatus'];
    options = { where: { id: loanIds } };
    const loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) return kInternalError;

    return { transList, legalList, loanList };
  }

  async fetchNMapCompletedReport(
    page: number,
    pagesize: number,
    start_date: string,
    end_date: string,
    download: { download: string; downloadId: string },
    searchText,
  ) {
    try {
      //Lower bound
      const d = this.typeService.getGlobalDate(new Date(start_date));
      //Upper bound
      const d1 = this.typeService.getGlobalDate(new Date(end_date));

      const loanAttr = [
        'id',
        'userId',
        'loan_disbursement_date',
        'loan_disbursement_id',
        'netApprovedAmount',
        'manualVerificationAcceptName',
        'stampFees',
        'loanFees',
        'processingFees',
        'netEmiData',
        'loanStatus',
        'manualVerificationAcceptId',
      ];

      const transInclude: { model; attributes?; required?; where? } = {
        model: TransactionEntity,
      };
      transInclude.required = false;
      transInclude.where = { status: kCompleted };
      transInclude.attributes = ['paidAmount', 'penaltyAmount', 'type'];

      const allOptions: any = {
        where: {
          loanStatus: 'Complete',
          loanCompletionDate: {
            [Op.gte]: d.toJSON(),
            [Op.lte]: d1.toJSON(),
          },
        },
        include: [
          { model: registeredUsers, attributes: ['fullName', 'phone'] },
          {
            model: disbursementEntity,
            attributes: ['id', 'payout_id', 'amount', 'status'],
          },
          {
            model: EmiEntity,
            attributes: [
              'id',
              'emi_amount',
              'principalCovered',
              'interestCalculate',
              'penalty',
              'totalPenalty',
              'dpdAmount',
              'penaltyChargesGST',
              'payment_done_date',
              'paymentId',
              'bounceCharge',
              'gstOnBounceCharge',
              'regInterestAmount',
              'legalCharge',
              'legalChargeGST',
              'waived_regInterest',
              'waived_bounce',
              'waived_penal',
              'waived_legal',
              'forClosureAmount',
              'sgstForClosureCharge',
              'cgstForClosureCharge',
            ],
            order: [['id', 'ASC']],
          },
          transInclude,
        ],
      };

      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') allOptions.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = await this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            allOptions.include[0].where = {
              phone: { [Op.iRegexp]: searchText },
            };
          } else
            allOptions.include[0].where = {
              fullName: { [Op.iRegexp]: searchText },
            };
        }
      }

      if (download.download != 'true') {
        allOptions.limit = pagesize;
        allOptions.offset = (page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
      }
      const loanDataArr = await this.loanRepo.getTableWhereDataWithCounts(
        loanAttr,
        allOptions,
      );
      const loanReport = [];
      loanDataArr.rows.forEach((loanData) => {
        // Repaid Amount
        const transList = loanData.transactionData ?? [];
        let repaidAmount = 0;
        transList.forEach((el) => {
          if (el.type == 'REFUND') repaidAmount -= el.paidAmount;
          else repaidAmount += el.paidAmount;
        });
        repaidAmount = parseFloat(repaidAmount.toFixed(2));

        let totalPenalty = 0;
        let forcloseCharge = 0;
        const emiList = loanData.emiData ?? [];

        const disbursementData = (loanData.disbursementData ?? [])[0];
        const processingPerc = loanData.processingFees;
        let processFees =
          (+parseFloat(loanData.netApprovedAmount) * processingPerc) / 100;
        processFees = parseFloat(processFees.toFixed(2));
        const rawProcessingData = parseFloat(
          ((processFees * 100) / 118).toFixed(2),
        );
        const gstData = parseFloat(((rawProcessingData * 18) / 100).toFixed(2));
        const CGST = parseFloat((gstData / 2).toFixed(2));
        const SGST = parseFloat((gstData / 2).toFixed(2));
        let processingFeesIncome = parseFloat(
          (processFees - CGST - SGST).toFixed(2),
        );
        processingFeesIncome = parseFloat(processingFeesIncome.toFixed(2));

        const completedLoanRecord = {
          userId: loanData.userId,
          Name: loanData.registeredUsers.fullName,
          'Loan ID': loanData.id,
          'Approved Amount': loanData.netApprovedAmount,
          'Repaid Amount': repaidAmount,
          'Total Penalty': totalPenalty.toFixed(2),
          'Forclose Charges': forcloseCharge.toFixed(2),
          'Disbursement amount': this.typeService.amountNumberWithCommas(
            parseFloat((disbursementData.amount / 100).toString()).toFixed(2),
          ),
          'EMI 1 Repay Date': '-',
          'EMI 1 Principal': '-',
          'EMI 1 Interest': '-',
          'EMI 1 Penalty': '-',
          'EMI 1 Bounce Charge': '',
          'EMI 1 Deferred Interest': '',
          'EMI 1 Legal Charge': '',
          'EMI 2 Repay Date': '-',
          'EMI 2 Principal': '-',
          'EMI 2 Interest': '-',
          'EMI 2 Penalty': '-',
          'EMI 2 Bounce Charge': '',
          'EMI 2 Deferred Interest': '',
          'EMI 2 Legal Charge': '',
          'EMI 3 Repay Date': '-',
          'EMI 3 Principal': '-',
          'EMI 3 Interest': '-',
          'EMI 3 Penalty': '-',
          'EMI 3 Bounce Charge': '',
          'EMI 3 Deferred Interest': '',
          'EMI 3 Legal Charge': '',
          'EMI 4 Repay Date': '-',
          'EMI 4 Principal': '-',
          'EMI 4 Interest': '-',
          'EMI 4 Penalty': '-',
          'EMI 4 Bounce Charge': '',
          'EMI 4 Deferred Interest': '',
          'EMI 4 Legal Charge': '',
          'Stamp duty': loanData.stampFees.toString(),
          'Processing fees income': this.typeService.amountNumberWithCommas(
            processingFeesIncome.toString(),
          ),
          CGST: CGST.toString(),
          SGST: SGST.toString(),
          'Total processing fees': this.typeService.amountNumberWithCommas(
            processFees.toString(),
          ),
          'Loan disbursement date': moment(
            loanData.loan_disbursement_date,
          ).format('DD-MM-Y'),
          'Payment done date': '',
        };

        let paymentDate = null;
        emiList.forEach((el, emiKey) => {
          const key = `EMI ${emiKey + 1} `;
          const principalAmount = el.principalCovered;
          const interestAmount = el.interestCalculate;
          const penaltyAmount = parseFloat(
            (el.totalPenalty ?? 0) +
              (el.dpdAmount ?? 0) +
              (el.penaltyChargesGST ?? 0) +
              (el.waived_penal ?? 0),
          );
          const bounceCharge = parseFloat(
            (el.bounceCharge ?? 0) +
              (el.gstOnBounceCharge ?? 0) +
              (el.waived_bounce ?? 0),
          );
          const deferredInt = parseFloat(
            (el.regInterestAmount ?? 0) + (el.waived_regInterest ?? 0),
          );
          const legalCharge = parseFloat(
            (el.legalCharge ?? 0) + (el.legalChargeGST ?? 0) + el.waived_legal,
          );
          const forcloseCharges =
            (el.forClosureAmount ?? 0) +
            (el.sgstForClosureCharge ?? 0) +
            (el.cgstForClosureCharge ?? 0);
          completedLoanRecord[key + 'Principal'] = principalAmount
            ? this.typeService.amountNumberWithCommas(
                principalAmount.toString(),
              )
            : '-';

          completedLoanRecord[key + 'Interest'] = interestAmount
            ? this.typeService.amountNumberWithCommas(interestAmount.toString())
            : '-';
          completedLoanRecord[key + 'Penalty'] = penaltyAmount
            ? this.typeService.amountNumberWithCommas(
                penaltyAmount.toFixed(2).toString(),
              )
            : '-';

          completedLoanRecord['EMI ' + (emiKey + 1) + ' Bounce Charge'] =
            bounceCharge ? bounceCharge : '-';
          completedLoanRecord['EMI ' + (emiKey + 1) + ' Deferred Interest'] =
            deferredInt ? deferredInt : '-';
          completedLoanRecord['EMI ' + (emiKey + 1) + ' Legal Charge'] =
            legalCharge ? legalCharge : '-';

          if (el.payment_done_date) {
            const paymentDateInfo = this.dateService.dateToReadableFormat(
              el.payment_done_date,
            );
            completedLoanRecord[key + 'Repay Date'] =
              paymentDateInfo.readableStr;
            if (!paymentDate) paymentDate = new Date(el.payment_done_date);
            else if (paymentDate.getTime() < new Date(el.payment_done_date)) {
              paymentDate = new Date(el.payment_done_date);
            }
          }
          totalPenalty +=
            penaltyAmount + bounceCharge + deferredInt + legalCharge;
          forcloseCharge += forcloseCharges;
        });
        completedLoanRecord['Total Penalty'] = totalPenalty.toFixed(2);
        completedLoanRecord['Forclose Charges'] = forcloseCharge.toFixed(2);
        // Payment date calculation
        if (paymentDate) {
          const paymentDateInfo =
            this.dateService.dateToReadableFormat(paymentDate);
          completedLoanRecord['Payment done date'] =
            paymentDateInfo.readableStr;
        }

        loanReport.push(completedLoanRecord);
      });

      if (download.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [loanReport],
          sheetName: 'All completed loans.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = download.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        loanDataArr.rows = loanReport;
        return loanDataArr;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  // get referral history of userId
  async getReferAndEarnData(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const reportType = query?.reportType;
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const download = query?.download == 'true' ? true : false;
      const downloadId = query?.downloadId ? query.downloadId : '0';
      let searchText = query?.searchText ?? '';

      // get referral history data
      const byIncl: any = {
        model: registeredUsers,
        attributes: ['id', 'phone', 'fullName', 'referralPoints'],
        as: 'referredByData',
      };
      const toIncl = {
        model: registeredUsers,
        attributes: ['id', 'phone', 'fullName', 'createdAt'],
        as: 'referredToData',
      };
      if (searchText && searchText.length >= 3) {
        if (!isNaN(searchText)) {
          searchText = this.cryptService.encryptPhone(searchText);
          searchText = searchText.split('===')[1];
          byIncl.where = { phone: { [Op.iRegexp]: searchText } };
        } else byIncl.where = { fullName: { [Op.iRegexp]: searchText } };
      }
      const attributes = [
        'points',
        'time',
        'referredBy',
        'referredTo',
        'stage',
      ];
      const options: any = {
        where: {
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
          points: { [Op.gt]: 0 },
        },
        include: [byIncl, toIncl],
        order: [['id', 'DESC']],
      };
      if (reportType == 'all') delete options.where.points;
      if (download != true) {
        options.offset = +(query.page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const referralData = await this.referralRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (referralData === k500Error) return kInternalError;
      const finalData: any = await this.prepareReferEarnData(referralData.rows);
      if (finalData?.message) return finalData;
      if (download) {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Refer and Earn.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        referralData.rows = finalData;
        return referralData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // ------------------- Start today auto debit ---------------------------------
  async getTodayAutoDebitData(query) {
    try {
      const options = this.prePareOptionFroAutoDebit(query);
      if (options?.message) return options;
      const result: any = await this.findAutoDebitData(options);

      if (result?.message) return result;

      const finalData = await this.prepareData(result.rows);
      if (query?.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Defaulter auto debit.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(
          updatedData,
          query.downloadId,
        );
        return { fileUrl: url };
      } else {
        return { count: result.count, finalData: finalData };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private prePareOptionFroAutoDebit(query) {
    try {
      const stDate = query?.startDate;
      const enDate = query?.endDate;
      const startDate = this.typeService.getGlobalDate(new Date(stDate));
      const endDate = this.typeService.getGlobalDate(new Date(enDate));
      const status = query?.status;
      const page = query?.page ?? 1;
      const pagesize = query?.pagesize ?? PAGE_LIMIT;
      const offset = pagesize * (page - 1);
      if (!startDate || !endDate || !status) return kParamsMissing;
      // Where condition
      let where: any = {
        [Op.or]: [{ subSource: 'AUTODEBIT' }, { source: 'AUTOPAY' }],
      };
      if (query?.adminId) where.adminId = query?.adminId;
      if (status == '1' || status == '7') {
        where.status = 'INITIALIZED';
        where = { ...where, utr: { [Op.ne]: null } };
      } else if (status == '3' || status == '8') where.status = 'COMPLETED';
      else if (status == '4' || status == '9') {
        where.status = 'FAILED';
        where = {
          [Op.or]: [
            { ...where },
            {
              status: kInitiated,
              subSource: kAutoDebit,
              utr: { [Op.eq]: null },
            },
          ],
        };
      }
      const statusArr = [6, 7, 8, 9];
      let emiWhere: any = {};
      let required = true;
      const filterData: any = {
        [Op.gte]: startDate.toJSON(),
        [Op.lte]: endDate.toJSON(),
      };
      if (statusArr.includes(+status)) {
        let tranWhere: any = {};
        tranWhere.subscriptionDate = {
          [Op.eq]: Sequelize.col('"emiData"."emi_date"'),
        };
        emiWhere.emi_date = filterData;
        if (status == '9') emiWhere.payment_status = '0';
        where = { ...where, ...tranWhere };
      } else {
        let tranWhere: any = {
          [Op.and]: [
            { subscriptionDate: filterData },
            {
              [Op.or]: {
                emiId: { [Op.eq]: null },
                subscriptionDate: {
                  [Op.ne]: Sequelize.col('"emiData"."emi_date"'),
                },
              },
            },
          ],
        };
        where = { ...where, ...tranWhere };
        required = false;
      }
      const whereName: any = {};
      const whereloan: any = {};
      let search = (query?.searchText ?? '').toLowerCase();
      if (search) {
        if (search.startsWith('l-')) whereloan.id = search.replace('l-', '');
        else if (!isNaN(search)) {
          search = this.cryptService.encryptPhone(search);
          if (search == k500Error) return k500Error;
          search = search.split('===')[1];
          whereName.phone = { [Op.like]: '%' + search + '%' };
        } else whereName.fullName = { [Op.iRegexp]: query?.searchText };
      }
      /// include
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_date',
          'emi_amount',
          'loanId',
          'userId',
          'payment_done_date',
          'payment_status',
          'payment_due_status',
        ],
        where: emiWhere,
        required,
      };
      const loanInclude = {
        model: loanTransaction,
        where: whereloan,
        attributes: [
          'id',
          'manualVerificationAcceptName',
          'manualVerificationAcceptId',
          'loan_disbursement_date',
          'loan_disbursement_id',
          'insuranceId',
        ],
        include: [
          { model: admin, attributes: ['id', 'fullName'], as: 'adminData' },
          { model: SubScriptionEntity, attributes: ['id', 'mode'] },
          { model: PredictionEntity, attributes: ['id', 'categorizationTag'] },
          { model: InsuranceEntity, attributes: ['id', 'response'] },
        ],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'phone', 'fullName'],
        where: whereName,
      };

      const include = [emiInclude, loanInclude, userInclude];
      const options: any = { where, order: [['id']], include };
      if ((query?.download ?? 'false') != 'true') {
        options.limit = pagesize;
        options.offset = offset;
      }
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async dailyDefaultersReport(body) {
    try {
      const startDate = body?.startDate;
      const endDate = body?.endDate;
      const fromDate = await this.typeService.getGlobalDate(startDate).toJSON();
      const toDate = await this.typeService.getGlobalDate(endDate).toJSON();
      let searchText = body?.searchText;
      const download = body?.download?.toString() ?? 'false';
      const downloadId = body?.downloadId;
      const emiOptions: any = {
        where: {
          emi_date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate,
          },
          payment_status: '0',
          payment_due_status: '1',
        },
        order: [['id', 'DESC']],
      };
      const emiData = await this.emiRepo.getTableWhereData(
        ['loanId'],
        emiOptions,
      );
      const loanIds = [...new Set(emiData.map((el) => el.loanId))];

      const kycInclude: any = {
        model: KYCEntity,
        attributes: [
          'aadhaarAddress',
          'aadhaarResponse',
          'aadhaarAddressResponse',
        ],
      };
      const empInclude: any = {
        model: employmentDetails,
        attributes: ['id', 'companyName', 'companyAddress'],
      };
      const predictInclude: any = {
        model: PredictionEntity,
        attributes: ['id', 'categorizationTag'],
      };
      const masterInclude: any = {
        model: MasterEntity,
        attributes: ['id'],
        include: [
          {
            model: WorkMailEntity,
            attributes: ['email'],
          },
        ],
      };
      const userInclude: any = {
        model: registeredUsers,
        attributes: [
          'id',
          'fullName',
          'email',
          'phone',
          'typeAddress',
          'lastOnlineTime',
          'lastCrm',
        ],
        include: [kycInclude, empInclude, masterInclude],
      };
      const loanAttributes = [
        'id',
        'userId',
        'loanStatus',
        'verifiedSalaryDate',
        'netApprovedAmount',
        'followerId',
        'nomineeDetail',
      ];
      const include = [userInclude, predictInclude];
      const loanOptions: any = {
        include,
        where: {
          loanStatus: ['Active', 'InProcess'],
          id: { [Op.in]: loanIds },
        },
        order: [['id', 'DESC']],
      };
      //Implemented search filter
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') loanOptions.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = await this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userInclude.where = { phone: { [Op.iRegexp]: searchText } };
          } else userInclude.where = { fullName: { [Op.iRegexp]: searchText } };
        }
      }

      //Pagination
      if (download != 'true') {
        const page = body?.page ?? 1;
        loanOptions.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        loanOptions.limit = PAGE_LIMIT;
      }
      const data = await this.loanRepo.getTableWhereDataWithCounts(
        loanAttributes,
        loanOptions,
      );
      if (data === k500Error) return kInternalError;
      const allLoanIds = data.rows.map((el) => el.id);

      const where: any = {
        loanId: { [Op.in]: allLoanIds },
      };
      const options: any = {
        where,
        order: [['loanId', 'DESC']],
      };
      const attributes = [
        'id',
        'loanId',
        'emi_date',
        'payment_status',
        'payment_due_status',
        'payment_done_date',
        'penalty',
        'penalty_days',
        'principalCovered',
        'interestCalculate',
        'emiNumber',
        'pay_type',
        'fullPayPrincipal',
        'fullPayInterest',
        'fullPayPenalty',
        'legalId',
        'regInterestAmount',
        'paidRegInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'paidBounceCharge',
        'totalPenalty',
        'dpdAmount',
        'penaltyChargesGST',
        'paidPenalCharge',
        'legalCharge',
        'legalChargeGST',
        'paidLegalCharge',
      ];
      const allEmiData = await this.emiRepo.getTableWhereData(
        attributes,
        options,
      );
      for (let index = 0; index < allEmiData.length; index++) {
        const ele = allEmiData[index];
        if (ele.penalty > 0) ele.bounceCharge = 0;
        // Setting GST as SGST & CGST(round-off) to Keep it same as transaction bifurcation
        if (ele.dpdAmount > 0) {
          // Penal Charge GST
          let cGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          let sGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
        }
      }
      if (allEmiData === k500Error) return kInternalError;
      const transData = await this.transRepo.getTableWhereData(
        [
          'id',
          'loanId',
          'emiId',
          'paidAmount',
          'completionDate',
          'status',
          'type',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
        ],
        {
          where: {
            loanId: { [Op.in]: allLoanIds },
            status: kCompleted,
          },
        },
      );
      if (transData === k500Error) return kInternalError;
      const legalList = await this.legalRepo.getTableWhereData(
        ['dates', 'loanId', 'type'],
        {
          where: {
            loanId: { [Op.in]: allLoanIds },
            type: { [Op.in]: [6, 7] },
            otherDetails: { isHistory: -1 },
          },
        },
      );
      if (legalList === k500Error) return kInternalError;
      const adminId = -1;
      const adminIds = await this.commonSharedService.getCollectionExecutive(
        adminId,
      );
      const crmList = await this.crmRepo.getTableWhereData(
        ['id', 'relationData', 'createdAt', 'loanId', 'callSid', 'amount'],
        {
          where: {
            loanId: { [Op.in]: allLoanIds },
            adminId: { [Op.in]: adminIds },
            [Op.or]: [
              { callSid: { [Op.ne]: null } },
              { relationData: { titleId: { [Op.in]: ptpCrmIds } } },
            ],
          },
          order: [['id', 'DESC']],
        },
      );
      if (crmList === k500Error) return kInternalError;
      const preparedList = await this.prepareDataForDailyDefaulters(
        allEmiData,
        data.rows,
        transData,
        legalList,
        crmList,
      );
      let counts = data.count;
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [preparedList],
          sheetName: 'Daily Defaulter.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return { rows: preparedList, count: counts };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async findAutoDebitData(option) {
    try {
      const attribures = [
        'id',
        'paidAmount',
        'status',
        'source',
        'subSource',
        'type',
        'userId',
        'completionDate',
        'loanId',
        'emiId',
        'utr',
        'transactionId',
        'subscriptionDate',
        'response',
        'subStatus',
        'adminId',
      ];
      const result = await this.transactionRepo.getTableWhereDataWithCounts(
        attribures,
        option,
      );
      if (!result || result === k500Error) return kInternalError;
      const disbursementIdlist = [];
      for (let i = 0; i < result.rows.length; i++) {
        try {
          const data = result.rows[i];
          const disbursementId = data?.loanData?.loan_disbursement_id;
          if (disbursementId) disbursementIdlist.push(disbursementId);
        } catch (error) {}
      }
      const disbursementData = await this.disburesementRepo.getTableWhereData(
        ['id', 'amount', 'bank_name', 'ifsc', 'account_number'],
        { where: { id: disbursementIdlist } },
      );

      if (disbursementData != k500Error) {
        for (let i = 0; i < result.rows.length; i++) {
          try {
            const data = result.rows[i];
            const disbursementId = data.loanData.loan_disbursement_id;
            const find = disbursementData.find((f) => f.id == disbursementId);
            if (find) data.disbursementData = find;
          } catch (error) {}
        }
      }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareReferEarnData(referralList) {
    try {
      const length = referralList.length;
      if (length === 0) return referralList;
      // get referredBy usersIds
      const referredByIds = [
        ...new Set(referralList.map((ele) => ele?.referredBy)),
      ];
      // total earning
      const refAttrs: any = [
        'referredBy',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
        [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
      ];
      const refOpts = {
        where: { referredBy: referredByIds },
        group: ['referredBy'],
      };
      const totalEarn = await this.referralRepo.getTableWhereData(
        refAttrs,
        refOpts,
      );
      if (totalEarn === k500Error) return kInternalError;
      // total withdraw
      const traAttrs: any = [
        'userId',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
      ];
      const traOpts = {
        where: { status: 1, userId: referredByIds },
        group: ['userId'],
      };
      const tranData = await this.referralTransRepo.getTableWhereData(
        traAttrs,
        traOpts,
      );
      if (tranData === k500Error) return kInternalError;
      // prepare referral data
      const referralData = [];
      for (let i = 0; i < length; i++) {
        try {
          const referral = referralList[i];
          const byUser = referral?.referredByData;
          const toUser = referral?.referredToData;
          const byUserId = referral?.referredBy;
          const toUserId = referral?.referredTo;
          const regDate = this.typeService.getDateFormatted(toUser?.createdAt);
          const stage = Object.keys(ReferralStages).find(
            (key) => ReferralStages[key] === referral?.stage,
          );
          const earn = totalEarn.find((e) => e?.referredBy == byUserId);
          const totalEarning = +(earn?.totalPoints ?? 0);
          const totalCount = +(earn?.totalCount ?? 0);
          const withdraw = tranData.find((t) => t?.userId == byUserId);
          const totalWithdraw = parseFloat(
            ((withdraw?.totalAmount ?? 0) / 100).toFixed(2),
          );

          const obj = {
            'Referred to': toUser?.fullName ?? '-',
            'Referred to phone': this.cryptService.decryptPhone(toUser?.phone),
            'Registration date': regDate,
            toUserId,
            Points: referral?.points ?? 0,
            Stage: stage ?? '-',
            userId: byUserId,
            Name: byUser?.fullName ?? '-',
            Phone: this.cryptService.decryptPhone(byUser?.phone),
            'Total referred': totalCount,
            'Total earn': totalEarning,
            'Total withdraw': totalWithdraw,
            'Wallet balance': +(byUser?.referralPoints ?? 0),
          };
          referralData.push(obj);
        } catch (error) {}
      }
      return referralData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareData(tranData) {
    const finalData = [];
    for (let i = 0; i < tranData.length; i++) {
      try {
        const data = tranData[i];

        const tempData: any = {};
        const phone = this.cryptService.decryptPhone(data?.userData?.phone);
        const loanData = data?.loanData;
        let policyExpiryDate = null;
        if (loanData?.insuranceData?.response) {
          const responseData = JSON.parse(loanData.insuranceData.response);
          const policyIssuance = responseData.policyIssuance;
          if (Array.isArray(policyIssuance) && policyIssuance.length > 0) {
            const policy = policyIssuance[0];
            policyExpiryDate = policy.policy_expiry_date;
          }
        }
        const policy_expiry_date = policyExpiryDate
          ? this.typeService.getDateFormatted(policyExpiryDate)
          : '-';
        const disbursementData = data?.disbursementData;
        const response =
          this.commonSharedService.getFailedReason(data?.response) ?? '-';
        let failedReason = null;
        try {
          const temp = JSON.parse(data?.response);
          if (response.includes('Duplicate transaction'))
            failedReason = kNotPlaceAutoDebit;
          else failedReason = temp?.reason ?? temp?.internalNote;
        } catch (error) {}
        const isPaid = data?.status === 'COMPLETED';
        const amount = data?.paidAmount ?? 0;
        const emiDate = data?.emiData?.emi_date;
        const emi_date = emiDate
          ? this.typeService.getDateFormatted(emiDate)
          : '-';
        const emi_done = isPaid
          ? this.typeService.getDateFormatted(
              data?.completionDate ?? data?.emiData?.payment_done_date,
            )
          : '-';
        const response_date = data?.completionDate
          ? this.typeService.getDateFormatted(data?.completionDate)
          : '-';
        const disbursement_date = this.typeService.getDateFormatted(
          loanData?.loan_disbursement_date,
        );

        const type = data?.source === 'AUTOPAY' ? 'AUTODEBIT' : data?.subSource;
        const amountDesc = Math.floor((disbursementData?.amount ?? 0) / 100);
        const emiAmount = +(data?.emiData?.emi_amount ?? data?.paidAmount ?? 0);
        tempData['userId'] = data?.userId;
        tempData['Name'] = data?.userData?.fullName ?? '-';
        tempData['Mobile number'] = phone ?? '-';
        tempData['Loan ID'] = loanData?.id;
        tempData['EMI amount'] = emiAmount.toFixed(2);
        tempData['Placed amount'] = amount;
        tempData['EMI date'] = emi_date;
        tempData['EMI paid date'] = emi_done;
        tempData['Payment type'] = type;
        tempData['UTR'] = data?.utr ?? '-';
        tempData["Today's EMI status"] = failedReason
          ? kNotPlaceAutoDebit
          : data?.status;
        tempData['AD Response date'] = response_date;
        tempData['EMI type'] = data?.type ?? '-';
        tempData['Amount disbursed'] = amountDesc;
        tempData['Disbursement date'] = disbursement_date;
        tempData['Bank name'] = disbursementData?.bank_name ?? '-';
        tempData['IFSC'] = disbursementData?.ifsc ?? '-';
        tempData['Account number'] = disbursementData?.account_number ?? '-';
        tempData['E-Mandate type'] =
          loanData?.subscriptionData?.mode ?? 'SIGNDESK';
        tempData['Loan approved by'] =
          (
            await this.commonSharedService.getAdminData(
              loanData?.manualVerificationAcceptId,
            )
          )?.fullName ?? '-';
        tempData['AD Placed by'] =
          (await this.commonSharedService.getAdminData(data?.adminId))
            ?.fullName ?? '-';
        tempData['Insurance'] = loanData?.insuranceId ? 'Yes' : 'No';
        tempData['Insurance End Date'] = policy_expiry_date;
        tempData['Risk Category'] =
          loanData?.predictionData?.categorizationTag?.slice(0, -5) ?? '-';
        tempData['Autodebit response'] = response;
        tempData['Autodebit failed from'] = data?.subStatus ?? '-';
        // Autodebit failure
        if ((tempData['UTR'] ?? '-') == '-')
          tempData["Today's EMI status"] = kNotPlaceAutoDebit;

        finalData.push(tempData);
      } catch (error) {}
    }
    return finalData;
  }
  // ------------------------- End today auto debit ---------------------------------

  async getEventCallHistory(passData) {
    try {
      return await this.callingService.getEventCallHistory(passData);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  private async prepareDataForDailyDefaulters(
    allEmiData,
    data,
    transData,
    legalList,
    crmList,
  ) {
    try {
      const finalData: any = [];
      const length = data.length;
      for (let index = 0; index < length; index++) {
        try {
          const element = data[index];
          const userData = element?.registeredUsers;
          const workMailData = userData?.masterData?.workMailData;
          const kycData = userData?.kycData;
          const empData = userData?.employmentData;
          const predictData = element?.predictionData;
          const phone = await this.cryptService.decryptPhone(userData?.phone);

          const EMIData = allEmiData.filter((el) => el.loanId === element?.id);
          EMIData.sort((a, b) => a.id - b.id);

          const legalData = legalList.filter((el) => el.loanId === element?.id);

          const filteredTransData = transData.filter(
            (el) => el.loanId === element.id,
          );

          const crmData = crmList.filter((el) => el.loanId === element?.id);

          let summons;
          let warrants;
          let summonsamount = 0;
          let warrantsamount = 0;
          for (const legal of legalData) {
            summons = legal?.type === 6;
            warrants = legal?.type === 7;
            const summonsDate = summons ? legal?.dates?.email : '-';
            const warrantsDate = warrants ? legal?.dates?.email : '-';

            for (const trans of filteredTransData) {
              // Payment received after summons
              if (summonsDate <= new Date(trans?.completionDate).getTime()) {
                // Payment received after warrant
                if (warrantsDate <= new Date(trans?.completionDate).getTime()) {
                  warrantsamount += trans?.paidAmount;
                } // Payment received after summons
                else summonsamount += trans?.paidAmount;
              }
            }
          }

          //Emi Data
          const emiData = {
            'Delay days': 0,
            'EMI 1 date': '-',
            'EMI 1 amount': '-',
            'EMI 1 penalty': '-',
            'EMI 1 paid date': '-',
            'EMI 1 paid amount': '-',
            'EMI 2 date': '-',
            'EMI 2 amount': '-',
            'EMI 2 penalty': '-',
            'EMI 2 paid date': '-',
            'EMI 2 paid amount': '-',
            'EMI 3 date': '-',
            'EMI 3 amount': '-',
            'EMI 3 penalty': '-',
            'EMI 3 paid date': '-',
            'EMI 3 paid amount': '-',
          };
          let totalEmiAmount = 0;
          let totalDueAmount = 0;
          let delayDays = 0;
          let totalRecievedAmount = 0;
          for (const emiRecord of EMIData) {
            const emiNumber = emiRecord.emiNumber;
            const emiDate = `EMI ${emiNumber} date`;
            const emiAmount = `EMI ${emiNumber} amount`;
            const emiPenalty = `EMI ${emiNumber} penalty`;
            const emiPaidDate = `EMI ${emiNumber} paid date`;
            const emiPaidAmount = `EMI ${emiNumber} paid amount`;
            let remainingBounceCharge =
              (emiRecord.bounceCharge ?? 0) +
              (emiRecord.gstOnBounceCharge ?? 0) -
              (emiRecord.paidBounceCharge ?? 0);
            let remainingDeferredInt =
              (emiRecord.regInterestAmount ?? 0) -
              (emiRecord.paidRegInterestAmount ?? 0);
            let remainingLegalCharge =
              (emiRecord.legalCharge ?? 0) +
              (emiRecord.legalChargeGST ?? 0) -
              (emiRecord.paidLegalCharge ?? 0);
            let remainingPenalCharge =
              (emiRecord.penalty ?? 0) +
              (emiRecord.dpdAmount ?? 0) +
              (emiRecord.penaltyChargesGST ?? 0) -
              (emiRecord.paidPenalCharge ?? 0);
            remainingBounceCharge = this.typeService.manageAmount(
              remainingBounceCharge,
            );
            remainingDeferredInt =
              this.typeService.manageAmount(remainingDeferredInt);
            remainingLegalCharge =
              this.typeService.manageAmount(remainingLegalCharge);
            remainingPenalCharge =
              this.typeService.manageAmount(remainingPenalCharge);
            const penalty =
              remainingPenalCharge +
              remainingDeferredInt +
              remainingBounceCharge +
              remainingLegalCharge;

            const penaltyDays = emiRecord?.penalty_days ?? 0;
            if (penaltyDays > delayDays) delayDays = penaltyDays;
            emiData['Delay days'] = delayDays;
            emiData[emiDate] = this.dateService.dateToReadableFormat(
              emiRecord.emi_date,
            ).readableStr;

            emiData[emiAmount] =
              emiRecord.principalCovered + emiRecord.interestCalculate;
            emiData[emiPenalty] = penalty ? penalty : '-';
            if (emiRecord.pay_type === kFullPay) {
              emiData[emiPaidDate] =
                emiRecord.payment_done_date !== null
                  ? this.dateService.dateToReadableFormat(
                      emiRecord.payment_done_date,
                    ).readableStr
                  : '-';
              emiData[emiPaidAmount] =
                emiRecord.fullPayPrincipal +
                  emiRecord.fullPayInterest +
                  emiRecord.fullPayPenalty ?? '-';
            } else {
              if (filteredTransData.length > 0) {
                const transdata = filteredTransData.filter(
                  (el) => el.emiId === emiRecord.id,
                );
                let totalPaidAmount = 0;
                for (const trans of transdata) {
                  try {
                    const paidDate =
                      trans.status === kPartPay
                        ? trans.reduce((latest, entry) =>
                            entry.completionDate > latest.completionDate
                              ? entry
                              : latest,
                          )
                        : trans.completionDate;

                    emiData[emiPaidDate] =
                      this.dateService.dateToReadableFormat(
                        paidDate,
                      ).readableStr;

                    if (trans.type === kPartPay) {
                      totalPaidAmount += trans.paidAmount;
                    } else {
                      if (trans.type == 'REFUND') {
                        totalPaidAmount += Math.abs(trans.paidAmount);
                        continue;
                      } else {
                        totalPaidAmount = trans.paidAmount;
                      }
                    }
                  } catch (error) {}
                }
                emiData[emiPaidAmount] = totalPaidAmount;
              } else {
                emiData[emiPaidDate] = '-';
                emiData[emiPaidAmount] = '-';
              }
            }
            if (!isNaN(emiData[emiAmount])) {
              totalEmiAmount += emiData[emiAmount];
            }
            const dueAmount =
              emiRecord.payment_status === '0' &&
              emiRecord.payment_due_status === '1'
                ? emiData[emiAmount] +
                  (emiRecord.penalty !== null ? emiRecord.penalty : 0)
                : 0;
            if (!isNaN(dueAmount)) {
              totalDueAmount += dueAmount;
            }
            if (!isNaN(emiData[emiPaidAmount])) {
              totalRecievedAmount += emiData[emiPaidAmount];
            }
          }

          element.emiData = EMIData;
          element.transactionData = filteredTransData;
          const paidAmount: any =
            await this.calculcation.getOverDueInsightsForLoan(element);

          let pinCode = '-';
          try {
            const response = JSON.parse(kycData?.aadhaarResponse);
            pinCode = response.zip ?? response.pincode ?? '-';
          } catch (error) {}

          //ptp crm data
          const ptpData = crmData.find((crm) =>
            ptpCrmIds.includes(crm?.relationData?.titleId),
          );

          let unTouchedPTPUser = 'No';
          let unTouchedUser = 'No';
          // Untouched user
          if (!ptpCrmIds.includes(userData?.lastCrm?.titleId)) {
            const today = new Date();
            const crmDate = new Date(userData?.lastCrm?.createdAt);
            const dateDifference = this.typeService.dateDifference(
              today,
              crmDate,
              'Days',
            );
            if (dateDifference > 3) unTouchedUser = 'Yes';
          }
          // Un-touched ptp user
          else if (userData?.lastCrm?.due_date) {
            const today = new Date();
            const crmDate = new Date(userData.lastCrm.due_date);
            const dateDifference = this.typeService.dateDifference(
              today,
              crmDate,
              'Days',
            );
            const isPTPPaid = userData.lastCrm.isPTPPaid ?? false;
            if (dateDifference > 3 && !isPTPPaid) unTouchedPTPUser = 'Yes';
          }

          let ptpdate = '-';
          if (ptpData) {
            ptpdate = this.dateService.dateToReadableFormat(
              ptpData.createdAt,
            ).readableStr;
          }
          let crmdate = '-';
          if (userData.lastCrm !== null) {
            crmdate = this.dateService.dateToReadableFormat(
              userData?.lastCrm?.createdAt,
            ).readableStr;
          }
          const lastOnline = this.dateService.dateToReadableFormat(
            userData?.lastOnlineTime,
          ).readableStr;
          const followerAdmin = await this.commonSharedService.getAdminData(
            element?.followerId,
          );
          const approvedAmount = Number(element?.netApprovedAmount);
          const userAddress = this.typeService.getAadhaarAddress(kycData);
          const preparedData: any = {
            userId: element?.userId,
            'Loan Id': element?.id ?? '-',
            Name: userData?.fullName ?? '-',
            'Mobile number': phone ?? '-',
            'Email address': userData?.email ?? '-',
            'Work mail': workMailData?.email || '-',
            'Salary date': element?.verifiedSalaryDate ?? '-',
            ...emiData,
            'Approved amount': approvedAmount ?? '-',
            'Total EMI amount': !isNaN(totalEmiAmount) ? totalEmiAmount : '-',
            'Due amount till date':
              paidAmount?.totalRemaining?.toFixed(2) ?? '-',
            'Total recieved amount': !isNaN(totalRecievedAmount)
              ? totalRecievedAmount
              : '-',
            'Follower name': followerAdmin?.fullName ?? '-',
            Summons: summons ? 'Yes' : 'No',
            'Summons recieved amount': summonsamount ?? 0,
            Warrants: warrants ? 'Yes' : 'No',
            'Warrants recieved amount': warrantsamount ?? 0,
            Connectivity: crmData.find(
              (crm) =>
                crm.callSid !== null && crm.relationData.dispositionId === 1,
            )
              ? 'Connected'
              : 'Not connected',
            'Last CRM date': crmdate,
            'Last CRM disposition': userData?.lastCrm?.dispositionName ?? '-',
            'Last CRM sub disposition': userData?.lastCrm?.titleName ?? '-',
            'Last CRM description': userData?.lastCrm?.remark ?? '-',
            'Last CRM added by': userData?.lastCrm?.adminName ?? '-',
            'PTP date': ptpdate,
            'PTP amount': ptpData ? ptpData.amount : '-',
            //For now it will be blank later we will add it
            'PTP paid amount': '-',
            'Untouched user': unTouchedUser,
            'Untouched PTP user': unTouchedPTPUser,
            'Insurance nominee phone':
              element?.nomineeDetail?.Nominee_Contact_Number ?? '-',
            City: userAddress?.dist ?? '-',
            State: userAddress?.state ?? '-',
            Pincode: pinCode,
            'Aadhaar address': userAddress?.address ?? '-',
            'Type address':
              this.typeService.getUserTypeAddress(
                userData?.typeAddress ?? '-',
              ) ?? '-',
            'Company name': empData?.companyName ?? '-',
            'Company address': empData?.companyAddress ?? '-',
            'Risk category':
              predictData?.categorizationTag?.slice(0, -5) ?? '-',
            'Last online time': lastOnline ?? '-',
          };
          finalData.push(preparedData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async reportCronHit() {
    try {
      const attributes = [
        'status',
        'apiUrl',
        'fromDate',
        'toDate',
        'extraparms',
        'id',
        'reportName',
        'retryCount',
      ];
      let res: any = {};
      const options = {
        where: { status: '0' },
      };
      const reportData = await this.reportHistoryRepo.getTableWhereData(
        attributes,
        options,
      );
      if (reportData === k500Error) return kInternalError;
      for (let i = 0; i < reportData.length; i++) {
        try {
          const element = reportData[i];
          const retryCount = element?.retryCount;

          //check if report has been tried twise to download then will show it failed
          if (retryCount >= 2) {
            const updatedData = { status: '2' };
            await this.reportHistoryRepo.updateRowData(
              updatedData,
              element?.id,
            );
          } else {
            // increasing retry count in db
            const updatedData = {
              retryCount: (retryCount ?? 0) + 1,
            };
            await this.reportHistoryRepo.updateRowData(
              updatedData,
              element?.id,
            );
            const extraparms = element?.extraparms;
            const body: any = {
              download: 'true',
              downloadId: element.id,
              startDate: element.fromDate,
              endDate: element.toDate,
              report: element.reportName,
              ...extraparms,
            };
            const headers = { 'qa-test-key': EnvConfig.secrets.qaTestKey };
            res = await this.apiService.requestPost(
              `${HOST_URL}admin/${element.apiUrl}`,
              body,
              headers,
            );
            if (res == k500Error || res?.valid == false) {
              const updatedData = { status: '2' };
              await this.reportHistoryRepo.updateRowData(
                updatedData,
                element.id,
              );
            }
          }
        } catch (error) {
          continue;
        }
      }
      if (!res || res == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async reportCronAutoHit() {
    try {
      const attributes = [
        'status',
        'apiUrl',
        'fromDate',
        'toDate',
        'extraparms',
        'id',
        'reportName',
        'retryCount',
      ];
      let res: any = {};
      const options = {
        where: { status: ['0', '3'] },
        order: [['status', 'desc']],
      };
      const reportData = await this.reportHistoryRepo.getRowWhereData(
        attributes,
        options,
      );
      if (reportData === k500Error) return kInternalError;
      if (!reportData) return {};
      if (reportData.status == '3') return {};

      //check if report has been tried twise to download then will show it failed
      if (reportData?.retryCount >= 2) {
        const updatedData = { status: '2' };
        await this.reportHistoryRepo.updateRowData(updatedData, reportData.id);
        return {};
      }

      // increasing retry count in db
      const updatedData = {
        status: '3',
        retryCount: (reportData?.retryCount ?? 0) + 1,
      };
      await this.reportHistoryRepo.updateRowData(updatedData, reportData.id);
      const extraparms = reportData?.extraparms;
      const body: any = {
        download: 'true',
        downloadId: reportData.id,
        startDate: reportData.fromDate,
        endDate: reportData.toDate,
        report: reportData.reportName,
        ...extraparms,
      };
      const headers = { 'qa-test-key': EnvConfig.secrets.qaTestKey };
      res = await this.apiService.requestPost(
        `${HOST_URL}admin/${reportData.apiUrl}`,
        body,
        headers,
      );
      if (res == k500Error || res?.valid == false) {
        const updatedData = { status: '2' };
        await this.reportHistoryRepo.updateRowData(updatedData, reportData.id);
      }
      this.reportCronAutoHit();
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // get all referral withdrawal transactions
  async referralWithdrawalTransactions(reqData) {
    try {
      const startDate = reqData?.startDate ?? new Date();
      const endDate = reqData?.endDate ?? new Date();
      const download = reqData?.download ?? false;
      const page = reqData?.page;
      const downloadId = reqData?.downloadId;
      let searchText = reqData?.searchText ?? '';
      const sDate = this.typeService.getGlobalDate(startDate);
      const eDate = this.typeService.getGlobalDate(endDate);
      const options: any = {
        where: {
          subscriptionDate: { [Op.gte]: sDate, [Op.lte]: eDate },
          status: 1,
        },
        order: [['id', 'DESC']],
      };
      if (searchText && searchText.length >= 3) {
        if (!isNaN(searchText))
          options.where.contact = { [Op.iRegexp]: searchText };
        else options.where.name = { [Op.iRegexp]: searchText };
      }
      if (download != true) {
        options.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes = [
        'userId',
        'name',
        'contact',
        'amount',
        'utr',
        'mode',
        'bankName',
        'ifsc',
        'accountNumber',
        'subscriptionDate',
      ];
      const tranData = await this.referralTransRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (tranData === k500Error) return kInternalError;

      const preparedList = [];
      const length = tranData.rows.length;
      for (let i = 0; i < length; i++) {
        try {
          const tra = tranData.rows[i];
          const amount = +((tra?.amount ?? 0) / 100).toFixed(2);
          const mode = tra?.mode == 0 ? 'NEFT' : tra?.mode == 1 ? 'IMPS' : '-';
          const date = this.typeService.getDateFormatted(tra?.subscriptionDate);
          const obj = {
            userId: tra?.userId,
            Name: tra?.name ?? '-',
            'Phone number': tra?.contact ?? '-',
            'Withdrawal amount': `${kRuppe} ${amount}`,
            'Withdrawal date': date,
            UTR: tra?.utr ?? '-',
            Mode: mode,
            Bank: tra?.bankName ?? '-',
            'IFSC code': tra?.ifsc ?? '-',
            'Account number': tra?.accountNumber ?? '-',
          };
          preparedList.push(obj);
        } catch (error) {}
      }
      tranData.rows = preparedList;
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [preparedList],
          sheetName: 'Referral Withdrawal Transactions.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return tranData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Cibil inquiries
  async cibilInquiries(reqData) {
    const isDownload = reqData.download?.toString() == 'true';
    const reportData: any = await this.getCibilInquiries(reqData);

    const rows = [];
    for (let index = 0; index < reportData.rows.length; index++) {
      try {
        const el = reportData.rows[index];
        const dateInfo = this.dateService.dateToReadableFormat(
          el.userCreationDate,
        );
        const fetchedDatenfo = this.dateService.dateToReadableFormat(
          el.createdAt,
        );
        let loanStatus = 'NOT APPLIED';
        if (el.manualVerification) {
          if (el.manualVerification == '2') loanStatus = 'REJECTED';
          else if (el.manualVerification == '1' || el.manualVerification == '3')
            loanStatus = 'APPROVED';
        }

        const preparedData = {
          'Loan Id': el?.loanId ?? '-',
          userId: el?.userId ?? '-',
          'Registration Date': dateInfo?.readableStr ?? '-',
          Number: el?.phone ? this.cryptService.decryptPhone(el?.phone) : '-',
          Name: el?.name ?? '-',
          'Fetched Name': el?.names ? el?.names[0]?.name : '-',
          Email: el?.email ?? '-',
          'Loan count': el?.completedLoans ?? 0,
          'Employment information':
            el?.otherInfo?.employmentInfo === ''
              ? '-'
              : el?.otherInfo?.employmentInfo ?? '-',
          Platform: el?.typeOfDevice == '1' ? 'IOS' : 'Android',
          'Company Name': el?.companyName ?? '-',
          Salary: el?.salary ?? '-',
          'CIBIL Score': el?.cibilScore ?? '-',
          'Personal Loan Score': el?.plScore ?? '-',
          'Personal Loan Account': el?.PLAccounts ?? '-',
          'Overdue Account': el?.overdueAccounts ?? '-',
          'Overdue Amount': el?.overdueBalance ?? '-',
          'Delay days': el?.totalOverdueDays ?? '-',
          'Inquiry In Past 30 Days': el?.inquiryPast30Days ?? '-',
          'Total Outstanding Balance': el?.totalOutstanding ?? '-',
          'Personal Loan Outstanding Balance': el?.PLOutstanding ?? '-',
          'CIBIL Fetched Attempt': fetchedDatenfo?.readableStr ?? '-',
          'CIBIL category': this.calculcation.checkCibilCategory(el),
          City: (el?.city ?? '') == '' ? '-' : el.city,
          State: (el?.state ?? '') == '' ? '-' : el.state,
          Stage: el?.stage
            ? this.commonSharedService.stageNumberToStr(el?.stage)
            : '-',
          loanStatus,
          loanApprovedBy:
            (
              await this.commonSharedService.getAdminData(
                el.manualVerificationAcceptId,
              )
            ).fullName ?? '-',
          'Decline reason': el?.remark ?? '-',
          'Last CRM': el?.lastCrm?.remark ?? '-',
          'Last CRM By': el?.lastCrm?.adminName ?? '-',
          validCibilData: el?.validCibilData == 1 ? 'YES' : 'NO',
        };
        rows.push(preparedData);
      } catch (error) {}
    }

    // Download the report
    if (isDownload) {
      const rawExcelData = {
        sheets: ['cibil hard pull'],
        data: [rows],
        sheetName: 'cibil hard pull.xlsx',
      };
      const fileUrl = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileUrl?.message) return fileUrl;
      const updatedData = { downloadUrl: fileUrl, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl };
    }

    return { count: reportData.count, rows };
  }

  private async getCibilInquiries(reqData) {
    // Params validation
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    const isDownload = reqData.download?.toString() == 'true';
    const page = reqData.page;
    if (!isDownload && !page) return kParamMissing('page');
    const offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
    const rangeData = this.dateService.utcDateRange(startDate, endDate);
    let searchText = reqData.searchText;
    const searchData: any = await this.common.getSearchData(searchText);

    // Search by user's name
    let nameStr = '';
    if (searchData.text != '' && searchData.type == 'Name')
      nameStr = `AND "user"."fullName" ILIKE '%${searchData.text}%'`;
    // Search by user's phone
    let phoneStr = '';
    if (searchData.text != '' && searchData.type == 'Number')
      phoneStr = `AND "user"."phone" ILIKE '${searchData.text}'`;
    // Search by loanId
    let loanJoin = `LEFT JOIN "loanTransactions" AS loan
      ON (loan."cibilId" = cibil.id )`;
    if (searchData.text != '' && searchData.type == 'LoanId') {
      loanJoin = `INNER JOIN "loanTransactions" AS loan
        ON (loan."cibilId" = cibil.id AND loan.id = ${searchData.text})`;
    }

    const joinStr = `${loanJoin}
      LEFT JOIN "BankingEntities" AS bank
      ON loan."bankingId" = bank.id
      INNER JOIN "registeredUsers" AS "user"
      ON "user"."id" = cibil."userId"
      INNER JOIN "MasterEntities" AS "master"
      ON "master"."id" = "user"."masterId"
      LEFT JOIN "employmentDetails" AS "emp"
      ON "master"."empId" = "emp"."id"`;
    const whereStr = `WHERE cibil."createdAt" >= '${rangeData.minRange.toJSON()}'
      AND cibil."createdAt" <= '${rangeData.maxRange.toJSON()}' ${nameStr} ${phoneStr}`;
    const paginationStr = isDownload
      ? ''
      : `LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;

    const query = `SELECT "loan"."id" AS "loanId", cibil."names", "validCibilData" ,cibil."createdAt", "user"."createdAt" AS "userCreationDate", cibil."userId", "user"."phone",
      "user"."fullName" AS "name", "user"."email", "user"."completedLoans", "user"."typeOfDevice", "emp"."companyName",
      "bank"."salary", "cibilScore", "plScore", "PLAccounts", "overdueAccounts", "overdueBalance", "totalOverdueDays", "inquiryPast30Days",
      "totalOutstanding", "PLOutstanding","master"."otherInfo", "user"."city", "user"."state", "lastCrm", "loan"."manualVerification", 
      "loan"."manualVerificationAcceptId", "remark","stage" FROM "CibilScoreEntities" AS cibil
      ${joinStr} ${whereStr} ${paginationStr}`;

    const data = await this.repoManager.injectRawQuery(CibilScoreEntity, query);
    if (data == k500Error) return kInternalError;

    // Total counts
    let count = 0;
    if (!isDownload) {
      const query = `SELECT COUNT(cibil.id) FROM "CibilScoreEntities" AS cibil ${joinStr} ${whereStr}`;
      const data = await this.repoManager.injectRawQuery(
        CibilScoreEntity,
        query,
      );
      if (data == k500Error) return kInternalError;
      count = +data[0].count;
    }

    return { count, rows: data };
  }

  async metricsInsights(reqData) {
    const data: any = await this.getDataForMetricsInsights(reqData);
    if (data?.message) return data;

    const userObj = {};
    // Group by userId
    for (let index = 0; index < data.length; index++) {
      try {
        const el = data[index];
        const step = el.values.step;
        if (!step) continue;
        if (!userObj[el.userId])
          userObj[el.userId] = { bankCode: el.values.bankCode, steps: [] };
        userObj[el.userId].steps.push(step);
      } catch (error) {}
    }

    const finalizedData = [];
    // Check steps
    for (const key in userObj) {
      try {
        const value = userObj[key];
        const steps = [...new Set(value.steps)];
        const bankCode = value.bankCode ?? '';
        const userId = key;
        const preparedData = { bankCode, userId, status: '-' };

        // ICICI
        if (bankCode == 'ICICI') {
          if (steps.includes(7)) {
            preparedData.status = 'COMPLETED';
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
        // IDFC
        if (bankCode == 'FEDERAL') {
          if (steps.includes(8)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
        // IDFC
        else if (bankCode == 'IDFC') {
          if (steps.includes(4)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
        // HDFC
        else if (bankCode == 'HDFC') {
          if (steps.includes(4)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
        // KOTAK
        else if (bankCode == 'KOTAK') {
          if (steps.includes(5)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        } // RBL
        else if (bankCode == 'RBL') {
          if (steps.includes(5)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
        // SBI
        else if (bankCode == 'SBI') {
          if (steps.includes(5)) {
            preparedData.status = kCompleted;
            finalizedData.push(preparedData);
          } else if (steps.includes(2)) {
            preparedData.status = 'STUCK IN FLOW';
            finalizedData.push(preparedData);
          } else if (steps.includes(1)) {
            preparedData.status = 'AUTH PENDING';
            finalizedData.push(preparedData);
          }
        }
      } catch (error) {}
    }
    // User wise details
    if (reqData.count != true) {
      return await this.getUserWiseDataForMetricsInsights(
        finalizedData,
        reqData,
      );
    }

    const preparedData = {};
    finalizedData.forEach((el) => {
      try {
        if (!preparedData[el.bankCode]) {
          preparedData[el.bankCode] = {
            'Total attempts': 0,
            'Dropped without auth': 0,
            'Total stuck in journey': 0,
            'Total completed journey': 0,
          };
        }
        preparedData[el.bankCode]['Total attempts']++;
        if (el.status == kCompleted)
          preparedData[el.bankCode]['Total completed journey'] += 1;
        else if (el.status == 'AUTH PENDING')
          preparedData[el.bankCode]['Dropped without auth'] += 1;
        else if (el.status == 'STUCK IN FLOW')
          preparedData[el.bankCode]['Total stuck in journey'] += 1;
      } catch (error) {}
    });

    // Calculate efficiency
    let totalCompleted = 0;
    let totalStuck = 0;
    for (const key in preparedData) {
      try {
        const value = preparedData[key];
        totalCompleted += value['Total completed journey'];
        totalStuck += value['Total stuck in journey'];
        const totalBase =
          value['Total completed journey'] + value['Total stuck in journey'];
        preparedData[key]['conversion ratio'] = Math.floor(
          (value['Total completed journey'] * 100) / totalBase,
        );
      } catch (error) {}
    }
    preparedData['Total conversion ratio'] = Math.floor(
      (totalCompleted * 100) / (totalCompleted + totalStuck),
    );

    return preparedData;
  }

  private async getDataForMetricsInsights(reqData) {
    // Params validation
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    if (typeof type != 'number') return kInvalidParamValue('type');
    if (![1].includes(type)) return kInvalidParamValue('type');
    const subType = reqData.subType;
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    if (typeof startDate != 'string') return kInvalidParamValue('startDate');
    if (startDate?.length != 10 && startDate?.length != 24)
      return kInvalidParamValue('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    if (typeof endDate != 'string') return kInvalidParamValue('endDate');
    if (endDate?.length != 10 && endDate?.length != 24)
      return kInvalidParamValue('endDate');
    const valueOptions = reqData.valueOptions ?? {};
    const rangeData = this.dateService.utcDateRange(
      new Date(startDate),
      new Date(endDate),
    );
    const attributes = ['userId', 'values'];
    const options: any = {
      order: [['logDate', 'DESC']],
      where: {
        logDate: { [Op.gte]: rangeData.minRange, [Op.lte]: rangeData.maxRange },
        subType,
        type,
        values: { ...valueOptions },
      },
    };
    if (type == 1 && subType == 1) {
      options.where.values = {
        step: { [Op.ne]: null },
        ...options.where.values,
      };
    }
    const rawCountList = await this.repoManager.getTableWhereData(
      MetricsEntity,
      attributes,
      options,
    );
    if (rawCountList == k500Error) return kInternalError;
    return rawCountList;
  }

  private async getUserWiseDataForMetricsInsights(targetList, reqData) {
    // Query preparation
    const userIds = targetList.map((el) => el.userId);
    const attributes = ['completedLoans', 'phone', 'fullName', 'id'];
    const options: any = { where: { id: userIds } };

    const searchData: any = await this.common.getSearchData(reqData.searchText);
    if (searchData?.message) return searchData;
    // Search via user's name
    if (searchData.text && searchData.type == 'Name')
      options.where.fullName = {
        [Op.iRegexp]: searchData.text,
      };
    // Search via user's name
    else if (searchData.text && searchData.type == 'Number')
      options.where.phone = { [Op.iLike]: searchData.text };

    // Query
    const userList = await this.repoManager.getTableWhereData(
      registeredUsers,
      attributes,
      options,
    );
    if (userList == k500Error) return kInternalError;

    // Prepare list
    const finalizedList = [];
    targetList.forEach((el) => {
      const userData = userList.find((subEl) => subEl.id == el.userId);
      if (userData) {
        finalizedList.push({
          userId: userData.id ?? '',
          Name: userData.fullName ?? '',
          Phone: this.cryptService.decryptPhone(userData.phone) ?? '',
          Bank: el.bankCode ?? '',
          Status: el.status ?? '',
          'Completed loans': userData.completedLoans ?? 0,
        });
      }
    });

    // Download the report
    if (reqData.download?.toString() == 'true') {
      const rawExcelData = {
        sheets: ['Metrics report'],
        data: [finalizedList],
        sheetName: 'Metrics report.xlsx',
      };
      const fileUrl = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileUrl?.message) return fileUrl;
      const updatedData = { downloadUrl: fileUrl, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl };
    }

    return finalizedList;
  }

  async departmentDropDown() {
    try {
      const attributes = ['id', 'department'];
      const options = {};
      const departmentData = await this.departmentRepo.getTableWhereData(
        attributes,
        options,
      );
      if (!departmentData || departmentData == k500Error) return kInternalError;
      return departmentData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region check Approved Status
  async checkApprovedStatus(logsLists, count) {
    try {
      const selfie: any = new VerificationCountFunModel();
      const residence: any = new VerificationCountFunModel();
      const panDoc: any = new VerificationCountFunModel();
      const optionalDoc: any = new VerificationCountFunModel();
      const contact: any = new VerificationCountFunModel();
      const company: any = new VerificationCountFunModel();
      const salarySlip: any = new VerificationCountFunModel();
      const workMail: any = new VerificationCountFunModel();
      const acceptSalary: any = new VerificationCountFunModel();
      const manualVerified: any = new VerificationCountFunModel();

      for (let index = 0; index < logsLists.length; index++) {
        try {
          const element = logsLists[index];
          const body = JSON.parse(element?.body);
          const query = JSON.parse(element?.query);
          let isAccepted = 2;
          const acc = ['1', '3'];
          const rej = ['2', '6'];
          const status = (body?.status ?? query?.status).toString();
          if (acc.includes(status)) isAccepted = 1;
          else if (rej.includes(status)) isAccepted = 2;
          if (element.api.includes('updateSelfieStatus')) {
            const userId = body?.userId;
            const check = selfie?.userList.find((ele) => ele?.id == userId);
            if (!check) {
              const passData = { userId, isAccepted, count, key: selfie };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              selfie.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (element?.api.includes('updateResidenceStatusV1')) {
            const userId = body?.userId;
            const check = residence?.userList.find((ele) => ele?.id == userId);
            if (!check) {
              const passData = { userId, isAccepted, count, key: residence };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              residence?.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (element?.api.includes('updateKYCStatus')) {
            const userId = body?.userId;
            if (body.type == KYCPAN) {
              const check = panDoc?.userList.find((ele) => ele?.id == userId);
              if (!check) {
                const passData = { userId, isAccepted, count, key: panDoc };
                const user = await this.userDetails(passData);
                if (user?.message) continue;
                panDoc?.userList.push(user);
              } else check.isAccepted = isAccepted;
            } else if (body.type == KYCOTHERDOC) {
              const key = optionalDoc;
              const check = key.userList.find((ele) => ele?.id == userId);
              if (!check) {
                const passData = { userId, isAccepted, count, key };
                const user = await this.userDetails(passData);
                if (user?.message) continue;
                key.userList.push(user);
              } else check.isAccepted = isAccepted;
            }
          } else if (
            element?.api.includes('UpdateContactStatus') ||
            element?.api.includes('updateContactStatus')
          ) {
            const userId = body?.userId ? body?.userId : query?.id;
            const check = contact?.userList.find((ele) => ele?.id == userId);
            if (!check) {
              const passData = { userId, isAccepted, count, key: contact };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              contact.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (
            element?.api.includes('updateCompanyStatus') ||
            element?.api.includes('UpdateComapnyStatus')
          ) {
            const userId = body?.userId;
            const empId = body?.employmentId
              ? body?.employmentId
              : query?.empId;
            const key = company;
            const check = key?.userList.find(
              (ele) => ele.id == userId || ele.empId == empId,
            );
            if (!check) {
              const passData = { userId, empId, isAccepted, count, key };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              key?.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (element?.api.includes('updateSalarySlipStatus')) {
            const userId = body?.userId;
            const key = salarySlip;
            const check = key?.userList.find((ele) => ele?.id == userId);
            if (!check) {
              const passData = { userId, isAccepted, count, key };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              key?.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (element?.api.includes('updateWorkEmailStatus')) {
            const userId = body?.userId;
            const check = workMail?.userList.find((ele) => ele?.id == userId);
            if (!check) {
              const passData = { userId, isAccepted, count, key: workMail };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              workMail?.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (element?.api.includes('updateNetBankingStatus')) {
            const userId = body?.userId;
            const loanId = body?.loanId;
            const key = acceptSalary;
            const check = key?.userList.find(
              (ele) => ele?.id == userId || ele?.loanId == loanId,
            );
            if (!check) {
              const passData = { userId, loanId, isAccepted, count, key };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              key.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (
            element?.api.includes('manualVerificationStatus') ||
            element?.api.includes('finalApproval')
          ) {
            const userId = body?.userId;
            const loanId = query?.id || body?.loanId;
            const key = manualVerified;
            const check = key?.userList.find(
              (ele) => ele?.id == userId || ele?.loanId == loanId,
            );
            if (!check) {
              const passData = { userId, loanId, isAccepted, count, key };
              const user = await this.userDetails(passData);
              if (user == k500Error) continue;
              key.userList.push(user);
            } else check.isAccepted = isAccepted;
          } else if (
            element.api.includes('acceptSalary') ||
            element.api.includes('acceptChangedSalary')
          ) {
            if (status == '0') isAccepted = 2;
            else isAccepted = 1;
            const userId = query.userId || body.userId;
            const loanId = query.loanId || body.loanId;
            const key = acceptSalary;
            const check = key.userList.find(
              (ele) => ele.id == userId || ele.loanId == loanId,
            );
            if (!check) {
              const passData = { userId, loanId, isAccepted, count, key };
              const user = await this.userDetails(passData);
              if (user?.message) continue;
              key?.userList.push(user);
            } else check.isAccepted = isAccepted;
          }
        } catch (error) {}
      }
      return {
        selfie,
        residence,
        panDoc,
        optionalDoc,
        contact,
        company,
        salarySlip,
        workMail,
        acceptSalary,
        manualVerified,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  // #region user details
  async userDetails(query) {
    try {
      let userId = query?.userId;
      const loanId = query?.loanId;
      const empId = query?.empId;
      const status = query?.isAccepted;
      const key = query?.key;
      if (loanId) {
        const loanData = await this.loanRepo.getRowWhereData(['userId'], {
          where: { id: loanId },
        });
        if (loanData === k500Error) return kInternalError;
        userId = loanData?.userId;
      }
      if (!userId && empId) {
        const empData = await this.employmentRepo.getRowWhereData(['userId'], {
          where: { id: empId },
        });
        if (empData === k500Error) return kInternalError;
        userId = empData?.userId;
      }
      let attributes = [];
      let option = {};
      if (query.count == 'true') {
        attributes = ['id', 'completedLoans'];
        option = { where: { id: userId } };
      } else {
        const declineIncude = {
          required: false,
          model: userLoanDecline,
          attributes: ['userDeclineReasonTitle'],
        };
        const loanInclude = {
          required: false,
          model: loanTransaction,
          attributes: [
            'id',
            'netApprovedAmount',
            'userId',
            'declineId',
            'loanRejectReason',
            'remark',
          ],
          include: [declineIncude],
        };
        const bankingInclude = {
          required: false,
          model: BankingEntity,
          attributes: ['id', 'bank', 'salary'],
          include: [loanInclude],
        };
        const empInclude: any = {
          required: false,
          model: employmentDetails,
          attributes: ['id', 'salary', 'companyName'],
          include: [bankingInclude],
        };
        option = {
          where: { id: userId },
          include: [empInclude],
        };
        attributes = [
          'id',
          'fullName',
          'email',
          'phone',
          'city',
          'state',
          'completedLoans',
          'stage',
        ];
      }
      const userData = await this.userRepo.getRowWhereData(attributes, option);
      if (userData === k500Error) return kInternalError;
      if (query?.count == 'false')
        userData.phone = this.cryptService.decryptPhone(userData?.phone);
      userData.isAccepted = status;
      userData.loanId = loanId;
      userData.empId = empId;
      const loans = userData?.completedLoans;
      //action count and new user count
      if (status == 1) key.approved += 1;
      else if (status == 2) key.reject += 1;
      else if (status == 0) key.pending += 1;
      if (loans == 0 && status == 1) key.approvedNew += 1;
      else if (loans == 0 && status == 2) key.rejectNew += 1;
      else if (loans == 0 && status == 0) key.pendingNew += 1;

      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async funGetCibilReport(body) {
    try {
      const isDownload = body?.download ?? 'false';
      let url: string = '';
      const result: any = await this.cibilScoreService.getCIBILScore(body);
      if (result?.message) return kInternalError;
      url = result;
      url += '##';
      const data: any = await this.cibilTxtToObjService.getTxtToExcel({
        url: result,
        name: body.type,
      });
      if (data?.message) return kInternalError;
      url += data?.path;
      if (isDownload === 'true') {
        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = body?.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      const finalData = data?.finalData;
      return { rows: finalData, count: finalData?.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async getRequestSupportData(query) {
    try {
      const page = query?.page;
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const searchText = query?.searchText;
      const download = query?.download ?? false;
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const options: any = { where: { createdAt: dateRange } };
      if (searchText) {
        if (searchText.startsWith('l-'))
          options.where.loanId = searchText.replace('l-', '');
      }
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes = [
        'userId',
        'loanId',
        'lastStep',
        'reason',
        'assign',
        'connectVia',
      ];
      const result = await this.reqSupportRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (result === k500Error) return kInternalError;
      const finalData = [];
      const userIds = result.rows.map((ele) => ele?.userId);
      const userList = await this.userRepo.getTableWhereData(
        ['id', 'fullName', 'email', 'phone'],
        { where: { id: userIds } },
      );
      if (userList === k500Error) return kInternalError;
      for (let i = 0; i < result.rows.length; i++) {
        try {
          const ele = result.rows[i];
          const usersData = userList.find((u) => u?.id === ele?.userId);
          const temp = {};
          temp['User ID'] = ele?.userId ?? '-';
          temp['Loan ID'] = ele?.loanId ?? '-';
          (temp['Name'] = usersData?.fullName ?? '-'),
            (temp['Email'] = usersData?.email ?? '-');
          temp['Phone'] =
            this.cryptService.decryptPhone(usersData?.phone) ?? '-';
          temp['Last Step'] = ele?.lastStep ?? '-';
          temp['Reason'] = ele?.reason ?? '-';
          temp['Assign'] = ele?.assign ?? '-';
          temp['Connect Via'] = ele?.connectVia ?? '-';
          finalData.push(temp);
        } catch (error) {}
      }
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Need assistance.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
      } else {
        return { count: result.count, finalData };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #region collection performance report
  async createTodayCollectionPerformance() {
    const date = this.typeService.getGlobalDate(new Date()).toJSON();
    try {
      const admins: any = await this.service.getDefaulterAssign();
      if (admins?.message) return admins;

      const userDetailsPerAdmin: any = await this.getUserDetailsPerAdmins(
        admins,
        date,
      );
      if (userDetailsPerAdmin?.message) return userDetailsPerAdmin;

      const preparedData = await this.prepareAdminWiseData(
        admins,
        userDetailsPerAdmin,
      );
      const minDate = date;
      const maxDate = this.typeService.getGlobalDate(new Date());
      maxDate.setDate(maxDate.getDate());
      const range = this.typeService.getUTCDateRange(minDate, maxDate.toJSON());
      const options = {
        where: {
          createdAt: { [Op.gte]: range.fromDate, [Op.lt]: range.endDate },
        },
      };
      await this.collectionRepo.deleteWhereData(options);
      const data = await this.collectionRepo.bulkCreate(preparedData);
      if (data === k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getUserDetailsPerAdmins(admins, date) {
    let adminIds = admins.map((admin) => admin.id);
    let finalData;
    try {
      const adminData = await this.getAmountandUsers(adminIds, date);
      const summons = [];
      const demandIds = [];
      const warrant = [];
      const legalIds = [];
      const loanIds = [];
      for (let i = 0; i < adminData?.length; i++) {
        for (let j = 0; j < adminData[i]?.loanList?.length; j++) {
          const loanData = adminData[i]?.loanList[j];
          loanIds.push(loanData.id);
        }
      }

      const legalInclude = {
        model: LegalCollectionEntity,
        attributes: ['type'],
      };
      const options = {
        where: {
          id: loanIds,
        },
        include: legalInclude,
      };
      const attributes = ['legalId', 'followerId', 'id'];
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );

      for (let k = 0; k < loanList.length; k++) {
        const legal_Status = legalString[loanList[k]?.legalData?.type];
        switch (legal_Status) {
          case 'Demand letter':
            demandIds.push(loanList[k]);
            break;
          case 'Summons':
            summons.push(loanList[k]);
            break;
          case 'Warrant':
            warrant.push(loanList[k]);
            break;
          case 'Legal notice':
            legalIds.push(loanList[k]);
            break;
        }
      }
      const promises = [
        this.getLegalDataOfAdmin(adminIds, summons, date),
        this.getLegalDataOfAdmin(adminIds, warrant, date),
        this.getLegalDataOfAdmin(adminIds, demandIds, date),
        this.getLegalDataOfAdmin(adminIds, legalIds, date),
        this.getPayAmount(adminIds, date, 'monthly'),
        this.getPayAmount(adminIds, date, 'today'),
      ];
      const [
        summonData,
        warrentData,
        demandData,
        noticeData,
        monthlyPayAmount,
        todayPayAmount,
      ] = await Promise.all(promises);
      finalData = {
        adminData,
        summonData,
        warrentData,
        demandData,
        noticeData,
        monthlyPayAmount,
        todayPayAmount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
    const otherData = [];
    for (let adminId of adminIds) {
      try {
        const bodyData = {
          adminList: adminId,
          minDate: date,
          maxDate: date,
          isCount: 'false',
        };
        const query = {
          isCount: 'true',
          minDate: date,
          maxDate: date,
          adminList: [adminId],
        };
        const promises = [
          this.collectionService.getPtpGoalDataQuery(bodyData, adminId),
          this.service.callSummary(query),
          this.service.unTouchedCrmUsers({ isCount: 'true', adminId }),
        ];
        const [ptpData, callData, unTouchedCrmData] = await Promise.all(
          promises,
        );
        otherData.push({ ptpData, callData, unTouchedCrmData });
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return {
      otherData,
      finalData,
    };
  }

  async getAmountandUsers(adminIds, date) {
    const amountAndAdminData = [];
    for (let adminId of adminIds) {
      const query = {
        adminId,
        minDate: date,
        maxDate: date,
      };
      try {
        const adminWiseUserData = await this.service.dashboardCard(query);
        if (adminWiseUserData?.message) return adminWiseUserData;
        amountAndAdminData.push(adminWiseUserData);
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return amountAndAdminData;
  }

  async getLegalDataOfAdmin(adminIds, loanIds, date) {
    let legalData = [];
    for (let adminId of adminIds) {
      let amount = 0;
      try {
        let count = 0;
        loanIds.forEach((loan) => {
          if (loan.followerId == adminId) {
            count++;
          }
        });

        const attr = ['paidAmount', 'followerId'];
        const opt = {
          where: {
            loanId: { [Op.in]: loanIds.map((loan) => loan.id) },
            followerId: adminId,
            status: 'COMPLETED',
            type: { [Op.ne]: 'REFUND' },
            completionDate: date,
          },
        };
        const amountDetails = await this.transRepo.getTableWhereData(attr, opt);
        if (amountDetails == k500Error) return kInternalError;
        amount = amountDetails.reduce((acc, curr) => acc + curr.paidAmount, 0);
        legalData.push({ count: count, amount: Math.floor(amount) });
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return legalData;
  }

  async getPayAmount(adminIds, date, type) {
    let dates;
    const givenDate = this.typeService.getGlobalDate(date);
    if (type === 'monthly') {
      dates = this.getFirstDate(date);
    } else {
      dates = { firstDate: givenDate };
    }
    dates.lastDate = givenDate;
    const paidAmountData = [];
    for (let adminId of adminIds) {
      try {
        let totalPaidAmount = 0;
        const options: any = {
          where: {
            status: 'COMPLETED',
            adminId,
            completionDate: {
              [Op.gte]: dates.firstDate.toJSON(),
              [Op.lte]: dates.lastDate.toJSON(),
            },
            type: { [Op.ne]: 'REFUND' },
          },
          group: ['status'],
        };

        let att: any = [
          [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'amount'],
          [Sequelize.fn('COUNT', Sequelize.col('status')), 'COUNT'],
        ];
        const total: any = await this.transRepo.getRowWhereData(att, options);
        if (total === k500Error) return kInternalError;
        totalPaidAmount = Math.floor(total?.amount ?? 0);
        paidAmountData.push(totalPaidAmount);
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return paidAmountData;
  }

  getFirstDate(date) {
    date = new Date(date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDate = this.typeService.getGlobalDate(new Date(year, month, 1));
    return { firstDate };
  }

  removeCommaAndRupee(amount) {
    return amount.replace(/[₹,]/g, '');
  }

  async prepareAdminWiseData(admins, details) {
    const finalData = [];

    for (let i = 0; i < admins.length; i++) {
      let adminData: any = {
        adminId: admins[i].id,
        totalCases: +details.finalData.adminData[i]['Total users'] ?? 0,
        amountToBeRecovered:
          details.finalData.adminData[i]['Amount to be recovered'] ?? 0,
        principalToBeRecovered:
          details.finalData.adminData[i]['Principal to be recovered'] ?? 0,
        activePartPayment:
          +details.finalData.adminData[i]['Active part payment'] ?? 0,
        receivedPartPayment:
          details.finalData.adminData[i]['Received part payment'] ?? 0,
        untouchedUser:
          +details.otherData[i].unTouchedCrmData.unTouchedUsers ?? 0,
        unTouchedPTPs:
          +details.otherData[i].unTouchedCrmData.unTouchedPTPs ?? 0,
        demandCase: +details.finalData.demandData[i].count ?? 0,
        demandPayment: +details.finalData.demandData[i].amount ?? 0,
        noticeCase: +details.finalData.noticeData[i].count ?? 0,
        noticePayment: +details.finalData.noticeData[i].amount ?? 0,
        summonsCase: +details.finalData.summonData[i].count ?? 0,
        summonsPayment: +details.finalData.summonData[i].amount ?? 0,
        warrentCase: +details.finalData.warrentData[i].count ?? 0,
        warrentPayment: +details.finalData.warrentData[i].amount ?? 0,
        totalPtp: +details.otherData[i].ptpData.totalPtps ?? 0,
        paidPtp: +details.otherData[i].ptpData.paidPTPs ?? 0,
        unpaidPtp: +details.otherData[i].ptpData.unPaidPTPs ?? 0,
        ptpAmount: +details.otherData[i].ptpData.totalAmount ?? 0,
        totalCalls: +details.otherData[i].callData.totalCalls ?? 0,
        connectedCalls: +details.otherData[i].callData.connectedCalls ?? 0,
        notConnectedCalls:
          +details.otherData[i].callData.notConnectedCalls ?? 0,
        todayPayment: +details.finalData.todayPayAmount[i] ?? 0,
        monthlyPayment: +details.finalData.monthlyPayAmount[i] ?? 0,
        bucketWise: {},
      };

      const dateWiseJson = {
        '1 to 15': {
          totalUsers:
            +details.finalData.adminData[i].dateWiseData[0]['Total users'],
          amountToBeRecovered:
            details.finalData.adminData[i].dateWiseData[0][
              'Amount to be recovered'
            ],
          principalToBeRecovered:
            details.finalData.adminData[i].dateWiseData[0][
              'Principal to be recovered'
            ],
        },
        '16 to 30': {
          totalUsers:
            +details.finalData.adminData[i].dateWiseData[1]['Total users'],
          amountToBeRecovered:
            details.finalData.adminData[i].dateWiseData[1][
              'Amount to be recovered'
            ],
          principalToBeRecovered:
            details.finalData.adminData[i].dateWiseData[1][
              'Principal to be recovered'
            ],
        },
        '31 to 60': {
          totalUsers:
            +details.finalData.adminData[i].dateWiseData[2]['Total users'],
          amountToBeRecovered:
            details.finalData.adminData[i].dateWiseData[2][
              'Amount to be recovered'
            ],
          principalToBeRecovered:
            details.finalData.adminData[i].dateWiseData[2][
              'Principal to be recovered'
            ],
        },
        '61 to 90': {
          totalUsers:
            +details.finalData.adminData[i].dateWiseData[3]['Total users'],
          amountToBeRecovered:
            details.finalData.adminData[i].dateWiseData[3][
              'Amount to be recovered'
            ],
          principalToBeRecovered:
            details.finalData.adminData[i].dateWiseData[3][
              'Principal to be recovered'
            ],
        },
        '90+': {
          totalUsers:
            +details.finalData.adminData[i].dateWiseData[4]['Total users'],
          amountToBeRecovered:
            details.finalData.adminData[i].dateWiseData[4][
              'Amount to be recovered'
            ],
          principalToBeRecovered:
            details.finalData.adminData[i].dateWiseData[4][
              'Principal to be recovered'
            ],
        },
      };
      adminData.bucketWise = dateWiseJson;
      adminData.amountToBeRecovered = +this.removeCommaAndRupee(
        adminData.amountToBeRecovered,
      );
      adminData.principalToBeRecovered = +this.removeCommaAndRupee(
        adminData.principalToBeRecovered,
      );
      adminData.receivedPartPayment = +this.removeCommaAndRupee(
        adminData.receivedPartPayment,
      );
      const buckets = ['1 to 15', '16 to 30', '31 to 60', '61 to 90', '90+'];
      buckets.forEach((bucket) => {
        adminData.bucketWise[bucket].amountToBeRecovered =
          +this.removeCommaAndRupee(
            adminData.bucketWise[bucket].amountToBeRecovered,
          );
        adminData.bucketWise[bucket].principalToBeRecovered =
          +this.removeCommaAndRupee(
            adminData.bucketWise[bucket].principalToBeRecovered,
          );
      });
      finalData.push(adminData);
    }
    return finalData;
  }

  async getCollectionPerformanceAdminWise(reqData) {
    let startDate = await this.typeService
      .getGlobalDate(reqData?.startDate)
      .toJSON();
    let range = await this.typeService.getUTCDateRange(startDate, startDate);

    const page = reqData?.page ?? 1;

    const attributes = [
      'adminId',
      'totalCases',
      'amountToBeRecovered',
      'summonsCase',
      'summonsPayment',
      'warrentCase',
      'warrentPayment',
      'totalPtp',
      'ptpAmount',
      'totalCalls',
      'todayPayment',
      'monthlyPayment',
    ];

    let options: any = {
      where: {
        createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
      },
    };
    if (reqData?.download != 'true') {
      options.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
      options.limit = PAGE_LIMIT;
    }

    const adminData = await this.collectionRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (adminData == k500Error) return kInternalError;

    const rows = await this.prepareFinalAdminWiseData(adminData.rows, reqData);

    if (reqData.download && reqData.download === 'true') {
      const rawExcelData = {
        sheets: ['local-reports'],
        data: [rows],
        sheetName: 'Collection Report.xlsx',
        needFindTuneKey: false,
      };
      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      const updatedData = { downloadUrl: url, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl: url };
    }
    return { rows, count: adminData.count };
  }

  getlastDateOfMonth(date) {
    date = new Date(date);
    const year = date.getFullYear();
    const month = date.getMonth();
    return this.typeService.getUTCDate(new Date(year, month + 1, 1).toJSON());
  }

  async prepareFinalAdminWiseData(adminData, query) {
    const finalData = [];
    try {
      for (let i = 0; i < adminData.length; i++) {
        const adminWiseData = {};
        adminWiseData['Agent Name'] =
          (await this.commonSharedService.getAdminData(adminData[i].adminId))
            ?.fullName ?? '-';
        adminWiseData['Total Cases'] = adminData[i].totalCases;
        adminWiseData['Total Amount to be Recovered'] =
          this.typeService.amountNumberWithCommas(
            adminData[i].amountToBeRecovered,
          );
        adminWiseData['Total Summons Cases'] = adminData[i].summonsCase;
        adminWiseData["Summon's Received Payment"] =
          this.typeService.amountNumberWithCommas(adminData[i].summonsPayment);
        adminWiseData['Total Warrant Cases'] = adminData[i].warrentCase;
        adminWiseData["Warrant's Received Payment"] =
          this.typeService.amountNumberWithCommas(adminData[i].warrentPayment);
        adminWiseData["Today's PTP"] = adminData[i].totalPtp;
        adminWiseData["Today's PTP Amount"] =
          this.typeService.amountNumberWithCommas(adminData[i].ptpAmount);
        adminWiseData['Total Calls'] = adminData[i].totalCalls;
        adminWiseData["Today's Received Payment"] =
          this.typeService.amountNumberWithCommas(adminData[i].todayPayment);
        adminWiseData["Month's Total Received Payment"] =
          this.typeService.amountNumberWithCommas(adminData[i].monthlyPayment);
        finalData.push(adminWiseData);
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // #end region

  // Cibil user report for CIBIL Trigger
  async cibilUserReport(reqData) {
    const allData: any = await this.getCibilData(reqData);
    if (allData?.message) return allData;
    const userData = allData?.userData;
    const cibilData = allData?.cibilData;
    const newCibilStateCode = {};
    Object.keys(cibilStateCode).forEach((key) => {
      const value = cibilStateCode[key];
      newCibilStateCode[value] = key;
    });
    // return allData;
    const rows = [];
    const length = userData.length;
    for (let index = 0; index < length; index++) {
      try {
        const user = userData[index];
        const kyc = user?.kycData;
        const userId = user?.id;
        const cibil = cibilData.find((f) => userId == f?.userId);
        const custRefId =
          cibil?.requestdata?.sampledata?.consumerInputSubject?.tuefHeader
            ?.memberRefNo;
        const DOB = kyc?.aadhaarDOB;
        const address = this.typeService.getAadhaarAddress(kyc);
        const gender =
          user?.gender == 'FEMALE' || user?.gender == 'female' ? '1' : '2';
        const preparedData = {
          ['Member Reference Number']: custRefId ?? '-',
          ['Enquiry Amount']: '-',
          ['Consumer Name']: user?.fullName ?? '-',
          ['Date of Birth']: DOB ? this.formatDate(DOB) : '-',
          ['Gender']: gender,
          ['Income Tax ID Number']: kyc?.panCardNumber ?? '-',
          ['Passport Number']: '-',
          ['Voter ID Number']: '-',
          ['Driver’s License Number']: '-',
          ['Ration Card Number']: '-',
          ['Universal ID Number']: '-',
          ['Additional ID #1']: '-',
          ['Additional ID #2']: '-',
          ['Telephone Number 1 (Mobile)']:
            this.cryptService.decryptPhone(user?.phone) ?? '-',
          ['Telephone Number 2']: '-',
          ['Telephone Number 3']: '-',
          ['Telephone Number 4']: '-',
          ['Address Line 1']: address.address ?? '-',
          ['State 1']: newCibilStateCode[kyc?.aadhaarState] ?? '-',
          ['PIN Code 1']: kyc?.pincode ?? '-',
          ['Address Line 2']: '-',
          ['State 2']: newCibilStateCode[user?.state] ?? '-',
          ['PIN Code 2']: '-',
          ['Account Number']: '-',
          userId,
          loanId: cibil?.loanId ?? '-',
        };
        rows.push(preparedData);
      } catch (error) {}
    }
    // Download the report
    const rawExcelData = {
      sheets: ['cibilUserReport'],
      data: [rows],
      sheetName: 'cibilUserReport.xlsx',
    };
    await this.fileService.objectToExcel(rawExcelData);
    return rows;
  }

  async getCibilData(body) {
    try {
      let userId = body?.userIds;
      if (!userId || userId.length == 0) return kParamMissing('userIds');
      userId = [...new Set(userId.map((item) => item))];
      // user data
      const attr = ['id', 'fullName', 'phone', 'gender', 'state'];
      const kycInc = {
        model: KYCEntity,
        attributes: [
          'panCardNumber',
          'aadhaarDOB',
          'aadhaarAddress',
          'aadhaarAddressResponse',
          'aadhaarState',
          'pincode',
        ],
      };
      const opts = { where: { id: userId }, include: [kycInc] };
      const userData = await this.userRepo.getTableWhereData(attr, opts);
      if (userData === k500Error) return kInternalError;
      // cibil data
      const cibilAttr = ['id', 'userId', 'loanId', 'requestdata'];
      const cibilOpts = { where: { userId }, order: [['id', 'desc']] };
      const cibilData = await this.cibilScoreRepo.getTableWhereData(
        cibilAttr,
        cibilOpts,
      );
      if (cibilData === k500Error) return kInternalError;
      if (cibilData.length == 0) return {};
      return { userData, cibilData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  formatDate(inputDate) {
    const [year, month, day] = inputDate.split('-');
    const formattedDate = day + month + year;
    return formattedDate;
  }

  attributes = [
    'status',
    'cibilScore',
    'plScore',
    'totalAccounts',
    'overdueAccounts',
    'zeroBalanceAccounts',
    'highCreditAmount',
    'currentBalance',
    'overdueBalance',
    'totalOverdueDays',
    'PLOutstanding',
    'totalOutstanding',
    'monthlyIncome',
    'totalInquiry',
    'inquiryPast30Days',
    'inquiryPast12Months',
    'inquiryPast24Months',
    'recentDateOpened',
    'oldestDateOpened',
    'recentInquiryDate',
    'oldestInquiryDate',
    'PLAccounts',
    'responsedata',
    'names',
    'ids',
    'telephones',
    'emails',
    'employment',
    'scores',
    'addresses',
    'accounts',
    'enquiries',
  ];

  async dpdReversal(reqData): Promise<any> {
    const isDownload = reqData?.download ?? 'false';

    // Preparation -> Query
    let query = `SELECT 
    "loan"."accId", 
    TO_CHAR(TO_TIMESTAMP("loan"."loan_disbursement_date", 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'), 'DD/MM/YYYY') AS "disbursement_date", 
    "user"."fullName" as "name", "emi"."loanId", "loan"."netApprovedAmount" as "approvedAmount", "emi"."emiNumber" AS "EMI Number",
    TO_CHAR(TO_TIMESTAMP("emi_date", 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'), 'DD/MM/YYYY') AS "EMI Due Date", 
    TO_CHAR(CURRENT_DATE AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY') AS "Report date",
    "penalty_days" AS "DPD", 'P-' || "loan"."netApprovedAmount" AS "netApproved_Ref_No",
    CASE
     WHEN "penalty_days" < 180 THEN 0
     ELSE "principalCovered" - COALESCE(SUM("transaction"."principalAmount"), 0)
    END AS "Unpaid EMI Principal",
    'I' || "emi"."emiNumber" || '-' || "emi"."loanId" AS "EMI Interest Ref-Number", 
    "interestCalculate" - COALESCE(SUM("transaction"."interestAmount"), 0) AS "Unpaid EMI Interest"
    
    FROM "EmiEntities" AS "emi"
    
    INNER JOIN "loanTransactions" AS "loan" ON "loan"."id" = "emi"."loanId"
    INNER JOIN "registeredUsers" AS "user" ON "emi"."userId" = "user"."id"
    LEFT JOIN "TransactionEntities" AS "transaction" ON "transaction"."emiId" = "emi"."id" AND "transaction"."status" = 'COMPLETED'
    
    WHERE "payment_status" = '0' AND "payment_due_status" = '1' AND "penalty_days" >= 90
    
    GROUP BY "emi"."loanId", "loan"."loan_disbursement_date", "emi"."emiNumber", "loan"."accId", "user"."fullName",
             "loan"."netApprovedAmount", "emi_date", "penalty_days", "interestCalculate", "principalCovered"
    
    ORDER BY  "emi"."loanId" ASC`;
    if (isDownload !== 'true') query += ' LIMIT 10';

    // Hit -> Query
    const finalizedList = await this.repoManager.injectRawQuery(
      EmiEntity,
      query,
    );
    if (finalizedList === k500Error) throw new Error();

    // Modification -> Report date
    let today: any = this.typeService.getGlobalDate(new Date());
    const todayData = this.dateService.dateToReadableFormat(
      today,
      'DD/MM/YYYY',
    );
    today = todayData.readableStr;
    finalizedList.forEach((el) => {
      el['Report date'] = today;
    });

    // Download the report
    if (isDownload === 'true') {
      const rawExcelData = {
        sheets: ['dpdReversal'],
        data: [finalizedList],
        sheetName: 'dpdReversal.xlsx',
      };
      const fileURL = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileURL?.message) throw new Error();
      const updatedData = { downloadUrl: fileURL, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileURL };
    }

    // Preparation -> Query
    query = `SELECT COUNT("emi"."id")
    FROM "EmiEntities" AS "emi"
    WHERE "payment_status" = '0' AND "payment_due_status" = '1' AND "penalty_days" >= 90`;
    // Hit -> Query
    const countData = await this.repoManager.injectRawQuery(EmiEntity, query);
    if (countData === k500Error) throw new Error();

    return { count: +countData[0].count, rows: finalizedList };
  }

  // Dump DisbursementData Report for Account team
  async dumpDisbursementData(reqData) {
    if (!reqData?.startDate || !reqData?.endDate)
      return kParamMissing('startDate or endDate');
    const startDate = this.typeService.getGlobalDate(reqData.startDate);
    const endDate = this.typeService.getGlobalDate(reqData.endDate);
    const isDownload = reqData?.download ?? 'false';
    const page = reqData?.page;
    const searchData: any = this.common.getSearchData(
      reqData?.searchText?.trim(),
    );
    if (searchData?.message) return searchData;

    const emiInc = {
      model: EmiEntity,
      attributes: [
        'id',
        'emi_date',
        'penalty',
        'totalPenalty',
        'penalty_days',
        'payment_due_status',
        'payment_status',
        'principalCovered',
        'interestCalculate',
        'payment_done_date',
        'fullPayPenalty',
        'fullPayInterest',
        'fullPayPrincipal',
        'pay_type',
      ],
    };
    const traInc = {
      model: TransactionEntity,
      attributes: [
        'id',
        'paidAmount',
        'completionDate',
        'subscriptionDate',
        'status',
        'type',
        'emiId',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'transactionId',
        'regInterestAmount',
        'bounceCharge',
        'sgstOnBounceCharge',
        'cgstOnBounceCharge',
        'penalCharge',
        'sgstOnPenalCharge',
        'cgstOnPenalCharge',
        'legalCharge',
        'sgstOnLegalCharge',
        'cgstOnLegalCharge',
      ],
      where: { status: kCompleted },
      required: false,
    };
    const userInc = {
      model: registeredUsers,
      attributes: ['id', 'fullName', 'phone'],
      where: {},
    };
    // Search by user's name
    if (searchData.text != '' && searchData.type == 'Name')
      userInc.where = { fullName: { [Op.iRegexp]: searchData.text } };
    // Search by user's phone number
    else if (searchData.text != '' && searchData.type == 'Number')
      userInc.where = { phone: { [Op.like]: searchData.text } };

    const attr = ['id', 'loanStatus', 'loan_disbursement_date'];
    const opts: any = {
      where: {
        loan_disbursement_date: {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        },
        loanStatus: { [Op.or]: ['Active', 'Complete'] },
      },
      include: [userInc, emiInc, traInc],
      order: [['id']],
    };
    if (isDownload != 'true') {
      opts.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
      opts.limit = PAGE_LIMIT;
    }
    // Search by loanId
    if (searchData.type == 'LoanId') opts.where.id = +searchData.text;

    // Hit -> Query
    const loanData = await this.loanRepo.getTableWhereDataWithCounts(
      attr,
      opts,
    );
    if (loanData === k500Error) throw new Error();

    const toDate = this.typeService.getGlobalDate(new Date());
    const length = loanData.rows.length;
    const finalData = [];
    for (let index = 0; index < length; index++) {
      const loan = loanData.rows[index];
      const user = loan.registeredUsers;
      const emiData = loan.emiData;
      emiData.sort((a, b) => a.id - b.id);
      let transData = loan?.transactionData ?? [];

      const refundData = transData.find(
        (el) => el?.type == 'REFUND' && el?.status == 'COMPLETED',
      );
      if (refundData) {
        transData.sort((a, b) => b.id - a.id);
        let extraPayment;
        for (let index = 0; index < transData.length; index++) {
          try {
            const element = transData[index];
            if (
              element.emiId &&
              element.emiId == refundData.emiId &&
              Math.abs(element.paidAmount + refundData?.paidAmount) < 10 &&
              element.type !== 'REFUND' &&
              element.status == 'COMPLETED'
            ) {
              extraPayment = element;
              break;
            }
          } catch (error) {}
        }

        transData = transData.filter(
          (el) =>
            el?.type !== 'REFUND' &&
            extraPayment?.transactionId !== el?.transactionId,
        );
      }
      if (transData.length > 0) transData.sort((a, b) => a.id - b.id);

      const obj: any = {};
      obj['userId'] = user.id;
      obj['Loan id'] = loan.id;
      obj['Name'] = user?.fullName;
      obj['Phone'] = this.cryptService.decryptPhone(user?.phone);
      obj['Loan status'] = loan.loanStatus;
      obj['Disbursement date'] = this.typeService.jsonToReadableDate(
        loan?.loan_disbursement_date,
      );
      let rPrincipal = 0;
      let rInterest = 0;
      for (let i = 0; i < 4; i++) {
        const emi = emiData[i] ?? {};
        const emiId = emi?.id;
        const emi_date = emi?.emi_date;
        const emiDate = emi_date
          ? this.typeService.getGlobalDate(emi_date)
          : toDate;

        let pPrincipal = emi?.fullPayPrincipal ?? 0;
        let pInterest = emi?.fullPayInterest ?? 0;
        let pPenalty = emi?.fullPayPenalty ?? 0;
        let totalPaidAmount =
          (emi?.fullPayPrincipal ?? 0) +
          (emi?.fullPayInterest ?? 0) +
          (emi?.fullPayPenalty ?? 0);

        const payments = transData.filter(
          (item) => emiId == item?.emiId || !item?.emiId,
        );
        for (let index = 0; index < payments.length; index++) {
          const ele = payments[index];
          if (ele.type !== 'FULLPAY') {
            totalPaidAmount += ele.paidAmount;
            pPrincipal += ele.principalAmount;
            pInterest += ele.interestAmount;
            pPenalty += ele.penaltyAmount ?? 0;
            pPenalty += ele.regInterestAmount ?? 0;
            pPenalty +=
              (ele.bounceCharge ?? 0) +
              (ele.sgstOnBounceCharge ?? 0) +
              (ele.cgstOnBounceCharge ?? 0);
            pPenalty +=
              (ele.penalCharge ?? 0) +
              (ele.sgstOnPenalCharge ?? 0) +
              (ele.cgstOnPenalCharge ?? 0);
            pPenalty +=
              (ele.legalCharge ?? 0) +
              (ele.sgstOnLegalCharge ?? 0) +
              (ele.cgstOnLegalCharge ?? 0);
          }
        }
        rPrincipal += emi?.principalCovered ?? 0;
        rPrincipal -= pPrincipal;
        // Below condition - as per Shyam soni not consider upcomming EMI interest for this report
        if (emiDate <= toDate) {
          rInterest += emi?.interestCalculate ?? 0;
          rInterest -= pInterest;
        }
        // EMI data
        obj[`Emi ${i + 1} Amount`] = this.strService.readableAmount(
          (emi?.principalCovered ?? 0) + (emi?.interestCalculate ?? 0),
        );
        obj[`Emi ${i + 1} Date`] = emi?.emi_date
          ? this.typeService.jsonToReadableDate(emi?.emi_date)
          : '-';
        obj[`Emi ${i + 1} Principal`] = this.strService.readableAmount(
          emi?.principalCovered ?? 0,
        );
        obj[`Emi ${i + 1} Interest`] = this.strService.readableAmount(
          emi?.interestCalculate ?? 0,
        );
        obj[`Emi ${i + 1} Delay Days`] = emi?.penalty_days ?? 0;

        // Repaid data
        obj[`Emi ${i + 1} Repaid date`] = emi?.payment_done_date
          ? this.typeService.jsonToReadableDate(emi?.payment_done_date)
          : '-';
        obj[`Emi ${i + 1} Repaid Principal`] = this.strService.readableAmount(
          +pPrincipal.toFixed(2),
        );
        obj[`Emi ${i + 1} Repaid Interest`] = this.strService.readableAmount(
          +pInterest.toFixed(2),
        );
        obj[`Emi ${i + 1} Repaid Penalty`] = this.strService.readableAmount(
          +pPenalty.toFixed(2),
        );
        obj[`Emi ${i + 1} Total Repaid`] = this.strService.readableAmount(
          +totalPaidAmount.toFixed(2),
        );
      }
      obj[`Remaining Principal`] = this.strService.readableAmount(rPrincipal);
      obj[`Remaining Interest`] = this.strService.readableAmount(rInterest);
      finalData.push(obj);
    }

    // Download the report
    if (isDownload === 'true') {
      const rawExcelData = {
        sheets: ['dumpDisbursement'],
        data: [finalData],
        sheetName: 'dumpDisbursement.xlsx',
      };
      const fileURL = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileURL?.message) throw new Error();
      const updatedData = { downloadUrl: fileURL, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileURL };
    }
    if (isDownload === 'true') {
      const rawExcelData = {
        sheets: ['local-reports'],
        data: [finalData],
        sheetName: 'Till date remaining report.xlsx',
        needFindTuneKey: false,
        reportStore: true,
        startDate,
        endDate,
      };
      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      const updatedData = { downloadUrl: url, status: '1' };
      const downloadId = reqData?.downloadId;
      if (downloadId)
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl: url };
    }
    loanData.rows = finalData;
    return loanData;
  }

  // total defaulter report for collection team
  async totalDefaulterData(reqData) {
    const loanList = reqData?.loanList ?? [];
    const isDownload = reqData?.download ?? 'false';
    const emiInc = {
      model: EmiEntity,
      attributes: [
        'id',
        'penalty',
        'penalty_days',
        'principalCovered',
        'interestCalculate',
      ],
    };
    const userInc = {
      model: registeredUsers,
      attributes: ['id', 'fullName', 'phone'],
    };
    const disInc = { model: disbursementEntity, attributes: ['amount'] };
    const attr = [
      'id',
      'loanStatus',
      'loan_disbursement_date',
      'netApprovedAmount',
    ];
    const opts = {
      where: { id: loanList, loanStatus: 'Active' },
      include: [userInc, emiInc, disInc],
      order: [['id']],
    };
    // Hit -> Query
    const loanData = await this.loanRepo.getTableWhereData(attr, opts);
    if (loanData === k500Error) throw new Error();
    const length = loanData.length;
    const finalData = [];
    for (let index = 0; index < length; index++) {
      const loan = loanData[index];
      const user = loan.registeredUsers;
      const emiData = loan.emiData;
      emiData.sort((a, b) => a.id - b.id);

      const obj: any = {};
      obj['Loan id'] = loan.id;
      obj['Name'] = user?.fullName;
      obj['Phone'] = this.cryptService.decryptPhone(user?.phone);
      obj['Loan status'] = loan.loanStatus;
      obj['Disbursement date'] = this.typeService.jsonToReadableDate(
        loan?.loan_disbursement_date,
      );
      obj['Approved amount'] = +(loan?.netApprovedAmount ?? 0);
      let disData = loan?.disbursementData[0] ?? {};
      obj['Disbursement amount'] = (disData?.amount ?? 0) / 100;

      let rPrincipal = 0;
      let rInterest = 0;
      let delayDays = 0;
      let penalty = 0;
      for (let i = 0; i < emiData.length; i++) {
        const emi = emiData[i] ?? {};
        const penaltyDays = emi?.penalty_days ?? 0;
        if (delayDays < penaltyDays) delayDays = penaltyDays;
        rPrincipal += emi?.principalCovered ?? 0;
        rInterest += emi?.interestCalculate ?? 0;
        penalty += emi?.penalty ?? 0;
      }
      obj['Delay Days'] = delayDays;
      obj['Penalty'] = +penalty.toFixed(2);
      obj['Principal'] = +rPrincipal.toFixed(2);
      obj['Interest'] = +rInterest.toFixed(2);
      finalData.push(obj);
    }

    // Download the report
    if (isDownload === 'true') {
      const rawExcelData = {
        sheets: ['totalDefaulterData'],
        data: [finalData],
        sheetName: 'totalDefaulterData.xlsx',
      };
      const fileURL = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileURL?.message) throw new Error();
      return { fileURL };
    }
    return finalData;
  }

  // Purpose -> Accounting
  // Source -> https://lenditt.atlassian.net/browse/MILLENNIAL-4658
  async reversalOfPI(reqData) {
    const targetData: any = await this.getDataForReversalOfPI(reqData);
    const isDownload = reqData?.download ?? 'false';
    const targetDate = reqData.targetDate;
    if (!targetDate) return kParamMissing('targetDate');

    const principalList = [];
    const interestList = [];
    const reportDate = this.typeService.jsonToReadableDate(
      this.typeService.getGlobalDate(targetDate).toJSON(),
    );

    const targetDateTime = this.typeService.getGlobalDate(targetDate);
    for (let index = 0; index < targetData.loanList.length; index++) {
      const loanData = targetData.loanList[index];
      const emiList = loanData.emiData ?? [];
      const userData = loanData.registeredUsers ?? {};

      const interestRowData = {
        Acc_Id: loanData.accId ?? '-',
        createdAtDate: reportDate,
        Name: userData.fullName ?? '-',
        LoanId: loanData.id,
        'Interest Reversal Total': 0,
        'Interest EMI1_Ref No': '-',
        'Interest EMI1': '-',
        'Interest EMI2_Ref No': '-',
        'Interest EMI2': '-',
        'Interest EMI3_Ref No': '-',
        'Interest EMI3': '-',
        'Interest EMI4_Ref No': '-',
        'Interest EMI4': '-',
        'Max Delay Days': 0,
        Bucket: '90-180',
        Flag: 'Interest NPA',
      };
      const principalRowData = {
        Acc_Id: loanData.accId,
        createdAtDate: reportDate,
        Name: userData.fullName ?? '-',
        LoanId: loanData.id,
        'Principal Reversal Total Amt': 0,
        'Principal_Ref No': `P-${loanData.id}`,
        'Principal 1': 0,
        'Principal 2': 0,
        'Principal 3': 0,
        'Principal 4': 0,
        'Max Delay Days': 0,
        Bucket: '180+',
        Flag: 'NPA',
      };

      let maxDelayDays = 0;
      let totalReversalPrincipal = 0;
      let totalReversalInterest = 0;

      for (let i = 0; i < emiList.length; i++) {
        const emiData = emiList[i];

        // Check as on date eligibility
        const emiDate = this.typeService.getGlobalDate(
          new Date(emiData.emi_date),
        );
        if (emiDate.getTime() >= targetDateTime.getTime()) continue;
        const dateDiff = this.typeService.dateDifference(
          targetDateTime,
          emiDate,
        );

        const expectedPrincipal = emiData.principalCovered ?? 0;
        const expectedInterest = emiData.interestCalculate ?? 0;

        if (dateDiff > maxDelayDays) maxDelayDays = dateDiff;

        let paidPrincipal = 0;
        let paidInterest = 0;
        const paidList = targetData.transList.filter(
          (el) => el.loanId == emiData.loanId && el.emiId == emiData.id,
        );
        paidList.forEach((el) => {
          if (el.principalAmount > 0) paidPrincipal += el.principalAmount;
          if (el.interestAmount > 0) paidInterest += el.interestAmount;
        });
        if (emiData.pay_type == kFullPay) {
          const fullPayData = targetData.transList.find(
            (el) => el.loanId == emiData.loanId && el.type == kFullPay,
          );
          if (fullPayData) {
            paidPrincipal += emiData.fullPayPrincipal ?? 0;
            paidInterest += emiData.fullPayInterest ?? 0;
          }
        }

        let reversalPrincipal = expectedPrincipal - paidPrincipal;
        if (reversalPrincipal <= 0) reversalPrincipal = 0;
        reversalPrincipal = +parseFloat(reversalPrincipal.toString()).toFixed(
          2,
        );
        let reversalInterest = expectedInterest - paidInterest;
        if (reversalInterest <= 0) reversalInterest = 0;
        reversalInterest = +parseFloat(reversalInterest.toString()).toFixed(2);

        totalReversalPrincipal += reversalPrincipal;
        totalReversalInterest += reversalInterest;

        if (reversalInterest > 0) {
          interestRowData[
            `Interest EMI${emiData.emiNumber}_Ref No`
          ] = `I${emiData.emiNumber}-${loanData.id}`;
          interestRowData[`Interest EMI${emiData.emiNumber}`] =
            reversalInterest;
        }
        if (reversalPrincipal > 0) {
          principalRowData[`Principal ${emiData.emiNumber}`] =
            reversalPrincipal;
        }
      }

      totalReversalPrincipal = +parseFloat(
        totalReversalPrincipal.toString(),
      ).toFixed(2);
      totalReversalInterest = +parseFloat(
        totalReversalInterest.toString(),
      ).toFixed(2);

      if (totalReversalInterest > 0 && maxDelayDays > 90) {
        interestRowData['Max Delay Days'] = maxDelayDays;
        interestRowData['Interest Reversal Total'] = totalReversalInterest;
        if (maxDelayDays > 180) interestRowData['Bucket'] = '180+';

        interestList.push(interestRowData);
      }
      // Principal reversal should be for the users who have delayed for more than 180 days
      if (totalReversalPrincipal > 0 && maxDelayDays > 180) {
        principalRowData['Max Delay Days'] = maxDelayDays;
        principalRowData['Principal Reversal Total Amt'] =
          totalReversalPrincipal;

        principalList.push(principalRowData);
      }
    }

    // Download the report
    if (isDownload === 'true') {
      const principalData = {
        sheets: ['Principal reversal'],
        data: [principalList],
        sheetName: 'Principal reversal.xlsx',
      };
      const principalFileUrl = await this.fileService.objectToExcelURL(
        principalData,
      );
      if (principalFileUrl?.message) throw new Error();

      const interestData = {
        sheets: ['Interest reversal'],
        data: [interestList],
        sheetName: 'Interest reversal.xlsx',
      };
      const interestFileUrl = await this.fileService.objectToExcelURL(
        interestData,
      );
      if (interestFileUrl?.message) throw new Error();

      return { principalFileUrl, interestFileUrl };
    } else {
      return {
        principalList,
        interestList,
      };
    }
  }

  private async getDataForReversalOfPI(reqData) {
    const targetDate = reqData.targetDate;
    if (!targetDate) return kParamMissing('targetDate');
    const loanId = reqData.loanId;

    const emiAttr = ['loanId'];
    const whereA: any = {
      payment_status: '0',
      payment_due_status: '1',
      penalty_days: { [Op.gt]: 90 },
    };
    const whereB: any = {
      payment_done_date: { [Op.gte]: targetDate },
      payment_status: '1',
      payment_due_status: '1',
      penalty_days: { [Op.gt]: 90 },
    };
    if (loanId) {
      whereA.loanId = loanId;
      whereB.loanId = loanId;
    }
    const emiOptions: any = {
      group: ['loanId'],
      where: {
        [Op.or]: [whereA, whereB],
      },
    };

    const emiList = await this.repoManager.getTableWhereData(
      EmiEntity,
      emiAttr,
      emiOptions,
    );
    const loanIds = [...new Set(emiList.map((el) => el.loanId))];

    const emiInclude: SequelOptions = { model: EmiEntity };

    emiInclude.where = {
      [Op.or]: [
        {
          payment_status: '0',
          payment_due_status: '1',
          penalty_days: { [Op.gt]: 90 },
        },
        {
          payment_done_date: { [Op.gte]: targetDate },
          payment_status: '1',
          payment_due_status: '1',
          penalty_days: { [Op.gt]: 90 },
        },
      ],
    };
    emiInclude.attributes = [
      'emi_date',
      'emiNumber',
      'id',
      'principalCovered',
      'payment_done_date',
      'interestCalculate',
      'loanId',
      'penalty_days',
      'fullPayPrincipal',
      'fullPayInterest',
      'pay_type',
    ];
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['fullName'];
    const include = [emiInclude, userInclude];

    const loanAttr = ['accId', 'id', 'loan_disbursement_date'];
    const loanOptions = { include, where: { id: loanIds } };

    const transAttr = [
      'principalAmount',
      'loanId',
      'emiId',
      'interestAmount',
      'type',
    ];
    const transOptions = {
      where: {
        completionDate: { [Op.lte]: targetDate },
        loanId: loanIds,
        status: kCompleted,
      },
    };

    const [transList, loanList] = await Promise.all([
      this.repoManager.getTableWhereData(
        TransactionEntity,
        transAttr,
        transOptions,
      ),
      this.repoManager.getTableWhereData(
        loanTransaction,
        loanAttr,
        loanOptions,
      ),
    ]);

    return { transList, loanList };
  }

  async smaReport(query) {
    try {
      // this report is done on basis of loan
      const endDate = query?.endDate ?? new Date();
      const isRowData = query?.isRowData ?? false;
      const download = query?.download ?? false;
      const downloadId = query?.downloadId ?? '0';
      let limitquery = '';
      if (isRowData == true && download == false) {
        const page = query.page || 1;
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        limitquery = `offset ${offset} limit ${limit}`;
      }

      const toDate = (await this.typeService.getGlobalDate(endDate))
        .toISOString()
        .slice(0, 19); // Format to YYYY-MM-DDTHH:MM:SS

      //by this query we willl get targeted loanIDs
      const dynamicQuery = `SELECT 
    "loanId"  
FROM public."EmiEntities" 
WHERE 
    "emi_date" < '${toDate}' 
    AND "payment_due_status" = '1'
    AND ("payment_done_date" IS NULL OR "payment_done_date" >= '${toDate}')
GROUP BY "loanId" 
${limitquery};`;

      const targetedLoanIds = await this.emiRepo.injectRawQuery(dynamicQuery);

      const loanIds = targetedLoanIds
        .filter((el) => el?.loanId !== null && el?.loanId !== undefined)
        .map((el) => el.loanId);

      //we will filter data as per our requirement using query2
      const dynamicQuery2 = `
  SELECT
    e."loanId" AS "loan ID",
    e."userId" AS "user ID",
    json_agg(json_build_object(
      'payment_status', e."payment_status",
      'EMI #', e."emiNumber",
      'EMI DATE', e."emi_date", 
      'payment done date', e."payment_done_date",
      'payment due status', e."payment_due_status",
      'EMI principal amount',e."principalCovered" , 
      'EMI interest amount', e."interestCalculate" , 
      'Total EMI amount',(e."principalCovered" + e."interestCalculate") , 
      'EMI type', e."pay_type" ,
      'As on delay days', 
      CASE
      WHEN "payment_due_status" = '0' THEN 0
      WHEN  "emi_date" > '${toDate}' THEN 0
      WHEN "payment_status" = '0' THEN
          TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
      WHEN "payment_status" = '1' AND "payment_done_date" > '${toDate}' THEN
      TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
       WHEN "payment_status" = '1' AND "payment_done_date" <= '${toDate}' THEN
         0
  END 
    )) AS emiData
  FROM 
    public."EmiEntities" AS e
  WHERE
    e."loanId" IN (${loanIds.join(',')})
  GROUP BY
    e."loanId" , e."userId" ;
`;

      let userData: any = [];
      userData = await this.emiRepo.injectRawQuery(dynamicQuery2);
      if (userData == k500Error) return kInternalError;
      const countArr: any = [
        {
          'Delay days': '1 to 30',
          'User count': 0,
          'Loan count': 0,
        },
        {
          'Delay days': '31 to 60',
          'User count': 0,
          'Loan count': 0,
        },
        {
          'Delay days': '61 to 90',
          'User count': 0,
          'Loan count': 0,
        },
        {
          'Delay days': '90 Greater',
          'User count': 0,
          'Loan count': 0,
        },
        {
          'Delay days': 'ALL',
          'User count': 0,
          'Loan count': 0,
        },
      ];

      const emiDataPrepare: any = {
        'loan ID': '-',
        'user ID': '-',
        'EMI1 DATE': '-',
        'EMI1 payment done date': '-',
        'EMI1 EMI principal amount': 0,
        'EMI1 EMI interest amount': 0,
        'EMI1 Total EMI amount': 0,
        'EMI2 DATE': '-',
        'EMI2 payment done date': '-',
        'EMI2 EMI principal amount': 0,
        'EMI2 EMI interest amount': 0,
        'EMI2 Total EMI amount': 0,
        'EMI3 DATE': '-',
        'EMI3 payment done date': '-',
        'EMI3 EMI principal amount': 0,
        'EMI3 EMI interest amount': 0,
        'EMI3 Total EMI amount': 0,
        'EMI4 DATE': '-',
        'EMI4 payment done date': '-',
        'EMI4 EMI principal amount': 0,
        'EMI4 EMI interest amount': 0,
        'EMI4 Total EMI amount': 0,
        'As on delay days': 0,
      };

      //prepare data accordingly to which data we will be having
      const populatedData = userData.map((data) => {
        const result: any = { ...emiDataPrepare };
        result['loan ID'] = data['loan ID'];
        result['user ID'] = data['user ID'];
        let maxDelayDays = 0;
        data.emidata.forEach((emi) => {
          const emiNumber = emi['EMI #'];

          result[`EMI${emiNumber} DATE`] = emi['EMI DATE']
            ? this.dateService.dateToReadableFormat(
                emi['EMI DATE'],
                'DD-MM-YYYY',
              ).readableStr
            : '-';

          result[`EMI${emiNumber} payment done date`] = emi['payment done date']
            ? this.dateService.dateToReadableFormat(
                emi['payment done date'],
                'DD-MM-YYYY',
              ).readableStr
            : '-';

          result[`EMI${emiNumber} EMI principal amount`] = emi[
            'EMI principal amount'
          ]
            ? this.typeService.amountNumberWithCommas(
                parseInt(emi['EMI principal amount']),
              )
            : '-';

          result[`EMI${emiNumber} EMI interest amount`] = emi[
            'EMI interest amount'
          ]
            ? this.typeService.amountNumberWithCommas(
                parseInt(emi['EMI interest amount']),
              )
            : '-';

          result[`EMI${emiNumber} Total EMI amount`] = emi['Total EMI amount']
            ? this.typeService.amountNumberWithCommas(
                parseInt(emi['Total EMI amount']),
              )
            : '-';

          if (emi['As on delay days'] > maxDelayDays) {
            maxDelayDays = emi['As on delay days'];
          }
        });

        result['As on delay days'] = maxDelayDays;

        if (maxDelayDays > 0 && isRowData != true) {
          if (maxDelayDays >= 1 && maxDelayDays <= 30) {
            countArr[0]['User count']++;
            countArr[0]['Loan count']++;
            countArr[4]['User count']++;
            countArr[4]['Loan count']++;
          } else if (maxDelayDays >= 31 && maxDelayDays <= 60) {
            countArr[1]['User count']++;
            countArr[1]['Loan count']++;
            countArr[4]['User count']++;
            countArr[4]['Loan count']++;
          } else if (maxDelayDays >= 61 && maxDelayDays <= 90) {
            countArr[2]['User count']++;
            countArr[2]['Loan count']++;
            countArr[4]['User count']++;
            countArr[4]['Loan count']++;
          } else if (maxDelayDays >= 90) {
            countArr[3]['User count']++;
            countArr[3]['Loan count']++;
            countArr[4]['User count']++;
            countArr[4]['Loan count']++;
          }
        }
        return result;
      });

      let response;
      if (isRowData == true) {
        response = populatedData;
      } else {
        response = countArr;
      }

      if (download == true) {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [response],
          sheetName: 'Over due loan.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          endDate,
        };

        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      } else {
        return { rows: response };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async outStandingReport(query) {
    // this report is done on basis of loan
    let endDate = query?.endDate;
    if (!endDate) endDate = new Date();

    const isRowData = query?.isRowData ?? false;
    const download = query?.download ?? false;
    const downloadId = query?.downloadId ?? '0';
    const stage = query?.stage;
    if (!stage) return kParamMissing('stage');
    const searchText = query?.search;
    const multipleLoanIds = query?.loanIds ?? [];
    let search = '';

    const toDate = await this.typeService.getGlobalDate(endDate).toISOString(); // Format to YYYY-MM-DDTHH:MM:SS

    const range = {
      'SMA-0': 'BETWEEN 1 AND 30',
      'SMA-1': 'BETWEEN 31 AND 60',
      'SMA-2': 'BETWEEN 61 AND 90',
      UPCOMING: `= 0 AND e."emi_date" > '${toDate}'`,
      SA: 'BETWEEN 0 AND 90',
      SSA: `BETWEEN 91 AND 365 AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" < '${toDate}')`,
      'NPA-1': 'BETWEEN 91 AND 180',
      'NPA-2': `BETWEEN 181 AND 365 AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" < '${toDate}')`,
      DA: `>365  AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" < '${toDate}')`,
      LA: `>180 AND lt."Loss_assets" >= '${toDate}'`,
      'SMA-ALL': '>= 0',
    };

    const SMA = range[query?.stage];
    let limitquery = '';
    if (isRowData == true && download == false) {
      const page = query.page || 1;
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const limit = PAGE_LIMIT;
      limitquery = `offset ${offset} limit ${limit}`;
    }

    if (multipleLoanIds.length > 0) {
      search = `lt."id" IN (${multipleLoanIds.join(',')}) AND`;
    } else if (searchText) {
      const searchData: any = this.common.getSearchData(searchText);
      if (searchData?.message) return searchData;

      if (searchData.text != '' && searchData.type == 'Name') {
        search = `ru."fullName" ILIKE '%${searchData.text}%' AND`;
      } // Search by user's phone number
      else if (searchData.text != '' && searchData.type == 'LoanId') {
        search = `lt."id" = ${parseInt(searchData.text)} AND`;
      } else if (searchData.type == 'Number') {
        return { count: '0', rows: [] };
      }
    }

    const delayDaysCase = `
    CASE
    WHEN "payment_due_status" = '0' THEN 0
    WHEN "emi_date" >= '${toDate}' THEN 0
    WHEN "payment_status" = '0' THEN
      TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
    WHEN "payment_status" = '1' AND "payment_done_date" > '${toDate}' THEN
      TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
    WHEN "payment_status" = '1' AND "payment_done_date" <= '${toDate}' THEN
   0
END
`;
    //by this query we will get all loanIDs
    const dynamicQuery = `SELECT 
    lt."id" 
    FROM public."loanTransactions" as lt
    JOIN
    public."registeredUsers" AS ru
  ON
    lt."userId" = ru."id"
    WHERE 
    ${search}
    "loan_disbursement_date" <= '${toDate}' 
     `;

    // const targetedLoanIds = await this.emiRepo.injectRawQuery(dynamicQuery);
    const targetedLoanIds = await this.repoManager.injectRawQuery(
      loanTransaction,
      dynamicQuery,
    );
    let loanIds = targetedLoanIds
      .filter((el) => el?.id !== null && el?.id !== undefined)
      .map((el) => el.id);

    if (loanIds.length == 0) return { count: '0', rows: loanIds };
    //we will filter required data as per our requirement using query2
    //limit query is used here
    const dynamicQuery2 = ` 
   SELECT
     e."loanId" ,
     ru."fullName",
     ru."categoryScore" ,
     ru."uniqueId",
     ru."id",
     lt."netApprovedAmount",
     lt."loan_disbursement_date",
     lt."interestRate",
     lt."approvedDuration",
     lt."loanCompletionDate",
     lt."Loss_assets",
    PGP_SYM_DECRYPT(CAST(kyc."panCardNumber" AS BYTEA), '${kCryptography}') AS "PAN",
     esign."updatedAt",
     MAX(
     ${delayDaysCase}
     ) AS "Max Delay Days",
     json_agg(json_build_object(
       'payment_status', e."payment_status",
       'emiId', e."id",
       'EMI DATE', e."emi_date",
       'payment done date', e."payment_done_date",
       'payment due status', e."payment_due_status",
       'EMI principal amount', e."principalCovered",
       'EMI interest amount', e."interestCalculate",
       'Paid Interest', e."paid_interest",
       'As on delay days', ${delayDaysCase}
     )) AS emiData
   FROM
     public."EmiEntities" AS e
   JOIN
     public."registeredUsers" AS ru
   ON
     e."userId" = ru."id"
   JOIN
     public."loanTransactions" AS lt
   ON
     e."loanId" = lt."id"
   JOIN
     public."KYCEntities" AS kyc
   ON
     ru."kycId" = kyc."id"
   LEFT JOIN
     public."esignEntities" AS esign
   ON
     e."loanId" = esign."loanId"
   WHERE
   e."loanId" IN (${loanIds.join(',')})
   GROUP BY
     e."loanId", e."userId", ru."fullName",  ru."categoryScore", lt."netApprovedAmount",
     lt."loan_disbursement_date", lt."interestRate",lt."Loss_assets",lt."approvedDuration", ru."id", ru."uniqueId", PGP_SYM_DECRYPT(CAST(kyc."panCardNumber" AS BYTEA), '${kCryptography}'),
     esign."updatedAt", lt."loanCompletionDate"
     HAVING
     MAX(
       ${delayDaysCase}
      ) ${SMA}
      ${limitquery};
      `;

    // this query will get the total counnt of the data
    const count = `
WITH main_query AS (
  SELECT
    e."loanId",
    lt."Loss_assets",
    MAX(
      ${delayDaysCase}
    ) AS "Max Delay Days"
  FROM
    public."EmiEntities" AS e
    JOIN
    public."loanTransactions" AS lt
  ON
    e."loanId" = lt."id"
  WHERE 
    e."loanId" IN (${loanIds.join(',')})
  GROUP BY
    e."loanId", lt."Loss_assets"
  HAVING
    MAX(
      ${delayDaysCase}
    ) ${SMA}
)
SELECT COUNT(*)
FROM main_query;
`;

    const [total_count, emiData] = await Promise.all([
      this.emiRepo.injectRawQuery(count),
      this.emiRepo.injectRawQuery(dynamicQuery2),
    ]);

    //For pagination here we will take data only the loanIds we will be having data
    let targetLoanIds = emiData.map((el) => el['loanId']);

    //Will Fetch Transactions of only required LoanIds
    const dynamicQuery3 = `
    SELECT
    "loanId",
    jsonb_agg(
            jsonb_build_object('Transaction amount', "paidAmount", 
            'status', "status",
            'Principal Amount',"principalAmount",
            'Interest Amount',"interestAmount",
            'completionDate', "completionDate",
            'type', "type",
            'loanId', "loanId",
            'emiId', "emiId")
          ) AS "Amounts"
          
          FROM
          public."TransactionEntities"
          WHERE
          "loanId" IN (${targetLoanIds.join(
            ',',
          )})  AND "status" = 'COMPLETED' AND "completionDate" <= '${toDate}'
        GROUP BY "loanId";
        `;

    // if (targetLoanIds.length == 0) return { count: '0', rows: [] };
    const transactions = await this.repoManager.injectRawQuery(
      TransactionEntity,
      dynamicQuery3,
    );

    //Static JSON for required Headers
    const loanDataPrepare = {
      'Loan ID': '-',
      PAN: '-',
      'Unique Customer ID': '-',
      'Borrower Name': '-',
      'Risk Categorization': '-',
      'Sanctioned Amount': '-',
      'Sanctioned Date': '-',
      'Approved IRR': 0,
      'Tenure in Months': 0,
      'Disbursed Date': '-',
      'Closure Date': '-',
      'Days Past Due as on': 0,
      'Maximum Delay Days': 0,
      'Date of NPA': '-',
      'Asset Classification': '-',
      'Sub-Asset Category': '-',
      'IRACP Provisions as on': '-',
      'Outstanding Amount as on selected Date': 0,
      'Outstanding Amount as on Previous FY 31st March': 0,
      UserId: '-',
    };

    const assetCategories = {
      SA: { percentage: 0.004, title: 'Standard Assets' },
      SSA: { percentage: 0.1, title: 'Sub-Standard Assets' },
      DA: { percentage: 0.2, title: 'Doubtful Assets' },
      LA: { percentage: 1.0, title: 'Loss Assets' },
    };

    function getAssetCategory(delayDays) {
      if (delayDays >= 0 && delayDays <= 90) {
        return assetCategories['SA'];
      } else if (delayDays > 90 && delayDays <= 180) {
        return assetCategories['SSA'];
      } else if (delayDays > 365) {
        return assetCategories['DA'];
      } else if (delayDays > 180 && delayDays <= 365) {
        return assetCategories['LA'];
      }
    }

    const countArr: any = [
      {
        'Delay days': '1 to 30',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '31 to 60',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '61 to 90',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': 'Upcoming',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '0 to 90',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '91 to 180',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '180+',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '91 to 365',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '180+ LA',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '365+',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
    ];

    let upcomingUsers = [];
    const loanData = emiData.map((emi) => {
      const result: any = { ...loanDataPrepare };
      result['Loan ID'] = emi['loanId'];
      result['PAN'] = emi['PAN'];
      result['Unique Customer ID'] = emi['uniqueId'];
      result['UserId'] = emi['id'];
      if (emi['loan_disbursement_date'])
        result['Disbursed Date'] = this.dateService.dateToReadableFormat(
          emi['loan_disbursement_date'],
          'DD-MM-YYYY',
        ).readableStr;
      result['Risk Categorization'] = emi['categoryScore'];
      result['Borrower Name'] = emi['fullName'];
      result['Approved IRR'] = (parseFloat(emi['interestRate']) * 365).toFixed(
        2,
      );
      result['Days Past Due as on'] = emi['Max Delay Days'];
      result['Maximum Delay Days'] = emi['Max Delay Days'];
      result['Tenure in Months'] = (emi['approvedDuration'] / 30).toFixed(2);
      result['Sanctioned Date'] = emi['updatedAt']
        ? this.dateService.dateToReadableFormat(emi['updatedAt'], 'DD-MM-YYYY')
            .readableStr
        : this.dateService.dateToReadableFormat(
            emi['loan_disbursement_date'],
            'DD-MM-YYYY',
          ).readableStr;
      result['Sanctioned Amount'] = emi['netApprovedAmount'];
      if (emi['Loss_assets'])
        result['Date of NPA'] = this.dateService.dateToReadableFormat(
          emi['Loss_assets'],
          'DD-MM-YYYY',
        ).readableStr;

      if (emi['loanCompletionDate'])
        result['Closure Date'] = this.dateService.dateToReadableFormat(
          emi['loanCompletionDate'],
          'DD-MM-YYYY',
        ).readableStr;
      const asset = getAssetCategory(emi['Max Delay Days']);
      result['Asset Classification'] = asset?.title ?? '-';

      const correspondingtransaction = transactions.find(
        (transaction) => transaction.loanId === emi['loanId'],
      );
      let outstandingAmount = 0;
      let loanOutstandingAmount = 0;
      if (correspondingtransaction) {
        // Check if any of the amounts are of type 'FULLPAY'
        const fullPayUser = correspondingtransaction.Amounts.some(
          (amount) => amount.type === 'FULLPAY',
        );
        if (fullPayUser) {
          loanOutstandingAmount = 0;
        } else {
          emi.emidata.forEach((emiItem) => {
            if (
              emiItem['payment_status'] == '1' &&
              emiItem['payment done date'] <= toDate
            ) {
              outstandingAmount = 0;
            } else if (emiItem['EMI DATE'] > toDate) {
              outstandingAmount = emiItem['EMI principal amount'];
              if (isRowData != true) {
                if (!upcomingUsers.includes(emi['uniqueId']))
                  upcomingUsers.push(emi['uniqueId']);

                countArr[3]['Amount'] += emiItem['EMI principal amount'];
              }
            } else {
              const matchingAmounts = correspondingtransaction.Amounts.filter(
                (amount) => amount.emiId === emiItem['emiId'],
              );

              if (matchingAmounts.length > 0) {
                let partPayAmount = 0;
                let totalInterestPaid = 0;
                matchingAmounts.forEach((matchingAmount) => {
                  // Further processing for each matching amount
                  if (
                    matchingAmount.type === 'PARTPAY' ||
                    matchingAmount.type === 'EMIPAY'
                  ) {
                    partPayAmount +=
                      matchingAmount['Principal Amount'] +
                      matchingAmount['Interest Amount'];
                  }

                  if (matchingAmount.type === 'REFUND') {
                    partPayAmount =
                      partPayAmount -
                      Math.abs(matchingAmount['Transaction amount']);
                  }
                  totalInterestPaid += matchingAmount['Interest Amount'];
                });

                if (
                  (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
                  emiItem['EMI DATE'] == toDate
                ) {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'] -
                    partPayAmount;
                }
                // for delay days > 90
                else {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'] -
                    partPayAmount -
                    (emiItem['EMI interest amount'] - totalInterestPaid);
                }
              } else {
                if (
                  (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
                  emiItem['EMI DATE'] == toDate
                ) {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'];
                } else {
                  outstandingAmount = emiItem['EMI principal amount'];
                }
              }
            }
            emiItem['OutStanding EMI Amount'] = outstandingAmount;
            loanOutstandingAmount += emiItem['OutStanding EMI Amount'];
          });
        }
      } else {
        emi.emidata.forEach((emiItem) => {
          if (
            emiItem['payment_status'] == '1' &&
            emiItem['payment done date'] <= toDate
          ) {
            outstandingAmount = 0;
          } else if (emiItem['EMI DATE'] > toDate) {
            outstandingAmount = emiItem['EMI principal amount'];
            if (isRowData != true) {
              if (!upcomingUsers.includes(emi['uniqueId']))
                upcomingUsers.push(emi['uniqueId']);

              countArr[3]['Amount'] += emiItem['EMI principal amount'];
            }
          } else if (
            (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
            emiItem['EMI DATE'] == toDate
          ) {
            outstandingAmount =
              emiItem['EMI principal amount'] + emiItem['EMI interest amount'];
          } else {
            outstandingAmount = emiItem['EMI principal amount'];
          }
          emiItem['OutStanding EMI Amount'] = outstandingAmount;
          loanOutstandingAmount += emiItem['OutStanding EMI Amount'];
        });
      }

      if (loanOutstandingAmount < 0) loanOutstandingAmount = 0;
      result['Outstanding Amount as on selected Date'] =
        loanOutstandingAmount.toFixed(2);
      result['IRACP Provisions as on'] = (
        loanOutstandingAmount * asset.percentage
      ).toFixed(2);

      if (emi['Max Delay Days'] > 0) {
        //for SMA-0 Count and total SA count
        if (emi['Max Delay Days'] >= 1 && emi['Max Delay Days'] <= 30) {
          result['Sub-Asset Category'] = 'SMA-0';
          if (isRowData != true) {
            countArr[0]['User count']++;
            countArr[0]['Amount'] += loanOutstandingAmount;
            // total SA count
            countArr[4]['User count']++;
            countArr[4]['Amount'] += loanOutstandingAmount;
          }
        }
        //for SMA-1 Count and total SA count
        else if (emi['Max Delay Days'] >= 31 && emi['Max Delay Days'] <= 60) {
          result['Sub-Asset Category'] = 'SMA-1';
          if (isRowData != true) {
            countArr[1]['User count']++;
            countArr[1]['Amount'] += loanOutstandingAmount;
            // total SA count
            countArr[4]['User count']++;
            countArr[4]['Amount'] += loanOutstandingAmount;
          }
        }
        //for SMA-2 Count and total SA count
        else if (emi['Max Delay Days'] >= 61 && emi['Max Delay Days'] <= 90) {
          result['Sub-Asset Category'] = 'SMA-2';
          if (isRowData != true) {
            countArr[2]['User count']++;
            countArr[2]['Amount'] += loanOutstandingAmount;
            // total SA count
            countArr[4]['User count']++;
            countArr[4]['Amount'] += loanOutstandingAmount;
          }
        }
        //for NPA-1 Count and total SSA count
        else if (emi['Max Delay Days'] >= 91 && emi['Max Delay Days'] <= 180) {
          result['Sub-Asset Category'] = 'NPA 91 to 180';
          if (isRowData != true) {
            countArr[5]['User count']++;
            countArr[5]['Amount'] += loanOutstandingAmount;
            // total SSA count
            countArr[7]['User count']++;
            countArr[7]['Amount'] += loanOutstandingAmount;
          }
        }
        //for NPA-2 Count and total SSA count
        else if (
          emi['Max Delay Days'] > 180 &&
          emi['Max Delay Days'] <= 365 &&
          (emi['Loss_assets'] == null || emi['Loss_assets'] < toDate)
        ) {
          result['Sub-Asset Category'] = 'NPA 180 to 365';
          if (isRowData != true) {
            countArr[6]['User count']++;
            countArr[6]['Amount'] += loanOutstandingAmount;
            // total SSA count
            countArr[7]['User count']++;
            countArr[7]['Amount'] += loanOutstandingAmount;
          }
        }
        //for total LA count
        else if (emi['Max Delay Days'] > 180 && emi['Loss_assets'] >= toDate) {
          result['Sub-Asset Category'] = 'Loss Assets';
          if (isRowData != true) {
            countArr[8]['User count']++;
            countArr[8]['Amount'] += loanOutstandingAmount;
          }
        }
        //for total DA count
        else if (
          emi['Max Delay Days'] > 365 &&
          (emi['Loss_assets'] == null || emi['Loss_assets'] < toDate)
        ) {
          result['Sub-Asset Category'] = 'Doubtfull Assets';
          if (isRowData != true) {
            countArr[9]['User count']++;
            countArr[9]['Amount'] += loanOutstandingAmount;
          }
        }
      }
      return result;
    });

    if (isRowData != true) {
      countArr[0]['Amount'] = countArr[0]['Amount'].toFixed(2);
      countArr[1]['Amount'] = countArr[1]['Amount'].toFixed(2);
      countArr[2]['Amount'] = countArr[2]['Amount'].toFixed(2);
      countArr[3]['Amount'] = countArr[3]['Amount'].toFixed(2);
      countArr[4]['Amount'] = countArr[4]['Amount'].toFixed(2);
      countArr[5]['Amount'] = countArr[5]['Amount'].toFixed(2);
      countArr[6]['Amount'] = countArr[6]['Amount'].toFixed(2);
      countArr[7]['Amount'] = countArr[7]['Amount'].toFixed(2);
      countArr[8]['Amount'] = countArr[8]['Amount'].toFixed(2);
      countArr[9]['Amount'] = countArr[9]['Amount'].toFixed(2);

      countArr[4]['provision'] = (
        countArr[4]['Amount'] * assetCategories['SA'].percentage
      ).toFixed(2);
      countArr[7]['provision'] = (
        countArr[7]['Amount'] * assetCategories['SSA'].percentage
      ).toFixed(2);
      countArr[8]['provision'] = (
        countArr[8]['Amount'] * assetCategories['LA'].percentage
      ).toFixed(2);
      countArr[9]['provision'] = (
        countArr[9]['Amount'] * assetCategories['DA'].percentage
      ).toFixed(2);
    }

    let response;
    if (isRowData == true) {
      response =
        download == false
          ? { count: total_count[0].count, rows: loanData }
          : loanData;
    } else {
      countArr[3]['User count'] = upcomingUsers.length;
      response = countArr;
    }

    if (download == true) {
      const rawExcelData = {
        sheets: ['local-reports'],
        data: [response],
        sheetName: 'Asset_Classification.xlsx',
        needFindTuneKey: false,
        reportStore: true,
        endDate,
      };

      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;

      const updatedData = { downloadUrl: url, status: '1' };
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl: url };
    } else {
      return response;
    }
  }

  async updateToNPA(query) {
    const loanIds = query?.loanIds ?? [];
    if (loanIds.length == 0) return kParamMissing('loanIds');
    if (loanIds.length > 10) return k422ErrorMessage('maximum limit is 10');
    const date = new Date();
    const toDate = (await this.typeService.getGlobalDate(date)).toISOString();

    const rowq = `UPDATE public."loanTransactions"
    SET "Loss_assets" = '${toDate}'
    WHERE "id" IN (${loanIds.join(',')}) AND "Loss_assets" is NULL;`;

    const targetedLoanIds = await this.repoManager.injectRawQuery(
      loanTransaction,
      rowq,
    );

    if (targetedLoanIds == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    return true;
  }

  //#region -> API (reversalOfPI)
  async getDetailedPIReversalReport(reqData): Promise<any> {
    const isDownload = reqData.download == 'true';
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    const startDate = reqData.startDate;

    let principalList;
    let interestList;
    if (startDate && startDate != endDate) {
      const startReqData = { ...reqData };
      const targetDate = new Date(reqData.startDate);
      targetDate.setDate(targetDate.getDate() - 1);
      startReqData.endDate = targetDate.toJSON();
      const startDateData = await this.getSingleDatePIReversalReport(
        startReqData,
      );
      const startPrincipalLoanIds = startDateData.principalList.map(
        (el) => el.LoanId,
      );
      const startInterestLoanIds = startDateData.interestList.map(
        (el) => el.LoanId,
      );

      const endDateData = await this.getSingleDatePIReversalReport(reqData);
      principalList = endDateData.principalList.filter(
        (el) => !startPrincipalLoanIds.includes(el.LoanId),
      );
      interestList = endDateData.interestList.filter(
        (el) => !startInterestLoanIds.includes(el.LoanId),
      );
    } else {
      const endDateData = await this.getSingleDatePIReversalReport(reqData);
      principalList = endDateData.principalList;
      interestList = endDateData.interestList;
    }

    // Download the report
    if (isDownload) {
      const principalData = {
        sheets: ['Principal reversal'],
        data: [principalList],
        sheetName: 'Principal reversal.xlsx',
      };
      const principalFileUrl = await this.fileService.objectToExcelURL(
        principalData,
      );
      if (principalFileUrl?.message) throw new Error();

      const interestData = {
        sheets: ['Interest reversal'],
        data: [interestList],
        sheetName: 'Interest reversal.xlsx',
      };
      const interestFileUrl = await this.fileService.objectToExcelURL(
        interestData,
      );
      if (interestFileUrl?.message) throw new Error();

      return { principalFileUrl, interestFileUrl };
    } else {
      return { principalList, interestList };
    }
  }

  async getSingleDatePIReversalReport(reqData) {
    const loanId = reqData.loanId;
    const endDate = reqData.endDate;

    const { transList, loanList } = await this.getDataForPIReversalReport(
      reqData,
    );

    const principalList = [];
    const interestList = [];
    const today = this.typeService.getGlobalDate(endDate).toJSON();
    const reportDate = this.typeService.jsonToReadableDate(today);
    const targetDateTime = this.typeService.getGlobalDate(endDate).getTime();
    for (let index = 0; index < loanList.length; index++) {
      const loanData = loanList[index];
      if (loanId && loanData.loanId != loanId) continue;
      const emiList = this.singleToEmiArray(loanData);

      const principalRowData = {
        Acc_Id: loanData.accId,
        createdAtDate: reportDate,
        Name: loanData?.fullName ?? '-',
        LoanId: loanData.loanId,
        'Principal Reversal Total Amt': 0,
        'Principal_Ref No': `P-${loanData.loanId}`,
        'Principal 1': 0,
        'Principal 2': 0,
        'Principal 3': 0,
        'Principal 4': 0,
        'Max Delay Days': loanData?.max_dpd,
        Bucket: '180+',
        Flag: 'NPA',
      };
      const interestRowData = {
        Acc_Id: loanData.accId ?? '-',
        createdAtDate: reportDate,
        Name: loanData?.fullName ?? '-',
        LoanId: loanData.loanId,
        'Interest Reversal Total': 0,
        'Interest EMI1_Ref No': '-',
        'Interest EMI1': '-',
        'Interest EMI2_Ref No': '-',
        'Interest EMI2': '-',
        'Interest EMI3_Ref No': '-',
        'Interest EMI3': '-',
        'Interest EMI4_Ref No': '-',
        'Interest EMI4': '-',
        'Max Delay Days': loanData?.max_dpd,
        Bucket: loanData?.max_dpd <= 180 ? '90-180' : '180+',
        Flag: 'Interest NPA',
      };

      for (let i = 0; i < emiList.length; i++) {
        const emiData = emiList[i];
        // Pre paid
        if (emiData.payment_done_date) {
          const paidDateTime = this.typeService
            .getGlobalDate(emiData.payment_done_date)
            .getTime();
          if (paidDateTime <= targetDateTime) continue;
        }

        const expectedPrincipal = emiData.principalCovered ?? 0;
        const expectedInterest = emiData.interestCalculate ?? 0;

        let paidPrincipal = 0;
        let paidInterest = 0;
        const paidList = transList.filter(
          (el) => el.loanId == loanData.loanId && el.emiId == emiData.id,
        );
        paidList.forEach((el) => {
          if (el.principalAmount > 0) paidPrincipal += el.principalAmount;
          if (el.interestAmount > 0) paidInterest += el.interestAmount;
        });
        if (emiData.pay_type == kFullPay) {
          const fullPayData = transList.find(
            (el) => el.loanId == loanData.loanId && el.type == kFullPay,
          );
          if (fullPayData) {
            paidPrincipal += emiData.fullPayPrincipal ?? 0;
            paidInterest += emiData.fullPayInterest ?? 0;
          }
        }

        let reversalPrincipal = expectedPrincipal - paidPrincipal;
        if (reversalPrincipal <= 0) reversalPrincipal = 0;
        reversalPrincipal = +parseFloat(reversalPrincipal.toString()).toFixed(
          2,
        );
        principalRowData['Principal Reversal Total Amt'] += reversalPrincipal;
        principalRowData[`Principal ${emiData.emiNumber}`] = reversalPrincipal;

        let reversalInterest = expectedInterest - paidInterest;
        if (reversalInterest <= 0) reversalInterest = 0;
        reversalInterest = +parseFloat(reversalInterest.toString()).toFixed(2);
        interestRowData['Interest Reversal Total'] += reversalInterest;
        interestRowData[
          `Interest EMI${emiData.emiNumber}_Ref No`
        ] = `I${emiData.emiNumber}-${loanData.loanId}`;
        interestRowData[`Interest EMI${emiData.emiNumber}`] = reversalInterest;
      }

      // Interest reversal
      if (
        loanData?.max_dpd > 90 &&
        interestRowData['Interest Reversal Total'] > 0
      ) {
        interestList.push(interestRowData);
      }
      // Principal reversal
      if (
        loanData?.max_dpd > 180 &&
        principalRowData['Principal Reversal Total Amt'] > 0
      ) {
        principalList.push(principalRowData);
      }
    }

    return { principalList, interestList };
  }

  async getDataForPIReversalReport(reqData) {
    const endDate = new Date(reqData.endDate);
    const endDateStr = this.typeService.getGlobalDate(endDate).toJSON();

    const loanList = await this.getDateWisePIReversalReport(endDateStr);
    const targetLoanIds = loanList.map((el) => el.loanId);

    const transAttr = [
      'principalAmount',
      'loanId',
      'emiId',
      'interestAmount',
      'type',
    ];
    const transOptions = {
      where: {
        completionDate: { [Op.lte]: endDateStr },
        loanId: targetLoanIds,
        status: kCompleted,
      },
    };
    const transList = await this.repoManager.getTableWhereData(
      TransactionEntity,
      transAttr,
      transOptions,
    );

    return { loanList, transList };
  }

  async getDateWisePIReversalReport(targetDate, exceptionLoanIds = []) {
    const loanExceptionStr =
      exceptionLoanIds?.length > 0
        ? `WHERE "lt"."id" NOT IN (${exceptionLoanIds.join(',')})`
        : '';
    const emiWiseDPD = `CASE WHEN "_Z_"."emi_date" >= '${targetDate}' OR "_Z_"."payment_due_status" = '0' THEN 0
            WHEN "_Z_"."payment_status" = '0' THEN TO_DATE('${targetDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("_Z_"."emi_date", 'YYYY-MM-DDTHH24:MI:SS')
            WHEN "_Z_"."payment_done_date" > '${targetDate}' THEN TO_DATE('${targetDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("_Z_"."emi_date", 'YYYY-MM-DDTHH24:MI:SS') 
       END`;
    const emi1DPDCase = this.dynamicQuery(emiWiseDPD, 'e1');
    const emi2DPDCase = this.dynamicQuery(emiWiseDPD, 'e2');
    const emi3DPDCase = this.dynamicQuery(emiWiseDPD, 'e3');
    const emi4DPDCase = this.dynamicQuery(emiWiseDPD, 'e4');

    const rawQuery = `SELECT   
     lt."accId", lt."id" AS "loanId", lt."netApprovedAmount", lt."loan_disbursement_date", lt."interestRate", lt."approvedDuration", lt."loanCompletionDate", lt."Loss_assets",
     "user"."fullName", "e1"."id" AS "emi_1_id", "e2"."id" AS "emi_2_id", "e3"."id" AS "emi_3_id", "e4"."id" AS "emi_4_id",
	   "e1"."principalCovered" AS "emi_1_principal", "e2"."principalCovered" AS "emi_2_principal", "e3"."principalCovered" AS "emi_3_principal", "e4"."principalCovered" AS "emi_4_principal",
	   "e1"."interestCalculate" AS "emi_1_interest", "e2"."interestCalculate" AS "emi_2_interest", "e3"."interestCalculate" AS "emi_3_interest", "e4"."interestCalculate" AS "emi_4_interest",
	   "e1"."emi_date" AS "emi_1_date", "e2"."emi_date" AS "emi_2_date", "e3"."emi_date" AS "emi_3_date", "e4"."emi_date" AS "emi_4_date",
     "e1"."payment_done_date" AS "emi_1_paid_date", "e2"."payment_done_date" AS "emi_2_paid_date", "e3"."payment_done_date" AS "emi_3_paid_date", "e4"."payment_done_date" AS "emi_4_paid_date",
     "e1"."fullPayPrincipal" AS "fullPayPrincipal_1", "e2"."fullPayPrincipal" AS "fullPayPrincipal_2", "e3"."fullPayPrincipal" AS "fullPayPrincipal_3", "e4"."fullPayPrincipal" AS "fullPayPrincipal_4",
     "e1"."fullPayInterest" AS "fullPayInterest_1", "e2"."fullPayInterest" AS "fullPayInterest_2", "e3"."fullPayInterest" AS "fullPayInterest_3", "e4"."fullPayInterest" AS "fullPayInterest_4",
     "e1"."pay_type" AS "pay_1_type", "e2"."pay_type" AS "pay_2_type",  "e3"."pay_type" AS "pay_3_type",  "e4"."pay_type" AS "pay_4_type",
	 
-- 	 DPD Days EMI wise
     ${emi1DPDCase} AS "emi_1_dpd", ${emi2DPDCase} AS "emi_2_dpd", ${emi3DPDCase} AS "emi_3_dpd", ${emi4DPDCase} AS "emi_4_dpd",
	 
--      Max DPD among all 4 EMIS
    GREATEST(${emi1DPDCase}, ${emi2DPDCase}, ${emi3DPDCase}, ${emi4DPDCase}) AS "max_dpd"
	  
    FROM public."loanTransactions" AS "lt"

-- Join all 4 EMIs (Loan wise record)
   LEFT JOIN "EmiEntities" AS "e1" ON "e1"."loanId" = "lt"."id" AND "e1"."emiNumber" = 1
   LEFT JOIN "EmiEntities" AS "e2" ON "e2"."loanId" = "lt"."id" AND "e2"."emiNumber" = 2
   LEFT JOIN "EmiEntities" AS "e3" ON "e3"."loanId" = "lt"."id" AND "e3"."emiNumber" = 3
   LEFT JOIN "EmiEntities" AS "e4" ON "e4"."loanId" = "lt"."id" AND "e4"."emiNumber" = 4

   INNER JOIN "registeredUsers" AS "user" ON "user"."id" = "lt"."userId"

   ${loanExceptionStr}

	 GROUP BY 
	 lt."accId", lt."id", lt."netApprovedAmount", lt."loan_disbursement_date", lt."interestRate", lt."approvedDuration", lt."loanCompletionDate", lt."Loss_assets",
   "e1"."emi_date", "e2"."emi_date", "e3"."emi_date", "e4"."emi_date", 
	 "e1"."payment_due_status",  "e2"."payment_due_status",  "e3"."payment_due_status",  "e4"."payment_due_status",
	 "e1"."payment_status",  "e2"."payment_status",  "e3"."payment_status",  "e4"."payment_status",
	 "e1"."payment_done_date",  "e2"."payment_done_date",  "e3"."payment_done_date",  "e4"."payment_done_date",
	 "e1"."principalCovered", "e2"."principalCovered", "e3"."principalCovered", "e4"."principalCovered",
	 "e1"."interestCalculate", "e2"."interestCalculate", "e3"."interestCalculate", "e4"."interestCalculate",
   "user"."fullName", "e1"."id", "e2"."id", "e3"."id", "e4"."id",
   "e1"."fullPayPrincipal", "e2"."fullPayPrincipal", "e3"."fullPayPrincipal", "e4"."fullPayPrincipal",
   "e1"."fullPayInterest", "e2"."fullPayInterest", "e3"."fullPayInterest", "e4"."fullPayInterest",
   "e1"."pay_type", "e2"."pay_type", "e3"."pay_type", "e4"."pay_type"

-- Filter based on MAX DPD
    HAVING GREATEST(${emi1DPDCase}, ${emi2DPDCase}, ${emi3DPDCase}, ${emi3DPDCase}) > 90`;

    const outputList = await this.repoManager.injectRawQuery(
      EmiEntity,
      rawQuery,
    );
    if (outputList == k500Error) throw new Error();
    else return outputList;
  }

  private dynamicQuery(targetStr, key) {
    return targetStr.replace(/_Z_/g, key);
  }

  private singleToEmiArray(loanData) {
    const emiList = [];

    for (let index = 0; index < 4; index++) {
      const number = index + 1;
      const emi_date = loanData[`emi_${number}_date`];
      if (!emi_date) break;

      const principalCovered = loanData[`emi_${number}_principal`];
      const interestCalculate = loanData[`emi_${number}_interest`];
      const penalty_days = loanData[`emi_${number}_dpd`];
      const id = loanData[`emi_${number}_id`];
      const payment_done_date = loanData[`emi_${number}_paid_date`];
      const pay_type = loanData[`pay_${number}_type`];
      const fullPayPrincipal = loanData[`pay_${number}_type`];
      const fullPayInterest = loanData[`pay_${number}_type`];

      emiList.push({
        emiNumber: number,
        emi_date,
        fullPayInterest,
        fullPayPrincipal,
        payment_done_date,
        id,
        interestCalculate,
        pay_type,
        penalty_days,
        principalCovered,
      });
    }

    return emiList;
  }
  //#endregion -> API (reversalOfPI)

  //#region
  async paymentAfterReversal(reqData): Promise<any> {
    // We need all the payment get done after targetDate
    let targetDate = reqData.targetDate;
    if (!targetDate) return kParamMissing('targetDate');
    targetDate = this.typeService.getGlobalDate(new Date(targetDate)).toJSON();
    const mode = reqData.mode;
    if (!mode) return kParamMissing('mode');
    if (!['REGULAR', 'SETTLED'].includes(mode))
      return kInvalidParamValue('mode');
    const isDownload = reqData.download == 'true';

    const targetList = await this.getDataForPaymentAfterReversal(targetDate);
    let loanIds = targetList.map((el) => el.loanId);
    if ((reqData.loanIds ?? []).length != 0) {
      loanIds = loanIds.filter((el) => reqData.loanIds.includes(el));
    }

    // Find out payments done after targetDate
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = this.typeService.getGlobalDate(new Date());

    let targetData;
    if (mode == 'REGULAR') {
      targetData = await this.tallyRepayment({
        startDate: startDate.toJSON(),
        endDate: endDate.toJSON(),
        loanIds,
        mode,
      });
    } else if (mode == 'SETTLED') {
      targetData = await this.tallyRepayment({
        startDate: startDate.toJSON(),
        endDate: endDate.toJSON(),
        loanIds,
        mode,
      });
    }

    const targetInterestKeys = [
      'emiInterest1',
      'emiInterest2',
      'emiInterest3',
      'emiInterest4',
      'Foreclosure Emi 1 interest',
      'Foreclosure Emi 2 interest',
      'Foreclosure Emi 3 interest',
      'Foreclosure Emi 4 interest',
    ];
    const targetPrincipalKeys = [
      'emiPrincipal1',
      'emiPrincipal2',
      'emiPrincipal3',
      'emiPrincipal4',
    ];

    const finalizedList = [];
    for (let index = 0; index < targetData.rows.length; index++) {
      const paymentData = targetData.rows[index];
      const dpdData = targetList.find((el) => el.loanId == paymentData.loanId);
      const type = dpdData.max_dpd > 180 ? 'PRINCIPAL' : 'INTEREST';

      if (type == 'INTEREST') {
        let isIntReceived = false;
        for (let index = 0; index < targetInterestKeys.length; index++) {
          const key = targetInterestKeys[index];
          const amt = isNaN(+(paymentData[key] ?? 0))
            ? 0
            : +(paymentData[key] ?? 0);
          if (amt > 0) {
            isIntReceived = true;
            break;
          }
        }
        if (!isIntReceived) continue;
      } else if (type == 'PRINCIPAL') {
        let isPrincipalReceived = false;
        for (let index = 0; index < targetPrincipalKeys.length; index++) {
          const key = targetPrincipalKeys[index];
          const amt = isNaN(+(paymentData[key] ?? 0))
            ? 0
            : +(paymentData[key] ?? 0);
          if (amt > 0) {
            isPrincipalReceived = true;
            break;
          }
        }
        if (!isPrincipalReceived) continue;
      }

      finalizedList.push(paymentData);
    }

    if (isDownload) {
      const principalData = {
        sheets: ['Payments'],
        data: [finalizedList],
        sheetName: 'Payments.xlsx',
      };
      const fileUrl = await this.fileService.objectToExcelURL(principalData);
      if (fileUrl?.message) throw new Error();
      return fileUrl;
    }

    return { count: finalizedList.length, rows: finalizedList };
  }

  private async getDataForPaymentAfterReversal(targetDate) {
    const emiWiseDPD = `CASE WHEN "_Z_"."emi_date" >= '${targetDate}' OR "_Z_"."payment_due_status" = '0' THEN 0
            WHEN "_Z_"."payment_status" = '0' THEN TO_DATE('${targetDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("_Z_"."emi_date", 'YYYY-MM-DDTHH24:MI:SS')
            WHEN "_Z_"."payment_done_date" > '${targetDate}' THEN TO_DATE('${targetDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("_Z_"."emi_date", 'YYYY-MM-DDTHH24:MI:SS') 
       END`;
    const emi1DPDCase = this.dynamicQuery(emiWiseDPD, 'e1');
    const emi2DPDCase = this.dynamicQuery(emiWiseDPD, 'e2');
    const emi3DPDCase = this.dynamicQuery(emiWiseDPD, 'e3');
    const emi4DPDCase = this.dynamicQuery(emiWiseDPD, 'e4');

    const rawQuery = `SELECT lt."id" AS "loanId",
     "e1"."id" AS "emi_1_id", "e2"."id" AS "emi_2_id", "e3"."id" AS "emi_3_id", "e4"."id" AS "emi_4_id",
	 
-- 	 DPD Days EMI wise
     ${emi1DPDCase} AS "emi_1_dpd", ${emi2DPDCase} AS "emi_2_dpd", ${emi3DPDCase} AS "emi_3_dpd", ${emi4DPDCase} AS "emi_4_dpd",
	 
--      Max DPD among all 4 EMIS
    GREATEST(${emi1DPDCase}, ${emi2DPDCase}, ${emi3DPDCase}, ${emi4DPDCase}) AS "max_dpd"
	  
    FROM public."loanTransactions" AS "lt"

-- Join all 4 EMIs (Loan wise record)
   LEFT JOIN "EmiEntities" AS "e1" ON "e1"."loanId" = "lt"."id" AND "e1"."emiNumber" = 1
   LEFT JOIN "EmiEntities" AS "e2" ON "e2"."loanId" = "lt"."id" AND "e2"."emiNumber" = 2
   LEFT JOIN "EmiEntities" AS "e3" ON "e3"."loanId" = "lt"."id" AND "e3"."emiNumber" = 3
   LEFT JOIN "EmiEntities" AS "e4" ON "e4"."loanId" = "lt"."id" AND "e4"."emiNumber" = 4

	 GROUP BY lt."id", "e1"."id", "e2"."id", "e3"."id", "e4"."id"

-- Filter based on MAX DPD
    HAVING GREATEST(${emi1DPDCase}, ${emi2DPDCase}, ${emi3DPDCase}, ${emi3DPDCase}) > 90`;

    const outputList = await this.repoManager.injectRawQuery(
      EmiEntity,
      rawQuery,
    );
    if (outputList == k500Error) throw new Error();
    else return outputList;
  }

  async allEmiReportData(body) {
    const startDate = body.startDate;
    const endDate = body.endDate;
    const isDownload: any = body?.download == 'true' ? true : false;
    const downloadId = body?.downloadId;

    const page = !isDownload ? +body.page || 1 : 1;
    const offset = !isDownload ? page * PAGE_LIMIT - PAGE_LIMIT : 0;

    const disbInclude = {
      model: disbursementEntity,
      attributes: ['loanId', [literal('"amount" / 100'), 'DisbursedAmount']],
    };

    const lonaInclude = {
      model: loanTransaction,
      attributes: [
        'netApprovedAmount',
        'loan_disbursement_date',
        'appType',
        [
          literal(
            '("loan"."netApprovedAmount"::NUMERIC * "loan"."processingFees"::NUMERIC) / 100',
          ),
          'processingFees',
        ],
      ],
      include: [disbInclude],
    };

    const attr: any = [
      'emi_date',
      'penalty_days',
      'emiNumber',
      'loanId',
      'emi_amount',
      'paid_interest',
      'paid_principal',
      'principalCovered',
      'interestCalculate',
      [
        literal(
          'COALESCE("EmiEntity"."paidRegInterestAmount", 0) + ' +
            'COALESCE("EmiEntity"."paidBounceCharge", 0) + ' +
            'COALESCE("EmiEntity"."paidPenalCharge", 0) + ' +
            'COALESCE("EmiEntity"."paidLegalCharge", 0) + ' +
            'COALESCE("EmiEntity"."paid_penalty", 0) + ' +
            'COALESCE("EmiEntity"."forClosureAmount", 0) + ' +
            'COALESCE("EmiEntity"."sgstForClosureCharge", 0) + ' +
            'COALESCE("EmiEntity"."cgstForClosureCharge", 0)',
        ),
        'penaltyPaidAmount',
      ],
    ];

    let option = {
      where: {
        emi_date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      attributes: attr,
      limit: !isDownload ? PAGE_LIMIT : undefined,
      offset: !isDownload ? offset : undefined,
      include: [lonaInclude],
    };

    let prepareData = [];
    const result = await this.emiRepo.getTableWhereDataWithCounts(attr, option);
    if (result == k500Error) throw new Error();
    for (let i = 0; i < result.rows.length; i++) {
      let newObj = {};
      let data = result.rows[i];
      newObj['Loan ID'] = data?.loanId ?? '-';
      newObj['Loan Platform'] =
        data?.loan?.appType == '1'
          ? EnvConfig.nbfc.nbfcShortName
          : EnvConfig.nbfc.appName;
      newObj['Approved Amount'] = data?.loan?.netApprovedAmount ?? '-';
      newObj['Disbursed Amount'] =
        data?.loan?.disbursementData[0]?.DisbursedAmount ?? '-';
      newObj['Processing fees'] =
        parseFloat(data?.loan?.processingFees).toFixed() ?? '-';
      newObj['Disbursement date'] =
        this.typeService.getDateFormated(data?.loan?.loan_disbursement_date) ??
        '-';
      newObj['EMI Due date'] =
        this.typeService.getDateFormated(data?.emi_date) ?? '-';
      newObj['EMI Number'] = data?.emiNumber ?? '-';
      newObj['Due EMI Amount'] =
        data?.interestCalculate + data?.principalCovered ?? '-';
      newObj['Due Principal Amount'] = data?.principalCovered ?? '-';
      newObj['Due Interest Amount'] = data?.interestCalculate ?? '-';
      newObj['Total Paid'] =
        +data?.paid_principal + +data?.paid_interest ?? '-';
      newObj['Principal Amount Paid'] = data?.paid_principal.toFixed() ?? '-';
      newObj['Interest Amount Paid'] = data?.paid_interest.toFixed() ?? '-';
      newObj['Penalty Paid Amount'] = data?.penaltyPaidAmount.toFixed() ?? '-';
      newObj['Delay days'] = data?.penalty_days ?? '-';
      prepareData.push(newObj);
    }

    if (isDownload == true) {
      const rawExcelData = {
        sheets: ['Due Vs Collection'],
        data: [prepareData],
        sheetName: 'Due Vs Collection.xlsx',
        needFindTuneKey: false,
      };
      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;

      const updatedData = { downloadUrl: url, status: '1' };
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileUrl: url };
    }
    return { rows: prepareData, count: result.count };
  }

  async cronAssetClassification(reqData) {
    let toDate: any = new Date();
    toDate.setDate(toDate.getDate() - 1);
    if (reqData?.startDate) {
      toDate = reqData.startDate;
    }
    let date = await this.typeService.getGlobalDate(toDate).toISOString(); // Format to YYYY-MM-DDTHH:MM:SS

    const bodyForCount = {
      endDate: date,
      isRowData: false,
      download: false,
      stage: 'SMA-ALL',
    };
    const SMA_ALL = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SMA-ALL',
    };
    const upcoming = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'UPCOMING',
    };
    const SMA_0 = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SMA-0',
    };
    const SMA_1 = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SMA-1',
    };
    const SMA_2 = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SMA-2',
    };
    const Standard_Asset = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SA',
    };
    const NPA_90_to_180 = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'NPA-1',
    };
    const NPA_181_to_365 = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'NPA-2',
    };
    const SubStandard_Asset = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'SSA',
    };
    const Loss_Asset = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'LA',
    };
    const Doubtful_Asset = {
      endDate: date,
      isRowData: true,
      download: true,
      stage: 'DA',
    };

    const [
      total_count,
      data_SMA_ALL,
      data_SMA_0,
      data_SMA_1,
      data_SMA_2,
      data_Standard_Asset,
      data_NPA_90_to_180,
      data_NPA_181_to_365,
      data_SubStandard_Asset,
      data_Loss_Asset,
      data_Doubtful_Asset,
      data_upcoming,
    ] = await Promise.all([
      this.newOutStandingReport(bodyForCount),
      this.newOutStandingReport(SMA_ALL),
      this.newOutStandingReport(SMA_0),
      this.newOutStandingReport(SMA_1),
      this.newOutStandingReport(SMA_2),
      this.newOutStandingReport(Standard_Asset),
      this.newOutStandingReport(NPA_90_to_180),
      this.newOutStandingReport(NPA_181_to_365),
      this.newOutStandingReport(SubStandard_Asset),
      this.newOutStandingReport(Loss_Asset),
      this.newOutStandingReport(Doubtful_Asset),
      this.newOutStandingReport(upcoming),
    ]);

    const result = await this.repoManager.findOrCreate(
      assetsClassification,
      { date: date },
      {
        date: date,
        count: total_count,
        SMA_ALL: data_SMA_ALL.fileUrl,
        SMA_0: data_SMA_0.fileUrl,
        SMA_1: data_SMA_1.fileUrl,
        SMA_2: data_SMA_2.fileUrl,
        Standard_Asset: data_Standard_Asset.fileUrl,
        NPA_90_to_180: data_NPA_90_to_180.fileUrl,
        NPA_181_to_365: data_NPA_181_to_365.fileUrl,
        SubStandard_Asset: data_SubStandard_Asset.fileUrl,
        Loss_Asset: data_Loss_Asset.fileUrl,
        Doubtful_Asset: data_Doubtful_Asset.fileUrl,
        upcoming: data_upcoming.fileUrl,
      }, // Data to create if not found
    );

    return true;
  }

  async excelOutStandingDatafetch(query) {
    // this report is done on basis of loan
    let endDate = query?.endDate;
    if (!endDate) endDate = new Date();

    const isRowData = query?.isRowData ?? false;
    const download = query?.download ?? false;
    const stage = query?.stage;
    if (!stage) return kParamMissing('stage');
    const toDate = await this.typeService.getGlobalDate(endDate).toISOString(); // Format to YYYY-MM-DDTHH:MM:SS

    const page = query?.page || 1;
    const startIndex = page * PAGE_LIMIT - PAGE_LIMIT;
    const endIndex = startIndex + PAGE_LIMIT;
    const searchText = query?.search;

    const savedData = await this.repoManager.getRowWhereData(
      assetsClassification,
      [
        'count',
        'SMA_ALL',
        'SMA_0',
        'SMA_1',
        'SMA_2',
        'Standard_Asset',
        'NPA_90_to_180',
        'NPA_181_to_365',
        'SubStandard_Asset',
        'Loss_Asset',
        'Doubtful_Asset',
        'upcoming',
      ],
      { where: { date: toDate } },
    );
    if (savedData) {
      let data;
      let finalResponse: any;
      const localPath = './upload/sma';

      if (stage == 'SMA-ALL') {
        if (isRowData == true && download == false) {
          data = savedData?.SMA_ALL;

          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;
          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == false && download == false) {
          data = savedData?.count;
          return data;
        } else if (isRowData == true && download == true) {
          data = savedData?.SMA_ALL;
          return { fileUrl: data };
        }
      } else if (stage == 'SMA-0') {
        if (isRowData == true && download == false) {
          data = savedData?.SMA_0;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.SMA_0;
          return { fileUrl: data };
        }
      } else if (stage == 'SMA-1') {
        if (isRowData == true && download == false) {
          data = savedData?.SMA_1;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.SMA_1;
          return { fileUrl: data };
        }
      } else if (stage == 'UPCOMING') {
        if (isRowData == true && download == false) {
          data = savedData?.upcoming;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.upcoming;
          return { fileUrl: data };
        }
      } else if (stage == 'SMA-2') {
        if (isRowData == true && download == false) {
          data = savedData?.SMA_2;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.SMA_2;
          return { fileUrl: data };
        }
      } else if (stage == 'SA') {
        if (isRowData == true && download == false) {
          data = savedData?.Standard_Asset;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.Standard_Asset;
          return { fileUrl: data };
        }
      } else if (stage == 'SSA') {
        if (isRowData == true && download == false) {
          data = savedData?.SubStandard_Asset;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.SubStandard_Asset;
          return { fileUrl: data };
        }
      } else if (stage == 'NPA-1') {
        if (isRowData == true && download == false) {
          data = savedData?.NPA_90_to_180;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.NPA_90_to_180;
          return { fileUrl: data };
        }
      } else if (stage == 'NPA-2') {
        if (isRowData == true && download == false) {
          data = savedData?.NPA_181_to_365;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          let responseData = finalData.slice(startIndex, endIndex);
          responseData = await this.liveMovedData(responseData);

          finalResponse = {
            count: finalData.length,
            rows: responseData,
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.NPA_181_to_365;
          return { fileUrl: data };
        }
      } else if (stage == 'DA') {
        if (isRowData == true && download == false) {
          data = savedData?.Doubtful_Asset;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.Doubtful_Asset;
          return { fileUrl: data };
        }
      } else if (stage == 'LA') {
        if (isRowData == true && download == false) {
          data = savedData?.Loss_Asset;
          const finalData = await this.processExcelData(
            data,
            searchText,
            localPath,
          );
          if (finalData?.message) return finalData;

          finalResponse = {
            count: finalData.length,
            rows: finalData.slice(startIndex, endIndex),
          };
        } else if (isRowData == true && download == true) {
          data = savedData?.Loss_Asset;
          return { fileUrl: data };
        }
      }
      return finalResponse;
    } else {
      let data = await this.newOutStandingReport(query);
      if (stage == 'NPA-2' && isRowData == true) {
        const rows = await this.liveMovedData(data?.rows);
        data.rows = rows;
      }
      return data;
    }
  }

  async liveMovedData(responseData) {
    const loanIds = responseData.map((ele) => ele['Loan ID']);
    const options = {
      order: [['id', 'DESC']],
      where: { id: loanIds },
    };
    const loanAssets = await this.loanRepo.getTableWhereData(
      ['id', 'Loss_assets', 'loanCompletionDate'],
      options,
    );

    const loanAssetsMap = new Map();
    loanAssets.forEach((asset) => {
      let value =
        asset.loanCompletionDate !== null
          ? asset.loanCompletionDate
          : asset.Loss_assets;
      if (value != null) {
        const date = this.dateService.dateToReadableFormat(value, 'DD-MM-YYYY');
        const readDate = date.readableStr;
        value =
          asset.loanCompletionDate !== null
            ? `Loan is completed on ${readDate}`
            : `Loan Moved to Loss Assets on ${readDate}`;
      }
      loanAssetsMap.set(asset.id, value);
    });

    responseData.forEach((item) => {
      item['Loss_assets'] = loanAssetsMap.get(item['Loan ID']) || null;
    });
    return responseData;
  }

  async processExcelData(data, searchText, localPath) {
    const smaData = await this.fileService.downloadAndReadExcel(
      data,
      localPath,
    );
    let excelData: any = await this.fileService.excelToArray(
      smaData,
      {},
      false,
      true,
    );
    if (excelData?.message) return excelData;

    if (searchText) {
      const searchData: any = this.common.getSearchData(searchText);
      if (searchData?.message) return searchData;

      if (searchData.text !== '' && searchData.type === 'Name') {
        excelData = excelData.filter((item) =>
          item['Borrower Name']
            ?.toLowerCase()
            .includes(searchData.text.toLowerCase()),
        );
      } else if (searchData.text !== '' && searchData.type === 'LoanId') {
        excelData = excelData.filter((item) =>
          item['Loan ID'].toString().includes(searchData.text),
        );
      }
    }
    if (fs.existsSync(smaData)) {
      fs.unlinkSync(smaData);
    }
    return excelData;
  }

  async newOutStandingReport(query) {
    // this report is done on basis of loan
    let endDate = query?.endDate;
    if (!endDate) endDate = new Date();

    const isRowData = query?.isRowData ?? false;
    const download = query?.download ?? false;
    const downloadId = query?.downloadId ?? '0';
    const stage = query?.stage;
    if (!stage) return kParamMissing('stage');
    const searchText = query?.search;
    const multipleLoanIds = query?.loanIds ?? [];
    let search = '';

    const toDate = await this.typeService.getGlobalDate(endDate).toISOString(); // Format to YYYY-MM-DDTHH:MM:SS

    const range = {
      'SMA-0': 'BETWEEN 1 AND 90',
      'SMA-1': 'BETWEEN 1 AND 90',
      'SMA-2': 'BETWEEN 1 AND 90',
      UPCOMING: `BETWEEN 0 AND 90`,
      SA: 'BETWEEN 0 AND 90',
      SSA: `BETWEEN 91 AND 365 AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" > '${toDate}')`,
      'NPA-1': 'BETWEEN 91 AND 180',
      'NPA-2': `BETWEEN 181 AND 365 AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" > '${toDate}')`,
      DA: `>365  AND (lt."Loss_assets" IS NULL OR lt."Loss_assets" > '${toDate}')`,
      LA: `>180 AND lt."Loss_assets" <= '${toDate}'`,
      'SMA-ALL': '>= 0',
    };

    const SMA = range[query?.stage];
    let limitquery = '';
    if (isRowData == true && download == false) {
      const page = query.page || 1;
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const limit = PAGE_LIMIT;
      limitquery = `offset ${offset} limit ${limit}`;
    }

    if (multipleLoanIds.length > 0) {
      search = `lt."id" IN (${multipleLoanIds.join(',')}) AND`;
    } else if (searchText) {
      const searchData: any = this.common.getSearchData(searchText);
      if (searchData?.message) return searchData;

      if (searchData.text != '' && searchData.type == 'Name') {
        search = `ru."fullName" ILIKE '%${searchData.text}%' AND`;
      } // Search by user's phone number
      else if (searchData.text != '' && searchData.type == 'LoanId') {
        search = `lt."id" = ${parseInt(searchData.text)} AND`;
      } else if (searchData.type == 'Number') {
        return { count: '0', rows: [] };
      }
    }

    const delayDaysCase = `
    CASE
    WHEN "payment_due_status" = '0' THEN 0
    WHEN "emi_date" >= '${toDate}' THEN 0
    WHEN "payment_status" = '0' THEN
      TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
    WHEN "payment_status" = '1' AND "payment_done_date" > '${toDate}' THEN
      TO_DATE('${toDate}', 'YYYY-MM-DDTHH24:MI:SS') - TO_DATE("emi_date", 'YYYY-MM-DDTHH24:MI:SS')
    WHEN "payment_status" = '1' AND "payment_done_date" <= '${toDate}' THEN
   0
END
`;
    //by this query we will get all loanIDs
    const dynamicQuery = `SELECT 
    lt."id" 
    FROM public."loanTransactions" as lt
    JOIN
    public."registeredUsers" AS ru
    ON
    lt."userId" = ru."id"
    WHERE 
    ${search}
    "loan_disbursement_date" <= '${toDate}' 
     `;

    // const targetedLoanIds = await this.emiRepo.injectRawQuery(dynamicQuery);
    const targetedLoanIds = await this.repoManager.injectRawQuery(
      loanTransaction,
      dynamicQuery,
    );
    if (targetedLoanIds === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    let loanIds = targetedLoanIds
      .filter((el) => el?.id !== null && el?.id !== undefined)
      .map((el) => el.id);

    if (loanIds.length == 0) return { count: '0', rows: loanIds };
    //we will filter required data as per our requirement using query2

    let filter = '';
    let filterDays = '';
    const filterRange = {
      'SMA-0': 'BETWEEN 1 AND 30',
      'SMA-1': 'BETWEEN 31 AND 60',
      'SMA-2': 'BETWEEN 61 AND 90',
      UPCOMING: `= 0 AND e."emi_date" >= '${toDate}'`,
    };

    filter = filterRange[query?.stage];

    if (filter) {
      filterDays = `FILTER (WHERE ${delayDaysCase} ${filter})`;
    }
    //limit query is used here
    const dynamicQuery2 = ` 
   SELECT
     e."loanId" ,
     ru."fullName",
     ru."categoryScore" ,
     ru."uniqueId",
     ru."id",
     lt."netApprovedAmount",
     lt."loan_disbursement_date",
     lt."interestRate",
     lt."approvedDuration",
     lt."loanCompletionDate",
     lt."Loss_assets",
    PGP_SYM_DECRYPT(CAST(kyc."panCardNumber" AS BYTEA), '${kCryptography}') AS "PAN",
     esign."updatedAt",
     MAX(
     ${delayDaysCase}
     ) AS "Max Delay Days",
     json_agg(json_build_object(
       'payment_status', e."payment_status",
       'emiId', e."id",
       'EMI DATE', e."emi_date",
       'payment done date', e."payment_done_date",
       'payment due status', e."payment_due_status",
       'EMI principal amount', e."principalCovered",
       'EMI interest amount', e."interestCalculate",
       'Paid Interest', e."paid_interest",
       'As on delay days', ${delayDaysCase}
     )) ${filterDays} AS emiData
   FROM
     public."EmiEntities" AS e
   JOIN
     public."registeredUsers" AS ru
   ON
     e."userId" = ru."id"
   JOIN
     public."loanTransactions" AS lt
   ON
     e."loanId" = lt."id"
   JOIN
     public."KYCEntities" AS kyc
   ON
     ru."kycId" = kyc."id"
   LEFT JOIN
     public."esignEntities" AS esign
   ON
     e."loanId" = esign."loanId"
   WHERE
   e."loanId" IN (${loanIds.join(',')})
   GROUP BY
     e."loanId", e."userId", ru."fullName",  ru."categoryScore", lt."netApprovedAmount",
     lt."loan_disbursement_date", lt."interestRate",lt."Loss_assets",lt."approvedDuration", ru."id", ru."uniqueId", PGP_SYM_DECRYPT(CAST(kyc."panCardNumber" AS BYTEA), '${kCryptography}'),
     esign."updatedAt", lt."loanCompletionDate"
       HAVING
     MAX(
       ${delayDaysCase} 
      ) ${SMA}
        AND
        json_agg(json_build_object(
       'payment_status', e."payment_status",
       'emiId', e."id",
       'EMI DATE', e."emi_date",
       'payment done date', e."payment_done_date",
       'payment due status', e."payment_due_status",
       'EMI principal amount', e."principalCovered",
       'EMI interest amount', e."interestCalculate",
       'Paid Interest', e."paid_interest",
       'As on delay days', ${delayDaysCase}
     )) ${filterDays} IS NOT NULL
      ${limitquery};
      `;

    // this query will get the total counnt of the data
    const count = `
WITH main_query AS (
  SELECT
    e."loanId",
    lt."Loss_assets",
    MAX(
      ${delayDaysCase}
    ) AS "Max Delay Days",
       json_agg(json_build_object(
       'payment_status', e."payment_status",
       'emiId', e."id",
       'EMI DATE', e."emi_date",
       'payment done date', e."payment_done_date",
       'payment due status', e."payment_due_status",
       'EMI principal amount', e."principalCovered",
       'EMI interest amount', e."interestCalculate",
       'Paid Interest', e."paid_interest",
       'As on delay days', ${delayDaysCase}
     )) ${filterDays} AS emiData
  FROM
    public."EmiEntities" AS e
    JOIN
    public."loanTransactions" AS lt
  ON
    e."loanId" = lt."id"
  WHERE 
    e."loanId" IN (${loanIds.join(',')})
  GROUP BY
    e."loanId", lt."Loss_assets"
  HAVING
    MAX(
      ${delayDaysCase}
    ) ${SMA}
      AND
        json_agg(json_build_object(
       'payment_status', e."payment_status",
       'emiId', e."id",
       'EMI DATE', e."emi_date",
       'payment done date', e."payment_done_date",
       'payment due status', e."payment_due_status",
       'EMI principal amount', e."principalCovered",
       'EMI interest amount', e."interestCalculate",
       'Paid Interest', e."paid_interest",
       'As on delay days', ${delayDaysCase}
     )) ${filterDays} IS NOT NULL
)
SELECT COUNT(*)
FROM main_query;
`;

    const [total_count, emiData] = await Promise.all([
      this.emiRepo.injectRawQuery(count),
      this.emiRepo.injectRawQuery(dynamicQuery2),
    ]);
    if (total_count == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (emiData == k500Error) throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    //For pagination here we will take data only the loanIds we will be having data
    let targetLoanIds = emiData.map((el) => el['loanId']);

    //Will Fetch Transactions of only required LoanIds
    const dynamicQuery3 = `
    SELECT
    "loanId",
    jsonb_agg(
            jsonb_build_object('Transaction amount', "paidAmount", 
            'status', "status",
            'Principal Amount',"principalAmount",
            'Interest Amount',"interestAmount",
            'completionDate', "completionDate",
            'type', "type",
            'loanId', "loanId",
            'emiId', "emiId")
          ) AS "Amounts"
          
          FROM
          public."TransactionEntities"
          WHERE
          "loanId" IN (${targetLoanIds.join(
            ',',
          )})  AND "status" = 'COMPLETED' AND "completionDate" <= '${toDate}'
        GROUP BY "loanId";
        `;

    let transactions: any = [];
    if (targetLoanIds.length > 0) {
      transactions = await this.repoManager.injectRawQuery(
        TransactionEntity,
        dynamicQuery3,
      );
    }
    if (transactions === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    //Static JSON for required Headers
    const loanDataPrepare = {
      'Loan ID': '-',
      PAN: '-',
      'Unique Customer ID': '-',
      'Borrower Name': '-',
      'Risk Categorization': '-',
      'Sanctioned Amount': '-',
      'Sanctioned Date': '-',
      'Approved IRR': 0,
      'Tenure in Months': 0,
      'Disbursed Date': '-',
      'Closure Date': '-',
      'Days Past Due as on': 0,
      'Maximum Delay Days': 0,
      'Date of NPA': '-',
      'Asset Classification': '-',
      'Sub-Asset Category': '-',
      'IRACP Provisions as on': '-',
      'Outstanding Amount as on selected Date': 0,
      'Outstanding Amount as on Previous FY 31st March': 0,
      UserId: '-',
    };

    const assetCategories = {
      SA: { percentage: 0.004, title: 'Standard Assets' },
      SSA: { percentage: 0.1, title: 'Sub-Standard Assets' },
      DA: { percentage: 0.2, title: 'Doubtful Assets' },
      LA: { percentage: 1.0, title: 'Loss Assets' },
    };

    function getAssetCategory(delayDays, Loss_assets) {
      if (delayDays >= 0 && delayDays <= 90) {
        return assetCategories['SA'];
      } else if (delayDays > 90 && delayDays <= 180) {
        return assetCategories['SSA'];
      } else if (
        delayDays > 180 &&
        delayDays <= 365 &&
        (Loss_assets == null || Loss_assets > toDate)
      ) {
        return assetCategories['SSA'];
      } else if (
        delayDays > 365 &&
        (Loss_assets == null || Loss_assets > toDate)
      ) {
        return assetCategories['DA'];
      } else if (delayDays > 180 && Loss_assets <= toDate) {
        return assetCategories['LA'];
      }
    }

    const countArr: any = [
      {
        'Delay days': '1 to 30',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '31 to 60',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '61 to 90',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': 'Upcoming',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '0 to 90',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '91 to 180',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '180+',
        'User count': 0,
        Amount: 0,
      },
      {
        'Delay days': '91 to 365',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '180+ LA',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
      {
        'Delay days': '365+',
        'User count': 0,
        Amount: 0,
        provision: 0,
      },
    ];

    const upcomingUsers = [];
    const SMA0 = [];
    const SMA1 = [];
    const SMA2 = [];
    const SA = [];

    const loanData = emiData.map((emi) => {
      const result: any = { ...loanDataPrepare };
      result['Loan ID'] = emi['loanId'];
      result['PAN'] = emi['PAN'];
      result['Unique Customer ID'] = emi['uniqueId'];
      result['UserId'] = emi['id'];
      if (emi['loan_disbursement_date'])
        result['Disbursed Date'] = this.dateService.dateToReadableFormat(
          emi['loan_disbursement_date'],
          'DD-MM-YYYY',
        ).readableStr;
      result['Risk Categorization'] = emi['categoryScore'];
      result['Borrower Name'] = emi['fullName'];
      result['Approved IRR'] = (parseFloat(emi['interestRate']) * 365).toFixed(
        2,
      );
      result['Days Past Due as on'] = emi['Max Delay Days'];
      result['Maximum Delay Days'] = emi['Max Delay Days'];
      result['Tenure in Months'] = (emi['approvedDuration'] / 30).toFixed(2);
      result['Sanctioned Date'] = emi['updatedAt']
        ? this.dateService.dateToReadableFormat(emi['updatedAt'], 'DD-MM-YYYY')
            .readableStr
        : this.dateService.dateToReadableFormat(
            emi['loan_disbursement_date'],
            'DD-MM-YYYY',
          ).readableStr;
      result['Sanctioned Amount'] = emi['netApprovedAmount'];
      if (emi['Loss_assets'])
        result['Date of NPA'] = this.dateService.dateToReadableFormat(
          emi['Loss_assets'],
          'DD-MM-YYYY',
        ).readableStr;

      if (emi['loanCompletionDate'])
        result['Closure Date'] = this.dateService.dateToReadableFormat(
          emi['loanCompletionDate'],
          'DD-MM-YYYY',
        ).readableStr;
      const asset = getAssetCategory(emi['Max Delay Days'], emi['Loss_assets']);
      result['Asset Classification'] = asset?.title ?? '-';

      const correspondingtransaction = transactions.find(
        (transaction) => transaction.loanId === emi['loanId'],
      );
      let outstandingAmount = 0;
      let loanOutstandingAmount = 0;
      if (correspondingtransaction) {
        // Check if any of the amounts are of type 'FULLPAY'
        const fullPayUser = correspondingtransaction.Amounts.some(
          (amount) => amount.type === 'FULLPAY',
        );
        if (fullPayUser) {
          loanOutstandingAmount = 0;
        } else {
          emi.emidata.forEach((emiItem) => {
            if (
              emiItem['payment_status'] == '1' &&
              emiItem['payment done date'] <= toDate
            ) {
              outstandingAmount = 0;
            } else if (emiItem['EMI DATE'] > toDate) {
              outstandingAmount = emiItem['EMI principal amount'];
              if (isRowData != true) {
                if (!upcomingUsers.includes(emi['loanId']))
                  upcomingUsers.push(emi['loanId']);
                countArr[3]['Amount'] += outstandingAmount;
                if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
                countArr[4]['Amount'] += outstandingAmount;
              }
            } else {
              const matchingAmounts = correspondingtransaction.Amounts.filter(
                (amount) => amount.emiId === emiItem['emiId'],
              );

              if (matchingAmounts.length > 0) {
                let partPayAmount = 0;
                let totalInterestPaid = 0;
                matchingAmounts.forEach((matchingAmount) => {
                  // Further processing for each matching amount
                  if (
                    matchingAmount.type === 'PARTPAY' ||
                    matchingAmount.type === 'EMIPAY'
                  ) {
                    partPayAmount +=
                      matchingAmount['Principal Amount'] +
                      matchingAmount['Interest Amount'];
                  }

                  if (matchingAmount.type === 'REFUND') {
                    partPayAmount =
                      partPayAmount -
                      Math.abs(matchingAmount['Transaction amount']);
                  }
                  totalInterestPaid += matchingAmount['Interest Amount'];
                });

                if (
                  (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
                  emiItem['EMI DATE'] == toDate
                ) {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'] -
                    partPayAmount;
                }
                // for delay days > 90
                else {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'] -
                    partPayAmount -
                    (emiItem['EMI interest amount'] - totalInterestPaid);
                }
              } else {
                if (
                  (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
                  emiItem['EMI DATE'] == toDate
                ) {
                  outstandingAmount =
                    emiItem['EMI principal amount'] +
                    emiItem['EMI interest amount'];
                } else {
                  outstandingAmount = emiItem['EMI principal amount'];
                }
              }
            }
            emiItem['OutStanding EMI Amount'] = outstandingAmount;
            loanOutstandingAmount += emiItem['OutStanding EMI Amount'];

            if (emi['Max Delay Days'] <= 90 && isRowData != true) {
              if (
                emiItem['As on delay days'] > 0 &&
                emiItem['As on delay days'] <= 30
              ) {
                if (!SMA0.includes(emi['loanId'])) SMA0.push(emi['loanId']);
                countArr[0]['Amount'] += outstandingAmount;
                if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
                countArr[4]['Amount'] += outstandingAmount;
              } else if (
                emiItem['As on delay days'] > 30 &&
                emiItem['As on delay days'] <= 60
              ) {
                if (!SMA1.includes(emi['loanId'])) SMA1.push(emi['loanId']);
                countArr[1]['Amount'] += outstandingAmount;
                if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
                countArr[4]['Amount'] += outstandingAmount;
              } else if (
                emiItem['As on delay days'] > 60 &&
                emiItem['As on delay days'] <= 90
              ) {
                if (!SMA2.includes(emi['loanId'])) SMA2.push(emi['loanId']);
                countArr[2]['Amount'] += outstandingAmount;
                if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
                countArr[4]['Amount'] += outstandingAmount;
              } else if (
                emiItem['As on delay days'] == 0 &&
                emiItem['EMI DATE'] == toDate
              ) {
                if (!upcomingUsers.includes(emi['loanId']))
                  upcomingUsers.push(emi['loanId']);
                countArr[3]['Amount'] += outstandingAmount;
                if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
                countArr[4]['Amount'] += outstandingAmount;
              }
            }
          });
        }
      } else {
        emi.emidata.forEach((emiItem) => {
          if (
            emiItem['payment_status'] == '1' &&
            emiItem['payment done date'] <= toDate
          ) {
            outstandingAmount = 0;
          } else if (emiItem['EMI DATE'] > toDate) {
            outstandingAmount = emiItem['EMI principal amount'];
            if (isRowData != true) {
              if (!upcomingUsers.includes(emi['loanId']))
                upcomingUsers.push(emi['loanId']);
              countArr[3]['Amount'] += outstandingAmount;
              if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
              countArr[4]['Amount'] += outstandingAmount;
            }
          } else if (
            (emi['Max Delay Days'] > 0 && emi['Max Delay Days'] <= 90) ||
            emiItem['EMI DATE'] == toDate
          ) {
            outstandingAmount =
              emiItem['EMI principal amount'] + emiItem['EMI interest amount'];
          } else {
            outstandingAmount = emiItem['EMI principal amount'];
          }
          emiItem['OutStanding EMI Amount'] = outstandingAmount;
          loanOutstandingAmount += emiItem['OutStanding EMI Amount'];

          if (emi['Max Delay Days'] <= 90 && isRowData != true) {
            if (
              emiItem['As on delay days'] > 0 &&
              emiItem['As on delay days'] <= 30
            ) {
              if (!SMA0.includes(emi['loanId'])) SMA0.push(emi['loanId']);
              countArr[0]['Amount'] += outstandingAmount;
              if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
              countArr[4]['Amount'] += outstandingAmount;
            } else if (
              emiItem['As on delay days'] > 30 &&
              emiItem['As on delay days'] <= 60
            ) {
              if (!SMA1.includes(emi['loanId'])) SMA1.push(emi['loanId']);
              countArr[1]['Amount'] += outstandingAmount;
              if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
              countArr[4]['Amount'] += outstandingAmount;
            } else if (
              emiItem['As on delay days'] > 60 &&
              emiItem['As on delay days'] <= 90
            ) {
              if (!SMA2.includes(emi['loanId'])) SMA2.push(emi['loanId']);
              countArr[2]['Amount'] += outstandingAmount;
              if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
              countArr[4]['Amount'] += outstandingAmount;
            } else if (
              emiItem['As on delay days'] == 0 &&
              emiItem['EMI DATE'] == toDate
            ) {
              if (!upcomingUsers.includes(emi['loanId']))
                upcomingUsers.push(emi['loanId']);
              countArr[3]['Amount'] += outstandingAmount;
              if (!SA.includes(emi['loanId'])) SA.push(emi['loanId']);
              countArr[4]['Amount'] += outstandingAmount;
            }
          }
        });
      }

      if (loanOutstandingAmount < 0) loanOutstandingAmount = 0;
      result['Outstanding Amount as on selected Date'] =
        loanOutstandingAmount.toFixed(2);
      result['IRACP Provisions as on'] = (
        loanOutstandingAmount * asset.percentage
      ).toFixed(2);

      if (emi['Max Delay Days'] > 0) {
        //for SMA-0 Count and total SA count
        if (emi['Max Delay Days'] >= 1 && emi['Max Delay Days'] <= 30) {
          result['Sub-Asset Category'] = 'SMA-0';
        }
        //for SMA-1 Count and total SA count
        else if (emi['Max Delay Days'] >= 31 && emi['Max Delay Days'] <= 60) {
          result['Sub-Asset Category'] = 'SMA-1';
        }
        //for SMA-2 Count and total SA count
        else if (emi['Max Delay Days'] >= 61 && emi['Max Delay Days'] <= 90) {
          result['Sub-Asset Category'] = 'SMA-2';
        }
        //for NPA-1 Count and total SSA count
        else if (emi['Max Delay Days'] >= 91 && emi['Max Delay Days'] <= 180) {
          result['Sub-Asset Category'] = 'NPA 91 to 180';
          if (isRowData != true) {
            countArr[5]['User count']++;
            countArr[5]['Amount'] += loanOutstandingAmount;
            // total SSA count
            countArr[7]['User count']++;
            countArr[7]['Amount'] += loanOutstandingAmount;
          }
        }
        //for NPA-2 Count and total SSA count
        else if (
          emi['Max Delay Days'] > 180 &&
          emi['Max Delay Days'] <= 365 &&
          (emi['Loss_assets'] == null || emi['Loss_assets'] > toDate)
        ) {
          result['Sub-Asset Category'] = 'NPA 180 to 365';
          if (isRowData != true) {
            countArr[6]['User count']++;
            countArr[6]['Amount'] += loanOutstandingAmount;
            // total SSA count
            countArr[7]['User count']++;
            countArr[7]['Amount'] += loanOutstandingAmount;
          }
        }
        //for total LA count
        else if (emi['Max Delay Days'] > 180 && emi['Loss_assets'] <= toDate) {
          result['Sub-Asset Category'] = 'Loss Assets';
          if (isRowData != true) {
            countArr[8]['User count']++;
            countArr[8]['Amount'] += loanOutstandingAmount;
          }
        }
        //for total DA count
        else if (
          emi['Max Delay Days'] > 365 &&
          (emi['Loss_assets'] == null || emi['Loss_assets'] > toDate)
        ) {
          result['Sub-Asset Category'] = 'Doubtfull Assets';
          if (isRowData != true) {
            countArr[9]['User count']++;
            countArr[9]['Amount'] += loanOutstandingAmount;
          }
        }
      }
      return result;
    });

    if (isRowData != true) {
      countArr[0]['Amount'] = countArr[0]['Amount'].toFixed(2);
      countArr[1]['Amount'] = countArr[1]['Amount'].toFixed(2);
      countArr[2]['Amount'] = countArr[2]['Amount'].toFixed(2);
      countArr[3]['Amount'] = countArr[3]['Amount'].toFixed(2);
      countArr[4]['Amount'] = countArr[4]['Amount'].toFixed(2);
      countArr[5]['Amount'] = countArr[5]['Amount'].toFixed(2);
      countArr[6]['Amount'] = countArr[6]['Amount'].toFixed(2);
      countArr[7]['Amount'] = countArr[7]['Amount'].toFixed(2);
      countArr[8]['Amount'] = countArr[8]['Amount'].toFixed(2);
      countArr[9]['Amount'] = countArr[9]['Amount'].toFixed(2);

      countArr[4]['provision'] = (
        countArr[4]['Amount'] * assetCategories['SA'].percentage
      ).toFixed(2);
      countArr[7]['provision'] = (
        countArr[7]['Amount'] * assetCategories['SSA'].percentage
      ).toFixed(2);
      countArr[8]['provision'] = (
        countArr[8]['Amount'] * assetCategories['LA'].percentage
      ).toFixed(2);
      countArr[9]['provision'] = (
        countArr[9]['Amount'] * assetCategories['DA'].percentage
      ).toFixed(2);
    }

    let response;
    if (isRowData == true) {
      response =
        download == false
          ? { count: total_count[0].count, rows: loanData }
          : loanData;
    } else {
      countArr[0]['User count'] = SMA0.length;
      countArr[1]['User count'] = SMA1.length;
      countArr[2]['User count'] = SMA2.length;
      countArr[3]['User count'] = upcomingUsers.length;
      countArr[4]['User count'] = SA.length;
      response = countArr;
    }

    if (download == true) {
      let rawExcelData = {
        sheets: ['local-reports'],
        data: [response],
        sheetName: stage + 'Asset_Classification',
        needFindTuneKey: false,
        reportStore: true,
        endDate,
      };
      response = null;

      const url: any = await this.apiService.requestPost(
        nObjectToExcel,
        rawExcelData,
      );
      if (url?.message) return url;
      rawExcelData = {
        sheets: ['local-reports'],
        data: [],
        sheetName: stage + ' Asset_Classification',
        needFindTuneKey: false,
        reportStore: true,
        endDate,
      };

      if (downloadId) {
        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      }
      return { fileUrl: url };
    } else {
      return response;
    }
  }

  async assetMigration(query) {
    let start_date = query?.start_date;
    let end_date = query?.end_date;
    if (!start_date) return kParamMissing('start_date');
    if (!end_date) return kParamMissing('end_date');

    start_date = await this.typeService.getGlobalDate(start_date);
    end_date = await this.typeService.getGlobalDate(end_date);

    let migrationDate = start_date;

    while (migrationDate <= end_date) {
      const query = {
        startDate: migrationDate,
      };
      const response = await this.cronAssetClassification(query);
      if (response != true) {
        console.log({ migrationDate });
      }
      migrationDate.setDate(migrationDate.getDate() + 1);
    }

    if (migrationDate >= end_date) return true;
  }

  async emiWisePerformance(reqData) {
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    const isDownload = reqData.download == 'true';

    let rawQuery = `
        SELECT "emi"."principalCovered", "emi"."interestCalculate", "emi"."fullPayInterest",
        "emi"."emi_date", "emi"."payment_done_date", "emi"."pay_type"
        FROM public."EmiEntities" AS "emi"

        LEFT JOIN "TransactionEntities" AS "trans" ON "trans"."emiId" = "emi"."id" AND "trans"."status" = '${kCompleted}'

        WHERE 
        ("emi"."emi_date" >= '${startDate}' AND "emi"."emi_date"  <= '${endDate}'
        AND ("emi"."payment_done_date" >= '${startDate}' OR "emi"."payment_done_date" IS NULL))
        OR 
        ("emi"."emi_date" > '${endDate}' AND "emi"."payment_done_date" IS NOT NULL AND "emi"."payment_done_date" >= '${startDate}' 
        AND "emi"."payment_done_date" <= '${endDate}')

        GROUP BY "emi"."id"`;

    let outputList = await this.repoManager.injectRawQuery(EmiEntity, rawQuery);
    if (outputList == k500Error) throw new Error();

    let advPaidEMIAmount = 0;
    let advPaidPrincipalAmount = 0;
    let advPaidInterestAmount = 0;
    let expEMIAmount = 0;
    let expPrincipalAmount = 0;
    let expInterestAmount = 0;
    let paidEMIAmount = 0;
    let paidPrincipalAmount = 0;
    let paidInterestAmount = 0;
    let odPaidEMIAmount = 0;
    let odPaidPrincipalAmount = 0;
    let odPaidInterestAmount = 0;
    let odPaidPenaltyAmount = 0;
    let odExpectedEMIAmount = 0;
    let odExpectedPrincipalAmount = 0;
    let odExpectedInterestAmount = 0;
    let odExpectedPenaltyAmount = 0;

    const minTime = new Date(startDate).getTime();
    const maxTime = new Date(endDate).getTime();
    for (let index = 0; index < outputList.length; index++) {
      const emiData = outputList[index];
      const emiDateTime = this.typeService
        .getGlobalDate(new Date(emiData.emi_date))
        .getTime();

      const isFullPay = emiData.pay_type == kFullPay;
      const prePaidInterest =
        (emiData.fullPayInterest ?? 0) > 0
          ? emiData.fullPayInterest ?? 0
          : emiData.interestCalculate ?? 0;

      // Advance payment received
      if (emiDateTime > maxTime) {
        advPaidEMIAmount += (emiData.principalCovered ?? 0) + prePaidInterest;
        advPaidPrincipalAmount += emiData.principalCovered ?? 0;
        advPaidInterestAmount += prePaidInterest;
      }
      // Current month expectations
      else if (emiDateTime <= maxTime) {
        const isEmiPaid = emiData.payment_done_date != null;

        expPrincipalAmount += emiData.principalCovered ?? 0;
        expEMIAmount += emiData.principalCovered ?? 0;

        if (!isEmiPaid) {
          expEMIAmount += emiData.interestCalculate ?? 0;
          expInterestAmount += emiData.interestCalculate ?? 0;
        } else {
          paidPrincipalAmount += emiData.principalCovered ?? 0;
          paidEMIAmount += emiData.principalCovered ?? 0;

          const paidTime = this.typeService
            .getGlobalDate(new Date(emiData.payment_done_date))
            .getTime();
          // On time or early paid
          if (paidTime <= emiDateTime) {
            if (isFullPay) {
              const prePaidInterest =
                (emiData.fullPayInterest ?? 0) > 0
                  ? emiData.fullPayInterest ?? 0
                  : emiData.interestCalculate ?? 0;
              paidEMIAmount += prePaidInterest;
              paidInterestAmount += prePaidInterest;
              expInterestAmount += prePaidInterest;
              expEMIAmount += prePaidInterest;
            } else {
              paidEMIAmount += emiData.interestCalculate ?? 0;
              paidInterestAmount += emiData.interestCalculate ?? 0;
              expInterestAmount += emiData.interestCalculate ?? 0;
              expEMIAmount += emiData.interestCalculate ?? 0;
            }
          }
          // Delay paid
          else {
            paidEMIAmount += emiData.interestCalculate ?? 0;
            paidInterestAmount += emiData.interestCalculate ?? 0;
            expInterestAmount += emiData.interestCalculate ?? 0;
            expEMIAmount += emiData.interestCalculate ?? 0;
          }
        }
      }
    }

    rawQuery = `SELECT "emi"."emi_date", "emi"."id" AS "emiId", "payment_done_date", "pay_type", "fullPayPrincipal", 
    "fullPayInterest", 
    COALESCE(
    SUM(
      COALESCE("fullPayPenalty", 0) +
      COALESCE("emi"."forClosureAmount", 0) +
      COALESCE("emi"."fullPayLegalCharge", 0) +
      COALESCE("emi"."fullPayRegInterest", 0) +
      COALESCE("emi"."fullPayBounce", 0) +
      COALESCE("emi"."fullPayPenal", 0)
    ), 0) AS "fullPayCharges",
    COALESCE(SUM("trans"."principalAmount"), 0) AS "paidPrincipal", 
    COALESCE(SUM("trans"."interestAmount"), 0) AS "paidInterest", 
        COALESCE(
      SUM(
        COALESCE("trans"."penaltyAmount", 0) +
        COALESCE("trans"."legalCharge", 0) +
        COALESCE("trans"."forClosureAmount", 0) +
        COALESCE("trans"."sgstForClosureCharge", 0) +
        COALESCE("trans"."cgstForClosureCharge", 0) +
        COALESCE("trans"."sgstOnLegalCharge", 0) +
        COALESCE("trans"."cgstOnLegalCharge", 0) +
        COALESCE("trans"."bounceCharge", 0) +
        COALESCE("trans"."cgstOnBounceCharge", 0) +
        COALESCE("trans"."sgstOnPenalCharge", 0) +
        COALESCE("trans"."cgstOnPenalCharge", 0) +
        COALESCE("trans"."penalCharge", 0) +
        COALESCE("trans"."regInterestAmount", 0) +
        COALESCE("trans"."sgstOnBounceCharge", 0)
      ), 0) AS "paidCharges"

    FROM "EmiEntities" AS "emi" 

    LEFT JOIN "TransactionEntities" AS "trans" ON "trans"."emiId" = "emi"."id" AND "status" = 'COMPLETED'
    AND "trans"."completionDate" >= '${startDate}' 
    AND "trans"."completionDate" <= '${endDate}'

    WHERE "emi"."emi_date" < '${startDate}' AND "emi"."payment_due_status" = '1'
    AND ("emi"."payment_status" != '1' OR "emi"."payment_done_date" >= '${startDate}'
    OR ("trans"."completionDate" >= '${startDate}' AND "trans"."completionDate" <= '${endDate}')) 

    GROUP BY "emi"."id"`;
    outputList = await this.repoManager.injectRawQuery(EmiEntity, rawQuery);

    for (let index = 0; index < outputList.length; index++) {
      const emiData = outputList[index];

      odPaidPrincipalAmount += emiData.paidPrincipal;
      odPaidInterestAmount += emiData.paidInterest;
      odPaidPenaltyAmount += emiData.paidCharges;
      odPaidEMIAmount += emiData.paidPrincipal;
      odPaidEMIAmount += emiData.paidInterest;
      odPaidEMIAmount += emiData.paidCharges;

      if (emiData.pay_type == kFullPay && emiData.payment_done_date) {
        const paidTime = this.typeService
          .getGlobalDate(new Date(emiData.payment_done_date))
          .getTime();
        if (paidTime >= minTime && paidTime <= maxTime) {
          odPaidPrincipalAmount += emiData.fullPayPrincipal ?? 0;
          odPaidInterestAmount += emiData.fullPayInterest ?? 0;
          odPaidPenaltyAmount += emiData.fullPayCharges ?? 0;
          odPaidEMIAmount += emiData.fullPayPrincipal ?? 0;
          odPaidEMIAmount += emiData.fullPayInterest ?? 0;
          odPaidEMIAmount += emiData.fullPayCharges ?? 0;
        }
      }
    }

    const emiIds = outputList.map((el) => el.emiId);

    if (emiIds.length > 0) {
      rawQuery = `
    SELECT "loan"."interestRate", "loan"."penaltyCharges", "emi"."principalCovered", "interestCalculate", "emi"."penalty", 
    "emi"."emi_date", "payment_done_date", "pay_type", "fullPayPrincipal", "fullPayPenalty", "fullPayInterest", 
    COALESCE("emi"."bounceCharge", 0) AS "bounceCharge", COALESCE("emi"."gstOnBounceCharge", 0) AS "gstOnBounceCharge",
    COALESCE("emi"."dpdAmount", 0) AS "dpdAmount", COALESCE("emi"."regInterestAmount", 0) AS "regInterestAmount",
    COALESCE("emi"."penaltyChargesGST", 0) AS "penaltyChargesGST",
    "emi"."forClosureAmount", "emi"."fullPayLegalCharge", "emi"."fullPayRegInterest", "emi"."fullPayBounce", 
    "emi"."fullPayPenal", COALESCE(SUM("trans"."principalAmount"), 0) AS "paidPrincipal", 
    COALESCE(SUM("trans"."interestAmount"), 0) AS "paidInterest", 
    COALESCE(
      SUM(
        COALESCE("trans"."penaltyAmount", 0) +
        COALESCE("trans"."legalCharge", 0) +
        COALESCE("trans"."forClosureAmount", 0) +
        COALESCE("trans"."sgstForClosureCharge", 0) +
        COALESCE("trans"."cgstForClosureCharge", 0) +
        COALESCE("trans"."sgstOnLegalCharge", 0) +
        COALESCE("trans"."cgstOnLegalCharge", 0) +
        COALESCE("trans"."bounceCharge", 0) +
        COALESCE("trans"."cgstOnBounceCharge", 0) +
        COALESCE("trans"."sgstOnPenalCharge", 0) +
        COALESCE("trans"."cgstOnPenalCharge", 0) +
        COALESCE("trans"."penalCharge", 0) +
        COALESCE("trans"."regInterestAmount", 0) +
        COALESCE("trans"."sgstOnBounceCharge", 0)
      ), 0) AS "paidCharges"

    FROM "EmiEntities" AS "emi" 

    LEFT JOIN "TransactionEntities" AS "trans" ON "trans"."emiId" = "emi"."id" AND "status" = 'COMPLETED'
    AND "trans"."completionDate" < '${startDate}'
    INNER JOIN "loanTransactions" AS "loan" ON "loan"."id" = "emi"."loanId"

    WHERE "emi"."id" IN (${emiIds.join(',')})

    GROUP BY "emi"."id", "loan"."interestRate", "loan"."penaltyCharges"`;
      outputList = await this.repoManager.injectRawQuery(EmiEntity, rawQuery);

      for (let index = 0; index < outputList.length; index++) {
        const emiData = outputList[index];
        const expectedPrincipal =
          (emiData.principalCovered ?? 0) - emiData.paidPrincipal;
        const expectedInterest =
          (emiData.interestCalculate ?? 0) - emiData.paidInterest;

        odExpectedEMIAmount += expectedPrincipal + expectedInterest;
        odExpectedPrincipalAmount += expectedPrincipal;
        odExpectedInterestAmount += expectedInterest;

        const isNewCal =
          emiData.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
        if (!isNewCal) {
          const dayDiff = this.typeService.differenceInDays(
            new Date(emiData.emi_date),
            new Date(startDate),
          );
          const emiAmt =
            (emiData.principalCovered ?? 0) + (emiData.interestCalculate ?? 0);
          const expPenalty =
            (emiAmt * dayDiff * 2 * +emiData.interestRate) / 100 -
            emiData.paidCharges;
          odExpectedPenaltyAmount += expPenalty;
        } else {
          let totalCharges = 0;
          totalCharges += emiData.bounceCharge;
          totalCharges += emiData.gstOnBounceCharge;
          totalCharges += emiData.dpdAmount;
          totalCharges += emiData.regInterestAmount;
          totalCharges += emiData.penaltyChargesGST;
          odExpectedPenaltyAmount += totalCharges;
        }
      }
    }

    const finalizedData = {
      'Collection efficiency':
        Math.floor(
          (Math.floor(paidPrincipalAmount) * 100) /
            Math.floor(expPrincipalAmount),
        ) + '%',
      'Exp EMI amount': this.strService.readableAmount(
        Math.floor(expEMIAmount),
      ),
      'Exp principal amount': this.strService.readableAmount(
        Math.floor(expPrincipalAmount),
      ),
      'Exp interest amount': this.strService.readableAmount(
        Math.floor(expInterestAmount),
      ),
      'Paid EMI amount': this.strService.readableAmount(
        Math.floor(paidEMIAmount),
      ),
      'Paid principal amount': this.strService.readableAmount(
        Math.floor(paidPrincipalAmount),
      ),
      'Paid interest amount': this.strService.readableAmount(
        Math.floor(paidInterestAmount),
      ),
      'Adv paid EMI amount': this.strService.readableAmount(
        Math.floor(advPaidEMIAmount),
      ),
      'Adv paid principal amount': this.strService.readableAmount(
        Math.floor(advPaidPrincipalAmount),
      ),
      'Adv paid interest amount': this.strService.readableAmount(
        Math.floor(advPaidInterestAmount),
      ),
      'Exp OD EMI amount': this.strService.readableAmount(
        Math.floor(odExpectedEMIAmount) ?? 0,
      ),
      'Exp OD principal amount': this.strService.readableAmount(
        Math.floor(odExpectedPrincipalAmount) ?? 0,
      ),
      'Exp OD interest amount': this.strService.readableAmount(
        Math.floor(odExpectedInterestAmount) ?? 0,
      ),
      'Exp OD penalty amount': this.strService.readableAmount(
        Math.floor(odExpectedPenaltyAmount) ?? 0,
      ),
      'OD paid EMI amount': this.strService.readableAmount(
        Math.floor(odPaidEMIAmount) ?? 0,
      ),
      'OD paid principal amount': this.strService.readableAmount(
        Math.floor(odPaidPrincipalAmount) ?? 0,
      ),
      'OD paid interest amount': this.strService.readableAmount(
        Math.floor(odPaidInterestAmount) ?? 0,
      ),
      'OD paid penalty amount': this.strService.readableAmount(
        Math.floor(odPaidPenaltyAmount) ?? 0,
      ),
    };

    if (isDownload) {
      const path = 'EMI Monthly performance.xlsx';
      const rawExcelData = {
        sheets: ['EMI Monthly performance'],
        data: [[finalizedData]],
        sheetName: path,
        needFindTuneKey: false,
      };
      // Generate excel url
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;
      const fileURL = await this.fileService.uploadFile(
        excelResponse?.filePath,
        'reports',
        'xlsx',
      );
      if (fileURL.message) return fileURL;
      const updatedData = { downloadUrl: fileURL, status: '1' };
      const downloadId = reqData.downloadId;
      await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
      return { fileURL };
    }

    const rows = [finalizedData];
    const count = rows.length;
    return { count, rows };
  }

  async funGetDailyNetBankingReport(query) {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0];

    // Fetch the data
    const data = await this.metricsInsights({
      type: 1,
      subType: 1,
      count: true,
      startDate: formattedDate,
      endDate: formattedDate,
    });

    let formattedString = '';
    if (data?.message)
      formattedString = '*Something is wrong while generating report*';
    else if (isNaN(data['Total conversion ratio']))
      formattedString = ':scream: *Oh no! No data available*';
    else formattedString = await this.formatBankData(data);

    // Slack Bot
    const messageOptions: any = {
      text: `*NetBanking Daily Report*\n\n${formattedString}`,
    };
    if (EnvConfig.isProd) messageOptions.channel = 'APP_DEVELOPMENT';
    await this.slack.sendMsg(messageOptions);

    return { data: formattedString };
  }

  async formatBankData(data) {
    const headers = [
      'Bank name',
      'Total',
      'Dropped without Auth',
      'Stucked',
      'Completed',
      'Conversion Ratio (%)',
    ];

    const rows = Object.keys(data)
      .filter((key) => key !== 'Total conversion ratio')
      .map((bankCode) => {
        const bank = data[bankCode];
        return [
          bankCode,
          String(bank['Total attempts']),
          String(bank['Dropped without auth']),
          String(bank['Total stuck in journey']),
          String(bank['Total completed journey']),
          bank['conversion ratio'] && bank['conversion ratio'] !== null
            ? `${bank['conversion ratio']}%`
            : '0%',
        ];
      });

    const columnWidths = headers.map((header, i) => {
      return Math.max(header.length, ...rows.map((row) => row[i].length));
    });

    const formatRow = (row) => {
      return row.map((cell, i) => cell.padEnd(columnWidths[i])).join(' | ');
    };

    const table = [
      formatRow(headers),
      '-'.repeat(columnWidths.reduce((a, b) => a + b + 3, -3)),
      ...rows.map(formatRow),
    ].join('\n');

    const totalConversionRatio = `\nTotal Conversion Ratio: ${data['Total conversion ratio']}%`;

    return `\`\`\`\n${table.trim()}${totalConversionRatio}\n\`\`\``;
  }
}
