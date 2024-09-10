// Imports
import {
  Body,
  Controller,
  Get,
  Query,
  Res,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
  k422ErrorMessage,
  kBadRequest,
} from 'src/constants/responses';
import { ReportService } from './report.service';
import { ReportAnalysisService } from './analysis/report.analysis.service';
import { ReportEmiService } from './emi/report.emi.service';
import { ReportMLService } from './ML/report.ml.service';
import { ReportSubscriptionService } from './subscription/report.subscription.service';
import { DashboardDisbursement } from '../disbursement/disbursementDeshboard.service';
import { k500Error } from 'src/constants/misc';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { DevOpsGuard } from 'src/authentication/auth.guard';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
@Controller('/admin/report/')
export class ReportController {
  constructor(
    private readonly subscriptionService: ReportSubscriptionService,
    private readonly service: ReportService,
    private readonly analysisService: ReportAnalysisService,
    private readonly reportMLService: ReportMLService,
    private readonly reportEmiService: ReportEmiService,
    private readonly dashboardDisbursement: DashboardDisbursement,
    private readonly typeService: TypeService,
    private readonly fileService: FileService,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    private readonly predictionService: PredictionService,
  ) {}

  //#region geting all mandate stuck users
  @Get('mandateStuckUsers')
  async funMandateStuckUsers(@Res() res) {
    try {
      const data: any = await this.subscriptionService.mandateStuckUsers();
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Get('dailyReportToManagement')
  async funDailyReportToManagement(@Query() query, @Res() res) {
    try {
      const date = query?.date;
      const data: any = await this.service.dailyReportToManagement(date);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('dailyRegistrationReport')
  async funDailyRegistrationReport(@Query() query, @Res() res) {
    try {
      const date = query?.date;
      const data: any = await this.service.dailyRegistrationReport(date);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUserCountsForLsp')
  async funGetUserCountsForLsp(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserCountsForLsp(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region report for ml get master data
  @Get('reportFroMl')
  async funReportFroMl(@Res() res) {
    try {
      const data: any = await this.reportMLService.findMasterDataForML();
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Get('getRecoveryRate')
  async funGetRecoveryRate(@Res() res, @Query() query) {
    try {
      const data: any = await this.analysisService.getRecoveryRate(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data }).end();
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get collection CRM report for given admin ID
  @Get('collectionCRMReport')
  async funcCollectionCRMReport(@Query() query, @Res() res) {
    try {
      if (!query.adminId) return res.send(kParamsMissing);
      const data: any = await this.service.collectionCRMReport(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //get all emi data (EMI due) report
  @Post('getAllEMIDataDateWise')
  async funGetAllEMIDataDateWise(@Body() body, @Res() res) {
    try {
      const data = await this.reportEmiService.getAllEMIDataDateWise(body);
      if (data?.message) return res.send(data);
      const dueAmountDetails = await this.service.getDataForExpected(
        body.startDate,
        body.endDate,
      );
      data['amountDetails'] = dueAmountDetails;

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#endregion
  @Get('getRegistredUserApprovalCount')
  async getRegistredUserApprovalCount(@Res() res) {
    try {
      const data: any =
        await this.analysisService.getRegistredUserApprovalCount();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('nameMissMatchReport')
  async getNameMissMatchReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.analysisService.getNameMissMatchReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('deletedAccountUsersReport')
  async getDeletedAccountUsersReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDeletedAccountUsersReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getMonthLoanFigureReport')
  async getMonthLoanFigureReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.analysisService.getMonthLoanFigureReport(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('dueDatePerfomanceReport')
  async getDueDatePerfomanceReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDueDatePerfomanceReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('overdueLoanReport')
  async getOverdueLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getOverdueLoanReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getLoanOutStandingReport')
  async getLoanOutStandingReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDataFromMasterTable(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('outStandingLoanReport')
  async outStandingLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getOutStandingLoanReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('disbursmentOutStandingLoanReport')
  async getDisbursmentOutStandingLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDisbursmentOutStandingLoanReport(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('disbursedLoanReport')
  async getDisbursedLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDisbursedLoanReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('repaymentLoanReport')
  async getRepaymentLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.repaymentLoanReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('badDebtsLoanReport')
  async gatBedDebtsLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getBadDebtsLoanReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('overDueToFullyPaidReport')
  async gatOverDueToFullyPaidReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.gatOverDueToFullyPaidReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('writtenOffLoanReport')
  async getWrittenOffLoanReport(@Body() body, @Res() res) {
    try {
      body.onlyWaivedOff = true;
      body.download = body?.download ?? 'false';
      body.downloadId = body?.downloadId ?? 'false';
      const data: any = await this.analysisService.getRecoveryRate(body);
      if (data.message) return res.json(data);
      if (body.isRowData == 'true') {
        data.rows.forEach((element) => {
          delete element.userId;
          element['Loan ID'] = element.loanId;
          delete element.loanId;
          element['EMI ID'] = element.id;
          delete element.id;
          element['Loan Status'] = element.loanStatus;
          delete element.loanStatus;
          element['EMI Date'] = element.emi_date.split('T')[0];
          delete element.emi_date;
          element['Pay Type'] = element.pay_type ?? '-';
          delete element.pay_type;
          element['Repay status'] = element.payment_status;
          delete element.payment_status;
          element['Repaid date'] = element.payment_done_date
            ? element.payment_done_date.split('T')[0]
            : '-';
          delete element.payment_done_date;

          delete element.fullPayPrincipal;
          delete element.fullPayInterest;
          delete element.fullPayPenalty;
          delete element.principalCovered;
          delete element.interestCalculate;
          delete element.penalty;
          delete element.waiver;
          delete element.paid_waiver;
          delete element.unpaid_waiver;
          delete element.partPaymentPenaltyAmount;
          delete element.payment_due_status;

          element['Expected principal'] =
            element.calculation.expectedPrincipal.toFixed(2);
          element['Expected interest'] =
            element.calculation.expectedInterest.toFixed(2);
          element['Expected penalty'] =
            element.calculation.expectedPenalty.toFixed(2);
          element['Total expected'] =
            element.calculation.totalExpected.toFixed(2);

          element['Paid principal'] =
            element.calculation.paidPrincipal.toFixed(2);
          element['Paid interest'] =
            element.calculation.paidInterest.toFixed(2);
          element['Paid penalty'] = element.calculation.paidPenalty.toFixed(2);
          element['Total Paid'] = element.calculation.totalPaid.toFixed(2);

          element['Pre paid principle'] =
            element.calculation.prePaidPrinciple.toFixed(2);
          element['Pre paid interest'] =
            element.calculation.prePaidInterest.toFixed(2);
          element['Total pre paid amount'] =
            element.calculation.totalPrePaidAmount.toFixed(2);

          element['Principal waiver'] =
            element.calculation.waiverPrincipal.toFixed(2);
          element['Interest waiver'] =
            element.calculation.waiverInterest.toFixed(2);
          element['Penalty waiver'] =
            element.calculation.waiverPenalty.toFixed(2);
          element['Total waiver'] = element.calculation.waivedOff.toFixed(2);
          delete element.loan;
          delete element.calculation;
        });

        if (body.download === 'true') {
          const rawExcelData = {
            sheets: ['local-reports'],
            data: [data.rows],
            sheetName: 'Written off loan.xlsx',
            needFindTuneKey: false,
          };

          const url: any = await this.fileService.objectToExcelURL(
            rawExcelData,
          );
          if (url?.message) return url;

          const updatedData = { downloadUrl: url, status: '1' };
          await this.reportHistoryRepo.updateRowData(
            updatedData,
            body.downloadId,
          );
          return res.json({ ...kSuccessData, data: { fileUrl: url } });
        } else {
          return res.json({ ...kSuccessData, data });
        }
      }

      let UserArr = [];
      let LoanArr = [];
      let EMIArr = [];
      let rData: any = {
        'User Count': 0,
        'Loan Count': 0,
        'EMI Count': 0,
        'Total waived Off': 0,
        'Principal waived Off': 0,
        'Interest waived Off': 0,
        'Penalty waived Off': 0,
      };
      data.rows.forEach((element) => {
        if (!UserArr.includes(element.userId)) UserArr.push(element.userId);
        if (!EMIArr.includes(element.id)) EMIArr.push(element.id);
        if (!LoanArr.includes(element.loanId)) LoanArr.push(element.loanId);
        rData['Total waived Off'] =
          element.calculation.waivedOff + rData['Total waived Off'];
        rData['Principal waived Off'] =
          element.calculation.waiverPrincipal + rData['Principal waived Off'];
        rData['Interest waived Off'] =
          element.calculation.waiverInterest + rData['Interest waived Off'];
        rData['Penalty waived Off'] =
          element.calculation.waiverPenalty + rData['Penalty waived Off'];
      });
      rData['User Count'] = UserArr.length;
      rData['Loan Count'] = LoanArr.length;
      rData['EMI Count'] = EMIArr.length;
      rData['Total waived Off'] = Math.floor(rData['Total waived Off']);
      rData['Principal waived Off'] = Math.floor(rData['Principal waived Off']);
      rData['Interest waived Off'] = Math.floor(rData['Interest waived Off']);
      rData['Penalty waived Off'] = Math.floor(rData['Penalty waived Off']);
      let newData = { rows: [], count: 0 };
      newData.rows.push(rData);
      newData.count = newData.rows.length;

      if (body.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [newData.rows],
          sheetName: 'Written off loan.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(
          updatedData,
          body.downloadId,
        );
        return res.json({ ...kSuccessData, data: { fileUrl: url } });
      } else {
        return res.json({ ...kSuccessData, data: newData });
      }
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getDisbursementFailedReport')
  async getDisbursementFailedReport(@Query() query, @Res() res) {
    try {
      const data: any =
        await this.dashboardDisbursement.getDisbursementFailedReport(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('loanClosedWPrincipalRemaining')
  async funLoanClosedWPrincipalRemaining(@Res() res) {
    try {
      const data: any = await this.service.loanClosedWPrincipalRemaining();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('legalPaymentInsights')
  async funLegalPaymentInsights(@Res() res) {
    try {
      await this.service.legalPaymentInsights();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('cibilDefaulters')
  async funCibilDefaulters(@Res() res) {
    try {
      await this.analysisService.cibilDefaulters();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('getInsuranceData')
  async funGetinsuranceData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getInsuranceData(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('targetMonthExpectedAmount')
  async funTargetMonthExpectedAmount(@Res() res) {
    try {
      const data: any = await this.service.targetMonthExpectedAmount();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('dateToNext30ExpectedEMIAmount')
  async targetDateToNext30ExpectedEMIAmount(@Query() queue, @Res() res) {
    try {
      const data: any = await this.service.dateToNext30ExpectedEMIAmount(queue);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('coolOffUsers')
  async funCoolOffUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.coolOffUsers(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {}
  }

  @Get('userCategorizationReport')
  async funUserCategorizationReport(@Res() res) {
    try {
      const data: any = await this.service.funUserCategorizationReport();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('disbursementWiseDetails')
  async funDisbursementWiseDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.disbursementWiseDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Report for legal team
  @UseGuards(DevOpsGuard)
  @Get('legalCollections')
  async funLegalCollections(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.legalCollections(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('getReportHistory')
  async funReportHistory(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.reportHistory(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Report for legal team
  @Get('caseWiseAmount')
  async funCaseWiseAmount(@Res() res) {
    try {
      await this.service.caseWiseAmount();
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('getAutoDebitFailedByRange')
  async funAutoDebitFailedByRange(@Body() body, @Res() res) {
    try {
      if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      const finalAmount = await this.service.fetchAutoDebitFailedByRange(body);
      if (finalAmount == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: finalAmount });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('collectionPaymentByAdmin')
  async funCollectionPaymentByAdmin(@Body() body, @Res() res) {
    try {
      if (body.adminId) {
        if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      }
      const result = await this.service.collectionPaymentByAdmin(
        body.startDate,
        body.endDate,
        body.adminId,
        body.searchText,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {}
  }

  @Post('getCoolOfPeriodData')
  async funGetCoolOfPeriodData(@Body() body, @Res() res) {
    try {
      if (body?.download == 'false' && !body?.page)
        return res.json(kParamsMissing);
      const result = await this.service.getCoolOfPeriodData(body);
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getDeclinedUserLoanData')
  async funGetDeclinedUserLoanData(@Body() body, @Res() res) {
    try {
      if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      if (!body.download && !body.page) return res.json(kParamsMissing);

      const result = await this.service.getDeclinedUserLoanData(body);
      return res.json(
        result === k500Error
          ? kInternalError
          : { ...kSuccessData, data: result },
      );
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getAutoDebitAdmins')
  async funGetAutoDebitAdmins(@Res() res) {
    try {
      const data = await this.service.getAutoDebitAdmins();
      if (data === k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('defaulterReport')
  async getDefaulterReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getDefaulterReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('emiRepayments')
  async funEMIRepayments(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.emiRepayments(body);
      console.log({ data });
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('eligibleForSettlements')
  async funEligibleForSettlements(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.eligibleForSettlements(body);
      const errorMsg = data.message;
      if (errorMsg) return res.json(k422ErrorMessage(errorMsg));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getExpectedAmountDue')
  async funGetExpectedAmountDue(@Body() body, @Res() res) {
    try {
      if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      const finalAmount = await this.service.getDataForExpected(
        body.startDate,
        body.endDate,
      );
      if (finalAmount == k500Error || !finalAmount)
        return res.json(kInternalError);

      let finalExpectedAmount = {
        'Expected EMI Amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(
            finalAmount.expectedEmiAmount,
          ),
        'Paid EMI Amount	':
          '₹ ' +
          this.typeService.amountNumberWithCommas(finalAmount.paidEmiAmount),
        'Advanced Paid EMI Amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(finalAmount.advanceEmiAmount),
        'Unpaid EMI Amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(finalAmount.unpaidEmiAmount),
        'Expected Penalty Amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(
            finalAmount.expectedPenaltyAmount,
          ),
        'Paid Penalty Amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(
            finalAmount.paidPenaltyAmount,
          ),
        'Unpaid penalty amount': finalAmount.unpaidPenaltyAmount,
      };

      if (body.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [[finalExpectedAmount]],
          sheetName: 'Expected amounts.xlsx',
          needFindTuneKey: false,
        };

        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(
          updatedData,
          body.downloadId,
        );
        return res.json({ ...kSuccessData, data: { fileUrl: url } });
      } else {
        return res.json({ ...kSuccessData, data: [finalExpectedAmount] });
      }
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('kycRejectedUsersReport')
  // @UseGuards(AdminAuthCheck)
  async funKycRejectedUsersReport(@Body() body, @Res() res) {
    try {
      if (!body.startDate || !body.endDate || !body.page)
        return res.json(kParamsMissing);
      const page = +body.page;
      const result = await this.service.getkycRejectedUsersReport(
        body.startDate,
        body.endDate,
        page,
        body?.searchText,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {}
  }

  @Post('getNotAppliedAfterFullPayUsers')
  async funGetNotAppliedAfterFullPayUsers(@Body() body, @Res() res) {
    try {
      const startDate = body.startDate;
      const endDate = body.endDate;
      const page = body.page;
      const download = body.download;
      const downloadId = body.downloadId;
      if (!startDate || !endDate) return res.json(kParamsMissing);
      const result = await this.service.getNotAppliedAfterFullPayUsers(
        startDate,
        endDate,
        page,
        download,
        downloadId,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region Tally reports
  @Post('tallyDisbursement')
  async funTallyDisbursement(@Body() body, @Res() res) {
    try {
      const data = await this.service.tallyDisbursement(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('tallyInterestIncome')
  async funTallyInterestIncome(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.tallyInterestIncome(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('tallyRepayment')
  async funTallyRepayment(@Body() body, @Res() res) {
    try {
      const reqData = { ...body, mode: 'REGULAR' };
      const data: any = await this.service.tallyRepayment(reqData);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('tallySettlements')
  // @UseGuards(AdminAuthCheck)
  async funTallySettlements(@Body() body, @Res() res) {
    try {
      const reqData = { ...body, mode: 'SETTLED' };
      const data: any = await this.service.tallyRepayment(reqData);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getTodayEmiData')
  async funGetTodayEmiData(@Res() res, @Body() body) {
    try {
      if (
        !body.download &&
        !body.isCountOnly &&
        (!body.page || !body.pagesize || !body.emiStatus)
      )
        return res.json(kParamsMissing);
      let toDate = new Date();
      let finalRes;
      if (body.isCountOnly) finalRes = await this.service.getTodayEmiCounts();
      else {
        finalRes = await this.service.getEmiDataWRange(
          body.page,
          body.pagesize,
          body.startDate,
          body.endDate,
          body.emiStatus,
          body.searchText,
          body.download,
          body.downloadId,
          body.needAllData,
        );
        if (!finalRes || finalRes === k500Error)
          return res.json(kInternalError);
      }
      return res.json({ ...kSuccessData, data: finalRes });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('allCompletedLoans')
  async funAllCompletedLoans(@Body() body, @Res() res) {
    try {
      if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      const download: string = body.download ? body.download : '';
      if (!download)
        if (!body.pagesize || !body.page) return res.json(kParamsMissing);
      const pagesize = +body.pagesize;
      const page = +body.page;
      const start_date: string = body.startDate;
      const end_date: string = body.endDate;
      let searchText = body?.searchText;
      const downloadDetails = {
        download: download,
        downloadId: body?.downloadId,
      };
      const finalData = await this.service.fetchNMapCompletedReport(
        page,
        pagesize,
        start_date,
        end_date,
        downloadDetails,
        searchText,
      );
      if (!finalData || finalData === k500Error)
        return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: finalData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getAllDefaultersPendingCrm')
  async funGetAllDefaultersPendingCrm(@Body() body, @Res() res) {
    try {
      if (!body.download) if (!body.page) return res.json(kParamsMissing);
      const finalRes = await this.service.getAllDefaultersPendingCrm(body);
      if (finalRes === k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: finalRes });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getAllloanDueReport')
  async funGetAllLoanDueReport(@Res() res, @Body() body) {
    try {
      if (!body.startDate || !body.endDate) return res.json(kParamsMissing);
      const options: any = {};
      const attributes = [
        'id',
        'interestRate',
        'duration',
        'loanStatus',
        'netApprovedAmount',
        'approvedLoanAmount',
        'loan_disbursement_date',
        'loan_disbursement_id',
        'manualVerificationAcceptName',
        'manualVerificationAcceptId',
        'netEmiData',
      ];
      if (!body.download) {
        attributes.push('loanFees', 'stampFees');
        if (body.page && body.pagesize) {
          const skip1 = body.page * body.pagesize - body.pagesize;
          options.offset = skip1;
          options.limit = 1 * body.pagesize;
        }
      }
      const finalRes = await this.service.getAllLoanDueReport(
        body.startDate,
        body.endDate,
        body.searchText,
        options,
        attributes,
      );
      if (finalRes == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: finalRes });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('uninstallAppActiveLoanReport')
  async funUninstallAppActiveLoanReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.uninstallAppActiveLoanReport(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // Report for qualityParameters
  @Post('qualityParametersReport')
  async funQualityParams(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.qualityParamsReport(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('downloadReportData')
  async fundownloadReportData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.createReportHistory(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // get all refer and earn user data // *report method POST as per new report section needs
  @Post('getReferAndEarnData')
  async getReferAndEarnData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getReferAndEarnData(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region today auto debit data
  @Post('todayAutoDebitData')
  async funTodayAutoDebitData(@Body() body, @Res() res) {
    try {
      const resData: any = await this.service.getTodayAutoDebitData(body);
      if (resData?.message) return res.json(resData);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // get all referral withdrawal transactions
  @Post('referralWithdrawalTransactions')
  async funReferralWithdrawalTransactions(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.referralWithdrawalTransactions(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getCallEventData')
  async getCallEventData(@Body() body, @Res() res) {
    try {
      const category = body.category;
      const startDate = body.startDate;
      const endDate = body.endDate;
      const passData = { category, startDate, endDate };
      const response = await this.service.getEventCallHistory(passData);
      if (response == k500Error || !response) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  @Get('reportApiHit')
  async reportCronHit(@Res() res) {
    try {
      const data = await this.service.reportCronHit();
      if (data == k500Error || !data) return res.json(kInternalError);
      return res.json({ ...kSuccessData });
    } catch (error) {}
  }

  //Report for daily defaulter update
  @Post('dailyDefaultersReport')
  async funDailyDefaultersReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.dailyDefaultersReport(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('cibilInquiries')
  async funCibilInquiries(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.cibilInquiries(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('metricsInsights')
  async funMetricsInsights(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.metricsInsights(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('departmentDropDown')
  async fundepartmentDropDown(@Res() res) {
    try {
      const data: any = await this.service.departmentDropDown();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getFinalPredictionNumbers')
  async funGetFinalPredictionNumbers(@Res() res) {
    try {
      const data = await this.predictionService.getFinalPredictionNumbers();
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('defaulterPredictionReport')
  async funDefaulterPredictionReport(@Res() res) {
    try {
      const data = await this.predictionService.getdDefaulterPredictionReport();
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('loanApprovedByGender')
  async funLoanApprovedByGender(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funLoanApprovedByGender(month);
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('emiRepaid')
  async funEmiRepaid(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funMonthEmiRepaid(month);
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('loanApprovedByInterestrate')
  async funLoanApprovedByInterestrate(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funLoanApprovedByInterestrate(
        month,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('emiRepaidByInterestrate')
  async funLoanRepaidByInterestrate(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funEmiRepaidByInterestrate(
        month,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('emiRepaidByMale')
  async funEmiRepaidByMale(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funEmiRepaidByGenderMale(month);
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('emiRepaidByFemale')
  async funEmiRepaidByFemale(@Res() res, @Query() query) {
    try {
      const month = query?.month;
      const result = await this.analysisService.funEmiRepaidByGenderFemale(
        month,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('createCollectionPerformanceAdminWise')
  async funCreateTodayCollectionPerformance(@Res() res) {
    try {
      const data: any = await this.service.createTodayCollectionPerformance();
      if (data?.message) return res.json(data);

      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('collectionPerformance')
  async funGetCollectionPerformance(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getCollectionPerformanceAdminWise(
        body,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getCibilDataReport')
  async funGetCibilData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funGetCibilReport(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // CIBIL user report  for CIBIL Trigger
  @Post('cibilUserReport')
  async funCibilUserReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.cibilUserReport(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('dpdReversal')
  async funDpdReversal(@Body() body, @Res() res) {
    try {
      const data = await this.service.dpdReversal(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Dump DisbursementData Report for Account team
  @Post('dumpDisbursementData')
  async funDumpDisbursementData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.dumpDisbursementData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // total defaulter report for collection team
  @Post('totalDefaulterData')
  async funTotalDefaulterData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.totalDefaulterData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //store recovery rate data in db
  @Post('storeRecoveryRates')
  async funStoreRecoveryRates(@Body() body, @Res() res) {
    try {
      const data: any = await this.analysisService.storeRecoveryRates(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // API -> Accounting
  @Post('reversalOfPI')
  async funReversalOfPI(@Body() body, @Res() res) {
    try {
      const data = await this.service.getDetailedPIReversalReport(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // API -> Accounting
  @Post('regularPaymentAfterReversal')
  async funPaymentAfterReversal(@Body() body, @Res() res) {
    try {
      body.mode = 'REGULAR';
      const data = await this.service.paymentAfterReversal(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('settlementPaymentAfterReversal')
  async funSettlementPaymentAfterReversal(@Body() body, @Res() res) {
    try {
      body.mode = 'SETTLED';
      const data = await this.service.paymentAfterReversal(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('smaReport')
  async smaReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.smaReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('outStandingReport')
  async outStandingReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.outStandingReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.log({ error });

      return res.json(kInternalError);
    }
  }

  @Post('updateToNpa')
  async updateToNpa(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateToNPA(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('fetchallEmiReportData')
  async fetchallEmiReportData(@Body() body, @Res() res) {
    const data: any = await this.service.allEmiReportData(body);
    if (data.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }

  @Post('cronAssetClassification')
  async cronAssetClassification(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.cronAssetClassification(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('excelOutStandingDatafetch')
  async excelOutStandingDatafetch(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.excelOutStandingDatafetch(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('newOutStandingReport')
  async newOutStandingReport(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.newOutStandingReport(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('assetMigration')
  async assetMigration(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.assetMigration(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('emiWisePerformance')
  async funEmiWisePerformance(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.emiWisePerformance(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('getDailyNetbankingReport')
  async funGetDailyNetBankingReport(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetDailyNetBankingReport(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
