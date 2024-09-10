// Imports
import {
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { KycServiceV4 } from './kyc.service.v4';
import { UserServiceV4 } from '../user/user.service.v4';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';

@Controller('kyc')
export class KycControllerV4 {
  constructor(
    private readonly service: KycServiceV4,
    private readonly userService: UserServiceV4,
  ) {}

  @Post('validatemAadhaar')
  async funValidatemAadhaar(@Body() body, @Res() res) {
    try {
      const aadhaarData: any = await this.service.validatemAadhaar(body);
      if (aadhaarData?.message) return res.send(aadhaarData);
      let data: any = {};
      if (aadhaarData?.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
        delete aadhaarData.needUserInfo;
      }

      return res.send({ ...kSuccessData, data: { ...data, ...aadhaarData } });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('aadhaarOtpRequest')
  async funAadhaarOtpRequest(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.aadhaarOtpRequest(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('aadhaarOtpVerify')
  async funAadhaarOtpVerify(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.aadhaarOtpVerify(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('validatePan')
  async funValidatePan(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.validatePan(body);
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

  // In case system failed to validate pan card during reference submission
  @Post('validateStuckPanUsers')
  async funValidateStuckPanUsers(@Res() res) {
    try {
      const data: any = await this.service.validateStuckPanUsers();
      if (data?.message) return res.send(data);
      if (data.userIds) {
        for (let index = 0; index < data.userIds?.length; index++) {
          const userId = data.userIds[index];
          await this.userService.routeDetails({ id: userId });
        }
      }
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('submitPanDetails')
  async funSubmitPanDetails(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitPanDetails(body);
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

  @Post('changeAadhaarService')
  async changeAadhaarService(@Body() body, @Res() res) {
    try {
      if (!body?.userId) return kParamMissing('userId');
      if (!body?.aadhaar_service) return kParamMissing('aadhaar_service');
      let data = await this.userService.routeDetails({
        id: body.userId,
        aadhaar_service: body.aadhaar_service,
      });
      if (data?.message) return res.send(data);
      data = await this.service.changeAadhaarService(body, data);

      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  @Get('profileImage')
  async funProfileImage(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.profileImage(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //#region migrate kyc address to lat log
  @Get('migrateKYCLatLong')
  async migrateKYCLatLong(@Res() res) {
    try {
      const data: any = await this.service.updateLatLngkycData();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion
}
