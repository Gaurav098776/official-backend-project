// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
  gIsPROD,
  BANK_NAME_FOR_IFSC,
  MIN_CIBIL_SCORE,
  MIN_PL_SCORE,
  CIBIL_MIN_OVERDUE,
  INQUIRY_PAST_30_DAYS,
  GLOBAL_RANGES,
} from 'src/constants/globals';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
  kUnproccesableEntity,
  kWrongDetails,
} from 'src/constants/responses';
import {
  BankStatmentVerificationSuccess,
  kCAMS,
  kInternalPolicy,
  kLoanDeclined,
  kNoDataFound,
  kOneMoney,
  SSalaryNotVerification,
  SSalaryVerification,
  kBankStatementFailedMSJ,
  kNetBanking,
  kBankingPro,
  InvalidIfscCode,
  kErrorMsgs,
  kfinvu,
  BAD_CIBIL_SCORE_MSG,
  kCC,
  kSupportMail,
  nbfcInfoStr,
  MIN_SALARY_CRITERIA,
  kNoReplyMail,
  kTechSupportMail,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { BanksRepository } from 'src/repositories/banks.repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { BankingSharedService } from 'src/shared/banking.service';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { DateService } from 'src/utils/date.service';
import { AARepository } from 'src/repositories/aa.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { AAEntity } from 'src/entities/aggregator.entity';
import { FileService } from 'src/utils/file.service';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { isNumber } from 'class-validator';
import { OneMoneyService } from 'src/thirdParty/oneMoney/one.money.service';
import { ValidationService } from 'src/utils/validation.service';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { ReportService } from 'src/admin/report/report.service';
import * as fs from 'fs';
import { IFSC_VALIDATE_URL } from 'src/constants/network';
import { APIService } from 'src/utils/api.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { EmiEntity } from 'src/entities/emi.entity';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { BankList } from 'src/entities/bank.entity';
import { CibilService } from 'src/shared/cibil.service';
import { AdminService } from '../admin/admin.service';
import { kNetBankingNotify } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { RedisService } from 'src/redis/redis.service';
import { NUMBERS } from 'src/constants/numbers';

@Injectable()
export class BankingService {
  constructor(
    private readonly aaRepo: AARepository,
    @Inject(forwardRef(() => CamsServiceThirdParty))
    private readonly camsService: CamsServiceThirdParty,
    private readonly dateService: DateService,
    private readonly fileService: FileService,
    private readonly loanRepo: LoanRepository,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly banksRepo: BanksRepository,
    private readonly branchesRepo: BranchesRepository,
    private readonly userRepository: UserRepository,
    private readonly bankRepo: BankingRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly sharedResidence: ResidenceSharedService,
    private readonly masterRepo: MasterRepository,
    private readonly employementRepo: EmploymentRepository,
    private readonly sharedBankService: BankingSharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly repoManager: RepositoryManager,
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly oneMoneyService: OneMoneyService,
    private readonly validation: ValidationService,
    private readonly bankListRepo: BankListRepository,
    private readonly reportService: ReportService,
    private readonly apiService: APIService,
    private readonly cibilService: CibilService,
    private readonly adminService: AdminService,
    // Database
    private readonly repo: RepositoryManager,

    private readonly userServiceV4: UserServiceV4,
    private readonly redisService: RedisService,
  ) {}

  async aaBanks(): Promise<any> {
    // Preparation -> Query
    const bankAttr = ['aaData', 'bankCode', 'fipName'];
    const bankOptions = {
      where: { aaData: { isActive: true, number: { [Op.ne]: null } } },
    };

    // Hit -> Query
    const bankList = await this.repo.getTableWhereData(
      BankList,
      bankAttr,
      bankOptions,
    );
    // Validation -> Query data
    if (bankList === k500Error) throw new Error();

    // Preparation -> Response list
    const finalizedList = [];
    bankList.forEach((el) => {
      finalizedList.push({
        bankCode: el.bankCode,
        fipId: el.fipName,
        fipName: el.aaData.fipName,
        logo: el.aaData.logo,
        mid: '',
        number: el.aaData.number,
        status: 'NOT_CHECKED',
      });
    });

    finalizedList.sort((a, b) => a.number - b.number);
    return finalizedList;
  }

  //#region get verification data
  async funGetVerificationData(query) {
    try {
      const options = await this.prepareNetBankingVerificationOptions(query);
      if (options?.message) return options;
      const bankingData = await this.findBankingData(options);
      if (bankingData?.message) return bankingData;
      const finalData: any = await this.prepareBankingRowData(
        bankingData?.rows,
        query,
      );
      if (await finalData?.message) return finalData;
      return { count: bankingData.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region prepare bankStatment verification data option
  private async prepareNetBankingVerificationOptions(query) {
    try {
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const adminId = query?.adminId;
      const newOrRepeated = query?.newOrRepeated;
      const startDate = query?.startDate ?? null;
      const endDate = query?.endDate ?? null;
      const download = query?.download ?? 'false';
      let searchText = query.searchText ?? null;
      const reject = query?.reject;
      const toDay = this.typeService.getGlobalDate(new Date());
      const loanOptions: any = { where: { bankingId: { [Op.ne]: null } } };
      const whereBankingData: any = {};
      if (startDate && endDate) {
        const range = this.typeService.getUTCDateRange(startDate, endDate);
        const dateRage = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
        if (status === '2') whereBankingData.salaryVerificationDate = dateRage;
        else whereBankingData.createdAt = dateRage;
      }
      if (adminId) whereBankingData.assignedTo = adminId;
      const empOptions: any = {};
      const salarySlipInclude = {
        model: SalarySlipEntity,
        attributes: ['id', 'status'],
        where: { status: { [Op.or]: ['1', '3'] } },
      };
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['id', 'status'],
        where: { status: { [Op.ne]: '5' } },
      };
      if (status == '4')
        whereBankingData.salaryVerification = { [Op.notIn]: ['-1', null] };
      else {
        if (status == '1' || status == '3')
          whereBankingData.salaryVerification = { [Op.or]: ['1', '3'] };
        else {
          if (status == '0') {
            empOptions.where = {
              companyVerification: { [Op.or]: ['1', '3'] },
              salarySlipId: { [Op.ne]: null },
              workMailId: { [Op.ne]: null },
            };
          }
          empOptions.include = [salarySlipInclude, workMailInclude];
          whereBankingData.salaryVerification = status;
          whereBankingData.isNeedAdditional = false;
        }
      }

      const bankingInclude = {
        model: BankingEntity,
        attributes: [
          'id',
          'userId',
          'name',
          'accountNumber',
          'bankStatement',
          'bank',
          'adminId',
          'salary',
          'salaryDate',
          'rejectReason',
          'status',
          'salaryVerification',
          'attempts',
          'additionalBankStatement',
          'isNeedAdditional',
          'createdAt',
          'updatedAt',
          'isNeedTagSalary',
          'assignedTo',
          'ifsCode',
        ],
        where: whereBankingData,
      };

      const notRejected = { [Op.ne]: 'Rejected' };
      if (status == '2') {
        if (reject != 'true') loanOptions.where.loanStatus = notRejected;
        else loanOptions.where.loanStatus = 'Rejected';
      }
      if (status != '0') {
        if (download != 'true') {
          loanOptions.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
          loanOptions.limit = PAGE_LIMIT;
        }
      } else
        loanOptions.where = { ...loanOptions.where, loanStatus: notRejected };

      let userWhere: any = {};
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') loanOptions.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = await this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userWhere = { phone: { [Op.iRegexp]: searchText } };
          } else userWhere = { fullName: { [Op.iRegexp]: searchText } };
        }
      }

      userWhere.isBlacklist = '0';
      userWhere.kycId = { [Op.ne]: null };
      if (newOrRepeated == '1') userWhere.completedLoans = 0;
      else if (newOrRepeated == '0') userWhere.completedLoans = { [Op.gt]: 0 };
      const employmentDetailsInclude = {
        model: employmentDetails,
        attributes: [
          'companyName',
          'salary',
          'salaryDate',
          'salarySlipId',
          'workMailId',
        ],
        ...empOptions,
      };

      const userInclude = {
        model: registeredUsers,
        where: { ...userWhere },
        required: true,
        attributes: ['id', 'city', 'fullName', 'completedLoans'],
        include: [employmentDetailsInclude],
      };
      if (status == '0')
        userInclude.where['NextDateForApply'] = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };

      const include = [bankingInclude, userInclude];
      loanOptions.include = include;
      return loanOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private async findBankingData(options) {
    try {
      const loanAttr = ['id', 'bankingId', 'loanStatus', 'verifiedDate'];
      const result = await this.loanRepo.getTableWhereDataWithCounts(
        loanAttr,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async prepareBankingRowData(list: any[], query) {
    try {
      const finalData = [];
      for (let index = 0; index < list.length; index++) {
        const ele = list[index];
        try {
          const tempData: any = {};
          const user = ele?.registeredUsers;

          const creditScore = this.typeService.sortCreditScore(user?.pbData);
          const banking = ele?.bankingData;
          const date = banking?.salaryVerificationDate ?? banking?.updatedAt;
          const lastUpdate = this.typeService.getDateFormatted(date);
          const createdAt = this.typeService.getDateFormatted(
            banking?.createdAt,
          );
          let rejectDate = ele?.verifiedDate ?? date;
          rejectDate = this.typeService.getDateFormatted(rejectDate);
          tempData['Assign'] = banking?.assignedAdminData?.fullName ?? '-';
          tempData['Loan id'] = ele?.id ?? '-';
          tempData['Name'] = user?.fullName ?? '-';
          tempData['Applied bank'] = banking?.bank ?? '-';
          tempData['Account number'] = banking?.accountNumber ?? '-';
          tempData['Company name'] = user?.employmentData?.companyName ?? '-';
          tempData['Salary'] = user?.employmentData?.salary ?? '-';
          tempData['Statement'] = banking?.bankStatement;
          tempData['Ifsc code'] = banking?.ifsCode;
          tempData['Additional statement'] =
            banking?.additionalBankStatement ?? '-';
          tempData['Completed loans'] = user?.completedLoans ?? '-';
          tempData['Credit score'] = creditScore ?? '-';
          tempData['City'] = user?.city ?? '-';
          tempData['Created at'] = createdAt ?? '-';
          tempData['Last updated'] = lastUpdate ?? '-';
          const netApproveByAdminIdData = banking.adminId;
          const netApproveByData = await this.commonSharedService.getAdminData(
            netApproveByAdminIdData,
          );
          banking.netApproveByData = {
            id: netApproveByData.id,
            fullName: netApproveByData.fullName,
          };
          tempData['Last action by'] =
            banking?.netApproveByData?.fullName ?? '-';
          tempData['Reject counts'] = banking?.attempts ?? '-';
          tempData['Reject date'] = rejectDate;
          tempData['Reject reason'] = banking?.rejectReason ?? '-';
          tempData['Status'] = banking?.salaryVerification ?? '';
          tempData['bankingId'] = banking?.id ?? '-';
          tempData['userId'] = banking?.userId ?? '-';
          const assignedToAdminId = banking.assignedTo;
          const assignedAdminData = await this.commonSharedService.getAdminData(
            assignedToAdminId,
          );
          banking.assignedAdminData = {
            id: assignedAdminData.id,
            fullName: assignedAdminData.fullName,
          };
          tempData['assignId'] = banking?.assignedAdminData?.id ?? '-';
          tempData['userSalaryDate'] = user?.employmentData?.salaryDate ?? '-';
          tempData['systemDate'] = banking?.salaryDate ?? '-';
          tempData['actualSalary'] = banking?.adminSalary ?? banking?.salary;
          tempData['isNeedTagSalary'] = banking?.isNeedTagSalary ?? '-';
          if (query?.download != 'true')
            tempData['byPass_status'] = banking?.status ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async findIfscDetails(query) {
    try {
      const bankId = query?.bankId;
      const state = query?.state;
      const city = query?.city;
      const branch = query?.branch;
      let data: any = [];
      if (!bankId) {
        data = await this.bankData();
      } else if (bankId && !state) {
        data = await this.stateData(bankId);
      } else if (bankId && state && !city)
        data = await this.cityData(bankId, state);
      else if (bankId && state && city && !branch)
        data = await this.branchesData(bankId, state, city);
      else if (branch)
        data = this.branchesRepo.getRowWhereData(['ifsc', 'branch'], {
          where: { branch },
        });
      if (data == k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async changeNetBankingStatus(body) {
    // Params validation
    if (!body.status || !body.adminId || !body.loanId) return kParamsMissing;
    if (body.status == '2' || body.status == '5')
      if (!body.rejectReason) return kParamsMissing;

    const status = body.status;
    const loanId = body.loanId;
    if (body.adminId != SYSTEM_ADMIN_ID) body.isRedProfile = false;
    const isRedProfile = body.isRedProfile ?? false;
    const options: any = {
      where: { isBlacklist: { [Op.ne]: '1' } },
    };
    if (isRedProfile) delete options.where.isBlacklist;
    const bankingInclude = {
      model: BankingEntity,
      attributes: [
        'id',
        'salary',
        'salaryDate',
        'userId',
        'salaryVerification',
        'netBankingScore',
        'accountNumber',
        'adminSalary',
      ],
    };
    const loanAttr = ['id', 'bankingId', 'userId', 'loanAmount'];
    const loanInclude = {
      model: loanTransaction,
      attributes: loanAttr,
      include: [bankingInclude],
    };
    const masterInclude = {
      attributes: [
        'id',
        'loanId',
        'status',
        'dates',
        'rejection',
        'coolOffData',
      ],
      model: MasterEntity,
      where: { loanId },
      include: [loanInclude],
    };
    const userAttributes = [
      'id',
      'fullName',
      'phone',
      'email',
      'fcmToken',
      'maybeGoodCibil',
      'appType',
      'loanStatus',
      'isCibilConsent',
    ];
    options.include = [masterInclude];

    // Query data
    const userData = await this.userRepository.getRowWhereData(
      userAttributes,
      options,
    );
    if (!userData) return k422ErrorMessage(kNoDataFound);
    if (userData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    // temporary redis code commented due to PROD issue
    // const key = `${loanId}_BANKDATABYLOANID`;
    // await this.redisService.del(key);

    if (status == '3' || status == '1')
      return await this.approvedBankStatement(userData, body);
    else if (status == '2' || status == '6')
      return await this.rejectBankStatement(userData, body);
  }

  async approvedBankStatement(userData, body) {
    // Params preparation
    const userId = userData?.id;
    const masterData = userData.masterData;
    const statusData = masterData?.status ?? {};
    const dates = masterData?.dates ?? {};
    const loanData = masterData.loanData;
    const bankingData = loanData.bankingData;
    const loanId = masterData.loanId;
    const today = new Date();

    if (+body?.salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT) {
      const nextApplyDate = new Date();
      nextApplyDate.setDate(
        nextApplyDate.getDate() +
          GLOBAL_RANGES.LOAN_REJECTION_WITH_LOW_SCORE_COOL_OFF,
      );
      await this.adminService.changeBlacklistUser({
        userId,
        adminId: SYSTEM_ADMIN_ID,
        type: '2',
        reason: MIN_SALARY_CRITERIA,
        reasonId: 45,
        status: '0',
        nextApplyDate,
      });
      return { needUserInfo: true, userId };
    }

    if (userData.isCibilConsent == 1) {
      const cibilResult = await this.cibilService.cibilPersonalLoanScore({
        userId,
        loanId,
      });
      if (cibilResult?.UUData)
        userData.maybeGoodCibil = cibilResult?.UUData.maybeGoodCibil;
      if (cibilResult.isLoanDeclined == true) {
        const adminId = SYSTEM_ADMIN_ID;
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 90);

        // Reject loan at this step
        await this.adminService.changeBlacklistUser({
          userId,
          adminId,
          type: '2',
          reason: BAD_CIBIL_SCORE_MSG,
          reasonId: 52,
          status: '0',
          nextApplyDate: targetDate,
        });
      }
    }

    const cibilData = await this.getCibilDataForStatementApproval({
      userId,
      loanId,
    });
    if (cibilData.isCibilError === true) return { needUserInfo: true, userId };
    // Update banking record
    let updateData: any = {
      adminId: body.adminId,
      salary: +body.salary,
      adminSalary: +body.salary,
      salaryDate: +body.salaryDate,
      salaryVerification: body.status,
      salaryVerificationDate: this.typeService
        .getGlobalDate(new Date())
        .toJSON(),
    };
    if (body?.nameMissMatch) {
      updateData.nameMissMatch = body.nameMissMatch;
      updateData.nameMissMatchAdmin = body.adminId;
    }
    let updatedResponse = await this.repoManager.updateRowData(
      BankingEntity,
      updateData,
      bankingData.id,
    );
    if (updatedResponse === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    // Update loan record
    let updatedData: any = {
      bankingId: bankingData.id,
      verifiedSalaryDate: +body.salaryDate,
    };
    let updatedResult = await this.repoManager.updateRowData(
      loanTransaction,
      updatedData,
      masterData.loanId,
    );
    if (updatedResult == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    // Check user's loan eligibility
    const eligibilityData = await this.sharedEligibility.checkLoanEligibility({
      loanId,
      userId,
    });
    if (eligibilityData?.message) return eligibilityData;
    if (eligibilityData.isEligible === false) {
      return { needUserInfo: true, userId };
    }
    // Check for next step -> Final approval
    const approved = [1, 3];
    if (
      approved.includes(statusData?.bank) &&
      approved.includes(statusData?.pan) &&
      approved.includes(statusData?.selfie) &&
      approved.includes(statusData?.contact) &&
      approved.includes(statusData?.reference)
    ) {
      statusData.loan = 0;
      statusData.eligibility = 0;
    }

    // Update master record
    dates.banking = today.getTime();
    statusData.bank = +body.status;
    const masterId = masterData.id;
    updatedData = { status: statusData, dates };
    updatedResult = await this.masterRepo.updateRowData(updatedData, masterId);

    if (updatedResult == k500Error) return kInternalError;
    await this.sharedResidence.validateAddress({ loanId, userId });

    // State eligibility
    const stateEligiblity =
      await this.sharedEligibility.validateStateWiseEligibility({
        userId,
        salary: +body.salary,
      });
    if (stateEligiblity.message) return stateEligiblity;

    await this.sharedBankService.assignToAdmin('0', loanId);

    const finalApproval = await this.sharedEligibility.finalApproval({
      loanId,
      userId,
    });
    if (finalApproval.message) return finalApproval;
    // Admin should not wait untill notification succeed
    this.notifyUserForStatementApproval({ userData, adminId: body.adminId });

    return { needUserInfo: true, userId };
  }

  private async getCibilDataForStatementApproval({
    userId,
    loanId,
  }): Promise<{ isGoodCibil: boolean; isCibilError: boolean }> {
    // Query preparation
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['completedLoans'];
    const include = [userInclude];
    const attributes = [
      'id',
      'cibilScore',
      'plScore',
      'PLOutstanding',
      'overdueBalance',
      'inquiryPast30Days',
      'validCibilData',
      'status',
    ];
    const options = {
      include,
      order: [['id', 'DESC']],
      where: { type: '1', userId, loanId },
    };
    // Query
    const scoreData = await this.repoManager.getRowWhereData(
      CibilScoreEntity,
      attributes,
      options,
    );
    // Validate query data
    if (scoreData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (!scoreData) return { isGoodCibil: false, isCibilError: true };

    let isCibilError = false;
    if (scoreData?.status !== '1' || !scoreData) isCibilError = true;

    // Check cibil good user criteria
    if (
      scoreData?.id &&
      scoreData?.cibilScore >= MIN_CIBIL_SCORE &&
      scoreData?.plScore >= MIN_PL_SCORE &&
      scoreData?.overdueBalance == CIBIL_MIN_OVERDUE &&
      scoreData?.inquiryPast30Days <= INQUIRY_PAST_30_DAYS &&
      scoreData?.validCibilData == 1 &&
      scoreData?.status == '1'
    ) {
      const attributes = ['penalty_days'];
      const options = {
        order: [['id', 'DESC']],
        where: { userId, penalty_days: { [Op.gt]: 2 } },
      };
      const delayEMIList = await this.repoManager.getRowWhereData(
        EmiEntity,
        attributes,
        options,
      );
      if (delayEMIList == k500Error)
        throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
      if (!delayEMIList) {
        return { isGoodCibil: true, isCibilError };
        // await this.sharedBankingService.sendLowInterestWhatsappMsg(userData);
        // await this.sharedNotification.sendEmailToUser(
        //   kTInterestEligible,
        //   email,
        //   userId,
        //   { fullName: userData?.fullName, appType: userData?.appType },
        // );
      }
    }

    return { isGoodCibil: false, isCibilError: isCibilError };
  }

  private async notifyUserForStatementApproval({ userData, adminId }) {
    await this.sendNetBankingStatusNotification(userData, '3', null, adminId);
  }

  async bankData() {
    try {
      return await this.banksRepo.getTableWhereData(['id', 'name'], {
        order: [['name']],
      });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async rejectBankStatement(userData, body) {
    try {
      const adminId = body.adminId;
      const nameMissMatch = body?.nameMissMatch;

      const updateData: any = {
        salaryVerification: body.status == '6' ? '2' : body.status,
        adminId,
        salaryVerificationDate: new Date().toJSON(),
        rejectReason:
          body.status == '2' || body.status == '6' ? body.rejectReason : '',
      };
      if (nameMissMatch) {
        updateData.nameMissMatch = nameMissMatch;
        updateData.nameMissMatchAdmin = adminId;
      }
      const masterData = userData.masterData;
      const userId = userData.id;
      const loanData = masterData.loanData;
      const bankingData = loanData.bankingData;
      let statusData = masterData.status;
      let dates = masterData?.dates ?? {};
      let coolOffData = masterData?.coolOffData ?? {};
      let rejection = masterData?.rejection ?? {};
      statusData.bank = 2;
      dates.banking = new Date().getTime();
      rejection.banking = body.rejectReason;
      let masterUpdateData;

      if (body.status == '6' && nameMissMatch != 2) {
        masterUpdateData = await this.rejectLoanOnBankStatmentReject(
          body.rejectReason,
          body.adminId,
          userId,
          30,
          masterData,
        );
        if (masterUpdateData.message) return kInternalError;
        statusData = masterUpdateData.status;
        dates = masterUpdateData.dates;
        coolOffData = masterUpdateData.coolOffData;
      }
      const updatedBank = await this.bankRepo.updateRowData(
        updateData,
        bankingData.id,
      );
      if (updateData == k500Error || updatedBank[0] <= 0)
        return k422ErrorMessage('Bank statement not updated!');

      await this.masterRepo.updateRowData(
        { status: statusData, dates, rejection, coolOffData },
        masterData.id,
      );

      if (nameMissMatch == 2) {
        const updateData = {
          userId,
          reason: body.rejectReason,
          status: '1',
          adminId,
          type: '1',
        };
        await this.adminService.changeBlacklistUser(updateData);
      }

      const rejectReasonData =
        await this.commonSharedService.getRejectReasonTemplate(
          body.rejectReason,
        );
      if (rejectReasonData?.message) return rejectReasonData;
      this.sendNetBankingStatusNotification(
        userData,
        updateData.salaryVerification,
        rejectReasonData,
        body.adminId,
      );
      return { needUserInfo: true, userId };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async stateData(bankId) {
    return this.branchesRepo.getTableWhereData(['state'], {
      where: { bank_id: bankId },
      group: 'state',
      order: [['state']],
    });
  }

  async cityData(bankId, state) {
    return this.branchesRepo.getTableWhereData(['city'], {
      where: { bank_id: bankId, state },
      group: 'city',
      order: [['city']],
    });
  }

  async branchesData(bankId, state, city) {
    return this.branchesRepo.getTableWhereData(['branch'], {
      where: { bank_id: bankId, state, city },
      order: [['branch']],
    });
  }

  async rejectLoanOnBankStatmentReject(
    rejectionReason,
    adminId,
    userId,
    blockDay = 1,
    masterData: any = {},
  ) {
    try {
      const userData = await this.userRepository.getRowWhereData(
        ['id', 'stage'],
        { where: { id: userId } },
      );
      if (!userData || userData === k500Error) return kInternalError;
      const toDay = this.typeService.getGlobalDate(new Date());
      const loanUpdate = await this.loanRepo.updateRowData(
        {
          loanStatus: 'Rejected',
          remark: rejectionReason,
          loanRejectReason: rejectionReason,
          loanRejectDate: toDay.toJSON(),
          verifiedDate: toDay.toJSON(),
          manualVerification: '2',
          manualVerificationAcceptId: adminId,
          lastStage: (userData?.stage ?? '').toString(),
        },
        masterData.loanId,
      );
      if (loanUpdate === k500Error) return kInternalError;
      const statusData = masterData?.status ?? {};
      const dates = masterData?.dates ?? {};
      const rejection = masterData?.rejection ?? {};
      const coolOffData = masterData?.coolOffData ?? {};
      statusData.loan = 2;
      statusData.eligibility = 2;
      rejection.loan = rejectionReason ?? '';
      dates.loan = new Date().getTime();

      // 1 day rejection time
      const nextApplyDate = this.typeService.getGlobalDate(new Date());
      nextApplyDate.setDate(nextApplyDate.getDate() + (blockDay ?? 1));
      coolOffData.coolOffStartedOn = toDay.toJSON();
      coolOffData.coolOffEndsOn = nextApplyDate.toJSON();
      coolOffData.count = (coolOffData.count ?? 0) + 1;
      coolOffData.reason = rejectionReason;
      const userUpdate = await this.userRepository.updateRowData(
        {
          NextDateForApply: nextApplyDate,
        },
        userId,
      );
      if (userUpdate === k500Error) return kInternalError;
      // Refresh user stage
      await this.userServiceV4.routeDetails({ id: userId });
      return { status: statusData, coolOffData, dates };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendNetBankingStatusNotification(
    userData,
    status,
    rejectReasonData,
    adminId,
  ) {
    try {
      userData.phone = this.cryptService.decryptPhone(userData.phone);
      // notification record on database
      let title;
      let body;
      if (status == '6') {
        title = kLoanDeclined;
        body = kInternalPolicy;
      } else if (status == '2') {
        title = SSalaryNotVerification;
        body = rejectReasonData?.content;
      } else if (status == '3') {
        title = SSalaryVerification;
        body = BankStatmentVerificationSuccess;
      }

      // Push notification
      this.sharedNotification.sendNotificationToUser({
        userList: [userData.id],
        title,
        content: body,
        adminId,
      });

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funBackInToBank(body) {
    try {
      const loanId = body?.loanId;
      const onlyBank = body?.onlyBank ?? false;
      const adminId = body?.adminId;
      if (!loanId) return kParamsMissing;
      const masterOptions: any = { where: { loanId } };
      if (!onlyBank) masterOptions.where.status = { loan: 0 };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus', 'bankingId'],
      };
      masterOptions.include = [loanInclude];
      const masterData = await this.masterRepo.getRowWhereData(
        ['id', 'status', 'rejection', 'dates', 'userId'],
        masterOptions,
      );
      if (masterData == k500Error || !masterData) return kInternalError;

      const loanData = masterData.loanData;
      const statusData = masterData?.status ?? {};
      let bankingId = loanData?.bankingId;
      const userId = masterData?.userId;
      const updateData: any = { salaryVerification: '0' };
      statusData.bank = 0;
      statusData.loan = -1;
      statusData.eligibility = -1;
      if (adminId) updateData.adminId = adminId;
      const bankData = await this.bankRepo.copyWith(updateData, bankingId);
      if (!bankData || bankData == k500Error) return kInternalError;
      bankingId = bankData?.id;

      const loanUpdate = onlyBank
        ? { bankingId }
        : {
            bankingId,
            manualVerification: '-1',
            loanStatus: 'InProcess',
          };
      const update = await this.loanRepo.updateRowData(loanUpdate, loanId);
      await this.masterRepo.updateRowData(
        { status: statusData },
        masterData.id,
      );
      if (!update || update == k500Error) return k500Error;

      const empData = await this.employementRepo.update(
        { bankingId },
        { userId },
      );
      if (!empData || empData == k500Error) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funSkipStatement(body) {
    try {
      const loanId = body.loanId;
      const bankingId = body.bankingId;
      const adminId = body.adminId;
      if (!loanId || !bankingId || !adminId) return kParamsMissing;
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus', 'bankingId'],
      };

      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'isRedProfile'],
      };

      const masterOptions = {
        where: { loanId },
        include: [loanInclude, userInclude],
      };
      const masterData = await this.masterRepo.getRowWhereData(
        ['id', 'status', 'dates'],
        masterOptions,
      );
      if (masterData == k500Error || !masterData)
        return k422ErrorMessage('No data found!');
      const isRedProfile = (masterData?.userData?.isRedProfile ?? 0) === 2;
      // if old defulter then approved
      if (isRedProfile) {
        const body = {
          status: '3',
          adminId: SYSTEM_ADMIN_ID,
          loanId: loanId,
          isRedProfile,
          salary: 70000,
          salaryDate: 1,
        };
        return await this.changeNetBankingStatus(body);
      }
      const loanData = masterData.loanData;
      const statusData = masterData?.status ?? {};
      if (loanData.bankingId != bankingId) return kInternalError;
      const attribute = ['id', 'userId', 'loanId'];
      const where = {
        id: bankingId,
        salaryVerification: ['0', '-1', '4'],
      };
      statusData.bank = 0;
      const options = { where };
      const result = await this.bankRepo.findOne(attribute, options);
      if (!result || result === k500Error || !bankingId) return kInternalError;
      const updateData = { salaryVerification: '0', skipStmtAdmin: adminId };
      const update = await this.bankRepo.update(updateData, bankingId);

      if (!update || update === k500Error) return kInternalError;
      await this.masterRepo.updateRowData(
        { status: statusData },
        masterData.id,
      );

      await this.sharedBankService.assignToAdmin('0', loanId);
      const data = {
        userId: result?.userId,
        loanId: result?.loanId,
        type: 'Verification',
        subType: 'Salary verification',
        oldData: '4',
        newData: '0',
        adminId: adminId,
        ip: body.ip,
      };
      const updateHistory = await this.changeLogsRepo.create(data);
      if (!updateHistory || updateHistory == k500Error) return kInternalError;

      await this.userServiceV4.routeDetails({ id: result?.userId });

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetAllBankStatement(query) {
    try {
      const loanId = query.loanId;
      if (!loanId) return kParamMissing('loanId');
      const attributes = [
        'id',
        'bankStatement',
        'salaryVerification',
        'additionalBankStatement',
        'adminId',
        'createdAt',
        'additionalURLs',
      ];
      const options = {
        where: { loanId: loanId },
      };
      const bankingData = await this.bankRepo.getTableWhereData(
        attributes,
        options,
      );
      if (!bankingData || bankingData == k500Error) return kInternalError;
      const allBankStatement = [];
      for (let index = 0; index < bankingData.length; index++) {
        const ele = bankingData[index];
        if (ele.additionalBankStatement)
          allBankStatement.push({
            bankStatement: ele.additionalBankStatement,
            id: ele.id,
            salaryVerification: ele.salaryVerification,
            ceatedAt: ele.createdAt,
            admin:
              (await this.commonSharedService.getAdminData(ele?.adminId))
                ?.fullName ?? '-',
          });
        if (ele?.additionalURLs) {
          try {
            let additionalURLs = JSON.parse(ele?.additionalURLs ?? []);
            for (const element of additionalURLs) {
              const adminData = await this.commonSharedService.getAdminData(
                ele?.adminId,
              );
              const adminFullName = adminData?.fullName ?? '-';
              allBankStatement.push({
                bankStatement: element,
                id: ele.id,
                salaryVerification: ele.salaryVerification,
                ceatedAt: ele.createdAt,
                admin: adminFullName,
              });
            }
          } catch (error) {}
        }
        allBankStatement.push({
          bankStatement: ele.bankStatement,
          id: ele.id,
          salaryVerification: ele.salaryVerification,
          ceatedAt: ele.createdAt,
          admin:
            (await this.commonSharedService.getAdminData(ele?.adminId))
              ?.fullName ?? '-',
        });
      }
      return { loanData: allBankStatement };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateSkipBankStatementData() {
    try {
      const bankingInclude = {
        model: BankingEntity,
        where: { salaryVerification: { [Op.ne]: '4' } },
        attributes: ['id', 'salaryVerification', 'loanId'],
        required: true,
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus'],
        where: { loanStatus: { [Op.ne]: 'Rejected' } },
        include: [bankingInclude],
        required: true,
      };
      const masterData = await this.masterRepo.getTableWhereData(
        ['id', 'status', 'loanId'],
        {
          where: { status: { bank: 4, loan: { [Op.ne]: 2 } } },
          include: [loanInclude],
        },
      );
      if (masterData == k500Error) return kInternalError;
      const bankingIds: any = [];
      masterData.forEach((ele) => {
        const loanData = ele.loanData;
        const bankingData = loanData.bankingData;
        if (bankingData?.id) bankingIds.push(bankingData.id);
      });
      if (bankingIds.length == 0) return {};
      await this.bankRepo.updateRowData(
        { salaryVerification: '4' },
        bankingIds,
      );
      return bankingIds;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async resetAAStuckUsers() {
    try {
      const updatedAt = new Date();
      updatedAt.setMinutes(updatedAt.getMinutes() - 15);
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['masterId', 'userId'];
      loanInclude.where = { loanStatus: 'InProcess' };
      loanInclude.include = [masterInclude];
      const include = [loanInclude];
      const attributes = ['id'];
      const options = {
        include,
        where: {
          accountDetails: { [Op.eq]: null },
          consentTxnId: { [Op.ne]: null },
          salaryVerification: '4',
          updatedAt: { [Op.lte]: updatedAt },
        },
      };

      const bankingList = await this.bankRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankingList == k500Error) return kInternalError;

      const userList = [];
      for (let index = 0; index < bankingList.length; index++) {
        try {
          const bankingData = bankingList[index];
          const loanData = bankingData.loanData ?? {};
          const masterData = loanData.masterData ?? {};
          const masterId = loanData.masterId;
          const userId = loanData.userId;
          const bankingId = bankingData.id;
          const statusData = masterData.status ?? {};
          statusData.bank = -1;
          const salaryVerification = '-1';

          // Update banking data
          let updatedData: any = { salaryVerification };
          let updateResponse = await this.bankRepo.updateRowData(
            updatedData,
            bankingId,
          );
          if (updateResponse == k500Error) continue;

          // Update master data
          updatedData = { status: statusData };
          updateResponse = await this.masterRepo.updateRowData(
            updatedData,
            masterId,
          );
          if (updateResponse == k500Error) continue;

          userList.push(userId);
        } catch (error) {}
      }

      const body = {
        userList,
        title: 'Bank verification failed !',
        content: kBankStatementFailedMSJ,
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async gatherBankingDataByLoanId(loanId: number) {
    try {
      const loanAttributes = ['id', 'mandate_id', 'subscriptionId'];
      const loanOptions: any = {};
      loanOptions.where = { id: loanId };
      const bankingDataInclude = [
        {
          model: BankingEntity,
          attributes: [
            'id',
            'mandateAccount',
            'disbursementAccount',
            'accountNumber',
            'ifsCode',
            'bank',
            'bankStatement',
            'accountUID',
            'additionalAccountNumber',
            'additionalBank',
            'additionalBankStatement',
            'additionalIFSC',
            'consentId',
            'consentMode',
            'salary',
            'adminSalary',
            'salaryDate',
            'tagSalaryData',
            'aaDataStatus',
          ],
        },
        {
          required: false,
          model: SubScriptionEntity,
          attributes: ['id', 'mode', 'subType'],
        },
      ];
      loanOptions.include = bankingDataInclude;
      // temporary redis code commented due to PROD issue
      // const key = `${loanId}_BANKDATABYLOANID`;
      // let loanBankData = await this.redisService.getKeyDetails(key);
      // if (!loanBankData) {
      const loanBankData = await this.loanRepo.getRowWhereData(
        loanAttributes,
        loanOptions,
      );
      // await this.redisService.set(
      //   key,
      //   JSON.stringify(loanBankData),
      //   NUMBERS.SEVEN_DAYS_IN_SECONDS,
      // );
      // } else loanBankData = JSON.parse(loanBankData);
      if (loanBankData === k500Error) return k500Error;

      const bankingData = loanBankData?.bankingData ?? {};
      const logsOptions = {
        where: { loanId, type: 'Verification', subType: 'Salary Date' },
        order: [['id', 'DESC']],
      };
      const lastAction = await this.changeLogsRepo.getRowWhereData(
        ['newData'],
        logsOptions,
      );
      if (lastAction == k500Error) bankingData.approvedSalaryDate = null;
      bankingData.verifiedBy =
        bankingData?.aaDataStatus != 3 &&
        bankingData?.bankStatement != null &&
        !bankingData?.consentMode
          ? 'BANKINGPRO'
          : bankingData?.consentMode;

      loanBankData.bankingData = bankingData;
      return loanBankData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region -> Dashboard apis
  async aaInsights(reqData) {
    // Dashboard count
    const countOnly = reqData.isCount == 'true';
    if (countOnly) return await this.aaInsightsCount(reqData);

    // Data with pagination
    return await this.aaInsightsData(reqData);
  }

  private async aaInsightsCount(reqData) {
    try {
      // Params validation
      const minDate = reqData.minDate;
      if (!minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (!maxDate) return kParamMissing('maxDate');
      const purpose = reqData.purpose;
      if (!purpose) return kParamMissing('purpose');

      const dateRange = this.dateService.unixDateRange(minDate, maxDate);
      const targetList = await this.repoManager.injectRawQuery(
        AAEntity,
        `SELECT DISTINCT ON ("AAEntities"."loanId") "AAEntities"."loanId", "AAEntities"."id", "AAEntities"."balance", "EmiEntities"."principalCovered", "EmiEntities"."interestCalculate" FROM public."AAEntities" INNER JOIN public."EmiEntities" ON "EmiEntities"."id" = "AAEntities"."emiId" WHERE "endOn" >= ${dateRange.minRange} AND "endOn" <= ${dateRange.maxRange} ORDER BY "loanId", "id" DESC`,
      );
      if (targetList == k500Error) return kInternalError;

      const insightsData = {
        sufficientCount: 0,
        inSufficientCount: 0,
        zeroBalanceCount: 0,
      };
      targetList.forEach((el) => {
        try {
          const balance = el.balance ?? 0;
          const emiAmount =
            (el.principalCovered ?? 0) + (el.interestCalculate ?? 0);
          if (balance >= emiAmount) insightsData.sufficientCount++;
          else if (balance <= 100) insightsData.zeroBalanceCount++;
          else insightsData.inSufficientCount++;
        } catch (error) {}
      });

      return insightsData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async aaInsightsData(reqData) {
    try {
      // Params validation
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const totalTypes = ['sufficient', 'inSufficient', 'zeroBalance'];
      if (!totalTypes.includes(type)) return kInvalidParamValue('type');
      const minDate = reqData.minDate;
      if (!minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (!maxDate) return kParamMissing('maxDate');
      const purpose = reqData.purpose;
      if (!purpose) return kParamMissing('purpose');
      const page = reqData.page;
      if (!page) return kParamMissing('page');
      let searchText = reqData.searchText ?? '';
      if (searchText.length <= 2) searchText = '';
      const isDownload = reqData.download == 'true';

      // Query preparation
      const dateRange = this.dateService.unixDateRange(minDate, maxDate);
      const offsetValue = page * PAGE_LIMIT - PAGE_LIMIT;
      let attributes = `SELECT "AAEntities"."userId", "registeredUsers"."fullName", "AAEntities"."id" ,"AAEntities"."loanId", "AAEntities"."userId", 
      SUM("principalCovered" + "interestCalculate") as "dueAmount", "balance", "endOn", "registeredUsers"."completedLoans", "emi_date"
      FROM "AAEntities"`;
      let join = `INNER JOIN "EmiEntities" ON "EmiEntities"."id" = "AAEntities"."emiId"
      INNER JOIN "registeredUsers" ON "registeredUsers"."id" = "AAEntities"."userId"`;
      let where = `WHERE "endOn" >= ${dateRange.minRange} AND "endOn" <= ${dateRange.maxRange} AND "latestFetch" = 'true'`;
      if (searchText != '')
        where += ` AND "registeredUsers"."fullName" ILIKE '${searchText}%'`;
      let groupBy = `GROUP BY  "balance", "AAEntities"."loanId", "AAEntities"."userId", "registeredUsers"."fullName", "endOn", 
      "registeredUsers"."completedLoans", "AAEntities"."id", "emi_date"`;
      // Sufficient balance
      let having = `HAVING "balance" >= SUM("principalCovered" + "interestCalculate")`;
      // InSufficient balance
      if (type == 'inSufficient')
        having = `HAVING "balance" < SUM("principalCovered" + "interestCalculate") AND "balance" > '100'`;
      else if (type == 'zeroBalance') having = `HAVING "balance" <= '100'`;
      const offset = isDownload ? '' : `offset ${offsetValue}`;
      const limit = isDownload ? '' : `LIMIT ${PAGE_LIMIT}`;
      // Query -> Data with pagination
      let rawQuery = `${attributes} ${join} ${where} ${groupBy} ${having} ${offset} ${limit} `;
      const rows = await this.repoManager.injectRawQuery(AAEntity, rawQuery);
      if (rows == k500Error) return kInternalError;

      // Fine tune
      const preparedList = [];
      rows.forEach((el) => {
        const dateInfo = this.dateService.unixToReadableFormat(el.endOn);
        const emiDateInfo = this.dateService.dateToReadableFormat(el.emi_date);
        preparedList.push({
          userId: el.userId,
          Name: el.fullName,
          'Loan Id': el.loanId,
          'Current balance': el.balance ?? 0,
          'Emi date': emiDateInfo.readableStr,
          'Fetched date': dateInfo.readableStr,
          'Completed loans': el.completedLoans ?? 0,
        });
      });

      // Query -> Total count
      let count = 0;
      if (rows.length > 0 && !isDownload) {
        attributes = `SELECT COUNT("AAEntities"."id") FROM "AAEntities" `;
        if (searchText == '')
          join = `INNER JOIN "EmiEntities" ON "EmiEntities"."id" = "AAEntities"."emiId"`;
        having = `HAVING "balance" >= SUM("principalCovered" + "interestCalculate")`;
        groupBy = `GROUP BY "balance", "AAEntities"."id"`;
        rawQuery = `${attributes} ${join} ${where} ${groupBy} ${having}`;
        const countData = await this.repoManager.injectRawQuery(
          AAEntity,
          rawQuery,
        );
        if (countData == k500Error) return kInternalError;
        if (countData[0].count == null) return kInternalError;
        count = +countData[0].count;
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Aggregator - Pre emi'],
          data: [preparedList],
          sheetName: 'Aggregator - Pre emi.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { rows: preparedList, count };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion -> Dashboard apis

  //#region Account aggregator
  async checkAABalance(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const purpose = reqData.purpose;
      if (!purpose) return kParamMissing('purpose');

      // Table joins
      const bankingInclude: { model; attributes? } = { model: BankingEntity };
      bankingInclude.attributes = ['consentId', 'id'];
      // Query preparations
      const include = [bankingInclude];
      let attributes = ['userId'];
      let options: any = { include, where: { id: loanId } };
      // Query
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      const bankingData = loanData.bankingData ?? {};
      if (!bankingData) return k422ErrorMessage(kNoDataFound);
      if (!bankingData.consentId)
        return k422ErrorMessage(
          `There is no active consent for loanId ${loanId}`,
        );

      // Check previous request and prevent duplication (Reduce the cost)
      const consentId = bankingData.consentId;
      attributes = ['initiatedOn'];
      options = { order: [['id', 'DESC']], where: { consentId } };
      const existingData = await this.aaRepo.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return kInternalError;
      if (existingData) {
        const createdAt = new Date(existingData.initiatedOn * 1000);
        const today = new Date();
        const diffInMins = this.typeService.dateDifference(
          createdAt,
          today,
          'Minutes',
        );
        if (diffInMins < 15) {
          return k422ErrorMessage(
            `Please wait for ${
              15 - diffInMins
            } minutes, Previous request is in process`,
          );
        }
      }

      const creationData = {
        adminId,
        bankingId: bankingData.id,
        emiId: reqData.emiId,
        userId: loanData.userId,
        loanId,
        consentId,
        purpose,
        source: 1,
        initiatedOn: Math.floor(new Date().getTime() / 1000),
      };
      const createdData = await this.aaRepo.createRowData(creationData);
      if (createdData == k500Error) return kInternalError;

      if (gIsPROD) {
        const response: any = await this.camsService.fetchData(consentId);
        if (response?.message) return response;
      }
      // Dummy balance for non-production attempt
      else {
        const balances = [500, 1000, 1500, 2000, 2500, 5000];
        const randomBalance =
          balances[Math.floor(Math.random() * balances.length)];
        const response: any = await this.syncAABalance({
          bankingId: bankingData.id,
          balance: randomBalance,
          lastTransactionBalance: randomBalance,
          lastTransactionOn: Math.floor(new Date().getTime() / 1000),
        });
        if (response.message) return response;
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async syncAABalance(reqData) {
    try {
      // Params validation
      const bankingId = reqData.bankingId;
      if (!bankingId) return kParamMissing('bankingId');
      const balance = reqData.balance;
      if (balance == null) return kParamMissing('balance');
      const lastTransactionBalance = reqData.lastTransactionBalance;
      if (lastTransactionBalance == null)
        return kParamMissing('lastTransactionBalance');
      const latestStatement = reqData.statementUrl;
      if (latestStatement && typeof latestStatement != 'string')
        return kInvalidParamValue('statementUrl');
      const lastTransactionOn = reqData.lastTransactionOn;
      if (!lastTransactionOn) return kParamMissing('lastTransactionOn');
      if (!isNumber(lastTransactionOn))
        return kInvalidParamValue('lastTransactionOn');

      // Get latest data
      // Query preparation
      const attributes = ['id', 'latestFetch'];
      const options = { order: [['id', 'DESC']], where: { bankingId } };
      // Query
      const aaData = await this.aaRepo.getRowWhereData(attributes, options);
      if (aaData == k500Error) return kInternalError;
      if (!aaData) return k422ErrorMessage(kNoDataFound);

      // Prevents duplication attempts
      if (aaData?.latestFetch && gIsPROD)
        return k422ErrorMessage('This process can not proceed');

      // Update data
      let statementUrl = null;
      if (latestStatement)
        statementUrl = await this.cryptService.encryptText(latestStatement);
      const updatedData = {
        balance,
        endOn: Math.floor(new Date().getTime() / 1000),
        lastTransactionBalance,
        lastTransactionOn,
        latestFetch: true,
        statementUrl,
      };
      const updatedResult = await this.aaRepo.updateRowData(
        updatedData,
        aaData.id,
      );
      if (updatedResult == k500Error) return kInternalError;

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // #startregion reinitAAconsent
  async funReinitAAConsent() {
    try {
      const createdAt = new Date();
      createdAt.setMinutes(createdAt.getMinutes() - 15);
      const bankAtr = [
        'id',
        'loanId',
        'userId',
        'consentMode',
        'salaryVerification',
        'consentStatus',
        'createdAt',
      ];
      const loanInc = {
        model: loanTransaction,
        attributes: ['id'],
        where: { loanStatus: 'InProcess' },
        required: true,
      };
      const masterInc = {
        model: MasterEntity,
        attributes: ['id', 'status'],
      };
      const registeredUsersInc = {
        model: registeredUsers,
        attributes: ['id'],
        where: { stage: 20 },
        include: [masterInc],
        required: true,
      };
      const bankOptions = {
        where: {
          salaryVerification: '4',
          consentMode: { [Op.ne]: null },
          isNeedTagSalary: { [Op.ne]: '0' },
          createdAt: { [Op.lte]: createdAt },
          [Op.or]: [
            { accountDetails: { [Op.ne]: null } },
            { consentResponse: { [Op.ne]: null } },
            { consentStatus: 'ACTIVE' },
          ],
        },
        include: [loanInc, registeredUsersInc],
        order: [['id', 'DESC']],
      };
      const bankingData = await this.bankRepo.getTableWhereData(
        bankAtr,
        bankOptions,
      );
      if (bankingData === k500Error) return kInternalError;
      if (!bankingData) return [];
      const userList = [];
      for (let index = 0; index < bankingData.length; index++) {
        try {
          const masterData = bankingData[index].user.masterData ?? {};
          const masterId = masterData.id;
          const userId = bankingData[index].user.id;
          const bankingId = bankingData[index].id;
          const statusData = masterData.status ?? {};
          statusData.bank = -1;
          // Update banking data
          let updatedData: any = { salaryVerification: '-1' };
          let updateResponse = await this.bankRepo.updateRowData(
            updatedData,
            bankingId,
          );

          if (updateResponse === k500Error) continue;
          // Update master data
          updatedData = { status: statusData };
          updateResponse = await this.masterRepo.updateRowData(
            updatedData,
            masterId,
          );
          if (updateResponse === k500Error) continue;
          userList.push(userId);
        } catch (error) {}
      }
      const body = {
        userList,
        title: 'Bank verification failed !',
        content: kBankStatementFailedMSJ,
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return bankingData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // #endregion reinitAAconsent

  // check pending AA response and update account details
  async getPendingAAResponse(body) {
    try {
      const loanId = body?.loanId;
      const bankAtr = [
        'id',
        'loanId',
        'userId',
        'bank',
        'consentMode',
        'consentPhone',
        'accountID',
        'consentTxnId',
        'consentId',
        'accountNumber',
      ];
      const loanInc: any = {
        model: loanTransaction,
        attributes: ['id'],
        where: { loanStatus: { [Op.or]: ['InProcess', 'Accepted'] } },
      };
      if (loanId) loanInc.where.id = loanId;
      const bankOptions = {
        where: {
          salaryVerification: { [Op.or]: ['1', '3'] },
          consentMode: { [Op.or]: ['ONE_MONEY'] },
          accountDetails: { [Op.eq]: null },
        },
        include: [loanInc],
      };
      const bankingData = await this.bankRepo.getTableWhereData(
        bankAtr,
        bankOptions,
      );
      if (bankingData === k500Error) return kInternalError;
      const length = bankingData.length;
      if (!bankingData || length == 0) return {};
      for (let index = 0; index < length; index++) {
        try {
          const bank = bankingData[index];
          const bankingId = bank.id;
          const consentMode = bank?.consentMode;
          let accountData;
          if (consentMode == kOneMoney) {
            const result = await this.oneMoneyService.funGetallfidata({
              consentID: bank?.consentId,
            });
            if (result?.message) continue;
            for (let i = 0; i < result.length; i++) {
              try {
                const ele = result[i];
                const accNumber = (
                  ele?.maskedAccountNumber ?? ''
                ).toLowerCase();
                if (!accNumber) continue;
                const isValidNumber = this.validation.getCompareAN(
                  accNumber,
                  bank?.accountNumber,
                );
                if (isValidNumber) {
                  accountData = ele;
                  break;
                }
              } catch (error) {}
            }
            if (accountData && bankingId) {
              accountData = this.getAccountDetails(
                accountData,
                bank?.accountNumber,
              );
              if (!accountData || accountData?.message) continue;
              if (!accountData?.bank && bank?.bank)
                accountData.bank = bank?.bank;
            }
          }
          if (accountData) {
            const accountDetails = JSON.stringify(accountData);
            await this.bankRepo.updateRowData({ accountDetails }, bankingId);
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get account details
  private getAccountDetails(data, accountNumber) {
    try {
      const profile = ((data?.Profile?.Holders ?? {})?.Holder ?? [])[0] ?? {};
      let profileData: any = { aaService: true, ...profile };
      const summary = data?.Summary ?? {};
      profileData.ifscCode = summary?.ifscCode;
      profileData.accountNumber = accountNumber;
      profileData.accountType = summary?.type;
      return profileData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // update blank mandateAccount
  async updateBlankMandateAccount(body) {
    try {
      const loanId = body?.loanId;
      const bankAtr = [
        'id',
        'bank',
        'accountNumber',
        'mandateAccount',
        'mandateBank',
        'disbursementAccount',
        'disbursementBank',
      ];
      const loanInc: any = {
        model: loanTransaction,
        attributes: ['id'],
        where: { loanStatus: { [Op.or]: ['InProcess', 'Accepted'] } },
      };
      if (loanId) loanInc.where.id = loanId;
      const bankOptions = {
        where: {
          salaryVerification: { [Op.or]: ['1', '3'] },
          mandateAccount: { [Op.eq]: null },
        },
        include: [loanInc],
      };
      const bankingData = await this.bankRepo.getTableWhereData(
        bankAtr,
        bankOptions,
      );
      if (bankingData === k500Error) return kInternalError;
      const length = bankingData.length;
      if (!bankingData || length == 0) return {};
      for (let index = 0; index < length; index++) {
        try {
          const ele = bankingData[index];
          const bankingId = ele.id;
          const bank = ele.bank;
          const accountNumber = ele.accountNumber;
          const updateData: any = {};
          if (accountNumber && bank) {
            if (!ele?.mandateAccount) updateData.mandateAccount = accountNumber;
            if (!ele?.mandateBank) updateData.mandateBank = bank;
            if (!ele?.disbursementAccount)
              updateData.disbursementAccount = accountNumber;
            if (!ele?.disbursementBank) updateData.disbursementBank = bank;
            if (
              updateData?.mandateAccount ||
              updateData?.mandateBank ||
              updateData?.disbursementAccount ||
              updateData?.disbursementBank
            )
              await this.bankRepo.updateRowData(updateData, bankingId);
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //get all bank list service
  async getAllBankList(body) {
    const attributes = [
      'aaMode',
      'id',
      'bankName',
      'inAppService',
      'statusFlag',
      'updatedAt',
      'lastUpdatedBy',
      'statementService',
    ];

    const searchText = body.searchText ?? '';
    const page = +body.page || 1;
    const offset = page * PAGE_LIMIT - PAGE_LIMIT;

    const options: any = {
      limit: PAGE_LIMIT,
      offset,
      order: [['bankName', 'ASC']],
    };
    if (searchText.length >= 2)
      options.where = { bankName: { [Op.iRegexp]: searchText } };

    const bankList = await this.bankListRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (bankList === k500Error) throw new Error();

    const BankList = [];
    for (let index = 0; index < bankList.rows.length; index++) {
      try {
        const bank = bankList.rows[index];
        if (bank.inAppService === true && bank.statementService == true)
          bank.serviceProvider = [kBankingPro, kNetBanking];
        else if (bank.inAppService === true)
          bank.serviceProvider = [kNetBanking];
        else if (bank.aaMode === 0) {
          bank.serviceProvider = [kCAMS];
        } else if (bank.aaMode === 1) bank.serviceProvider = [kOneMoney];
        else if (bank.aaMode === 2) bank.serviceProvider = [kfinvu];
        else bank.serviceProvider = [kBankingPro];
        if (bank.statusFlag == '1') bank.status_flag = 'ACTIVE';
        else if (bank.statusFlag == '0') bank.status_flag = 'INACTIVE';

        bank.formattedDate =
          this.typeService.getDateFormatted(bank?.updatedAt) ?? '-';

        bank.lastUpdatedByName =
          (await this.commonSharedService.getAdminData(bank?.lastUpdatedBy)) ??
          '-';

        const obj = {
          ID: bank?.id ?? '-',
          'Bank Name': bank?.bankName ?? '-',
          'Active Service': bank?.serviceProvider ?? '-',
          Status: bank?.status_flag ?? '-',
          'Last Updated': bank?.formattedDate ?? '-',
          'Last Updated By': bank?.lastUpdatedByName?.fullName ?? '-',
        };
        BankList.push(obj);
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return { rows: BankList, count: bankList?.count };
  }

  //update bank list service
  async updateBankList(reqData: any) {
    const activeService: string[] = reqData?.activeService;
    if (!activeService) return kParamMissing('activeService');
    const id = reqData?.id;
    if (!id) return kParamMissing('id');
    const statusFlag = reqData?.status;
    if (statusFlag == null) return kParamMissing('status');
    const adminId = reqData?.adminId;
    if (!adminId) return kParamMissing('adminId');

    const allowedServices = [
      kNetBanking,
      kCAMS,
      kfinvu,
      kOneMoney,
      kBankingPro,
    ];
    const allowedStatus = ['ACTIVE', 'INACTIVE'];

    const allElementsValid = activeService.every((service) =>
      allowedServices.includes(service),
    );
    if (!allElementsValid) return kWrongDetails;
    if (!allowedStatus.includes(statusFlag)) return kWrongDetails;

    const bank = await this.bankListRepo.getRowWhereData(['id'], {
      where: { id: id },
    });
    if (bank === k500Error) throw new Error();
    if (!bank) return k422ErrorMessage(kNoDataFound);

    let inAppService = bank.inAppService ?? false;
    let netBankingService = bank.netBankingService ?? 0;
    let statementService = bank.statementService ?? false;
    let status = 0;
    let aaMode = -1;

    if (
      activeService.length > 1 &&
      (activeService.includes(kCAMS) ||
        activeService.includes(kOneMoney) ||
        activeService.includes(kfinvu))
    )
      return kWrongDetails;

    if (
      activeService.length > 1 &&
      activeService.includes(kNetBanking) &&
      activeService.includes(kBankingPro)
    ) {
      inAppService = true;
      statementService = true;
    } else if (activeService.includes(kCAMS)) aaMode = 0;
    else if (activeService.includes(kOneMoney)) aaMode = 1;
    else if (activeService.includes(kfinvu)) aaMode = 2;

    if (activeService.includes(kNetBanking)) inAppService = true;
    if (activeService.includes(kBankingPro)) statementService = true;

    if (statusFlag == 'ACTIVE') status = 1;

    const service = {
      aa: aaMode,
      statement: statementService,
      netBanking: inAppService,
    };

    const updatedData = {
      aaMode,
      inAppService,
      netBankingService,
      statementService,
      statusFlag: status,
      lastUpdatedBy: adminId,
      service,
    };

    const updatedResult = await this.bankListRepo.updateRowData(
      updatedData,
      id,
    );
    if (updatedResult === k500Error) throw new Error();
    return {};
  }

  async changeIsNeedAdditionalStatus(reqData) {
    try {
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'bankingId'],
        {
          where: {
            id: loanId,
          },
        },
      );
      if (loanData == k500Error) return kInternalError;
      if (!loanData.bankingId) return kBadRequest;
      const bankinkUpdateRes = await this.bankRepo.update(
        { isNeedAdditional: false },
        loanData.bankingId,
      );
      if (bankinkUpdateRes == k500Error) return kInternalError;
      return bankinkUpdateRes;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async netBankingStuckUsersNotify() {
    try {
      const today = this.typeService.getUTCDateRange(
        new Date().toString(),
        new Date().toString(),
      );
      const reqData = {
        subType: 1,
        type: 1,
        startDate: today.fromDate,
        endDate: today.endDate,
        count: false,
        download: false,
      };
      const data = await this.reportService.metricsInsights(reqData);
      if (data?.message) return data;

      const length = data?.length;
      let stuckCount = 0;
      const stuckUsers = [];
      for (let i = 0; i < length; i++) {
        try {
          const ele = data[i];
          if (
            ele.Status === 'STUCK IN FLOW' &&
            stuckUsers.indexOf(ele.userId) === -1
          ) {
            stuckCount++;
            stuckUsers.push({
              userId: ele.userId,
              Name: ele.Name,
              Bank: ele.Bank,
            });
          }
          if (stuckCount >= 3) {
            break;
          }
        } catch (error) {}
      }
      if (stuckUsers.length >= 3) await this.sendMailNetBanking(stuckUsers);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async sendMailNetBanking(stuckUsers) {
    try {
      let htmlData = fs.readFileSync(kNetBankingNotify, 'utf-8');
      if (!htmlData) return k422ErrorMessage('Mail format not readable');
      let tableHtml = `
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px;">No.</th>
          <th style="border: 1px solid black; padding: 8px;">User ID</th>
          <th style="border: 1px solid black; padding: 8px;">Name</th>
          <th style="border: 1px solid black; padding: 8px;">Bank</th>
        </tr>
      </thead>
      <tbody>
        ${stuckUsers
          .map(
            (user, index) => `
          <tr>
            <td style="border: 1px solid black; padding: 8px;">${
              index + 1
            }.</td>
            <td style="border: 1px solid black; padding: 8px;">${
              user.userId
            }</td>
            <td style="border: 1px solid black; padding: 8px;">${user.Name}</td>
            <td style="border: 1px solid black; padding: 8px;">${user.Bank}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
      htmlData = htmlData.replace('##TABLE##', tableHtml);
      htmlData = htmlData.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = htmlData.replace(
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      const fromMail = kNoReplyMail;
      const replyTo = kSupportMail;
      // SEND MAIL
      const subject = `User Issues - Assistance Requested`;
      await this.sharedNotification.sendMailFromSendinBlue(
        kTechSupportMail,
        subject,
        htmlData,
        null,
        kCC,
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region
  async checkNUpdateAddtionalIfsc(body) {
    try {
      const loanId = +body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const additionalIfsc = body?.additionalIfsc;
      if (!additionalIfsc) return kParamMissing('additionalIfsc');

      const loanAttr = ['id', 'bankingId', 'userId'];
      const loanOptions = {
        where: {
          id: loanId,
        },
      };

      const isIfscValid = await this.checkIfscValidation(additionalIfsc);
      if (isIfscValid === k500Error) return kInternalError;
      if (!isIfscValid) return k422ErrorMessage(InvalidIfscCode);
      const loanData = await this.loanRepo.getRowWhereData(
        loanAttr,
        loanOptions,
      );

      if (!loanData || loanData === k500Error)
        return k422ErrorMessage('Failed to fetch Loan data!');
      if (!loanData.bankingId)
        return k422ErrorMessage('Failed to fetch netbanking data!');
      const netbankingUpdateData = {
        additionalIFSC: (additionalIfsc ?? '0').toUpperCase(),
      };
      const updateBankingDataRes = await this.bankRepo.update(
        netbankingUpdateData,
        loanData?.bankingId,
      );
      return updateBankingDataRes;
    } catch (error) {}
  }

  //#region updateBankDetail
  async updateBankDetail(body) {
    try {
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      body.isMandate = body.isMandate ?? true;

      const loanAttr = ['bankingId', 'mandate_id', 'loanStatus', 'esign_id'];
      const loanData = await this.loanRepo.getRowWhereData(loanAttr, {
        where: {
          id: loanId,
          userId: userId,
        },
      });
      if (loanData === k500Error) return kInternalError;
      else if (!loanData?.bankingId) return kNoDataFound;
      else if (loanData?.mandate_id && body?.isMandate) return kBadRequest;
      else if (loanData?.esign_id && !body?.isMandate) return kBadRequest;
      const loanStatus = loanData?.loanStatus;
      if (loanStatus != 'InProcess' && loanStatus != 'Accepted')
        return kBadRequest;
      const isSalAcc = body?.isSalaryAccount ?? true;

      const bankingAttr = isSalAcc
        ? ['accountNumber', 'ifsCode', 'bank']
        : ['additionalAccountNumber', 'additionalIFSC', 'additionalBank'];
      const bankingData = await this.bankRepo.findOne(bankingAttr, {
        where: {
          id: loanData?.bankingId,
        },
      });
      if (bankingData === k500Error) return kInternalError;

      const accountNumber = isSalAcc
        ? bankingData?.accountNumber
        : bankingData?.additionalAccountNumber;
      const bank = isSalAcc ? bankingData?.bank : bankingData?.additionalBank;
      const ifsc = isSalAcc
        ? bankingData?.ifsCode
        : bankingData?.additionalIFSC;
      if (!accountNumber || !ifsc || (ifsc ?? '0') == '0') return kBadRequest;
      let accountDetial = {};
      if (body?.isMandate) {
        accountDetial = {
          mandateAccount: accountNumber,
          mandateBank: bank,
          mandateIFSC: ifsc,
          mandateAdminId: adminId,
        };
      } else {
        accountDetial = {
          disbursementAccount: accountNumber,
          disbursementBank: bank,
          disbursementIFSC: ifsc,
          disbursementAdminId: adminId,
        };
      }
      const updateData = await this.bankRepo.update(
        accountDetial,
        loanData?.bankingId,
      );
      if ((updateData ?? '0').toString() == '0') return kUnproccesableEntity;
      else return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check ifsc validation
  async checkIfscValidation(ifsc, bank?) {
    try {
      if (!ifsc || (ifsc ?? '') === '0') return true;
      const url = IFSC_VALIDATE_URL + ifsc;
      const result = await this.apiService.requestGet(url);
      if (!result || result === k500Error) return k500Error;
      if (result?.IFSC && bank) {
        let resBank = result?.BANK.toUpperCase();
        const bankNameOfRaz = BANK_NAME_FOR_IFSC[bank];
        if (bankNameOfRaz)
          if (resBank === bankNameOfRaz.toUpperCase()) return true;

        const bankAttr = ['id', 'bankName', 'bankCode'];
        const bankOptions = {
          where: { bankCode: bank },
        };
        const bankData = await this.bankListRepo.getRowWhereData(
          bankAttr,
          bankOptions,
        );
        if (!bankData || bankData == k500Error) return k500Error;
        let bankName = bankData?.bankName.toUpperCase();
        if (bankName == resBank) return true;
        const checkName = await this.validation.getTextProbability(
          resBank,
          bankName,
          ['BANK'],
        );
        if (checkName > 70) return true;
        if (
          bankName.replace(/ +/g, '').toLowerCase() ==
          resBank.replace(/ +/g, '').toLowerCase()
        )
          return true;
        if (
          bankName.slice(-4).toUpperCase() == 'BANK' ||
          resBank.slice(-4).toUpperCase() == 'BANK'
        ) {
          bankName = bankName.slice(0, -4);
          resBank = resBank.slice(0, -4);
          resBank = resBank.split(' ')[0];
          bankName = bankName.split(' ')[0];
          const checkName = await this.validation.getTextProbability(
            resBank,
            bankName,
            ['Bank'],
          );
          if (checkName > 70) return true;
          else return false;
        } else return false;
      } else if (result?.IFSC) return true;
      return false;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  // region start for get user all bankData
  async getBankingDataByUserId(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const bankAtrr = [
        'id',
        'loanId',
        'mandateAccount',
        'disbursementAccount',
        'accountNumber',
        'additionalAccountNumber',
        'ifsCode',
        'bank',
        'consentMode',
        'additionalBank',
        'additionalIFSC',
      ];
      const bankOpt = {
        where: { userId },
        order: [['id', 'desc']],
      };
      const userBankData = await this.bankRepo.getTableWhereData(
        bankAtrr,
        bankOpt,
      );
      if (userBankData === k500Error) return kInternalError;

      const loanIds = [...new Set(userBankData.map((item) => item.loanId))];
      const finalData = [];
      for (let i = 0; i < loanIds.length; i++) {
        try {
          const el = loanIds[i];
          const temp = {};
          const findData = userBankData.find((f) => f.loanId === el);

          temp['loanId'] = findData?.loanId ?? '-';
          temp['mandateAccount'] = findData?.mandateAccount ?? '-';
          temp['disbursementAccount'] = findData?.disbursementAccount ?? '-';
          temp['bank'] = findData?.bank ?? '-';
          temp['ifsCode'] = findData?.ifscCode ?? '-';
          temp['source'] = findData?.consentMode ?? '-';
          if (
            findData?.additionalIFSC ||
            findData?.additionalBank ||
            findData?.additionalAccountNumber
          ) {
            temp['additinalAccountData'] = {
              additionalBank: findData?.additionalBank ?? '-',
              additionalAccountNumber: findData?.additionalAccountNumber ?? '-',
              additionalIFSC: findData?.additionalIFSC ?? '',
            };
          }
          finalData.push(temp);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //region end

  //update bank list service
  async updateNewBankList(reqData: any) {
    const activeService: string[] = reqData?.activeService;
    if (!activeService) return kParamMissing('activeService');
    const id = reqData?.id;
    if (!id) return kParamMissing('id');
    const statusFlag = reqData?.status;
    if (statusFlag == null) return kParamMissing('status');
    const adminId = reqData?.adminId;
    if (!adminId) return kParamMissing('adminId');

    const allowedServices = [
      kNetBanking,
      kCAMS,
      kfinvu,
      kOneMoney,
      kBankingPro,
    ];
    const allowedStatus = ['ACTIVE', 'INACTIVE'];

    const allElementsValid = activeService.every((service) =>
      allowedServices.includes(service),
    );
    if (!allElementsValid) return kWrongDetails;
    if (!allowedStatus.includes(statusFlag)) return kWrongDetails;

    const bank = await this.bankListRepo.getRowWhereData(['id'], {
      where: { id: id },
    });
    if (bank === k500Error) throw new Error();
    if (!bank) return k422ErrorMessage(kNoDataFound);

    let status = 0;
    let aaMode = -1;
    let statementService = false;
    let inAppService = false;

    if (
      (activeService.includes(kCAMS) &&
        (activeService.includes(kOneMoney) ||
          activeService.includes(kfinvu))) ||
      (activeService.includes(kOneMoney) &&
        (activeService.includes(kCAMS) || activeService.includes(kfinvu))) ||
      (activeService.includes(kfinvu) &&
        (activeService.includes(kOneMoney) || activeService.includes(kCAMS)))
    ) {
      return kWrongDetails;
    }

    if (activeService.includes(kfinvu)) aaMode = 2;
    else if (activeService.includes(kOneMoney)) aaMode = 1;
    else if (activeService.includes(kCAMS)) aaMode = 0;

    if (activeService.includes(kNetBanking)) inAppService = true;
    if (activeService.includes(kBankingPro)) statementService = true;
    if (statusFlag == 'ACTIVE') status = 1;

    const service = {
      aa: aaMode,
      statement: statementService,
      netbanking: inAppService,
    };
    const updatedData = {
      statusFlag: status,
      lastUpdatedBy: adminId,
      service,
    };
    const updatedResult = await this.bankListRepo.updateRowData(
      updatedData,
      id,
    );
    if (updatedResult === k500Error) throw new Error();
    return {};
  }

  //get all bank list service
  async getNewAllBankList(body) {
    const attributes = [
      'id',
      'bankName',
      'statusFlag',
      'updatedAt',
      'lastUpdatedBy',
      'service',
    ];

    const searchText = body.searchText ?? '';
    const page = +body.page || 1;
    const offset = page * PAGE_LIMIT - PAGE_LIMIT;

    const options: any = {
      limit: PAGE_LIMIT,
      offset,
      order: [['bankName', 'ASC']],
    };

    if (body?.status == 'ACTIVE') {
      options.where = { statusFlag: '1' };
    } else if (body?.status == 'INACTIVE') {
      options.where = { statusFlag: '0' };
    }

    if (searchText.length >= 2)
      options.where = { bankName: { [Op.iRegexp]: searchText } };

    const bankList = await this.bankListRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (bankList === k500Error) throw new Error();

    const BankList = [];
    for (let index = 0; index < bankList.rows.length; index++) {
      try {
        const bank = bankList.rows[index];
        let activeServices = [];

        if (bank.service.aa == 0) activeServices.push(kCAMS);
        else if (bank.service.aa == 1) activeServices.push(kOneMoney);
        else if (bank.service.aa == 2) activeServices.push(kfinvu);

        if (bank.service.statement == true) activeServices.push(kBankingPro);
        if (bank.service.netbanking == true) activeServices.push(kNetBanking);

        if (bank.statusFlag == '1') bank.status_flag = 'ACTIVE';
        else if (bank.statusFlag == '0') bank.status_flag = 'INACTIVE';

        bank.formattedDate =
          this.typeService.getDateFormatted(bank?.updatedAt) ?? '-';

        bank.lastUpdatedByName =
          (await this.commonSharedService.getAdminData(bank?.lastUpdatedBy)) ??
          '-';

        const obj = {
          ID: bank?.id ?? '-',
          'Bank Name': bank?.bankName ?? '-',
          'Active Service': activeServices ?? '-',
          Status: bank?.status_flag ?? '-',
          'Last Updated': bank?.formattedDate ?? '-',
          'Last Updated By': bank?.lastUpdatedByName?.fullName ?? '-',
        };
        BankList.push(obj);
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    }
    return { rows: BankList, count: bankList?.count };
  }
}
