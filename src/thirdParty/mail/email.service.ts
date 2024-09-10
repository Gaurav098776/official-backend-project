import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import * as nodemailer from 'nodemailer';
import { kSendingBlueAuth } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { APIService } from 'src/utils/api.service';
import { getSmsUuid } from 'src/constants/strings';
import { smsTrackURL } from 'src/constants/strings';

@Injectable()
export class MailService {
  transporter = nodemailer.createTransport({
    service: 'SendinBlue',
    auth: kSendingBlueAuth,
  });
  constructor(
    private readonly api: APIService,
    private readonly mailTrackingRepo: MailTrackerRepository,
  ) {}
  async sendMail(mailConfig, needResponse = false) {
    try {
      const response = await this.transporter.sendMail(mailConfig);
      if (needResponse) this.checkMailStatus(response);
      return response;
    } catch (error) {
      return k500Error;
    }
  }
  async checkMailStatus(response) {
    try {
      let status = '';
      const errorStatuses = [
        'error',
        'blocked',
        'unsubscribed',
        'invalid_email',
        'hard_bounce',
        'deferred',
      ];
      const onProcess = ['soft_bounce', 'spam'];
      if (errorStatuses.includes(response.event)) status = 'Reject';
      if (['click', 'open'].includes(response.event)) status = 'Done';
      if (onProcess.includes(response.event)) status = 'Process';
      return status;
    } catch (error) {
      return k500Error;
    }
  }

  async getMailTrackingResponse(refrenceId, matchWithEmail = []) {
    try {
      //get all mail uuids
      const uuids = await this.getUUIDFromEmail(refrenceId, matchWithEmail);
      const headers = {
        'api-key': process.env.SENDINBLUE_KEY,
      };
      const finalData = [];
      //track each email sent or not
      for (let i = 0; i < uuids.length; i++) {
        const messageId = uuids[i];
        const url = smsTrackURL + messageId;
        const apiget = await this.api.get(url, {}, headers);
        if (!apiget || apiget == k500Error) continue;
        finalData.push(apiget);
      }
      return finalData;
    } catch (Error) {
      return kInternalError;
    }
  }

  async getUUIDFromEmail(referenceId, matchWithEmail = []) {
    try {
      const url = getSmsUuid + referenceId;
      const headers = {
        'api-key': process.env.SENDINBLUE_KEY,
      };
      const apiRes = await this.api.get(url, {}, headers);
      if (apiRes == k500Error || !apiRes)
        return k422ErrorMessage('uuid data not found!');
      let transactionalEmails = apiRes?.transactionalEmails ?? [];
      if (matchWithEmail.length > 0)
        transactionalEmails = transactionalEmails.filter((tran) =>
          matchWithEmail.includes(tran.email),
        );
      return transactionalEmails.map((item) => item.uuid);
    } catch (Error) {
      return kInternalError;
    }
  }
}
