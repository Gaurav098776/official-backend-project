// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { LegalService } from 'src/admin/legal/legal.service';
import { k500Error } from 'src/constants/misc';
import * as fs from 'fs';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  KICICIUPI,
  kAmountGreaterThan,
  kAmountLessThanPrincipal,
  kAmountLessThanPrincipalAndInt,
  kApp,
  kAutoDebit,
  kCalBySystem,
  kCashfree,
  kCollectionEmail,
  kCompleted,
  kDirectBankPay,
  kEMIPay,
  kErrorMsgs,
  kFailed,
  kFullPay,
  kGlobalTrail,
  kInitiated,
  kLoanClosureStr,
  kLoanSettled,
  kNoDataFound,
  kPartPay,
  kPleaceEnterValidSubmissionDate,
  kPleaseProvideFutureDue,
  kRazorpay,
  kSDK,
  kSomthinfWentWrong,
  kSplitRefundable,
  kTransactionIdExists,
  kUpi,
  kWeb,
  kWrongSourceType,
  kYouReachedAutoDebitLimit,
} from 'src/constants/strings';
import {
  ICICIVPA,
  ICICI_TERMINAL_ID,
  HOST_URL,
  ECS_BOUNCE_CHARGE,
  Latest_Version,
  penaltyChargesObj,
  MSG91Templete,
} from 'src/constants/globals';
import { EmiEntity } from 'src/entities/emi.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { CrmRepository } from 'src/repositories/crm.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { CryptService } from 'src/utils/crypt.service';
import { DateService } from 'src/utils/date.service';
import { RazorpayService } from 'src/utils/razorpay.service';
import { TypeService } from 'src/utils/type.service';
import { CalculationSharedService } from './calculation.service';
import { CommonSharedService } from './common.shared.service';
import { SharedNotificationService } from './services/notification.service';
import {
  GLOBAL_RANGES,
  SYSTEM_ADMIN_ID,
  UPI_SERVICE,
  MAX_AUTO_DEBIT_COUNT,
  promoCodeRemark,
  gIsPROD,
  UAT_PHONE_NUMBER,
  disburseAmt,
} from 'src/constants/globals';
import {
  CASHFREE_HEADERS,
  ReferralStages,
  kLspMsg91Templates,
  kMsg91Templates,
  ptpCrmIds,
  kPaymentMode,
} from 'src/constants/objects';
import { mandateEntity } from 'src/entities/mandate.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import {
  CF_RETURN_URL,
  CF_SUBSCRIPTION,
  nPaymentRedirect,
} from 'src/constants/network';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { ReferralSharedService } from './referral.share.service';
import { PromoCodeService } from './promo.code.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { APIService } from 'src/utils/api.service';
import { StringService } from 'src/utils/string.service';
import { SystemTraceEntity } from 'src/entities/system_trace.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';
import { v4 as uuidv4 } from 'uuid';
import { LogsSharedService } from './logs.service';
import { UserSharedLogTrackerMiddleware } from './logtracker.middleware';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { EnvConfig } from 'src/configs/env.config';
import { FileService } from 'src/utils/file.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { RedisService } from 'src/redis/redis.service';
import { kLoanClosure, kSettlementLoan } from 'src/constants/directories';
import { PaymentLinkEntity } from 'src/entities/paymentLink.entity';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';
import { TransactionInitializedArchiveEntity } from 'src/entities/transactionInitializedArchive.entity';
import { SlackService } from 'src/thirdParty/slack/slack.service';
@Injectable()
export class SharedTransactionService {
  constructor(
    // Database
    private readonly repoManager: RepositoryManager,
    private readonly emiRepo: EMIRepository,
    private readonly typeService: TypeService,
    private readonly strService: StringService,
    private readonly crmRepo: CrmRepository,
    private readonly dateService: DateService,
    private readonly emiService: EMIRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly razorpaySer: RazorpayService,
    private readonly adminRepo: AdminRepository,
    private readonly stampRepo: StampRepository,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly masterRepository: MasterRepository,
    @Inject(forwardRef(() => CalculationSharedService))
    private readonly sharedCalculation: CalculationSharedService,
    private readonly legalService: LegalService,
    private readonly userActivityRepo: UserActivityRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly cashFreeService: CashFreeService,
    private readonly loanRepo: LoanRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly razorpayService: RazorpoayService,
    private readonly signDeskService: SigndeskService,
    private readonly whatsappService: WhatsAppService,
    private readonly apiService: APIService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => UserServiceV4))
    private readonly userServiceV4: UserServiceV4,
    // Shared
    private readonly sharedReferral: ReferralSharedService,
    private readonly promoCodeService: PromoCodeService,
    @Inject(forwardRef(() => ICICIThirdParty))
    private readonly iciciService: ICICIThirdParty,
    @Inject(forwardRef(() => LogsSharedService))
    private readonly logsSharedService: LogsSharedService,
    @Inject(forwardRef(() => UserSharedLogTrackerMiddleware))
    private readonly userSharedLogTrackerMiddleware: UserSharedLogTrackerMiddleware,
    private readonly userLogTrackerRepository: UserLogTrackerRepository,
    private readonly redisService: RedisService,
    private readonly slackService: SlackService,
  ) {}

  async splitTransaction(paidAmount, loanId) {
    if (!loanId || isNaN(+loanId)) return kParamMissing('loanId');

    const transInclude: SequelOptions = { model: TransactionEntity };
    transInclude.attributes = [
      'principalAmount',
      'interestAmount',
      'penaltyAmount',
      'cgstOnBounceCharge',
      'sgstOnBounceCharge',
      'bounceCharge',
      'penalCharge',
      'regInterestAmount',
      'cgstOnPenalCharge',
      'sgstOnPenalCharge',
      'legalCharge',
      'sgstOnLegalCharge',
      'cgstOnLegalCharge',
    ];
    transInclude.required = false;
    transInclude.where = { status: kCompleted };
    const include = [transInclude];

    const emiAttributes = [
      'id',
      'partPaymentPenaltyAmount',
      'principalCovered',
      'interestCalculate',
      'penalty',
      'bounceCharge',
      'gstOnBounceCharge',
      'dpdAmount',
      'penaltyChargesGST',
      'regInterestAmount',
      'legalCharge',
      'legalChargeGST',
    ];
    const emiOptions = {
      include,
      where: { loanId, payment_status: '0', payment_due_status: '1' },
    };

    const emiList = await this.repoManager.getTableWhereData(
      EmiEntity,
      emiAttributes,
      emiOptions,
    );
    for (let i = 0; i < emiList.length; i++) {
      try {
        let ele = emiList[i];
        let cGstOnPenal = this.typeService.manageAmount(
          (ele.penaltyChargesGST ?? 0) / 2,
        );
        let sGstOnPenal = this.typeService.manageAmount(
          (ele.penaltyChargesGST ?? 0) / 2,
        );
        ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
      } catch (error) {}
    }
    const splitResult = this.sharedCalculation.splitPaymentsforPI({
      paidAmount,
      emiList,
    });
    return splitResult;
  }

  async checkCFOrder(
    loanId: number,
    checkAllPending = false,
    returnAffected = false,
  ) {
    try {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 180);

      // Last 2 Days pending
      const maxLastDate = new Date();
      maxLastDate.setDate(maxLastDate.getDate() - 2880);

      const attributes = [
        'emiId',
        'id',
        'paidAmount',
        'transactionId',
        'type',
        'userId',
        'source',
        'response',
        'subSource',
      ];
      const where: any = {
        loanId,
        status: 'INITIALIZED',
        // source: ['CASHFREE', 'RAZORPAY', 'ICICI_UPI'],
        source: [kCashfree],
        subSource: { [Op.ne]: kAutoDebit },
        transactionId: { [Op.ne]: null },
      };
      if (!checkAllPending) where.updatedAt = { [Op.gte]: minDate };
      else where.updatedAt = { [Op.gte]: maxLastDate };
      const options: any = { where };
      options.order = [['id', 'DESC']];

      const transactionList = await this.transactionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transactionList == k500Error) return kInternalError;
      else if (transactionList.length == 0) return false;
      const returnData = [];
      let paymentResponse;
      for (let index = 0; index < transactionList.length; index++) {
        try {
          const data = transactionList[index];
          let response;
          if (data.source === 'CASHFREE')
            response = await this.cashFreeService.checkPayment(
              data.transactionId,
              data?.response,
            );
          else if (data.source === 'RAZORPAY')
            response = await this.razorpaySer.checkPayment(data.transactionId);
          else if (data?.source === 'ICICI_UPI') {
            const transactionId = data?.transactionId;
            const transactionType = 'C';
            response = await this.iciciService.CallbackStatus({
              transactionId,
              transactionType,
            });
          }
          if (response != k500Error && response != false) {
            if (
              response.status == 'COMPLETED' ||
              (data?.source === 'ICICI_UPI' && response.status == 'FAILED')
            ) {
              const paymentData: any = { id: data.id, status: response.status };
              paymentData.response = response?.response;
              paymentData.utr = response?.utr;
              if (data?.source === 'ICICI_UPI')
                paymentData.utr = response?.OriginalBankRRN;
              paymentData.completionDate = response?.paymentDate.toJSON();
              paymentData.type = data.type;
              paymentData.loanId = loanId;
              paymentData.userId = data.userId;
              paymentData.subSource = data.subSource;
              if (data.emiId) paymentData.emiId = data.emiId;
              if (returnAffected)
                returnData.push({
                  emiId: data.emiId,
                  loanId,
                  userId: data.userId,
                  status: response.status,
                  transactionId: data.transactionId,
                });
              else {
                await this.markTransactionAsComplete(paymentData);
                return {
                  amount: data.paidAmount,
                  status: paymentData.status,
                  transactionId: data.transactionId.replace('CFORDER', ''),
                };
              }
            } else if (response.status == 'INITIALIZED') {
              try {
                let update;
                if (response.response) update = { response: response.response };
                else if ((data?.response ?? '').includes('IP_LIMIT')) {
                  const tempRes = JSON.parse(data?.response);
                  delete tempRes.iplimit;
                  update = { response: JSON.stringify(tempRes) };
                }
                if (update)
                  await this.transactionRepo.updateRowData(update, data.id);
              } catch (er) {}
            }
            paymentResponse = response;
          }
        } catch (error) {}
      }
      if (returnAffected) return returnData;
      else return paymentResponse;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async markTransactionAsComplete(paymentData: any) {
    try {
      // Params preparation
      const id = paymentData.id;
      const loanId = paymentData.loanId;
      const userId = paymentData.userId;
      const status = paymentData.status;
      let isLoanClosure = false;
      let isLoanSettled = false;
      const updatedData: any = { status };
      updatedData.completionDate = paymentData.completionDate;
      updatedData.response = paymentData.response;
      if (paymentData.utr) updatedData.utr = paymentData.utr;
      let dataWaiver;
      let adminId;
      let updateWaiver = false;

      const ip: any = await this.logsSharedService.getRecentIPData(loanId);

      // Successful payment (COMPLETED)
      if (status === kCompleted) {
        updateWaiver = await this.updateWaiverTransaction(id);
        if (updateWaiver != true) {
          await this.checkAutoDebitResAndUpdatePenalty(id);

          // Validate -> Bifurcation
          const reCalculation = await this.reCalculateBifurcation(id, {
            ...updatedData,
            isBifurcated: paymentData.isBifurcated ?? false,
          });
          if (reCalculation.message) return reCalculation;
          if (reCalculation.recalculated) return {};
          if (reCalculation.updatedData) {
            Object.assign(updatedData, reCalculation.updatedData);
            paymentData.emiId = reCalculation.updatedData.emiId;
          }
        }
        const options: any = { where: { id } };
        const attributes = ['id', 'source', 'subSource', 'subStatus'];
        const trans = await this.transactionRepo.getRowWhereData(
          attributes,
          options,
        );
        if (
          paymentData?.status === kCompleted &&
          trans?.subStatus === kLoanClosureStr &&
          paymentData?.type === kFullPay
        )
          isLoanClosure = true;
        if (
          paymentData?.status === kCompleted &&
          trans?.subStatus === kLoanSettled &&
          paymentData?.type === kFullPay
        )
          isLoanSettled = true;
        if (trans === k500Error || trans === null) return kInternalError;
        let repayAccount = '-';
        if (
          trans.source === kRazorpay &&
          (trans.subSource === kApp || trans.subSource === kWeb)
        ) {
          repayAccount = 'RAZORPAY-1';
        } else if (
          trans.source === kRazorpay &&
          trans.subSource === kAutoDebit
        ) {
          repayAccount = 'RAZORPAY-2';
        } else if (trans.source === kCashfree) {
          repayAccount = kCashfree;
        } else if (trans.source === KICICIUPI) {
          repayAccount = 'UPI [ICICI Bank - 753]';
        } else if (
          trans.subSource === kDirectBankPay ||
          trans.subSource === 'DIRECT ICICI' ||
          trans.subSource === 'ICICI DIRECT - CASH' ||
          trans.subSource === 'ICICI MANUAL' ||
          trans.source === kUpi
        ) {
          repayAccount = 'BANK TRANSFER[ICICI BANK - 30400]';
        }

        const city = await this.userSharedLogTrackerMiddleware.getUserData(
          userId,
        );
        const deviceId = await this.logsSharedService.getDeviceId(userId);
        let brand: any = '';
        let model = '';
        if (deviceId?.deviceInfo == null) {
          deviceId.webDeviceInfo = deviceId?.webDeviceInfo
            ? JSON.parse(deviceId?.webDeviceInfo)
            : {};
          brand = deviceId?.webDeviceInfo?.user_agent ?? '-';
          model = '';
        } else {
          deviceId.deviceInfo = deviceId?.deviceInfo
            ? JSON.parse(deviceId?.deviceInfo)
            : {};
          brand =
            deviceId?.deviceInfo?.brand ?? deviceId?.deviceInfo?.name ?? '';
          model = deviceId?.deviceInfo?.model ?? '-';
        }
        if (!brand) {
          brand = '-';
        }
        if (model === '-') {
          model = '';
        }
        const device = [brand, model].filter((part) => part !== '-').join(' ');

        const IPData = await this.logsSharedService.getLocationByIp(ip);
        const otherDetails = {
          utr: paymentData?.utr ?? '-',
          repayAccount,
          modeOfPayment: trans?.subSource ?? '-',
          accountDeducted: '-',
          device: device || '-',
        };
        const passData = {
          userId,
          stage: `${paymentData.type} - ${'Payment successful'} `,
          loanId,
          ip: ip ?? '-',
          deviceId: '-',
          city: city?.city ?? '-',
          ipLocation: IPData?.ipLocation ?? '-',
          ipCountry: IPData?.ipCountry ?? '-',
          otherDetails,
        };
        await this.userLogTrackerRepository.create(passData);
      }
      // Update transaction data
      const updateResponse = await this.transactionRepo.updateRowData(
        updatedData,
        id,
      );
      if (updateResponse == k500Error) return kInternalError;
      //check case assing tobe collectin or not
      if (updatedData.status == kFailed) {
        await this.addEcsBounceCharge(paymentData);
        await this.legalService.makeLegalEligible(
          id,
          loanId,
          userId,
          paymentData.type == kFullPay,
        );
      }

      //send payment notification
      //  await this.sendPaymentSuccessNotificationToUser(userId, id);

      if (paymentData.status != kCompleted) return;

      // Update full pay data
      if (paymentData.type == kFullPay && updateWaiver != true) {
        const data = await this.calculationPIAfterComplited(id);
        if (data?.dueAmount) {
          dataWaiver = data.dataWaiver;
          if (data?.adminId) adminId = data.adminId;
        }
        if (dataWaiver)
          await this.updateWaiver(dataWaiver, adminId, paymentData, ip);
        const update = await this.sharedCalculation.getFullPayDataByTransId(id);
        if (update?.message) return update;
      }
      // Update EMI
      else if (paymentData.type == kPartPay || paymentData.type == kEMIPay) {
        const result = await this.checkAndUpdateEMIPartPay(
          id,
          paymentData.emiId,
        );
        if (result === false) return false;
      } else return false;

      await this.checkUserStatus(loanId);
      // Check details with PTP for defaulter users
      await this.checkPTPTransactionStatus(loanId, id);

      // update paid bifurcation in EMI (paid Principal, paid Interest, paid Penalty)
      await this.reCalculatePaidAmounts({ loanId });

      // Sync function -> Calculate CLTV after transaction completion
      this.sharedCalculation
        .calculateCLTV({ loanIds: [loanId] })
        .catch((err) => {});

      // Close the loan if all expected amount recovered
      const canCompleteLoan = await this.isEligibleForLoanClose(loanId);
      if (canCompleteLoan)
        return await this.closeTheLoan({
          loanId,
          userId,
          isLoanClosure,
          isLoanSettled,
        });
      if (status == kCompleted)
        await this.legalService.funCheckLegalAssingToCollection({ loanId });

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async addEcsBounceCharge(paymentData) {
    try {
      if (paymentData.subSource != kAutoDebit) return;
      if (!paymentData.emiId) return;
      const loanInclude = {
        model: loanTransaction,
        attributes: ['penaltyCharges'],
      };
      const attributes = ['penalty', 'totalPenalty'];
      const options = {
        where: {
          id: paymentData.emiId,
          payment_status: '0',
          bounceCharge: 0,
        },
        include: [loanInclude],
      };

      const emiData = await this.emiRepo.getRowWhereData(attributes, options);
      if (!emiData) return {};
      let gstOnBounceCharge = 0;
      let penalty = emiData.penalty ?? 0;
      let totalPenalty = emiData?.totalPenalty ?? 0;
      let bounceCharge = emiData?.bounceCharge ?? 0;

      if (emiData?.loan?.penaltyCharges?.MODIFICATION_CALCULATION) {
        gstOnBounceCharge = ECS_BOUNCE_CHARGE * 0.18;
      } else {
        penalty = +(penalty + ECS_BOUNCE_CHARGE).toFixed(2);
        totalPenalty = +(totalPenalty + ECS_BOUNCE_CHARGE).toFixed(2);
      }
      bounceCharge = ECS_BOUNCE_CHARGE;
      const sessionId = uuidv4();
      const systemCreationData = {
        sessionId,
        type: 1,
        emiId: paymentData.emiId,
        loanId: paymentData.loanId,
        userId: paymentData.userId,
        uniqueId: `TYPE=${1}=EMI=` + paymentData.emiId,
      };
      const createdData = await this.repoManager.createRowData(
        SystemTraceEntity,
        systemCreationData,
      );
      if (createdData === k500Error) return kInternalError;

      // Update -> EMI row data
      await this.repoManager.updateRowData(
        EmiEntity,
        {
          penalty,
          totalPenalty,
          gstOnBounceCharge,
          bounceCharge,
        },
        paymentData.emiId,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region update transaction
  private async updateWaiverTransaction(id) {
    try {
      const att = ['loanId', 'paidAmount', 'type'];
      const settled_type = 'WAIVER_SETTLED';
      const where = {
        id,
        settled_type,
        status: 'INITIALIZED',
        transactionId: { [Op.ne]: null },
      };
      const find = await this.transactionRepo.getRowWhereData(att, { where });
      if (!find) return;
      if (find === k500Error) return kInternalError;
      const body = { loanId: find.loanId, amount: find.paidAmount };
      /// find loan Data
      const loanData: any = await this.getLoanDataWaiver(body);
      if (loanData?.message) return loanData;
      const prePareData: any = this.prePareAmountForWaiver(loanData, body);
      if (prePareData?.message) return prePareData;

      const type = prePareData?.finalData.type;
      for (let index = 0; index < prePareData.emiList.length; index++) {
        try {
          const emiData = prePareData.emiList[index];
          const emi = prePareData.emiList[index]['emi'];
          const coverAmount =
            emiData.coverPrincipal +
            emiData.coverInterest +
            emiData.coverPenalty +
            emiData.coverRegInterest +
            emiData.coverBounce +
            emiData.coverPenal +
            emiData.coverLegal;
          if (coverAmount > 0) {
            let waiver =
              (emi?.waiver ?? 0) +
              (emi?.paid_waiver ?? 0) +
              (emi?.unpaid_waiver ?? 0);
            let penalty = emi.penalty;
            let emi_amount = +emi.emi_amount;
            emi_amount += emiData.coverPrincipal;
            emi_amount += emiData.coverInterest;
            let fullPayPrincipal = emi.fullPayPrincipal;
            let fullPayInterest = emi.fullPayInterest;
            let fullPayPenalty = emi.fullPayPenalty;
            let fullPayRegInterest = emi.fullPayRegInterest;
            let fullPayBounce = emi.fullPayBounce;
            let fullPayPenal = emi.fullPayPenal;
            let fullPayLegalCharge = emi.fullPayLegalCharge;
            let pay_type = emi.pay_type;
            if (type === 'FULLPAY') {
              fullPayPrincipal += emiData.coverPrincipal;
              fullPayInterest += emiData.coverInterest;
              fullPayPenalty += emiData.coverPenalty;
              fullPayRegInterest += emiData.coverRegInterest;
              fullPayBounce += emiData.coverBounce;
              fullPayPenal += emiData.coverPenal;
              fullPayLegalCharge += emiData.coverLegal;
              pay_type = 'FULLPAY';
            }
            penalty += emiData.coverPenalty;

            if (coverAmount >= waiver) waiver = 0;
            else waiver -= coverAmount;
            if (waiver < 10) waiver = 0;
            if (emi_amount > emi.principalCovered + emi.interestCalculate)
              emi_amount = emi.principalCovered + emi.interestCalculate;
            const updateData = {
              penalty: this.typeService.manageAmount(penalty),
              waiver: this.typeService.manageAmount(waiver, disburseAmt),
              emi_amount: this.typeService.manageAmount(emi_amount),
              paid_waiver: 0,
              unpaid_waiver: 0,
              fullPayPrincipal: this.typeService.manageAmount(fullPayPrincipal),
              fullPayInterest: this.typeService.manageAmount(fullPayInterest),
              fullPayPenalty: this.typeService.manageAmount(fullPayPenalty),
              fullPayRegInterest,
              fullPayBounce,
              fullPayPenal,
              fullPayLegalCharge,
              pay_type,
            };
            await this.emiRepo.updateRowData(updateData, emiData.id);
          }
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region  get loan Data for waiver
  private async getLoanDataWaiver(body) {
    try {
      const loanId = body.loanId;
      /// transaction
      const tranInclude: any = { model: TransactionEntity };
      tranInclude.attributes = [
        'id',
        'paidAmount',
        'status',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'regInterestAmount',
        'bounceCharge',
        'sgstOnBounceCharge',
        'cgstOnBounceCharge',
        'penalCharge',
        'sgstOnPenalCharge',
        'cgstOnPenalCharge',
        'legalCharge',
        'sgstOnLegalCharge',
        'cgstOnLegalCharge',
        'emiId',
      ];
      tranInclude.where = { status: 'COMPLETED' };
      tranInclude.required = false;
      // Emi
      const attributes = [
        'id',
        'emi_amount',
        'emi_date',
        'payment_status',
        'penalty',
        'principalCovered',
        'interestCalculate',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
        'partPaymentPenaltyAmount',
        'pay_type',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
        'fullPayPrincipal',
        'fullPayInterest',
        'fullPayPenalty',
        'fullPayRegInterest',
        'fullPayBounce',
        'fullPayPenal',
        'fullPayLegalCharge',
      ];

      const emiInclude: any = { model: EmiEntity, attributes };
      emiInclude.where = {
        [Op.or]: {
          waiver: { [Op.gt]: 0 },
          paid_waiver: { [Op.gt]: 0 },
          unpaid_waiver: { [Op.gt]: 0 },
        },
      };
      // user
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['id', 'email', 'phone', 'fullName'];
      // Mandate
      const include = [userInclude, emiInclude, tranInclude];

      // Loan
      const att = [
        'id',
        'loanStatus',
        'loan_disbursement_date',
        'interestRate',
        'netApprovedAmount',
        'followerId',
      ];
      const where: any = { id: loanId, loanStatus: 'Complete' };
      const options = { include, where };
      const loanData = await this.loanRepo.getRowWhereData(att, options);
      if (!loanData || loanData === k500Error) return kInternalError;
      loanData.registeredUsers.phone = this.cryptService.decryptPhone(
        loanData.registeredUsers?.phone,
      );
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async checkAutoDebitResAndUpdatePenalty(id) {
    try {
      // Preparation -> Query
      const where = { payment_due_status: '1' };
      const emiModel = {
        model: EmiEntity,
        where,
        attributes: ['id', 'emi_date'],
      };
      const whereOps = {
        id,
        subSource: kAutoDebit,
        status: kInitiated,
        type: kEMIPay,
        transactionId: { [Op.ne]: null },
      };
      const options = { where: whereOps, include: [emiModel] };
      const att = ['id', 'createdAt'];
      // Hit -> Query
      const result = await this.transactionRepo.getRowWhereData(att, options);
      // Validation -> Query data
      if (!result || result == k500Error) return kInternalError;
      // update
      const date = this.typeService.getGlobalDate(result.createdAt);
      const emiDate = this.typeService.getGlobalDate(result.emiData.emi_date);
      if (date.getTime() <= emiDate.getTime()) {
        // Create -> System trace row data
        const systemCreationData = {
          sessionId: uuidv4(),
          type: 2,
          emiId: result.emiData?.id,
        };
        const createdData = await this.repoManager.createRowData(
          SystemTraceEntity,
          systemCreationData,
        );
        if (createdData === k500Error) throw new Error();

        const emiId = result.emiData.id;
        const update = {
          penalty: null,
          penalty_days: null,
          payment_due_status: '0',
          totalPenalty: 0,
          dpdAmount: 0,
          regInterestAmount: 0,
          penaltyChargesGST: 0,
          penaltyCharges: penaltyChargesObj,
        };
        const emiWhere = { emi_date: { [Op.gt]: date }, ...where };

        return await this.emiRepo.updateRowDataWithOptions(
          update,
          emiWhere,
          emiId,
        );
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Re-calculation of bifurcation (Principal, Interest, Penalty)
  async reCalculateBifurcation(id, paymentData: any = {}) {
    if (paymentData == kFullPay) return {};
    if (paymentData?.type == kFullPay) return {};
    if (paymentData.isBifurcated) return {};

    // Transaction validation
    const att = [
      'adminId',
      'paidAmount',
      'loanId',
      'emiId',
      'source',
      'status',
      'subSource',
      'subscriptionDate',
      'transactionId',
      'userId',
      'maxDPD',
    ];
    const options = { where: { id } };
    const transData = await this.transactionRepo.getRowWhereData(att, options);
    if (!transData) return k422ErrorMessage(kNoDataFound);
    if (transData == k500Error) throw new Error();
    if (transData.status == kCompleted)
      return k422ErrorMessage('Transaction already completed');

    // Loan validation
    const data = { ...transData, amount: transData?.paidAmount };
    if (!data?.emiId) return {};
    const canBifurcate = await this.canCheckBifurcation(data?.emiId); // Only delayed payments needs to check for re calculation
    if (!canBifurcate) return {};
    // Loan data
    const loanData = await this.getLoanData(data, true);
    if (!loanData) return k422ErrorMessage(kNoDataFound);
    if (loanData == k500Error) throw new Error();

    // Re-calculation validation
    const status = paymentData.status;
    if (status != kCompleted)
      return k422ErrorMessage('Transaction is not completed');

    // Bifurcation logic
    const bifurcationList: any = await this.splitTransaction(
      transData?.paidAmount,
      loanData.id,
    );
    if (bifurcationList.message) return bifurcationList;
    // No split required
    if (bifurcationList.length == 1) {
      const updatedData = bifurcationList[0];
      if (updatedData?.principalAmount)
        updatedData.principalAmount = this.typeService.manageAmount(
          updatedData?.principalAmount,
        );
      if (updatedData?.interestAmount)
        updatedData.interestAmount = this.typeService.manageAmount(
          updatedData?.interestAmount,
        );
      if (updatedData?.penaltyAmount)
        updatedData.penaltyAmount = this.typeService.manageAmount(
          updatedData?.penaltyAmount,
        );
      if (updatedData?.paidAmount)
        updatedData.paidAmount = this.typeService.manageAmount(
          updatedData?.paidAmount,
        );
      if (updatedData?.roundOff) updatedData.roundOff = updatedData?.roundOff;
      delete updatedData.dummyPayment;
      if (
        updatedData?.principalAmount == 0 &&
        updatedData?.interestAmount == 0 &&
        Math.abs(updatedData?.paidAmount - updatedData?.penaltyAmount) > 5
      ) {
        const text = '*Penalty amount bifurcation error*';
        const body = {
          loanId: loanData.id,
          userId: loanData?.registeredUsers?.id,
        };
        const threads = [
          `Paid Amount -> ${transData.paidAmount}`,
          `Bifurcation list -> ${JSON.stringify(bifurcationList)}`,
          `Loan data -> ${JSON.stringify(loanData)}`,
          `Body details -> ${JSON.stringify(body)}`,
          `Payment data -> ${JSON.stringify(paymentData)}`,
        ];
        this.slackService.sendMsg({ text, threads });
      }
      return { reCalculated: false, updatedData };
    }
    // Check for duplication
    else if (bifurcationList.length > 1) {
      try {
        const isRefundedAmt = bifurcationList.find(
          (el) => el.isRefundable === true,
        );
        if (isRefundedAmt) {
          if (transData.transactionId) {
            const transAttr = ['id'];
            const transOptions = {
              where: {
                status: kCompleted,
                transactionId: transData.transactionId,
              },
            };
            const postTransData = await this.repoManager.getRowWhereData(
              TransactionEntity,
              transAttr,
              transOptions,
            );
            if (postTransData && postTransData != k500Error) {
              return k422ErrorMessage('Transaction already completed');
            }
          }
        }
      } catch (error) {}
    }
    /// this for update refund in last
    bifurcationList.sort(
      (a, b) =>
        ((a?.isRefundable ?? false) === true ? 1 : 0) -
        ((b?.isRefundable ?? false) === true ? 1 : 0),
    );

    // check if bifurcated amount is same as paid amount
    if (transData?.paidAmount && transData.paidAmount > 0) {
      let totalBifurcatedAmount = bifurcationList.reduce((acc, curr) => {
        return (
          acc +
          Object.keys(curr)
            .filter(
              (key) =>
                key !== 'emiId' && key !== 'roundOff' && key !== 'paidAmount',
            )
            .reduce((sum, key) => sum + curr[key], 0)
        );
      }, 0);
      if (Math.abs(totalBifurcatedAmount - transData.paidAmount) > 5) {
        const text = '*Part-Pay bifurcation error*';
        const body = {
          loanId: loanData.id,
          userId: loanData?.registeredUsers?.id,
        };
        const threads = [
          `Paid Amount -> ${transData.paidAmount}`,
          `bifurcation list -> ${JSON.stringify(bifurcationList)}`,
          `Body details -> ${JSON.stringify(body)}`,
        ];
        this.slackService.sendMsg({ text, threads });
        return k422ErrorMessage(kSomthinfWentWrong);
      }
    }

    // Split required
    for (let index = 0; index < bifurcationList.length; index++) {
      try {
        const creationData = bifurcationList[index];
        const isRefundable = creationData.isRefundable ?? false;
        delete creationData.isRefundable;
        creationData.accStatus = kCalBySystem;
        creationData.adminId = transData.adminId;
        creationData.followerId =
          loanData?.followerId ??
          (transData?.adminId != SYSTEM_ADMIN_ID ? transData?.adminId : null);
        creationData.type = kPartPay;
        creationData.completionDate = paymentData.completionDate;
        creationData.loanId = transData.loanId;
        creationData.userId = transData.userId;
        creationData.status = isRefundable ? kCompleted : kInitiated;
        creationData.source = transData.source;
        creationData.subSource = transData.subSource;
        creationData.subscriptionDate = transData.subscriptionDate;
        creationData.response = { corePayment: transData };
        creationData.response = JSON.stringify(creationData.response);

        if (isRefundable) {
          creationData.subStatus = kSplitRefundable;
          creationData.emiId = data?.emiId;
        }

        let updatedData;
        // Update core payment (converting into dummy payment)
        if (index == 0) {
          creationData.utr = paymentData.utr;
          updatedData = await this.transactionRepo.updateRowData(
            creationData,
            id,
          );
          if (updatedData == k500Error) return kInternalError;
          creationData.status = status;
          creationData.id = id;

          // Transaction should not iterate again if dummy payment is refundable else it will go in loop for too many times
          if (!isRefundable) {
            creationData.status = kCompleted;
            creationData.isBifurcated = true;
            await this.markTransactionAsComplete(creationData);
          }
        }
        // Create remaining dummy payments
        else {
          const tail = `DMY${index + 1}`;
          creationData.transactionId = transData.transactionId + tail;
          creationData.utr = paymentData.utr + tail;
          updatedData = await this.transactionRepo.createRowData(creationData);
          if (updatedData == k500Error) return kInternalError;
          updatedData.status = status;
          // Transaction should not iterate again if dummy payment is refundable else it will go in loop for too many times
          if (!isRefundable) {
            updatedData.status = kCompleted;
            updatedData.isBifurcated = true;
            updatedData.subSource = creationData.subSource;
            await this.markTransactionAsComplete(updatedData);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
    return { recalculated: true };
  }

  async sendPaymentSuccessNotificationToUser(userId, paymentId) {
    try {
      const attributes = [
        'paidAmount',
        'utr',
        'loanId',
        'completionDate',
        'createdAt',
        'adminId',
        'status',
        'subSource',
      ];
      const loanInclude = {
        model: loanTransaction,
        attributes: ['appType'],
      };
      const options = { where: { id: paymentId }, include: [loanInclude] };
      const transData = await this.transactionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (transData == k500Error) return kInternalError;
      if (!transData) return k422ErrorMessage(kNoDataFound);

      const paidAmount = (transData.paidAmount ?? 0).toFixed(2);
      const paidDate = transData?.completionDate ?? transData?.createdAt;
      const date = this.typeService.getDateFormatted(paidDate);
      const adminId = transData?.adminId;
      const loanId = transData?.loanId;
      const utr = transData.utr ?? '';
      const status = transData?.status;
      const subSource = transData?.subSource;
      const appType = transData?.loanData?.appType;
      const title =
        status == kCompleted ? 'Payment successful' : 'Payment failed!';
      let content = '';
      if (status == kCompleted)
        content = `We have received Rs. ${paidAmount} on ${date} towards your loan ${loanId}, login into the app to check the repayment details!`;
      else if (status == kFailed)
        content = `Repayment of Rs.${paidAmount} towards your loan ${loanId} is failed!`;
      const data = {
        // forceRoute: 'dashboardRoute',
        paidAmount,
        utr,
        paymentSuccess: status == kCompleted ? true : false,
      };
      const smsOptions = { var1: `${paidAmount} on ${date}`, var2: loanId };
      const successSMSId =
        appType == 1
          ? kMsg91Templates.PaymentSuccessSMSId
          : kLspMsg91Templates.PaymentSuccessSMSId;
      const failedSMSId =
        appType == 1
          ? kMsg91Templates.PaymentFailedSMSId
          : kLspMsg91Templates.PaymentFailedSMSId;
      const smsId = status == kCompleted ? successSMSId : failedSMSId;

      //send whatsapp
      if (
        status === kCompleted ||
        (status === kFailed && subSource == 'AUTODEBIT')
      ) {
        const userData = await this.userRepo.getRowWhereData(
          ['fullName', 'email', 'phone'],
          { where: { id: userId } },
        );
        if (userData == k500Error) return kInternalError;
        const key = loanId * 484848;
        const paymentLink = `${nPaymentRedirect}${key}`;
        let number = gIsPROD
          ? this.cryptService.decryptPhone(userData?.phone)
          : UAT_PHONE_NUMBER[5];
        const whatsappOption = {
          customerName: userData?.fullName,
          email: userData?.email,
          number,
          loanId,
          userId,
          paidAmount: paidAmount,
          paidDate: date,
          adminId,
          title: title,
          requestData: title,
          paymentLink,
          appType,
        };
        // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
        this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
      }
      const userData = [];
      userData.push({ userId, appType });
      const body = {
        userData,
        title,
        content,
        adminId,
        data,
        smsOptions,
        isMsgSent: true,
        smsId,
      };
      return await this.sharedNotification.sendNotificationToUser(body);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region calculation PI After COMPLETED
  async calculationPIAfterComplited(id) {
    try {
      const att = ['paidAmount', 'loanId', 'emiId', 'settled_type', 'adminId'];
      const options = { where: { id } };
      const result = await this.transactionRepo.getRowWhereData(att, options);
      if (!result || result === k500Error) return false;
      const data: any = { ...result, amount: result?.paidAmount };
      if (result?.settled_type === 'FULLPAY_SETTLED') data.isCloseLoan = true;
      if (!data?.emiId) data.emiId = -1;
      const loanData = await this.getLoanData(data, true);
      if (!loanData || loanData === k500Error) return false;
      try {
        loanData?.emiData.forEach((e) => {
          try {
            if (e?.payment_status === '1' && e?.pay_type === 'FULLPAY')
              e.payment_status = '0';
            e?.transactionData.forEach((element) => {
              if (element.id == id) {
                element.status = 'INITIALIZED';
                e.payment_status = '0';
              }
            });
          } catch (error) {}
        });
      } catch (error) {}
      const prePareAmount: any = await this.prePareAmount(data, loanData);

      if (prePareAmount?.dueAmount) {
        if (prePareAmount?.dataWaiver) prePareAmount.adminId = result?.adminId;
        return prePareAmount;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  //#region update data Waiver this function use for full pay setteld amount
  private async updateWaiver(dataWaiver, adminId, paymentData, ip) {
    try {
      const keys = Object.keys(dataWaiver);
      for (let index = 0; index < keys.length; index++) {
        try {
          const key = keys[index];
          const id = +key;
          const value = dataWaiver[key];
          const waiverEMIamount =
            value['fullPayPrincipal'] + value['fullPayInterest'] ?? 0;
          const waiverPenalty = value['fullPayPenalty'] ?? 0;
          const waiverRegInterest = value['fullPayRegInterest'] ?? 0;
          const waiverBounce = value['fullPayBounce'] ?? 0;
          const waiverPenal = value['fullPayPenal'] ?? 0;
          const waiverLegal = value['fullPayLegalCharge'] ?? 0;
          if (
            waiverEMIamount +
              waiverPenalty +
              waiverRegInterest +
              waiverBounce +
              waiverPenal +
              waiverLegal >
            0
          ) {
            const att = [
              'id',
              'emi_amount',
              'penalty',
              'regInterestAmount',
              'bounceCharge',
              'gstOnBounceCharge',
              'dpdAmount',
              'penaltyChargesGST',
              'legalCharge',
              'legalChargeGST',
              'waiver',
              'userId',
              'loanId',
            ];
            const options = { where: { id, payment_status: '0' } };
            const emiData = await this.emiRepo.getRowWhereData(att, options);
            if (!emiData || emiData === k500Error) continue;
            /// emi amount calculation
            let emi_amount: any = +(emiData?.emi_amount ?? 0) - waiverEMIamount;
            if (emi_amount < 0) emi_amount = 0;
            emi_amount = emi_amount.toFixed(2);
            // penalty amount calculation
            let penalty: any = +(emiData?.penalty ?? 0) - waiverPenalty;
            if (penalty < 0) penalty = 0;
            penalty = +penalty.toFixed(2);
            // Deffered amount calculation
            let regInterestAmount: any =
              +(emiData?.regInterestAmount ?? 0) - waiverRegInterest;
            if (regInterestAmount < 0) regInterestAmount = 0;
            regInterestAmount = +regInterestAmount.toFixed(2);
            // bounceCharge amount calculation
            let bounceCharge: any =
              (emiData?.bounceCharge ?? 0) +
              (emiData?.gstOnBounceCharge ?? 0) -
              waiverBounce;
            if (bounceCharge < 0) bounceCharge = 0;
            let gstOnBounceCharge = +(
              bounceCharge -
              bounceCharge / 1.18
            ).toFixed(2);
            bounceCharge = +(bounceCharge - gstOnBounceCharge).toFixed(2);
            // penalCharge amount calculation
            let dpdAmount: any =
              (emiData?.dpdAmount ?? 0) +
              (emiData?.penaltyChargesGST ?? 0) -
              waiverPenal;
            if (dpdAmount < 0) dpdAmount = 0;
            let penaltyChargesGST = +(dpdAmount - dpdAmount / 1.18).toFixed(2);
            dpdAmount = +(dpdAmount - penaltyChargesGST).toFixed(2);
            // legalcharge amount calculation
            let legalCharge: any =
              (emiData?.legalCharge ?? 0) +
              (emiData?.legalChargeGST ?? 0) -
              waiverLegal;
            if (legalCharge < 0) legalCharge = 0;
            let legalChargeGST = +(legalCharge - legalCharge / 1.18).toFixed(2);
            legalCharge = +(legalCharge - legalChargeGST).toFixed(2);
            // waiver amount calculation
            let waiver =
              (emiData?.waiver ?? 0) +
              waiverEMIamount +
              waiverPenalty +
              waiverRegInterest +
              waiverBounce +
              waiverPenal +
              waiverLegal;
            waiver = this.typeService.manageAmount(waiver);
            const updateData = {
              emi_amount,
              penalty,
              waiver,
              regInterestAmount,
              bounceCharge,
              gstOnBounceCharge,
              dpdAmount,
              penaltyChargesGST,
              legalCharge,
              legalChargeGST,
            };
            const userActivity = {
              emiId: id,
              waiver_emiAmount: waiverEMIamount,
              waiver_penalty: waiverPenalty,
              waiver_regIntAmount: waiverRegInterest,
              waiver_bounce: waiverBounce,
              waiver_penal: waiverPenal,
              waiver_legal: waiverLegal,
            };
            const createAcitivity = {
              loanId: emiData?.loanId,
              userId: emiData?.userId,
              type: 'WAIVER_PAID',
              date: this.typeService.getGlobalDate(new Date()).toJSON(),
              respons: JSON.stringify(userActivity),
            };
            this.userActivityRepo.createRowData(createAcitivity);
            await this.sharedCalculation.updateWaivedBifurcation(
              id,
              userActivity,
            );
            await this.emiRepo.updateRowData(updateData, id);
            const logCreateObj: any = {
              userId: paymentData.userId,
              loanId: paymentData.loanId,
              type: 'Waiver',
              subType: 'Waiver',
              oldData: 0,
              newData:
                waiverEMIamount +
                waiverPenalty +
                waiverRegInterest +
                waiverBounce +
                waiverPenal +
                waiverLegal,
              adminId,
              ip,
            };
            this.changeLogsRepo.create(logCreateObj);
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region update part pay
  private async checkAndUpdateEMIPartPay(id: number, emiId: number) {
    try {
      const loanInclude = {
        model: loanTransaction,
        attributes: ['penaltyCharges', 'isPartPayment'],
      };
      const emiAttr = [
        'id',
        'emi_amount',
        'penalty',
        'partPaymentPenaltyAmount',
        'settledId',
        'pay_type',
        'principalCovered',
        'interestCalculate',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
        'payment_status',
        'payment_due_status',
        'loanId',
      ];
      const emiOptions: any = { where: { id: emiId } };
      emiOptions.include = loanInclude;
      const emiData = await this.emiService.getRowWhereData(
        emiAttr,
        emiOptions,
      );
      if (!emiData || emiData == k500Error) return false;

      // for old users bounce charge is alreafy included in penalty
      if (!emiData?.loan?.penaltyCharges?.MODIFICATION_CALCULATION)
        emiData.bounceCharge = 0;

      if (emiData?.payment_status == '1') return true;
      const att = [
        'id',
        'paidAmount',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'regInterestAmount',
        'bounceCharge',
        'cgstOnBounceCharge',
        'sgstOnBounceCharge',
        'penalCharge',
        'cgstOnPenalCharge',
        'sgstOnPenalCharge',
        'legalCharge',
        'cgstOnLegalCharge',
        'sgstOnLegalCharge',
        'completionDate',
      ];
      const option = { where: { emiId, status: kCompleted } };
      const transactionData = await this.transactionRepo.getTableWhereData(
        att,
        option,
      );
      if (!transactionData || transactionData == k500Error) return false;
      let emiPaidAmount = 0;
      let emiPaidPenalty = 0;
      let emiPaidCharges = 0;
      let idPaidPenaltyAmount = 0;
      let payment_done_date;
      transactionData.forEach((element) => {
        try {
          emiPaidAmount += element?.principalAmount ?? 0;
          emiPaidAmount += element?.interestAmount ?? 0;
          emiPaidPenalty += element?.penaltyAmount ?? 0;
          emiPaidCharges += element?.regInterestAmount ?? 0;
          emiPaidCharges += element?.bounceCharge ?? 0;
          emiPaidCharges += element?.sgstOnBounceCharge ?? 0;
          emiPaidCharges += element?.cgstOnBounceCharge ?? 0;
          emiPaidCharges += element?.penalCharge ?? 0;
          emiPaidCharges += element?.sgstOnPenalCharge ?? 0;
          emiPaidCharges += element?.cgstOnPenalCharge ?? 0;
          emiPaidCharges += element?.legalCharge ?? 0;
          emiPaidCharges += element?.cgstOnLegalCharge ?? 0;
          emiPaidCharges += element?.sgstOnLegalCharge ?? 0;
          if (element.id === id) {
            idPaidPenaltyAmount = element?.penaltyAmount ?? 0;
            payment_done_date = element.completionDate;
          }
        } catch (error) {}
      });

      let emiAmount =
        (emiData?.principalCovered ?? 0) + (emiData?.interestCalculate ?? 0);
      emiAmount -= emiPaidAmount;
      let emiCharges =
        this.typeService.manageAmount(emiData?.regInterestAmount ?? 0) +
        this.typeService.manageAmount(emiData?.bounceCharge ?? 0) +
        this.typeService.manageAmount(emiData?.gstOnBounceCharge ?? 0) +
        this.typeService.manageAmount(emiData?.dpdAmount ?? 0) +
        this.typeService.manageAmount(emiData?.penaltyChargesGST ?? 0) +
        this.typeService.manageAmount(emiData?.legalCharge ?? 0) +
        this.typeService.manageAmount(emiData?.legalChargeGST ?? 0);
      emiCharges -= emiPaidCharges;
      const partPenaltyAmount = +(emiData?.partPaymentPenaltyAmount ?? 0);
      let emi_amount = +(emiData.emi_amount ?? 0);
      if (emi_amount > emiAmount) emi_amount = emiAmount;
      let penalty = +(emiData.penalty ?? 0);
      const partPaymentPenaltyAmount = emiPaidPenalty;
      if (
        idPaidPenaltyAmount &&
        !(
          partPenaltyAmount + 10 > emiPaidPenalty &&
          partPenaltyAmount - 10 < emiPaidPenalty
        )
      )
        penalty -= idPaidPenaltyAmount;

      if (emi_amount < 0) emi_amount = 0;
      if (penalty < 0) penalty = 0;
      if (emiCharges < 0) emiCharges = 0;

      const updatedData: any = {};
      if (emi_amount <= 10 && penalty <= 10 && emiCharges <= 10) {
        emi_amount = +(emiData.emi_amount ?? 0);
        updatedData.payment_done_date = payment_done_date;
        updatedData.payment_status = '1';
      }
      updatedData.emi_amount = emi_amount;
      updatedData.penalty = penalty;
      updatedData.partPaymentPenaltyAmount = partPaymentPenaltyAmount;
      if (updatedData.payment_status === '1')
        updatedData.pay_type = emiData?.pay_type ?? 'EMIPAY';
      const updateResponse = await this.emiService.updateRowData(
        updatedData,
        emiId,
      );
      if (updateResponse == k500Error) return false;
      // Disabling The Part Pay Option (if it's enabled by admin)
      if (
        emiData?.payment_due_status === '1' &&
        updatedData.payment_status === '1' &&
        emiData?.loan?.isPartPayment
      ) {
        const emiList = await this.emiRepo.getTableWhereData(
          ['payment_status', 'payment_due_status'],
          {
            where: { loanId: emiData?.loanId },
          },
        );
        if (emiList == k500Error) return kInternalError;
        let canUpdate = true;
        emiList.forEach((ele) => {
          if (ele?.payment_status == '0' && ele?.payment_due_status == '1')
            canUpdate = false;
        });
        if (canUpdate) {
          const update = await this.loanRepo.updateRowData(
            { isPartPayment: 0, partPayEnabledBy: SYSTEM_ADMIN_ID },
            emiData?.loanId,
          );
          if (update == k500Error) return kInternalError;
        }
      }
    } catch (error) {
      return false;
    }
  }
  //#endregion

  async isEligibleForLoanClose(loanId: number) {
    try {
      if (!loanId) return false;
      let options: any = { where: { loanId } };
      let attributes = [
        'payment_done_date',
        'payment_status',
        'interestCalculate',
        'principalCovered',
        'fullPayInterest',
        'pay_type',
      ];
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      let totalExpectedAmount = 0;

      for (let index = 0; index < emiList.length; index++) {
        try {
          const emi = emiList[index];
          const principalAmount = +emi?.principalCovered ?? 0;
          const interestAmount = +emi?.interestCalculate ?? 0;
          if (emi?.pay_type == 'FULLPAY') {
            const fullPayInterest = Math.ceil(+emi?.fullPayInterest);
            totalExpectedAmount += principalAmount + fullPayInterest;
          } else totalExpectedAmount += principalAmount + interestAmount;
        } catch (error) {}
      }
      totalExpectedAmount = Math.ceil(totalExpectedAmount);

      if (emiList == k500Error || emiList.length === 0) return false;

      const paidEMIs = emiList.filter(
        (el) => el.payment_status == '1' && el.payment_done_date != null,
      );
      const isAllEMIPaid = paidEMIs.length === emiList.length;
      // Calculate paid amount
      attributes = ['paidAmount'];
      options = { where: { loanId, status: kCompleted } };
      const transList = await this.transactionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return false;
      const paidAmount = transList.reduce(
        (prev, curr) => prev + curr.paidAmount,
        0,
      );
      // Calculate raw EMI amount
      const isPrincipalPaid = paidAmount >= totalExpectedAmount;

      return isAllEMIPaid && isPrincipalPaid;
    } catch (error) {
      return false;
    }
  }

  async closeTheLoan(targetData: any) {
    try {
      const isLoanClosure = targetData?.isLoanClosure ?? false;
      const isLoanSettled = targetData?.isLoanSettled ?? false;
      const loanCompletionDate = this.typeService
        .getGlobalDate(new Date())
        .toJSON();
      const loanData = {
        loanStatus: 'Complete',
        loanCompletionDate,
        check_total_principal_paid_date: new Date(),
        isLoanClosure,
        isLoanSettled,
      };
      const loanId = targetData.loanId;
      const updateLoanData = await this.loanRepo.updateRowData(
        loanData,
        loanId,
      );
      if (updateLoanData == k500Error) return kInternalError;
      await this.legalService.legalCloseLegalAndCloseLoan({
        loanIds: [loanId],
      });
      await this.createUserNoc({ loanId });
      const userId = targetData.userId;
      const loanInclude = {
        model: loanTransaction,
        attributes: ['appType', 'loanClosureEnabledBy', 'isLoanClosure'],
      };
      const masterData = await this.masterRepository.getRowWhereData(
        ['id', 'status'],
        { where: { loanId }, order: [['id', 'DESC']], include: [loanInclude] },
      );
      if (masterData === k500Error) return kInternalError;

      // checking for loan is closed with partial payment then add entry in change log Entity
      masterData.status.loan = 7;
      const updateMaster = await this.masterRepository.updateRowData(
        masterData,
        masterData.id,
      );
      if (updateMaster == k500Error) return kInternalError;
      const userData = await this.userRepo.getRowWhereData(
        ['completedLoans', 'loanStatus', 'referralId', 'phone'],
        { where: { id: userId } },
      );
      if (userData == k500Error || !userData) return kInternalError;

      // Give referral if referralId exist and completed first loan onTime
      if (
        userData.referralId &&
        (userData.completedLoans ?? 0) == 0 &&
        userData.loanStatus === 1 &&
        loanData.loanStatus === 'Complete'
      ) {
        await this.sharedReferral.addReferral({
          userId,
          loanId,
          stage: ReferralStages.LOAN_COMPLETE,
        });
      }

      const updateUserData = await this.userRepo.updateRowData(
        {
          completedLoans: (userData?.completedLoans ?? 0) + 1,
          pinCrm: null,
        },
        userId,
      );
      if (updateUserData == k500Error) return kInternalError;
      // temporary redis code commented due to PROD issue
      // const key = `${userId}_USER_BASIC_DETAILS`;
      // await this.redisService.del(key);

      // sent review link to ontime loan completion users
      const appType = masterData.loanData?.appType;
      if (userData?.loanStatus === 1 && loanData?.loanStatus === 'Complete') {
        await this.sharedNotification.sendReviewMessage({
          phoneNumber: userData?.phone,
          loanId,
          appType,
        });
      }

      await this.userServiceV4.routeDetails({ id: userId });

      // update status of active loan address
      try {
        await this.repoManager.updateRowWhereData(
          ActiveLoanAddressesEntity,
          { isActive: false },
          { where: { loanId } },
        );
      } catch (error) {}
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkPTPTransactionStatus(loanId, transId) {
    try {
      // Params validation
      if (!loanId) return kParamMissing('loanId');
      if (!transId) return kParamMissing('transId');

      // Get payment data
      let attributes: any = ['completionDate', 'paidAmount'];
      let options: any = {
        where: { id: transId, status: kCompleted },
      };
      // Query
      const transData = await this.transactionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!transData) return k422ErrorMessage(kNoDataFound);
      if (transData == k500Error) return kInternalError;

      const completionDate = this.typeService.getGlobalDate(
        transData.completionDate,
      );
      const rangeData = this.dateService.utcDateRange(
        new Date(completionDate),
        new Date(completionDate),
      );

      // Query preparation
      const userInclude: { model; attributes? } = { model: registeredUsers };
      userInclude.attributes = ['id', 'lastCrm'];
      const include = [userInclude];
      attributes = ['id', 'totalReceivedAmount', 'createdAt', 'due_date'];
      options = {
        include,
        order: [['id', 'DESC']],
        where: {
          loanId,
          due_date: { [Op.gte]: completionDate },
          relationData: {
            [Op.or]: [
              { titleId: { [Op.in]: ptpCrmIds } },
              { reasonId: { [Op.in]: ptpCrmIds } },
            ],
          },
        },
      };
      // Query
      const crmData: any = await this.crmRepo.getRowWhereData(
        attributes,
        options,
      );
      if (crmData === k500Error) return kInternalError;
      else if (!crmData) return k422ErrorMessage(kNoDataFound);
      let sDate = this.typeService
        .getGlobalDate(new Date(crmData?.createdAt))
        .toJSON();
      let eDate = this.typeService
        .getGlobalDate(new Date(crmData?.due_date))
        .toJSON();

      attributes = [
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'amount'],
      ];
      options = {
        where: {
          loanId,
          completionDate: {
            [Op.gte]: sDate,
            [Op.lte]: eDate,
          },
          status: 'COMPLETED',
          type: { [Op.ne]: 'REFUND' },
        },
      };
      const allTransData = await this.transactionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (allTransData === k500Error) return kInternalError;

      // Update data
      const crmId = crmData.id;
      const dueDate = await this.typeService.getGlobalDate(
        crmData?.registeredUsers?.lastCrm?.due_date,
      );
      const paidAmount = allTransData?.amount ?? 0;
      const totalReceived = Math.round(paidAmount);

      // trans_status = 1: Ontime Close, 2: Pre Close
      const updatedData = {
        transactionId: transId,
        trans_status: 2,
        totalReceivedAmount: totalReceived,
      };

      // Convert dueDate and completionDate to date strings with only the date part to Match
      const dueDateString = dueDate.toISOString().split('T')[0];
      const completionDateString = completionDate.toISOString().split('T')[0];

      if (dueDateString === completionDateString) {
        updatedData.trans_status = 1;
      }
      const updatedResponse = await this.crmRepo.updateRowData(
        updatedData,
        crmId,
      );
      if (updatedResponse == k500Error) return kInternalError;

      const userData: any = crmData.registeredUsers ?? {};
      const lastCrmData = userData.lastCrm ?? {};
      if (
        lastCrmData &&
        lastCrmData.due_date &&
        ptpCrmIds.includes(lastCrmData.titleId)
      ) {
        const dueDate = new Date(lastCrmData.due_date);
        if (
          rangeData.minRange.getTime() <= dueDate.getTime() &&
          rangeData.maxRange.getTime() >= dueDate.getTime()
        ) {
          lastCrmData.isPTPPaid = true;
          await this.userRepo.updateRowData(
            { lastCrm: lastCrmData },
            userData.id,
          );
        }
        return {};
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkUserStatus(loanId) {
    try {
      // Table joins
      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = ['payment_due_status', 'payment_status'];
      // Query preparation
      const include = [emiInclude];
      const attributes = ['userId'];
      let options: any = { limit: 1, include, where: { id: loanId } };
      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      const onTimeUsers = [];
      const delayedUsers = [];
      const defaultedUsers = [];
      loanList.forEach((el) => {
        try {
          const userId = el.userId;
          const emiList: any = el.emiData ?? {};
          const isDelayed = emiList.find((el) => el.payment_due_status == '1');
          // On time
          if (!isDelayed) onTimeUsers.push(userId);
          else {
            const isDefaulter = emiList.find(
              (el) => el.payment_due_status == '1' && el.payment_status == '0',
            );
            if (isDefaulter) defaultedUsers.push(userId);
            else delayedUsers.push(userId);
          }
        } catch (error) {}
      });
      // Update defaulter users
      if (defaultedUsers.length > 0) {
        const updatedData = { loanStatus: 3 };
        options = { where: { id: defaultedUsers } };
        await this.userRepo.updateRowWhereData(updatedData, options);
      }
      // Update delayed users
      if (delayedUsers.length > 0) {
        const updatedData = { loanStatus: 2 };
        options = { where: { id: delayedUsers } };
        await this.userRepo.updateRowWhereData(updatedData, options);
      }
      // Update on time users
      if (onTimeUsers.length > 0) {
        const updatedData = { loanStatus: 1 };
        options = { where: { id: onTimeUsers } };
        await this.userRepo.updateRowWhereData(updatedData, options);
      }
    } catch (error) {}
  }

  //#region  prePare amount for waiver
  private prePareAmountForWaiver(loanData, body) {
    try {
      let amount = body?.amount ?? 0;
      let unPaidWaiveAmount = 0;
      const emiList = [];
      /// pre pare emi amount paid and remanige
      loanData?.emiData.sort((a, b) => a.id - b.id);
      loanData?.emiData.forEach((ele) => {
        let waiveAmount = 0;
        waiveAmount += ele?.waiver;
        waiveAmount += ele?.paid_waiver;
        waiveAmount += ele?.unpaid_waiver;
        let paidPrincipal = ele?.fullPayPrincipal ?? 0;
        let paidInterest = ele?.fullPayInterest ?? 0;
        let paidPenalty = ele?.fullPayPenalty ?? 0;
        let paidRegInterest = ele?.fullPayRegInterest ?? 0;
        let paidBounce = ele?.fullPayBounce ?? 0;
        let paidPenal = ele?.fullPayPenal ?? 0;
        let paidLegal = ele?.fullPayLegalCharge ?? 0;

        try {
          const filter = loanData.transactionData.filter(
            (f) => f.emiId == ele.id,
          );
          filter.forEach((tran) => {
            paidPrincipal += tran?.principalAmount ?? 0;
            paidInterest += tran?.interestAmount ?? 0;
            paidPenalty += tran?.penaltyAmount ?? 0;
            paidRegInterest += tran?.regInterestAmount ?? 0;
            paidBounce += tran?.bounceCharge ?? 0;
            paidBounce += tran?.sgstOnBounceCharge ?? 0;
            paidBounce += tran?.cgstOnBounceCharge ?? 0;
            paidPenal += tran?.penalCharge ?? 0;
            paidPenal += tran?.sgstOnPenalCharge ?? 0;
            paidPenal += tran?.cgstOnPenalCharge ?? 0;
            paidLegal += tran?.legalCharge ?? 0;
            paidLegal += tran?.cgstOnLegalCharge ?? 0;
            paidLegal += tran?.sgstOnPenalCharge ?? 0;
          });
        } catch (error) {}
        paidPrincipal = this.typeService.manageAmount(paidPrincipal);
        paidInterest = this.typeService.manageAmount(paidInterest);
        paidPenalty = this.typeService.manageAmount(paidPenalty);
        unPaidWaiveAmount += waiveAmount;
        let diffPrincipal = ele.principalCovered - paidPrincipal;
        if (diffPrincipal < 0) {
          paidPrincipal += diffPrincipal;
          paidInterest += -1 * diffPrincipal;
          diffPrincipal = 0;
        }
        let diffInterest = ele.interestCalculate - paidInterest;
        if (diffPrincipal > 0) waiveAmount -= diffPrincipal;
        if (diffInterest > 0) waiveAmount -= diffInterest;
        if (diffInterest < 0) {
          paidInterest += diffInterest;
          paidPenalty += -1 * diffInterest;
          diffInterest = 0;
        }

        let diffPenalty = waiveAmount;
        let diffRegInterest = ele.regInterestAmount - paidRegInterest;
        if (diffRegInterest < 0) diffRegInterest = 0;
        let diffBounce = ele.bounceCharge + ele.gstOnBounceCharge - paidBounce;
        if (diffBounce < 0) diffBounce = 0;
        let diffPenal = ele.dpdAmount + ele.penaltyChargesGST - paidPenal;
        if (diffPenal < 0) diffPenal = 0;
        let diffLegal = ele.legalCharge + ele.legalChargeGST - paidLegal;
        if (diffLegal < 0) diffLegal = 0;
        waiveAmount = 0;
        diffPrincipal = Math.round(diffPrincipal);
        diffInterest = Math.round(diffInterest);
        diffPenalty = Math.round(diffPenalty);

        if (diffPenalty < 0) diffPenalty = 0;
        emiList.push({
          id: ele.id,
          paidPrincipal,
          paidInterest,
          paidPenalty,
          paidRegInterest,
          paidBounce,
          paidPenal,
          paidLegal,
          diffPrincipal,
          diffInterest,
          diffPenalty,
          diffRegInterest,
          diffBounce,
          diffPenal,
          diffLegal,
          waiveAmount,
          coverPrincipal: 0,
          coverInterest: 0,
          coverPenalty: 0,
          coverRegInterest: 0,
          coverBounce: 0,
          coverPenal: 0,
          coverLegal: 0,
          emi: ele,
        });
      });

      if (amount == 0 || amount > unPaidWaiveAmount) amount = unPaidWaiveAmount;
      const finalData = {
        paidAmount: 0,
        principalAmount: 0,
        interestAmount: 0,
        penaltyAmount: 0,
        regInterestAmount: 0,
        bounceCharge: 0,
        penalCharge: 0,
        legalCharge: 0,
        emiId: -2,
        type: amount == unPaidWaiveAmount ? 'EMIPAY' : 'PARTPAY',
        settled_type: 'WAIVER_SETTLED',
      };
      if (amount != 0 && amount <= unPaidWaiveAmount) {
        emiList.forEach((emi) => {
          if (amount > 0) {
            /// calculate principal amount
            if (amount >= emi.diffPrincipal) {
              finalData.principalAmount += emi.diffPrincipal;
              finalData.paidAmount += emi.diffPrincipal;
              amount -= emi.diffPrincipal;
              emi.coverPrincipal = emi.diffPrincipal;
            } else {
              finalData.principalAmount += amount;
              finalData.paidAmount += amount;
              emi.coverPrincipal = amount;
              amount = 0;
            }
            /// calculate interest amount
            if (amount >= emi.diffInterest) {
              finalData.interestAmount += emi.diffInterest;
              finalData.paidAmount += emi.diffInterest;
              amount -= emi.diffInterest;
              emi.coverInterest = emi.diffInterest;
            } else {
              finalData.interestAmount += amount;
              finalData.paidAmount += amount;
              emi.coverInterest = amount;
              amount = 0;
            }
            /// calculate penalty amount
            if (amount >= emi.diffPenalty) {
              finalData.penaltyAmount += emi.diffPenalty;
              finalData.paidAmount += emi.diffPenalty;
              amount -= emi.diffPenalty;
              emi.coverPenalty = emi.diffPenalty;
            } else {
              finalData.penaltyAmount += amount;
              finalData.paidAmount += amount;
              emi.coverPenalty = amount;
              amount = 0;
            }
            /// calculate deffered Interest
            if (amount >= emi.diffRegInterest) {
              finalData.regInterestAmount += emi.diffRegInterest;
              finalData.paidAmount += emi.diffRegInterest;
              amount -= emi.diffRegInterest;
              emi.coverRegInterest = emi.diffRegInterest;
            } else {
              finalData.regInterestAmount += amount;
              finalData.paidAmount += amount;
              emi.coverRegInterest = amount;
              amount = 0;
            }
            /// calculate bounce charge
            if (amount >= emi.diffBounce) {
              finalData.bounceCharge += emi.diffBounce;
              finalData.paidAmount += emi.diffBounce;
              amount -= emi.diffBounce;
              emi.coverBounce = emi.diffBounce;
            } else {
              finalData.bounceCharge += amount;
              finalData.paidAmount += amount;
              emi.coverBounce = amount;
              amount = 0;
            }
            /// calculate penal charge
            if (amount >= emi.diffPenal) {
              finalData.penalCharge += emi.diffPenal;
              finalData.paidAmount += emi.diffPenal;
              amount -= emi.diffPenal;
              emi.coverPenal = emi.diffPenal;
            } else {
              finalData.penalCharge += amount;
              finalData.paidAmount += amount;
              emi.coverPenal = amount;
              amount = 0;
            }
            // calculate legal charge
            if (amount >= emi.diffLegal) {
              finalData.legalCharge += emi.diffLegal;
              finalData.paidAmount += emi.diffLegal;
              amount -= emi.diffLegal;
              emi.coverLegal = emi.diffLegal;
            } else {
              finalData.penalCharge += amount;
              finalData.paidAmount += amount;
              emi.coverPenal = amount;
              amount = 0;
            }

            if (finalData.emiId == -2) finalData.emiId = emi.id;
            else {
              finalData.emiId = -1;
              finalData.type = 'FULLPAY';
            }
          }
        });
      } else return k422ErrorMessage(kSomthinfWentWrong);
      return { finalData, emiList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // Bifurcation only works for delayed emis
  private async canCheckBifurcation(emiId) {
    try {
      // Param validation
      if (!emiId || emiId == -1) return false;
      if (isNaN(emiId)) return false;
      // Query preparation
      const attributes = ['payment_status', 'payment_due_status'];
      const options = { where: { id: emiId } };
      // Query
      const emiData = await this.emiRepo.getRowWhereData(attributes, options);
      if (!emiData) return false;
      if (emiData == k500Error) return true;
      if (emiData.payment_due_status == '1' && emiData.payment_status == '0')
        return true;
      return false;
    } catch (error) {
      return true;
    }
  }

  /// getBoth this veribale use for get data active and complited loan
  async getLoanData(body, getBoth = false) {
    try {
      const loanId = +body.loanId;
      const emiId = +body.emiId;
      const settledId = body.settledId;
      /// transaction
      const tranInclude: any = { model: TransactionEntity };
      tranInclude.attributes = [
        'id',
        'paidAmount',
        'status',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'regInterestAmount',
        'bounceCharge',
        'cgstOnBounceCharge',
        'sgstOnBounceCharge',
        'penalCharge',
        'cgstOnPenalCharge',
        'sgstOnPenalCharge',
        'legalCharge',
        'cgstOnLegalCharge',
        'sgstOnLegalCharge',
        'subStatus',
      ];
      if (getBoth !== true) tranInclude.where = { status: 'COMPLETED' };
      tranInclude.required = false;
      // Emi
      const attributes = [
        'id',
        'emi_amount',
        'emi_date',
        'payment_status',
        'penalty',
        'penalty_days',
        'userId',
        'settledId',
        'payment_due_status',
        'principalCovered',
        'interestCalculate',
        'regInterestAmount',
        'bounceCharge',
        'dpdAmount',
        'legalCharge',
        'gstOnBounceCharge',
        'penaltyChargesGST',
        'legalChargeGST',
        'partPaymentPenaltyAmount',
        'pay_type',
        'paid_principal',
        'paid_interest',
        'paidRegInterestAmount',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
      ];

      const emiWhere: any = getBoth === true ? {} : { payment_status: '0' };
      if (emiId != -1) emiWhere.id = emiId;
      let option: any = { where: { loanId, ...emiWhere } };
      /// if settled id then update
      if (settledId) {
        const updateData = await this.emiRepo.updateRowData(
          { settledId },
          option,
        );
        if (!updateData || updateData == k500Error) return kInternalError;
      }
      const emiInclude: any = { model: EmiEntity, attributes };
      emiInclude.include = [tranInclude];
      // user
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = [
        'id',
        'email',
        'phone',
        'fullName',
        'appType',
        'loanStatus',
      ];
      // subScription
      const subScription: any = { model: SubScriptionEntity };
      subScription.attributes = ['mode', 'referenceId', 'status', 'umrn'];
      // Mandate
      const mandate = { model: mandateEntity, attributes: ['emandate_id'] };
      const include = [userInclude, emiInclude, subScription, mandate];
      // Loan
      const att = [
        'id',
        'loanStatus',
        'loan_disbursement_date',
        'interestRate',
        'netApprovedAmount',
        'followerId',
        'feesIncome',
        'calculationDetails',
        'penaltyCharges',
        'appType',
        'loanClosureMailCount',
        'settlementMailCount',
      ];
      const where: any = { id: loanId, loanStatus: 'Active' };
      if (getBoth === true)
        where.loanStatus = { [Op.or]: ['Active', 'Complete'] };
      const options = { include, where };
      const loanData = await this.loanRepo.getRowWhereData(att, options);
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      // for old users bounce charge is already included in penalty
      if (!loanData?.penaltyCharges?.MODIFICATION_CALCULATION) {
        for (let emi of loanData.emiData) {
          emi.bounceCharge = 0;
        }
      }
      const phone = await this.cryptService.decryptPhone(
        loanData.registeredUsers.phone,
      );
      if (phone == k500Error) return kInternalError;
      loanData.registeredUsers.phone = phone;

      if (emiId != -1 && getBoth !== true) {
        const find = loanData.emiData.find(
          (e) => e.id === emiId && e.payment_status === '0',
        );
        if (!find) return;
      }
      const emiList = loanData?.emiData;
      for (let i = 0; i < emiList.length; i++) {
        try {
          let ele = emiList[i];
          let cGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          let sGstOnPenal = this.typeService.manageAmount(
            (ele.penaltyChargesGST ?? 0) / 2,
          );
          ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
        } catch (error) {}
      }
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare Amount
  private async prePareAmount(body: any, loanData: loanTransaction) {
    const emiId = body.emiId;
    let amount = +(+(+body?.amount ?? 0).toFixed(2));
    amount = isNaN(amount) ? 0 : amount;
    let dueAmount = 0;
    let principalAmount = 0;
    let interestAmount = 0;
    let penaltyAmount = 0;
    let forClosureAmount = 0;
    let regInterestAmount = 0;
    let bounceCharge = 0;
    let penalCharge = 0;
    let legalCharge = 0;
    let sgstOnBounceCharge = 0;
    let cgstOnBounceCharge = 0;
    let sgstOnPenalCharge = 0;
    let cgstOnPenalCharge = 0;
    let sgstOnLegalCharge = 0;
    let cgstOnLegalCharge = 0;
    let sgstForClosureCharge = 0;
    let cgstForClosureCharge = 0;
    let type = '';
    let settled_type = '';
    let promoCodeRemark = '';
    let forClosureDays = 0;
    let roundOff = 0;
    let dataWaiver = {};
    let isLoanClosure = false;
    const loanId = body.loanId;

    // Full pay
    if (emiId == -1) {
      let fullPay;
      if (body.payment_date) {
        const targetDate = this.typeService.getGlobalDate(body.payment_date);
        fullPay = await this.sharedCalculation.getFullPaymentData({
          loanId,
          targetDate,
        });
        if (fullPay?.message) return fullPay;
      } else
        fullPay = await this.sharedCalculation.getFullPaymentData({ loanId });
      if (fullPay === k500Error) return kInternalError;
      dueAmount = fullPay.totalAmount;

      // Check max amount limit for auto debit
      const maxAutoDebitAmount = GLOBAL_RANGES.MAX_AUTODEBIT_PLACE_AMOUNT;
      if (dueAmount > maxAutoDebitAmount && body.subSource == kAutoDebit) {
        dueAmount = maxAutoDebitAmount;
        body.amount = dueAmount;
      }

      if ((body?.amount ?? 0) > dueAmount) body.amount = dueAmount;
      principalAmount =
        fullPay.remainingPrincipal + fullPay.overduePrincipalAmount;
      interestAmount =
        fullPay.remainingInterest + fullPay.overdueInterestAmount;
      penaltyAmount = fullPay.remainingPenalty;
      forClosureAmount = fullPay.forClosureAmount;
      cgstForClosureCharge = fullPay.cgstForClosureCharge;
      sgstForClosureCharge = fullPay.sgstForClosureCharge;
      forClosureDays = fullPay.forClosureDays;
      bounceCharge = fullPay.bounceCharge;
      penalCharge = fullPay.penalCharge;
      legalCharge = fullPay.legalCharges;
      sgstOnBounceCharge = fullPay.sgstBounceCharge;
      cgstOnBounceCharge = fullPay.cgstBounceCharge;
      sgstOnPenalCharge = fullPay.sgstPenalCharges;
      cgstOnPenalCharge = fullPay.cgstPenalCharges;
      sgstOnLegalCharge = fullPay.sgstLegalCharges;
      cgstOnLegalCharge = fullPay.cgstLegalCharges;
      regInterestAmount = fullPay.regInterestAmount;
      if (
        body?.isCloseLoan != true &&
        amount < fullPay.totalAmount &&
        body.adminId &&
        body?.adminId != SYSTEM_ADMIN_ID
      )
        return k422ErrorMessage(kErrorMsgs.LESS_FULLPAY_AMOUNT);
      if (
        body?.isCloseLoan === true ||
        body?.isLoanClosure ||
        body?.isLoanSettled
      ) {
        if (body.amount < principalAmount + interestAmount)
          return k422ErrorMessage(kAmountLessThanPrincipalAndInt);
        const calFullPay = this.getCalculationOfFullPayAmount(fullPay, body);
        for (let key in calFullPay) {
          if (typeof calFullPay[key] === 'string') {
            console.log('CAL FULL PAY', { fullPay, body, calFullPay });
          }
        }
        if (calFullPay?.message) return calFullPay;
        dueAmount = calFullPay.dueAmount;
        principalAmount = +calFullPay.principalAmount.toFixed(2);
        interestAmount = +calFullPay.interestAmount.toFixed(2);
        penaltyAmount = +calFullPay.penaltyAmount.toFixed(2);
        regInterestAmount = +calFullPay.regInterestAmount.toFixed(2);
        bounceCharge = +calFullPay.bounceCharge.toFixed(2);
        cgstOnBounceCharge = +calFullPay.cgstOnBounceCharge.toFixed(2);
        sgstOnBounceCharge = +calFullPay.sgstOnBounceCharge.toFixed(2);
        cgstOnPenalCharge = +calFullPay.cgstOnPenalCharge.toFixed(2);
        sgstOnPenalCharge = +calFullPay.sgstOnPenalCharge.toFixed(2);
        cgstOnLegalCharge = +calFullPay.cgstOnLegalCharge.toFixed(2);
        sgstOnLegalCharge = +calFullPay.sgstOnLegalCharge.toFixed(2);
        forClosureAmount = +calFullPay.forecloseAmount.toFixed(2);
        sgstForClosureCharge = +calFullPay.sgstOnForecloseCharge.toFixed(2);
        cgstForClosureCharge = +calFullPay.cgstOnForecloseCharge.toFixed(2);
        penalCharge = +calFullPay.penalCharge.toFixed(2);
        legalCharge = +calFullPay.legalCharge.toFixed(2);
        dataWaiver = calFullPay?.dataWaiver;
        roundOff = calFullPay.roundOff ?? 0;
        settled_type = 'FULLPAY_SETTLED';
        isLoanClosure = fullPay?.totalAmount - calFullPay?.dueAmount > 10;
      }
      type = 'FULLPAY';
    }
    // Emi pay or Part pay
    else {
      const emiData = loanData.emiData.find((e) => e.id == emiId);
      // Prevention -> Excessive payment
      if (emiData.payment_status != '0') return false;

      const fullPay = await this.sharedCalculation.getFullPaymentData({
        loanId,
      });

      let emiAmount =
        this.typeService.manageAmount(emiData?.principalCovered ?? 0) +
        this.typeService.manageAmount(emiData?.interestCalculate ?? 0) -
        this.typeService.manageAmount(emiData?.paid_principal ?? 0) -
        this.typeService.manageAmount(emiData?.paid_interest ?? 0) +
        this.typeService.manageAmount(emiData?.penalty ?? 0) +
        this.typeService.manageAmount(emiData?.regInterestAmount ?? 0) -
        this.typeService.manageAmount(emiData?.paidRegInterestAmount ?? 0) +
        this.typeService.manageAmount(emiData?.bounceCharge ?? 0) +
        this.typeService.manageAmount(emiData?.gstOnBounceCharge ?? 0) -
        this.typeService.manageAmount(emiData?.paidBounceCharge ?? 0) +
        this.typeService.manageAmount(emiData?.dpdAmount ?? 0) +
        this.typeService.manageAmount(emiData?.penaltyChargesGST ?? 0) -
        this.typeService.manageAmount(emiData?.paidPenalCharge ?? 0) +
        this.typeService.manageAmount(emiData?.legalCharge ?? 0) +
        this.typeService.manageAmount(emiData?.legalChargeGST ?? 0) -
        this.typeService.manageAmount(emiData?.paidLegalCharge ?? 0);
      const actualEMIAmount = emiAmount;
      emiAmount = this.typeService.manageAmount(emiAmount); // Payment should not be payable in decimals

      const isEMIPay =
        amount == 0 || (amount >= emiAmount - 5 && amount <= emiAmount + 5);

      if (isEMIPay) {
        amount = emiAmount;
        roundOff = parseFloat((emiAmount - actualEMIAmount).toFixed(2)); // Payment should not be payable in decimals so extra payment get considered as round off
        if (roundOff > 5) return kInternalError; // Prevention
      }
      // check if is emi pay then
      const emiDate = new Date(emiData.emi_date);
      emiDate.setDate(emiDate.getDate() - 3);

      const data: any = this.getEMiAmount(emiData, amount);
      if (data === k500Error) return kInternalError;
      else if (
        data.isGreaterEMI == true &&
        body.source != 'UPI' &&
        body.subSource != 'APP' &&
        body.subSource != 'WEB' &&
        body.isGreaterEMI != true
      ) {
        return k422ErrorMessage(kAmountGreaterThan);
      }

      if (isEMIPay) type = 'EMIPAY';
      else type = 'PARTPAY';
      // Prevention -> To Avoid Part Payment Less Than 1000
      if (type == kPartPay) {
        if (body?.amount < 1000 && fullPay?.totalAmount > 1000)
          return k422ErrorMessage(`Part Payment Less Than 1000 is Not Allowed`);
      }

      // Prevention -> Excessive payment
      if (body?.amount > fullPay?.totalAmount + 10 && type == 'PARTPAY')
        return k422ErrorMessage('Enter amount is greater than fullpay amount');
      principalAmount = data.principalAmount;
      interestAmount = data.interestAmount;
      penaltyAmount = data.penaltyAmount;
      regInterestAmount = data.regInterestAmount;
      bounceCharge = data.bounceChargeAmount;
      penalCharge = data.penalChargesAmount;
      sgstOnBounceCharge = data.sgstBounceChargeAmount;
      cgstOnBounceCharge = data.cgstBounceChargeAmount;
      sgstOnPenalCharge = data.sgstPenalChargeAmount;
      cgstOnPenalCharge = data.cgstPenalChargeAmount;
      legalCharge = data.legalChargeAmount;
      sgstOnLegalCharge = data.sgstLegalChargeAmount;
      cgstOnLegalCharge = data.cgstLegalChargeAmount;
      dueAmount = amount;
      if (data.isGreaterEMI == true) settled_type = 'PARTPAY_GREATER';
    }
    if (dueAmount < 1) return false;

    return {
      principalAmount: this.typeService.manageAmount(principalAmount),
      interestAmount: this.typeService.manageAmount(interestAmount),
      penaltyAmount: this.typeService.manageAmount(penaltyAmount),
      dueAmount: this.typeService.manageAmount(dueAmount),
      roundOff: roundOff,
      forClosureAmount: this.typeService.manageAmount(forClosureAmount),
      regInterestAmount: this.typeService.manageAmount(regInterestAmount),
      penalCharge: this.typeService.manageAmount(penalCharge),
      bounceCharge: this.typeService.manageAmount(bounceCharge),
      legalCharge: this.typeService.manageAmount(legalCharge),
      sgstForClosureCharge: this.typeService.manageAmount(sgstForClosureCharge),
      cgstForClosureCharge: this.typeService.manageAmount(cgstForClosureCharge),
      sgstOnBounceCharge: this.typeService.manageAmount(sgstOnBounceCharge),
      cgstOnBounceCharge: this.typeService.manageAmount(cgstOnBounceCharge),
      sgstOnPenalCharge: this.typeService.manageAmount(sgstOnPenalCharge),
      cgstOnPenalCharge: this.typeService.manageAmount(cgstOnPenalCharge),
      sgstOnLegalCharge: this.typeService.manageAmount(sgstOnLegalCharge),
      cgstOnLegalCharge: this.typeService.manageAmount(cgstOnLegalCharge),
      type,
      settled_type,
      dataWaiver,
      promoCodeRemark,
      forClosureDays,
      isLoanClosure,
    };
  }
  //#endregion

  async sendLoanClosureEmail(query) {
    const loanClosureAmount = +query?.amount;
    if (!loanClosureAmount) return kParamMissing('amount');
    if (loanClosureAmount) {
      const isInDecimal = Number.isInteger(loanClosureAmount);
      if (!isInDecimal)
        return k422ErrorMessage('Amount In Decimal is Not Allowed');
    }
    const loanId = query?.loanId;
    if (!loanId) return kParamMissing('loanId');
    const adminId = query?.adminId;
    if (!adminId) return kParamMissing('adminId');
    let date = query?.date;
    if (!date) return kParamMissing('date');
    let time = query?.time;
    if (!time) return kParamMissing('time');
    const mailType = query?.mailType;
    if (!mailType) return kParamMissing('mailType');
    let type = '';
    if (mailType == 'SETTLEMENT') type = '1';
    else if (mailType == 'LOAN_CLOSURE_OFFER') type = '2';

    let subStatus = null;
    if (type == '1') subStatus = kLoanSettled;
    else if (type == '2') subStatus = kLoanClosureStr;

    const body = {
      loanId,
      emiId: -1,
      settleId: query.adminId,
      amount: +loanClosureAmount,
      isCloseLoan: true,
      source: 'PAYMENT_LINK',
      subStatus,
    };

    const loanData = await this.getLoanData(body);
    if (loanData === k500Error) throw new Error();
    if (loanData?.message) return loanData;

    const prePareAmount: any = await this.prePareAmount(body, loanData);
    if (prePareAmount === false) throw new Error();
    if (!prePareAmount?.dueAmount) return prePareAmount;

    const result: any = await this.prePareTransaction(
      body,
      prePareAmount,
      loanData,
    );
    if (!result || result == k500Error) throw new Error();
    if (result?.statusCode) return result;

    const loanClosureMailCount = loanData.loanClosureMailCount + 1;
    const settlementMailCount = loanData.settlementMailCount + 1;
    const appType = loanData?.appType;
    let dataToUpdate: any = {};
    if (type == '1') {
      dataToUpdate.settlementMailCount = settlementMailCount;
      dataToUpdate.loanSettlementEnabledBy = adminId;
    } else if (type == '2') {
      dataToUpdate.loanClosureMailCount = loanClosureMailCount;
      dataToUpdate.loanClosureEnabledBy = adminId;
    }
    const loanUpdate = await this.loanRepo.updateRowData(dataToUpdate, loanId);
    if (loanUpdate == k500Error) throw new Error();

    // Adding Entry of Link In DB
    const Date = date.split('-')[0];
    const Month = date.split('-')[1];
    const Year = date.split('-')[2];
    let newDate = `${Year}-${Month}-${Date}`;
    let expiryDate = `${newDate}T10:00:00.000Z`;
    const isLinkCreated = await this.repoManager.createRowData(
      PaymentLinkEntity,
      {
        link: result.paymentLink,
        loanId,
        userId: loanData.registeredUsers.id,
        mailType: type,
        isActive: true,
        expiryDate,
      },
    );
    if (isLinkCreated == k500Error) return kInternalError;

    // Preparing Template
    let templatePath;
    if (type == '1') templatePath = kSettlementLoan;
    else if (type == '2') templatePath = kLoanClosure;
    const template = await this.commonSharedService.getEmailTemplatePath(
      templatePath,
      appType,
    );
    const html: any = this.setValues(
      template,
      this.typeService.amountNumberWithCommas(loanClosureAmount),
      date,
      time,
      result.paymentLink,
      loanId,
      loanData.registeredUsers.fullName,
    );
    if (html?.message) return kInternalError;

    // Sending Mail
    let email = loanData.registeredUsers.email;
    const subject =
      mailType == 'SETTLEMENT' ? 'Loan Settlement Offer' : 'Loan Closure Offer';
    await this.sharedNotification.sendMailFromSendinBlue(
      email,
      subject,
      html,
      loanData.registeredUsers.id,
      null,
      null,
      null,
      kCollectionEmail,
    );
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }

  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private setValues(
    template: string,
    amount: string,
    date: string,
    time: string,
    link: string,
    loanId: string,
    name: string,
  ) {
    try {
      let html = fs.readFileSync(template, 'utf-8');

      html = html.replace('##LOANID##', loanId);
      html = html.replace('##AMOUNT##', amount);
      html = this.replaceAll(html, '##DATE##', date);
      html = this.replaceAll(html, '##TIME##', time);
      html = html.replace('##link##', link);
      html = html.replace('##NBFCNAME##', EnvConfig.nbfc.nbfcName);
      html = html.replace(
        '##NBFCREGISTRATIONNUMBER##',
        EnvConfig.nbfc.nbfcRegistrationNumber,
      );
      html = html.replace('##NAME##', name);
      html = html.replace('##NBFCSHORTNAME##', EnvConfig.nbfc.nbfcShortName);
      html = html.replace('##INFOMAIL##', EnvConfig.mail.infoMail);
      html = html.replace(
        '##PRIVACY_POLICY_LINK##',
        EnvConfig.permissionsLink.nbfc[2],
      );
      html = html.replace(
        '##TERM_AND_CONDITION_LINK##',
        EnvConfig.permissionsLink.nbfc[1],
      );
      html = this.replaceAll(html, '##NBFCLINK##', EnvConfig.url.nbfcWebUrl);

      return html;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async createUserNoc(reqData) {
    try {
      const loanId = reqData?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const type = reqData?.type;
      const adminId = reqData?.adminId ?? SYSTEM_ADMIN_ID;
      const transactionInclude = {
        attributes: ['id', 'paidAmount', 'completionDate'],
        model: TransactionEntity,
        where: { status: 'COMPLETED' },
      };
      const userInclude = {
        attributes: ['id', 'email', 'fullName'],
        model: registeredUsers,
      };
      const emiInclude = {
        attributes: ['waiver', 'paid_waiver', 'unpaid_waiver'],
        model: EmiEntity,
      };
      const esignInclude = {
        attributes: ['id', 'stampId'],
        model: esignEntity,
      };
      const bankIncludes = {
        model: BankingEntity,
        attributes: ['accountNumber'],
      };

      const attributes = [
        'id',
        'userId',
        'netApprovedAmount',
        'loanStatus',
        'appType',
        'isLoanClosure',
        'loanClosureEnabledBy',
      ];
      const options: any = {
        where: { id: loanId, loanStatus: 'Complete' },
        include: [
          transactionInclude,
          userInclude,
          emiInclude,
          esignInclude,
          bankIncludes,
        ],
      };
      const result = await this.loanRepo.getRowWhereData(attributes, options);
      if (!result || result === k500Error) return kInternalError;

      // Operations For Closing Loan Normally
      if (type == 'NORMAL') result.isLoanClosure = true;
      if (type == 'NORMAL' || result.isLoanClosure == true) {
        // ChangeLogEntity Opertaions(Changing Type Waiver to Normal)
        const logOpts = { where: { loanId, type: 'Waiver' } };
        const logUpdatedData = { type: 'NORMAL', oldData: '0', newData: '0' };
        const logsUpdation = await this.repoManager.updateRowWhereData(
          ChangeLogsEntity,
          logUpdatedData,
          logOpts,
        );
        if (logsUpdation === k500Error) throw new Error();
        // Adding Entry in ChangeLogEntity to Report Cibil Normal
        const closureAdminId = result?.loanClosureEnabledBy ?? adminId;
        const userId = result?.userId;
        const creationData = {
          loanId,
          adminId: closureAdminId,
          userId,
          type: 'CIBIL_SETTLED_AMOUNT',
          subType: 'Cibil',
          newData: '',
          oldData: '',
        };
        const createdData = await this.changeLogsRepo.create(creationData);
        if (createdData == k500Error) return kInternalError;
      }
      const adminData = await this.commonSharedService.getAdminData(adminId);
      if (adminData === k500Error) return kInternalError;
      const stampId = result?.eSignData?.stampId;
      let aggrementNo = '-';
      if (stampId) {
        const stampNumber = await this.stampRepo.getRowWhereData(
          ['certificateNo'],
          { where: { id: result?.eSignData?.stampId } },
        );
        if (stampNumber === k500Error) return kInternalError;
        aggrementNo = stampNumber?.certificateNo ?? '-';
      }

      const transactionData = result.transactionData.sort(
        (a, b) => b?.id - a?.id,
      );
      const lastPaymentDate = this.typeService.getGlobalDate(
        new Date(transactionData[0]?.completionDate),
      );
      let totalAmount = 0;
      transactionData.forEach((el) => {
        totalAmount += +el?.paidAmount;
      });
      totalAmount = this.typeService.manageAmount(totalAmount);
      let loanType = 'ONTIME';
      let totalWaiver = 0;
      if (!result?.isLoanClosure) {
        result.emiData.forEach((el) => {
          const waiver =
            (el.waiver ?? 0) + (el.paid_waiver ?? 0) + (el.unpaid_waiver ?? 0);
          if (waiver > 0) {
            totalWaiver += waiver;
            loanType = 'SETTLED';
          }
        });
      }
      // Commented to Send Noc By System
      // if (loanType == 'SETTLED' && adminId == SYSTEM_ADMIN_ID)
      //   return kInternalError;
      const accountNumber = result?.bankingData?.accountNumber;
      const sendData = {
        userData: result.registeredUsers,
        totalAmount: this.strService.readableAmount(totalAmount),
        loanAmount: result?.netApprovedAmount,
        lastPaymentDate,
        loanId,
        aggrementNo,
        adminEmail: adminData?.email,
        loanType,
        appType: result?.appType,
        accountNumber,
        totalWaiver: this.strService.readableAmount(totalWaiver),
      };

      const mailResult = await this.sharedNotification.sendNocBymail(
        sendData.userData?.email,
        sendData,
      );
      if (mailResult === k500Error) return kInternalError;
      await this.loanRepo.updateRowData(
        { nocSentBy: adminId, isLoanClosure: result?.isLoanClosure },
        loanId,
      );
      return mailResult;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async createNormalNoc(loanId) {
    try {
      if (!loanId) return kParamMissing('loanId');
      const options: any = {
        where: {
          loanId,
          [Op.or]: [
            { waiver: { [Op.ne]: null } },
            { paid_waiver: { [Op.ne]: null } },
            { unpaid_waiver: { [Op.ne]: null } },
          ],
        },
      };
      const emiData = await this.emiRepo.getTableWhereData(['id'], options);
      if (emiData === k500Error) throw new Error();
      if (emiData.length == 0) return k422ErrorMessage(kNoDataFound);
      // EMI Operations
      const emiIds = emiData.map((ele) => ele?.id);
      const updateDataForEmi = {
        waiver: null,
        paid_waiver: null,
        unpaid_waiver: null,
        waived_principal: 0,
        waived_interest: 0,
        waived_penalty: 0,
      };
      const emiUpdation = await this.emiRepo.updateRowData(
        updateDataForEmi,
        emiIds,
      );
      if (emiUpdation === k500Error) throw new Error();
      // ChangeLogEntity Opertaions
      const logOpts = { where: { loanId, type: 'Waiver' } };
      const logUpdatedData = { type: 'NORMAL', oldData: '0', newData: '0' };
      const logsUpdation = await this.repoManager.updateRowWhereData(
        ChangeLogsEntity,
        logUpdatedData,
        logOpts,
      );
      if (logsUpdation === k500Error) throw new Error();
      // Loan Operations
      const loanUpdation = await this.loanRepo.updateRowData(
        { nocURL: null, nocSentBy: null },
        loanId,
      );
      if (loanUpdation === k500Error) throw new Error();
      return true;
    } catch (error) {}
  }

  //#region get min amount paid of loanId
  private async getRemainingPrincipalAmountOfLoan(body) {
    try {
      if (body?.isCloseLoan === true) {
        const loanId = body.loanId;
        /// emi model
        const emiAtt = [
          'id',
          'emi_amount',
          'payment_status',
          'payment_due_status',
          'principalCovered',
        ];
        const emiModel = { model: EmiEntity, attributes: emiAtt };
        /// transaction Model
        const tranAtt = ['id', 'paidAmount', 'emiId', 'principalAmount'];
        const tranModel: any = {
          model: TransactionEntity,
          attributes: tranAtt,
        };
        tranModel.where = { status: 'COMPLETED' };
        tranModel.required = false;
        /// loan Options
        const options = {
          where: { id: loanId, loanStatus: 'Active' },
          include: [tranModel, emiModel],
        };
        const att = ['id'];
        const result = await this.loanRepo.getRowWhereData(att, options);
        if (!result || result === k500Error) return kInternalError;
        const emiData = result.emiData;
        const transaction = result.transactionData;
        let remainingPrincipal = 0;
        let amount = 0;
        emiData.forEach((emi) => {
          try {
            if (!(emi.payment_status == '1' && emi.payment_due_status == '0')) {
              remainingPrincipal += emi.principalCovered;
              const tempTrans = transaction.filter(
                (tran) => tran.emiId == emi.id,
              );
              tempTrans.forEach((tran) => {
                amount += tran.paidAmount;
              });
            }
          } catch (error) {}
        });

        remainingPrincipal -= amount;
        if (remainingPrincipal < 0) remainingPrincipal = 0;
        if ((body?.amount ?? 0) < remainingPrincipal + body.interestAmount)
          return k422ErrorMessage(kAmountLessThanPrincipalAndInt);
        return { result, remainingPrincipal };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get calculation of full pay amount
  getCalculationOfFullPayAmount(fullPay, body): any {
    try {
      let dueAmount = fullPay.totalAmount;
      let principalAmount = this.typeService.manageAmount(
        fullPay.remainingPrincipal + fullPay.overduePrincipalAmount,
      );
      let interestAmount = this.typeService.manageAmount(
        fullPay.remainingInterest + fullPay.overdueInterestAmount,
      );
      let penaltyAmount = this.typeService.manageAmount(
        fullPay.remainingPenalty,
      );
      let regInterestAmount = this.typeService.manageAmount(
        fullPay.regInterestAmount,
      );
      let bounceCharge = this.typeService.manageAmount(
        fullPay.bounceCharge +
          fullPay.sgstBounceCharge +
          fullPay.cgstBounceCharge,
      );
      let penalCharge = this.typeService.manageAmount(
        fullPay.penalCharge +
          fullPay.sgstPenalCharges +
          fullPay.cgstPenalCharges,
      );
      let forecloseAmount = this.typeService.manageAmount(
        fullPay.forClosureAmount +
          fullPay.sgstForClosureCharge +
          fullPay.cgstForClosureCharge,
      );
      let legalCharge = this.typeService.manageAmount(
        fullPay.legalCharges +
          fullPay.sgstLegalCharges +
          fullPay.cgstLegalCharges,
      );
      let deductedBounceCharge = 0;
      let deductedPenalCharge = 0;
      let deductedLegalCharge = 0;
      let deductedForecloseAmt = 0;
      let amount = +body?.amount;
      if (body?.isLoanClosure) amount = +body?.loanClosureAmt;
      if (body?.isLoanSettled) amount = +body?.loanSettlementAmt;
      dueAmount = amount;
      if (principalAmount >= amount) {
        principalAmount = amount;
        amount = 0;
      } else amount -= principalAmount;

      if (interestAmount >= amount) {
        interestAmount = amount;
        amount = 0;
      } else amount -= interestAmount;

      if (penaltyAmount >= amount) {
        penaltyAmount = amount;
        amount = 0;
      } else amount -= penaltyAmount;

      if (regInterestAmount >= amount) {
        regInterestAmount = amount;
        amount = 0;
      } else amount -= regInterestAmount;

      if (bounceCharge >= amount) {
        bounceCharge = amount;
        amount = 0;
      } else amount -= bounceCharge;
      deductedBounceCharge = bounceCharge;
      if (penalCharge >= amount) {
        penalCharge = amount;
        amount = 0;
      } else amount -= penalCharge;
      deductedPenalCharge = penalCharge;

      if (legalCharge >= amount) {
        legalCharge = amount;
        amount = 0;
      } else amount -= legalCharge;
      deductedLegalCharge = legalCharge;

      if (forecloseAmount >= amount) {
        forecloseAmount = amount;
        amount = 0;
      } else amount -= forecloseAmount;
      deductedForecloseAmt = forecloseAmount;

      // Bounce GST
      let tempBounce = bounceCharge;
      let gstBounceChargeAmount = bounceCharge - bounceCharge / 1.18;
      gstBounceChargeAmount = this.typeService.manageAmount(
        gstBounceChargeAmount,
      );
      if (gstBounceChargeAmount % 2 == 1) {
        gstBounceChargeAmount = gstBounceChargeAmount - 1;
      }
      // Penal GST
      let tempPenal = penalCharge;
      let gstPenalChargeAmount = penalCharge - penalCharge / 1.18;
      gstPenalChargeAmount =
        this.typeService.manageAmount(gstPenalChargeAmount);
      if (gstPenalChargeAmount % 2 == 1) {
        gstPenalChargeAmount = gstPenalChargeAmount - 1;
      }
      // Legal GST
      let tempLegal = legalCharge;
      let gstLegalChargeAmount = legalCharge - legalCharge / 1.18;
      gstLegalChargeAmount =
        this.typeService.manageAmount(gstLegalChargeAmount);
      if (gstLegalChargeAmount % 2 == 1) {
        gstLegalChargeAmount = gstLegalChargeAmount - 1;
      }
      // Foreclose GST
      let tempForeclose = forecloseAmount;
      let gstForecloseAmount = forecloseAmount - forecloseAmount / 1.18;
      gstForecloseAmount = this.typeService.manageAmount(gstForecloseAmount);
      if (gstForecloseAmount % 2 == 1) {
        gstForecloseAmount = gstForecloseAmount - 1;
      }
      let roundOff = 0;
      bounceCharge = bounceCharge - gstBounceChargeAmount;
      if (tempBounce > bounceCharge + gstBounceChargeAmount)
        roundOff += tempBounce - (bounceCharge + gstBounceChargeAmount);
      penalCharge = penalCharge - gstPenalChargeAmount;
      if (tempPenal > penalCharge + gstPenalChargeAmount)
        roundOff += tempPenal - (penalCharge + gstPenalChargeAmount);
      legalCharge = legalCharge - gstLegalChargeAmount;
      if (tempLegal > legalCharge + gstLegalChargeAmount)
        roundOff += tempLegal - (legalCharge + gstLegalChargeAmount);
      forecloseAmount = forecloseAmount - gstForecloseAmount;
      if (tempForeclose > forecloseAmount + gstForecloseAmount)
        roundOff += tempForeclose - (forecloseAmount + gstForecloseAmount);

      const sgstOnBounceCharge = +(gstBounceChargeAmount / 2).toFixed(2);
      const cgstOnBounceCharge = sgstOnBounceCharge;

      const sgstOnPenalCharge = +(gstPenalChargeAmount / 2).toFixed(2);
      const cgstOnPenalCharge = sgstOnPenalCharge;

      const sgstOnLegalCharge = +(gstLegalChargeAmount / 2).toFixed(2);
      const cgstOnLegalCharge = sgstOnLegalCharge;

      const sgstOnForecloseCharge = +(gstForecloseAmount / 2).toFixed(2);
      const cgstOnForecloseCharge = sgstOnForecloseCharge;
      //Add difference back to charges
      bounceCharge +=
        deductedBounceCharge -
        (bounceCharge + sgstOnBounceCharge + cgstOnBounceCharge);

      penalCharge +=
        deductedPenalCharge -
        (penalCharge + sgstOnPenalCharge + cgstOnPenalCharge);

      legalCharge +=
        deductedLegalCharge -
        (legalCharge + sgstOnLegalCharge + cgstOnLegalCharge);

      forecloseAmount +=
        deductedForecloseAmt -
        (forecloseAmount + sgstOnForecloseCharge + cgstOnForecloseCharge);

      const waiverAmount = fullPay.totalAmount - dueAmount;
      let dataWaiver = {};
      if (waiverAmount > 0) {
        try {
          dataWaiver = this.getWaiverAmountInfullpaysetted(
            fullPay?.fullPIPData,
            waiverAmount,
          );
        } catch (error) {}
      }

      return {
        dueAmount,
        principalAmount,
        interestAmount,
        penaltyAmount,
        regInterestAmount,
        bounceCharge,
        penalCharge,
        legalCharge,
        cgstOnBounceCharge,
        sgstOnBounceCharge,
        cgstOnPenalCharge,
        sgstOnPenalCharge,
        cgstOnLegalCharge,
        sgstOnLegalCharge,
        forecloseAmount,
        sgstOnForecloseCharge,
        cgstOnForecloseCharge,
        dataWaiver,
        roundOff,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private getEMiAmount(emiData: EmiEntity, amount = 0) {
    let principalAmount = 0;
    let interestAmount = 0;
    let penaltyAmount = 0;
    let regInterestAmount = 0;
    let bounceChargeAmount = 0;
    let penalChargesAmount = 0;
    let legalChargeAmount = 0;
    let sgstBounceChargeAmount = 0;
    let cgstBounceChargeAmount = 0;
    let sgstPenalChargeAmount = 0;
    let cgstPenalChargeAmount = 0;
    let sgstLegalChargeAmount = 0;
    let cgstLegalChargeAmount = 0;
    let deductedBounceCharge = 0;
    let deductedPenalCharge = 0;
    let deductedLegalCharge = 0;
    let bounceCharge = 0;
    let penalCharges = 0;
    let legalCharge = 0;
    if (amount < 1) return kInternalError;
    let cGstOnPenal = this.typeService.manageAmount(
      (emiData.penaltyChargesGST ?? 0) / 2,
    );
    let sGstOnPenal = this.typeService.manageAmount(
      (emiData.penaltyChargesGST ?? 0) / 2,
    );
    emiData.penaltyChargesGST = cGstOnPenal + sGstOnPenal;

    bounceCharge = +(emiData?.bounceCharge + emiData?.gstOnBounceCharge) ?? 0;
    bounceCharge = this.typeService.manageAmount(bounceCharge);
    penalCharges = +(emiData?.dpdAmount + emiData?.penaltyChargesGST) ?? 0;
    penalCharges = this.typeService.manageAmount(penalCharges);
    legalCharge = +(emiData?.legalCharge + emiData?.legalChargeGST) ?? 0;
    legalCharge = this.typeService.manageAmount(legalCharge);

    let principalEMI = emiData?.principalCovered ?? 0;
    let interestEMI = emiData?.interestCalculate ?? 0;
    let penaltyEMI = this.typeService.manageAmount(emiData?.penalty ?? 0);
    let regIntAmount = this.typeService.manageAmount(
      emiData?.regInterestAmount ?? 0,
    );
    let paidAmount = 0;
    let paidInterest = 0;
    let paidPrincipal = 0;
    let paidPenalty = 0;
    let paidRegInt = 0;
    let paidBounceCharge = 0;
    let paidPenalCharge = 0;
    let paidLegalCharge = 0;
    (emiData?.transactionData ?? []).forEach((e) => {
      try {
        if (e?.status === kCompleted) {
          paidAmount += e?.paidAmount ?? 0;
          paidInterest += e?.interestAmount ?? 0;
          paidPrincipal += e?.principalAmount ?? 0;
          paidPenalty += e?.penaltyAmount ?? 0;
          paidRegInt += e?.regInterestAmount ?? 0;
          paidBounceCharge +=
            e?.bounceCharge + e?.sgstOnBounceCharge + e?.cgstOnBounceCharge ??
            0;
          paidPenalCharge +=
            e?.penalCharge + e?.sgstOnPenalCharge + e?.cgstOnPenalCharge ?? 0;
          paidLegalCharge +=
            e?.legalCharge + e?.sgstOnLegalCharge + e?.cgstOnLegalCharge ?? 0;
        }
      } catch (error) {}
    });
    paidAmount -= emiData?.partPaymentPenaltyAmount ?? 0;

    interestEMI -= paidInterest;
    principalEMI -= paidPrincipal;
    penaltyEMI -= paidPenalty;
    bounceCharge -= paidBounceCharge;
    penalCharges -= paidPenalCharge;
    legalCharge -= paidLegalCharge;
    regIntAmount -= paidRegInt;

    // interest Amount update
    if (interestEMI >= amount) {
      interestAmount = amount;
      amount = 0;
    } else {
      interestAmount = interestEMI;
      amount -= interestEMI;
    }

    // principal Amount update
    if (principalEMI >= amount) {
      principalAmount = amount;
      amount = 0;
    } else {
      principalAmount = principalEMI;
      amount -= principalEMI;
    }

    // penalty Amount update
    if (penaltyEMI >= amount) {
      penaltyAmount = amount;
      amount = 0;
    } else {
      penaltyAmount = penaltyEMI;
      amount -= penaltyEMI;
    }

    // Deffered Amount update
    if (regIntAmount >= amount) {
      regInterestAmount = amount;
      amount = 0;
    } else {
      regInterestAmount = regIntAmount;
      amount -= regIntAmount;
    }

    //bounce charge update
    if (bounceCharge >= amount) {
      bounceChargeAmount = amount;
      amount = 0;
    } else {
      bounceChargeAmount = bounceCharge;
      amount -= bounceCharge;
    }
    deductedBounceCharge = bounceChargeAmount;

    //penal charge update
    if (penalCharges >= amount) {
      penalChargesAmount = amount;
      amount = 0;
    } else {
      penalChargesAmount = penalCharges;
      amount -= penalCharges;
    }
    deductedPenalCharge = penalChargesAmount;

    //legal charge update
    if (legalCharge >= amount) {
      legalChargeAmount = amount;
      amount = 0;
    } else {
      legalChargeAmount = legalCharge;
      amount -= legalCharge;
    }
    deductedLegalCharge = legalChargeAmount;

    //gst calculation
    const gstBounceChargeAmount =
      bounceChargeAmount - bounceChargeAmount / 1.18;
    let gstPenalChargeAmount = penalChargesAmount - penalChargesAmount / 1.18;
    sgstPenalChargeAmount = this.typeService.manageAmount(
      gstPenalChargeAmount / 2,
    );
    cgstPenalChargeAmount = sgstPenalChargeAmount;
    gstPenalChargeAmount = sgstPenalChargeAmount + cgstPenalChargeAmount;

    const gstLegalChargeAmount = legalChargeAmount - legalChargeAmount / 1.18;

    bounceChargeAmount = bounceChargeAmount - gstBounceChargeAmount;
    penalChargesAmount = penalChargesAmount - gstPenalChargeAmount;
    legalChargeAmount = legalChargeAmount - gstLegalChargeAmount;

    sgstBounceChargeAmount = +(gstBounceChargeAmount / 2).toFixed(2);
    cgstBounceChargeAmount = sgstBounceChargeAmount;

    sgstLegalChargeAmount = +(gstLegalChargeAmount / 2).toFixed(2);
    cgstLegalChargeAmount = sgstLegalChargeAmount;

    //Add difference back to charges
    bounceChargeAmount +=
      deductedBounceCharge -
      (bounceChargeAmount + sgstBounceChargeAmount + cgstBounceChargeAmount);

    penalChargesAmount +=
      deductedPenalCharge -
      (penalChargesAmount + sgstPenalChargeAmount + cgstPenalChargeAmount);

    legalChargeAmount +=
      deductedLegalCharge -
      (legalChargeAmount + sgstLegalChargeAmount + cgstLegalChargeAmount);

    regInterestAmount = +regInterestAmount.toFixed(2);
    bounceChargeAmount = +bounceChargeAmount.toFixed(2);
    penalChargesAmount = +penalChargesAmount.toFixed(2);
    legalChargeAmount = +legalChargeAmount.toFixed(2);
    //#endregion

    let isGreaterEMI = false;
    if (
      principalAmount == 0 &&
      interestAmount == 0 &&
      penaltyAmount == 0 &&
      regInterestAmount == 0 &&
      bounceCharge == 0 &&
      penalCharges == 0 &&
      legalCharge == 0
    )
      return kInternalError;
    else if (amount > 20) isGreaterEMI = true;
    return {
      principalAmount,
      interestAmount,
      penaltyAmount,
      regInterestAmount,
      bounceChargeAmount,
      penalChargesAmount,
      legalChargeAmount,
      cgstBounceChargeAmount,
      sgstBounceChargeAmount,
      cgstPenalChargeAmount,
      sgstPenalChargeAmount,
      cgstLegalChargeAmount,
      sgstLegalChargeAmount,
      isGreaterEMI,
    };
  }

  //#region get waiver amount in full pay
  private getWaiverAmountInfullpaysetted(fullPIPData, waiverAmount) {
    const data = {};
    try {
      const list = [
        'fullPayLegalCharge',
        'fullPayPenal',
        'fullPayBounce',
        'fullPayRegInterest',
        'fullPayPenalty',
        'fullPayInterest',
        'fullPayPrincipal',
      ];
      for (let index = 0; index < list.length; index++) {
        const key = list[index];
        const keys = Object.keys(fullPIPData);
        keys.forEach((emiId) => {
          try {
            const amount = fullPIPData[emiId][key];
            let tempAmount = 0;
            if (waiverAmount >= amount) {
              waiverAmount -= amount;
              tempAmount = amount;
            } else {
              tempAmount = waiverAmount;
              waiverAmount = 0;
            }
            const tempData = {};
            tempData[key] = tempAmount;
            if (!data[emiId]) data[emiId] = {};
            data[emiId][key] = tempAmount;
          } catch (error) {}
        });
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region create payment
  async funCreatePaymentOrder(body) {
    try {
      const amount = +body?.amount;
      if (amount) {
        const isInDecimal = Number.isInteger(amount);
        if (!isInDecimal)
          return k422ErrorMessage('Amount In Decimal is Not Allowed');
      }
      if (body.dueDate && body.settledId) {
        const toDay = this.typeService.getGlobalDate(new Date());
        const dueDate = this.typeService.getGlobalDate(new Date(body.dueDate));
        if (dueDate.getTime() < toDay.getTime())
          return k422ErrorMessage(kPleaseProvideFutureDue);
      }

      /// if payments go update then check rights
      if (body?.adminId && body?.transactionId && body?.utr) {
        const checkAccess = await this.checkAdminAccessToUpdatePayments(
          'payment update',
          body?.adminId,
        );
        if (checkAccess !== true) return checkAccess;
      }
      /// if check waive off access
      if (
        (body?.adminId && body?.isCloseLoan === true) ||
        body?.isPromoCode === true
      ) {
        if (body?.isPromoCode === true) {
          //check eligibility of promo code
          let isEligible =
            await this.promoCodeService.getUserWaiveOffEligibility({
              userId: null,
              loanId: body?.loanId,
            });
          if (isEligible?.emiDetails) {
            body.remarks = promoCodeRemark;
            body.isCloseLoan = true;
            body.amount = isEligible?.emiDetails?.rePayAmount;
          }
        }
        body.adminId = body?.adminId ?? SYSTEM_ADMIN_ID;
        body.isCloseLoan = true;
        if (body?.source == 'PAYMENT_LINK') {
          const checkAccess = await this.checkAdminAccessToUpdatePayments(
            'waive off',
            body?.adminId,
          );
          if (checkAccess !== true) return checkAccess;
        }
      }
      /// find loan Data
      const loanData = await this.getLoanData(body);
      if (loanData === k500Error) return kInternalError;
      if (loanData?.message) return loanData;
      const prePareAmount: any = await this.prePareAmount(body, loanData);
      if (prePareAmount === false) return k422ErrorMessage(kSomthinfWentWrong);
      if (!prePareAmount?.dueAmount) return prePareAmount;
      const result: any = await this.prePareTransaction(
        body,
        prePareAmount,
        loanData,
      );
      if (!result || result === k500Error || result?.statusCode) return result;
      await this.checkAndUpdatePaymenst(body);
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check admin access to update
  private async checkAdminAccessToUpdatePayments(acceessType, adminId) {
    try {
      if (acceessType) {
        const result = await this.adminRepo.checkHasAccess(
          adminId,
          acceessType,
        );
        if (result === true) return true;
        else return result;
      } else return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare transaction
  private async prePareTransaction(body: any, prePareAmount: any, loanData) {
    try {
      // Params preparation
      const userId = loanData?.registeredUsers?.id;
      const loanId = body?.loanId;
      const mode = body?.mode;
      const phone = body?.phone ?? loanData?.registeredUsers?.phone;
      const email = body?.email ?? loanData?.registeredUsers?.email;
      const amount = prePareAmount?.dueAmount;
      body.dueAmount = amount;
      const name = loanData?.registeredUsers?.fullName;
      let subSource = body?.subSource ?? 'WEB';
      const source = body?.source ?? kCashfree;
      const bySDK = body?.bySDK === true ? true : false;
      const payerVa = body?.upiId;
      let subStatus = body.subStatus;
      if (body.isLoanClosure && prePareAmount.type == 'FULLPAY')
        subStatus = 'LOAN_CLOSURE';
      else if (body.isLoanSettled && prePareAmount.type == 'FULLPAY')
        subStatus = 'LOAN_SETTLEMENT';

      const note = `${EnvConfig.nbfc.nbfcCodeName}-${loanId}`;
      if (source === 'AUTOPAY') subSource = kAutoDebit;
      // To Calculate Max DPD for Current Transaction
      let maxDPD = 0;
      const delayedStatus = loanData?.registeredUsers?.loanStatus;
      if (delayedStatus == 2 || delayedStatus == 3) {
        const emiData = await this.emiRepo.getTableWhereData(['penalty_days'], {
          where: { loanId, payment_due_status: '1' },
        });
        if (emiData === k500Error) return kInternalError;
        emiData.forEach((ele) => {
          if (ele.penalty_days > 0 && ele.penalty_days > maxDPD)
            maxDPD = +ele.penalty_days;
        });
      }
      const preparedData: any = {
        amount,
        email,
        phone,
        name,
        loanId,
        subSource,
      };
      body.p_type = prePareAmount.type;
      // Order preparation
      const creationData: any = { loanId: body.loanId, userId };
      creationData.paidAmount = amount;
      creationData.roundOff = prePareAmount?.roundOff ?? 0;
      creationData.source = source;
      creationData.status = kInitiated;
      creationData.subSource = subSource;
      creationData.subStatus = subStatus;
      creationData.principalAmount = prePareAmount?.principalAmount;
      creationData.interestAmount = prePareAmount?.interestAmount;
      creationData.penaltyAmount = prePareAmount?.penaltyAmount;
      creationData.forClosureAmount = prePareAmount?.forClosureAmount ?? 0;
      creationData.sgstForClosureCharge =
        prePareAmount?.sgstForClosureCharge ?? 0;
      creationData.cgstForClosureCharge =
        prePareAmount?.cgstForClosureCharge ?? 0;
      creationData.forClosureDays = prePareAmount?.forClosureDays ?? 0;
      creationData.regInterestAmount = prePareAmount?.regInterestAmount;
      creationData.bounceCharge = prePareAmount?.bounceCharge;
      creationData.penalCharge = prePareAmount?.penalCharge;
      creationData.legalCharge = prePareAmount?.legalCharge;
      creationData.cgstOnBounceCharge = prePareAmount?.cgstOnBounceCharge;
      creationData.sgstOnBounceCharge = prePareAmount?.sgstOnBounceCharge;
      creationData.cgstOnPenalCharge = prePareAmount?.cgstOnPenalCharge;
      creationData.sgstOnPenalCharge = prePareAmount?.sgstOnPenalCharge;
      creationData.cgstOnLegalCharge = prePareAmount?.cgstOnLegalCharge;
      creationData.sgstOnLegalCharge = prePareAmount?.sgstOnLegalCharge;
      creationData.accStatus = kCalBySystem;
      creationData.type = prePareAmount.type;
      creationData.adminId = body?.adminId ?? SYSTEM_ADMIN_ID;
      creationData.followerId = loanData?.followerId;
      creationData.remarks = body?.remarks ?? '';
      creationData.maxDPD = maxDPD;
      const approvedAmount = +loanData?.netApprovedAmount;
      const totalFees = loanData?.feesIncome ?? 0;
      const chargePr = ((totalFees ?? 0) * 100) / approvedAmount;
      const principal = prePareAmount?.principalAmount ?? 0;
      const income = Math.round((principal * chargePr) / 100);
      creationData.feesIncome = income;
      creationData.mode = mode;
      let merchantTranId;
      if (source === KICICIUPI) {
        const randomCode = this.typeService.generateRandomCode(12);
        merchantTranId = EnvConfig.nbfc.nbfcCodeName + randomCode;
        creationData.transactionId = merchantTranId;
        if (body?.mode) body.merchantTranId = merchantTranId;
        const isCheck = await this.checkTransactionId(creationData);
        if (isCheck) return k422ErrorMessage(kTransactionIdExists);
      }
      if (prePareAmount?.settled_type)
        creationData.settled_type = prePareAmount?.settled_type ?? '';
      if (body.emiId != -1) creationData.emiId = body.emiId;
      if (source === kCashfree && subSource !== kAutoDebit) {
        const ExistLink = await this.findSametransactionIsExist(creationData);
        if (ExistLink) return { paymentLink: ExistLink };
      }
      const result = await this.transactionRepo.createRowData(creationData);
      if (result === k500Error) return kInternalError;
      const isAutoDebit = source === 'AUTOPAY' || subSource == kAutoDebit;
      const createdData = isAutoDebit
        ? await this.prePareAutoDebit(body, loanData)
        : bySDK
        ? await this.razorpayService.createOrder({ amount }, kSDK)
        : payerVa
        ? await this.iciciService.CollectPay({
            amount,
            payerVa,
            note,
            merchantTranId,
          })
        : await this.createLink(body, preparedData);
      if (createdData == k500Error) return kInternalError;
      else if (createdData?.statusCode) return createdData;
      const updatedData: any = {};
      updatedData.transactionId = bySDK
        ? createdData?.id
        : createdData?.order_id;
      updatedData.response = createdData?.response;
      const subscriptionDate = createdData?.subscriptionDate;
      if (createdData?.subscriptionDate) {
        updatedData.subscriptionDate = subscriptionDate;
        if (isAutoDebit) {
          /// check how many autodabit place subscriptionDate
          const tran_unique_id: any = await this.checkHowManyAutodebitPlease(
            loanId,
            subscriptionDate,
          );
          if (tran_unique_id?.message) return tran_unique_id;
          updatedData.tran_unique_id = tran_unique_id;
        }
      }

      if (isAutoDebit) {
        updatedData.source = body?.source;
        updatedData.subSource = subSource;
      } else if (body?.source == kCashfree && body?.subSource == kAutoDebit) {
        updatedData.source = body?.source;
        updatedData.subSource = body?.subSource;
      } else if (body?.source == 'UPI') {
        updatedData.paidAmount = body?.amount ?? creationData.paidAmount;
        updatedData.subSource = body?.subSource ?? creationData.subSource;
      }

      // Order creation in database
      if (source !== KICICIUPI && source !== 'PAYMENT_LINK') {
        const isCheck = await this.checkTransactionId(updatedData);
        if (isCheck) return k422ErrorMessage(kTransactionIdExists);
      }
      //update transaction data
      if (source !== 'PAYMENT_LINK') {
        const transUpdated = await this.transactionRepo.updateRowData(
          updatedData,
          result?.id,
        );
        if (transUpdated === k500Error) return kInternalError;
      }

      //for showing UPI app name to user for which he entering upi id
      let upiMessage;
      if (payerVa) {
        let upiHandleName = payerVa.split('@')[1];
        upiHandleName = upiHandleName.toLowerCase();
        let upiApp;
        if (
          upiHandleName == 'apl' ||
          upiHandleName == 'yapl' ||
          upiHandleName == 'rapl'
        )
          upiApp = 'Amazon Pay';
        else if (upiHandleName == 'axisb') upiApp = 'CRED';
        else if (
          upiHandleName == 'okaxis' ||
          upiHandleName == 'okhdfcbank' ||
          upiHandleName == 'okicici' ||
          upiHandleName == 'oksbi'
        )
          upiApp = 'Google Pay';
        else if (upiHandleName == 'yesg') upiApp = 'Groww';
        else if (upiHandleName == 'ikwik') upiApp = 'MobiKwik';
        else if (
          upiHandleName == 'ybl' ||
          upiHandleName == 'ibl' ||
          upiHandleName == 'axl'
        )
          upiApp = 'Phonepe';
        else if (
          upiHandleName == 'waaxis' ||
          upiHandleName == 'waicici' ||
          upiHandleName == 'wahdfcbank' ||
          upiHandleName == 'wasbi'
        )
          upiApp = 'WhatsApp';
        else if (upiHandleName == 'upi') upiApp = 'BHIM';
        else if (upiHandleName == 'paytm') upiApp = 'Paytm';
        else upiApp = 'UPI App';
        upiMessage = `We have sent you payment request on ##${upiApp}##`;
      }
      const link = createdData.payLink;
      // Auto debit
      if (subSource === kAutoDebit || body?.subSource == kAutoDebit) {
        createdData.id = result.id;
        const data: any = await this.placeManualAutoDebit(
          body,
          createdData,
          preparedData,
        );
        if (data === k500Error) return kInternalError;
        const option = { where: { id: createdData.id } };
        const att = ['status'];
        const find = await this.transactionRepo.getRowWhereData(att, option);
        if (!find || find === k500Error) return kInternalError;
        if (find.status === 'FAILED') return kInternalError;
      }
      if (bySDK && createdData?.id)
        return { order_id: createdData?.id, transactionId: result.id };
      // Intimation to user
      await this.sendNotification(link, body, loanData);
      return { paymentLink: link, transactionId: result.id, upiMessage };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region find same transaction is exit or not
  private async findSametransactionIsExist(data) {
    try {
      const options = { where: data, order: [['id', 'desc']] };
      const att = ['id', 'response'];
      const result = await this.transactionRepo.getRowWhereData(att, options);
      if (!result || result === k500Error) return '';
      else if (result?.response) {
        const response = JSON.parse(result.response);
        const expiryTime = new Date(response?.order_expiry_time).getTime();
        const nowTime = new Date().getTime();
        if (expiryTime > nowTime + 60 * 1000 && response?.order_token)
          return CF_RETURN_URL + response?.order_token;
      }
    } catch (error) {}
  }
  //#endregion

  //#region update payments if admin want to
  private async checkAndUpdatePaymenst(body) {
    try {
      if (
        body?.adminId &&
        body?.transactionId &&
        body?.utr &&
        body?.source == 'UPI'
      ) {
        let completionDate: any = body?.payment_date
          ? new Date(body.payment_date)
          : new Date();
        const year = completionDate.getFullYear();
        if (isNaN(year) || year == 1970) completionDate = new Date();
        completionDate = this.typeService.getGlobalDate(completionDate);
        completionDate = completionDate.toJSON();
        const otption = { where: { transactionId: body?.transactionId } };
        const att = ['id', 'loanId', 'userId', 'emiId', 'type', 'subSource'];
        const find = await this.transactionRepo.getRowWhereData(att, otption);
        if (!find || find == k500Error) return kInternalError;

        const paymentData: any = { id: find.id, status: 'COMPLETED' };
        paymentData.utr = body?.utr;
        paymentData.completionDate = completionDate;
        paymentData.loanId = find.loanId;
        paymentData.userId = find.userId;
        paymentData.type = find.type;
        paymentData.subSource = find.subSource;
        if (find.emiId) paymentData.emiId = find.emiId;
        await this.markTransactionAsComplete(paymentData);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare auto debit
  private async prePareAutoDebit(body, loanData) {
    try {
      const toDay = this.typeService.getGlobalDate(new Date());
      toDay.setDate(toDay.getDate() + 1);
      let submissionDate = body?.submissionDate ?? toDay.toJSON();
      submissionDate = this.typeService.getGlobalDate(new Date(submissionDate));

      let filter = [];
      if (body.emiId == -1)
        filter = loanData.emiData.filter((e) => e.payment_status === '0');
      else filter = loanData.emiData.filter((e) => body.emiId === e.id);
      let dateIsGre = false;
      filter.forEach((e) => {
        if (new Date(e.emi_date).getTime() > submissionDate.getTime())
          dateIsGre = true;
      });
      if (dateIsGre) return k422ErrorMessage(kPleaceEnterValidSubmissionDate);

      // prepare order id or update payments source
      body.subSource = kAutoDebit;
      body.source = body.source == kRazorpay ? kRazorpay : kCashfree;
      let order_id;
      const type = body.p_type;
      const targetData = submissionDate.toJSON().substring(0, 10);
      const subscriptionDate: any = submissionDate.toJSON();
      if (type === 'FULLPAY') order_id = 'FP-' + body.loanId + '-' + targetData;
      else if (type === 'EMIPAY') order_id = body.emiId + '-' + targetData;
      else if (type === 'PARTPAY')
        order_id = new Date().getTime() + '-' + body.emiId + '-' + targetData;

      const subscriptionData = loanData?.subscriptionData;
      const mandateData = loanData?.mandateData;
      let referenceId;
      if (subscriptionData) {
        /* For auto debit -> Cashfree & Signdesk requires referenceId 
          while Razorpay works based on token which we stored as umrn */
        body.source = subscriptionData.mode;
        referenceId =
          body.source == kRazorpay
            ? subscriptionData.umrn
            : subscriptionData.referenceId;
      } else if (mandateData || mandateData.length > 0) {
        body.source = 'SIGNDESK';
        referenceId = mandateData[0].emandate_id;
      }
      if (!referenceId) return kInternalError;
      order_id += '-id-' + referenceId;
      return { order_id, referenceId, targetData, subscriptionDate };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Payment link creation
  private async createLink(body, preparedData: any) {
    try {
      if (body?.source === 'RAZORPAY') {
        return await this.razorpaySer.createRazorpay(
          preparedData,
          body.sendSMS,
        );
      } else if (
        body?.mode == 'GOOGLEPAY' ||
        body?.mode == 'PAYTM' ||
        body?.mode == 'PHONEPE' ||
        body?.mode == 'AMAZONPAY' ||
        body?.mode == 'OTHER'
      ) {
        if (body?.subSource && UPI_SERVICE && !body?.transactionId) {
          return await this.getUPILink(body);
        }
        return { order_id: body.transactionId, payLink: '' };
      } else if (body?.source === 'UPI') {
        return { order_id: body.transactionId, payLink: '' };
      } else if (body?.source === 'PAYMENT_LINK') {
        const key = body?.loanId * 484848;
        const payLink = nPaymentRedirect + key;
        return { order_id: null, payLink };
      } else {
        preparedData.returnURL = CF_RETURN_URL;
        return await this.cashFreeService.createPaymentOrder(preparedData);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check how many autodebit please on subscriptionDate
  private async checkHowManyAutodebitPlease(loanId, subscriptionDate) {
    try {
      const where = { loanId, subscriptionDate };
      const count = await this.transactionRepo.getCountsWhere({ where });
      if (count === k500Error) return kInternalError;
      if (count > MAX_AUTO_DEBIT_COUNT)
        return k422ErrorMessage(kYouReachedAutoDebitLimit);
      return loanId + '_' + subscriptionDate.substring(0, 10) + '_' + count;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region place auto debit
  private async placeManualAutoDebit(
    body,
    createdData,
    preparedData: any = {},
  ) {
    try {
      const referenceId = createdData.referenceId;
      const date = createdData.targetData;
      const amount = body.dueAmount;
      const id = createdData.id;
      if (body.subSource == kAutoDebit && referenceId && amount && date && id) {
        // Cashfree autodebit
        if (body.source === kCashfree) {
          const subscriptionData =
            await this.cashFreeService.getSubscriptionStatus(referenceId);
          if (subscriptionData != k500Error) {
            const status = subscriptionData.status;
            const isOnHold = status == 'ON_HOLD';
            if (isOnHold)
              await this.cashFreeService.reActivateSubscription(referenceId);
          }
          await this.delay(50);
          const data = { referenceId, amount, date };
          const result = await this.cashFreeService.placeAutoDebit(data);
          // Error msg -> Autodebit was not placed successfully
          if (result?.adNotPlaced === true && id) {
            const updatedData = {
              status: kFailed,
              response: JSON.stringify(result),
            };
            await this.repoManager.updateRowData(
              TransactionEntity,
              updatedData,
              id,
            );
          }
          // Success
          else await this.transactionRepo.updateRowData(result, id);
        }
        // Razorpay autodebit
        else if (body.source == kRazorpay) {
          const orderData: any = {
            email: preparedData.email,
            token: referenceId,
            contact: preparedData.phone,
            name: preparedData.name,
            amount: body.amount ?? amount,
          };
          const response = await this.razorpayService.placeAutoDebit(orderData);
          if (response.message || !response.utr) {
            // Error msg -> Autodebit was not placed successfully
            if (response?.adNotPlaced === true && id) {
              const updatedData = {
                status: kFailed,
                response: JSON.stringify(response),
              };
              await this.repoManager.updateRowData(
                TransactionEntity,
                updatedData,
                id,
              );
            }
            return kInternalError;
          }
          const updateResponse = await this.transactionRepo.updateRowData(
            response,
            id,
          );
          if (updateResponse == k500Error) return kInternalError;
        }
        // Signdesk autodebit
        else {
          const finalData = {
            paidAmount: amount,
            mandateId: referenceId,
            targetDate: date,
            id,
          };
          const result = await this.placeAutoDebit([finalData]);
          if (result === k500Error) return kInternalError;
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region send mail
  private async sendNotification(
    link: string,
    body,
    loanData: loanTransaction,
  ) {
    try {
      const user = loanData?.registeredUsers;
      const userId = body?.userId ?? user?.id;
      const name = user?.fullName;
      const email = body?.email ?? user?.email;
      const loanId = loanData.id;
      const appType = loanData?.appType ?? user?.appType;
      const adminId = body?.adminId;
      const loanAmount = (+(loanData?.netApprovedAmount ?? 0)).toFixed(2);
      const toDay = new Date().toJSON().substring(0, 10);
      const isSettled = body.settledId ? true : false;
      let dueAmount = body.dueAmount;
      const emiId = body.emiId;
      if (emiId != -1) {
        const emi = loanData.emiData.find((e) => e.id == emiId);
        dueAmount = +emi.emi_amount + (emi?.penalty ?? 0);
      }
      dueAmount = (+dueAmount).toFixed(2);
      if (
        body.subSource != 'AUTODEBIT' &&
        link &&
        adminId &&
        adminId != SYSTEM_ADMIN_ID
      ) {
        const amount = this.strService.readableAmount(
          body?.amount ?? dueAmount,
          true,
        );
        const content = `Dear ${name}, A payment of Rs. ${amount} requested from ${EnvConfig.nbfc.nbfcName} against your Loan id - ${loanId}. Please make the payment via App or Link. For any query or assistance reach us at ${EnvConfig.number.collectionNumber}.`;
        const smsOptions = {
          NAME: name,
          AMOUNT: amount,
          LOANID: loanId,
          PAYMENTLINK: link,
          NUMBER: EnvConfig.number.collectionNumber,
          CONTACT: EnvConfig.number.collectionNumber,
          NBFC: EnvConfig.nbfc.nbfcName,
          short_url: '1',
          appType,
        };
        const data = {
          userList: [userId],
          content,
          title: 'Payment Request',
          adminId,
          smsOptions,
          isMsgSent: true,
          smsId:
            appType == 0
              ? kLspMsg91Templates.PAYMENT_REQUEST
              : kMsg91Templates.PAYMENT_REQUEST,
        };
        await this.sharedNotification.sendNotificationToUser(data);
      }
      if (
        body.source == 'CASHFREE' &&
        body.sendSMS === true &&
        body.subSource != 'AUTODEBIT'
      ) {
        try {
          // send cashfree email
          await this.sharedNotification.sendEmail('CASHFREE_PAYLINK', email, {
            name,
            link,
          });
        } catch (error) {}
      }
      try {
        if (body.dueDate && isSettled) {
          const dueDate = body.dueDate.substring(0, 10);
          const data = { name, loanId, loanAmount, toDay, dueAmount, dueDate };
          // send Settled email
          // await this.notificationService.sendEmail('SETTLED_LOAN', email, data);
        }
      } catch (error) {}
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check manual transaction id is exit
  private async checkTransactionId(data) {
    try {
      const options = { where: { transactionId: data.transactionId } };
      const find = await this.transactionRepo.getRowWhereData(['id'], options);
      if (find) return true;
      else return false;
    } catch (error) {
      return true;
    }
  }
  //#endregion

  async getUPILink(data) {
    try {
      let targetAmount = data.amount ?? data.dueAmount;
      targetAmount = Math.ceil(targetAmount);
      let paData = '';
      const upi_mode = await this.commonSharedService.getServiceName(
        'UPI_MODE',
      );
      if (upi_mode == 'ICICI_UPI')
        paData = `?pa=${ICICIVPA}&pn=ICICI%20Merchant`;
      const merchantData = paData;

      const mode = data?.mode.toUpperCase();
      const merchantTranId = data?.merchantTranId;
      let origin;
      switch (mode) {
        case 'GOOGLEPAY':
          origin = 'gPay://upi/pay/';
          break;
        case 'com.google.android.apps.nbu.paisa.user'.toUpperCase():
          data.mode = 'GOOGLEPAY';
          origin = 'gPay://upi/pay/';
          break;
        case 'PAYTM':
          origin = 'paytm://upi/pay';
          break;
        case 'net.one97.paytm'.toUpperCase():
          origin = 'paytm://upi/pay/';
          data.mode = 'PAYTM';
          break;
        case 'AMAZONPAY':
          origin = 'amazonpay://upi/pay';
          break;
        case 'PHONEPE':
          origin = 'phonepe://pay';
          break;
        case 'com.phonepe.app'.toUpperCase():
          origin = 'PhonePe://upi/pay/';
          data.mode = 'PHONEPE';
          break;
        case 'com.whatsapp'.toUpperCase():
          origin = 'upi://pay';
          break;
        default:
          origin = 'upi://pay';
          break;
      }

      let amountData = `&am=${targetAmount}`;
      const iciciQRRes = await this.iciciService.QR({
        targetAmount,
        merchantTranId,
      });
      const refId = iciciQRRes?.refId;
      const transId = iciciQRRes?.merchantTranId;
      const payLink = `${origin}${merchantData}&tr=${refId}${amountData}&cu=INR&mc=${ICICI_TERMINAL_ID}`;
      return { order_id: transId, payLink };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  //#region place auto debit
  async placeAutoDebit(rawList: any[]) {
    try {
      if (rawList.length === 0) return;
      const batchData = await this.signDeskService.placeAutoDebits(rawList);
      let batchId;
      let results = [];
      if (batchData != k500Error && batchData.status == 'success') {
        batchId = batchData.batch_id;
        results = batchData.result;
      }

      for (let index = 0; index < rawList.length; index++) {
        try {
          const rawData = rawList[index];
          const id = rawData.id;
          const updatedData: any = {};
          if (batchData == k500Error) {
            updatedData.paidAmount = 0;
            updatedData.status = 'FAILED';
            updatedData.subStatus = 'AD_NOT_PLACED';
            updatedData.response =
              '{"reason":"INTERNAL_SERVER_ERROR","response":"500"}';
          } else if (batchData.status == 'success') {
            const successData = results.find(
              (el) => el.emandate_id == rawData.mandateId,
            );
            if (successData?.status === 'success') {
              updatedData.utr = `${rawData.mandateId}-id-${batchId}`;
              updatedData.response = JSON.stringify(successData);
            } else if (successData?.status === 'failed') {
              updatedData.status = 'FAILED';
              updatedData.subStatus = 'FROM_BANK';
              updatedData.response = JSON.stringify(successData);
            } else {
              updatedData.status = 'FAILED';
              updatedData.subStatus = 'AD_NOT_PLACED';
              updatedData.response = successData
                ? JSON.stringify(successData)
                : '{"reason":"INTERNAL_SERVER_ERROR","response":"500"}';
            }
          } else {
            updatedData.status = 'FAILED';
            updatedData.subStatus = 'FROM_BANK';
            updatedData.response = JSON.stringify({
              reason: batchData ?? 'SIGNDESK_API_REJECTION',
            });
          }
          await this.transactionRepo.updateRowData(updatedData, id);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async placeTargetEMIs(reqData) {
    const loanIds = reqData.loanIds;
    if (!loanIds) return kParamMissing('loanIds');
    const emiDates = reqData.emiDates;
    if (!emiDates) return kParamMissing('emiDates');

    const attributes = ['emi_amount', 'id', 'loanId', 'penalty'];
    const options = {
      where: {
        emi_date: { [Op.in]: emiDates },
        loanId: { [Op.in]: loanIds },
        payment_status: '0',
      },
    };
    const emiList = await this.emiRepo.getTableWhereData(attributes, options);
    if (emiList == k500Error) return kInternalError;

    const today = new Date();
    today.setDate(today.getDate() + 1);
    for (let index = 0; index < emiList.length; index++) {
      try {
        const emiData = emiList[index];
        const dueAmount = +emiData.emi_amount + emiData.penalty ?? 0;
        const body = {
          adminId: SYSTEM_ADMIN_ID,
          emiId: emiData.id,
          loanId: emiData.loanId,
          sendSMS: false,
          source: 'AUTOPAY',
          amount: dueAmount,
          submissionDate: today.toJSON(),
          remarks: 'MISSED_EMI_AD_PLACED',
        };
        const response = await this.funCreatePaymentOrder(body);
      } catch (error) {}
    }
  }

  //#region create payment
  async createWaiverPaymentOrder(body) {
    try {
      body.sendSMS = body?.sendSMS ?? false;
      if (!body.loanId) return kParamMissing('loanId');
      if (body.transactionId && (!body.adminId || !body.utr))
        return kParamsMissing;
      const source = body?.source ?? kRazorpay;
      const subSource = body?.subSource ?? 'WEB';
      body.source = source;
      body.subSource = subSource;
      if (body.source) body.source = body.source.toUpperCase();
      if (body.subSource) body.subSource = body.subSource.toUpperCase();
      if (source != kCashfree && source != kRazorpay && source != 'UPI')
        return k422ErrorMessage(kWrongSourceType);
      const keys = Object.keys(body);
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        const value = body[key];
        if (value == null) delete body[key];
      }
      // if payments go update then check rights
      if (body?.adminId && body?.transactionId && body?.utr) {
        const checkAccess = await this.checkAdminAccessToUpdatePayments(
          'payment update',
          body?.adminId,
        );
        if (checkAccess !== true) return checkAccess;
      }

      // find loan Data
      const loanData: any = await this.getLoanDataWaiver(body);
      if (loanData?.message) return loanData;
      const prePareData: any = this.prePareAmountForWaiver(loanData, body);
      if (prePareData?.message) return prePareData;
      const prePareAmount = prePareData?.finalData;
      const result = await this.prePareWaiverTransaction(
        body,
        prePareAmount,
        loanData,
      );
      if (result?.message) return result;
      await this.checkAndUpdatePaymenst(body);
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // prepare and create transaction
  private async prePareWaiverTransaction(
    body: any,
    prePareAmount: any,
    loanData,
  ) {
    try {
      // Params preparation
      const userId = loanData?.registeredUsers?.id;
      const loanId = body.loanId;
      const phone = body?.phone ?? loanData?.registeredUsers?.phone;
      const email = body?.email ?? loanData?.registeredUsers?.email;
      const amount = prePareAmount?.paidAmount;
      body.dueAmount = amount;
      const name = loanData?.registeredUsers?.fullName;
      const subSource = body?.subSource ?? 'WEB';
      const source = body?.source ?? kCashfree;
      const preparedData: any = {
        amount,
        email,
        phone,
        name,
        loanId,
        subSource,
      };
      body.p_type = prePareAmount.type;

      // Order preparation
      const creationData: any = { loanId, userId };
      creationData.paidAmount = amount;
      creationData.source = source;
      creationData.status = 'INITIALIZED';
      creationData.subSource = subSource;
      creationData.principalAmount = prePareAmount?.principalAmount;
      creationData.interestAmount = prePareAmount?.interestAmount;
      creationData.penaltyAmount = prePareAmount?.penaltyAmount;
      creationData.accStatus = kCalBySystem;
      creationData.type = prePareAmount.type;
      creationData.adminId = body?.adminId ?? SYSTEM_ADMIN_ID;
      creationData.followerId = loanData?.followerId;
      if (prePareAmount?.settled_type)
        creationData.settled_type = prePareAmount?.settled_type;
      if (prePareAmount.emiId != -1) creationData.emiId = prePareAmount.emiId;
      const createdData = await this.createLink(body, preparedData);
      if (createdData === k500Error) return kInternalError;
      else if (createdData?.statusCode) return createdData;
      creationData.transactionId = createdData.order_id;
      creationData.response = createdData?.response;

      // Order creation in database
      const isCheck = await this.checkTransactionId(creationData);
      if (isCheck) return k422ErrorMessage(kTransactionIdExists);
      const result = await this.transactionRepo.createRowData(creationData);
      if (!result || result === k500Error) return kInternalError;
      const link = createdData.payLink;
      await this.sendNotification(link, body, loanData);
      return { paymentLink: link };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region promocode close loan create link
  async closeLoan(data) {
    try {
      if (!data?.loanId) return kParamMissing('loanId');
      let rePayAmount = 0;
      let loanId = data?.loanId / 565656;
      let getEmiAmount = await this.promoCodeService.getEmiAmount(loanId, []);
      if (getEmiAmount === kInternalError) return kInternalError;
      rePayAmount = getEmiAmount?.rePayAmount;
      const body = {
        adminId: SYSTEM_ADMIN_ID,
        emiId: -1,
        loanId: loanId,
        amount: Number(rePayAmount).toFixed(2),
        source: 'RAZORPAY',
        subSource: 'WEB',
        isGreaterEMI: false,
        isCloseLoan: true,
        isPromoCode: data?.isPromoCode ? data?.isPromoCode : true,
      };
      const link = await this.funCreatePaymentOrder(body);
      if (!link || link === kInternalError) return kInternalError;
      return link;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async checkPaymentOrder(data) {
    try {
      const loanId = data.loanId;
      if (!loanId) return kParamMissing('loanId');

      const yesterDay = new Date();
      yesterDay.setDate(yesterDay.getDate() - 2);
      const attributes = [
        'status',
        'createdAt',
        'emiId',
        'id',
        'loanId',
        'paidAmount',
        'source',
        'subSource',
        'transactionId',
        'type',
        'userId',
        'utr',
        'completionDate',
        'updatedAt',
      ];
      const options: any = {
        order: [['id', 'DESC']],
        where: { loanId },
      };

      if (data?.transactionId) {
        options.where.id = data?.transactionId;
        // options.where.status = kCompleted;
      } else {
        options.where.status = kInitiated;
        options.where.transactionId = { [Op.ne]: null };
      }

      if (data.source) options.where.source = data.source;
      const transList = await this.transactionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;

      const find = transList.find((f) => f.status === kCompleted);
      if (find) {
        if (find.source === KICICIUPI) find.source = 'UPI';
        const paymentDate = new Date(find?.updatedAt);
        const day = paymentDate.getDate().toString().padStart(2, '0');
        const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
        const year = paymentDate.getFullYear();
        const hour = paymentDate.getHours() % 12 || 12;
        const minute = paymentDate.getMinutes().toString().padStart(2, '0');
        const period = paymentDate.getHours() < 12 ? 'AM' : 'PM';
        const formattedDate = `${day}/${month}/${year} ${hour}:${minute} ${period}`;
        return {
          amount: find.paidAmount,
          status: find.status,
          paymentGateway: find.source,
          transactionId: find.utr ?? find.transactionId.replace('CFORDER', ''),
          date: formattedDate,
        };
      }

      // CF Checking
      const cfList = transList.filter(
        (el) => el.source == 'CASHFREE' && el.subSource == 'APP',
      );
      let checkPaymentStatus: any = await this.checkCFTransactions(cfList);
      if (checkPaymentStatus?.message) return checkPaymentStatus;
      if (
        checkPaymentStatus?.status != 'COMPLETED' &&
        checkPaymentStatus?.status != 'FAILED'
      ) {
        // Razorpay Checking
        const rzrPayList = transList.filter(
          (el) =>
            el.source == 'RAZORPAY' &&
            (el.subSource == 'APP' || el.subSource == 'WEB'),
        );
        checkPaymentStatus = await this.checkRzrPayTransactions(rzrPayList);
        if (checkPaymentStatus?.message) return checkPaymentStatus;

        if (
          checkPaymentStatus?.status != 'COMPLETED' &&
          checkPaymentStatus?.status != 'FAILED'
        ) {
          //ICICI_UPI Checking
          const iciciUPIList = transList.filter(
            (el) => el?.source == 'ICICI_UPI',
          );
          checkPaymentStatus = await this.checkICICIUPITransactions(
            iciciUPIList,
          );
        }
      }
      if (
        checkPaymentStatus?.status == 'COMPLETED' ||
        checkPaymentStatus?.status == 'FAILED'
      ) {
        const nextInterestRate =
          await this.commonSharedService.getEligibleInterestRate(data);
        return { ...checkPaymentStatus, nextInterestRate };
      } else return { status: 'INITIALIZED' };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkCFTransactions(cfList) {
    try {
      for (let index = 0; index < cfList.length; index++) {
        try {
          const transData = cfList[index];
          const response = await this.cashFreeService.checkPayment(
            transData.transactionId,
          );
          if (response.status == 'COMPLETED') {
            const paymentData: any = {
              id: transData.id,
              status: response.status,
            };
            paymentData.response = response.response;
            paymentData.utr = response.utr;
            paymentData.completionDate = response.paymentDate.toJSON();
            paymentData.type = transData.type;
            paymentData.loanId = transData.loanId;
            paymentData.userId = transData.userId;
            paymentData.subSource = transData.subSource;
            if (transData.emiId) paymentData.emiId = transData.emiId;
            await this.markTransactionAsComplete(paymentData);

            return {
              amount: transData.paidAmount,
              status: paymentData.status,
              transactionId: transData.transactionId.replace('CFORDER', ''),
            };
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkRzrPayTransactions(rzrPayList) {
    try {
      for (let index = 0; index < rzrPayList.length; index++) {
        try {
          const transData = rzrPayList[index];
          const response = await this.razorpaySer.checkPayment(
            transData.transactionId,
          );
          if (response.status == 'COMPLETED') {
            const paymentData: any = {
              id: transData.id,
              status: response.status,
            };
            paymentData.response = response.response;
            paymentData.utr = response.utr;
            paymentData.completionDate = response.paymentDate.toJSON();
            paymentData.type = transData.type;
            paymentData.loanId = transData.loanId;
            paymentData.userId = transData.userId;
            paymentData.subSource = transData.subSource;

            const currentDate = new Date();
            const day = currentDate.getDate().toString().padStart(2, '0');
            const month = (currentDate.getMonth() + 1)
              .toString()
              .padStart(2, '0'); // Months are zero-indexed
            const year = currentDate.getFullYear();
            const hour = currentDate.getHours() % 12 || 12;
            const minute = currentDate.getMinutes().toString().padStart(2, '0');
            const period = currentDate.getHours() < 12 ? 'AM' : 'PM';
            const formattedDate = `${day}/${month}/${year} ${hour}:${minute} ${period}`;
            if (transData.emiId) paymentData.emiId = transData.emiId;
            await this.markTransactionAsComplete(paymentData);

            return {
              amount: transData.paidAmount,
              status: paymentData.status,
              paymentGateway: kRazorpay,
              transactionId:
                response.utr ?? transData.transactionId.replace('CFORDER', ''),
              date: formattedDate,
            };
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkCFAutoDebitWebhook(reqData) {
    if (!reqData) return kInternalError;
    const subReferenceId =
      reqData?.form?.cf_subReferenceId ?? reqData?.cf_subReferenceId;
    if (!subReferenceId) return kParamMissing('subReferenceId');

    const attributes = ['id', 'loanId'];
    const where: any = {
      status: kInitiated,
      source: { [Op.or]: ['CASHFREE', 'AUTOPAY'] },
      subSource: { [Op.or]: [kAutoDebit, kDirectBankPay] },
      transactionId: { [Op.like]: `%${subReferenceId}%` },
    };
    const options: any = { where };
    const transData = await this.transactionRepo.getRowWhereData(
      attributes,
      options,
    );
    if (transData == k500Error) return kInternalError;
    if (!transData) return k422ErrorMessage(kNoDataFound);
    if (!transData?.loanId) return kParamMissing('loanId');

    await this.checkTransactionStatus(
      ['CASHFREE-AUTODEBIT'],
      transData?.loanId,
    );
  }

  async checkTransactionStatus(types: string[], loanId?: number) {
    try {
      if (types.includes('CASHFREE-AUTODEBIT'))
        await this.checkCFAutoDebit(loanId);
      if (types.includes('RAZORPAY-AUTODEBIT'))
        await this.checkRazorpayAutoDebits(loanId);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async checkCFAutoDebit(loanId?: number) {
    try {
      const pendingAutoDebits: any = await this.getPendingAutoDebits(
        'CASHFREE',
        loanId,
      );
      if (pendingAutoDebits == k500Error) return k500Error;
      for (let index = 0; index < pendingAutoDebits.length; index++) {
        try {
          const pendingData = pendingAutoDebits[index];
          const chargeId = pendingData.utr;
          let transactionId = pendingData.transactionId;
          const startIndex = transactionId.indexOf('id-') + 3;
          transactionId = transactionId.substring(
            startIndex,
            transactionId.length,
          );
          if (transactionId.includes('-') || transactionId.includes('_')) {
            let lastIdx = transactionId.indexOf('_');
            if (lastIdx == -1) lastIdx = transactionId.indexOf('-');
            transactionId = transactionId.substring(0, lastIdx);
          }

          if (chargeId && !isNaN(chargeId) && !isNaN(transactionId)) {
            await this.delay(250);
            const referenceId = transactionId + '/';
            const url =
              CF_SUBSCRIPTION + '/' + referenceId + 'payments/' + chargeId;
            const headers = CASHFREE_HEADERS;
            const response = await this.apiService.get(url, null, headers);
            if (response && response != k500Error && response.status == 'OK') {
              const status = response.payment?.status ?? 'UNKNOWN';
              if (status == 'SUCCESS' || status == 'FAILED') {
                const paymentData: any = { ...pendingData };
                paymentData.status =
                  status == 'SUCCESS' ? 'COMPLETED' : 'FAILED';
                paymentData.completionDate =
                  response.payment.scheduledOn + kGlobalTrail;
                paymentData.response = JSON.stringify(response);
                paymentData.id = pendingData.id;
                paymentData.subSource = pendingData.subSource;
                if (response?.adNotPlaced)
                  paymentData.subStatus = 'AD_NOT_PLACED';
                await this.markTransactionAsComplete(paymentData);
              }
            }
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async getPendingAutoDebits(source: string, loanId?: number) {
    try {
      const attributes = [
        'emiId',
        'id',
        'loanId',
        'transactionId',
        'paidAmount',
        'type',
        'userId',
        'subSource',
        'utr',
      ];
      const where: any = {
        status: 'INITIALIZED',
        subSource: 'AUTODEBIT',
        transactionId: { [Op.ne]: null },
      };
      if (loanId) where.loanId = loanId;
      if (source != 'all') {
        where.subSource = [kAutoDebit, kDirectBankPay];
        if (source == 'CASHFREE')
          where.source = { [Op.or]: ['CASHFREE', 'AUTOPAY'] };
        else where.source = source;
      }
      const options: any = { where };
      if (loanId) options.limit = 1;
      return await this.transactionRepo.getTableWhereData(attributes, options);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async checkRazorpayAutoDebits(loanId?: number) {
    try {
      const transList = await this.getDataForCheckRazorpayAutoDebits(loanId);
      if (transList.message) return transList;
      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          const utr = transData.utr;
          if (!utr?.includes('pay_')) continue;

          const paymentResponse = await this.razorpayService.checkPaymentStatus(
            utr,
          );
          const finalStatuses = [kCompleted, kFailed];
          const status = paymentResponse.status;
          if (!status || !finalStatuses.includes(status)) continue;
          if (paymentResponse.message) continue;
          const response = paymentResponse.response;
          if (!response) continue;
          const paymentData: any = { status: paymentResponse.status };
          paymentData.id = transData.id;
          paymentData.response = paymentResponse.response;
          paymentData.type = transData.type;
          paymentData.loanId = transData.loanId;
          paymentData.userId = transData.userId;
          paymentData.subSource = transData.subSource;
          if (transData.emiId) paymentData.emiId = transData.emiId;
          if (!transData?.subscriptionDate) continue;
          paymentData.completionDate = transData?.subscriptionDate;
          const res = JSON.parse(response);
          if (res?.adNotPlaced) paymentData.subStatus = 'AD_NOT_PLACED';
          await this.markTransactionAsComplete(paymentData);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForCheckRazorpayAutoDebits(loanId?: number) {
    try {
      const attributes = [
        'emiId',
        'id',
        'loanId',
        'type',
        'userId',
        'utr',
        'subscriptionDate',
        'subSource',
      ];
      const where: any = {
        status: 'INITIALIZED',
        source: { [Op.or]: [kRazorpay, 'AUTOPAY'] },
        subSource: { [Op.or]: [kAutoDebit, kDirectBankPay, 'WEB'] },
        utr: { [Op.ne]: null },
        transactionId: { [Op.ne]: null },
      };
      if (loanId && loanId != -1) where.loanId = loanId;
      const order = [['id', 'DESC']];
      const options = { order, where };

      const transList = await this.transactionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;
      return transList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkRazorpayAutoDebitsWebhook(reqData) {
    const paymentEntity = reqData?.payload?.payment?.entity;
    if (!paymentEntity) throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    const { id: utr, status, method, order_id, amount } = paymentEntity;
    if (!utr?.includes('pay_')) return;

    if (method == 'emandate' && amount == 0) {
      const attributes = [
        'id',
        'userId',
        'mode',
        'umrn',
        'status',
        'referenceId',
      ];
      const options = {
        where: {
          status: kInitiated,
          referenceId: order_id,
          mode: kRazorpay,
        },
      };
      const subscriptionData = await this.repoManager.getRowWhereData(
        SubScriptionEntity,
        attributes,
        options,
      );
      if (subscriptionData === k500Error)
        throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
      if (!subscriptionData) return {};

      const finalStatuses = ['ACTIVE', kFailed];
      const paymentStatus = status === 'captured' ? 'ACTIVE' : kFailed;
      if (!finalStatuses.includes(paymentStatus)) return;

      const updatedData = {
        status: paymentStatus,
        umrn: paymentEntity.token_id,
        response: JSON.stringify(paymentEntity),
      };

      const update = await this.repoManager.updateRowData(
        SubScriptionEntity,
        updatedData,
        subscriptionData.id,
      );
      if (update === k500Error)
        throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

      const userId = subscriptionData.userId;
      const masterAttrs = ['id', 'status', 'dates'];
      const masterOpts = {
        where: { userId },
        order: [['id', 'DESC']],
      };
      const masterData = await this.masterRepository.getRowWhereData(
        masterAttrs,
        masterOpts,
      );
      if (masterData == k500Error) return kInternalError;

      const statusData = masterData?.status ?? {};
      const dates = masterData?.dates ?? {};
      dates.eMandate = new Date().getTime();

      let updateData: any = {};
      if (paymentStatus === 'ACTIVE') {
        statusData.eMandate = 1;
        updateData = { dates, status: statusData };
      } else {
        statusData.eMandate = 2;
        updateData = { status: statusData, dates };
      }
      const updateResult = await this.masterRepository.updateRowData(
        updateData,
        masterData.id,
      );
      if (updateResult == k500Error) return kInternalError;
      await this.userServiceV4.routeDetails({ id: userId });
      return true;
    }

    const attributes = [
      'emiId',
      'id',
      'loanId',
      'type',
      'userId',
      'utr',
      'subscriptionDate',
      'subSource',
    ];

    const where = {
      status: kInitiated,
      source: kRazorpay,
      subSource: kAutoDebit,
      utr,
      transactionId: { [Op.ne]: null },
    };
    const order = [['id', 'DESC']];
    const options = { order, where };
    const transData = await this.transactionRepo.getRowWhereData(
      attributes,
      options,
    );
    if (transData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (transData?.message) throw new Error(transData.message);
    if (!transData) return {};

    const finalStatuses = [kCompleted, kFailed];
    const paymentStatus = status === 'captured' ? kCompleted : kFailed;
    if (!finalStatuses.includes(paymentStatus)) return;

    const paymentData: any = { status: paymentStatus };
    paymentData.id = transData.id;
    paymentData.response = JSON.stringify(paymentEntity);
    paymentData.type = transData.type;
    paymentData.loanId = transData.loanId;
    paymentData.userId = transData.userId;
    if (transData.emiId) paymentData.emiId = transData.emiId;
    if (!transData?.subscriptionDate) return;
    paymentData.completionDate = transData?.subscriptionDate;
    paymentData.subSource = transData.subSource;
    if (paymentEntity?.adNotPlaced) paymentData.subStatus = 'AD_NOT_PLACED';
    await this.markTransactionAsComplete(paymentData);
    return true;
  }

  async checkRazorpayManualWebhook(reqData) {
    try {
      const paymentEntity = reqData?.payload?.payment?.entity;
      if (!paymentEntity) return kInternalError;
      const { order_id: ordId, status, id: utr } = paymentEntity;
      const attributes = [
        'emiId',
        'id',
        'loanId',
        'type',
        'userId',
        'transactionId',
        'completionDate',
        'subSource',
      ];
      const where: any = {
        status: { [Op.ne]: kCompleted },
        source: kRazorpay,
        subSource: { [Op.ne]: kAutoDebit },
        transactionId: ordId,
      };

      const order = [['id', 'DESC']];
      const options = { order, where };
      const transData = await this.transactionRepo.getRowWhereData(
        attributes,
        options,
      );

      if (transData === k500Error) return kInternalError;
      if (!transData) return k422ErrorMessage(kNoDataFound);

      const finalStatuses = [kCompleted, kFailed];
      const paymentStatus = status === 'captured' ? kCompleted : kFailed;
      if (!paymentStatus || !finalStatuses.includes(paymentStatus)) return;
      const paymentData: any = { status: paymentStatus };

      paymentData.id = transData.id;
      paymentData.utr = utr;
      paymentData.response = JSON.stringify(paymentEntity);
      paymentData.type = transData.type;
      paymentData.loanId = transData.loanId;
      paymentData.userId = transData.userId;
      if (transData.emiId) paymentData.emiId = transData.emiId;
      paymentData.completionDate = this.typeService
        .getGlobalDate(new Date())
        .toJSON();
      paymentData.subSource = transData.subSource;
      await this.markTransactionAsComplete(paymentData);
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkSDAutoDebits(responseData: any) {
    try {
      const mandateList = responseData.mandate_list;
      const batchId = responseData.batch_id;
      const responseList: any[] = [];

      for (let index = 0; index < mandateList.length; index++) {
        try {
          const data = mandateList[index];
          const utr = `${data.emandate_id}-id-${batchId}`;
          const options = { where: { utr } };
          const existingData = await this.transactionRepo.getRowWhereData(
            [
              'createdAt',
              'utr',
              'transactionId',
              'emiId',
              'loanId',
              'userId',
              'id',
              'type',
              'paidAmount',
              'subSource',
              'subscriptionDate',
            ],
            options,
          );
          if (!existingData || existingData == k500Error) continue;
          const comDate = this.typeService.getGlobalDate(
            existingData?.createdAt,
          );
          const id = existingData.id;
          const loanId = existingData.loanId;
          const userId = existingData.userId;
          const subSource = existingData.subSource;
          const response = JSON.stringify(data);
          const updatedData: any = { id, loanId, userId, response, subSource };
          if (data.status == 'RES_Rejected') updatedData.status = 'FAILED';
          else if (data.status == 'RES_Accepted')
            updatedData.status = 'COMPLETED';
          updatedData.completionDate =
            existingData?.subscriptionDate ?? comDate;
          updatedData.type = existingData.type;
          updatedData.utr = existingData.utr;
          updatedData.paidAmount = existingData.paidAmount;
          if (updatedData.type == 'EMIPAY' || updatedData.type == 'PARTPAY')
            updatedData.emiId = existingData.emiId;

          responseList.push(updatedData);
        } catch (error) {}
      }

      return responseList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // start region checking icici upi transactions status
  async checkICICIUPITransactions(iciciUPIList) {
    try {
      for (let i = 0; i < iciciUPIList.length; i++) {
        try {
          const transData = iciciUPIList[i];
          const transactionId = transData?.transactionId;
          const transactionType = 'C';
          const response = await this.iciciService.CallbackStatus({
            transactionId,
            transactionType,
          });
          if (response?.status == 'COMPLETED' || response?.status == 'FAILED') {
            let paymentData: any = {};
            paymentData.id = transData?.id;
            paymentData.status = response?.status;
            paymentData.response = response?.response;
            paymentData.utr = response?.OriginalBankRRN;
            paymentData.completionDate = response?.paymentDate.toJSON();
            paymentData.type = transData?.type;
            paymentData.loanId = transData?.loanId;
            paymentData.userId = transData?.userId;
            paymentData.subSource = transData?.subSource;
            if (transData?.emiId) paymentData.emiId = transData?.emiId;

            await this.markTransactionAsComplete(paymentData);

            return {
              amount: transData?.paidAmount,
              status: paymentData?.status,
              paymentGateway: 'UPI',
              transactionId:
                response?.OriginalBankRRN ?? transData?.transactionId,
              date: response?.formattedDateForUI,
            };
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async syncPaymentWebData(body) {
    const userId = body?.userId;
    const loanId = body?.loanId;
    const parts = body.internalResponse.split('_');
    const transactionId = parts[parts.length - 1];
    const triggersToUpdate = {
      'https://razorpay.com/payment-link/': {
        allowContains: true,
        onLoadStart: {
          state: { isProcessing: true },
        },
        onLoadStop: {
          state: { isProcessing: false },
        },
      },
      [HOST_URL + `${Latest_Version}/transaction/checkCallBack`]: {
        allowContains: true,
        allowAnyConsole: true,
        onLoadStart: {
          state: { paymentLoader: true },
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        onLoanStop: {
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: { paymentLoader: true },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId, userId, transactionId, isAnimation: true },
              },
            ],
          },
        ],
      },
      [`${process.env.FRONTEND_BASE_URL}cashfree-payment`]: {
        allowContains: true,
        allowAnyConsole: true,
        onLoadStop: {
          state: {
            isProcessing: true,
            paymentLoader: true,
          },
          triggers: ['console.log("PAYMENT_CHECK")'],
        },
        onLoadStart: {
          state: {
            isProcessing: true,
            paymentLoader: true,
          },
          triggers: ['console.log("PAYMENT_CHECK")'],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: {
              isProcessing: true,
              isLoader: true,
            },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId, userId, transactionId, isAnimation: true },
              },
            ],
          },
        ],
      },
    };
    return { triggersToUpdate };
  }
  //#endregion

  // Re-calculation of paid bifurcation (paid Principal, paid Interest, paid Penalty)
  async reCalculatePaidAmounts(body) {
    const loanId = body?.loanId;
    if (!loanId) return kParamMissing('loanId');

    // Loan Data with EMI data and Transaction data
    const traAttrs = [
      'id',
      'emiId',
      'status',
      'type',
      'paidAmount',
      'principalAmount',
      'interestAmount',
      'penaltyAmount',
      'transactionId',
      'legalCharge',
      'cgstOnLegalCharge',
      'sgstOnLegalCharge',
      'penalCharge',
      'cgstOnPenalCharge',
      'sgstOnPenalCharge',
      'regInterestAmount',
      'bounceCharge',
      'cgstOnBounceCharge',
      'sgstOnBounceCharge',
    ];
    const emiAttr = [
      'id',
      'fullPayPrincipal',
      'fullPayPenalty',
      'fullPayInterest',
      'fullPayLegalCharge',
      'fullPayPenal',
      'fullPayRegInterest',
      'fullPayBounce',
    ];
    const transInc = {
      model: TransactionEntity,
      attributes: traAttrs,
      where: { status: kCompleted },
    };
    const emiInc = { model: EmiEntity, attributes: emiAttr };
    const options = { where: { id: loanId }, include: [emiInc, transInc] };
    const loanData = await this.loanRepo.getRowWhereData(['id'], options);
    if (loanData === k500Error) throw new Error();
    if (!loanData) return {};
    const originalTrans = await this.commonSharedService.filterTransActionData(
      loanData?.transactionData ?? [],
    );
    loanData.transactionData = originalTrans;
    await this.updatePaidEMIBifurcation(loanData);
    return loanData;
  }

  // update paid bifurcation in EMI (paid Principal, paid Interest, paid Penalty)
  private async updatePaidEMIBifurcation(loanData) {
    const transData = loanData?.transactionData ?? [];
    if (transData.length == 0) return {};
    const emiData = loanData?.emiData;
    for (let i = 0; i < emiData.length; i++) {
      const emi = emiData[i];
      const emiId = emi.id;
      let paid_principal = emi?.fullPayPrincipal ?? 0;
      let paid_interest = emi?.fullPayInterest ?? 0;
      let paid_penalty = emi?.fullPayPenalty ?? 0;
      let paidLegalCharge = emi?.fullPayLegalCharge ?? 0;
      let paidPenalCharge = emi?.fullPayPenal ?? 0;
      let paidRegInterestAmount = emi?.fullPayRegInterest ?? 0;
      let paidBounceCharge = emi?.fullPayBounce ?? 0;
      const trans = transData.filter((f) => f?.emiId == emiId);
      trans.forEach((tra) => {
        if (tra?.type != kFullPay) {
          const bounceCharge =
            (tra?.bounceCharge ?? 0) +
            (tra?.sgstOnBounceCharge ?? 0) +
            (tra?.cgstOnBounceCharge ?? 0);
          const penalCharge =
            (tra?.penalCharge ?? 0) +
            (tra?.sgstOnPenalCharge ?? 0) +
            (tra?.cgstOnPenalCharge ?? 0);
          const legalCharge =
            (tra?.legalCharge ?? 0) +
            (tra?.sgstOnLegalCharge ?? 0) +
            (tra?.cgstOnLegalCharge ?? 0);

          paid_principal += tra?.principalAmount ?? 0;
          paid_interest += tra?.interestAmount ?? 0;
          paid_penalty += tra?.penaltyAmount ?? 0;
          paidRegInterestAmount += tra?.regInterestAmount ?? 0;
          paidBounceCharge += bounceCharge;
          paidPenalCharge += penalCharge;
          paidLegalCharge += legalCharge;
        }
      });
      paid_penalty = +paid_penalty.toFixed(2);
      paidRegInterestAmount = +paidRegInterestAmount.toFixed(2);
      paidBounceCharge = +paidBounceCharge.toFixed(2);
      paidPenalCharge = +paidPenalCharge.toFixed(2);
      paidLegalCharge = +paidLegalCharge.toFixed(2);
      const updatedEMI = {
        paid_principal,
        paid_interest,
        paid_penalty,
        paidRegInterestAmount,
        paidBounceCharge,
        paidPenalCharge,
        paidLegalCharge,
      };
      await this.emiRepo.updateRowData(updatedEMI, emiId);
    }
    return {};
  }

  async getAdvanceFullPay(query) {
    const isDownload = query?.download ?? 'false';
    let loanIds =
      query?.loanIds && typeof query?.loanIds == 'string'
        ? [query?.loanIds]
        : query?.loanIds;

    const emiInc = {
      model: EmiEntity,
      attributes: ['id', 'payment_done_date'],
      where: {
        emi_date: { [Op.gt]: Sequelize.col('emiData.payment_done_date') },
      },
    };
    if (!loanIds) {
      const trInc = {
        model: TransactionEntity,
        attributes: ['id'],
        where: { status: kCompleted },
      };
      const opt = {
        where: { loanStatus: 'Complete' },
        include: [emiInc, trInc],
        limit: 100,
      };
      const loanList = await this.loanRepo.getTableWhereData(['id'], opt);
      if (loanList === k500Error) throw new Error();
      loanIds = loanList.map((e) => e?.id);
    }
    console.log('loanIds', loanIds.length);
    const emisInc = {
      model: EmiEntity,
      attributes: [
        'id',
        'emi_date',
        'pay_type',
        'partOfemi',
        'fullPayPrincipal',
        'fullPayInterest',
        'interestCalculate',
        'payment_done_date',
      ],
    };
    const traAttrs = [
      'id',
      'emiId',
      'status',
      'type',
      'paidAmount',
      'principalAmount',
      'interestAmount',
      'transactionId',
      'completionDate',
    ];
    const transInc = {
      model: TransactionEntity,
      attributes: traAttrs,
      where: { status: kCompleted },
    };
    const options = {
      where: { id: loanIds },
      include: [transInc, emisInc],
      order: [['id', 'DESC']],
    };
    const loanData = await this.loanRepo.getTableWhereData(
      [
        'id',
        'loan_disbursement_date',
        'approvedDuration',
        'loanCompletionDate',
      ],
      options,
    );
    if (loanData === k500Error) throw new Error();
    // return loanData;
    const finalData = [];
    for (let i = 0; i < loanData.length; i++) {
      const loan = loanData[i];
      const loanDisbursementDate = this.typeService.getGlobalDate(
        loan?.loan_disbursement_date,
      );
      const loanCompletionDate = this.typeService.getGlobalDate(
        loan?.loanCompletionDate,
      );
      const payDiff = this.typeService.differenceInDays(
        loanCompletionDate,
        loanDisbursementDate,
      );
      const emiData = loan.emiData;
      emiData.sort((a, b) => a.id - b.id);
      let lastEMIdate;
      let affectedInterest = 0;
      let tempEmidate;
      emiData.forEach((emi) => {
        const emiDate = this.typeService.getGlobalDate(emi.emi_date);
        if (
          loanCompletionDate >= emiDate ||
          (emi.partOfemi == 'FIRST' && payDiff > 3) ||
          (loanCompletionDate > tempEmidate && loanCompletionDate < emiDate)
        )
          affectedInterest += emi.interestCalculate;
        if (emi.partOfemi == 'LAST') lastEMIdate = emiDate;
        tempEmidate = emiDate;
      });
      if (!affectedInterest) continue;
      const tranData = loan?.transactionData ?? [];
      const orgTrans = await this.commonSharedService.filterTransActionData(
        tranData,
      );
      let paidInterest = 0;
      let fullPayDT;
      orgTrans.forEach((tra) => {
        const check = emiData.find((f) => tra?.emiId == f.id);
        if (tra.type == kFullPay || check)
          paidInterest += tra?.interestAmount ?? 0;
        if (tra.type == kFullPay) fullPayDT = tra?.completionDate;
      });
      const differenceInterest = Math.round(paidInterest - affectedInterest);
      if (!differenceInterest) continue;
      const fullPayDate = this.typeService.getGlobalDate(fullPayDT);
      let prePayDay = this.typeService.differenceInDays(
        lastEMIdate,
        loanCompletionDate,
      );
      if (loanDisbursementDate.getTime() == loanCompletionDate.getTime())
        prePayDay = +loan?.approvedDuration;
      const obj = {
        loanId: loan.id,
        loanDisbursementDate:
          this.typeService.getDateFormatted(loanDisbursementDate),
        lastEMIdate: this.typeService.getDateFormatted(lastEMIdate),
        fullPayDate: fullPayDT
          ? this.typeService.getDateFormatted(fullPayDate)
          : '-',
        loanCompletionDate:
          this.typeService.getDateFormatted(loanCompletionDate),
        approvedDuration: +loan?.approvedDuration,
        prePayDay,
        affectedInterest,
        paidInterest,
        differenceInterest,
      };
      finalData.push(obj);
    }
    console.log('finalData', finalData.length);
    if (isDownload === 'true') {
      const rawExcelData = {
        sheets: ['AdvanceFullPay'],
        data: [finalData],
        sheetName: 'AdvanceFullPay.xlsx',
      };
      const fileURL = await this.fileService.objectToExcelURL(rawExcelData);
      if (fileURL?.message) throw new Error();
      return { fileURL };
    }
    return finalData;
  }

  async checkTransactionIds(reqData) {
    try {
      const file = reqData.file;
      if (!file) return kParamMissing('file');
      const paymentMethod = reqData.paymentMethod;
      if (!paymentMethod) return kParamMissing('paymentMethod');
      const startDate = reqData.startDate;
      if (!startDate) return kParamMissing('startDate');
      const endDate = reqData.endDate;
      if (!endDate) return kParamMissing('endDate');
      const filePath = file.filename;
      if (!filePath) return kParamMissing('file');
      if (!filePath.endsWith('csv') && !filePath.endsWith('xlsx')) {
        return k422ErrorMessage('Kindly provide valid excel file');
      }

      const result = await this.getFileData(filePath);

      let missingIds = [];

      const attr = ['utr', 'status', 'userId', 'loanId', 'transactionId'];
      const options: any = {
        where: {
          source: kPaymentMode[paymentMethod],
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
      };
      const transactionData = await this.transactionRepo.getTableWhereData(
        attr,
        options,
      );

      let sheetField;
      let transactionField;
      switch (paymentMethod) {
        case '1': // RAZORPAY
          sheetField = 'order_id';
          transactionField = 'transactionId';
          break;
        case '2': // ICICI_UPI
          sheetField = 'merchantTranId';
          transactionField = 'transactionId';
          break;
        case '3': // CASHFREE
          sheetField = 'Subscription Payment ID';
          transactionField = 'utr';
          break;
      }

      missingIds = result.reduce((acc, data) => {
        const found = transactionData.find(
          (transaction) => transaction[transactionField] == data[sheetField],
        );
        if (found && found.status != 'COMPLETED') {
          const finalizedData = {
            ...data,
            ...found,
          };
          acc.push(finalizedData);
        } else {
          acc.push(data);
        }
        return acc;
      }, []);
      const finalData = await this.prepareData(missingIds);
      if (finalData.length == 0) return true;
      const path = 'MissingTransactions.xlsx';
      const rawExcelData = {
        sheets: ['MissingTransactions'],
        data: [finalData],
        sheetName: path,
        needFindTuneKey: false,
      };
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;

      const fileURL = await this.fileService.uploadFile(
        excelResponse?.filePath,
        'MissingTransactions',
        'xlsx',
      );
      if (fileURL.message) return fileURL;
      return { fileURL };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareData(transData) {
    const finalizedData = [];
    for (let i = 0; i < transData.length; i++) {
      const data = transData[i];
      const tempData: any = {
        UserId: data.userId ?? '-',
        LoanId: data.loanId ?? '-',
        Amount: data.amount ?? '-',
        Mobile: data['Customer Phone'] ?? data.contact ?? '-',
        Email: data['Customer Email'] ?? data.email ?? '-',
        Name: data['Customer Name'] ?? '-',
        Status: data.status ?? data['Subscription Payment Status'] ?? '-',
        Date:
          data.created_at ??
          data.txnCompletationDate ??
          data['Subscription Payment Added On'] ??
          '-',
      };

      finalizedData.push(tempData);
    }

    return finalizedData;
  }

  async getFileData(filePath) {
    const extractedList = [];
    let fileListData;
    fileListData = await this.fileService.excelToArray(filePath, {}, true);
    if (fileListData.message) return fileListData;
    else if (!fileListData) return kBadRequest;
    fileListData.finalData.forEach((transaction) => {
      const amount = transaction.amount || transaction.Amount || 0;
      const status =
        transaction.status || transaction['Subscription Payment Status'];
      if (amount > 0 && ['captured', 'SUCCESS'].includes(status)) {
        extractedList.push(transaction);
      }
    });

    return extractedList;
  }

  async getTrans(loanId) {
    const attributes = [
      'id',
      'paidAmount',
      'maxDPD',
      'status',
      'principalAmount',
      'principalDifference',
      'interestAmount',
      'completionDate',
      'transactionId',
      'utr',
      'source',
      'type',
      'userId',
      'loanId',
      'emiId',
      'interestDifference',
      'penaltyAmount',
      'penaltyDifference',
      'subSource',
      'subStatus',
      'bankSettlementDate',
      'closingBalance',
      'accStatus',
      'adminId',
      'subscriptionDate',
      'settled_type',
      'remarks',
      'followerId',
      'roundOff',
      'tran_unique_id',
      'feesIncome',
      'mode',
      'forClosureAmount',
      'regInterestAmount',
      'sgstForClosureCharge',
      'cgstForClosureCharge',
      'forClosureDays',
      'legalCharge',
      'bounceCharge',
      'penalCharge',
      'sgstOnBounceCharge',
      'cgstOnBounceCharge',
      'sgstOnPenalCharge',
      'cgstOnPenalCharge',
      'sgstOnLegalCharge',
      'cgstOnLegalCharge',
      'createdAt',
      'updatedAt',
      'maxDPD',
    ];
    const where: any = {
      loanId,
      status: 'COMPLETED',
    };
    const options: any = { where };
    options.order = [['id', 'DESC']];

    const transactionList = await this.transactionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (transactionList == k500Error) return kInternalError;
    return transactionList;
  }

  async addToArchiveInitializedTransactions(limit: number) {
    const pastDate = new Date();

    pastDate.setDate(pastDate.getDate() - 30);
    const query = `SELECT * FROM public."TransactionEntities"
        WHERE "status" = 'INITIALIZED' AND "createdAt" < '${pastDate.toJSON()}'
        ORDER BY ID DESC
        LIMIT ${limit}`;

    const intializedData = await this.repoManager.injectRawQuery(
      TransactionEntity,
      query,
    );
    if (intializedData == k500Error) return kInternalError;

    if (intializedData.length > 0) {
      const createData = await this.repoManager.bulkCreate(
        TransactionInitializedArchiveEntity,
        intializedData,
      );
      if (createData == k500Error) throw new Error();

      if (createData.length > 0) {
        const ids = intializedData.map((el) => el.id);
        const deleteData = await this.repoManager.deleteWhereData(
          TransactionEntity,
          { where: { id: { [Op.in]: ids } } },
          false,
        );
        if (deleteData == k500Error) throw new Error();
      }
      await this.addToArchiveInitializedTransactions(limit);
    }
    return true;
  }
}
