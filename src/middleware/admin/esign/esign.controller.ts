// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { ESignService } from './esign.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';

@Controller('admin/esign')
export class ESignController {
  constructor(
    private readonly service: ESignService,
    private readonly sharedService: ESignSharedService,
    private readonly userService: UserServiceV4,
  ) {}

  @Get('getESignStuckData')
  async funGetESignStuckData(@Query() query, @Res() res) {
    try {
      const data = await this.service.getStuckTableData(query);
      if (data == k500Error) return res.json(kInternalError);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('deleteEsign')
  async funDeleteEsign(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funDeleteEsign(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('checkPendingEsing')
  async funCheckPendingEsing(@Res() res) {
    try {
      const data: any = await this.service.checkPendingEsign();
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('reGenerateEsing')
  async funReGenerateEsing(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.regenerateEsign(body);
      if (data?.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getLoanAgreement')
  async funLoanAgreement(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getLoanAgreement(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Post('notifyPendingUsers')
  async funNotifyPendingUsers(@Body() body, @Res() res) {
    try {
      this.service.notifyPendingUsers(body);
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

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
}
