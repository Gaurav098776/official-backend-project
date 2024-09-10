import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { EnvConfig } from 'src/configs/env.config';
import * as fs from 'fs';

import { MICRO_ALERT_TOPIC } from 'src/constants/objects';

import { v4 as uuidv4 } from 'uuid';
import {
  sendSendCampaignMessageMicroServiceUrl,
  sendSlackMessageApi,
  sendWhatsAppMicroServiceUrl,
  slackApiError,
  storeWhatsAppWebhook,
} from 'src/constants/network';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class KafkaService implements OnModuleInit {
  private kafka = null;
  private producer;
  private consumer;
  private readonly replyTopic = MICRO_ALERT_TOPIC.REPLY_TOPIC;
  constructor(
    @Inject(forwardRef(() => APIService))
    private readonly api: APIService,
  ) {
    if (EnvConfig.kafka.isKafkaOn === 'true') {
      this.kafka = new Kafka({
        brokers: [EnvConfig.kafka.KAFKA_BROKER],
        clientId: EnvConfig.kafka.clientId,
        ssl: {
          servername: EnvConfig.kafka.host,
          rejectUnauthorized: false,
          ca: [fs.readFileSync('./certificates/certs/cert-signed', 'utf-8')],
        },
        sasl: {
          mechanism: 'plain',
          username: EnvConfig.kafka.userName,
          password: EnvConfig.kafka.password,
        },
      });
    }
  }

  async onModuleInit() {
    if (EnvConfig.kafka.isKafkaOn === 'true') {
      this.producer = this.kafka.producer();
      await this.producer.connect();

      this.consumer = this.kafka.consumer({ groupId: EnvConfig.kafka.groupId });
      await this.consumer.connect();

      // You can subscribe to multiple topics at once
      await this.consumer.subscribe({ topics: [this.replyTopic] });

      this.consumer.run({
        eachMessage: async ({ message }) => {},
      });
    }
  }
  async send(topic: string, message) {
    // if (EnvConfig.nbfcType == '1') return {};

    if (EnvConfig.kafka.isKafkaOn === 'true') {
      const correlationId = uuidv4();

      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
            headers: {
              'correlation-id': correlationId,
              'reply-topic': this.replyTopic,
            },
          },
        ],
      });
    } else {
      const api = new Map([
        [MICRO_ALERT_TOPIC.SEND_WHATSAPP_MESSAGE, sendWhatsAppMicroServiceUrl],
        [
          MICRO_ALERT_TOPIC.SEND_WHATSAPP_CAMPAIGN,
          sendSendCampaignMessageMicroServiceUrl,
        ],
        [MICRO_ALERT_TOPIC.STORE_WHATSAPP_WEBHOOK, storeWhatsAppWebhook],
        [MICRO_ALERT_TOPIC.SEND_SLACK_MSG, sendSlackMessageApi],
        [MICRO_ALERT_TOPIC.SEND_API_ERROR_MESSAGE, slackApiError],
      ]);

      const url = api.get(topic);
      console.log('url: ', url);

      await this.api.post(url, message);
    }
  }
}
