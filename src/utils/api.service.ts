// Imports
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { gIsPROD, telegramExecptionUrls } from 'src/constants/globals';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('request');
import { kUnproccesableData } from 'src/constants/responses';
import { SlackService } from 'src/thirdParty/slack/slack.service';

@Injectable()
export class APIService {
  constructor(private readonly slack: SlackService) { }

  async post(
    url: string,
    body: any = {},
    headers: any = {},
    auth: any = {},
    options: any = {},
    isSendData = false,
    timeout = 180000,
  ) {
    try {
      const response = await axios.post(url, body, {
        headers,
        auth,
        ...options,
        timeout,
      });
      if (!response) return k500Error;
      const result = response.data;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      try {
        if (isSendData) return kUnproccesableData(error?.response?.data);
        console.log(JSON.stringify(error), JSON.stringify(error.response.data));
      } catch (error) { }
      return k500Error;
    }
  }

  async requestPost(url: string, body: any = {}, headers: any = {}, formData?) {
    try {
      const response: any = await new Promise((resolve, reject) => {
        const options = {
          rejectUnauthorized: false,
          method: 'POST',
          url,
          json: true,
          headers: headers,
        };

        if (formData) options['formData'] = formData;
        else options['body'] = body;
        request(options, function (error, response, body) {
          if (error) {
            try {
              if (!gIsPROD) console.log(error.toString());
            } catch (error) { }
            reject(new Error(error));
          }
          resolve(body);
        });
      });
      if (!response) return k500Error;
      const result = response;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      if (!gIsPROD) console.log(error);
      return k500Error;
    }
  }

  async get(
    url: string,
    params: any = {},
    headers: any = {},
    config: any = {},
    isSendData = false,
  ) {
    try {
      const response = await axios.get(url, { headers, params, ...config });
      if (!response) return k500Error;
      const result = response.data;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      console.log({error})
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      try {
        if (isSendData) return kUnproccesableData(error?.response?.data);
      } catch (error) { 
        console.log({error})
      }
      return k500Error;
    }
  }

  //#region request get
  async requestGet(url: string, headers: any = {}) {
    try {
      const response: any = await new Promise((resolve, reject) => {
        const options = {
          rejectUnauthorized: false,
          method: 'GET',
          url,
          json: true,
          headers: headers,
        };
        request(options, function (error, response, body) {
          if (error) {
            reject(new Error(error));
          }
          resolve(body);
        });
      });
      if (!response) return k500Error;
      const result = response;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      return k500Error;
    }
  }

  async exotelPost(
    url: string,
    body: any = {},
    headers: any = {},
    auth: any = {},
    options: any = {},
  ) {
    try {
      const otherOptions = { ...auth, ...options };
      const response = await axios.post(url, body, { ...otherOptions });
      if (!response) return k500Error;
      const result = response.data;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alertc
      this.slack.sendAPIErrorMsg(error, url);
      return k500Error;
    }
  }

  async put(url: string, body: any = {}, options: any = {}) {
    try {
      const response = await axios.put(url, body, options);
      if (!response) return k500Error;
      const result = response.data;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      return k500Error;
    }
  }

  async cibilPost(
    url: string,
    body: any = {},
    headers: any = {},
    httpsAgent: any = {},
  ) {
    try {
      const response = await axios.post(url, body, { headers, httpsAgent });
      if (!response) return k500Error;
      if (response.status !== 200) return k500Error;
      if (!response.data) return k500Error;
      return response.data;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      return k500Error;
    }
  }

  async ICICIPost(url: string, body: any = {}, headers) {
    try {
      const response = await axios.post(url, body, {
        headers,
      });
      if (!response) return k500Error;
      const result = response.data;
      if (!result) return k500Error;
      return result;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      try {
        if (typeof error?.response?.data == 'string') {
          if (error?.response?.data?.slice(-1) == '=')
            return error.response.data;
        }
        console.log(
          'ICICI API Error',
          error?.response?.data,
          JSON.stringify(error),
        );
      } catch (error) {
        console.log('EEEE', error);
      }
      return k500Error;
    }
  }

  async sendGridPost(
    url: string,
    body: any = {},
    headers: any = {},
    auth: any = {},
    options: any = {},
    isSendData = false,
    timeout = 180000,
  ) {
    try {
      const response = await axios.post(url, body, {
        headers,
        auth,
        ...options,
        timeout,
      });
      if (!response) return k500Error;
      const xMsgId = response?.headers['x-message-id'];
      if (!xMsgId) return k500Error;
      return xMsgId;
    } catch (error) {
      // Alert
      this.slack.sendAPIErrorMsg(error, url);

      try {
        console.log(
          'SendGrid error : ',
          error?.response?.data,
          'SENDGRID Body : ',
          JSON.stringify(body?.personalizations),
        );
        if (isSendData) return kUnproccesableData(error?.response);
      } catch (error) { }
      return k500Error;
    }
  }
}
