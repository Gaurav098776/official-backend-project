// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import {
  GLOBAL_RANGES,
  REKYCDAYS,
  REMANDATEDAYS,
  SYSTEM_ADMIN_ID,
  COMPANY_INCORPORATION_MIN_DAY,
  GLOBAL_FLOW,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  UserStage,
  kEmploymentFields,
  kExceptionsDomains,
  kNewEmploymentFields,
  kSameEmploymentFields,
} from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import {
  kGlobalTrail,
  kNoDataFound,
  kNotEligibleForNBFC,
  kSubmissionOfEmploymentNotCom,
  kTEmailOtp,
  kVerificationsMail,
  COMPANY_STATUS_IS_NOT_ACTIVE,
  INCORPORATE_DATE_IS_LESS_THAN_ONE_YEAR,
  kLoanNotProgress,
  kCanNotSelectThisCompany,
  ENTERED_SALARY_IS_BELOW,
  kNotEligible,
} from 'src/constants/strings';
import { employmentDetails } from 'src/entities/employment.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { LogsSharedService } from 'src/shared/logs.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { InstaFinancialService } from 'src/thirdParty/instafinancial/instafinancial.service';
import { CommonService } from 'src/utils/common.service';
import { TypeService } from 'src/utils/type.service';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { APIService } from 'src/utils/api.service';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { AdminService } from 'src/admin/admin/admin.service';
import {
  nInstafinaceLlpComapny,
  nInstafinaceLlpDirectorName,
  nInstafinacePrivateComapny,
  nInstafinacePrivateDirectorName,
} from 'src/constants/network';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentSector } from 'src/entities/sector.entity';
import { BankingSharedService } from 'src/shared/banking.service';
@Injectable()
export class EmploymentServiceV3 {
  constructor(
    private readonly adminService: AdminService,
    private readonly blackListedCompanyRepo: BlackListCompanyRepository,
    private readonly api: APIService,
    private readonly CompanyRepo: CompanyRepository,
    private readonly bankingRepo: BankingRepository,
    private readonly commonService: CommonService,
    private readonly designationRepo: EmployementDegignationRepository,
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly empHistoryRepo: EmploymentHistoryRepository,
    private readonly googleService: GoogleService,
    private readonly instaFinancial: InstaFinancialService,
    private readonly loanRepo: LoanRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly masterRepo: MasterRepository,
    private readonly repository: EmploymentRepository,
    private readonly salarySlipRepo: SalarySlipRepository,
    private readonly sectorRepo: EmployementSectoreRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly workEmailRepo: WorkMailRepository,
    private readonly notificationService: SharedNotificationService,
    private readonly userSharedService: UserSharedService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly logTracker: LogsSharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly kycRepo: KYCRepository,
    private readonly eligiblityService: EligibilitySharedService,
    private readonly sharedBankingService: BankingSharedService,
  ) {}

