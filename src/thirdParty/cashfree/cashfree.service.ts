import { Injectable } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';
import {
  CF_CALLBACK_URL,
  gIsPROD,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  CF_CHARGE,
  CF_CHECK_PAYOUT_URL,
  CF_ORDER,
  CF_ORDER_CHECK,
  CF_PAYOUT_URL,
  CF_SUBSCRIPTION,
  kFrontendBaseURL,
  nPaymentCheckoutURL,
} from 'src/constants/network';
import {
  CASHFREE_BANK_LIST,
  CASHFREE_HEADERS,
  CASHFREE_HEADERS_V2,
} from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { kCashfree } from 'src/constants/strings';
import { LoanRepository } from 'src/repositories/loan.repository';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class CashFreeService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly loanRepo: LoanRepository,
  ) {}

  async createSubscription(data: any) {
    try {
      const accountNumber = data.accountNumber;
      let userName = data.name ?? data.fullName;
      let userId = data.id;
      let loanId = data.loanId;
      let planId = '2lakhmandate';
      const options = { where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(
        ['netApprovedAmount'],
        options,
      );
      const netApprovedAmt = loanData?.netApprovedAmount;
      if (netApprovedAmt > 5000 && netApprovedAmt <= 50000)
        planId = '1lakhmandate';
      else if (netApprovedAmt > 50000 && netApprovedAmt <= 100000)
        planId = '2lakhmandate';
      else if (netApprovedAmt > 100000 && netApprovedAmt <= 200000)
        planId = '5lakhmandate';
      const subscriptionId = this.getRandomId();
      const initialData = {
        mode: kCashfree,
        planId,
        subscriptionId,
      };

      try {
        const spans = userName.split(' ');
        if (spans.length > 2) userName = spans[0].replace(/\./g, '');
        else userName = userName.replace(/\./g, '');
      } catch (error) {
        userName = userName.replace(/\./g, '');
      }

      const bankId = this.getBankId(data.ifscCode);
      if (!bankId)
        return k422ErrorMessage('Invalid IFSC code, Kindly contact support');

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 3);
      const expiresOn = maxDate.toJSON().substring(0, 10) + ' 00:00:00';

      const body = {
        subscriptionId,
        planId,
        customerName: userName,
        customerEmail: data.email,
        customerPhone: data.phone,
        authAmount: 1,
        expiresOn,
        returnUrl: CF_CALLBACK_URL,
        notificationChannels: [],
        tpvEnabled: true,
        payerAccountDetails: {
          accountNumber,
          accountHolderName: userName,
          bankId,
          accountType: 'SAVINGS',
          ifsc: data.ifscCode.toUpperCase(),
        },
      };

      const url = CF_SUBSCRIPTION;
      const headers = CASHFREE_HEADERS;

      const response = await this.api.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      return {
        ...initialData,
        userId,
        loanId,
        accountNumber: data.accountNumber,
        invitationLink: response.authLink,
        referenceId: response.subReferenceId,
        response: JSON.stringify(response),
        status: response.subStatus,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async createPaymentOrder(preparedData: any) {
    try {
      const url = CF_ORDER;
      const maxDate = new Date();
      const subSource = preparedData?.subSource ?? '';
      if (subSource === 'APP') maxDate.setMinutes(maxDate.getMinutes() + 16);
      else maxDate.setHours(23, 59, 59, 59);
      const order_expiry_time = maxDate.toJSON();
      const body = {
        order_id: 'CFORDER' + new Date().getTime().toString(),
        order_amount: parseFloat(preparedData.amount.toFixed(2)),
        order_currency: 'INR',
        customer_details: {
          customer_id: 'CFCUST' + new Date().getTime().toString(),
          customer_email: preparedData.email,
          customer_phone: preparedData.phone,
        },
        order_meta: {
          return_url:
            preparedData.callBack ??
            kFrontendBaseURL + 'cashfree-payment?order_id={order_id}',
        },
        order_expiry_time,
      };
      const headers = CASHFREE_HEADERS_V2;

      // Delay preventing IP blocking from cashfree
      await this.delay(125);
      const response = await this.api.post(url, body, headers);

      if (response == k500Error) return k500Error;
      const data: any = {
        order_id: response.order_id,
        response: JSON.stringify(response),
      };
      data.payLink = nPaymentCheckoutURL + response.payment_session_id;
      return data;
    } catch (error) {
      return k500Error;
    }
  }

  async checkPayment(orderId, resp = null) {
    try {
      if (resp) {
        try {
          const tempRes = JSON.parse(resp);
          const expiryTime = new Date(tempRes?.order_expiry_time);
          const nowTime = new Date().getTime();
          const year = expiryTime.getFullYear();
          if (!isNaN(year) && year != 1970 && !resp.includes('IP_LIMIT')) {
            expiryTime.setMinutes(expiryTime.getMinutes() + 30);
            if (expiryTime.getTime() < nowTime)
              return { status: 'INITIALIZED' };
          }
        } catch (error) {}
      }
      const url = CF_ORDER + '/' + orderId + '/payments';
      const headers = CASHFREE_HEADERS_V2;

      // Delay preventing IP blocking from cashfree
      await this.delay(1000);
      let response = await this.api.get(url, null, headers);
      if (response == k500Error && !resp) return false;
      // if (response == k500Error) {
      //   try {
      //     const url = 'http://129.151.45.70:4400/v1/cashfree/getOrderData?orderId=' + orderId;
      //     await this.delay(500);
      //     const tempResponse = await this.api.requestGet(url);
      //     if (tempResponse && tempResponse != k500Error && tempResponse.valid && tempResponse.data) {
      //       const automationData = tempResponse.data;
      //      response = automationData;
      //     }
      //   } catch (error) {}
      // }

      const paymentData: any = {};
      if (response.length == 0 || (response == k500Error && resp)) {
        paymentData.status = 'INITIALIZED';
        if (response == k500Error && resp) {
          try {
            const tempRes = JSON.parse(resp);
            tempRes.iplimit = 'IP_LIMIT';
            paymentData.response = JSON.stringify(tempRes);
          } catch (error) {}
        }
        return paymentData;
      } else if (response.length >= 1) {
        const data = response.find((el) => el.payment_status == 'SUCCESS');
        if (data.is_captured) {
          paymentData.status = 'COMPLETED';
          paymentData.utr = data.bank_reference;
          paymentData.response = JSON.stringify(response);
          const paymentDate = new Date(data.payment_completion_time);
          paymentData.paymentDate = this.typeService.getGlobalDate(paymentDate);
        } else paymentData.status = 'FAILED';
      } else paymentData.status = 'FAILED';
      return paymentData;
    } catch (error) {
      return k500Error;
    }
  }

  async getSubscriptionStatus(referenceId) {
    try {
      const url = CF_SUBSCRIPTION + '/' + referenceId;
      const headers = CASHFREE_HEADERS;
      const data = await this.api.get(url, null, headers);
      if (data == k500Error) return kInternalError;
      else if (data.status != 'OK') return kInternalError;
      else if (!data.subscription) return kInternalError;
      return data.subscription;
    } catch (error) {
      return kInternalError;
    }
  }

  // Activate the subscription which has subscription status -> ON_HOLD
  async reActivateSubscription(referenceId: string) {
    try {
      const url = CF_SUBSCRIPTION + '/' + referenceId + '/activate';
      const body = {};
      const headers = CASHFREE_HEADERS;

      // Delay preventing IP blocking from cashfree
      await this.delay(500);
      const response = await this.api.post(url, body, headers);
      return response;
    } catch (error) {
      return k500Error;
    }
  }

  //#region Place auto debit
  async placeAutoDebit(data) {
    try {
      if (!gIsPROD) return;

      const url = CF_SUBSCRIPTION + '/' + data.referenceId + CF_CHARGE;
      const headers = CASHFREE_HEADERS;
      let scheduledOn = data.date;
      const today = this.typeService.getGlobalDate(new Date());
      const todayDate = today.toJSON().substring(0, 10);
      const body: any = {
        amount: data.amount,
        remarks: `${EnvConfig.nbfc.nbfcName} due amount - Auto debit`,
      };
      if (todayDate != scheduledOn) body.scheduledOn = scheduledOn;

      const response = await this.api.post(
        url,
        body,
        headers,
        null,
        null,
        true,
      );
      const result: any = {};
      if (response == k500Error || !response.payment) {
        // Error msg -> Autodebit was not placed successfully
        if (!response?.payment && response?.data?.message) {
          return {
            adNotPlaced: true,
            errorMsg: response?.data?.message ?? k500Error,
          };
        }
        result.paidAmount = 0;
        result.status = 'FAILED';
        result.subStatus = 'AD_NOT_PLACED';
        result.response = JSON.stringify({
          reason: 'INTERNAL_SERVER_ERROR',
          response,
        });
      } else {
        result.response = JSON.stringify(response);
        result.utr = response.payment.paymentId;
      }
      return result;
    } catch (error) {}
    return {
      paidAmount: 0,
      status: 'FAILED',
      subStatus: 'AD_NOT_PLACED',
      response: JSON.stringify({
        reason: 'INTERNAL_SERVER_ERROR',
        response: 500,
      }),
    };
  }
  //#endregion

  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  private getRandomId() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const randomId = Math.random().toString(36).substring(2, 13);
    return `${EnvConfig.nbfc.nbfcCodeName}-${year}${month}${date}-${randomId}`;
  }

  private getBankId(ifscCode: string) {
    if (ifscCode.length < 4) return false;
    const id = ifscCode.toUpperCase().substring(0, 4);
    if (!CASHFREE_BANK_LIST.includes(id)) return false;
    return id;
  }

  //#region check order
  async checkOrder(orderId) {
    try {
      const url = CF_ORDER_CHECK + orderId + '/status';
      const headers = CASHFREE_HEADERS_V2;
      // Delay preventing IP blocking from cashfree
      await this.delay(1500);
      const response = await this.api.get(url, null, headers);
      if (!response || response === k500Error) return k500Error;
      if (response?.orderStatus === 'PAID') return 'COMPLETED';
      return 'INITIALIZED';
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region refundAmount
  async refundAmount(orderId, amount, refundId) {
    try {
      if (!gIsPROD) return kInternalError;
      const url = CF_ORDER + '/' + orderId + '/refunds';
      const headers = CASHFREE_HEADERS_V2;
      const body = {
        refund_amount: amount,
        refund_id: refundId,
        refund_note: 'refund for order ' + orderId,
      };
      const response = await this.api.post(url, body, headers, {}, {}, true);
      if (!response || response === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (response?.refund_status === 'SUCCESS') status = 'COMPLETED';
      if (
        response?.refund_status === 'CANCELLED' ||
        response?.statusCode == 422
      )
        status = 'FAILED';
      const utr = response?.cf_payment_id;
      return { status, utr, response: JSON.stringify(response) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region refundAmount
  async getRefundStatus(orderId, refundId) {
    try {
      // if (!gIsPROD) return kInternalError;
      const url = CF_ORDER + '/' + orderId + '/refunds/' + refundId;
      const headers = CASHFREE_HEADERS_V2;
      const response = await this.api.get(url, null, headers);
      if (!response || response === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (response?.refund_status === 'SUCCESS') status = 'COMPLETED';
      if (response?.refund_status === 'CANCELLED') status = 'FAILED';
      const utr = response?.cf_payment_id;
      return { status, utr, response: JSON.stringify(response) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  async checkCFSubscriptionStatus(referenceId: string) {
    try {
      const url = CF_SUBSCRIPTION + '/' + referenceId;
      const headers = CASHFREE_HEADERS;
      const response = await this.api.get(url, null, headers);
      if (response === k500Error) return kInternalError;
      const data: any = {};
      if (response?.status == 'OK') {
        if (response?.subscription) {
          const status = response?.subscription?.status;
          const umrn = response?.subscription?.umrn;
          data.status = status;
          data.umrn = umrn;
          data.bankAccountNumber = response?.subscription?.bankAccountNumber;
          if ((status == 'ACTIVE' || status == 'BANK_APPROVAL_PENDING') && umrn)
            data.isRegistered = true;
        }
      }
      return data;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region payOut
  async payOut(body) {
    try {
      if (!gIsPROD) return kInternalError;
      const response = await this.api.post(CF_PAYOUT_URL, body);
      if (!response || response === k500Error) return kInternalError;
      if (response?.message != 'SUCCESS') return response;
      let status = 'INITIALIZED';
      const data = response?.data;
      const utr = data?.transId;
      return { status, utr, response: JSON.stringify(data) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  find payout data
  async findPayoutData(transId) {
    try {
      const body = { transId };
      const response = await this.api.post(CF_CHECK_PAYOUT_URL, body);
      if (!response || response === k500Error) return kInternalError;
      if (response?.message != 'SUCCESS') return response;
      const res = response?.data;
      let status = 'INITIALIZED';
      if (res?.status === 'SUCCESS') status = 'COMPLETED';
      if (res?.status === 'FAILED') status = 'FAILED';
      return { status, response: JSON.stringify(res) };
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion
}
