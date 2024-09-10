// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { UserService } from './user.service';
import { UserDeleteService } from 'src/shared/delete.user.service';
import { kOTPSentInPhone } from 'src/constants/strings';
import { MigrationSharedService } from 'src/shared/migration.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('admin/user')
export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly deleteService: UserDeleteService,
    private readonly migrationService: MigrationSharedService,
    // Other services
    private readonly userService: UserServiceV4,
  ) {}

  @Get('userProfile')
  async funUserProfile(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserProfile(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/allSelfieRetakeData')
  async funAllSelfieRetakeData(@Query() query, @Res() res) {
    try {
      if (!query.status) return res.json(kParamsMissing);
      const result: any = await this.service.getAllSelfieRetakeData(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('changeSelfieStatus')
  async funChangeSelfieStatus(@Res() res, @Body() body) {
    try {
      const data: any = await this.service.funChanegSelfieStatus(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('changeContactStatus')
  async funChangeContactStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funChangesContactStatus(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('setNextEligiblityDate')
  async funSetNextEligibiltyDate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funSetNextEligibiltyDate(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('sendOtpForDeleteAccount')
  async funSendOtpForDeleteAccount(@Body() body, @Res() res) {
    try {
      const data: any = await this.deleteService.funSendOtpForDeleteAccount(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, message: kOTPSentInPhone, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // API -> Manual hit (Senior Developers)
  @Post('updateBulkEligibility')
  async funUpdateBulkEligibility(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateBulkEligibility(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('verifyOtpForDeleteAccount')
  async funVerifyOtpForDeleteAccount(@Body() body, @Res() res) {
    try {
      body.mode = '2';
      const data: any = await this.deleteService.funVerifyOtpForDeleteAccount(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('userBasicDetails')
  async funGetUserBasicDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetUserBasicDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAllAddressData')
  async funGetAllAddressData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllAddressData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUserBlockDetails')
  async funGetUserBlockDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserBlockDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('resetTodaysCoolOff')
  async funResetTodaysCoolOff(@Res() res) {
    try {
      const data: any = await this.service.resetTodaysCoolOff();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('addMissingAppsFlyerIds')
  async funAddMissingAppsFlyerIds(@Res() res) {
    try {
      await this.service.addMissingAppsFlyerIds();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region get call log list
  @Get('getCallLog')
  async getCallLog(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getCallLog(query);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  // migrate phone and email in allPhone & allEmail
  @Get('migrateAllPhoneEmail')
  async migrateAllPhoneEmail(@Res() res) {
    try {
      const data: any = await this.migrationService.migrateAllPhoneEmail();
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region get Installed app
  @Get('getInstalledApps')
  async funGetInstalledApps(@Query('userId') id, @Res() res) {
    try {
      const reqData = {
        userId: id,
      };

      const data = await this.service.getUserInstalledApps(reqData);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // ADD and DELETE other phone and email
  @Post('updateOtherPhoneEmail')
  async funUpdateOtherPhoneEmail(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.updateOtherPhoneEmail(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('markAsRedProfile')
  async funMarkAsRedProfile(@Body() body, @Res() res) {
    try {
      const data: any = await this.userService.markAsRedProfile(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion get Installed app

  // remove coollOff and blackList
  @Post('removeCoollOffAndBlackList')
  async removeCoollOffAndBlackList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.removeCoollOffAndBlackList(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUserByDeviceId')
  async funGetUserByDeviceId(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserByDeviceId(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getDeviceSIMInfo')
  async funGetDeviceSIMInfo(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDeviceSIMInfo(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUserPermission')
  async funGetUserPermission(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserPermission(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getMailTrackerLogsByUser')
  async funGetMailTrackerLogsByUser(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getMailTrackerLogsByUser(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region track app installation of registered users
  @Post('trackAppInstallForRegUser')
  async funTrackAppInstallForRegUser(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.trackAppInstallForRegUser(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getFramesSessionList')
  async funGetFramesSessionList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getFramesSessionList(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getFrames')
  async funCapturingFrames(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getFrames(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('userRepaymentDetails')
  async funUserRepaymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.userRepaymentDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('decryptedPhoneNumbers')
  async funPhoneNumbers(@Body() body, @Res() res) {
    try {
      const data = await this.service.decryptedPhoneNumbers(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
