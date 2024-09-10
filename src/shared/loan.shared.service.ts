import { Injectable } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import {
  GlobalServices,
  MINIMUM_INTEREST_FOR_FULL_PAY,
  SYSTEM_ADMIN_ID,
  UPI_SERVICE,
  disburseAmt,
  kInsuranceWaitingTag,
  GLOBAL_RANGES,
  GLOBAL_CHARGES,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  KICICIUPI,
  kNoDataFound,
  kCollectionPhone,
  kCompleted,
  kPaymentMode,
  kAutoDebit,
  kInitiated,
  kLoanMaintainSufficientBalance,
  kAutoDebitNotSuccessFull,
  kAutoDebitNotInitilize,
  kUPIMode,
  kFailed,
  kRazorpay,
} from 'src/constants/strings';
import { Op } from 'sequelize';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TypeService } from 'src/utils/type.service';
import { BankingEntity } from 'src/entities/banking.entity';
import { CalculationSharedService } from './calculation.service';
import { CommonSharedService } from './common.shared.service';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { StringService } from 'src/utils/string.service';
import { response } from 'express';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { PaymentLinkEntity } from 'src/entities/paymentLink.entity';
import { EnvConfig } from 'src/configs/env.config';
import { EMIRepository } from 'src/repositories/emi.repository';
import { SharedTransactionService } from './transaction.service';
import { TransactionService } from 'src/admin/transaction/transaction.service';

