// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { UserServiceV3 } from '../user/user.service.v3';
import { EsignServiceV3 } from './esign.service.v3';

@Controller('esign')
export class EsignControllerV3 {
  constructor(
    private readonly service: EsignServiceV3,
    private readonly userService: UserServiceV3,
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
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region check esing status
  @Post('checkEsingStatus')
  async funCheckEsignStatus(@Body() body, @Res() res) {
    try {
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
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region zoop call back url
  @Post('zoopCallBackURL')
  async zoopCallBackURL(@Body() body, @Res() res) {
    try {
      const data = await this.service.zoopCallBackURL(body);
      // Sending html format as this is callback url to the frontend
      return res.send(data);
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion
}
