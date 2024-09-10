// Imports
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { Body, Controller, Post, Res, Req, UseGuards } from '@nestjs/common';
import * as rawbody from 'raw-body';
import { DevOpsGuard } from 'src/authentication/auth.guard';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('icici')
export class ICICIController {
  constructor(private readonly service: ICICIThirdParty) {}

  @Post('CollectPay')
  async funCollectPay(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.CollectPay(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('callback')
  async funCallback(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.callback(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('TransactionStatus')
  async funTransactionStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.TransactionStatus(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('CallbackStatus')
  async funCallbackStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.CallbackStatus(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('Refund')
  async funRefund(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.Refund(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('QR')
  async funQR(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.QR(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('decryptResponse')
  async funDecryptICICIResponse(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.decryptICICIResponse(body.encres);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
