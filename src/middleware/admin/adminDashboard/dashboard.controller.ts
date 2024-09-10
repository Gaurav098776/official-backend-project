import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { KycDashboardService } from '../kyc/kyc.service';
import { AdminDashboardService } from './dashboard.service';
import { DashboardLoanService } from '../loan/dashboard.loan.service';
import { DashboardDisbursement } from '../disbursement/disbursementDeshboard.service';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    private readonly service: AdminDashboardService,
    private readonly loanService: DashboardLoanService,
    private readonly kycService: KycDashboardService,
    private readonly disbursementService: DashboardDisbursement,
  ) {}

  @Post('downloadDocuments')
  async downloadDocuments(@Body() body, @Res() res) {
    try {
      if (!body?.urlList || body?.urlList.length <= 0)
        return res.json(kParamsMissing);

      const response = await this.service.downloadDocument(body.urlList);
      if (!response || response === kInternalError)
        return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region today auto debit data
  @Get('todayAutoDebitData')
  async funTodayAutoDebitData(@Query() query, @Res() res) {
    try {
      const resData: any = await this.service.getTodayAutoDebitData(query);
      if (resData?.message) return res.json(resData);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region migrate transaction date
  @Get('migarateTransactionDate')
  async funMigrateTransacionDate(@Res() res) {
    try {
      const result = await this.service.migrateTransactionDate();
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#endregion

  //#region  get contact data
  @Get('allContactData')
  async funAllContactData(@Query() query, @Res() res) {
    try {
      const resData = await this.service.getAllContactData(query);
      if (!resData || resData == k500Error) return res.json(kInternalError);
      if (resData?.message) return res.json(resData);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('residenceVerificationData')
  async funResidenceVerificationData(@Query() query, @Res() res) {
    try {
      if (!query.status) return res.json(kParamsMissing);
      if (query.status != '0' && !query.download)
        if (!query.page) return res.json(kParamsMissing);

      const resData = await this.service.getResidenceVerificationData(
        query.status,
        +query.page,
        query.searchText,
        query.download,
      );
      if (!resData || resData == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region kyc verification
  @Get('getKYCVerificationData')
  async funGetVerificationData(@Query() query, @Res() res) {
    try {
      if (!query.status) return res.json(kParamsMissing);
      if (query.status !== '0' && !query.download)
        if (!query.page) return res.json(kParamsMissing);
      const resData: any = await this.kycService.getVerificationData(query);
      if (resData === k500Error) return res.json(kInternalError);
      if (resData.valid == false) return res.json(resData);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Final verification
  @Get('/getAllPendingManualLoanVerificationData')
  async funGetAllPendingManualLoanVerificationData(@Query() query, @Res() res) {
    try {
      if (!query.status) return res.json(kParamsMissing);
      const result = await this.loanService.getAllLoanVerificationData(query);
      if (!result || result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('getQueuedDisbursements')
  async funGetQueuedDisbursements(@Res() res) {
    try {
      const data = await this.disbursementService.getQueuedDisbursements();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getTodayAutoDebitCount')
  async funGetTodayAutoDebitCount(@Res() res) {
    try {
      const result = await this.service.todayAutoDebitCount();
      return res.json({ ...kSuccessData, data: result }).end();
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //notification before 7th day loan decline
  @Get('sendNotificationBeforeLoanDecline')
  async funSendNotificationBeforeLoanDecline(@Res() res) {
    try {
      const data = await this.loanService.sendNotificationBeforeLoanDecline();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // dropDown list for user ContinueStage
  @Get('dropDownContinueStage')
  async funDropDownContinueStage(@Res() res) {
    try {
      const data: any = await this.service.dropDownContinueStage();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('loanVerificationTrackerData')
  async funloanVerificationTrackerData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getVerificationTrackingData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get all users data
  @Get('allUserData')
  async funGetAllUserData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllUserData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('smartSearch')
  async funSmartSearch(@Query() query, @Res() res) {
    try {
      if (!query?.searchText) return res.json(kSuccessData);
      const response = await this.service.findAllUpdatedUsers(query);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get user selfie image
  @Get('userSelfie')
  async funGetUserSelfie(@Query() query, @Res() res) {
    try {
      const data = await this.service.getUserSelfie(query);
      if (data?.message) return res.json(data);
      if (data === k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (e) {
      return res.json(kInternalError);
    }
  }

  // get collection admin's collection amount
  @Get('getCollectionAmount')
  async funGetCollectionAmount(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getCollectionAmount(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get referral user data for dashboard just for redis
  @Get('getRegisteredUserData')
  async funRegisteredUserData(@Res() res) {
    try {
      const data: any = await this.service.getRegisteredUserData();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //get data for graph
  @Get('getDashboardGraphData')
  async fungetLoanDisbursGraphData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDashboardGraphData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
}
