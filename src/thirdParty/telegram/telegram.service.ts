// Imports
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { gIsPROD } from 'src/constants/globals';
import { EnvConfig } from 'src/configs/env.config';
import { TELEGRAM_URL } from 'src/constants/network';
import { SlackService } from '../slack/slack.service';

@Injectable()
export class TelegramService {
  constructor(private readonly slack: SlackService) {}

  async sendMessage(content?: string) {
    try {
      try {
        this.slack.sendMsg({ text: content }).catch(() => {});
      } catch (error) {}
      try {
        if (content) content += ` SourceId - ${EnvConfig?.server?.sourceId}`;
      } catch (error) {}

      if (!EnvConfig.telegram.botToken || !EnvConfig.telegram.chatId) return;

      try {
        // Do not use api service here
        axios
          .post(`${TELEGRAM_URL}${EnvConfig.telegram.botToken}/sendMessage`, {
            chat_id: EnvConfig.telegram.chatId,
            text: content ?? 'This is a test message',
          })
          .catch(() => {});
      } catch (error) {}
    } catch (error) {
      if (!gIsPROD) console.log(error);
    }
    return {};
  }
}