@Injectable()
export class LoanSharedService {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly typeService: TypeService,
    private readonly repository: LoanRepository,
    private readonly promoCodeService: PromoCodeService,
    private readonly sharedCalculation: CalculationSharedService,
    private readonly commonSharedService: CommonSharedService,
    private readonly strService: StringService,
    private readonly insuranceRepo: InsuranceRepository,
    private readonly repoManager: RepositoryManager,
    private readonly emiRepo: EMIRepository,
    private readonly sharedTransaction: SharedTransactionService,
  ) {}

  // get user loan emi and repayment data
  async getLoanEmiRepaymentDetails(query) {
    try {
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const typeOfDevice = query?.typeOfDevice;
      const isRequestForWeb = query?.requestForWeb == 'true';
      let isLoanClosure = query?.isLoanClosure == 'true';
      let isLoanSettled = query?.isLoanSettled == 'true';
      // Transaction data
      const transInc: any = { model: TransactionEntity };
      transInc.where = { status: { [Op.or]: ['INITIALIZED', 'COMPLETED'] } };
      transInc.required = false;
      transInc.attributes = [
        'id',
        'utr',
        'type',
        'emiId',
        'status',
        'adminId',
        'subSource',
        'source',
        'createdAt',
        'paidAmount',
        'completionDate',
        'subscriptionDate',
      ];
      // Purpose
      const purposeInc: any = { model: loanPurpose };
      purposeInc.attributes = ['purposeName', 'image_url'];
      // EMI data
      const emiInc: any = { model: EmiEntity };
      emiInc.attributes = [
        'id',
        'penalty',
        'pay_type',
        'emi_date',
        'emi_amount',
        'penalty_days',
        'totalPenalty',
        'bounceCharge',
        'payment_status',
        'principalCovered',
        'interestCalculate',
        'fullPayPenalty',
        'payment_due_status',
        'payment_done_date',
        'partPaymentPenaltyAmount',
        'emiNumber',
        'regInterestAmount',
        'dpdAmount',
        'penaltyChargesGST',
        'partOfemi',
        'legalCharge',
        'legalChargeGST',
        'paidRegInterestAmount',
        'gstOnBounceCharge',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
        'paid_principal',
        'paid_interest',
      ];
      // Banking
      const bankInc: any = { model: BankingEntity };
      bankInc.attributes = ['bank', 'accountNumber'];

      const attributes = [
        'id',
        'loanStatus',
        'insuranceId',
        'isPartPayment',
        'interestRate',
        'userId',
        'netApprovedAmount',
        'loan_disbursement_date',
        'penaltyCharges',
      ];
      const include = [emiInc, transInc, purposeInc, bankInc];
      const options = { where: { id: loanId }, include };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      const userType =
        loanData?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
      const emiData = loanData?.emiData;
      for (let index = 0; index < emiData.length; index++) {
        const ele = emiData[index];
        if (userType == false) ele.bounceCharge = 0;
        // Setting GST as SGST & CGST(round-off) to Keep it same as transaction bifurcation
        if (userType == true) {
          // Penal Charge GST
          let cGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          let sGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
        }
      }
      loanData.isRequestForWeb = isRequestForWeb;
      loanData.isLoanClosure = isLoanClosure;
      loanData.isLoanSettled = isLoanSettled;
      loanData.typeOfDevice = typeOfDevice;
      return await this.getEMIandRepayDetail(loanData);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //get emi data and repayment data
  private async getEMIandRepayDetail(loanData) {
    try {
      const loanId = loanData.id;
      const bank = loanData.bankingData;
      const typeOfDevice = loanData?.typeOfDevice;
      const isRequestForWeb = loanData?.isRequestForWeb;
      const isLoanClosure = loanData?.isLoanClosure;
      const isLoanSettled = loanData?.isLoanSettled;
      const emiData = loanData?.emiData;
      emiData.sort((a, b) => a.id - b.id);
      const transData = loanData?.transactionData ?? [];
      transData.sort((a, b) => b.id - a.id);
      const emiDates = emiData.map((emi) => {
        if (emi?.payment_status === '0') return emi.emi_date;
      });
      const traObj = { transData, emiDates };
      const traDetails = this.transactionAutodebitEMIInfo(traObj);
      const totalRepaidAmt = this.typeService.manageAmount(
        traDetails?.totalRepaidAmount ?? 0,
        disburseAmt,
      );
      const autoPayDetail = traDetails?.autoPayDetail ?? [];
      const utrData = traDetails?.utrData ?? [];
      const lastUtr = traDetails?.lastUtr;
      const penaltyCharges = loanData?.penaltyCharges;
      const data = {
        emiData,
        autoPayDetail,
        utrData,
        lastUtr,
        transData,
        penaltyCharges,
      };
      const emiDetails = this.getEMIandAutoPayDetail(data);
      const emiList = emiDetails?.emiDetails;
      const totalPayableAmt = this.typeService.manageAmount(
        emiDetails?.totalPayableAmount,
      );
      const totalDueAmt = this.typeService.manageAmount(
        emiDetails?.totalDueAmount,
      );
      const penaltyDays = emiDetails?.penaltyDays;
      const isDelayed = emiDetails?.isDelayed;
      const fullPayData = await this.sharedCalculation.getFullPaymentData({
        loanId,
      });

      if (fullPayData?.message) return fullPayData;
      const remainingPenalty = +fullPayData?.remainingPenalty;
      const fullPayAmount = +fullPayData?.totalAmount;
      let paymentSource = await this.commonSharedService.getServiceName(
        kPaymentMode,
      );
      if (!paymentSource) paymentSource = GlobalServices.PAYMENT_MODE;
      const approvedAmount = Math.floor(loanData?.netApprovedAmount ?? 0);
      const finalData: any = {};
      finalData['Loan ID'] = loanData.id;
      finalData['Loan Purpose'] = loanData.purpose?.purposeName ?? '-';
      finalData['Purpose Image'] = loanData.purpose?.image_url;
      finalData['Loan Status'] = loanData.loanStatus;
      finalData['isDelayed'] = isDelayed;
      finalData['Bank'] = bank.bank;
      finalData['Account number'] = bank.accountNumber;
      finalData['isUpiServiceAvailable'] = UPI_SERVICE;
      finalData['Total payable amount'] =
        '₹ ' + this.typeService.amountNumberWithCommas(totalPayableAmt);
      finalData['Total repaid amount'] =
        '₹ ' + this.typeService.amountNumberWithCommas(totalRepaidAmt);
      finalData['Total due amount'] =
        '₹ ' + this.typeService.amountNumberWithCommas(totalDueAmt);
      finalData['Full Pay Amount'] =
        '₹ ' + this.typeService.amountNumberWithCommas(fullPayAmount);
      finalData['Loan amount'] =
        '₹ ' + this.typeService.amountNumberWithCommas(approvedAmount);
      finalData['fullPayAmount'] = fullPayAmount;
      finalData['Loan Disbursement Date'] = loanData?.loan_disbursement_date;
      finalData['interestRate'] = loanData?.interestRate;

      // payment status in percentage
      const duePr = Math.round(100 - (totalRepaidAmt * 100) / totalPayableAmt);
      const repaidPr = Math.round((totalRepaidAmt * 100) / totalPayableAmt);
      const progressPr =
        Math.round((totalRepaidAmt * 100) / totalPayableAmt) / 100 >= 1.0
          ? 1
          : Math.round((totalRepaidAmt * 100) / totalPayableAmt) / 100;
      finalData.Due = duePr;
      finalData.Repaid = repaidPr;
      finalData.Progress = progressPr;
      finalData['emiData'] = emiList; // EMI data

      finalData['paymentOptions'] = [
        {
          name: 'Card / Netbanking',
          source: paymentSource,
          subSource: 'APP',
          androidStatus: true,
          iosStatus: true,
          serviceMode: 'WEB',
          linkSource: 'INAPP',
        },
      ];

      /// Get part min payment
      const TodayDate = new Date().toJSON();
      const range = this.typeService.getUTCDateRange(TodayDate, TodayDate);
      const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const partOption = {
        where: {
          loanId,
          status: 'INITIALIZED',
          type: 'PARTPAY',
          adminId: { [Op.ne]: SYSTEM_ADMIN_ID },
          createdAt: dateRange,
        },
        order: [['id', 'DESC']],
      };
      const partPayData = await this.transactionRepo.getRowWhereData(
        ['id', 'paidAmount', 'createdAt'],
        partOption,
      );
      if (partPayData === k500Error) return kInternalError;
      let partPaidAmount = 0;
      /// Check Already paid after create link
      if (partPayData?.id) {
        const partPaidOption = {
          where: {
            loanId,
            status: kCompleted,
            id: { [Op.gt]: partPayData?.id },
            createdAt: dateRange,
          },
          order: [['id', 'DESC']],
        };
        const partPaidData = await this.transactionRepo.getRowWhereData(
          ['id', 'paidAmount', 'createdAt'],
          partPaidOption,
        );

        if (partPaidData === k500Error) return kInternalError;
        partPaidAmount = partPaidData?.paidAmount ?? 0;
      }

      /// Check for part payment enable/disable
      let isPartPayment = false;
      let minPartAmount = 0;
      finalData.collectionPhone = kCollectionPhone;
      // PartPay Eligibility:(Delay days > 90 OR Enabled by Admin)
      if (penaltyDays > 90 || loanData.isPartPayment === 1) {
        isPartPayment = true;
        if (partPaidAmount > 0) partPayData.paidAmount = 1000;
        minPartAmount = partPayData?.paidAmount ?? 1000;
        if (fullPayAmount < 1000) minPartAmount = fullPayAmount;
      }

      finalData.isPartPayment = isPartPayment;
      finalData.minPartAmount =
        '₹ ' + this.typeService.amountNumberWithCommas(minPartAmount);

      // Fullpay button is enable or not
      finalData.isFullPayment = true;
      finalData.isFullDelay = false;
      const totalUnpaidEMIs = emiData.filter((el) => el.payment_status != '1');
      if (totalUnpaidEMIs.length == 1) finalData.isFullPayment = false;
      const today = this.typeService.getGlobalDate(new Date()).getTime();
      const allDelayEMIs = emiData.filter(
        (f) =>
          f.payment_status == '0' &&
          this.typeService.getGlobalDate(new Date(f.emi_date)).getTime() <
            today,
      );
      if (allDelayEMIs.length == totalUnpaidEMIs.length)
        finalData.isFullDelay = true;
      if (allDelayEMIs.length < 1) finalData.isFullPayment = true;
      let foreclose = false;
      if (fullPayData?.forClosureAmount > 0) {
        foreclose = true;
        finalData.isFullPayment = true;
      }
      let delayDays = fullPayData?.penalty_days;
      let principalAmount =
        fullPayData?.remainingPrincipal + fullPayData?.overduePrincipalAmount;
      let regularInterest = this.typeService.manageAmount(
        fullPayData?.remainingInterest + fullPayData?.overdueInterestAmount,
      );
      let deferredInterest = this.typeService.manageAmount(
        fullPayData?.regInterestAmount,
      );
      let totalInterest = regularInterest + deferredInterest;
      let ecsCharge = this.typeService.manageAmount(
        fullPayData?.bounceCharge +
          fullPayData?.sgstBounceCharge +
          fullPayData?.cgstBounceCharge,
      );
      let penalCharge = this.typeService.manageAmount(
        fullPayData?.penalCharge +
          fullPayData?.remainingPenalty +
          fullPayData?.cgstPenalCharges +
          fullPayData?.sgstPenalCharges,
      );
      let foreclosureCharge = this.typeService.manageAmount(
        fullPayData?.forClosureAmount +
          (fullPayData?.sgstForClosureCharge ?? 0) +
          (fullPayData?.cgstForClosureCharge ?? 0),
      );
      let legalCharges = this.typeService.manageAmount(
        fullPayData?.legalCharges +
          fullPayData?.sgstLegalCharges +
          fullPayData?.cgstLegalCharges,
      );
      if (finalData?.isFullPayment) {
        let forecloseData: any = {};

        // Principal Amount
        forecloseData['Principal amount'] =
          '₹' + this.typeService.amountNumberWithCommas(principalAmount);
        // Interest
        if (deferredInterest > 0) {
          forecloseData['interestData'] = [
            {
              key: 'Total interest',
              value:
                '₹' + this.typeService.amountNumberWithCommas(totalInterest),
            },
            {
              key: 'Regular interest',
              value:
                '₹' + this.typeService.amountNumberWithCommas(regularInterest),
            },
            {
              key:
                'Deferred interest ' +
                `#*@${delayDays} Day${delayDays > 1 ? 's' : ''}*#`,
              value:
                '₹' + this.typeService.amountNumberWithCommas(deferredInterest),
            },
          ];
        } else if (regularInterest > 0)
          forecloseData['Interest'] =
            '₹' + this.typeService.amountNumberWithCommas(regularInterest);
        // Penalty charge
        if (penalCharge > 0) {
          forecloseData[
            'Penal charge @' +
              delayDays +
              ' Day' +
              (delayDays > 1 ? 's' : '') +
              `\n#*Including GST*#`
          ] = `#*₹${this.typeService.amountNumberWithCommas(penalCharge)}*#`;
        }
        // ecs charge
        if (ecsCharge > 0) {
          forecloseData[
            'Ecs charge' + `\n#*Including GST*#`
          ] = `#*₹${this.typeService.amountNumberWithCommas(ecsCharge)}*#`;
        }
        // If User is Eligible for Foreclose then
        if (foreclose) {
          const foreclosePercentage = GLOBAL_CHARGES.FORECLOSURE_PERC;
          forecloseData[
            'Fore-close charge @' +
              foreclosePercentage +
              '%' +
              `\n#*Including GST*#`
          ] = '₹' + this.typeService.amountNumberWithCommas(foreclosureCharge);
        }
        if (legalCharges > 0)
          forecloseData['Legal charge' + `\n#*Including GST*#`] =
            '₹' + this.typeService.amountNumberWithCommas(legalCharges);
        forecloseData['Total amount to be repaid'] =
          '₹' +
          this.typeService.amountNumberWithCommas(fullPayData?.totalAmount);
        finalData['Foreclose Details'] = forecloseData;
      }
      if (finalData?.isFullPayment) {
        let forecloseDataForWeb: any = [];

        // principal Amount
        forecloseDataForWeb.push({
          key: 'principalAmount',
          value: principalAmount,
        });
        //interest
        forecloseDataForWeb.push({
          key: 'totalInterest',
          value: totalInterest,
        });
        forecloseDataForWeb.push({
          key: 'regularInterest',
          value: regularInterest,
        });
        forecloseDataForWeb.push({
          key: 'deferredInterest',
          value: deferredInterest,
        });
        forecloseDataForWeb.push({
          key: 'interest',
          value: regularInterest,
        });
        // ecs charge
        forecloseDataForWeb.push({
          key: 'ecsCharge',
          value: ecsCharge ?? 0,
        });
        // penalty charge
        forecloseDataForWeb.push({
          key: 'penalty',
          subKey: delayDays ?? 0,
          value: penalCharge ?? 0,
        });
        const foreclosePercentage = GLOBAL_CHARGES.FORECLOSURE_PERC;
        forecloseDataForWeb.push({
          key: 'forecloseCharge',
          subKeyforeclose: foreclosePercentage + '%',
          value: foreclosureCharge,
        });
        forecloseDataForWeb.push({
          key: 'legalCharge',
          value: legalCharges ?? 0,
        });
        forecloseDataForWeb.push({
          key: 'totalPayableAmount',
          value: fullPayData?.totalAmount,
        });
        finalData['Foreclose Details Web'] = forecloseDataForWeb;
      }

      //insurance
      const insuranceId = loanData?.insuranceId;
      const insurance = await this.getInsuranceData(insuranceId);
      if (insuranceId) {
        if (!insurance?.insurancePolicy1 && !insurance?.insurancePolicy2)
          finalData.insuranceLabel = kInsuranceWaitingTag;
      }
      const promoCodes: any = await this.promoCodeService.getUsersPromoCode(
        { userId: loanData?.userId },
        [],
      );
      if (promoCodes?.message) finalData.promoCodes = [];
      else finalData.promoCodes = promoCodes;
      if (finalData?.promoCodes?.length != 0) {
        finalData?.promoCodes[0]?.discoun;
      }
      //for showing web page for repayment
      let isWebViewPaymentUrl = false;
      const currentDate = this.typeService.getGlobalDate(new Date()).toJSON();
      const transOptions = {
        where: {
          source: KICICIUPI,
          userId: loanData?.userId,
          status: 'FAILED',
          completionDate: { [Op.eq]: currentDate },
        },
      };
      const todayICICIFailedCount = await this.transactionRepo.getCountsWhere(
        transOptions,
      );
      let upiService = await this.commonSharedService.getServiceName(
        kPaymentMode,
      );
      if (todayICICIFailedCount < 5 && !upiService.includes('RAZORPAY_SDK')) {
        isWebViewPaymentUrl = true;
      }
      finalData.isWebViewPaymentUrl = isWebViewPaymentUrl;

      //for showing full pay  and emi summary when user go through email for repayment
      if (isRequestForWeb) {
        let finalDataForWeb: any = {};
        finalDataForWeb.isPartPayment = isPartPayment;
        finalDataForWeb.isFullPayment = finalData?.isFullPayment;
        if (totalUnpaidEMIs.length == '1' && allDelayEMIs.length == '1')
          finalDataForWeb.isFullPayment = false;
        finalDataForWeb.minPartAmount = minPartAmount;
        finalDataForWeb.isSentFromAdmin = false;
        const emiData = finalData?.emiData;
        //for showing emi tab in web payment page if user go through mail for repayment
        let isEmiPay = true;
        let paidEmiCounts = 0;
        let isLoanCompleted = false;
        for (let i = 0; i < emiData.length; i++) {
          try {
            const emiItem = emiData[i];
            if (emiItem?.Paid == true) paidEmiCounts += 1;
          } catch (error) {}
        }
        finalDataForWeb.isEmiPay = isEmiPay;
        if (emiData.length == paidEmiCounts) isLoanCompleted = true;
        finalDataForWeb.isLoanCompleted = isLoanCompleted;
        //we send mail for first unpaid emi to user
        const indexOfFirstUnpaidEMI = emiData.findIndex(
          (emi) => emi.Paid === false,
        );
        let firstUnpaidEmiAmount;
        let firstUnpaidEmipenalty;
        let firstUnpaidEmiEscBounceCharge;
        if (finalData?.emiData[indexOfFirstUnpaidEMI]?.['EMI amount']) {
          firstUnpaidEmiAmount = parseFloat(
            finalData?.emiData[indexOfFirstUnpaidEMI]?.['EMI amount'].replace(
              /[^\d.]/g,
              '',
            ),
          );
        }

        if (finalData?.emiData[indexOfFirstUnpaidEMI]?.['Penalty']) {
          firstUnpaidEmipenalty = parseFloat(
            finalData?.emiData[indexOfFirstUnpaidEMI]?.['Penalty'].replace(
              /[^\d.]/g,
              '',
            ),
          );
        }

        if (finalData?.emiData[indexOfFirstUnpaidEMI]?.['ECS bounce charge']) {
          firstUnpaidEmiEscBounceCharge = parseFloat(
            finalData?.emiData[indexOfFirstUnpaidEMI]?.[
              'ECS bounce charge'
            ].replace(/[^\d.]/g, ''),
          );
        }

        //object for showing summary of first unpaid emi in web
        const data = emiData[indexOfFirstUnpaidEMI];
        let emipaydata: any = {};
        emipaydata.emiId = finalData?.emiData[indexOfFirstUnpaidEMI]?.['id'];
        emipaydata.emiNumber =
          finalData?.emiData[indexOfFirstUnpaidEMI]?.['emiNumber'];
        emipaydata.principalAmount = data?.principalAmount;
        emipaydata.interestData = {
          totalInterest: data?.totalInterest ?? 0,
          regularInterest: data?.regularInterest ?? 0,
          deferredInterest: data?.deferredInterest ?? 0,
        };
        emipaydata.delayDays = data?.['Delay Days'] ?? 0;
        emipaydata.ecsCharge = data?.ecsCharge;
        emipaydata.penalty = data?.penalty;
        emipaydata.legalCharge = data?.legalCharge;
        emipaydata.totalPayableAmount = this.typeService.manageAmount(
          data?.totalPayableAmount,
        );
        const webEmiPayData = emipaydata;

        let totalDueEmiAmount = 0;
        let totalDuePenaltyAmount = 0;
        let totalDelayDays = 0;
        let totalEcsBounceCharge = 0;
        let totalPayableAmount;
        for (let i = 0; i < emiList?.length; i++) {
          try {
            const ele = emiList[i];
            if (ele?.['Paid'] == false) {
              if (ele?.['Delay Days']) {
                totalDelayDays += ele?.['Delay Days'];
              }
              let emiAmount;
              if (ele?.['EMI amount']) {
                emiAmount = ele?.['EMI amount'].replace(/[^\d.]/g, '');
                emiAmount = parseFloat(emiAmount);
                totalDueEmiAmount += emiAmount;
              }

              let escBounceCharge;
              if (ele?.['ECS bounce charge']) {
                escBounceCharge = ele?.['ECS bounce charge'].replace(
                  /[^\d.]/g,
                  '',
                );
                escBounceCharge = parseFloat(escBounceCharge);
                totalEcsBounceCharge += escBounceCharge;
              }

              let penalty;
              if (ele?.['Penalty']) {
                penalty = ele?.['Penalty'].replace(/[^\d.]/g, '');
                penalty = parseFloat(penalty);
                totalDuePenaltyAmount += penalty;
              }
            }
          } catch (error) {}
        }
        totalPayableAmount = finalData?.fullPayAmount;

        // For lower interest rate with more than 3 days we need to charge user full loan amount instead of per day
        const today = this.typeService.getGlobalDate(new Date());
        if (
          +loanData?.interestRate <=
          GLOBAL_RANGES.MAX_TOTAL_FULL_PAY_INTEREST_RATE
        ) {
          const disbursedDate = loanData?.loan_disbursement_date;
          const diffInDays =
            this.typeService.dateDifference(disbursedDate, today) + 1;
          if (diffInDays <= 3) totalDueEmiAmount = totalPayableAmount;
        }

        let webFullPayData: any = {};
        const getFullPayableData =
          await this.sharedCalculation.getFullPaymentData({
            loanId,
            isRequestedForLink: true,
            isLoanClosure,
            isLoanSettled,
          });
        let totalAmount = this.typeService.manageAmount(
          getFullPayableData.totalAmount,
        );
        let principalAmount = this.typeService.manageAmount(
          getFullPayableData?.remainingPrincipal +
            getFullPayableData?.overduePrincipalAmount,
        );
        let regularInterest = this.typeService.manageAmount(
          getFullPayableData?.remainingInterest +
            getFullPayableData?.overdueInterestAmount,
        );
        let deferredInterest = this.typeService.manageAmount(
          getFullPayableData?.regInterestAmount,
        );
        let totalInterest = regularInterest + deferredInterest;
        let ecsCharge = this.typeService.manageAmount(
          getFullPayableData?.bounceCharge +
            getFullPayableData?.sgstBounceCharge +
            getFullPayableData?.cgstBounceCharge,
        );
        let penalCharge = this.typeService.manageAmount(
          getFullPayableData?.penalCharge +
            getFullPayableData?.remainingPenalty +
            getFullPayableData?.cgstPenalCharges +
            getFullPayableData?.sgstPenalCharges,
        );
        let delayDays = getFullPayableData?.penalty_days;
        let foreclosureCharge = this.typeService.manageAmount(
          getFullPayableData?.forClosureAmount +
            (getFullPayableData?.sgstForClosureCharge ?? 0) +
            (getFullPayableData?.cgstForClosureCharge ?? 0),
        );
        let subKeyforeclose = GLOBAL_CHARGES.FORECLOSURE_PERC;
        let legalCharges = this.typeService.manageAmount(
          getFullPayableData?.legalCharges +
            getFullPayableData?.sgstLegalCharges +
            getFullPayableData?.cgstLegalCharges,
        );
        let newDiscountAmt = 0;
        let totalAmountAfterDiscount = 0;
        if (finalData?.promoCodes?.length != 0) {
          const discountPercentage = finalData?.promoCodes[0]?.discount;
          const discountApplicableCharges =
            deferredInterest + ecsCharge + penalCharge + legalCharges;
          newDiscountAmt =
            (discountApplicableCharges * discountPercentage) / 100;
          newDiscountAmt = Math.floor(newDiscountAmt);
          totalAmountAfterDiscount = totalAmount - newDiscountAmt;
        }
        if (newDiscountAmt === 0) totalAmountAfterDiscount = totalAmount;
        webFullPayData.principalAmount = principalAmount;
        webFullPayData.totalInterest = totalInterest;
        webFullPayData.regularInterest = regularInterest;
        webFullPayData.deferredInterest = deferredInterest;
        webFullPayData.interest = regularInterest;
        webFullPayData.ecsCharge = ecsCharge;
        webFullPayData.penalty = penalCharge;
        webFullPayData.delayDays = delayDays;
        webFullPayData.forecloseCharge = foreclosureCharge;
        webFullPayData.subKeyforeclose = subKeyforeclose;
        webFullPayData.legalCharge = legalCharges;
        webFullPayData.totalPayableAmount = getFullPayableData?.totalAmount;
        webFullPayData.discountAmount =
          isLoanClosure || isLoanSettled ? 0 : newDiscountAmt;
        webFullPayData.totalAmountAfterDiscount =
          isLoanClosure || isLoanSettled
            ? totalAmount
            : totalAmountAfterDiscount;

        finalDataForWeb.webEmiPayData = webEmiPayData;
        finalDataForWeb.webFullPayData = webFullPayData;

        //when admin create payment link from admin panel on user's request
        const paymentLinkOptions = {
          where: {
            loanId,
            status: 'INITIALIZED',
            source: 'PAYMENT_LINK',
            createdAt: dateRange,
          },
          order: [['id', 'DESC']],
        };

        const paymentLinkAtr = ['type', 'paidAmount', 'adminId'];
        const paymentLinkData = await this.transactionRepo.getRowWhereData(
          paymentLinkAtr,
          paymentLinkOptions,
        );
        if (paymentLinkData === k500Error) return kInternalError;
        if (paymentLinkData?.type) {
          const type = paymentLinkData?.type;
          if (type == 'FULLPAY') {
            finalDataForWeb.isFullPayment = true;
            finalDataForWeb.isPartPayment = false;
            finalDataForWeb.isEmiPay = false;
            finalDataForWeb.isCloseLoan = true;
          } else if (type == 'EMIPAY') {
            finalDataForWeb.isFullPayment = false;
            finalDataForWeb.isPartPayment = false;
            finalDataForWeb.isEmiPay = true;
          } else if (type == 'PARTPAY') {
            finalDataForWeb.isFullPayment = false;
            finalDataForWeb.isPartPayment = true;
            finalDataForWeb.isEmiPay = false;
            if (finalDataForWeb?.minPartAmount == 0) {
              finalDataForWeb.minPartAmount = paymentLinkData?.paidAmount;
            }
          }
          finalDataForWeb.isSentFromAdmin = true;
          finalDataForWeb.adminId = paymentLinkData?.adminId;
          finalDataForWeb.amount = getFullPayableData?.totalAmount;
        }
        return finalDataForWeb;
      }

      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get part pay calculation when user enter amount for part pay
  async getPartPayCalculation(query) {
    let amount = query.amount;
    let isRequestForWeb = query?.isRequestForWeb;
    let isSentFromAdmin = query?.isSentFromAdmin;
    if (!amount) return {};
    const loanId = query.loanId;
    if (!loanId) return kParamMissing('loanId');
    try {
      const fullPayData = await this.sharedCalculation.getFullPaymentData({
        loanId,
      });
      if (fullPayData?.totalAmount > 1000 && amount < 1000) return {};

      // EMI data
      const emiInc: any = { model: EmiEntity };
      emiInc.attributes = [
        'id',
        'penalty',
        'pay_type',
        'emi_date',
        'emi_amount',
        'penalty_days',
        'totalPenalty',
        'bounceCharge',
        'payment_status',
        'principalCovered',
        'interestCalculate',
        'fullPayPenalty',
        'payment_due_status',
        'payment_done_date',
        'partPaymentPenaltyAmount',
        'emiNumber',
        'regInterestAmount',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
        'paidRegInterestAmount',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
        'paid_principal',
        'paid_interest',
      ];
      emiInc.where = { payment_due_status: '1' };

      const attributes = [
        'id',
        'loanStatus',
        'insuranceId',
        'isPartPayment',
        'interestRate',
        'userId',
        'netApprovedAmount',
        'loan_disbursement_date',
        'penaltyCharges',
      ];
      const include = [emiInc];
      const options = { where: { id: loanId }, include };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return {}; // to ask
      // if (!loanData) return k422ErrorMessage(kNoDataFound);
      const userType =
        loanData?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
      const emiData = loanData?.emiData;
      let totalAmt = 0;

      for (let i = 0; i < emiData?.length; i++) {
        const ele = emiData[i];
        if (userType) {
          for (let i = 0; i < emiData.length; i++) {
            try {
              let ele = emiData[i];
              let cGstOnPenal = this.typeService.manageAmount(
                (ele.penaltyChargesGST ?? 0) / 2,
              );
              let sGstOnPenal = this.typeService.manageAmount(
                (ele.penaltyChargesGST ?? 0) / 2,
              );
              ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
            } catch (error) {}
          }
        }
        if (userType == false) ele.bounceCharge = 0;
        if (isSentFromAdmin) {
          let emiAmount = 0;
          emiAmount += this.typeService.manageAmount(
            ele?.principalCovered ?? 0 - ele?.paid_principal ?? 0,
          );
          emiAmount += this.typeService.manageAmount(
            ele?.interestCalculate ?? 0 - ele?.paid_interest ?? 0,
          );
          emiAmount += this.typeService.manageAmount(
            ele?.regInterestAmount ?? 0 - ele?.paidRegInterestAmount ?? 0,
          );
          emiAmount += this.typeService.manageAmount(
            (ele?.bounceCharge ?? 0) +
              (ele?.gstOnBounceCharge ?? 0) -
              (ele?.paidBounceCharge ?? 0),
          );
          emiAmount += this.typeService.manageAmount(ele?.penalty ?? 0);
          emiAmount += this.typeService.manageAmount(
            (ele?.dpdAmount ?? 0) +
              (ele?.penaltyChargesGST ?? 0) -
              (ele?.paidPenalCharge ?? 0),
          );
          emiAmount += this.typeService.manageAmount(
            (ele?.legalCharge ?? 0) - (ele?.paidLegalCharge ?? 0),
          );
          totalAmt += emiAmount;
        }
      }
      totalAmt = this.typeService.manageAmount(totalAmt);
      if (amount > totalAmt && isSentFromAdmin) return {};
      const response = await this.sharedCalculation.getPartPayCalulation(
        loanData,
        +amount,
      );
      if (response.message) return {};
      let partPayData: any = {};
      if (response?.principalAmount > 0) {
        partPayData['Principal amount'] =
          '₹' +
          this.typeService.amountNumberWithCommas(response?.principalAmount);
      }
      if (response?.deferredInterest > 0) {
        partPayData['interestData'] = [
          {
            key: 'Total interest',
            value:
              '₹' +
              this.typeService.amountNumberWithCommas(response?.totalInterest),
          },
          {
            key: 'Regular interest',
            value:
              '₹' + this.typeService.amountNumberWithCommas(response?.interest),
          },
          {
            key: `Deferred interest #*@${
              response?.delayDays +
              ' Day' +
              (response?.delayDays > 1 ? 's' : '')
            }*#`,

            value:
              '₹' +
              this.typeService.amountNumberWithCommas(
                response?.deferredInterest,
              ),
          },
        ];
      } else if (response?.interest > 0) {
        partPayData['Interest'] =
          '₹' + this.typeService.amountNumberWithCommas(response?.interest);
      }
      if (response?.ecsCharge > 0) {
        partPayData[
          'Ecs charge #*\nIncluding GST*#'
        ] = `#*₹${this.typeService.amountNumberWithCommas(
          response?.ecsCharge,
        )}*#`;
      }
      if (response?.penalCharge > 0) {
        partPayData[
          'Penalty @' +
            response?.delayDays +
            ' Day' +
            (response?.delayDays > 1 ? 's' : '') +
            '#*\nIncluding GST*#'
        ] = `#*₹${this.typeService.amountNumberWithCommas(
          response?.penalCharge,
        )}*#`;
      }
      if (response?.legalCharge > 0) {
        partPayData[
          'Legal charge #*\nIncluding GST*#'
        ] = `#*₹${this.typeService.amountNumberWithCommas(
          response?.legalCharge,
        )}*#`;
      }
      if (isRequestForWeb) return response;
      return partPayData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async deactivePaymentLinks() {
    const today = new Date();
    let year = today.getFullYear();
    let month = (today.getMonth() + 1).toString().padStart(2, '0');
    let date = today.getDate();
    let TodayDate: any = `${year}-${month}-${date}T10:00:00.000Z`;
    TodayDate = new Date(TodayDate);
    const options: any = {};
    options.where = {
      expiryDate: {
        [Op.lt]: TodayDate.toJSON(),
      },
      isActive: true,
    };
    const update = await this.repoManager.updateRowWhereData(
      PaymentLinkEntity,
      { isActive: false },
      options,
    );
    if (update === k500Error) throw new Error();
    return true;
  }

  //#region
  private async getInsuranceData(insuranceId) {
    const data = { insurancePolicy1: '', insurancePolicy2: '' };
    try {
      const id = insuranceId;
      const options = { where: { id } };
      const att = ['id', 'insuranceURL', 'insuranceURL1'];
      const result = await this.insuranceRepo.getRoweData(att, options);
      if (!result || result === k500Error) return data;
      if (result?.insuranceURL) data.insurancePolicy1 = result?.insuranceURL;
      if (result?.insuranceURL1) data.insurancePolicy2 = result?.insuranceURL1;
    } catch (error) {}
    return data;
  }
  //#endregion

  //get transaction data and autoPayDetail
  private transactionAutodebitEMIInfo(data) {
    try {
      const transData = data?.transData;
      const emiDates = data?.emiDates;
      let totalRepaidAmount = 0;
      const autoPayDetail = [];
      const utrData = [];
      let lastUtr;
      const transLength = transData.length;
      for (let index = 0; index < transLength; index++) {
        try {
          const tra = transData[index];
          const status = tra.status;
          const paidAmount = tra.paidAmount;
          const utr = tra?.utr;
          const subSource = tra?.subSource;
          const subsDate = tra?.subscriptionDate;
          const compDate = tra?.completionDate;
          const emiId = tra?.emiId;
          const type = tra?.type;

          //autoDebit data
          if (
            subSource == kAutoDebit &&
            emiDates.includes(subsDate) &&
            tra?.adminId == SYSTEM_ADMIN_ID &&
            type == 'EMIPAY'
          ) {
            try {
              const stepperInfo = [];
              let isPengingAutodebit = false;
              stepperInfo.push({
                name: 'Repayment requested to your bank',
                date: new Date(tra?.createdAt).toLocaleString('default', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              });
              if (status == kInitiated) {
                isPengingAutodebit = true;
                stepperInfo.push({
                  name: 'Awaiting response from bank',
                  isPending: status == kInitiated ? true : false,
                });
              } else
                stepperInfo.push({
                  name: 'Repayment Status',
                  date: new Date(compDate).toLocaleString('default', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                  status: status == kCompleted,
                });
              const emiDate = this.typeService.getGlobalDate(subsDate);
              const emiInfo = {};
              emiInfo['emiId'] = emiId;
              let autoDebitMsg = '';
              if (isPengingAutodebit) {
                emiInfo['stepperInfo'] = stepperInfo;
                autoDebitMsg = kLoanMaintainSufficientBalance;
              }
              emiInfo['autoPlaceMess'] = autoDebitMsg;
              const diff = this.typeService.dateDifference(emiDate, new Date());
              emiInfo['autoPlaceNotSuccess'] = isPengingAutodebit
                ? diff >= 1
                  ? kAutoDebitNotSuccessFull
                  : ''
                : kAutoDebitNotInitilize;
              emiInfo['pendingAutodebit'] = isPengingAutodebit;
              const find = autoPayDetail.find((f) => f?.emiId == emiId);
              if (!find) autoPayDetail.push(emiInfo);
            } catch (error) {}
          }

          //completed transaction
          if (status == kCompleted) {
            totalRepaidAmount += paidAmount ?? 0;
            if (utr && !lastUtr) lastUtr = utr;
            const utrObj = { emiId, utr };
            const utrFind = utrData.find((u) => u?.emiId == emiId);
            if (!utrFind) utrData.push(utrObj);
          }
        } catch (error) {}
      }
      return { autoPayDetail, utrData, totalRepaidAmount, lastUtr };
    } catch (error) {
      return {};
    }
  }

  //get emi data and autoPayDetail
  private getEMIandAutoPayDetail(data) {
    try {
      const emiData = data?.emiData ?? [];
      const traData = data?.transData ?? [];
      const autoPayData = data?.autoPayDetail ?? [];
      const utrData = data?.utrData ?? [];
      const lastUtr = data?.lastUtr ?? '';
      let totalPayableAmount = 0;
      let totalDueAmount = 0;
      let penaltyDays;
      let isDelayed = false;
      const emiDetails = [];
      let needPay = false;
      let forecloseFlag = true;
      emiData.sort((a, b) => a.id - b.id);
      emiData.forEach((ele) => {
        try {
          const emiId = ele.id;
          const payStatus = ele?.payment_status;
          const dueStatus = ele?.payment_due_status;
          let principalAmount = this.typeService.manageAmount(
            ele?.principalCovered - ele?.paid_principal,
          );
          let regularInterest = this.typeService.manageAmount(
            ele?.interestCalculate - ele?.paid_interest,
          );
          let deferredInterest = this.typeService.manageAmount(
            (ele?.regInterestAmount ?? 0) - (ele?.paidRegInterestAmount ?? 0),
          );
          let totalInterest = 0;
          if (deferredInterest > 0)
            totalInterest = deferredInterest + regularInterest;
          else totalInterest = regularInterest;
          totalInterest = this.typeService.manageAmount(totalInterest);
          let ecsCharge =
            ele?.bounceCharge +
            (ele?.gstOnBounceCharge ?? 0) -
            (ele?.paidBounceCharge ?? 0);
          ecsCharge = this.typeService.manageAmount(ecsCharge);
          let penalCharge =
            (ele?.dpdAmount ?? 0) +
            (ele?.penalty ?? 0) +
            (ele?.penaltyChargesGST ?? 0) -
            (ele?.paidPenalCharge ?? 0);
          penalCharge = this.typeService.manageAmount(penalCharge);
          let legalCharge =
            (ele?.legalCharge ?? 0) +
            (ele?.legalChargeGST ?? 0) -
            (ele?.paidLegalCharge ?? 0);
          legalCharge = this.typeService.manageAmount(legalCharge);
          let totalEMIAmount = 0;
          totalEMIAmount += +ele?.principalCovered - +ele?.paid_principal ?? 0;
          totalEMIAmount += +ele?.interestCalculate - +ele?.paid_interest ?? 0;
          totalEMIAmount +=
            (ele?.regInterestAmount ?? 0) - (ele?.paidRegInterestAmount ?? 0);
          totalEMIAmount +=
            (ele?.bounceCharge ?? 0) +
              (ele?.gstOnBounceCharge ?? 0) -
              ele?.paidBounceCharge ?? 0;
          totalEMIAmount += penalCharge;
          totalEMIAmount = this.typeService.manageAmount(totalEMIAmount);
          if (payStatus == '0')
            // totalEMIAmount += ele?.penalty - ele?.paidPenalCharge ?? 0;
            totalDueAmount += totalEMIAmount;
          // Outstanding Amount
          totalPayableAmount += ele?.principalCovered ?? 0;
          totalPayableAmount += ele?.interestCalculate ?? 0;
          totalPayableAmount += ele?.regInterestAmount ?? 0;
          totalPayableAmount +=
            penalCharge +
            (ele?.paidPenalCharge ?? 0) +
            (ele?.partPaymentPenaltyAmount ?? 0);
          totalPayableAmount += ecsCharge + (ele?.paidBounceCharge ?? 0);
          totalPayableAmount += legalCharge;
          totalPayableAmount =
            this.typeService.manageAmount(totalPayableAmount);
          // totalPayableAmount += ele?.partPaymentPenaltyAmount ?? 0;
          const delayDays = ele?.penalty_days;
          if (
            ele?.payment_status == '0' &&
            ele?.payment_due_status == '1' &&
            !penaltyDays
          )
            penaltyDays = delayDays;
          totalEMIAmount = this.typeService.manageAmount(totalEMIAmount);
          let emiAmount = this.typeService.manageAmount(
            +ele.principalCovered + +ele?.interestCalculate,
          );
          emiAmount = this.typeService.amountNumberWithCommas(emiAmount);
          let totalAmount =
            +principalAmount +
            +totalInterest +
            +ecsCharge +
            +penalCharge +
            +legalCharge;

          //EMI Pay Button
          let payButton = false;
          let isEligibleForForeclosure = false;
          const emi_date = new Date(ele.emi_date).getTime();
          const today = this.typeService.getGlobalDate(new Date()).getTime();

          const emi_amount =
            '₹ ' +
            this.typeService.amountNumberWithCommas(
              (+ele.emi_amount).toFixed(),
            );

          const bounceCharge = this.typeService.manageAmount(
            ele?.bounceCharge + ele?.gstOnBounceCharge ??
              0 - (ele?.paidBounceCharge ?? 0),
          );
          let withoutECS = +ele?.penalty - bounceCharge;
          if (withoutECS < 0) withoutECS = 0;

          const penalty = withoutECS
            ? '₹ ' + this.typeService.amountNumberWithCommas(withoutECS)
            : '';

          let pay_emi_info;

          /// this prepare othe info
          if (
            emi_date <= today &&
            needPay == true &&
            ele?.payment_status == '0'
          ) {
            payButton = true;
            pay_emi_info = this.getPayButtonInfo(
              this.typeService.manageAmount(totalDueAmount),
              emiData,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            );
          }

          /// first unpaid emi pay button enable
          if (needPay == false && ele?.payment_status == '0') {
            payButton = true;
            needPay = true;
            /// get pay emi info
            pay_emi_info = this.getPayButtonInfo(
              this.typeService.manageAmount(totalDueAmount),
              null,
              ele?.principalCovered,
              this.typeService.manageAmount(ele?.interestCalculate ?? 0),
              this.typeService.manageAmount(ele?.regInterestAmount ?? 0),
              this.typeService.manageAmount(ele?.bounceCharge ?? 0),
              this.typeService.manageAmount(ele?.gstOnBounceCharge ?? 0),
              this.typeService.manageAmount(ele?.dpdAmount ?? 0),
              this.typeService.manageAmount(ele?.penaltyChargesGST ?? 0),
              ele?.penalty_days,
              this.typeService.manageAmount(ele?.legalCharge ?? 0),
              this.typeService.manageAmount(ele?.legalChargeGST ?? 0),
              this.typeService.manageAmount(ele?.paid_principal ?? 0),
              this.typeService.manageAmount(ele?.paid_interest ?? 0),
              this.typeService.manageAmount(ele?.paidRegInterestAmount ?? 0),
              this.typeService.manageAmount(ele?.paidBounceCharge ?? 0),
              this.typeService.manageAmount(ele?.paidPenalCharge ?? 0),
              this.typeService.manageAmount(ele?.paidLegalCharge ?? 0),
              this.typeService.manageAmount(ele?.penalty ?? 0),
              this.typeService.manageAmount(ele?.totalPenalty ?? 0),
              this.typeService.manageAmount(ele?.partPaymentPenaltyAmount ?? 0),
            );
          }
          const emiDate = this.typeService
            .getGlobalDate(ele?.emi_date)
            .getTime();
          if (
            ele?.payment_due_status == '0' &&
            forecloseFlag &&
            ele?.payment_status == '0' &&
            today < emiDate
          ) {
            isEligibleForForeclosure = true;
            forecloseFlag = false;
          }
          if (pay_emi_info) pay_emi_info['id'] = ele.id;
          // EMI data
          const emi: any = {};
          let paymentDetails = {};

          emi['id'] = emiId;
          emi['emiNumber'] = ele?.emiNumber;
          emi['EMI date'] = ele.emi_date;
          emi['EMI done date'] = ele?.payment_done_date;
          emi['EMI amount'] = emiAmount;

          if (withoutECS < 0) withoutECS = 0;
          else withoutECS = this.typeService.manageAmount(+ele.penalty ?? 0);
          if (withoutECS) {
            emi['Penalty'] =
              '₹ ' + this.typeService.amountNumberWithCommas(withoutECS);
          }
          if (ele?.bounceCharge) emi['EMI amount'] = emiAmount;
          if (penalty) emi['Penalty'] = penalty;

          if (bounceCharge)
            emi['ECS bounce charge'] =
              '₹ ' + this.typeService.amountNumberWithCommas(bounceCharge);

          emi['Total EMI Amount'] =
            '₹ ' + this.typeService.amountNumberWithCommas(totalEMIAmount);
          emi['totalEMIAmount'] = totalEMIAmount;
          emi['Delayed'] = ele?.payment_due_status == '1' ? true : false;
          if (ele?.payment_due_status == '1') {
            emi['Delay Days'] = delayDays;
            if (!isDelayed) isDelayed = true;
          }
          emi['principalAmount'] =
            this.typeService.manageAmount(principalAmount);
          if (deferredInterest > 0) {
            emi.deferredInterest =
              this.typeService.manageAmount(deferredInterest);
          }
          emi['regularInterest'] =
            this.typeService.manageAmount(regularInterest);
          emi['totalInterest'] = this.typeService.manageAmount(totalInterest);
          emi['totalPayableAmount'] =
            this.typeService.manageAmount(totalAmount);
          emi['ecsCharge'] = this.typeService.manageAmount(
            ele?.bounceCharge +
              (ele?.gstOnBounceCharge ?? 0) -
              (ele?.paidBounceCharge ?? 0),
          );
          emi['penalty'] = this.typeService.manageAmount(
            (ele?.penalty ?? 0) - (ele?.paidPenalCharge ?? 0),
          );
          if (
            ele?.payment_due_status == '1' &&
            (ele?.penalty ?? 0) - (ele?.paidPenalCharge ?? 0) > 0
          )
            emi['isPenalty'] = true;
          emi['partOfemi'] = ele?.partOfemi;
          if (ele?.partOfemi == 'LAST')
            emi['legalCharge'] = this.typeService.manageAmount(legalCharge);
          emi['Paid'] = ele?.payment_status == '1' ? true : false;
          emi['payButton'] = payButton;
          emi['isEligibleForForeclosure'] = isEligibleForForeclosure;
          const utr = utrData.find((f) => f?.emiId == emiId);
          if (utr) emi['utr'] = utr?.utr;
          else if (ele?.payment_status == '1') emi['utr'] = lastUtr;
          const autoDebit = autoPayData.find((a) => a?.emiId == emiId);
          emi['info'] = autoDebit ? autoDebit : {};
          emi['pay_emi_info'] = pay_emi_info;

          if (payStatus == '1') {
            let trans: any = {};
            if (ele?.pay_type == 'FULLPAY')
              trans = traData.find(
                (f) => f.type == 'FULLPAY' && f.status == kCompleted,
              );
            else
              trans = traData.find(
                (f) =>
                  f.emiId == emiId &&
                  f.type != 'REFUND' &&
                  f.status == kCompleted,
              );
            paymentDetails['Status'] = `#*||FF4E60||##${
              dueStatus == '1' ? 'Delayed' : 'Ontime'
            }##*#`;

            paymentDetails['Date'] = `##${
              trans?.completionDate
                ? this.typeService.getDateFormatted(trans?.completionDate, '/')
                : '-'
            }##`;
            paymentDetails['Amount'] = `##${this.strService.readableAmount(
              trans?.paidAmount ?? 0,
            )}##`;
            if (delayDays) {
              paymentDetails[
                'Delayed by'
              ] = `#*||FF4E60||##${delayDays} days##*#`;
              paymentDetails[
                'Penalty Amount'
              ] = `#*||FF4E60||##${this.strService.readableAmount(
                ele?.totalPenalty ?? 0,
              )}##*#`;
            }
            const tpaidAmt =
              (ele?.principalCovered ?? 0) +
              (ele?.interestCalculate ?? 0) +
              (ele?.partPaymentPenaltyAmount ?? 0) +
              (ele?.fullPayPenalty ?? 0);

            let key = `Total Paid Amount`;
            if (dueStatus == '1')
              key = `${key}\n#*||FF4E60||Inclusive of penalty*#`;

            paymentDetails[key] = `##${this.strService.readableAmount(
              tpaidAmt ?? 0,
            )}##`;

            if (trans) {
              paymentDetails['Transaction ID'] = `##${trans?.utr ?? '-'}##`;
              if (trans?.source === KICICIUPI) trans.source = 'UPI';
              paymentDetails['Payment via'] = `##${trans?.source ?? '-'}##`;
              if (trans?.subSource == 'AUTODEBIT') trans.subSource = 'e-NACH';
              paymentDetails['Payment mode'] = `##${trans?.subSource ?? '-'}##`;
            }
          }
          emi.paymentDetails = paymentDetails;
          emiDetails.push(emi);
        } catch (error) {}
      });
      return {
        emiDetails,
        totalPayableAmount,
        totalDueAmount,
        penaltyDays,
        isDelayed,
      };
    } catch (error) {
      return {};
    }
  }

  //#region get pay button info
  private getPayButtonInfo(
    amount,
    emi_list: any,
    principalCovered,
    interestCalculate,
    regInterestAmount,
    bounceCharge,
    gstOnBounceCharge,
    dpdAmount,
    penaltyChargesGST,
    penalty_days,
    legalCharge,
    legalChargeGST,
    paid_principal,
    paid_interest,
    paidRegInterestAmount,
    paidBounceCharge,
    paidPenalCharge,
    paidLegalCharge,
    penalty,
    totalPenalty,
    partPaymentPenalty,
  ) {
    const pay_emi_info: any = {};
    if (emi_list) {
      const today = this.typeService.getGlobalDate(new Date()).getTime();
      const filter = emi_list.filter(
        (f) =>
          f.payment_status == '0' && new Date(f.emi_date).getTime() <= today,
      );
      if (filter.length > 0) {
        let total_amount = 0;
        let finalAmount = 0;
        filter.forEach((ele) => {
          const emi_emiNumber = ele?.emiNumber;
          const principalAmount = this.typeService.manageAmount(
            ele?.principalCovered - ele?.paid_principal,
          );
          let regularInterest = ele?.interestCalculate - ele?.paid_interest;
          regularInterest = this.typeService.manageAmount(regularInterest);
          let deferredInterest = this.typeService.manageAmount(
            (ele?.regInterestAmount ?? 0) - (ele?.paidRegInterestAmount ?? 0),
          );
          let totalInterest = regularInterest + deferredInterest;
          totalInterest = this.typeService.manageAmount(totalInterest);
          let ecsCharge =
            ele?.bounceCharge +
            (ele?.gstOnBounceCharge ?? 0) -
            (ele?.paidBounceCharge ?? 0);
          ecsCharge = this.typeService.manageAmount(ecsCharge);
          let penalCharge =
            (ele?.dpdAmount ?? 0) +
            (ele?.penaltyChargesGST ?? 0) +
            (ele?.penalty ?? 0) -
            (ele?.paidPenalCharge ?? 0);

          penalCharge = this.typeService.manageAmount(penalCharge);
          let legalCharge =
            (ele?.legalCharge ?? 0) +
            (ele?.legalChargeGST ?? 0) -
            (ele?.paidLegalCharge ?? 0);
          legalCharge = this.typeService.manageAmount(legalCharge);
          total_amount =
            +principalAmount +
            +totalInterest +
            +ecsCharge +
            +penalCharge +
            +legalCharge;
          let delayDays = ele?.penalty_days;
          let emi_info = {};
          if (principalAmount > 0) {
            emi_info['Principal amount'] =
              '₹' + this.typeService.amountNumberWithCommas(principalAmount);
          }
          if (deferredInterest > 0) {
            emi_info['interestData'] = [
              {
                key: 'Total interest',
                value:
                  '₹' + this.typeService.amountNumberWithCommas(totalInterest),
              },
              {
                key: 'Regular interest',
                value:
                  '₹' +
                  this.typeService.amountNumberWithCommas(regularInterest),
              },
              {
                key:
                  'Deferred interest ' +
                  `#*@${delayDays} Day${delayDays > 1 ? 's' : ''}*#`,
                value:
                  '₹' +
                  this.typeService.amountNumberWithCommas(deferredInterest),
              },
            ];
          } else if (regularInterest > 0) {
            emi_info['Interest'] =
              '₹' + this.typeService.amountNumberWithCommas(regularInterest);
          }

          if (ecsCharge > 0) {
            emi_info[
              'Ecs charge #*\n(Including GST)*#'
            ] = `#*₹${this.typeService.amountNumberWithCommas(ecsCharge)}*#`;
          }

          if (penalCharge > 0) {
            emi_info[
              'Penal charge @' +
                ele?.penalty_days +
                ' Day' +
                (ele?.penalty_days > 1 ? 's' : '') +
                ' #*\n(Including GST)*#'
            ] = `#*₹${this.typeService.amountNumberWithCommas(penalCharge)}*#`;
          }
          if (legalCharge > 0) {
            emi_info[
              'Legal charge #*\n(Including GST)*#'
            ] = `#*₹${this.typeService.amountNumberWithCommas(legalCharge)}*#`;
          }
          emi_info['Total amount to be repaid'] =
            '₹ ' + this.typeService.amountNumberWithCommas(total_amount);
          pay_emi_info['EMI-' + emi_emiNumber + ' amount'] =
            '₹' + this.typeService.amountNumberWithCommas(total_amount);
          pay_emi_info['emi_' + emi_emiNumber + '_more_info'] = emi_info;
          finalAmount += total_amount;
        });
        pay_emi_info['Total amount to be repaid'] =
          '₹ ' + this.typeService.amountNumberWithCommas(finalAmount);
        pay_emi_info['isGreaterEMI'] = true;
        pay_emi_info['amount'] = finalAmount;
      } else return null;
    } else {
      let delayDays = penalty_days;
      if (principalCovered - paid_principal > 0) {
        pay_emi_info['Principal amount'] =
          '₹' +
          this.typeService.amountNumberWithCommas(
            principalCovered - paid_principal,
          );
      }
      if (regInterestAmount - paidRegInterestAmount > 0) {
        pay_emi_info['interestData'] = [
          {
            key: 'Total interest',
            value:
              '₹' +
              this.typeService.amountNumberWithCommas(
                interestCalculate -
                  paid_interest +
                  (regInterestAmount - paidRegInterestAmount),
              ),
          },
          {
            key: 'Regular interest',
            value:
              '₹' +
              this.typeService.amountNumberWithCommas(
                interestCalculate - paid_interest,
              ),
          },
          {
            key:
              'Deferred interest ' +
              `#*@${delayDays} Day${delayDays > 1 ? 's' : ''}*#`,
            value:
              '₹' +
              this.typeService.amountNumberWithCommas(
                regInterestAmount - paidRegInterestAmount,
              ),
          },
        ];
      } else if (interestCalculate - paid_interest > 0)
        pay_emi_info['Interest'] =
          '₹' +
          this.typeService.amountNumberWithCommas(
            interestCalculate - paid_interest,
          );
      if (bounceCharge + gstOnBounceCharge - paidBounceCharge > 0) {
        pay_emi_info[
          'Ecs charge #*\n(Including GST)*#'
        ] = `#*₹${this.typeService.amountNumberWithCommas(
          bounceCharge + gstOnBounceCharge - paidBounceCharge,
        )}*#`;
      }
      let penalCharge =
        dpdAmount + penaltyChargesGST + penalty - paidPenalCharge;

      if (penalCharge > 0) {
        pay_emi_info[
          'Penal charge @' +
            penalty_days +
            ' Day' +
            (penalty_days > 1 ? 's' : '') +
            ' #*\n(Including GST)*#'
        ] = `#*₹${this.typeService.amountNumberWithCommas(penalCharge)}*#`;
      }
      if (legalCharge + legalChargeGST - paidLegalCharge > 0) {
        pay_emi_info['Legal charge #*\n(Including GST)*#'] =
          '₹' +
          this.typeService.amountNumberWithCommas(
            legalCharge + legalChargeGST - paidLegalCharge,
          );
      }
      pay_emi_info['Total amount to be repaid'] =
        '₹' +
        this.typeService.amountNumberWithCommas(
          principalCovered -
            paid_principal +
            (interestCalculate - paid_interest) +
            (regInterestAmount - paidRegInterestAmount) +
            penalCharge +
            (bounceCharge + gstOnBounceCharge - paidBounceCharge) +
            (legalCharge + legalChargeGST - paidLegalCharge),
        );
      pay_emi_info['isGreaterEMI'] = false;
      pay_emi_info['amount'] = amount;
    }
    return pay_emi_info;
  }

  // Set User's Loan and EMI Details
  async setUserLoanAndEmiDetails(body) {
    try {
      const loanId = body?.loanId;
      const disbursementDate = body?.disbursementDate;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // To Check Date is in Correct format or Not.
      const emiRegex = /^EMI_\d+$/; // To Check EMI Number is in Correct format or Not.
      if (!loanId) return kParamMissing('loanId');
      let emiDates = body?.emiDates;
      let delayEmi = body.delayEmi;
      if (delayEmi && !emiDates) return kParamMissing('emiDates');
      let emiToPlaceAD = +body?.emiAutoDebitPlace;
      let emiToFailAD = +body?.emiAutoDebitFail;
      let fullPayADPlace = body?.fullPayADPlace == true;
      let fullPayADFail = body?.fullPayADFail == true;
      let isAlreadyFADPlaced = false;
      let isAlreadyFADFailed = false;

      let emiUpdateCount = 0;
      let emiUpdatedData: any = {};
      let loanUpdatedData: any = {};
      let autoDebitUpdatedData: any = {};
      let errorMessage: any = {
        Error: [],
      };

      const attributes = [
        'id',
        'loanStatus',
        'insuranceId',
        'isPartPayment',
        'interestRate',
        'userId',
        'netApprovedAmount',
        'loan_disbursement_date',
        'penaltyCharges',
        'createdAt',
        'eligibilityDetails',
        'loanAmount',
      ];
      let emiInc: any = { model: EmiEntity };
      emiInc.attributes = [
        'principalCovered',
        'id',
        'emi_date',
        'payment_status',
        'emi_amount',
      ];
      emiInc.order = [['id', 'ASC']];
      let transInc: any = { model: TransactionEntity };
      transInc.attributes = ['id', 'subscriptionDate', 'status'];
      transInc.where = {
        type: 'FULLPAY',
        subSource: 'AUTODEBIT',
      };
      transInc.required = false;
      const include = [emiInc, transInc];
      const options = {
        where: { id: loanId },
        include,
      };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      if (emiDates && delayEmi) {
        for (let key in emiDates) {
          let updatedData: any = {};
          if (emiDates.hasOwnProperty(key)) {
            if (!emiRegex.test(key)) {
              errorMessage.Error.push(kInvalidParamValue('EMI_'));
              break;
            }
            const maxEMIs = EnvConfig.loan.maxEMIs;
            if (+key.split('_')[1] > maxEMIs || +key.split('_')[1] < 1) {
              errorMessage.Error.push(k422ErrorMessage('EMI Range(1-6)'));
              break;
            }
            if (!dateRegex.test(emiDates[key])) {
              errorMessage.Error.push(
                kInvalidParamValue('Emi Date(YYYY-MM-DD)'),
              );
              break;
            }
            let emiDate = `${emiDates[key]}T10:00:00.000Z`;
            let isEmiDelay =
              this.typeService.getGlobalDate(new Date()) > new Date(emiDate);
            let delayDays = +this.typeService.dateDifference(
              new Date(emiDate),
              new Date(),
              'Days',
            );
            let emiNumber: any = +key.split('_')[1];
            let emiData = loanData?.emiData?.sort((a, b) => a.id - b.id);
            if (emiNumber > emiData.length) {
              errorMessage.Error.push(
                `You Have Entered Wrong EMI Number. This Loan Have ${emiData.length} EMIs Only`,
              );
              break;
            }
            let emiId = emiData[emiNumber - 1]?.id;
            let principal = emiData[emiNumber - 1]?.principalCovered;
            let deferredInt = isEmiDelay
              ? +((principal * +loanData?.interestRate * delayDays) / 100)
              : 0;
            let penalCharges = 0;
            if (delayDays > 0 && delayDays < 4)
              penalCharges = (principal * 5) / 100;
            if (delayDays > 3 && delayDays < 15)
              penalCharges = (principal * 10) / 100;
            if (delayDays > 14 && delayDays < 31)
              penalCharges = (principal * 15) / 100;
            if (delayDays > 30 && delayDays < 61)
              penalCharges = (principal * 20) / 100;
            if (delayDays > 60) penalCharges = (principal * 25) / 100;
            let penalChargesGST = ((penalCharges * 18) / 100).toFixed(2);
            updatedData.emi_date = emiDate;
            updatedData.penalty_days = isEmiDelay ? delayDays : 0;
            updatedData.payment_due_status = isEmiDelay ? '1' : '0';
            updatedData.payment_status = '0';
            updatedData.payment_done_date = null;
            updatedData.paid_interest = 0;
            updatedData.paid_principal = 0;
            updatedData.paidRegInterestAmount = 0;
            updatedData.paidBounceCharge = 0;
            updatedData.paidPenalCharge = 0;
            updatedData.bounceCharge = isEmiDelay ? 500 : 0;
            updatedData.gstOnBounceCharge = isEmiDelay ? 90 : 0;
            updatedData.regInterestAmount = +deferredInt.toFixed(2);
            updatedData.dpdAmount = isEmiDelay ? +penalCharges.toFixed(2) : 0;
            updatedData.penaltyChargesGST = isEmiDelay ? +penalChargesGST : 0;
            updatedData.unpaid_waiver = 0;
            updatedData.waived_regInterest = 0;
            updatedData.waived_bounce = 0;
            updatedData.waived_penal = 0;
            updatedData.waived_legal = 0;
            const emiUpdate = await this.emiRepo.updateRowData(
              updatedData,
              emiId,
            );
            const opt = {
              where: { emiId },
            };
            const transDelete = await this.repoManager.deleteWhereData(
              TransactionEntity,
              opt,
            );
            if (transDelete == k500Error) {
              errorMessage.Error.push({
                Error: 'Transactions Not Deleted!!! Contact Koshal',
                emiData,
              });
            }
            if (emiUpdate == k500Error) {
              errorMessage.Error.push({
                Error:
                  'You are Adding Already Existing Data Or Any Column is Missing!!! Contact Koshal',
                emiData,
              });
              break;
            }
            emiUpdateCount += emiUpdate[0];
            emiUpdatedData['EMI ' + emiNumber] = updatedData;
          }
        }
      }
      if (disbursementDate) {
        if (!dateRegex.test(disbursementDate))
          return kInvalidParamValue('Disbursement Date(YYYY-MM-DD)');
        let updatedData: any = {};
        updatedData.loan_disbursement_date = `${disbursementDate}T10:00:00.000Z`;
        const loanUpdate = await this.repository.updateRowData(
          updatedData,
          loanId,
        );
        loanUpdatedData.updatedData = updatedData;
      }
      const fullPayAD = loanData?.transactionData;
      if (fullPayAD.length > 0) {
        isAlreadyFADPlaced = true;
        if (fullPayAD[0].status == 'FAILED') isAlreadyFADFailed = true;
      }
      if (isAlreadyFADPlaced) {
        errorMessage.Error.push('Full Pay Auto Debit is Already Placed');
      }
      if (isAlreadyFADFailed) {
        errorMessage.Error.push('Full Pay Auto Debit is Already Failed');
      }
      if (fullPayADFail && !isAlreadyFADPlaced)
        errorMessage.Error.push('You Have to Place Auto Debit First');
      const emiData = loanData?.emiData;
      const submissionDate = new Date(emiData[emiData.length - 1]?.emi_date);
      // Placing Full Pay Auto Debit
      if (fullPayADPlace && !isAlreadyFADPlaced) {
        submissionDate.setDate(submissionDate.getDate() + 5);
        const body = {
          adminId: 37,
          emiId: -1,
          loanId,
          sendSMS: false,
          source: 'AUTOPAY',
          isCloseLoan: true,
          subSource: 'AUTODEBIT',
          submissionDate,
        };
        const fullPayAD = await this.sharedTransaction.funCreatePaymentOrder(
          body,
        );
        if (!fullPayAD || fullPayAD === k500Error)
          errorMessage.Error.push('Auto Debit Not Placed!!! Contact Koshal');
        if (fullPayAD.message) errorMessage.Error.push(fullPayAD);
        if (fullPayAD.transactionId)
          autoDebitUpdatedData.fullPayTransactionId = fullPayAD.transactionId;
      }
      // Failing Full Pay Auto Debit
      if (
        fullPayADFail &&
        fullPayAD &&
        isAlreadyFADPlaced &&
        !isAlreadyFADFailed
      ) {
        const subscriptionDate = new Date(fullPayAD.subscriptionDate);
        subscriptionDate.setDate(subscriptionDate.getDate() + 1);
        let option = { where: { id: fullPayAD[0].id } };
        let updatedData = {
          status: kFailed,
          completionDate: submissionDate.toISOString(),
          updatedAt: submissionDate,
          utr:
            Math.floor(Math.random() * (9999999999 - 1000000000 + 1)) +
            1000000000,
        };
        const adFailed = await this.transactionRepo.updateRowWhereData(
          updatedData,
          option,
        );
        if (adFailed == k500Error)
          errorMessage.Error.push('Failed to Fail the Auto Debit');
        // Added Legal Charges If AD Failed
        if (adFailed) {
          let emiToAddLegal = 0;
          emiData.forEach((ele) => {
            if (ele.payment_status == '0') emiToAddLegal = ele?.id;
          });
          const isLegalAdded = await this.emiRepo.updateRowData(
            { legalCharge: 5000, legalChargeGST: 900 },
            emiToAddLegal,
          );
          if (isLegalAdded == k500Error)
            errorMessage.Error.push('Legal Not Added After AD Failure');
          autoDebitUpdatedData.failInfo = 'Full Pay AD Failed and Legal Added';
        }
      }
      // Placing Auto Debit for EMI
      if (emiToPlaceAD) {
        const emi = emiData[emiToPlaceAD - 1];
        const emiId = emi.id;
        const emiDate = emi.emi_date;
        const data = {
          SYSTEM_ADMIN_ID,
          amount: emi.emi_amount,
          emiId,
          loanId,
          payment_date: null,
          sendSMS: false,
          source: kRazorpay,
          submissionDate: emiDate,
          subSource: kAutoDebit,
        };
        const isEmiADPlaced =
          await this.sharedTransaction.funCreatePaymentOrder(data);
        if (!isEmiADPlaced || isEmiADPlaced === k500Error)
          errorMessage.Error.push('Auto Debit Not Placed!!! Contact Koshal');
        if (isEmiADPlaced.message) errorMessage.Error.push(isEmiADPlaced);
        if (isEmiADPlaced.transactionId)
          autoDebitUpdatedData.emiTransactionId = isEmiADPlaced.transactionId;
      }
      // Failing Auto Debit for EMI
      if (emiToFailAD) {
        const emi = emiData[emiToFailAD - 1];
        const emiId = emi.id;
        let emiDate = emi.emi_date;
        const isADExist = await this.transactionRepo.getRowWhereData(['id'], {
          where: { emiId, subSource: kAutoDebit, subscriptionDate: emiDate },
        });
        if (!isADExist || isADExist === k500Error)
          errorMessage.Error.push(
            'Place AD for This EMI!!! Contact Koshal If Already Placed',
          );
        if (isADExist) {
          const id = isADExist.id;
          emiDate = new Date(emiDate);
          emiDate.setDate(emiDate.getDate() + 1);
          const failADForEmi = await this.transactionRepo.updateRowData(
            {
              status: kFailed,
              utr:
                Math.floor(Math.random() * (9999999999 - 1000000000 + 1)) +
                1000000000,
              completionDate: emiDate.toISOString(),
            },
            id,
          );
          if (failADForEmi === k500Error)
            errorMessage.Error.push('EMI AD not Failed!!! Contact Koshal');
          if (failADForEmi)
            autoDebitUpdatedData.failInfo = 'EMI Auto Debit Failed';
        }
      }
      return {
        emiUpdateStatus: `${emiUpdateCount} ${
          emiUpdateCount > 1 ? 'EMIs are' : 'EMI is'
        } Updated`,
        errorMessage,
        emiUpdatedData,
        loanUpdatedData,
        autoDebitUpdatedData,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
