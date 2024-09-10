// Imports
import { Injectable, Logger } from '@nestjs/common';
import { gIsPROD, isUAT, puppeteerConfig } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  CF_SUBSCRIPTION,
  kGetPayoutData,
  kRazorPayouts,
  nCreateRazorpayCustomer,
  nCreateRazorpayOrder,
  nGetIFSC,
  nGetInvoiceData,
  nGetPaymentData,
  nGetPaymentsByOrderId,
  nGetTokenById,
  nMandateInvitation,
  nPlaceRazorpayAutoDebit,
  nRazorSettlementsRecon,
  nRazorpayCheckout,
} from 'src/constants/network';
import {
  CASHFREE_HEADERS,
  kGetBankCode,
  kPayoutBanks,
  kRazorpayM1Auth,
  kRazorpayM2Auth,
} from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import {
  kAutoDebit,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kNoReplyMail,
  kRazorpay,
  kSDK,
  kSupportMail,
} from 'src/constants/strings';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import puppeteer from 'puppeteer';
import { ValidationService } from 'src/utils/validation.service';
import { LoanRepository } from 'src/repositories/loan.repository';
import * as FormData from 'form-data';
import { EnvConfig } from 'src/configs/env.config';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { Op } from 'sequelize';
import { SendingBlueService } from '../sendingBlue/sendingBlue.service';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');
@Injectable()
export class RazorpoayService {
  private readonly logger = new Logger(RazorpoayService.name);
  razorpayInstance: any;
  constructor(
    private readonly api: APIService,
    private readonly validation: ValidationService,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly fileService: FileService,
    private readonly loanRepo: LoanRepository,
    private readonly sendingBlue: SendingBlueService,
    private readonly subcriptionRepo: SubscriptionRepository,
  ) {
    if (gIsPROD || isUAT)
      this.razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_M2_APP_ID,
        key_secret: process.env.RAZORPAY_M2_SECRET_ID,
      });
  }

  async fetchSettlements(params, auth, offset = 0) {
    let allSettlements = [];
    let groupedSettlements = {};

    while (true) {
      params = {
        ...params,
        skip: offset,
      };

      const settlementData = await this.api.get(
        nRazorSettlementsRecon,
        params,
        null,
        { auth },
      );

      if (settlementData === k500Error) {
        return kInternalError;
      }

      settlementData.items.forEach((item) => {
        try {
          if (item.settled === true) {
            const settlementId = item?.settlement_id;

            if (!groupedSettlements[settlementId]) {
              groupedSettlements[settlementId] = {
                settlement_id: settlementId,
                tax: 0,
                fees: 0,
                paymentAmount: 0,
                refundAmount: 0,
                utr: '',
                settled_at: 0,
                settled: false,
              };
            }

            groupedSettlements[settlementId].tax += item?.tax;
            groupedSettlements[settlementId].fees += item?.fee;
            groupedSettlements[settlementId].utr = item?.settlement_utr;
            groupedSettlements[settlementId].settled_at = item?.settled_at;
            groupedSettlements[settlementId].settled = item?.settled;
            if (item.type === 'payment') {
              groupedSettlements[settlementId].paymentAmount += item?.credit;
            } else if (item.type === 'refund') {
              groupedSettlements[settlementId].refundAmount += item?.debit;
            }
          }
        } catch (error) {}
      });

      if (settlementData.count === 0) break;
      offset += 1000;
    }
    allSettlements.push(...Object.values(groupedSettlements));

    return allSettlements;
  }

  async syncPayouts(queryData: any) {
    try {
      const cookie = queryData.cookie;
      const payoutId = queryData.payoutId;
      let url = '';
      const headers = { cookie };
      let response: any = {};

      if (payoutId) {
        url = kGetPayoutData + payoutId;
        response = await this.api.get(url, {}, headers);
        if (response == k500Error) return kInternalError;
        const data = response.data ?? {};
        const processedTime = new Date(data.processed_at * 1000);
        const bankingAccId = data.banking_account_id ?? '';
        const status = data.status ?? '';
        if (status != 'processed')
          return k422ErrorMessage('Payout is not been processed');
        const accName = kPayoutBanks[bankingAccId] + ' - ' + bankingAccId;
        return { accName, processedTime };
      } else {
        response = await this.api.get(url, {}, headers);
        if (response == k500Error) return kInternalError;

        const data = response.data ?? {};
        const items = data.items ?? [];
        for (let index = 0; index < items.length; index++) {
          try {
            const payout = items[index];
            const bankingAccId = payout.banking_account_id ?? '';
            const status = payout.status ?? '';
            const payoutId = payout.id ?? '';
          } catch (error) {}
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async getIFSCDetails(data: any) {
    try {
      const ifsc = data.ifsc;
      if (!ifsc) return k422ErrorMessage('Required parameter ifsc is missing');

      const url = nGetIFSC + ifsc;
      const response = await this.api.get(url);
      if (response == k500Error)
        return k422ErrorMessage('Please provide valid IFSC code');
      const ifscBranchCode = response.BANKCODE;
      if (!ifscBranchCode) return kInternalError;
      const bankCode: any = kGetBankCode(ifscBranchCode);
      if (bankCode.message) return bankCode;
      return { ...response, bankCode };
    } catch (error) {
      return kInternalError;
    }
  }

  async inviteForMandate(reqData: any) {
    try {
      // Parameter validation
      let userName = reqData.name;
      if (!userName) return kParamMissing('name');
      userName = userName.replace(/\./g, '');
      const phone = reqData.phone;
      if (!phone) return kParamMissing('phone');
      const email = reqData.email;
      if (!email) return kParamMissing('email');
      const authType = reqData.type;
      if (!authType) return kParamMissing('type');
      const accNumber = reqData.accountNumber;
      if (!accNumber) return kParamMissing('accountNumber');
      const ifscCode = reqData.ifscCode?.trim();
      if (!ifscCode) return kParamMissing('ifscCode');
      const bankData = await this.getIFSCDetails({ ifsc: ifscCode });
      if (bankData.message) return bankData;
      const userId = reqData.id;
      const loanId = reqData.loanId;
      const needHTML = reqData.needHTML ?? false;

      // Endpoint and headers
      const auth = kRazorpayM2Auth;
      const url = nMandateInvitation;

      // Other details required for mandate invitation body
      const linkExpireTime = new Date();
      linkExpireTime.setHours(linkExpireTime.getHours() + 36);
      const expire_by = Math.floor(linkExpireTime.getTime() / 1000);
      const otherDetails = {
        receipt: this.getRandomId(),
        email_notify: needHTML ? 0 : 1,
        sms_notify: needHTML ? 0 : 1,
        expire_by,
        type: 'link',
        amount: 0,
        currency: 'INR',
        description: `Loan repayment for ${EnvConfig.nbfc.nbfcName}`,
      };
      const mandateExpireTime = new Date();
      mandateExpireTime.setMonth(mandateExpireTime.getMonth() + 12);
      const expire_at = Math.floor(mandateExpireTime.getTime() / 1000);

      // Prepare body
      const customer = {
        name: userName,
        email: email,
        contact: phone,
      };
      const bank_account = {
        beneficiary_name: userName,
        account_number: accNumber,
        account_type: 'savings',
        ifsc_code: ifscCode,
      };
      const subscription_registration = {
        first_payment_amount: 0,
        method: 'emandate',
        auth_type: authType.toLowerCase(),
        max_amount: 9999900,
        expire_at,
        bank_account,
      };
      const body = {
        customer,
        subscription_registration,
        ...otherDetails,
      };

      const response = await this.api.post(url, body, {}, auth);
      if (response == k500Error) return kInternalError;
      const invitationLink = response.short_url;
      if (!invitationLink) return k422ErrorMessage('invitationLink not found');

      if (needHTML) {
        const sessionData = await this.getSubscriptionSessionId(invitationLink);
        if (sessionData.message) return sessionData;
        const preparedData: any = { ...sessionData };
        preparedData.contact = phone;
        preparedData.email = email;
        preparedData.ifsc = ifscCode;
        preparedData.authType = authType;
        preparedData.accNumber = accNumber;
        preparedData.bank = bankData?.bankCode ?? bankData.BANKCODE;
        preparedData.name = userName;
        const htmlResponse = await this.checkoutHTML(preparedData);
        if (htmlResponse.message) return htmlResponse;
        response.htmlData = htmlResponse;
      }

      return {
        mode: kRazorpay,
        subscriptionId: response.customer_id,
        accountNumber: accNumber,
        invitationLink,
        referenceId: response.id,
        response: JSON.stringify(response),
        status: 'INITIALIZED',
        subType: authType,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async checkOrderStatus(targetId, mandateId, oldMID = false) {
    try {
      const isInvoice = targetId.includes('inv_');
      const isOrder = targetId.includes('order_');
      // Endpoint and headers
      let url = nGetInvoiceData + targetId;
      const auth = oldMID ? kRazorpayM1Auth : kRazorpayM2Auth;
      url = isOrder ? nCreateRazorpayOrder + '/' + targetId : url;
      const response = await this.api.get(url, null, null, { auth });

      if (response == k500Error) return kInternalError;
      let eMandateStatus = 'INITIALIZED';
      const status = response.status;
      const orderId = isOrder ? response?.id : response?.order_id;
      if (status == 'issued') {
        if (orderId) {
          const orderPaymentData = await this.checkOrderIdStatus(orderId);
          if (orderPaymentData.message) return orderPaymentData;
          let errorMsg =
            orderPaymentData?.error_reason ??
            orderPaymentData?.error_step ??
            orderPaymentData.error_description;
          if (errorMsg) errorMsg = errorMsg.replace(/_/g, ' ');
          if (orderPaymentData.status == 'failed' && errorMsg)
            return { status: 'INITIALIZED', errorMsg };
          return { status: 'INITIALIZED' };
        }
        return { status: 'INITIALIZED' };
      }
      if (status == 'paid' || (isOrder && status == 'attempted')) {
        let paymentData: any = {};
        let paymentId = response?.payment_id;
        if (isOrder && orderId && !paymentId) {
          const orderPaymentData = await this.checkOrderIdStatus(orderId);
          if (orderPaymentData.message) return orderPaymentData;
          paymentData = { response: JSON.stringify(orderPaymentData) };
          let errorMsg =
            orderPaymentData?.error_description ??
            orderPaymentData?.error_reason ??
            orderPaymentData.error_step;
          if (errorMsg) errorMsg = errorMsg.replace(/_/g, ' ');
          if (orderPaymentData?.status == 'captured') {
            if (orderPaymentData?.method == 'emandate') {
              paymentData['umrn'] = orderPaymentData.token_id;
              const eMandateCheckStatus = await this.checkMandateStatus(
                orderPaymentData.customer_id,
                orderPaymentData.token_id,
              );

              if (eMandateCheckStatus?.message) return eMandateCheckStatus;
              let expireDate = eMandateCheckStatus.expired_at;
              if (expireDate) {
                let mandateExpireDate: any = expireDate * 1000;
                mandateExpireDate = this.typeService
                  .getGlobalDate(mandateExpireDate)
                  .toJSON();
                const updateData: any = { mandateExpireDate };
                await this.subcriptionRepo.updateRowData(updateData, mandateId);
              }
              if (
                eMandateCheckStatus?.recurring_details?.status.toLowerCase() ==
                'rejected'
              ) {
                errorMsg =
                  eMandateCheckStatus?.recurring_details?.failure_reason;
                return { status: 'INITIALIZED', ...paymentData, errorMsg };
              } else {
                eMandateStatus = 'ACTIVE';
              }
            }
          } else if (orderPaymentData?.status == 'failed')
            return { status: 'INITIALIZED', ...paymentData, errorMsg };
          paymentId = orderPaymentData?.id;
        }

        if (isInvoice && orderId && paymentId) {
          paymentData = await this.checkPaymentStatus(paymentId);
          if (paymentData.message) return paymentData;
        }

        return {
          ...paymentData,
          isRegistered: eMandateStatus == 'ACTIVE' ? true : false,
          status: eMandateStatus,
          response: JSON.stringify(response),
        };
      }

      return response;
    } catch (error) {
      console.log({error})
      return kInternalError;
    }
  }

  async placeAutoDebit(reqData: any) {
    try {
      if (!gIsPROD) return kInternalError;
      // Parameter validation
      const token = reqData.token;
      if (!token) return kParamMissing('token');
      const customerData: any = await this.createCustomer(reqData);
      if (customerData.message) return customerData;
      const orderData: any = await this.createOrder(reqData, kAutoDebit);
      if (orderData.message) return orderData;
      const orderId = orderData.id;

      // Endpoint and headers
      const url = nPlaceRazorpayAutoDebit;
      const auth = kRazorpayM2Auth;

      // Body preparation
      const otherDetails = {
        currency: 'INR',
        description: `EMI Repayment for loan - ${EnvConfig.nbfc.nbfcName}`,
        recurring: '1',
      };
      const body = {
        email: customerData.email,
        contact: customerData.contact,
        amount: Math.floor(reqData.amount * 100),
        order_id: orderId,
        customer_id: customerData.customerId,
        token,
        ...otherDetails,
      };

      // Api Request
      const response = await this.api.post(url, body, {}, auth, null, true);
      if (response == k500Error) return kInternalError;

      const utr = response.razorpay_payment_id;
      if (!utr) {
        // Error msg -> Autodebit was not placed successfully
        if (response?.data?.error) {
          return {
            adNotPlaced: true,
            errorMsg: response?.data?.error?.description ?? k500Error,
          };
        } else return kInternalError;
      }
      return { utr };
    } catch (error) {
      return kInternalError;
    }
  }

  private async createCustomer(reqData: any) {
    try {
      // Parameter validation
      const contact = reqData.contact;
      if (!contact) return kParamMissing('contact');
      const email = reqData.email;
      if (!email) return kParamMissing('email');
      const name = reqData.name;
      if (!name) return kParamMissing('name');

      // Endpoint, body and headers
      const url = nCreateRazorpayCustomer;
      const auth = kRazorpayM2Auth;
      const body = { contact, email, fail_existing: '0', name };

      // Api request
      const response = await this.api.post(url, body, {}, auth);
      if (response == k500Error) return kInternalError;

      const customerId = response.id;
      if (!customerId) return k422ErrorMessage('An unknown error occurred');

      return { customerId, contact, email };
    } catch (error) {
      return kInternalError;
    }
  }

  async createOrder(reqData: any, type: string) {
    try {
      // Parameter validation
      let amount = reqData.amount;
      if (!amount) return kParamMissing('amount');
      amount = Math.floor(amount * 100);

      // Endpoint and headers
      const url = nCreateRazorpayOrder;
      const auth = type == kSDK ? kRazorpayM1Auth : kRazorpayM2Auth;

      // Body preparation
      const otherDetails: any = {};
      if (type == kAutoDebit || type == kSDK) {
        otherDetails.currency = 'INR';
        otherDetails.payment_capture = true;
      }
      const body = { amount, ...otherDetails, receipt: this.getRandomId() };
      // Api request
      const response = await this.api.post(url, body, {}, auth);
      if (response == k500Error) return kInternalError;

      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  async checkPaymentStatus(paymentId) {
    try {
      // Endpoint and headers
      const url = nGetPaymentData + paymentId;
      const auth = kRazorpayM2Auth;

      const response = await this.api.get(url, null, null, { auth });
      if (response == k500Error) return kInternalError;

      const status = response.status;
      const data: any = { response: JSON.stringify(response) };
      if (status == 'captured') {
        if (response.method == 'emandate') data.umrn = response.token_id;
        return { status: 'COMPLETED', ...data };
      } else if (status == 'failed') return { status: 'FAILED', ...data };

      return { status: 'INITIALIZED' };
    } catch (error) {
      return kInternalError;
    }
  }

  private async checkOrderIdStatus(orderId) {
    try {
      // Endpoint and headers
      const url = nGetPaymentsByOrderId(orderId);
      const auth = kRazorpayM2Auth;

      const response = await this.api.get(url, null, null, { auth });
      if (response == k500Error) return kInternalError;

      const transList = response.items;
      if (!transList) return kInternalError;
      transList.sort((b, a) => a.created_at - b.created_at);
      if (transList.length == 0) return { status: 'INITIALIZED' };

      return transList[0];
    } catch (error) {
      return kInternalError;
    }
  }

  private async checkMandateStatus(customerId, tokenId) {
    try {
      // Endpoint and headers
      const url = nGetTokenById(customerId, tokenId);
      const auth = kRazorpayM2Auth;
      const response = await this.api.get(url, null, null, { auth });
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  private getRandomId() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const randomId = Math.random().toString(36).substring(2, 13);
    return `${EnvConfig.nbfc.nbfcCodeName}-${year}${month}${date}-${randomId}`;
  }

  //#region refundAmount
  async refundAmount(pay_id, amount, isAutoDebit = false) {
    try {
      if (!gIsPROD) return kInternalError;
      const url = nGetPaymentData + pay_id + '/refund';
      const auth = isAutoDebit ? kRazorpayM2Auth : kRazorpayM1Auth;
      amount = amount * 100;
      const body = { amount, receipt: 'refund for order ' + pay_id };
      const res = await this.api.post(url, body, null, null, { auth }, true);
      if (!res || res === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (res?.status === 'processed') status = 'COMPLETED';
      if (res?.status === 'failed' || res?.statusCode == 422) status = 'FAILED';
      const utr = res?.id;
      return { status, utr, response: JSON.stringify(res) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region refundAmount
  async getRefundStatus(pay_id, refundId, isAutoDebit = false) {
    try {
      // if (!gIsPROD) return kInternalError;
      const url = nGetPaymentData + pay_id + '/refunds/' + refundId;
      const auth = isAutoDebit ? kRazorpayM2Auth : kRazorpayM1Auth;
      const response = await this.api.get(url, null, null, { auth });
      if (!response || response === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (response?.status === 'processed') status = 'COMPLETED';
      if (response?.status === 'failed') status = 'FAILED';
      const utr = response?.id;
      return { status, utr, response: JSON.stringify(response) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  pay out
  async payOut(customerDetails, purpose = 'Loan') {
    try {
      const name = customerDetails.name;
      const email = customerDetails.email;
      const amount = customerDetails.amount;
      const ifsc = customerDetails.ifsc;
      const account_number = customerDetails.accountNumber;
      let contact: string = customerDetails.contact;
      const loanId = customerDetails.loanId;
      const loanData: any = await this.loanRepo.getRowWhereData(['appType'], {
        where: { id: loanId },
      });
      const appType = loanData?.appType;
      const appName = appType == 0 ? kInfoBrandName : kInfoBrandNameNBFC;
      if (contact.includes('==='))
        contact = await this.cryptService.decryptPhone(contact);
      if (contact == k500Error) return kInternalError;
      if (!name || !email || !amount || !ifsc) return kInternalError;
      if (!account_number || !contact || !loanId) return kInternalError;
      if (process.env.MODE != 'PROD') return kInternalError;
      const reference_id = EnvConfig.nbfc.nbfcCodeName + new Date().getTime();
      const tempAmount = Math.floor(
        process.env.MODE == 'PROD' ? amount * 100 : 100,
      );
      const body = {
        account_number: process.env.RBL_ACCOUNT_NUMBER,
        amount: tempAmount,
        currency: 'INR',
        mode: 'IMPS',
        purpose,
        fund_account: {
          account_type: 'bank_account',
          bank_account: { name, ifsc, account_number },
          contact: { name, email, contact, type: 'customer', reference_id },
        },
        queue_if_low_balance: true,
        reference_id,
        narration: purpose + ` from ${appName} ` + loanId,
        notes: { name, email, contact, loanId },
      };
      const auth = kRazorpayM1Auth;
      const url = kRazorPayouts;
      const res = await this.api.post(url, body, null, null, { auth }, true);
      if (!res || res === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (res?.status === 'processed') status = 'COMPLETED';
      if (
        res?.status === 'cancelled' ||
        res?.status === 'reversed' ||
        res?.statusCode == 422
      )
        status = 'FAILED';
      const utr = res?.id;
      return { status, utr, response: JSON.stringify(res) };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  find payout data
  async findPayoutData(poutId) {
    try {
      const url = kRazorPayouts + '/' + poutId;
      const auth = kRazorpayM1Auth;
      const res = await this.api.get(url, null, null, { auth });
      if (!res || res === k500Error) return kInternalError;
      let status = 'INITIALIZED';
      if (res?.status === 'processed') status = 'COMPLETED';
      if (res?.status === 'cancelled' || res?.status === 'reversed')
        status = 'FAILED';
      const utr = res?.id;
      return { status, utr, response: JSON.stringify(res) };
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  private async getSubscriptionSessionId(invitationLink) {
    try {
      // Go to destination url in incognito mode
      const browser = await puppeteer.launch(puppeteerConfig);

      const page = await browser.newPage();
      await page.goto(invitationLink, { waitUntil: 'networkidle2' });

      const clickBtn = 'document.getElementsByTagName("button")[0].click();';
      await page.evaluate(clickBtn);

      // Tracking api request
      const finalizedData: any = { result: false };
      page.on('request', async (request) => {
        try {
          const url = await request.url();
          const targetEndpoint = nRazorpayCheckout;
          if (url.includes(targetEndpoint)) {
            let firstIndex = url.indexOf('session_token=');
            if (firstIndex == -1) return kInternalError;
            firstIndex += 14;
            const targetRawString = url.substring(firstIndex);
            const spans = targetRawString.split('&');

            for (let index = 0; index < spans.length; index++) {
              try {
                const data = spans[index];
                if (index == 0) finalizedData.sessionToken = data;
                if (data.includes('order_id'))
                  finalizedData.orderId = data.replace('order_id=', '');
                if (data.includes('customer_id'))
                  finalizedData.customerId = data.replace('customer_id=', '');
              } catch (error) {}
            }

            finalizedData.result = finalizedData.sessionToken != null;
          }
        } catch (error) {
          console.log(error);
        }
      });

      const response: any = await this.validation.waitUntil(
        () => finalizedData.result,
        250,
      );
      await browser.close();
      if (response?.message) return response;
      return finalizedData;
    } catch (error) {
      console.log(error);
    }
  }

  async checkoutHTML(reqData) {
    try {
      const sessionToken = reqData.sessionToken;
      if (!sessionToken) return kParamMissing('sessionToken');
      const orderId = reqData.orderId;
      if (!orderId) return kParamMissing('orderId');
      const customerId = reqData.customerId;
      if (!customerId) return kParamMissing('customerId');
      const contact = reqData.contact;
      if (!contact) return kParamMissing('contact');
      const email = reqData.email;
      if (!email) return kParamMissing('email');
      const name = reqData.name;
      if (!name) return kParamMissing('name');
      const bank = reqData.bank;
      if (!bank) return kParamMissing('bank');
      const authType = reqData.authType?.toLowerCase();
      if (!authType) return kParamMissing('authType');
      const ifsc = reqData.ifsc;
      if (!ifsc) return kParamMissing('ifsc');
      const accNumber = reqData.accNumber;
      if (!accNumber) return kParamMissing('accNumber');

      const url = `https://api.razorpay.com/v1/standard_checkout/payments/create/ajax?session_token=${sessionToken}`;

      const form = new FormData();
      form.append('amount', '0');
      form.append('currency', 'INR');
      form.append('contact', `+91 ${contact}`);
      form.append('email', email);
      form.append('method', 'emandate');
      form.append('bank_account[account_number]', accNumber);
      form.append('bank_account[ifsc]', ifsc);
      form.append('bank_account[name]', name);
      form.append('bank', bank);
      form.append('order_id', orderId);
      form.append('customer_id', customerId);
      form.append('auth_type', authType);

      const response: any = await this.api.post(url, form, null, null, {
        headers: { ...form.getHeaders() },
      });
      if (response == k500Error) return kInternalError;
      return response.request.content;
    } catch (error) {
      return kInternalError;
    }
  }

  async initForMandate(reqData: any) {
    try {
      // Parameter validation
      let userName = reqData.name;
      if (!userName) return kParamMissing('name');
      
      try {
        const spans = userName.split(' ');
        if (userName.length > 50 && spans.length > 2) userName = spans[0].replace(/\./g, '');
        else userName = userName.replace(/\./g, '');
      } catch (error) {
        userName = userName.replace(/\./g, '');
      }

      const phone = reqData.phone;
      if (!phone) return kParamMissing('phone');
      const email = reqData.email;
      if (!email) return kParamMissing('email');
      const accNumber = reqData.accountNumber;
      if (!accNumber) return kParamMissing('accountNumber');
      const ifscCode = reqData.ifscCode?.trim();
      if (!ifscCode) return kParamMissing('ifscCode');
      const bankData = await this.getIFSCDetails({ ifsc: ifscCode });
      if (bankData.message) return bankData;
      const userId = reqData.id;
      const loanId = reqData.loanId;

      // Max. Mandate Amount Now Dynamic (A/c to Net Approved Loan Amount)
      let max_amount = 20000000;
      const options = { where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(
        ['netApprovedAmount'],
        options,
      );
      const netApprovedAmt = loanData?.netApprovedAmount;
      if (netApprovedAmt > 5000 && netApprovedAmt <= 50000)
        max_amount = 10000000;
      else if (netApprovedAmt > 50000 && netApprovedAmt <= 100000)
        max_amount = 20000000;
      else if (netApprovedAmt > 100000 && netApprovedAmt <= 200000)
        max_amount = 50000000;
      const customerData: any = await this.createCustomer({
        contact: reqData.phone,
        email: reqData.email,
        name: userName,
      });
      if (customerData.message) return customerData;
      const that = this;
      const response: any = await new Promise((resolve) => {
        this.razorpayInstance.orders.create(
          {
            amount: 0,
            currency: 'INR',
            method: 'emandate',
            payment_capture: 1,
            customer_id: customerData.customerId,
            receipt: this.getRandomId(),
            notes: { userId, loanId, max_amount },
            token: {
              max_amount,
              bank_account: {
                beneficiary_name: userName,
                account_number: accNumber,
                account_type: 'savings',
                ifsc_code: ifscCode,
              },
              notes: { userId, loanId, max_amount },
            },
          },
          function (error, res) {
            if (error) {
              that.logger.error(error);
              resolve(k500Error);
            } else resolve(res);
          },
        );
      });
      if (response == k500Error) return kInternalError;
      return {
        mode: kRazorpay,
        subscriptionId: customerData.customerId,
        accountNumber: accNumber,
        referenceId: response.id,
        response: JSON.stringify(response),
        status: 'INITIALIZED',
      };
    } catch (error) {
      return kInternalError;
    }
  }

  finalData = [];
  async funCheckMandateExpire(reqData, offset) {
    const startDate = reqData?.startDate;
    const endDate = reqData?.endDate;
    const loanId = reqData?.loanId;
    const mode = reqData?.mode;
    const subScriptionInclude: any = {
      model: SubScriptionEntity,
      attributes: ['id', 'referenceId', 'createdAt', 'subscriptionId', 'umrn'],
      where: { mode },
    };
    if (startDate && endDate) {
      let dateRange: any = this.typeService.getUTCDateRange(startDate, endDate);
      dateRange = { [Op.gte]: dateRange.fromDate, [Op.lte]: dateRange.endDate };
      subScriptionInclude.where.createdAt = dateRange;
    }
    const loanOptions: any = {
      where: { loanStatus: 'Active' },
      include: [subScriptionInclude],
      order: [['id']],
      limit: 100,
      offset: offset,
    };
    if (loanId) loanOptions.where.id = loanId;
    const loanData = await this.loanRepo.getTableWhereData(
      ['id', 'loanStatus', 'userId'],
      loanOptions,
    );
    if (loanData == k500Error) throw new Error();
    for (let i = 0; i < loanData.length; i++) {
      try {
        let obj: any = {};
        let expireDate: any;
        const ele = loanData[i];
        const customerId = ele.subscriptionData.subscriptionId;
        const tokenId = ele?.subscriptionData?.umrn;
        if (mode === 'CASHFREE') {
          const url = CF_SUBSCRIPTION + '/' + ele.subscriptionData.referenceId;
          const headers = CASHFREE_HEADERS;
          const response = await this.api.get(url, null, headers);
          expireDate = response?.subscription?.expiryDate;
        } else {
          if (!customerId || !tokenId) continue;
          const eMandateCheckStatus = await this.checkMandateStatus(
            customerId,
            tokenId,
          );
          if (eMandateCheckStatus?.message) continue;
          expireDate = eMandateCheckStatus.expired_at;
          if (!expireDate) continue;
          expireDate = expireDate * 1000;
        }
        expireDate = this.typeService.getGlobalDate(expireDate);
        const toDate = this.typeService.getGlobalDate(new Date());
        if (expireDate.getTime() > toDate.getTime()) continue;
        obj['LoanId'] = ele?.id ?? '-';
        obj['UserId'] = ele?.userId ?? '-';
        obj['Loan Status'] = ele?.loanStatus ?? '-';
        obj['Subscription Id'] = customerId ?? '-';
        obj['Created Date'] =
          this.typeService.dateToJsonStr(ele?.subscriptionData?.createdAt) ??
          '-';
        obj['Expire Date'] = this.typeService.dateToJsonStr(expireDate);
        this.finalData.push(obj);
      } catch (error) {}
    }

    if (loanData.length > 0)
      await this.funCheckMandateExpire(reqData, offset + 100);
    if (!this.finalData.length) return kNoDataFound;
    const sheetName = `mandateExpire${new Date().getTime()}`;
    const rawExcelData = {
      sheets: [`${sheetName}`],
      data: [this.finalData],
      sheetName: `${sheetName}.xlsx`,
      needFindTuneKey: false,
    };
    const excelResponse: any = await this.fileService.objectToExcel(
      rawExcelData,
    );
    if (excelResponse?.message) return excelResponse;
    const fileURL = await this.fileService.uploadFile(
      excelResponse?.filePath,
      'mandateExpire',
      'xlsx',
    );
    if (fileURL.message) return fileURL;

    const mailRes = await this.sendingBlue.sendMail({
      email: EnvConfig.mail.adminMails?.split(',')[0],
      from: kNoReplyMail,
      replyTo: kSupportMail,
      subject: 'Mandate Report',
      html: 'Hello!!',
      attachments: [{ path: fileURL }],
    });
    if (mailRes?.message) return k500Error;
    return { fileURL };
  }
}
