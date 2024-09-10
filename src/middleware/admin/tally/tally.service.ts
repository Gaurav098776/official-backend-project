// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { LoanRepository } from 'src/repositories/loan.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { TypeService } from 'src/utils/type.service';
import {
  KICICIUPI,
  kAdmins,
  kApp,
  kAutoDebit,
  kCashfree,
  kCompleted,
  kDirectBankPay,
  kFullPay,
  kHelpContact,
  kNoDataFound,
  kRazorpay,
  kRefund,
  kRuppe,
  kSupportMail,
  kUpi,
  kWeb,
} from 'src/constants/strings';
import {
  CASHFREE_HEADERS_V2,
  kMonths,
  kRazorpayM1Auth,
  kRazorpayM2Auth,
  lcrFields,
  ledgerFields,
} from 'src/constants/objects';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { APIService } from 'src/utils/api.service';
import { CF_SETTLEMENT } from 'src/constants/network';
import { DateService } from 'src/utils/date.service';
import { SettlementRepository } from 'src/repositories/settlement.repository';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import {
  LCR_DATA_SEND_THRESHOLD_DAYS,
  NBFC_ADDRESS,
  NBFC_NAME,
  PAGE_LIMIT,
  PRODUCT_DESCRIPTION,
  SYSTEM_ADMIN_ID,
  gIsPROD,
  isUAT,
} from 'src/constants/globals';
import { registeredUsers } from 'src/entities/user.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { CryptService } from 'src/utils/crypt.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EmiEntity } from 'src/entities/emi.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { FileService } from 'src/utils/file.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { loanTransaction } from 'src/entities/loan.entity';
import {
  kLedgerStatementPath1,
  kLedgerStatementPath2,
  tLCRReportToManagementTemplate,
} from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { LCREntity } from 'src/entities/lcr.entity';
import { admin } from 'src/entities/admin.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import * as fs from 'fs';
@Injectable()
export class TallyService {
  constructor(
    private readonly loanRepo: LoanRepository,
    private readonly repository: SettlementRepository,
    private readonly disRepo: DisbursmentRepository,
    private readonly transRepo: TransactionRepository,
    private readonly refTranRepo: ReferralTransactionRepository,
    private readonly typeService: TypeService,
    private readonly apiService: APIService,
    private readonly dateService: DateService,
    private readonly cryptService: CryptService,
    private readonly commonSharedService: CommonSharedService,
    private readonly repoManager: RepositoryManager,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    // Third party
    private readonly razorService: RazorpoayService,
    // Util Service
    private readonly fileService: FileService,
    private readonly notificationService: SharedNotificationService,
  ) {}

