// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCompleted,
  kFullPay,
  kInitiated,
  kLoanClosureStr,
  kLoanSettled,
} from 'src/constants/strings';
import { EmiEntity } from 'src/entities/emi.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { TypeService } from 'src/utils/type.service';
import { EmiSharedService } from './emi.service';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { Op } from 'sequelize';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import {
  CIBIL_MIN_OVERDUE,
  GLOBAL_CHARGES,
  GLOBAL_RANGES,
  INQUIRY_PAST_30_DAYS,
  MIN_CIBIL_SCORE,
  MIN_PL_SCORE,
} from 'src/constants/globals';
import { IpCheckService } from './ipcheck.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { registeredUsers } from 'src/entities/user.entity';
import { SharedTransactionService } from './transaction.service';

@Injectable()
export class CalculationSharedService {
  constructor(
    private readonly emiRepo: EMIRepository,
    private readonly transRepo: TransactionRepository,
    private readonly typeService: TypeService,
    private readonly masterRepo: MasterRepository,
    private readonly loanRepo: LoanRepository,
    private readonly sharedEmi: EmiSharedService,
    private readonly changeLogRepo: ChangeLogsRepository,
    private readonly ipCheckService: IpCheckService,
    private readonly sharedTransService: SharedTransactionService,
    // Repository
    private readonly repoManager: RepositoryManager,
    private readonly userActivityRepo: UserActivityRepository,
  ) {}

