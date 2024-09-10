// Imports
import { FinvuService } from './finvu.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('thirdParty/finvu')
export class FinvuController {
  constructor(private readonly service: FinvuService) {}

  @Post('consent/notification')
  async funCallback(@Body() body, @Res() res) {
    try {
      await this.service.callback(body);
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('inviteForAA')
  async funInviteForAA(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.inviteForAA(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('fetchDataRequest')
  async fetchDataRequest(@Body() body, @Res() res) {
    try {
      const custId = body.custId;
      const consentId = body.consentId;
      const consentHandleId = body.consentHandleId;
      const data: any = await this.service.fetchDataRequest(
        custId,
        consentId,
        consentHandleId,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
