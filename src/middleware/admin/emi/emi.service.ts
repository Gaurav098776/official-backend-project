// Imports
import { v4 as uuidv4 } from 'uuid';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import * as fs from 'fs';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { EmiEntity } from 'src/entities/emi.entity';
import { IncludeOptions, Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { registeredUsers } from 'src/entities/user.entity';
import { EMIRepository } from 'src/repositories/emi.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import {
  ECS_BOUNCE_CHARGE,
  GLOBAL_CHARGES,
  MSG91,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
  UAT_PHONE_NUMBER,
  gIsPROD,
} from 'src/constants/globals';
import {
  kAutoDebit,
  kCollectionEmail,
  kCompleted,
  kEMIPay,
  kFailed,
  kFullPay,
  kInfoBrandNameNBFC,
  kHelpContact,
  kInitiated,
  kSupportMail,
  kTOverDue,
  nbfcInfoStr,
  kNoReplyMail,
  kLspNoReplyMail,
  klspCollectionMail,
  kTechSupportMail,
  kDirectBankPay,
} from 'src/constants/strings';
import { kParamsMissing } from 'src/constants/responses';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { nPaymentRedirect } from 'src/constants/network';
import { DateService } from 'src/utils/date.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { FileService } from 'src/utils/file.service';
import { CommonService } from 'src/utils/common.service';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { BankingService } from 'src/admin/banking/banking.service';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { StringService } from 'src/utils/string.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { SequelOptions } from 'src/interfaces/include.options';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import {
  kEmailPaymentReminder,
  kMismatchedEmiCreation,
} from 'src/constants/directories';
import { SystemTraceEntity } from 'src/entities/system_trace.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { FinvuService } from 'src/thirdParty/finvu/finvu.service';
import { EnvConfig } from 'src/configs/env.config';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { kLspMsg91Templates, kMsg91Templates } from 'src/constants/objects';
import { CallingService } from '../calling/calling.service';
import { FinvuEntity } from 'src/entities/finvu.entity';
@Injectable()
export class EMIService {
  constructor(
    private readonly dateService: DateService,
    private readonly repository: EMIRepository,
    private readonly repoManager: RepositoryManager,
    private readonly typeService: TypeService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly allSmsService: AllsmsService,
    private readonly whatsAppService: WhatsAppService,
    private readonly cryptService: CryptService,
    private readonly userRepo: UserRepository,
    private readonly loanRepo: LoanRepository,
    private readonly emiRepo: EMIRepository,
    private readonly callingService: CallingService,
    // Admin services
    @Inject(forwardRef(() => BankingService))
    private readonly bankingService: BankingService,
    // Repositories
    private readonly transRepo: TransactionRepository,
    private readonly userBlockHistoryRepo: BlockUserHistoryRepository,
    private readonly bankingRepo: BankingRepository,
    // Shared services
    private readonly calculation: CalculationSharedService,
    private readonly commonService: CommonService,
    private readonly commonsharedService: CommonSharedService,
    private readonly fileService: FileService,
    // Utils services
    private readonly stringService: StringService,
    // third Party services
    private readonly finvuService: FinvuService,
  ) {}

