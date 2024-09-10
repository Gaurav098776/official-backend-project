// Imports
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  GET_COMPARE_ACCOUNT,
  kGetFraudUsers,
  kRemovePassword,
  kSyncTrans,
  nGetPdfUrl,
  PRIMARY_BANKINGPRO_URL,
  SECONDARY_BANKINGPRO_URL,
  UPDATE_ACCOUNT_NUMBER,
} from 'src/constants/network';
import { kBankingProHeaders, kDevBankAccs } from 'src/constants/objects';
import { APIService } from 'src/utils/api.service';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { gIsPROD } from 'src/constants/globals';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { kSomthinfWentWrong } from 'src/constants/strings';

@Injectable()
export class AuthAiService {
  constructor(
    private readonly api: APIService,
    private readonly commonService: CommonSharedService,
  ) {}

  async removePassword(filePath: string, password: string, fileUrl?: string) {
    try {
      let base64;
      if (filePath) {
        const data = fs.readFileSync(filePath);
        base64 = Buffer.from(data).toString('base64');
      }

      const url = PRIMARY_BANKINGPRO_URL + kRemovePassword;
      const body = { password, base64, url: fileUrl };
      const headers = kBankingProHeaders;

      const response = await this.api.requestPost(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (!response.valid) return kInternalError;
      if (filePath) await fs.unlinkSync(filePath);

      return await this.getPdfURL(response.data);
    } catch (error) {
      return kInternalError;
    }
  }

  async getPdfURL(filePath, accNumber = '') {
    try {
      let url = PRIMARY_BANKINGPRO_URL + nGetPdfUrl;
      const headers = kBankingProHeaders;
      const body = { fileName: filePath.replace('src/uploads/', '') };

      let response = await this.api.requestPost(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (!response.valid) {
        url = SECONDARY_BANKINGPRO_URL + nGetPdfUrl;
        response = await this.api.requestPost(url, body, headers);
        if (response == k500Error) return kInternalError;
        if (!response.valid) {
          // For development purpose only
          if (!gIsPROD && kDevBankAccs.includes(accNumber))
            return 'https://storage.googleapis.com/backend_static_stuff/1679643112768.pdf';
          return kInternalError;
        }
      }
      return response.url;
    } catch (error) {
      return kInternalError;
    }
  }

  async syncTransactions(data: any) {
    try {
      const url = PRIMARY_BANKINGPRO_URL + kSyncTrans;
      const body = data;
      const headers = kBankingProHeaders;

      const response = await this.api.requestPost(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (!response.valid) return k422ErrorMessage(response.message);
      return response.data;
    } catch (error) {
      return kInternalError;
    }
  }

  async getFraudUsers(accountId) {
    let url = PRIMARY_BANKINGPRO_URL + kGetFraudUsers;
    if (accountId) url = url + `?accountId=${accountId}`;
    const headers = kBankingProHeaders;
    const response = await this.api.requestGet(url, headers);
    if (response == k500Error) throw new Error();

    return response.data;
  }

  async updateMaskedAccNumber(
    maskAccountNumber: string,
    accountNumber: string,
    bankCode?: string,
  ) {
    try {
      const url = UPDATE_ACCOUNT_NUMBER;
      const body = { maskAccountNumber, accountNumber, bankCode };
      const result = await this.api.requestPost(url, body, kBankingProHeaders);
      if ((result?.valid ?? false) === true) return true;
      if (result == k500Error) return kInternalError;
      return false;
    } catch (error) {
      return kInternalError;
    }
  }

  async getCompareAccounts(query) {
    try {
      const url = GET_COMPARE_ACCOUNT + query;
      const headers = kBankingProHeaders;

      const response = await this.api.requestGet(url, headers);
      if (response == k500Error) return kInternalError;
      if (!response.valid) return k422ErrorMessage(response.message);
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  async findCompareTransaction(loanId, isCheckAddional = false) {
    try {
      let url = await this.commonService.getTansactionQueryParams(
        loanId,
        isCheckAddional,
      );
      if (url?.message) return url;
      url = GET_COMPARE_ACCOUNT + url;

      const result = await this.api.requestGet(url, kBankingProHeaders);
      if ((result?.valid ?? false) === true) return result;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      return kInternalError;
    }
  }
}
