// Imports
import { k500Error } from 'src/constants/misc';
import { HOST_URL } from 'src/constants/globals';
import {
  kFinvuAuthCheck,
  kFinvuDataRequest,
  kFinvuGetAuthToken,
  kFinvuHeaders,
  kFinvuRequestConsent,
  kFinvuStatusCheck,
  kFinvuTypeFetchData,
  kFrontendBaseURL,
  kfinvuBody,
  nFinvuFetchData,
} from 'src/constants/network';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCompleted,
  kFinvuRequestConsentDiscription,
  kFinvuRequestConsentTemplateName,
  kGlobalTrail,
  kNoDataFound,
  kfinvu,
} from 'src/constants/strings';
import { EnvConfig } from 'src/configs/env.config';
import { APIService } from 'src/utils/api.service';
import { BankList } from 'src/entities/bank.entity';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { regPanCard } from 'src/constants/validation';
import { CryptService } from 'src/utils/crypt.service';
import { FinvuEntity } from 'src/entities/finvu.entity';
import { KycServiceV4 } from 'src/v4/kyc/kyc.service.v4';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { BankingEntity } from 'src/entities/banking.entity';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { BankingServiceV4 } from 'src/v4/banking/banking.service.v4';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { loanTransaction } from 'src/entities/loan.entity';
@Injectable()
export class FinvuService {
  private authToken: string;
  constructor(
    @Inject(forwardRef(() => BankingServiceV4))
    private readonly bankingService: BankingServiceV4,
    private readonly kycService: KycServiceV4,
    // Utils
    private readonly apiService: APIService,
    private readonly crypt: CryptService,
    private readonly fileService: FileService,
    private readonly typeService: TypeService,
    // Database
    private readonly repo: RepositoryManager,
    // Shared services
    private readonly metricsService: MetricsSharedService,
    // V4 services
    private readonly userService: UserServiceV4,
  ) {}

  async getAuthToken() {
    const url = kFinvuGetAuthToken;
    const body = { header: kFinvuHeaders, body: kfinvuBody };
    const response = await this.apiService.post(url, body);
    if (response == k500Error) return kInternalError;
    this.authToken = 'Bearer: ' + response.body.token;
  }

  async ensureAuthToken() {
    const url = kFinvuAuthCheck;
    if (typeof this.authToken === 'undefined') {
      await this.getAuthToken();
      return;
    }
    const data = await this.apiService.get(
      url,
      null,
      {
        Authorization: this.authToken,
      },
      { timeout: 3500 },
    );
    if (!data || data.statusCode == 401 || data === k500Error)
      await this.getAuthToken();
  }

  async inviteForAA(reqData: any) {
    // Set auth token
    await this.ensureAuthToken();

    // Params validation
    const userId = reqData.userId;
    const custId = reqData.custId;
    const pan = reqData.pan;
    if (!pan) return kParamMissing('pan');
    if (!custId) return kParamMissing('custId');
    if (!userId) return kParamMissing('userId');
    const bankCode = reqData.bankCode;
    if (!bankCode) return kParamMissing('bankCode');

    // Preparation -> API
    const url = kFinvuRequestConsent;
    const body = {
      custId: `${custId}@finvu`,
      consentDescription: kFinvuRequestConsentDiscription,
      templateName: kFinvuRequestConsentTemplateName,
      userSessionId: userId,
      redirectUrl: `${HOST_URL}thirdParty/finvu/consentNotification`,
      fip: [],
      ConsentDetails: {},
      pan,
    };
    // API hit
    const response = await this.apiService.post(
      url,
      { header: kFinvuHeaders, body },
      null,
      null,
      { headers: { Authorization: this.authToken } },
    );
    if (response == k500Error) throw new Error();

    return {
      consentHandle: response.body.ConsentHandle,
      url:
        kFrontendBaseURL +
        `finvu/?mobileNumber=${custId}&handleId=${response.body.ConsentHandle}&bankCode=${bankCode}&userId=${reqData.userId}&loanId=${reqData.loanId}&fetchAllBanks=false`,
    };
  }