  // Disbursement summary card
  async allDisbursementDetails(reqData) {
    try {
      const bankDetails = fs.readFileSync('bankDetails.json', 'utf8');
      const kTallyPayoutBanks = bankDetails ? JSON.parse(bankDetails) : {};
      const startDate = this.typeService
        .getGlobalDate(reqData?.startDate ?? new Date())
        .toJSON();
      const endDate = this.typeService
        .getGlobalDate(reqData?.endDate ?? new Date())
        .toJSON();
      const range = await this.typeService.getUTCDateRange(startDate, endDate);
      const options: any = {
        where: {
          loan_disbursement: '1',
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
      };
      const attributes = [
        'id',
        'netApprovedAmount',
        'charges',
        'processingFees',
        'stampFees',
        'loanFees',
        'insuranceDetails',
        'loan_disbursement',
        'loan_disbursement_date',
      ];
      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;

      //total loan approved amount
      const totalNetApprovedAmount = loanData.rows
        .filter((item) => item.loan_disbursement === '1')
        .reduce((total, item) => total + parseFloat(item.netApprovedAmount), 0);

      const totalAmount = this.typeService.amountNumberWithCommas(
        totalNetApprovedAmount,
      );

      let totalProcessingFees = 0;
      let totalStampFees = 0;
      let onlineConvinenceFees = 0;
      let totalDocumentCharges = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalInsuranceCharges = 0;

      for (const loans of loanData.rows) {
        try {
          let processPerc =
            loans?.loanFees -
            (loans?.charges?.insurance_fee || 0) -
            (loans?.charges?.doc_charge_amt || 0) -
            (loans?.charges?.gst_amt || 0);
          totalProcessingFees += processPerc;
          totalStampFees += loans?.stampFees;
          onlineConvinenceFees += loans?.charges?.insurance_fee || 0;
          totalDocumentCharges += loans?.charges?.doc_charge_amt;
          totalCGST += loans?.charges?.cgst_amt || 0;
          totalSGST += loans?.charges?.sgst_amt || 0;
          totalInsuranceCharges += loans?.insuranceDetails?.totalPremium || 0;
        } catch (error) {}
      }

      const totalCharges =
        totalProcessingFees +
        totalStampFees +
        onlineConvinenceFees +
        totalDocumentCharges +
        totalCGST +
        totalSGST +
        totalInsuranceCharges;

      const disOptions: any = {
        where: {
          status: { [Op.or]: ['processed', 'processing', 'queued'] },
          updatedAt: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
      };
      const disAttributes = ['id', 'amount', 'status', 'source'];
      const disData = await this.disRepo.getTableWhereData(
        disAttributes,
        disOptions,
      );
      if (disData === k500Error) return kInternalError;

      let totalICICI304 = 0;
      let totalICICI753 = 0;
      let totalRBL = 0;
      let totalPendingDisbursement = 0;
      for (const dis of disData) {
        if (dis.status === 'processed') {
          try {
            if (dis.source === 'RAZORPAY_M2') {
              totalICICI304 += dis.amount / 100;
            } else if (dis.source === kCashfree) {
              totalICICI753 += dis.amount / 100;
            } else {
              totalRBL += dis.amount / 100;
            }
          } catch (error) {}
        } else if (dis.status === 'processing' || dis.status === 'queued') {
          totalPendingDisbursement += dis.amount / 100;
        }
      }

      let totalDisbursedAmount = totalICICI304 + totalICICI753 + totalRBL;
      let totalCreditAmount = totalDisbursedAmount + totalCharges;

      const finalData: any = {
        totalLoan: loanData.count,
        titles: [
          {
            name: 'LOAN AMOUNT TO BORROWER',
            debit: kRuppe + totalAmount,
            credit: '-',
          },
          {
            name: 'CHARGES TO BORROWER',
            credit:
              kRuppe + this.typeService.amountNumberWithCommas(totalCharges),
            debit: '-',
            subtitles: [
              {
                name: 'PROCESSING FEES',
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(totalProcessingFees),
                debit: '-',
              },
              {
                name: 'STAMP DUTY',
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(totalStampFees),
                debit: '-',
              },
              {
                name: 'ONLINE CONVINENCE FEES',
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(onlineConvinenceFees),
                debit: '-',
              },
              {
                name: 'DOCUMENT CHARGES',
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(totalDocumentCharges),
                debit: '-',
              },
              //after migration sgst and cgst amount will come proper
              {
                name: 'SGST(9%)',
                credit:
                  kRuppe + this.typeService.amountNumberWithCommas(totalCGST),
                debit: '-',
              },
              {
                name: 'CGST(9%)',
                credit:
                  kRuppe + this.typeService.amountNumberWithCommas(totalSGST),
                debit: '-',
              },
              {
                name: 'INSURANCE CHARGES',
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(
                    totalInsuranceCharges,
                  ),
                debit: '-',
              },
            ],
          },
          {
            name: 'DISBURSED AMOUNT TO BORROWER',
            credit:
              kRuppe +
              this.typeService.amountNumberWithCommas(totalDisbursedAmount),
            debit: '-',
            subtitles: [
              {
                name: kTallyPayoutBanks['RAZORPAY_M2_DEFAULT_ACC'],
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(totalICICI304),
                debit: '-',
              },
              {
                name: kTallyPayoutBanks['ICICI_CONNECTED_51633_23f0101'],
                credit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(totalICICI753),
                debit: '-',
              },
              {
                name: kTallyPayoutBanks['RBL - bacc_JRtlJu0ZyNn17I'],
                credit:
                  kRuppe + this.typeService.amountNumberWithCommas(totalRBL),
                debit: '-',
              },
            ],
          },
          {
            name: 'TOTAL AMOUNT',
            debit: kRuppe + totalAmount,
            credit:
              kRuppe +
              this.typeService.amountNumberWithCommas(totalCreditAmount),
          },
          {
            name: 'LOAN DISBURSEMENT RESPONSE PENDING',
            debit:
              kRuppe +
              this.typeService.amountNumberWithCommas(totalPendingDisbursement),
            credit: '-',
          },
        ],
      };
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //repayment summary card
  async getRepaymentData(reqData) {
    try {
      const startDate = this.typeService
        .getGlobalDate(reqData?.startDate ?? new Date())
        .toJSON();
      const endDate = this.typeService
        .getGlobalDate(reqData?.endDate ?? new Date())
        .toJSON();
      const options: any = {
        where: {
          status: kCompleted,
          completionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          type: { [Op.ne]: kRefund },
        },
        order: [['createdAt', 'DESC']],
      };
      const attributes = [
        'id',
        'source',
        'subSource',
        'loanId',
        'paidAmount',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      const transData = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transData === k500Error) kInternalError;
      const loanIds = [...new Set(transData.map((el) => el.loanId))];

      let princAmount = 0;
      let intAmount = 0;
      let penaltAmount = 0;
      let razorpay1 = 0;
      let razorpay2 = 0;
      let cashfree = 0;
      let iciciDirect = 0;
      let iciciUpi = 0;
      for (const trans of transData) {
        princAmount += trans?.principalAmount || 0;
        intAmount += trans?.interestAmount || 0;
        penaltAmount += trans?.penaltyAmount || 0;
        if (
          trans.source === kRazorpay &&
          (trans.subSource === kApp || trans.subSource === kWeb)
        ) {
          razorpay1 += trans.paidAmount || 0;
        } else if (
          trans.source === kRazorpay &&
          trans.subSource === kAutoDebit
        ) {
          razorpay2 += trans.paidAmount || 0;
        } else if (trans.source === kCashfree) {
          cashfree += trans.paidAmount || 0;
        } else if (trans.source === KICICIUPI) {
          iciciUpi += trans.paidAmount || 0;
        } else if (
          trans.subSource === kDirectBankPay ||
          trans.subSource === 'DIRECT ICICI' ||
          trans.subSource === 'ICICI DIRECT - CASH' ||
          trans.subSource === 'ICICI MANUAL' ||
          trans.source === kUpi
        ) {
          iciciDirect += trans.paidAmount || 0;
        }
      }
      const paidAmount = transData.reduce(
        (total, item) => total + item.paidAmount,
        0,
      );
      const totalAmount = this.typeService.amountNumberWithCommas(paidAmount);
      const amountRecieved = this.typeService.amountNumberWithCommas(
        razorpay1 + razorpay2 + cashfree + iciciDirect + iciciUpi,
      );

      const finalData: any = {
        totalLoan: loanIds.length,
        titles: [
          {
            name: 'TOTAL REPAID AMOUNT FROM BORROWER',
            debit: '-',
            credit: kRuppe + totalAmount,
            subtitles: [
              {
                name: 'PRINCIPAL',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(princAmount),
                credit: '-',
              },
              {
                name: 'INTEREST',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(intAmount),
                credit: '-',
              },
              {
                name: 'PENALTY',
                debit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(penaltAmount),
                credit: '-',
              },
              //right now field for round-off is not available so whenever it will be added we'll add it
              {
                name: 'ROUND-OFF',
                debit: '-',
                credit: '-',
              },
            ],
          },
          {
            name: 'AMOUNT RECIEVED IN',
            debit: kRuppe + amountRecieved,
            credit: '-',
            subtitles: [
              {
                name: 'RAZORPAY-1',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(razorpay1),
                credit: '-',
              },
              {
                name: 'RAZORPAY-2',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(razorpay2),
                credit: '-',
              },
              {
                name: kCashfree,
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(cashfree),
                credit: '-',
              },
              {
                name: 'BANK TRANSFER[ICICI BANK - 30400]',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(iciciDirect),
                credit: '-',
              },
              {
                name: 'UPI [ICICI Bank - 753]',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(iciciUpi),
                credit: '-',
              },
            ],
          },
          {
            name: 'TOTAL NET IN-FLOW',
            debit: kRuppe + amountRecieved,
            credit: kRuppe + totalAmount,
          },
        ],
      };
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //sync settlements
  async syncSettlements(reqData) {
    // Query preparation
    const startDate = reqData?.startDate
      ? new Date(reqData?.startDate)
      : new Date();
    const endDate = reqData?.endDate ? new Date(reqData?.endDate) : new Date();

    //Razorpay
    const params = {
      count: 1000,
      year: 0,
      month: 0,
      day: 0,
    };

    let razorpayData1: any = [];
    let razorpayData2: any = [];

    for (
      let currentDate = startDate;
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();

      params.year = year;
      params.month = month;
      params.day = day;

      // Fetch settlement details from razorpay - 1
      const razorpay1: any = await this.razorService.fetchSettlements(
        params,
        kRazorpayM1Auth,
      );
      razorpayData1.push(...razorpay1);
      // Fetch settlement details from razorpay - 2
      const razorpay2: any = await this.razorService.fetchSettlements(
        params,
        kRazorpayM2Auth,
      );
      razorpayData2.push(...razorpay2);
    }
    const data: any = {};

    if (CASHFREE_HEADERS_V2['X-Client-Id']) {
      // Cashfree
      const headers = CASHFREE_HEADERS_V2;
      const rangeData = await this.dateService.utcDateRange(startDate, endDate);
      const body = {
        pagination: { limit: 100 },
        filters: {
          start_date: rangeData.minRange,
          end_date: rangeData.maxRange,
        },
      };
      const cashfree = await this.apiService.post(
        CF_SETTLEMENT,
        body,
        headers,
        null,
      );
      if (!cashfree?.message) data.cashfree = cashfree;
    }

    if (!razorpayData1?.message) data.razorpay1 = razorpayData1;
    if (!razorpayData2?.message) data.razorpay2 = razorpayData2;
    const preparedData = await this.prepareSettlementData(data);
    return preparedData;
  }

  private async prepareSettlementData(data) {
    try {
      const razorpay1Settlements = [];
      data?.razorpay1?.forEach((item) => {
        try {
          razorpay1Settlements.push({
            settlementId: item?.settlement_id,
            status: item?.settled === true ? 1 : null,
            paymentGateway: 0,
            bankAccount: 1,
            amount: item?.paymentAmount
              ? parseFloat((item.paymentAmount / 100).toFixed(2))
              : 0,
            adjustment: item?.refundAmount
              ? parseFloat((item.refundAmount / 100).toFixed(2))
              : 0,
            fees: item?.fees ? parseFloat((item.fees / 100).toFixed(2)) : 0,
            tax: item?.tax ? parseFloat((item.tax / 100).toFixed(2)) : 0,
            utr: item?.utr,
            settlementDate: new Date(item?.settled_at * 1000),
            response: JSON.stringify(item),
          });
        } catch (error) {}
      });
      const razorpay2Settlements = [];
      data?.razorpay2?.forEach((item) => {
        try {
          razorpay2Settlements.push({
            settlementId: item?.settlement_id,
            status: item?.settled === true ? 1 : null,
            paymentGateway: 1,
            bankAccount: 1,
            amount: item?.paymentAmount
              ? parseFloat((item.paymentAmount / 100).toFixed(2))
              : 0,
            adjustment: item?.refundAmount
              ? parseFloat((item.refundAmount / 100).toFixed(2))
              : 0,
            fees: item?.fees ? parseFloat((item.fees / 100).toFixed(2)) : 0,
            tax: item?.tax ? parseFloat((item.tax / 100).toFixed(2)) : 0,
            utr: item?.utr,
            settlementDate: new Date(item?.settled_at * 1000),
            response: JSON.stringify(item),
          });
        } catch (error) {}
      });
      // Cashfree
      const cashfreeSettlements = [];
      data?.cashfree?.data?.forEach((item) => {
        try {
          const settlementCharge = parseFloat(
            item?.settlement_charge?.toFixed(2) ?? 0,
          );
          const settlementTax = parseFloat(
            item?.settlement_tax?.toFixed(2) ?? 0,
          );
          const serviceCharge = parseFloat(
            item?.service_charge?.toFixed(2) ?? 0,
          );
          const serviceTax = parseFloat(item?.service_tax?.toFixed(2) ?? 0);
          cashfreeSettlements.push({
            settlementId: item?.cf_settlement_id.toString(),
            status: item?.status === 'PAID' ? 1 : null,
            paymentGateway: 2,
            bankAccount: 1,
            amount: item?.amount_settled
              ? parseFloat(item.amount_settled.toFixed(2))
              : 0,
            adjustment: item?.adjustment
              ? parseFloat(item.adjustment.toFixed(2))
              : 0,
            fees: serviceCharge + settlementCharge,
            tax: serviceTax + settlementTax,
            utr: item?.settlement_utr,
            settlementDate: item?.settlement_date,
            response: JSON.stringify(item),
          });
        } catch (error) {}
      });
      const allSettlements = [
        ...razorpay1Settlements,
        ...razorpay2Settlements,
        ...cashfreeSettlements,
      ];
      const attributes = ['id', 'settlementId'];
      const options: any = {
        where: { status: null },
      };
      const settledData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (settledData === k500Error) return kInternalError;
      for (let index = 0; index < allSettlements.length; index++) {
        try {
          const creationData = allSettlements[index];
          const filter = settledData.find(
            (f) => f.settlementId === creationData.settlementId,
          );
          if (filter)
            await this.repository.updateRowData(creationData, filter.id);
          await this.repository.createRawData(creationData);
        } catch (error) {}
      }

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //wallet summary card
  async getWalletSettlementDetails(reqData) {
    try {
      const bankDetails = fs.readFileSync('bankDetails.json', 'utf8');
      const kTallyPayoutBanks = bankDetails ? JSON.parse(bankDetails) : {};
      const startDate = reqData?.startDate ?? new Date();
      const endDate = reqData?.endDate ?? new Date();
      const range = this.typeService.getUTCDateRange(startDate, endDate);

      const attributes = [
        'adjustment',
        'amount',
        'paymentGateway',
        'tax',
        'fees',
        'bankAccount',
        'settlementDate',
      ];
      const options: any = {
        where: {
          status: 1,
          settlementDate: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
        order: [['id', 'DESC']],
      };
      const settledData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (settledData === k500Error) return kInternalError;

      const refAttributes: any = [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'amount'],
      ];
      const refOptions: any = {
        where: {
          subscriptionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          status: 1,
        },
      };
      const referralData = await this.refTranRepo.getTableWhereData(
        refAttributes,
        refOptions,
      );
      if (referralData === k500Error) return kInternalError;

      let r1Amount = 0;
      let r1Gst = 0;
      let r1Charges = 0;
      let r1Adjustment = 0;
      let r2Amount = 0;
      let r2Gst = 0;
      let r2Charges = 0;
      let r2Adjustment = 0;
      let cashAmount = 0;
      let cashGst = 0;
      let cashCharges = 0;
      let cfAdjustment = 0;
      for (const data of settledData) {
        if (data?.paymentGateway === 0) {
          r1Amount += data?.amount;
          r1Gst += data?.tax;
          r1Charges += data?.fees;
          r1Adjustment += data?.adjustment ?? 0;
        } else if (data?.paymentGateway === 1) {
          r2Amount += data?.amount;
          r2Gst += data?.tax;
          r2Charges += data?.fees;
          r2Adjustment += data?.adjustment ?? 0;
        } else if (data?.paymentGateway === 2) {
          cashAmount += data?.amount;
          cashGst += data?.tax;
          cashCharges += data?.fees;
          cfAdjustment += data?.adjustment ?? 0;
        }
      }

      const razorpay1Total = this.typeService.amountNumberWithCommas(
        Math.abs(r1Amount + r1Charges + r1Gst - Math.abs(r1Adjustment)),
      );
      const razorpay2Total = this.typeService.amountNumberWithCommas(
        Math.abs(r2Amount + r2Charges + r2Gst - Math.abs(r2Adjustment)),
      );
      const cashfreeTotal = this.typeService.amountNumberWithCommas(
        Math.abs(cashAmount + cashCharges + cashGst - Math.abs(cfAdjustment)),
      );
      const refExpense = this.typeService.amountNumberWithCommas(
        referralData[0]?.amount / 100,
      );
      const totalAmount = this.typeService.amountNumberWithCommas(
        r1Amount +
          r1Charges +
          r1Gst +
          r2Amount +
          r2Charges +
          r2Gst +
          cashAmount +
          cashCharges +
          cashGst -
          Math.abs(cfAdjustment) -
          Math.abs(r1Adjustment) -
          Math.abs(r2Adjustment),
      );

      const finalData: any = {
        titles: [
          {
            name: 'RAZORPAY - 1',
            debit: '-',
            credit: kRuppe + razorpay1Total,
            subtitles: [
              {
                name: 'RAZORPAY SETTLEMENT',
                debit: '-',
                credit: kRuppe + razorpay1Total,
              },
              {
                name: 'RAZORPAY GST',
                debit: kRuppe + this.typeService.amountNumberWithCommas(r1Gst),
                credit: '-',
              },
              {
                name: 'RAZORPAY CHARGES',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(r1Charges),
                credit: '-',
              },
              {
                name: 'RAZORPAY REFUND',
                debit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(
                    Math.abs(r1Adjustment),
                  ),
                credit: '-',
              },
              {
                name: 'AMOUNT RECIEVED IN',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(r1Amount),
                credit: '-',
                section: this.mapWalletSectionData(r1Amount),
              },
            ],
          },
          {
            name: 'RAZORPAY - 2',
            debit: '-',
            credit: kRuppe + razorpay2Total,
            subtitles: [
              {
                name: 'RAZORPAY SETTLEMENT',
                debit: '-',
                credit: kRuppe + razorpay2Total,
              },
              {
                name: 'RAZORPAY GST',
                debit: kRuppe + this.typeService.amountNumberWithCommas(r2Gst),
                credit: '-',
              },
              {
                name: 'RAZORPAY CHARGES',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(r2Charges),
                credit: '-',
              },
              {
                name: 'RAZORPAY REFUND',
                debit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(
                    Math.abs(r2Adjustment),
                  ),
                credit: '-',
              },
              {
                name: 'AMOUNT RECIEVED IN',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(r2Amount),
                credit: '-',
                section: this.mapWalletSectionData(r2Amount),
              },
            ],
          },
          {
            name: kCashfree,
            debit: '-',
            credit: kRuppe + cashfreeTotal,
            subtitles: [
              {
                name: 'CASHFREE SETTLEMENT',
                debit: '-',
                credit: kRuppe + cashfreeTotal,
              },
              {
                name: 'CASHFREE GST',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(cashGst),
                credit: '-',
              },
              {
                name: 'CASHFREE CHARGES',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(cashCharges),
                credit: '-',
              },
              {
                name: `${kCashfree} REFUND`,
                debit:
                  kRuppe +
                  this.typeService.amountNumberWithCommas(
                    Math.abs(cfAdjustment),
                  ),
                credit: '-',
              },
              {
                name: 'AMOUNT RECIEVED IN',
                debit:
                  kRuppe + this.typeService.amountNumberWithCommas(cashAmount),
                credit: '-',
                section: this.mapWalletSectionData(cashAmount),
              },
            ],
          },
          {
            name: 'TOTAL',
            debit: kRuppe + totalAmount,
            credit: kRuppe + totalAmount,
          },
        ],
        expenseReferral: {
          debit: `${kRuppe}${refExpense}`,
          credit: '-',
        },
      };
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private mapWalletSectionData(passAmount = null) {
    const selectedSection = [];
    const bankDetails = fs.readFileSync('bankDetails.json', 'utf8');
    const kTallyPayoutBanks = bankDetails ? JSON.parse(bankDetails) : {};
    if (EnvConfig.nbfc.nbfcType == '0') {
      selectedSection.push(
        {
          name: kTallyPayoutBanks['RAZORPAY_M2_DEFAULT_ACC'],
          debit: '-',
          credit: '-',
        },
        {
          name: kTallyPayoutBanks['ICICI BANK - 753'],
          debit: kRuppe + this.typeService.amountNumberWithCommas(passAmount),
          credit: '-',
        },
        {
          name: kTallyPayoutBanks['RBL - bacc_JRtlJu0ZyNn17I'],
          debit: '-',
          credit: '-',
        },
      );
    } else if (EnvConfig.nbfc.nbfcType == '1') {
      selectedSection.push({
        name: kTallyPayoutBanks['YES_BANK_01'],
        debit: '-',
        credit: '-',
      });
    }
    return selectedSection;
  }

  //account ledger
  async getLoanDisbursementDetails(reqData) {
    try {
      const startDate = this.typeService
        .getGlobalDate(reqData?.startDate ?? new Date())
        .toJSON();
      const endDate = this.typeService
        .getGlobalDate(reqData?.endDate ?? new Date())
        .toJSON();
      const download = reqData?.download == 'true' ? true : false;
      const page = reqData?.page;
      const loanStatus = reqData?.loanStatus;
      let searchText = reqData?.searchText ?? '';

      const disInclude: any = {
        model: disbursementEntity,
        attributes: [
          'id',
          'name',
          'contact',
          'bank_name',
          'ifsc',
          'account_number',
          'utr',
          'amount',
        ],
        where: { status: 'processed' },
      };
      const options: any = {
        include: [disInclude],
        order: [['id', 'DESC']],
      };
      if (loanStatus === 'Open') {
        options.where = {
          loanStatus: 'Active',
          loan_disbursement: '1',
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      } else if (loanStatus === 'Close') {
        options.where = {
          loanStatus: 'Complete',
          isNotBalanced: 0,
          loanCompletionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      } else if (loanStatus === 'Closed but not balanced') {
        options.where = {
          isNotBalanced: 1,
          loanCompletionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        };
      } else {
        options.where = {
          loanStatus: {
            [Op.or]: ['Active', 'Complete'],
          },
          loan_disbursement: '1',
          [Op.or]: [
            {
              loan_disbursement_date: {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
              },
            },
            {
              loanCompletionDate: {
                [Op.gte]: startDate,
                [Op.lte]: endDate,
              },
            },
          ],
        };
      }
      //search filter
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') options.where.id = +restOfString;
        else {
          if (!isNaN(searchText)) {
            disInclude.where = { contact: { [Op.iRegexp]: searchText } };
          } else disInclude.where = { name: { [Op.iRegexp]: searchText } };
        }
      }
      if (download != true) {
        options.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes = [
        'id',
        'userId',
        'loanStatus',
        'netApprovedAmount',
        'isNotBalanced',
        'loanCompletionDate',
        'loan_disbursement_date',
      ];
      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;

      const prepareList = [];
      for (let index = 0; index < loanData.rows.length; index++) {
        try {
          const ele = loanData.rows[index];
          const disData = ele.disbursementData ?? [];
          let status = 'Close';
          if (ele?.loanStatus === 'Active') status = 'Open';
          else if (ele?.loanStatus === 'Complete' && ele?.isNotBalanced === 1)
            status = 'Closed but not balanced';

          for (const item of disData) {
            const temp = {
              userId: ele?.userId,
              'Loan ID': ele?.id,
              'User name': item?.name,
              'Phone number': item?.contact,
              'Bank name': item?.bank_name,
              IFSC: item?.ifsc,
              'Account number': item?.account_number,
              'Approved amount': +(+ele?.netApprovedAmount).toFixed(),
              'Disbursed amount': +((item?.amount ?? 0) / 100).toFixed(),
              UTR: item?.utr,
              'Disbursed date': ele?.loan_disbursement_date
                ? this.typeService.getDateFormatted(ele?.loan_disbursement_date)
                : '-',
              'Closed date': ele?.loanCompletionDate
                ? this.typeService.getDateFormatted(ele?.loanCompletionDate)
                : '-',
              'Loan status': status,
            };
            prepareList.push(temp);
          }
        } catch (error) {}
      }
      return { counts: loanData.count, rows: prepareList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getLedgerLoanDetails(reqData) {
    const loanId = reqData?.loanId;
    if (!loanId) return kParamMissing('loanId');
    const isPdf = reqData?.pdfDownload ?? false;

    const userInclude = {
      model: registeredUsers,
      attributes: ['fullName', 'phone', 'email'],
      include: {
        model: KYCEntity,
        attributes: [
          'aadhaarResponse',
          'aadhaarAddress',
          'aadhaarAddressResponse',
        ],
      },
    };
    const emiInclude: SequelOptions = {
      model: EmiEntity,
      attributes: [
        'id',
        'emi_date',
        'principalCovered',
        'interestCalculate',
        'payment_done_date',
        'emiNumber',
        'pay_type',
        'payment_status',
        'penalty',
        'fullPayPrincipal',
        'fullPayInterest',
        'fullPayPenalty',
        'partPaymentPenaltyAmount',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
      ],
    };
    const transInclude: SequelOptions = {
      model: TransactionEntity,
      attributes: [
        'paidAmount',
        'principalAmount',
        'interestAmount',
        'completionDate',
        'emiId',
        'type',
        'utr',
        'source',
        'subSource',
      ],
      where: { status: kCompleted },
      required: false,
    };
    const disInclude: any = {
      model: disbursementEntity,
      attributes: ['amount', 'utr', 'source'],
    };
    const options: any = {
      where: { id: loanId },
      include: [userInclude, disInclude, emiInclude, transInclude],
    };
    const attributes = [
      'id',
      'purposeId',
      'netApprovedAmount',
      'stampFees',
      'processingFees',
      'loanFees',
      'charges',
      'loan_disbursement_date',
      'approvedDuration',
      'interestRate',
      'insuranceDetails',
      'loanCompletionDate',
    ];
    const loanData = await this.loanRepo.getRowWhereData(attributes, options);
    if (loanData === k500Error) return kInternalError;

    const data = await this.prePareLedgerLoanData(loanData, isPdf);
    return data;
  }

  // Ledger report -> Total steps -> #04
  private async prePareLedgerLoanData(loanData, isPdf) {
    const processingFees =
      loanData?.loanFees -
      (loanData?.charges?.insurance_fee || 0) -
      (loanData?.charges?.doc_charge_amt || 0) -
      (loanData?.charges?.gst_amt || 0);

    const nbfcLogo = EnvConfig.url.nbfcLogo;
    const rbiRegisterationNo = EnvConfig.nbfc.nbfcRegistrationNumber;
    const cinNo = EnvConfig.nbfc.nbfcCINNumber;
    const nbfcAddress = EnvConfig.nbfc.nbfcAddress;
    const helpContact = EnvConfig.number.helpContact;
    const infoEmail = EnvConfig.mail.suppportMail;
    // #01 -> Basic details
    const basicDetails: any = await this.prepareBasicDetails(
      loanData,
      processingFees,
    );

    // #02 -> Disbursement details
    let disbursementList = await this.prepareDisbursementDetails(loanData);

    // #03 -> Repayment details
    const repaymentList = this.prepareRepaymentDetails(loanData);

    // #04 -> Waiveoff details
    const waiveAmount = loanData?.emiData.reduce((acc, el) => {
      return (
        acc +
        (el?.waiver ?? 0) +
        (el?.paid_waiver ?? 0) +
        (el?.unpaid_waiver ?? 0)
      );
    }, 0);

    const today = this.typeService.getGlobalDate(new Date());
    const data = {
      basicDetails,
      startDate: this.typeService.getDateFormatted(
        loanData?.loan_disbursement_date,
      ),
      endDate: this.typeService.getDateFormated(
        loanData?.loanCompletionDate ? loanData?.loanCompletionDate : today,
      ),
      waiveAmount,
      disDetails: [...disbursementList, ...repaymentList],
      nbfcLogo,
      rbiRegisterationNo,
      cinNo,
      nbfcAddress,
      helpContact,
      infoEmail,
    };

    if (isPdf) {
      const page1 = await this.fileService.hbsHandlebars(
        kLedgerStatementPath1,
        { ...data, ledgerFields },
      );
      if (page1 == k500Error) return page1;
      const page2 = await this.fileService.hbsHandlebars(
        kLedgerStatementPath2,
        { ...data, ledgerFields },
      );
      if (page2 === k500Error) return kInternalError;
      const preparedData = [page1, page2];
      //Individual PDF page creation
      let currentPage;
      const nextPages: string[] = [];
      for (let index = 0; index < preparedData.length; index++) {
        const pageData = preparedData[index];
        const pdfPath = await this.fileService.dataToPDF(pageData);
        if (pdfPath == k500Error) return kInternalError;
        if (index == 0) currentPage = pdfPath.toString();
        else nextPages.push(pdfPath.toString());
      }
      const ledgerPath = await this.fileService.mergeMultiplePDF(
        nextPages,
        currentPage,
      );
      if (ledgerPath == k500Error) return kInternalError;
      const pdfUrl = await this.fileService.uploadFile(ledgerPath);
      await this.fileService.removeFiles([...nextPages, currentPage]);
      if (!pdfUrl || pdfUrl === k500Error) return '';
      return pdfUrl;
    }

    return data;
  }

  // Basic details for ledger -> Total steps -> #01
  private async prepareBasicDetails(loanData, processingFees) {
    const {
      id,
      purposeId,
      charges,
      stampFees,
      insuranceDetails,
      disbursementData,
      registeredUsers,
      interestRate,
      loan_disbursement_date,
      loanCompletionDate,
      netApprovedAmount,
    } = loanData;

    const purposeData: any = await this.commonSharedService.getLoanPurpose(
      purposeId,
    );

    const loanCharges =
      stampFees +
      processingFees +
      (charges?.insurance_fee || 0) +
      (charges?.doc_charge_amt || 0) +
      charges?.gst_amt +
      (insuranceDetails?.totalPremium || 0);

    let pinCode = '-';
    try {
      const response = JSON.parse(registeredUsers?.kycData?.aadhaarResponse);
      pinCode = response.zip ?? response.pincode ?? '-';
    } catch (error) {}

    const userAddress = this.typeService.getAadhaarAddress(
      registeredUsers?.kycData,
    );

    const data = {
      id,
      nbfcName: NBFC_NAME,
      nbfcAddress: NBFC_ADDRESS,
      helpContact: kHelpContact,
      nbfcEmail: kSupportMail,
      name: registeredUsers?.fullName ?? '-',
      phone: this.cryptService.decryptPhone(registeredUsers?.phone) ?? '-',
      email: registeredUsers?.email ?? '-',
      productDescription: PRODUCT_DESCRIPTION,
      subProduct: purposeData?.purposeName ?? '-',
      loanAmount: netApprovedAmount
        ? this.typeService.numberRoundWithCommas(netApprovedAmount)
        : '-',
      disbursedAmount: disbursementData[0]?.amount
        ? this.typeService.amountNumberWithCommas(
            disbursementData[0]?.amount / 100,
          )
        : '-',
      loanCharges: this.typeService.amountNumberWithCommas(loanCharges) ?? 0,
      tenure: loanData?.approvedDuration + ' days',
      interestRate: +interestRate + '%',
      accountOpen: loan_disbursement_date
        ? this.typeService.getDateFormatted(loan_disbursement_date)
        : '-',
      accountClose: loanCompletionDate
        ? this.typeService.getDateFormatted(loanCompletionDate)
        : '-',
      address: userAddress?.address ?? '-',
      city: userAddress?.dist ?? '-',
      pinCode,
    };
    return data;
  }

  // Disbursement for ledger -> Total steps -> #11
  private async prepareDisbursementDetails(loanData) {
    // Fallback -> GST is available but CGST & SGST is missing in Database
    const charges = loanData?.charges ?? {};
    if (charges?.gst_amt && !charges?.cgst_amt) {
      const cgst_amt = parseFloat((charges?.gst_amt / 2).toFixed(2));
      loanData.charges.cgst_amt = cgst_amt;
      loanData.charges.sgst_amt = cgst_amt;
    }

    let balance = loanData?.netApprovedAmount;
    let totalDeduction = 0;
    const disbursementCharges = [];
    const txnDate = loanData?.loan_disbursement_date;
    const txnDateInfo = this.dateService.dateToReadableFormat(txnDate);
    const txnDateStr = txnDateInfo.readableStr;

    // #01 -> Approved loan amount
    disbursementCharges.push({
      'TXN DATE': txnDateStr,
      PARTICULARS: 'LOAN AMOUNT TO BORROWER',
      PLATFORM: '-',
      UTR: '-',
      DR: '-',
      CR: this.typeService.amountNumberWithCommas(loanData?.netApprovedAmount),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #02 -> Stamp duty
    const stampCharges = loanData?.stampFees ?? 0;
    totalDeduction += stampCharges;
    balance -= stampCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'STAMP DUTY',
      DR: this.typeService.amountNumberWithCommas(stampCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #03 -> Processing fees
    const processingFees = parseFloat(
      ((+loanData.netApprovedAmount * loanData?.processingFees) / 100).toFixed(
        2,
      ),
    );
    totalDeduction += processingFees;
    balance -= processingFees;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'PROCESSING FEES',
      DR: this.typeService.amountNumberWithCommas(processingFees),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #04 -> Document charges
    const docCharges = loanData?.charges?.doc_charge_amt ?? 0;
    balance -= docCharges;
    totalDeduction += docCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'DOCUMENT CHARGES',
      DR: this.typeService.amountNumberWithCommas(docCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #05 -> Online convenience charges
    const onlineConvenienceCharges = loanData?.charges?.insurance_fee ?? 0;
    balance -= onlineConvenienceCharges;
    totalDeduction += onlineConvenienceCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'ONLINE CONVINENCE FEES',
      DR: this.typeService.amountNumberWithCommas(onlineConvenienceCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #06 -> Risk assessment charges
    const riskAssessmentCharge = loanData?.charges?.risk_assessment_charge ?? 0;
    totalDeduction += riskAssessmentCharge;
    balance -= riskAssessmentCharge;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'RISK ASSESSMENT FEES',
      DR: this.typeService.amountNumberWithCommas(riskAssessmentCharge),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #07 -> CGST charges
    const cGSTCharges = loanData?.charges?.cgst_amt ?? 0;
    balance -= cGSTCharges;
    totalDeduction += cGSTCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'CGST(9%)',
      DR: this.typeService.amountNumberWithCommas(cGSTCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #08 -> SGST charges
    const sGSTCharges = loanData?.charges?.sgst_amt ?? 0;
    balance -= sGSTCharges;
    totalDeduction += sGSTCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'SGST(9%)',
      DR: this.typeService.amountNumberWithCommas(sGSTCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #09 -> Insurance premium charges
    const insuranceCharges = loanData?.insuranceDetails?.totalPremium ?? 0;
    balance -= insuranceCharges;
    totalDeduction += insuranceCharges;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'INSURANCE CHARGES',
      DR: this.typeService.amountNumberWithCommas(insuranceCharges),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    // #10 -> Disbursed amount
    const disbursementAmount = +loanData.netApprovedAmount - totalDeduction;
    balance -= disbursementAmount;
    disbursementCharges.push({
      CR: '-',
      'TXN DATE': txnDateStr,
      PARTICULARS: 'DISBURSEMENT AMOUNT TO BORROWER',
      DR: this.typeService.amountNumberWithCommas(disbursementAmount),
      BALANCE: this.typeService.amountNumberWithCommas(balance),
    });

    return disbursementCharges;
  }

  // Repayment for ledger -> Total steps -> #03
  private prepareRepaymentDetails(loanData: loanTransaction) {
    const emiList = loanData.emiData ?? [];
    const transList = loanData.transactionData ?? [];
    const targetList = [];
    let balance = 0;

    // #01 -> Prepare EMIs
    for (let index = 0; index < emiList.length; index++) {
      const emiData = emiList[index];
      const isPaid = emiData.payment_status === '1';
      const emiDate = this.typeService.getGlobalDate(
        new Date(emiData.emi_date),
      );
      const paidDate = isPaid
        ? this.typeService.getGlobalDate(new Date(emiData.payment_done_date))
        : null;
      let totalDueAmount = emiData.principalCovered + emiData.interestCalculate;
      // +
      // (emiData.penalty ?? 0) +
      // (emiData.partPaymentPenaltyAmount ?? 0);
      const payType = emiData.pay_type;
      const isFullPay = payType === kFullPay;
      if (isFullPay) {
        totalDueAmount = emiData.principalCovered + emiData.fullPayInterest;
        // +
        // emiData.fullPayPenalty;
      }

      let txnDate;
      if (paidDate && paidDate.getTime() < emiDate.getTime())
        txnDate = paidDate.toJSON();
      else txnDate = emiDate.toJSON();

      balance += totalDueAmount;
      balance = parseFloat(balance.toFixed(2));

      // Add data
      const txnDateInfo = this.dateService.dateToReadableFormat(txnDate);
      targetList.push({
        'TXN DATE': txnDateInfo.readableStr,
        PARTICULARS: `EMI ${emiData.emiNumber} DUE AMOUNT`,
        PLATFORM: '-',
        UTR: '-',
        DR: this.typeService.amountNumberWithCommas(totalDueAmount),
        CR: '-',
        BALANCE:
          (balance < 0 ? '-' : '') +
          this.typeService.amountNumberWithCommas(Math.abs(balance)),
      });

      // #03 -> Prepare fullpayment
      if (isFullPay === true) {
        const paidDateInfo = this.dateService.dateToReadableFormat(paidDate);
        const fullPaidAmount =
          emiData.fullPayPrincipal +
          emiData.fullPayInterest +
          emiData.fullPayPenalty;
        balance -= fullPaidAmount;
        balance = parseFloat(balance.toFixed(2));
        targetList.push({
          'TXN DATE': paidDateInfo.readableStr,
          PARTICULARS: `EMI ${emiData.emiNumber} REPAYMENT`,
          PLATFORM: '-',
          UTR: '-',
          CR: this.typeService.amountNumberWithCommas(totalDueAmount),
          DR: '-',
          BALANCE:
            (balance < 0 ? '-' : '') +
            this.typeService.amountNumberWithCommas(Math.abs(balance)),
        });
      }
    }

    // #03 -> Prepare repayments
    for (let i = 0; i < transList.length; i++) {
      const transData = transList[i];
      if (!transData) continue;
      if (transData.type === kFullPay) continue;
      const paidAmount =
        transData.type === kRefund
          ? transData.paidAmount
          : (transData.principalAmount ?? 0) + (transData.interestAmount ?? 0);
      //transData.paidAmount ?? 0;
      const paidDate = this.typeService.getGlobalDate(
        new Date(transData.completionDate),
      );
      const paidDateInfo = this.dateService.dateToReadableFormat(paidDate);

      balance -= paidAmount;
      balance = parseFloat(balance.toFixed(2));
      targetList.push({
        'TXN DATE': paidDateInfo.readableStr,
        PARTICULARS:
          transData.type === kRefund ? 'REPAYMENT REFUND' : `EMI REPAYMENT`,
        PLATFORM: '-',
        UTR: '-',
        CR:
          transData.type === kRefund
            ? '-'
            : this.typeService.amountNumberWithCommas(Math.abs(paidAmount)),
        DR:
          transData.type === kRefund
            ? this.typeService.amountNumberWithCommas(Math.abs(paidAmount))
            : '-',
        BALANCE:
          (balance < 0 ? '-' : '') +
          this.typeService.amountNumberWithCommas(Math.abs(balance)),
      });
    }

    // Sort all the records date wise
    balance = 0;
    const sortedList = targetList.sort(
      (a, b) =>
        this.dateService.readableStrToDate(a['TXN DATE']).getTime() -
        this.dateService.readableStrToDate(b['TXN DATE']).getTime(),
    );
    sortedList.forEach((el) => {
      const isReceived = el['DR'] === '-';
      if (isReceived) balance -= +el['CR'].replace(/,/g, '');
      else balance += +el['DR'].replace(/,/g, '');
      balance = parseFloat(balance.toFixed(2));
      el['BALANCE'] =
        (balance < 0 ? '-' : '') +
        this.typeService.amountNumberWithCommas(Math.abs(balance));
    });

    // Round off
    if (balance <= 2 && balance >= -2) {
      const roundOff = Math.abs(balance);
      const beforeBalance = balance;
      balance = 0;

      // Total
      sortedList.push({
        'TXN DATE': 'ROUND OFF',
        PARTICULARS: '',
        PLATFORM: '',
        UTR: '',
        DR: beforeBalance < 0 ? roundOff : ' ',
        CR: beforeBalance > 0 ? roundOff : ' ',
        BALANCE: this.typeService.amountNumberWithCommas(balance),
      });
    }

    // Total
    sortedList.push({
      'TXN DATE': 'TOTAL',
      PARTICULARS: '',
      PLATFORM: '',
      UTR: '',
      DR: ' ',
      CR: ' ',
      BALANCE:
        (balance < 0 ? '-' : '') +
        this.typeService.amountNumberWithCommas(Math.abs(balance)),
    });

    // Closing balance
    sortedList.push({
      'TXN DATE': 'CLOSING BALANCE',
      PARTICULARS: '',
      PLATFORM: '',
      UTR: '',
      DR: ' ',
      CR: ' ',
      BALANCE:
        (balance < 0 ? '-' : '') +
        this.typeService.amountNumberWithCommas(Math.abs(balance)),
    });

    return sortedList;
  }

  async generateBulkLedgers(reqData) {
    // Params validation
    let loanIds = reqData.loanIds;
    if (!loanIds) return kParamMissing('loanIds');
    loanIds = [...new Set(loanIds)];

    const finalizedData = {};
    for (let index = 0; index < loanIds.length; index++) {
      const loanId = loanIds[index];
      const legderResponse = await this.getLedgerLoanDetails({
        loanId,
        pdfDownload: 'true',
      });
      finalizedData[loanId] = legderResponse;
    }

    return finalizedData;
  }

  async generateLCRReport(reqData) {
    let startDate: string | Date = reqData?.hqlaDate
      ? new Date(reqData.hqlaDate)
      : new Date();
    startDate = this.typeService.getGlobalDate(startDate).toJSON();
    let endDate: Date | string = new Date(startDate);
    endDate.setDate(endDate.getDate() + 29);
    endDate = endDate.toJSON();
    const adminId: number | string = reqData?.adminId;

    // update hqla and other details
    if (adminId) {
      const outflow: number = reqData?.outflow;
      if (!outflow) return kParamMissing('Outflow Amount');
      const hqlaData = reqData?.hqlaData ?? [];
      let bankBalance = 0;
      let marketableSecurity = 0;
      const total = hqlaData.reduce(
        (acc, ele) => {
          if (ele.type == 'bank') acc.bankTotal += ele?.balance ?? 0;
          if (ele.type == 'marketableSecurities')
            acc.mSTotal += ele?.balance ?? 0;
          return acc;
        },
        { bankTotal: 0, mSTotal: 0 },
      );
      bankBalance += total.bankTotal;
      marketableSecurity += total.mSTotal;

      const inflowData = await this.repoManager.getRowWhereData(
        LCREntity,
        ['inflow', 'stressedInflow'],
        { where: { date: startDate } },
      );
      if (inflowData == k500Error) throw new Error();

      // if provided date data does not exist then create new data for that date
      let inflowDetails;
      if (!inflowData) {
        inflowDetails = await this.getInflowData(startDate, endDate);
        if (inflowDetails == k500Error) throw new Error();
      }

      const hqla = +marketableSecurity + +bankBalance;
      const stressedOutflow = Math.round(+outflow * 1.15);
      const value = Math.min(
        inflowDetails
          ? +inflowDetails.stressedInflow
          : +inflowData.stressedInflow,
        Math.round(stressedOutflow * 0.75),
      );
      const totalNetOutflow = stressedOutflow - value;
      const LCR = +(+(hqla / totalNetOutflow) * 100).toFixed(2);

      const updateData: any = {
        date: startDate,
        bankBalance: +bankBalance,
        marketableSecurity: +marketableSecurity,
        outflow: +outflow,
        stressedOutflow: +stressedOutflow,
        totalNetOutflow: +totalNetOutflow,
        LCR: +LCR,
        adminId: +adminId,
        payload: hqlaData,
      };

      // create new entry for provided date with all details
      if (inflowDetails) {
        updateData.inflow = inflowDetails.inflow;
        updateData.stressedInflow = inflowDetails.stressedInflow;

        const createdData = await this.repoManager.createRowData(
          LCREntity,
          updateData,
        );
        if (createdData == k500Error) throw new Error();
        return true;
      }
      // otherwise data already exist for this date, update other details for provided date
      const updatedData = await this.repoManager.updateRowWhereData(
        LCREntity,
        updateData,
        {
          where: { date: startDate },
        },
      );
      if (updatedData == k500Error) throw new Error();
      return true;
    }

    // create new entry of inflow data in cron
    const data: any = await this.getInflowData(startDate, endDate);
    if (data == k500Error) throw new Error();
    const createdData = await this.repoManager.createRowData(LCREntity, data);
    if (createdData == k500Error) throw new Error();
    return true;
  }

  async getInflowData(startDate: string, endDate: string) {
    const query = `SELECT SUM("a"."principalCovered" + "a"."interestCalculate") as "totalAmount"
    FROM public."EmiEntities" as "a"
    JOIN public."loanTransactions" as "b" ON "a"."loanId" = "b"."id"
    WHERE "a"."emi_date" >= '${startDate}' AND "a"."emi_date" <= '${endDate}'
    AND (("a"."payment_status" = '0') OR ("a"."payment_done_date" > '${startDate}')) 
    AND "b"."loan_disbursement_date" < '${startDate}'`;

    const response = await this.repoManager.injectRawQuery(EmiEntity, query);
    if (!response || response == k500Error) throw new Error();

    const inflow = +response[0].totalAmount;
    const stressedInflow = Math.round(inflow * 0.75);

    return {
      date: startDate,
      inflow: +inflow,
      stressedInflow: +stressedInflow,
      adminId: SYSTEM_ADMIN_ID,
    };
  }

  async getLCRInfo(reqData) {
    let startDate = reqData?.startDate ?? new Date();
    let endDate = reqData?.endDate ?? new Date();
    let lcrDate: Date;

    startDate = this.typeService.getGlobalDate(startDate);
    endDate = this.typeService.getGlobalDate(endDate);

    const sendMail = reqData?.sendMail ?? false;
    const dailyMail = reqData?.dailyMail ?? false;
    if (sendMail) {
      const currentDate = new Date();
      const startOfCurrentMonth: any = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endOfPreviousMonth: any = new Date(startOfCurrentMonth - 1);
      const startOfPreviousMonth = new Date(
        endOfPreviousMonth.getFullYear(),
        endOfPreviousMonth.getMonth(),
        1,
      );
      startDate = this.typeService.getGlobalDate(startOfPreviousMonth);
      endDate = this.typeService.getGlobalDate(endOfPreviousMonth);
    }
    if (dailyMail) {
      // let currentDate = new Date();
      let currentDate = startDate;

      //Get data of 2 days prior if it is from dailyMail
      currentDate.setDate(
        currentDate.getDate() - (LCR_DATA_SEND_THRESHOLD_DAYS - 1),
      );
      currentDate = this.dateService.getGlobalDate(currentDate);

      lcrDate = currentDate;
      startDate = currentDate.toJSON();
      endDate = currentDate.toJSON();
    }
    const pageSize = reqData?.pageSize ?? 10;
    const page = reqData?.page ?? 1;
    const offset = (page - 1) * pageSize;

    const attributes = [
      'date',
      'bankBalance',
      'marketableSecurity',
      'outflow',
      'stressedOutflow',
      'inflow',
      'stressedInflow',
      'totalNetOutflow',
      'LCR',
      'adminId',
      'payload',
    ];

    const options: any = {
      where: {
        date: { [Op.and]: { [Op.gte]: startDate, [Op.lte]: endDate } },
      },
      order: [['date', 'DESC']],
    };
    if (!sendMail && !dailyMail && !reqData.download) {
      options.offset = offset;
      options.limit = pageSize;
    }

    const response = await this.repoManager.getTableCountWhereData(
      LCREntity,
      attributes,
      options,
    );
    if (response.count == 0 && !dailyMail) kNoDataFound;
    if (response == k500Error) throw new Error();

    // for daily mail if data is not present then create data
    if (response.count == 0 && dailyMail) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 29);
      endDate = endDate.toJSON();

      const inflowData: any = await this.getInflowData(startDate, endDate);
      if (inflowData == k500Error) return { rows: [] };
      const createdData = await this.repoManager.createRowData(
        LCREntity,
        inflowData,
      );
      if (createdData == k500Error) return { rows: [] };
      const admin = await this.commonSharedService.getAdminData(
        SYSTEM_ADMIN_ID,
      );
      const rows = [
        {
          Date: this.dateService.dateToReadableFormat(inflowData.date)
            .readableStr,
          'Bank Balance': inflowData?.bankBalance ?? '-',
          'Marketable Securities': inflowData?.marketableSecurity ?? '-',
          'Total HQLA': inflowData?.totalHqla ?? '-',
          'Expected Cash Inflow': inflowData?.inflow ?? '-',
          'Stressed Cash Inflow': inflowData?.stressedInflow ?? '-',
          'Expected Cash Outflow': inflowData?.outflow ?? '-',
          'Stressed Cash Outflow': inflowData?.stressedOutflow ?? '-',
          'Total Net Cash Outflows': inflowData?.totalNetOutflow ?? '-',
          'LCR Percentage': inflowData?.LCR ?? '-',
          'Updated By': admin?.fullName ?? '-',
        },
      ];
      return {
        rows,
        currentDate: startDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      };
    }

    const adminData = [];
    for (let i = 0; i < response.rows.length; i++) {
      const data = response.rows[i];
      const admin = await this.commonSharedService.getAdminData(data.adminId);
      adminData.push(admin?.fullName ? admin.fullName : '-');
    }

    const rows = [];
    for (let i = 0; i < response.rows.length; i++) {
      const data = response.rows[i];
      const admin = adminData[i];
      const totalHqla =
        (data?.bankBalance ?? 0) + (data?.marketableSecurity ?? 0);
      const structuredData = {
        ['Date']: this.dateService.dateToReadableFormat(data.date).readableStr,
        ['Bank Balance']: data?.bankBalance ?? '-',
        ['hqlaData']: data?.payload ?? [],
        ['Marketable Securities']: data?.marketableSecurity ?? '-',
        ['Total HQLA']: totalHqla,
        ['Expected Cash Inflow']: data?.inflow ?? '-',
        ['Stressed Cash Inflow']: data?.stressedInflow ?? '-',
        ['Expected Cash Outflow']: data?.outflow ?? '-',
        ['Stressed Cash Outflow']: data?.stressedOutflow ?? '-',
        ['Total Net Cash Outflows']: data?.totalNetOutflow ?? '-',
        ['LCR Percentage']: +data?.LCR ?? '-',
        ['Updated By']: admin ?? '-',
      };
      rows.push(structuredData);
    }

    let url: any;
    const rawExcelData = {
      sheets: ['local-reports'],
      data: [rows],
      sheetName: 'LCR Report.xlsx',
      needFindTuneKey: false,
    };
    if (reqData.download) {
      url = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      const updatedData = { downloadUrl: url, status: '1' };
      const downloadId = reqData?.downloadId;
      if (downloadId)
        await this.reportHistoryRepo.updateRowData(
          updatedData,
          reqData.downloadId,
        );
      return { fileUrl: url };
    }
    if (sendMail) {
      const currentYear = new Date(startDate).getFullYear();
      const monthAndYear =
        kMonths[new Date(startDate).getMonth() - 1] + currentYear;
      url = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      return await this.sendMailToManagement(rows, url, monthAndYear);
    }
    return {
      rows,
      count: response.count,
      lcrDate: lcrDate
        ? lcrDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : startDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
    };
  }

  async sendMailToManagement(data: any, url: string, monthAndYear: string) {
    const subject = 'LCR Report';
    const nbfcLogo = EnvConfig.url.nbfcLogo;
    const nbfcName = EnvConfig.nbfc.nbfcName;
    const nbfcRegisterationNumber = EnvConfig.nbfc.nbfcRegistrationNumber;
    const nbfcAddress = EnvConfig.nbfc.nbfcAddress;
    const reportMonth = monthAndYear;
    let email = EnvConfig.mail.techSupportMail;
    const finalData = {
      rows: data,
    };
    const hbsData = await this.fileService.hbsHandlebars(
      tLCRReportToManagementTemplate,
      {
        ...finalData,
        lcrFields,
        nbfcLogo,
        nbfcName,
        nbfcRegisterationNumber,
        nbfcAddress,
        reportMonth,
      },
    );
    if (hbsData == k500Error) throw new Error();
    const qa = process.env.QA_EMAILS;
    const management = process.env.MANAGEMENT_EMAILS;
    let ccEmails: any = `${management}`;
    if (!gIsPROD) {
      email = kAdmins[1];
      ccEmails = kAdmins[2];
    }
    if (isUAT) ccEmails = qa;

    ccEmails = ccEmails.split(',');
    return await this.notificationService.sendMailFromSendinBlue(
      email,
      subject,
      hbsData,
      null,
      ccEmails,
      [{ path: url, fileName: 'LCR REPORT' }],
    );
  }
}
