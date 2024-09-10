// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { TransactionDevelopmentService } from 'src/admin/transaction/trans.dev.service';
import { RefundService } from 'src/admin/transaction/refund.service';
import { TransactionService } from 'src/admin/transaction/transaction.service';
import { TypeService } from 'src/utils/type.service';
import {
  kRepaymentRoute,
  kWebviewRoute,
  kWrongSourceType,
} from 'src/constants/strings';
import { k500Error } from 'src/constants/misc';
import {
  getPaymentWebData,
  getPaymentWebDatav2,
  kUploadFileObj,
} from 'src/constants/objects';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppsFlyerService } from 'src/thirdParty/appsFlyer/appsFlyer.service';

@Controller('admin/transaction')
export class TransactionController {
  constructor(
    private readonly service: TransactionService,
    private readonly devService: TransactionDevelopmentService,
    private readonly refundService: RefundService,
    private readonly typeService: TypeService,
    private readonly sharedTransaction: SharedTransactionService,
    private readonly appsFlyer: AppsFlyerService,
  ) {}

  @Get('allRepaidLoans')
  async funAllRepaidLoans(@Res() res, @Query() query) {
    try {
      if (!query.start_date || !query.end_date) return res.json(kParamsMissing);
      const finalRes: any = await this.service.getAllRepaidLoans(query);
      if (finalRes.message) return res.json(finalRes);
      return res.json({ ...kSuccessData, data: finalRes });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('fixAllIssues')
  async funFixAllIssues(@Res() res) {
    try {
      await this.service.fixAllIssues();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region get auto debit list
  @Get('cfAutoDebitList')
  async funCfAutoDebitList(@Query() query, @Res() res) {
    try {
      if (!query.status || !query.loanId) return res.json(kParamsMissing);
      const cfAutoDebitData = await this.service.fetchCfAutoDebitList(
        query.status,
        query.loanId,
      );
      if (cfAutoDebitData?.message) return res.json(cfAutoDebitData);
      return res.json({ ...kSuccessData, data: cfAutoDebitData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  // Development purposes
  @Post('addDummyTransaction')
  async funAddDummyTransaction(@Body() body, @Res() res) {
    try {
      const data: any = await this.devService.addDummyTransaction(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region refundable data
  @Get('getRefundableData')
  async funGetRefundableData(@Query() query, @Req() req, @Res() res) {
    try {
      if (!query.status || !req.headers.adminid)
        return res.json(kParamsMissing);
      let startDate = query?.startDate;
      let endDate = query?.endDate;
      if (!startDate)
        startDate = this.typeService.getGlobalDate(new Date()).toJSON();
      if (!endDate)
        endDate = this.typeService.getGlobalDate(new Date()).toJSON();
      let loanId = query?.loanId ?? -1;
      if (!loanId) loanId = -1;
      let result;
      if (query.status == '-1') {
        result = await this.refundService.getRefundablesData(
          startDate,
          endDate,
          req.headers.adminid,
          loanId,
          query?.download,
        );
      } else {
        result = await this.refundService.getAllRefundedData(
          startDate,
          endDate,
          query.page,
          query.status,
          query?.download,
          query.skipPageLimit ?? 'false',
        );
      }
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region check And Place Refund
  @Post('checkAndPlaceRefund')
  async checkAndPlaceRefund(@Body() body, @Res() res) {
    try {
      const result = await this.refundService.checkAndPlaceRefund(body);
      if (result?.message) return res.send(result);
      return res.send({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region check And pendding  Refund
  @Get('checkPendingRefund')
  async checkPendingRefund(@Res() res) {
    try {
      const result = await this.refundService.checkPendingRefund();
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region re Initialize Refund
  @Post('reInitializeRefund')
  async reInitializeRefund(@Body() body, @Req() req, @Res() res) {
    try {
      const id = body?.id;
      const adminId = req.headers.adminid;
      if (!id || !adminId) return res.json(kParamsMissing);
      const result = await this.refundService.reInitializeRefund(id, adminId);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('refundAutomation')
  async funRefundAutomation(@Body() body, @Res() res) {
    try {
      const data: any = await this.refundService.refundAutomation(body);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('markAsUnPlacedAutodebits')
  async funMarkAsUnPlacedAutodebits(@Res() res) {
    try {
      await this.devService.markAsUnPlacedAutodebits();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('prepareSDAutodebits')
  async funPrepareSDAutodebits(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.prepareSDAutodebits(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('fixAutodebitMismatchDate')
  async funFixAutoDebitMisMatchDate(@Res() res) {
    try {
      const data: any = await this.service.fixAutodebitMismatchDate();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('createPaymentOrder')
  async funCreatePaymentOrder(@Body() body, @Res() res, @Req() req) {
    try {
      const adminId = req.headers['adminid'];
      body.adminId = body?.adminId ? body?.adminId : adminId;
      if (!body?.adminId) return res.json(kParamsMissing);
      body.sendSMS = body?.sendSMS ?? false;
      body.isCloseLoan = body?.isCloseLoan ?? false;
      if (!body.loanId || !body.emiId) return res.json(kParamsMissing);
      if (body.settledId && !body.dueDate) return res.json(kParamsMissing);
      if (body.transactionId && (!body.adminId || !body.utr))
        return res.json(kParamsMissing);
      if (
        body.isCloseLoan === true &&
        (body.emiId != -1 || !body.adminId || (body.amount ?? 0) <= 0)
      )
        return res.json(kParamsMissing);
      const source = body?.source ?? 'RAZORPAY';
      const subSource =
        source === 'AUTOPAY'
          ? 'AUTODEBIT'
          : source === 'PAYMENT_LINK'
          ? 'WEB'
          : body?.subSource ?? 'WEB';
      body.source = source;
      body.subSource = subSource;
      if (body.source) body.source = body.source.toUpperCase();
      if (body.subSource) body.subSource = body.subSource.toUpperCase();
      if (
        source != 'CASHFREE' &&
        source != 'RAZORPAY' &&
        source != 'AUTOPAY' &&
        source != 'UPI' &&
        source != 'PAYMENT_LINK'
      )
        return res.json(k422ErrorMessage(kWrongSourceType));
      if (source == 'AUTOPAY' && !body.adminId)
        return res.json(k422ErrorMessage(kParamsMissing));
      if (
        (source == 'CASHFREE' || source == 'RAZORPAY') &&
        body.subSource != 'APP' &&
        body.subSource != 'WEB'
      )
        body.subSource = null;
      const keys = Object.keys(body);
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        const value = body[key];
        if (value == null) delete body[key];
      }
      const data = await this.sharedTransaction.funCreatePaymentOrder(body);
      if (!data || data === k500Error) return res.json(kInternalError);
      else if (data?.statusCode) return res.json(data);

      // For in app payments
      if (body.subSource == 'APP') {
        data.continueRoute = kWebviewRoute;
        data.rootRoute = kRepaymentRoute;
        data.webviewData = getPaymentWebData(data.paymentLink, body.loanId);
        if (body.isAnimation)
          data.webviewData = getPaymentWebDatav2(data.paymentLink, body.loanId);
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('checkPayment')
  async funCheckPayment(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.checkCFOrder(
        body?.loanId,
        body.checkAllPending,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getTransactions')
  async funGetTransactions(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getTransactionsData(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // create payment order for after Complete loan recived waiver amount
  @Post('createPaymentOrderForWaiver')
  async createPaymentOrderForWaiver(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.createWaiverPaymentOrder(
        body,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region Get Last Autodebit Response
  @Get('getLastAutodebitResponse')
  async getLastAutodebitResponse(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getLastAutodebitResponse(query);
      if (data?.message) return res.json({ ...kSuccessData, data });
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //Loan And Emi Close
  @Get('checkUncompletedTransactions')
  async checkUncompletedTransactions(@Res() res) {
    try {
      const data: any = await this.service.checkUncompletedTransactions();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region  get all  the transaction details by loanId
  @Get('getTransactionDetails')
  async funGetTransactionDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getTransactionDetails(query);
      if (data?.message) return res.json({ ...kSuccessData, data });
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('checkPendingCFOrders')
  async funCheckPendingCFOrders(@Body() body, @Res() res) {
    try {
      const data = await this.service.getAllPendingCFOrders(body?.fullDayCheck);
      if (data?.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('checkTransactionStatus')
  async checkCheckTransactionStatus(@Query() query, @Res() res) {
    try {
      // Params validation
      const transactionType: string[] = query.types;
      if (!transactionType) return res.json(kParamsMissing);
      const loanId = query.loanId;
      await this.sharedTransaction.checkTransactionStatus(
        transactionType,
        loanId,
      );
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('placeAutoDebitForEMIDues')
  async funPlaceAutoDebitForEMIDues(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.placeAutoDebitForEMIDues(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getAdvanceFullPay')
  async funGetAdvanceFullPay(@Query() query, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.getAdvanceFullPay(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  
  @Post('checkTransactionIds')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async checkTransactionIds(@UploadedFile() file, @Body() body, @Res() res) {
    try {
      body.file = file;
      const data: any = await this.sharedTransaction.checkTransactionIds(body);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('addToArchiveInitializedTransactions')
  async addToArchiveInitializedTransactions(@Query() query, @Res() res) {
    try {
      const limit = query?.limit ?? 1000;
      const data: any =
        await this.sharedTransaction.addToArchiveInitializedTransactions(limit);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  
  // //#region send loan closure email
  @Get('sendLoanClosureEmail')
  async funsendLoanClosureEmail(@Query() query, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.sendLoanClosureEmail(
        query,
      );
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  // //#endregion
}
