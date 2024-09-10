// Imports
import { Injectable } from '@nestjs/common';
import {
  CAMS_FIU_ID,
  CAMS_REDIRECTION_KEY,
  CAMS_USER_ID,
} from 'src/constants/globals';
import { v4 as uuidv4 } from 'uuid';
import { k500Error } from 'src/constants/misc';
import {
  aaURL,
  kCamsDownloadData,
  kCAMSGetAuthToken,
  kCAMSGetConsentDetails,
  kCAMSInvitation,
  kManualFetch,
  nSyncAuthAiTransactions,
} from 'src/constants/network';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import {
  kAutomateResidenceRoute,
  kCibilAddressRoute,
  kGlobalTrail,
  kInAppAutomateResidenceRoute,
  kNoDataFound,
  kResidenceProofRoute,
  kSubmitResidenceProofRoute,
  kTypeAddressRoute,
} from 'src/constants/strings';
import { ResponseRepository } from 'src/repositories/response.repository';
import { FileService } from 'src/utils/file.service';
import { CRMPipelineStages, kBankingProHeaders } from 'src/constants/objects';
import { BankingService } from 'src/admin/banking/banking.service';
import { BankingServiceV4 } from 'src/v4/banking/banking.service.v4';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { BankingRepository } from 'src/repositories/banking.repository';
import { employmentDetails } from 'src/entities/employment.entity';
import { registeredUsers } from 'src/entities/user.entity';

@Injectable()
export class CamsServiceThirdParty {
  constructor(
    // Admin
    private readonly bankingAdminService: BankingService,
    // Repositories
    private readonly bankingRepo: BankingRepository,
    private readonly responseRepo: ResponseRepository,
    // Shared
    private readonly sharedNotification: SharedNotificationService,
    // Utils
    private readonly apiService: APIService,
    private readonly fileService: FileService,
    private readonly typeService: TypeService,
    // v3
    private readonly bankingService: BankingServiceV4,
    private readonly userService: UserServiceV4,
  ) {}

