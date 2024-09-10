import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { CashFreeService } from './cashfree.service';
import { CF_RETURN_URL } from 'src/constants/network';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { kAdmins } from 'src/constants/strings';
@Controller('cashfree')
export class CashfreeController {
  constructor(
    private readonly service: CashFreeService,
    private readonly sharedTransactionService: SharedTransactionService,
  ) {}

  @Post('createSubscription')
  async funCreateSubscription(@Body() body, @Res() res) {
    try {
      const data = await this.service.createSubscription(body);
      if (data['message']) return res.json(k422ErrorMessage(data['message']));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('reActivateSubscription')
  async funReActivateSubscription(@Body() body, @Res() res) {
    try {
      //Params validation
      const referenceId: string = body?.referenceId;
      if (!referenceId) return res.json(kParamsMissing);

      const data = await this.service.reActivateSubscription(referenceId);
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('testCreateOrder')
  async funTestCreateOrder(@Res() res) {
    try {
      const data = await this.service.createPaymentOrder({
        amount: 10.0,
        email: kAdmins[0],
        phone: '7600550021',
        returnURL: CF_RETURN_URL,
      });
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('checkPayment')
  async funCheckPayment(@Query() query, @Res() res) {
    try {
      //Params validation
      const orderId = query.orderId;
      if (!orderId) return res.json(kParamsMissing);

      const data = await this.service.checkPayment(orderId);
      if (data == k500Error) return res.json(kInternalError);
      else if (data == false) return res.json(kBadRequest);

      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('/CFADPaymentWebhook')
  async CFADPaymentWebhook(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.sharedTransactionService.checkCFAutoDebitWebhook(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
