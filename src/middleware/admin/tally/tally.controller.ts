// Imports
import { TallyService } from './tally.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';

@Controller('admin/tally')
export class TallyController {
  constructor(private readonly service: TallyService) {}

  //Disbursement summary card
  @Get('getAllDisbursementDetails')
  async funAllDisbursementDetails(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.allDisbursementDetails(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //Repayment summary card
  @Get('getAllRepaymentData')
  async funAllRepaymentData(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.getRepaymentData(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //create payment settlements from 3rd party(razorpay-1,2,cashfree)
  @Post('syncSettlements')
  async funSyncSettlements(@Body() body, @Res() res) {
    try {
      const result: any = await this.service.syncSettlements(body);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //Wallet settlement card
  @Get('getWalletSettlementDetails')
  async funWalletSettlementDetails(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.getWalletSettlementDetails(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //Account Ledger table
  @Get('getLoanDisbursementDetails')
  async funLoanDisbursementDetails(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.getLoanDisbursementDetails(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //Get Ledger loan details
  @Get('getLedgerLoanDetails')
  async funLedgerLoanDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getLedgerLoanDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('generateBulkLedgers')
  async funGenerateBulkLedgers(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.generateBulkLedgers(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // LCR Report Generate
  @Post('lcrReport')
  async funGenerateLCRReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.generateLCRReport(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // Get LCR Report
  @Post('getLCRInfo')
  async funGetLCRInfo(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getLCRInfo(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
