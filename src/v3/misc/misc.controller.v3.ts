// Imports
import { k500Error } from 'src/constants/misc';
import { MiscServiceV3 } from './misc.service.v3';
import { Key } from 'src/authentication/auth.guard';
import {
  Body,
  Controller,
  Get,
  Query,
  Res,
  Headers,
  Post,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('misc')
export class MiscControllerV3 {
  constructor(private readonly service: MiscServiceV3) {}

  @Get('/getConfigs')
  async funGetConfigs(@Headers() headers, @Res() res, @Query() query) {
    try {
      if (headers.apptype && query) query.apptype = headers.apptype;
      const data: any = await this.service.getConfigs(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('/getLoanPurposeList')
  async funGetLoanPurposeList(@Res() res) {
    try {
      const data: any = await this.service.getLoanPurposeList();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('/getAvailableBankList')
  async funGetAvailableBankList(@Res() res) {
    try {
      const data: any = await this.service.getAvailableBankList();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('getSettingsData')
  async funGetSettingsData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getSettingsData(query);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      // Silent error response to user in case of error
      return res.json(kSuccessData);
    }
  }

  @Get('userLoanDeclineReasons')
  async funGetUserloanDeclineReasons(@Res() res) {
    try {
      const result = await this.service.userLoanDeclineReasons();
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      return kInternalError;
    }
  }

  @Get('/getBlackListReason')
  async getBlackListReason(@Res() res) {
    try {
      const data: any = await this.service.getBlackListReason();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('shareText')
  async shareTextApp(@Headers() headers, @Res() res) {
    try {
      const data: any = await this.service.shareTextApp(headers);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('saveUserRating')
  async funSaveUserRating(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.storeUserRating(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('uploadFile')
  async funUploadFile(@Body() body, @Res() res) {
    try {
      const data = await this.service.uploadFile(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
