import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { MSG91_URL } from 'src/constants/network';
import { APIService } from './api.service';
import { CryptService } from './crypt.service';
import * as env from 'dotenv';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { Msg91Str } from 'src/constants/strings';

env.config();

const headers = {
  authkey: process.env.MSG91_AUTH_KEY,
  'content-type': 'application/JSON',
};

@Injectable()
export class Msg91Service {
  constructor(
    private readonly apiService: APIService,
    private readonly cryptService: CryptService,
    private readonly staticConfigRepo: StaticConfigRepository,
  ) {}

  smsCode = Msg91Str.autoFillKey;
  lastUpdateTime = 0;
  //#region get sms code
  private async getSMScode() {
    try {
      const date = new Date();
      if (this.lastUpdateTime > date.getTime() && this.smsCode)
        return this.smsCode;
      const staticData = await this.staticConfigRepo.getRowWhereData(['data'], {
        where: { type: 'SENTOTPCODE' },
      });
      if (staticData == k500Error) return this.smsCode;
      const sData = staticData?.data;
      this.smsCode = sData ? JSON.parse(sData[0]).code : this.smsCode;
    } catch (error) {}
    return this.smsCode;
  }
  //#endregion

  async ManualCompanyRejection(name, mobile, reason) {
    if (process.env.CRON_STATUS != 'TRUE') {
      return;
    } else {
      if (isNaN(mobile)) {
        mobile = await this.cryptService.decryptPhone(mobile);
      }
      let idx = 0;
      for (let i = 0; i < reason.length; i++) {
        if (reason[i] !== '.' && reason[i] !== ',' && reason[i] !== ' ') {
          idx = i;
        }
      }
      let updatedReason = '';
      if (idx < reason.length) {
        updatedReason = reason.substr(0, idx);
      }
      const body = {
        name,
        mobile,
        updatedReason,
      };
      this.apiService.post(MSG91_URL, body, headers);
    }
  }
}
