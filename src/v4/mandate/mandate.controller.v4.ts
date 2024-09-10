// Imports
import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import {
  kBadRequest,
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { UserServiceV4 } from '../user/user.service.v4';
import { MandateServiceV4 } from './mandate.service.v4';
import { EnvConfig } from 'src/configs/env.config';
import { k500Error } from 'src/constants/misc';

@Controller('mandate')
export class MandateControllerV4 {
  constructor(
    private readonly service: MandateServiceV4,
    private readonly userService: UserServiceV4,
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
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('callback')
  async funCallback(@Body() body, @Res() res) {
    try {
      const result = await this.service.validateCallbackData(body);
      if (result == false) return res.json(kBadRequest);
      else if (result == k500Error) return res.json(kInternalError);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
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
            console.error("Error in: ", error);
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
            console.error("Error in: ", error);
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
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion

  @Post('redirectLenditt')
  async funRedirectLenditt(@Res() res) {
    return res.redirect(
      EnvConfig.network.flutterWebLenditt + '?route=webviewRoute',
    );
  }

  @Post('redirectNbfc1')
  async funRedirectNbfc1(@Res() res) {
    return res.redirect(
      EnvConfig.network.flutterWebNbfc1 + '?route=webviewRoute',
    );
  }
}
