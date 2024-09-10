// Imports
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { AdminAuthCheck, Key } from 'src/authentication/auth.guard';
import { ContactSharedService } from 'src/shared/contact.service';
import { DashboardService } from 'src/admin/dashboard/dashboard.service';
import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
  Body,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly sharedService: ContactSharedService,
  ) {}

  //#region getting all stamp details
  @Get('getAllStampDetails')
  async funAllStampDetails(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.fetchAllStampDetails(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region getting user's location history
  @Get('getLocationHistory')
  async funGetLocationHistory(@Query() query, @Res() res) {
    try {
      if (!query.userId) return res.json(kParamsMissing);
      const result = await this.service.funGetLocationHistory(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('createMasterData')
  async funGetMasterData(@Query() query, @Res() res) {
    try {
      const result = await this.service.funGetMasterData();
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  ////#endregion
  //#region all Disbursed Loans
  @Get('allDisbursedLoans')
  async allDisbursedLoans(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.allDisbursedLoans(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region  getStampCount
  @Get('getStampCount')
  async funGetStampCount(@Res() res) {
    try {
      const data: any = await this.service.getStampCount();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getContactData')
  async getUniqueContactData(@Res() res, @Req() req, @Query() query) {
    try {
      query.token = req.headers['access-token'] ?? '';
      const result: any = await this.sharedService.getUniqueContacts(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get active part pay details
  @Get('getActivePartPaymentDetails')
  async funGetActivePartPaymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getActivePartPaymentDetails(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  // #region get Repaid CardData
  @Get('getRepaidCardData')
  async funGetRepaidCardData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getRepaidCardData();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAllChatDocumentByUserId')
  async funAllChatDocumentByUserId(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.fetchAllChatDocumentByUserId(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAllDocumentsLoanWise')
  async funAllDocumentsLoanWise(@Query() query, @Res() res) {
    try {
      const data = await this.service.fetchAllDocumentsLoanWise(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('/getPaymentData')
  async funGetPaymentData(@Res() res) {
    try {
      const data: any = await this.service.funGetPaymentData();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get chat count
  @Get('getChatCount')
  async getChatCount(@Res() res) {
    try {
      const data: any = await this.service.getChatCount();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // get 15 Days Count And Amount Emi Data
  @Get('get15DaysCountAndAmountEmiData')
  async funGet15DaysCountAndAmountEmiData(@Res() res) {
    try {
      const data: any = await this.service.get15DaysCountAndAmountEmiData();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Get('getAllDeviceByUserId')
  async funGetAllDeviceByUserId(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllDeviceByUserId(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kParamsMissing);
    }
  }

  @Get('getNetBankingDetails')
  async funGetNetBankingDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getNetbankingNMandateData(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // Loan History Counts
  @Get('getLoanHistoryCounts')
  async funGetLoanHistoryCounts(@Key() userId, @Res() res) {
    try {
      if (!userId) return res.json(kParamsMissing);
      const data: any = await this.service.getLoanTransactionService(userId);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //  get dashboard static data api
  @Get('getDashboardData')
  async funGetDashboardData(@Res() res) {
    try {
      const data = await this.service.getDashboardData();
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region batch file upload
  @Post('uploadBatchFile')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async funUploadBatchFile(@UploadedFile() file, @Body() body, @Res() res) {
    try {
      body.file = file;
      const data: any = await this.service.funUploadBatchFile(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
}
