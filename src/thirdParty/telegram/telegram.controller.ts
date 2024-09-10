// Imports
import { TelegramService } from './telegram.service';
import { Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('thirdParty/telegram')
export class TelegramController {
  constructor(private readonly service: TelegramService) {}

  @Post('sendMessage')
  async funSendMessage(@Res() res) {
    try {
      await this.service.sendMessage();
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
