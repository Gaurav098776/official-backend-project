import { Injectable } from '@nestjs/common';
import * as env from 'dotenv';
const Razorpay = require('razorpay');
import { k500Error } from 'src/constants/misc';
import {
  kRazorInvoices,
  kRazorOrders,
  kRazorPayments,
  kRazorPaymentsLink,
  RAZORPAY_API_URL,
  RAZORPAY_CALLBACK_URL,
  CHECK_CALLBACK_V2_URL,
  kRazorPayouts,
} from 'src/constants/network';
import { kRazorpayAuth } from 'src/constants/objects';
import { kInternalError } from 'src/constants/responses';
import { APIService } from './api.service';
import { CryptService } from './crypt.service';
import { CommonService } from './common.service';
import { TypeService } from './type.service';
import { EnvConfig } from 'src/configs/env.config';

env.config();

const auth = kRazorpayAuth;

@Injectable()
export class RazorpayService {
  razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_KEY,
  });

  authConfig = {
    auth: {
      username: process.env.RAZOR_PAY_ID,
      password: process.env.RAZOR_PAY_KEY,
    },
  };

  constructor(
    private readonly api: APIService,
    private readonly commonService: CommonService,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
  ) {}

  async getPaymentData(orderId: string) {
    try {
      const orderURL = kRazorOrders + orderId + '/payments';
      const orderResponse = await this.api.get(orderURL, {}, {}, { auth });
      if (orderResponse == k500Error) return k500Error;

      const paymentList = orderResponse.items;
      let paidAmount = 0;
      let utr;
      let paidData;
      const refundData = paymentList.find((el) => el.status == 'refunded');
      if (refundData) {
        paidAmount = refundData.amount / 100;
        utr = refundData.id;
      } else {
        paidData = paymentList.find((el) => el.status == 'captured');
        if (paidData) {
          paidAmount = paidData.amount / 100;
          utr = paidData.id;
        }
      }

      const isRefunded = refundData != null;
      const isPaid = paidData != null;
      const isPending = !isRefunded && !isPaid;
      const paymentData: any = {
        isPaid,
        isPending,
        isRefunded,
        paidAmount,
        utr,
      };
      if (isPaid) {
        paymentData.response = JSON.stringify(orderResponse);
        const unixDate = Math.round(paidData.created_at * 1000);
        const paymentDate =
          this.typeService.unixMilisecondsToGlobalDate(unixDate);
        paymentData.completionDate = paymentDate;
      }

      return paymentData;
    } catch (error) {
      return k500Error;
    }
  }

  async createOrder(amount: number) {
    try {
      const url = kRazorOrders;
      const body = {
        amount,
        currency: 'INR',
      };
      return await this.api.post(url, body, {}, auth);
    } catch (error) {
      return k500Error;
    }
  }

  async refundAmount(payId: string) {
    try {
      const url = kRazorPayments + payId + '/refund';

      const response = await this.api.post(url, {}, {}, auth);
      if (response == k500Error) return k500Error;
      return response;
    } catch (error) {
      return k500Error;
    }
  }

  async fetchPaymemtByPaymentid(paymentId: string): Promise<any> {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error) {
      return null;
    }
  }

  async fetchAllSettledAmount(query): Promise<any> {
    try {
      let filter = '';
      for (const key in query) {
        if (Object.prototype.hasOwnProperty.call(query, key)) {
          filter += `${key}=${query[key]}&`;
        }
      }
      return await this.api.get(
        `${RAZORPAY_API_URL}settlements?${filter}`,
        {},
        {},
        {
          auth: {
            username: process.env.RAZOR_PAY_ID,
            password: process.env.RAZOR_PAY_KEY,
          },
        },
      );
    } catch (error) {
      return kInternalError;
    }
  }

  async fetchAllOndemandSettledAmount(query): Promise<any> {
    try {
      let filter = '';
      for (const key in query) {
        if (Object.prototype.hasOwnProperty.call(query, key)) {
          filter += `${key}=${query[key]}&`;
        }
      }
      return await this.api.get(
        `${RAZORPAY_API_URL}settlements/ondemand?${filter}`,
        {},
        {},
        {
          auth: {
            username: process.env.RAZOR_PAY_ID,
            password: process.env.RAZOR_PAY_KEY,
          },
        },
      );
    } catch (error) {
      return kInternalError;
    }
  }

  // async createOrder(orderData: RazorOrderCreate): Promise<any> {
  //   return await this.razorpay.orders.create(orderData);
  // }

  async fetchCardDetails(payment_id: string): Promise<any> {
    return await this.api.get(
      `${RAZORPAY_API_URL}payments/${payment_id}/?expand[]=card`,
      undefined,
      undefined,
      {
        auth: {
          username: process.env.RAZOR_PAY_ID,
          password: process.env.RAZOR_PAY_KEY,
        },
      },
    );
  }

  async fetchpaymentsDetails(query: any): Promise<any> {
    try {
      let filter = '';
      for (const key in query) {
        if (Object.prototype.hasOwnProperty.call(query, key)) {
          filter += `${key}=${query[key]}&`;
        }
      }
      return await this.api.get(
        `${RAZORPAY_API_URL}payments?${filter}`,
        {},
        {},
        {
          auth: {
            username: process.env.RAZOR_PAY_ID,
            password: process.env.RAZOR_PAY_KEY,
          },
        },
      );
    } catch (error) {
      return kInternalError;
    }
  }

  async fetchOrderByOrderid(orderId: string) {
    return await this.razorpay.orders.fetch(orderId);
  }

  async fetchPaymentFromOrderId(orderId: string) {
    return await this.razorpay.orders.fetchPayments(orderId);
  }

  async fetchPayoutById(payoutId: string) {
    return await this.api.get(
      `${RAZORPAY_API_URL}payouts/${payoutId}`,
      undefined,
      undefined,
      {
        auth: {
          username: process.env.RAZOR_PAY_ID,
          password: process.env.RAZOR_PAY_KEY,
        },
      },
    );
  }

  async createRazorPaylink(
    amount: number,
    loanId: number,
    userInfo: any,
    smsStatus = false,
  ) {
    const date = new Date();
    date.setHours(date.getHours() + 4);
    const unixDate = parseInt((date.getTime() / 1000).toFixed(0));
    // const decryptedPhone = await this.cryptService.decryptPhone(userInfo.phone);
    // if (decryptedPhone == k500Error) return k500Error;
    const payRequest = {
      customer: {
        name: userInfo.fullName,
        email: userInfo.email,
        contact: userInfo.phone,
      },
      reminder_enable: smsStatus === true ? true : false,
      email_notify: smsStatus === true ? true : false,
      sms_notify: smsStatus === true ? true : false,
      type: 'link',
      amount: (amount * 100).toFixed(0),
      currency: 'INR',
      description: `EMI payment against loan id - ${loanId}`,
      receipt: this.commonService.getRandomId(),
      callback_url: RAZORPAY_CALLBACK_URL,
      callback_method: 'get',
      expire_by: unixDate,
    };

    try {
      return await this.api.post(
        `${RAZORPAY_API_URL}invoices/`,
        payRequest,
        undefined,
        {
          username: process.env.RAZOR_PAY_ID,
          password: process.env.RAZOR_PAY_KEY,
        },
      );
    } catch (error) {
      return null;
    }
  }

  async createRazorpayOrderLink(amount: number, loanId: number, userInfo: any) {
    const date = new Date();
    date.setMinutes(24.5 * 60);
    const unixDate = parseInt((date.getTime() / 1000).toFixed(0));

    const decryptedPhone = await this.cryptService.decryptPhone(userInfo.phone);
    if (decryptedPhone == k500Error) return k500Error;
    const payRequest = {
      customer: {
        name: userInfo.fullName,
        email: userInfo.email,
        contact: decryptedPhone,
      },
      type: 'link',
      amount: amount * 100,
      currency: 'INR',
      description: `EMI payment against loan id - ${loanId}`,
      receipt: this.commonService.getRandomId(),
      callback_url: RAZORPAY_CALLBACK_URL,
      callback_method: 'get',
      expire_by: unixDate,
    };
    try {
      return await this.api.post(
        `${RAZORPAY_API_URL}invoices/`,
        payRequest,
        undefined,
        {
          username: process.env.RAZOR_PAY_ID,
          password: process.env.RAZOR_PAY_KEY,
        },
      );
    } catch (error) {
      return null;
    }
  }

  async getpaymentStatusOrderStatus(transactionId: string) {
    try {
      return await this.api.get(
        `${RAZORPAY_API_URL}orders/${transactionId}`,
        undefined,
        undefined,
        {
          auth: {
            password: process.env.RAZOR_PAY_KEY,
            username: process.env.RAZOR_PAY_ID,
          },
        },
      );
    } catch (error) {
      return null;
    }
  }

  async getPaymentStatus(inoviceId: string) {
    try {
      return await this.api.get(
        `${RAZORPAY_API_URL}invoices/${inoviceId}`,
        undefined,
        undefined,
        {
          auth: {
            password: process.env.RAZOR_PAY_KEY,
            username: process.env.RAZOR_PAY_ID,
          },
        },
      );
    } catch (error) {
      return null;
    }
  }

  async getPaymentDetails(payment_id: string): Promise<any> {
    try {
      return await this.api.get(
        `${RAZORPAY_API_URL}payments/${payment_id}/?expand[]=card`,
        undefined,
        undefined,
        {
          auth: {
            password: process.env.RAZOR_PAY_KEY,
            username: process.env.RAZOR_PAY_ID,
          },
        },
      );
    } catch (error) {
      return null;
    }
  }

  //#region get razorpay link
  async createRazorpay(data, isSend = false) {
    try {
      data.amount = Math.floor(data.amount);
      const toDate = new Date();
      toDate.setHours(23, 59, 59, 59);
      const expire_by = parseInt((toDate.getTime() / 1000).toFixed(0));
      const body = {
        amount: data.amount * 100,
        currency: 'INR',
        accept_partial: false,
        expire_by,
        reference_id: EnvConfig.nbfc.nbfcCodeName + new Date().getTime(),
        description: 'Payment against loan id - ' + data.loanId,
        customer: { name: data.name, contact: data.phone, email: data.email },
        notify: { sms: isSend, email: isSend },
        reminder_enable: true,
        callback_url: CHECK_CALLBACK_V2_URL,
        callback_method: 'get',
      };

      const response = await this.api.post(
        kRazorPaymentsLink,
        body,
        undefined,
        {
          username: process.env.RAZOR_PAY_ID,
          password: process.env.RAZOR_PAY_KEY,
        },
      );
      if (!response || response === k500Error) return k500Error;
      const orderData = await this.getOrderIdFromPaylinkId(
        response.short_url,
        response.id,
      );
      if (orderData?.message) return kInternalError;

      return {
        order_id: orderData.order_id,
        response: JSON.stringify(response),
        payLink: response.short_url,
      };
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region check razorpay payment
  async checkPayment(orderId: string) {
    try {
      const paymentData: any = { status: 'INITIALIZED' };
      if (orderId.includes('plink_'))
        orderId = await this.checkPaymentLinks(orderId);
      if (orderId.includes('inv_'))
        orderId = await this.checkPaymentInvoices(orderId);
      if (orderId === k500Error || !(orderId ?? '').includes('order_'))
        return paymentData;
      const response = await this.checkOrder(orderId);
      if (!response || response === k500Error) return paymentData;
      const items = response?.items ?? [];
      for (let index = 0; index < items.length; index++) {
        try {
          const element = items[index];
          if (element.status == 'captured') {
            paymentData.status = 'COMPLETED';
            paymentData.utr = element.id;
            paymentData.response = JSON.stringify(response);
            const paymentDate = new Date(+element.created_at * 1000);
            paymentData.paymentDate =
              this.typeService.getGlobalDate(paymentDate);
          }
        } catch (error) {}
      }
      return paymentData;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region check payment links
  private async checkPaymentLinks(id) {
    try {
      const result = await this.api.get(
        kRazorPaymentsLink + id,
        undefined,
        undefined,
        this.authConfig,
      );
      if (!result || result === k500Error) return k500Error;
      return result.order_id;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region check payment invoices
  private async checkPaymentInvoices(id) {
    try {
      const result = await this.api.get(
        kRazorInvoices + id,
        undefined,
        undefined,
        this.authConfig,
      );
      if (!result || result === k500Error) return k500Error;
      return result.order_id;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region check order
  private async checkOrder(id) {
    try {
      const url = kRazorOrders + id + '/payments';

      const result = await this.api.get(
        url,
        undefined,
        undefined,
        this.authConfig,
      );
      if (!result || result === k500Error) return k500Error;
      return result;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region get OrderId from paylinkId
  private async getOrderIdFromPaylinkId(short_url, paymentLinkId) {
    const openShortURL = await this.api.get(short_url);
    if (!openShortURL || openShortURL == k500Error) throw new Error();

    const url = kRazorPaymentsLink + paymentLinkId;

    const result = await this.api.get(url, {}, {}, this.authConfig);
    if (!result || result === k500Error) throw new Error();
    return result;
  }

  //#endregion
}
