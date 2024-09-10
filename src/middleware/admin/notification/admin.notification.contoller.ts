// Imports
import {
  Controller,
  Get,
  Res,
  Body,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  kInternalError,
  kParamMissing,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { AdminNotificationService } from './admin.notification.service';

@Controller('/admin/notification/')
export class AdminNotificationController {
  constructor(
    private readonly sharedNotification: SharedNotificationService,
    private readonly userSharedService: UserSharedService,
    private readonly service: AdminNotificationService,
  ) {}

  @Post('/sendNotificationToUser')
  async funSendNotificationToUser(@Body() body, @Res() res, @Req() req) {
    try {
      // Params validation
      const adminId = req.headers['adminid'] ?? body.adminId;
      if (!adminId) return res.json(kParamMissing('adminId'));
      if (!body.userList && !body.userData)
        return res.json(kParamMissing('userList'));
      if (!body.id && (!body.content || !body.title))
        return res.json(kParamsMissing);

      body.adminId = adminId;
      this.sharedNotification.sendNotificationToUser(body);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/migrateNotification')
  async migrateNotification(@Res() res) {
    try {
      const data: any =
        await this.sharedNotification.migrateNotificationTempletes();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // notification On-time user does not apply for the new loans
  @Post('sendNotificationToNotAppliedUser')
  async sendNotificationToNotAppliedUser(@Res() res) {
    try {
      const data: any =
        await this.userSharedService.sendNotificationToNotAppliedUser();
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  /* Sending the notification to target audiances 
  (process will happen in chunks of length n) */
  @Post('sendBulkNotifications')
  async funSendBulkNotifications(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.sendBulkNotifications(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region for update status callback of mail
  @Post('emailStatusUpdate')
  async funEmailSatusUpdate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.emailStatusUpdate(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region for creating template
  @Post('createTemplate')
  async funCreateTemplate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.createTemplate(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region for getting template list
  @Get('getList')
  async funGetList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getTemplateList(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region for rejected tracker count
  @Get('rejectedTrackerCount')
  async funGetRejectedTrackerCount(@Res() res) {
    try {
      const data: any = await this.service.getRejectedTrackerCount();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('rejectedTrackerData')
  async funGetRejectedTrackerData(@Res() res) {
    try {
      const data: any = await this.service.getRejectedTrackerData();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('sendMailforQueryFail')
  async sendMailforQueryFail(@Res() res) {
    try {
      const data: any = await this.service.sendMailforQueryFail();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('updateTemplateContent')
  async updateTemplateContent(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateTemplateContent(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('webFormSendOtp')
  async websiteSendOtp(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.webFormSendOtp(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('submitWebForm')
  async submitWebForm(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitWebForm(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
