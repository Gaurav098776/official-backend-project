// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { PAGE_LIMIT, SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import * as fs from 'fs';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  kAutoDebit,
  kCC,
  kCashfree,
  kCompleted,
  kFailed,
  kRazorpay,
  kSigndesk,
  kSplitRefundable,
  kSupportMail,
  kTechSupportMail,
} from 'src/constants/strings';
import { employmentDesignation } from 'src/entities/designation.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { SequelOptions } from 'src/interfaces/include.options';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { DateService } from 'src/utils/date.service';
import { UserRepository } from 'src/repositories/user.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import {
  kGetCashfreePayment,
  kGetRazorpayPayment,
  kGetSigndeskPayment,
} from 'src/constants/network';
import { EMIRepository } from 'src/repositories/emi.repository';
import { kUnclosedLoanEmi } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
import { SharedTransactionService } from 'src/shared/transaction.service';

@Injectable()
export class TransactionService {
  constructor(
    private readonly calculation: CalculationSharedService,
    private readonly repository: TransactionRepository,
    private readonly commonShared: CommonSharedService,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    // Repositories
    private readonly loanRepo: LoanRepository,
    private readonly userRepo: UserRepository,
    private readonly emiRepo: EMIRepository,
    private readonly repoManager: RepositoryManager,
    // Utils
    private readonly dateService: DateService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly sharedTransaction: SharedTransactionService,
  ) {}

  //#region get repaid data
  async getAllRepaidLoans(query) {
    query.start_date = this.typeService.getGlobalDate(query.start_date);
    query.end_date = this.typeService.getGlobalDate(query.end_date);
    const options = await this.prePareRepaidOptions(query);
    if (options?.message) return options;
    const result = await this.findRepaidLoanData(options);
    if (result?.message) return result;
    const rows: any = await this.prePareAllRepaidLoans(result.rows);
    if (rows?.message) return result;
    const total: any = await this.getAllRepaidAmount(query);
    if (total?.message) return result;
    return { count: result.count, rows, total };
  }
  //#endregion

