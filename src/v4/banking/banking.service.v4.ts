// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { Op } from 'sequelize';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kErrorMsgs,
  kNoDataFound,
  kReferral,
  kfinvu,
} from 'src/constants/strings';
import { regPanCard } from 'src/constants/validation';
import { kCAMS, kCapActive, kOneMoney } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { BanksRepo } from 'src/repositories/bank_repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { BankingSharedService } from 'src/shared/banking.service';
import { NetbankingServiceV4 } from './netbanking.service.v4';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { CryptService } from 'src/utils/crypt.service';
import { ValidationService } from 'src/utils/validation.service';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { TypeService } from 'src/utils/type.service';
import { OneMoneyService } from 'src/thirdParty/oneMoney/one.money.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { BankingEntity } from 'src/entities/banking.entity';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { KycServiceV4 } from '../kyc/kyc.service.v4';
import { SequelOptions } from 'src/interfaces/include.options';
import { IpCheckService } from 'src/shared/ipcheck.service';
import { ICreateNewAAJourney } from './banking.interfaces.v4';
import { getAAWebData } from 'src/constants/objects';
import { KYCEntity } from 'src/entities/kyc.entity';
import { FinvuService } from 'src/thirdParty/finvu/finvu.service';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class BankingServiceV4 {
  constructor(
    // Database
    private readonly repo: RepositoryManager,
    private readonly bankRepo: BanksRepo,
    private readonly branchesRepo: BranchesRepository,
    @Inject(forwardRef(() => CamsServiceThirdParty))
    private readonly camsService: CamsServiceThirdParty,
    @Inject(forwardRef(() => FinvuService))
    private readonly finvuService: FinvuService,
    private readonly cryptService: CryptService,
    private readonly loanRepo: LoanRepository,
    private readonly repository: BankingRepository,
    private readonly masterRepo: MasterRepository,
    private readonly oneMoneyService: OneMoneyService,
    private readonly razorpayService: RazorpoayService,
    private readonly sharedBanking: BankingSharedService,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly validation: ValidationService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly authAiService: AuthAiService,
    private readonly empRepo: EmploymentRepository,
    private readonly bankListRepo: BankListRepository,
    private readonly kycServiceV4: KycServiceV4,
    // Services
    private readonly netbanking: NetbankingServiceV4,
    private readonly ipCheckService: IpCheckService,
    // Shared services
    private readonly metricsService: MetricsSharedService,
    private readonly commonSharedSevice: CommonSharedService,
  ) {}

  //#region -> Get all available bank list
  async getList(reqData) {
    // Params validation
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');

    const bankList = await this.sharedBanking.getBankList(reqData);
    if (bankList?.message) return bankList;

    // Get id for ifsc list
    const ifscBankList = await this.bankRepo.getTableWhereData(
      ['id', 'name'],
      {},
    );
    if (ifscBankList === k500Error) throw new Error();

    const rawQuery = `SELECT "accountNumber", "bank" 
          FROM "BankingEntities"
          WHERE "userId" = '${userId}' AND "accountNumber" IS NOT NULL
          ORDER BY "id" DESC
          LIMIT 1`;
    const outputList = await this.repo.injectRawQuery(BankingEntity, rawQuery, {
      source: 'REPLICA',
    });
    if (outputList == k500Error) throw new Error();
    const accNumber = outputList[0];

    bankList.forEach((el) => {
      const sameBank = ifscBankList.find((subEl) => subEl.name == el.bankName);
      if (sameBank) el.id = +sameBank.id;
      if (accNumber?.accountNumber && accNumber?.bank == el?.bankCode)
        el.accNumber = accNumber?.accountNumber;
      if ([0, 1, 2].includes(el.aaMode)) el.aaService = true;
      else el.aaService = false;
      delete el.aaMode;
    });

    if (bankList?.message) return bankList;
    return bankList;
  }

  async getNewList(reqData) {
    // Params validation
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');

    let rawQuery = `SELECT "aaAttempts" FROM "registeredUsers"
                      WHERE "id" = '${userId}'`;

    let [bankList, ifscBankList, outputList] = await Promise.all([
      this.sharedBanking.getNewBankList(reqData),
      this.bankRepo.getTableWhereData(['id', 'name'], {}),
      this.repo.injectRawQuery(registeredUsers, rawQuery, {
        source: 'REPLICA',
      }),
    ]);

    if (bankList?.message) return bankList;
    if (ifscBankList === k500Error) throw new Error();
    if (outputList == k500Error) throw new Error();
    const userData = outputList[0] ?? { aaAttempts: {} };
    const aaAttempts = userData.aaAttempts ?? {};

    rawQuery = `SELECT "accountNumber", "bank" 
          FROM "BankingEntities"
          WHERE "userId" = '${userId}' AND "accountNumber" IS NOT NULL
          ORDER BY "id" DESC
          LIMIT 1`;
    const existingData = await this.repo.injectRawQuery(
      BankingEntity,
      rawQuery,
      {
        source: 'REPLICA',
      },
    );
    if (existingData == k500Error) throw new Error();
    const accNumber = existingData[0];

    bankList = bankList.filter((el) => {
      const sameBank = ifscBankList.find((subEl) => subEl.name == el.bankName);
      if (sameBank) el.id = +sameBank.id;
      if (accNumber?.accountNumber && accNumber?.bank == el?.bankCode)
        el.accNumber = accNumber?.accountNumber;

      const isAttemptRestrictions = el?.service?.attemptRestrictions == true;

      el.availableServices = [];
      if (el.service.aa != -1) {
        if (isAttemptRestrictions) {
          const bankAttempt = aaAttempts[el.bankCode] ?? {};
          if ((bankAttempt?.count ?? 0) <= 0) {
            el.availableServices.push('Account Aggregator');
          } else {
            const today = new Date();
            const attemptTime = bankAttempt.time
              ? new Date(bankAttempt.time)
              : null;
            if (!attemptTime) {
              el.availableServices.push('Account Aggregator');
            } else {
              const hoursDiff = this.typeService.dateDifference(
                today,
                attemptTime,
                'Hours',
              );
              if (hoursDiff >= 72) {
                el.availableServices.push('Account Aggregator');
              }
            }
          }
        } else el.availableServices.push('Account Aggregator');
      }
      if (el.service.statement == true)
        el.availableServices.push('Bank Statement');

      if (reqData?.typeOfDevice != 2) {
        if (el.service.netbanking == true)
          el.availableServices.push('Net Banking');
      }
      if (el.availableServices.length === 0) return false;
      else {
        // Force fully account aggregator option for target bank
        if (
          isAttemptRestrictions &&
          el?.service?.aa != -1 &&
          el?.availableServices.length > 1 &&
          el?.availableServices?.includes('Account Aggregator')
        ) {
          el.availableServices = ['Account Aggregator'];
        }
        delete el.service;

        return true;
      }
    });

    if (bankList?.message) return bankList;
    return bankList;
  }

  // Get netbanking flow json
  async netbankingFlowDetails(reqData) {
    // Params validation
    const userId: string = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const loanId: number = reqData.loanId;
    if (!loanId) return kParamMissing('loanId');
    const bankCode: string = reqData.bankCode;
    if (!bankCode) return kParamMissing('bankCode');

    // Check is bank is available
    let attributes: string[] = ['bankName', 'service'];
    let options: any = { where: { bankCode } };
    const bankData = await this.bankListRepo.getRowWhereData(
      attributes,
      options,
    );
    if (bankData == k500Error) return kInternalError;
    if (!bankData) return k422ErrorMessage(kNoDataFound);
    if (bankData?.service?.netbanking != true) {
      return k422ErrorMessage(
        `${
          bankData.bankName ?? 'Bank'
        } is not available at this moment, Please try after sometime.`,
      );
    }

    // Get company name
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['typeOfDevice'];
    const include = [userInclude];
    attributes = ['companyName', 'salary'];
    options = { include, order: [['id', 'DESC']], where: { userId } };
    const empData = await this.empRepo.getRowWhereData(attributes, options);
    if (!empData) return k422ErrorMessage(kNoDataFound);
    if (empData == k500Error) return kInternalError;

    return {
      needUserInfo: true,
      webviewData: this.netbanking.getNetbankingJsonData({
        bankCode,
        loanId,
        userId,
        ...empData,
        typeOfDevice: empData?.user?.typeOfDevice,
      }),
    };
  }

  // Get IFSC code details from Razorpay
  async ifscDetails(reqData) {
    // Params validation
    const ifscCode = reqData.ifscCode;
    if (!ifscCode) return kParamMissing('ifscCode');

    return await this.razorpayService.getIFSCDetails({ ifsc: ifscCode });
  }

  async validateEligibility(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const eligibility = await this.sharedBanking.validateEligibility(reqData);
    if (eligibility.message) return eligibility;
    const referralFlow = eligibility?.referralFlow == true ? true : false;
    return {
      needUserInfo: true,
      referralFlow,
      isFailedAttempt: eligibility.isFailedAttempt,
    };
  }

  //#region Account aggregator
  async inviteForAA(reqData) {
    // #01 -> Validate request data before proceeding for the account aggregator
    const reqResult = await this.validateAARequest(reqData);
    if (reqResult?.message || reqResult?.needUserInfo) return reqResult;

    // #02 -> If User consent is Already Present proceeding with Previous consent
    reqData.aaMode = +reqResult.aaMode;
    const prevCams = await this.checkPreviousAA(reqData);
    if (prevCams?.message) return prevCams;
    if (prevCams && prevCams.consentMode)
      return this.fetchPreviousAAJourney(reqData, prevCams);

    // #03 -> Create new AA session and send invitation url to user on app
    return this.createNewAAJourney(reqResult);
  }

  private async checkPreviousAA(reqData: any) {
    const accountNumber = reqData.accNumber;
    const userId = reqData.userId;

    const attributes = ['consentId', 'consentMode', 'id'];
    const options = {
      where: {
        accountNumber,
        consentId: { [Op.ne]: null },
        consentResponse: { [Op.ne]: null },
        salaryVerification: { [Op.in]: ['1', '3'] },
        userId,
      },
    };
    const prevCams = await this.repository.getRowWhereData(attributes, options);
    if (prevCams === k500Error) throw new Error();

    if (prevCams && prevCams.consentMode && !isNaN(+reqData.aaMode)) {
      if (+reqData.aaMode === 0 && prevCams.consentMode === 'CAMS')
        return prevCams;
      else if (+reqData.aaMode === 1 && prevCams.consentMode === 'ONE_MONEY')
        return prevCams;
      else if (+reqData.aaMode === 2 && prevCams.consentMode === 'FINVU')
        return prevCams;
    }
  }

  private async fetchPreviousAAJourney(reqData: any, prevData: any) {
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');

    // Query preparation
    const attributes = ['status', 'id', 'loanId'];
    const options = {
      order: [['id', 'DESC']],
      where: { userId },
    };
    // Query
    const masterData = await this.masterRepo.getRowWhereData(
      attributes,
      options,
    );
    if (masterData == k500Error) throw new Error();
    if (!masterData) return k422ErrorMessage(kNoDataFound);

    const loanId = masterData.loanId;
    const updatedStatus = masterData.status;
    // update master bank status
    updatedStatus.bank = 4;
    const updatedMaster = await this.masterRepo.updateRowData(
      { status: updatedStatus },
      masterData.id,
    );
    if (updatedMaster == k500Error) throw new Error();
    // update banking salary verification status
    const updatedBank = await this.repository.createRowDataWithCopy(
      {
        salaryVerification: '4',
        loanId,
        status: null,
        attempts: 1,
        bankStatement: null,
        additionalURLs: null,
      },
      prevData.id,
    );
    if (updatedBank == k500Error) throw new Error();

    // Update loan data
    const updatedData = { bankingId: updatedBank.id };
    const updateResponse = await this.loanRepo.updateRowData(
      updatedData,
      loanId,
    );
    if (updateResponse == k500Error) throw new Error();

    // Fetch data from consentId
    let response: any = {};
    if (prevData.consentMode == kCAMS)
      response = await this.camsService.fetchData(prevData.consentId);
    else if (prevData.consentMode == kOneMoney) {
      let request = await this.oneMoneyService.funRequestNewfidata({
        consentID: prevData.consentId,
      });
      if (request?.message) return request;
      response = await this.validateAA({ userId });
    } else if (prevData.consentMode == kfinvu)
      response = await this.validateAA({ userId });

    if (response?.message) return;
    return { needUserInfo: true, existingConsent: true };
  }

  // #01 -> Validate request data before proceeding for the account aggregator
  private async validateAARequest(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const bankCode = reqData.bankCode;
    if (!bankCode) return kParamMissing('bankCode');
    const ifsCode = reqData.ifscCode;
    if (!ifsCode) return kParamMissing('ifsCode');
    const accNumber = reqData.accNumber;
    if (!accNumber) return kParamMissing('accNumber');
    const targetPhone = reqData.phone;
    if (!targetPhone) return kParamMissing('phone');
    // For referral withdraw account details
    const referralFlow = reqData?.referralFlow == true ? true : false;

    // Get user data
    // Query preparation
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['status', 'loanId'];
    const kycInclude: any = { model: KYCEntity };
    kycInclude.attributes = ['panCardNumber'];
    const include = [masterInclude, kycInclude];
    const attributes = ['masterId'];
    const options = { include, where: { id: userId } };
    // Query
    const userData = await this.userRepo.getRowWhereData(attributes, options);
    // Query data validation
    if (userData == k500Error) throw new Error();
    if (!userData) return k422ErrorMessage(kNoDataFound);

    // Existing status
    const statusData = userData.masterData?.status ?? {};
    if (statusData.bank == 1 || statusData.bank == 3)
      return k422ErrorMessage('Account aggregator invitation Failed!');
    const loanId = userData.masterData?.loanId;

    // IP guard
    const ipCheck: any = await this.ipCheckService.ipCheck(userId, loanId);
    if (ipCheck == true) return { needUserInfo: true };

    // IFSC validation
    const ifscDetails = await this.razorpayService.getIFSCDetails({
      ifsc: ifsCode,
    });
    if (ifscDetails.message) return ifscDetails;

    // Bank code validation
    const bankCodeDetails: any = this.commonSharedSevice.checkBankCode(
      bankCode,
      ifscDetails,
    );
    if (bankCodeDetails.message) return bankCodeDetails;

    // Service validation
    const bankData = await this.bankListRepo.getRowWhereData(
      ['service', 'fipName'],
      { where: { bankCode } },
    );
    if (bankData === k500Error) throw new Error();
    if (!bankData) return k422ErrorMessage(kErrorMsgs.SERVICE_UNAVAILABLE);
    const aaMode = bankData?.service?.aa ?? -1;
    if (![0, 1, 2].includes(aaMode))
      return k422ErrorMessage(kErrorMsgs.SERVICE_UNAVAILABLE);
    return {
      aaMode,
      accNumber,
      bankCode,
      fipName: bankData.fipName,
      ifsc: ifsCode,
      loanId,
      referralFlow,
      phone: targetPhone,
      userId,
      pan: userData.kycData.panCardNumber,
    };
  }

  // #03 -> Create new AA session and send invitation url to user on app
  private async createNewAAJourney(reqData: ICreateNewAAJourney) {
    // Params preparation
    const aaMode = reqData.aaMode;
    const accNumber = reqData.accNumber;
    const bankCode = reqData.bankCode;
    const fipName = reqData.fipName;
    const ifsc = reqData.ifsc;
    const loanId = reqData.loanId;
    const phone = reqData.phone;
    const referralFlow = reqData.referralFlow;
    const userId = reqData.userId;
    const pan = reqData.pan;

    let consentMode;
    let invitationData: any = {};

    // Service -> CAMS
    if (+aaMode === 0) {
      invitationData = await this.camsService.inviteForAA(phone, fipName);
      consentMode = kCAMS;
    }
    // Service -> One money
    else if (+aaMode === 1) {
      invitationData = await this.oneMoneyService.invitationLink({
        accNumber,
        phone,
        fipName,
      });
      consentMode = kOneMoney;
    }
    // Service -> Finvu
    else if (+aaMode === 2) {
      invitationData = await this.finvuService.inviteForAA({
        bankCode,
        custId: phone,
        fipName,
        userId,
        loanId,
        pan,
      });
      consentMode = kfinvu;
    }
    if (invitationData?.message) return invitationData;

    // Create -> Metrics
    await this.metricsService.insertLog({
      loanId,
      type: 1,
      subType: 2,
      status: 1,
      userId,
      values: {
        activity: 'INVITE_NEW_AA',
        bankCode,
        referenceId:
          invitationData?.consentHandle ?? invitationData?.consentTxnId,
        source: consentMode,
      },
    });

    // Get bank data
    const bankAttr = ['attempts', 'id'];
    const bankOptions = { order: [['id', 'DESC']], where: { loanId } };
    let bankData = await this.repository.getRowWhereData(bankAttr, bankOptions);
    if (bankData == k500Error) throw new Error();

    // Create -> bank record
    if (!bankData || referralFlow) {
      const creationData: any = {
        attempts: 1,
        loanId,
        userId,
        bank: bankCode,
        consentPhone: this.cryptService.encryptPhone(phone),
        consentURL: invitationData?.url,
        consentTxnId: invitationData?.consentTxnId,
        consentHandleId: invitationData?.consentHandle,
        mandateBank: bankCode,
        mandateAccount: accNumber,
        mandateIFSC: ifsc,
        accountNumber: accNumber,
        accountID: accNumber,
        ifsCode: ifsc,
        disbursementBank: bankCode,
        disbursementAccount: accNumber,
        disbursementIFSC: ifsc,
        consentMode,
      };
      if (referralFlow) creationData.type = kReferral;
      bankData = await this.repository.createRowData(creationData);
      if (bankData == k500Error) throw new Error();

      // Update loan data
      const updatedData = { bankingId: bankData.id };
      const updatedResult = await this.loanRepo.updateRowData(
        updatedData,
        loanId,
      );
      if (updatedResult == k500Error) throw new Error();
    }
    // Update data
    else {
      const updatedData = {
        attempts: (bankData.attempts ?? 0) + 1,
        bank: bankCode,
        consentPhone: this.cryptService.encryptPhone(phone),
        consentURL: invitationData?.url,
        consentTxnId: invitationData?.consentTxnId,
        consentHandleId: invitationData?.consentHandle,
        accountNumber: accNumber,
        mandateBank: bankCode,
        mandateAccount: accNumber,
        mandateIFSC: ifsc,
        accountID: accNumber,
        disbursementAccount: accNumber,
        disbursementIFSC: ifsc,
        disbursementBank: bankCode,
        ifsCode: ifsc,
        consentMode,
      };
      const updatedResult = await this.repository.updateRowData(
        updatedData,
        bankData.id,
      );
      if (updatedResult == k500Error) throw new Error();
    }

    // Update AA attempt
    const rawQuery = `SELECT "aaAttempts" 
                      FROM "registeredUsers"
                      WHERE "id" = '${userId}' 
                      LIMIT 1`;
    const outputList = await this.repo.injectRawQuery(
      registeredUsers,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();
    const userData = outputList[0] ?? { aaAttempts: {} };
    const aaAttempts = userData?.aaAttempts ?? {};
    aaAttempts[bankCode] = { count: 1, time: new Date().toJSON() };
    const updatedData = { aaAttempts };
    await this.repo.updateRowData(registeredUsers, updatedData, userId);

    const webviewData = getAAWebData(invitationData.url, userId);
    return { needUserInfo: true, webviewData };
  }

  async validateAA(reqData) {
    // Validation -> parameters
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    // for referral withdraw account details
    const referralFlow = reqData?.referralFlow == true ? true : false;

    // Preparation -> query
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['status'];
    const userInclude: any = { model: registeredUsers };
    userInclude.attributes = ['masterId'];
    userInclude.include = [masterInclude];
    const include = [userInclude];
    const attributes = [
      'consentTxnId',
      'consentHandleId',
      'id',
      'accountNumber',
      'bank',
      'accountID',
      'consentMode',
      'consentPhone',
      'id',
      'loanId',
      'salaryVerification',
    ];
    const options = { include, order: [['id', 'DESC']], where: { userId } };
    // Hit -> Query
    const bankData = await this.repository.getRowWhereData(attributes, options);
    // Validation -> query data
    if (bankData === k500Error) throw new Error();
    if (!bankData) return k422ErrorMessage(kNoDataFound);
    const consentTxnId = bankData.consentTxnId;
    if (!consentTxnId && bankData.consentMode !== kfinvu)
      return k422ErrorMessage('consentTxnId not found');

    // Handle -> Referral flow
    if (referralFlow) {
      const accNumber = bankData.accountNumber;
      const stLength = accNumber.length - 4;
      const acNo = 'xxxxxx' + accNumber.substring(stLength, accNumber.length);
      const sMsg = 'Your account details successfully submitted!';
      const content = `Your bank account ${acNo} successfully submitted.`;
      const body = {
        userList: [userId],
        content,
        title: sMsg,
        message: content,
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return { needUserInfo: true, referralFlow };
    }

    // Validation -> banking process
    if (
      bankData.salaryVerification != '-1' &&
      bankData.salaryVerification != '2' &&
      bankData.salaryVerification != '4'
    ) {
      return k422ErrorMessage('Validation failed');
    }
    const masterData = bankData.user?.masterData ?? {};
    const masterId = bankData.user?.masterId;
    const statusData = masterData.status ?? {};
    if (statusData.bank != -1 && statusData.bank != 2 && statusData.bank != 4)
      return k422ErrorMessage('Validation failed');

    const otherBankAttr: any = {};
    const accountNumber = bankData.accountNumber;
    const accountID = bankData.accountID;
    // Waiting for success response or will check later on via cron
    if (statusData.bank != 1 && statusData.bank != 3) statusData.bank = 4;

    // Create -> Metrics
    await this.metricsService.insertLog({
      loanId: bankData.loanId,
      type: 1,
      subType: 2,
      status: 1,
      userId,
      values: {
        activity: 'VALIDATE_AA',
        bankCode: bankData.bank,
        referenceId: bankData.consentHandleId ?? consentTxnId,
        source: bankData.consentMode,
      },
    });

    // Validation -> One money flow
    if (bankData.consentMode == kOneMoney) {
      const phone = this.cryptService.decryptPhone(bankData.consentPhone);
      const consentData = await this.oneMoneyService.checkStatus({
        accNumber: accountID,
        consentTxnId,
        phone,
      });
      if (consentData?.message) return consentData;

      // Consent successfully given by user need to complete rest operation for salary verification
      if (consentData.isCompleted) {
        otherBankAttr.consentId = consentData.consentID;
        otherBankAttr.consentStatus = kCapActive;
        otherBankAttr.consentResponse = JSON.stringify(consentData);
      }
    } // Validation -> Finvu flow
    else if (bankData.consentMode == kfinvu) {
      const phone = this.cryptService.decryptPhone(bankData.consentPhone);
      const consentData: any = await this.finvuService.checkConsentStatus(
        bankData.consentHandleId,
        `${phone}@finvu`,
      );

      if (
        reqData?.typeOfDevice == '2' &&
        consentData?.consentId == null &&
        consentData?.consentStatus != 'REJECTED'
      )
        return {};

      if (consentData.consentStatus === 'ACCEPTED') {
        otherBankAttr.aaDataStatus = 1;
        otherBankAttr.consentId = consentData.consentId;
        otherBankAttr.consentStatus = consentData.consentStatus;
        otherBankAttr.consentResponse = JSON.stringify(consentData);
        // Request for periodic data
        otherBankAttr.sessionId = await this.finvuService.fetchDataRequest(
          phone,
          otherBankAttr.consentId,
          bankData.consentHandleId,
        );
      } else if (consentData.consentStatus === 'REJECTED') {
        let status = bankData.user.masterData.status ?? {};
        const response: any = await this.markAAAttemptAsFailed(
          kErrorMsgs.AA_CONSENT_REJECTED,
          bankData.id,
          status,
          bankData.user,
        );
        if (response.status) status = response.status;
      }
    }

    // Update -> banking data
    let updatedData: any = {
      salaryVerification: statusData.bank.toString(),
      ...otherBankAttr,
    };
    let updateResult = await this.repository.updateRowData(
      updatedData,
      bankData.id,
    );
    if (updateResult == k500Error) throw new Error();

    // Update -> master data
    updatedData = { status: statusData };
    updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
    if (updateResult == k500Error) throw new Error();
    if (
      otherBankAttr.consentStatus === kCapActive &&
      bankData.consentMode == kOneMoney &&
      otherBankAttr.consentId
    ) {
      await this.checkOneMoneyData(
        otherBankAttr.consentId,
        userId,
        accountNumber,
        bankData?.bank,
      );
    }
    return { needUserInfo: true };
  }

  async syncAAData(data: any) {
    try {
      const purpose = data.purpose;
      let consentTxnId = '';
      let consentId = '';
      let consentResponse = '';
      let accountDetails = '';
      let consentStatus = '';
      let salaryVerification = '';
      consentTxnId = data.clienttxnid;

      if (purpose == 'Push_Data') {
        accountDetails = JSON.stringify(data.accountDetails ?? {});
        delete data.accountDetails;
        consentId = data.consentid;
        consentResponse = JSON.stringify(data);
      } else if (purpose == 'ConsentStatusNotification') {
        consentResponse = JSON.stringify(data);
        consentId = data.ConsentStatusNotification?.consentId;
        consentStatus = data.ConsentStatusNotification?.consentStatus;
        if (consentStatus == 'ACTIVE') salaryVerification = '5';
      }
      if (!consentTxnId || !consentId) return {};

      const attributes = [
        'id',
        'salaryVerification',
        'userId',
        'bankStatement',
        'accountDetails',
        'consentMode',
      ];
      const options = { order: [['id', 'DESC']], where: { consentTxnId } };
      const bankingData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (bankingData == k500Error) return kInternalError;
      if (!bankingData) return k422ErrorMessage(kNoDataFound);
      if (
        bankingData.salaryVerification == '1' ||
        bankingData.salaryVerification == '3'
      )
        return k422ErrorMessage('Salary verification already completed');
      // using this for checking pan varification but not going for zoop
      if (regPanCard(data?.pan)) {
        const kycData = {
          userId: bankingData.userId,
          pan: data?.pan,
          consentMode: bankingData.consentMode,
        };
        await this.kycServiceV4.validatePan(kycData, true);
      }

      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['rejection', 'status'];
      const userOpt = {
        where: { id: bankingData.userId },
        include: [masterInclude],
      };
      const att = ['masterId'];
      const userData = await this.userRepo.getRowWhereData(att, userOpt);
      if (!userData || userData == k500Error) return kInternalError;

      let status = userData.masterData.status ?? {};
      const updatedData: any = { consentResponse };
      if (consentId) updatedData.consentId = consentId;
      if (accountDetails) updatedData.accountDetails = accountDetails;
      if (data.pdfURL) updatedData.bankStatement = data.pdfURL;
      if (salaryVerification && bankingData.salaryVerification == '-1')
        updatedData.salaryVerification = salaryVerification;
      if (consentStatus) {
        updatedData.consentStatus = consentStatus;
        // Auto decline bank step
        if (consentStatus == 'REJECTED') {
          const response: any = await this.markAAAttemptAsFailed(
            'You have rejected the account aggregator consent',
            bankingData.id,
            status,
            userData,
          );
          if (response.status) status = response.status;
        }
      }
      if (updatedData.salaryVerification) {
        status.bank = +updatedData.salaryVerification;
        await this.masterRepo.updateRowData({ status }, userData?.masterId);
      }
      const updateResponse = await this.repository.update(
        updatedData,
        bankingData.id,
      );

      if (updateResponse == k500Error) return kInternalError;

      const pendingStatuses = ['-1', '2', '5', '4', '0'];
      if (
        pendingStatuses.includes(bankingData.salaryVerification) &&
        accountDetails
      ) {
        const body = {
          userId: bankingData.userId,
          accountDetails: accountDetails ?? bankingData?.accountDetails,
          filePath: data?.pdfURL ?? bankingData?.bankStatement,
        };

        const eligibilityResponse = await this.validateEligibility(body);

        // Auto decline bank step
        if (eligibilityResponse.message) {
          await this.markAAAttemptAsFailed(
            eligibilityResponse.message,
            bankingData.id,
            status,
            userData,
          );
          return eligibilityResponse;
        }
      }

      return {
        needUserInfo: true,
        userId: bankingData.userId,
        notifyUser: accountDetails ? true : false,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async markAAAttemptAsFailed(rejectReason, bankingId, status, userData) {
    // Update bank data
    let updatedData: any = {
      adminId: SYSTEM_ADMIN_ID,
      rejectReason,
      salaryVerification: '2',
      aaStatusData: 2,
      salaryVerificationDate: this.typeService
        .getGlobalDate(new Date())
        .toJSON(),
    };
    let updateResponse: any = await this.repository.updateRowData(
      updatedData,
      bankingId,
    );
    if (updateResponse == k500Error) return kInternalError;

    // Update master data
    status.bank = 2;
    const rejection = userData.masterData?.rejection ?? {};

    rejection.banking = rejectReason;
    updatedData = { rejection, status };
    updateResponse = await this.masterRepo.updateRowData(
      updatedData,
      userData?.masterId,
    );
    if (updateResponse == k500Error) return kInternalError;
    return { status };
  }
  //#endregion Account aggregator

  async tagSalaries(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const salaries = reqData.salaries;
      if (!salaries) return kParamMissing('salaries');

      // Get bank data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['masterId'];
      userInclude.include = [masterInclude];
      const include = [userInclude];
      const attributes = [
        'id',
        'accountNumber',
        'ifsCode',
        'isNeedTagSalary',
        'salaryVerification',
      ];
      const options = { include, order: [['id', 'DESC']], where: { userId } };
      const bankData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (bankData == k500Error) return kInternalError;
      if (!bankData) return k422ErrorMessage(kNoDataFound);
      if (bankData.isNeedTagSalary != '0')
        return k422ErrorMessage('Salary tagging is failed');

      // Update bank data
      let updatedData: any = { isNeedTagSalary: '1' };
      if (
        bankData.salaryVerification != '1' &&
        bankData.salaryVerification != '3' &&
        bankData.ifsCode?.length > 4 &&
        !bankData.accountNumber?.toLowerCase().includes('x') &&
        !bankData.accountNumber?.includes('*')
      )
        updatedData.salaryVerification = '0';
      updatedData.tagSalaryData = JSON.stringify(salaries);
      let updateResult = await this.repository.updateRowData(
        updatedData,
        bankData.id,
      );
      if (updateResult == k500Error) return kInternalError;

      // Update master data if no stuff is remaining from bank details
      const statusData = bankData.user?.masterData?.status ?? {};
      if (
        bankData.ifsCode?.length > 4 &&
        !bankData.accountNumber?.includes('x') &&
        !bankData.accountNumber?.includes('*') &&
        statusData.bank == 4
      ) {
        statusData.bank = 0;
        const masterId = bankData.user.masterId;
        updatedData = { status: statusData };
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          masterId,
        );
        if (updateResult == k500Error) return kInternalError;
      }

      return { needUserInfo: true };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async ifscList(reqData) {
    try {
      const bankId = reqData?.bankId;
      const state = reqData?.state;
      const city = reqData?.city;
      const branch = reqData?.branch;

      let data: any = [];
      if (!bankId) data = await this.bankData();
      else if (bankId && !state) data = await this.stateData(bankId);
      else if (bankId && state && !city)
        data = await this.cityData(bankId, state);
      else if (bankId && state && city && !branch)
        data = await this.branchesData(bankId, state, city);
      else if (bankId && state && city && branch) {
        const options = {
          where: {
            branch,
            state,
            city,
            bank_id: bankId,
          },
        };
        data = this.branchesRepo.getRowWhereData(['ifsc', 'branch'], options);
      }
      if (data == k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async bankData() {
    try {
      return await this.bankRepo.getTableWhereData(['id', 'name'], {
        order: [['name']],
      });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async stateData(bankId) {
    try {
      return this.branchesRepo.getTableWhereData(['state'], {
        where: { bank_id: bankId },
        group: 'state',
        order: [['state']],
      });
    } catch (error) {}
  }

  private async cityData(bankId, state) {
    try {
      return this.branchesRepo.getTableWhereData(['city'], {
        where: { bank_id: bankId, state },
        group: 'city',
        order: [['city']],
      });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async branchesData(bankId, state, city) {
    try {
      return this.branchesRepo.getTableWhereData(['branch'], {
        where: { bank_id: bankId, state, city },
        order: [['branch']],
      });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async previousAAData(query) {
    // Params validation
    const userId = query?.userId ?? '';
    if (!userId) return kParamMissing('userId');

    const attributes = ['accountNumber', 'ifsCode', 'bank', 'consentPhone'];
    const options = {
      where: {
        consentMode: { [Op.ne]: null },
        consentPhone: { [Op.ne]: null },
        userId,
      },
      order: [['id', 'desc']],
    };

    const prevCams = await this.repository.getRowWhereData(attributes, options);
    if (prevCams === k500Error) throw new Error();

    if (prevCams) {
      prevCams.phoneNumber = this.cryptService.decryptPhone(
        prevCams.consentPhone,
      );
      prevCams.ifscCode = prevCams.ifsCode;
      delete prevCams.ifsCode;
      delete prevCams.consentPhone;
    }

    return prevCams ?? {};
  }

  async getPreviousCams(query) {
    try {
      const userId = query?.userId ?? '';
      if (!userId) return kParamMissing('userId');
      const attributes = ['accountNumber', 'ifsCode', 'bank'];
      const options = {
        where: {
          consentId: { [Op.ne]: null },
          consentResponse: { [Op.ne]: null },
          salaryVerification: { [Op.or]: ['1', '3'] },
          userId,
        },
        order: [['id', 'desc']],
      };
      const prevCams = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (prevCams === k500Error) return kInternalError;
      return prevCams ?? {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region checkOne money data
  private async checkOneMoneyData(consentID, userId, accountNumber, bank = '') {
    try {
      if (!consentID) return kParamMissing();
      /// get all fi data
      const result = await this.oneMoneyService.funGetallfidata({ consentID });
      if (result?.message) return result;
      let accountData;
      /// find account data from fi and match with accountNumber
      for (let index = 0; index < result.length; index++) {
        try {
          const ele = result[index];
          const accNumber = (ele?.maskedAccountNumber ?? '').toLowerCase();
          if (!accNumber) continue;
          const isValidNumber = this.validation.getCompareAN(
            accNumber,
            accountNumber,
          );
          if (isValidNumber) {
            accountData = ele;
            break;
          }
        } catch (error) {}
      }
      try {
        /// this condition only for if user give one account number consent then user go
        if (!accountData) {
          if (result.length === 1) {
            const ele = result[0];
            const accNumber = (ele?.maskedAccountNumber ?? '').toLowerCase();
            accountNumber = bank + accNumber;
            accountData = ele;
          }
        }
      } catch (error) {}
      if (!accountData) return k422ErrorMessage();
      const profileData = this.getAccountDetails(accountData, accountNumber);
      if (!profileData || profileData?.message) return profileData;
      profileData.bankCode = bank;
      const transactions: any = this.getAccountTransaction(
        accountData,
        accountNumber,
      );
      if (transactions?.message) return transactions;

      /// add data to banking pro
      const addedData: any = await this.addAADataToBankingPro(
        userId,
        transactions,
        profileData,
      );
      if (addedData?.message) return addedData;

      const filePath = await this.oneMoneyService.funGetPDF(
        consentID,
        accountData.linkReferenceNumber,
      );
      if (filePath?.message || !filePath) return kInternalError;

      if (regPanCard(profileData?.pan)) {
        const kycData = {
          userId: userId,
          pan: profileData?.pan,
          consentMode: kOneMoney,
        };
        await this.kycServiceV4.validatePan(kycData, true);
      }
      const eligibility = await this.validateEligibility({
        userId,
        accountDetails: profileData,
        filePath,
      });
      if (eligibility.message) return eligibility;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get account details
  getAccountDetails(data, accountNumber) {
    const profile = (data?.Profile?.Holders ?? {})?.Holder ?? [] ?? {};
    let profileData: any = { aaService: true, ...profile };
    const summary = data?.Summary ?? {};
    profileData.ifscCode = summary?.ifscCode;
    profileData.accountNumber = accountNumber;
    profileData.accountType = summary?.type;
    return profileData;
  }
  //#endregion

  //#region get account transaction
  getAccountTransaction(data, accountNumber) {
    try {
      const transaction = data ?? [];
      const finaldata = [];
      for (let index = 0; index < transaction.length; index++) {
        try {
          const ele = transaction[index];
          const temp: any = {};
          temp.accountId = accountNumber;
          temp.amount = Math.abs(+ele.amount);
          temp.balanceAfterTransaction = +ele.balance;
          temp.dateTime = ele.date + 'T10:00:00.000Z';
          temp.description = ele.narration;
          temp.type = ele.amount >= 0 ? 'CREDIT' : 'DEBIT';
          temp.isFraud = false;
          temp.category = ele.category;
          temp.transTime = ele.date + 'T10:00:00.000Z';
          finaldata.push(temp);
        } catch (error) {}
      }
      return finaldata;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region add data to banking pro
  async addAADataToBankingPro(userId, transactions, profileData) {
    // find company name and salary
    const options = { where: { userId } };
    const att = ['companyName', 'salary'];
    const empData = await this.empRepo.getRowWhereData(att, options);
    // add data to banking pro
    const body: any = { transactions, profileData };
    if (empData?.companyName) {
      body.companyName = empData?.companyName ?? '';
      body.salary = empData?.salary ?? '0';
    }
    // Validation -> API response
    const result = await this.authAiService.syncTransactions(body);
    if (result == k500Error || !result) throw new Error();
    if (!result.valid) throw new Error();

    return true;
  }
  //#endregion

  //#region find pending one money user this for cron api
  async findPendigOneMoneyUser() {
    try {
      const bankInclude: any = {
        model: BankingEntity,
        where: { consentMode: kOneMoney, salaryVerification: '4' },
        attributes: [],
      };
      const include = [bankInclude];
      const options = {
        order: [['id', 'DESC']],
        where: { loanStatus: 'InProcess' },
        include,
        limit: 30,
      };
      const att = ['id', 'userId'];
      const findList = await this.loanRepo.getTableWhereData(att, options);
      if (!findList || findList === k500Error) return kInternalError;
      for (let index = 0; index < findList.length; index++) {
        const ele = findList[index];
        try {
          await this.validateAA({ userId: ele.userId });
        } catch (error) {}
      }
      return findList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion
}
