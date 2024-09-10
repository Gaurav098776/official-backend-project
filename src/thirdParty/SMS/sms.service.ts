// Imports
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  gIsPROD,
  MSG91,
  NIMBUS,
  NIMBUS_SERVICE,
  SEND_OTP_TEMPLATE,
  SYSTEM_ADMIN_ID,
  templateDesign,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  DLT_REG_ID,
  MSG91_URL,
  NIMBUS_PASSWORD,
  NIMBUS_SEND_URL,
  NIMBUS_USERNAME,
} from 'src/constants/network';
import {
  kLspMSG91Headers,
  kLspMsg91Templates,
  kMSG91Headers,
  kMsg91Templates,
} from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
} from 'src/constants/responses';
import { kNoDataFound } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
var http = require('https');

@Injectable()
export class AllsmsService {
  constructor(
    private readonly api: APIService,
    private readonly cryptService: CryptService,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly userRepo: UserRepository,
    private readonly sharedCommonService: CommonSharedService,
    private readonly staticConfigRepo: StaticConfigRepository,
  ) {}

  async sendSMS(phone, service = MSG91, options: any = { smsId: '' }) {
    try {
      // if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE') return;
      if (Array.isArray(phone)) {
        for (let index = 0; index < phone.length; index++) {
          try {
            const ele = phone[index];
            await this.manageSmsServices(ele, options, service);
          } catch (error) {}
        }
      } else return await this.manageSmsServices(phone, options, service);
    } catch (error) {}
  }

  private async manageSmsServices(phone, options, service) {
    try {
      if (NIMBUS_SERVICE && service == NIMBUS)
        return await this.nimbusSMS(phone, options);
      else return await this.msg91(phone, options);
    } catch (error) {}
  }

  private async msg91(phone, options: any = { smsId: '' }) {
    try {
      if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE') return;
      const smsId = options?.smsId;
      const adminId = options?.adminId;
      const appType = options?.appType;
      let uNumber = phone;
      let body: any = {
        flow_id: smsId,
        sender: appType == 1 ? kMSG91Headers.sender : kLspMSG91Headers.sender,
        appType,
      };
      body = {
        ...body,
        ...options,
      };
      if (typeof phone == 'object' && !Array.isArray(phone) && phone != null) {
        let number = phone?.mobiles;
        if (isNaN(number)) number = this.cryptService.decryptPhone(number);
        phone.mobiles = '91' + number;
        body = { ...body, ...phone };
        uNumber = number;
      } else {
        if (isNaN(phone)) phone = this.cryptService.decryptPhone(phone);
        body.mobiles = '91' + phone;
        uNumber = phone;
      }
      const headers = appType == 1 ? kMSG91Headers : kLspMSG91Headers;
      await this.api.post(MSG91_URL, body, headers);
      const tData = { adminId, service: MSG91, smsId, body };
      await this.trackSendSMS(uNumber, tData);
      return true;
    } catch (error) {}
  }

  private async nimbusSMS(phone, options: any = { smsId: '' }) {
    try {
      if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE') return;
      const templateId = options?.smsId; // templateId of DLT
      const message = options?.message;
      if (!templateId || !message) return kParamsMissing;
      const adminId = options?.adminId;
      let uNumber = phone;
      let numbers = '';
      if (typeof phone == 'object' && !Array.isArray(phone) && phone != null) {
        let number = phone?.mobiles;
        if (isNaN(number)) number = this.cryptService.decryptPhone(number);
        numbers = '91' + number;
        uNumber = number;
      } else {
        if (isNaN(phone)) phone = this.cryptService.decryptPhone(phone);
        numbers = '91' + phone;
        uNumber = phone;
      }
      const url =
        NIMBUS_SEND_URL +
        `username=${NIMBUS_USERNAME}&password=${NIMBUS_PASSWORD}&sender=LNDITT&sendto=${numbers}&entityID=${DLT_REG_ID}&templateID=${templateId}&message=${message}`;
      await this.api.post(url);

      const tData = {
        adminId,
        service: MSG91,
        smsId: templateId,
        content: message,
      };
      await this.trackSendSMS(uNumber, tData);
      return true;
    } catch (error) {}
  }

