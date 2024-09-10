// Imports
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { SENDGRIDBASE_URL, sendGridKey } from 'src/constants/network';
import { FileService } from 'src/utils/file.service';
import {
  kLSPFromName,
  kNBFCFromName,
  kNoReplyMail,
  kSupportMail,
} from 'src/constants/strings';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class SendGridService {
  constructor(
    private readonly api: APIService,
    private readonly fileService: FileService,
  ) {}

  async sendMail(
    email: any,
    subject: string,
    html: any,
    attachments: any = [],
    ccMail: any = [],
    bccMail: any = [],
    tags: any = [],
    replyTo: any,
    from: any,
    appType = 1,
  ) {
    if (!subject) return kParamMissing('subject');
    if (!email) return kParamMissing('email');
    try {
      // Auth
      const headers = { Authorization: sendGridKey };
      // Body preparation
      let splittedSpans = email;
      if (typeof splittedSpans == 'string')
        splittedSpans = splittedSpans.split(',');
      const targetEmails = [];
      splittedSpans.forEach((el) => {
        targetEmails.push({ email: el, name: 'User' });
      });
      if (tags?.length != 0) tags = [...new Set(tags)].filter((el) => el);
      if (!from) from = kNoReplyMail;
      if (!replyTo) replyTo = kSupportMail;
      const fromName = appType ? kNBFCFromName : kLSPFromName;
      const body: any = {
        personalizations: [
          {
            to: targetEmails,
            subject: subject,
          },
        ],
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
        from: {
          email: from,
          name: fromName,
        },
        reply_to: {
          email: replyTo,
          name: fromName,
        },
      };
      if (tags.length > 0) body.categories = tags;

      const cc = [];
      if (ccMail.length > 0) {
        ccMail.forEach((el) => {
          try {
            cc.push({ email: el });
          } catch (error) {}
        });
        body.personalizations[0].cc = cc;
      }

      const bcc = [];
      if (bccMail.length > 0) {
        bccMail.forEach((el) => {
          try {
            bcc.push({ email: el });
          } catch (error) {}
        });
        body.personalizations[0].bcc = bcc;
      }

      // Attachments (URL or filepath is accepted not greater than 10MB)
      if (attachments.length > 0) {
        const attachment = [];
        for (let index = 0; index < attachments.length; index++) {
          try {
            const attachmentData = attachments[index];
            const data: any = { filename: attachmentData.filename };

            if (attachmentData.path && !data.filename) {
              const splittedSpans = attachmentData.path.split('/');
              data.filename = splittedSpans[splittedSpans.length - 1];
            }

            if (
              attachmentData.path?.includes('http:') ||
              attachmentData.path?.includes('https:')
            ) {
              data.url = attachmentData?.path;
              data.content = await this.fileService.urlToBuffer(data.url);
            } else if (attachmentData.path) {
              data.content = await fs.readFileSync(
                attachmentData.path,
                'base64',
              );
              const fileExtension = attachmentData.filename.split('.').pop();
              const contentType = `application/${fileExtension}`;
              data.type = contentType;
            }
            attachment.push(data);
          } catch (error) {}
        }
        body.attachments = attachment;
      }
      const response = await this.api.sendGridPost(
        SENDGRIDBASE_URL,
        body,
        null,
        null,
        {
          headers,
        },
      );
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }
}
