// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  manualBanksList,
  ECS_BOUNCE_LIMIT,
  GLOBAL_RANGES,
  GLOBAL_FLOW,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { GET_COMPARE_ACCOUNT } from 'src/constants/network';
import {
  kAllSalaryExceptions,
  kBankingProHeaders,
  kMonths,
} from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import {
  FINALBUCKETADMINS,
  USER_WITH_DEFAULTER_SAME_ADDRESS,
  kByPass,
  kErrorMsgs,
  kNoDataFound,
  kUsrCategories,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { KYCEntity } from 'src/entities/kyc.entity';
import { EMIRepository } from 'src/repositories/emi.repository';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { RedisService } from 'src/redis/redis.service';
import { UserRepository } from 'src/repositories/user.repository';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class PredictionService {
  constructor(
    private readonly api: APIService,
    private readonly assignmentService: AssignmentSharedService,
    private readonly bankingRepo: BankingRepository,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly loanRepo: LoanRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly subScriptionRepo: SubscriptionRepository,
    private readonly typeService: TypeService,
    private readonly validation: ValidationService,
    private readonly masterRepo: MasterRepository,
    private readonly commonService: CommonSharedService,
    private readonly userRepo: UserRepository,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
    // Repositories
    private readonly repoManager: RepositoryManager,
    private readonly emiRepo: EMIRepository,
    // Shared services
    @Inject(forwardRef(() => CalculationSharedService))
    private readonly calculation: CalculationSharedService,
    private readonly redisService: RedisService,
  ) {}

  // final bucket prediction
  async predictApproval(reqData) {
    const loanId = reqData.loanId;
    const userId = reqData.userId;

    let finalApproval = true;
    const reason: any = {};
    let manualReason: {
      insights: any;
      aadhaarLatLong?: boolean;
      salary?: boolean;
      bankAvailability?: boolean;
      lastLoanDelay?: boolean;
      score?: boolean;
      ecs_verification?: boolean;
      overDueBalance?: boolean;
      employmentType?: boolean;
      delayPaymentHistory?: boolean;
    } = { insights: [] };
    const transactionData: any = await this.getTransctionDataByLoanId(loanId);

    const parallelResponse = await Promise.all([
      // Task number #01 -> Prediction ->  User categorization
      this.sharedEligibility.calculateScore({
        type: kUsrCategories,
        loanId,
        updateScore: false,
      }),
      // Task number #02 -> Prediction -> Repayment
      this.predictRepaymentStatusFromPY(loanId, transactionData),
      // Task number #03 -> Prediction -> Final verification
      this.predictLoanApprovalStatusFromPY(loanId, transactionData),
      // Task number #04 -> Check -> Previous loan delay
      this.isLastLoanDelayed(userId, loanId),
      // Task number #05 -> Old users -> Signdesk
      this.checkInternalScenarios(loanId),
      // Task number #06 -> Check -> lat long relation with other users
      this.commonService.verifyAadhaarLatLong(userId, false),
      // Task number #07 -> Check -> salary verification
      this.checkNetBankEmiData(userId, transactionData),
      // Task number #08 -> Check -> Bank availability
      this.manualBankByPass(loanId),
      // Task number #09 -> Check -> Delay Payment History
      this.delayPaymentHistory(loanId),
    ]);
    const creationData: any = { loanId };

    // Task number #01 -> Prediction ->  User categorization
    const scoreData = parallelResponse[0];
    // Here we are not returning the error because user should not get affected
    if (!scoreData?.message) {
      creationData.categorizationTag = scoreData.categorizationTag;
      creationData.categorizationScore = scoreData.categorizationScore;
      creationData.categorizationDetails = scoreData.categorizationDetails;
    }

    // Task number #02 -> Prediction -> Repayment
    let automationDetails: any = parallelResponse[1];
    if (automationDetails?.message)
      automationDetails = { message: automationDetails };
    creationData.automationDetails = automationDetails ?? {};

    // Task number #03 -> Prediction -> Final verification
    let ml_approval: any = parallelResponse[2];
    if (ml_approval?.message) ml_approval = { message: ml_approval };
    creationData.ml_approval = ml_approval ?? {};

    // Task number #04 -> Check -> Previous loan delay
    const isLastLoanDelayed = parallelResponse[3];

    // Task number #06 -> Check -> lat long relation with other users
    const latLngResult = parallelResponse[5];
    const lengthOfExactAddressUsers = latLngResult?.exactAddressUsers ?? 0;
    const lengthOfNearByUsers = latLngResult?.users ?? 0;
    if (latLngResult.status === true) {
      creationData.aadhaarLatLong = true;
      reason.aadhaarLatLong = latLngResult.enum;
      reason.matchLatLongCount = lengthOfNearByUsers ?? 0;
    } else if (latLngResult.status === false) {
      reason.aadhaarLatLong = latLngResult.enum;
      reason.matchLatLongCount = lengthOfNearByUsers ?? 0;
      if (lengthOfNearByUsers > 0) {
        reason.matchLatLongUsers = latLngResult?.userList ?? [];
      }
      reason.exactMatchAddressCount = lengthOfExactAddressUsers;
      if (lengthOfExactAddressUsers > 0) {
        reason.exactMatchAddressUsers =
          latLngResult?.exactAddressUsersList ?? [];
        // let shouldBlockUser = await this.checkIfUsersIsDefaulter(
        //   reason.exactMatchAddressUsers,
        // );
        // if (shouldBlockUser) blockUser = true;
      }
      creationData.aadhaarLatLong = false;
      manualReason.aadhaarLatLong = false;
      const key = `${userId}_USER_PROFILE`;
      await this.redisService.del(key);
    }
    creationData.reason = JSON.stringify(reason);

    // let isBlocked = false;
    // if (blockUser) {
    //   await this.adminService.changeBlacklistUser({
    //     adminId: SYSTEM_ADMIN_ID,
    //     reasonId: 69,
    //     status: '1',
    //     type: '1',
    //     userId,
    //     nextApplyDate: null,
    //     reason: USER_WITH_DEFAULTER_SAME_ADDRESS,
    //   });
    //   isBlocked = true;
    // }

    // Task number #07 -> Check -> salary verification
    const salaryVerificationResult = parallelResponse[6];
    if (salaryVerificationResult.status === false) {
      finalApproval = false;
      creationData.salary_verification = false;
      reason.salary_verification = salaryVerificationResult.enum;
      manualReason.salary = false;
    } else creationData.salary_verification = true;

    // Task number #08 -> Check -> Bank availability
    const bankResult = parallelResponse[7];
    if (bankResult.status === false) {
      finalApproval = false;
      manualReason.bankAvailability = false;
    }

    // Task number #09 -> Check -> ECS bounce
    const ecsResult = await this.checkEcstransactionForAll(bankResult);
    if (ecsResult.status === false) {
      finalApproval = false;
      manualReason.ecs_verification = false;
    }

    // Task number #10 -> Check -> Delay Payment History
    const paymentResult = parallelResponse[8];
    if (paymentResult.status === false) {
      finalApproval = false;
      manualReason.delayPaymentHistory = false;
    }

    // Check automation as per loan eligibility -> selected range
    const loanData = reqData?.masterData?.loanData ?? {};
    const cibilData = loanData?.cibilData ?? {};
    const plScore = cibilData?.plScore;
    const cibilScore = cibilData?.cibilScore;
    const overdueBalance = cibilData?.overdueBalance;
    if (
      manualReason.bankAvailability !== false &&
      manualReason.aadhaarLatLong !== false &&
      manualReason.ecs_verification !== false &&
      finalApproval == true
    ) {
      finalApproval = true;
    } else {
      finalApproval = false;
    }

    if (GLOBAL_FLOW.FINAL_VERIFICATION === 'AUTO') {
      if (plScore && plScore < GLOBAL_RANGES.PL_SCORE_BYPASS) {
        finalApproval = false;
        manualReason.insights.push(
          `PL score < ${GLOBAL_RANGES.PL_SCORE_BYPASS}`,
        );
      }

      if (cibilScore && cibilScore < GLOBAL_RANGES.CIBIL_SCORE_BYPASS) {
        finalApproval = false;
        manualReason.insights.push(
          `CIBIL score < ${GLOBAL_RANGES.CIBIL_SCORE_BYPASS}`,
        );
      }

      if (
        overdueBalance &&
        overdueBalance > GLOBAL_RANGES.MAX_IDEAL_OVERDUE_AMOUNT
      ) {
        finalApproval = false;
        manualReason.overDueBalance = false;
        manualReason.insights.push(
          `Overdue balance > ${GLOBAL_RANGES.MAX_IDEAL_OVERDUE_AMOUNT}`,
        );
      }
    } else if (GLOBAL_FLOW.FINAL_VERIFICATION === 'MANUAL') {
      finalApproval = false;
      manualReason.insights.push('Forceful manual');
    }

    // Insert prediction record
    creationData.manualReason = manualReason;
    const result: any = await this.repoManager.createRowData(
      PredictionEntity,
      creationData,
    );
    if (result === k500Error) throw new Error();

    // Update loan record
    const updatedData: any = { predictionId: result.id };
    if (finalApproval === true) updatedData.prediction = kByPass;
    else {
      updatedData.prediction = 'IN_MANUAL';
      await this.assignToAdmin(loanId);
    }
    const updateResult = await this.repoManager.updateRowData(
      loanTransaction,
      updatedData,
      loanId,
    );
    if (updateResult === k500Error) throw new Error();

    return { finalApproval };
  }

  async checkIfUsersIsDefaulter(userList) {
    const emiInclude = {
      model: EmiEntity,
      attributes: ['payment_due_status'],
    };
    const options = {
      where: { id: userList },
      include: emiInclude,
    };
    const userData = await this.userRepo.getTableWhereData(['id'], options);
    if (!userData || userData == k500Error) throw new Error();

    for (let user of userData) {
      const emiData = user?.emiData ?? [];
      for (let emi of emiData) {
        if (emi.payment_due_status == '1') {
          return true;
        }
      }
    }
    return false;
  }

  // User should forcefully fall under manual verification for more than 2 days delay
  private async isLastLoanDelayed(userId, loanId) {
    // Query preparation
    const emiInclude: any = { model: EmiEntity };
    emiInclude.attributes = ['penalty_days'];
    const attributes = ['id'];
    const include = [emiInclude];
    const where: any = {
      userId,
      id: { [Op.ne]: loanId },
    };
    where.loanStatus = 'Complete';
    const options = {
      include,
      where,
      order: [['id', 'DESC']],
    };
    // Query
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      attributes,
      options,
    );
    if (loanData === k500Error) throw new Error();

    // Logic validation
    if (!loanData) return false;
    const emiList: EmiEntity[] = loanData.emiData ?? [];
    const totalOverdueDays = emiList.reduce(
      (prev, curr) => prev + (curr.penalty_days ?? 0),
      0,
    );
    if (totalOverdueDays >= 2) return true;
    else return false;
  }

  private async manualBankByPass(loanId) {
    try {
      const loanData = await this.loanRepo.getRowWhereData(['id'], {
        where: { id: loanId },
        include: [
          {
            model: BankingEntity,
            attributes: ['id', 'disbursementBank', 'otherDetails'],
          },
        ],
      });
      if (!loanData || loanData == k500Error)
        return { status: false, enum: 'BANK_NOT_FOUND' };
      else if (manualBanksList.includes(loanData?.bankingData.disbursementBank))
        return {
          status: false,
          enum: `CAN_NOT_PROCESS_WITH_BANK:${loanData?.bankingData.disbursementBank}`,
        };
      else return { status: true, bankData: loanData?.bankingData };
    } catch (error) {
      return { status: false, enum: 'INTERNAL_ERROR' };
    }
  }

  private async delayPaymentHistory(loanId) {
    try {
      const attr = ['loanId', 'past6MonthDelay'];
      const options = { order: [['id', 'DESC']], where: { loanId } };
      const cibilData = await this.repoManager.getRowWhereData(
        CibilScoreEntity,
        attr,
        options,
      );
      if (cibilData === k500Error)
        return { status: false, enum: 'INTERNAL_ERROR' };
      if (cibilData.past6MonthDelay === 1)
        return { status: false, enum: 'DELAY PAYMENT HISTORY' };
      if (cibilData?.past6MonthDelay === 1)
        return { status: false, enum: 'DELAY PAYMENT HISTORY' };
      return { status: true };
    } catch (error) {
      return { status: false, enum: 'INTERNAL_ERROR' };
    }
  }

  private async checkInternalScenarios(loanId) {
    try {
      const attributes = ['mandateAccount', 'userId'];
      const options = { order: [['id', 'DESC']], where: { loanId } };

      const bankData = await this.bankingRepo.getRowWhereData(
        attributes,
        options,
      );
      if (bankData == k500Error) return kInternalError;

      const mandateAccount = bankData.mandateAccount;
      const userId = bankData.userId;
      if (!mandateAccount || !userId) return k422ErrorMessage('No data found');

      const subScriptionOptions = {
        where: { accountNumber: mandateAccount, userId },
      };
      const subScriptionData = await this.subScriptionRepo.getRowWhereData(
        ['accountNumber', 'id', 'mode'],
        subScriptionOptions,
      );
      if (subScriptionData == k500Error) return kInternalError;

      const mode = subScriptionData?.mode;
      if (mode != 'SIGNDESK') return {};

      const accountNumber = subScriptionData.accountNumber + '-SD';
      const updatedData = { accountNumber };
      const id = subScriptionData.id;
      const updateResponse = await this.subScriptionRepo.updateRowData(
        updatedData,
        id,
      );
      if (updateResponse == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkEcstransactionForAll(ecsDetails) {
    try {
      if (
        ecsDetails?.bankData?.otherDetails?.ecsDetails?.ecsBounceCount >
        ECS_BOUNCE_LIMIT
      ) {
        return { status: false, enum: 'ECS_FOUND' };
      } else {
        return { status: true };
      }
    } catch (error) {
      return { status: false, enum: 'ECS_INTERNAL_ERROR' };
    }
  }

  async assignToAdmin(loanId, type = FINALBUCKETADMINS) {
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      ['id', 'manualVerification', 'loanStatus', 'masterId'],
      { where: { id: loanId } },
    );
    if (!loanData && loanData === k500Error) return k500Error;
    const loanStatus = loanData?.loanStatus;
    if (loanStatus != 'Accepted' && loanStatus != 'InProcess') return false;
    const adminId = await this.assignmentService.checkAdminDataFetch(
      type,
      true,
    );
    if (adminId == k500Error) return k500Error;
    const updateRes = await this.loanRepo.updateWhere(
      { assignTo: adminId },
      loanId,
      { assignTo: { [Op.eq]: null } },
    );
    if (updateRes === k500Error) return k500Error;
    await this.masterRepo.updateRowData(
      { loanAssingId: adminId },
      loanData.masterId,
    );
    return updateRes;
  }

  async assignToCSE(type, masterId) {
    const adminId = await this.assignmentService.checkAdminDataFetch(
      type,
      true,
    );
    if (adminId == k500Error) return k500Error;
    const options = {
      where: {
        id: masterId,
        assignedCSE: { [Op.eq]: null },
      },
    };
    const updateRes = await this.masterRepo.updateRowWhereData(
      { assignedCSE: adminId },
      options,
    );
    return updateRes;
  }

  async getFinalPredictionNumbers() {
    try {
      const today = this.typeService.getGlobalDate(new Date());
      const ranges = this.getRange(today);
      if (ranges.length === 0) return k500Error;
      const fromRange = ranges[ranges.length - 1].fromRange;
      const toRange = ranges[0].toRange;

      const attributes = [
        'loan_disbursement_date',
        'manualVerification',
        'manualVerificationAcceptId',
        'updatedAt',
      ];
      const predictionInclude: any = { model: PredictionEntity };
      predictionInclude.attributes = ['finalApproval'];
      const include = [predictionInclude];
      const disbursementWhere = {
        loan_disbursement_date: { [Op.lte]: toRange, [Op.gte]: fromRange },
      };
      const updatedAtWhere = {
        [Op.lte]: new Date(toRange),
        [Op.gte]: new Date(fromRange),
      };
      const statusWhere = {
        manualVerification: '2',
        updatedAt: updatedAtWhere,
      };
      const where: any = {
        [Op.or]: [disbursementWhere, statusWhere],
        manualVerificationAcceptId: { [Op.ne]: null },
      };
      const options = {
        include,
        where,
      };

      const loanListData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanListData == k500Error) return k500Error;

      const monthWiseData: any[] = [];

      for (let index = 0; index < ranges.length; index++) {
        try {
          const targetDate = new Date(today);
          targetDate.setDate(1);
          targetDate.setMonth(targetDate.getMonth() - index);

          const fromRange = targetDate.toJSON();
          const toRange = this.typeService.getLastDateOfMonth(targetDate);

          const data = this.getFinalPredictionNumbersWithRange(
            loanListData,
            fromRange,
            toRange.toJSON(),
          );
          monthWiseData.push(data);
        } catch (error) {}
      }

      return monthWiseData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getdDefaulterPredictionReport() {
    try {
      const today = this.typeService.getGlobalDate(new Date());
      const ranges = this.getRange(today);
      if (ranges.length === 0) return k500Error;
      const fromRange = ranges[ranges.length - 1].fromRange;
      const toRange = ranges[0].toRange;

      const attributes = [
        'id',
        'loan_disbursement_date',
        'manualVerificationAcceptId',
      ];
      const options = {
        include: [
          {
            model: EmiEntity,
            attributes: ['payment_due_status'],
            // where: {
            //   payment_due_status: '1',
            // },
          },
        ],
        where: {
          loan_disbursement_date: {
            [Op.lte]: new Date(toRange),
            [Op.gte]: new Date(fromRange),
          },
        },
      };
      const loanListData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanListData == k500Error) return k500Error;
      const monthWiseData: any[] = [];
      for (let index = 0; index < ranges.length; index++) {
        try {
          const targetDate = new Date(today);
          targetDate.setDate(1);
          targetDate.setMonth(targetDate.getMonth() - index);
          const fromRange = targetDate.toJSON();
          const toRange = this.typeService.getLastDateOfMonth(targetDate);
          const data = this.getFinalDefaulterPrediction(
            loanListData,
            fromRange,
            toRange.toJSON(),
          );
          if (!data || data == k500Error) continue;
          monthWiseData.push(data);
        } catch (error) {}
      }
      return monthWiseData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private getRange(today: Date) {
    const ranges = [];
    for (let index = 0; index < 12; index++) {
      try {
        const targetDate = new Date(today);
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() - index);

        const fromRange = targetDate.toJSON();
        let toRange = this.typeService.getLastDateOfMonth(targetDate);
        toRange = toRange.toJSON();
        ranges.push({ fromRange, toRange });
      } catch (error) {}
    }
    return ranges;
  }

  private getFinalPredictionNumbersWithRange(
    listData: loanTransaction[],
    fromRange: string,
    toRange: string,
  ) {
    try {
      let loanListData = [...listData];
      loanListData = loanListData.filter((el) => {
        const status = el.manualVerification;
        const disbursedDate = el.loan_disbursement_date;
        const updatedAt = new Date(el.updatedAt);
        const fromDate = new Date(fromRange);
        const toDate = new Date(toRange);

        if (
          status == '2' &&
          updatedAt.getTime() >= fromDate.getTime() &&
          updatedAt.getTime() <= toDate.getTime()
        )
          return true;
        else if (
          disbursedDate &&
          new Date(disbursedDate).getTime() >= fromDate.getTime() &&
          new Date(disbursedDate).getTime() <= toDate.getTime()
        )
          return true;
      });

      const totalLength = loanListData.length;
      if (totalLength === 0)
        return {
          fromRange,
          toRange,
          bypassAccuracy: 0,
          adminApproved: 0,
          systemAproved: 0,
        };

      const byPassBaseCount = loanListData.filter(
        (el) => el.predictionData?.finalApproval == true,
      ).length;

      const byPassBaseApprovedCount = loanListData.filter(
        (el) =>
          el.predictionData?.finalApproval == true &&
          el.manualVerification != '2',
      ).length;

      const approvedBaseCount = loanListData.filter(
        (el) => el.manualVerification != '2',
      ).length;

      const adminApprovedCount = loanListData.filter(
        (el) =>
          el.manualVerification == '3' && el.manualVerificationAcceptId != 37,
      ).length;

      const systemApprovedCount = loanListData.filter(
        (el) =>
          el.predictionData?.finalApproval == true &&
          el.manualVerificationAcceptId == 37,
      ).length;

      const bypassAccuracy = this.countPercentage(
        byPassBaseApprovedCount,
        byPassBaseCount,
      );
      const adminApproved = this.countPercentage(
        adminApprovedCount,
        approvedBaseCount,
      );
      const systemAproved = this.countPercentage(
        systemApprovedCount,
        approvedBaseCount,
      );

      return {
        fromRange,
        toRange,
        bypassAccuracy,
        adminApproved,
        systemAproved,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private getFinalDefaulterPrediction(
    listData: loanTransaction[],
    fromRange: string,
    toRange: string,
  ) {
    try {
      let loanListData = [...listData];
      loanListData = loanListData.filter((el) => {
        const disbursedDate = el.loan_disbursement_date;
        const fromDate = new Date(fromRange);
        const toDate = new Date(toRange);
        if (
          disbursedDate &&
          new Date(disbursedDate).getTime() >= fromDate.getTime() &&
          new Date(disbursedDate).getTime() <= toDate.getTime()
        )
          return true;
      });

      const totalDisbursedLoans = loanListData.length;
      if (totalDisbursedLoans === 0) return false;

      const isDue = loanListData.find((el) =>
        el.emiData.find((item) => item.payment_due_status == '1'),
      );
      if (!isDue) return false;

      const systemApprovedDefCount = loanListData.filter((el) => {
        const dueEl = el.emiData.find((item) => item.payment_due_status == '1');
        return el.manualVerificationAcceptId == 37 && dueEl;
      }).length;

      const adminApprovedDefCount = loanListData.filter((el) => {
        const dueEl = el.emiData.find((item) => item.payment_due_status == '1');
        return el.manualVerificationAcceptId != 37 && dueEl;
      }).length;

      const defaulterCount = loanListData.filter((el) =>
        el.emiData.find((item) => item.payment_due_status == '1'),
      ).length;

      const adminApprovedDefPerc = this.countPercentage(
        adminApprovedDefCount,
        totalDisbursedLoans,
      );
      const systemAprovedDefPerc = this.countPercentage(
        systemApprovedDefCount,
        totalDisbursedLoans,
      );
      const defaulterPerc = this.countPercentage(
        defaulterCount,
        totalDisbursedLoans,
      );

      return {
        fromRange,
        toRange,
        totalDisbursedLoans,
        defaulterCount,
        systemApprovedDefCount,
        adminApprovedDefCount,
        defaulterPerc,
        adminApprovedDefPerc,
        systemAprovedDefPerc,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private countPercentage(target: number, base: number) {
    if (target === 0) return 0;
    return parseFloat(((target / base) * 100).toFixed(2));
  }

  getEcsTransactionScoreRepeatedUser(transactionData) {
    try {
      let ecsTransactions = transactionData.filter((el) =>
        el.category.includes('ECS'),
      );

      if (ecsTransactions.length === 0) return { status: true };

      let count = 0;
      ecsTransactions = ecsTransactions.filter((el) => {
        try {
          const closingBalance = el.balanceAfterTransaction ?? 0;
          const amount = el.amount ?? 0;
          if (closingBalance > 2500 && amount < closingBalance) count--;
        } catch (error) {}
      });

      if (count <= 2) return true;
      return false;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  getEcsTransactionScoreNewUser(transactionData) {
    try {
      // return transactionData
      const totalScore = 900;
      const minusPerEcs = 60;
      const plusPerOverAmount = 50;
      const afterEcsClosingBalace = 25;
      const minusPerDueAmount = 30;
      let userScore = totalScore;
      const isAlreadyDate = [];
      transactionData.forEach((el) => {
        try {
          const ecsTransactionDate = this.typeService.dateTimeToDate(
            el.dateTime,
            'DD/MM/YYYY HHMMSS A',
          );
          //get last 3 month data
          const ecsCategory = ['ECS/CHQ RETURN CHARGES', 'ECS_PENLTY'];
          if (
            ecsCategory.includes(el.category.toUpperCase()) &&
            el.type == 'DEBIT' &&
            !isAlreadyDate.includes(el.dateTime)
          ) {
            const closingBalance = el.balanceAfterTransaction ?? 0.0;
            if (closingBalance >= 1500) userScore += afterEcsClosingBalace;
            else {
              const transactionLimitDate = ecsTransactionDate;
              isAlreadyDate.push(ecsTransactionDate.toJSON());
              let isPositiveFound = false;
              for (let i = 1; i <= 3; i++) {
                try {
                  if (isPositiveFound) continue;
                  const data = this.check3DateTransactionAfterEcs(
                    transactionData,
                    transactionLimitDate,
                  );
                  if (data.length === 0) continue;
                  data.reverse();
                  const dayEndTransaction = data[0];
                  isAlreadyDate.push(dayEndTransaction.dateTime);
                  const balanceEndDay =
                    dayEndTransaction?.balanceAfterTransaction;
                  const ifEcsFound = data.find((el) =>
                    ecsCategory.includes(el.category),
                  );
                  if (balanceEndDay < 1500 && ifEcsFound)
                    userScore = userScore - minusPerEcs;
                  else if (balanceEndDay < 1500)
                    userScore = userScore - minusPerDueAmount;
                  else {
                    isPositiveFound = true;
                    userScore = userScore + plusPerOverAmount;
                  }
                  transactionLimitDate.setDate(
                    transactionLimitDate.getDate() + 1,
                  );
                } catch (error) {}
              }
            }
          }
        } catch (error) {}
      });
      userScore = userScore > 0 ? userScore : 0;
      userScore = userScore > 900 ? totalScore : userScore;
      return userScore > 650 ? true : false;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private check3DateTransactionAfterEcs(trnsactionData, dateCompare) {
    return trnsactionData.filter((el) => {
      const tranDate = this.typeService.dateTimeToDate(
        el.dateTime,
        'DD/MM/YYYY HHMMSS A',
      );
      return tranDate.getTime() === dateCompare.getTime();
    });
  }

  //check net banking emi verification
  private async checkNetBankEmiData(
    userId: string,
    netBankingSummaryData: any,
  ) {
    try {
      //get salary details

      const salaryDetails: any[] =
        netBankingSummaryData.summary.salary.monthlyDetails;
      //get admin verified date
      const salaryDate = netBankingSummaryData.bankingData.salaryDate;
      //get  current  month salary status
      const needCurrentMonth = this.isNeedSalaryForThisMonth(salaryDate);

      let index = needCurrentMonth ? 0 : 1;
      const limit = needCurrentMonth ? 2 : 3;

      // one chance to skip old salary
      let canInclude = true;
      for (index; index <= limit; index++) {
        try {
          let salaryFound = this.checkSalaryByMonth(index, salaryDetails);

          // Salary not found
          if (!salaryFound) {
            if (index > 1 && canInclude) {
              salaryFound = this.checkSalaryByMonth(index + 1, salaryDetails);
              canInclude = false;
              if (!salaryFound) return { status: false, enum: 'LATEST_SALARY' };
            } else return { status: false, enum: 'LATEST_SALARY' };
          }
        } catch (error) {
          return { status: false, enum: 'SALARY_INTERNAL_ERROR' };
        }
      }

      const narrationPrediction = await this.isLegitSalaryNarration(
        userId,
        netBankingSummaryData.transactionJson,
      );
      if (!narrationPrediction)
        return { status: false, enum: 'SALARY_NARRATION' };
      return { status: true };
    } catch (error) {
      return { status: false, enum: 'EMI_INTERNAL_ERROR' };
    }
  }

  private checkSalaryByMonth(index: number, salaryDetails: any) {
    try {
      const today = new Date();
      today.setMonth(today.getMonth() - index);
      let month = kMonths[today.getMonth()];
      month = month.substring(0, 3);
      const year = today.getFullYear();
      const targetString = `${month} ${year}`;
      const salaryFound = salaryDetails.find(
        (element) => element.monthYear == targetString && element.value !== -1,
      );
      if (salaryFound) return true;
      return false;
    } catch (error) {
      return false;
    }
  }

  distance(addressLat, addressLong, dbLat, dbLon, unit, pincode) {
    const radlat1 = (Math.PI * addressLat) / 180;
    const radlat2 = (Math.PI * dbLat) / 180;
    const theta = addressLong - dbLon;
    const radtheta = (Math.PI * theta) / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
      dist = dist * 1.609344;
    }
    if (unit == 'N') {
      dist = dist * 0.8684;
    }
    return { dist, pincode, lat: dbLat, long: dbLon };
  }

  //last loand disbusment date of specefic user
  private async lastLoanDisbusmentDate(userId: string) {
    try {
      const attributes = ['id', 'loan_disbursement_date'];
      const options = {
        where: { userId, loanStatus: 'Complete' },
        order: [['id', 'DESC']],
      };
      const result: any = await this.loanRepo.getRowWhereData(
        attributes,
        options,
      );
      if (result) return result;
      return false;
    } catch (error) {
      return false;
    }
  }

  private isNeedSalaryForThisMonth(salaryDate, skip = false) {
    if (!salaryDate) return false;
    const today = new Date();
    const thisDate = today.getDate();
    if (salaryDate <= thisDate) return true;
    const futureDate = new Date();
    futureDate.setDate(salaryDate);
    const futureMonth = futureDate.getMonth();
    const currentMonth = today.getMonth();
    if (futureMonth != currentMonth) {
      if (salaryDate >= 28 && salaryDate <= 31 && !skip) {
        const predictedDate = salaryDate - 1;
        return this.isNeedSalaryForThisMonth(predictedDate, true);
      } else return true;
    }
    return false;
  }

  private async isLegitSalaryNarration(userId: string, transactionData) {
    try {
      //get last loan disbusment date
      const lastEMILoanDisbusmentDate: any = await this.lastLoanDisbusmentDate(
        userId,
      );
      //convert disbusment to global date
      if (!lastEMILoanDisbusmentDate) return true;
      const disDate = this.typeService.getGlobalDate(
        new Date(lastEMILoanDisbusmentDate.loan_disbursement_date),
      );
      //sort the transaction data by date
      transactionData.sort(
        (b, a) =>
          this.typeService.dateTimeToDate(a.dateTime, 'DD/MM/YYYY').getTime() -
          this.typeService.dateTimeToDate(b.dateTime, 'DD/MM/YYYY').getTime(),
      );

      transactionData = transactionData.filter(
        (el) =>
          el.category.toLowerCase() == 'salary' &&
          el.type.toLowerCase() == 'credit',
      );
      if (lastEMILoanDisbusmentDate.new) {
        let matchInternal = 0;
        for (let i = 0; i < transactionData.length; i++) {
          const oldSalary = transactionData[i];
          const oldDes = oldSalary.description;
          for (let j = i + 1; j <= i + 1; j++) {
            const newSalary = transactionData[j];
            const newDes = newSalary.description;
            const probability = this.validation.getTextProbability(
              newDes,
              oldDes,
              kAllSalaryExceptions,
            );
            if (probability >= 50) matchInternal++;
          }
        }
        const salaryNarratinPercatange =
          (matchInternal / (transactionData.length - 1)) * 100;
        return salaryNarratinPercatange > 50 ? true : false;
      } else {
        const newSalaryList = transactionData
          .filter(
            (el) =>
              this.typeService
                .dateTimeToDate(el.dateTime, 'DD/MM/YYYY')
                .getTime() > disDate.getTime(),
          )
          .slice(0, 1);
        const oldSalaryList = transactionData
          .filter(
            (el) =>
              this.typeService
                .dateTimeToDate(el.dateTime, 'DD/MM/YYYY')
                .getTime() < disDate.getTime(),
          )
          .slice(0, 2);

        const newSalaryData = newSalaryList[0] ?? {};
        const newDesc = newSalaryData.description;

        for (let index = 0; index < oldSalaryList.length; index++) {
          try {
            const data = oldSalaryList[index];
            const description = data.description;
            const probability = this.validation.getTextProbability(
              newDesc,
              description,
              kAllSalaryExceptions,
            );
            if (probability >= 50) return true;
          } catch (error) {}
        }
        return false;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return false;
    }
  }

  //hit third party api to get transction data from the banking pro
  async getTransctionDataByLoanId(loanId) {
    try {
      const loanData = await this.commonService.getTansactionQueryParams(
        loanId,
        false,
        true,
      );
      if (loanData == k500Error || loanData?.message) return k500Error;
      const logsAttr = ['newData'];
      const logsOptions = {
        where: { loanId, type: 'Verification', subType: 'Salary Date' },
        order: [['id', 'DESC']],
      };
      const logsData = await this.changeLogsRepo.getRowWhereData(
        logsAttr,
        logsOptions,
      );

      if (logsData && logsData != k500Error)
        loanData.bankingData.salaryDate = logsData.newData;

      const url = GET_COMPARE_ACCOUNT + loanData.url;
      const header = kBankingProHeaders;
      const response = await this.api.requestGet(url, header);

      if (!response || response == k500Error) return {};
      else if (!response.valid) return {};
      return { ...response, bankingData: loanData?.bankingData ?? {} };
    } catch (error) {
      return {};
    }
  }

  async predictLoanApprovalStatusFromPY(loanId, bankingTransactionsData) {
    try {
      // Table joins
      // Banking table join
      const bankingInclude: SequelOptions = { model: BankingEntity };
      bankingInclude.attributes = ['bank', 'netBankingScore', 'salary'];
      // Employment table join
      const empInclude: SequelOptions = { model: employmentDetails };
      empInclude.attributes = ['companyName'];
      // KYC table join
      const kycInclude: SequelOptions = { model: KYCEntity };
      kycInclude.attributes = ['aadhaarResponse', 'aadhaarDOB'];
      // User table join
      const userInclude: SequelOptions = { model: registeredUsers };
      userInclude.attributes = ['gender', 'loanStatus', 'typeOfDevice'];
      userInclude.include = [empInclude, kycInclude];
      const include = [bankingInclude, userInclude];
      let attributes: any = [
        'completedLoan',
        'id',
        'interestRate',
        'netApprovedAmount',
        'netbankingGrade',
        'netScore',
        'userId',
        'appType',
      ];
      let options: any = { include, where: { id: loanId } };

      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      // Cibil data
      const cibilAttr = [
        'cibilScore',
        'inquiryPast30Days',
        'overdueAccounts',
        'overdueBalance',
        'PLAccounts',
        'plScore',
        'responsedata',
      ];
      const cibilOptions = {
        order: [['id', 'DESC']],
        where: { userId: loanData.userId },
      };
      const cibilData = await this.repoManager.getRowWhereData(
        CibilScoreEntity,
        cibilAttr,
        cibilOptions,
      );
      if (cibilData == k500Error) return kInternalError;

      // Get total overdue days
      attributes = [
        [Sequelize.fn('COUNT', Sequelize.col('penalty_days')), 'overdue_days'],
      ];
      options = { where: { payment_due_status: '1', userId: loanData.userId } };
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      if (emiList == k500Error) return kInternalError;
      const delay_days_previous_loans = +emiList[0].overdue_days ?? 0;

      // Prepare data
      const bankingData = loanData.bankingData ?? {};
      const netScoreData = JSON.parse(bankingData.netBankingScore);
      const userData = loanData.registeredUsers ?? {};
      const empData = userData.employmentData ?? {};
      const kycData = userData.kycData ?? {};
      const loanAmount = +loanData.netApprovedAmount;
      const salary = bankingData.salary ?? 0;

      // State details
      let state = '';
      try {
        let aadhaarResponse = kycData.aadhaarResponse;
        if (aadhaarResponse) {
          aadhaarResponse = JSON.parse(aadhaarResponse);
          if (aadhaarResponse.address?.state)
            state = aadhaarResponse.address?.state?.toLowerCase();
          else if (aadhaarResponse?.stateName)
            state = aadhaarResponse.stateName?.toLowerCase();
        }
      } catch (error) {}

      // #1 -> Default parameters for non cibil data model
      const body: any = {
        bank_name: bankingData.bank?.toLowerCase() ?? '',
        completed_loan: loanData.completedLoan ?? 0,
        completedLoan: loanData.completedLoan ?? 0,
        net_banking_grade: loanData.netbankingGrade?.toLowerCase() ?? 'a',
        gender: userData.gender?.toLowerCase() ?? '',
        mobile_device: +(userData.typeOfDevice ?? '0'),
        age: this.typeService.dateDifference(
          new Date(),
          new Date(kycData.aadhaarDOB),
          'Years',
        ),
        total_number_of_bounce_count: netScoreData?.bounceCount ?? 0,
        percentage_loan_amount_of_salary: Math.floor(
          (loanAmount * 100) / salary,
        ),
        average_balance:
          bankingTransactionsData.summary?.monthlyAvgBal?.average ?? 0,
        percentage_of_use: Math.floor(
          (bankingTransactionsData.netBankingScore.outFlowAmount /
            bankingTransactionsData.netBankingScore.inFlowAmount) *
            100,
        ),
        state,
        company_name: empData?.companyName?.toLowerCase(),
        closing_balance:
          bankingTransactionsData.netBankingScore.closingBalance ?? 0,
        opening_balance:
          bankingTransactionsData.netBankingScore.openingBalance ?? 0,
        salary,
        ecs: 0,
        previous_loan_ecs: 0,
        delay_days_previous_loans,
        user: loanData.completedLoan > 0 ? 'new' : 'old',
      };

      // Current loan ECS
      const currentECSCount: any = await this.calculation.getECSCounts(
        bankingTransactionsData,
        loanData.id,
        loanData.userId,
      );
      if (currentECSCount?.message) return currentECSCount;
      body.ecs = currentECSCount;

      // Previous loan ECS
      if (loanData.completedLoan != 0) {
        attributes = ['id'];
        options = {
          order: [['id', 'DESC']],
          where: { id: { [Op.lte]: loanData.id }, userId: loanData.userId },
        };
        const previousECSCount: any = await this.calculation.getECSCounts(
          bankingTransactionsData,
          loanData.id,
          loanData.userId,
        );
        if (previousECSCount?.message) return previousECSCount;
        body.previous_loan_ecs = previousECSCount;
      }

      const cibilDataExist =
        cibilData != null && cibilData != undefined && cibilData.responsedata
          ? true
          : false;
      // #2 -> Cibil parameters for Cibil data model
      if (cibilDataExist) {
        (body.cibil_score = cibilData?.cibilScore),
          (body.pl_score = cibilData?.plScore),
          (body.no_of_inquiries_past_30_days = cibilData?.inquiryPast30Days),
          (body.overdue_amount = cibilData?.overdueBalance),
          (body.overdue_accounts = cibilData?.overdueAccounts),
          (body.pl_accounts = cibilData?.PLAccounts),
          (body.one_year_delay =
            (cibilData?.responsedata?.consumerCreditData ?? [{}])[0]
              ?.accounts ?? []);
      }

      // ML prediction api call
      const appType = loanData?.appType;
      const baseUrl = this.commonService.getPythonBaseUrl(appType);
      const url = baseUrl + 'v2/prediction/finalApprovalWithCibil';
      const url1 = baseUrl + 'v2/prediction/finalApproval';
      let response = await this.api.requestPost(
        cibilDataExist ? url : url1,
        body,
      );
      if (response == k500Error) return { ...kInternalError, feedData: body };
      if (!response.valid) return { ...kInternalError, feedData: body };
      if (!response.data) return { ...kInternalError, feedData: body };

      return { feedData: body, ...response.data };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async predictRepaymentStatusFromPY(loanId, bankingTransactionsData) {
    try {
      // Table joins
      // Banking table join
      const bankingInclude: SequelOptions = { model: BankingEntity };
      bankingInclude.attributes = ['bank', 'netBankingScore', 'salary'];
      // Employment table join
      const empInclude: SequelOptions = { model: employmentDetails };
      empInclude.attributes = ['companyName'];
      // KYC table join
      const kycInclude: SequelOptions = { model: KYCEntity };
      kycInclude.attributes = ['aadhaarResponse', 'aadhaarDOB'];
      // User table join
      const userInclude: SequelOptions = { model: registeredUsers };
      userInclude.attributes = ['gender', 'loanStatus', 'typeOfDevice'];
      userInclude.include = [empInclude, kycInclude];
      const include = [bankingInclude, userInclude];
      const attributes = [
        'completedLoan',
        'interestRate',
        'netApprovedAmount',
        'netbankingGrade',
        'netScore',
        'appType',
      ];
      const options = { include, where: { id: loanId } };

      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      const bankingData = loanData.bankingData ?? {};
      const netScoreData = JSON.parse(bankingData.netBankingScore);
      const userData = loanData.registeredUsers ?? {};
      const empData = userData.employmentData ?? {};
      const kycData = userData.kycData ?? {};
      let previousStatus = '1stloan';
      if (userData.loanStatus == 1) previousStatus = 'ontime';
      else if (userData.loanStatus == 2) previousStatus = 'delay';
      else if (userData.loanStatus == 3) previousStatus = 'default';
      const loanAmount = +loanData.netApprovedAmount;
      const salary = bankingData.salary ?? 0;

      let state = '';
      try {
        let aadhaarResponse = kycData.aadhaarResponse;
        if (aadhaarResponse) {
          aadhaarResponse = JSON.parse(aadhaarResponse);
          if (aadhaarResponse.address?.state)
            state = aadhaarResponse.address?.state?.toLowerCase();
          else if (aadhaarResponse?.stateName)
            state = aadhaarResponse.stateName?.toLowerCase();
        }
      } catch (error) {}

      const body = {
        bank_name: bankingData.bank?.toLowerCase() ?? '',
        net_banking_grade: loanData.netbankingGrade?.toLowerCase() ?? 'a',
        previous_loan_status: previousStatus,
        gender: userData.gender?.toLowerCase() ?? '',
        mobile_device: +(userData.typeOfDevice ?? '0'),
        age: this.typeService.dateDifference(
          new Date(),
          new Date(kycData.aadhaarDOB),
          'Years',
        ),
        total_number_of_bounce_count: netScoreData?.bounceCount ?? 0,
        percentage_loan_amount_of_salary: Math.floor(
          (loanAmount * 100) / salary,
        ),
        average_balance:
          bankingTransactionsData.summary?.monthlyAvgBal?.average ?? 0,
        percentage_of_use: Math.floor(
          (bankingTransactionsData.netBankingScore.outFlowAmount /
            bankingTransactionsData.netBankingScore.inFlowAmount) *
            100,
        ),
        state,
        company_name: empData?.companyName?.toLowerCase(),
        closing_balance:
          bankingTransactionsData.netBankingScore.closingBalance ?? 0,
        opening_balance:
          bankingTransactionsData.netBankingScore.openingBalance ?? 0,
      };

      const appType = loanData?.appType;
      const baseUrl = this.commonService.getPythonBaseUrl(appType);
      const url = baseUrl + 'v2/prediction/repaymentStatus';
      const response = await this.api.requestPost(url, body);
      if (response == k500Error) return { ...kInternalError, feedData: body };
      if (!response.valid) return { ...kInternalError, feedData: body };
      if (!response.data) return { ...kInternalError, feedData: body };

      return { feedData: body, ...response.data };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