  async callback(reqData) {
    const creationData = { data: reqData ?? {}, type: 2, subType: 1 };
    await this.repo.createRowData(FinvuEntity, creationData);

    // Validation -> Parameters
    const status = reqData.status;
    if (!status) return kParamMissing('status');
    const accounts = reqData.accounts;
    if (!accounts) return kParamMissing('accounts');
    const consentHandle = reqData.consentHandle;
    if (!consentHandle) return kParamMissing('consentHandle');
    const dataSessionId = reqData.dataSessionId;
    if (!dataSessionId) return kParamMissing('dataSessionId');

    // Sync new data
    for (let index = 0; index < accounts.length; index++) {
      // Independent iterations
      try {
        const accData = accounts[index];
        if (accData.status !== 'READY') continue;
        const linkRefNumber = accData.linkRefNumber;
        if (!linkRefNumber) continue;
        // Fetch data and syncs to banking pro
        await this.syncLinkRefData({
          consentHandle,
          dataSessionId,
          linkRefNumber,
          callbackData: reqData,
        });
      } catch (error) {}
    }
    return {};
  }

  // Total #07 steps
  private async syncLinkRefData(reqData) {
    // #01 -> Get bank data
    const bankingData = await this.getRelevantBankData(
      reqData.consentHandle,
      reqData.callbackData,
    );
    if (bankingData?.message) return bankingData;
    reqData.primaryAccNumber = bankingData.accountNumber;
    reqData.consentPhone = bankingData.consentPhone;
    reqData.userId = bankingData.userId;
    reqData.loanId = bankingData.loanId;

    // #02 -> Get raw data
    const rawLinkRefData = await this.fetchData(reqData);
    reqData.accProfileData = rawLinkRefData.accProfileData;
    reqData.bankCode = rawLinkRefData.reqData;
    if (rawLinkRefData?.message) return rawLinkRefData;

    // #03 -> Create -> Metrics
    await this.metricsService.insertLog({
      loanId: bankingData.loanId,
      type: 1,
      subType: 2,
      status: 2,
      userId: bankingData.userId,
      values: {
        activity: 'CALLBACK_AA',
        referenceId: reqData.consentHandle,
        subReferenceId: reqData.linkRefNumber,
        source: 'FINVU',
      },
    });

    // #04 -> Sync data to banking pro
    await this.bankingService.addAADataToBankingPro(
      bankingData.userId,
      rawLinkRefData.bankingProTransactions,
      rawLinkRefData.accProfileData,
    );

    // #05 -> Validate pan card
    if (regPanCard(rawLinkRefData.accProfileData?.pan)) {
      const kycData = {
        userId: bankingData.userId,
        pan: rawLinkRefData.accProfileData?.pan,
        consentMode: kfinvu,
      };
      await this.kycService.validatePan(kycData, true);
    }

    // #06 -> Get bank statement PDF for admin
    reqData.pdf = true;
    const rawLinkRefPDF = await this.fetchData(reqData);

    // #07 -> Validate banking route for primary account
    const salaryVerification = bankingData.salaryVerification ?? '-1';
    if (rawLinkRefData.accNumberMatched === true) {
      if (['1', '3', '0'].includes(salaryVerification)) return {};

      // Update bankingData
      const consentResponse = JSON.stringify({
        fetchedOn: new Date().toJSON(),
        linkRefNumber: reqData.linkRefNumber,
      });
      const updatedData = {
        aaDataStatus: 3,
        consentResponse,
      };
      const updatedResponse = await this.repo.updateRowData(
        BankingEntity,
        updatedData,
        bankingData.id,
      );
      if (updatedResponse === k500Error) throw new Error();

      const eligibility = await this.bankingService.validateEligibility({
        userId: bankingData.userId,
        accountDetails: rawLinkRefData.accProfileData,
        filePath: rawLinkRefPDF,
      });
      if (eligibility?.needUserInfo === true) {
        // Create -> Metrics
        await this.metricsService.insertLog({
          loanId: bankingData.loanId,
          type: 1,
          subType: 2,
          status: 3,
          userId: bankingData.userId,
          values: {
            activity: kCompleted,
            referenceId: reqData.consentHandle,
            subReferenceId: reqData.linkRefNumber,
            source: kfinvu,
          },
        });
        await this.userService.routeDetails({ id: bankingData.userId });
      }
    }

    return {};
  }

