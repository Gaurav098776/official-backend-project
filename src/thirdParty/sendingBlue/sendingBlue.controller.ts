// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { SendingBlueService } from './sendingBlue.service';

@Controller('/sendingBlue')
export class SendingBlueController {
  constructor(private readonly service: SendingBlueService) {}

  @Post('statusCallback')
  async funStatusCallBack(@Body() body, @Res() res) {
    try {
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('callback')
  async funCallBack(@Query() query, @Res() res) {
    try {
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('sendMail')
  async funSendMail(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.sendMail(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //ONLY FOR TESTING PURPOSE IN UAT
  //DO NOT TEST IN PROD
  @Post('checkTemplate')
  async funcheckTemplate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkTemplate(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