  async trackSendSMS(phone, data) {
    try {
      const adminId = data?.adminid;
      const smsId = data?.smsId;
      const service = data?.service;
      const appType = data?.body?.appType;
      let title = data?.body?.title ?? '';
      const refrenceId = data?.refrenceId ?? '';
      const content = data?.content;
      let sentBy;
      if (adminId && adminId != SYSTEM_ADMIN_ID) {
        sentBy = (await this.sharedCommonService.getAdminData(adminId))
          ?.fullName;
      }
      if (!title || title == '') {
        title =
          appType == 1
            ? kMsg91Templates[smsId]?.title
            : kLspMsg91Templates[smsId]?.title;
      }

      const source = this.cryptService.encryptPhone(phone);
      const userData: any = await this.getUserData(source);
      if (!userData.message) {
        const loanId = userData.loanId;
        const userId = userData.userId;
        const data = {
          isSender: false,
          status: 'Process',
          subStatus: 'sent',
          type: 'TEXT',
          source,
          userId,
          loanId,
          title,
          requestData: smsId,
          service,
          refrenceId,
          content,
          sentBy,
        };
        await this.mailTrackerRepo.create(data);
      }
      return true;
    } catch (error) {}
  }

  async callback(reqData) {
    try {
      const rawList = JSON.parse(reqData);

      // Get all requests
      for (let index = 0; index < rawList.length; index++) {
        const el = rawList[index];
        try {
          const requestId = el.requestId;
          // Get reports of particular requestId
          for (let index = 0; index < el.report.length; index++) {
            const subEl = el.report[index];
            try {
              let source = subEl.number.substring(2, 12);
              source = this.cryptService.encryptPhone(source);
              const userData: any = await this.getUserData(source);
              if (!userData.message) {
                const status = subEl.status == '1' ? 'Done' : 'Reject';
                const subStatus = subEl.desc?.toLowerCase();
                const statusDate = subEl.date ?? '';
                const refrenceId = requestId;
                const loanId = userData.loanId;
                const userId = userData.userId;
                const data = {
                  isSender: false,
                  source,
                  refrenceId,
                  status,
                  statusDate,
                  subStatus,
                  type: 'TEXT',
                  userId,
                  loanId,
                };
                await this.mailTrackerRepo.create(data);
              }
            } catch (error) {}
          }
        } catch (error) {}
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async getUserData(encryptedPhone) {
    try {
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['loanId'];
      const include = [masterInclude];
      let hashPhone: any;
      if (!isNaN(encryptedPhone)) {
        hashPhone = this.cryptService.getMD5Hash(encryptedPhone);
      } else {
        const number = await this.cryptService.decryptPhone(encryptedPhone);
        hashPhone = this.cryptService.getMD5Hash(number);
      }
      const attributes = ['id', 'appType'];
      const options = { include, where: { hashPhone } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const masterData = userData.masterData ?? {};
      const loanId = masterData.loanId;
      const appType = userData?.appType;
      return { loanId, userId: userData.id, appType };
    } catch (error) {
      return kInternalError;
    }
  }

  async sendOtp(otp, phone, smsKey = null, isAdmin = false) {
    if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE') return true;
    // if (!SMS_SERVICE) return true;
    if (!otp) return true;
    const encryptedPhone = !isNaN(phone)
      ? this.cryptService.encryptPhone(phone)
      : phone;
    let appType: any
    if(isAdmin){
      appType = templateDesign
    }else{
      const userData: any = await this.getUserData(encryptedPhone);
      appType = userData.appType;
    }
    if (isNaN(phone)) phone = this.cryptService.decryptPhone(phone);
    const smsCode = smsKey ?? (await this.getSMScode());

    // const msg91Key = kMSG91Headers.authkey;

    // const otpData = {
    //   method: 'GET',
    //   hostname: 'api.msg91.com',
    //   port: null,
    //   path: `/api/v5/otp?template_id=65efe7dfd6fc0505fd5c86a2&mobile=91${phone}&authkey=${msg91Key}&otp=${otp}&extra_param=%7B%22OTP%22%3A%22${otp}%22%2C%22KEY%22%3A%22${smsCode}%22%7D`,
    //   headers: {
    //     'content-type': 'application/json',
    //   },
    // };
    // //old 60ed946b84c9b56f1d66b926

    // const req = http.request(otpData, function (res) {
    //   const chunks = [];
    //   res.on('data', function (chunk) {
    //     chunks.push(chunk);
    //   });

    //   res.on('end', function () {
    //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //     const body = Buffer.concat(chunks);
    //   });
    // });
    // req.write(JSON.stringify({ OTP: otp, KEY: smsCode }));
    // req.end();
    const headers = appType == 1 ? kMSG91Headers : kLspMSG91Headers;
    const body = {
      flow_id:
        appType == 1
          ? kMsg91Templates.SEND_OTP_TEMPLATE
          : kLspMsg91Templates.SEND_OTP_TEMPLATE,
      sender: appType == 1 ? kMSG91Headers.sender : kLspMSG91Headers.sender,
      var1: otp,
      var2: smsCode,
      mobiles: '91' + phone,
    };
    await this.api.post(MSG91_URL, body, headers);
  }

  smsCode = '/lK3gtKYX67';
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
}