  async acceptAmount(reqData) {
    try {
      const loanId = reqData.loanId;
      const amount = reqData.amount;
      const adminId = reqData?.adminId;
      /* Taking default value as true for not to affecting in between users 
      when we go live with dynamic insurance flow */

      // not chanage any one, this for insurance
      let insuranceOptValue: boolean = reqData.isInsurancePolicy ?? false;
      // Get master data
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = [
        'completedLoan',
        'loanAmount',
        'loanStatus',
        'manualVerification',
        'approvedLoanAmount',
        'emiSelection',
        'insuranceOptValue',
      ];
      const include = [loanInclude];
      const attributes = ['id', 'status', 'userId', 'loanAcceptStatus'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return masterData;
      if (!masterData) return k422ErrorMessage(kNoDataFound);

      // Status validation
      const loanData = masterData.loanData ?? {};
      const statusData = masterData.status ?? {};
      const userId = masterData?.userId;
      if (statusData.aadhaar != 1 && statusData.aadhaar != 3)
        return k422ErrorMessage('Aadhaar verification is pending');
      if (statusData.bank != 1 && statusData.bank != 3)
        return k422ErrorMessage('Income verification is pending');
      if (statusData.email != 1 && !adminId)
        return k422ErrorMessage('Please verify your email to proceed further');
      if (
        statusData.residence != 1 &&
        statusData.residence != 3 &&
        statusData.residence != 7 &&
        statusData.residence != 8
      ) {
        return k422ErrorMessage('Residence verification is pending');
      }
      if (loanData.loanStatus != 'InProcess' && !adminId)
        return k422ErrorMessage('Loan amount can not accepted');
      if (masterData.loanAcceptStatus == 1 && adminId)
        return k422ErrorMessage('Loan amount can not accepted');
      const maxAmount = +loanData.loanAmount;
      if (amount > maxAmount) {
        return k422ErrorMessage(
          'Maximum eligible amount is ' + loanData.loanAmount,
        );
      }

      // Update loan data
      const updatedData: any = {
        netApprovedAmount: amount,
        loanAcceptStatus: 1,
      };
      // Update only if user selects the value
      if (!adminId) updatedData.insuranceOptValue = insuranceOptValue;
      // Else take the one which user had selected earlier
      else {
        if (loanData?.insuranceOptValue === null)
          loanData.insuranceOptValue = false;
        insuranceOptValue = loanData?.insuranceOptValue ?? insuranceOptValue;
      }

      if (adminId) {
        if (+(loanData?.approvedLoanAmount ?? 0) == amount)
          return { needUserInfo: true, userId };
        const createData = {
          userId,
          loanId,
          type: 'Verification',
          subType: 'Approval Amount',
          oldData: loanData?.approvedLoanAmount ?? maxAmount,
          newData: amount,
          adminId,
          ip: reqData.ip,
        };
        const result = await this.changeLogRepo.create(createData);
        if (!result || result === k500Error) return kInternalError;
        updatedData.loanStatus = 'InProcess';
        updatedData.approvedLoanAmount = amount;
      }
      const update = { loanAcceptStatus: 1 };
      const masterUpdate = await this.masterRepo.updateRowData(
        update,
        masterData.id,
      );
      if (masterUpdate === k500Error) return kInternalError;

      const updateResult = await this.loanRepo.updateRowData(
        updatedData,
        loanId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Refresh calculation
      const calculation = await this.sharedEmi.refreshCalculation(
        loanId,
        null,
        { insuranceOptValue },
      );
      if (calculation.message) {
        console.log({ calculation });
        return calculation;
      }

      const ipCheck: any = await this.ipCheckService.ipCheck(userId, loanId);
      if (ipCheck == true) return { ipDecline: true, needUserInfo: true };

      return { needUserInfo: true, userId };
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  // CONFLUENCE -> https://lenditt.atlassian.net/wiki/spaces/LENDITT/pages/301727745/Fullpay+logic
  async getFullPaymentData(reqData) {
    try {
      const loanData: any = await this.getLoanDataForFullPayAmount(reqData);
      const loanId = reqData.loanId;
      let forClose = false;
      let pastEmiCount = 0;
      if (loanData?.message) return loanData;
      const waiverData = await this.getWaiverAmountPI(loanData);
      const targetDate = reqData?.targetDate;

      // Calculation preparation
      const emiList = loanData.emiData ?? [];
      emiList.sort((a, b) => a.id - b.id);
      let today = this.typeService.getGlobalDate(new Date());
      if (targetDate)
        try {
          today = this.typeService.getGlobalDate(new Date(targetDate));
        } catch (error) {}
      const todayTime = today.getTime();
      const data = {
        remainingInterest: 0,
        remainingPrincipal: 0,
        remainingPenalty: 0,
        totalAmount: 0,
        overdueInterestAmount: 0,
        overduePrincipalAmount: 0,
        forClosureAmount: 0,
        sgstForClosureCharge: 0,
        cgstForClosureCharge: 0,
        regInterestAmount: 0,
        bounceCharge: 0,
        sgstBounceCharge: 0,
        cgstBounceCharge: 0,
        penalty_days: 0,
        legalCharges: 0,
        sgstLegalCharges: 0,
        cgstLegalCharges: 0,
        cgstPenalCharges: 0,
        sgstPenalCharges: 0,
        forClosureDays: 0,
        penalCharge: 0,
        forClosureAmountGST: 0,
        loanId,
        MODIFICATION_CALCULATION:
          loanData?.penaltyCharges?.MODIFICATION_CALCULATION,
        isRequestedForLink: reqData.isRequestedForLink,
        fullPIPData: {},
      };
      data.isRequestedForLink = reqData?.isRequestedForLink ?? false;
      const interestRate = +loanData.interestRate;
      let needFullAmount = false;

      // For lower interest rate with more than 3 days we need to charge user full loan amount instead of per day
      if (interestRate <= GLOBAL_RANGES.MAX_TOTAL_FULL_PAY_INTEREST_RATE) {
        const disbursedDate = loanData.loan_disbursement_date;
        const diffInDays =
          this.typeService.dateDifference(disbursedDate, today) + 1;
        if (diffInDays > 3 && !loanData?.chargesDetails?.forClosureCharges) {
          needFullAmount = true;
        }
      }

      const disbursedDate = loanData.loan_disbursement_date;
      const diffInDays =
        this.typeService.dateDifference(disbursedDate, today) + 1;
      if (diffInDays > 3) forClose = true;
      let isEligibleForForclosureCharge =
        forClose && loanData?.chargesDetails?.forClosureCharges;

      // Calculation begins over iteration of EMIs
      for (let index = 0; index < emiList.length; index++) {
        try {
          const emiData = emiList[index];
          const isPaid = (emiData.payment_status ?? '0') == '1';
          if (isPaid) continue;

          // Prepare data
          const partOfEMI = emiData.partOfemi;
          const isFirstEMI = partOfEMI == 'FIRST';
          let emiStartDate: Date;
          if (isFirstEMI)
            emiStartDate = this.typeService.getGlobalDate(
              new Date(loanData.loan_disbursement_date),
            );
          else {
            emiStartDate = this.typeService.getGlobalDate(
              new Date(emiList[index - 1].emi_date),
            );
            emiStartDate.setDate(emiStartDate.getDate() + 1);
          }
          const emiStartTime = emiStartDate.getTime();
          const emiId = emiData.id;
          const emiDate = new Date(emiData.emi_date);
          const emiTime = emiDate.getTime();
          const principalAmount = emiData.principalCovered ?? 0;
          const interestAmount = emiData.interestCalculate ?? 0;
          if (loanData?.penaltyCharges?.MODIFICATION_CALCULATION) {
            data.bounceCharge += this.typeService.manageAmount(
              emiData?.bounceCharge +
                emiData?.gstOnBounceCharge -
                emiData?.paidBounceCharge ?? 0,
            );
          }
          data.legalCharges =
            data.legalCharges +
            this.typeService.manageAmount(
              emiData?.legalCharge +
                emiData?.legalChargeGST -
                emiData?.paidLegalCharge ?? 0,
            );
          const penaltyAmount = this.typeService.manageAmount(
            emiData.penalty ?? 0,
          );
          const fullPayData = {
            fullPayPrincipal: 0,
            fullPayPenalty: 0,
            fullPayInterest: 0,
            fullPayBounce: 0,
            fullPayPenal: 0,
            fullPayRegInterest: 0,
            fullPayLegalCharge: 0,
          };
          data.fullPIPData[`${emiId}`] = fullPayData;
          let transList = loanData.transactionData ?? [];
          transList = transList.filter((el) => el.emiId == emiId);
          let paidPrincipal = 0;
          let paidInterest = 0;
          let paidBounceCharge = 0;
          let paidLegalCharge = 0;
          let paidPenalCharge = 0;
          let paidRegInterest = 0;
          /// update waiver amount in
          const findWaiverData = waiverData.find((f) => f.emiId === emiId);
          if (findWaiverData) {
            try {
              paidPrincipal += findWaiverData?.waiverPrincipal ?? 0;
              paidInterest += findWaiverData?.waiverInterest ?? 0;
            } catch (error) {}
          }

          /// update paid amount in transaction data
          transList.forEach((el) => {
            try {
              paidPrincipal += el.principalAmount ?? 0;
              paidInterest += el.interestAmount ?? 0;
              paidBounceCharge +=
                el.bounceCharge +
                  el.sgstOnBounceCharge +
                  el.cgstOnBounceCharge ?? 0;
              paidLegalCharge +=
                el.legalCharge + el.sgstOnLegalCharge + el.cgstOnLegalCharge ??
                0;
              paidPenalCharge +=
                el.penalCharge + el.sgstOnPenalCharge + el.cgstOnPenalCharge ??
                0;
              paidRegInterest += el.regInterestAmount ?? 0;
            } catch (error) {}
          });
          paidPrincipal = parseFloat(paidPrincipal.toFixed(2));
          paidInterest = parseFloat(paidInterest.toFixed(2));

          // Future EMI
          const isFutureEMI = todayTime < emiTime && todayTime < emiStartTime;
          if (isFutureEMI) {
            data.remainingPrincipal += principalAmount;
            data.fullPIPData[`${emiId}`].fullPayPrincipal =
              this.typeService.manageAmount(principalAmount);
            data.fullPIPData[`${emiId}`].fullPayRegInterest =
              this.typeService.manageAmount(
                emiData?.regInterestAmount - paidRegInterest ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayBounce =
              this.typeService.manageAmount(
                emiData?.bounceCharge +
                  emiData?.gstOnBounceCharge -
                  paidBounceCharge ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayPenal =
              this.typeService.manageAmount(
                emiData?.dpdAmount +
                  emiData?.penaltyChargesGST -
                  paidPenalCharge ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayLegalCharge =
              this.typeService.manageAmount(
                emiData?.legalCharge +
                  emiData?.legalChargeGST -
                  paidLegalCharge ?? 0,
              );
            // For lower interest rate we need to charge user full loan amount instead of per day
            if (needFullAmount) {
              data.remainingInterest += interestAmount;
              data.fullPIPData[`${emiId}`].fullPayInterest =
                this.typeService.manageAmount(interestAmount);
            }

            // EMI wise bifurcation of foreclosure charges with GST
            if (isEligibleForForclosureCharge) {
              const remainingEMIPrincipal = principalAmount - paidPrincipal;
              const forClosureAmount =
                (remainingEMIPrincipal * GLOBAL_CHARGES.FORECLOSURE_PERC) / 100;
              data.fullPIPData[`${emiId}`].forClosureAmount =
                this.typeService.manageAmount(forClosureAmount);
              data.fullPIPData[`${emiId}`].sgstForClosureCharge =
                (forClosureAmount * 9) / 100;
              data.fullPIPData[`${emiId}`].cgstForClosureCharge =
                (forClosureAmount * 9) / 100;
            }
          }

          // Current EMI
          const isCurrentEMI =
            todayTime <= emiTime && todayTime >= emiStartTime;
          if (isCurrentEMI) {
            if (index == emiList.length - 1 && todayTime == emiTime) {
              isEligibleForForclosureCharge = false;
            }
            data.remainingPrincipal += principalAmount - paidPrincipal;
            data.fullPIPData[`${emiId}`].fullPayPrincipal =
              this.typeService.manageAmount(principalAmount - paidPrincipal);

            data.fullPIPData[`${emiId}`].fullPayRegInterest =
              this.typeService.manageAmount(
                emiData?.regInterestAmount - paidRegInterest ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayBounce =
              this.typeService.manageAmount(
                emiData?.bounceCharge +
                  emiData?.gstOnBounceCharge -
                  paidBounceCharge ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayPenal =
              this.typeService.manageAmount(
                emiData?.dpdAmount +
                  emiData?.penaltyChargesGST -
                  paidPenalCharge ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayLegalCharge =
              this.typeService.manageAmount(
                emiData?.legalCharge +
                  emiData?.legalChargeGST -
                  paidLegalCharge ?? 0,
              );
            const diffInDays =
              this.typeService.dateDifference(today, emiStartDate) + 1;
            let remainingPrincipal = this.getRemainingPrincipalAmount(
              emiList,
              index,
            );
            remainingPrincipal -= paidPrincipal;
            let interestCalculated =
              (remainingPrincipal * interestRate * diffInDays) / 100;
            // For lower interest rate we need to charge user full loan amount instead of per day
            if (needFullAmount) interestCalculated = interestAmount;
            interestCalculated -= paidInterest;
            if (interestCalculated < 0) interestCalculated = 0;
            data.remainingInterest += interestCalculated;
            data.fullPIPData[`${emiId}`].fullPayInterest =
              this.typeService.manageAmount(interestCalculated);
            data.forClosureDays = diffInDays;
            // EMI wise bifurcation of foreclosure charges with GST
            if (isEligibleForForclosureCharge) {
              const remainingEMIPrincipal = principalAmount - paidPrincipal;
              const forClosureAmount =
                (remainingEMIPrincipal * GLOBAL_CHARGES.FORECLOSURE_PERC) / 100;
              data.fullPIPData[`${emiId}`].forClosureAmount =
                this.typeService.manageAmount(forClosureAmount);
              data.fullPIPData[`${emiId}`].sgstForClosureCharge =
                (forClosureAmount * 9) / 100;
              data.fullPIPData[`${emiId}`].cgstForClosureCharge =
                (forClosureAmount * 9) / 100;
            }
          }

          // Past EMI
          const isPastEMI = todayTime > emiTime;
          if (isPastEMI) {
            pastEmiCount++;
            data.overduePrincipalAmount += principalAmount - paidPrincipal;
            data.fullPIPData[`${emiId}`].fullPayPrincipal =
              this.typeService.manageAmount(principalAmount - paidPrincipal);
            data.overdueInterestAmount += interestAmount - paidInterest;
            data.regInterestAmount += this.typeService.manageAmount(
              emiData?.regInterestAmount - emiData?.paidRegInterestAmount ?? 0,
            );
            data.fullPIPData[`${emiId}`].fullPayInterest =
              this.typeService.manageAmount(interestAmount - paidInterest);
            data.penalCharge += this.typeService.manageAmount(
              emiData?.dpdAmount +
                emiData?.penaltyChargesGST -
                emiData?.paidPenalCharge ?? 0,
            );
            data.remainingPenalty += penaltyAmount ?? 0;
            data.penalty_days += emiData?.penalty_days ?? 0;
            data.fullPIPData[`${emiId}`].fullPayPenalty =
              this.typeService.manageAmount(penaltyAmount);
            data.fullPIPData[`${emiId}`].fullPayRegInterest =
              this.typeService.manageAmount(
                emiData?.regInterestAmount - paidRegInterest ?? 0,
              );
            data.fullPIPData[`${emiId}`].fullPayBounce =
              penaltyAmount > 0
                ? 0
                : this.typeService.manageAmount(
                    emiData?.bounceCharge +
                      emiData?.gstOnBounceCharge -
                      paidBounceCharge ?? 0,
                  );
            data.fullPIPData[`${emiId}`].fullPayPenal =
              this.typeService.manageAmount(
                emiData?.dpdAmount +
                  emiData?.penaltyChargesGST -
                  paidPenalCharge ?? 0,
              );
            data.cgstPenalCharges += (emiData?.penaltyChargesGST ?? 0) / 2;
            data.sgstPenalCharges += (emiData?.penaltyChargesGST ?? 0) / 2;
            data.fullPIPData[`${emiId}`].fullPayLegalCharge =
              this.typeService.manageAmount(
                emiData?.legalCharge +
                  emiData?.legalChargeGST -
                  paidLegalCharge ?? 0,
              );
          }
        } catch (error) {}
      }
      if (isEligibleForForclosureCharge) {
        data.forClosureAmount = this.typeService.manageAmount(
          (data.remainingPrincipal * GLOBAL_CHARGES.FORECLOSURE_PERC) / 100 ||
            0,
        );
        data.sgstForClosureCharge = this.typeService.manageAmount(
          (data.forClosureAmount * 9) / 100 ?? 0,
        );
        data.cgstForClosureCharge = this.typeService.manageAmount(
          (data.forClosureAmount * 9) / 100 ?? 0,
        );
        data.forClosureAmountGST =
          data?.sgstForClosureCharge + data?.cgstForClosureCharge ?? 0;
      }

      if (loanData?.penaltyCharges?.MODIFICATION_CALCULATION) {
        let deductedBounceCharge;
        deductedBounceCharge = data?.bounceCharge ?? 0;
        let bounceChargeFinalGST = this.typeService.manageAmount(
          data?.bounceCharge - data?.bounceCharge / 1.18 ?? 0,
        );
        data.cgstBounceCharge = this.typeService.manageAmount(
          bounceChargeFinalGST / 2,
        );
        data.sgstBounceCharge = this.typeService.manageAmount(
          bounceChargeFinalGST / 2,
        );
        bounceChargeFinalGST = data.cgstBounceCharge + data.sgstBounceCharge;
        data.bounceCharge = data?.bounceCharge - bounceChargeFinalGST ?? 0;

        data.bounceCharge +=
          deductedBounceCharge -
            (data?.bounceCharge +
              data?.cgstBounceCharge +
              data?.sgstBounceCharge) ?? 0;
      }

      const deductedLegalCharge = data?.legalCharges ?? 0;
      let legalChargesFinalGST =
        data?.legalCharges - data?.legalCharges / 1.18 ?? 0;
      data.cgstLegalCharges = this.typeService.manageAmount(
        legalChargesFinalGST / 2,
      );
      data.sgstLegalCharges = this.typeService.manageAmount(
        legalChargesFinalGST / 2,
      );
      legalChargesFinalGST = data.cgstLegalCharges + data.sgstLegalCharges;
      data.legalCharges = data?.legalCharges - legalChargesFinalGST ?? 0;

      const deductedPenalCharge = data?.penalCharge ?? 0;
      // const remainingPenaltyFinalGST =
      //   data.penalCharge - data?.penalCharge / 1.18 ?? 0;
      data.penalCharge =
        data?.penalCharge - (data.cgstPenalCharges + data.sgstPenalCharges) ??
        0;
      // data.cgstPenalCharges = remainingPenaltyFinalGST / 2;
      // data.sgstPenalCharges = remainingPenaltyFinalGST / 2;

      // data.sgstBounceCharge = parseFloat(data.sgstBounceCharge.toFixed(2));
      // data.cgstBounceCharge = parseFloat(data.cgstBounceCharge.toFixed(2));

      // data.sgstLegalCharges = parseFloat(data.sgstLegalCharges.toFixed(2));
      // data.cgstLegalCharges = parseFloat(data.cgstLegalCharges.toFixed(2));

      // data.cgstPenalCharges = parseFloat(data.cgstPenalCharges.toFixed(2));
      // data.sgstPenalCharges = parseFloat(data.sgstPenalCharges.toFixed(2));

      // Adding the difference

      data.legalCharges +=
        deductedLegalCharge -
          (data?.legalCharges +
            data?.cgstLegalCharges +
            data?.sgstLegalCharges) ?? 0;

      data.penalCharge +=
        deductedPenalCharge -
          (data?.penalCharge +
            data?.cgstPenalCharges +
            data?.sgstPenalCharges) ?? 0;

      if (reqData?.isLoanClosure || reqData?.isLoanSettled) {
        const transList = loanData.transactionData ?? [];
        let transData = transList.sort((a, b) => b.id - a.id)[0];
        data.remainingInterest = transData?.interestAmount;
        data.remainingPrincipal = transData?.principalAmount;
        data.remainingPenalty = 0;
        data.totalAmount = transData?.paidAmount;
        data.overdueInterestAmount = 0;
        data.overduePrincipalAmount = 0;
        data.forClosureAmount = transData?.forClosureAmount;
        data.sgstForClosureCharge = transData?.sgstForClosureCharge;
        data.cgstForClosureCharge = transData?.cgstForClosureCharge;
        data.regInterestAmount = transData?.regInterestAmount;
        data.bounceCharge = transData?.bounceCharge;
        data.sgstBounceCharge = transData?.sgstOnBounceCharge;
        data.cgstBounceCharge = transData?.cgstOnBounceCharge;
        data.penalty_days, (data.legalCharges = transData?.legalCharge);
        data.sgstLegalCharges = transData?.sgstOnLegalCharge;
        data.cgstLegalCharges = transData?.cgstOnLegalCharge;
        data.cgstPenalCharges = transData?.cgstOnPenalCharge;
        data.sgstPenalCharges = transData?.sgstOnPenalCharge;
        data.forClosureDays,
          (data.penalCharge =
            transData?.penalCharge + transData?.penaltyAmount);
        data.forClosureAmountGST =
          transData?.sgstForClosureCharge + transData?.cgstForClosureCharge;
        data.loanId = loanId;
        data.MODIFICATION_CALCULATION =
          loanData?.penaltyCharges?.MODIFICATION_CALCULATION;
        data.isRequestedForLink = reqData.isRequestedForLink;
        data.fullPIPData = {};
        return data;
      }
      // Fine tune data
      return this.fineTineFullPayAmount(data);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getLoanDataForFullPayAmount(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      let transWhere = {};
      const TodayDate = new Date().toJSON();
      const range = this.typeService.getUTCDateRange(TodayDate, TodayDate);
      const dateRange = {
        [Op.gte]: range.fromDate,
        [Op.lte]: range.endDate,
      };
      let subStatus = '';
      if (reqData?.isLoanSettled) subStatus = kLoanSettled;
      else if (reqData?.isLoanClosure) subStatus = kLoanClosureStr;
      if (reqData?.isLoanClosure || reqData?.isLoanSettled)
        transWhere = {
          status: kInitiated,
          createdAt: dateRange,
          source: 'PAYMENT_LINK',
          type: 'FULLPAY',
          settled_type: 'FULLPAY_SETTLED',
          subStatus,
        };
      else transWhere = { status: kCompleted };
      // EMI table join
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'emi_date',
        'interestCalculate',
        'payment_status',
        'partOfemi',
        'penalty',
        'principalCovered',
        'regInterestAmount',
        'bounceCharge',
        'penalty_days',
        'legalCharge',
        'legalChargeGST',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'paidPenalCharge',
        'fullPayRegInterest',
        'fullPayBounce',
        'fullPayPenal',
        'fullPayLegalCharge',
        'paidBounceCharge',
        'paidLegalCharge',
        'paidRegInterestAmount',
      ];
      const transactionInclude: any = { model: TransactionEntity };
      transactionInclude.attributes = [
        'id',
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
        'status',
        'source',
        'type',
        'settled_type',
        'paidAmount',
        'createdAt',
        'forClosureAmount',
        'sgstForClosureCharge',
        'cgstForClosureCharge',
      ];
      transactionInclude.where = transWhere;
      transactionInclude.required = false;
      const include = [emiInclude, transactionInclude];

      const attributes = [
        'id',
        'interestRate',
        'loan_disbursement_date',
        'loanStatus',
        'chargesDetails',
        'penaltyCharges',
      ];
      const options = { include, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);

      if (!loanData) return k422ErrorMessage(kNoDataFound);
      if (loanData == k500Error) return kInternalError;
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

  private getRemainingPrincipalAmount(emiList, targetIndex) {
    let remainingPrincipal = 0;
    for (let index = 0; index < emiList.length; index++) {
      if (index < targetIndex) continue;
      const emiData = emiList[index];
      const isPaid = (emiData.payment_status ?? '0') == '1';
      if (isPaid) continue;

      const principalAmount = emiData.principalCovered ?? 0;
      remainingPrincipal += principalAmount;
    }

    return remainingPrincipal;
  }

  private async fineTineFullPayAmount(data) {
    data.remainingPrincipal = this.typeService.manageAmount(
      data.remainingPrincipal,
    );
    data.remainingInterest = this.typeService.manageAmount(
      data.remainingInterest,
    );

    data.remainingPenalty = this.typeService.manageAmount(
      data.remainingPenalty,
    );
    data.penalCharge = this.typeService.manageAmount(data.penalCharge);
    data.cgstPenalCharges = this.typeService.manageAmount(
      data.cgstPenalCharges,
    );
    data.sgstPenalCharges = this.typeService.manageAmount(
      data.sgstPenalCharges,
    );

    data.forClosureAmount = this.typeService.manageAmount(
      data.forClosureAmount,
    );
    data.cgstForClosureCharge = this.typeService.manageAmount(
      data.cgstForClosureCharge,
    );
    data.sgstForClosureCharge = this.typeService.manageAmount(
      data.sgstForClosureCharge,
    );
    data.regInterestAmount = this.typeService.manageAmount(
      data.regInterestAmount,
    );

    data.bounceCharge = this.typeService.manageAmount(data.bounceCharge);
    data.sgstBounceCharge = this.typeService.manageAmount(
      data.sgstBounceCharge,
    );
    data.cgstBounceCharge = this.typeService.manageAmount(
      data.cgstBounceCharge,
    );

    data.legalCharges = this.typeService.manageAmount(data.legalCharges);
    data.sgstLegalCharges = this.typeService.manageAmount(
      data.sgstLegalCharges,
    );
    data.cgstLegalCharges = this.typeService.manageAmount(
      data.cgstLegalCharges,
    );

    data.forClosureAmountGST = this.typeService.manageAmount(
      data.forClosureAmountGST,
    );

    data.overduePrincipalAmount = this.typeService.manageAmount(
      data.overduePrincipalAmount,
    );
    data.overdueInterestAmount = this.typeService.manageAmount(
      data.overdueInterestAmount,
    );

    Object.keys(data.fullPIPData).forEach((el) => {
      data.fullPIPData[el].fullPayPrincipal = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayPrincipal.toFixed(2),
      );
      data.fullPIPData[el].fullPayInterest = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayInterest.toFixed(2),
      );
      data.fullPIPData[el].fullPayPenalty = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayPenalty.toFixed(2),
      );
      data.fullPIPData[el].fullPayRegInterest = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayRegInterest.toFixed(2),
      );
      data.fullPIPData[el].fullPayBounce = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayBounce.toFixed(2),
      );
      data.fullPIPData[el].fullPayPenal = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayPenal.toFixed(2),
      );
      data.fullPIPData[el].fullPayLegalCharge = this.typeService.manageAmount(
        data.fullPIPData[el].fullPayLegalCharge.toFixed(2),
      );
    });

    data.totalAmount =
      data.remainingPrincipal +
      data.remainingInterest +
      data.remainingPenalty +
      data.overduePrincipalAmount +
      data.overdueInterestAmount +
      data.sgstForClosureCharge +
      data.cgstForClosureCharge +
      data.bounceCharge +
      data.regInterestAmount +
      data.forClosureAmount +
      data.cgstLegalCharges +
      data.sgstLegalCharges +
      data.cgstBounceCharge +
      data.sgstBounceCharge +
      data.cgstPenalCharges +
      data.sgstPenalCharges +
      data.penalCharge +
      data.legalCharges;
    data.totalAmount = this.typeService.manageAmount(data.totalAmount);
    if (data.isRequestedForLink) {
      const TodayDate = new Date().toJSON();
      const range = this.typeService.getUTCDateRange(TodayDate, TodayDate);
      const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const attributes = ['source', 'type', 'paidAmount'];
      const options = {
        where: {
          loanId: data.loanId,
          status: 'INITIALIZED',
          type: 'FULLPAY',
          createdAt: dateRange,
          source: 'PAYMENT_LINK',
        },

        order: [['id', 'DESC']],
      };
      const newloanData = await this.transRepo.getRowWhereData(
        attributes,
        options,
      );
      if (newloanData == k500Error) return kInternalError;
      if (newloanData && newloanData?.paidAmount < data.totalAmount) {
        const calFullPay =
          this.sharedTransService.getCalculationOfFullPayAmount(data, {
            amount: newloanData?.paidAmount,
          });
        data.totalAmount = calFullPay.dueAmount;

        data.remainingPrincipal = calFullPay.principalAmount;
        data.overduePrincipalAmount = 0;

        data.remainingInterest = calFullPay.interestAmount;
        data.overdueInterestAmount = 0;

        data.regInterestAmount = calFullPay.regInterestAmount;

        data.bounceCharge = calFullPay.bounceCharge;
        data.cgstBounceCharge = calFullPay.cgstOnBounceCharge;
        data.sgstBounceCharge = calFullPay.sgstOnBounceCharge;

        data.remainingPenalty = calFullPay.penaltyAmount;

        data.penalCharge = calFullPay.penalCharge;
        data.cgstPenalCharges = calFullPay.cgstOnPenalCharge;
        data.sgstPenalCharges = calFullPay.sgstOnPenalCharge;

        data.legalCharges = calFullPay.legalCharge;
        data.cgstLegalCharges = calFullPay.cgstOnLegalCharge;
        data.sgstLegalCharges = calFullPay.sgstOnLegalCharge;

        data.forClosureAmount = calFullPay.forecloseAmount;
        data.cgstForClosureCharge = calFullPay.cgstOnForecloseCharge;
        data.sgstForClosureCharge = calFullPay.sgstOnForecloseCharge;

        data.totalAmount = this.typeService.manageAmount(data.totalAmount);
      }
    }
    return data;
  }
  //#region  get waiver amount
  private async getWaiverAmountPI(loanData) {
    try {
      const emiData = loanData.emiData;
      const transData = loanData.transactionData;
      const waiverData = [];
      const find = emiData.find(
        (f) =>
          +f.emi_amount - f.interestCalculate - f.principalCovered != 0 &&
          f.payment_status == 0,
      );
      if (find) {
        /// find waiver log
        const option = {
          where: { loanId: loanData.id, type: ['WAIVER', 'WAIVER_PAID'] },
        };
        const att = ['id', 'respons', 'loanId'];
        const result = await this.userActivityRepo.getTableWhereData(
          att,
          option,
        );
        if (!result || result === k500Error) return [];

        for (let index = 0; index < emiData.length; index++) {
          try {
            const ele = emiData[index];
            if (ele.payment_status === '0') {
              const filter = transData.filter((f) => f.emiId === ele.id);
              let paidPrincipal = 0;
              let paidInterest = 0;
              let waiverAmountPI = 0;
              let waiverPrincipal = 0;
              let waiverInterest = 0;
              /// find paid principal or interest
              filter.forEach((tran) => {
                paidPrincipal += tran?.principalAmount ?? 0;
                paidInterest += tran?.interestAmount ?? 0;
              });

              /// find waiver amount of emi
              result.forEach((waiver) => {
                try {
                  const respons = JSON.parse(waiver?.respons);
                  if (respons?.emiId == ele.id)
                    waiverAmountPI += respons?.waiver_emiAmount ?? 0;
                } catch (error) {}
              });

              /// find wavier in interest
              if (waiverAmountPI > 0) {
                const diff = ele?.interestCalculate - paidInterest;
                if (diff > 0) {
                  if (waiverAmountPI > diff) {
                    waiverInterest += diff;
                    waiverAmountPI -= diff;
                  } else {
                    waiverInterest += waiverAmountPI;
                    waiverAmountPI = 0;
                  }
                }
              }
              /// find wavire in principal
              if (waiverAmountPI > 0) {
                const diff = ele?.principalCovered - paidPrincipal;
                if (diff > 0) {
                  if (waiverAmountPI > diff) {
                    waiverPrincipal += diff;
                    waiverAmountPI -= diff;
                  } else {
                    waiverPrincipal += waiverAmountPI;
                    waiverAmountPI = 0;
                  }
                }
              }
              waiverData.push({
                emiId: ele.id,
                waiverPrincipal,
                waiverInterest,
              });
            }
          } catch (error) {}
        }
      }
      return waiverData;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region get Full Pay Data By TransId
  async getFullPayDataByTransId(id) {
    try {
      const att = ['completionDate', 'loanId', 'emiId'];
      const options = { where: { id, status: 'COMPLETED' } };
      const transData = await this.transRepo.getRowWhereData(att, options);
      const emiId = transData?.emiId;
      if (emiId) {
        const opt = { where: { id: emiId } };
        const emi = await this.emiRepo.getRowWhereData(['payment_status'], opt);
        if (emi == k500Error) return kInternalError;
        if (emi?.payment_status == '1') return true;
      }
      if (transData == k500Error) return kInternalError;
      if (!transData) return k422ErrorMessage('No transactions found');
      const loanId = transData.loanId;
      const body = { targetDate: transData?.completionDate, loanId };
      const result = await this.getFullPaymentData(body);
      if (!result || result === k500Error) return kInternalError;
      if (result?.message) return result;
      const fullPIPData = result?.fullPIPData;
      if (fullPIPData) {
        const keys = Object.keys(fullPIPData);
        for (let index = 0; index < keys.length; index++) {
          try {
            const emiId = keys[index];
            const value = fullPIPData[emiId];
            const updateData = value;
            updateData.payment_done_date = transData?.completionDate;
            updateData.payment_status = '1';
            updateData.pay_type = kFullPay;

            const options = {
              where: { loanId, payment_status: '0', id: emiId },
            };
            await this.emiRepo.updateRowDataWithOptions(
              updateData,
              options,
              +emiId,
            );
          } catch (error) {}
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  getRateEMI(emi) {
    const data = {
      dueDate: null,
      expectedPrincipal: 0,
      expectedInterest: 0,
      expectedPenalty: 0,
      totalExpected: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      paidPenalty: 0,
      totalPaid: 0,
      discount: 0,
      waivedOff: 0,
      waiverPrincipal: 0,
      waiverInterest: 0,
      waiverPenalty: 0,
      prePaidPrinciple: 0,
      prePaidInterest: 0,
      loanCount: 0,
      totalPrePaidAmount: 0,
      unPaidPrincipal: 0,
      unPaidInterest: 0,
      unpaidPenalty: 0,
      totalUnpaid: 0,
      diffPrincipal: 0,
      diffInterest: 0,
      diffPenalty: 0,
      refundAmount: 0,
      emiIndex: 0,
      paymentStatus: '-',
    };
    try {
      data.dueDate = this.typeService.getGlobalDate(new Date(emi.emi_date));
      data.emiIndex = emi.emiNumber - 1;
      const loan = emi.loan;
      const transaction = loan.transactionData;
      const emiDate = this.typeService.getGlobalDate(emi.emi_date);
      const status = emi?.payment_status ?? '0';

      data.expectedPrincipal = emi.principalCovered;
      data.expectedInterest = emi.interestCalculate;
      // GET REFUND AMOUNT
      const paymentData = this.calculatePartPayment(emi.id, transaction);
      data.paidPenalty = paymentData?.paidPenalty ?? 0;
      data.paidPrincipal = paymentData?.paidPrincipal ?? 0;
      data.paidInterest = paymentData?.paidInterest ?? 0;
      data.refundAmount = paymentData?.refundAmount ?? 0;
      const isEmiPaid = paymentData?.isEmiPaid ?? false;

      // end part payment data
      data.expectedPenalty = (emi?.penalty ?? 0) + data.paidPenalty;
      data.expectedPenalty =
        (emi?.penalty ?? 0) + emi?.partPaymentPenaltyAmount;
      let waiverDiff = 0;
      const tempWai =
        (emi.waiver ?? 0) + (emi.paid_waiver ?? 0) + (emi.unpaid_waiver ?? 0);
      // PAID EMIs
      if (status == '1') {
        let isPrePay = false;
        const emiDoneDate = emi?.payment_done_date;
        if (emiDoneDate) {
          const payDate = this.typeService.getGlobalDate(emiDoneDate);
          isPrePay = payDate.getTime() < emiDate.getTime();
          if (isPrePay) data.paymentStatus = 'PRE_PAID';
          else if (payDate.getTime() == emiDate.getTime())
            data.paymentStatus = 'ON_TIME';
          else data.paymentStatus = 'POST_PAID';
        }
        if (isPrePay) {
          if (!isEmiPaid) {
            data.paidPrincipal =
              data.paidPrincipal + (emi?.fullPayPrincipal ?? 0);
            data.paidInterest = data.paidInterest + (emi?.fullPayInterest ?? 0);
            data.paidPenalty = data.paidPenalty + (emi?.fullPayPenalty ?? 0);
            data.prePaidPrinciple = data.paidPrincipal ?? 0;
            data.prePaidInterest = data.paidInterest ?? 0;
          } else {
            data.prePaidPrinciple = data.paidPrincipal ?? 0;
            data.prePaidInterest = data.paidInterest ?? 0;
          }
          data.expectedInterest = data.paidInterest ?? 0;
          data.loanCount = 1;
        } else if (!isEmiPaid) {
          data.paidPrincipal =
            data.paidPrincipal + (emi?.fullPayPrincipal ?? 0);
          data.paidInterest = data.paidInterest + (emi?.fullPayInterest ?? 0);
          data.paidPenalty = data.paidPenalty + (emi?.fullPayPenalty ?? 0);
        }
      } else {
        // all the unpaid pricipal and interest
        //  EMI PRINCIPAL-PART PAID PRINCIPAL (same for interest as well)
        data.unPaidPrincipal = emi.principalCovered - data.paidPrincipal;
        data.unPaidInterest = emi.interestCalculate - data.paidInterest;
        data.unpaidPenalty = emi?.penalty;
        if (paymentData.isPartPaid) {
          data.paymentStatus = 'PARTIAL_PAID';
        } else data.paymentStatus = 'UN_PAID';
      }

      const eTotal =
        data.expectedPrincipal + data.expectedInterest + data.expectedPenalty;
      const pTotal = data.paidPrincipal + data.paidInterest + data.paidPenalty;
      const diff = eTotal - pTotal;
      if ((diff > 10 || diff < -10) && status == '1') {
        this.getDiff(data);
        if (data.diffInterest < 0) data.paidInterest = data.expectedInterest;
        if (data.diffPrincipal < 0) data.paidPenalty = data.expectedPenalty;

        this.getDiff(data);
        data.waivedOff =
          (emi.waiver ?? 0) + (emi.paid_waiver ?? 0) + (emi.unpaid_waiver ?? 0);
        if (data.waivedOff > 0) {
          let waivedOff = data.waivedOff;
          if (data.diffPrincipal > 0 && waivedOff > 0) {
            if (waivedOff > data.diffPrincipal) {
              waivedOff -= data.diffPrincipal;
              data.waiverPrincipal = data.diffPrincipal;
              data.diffPrincipal = 0;
            } else {
              data.waiverPrincipal = waivedOff;
              data.diffPrincipal -= waivedOff;
              waivedOff = 0;
            }
          }
          if (data.diffInterest > 0 && waivedOff > 0) {
            if (waivedOff > data.diffInterest) {
              waivedOff -= data.diffInterest;
              data.waiverInterest = data.diffInterest;
              data.diffInterest = 0;
            } else {
              data.waiverInterest = waivedOff;
              data.diffInterest -= waivedOff;
              waivedOff = 0;
            }
          }

          if (data.diffPenalty > 0 && waivedOff > 0) {
            if (waivedOff > data.diffPenalty) {
              waivedOff -= data.diffPenalty;
              data.waiverPenalty = data.diffPenalty;
              data.diffPenalty = 0;
            } else {
              data.waiverPenalty = waivedOff;
              data.diffPenalty -= waivedOff;
              waivedOff = 0;
            }
          }
        }
        waiverDiff =
          data.waivedOff -
          (data.waiverPrincipal + data.waiverInterest + data.waiverPenalty);

        if (waiverDiff > 0) {
          data.waiverPenalty += waiverDiff;
          data.expectedPenalty += waiverDiff;
        }
      }

      const waive =
        data.waiverPrincipal + data.waiverInterest + data.waiverPenalty;
      const diffWaiver = tempWai - waive;
      if (diffWaiver > 10) {
        data.waivedOff += diffWaiver;
        data.waiverPenalty += diffWaiver;
        data.expectedPenalty += diffWaiver;
      }
      if (data.unPaidPrincipal < 0) data.unPaidPrincipal = 0;
      if (data.unPaidInterest < 0) data.unPaidInterest = 0;
      if (data.unpaidPenalty < 0) data.unpaidPenalty = 0;
      data.totalUnpaid =
        data.unPaidPrincipal + data.unPaidInterest + data.unpaidPenalty;
      data.totalPaid =
        data.paidPrincipal + data.paidInterest + data.paidPenalty;
      data.totalExpected =
        data.expectedPrincipal + data.expectedInterest + data.expectedPenalty;
      data.totalPrePaidAmount = data.prePaidPrinciple + data.prePaidInterest;
      // TOTAL PAID
      const toDays = new Date();
      toDays.setDate(toDays.getDate() - 1);
      const toDay = this.typeService.getGlobalDate(toDays).getTime();
      if (emiDate.getTime() > toDay) {
        data.unPaidPrincipal = 0;
        data.unPaidInterest = 0;
        data.unpaidPenalty = 0;
        data.totalUnpaid = 0;
      }
    } catch (error) {}

    return data;
  }

  private calculatePartPayment(emiId, transactionData) {
    const data = {
      paidPenalty: 0,
      isEmiPaid: false,
      isPartPaid: false,
      paidInterest: 0,
      paidPrincipal: 0,
      paidDefInt: 0,
      paidEcsCharge: 0,
      penalCharge: 0,
      legalCharge: 0,
      refundAmount: 0,
    };
    try {
      data.isPartPaid =
        transactionData.filter((el) => el.emiId == emiId).length > 0;
      let tran = [...transactionData];
      tran.forEach((ele) => {
        if (emiId == ele.emiId && ele.type == 'REFUND')
          data.refundAmount += ele.paidAmount;
      });
      tran = tran.sort(
        (a, b) =>
          a.interestAmount +
          a.principalAmount +
          a.regInterestAmount +
          a.bounceCharge +
          a.sgstOnBounceCharge +
          a.sgstOnBounceCharge +
          a.penalCharge +
          a.sgstOnPenalCharge +
          a.cgstOnPenalCharge +
          a.legalCharge +
          a.sgstOnLegalCharge +
          a.cgstOnLegalCharge -
          (b.interestAmount +
            b.principalAmount +
            b.regInterestAmount +
            b.bounceCharge +
            b.sgstOnBounceCharge +
            b.sgstOnBounceCharge +
            b.penalCharge +
            b.sgstOnPenalCharge +
            b.cgstOnPenalCharge +
            b.legalCharge +
            b.sgstOnLegalCharge +
            b.cgstOnLegalCharge),
      );
      tran.forEach((ele) => {
        if (
          emiId == ele.emiId &&
          (ele.type == 'PARTPAY' || ele.type == 'EMIPAY')
        ) {
          // SUBTRACK THE REFUND FROM PAID AMOUNT
          if (ele.paidAmount + data.refundAmount == 0 && ele.type == 'EMIPAY')
            data.refundAmount = 0;
          else {
            if (ele.type == 'EMIPAY') data.isEmiPaid = true;
            data.paidInterest += ele?.interestAmount ?? 0;
            data.paidPrincipal += ele?.principalAmount ?? 0;
            data.paidDefInt += ele?.regInterestAmount ?? 0;
            data.paidEcsCharge +=
              ele?.bounceCharge +
                ele?.sgstOnBounceCharge +
                ele?.cgstOnBounceCharge ?? 0;
            data.penalCharge +=
              ele?.penalCharge +
                ele?.sgstOnPenalCharge +
                ele?.cgstOnPenalCharge ?? 0;
            data.legalCharge +=
              ele?.legalCharge +
                ele?.sgstOnLegalCharge +
                ele?.cgstOnLegalCharge ?? 0;
          }
        }
      });
      if (tran.length > 0) {
        const find = tran.find((f) => f.type == 'FULLPAY');
        if (!find) data.isEmiPaid = true;
      }
    } catch (error) {}
    return data;
  }

  async getPartPayCalulation(loanData, amount) {
    let partPayCalculation: any = {};
    let interest = 0;
    let principalAmount = 0;
    let deferredInterest = 0;
    let ecsCharge = 0;
    let penalCharge = 0;
    let legalCharge = 0;
    let totalInterest = 0;
    let extraPayment = 0;
    try {
      const emiData = loanData?.emiData;
      let finalData = [];
      let delayDays = 0;
      for (let i = 0; i < emiData.length; i++) {
        const ele = emiData[i];
        // adding penalty days
        if (ele?.payment_status == '0') delayDays += ele?.penalty_days;
        // expected amt
        let expectedInterest = ele?.interestCalculate;
        let expectedPrincipalAmt = ele?.principalCovered;
        // actual amts to take from customer
        let actualInterest = this.typeService.manageAmount(
          expectedInterest - ele?.paid_interest,
        );
        let actualPA = this.typeService.manageAmount(
          expectedPrincipalAmt - ele?.paid_principal,
        );
        finalData.push({ actualInterest, actualPA, IPA: true });
        // expected charges
        let expectedDeferredInt = ele?.regInterestAmount ?? 0;
        let expectedEcsCharge =
          (ele?.bounceCharge ?? 0) + (ele?.gstOnBounceCharge ?? 0);
        let expectedPenalCharge =
          (+ele?.dpdAmount ?? 0) +
          (+ele?.penaltyChargesGST ?? 0) +
          (+ele?.penalty ?? 0);
        let expectedLegalCharges =
          (ele?.legalCharge ?? 0) + (ele?.legalChargeGST ?? 0);
        // actual charges to take from customer
        let actualDefInt = this.typeService.manageAmount(
          expectedDeferredInt - (ele?.paidRegInterestAmount ?? 0),
        );
        let actualEcsCharge = this.typeService.manageAmount(
          expectedEcsCharge - (ele?.paidBounceCharge ?? 0),
        );
        let actualPenalCharge = this.typeService.manageAmount(
          expectedPenalCharge -
            (+ele?.paidPenalCharge ?? 0 + +ele?.partPaymentPenaltyAmount ?? 0),
        );
        let actualLegalCharge = this.typeService.manageAmount(
          expectedLegalCharges - (ele?.paidLegalCharge ?? 0),
        );

        finalData.push({
          actualEcsCharge,
          actualPenalCharge,
          actualDefInt,
          actualLegalCharge,
          IPA: false,
        });
      }
      finalData.sort((a, b) => {
        if (a.IPA && !b.IPA) {
          return -1;
        } else if (!a.IPA && b.IPA) {
          return 1;
        } else {
          return 0;
        }
      });
      for (let i = 0; i < finalData.length; i++) {
        const ele = finalData[i];
        // Interest
        if (amount > 0) {
          const emiInterest = ele?.actualInterest;

          if (emiInterest > 0) {
            if (amount > emiInterest) {
              interest += emiInterest;
              amount -= emiInterest;
            } else {
              interest += amount;
              amount = 0;
            }
          }
        }
        // Principal Amount
        if (amount > 0) {
          const emiPrincipalAmt = ele?.actualPA;
          if (emiPrincipalAmt > 0) {
            if (amount > emiPrincipalAmt) {
              principalAmount += emiPrincipalAmt;
              amount -= emiPrincipalAmt;
            } else {
              principalAmount += amount;
              amount = 0;
            }
          }
        }
        // Charges
        if (amount > 0) {
          // Deferred charges
          const emiDeferredInt = ele?.actualDefInt;
          if (emiDeferredInt > 0) {
            if (amount > emiDeferredInt) {
              deferredInterest += emiDeferredInt;
              amount -= emiDeferredInt;
            } else {
              deferredInterest += amount;
              amount = 0;
            }
          }

          // ECS charges
          const emiEcsCharge = ele?.actualEcsCharge;
          if (emiEcsCharge > 0) {
            if (amount > emiEcsCharge) {
              ecsCharge += emiEcsCharge;
              amount -= emiEcsCharge;
            } else {
              ecsCharge += amount;
              amount = 0;
            }
          }
          // Penal Charges
          const emiPenalCharge = ele?.actualPenalCharge;
          if (emiPenalCharge > 0) {
            if (amount > emiPenalCharge) {
              penalCharge += emiPenalCharge;
              amount -= emiPenalCharge;
            } else {
              penalCharge += amount;
              amount = 0;
            }
          }
          // Legal Charges
          const emiLegalCharge = ele?.actualLegalCharge;
          if (emiLegalCharge > 0) {
            if (amount > emiLegalCharge) {
              legalCharge += emiLegalCharge;
              amount -= emiLegalCharge;
            } else {
              legalCharge += amount;
              amount = 0;
            }
          }
        }
      }
      if (amount > 0) extraPayment += amount;
      principalAmount = this.typeService.manageAmount(principalAmount);
      interest = this.typeService.manageAmount(interest);
      deferredInterest = this.typeService.manageAmount(deferredInterest);
      totalInterest = this.typeService.manageAmount(
        deferredInterest + interest,
      );
      ecsCharge = this.typeService.manageAmount(ecsCharge);
      penalCharge = this.typeService.manageAmount(penalCharge);
      legalCharge = this.typeService.manageAmount(legalCharge);
      partPayCalculation = {
        principalAmount,
        totalInterest,
        interest,
        deferredInterest,
        ecsCharge,
        penalCharge,
        legalCharge,
        delayDays,
      };
      return partPayCalculation;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getDiff(data) {
    data.diffPrincipal = data.expectedPrincipal - data.paidPrincipal;
    if (data.diffPrincipal < 0) {
      const amount = -1 * data.diffPrincipal;
      data.paidPrincipal -= amount;
      data.paidInterest += amount;
      data.diffPrincipal = 0;
    }
    data.diffInterest = data.expectedInterest - data.paidInterest;
    if (data.diffInterest < 0) {
      const amount = -1 * data.diffInterest;
      data.paidInterest -= amount;
      data.paidPenalty += amount;
      data.diffInterest = 0;
    }
    data.diffPenalty = data.expectedPenalty - data.paidPenalty;
    if (data.diffPenalty < 0) {
      data.diffPenalty = 0;
      data.expectedPenalty += data.paidPenalty - data.expectedPenalty;
    }
    return data;
  }

  getOverDueInsightsForLoan(loanData: loanTransaction) {
    try {
      const emiList = loanData.emiData ?? [];
      let transList = loanData.transactionData ?? [];
      if (transList?.length > 0) {
        if (transList[0].status)
          transList = transList.filter((el) => el.status == kCompleted);
      } else {
        emiList.forEach((el) => {
          let transSubList = el.transactionData ?? [];
          if (transSubList.length > 0) {
            if (transSubList[0].status)
              transSubList = transSubList.filter(
                (el) => el.status == kCompleted,
              );
          }
          transList = [...transList, ...transSubList];
        });
      }

      let expectedPrincipal = 0;
      let expectedPenalty = 0;
      let expectedInterest = 0;
      emiList.forEach((el) => {
        try {
          expectedPrincipal += el.principalCovered ?? 0;
          expectedInterest += el.interestCalculate ?? 0;
          expectedPenalty += el.penalty ?? 0;
        } catch (error) {}
      });

      let paidPrincipal = 0;
      let paidPenalty = 0;
      let paidInterest = 0;
      transList.forEach((el) => {
        try {
          paidPrincipal += el.principalAmount ?? 0;
          paidInterest += el.interestAmount ?? 0;
          paidPenalty += el.penaltyAmount ?? 0;
          expectedPenalty += el.penaltyAmount ?? 0;
        } catch (error) {}
      });
      paidPrincipal = this.typeService.manageAmount(paidPrincipal);
      paidInterest = this.typeService.manageAmount(paidInterest);
      paidPenalty = this.typeService.manageAmount(paidPenalty);
      expectedPenalty = this.typeService.manageAmount(expectedPenalty);
      const totalExpected =
        expectedPrincipal + expectedInterest + expectedPenalty;
      let remainingEmiAmount = expectedPrincipal + expectedInterest;
      if (remainingEmiAmount < 0) remainingEmiAmount = 0;
      let remainingPrincipal = expectedPrincipal - paidPrincipal;
      if (remainingPrincipal < 0) remainingPrincipal = 0;
      let remainingInterest = expectedInterest - paidInterest;
      if (remainingInterest < 0) remainingInterest = 0;
      let remainingPenalty = expectedPenalty - paidPenalty;
      if (remainingPenalty < 0) remainingPenalty = 0;
      const totalRemaining =
        remainingPrincipal + remainingInterest + remainingPenalty;
      const totalPaid = paidPrincipal + paidInterest + paidPenalty;
      return {
        totalExpected,
        totalRemaining,
        totalRemainingPrincipal: remainingPrincipal,
        totalRemainingPI: remainingPrincipal + remainingInterest,
        totalPaid,
        totalRemainingEmiAmount: remainingEmiAmount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateWaivedBifurcation(emiId, waiverData) {
    try {
      const emiAttrs = [
        'loanId',
        'principalCovered',
        'interestCalculate',
        'waived_principal',
        'waived_interest',
        'waived_penalty',
        'waived_regInterest',
        'waived_bounce',
        'waived_penal',
        'waived_legal',
      ];
      const emiData = await this.emiRepo.getRowWhereData(emiAttrs, {
        where: { id: emiId },
      });
      if (!emiData || emiData === k500Error) return k500Error;
      const loanId = emiData.loanId;
      const loanAttrs = [
        'waived_principal',
        'waived_interest',
        'waived_penalty',
      ];
      const loanData = await this.loanRepo.getRowWhereData(loanAttrs, {
        where: { id: loanId },
      });
      if (!loanData || loanData === k500Error) return k500Error;
      const waivedData = this.calculateWaivedBifurcation(
        loanData,
        emiData,
        waiverData,
      );
      if (waivedData === k500Error) return kInternalError;
      await this.emiRepo.updateRowData(waivedData.emi, emiId);
      await this.loanRepo.updateRowData(waivedData.loan, loanId);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private calculateWaivedBifurcation(loanData, emiData, waiverData) {
    try {
      const interest = +(+emiData.interestCalculate ?? 0).toFixed(2);
      const waivedPenalty = +(waiverData?.waiver_penalty ?? 0).toFixed(2);
      const waivedEMIAmount = +(+waiverData?.waiver_emiAmount ?? 0).toFixed(2);
      const waivedRegInterest = +(waiverData?.waiver_regIntAmount ?? 0).toFixed(
        2,
      );
      const waivedBounce = +(waiverData?.waiver_bounce ?? 0).toFixed(2);
      const waivedPenal = +(waiverData?.waiver_penal ?? 0).toFixed(2);
      const waivedLegal = +(waiverData?.waiver_legal ?? 0).toFixed(2);
      let emi_waived_principal = +(+emiData?.waived_principal ?? 0).toFixed(2);
      let emi_waived_interest = +(+emiData?.waived_interest ?? 0).toFixed(2);
      let emi_waived_penalty = +(+emiData?.waived_penalty ?? 0).toFixed(2);
      let emi_waived_regInterest = +(emiData?.waived_regInterest ?? 0).toFixed(
        2,
      );
      let emi_waived_bounce = +(emiData?.waived_bounce ?? 0).toFixed(2);
      let emi_waived_penal = +(emiData?.waived_penal ?? 0).toFixed(2);
      let emi_waived_legal = +(emiData?.waived_legal ?? 0).toFixed(2);
      let loan_waived_principal = +(+loanData?.waived_principal ?? 0).toFixed(
        2,
      );
      let loan_waived_interest = +(+loanData?.waived_interest ?? 0).toFixed(2);
      let loan_waived_penalty = +loanData?.waived_penalty?.toFixed(2);
      let remainingInterest = interest - emi_waived_interest;

      const waivedData = {
        emi: {
          waived_principal: emi_waived_principal,
          waived_interest: emi_waived_interest,
          waived_penalty: emi_waived_penalty + waivedPenalty,
          waived_regInterest: emi_waived_regInterest + waivedRegInterest,
          waived_bounce: emi_waived_bounce + waivedBounce,
          waived_penal: emi_waived_penal + waivedPenal,
          waived_legal: emi_waived_legal + waivedLegal,
        },
        loan: {
          waived_principal: loan_waived_principal,
          waived_interest: loan_waived_interest,
          waived_penalty: loan_waived_penalty + waivedPenalty,
        },
      };

      // if there is remaining interest waive from interest
      if (remainingInterest > 0) {
        // check if waived amount is more than interest
        if (waivedEMIAmount > remainingInterest) {
          const remainingWaived = waivedEMIAmount - remainingInterest;
          // add all remaining interest in waived interest
          waivedData.emi.waived_interest += remainingInterest;
          waivedData.loan.waived_interest += remainingInterest;
          // add remaining waiver in waived principal
          waivedData.emi.waived_principal += remainingWaived;
          waivedData.loan.waived_principal += remainingWaived;
        } else {
          // add all waived amount in interest
          waivedData.emi.waived_interest += waivedEMIAmount;
          waivedData.loan.waived_interest += waivedEMIAmount;
        }
      } else {
        // waive all amount from principal
        waivedData.emi.waived_principal += waivedEMIAmount;
        waivedData.loan.waived_principal += waivedEMIAmount;
      }
      return waivedData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  // ECS between 2 loans
  async getECSCounts(transDetails, loanId, userId) {
    // Params validation
    if (!transDetails) return kParamMissing('transDetails');
    if (!loanId) return kParamMissing('loanId');
    if (!userId) return kParamMissing('userId');
    // Default last 100 days
    let minDate = new Date();

    // Prepare ecs transactions
    let ecsTransactions = [];
    if (Array.isArray(transDetails)) ecsTransactions = transDetails;
    else if (transDetails.transactionJson)
      ecsTransactions = transDetails.transactionJson;
    else return kInternalError;
    ecsTransactions = ecsTransactions.filter(
      (el) => el.category == 'ECS/CHQ RETURN CHARGES' && el.type == 'DEBIT',
    );

    // Get target loan date
    let attributes: any = ['loan_disbursement_date'];
    let options: any = { where: { id: loanId } };
    const targetLoanData = await this.loanRepo.getRowWhereData(
      attributes,
      options,
    );
    if (targetLoanData == k500Error) return kInternalError;
    if (!targetLoanData) return k422ErrorMessage(kNoDataFound);
    const maxDate = this.typeService.getGlobalDate(
      new Date(targetLoanData.loan_disbursement_date),
    );

    // Get previous loan details
    attributes = ['id', 'loan_disbursement_date'];
    options = {
      order: [['id', 'DESC']],
      where: { id: { [Op.lte]: loanId }, loanStatus: 'Complete', userId },
    };
    const loanData = await this.loanRepo.getRowWhereData(attributes, options);
    if (loanData == k500Error) return kInternalError;

    // Minimum date
    if (loanData?.loan_disbursement_date)
      minDate = this.typeService.getGlobalDate(loanData.loan_disbursement_date);
    else {
      minDate = new Date(maxDate);
      minDate.setDate(minDate.getDate() - 90);
    }
    const diffInDays = this.typeService.dateDifference(maxDate, minDate);
    // Max minimum date should be 90
    if (diffInDays > 90) {
      minDate = new Date(maxDate);
      minDate.setDate(minDate.getDate() - 90);
    }
    // Minimum date should be 30
    else if (diffInDays < 30) {
      minDate = new Date(maxDate);
      minDate.setDate(minDate.getDate() - 30);
    }

    const targetECSTransactions = ecsTransactions.filter((el) => {
      const transDate: string = el.dateTime;
      if (!transDate || transDate?.length != 10) return false;
      const date = transDate.substring(0, 2);
      const month = transDate.substring(3, 5);
      const year = transDate.substring(6);
      const ecsTime = this.typeService
        .getGlobalDate(new Date(`${year}-${month}-${date}`))
        .getTime();
      if (ecsTime > maxDate.getTime()) return false;
      if (ecsTime < minDate.getTime()) return false;
      return true;
    });

    return targetECSTransactions.length;
  }

  // Check cibil category
  checkCibilCategory(cibilData: CibilScoreEntity) {
    // Good cibil score
    if (
      cibilData.cibilScore >= MIN_CIBIL_SCORE &&
      cibilData.plScore >= MIN_PL_SCORE &&
      cibilData.overdueBalance == CIBIL_MIN_OVERDUE &&
      cibilData.validCibilData == 1 &&
      cibilData.inquiryPast30Days <= INQUIRY_PAST_30_DAYS
    ) {
      return 'GOOD SCORE';
    }
    // Decline
    else if (
      cibilData.cibilScore == -1 ||
      cibilData.plScore == -1 ||
      cibilData.overdueBalance > CIBIL_MIN_OVERDUE ||
      cibilData.inquiryPast30Days >= 10
    ) {
      return 'BAD SCORE';
    }
    // Manual
    else if (cibilData.plScore > 500 && cibilData.inquiryPast30Days < 10)
      return 'MANUAL';
    return '-';
  }

  async calculateCLTV(reqData): Promise<any> {
    try {
      const attributes = ['id', 'userId', 'loanFees', 'charges'];

      let options: any = {
        limit: 10000,
        where: {
          loanGmv: { [Op.eq]: null },
          loanStatus: { [Op.in]: ['Active', 'Complete'] },
        },
      };
      if (reqData?.loanIds) {
        options.where.id = reqData.loanIds;
        delete options.where.loanGmv;
      }

      // Hit -> Query
      const loanList = await this.repoManager.getTableWhereData(
        loanTransaction,
        attributes,
        options,
      );
      if (loanList == k500Error) throw new Error();

      const userIds = [...new Set(loanList.map((item) => item.userId))];
      const transInclude: SequelOptions = { model: TransactionEntity };
      transInclude.required = false;
      transInclude.where = { status: kCompleted };
      transInclude.attributes = [
        'id',
        'paidAmount',
        'status',
        'type',
        'interestAmount',
        'penaltyAmount',
        'regInterestAmount',
        'bounceCharge',
        'penalCharge',
        'legalCharge',
        'emiId',
      ];
      const emiInclude: any = { model: EmiEntity, required: false };
      emiInclude.attributes = [
        'principalCovered',
        'paid_principal',
        'legalCharge',
        'id',
      ];
      emiInclude.where = { payment_due_status: '1', payment_status: '0' };
      const include = [transInclude, emiInclude];
      const allLoans = await this.repoManager.getTableWhereData(
        loanTransaction,
        attributes,
        {
          include,
          where: {
            loanStatus: { [Op.in]: ['Active', 'Complete'] },
            userId: userIds,
          },
        },
      );
      if (allLoans === k500Error) throw new Error();
      let allEmi: any = [];
      for (let i = 0; i < userIds.length; i++) {
        try {
          const userId = userIds[i];
          const userLoanList = allLoans.filter(
            (loan) => loan.userId === userId,
          );
          let userPaidIncome = 0;

          for (let j = 0; j < userLoanList.length; j++) {
            try {
              const ele = userLoanList[j];
              let loanFees = +ele?.loanFees || 0;
              const gstAmt = +ele?.charges?.gst_amt || 0;
              loanFees -= gstAmt;
              const transList = this.removeRefundTransaction(
                ele.transactionData ?? [],
              );
              let principalEMI = 0;
              let paidPrincipal = 0;
              let legalFees = 0;
              let gmvAmount = 0;
              ele?.emiData?.map((ele) => {
                allEmi.push(ele?.id);
                principalEMI += ele?.principalCovered ?? 0;
                paidPrincipal += ele?.paid_principal ?? 0;
                legalFees += ele?.legalCharge ?? 0;
              });
              const defaultedAmount = principalEMI - paidPrincipal;
              if (defaultedAmount) {
                gmvAmount -= defaultedAmount;
              }
              if (legalFees) {
                gmvAmount -= legalFees;
              }

              let paidIncome = loanFees + gmvAmount;
              transList.forEach((el) => {
                if (allEmi.includes(el?.emiId) && el.type == 'PARTPAY') return;
                if (el.interestAmount > 0) paidIncome += el?.interestAmount;
                if (el.penaltyAmount > 0) paidIncome += el?.penaltyAmount;
                if (el.legalCharge > 0) paidIncome += el?.legalCharge;
                if (el.penalCharge > 0) paidIncome += el?.penalCharge;
                if (el.bounceCharge > 0) paidIncome += el?.bounceCharge;
                if (el.regInterestAmount > 0)
                  paidIncome += el.regInterestAmount;
              });

              const updatedData = { loanGmv: Math.floor(paidIncome) };
              if (!ele.id) continue;
              await this.repoManager.updateRowData(
                loanTransaction,
                updatedData,
                ele.id,
                true,
              );

              userPaidIncome += paidIncome;
            } catch (error) {}
          }

          const updatedData = { gmvAmount: Math.floor(userPaidIncome) };
          if (!userId) continue;
          await this.repoManager.updateRowData(
            registeredUsers,
            updatedData,
            userId,
            true,
          );
        } catch (error) {}
      }
    } catch (error) {}
  }

  removeRefundTransaction(transData) {
    const refundData = transData.find(
      (el) => el?.type == 'REFUND' && el?.status == 'COMPLETED',
    );
    if (refundData) {
      transData.sort((a, b) => b.id - a.id);
      let extraPayment;
      for (let index = 0; index < transData.length; index++) {
        try {
          const element = transData[index];
          if (
            Math.abs(element.paidAmount + refundData?.paidAmount) < 10 &&
            element.type !== 'REFUND' &&
            element.status == 'COMPLETED'
          ) {
            extraPayment = element;
            break;
          }
        } catch (error) {}
      }

      transData = transData.filter(
        (el) => el?.type !== 'REFUND' && extraPayment?.id !== el?.id,
      );
    }
    transData.sort((a, b) => a.id - b.id);

    return transData ?? [];
  }

  // Split payment
  splitPaymentsforPI(reqData) {
    let paidAmount = reqData.paidAmount;
    if (!paidAmount) return kParamMissing('paidAmount');
    paidAmount = +reqData.paidAmount;
    const emiList = reqData.emiList ?? [];
    if (emiList?.length == 0) return kParamMissing('emiList');

    const piList = []; // Principal, interest
    const chargeList = []; // Deferred interest, penalty, bounce charge, legal charge, etc
    emiList.sort((a, b) => a.id - b.id);

    // Filtration -> Expected amount which still needs to recover
    for (let index = 0; index < emiList.length; index++) {
      const emiData = emiList[index];
      const principalAmount = emiData.principalCovered ?? 0;
      if (!principalAmount) throw Error();
      const interestAmount = emiData.interestCalculate ?? 0;
      if (!interestAmount) throw Error();
      // Charges
      const penaltyAmount =
        (emiData.penalty ?? 0) + (emiData.partPaymentPenaltyAmount ?? 0);
      const bounceCharge = emiData.bounceCharge ?? 0;
      const gstOnBounceCharge = emiData.gstOnBounceCharge ?? 0;
      const regInterestAmount = emiData.regInterestAmount ?? 0;
      const penalCharge = emiData.dpdAmount ?? 0;
      const penaltyChargesGST = emiData.penaltyChargesGST ?? 0;
      const legalCharge = emiData.legalCharge ?? 0;
      const legalChargeGST = emiData.legalChargeGST ?? 0;

      // Calculation -> Paid amount
      let paidPrincipal = 0;
      let paidInterest = 0;
      let paidRegInterestAmount = 0;
      let paidBounceCharge = 0;
      let paidGstOnBounceCharge = 0;
      let paidPenalty = 0;
      let paidPenalCharge = 0;
      let paidPenaltyChargesGST = 0;
      let paidLegalCharge = 0;
      let paidLegalChargeGST = 0;
      const transList = emiData.transactionData ?? [];
      transList.forEach((el) => {
        paidPrincipal += el.principalAmount ?? 0;
        paidInterest += el.interestAmount ?? 0;
        paidPenalty += el.penaltyAmount ?? 0;
        paidPenalCharge += el.penalCharge ?? 0;
        paidRegInterestAmount += el.regInterestAmount ?? 0;
        paidBounceCharge += el.bounceCharge ?? 0;
        paidGstOnBounceCharge += el.cgstOnBounceCharge ?? 0;
        paidGstOnBounceCharge += el.sgstOnBounceCharge ?? 0;
        paidPenaltyChargesGST += el.cgstOnPenalCharge ?? 0;
        paidPenaltyChargesGST += el.sgstOnPenalCharge ?? 0;
        paidLegalCharge += el.legalCharge ?? 0;
        paidLegalChargeGST += el.sgstOnLegalCharge ?? 0;
        paidLegalChargeGST += el.cgstOnLegalCharge ?? 0;
      });

      // Calculation -> Expected amount
      // Principal
      let expectedPrincipal = this.typeService.manageAmount(
        principalAmount - paidPrincipal,
      );
      if (expectedPrincipal < 0) expectedPrincipal = 0;
      // Interest
      let expectedInterest = this.typeService.manageAmount(
        interestAmount - paidInterest,
      );
      if (expectedInterest < 0) expectedInterest = 0;
      // Deferred Int
      const expectedRegInterestAmount = this.typeService.manageAmount(
        regInterestAmount - paidRegInterestAmount,
      );
      // Bounce
      const expectedBounceCharge = this.typeService.manageAmount(
        bounceCharge - paidBounceCharge,
      );
      const expectedGstOnBounceCharge = this.typeService.manageAmount(
        gstOnBounceCharge - paidGstOnBounceCharge,
      );
      // Penalty (Old)
      let expectedPenalty = this.typeService.manageAmount(
        penaltyAmount - paidPenalty,
      );
      if (expectedPenalty < 0) expectedPenalty = 0;
      // Penal Charge (New)
      const expectedPenalCharge = this.typeService.manageAmount(
        penalCharge - paidPenalCharge,
      );
      const expectedGstOnPenalCharge = this.typeService.manageAmount(
        penaltyChargesGST - paidPenaltyChargesGST,
      );
      // Legal Charge
      const expectedLegalCharge = this.typeService.manageAmount(
        legalCharge - paidLegalCharge,
      );
      const expectedGstOnLegalCharge = this.typeService.manageAmount(
        legalChargeGST - paidLegalChargeGST,
      );

      // Need to recover principal or interest amount
      if (expectedPrincipal > 0 || expectedInterest > 0) {
        piList.push({ emiId: emiData.id, expectedPrincipal, expectedInterest });
      }
      // Need to recover charges amount
      const chargesAmount =
        expectedBounceCharge +
        expectedPenalty +
        expectedGstOnBounceCharge +
        expectedRegInterestAmount +
        expectedPenalCharge +
        expectedGstOnPenalCharge +
        expectedLegalCharge +
        expectedGstOnLegalCharge;
      if (chargesAmount > 0) {
        chargeList.push({
          emiId: emiData.id,
          expectedPenalty,
          expectedBounceCharge,
          expectedGstOnBounceCharge,
          expectedRegInterestAmount,
          expectedPenalCharge,
          expectedGstOnPenalCharge,
          expectedLegalCharge,
          expectedGstOnLegalCharge,
        });
      }
    }

    // Calculation -> Bifurcation of paid amount
    const expectedArray = [...piList, ...chargeList];
    let remainingAmount = paidAmount;
    const bifurcationList = [];
    for (let index = 0; index < expectedArray.length; index++) {
      if (remainingAmount <= 0) break;

      const targetData = expectedArray[index];
      const expectedPrincipal = targetData.expectedPrincipal ?? 0;
      const expectedInterest = targetData.expectedInterest ?? 0;
      const expectedRegInterestAmount =
        targetData.expectedRegInterestAmount ?? 0;
      const expectedPenalty = targetData.expectedPenalty ?? 0;
      const expectedBounceCharge = targetData.expectedBounceCharge ?? 0;
      const expectedGstOnBounceCharge =
        targetData.expectedGstOnBounceCharge ?? 0;
      const expectedPenalCharge = targetData.expectedPenalCharge ?? 0;
      const expectedGstOnPenalCharge = targetData.expectedGstOnPenalCharge ?? 0;
      const expectedLegalCharge = targetData.expectedLegalCharge ?? 0;
      const expectedGstOnLegalCharge = targetData.expectedGstOnLegalCharge ?? 0;

      const bifurcationData: any = { emiId: targetData.emiId, roundOff: 0 };
      // Calculation -> Interest amount bifurcation
      if (expectedInterest > 0) {
        if (remainingAmount <= expectedInterest) {
          bifurcationData.interestAmount = parseFloat(
            remainingAmount.toFixed(2),
          );
          remainingAmount = 0;
        } else if (remainingAmount > expectedInterest) {
          remainingAmount -= expectedInterest;
          bifurcationData.interestAmount = parseFloat(
            expectedInterest.toFixed(2),
          );
        }
      }
      // Calculation -> Principal amount bifurcation
      if (expectedPrincipal > 0 && remainingAmount > 0) {
        if (remainingAmount <= expectedPrincipal) {
          bifurcationData.principalAmount = parseFloat(
            remainingAmount.toFixed(2),
          );
          remainingAmount = 0;
        } else if (remainingAmount > expectedPrincipal) {
          remainingAmount -= expectedPrincipal;
          bifurcationData.principalAmount = parseFloat(
            expectedPrincipal.toFixed(2),
          );
        }
      }
      // Calculation -> Deffered Interest amount bifurcation
      if (expectedRegInterestAmount > 0 && remainingAmount > 0) {
        if (remainingAmount <= expectedRegInterestAmount) {
          bifurcationData.regInterestAmount = parseFloat(
            remainingAmount.toFixed(2),
          );
          remainingAmount = 0;
        } else if (remainingAmount > expectedRegInterestAmount) {
          remainingAmount -= expectedRegInterestAmount;
          bifurcationData.regInterestAmount = parseFloat(
            expectedRegInterestAmount.toFixed(2),
          );
        }
      }
      // Calculation -> Penalty amount bifurcation
      if (expectedPenalty > 0 && remainingAmount > 0) {
        if (remainingAmount <= expectedPenalty) {
          bifurcationData.penaltyAmount = parseFloat(
            remainingAmount.toFixed(2),
          );
          remainingAmount = 0;
        } else if (remainingAmount > expectedPenalty) {
          remainingAmount -= expectedPenalty;
          bifurcationData.penaltyAmount = parseFloat(
            expectedPenalty.toFixed(2),
          );
        }
      }
      // Calculation -> Bounce charge amount bifurcation
      if (
        expectedBounceCharge + expectedGstOnBounceCharge > 0 &&
        remainingAmount > 0
      ) {
        if (
          remainingAmount <=
          expectedBounceCharge + expectedGstOnBounceCharge
        ) {
          bifurcationData.bounceCharge = parseFloat(remainingAmount.toFixed(2));
          remainingAmount = 0;
        } else if (
          remainingAmount >
          expectedBounceCharge + expectedGstOnBounceCharge
        ) {
          remainingAmount -= expectedBounceCharge + expectedGstOnBounceCharge;
          bifurcationData.bounceCharge = parseFloat(
            expectedBounceCharge + expectedGstOnBounceCharge,
          );
        }
        if (bifurcationData.bounceCharge > 10) {
          bifurcationData.gstOnbounceCharge =
            bifurcationData.bounceCharge - bifurcationData.bounceCharge / 1.18;
          bifurcationData.gstOnbounceCharge = this.typeService.manageAmount(
            bifurcationData.gstOnbounceCharge,
          );
          if (bifurcationData.gstOnbounceCharge % 2 == 1) {
            bifurcationData.gstOnbounceCharge =
              bifurcationData.gstOnbounceCharge - 1;
          }
          bifurcationData.bounceCharge =
            bifurcationData.bounceCharge - bifurcationData.gstOnbounceCharge;
          let bounceChargeRoundOff = +(
            bifurcationData.bounceCharge -
            Math.floor(bifurcationData.bounceCharge)
          ).toFixed(2);
          bifurcationData.roundOff += bounceChargeRoundOff;
          bifurcationData.bounceCharge = Math.floor(
            bifurcationData.bounceCharge,
          );
        } else {
          bifurcationData.gstOnbounceCharge = 0;
        }
      }
      // Calculation -> Bounce charge GST amount bifurcation
      // if (expectedGstOnBounceCharge > 0 && remainingAmount > 0) {
      //   if (remainingAmount <= expectedGstOnBounceCharge) {
      //     bifurcationData.gstOnbounceCharge = parseFloat(
      //       remainingAmount.toFixed(2),
      //     );
      //     remainingAmount = 0;
      //   } else if (remainingAmount > expectedGstOnBounceCharge) {
      //     remainingAmount -= expectedGstOnBounceCharge;
      //     bifurcationData.gstOnbounceCharge = parseFloat(
      //       expectedGstOnBounceCharge.toFixed(2),
      //     );
      //   }
      // }
      // Calculation -> Penal charge amount bifurcation

      if (
        expectedPenalCharge + expectedGstOnPenalCharge > 0 &&
        remainingAmount > 0
      ) {
        if (remainingAmount <= expectedPenalCharge + expectedGstOnPenalCharge) {
          bifurcationData.penalCharge = parseFloat(remainingAmount.toFixed(2));
          remainingAmount = 0;
        } else if (
          remainingAmount >
          expectedPenalCharge + expectedGstOnPenalCharge
        ) {
          remainingAmount -= expectedPenalCharge + expectedGstOnPenalCharge;
          bifurcationData.penalCharge = parseFloat(
            expectedPenalCharge + expectedGstOnPenalCharge,
          );
        }
        if (bifurcationData.penalCharge > 10) {
          bifurcationData.gstOnPenalCharge =
            bifurcationData.penalCharge - bifurcationData.penalCharge / 1.18;
          bifurcationData.gstOnPenalCharge = this.typeService.manageAmount(
            bifurcationData.gstOnPenalCharge,
          );
          if (bifurcationData.gstOnPenalCharge % 2 == 1) {
            bifurcationData.gstOnPenalCharge =
              bifurcationData.gstOnPenalCharge - 1;
          }
          bifurcationData.penalCharge =
            bifurcationData.penalCharge - bifurcationData.gstOnPenalCharge;
          let penalRoundOff = +(
            bifurcationData.penalCharge -
            Math.floor(bifurcationData.penalCharge)
          ).toFixed(2);
          bifurcationData.roundOff += penalRoundOff;
          bifurcationData.penalCharge = Math.floor(bifurcationData.penalCharge);
        } else {
          bifurcationData.gstOnPenalCharge = 0;
        }
      }
      // Calculation -> Penal charge GST amount bifurcation
      // if (expectedGstOnPenalCharge > 0 && remainingAmount > 0) {
      //   if (remainingAmount <= expectedGstOnPenalCharge) {
      //     bifurcationData.gstOnPenalCharge = parseFloat(
      //       remainingAmount.toFixed(2),
      //     );
      //     remainingAmount = 0;
      //   } else if (remainingAmount > expectedGstOnPenalCharge) {
      //     remainingAmount -= expectedGstOnPenalCharge;
      //     bifurcationData.gstOnPenalCharge = parseFloat(
      //       expectedGstOnPenalCharge.toFixed(2),
      //     );
      //   }
      // }
      // Calculation -> Legal charge amount bifurcation
      if (
        expectedLegalCharge + expectedGstOnLegalCharge > 0 &&
        remainingAmount > 0
      ) {
        if (remainingAmount <= expectedLegalCharge + expectedGstOnLegalCharge) {
          bifurcationData.legalCharge = parseFloat(remainingAmount.toFixed(2));
          remainingAmount = 0;
        } else if (
          remainingAmount >
          expectedLegalCharge + expectedGstOnLegalCharge
        ) {
          remainingAmount -= expectedLegalCharge + expectedGstOnLegalCharge;
          bifurcationData.legalCharge = parseFloat(
            expectedLegalCharge + expectedGstOnLegalCharge,
          );
        }
        if (bifurcationData.legalCharge > 10) {
          bifurcationData.gstOnLegalCharge =
            bifurcationData.legalCharge - bifurcationData.legalCharge / 1.18;
          bifurcationData.gstOnLegalCharge = this.typeService.manageAmount(
            bifurcationData.gstOnLegalCharge,
          );
          if (bifurcationData.gstOnLegalCharge % 2 == 1) {
            bifurcationData.gstOnLegalCharge =
              bifurcationData.gstOnLegalCharge - 1;
          }
          bifurcationData.legalCharge =
            bifurcationData.legalCharge - bifurcationData.gstOnLegalCharge;
          let legalChargeRoundOff = +(
            bifurcationData.legalCharge -
            Math.floor(bifurcationData.legalCharge)
          ).toFixed(2);
          bifurcationData.roundOff += legalChargeRoundOff;
          bifurcationData.legalCharge = Math.floor(bifurcationData.legalCharge);
        } else {
          bifurcationData.gstOnLegalCharge = 0;
        }
      }

      // Calculation -> Legal charge GST amount bifurcation
      // if (expectedGstOnLegalCharge > 0 && remainingAmount > 0) {
      //   if (remainingAmount <= expectedGstOnLegalCharge) {
      //     bifurcationData.gstOnLegalCharge = parseFloat(
      //       remainingAmount.toFixed(2),
      //     );
      //     remainingAmount = 0;
      //   } else if (remainingAmount > expectedGstOnLegalCharge) {
      //     remainingAmount -= expectedGstOnLegalCharge;
      //     bifurcationData.gstOnLegalCharge = parseFloat(
      //       expectedGstOnLegalCharge.toFixed(2),
      //     );
      //   }
      // }

      bifurcationList.push(bifurcationData);
    }
    // Excessive amount which needs to refund to user
    if (remainingAmount > 0) {
      bifurcationList.push({
        isRefundable: true,
        penaltyAmount: remainingAmount,
      });
      remainingAmount = 0;
    }

    const finalizedList = [];
    // Merging Same EMIs
    for (let index = 0; index < bifurcationList.length; index++) {
      const bifurcationData = bifurcationList[index];

      const targetIndex = finalizedList.findIndex(
        (el) => el.emiId == bifurcationData.emiId && el.emiId,
      );
      if (targetIndex == -1) {
        // GST on bounce charge
        if (bifurcationData.gstOnbounceCharge) {
          let totalGstOnBounceCharge = bifurcationData.gstOnbounceCharge;
          bifurcationData.sgstOnBounceCharge = this.typeService.manageAmount(
            totalGstOnBounceCharge / 2,
          );
          bifurcationData.cgstOnBounceCharge = this.typeService.manageAmount(
            totalGstOnBounceCharge / 2,
          );
          delete bifurcationData.gstOnbounceCharge;
        }
        // GST on penal charge
        if (bifurcationData.gstOnPenalCharge) {
          let totalGstOnPenalCharge = bifurcationData.gstOnPenalCharge;
          bifurcationData.sgstOnPenalCharge = this.typeService.manageAmount(
            totalGstOnPenalCharge / 2,
          );
          bifurcationData.cgstOnPenalCharge = this.typeService.manageAmount(
            totalGstOnPenalCharge / 2,
          );
          delete bifurcationData.gstOnPenalCharge;
        }
        // GST on legal charge
        if (bifurcationData.gstOnLegalCharge) {
          let totalGstOnLegalCharge = bifurcationData.gstOnLegalCharge;
          bifurcationData.sgstOnLegalCharge = this.typeService.manageAmount(
            totalGstOnLegalCharge / 2,
          );
          bifurcationData.cgstOnLegalCharge = this.typeService.manageAmount(
            totalGstOnLegalCharge / 2,
          );
          delete bifurcationData.gstOnLegalCharge;
        }
        finalizedList.push(bifurcationData);
      }
      // Merging
      else {
        const existingData = finalizedList[targetIndex];
        if (bifurcationData.regInterestAmount) {
          let totalRegInterestAmount = existingData.regInterestAmount ?? 0;
          totalRegInterestAmount += bifurcationData.regInterestAmount;
          finalizedList[targetIndex].regInterestAmount = totalRegInterestAmount;
        }
        if (bifurcationData.penaltyAmount) {
          let totalPenaltyAmount = existingData.penaltyAmount ?? 0;
          totalPenaltyAmount += bifurcationData.penaltyAmount;
          finalizedList[targetIndex].penaltyAmount = totalPenaltyAmount;
        }
        if (bifurcationData.bounceCharge) {
          let totalBounceCharge = existingData.bounceCharge ?? 0;
          totalBounceCharge += bifurcationData.bounceCharge;
          finalizedList[targetIndex].bounceCharge = totalBounceCharge;
        }
        if (bifurcationData.gstOnbounceCharge) {
          let totalGstOnBounceCharge = existingData.gstOnbounceCharge ?? 0;
          totalGstOnBounceCharge += bifurcationData.gstOnbounceCharge;
          finalizedList[targetIndex].sgstOnBounceCharge =
            totalGstOnBounceCharge / 2;
          finalizedList[targetIndex].cgstOnBounceCharge =
            totalGstOnBounceCharge / 2;
        }
        if (bifurcationData.penalCharge) {
          let totalPenalCharge = existingData.penalCharge ?? 0;
          totalPenalCharge += bifurcationData.penalCharge;
          finalizedList[targetIndex].penalCharge = totalPenalCharge;
        }
        if (bifurcationData.gstOnPenalCharge) {
          let totalGstOnPenalCharge = existingData.gstOnPenalCharge ?? 0;
          totalGstOnPenalCharge += bifurcationData.gstOnPenalCharge;
          finalizedList[targetIndex].sgstOnPenalCharge =
            totalGstOnPenalCharge / 2;
          finalizedList[targetIndex].cgstOnPenalCharge =
            totalGstOnPenalCharge / 2;
        }
        if (bifurcationData.legalCharge) {
          let totalLegalCharge = existingData.legalCharge ?? 0;
          totalLegalCharge += bifurcationData.legalCharge;
          finalizedList[targetIndex].legalCharge = totalLegalCharge;
        }
        if (bifurcationData.gstOnLegalCharge) {
          let totalGstOnLegalCharge = existingData.gstOnLegalCharge ?? 0;
          totalGstOnLegalCharge += bifurcationData.gstOnLegalCharge;
          finalizedList[targetIndex].sgstOnLegalCharge =
            totalGstOnLegalCharge / 2;
          finalizedList[targetIndex].cgstOnLegalCharge =
            totalGstOnLegalCharge / 2;
        }
      }
    }

    // Adding paid amount and missing values of bifurcation (if any)
    finalizedList.forEach((el) => {
      let paidAmount = 0;

      if (!el.interestAmount) el.interestAmount = 0;
      paidAmount += el.interestAmount ?? 0;

      if (!el.penaltyAmount) el.penaltyAmount = 0;
      paidAmount += el.penaltyAmount ?? 0;

      if (!el.principalAmount) el.principalAmount = 0;
      paidAmount += el.principalAmount ?? 0;

      if (!el.regInterestAmount) el.regInterestAmount = 0;
      paidAmount += el.regInterestAmount ?? 0;

      if (!el.bounceCharge) el.bounceCharge = 0;
      paidAmount += el.bounceCharge ?? 0;

      if (!el.sgstOnBounceCharge) el.sgstOnBounceCharge = 0;
      paidAmount += el.sgstOnBounceCharge ?? 0;

      if (!el.cgstOnBounceCharge) el.cgstOnBounceCharge = 0;
      paidAmount += el.cgstOnBounceCharge ?? 0;

      if (!el.penalCharge) el.penalCharge = 0;
      paidAmount += el.penalCharge ?? 0;

      if (!el.sgstOnPenalCharge) el.sgstOnPenalCharge = 0;
      paidAmount += el.sgstOnPenalCharge ?? 0;

      if (!el.cgstOnPenalCharge) el.cgstOnPenalCharge = 0;
      paidAmount += el.cgstOnPenalCharge ?? 0;

      if (!el.legalCharge) el.legalCharge = 0;
      paidAmount += el.legalCharge ?? 0;

      if (!el.sgstOnLegalCharge) el.sgstOnLegalCharge = 0;
      paidAmount += el.sgstOnLegalCharge ?? 0;

      if (!el.cgstOnLegalCharge) el.cgstOnLegalCharge = 0;
      paidAmount += el.cgstOnLegalCharge ?? 0;

      el.paidAmount = paidAmount;
    });

    return finalizedList;
  }
}