  //notify user upcoming user and due emis
  async funNotifyUpcomingAndDueEmis() {
    try {
      //take current date and future 5 days
      let futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate = this.typeService.getGlobalDate(futureDate);
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'fcmToken', 'phone', 'email'],
      };
      const attributes = [
        'id',
        'payment_due_status',
        'payment_status',
        'userId',
        'emi_date',
        'emi_amount',
        'penalty',
        'loanId',
        'principalCovered',
        'interestCalculate',
        'paid_principal',
        'paid_interest',
        'paid_penalty',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
        'paidRegInterestAmount',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
      ];
      const loanInclude = {
        model: loanTransaction,
        attributes: ['appType', 'penaltyCharges'],
      };
      const options = {
        where: {
          emi_date: { [Op.lte]: futureDate.toJSON() },
          payment_status: '0',
          payment_due_status: { [Op.ne]: '1' },
        },
        include: [userInclude, loanInclude],
      };
      //get all upcoming and due emis
      const emiData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (emiData == k500Error) return kInternalError;
      emiData.forEach((emi) => {
        if (!emi?.loan?.penaltyCharges?.MODIFICATION_CALCULATION) {
          emi.bounceCharge = 0;
        }
      });
      await this.sendUpcomingNotifyEmis(emiData);
      return emiData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async repaymentStatus(reqData) {
    try {
      const countOnly = reqData.isCount == 'true';
      if (countOnly) return await this.getCountsForRepaymentStatus(reqData);
      return await this.getDataForRepaymentStatus(reqData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCountsForRepaymentStatus(reqData) {
    try {
      let fromDate = reqData.fromDate;
      let toDate = reqData.endDate;
      if (!fromDate)
        fromDate = this.typeService.getGlobalDate(new Date()).toJSON();
      if (!toDate) toDate = this.typeService.getGlobalDate(new Date()).toJSON();
      const data = {
        totalCount: 0,
        totalAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        autoDebitCount: 0,
        autoDebitAmount: 0,
        manualCount: 0,
        manualAmount: 0,
        failedCount: 0,
        failedAmount: 0,
        successRatio: 0,
      };

      // DB query
      const attributes: any = [
        [
          Sequelize.fn('SUM', Sequelize.col('principalCovered')),
          'principalAmount',
        ],
        [
          Sequelize.fn('SUM', Sequelize.col('interestCalculate')),
          'interestAmount',
        ],
      ];
      let options: any = {
        where: {
          emi_date: { [Op.gte]: fromDate, [Op.lte]: toDate },
          [Op.or]: [
            { payment_status: '0' },
            { payment_done_date: { [Op.gte]: fromDate } },
          ],
        },
      };
      const totalEMIData = await this.repository.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (totalEMIData == k500Error) return kInternalError;
      data.totalCount = totalEMIData.count;
      data.totalAmount = totalEMIData.rows[0]?.principalAmount ?? 0;
      data.totalAmount += totalEMIData.rows[0]?.interestAmount ?? 0;

      // Paid manually from app (EMI PAY)

      const paidEMIs: any = await this.getPaidEMIs(reqData);
      if (paidEMIs?.message) return paidEMIs;
      data.manualCount = paidEMIs.length;
      const manualAmount = paidEMIs.reduce(
        (acc, curr) => acc + Number(curr.amount),
        0,
      );
      data.manualAmount = manualAmount;

      const autoDebitQuery = `SELECT count("EmiEntity"."id") AS "count", 
      SUM("principalCovered") AS "principalAmount", 
      SUM("interestCalculate") AS "interestAmount" FROM "EmiEntities" AS "EmiEntity" 
      LEFT OUTER JOIN "TransactionEntities" AS "transactionData" ON "EmiEntity"."id" = "transactionData"."emiId" 
      WHERE ("transactionData"."status" = 'COMPLETED' AND "transactionData"."subSource" = 'AUTODEBIT') AND 
      ("EmiEntity"."emi_date" >= '${fromDate}' AND "EmiEntity"."emi_date" <= '${toDate}') 
      AND "EmiEntity"."payment_done_date" >= '${fromDate}'`;

      const autodebitEMIdata = await this.repoManager.injectRawQuery(
        EmiEntity,
        autoDebitQuery,
      );

      if (autodebitEMIdata === k500Error) return kInternalError;
      data.autoDebitCount = Number(autodebitEMIdata[0]?.count) ?? 0;
      data.autoDebitAmount = Number(autodebitEMIdata[0]?.principalAmount) ?? 0;
      data.autoDebitAmount += Number(autodebitEMIdata[0]?.interestAmount) ?? 0;

      const pendingQuery = `SELECT count("EmiEntity"."id") AS "count", SUM("principalCovered") 
      AS "principalAmount", SUM("interestCalculate") AS "interestAmount" FROM "EmiEntities" AS "EmiEntity" 
      LEFT OUTER JOIN "TransactionEntities" AS "transactionData" 
      ON "EmiEntity"."id" = "transactionData"."emiId" WHERE ("transactionData"."status" = 'INITIALIZED' 
      AND "transactionData"."subSource" = 'AUTODEBIT') AND ("EmiEntity"."emi_date" >= '${fromDate}' 
      AND "EmiEntity"."emi_date" <= '${toDate}') AND "EmiEntity"."payment_status" = '0';`;

      const unpaidEMIData = await this.repoManager.injectRawQuery(
        EmiEntity,
        pendingQuery,
      );
      if (unpaidEMIData === k500Error) return kInternalError;
      data.pendingCount = Number(unpaidEMIData[0]?.count) ?? 0;
      data.pendingAmount = Number(unpaidEMIData[0]?.principalAmount) ?? 0;
      data.pendingAmount += Number(unpaidEMIData[0]?.interestAmount) ?? 0;

      const failedQuery = `SELECT count("EmiEntity"."id") AS "count", SUM("principalCovered") AS "principalAmount", 
      SUM("interestCalculate") AS "interestAmount" FROM "EmiEntities" AS "EmiEntity" 
      LEFT OUTER JOIN "TransactionEntities" AS "transactionData" ON "EmiEntity"."id" = "transactionData"."emiId" 
      WHERE (("transactionData"."status" = 'FAILED' AND "transactionData"."subSource" = 'AUTODEBIT' 
      OR "transactionData"."status" = 'INITIALIZED' AND "transactionData"."subSource" = 'AUTODEBIT' 
      AND "transactionData"."utr" is NULL)) AND ("EmiEntity"."emi_date" >= '${fromDate}' 
      AND "EmiEntity"."emi_date" <= '${toDate}') AND "EmiEntity"."payment_status" = '0';`;

      const failedEMIData = await this.repoManager.injectRawQuery(
        EmiEntity,
        failedQuery,
      );
      if (failedEMIData === k500Error) return kInternalError;
      data.failedCount = Number(failedEMIData[0]?.count) ?? 0;
      data.failedAmount = Number(failedEMIData[0]?.principalAmount) ?? 0;
      data.failedAmount += Number(failedEMIData[0]?.interestAmount) ?? 0;

      // Fine tune
      data.totalAmount = Math.floor(data.totalAmount);
      data.successRatio = Math.floor(
        ((data.manualCount + data.autoDebitCount) * 100) / data.totalCount,
      );
      if (
        data.totalAmount === 0 &&
        data.manualAmount === 0 &&
        data.autoDebitAmount === 0
      )
        data.successRatio = 0;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForRepaymentStatus(reqData) {
    let fromDate = reqData.fromDate;
    let toDate = reqData.endDate;
    if (!fromDate)
      fromDate = this.typeService.getGlobalDate(new Date()).toJSON();
    if (!toDate) toDate = this.typeService.getGlobalDate(new Date()).toJSON();
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    let searchText = (reqData.searchText ?? '').toLowerCase();
    if (searchText <= 2) searchText = '';
    const needDownload = reqData.download == 'true';

    // DB query
    const attributes: any = [
      'id',
      'emi_amount',
      'emi_date',
      'emiNumber',
      'loanId',
      'payment_done_date',
      'payment_status',
      'pay_type',
      'userId',
      'principalCovered',
      'interestCalculate',
    ];
    const limit = reqData.pageSize ?? PAGE_LIMIT;
    const page = reqData.page ?? 1;
    const offset = limit * (page - 1);
    let emiWhere: any = {
      emi_date: { [Op.gte]: fromDate, [Op.lte]: toDate },
      [Op.or]: [
        { payment_status: '0' },
        { payment_done_date: { [Op.gte]: fromDate } },
      ],
    };
    const allEmiData = await this.repository.getTableWhereDataWithCounts(
      attributes,
      { where: emiWhere },
    );
    if (allEmiData == k500Error) return kInternalError;

    const totalEMIIds = [...new Set(allEmiData.rows.map((el) => el.id))];

    const transInclude: SequelOptions = { model: TransactionEntity };
    transInclude.attributes = [
      'completionDate',
      'id',
      'emiId',
      'response',
      'status',
      'paidAmount',
      'utr',
      'subSource',
    ];

    let where: any = {};
    // Type -> TOTAL
    if (type == 'TOTAL') {
      where = { id: totalEMIIds };
      transInclude.required = false;
    }
    // Type -> PENDING
    else if (type == 'PENDING') {
      const attributes = ['emiId'];
      const options = {
        where: {
          emiId: { [Op.in]: totalEMIIds },
          status: kInitiated,
          subSource: kAutoDebit,
          type: kEMIPay,
        },
      };
      const transList = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;
      const targetEMIIds = transList.map((el) => el.emiId);
      where = {
        id: targetEMIIds,
        payment_status: '0',
      };
      transInclude.required = false;
    }
    // Type -> Manually paid via autodebit
    else if (type == kAutoDebit) {
      const attributes = ['emiId'];
      const options = {
        where: {
          emiId: { [Op.in]: totalEMIIds },
          status: kCompleted,
          subSource: kAutoDebit,
          type: kEMIPay,
        },
      };
      const transList = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;
      const targetEMIIds = transList.map((el) => el.emiId);
      where = {
        id: targetEMIIds,
        payment_status: '1',
      };
      transInclude.required = false;
    }
    // Type -> Manually paid via app
    else if (type == 'MANUAL') {
      const emiIds: any = await this.getPaidEMIs(reqData);
      const idArray = emiIds.map((el) => el.id);
      if (emiIds?.message) return emiIds;
      where = { id: idArray };
      transInclude.required = false;
    }
    // Type -> FAILED
    else if (type == kFailed) {
      transInclude.where = {
        subSource: kAutoDebit,
        [Op.or]: [
          { status: kFailed },
          { status: kInitiated, utr: { [Op.eq]: null } },
        ],
      };
      where = {
        id: totalEMIIds,
        payment_status: '0',
      };
    } else return k422ErrorMessage('Parameter type has invalid value');

    const userInclude: any = { model: registeredUsers };
    userInclude.attributes = ['fullName', 'phone'];
    if (searchText) {
      if (searchText.startsWith('l-'))
        where.loanId = searchText.replace('l-', '');
      else if (!isNaN(searchText)) {
        searchText = this.cryptService.encryptPhone(searchText);
        if (searchText == k500Error) return k500Error;
        searchText = searchText.split('===')[1];
        userInclude.where = { phone: { [Op.like]: '%' + searchText + '%' } };
      } else userInclude.where = { fullName: { [Op.iRegexp]: searchText } };
    }

    const include = [
      transInclude,
      userInclude,
      {
        model: loanTransaction,
        attributes: [
          'appType',
          'balanceFetchDate',
          'currentAccountBalance',
          'id',
          'followerId',
          'loan_disbursement_date',
          'manualVerificationAcceptId',
          'insuranceId',
        ],
        include: [
          {
            model: BankingEntity,
            attributes: ['mandateAccount', 'mandateBank', 'mandateIFSC'],
          },
          { model: disbursementEntity, attributes: ['id', 'amount'] },
          { model: SubScriptionEntity, attributes: ['id', 'mode'] },
          {
            required: false,
            model: PredictionEntity,
            attributes: ['id', 'categorizationTag'],
          },
          {
            required: false,
            model: InsuranceEntity,
            attributes: ['id', 'response'],
          },
        ],
      },
    ];
    const options1: any = {
      include,
      limit,
      offset,
      order: [['id', 'DESC']],
      where,
    };
    if (needDownload) {
      delete options1.limit;
      delete options1.offset;
    }
    const emiData = await this.repository.getTableWhereDataWithCounts(
      attributes,
      options1,
    );
    if (emiData == k500Error) return kInternalError;

    const rows = [];
    const emiList = emiData.rows;
    for (let index = 0; index < emiList.length; index++) {
      try {
        const emiData = emiList[index];
        let transList = emiData.transactionData ?? [];
        if (transList) transList.sort((a, b) => a.id - b.id);
        let transactionData: any = {};
        if (transList.length > 0) {
          transactionData = transList.find((el) => el.status == kCompleted);
          if (!transactionData) {
            transList = transList.filter((el) => el.subSource == kAutoDebit);
            if (transList.length > 0) transactionData = transList[0];
          }
        }
        const loanData = emiData.loan ?? {};

        let fetchTime = '-';
        if (loanData?.balanceFetchDate != null) {
          const dateStr = this.dateService.dateToReadableFormat(
            new Date(loanData?.balanceFetchDate),
          );
          fetchTime = `${dateStr.readableStr} ${dateStr.hours}:${dateStr.minutes} ${dateStr.meridiem}`;
        }

        let policyExpiryDate = null;
        if (loanData?.insuranceData?.response) {
          const responseData = JSON.parse(loanData.insuranceData.response);
          const policyIssuance = responseData.policyIssuance;
          if (Array.isArray(policyIssuance) && policyIssuance.length > 0) {
            const policy = policyIssuance[0];
            policyExpiryDate = policy.policy_expiry_date;
          }
        }
        const policy_expiry_date = policyExpiryDate
          ? this.typeService.jsonToReadableDate(policyExpiryDate)
          : '-';
        const disbList = loanData.disbursementData ?? [];
        let disbursementData: any = { amount: 0 };
        if (disbList.length > 0) disbursementData = disbList[0];
        const bankingData = loanData.bankingData ?? {};
        const subscriptionData = loanData.subscriptionData ?? {};
        const userData = emiData.user ?? {};
        const isPaid = emiData.payment_status == '1';
        const data = {
          userId: emiData.userId,
          Name: userData.fullName ?? '-',
          'Mobile number': this.cryptService.decryptPhone(userData.phone),
          'Loan ID': emiData.loanId,
          'Emi amount': Math.floor(
            emiData.principalCovered + emiData.interestCalculate,
          ),
          'Placed amount':
            (transactionData?.paidAmount ?? '-').toString() ?? '-',
          'Emi date': this.typeService.jsonToReadableDate(emiData.emi_date),
          'Current balance':
            loanData?.currentAccountBalance != null
              ? +loanData?.currentAccountBalance
              : '-',
          'Fetch time': fetchTime,
          'Emi paid date': '-',
          'Payment type': transactionData?.subSource ?? kAutoDebit,
          'Emi number': emiData.emiNumber ?? '-',
          UTR: transactionData?.utr ?? '-',
          "Today's EMI status": 'Response pending',
          'AD Response date':
            this.typeService.jsonToReadableDate(
              transactionData?.completionDate,
            ) ?? '-',
          'Amount disbursed': Math.floor(
            disbursementData.amount / 100,
          ).toString(),
          'Disbursement date': this.typeService.jsonToReadableDate(
            loanData.loan_disbursement_date,
          ),
          'Bank name': bankingData.mandateBank ?? '-',
          IFSC: bankingData.mandateIFSC ?? '-',
          'Account number': bankingData.mandateAccount ?? '-',
          'E-Mandate type': subscriptionData.mode ?? '-',
          Insurance: loanData?.insuranceId ? 'Yes' : 'No',
          'Insurance end date': policy_expiry_date,
          'Risk Category':
            loanData?.predictionData?.categorizationTag?.slice(0, -5) ?? '-',
          'Loan approved by':
            (
              await this.commonsharedService.getAdminData(
                loanData.manualVerificationAcceptId,
              )
            ).fullName ?? '-',
          'Follower name':
            (await this.commonsharedService.getAdminData(loanData.followerId))
              .fullName ?? '-',
          'AD Placed by': !transactionData
            ? 'system'
            : (
                await this.commonsharedService.getAdminData(
                  transactionData?.adminId,
                )
              ).fullName ?? '-',
          'Autodebit response': '',
          Platform:
            loanData?.appType == '1'
              ? EnvConfig.nbfc.nbfcShortName
              : process.env.APP_0,
        };
        if (isPaid) {
          data["Today's EMI status"] = kCompleted;
          data['Emi paid date'] = this.typeService.jsonToReadableDate(
            emiData.payment_done_date,
          );
          if (
            data['Payment type'] == kAutoDebit &&
            isPaid &&
            emiData['pay_type'] == kFullPay
          )
            data['Payment type'] = 'APP';
        } else if (!isPaid && type == kFailed) {
          data["Today's EMI status"] = kFailed;
          data['Autodebit response'] =
            this.commonsharedService.getFailedReason(
              transactionData?.response,
            ) ?? '-';
        } else if (!isPaid && type == 'TOTAL') {
          if (transactionData && transactionData?.status == kFailed) {
            data['Autodebit response'] =
              this.commonsharedService.getFailedReason(
                transactionData?.response,
              ) ?? '-';
            data["Today's EMI status"] = kFailed;
          } else if (!transactionData?.status)
            data["Today's EMI status"] = 'AD NOT PLACED';
        }

        rows.push(data);
      } catch (error) {}
    }

    return { count: emiData.count, rows };
  }

  private async getPaidEMIs(reqData) {
    let fromDate = reqData.fromDate;
    let toDate = reqData.endDate;
    if (!fromDate)
      fromDate = this.typeService.getGlobalDate(new Date()).toJSON();
    if (!toDate) toDate = this.typeService.getGlobalDate(new Date()).toJSON();

    let attributes = ['id', 'emi_amount'];
    let options: any = {
      where: {
        emi_date: { [Op.gte]: fromDate, [Op.lte]: toDate },
        payment_done_date: { [Op.gte]: fromDate },
        pay_type: kFullPay,
      },
    };
    const fullPayEMIList = await this.repository.getTableWhereData(
      attributes,
      options,
    );
    if (fullPayEMIList == k500Error) return kInternalError;

    attributes = ['emiId'];
    const emiInclude: SequelOptions = { model: EmiEntity };
    emiInclude.attributes = ['id', 'emi_amount'];
    emiInclude.where = {
      emi_date: { [Op.gte]: fromDate, [Op.lte]: toDate },
      payment_done_date: { [Op.gte]: fromDate },
    };
    const include = [emiInclude];
    options = {
      include,
      where: {
        status: kCompleted,
        subSource: { [Op.in]: ['APP', 'WEB', kDirectBankPay] },
        type: { [Op.in]: [kEMIPay, 'PARTPAY'] },
      },
    };
    const transList = await this.transRepo.getTableWhereData(
      attributes,
      options,
    );

    const emiPayEmiIds = transList.map((el) => el.emiData);
    emiPayEmiIds.sort();
    let combinedEmiIds = [...fullPayEMIList, ...emiPayEmiIds];
    const uniqueCombinations = [
      ...new Set(combinedEmiIds.map((obj) => `${obj.id}-${obj.emi_amount}`)),
    ];
    const uniqueObjects = uniqueCombinations.map((combination) => {
      const [id, amount] = combination.split('-');
      return { id: id, amount: amount };
    });
    return uniqueObjects;
  }

  async sendUpcomingNotifyEmis(emiData) {
    try {
      for (let i = 0; i < emiData.length; i++) {
        try {
          const emi = emiData[i];
          const appType = emi?.loan?.appType;
          const template = await this.commonsharedService.getEmailTemplatePath(
            kEmailPaymentReminder,
            appType,
            null,
            null,
          );
          const htmlData: any = fs.readFileSync(template, 'utf-8');
          const userData = emi.user;
          if (
            !gIsPROD &&
            !(
              userData.email.includes(
                EnvConfig.emailDomain.companyEmailDomain1,
              ) ||
              userData.email.includes(EnvConfig.emailDomain.companyEmailDomain2)
            )
          )
            continue;
          userData.phone = this.cryptService.decryptPhone(userData.phone);
          const key = emi.loanId * 484848;
          const payment_redirect = nPaymentRedirect + key;
          const smsOptions = {
            smsId:
              appType == 1
                ? kMsg91Templates.PAYMENT_REMINDER
                : kLspMsg91Templates.PAYMENT_REMINDER,
            name: userData.fullName,
            amount: this.typeService.amountNumberWithCommas(
              Math.floor(
                (emi?.principalCovered ?? 0) +
                  (emi?.interestCalculate ?? 0) -
                  (emi?.paid_principal ?? 0) -
                  (emi?.paid_interest ?? 0) +
                  (emi?.penalty ?? 0) +
                  (emi?.regInterestAmount ?? 0) -
                  (emi?.paidRegInterestAmount ?? 0) +
                  (emi?.bounceCharge ?? 0) +
                  (emi?.gstOnBounceCharge ?? 0) -
                  (emi?.paidBounceCharge ?? 0) +
                  (emi?.dpdAmount ?? 0) +
                  (emi?.penaltyChargesGST ?? 0) -
                  (emi?.paidPenalCharge ?? 0) +
                  (emi?.legalCharge ?? 0) +
                  (emi?.legalChargeGST ?? 0) -
                  (emi?.paidLegalCharge ?? 0),
              ),
            ),
            date: this.typeService.dateToFormatStr(emi.emi_date),
            payment_link: payment_redirect,
            short_url: '1',
            loanId: emi.loanId,
            appType,
          };
          this.allSmsService.sendSMS(userData.phone, MSG91, smsOptions);
          await this.sendPaymentReminderMail(emi, htmlData);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendPaymentReminderMail(emi, htmlData) {
    try {
      const userData = emi.user;
      const due_amount =
        (emi?.principalCovered ?? 0) +
        (emi?.interestCalculate ?? 0) -
        (emi?.paid_principal ?? 0) -
        (emi?.paid_interest ?? 0) +
        (emi?.penalty ?? 0) +
        (emi?.regInterestAmount ?? 0) -
        (emi?.paidRegInterestAmount ?? 0) +
        (emi?.bounceCharge ?? 0) +
        (emi?.gstOnBounceCharge ?? 0) -
        (emi?.paidBounceCharge ?? 0) +
        (emi?.dpdAmount ?? 0) +
        (emi?.penaltyChargesGST ?? 0) -
        (emi?.paidPenalCharge ?? 0) +
        (emi?.legalCharge ?? 0) +
        (emi?.legalChargeGST ?? 0) -
        (emi?.paidLegalCharge ?? 0);
      const loanId = emi.loanId;
      let due_date: any = this.dateService.dateToReadableFormat(emi?.emi_date);
      const appType = emi?.loan?.appType;
      const key = loanId * 484848;
      const payment_redirect = nPaymentRedirect + key;
      htmlData = htmlData.replace('##NAME##', userData.fullName);
      htmlData = htmlData.replace('##LOANID##', loanId);
      htmlData = htmlData.replace('##DUEDATE##', due_date.readableStr);
      htmlData = htmlData.replace('##DUEAMOUNT##', due_amount);
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = htmlData.replace('##link##', payment_redirect);
      htmlData = this.replaceAll(
        htmlData,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace(
        '##COLLECTIONEMAIL##',
        EnvConfig.mail.collectionEmail,
      );
      htmlData = htmlData.replace(
        '##COLLECTIONCONTACT##',
        EnvConfig.number.collectionNumber,
      );
      let replyTo = kCollectionEmail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = klspCollectionMail;
      }
      await this.sharedNotification.sendMailFromSendinBlue(
        userData.email,
        'Payment Reminder',
        htmlData,
        userData.id,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateAllEmiDues() {
    try {
      const today = this.typeService.getGlobalDate(new Date());
      const options = {
        where: {
          payment_status: '0',
          payment_due_status: { [Op.ne]: '1' },
          emi_date: { [Op.lt]: today.toJSON() },
        },
      };
      const emiData = await this.repository.getTableWhereData(
        ['id', 'loanId'],
        options,
      );
      if (emiData === k500Error) return kInternalError;
      const loanIds: any[] = [...new Set(emiData.map((item) => item.loanId))];
      const id = emiData.map((e) => e?.id);
      await this.repository.updateRowData({ payment_due_status: '1' }, id);
      await this.calculation.calculateCLTV({ loanIds });
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateAllEmiDuesPenalty(query) {
    try {
      const defaulters = await this.getAllDefaulters();
      if (defaulters?.message) return defaulters;
      const blockUsers = [];
      const blockUsersHistory = [];
      const defaultersLength = defaulters.length;
      for (let i = 0; i < defaultersLength; i++) {
        try {
          const ele = defaulters[i];
          const emiId = ele.id;
          const userId = ele.userId;
          const loanId = ele.loanId;
          const user = ele.user;
          const loan = ele.loan;
          const emiData = loan.emiData;
          let principalAmount = ele?.principalCovered ?? 0;
          const transData = ele?.transactionData;
          let dpd_Amount = ele?.dpdAmount ?? 0;
          let transPrincipalAmount = 0;
          const penaltyChargesGST = ele?.penaltyChargesGST ?? 0;
          let reqInterestAmount = ele?.regInterestAmount ?? 0;
          const penaltyChargeUpdate = ele?.penaltyCharges ?? {};
          const modifyCalculation =
            loan?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
          let currDelayDays = 0;

          //update principal amount if part payment
          transData.filter((el) => {
            if (el?.principalAmount > 0)
              transPrincipalAmount += el?.principalAmount ?? 0;
          });
          principalAmount = principalAmount - transPrincipalAmount;

          emiData.forEach((e) => {
            try {
              currDelayDays += e?.penalty_days ?? 0;
            } catch (error) {}
          });

          const isBlacklist = user?.isBlacklist ?? '0';
          const emiAmount = parseFloat((+ele.emi_amount).toFixed(2));
          const emiDate = ele.emi_date;
          const toDay = new Date();
          const diffDays = this.typeService.differenceInDays(emiDate, toDay);
          if (diffDays > 0) {
            // If penalty is more than 5 days then user will be blacklisted
            if (
              (diffDays >= 5 || currDelayDays >= 5) &&
              isBlacklist != '1' &&
              !blockUsers.includes(userId)
            ) {
              blockUsers.push(userId);
              blockUsersHistory.push({
                userId,
                isBlacklist: '1',
                blockedBy: SYSTEM_ADMIN_ID,
              });
            }
            const interestRate = parseFloat(loan.interestRate);
            const isUpdate = ele.penalty_update_date
              ? ele.penalty_update_date ==
                this.typeService.getGlobalDate(toDay).toJSON().substring(0, 10)
                ? false
                : true
              : true;
            // get new logic penalty amount
            const penaltyData = this.calcuPenaltyCharges(
              loan,
              principalAmount,
              diffDays,
              penaltyChargeUpdate,
              dpd_Amount,
              reqInterestAmount,
              penaltyChargesGST,
            );

            // penaltyCharge as per DPD days
            if (penaltyData.key == 'DPD_1_TO_3')
              penaltyChargeUpdate.DPD_1_TO_3 = true;
            else if (penaltyData.key == 'DPD_4_TO_14')
              penaltyChargeUpdate.DPD_4_TO_14 = true;
            else if (penaltyData.key == 'DPD_15_TO_30')
              penaltyChargeUpdate.DPD_15_TO_30 = true;
            else if (penaltyData.key == 'DPD_31_TO_60')
              penaltyChargeUpdate.DPD_31_TO_60 = true;
            else if (penaltyData.key == 'DPD_MORE_THAN_61')
              penaltyChargeUpdate.DPD_MORE_THAN_61 = true;

            // this penalty + interest
            let amount =
              isUpdate && !modifyCalculation
                ? (emiAmount * (interestRate * 2)) / 100
                : 0;

            const penalty = +((ele?.penalty ?? 0) + amount).toFixed(2);
            const totalPenalty = +((ele?.totalPenalty ?? 0) + amount).toFixed(
              2,
            );
            const updatedData = {
              penalty,
              totalPenalty,
              penalty_days: diffDays,
              penalty_update_date: this.typeService
                .getGlobalDate(toDay)
                .toJSON()
                .substring(0, 10),
              penaltyCharges: penaltyChargeUpdate,
              dpdAmount: modifyCalculation ? penaltyData.dpdAmount ?? 0 : 0,
              regInterestAmount: modifyCalculation
                ? penaltyData.regularIntrestPA ?? 0
                : 0,
              penaltyChargesGST: modifyCalculation
                ? penaltyData?.penaltyChargesGST ?? 0
                : 0,
            };
            await this.repository.updateRowData(updatedData, emiId);
            const totalRepay: any = await this.totalRepayAmount(userId, loanId);
            if (totalRepay?.message) return totalRepay;
            const TotalRepayAmount = totalRepay?.totalRepayAmount;
            await this.loanRepo.updateRowData({ TotalRepayAmount }, loanId);
          }
        } catch (error) {}
      }
      await this.userRepo.updateRowWhereData(
        { isBlacklist: '1' },
        { where: { id: blockUsers } },
      );
      await this.userBlockHistoryRepo.bulkCreate(blockUsersHistory);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAllDefaulters() {
    try {
      const attributes = [
        'id',
        'emi_date',
        'emi_amount',
        'penalty',
        'totalPenalty',
        'penalty_days',
        'penalty_update_date',
        'loanId',
        'userId',
        'short_url',
        'emiNumber',
        'principalCovered',
        'penaltyCharges',
        'dpdAmount',
        'regInterestAmount',
        'penaltyChargesGST',
      ];

      const transInclude = {
        model: TransactionEntity,
        attributes: ['id', 'principalAmount'],
        required: false,
        where: { status: kCompleted },
      };
      const emiInc = {
        model: EmiEntity,
        attributes: [
          'penalty_days',
          'loanId',
          'emi_amount',
          'totalPenalty',
          'penalty',
          'emiNumber',
          'emi_date',
          'penaltyCharges',
        ],
      };
      const include = [
        {
          model: loanTransaction,
          attributes: [
            'id',
            'netApprovedAmount',
            'interestRate',
            'duration',
            'penaltyCharges',
          ],
          include: [emiInc],
        },
        {
          model: registeredUsers,
          attributes: ['id', 'fullName', 'email', 'phone', 'isBlacklist'],
        },
        transInclude,
      ];
      const options = {
        where: {
          payment_status: '0',
          payment_due_status: '1',
        },
        include,
        order: [['id', 'desc']],
      };
      const data = await this.repository.getTableWhereData(attributes, options);
      if (data === k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private calcuPenaltyCharges(
    loan,
    principalAmount,
    currDelayDays,
    penaltyChargeUpdate,
    dpd_Amount,
    regInterestAmount,
    penaltyChargesGST,
  ) {
    try {
      const interestRate = +loan?.interestRate;
      let key: any;
      if (
        currDelayDays >= 1 &&
        currDelayDays <= 3 &&
        penaltyChargeUpdate.DPD_1_TO_3 == false
      ) {
        key = 'DPD_1_TO_3';
      } else if (
        currDelayDays >= 4 &&
        currDelayDays <= 14 &&
        penaltyChargeUpdate.DPD_4_TO_14 == false
      ) {
        key = 'DPD_4_TO_14';
      } else if (
        currDelayDays >= 15 &&
        currDelayDays <= 30 &&
        penaltyChargeUpdate.DPD_15_TO_30 == false
      ) {
        key = 'DPD_15_TO_30';
      } else if (
        currDelayDays >= 31 &&
        currDelayDays <= 60 &&
        penaltyChargeUpdate.DPD_31_TO_60 == false
      ) {
        key = 'DPD_31_TO_60';
      } else if (
        currDelayDays > 60 &&
        penaltyChargeUpdate.DPD_MORE_THAN_61 == false
      ) {
        key = 'DPD_MORE_THAN_61';
      }

      let dpdAmount = 0;
      let addPenaltyChargesGST = 0;
      if (key) {
        dpdAmount = (principalAmount * 5) / 100;
        addPenaltyChargesGST = +(
          (dpdAmount * GLOBAL_CHARGES.GST) /
          100
        ).toFixed(3);
      }
      //per day
      let regularIntrestPA = (interestRate * 1 * principalAmount) / 100;
      let penaltyAmount = dpdAmount + regularIntrestPA;
      if (key) {
        penaltyAmount = penaltyAmount + addPenaltyChargesGST;
        penaltyChargesGST = addPenaltyChargesGST + penaltyChargesGST;
      }

      dpdAmount = +(dpdAmount + dpd_Amount).toFixed(3);
      regularIntrestPA = +(regularIntrestPA + regInterestAmount).toFixed(3);

      return {
        penaltyAmount,
        key,
        dpdAmount,
        regularIntrestPA,
        penaltyChargesGST,
      };
    } catch (error) {}
  }

  async totalRepayAmount(userId, loanId) {
    try {
      const options = {
        where: { userId, loanId },
        order: [['id', 'ASC']],
      };
      const attr = [
        'id',
        'emi_amount',
        'penalty',
        'penalty_days',
        'payment_status',
        'payment_due_status',
      ];
      const emiData = await this.repository.getTableWhereData(attr, options);
      if (emiData === k500Error) return kInternalError;
      let totalRepayAmount = 0;
      let totalDueEMIAmount = 0;
      let totalDuePenalty = 0;
      let totalDueAmount = 0;
      let totalDueDay;
      for (let i = 0; i < emiData.length; i++) {
        try {
          const ele = emiData[i];
          const emiAmount = +ele.emi_amount;
          const penalty = ele?.penalty ? ele?.penalty : 0;
          const penaltyDays = ele?.penalty_days;
          totalRepayAmount = totalRepayAmount + emiAmount + penalty;
          if (ele?.payment_status == '0' && ele?.payment_due_status == '1') {
            totalDueAmount = totalDueAmount + emiAmount + penalty;
            totalDueEMIAmount = totalDueEMIAmount + emiAmount;
            totalDuePenalty = totalDuePenalty + penalty;
            if (!totalDueDay && penaltyDays) totalDueDay = penaltyDays;
          }
        } catch (error) {}
      }
      return {
        totalRepayAmount: this.typeService.manageAmount(totalRepayAmount),
        totalDueAmount: this.typeService.manageAmount(totalDueAmount),
        totalDueEMIAmount: this.typeService.manageAmount(totalDueEMIAmount),
        totalDuePenalty: this.typeService.manageAmount(totalDuePenalty),
        totalDueDay,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region fun Send Over Due Notification
  async funSendOverDueNotification(query) {
    try {
      let options: any = {
        where: { payment_status: '0', payment_due_status: '1' },
        include: { model: loanTransaction, attributes: ['penaltyCharges'] },
      };
      if (query?.loanId) options.where.loanId = query?.loanId;

      let att = [
        'id',
        'loanId',
        'userId',
        'payment_status',
        'penalty_days',
        'loanId',
        'emi_amount',
        'emiNumber',
        'emi_date',
        'penalty',
        'principalCovered',
        'interestCalculate',
        'paid_principal',
        'paid_interest',
        'paid_penalty',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
        'paidRegInterestAmount',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
      ];
      const emiList = await this.repository.getTableWhereData(att, options);
      if (!emiList || emiList === k500Error) return kInternalError;
      emiList.forEach((emi) => {
        if (!emi?.loan?.penaltyCharges?.MODIFICATION_CALCULATION)
          emi.bounceCharge = 0;
      });

      const loanIds: any[] = [...new Set(emiList.map((item) => item.loanId))];
      const userIds: any[] = [...new Set(emiList.map((item) => item.userId))];
      options = { where: { id: loanIds } };
      att = ['id', 'userId', 'netApprovedAmount', 'appType'];
      const loanList = await this.loanRepo.getTableWhereData(att, options);
      if (!loanList || loanList === k500Error) return kInternalError;

      options = { where: { id: userIds } };
      att = ['id', 'fullName', 'email', 'phone'];
      const userList = await this.userRepo.getTableWhereData(att, options);
      if (!userList || userList === k500Error) return kInternalError;
      const finalData = [];
      for (let index = 0; index < loanIds.length; index++) {
        try {
          const loanId = loanIds[index];
          const emiData = emiList.filter((f) => f.loanId === loanId);
          emiData.sort((a, b) => a.id - b.id);
          const userId = emiData[0]?.userId;
          const loanData = loanList.find((f) => f.id === loanId);
          const userData = userList.find((f) => f.id === userId);
          const temp: any = {};
          temp.loanId = emiData[0]?.loanId;
          temp.dueDate = emiData[0]?.emi_date;
          temp.userId = userId;
          temp.name = userData?.fullName ?? '-';
          const approvedAmount = loanData?.netApprovedAmount ?? '-';
          if (approvedAmount != '-')
            temp.loanAmount = parseFloat(approvedAmount).toLocaleString();
          const appType = loanData?.appType;
          temp.appType = appType;
          /// get emi data
          let dueDay = 0;
          let dueAmount = 0;
          temp.contact = 'wa.link/x0k6kp';
          temp.brandName = kInfoBrandNameNBFC;
          emiData.forEach((ele) => {
            try {
              if (ele.payment_status == '0') {
                if ((ele?.penalty_days ?? 0) > dueDay)
                  dueDay = ele.penalty_days ?? 0;
                dueAmount +=
                  (ele?.principalCovered ?? 0) +
                  (ele?.interestCalculate ?? 0) -
                  (ele?.paid_principal ?? 0) -
                  (ele?.paid_interest ?? 0) +
                  (ele?.penalty ?? 0) +
                  (ele?.regInterestAmount ?? 0) -
                  (ele?.paidRegInterestAmount ?? 0) +
                  (ele?.bounceCharge ?? 0) +
                  (ele?.gstOnBounceCharge ?? 0) -
                  (ele?.paidBounceCharge ?? 0) +
                  (ele?.dpdAmount ?? 0) +
                  (ele?.penaltyChargesGST ?? 0) -
                  (ele?.paidPenalCharge ?? 0) +
                  (ele?.legalCharge ?? 0) +
                  (ele?.legalChargeGST ?? 0) -
                  (ele?.paidLegalCharge ?? 0);
              }
            } catch (error) {}
          });
          temp.totalAmountDue = (dueAmount ?? 0).toFixed(2);
          temp.dueday = dueDay;
          ///
          const key = loanId * 484848;
          temp.link = nPaymentRedirect + key;
          temp.email = userData?.email;
          temp.phone = userData?.phone;
          temp.emiData = emiData;
          finalData.push(temp);
        } catch (error) {}
      }
      await this.sendNotificationToAlldefaulters(finalData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region send notification to all defaulters
  private async sendNotificationToAlldefaulters(list) {
    try {
      const listLength = list.length;
      for (let index = 0; index < listLength; index++) {
        try {
          const data = list[index];
          const userId = data.userId;
          const appType = data.appType;
          // send mail
          if (data?.email)
            this.sharedNotification.sendEmail(kTOverDue, data.email, data);

          //send sms
          const smsOptions = {
            name: data.name,
            dueamount: data.totalAmountDue,
            dueday: data.dueday,
            url: data.link,
            contact: data.contact,
            short_url: '1',
          };
          const title = `Your account is ${data.dueday} days past-due by Rs. ${data.totalAmountDue}`;
          const content = `Dear ${data.name}, Your account is ${data.dueday} days past-due by Rs. ${data.totalAmountDue} and request your immediate attention. Please make the payment ASAP or contact us on ${data.contact} to make necessary arrangements. Pay Now, Brand name : ${data.brandName}`;
          const userData = [];
          userData.push({ userId, appType });
          const body = {
            userData,
            content,
            title,
            isMsgSent: true,
            smsOptions,
            smsId:
              appType == 1
                ? kMsg91Templates.EMIOverDueSMSID
                : kLspMsg91Templates.EMIOverDueSMSID,
          };
          await this.sharedNotification.sendNotificationToUser(body);
          await this.typeService.delay(200);
        } catch (error) {}
      }
    } catch (error) {}
  }
  //#endregion

  //#region -> Dashboard
  async statusInsights(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount == 'true';
      const type = reqData.type;
      if (!type && !isCountOnly) return kParamMissing('type');
      const page = reqData.page;
      if (!page && !isCountOnly) return kParamMissing('page');

      // Get dashboard count
      if (isCountOnly) return await this.statusInsightsCount(reqData);
      // Get details for particular data
      // 1 -> Pre EMI, 2 -> Due EMI, 3 -> Pre EMI

      // Pre EMI
      if (type == '1') return await this.preEMIDetailsForDashboard(reqData);
      // Dashboard paid on due day details
      if (type == '2') return await this.paidOnDueDetailsForDashboard(reqData);
      // Post EMI
      if (type == '3') return await this.postEMIDetailsForDashboard(reqData);
      else return kInvalidParamValue('type');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Get dashboard count
  private async statusInsightsCount(reqData) {
    try {
      // Params validation
      const targetDate = reqData.targetDate;
      if (!targetDate) return kParamMissing('targetDate');

      const monthRange = this.dateService.getMonthRange(targetDate);
      const minDate = monthRange.firstDate.toJSON();
      const lastDateOfMonth = monthRange.lastDate;
      const today = this.typeService.getGlobalDate(new Date());
      const maxDate =
        today.getTime() <= lastDateOfMonth.getTime()
          ? today.toJSON()
          : monthRange.lastDate.toJSON();

      const emiAttributes = [
        'userId',
        'id',
        'emi_date',
        'pay_type',
        'fullPayPrincipal',
        'fullPayInterest',
        'fullPayPenalty',
        'principalCovered',
        'interestCalculate',
        'penalty',
        'payment_status',
        'payment_due_status',
        'payment_done_date',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
        'partPaymentPenaltyAmount',
        'loanId',
      ];
      const loanInclude: SequelOptions = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus'],
      };
      const emiOptions: any = {
        where: {
          emi_date: {
            [Op.gte]: minDate,
            [Op.lte]: maxDate,
          },
        },
        include: [loanInclude],
        order: [['id', 'desc']],
      };
      const emiListData: any = await this.repository.getTableWhereData(
        emiAttributes,
        emiOptions,
      );
      if (emiListData == k500Error) return kInternalError;
      const loanIds = emiListData.map((el) => el.loanId);

      const attributes = [
        'id',
        'paidAmount',
        'type',
        'penaltyAmount',
        'principalAmount',
        'interestAmount',
        'emiId',
        'loanId',
      ];
      const options = {
        where: {
          loanId: { [Op.in]: loanIds },
          status: kCompleted,
        },
      };
      const transList = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;

      const finalData = {
        totalAmount: 0,
        prePaidAmount: 0,
        prePaidCount: 0,
        onTimeAmount: 0,
        onTimeCount: 0,
        postPaidAmount: 0,
        postPaidCount: 0,
      };
      emiListData.forEach((el) => {
        const transactionData = transList.filter(
          (subEl) => subEl?.loanId == el?.loanId,
        );
        if (el.loan) el.loan.transactionData = [...transactionData];
        const data = this.calculation.getRateEMI(el);
        finalData.totalAmount += data.totalExpected;
        if (data.paymentStatus == 'PRE_PAID') {
          finalData.prePaidCount++;
          finalData.prePaidAmount += data.totalPaid;
        } else if (data.paymentStatus == 'ON_TIME') {
          finalData.onTimeCount++;
          finalData.onTimeAmount += data.totalPaid;
        } else if (data.paymentStatus == 'POST_PAID') {
          finalData.postPaidCount++;
          finalData.postPaidAmount += data.totalPaid;
        } else if (data.paymentStatus == 'PARTIAL_PAID') {
          finalData.postPaidCount++;
          finalData.postPaidAmount += data.totalPaid;
        }
      });
      finalData.totalAmount = Math.floor(finalData.totalAmount);

      const finalizedData = {
        preEMIData: {
          ratio: parseFloat(
            ((finalData.prePaidAmount / finalData.totalAmount) * 100).toFixed(
              2,
            ),
          ),
          amount: Math.floor(finalData.prePaidAmount),
          count: finalData.prePaidCount,
        },
        postEMIData: {
          ratio: parseFloat(
            ((finalData.postPaidAmount / finalData.totalAmount) * 100).toFixed(
              2,
            ),
          ),
          amount: Math.floor(finalData.postPaidAmount),
          count: finalData.postPaidCount,
        },
        dueEMIData: {
          ratio: parseFloat(
            ((finalData.onTimeAmount / finalData.totalAmount) * 100).toFixed(2),
          ),
          amount: Math.floor(finalData.onTimeAmount),
          count: finalData.onTimeCount,
        },
      };
      return finalizedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Dashboard pre emi details
  private async preEMIDetailsForDashboard(reqData) {
    try {
      const isCountOnly = reqData.isCount == 'true';
      const isDownload = reqData.download == 'true';
      const page = reqData.page;
      if (!page && !isCountOnly) return kParamMissing('page');

      const searchData: any = this.commonService.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      if (!isCountOnly) {
        if (!reqData.minDate) return kParamMissing('minDate');
        if (!reqData.maxDate) return kParamMissing('maxDate');
      }

      // Query preparation
      const offsetValue = page * PAGE_LIMIT - PAGE_LIMIT;
      let attributes = `SELECT "principalCovered" as "principalAmount",`;
      if (!isCountOnly) {
        attributes += `"emi_date", "user"."id", "user"."email", "user"."fullName", "user"."phone", "emi"."loanId", "user"."completedLoans",
        "loan"."loan_disbursement_date" , "emi"."payment_done_date", "master"."status",`;
      }
      const caseStr = `CASE pay_type 
      WHEN 'FULLPAY' THEN "fullPayInterest" 
      WHEN 'EMIPAY' THEN "interestCalculate" END 
      AS "interestAmount"
      FROM "EmiEntities" AS "emi"`;
      let join = ``;
      if (!isCountOnly) {
        join = `INNER JOIN "registeredUsers" AS "user"
        ON "emi"."userId" = "user"."id"
        INNER JOIN "MasterEntities" AS "master"
        ON "user"."masterId" = "master"."id"
        INNER JOIN "loanTransactions" AS "loan"
        ON "emi"."loanId" = "loan"."id"`;
      }
      let where = `WHERE "emi_date" >= '${reqData.minDate}' AND "emi_date" <= '${reqData.maxDate}'`;
      let groupBy = `GROUP BY "emi".id`;
      if (!isCountOnly)
        groupBy += `,"user"."id" , "user"."fullName", "loan_disbursement_date", "master"."status"`;
      const having = `HAVING "payment_done_date" < "emi_date"`;
      let limit = ``;
      let offset = ``;
      if (!isCountOnly && !isDownload) {
        limit = `LIMIT ${PAGE_LIMIT}`;
        offset = `OFFSET ${offsetValue}`;
      }
      if (searchData.text != '') {
        // Search with user's name
        if (searchData.type == 'Name')
          where += ` AND "user"."fullName" ILIKE '${searchData.text}%'`;
        // Search with loanId
        else if (searchData.type == 'LoanId')
          where += ` AND "emi"."loanId" = ${searchData.text}`;
        // Search with number
        else if (searchData.type == 'Number')
          where += ` AND "user"."phone" LIKE '${searchData.text}'`;
      }

      let rawQuery = `${attributes} ${caseStr} ${join} ${where} ${groupBy} ${having} ${offset} ${limit}`;
      const preEMIList = await this.repoManager.injectRawQuery(
        EmiEntity,
        rawQuery,
      );
      if (preEMIList == k500Error) return kInternalError;

      // For count
      if (isCountOnly) {
        const preEMICount = preEMIList.length;
        let preEMIAmount = 0;
        preEMIList.forEach((el) => {
          try {
            preEMIAmount += el.principalAmount + el.interestAmount;
          } catch (error) {}
        });
        preEMIAmount = Math.floor(preEMIAmount);
        let preEMIRatio = (preEMIAmount * 100) / reqData.totalAmount;
        preEMIRatio = parseFloat(preEMIRatio.toFixed(2));
        return {
          ratio: preEMIRatio,
          amount: preEMIAmount,
          count: preEMICount,
        };
      }

      // For details with pagination or download
      const rows = preEMIList;
      const preparedList = [];
      rows.forEach((el) => {
        const loanStatus = el.status?.loan;
        if (loanStatus == 7) el.status = 'Not applied';
        else if (loanStatus == 6) el.status = 'Loan active';
        else if (loanStatus == 2) el.status = 'Loan rejected';
        else if (loanStatus == -1 || loanStatus == 1 || loanStatus == 3)
          el.status = 'Loan applied';
        const paidDateInfo = this.dateService.dateToReadableFormat(
          el.payment_done_date,
        );
        const disbursedDateInfo = this.dateService.dateToReadableFormat(
          el.loan_disbursement_date,
        );
        const emiDateInfo = this.dateService.dateToReadableFormat(el.emi_date);

        preparedList.push({
          userId: el.id,
          Name: el.fullName ?? '',
          Phone: this.cryptService.decryptPhone(el.phone),
          Email: el.email ?? '',
          'Loan Id': el.loanId,
          'Completed loans': el.completedLoans ?? 0,
          'Emi date': emiDateInfo.readableStr,
          'Repayment date': paidDateInfo.readableStr,
          'Emi amount': Math.floor(el.principalAmount + el.interestAmount),
          'Disbursement date': disbursedDateInfo.readableStr,
          'current loan status': el.status,
        });
      });

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Pre emi users'],
          data: [preparedList],
          sheetName: 'Pre emi users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      // Get total count
      let count = 0;
      if (preparedList.length > 0) {
        attributes = `SELECT COUNT("emi"."id") FROM "EmiEntities" AS "emi"`;
        groupBy = `GROUP BY "payment_done_date", "emi_date", "emi"."id"`;
        join = ``;
        if (searchData.text != '') {
          join = `INNER JOIN "registeredUsers" AS "user"
        ON "emi"."userId" = "user"."id"`;
        }
        rawQuery = `${attributes} ${join} ${where} ${groupBy} ${having}`;
        const preEMICount = await this.repoManager.injectRawQuery(
          EmiEntity,
          rawQuery,
        );
        if (preEMICount == k500Error) return kInternalError;
        count = preEMICount.length;
      }

      return { rows: preparedList, count };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Dashboard post emi details
  private async postEMIDetailsForDashboard(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount == 'true';
      const isDownload = reqData.download == 'true';
      const page = reqData.page;
      if (!page && !isCountOnly) return kParamMissing('page');

      const searchData: any = await this.commonService.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      if (!isCountOnly) {
        if (!reqData.minDate) return kParamMissing('minDate');
        if (!reqData.maxDate) return kParamMissing('maxDate');
      }

      const query1 = `SELECT "EmiEntities"."id", 
      SUM("TransactionEntities"."paidAmount") AS "paidAmount",
      SUM("fullPayPrincipal" + "fullPayInterest" + "fullPayPenalty") AS "fullPayAmount" FROM "EmiEntities"
      LEFT JOIN "TransactionEntities" ON "TransactionEntities"."emiId" = "EmiEntities"."id"
      AND "status" = 'COMPLETED'
      WHERE (("payment_status" = '1' AND "payment_done_date" > "emi_date")
      OR ("payment_status" = '0')) AND
      "emi_date" >= '${reqData.minDate}' AND "emi_date" <= '${reqData.maxDate}'
      GROUP BY "EmiEntities"."id"
      HAVING (SUM("TransactionEntities"."paidAmount") > 0
      OR SUM("fullPayPrincipal" + "fullPayInterest" + "fullPayPenalty") > 0)`;
      let targetList = await this.repoManager.injectRawQuery(EmiEntity, query1);
      if (targetList == k500Error) return kInternalError;
      const targetEmiIds = targetList.map((el) => el.id);
      if (targetEmiIds.length == 0) return { count: 0, rows: [] };

      // Query preparation
      const offsetValue = page * PAGE_LIMIT - PAGE_LIMIT;
      let attributes = `SELECT "principalCovered" as "principalAmount",`;
      if (!isCountOnly)
        attributes += `"emi"."userId", "emi"."loanId", "fullName" ,"phone", "loan_disbursement_date", "emi_date", "payment_done_date",`;
      let caseStr = `CASE pay_type 
        WHEN 'FULLPAY' THEN "fullPayInterest" 
        WHEN 'EMIPAY' THEN "interestCalculate" END 
        AS "interestAmount"
        FROM "EmiEntities" AS "emi"`;
      let where = `WHERE "emi"."id" IN (${targetEmiIds.join(',')})`;
      let groupBy = `GROUP BY "emi"."id"`;
      if (!isCountOnly)
        groupBy += `, "loan_disbursement_date", "fullName","phone"`;
      let join = '';
      if (!isCountOnly) {
        join = `INNER JOIN "loanTransactions" AS "loan"
        ON "loan"."id" = "emi"."loanId"
        INNER JOIN "registeredUsers" AS "user"
        ON "user"."id" = "emi"."userId"`;
      }
      let limit = ``;
      let offset = ``;
      if (!isCountOnly && !isDownload) {
        limit = `LIMIT ${PAGE_LIMIT}`;
        offset = `OFFSET ${offsetValue}`;
      }
      if (searchData.text != '') {
        // Search with user's name
        if (searchData.type == 'Name')
          where += ` AND "user"."fullName" ILIKE '${searchData.text}%'`;
        // Search with user's phone
        else if (searchData.type == 'Number')
          where += ` AND "user"."phone" LIKE '${searchData.text}'`;
        // Search with user's name
        else if (searchData.type == 'LoanId')
          where += ` AND "emi"."loanId" = ${searchData.text}`;
      }

      let rawQuery = `${attributes} ${caseStr} ${join} ${where} ${groupBy} ${offset} ${limit}`;
      const postEMIList = await this.repoManager.injectRawQuery(
        EmiEntity,
        rawQuery,
      );
      if (postEMIList == k500Error) return kInternalError;

      // For details with pagination or download
      const rows = postEMIList;
      const preparedList = [];
      rows.forEach((el) => {
        try {
          const disbursedDateInfo = this.dateService.dateToReadableFormat(
            el.loan_disbursement_date,
          );
          const dueDateInfo = this.dateService.dateToReadableFormat(
            el.emi_date,
          );
          const paidDateInfo = this.dateService.dateToReadableFormat(
            el.payment_done_date,
          );
          const loanStatus = el.status?.loan;
          delete el.status;
          if (loanStatus == 7) el.status = 'Not applied';
          else if (loanStatus == 6) el.status = 'Loan active';
          else if (loanStatus == 2) el.status = 'Loan rejected';
          else if (loanStatus == -1 || loanStatus == 1 || loanStatus == 3)
            el.status = 'Loan applied';

          preparedList.push({
            userId: el.userId,
            Name: el.fullName ?? '-',
            Phone: this.cryptService.decryptPhone(el.phone),
            'Loan Id': el.loanId,
            'Emi date': dueDateInfo.readableStr,
            'Paid date': paidDateInfo.readableStr,
            Amount: Math.floor(el.principalAmount + el.interestAmount),
            'Disbursement date': disbursedDateInfo.readableStr,
            Status: el.status,
          });
        } catch (error) {}
      });

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Post emi users'],
          data: [preparedList],
          sheetName: 'Post emi users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      // Get total count
      let count = 0;
      if (preparedList.length > 0) {
        attributes = `SELECT COUNT("emi"."id") FROM "EmiEntities" AS "emi"`;
        groupBy = `GROUP BY "emi"."id"`;
        join = ``;
        if (searchData.text != '')
          join = `INNER JOIN "registeredUsers" AS "user"
              ON "emi"."userId" = "user"."id"`;
        rawQuery = `${attributes} ${join} ${where} ${groupBy}`;
        const preEMICount = await this.repoManager.injectRawQuery(
          EmiEntity,
          rawQuery,
        );
        if (preEMICount == k500Error) return kInternalError;
        count = preEMICount.length;
      }

      return { count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Dashboard paid on due day details
  private async paidOnDueDetailsForDashboard(reqData) {
    try {
      const isCountOnly = reqData.isCount == 'true';
      const isDownload = reqData.download == 'true';
      const page = reqData.page;
      if (!page && !isCountOnly) return kParamMissing('page');
      const minDate = reqData.minDate;
      if (isCountOnly && !minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (isCountOnly && !maxDate) return kParamMissing('maxDate');

      const searchData: any = this.commonService.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      // Returns count and amount with success ratio
      if (isCountOnly) {
        const query = `SELECT "principalCovered" AS "principalAmount",
        "interestCalculate" AS "interestAmount",
        CASE "pay_type"
        WHEN 'FULLPAY' THEN "fullPayInterest" 
        WHEN 'EMIPAY' THEN "interestCalculate" END 
        AS "paidInterestAmount"
        FROM public."EmiEntities"
        WHERE "emi_date" >= '${reqData.minDate}'
        AND "emi_date" <= '${reqData.maxDate}'
        AND "payment_status" = '1'
        AND "emi_date" = "payment_done_date";`;

        const paidList = await this.repoManager.injectRawQuery(
          EmiEntity,
          query,
        );
        let totalPaidAmount = 0;
        paidList.forEach((el) => {
          totalPaidAmount += el.principalAmount;
          totalPaidAmount += el.paidInterestAmount;
        });
        totalPaidAmount = Math.floor(totalPaidAmount);
        const paidEMIs = paidList.length;

        // Get total data for base calculcation as of today
        const attributes: any = [
          [
            Sequelize.fn('SUM', Sequelize.col('principalCovered')),
            'principalAmount',
          ],
          [
            Sequelize.fn('SUM', Sequelize.col('interestCalculate')),
            'interestAmount',
          ],
        ];
        const options = {
          where: {
            emi_date: {
              [Op.gte]: reqData.minDate,
              [Op.lte]: this.typeService.getGlobalDate(new Date()).toJSON(),
            },
          },
        };
        const totalData = await this.repository.getRowWhereData(
          attributes,
          options,
        );
        let baseAmount = totalData.principalAmount + totalData.interestAmount;
        baseAmount = Math.floor(baseAmount);

        let ratio = (totalPaidAmount * 100) / baseAmount;
        ratio = parseFloat(ratio.toFixed(2));

        return {
          ratio,
          amount: totalPaidAmount,
          count: paidEMIs,
        };
      }

      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const attribute: any = [
        'emi_date',
        'loanId',
        'principalCovered',
        [
          Sequelize.literal(`CASE "pay_type"
      WHEN 'FULLPAY' THEN "fullPayInterest" 
      WHEN 'EMIPAY' THEN "interestCalculate" END`),
          'interestAmount',
        ],
        'userId',
      ];
      // User table join
      const userInclude: IncludeOptions = { model: registeredUsers };
      userInclude.attributes = ['fullName', 'phone'];
      if (searchData.text != '') {
        // Search by user's name
        if (searchData.type == 'Name') {
          userInclude.where = { fullName: { [Op.iRegexp]: searchData.text } };
        } // Search by user's phone number
        else if (searchData.type == 'Number') {
          userInclude.where = { phone: { [Op.like]: searchData.text } };
        }
      }
      const include = [userInclude];
      const options: any = {
        include,
        limit: PAGE_LIMIT,
        offset,
        order: [['id'], ['emi_date']],
        where: {
          emi_date: { [Op.gte]: reqData.minDate, [Op.lte]: reqData.maxDate },
          payment_status: '1',
          [Op.and]: Sequelize.literal(`"payment_done_date" = "emi_date"`),
        },
      };
      // Search by loanId
      if (searchData.text != '' && searchData.type == 'LoanId') {
        options.where.loanId = searchData.text;
      }
      if (isDownload) {
        delete options.limit;
        delete options.offset;
      }
      const emiListData = await this.repository.getTableWhereDataWithCounts(
        attribute,
        options,
      );
      if (emiListData == k500Error) return kInternalError;

      const finalizedList = [];
      for (let index = 0; index < emiListData.rows.length; index++) {
        const emiData = emiListData.rows[index];
        const userData = emiData.user ?? {};
        let paidAmount = emiData.principalCovered + emiData.interestAmount;
        paidAmount = Math.floor(paidAmount);
        const emiDateInfo = this.dateService.dateToReadableFormat(
          emiData.emi_date,
        );
        const preparedData = {
          userId: emiData.userId,
          Name: userData.fullName ?? '',
          Phone: this.cryptService.decryptPhone(userData.phone),
          LoanId: emiData.loanId,
          'Emi date': emiDateInfo.readableStr,
          'Paid amount': this.stringService.readableAmount(
            paidAmount,
            isDownload,
          ),
        };
        finalizedList.push(preparedData);
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Due emi users'],
          data: [finalizedList],
          sheetName: 'Due emi users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count: emiListData.count, rows: finalizedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // upcoming emi date total amount
  async upcomingEmiGetCount(query) {
    try {
      const start_date = this.typeService
        .getGlobalDate(query?.start_date ?? new Date())
        .toJSON();
      const end_date = this.typeService
        .getGlobalDate(query?.end_date ?? new Date())
        .toJSON();
      const where: any = {};
      const emiStatus = query?.emiStatus ?? '1';
      const cibilRiskCategory = query?.cibilRiskCategory ?? '-1';

      if (emiStatus === '3') {
        const data = await this.getDefulterData(where, start_date, end_date);
        if (data?.message) return data;
        if (data.length === 0) return { amount: 0 };
        where.loanId = data;
      }

      const whereClause = [
        `"EmiEntity"."payment_status" = '0'`,
        `"EmiEntity"."payment_due_status" = '0'`,
        `"EmiEntity"."emi_date" >= '${start_date}'`,
        `"EmiEntity"."emi_date" <= '${end_date}'`,
        ...(cibilRiskCategory !== '-1'
          ? [`"loan"."cibilBatchCategory" = ${parseInt(cibilRiskCategory)}`]
          : []),
        ...Object.entries(where).map(([key, value]) =>
          Array.isArray(value)
            ? `"EmiEntity"."${key}" IN (${value
                .map((v) => `'${v}'`)
                .join(',')})`
            : `"EmiEntity"."${key}" = '${value}'`,
        ),
      ].join(' AND ');

      const sqlQuery = `SELECT SUM(CAST("emi_amount" AS DOUBLE PRECISION)) AS "amount" 
      FROM "EmiEntities" AS "EmiEntity"
      ${
        cibilRiskCategory !== '-1'
          ? 'INNER JOIN "loanTransactions" AS "loan" ON "EmiEntity"."loanId" = "loan"."id"'
          : ''
      }
      WHERE ${whereClause}
      LIMIT 1`;

      const queryData: any = await this.repoManager.injectRawQuery(
        EmiEntity,
        sqlQuery,
      );
      return queryData[0];
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion -> Dashboard
  //#endregion

  // Emi details as per date range
  async getEmidateRange(query) {
    const start_date = this.typeService
      .getGlobalDate(query?.start_date ?? new Date())
      .toJSON();
    const end_date = this.typeService
      .getGlobalDate(query?.end_date ?? new Date())
      .toJSON();
    const page: number = query.page ?? 1;
    let searchText = query?.searchText;
    const download = query?.download;
    const whereName: any = {};
    const where: any = {};
    const emiStatus = query?.emiStatus ?? '1';
    const cibilRiskCategory = query?.cibilRiskCategory ?? '-1';

    // In case this function is used by any other functionality too.
    // Currently using for Exotel api -> admin/defaulter/callDefaulters
    const dataWithoutLimit = query.dataWithoutLimit?.toString() == 'true';
    const extraColumns = query.extraColumns ?? [];

    if (searchText) {
      if (!isNaN(searchText)) {
        searchText = this.cryptService.encryptPhone(searchText);
        if (searchText == k500Error) return k500Error;
        searchText = searchText.split('===')[1];
        whereName.phone = { [Op.like]: '%' + searchText + '%' };
      } else whereName.fullName = { [Op.iRegexp]: searchText };
    }
    if (emiStatus === '3') {
      const data = await this.getDefulterData(where, start_date, end_date);
      if (data?.message) return data;
      if (data.length === 0) return { rows: [], count: 0 };
      where.loanId = data;
    }

    const cibilInclude = {
      model: CibilScoreEntity,
      attributes: ['plScore', 'cibilScore'],
      required: false,
    };

    // Preparation -> Query
    const subscriptionInclude: any = { model: SubScriptionEntity };
    subscriptionInclude.attributes = ['mode'];
    // Table join -> Bank
    const bankingInclude: SequelOptions = { model: BankingEntity };
    bankingInclude.attributes = [
      'adminSalary',
      'otherDetails',
      'salary',
      'salaryDate',
    ];
    bankingInclude.required = false;

    const loanWhere =
      cibilRiskCategory !== '-1'
        ? { cibilBatchCategory: parseInt(cibilRiskCategory) }
        : {};
    const loanInclude = {
      model: loanTransaction,
      attributes: [
        'id',
        'loan_disbursement_date',
        'loan_disbursement_id',
        'loanStatus',
        'netApprovedAmount',
        'mandate_id',
        'manualVerificationAcceptId',
        'insuranceId',
        'appType',
        'cibilBatchCategory',
        'bankingId',
        'subscriptionId',
        'predictionId',
        'cibilId',
      ],
      where: loanWhere,
      include: [
        bankingInclude,
        subscriptionInclude,
        {
          model: disbursementEntity,
          attributes: ['id', 'amount', 'bank_name', 'account_number', 'ifsc'],
        },
        {
          model: PredictionEntity,
          attributes: ['id', 'categorizationTag'],
        },
        {
          model: InsuranceEntity,
          attributes: ['id', 'response'],
        },
        cibilInclude,
      ],
    };

    const userInclude = {
      model: registeredUsers,
      attributes: ['id', 'phone', 'fullName'],
      where: whereName,
    };
    const attributes = ['id', 'emi_date', 'emi_amount', 'loanId', 'emiNumber'];

    const options: any = {
      where: {
        ...where,
        payment_status: '0',
        payment_due_status: '0',
        emi_date: { [Op.gte]: start_date, [Op.lte]: end_date },
      },

      order: [['emi_date', 'ASC']],
      include: [loanInclude, userInclude],
    };
    if (download != 'true' && !dataWithoutLimit) {
      options.offset = (page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
      options.limit = 1 * PAGE_LIMIT;
    }

    // Hit -> Query
    const getData = await this.repository.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    // Validation -> Query data
    if (getData === k500Error) throw new Error();
    // Preparation -> API response
    const preparedatas = await this.prepareEmiDate(getData, extraColumns);
    return { rows: preparedatas, count: getData.count };
  }
  //#end region

  //#region get defulter data
  async getDefulterData(where, start_date, end_date): Promise<any> {
    try {
      const options: any = {
        where: {
          ...where,
          payment_status: '0',
          payment_due_status: '0',
          emi_date: { [Op.gte]: start_date, [Op.lte]: end_date },
        },
      };
      const att = ['loanId'];
      const result = await this.repository.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      const loanIds = [...new Set(result.map((item) => item.loanId))];
      if (loanIds.length > 0) {
        const opt = {
          where: {
            loanId: loanIds,
            payment_status: '0',
            payment_due_status: '1',
          },
        };
        const findData = await this.repository.getTableWhereData(att, opt);
        if (findData === k500Error) return kInternalError;
        return [...new Set(findData.map((item) => item.loanId))];
      } else return [];
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // prepare emidata
  private async prepareEmiDate(data, extraColumns = []) {
    const preparedData = [];
    const riskCategories = {
      0: 'Low Risk',
      1: 'Moderate Risk',
      2: 'High Risk',
    };
    for (let i = 0; i < data.rows.length; i++) {
      try {
        const element = data.rows[i];
        let policyExpiryDate = null;
        const cibilData = element?.loan?.cibilData;
        if (element?.loan?.insuranceData?.response) {
          const responseData = JSON.parse(element.loan.insuranceData.response);
          const policyIssuance = responseData.policyIssuance;
          if (Array.isArray(policyIssuance) && policyIssuance.length > 0) {
            const policy = policyIssuance[0];
            policyExpiryDate = policy.policy_expiry_date;
          }
        }
        const policy_expiry_date = policyExpiryDate
          ? policyExpiryDate.replace(' 00:00:00', '')
          : '-';
        let id = element?.loan.manualVerificationAcceptId;
        let mobile = element?.user.phone;
        let phone = await this.cryptService.decryptPhone(mobile);
        const adminId = await this.commonsharedService.getAdminData(id);
        const appType = element?.loan?.appType;

        let cibilRiskCategory =
          riskCategories[element?.loan?.cibilBatchCategory] || '-';

        const passdata: any = {
          // 'CIBIL Risk category': cibilRiskCategory,
          userId: element?.user.id ?? '-',
          Name: element?.user.fullName ?? '-',
          'Mobile Number': phone ?? '-',
          'Loan Id': element?.loanId ?? '-',
          'App platform':
            element?.loan?.appType == 1
              ? EnvConfig.nbfc.nbfcShortName
              : EnvConfig.nbfc.appName,
          'Emi Amount': element?.emi_amount ?? '-',
          'Emi Type': 'EMI - ' + element?.emiNumber ?? '-',
          'Emi Date': (element?.emi_date ?? '-').replace('T10:00:00.000Z', ''),
          'Salary Date': element?.loan?.bankingData?.salaryDate ?? '-',
          'Approved Salary':
            element?.loan?.bankingData?.adminSalary ??
            element?.loan?.bankingData?.salary ??
            element?.loan?.bankingData?.otherDetails?.salary?.average ??
            '-',
          'Amount Disbursed': element?.loan.netApprovedAmount ?? '-',
          'Disbursedment Date': (
            element?.loan.loan_disbursement_date ?? '-'
          ).replace('T10:00:00.000Z', ''),
          'Bank Name': element?.loan.disbursementData[0].bank_name ?? '-',
          IFSC: element?.loan.disbursementData[0].ifsc ?? '-',
          'Account Number':
            element?.loan.disbursementData[0].account_number ?? '-',
          'Emandate Type': element?.loan?.subscriptionData?.mode ?? '-',
          Insurance: element?.loan?.insuranceId ? 'Yes' : 'No',
          'Insurance End Date': policy_expiry_date,
          'Risk Category':
            element?.loan?.predictionData?.categorizationTag?.slice(0, -5) ??
            '-',
          'Loan Approved By': adminId?.fullName ?? '-',
          'PL Score': cibilData?.plScore ?? '-',
          'Cibil Score': cibilData?.cibilScore ?? '-',
          appType,
        };
        if (extraColumns.includes('emiId')) passdata.emiId = element.id;
        preparedData.push(passdata);
      } catch (error) {}
    }
    return preparedData;
  }
  //#endRegion

  async checkPreEMIBalance(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      const emiDate = this.typeService.getGlobalDate(targetDate).toJSON();

      // Get upcoming EMIs
      let attributes = ['id', 'loanId'];
      let options: any = {
        where: { emi_date: emiDate, payment_status: '0' },
      };
      const emiList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (emiList == k500Error) return kInternalError;

      // Get target loans for upcoming EMIs
      const loanIds = emiList.map((el) => el.loanId);

      const bankingInclude: { model; attributes?; where? } = {
        model: BankingEntity,
      };
      const include = [bankingInclude];
      bankingInclude.attributes = ['id'];
      bankingInclude.where = { consentId: { [Op.ne]: null } };
      attributes = ['id'];
      options = { include, where: { id: loanIds, loanStatus: 'Active' } };
      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      // Balance fetch
      let failed = 0;
      let success = 0;
      const purpose = 3;
      for (let index = 0; index < loanList.length; index++) {
        const loanData = loanList[index];
        const loanId = loanData.id;
        const emiData = emiList.find((el) => el.loanId == loanId);
        if (!emiData) continue;

        const data = { adminId, emiId: emiData.id, loanId, purpose };
        const response = await this.bankingService.checkAABalance(data);
        if (response?.message) failed++;
        else success++;
      }

      return { failed, success };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // OCC 1.0.0 -> For the emi which is past due and unpaid then ECS bounce will get charged
  async addECSbounceCharge(reqData) {
    const readOnly = reqData.readOnly === 'true';
    const transList = await this.getDataForECSBounceCharge();
    if (readOnly) return transList;
    return transList;
    // Update bounce charge
    const sessionId: string = uuidv4();
    const today = this.typeService.getGlobalDate(new Date()).toJSON();
    for (let index = 0; index < transList.length; index++) {
      try {
        const transData = transList[index];
        const emiData = transData?.emiData ?? {};
        const emiId = transData?.emiId;
        if (!emiId) continue;
        if (!transData.subscriptionDate) continue;
        if (transData.subscriptionDate >= today) continue;
        const response = transData?.response
          ? JSON.parse(transData?.response)
          : {};
        if (response?.adNotPlaced) continue;
        let gstOnBounceCharge = 0;
        let penalty = emiData.penalty ?? 0;
        let totalPenalty = emiData?.totalPenalty ?? 0;
        let bounceCharge = emiData?.bounceCharge ?? 0;
        let waived_bounce = emiData?.waived_bounce;
        if (waived_bounce) continue;

        if (emiData?.loan?.penaltyCharges?.MODIFICATION_CALCULATION) {
          gstOnBounceCharge = ECS_BOUNCE_CHARGE * 0.18;
        } else {
          penalty = +(penalty + ECS_BOUNCE_CHARGE).toFixed(2);
          totalPenalty = +(totalPenalty + ECS_BOUNCE_CHARGE).toFixed(2);
        }
        bounceCharge = ECS_BOUNCE_CHARGE;
        const systemCreationData = {
          sessionId,
          type: 1,
          emiId,
          loanId: transData.loanId,
          userId: transData.userId,
          uniqueId: `TYPE=${1}=EMI=` + emiId,
        };
        const createdData = await this.repoManager.createRowData(
          SystemTraceEntity,
          systemCreationData,
        );
        if (createdData === k500Error) continue;

        // Update -> EMI row data
        await this.repoManager.updateRowData(
          EmiEntity,
          {
            penalty,
            totalPenalty,
            gstOnBounceCharge,
            bounceCharge,
          },
          transData.emiId,
          // true,
        );
      } catch (error) {}
    }
    return {};
  }

  private async getDataForECSBounceCharge() {
    // Preparation -> Query
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date();
    const range = this.typeService.getUTCDateRange(
      fromDate.toString(),
      toDate.toString(),
    );
    const today = this.typeService.getGlobalDate(new Date()).toJSON();
    const emiInc: SequelOptions = {
      model: EmiEntity,
      attributes: ['penalty', 'totalPenalty', 'waived_bounce'],
      where: {
        emi_date: {
          [Op.lt]: today,
          [Op.gte]: this.typeService.getGlobalDate(fromDate).toJSON(),
        },
        payment_status: '0',
        bounceCharge: 0,
      },
      required: true,
    };
    const attr = ['emiId', 'loanId', 'subscriptionDate', 'userId', 'response'];
    const ops = {
      where: {
        status: { [Op.in]: [kInitiated, kFailed] },
        type: kEMIPay,
        subSource: kAutoDebit,
        adminId: SYSTEM_ADMIN_ID,
        updatedAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        subscriptionDate: { [Op.eq]: Sequelize.col('"emiData"."emi_date"') },
      },
      include: [emiInc],
    };
    // Hit -> Query
    const trasList = await this.transRepo.getTableWhereData(attr, ops);
    // Validation -> Query data
    if (trasList === k500Error) throw new Error();

    return trasList;
  }

  async funFilteredUserEMIDataForWhattsappMessage() {
    try {
      let tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate = this.typeService.getGlobalDate(tomorrowDate);
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone', 'email'],
      };
      const attributes = [
        'id',
        'payment_due_status',
        'payment_status',
        'userId',
        'loanId',
        'emi_date',
        'emi_amount',
        'payment_done_date',
        'penalty_days',
      ];

      const loanInclude = {
        model: loanTransaction,
        attributes: ['appType'],
      };
      let options = {
        where: {
          emi_date: { [Op.eq]: tomorrowDate.toJSON() },
          payment_status: '0',
        },
        include: [userInclude, loanInclude],
      };
      //get all tomorrow emi users data
      const allTomorrowEMIDateUsers = await this.repository.getTableWhereData(
        attributes,
        options,
      );

      if (!allTomorrowEMIDateUsers || allTomorrowEMIDateUsers === k500Error)
        return kInternalError;
      if (allTomorrowEMIDateUsers?.message) return allTomorrowEMIDateUsers;
      await this.sendTomorrowEMIWhattsappNotification(allTomorrowEMIDateUsers);
      return allTomorrowEMIDateUsers;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendTomorrowEMIWhattsappNotification(allTomorrowEMIDateUsers) {
    try {
      const dataLength = !gIsPROD
        ? UAT_PHONE_NUMBER?.length
        : allTomorrowEMIDateUsers?.length;
      const adminId = allTomorrowEMIDateUsers?.adminId ?? SYSTEM_ADMIN_ID;

      for (let i = 0; i < dataLength; i++) {
        try {
          const emi = allTomorrowEMIDateUsers[i];
          const userData = emi?.user;
          const loan = emi?.loan;
          const appType = loan?.appType;
          let number = this.cryptService.decryptPhone(userData?.phone);
          if (!gIsPROD) number = UAT_PHONE_NUMBER[i];
          const whattsappOptions = {
            customerName: userData?.fullName,
            email: userData?.email,
            number,
            amount: this.typeService.amountNumberWithCommas(
              Math.floor(+emi?.emi_amount),
            ),
            date: this.typeService.dateToFormatStr(emi?.emi_date),
            loanId: emi?.loanId,
            userId: emi?.userId,
            adminId,
            title: 'Payment reminder',
            requestData: 'payment_reminder',
            appType,
          };
          // await this.whatsAppService.sendWhatsAppMessage(whattsappOptions);
          this.whatsAppService.sendWhatsAppMessageMicroService(
            whattsappOptions,
          );
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
  async checkCreatedEmis() {
    try {
      const today = new Date();
      const emiInclude: SequelOptions = { model: EmiEntity };
      emiInclude.attributes = ['id'];
      const include = [emiInclude];
      const attribute = ['id', 'netEmiData'];
      const options = {
        where: {
          loanStatus: 'Active',
          check_emi_creation_date: { [Op.eq]: null },
        },
        include,
        order: [['id', 'DESC']],
        limit: 50,
      };
      const data = await this.loanRepo.getTableWhereData(attribute, options);
      if (data == k500Error) return kInternalError;

      let MismatchedData = [];
      const Datalength = data.length;
      for (let i = 0; i < Datalength; i++) {
        try {
          const element = data[i];
          // match Emi and gernerated Emi's
          const netEmiData = element.netEmiData
            ? element.netEmiData.map(JSON.parse)
            : [];
          const emiIds = element.emiData
            ? element.emiData.map((emi) => emi.id)
            : [];

          if (
            netEmiData.length !== emiIds.length ||
            emiIds.length === 0 ||
            netEmiData.length === 0
          ) {
            MismatchedData.push(element);
          }

          // Update loan data
          const updatedData = { check_emi_creation_date: today.toJSON() };
          await this.loanRepo.updateRowData(updatedData, element.id);
        } catch (error) {}
      }

      const MismatchedIds = MismatchedData.map((item) => item.id);
      // Send Email If Mismatch Found
      let length = MismatchedIds.length;
      for (let i = 0; i < length; i++) {
        try {
          const ele = MismatchedIds[i];
          let htmlData = fs.readFileSync(kMismatchedEmiCreation, 'utf-8');
          if (!htmlData) return k422ErrorMessage('Mail format not readable');
          htmlData = htmlData.replace('##LOANID##', ele);
          htmlData = htmlData.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
          htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
          htmlData = htmlData.replace(
            '##NBFCSHORTNAME##',
            EnvConfig.nbfc.nbfcCamelCaseName,
          );
          htmlData = this.replaceAll(htmlData, '##HELPCONTACT##', kHelpContact);
          const fromMail = kNoReplyMail;
          const replyTo = kSupportMail;
          await this.sharedNotification.sendMailFromSendinBlue(
            kTechSupportMail,
            'Urgent - EMI Mismatch Found',
            htmlData,
            null,
            [],
            [],
            fromMail,
            replyTo,
          );
        } catch (error) {}
      }
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async todaysEmiCalling(query) {
    try {
      const adminId = query?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const dateObj = new Date();
      let type = query?.category;
      const currentDate = this.typeService.getGlobalDate(dateObj).toJSON();
      const attributes = ['id', 'userId', 'loanId'];
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'phone'],
      };
      const options: any = {
        where: {
          emi_date: {
            [Op.eq]: currentDate,
          },

          payment_status: '0',
        },
        include: [userInclude],
      };

      const transInclude: SequelOptions = { model: TransactionEntity };
      transInclude.attributes = [
        'completionDate',
        'id',
        'emiId',
        'response',
        'status',
        'paidAmount',
        'utr',
        'subSource',
      ];
      if (type == 'TODAY_EMI') {
        transInclude.where = {
          status: kInitiated,
          subSource: kAutoDebit,
          type: kEMIPay,
        };
        options.include.push(transInclude);
      } else if (type == 'TODAY_EMI_FAILED') {
        transInclude.where = {
          subSource: kAutoDebit,
          [Op.or]: [
            { status: kFailed },
            { status: kInitiated, utr: { [Op.eq]: null } },
          ],
        };
        options.include.push(transInclude);
      }

      const data: any = await this.emiRepo.getTableWhereData(
        attributes,
        options,
      );

      if (!data || data === k500Error) return kInternalError;
      const finalData: any = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const element = data[i];
          const decryptedPhone = this.cryptService.decryptPhone(
            element?.user?.phone,
          );
          if (decryptedPhone === k500Error) continue;
          const passData = {
            phone: decryptedPhone, //des,
            adminId,
            userId: element?.userId,
            emiId: element?.id,
            loanId: element?.loanId,
          };

          finalData.push(passData);
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      }

      const callData = {
        category: type,
        targetList: finalData,
        adminId,
      };
      return await this.callingService.placeCall(callData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #startregion upcoming emi calling

  async upcomingEmiCalling(query) {
    try {
      if (!query?.adminId || !query?.startDate || !query?.endDate)
        return kParamsMissing;
      const passData = {
        adminId: query?.adminId,
        startDate: query?.startDate,
        endDate: query?.endDate,
      };

      const type = 'UPCOMING_EMI';
      const currentDate = this.typeService
        .getGlobalDate(passData?.startDate)
        .toJSON();
      const lastDate = this.typeService
        .getGlobalDate(passData?.endDate)
        .toJSON();
      const attributes = ['id', 'loanId', 'userId'];
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'phone'],
      };
      const options: any = {
        where: {
          emi_date: {
            [Op.gte]: currentDate,
            [Op.lte]: lastDate,
          },
          payment_status: '0',
        },
        include: [userInclude],
      };
      const data: any = await this.emiRepo.getTableWhereData(
        attributes,
        options,
      );

      if (!data || data === k500Error) return kInternalError;
      const finalData = [];
      for (let i = 0; i < data.length; i++) {
        const ele = data[i];
        const decryptedPhone = this.cryptService.decryptPhone(ele?.user?.phone);
        if (decryptedPhone === k500Error) continue;
        const defaulterObj: any = {
          emiId: ele?.id,
          phone: decryptedPhone,
          userId: ele?.userId,
          loanId: ele?.loanId,
        };
        finalData.push(defaulterObj);
      }
      const callPassData = {
        category: type,
        adminId: passData?.adminId,
        targetList: finalData,
      };
      return await this.callingService.placeCall(callPassData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  //#region Tomorrow Emi Date AA users Auto debit SessionId Change
  async getPreEMIAAUsersData() {
    // Take Tomorrow Date
    let tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    tomorrowDate = this.typeService.getGlobalDate(tomorrowDate);

    // Table join -> Bank
    const bankingInclude: SequelOptions = { model: BankingEntity };
    bankingInclude.attributes = [
      'id',
      'sessionId',
      'consentId',
      'consentHandleId',
      'consentPhone',
    ];
    bankingInclude.required = true;
    bankingInclude.where = {
      consentMode: 'FINVU',
      consentStatus: 'ACCEPTED',
    };

    // Table join -> EMI
    const emiInlcude: SequelOptions = { model: EmiEntity };
    emiInlcude.attributes = [];
    emiInlcude.where = {
      payment_status: '0',
      emi_date: {
        [Op.eq]: tomorrowDate.toJSON(),
      },
    };
    // Query Preparation
    const options = {
      include: [bankingInclude, emiInlcude],
    };

    // Query Hit
    const data: any = await this.loanRepo.getTableWhereData(
      ['id', 'userId'],
      options,
    );

    if (!data || data === k500Error) throw new Error();

    for (let index = 0; index < data.length; index++) {
      try {
        const bankingData = data[index]?.bankingData;
        const consentId = bankingData.consentId;
        const consentHandleId = bankingData.consentHandleId;
        const custId = await this.cryptService.decryptPhone(
          bankingData.consentPhone,
        );

        //Save the entry of request
        const creationData = {
          data: data[index] ?? {},
          loanId: data[index]?.id,
          userId: data[index]?.userId,
          type: 1,
          subType: 4,
        };
        await this.repoManager.createRowData(FinvuEntity, creationData);

        const sessionId = await this.finvuService.fetchDataRequest(
          custId,
          consentId,
          consentHandleId,
        );
        // update session Id
        const updateData = await this.bankingRepo.updateRowData(
          { sessionId },
          bankingData.id,
        );
        if (updateData === k500Error) throw new Error();
      } catch (error) {}
    }
    return true;
  }
  //#endregion

  //#region Yesterday Emi Date AA users Auto debit SessionId Change
  async getPostEMIAAUsersData() {
    // Take yesterday Date
    let yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    yesterdayDate = this.typeService.getGlobalDate(yesterdayDate);

    // Bankking Include
    const bankingInclude: SequelOptions = { model: BankingEntity };
    bankingInclude.attributes = [
      'id',
      'sessionId',
      'consentId',
      'consentHandleId',
      'consentPhone',
    ];
    bankingInclude.required = true;
    bankingInclude.where = {
      consentMode: 'FINVU',
      consentStatus: 'ACCEPTED',
    };

    // Transaction Include
    const transactionInlcude = {
      model: TransactionEntity,
      where: {
        status: 'FAILED',
        subSource: 'AUTODEBIT',
      },
    };

    // EMI Include
    const emiInlcude: SequelOptions = { model: EmiEntity };
    emiInlcude.attributes = [];
    emiInlcude.where = {
      payment_status: '0',
      payment_due_status: '1',
      emi_date: {
        [Op.eq]: yesterdayDate.toJSON(),
      },
    };
    emiInlcude.include = [transactionInlcude];

    const options = {
      include: [bankingInclude, emiInlcude],
    };
    // Query -> hit
    const data: any = await this.loanRepo.getTableWhereData(
      ['id', 'userId'],
      options,
    );
    if (!data || data === k500Error) throw new Error();

    for (let index = 0; index < data.length; index++) {
      try {
        const bankingData = data[index]?.bankingData;
        const consentId = bankingData.consentId;
        const consentHandleId = bankingData.consentHandleId;
        const custId = await this.cryptService.decryptPhone(
          bankingData.consentPhone,
        );
        //Save the entry of request
        const creationData = {
          data: data[index] ?? {},
          loanId: data[index]?.id,
          type: 1,
          subType: 4,
        };
        await this.repoManager.createRowData(FinvuEntity, creationData);

        const sessionId = await this.finvuService.fetchDataRequest(
          custId,
          consentId,
          consentHandleId,
        );
        // update session Id
        const updateData = await this.bankingRepo.updateRowData(
          { sessionId },
          bankingData.id,
        );
        if (updateData === k500Error) throw new Error();
      } catch (error) {}
    }
    return true;
  }
}
