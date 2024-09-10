// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  ICICI_BASE_URL,
  ICICI_MERCHANT_ID,
  ICICI_TERMINAL_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import * as moment from 'moment';
import { EnvConfig } from 'src/configs/env.config';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { Op } from 'sequelize';
const fs = require('fs');
const crypto = require('crypto');

@Injectable()
export class ICICIThirdParty {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly transactionRepo: TransactionRepository,
    @Inject(forwardRef(() => SharedTransactionService))
    private readonly sharedTransactionService: SharedTransactionService,
  ) {}

  async CollectPay(reqData: any) {
    try {
      const payerVa = reqData?.payerVa;
      if (!payerVa) return kParamMissing('payerVa');
      // if (process.env.MODE == 'UAT') reqData.amount = 1;
      const amount = reqData?.amount;
      if (!amount) return kParamMissing('amount');
      const note = reqData?.note;
      if (!note) return kParamMissing('note');
      const merchantTranId = reqData?.merchantTranId;
      if (!merchantTranId) return kParamMissing('merchantTranId');

      const todayDate = moment(new Date())
        .add(1, 'days')
        .format('DD/MM/YYYY hh:mm A');
      const randomBillNumber = this.typeService.generateRandomCode(12);

      const jsonObject = {
        merchantId: ICICI_MERCHANT_ID,
        merchantName: EnvConfig.nbfc.nbfcName,
        subMerchantId: ICICI_MERCHANT_ID,
        subMerchantName: EnvConfig.nbfc.nbfcName,
        terminalId: ICICI_TERMINAL_ID,
        collectByDate: todayDate,
        billNumber: EnvConfig.nbfc.nbfcCodeName + randomBillNumber,
        ...reqData,
      };
      const base64EncodedData = await this.encryptJsonForICICI(jsonObject);
      const headers = await this.getICICIHeaders();

      // Construct the final request URL
      const gatewayURL = ICICI_BASE_URL + '/CollectPay3/' + ICICI_MERCHANT_ID;
      const result = await this.api.ICICIPost(
        gatewayURL,
        base64EncodedData,
        headers,
      );
      if (result == k500Error) return kInternalError;
      const decryptedResponse = await this.decryptICICIResponse(result);
      if (decryptedResponse.success == 'false') {
        if (
          decryptedResponse.message == 'PSP is not registered' ||
          decryptedResponse.message == 'Invalid VPA'
        )
          decryptedResponse.message = 'Invalid UPI Id';
        return k422ErrorMessage(decryptedResponse.message);
      }
      delete decryptedResponse.message;
      decryptedResponse.responseCode = decryptedResponse?.response;
      delete decryptedResponse?.response;
      return {
        merchantTranId: decryptedResponse?.merchantTranId,
        response: JSON.stringify(decryptedResponse),
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async callback(body) {
    try {
      const decryptedResponse = body;
      if (decryptedResponse?.TxnStatus == 'SUCCESS')
        decryptedResponse.status = 'COMPLETED';
      if (decryptedResponse?.TxnStatus == 'FAILURE')
        decryptedResponse.status = 'FAILED';
      if (
        decryptedResponse?.status == 'FAILED' ||
        decryptedResponse?.status == 'COMPLETED'
      ) {
        const attributes = [
          'status',
          'createdAt',
          'emiId',
          'id',
          'loanId',
          'paidAmount',
          'source',
          'subSource',
          'type',
          'userId',
          'utr',
          'completionDate',
          'updatedAt',
        ];
        const options: any = {
          where: {
            transactionId: decryptedResponse?.merchantTranId,
            status: {
              [Op.ne]: 'COMPLETED',
            },
          },
        };

        const transData = await this.transactionRepo.getRowWhereData(
          attributes,
          options,
        );
        if (transData == k500Error) return kInternalError;

        if (
          (transData?.status == 'INITIALIZED' &&
            (decryptedResponse?.status == 'FAILED' ||
              decryptedResponse?.status == 'COMPLETED')) ||
          (transData?.status == 'FAILED' &&
            decryptedResponse?.status == 'COMPLETED')
        ) {
          decryptedResponse.response = JSON.stringify(decryptedResponse);
          //for converting time stamp in global date formate
          let originalTxnCompletionDate = decryptedResponse?.TxnCompletionDate;
          const year = originalTxnCompletionDate.slice(0, 4);
          const month = originalTxnCompletionDate.slice(4, 6);
          const day = originalTxnCompletionDate.slice(6, 8);
          const hour = originalTxnCompletionDate.slice(8, 10);
          const minute = originalTxnCompletionDate.slice(10, 12);
          const second = originalTxnCompletionDate.slice(12, 14);
          let paymentDate = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:${second}`,
          );
          paymentDate.setMinutes(paymentDate.getMinutes());
          paymentDate = this.typeService.getGlobalDate(paymentDate);
          decryptedResponse.paymentDate = paymentDate;
          delete decryptedResponse?.TxnCompletionDate;

          let paymentData: any = {};
          paymentData.id = transData?.id;
          paymentData.status = decryptedResponse?.status;
          paymentData.response = decryptedResponse?.response;
          paymentData.utr = decryptedResponse?.BankRRN;
          paymentData.completionDate = decryptedResponse?.paymentDate.toJSON();
          paymentData.type = transData?.type;
          paymentData.loanId = transData?.loanId;
          paymentData.userId = transData?.userId;
          if (transData?.emiId) paymentData.emiId = transData?.emiId;

          await this.sharedTransactionService.markTransactionAsComplete(
            paymentData,
          );
        }
      }
      return decryptedResponse;
    } catch (error) {
      return kInternalError;
    }
  }

  async TransactionStatus(reqData: any) {
    try {
      const merchantTranId = reqData?.transactionId;
      if (!merchantTranId) return kParamMissing('merchantTranId');

      const jsonObject = {
        merchantId: ICICI_MERCHANT_ID,
        subMerchantId: ICICI_MERCHANT_ID,
        terminalId: ICICI_TERMINAL_ID,
        merchantTranId,
      };
      const base64EncodedData = await this.encryptJsonForICICI(jsonObject);
      const headers = await this.getICICIHeaders();

      // Construct the final request URL
      const gatewayURL =
        ICICI_BASE_URL + '/TransactionStatus3/' + ICICI_MERCHANT_ID;

      const result = await this.api.ICICIPost(
        gatewayURL,
        base64EncodedData,
        headers,
      );
      if (result == k500Error) return kInternalError;
      const decryptedResponse = await this.decryptICICIResponse(result);
      if (decryptedResponse.success == 'false')
        return k422ErrorMessage(decryptedResponse.message);
      delete decryptedResponse.message;
      decryptedResponse.responseCode = decryptedResponse?.response;
      delete decryptedResponse?.response;
      return decryptedResponse;
    } catch (error) {
      return kInternalError;
    }
  }

  async CallbackStatus(reqData: any) {
    try {
      const merchantTranId = reqData?.transactionId;
      if (!merchantTranId) return kParamMissing('merchantTranId');
      const transactionType = reqData?.transactionType;
      if (!transactionType) return kParamMissing('transactionType');

      const jsonObject = {
        merchantId: ICICI_MERCHANT_ID,
        subMerchantId: ICICI_MERCHANT_ID,
        terminalId: ICICI_TERMINAL_ID,
        merchantTranId,
        transactionType,
      };
      const base64EncodedData = await this.encryptJsonForICICI(jsonObject);
      const headers = await this.getICICIHeaders();

      // Construct the final request URL
      const gatewayURL =
        ICICI_BASE_URL + '/CallbackStatus2/' + ICICI_MERCHANT_ID;

      const result = await this.api.ICICIPost(
        gatewayURL,
        base64EncodedData,
        headers,
      );
      if (result == k500Error) return kInternalError;
      const decryptedResponse = await this.decryptICICIResponse(result);
      if (decryptedResponse.success == 'false')
        return k422ErrorMessage(decryptedResponse.message);
      delete decryptedResponse.message;
      decryptedResponse.responseCode = decryptedResponse?.response;
      delete decryptedResponse?.response;
      if (decryptedResponse?.status == 'SUCCESS')
        decryptedResponse.status = 'COMPLETED';
      if (decryptedResponse?.status == 'FAIL')
        decryptedResponse.status = 'FAILED';
      decryptedResponse.response = JSON.stringify(decryptedResponse);
      //for converting time stamp in global date formate
      let originalTxnCompletionDate = decryptedResponse?.TxnCompletionDate;
      const year = originalTxnCompletionDate.slice(0, 4);
      const month = originalTxnCompletionDate.slice(4, 6);
      const day = originalTxnCompletionDate.slice(6, 8);
      const hour = originalTxnCompletionDate.slice(8, 10);
      const minute = originalTxnCompletionDate.slice(10, 12);
      const second = originalTxnCompletionDate.slice(12, 14);
      const hour12 = hour % 12 || 12;
      const period = hour < 12 ? 'AM' : 'PM';
      const formattedDateForUI = `${day}/${month}/${year} ${hour12}:${minute} ${period}`;
      let paymentDate = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:${second}`,
      );
      paymentDate.setMinutes(paymentDate.getMinutes());
      paymentDate = this.typeService.getGlobalDate(paymentDate);
      decryptedResponse.paymentDate = paymentDate;
      decryptedResponse.formattedDateForUI = formattedDateForUI;
      delete decryptedResponse?.TxnCompletionDate;
      return decryptedResponse;
    } catch (error) {
      return kInternalError;
    }
  }

  async Refund(reqData: any) {
    try {
      const merchantTranId = reqData?.transactionId;
      if (!merchantTranId) return kParamMissing('merchantTranId');
      const originalmerchantTranId = reqData?.orderId;
      if (!originalmerchantTranId)
        return kParamMissing('originalmerchantTranId');
      const refundAmount = reqData?.amount;
      if (!refundAmount) return kParamMissing('refundAmount');
      const ICICIPayRes = reqData?.ICICIPayRes
        ? JSON.parse(reqData?.ICICIPayRes)
        : {};
      const originalBankRRN =
        ICICIPayRes?.OriginalBankRRN ?? ICICIPayRes?.BankRRN;
      if (!originalBankRRN) return kParamMissing('originalBankRRN');
      const loanId = reqData?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const onlineRefund = 'Y';
      const note = `${EnvConfig.nbfc.nbfcCodeName}-REFUND-${loanId}`;
      const jsonObject = {
        merchantId: ICICI_MERCHANT_ID,
        subMerchantId: ICICI_MERCHANT_ID,
        terminalId: ICICI_TERMINAL_ID,
        merchantTranId,
        originalmerchantTranId,
        refundAmount,
        originalBankRRN,
        onlineRefund,
        note,
      };
      const base64EncodedData = await this.encryptJsonForICICI(jsonObject);
      const headers = await this.getICICIHeaders();

      // Construct the final request URL
      const gatewayURL = ICICI_BASE_URL + '/Refund/' + ICICI_MERCHANT_ID;

      const result = await this.api.ICICIPost(
        gatewayURL,
        base64EncodedData,
        headers,
      );

      if (result == k500Error) return kInternalError;
      const decryptedResponse = await this.decryptICICIResponse(result);
      if (decryptedResponse.success == 'false')
        return k422ErrorMessage(decryptedResponse.message);
      delete decryptedResponse.message;
      decryptedResponse.responseCode = decryptedResponse?.response;
      delete decryptedResponse?.response;
      if (decryptedResponse?.status === 'SUCCESS')
        decryptedResponse.status = 'COMPLETED';
      if (decryptedResponse?.status === 'FAIL')
        decryptedResponse.status = 'FAILED';

      return {
        status: decryptedResponse?.status,
        utr: `RE-${decryptedResponse?.originalBankRRN}`,
        response: JSON.stringify(decryptedResponse),
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async QR(reqData: any) {
    try {
      const amount = reqData?.targetAmount;
      if (!amount) return kParamMissing('amount');
      const merchantTranId = reqData?.merchantTranId;
      if (!merchantTranId) return kParamMissing('merchantTranId');

      const randomBillNumber = this.typeService.generateRandomCode(12);
      const jsonObject = {
        merchantId: ICICI_MERCHANT_ID,
        terminalId: ICICI_TERMINAL_ID,
        merchantTranId,
        billNumber: EnvConfig.nbfc.nbfcCodeName + randomBillNumber,
        amount,
      };
      const base64EncodedData = await this.encryptJsonForICICI(jsonObject);
      const headers = await this.getICICIHeaders();

      // Construct the final request URL
      const gatewayURL = ICICI_BASE_URL + '/QR3/' + ICICI_MERCHANT_ID;

      const result = await this.api.ICICIPost(
        gatewayURL,
        base64EncodedData,
        headers,
      );

      if (result == k500Error) return kInternalError;
      const decryptedResponse = await this.decryptICICIResponse(result);
      if (decryptedResponse.success == 'false')
        return k422ErrorMessage(decryptedResponse.message);
      delete decryptedResponse.message;
      return decryptedResponse;
    } catch (error) {
      return kInternalError;
    }
  }

  async encryptJsonForICICI(body) {
    try {
      const url = EnvConfig.server.encServerBaseUrl + 'enc';
      const response = await this.api.post(url, body);
      return response?.data;
    } catch (error) {
      console.log('ICICI Encryption Error', body, error);
      return kInternalError;
    }
  }

  async getICICIHeaders() {
    const headers = {
      accept: '*/*',
      'accept-encoding': '*',
      'accept-language': 'en-US,en;q=0.8,hi;q=0.6',
      'cache-control': 'no-cache',
      'Content-Type': 'text/plain',
    };
    return headers;
  }

  async decryptICICIResponse(ICICIres) {
    const url = EnvConfig.server.encServerBaseUrl + 'decr';
    const body = { encData: ICICIres };
    return await this.api.post(url, body);
  }
}
