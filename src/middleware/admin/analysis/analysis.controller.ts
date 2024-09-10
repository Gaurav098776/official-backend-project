import { Controller, Get, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { AnalysisService } from './analysis.service';

@Controller('/admin/analysis/')
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}
  @Get('getUserAppDownloadReport')
  async getUserAppDownloadReport(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserAppDownloadReport(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //GET API for getting counts of users stucked
  @Get('getUserStuckDataCounts')
  async getUserStuckDataCounts(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetUserStuckDataCounts(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //GET API for getiting users stucked data
  @Get('getUserStuckData')
  async getUserStuckData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetUserStuckData(query);
      if (data?.message) return res.json(data);
      let status = query?.subKey ?? 'ALL';
      if (!(status == 'ALL' || status == 'LOAN_ACCEPT')) data.totalAmount = 0;
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  @Get('selfieStuckWhatsappMsg')
  async selfieStuckWhatsappMsg(@Query() query, @Res() res) {
    try {
      // temporary stop
      return res.json({ ...kSuccessData });
      const data: any = await this.service.selfieStuckWhatsappMsg(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('kycStuckWhatsappMsg')
  async kycStuckWhatsappMsg(@Query() query, @Res() res) {
    try {
      // temporary stop
      return res.json({ ...kSuccessData });
      const data: any = await this.service.kycStuckWhatsappMsg(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //#region For placing exotel call
  @Get('callStuckUser')
  async callStuckUser(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.callStuckUser(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //get in process loan and user stuck api
  @Get('getInProcessLoanUserStuckList')
  async funGetInProcessLoanUserStuckList(@Res() res) {
    try {
      const data = await this.service.funGetInProcessLoanUserStuckList();
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion
  @Get('sentNotificaionInprogressUser')
  async funSentNotificationInprogressUser(@Res() res) {
    try {
      this.service.funSentNotificationInProcess();
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getLoanAnalyticsTypeWise')
  async funGetLoanAnalyticsTypewise(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetLoanAnalyticsTypeWise(query);
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getLoanRepaymentAnalyticeTypeWise')
  async funGetLoanRepaymentAnalyticsTypeWise(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetLoanRepaymentAnalyticsTypeWise(
        query,
      );
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
