// Imports
import {
  Body,
  Controller,
  Post,
  Res,
  Get,
  Query,
  Headers,
} from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { UserServiceV4 } from '../user/user.service.v4';
import { EsignServiceV4 } from './esign.service.v4';

@Controller('esign')
export class EsignControllerV4 {
  constructor(
    private readonly service: EsignServiceV4,
    private readonly userService: UserServiceV4,
    private readonly sharedService: ESignSharedService,
  ) {}

  //#region invited for esign
  @Post('inviteForESign')
  async funInviteForESign(@Body() body, @Res() res) {
    try {
      const loanId = body.loanId;
      const userId = body.userId;
      const isProcess = body.inProcess ?? false;
      const typeOfDevice = body?.typeOfDevice;
      if (!loanId || !userId) return res.json(kParamsMissing);
      let data: any = await this.sharedService.inviteForESign(
        loanId,
        isProcess,
        userId,
        typeOfDevice,
      );
      if (data?.message) return res.json(data);
      data = await this.userService.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //#region check esing status
  @Post('checkEsingStatus')
  async funCheckEsignStatus(@Body() body, @Res() res, @Headers() headers) {
    try {
      body.typeofdevice = headers.typeofdevice;
      let data: any = await this.sharedService.checkStatus(body);
      if (data?.message) return res.send(data);

      // Handling -> Flutter web -> Outside app launch esign
      const isSigned = data.isSigned ?? false;
      if (data?.userId) {
        let eventTriggers = [];
        if (data.eventTriggers) {
          eventTriggers = data.eventTriggers;
        }
        data = await this.userService.routeDetails({ id: data.userId });
        if (data?.message) return res.send(data);
        data = { eventTriggers, ...data };
      }
      // Handling -> Flutter web -> Outside app launch esign
      if (!isSigned) data.state = { isProcessing: false };

      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion

  @Post('zoopCallBackURL')
  async funZoopCallBackURL(@Body() body, @Res() res) {
    try {
      const data = await this.service.zoopCallBackURL(body);
      // Sending html format as this is callback url to the frontend
      return res.send(data);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //#region zoop call back url
  @Get('zoopCallBackURL')
  async zoopCallBackURL(@Query() query, @Res() res) {
    try {
      const data = await this.service.zoopCallBackURL(query);
      // Sending html format as this is callback url to the frontend
      return res.send(data);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion
}
