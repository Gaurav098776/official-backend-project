// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { DisbursementService } from './disbursement.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { DashboardDisbursement } from './disbursementDeshboard.service';

@Controller('admin/disbursement')
export class DisbursementController {
  constructor(
    private readonly service: DisbursementService,
    private readonly dashboardDisbursement: DashboardDisbursement,
  ) {}

  @Post('markDisbursementAsComplete')
  async funMarkDisbursementAsComplete(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.markDisbursementAsComplete(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Fallback -> Relog the appsflyer disbursement event
  @Post('ReLogMissedEvents')
  async funRelogMissedEvents(@Res() res) {
    try {
      await this.service.reLogMissedEvents();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // reDirect user in Esing after DisbursementFailed
  @Post('reEsingAfterDisbursementFailed')
  async reEsingAfterDisbursementFailed(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.dashboardDisbursement.reEsingAfterDisbursementFailed(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // fiscal year summary disbursement card
  @Get('fiscalSummaryDisbursement')
  async getFiscalSummaryDisbursement(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getFiscalSummaryDisbursement(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // cron for disbursement settlement
  @Post('disbursementSettlement')
  async disbursementSettlement(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.disbursementSettlement(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
}
