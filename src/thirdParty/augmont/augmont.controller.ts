import { Body, Controller, Get, Query, Post, Res } from '@nestjs/common';
import { Key } from 'src/authentication/auth.guard';
import { k500Error } from 'src/constants/misc';
import {
  k403Forbidden,
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { kPleaceEnterValidPincode } from 'src/constants/strings';
import { AugmontService } from './augmont.service';
import { MIN_BUY_AMOUNT } from 'src/constants/globals';

@Controller('/augmont')
export class AugmontController {
  constructor(private readonly service: AugmontService) {}

  //#region get rate of gold or sliver
  @Get('getRate')
  async getRate(@Res() res) {
    try {
      const data = await this.service.getRate();
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get user data
  @Get('getUserDataForAugmont')
  async getUserDataForAugmont(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const data = await this.service.getUserDetails(userId);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get user Buy sell history
  @Get('getUserBuySellHistory')
  async getUserBuySellHistory(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const data: any = await this.service.getUserBuySellHistory(userId);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region buy gold or silver
  @Post('buyGoldOrSilver')
  async buyGoldOrSilver(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const type = (body?.type ?? '').toLowerCase();
      const quantity = body?.quantity;
      const amount = body?.amount;
      if (!type || (!amount && !quantity)) return res.json(kParamsMissing);
      if (amount <= MIN_BUY_AMOUNT)
        return res.json(k422ErrorMessage('Low buy amount!'));
      if (type != 'gold' && type != 'silver')
        return res.json(k422ErrorMessage());
      body.userId = userId;
      const data: any = await this.service.buyGoldOrSilver(userId, body);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region add PinCode
  @Post('addPinCode')
  async addPinCode(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const pinCode = (body?.pinCode ?? '').toString();
      if (!pinCode) return res.json(kParamsMissing);
      if (pinCode.length != 6)
        return res.json(k422ErrorMessage(kPleaceEnterValidPincode));
      const data: any = await this.service.addPinCode(userId, pinCode);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region sell gold or silver
  @Post('sellGoldOrSilver')
  async sellGoldOrSilver(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const type = (body?.type ?? '').toLowerCase();
      const quantity = body?.quantity;
      const amount = body?.amount;
      if (!type || (!amount && !quantity)) return res.json(kParamsMissing);
      if (type != 'gold' && type != 'silver')
        return res.json(k422ErrorMessage());
      body.userId = userId;
      const data: any = await this.service.sellGoldOrSilver(userId, body);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region add Bank Details
  @Post('addBankDetails')
  async addBankDetails(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const accountNumber = (body?.accountNumber ?? '').toLowerCase();
      const ifscCode = body?.ifscCode;
      if (!accountNumber || !ifscCode) return res.json(kParamsMissing);
      const data: any = await this.service.checkAndAddBank(userId, body);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region transfer Gold or silver
  @Post('transferGoldOrSilver')
  async transferGoldOrSilver(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const type = (body?.type ?? '').toLowerCase();
      const quantity = body?.quantity;
      const receiver_id = body?.receiver_id;
      if (!type || !quantity || !receiver_id) return res.json(kParamsMissing);
      if (type != 'gold' && type != 'silver')
        return res.json(k422ErrorMessage());
      const data: any = await this.service.transferGoldOrSilver(userId, body);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('getBuyInvoice')
  async getBuyInvoice(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getBuyInvoice(query);
      if (data === k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
