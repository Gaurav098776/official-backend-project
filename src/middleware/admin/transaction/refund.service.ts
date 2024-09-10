// Imports
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import {
  PAGE_LIMIT,
  RefundSMSId,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kAutoDebit,
  kCashfree,
  kFailed,
  kInitiated,
  kRazorpay,
  kSomthinfWentWrong,
  kYouHaveAccess,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { NotificationService } from 'src/thirdParty/notificationService/notification.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { SystemTraceEntity } from 'src/entities/system_trace.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { DateService } from 'src/utils/date.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { kLspMsg91Templates, kMsg91Templates } from 'src/constants/objects';

@Injectable()
export class RefundService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly typeService: TypeService,
    private readonly adminRepo: AdminRepository,
    private readonly emiRepo: EMIRepository,
    private readonly loanRepo: LoanRepository,
    private readonly cryptService: CryptService,
    private readonly cashFreeService: CashFreeService,
    private readonly razorpoayService: RazorpoayService,
    private readonly notificationService: NotificationService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly iciciService: ICICIThirdParty,
    private readonly fileService: FileService,
    private readonly dateService: DateService,
    // Database
    private readonly repoManager: RepositoryManager,
  ) {}

  //#region pendding
  async getRefundablesData(
    startDate,
    endDate,
    adminId,
    loanId = -1,
    download = 'false',
  ) {
    try {
      // Validation -> Authorization
      const access = await this.adminRepo.checkHasAccess(adminId, 'refund');
      if (access !== true) return access;
      // Gather data -> Transactions
      const transData = await this.getDateTransaction(
        startDate,
        endDate,
        loanId,
        adminId,
      );
      if (transData?.message) return transData;
      // Gather data -> Loan and emis
      const emiData = await this.getLoanEMIData(transData?.loanIdList);
      if (emiData?.message) return emiData;
      // Calculation -> Excessive amount
      const prePareData = this.prePareAmountOfRefund(transData, emiData);
      if (!prePareData || prePareData?.message) return prePareData;

      const filteredData = await this.findUserNameForRefund(prePareData);
      if (filteredData?.message) return filteredData;
      // Validation -> Authorization
      const edit = await this.adminRepo.checkHasAccess(adminId, 'refund', 2);
      let isRefund = false;
      if (edit === true) isRefund = true;

      // Excel download
      if (download == 'true') {
        const preparedData = filteredData.map((item) => ({
          'loan ID': item?.loanId,
          Name: item?.name,
          Email: item?.email,
          'Paid Amount': item?.paidAmount,
          'Refund Amount': item?.amount,
          'Total emi amount': item?.emiAmount,
          'Loan Status': item?.userType,
        }));

        const path = 'Refund.xlsx';
        const rawExcelData = {
          sheets: ['Refund'],
          data: [preparedData],
          sheetName: path,
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );
        if (excelResponse?.message) return excelResponse;
        const fileURL = await this.fileService.uploadFile(
          excelResponse?.filePath,
          'report',
          'xlsx',
        );
        if (fileURL.message) return fileURL;
        return { fileURL };
      }

      return { isRefund, filteredData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get date rage paid transaction and loanIdList
  private async getDateTransaction(
    startDate,
    endDate,
    loanId = -1,
    adminId = SYSTEM_ADMIN_ID,
  ): Promise<any> {
    try {
      startDate = this.typeService.getGlobalDate(startDate).toJSON();
      endDate = this.typeService.getGlobalDate(endDate).toJSON();
      const refundStatus = ['INITIALIZED'];
      // if (adminId != SYSTEM_ADMIN_ID) refundStatus.push('FAILED');
      const options: any = {
        where: {
          [Op.or]: [
            { status: 'COMPLETED' },
            { status: refundStatus, type: 'REFUND' },
          ],
          completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
        },
        group: ['loanId'],
      };
      const att = ['loanId'];
      const transactions =
        loanId === -1
          ? await this.repository.getTableWhereData(att, options)
          : [{ loanId }];
      if (!transactions || transactions === k500Error) return kInternalError;
      const loanIdList = [...new Set(transactions.map((tran) => tran.loanId))];
      const attTran: any = [
        'loanId',
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'amount'],
      ];
      options.where.loanId = loanIdList;
      delete options.where.completionDate;
      const paidAmountList = await this.repository.getTableWhereData(
        attTran,
        options,
      );
      if (!paidAmountList || paidAmountList === k500Error)
        return kInternalError;
      return { loanIdList, paidAmountList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get base loanId get EMI Paid or not data
  private async getLoanEMIData(loanIdList) {
    try {
      const options = {
        where: {
          loanId: loanIdList,
          [Op.or]: [
            { status: 'COMPLETED' },
            { status: ['INITIALIZED', 'FAILED'], type: 'REFUND' },
          ],
        },
        group: ['emiId'],
      };
      const att1 = ['emiId'];
      const emiData = await this.repository.getTableWhereData(att1, options);
      if (!emiData || emiData === k500Error) return kInternalError;
      const emiIdList = [...new Set(emiData.map((tran) => tran.emiId))];
      const date = this.typeService.getGlobalDate(new Date());
      const loanInc = {
        model: loanTransaction,
        attributes: ['id', 'penaltyCharges'],
      };
      const option = {
        where: {
          loanId: loanIdList,
          [Op.or]: [
            { id: emiIdList },
            { payment_status: '1' },
            { payment_status: '0', payment_due_status: '1' },
            {
              [Op.and]: [
                { payment_status: '0' },
                { emi_date: { [Op.lte]: date.toJSON() } },
              ],
            },
          ],
        },
        include: [loanInc],
        order: [['id', 'DESC']],
      };
      const att: any = [
        'id',
        'loanId',
        'emi_date',
        'payment_done_date',
        'principalCovered',
        'payment_due_status',
        'interestCalculate',
        'penalty',
        'regInterestAmount',
        'bounceCharge',
        'dpdAmount',
        'legalCharge',
        'gstOnBounceCharge',
        'penaltyChargesGST',
        'legalChargeGST',
        'partPaymentPenaltyAmount',
        'fullPayInterest',
        'pay_type',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
        // Full pay
        'sgstForClosureCharge',
        'cgstForClosureCharge',
        'forClosureAmount',
      ];
      const result = await this.emiRepo.getTableWhereData(att, option);
      if (!result || result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prePare amount
  private prePareAmountOfRefund(transactionData, emiData): any {
    try {
      const list = [];
      const filteredData = [];
      const paidAmountList = transactionData?.paidAmountList;
      paidAmountList.forEach((ele) => {
        try {
          const filter = emiData.filter((f) => f.loanId === ele.loanId);
          let emiAmount = 0;
          let waiver = 0;
          const emiList = [];
          filter.forEach((emi) => {
            try {
              const tempAmount: any = this.caclitionOfEMIamount(emi);
              if (tempAmount?.message) return tempAmount;
              emiList.push({
                emiId: emi.id,
                amount: tempAmount.amount,
                pay_type: emi.pay_type,
              });
              emiAmount += tempAmount.amount;
              waiver += tempAmount.waiver;
            } catch (error) {}
          });

          const amount = ele.amount - emiAmount;
          // Make sure total emi amount will be there just to be safe
          if (amount > 10 && emiAmount) {
            const find = filter.find((f) => f.payment_due_status == '1');
            list.push(ele.loanId);
            filteredData.push({
              emiList,
              loanId: ele.loanId,
              emiAmount,
              paidAmount: ele.amount,
              amount,
              waiver,
              userType: find ? 'Delay' : 'On-Time',
            });
          }
        } catch (error) {}
      });
      return { list, filteredData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region caclution of emi amount
  private caclitionOfEMIamount(emi) {
    let amount = 0;
    let waiver = 0;
    try {
      const modification =
        emi?.loan?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
      const emiDate = new Date(emi.emi_date).getTime();
      let doneDate;
      if (emi.payment_done_date && emi.pay_type === 'FULLPAY')
        doneDate = new Date(emi.payment_done_date).getTime();
      if (doneDate && doneDate < emiDate) amount += emi.fullPayInterest;
      else amount += emi.interestCalculate;
      amount += emi.principalCovered;
      amount += emi.regInterestAmount ?? 0;
      amount += emi.dpdAmount ?? 0;
      amount += emi.penaltyChargesGST ?? 0;
      amount += emi.legalCharge ?? 0;
      amount += emi.legalChargeGST ?? 0;
      if (!modification) {
        amount += emi.penalty ?? 0;
        amount += emi.partPaymentPenaltyAmount ?? 0;
      } else {
        amount += emi.bounceCharge ?? 0;
        amount += emi.gstOnBounceCharge ?? 0;
      }
      // Fullpay
      amount += emi.forClosureAmount ?? 0;
      amount += emi.sgstForClosureCharge ?? 0;
      amount += emi.cgstForClosureCharge ?? 0;

      waiver += emi.waiver ?? 0;
      waiver += emi.paid_waiver ?? 0;
      waiver += emi.unpaid_waiver ?? 0;
      // amount += waiver;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
    return { amount, waiver };
  }
  //#endregion

  //#region find user name for refund
  private async findUserNameForRefund(prePareData) {
    try {
      const userModel = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email'],
      };
      const tranModel: any = {
        model: TransactionEntity,
        attributes: ['id', 'paidAmount', 'emiId', 'status', 'type'],
        where: {
          [Op.or]: [
            { status: 'COMPLETED' },
            { status: ['INITIALIZED', 'FAILED'], type: 'REFUND' },
          ],
        },
        required: false,
      };
      const options = {
        where: { id: prePareData.list },
        include: [userModel, tranModel],
      };
      const att = ['id', 'appType'];
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      prePareData.filteredData.forEach((ele) => {
        try {
          const find = result.find((f) => f.id === ele.loanId);
          ele.name = find?.registeredUsers?.fullName ?? '-';
          ele.email = find?.registeredUsers?.email ?? '-';
          ele.userId = find?.registeredUsers?.id ?? '-';
          ele.appType = find?.appType;
          const tranData = find?.transactionData ?? [];
          ele.tranData = tranData;
          const checkRefund = tranData.find(
            (t) => t?.type == 'REFUND' && t?.status == 'FAILED',
          );
          ele.failedRefund = !checkRefund ? false : true;

          for (let index = 0; index < ele.emiList.length; index++) {
            try {
              const emi = ele.emiList[index];
              let sumEMI = tranData
                .filter((f) => f.emiId === emi.emiId && f.status !== 'FAILED')
                .reduce((sum, a) => sum + a.paidAmount, 0);
              const find = tranData.find((f) => f.type === 'FULLPAY');
              if (find && emi?.pay_type == 'FULLPAY') sumEMI += find.paidAmount;
              const diff = sumEMI - emi.amount;
              if (diff > 10) {
                ele.emiId = emi.emiId;
                break;
              }
            } catch (error) {}
          }
          if (!ele.emiId) {
            const amountArray: any = [
              ...new Set(ele.emiList.map((f) => f.amount)),
            ];
            const closest = amountArray.reduce(function (prev, curr) {
              return Math.abs(curr - ele.amount) < Math.abs(prev - ele.amount)
                ? curr
                : prev;
            });
            const find = ele.emiList.find((f) => f.amount === closest);
            if (find) ele.emiId = find.emiId;
          }
          if (!ele.emiId) ele.emiId = ele.emiList[0].emiId;

          ele.amount = Math.floor(ele.amount);
          ele.paidAmount = Math.floor(ele.paidAmount);
          ele.emiAmount = Math.floor(ele.emiAmount);
          delete ele.emiList;
        } catch (error) {}
      });
      return prePareData.filteredData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get all refunded data
  async getAllRefundedData(
    startDate,
    endDate,
    page,
    status,
    download = 'false',
    skipPageLimit = 'false',
  ) {
    try {
      startDate = this.typeService.getGlobalDate(startDate).toJSON();
      endDate = await this.typeService.getGlobalDate(endDate).toJSON();
      const att = [
        'id',
        'type',
        'paidAmount',
        'loanId',
        'source',
        'status',
        'completionDate',
      ];
      if (status == '2') att.push('response');
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone'],
      };
      const options: any = {
        where: {
          type: 'REFUND',
          completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
        },
        include: [userInclude],
        order: [['completionDate', 'DESC']],
      };

      if (status == '0') options.where.status = 'INITIALIZED';
      else if (status == '1') options.where.status = 'COMPLETED';
      else if (status == '2') options.where.status = 'FAILED';

      if (download != 'true' && skipPageLimit != 'true') {
        const skip1 = (page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.offset = skip1;
        options.limit = 1 * PAGE_LIMIT;
      }

      const result = await this.repository.getTableWhereDataWithCounts(
        att,
        options,
      );
      if (!result || result == k500Error) return kInternalError;
      let prepareData: any[] = [];
      result.rows.forEach((element) => {
        try {
          if (status == '2') {
            const res = JSON.parse(element?.response);
            element.description =
              res?.data?.error?.description ?? res?.data?.message ?? '-';
            delete element?.response;
          }
        } catch (error) {}

        if (element.userData && element.userData.phone) {
          element.userData.phone = this.cryptService.decryptPhone(
            element.userData?.phone,
          );
        }
        let readableDate: any;
        if (element?.completionDate) {
          readableDate = this.dateService.dateToReadableFormat(
            element.completionDate,
          );
        }
        if (download == 'true') {
          const newData = {
            'Loan ID': element?.loanId,
            Name: element?.userData?.fullName ?? '-',
            Phone: element?.userData?.phone ?? '-',
            'Paid Amount': element?.paidAmount,
            Source: element?.source,
            Status: element?.status,
            Description: element?.description ?? '-',
            'Refund Date': readableDate.readableStr ?? '-',
          };
          prepareData.push(newData);
        }
      });

      if (download == 'true') {
        const path = 'Refund.xlsx';
        const rawExcelData = {
          sheets: ['Refund'],
          data: [prepareData],
          sheetName: path,
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );
        if (excelResponse?.message) return excelResponse;

        const fileURL = await this.fileService.uploadFile(
          excelResponse?.filePath,
          'report',
          'xlsx',
        );
        if (fileURL.message) return fileURL;
        return { fileURL };
      }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check And Place Refund
  async checkAndPlaceRefund(body) {
    try {
      // Validation -> Parameters
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');

      const result = await this.getRefundablesData(null, null, adminId, loanId);
      // Validation -> Gathered data
      if (result?.message) return result;
      if (!result?.isRefund) return k422ErrorMessage(kYouHaveAccess);

      // Initiate -> Refund process
      const refund = result?.filteredData[0];
      if (refund?.loanId) {
        // Validation -> Applicable refund amount and transaction
        const tranData = await this.getTransactionDataFroRfund(refund.loanId);
        if (!tranData || tranData?.message) return tranData;

        // Calculation -> Refund amount
        const prePareData = this.prePareRefundAmount(refund, tranData, adminId);
        if (prePareData?.message) return prePareData;
        // Iteration -> Refund initiate
        const sessionId: string = uuidv4();
        for (let index = 0; index < prePareData.length; index++) {
          const ele = prePareData[index];
          ele.loanId = loanId;

          // Create -> System trace row data
          const systemCreationData = {
            sessionId,
            type: 7,
            loanId,
            userId: ele.rawData?.userId,
            uniqueId: `T${7}=L${loanId}=E${ele.rawData.emiId ?? -1}`,
          };
          // Hit -> Query
          const createdData = await this.repoManager.createRowData(
            SystemTraceEntity,
            systemCreationData,
          );
          if (createdData === k500Error) continue;

          await this.refundInitialized(ele);
        }
        return prePareData;
      } else return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get transaction data
  private async getTransactionDataFroRfund(loanId): Promise<any> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - 150);
      const att = [
        'id',
        'paidAmount',
        'transactionId',
        'utr',
        'type',
        'status',
        'source',
        'subSource',
        'emiId',
        'response',
      ];
      const options = {
        where: {
          completionDate: { [Op.gte]: date },
          [Op.or]: [
            { status: 'COMPLETED', type: { [Op.ne]: 'REFUND' } },
            { status: 'INITIALIZED', type: 'REFUND' },
          ],
          loanId,
        },
      };
      const tranData = await this.repository.getTableWhereData(att, options);
      if (!tranData || tranData == k500Error) return kInternalError;
      const tran = [];
      tranData.forEach((ele) => {
        try {
          const source = ele.source;
          const subSource = ele.subSource;
          if (
            source === kRazorpay ||
            (source === kCashfree && subSource != kAutoDebit) ||
            source === 'ICICI_UPI'
          ) {
            tran.push(ele);
          }
        } catch (error) {}
      });
      return tran;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prePare refund amount for place
  private prePareRefundAmount(refund, tranData, adminId): any {
    try {
      let amount = refund.amount;
      const emiId = refund.emiId;
      if (amount > 0) {
        // Prevention -> Duplication
        const find = tranData.find((f) => f.status === kInitiated);
        if (find) return k422ErrorMessage(kSomthinfWentWrong);

        let amountSameAsEMITran;
        let refundTOSameEMITran;
        let refundTOTakeAnyTran;
        let nonICICIUPITrans;

        // RPC 1.1.0 -> ICICI UPI refund should be last priority for refund for settlement profit
        tranData = tranData.sort((a, b) => {
          if (a.source === 'ICICI_UPI') return 1;
          if (b.source === 'ICICI_UPI') return -1;
          return 0;
        });

        tranData.forEach((ele) => {
          try {
            if (
              ele.paidAmount < amount + 1 &&
              ele.paidAmount > amount - 1 &&
              ele.emiId == emiId
            ) {
              amountSameAsEMITran = ele;
            }
            if (ele.emiId == emiId && ele.paidAmount > amount - 1)
              refundTOSameEMITran = ele;
            if (ele.paidAmount > amount - 1) refundTOTakeAnyTran = ele;
            // Non auto debit transaction with least priority of ICICI_UPI
            if (
              ele.paidAmount > amount - 1 &&
              ele.source != 'ICICI_UPI' &&
              !nonICICIUPITrans
            ) {
              nonICICIUPITrans = ele;
            }
          } catch (error) {}
        });
        const refundTran = amountSameAsEMITran ?? refundTOSameEMITran;
        const refundArray = [];
        const useTran = [];

        // Priority -> #01 Non ICICI_UPI
        if (nonICICIUPITrans && amount > 0) {
          const data: any = this.prePareRefundObject(
            refund,
            nonICICIUPITrans,
            amount,
          );
          if (data?.message) return data;
          data.rawData.adminId = adminId;
          refundArray.push(data);
          amount += data.rawData.paidAmount;
          useTran.push(nonICICIUPITrans.id);
        }

        /// this for emi amount to amount or geter than paid amount of same emi
        if (refundTran && amount > 0) {
          const data: any = this.prePareRefundObject(
            refund,
            refundTran,
            amount,
          );
          if (data?.message) return data;
          data.rawData.adminId = adminId;
          refundArray.push(data);
          amount += data.rawData.paidAmount;
          useTran.push(refundTran.id);
        }
        /// check same emi
        if (amount > 0) {
          const filter = tranData.filter((f) => f.emiId === emiId);
          filter.forEach((tran) => {
            try {
              if (!useTran.includes(tran.id) && amount > 0) {
                let tempAmount = tran.paidAmount;
                if (tempAmount > amount) tempAmount = amount;
                const data: any = this.prePareRefundObject(
                  refund,
                  tran,
                  tempAmount,
                );
                if (!data?.message) {
                  data.rawData.adminId = adminId;
                  refundArray.push(data);
                  amount += data.rawData.paidAmount;
                  useTran.push(tran.id);
                }
              }
            } catch (error) {}
          });
        }

        /// check is refund any other transaction
        if (amount > 0 && refundTOTakeAnyTran) {
          if (!useTran.includes(refundTOTakeAnyTran.id)) {
            const data: any = this.prePareRefundObject(
              refund,
              refundTOTakeAnyTran,
              amount,
            );
            if (data?.message) return data;
            data.rawData.adminId = adminId;
            refundArray.push(data);
            amount += data.rawData.paidAmount;
            useTran.push(refundTOTakeAnyTran.id);
          }
        }

        /// now check other emis
        if (amount > 0) {
          const filter = tranData.filter((f) => f.emiId != emiId);
          filter.forEach((tran) => {
            try {
              if (!useTran.includes(tran.id) && amount > 0) {
                let tempAmount = tran.paidAmount;
                if (tempAmount > amount) tempAmount = amount;
                const data: any = this.prePareRefundObject(
                  refund,
                  tran,
                  tempAmount,
                );
                if (!data?.message) {
                  data.rawData.adminId = adminId;
                  refundArray.push(data);
                  amount += data.rawData.paidAmount;
                  useTran.push(tran.id);
                }
              }
            } catch (error) {}
          });
        }

        if (amount > 0) {
          const data: any = this.prePareRefundObject(refund, null, amount);
          if (!data?.message) {
            data.rawData.adminId = adminId;
            refundArray.push(data);
            amount += data.rawData.paidAmount;
          }
        }
        return refundArray;
      } else return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private prePareRefundObject(refund, refundTran, amount) {
    try {
      const emiId = refund.emiId;
      let transactionId = 'RE-' + emiId + '-' + refund.loanId + '-A-' + amount;
      const source = refundTran?.source ?? 'RAZORPAY';
      const subSource = refundTran?.subSource ?? 'WEB';
      if (refundTran?.id) transactionId += '-' + refundTran?.id;
      if (refund?.failedRefund == true && refund?.tranData) {
        try {
          let failedRefund = refund?.tranData.filter(
            (f) => f?.status == kFailed && f?.type == 'REFUND',
          );
          failedRefund = failedRefund.sort((a, b) => b?.id - a?.id)[0];
          const lastFailId = failedRefund?.id;
          if (lastFailId) transactionId += '-' + lastFailId;
        } catch (error) {}
      }
      const rawData = {
        transactionId,
        paidAmount: -amount,
        status: 'INITIALIZED',
        type: 'REFUND',
        userId: refund.userId,
        name: refund.name,
        email: refund.email,
        loanId: refund.loanId,
        appType: refund?.appType,
        emiId,
        source,
        subSource,
        completionDate: this.typeService.getGlobalDate(new Date()).toJSON(),
        response: refundTran?.response,
      };
      return { refundTran, rawData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region refund  INITIALIZED
  private async refundInitialized(prePareData) {
    try {
      const rawData = prePareData?.rawData;
      const loanId = prePareData?.loanId;
      const ICICIPayRes = rawData?.response;
      if (rawData?.source === 'ICICI_UPI') delete rawData?.response;
      const create = await this.repository.createRowData(rawData);
      if (!create || create === k500Error) return kInternalError;
      // this is for tesing
      // const autoDebit = {
      //   transactionId: 'order_KxcfUAP0FfbQNm',
      //   utr: 'pay_KxcfUGX1tL0uk3',
      //   source: 'RAZORPAY',
      //   subSource: 'AUTODEBIT',
      // };
      // const cashFreeApp = {
      //   transactionId: 'CFORDER1676958720487',
      //   utr: '305281235541',
      //   source: 'CASHFREE',
      //   subSource: 'APP',
      // };
      // const razorpayAPP = {
      //   transactionId: 'order_IvrIJXDEqyJqxo',
      //   utr: 'pay_KuVAT7LIm7Tp3e',
      //   source: 'RAZORPAY',
      //   subSource: 'APP',
      // };
      // const cashFreeAutoDebit = {
      //   transactionId: 'CFORDER1676958720487',
      //   utr: '305281235541',
      //   source: 'CASHFREE',
      //   subSource: 'AUTODEBIT',
      // };
      // const refundTran = cashFreeAutoDebit;
      // const amount = 1;

      const refundTran = prePareData?.refundTran;
      const amount = -1 * rawData.paidAmount;
      const transactionId = rawData?.transactionId;
      const orderId = refundTran?.transactionId;
      let utr = refundTran?.utr;
      if ((utr ?? '').includes('DMY')) utr = utr.split('DMY')[0];
      let source = refundTran?.source;
      let subSource = refundTran?.subSource ?? '';

      let response;
      if (source === 'CASHFREE' && subSource != 'AUTODEBIT') {
        response = await this.cashFreeService.refundAmount(
          orderId,
          amount,
          transactionId,
        );
      } else if (source === 'RAZORPAY')
        response = await this.razorpoayService.refundAmount(
          utr,
          amount,
          subSource == 'AUTODEBIT',
        );
      else if (source === 'ICICI_UPI') {
        response = await this.iciciService.Refund({
          ICICIPayRes,
          transactionId,
          orderId,
          amount,
          loanId,
        });
      } else {
        const loanId = rawData.loanId;
        const customer = await this.getUserDataForCashfree(loanId, amount);
        if (!customer || customer?.message) return customer;
        response = await this.cashFreeService.payOut(customer);
        subSource = 'CASHFREE';
        source = 'CASHFREE';
        // const customer = await this.getUserDataForRazorpayX(loanId, amount);
        // if (!customer || customer?.message) return customer;
        // response = await this.razorpoayService.payOut(customer, 'refund');
        // subSource = 'RAZORPAY_X';
      }

      if (!response || response?.message) response = { status: 'FAILED' };
      if (source === 'CASHFREE') response.source = source;
      response.subSource = subSource;
      response.completionDate = this.typeService
        .getGlobalDate(new Date())
        .toJSON();
      try {
        const status = response?.status;
        const userId = rawData.userId;
        const appType = rawData?.appType;
        const emailId = rawData.email;
        const title = 'Refund Amount';
        const refundAmount = Math.abs(Math.floor(amount));
        const content = `Dear Customer, Your refund of Rs.${refundAmount} has been processed and will be reflected in your bank account in the next 1 to 7 Days.`;
        if (status === 'COMPLETED' || status === 'INITIALIZED') {
          const userData = [];
          userData.push({ userId, appType });
          const body = {
            userData,
            content,
            title,
            isMsgSent: true,
            smsId:
              appType == 1
                ? kMsg91Templates.RefundSMSId
                : kLspMsg91Templates.RefundSMSId,
            userId,
            message: content,
            smsOptions: { REFUNDVALUE: refundAmount },
          };
          try {
            await this.notificationService.sendChatMsgToUser(body);
          } catch (error) {}
          await this.sharedNotification.sendRefundMail(emailId, rawData);
        }
      } catch (error) {}
      await this.repository.updateRowData(response, create.id);
      return response;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get Data for reazore pay user
  private async getUserDataForCashfree(id, amount): Promise<any> {
    try {
      const bankingModel: any = { model: BankingEntity };
      bankingModel.attributes = [
        'id',
        'disbursementAccount',
        'disbursementIFSC',
      ];
      const userModel: any = { model: registeredUsers };
      userModel.attributes = ['fullName', 'phone', 'email'];
      const kycModel: any = { model: KYCEntity };
      kycModel.attributes = ['aadhaarAddress'];
      userModel.include = [kycModel];
      const options = {
        where: { id },
        include: [userModel, bankingModel],
      };
      const att = ['id'];
      const loanData = await this.loanRepo.getRowWhereData(att, options);
      if (!loanData || loanData === k500Error) return kInternalError;
      let address = '';
      try {
        address = this.typeService.getUserAadharAddress(
          loanData?.registeredUsers?.kycData?.aadhaarAddress,
        );
      } catch (error) {}

      const phone = this.cryptService.decryptPhone(
        loanData?.registeredUsers?.phone,
      );
      const customerData = {
        name: loanData?.registeredUsers?.fullName,
        email: loanData?.registeredUsers?.email,
        contact: phone,
        loanId: loanData?.id,
        amount: amount * 100,
        ifsc: loanData?.bankingData?.disbursementIFSC,
        account_number: loanData?.bankingData?.disbursementAccount,
        address,
        narration: 'REFUND OF ' + loanData?.id,
      };
      return customerData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get Data for reazore pay user
  private async getUserDataForRazorpayX(id, amount): Promise<any> {
    try {
      const bankingModel: any = { model: BankingEntity };
      bankingModel.attributes = [
        'id',
        'disbursementAccount',
        'disbursementIFSC',
      ];
      const userModel: any = { model: registeredUsers };
      userModel.attributes = ['fullName', 'phone', 'email'];
      const options = { where: { id }, include: [userModel, bankingModel] };
      const att = ['id'];
      const loanData = await this.loanRepo.getRowWhereData(att, options);
      if (!loanData || loanData === k500Error) return kInternalError;
      const customerData = {
        name: loanData?.registeredUsers?.fullName,
        email: loanData?.registeredUsers?.email,
        contact: loanData?.registeredUsers?.phone,
        loanId: loanData?.id,
        amount,
        ifsc: loanData?.bankingData?.disbursementIFSC,
        accountNumber: loanData?.bankingData?.disbursementAccount,
      };
      return customerData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region  check refund update or not
  async checkPendingRefund() {
    try {
      const options = { where: { type: 'REFUND', status: 'INITIALIZED' } };
      const att = [
        'id',
        'transactionId',
        'utr',
        'source',
        'subSource',
        'response',
      ];
      const result = await this.repository.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      for (let index = 0; index < result.length; index++) {
        const tran = result[index];
        try {
          const response = await this.checkStatusOfRefund(tran);
          if (response?.status) {
            let res = {};
            try {
              if (response?.response) {
                if (tran?.response) {
                  try {
                    res = JSON.parse(tran.response);
                    if (Object.keys(res).length == 0) res = {};
                  } catch (error) {}
                }
                if (response?.status == kFailed) {
                  const failedResponse = JSON.parse(response?.response);
                  res = {
                    ...res,
                    status: failedResponse?.status ?? 'failed',
                    failedResponse,
                  };
                } else res = { ...res, ...JSON.parse(response?.response) };
                if (Object.keys(res).length > 0)
                  response.response = JSON.stringify(res);
              }
            } catch (error) {}
            response.completionDate = this.typeService
              .getGlobalDate(new Date())
              .toJSON();
            await this.repository.updateRowData(response, tran.id);
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check status
  private async checkStatusOfRefund(tran) {
    try {
      const source = tran?.source;
      const subSource = tran?.subSource ?? '';
      const res = tran?.response ? JSON.parse(tran.response) : {};
      let response;
      if (source === 'CASHFREE' && subSource == 'CASHFREE') {
        const utr = tran.utr;
        if (utr) response = await this.cashFreeService.findPayoutData(utr);
      } else if (source === 'CASHFREE' && subSource != 'AUTODEBIT') {
        const orderId = res?.order_id;
        const transactionId = res?.refund_id;
        response = await this.cashFreeService.getRefundStatus(
          orderId,
          transactionId,
        );
      } else if (source === 'RAZORPAY' && subSource != 'RAZORPAY_X') {
        const pay_id = res?.payment_id;
        const refundId = res?.id;
        response = await this.razorpoayService.getRefundStatus(
          pay_id,
          refundId,
          subSource === 'AUTODEBIT',
        );
      } else if (source === 'ICICI_UPI') {
        const transactionType = 'R';
        const transactionId = tran?.transactionId;
        response = await this.iciciService.CallbackStatus({
          transactionType,
          transactionId,
        });
      } else {
        const utr = tran.utr;
        if (utr) response = await this.razorpoayService.findPayoutData(utr);
      }
      return response;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region re Initialize Refund
  async reInitializeRefund(id, adminId) {
    try {
      /// check view access
      const access = await this.adminRepo.checkHasAccess(adminId, 'refund');
      if (access !== true) return access;
      const checkIsFiled: any = await this.checkRefundIsFiled(id);
      if (checkIsFiled?.message) return checkIsFiled;
      if (checkIsFiled?.isFailed === true) {
        const result = await this.repository.deleteSingleData(id, false);
        if (result === k500Error) return kInternalError;
        const loanId = checkIsFiled?.loanId;
        if (loanId) return await this.checkAndPlaceRefund({ adminId, loanId });
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check initi
  private async checkRefundIsFiled(id) {
    try {
      const options = { where: { type: 'REFUND', status: 'FAILED', id } };
      const att = [
        'id',
        'transactionId',
        'utr',
        'source',
        'subSource',
        'response',
        'loanId',
      ];
      const result = await this.repository.getRowWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      const response = result?.response;
      const data = await this.checkStatusOfRefund(result);
      if (data?.status == 'FAILED' || !response)
        return { isFailed: true, loanId: result.loanId };
      else return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async refundAutomation(query) {
    try {
      const stDate = new Date();
      stDate.setHours(stDate.getHours() - 48);
      const startDate = query?.startDate ?? stDate;
      const endDate = query?.endDate ?? new Date();
      const adminId = SYSTEM_ADMIN_ID;
      const refundData = await this.getRefundablesData(
        startDate,
        endDate,
        adminId,
      );
      if (refundData === k500Error) return kInternalError;
      if (refundData?.message) return refundData;
      const filteredData = refundData?.filteredData ?? [];
      const refundList = filteredData.filter(
        (f) =>
          f.userType == 'On-Time' && f.waiver == 0 && f.failedRefund == false,
      );
      for (let index = 0; index < refundList.length; index++) {
        try {
          const ele = refundList[index];
          const loanId = ele?.loanId;
          const body = { loanId, adminId };
          await this.checkAndPlaceRefund(body);
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
