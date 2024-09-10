// Imports
import { Injectable } from '@nestjs/common';
import {
  APPLICATION_ID_MANDATE,
  gIsPROD,
  REMANDATEDAYS,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { CF_SUBSCRIPTION, signdesk_mandate_check } from 'src/constants/network';
import { CASHFREE_HEADERS, kDevBankAccs } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCashfree,
  kEMandateService,
  kNoDataFound,
  kRazorpay,
  kSigndesk,
  vMandate,
} from 'src/constants/strings';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { CommonSharedService } from './common.shared.service';
import { Op, Sequelize } from 'sequelize';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class MandateSharedService {
  constructor(
    private readonly bankingRepo: BankingRepository,
    private readonly cryptService: CryptService,
    private readonly cfService: CashFreeService,
    private readonly loanRepo: LoanRepository,
    private readonly masterRepo: MasterRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly razorpayService: RazorpoayService,
    private readonly repository: SubscriptionRepository,
    private readonly sdService: SigndeskService,
    private readonly api: APIService,
    private readonly commonSharedService: CommonSharedService,
    private readonly typeService: TypeService,
    private readonly redisService: RedisService,
  ) {}

  async generateLink(reqData) {
    try {
      const bankingId = reqData.bankingId;
      if (!bankingId) return kParamMissing('bankingId');
      let mode = reqData?.mode ?? null;
      if (!mode)
        mode = await this.commonSharedService.getServiceName(kEMandateService);

      const preparedData: any = await this.prepareDataForLinkGeneration(
        bankingId,
      );

      if (preparedData?.message) return preparedData;

      // Create new mandate request
      if (!preparedData.isExist) {
        let mandateResponse: any = {};
        // Mandate via cashfree service
        if (mode == kCashfree) {
          mandateResponse = await this.cfService.createSubscription(
            preparedData,
          );
        } // Mandate via razorpay service
        else if (mode === kRazorpay) {
          mandateResponse = await this.razorpayService.initForMandate(
            preparedData,
          );
        }
        if (mandateResponse?.message) return mandateResponse;
        const creationData = {
          ...mandateResponse,
          userId: preparedData.userId,
        };
        const createdData = await this.repository.createRowData(creationData);
        if (createdData == k500Error) return kInternalError;

        const subscriptionId = createdData.id;
        let updatedData: any = {};

        // Update loan data
        updatedData = { subscriptionId };
        let updateResult = await this.loanRepo.updateRowData(
          updatedData,
          preparedData.loanId,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update master data
        updatedData = { status: preparedData.statusData };
        updatedData.status.eMandate = 0;
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          preparedData.masterId,
        );
        if (updateResult == k500Error) return kInternalError;

        const key = `${preparedData.loanId}_BANKDATABYLOANID`;
        await this.redisService.del(key);
      }

      return {};
    } catch (error) {
      console.log({ error });
    }
  }

  private async prepareDataForLinkGeneration(bankingId) {
    try {
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['email', 'fullName', 'id', 'masterId', 'phone'];
      userInclude.include = [masterInclude];
      const include = [userInclude];
      const attributes = ['loanId', 'mandateAccount', 'mandateIFSC'];
      const options = { include, where: { id: bankingId } };
      const bankingData = await this.bankingRepo.getRowWhereData(
        attributes,
        options,
      );
      if (bankingData == k500Error) return kInternalError;
      if (!bankingData) return k422ErrorMessage(kNoDataFound);

      const masterData = bankingData.user?.masterData ?? {};
      const statusData = masterData.status ?? {};
      if (statusData.bank != 1 && statusData.bank != 3)
        return k422ErrorMessage('Salary verification is not approved yet');

      const accountNumber = bankingData.mandateAccount;
      const ifscCode = bankingData.mandateIFSC;
      const userId = bankingData.user?.id;
      await this.getOldneedUpdate(accountNumber, userId);
      const existingData: any = await this.checkExistingData(
        accountNumber,
        userId,
      );
      if (existingData?.message) return existingData;

      return {
        ...existingData,
        accountNumber,
        ifscCode,
        name: bankingData.user?.fullName,
        phone: this.cryptService.decryptPhone(bankingData.user?.phone),
        email: bankingData.user?.email,
        userId,
        loanId: bankingData.loanId,
        masterId: bankingData.user?.masterId,
        statusData,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region
  private async getOldneedUpdate(accountNumber, userId) {
    try {
      const attributes = ['accountNumber', 'id'];
      const options = { where: { accountNumber, userId } };
      const subscriptionData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (subscriptionData === k500Error) return kInternalError;
      if (subscriptionData?.id) {
        const att = ['id'];
        const opt = {
          where: { loanStatus: 'Active', subscriptionId: subscriptionData.id },
        };
        const findActiveLoan = await this.loanRepo.getRowWhereData(att, opt);
        if (findActiveLoan == k500Error) return kInternalError;
        if (findActiveLoan?.id) return k422ErrorMessage('Loan is active');
        const newAccountNumber = accountNumber + 'OLD' + new Date().getTime();
        const update = { accountNumber: newAccountNumber };
        await this.repository.updateRowData(update, subscriptionData.id);
      }
    } catch (error) {}
  }
  //#endregion

  private async checkExistingData(accountNumber, userId) {
    try {
      const attributes = ['accountNumber', 'id'];
      const options = { where: { accountNumber } };
      const subscriptionData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (subscriptionData == k500Error) return kInternalError;
      if (!subscriptionData) return { isExist: false };
      if (subscriptionData && userId != subscriptionData.userId) {
        // By passing the developer accounts
        if (kDevBankAccs.includes(subscriptionData.accountNumber)) {
          const tail = '-' + new Date().getTime().toString();
          const updatedData = {
            accountNumber: subscriptionData.accountNumber + tail,
          };
          const updateResult = await this.repository.updateRowData(
            updatedData,
            subscriptionData.id,
          );
          if (updateResult == k500Error) return kInternalError;
          return { isExist: false };
        }
      }
      return { isExist: true };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkStatusOnModes(subscriptionData: any) {
    try {
      const mandateId = subscriptionData?.id;
      const mode = subscriptionData.mode;
      const refId = subscriptionData.referenceId;
      const accountNumber = subscriptionData?.accountNumber;
      if (mode == kCashfree) {
        const response = await this.cfService.getSubscriptionStatus(refId);
        if (response.message) return response;
        const status = response?.status;
        if (status === 'ACTIVE' || status === 'BANK_APPROVAL_PENDING') {
          const reAN = response?.bankAccountNumber ?? '';
          if (accountNumber && reAN) {
            if (accountNumber.includes(reAN) || reAN.includes(accountNumber))
              return {
                status: response.status,
                response: JSON.stringify(response),
                umrn: response.umrn,
                isRegistered:
                  response.status == 'ACTIVE' ||
                  response.status == 'BANK_APPROVAL_PENDING',
              };
          }
        } else
          return {
            status: response.status,
            response: JSON.stringify(response),
            umrn: response.umrn,
            isRegistered:
              response.status == 'ACTIVE' ||
              response.status == 'BANK_APPROVAL_PENDING',
          };

        return k422ErrorMessage();
      } else if (mode == kRazorpay)
        return await this.razorpayService.checkOrderStatus(refId, mandateId);
      else if (mode == 'SIGNDESK') {
        const response = await this.sdService.checkSubscriptionStatus(refId);
        if (response['message']) return k422ErrorMessage(response['message']);
        return response;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkExistingStatus(
    id: number,
    isInitiated?: boolean,
    accountNumber?: string,
    userId?: string,
    netApprovedAmount?: number,
  ) {
    try {
      // Get data
      const attributes = [
        'createdAt',
        'id',
        'initiatedOn',
        'invitationLink',
        'mode',
        'referenceId',
        'status',
        'userId',
        'response',
      ];
      const options = { where: !userId ? { id } : { userId, accountNumber } };
      const existingData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return k500Error;
      //No existing data
      if (!existingData) return;
      if (netApprovedAmount) {
        // Check limit for old users and redo mandate if limit is not 200000 rupees
        const oldMandateRes = JSON.parse(existingData?.response);
        let existingMaxAmt =
          oldMandateRes?.token?.max_amount ?? // RazorPay
          oldMandateRes?.notes?.max_amount ?? // RazorPay
          oldMandateRes?.maxAmount; // Cashfree
        if (existingData?.mode == kRazorpay)
          existingMaxAmt = existingMaxAmt / 100;
        if (existingMaxAmt === 99999) existingMaxAmt = 100000;
        if (
          (netApprovedAmount > 50000 && existingMaxAmt === 100000) ||
          (netApprovedAmount > 100000 &&
            (existingMaxAmt === 200000 || existingMaxAmt === 100000))
        ) {
          const tail = '-' + new Date().getTime().toString();
          let MandateAccount = null;
          if (existingData?.mode === kRazorpay) {
            MandateAccount = oldMandateRes?.token?.bank_account?.account_number;
          }
          if (existingData?.mode === kCashfree) {
            MandateAccount = oldMandateRes?.bankAccountNumber;
          }
          const updatedData = {
            accountNumber: MandateAccount + tail,
          };
          const updateResult = await this.repository.updateRowData(
            updatedData,
            existingData?.id,
          );
          if (updateResult == k500Error) return kInternalError;
          return;
        }
      }

      if (existingData.mode == kRazorpay) {
        const mandateId = existingData?.id;
        const response: any = await this.razorpayService.checkOrderStatus(
          existingData.referenceId,
          mandateId,
        );
        if (response.message) return response;
        return existingData;
      } else if (existingData.mode === 'CASHFREE') {
        //Check new update
        const url = CF_SUBSCRIPTION + '/' + existingData.referenceId;
        const headers = CASHFREE_HEADERS;
        const response = await this.api.get(url, null, headers);

        if (response == k500Error) return k500Error;
        if (response.status == 'OK' && response.subscription) {
          const status = response.subscription.status;
          const umrn = response.subscription.umrn;
          let expireDate = response?.subscription?.expiryDate;
          if (status) {
            //Update data
            const updatedData: any = { status };
            if (expireDate) {
              expireDate = this.typeService.getGlobalDate(expireDate).toJSON();
              updatedData.mandateExpireDate = expireDate;
            }
            if (umrn) updatedData.umrn = umrn;
            else if (isInitiated) updatedData.initiatedOn = new Date();
            const result = await this.repository.updateRowData(
              updatedData,
              existingData.id,
            );
            if (result == k500Error && gIsPROD) return kInternalError;
            existingData.status = status;
            //No need to reveal referenceId on frontend side
            delete existingData.referenceId;
            return existingData;
          } else return k500Error;
        } else return k500Error;
      } else if (existingData.mode === 'SIGNDESK') {
        const response = await this.sdService.checkMandateStatus(
          existingData.referenceId,
        );
        if (response.message) return response;
        // Check valid response
        return await this.checkNHandleSDStatusRes(response, existingData);
      } else return kInternalError;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  private async checkNHandleSDStatusRes(responseData, existingData) {
    try {
      if (responseData.status !== 'success') return k500Error;
      const status = responseData?.mandate_status;
      if (!status) return k500Error;
      const updatedData: any = { status };
      const umrn = responseData?.umrn;
      if (umrn) updatedData.umrn = umrn;

      const result = await this.repository.updateRowData(
        updatedData,
        existingData.id,
      );
      if (result == k500Error) return k500Error;
      existingData.status = status;
      // No need to reveal referenceId on frontend side
      delete existingData.referenceId;
      return existingData;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  async autoDeleteMandate(createdDate, loadId) {
    const diffMinutes = this.typeService.dateDifference(
      createdDate,
      new Date(),
      'Minutes',
    );
    if (diffMinutes >= 15) {
      return await this.deleteMandate(loadId, SYSTEM_ADMIN_ID);
    }
    return true;
  }

  async deleteMandate(loanId, adminId?) {
    try {
      const subscritpionInlude = {
        model: SubScriptionEntity,
        attributes: ['id', 'referenceId', 'mode', 'status'],
      };
      const masterAttr = ['id', 'status', 'loanId', 'userId'];
      const masterOps: any = { where: { loanId } };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'mandateAttempts'],
        include: [subscritpionInlude],
      };
      masterOps.include = [loanInclude];
      const masterData = await this.masterRepo.getRowWhereData(
        masterAttr,
        masterOps,
      );
      if (masterData === k500Error || !masterData) return kInternalError;
      const loanData = masterData.loanData;
      const mandateData = loanData.subscriptionData;
      const referenceId = mandateData?.referenceId;
      const mode = mandateData?.mode;
      const mandateId = mandateData?.id;
      let checkMandateStatus: any = {};
      if (mode == kRazorpay)
        checkMandateStatus = await this.razorpayService.checkOrderStatus(
          referenceId,
          mandateId,
        );
      if (mandateData?.status == 'FAILED') {
        if (checkMandateStatus.status == 'ACTIVE') {
          await this.repository.updateRowData(checkMandateStatus, mandateId);
          await this.masterRepo.updateRowData(
            { status: Object.assign(masterData.status, { eMandate: 1 }) },
            masterData?.id,
          );
          return true;
        }
      } else if (mode == kCashfree)
        checkMandateStatus = await this.cfService.checkCFSubscriptionStatus(
          referenceId,
        );
      else if (mode === kSigndesk) {
        const headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-parse-application-id': APPLICATION_ID_MANDATE,
          'x-parse-rest-api-key': process.env.REST_API_KEY_MANDATE,
        };
        const mandateCheckSDBody = { emandate_id: referenceId };
        const response = await this.api.post(
          signdesk_mandate_check,
          mandateCheckSDBody,
          headers,
        );
        if (response === k500Error) return kInternalError;
        if (response?.status !== 'success') return kInternalError;
        const status = response?.mandate_status;
        if (!status) return kInternalError;
        if (status === 'Registered') checkMandateStatus.isRegistered = true;
      }
      // else {
      //   return k422ErrorMessage(
      //     'Mandate can not get deleted before it get fails',
      //   );
      // }

      if (checkMandateStatus?.message) return checkMandateStatus;
      if (checkMandateStatus?.isRegistered) return kBadRequest;
      if (!mandateId) return kBadRequest;

      const mandateAttempts = (loanData?.mandateAttempts ?? 0) + 1;
      const options = { subscriptionId: mandateId };
      const updatedData = { subscriptionId: null, mandateAttempts };
      const updateResult = await this.loanRepo.updateWhere(
        updatedData,
        loanData?.id,
        options,
      );
      if (updateResult === k500Error || updateResult[0] <= 0)
        return kInternalError;
      const statusData = masterData.status;
      statusData.eMandate = -1;
      const updateData = { status: statusData };
      const updateMaster = await this.masterRepo.updateRowData(
        updateData,
        masterData?.id,
      );
      if (updateMaster === k500Error || updateMaster[0] <= 0)
        return kInternalError;
      const deleteMandate = await this.repository.deleteRowData(mandateId);
      if (deleteMandate === k500Error) return kInternalError;
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region check previos mandates  is exprired or not which is 365 days ago created
  async checkPreviousMandates(userList) {
    try {
      const att = [
        'id',
        'userId',
        'accountNumber',
        'createdAt',
        'mandateExpireDate',
      ];
      const today = new Date();
      const options = {
        where: {
          userId: userList,
          [Op.and]: [Sequelize.literal(`LENGTH("accountNumber") < 20`)],
        },
      };
      const result = await this.repository.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      if (result.length > 0) {
        for (let index = 0; index < result.length; index++) {
          try {
            const ele = result[index];
            const subscriptionId = ele.id;
            const userId = ele.userId;
            const diff = this.typeService.dateDifference(today, ele?.createdAt);
            let expireDate: any;
            if (ele?.mandateExpireDate) {
              expireDate = this.typeService.getGlobalDate(
                ele.mandateExpireDate,
              );
              expireDate = expireDate.getTime();
            }
            if (
              (diff > REMANDATEDAYS || expireDate <= today.getTime()) &&
              !ele?.accountNumber.includes('EXPIRED')
            ) {
              const accountNumber =
                ele?.accountNumber + '-EXPIRED-' + today.getTime();
              const update = { accountNumber };
              await this.repository.updateRowData(update, subscriptionId);
              continue;
            }
            const failedResponse = [
              { response: { [Op.iRegexp]: 'Account Blocked/Frozen' } },
              { response: { [Op.iRegexp]: 'ACCOUNT CLOSED' } },
              { response: { [Op.iRegexp]: 'Payment Stopped by Drawer' } },
              { response: { [Op.iRegexp]: 'MANDATE NOT RECEIVED' } },
              {
                response: { [Op.iRegexp]: 'INVALID UMRN OR INACTIVE MANDATE' },
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
              { response: { [Op.iRegexp]: 'debit_instrument_blocked' } },
              { response: { [Op.iRegexp]: 'mandate_not_active' } },
              { response: { [Op.iRegexp]: 'bank_account_invalid' } },
              { response: { [Op.iRegexp]: 'adNotPlaced' } },
            ];
            const loanInclude = {
              model: loanTransaction,
              where: { subscriptionId },
            };
            const transOpts = {
              where: {
                status: 'FAILED',
                userId,
                [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
                [Op.and]: [{ [Op.or]: failedResponse }],
              },
              include: [loanInclude],
            };
            //get adNotPlaced transaction count
            const failedTrans = await this.transactionRepo.getCountsWhere(
              transOpts,
            );
            if (failedTrans === k500Error) return kInternalError;
            if (failedTrans !== 0 && !ele?.accountNumber.includes('STOPED')) {
              const updated: any = {};
              updated.accountNumber =
                ele?.accountNumber + 'STOPED' + new Date().getTime();
              await this.repository.updateRowData(updated, subscriptionId);
            }
          } catch (error) {}
        }
        return true;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
