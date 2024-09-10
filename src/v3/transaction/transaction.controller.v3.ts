// Imports
import { Body, Controller, Post, Res, Headers } from '@nestjs/common';
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
import { nPaymentRedirect } from 'src/constants/network';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { Key } from 'src/authentication/auth.guard';
import { UserServiceV3 } from '../user/user.service.v3';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';
import { GLOBAL_RANGES } from 'src/constants/globals';
@Controller('transaction')
export class TransactionControllerV3 {
  constructor(
    private readonly sharedTransaction: SharedTransactionService,
    private readonly userService: UserServiceV3,
    private readonly calculationSharedService: CalculationSharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly typeService: TypeService,
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
        source != 'ICICI_UPI'
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
        const payment_service = await this.commonSharedService.getServiceName(
          'PAYMENT_MODE',
        );
        const netBankingSource = payment_service ?? kRazorpay;

        const emiId = body?.emiId;
        const loanId = body?.loanId;
        const emiData = body?.emiData;
        const userId = body?.userId;
        let isPartPayment = body?.isPartPayment;
        const fullPayData =
          await this.calculationSharedService.getFullPaymentData({ loanId });
        const remainingPenalty = +fullPayData?.remainingPenalty;
        //for providing emipay summary web side
        let indexOfEMI;
        let emi;
        if (emiData) {
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
                if (emiInfo?.Penalty) {
                  let emiPenalty = emiInfo?.Penalty.replace(/[^\d.]/g, '');
                  emiPenalty = parseFloat(emiPenalty);
                  penalty += emiPenalty;
                }

                if (emiInfo?.ECS) {
                  let emiEcsCharge = emiInfo?.ECS.replace(/[^\d.]/g, '');
                  emiEcsCharge = parseFloat(emiEcsCharge);
                  escBounceCharge += emiEcsCharge;
                }

                if (emiInfo['Delayed by']) {
                  let emiDelayDays = emiInfo['Delayed by'].replace(
                    /[^\d.]/g,
                    '',
                  );
                  emiDelayDays = parseFloat(emiDelayDays);
                  delayDays += emiDelayDays;
                }

                if (emiInfo?.emiAmtWithoutPenalty) {
                  let emiAmtWithoutPenalty =
                    emiInfo?.emiAmtWithoutPenalty.replace(/[^\d.]/g, '');
                  emiAmtWithoutPenalty = parseFloat(emiAmtWithoutPenalty);
                  emiAmount += emiAmtWithoutPenalty;
                }
              }
            } catch (error) {}
          }
        }
        if (!isFoundObjKeys) {
          if (emi?.['pay_emi_info']?.['Penalty Amount']) {
            let emiPenalty = emi?.['pay_emi_info']?.['Penalty Amount'].replace(
              /[^\d.]/g,
              '',
            );
            emiPenalty = parseFloat(emiPenalty);
            penalty = emiPenalty;
          }

          if (emi?.['pay_emi_info']?.ECS) {
            let emiEcsCharge = emi?.['pay_emi_info']?.ECS.replace(
              /[^\d.]/g,
              '',
            );
            emiEcsCharge = parseFloat(emiEcsCharge);
            escBounceCharge = emiEcsCharge;
          }

          if (emi?.['pay_emi_info']?.['Delayed by']) {
            let emiDelayDays = emi?.['pay_emi_info']?.['Delayed by'].replace(
              /[^\d.]/g,
              '',
            );
            emiDelayDays = parseFloat(emiDelayDays);
            delayDays = emiDelayDays;
          }

          if (emi?.['pay_emi_info']?.['EMI Amount']) {
            let emiAmtWithoutPenalty = emi?.['pay_emi_info']?.[
              'EMI Amount'
            ].replace(/[^\d.]/g, '');
            emiAmtWithoutPenalty = parseFloat(emiAmtWithoutPenalty);
            emiAmount = emiAmtWithoutPenalty;
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
        if (emiData) {
          for (let i = 0; i < emiData.length; i++) {
            try {
              const ele = emiData[i];
              if (ele?.['Paid'] === false) {
                if (ele?.['Delay Days']) {
                  totalDelayDays += ele?.['Delay Days'];
                }

                if (ele?.['EMI amount']) {
                  let emiAmount = ele?.['EMI amount'].replace(/[^\d.]/g, '');
                  emiAmount = parseFloat(emiAmount);
                  totalDueEmiAmount += emiAmount;
                }

                if (ele?.['ECS bounce charge']) {
                  let escBounceCharge = ele?.['ECS bounce charge'].replace(
                    /[^\d.]/g,
                    '',
                  );
                  escBounceCharge = parseFloat(escBounceCharge);
                  totalEcsBounceCharge += escBounceCharge;
                }

                if (ele?.['Penalty']) {
                  let penalty = ele?.['Penalty'].replace(/[^\d.]/g, '');
                  penalty = parseFloat(penalty);
                  totalDuePenaltyAmount += penalty;
                }
              }
            } catch (error) {}
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
          discountAmount = (remainingPenalty * discountPercentage) / 100;
          totalAmountAfterDiscount = totalPayableAmount - discountAmount;
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
        paymentLink = `${nPaymentRedirect}${key}&requestFromApp=true&userId=${userId}&loanId=${loanId}&netBankingSource=${netBankingSource}&isEmiPay=${isEmiPay}&isEmiPayFromApp=${body?.isEmiPayFromApp}&emiId=${emiId}&emiNumber=${body?.emiNumber}&emiAmount=${emiAmount}&penalty=${penalty}&escBounceCharge=${escBounceCharge}&delayDays=${delayDays}&totalEmiAmount=${totalEmiAmount}&emiNumberStr=${emiNumberStr}&isPartPayment=${isPartPayment}&minPartAmount=${minPartPayment}&isPartPayFromApp=${body?.isPartPayFromApp}&isFullPayFromApp=${body?.isFullPayFromApp}&isFullPayment=${body?.isFullPayment}&totalPayableAmount=${totalPayableAmount}&totalDueEmiAmount=${totalDueEmiAmount}&totalDuePenaltyAmount=${totalDuePenaltyAmount}&totalEcsBounceCharge=${totalEcsBounceCharge}&totalDelayDays=${totalDelayDays}&discountAmount=${discountAmount}&totalAmountAfterDiscount=${totalAmountAfterDiscount}`;
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
      return res.json(kInternalError);
    }
  }

  @Post('placeTargetEMIs')
  async funPlaceTargetEMIs(@Body() body, @Res() res) {
    try {
      await this.sharedTransaction.placeTargetEMIs(body);
      return res.send(kSuccessData);
    } catch (error) {
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
      return res.json(kInternalError);
    }
  }

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
      return res.json(kInternalError);
    }
  }
}