  async searchCompany(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const searchStr = reqData.searchStr;
      if (!searchStr) return kParamMissing('searchStr');

      return await this.instaFinancial.searchCompany(searchStr);
    } catch (error) {
      return kInternalError;
    }
  }

  async getNecessaryList() {
    try {
      // Get sectors
      const sectors = await this.getSectorList();
      if (sectors.message) return sectors;

      // Get designations
      const designations = await this.getDesignationList();
      if (designations.message) return designations;

      const topCompanies = await this.getTop10VerifiedCompanies();
      if (topCompanies.message) return topCompanies;

      return { designations, sectors, topCompanies };
    } catch (error) {
      return kInternalError;
    }
  }

  private async getSectorList() {
    try {
      const attributes = ['id', 'sectorName'];
      const options = { where: { sectorStatusVerified: '1' } };
      const sectorList: any = this.sectorRepo.getTableWhereData(
        attributes,
        options,
      );
      if (sectorList == k500Error) return kInternalError;
      return sectorList;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getDesignationList() {
    try {
      const attributes = ['id', 'designationName'];
      const options = { where: { designationStatusVerified: '1' } };
      const designationList = await this.designationRepo.getTableWhereData(
        attributes,
        options,
      );
      if (designationList == k500Error) return kInternalError;
      return designationList;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getTop10VerifiedCompanies() {
    try {
      const opt = {
        where: { companyVerification: { [Op.or]: ['1', '3'] } },
        group: [Sequelize.fn('lower', Sequelize.col('companyName'))],
        order: [['count', 'DESC']],
        limit: 10,
      };
      const attr: any = [
        [Sequelize.fn('lower', Sequelize.col('companyName')), 'companyName'],
        [Sequelize.fn('COUNT', Sequelize.col('companyName')), 'count'],
      ];
      const empData = await this.repository.getTableWhereData(attr, opt);
      if (empData === k500Error) return kInternalError;
      const companyList = empData.map(
        (el) =>
          el?.companyName.charAt(0).toUpperCase() + el?.companyName.slice(1),
      );
      return companyList.sort();
    } catch (error) {
      return kInternalError;
    }
  }

  async submitDetails(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      const update = reqData?.updateEmployment ?? false;
      if (!userId) return kParamMissing('userId');
      const companyName = reqData.companyName?.toUpperCase();
      if (!companyName && !update) return kParamMissing('companyName');

      const sectorId = reqData.sectorId;
      if (!sectorId && !update) return kParamMissing('sectorId');
      const designationId = reqData.designationId;
      if (!designationId && !update) return kParamMissing('designationId');

      let empStartDate = reqData.empStartDate;
      if (!empStartDate && !update) return kParamMissing('empStartDate');
      empStartDate = new Date(empStartDate + kGlobalTrail);
      if (isNaN(empStartDate) && !update)
        return kInvalidParamValue('empStartDate');
      const currDateTime = new Date();

      let lastPayDate = reqData?.lastPayDate ?? '';
      if (!lastPayDate) return kParamMissing('lastPayDate');
      lastPayDate = new Date(lastPayDate);
      currDateTime.setHours(23, 59, 59, 999);
      // Temporary changes
      if (
        lastPayDate.getTime() > currDateTime.getTime() ||
        isNaN(lastPayDate)
      ) {
        lastPayDate = new Date(reqData?.nextPayDate ?? '');
        lastPayDate.setFullYear(lastPayDate.getFullYear() - 1);
      }
      if (
        lastPayDate.getTime() > currDateTime.getTime() ||
        isNaN(lastPayDate)
      ) {
        return k422ErrorMessage('Last pay date must be past date.');
      }

      let nextPayDate = reqData?.nextPayDate ?? '';
      if (!nextPayDate) return kParamMissing('nextPayDate');
      nextPayDate = new Date(nextPayDate);
      currDateTime.setHours(0, 0, 0, 1);
      if (
        nextPayDate.getTime() < currDateTime.getTime() ||
        isNaN(nextPayDate)
      ) {
        // Temporary changes
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        if (nextPayDate.getTime() < currDateTime.getTime())
          nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        // return k422ErrorMessage('Next pay date must be future date.');
      }

      if (lastPayDate?.toString() == nextPayDate?.toString())
        return k422ErrorMessage(
          'Last pay date and next pay date cannot be same.',
        );
      const reApplyFlow = reqData.reApply ?? false;
      const netPaySalary =
        +this.typeService.checkAndRemoveComma(reqData?.netPaySalary ?? '') ??
        '';

      let salaryInfo = reqData?.salaryInfo ?? netPaySalary;
      reqData.salaryInfo = salaryInfo;

      const updateLoanData = {
        lastPayDate: lastPayDate.toJSON(),
        nextPayDate: nextPayDate.toJSON(),
        ...(netPaySalary ? { netPaySalary } : {}),
      };
      // Prepare data
      const todayDate = this.typeService.getGlobalDate(new Date());
      const salaryDate = lastPayDate.getDate();
      let companyVerification = '1';
      const empData: any = {
        companyAddress: '',
        companyUrl: '',
        companyPhone: '',
        companyVerification,
        companyName,
        employmentTypeId: 1,
        sectorId,
        designationId,
        masterId: null,
        salary: '',
        salaryDate,
        startDate: empStartDate,
        userId,
        verifiedDate: todayDate.toJSON(),
        otherInfo: {
          ...updateLoanData,
        },
        companyNameChangeBy: null,
        updatedCompanyName: null,
      };
      let checkCompany: any = true;
      // Get company details from google apis
      if (!update) {
        const queryData = { needDetails: true, searchText: companyName };
        const companyData = await this.googleService.searchOrganisation(
          queryData,
        );
        // Not handling errors because user should not get affected for this error
        if (companyData && !companyData.message) {
          empData.companyAddress = companyData.formatted_address ?? '';
          empData.companyUrl = companyData.website ?? '';
          empData.companyPhone = companyData.international_phone_number ?? '';
        }
      }

      // Verify and Store Company Information from Insta-Finance API
      checkCompany = await this.verifyAndStoreInfoInstaFinance(
        companyName,
        userId,
      );
      // Skip insta financial in case of error
      if (checkCompany?.message) checkCompany = true;
      if (checkCompany?.message) return checkCompany;
      if (checkCompany === false) companyVerification = '2';

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = [
        'coolOffData',
        'otherInfo',
        'status',
        'dates',
        'miscData',
        'empId',
        'workMailId',
        'salarySlipId',
        'loanId',
      ];
      const include = [masterInclude];
      const attributes = [
        'gender',
        'masterId',
        'recentDeviceId',
        'completedLoans',
        'leadId',
      ];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const statusData = userData.masterData?.status ?? {};
      if (!salaryInfo)
        salaryInfo = userData.masterData?.otherInfo?.salaryInfo ?? 0;
      const masterId = userData.masterId;
      if (!salaryInfo) {
        // code comment due to missing repeater proffetional salaryInfo
        // statusData.professional = -1;
        // const updateResult = await this.masterRepo.updateRowData(
        //   { status: statusData },
        //   masterId,
        // );
        // if (updateResult == k500Error) return kInternalError;
        // return { needUserInfo: true };
      }
      empData.salary = salaryInfo;
      empData.masterId = masterId;

      // Double check -> Minimum salary criteria
      const userEnteredSalary =
        (reqData.salaryInfo ?? 0) > 0 ? reqData.salaryInfo : +salaryInfo;
      const checkResult = await this.doubleCheckMinSalary({
        masterId,
        userData,
        userEnteredSalary,
        userId,
      });
      if (checkResult?.needUserInfo) return checkResult;

      const miscData = userData.masterData?.miscData ?? {};
      if (
        statusData.loan != 2 &&
        statusData.loan != 7 &&
        statusData.loan != -2 &&
        statusData.loan != -1
      )
        return k422ErrorMessage(kSubmissionOfEmploymentNotCom);
      let empId;
      // Existing data
      const empOptions = { where: { userId } };
      const existingData = await this.repository.getRowWhereData(
        null,
        empOptions,
      );
      if (existingData == k500Error) return kInternalError;

      if (statusData?.company == 2) {
        if (
          (companyName ?? '').toLowerCase().trim() ==
          (existingData?.companyName ?? '').toLowerCase()
        )
          return k422ErrorMessage(kCanNotSelectThisCompany);
      }

      // Move existing record into history and update new record
      if (existingData) {
        empId = existingData.id;
        // add previous company data if selected old company
        if (update) {
          empData.companyAddress = existingData.companyAddress;
          empData.companyUrl = existingData.companyUrl;
          empData.companyPhone = existingData.companyPhone;
          empData.companyVerification = existingData.companyVerification;
          empData.companyName = existingData.companyName;
          empData.employmentTypeId = existingData.employmentTypeId;
          empData.sectorId = existingData.sectorId;
          empData.designationId = existingData.designationId;
          empData.startDate = existingData.startDate;
          empData.salary = netPaySalary;
          reqData.empInfo = userData?.masterData?.otherInfo?.employmentInfo;
          reqData.salaryInfo =
            salaryInfo ?? userData?.masterData?.otherInfo?.salaryInfo;
          empData.otherInfo = {
            ...existingData.otherInfo,
            ...updateLoanData,
          };
          empData.companyNameChangeBy = existingData?.companyNameChangeBy;
          empData.updatedCompanyName = existingData?.updatedCompanyName;
        }
        existingData.id = undefined;

        const createdData = await this.empHistoryRepo.createRowData(
          existingData,
        );
        if (createdData == k500Error) return kInternalError;
        if (!update) {
          empData.workMailId = null;
          empData.salarySlipId = null;
        }
        const updateResult = await this.repository.updateRowData(
          empData,
          empId,
        );
        if (updateResult == k500Error) return kInternalError;
      }
      // Create new record
      else {
        empData.companyVerification = companyVerification;
        const createdData = await this.repository.createRowData(empData);
        if (createdData == k500Error) return kInternalError;
        empId = createdData.id;
      }
      // Update master data
      // Need to reset the below status in case company added again
      statusData.company = +companyVerification;
      statusData.salarySlip = -1;
      statusData.workMail = -1;
      miscData.needSalarySlip = true;
      const otherInfo = userData?.masterData?.otherInfo;
      if (netPaySalary) {
        otherInfo.netPaySalary = netPaySalary;
        otherInfo.salaryInfo = netPaySalary;
      }

      const updatedData = {
        empId,
        status: statusData,
        otherInfo,
        salarySlipId: null,
        workMailId: null,
        miscData,
      };
      const updateResult = await this.masterRepo.updateRowData(
        updatedData,
        masterId,
      );
      if (updateResult === k500Error) return kInternalError;
      // Validate blacklisted companies
      const isEligibleCompany: any =
        await this.sharedEligibility.isEligibleCompany(empData);
      if (isEligibleCompany.message) return isEligibleCompany;
      if (!isEligibleCompany) return { needUserInfo: true };
      if (checkCompany === false) return { needUserInfo: true };
      let purposeId = miscData.purposeId;
      if (purposeId == 0) purposeId = miscData.nextLoanPurposeId;
      if (typeof purposeId == 'string') purposeId = +purposeId;
      const data = { userId, purposeId, reApply: true };
      const result = await this.handleReApplyFlow(
        statusData,
        data,
        userData,
        updateLoanData,
        companyName,
      );
      if (result?.message) return result;

      const isUnderAge = result?.isUnderAge ?? false;
      if (reqData?.empInfo && isUnderAge) {
        const submitData =
          await this.userSharedService.submitProfessionalDetails(reqData);
        if (submitData?.message) return submitData;
      }

      // check name validations
      await this.sharedEligibility.nameValidation(userId);

      //if user applying again in 100 days then skip workmail and salarySlip
      if (reApplyFlow) {
        const salarySlipAtr = ['id', 'salarySlipDate', 'status', 'companyName'];
        const salarySlipOptions = {
          where: {
            userId: userId,
          },
          order: [['id', 'DESC']],
        };
        const salarySlipData = await this.salarySlipRepo.getRowWhereData(
          salarySlipAtr,
          salarySlipOptions,
        );
        if (salarySlipData === k500Error) return kInternalError;
        let salarySlipDate =
          salarySlipData?.salarySlipDate ?? '1970-01-01' + kGlobalTrail;
        salarySlipDate = new Date(salarySlipDate);
        const slarySlipStatus = salarySlipData?.status;
        const today = this.typeService.getGlobalDate(new Date());
        const diffInDays = this.typeService.dateDifference(
          today,
          salarySlipDate,
        );
        if (diffInDays > GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS)
          miscData.needSalarySlip = true;
        else if (
          diffInDays < GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS &&
          (slarySlipStatus === '1' || slarySlipStatus === '3') &&
          companyName == salarySlipData?.companyName
        ) {
          //for skiping salary slip  and work mail if user reapply again in less than 100 days and salaryslip verified previously.
          const newMasterData = await this.masterRepo.getRowWhereData(
            ['id', 'empId', 'status', 'miscData'],
            { where: { userId }, order: [['id', 'DESC']] },
          );
          if (newMasterData == k500Error) return kInternalError;

          const workMailData = {
            email: '',
            masterId: newMasterData?.id,
            status: '4',
            userId,
            approveById: SYSTEM_ADMIN_ID,
          };
          const workMailCreatedData = await this.workEmailRepo.createRowData(
            workMailData,
          );
          if (workMailCreatedData == k500Error) return kInternalError;
          const workMailId = workMailCreatedData.id;

          // Update employment data
          const empData: any = { workMailId };
          const updateEmpResult = await this.repository.updateRowData(
            empData,
            newMasterData?.empId,
          );
          if (updateEmpResult == k500Error) return kInternalError;
          const newStatusData = newMasterData?.status;
          newStatusData.salarySlip = 4;
          newStatusData.workMail = 4;
          const newMiscData = newMasterData?.miscData;
          newMiscData.needSalarySlip = false;

          const updatedMasterData = {
            miscData: newMiscData,
            status: newStatusData,
            workMailId,
            workMailAdminId: SYSTEM_ADMIN_ID,
          };

          const masterRes = await this.masterRepo.updateRowData(
            updatedMasterData,
            newMasterData?.id,
          );
          if (masterRes === k500Error) return kInternalError;
        }
      }
      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  private async doubleCheckMinSalary({
    userEnteredSalary,
    userData,
    masterId,
    userId,
  }) {
    if (!masterId || !userId || !userEnteredSalary) return {};

    if (userEnteredSalary && !isNaN(userEnteredSalary)) {
      if (userEnteredSalary < GLOBAL_RANGES.MIN_SALARY_AMOUNT) {
        // Update master data
        const coolOffData = userData.masterData?.coolOffData ?? {};
        coolOffData.count = (coolOffData.count ?? 0) + 1;
        coolOffData.reason = ENTERED_SALARY_IS_BELOW;
        const toDay = this.typeService.getGlobalDate(new Date());
        coolOffData.coolOffStartedOn = toDay.toJSON();
        toDay.setDate(toDay.getDate() + 90);
        coolOffData.coolOffEndsOn = toDay.toJSON();
        coolOffData.lastStep = UserStage.EMPLOYMENT;
        const otherInfo = userData?.masterData?.otherInfo ?? {};
        otherInfo.salaryInfo = +userEnteredSalary;
        const masterUpdateData = { coolOffData, otherInfo };
        const masterUpdateResult = await this.masterRepo.updateRowData(
          masterUpdateData,
          masterId,
        );
        if (masterUpdateResult === k500Error) throw new Error();

        // Update user data
        const userUpdateData = { NextDateForApply: toDay };
        const userUpdateResult = await this.userRepo.updateRowData(
          userUpdateData,
          userId,
        );
        if (userUpdateResult == k500Error) throw new Error();

        return { needUserInfo: true };
      }

      return {};
    }

    return {};
  }

  async updateWorkEmail(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      let email = reqData?.email;
      if (!email) return kParamMissing('workMail');
      email = email.toLowerCase();
      const reApplyFlow = reqData.reApply ?? false;
      if (reApplyFlow) await this.verifiedCompanyDate({ userId });

      // Master join
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['empId', 'status', 'workMailId', 'miscData'];

      const include = [masterInclude];
      const attributes = ['id', 'masterId', 'fullName'];
      const options = { where: { id: userId }, include };
      // get userData
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterId = userData.masterId;
      const statusData = userData.masterData?.status ?? {};
      if (email) {
        const spans = email.split('@');
        if (spans.length > 1) {
          const domain = spans[1];
          if (kExceptionsDomains.includes(domain))
            return k422ErrorMessage('Please enter valid official work mail');
        }
        // Checks whether Email address exists in another user or not
        const existing: any = await this.isEmailExist(email, userId);
        if (existing?.message) return existing;
      }
      // Salary slip check for re-apply flow
      const miscData = userData.masterData?.miscData ?? {};
      if (reApplyFlow) {
        const salarySlipAtr = ['id', 'salarySlipDate', 'status'];
        const salarySlipOptions = {
          where: {
            userId: userId,
          },
          order: [['id', 'DESC']],
        };
        const salarySlipData = await this.salarySlipRepo.getRowWhereData(
          salarySlipAtr,
          salarySlipOptions,
        );
        if (salarySlipData === k500Error) return kInternalError;
        let salarySlipDate =
          salarySlipData?.salarySlipDate ?? '1970-01-01' + kGlobalTrail;
        salarySlipDate = new Date(salarySlipDate);
        const SlarySlipStatus = salarySlipData?.status;
        const today = this.typeService.getGlobalDate(new Date());
        const diffInDays = this.typeService.dateDifference(
          today,
          salarySlipDate,
        );
        if (diffInDays > GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS)
          miscData.needSalarySlip = true;
        else if (
          diffInDays < GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS &&
          (SlarySlipStatus === '1' || SlarySlipStatus === '3')
        ) {
          //for skiping salary slip if user reapply again in less than 100 days.
          statusData.salarySlip = 4;
          miscData.needSalarySlip = false;
        }
      }

      const otp = this.commonService.generateOTP();
      let status = email ? '5' : '4';
      if (email) {
        const mailData = await this.workEmailRepo.getRowWhereData(
          ['id', 'status', 'userId', 'email'],
          { where: { email: email, userId: userId } },
        );
        if (mailData === k500Error) return kInternalError;
        const data = {
          name: userData.fullName,
          code: otp,
          userId: userId,
          workMail: 'true',
        };
        await this.notificationService.sendEmail(kTEmailOtp, email, data);
      }
      statusData.workMail = +status;
      const creationData = { email, otp, masterId, status, userId };
      const createdData = await this.workEmailRepo.createRowData(creationData);
      if (createdData == k500Error) return kInternalError;
      const workMailId = createdData.id;

      // Update employment data
      let updatedData: any = { workMailId };
      // New loan, New master data
      let updateResult = await this.repository.updateRowData(
        updatedData,
        userData.masterData.empId,
      );
      if (updateResult == k500Error) return kInternalError;
      // Update master data
      updatedData = {
        status: statusData,
        workMailId,
        workMailAdminId: SYSTEM_ADMIN_ID,
        miscData,
      };
      // New loan, New master data
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;
      if (status == '4')
        return await this.checkAndUpdateEmail(userId, null, reqData);
      else
        return {
          needUserInfo: true,
          showOTPBox: true,
          type: 'workEmail',
          otpBoxValue: email,
        };
    } catch (error) {
      return kInternalError;
    }
  }

  //#region check and update to email details
  async checkAndUpdateEmail(userId, email, reqData) {
    try {
      // // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = [
        'dates',
        'empId',
        'status',
        'workMailId',
        'salarySlipId',
      ];
      const include = [masterInclude];
      const attributes = ['gender', 'masterId', 'recentDeviceId'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterData = userData.masterData ?? {};
      let masterId = userData.masterId;
      let statusData = userData.masterData?.status ?? {};
      const submitStatus = [1, 3, 4];
      let reApplyData: any = {};
      if (submitStatus.includes(statusData.workMail) || reqData?.reApply) {
        reApplyData = await this.handleReApplyFlow(
          statusData,
          reqData,
          userData,
        );
        if (reApplyData.message) return reApplyData;
      }
      // New loan, New master data
      if (reApplyData.status) statusData = reApplyData.status;
      let workMailId;
      // Skip work email
      if (!email) statusData.workMail = 4;
      // Update employment data
      let updatedData: any = { workMailId };
      // New loan, New master data
      if (reApplyData.masterId) updatedData.masterId = reApplyData.masterId;
      let updateResult = await this.repository.updateRowData(
        updatedData,
        masterData.empId,
      );
      if (updateResult == k500Error) return kInternalError;
      // Update master data
      updatedData = {
        status: statusData,
        workMailId,
        workMailAdminId: SYSTEM_ADMIN_ID,
      };

      if (
        submitStatus.includes(statusData.company) &&
        submitStatus.includes(statusData.workMail) &&
        submitStatus.includes(statusData.salarySlip) &&
        !reApplyData?.status
      ) {
        masterData.dates.employment = new Date().getTime();
        updatedData.dates = masterData.dates;
      }
      // New loan, New master data
      if (reApplyData.masterId) masterId = reApplyData.masterId;
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;
      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  // Checks whether Email address exists in another user or not
  private async isEmailExist(email, userId) {
    // Preparation -> Query
    const attributes = ['id'];
    const where = { email, userId: { [Op.ne]: userId } };
    // Hit -> Query
    const existingData = await this.workEmailRepo.getRowWhereData(attributes, {
      where,
    });
    // Validation -> Query data
    if (existingData === k500Error) throw new Error();
    if (existingData) {
      return k422ErrorMessage(
        'Email id is already in use, try with another email address',
      );
    }

    return {};
  }

  // Re - apply route
  private async handleReApplyFlow(
    statusData,
    reqData,
    userData,
    updateLoanData?,
    companyName?,
  ) {
    try {
      if (statusData.loan != 7 && statusData.loan != 2 && statusData.loan != -2)
        return { status: statusData, masterId: userData.masterId };
      if (!reqData.reApply) return kParamMissing('reApply');
      const purposeId = reqData.purposeId;
      if (!purposeId) return kParamMissing('purposeId');
      const currDate = this.typeService.getGlobalDate(new Date());
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      const masterInc = { model: MasterEntity, attributes: ['coolOffData'] };
      const attr = ['id', 'appType', 'isBlacklist'];
      const opts = { where: { id: userId }, include: [masterInc] };
      const userInfo = await this.userRepo.getRowWhereData(attr, opts);
      if (userInfo === k500Error) return kInternalError;
      if (userInfo?.isBlacklist == '1') return k422ErrorMessage(kNotEligible);
      const coolOff = userInfo?.masterData?.coolOffData;
      if (coolOff?.coolOffEndsOn) {
        const coolOffEnd = this.typeService.getGlobalDate(
          coolOff?.coolOffEndsOn,
        );
        if (coolOffEnd > currDate) return k422ErrorMessage(kNotEligible);
      }
      const appType = userInfo?.appType ?? 0;
      const where = { userId, loanStatus: 'Complete' };
      let completedLoan = await this.loanRepo.getCountsWhere({ where });
      if (completedLoan === k500Error) completedLoan = 0;
      // const compId = await this.CompanyRepo.getRowWhereData(['id'], {
      //   where: { companyName: companyName },
      // });
      // const companyId= compId.id
      const creationData: any = {
        interestRate: GLOBAL_RANGES.MIN_PER_DAY_INTEREST_RATE.toString(),
        purposeId,
        userId,
        completedLoan,
        appType,
        //    companyId,
        ...(updateLoanData ?? {}),
      };
      if (userData?.recentDeviceId)
        creationData.activeDeviceId = userData?.recentDeviceId;

      const createdData = await this.loanRepo.createRowData(creationData);
      if (createdData == k500Error) return kInternalError;
      const loanId = createdData.id;

      // In v3 flow few steps are related to loan but getting triggered before the loan starts
      await this.logTracker.addLoanIdsToPreLoanFields(userId, loanId);

      const previousMasterData = await this.previousMasterData(userId);
      if (previousMasterData?.message) return previousMasterData;
      const otherInfo = previousMasterData.otherInfo ?? {
        maritalInfo: '',
        spouseName: '',
        motherName: '',
        dependents: 0,
        vehicleInfo: [],
        educationInfo: '',
        residentialInfo: '',
        employmentInfo: '',
        salaryInfo: 0,
      };

      // New master data status
      const newStatus = userData.masterData?.status ?? {};
      newStatus.contact = -1;
      newStatus.loan = -1;
      newStatus.eligibility = -1;
      newStatus.bank = -1;
      newStatus.reference = -1;
      newStatus.eMandate = -1;
      newStatus.eSign = -1;
      newStatus.repayment = -1;
      newStatus.disbursement = -1;
      newStatus.ipCheck = -1;
      // new master data date
      const newDates = userData.masterData?.dates ?? {};
      newDates.eSign = 0;
      newDates.banking = 0;
      newDates.eMandate = 0;
      newDates.eligibility = 0;
      newDates.disbursement = 0;

      try {
        if ([1, 3].includes(newStatus.aadhaar) && newDates.aadhaar) {
          const kycDate = this.typeService.getGlobalDate(
            new Date(newDates.aadhaar),
          );
          const diffDays = this.typeService.differenceInDays(kycDate, currDate);
          const kycAtr = ['kyc_mode'];
          const kycOption = {
            where: {
              userId: userId,
              aadhaarStatus: { [Op.or]: ['1', '3'] },
            },
            order: [['id', 'DESC']],
          };
          const kycRes = await this.kycRepo.getRowWhereData(kycAtr, kycOption);
          if (kycRes === k500Error) return kInternalError;

          if (
            diffDays > REKYCDAYS ||
            (kycRes?.kyc_mode != 'ZOOP' && kycRes?.kyc_mode != 'DIGILOCKER')
          ) {
            newStatus.aadhaar = -1;
            newDates.aadhaar = 0;
          }
        }
      } catch (error) {}

      if (newStatus.residence != -1) {
        newStatus.residence = !GLOBAL_FLOW.RESIDENCE_IN_APP ? 8 : 6;
        newDates.residence = 0;
      }

      await this.checkPreviousMandates(userId);
      // Create new master data
      const oldMasterId = userData.masterId;
      let updatedData: any = {
        otherInfo,
        status: newStatus,
        loanId,
        dates: newDates,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const checkMasterData = oldMasterId
        ? await this.masterRepo.getRowWhereData(['id'], {
            where: { loanId: null, id: oldMasterId },
          })
        : null;
      let newMasterData;
      if (checkMasterData) {
        await this.masterRepo.updateRowData(updatedData, checkMasterData.id);
        newMasterData = checkMasterData;
      } else {
        updatedData = {
          status: newStatus,
          loanId,
          dates: newDates,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        newMasterData = await this.masterRepo.createRowDataWithCopy(
          updatedData,
          oldMasterId,
        );
        if (newMasterData == k500Error) return kInternalError;
      }

      // Update loan data
      updatedData = { masterId: newMasterData.id };
      let updateResult = await this.loanRepo.updateRowData(updatedData, loanId);
      if (updateResult == k500Error) return kInternalError;

      // Update user data
      updateResult = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResult == k500Error) return kInternalError;
      const masterData = userData.masterData;
      if (masterData?.empId)
        updateResult = await this.repository.updateRowData(
          updatedData,
          masterData?.empId,
        );
      if (updateResult == k500Error) return kInternalError;

      if (masterData?.workMailId)
        updateResult = await this.workEmailRepo.updateRowData(
          updatedData,
          masterData?.workMailId,
        );
      if (updateResult == k500Error) return kInternalError;

      if (masterData?.salarySlipId)
        updateResult = await this.salarySlipRepo.updateRowData(
          updatedData,
          masterData?.salarySlipId,
        );
      if (updateResult == k500Error) return kInternalError;

      const isUnderAge = await this.checkIsEligibleAsPerAge(userId, loanId);
      return {
        status: newStatus,
        masterId: newMasterData.id,
        isUnderAge,
        loanId,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  private async previousMasterData(userId) {
    try {
      const attributes = ['otherInfo'];
      const options = { order: [['id', 'DESC']], where: { userId } };

      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      return masterData ?? {};
    } catch (error) {
      return kInternalError;
    }
  }

  async verifyOTP(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const otp = reqData.otp;
      if (!otp) return kParamMissing('otp');
      // Get user data
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = [
        'id',
        'companyUrl',
        'companyName',
        'salarySlipId',
      ];
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = ['email', 'id', 'otp'];
      const masterInclude: any = { model: MasterEntity };
      masterInclude.include = [empInclude, workMailInclude];
      masterInclude.attributes = [
        'status',
        'loanId',
        'miscData',
        'dates',
        'salarySlipId',
      ];
      const include = [masterInclude];
      const attributes = ['masterId', 'isRedProfile'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterId = userData.masterId;
      const masterData = userData.masterData ?? {};
      const empData = masterData.empData ?? {};
      const workMailData = masterData.workMailData ?? {};
      const statusData = masterData.status ?? {};
      const miscData = masterData.miscData ?? {};
      const dates = masterData.dates ?? {};
      const isRedProfile = (userData?.isRedProfile ?? 0) === 2;
      if ((empData?.companyUrl ?? '').trim().length == 0) {
        // Get company details from google apis
        const queryData = {
          needDetails: false,
          searchText: empData.companyName,
        };
        const companyData = await this.googleService.searchOrganisation(
          queryData,
        );
        // Not handling errors because user should not get affected for this error
        if (companyData && !companyData.message) {
          empData['companyAddress'] = companyData.formatted_address ?? '';
          empData.companyUrl = companyData.website ?? '';
          empData['companyPhone'] =
            companyData.international_phone_number ?? '';
          const updateResult = await this.repository.updateRowData(
            {
              companyUrl: empData.companyUrl,
              companyAddress: empData['companyAddress'],
              companyPhone: empData['companyPhone'],
            },
            empData.id,
          );
        }
      }

      // OTP validation
      if (workMailData.otp != otp)
        return k422ErrorMessage('Incorrect OTP, Please try again');
      // Work email domain verification with company url
      const isValidDomain = await this.domainValidation(
        workMailData.email,
        empData.companyUrl,
      );
      // Update work mail data
      const verificationData = {
        isValidDomain,
        statusData,
        miscData,
        dates,
        userId,
        workMailData,
        masterId,
        masterData,
        empData,
        isRedProfile,
      };
      await this.workMailOtpVerifcation(verificationData);
      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  //Work mail otp verfication
  async workMailOtpVerifcation(reqData) {
    try {
      const todayDate = new Date();
      const {
        isValidDomain,
        statusData,
        miscData,
        dates,
        userId,
        workMailData,
        masterId,
        masterData,
        empData,
        isRedProfile,
      } = reqData;

      //Update work mail domain
      let updatedData: any = {
        status: isValidDomain ? '1' : '0',
        approveById: SYSTEM_ADMIN_ID,
      };
      statusData.workMail = isValidDomain ? 1 : 0;

      //for skiping salary slip if work mail is selected by user.
      let updatedSalarySlipData: any = {};
      if (statusData.salarySlip == 2) {
        updatedSalarySlipData.status = '4';
        updatedSalarySlipData.url = '';
        updatedSalarySlipData.salarySlipDate = null;
        updatedSalarySlipData.salaryVerifiedDate = null;
        updatedSalarySlipData.rejectReason = null;
        updatedSalarySlipData.remark = null;
        updatedSalarySlipData.approveById = SYSTEM_ADMIN_ID;
      }
      statusData.salarySlip = 4;
      miscData.needSalarySlip = false;
      dates.employment = todayDate.getTime();

      /// if old defulter then approved
      if (isRedProfile) {
        updatedData.status = '1';
        statusData.workMail = 1;
      }
      if (statusData.workMail == 0) {
        const checkManualVerified =
          await this.commonSharedService.checkManualWorkMail(
            workMailData,
            empData,
            updatedData,
          );
        if (checkManualVerified) {
          updatedData.status = '1';
          statusData.workMail = 1;
        }
      }
      let updateResult = await this.workEmailRepo.updateRowData(
        updatedData,
        workMailData.id,
      );
      if (updateResult == k500Error) return kInternalError;

      if (statusData.workMail == 0) {
        await this.sharedBankingService.assignToAdmin(0, masterData.loanId);
      }
      // Update master data
      updatedData = { status: statusData, miscData, dates, salarySlipId: null };
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;
      //for removing old salary slip id from employement Details table
      const empRes = await this.repository.updateRowData(
        { salarySlipId: null },
        empData?.id,
      );
      if (empRes == k500Error) return kInternalError;

      const masterAtr = ['id', 'salarySlipId'];
      const masterOptions = {
        where: { userId: userId, salarySlipId: { [Op.ne]: null } },
        order: [['id', 'DESC']],
      };
      const masterRes = await this.masterRepo.getRowWhereData(
        masterAtr,
        masterOptions,
      );
      if (masterRes === k500Error) return kInternalError;

      //updating correct master id in salary slip
      if (masterRes?.salarySlipId) {
        updatedSalarySlipData.masterId = masterRes?.id;
        const salarySlipRes = await this.salarySlipRepo.updateRowData(
          updatedSalarySlipData,
          masterRes?.salarySlipId,
        );
        if (salarySlipRes === k500Error) return kInternalError;
      }
      await this.checkAndUpdateEmail(userId, workMailData.email, reqData);
      let interestRate: any =
        await this.commonSharedService.getEligibleInterestRate({ userId });
      try {
        if (masterData?.loanId && interestRate) {
          interestRate = interestRate;
          const update = { interestRate };
          const where = { loanStatus: ['InProcess', 'Accepted'] };
          await this.loanRepo.updateWhere(update, masterData?.loanId, where);
        }
      } catch (error) {}

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Work email domain verification with company url
  domainValidation(email: string, url) {
    try {
      if (!url || !email) return false;
      const domain = email.split('@')[1];
      return url.includes(domain);
    } catch (error) {
      return false;
    }
  }

  async generateOTP(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      // Get user data
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = ['id', 'otp', 'email'];
      const masterInclude: any = { model: MasterEntity };
      masterInclude.include = [workMailInclude];
      masterInclude.attributes = ['status'];
      const include = [masterInclude];
      const attributes = ['masterId', 'fullName'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterData = userData.masterData ?? {};
      const workMailData = masterData.workMailData ?? {};
      const statusData = masterData.status ?? {};

      if (statusData.workMail == 4)
        return k422ErrorMessage('Work email already skipped');
      // if (statusData.workMail == 1 || statusData.workMail == 3)
      //   return k422ErrorMessage('Work email already verified');
      if (!workMailData && !workMailData?.email)
        return k422ErrorMessage(
          'Kindly add work email before proceeding further',
        );

      const otp = this.commonService.generateOTP();
      const data = { name: userData.fullName, code: otp, userId: userId };
      await this.notificationService.sendEmail(
        kTEmailOtp,
        workMailData?.email,
        data,
      );
      const updatedData = { otp };
      // Update work email data
      const updateResult = await this.workEmailRepo.updateRowData(
        updatedData,
        workMailData.id,
      );
      if (updateResult == k500Error) return kInternalError;

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async validateManualEmails(reqData) {
    try {
      // Single user request
      const userId = reqData.userId;
      if (userId) {
        const masterInclude: any = { model: MasterEntity };
        masterInclude.attributes = ['dates', 'miscData', 'status', 'id'];
        const userInclude: any = { model: registeredUsers };
        userInclude.attributes = ['appType'];
        const include = [masterInclude, userInclude];
        const attributes = ['email', 'id'];
        const options = { order: [['id', 'DESC']], include, where: { userId } };
        const workMailData = await this.workEmailRepo.getRowWhereData(
          attributes,
          options,
        );
        if (workMailData == k500Error) return kInternalError;
        if (!workMailData) return k422ErrorMessage(kNoDataFound);
        if (!workMailData.email)
          return k422ErrorMessage('Work email not found');
        const statusData = workMailData.masterData?.status ?? {};
        const acceptedStatuses = [1, 3, 5];
        if (!acceptedStatuses.includes(statusData.workMail))
          return k422ErrorMessage('work email verification failed');

        const emails = await this.googleService.checkParticularSender({
          email: workMailData.email,
          appType: workMailData.user.appType,
        });
        const isReceived = !emails.message && emails.length > 0;
        // Mail not sent
        if (!isReceived)
          return k422ErrorMessage(
            `Please send the mail from ${workMailData.email} to ${kVerificationsMail}`,
          );
        // Mail sent within last 24 hours
        else {
          // Update work mail data
          let updatedData: any = { status: '1', approveById: SYSTEM_ADMIN_ID };
          let updateResult = await this.workEmailRepo.updateRowData(
            updatedData,
            workMailData.id,
          );
          if (updateResult == k500Error) return kInternalError;

          // Update master data
          const dates = workMailData.masterData?.dates ?? {};
          statusData.workMail = 1;
          statusData.salarySlip = 4;
          const isCompanyVerified =
            statusData.company == 1 || statusData.company == 3;
          const isSalarySlipVerified =
            statusData.salarySlip == 1 || statusData.salarySlip == 3;
          statusData.salarySlip == 4;
          const isSalarySlipSubmitted =
            isSalarySlipVerified || statusData.salarySlip == 0;

          if (isCompanyVerified && isSalarySlipVerified)
            dates.employment = new Date().getTime();
          updatedData = {
            status: statusData,
            dates,
            workMailAdminId: SYSTEM_ADMIN_ID,
          };
          updateResult = await this.masterRepo.updateRowData(
            updatedData,
            workMailData.masterData.id,
          );
          if (updateResult == k500Error) return kInternalError;

          // Start new loan
          const isReApplyFlow = statusData.loan == 2 || statusData.loan == 7;
          if (
            isCompanyVerified &&
            (isSalarySlipVerified || isSalarySlipSubmitted) &&
            isReApplyFlow
          ) {
            const masterData = workMailData.masterData ?? {};
            const miscData = masterData.miscData ?? {};
            const purposes = [1, 2, 3, 4, 5, 6];
            const purposeId =
              miscData.nextLoanPurposeId ??
              purposes[Math.floor(Math.random() * purposes.length)];
            const response = await this.checkAndUpdateEmail(
              userId,
              workMailData.email,
              {
                userId,
                purposeId,
                reApply: true,
              },
            );
            if (response.message) return response;
            return { ...response };
          }
          return { needUserInfo: true };
        }
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Salary slip -> upload and validate
  async validateSalarySlip(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const fileUrl = reqData.fileUrl;
      if (!fileUrl) return kParamMissing('fileUrl');
      const employeeDetails = reqData.employee_details;
      if (!employeeDetails) return kParamMissing('employee_details');
      let salarySlipDate =
        employeeDetails.SalaryPeriod ?? '1970-01-01' + kGlobalTrail;
      salarySlipDate = new Date(salarySlipDate);

      // if (fileUrl?.endsWith('.pdf')) {
      //   const response = await this.authAi.removePassword('', '', fileUrl);
      //   if (response?.message)
      //     return k422ErrorMessage('Please provide valid salary slip password');
      // }

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = [
        'dates',
        'empId',
        'miscData',
        'status',
        'loanId',
      ];
      const include = [masterInclude];
      const attributes = ['masterId', 'isRedProfile'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterData = userData.masterData ?? {};
      const statusData = masterData.status ?? {};
      const miscData = masterData.miscData ?? {};
      const masterId = userData.masterId;
      const isRedProfile = (userData?.isRedProfile ?? 0) === 2;
      const loanId = masterData.loanId;
      // Route validation
      const notProcess = [2, 6, 7];
      if (notProcess.includes(statusData?.loan))
        return k422ErrorMessage(kLoanNotProgress);
      // verifying only one from work mail and salary slip

      let workMailId = null;
      if (
        statusData?.workMail == -1 ||
        statusData?.workMail == 2 ||
        statusData?.workMail == 5
      ) {
        statusData.workMail = 4;
        const workMailData = {
          email: '',
          masterId,
          status: '4',
          userId,
          approveById: SYSTEM_ADMIN_ID,
        };
        const workMailCreatedData = await this.workEmailRepo.createRowData(
          workMailData,
        );
        if (workMailCreatedData == k500Error) return kInternalError;
        workMailId = workMailCreatedData.id;

        // Update employment data
        const empData: any = { workMailId };
        // New loan, New master data
        const updateEmpResult = await this.repository.updateRowData(
          empData,
          userData.masterData.empId,
        );
        if (updateEmpResult == k500Error) return kInternalError;
      }

      // Other extracted data
      const otherInfo: any = {};
      if (employeeDetails.joiningDate)
        otherInfo.joiningDate = employeeDetails.joiningDate;
      if (employeeDetails.netPayAmount)
        otherInfo.netPayAmount = employeeDetails.netPayAmount;
      // Salary slip month validation
      const today = this.typeService.getGlobalDate(new Date());
      const diffInDays = this.typeService.dateDifference(today, salarySlipDate);
      let salarySlipStatus = '0';
      if (salarySlipDate.getFullYear() != 1970) {
        if (diffInDays > GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS)
          salarySlipStatus = '0';
        // return k422ErrorMessage('Kindly upload the latest month salary slip');
        else salarySlipStatus = '1';
        otherInfo.salarySlipDate = salarySlipDate.toJSON();
      }
      if (!employeeDetails.companyName) salarySlipStatus = '0';
      if (!employeeDetails.name) salarySlipStatus = '0';
      miscData.needSalarySlip = false;
      /// if old defulter then approved
      if (isRedProfile) salarySlipStatus = '1';

      const empAttr = ['companyName'];
      const empOptions = { where: { userId } };
      const empData = await this.repository.getRowWhereData(
        empAttr,
        empOptions,
      );
      if (empData == k500Error) return kInternalError;

      const creationData: any = {
        approveById: SYSTEM_ADMIN_ID,
        companyName: empData?.companyName,
        masterId,
        url: fileUrl,
        status: salarySlipStatus,
        userId,
        response: JSON.stringify(employeeDetails),
        ...otherInfo,
      };
      if (salarySlipStatus == '1') creationData.salaryVerifiedDate = today;
      await this.sharedBankingService.assignToAdmin(salarySlipStatus, loanId);
      // Create salary slip data
      const createdData = await this.salarySlipRepo.createRawData(creationData);
      if (createdData == k500Error) return kInternalError;

      // Update employment data
      let updatedData: any = { salarySlipId: createdData.id };
      let updateResult = await this.repository.updateRowData(
        updatedData,
        masterData.empId,
      );
      if (updateResult == k500Error) return kInternalError;
      // Update master data
      statusData.salarySlip = +salarySlipStatus;
      updatedData = {
        miscData,
        status: statusData,
        dates: masterData.dates,
        salarySlipId: createdData.id,
        workMailId,
        workMailAdminId: SYSTEM_ADMIN_ID,
      };
      const approvedStatuses = [1, 3, 4];
      const isCompanyVerified = approvedStatuses.includes(statusData.company);
      const isWorkEmailVerified = approvedStatuses.includes(
        statusData.workMail,
      );
      const isSalarySlipVerified = approvedStatuses.includes(
        statusData.salarySlip,
      );
      if (isCompanyVerified && isWorkEmailVerified && isSalarySlipVerified)
        updatedData.dates.employment = new Date();
      updatedData.salarySlipAdminId = SYSTEM_ADMIN_ID;
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  //#region update company verify date
  async verifiedCompanyDate(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = [
        'status',
        'miscData',
        'dates',
        'empId',
        'workMailId',
        'salarySlipId',
      ];
      const include = [masterInclude];
      const attributes = ['masterId', 'recentDeviceId'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const statusData = userData.masterData?.status ?? {};
      if (statusData.loan != 2 && statusData.loan != 7 && statusData.loan != -2)
        return k422ErrorMessage(kSubmissionOfEmploymentNotCom);
      const masterData = userData.masterData ?? {};
      const miscData = masterData.miscData ?? {};
      const nextLoanPurposeId =
        typeof miscData.nextLoanPurposeId == 'string'
          ? +miscData.nextLoanPurposeId
          : miscData.nextLoanPurposeId;
      const targetPurposeId =
        miscData.purposeId == 0 ? null : miscData.purposeId;
      const purposeId = targetPurposeId ?? nextLoanPurposeId;
      const data = { userId, purposeId, reApply: true };
      // statusData.company = -1;
      // // Need to reset the below status in case company added again
      // statusData.salarySlip = -1;
      // statusData.workMail = -1;
      return await this.handleReApplyFlow(statusData, data, userData);
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region check previos mandates  is exprired or not which is 530 days ago created
  async checkPreviousMandates(userId) {
    try {
      const att = ['id', 'accountNumber', 'createdAt'];
      const today = new Date();
      const options = {
        where: {
          userId,
          [Op.and]: [Sequelize.literal(`LENGTH("accountNumber") < 20`)],
        },
      };
      const result = await this.subscriptionRepo.getTableWhereData(
        att,
        options,
      );
      if (result === k500Error) return kInternalError;
      if (result.length > 0) {
        for (let index = 0; index < result.length; index++) {
          try {
            const ele = result[index];
            const diff = this.typeService.dateDifference(today, ele?.createdAt);
            if (
              diff > REMANDATEDAYS &&
              !ele?.accountNumber.includes('EXPIRED')
            ) {
              const accountNumber =
                ele?.accountNumber + '-EXPIRED-' + today.getTime();
              const update = { accountNumber };
              await this.subscriptionRepo.updateRowData(update, ele?.id);
              continue;
            }

            const loanInclude = {
              model: loanTransaction,
              where: { subscriptionId: ele?.id },
            };

            //create transacction option
            const transactioOptions = {
              where: {
                status: 'FAILED',
                userId,
                [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
                [Op.and]: [
                  {
                    [Op.or]: [
                      { response: { [Op.iRegexp]: 'Account Blocked/Frozen' } },
                      { response: { [Op.iRegexp]: 'ACCOUNT CLOSED' } },
                      {
                        response: { [Op.iRegexp]: 'Payment Stopped by Drawer' },
                      },
                      { response: { [Op.iRegexp]: 'MANDATE NOT RECEIVED' } },
                      {
                        response: {
                          [Op.iRegexp]: 'INVALID UMRN OR INACTIVE MANDATE',
                        },
                      },
                      { response: { [Op.iRegexp]: 'Mandate Cancelled' } },
                      {
                        response: {
                          [Op.iRegexp]:
                            'Payment Stopped Under Court Order/Account Under Litigation',
                        },
                      },
                      { response: { [Op.iRegexp]: 'No such Account' } },
                      { response: { [Op.iRegexp]: 'Invalid Bank identifier' } },
                      {
                        response: { [Op.iRegexp]: 'debit_instrument_blocked' },
                      },
                      { response: { [Op.iRegexp]: 'mandate_not_active' } },
                      { response: { [Op.iRegexp]: 'bank_account_invalid' } },
                    ],
                  },
                ],
              },
              include: [loanInclude],
            };
            //get all transaction count
            const transactionData = await this.transactionRepo.getCountsWhere(
              transactioOptions,
            );
            if (transactionData === k500Error) return kInternalError;
            if (transactionData !== 0) {
              const updated: any = {};
              updated.accountNumber =
                ele?.accountNumber + 'STOPED' + new Date().getTime();
              await this.subscriptionRepo.updateRowData(updated, ele?.id);
            }
          } catch (error) {}
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  async empDetailsForBankingPro(reqData) {
    try {
      // Params validation
      const clienttxnid = reqData.clienttxnid;
      if (!clienttxnid) return kParamMissing('clienttxnid');

      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = ['companyName', 'salary'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['id'];
      userInclude.include = [empInclude];
      const include = [userInclude];
      const attributes = ['id'];
      const options = { include, where: { consentTxnId: clienttxnid } };

      const bankingData = await this.bankingRepo.getRowWhereData(
        attributes,
        options,
      );
      if (bankingData == k500Error) return kInternalError;
      if (!bankingData) return k422ErrorMessage(kNoDataFound);

      return bankingData.user?.employmentData ?? {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Checks user is eligible as per age criteria or not
  private async checkIsEligibleAsPerAge(userId, loanId) {
    try {
      const options = {
        where: { aadhaarStatus: '1', userId },
        order: [['id', 'desc']],
      };
      const att = ['id', 'aadhaarDOB'];
      const findKYC = await this.kycRepo.getRowWhereData(att, options);
      if (!findKYC || findKYC === k500Error) return true;
      if (!findKYC?.aadhaarDOB) return true;
      const isEligible: any = this.typeService.isEligibleAsPerAge(
        findKYC?.aadhaarDOB,
      );
      if (isEligible?.type) {
        const reason = kNotEligibleForNBFC;
        await this.eligiblityService.rejectLoan(
          SYSTEM_ADMIN_ID,
          loanId,
          reason,
          userId,
          null,
          null,
          true,
          true,
        );
        //reject step if loan is not available
        await this.eligiblityService.checkAndRejectSteps(userId, reason);
        return false;
      } else return true;
    } catch (error) {
      return true;
    }
  }

  async getFieldsForSameCompany(query) {
    try {
      const userId = query?.userId ?? '';
      if (!userId) return kParamMissing('userId');
      const isSame = query?.isSame ?? 'false';
      const isNew = query?.isNew ?? 'false';
      if (isSame == undefined) return kParamMissing('isSame');
      if (isNew == 'true') return kNewEmploymentFields;
      const empData: any = await this.repository.getRowWhereData(
        ['otherInfo'],
        {
          where: { userId },
        },
      );
      if (empData === k500Error) return kInternalError;
      if (isSame == 'true' && empData?.otherInfo) return kSameEmploymentFields;
      else return kEmploymentFields;
    } catch (e) {
      return kInternalError;
    }
  }

  //#region verify and store update details
  async verifyAndStoreInfoInstaFinance(companyName, userId) {
    try {
      //get cin number from Insta-Finance API
      const findCinNumber: any =
        await this.instaFinancial.searchCompanyInInstafinanc(companyName);
      if (findCinNumber?.message) return findCinNumber;
      let finalJsonData: any;
      let cin: any;
      let id: any;
      if (!findCinNumber.length) return findCinNumber;
      else {
        const find = findCinNumber.find((f) => f.id != null);
        const company_data = find ?? findCinNumber[0];
        let companyDetails = company_data.companyDetails;
        if (companyDetails) finalJsonData = company_data;
        else {
          //get data from Insta-Finance API
          companyName = company_data.name.replace(/[^a-zA-Z0-9]+/g, '-');
          cin = company_data.cin;
          id = company_data.id;
          let html1;
          let html2;
          let url;
          let url2;
          let finalData;
          let finalData2;
          if (
            companyName.includes('-LLP') ||
            companyName.includes('-LIMITED-LIABILITY-PARTNERSHIP')
          ) {
            /// this api get company details
            let body = {
              LLPID: company_data.LLPID,
              InstaUserID: '0',
            };
            html1 = await this.api.post(nInstafinaceLlpComapny, body);
            if (html1 === k500Error) return kInternalError;
            finalData = await this.getLLCompanyData(html1.d);
            /// this api get company director data of LLP company
            html2 = await this.api.post(nInstafinaceLlpDirectorName, body);
            if (html2 === k500Error) return kInternalError;
            finalData2 = await this.getLLPDirectorNames(html2.d);
          } else {
            /// this api get company details private company
            url = `${nInstafinacePrivateComapny}${companyName}/${cin}`;
            html1 = await this.api.get(url);
            if (html1 === k500Error) return kInternalError;
            finalData = await this.getPrivateCompanyData(html1);
            /// this api get company director data of private company
            url2 = `${nInstafinacePrivateDirectorName}/${companyName}/${cin}`;
            html2 = await this.api.get(url2);
            if (html2 === k500Error) return kInternalError;
            finalData2 = await this.getDirectorNames(html2);
          }

          companyDetails = { ...finalData, ...finalData2 };
          finalJsonData = { id, companyName, cin, companyDetails };
        }
      }
      //block the company according to condition and update company
      return await this.companyBlock(finalJsonData, userId);
    } catch (error) {
      return kInternalError;
    }
  }

  //#region  this company block
  async companyBlock(finalJsonData, userId) {
    try {
      const adminId = SYSTEM_ADMIN_ID;
      let companyName = finalJsonData?.companyName ?? '-';
      companyName = companyName.split('-').join(' ');
      let companyDetails = finalJsonData?.companyDetails ?? '-';
      const id = finalJsonData.id;
      /// check company details is json stringify or not
      if (typeof companyDetails == 'string')
        companyDetails = JSON.parse(companyDetails);
      const status =
        companyDetails['Company Status'] || companyDetails['LLP Status'];
      /// get date
      let date = companyDetails['Age (Incorp. Date)'].split('(')[1] ?? '-';
      date = date.replace(')', '');
      /// convert into date format
      if (date) date = date.split('-').reverse().join('-');

      // Fallback for invalid date
      if (date == '-') {
        try {
          let rawDate = companyDetails['Age (Incorp. Date)'] ?? '';
          if (rawDate.endsWith(' Years')) {
            const year = +rawDate.split(' ')[0];
            date = new Date();
            date.setFullYear(date.getFullYear() - year);
            date = date.toJSON().substring(0, 10);
          }
        } catch (error) {
          console.log({ error });
        }
      }
      const day = this.typeService.dateDifference(new Date(date), new Date());

      //check Incorp. Date and Status if day is less then 365 or status is deactive the block the company
      if (finalJsonData.id) {
        //update company data
        const update = {
          companyDetails,
          CIN: finalJsonData.cin,
          establishedDate: date ?? new Date(),
        };
        const id = finalJsonData.id;
        const data = await this.CompanyRepo.updateRowData(update, id);
        if (data == k500Error) return kInternalError;
      }

      const options = { where: { companyName } };
      const blackListedData = await this.blackListedCompanyRepo.getRowWhereData(
        ['companyName', 'adminId'],
        options,
      );
      if (blackListedData == k500Error) return kInternalError;
      if (blackListedData) return false;
      const eligibleCompanyStatus = [
        'Active',
        'Amalgamated',
        'Converted to LLP',
      ];
      if (
        eligibleCompanyStatus.includes(status) &&
        day >= COMPANY_INCORPORATION_MIN_DAY
      )
        return true;
      // cool off Data
      let nextApplyDate = new Date();
      let reasonId;
      let reason;
      if (!eligibleCompanyStatus.includes(status)) {
        await this.adminService.blackListCompanies(
          companyName,
          adminId,
          'SYSTEM',
        );
        nextApplyDate.setDate(nextApplyDate.getDate() + 60);
        reason = COMPANY_STATUS_IS_NOT_ACTIVE;
        reasonId = 55;
      } else if (!(day >= COMPANY_INCORPORATION_MIN_DAY)) {
        const reamingDays = COMPANY_INCORPORATION_MIN_DAY + 1 - day;
        nextApplyDate.setDate(nextApplyDate.getDate() + reamingDays);
        reason = INCORPORATE_DATE_IS_LESS_THAN_ONE_YEAR;
        reasonId = 54;
      }
      //add user in coolOff
      let coolOffData: any = {
        userId,
        type: '2',
        nextApplyDate,
        adminId: SYSTEM_ADMIN_ID,
        status: '0',
        reason,
        reasonId,
      };
      await this.adminService.changeBlacklistUser(coolOffData);
      return false;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  // get company details private company
  async getPrivateCompanyData(html) {
    const startIndexTXT = 'companyContentHolder_companyHighlightsContainer';
    const endIndexTXT = 'companyContentHolder_companyIndustryClassification';
    const startIndex = html.indexOf(startIndexTXT);
    const endIndex = html.indexOf(endIndexTXT);
    const finaltxt = html.substring(startIndex, endIndex);
    const list = finaltxt.split('<tr>');
    const final_list = [];
    for (let index = 0; index < list.length; index++) {
      const ele = list[index];
      const temp = ele.split('<td');
      for (let i = 0; i < temp.length; i++) {
        let d = temp[i];
        if (d.includes("scope='row'")) {
          d = d.replace("scope='row'>", '');
          d = d.trim();
          if (d.includes('<a ')) {
            let index = d.indexOf('<a');
            d = d.substring(index);
            index = d.indexOf('>');
            d = d.substring(index + 1);
          }
          d = d.replace('</td>', '');
          d = d.replace('</a>', '');
        } else {
          if (d.includes('<a ')) {
            const index = d.indexOf('<a');
            d = d.substring(index);
          }
          const index = d.indexOf('>');
          d = d.substring(index + 1);
          d = d.replace('</td>', '');
          d = d.replace('</a>', '');
          d = d.replace('</tr>', '');
          if (d.includes('</tbody></table>'))
            d = d.substring(0, d.indexOf('</tbody></table>'));
        }
        d = d.trim();
        if (d && !d.includes('<table ')) final_list.push(d);
      }
    }
    let result = {};

    for (let i = 0; i < final_list.length; i += 2) {
      const key = final_list[i];
      const value = final_list[i + 1];
      result[key] = value;
    }
    return result;
  }

  // get company details LLP company
  async getLLCompanyData(html) {
    try {
      let startIndex = html[1].indexOf('<tbody>');
      let endIndex = html[1].indexOf('</tbody>');
      let finaltxt = html[1].substring(startIndex, endIndex);
      const list = finaltxt.split('<tr>');
      let final_list = [];
      for (let i = 0; i < list.length; i++) {
        try {
          const ele = list[i];
          const temp = ele.split('<td');
          for (let j = 0; j < temp.length; j++) {
            try {
              let d = temp[j];
              if (d.includes('<tbody>')) d = d.replace('<tbody>', '');
              if (d.includes('>')) {
                d = d.split('>')[1];
                d = d.split('</td')[0];
                d = d.trim();
                final_list.push(d);
              }
            } catch (error) {}
          }
        } catch (error) {}
      }
      let result = {};

      for (let i = 0; i < final_list.length; i += 2) {
        try {
          const key = final_list[i];
          const value = final_list[i + 1];
          if (!key) continue;
          result[key] = value ?? '-';
        } catch (error) {}
      }
      return result;
    } catch (error) {}
  }

  //#region this give director name from html of private comapny
  async getDirectorNames(html2) {
    try {
      const startIndexTXT = 'directorContentHolder_currentDirectorsContainer';
      const endIndexTXT = 'directorContentHolder_signatoriesContainer';
      const startIndex = html2.indexOf(startIndexTXT);
      const endIndex = html2.indexOf(endIndexTXT);
      const finaltxt = html2.substring(startIndex, endIndex);
      const list = finaltxt.split('<tr>');
      const final_list = [];
      for (let index = 0; index < list.length; index++) {
        const ele = list[index];
        const temp = ele.split('<td');
        for (let i = 0; i < temp.length; i++) {
          let d = temp[i];
          if (d.includes("scope='row'")) {
            d = d.replace("scope='row'>", '');
            d = d.trim();
            if (d.includes('<a ')) {
              let index = d.indexOf('<a');
              d = d.substring(index);
              index = d.indexOf('>');
              d = d.substring(index + 1);
            }
            d = d.replace('</td>', '');
            d = d.replace('</a>', '');
            d = d.trim();
            if (d && !d.includes("scope='row'")) final_list.push(d);
          }
        }
      }
      const directorObject = {
        'Director Names': final_list,
      };
      return directorObject;
    } catch (error) {}
  }
  //#endregion

  //#region this give director name from html of LLP comapny
  async getLLPDirectorNames(html) {
    try {
      let startIndex = html[1].indexOf('<tbody>');
      let endIndex = html[1].indexOf('</tbody>');
      let finaltxt = html[1].substring(startIndex, endIndex);
      const list = finaltxt.split('<tr>');
      const final_list = [];
      for (let i = 0; i < list.length; i++) {
        try {
          let ele = list[i];
          if (ele.includes('<tbody>')) ele = ele.replace('<tbody>', '');
          const temp = ele.split("<td scope='row'>");
          for (let j = 0; j < temp.length; j++) {
            let d = temp[j];
            if (d.includes("<a target='_blank'")) {
              d = d.split('>')[1];
              d = d.split('</a')[0];
              d = d.trim();
              final_list.push(d);
            }
          }
        } catch (error) {}
      }
      const directorObject = {
        'Director Names': final_list,
      };
      return directorObject;
    } catch (error) {}
  }
  //#endregion

  //#region
  async getEmployementData(query) {
    try {
      const empId = query.empId;
      if (!empId) return kParamMissing('empId');
      const designationAttr = ['id', 'designationName'];
      const desigantionInclude = {
        model: employmentDesignation,
        attributes: designationAttr,
      };
      const sectorAttr = ['id', 'sectorName'];
      const sectorInclude = { model: employmentSector, attributes: sectorAttr };
      const attributes = [
        'companyName',
        'id',
        'startDate',
        'endDate',
        'salary',
        'salaryDate',
        'type',
      ];
      const options = {
        where: { id: empId },
        include: [desigantionInclude, sectorInclude],
      };
      const result = await this.repository.getRowWhereData(attributes, options);
      if (result == k500Error) return kInternalError;
      if (!result?.startDate) result.startDate = new Date().toJSON();
      return result;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion
}