  private async getRelevantBankData(consentHandleId, callbackData) {
    // Preparation -> Query
    const bankAttr = [
      'accountNumber',
      'consentPhone',
      'id',
      'loanId',
      'salaryVerification',
      'userId',
    ];
    const bankOptions = { order: [['id', 'DESC']], where: { consentHandleId } };

    // Hit -> Query
    const bankingData = await this.repo.getRowWhereData(
      BankingEntity,
      bankAttr,
      bankOptions,
    );
    // Validation -> Query data
    if (!bankingData) {
      // Hit -> API (UAT callback)
      if (EnvConfig.isProd) {
        const url =
          EnvConfig.network.uatURL + 'thirdParty/finvu/consent/notification';
        await this.apiService.post(url, callbackData);

        return {};
      } else return k422ErrorMessage(kNoDataFound);
    }
    if (bankingData === k500Error) throw new Error();

    bankingData.consentPhone = this.crypt.decryptPhone(
      bankingData.consentPhone,
    );
    return bankingData;
  }

  async fetchData(reqData) {
    // Set -> Auth token
    await this.ensureAuthToken();

    // Preparation -> API
    const url = `${nFinvuFetchData}/${reqData.consentHandle}/${reqData.dataSessionId}?linkRefNumber=${reqData.linkRefNumber}`;
    const headers = { Authorization: this.authToken };
    const config: any = {};
    if (reqData.pdf === true) {
      config.responseType = 'stream';
      headers[`Accept`] = `application/pdf`;
    }
    // Hit -> API
    const response = await this.apiService.get(url, null, headers, config);
    // Validation -> API
    if (response === k500Error) throw new Error();
    // Convert pdf to url
    if (reqData.pdf === true)
      return await this.fileService.streamToURL(response, null, 'stream');
    else {
      // Keep data -> Finvu entity
      const creationData = {
        data: response,
        loanId: reqData.loanId,
        type: 2,
        subType: 2,
        userId: reqData.userId,
      };
      await this.repo.createRowData(FinvuEntity, creationData);

      const body = response.body[0];

      // Get bank code
      const fipId = body.fipId;
      const bankAttr = ['bankCode'];
      const bankOptions = { where: { fipName: fipId } };
      const bankData = await this.repo.getRowWhereData(
        BankList,
        bankAttr,
        bankOptions,
      );
      if (bankData === k500Error) throw new Error();
      if (!bankData) return k422ErrorMessage(kNoDataFound);
      body.bankCode = bankData.bankCode;

      // Prepare profile data for banking pro
      const fiObject = body.fiObjects[0];
      const profile = (fiObject?.Profile?.Holders ?? {})?.Holder ?? [] ?? {};
      const profileData = {
        aaService: true,
        ...profile,
        bank: body.bankCode,
        bankCode: body.bankCode,
      };
      const summary = fiObject?.Summary ?? {};
      profileData.ifscCode = summary?.ifscCode;
      profileData.accountType = summary?.type;
      body.accProfileData = profileData;

      // Account number
      const accNumber: string = fiObject.maskedAccNumber;
      const accNumberTail = accNumber.substring(accNumber.length - 4);
      const primaryAccNumber: string = reqData.primaryAccNumber ?? '';
      const primaryAccNumberTail = primaryAccNumber.substring(
        primaryAccNumber.length - 4,
      );
      const accNumberMatched = primaryAccNumberTail === accNumberTail;

      // Adding try catch as this is optional operation
      try {
        let balanceFetchDate: any =
          new Date(fiObject?.Summary?.balanceDateTime).toJSON() ?? new Date();
        if (accNumberMatched && reqData?.loanId) {
          await this.repo.updateRowData(
            loanTransaction,
            {
              currentAccountBalance: fiObject?.Summary?.currentBalance ?? 0,
              balanceFetchDate,
            },
            reqData.loanId,
          );
        }
      } catch (error) {}

      body.accNumberMatched = accNumberMatched;
      // Fine tune transactions for banking pro
      const accId = accNumberMatched
        ? primaryAccNumber
        : reqData.consentPhone + '_' + accNumber;
      body.accProfileData.accountNumber = accId;

      // Sync bank transactions
      const bankingProTransactions = [];
      for (
        let index = 0;
        index < fiObject.Transactions.Transaction.length;
        index++
      ) {
        try {
          const ele = fiObject.Transactions.Transaction[index];
          const transaction: any = {};
          transaction.accountId = accId;
          transaction.bank = profileData.bank;
          transaction.amount = +ele.amount;
          transaction.balanceAfterTransaction = +ele.currentBalance;
          transaction.dateTime = ele.valueDate + kGlobalTrail;
          transaction.description = ele.narration;
          transaction.type = ele.type;
          transaction.isFraud = false;
          transaction.transTime = ele.valueDate + kGlobalTrail;
          bankingProTransactions.push(transaction);
        } catch (error) {}
      }
      body.bankingProTransactions = bankingProTransactions;

      return body;
    }
  }

