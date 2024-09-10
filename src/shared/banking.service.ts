// Imports
import { Inject, Injectable, forwardRef, OnModuleInit } from '@nestjs/common';
import { Op, where } from 'sequelize';
import * as moment from 'moment';
import {
  BANK_NAME_FOR_IFSC,
  gIsPROD,
  manualBanksList,
  NAME_MISS_MATCH_PER,
  SYSTEM_ADMIN_ID,
  MIN_CIBIL_SCORE,
  MIN_PL_SCORE,
  CIBIL_MIN_OVERDUE,
  INQUIRY_PAST_30_DAYS,
  UAT_PHONE_NUMBER,
  LAST_CHECK_DAYS,
  GLOBAL_RANGES,
  MATCH_TRANSACTIONS_THRESHOULD,
  isUAT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  GET_COMPARE_ACCOUNT,
  IFSC_VALIDATE_URL,
  UPLOAD_BANK_PDF,
  UploadPDFFile,
} from 'src/constants/network';
import { kBankingProHeaders, kMonths, TLWiseList } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import {
  BAD_CIBIL_SCORE_MSG,
  BANKINGADMINS,
  FINALBUCKETADMINS,
  InvalidIfscCode,
  MIN_SALARY_CRITERIA,
  NO_VALID_TRANSACTIONS,
  TRANSACTIONS_MATCHED_WITH_USER,
  kAccountExist,
  kAccountNotMatch,
  kErrorMsgs,
  kLoanNotProgress,
  kNoDataFound,
  kReferral,
  kSomthinfWentWrong,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { AssignmentSharedService } from './assignment.service';
import { EligibilitySharedService } from './eligibility.shared.service';
import { ResidenceSharedService } from './residence.service';
import { CommonSharedService } from './common.shared.service';
import { SharedNotificationService } from './services/notification.service';
import { CryptService } from 'src/utils/crypt.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { IpCheckService } from './ipcheck.service';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { EnvConfig } from 'src/configs/env.config';
import { CibilService } from './cibil.service';
import { AdminService } from 'src/admin/admin/admin.service';
import { FileService } from 'src/utils/file.service';
import { employmentDetails } from 'src/entities/employment.entity';
import { SlackService } from 'src/thirdParty/slack/slack.service';
import { DateService } from 'src/utils/date.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class BankingSharedService implements OnModuleInit {
  constructor(
    private readonly api: APIService,
    private readonly assignmentService: AssignmentSharedService,
    private readonly authAi: AuthAiService,
    private readonly bankingRepo: BankingRepository,
    private readonly bankListRepo: BankListRepository,
    private readonly empRepo: EmploymentRepository,
    private readonly loanRepo: LoanRepository,
    private readonly masterRepo: MasterRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly misMatchRepo: MissMacthRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly sharedResidence: ResidenceSharedService,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly validation: ValidationService,
    private readonly razorpayService: RazorpoayService,
    private readonly apiService: APIService,
    private readonly commonService: CommonSharedService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly cryptService: CryptService,
    private readonly whatsappService: WhatsAppService,
    private readonly ipCheckService: IpCheckService,
    private readonly cibilService: CibilService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
    private readonly dateService: DateService,
    // Database
    private readonly repoManager: RepositoryManager,
    private readonly fileService: FileService,
    private readonly slack: SlackService,
    private readonly redisService: RedisService,
  ) {}
  onModuleInit() {
    this.storeBankNameOnRedis();
  }
  async getBankList(reqData) {
    try {
      const attributes = [
        'aaMode',
        'bankCode',
        'fipName',
        'bankName',
        'inAppService',
        'pdfService',
        'image',
        'statementService',
      ];
      const options = { where: { statusFlag: '1' } };
      /// manage top bank to image if image then this top bank
      if (reqData?.top_bank === 'true')
        options.where['image'] = { [Op.ne]: null };

      const bankList = await this.bankListRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankList == k500Error) return kInternalError;

      // if type Of device is web then stop netbanking service
      const finalizedBankList = [];
      if (reqData?.typeOfDevice === '2') {
        bankList.forEach((el) => {
          if (el.inAppService === true) {
            el.inAppService = false;
            if (el.statementService === true) finalizedBankList.push(el);
            else if (el.statementService === true) finalizedBankList.push(el);
          } else finalizedBankList.push(el);
        });

        return finalizedBankList;
      }
      return bankList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Get all available bank list
  async getNewBankList(reqData) {
    try {
      const attributes = [
        'aaMode',
        'bankCode',
        'fipName',
        'bankName',
        'image',
        'service',
      ];
      const options = { where: { statusFlag: '1' } };
      /// manage top bank to image if image then this top bank
      if (reqData?.top_bank === 'true')
        options.where['image'] = { [Op.ne]: null };

      const bankList = await this.bankListRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankList == k500Error) return kInternalError;
      return bankList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async validateEligibility(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    let accDetails = reqData.accountDetails;
    let filePath = reqData.filePath;
    if (!accDetails) return kParamMissing('accountDetails');
    const tagByAdmin = reqData?.tagByAdmin == true;
    if (!filePath && !accDetails?.inAppService && !tagByAdmin)
      return kParamMissing('filePath');
    const currDate = new Date();

    // for referral withdraw account details
    const referralFlow = reqData?.referralFlow == true ? true : false;
    const additionalURLs = reqData?.additionalURLs ?? [];
    try {
      if (accDetails && typeof accDetails == 'string')
        accDetails = JSON.parse(accDetails);
    } catch (error) {}

    /// if bank statements then add or update transaction to db because of we add transaction and check eligibility
    const add_transaction = await this.addAndUpdateTransactionData(reqData);

    // Validate aadhaar name with bank statement's name
    const userData: any = await this.checkUserDetails(
      userId,
      accDetails,
      filePath,
      referralFlow,
    );
    if (userData?.message) return userData;
    // In case of netbanking name missMatch

    const statusData = userData.masterData.status ?? {};
    const dates = userData.masterData.dates ?? {};
    const salaryDate = +userData?.employmentData?.salaryDate;
    const isRedProfile = (userData.isRedProfile ?? 0) === 2;
    if (!accDetails?.accountNumber) {
      const bankingData = userData.masterData?.loanData?.bankingData ?? {};
      if (bankingData?.accountDetails)
        accDetails = JSON.parse(bankingData?.accountDetails);
      if (bankingData?.bankStatement)
        filePath = bankingData?.bankStatement ?? '';
    }

    // if not getting bank param then check bankCode and update bank
    let bank = accDetails?.bank ?? '';
    if (!bank && accDetails) {
      bank = accDetails?.bankCode ?? '';
      if (bank) accDetails.bank = bank;
    }
    // Check weather acc number is exists in another user or not
    // Check if number is masked and previously we found unmasked number, if yes then update it
    // IFSC validation
    const bankAccData: any = await this.checkAndUpdateAccDetails(
      accDetails,
      userId,
    );
    if (bankAccData.message) {
      // In case of netbanking failed attempt
      if (accDetails?.inAppService == true) {
        const attemptResponse = await this.rejectNetbankingAttempt(
          userData,
          bankAccData.message,
        );
        if (attemptResponse?.needUserInfo == true) return attemptResponse;
      }
      return bankAccData;
    }
    const loanData = userData.masterData?.loanData ?? {};
    const loanId = loanData?.id;
    // Get statement data from BankingPro
    const accountNumber = accDetails.accountNumber;
    const transactionData = await this.findCompareTransaction(
      loanId,
      false,
      accountNumber,
      referralFlow,
      bank,
    );
    if (transactionData?.message) return transactionData;

    let latestTransactionDate = '';
    let lastTransactionDate = '';
    if (transactionData?.transactionJson) {
      latestTransactionDate = transactionData?.transactionJson[0]?.dateTime;
    }

    // Check last n month transactions
    // Check last n salary
    const salaryEligibility: any = this.checkSalaryEligibility(
      transactionData,
      bank,
      accDetails,
      salaryDate,
    );
    const val = Object.values(salaryEligibility?.dataOfMonth);

    if (
      salaryEligibility?.dataOfMonth &&
      !val?.includes(false) &&
      currDate.getFullYear() == parseInt(latestTransactionDate.split('/')[2]) &&
      currDate.getMonth() + 1 ==
        parseInt(latestTransactionDate.split('/')[1]) &&
      currDate.getDate() > 6 &&
      currDate.getDate() > salaryDate &&
      salaryDate > parseInt(latestTransactionDate.split('/')[0]) &&
      !accDetails?.aaService &&
      !accDetails?.inAppService
    ) {
      const keys = Object.keys(salaryEligibility.dataOfMonth);
      salaryEligibility.dataOfMonth[keys[0]] = false;
      lastTransactionDate = latestTransactionDate;
      salaryEligibility.salaryVerification = '4';
    }
    const dataOfMonth = JSON.stringify(salaryEligibility?.dataOfMonth ?? {});

    // Adjustment ->  Red profile
    if (isRedProfile) {
      if (salaryEligibility === k500Error) return kInternalError;
      const salaryVerification = salaryEligibility.salaryVerification ?? '0';
      if (salaryVerification == '0') salaryEligibility.salaryVerification = '1';
      if (!salaryEligibility.salary) salaryEligibility.salary = 70000;
      if (!salaryEligibility.salaryDate) salaryEligibility.salaryDate = 1;
    }

    // Banking data
    let bankingData = loanData.bankingData;
    if (!bankingData) {
      const creationData: any = { userId, loanId, dataOfMonth };
      if (referralFlow) creationData.type = kReferral;
      if (accDetails?.inAppService == true)
        creationData.consentMode = 'NETBANKING';
      const createdData = await this.bankingRepo.createRowData(creationData);
      if (createdData == k500Error) return kInternalError;
      bankingData = createdData;
    }
    // Fine tune the data
    const prepareData: any = {
      transactions: transactionData,
      salaryData: salaryEligibility,
      accountDetails: accDetails,
      bankingId: bankingData.id,
      filePath,
      userId,
      findData: bankingData,
      additionalURLs: additionalURLs,
      adminId: reqData.adminId,
      loanId,
      needMaskedAccVerification: bankAccData.needMaskedAccVerification,
      dataOfMonth,
      lastTransactionDate,
    };
    if (reqData?.adminId) prepareData.uploadedByadmin = reqData.adminId;
    const finalizedData = await this.prepareAccountData(prepareData);
    if (finalizedData.message) return finalizedData;
    if (accDetails?.inAppService == true)
      finalizedData.consentMode = 'NETBANKING';

    // Update banking data
    let updatedResult = await this.bankingRepo.updateRowData(
      finalizedData,
      bankingData.id,
    );
    if (updatedResult == k500Error) return kInternalError;

    // Update bankId data
    const updateData = await this.loanRepo.updateRowData(
      { bankingId: bankingData.id },
      loanId,
    );
    if (updateData == k500Error) return kInternalError;

    // Check for other user having the same transaction and it's greater than threshold then block the user
    if (add_transaction?.blockUser == true) {
      const updatedData = add_transaction.updatedData;
      await this.bankingRepo.updateRowData(updatedData, bankingData.id);
      await this.adminService.changeBlacklistUser({
        userId,
        adminId: SYSTEM_ADMIN_ID,
        type: '1',
        reason: TRANSACTIONS_MATCHED_WITH_USER,
        reasonId: 68,
        status: '1',
      });
      return { needUserInfo: true, userId };
    }

    // Validate aadhaar name with bank statement's name
    const missMatch: any = await this.checkNameMissMatch(
      userId,
      userData,
      accDetails,
    );
    if (missMatch?.needUserInfo == true) return userData;
    if (missMatch.salaryVerification) {
      finalizedData.salaryVerification = missMatch.salaryVerification;
      finalizedData.nameMissMatch = missMatch.nameMissMatch;
    }
    //  Referral Flow
    if (referralFlow) {
      const stLength = accountNumber.length - 4;
      const acNo =
        'xxxxxx' + accountNumber.substring(stLength, accountNumber.length);
      const sMsg = 'Your account details successfully submitted!';
      const content = `Your bank account ${acNo} successfully submitted.`;
      const body = {
        userList: [userId],
        content,
        title: sMsg,
        message: content,
      };
      this.sharedNotification.sendNotificationToUser(body);
      return { needUserInfo: true, referralFlow };
    }
    // temporary redis code commented due to PROD issue
    // const key = `${loanId}_BANKDATABYLOANID`;
    // await this.redisService.del(key);

    let isCibilError = false;
    // Update interest rate
    if (
      finalizedData.salaryVerification == '1' ||
      finalizedData.salaryVerification == '3'
    ) {
      if (finalizedData?.salary < GLOBAL_RANGES.MIN_SALARY_AMOUNT) {
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
        return { needUserInfo: true };
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
            status: '0',
            reason: BAD_CIBIL_SCORE_MSG,
            reasonId: 52,
            nextApplyDate: targetDate,
          });
        }

        // Check cibil score and bypass user if score was good and salary found
        if (salaryEligibility != k500Error && salaryEligibility.salary > 0) {
          const cibilData = await this.getCibilStatusForApproval({ userId });
          if (cibilData.isCibilError === true) {
            isCibilError = true;

            finalizedData.salaryVerification = '0';
            finalizedData.status = 'CIBIL_ERROR';
            statusData.bank = 0;
          }
        }
      }
    }

    const loanUpdateData: any = {};
    // Saving latest verified salary date into loan table
    if (finalizedData.salaryDate)
      loanUpdateData.verifiedSalaryDate = finalizedData.salaryDate;

    finalizedData.adminId = SYSTEM_ADMIN_ID;

    // IP Check
    const ipCheck: any = await this.ipCheckService.ipCheck(userId, loanId);
    if (ipCheck == true) return { needUserInfo: true };

    if (finalizedData.salaryVerification != '4') {
      finalizedData.completedLoans = userData.completedLoans ?? 0;

      finalizedData.maybeGoodCibil = userData.maybeGoodCibil;

      // Check loan eligibility
      if (
        finalizedData.salary &&
        finalizedData.salaryDate &&
        isCibilError === false &&
        (finalizedData.salaryVerification == '1' ||
          finalizedData.salaryVerification == '3')
      ) {
        const eligibilityData =
          await this.sharedEligibility.checkLoanEligibility({
            loanId,
            userId,
            approvedSalary: finalizedData.salary,
          });
        if (eligibilityData?.message) return eligibilityData;
        if (eligibilityData?.isEligible === false) {
          // Update loan data
          const updatedData: any = {
            bankingId: bankingData.id,
            ...loanUpdateData,
          };
          const updatedResult = await this.loanRepo.updateRowData(
            updatedData,
            loanId,
          );
          if (updatedResult === k500Error) throw new Error();
          return { needUserInfo: true };
        }
      }
    }

    const attr = [
      'id',
      'mandateAccount',
      'mandateBank',
      'disbursementAccount',
      'disbursementBank',
      'accountNumber',
      'bank',
    ];
    const banking = await this.bankingRepo.getRowWhereData(attr, {
      where: { id: bankingData.id },
    });
    if (banking === k500Error) return kInternalError;
    if (banking?.accountNumber && banking?.bank) {
      if (!banking?.mandateAccount)
        finalizedData.mandateAccount = banking.accountNumber;
      if (!banking?.mandateBank) finalizedData.mandateBank = banking.bank;
      if (!banking?.disbursementAccount)
        finalizedData.disbursementAccount = banking.accountNumber;
      if (!banking?.disbursementBank)
        finalizedData.disbursementBank = banking.bank;
    }

    if (finalizedData?.salaryVerification != '4') {
      // Checking If user Is Having any Valid Transactions to continue the process
      const checkValidTransactions: boolean =
        this.checkHavingValidTransactionsForLoan(
          transactionData?.transactionJson,
        );
      if (!checkValidTransactions) {
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 30);
        return await this.sharedEligibility.rejectLoan(
          SYSTEM_ADMIN_ID,
          loanId,
          NO_VALID_TRANSACTIONS,
          userId,
          targetDate,
        );
      }
    }

    // Update banking data
    updatedResult = await this.bankingRepo.updateRowData(
      finalizedData,
      bankingData.id,
    );
    if (updatedResult == k500Error) return kInternalError;

    // Update loan data
    let updatedData: any = { bankingId: bankingData.id, ...loanUpdateData };
    updatedResult = await this.loanRepo.updateRowData(updatedData, loanId);
    if (updatedResult == k500Error) return kInternalError;
    // Update master data
    updatedData = { status: statusData, dates };
    updatedData.status.bank = +finalizedData.salaryVerification;
    if (
      finalizedData.isNeedTagSalary == '0' &&
      updatedData.status.bank != 2 &&
      !isCibilError &&
      prepareData?.accountDetails?.inAppService != true
    )
      updatedData.status.bank = 4;
    if (
      updatedData.status.bank == 1 ||
      updatedData.status.bank == 3 ||
      updatedData.status.bank == 2
    )
      updatedData.dates.banking = new Date().getTime();
    const masterId = userData.masterId;

    updatedResult = await this.masterRepo.updateRowData(updatedData, masterId);
    if (updatedResult == k500Error) return kInternalError;

    // Residence automation
    const residenceStatus = updatedData?.status?.residence ?? -1;
    if (![1, 3, 8].includes(residenceStatus))
      await this.sharedResidence.validateAddress({ userId });

    if (
      isCibilError === false &&
      (finalizedData.salaryVerification == '1' ||
        finalizedData.salaryVerification == '3')
    ) {
      const finalApproval = await this.sharedEligibility.finalApproval({
        loanId,
        userId,
      });
      if (finalApproval.message) return finalApproval;
    }

    // State eligiblity
    const eligibility =
      await this.sharedEligibility.validateStateWiseEligibility({
        userId,
        salary: finalizedData.salary,
      });
    if (eligibility.message) return eligibility;

    return { needUserInfo: true };
  }

  // Check cibil status
  private async getCibilStatusForApproval({
    userId,
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
      'status',
      'validCibilData',
    ];
    const options = {
      include,
      order: [['id', 'DESC']],
      where: { type: '1', userId },
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
      if (!delayEMIList) return { isGoodCibil: true, isCibilError };
    }

    return { isGoodCibil: false, isCibilError: isCibilError };
  }

  async checkNameMissMatch(userId, userData, accDetails) {
    // Validate user name
    const userName = userData.fullName ?? '';
    const nameAsPerBank = accDetails?.name ?? '';
    const gender = userData.gender ?? '';
    const appType = userData?.masterData?.loanData?.appType;
    if (accDetails?.accountNumber) {
      const isMatched = await this.validation.compareName(
        userName,
        nameAsPerBank,
        gender,
        appType,
      );
      // Name not matched with bank statement name
      if (!isMatched) {
        // Check whether user is previously approved with name combination given
        const previousRecords: any = await this.checkPreviousNameRecords(
          accDetails,
          userId,
          appType,
        );
        // Mark user as name mismatched record
        if (previousRecords.message || !previousRecords) {
          /* In app service (flutter),
            Adjusting the routing so user can see the error msg in dashboard */
          if (accDetails?.inAppService == true) {
            return await this.rejectNetbankingAttempt(
              userData,
              kErrorMsgs.NAME_NOT_MATCHED_AS_AADHAAR,
            );
          }

          return {
            salaryVerification: '0',
            nameMissMatch: 0,
          };
        }
      }
    }
    return true;
  }

  // for referralFlow bank account details for withdraw
  async referralFlowAccountData(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      let accountDetails = reqData?.accountDetails;
      const referralFlow = reqData?.referralFlow ?? false;
      if (!referralFlow) return {};
      try {
        if (accountDetails && typeof accountDetails == 'string')
          accountDetails = JSON.parse(accountDetails);
      } catch (error) {}
      if (!accountDetails) return kParamMissing('accountDetails');
      const accountNumber = accountDetails?.accountNumber;
      if (!accountNumber) return kParamMissing('accountNumber');
      const bank = accountDetails?.bank;
      if (!bank) return kParamMissing('bank');
      const name = accountDetails?.name;
      const ifsCode = accountDetails?.ifscode;
      if (!ifsCode) return kParamMissing('ifscode');

      const attributes = ['id', 'fullName'];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData === k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      // check acc number is exists in another user or not, check masked acc number and IFSC validation
      const checkAccData: any = await this.checkAndUpdateAccDetails(
        accountDetails,
        userId,
      );
      if (checkAccData?.message) return checkAccData;

      const rawData: any = {
        name,
        bank,
        accountNumber,
        ifsCode: ifsCode.toUpperCase(),
        type: kReferral,
        disbursementAccount: accountNumber,
        disbursementBank: bank,
        disbursementIFSC: ifsCode.toUpperCase(),
        accountDetails: JSON.stringify(accountDetails),
      };
      const createdData = await this.bankingRepo.createRowData(rawData);
      if (createdData === k500Error) return kInternalError;
      const bankDetails = {
        Bank: bank,
        'Account number': accountNumber,
        'IFSC code': ifsCode.toUpperCase(),
      };
      return kSUCCESSMessage(
        'Bank details successfully submitted!',
        bankDetails,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkUserDetails(
    userId,
    accDetails,
    filePath,
    referralFlow = false,
  ) {
    const bankingInclude: any = { model: BankingEntity };
    bankingInclude.attributes = [
      'id',
      'salaryVerification',
      'additionalURLs',
      'bankStatement',
    ];
    if (!accDetails?.accountNumber)
      bankingInclude.attributes.push('accountDetails');

    const loanInclude: any = { model: loanTransaction };
    loanInclude.attributes = ['id', 'bankingId', 'appType'];
    loanInclude.include = [bankingInclude];
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['dates', 'status', 'loanId', 'id', 'rejection'];
    const employmentInclude: any = { model: employmentDetails };
    employmentInclude.attributes = ['salaryDate'];
    masterInclude.include = [loanInclude];
    const include = [masterInclude, employmentInclude];

    const attributes = [
      'completedLoans',
      'id',
      'fullName',
      'email',
      'phone',
      'masterId',
      'isRedProfile',
      'maybeGoodCibil',
      'appType',
      'loanStatus',
      'gender',
      'isCibilConsent',
    ];
    const options = { include, where: { id: userId } };
    const userData = await this.userRepo.getRowWhereData(attributes, options);
    if (!userData) return k422ErrorMessage('No data found');
    if (userData == k500Error) return kInternalError;
    const statusData = userData.masterData.status ?? {};
    const notProcess = [1, 3, 2, 6, 7];
    if (notProcess.includes(statusData?.loan))
      return k422ErrorMessage(kLoanNotProgress);

    return userData;
  }

  //#region add and upload transaction data to db
  private async addAndUpdateTransactionData(body) {
    const filePath = body?.filePath;
    const userId = body?.userId;

    if (filePath && !filePath.toLowerCase().endsWith('pdf')) {
      const row_data = JSON.parse(filePath);
      const profileData = row_data?.accountDetails ?? {};
      profileData.bankCode = row_data.bankCode;

      const data = {
        transactions: row_data?.transactions,
        profileData,
        companyName: row_data?.companyName,
        salary: row_data?.salary,
      };

      const res = await this.authAi.syncTransactions(data);

      // Check if the user should be blocked based on transaction matching threshold
      if (
        res?.accountDetails?.MATCH_WITH_OTHER?.isFraud &&
        res?.accountDetails?.MATCH_WITH_OTHER?.conflictedList.length >=
          MATCH_TRANSACTIONS_THRESHOULD
      ) {
        const matchedAccountNumbers =
          res?.accountDetails?.MATCH_WITH_OTHER?.conflictedList[0]
            ?.matchedAccountIds;

        let updatedData: any = {
          matchedTransactionsDetail: {},
          isFraud: false,
        };

        // Checking for each account number
        for (const accNumber of matchedAccountNumbers) {
          const attributes = [
            'id',
            'userId',
            'name',
            'matchedTransactionsDetail',
          ];
          const options = {
            where: {
              accountNumber: accNumber,
            },
          };

          const bankingData = await this.repoManager.getRowWhereData(
            BankingEntity,
            attributes,
            options,
          );

          if (bankingData) {
            updatedData.matchedTransactionsDetail =
              bankingData?.matchedTransactionsDetail || {};

            if (!updatedData.isFraud) updatedData.isFraud = true;

            if (bankingData.userId) {
              updatedData.matchedTransactionsDetail[bankingData?.userId] = {
                name: bankingData.name,
                accountNumber: accNumber,
              };
            }

            // Also add or update the entry for userId from body
            if (bankingData?.userId && userId !== bankingData?.userId) {
              updatedData.matchedTransactionsDetail[userId] = {
                name: profileData.name,
                accountNumber: profileData.accountNumber,
              };
            }

            await this.repoManager.updateRowWhereData(
              BankingEntity,
              updatedData,
              {
                where: {
                  accountNumber: accNumber,
                  id: bankingData?.id,
                },
              },
            );
          }
        }
        res.updatedData = updatedData;
        res.blockUser = true;
      }
      return res;
    }
  }
  //#endregion

  //#region upload file
  private async uploadPdfFileToCloud(filePath) {
    const row_data = JSON.parse(filePath);
    const row_file = row_data?.row_file ?? row_data?.rawFile ?? '';

    if (row_file) {
      const buffer_data = Buffer.from(row_file, 'base64');
      return await this.fileService.base64ToFileURL(buffer_data);
    }
  }
  //#endregion

  private async rejectNetbankingAttempt(userData, rejectReason) {
    const masterData = userData?.masterData ?? {};
    const bankingData = masterData?.loanData?.bankingData ?? {};
    // Update banking data
    let updatedData: any = {
      rejectReason,
      salaryVerification: '2',
    };
    if (bankingData.id) {
      await this.bankingRepo.updateRowData(updatedData, bankingData.id);
    }
    // Update master data
    const statusData = masterData?.status ?? {};
    statusData.bank = 2;
    const rejectionData = masterData?.rejection ?? {};
    rejectionData.banking = rejectReason;
    updatedData = { rejection: rejectionData, status: statusData };
    await this.masterRepo.updateRowData(updatedData, masterData.id);

    return { needUserInfo: true, isFailedAttempt: true };
  }

  private async checkPreviousNameRecords(
    accountDetails: any,
    userId: string,
    appType,
  ) {
    try {
      const nameAsPerBank = accountDetails?.name;
      const userNameNotMatched = accountDetails?.userNameNotMatched ?? false;
      if (userNameNotMatched === true) return true;
      const attributes = ['name', 'accountDetails'];
      const options = {
        where: {
          accountNumber: accountDetails?.accountNumber,
          salaryVerification: { [Op.or]: ['1', '3'] },
          userId,
        },
      };
      const result = await this.bankingRepo.getTableWhereData(
        attributes,
        options,
      );
      if (result == k500Error) return k500Error;
      for (let index = 0; index < result.length; index++) {
        try {
          const accountDetails = JSON.parse(result[index].accountDetails);

          let isCheckName = false;
          let isCheckName2 = false;
          const isNameMissMatch: any = await this.validation.nameMatch(
            result[index].name,
            nameAsPerBank,
            appType,
          );
          if (isNameMissMatch?.valid) {
            if (isNameMissMatch.data >= NAME_MISS_MATCH_PER) isCheckName = true;
            else isCheckName = false;
          } else
            isCheckName = await this.validation.compareName(
              result[index].name,
              nameAsPerBank,
            );
          const isNameMissMatch2: any = await this.validation.nameMatch(
            result[index].name,
            nameAsPerBank,
            appType,
          );
          if (isNameMissMatch2?.valid) {
            if (isNameMissMatch.data >= NAME_MISS_MATCH_PER)
              isCheckName2 = true;
            else isCheckName2 = false;
          } else
            isCheckName2 = await this.validation.compareName(
              accountDetails.name,
              nameAsPerBank,
            );
          if (isCheckName || isCheckName2) return true;
        } catch (error) {}
      }
      return false;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async rejectNameMisMatch(userId) {
    try {
      const update = { status: '2' };
      const where = {
        status: { [Op.ne]: '1' },
        userId,
        type: 'BANK_STATMENT',
      };
      await this.misMatchRepo.updateData(update, where);
    } catch (error) {}
  }

  // Check weather acc number is exists in another user or not
  // Check if number is masked and previously we found unmasked number, if yes then update it
  // IFSC validation
  private async checkAndUpdateAccDetails(accountDetails: any, userId: string) {
    let needMaskedAccVerification = false;
    accountDetails.accountNumber = accountDetails.accountNumber?.toString();
    const includes = ['*', 'x', '-'];
    let accountNumber = accountDetails?.accountNumber.toLowerCase();
    let ifsc = (
      accountDetails?.ifscode ??
      accountDetails?.ifscCode ??
      '0'
    ).toLowerCase();
    if (!ifsc) ifsc = '0';
    const attributes = ['userId', 'accountNumber', 'ifsCode'];
    const where = { accountNumber: accountNumber };
    const options = { where, raw: true };
    // Hit -> Query
    let findData = await this.bankingRepo.findAll(attributes, options);
    // Validation -> Query data
    if (findData === k500Error) throw new Error();
    // Validation -> Account number existance
    const find = findData.find((e) => e.accountNumber == accountNumber);
    // Works only in PRODUCTION
    if (find && find.userId != userId && gIsPROD)
      return k422ErrorMessage(kAccountExist);

    // Checks -> Previous record with same user
    const checkAN = this.typeService.findIncludes(accountNumber, includes);
    // Preparation -> Query
    const bankAttr = ['accountNumber', 'ifsCode'];
    const bankOptions: any = { order: [['id', 'DESC']], where: { userId } };
    if (accountDetails.bank) bankOptions.where.bank = accountDetails.bank;
    findData = await this.repoManager.getTableWhereData(
      BankingEntity,
      bankAttr,
      bankOptions,
    );
    // Validation -> Query data
    if (findData === k500Error) throw new Error();
    if (checkAN || ifsc == '0') {
      for (let index = 0; index < findData.length; index++) {
        const element = findData[index];
        const bAN = element.accountNumber;
        const same = this.validation.getCompareAN(accountNumber, bAN);
        if (same) {
          if (!this.typeService.findIncludes(bAN, includes)) {
            accountNumber = bAN;
            if (element.ifsCode != '0')
              ifsc = (element.ifsCode ?? '0').toUpperCase();
          }
        }

        if (ifsc == '0' && same && (element.ifsCode ?? '0') != '0')
          ifsc = element.ifsCode;
        if (
          !this.typeService.findIncludes(accountNumber, includes) &&
          ifsc != '0'
        ) {
          if (accountDetails?.accountNumber != accountNumber) {
            const result = await this.authAi.updateMaskedAccNumber(
              accountDetails?.accountNumber,
              accountNumber,
            );
            if (result !== true) accountNumber = accountDetails?.accountNumber;
          }
          break;
        }
      }
    }
    accountDetails.ifscode = (ifsc ?? '0').length <= 4 ? '0' : ifsc ?? '0';
    accountDetails.accountNumber = accountNumber;

    // Found masked account for the first time
    if (checkAN) {
      const isMaskedAcc = this.typeService.findIncludes(
        accountNumber,
        includes,
      );
      if (isMaskedAcc) needMaskedAccVerification = true;
    }

    // IFSC validation
    const isIfscValid = await this.checkIfscValidation(
      accountDetails.ifscode,
      accountDetails.bank,
    );
    if (!isIfscValid) return k422ErrorMessage(InvalidIfscCode);
    return { needMaskedAccVerification };
  }

  async checkIfscValidation(ifsc, bank?) {
    try {
      if (!ifsc || (ifsc ?? '') === '0') return true;
      const url = IFSC_VALIDATE_URL + ifsc.trim();
      const result = await this.api.requestGet(url);
      if (!result || result === k500Error) return kInternalError;

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
        if (!bankData || bankData == k500Error) return kInternalError;
        let bankName = bankData.bankName.toUpperCase();
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
      return kInternalError;
    }
  }

  private checkSalaryEligibility(
    result: any,
    bank,
    accDetails,
    userSalaryDate,
  ) {
    try {
      const isAAService = accDetails?.aaService == true;
      const isInAppService = accDetails?.inAppService == true;
      const summary = result.summary;
      let salaryVerification = '4';
      let salary;
      let salaryDate;
      const salaryVerificationDate = new Date().toJSON();
      let checkmonthData: any = this.checkDurationEligibility(summary, bank);
      let dataOfMonth: any;
      if (checkmonthData) dataOfMonth = checkmonthData?.dataOfMonth;
      const otherDetails: any = {};
      if (
        checkmonthData &&
        checkmonthData.tempString &&
        checkmonthData.dataOfMonth &&
        (isAAService || isInAppService)
      ) {
        checkmonthData = '';
        salaryVerification = '0';
      }

      let bounceCount = 0;
      const currentDate = new Date();
      const startDate = new Date();
      startDate.setDate(currentDate.getDate() - LAST_CHECK_DAYS);
      result.transactionJson.filter((transaction) => {
        const [day, month, year] = transaction.dateTime.split('/');
        const formattedDate = `${year}-${month}-${day}`;

        const transactionDate = new Date(formattedDate);
        if (
          transaction?.category?.toLowerCase() === 'ecs/chq return charges' &&
          transactionDate >= startDate &&
          transactionDate <= currentDate
        ) {
          bounceCount = bounceCount + 1;
        }
      });

      const ecsBounceDetails = {
        ecsBounceCount: bounceCount,
        lastCheckDays: LAST_CHECK_DAYS,
      };

      otherDetails.ecsDetails = ecsBounceDetails;
      if (summary?.salary) otherDetails.salary = summary.salary;

      try {
        if (otherDetails?.salary) {
          otherDetails.salary.monthlyDetails = [];
          const salaryList: any = [];
          const filter = result?.transactionJson.filter(
            (f) => f.category.toLowerCase() === 'salary',
          );
          for (let index = 0; index < filter.length; index++) {
            try {
              const ele = filter[index];
              salaryList.push({
                monthYear: ele?.dateTime ?? '',
                total: 1,
                value: ele?.amount ?? 0,
              });
            } catch (error) {}
          }
          otherDetails.salary.monthlyDetails = salaryList;
        }
      } catch (error) {}

      if (checkmonthData.check === '0') {
        salaryVerification = '0';
        checkmonthData = checkmonthData.check;
      }
      if ((result?.salary ?? 0) != 0) {
        const data: any = this.checkLastMonthSalary(
          result,
          salaryVerification,
          userSalaryDate,
        );
        salaryVerification = data.salaryVerification;
        salary = data.salary;
        salaryDate = data.salaryDate;
      }
      // Missing month statement
      if (
        salaryVerification != '0' &&
        checkmonthData.tempString &&
        checkmonthData.dataOfMonth
      )
        salaryVerification = '4';

      // Taking average salary
      if (!isNaN(summary?.salary?.average) && !isNaN(salary)) {
        salary = summary?.salary?.average;
      }

      return {
        salaryVerification,
        salary,
        salaryDate,
        salaryVerificationDate,
        message: checkmonthData,
        otherDetails,
        dataOfMonth,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  // Check weather statement has n months duration
  private checkDurationEligibility(summary: any, bank) {
    let tempString = '';
    const dataOfMonth = {};
    const doNotCheckCurrentMount = ['STANDARD_CHARTERED'];
    try {
      const monthData: any[] = summary?.monthlyAvgBal?.monthlyDetails ?? [];
      const date = new Date();
      const last_month = 4;
      let count = 0;
      for (let index = 0; index < last_month; index++) {
        try {
          const month = date.getMonth();
          const year = date.getFullYear();
          const day = date.getDate();
          let key = kMonths[month].substring(0, 3) + ' ' + year;
          key = key.toLocaleUpperCase();
          const findData = monthData.find(
            (e) => e.monthYear.toLocaleUpperCase() == key,
          );
          dataOfMonth[key] = true;
          if (!findData) {
            if (index == 0 && day < 6) count++;
            else {
              if (index == 0 && doNotCheckCurrentMount.includes(bank)) count++;
              else {
                dataOfMonth[key] = false;
                tempString += (tempString ? ', ' : '') + kMonths[month] + year;
              }
            }
          } else count++;
          date.setMonth(month - 1);
        } catch (error) {}
      }
      if (count == last_month) return { check: '0', dataOfMonth };
    } catch (error) {}
    if (tempString) {
      const index = tempString.lastIndexOf(',');
      if (index != -1) {
        tempString =
          tempString.slice(0, index) + ' and' + tempString.slice(index + 1);
      }
      tempString = 'Please provide ' + tempString + ' month of statement.';
    }
    return { tempString, dataOfMonth };
  }

  private checkLastMonthSalary(
    result: any,
    salaryVerification: string,
    userSalaryDate,
  ) {
    let salary = 0;
    let salaryDate = 0;
    try {
      const summary = result?.summary;
      const monthData: any[] = summary?.salary?.monthlyDetails ?? [];
      const date = new Date();
      const last_month = 2;
      const getSalary = result?.getSalary ?? false;
      let count = 0;
      let getCurrentMonth = false;
      for (let index = 0; index < last_month + (getSalary ? 1 : 0); index++) {
        try {
          const day = new Date().getDate();
          const month = date.getMonth();
          const year = date.getFullYear();
          const key = month + 1 + '/' + year;
          const findData = monthData.find((e) =>
            (e.monthYear ?? '').endsWith(key),
          );
          if (index == 0 && findData) getCurrentMonth = true;
          if (findData) count++;
          if (!getSalary && !findData && index == 0 && day < 6) {
            count++;
            getCurrentMonth = true;
          } else if (!findData && index == 0 && day <= userSalaryDate) {
            // check for count
            const today = new Date();
            const todayDate = today.getDate();
            const month = today.getMonth();
            const salaryDate = new Date();
            salaryDate.setDate(userSalaryDate);
            // Normal scenario
            if (salaryDate.getMonth() === month) {
              if (salaryDate.getDate() > todayDate) {
                count++;
                getCurrentMonth = true;
              }
            }

            // Month end scenario
            else {
              const lastDate = this.typeService.getLastDateOfMonth(today);
              const newSalaryDate = lastDate.getDate();
              if (newSalaryDate > todayDate) {
                count++;
                getCurrentMonth = true;
              }
            }
          }
          date.setMonth(month - 1);
        } catch (error) {}
      }
      if (count >= last_month + (getCurrentMonth ? 0 : getSalary ? 0 : 1))
        salaryVerification = '1';

      if (monthData && salaryVerification == '1') {
        const pastSalaries = this.checkMinimumMonthsSalary(monthData);
        if (pastSalaries.length < 2) salaryVerification = '0';
      }

      if (salaryVerification == '1') {
        const aveSalary = (summary?.salary?.average ?? 0).toString();
        salary = parseFloat(aveSalary);
        salary = isNaN(salary) ? 0 : salary;
      }
      if (salary == 0) salary = result?.salary ?? 0;
      salaryDate = this.getSalaryDate(result);
    } catch (error) {}

    // if salaryVerification is 1 then salary date change
    let isSalryDate = 0;
    if (salaryVerification == '1') {
      isSalryDate = this.getSalaryDateFromMultiTran(result, userSalaryDate);
    }
    salaryDate = isSalryDate > 0 ? isSalryDate : salaryDate;
    return { salaryVerification, salary, salaryDate };
  }

  private getSalaryDateFromMultiTran(result, userSalaryDate) {
    let salaryDate = 0;
    let lastDayOfMonth = this.typeService.getLastDateOfMonth(new Date());
    if (
      [28, 29, 30, 31].includes(userSalaryDate) &&
      new Date(new Date().setDate(userSalaryDate)).getDate() <
        lastDayOfMonth.getDate()
    ) {
      if (userSalaryDate < lastDayOfMonth.getDate()) {
        userSalaryDate = new Date().setDate(userSalaryDate);
      } else {
        userSalaryDate = new Date().setDate(lastDayOfMonth.getDate());
      }
    } else {
      userSalaryDate = new Date().setDate(userSalaryDate);
    }

    // Filter transactions based on the approved salary and acceptable range
    const filteredData = result?.transactionJson.filter(
      (e) =>
        e.category.toLowerCase() === 'salary' &&
        e.type.toLowerCase() === 'credit',
    );
    // Use an object to count the number of transactions for each day of the month
    let dayCount = {};
    // Function to parse date in different formats
    function parseDate(date) {
      // Check if contains 'TZ' formate
      if (date.includes('T') || date.includes('Z')) {
        return new Date(date);
      } else {
        //if date is 'DD/MM/YYYY'
        const [day, month, year] = date.split('/');
        return new Date(`${year}-${month}-${day}`);
      }
    }

    // Use an object to count the number of transactions for each day of the month
    for (let i = 0; i < filteredData.length; i++) {
      const transaction = filteredData[i];
      const day = parseDate(transaction.dateTime).getUTCDate();
      if (dayCount[day]) {
        dayCount[day]++;
      } else {
        dayCount[day] = 1;
      }
    }

    // Filter out the days that have multiple transactions and map(Number) is doing convert array of element string to  number
    let dayOfMultipleTran: any = [];
    dayOfMultipleTran = Object.keys(dayCount)
      .filter((day) => dayCount[day] > 1)
      .map(Number);

    if (dayOfMultipleTran.length == 1) salaryDate = +dayOfMultipleTran; // plus is doing type conversion array to number

    // If no days with multiple transactions, filter by salary condition
    if (dayOfMultipleTran.length === 0) {
      for (let i = 0; i < filteredData.length; i++) {
        const tran = filteredData[i];
        const day = parseDate(tran.dateTime).getUTCDate();
        dayOfMultipleTran.push(day);
      }
    }

    // Check if userSalaryDate is in dayOfMultipleTran
    if (dayOfMultipleTran.includes(userSalaryDate)) salaryDate = userSalaryDate;
    // Find the closest date to the user's salary date
    if (salaryDate === 0) {
      salaryDate =
        dayOfMultipleTran.length &&
        dayOfMultipleTran.reduce((prev, curr) => {
          const prevDate = new Date().setDate(prev);
          const currDate = new Date().setDate(curr);
          return Math.abs(currDate - userSalaryDate) <
            Math.abs(prevDate - userSalaryDate)
            ? curr
            : prev;
        });
    }
    return salaryDate;
  }

  private getSalaryDate(result) {
    let salaryDate = 0;
    const dateSalary = new Date(result?.salaryDate);
    if (dateSalary.getFullYear() != 1970) salaryDate = dateSalary.getDate();
    salaryDate = isNaN(salaryDate) ? null : salaryDate;
    try {
      const filter = result?.transactionJson.filter(
        (e) => e.category.toLowerCase() === 'salary',
      );
      const getSalary = result?.getSalary ?? false;
      const date = new Date();
      for (let index = 0; index < 2 + (getSalary ? 1 : 0); index++) {
        try {
          const txt = date.getMonth() + '/' + date.getFullYear();
          const find = filter.find((e) => e?.dateTime.includes(txt));
          if (find) {
            const tempDate =
              find?.dateTime.split('/').reverse().join('-') + 'T10:00:00.000Z';
            const dateTime = new Date(tempDate);
            if (dateTime.getFullYear() != 1970) {
              if (salaryDate < dateTime.getDate())
                salaryDate = dateTime.getDate();
            }
          }
          date.setMonth(date.getMonth() - 1);
        } catch (e) {}
      }
    } catch (error) {}
    return salaryDate;
  }

  private async prepareAccountData(prepareData) {
    const transactions = prepareData.transactions;
    const salaryData = prepareData.salaryData;
    const accountDetails = prepareData.accountDetails;
    const findData = prepareData.findData;
    const userId = prepareData.userId;
    const loanId = prepareData.loanId;
    let filePath = prepareData.filePath;
    const additionalURLs = prepareData?.additionalURLs;
    const finalData: any = { userId };
    const salaryVeri = findData?.salaryVerification;
    const isAAService = accountDetails?.aaService ?? false;
    const dataOfMonth = prepareData?.dataOfMonth;

    if (accountDetails) {
      const accountNumber = accountDetails.accountNumber;
      const bank = accountDetails.bank;
      const name = accountDetails.name;
      let ifscode = accountDetails.ifscode;
      if (!ifscode || ifscode == '0') ifscode = '';
      if (findData?.accountNumber) {
        /// check existing and new account number match or not
        const isSame = this.validation.getCompareAN(
          accountNumber,
          findData?.accountNumber,
        );
        if (!isSame) return k422ErrorMessage(kAccountNotMatch);
      }
      if (!findData?.mandateAdminId) {
        /// mendate account details
        finalData.mandateAccount = accountNumber;
        finalData.mandateBank = bank;
        if (ifscode) finalData.mandateIFSC = (ifscode ?? '0').toUpperCase();
      }
      if (!findData?.disbursementAdminId) {
        /// disbursement account details
        finalData.disbursementAccount = accountNumber;
        finalData.disbursementBank = bank;
        if (ifscode)
          finalData.disbursementIFSC = (ifscode ?? '0').toUpperCase();
      }
      /// main account details
      finalData.accountUID =
        accountDetails?.accountUID ?? EnvConfig.nbfc.appName;
      finalData.name = name;
      finalData.accountNumber = accountNumber;
      finalData.bank = bank;
      if (ifscode) finalData.ifsCode = (ifscode ?? '0').toUpperCase();
      finalData.accountDetails = JSON.stringify(accountDetails);
    }

    finalData.attempts = (findData?.attempts ?? 0) + 1;
    if (filePath) {
      if (!filePath.includes('storage.google')) {
        if (filePath.toLowerCase().endsWith('pdf'))
          filePath = await this.authAi.getPdfURL(
            filePath,
            finalData.accountNumber,
          );
        else filePath = await this.uploadPdfFileToCloud(filePath);
      }

      if (filePath.message) return filePath;
      if (filePath.includes('storage.google')) {
        if (findData?.bankStatement && findData?.bankStatement != filePath) {
          if (!isAAService) additionalURLs.push(findData?.bankStatement);
        }

        finalData.bankStatement = filePath;
      } else return kInternalError;
    }

    // Append remaining pdf urls
    finalData.additionalURLs = await this.uploadAdditionalURLs(
      additionalURLs,
      findData?.additionalURLs,
      finalData.accountNumber,
    );

    let salaryVerification = salaryData.salaryVerification;
    if (manualBanksList.includes(accountDetails.bank)) salaryVerification = '0';
    if (salaryVeri === '1' || salaryVeri === '3')
      salaryVerification = salaryVeri;

    // Ask user to tag the salary
    const isNeedTagSalary = findData?.isNeedTagSalary ?? '-1';
    if (isNeedTagSalary === '-1') {
      finalData.isNeedTagSalary = await this.isUserNeedToTagSalary(
        transactions,
        userId,
      );
      if (
        finalData.isNeedTagSalary == '0' &&
        (salaryVerification == '1' || salaryVerification == '3')
      )
        salaryVerification = '0';
    }

    const isNeedAdditional = false;
    // salary details
    finalData.salary = salaryData.salary;
    finalData.salaryDate = salaryData.salaryDate;
    finalData.salaryVerification = salaryVerification;
    if (salaryVeri != '1' && salaryVeri != '3')
      finalData.salaryVerificationDate = salaryData.salaryVerificationDate;
    finalData.isNeedAdditional = isNeedAdditional;
    finalData.status = this.addENUM(salaryVerification, isNeedAdditional);
    if (salaryData?.otherDetails)
      finalData.otherDetails = salaryData?.otherDetails ?? {};
    // Manually uploaded by admin
    if (prepareData.adminId) {
      finalData.uploadedByadmin = prepareData.adminId;
      const rawData = {
        userId,
        docUrl: finalData.bankStatement,
        docType: 'Bank statement',
        type: 'pdf',
        adminId: prepareData?.adminId,
      };
      await this.mediaRepo.create(rawData);
    }

    // Missing month statement
    if (dataOfMonth) finalData.dataOfMonth = dataOfMonth;

    await this.assignToAdmin(finalData.salaryVerification, loanId);
    finalData.loanId = prepareData.loanId;

    // Masked account number
    if (prepareData.needMaskedAccVerification)
      finalData.salaryVerification = '4';
    // Fallback
    if (
      finalData.salaryVerification == '1' ||
      finalData.salaryVerification == '3'
    ) {
      if (!finalData.salaryDate) finalData.salaryVerification = '0';
    }

    if (prepareData?.lastTransactionDate)
      finalData.lastTransactionDate = prepareData.lastTransactionDate;
    return finalData;
  }

  private async uploadAdditionalURLs(
    additionalURLs: any,
    otherURL: any,
    accNumber,
  ) {
    const newArray = [];
    try {
      for (let index = 0; index < additionalURLs.length; index++) {
        try {
          let element = additionalURLs[index];
          if (!element.includes('storage.google')) {
            if (element.toLowerCase().endsWith('pdf'))
              element = await this.authAi.getPdfURL(element, accNumber);
            else element = await this.uploadPdfFileToCloud(element);
          }
          if (element.includes('storage.google')) newArray.push(element);
        } catch (error) {}
      }

      if (otherURL) {
        otherURL = JSON.parse(otherURL);
        otherURL.forEach((element) => {
          try {
            const find = newArray.find((e) => e == element);
            if (!find)
              if (element.includes('storage.google')) newArray.push(element);
          } catch (error) {}
        });
      }
    } catch (error) {}
    return JSON.stringify(newArray);
  }

  private async isUserNeedToTagSalary(transactions: any, userId: string) {
    try {
      const attributes = ['netPayAmount', 'salarySlipDate'];
      const options: any = { where: { userId } };
      options.include = [{ model: SalarySlipEntity, attributes }];
      const result = await this.empRepo.getRowWhereData(['id'], options);
      if (result && result !== k500Error) {
        const list: any[] = transactions?.transactionJson;
        const netPayAmount = result?.salarySlip?.netPayAmount ?? 0;
        if (netPayAmount > 0) {
          const filter = list.filter(
            (e) =>
              e.type === 'CREDIT' &&
              e.amount === netPayAmount &&
              (e.category ?? '').toLowerCase() === 'salary',
          );
          if (filter.length > 0) return '-1';
        }
      }
    } catch (error) {}
    const salaryCount = transactions?.netBankingScore?.incomeCount ?? 0;
    if (salaryCount < 1) return '0';
    else return '-1';
  }

  private addENUM(salaryVerification: string, isNeedAddi: boolean) {
    try {
      if (salaryVerification == '1' && isNeedAddi == true)
        return 'SALARY_VERIFIED_NEED_TRUE';
      else if (salaryVerification == '1' && isNeedAddi == false)
        return 'BY_PASS';
      else if (salaryVerification == '4' && isNeedAddi == true)
        return 'SALARY_NOT_VERIFIED_NEED_TRUE';
      else if (salaryVerification == '4' && isNeedAddi == false)
        return 'SALARY_NOT_VERIFIED_NEED_FALSE';
    } catch (error) {}
  }

  async assignToAdmin(salaryVerification, loanId, type = FINALBUCKETADMINS) {
    try {
      if (salaryVerification != '0') return;
      const assignAdmin = await this.assignmentService.checkAdminDataFetch(
        type,
        true,
      );
      if (!assignAdmin || assignAdmin === k500Error) return k500Error;
      const updateRes = await this.loanRepo.updateWhere(
        { assignTo: assignAdmin },
        loanId,
        { assignTo: { [Op.eq]: null } },
      );
      if (updateRes === k500Error) return k500Error;
      if (loanId) {
        await this.masterRepo.updateRowWhereData(
          { bankAssingId: assignAdmin },
          { where: { loanId } },
        );
      }
      return updateRes;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async updateAccDetails(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const ifscCode = reqData.ifscCode?.trim();
      const accNumber = reqData.accNumber;
      const isAdditional = reqData?.isAdditional ?? false;
      if (!ifscCode && !accNumber)
        return kParamMissing('ifscCode or accNumber');
      const attributes = [
        'bank',
        'dataOfMonth',
        'id',
        'mandateAccount',
        'disbursementAccount',
        'accountNumber',
        'ifsCode',
        'disbursementIFSC',
        'mandateIFSC',
        'additionalBank',
        'additionalIFSC',
        'additionalAccountNumber',
        'salaryVerification',
        'loanId',
      ];
      // Get bank data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['masterId'];
      userInclude.include = [masterInclude];
      const include = [userInclude];
      const options = { include, order: [['id', 'DESC']], where: { userId } };
      const bankData = await this.bankingRepo.getRowWhereData(
        attributes,
        options,
      );
      if (bankData == k500Error) return kInternalError;
      if (!bankData) return k422ErrorMessage(kNoDataFound);
      // Update IFSC code
      if (ifscCode) {
        const ifscDetails = await this.razorpayService.getIFSCDetails({
          ifsc: ifscCode,
        });
        if (ifscDetails.message) return ifscDetails;
        const bankName = this.commonService.checkBankCode(null, ifscDetails);
        if (
          bankData &&
          (bankData.bank != bankName || bankData.additionalBank == bankName)
        )
          return k422ErrorMessage(`Kindly provide valid ifsc code.`);

        const updatedData: any = {
          disbursementIFSC: ifscCode,
          mandateIFSC: ifscCode,
        };

        if (isAdditional)
          updatedData.additionalIFSC = (ifscCode ?? '0').toUpperCase();
        else updatedData.ifsCode = (ifscCode ?? '0').toUpperCase();
        const updateResult = await this.bankingRepo.updateRowData(
          updatedData,
          bankData.id,
        );
        if (updateResult == k500Error) return kInternalError;
      }
      const accountNumber = isAdditional
        ? bankData.additionalAccountNumber
        : bankData.accountNumber
            .replace(bankData.bank.toLowerCase(), '')
            .replace(bankData.bank.toUpperCase(), '');
      // Update acc number
      if (
        accountNumber.includes('*') ||
        accountNumber.toLowerCase().includes('x')
      ) {
        if (accNumber.includes('*') || accNumber.toLowerCase().includes('x'))
          return k422ErrorMessage('Kindly provide unmasked account number');
        const isValidNumber = this.validation.getCompareAN(
          accNumber,
          accountNumber,
        );
        if (!isValidNumber)
          return k422ErrorMessage(
            `Kindly provide valid unmasked account number of ${accountNumber}`,
          );

        // Update number in AuthAi
        const response: any = await this.authAi.updateMaskedAccNumber(
          isAdditional
            ? bankData.additionalAccountNumber
            : bankData.accountNumber,
          accNumber,
          bankData.bank,
        );
        if (!response || response.message) return kInternalError;

        // Update number in database
        const updatedData: any = {
          mandateAccount: accNumber,
          disbursementAccount: accNumber,
        };
        if (isAdditional) updatedData.additionalAccountNumber = accNumber;
        else updatedData.accountNumber = accNumber;
        const updateResult = await this.bankingRepo.updateRowData(
          updatedData,
          bankData.id,
        );
        if (updateResult == k500Error) return kInternalError;
      }
      if (bankData?.salaryVerification == '4') {
        if (
          ifscCode?.length > 4 &&
          !accNumber?.toLowerCase().includes('x') &&
          !accNumber?.includes('*') &&
          !bankData?.dataOfMonth?.includes('false')
        ) {
          const masterId = bankData.user.masterId;
          const masterData = await this.masterRepo.getRowWhereData(['status'], {
            where: { id: masterId },
          });
          masterData.status.bank = 0;
          await this.masterRepo.updateRowData(masterData, masterId);
          await this.bankingRepo.updateRowData(
            { salaryVerification: 0 },
            bankData.id,
          );
        }
      }
      // temporary redis code commented due to PROD issue
      // const key = `${bankData.loanId}_BANKDATABYLOANID`;
      // await this.redisService.del(key);
      return { needUserInfo: true };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async uploadAdditionalStatement(reqData) {
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    let accDetails = reqData.accountDetails;
    if (!accDetails) return kParamMissing('accountDetails');
    const filePath = reqData.filePath;
    if (!filePath) return kParamMissing('filePath');
    /// if come json stringify then
    if (typeof accDetails == 'string') accDetails = JSON.parse(accDetails);

    const userData = await this.checkUserDetails(userId, accDetails, filePath);
    if (!userData || userData === k500Error)
      return k422ErrorMessage('Banking data not found!');
    const masterData = userData.masterData;
    const loanData = masterData.loanData;
    const bankingId = loanData?.bankingId;
    if (!bankingId) return k422ErrorMessage('Banking data not found!');

    /// if bank statements then add or update transaction to db because of we add transaction and check eligibility
    const add_transaction = await this.addAndUpdateTransactionData(reqData);
    if (add_transaction?.message) return add_transaction;

    const data: any = {
      filePath: reqData.filePath,
      accountDetails: accDetails,
      bankingId,
    };
    if (reqData.adminId) data.additionalUploadedByadmin = reqData.adminId;
    return await this.updateAdditonalAccount(userData, data, userId);
  }

  private async updateAdditonalAccount(finalData, data: any, userId?) {
    try {
      const masterData = finalData.masterData;
      const statusData = masterData?.status ?? {};
      const dates = masterData?.dates ?? {};
      const bankingId = data.bankingId;
      let filePath = data.filePath;
      const accountDetails = data.accountDetails;
      const attributes = ['userId', 'loanId'];
      const findData = await this.findBankingData(bankingId, attributes);
      if (findData === k500Error) return k500Error;

      /// find compare transaction data
      const compareData = await this.findCompareTransaction(
        findData.loanId,
        true,
        '',
      );
      if (compareData?.valid !== true && compareData.message)
        return compareData;
      const updateData: any = { isNeedAdditional: false };
      const isNeedAdditional = compareData.isNeedAdditionalAccount;
      if (isNeedAdditional === true) {
        updateData.salaryVerification = '0';
        updateData.salaryVerificationDate = new Date().toJSON();
        statusData.bank = 0;
        dates.banking = new Date().getTime();
      }

      if (filePath && !filePath.includes('storage.google')) {
        filePath = await this.uploadPdfFileToCloud(filePath);
        updateData.additionalBankStatement = filePath;
      }
      if (accountDetails) {
        updateData.additionalName = accountDetails.name;
        updateData.additionalAccountNumber = accountDetails.accountNumber;
        updateData.additionalBank = accountDetails.bank;
        updateData.additionalIFSC = accountDetails.ifscode;
        updateData.additionalAccountDetails = JSON.stringify(accountDetails);
      }
      updateData.additionalIFSC = (
        updateData.additionalIFSC ?? '0'
      ).toUpperCase();
      const isIfscValid = await this.checkIfscValidation(
        updateData.additionalIFSC,
        updateData.additionalBank,
      );
      // if (isIfscValid === k500Error) return k500Error;
      if (!isIfscValid) return k422ErrorMessage(InvalidIfscCode);
      const update = await this.bankingRepo.update(updateData, bankingId);
      await this.masterRepo.updateRowData(
        { status: statusData, dates },
        masterData.id,
      );
      if (data.additionalUploadedByadmin) {
        const rawData = {
          userId: userId,
          docUrl: filePath,
          docType: 'Bank statement',
          adminId: data?.additionalUploadedByadmin,
        };
        await this.mediaRepo.create(rawData);
      }
      if (update === k500Error) return kInternalError;
      // temporary redis code commented due to PROD issue
      // const key = `${findData?.loanId}_BANKDATABYLOANID`;
      // await this.redisService.del(key);
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async findCompareTransaction(
    loanId,
    isCheckAddional = false,
    accountNumber,
    referralFlow = false,
    bank?,
  ) {
    try {
      let url = await this.commonService.getTansactionQueryParams(
        loanId,
        isCheckAddional,
        false,
        accountNumber,
        referralFlow,
        bank,
      );
      if (url?.message) return url;
      url = GET_COMPARE_ACCOUNT + url;

      const result = await this.apiService.requestGet(url, kBankingProHeaders);
      if ((result?.valid ?? false) === true) return result;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async uploadFile(fileName: string) {
    try {
      const result = await this.apiService.requestPost(
        UPLOAD_BANK_PDF,
        { fileName },
        kBankingProHeaders,
      );
      if (result?.valid === true) return result?.url;
      else {
        const result = await this.apiService.requestPost(
          UploadPDFFile,
          { fileName },
          kBankingProHeaders,
        );
        if (result?.valid === true) return result?.url;
        return '';
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async findBankingData(id, attribute?: string[]) {
    try {
      if (!id) return {};
      const attributes = attribute ?? [
        'mandateAdminId',
        'disbursementAdminId',
        'attempts',
        'accountNumber',
        'bankStatement',
        'salaryVerification',
        'isNeedTagSalary',
        'tagSalaryData',
        'additionalURLs',
        'bank',
      ];

      const include = [{ model: loanTransaction, attributes: ['loanStatus'] }];
      const findData = await this.bankingRepo.findOne(attributes, {
        where: { id },
        include,
      });
      if (findData === k500Error) return {};
      const loanStatus = findData?.loanData?.loanStatus;
      if (loanStatus === 'Active') return k500Error;
      if (loanStatus === 'Rejected' || loanStatus === 'Complete')
        return attribute ? k500Error : {};
      return findData;
    } catch (error) {
      return {};
    }
  }

  // #start region for sending low interest rate whatsapp message
  async sendLowInterestWhatsappMsg(userData) {
    try {
      const adminId = userData?.adminId ?? SYSTEM_ADMIN_ID;
      const userId = userData?.id;
      const customerName = userData?.fullName;
      const email = userData?.email;
      const loanId = userData?.masterData?.loanId;
      let number = this.cryptService.decryptPhone(userData?.phone);
      if (!gIsPROD) number = UAT_PHONE_NUMBER[0];

      const whatsappOption = {
        customerName,
        email,
        number,
        loanId,
        userId,
        adminId,
        interestRate: '0.1%',
        loanAmountUpTo: this.typeService.amountNumberWithCommas(
          GLOBAL_RANGES.MAX_LOAN_AMOUNT,
        ),
        title: 'Eligible for lower per',
        requestData: 'eligible for lower per',
      };
      // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
      this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  async getLatestMonthBankStatement(reqData: any) {
    // Params validation
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');

    const rawQuery = `SELECT "accountNumber", "bank", "dataOfMonth", "ifsCode", "salaryVerification"
    FROM "BankingEntities"
    WHERE "userId" = '${userId}' AND "bank" IS NOT NULL AND "accountNumber" IS NOT NULL
    ORDER BY "id" DESC`;
    const outputList = await this.repoManager.injectRawQuery(
      BankingEntity,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();

    const date = new Date();
    const last_month = 4;
    let latestMonths = [];
    let currentmonth = date.getMonth();

    for (let i = 0; i < last_month; i++) {
      const year = date.getFullYear();
      let key =
        kMonths[currentmonth].substring(0, 3).toUpperCase() + ' ' + year;
      latestMonths.push(key);
      currentmonth -= 1;

      if (currentmonth < 0) {
        currentmonth = 11;
        date.setFullYear(date.getFullYear() - 1);
      }
      date.setMonth(currentmonth);
    }

    for (let index = 0; index < outputList?.length; index++) {
      const dataOfMonth = outputList[index]?.dataOfMonth;
      if (dataOfMonth != null) {
        const parsedDataOfMonth = JSON.parse(dataOfMonth);
        for (const [month, value] of Object.entries(parsedDataOfMonth)) {
          if (value === true) {
            if (latestMonths.slice(1).includes(month)) {
              latestMonths = latestMonths.filter((m) => m !== month);
            }
          }
        }
      }
    }
    let prepareData: any = {
      title: latestMonths[0] ?? '',
      accountNumber: outputList[0]?.accountNumber ?? '',
      ifsc: outputList[0]?.ifsCode ?? '',
      multipleBankStatement: latestMonths,
    };
    if (latestMonths.length > 1) {
      const combineBankStatement =
        latestMonths[latestMonths.length - 1] + ' to ' + latestMonths[0];
      prepareData.title = combineBankStatement;
      prepareData.combinedBankStatement =
        'consisting of ' + combineBankStatement;
    }
    return prepareData;
  }

  private checkHavingValidTransactionsForLoan(transactions: any): boolean {
    // Check if any transaction fails the criteria
    const hasInvalidTransaction = transactions.some(
      (transaction) =>
        transaction?.type == 'CREDIT' &&
        +transaction?.amount >= GLOBAL_RANGES.MIN_SALARY_AMOUNT &&
        transaction?.category?.toLowerCase() != 'upi' &&
        transaction?.category?.toLowerCase() != 'cash deposit' &&
        transaction?.category?.toLowerCase() != 'application',
    );
    // Return true if no invalid transaction found, otherwise false
    return hasInvalidTransaction;
  }

  checkMinimumMonthsSalary(monthData) {
    let totalData: any = [];
    const date = new Date();
    for (let index = 0; index < 4; index++) {
      try {
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${month < 9 ? '0' : ''}${Number(month) + 1}/${year}`;

        const findData = monthData.find(
          (e) => (e.monthYear ?? '').endsWith(key) && e.value !== -1,
        );
        if (findData) totalData.push(findData);

        date.setMonth(month - 1);
      } catch (error) {}
    }
    return totalData;
  }

  async getBankData(userId) {
    const attributes = ['accountNumber', 'bank'];
    const options = {
      where: { userId },
      order: [['id', 'DESC']],
    };
    const bankData = await this.bankingRepo.getRowWhereData(
      attributes,
      options,
    );
    if (bankData == k500Error) return kInternalError;
    let allBankName = await this.redisService.get('BANK_NAME');
    allBankName = JSON.parse(allBankName);

    const bankName = allBankName[bankData?.bank];
    if (!bankName) await this.storeBankNameOnRedis();

    const bankDetails = {
      accountNumber: bankData?.accountNumber,
      bank: bankName?.bankName ?? bankData?.bank,
      bankCode: bankData?.bank,
      fipName: bankName?.fipName,
    };
    return bankDetails;
  }

  async storeBankNameOnRedis() {
    try {
      const attr = ['bankCode', 'bankName', 'fipName'];
      const options = { where: {} };
      const bank = await this.bankListRepo.getTableWhereData(attr, options);

      const bankDictionary = bank.reduce((acc, bank) => {
        acc[bank.bankCode] = {
          bankName: bank.bankName,
          fipName: bank.fipName,
        };
        return acc;
      }, {});

      const bankData = JSON.stringify(bankDictionary);
      await this.redisService.set('BANK_NAME', bankData);
    } catch (error) {
      return false;
    }
  }

  async dailyBankStatementUpdate() {
    try {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 1);
      const today = new Date();
      const include = {
        model: registeredUsers,
        attributes: ['completedLoans'],
      };
      const attribute = ['salaryVerification', 'name'];
      const options = {
        where: {
          salaryVerification: { [Op.or]: ['1', '3'] },
          createdAt: {
            [Op.and]: {
              [Op.gte]: currentDate,
              [Op.lt]: today,
            },
          },
        },
        include,
        group: ['userId', 'salaryVerification', 'name', 'user.id'],
      };
      const bankDetails = await this.bankingRepo.getTableWhereData(
        attribute,
        options,
      );
      let newVerifiedSalary = 0;
      let newByPassSalary = 0;
      let repeatByPassSalary = 0;
      let repeatVerifiedSalary = 0;
      for (let i = 0; i < bankDetails.length; i++) {
        if (bankDetails[i].user.completedLoans > 1) {
          if (bankDetails[i].salaryVerification == '1') {
            repeatByPassSalary++;
          }
          if (bankDetails[i].salaryVerification == '3') {
            repeatVerifiedSalary++;
          }
        }
        if (bankDetails[i].user.completedLoans <= 1) {
          if (bankDetails[i].salaryVerification == '1') {
            newByPassSalary++;
          }
          if (bankDetails[i].salaryVerification == '3') {
            newVerifiedSalary++;
          }
        }
      }

      const chart = {
        type: 'bar',
        data: {
          labels: ['Repeat users', 'New users'],
          datasets: [
            {
              label: 'System verified salary',
              data: [repeatByPassSalary, newByPassSalary],
              backgroundColor: 'rgba(75, 192, 192, 0.2)', // Optional: Add colors for better distinction
              borderColor: 'rgba(75, 192, 192, 1)', // Optional: Add border colors for better distinction
              borderWidth: 1, // Optional: Add border width for better distinction
            },
            {
              label: 'Admin verified salary',
              data: [repeatVerifiedSalary, newVerifiedSalary],
              backgroundColor: 'rgba(255, 140, 0, 0.2)', // Optional: Add colors for better distinction
              borderColor: 'rgba(255, 140, 0, 1)', // Optional: Add border colors for better distinction
              borderWidth: 1, // Optional: Add border width for better distinction
            },
          ],
        },
      };
      const { readableStr } = this.dateService.dateToReadableFormat(today);
      const encodedChart = encodeURIComponent(JSON.stringify(chart));
      const chartUrl = `https://quickchart.io/chart?c=${encodedChart}`;
      const channel = !gIsPROD
        ? EnvConfig.slack.channelId
        : EnvConfig.slack.csTeamChannelId;
      const result = await this.slack.sendMsg({
        channel,
        blocks: [
          {
            type: 'image',
            title: {
              type: 'plain_text',
              text: `Bank statement update ${readableStr}`,
            },
            block_id: 'quickchart-image',
            image_url: chartUrl,
            alt_text: 'Chart showing latest data',
          },
        ],
      });
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendSummaryToSlack(reqData) {
    if (!gIsPROD) return {};
    let type = reqData.type;
    if (!type) return kParamMissing('type');
    type = type.toUpperCase();
    let title = 'Agenda';
    if (type == 'EOD') title = 'Summary';

    let messageCount = 0;
    const channel = EnvConfig.slack.AppDevelopmentChannelId;
    const result = await this.slack.getMsg({ channel });
    if (result?.messages?.length > 0) {
      const todayDate = moment().format('DD-MM-YYYY');
      for (let index = 0; index < result?.messages.length; index++) {
        const element = result?.messages[index];
        if (element?.text && element.text.startsWith(type)) {
          const msgDate = moment(element.ts.split('.')[0] * 1000).format(
            'DD-MM-YYYY',
          );
          if (todayDate == msgDate) {
            messageCount++;
            for (let index = 0; index < TLWiseList.length; index++) {
              const TLelement = TLWiseList[index];
              for (let j = 0; j < TLelement.members.length; j++) {
                const memElement = TLelement.members[j];
                if (memElement.slackuid == element?.user) {
                  memElement.text = element?.text;
                }
              }
            }
          }
        }
      }
      if (messageCount == 0) return {};
      const APPDevChannel = EnvConfig.slack.AppDevelopmentChannelId;

      for (let index = 0; index < TLWiseList.length; index++) {
        const TLelement = TLWiseList[index];
        let summaryText =
          '`' +
          TLelement.name +
          "` Today's " +
          title +
          ' `' +
          todayDate +
          '`\n\n';
        for (let j = 0; j < TLelement.members.length; j++) {
          const memElement = TLelement.members[j];
          memElement.text = memElement.text?.replace(type + ':', '');
          memElement.text = memElement.text?.replace(type + ' :', '');
          if (type == 'EOD'){
            memElement.text = memElement.text?.split('Next day')[0];
            memElement.text = memElement.text?.split('Next Day')[0];
          }
          const empText = memElement.text
            ? memElement.text
            : 'On Leave OR ' + type + ' MISSING';
          summaryText += '*' + memElement.name + '* - ' + empText + '\n';
          delete memElement.text;
        }
        await this.slack.sendMsg({
          channel: APPDevChannel,
          text: summaryText,
          sourceStr: false,
        });
        await this.typeService.delay(10000);
      }
      return TLWiseList;
    }
    return result;
  }
}
