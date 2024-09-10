// Imports
import {
  Body,
  Controller,
  Post,
  Res,
  Headers,
  Query,
  Get,
} from '@nestjs/common';
import * as fs from 'fs';
import {
  k403Forbidden,
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import {
  KICICIUPI,
  kAutoDebit,
  kCashfree,
  kCompleted,
  kDashboardRoute,
  kFailed,
  kInitiated,
  kNotEligibleRoute,
  kRazorpay,
  kReApplyRoute,
  kRepaymentRoute,
  kWebviewRoute,
  kWrongSourceType,
} from 'src/constants/strings';
import { k500Error } from 'src/constants/misc';
import {
  getCFPaymentWebData,
  getPaymentWebData,
  getPaymentWebDatav2,
  getPaymentWebDataForICICIUPI,
} from 'src/constants/objects';
import { kFrontendBaseURL, nPaymentRedirect } from 'src/constants/network';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { Key } from 'src/authentication/auth.guard';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';
import { GLOBAL_CHARGES, GLOBAL_RANGES } from 'src/constants/globals';
import { UserServiceV4 } from '../user/user.service.v4';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { MigrationSharedService } from 'src/shared/migration.service';
import {
  kTransactionFailed,
  kTransactionRedirect,
  kTransactionSuccess,
} from 'src/constants/directories';
import { loanTransaction } from 'src/entities/loan.entity';
import { Op } from 'sequelize';
@Controller('transaction')
export class TransactionControllerV4 {
  constructor(
    private readonly sharedTransaction: SharedTransactionService,
    private readonly userService: UserServiceV4,
    private readonly calculationSharedService: CalculationSharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly typeService: TypeService,
    private readonly transactionRepo: TransactionRepository,
    private readonly migrationService: MigrationSharedService,
  ) {}

  @Post('createPaymentOrder')
  async funCreatePaymentOrder(@Body() body, @Res() res, @Headers() headers) {
    try {
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
      const userId = body?.userId;
      if (!userId) return res.json(kParamsMissing);
      const bySDK = body?.bySDK === true ? true : false;
      let byICICI = null;

      if (
        body?.mode == 'GOOGLEPAY' ||
        body?.mode == 'PAYTM' ||
        body?.mode == 'PHONEPE' ||
        body?.mode == 'AMAZONPAY' ||
        body?.mode == 'OTHER' ||
        body?.upiId
      ) {
        body.source = KICICIUPI;
        byICICI = true;
      }
      if (body?.isWebViewPaymentUrl === true) body.source = KICICIUPI;
      else if (body?.isWebViewPaymentUrl == false && body?.source)
        body.source = JSON.parse(body?.source)[0];

      const source = body?.source ?? kRazorpay;
      const subSource =
        source === 'AUTOPAY' ? kAutoDebit : body?.subSource ?? 'WEB';
      body.source = source;
      body.subSource = subSource;
      if (body.source) body.source = body.source.toUpperCase();
      if (body.subSource) body.subSource = body.subSource.toUpperCase();
      if (
        source != 'CASHFREE' &&
        source != 'RAZORPAY' &&
        source != 'AUTOPAY' &&
        source != 'ICICI_UPI' &&
        source != 'RAZORPAY_SDK'
      )
        return res.json(k422ErrorMessage(kWrongSourceType));
      if (source == 'AUTOPAY' && !body.adminId)
        return res.json(k422ErrorMessage(kParamsMissing));
      if (
        (source == 'CASHFREE' ||
          source == 'RAZORPAY' ||
          source == 'ICICI_UPI') &&
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
      let data: any = {};
      if (!body?.isWebViewPaymentUrl) {
        if (body?.amount == 'null') body.amount = null;
        if (body?.emiId == -1 && body?.isPartPayment == true && body?.amount)
          return res.json(kBadRequest);
        data = await this.sharedTransaction.funCreatePaymentOrder(body);
        if (!data || data === k500Error) return res.json(kInternalError);
        else if (data?.statusCode) return res.json(data);
      }
      // For in app payments
      const appType = headers['apptype'] ?? headers['appType'] ?? 0;
      if (body.subSource == 'APP' && !bySDK && !byICICI) {
        data.continueRoute = kWebviewRoute;
        data.rootRoute = kRepaymentRoute;
        let paymentLink = null;
        const key = body?.loanId * 484848;
        let payment_service = await this.commonSharedService.getServiceName(
          'PAYMENT_MODE',
        );
        const netBankingSource = payment_service ?? kRazorpay;

        const emiId = body?.emiId;
        const loanId = body?.loanId;
        const emiData = body?.emiData;
        const foreclose = body?.['Foreclose Details Web'];
        const userId = body?.userId;
        let isPartPayment = body?.isPartPayment;
        const fullPayData =
          await this.calculationSharedService.getFullPaymentData({ loanId });

        const remainingPenalty = +fullPayData?.remainingPenalty;
        //for providing emipay summary web side
        let indexOfEMI;
        let emi;
        let isFullPayment = body?.isFullPayment;
        if (emiData) {
          let paidCount = 0;
          for (let i = 0; i < emiData?.length; i++) {
            const ele = emiData[i];
            if (ele?.Paid) paidCount++;
          }
          let isLastEmiDelay =
          emiData[emiData.length - 1].Delayed &&
          !emiData[emiData.length - 1].Paid;
        if (paidCount == emiData.length - 1 && isLastEmiDelay == true)
          isFullPayment = false;
          indexOfEMI = emiData.findIndex(
            (emi) => emi?.emiNumber === body?.emiNumber && !emi?.Paid,
          );
          emi = emiData[indexOfEMI];
        }
        let penalty = 0;
        let escBounceCharge = 0;
        let delayDays = 0;
        let emiAmount = 0;
        let emiNumberStr = '';
        let isEmiPay = true;
        let newDelaydays = 0;
        let principalAmount = 0;
        let totalInterest = 0;
        let regularInterest = 0;
        let deferredInterest = 0;
        let ecsCharge = 0;
        let penalCharge = 0;
        let legalCharge = 0;
        let amountToBePayable = 0;

        const totalEmiAmount = emi?.['pay_emi_info']?.amount ?? 0;
        let isFoundObjKeys = false;
        if (emi?.['pay_emi_info']) {
          for (let key in emi?.['pay_emi_info']) {
            try {
              if (
                key.startsWith('emi_') &&
                key.endsWith('_more_info') &&
                typeof emi?.['pay_emi_info'][key] === 'object'
              ) {
                isFoundObjKeys = true;
                let emiNumber: any = key.split('_')[1];
                emiNumber = parseInt(emiNumber);
                emiNumberStr += emiNumber + '+';
                const emiInfo = emi?.['pay_emi_info'][key];

                if (emiInfo?.['Principal amount']) {
                  let principalAmt = emiInfo?.['Principal amount'].replace(
                    /[^\d.]/g,
                    '',
                  );
                  principalAmt = parseFloat(principalAmt);
                  principalAmount += principalAmt;
                }
                if (emiInfo?.['interestData']) {
                  let totalInt;
                  let regularInt;
                  let deferredInt;
                  emiInfo?.['interestData'].forEach((ele) => {
                    if (ele?.key == 'Total interest')
                      totalInt = +ele?.value.replace(/[^\d.]/g, '');
                    if (ele?.key == 'Regular interest')
                      regularInt = +ele?.value.replace(/[^\d.]/g, '');
                    if (ele?.key.startsWith('Deferred')) {
                      newDelaydays += +ele?.key.split('@')[1].split(' ')[0];
                      deferredInt = +ele?.value.replace(/[^\d.]/g, '');
                    }
                  });
                  totalInterest += totalInt;
                  regularInterest += regularInt;
                  deferredInterest += deferredInt;
                } else {
                  if (emiInfo?.['Interest']) {
                    let interest = +emiInfo?.['Interest'].replace(
                      /[^\d.]/g,
                      '',
                    );
                    regularInterest += interest;
                    totalInterest += interest;
                  }
                }
                if (emiInfo?.['Ecs charge #*\n(Including GST)*#']) {
                  let ecscharge = emiInfo?.[
                    'Ecs charge #*\n(Including GST)*#'
                  ].replace(/[^\d.]/g, '');
                  ecsCharge += +ecscharge;
                }
                for (let key in emiInfo) {
                  if (key.startsWith('Penal')) {
                    let penalcharge = emiInfo?.[key].replace(/[^\d.]/g, '');
                    penalCharge += parseFloat(penalcharge);
                  }
                }
                if (emiInfo?.['Legal charge']) {
                  let legalcharge = emiInfo?.['Legal charge'].replace(
                    /[^\d.]/g,
                    '',
                  );
                  legalcharge = parseFloat(legalcharge);
                  legalCharge += legalcharge;
                }
                if (emiInfo?.['Total amount to be repaid']) {
                  let totalAmt = emiInfo?.['Total amount to be repaid'].replace(
                    /[^\d.]/g,
                    '',
                  );
                  totalAmt = parseFloat(totalAmt);
                  amountToBePayable += totalAmt;
                }
              }
            } catch (error) {}
          }
        }
        if (!isFoundObjKeys) {
          if (emi?.['pay_emi_info']?.['Principal amount']) {
            let principalAmt = emi?.['pay_emi_info']?.[
              'Principal amount'
            ].replace(/[^\d.]/g, '');
            principalAmt = parseFloat(principalAmt);
            principalAmount = principalAmt;
          }
          if (emi?.['pay_emi_info']?.['interestData']) {
            let totalInt;
            let regularInt;
            let deferredInt;
            emi?.['pay_emi_info']?.['interestData'].forEach((ele) => {
              if (ele?.key == 'Total interest')
                totalInt = +ele?.value.replace(/[^\d.]/g, '');
              if (ele?.key == 'Regular interest')
                regularInt = +ele?.value.replace(/[^\d.]/g, '');
              if (ele?.key.startsWith('Deferred')) {
                newDelaydays = +ele?.key.split('@')[1].split(' ')[0];
                deferredInt = +ele?.value.replace(/[^\d.]/g, '');
              }
            });
            totalInterest = totalInt;
            regularInterest = regularInt;
            deferredInterest = deferredInt;
          } else {
            if (emi?.['pay_emi_info']?.['Interest']) {
              let interest = +emi?.['pay_emi_info']?.['Interest'].replace(
                /[^\d.]/g,
                '',
              );
              regularInterest = interest;
              totalInterest = interest;
            }
          }
          if (emi?.['pay_emi_info']?.['Ecs charge #*\n(Including GST)*#']) {
            let ecscharge = emi?.['pay_emi_info']?.[
              'Ecs charge #*\n(Including GST)*#'
            ].replace(/[^\d.]/g, '');
            ecsCharge = parseFloat(ecscharge);
          }
          for (let key in emi?.['pay_emi_info']) {
            if (key.startsWith('Penal')) {
              penalCharge = +emi?.['pay_emi_info'][key].replace(/[^\d.]/g, '');
            }
          }

          if (emi?.['pay_emi_info']?.['Legal charge']) {
            let legalcharge = emi?.['pay_emi_info']?.['Legal charge'].replace(
              /[^\d.]/g,
              '',
            );
            legalcharge = parseFloat(legalcharge);
            legalCharge = legalcharge;
          }
          if (emi?.['pay_emi_info']?.['Total amount to be repaid']) {
            let totalAmt = emi?.['pay_emi_info']?.[
              'Total amount to be repaid'
            ].replace(/[^\d.]/g, '');
            totalAmt = parseFloat(totalAmt);
            amountToBePayable = totalAmt;
          }
          emiNumberStr += `${emi?.emiNumber}`;
        }
        // Remove the last character (plus symbol)
        if (emiNumberStr.endsWith('+'))
          emiNumberStr = emiNumberStr.slice(0, -1);
        //for providing fullpay summary web side
        let totalDueEmiAmount = 0;
        let totalDuePenaltyAmount = 0;
        let totalEcsBounceCharge = 0;
        let totalDelayDays = 0;
        let discountAmount = 0;
        let totalAmountAfterDiscount;
        let totalPayableAmount;
        let totalPrincipalAmount = 0;
        let totalNewInterest = 0;
        let totalRegularInterest = 0;
        let totalDeferredInterest = 0;
        let totalForecloseCharge = 0;
        let totalSubKeyForclose = GLOBAL_CHARGES.FORECLOSURE_PERC;
        let totalEcsCharge = 0;
        let totalPenalCharge = 0;
        let totalLegalCharge = 0;
        let totalAmountToBePayable = 0;

        if (foreclose) {
          for (let index = 0; index < foreclose.length; index++) {
            const ele = foreclose[index];
            if (ele?.key == 'principalAmount')
              totalPrincipalAmount += ele?.value;
            if (ele?.key == 'totalInterest') totalNewInterest += ele?.value;
            if (ele?.key == 'regularInterest') {
              totalRegularInterest += ele?.value;
            }
            if (ele?.key == 'deferredInterest')
              totalDeferredInterest += ele?.value;
            if (ele?.key == 'ecsCharge') totalEcsCharge += ele?.value;
            if (ele?.key == 'penalty') {
              totalPenalCharge += ele?.value;
            }
            if (ele?.subKey) totalDelayDays += ele?.subKey;
            if (ele?.key == 'forecloseCharge') {
              if (ele?.value > 0) {
                totalForecloseCharge += ele?.value;
              }
            }
            if (ele?.key == 'legalCharge') totalLegalCharge += ele?.value;
            if (ele?.key == 'totalPayableAmount')
              totalAmountToBePayable += ele?.value;
          }
        }
        totalPayableAmount = body?.fullPayAmount;
        // For lower interest rate with more than 3 days we need to charge user full loan amount instead of per day
        const today = this.typeService.getGlobalDate(new Date());
        if (
          +body?.interestRate <= GLOBAL_RANGES.MAX_TOTAL_FULL_PAY_INTEREST_RATE
        ) {
          const disbursedDate = body?.['Loan Disbursement Date'];
          const diffInDays =
            this.typeService.dateDifference(disbursedDate, today) + 1;
          if (diffInDays <= 3) totalDueEmiAmount = totalPayableAmount;
        }

        if (body?.promoCodes && body?.promoCodes?.length != 0) {
          const discountPercentage = body?.promoCodes[0]?.discount;
          const promocodeApplicableCharges =
            totalPenalCharge +
            totalDeferredInterest +
            totalEcsCharge +
            totalLegalCharge;
          discountAmount =
            (promocodeApplicableCharges * discountPercentage) / 100;
          discountAmount = Math.floor(discountAmount);  
          totalAmountAfterDiscount = this.typeService.manageAmount(totalPayableAmount - discountAmount);
        }
        if (discountAmount === 0) totalAmountAfterDiscount = totalPayableAmount;
        let minPartPayment;
        if (body?.minPartPayment) {
          minPartPayment = body?.minPartPayment.replace(/[^\d.]/g, '');
          minPartPayment = parseFloat(minPartPayment);
        }
        if (emiId == -1) {
          isEmiPay = false;
          isPartPayment = false;
          emiNumberStr = '';
        }
        paymentLink = `${nPaymentRedirect}${key}&requestFromApp=true&userId=${userId}&loanId=${loanId}&netBankingSource=${netBankingSource}&isEmiPay=${isEmiPay}&isEmiPayFromApp=${body?.isEmiPayFromApp}&emiId=${emiId}&emiNumber=${body?.emiNumber}&emiAmount=${emiAmount}&penalty=${penalty}&escBounceCharge=${escBounceCharge}&delayDays=${delayDays}&totalEmiAmount=${totalEmiAmount}&emiNumberStr=${emiNumberStr}&isPartPayment=${isPartPayment}&minPartAmount=${minPartPayment}&isPartPayFromApp=${body?.isPartPayFromApp}&isFullPayFromApp=${body?.isFullPayFromApp}&isFullPayment=${isFullPayment}&totalPayableAmount=${totalPayableAmount}&totalDueEmiAmount=${totalDueEmiAmount}&totalDuePenaltyAmount=${totalDuePenaltyAmount}&totalEcsBounceCharge=${totalEcsBounceCharge}&totalDelayDays=${totalDelayDays}&discountAmount=${discountAmount}&totalAmountAfterDiscount=${totalAmountAfterDiscount}&newDelaydays=${newDelaydays}&principalAmount=${principalAmount}&totalInterest=${totalInterest}&regularInterest=${regularInterest}&deferredInterest=${deferredInterest}&ecsCharge=${ecsCharge}&penalCharge=${penalCharge}&legalCharge=${legalCharge}&amountToBePayable=${amountToBePayable}&totalPrincipalAmount=${totalPrincipalAmount}&totalNewInterest=${totalNewInterest}&totalRegularInterest=${totalRegularInterest}&totalDeferredInterest=${totalDeferredInterest}&totalEcsCharge=${totalEcsCharge}&totalPenalCharge=${totalPenalCharge}&totalLegalCharge=${totalLegalCharge}&totalAmountToBePayable=${totalAmountToBePayable}&totalSubKeyForclose=${totalSubKeyForclose}&totalForecloseCharge=${totalForecloseCharge}`;
        if (data?.paymentLink) {
          data.webviewData = getPaymentWebData(data?.paymentLink, body?.loanId);
        } else if (body?.isWebViewPaymentUrl) {
          data.webviewData = getPaymentWebDataForICICIUPI(
            paymentLink,
            userId,
            loanId,
          );
        } else if (body.isAnimation && body?.source == kRazorpay)
          data.webviewData = getPaymentWebDatav2(data.paymentLink, body.loanId);
        else if (body.isAnimation && body?.source == kCashfree)
          data.webviewData = getCFPaymentWebData(data.paymentLink, body.loanId);
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('syncPaymentWebData')
  async funSyncPaymentWebData(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.syncPaymentWebData(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('placeTargetEMIs')
  async funPlaceTargetEMIs(@Body() body, @Res() res) {
    try {
      await this.sharedTransaction.placeTargetEMIs(body);
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('checkPaymentOrder')
  async funCheckPaymentOrder(@Key() usersId, @Body() body, @Res() res) {
    try {
      const userId = usersId ?? body?.userId;
      if (!userId) return res.json(k403Forbidden);
      const data: any = await this.sharedTransaction.checkPaymentOrder({
        ...body,
        userId,
      });
      if (data.message) return res.json(data);
      let routeResponse: any = {};

      routeResponse = await this.userService.routeDetails({ id: userId });
      if (routeResponse.message) return routeResponse;
      if (
        routeResponse.continueRoute != kReApplyRoute &&
        routeResponse.continueRoute != kNotEligibleRoute
      ) {
        routeResponse.rootRoute = kRepaymentRoute;
        routeResponse.continueRoute = kRepaymentRoute;
      } else {
        routeResponse.rootRoute = kDashboardRoute;
        routeResponse.continueRoute = kDashboardRoute;
      }
      if (body.isAnimation) {
        routeResponse.state = {
          isPaymentSuccess: (data.status ?? kInitiated) == kCompleted,
          amount: data?.amount ?? 0,
          transactionId: data.transactionId ?? '',
          paymentGateway: data.paymentGateway ?? '',
          continueRoute: kRepaymentRoute,
        };
        routeResponse.redirectUser = false;
      }

      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: { ...data, ...routeResponse } });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('checkSDAutoDebits')
  async funCheckSDAutoDebits(@Body() body, @Res() res) {
    try {
      //Params validation
      const type = body?.type;
      const batchId = body?.batch_id;
      if (!type || !batchId) return res.json(kParamsMissing);

      if (type == 'res') {
        const data: any = await this.sharedTransaction.checkSDAutoDebits(body);
        if (data?.message) return res.json(data);
        for (let index = 0; index < data.length; index++) {
          const paymentData = data[index];
          await this.sharedTransaction.markTransactionAsComplete(paymentData);
        }
      }
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Get('checkCallBack')
  async checkRazorpay(@Query() query, @Res() res) {
    try {
      const response = await this.checkCallBack(query);
      if (
        response?.loanData?.loanStatus == 'Complete' &&
        response?.subSource == 'WEB'
      ) {
        const loanId = response?.loanId;
        const id = loanId * 484848;
        const redirectLink = kFrontendBaseURL + `payments?key=${id}`;
        res.redirect(redirectLink);
      } else {
        if (response?.status == kCompleted && response?.subSource == 'WEB') {
          const htmlData = await fs.readFileSync(kTransactionSuccess, 'utf-8');
          return res.send(htmlData);
        } else if (
          response?.status == kFailed &&
          response?.subSource == 'WEB'
        ) {
          const htmlData = await fs.readFileSync(kTransactionFailed, 'utf-8');
          return res.send(htmlData);
        }
        const htmlData = await fs.readFileSync(kTransactionRedirect, 'utf-8');
        return res.send(htmlData);
      }
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  async checkCallBack(query) {
    try {
      let transactionId;
      let utr;
      if (query) {
        if (query?.razorpay_payment_link_id)
          transactionId = query?.razorpay_payment_link_id;
        else if (query?.razorpay_invoice_id)
          transactionId = query?.razorpay_invoice_id;
        else if (query?.order_id) transactionId = query?.order_id;
        if (query?.razorpay_payment_id) utr = query?.razorpay_payment_id;
      }
      if (transactionId || utr) {
        const loanInclude = {
          model: loanTransaction,
          attributes: ['loanStatus'],
        };
        const options = {
          where: { [Op.or]: [{ transactionId }, { utr }], subSource: 'WEB' },
          include: [loanInclude],
        };
        const attr = ['loanId', 'subSource', 'status',];
        const data = await this.transactionRepo.getRowWhereData(attr, options);
        if (data === k500Error) return k500Error;
        if (data?.subSource == 'WEB') return data;

        const option = { where: { transactionId, status: 'INITIALIZED' } };
        const att = ['loanId'];
        const findData = await this.transactionRepo.getRowWhereData(
          att,
          option,
        );
        if (!findData || findData === k500Error) return k500Error;

        await this.delay(1000);
        const loanId = findData.loanId;
        return await this.sharedTransaction.checkCFOrder(loanId);
      }
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  @Post('isUserIsEligibleForLoanComplete')
  async isUserIsEligibleForLoanComplete(@Body() body, @Res() res) {
    try {
      const loanId = body.loanId;
      if (!loanId) return res.json(kParamsMissing);
      const data: any = await this.sharedTransaction.isEligibleForLoanClose(
        loanId,
      );
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Post('dpdAdditionInTransactions')
  async dpdAdditionInTransactions(@Body() body, @Res() res) {
    try {
      const data: any = await this.migrationService.dpdAdditionInTransactions(
        body,
      );
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