  async checkConsentStatus(consentHandleId, custId, count = 0) {
    // Set auth token
    await this.ensureAuthToken();

    // Preparation -> API
    const url = `${kFinvuStatusCheck}/${consentHandleId}/${custId}`;
    const headers = { Authorization: this.authToken };
    // Hitting -> API
    const response = await this.apiService.get(url, {}, headers);
    // Validation -> API response
    if (response === k500Error || !response.body) throw new Error();

    // Re-check in case of status is requested
    if (response.body?.consentStatus === 'REQUESTED' && count < 10) {
      count++;
      await this.typeService.delay(1000);
      return await this.checkConsentStatus(consentHandleId, custId, count);
    }

    return response.body;
  }

  async fetchDataRequest(custId, consentId, consentHandleId) {
    // Set auth token
    await this.ensureAuthToken();

    // Preparation -> API
    const url = kFinvuDataRequest;
    const todayDate = new Date();
    const fromDate = new Date(todayDate);
    fromDate.setMonth(todayDate.getMonth() - 6);
    const body = {
      header: kFinvuHeaders,
      body: {
        custId: `${custId}@finvu`,
        consentId,
        consentHandleId,
        dateTimeRangeFrom: fromDate,
        dateTimeRangeTo: todayDate,
      },
    };
    const options = { headers: { Authorization: this.authToken } };
    // Hitting -> API
    const response = await this.apiService.post(url, body, null, null, options);
    // Validation -> API response
    if (response === k500Error || !response.body.sessionId) throw new Error();
    return response.body.sessionId;
  }

  private async getBSATransactionSummary(reqData) {
    // Set -> Auth token
    await this.ensureAuthToken();

    // Preparation -> API
    const url = `${kFinvuTypeFetchData}/${reqData.consentHandle}/${reqData.dataSessionId}/${reqData.linkRefNumber}`;
    const headers = { Authorization: this.authToken };

    // Hit -> API
    const response = await this.apiService.get(url, {}, headers);
    // Validation -> API response
    if (response === k500Error) throw new Error();

    const body = response.body;

    // Account number
    const accNumber: string = body.accountXns[0].accountNo;
    const accNumberTail = accNumber.substring(accNumber.length - 4);
    const primaryAccNumber: string = reqData.primaryAccNumber ?? '';
    const primaryAccNumberTail = primaryAccNumber.substring(
      primaryAccNumber.length - 4,
    );
    const accNumberMatched = primaryAccNumberTail === accNumberTail;
    body.accNumberMatched = accNumberMatched;

    // Fine tune transactions for banking pro
    const rawTransactions = response.body.accountXns[0]?.xns;
    const bankingProTransactions = [];
    const accId = accNumberMatched
      ? primaryAccNumber
      : reqData.consentPhone + '_' + accNumber;

    for (let index = 0; index < rawTransactions.length; index++) {
      try {
        const ele = rawTransactions[index];
        const transaction: any = {};
        transaction.accountId = accId;
        transaction.bank = reqData.accProfileData.bank;
        transaction.amount = Math.abs(+ele.amount);
        transaction.balanceAfterTransaction = +ele.balance;
        transaction.dateTime = ele.date + kGlobalTrail;
        transaction.description = ele.narration;
        transaction.type = ele.amount >= 0 ? 'CREDIT' : 'DEBIT';
        transaction.isFraud = false;
        transaction.category = ele.category;
        transaction.transTime = ele.date + kGlobalTrail;
        bankingProTransactions.push(transaction);
      } catch (error) {}
    }
    body.bankingProTransactions = bankingProTransactions;
    body.bankingProProfile = reqData.accProfileData;
    body.bankingProProfile.accountNumber = accId;

    // Keep data -> Finvu entity
    const creationData = {
      data: response,
      loanId: reqData.loanId,
      type: 2,
      subType: 3,
      userId: reqData.userId,
    };
    await this.repo.createRowData(FinvuEntity, creationData);
  }
}
