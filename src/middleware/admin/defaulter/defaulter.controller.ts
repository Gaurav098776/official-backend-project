// Imports
import { DefaulterService } from './defaulter.service';
import {
  kBadRequest,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';
import { DevOpsGuard, Key } from 'src/authentication/auth.guard';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { IPConfig } from 'src/utils/custom.decorators';
@Controller('admin/defaulter')
export class DefaulterController {
  constructor(
    private readonly service: DefaulterService,
    private readonly promoCodeService: PromoCodeService,
    private readonly sharedTransactionService: SharedTransactionService,
  ) {}

  @Get('getPTPreminders')
  async funGetPTPReminders(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getPTPReminders(query);
      if (data?.message) return res.send(data);

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('updatePTPreminders')
  async funUpdatePTPReminders(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updatePTPReminders(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region get defulter assing admin list
  @Get('getDefaulterAssign')
  async getDefaulterAssign(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDefaulterAssign();
      if (data?.message) return res.send(data);

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //Find defaulter User
  @Get('findDefaulterUserLocation')
  async funfindDefaulterUserLocation(@Query() query, @Res() res) {
    try {
      const data: any = query?.userId
        ? await this.service.findDefaulterUserLocation(query)
        : this.service.findDefaulterUserLocation(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region Find nerest user location
  @Get('getNearestUsers')
  async getNearestUsers(@Query() query, @Res() res) {
    try {
      if (!query?.userId) return res.json(kParamsMissing);
      const data: any = await this.service.findNearestUser(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region dashboard defaulter card data
  @Get('getDefaulterDetails')
  async funGetDefaulterCardData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDefaulterDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      // if any error raise at runtime
      return res.json(kInternalError);
    }
  }

  //#endregion
  @Post('checkDefaultersBalance')
  async funCheckDefaulterBalance(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkDefaultersBalance(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('autoAssignDefaulters')
  async funAutoAssignDefaulters(@Res() res, @IPConfig() ip) {
    try {
      const data: any = await this.service.autoAssignDefaulters(ip);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region check app is install origin not
  @Get('checkAppIsInstall')
  async checkAppIsInstall(@Key() userId, @Res() res) {
    try {
      const data: any = await this.service.checkAppIsInstall(userId);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('trackSettledAvail')
  async funTrackSettledAvail(@Body() body, @Res() res) {
    try {
      await this.service.trackSettledAvail(body);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('dashboardCard')
  async funDashboardCard(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.dashboardCard(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('dayWiseDetails')
  async funDayWiseDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.dayWiseDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('loanAssetsData')
  async funLoanAssetsData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.loanAssetsData(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('partPayments')
  async funPartPayments(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.partPayments(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('unTouchedCrmUsers')
  async funUnTouchedPTPs(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.unTouchedCrmUsers(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('collectionSummary')
  async funCollectionSummary(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.collectionSummary(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('onlineUsers')
  async funOnlineUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.onlineUsers(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('aaUsers')
  async funAAUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.aaUsers(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('performanceSummary')
  async funPerformanceSummary(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.performanceSummary(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('onlineDefaulterUsers')
  async funOnlineDefaulterUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.onlineDefaulterUsers(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getDefaultersCardData')
  async getDefaultersCardData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDefaultersCardData(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('dailySummaryDelivery')
  async fundailySummaryDelivery(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.dailySummaryDelivery(query);
      if (data?.message) return res.send(data);
      return res.send({ data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('notifyTodaysDuePTPs')
  async funNotifyPtps(@Res() res) {
    try {
      const data: any = await this.service.notifyTodaysDuePTPs();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region create promo code
  @Post('createDefaulterPromoCode')
  async funCreatePromoCode(@Body() body, @Res() res) {
    try {
      const data: any = await this.promoCodeService.createPromoCodeData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region update promo code active status
  @Post('actionPromoCode')
  async funActionPromoCode(@Body() body, @Res() res) {
    try {
      const data: any = await this.promoCodeService.updateIsActive(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get promo Code list
  @Get('promoCode')
  async funPromoCodeList(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.getPromoCode(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region cron test
  @Get('cronRun')
  async cronTest(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.promoCodeCron(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get users promo codes eligibility
  @Get('checkUserPromoEligibility')
  async checkUserPromoEligibility(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.checkUserPromoEligibility(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get users promo codes
  @Get('getUserPromoCode')
  async getUserPromoCode(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.getUsersPromoCode(
        query,
        [],
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get users EMIs with promo code details
  @Get('getUserWaiveOffEligibility')
  async getUserWaiveOffEligibility(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.getUserWaiveOffEligibility(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Get('callDefaulters')
  async Defaulter(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.callDefaulters(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('takeFollowUp')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async funTakeFollowUp(
    @UploadedFile() file,
    @Body() body,
    @Res() res,
    @Req() req,
    @IPConfig() ip,
  ) {
    try {
      //Params validation
      if (file) {
        const fileName = file.filename;
        if (!fileName) return res.json(kParamsMissing);
        body.fileName = fileName;
      } else {
        const adminId: number = body.adminId;
        const loanIds: number[] = body.loanIds;
        if (!adminId || !loanIds) return res.json(kParamsMissing);
        else if (loanIds.length == 0) return res.json(kBadRequest);
      }
      const changeBy = req.headers['adminid'];
      body.changeBy = changeBy;
      body.ip = ip;
      const result: any = await this.service.takeFollowUp(body);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('createNoc')
  async createUserNoc(@Query() query, @Res() res) {
    try {
      const data: any = await this.sharedTransactionService.createUserNoc(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data: 'mail sent successfully..' });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @UseGuards(DevOpsGuard)
  @Post('placePIWiseAutoDebits')
  async funPlacePIWiseAutoDebits(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.placePIWiseAutoDebits(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('reverseSettlement')
  async funReverseSettlement(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.reverseSettlement(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('periodicFetchAAUser')
  async funPeriodicFetchAAUser(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.periodicFetchAAUser(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
