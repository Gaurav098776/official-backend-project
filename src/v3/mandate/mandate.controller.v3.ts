// Imports
import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import {
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { UserServiceV3 } from '../user/user.service.v3';
import { MandateServiceV3 } from './mandate.service.v3';
import { EnvConfig } from 'src/configs/env.config';

@Controller('mandate')
export class MandateControllerV3 {
  constructor(
    private readonly service: MandateServiceV3,
    private readonly userService: UserServiceV3,
  ) {}

  @Post('generateLink')
  async funGenerateLink(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.generateLink(body);
      if (data?.message) return res.send(data);
      if (data?.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkStatus')
  async funCheckStatus(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.checkStatus(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('link/:userId')
  async getLink(@Param() param, @Res() res) {
    try {
      const id = param.userId;
      if (!id) return res.send(kParamMissing());
      const data = await this.userService.routeDetails({ id });
      const html = data?.userData?.webviewData?.initialHTMLData;
      if (!html) return res.send();
      return res.send(html);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region get if html data available
  @Get('link/:userId')
  async getaLink(@Param() param, @Res() res) {
    try {
      const id = param.userId;
      if (!id) return res.send(kParamMissing());
      const data = await this.userService.routeDetails({ id });
      const html = data?.userData?.webviewData?.initialHTMLData;
      if (!html) return res.send();
      return res.send(html);
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Post('redirect')
  async funRedirect(@Res() res) {
    return res.redirect(
      EnvConfig.network.flutterWebLenditt + '?route=webviewRoute',
    );
  }
}
