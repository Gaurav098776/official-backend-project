import * as FCM from 'fcm-node';
import { Injectable } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { k500Error } from 'src/constants/misc';
const fs = require('fs');
import {
  nNewDeviceLogin,
  nNewDeviceLoginBody,
  nbfcInfoStr,
} from 'src/constants/strings';
import { gIsPROD } from 'src/constants/globals';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { kLoanRejected } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
@Injectable()
export class SenderService {
  fcm: any;
  constructor(
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly gmailService: GmailService,
  ) {
    this.fcm = new FCM(process.env.FCM_SERVER_KEY);
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data: any = {},
    needResponse = true,
    otherData: any = {},
  ) {
    try {
      if (process.env.NOTIFICATION_STATUS != 'TRUE') return k500Error;
      if (!gIsPROD) return k500Error;
      let message: any = { to: fcmToken, notification: { title, body } };
      if (data) message.data = data;
      message.data.showBackendNotification = false;
      return await this.fcm.send(message, (err, res) => {
        if (needResponse) {
          const type = 'NOTIFICATION';
          const userId = otherData.userId;
          const loanId = otherData.loanId;
          const passData = { loanId, userId, res, type, err, title, body };
          this.saveNotificationStatus(passData);
        }
      });
    } catch (error) {}
  }

  async sendNewLogInPushNotification(fcmToken: string) {
    if (process.env.NOTIFICATION_STATUS != 'TRUE') return k500Error;
    const data = { isLogout: 'true' };
    await this.sendPushNotification(
      fcmToken,
      nNewDeviceLogin,
      nNewDeviceLoginBody,
      data,
    );
  }

  async saveNotificationStatus(data) {
    try {
      let response: any = {};
      if (data.err) {
        response = JSON.parse(data.err);
      } else if (data.res) {
        response = JSON.parse(data.res);
      }
      let status = 'Process';
      if (response.success) status = 'Done';
      else if (response.failure) status = 'Reject';
      const refrenceId = response?.multicast_id ?? '';
      const { userId, loanId, type, body, title } = data;
      const createData = {
        userId,
        loanId,
        status,
        type,
        title,
        content: body,
        refrenceId,
      };
      await this.mailTrackerRepo.create(createData);
    } catch (error) {
      return k500Error;
    }
  }

  async loanRejectEmail(email: string, data: any) {
    try {
      const templatePath = kLoanRejected;
      const rawData = fs.readFileSync(templatePath);
      let htmlData = rawData.toString();
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = htmlData.replace(
        '##SUPPORTMAIL##',
        EnvConfig.mail.suppportMail,
      );
      htmlData = htmlData.replace(
        '##HELPCONTACT##',
        EnvConfig.number.helpContact,
      );
      htmlData = this.replaceAll(
        htmlData,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace(
        '##NBFCSNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace(
        '##APPNAME##',
        EnvConfig.nbfc.appCamelCaseName,
      );
      if (data.userName && htmlData.includes('##NAME##'))
        htmlData = htmlData.replace('##NAME##', data.userName);
      if (data.loanPur && htmlData.includes('##PURPOSE##'))
        htmlData = htmlData.replace('##PURPOSE##', data.loanPur);
      if (data.loanAmount && htmlData.includes('##AMOUNT##'))
        htmlData = htmlData.replace('##AMOUNT##', data.loanAmount);
      return await this.gmailService.sendEmail(
        email,
        'Loan Rejected',
        htmlData,
      );
    } catch (error) {}
  }
  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
}
