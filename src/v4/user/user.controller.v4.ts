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
  kParamMissing,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import {
  kChangePassCodeRoute,
  kOTPSentInPhone,
  kSomthinfWentWrong,
} from 'src/constants/strings';
import { PassCodeServiceV4 } from './passcode.service.v4';
import { UserServiceV4 } from './user.service.v4';
import { UserDeleteService } from 'src/shared/delete.user.service';
import { IPConfig } from 'src/utils/custom.decorators';
import { CibilService } from 'src/shared/cibil.service';
import { k500Error } from 'src/constants/misc';

@Controller('user')
export class UserControllerV4 {
  constructor(
    private readonly service: UserServiceV4,
    private readonly passcodeService: PassCodeServiceV4,
    private readonly deleteService: UserDeleteService,
    private readonly cibilService: CibilService,
  ) {}

  // login
  @Post('logIn')
  async funLogIn(@Body() body, @Res() res, @Headers() headers) {
    try {
      const data = await this.service.logIn(body, headers);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Cached API Endpoint
  // #region user all steps details
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

      if (query.isRefresh != 'true') query.userReq = true; // For caching
      const data: any = await this.service.routeDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Check User's History(Is User Already Blocked in Another NBFC?)
  @Get('checkUserHistory')
  async funCheckUserHistory(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.checkUserHistory(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Cached API Endpoint
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

      if (query.isRefresh != 'true') query.userReq = true; // For caching
      const data: any = await this.service.routeDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //end region

  // Upload selfie of user
  @Post('uploadSelfie')
  async funUploadSelfie(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.uploadSelfie(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Generate Otp for user login
  @Post('generateOTP')
  async funGenerateOTP(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.generateOTP(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Verify Otp for user login
  @Post('verifyOTP')
  async funVerifyOTP(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.verifyOTP(body);
      if (data?.message) return res.send(data);
      if (body.type == 'passcode') data.continueRoute = kChangePassCodeRoute;
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Submit new user details
  @Post('submitNewUserDetails')
  async funSubmitNewUserDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitNewUserDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // send otp to user to delete account
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

  // Verify otp and delete user account
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
      console.error('Error in: ', error);
      return res.json(kInternalError);
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
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('checkPassCode')
  async funCheckPassCode(@Headers() headers, @Body() body, @Res() res) {
    try {
      const reqData = { ...headers, ...body };
      let passCodeData: any = await this.passcodeService.checkPassCode(reqData);
      if (passCodeData?.message) return res.send(passCodeData);
      let data: any;
      if (passCodeData.needUserInfo)
        data = await this.service.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      if (passCodeData?.jwtToken) data.jwtToken = passCodeData.jwtToken;
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('updateBulkPasscodeMigrate')
  async updateBulkPasscodeMigrate(@Res() res) {
    try {
      const data: any = await this.passcodeService.updateBulkPasscodeMigrate();
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
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
      console.error('Error in: ', error);
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
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  // Submit Installed apps of user
  @Post('submitInstalledApps')
  async funSubmitInstalledApps(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitInstalledApps(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Check user permission list
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
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //Update last online time
  @Get('lastOnlineTime')
  async lastOnlineTime(@Key() userId, @Query() query, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const reqData = { ...query, userId };
      const result = await this.service.lastOnlineTime(reqData);
      if (result?.message) return res.json(result);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //Get lsp contact details
  @Get('getCompanyContactInfo')
  async getCompanyContactInfo(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(k403Forbidden);
      const result = await this.service.getCompanyContactInfo(userId);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // re send otp
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
      if (result?.message) return res.json(kInternalError);
      else if (result) return res.json({ ...kSuccessData, data: result ?? {} });
      return res.json(k422ErrorMessage(kSomthinfWentWrong));
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // Re send email
  @Post('reSendEmail')
  async reSendEmail(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.reSendEmail(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // fetch user registration fields.
  @Get('getUserRegistrationFields')
  async funGetUserRegistrationFields(
    @Key() userId,
    @Query() query,
    @Res() res,
  ) {
    try {
      if (!userId) userId = query?.userId;
      if (!userId) return res.json(k403Forbidden);
      const data: any = await this.service.getUserRegistrationFields(userId);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('checkIp') async funcheckIp(@Res() res) {
    return res.send();
  }

  // Save Image frames on every activity
  @Post('saveImageFrame')
  async funSaveImageFrame(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.saveImageFrame(body);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('deleteFrames')
  async fundeleteFrames(@Res() res) {
    try {
      const data: any = await this.service.deleteFrames();
      if (data?.message) return res.json(kSuccessData);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('checkNewUserEligibleOrNot')
  async funcheckNewUserEligibleOrNot(
    @IPConfig() ip,
    @Body() body,
    @Res() res,
    @Headers() headers,
  ) {
    try {
      body.ip = ip;
      const data: any = await this.service.checkNewUserEligibleOrNot(
        body,
        headers,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
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
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('purposeList')
  async purposeList(@Res() res) {
    try {
      const data: any = await this.service.getPurposeList();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Basic Details for Repeated Users
  @Get('basicDetailsList')
  async basicDetailsList(@Key() userId, @Query() query, @Res() res) {
    try {
      const purposeList: any = await this.service.getPurposeList();
      if (purposeList?.message) return res.send(purposeList);
      const communicationLanguage: any =
        await this.service.getcommunicationLanguage(userId ?? query.userId);
      if (communicationLanguage?.message)
        return res.send(communicationLanguage);
      const data = { purposeList, communicationLanguage };
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('submitBasicDetails')
  async funSubmitBasicDetails(@Body() body, @Res() res) {
    try {
      const data = await this.service.submitBasicDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
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
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('submitPersonalDetails')
  async funSubmitPersonalDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.submitPersonalDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  @Get('getCibilData')
  async funGetCibilData(@Query() query, @Res() res, @Headers() headers) {
    try {
      const userId = query?.userId ?? headers?.secret_key;
      const appType = query?.appType ?? headers?.apptype;
      const data: any = await this.cibilService.getCibilHistoryData(
        userId,
        appType,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('changeBioMetricStatus')
  async funBioMetricEnable(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funChangeBioMetricStatus(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
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
      if (!simNumber || !operatorName) return res.json({});
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
}
