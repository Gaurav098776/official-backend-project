import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import {
  funGenerateOAuthToken,
  GET_OAUTH_INFO,
  GMAIL_GET_MAILS,
  GMAIL_SEND_ATTACHMENT,
  GMAIL_SEND_MAIL,
} from 'src/constants/network';
import { APIService } from './api.service';
import { kMimeTypes } from 'src/constants/objects';
import { k500Error } from 'src/constants/misc';
import { TypeService } from './type.service';
import {
  kLegalMail,
  kNoReplyMail,
  kLegalTeamMail,
  kVerificationsMail,
} from 'src/constants/strings';

const tokenData: any = {
  [kNoReplyMail]: {},
  [kLegalTeamMail]: {},
  [kVerificationsMail]: {},
};

@Injectable()
export class GmailService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
  ) {}

  async sendEmail(
    email: string,
    subject: string,
    text: any,
    filePath?: string,
    ccMail: any = [],
    fileHeader = null,
  ) {
    try {
      const index = Math.floor(Math.random() * [kNoReplyMail].length);
      const senderMail = [kNoReplyMail][index];
      const result = await this.getAccessToken(senderMail);
      if (result == k500Error) return k500Error;
      const getBase64 = async (params) => {
        const subjectText = Buffer.from(subject).toString('base64');
        let contentType = 'text/html';
        const attachments = [];
        if (filePath) {
          const bytes = await fs.readFileSync(filePath);
          const base64Bytes = Buffer.from(bytes).toString('base64');
          const pathList = filePath.split('.');
          const extension = pathList[pathList.length - 1];
          contentType = kMimeTypes[extension];
          const fileNameArr = filePath.split('/');
          const fileName = fileNameArr[fileNameArr.length - 1];
          attachments.push({
            mimeType: contentType,
            fileName: params.fileName ?? fileName,
            bytes: base64Bytes,
          });
        }
        let ccmail = '';
        if (ccMail && ccMail?.length != 0) {
          ccMail.push(kLegalMail);
          ccmail = ccMail.join();
        }
        const mimeBody = [
          'Content-Type: multipart/mixed; boundary="foo_bar_baz"\r\n',
          'MIME-Version: 1.0\r\n',
          `from: ${senderMail} \n`,
          `to: ${email} \n`,
          `cc:${ccmail} \n`,
          `subject: =?UTF-8?B?${subjectText}?= \n\n`,

          '--foo_bar_baz\r\n',
          'Content-Type: text/html; charset="UTF-8"\r\n',
          'MIME-Version: 1.0\r\n',
          'Content-Transfer-Encoding: 7bit\r\n\r\n',
          params.message + '\n',
        ];
        if (attachments.length > 0) {
          const rawAttch = [
            '--foo_bar_baz\r\n',
            'Content-Type: Application/pdf; charset="UTF-8"\r\n name=mypdf.pdf',
            'MIME-Version: 1.0\r\n',
            'Content-Transfer-Encoding: base64\r\n',
            'Content-Disposition: attachment; filename="' +
              attachments[0].fileName +
              '" \r\n\r\n',
            attachments[0].bytes,
            '\r\n\r\n',

            '--foo_bar_baz--',
          ];
          mimeBody.push(...rawAttch);
        }
        const str = mimeBody.join('');
        return Buffer.from(str)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      };
      const url = filePath ? GMAIL_SEND_ATTACHMENT : GMAIL_SEND_MAIL;
      const rawData = await getBase64({
        message: text,
        fileName: fileHeader,
      });
      const body = {
        raw: rawData,
      };
      const options = {
        headers: this.getHeaders(senderMail),
      };
      return await this.api.post(url, body, null, null, options);
    } catch (error) {
      return k500Error;
    }
  }

  async getEmails(email: string) {
    try {
      const accessToken = await this.getAccessToken(email);
      if (accessToken == k500Error) return k500Error;
      const url = GMAIL_GET_MAILS;
      const headers = this.getHeaders(email);
      const params = {
        maxResults: 10,
        labelIds: 'UNREAD',
      };
      const msgResponse = await this.api.get(url, params, headers);
      if (msgResponse == k500Error) return k500Error;

      const emailList: any[] = [];
      for (let index = 0; index < msgResponse.messages.length; index++) {
        const message = msgResponse.messages[index];
        const msgId = message.id;

        const msgURL = url + msgId;
        const response = await this.api.get(msgURL, null, headers);
        if (response == k500Error) continue;
        const data = this.getGmailData(response);
        if (data == k500Error) continue;
        emailList.push(data);
      }

      return emailList;
    } catch (error) {
      return k500Error;
    }
  }
  async getEmailStatus(queryParams: any = {}) {
    try {
      const email = queryParams.email;
      const accessToken = await this.getAccessToken(email);
      if (accessToken == k500Error) return k500Error;
      const url = GMAIL_GET_MAILS;
      const headers = this.getHeaders(email);
      delete queryParams.email;

      const msgResponse = await this.api.get(url, queryParams, headers);
      if (msgResponse == k500Error) return k500Error;

      const emailList: any[] = [];
      for (let index = 0; index < msgResponse.messages.length; index++) {
        const message = msgResponse.messages[index];
        const msgId = message.id;
        const msgURL = url + msgId;
        const response = await this.api.get(msgURL, null, headers);
        if (response == k500Error) continue;
        const data = this.getGmailData(response);
        if (data == k500Error) continue;
        emailList.push(data);
      }
      return { emailList, count: msgResponse.resultSizeEstimate ?? 0 };
    } catch (error) {
      return k500Error;
    }
  }

  private getGmailData(gmailData) {
    try {
      const data: any = {
        mailId: gmailData.id,
        historyId: gmailData.historyId,
        snippet: gmailData.snippet,
        mailDate: new Date(+gmailData.internalDate),
      };

      //Get snippet domain
      if (data.snippet) {
        const possibleDomains = data.snippet
          .split(' ')
          .filter((el) => el.includes('@') && el.includes('.'));
        if (possibleDomains.length > 0) data.snippetDomain = possibleDomains[0];
        if (data.snippetDomain && data.snippetDomain.endsWith('.')) {
          data.snippetDomain = data.snippetDomain.substring(
            0,
            data.snippetDomain.length - 1,
          );
        }
        if (data.snippetDomain?.includes('@')) {
          const atIndex = data.snippetDomain.indexOf('@') + 1;
          data.snippetDomain = data.snippetDomain.substring(
            atIndex,
            data.snippetDomain.length,
          );
        }
      }

      //Get sender info
      const headers = gmailData.payload.headers;
      const senderData = headers.find((el) => el.name == 'From').value;
      const index01 = senderData.indexOf('<') + 1;
      const index02 = senderData.indexOf('>');
      const senderId = senderData.substring(index01, index02);
      data.senderId = senderId.toLowerCase();

      return data;
    } catch (error) {
      return k500Error;
    }
  }

  private getHeaders(email: string) {
    try {
      return {
        Authorization: tokenData[email].accessToken,
      };
    } catch (error) {}
  }

  private async getAccessToken(email: string) {
    try {
      const isNeedToGenerate = await this.isNeedNewToken(email);
      if (isNeedToGenerate) {
        const result = await this.generateAccessToken(email);
        if (result == k500Error) return k500Error;
      }
    } catch (error) {
      return k500Error;
    }
  }

  private async isNeedNewToken(email): Promise<boolean> {
    try {
      const gmailAccessToken = tokenData[email].accessToken;
      const lastSyncTime = tokenData[email].lastSyncTime;
      if (!gmailAccessToken || !lastSyncTime) return true;

      const currentDate = new Date();
      const differenceInMillies = this.typeService.dateDifference(
        currentDate,
        lastSyncTime,
        'Milliseconds',
      );
      if (differenceInMillies < 5 * 60 * 1000) return false;

      const url = GET_OAUTH_INFO + gmailAccessToken;
      const response = await this.api.get(url);
      if (!response) return true;
      else if (response == k500Error) return true;
      const expireTime = response.expires_in;
      if (!expireTime) return true;
      if (expireTime >= 500) return false;

      return true;
    } catch (error) {
      return true;
    }
  }

  private async generateAccessToken(email: string) {
    try {
      const url = funGenerateOAuthToken(email);
      const response = await this.api.post(url);
      if (!response) return;
      else if (response == k500Error) return k500Error;
      tokenData[email]['accessToken'] = 'Bearer ' + response.access_token;
      tokenData[email]['lastSyncTime'] = new Date();
    } catch (error) {
      return tokenData[email].accessToken;
    }
  }
}
