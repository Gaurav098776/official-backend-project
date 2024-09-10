// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  GlobalServices,
  MIN_LOAN_AMOUNT,
  NAME_VALIDATE,
  SYSTEM_ADMIN_ID,
  GLOBAL_RANGES,
  manualBanksList,
  GLOBAL_CHARGES,
  MAX_INQUIRY_PAST_30_DAYS,
  GLOBAL_FLOW,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import {
  APPROVED_SALARY_IS_NOT_MACTCH_WITH_STATE_SALARY,
  kFinalLoanAcceptBody,
  kFinalLoanAcceptTitle,
  kGlobalTrail,
  kHighRisk,
  kInternalPolicy,
  kKeyScoreData,
  kLoanDeclined,
  kModerateRisk,
  kNoActiveScoreFound,
  kNoDataFound,
  kNoTemplateFound,
  kUsrCategories,
  kSelectedDateShouldNotbe,
  BAD_CIBIL_SCORE_MSG,
  APPROVED_SALARY_IS_NOT_MATCH_WITH_AREA,
  COMPANY_BLACKLIST,
  kErrorMsgs,
  MIN_SCORE_MESS,
  COMPANY_STATUS_IS_NOT_ACTIVE,
  FINALBUCKETADMINS,
  ALREADY_LOAN_ACTIVE,
} from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { TypeService } from 'src/utils/type.service';
import { EmiSharedService } from './emi.service';
import { SharedNotificationService } from './services/notification.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { KYCEntity } from 'src/entities/kyc.entity';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
import { BankingEntity } from 'src/entities/banking.entity';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { MandateSharedService } from './mandate.service';
import { TemplateRepository } from 'src/repositories/template.repository';
import { employmentDetails } from 'src/entities/employment.entity';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { CommonSharedService } from './common.shared.service';
import { AdminRepository } from 'src/repositories/admin.repository';
import { RedisService } from 'src/redis/redis.service';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { APIService } from 'src/utils/api.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { AdminService } from 'src/admin/admin/admin.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { ILoanEligibility } from './interfaces/loan.eligibility.interface';
import { IsUUID, isUUID } from 'class-validator';
import { DataBaseService } from 'src/database/db.service';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { SequelOptions } from 'src/interfaces/include.options';
import { EmiEntity } from 'src/entities/emi.entity';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { EnvConfig } from 'src/configs/env.config';
import { KycServiceV4 } from 'src/v4/kyc/kyc.service.v4';
import { REASON_ID, REASON_REMARK } from 'src/constants/objects';
@Injectable()
export class EligibilitySharedService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly authAi: AuthAiService,
    private readonly blackListedCompanyRepo: BlackListCompanyRepository,
    @Inject(forwardRef(() => EmiSharedService))
    private readonly sharedEMI: EmiSharedService,
    private readonly empRepo: EmploymentRepository,
    private readonly loanRepo: LoanRepository,
    private readonly masterRepo: MasterRepository,
    private readonly stateRepo: StateEligibilityRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly userBlockHistoryRepo: BlockUserHistoryRepository,
    private readonly salaryRepo: SalarySlipRepository,
    private readonly bankRepo: BankingRepository,
    private readonly workMailRepo: WorkMailRepository,
    private readonly predictionService: PredictionService,
    private readonly redisService: RedisService,
    private readonly razorpayService: RazorpoayService,
    private readonly mandateService: MandateSharedService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
    private readonly predictionRepo: PredictionRepository,
    private readonly staticRepo: StaticConfigRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly commonService: CommonSharedService,
    private readonly empHistoryRepo: EmploymentHistoryRepository,
    private readonly apiService: APIService,
    private readonly assignmentService: AssignmentSharedService,
    // Database
    private readonly repoManager: RepositoryManager,
    // Repositories
    private readonly reasonRepo: ReasonRepository,
    private readonly kycRepo: KYCRepository,
    private readonly selfieRepo: UserSelfieRepository,
    // v3 services
    @Inject(forwardRef(() => UserServiceV4))
    private readonly userService: UserServiceV4,
    private readonly kycService: KycServiceV4,
  ) {}

  // Checks User's Eligibility
  async checkUserEligiblity(id) {
    try {
      if (EnvConfig.otherNBFCUrl.otherNbfcBaseUrl.length == 0) return true;
      const validUrls = (EnvConfig.otherNBFCUrl.otherNbfcBaseUrl ?? []).filter(
        (el) => el != undefined && el && el?.trim()?.length > 1,
      );
      if (validUrls.length == 0) return true;

      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = ['aadhaarNo'];
      let include = [kycInclude];
      const option = { include, where: { id } };
      const userData: any = await this.userRepo.getRowWhereData(
        ['phone'],
        option,
      );
      if (userData == k500Error) return kInternalError;
      const params = {
        number: userData?.phone,
        aadhaarNo: userData?.kycData?.aadhaarNo,
      };
      const url = EnvConfig.otherNBFCUrl.otherNbfcBaseUrl;
      for (let i = 0; i < url.length; i++) {
        const element = url[i];
        if (!element || element == undefined) continue;
        let URL = element + '/v4/user/checkUserHistory';
        const userEligiblityData = await this.apiService.get(URL, params);
        if (userEligiblityData?.message != 'SUCCESS') continue;
        var userCurrentEligibility = await this.blockUser(
          userEligiblityData?.data,
          id,
        );
        if (userCurrentEligibility == false) return userCurrentEligibility;
      }
      return userCurrentEligibility;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Blocks the User By Cooling Off and Blacklisting
  async blockUser(data, userId) {
    try {
      const coolOffData = data.coolOffData;
      const blacklistData = data.blacklistedData;
      const isLoanActive = data.loanData?.isLoanActive;
      const isLoanAccepted = data?.loanData?.isLoanAccepted;
      // CoolOff User
      const today = this.typeService.getGlobalDate(new Date());
      if (
        coolOffData?.isCoolOff &&
        coolOffData?.coolOffEndsOn &&
        coolOffData?.coolOffEndsOn > today.toJSON()
      ) {
        const coolOff: any = await this.adminService.changeBlacklistUser({
          userId,
          adminId: SYSTEM_ADMIN_ID,
          type: '2',
          reason: coolOffData?.reason,
          status: '0',
          nextApplyDate: coolOffData?.coolOffEndsOn,
          reasonId: coolOffData?.reasonId,
        });
        console.log({ coolOff });
        if (coolOff.message) return kInternalError;
      }
      //Blacklist User
      else if (blacklistData?.isBlacklisted) {
        const blackListAndRejectLoan: any =
          await this.adminService.changeBlacklistUser({
            userId,
            adminId: SYSTEM_ADMIN_ID,
            type: '1',
            reason: blacklistData?.reason ?? REASON_REMARK.USER_NOT_ELIGIBLE,
            status: '1',
            nextApplyDate: null,
            reasonId: blacklistData?.reasonId ?? REASON_ID.USER_NOT_ELIGIBLE,
          });
        if (blackListAndRejectLoan.message) return kInternalError;
      }
      // Blacklist User(When Already Loan Active in Different NBFC)
      else if (isLoanActive) {
        const blackListAndRejectLoan: any =
          await this.adminService.changeBlacklistUser({
            userId,
            adminId: SYSTEM_ADMIN_ID,
            type: '1',
            reason: ALREADY_LOAN_ACTIVE,
            status: '1',
            nextApplyDate: null,
            reasonId: 62,
          });
        if (blackListAndRejectLoan.message) return kInternalError;
      } else if (isLoanAccepted) {
        const blackListAndRejectLoan: any =
          await this.adminService.changeBlacklistUser({
            userId,
            adminId: SYSTEM_ADMIN_ID,
            type: '1',
            reason: REASON_REMARK.LOAN_ALREADY_ACCEPTED,
            status: '1',
            nextApplyDate: null,
            reasonId: REASON_ID.LOAN_ALREADY_ACCEPTED,
          });
        if (blackListAndRejectLoan.message) return kInternalError;
      } else return true;

      return false;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  async validateStateWiseEligibility(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    let verifiedSalary = null;
    if (reqData?.salary) verifiedSalary = reqData?.salary;

    // Get target user data
    const userData = await this.getDataForStateWiseEligiblity(reqData);
    if (userData?.message) return userData;
    const appType = userData?.appType;

    // Get state
    const kycData = userData?.kycData ?? {};
    const kycEligibilityDetails = kycData.eligibilityDetails ?? {};
    kycEligibilityDetails.stateCheckedOn = new Date().toJSON();
    let aadhaarState;
    if (kycData.aadhaarState) aadhaarState = kycData.aadhaarState;
    else if (kycData.aadhaarAddress) {
      if (typeof kycData.aadhaarAddress === 'string') {
        const aadhaarAddress = JSON.parse(kycData.aadhaarAddress);
        if (aadhaarAddress?.state) aadhaarState = aadhaarAddress.state;
      }
    }
    let lastState = userData?.state;
    if (!lastState) lastState = aadhaarState;
    if (!aadhaarState || !lastState) return kParamMissing('state');
    kycEligibilityDetails.aadhaarState = aadhaarState;
    kycEligibilityDetails.lastState = lastState;
    // SKIP STEP -> OLD DEFAULTER
    if ((userData?.isRedProfile ?? 0) === 2) return {};
    const loanData = userData?.masterData?.loanData;
    const bankingData = loanData?.bankingData;
    const status = userData?.masterData?.status;
    if (
      status.loan != 2 &&
      (bankingData?.salaryVerification == '1' ||
        bankingData?.salaryVerification == '3')
    )
      verifiedSalary = bankingData?.adminSalary ?? bankingData?.salary;
    let userEnteredSalary = userData?.masterData?.otherInfo?.salaryInfo;
    if (!userEnteredSalary)
      userEnteredSalary = userData.masterData?.empData?.salary;
    // code comment due to missing repeater proffetional salaryInfo
    // if (!userEnteredSalary) return k422ErrorMessage('salaryInfo not found');

    // Validate state wise eligibility
    const userSalary = verifiedSalary ?? userEnteredSalary;
    const stateEligible: any = await this.isEligibleAsPerState(
      userSalary,
      aadhaarState,
      lastState,
      userData.completedLoans > 0,
      appType,
    );
    if (stateEligible?.message) return stateEligible;
    const isEligible =
      !userSalary || userSalary == '0' ? true : stateEligible.isEligible;
    kycEligibilityDetails.salary = userSalary;
    kycEligibilityDetails.isEligible = isEligible;
    kycEligibilityDetails.checkVia = stateEligible?.checkVia;
    if (!userSalary || userSalary == '0')
      kycEligibilityDetails.logicBypass = true;

    // Update state selection
    const kycUpdatedData = { eligibilityDetails: kycEligibilityDetails };
    const kycUpdateResult = await this.repoManager.updateRowData(
      KYCEntity,
      kycUpdatedData,
      kycData.id,
      true,
    );
    if (kycUpdateResult === k500Error) throw new Error();

    if (isEligible) return {};

    const coolOffData = userData?.masterData?.coolOffData ?? {};
    const count = +coolOffData.count ?? 0;
    // Update user data
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    if (count == 0 || !count) targetDate.setDate(targetDate.getDate() + 3);
    if (count == 1) targetDate.setDate(targetDate.getDate() + 90);
    targetDate = this.typeService.getGlobalDate(targetDate);

    const updatedData: any = {};
    const remark = APPROVED_SALARY_IS_NOT_MACTCH_WITH_STATE_SALARY;
    if (status?.company == -1) {
      const toDay = this.typeService.getGlobalDate(new Date());
      coolOffData.count = count;
      coolOffData.coolOffStartedOn = toDay.toJSON();
      coolOffData.coolOffEndsOn = targetDate.toJSON();
      coolOffData.reason = remark;

      updatedData.status = status;
      updatedData.coolOffData = coolOffData;
    }
    const updateResult = await this.masterRepo.updateRowData(
      updatedData,
      userData.masterId,
    );
    if (updateResult === k500Error) return kInternalError;
    if (loanData?.id) {
      const adminId = reqData?.adminId ?? SYSTEM_ADMIN_ID;
      await this.rejectLoan(adminId, loanData?.id, remark, userId, targetDate);
      await this.checkAndRejectSteps(userId, remark);
    }

    // Create UserBlockHistory record
    await this.userBlockHistoryRepo.createRowData({
      coolOfDate: targetDate.toJSON(),
      userId,
      blockedBy: SYSTEM_ADMIN_ID,
    });

    return {};
  }

  private async getDataForStateWiseEligiblity(reqData) {
    let verifiedSalary = null;
    if (reqData?.salary) verifiedSalary = reqData?.salary;
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');

    // Validate user data
    const bankInclude: any = { model: BankingEntity };
    bankInclude.attributes = ['salary', 'salaryVerification', 'adminSalary'];
    bankInclude.required = false;
    const loanInclude: any = { model: loanTransaction };
    loanInclude.attributes = ['id'];
    const empInclude: any = { model: employmentDetails };
    empInclude.attributes = ['salary'];
    empInclude.required = false;
    if (!verifiedSalary) loanInclude.include = [bankInclude];
    loanInclude.required = false;
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['status', 'coolOffData', 'otherInfo'];
    masterInclude.include = [empInclude, loanInclude];
    const kycInclude: any = { model: KYCEntity };
    kycInclude.attributes = [
      'aadhaarAddress',
      'aadhaarState',
      'eligibilityDetails',
      'id',
    ];
    const include = [masterInclude, kycInclude];
    const attributes = [
      'completedLoans',
      'masterId',
      'state',
      'isRedProfile',
      'maybeGoodCibil',
      'appType',
    ];
    const options = { include, where: { id: userId } };
    const userData = await this.userRepo.getRowWhereData(attributes, options);
    if (userData === k500Error) throw Error();
    if (!userData) return k422ErrorMessage(kNoDataFound);

    return userData;
  }

  async isEligibleCompany(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const companyName = reqData.companyName;
      if (!companyName) return kParamMissing('companyName');
      const attributes = ['id', 'blockedBy'];
      const options = { where: { companyName } };
      const blackListedData = await this.blackListedCompanyRepo.getRowWhereData(
        attributes,
        options,
      );
      if (blackListedData == k500Error) return kInternalError;
      if (!blackListedData) return true;

      // Blacklist the user
      const data = {
        userId,
        reason: COMPANY_BLACKLIST,
        reasonId: 53,
        type: '1',
        status: '1',
        adminId: SYSTEM_ADMIN_ID,
      };
      if (!(blackListedData.blockedBy == 'SYSTEM')) {
        const userBloack = await this.adminService.changeBlacklistUser(data);
        if (userBloack == k500Error) return kInternalError;
      } else {
        let nextApplyDate = new Date();
        nextApplyDate.setDate(nextApplyDate.getDate() + 60);
        let coolOffData: any = {
          userId,
          type: '2',
          nextApplyDate,
          adminId: SYSTEM_ADMIN_ID,
          status: '0',
          reason: COMPANY_STATUS_IS_NOT_ACTIVE,
          reasonId: 55,
        };
        await this.adminService.changeBlacklistUser(coolOffData);
      }

      return false;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async isEligibleAsPerState(
    salary,
    aadhaarState,
    lastState,
    isRepeater,
    apptype,
  ) {
    try {
      if (!aadhaarState || !lastState) return kParamMissing('state');
      // SKIP_SALARY due to missing repeater proffetional salaryInfo
      if (!salary || salary == '0')
        return { isEligible: true, checkVia: 'SKIP_SALARY' };

      aadhaarState = aadhaarState.toLowerCase();
      lastState = lastState.toLowerCase();
      const stateName = [aadhaarState, lastState];
      const attr = [
        'stateName',
        'isActive',
        'eligibility_new',
        'eligibility_repeat',
      ];
      const options = { where: { stateName } };
      const stateData = await this.stateRepo.getTableWhereData(attr, options);
      if (stateData === k500Error) return kInternalError;
      if (!stateData)
        return {
          isEligible: salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT,
          checkVia: 'MIN SALARY',
        };

      const inactiveState = stateData.find((f) => f.isActive == '0');
      if (inactiveState)
        return { isEligible: false, checkVia: 'INACTIVE STATE' };
      let activeState = stateData.find(
        (f) => f.isActive == '1' && f.stateName == aadhaarState,
      );
      if (!activeState)
        activeState = stateData.find(
          (f) => f.isActive == '1' && f.stateName == lastState,
        );
      const minAmount = isRepeater
        ? activeState.eligibility_repeat
        : activeState.eligibility_new;

      if (!GLOBAL_FLOW.SALARY_COOLOFF_BEFORE_STATEMENT && apptype == 0) {
        if (salary >= 10000 && salary < 20000) {
          return { isEligible: true, checkVia: 'STATE SALARY' };
        }
      }
      return { isEligible: salary >= minAmount, checkVia: 'STATE SALARY' };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Total #4 steps
  async checkLoanEligibility(reqData: ILoanEligibility) {
    // #01 - Get valid loan data
    const loanData = await this.getLoanDataForEligibility(reqData);
    if (loanData?.message) return loanData;
    // #02 - Validate eligibility
    let baseEligibility: any;
    let nbfc = EnvConfig.nbfc.nbfcType;
    if (nbfc == '0')
      baseEligibility = await this.nbfcFirstvalidateEligiblityForLoan(loanData);
    else if (nbfc == '1')
      baseEligibility = await this.nbfcSecondvalidateEligiblityForLoan(
        loanData,
      );
    else {
      return 'NBFC is not found';
    }
    // #04 - Mark eligibility process as complete
    return await this.markEligibilityAsComplete(baseEligibility);
  }

  // #01 - Get valid loan data
  private async getLoanDataForEligibility(
    reqData: ILoanEligibility,
  ): Promise<any> {
    // Params validation
    if (!reqData.loanId) return kParamMissing('loanId');
    if (!reqData.userId) return kParamMissing('userId');
    if (typeof reqData.loanId != 'number') return kInvalidParamValue('loanId');
    if (!isUUID(reqData.userId)) return kInvalidParamValue('userId');

    // Query preparation
    const loanAttr = ['completedLoan', 'loanStatus', 'userId'];
    const bankInclude: SequelOptions = {
      attributes: ['adminSalary', 'salary'],
      model: BankingEntity,
    };
    const include = [bankInclude];
    const loanOptions = { include, where: { id: reqData.loanId } };

    // Query
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      loanAttr,
      loanOptions,
    );

    // Validate query data
    if (!loanData) return k422ErrorMessage(kNoDataFound);
    if (loanData == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (loanData.loanStatus == 'Rejected')
      return k422ErrorMessage('Loan is rejected, try after sometime !');
    else if (loanData.loanStatus == 'Active')
      return k422ErrorMessage('Loan is active, try after sometime !');
    else if (reqData.userId != loanData.userId)
      return kInvalidParamValue('userId');

    // Get cibil data
    // Query preparation
    const cibilAttr = [
      'cibilScore',
      'overdueBalance',
      'plScore',
      'totalOverdueDays',
      'PLAccounts',
      'inquiryPast30Days',
      'inquiryPast12Months',
      'accounts',
    ];
    const cibilOptions = {
      order: [['id', 'DESC']],
      where: { loanId: reqData.loanId, userId: reqData.userId },
    };

    // Query
    const cibilData = await this.repoManager.getRowWhereData(
      CibilScoreEntity,
      cibilAttr,
      cibilOptions,
    );

    // Validate query data
    if (cibilData == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    else if (!cibilData) return k422ErrorMessage(kNoDataFound);

    return {
      ...cibilData,
      loanId: reqData.loanId,
      userId: reqData.userId,
      completedLoans: loanData.completedLoan ?? 0,
      salary: loanData?.bankingData?.salary ?? reqData?.approvedSalary,
    };
  }

  // #04 - Mark eligibility process as complete (either offer the loan or reject the process)
  private async markEligibilityAsComplete(baseEligibility) {
    // Offer the loan
    if (baseEligibility.isEligible === true) {
      baseEligibility.calculatedOn = new Date().toJSON();
      // Calculate charges, emi and insurance
      return await this.sharedEMI.refreshCalculation(baseEligibility.loanId, {
        netApprovedAmount: baseEligibility.eligibleAmount,
        interestRate: baseEligibility?.interestRate,
        eligibilityDetails: baseEligibility,
      });
    }
    // Decline the loan process for not eligible
    else {
      const remark = BAD_CIBIL_SCORE_MSG ?? MIN_SCORE_MESS;
      // Update loan data for eligiblity traces
      if (!isNaN(+baseEligibility.loanId)) {
        const updatedData = { eligibilityDetails: baseEligibility };
        const updateResponse = await this.repoManager.updateRowData(
          loanTransaction,
          updatedData,
          +baseEligibility.loanId,
        );
        if (updateResponse === k500Error) throw new Error();
      }

      const nextApplyDate = new Date();
      nextApplyDate.setDate(
        nextApplyDate.getDate() +
          GLOBAL_RANGES.LOAN_REJECTION_WITH_LOW_SCORE_COOL_OFF,
      );
      await this.rejectLoan(
        SYSTEM_ADMIN_ID,
        baseEligibility.loanId,
        remark,
        baseEligibility.userId,
        nextApplyDate,
      );
      await this.checkAndRejectSteps(baseEligibility?.userId, remark);
      return { isEligible: false };
    }
  }

  private async lastLoanStatus(userId) {
    if (!userId) return kParamMissing('userId');
    if (!IsUUID(userId)) return kInvalidParamValue('userId');

    // Query preparation
    const emiInclude: SequelOptions = { model: EmiEntity };
    emiInclude.attributes = ['penalty_days'];
    const include = [emiInclude];
    const loanAttr = ['id'];
    const loanOptions = {
      include,
      order: [['id', 'DESC']],
      where: { loanStatus: 'Complete', userId },
    };
    // Query data
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      loanAttr,
      loanOptions,
    );
    if (loanData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (!loanData) return 'LOAN_NOT_TAKEN';

    const emiList = loanData.emiData ?? [];
    const delayDays = emiList.reduce(
      (prev, curr) => prev + (curr.penalty_days ?? 0),
      0,
    );
    if (delayDays > 0) return 'LOAN_DELAYED';
    else return 'LOAN_ON_TIME';
  }

  // Pass emi date only if eligible user wants to change the emi date
  async getAmountRange(loanId, statusData) {
    const attributes = ['loanAmount', 'loanStatus'];
    const options = { where: { id: loanId } };
    const loanData = await this.loanRepo.getRowWhereData(attributes, options);
    if (loanData == k500Error) return kInternalError;
    if (!loanData) return k422ErrorMessage(kNoDataFound);
    if (loanData?.loanStatus == 'Accepted' && statusData?.loan != -1) {
      return k422ErrorMessage('Loan amount can not change after acceptance');
    }
    if (loanData?.loanStatus == 'Accepted' && statusData?.loan == -1) {
      const updateRes = await this.loanRepo.updateRowData(
        { loanStatus: 'InProcess' },
        loanId,
      );
      if (updateRes === k500Error) return kInternalError;
    }
    if (loanData.loanStatus == 'Complete')
      return k422ErrorMessage('Loan already completed');
    if (loanData.loanStatus == 'Active')
      return k422ErrorMessage('Loan already active');
    if (loanData.loanStatus == 'Rejected')
      return k422ErrorMessage('Loan amount can not change after rejection');

    // Pass salary date only if user wants to change the salary date
    const calculation = await this.sharedEMI.refreshCalculation(loanId, {});
    if (calculation.message) return calculation;

    const loanApproval: any = {
      isEligible: true,
      approvedAmount: +(
        calculation?.approvedLoanAmount ?? calculation.loanAmount
      ),
      emiDays: calculation.emiDays,
      emiDates: calculation.emiDates.map((el) => new Date(el).toJSON()),
      totalDays: calculation.totalDays,
      interestRate: +calculation.interestRate,
      minAmount: MIN_LOAN_AMOUNT,
      stampFees: calculation.stampFees,
      delayInterestRate: calculation?.delayInterestRate,
      canSelectEmiDate: calculation.canSelectEmiDate ?? false,
      eligibleEmiDates: calculation.eligibleEmiDates ?? [],
      emiSelectedDate: calculation.emiSelectedDate,
      forcefullEmiSelection: false,
      calenderData: { month: null, year: null },
      // Dynamic insurance flow for user
      processingFeesWithInsurance:
        GLOBAL_CHARGES.WITH_INSURANCE_PROCESSING_FEES,
      processingFeesWithoutInsurance:
        GLOBAL_CHARGES.WITHOUT_INSURANCE_PROCESSING_FEES,
      insuranceOptValue: GlobalServices.INSURANCE_OPT_VALUE ?? false,
      chargesWithInsurance: calculation.chargesWithInsurance ?? {},
      chargesWithoutInsurance: calculation.chargesWithoutInsurance ?? {},
    };
    // Get month and year for calender selection in frontend (App)
    const emiSelectedDate =
      loanApproval.emiSelectedDate ?? calculation.salaryDate;
    if (emiSelectedDate) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const emiDate = new Date();
      emiDate.setDate(emiSelectedDate);
      // EMI date falls this month
      if (emiDate.getMonth() == currentMonth) {
        // Date is in past
        if (today.getDate() >= emiDate.getDate()) {
          emiDate.setMonth(emiDate.getMonth() + 1);
        } else {
          const diffInDays = this.typeService.dateDifference(emiDate, today);
          // EMI should start from minimum 13 days of gap from today
          if (diffInDays <= 11) {
            emiDate.setMonth(emiDate.getMonth() + 1);
          }
        }
      }
      loanApproval.calenderData.month = emiDate.getMonth();
      loanApproval.calenderData.year = emiDate.getFullYear();
    }
    // Default emi date
    if (!emiSelectedDate) loanApproval.emiSelectedDate = calculation.salaryDate;
    if (
      GlobalServices.INSURANCE_SERVICE &&
      GlobalServices.INSURANCE_SERVICE != 'NONE'
    ) {
      loanApproval.insurance = calculation.insurance;
      loanApproval.isInsurance = true;
    }

    return loanApproval;
  }

  async rejectLoan(
    adminId: number,
    loanId: number,
    remark: string,
    userId: string,
    nextApplyDate?,
    declineId = null,
    isForcefully = false,
    isBlacklist = false,
  ) {
    try {
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus'],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fcmToken', 'phone', 'stage'],
      };
      const masterData = await this.masterRepo.getRowWhereData(
        ['id', 'status', 'dates', 'rejection', 'coolOffData'],
        { where: { loanId }, include: [loanInclude, userInclude] },
      );
      if (!masterData || masterData == k500Error) return kInternalError;
      const loanData = masterData.loanData;
      const userData = masterData.userData;
      const statusData = masterData?.status ?? {};
      const dates = masterData?.dates ?? {};
      const rejection = masterData?.rejection ?? {};
      const coolOffData = masterData?.coolOffData ?? {};
      if (
        loanData.loanStatus === 'Active' ||
        loanData.loanStatus === 'Complete'
      )
        return kInternalError;

      const toDay = this.typeService.getGlobalDate(new Date());
      if (nextApplyDate)
        nextApplyDate = this.typeService.getGlobalDate(nextApplyDate);
      else {
        nextApplyDate = this.typeService.getGlobalDate(new Date());
        nextApplyDate.setDate(nextApplyDate.getDate() + 1);
      }
      if (nextApplyDate <= toDay)
        return k422ErrorMessage(kSelectedDateShouldNotbe);
      const loanUpdatedData: any = {
        loanStatus: 'Rejected',
        remark,
        lastStage: (userData?.stage ?? '').toString(),
      };
      if (declineId) loanUpdatedData.declineId = declineId;
      loanUpdatedData.manualVerification = '2';
      statusData.eligibility = 2;
      statusData.loan = 2;
      loanUpdatedData.verifiedDate = toDay.toJSON();
      dates.eligibility = new Date().getTime();
      dates.loan = new Date().getTime();
      rejection.loan = remark;
      if (remark == BAD_CIBIL_SCORE_MSG) {
        loanUpdatedData.cibilSystemFlag = 2;
      }

      if (adminId != -1) loanUpdatedData.manualVerificationAcceptId = adminId;
      const where = { esign_id: { [Op.eq]: null } };
      if (isForcefully) delete where.esign_id;
      const loanUpdate = await this.loanRepo.updateWhere(
        loanUpdatedData,
        loanId,
        where,
      );
      await this.loanRepo.updateRowWhereData(
        { loanStatus: 'Rejected' },
        {
          where: {
            userId,
            id: { [Op.ne]: loanId },
            loanStatus: { [Op.notIn]: ['Complete', 'Rejected', 'Active'] },
          },
        },
      );
      if (loanUpdate == k500Error) return kInternalError;
      else if (loanUpdate[0] == 0)
        return k422ErrorMessage('Loan can not rejected!');

      // Update user data

      coolOffData.count = (coolOffData?.count ?? 0) + 1;
      coolOffData.coolOffStartedOn = toDay.toJSON();
      coolOffData.coolOffEndsOn = nextApplyDate.toJSON();
      coolOffData.reason = remark;

      let userUpdatedData: any = { NextDateForApply: nextApplyDate };
      const masterUpdatedData: any = {
        status: statusData,
        dates,
        rejection,
      };
      if (isBlacklist == true) userUpdatedData = { isBlacklist: '1' };
      else masterUpdatedData.coolOffData = coolOffData;
      const userUpdate = await this.userRepo.updateRowData(
        userUpdatedData,
        userId,
      );
      if (userUpdate == k500Error) return kInternalError;
      const updateMaster = await this.masterRepo.updateRowData(
        masterUpdatedData,
        masterData.id,
      );
      if (updateMaster === k500Error) return kInternalError;
      await this.sharedNotificationService.sendNotificationToUser({
        userList: [userId],
        title: kLoanDeclined,
        content: kInternalPolicy,
      });

      // Refresh user stage
      await this.userService.routeDetails({ id: userId });

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkAndRejectSteps(userId, reason) {
    try {
      const loanInclude = {
        attributes: ['id', 'loanStatus', 'bankingId'],
        model: loanTransaction,
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: [
          'id',
          'rejection',
          'dates',
          'coolOffData',
          'status',
          'workMailId',
          'salarySlipId',
          'empId',
        ],
        include: [loanInclude],
      };
      const options = {
        where: { id: userId },
        include: [masterInclude],
      };
      const attributes = [
        'id',
        'homeStatus',
        'quantity_status',
        'kycId',
        'selfieId',
      ];
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData && userData == k500Error) return kInternalError;
      //step rejection
      return await this.stapUpdate(userData, reason);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async stapUpdate(userData, rejectReason) {
    try {
      const masterData = userData.masterData;
      const loanData = masterData?.loanData;
      const workMailId = masterData?.workMailId;
      const salarySlipId = masterData?.salarySlipId;
      const empId = masterData?.empId;
      const bankId = loanData?.bankingId;
      const kycId = userData?.kycId;
      const selfieId = userData?.selfieId;
      const statusData = masterData.status;
      const rejection = masterData.rejection;
      const approvedStatus = [1, 2, 3, 4, 7, 8];
      const status = '2';
      if (!approvedStatus.includes(statusData.company)) {
        const update = { companyVerification: status, rejectReason };
        rejection.company = rejectReason;
        statusData.company = +status;
        await this.empRepo.updateRowData(update, empId);
      } else if (!approvedStatus.includes(statusData.salarySlip)) {
        const update = { status, rejectReason };
        rejection.salarySlip = rejectReason;
        statusData.salarySlip = +status;
        await this.salaryRepo.updateRowData(update, salarySlipId);
      } else if (!approvedStatus.includes(statusData.workMail)) {
        const update = { status, rejectReason };
        rejection.workMail = rejectReason;
        statusData.workMail = +status;
        await this.workMailRepo.updateRowData(update, workMailId);
      } else if (!approvedStatus.includes(statusData.bank)) {
        const update = { salaryVerification: status, rejectReason };
        rejection.banking = rejectReason;
        statusData.bank = +status;
        await this.bankRepo.update(update, bankId);
      } else if (!approvedStatus.includes(statusData.pan)) {
        const update = { panStatus: status, panRejectReason: rejectReason };
        rejection.pan = rejectReason;
        statusData.pan = +status;
        await this.kycRepo.updateRowData(update, kycId);
      } else if (!approvedStatus.includes(statusData.residence)) {
        const update = {
          homeStatus: status,
          residenceRejectReason: rejectReason,
        };
        statusData.residence = +status;
        rejection.residence = rejectReason;
        await this.userRepo.updateRowData(update, userData.id);
      } else if (!approvedStatus.includes(statusData.selfie)) {
        const update = { status, rejectReason };
        statusData.selfie = +status;
        rejection.selfie = rejectReason;
        await this.selfieRepo.updateRowData(update, selfieId);
      }
      await this.masterRepo.updateRowData(
        { status: statusData, rejection },
        masterData.id,
      );
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region -> Final approval
  // Total -> #05 steps
  async finalApproval(reqData) {
    // Params validation
    const adminId = reqData?.adminId;
    const approvedReason = reqData?.approvedReason;
    if (reqData?.status == 3 && !approvedReason)
      return kParamMissing('approvedReason');
    const status = +reqData.status;
    const reqFromUser = adminId == undefined || adminId == null;

    // #01 -> Get target loan data
    const masterData = await this.getDataForFinalApproval(reqData);
    if (masterData?.message) return masterData;
    const statusData = masterData?.status;
    const approvedStatus = [1, 3, 4];
    if (
      !approvedStatus.includes(statusData.bank) &&
      !(
        approvedStatus.includes(statusData.workEmail) &&
        approvedStatus.includes(statusData.salarySlip)
      )
    )
      return k422ErrorMessage(kNoDataFound);
    if (
      statusData.selfie != 1 &&
      statusData.selfie != 3 &&
      statusData.selfie != 2
    ) {
      // check selfie
      const selfieStatus: any =
        await this.commonService.validateWithAadhareImage(
          reqData.userId,
          statusData,
        );
      if (selfieStatus.message) return selfieStatus;
      statusData.selfie = selfieStatus;
      await this.masterRepo.updateRowData(
        { status: statusData },
        masterData?.id,
      );

      if (selfieStatus != 1) return { needUserInfo: true };
    }

    // Need to check PAN at this stage for new users
    if (statusData.pan != 1 && statusData.pan != 3) {
      const panResponse: any = await this.kycService.validatePan({
        userId: reqData.userId,
      });
      if (panResponse.message) return panResponse;
      statusData.pan = panResponse.panStatus;
      if (panResponse.panStatus != 1) return { needUserInfo: true };
    }

    //get isManual for move final approval
    const eligibilityDetails = masterData?.loanData?.eligibilityDetails;
    const isManual = eligibilityDetails?.isManual ?? true;
    // #02 -> Check automation for user
    let finalApproval = false;
    if (reqFromUser === true) {
      const predictionData = await this.predictionService.predictApproval({
        ...reqData,
        masterData,
      });
      if (predictionData.finalApproval === true) finalApproval = true;
    }
    // #03 -> Proceed for loan approval
    if (status === 3 || finalApproval === true || isManual == false) {
      const fApproval = await this.proceedForApproval({
        ...reqData,
        masterData,
        status: status ?? 1,
      });
      if (fApproval?.message) return fApproval;
    }

    // #04 -> Proceed for loan rejection
    else if (status === 2) {
      const rejectionResult = await this.rejectLoanFromAdmin(reqData);
      if (rejectionResult?.message) return rejectionResult;
    }

    // #05 -> Proceed for loan updation for manual verification
    else if (
      (finalApproval === false && reqFromUser === true) ||
      isManual == true
    ) {
      const updateResult = await this.proceedForManualVerification({
        ...reqData,
        masterData,
      });
      if (updateResult?.message) return updateResult;
    }

    return { needUserInfo: true };
  }

  // #01 -> Final approval -> Get data
  private async getDataForFinalApproval(reqData) {
    // Params validation
    const loanId = reqData.loanId;
    if (!loanId) return kParamMissing('loanId');
    if (isNaN(+loanId)) return kInvalidParamValue('loanId');
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    if (!IsUUID(userId)) return kInvalidParamValue('userId');

    // Query preparation
    const bankInclude: SequelOptions = { model: BankingEntity };
    bankInclude.attributes = [
      'disbursementBank',
      'mandateAccount',
      'mandateIFSC',
      'adminSalary',
      'salary',
    ];
    const loanInclude: SequelOptions = { model: loanTransaction };
    const userInclude: SequelOptions = {
      model: registeredUsers,
      attributes: ['id', 'fullName', 'fcmToken', 'completedLoans'],
      // Prevention
      where: { isBlacklist: { [Op.ne]: '1' } },
    };
    loanInclude.attributes = [
      'completedLoan',
      'eligibilityDetails',
      'id',
      'userId',
      'loan_disbursement_id',
      'netApprovedAmount',
    ];
    const cibiInlude = {
      model: CibilScoreEntity,
      attributes: [
        'cibilScore',
        'overdueBalance',
        'plScore',
        'totalOverdueDays',
        'PLAccounts',
        'inquiryPast30Days',
        'inquiryPast12Months',
      ],
    };
    loanInclude.include = [bankInclude, cibiInlude];
    loanInclude.where = { loanStatus: 'InProcess' };
    const include = [loanInclude, userInclude];
    const attributes = ['dates', 'id', 'loanId', 'otherInfo', 'status'];
    const options = {
      include,
      where: { loanId },
      order: [['id', 'desc']],
    };
    // Query
    const masterData = await this.repoManager.getRowWhereData(
      MasterEntity,
      attributes,
      options,
    );

    // Query validation
    if (masterData == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (masterData?.loanData?.loan_disbursement_id)
      return k422ErrorMessage('Loan disbursement is in progress.');

    return masterData;
  }

  // #02 -> Approve loan application
  private async proceedForApproval(reqData) {
    // Params preparation
    const masterData = reqData.masterData ?? {};
    const userData = masterData.userData;
    const loanData = masterData.loanData ?? {};
    const bankingData = loanData.bankingData ?? {};
    const userId = reqData.userId;
    const approvedReason = reqData?.approvedReason;
    const adminId = reqData.adminId ?? SYSTEM_ADMIN_ID;
    const manualVerification = adminId == SYSTEM_ADMIN_ID ? '1' : '3';
    const manualVerificationAcceptId = adminId;
    const statusData = masterData.status;
    const dates = masterData.dates;
    dates.eligibility = new Date().getTime();
    dates.loan = new Date().getTime();
    const disbBank = bankingData?.disbursementBank;
    const netApprovedAmount = !isNaN(loanData?.netApprovedAmount)
      ? parseInt(loanData?.netApprovedAmount)
      : null;
    // IFSC validation
    const ifscCode = bankingData.mandateIFSC ?? '';
    const ifscDetails = await this.razorpayService.getIFSCDetails({
      ifsc: ifscCode,
    });
    if (ifscDetails.message) return ifscDetails;

    // Bank validation
    // i.e. DEAUCHE BANK, etc which is not available for disbursement
    if (manualBanksList.includes(disbBank) && adminId != SYSTEM_ADMIN_ID)
      return k422ErrorMessage(`Can not proceed with: ${disbBank}`);

    let updatedData: any = {};
    updatedData = {
      manualVerification,
      manualVerificationAcceptId,
      verifiedDate: this.typeService.getGlobalDate(new Date()).toJSON(),
    };
    if (approvedReason) updatedData.approvedReason = approvedReason;

    // Check previous mandate
    const mandateData = await this.mandateService.checkExistingStatus(
      null,
      null,
      bankingData.mandateAccount,
      userId,
      netApprovedAmount > 50000 ? netApprovedAmount : null,
    );
    if (mandateData?.message) return mandateData;
    const statuses = [
      'ACTIVE',
      'BANK_APPROVAL_PENDING',
      'ON_HOLD',
      'Registered',
    ];
    if (
      mandateData &&
      statuses.includes(mandateData.status) &&
      !loanData.subscriptionId
    ) {
      updatedData.subscriptionId = mandateData.id;
      statusData.eMandate = 1;
      if (mandateData.createdAt)
        dates.eMandate = mandateData.createdAt.getTime();
    }

    // Update loan record
    let updateResponse = await this.repoManager.updateRowData(
      loanTransaction,
      updatedData,
      loanData.id,
    );
    if (updateResponse === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    // Update master record
    statusData.loan = +manualVerification;
    statusData.eligibility = +manualVerification;
    updateResponse = await this.repoManager.updateRowData(
      MasterEntity,
      { status: statusData, dates },
      masterData.id,
    );
    if (updateResponse === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    // Push notification
    const fcmKey = userData.fcmToken;
    const title = kFinalLoanAcceptTitle;
    const body = kFinalLoanAcceptBody;
    this.sharedNotificationService.sendPushNotification(
      fcmKey,
      title,
      body,
      {},
      true,
      adminId,
    );

    return {};
  }

  // #04 -> decline loan application
  async rejectLoanFromAdmin(body): Promise<any> {
    // Params prepare and validation
    const remark = body.remark;
    const adminId = body.adminId;
    const loanId = body?.loanId;
    const userId = body?.userId;
    const nextDateForApply = body?.nextDateForApply;
    const declineId = body.declineId;
    if (!adminId) return kParamMissing('adminId');
    if (!loanId) return kParamMissing('loanId');

    const masterData = await this.getLoanData(body);
    if (!masterData || masterData.message)
      return k422ErrorMessage('Loan data not found!');
    else if (masterData) {
      const loanData = masterData.loanData;
      if (loanData?.loan_disbursement_id)
        return k422ErrorMessage('Disbursement initiated!');
      await this.rejectLoan(
        adminId,
        loanId,
        remark,
        userId,
        nextDateForApply,
        declineId,
        false,
      );
      const reasonData: any = await this.reasonRepo.getRowWhereData(
        ['id', 'reason'],
        { where: { id: declineId } },
      );
      const reason = reasonData?.reason;
      return await this.checkAndRejectSteps(userId, reason);
    }
    return true;
  }

  // #05 -> Proceed for loan updation
  private async proceedForManualVerification(reqData) {
    // Params validation
    const masterData = reqData.masterData;
    const loanId = masterData.loanId;
    if (!loanId) return kParamMissing('loanId');
    const masterId = masterData.id;
    if (!masterId) return kParamMissing('masterId');

    // Update loan record
    let updatedData: any = { manualVerification: '0' };
    let updatedResult = await this.repoManager.updateRowData(
      loanTransaction,
      updatedData,
      loanId,
    );
    if (updatedResult === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    // Update master record
    const statusData = masterData?.status;
    statusData.loan = 0;
    statusData.eligibility = 0;
    updatedResult = await this.repoManager.updateRowData(
      MasterEntity,
      { status: statusData },
      masterId,
    );
    if (updatedResult === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    return statusData;
  }
  //#endregion -> Final approval

  private async getLoanData(reqData) {
    try {
      const loanId = reqData.loanId;
      const loanInclude: any = { model: loanTransaction };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'fcmToken'],
      };
      loanInclude.attributes = ['id', 'userId', 'loan_disbursement_id'];
      const include = [loanInclude, userInclude];
      const attributes = ['dates', 'id', 'loanId', 'status'];
      const options: any = {
        include,
        where: {
          loanId,
          'status.loan': { [Op.notIn]: [6, 7] },
        },
      };
      const masterList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;
      return masterList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async autoDeclineLoanAfter7Day(query) {
    try {
      const type = query?.type;
      const attributes = [
        'id',
        'manualVerificationAcceptId',
        'userId',
        'appType',
      ];
      const toDay = new Date();
      const finalDate = new Date(new Date().setDate(toDay.getDate() - 10));
      const options = {
        where: {
          esign_id: { [Op.eq]: null },
          loanStatus: { [Op.or]: ['InProcess', 'Accepted'] },
          createdAt: { [Op.lte]: finalDate },
        },
      };
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (!loanData || loanData === k500Error) return kInternalError;
      if (type != 'NOTIFICATION') {
        for (let index = 0; index < loanData.length; index++) {
          try {
            const loan = loanData[index];
            const id = loan?.id;
            const userId = loan?.userId;
            const adminId = SYSTEM_ADMIN_ID;
            const remark = 'Inactive User response';
            await this.rejectLoan(adminId, id, remark, userId);
          } catch (error) {}
        }
      } else {
        const tempOpt = { where: { subType: 'BEFORE_LOAN_DECLINE' } };
        const template = await this.templateRepo.getRowWhereData(
          ['id'],
          tempOpt,
        );
        if (template === k500Error) return kInternalError;
        if (!template) return k422ErrorMessage(kNoTemplateFound);
        const data = { userData: loanData, id: template?.id, isMsgSent: true };
        return await this.sharedNotificationService.sendNotificationToUser(
          data,
        );
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region Scoring
  async calculateScore(reqData) {
    try {
      // Params validation
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      if (type != kUsrCategories) return kInvalidParamValue('type');

      let scoreData;
      // User categorization
      if (type == kUsrCategories)
        scoreData = await this.getUserCategorizationScore(reqData);

      if (scoreData?.message) return scoreData;

      return scoreData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getUserCategorizationScore(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      const migrate = reqData?.migrate == true ? true : false;
      if (loanId) {
        // Table joins
        const kycInclude: any = { model: KYCEntity };
        kycInclude.attributes = ['aadhaarDOB'];
        const workMailInclude: any = { model: WorkMailEntity };
        workMailInclude.attributes = ['status'];
        const empInclude: any = { model: employmentDetails };
        empInclude.attributes = ['startDate', 'companyName'];
        empInclude.include = [workMailInclude];
        const userInclude: any = { model: registeredUsers };
        userInclude.attributes = ['id'];
        userInclude.include = [empInclude, kycInclude];
        const bankingInclude: any = { model: BankingEntity };
        bankingInclude.attributes = ['accountNumber', 'salary'];
        const include = [bankingInclude, userInclude];
        const attributes = ['loanStatus', 'netScore'];
        const options = { include, where: { id: loanId } };
        const loanData = await this.loanRepo.getRowWhereData(
          attributes,
          options,
        );
        if (loanData == k500Error) return kInternalError;
        if (loanData.loanStatus == 'Rejected')
          return k422ErrorMessage(
            'Request can not be completed due to loan is rejected',
          );
        if (loanData.loanStatus == 'Active' && !migrate)
          return k422ErrorMessage(
            'Request can not be completed due to loan is active',
          );

        const userData = loanData.registeredUsers ?? {};
        const userId = userData.id;
        // Age
        const kycData = userData.kycData ?? {};
        let dob = await this.typeService.getDateAsPerAadhaarDOB(
          kycData.aadhaarDOB,
        );
        if (!dob) return kParamMissing('age');

        dob += kGlobalTrail;
        reqData.age = this.typeService.dateDifference(
          new Date(dob),
          new Date(),
          'Years',
        );
        // Net score
        reqData.netScore = loanData.netScore;
        // Banking params -> AvgBalance, Ecs, LoanApps, Salary
        const bankingData = loanData.bankingData ?? {};
        const accNumber = bankingData.accountNumber;
        if (!accNumber) return kParamMissing('bankingData');
        // Find query for banking data
        const url = await this.commonService.getTansactionQueryParams(loanId);
        if (url?.message) return url;
        const transData = await this.authAi.getCompareAccounts(url);
        if (!transData.valid) return kParamMissing('bankingData');

        const transList = transData.transactionJson;
        if (!transList) return kParamMissing('bankingData');
        // AvgBalance
        const avgBalance = transData.summary?.monthlyAvgBal?.average;
        if (!avgBalance) return kParamMissing('avgBalance');
        reqData.avgBalance = avgBalance;
        // Ecs
        reqData.ecs = transList.filter(
          (el) => el.category == 'ECS/CHQ RETURN CHARGES',
        ).length;
        // LoanApps
        const loanApps = ['bajaj', 'aditya', 'hdb', 'incred', 'early', 'fibe'];
        const totalLoans = transList.filter((el) => {
          try {
            if (el.type == 'CREDIT') {
              let loanFound = false;
              for (let index = 0; index < loanApps.length; index++) {
                const text = loanApps[index];
                if (el.description?.toLowerCase().includes(text)) {
                  loanFound = true;
                  break;
                }
              }
              if (loanFound) return true;
            }
          } catch (e) {}
        }).length;
        reqData.loanApps = totalLoans > 0;
        // Salary
        if (bankingData.salary === undefined) return kParamMissing('salary');
        reqData.salary = Math.floor(bankingData.salary);
        // Employment params -> Employment tenure, Work mail status
        const empData = userData?.employmentData;
        let empStartDate = empData?.startDate;
        if (!empStartDate) {
          const companyName = empData?.companyName;
          const ops = {
            where: { companyName, userId, startDate: { [Op.ne]: null } },
          };
          const empmt = await this.empRepo.getRowWhereData(['startDate'], ops);
          if (empmt === k500Error) return kInternalError;
          if (empmt) empStartDate = empmt?.startDate;
          if (!empStartDate) {
            const empHis = await this.empHistoryRepo.getRowWhereData(
              ['startDate'],
              ops,
            );
            if (empHis === k500Error) return kInternalError;
            if (empHis) empStartDate = empHis?.startDate;
          }
          if (!empStartDate) {
            const crOps = { where: { companyName, userId } };
            const empCrt = await this.empRepo.getRowWhereData(
              ['createdAt'],
              crOps,
            );
            if (empCrt === k500Error) return kInternalError;
            if (empCrt) empStartDate = empCrt?.createdAt;
          }
        }
        if (!empStartDate) return kParamMissing('employmentTenure');
        reqData.employmentTenure = this.typeService.dateDifference(
          empStartDate,
          new Date(),
          'Years',
        );
        const workMailData = empData.workMail ?? {};
        if (!workMailData.status) return kParamMissing('workMailVerification');
        reqData.workMailVerification =
          workMailData.status == '1' || workMailData.status == '3';
      }

      if (reqData.age === undefined) return kParamMissing('age');
      if (reqData.netScore === undefined) return kParamMissing('netScore');
      if (reqData.avgBalance === undefined) return kParamMissing('avgBalance');
      if (reqData.ecs === undefined) return kParamMissing('ecs');
      if (reqData.loanApps === undefined) return kParamMissing('loanApps');
      if (reqData.salary === undefined) return kParamMissing('salary');
      if (reqData.employmentTenure === undefined)
        return kParamMissing('employmentTenure');
      if (reqData.workMailVerification === undefined)
        return kParamMissing('workMailVerification');

      const scoreData: any = await this.getScoreData(reqData);
      if (scoreData?.message) return scoreData;

      let changeReason = '';
      let categoryScoreData = await this.getScoreData({
        userCategorization: scoreData.totalScore,
      });
      if (categoryScoreData.message) return categoryScoreData;
      if (categoryScoreData?.userCategorization?.score == kHighRisk) {
        let salary = reqData.salary;
        if (typeof salary == 'string') salary = +salary;
        let avgBalance = reqData.avgBalance;
        if (typeof avgBalance == 'string') avgBalance = +avgBalance;
        if (salary >= 70000 || avgBalance >= 10000) {
          categoryScoreData = {
            userCategorization: {
              score: kModerateRisk,
              value: categoryScoreData?.userCategorization?.value,
            },
            totalScore: categoryScoreData.totalScore,
          };
          if (salary >= 70000) changeReason = 'Salary more than 70k';
          if (avgBalance >= 10000) changeReason = 'Avg balance more than 10k';
        }
      }

      const finalizedData = {
        ...scoreData,
        ...categoryScoreData,
        changeReason,
      };
      finalizedData.category = finalizedData.totalScore;
      delete finalizedData.totalScore;
      finalizedData.totalValue = finalizedData.userCategorization?.value;
      delete finalizedData.userCategorization;
      const updateScore = reqData.updateScore?.toString() != 'false';

      // Update prediction data
      if (updateScore && reqData.loanId) {
        const attributes = ['id'];
        const options = { where: { loanId: reqData.loanId } };
        const predictionData = await this.predictionRepo.getRowWhereData(
          attributes,
          options,
        );
        if (predictionData == k500Error) return kInternalError;
        if (!predictionData) return k422ErrorMessage(kNoDataFound);

        const updatedData = {
          categorizationTag: finalizedData.category,
          categorizationScore: finalizedData.totalValue,
          categorizationDetails: finalizedData,
        };
        const updateResponse = await this.predictionRepo.updateRowData(
          updatedData,
          predictionData.id,
        );
        if (updateResponse == k500Error) return kInternalError;
        return finalizedData;
      } else
        return {
          ...finalizedData,
          categorizationTag: finalizedData.category,
          categorizationScore: finalizedData.totalValue,
          categorizationDetails: finalizedData,
        };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getScoreData(reqData) {
    try {
      let rawJsonData = await this.redisService.get(kKeyScoreData);
      if (!rawJsonData) {
        const staticData = await this.staticRepo.getRowWhereData(['data'], {
          where: { type: kKeyScoreData },
        });
        if (staticData == k500Error) return kInternalError;
        if (!staticData) return k422ErrorMessage(kNoActiveScoreFound);
        const data = staticData.data ?? [];
        if (data?.length == 0) return k422ErrorMessage(kNoActiveScoreFound);
        rawJsonData = data[0];
        await this.redisService.set(kKeyScoreData, rawJsonData);
      }
      const jsonData = JSON.parse(rawJsonData);

      // Get active score
      let activeScoreData;
      for (const key in jsonData) {
        try {
          if (jsonData[key]['active'] == true) {
            delete jsonData[key]['active'];
            activeScoreData = jsonData[key];
            break;
          }
        } catch (error) {}
      }
      if (!activeScoreData) return k422ErrorMessage(kNoActiveScoreFound);

      // Calculate required score
      let totalScore: number | string = 0;
      const scoreInsights: any = {};
      for (const key in reqData) {
        try {
          const scoreRange = activeScoreData[key];
          if (!scoreRange) continue;

          let value = reqData[key];
          const ranges = scoreRange.ranges;
          const scores = scoreRange.scores;
          if (!ranges || !scores) continue;
          if (ranges.length != scores.length) continue;
          const fallbackScore = scoreRange.fallbackScore;

          for (let index = 0; index < ranges.length; index++) {
            try {
              const rangeData = ranges[index];
              // Number range
              if (typeof rangeData == 'object' && rangeData.length == 2) {
                const minScore = rangeData[0];
                const maxScore = rangeData[1];

                // For number range
                if (
                  typeof minScore == 'number' &&
                  typeof maxScore == 'number'
                ) {
                  if (typeof value == 'string') value = +value;
                  if (value >= minScore && value <= maxScore) {
                    const score = scores[index];
                    if (typeof score == 'string') totalScore = score;
                    else totalScore += score;
                    scoreInsights[key] = { score, value };
                    break;
                  }
                }
              }
              // Boolean range
              else if (typeof rangeData == 'boolean') {
                if (rangeData == value || rangeData.toString() == value) {
                  totalScore += scores[index];
                  scoreInsights[key] = {
                    score: scores[index],
                    value: rangeData,
                  };
                  break;
                }
              }
            } catch (error) {}
          }

          // Fallback scenario
          if (!scoreInsights[key]) {
            if (typeof fallbackScore == 'string') totalScore = fallbackScore;
            else totalScore += fallbackScore;
            scoreInsights[key] = { score: fallbackScore, value };
          }
        } catch (error) {}
      }

      scoreInsights.totalScore = totalScore;
      return scoreInsights;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async changeScoreJson(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const targetData = reqData.scoreData;
      if (!targetData) return kParamMissing('scoreData');

      const attributes = ['fullName'];
      const options = { where: { id: adminId } };
      const adminData = await this.adminRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!adminData) return k422ErrorMessage(kNoDataFound);
      if (adminData == k500Error) return kInternalError;

      const staticData = await this.staticRepo.getRowWhereData(['data'], {
        where: { type: kKeyScoreData },
      });
      if (staticData == k500Error) return kInternalError;
      if (!staticData) return k422ErrorMessage(kNoActiveScoreFound);
      const data = staticData.data ?? [];
      if (data?.length == 0) return k422ErrorMessage(kNoActiveScoreFound);
      let scoreData = data[0];
      if (scoreData == null) scoreData = {};
      else scoreData = JSON.parse(scoreData);
      let targetIndex = 0;
      for (const key in scoreData) {
        try {
          targetIndex = +key;
          if (reqData.addScore == true) scoreData[key].active = false;
        } catch (error) {}
      }

      if (reqData.addScore == true) {
        targetIndex += 1;
        targetData.adminId = adminId;
        targetData.lastUpdatedAt = this.typeService.getGlobalDate(new Date());
        targetData.active = true;
        scoreData[targetIndex] = targetData;
      }

      await this.redisService.set(kKeyScoreData, JSON.stringify(scoreData));
      const updateResponse = await this.staticRepo.updateRowWhereData(
        { data: [JSON.stringify(scoreData)] },
        { where: { type: kKeyScoreData } },
      );
      if (updateResponse == k500Error) return kInternalError;
      // No score data exists in database, Need to create one
      if (updateResponse.toString() == '0') {
        const createdResponse = await this.staticRepo.createRowWhereData({
          type: kKeyScoreData,
          data: [JSON.stringify(scoreData)],
        });
        if (createdResponse == k500Error) return kInternalError;
      }
      return scoreData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion Scoring

  async nameValidation(userId) {
    // find user
    try {
      let checkNameValidation = await this.redisService.get('NAME_VALIDATION');
      if (checkNameValidation == false || checkNameValidation == 'false')
        return true;
      const att = ['id', 'completedLoans', 'fullName', 'masterId', 'appType'];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(att, options);
      if (!userData) return k422ErrorMessage('User not found');
      /// if user if new then we check other skip this condition
      if ((userData?.completedLoans ?? 0) > 0) return true;

      const body = { name: userData.fullName };
      const appType = userData?.appType;
      const baseUrl = this.commonService.getPythonBaseUrl(appType);
      const url = baseUrl + 'v2/address/names';
      const nameOutput = await this.apiService.requestPost(url, body);
      if (nameOutput) {
        if (nameOutput?.valid == true) {
          if (
            nameOutput?.data.type == 'M' &&
            nameOutput?.data.prob > NAME_VALIDATE
          ) {
            // return k422ErrorMessage('Name not valid');
            const adminId = SYSTEM_ADMIN_ID;
            const remark = APPROVED_SALARY_IS_NOT_MATCH_WITH_AREA;
            const masterData = await this.masterRepo.getRowWhereData(
              ['loanId', 'rejection'],
              {
                where: { id: userData.masterId },
              },
            );
            const updateRejection = {
              rejection: {
                ...(masterData.rejection ?? {}),
                nameValidType: nameOutput?.data.type,
                nameValidProb: nameOutput?.data.prob,
              },
            };
            await this.masterRepo.updateRowData(
              updateRejection,
              userData.masterId,
            );
            if (masterData?.loanId)
              await this.rejectLoan(
                adminId,
                masterData?.loanId,
                remark,
                userId,
              );
            await this.checkAndRejectSteps(userId, remark);
            const update = { isBlacklist: '1' };
            await this.userRepo.updateRowData(update, userId);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  async assignToAdmin(loanId, type = FINALBUCKETADMINS) {
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      ['id', 'manualVerification', 'loanStatus', 'masterId'],
      { where: { id: loanId } },
    );
    if (!loanData && loanData === k500Error) return k500Error;
    const loanStatus = loanData?.loanStatus;
    if (loanStatus != 'Accepted' && loanStatus != 'InProcess') return false;
    const adminId = await this.assignmentService.checkAdminDataFetch(
      type,
      true,
    );
    if (adminId == k500Error) return k500Error;
    const updateRes = await this.loanRepo.updateRowData(
      { assignTo: adminId },
      loanId,
    );
    if (updateRes === k500Error) return k500Error;
    await this.masterRepo.updateRowData(
      { loanAssingId: adminId },
      loanData.masterId,
    );
    return updateRes;
  }

  async nbfcFirstvalidateEligiblityForLoan(reqData) {
    try {
      const category = reqData?.category;
      const loanId = reqData?.loanId;
      const userId = reqData?.userId;
      let salary = reqData?.salary ?? 0;
      const accounts = reqData?.accounts ?? [];
      const overduePast12Months = accounts?.filter((el) => {
        const dateReported =
          this.typeService.strDateToDate(el?.dateReported) ?? '-';

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        const isWithinLast12Months =
          new Date(dateReported).getTime() > twelveMonthsAgo.getTime();

        if (isWithinLast12Months && el.lastDelayDays > 0) {
          return el;
        }
      });
      const cibilScore = reqData.cibilScore ?? 0;
      const plScore = reqData.plScore ?? 0;

      const PLAccounts = reqData?.PLAccounts ?? 0;
      const inquiryPast30Days = reqData?.inquiryPast30Days ?? 0;
      let isEligible = true;
      let eligibleAmount = 0;
      let interestRate = 0.099;
      let isManual = false;
      let portion = 0;
      let tag;
      let overdueAmount = reqData?.overdueBalance ?? 0;
      const completedLoans = reqData.completedLoans ?? 0;
      let isPLExceptionUser =
        completedLoans >= GLOBAL_RANGES.PL_EXCEPTION_MIN_COMPLETED_LOANS;

      // for high risk dont touch it
      let MIN_CIBIL_SCORE = GLOBAL_RANGES.MIN_IDEAL_CIBIL_SCORE;
      let MIN_PL_SCORE = GLOBAL_RANGES.MIN_IDEAL_PL_SCORE;
      let MAX_LOAN_AMOUNT = GLOBAL_RANGES.MAX_LOAN_AMOUNT;

      // Decreasing Max Loan Amount
      if (
        !isPLExceptionUser
          ? salary <= 100000 || cibilScore < 765 || plScore < 765
          : cibilScore < 765 || salary <= 100000
      )
        MAX_LOAN_AMOUNT = 100000;

      const MAX_CIBIL_SCORE = 749;
      const MAX_PL_SCORE = 749;

      if (salary >= GLOBAL_RANGES.MAX_SALARY_AMOUNT) {
        MIN_CIBIL_SCORE = 680;
        MIN_PL_SCORE = 680;
      }

      if (
        !isPLExceptionUser
          ? cibilScore == -1 ||
            plScore == -1 ||
            salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT
          : cibilScore == -1 || salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT
      ) {
        isEligible = false;
      }
      if (
        !isPLExceptionUser &&
        PLAccounts == 0 &&
        overduePast12Months.length > 0
      ) {
        isEligible = false;
      } else if (inquiryPast30Days > MAX_INQUIRY_PAST_30_DAYS) {
        if (
          !isPLExceptionUser
            ? cibilScore < MIN_CIBIL_SCORE || plScore < MIN_PL_SCORE
            : cibilScore < MIN_CIBIL_SCORE
        ) {
          isEligible = false;
        } else isManual = true;
      }
      const year = 365;
      let anumm = 0;

      // if isPLExceptionUser is false then pl logic effect otherwise no effect pl logic
      //for low risk but premium profile
      if (
        !isPLExceptionUser
          ? (plScore > GLOBAL_RANGES.MAX_PREMIUM_PL_SCORE &&
              cibilScore > GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'PREMIUM'
          : (cibilScore > GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary > GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'PREMIUM'
      ) {
        portion = 100;
        anumm = 28;
        tag = 3;
      }
      //for low risk
      else if (
        !isPLExceptionUser
          ? (plScore >= GLOBAL_RANGES.MAX_IDEAL_PL_SCORE &&
              plScore <= GLOBAL_RANGES.MAX_PREMIUM_PL_SCORE &&
              cibilScore >= GLOBAL_RANGES.MAX_IDEAL_CIBIL_SCORE &&
              cibilScore <= GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'LOW'
          : (cibilScore >= GLOBAL_RANGES.MAX_IDEAL_CIBIL_SCORE &&
              cibilScore <= GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'LOW'
      ) {
        anumm = 31;
        portion = 100;
        tag = 0;
      }
      //for medium risk
      else if (
        !isPLExceptionUser
          ? (cibilScore >= 750 &&
              cibilScore <= 799 &&
              plScore >= 750 &&
              plScore <= 799) ||
            category == 'MEDIUM'
          : (cibilScore >= 750 && cibilScore <= 799) || category == 'MEDIUM'
      ) {
        //for +1lac
        if (salary >= GLOBAL_RANGES.MAX_SALARY_AMOUNT) {
          portion = 100;
          anumm = 32;
        }
        //for +75K betwwen 1lac
        else if (salary >= 75000 && salary <= GLOBAL_RANGES.MAX_SALARY_AMOUNT) {
          portion = 100;
          anumm = 33;
        }
        //for +50K betwwen 75k
        else if (salary >= 50000 && salary < 75000) {
          portion = 100;
          anumm = 34;
        }
        //for less than 50K
        else if (salary < 50000) {
          portion = 100;
          anumm = 35;
        }
        tag = 1;
      }
      //for high risk
      else if (
        !isPLExceptionUser
          ? (cibilScore >= MIN_CIBIL_SCORE &&
              cibilScore <= MAX_CIBIL_SCORE &&
              plScore >= MIN_PL_SCORE &&
              plScore <= MAX_PL_SCORE) ||
            category == 'HIGH'
          : (cibilScore >= MIN_CIBIL_SCORE && cibilScore <= MAX_CIBIL_SCORE) ||
            category == 'HIGH'
      ) {
        anumm = 36.5;
        portion = 75;
        tag = 2;
      } else {
        if (
          !isPLExceptionUser
            ? cibilScore < MIN_CIBIL_SCORE || plScore < MIN_PL_SCORE
            : cibilScore < MIN_CIBIL_SCORE
        ) {
          isEligible = false;
        }

        if (!reqData.forcefull && isEligible) {
          reqData.forcefull = true;
          reqData.category = this.checkCategory(reqData, isPLExceptionUser);
          return await this.nbfcFirstvalidateEligiblityForLoan(reqData);
        }
      }

      if (overdueAmount > 0) isManual = true;
      interestRate = +(anumm / year).toFixed(3);
      eligibleAmount = (salary * portion) / 100;
      if (eligibleAmount > MAX_LOAN_AMOUNT) eligibleAmount = MAX_LOAN_AMOUNT;

      let intrestPerAnnum = Math.round(eligibleAmount * interestRate);
      eligibleAmount =
        Math.round(eligibleAmount / GLOBAL_RANGES.SLIDER_AMOUNT_SLAB) *
        GLOBAL_RANGES.SLIDER_AMOUNT_SLAB;

      const options = {
        where: { id: loanId },
      };
      //get loan data for update data
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'eligibilityDetails'],
        options,
      );

      if (loanData == k500Error) throw new Error();
      let eligibilityDetails: any = loanData?.eligibilityDetails;
      eligibilityDetails.isManual = isManual;
      eligibilityDetails.anummIntrest = anumm;
      eligibilityDetails.portion = portion;

      const updateLoanData = {
        interestRate,
        eligibilityDetails,
        categoryTag: tag,
      };
      // add isManual in eligibilityDetails for use other place
      const updateData = await this.loanRepo.updateRowData(
        updateLoanData,
        loanId,
      );
      if (updateData == k500Error) throw new Error();
      return {
        loanId,
        userId,
        eligibleAmount,
        interestRate,
        isEligible,
        anummIntrest: anumm,
        intrestPerAnnum,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async nbfcSecondvalidateEligiblityForLoan(reqData) {
    try {
      const category = reqData?.category;
      const loanId = reqData?.loanId;
      const userId = reqData?.userId;
      let salary = reqData?.salary ?? 0;
      const accounts = reqData?.accounts ?? [];
      const overduePast12Months = accounts?.filter((el) => {
        const dateReported =
          this.typeService.strDateToDate(el?.dateReported) ?? '-';

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        const isWithinLast12Months =
          new Date(dateReported).getTime() > twelveMonthsAgo.getTime();

        if (isWithinLast12Months && el.lastDelayDays > 0) {
          return el;
        }
      });
      const cibilScore = reqData.cibilScore ?? 0;
      const plScore = reqData.plScore ?? 0;
      const PLAccounts = reqData?.PLAccounts ?? 0;
      const inquiryPast30Days = reqData?.inquiryPast30Days ?? 0;
      let isEligible = true;
      let eligibleAmount = 0;
      let interestRate = 0.099;
      let isManual = false;
      let portion = 0;
      let tag;
      let overdueAmount = reqData?.overdueBalance ?? 0;
      const completedLoans = reqData.completedLoans ?? 0;
      const isPLExceptionUser =
        completedLoans >= GLOBAL_RANGES.PL_EXCEPTION_MIN_COMPLETED_LOANS;

      // for high risk dont touch it
      let MIN_CIBIL_SCORE = GLOBAL_RANGES.MIN_IDEAL_CIBIL_SCORE;
      let MIN_PL_SCORE = GLOBAL_RANGES.MIN_IDEAL_PL_SCORE;
      const MAX_CIBIL_SCORE = 749;
      const MAX_PL_SCORE = 749;

      if (
        !isPLExceptionUser
          ? cibilScore == -1 ||
            plScore == -1 ||
            salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT
          : cibilScore == -1 || salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT
      ) {
        isEligible = false;
      }

      if (
        !isPLExceptionUser &&
        PLAccounts == 0 &&
        overduePast12Months.length > 0
      ) {
        isEligible = false;
      } else if (inquiryPast30Days > MAX_INQUIRY_PAST_30_DAYS) {
        if (
          !isPLExceptionUser
            ? cibilScore < MIN_CIBIL_SCORE || plScore < MIN_PL_SCORE
            : cibilScore < MIN_CIBIL_SCORE
        ) {
          isEligible = false;
        } else isManual = true;
      }

      if ((plScore < 700 || cibilScore < 700) && salary < 40000) {
        isEligible = false;
      } else isManual = true;

      const year = 365;
      let anumm = 0;

      // if isPLExceptionUser is false then pl logic effect otherwise no effect pl logic
      //for low risk but premium profile
      if (
        !isPLExceptionUser
          ? (plScore > GLOBAL_RANGES.MAX_PREMIUM_PL_SCORE &&
              cibilScore > GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'PREMIUM'
          : (cibilScore > GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary > GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'PREMIUM'
      ) {
        portion = 75;
        anumm = 28;
        tag = 3;
      } //for low risk
      else if (
        !isPLExceptionUser
          ? (plScore >= GLOBAL_RANGES.MAX_IDEAL_PL_SCORE &&
              plScore <= GLOBAL_RANGES.MAX_PREMIUM_PL_SCORE &&
              cibilScore >= GLOBAL_RANGES.MAX_IDEAL_CIBIL_SCORE &&
              cibilScore <= GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'LOW'
          : (cibilScore >= GLOBAL_RANGES.MAX_IDEAL_CIBIL_SCORE &&
              cibilScore <= GLOBAL_RANGES.MAX_PREMIUM_CIBIL_SCORE &&
              salary >= GLOBAL_RANGES.MIN_SALARY_AMOUNT) ||
            category == 'LOW'
      ) {
        portion = 75;
        anumm = 36;
        tag = 0;
      }
      //for medium risk
      else if (
        !isPLExceptionUser
          ? (cibilScore >= 750 &&
              cibilScore <= 799 &&
              plScore >= 750 &&
              plScore <= 799) ||
            category == 'MEDIUM'
          : (cibilScore >= 750 && cibilScore <= 799) || category == 'MEDIUM'
      ) {
        portion = 75;
        anumm = 72;
        tag = 1;
      }
      //for high risk
      else if (
        !isPLExceptionUser
          ? (cibilScore >= MIN_CIBIL_SCORE &&
              cibilScore <= MAX_CIBIL_SCORE &&
              plScore >= MIN_PL_SCORE &&
              plScore <= MAX_PL_SCORE) ||
            category == 'HIGH'
          : (cibilScore >= MIN_CIBIL_SCORE && cibilScore <= MAX_CIBIL_SCORE) ||
            category == 'HIGH'
      ) {
        portion = 50;
        anumm = 108;
        tag = 2;
      } else {
        if (
          !isPLExceptionUser
            ? cibilScore < MIN_CIBIL_SCORE || plScore < MIN_PL_SCORE
            : cibilScore < MIN_CIBIL_SCORE
        ) {
          isEligible = false;
        }

        if (!reqData.forcefull && isEligible) {
          reqData.forcefull = true;
          reqData.category = this.checkCategory(reqData, isPLExceptionUser);
          return await this.nbfcSecondvalidateEligiblityForLoan(reqData);
        }
      }

      if (overdueAmount > 0) isManual = true;
      interestRate = +(anumm / year).toFixed(3);
      eligibleAmount = (salary * portion) / 100;
      if (eligibleAmount > GLOBAL_RANGES.MAX_LOAN_AMOUNT)
        eligibleAmount = GLOBAL_RANGES.MAX_LOAN_AMOUNT;
      let intrestPerAnnum = Math.round(eligibleAmount * interestRate);
      eligibleAmount =
        Math.round(eligibleAmount / GLOBAL_RANGES.SLIDER_AMOUNT_SLAB) *
        GLOBAL_RANGES.SLIDER_AMOUNT_SLAB;

      const options = {
        where: { id: loanId },
      };
      //get loan data for update data
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'eligibilityDetails'],
        options,
      );

      if (loanData == k500Error) throw new Error();
      let eligibilityDetails: any = loanData?.eligibilityDetails;
      eligibilityDetails.isManual = isManual;
      eligibilityDetails.anummIntrest = anumm;
      eligibilityDetails.portion = portion;

      const updateLoanData = {
        interestRate,
        eligibilityDetails,
        categoryTag: tag,
      };
      // add isManual in eligibilityDetails for use other place
      const updateData = await this.loanRepo.updateRowData(
        updateLoanData,
        loanId,
      );
      if (updateData == k500Error) throw new Error();
      return {
        loanId,
        userId,
        eligibleAmount,
        interestRate,
        isEligible,
        anummIntrest: anumm,
        intrestPerAnnum,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private checkCategory(reqData, isPLExceptionUser) {
    try {
      const cibilScore = reqData.cibilScore ?? 0;
      const plScore = reqData?.plScore ?? 0;
      let category: any;
      for (const [key, value] of Object.entries(GLOBAL_RANGES.RISK_CATEGORY)) {
        if (
          !isPLExceptionUser
            ? cibilScore <= value.maxValue || plScore <= value.maxValue
            : cibilScore <= value.maxValue
        ) {
          category = key;
          break;
        }
      }
      return category;
    } catch (error) {}
  }

  async assignToCa(loanIds) {
    const loanData = await this.repoManager.getTableWhereData(
      loanTransaction,
      ['id', 'loanStatus'],
      {
        where: {
          id: {
            [Op.in]: loanIds,
          },
          loanStatus: {
            [Op.or]: [{ [Op.eq]: 'InProcess' }, { [Op.eq]: 'Accepted' }],
          },
        },
      },
    );
    if (!loanData || loanData === k500Error) return k500Error;
    const data = await this.assignmentService.fetchadmins(
      loanData,
      'CREDITANALYST',
      'CA_LAST_UPDATE_INDEX',
    );
    if (!data) return k500Error;
    const query = data
      .map(
        (entry) =>
          `UPDATE public."loanTransactions" SET "assignTo" = '${entry.assignTo}' WHERE id = ${entry.loanId};`,
      )
      .join('');
    const queryData = await this.repoManager.injectRawQuery(
      loanTransaction,
      query,
    );
    if (queryData == k500Error) return k500Error;
    return true;
  }

  async assignToCSE(masterIds) {
    const cseAdmins = await this.assignmentService.fetchadmins(
      masterIds,
      'CSE',
      'CSE_UPDATE_INDEX',
    );
    if (!cseAdmins) return k500Error;
    const query = cseAdmins
      .map(
        (entry) =>
          `UPDATE public."MasterEntities" SET "assignedCSE" = ${entry.assignTo} WHERE "id" = ${entry.id};`,
      )
      .join('');
    const queryData = await this.repoManager.injectRawQuery(
      MasterEntity,
      query,
    );
    if (queryData == k500Error) return k500Error;
    return true;
  }
}
