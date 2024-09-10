// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  k403Forbidden,
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { kWebviewRoute } from 'src/constants/strings';
import { Key } from 'src/authentication/auth.guard';
import { k500Error } from 'src/constants/misc';
import { UserService } from 'src/admin/user/user.service';
import { UserServiceV4 } from '../user/user.service.v4';
import { ResidenceServiceV4 } from './residence.service.v4';

@Controller('residence')
export class ResidenceControllerV4 {
  constructor(
    private readonly service: ResidenceServiceV4,
    private readonly userServiceV3: UserServiceV4,
    private readonly userService: UserService,
  ) {}

  @Post('submitTypeAddress')
  async funSubmitTypeAddress(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitTypeAddress(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userServiceV3.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('requestAutomationURL')
  async funRequestAutomationURL(@Query() query, @Res() res) {
    try {
      const automationData: any = await this.service.getResidenceAutomationData(
        query,
      );
      let data: any = {};
      if (automationData?.message) return res.send(automationData);
      if (automationData.needUserInfo) {
        data = await this.userServiceV3.routeDetails({ id: query.userId });
        if (data?.message) return res.send(data);
      }
      if (automationData.mode) {
        data.userData.webviewData = automationData.mode;
        data.continueRoute = kWebviewRoute;
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('validateAutomation')
  async funValidateAutomation(@Body() body, @Res() res) {
    try {
      const webData: any = await this.service.validateAutomation(body);
      if (webData?.message) return res.send(webData);

      let data: any = webData;
      if (webData.needUserInfo) {
        data = await this.userServiceV3.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('submitProof')
  async funSubmitProof(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitProof(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userServiceV3.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('validateResidenceAutomation')
  async funValidateResidenceAutomation(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);

      let data = await this.service.validateResidenceAutomation(userId);
      if (data['message']) return res.json(k422ErrorMessage(data['message']));

      data = await this.userService.getUserProfile({ userId: userId });
      if (data == k500Error) return res.json(kInternalError);
      else if (data['message'])
        return res.json(k422ErrorMessage(data['message']));

      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
