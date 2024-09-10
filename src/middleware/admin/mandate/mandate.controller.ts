import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { MandateService } from './mandate.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { MandateServiceV4 } from 'src/v4/mandate/mandate.service.v4';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('admin/mandate')
export class MandateController {
  constructor(
    private readonly service: MandateService,
    private readonly sharedMandateService: MandateSharedService,
    private readonly serviceV4: MandateServiceV4,
    private readonly userService: UserServiceV4,
  ) {}

  @Get('getMandateStuckData')
  async funGetMandateStuckData(@Res() res) {
    try {
      const result: any = await this.service.getMandateStuckData();
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('deleteEmandate')
  async funnDeleteEmandate(@Body() body, @Res() res) {
    try {
      if (!body.loanId) return res.json(kParamMissing('loanId'));
      const data: any = await this.service.deleteMandate(
        body.loanId,
        body?.adminId,
      );
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Post('EmailMandateInvitation')
  async funEmailMandateInvitation(@Body() body, @Res() res) {
    try {
      //Params validation
      const data = await this.service.sendInvitationLinkViaMail(body);
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Get('checkPendingEmandate')
  async funCheckPendingEmandate(@Res() res) {
    try {
      const data: any = await this.service.checkPendingEmandate();
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('notificationToMandateFailUser')
  async notificationToMandateFailUser(@Body() body, @Res() res) {
    try {
      const data = await this.service.notificationToMandateFailUser();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // check exprired mandates
  @Post('checkPreviousMandates')
  async funCheckPreviousMandates(@Body() body, @Res() res) {
    try {
      if (!body.userId) return res.json(kParamMissing('userId'));
      const data: any = await this.sharedMandateService.checkPreviousMandates(
        body.userId,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('generateLink')
  async funGenerateLink(@Body() body, @Res() res) {
    try {
      let data: any = await this.serviceV4.generateLink(body);
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
}
