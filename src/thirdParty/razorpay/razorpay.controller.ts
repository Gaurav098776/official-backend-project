import { RazorpoayService } from './razorpay.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Render,
  Res,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { SharedTransactionService } from 'src/shared/transaction.service';
import * as fs from 'fs';
import { EnvConfig } from 'src/configs/env.config';
@Controller('razorpay')
export class RazorpayController {
  constructor(
    private readonly service: RazorpoayService,
    private readonly sharedTransactionService: SharedTransactionService,
  ) {}

  @Get('syncPayouts')
  async funSyncPayouts(@Query() query, @Res() res) {
    try {
      await this.service.syncPayouts(query);
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getIFSCDetails')
  async funGetIFSCDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getIFSCDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('inviteForMandate')
  async funInviteForMandate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.inviteForMandate(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('placeAutoDebit')
  async funPlaceAutoDebit(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.placeAutoDebit(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('checkoutHTML')
  async funCheckoutHTML(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.checkoutHTML(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  @Post('/initMandate')
  async initMandate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.initForMandate(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('/razorpayMandate')
  @Render('razorpayMandate')
  eMandate(@Query() query) {
    return {
      customer_id: query.customer_id,
      order_id: query.order_id,
      key: process.env.RAZORPAY_M2_APP_ID,
      host_url: process.env.HOST_URL,
    };
  }

  @Post('/razorpayMandateCallback')
  eMandateCallback(@Body() body) {
    const mandateSuccessTemplatePath = 'upload/mandate/mandate.html';
    let templateContent = fs.readFileSync(mandateSuccessTemplatePath, 'utf-8');
    templateContent = templateContent.replace(
      '##APPNAME##',
      EnvConfig.nbfc.nbfcName,
    );
    return templateContent;
  }

  @Post('/ADPaymentWebhook')
  async ADPaymentWebhook(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.sharedTransactionService.checkRazorpayAutoDebitsWebhook(
          body,
        );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('/manualPaymentWebhook')
  async manualPaymentWebhook(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.sharedTransactionService.checkRazorpayManualWebhook(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('/checkMandateExpire')
  async funCheckMandateExpire(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funCheckMandateExpire(body, 0);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

}
