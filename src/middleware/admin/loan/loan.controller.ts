// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { LoanService } from './loan.service';
import { DashboardLoanService } from './dashboard.loan.service';
import { PredictionService } from '../eligibility/prediction.service';
import { LoanSharedService } from 'src/shared/loan.shared.service';

@Controller('admin/loan')
export class LoanController {
  constructor(
    private readonly calculation: CalculationSharedService,
    private readonly sharedEligiblityService: EligibilitySharedService,
    private readonly service: LoanService,
    private readonly dashboardLoanService: DashboardLoanService,
    private readonly sharedPrediction: PredictionService,
    private readonly loanSharedService: LoanSharedService,
  ) {}

  @Post('addAccIdToMissingOne')
  async funAddAccIdToMissingOne(@Body() body, @Res() res) {
    try {
      const loanId = body?.loanId;
      await this.service.addAccIdToMissingOne(loanId);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('fullPaymentData')
  async funFullPaymentData(@Query() query, @Res() res) {
    try {
      const data: any = await this.calculation.getFullPaymentData(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region auto decline loan after 7 day
  @Get('autoDeclineLoanAfter7Day')
  async autoDeclineLoanAfter7Day(@Query() query, @Res() res) {
    try {
      const data = await this.sharedEligiblityService.autoDeclineLoanAfter7Day(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('insuranceProposal')
  async funInsuranceProposal(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.insuranceProposal(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getLoanHistory')
  async funLoanHistoryData(@Query() query, @Res() res) {
    try {
      const data: any = await this.dashboardLoanService.getLoanHistory(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('trackerAndMissingMonth')
  async funTrackerAndMissingMonth(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.trackerAndMissingMonth(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region update pending insurance
  @Get('updatePendingInsurance')
  async updatePendingInsurance(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.updatePendingInsurance(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region update pending insurance
  @Get('migrateLanId')
  async migrateLanId(@Res() res) {
    try {
      const data: any = await this.service.migrateLanId();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region reinitiate insurance
  @Post('reinitiateInsurance')
  async reinitiateInsurance(@Body() body, @Res() res) {
    try {
      const data = await this.service.reinitiateInsurance(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get loan and emi data with paid and waived bifurcation
  @Get('loanPaidWaivedData')
  async loanPaidWaivedData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.loanPaidWaivedData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region add loan quality parameters
  @Post('addQualityParameters')
  async addQualityParameters(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.addQualityParameters(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Enable Part-pay Eligibility
  @Post('enablePartPay')
  async enablePartPay(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.enablePartPay(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get loan quality parameters
  @Get('getLoanQualityParameters')
  async getQualityParameters(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getQualityParameters(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Insurance Migrate for Null Insurance ids
  @Get('migrateNullInsurance')
  async funMigrateInsurance(@Res() res) {
    try {
      const data: any = await this.service.InsuranceMigrate();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('massEMIRepaymentDetails')
  async funMassEMIRepaymentDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.massEMIRepaymentDetails(body);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('fullPayAmount')
  async funFullPayAmount(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getFullPayAmount(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getEMIDetails')
  async funGetEMIDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getEMIDetails(query);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // start region for giving payment details for loan repayment
  @Get('getLoanEmiRepaymentDetails')
  async funGetLoanEmiRepaymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.loanSharedService.getLoanEmiRepaymentDetails(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion
  //#region  deactive payment links sent from mails
  @Get('deactivePaymentLinks')
  async funDeactivePaymentLinks(@Res() res) {
    try {
      const data: any = await this.loanSharedService.deactivePaymentLinks();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('foreCloseReport')
  async funForeCloseReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.foreCloseReport(body);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
