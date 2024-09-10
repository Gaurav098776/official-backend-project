// Imports
import { Controller, Get, Query, Res } from '@nestjs/common';
import { OneMoneyService } from './one.money.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('oneMoney')
export class OneMoneyController {
  constructor(private readonly service: OneMoneyService) {}

  @Get('invitationLink')
  async funInvitationLink(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.invitationLink(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('checkStatus')
  async funCheckStatus(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.checkStatus(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region decrypt URL
  @Get('decryptURL')
  async funDecryptURL(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.decryptURL(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region  get all fi data from one money
  @Get('getallfidata')
  async funGetallfidata(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetallfidata(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion
}
