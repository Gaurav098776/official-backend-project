import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('/msg91')
export class Msg91Controller {
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
}
