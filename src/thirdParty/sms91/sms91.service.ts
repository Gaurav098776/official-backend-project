import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { k500Error } from 'src/constants/misc';
import { MSG91_URL, MSG_DLV_URL } from 'src/constants/network';
import { kMSG91Headers } from 'src/constants/objects';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
const request = require('request');
// eslint-disable-next-line @typescript-eslint/no-var-requires
@Injectable()
export class SmsService {
  constructor(
    private readonly api: APIService,
    private readonly cryptService: CryptService,
  ) {}
  async sendSMS(phone: any, smsId: string, options: any = {}) {
    try {
      if (process.env.MODE != 'PROD') return;

      if (isNaN(phone)) {
        phone = await this.cryptService.decryptPhone(phone);
      }
      const body: any = {
        flow_id: smsId,
        mobiles: '91' + phone,
        sender: 'LNDITT',
        ...options,
      };
      const response = await this.api.post(MSG91_URL, body, kMSG91Headers);
      if (response == k500Error) return k500Error;
      const date = new Date();
      const passData = {
        phone,
        date,
        desc: '1',
        status: '1',
        reqId: response.message,
      };
      this.smsDeliveredStatus(passData);
    } catch (error) {
      return k500Error;
    }
  }
  async smsDeliveredStatus(passData) {
    try {
      if (process.env.MODE != 'PROD') return;

      if (passData.phone)
        if (isNaN(passData.phone)) {
          passData.phone = await this.cryptService.decryptPhone(passData.phone);
        }

      const msgUrl = `${MSG_DLV_URL}?phone=${passData?.phone}&date=${passData?.date}&desc=${passData?.desc}&status=${passData?.status}&reqid=${passData?.reqId}`;
      return await this.api.post(msgUrl, kMSG91Headers);
    } catch (error) {
      return k500Error;
    }
  }
}
