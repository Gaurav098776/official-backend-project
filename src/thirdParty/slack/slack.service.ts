// Imports
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { nGetSlackMsg, nSlackMsg, slackApiError } from 'src/constants/network';
import { EnvConfig } from 'src/configs/env.config';
import { gIsPROD } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kParamMissing } from 'src/constants/responses';
import { MICRO_ALERT_TOPIC } from 'src/constants/objects';
import { KafkaService } from 'src/microservice/kafka/kafka.service';

export const errorExecptionUrls = [
  'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=',
  'https://ifsc.razorpay.com',
];

@Injectable()
export class SlackService {
  constructor(private readonly kafkaService: KafkaService) {}

  async sendMsg(reqData) {
    this.kafkaService.send(MICRO_ALERT_TOPIC.SEND_SLACK_MSG, reqData);
    return {};
  }

  async sendAPIErrorMsg(error, url) {
    const API_EXEPTION = [slackApiError];

    if (!API_EXEPTION.includes(url))
      this.kafkaService.send(MICRO_ALERT_TOPIC.SEND_API_ERROR_MESSAGE, {
        error,
        url,
      });
    return {};
  }

  async getMsg(reqData) {
    // Caution -> Do not remove try catch
    try {
      const channel = reqData.channel;
      if (!channel) return kParamMissing('channel');
      const headers = { Authorization: 'Bearer ' + EnvConfig.slack.botToken };
      const params = { channel: channel };
      const response: any = await axios
        .get(nGetSlackMsg, { headers, params })
        // Caution -> Do not remove catch
        .catch((err) => {
          console.log(err);
          return k500Error;
        });
      if (!response) return k500Error;
      return response.data;
    } catch (error) {
      return k500Error;
    }
  }
}
