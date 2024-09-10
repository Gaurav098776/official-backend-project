// Imports
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Key } from 'src/authentication/auth.guard';
import {
  k403Forbidden,
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import {
  kChangePassCodeRoute,
  kOTPSentInPhone,
  kSomthinfWentWrong,
} from 'src/constants/strings';
import { UserSharedService } from 'src/shared/user.share.service';
import { PassCodeServiceV3 } from './passcode.service.v3';
import { UserServiceV3 } from './user.service.v3';
import { UserDeleteService } from 'src/shared/delete.user.service';
import { IPConfig } from 'src/utils/custom.decorators';
import { k500Error } from 'src/constants/misc';
import { Column, DataType, Table } from 'sequelize-typescript';

@Controller('user')
export class UserControllerV3 {
  constructor(
    private readonly passcodeService: PassCodeServiceV3,
    private readonly service: UserServiceV3,
    private readonly deleteService: UserDeleteService,
    private readonly userSharedService: UserSharedService,
  ) {}

  @Post('logIn')
  async funLogIn(@Body() body, @Res() res, @Headers() headers) {
    try {
      const data: any = await this.service.logIn(body, headers);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('routeDetails')
  async funRouteDetails(
    @IPConfig() ip,
    @Key() userId,
    @Query() query,
    @Res() res,
  ) {
    try {
      query.userId = userId;
      query.ip = ip;
      /// check appVersion
      const appVersion = query?.appVersion;
      const typeOfDevice = query?.typeOfDevice;
      const version = this.service.checkAppVersion(typeOfDevice, appVersion);
      if (version?.route) return res.send({ ...kSuccessData, data: version });

      const data: any = await this.service.routeDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('routeDetails')
  async funRouteDetailsPOST(
    @IPConfig() ip,
    @Key() userId,
    @Query() query,
    @Res() res,
  ) {
    try {
      query.userId = userId;
      query.ip = ip;
      /// check appVersion
      const appVersion = query?.appVersion;
      const typeOfDevice = query?.typeOfDevice;
      const version = this.service.checkAppVersion(typeOfDevice, appVersion);
      if (version?.route) return res.send({ ...kSuccessData, data: version });

      const data: any = await this.service.routeDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('uploadSelfie')
  async funUploadSelfie(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.uploadSelfie(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('generateOTP')
  async funGenerateOTP(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.generateOTP(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('verifyOTP')
  async funVerifyOTP(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.verifyOTP(body);

      if (data?.message) return res.send(data);
      if (body.type == 'passcode') data.continueRoute = kChangePassCodeRoute;
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitRoute')
  async funSubmitRoute(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitRoute(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitCibilConsent')
  async funSubmitCibilConsent(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitCibilConsent(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('purposeList')
  async purposeList(@Res() res) {
    try {
      const data: any = await this.service.getPurposeList();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Basic Details for Repeated Users
  @Get('basicDetailsList')
  async basicDetailsList(@Key() userId, @Res() res) {
    try {
      const purposeList: any = await this.service.getPurposeList();
      if (purposeList?.message) return res.send(purposeList);
      const communicationLanguage: any =
        await this.service.getcommunicationLanguage(userId);
      if (communicationLanguage?.message)
        return res.send(communicationLanguage);
      const data = { purposeList, communicationLanguage };
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
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
      return res.json(kInternalError);
    }
  }

  @Post('verifyOtpForDeleteAccount')
  async funVerifyOtpForDeleteAccount(@Body() body, @Res() res) {
    try {
      body.mode = '1';
      const data: any = await this.deleteService.funVerifyOtpForDeleteAccount(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('submitPersonalDetails')
  async funSubmitPersonalDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitPersonalDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitProfessionalDetails')
  async funSubmitProfessionalDetails(@Body() body, @Res() res) {
    try {
      let data: any = await this.userSharedService.submitProfessionalDetails(
        body,
      );
      if (data?.message) return res.send(data);
      data = await this.service.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region Passcode route
  @Post('setPassCode')
  async funSetPassCode(@Body() body, @Res() res) {
    try {
      let data: any = await this.passcodeService.setPasscode(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.service.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkPassCode')
  async funCheckPassCode(@Body() body, @Res() res) {
    try {
      let passCodeData: any = await this.passcodeService.checkPassCode(body);
      if (passCodeData?.message) return res.send(passCodeData);
      let data: any;
      if (passCodeData.needUserInfo)
        data = await this.service.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      if (passCodeData?.jwtToken) data.jwtToken = passCodeData.jwtToken;
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('changePasscode')
  async funChangePasscode(@Body() body, @Res() res) {
    try {
      let data: any = await this.passcodeService.changePasscode(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.service.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('forgetPassCode')
  async funForgetPassCode(@Body() body, @Res() res) {
    try {
      const data: any = await this.passcodeService.forgetPassCode(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region  validate response
  @Get('userMigration')
  async userMigration(@Query() query, @Res() res) {
    try {
      const page = query?.page ?? 0;
      await this.service.userMigration(page);
      return res.send({ ...kSuccessData });
    } catch (error) {
      // Silent response to user
      return res.json(kSuccessData);
    }
  }
  //#endregion

  @Post('fetchHealthData')
  async funFetchHealthData(@Body() body, @Res() res) {
    try {
      const data: any = await this.userSharedService.fetchHealthData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('fetchOtherPermissionData')
  async funFetchOtherPermissionData(@Body() body, @Res() res) {
    try {
      const data: any = await this.userSharedService.fetchOtherPermissionData(
        body,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitInstalledApps')
  async funSubmitInstalledApps(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitInstalledApps(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('checkIp') async funcheckIp(@Res() res) {
    return res.send();
  }

  @Get('checkUserPermissionsList')
  async checkUserPermissionsList(
    @Headers() headers,
    @Query() query,
    @Res() res,
  ) {
    try {
      const reqData = { ...headers, ...query };
      const data: any = await this.service.getUserAppPermissions(reqData);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('addDeviceSIMInfo')
  async addDeviceSIMInfo(@Key() userId, @Body() body, @Res() res) {
    try {
      const simNumber = body.number;
      const operatorName = body.carrier;
      const simNumber2 = body?.number_1;
      const operatorName2 = body?.carrier_1;
      if (!userId) return res.json(k403Forbidden);
      if (!simNumber || !operatorName) return res.json(kParamsMissing);
      const passData = {
        userId,
        simNumber,
        operatorName,
        simNumber2,
        operatorName2,
      };
      const data = await this.service.addDeviceSIMInfo(passData);
      if (data == k500Error) return res.json(kInternalError);
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  //#region update last online time
  @Get('lastOnlineTime')
  async lastOnlineTime(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const result = await this.service.lastOnlineTime(userId);
      if (result?.message) return res.json(result);
      return res.json(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // #region Select Interest
  @Post('selectInterest')
  async selectInterest(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      if (!body?.isInterestedInLoan && !body?.isInterestedInGold)
        return res.json(kParamsMissing);
      const data: any = await this.service.selectInterest(userId, body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get lsp contact details
  @Get('getCompanyContactInfo')
  async getCompanyContactInfo(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const result = await this.service.getCompanyContactInfo(userId);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //region user Request Supports
  @Post('requestSupport')
  async requestSupport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.requestSupport(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  // #endregion

  // check stuck user's RouteDetails
  @Post('checkStuckRouteDetails')
  async funCheckStuckRouteDetails(@Body() body, @Res() res) {
    try {
      const data = body?.userId ?? [];
      if (data.length > 0) {
        for (let index = 0; index < data.length; index++) {
          try {
            const id = data[index];
            if (index % 100 == 0) console.log(index);
            const response: any = await this.service.routeDetails({ id });
            if (response?.message) console.log('Route Error', id);
            console.log(response?.continueRoute);
          } catch (error) {}
        }
      }
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitNewUserDetails')
  async funSubmitNewUserDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitNewUserDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkNewUserEligibleOrNot')
  async funcheckNewUserEligibleOrNot(@IPConfig() ip, @Body() body, @Res() res) {
    try {
      body.ip = ip;
      const data: any = await this.service.checkNewUserEligibleOrNot(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('verifyEmailToken')
  async funVerifyEmailToken(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.verifyEmailToken(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('reSendOTP')
  async reSendOTP(@Key() userId, @Query() query, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const type = (query?.type ?? '').toLocaleUpperCase();
      if (!type) return res.json(kParamsMissing);
      let result;
      if (type == 'PHONE') result = await this.service.reSendOtpPhone(userId);
      else if (type == 'EMAIL')
        result = await this.service.reSendOtpEmail(userId);
      if (result == k500Error) return res.json(kInternalError);
      else if (result) return res.json({ ...kSuccessData, data: result ?? {} });
      return res.json(k422ErrorMessage(kSomthinfWentWrong));
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('reSendEmail')
  async reSendEmail(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.reSendEmail(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getUserRegistrationFields')
  async funGetUserRegistrationFields(
    @Key() userId,
    @Query() query,
    @Res() res,
  ) {
    try {
      if (!userId) userId = query.userId;
      const data: any = await this.service.getUserRegistrationFields(userId);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('updateSkipReferralField')
  async funupdateSkipReferralField(@Res() res) {
    try {
      const data: any = await this.service.updateSkipReferralField();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('saveImageFrame')
  async funSaveImageFrame(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.saveImageFrame(body);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
