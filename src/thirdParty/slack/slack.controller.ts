// Imports
import { Body, Controller, Post } from '@nestjs/common';
import { SlackService } from './slack.service';

@Controller('thirdParty/slack')
export class SlackController {
  constructor(private readonly service: SlackService) {}

  @Post('sendMsg')
  async funSendMsg(@Body() body) {
    return await this.service.sendMsg(body);
  }

  @Post('getMsg')
  async funGetMsg(@Body() body) {
    return await this.service.getMsg(body);
  }
}