  //#region pre pare all rePaid loan transaction option
  private async prePareRepaidOptions(query) {
    try {
      const tranList = await this.getDelayEmiPaymenst(query);
      /// where condition
      const startDate = query.start_date;
      const endDate = query.end_date;
      const page = query?.page ?? 1;
      const type = query?.type ?? '';
      let userSearch: any = {};
      let loanId;
      let utr;
      let search = (query?.searchText ?? '').toLowerCase();
      if (search) {
        if (search.startsWith('l-')) loanId = search.replace('l-', '');
        else if (search.startsWith('u-')) utr = search.replace('u-', '');
        else if (!isNaN(search)) {
          search = this.cryptService.encryptPhone(search);
          if (search == k500Error) return k500Error;
          search = search.split('===')[1];
          userSearch.phone = { [Op.like]: '%' + search + '%' };
        } else userSearch.fullName = { [Op.iRegexp]: query?.searchText };
      }
      //#region inclued data

      /// emi model
      const att = [
        'id',
        'emi_date',
        'penalty',
        'penalty_days',
        'pay_type',
        'principalCovered',
        'interestCalculate',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
      ];
      const emiInclude = { model: EmiEntity, attributes: att };
      /// loan model
      const purposeModel = { model: loanPurpose, attributes: ['purposeName'] };
      const disbModel = { model: disbursementEntity, attributes: ['amount'] };
      const loanInclude = {
        model: loanTransaction,
        attributes: [
          'id',
          'stampFees',
          'processingFees',
          'loan_disbursement_date',
          'netApprovedAmount',
          'interestRate',
          'completedLoan',
          'manualVerificationAcceptId',
          'followerId',
        ],
        include: [emiInclude, purposeModel, disbModel],
      };
      /// employmenst model
      const attDes = ['id', 'designationName'];
      const desigModel = { model: employmentDesignation, attributes: attDes };
      const empInclude = {
        model: employmentDetails,
        attributes: ['id', 'companyName'],
        include: [desigModel],
      };
      /// user details
      const userInclude = {
        model: registeredUsers,
        attributes: [
          'fullName',
          'gender',
          'phone',
          'city',
          'state',
          'kycId',
          'lastCrm',
        ],
        where: userSearch,
        include: [empInclude],
      };
      //#endregion
      const options: any = {
        where: {
          status: 'COMPLETED',
          completionDate: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
          type: { [Op.ne]: 'REFUND' },
        },
        order: [['createdAt', 'DESC']],
        include: [loanInclude, userInclude],
      };
      if (loanId) options.where.loanId = loanId;
      if (utr) options.where.utr = { [Op.iRegexp]: utr };
      if (type && type != 'delay' && type != 'onTime')
        options.where.type = type;
      if (tranList.length > 0) {
        if (query?.type == 'delay') options.where.id = tranList;
        else if (query?.type == 'onTime') {
          const idArray = [];
          tranList.forEach((id) => {
            idArray.push({ id: { [Op.ne]: id } });
          });
          options.where = { ...options.where, [Op.and]: idArray };
        }
      }
      if (query?.download != 'true') {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region find repaid loan data
  private async findRepaidLoanData(options) {
    try {
      const att = [
        'id',
        'emiId',
        'userId',
        'loanId',
        'updatedAt',
        'completionDate',
        'penaltyAmount',
        'principalAmount',
        'interestAmount',
        'utr',
        'paidAmount',
        'source',
        'type',
        'subSource',
        'penaltyAmount',
        'createdAt',
        'forClosureAmount',
        'penalCharge',
        'sgstOnPenalCharge',
        'cgstOnPenalCharge',
        'bounceCharge',
        'sgstOnBounceCharge',
        'cgstOnBounceCharge',
        'regInterestAmount',
        'legalCharge',
        'sgstOnLegalCharge',
        'cgstOnLegalCharge',
        'response',
        'transactionId',
        'followerId',
      ];
      const result = await this.repository.getTableWhereDataWithCounts(
        att,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare all repaod loan
  private async prePareAllRepaidLoans(tranList) {
    const loanIds = [...new Set(tranList.map((el) => el?.loanId))];
    const attr = [
      'loanId',
      [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'totalPaid'],
    ];
    const opts = {
      where: { loanId: loanIds, status: kCompleted },
      group: ['loanId'],
    };
    const totalPaid = await this.repository.getTableWhereData(attr, opts);
    if (totalPaid === k500Error) return kInternalError;
    const finalList = [];
    for (let index = 0; index < tranList.length; index++) {
      const ele = tranList[index];
      const loan = ele.loanData;
      const loanId = ele.loanId;
      const userData = ele?.userData;
      const crmData = userData?.lastCrm ?? {};
      let crmDate = '-';
      if (crmData?.createdAt) {
        const dateInfo = this.dateService.dateToReadableFormat(
          crmData?.createdAt,
        );
        crmDate = dateInfo.readableStr;
      }
      const createdAt = this.typeService.getDateFormatted(ele?.createdAt);
      const disbursAmount = (loan?.disbursementData[0]?.amount ?? 0) / 100;
      const disDate = this.typeService.getDateFormatted(
        loan?.loan_disbursement_date,
      );
      const emiData = loan?.emiData ?? [];
      const completionDate = new Date(ele?.completionDate ?? ele?.updatedAt);
      const repaidDate = this.typeService.getDateFormatted(completionDate);
      const data = this.funRepaidDealyDayFlag(ele, emiData);
      const emp = userData?.employmentData;
      const mobileNumber = this.cryptService.decryptPhone(userData?.phone);
      const tPaid = totalPaid.find((f) => f.loanId == loanId)?.totalPaid;
      const foreclosure = ele?.forClosureAmount ?? 0;
      const tempData: any = {
        'Loan id': loanId,
        userId: ele.userId,
        Name: userData?.fullName ?? '-',
        'Mobile number': mobileNumber ?? '-',
        'Follower name':
          (await this.commonShared.getAdminData(ele?.followerId))?.fullName ??
          '-',
        'Completed loans': loan?.completedLoan ?? 0,
        'Approved amount': loan?.netApprovedAmount ?? 0,
        'Processing fees (%)': loan?.processingFees ?? '-',
        'Stamp duty fees': loan?.stampFees ?? 0,
        'Amount disbursed': disbursAmount,
        'Repaid amount': ele?.paidAmount ?? 0,
        'Penalty Amt.': this.typeService.manageAmount(
          (ele?.penaltyAmount ?? 0) +
            (ele?.penalCharge ?? 0) +
            (ele?.sgstOnPenalCharge ?? 0) +
            (ele?.cgstOnPenalCharge ?? 0),
        ),
        'ECS Charge': this.typeService.manageAmount(
          (ele?.bounceCharge ?? 0) +
            (ele?.sgstOnBounceCharge ?? 0) +
            (ele?.cgstOnBounceCharge ?? 0),
        ),
        'Deferred Interest': this.typeService.manageAmount(
          ele?.regInterestAmount ?? 0,
        ),
        'Legal Charge': this.typeService.manageAmount(
          (ele?.legalCharge ?? 0) +
            (ele?.sgstOnLegalCharge ?? 0) +
            (ele?.cgstOnLegalCharge ?? 0),
        ),
        'Due date': data?.dueDate ?? '-',
        'Delay days (as on today)': data?.delayDay ?? 0,
        'Repaid Date': repaidDate,
        'Repaid flag': data?.repaidFlag ?? '-',
        'Payment ID': ele?.utr ?? '-',
        'Payment mode': ele?.source ?? '-',
        'EMI Types': data?.emiNo ?? '-',
        Interest: data?.emiInterest ?? '-',
        Principal: data?.emiPrincipal ?? '-',
        'Repayment via': ele?.subSource ?? '-',
        'Company name': emp?.companyName ?? '-',
        Designation: emp?.designation?.designationName ?? '-',
        Purpose: loan?.purpose?.purposeName ?? '-',
        Gender: userData?.gender ?? '-',
        City: userData?.city ?? '-',
        State: userData?.state ?? '-',
        'Loan Interest': loan?.interestRate,
        'Disbursement date': disDate ?? '-',
        'Total paid Amt': tPaid ?? 0,
        'Foreclosure Charge': foreclosure ?? 0,
        'Created at': createdAt ?? '-',
        'Loan approved by':
          (
            await this.commonShared.getAdminData(
              loan?.manualVerificationAcceptId,
            )
          )?.fullName ?? '-',
        'Last crm by': crmData?.adminName ?? '-',
        'Last crm date': crmDate,
        TransactionId: ele.transactionId ?? '-',
        'Total WaiveOff': data?.totalWaiveOff ?? '-',
        'WaiveOff Given By': data?.totalWaiveOff
          ? (await this.commonShared.getAdminData(loan?.followerId))
              ?.fullName ?? '-'
          : '-',
        'Paid principal': ele?.principalAmount ?? 0,
        'Paid interest': ele?.interestAmount ?? 0,
      };

      // Adhoc -> As per requirement given by Accounts team need below id for Cashfree (22/06/2024)
      if (ele.source == kCashfree && ele.response) {
        try {
          const response = JSON.parse(ele.response ?? null);
          if (response?.payment?.orderId)
            tempData.TransctionId = response?.payment?.orderId;
        } catch (error) {}
      }
      finalList.push(tempData);
    }
    return finalList;
  }
  //#endregion

  //#region  this function call for repaid flag or dueDate or dealy day
  private funRepaidDealyDayFlag(ele, emiData) {
    let repaidFlag = '-';
    let dueDate = '-';
    let delayDay = 0;
    let emiNo = '-';
    let emiPrincipal = 0;
    let emiInterest = 0;
    let totalWaiveOff = 0;
    try {
      const paidDate = new Date(ele?.completionDate ?? ele?.updatedAt);
      emiData.forEach(
        (emi) =>
          (totalWaiveOff +=
            (emi?.waiver || 0) +
            (emi?.unpaid_waiver || 0) +
            (emi?.paid_waiver || 0)),
      );
      let emi;
      emiData.sort((a, b) => a.id - b.id);
      if (ele?.emiId) {
        emi = emiData.find((f) => f.id === ele?.emiId);
        emiPrincipal = emi?.principalCovered ?? 0;
        emiInterest = emi?.interestCalculate ?? 0;
        const index = emiData.findIndex((el) => el.id == ele?.emiId);
        emiNo = (index + 1).toString();
      } else {
        const filter = emiData.filter((f) => f.pay_type === 'FULLPAY');
        filter.sort((a, b) => a.id - b.id);
        emi = filter[0];
        emiNo = '';
        emiData.forEach((el, index) => {
          if (el.pay_type == 'FULLPAY') {
            if (!emiNo) emiNo = (index + 1).toString();
            else emiNo += ', ' + (index + 1).toString();
            emiPrincipal += el?.principalCovered ?? 0;
            emiInterest += el?.interestCalculate ?? 0;
          }
        });
      }
      if (emi) {
        dueDate = this.typeService.dateToFormatStr(emi?.emi_date);
        delayDay = emi?.penalty_days ?? 0;
        const emiDate = new Date(emi?.emi_date).getTime();
        if (paidDate.getTime() < emiDate) repaidFlag = 'Pre-Paid';
        else if (paidDate.getTime() > emiDate) repaidFlag = 'Delayed';
        else repaidFlag = 'On-Time';
      }
      emiNo = ele?.type + ' ' + emiNo;
    } catch (error) {}
    return {
      repaidFlag,
      dueDate,
      delayDay,
      emiNo,
      emiPrincipal,
      emiInterest,
      totalWaiveOff,
    };
  }
  //#endregion

  //#region get all repaid amount total
  private async getAllRepaidAmount(query) {
    try {
      const data = {
        totalPaidAmount: 0,
        onTimePaidAmount: 0,
        dealyPaidAmount: 0,
        count: 0,
        onTimePaidCounts: 0,
        delayPaidCounts: 0,
      };
      if (query?.getTotal == 'true' && query?.download != 'true') {
        const startDate = query.start_date.toJSON();
        const endDate = query.end_date.toJSON();
        /// find total of repay transaction
        const options: any = {
          where: {
            status: 'COMPLETED',
            completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
            type: { [Op.ne]: 'REFUND' },
          },
          group: ['status'],
        };

        let att: any = [
          [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'amount'],
          [Sequelize.fn('COUNT', Sequelize.col('status')), 'COUNT'],
        ];
        const total = await this.repository.getRowWhereData(att, options);
        if (!total || total === k500Error) return kInternalError;
        /// find emi delay emi from transaction
        const emiModel: any = {
          model: EmiEntity,
          attributes: [],
          where: { penalty_days: { [Op.gte]: 1 } },
        };
        options.include = [emiModel];
        const emi = await this.repository.getRowWhereData(att, options);
        if (emi === k500Error) return kInternalError;

        /// find emi delay emi from transaction for fullpay
        att = ['id', 'paidAmount'];
        options.where.type = 'FULLPAY';
        delete options.group;
        emiModel.where.pay_type = 'FULLPAY';
        const loanModel = {
          model: loanTransaction,
          attributes: [],
          include: [emiModel],
          required: true,
        };
        options.include = [loanModel];
        const loan = await this.repository.getTableWhereData(att, options);
        if (!loan || loan === k500Error) return kInternalError;
        let delyaAmount = 0;
        let dealyCount = 0;
        for (let index = 0; index < loan.length; index++) {
          try {
            const ele = loan[index];
            delyaAmount += ele.paidAmount;
            dealyCount += 1;
          } catch (error) {}
        }
        delyaAmount += emi?.amount ?? 0;
        dealyCount += +(emi?.COUNT ?? 0);
        data.totalPaidAmount = Math.floor(total?.amount ?? 0);
        data.onTimePaidAmount = Math.floor((total?.amount ?? 0) - delyaAmount);
        data.dealyPaidAmount = Math.floor(delyaAmount);
        data.count = +(total?.COUNT ?? 0);
        data.onTimePaidCounts = (total?.COUNT ?? 0) - dealyCount;
        data.delayPaidCounts = dealyCount;
      }
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get delay transaction id
  private async getDelayEmiPaymenst(query) {
    const tranList = [];
    try {
      if (query?.type == 'delay' || query?.type == 'onTime') {
        const startDate = query.start_date.toJSON();
        const endDate = query.end_date.toJSON();
        const options: any = {
          where: {
            status: 'COMPLETED',
            completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
            type: { [Op.ne]: 'REFUND' },
          },
        };
        /// get find delay emi
        const emiModel: any = {
          model: EmiEntity,
          attributes: [],
          where: { penalty_days: { [Op.gte]: 1 } },
        };
        options.include = [emiModel];
        const att = ['id'];
        const emiTran = await this.repository.getTableWhereData(att, options);
        /// find full pay delay emi
        options.where.type = 'FULLPAY';
        delete options.group;
        emiModel.where.pay_type = 'FULLPAY';
        const loanModel = {
          model: loanTransaction,
          attributes: [],
          include: [emiModel],
          required: true,
        };
        options.include = [loanModel];
        const fullTran = await this.repository.getTableWhereData(att, options);

        if (emiTran && emiTran != k500Error)
          emiTran.forEach((ele) => {
            tranList.push(ele.id);
          });

        if (fullTran && fullTran != k500Error)
          fullTran.forEach((ele) => {
            tranList.push(ele.id);
          });
      }
    } catch (error) {}
    return tranList;
  }
  //#endregion

  async fixAllIssues() {
    try {
      await this.fixUTRIssueIfPersists();
    } catch (error) {}
  }

  private async fixDateIssueIfPersists() {
    try {
      const attributes = ['completionDate', 'createdAt', 'id'];
      const options = {
        where: {
          completionDate: { [Op.iLike]: '+0%' },
          status: 'FAILED',
        },
      };

      const transList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;

      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          const targetDate = transData.completionDate;
          if (targetDate.length != 27) return;

          const id = transData.id;
          const completionDate = this.typeService
            .getGlobalDate(new Date(transData.createdAt))
            .toJSON();
          const updatedData = { completionDate };
          const updateResponse = await this.repository.updateRowData(
            updatedData,
            id,
          );
          if (updateResponse == k500Error) return kInternalError;
        } catch (error) {}
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private async fixUTRIssueIfPersists() {
    try {
      const attributes = ['id', 'response', 'source', 'transactionId'];
      const options = {
        where: { status: 'COMPLETED', utr: { [Op.eq]: null } },
      };

      const transList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;

      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          const source = transData.source;
          if (!source) continue;
          const transId = transData.transactionId;
          const id = transData.id;

          if (source == kRazorpay) {
            const utr = 'pay_' + transId;
            const updatedData = { utr };
            await this.repository.updateRowData(updatedData, id);
          } else if (source == kCashfree) {
            const rawResponse = transData.response;
            if (!rawResponse) continue;
            const response = JSON.parse(rawResponse);
            const data = response.find((el) => el.payment_status == 'SUCCESS');
            const utr = data.cf_payment_id;
            if (!utr) continue;
            const updatedData = { utr };
            await this.repository.updateRowData(updatedData, id);
          }
        } catch (error) {}
      }
    } catch (error) {}
  }

  async fetchCfAutoDebitList(status: string, loanId: number) {
    try {
      const userSearchWhere = {
        loanId,
        [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
      };
      if (status != 'all') userSearchWhere['status'] = status;
      const transAttr = [
        'id',
        'paidAmount',
        'status',
        'completionDate',
        'transactionId',
        'utr',
        'source',
        'userId',
        'loanId',
        'emiId',
        'subSource',
        'createdAt',
      ];
      const transOptions = {
        where: userSearchWhere,
      };
      const transData = await this.repository.getTableWhereData(
        transAttr,
        transOptions,
      );
      const finalData: any = await this.prepareFinalCFAutoDebitData(transData);
      if (finalData?.message) return finalData;
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private prepareFinalCFAutoDebitData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData: any = {};
          const createdAt = this.typeService.getDateFormatted(ele?.createdAt);
          const completionDate = this.typeService.getDateFormatted(
            ele?.completionDate,
          );
          tempData['Entry type'] = ele?.source;
          tempData['Batch id'] = ele?.utr;
          tempData['Amount'] = ele?.paidAmount;
          tempData['Loan id'] = ele?.loanId;
          tempData['Emi id'] = ele?.emiId;
          tempData['Mandate id'] = ele?.transactionId;
          tempData['Status'] = ele?.status;
          tempData['Submission date'] = createdAt;
          tempData['Payment done date'] = completionDate;
          tempData['Admin id'] = null;
          tempData['Auto pay create reason'] = null;
          tempData['Created at'] = createdAt;
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async prepareSDAutodebits(reqData) {
    const loanIds = reqData.loanIds;
    if (!loanIds) return kParamMissing('loanIds');

    const eMandateInclude: SequelOptions = { model: mandateEntity };
    eMandateInclude.attributes = ['emandate_id'];
    const subscriptionInclude: SequelOptions = { model: SubScriptionEntity };
    subscriptionInclude.attributes = ['referenceId'];
    const include = [eMandateInclude, subscriptionInclude];
    const attributes = ['id'];
    const options = {
      include,
      order: [['id']],
      where: { id: loanIds, loanStatus: 'Active' },
    };

    const loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) return kInternalError;

    const preparedList = [];
    for (let index = 0; index < loanList.length; index++) {
      const el = loanList[index];
      const eMandateList = el.mandateData ?? [];
      let refId = null;
      // For old users
      if (eMandateList?.length > 0) {
        refId = eMandateList[0].emandate_id;
      }
      // For new users
      else if (el.subscriptionData) {
        refId = el.subscriptionData.referenceId;
      }
      if (!refId) continue;

      const fullpayData = await this.calculation.getFullPaymentData({
        loanId: el.id,
      });
      if (fullpayData?.message) continue;

      const fullPayAmount = fullpayData.totalAmount;
      const preparedData = {
        emandate_id: refId,
        loanId: el.id,
        amount: Math.floor(fullPayAmount > 99999 ? 99999 : fullPayAmount),
      };
      preparedList.push(preparedData);
    }

    const body = {
      submission_date: new Date().toJSON().substring(0, 10),
      mandate_list: preparedList,
    };
    return body;
  }

  async fixAutodebitMismatchDate() {
    try {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const minDate = this.typeService.getGlobalDate(today);
      const rawQuery = `SELECT "TransactionEntities"."id", "emiId", "TransactionEntities"."loanId", 
      "completionDate", "subscriptionDate", "EmiEntities"."payment_done_date" FROM public."TransactionEntities" 
      INNER JOIN "EmiEntities" ON "EmiEntities"."id" = "TransactionEntities"."emiId"
      WHERE "status" = 'COMPLETED' AND "type" = 'EMIPAY' 
      AND "completionDate" >= '${minDate.toJSON()}'
      AND "emiId" IS NOT NULL AND "subSource" = 'AUTODEBIT'
      AND "completionDate" != "subscriptionDate" 
      AND "completionDate" IS NOT NULL
      AND "subscriptionDate" IS NOT NULL;`;
      const targetList: any = await this.repoManager.injectRawQuery(
        TransactionEntity,
        rawQuery,
      );
      if (targetList == k500Error) return kInternalError;

      // for (let index = 0; index < targetList.length; index++) {
      //   try {
      //     const targetData = targetList[index];
      //     const emiId = targetData.emiId;
      //     if (!emiId) continue;
      //     const transId = targetData.id;
      //     if (!transId) continue;
      //     if (
      //       targetData.completionDate &&
      //       targetData.completionDate != targetData.payment_done_date
      //     ) {
      //       continue;
      //     }

      //     const subscriptionDate = targetData.subscriptionDate;
      //     // Update in transaction table
      //     let updatedData: any = { completionDate: subscriptionDate };
      //     let updatedResponse: any = await this.repository.updateRowData(
      //       updatedData,
      //       transId,
      //       true,
      //     );
      //     if (updatedResponse == k500Error) continue;
      //     // Update in emi table
      //     updatedData = { payment_done_date: subscriptionDate };
      //     updatedResponse = await this.emiRepo.updateRowData(
      //       updatedData,
      //       emiId,
      //     );
      //   } catch (error) {}
      // }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //startregion get transaction

  async getTransactionsData(query) {
    try {
      const fromDate = this.typeService.getGlobalDate(query?.fromDate).toJSON();
      const toDate = this.typeService.getGlobalDate(query?.toDate).toJSON();
      const types = query?.types;
      if (!fromDate || !toDate || !types) return kParamsMissing;

      const options: any = {
        where: {
          type: types,
          completionDate: { [Op.gte]: fromDate, [Op.lte]: toDate },
          status: 'COMPLETED',
        },
      };
      // For only total counts and total amount paid
      const countAttr: any = [
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('paidAmount')), 'count'],
      ];
      const transactionList = await this.repository.getRowWhereData(
        countAttr,
        options,
      );

      if (transactionList === k500Error) return kInternalError;
      transactionList.count = +(transactionList?.count ?? 0);
      transactionList.totalAmount = Math.round(
        transactionList?.totalAmount ?? 0,
      );
      return transactionList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Get Last Autodebit Response
  async getLastAutodebitResponse(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const loanInclude: any = { model: loanTransaction, attributes: ['id'] };
      loanInclude.where = { loanStatus: 'Active' };
      const options = {
        where: {
          userId,
          [Op.or]: [{ subSource: 'AUTODEBIT' }, { source: 'AUTOPAY' }],
        },
        order: [['id', 'desc']],
        include: [loanInclude],
      };
      const att = [
        'id',
        'status',
        'response',
        'paidAmount',
        'subscriptionDate',
      ];
      const find = await this.repository.getRowWhereData(att, options);
      if (!find || find === k500Error) return {};
      if (find.status === 'INITIALIZED') {
        return { amount: find.paidAmount, date: find.subscriptionDate };
      }
      let message = '';
      const data = { status: find?.status, message: message };
      try {
        const response = JSON.parse(find?.response);
        message = response?.payment?.failureReason ?? '';
        if (!message) message = response?.error_description ?? '';
        if (!message) message = response?.error_message ?? '';
        if (!message) message = response?.reason ?? '';
        if (data.status === 'COMPLETED') message = 'SUCCESS';
      } catch (error) {}
      data.message = message;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //check Uncompleted Transactions of user
  async checkUncompletedTransactions() {
    try {
      const toDayDate = await this.typeService
        .getGlobalDate(new Date())
        .toJSON();
      const emiPayRawQuery = `SELECT emi."userId",trans."paidAmount", emi."loanId",emi."emi_date" , trans."completionDate", trans."transactionId"
      FROM "EmiEntities" AS emi
      JOIN public."TransactionEntities" AS trans
      ON emi."loanId" = trans."loanId"
      WHERE trans."type" = 'FULLPAY'
      AND trans."status" = 'COMPLETED'
      AND trans."completionDate" = '${toDayDate}'
      AND emi."payment_status" = '0' ORDER BY emi."loanId"`;

      const fullPaRrawQuery = `SELECT emi."userId",trans."paidAmount",emi."loanId",emi."emi_date" ,trans."completionDate", trans."transactionId" FROM "EmiEntities" AS emi  INNER JOIN "TransactionEntities" AS trans ON trans."emiId" = emi.id 
      WHERE trans."paidAmount" = (emi."principalCovered" + emi."interestCalculate") 
      AND trans."status" = 'COMPLETED' AND emi."payment_status" = '0' 
      AND (emi."penalty_days" <= 5 OR emi."penalty_days" is null)  
      AND trans."type" = 'EMIPAY' 
      AND emi."emi_date" >= trans."completionDate" 
      ORDER BY emi."loanId"`;

      //emi pay user data
      const emiPayData: any = await this.repoManager.injectRawQuery(
        EmiEntity,
        emiPayRawQuery,
      );
      if (emiPayData === k500Error) return kInternalError;

      //full pay user data
      const fullPayData: any = await this.repoManager.injectRawQuery(
        EmiEntity,
        fullPaRrawQuery,
      );
      //loan Data
      const options: any = { where: { loanStatus: 'Active' } };
      const emiInclude = {
        model: EmiEntity,
        attributes: ['id'],
        where: {
          payment_status: '1',
          partOfemi: 'LAST',
          payment_done_date: toDayDate,
        },
      };
      options.include = [emiInclude];
      const loanData = await this.loanRepo.getTableWhereData(
        ['id', 'userId'],
        options,
      );
      if (loanData === k500Error) return kInternalError;
      const issueLoan = loanData.map((e) => e.id);
      const emiAttributes = ['userId', 'loanId', 'emi_date', 'payment_status'];
      const emiData = await this.emiRepo.getTableWhereData(emiAttributes, {
        where: {
          loanId: issueLoan,
          payment_status: '0',
        },
      });
      if (emiData === k500Error) return kInternalError;
      const ffData = [];
      loanData.forEach((loan) => {
        try {
          const loanId = loan?.id;
          const issue = emiData.find((f) => f.loanId == loanId);
          if (!issue) ffData.push(loan);
        } catch (error) {}
      });
      if (fullPayData == k500Error) return kInternalError;
      const finallData = [...emiPayData, ...fullPayData, ...loanData];
      const emiUserId = emiPayData.map((id) => id.userId);
      const fullUserId = fullPayData.map((id) => id.userId);
      const loanUserId = loanData.map((id) => id.userId);
      const userIds = [...emiUserId, ...fullUserId, ...loanUserId];
      //get user name from userEntity
      const userData = await this.userRepo.getTableWhereData(
        ['id', 'fullName'],
        { where: { id: userIds } },
      );
      if (userData == k500Error) return kInternalError;
      return await this.prepareData(finallData, userData);
    } catch (error) {}
  }

  // data prepare and send mail
  async prepareData(finallData, userData) {
    try {
      const template = kUnclosedLoanEmi;
      const MODE = process.env.MODE;
      for (let index = 0; index < finallData.length; index++) {
        try {
          const ele = finallData[index];
          const userName = userData.find((e) => e?.id == ele?.userId);
          const userId = ele?.userId ?? '-';
          const fullName = userName?.fullName ?? '-';
          const loanId = ele?.loanId ?? '-';
          const paidDate = ele?.completionDate ?? '-';
          const paidAmount = ele?.paidAmount
            ? this.typeService.amountNumberWithCommas(ele?.paidAmount)
            : '-';
          const tranId =
            ele?.transactionId ?? 'Emi is pay but loan is not closed';
          const emiDate = ele?.emi_date ?? '-';
          let html: any = fs.readFileSync(template, 'utf-8');
          html = html.replace('##userId##', userId);
          html = html.replace('##fullName##', fullName);
          html = html.replace('##loanId##', loanId);
          html = html.replace('##paidDate##', paidDate);
          html = html.replace('##emiDate##', emiDate);
          html = html.replace('##tranId##', tranId);
          html = html.replace('##paidAmount##', paidAmount);
          html = html.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
          const subject = `${MODE} Alert: Payment successful with unclosed EMI/Loan`;
          const cc = kCC;
          await this.sharedNotification.sendMailFromSendinBlue(
            kTechSupportMail,
            subject,
            html,
            userId,
            cc,
          );
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region  get all  the transaction details by loanId
  async getTransactionDetails(query) {
    try {
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const traStatus = ['ALL', 'INITIALIZED', 'COMPLETED', 'FAILED'];
      const status = query?.status;
      if (status && !traStatus.includes(status))
        return kInvalidParamValue('status');

      const traAttrs = [
        'id',
        'paidAmount',
        'completionDate',
        'subscriptionDate',
        'status',
        'emiId',
        'transactionId',
        'utr',
        'source',
        'subSource',
        'type',
        'subStatus',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'createdAt',
        'updatedAt',
        'adminId',
        'response',
        'bounceCharge',
        'legalCharge',
        'sgstOnLegalCharge',
        'cgstOnLegalCharge',
        'cgstOnBounceCharge',
        'sgstOnBounceCharge',
        'regInterestAmount',
        'cgstOnPenalCharge',
        'sgstOnPenalCharge',
        'penalCharge',
        'forClosureAmount',
        'sgstForClosureCharge',
        'cgstForClosureCharge',
      ];
      const transInc: any = {
        model: TransactionEntity,
        attributes: traAttrs,
        where: { loanId },
      };
      if (status && status != 'ALL') transInc.where.status = status;
      const emiInc = { model: EmiEntity, attributes: ['id', 'pay_type'] };
      const loanOpts = { where: { id: loanId }, include: [transInc, emiInc] };
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'penaltyCharges'],
        loanOpts,
      );
      if (loanData === k500Error) return kInternalError;
      else if (!loanData) return [];
      return await this.prepareTransData(loanData, query);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareTransData(loanData, query) {
    try {
      const emiId = query?.emiId;
      const transData = loanData?.transactionData ?? [];
      const modification =
        loanData?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
      const length = transData.length;
      if (!transData || length == 0) return [];
      transData.sort((a, b) => b.id - a.id);
      const emiData = loanData?.emiData ?? [];
      emiData.sort((a, b) => a.id - b.id);
      const finalData = [];
      const emiTrans = [];
      for (let i = 0; i < length; i++) {
        try {
          const ele = transData[i];
          const emi = ele?.emiId;
          const type = ele?.type;
          const source = ele?.source;
          const subSource = ele?.subSource;
          const status = ele?.status;
          const utr = ele?.utr;
          const penalCharges = Math.round(
            (ele?.penalCharge ?? 0) +
              (ele?.sgstOnPenalCharge ?? 0) +
              (ele?.cgstOnPenalCharge ?? 0),
          );
          let totalLegalCharge =
            (ele?.legalCharge ?? 0) +
            (ele?.sgstOnLegalCharge ?? 0) +
            (ele?.sgstOnLegalCharge ?? 0);
          let totalBounceCharge =
            (ele?.bounceCharge ?? 0) +
            (ele?.cgstOnBounceCharge ?? 0) +
            (ele?.sgstOnBounceCharge ?? 0);

          const forClosureCharge = Math.round(
            (ele?.forClosureAmount ?? 0) +
              (ele?.sgstForClosureCharge ?? 0) +
              (ele?.cgstForClosureCharge ?? 0),
          );

          let emiNum;
          let fullPay = false;
          emiData.forEach((el, index) => {
            try {
              if (ele?.emiId == el.id) emiNum = `${index + 1}`;
              if (type == 'FULLPAY' && el.pay_type == 'FULLPAY') {
                if (!emiNum) emiNum = `${index + 1}`;
                else emiNum += ` & ${index + 1}`;
                fullPay = true;
              }
            } catch (error) {}
          });
          const adminData = await this.commonShared.getAdminData(ele?.adminId);
          const repaidDate =
            subSource == 'AUTODEBIT'
              ? ele?.subscriptionDate ?? ele.createdAt
              : ele.createdAt;
          const responseDate =
            subSource == 'AUTODEBIT' && status != 'INITIALIZED'
              ? ele?.updatedAt
              : ele?.completionDate;
          let paymentURL = '-';
          let failureReason;
          const response = ele?.response ? JSON.parse(ele?.response) : {};
          if (status != 'INITIALIZED') {
            if (source == kCashfree) {
              const resObj = Array.isArray(response) ? response[0] : response;
              const paymentId =
                resObj?.payment?.referenceId ?? resObj?.cf_payment_id ?? '';
              paymentURL = `${kGetCashfreePayment}?txId=${paymentId}`;
            } else if (source == kRazorpay) {
              const pay = type == 'REFUND' ? 'refunds/' : 'payments/';
              paymentURL = `${kGetRazorpayPayment}${pay}${utr}`;
            } else if (source == kSigndesk) {
              const mandateId = utr.split('-id-')[1];
              paymentURL =
                mandateId != 'NA' ? `${kGetSigndeskPayment}${mandateId}` : '-';
            }
            if (status == kFailed)
              failureReason =
                response?.payment?.failureReason ??
                response?.response?.data?.message ??
                response?.error_description ??
                response?.error_message ??
                response?.reason ??
                '-';
          }
          ele.subStatus =
            ele?.subStatus == kSplitRefundable ? '-' : ele?.subStatus;
          const adNotPlaced =
            status == kFailed &&
            subSource == 'AUTODEBIT' &&
            response?.adNotPlaced == true
              ? 'AD_NOT_PLACED'
              : '-';
          const tra: any = {
            Status: status ?? '-',
            'Repaid date': this.typeService.getDateFormated(repaidDate, '/'),
            'Response date': responseDate
              ? this.typeService.getDateFormated(responseDate, '/')
              : '-',
            'Repay amount': Math.round(ele?.paidAmount),
            Principal: Math.round(ele?.principalAmount),
            Interest: Math.round(ele?.interestAmount),
            'Deferred interest': Math.round(ele?.regInterestAmount) ?? 0,
            'Penal charge': Math.round(
              penalCharges + (ele?.penaltyAmount ?? 0),
            ),
            'For closure charge': forClosureCharge ?? 0,
            EMI: emiNum ?? '-',
            'Pay type': type ?? '-',
            'Paid via': source ?? '-',
            Source: subSource ?? '-',
            UTR: utr ?? '-',
            'Initiated by': adminData.fullName,
            'Sub status': ele?.subStatus ?? adNotPlaced,
            'Legal charge': Math.round(totalLegalCharge) ?? 0,
            'ECS charge': Math.round(totalBounceCharge) ?? 0,
            paymentURL,
          };
          if (failureReason) tra.failureReason = failureReason;
          if (emiId == emi || fullPay) emiTrans.push(tra);
          finalData.push(tra);
        } catch (error) {}
      }
      if (emiId) return emiTrans;
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getAllPendingCFOrders(fullDayCheck = false) {
    try {
      let minCheck = 15;
      if (fullDayCheck) minCheck = 2880;
      const minDate = new Date();
      minDate.setMinutes(minDate.getMinutes() - minCheck);
      const toDay = new Date().toJSON();
      const dateRange = this.typeService.getUTCDateRange(toDay, toDay);

      const attributes = ['loanId'];
      const options = {
        order: [['id', 'DESC']],
        where: {
          status: 'INITIALIZED',
          // source: ['CASHFREE', 'RAZORPAY', 'ICICI_UPI'],
          source: [kCashfree],
          subSource: { [Op.ne]: kAutoDebit },
          transactionId: { [Op.ne]: null },
          createdAt: {
            [Op.gte]: dateRange.fromDate,
            [Op.lte]: dateRange.endDate,
          },
          // Limit removed
          //  updatedAt: { [Op.gte]: minDate },
        },
      };

      const pendingList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (pendingList == k500Error) return kInternalError;

      for (let index = 0; index < pendingList.length; index++) {
        const loanId = pendingList[index].loanId;
        await this.sharedTransaction.checkCFOrder(loanId);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async placeAutoDebitForEMIDues(reqData: any) {
    try {
      const today = new Date();
      let emi_date = this.typeService.getGlobalDate(today).toJSON();
      try {
        const submissionDate: string = reqData?.submissionDate ?? '';
        if (submissionDate.includes('T') && submissionDate.endsWith('Z'))
          emi_date = submissionDate;
      } catch (error) {}
      const targetEMIs: any = await this.getDataForPlaceAutoDebitForEMIDues(
        reqData,
        emi_date,
      );
      if (targetEMIs.message) return targetEMIs;
      const submissionDate = emi_date;
      const adminId = SYSTEM_ADMIN_ID;
      const sendSMS = true;
      const subSource = kAutoDebit;
      for (let index = 0; index < targetEMIs.length; index++) {
        try {
          const emiData = targetEMIs[index];
          const emiId = emiData.id;
          const amount = parseFloat(emiData.emi_amount);
          if (isNaN(amount)) continue;
          const loanData = emiData.loan ?? {};
          const subscriptionData = loanData.subscriptionData;
          if (!subscriptionData) continue;
          const source = subscriptionData.mode;
          const loanId = loanData.id;
          if (!loanId) continue;

          const data = {
            adminId,
            amount,
            emiId,
            loanId,
            payment_date: null,
            sendSMS,
            source,
            submissionDate,
            subSource,
          };
          await this.sharedTransaction.funCreatePaymentOrder(data);
        } catch (error) {}
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForPlaceAutoDebitForEMIDues(reqData: any, emi_date) {
    try {
      const modes = reqData.modes;
      if (!modes) return kParamMissing('modes');
      if (modes.length == 0)
        return k422ErrorMessage('Invalid value provided for parameter modes');

      const subScriptionInclude: any = { model: SubScriptionEntity };
      subScriptionInclude.attributes = ['id', 'mode'];
      subScriptionInclude.where = { mode: { [Op.or]: modes } };
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['id'];
      loanInclude.include = [subScriptionInclude];
      const include = [loanInclude];

      const attributes = ['emi_amount', 'id'];
      const options = { include, where: { emi_date, payment_status: '0' } };
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      if (emiList == k500Error) return kInternalError;

      return emiList.filter((el) => el.loan);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