  async getAuthToken() {
    try {
      const url = kCAMSGetAuthToken;
      const body = {
        fiuID: CAMS_FIU_ID,
        redirection_key: CAMS_REDIRECTION_KEY,
        userId: CAMS_USER_ID,
      };
      const response = await this.apiService.post(url, body);
      if (response == k500Error) return kInternalError;
      return {
        sessionId: response.sessionId,
        token: 'Bearer ' + response.token,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async inviteForAA(phoneNumber, bankName) {
    try {
      const sessionData: any = await this.getAuthToken();
      if (sessionData['message']) return sessionData;

      const url = kCAMSInvitation;
      const body = {
        clienttrnxid: this.getUUID(),
        fiuID: CAMS_FIU_ID,
        userId: CAMS_USER_ID,
        aaCustomerHandleId: phoneNumber + `@CAMSAA`,
        aaCustomerMobile: phoneNumber,
        sessionId: sessionData.sessionId,
        useCaseid: '7',
        addfip: 'False',
        fipid: bankName,
        redirect: aaURL,
      };

      const response = await this.apiService.post(url, body, null, null, {
        headers: { Authorization: sessionData.token },
      });
      if (response == k500Error) return kInternalError;
      return {
        consentTxnId: response.clienttxnid,
        url: response.redirectionurl,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async getConsentDetails(consentId) {
    const yesterDay = new Date();
    yesterDay.setDate(yesterDay.getDate() - 1);
    const authData: any = await this.getAuthToken();

    const url = kCAMSGetConsentDetails;
    const body = {
      browser: 'chrome',
      clientIp: '0.0.0.0',
      consentStatus: 'ALL',
      fiuId: CAMS_FIU_ID,
      userId: CAMS_USER_ID,
      endDate: this.typeService.dateToJsonStr(new Date(), 'YYYY-MM-DD'),
      sessionId: authData.sessionId,
      startDate: this.typeService.dateToJsonStr(yesterDay, 'YYYY-MM-DD'),
      txnId: this.getUUID(),
    };

    const response = await this.apiService.post(url, body);
    if (response == k500Error) return kInternalError;

    const consentData =
      response.lst.find((el) => el.consentId == consentId) ?? {};
    if (!consentData) return { status: 'INITIALIZED' };
    return {
      response: JSON.stringify(consentData),
      status: consentData.status,
    };
  }

  async fetchData(consentId) {
    try {
      await this.typeService.delay(100);
      const url = kManualFetch;
      const body = {
        sessionId: await this.getSessionToken(),
        txnId: this.getUUID(),
        consentId,
        fiuID: CAMS_FIU_ID,
      };
      const response = await this.apiService.post(url, body);
      if (response == k500Error) return kInternalError;

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async downloadTransData(consentId, bankCode) {
    try {
      const authData: any = await this.getAuthToken();
      const url = kCamsDownloadData;
      const body = {
        browser: 'chrome',
        clientIp: '0.0.0.0',
        fiuId: CAMS_FIU_ID,
        userId: CAMS_USER_ID,
        sessionId: authData.sessionId,
        txnId: this.getUUID(),
      };

      const response: any = await this.apiService.post(url, body);
      if (response == k500Error) return kInternalError;
      const decryptedData = response.decryptData;
      if (!decryptedData) return kInternalError;
      const rawData = JSON.parse(decryptedData);
      const accData = rawData.Account;
      if (!accData) return kInternalError;
      return this.getAccSummary(accData, bankCode);
    } catch (error) {
      return kInternalError;
    }
  }

  private async getSessionToken() {
    try {
      const sessionData: any = await this.getAuthToken();
      if (sessionData['message']) return sessionData;

      return sessionData.sessionId;
    } catch (error) {}
  }

  private getAccSummary(accData: any, bankCode: string) {
    try {
      const profileData = accData.Profile?.Holders?.Holder ?? {};
      const maskAccNumber = bankCode.toLowerCase() + accData.maskedAccNumber;
      const summaryData = accData.Summary ?? {};
      profileData.accountNumber = maskAccNumber;
      profileData.ifscode = summaryData.ifscCode;
      profileData.accStatus = summaryData.status;
      profileData.accOpenedOn = summaryData.openingDate + kGlobalTrail;
      profileData.bankCode = bankCode;
      profileData.aaService = true;

      const rawTransactions = (accData.Transactions ?? {}).Transaction ?? [];
      const transactions = [];
      for (let index = 0; index < rawTransactions.length; index++) {
        try {
          const rawData = rawTransactions[index];
          let transId = rawData.txnId ?? '0';
          if (transId.length <= 4) transId = new Date().getTime().toString();
          const transaction: any = {};
          transaction.accountId = maskAccNumber;
          transaction.amount = +rawData.amount;
          transaction.balanceAfterTransaction = +rawData.currentBalance;
          transaction.dateTime = rawData.valueDate + kGlobalTrail;
          transaction.description = rawData.narration;
          transaction.type = rawData.type;
          transaction.isFraud = false;
          transaction.transactionId = 'CAMSAA' + transId;
          transaction.transTime = rawData.transactionTimestamp;
          transaction.source = 'CAMSAA';
          transaction.bank = bankCode;
          transactions.push(transaction);
        } catch (error) {}
      }
      return { profileData, transactions };
    } catch (error) {
      return kInternalError;
    }
  }

  private getUUID() {
    return uuidv4();
  }

  async syncData(data) {
    try {
      const custId = await this.saveWebhookResponse(JSON.stringify(data));
      if (custId?.message) return custId;

      let finalizedResponse: any = {};
      const purpose = data.purpose;
      if (purpose == 'ConsentStatusNotification') finalizedResponse = data;
      else if (purpose == 'Push_Data') {
        const rawPDFData = data.dataDetail?.pdfbase64;
        let profileData: any = { aaService: true };
        if (rawPDFData) {
          const pdfBase64 = JSON.parse(rawPDFData).replace(/"/g, '');
          const pdfURL = await this.fileService.base64ToURL(pdfBase64);
          data.pdfURL = pdfURL;

          const accData = data.dataDetail?.jsonData?.Account ?? {};
          const summaryData = accData.Summary;
          const userData = accData.Profile?.Holders?.Holder ?? {};
          const userAccData: any = await this.getAccDetails(data.clienttxnid);
          if (userAccData.message) return userAccData;
          profileData.ifscCode = summaryData.ifscCode ?? '';
          profileData.accountNumber = data.maskedAccountNumber.toLowerCase();
          profileData.isPreAccDetails = false;
          profileData.bankCode = this.getBankCode(profileData.ifscCode);
          if (userAccData && userAccData != k500Error) {
            const targetA = profileData.accountNumber
              .toLowerCase()
              .replace(/x/g, '');
            const targetB = userAccData.accountNumber.toLowerCase();
            if (targetB.includes(targetA)) {
              profileData.ifscCode = userAccData.ifsCode;
              profileData.accountNumber = userAccData.accountNumber;
              profileData.isPreAccDetails = true;
            } else profileData.isAccMismatch = true;
          }
          profileData = { ...profileData, ...userData };

          const rawTransactions =
            (accData.Transactions ?? {}).Transaction ?? [];
          const transactions = [];
          for (let index = 0; index < rawTransactions.length; index++) {
            try {
              const rawData = rawTransactions[index];
              let transId = rawData.txnId ?? '0';
              if (transId.length <= 4)
                transId = new Date().getTime().toString();
              const transaction: any = {};
              transaction.accountId = data.maskedAccountNumber;
              transaction.amount = +rawData.amount;
              transaction.balanceAfterTransaction = +rawData.currentBalance;
              transaction.dateTime = rawData.valueDate + 'T10:00:00.000Z';
              transaction.description = rawData.narration;
              transaction.type = rawData.type;
              transaction.isFraud = false;
              transaction.transactionId = 'CAMSAA' + transId;
              transaction.transTime = rawData.transactionTimestamp;
              transaction.source = 'CAMSAA';
              transactions.push(transaction);
            } catch (error) {}
          }
          let recentData = {
            balanceOfLastTrans: 0,
            recentBalance: 0,
            recentDate: 0,
            dateOfLastTrans: '',
            pdfURL: '',
          };
          if (transactions.length > 0) {
            const transaction = transactions[transactions.length - 1];
            recentData.balanceOfLastTrans =
              transaction.balanceAfterTransaction ?? 0;
            recentData.dateOfLastTrans = transaction.dateTime ?? '';
            recentData.pdfURL = pdfURL;
            recentData.recentDate = summaryData.balanceDateTime;
            recentData.recentBalance = +summaryData.currentBalance;
          }

          data.dataDetail = null;
          data.transactions = transactions;

          const body: any = { transactions, profileData };
          // Getting info of Salary and Company name for BankingPro
          const empData: any = await this.getEmpDetails(data.clienttxnid);
          if (empData.message) return empData;
          body.companyName = empData.companyName ?? '';
          body.salary = empData.salary ?? '0';

          // Sync balance logs (Currently using for defaulters and pre EMI check)
          try {
            const lastTransDate = recentData.dateOfLastTrans.substring(0, 10);
            const lastTransactionOn = Math.floor(
              new Date(lastTransDate + 'T10:00:00.000Z').getTime() / 1000,
            );
            const syncBalanceData = {
              balance: recentData.recentBalance,
              lastTransactionBalance: recentData.balanceOfLastTrans,
              bankingId: userAccData.id,
              statementUrl: pdfURL,
              lastTransactionOn,
            };
            await this.bankingAdminService.syncAABalance(syncBalanceData);
          } catch (error) {}

          // Sync transactions in bankingPro server
          const headers = kBankingProHeaders;
          const response = await this.apiService.requestPost(
            nSyncAuthAiTransactions,
            body,
            headers,
          );
          const authAiAccNo = response?.data?.accountDetails?.accountNumber;
          if (response == k500Error) return kInternalError;
          if (!response.data) return kInternalError;
          if (!response.data.valid) return kInternalError;
          data.transactions = null;
          finalizedResponse = {
            ...data,
            accountDetails: response.data.accountDetails,
            recentData,
          };
          const targetA = authAiAccNo.toLowerCase().replace(/x/g, '');
          const targetB = userAccData.accountNumber.toLowerCase();
          finalizedResponse.accountDetails.isAccMismatch =
            !targetB.includes(targetA);

          // Validating the finalized data same as bankingPro response
          const responseData = await this.bankingService.syncAAData(
            finalizedResponse,
          );
          if (responseData?.message) return responseData;
          if (data.needUserInfo) {
            const profileData = await this.userService.routeDetails({
              id: data.userId,
            });
            if (profileData?.message) return profileData;
            if (data?.notifyUser) {
              const notificationData = {
                userId: data.userId,
                userList: [data.userId],
                title: profileData.userData?.currentStepTitle ?? '',
                content: (profileData.userData?.currentStepInfo ?? '')
                  .replace(/\#/g, '')
                  .replace(/\*/g, ''),
              };
              await this.sharedNotification.sendNotificationToUser(
                notificationData,
              );
            }
            return {};
          }
          return {};
        }
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async saveWebhookResponse(data: any) {
    try {
      const reqData = JSON.parse(data);
      const type = reqData.purpose ?? 'UNKNOWN';
      const source = 'CAMS';
      let consentId = reqData.consentid;
      const clientTxnId = reqData.clienttxnid;
      if (clientTxnId) delete reqData.clienttxnid;
      const custId = reqData.customerId;
      if (consentId) delete reqData.consentid;
      if (custId) delete reqData.customerId;
      if (reqData.purpose) delete reqData.purpose;
      if (reqData.ver) delete reqData.ver;
      if (reqData.encryption == false) delete reqData.encryption;
      if (reqData.pan) delete reqData.pan;
      if (reqData.fipname) delete reqData.fipname;
      if (reqData.datarequested) delete reqData.datarequested;
      if (reqData.dataDetail) {
        if (reqData.dataDetail.pdfbase64) delete reqData.dataDetail.pdfbase64;
        if (reqData.dataDetail.pdfbinary == '')
          delete reqData.dataDetail.pdfbinary;
        if (reqData.dataDetail.xmlData == '') delete reqData.dataDetail.xmlData;
        if (reqData.dataDetail.jsonData?.Account?.Transactions)
          delete reqData.dataDetail.jsonData?.Account?.Transactions;
        if (reqData.dataDetail.jsonData?.Account?.['xsi:schemaLocation'])
          delete reqData.dataDetail.jsonData?.Account?.['xsi:schemaLocation'];
        if (reqData.dataDetail.jsonData?.Account?.['xmlns:xsi'])
          delete reqData.dataDetail.jsonData?.Account?.['xmlns:xsi'];
        if (reqData.dataDetail.jsonData?.Account?.['xmlns'])
          delete reqData.dataDetail.jsonData?.Account?.['xmlns'];
        if (reqData.dataDetail.jsonData?.['?xml'])
          delete reqData.dataDetail.jsonData?.['?xml'];
      }
      if (reqData.accRefNumber) delete reqData.accRefNumber;
      if (reqData.txnid) delete reqData.txnid;
      if (reqData.ConsentStatusNotification) {
        if (reqData.ConsentStatusNotification.consentId) {
          consentId = reqData.ConsentStatusNotification.consentId;
          delete reqData.ConsentStatusNotification.consentId;
        }
      }
      reqData.response = JSON.stringify(reqData);
      if (reqData.maskedAccountNumber) delete reqData.maskedAccountNumber;
      if (reqData.dataDetail) delete reqData.dataDetail;
      if (reqData.timestamp) delete reqData.timestamp;
      reqData.consentId = consentId;
      reqData.clientTxnId = clientTxnId;
      reqData.type = type;
      reqData.source = source;
      reqData.custId = custId;

      await this.responseRepo.createRowData(reqData);

      return custId;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getAccDetails(consentTxnId) {
    const attributes = ['accountNumber', 'bank', 'ifsCode'];
    const options = { order: [['id', 'DESC']], where: { consentTxnId } };

    const bankingData = await this.bankingRepo.getRowWhereData(
      attributes,
      options,
    );
    if (bankingData == k500Error) return kInternalError;
    if (!bankingData) return k422ErrorMessage(kNoDataFound);
    return bankingData;
  }

  private async getEmpDetails(consentTxnId) {
    const empInclude: any = { model: employmentDetails };
    empInclude.attributes = ['companyName', 'salary'];
    const userInclude: any = { model: registeredUsers };
    userInclude.attributes = ['id'];
    userInclude.include = [empInclude];
    const include = [userInclude];
    const attributes = ['id'];
    const options = { include, where: { consentTxnId } };

    const bankingData = await this.bankingRepo.getRowWhereData(
      attributes,
      options,
    );
    if (bankingData == k500Error) return kInternalError;
    if (!bankingData) return k422ErrorMessage(kNoDataFound);

    return bankingData.user?.employmentData ?? {};
  }

  private getBankCode(ifscCode) {
    try {
      let receivedCode = '';
      switch (ifscCode.substring(0, 4).toUpperCase()) {
        // AU small finance bank
        case 'AUBL':
          receivedCode = 'AU_SMALL_FINANCE_BANK';
          break;

        case 'FINF':
          receivedCode = 'AU_SMALL_FINANCE_BANK';
          break;

        // AXIS Bank
        case 'UTIB':
          receivedCode = 'AXIS';
          break;

        // Bank of baroda bank
        case 'BARB':
          receivedCode = 'BANK_OF_BARODA';
          break;

        // Canara bank
        case 'CNRB':
          receivedCode = 'CANARA';
          break;

        // City union bank
        case 'CIUB':
          receivedCode = 'CITY_UNION';
          break;

        // Federal bank
        case 'FDRL':
          receivedCode = 'FEDERAL';
          break;

        // ICICI Bank
        case 'ICIC':
          receivedCode = 'ICICI';
          break;

        // IndusInd Bank
        case 'INDB':
          receivedCode = 'INDUSIND';
          break;

        // IDFC Bank
        case 'IDFB':
          receivedCode = 'IDFC';
          break;

        // Indian overseas bank
        case 'IOBA':
          receivedCode = 'INDIAN_OVERSEAS';
          break;

        // HDFC Bank
        case 'HDFC':
          receivedCode = 'HDFC';
          break;

        // Punjab national bank
        case 'PUNB':
          receivedCode = 'PNB';
          break;

        // State bank of india
        case 'SBIN':
          receivedCode = 'SBI';
          break;

        // Union bank of india
        case 'UBIN':
          receivedCode = 'UNION_BANK';
          break;

        // YES Bank
        case 'YESB':
          receivedCode = 'YES';
          break;

        // KARNATAKA Bank
        case 'KARB':
          receivedCode = 'KARNATAKA';
          break;

        // Bank of India
        case 'BKID':
          receivedCode = 'BOI';
          break;

        // Indian Bank
        case 'IDIB':
          receivedCode = 'INDIAN_BANK';
          break;

        // Karnataka Vikas Grameena Bank
        case 'KVGB':
          receivedCode = 'KARNATAKA_VG';
          break;

        // Andhra Pragathi Grameena Bank
        case 'APGB':
          receivedCode = 'ANDHRA_PG';
          break;

        // NSDL Payments Bank
        case 'NSPB':
          receivedCode = 'NSDL';
          break;

        // HSBC Bank
        case 'HSBC':
          receivedCode = 'HSBC';
          break;

        default:
          break;
      }

      return receivedCode;
    } catch (error) {
      return kInternalError;
    }
  }
}
