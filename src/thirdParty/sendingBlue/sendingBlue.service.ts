// Imports
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kWrongDetails,
} from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import {
  getSmsUuid,
  kEmailService,
  kLSPFromName,
  kNBFC,
  kNBFCFromName,
  kNoReplyMail,
  kSupportMail,
  smsTrackURL,
} from 'src/constants/strings';
import { GmailService } from 'src/utils/gmail.service';
import { GlobalServices, gIsPROD } from 'src/constants/globals';
import { SendGridService } from '../sendGrid/sendGrid.service';
import { EnvConfig } from 'src/configs/env.config';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SendingBlueService {
  constructor(
    // Thirdparty services
    private readonly gmailService: GmailService,
    private readonly sendGridService: SendGridService,
    // Utils
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly redisService: RedisService,
  ) {}

  async sendMail(reqData) {
    const subject = reqData.subject;
    if (!subject) return kParamMissing('subject');
    const email = reqData.email;
    if (!email) return kParamMissing('email');
    const attachments = reqData.attachments ?? [];
    let ccMails = reqData.cc ?? [];
    let bccMails = reqData.bcc ?? [];
    const tags = reqData?.tags ?? [];
    const source = reqData?.source;
    if (typeof ccMails == 'string') ccMails = [ccMails];
    if (typeof bccMails == 'string') bccMails = [bccMails];
    let from = reqData?.from;
    let replyTo = reqData?.replyTo;
    if (!from) from = kNoReplyMail;
    if (!replyTo) replyTo = kSupportMail;
    const EMAIL_SERVICE = await this.redisService.get(kEmailService);

    // Check primary service as google
    if (EMAIL_SERVICE == 'GMAIL') {
      const response = await this.gmailService.sendEmail(
        email,
        subject,
        reqData.html ?? reqData.content,
        null,
        ccMails,
      );
      if (response)
        return { messageId: 'google-' + response.id, service: 'GMAIL' };
    }

    // Check primary service as sendGrid
    if (EMAIL_SERVICE == 'SENDGRID' || source == 'SENDGRID') {
      const response = await this.sendGridService.sendMail(
        email,
        subject,
        reqData?.html ?? reqData?.content,
        attachments,
        ccMails,
        bccMails,
        tags,
        replyTo,
        from,
        reqData.appType  
      );
      if (response?.message) return response;
      return { messageId: response, service: 'SENDGRID' };
    }
    try {
      // URL
      const url = 'https://api.brevo.com/v3/smtp/email';

      // Auth
      const selectedCreds = reqData.appType
        ? process.env.SENDINBLUE_KEY
        : process.env.LSP_BREVO_KEY;
      const headers = {
        'api-key': selectedCreds,
      };
      // Body preparation
      let splittedSpans = email;
      if (typeof splittedSpans == 'string')
        splittedSpans = splittedSpans.split(',');
      const targetEmails = [];
      splittedSpans.forEach((el) => {
        targetEmails.push({ email: el, name: 'User' });
      });
      const fromName = reqData.appType ? kNBFCFromName : kLSPFromName;
      const body: any = {
        sender: { name: fromName, email: from },
        replyTo: { email: replyTo },
        to: targetEmails,
        subject: reqData.subject,
        htmlContent: reqData.html,
        textContent: reqData.content,
      };
      if (tags.length > 0) body.tags = tags;
      const cc = [];
      if (ccMails.length > 0) {
        ccMails.forEach((el) => {
          try {
            cc.push({ email: el });
          } catch (error) {}
        });
        body.cc = cc;
      }
      const bcc = [];
      if (bccMails.length > 0) {
        bccMails.forEach((el) => {
          try {
            bcc.push({ email: el });
          } catch (error) {}
        });
        body.bcc = bcc;
      }

      // Attachments (URL or filepath is accepted not greater than 10MB)
      if (attachments.length > 0) {
        const attachment = [];
        for (let index = 0; index < attachments.length; index++) {
          try {
            const attachmentData = attachments[index];
            const data: any = { name: attachmentData.filename };

            if (attachmentData.path && !data.name) {
              const splittedSpans = attachmentData.path.split('/');
              data.name = splittedSpans[splittedSpans.length - 1];
            }

            if (
              attachmentData.path?.includes('http:') ||
              attachmentData.path?.includes('https:')
            ) {
              data.url = attachmentData.path;
            } else if (attachmentData.path) {
              data.content = await fs.readFileSync(
                attachmentData.path,
                'base64',
              );
            }

            attachment.push(data);
          } catch (error) {}
        }
        body.attachment = attachment;
      }
      const response = await this.api.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (response?.message) return response;
      return { ...response, service: 'BREVO' };
    } catch (error) {
      return kInternalError;
    }
  }

  async getEmailStatus(messageId, targetEmail, targetDate, keywords = []) {
    if (!targetEmail || !targetEmail.includes('@'))
      return k422ErrorMessage('Please enter valid email address');
    if (targetDate.length != 10)
      return k422ErrorMessage('Please provide readable date');
    let url = getSmsUuid + messageId;
    const headers = { 'api-key': process.env.SENDINBLUE_KEY };

    let response = await this.api.get(url, {}, headers);
    if (!response || response == k500Error) return kInternalError;
    // Brevo api 1 attempt failed
    if (!response.transactionalEmails) {
      const query = {
        email: targetEmail,
        startDate: targetDate,
        endDate: targetDate,
        sort: 'desc',
        limit: 50,
        offset: 0,
      };
      const newResponse = await this.api.get(smsTrackURL, query, headers);
      if (newResponse == k500Error || !response) return kInternalError;
      if (newResponse.transactionalEmails?.length == 0) return kInternalError;
      const targetStatusList = [];
      newResponse.transactionalEmails.forEach((el) => {
        if (el.subject) {
          keywords.forEach((word) => {
            if (el.subject?.toLowerCase()?.includes(word.toLowerCase())) {
              targetStatusList.push(el);
            }
          });
        }
      });
      response.transactionalEmails = targetStatusList;
    }
    if (response.transactionalEmails?.length == 0) return kInternalError;
    let responseData = response.transactionalEmails[0];
    // Checking request with any specific email
    responseData = response.transactionalEmails.find(
      (el) => el.email == targetEmail,
    );
    if (!responseData) return kInternalError;
    if (!responseData.uuid) return kInternalError;

    url = smsTrackURL + responseData.uuid;
    response = await this.api.get(url, {}, headers);
    if (response == k500Error || !response) return kInternalError;
    if (!response.events || response.events?.length == 0) return kInternalError;

    const finalizedResponse = {
      isDelivered: false,
      isOpened: false,
      isClicked: false,
      isBounced: false,
      deliveryStatus: -1,
      latestDate: null,
      // Date of attempting to reach on source's email  (For legal emails)
      sourceDeliveryDate: null,
    };

    response.events.forEach((el) => {
      if (el.name == 'delivered') {
        finalizedResponse.isDelivered = true;
        if (finalizedResponse.deliveryStatus <= 2) {
          finalizedResponse.deliveryStatus = 2;
          if (el.time) {
            finalizedResponse.latestDate = this.typeService.getGlobalDate(
              new Date(el.time),
            );
            finalizedResponse.sourceDeliveryDate = finalizedResponse.latestDate;
          }
        }
      } else if (el.name == 'open') {
        finalizedResponse.isOpened = true;
        if (finalizedResponse.deliveryStatus <= 3) {
          finalizedResponse.deliveryStatus = 3;
          if (el.time) {
            finalizedResponse.latestDate = this.typeService.getGlobalDate(
              new Date(el.time),
            );
          }
        }
      } else if (
        el.name == 'hard_bounce' ||
        el.name == 'blocked' ||
        el.name == 'soft_bounce'
      ) {
        finalizedResponse.isBounced = true;
        if (finalizedResponse.deliveryStatus <= 5) {
          finalizedResponse.deliveryStatus = 5;
          if (el.time) {
            finalizedResponse.latestDate = this.typeService.getGlobalDate(
              new Date(el.time),
            );
            finalizedResponse.sourceDeliveryDate = finalizedResponse.latestDate;
          }
        }
      }
    });

    return finalizedResponse;
  }

  async getEmailDetails(targetEmail, targetDate, keyWords) {
    if (!targetEmail || !targetEmail.includes('@'))
      return k422ErrorMessage('Please enter valid email address');
    if (targetDate.length != 10)
      return k422ErrorMessage('Please provide readable date');
    let url = smsTrackURL;
    const headers = { 'api-key': process.env.SENDINBLUE_KEY };

    const query = {
      email: targetEmail,
      startDate: targetDate,
      endDate: targetDate,
      sort: 'desc',
      limit: 50,
      offset: 0,
    };
    const response = await this.api.get(url, query, headers);
    if (response == k500Error || !response) return kInternalError;
    if (!response.transactionalEmails) return kInternalError;

    const targetStatusList = [];
    response.transactionalEmails.forEach((el) => {
      if (el.subject) {
        keyWords.forEach((word) => {
          if (el.subject?.toLowerCase()?.includes(word.toLowerCase())) {
            targetStatusList.push(el);
          }
        });
      }
    });

    return targetStatusList;
  }

  async checkTemplate(reqdata) {
    try {
      const ogGlobalService = GlobalServices.EMAIL_SERVICE;
      const globalService = reqdata?.service;
      const decodedHtml = Buffer.from(reqdata?.html, 'base64').toString(
        'utf-8',
      );
      const acceptedEmailService = ['BREVO', 'SENDGRID', 'GMAIL'];
      if (!acceptedEmailService.includes(globalService)) return kWrongDetails;
      if (!gIsPROD) {
        if (globalService == 'GMAIL') {
          GlobalServices.EMAIL_SERVICE = 'GMAIL';
        }
        if (globalService == 'SENDGRID') {
          GlobalServices.EMAIL_SERVICE = 'SENDGRID';
        }
        if (globalService == 'BREVO') {
          GlobalServices.EMAIL_SERVICE = 'BREVO';
        }
        await this.sendMail({ ...reqdata, html: decodedHtml });
        GlobalServices.EMAIL_SERVICE = ogGlobalService;
      } else {
        return k422ErrorMessage('Unauthorized attempt');
      }
    } catch (error) {
      return kInternalError;
    }
  }
}
