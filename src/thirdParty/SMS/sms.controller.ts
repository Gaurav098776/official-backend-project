import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { AllsmsService } from './sms.service';

@Controller('sms')
export class SMSController {
  constructor(private readonly service: AllsmsService) {}

  @Post('callback')
  async funCallback(@Body() body, @Res() res) {
    try {
      await this.service.callback(body);
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
