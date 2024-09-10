// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  GLOBAL_FLOW,
  GLOBAL_RANGES,
  GLOBAL_CHARGES,
  PENALTY_CHARGES,
  SYSTEM_ADMIN_ID,
  INSURANCE_SERVICES,
  ECS_BOUNCE_WITH_GST,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCompleted,
  kErrorMsgs,
  kNoDataFound,
  kSomthinfWentWrong,
  kUsrCategories,
} from 'src/constants/strings';
import { EmiEntity } from 'src/entities/emi.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TypeService } from 'src/utils/type.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { UserRepository } from 'src/repositories/user.repository';
import { kMonthDates } from 'src/constants/objects';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { EnvConfig } from 'src/configs/env.config';
import { PaymentLinkEntity } from 'src/entities/paymentLink.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class EmiSharedService {
  constructor(
    private readonly bankingRepo: BankingRepository,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly emiRepo: EMIRepository,
    private readonly repoManager: RepositoryManager,
    // Repository
    private readonly predictionRepo: PredictionRepository,
    private readonly cibilScoreRepo: CibilScoreRepository,
    // Shared services
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
  ) {}

  generateEMICalculation(
    netApprovedAmount,
    salaryDate,
    targetDate,
    options: { maxDays: number; MIN_LOAN_DAYS: number } = {
      MIN_LOAN_DAYS: 11,
      maxDays: GLOBAL_RANGES.MAX_LOAN_TENURE_IN_DAYS,
    },
  ) {
    let nbfc = EnvConfig.nbfc.nbfcType;
    let startDate = new Date(targetDate);
    let totalDays = 0;
    const emiDates = [];
    const emiDays = [];
    for (let index = 0; index < 6; index++) {
      try {
        let emiDate = this.getEMIDateForTargetMonth(startDate, salaryDate);

        if (!emiDate) break;

        let diffInDays = this.typeService.dateDifference(
          startDate,
          emiDate,
          'Days',
        );

        if (diffInDays <= options.MIN_LOAN_DAYS) {
          const beginningDate = new Date(startDate);
          startDate.setDate(startDate.getDate() + options.MIN_LOAN_DAYS);
          emiDate = this.getEMIDateForTargetMonth(startDate, salaryDate);

          if (!emiDate) break;
          diffInDays = this.typeService.dateDifference(
            beginningDate,
            emiDate,
            'Days',
          );
        }

        // Interest rate should count from today
        if (index == 0) diffInDays++;
        if (netApprovedAmount > 100000) options.maxDays = 180;
        if (totalDays + diffInDays > options.maxDays) break;

        totalDays += diffInDays;

        startDate = emiDate;
        emiDates.push(new Date(emiDate.toJSON()));
        emiDays.push(diffInDays);

        if (emiDays.length >= EnvConfig.loan.maxEMIs) break;
      } catch (error) {}
    }
    if (
      emiDates.length == 2 ||
      emiDates.length == 3 ||
      emiDates.length == 4 ||
      emiDates.length == 5 ||
      emiDates.length == 6
    )
      return { emiDates, emiDays, totalDays };
    else throw new Error();
  }

  getEMIDateForTargetMonth(targetDate, salaryDate) {
    try {
      const targetMonth = targetDate.getMonth() + 1;
      const lastMonthDate = this.getLastDateOfMonth(targetDate);
      const initialDate = this.typeService.getGlobalDate(targetDate);
      initialDate.setDate(salaryDate);
      const initialMonth = initialDate.getMonth() + 1;

      // Month end
      if (initialMonth > targetMonth) {
        let lastDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0,
        );
        lastDate = this.typeService.getGlobalDate(lastDate);
        // For feb month with last day
        if (
          targetDate.getMonth() == 1 &&
          [28, 29].includes(lastMonthDate) &&
          salaryDate >= 27 &&
          salaryDate != 31
        ) {
          return lastDate;
        } else {
          lastDate.setDate(lastDate.getDate());
          return lastDate;
        }
      }
      // Same date
      else if (lastMonthDate == salaryDate) {
        // For feb month with last day
        if (
          targetDate.getMonth() == 1 &&
          [28, 29].includes(lastMonthDate) &&
          salaryDate >= 27 &&
          salaryDate != 31
        ) {
          return initialDate;
        } else {
          initialDate.setDate(initialDate.getDate());
          return initialDate;
        }
      }
      // Less date
      else if (lastMonthDate > salaryDate) {
        // Past date
        if (initialDate.getTime() < targetDate.getTime()) {
          initialDate.setDate(lastMonthDate + 1);
          return this.getEMIDateForTargetMonth(initialDate, salaryDate);
        }
        // Today or less date
        else {
          initialDate.setDate(initialDate.getDate());
          return initialDate;
        }
      }
    } catch (error) {}
  }

  getLastDateOfMonth(targetDate) {
    let lastDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    lastDate = this.typeService.getGlobalDate(lastDate);
    return lastDate.getDate();
  }

  // Pass salary date only if user wants to change the salary date
  async refreshCalculation(loanId, targetData: any = {}, details: any = {}) {
    try {
      if (!details) details = {};
      if (!targetData) targetData = {};

      let salaryDate: any = null;
      let userSelectedEmiDate: number | null = null;

      // Check for customized user selected salary date
      let attributes = ['emiSelection'];
      let options: any = { where: { id: loanId } };
      const existingLoanData = await this.loanRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!existingLoanData) return k422ErrorMessage(kNoDataFound);
      if (existingLoanData == k500Error) return kInternalError;
      const emiSelection = existingLoanData.emiSelection ?? {};
      // Checks -> Existing user's date selection
      if (emiSelection?.selectedEmiDate) {
        userSelectedEmiDate = emiSelection?.selectedEmiDate;
      }
      salaryDate = await this.getApprovedSalaryDate(loanId);
      if (salaryDate?.message) return salaryDate;

      // Salary date validation
      if (!salaryDate) salaryDate = targetData.salaryDate;
      if (!salaryDate) return kParamMissing('salaryDate');
      if (isNaN(salaryDate)) return kInvalidParamValue('salaryDate');
      if (salaryDate < 1 || salaryDate > 31)
        return kInvalidParamValue('salaryDate');
      const targetDate = this.typeService.getGlobalDate(new Date()).toJSON();
      const manualSalaryData: any = await this.checkIfUserCanSelectEmiDate(
        loanId,
        salaryDate,
      );
      if (manualSalaryData?.message) return manualSalaryData;

      // Query data
      const loanData = await this.getDataForRefreshCalculation(loanId);
      if (loanData?.message) return loanData;
      const eligibilityDetails =
        targetData.eligibilityDetails ?? loanData?.eligibilityDetails ?? {};
      // Calculate interest rate
      const userId = loanData?.userId;
      const getInterestRate: any =
        await this.commonSharedService.getEligibleInterestRate({
          userId,
          needDelayTag: true,
          eligibilityDetails,
        });
      if (getInterestRate?.message) return getInterestRate;
      const newInterest = getInterestRate?.interestRate ?? getInterestRate;
      const delayInterestRate = getInterestRate?.delayInterestRate;

      let netApprovedAmount = parseFloat(
        targetData.netApprovedAmount ??
          loanData?.netApprovedAmount ??
          loanData?.loanAmount,
      );
      // Calculate EMI days
      const emiData: any = this.generateEMICalculation(
        netApprovedAmount,
        userSelectedEmiDate ?? salaryDate,
        targetDate,
      );
      if (emiData.message) return emiData;

      // Prepare amount
      let interestRate = loanData.interestRate
        ? parseFloat(loanData.interestRate)
        : targetData.interestRate;
      if (interestRate != newInterest) interestRate = newInterest;
      const approvedLoanAmount = loanData?.approvedLoanAmount;
      if (isNaN(netApprovedAmount))
        netApprovedAmount = targetData.netApprovedAmount;
      let loanAmount =
        eligibilityDetails.eligibleAmount ?? parseFloat(loanData.loanAmount);

      const anummInterest =
        eligibilityDetails?.anummIntrest ?? details?.anummIntrest;

      let netEmiData: any;
      let emiBifurcation = EnvConfig.emiBifurcation;

      // // Calculate EMI amount according to nbfc
      if (emiBifurcation === 'STANDARD') {
        netEmiData = this.newEmiBifurcation(
          netApprovedAmount,
          emiData.emiDays,
          emiData.emiDates,
          emiData.totalDays,
          interestRate,
          anummInterest,
        );
      } else if (emiBifurcation === 'FLAT') {
        netEmiData = this.calculateEMIsBasedOnAmount(
          netApprovedAmount,
          emiData.emiDays,
          emiData.emiDates,
          emiData.totalDays,
          interestRate,
        );
      }

      if (netEmiData == k500Error) return kInternalError;
      // Insurance calculation
      let insuranceOptValue =
        details?.insuranceOptValue ?? loanData?.insuranceOptValue ?? false;
      let insurance: any = !insuranceOptValue
        ? {}
        : await this.getInsuranceDataForUser(
            loanData.userId,
            netApprovedAmount,
          );

      if (insurance?.message) return insurance;

      const newData = {
        loanAmount,
        netEmiData,
        totalDays: emiData.totalDays,
      };

      // Update loan data
      const updatedData: any = {
        loanAmount,
        interestRate: interestRate,
      };
      if (targetData.eligibilityDetails)
        updatedData.eligibilityDetails = targetData.eligibilityDetails;

      // Update details of salary dates
      if (
        manualSalaryData.canSelectEmiDate &&
        manualSalaryData.eligibleEmiDates
      ) {
        updatedData.emiSelection = {
          eligibleEmiDates: manualSalaryData.eligibleEmiDates,
          selectedEmiDate: userSelectedEmiDate ? userSelectedEmiDate : null,
          selectedOn: userSelectedEmiDate
            ? Math.floor(new Date().getTime() / 1000)
            : 0,
        };
      }
      const riskAssessment: any = await this.getRiskAssessmentCharge(userId);
      if (riskAssessment?.message) return riskAssessment;
      let risk_assessment_per = riskAssessment?.riskAssessmentPr;

      // if loanAmount 10000 is grater then risk assessment charge add
      let risk_assessment_charge = 0;
      if (loanAmount < 10000) {
        risk_assessment_per = GLOBAL_CHARGES.RISK_ASSESSMENT_PER;
        risk_assessment_charge = this.typeService.manageAmount(
          netApprovedAmount * (risk_assessment_per / 100),
        );
      }

      const cibilScore = riskAssessment?.cibilScore;
      const plScore = riskAssessment?.plScore;
      let doc_charge_amt = 0;
      const insurance_fee = GLOBAL_CHARGES.INSURANCE_FEE;
      const docChargePer = GLOBAL_CHARGES.DOC_CHARGE_PER;
      doc_charge_amt = this.typeService.manageAmount(
        netApprovedAmount * (docChargePer / 100),
      );
      const gst_per = GLOBAL_CHARGES.GST;
      // Charges calculation with insurance
      const chargesWithInsurance = {
        doc_charge_amt,
        doc_charge_per: docChargePer,
        gst_per,
        insurance_fee,
        gst_amt: 0,
        cgst_amt: 0,
        sgst_amt: 0,
        risk_assessment_per,
        risk_assessment_charge,
      };
      const processingFeesWithInsurance = this.typeService.manageAmount(
        (netApprovedAmount * GLOBAL_CHARGES.WITH_INSURANCE_PROCESSING_FEES) /
          100,
      );
      chargesWithInsurance.gst_amt = parseFloat(
        (
          (processingFeesWithInsurance +
            doc_charge_amt +
            insurance_fee +
            risk_assessment_charge) *
          (gst_per / 100)
        ).toFixed(2),
      );
      chargesWithInsurance.sgst_amt = parseFloat(
        (chargesWithInsurance.gst_amt / 2).toFixed(2),
      );
      chargesWithInsurance.cgst_amt = parseFloat(
        (chargesWithInsurance.gst_amt / 2).toFixed(2),
      );
      // Charges calculation without insurance
      const chargesWithoutInsurance = {
        doc_charge_amt,
        doc_charge_per: docChargePer,
        gst_per,
        insurance_fee,
        gst_amt: 0,
        cgst_amt: 0,
        sgst_amt: 0,
        risk_assessment_per,
        risk_assessment_charge,
      };
      const processingFeesWithoutInsurance = this.typeService.manageAmount(
        (netApprovedAmount * GLOBAL_CHARGES.WITHOUT_INSURANCE_PROCESSING_FEES) /
          100,
      );
      chargesWithoutInsurance.gst_amt = parseFloat(
        (
          (processingFeesWithoutInsurance +
            doc_charge_amt +
            insurance_fee +
            risk_assessment_charge) *
          (gst_per / 100)
        ).toFixed(2),
      );
      chargesWithoutInsurance.sgst_amt = parseFloat(
        (chargesWithoutInsurance.gst_amt / 2).toFixed(2),
      );
      chargesWithoutInsurance.cgst_amt = parseFloat(
        (chargesWithoutInsurance.gst_amt / 2).toFixed(2),
      );

      updatedData.netApprovedAmount = netApprovedAmount;
      updatedData.netEmiData = newData.netEmiData.emiData;
      updatedData.perday = parseFloat(newData.netEmiData.perDay);
      updatedData.TotalRepayAmount = newData.netEmiData.totalEmiAmount;
      updatedData.approvedDuration = newData.totalDays;
      const chargesDetails = {
        calculatedOn: new Date().toJSON(),
        globalCharges: { ...GLOBAL_CHARGES },
        feedData: { cibilScore, plScore },
        appliedCharges: {},
        feesIncome: 0,
        forClosureCharges: true,
      };
      // For users who opt-in for insurance
      if (insuranceOptValue == true) {
        updatedData.charges = chargesWithInsurance;
        chargesDetails.appliedCharges = chargesWithInsurance;
        updatedData.processingFees =
          GLOBAL_CHARGES.WITH_INSURANCE_PROCESSING_FEES;
        let insuranceDetails = loanData.insuranceDetails ?? {};
        const insurancePremium = this.getPremiumAmount(
          insurance,
          newData?.netEmiData?.emiData ?? [],
        );
        insuranceDetails = { ...insuranceDetails, ...insurancePremium };
        updatedData.insuranceDetails = insuranceDetails;
        const feesIncome =
          netApprovedAmount *
            (GLOBAL_CHARGES.WITH_INSURANCE_PROCESSING_FEES / 100) +
          doc_charge_amt +
          insurance_fee +
          risk_assessment_charge;
        updatedData.loanFees = feesIncome + chargesWithInsurance.gst_amt;
        updatedData.feesIncome = Math.round(feesIncome);
      }
      // For users who opt-out for insurance (Default)
      else {
        updatedData.insuranceDetails = {};
        updatedData.nomineeDetail = null;
        updatedData.charges = chargesWithoutInsurance;
        chargesDetails.appliedCharges = chargesWithoutInsurance;
        updatedData.processingFees =
          GLOBAL_CHARGES.WITHOUT_INSURANCE_PROCESSING_FEES;
        const feesIncome =
          netApprovedAmount *
            (GLOBAL_CHARGES.WITHOUT_INSURANCE_PROCESSING_FEES / 100) +
          doc_charge_amt +
          insurance_fee +
          risk_assessment_charge;
        updatedData.loanFees = feesIncome + chargesWithoutInsurance.gst_amt;
        updatedData.feesIncome = Math.round(feesIncome);
      }
      const totalEMIs = emiData?.emiDays?.length ?? 0;
      if (!totalEMIs) return kInternalError;

      updatedData.stampFees = GLOBAL_CHARGES.STAMP_FEES;
      updatedData.chargesDetails = chargesDetails;
      updatedData.penaltyCharges = PENALTY_CHARGES;
      const updateResponse = await this.loanRepo.updateRowData(
        updatedData,
        loanId,
      );
      if (updateResponse == k500Error) return kInternalError;
      if (approvedLoanAmount)
        updatedData.approvedLoanAmount = +approvedLoanAmount;
      return {
        insuranceOptValue,
        loanId,
        userId,
        ...updatedData,
        ...emiData,
        loanAmount,
        insurance,
        emis: totalEMIs,
        delayInterestRate,
        ...manualSalaryData,
        emiSelectedDate: userSelectedEmiDate ?? salaryDate,
        salaryDate,
        chargesWithInsurance,
        chargesWithoutInsurance,
        anummIntrest: eligibilityDetails?.anummIntrest,
        interestRate,
      };
    } catch (error) {}
  }

  async getRiskAssessmentCharge(userId) {
    try {
      const attr = ['id', 'cibilScore', 'plScore'];
      const opts = { where: { userId }, order: [['id', 'DESC']] };
      const cibilData = await this.cibilScoreRepo.getRowWhereData(attr, opts);
      if (cibilData === k500Error) return kInternalError;
      const cibilScore = cibilData?.cibilScore;
      const plScore = cibilData?.plScore;
      if (!cibilScore) return kParamMissing('cibilScore or plScore');
      let riskAssessmentPr;
      if (cibilScore <= 699)
        riskAssessmentPr = GLOBAL_CHARGES.RISKASS_PER_CIBIL_DW699;
      else if (cibilScore >= 700 && cibilScore <= 799)
        riskAssessmentPr = GLOBAL_CHARGES.RISKASS_PER_CIBIL_UP699;
      else if (cibilScore >= 800)
        riskAssessmentPr = GLOBAL_CHARGES.RISKASS_PER_CIBIL_UP799;
      return { riskAssessmentPr, cibilScore, plScore };
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  private async getDataForRefreshCalculation(loanId): Promise<any> {
    if (!loanId || isNaN(+loanId)) return kInvalidParamValue('loanId');

    // Query preparation
    const loanAttr = [
      'eligibilityDetails',
      'userId',
      'insuranceDetails',
      'interestRate',
      'loanStatus',
      'netApprovedAmount',
      'approvedLoanAmount',
      'loanAmount',
      'netSoftApproval',
      'esign_id',
      'insuranceOptValue',
    ];
    const options = { where: { id: +loanId } };

    // Query
    const loanData = await this.loanRepo.getRowWhereData(loanAttr, options);

    // Validate query data
    if (loanData == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (!loanData) return k422ErrorMessage(kNoDataFound);
    const loanStatus = loanData.loanStatus;
    if (loanStatus != 'InProcess' && loanStatus != 'Accepted')
      return k422ErrorMessage('Loan is not in progress');
    if (loanData.esign_id)
      return k422ErrorMessage('eSign is already generated');

    return loanData;
  }

  private async getApprovedSalaryDate(loanId) {
    try {
      // Check for customized admin selected salary date
      const attributes = ['newData'];
      const options = {
        order: [['id', 'DESC']],
        where: {
          newData: { [Op.ne]: '-' },
          loanId,
          type: 'Verification',
          subType: 'Salary Date',
        },
      };

      const changedData = await this.changeLogsRepo.getRowWhereData(
        attributes,
        options,
      );
      if (changedData == k500Error) return kInternalError;
      if (changedData && !isNaN(changedData.newData))
        return +changedData.newData;

      const bankAttr = ['salaryDate'];
      const bankOptions = { order: [['id', 'DESC']], where: { loanId } };
      const bankData = await this.bankingRepo.getRowWhereData(
        bankAttr,
        bankOptions,
      );
      if (bankData == k500Error) return kInternalError;
      if (!bankData) return k422ErrorMessage('No bankData found');
      return bankData.salaryDate;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  // Calculate score for user categorization
  private async calculateUserCategorizationScore(loanId) {
    try {
      const predictionInclude: { model; attributes? } = {
        model: PredictionEntity,
      };
      predictionInclude.attributes = ['categorizationTag'];
      const include = [predictionInclude];
      const attributes = ['id'];
      const options = { include, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      // Prevent duplication
      if (loanData.predictionData?.categorizationTag)
        return k422ErrorMessage('Prediction already exists');

      const categorizationScore = await this.sharedEligibility.calculateScore({
        loanId,
        type: kUsrCategories,
        updateScore: false,
      });
      if (categorizationScore?.message) return categorizationScore;
      // Create prediction data
      const createdData = await this.predictionRepo.createRowData({
        categorizationDetails: categorizationScore.categorizationDetails,
        categorizationScore: categorizationScore.categorizationScore,
        categorizationTag: categorizationScore.categorizationTag,
        loanId,
      });
      if (createdData == k500Error) return kInternalError;
      // Update loan data
      const updatedData = { predictionId: createdData.id };
      const updatedResponse = await this.loanRepo.updateRowData(
        updatedData,
        loanId,
      );
      if (updatedResponse == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkIfUserCanSelectEmiDate(loanId, salaryDate) {
    try {
      const eligibleEmiDates = kMonthDates;

      // Currently any user can selects the emi date (might get change in future)
      if (GLOBAL_FLOW.EMI_SELECTION_IN_APP == 'ALL')
        return { canSelectEmiDate: true, eligibleEmiDates, showCalendar: true };
      else if (GLOBAL_FLOW.EMI_SELECTION_IN_APP == 'NONE')
        return { canSelectEmiDate: false };

      // Calculate score for user categorization
      await this.calculateUserCategorizationScore(loanId);

      try {
        // Check loan data
        const predictionInclude: { model; attributes? } = {
          model: PredictionEntity,
        };
        predictionInclude.attributes = ['categorizationTag'];
        const include = [predictionInclude];
        const attributes = ['completedLoan'];
        const options = { include, where: { id: loanId } };
        const loanData = await this.loanRepo.getRowWhereData(
          attributes,
          options,
        );
        if (loanData === k500Error) return kInternalError;
        if (!loanData) return k422ErrorMessage(kNoDataFound);

        const incrementDates = [];
        const decrementDates = [];
        for (const date of kMonthDates) {
          if (Math.abs(date - salaryDate) <= 3) {
            incrementDates.push(date);
          } else if (
            (salaryDate >= 28 && date <= salaryDate + 3 - 31) ||
            (salaryDate <= 3 && date >= salaryDate - 3 + 31)
          ) {
            decrementDates.push(date);
          }
        }

        let eligibleEmiDates = decrementDates.concat(incrementDates);

        const upperArray = [];
        const belowArray = [];
        if (salaryDate > 28) {
          eligibleEmiDates.forEach((el) => {
            if (el != salaryDate) {
              let finalDiff = 0;
              eligibleEmiDates.forEach((subEl) => {
                if (el != subEl) {
                  const diff = subEl - el;
                  if (finalDiff < diff) {
                    finalDiff = diff;
                  }
                }
              });
              if (finalDiff >= 6) {
                belowArray.push(el);
              } else {
                upperArray.push(el);
              }
            }
          });
          upperArray.push(salaryDate);
          upperArray.sort((a, b) => a - b);
          eligibleEmiDates = upperArray.concat(belowArray);
        }
        // Below commented code might needed in future, Please do not remove this
        // const incrementDates = [];
        // const decrementDates = [];
        // let skipLastIncrementDate = false;
        // for (let index = 1; index <= 8; index++) {
        //   // Increment date
        //   let targetDate = new Date(salaryDate);
        //   if (targetDate.getDate() != salaryDate && index == 1) {
        //     incrementDates.push(targetDate.getDate());
        //     skipLastIncrementDate = true;
        //   }
        //   if (index != 8 || !skipLastIncrementDate) {
        //     targetDate.setDate(targetDate.getDate() + index);
        //     const incrementDate = targetDate.getDate();
        //     incrementDates.push(incrementDate);
        //   }

        //   // Decrement date
        //   targetDate = new Date(salaryDate);
        //   targetDate.setDate(targetDate.getDate() - index);
        //   const decrementDate = targetDate.getDate();
        //   decrementDates.push(decrementDate);
        //   if (index == 8 && skipLastIncrementDate) {
        //     targetDate = new Date(salaryDate);
        //     targetDate.setDate(targetDate.getDate() - (index + 1));
        //     const decrementDate = targetDate.getDate();
        //     decrementDates.push(decrementDate);
        //   }
        // }
        // decrementDates.reverse();
        // const eligibleEmiDates = decrementDates.concat(incrementDates);
        return { canSelectEmiDate: true, eligibleEmiDates };
      } catch (error) {
        return { canSelectEmiDate: false };
      }
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  // EMI amount calculation -> EC 2.0.0
  private calculateEMIsBasedOnAmount(
    approvedAmount,
    installmentDays: any[],
    installmentDate: any[],
    totalDays,
    interestRate,
  ) {
    let approvedAmt = approvedAmount;
    const emiData: any = [];
    const perDay = this.typeService.manageAmount(approvedAmount / totalDays);
    const totalParts = installmentDays.length;
    const totalInterestAmount = this.typeService.manageAmount(
      ((approvedAmount * interestRate) / 100) * totalDays,
    );
    let totalInterestAmt = 0;
    let totalEmiAmount = 0;
    let totalPrincipalAmt = 0;
    for (let index = 0; index < installmentDays.length; index++) {
      let principalAmt = this.typeService.manageAmount(
        index === installmentDays.length - 1
          ? approvedAmt
          : approvedAmount / totalParts,
      );
      let interestAmt = totalInterestAmount / totalParts;
      totalPrincipalAmt += principalAmt;
      totalInterestAmt += this.typeService.manageAmount(interestAmt);
      totalEmiAmount +=
        this.typeService.manageAmount(principalAmt) +
        this.typeService.manageAmount(interestAmt);
      approvedAmt -= this.typeService.manageAmount(principalAmt);

      emiData.push({
        Date: installmentDate[index],
        Emi:
          this.typeService.manageAmount(principalAmt) +
          this.typeService.manageAmount(interestAmt),
        Days: installmentDays[index],
        PrincipalCovered: principalAmt,
        InterestCalculate: this.typeService.manageAmount(interestAmt),
        RateofInterest: parseFloat(interestRate).toFixed(3) + '%',
      });
    }
    totalPrincipalAmt = this.typeService.manageAmount(totalPrincipalAmt);
    return {
      emiData,
      totalEmiAmount,
      totalInterestAmt,
      perDay,
      totalPrincipalAmt,
    };
  }

  async isLastOneDelayed(userId: string) {
    try {
      const loanData: any = await this.getLastCompletedLoan(userId);
      if (!loanData || loanData === k500Error) return;
      const findData = loanData.emiData.find(
        (e) => e.payment_due_status === '1',
      );
      let isCompleted = false;
      if (!findData && loanData) isCompleted = true;
      const amount = loanData.netApprovedAmount;
      if (findData) return { amount, isDelay: true, isCompleted };
      else return { amount, isDelay: false, isCompleted };
    } catch (error) {
      return;
    }
  }

  private async getLastCompletedLoan(userId: string) {
    try {
      const attri = ['id', 'netApprovedAmount'];
      const where: any = { userId, loanStatus: 'Complete' };
      const attributes = ['payment_due_status'];
      const include = [{ model: EmiEntity, attributes }];
      const options = { where, include, order: [['id', 'DESC']] };
      return await this.loanRepo.getRowWhereData(attri, options);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region get Insurance Data
  async getInsuranceDataForUser(userId, netApprovedAmount) {
    try {
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = ['aadhaarDOB'];
      const option = { where: { id: userId }, include: [kycInclude] };
      const att = ['id'];
      const result = await this.userRepo.getRowWhereData(att, option);
      if (!result || result == k500Error) return kInternalError;
      const aadhaarDOB = result?.kycData?.aadhaarDOB;
      if (!aadhaarDOB) return k422ErrorMessage(kSomthinfWentWrong);
      const age = this.typeService.getAgeFromAadhar(aadhaarDOB);
      if (!age) return k422ErrorMessage(kSomthinfWentWrong);
      const valueInsurance =
        await this.commonSharedService.refreshInsuranceArray();
      let keys = Object.keys(valueInsurance?.value);
      let key;
      keys.forEach((ele) => {
        if (+ele <= netApprovedAmount) key = ele;
      });
      if (!key) key = '10000'; // Default to the smallest loan amount object if netApprovedAmount is less than 10000
      return valueInsurance.value[key];
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }
  //#endregion

  //#region get premium Amount
  private getPremiumAmount(insurance, emiData) {
    let emiAmount = Math.round(emiData[0].Emi / 100) * 100;
    let EMIP_PREMIUM = this.typeService.manageAmount(
      (emiAmount * insurance.EMIP) / 100,
    );
    let premiumDetails: any = {};
    if (
      INSURANCE_SERVICES.ACCEDENT_AND_EMIP == true &&
      INSURANCE_SERVICES.LOSS_OF_JOB == true
    ) {
      premiumDetails.planASumInsured = insurance.GPA.amount;
      premiumDetails.planAPremium = insurance.GPA.premium;
      premiumDetails.planBSumInsured = emiAmount;
      premiumDetails.planBPremium = EMIP_PREMIUM;
      premiumDetails.planCSumInsured = insurance.LOJ.amount;
      premiumDetails.planCPremium = insurance.LOJ.premium;
      premiumDetails.totalPremium = this.typeService.manageAmount(
        insurance.GPA.premium + EMIP_PREMIUM + insurance.LOJ.premium,
      );
    } else if (
      INSURANCE_SERVICES.ACCEDENT_AND_EMIP == true &&
      INSURANCE_SERVICES.LOSS_OF_JOB == false
    ) {
      premiumDetails.planASumInsured = insurance.GPA.amount;
      premiumDetails.planAPremium = insurance.GPA.premium;
      premiumDetails.planBSumInsured = emiAmount;
      premiumDetails.planBPremium = EMIP_PREMIUM;
      premiumDetails.totalPremium = this.typeService.manageAmount(
        insurance.GPA.premium + EMIP_PREMIUM,
      );
    } else if (
      INSURANCE_SERVICES.LOSS_OF_JOB == true &&
      INSURANCE_SERVICES.ACCEDENT_AND_EMIP == false
    ) {
      premiumDetails.planCSumInsured = insurance.LOJ.amount;
      premiumDetails.planCPremium = insurance.LOJ.premium;
      premiumDetails.totalPremium = this.typeService.manageAmount(
        insurance.LOJ.premium,
      );
    }
    premiumDetails.plane = insurance.plane;
    return premiumDetails;
  }
  //#endregion

  async calculateNUpdateEmiWaiver(
    amount: number,
    emiAmount: number,
    penalty: number,
    regInterestAmount: number,
    bounceCharge: number,
    dpdAmount: number,
    legalCharge: number,
    emiId: number,
    waiverAmount: number,
    closeTheEmi: boolean,
    emiData: any,
  ) {
    try {
      const waiverCovered = +amount + +waiverAmount;
      let waiver_penalty = 0;
      let waiver_emiAmount = 0;
      let waiver_bounce = 0;
      let waiver_penal = 0;
      let waiver_legal = 0;
      let waiver_regIntAmount = 0;

      // penalty update
      if (penalty <= amount) {
        amount -= penalty;
        waiver_penalty = penalty;
        penalty = 0;
      } else if (penalty > amount) {
        penalty -= amount;
        waiver_penalty = amount;
        amount = 0;
      }
      // legal charge update
      if (legalCharge <= amount) {
        amount -= legalCharge;
        waiver_legal = legalCharge;
        legalCharge = 0;
      } else if (legalCharge > amount) {
        legalCharge -= amount;
        waiver_legal = amount;
        amount = 0;
      }
      legalCharge += emiData.paidLegalCharge;
      // penal charge update
      if (dpdAmount <= amount) {
        amount -= dpdAmount;
        waiver_penal = dpdAmount;
        dpdAmount = 0;
      } else if (dpdAmount > amount) {
        dpdAmount -= amount;
        waiver_penal = amount;
        amount = 0;
      }
      dpdAmount += emiData.paidPenalCharge;
      // bounce charge update
      if (bounceCharge <= amount) {
        amount -= bounceCharge;
        waiver_bounce = bounceCharge;
        bounceCharge = 0;
      } else if (bounceCharge > amount) {
        bounceCharge -= amount;
        waiver_bounce = amount;
        amount = 0;
      }
      bounceCharge += emiData.paidBounceCharge;
      // defer charge update
      if (regInterestAmount <= amount) {
        amount -= regInterestAmount;
        waiver_regIntAmount = regInterestAmount;
        regInterestAmount = 0;
      } else if (regInterestAmount > amount) {
        regInterestAmount -= amount;
        waiver_regIntAmount = amount;
        amount = 0;
      }
      regInterestAmount += emiData.paidRegInterestAmount;
      // emi amount update
      if (emiAmount <= amount) {
        amount -= emiAmount;
        waiver_emiAmount = emiAmount;
        emiAmount = 0;
      } else if (emiAmount > amount) {
        emiAmount -= amount;
        waiver_emiAmount = amount;
        amount = 0;
      }
      emiAmount = parseFloat(emiAmount.toFixed(2));

      // gst calculation
      const gstBounceChargeAmount = bounceCharge - bounceCharge / 1.18;
      const gstPenalChargeAmount = dpdAmount - dpdAmount / 1.18;
      const gstLegalChargeAmount = legalCharge - legalCharge / 1.18;

      bounceCharge = bounceCharge - gstBounceChargeAmount;
      dpdAmount = dpdAmount - gstPenalChargeAmount;
      legalCharge = legalCharge - gstLegalChargeAmount;

      const updateData = {
        emi_amount: +emiAmount,
        penalty: +penalty.toFixed(2),
        regInterestAmount: +regInterestAmount.toFixed(2),
        bounceCharge: +bounceCharge.toFixed(2),
        gstOnBounceCharge: +gstBounceChargeAmount.toFixed(2),
        dpdAmount: +dpdAmount.toFixed(2),
        penaltyChargesGST: +gstPenalChargeAmount.toFixed(2),
        legalCharge: +legalCharge.toFixed(2),
        legalChargeGST: +gstLegalChargeAmount.toFixed(2),
      };
      if (closeTheEmi) updateData['paid_waiver'] = waiverCovered;
      else updateData['unpaid_waiver'] = waiverCovered;
      const updateResult = await this.emiRepo.updateRowData(updateData, emiId);
      if (!updateResult || updateResult == k500Error || updateResult[0] !== 1)
        return kInternalError;
      return {
        updatedOutstandingAmount:
          +emiAmount +
          +penalty +
          +regInterestAmount +
          +bounceCharge +
          +gstBounceChargeAmount +
          +dpdAmount +
          +gstPenalChargeAmount +
          +legalCharge +
          +gstLegalChargeAmount,
        waiver_emiAmount,
        waiver_penalty,
        waiver_regIntAmount,
        waiver_bounce,
        waiver_penal,
        waiver_legal,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // prepare EMI Details
  async prepareEMIDetails(loanData) {
    try {
      // Part-Pay Info
      const isPartPayEnable = loanData?.isPartPayment ?? 0;
      let foreclosureCharges = 0;
      const partPayEnabledBy = loanData?.partPayEnabledBy ?? SYSTEM_ADMIN_ID;
      const adminInfo1 = await this.commonSharedService.getAdminData(
        partPayEnabledBy,
      );
      let isEligibleForPartPay = false;
      // Checking for Is There Active Link for Settlement Or Loan Closure Offfer
      const loanId = loanData?.id;
      let isLoanClosure = false;
      let isLoanSettled = false;
      if (
        (loanData?.loanClosureMailCount ?? 0) > 0 ||
        (loanData?.settlementMailCount ?? 0) > 0
      ) {
        const link = await this.repoManager.getRowWhereData(
          PaymentLinkEntity,
          ['mailType'],
          {
            where: { loanId, isActive: true },
            order: [['id', 'DESC']],
          },
        );
        isLoanSettled = link && link?.mailType == '1' ? true : false;
        isLoanClosure = link && link?.mailType == '2' ? true : false;
      }
      let isEligibleForClosureOffer = false;
      // Loan Closure Offer Info
      const loanClosureOfferEnabledBy =
        loanData?.loanClosureEnabledBy ?? SYSTEM_ADMIN_ID;
      const loanClosureMailCount = loanData?.loanClosureMailCount ?? 0;
      const adminInfo2 = await this.commonSharedService.getAdminData(
        loanClosureOfferEnabledBy,
      );
      let loanClosureEnabledAdmin = adminInfo2?.fullName;
      // Loan Settlement Offer
      const loanSettlementEnabledBy =
        loanData?.loanSettlementEnabledBy ?? SYSTEM_ADMIN_ID;
      const settlementMailCount = loanData?.settlementMailCount ?? 0;
      const adminInfo3 = await this.commonSharedService.getAdminData(
        loanSettlementEnabledBy,
      );
      let loanSettleEnabledAdmin = adminInfo3?.fullName;
      const emiData = loanData?.emiData;
      const Modification =
        loanData?.penaltyCharges?.MODIFICATION_CALCULATION ?? false;
      emiData.sort((a, b) => a.id - b.id);
      let transData = loanData?.transactionData ?? [];
      let totalReceived = 0;
      transData.filter((el) => {
        if (el?.status == kCompleted) totalReceived += el?.paidAmount;
      });
      totalReceived = Math.round(totalReceived);
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
              element.emiId &&
              element.emiId == refundData.emiId &&
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
          (el) =>
            el?.type !== 'REFUND' &&
            extraPayment?.transactionId !== el?.transactionId,
        );
      }
      transData.sort((a, b) => a.id - b.id);
      let totalReceivable = 0;
      let totalRemaining = 0;
      let delayDays = 0;
      let remainingCharges = 0;
      let unPaidLegalCharge = 0;
      let loanStatus = 'OnTime';
      let paidBouncCharge = 0;
      let unPaidBounceCharge = 0;
      let unPaidDeferredAmount = 0;
      let paidDiferredAmount = 0;
      let unpaidPenalCharge = 0;
      let paidPenalCharge = 0;

      const emiDetails = [];
      for (let index = 0; index < emiData.length; index++) {
        try {
          const emi = emiData[index];
          const legalChrage = emi?.legalCharge ?? 0;
          const legalChargeGst = emi?.legalChargeGST ?? 0;

          const emiId = emi.id;
          const status = emi.payment_status;
          const payments = this.getPaymentsDetails(emi, transData);

          // Calculating Forclosure Paid Charges
          if (payments.status == 'COMPLETED' && payments.type == 'FULLPAY') {
            foreclosureCharges =
              payments.forClosureAmount +
              payments.sgstForClosureCharge +
              payments.cgstForClosureCharge;
          }

          // calculate legal charge
          let totalLegalCharge = legalChrage + legalChargeGst,
            paidLegalCharge =
              (emi?.fullPayLegalCharge ?? 0) +
              (payments?.totalLegalCharge ?? 0);
          unPaidLegalCharge = totalLegalCharge - paidLegalCharge;
          unPaidLegalCharge = this.typeService.manageAmount(unPaidLegalCharge);

          //calculate penal charges
          const penalCharge =
            this.typeService.manageAmount(emi?.dpdAmount ?? 0) +
            (emi?.penaltyChargesGST ?? 0);
          paidPenalCharge =
            (payments?.totalPenaltyCharges ?? 0) + (emi.fullPayPenal ?? 0);
          unpaidPenalCharge = penalCharge - paidPenalCharge;
          unpaidPenalCharge = this.typeService.manageAmount(unpaidPenalCharge);
          // caculate bounceCharge
          const bounceCharge = emi?.bounceCharge ?? 0;
          const gstBounceCharge = emi?.gstOnBounceCharge ?? 0;
          let totalBounceCharge = bounceCharge + gstBounceCharge;
          paidBouncCharge =
            (payments?.totalBounceCharge ?? 0) + (emi?.fullPayBounce ?? 0);
          unPaidBounceCharge = this.typeService.manageAmount(
            totalBounceCharge - paidBouncCharge,
          );

          //calculate deferred interest
          let deferredAmount = emi?.regInterestAmount ?? 0;
          deferredAmount = this.typeService.manageAmount(deferredAmount);
          paidDiferredAmount =
            (payments?.totalDefInterestAmount ?? 0) +
            (emi?.fullPayRegInterest ?? 0);
          unPaidDeferredAmount = deferredAmount - paidDiferredAmount;
          unPaidDeferredAmount =
            this.typeService.manageAmount(unPaidDeferredAmount);

          let totalPenalty = (emi.totalPenalty ?? 0) - totalBounceCharge;
          if (totalPenalty < 0) totalPenalty = 0;

          const penaltyDays = emi?.penalty_days ?? 0;
          if (penaltyDays > 0) isEligibleForClosureOffer = true;
          if (penaltyDays > delayDays && status == '0') delayDays = penaltyDays;
          if (emi?.payment_due_status == '1') loanStatus = 'Delay';
          // is Eligible for Part pay(Admin Part pay button eligiblity)
          if (status == '0' && penaltyDays > 0) isEligibleForPartPay = true;
          let principal = emi.principalCovered;
          principal = this.typeService.manageAmount(principal);
          let interest = emi.interestCalculate;
          interest = this.typeService.manageAmount(interest);
          const emiAmount = principal + interest;
          const penalty = Math.round(emi?.penalty ?? 0);
          const fullPayEmi = emi.fullPayPrincipal + emi.fullPayInterest;
          let paidEmiAmt = Math.round(fullPayEmi + payments?.totalPaidEmi);

          let totalPaidAmt = Math.round(
            fullPayEmi +
              (emi.fullPayPenalty ?? 0) +
              (emi.fullPayBounce ?? 0) +
              (emi.fullPayPenal ?? 0) +
              (emi.fullPayLegalCharge ?? 0) +
              (emi.fullPayRegInterest ?? 0) +
              (payments?.totalPaidAmount ?? 0),
          );

          //calculate total unpaid emi
          let expectedAmount = emi?.principalCovered + emi?.interestCalculate;
          let paidAmount = emi?.paid_principal + emi?.paid_interest;
          let unpaidEmi = status == '1' ? 0 : expectedAmount - paidAmount;
          unpaidEmi = this.typeService.manageAmount(unpaidEmi);
          let paidPenalty = emi.fullPayPenalty + payments?.totalPaidPenalty;
          let unpaidPenalty = status == '1' ? 0 : penalty;
          unpaidPenalty = this.typeService.manageAmount(unpaidPenalty);

          remainingCharges +=
            unpaidPenalty + unPaidLegalCharge + unPaidBounceCharge;

          // if comming new user then change unpaidPenalty and paidPenalty for totalUnpaidAmt
          if (Modification) {
            unpaidPenalty = unpaidPenalCharge;
            paidPenalty = paidPenalCharge;
          }
          let totalUnpaidAmt =
            unpaidEmi +
            unpaidPenalty +
            unPaidLegalCharge +
            unPaidDeferredAmount;

          const waiveOff = Math.round(
            (emi?.waiver ?? 0) +
              (emi?.paid_waiver ?? 0) +
              (emi?.unpaid_waiver ?? 0),
          );
          const repaymentDate = payments?.completionDate
            ? this.typeService.getDateFormated(payments?.completionDate, '/')
            : '-';

          // condition for new user and old user
          if (Modification) {
            unpaidPenalty = unpaidPenalCharge;
            paidPenalty = paidPenalCharge;
            totalPenalty = penalCharge + emi?.waived_penal ?? 0;
            totalUnpaidAmt += unPaidBounceCharge;
            unpaidPenalty += unPaidBounceCharge;
            totalBounceCharge = totalBounceCharge + emi?.waived_bounce ?? 0;
            deferredAmount = deferredAmount + emi?.waived_regInterest ?? 0;
            totalLegalCharge = totalLegalCharge + emi?.waived_legal ?? 0;
          }

          paidLegalCharge = this.typeService.manageAmount(paidLegalCharge);
          totalPenalty = this.typeService.manageAmount(totalPenalty);
          if (totalBounceCharge > 590) totalBounceCharge = 590;
          totalLegalCharge = this.typeService.manageAmount(totalLegalCharge);
          deferredAmount = this.typeService.manageAmount(deferredAmount);
          paidPenalty = this.typeService.manageAmount(paidPenalty);
          unpaidPenalty =
            status == '1' && unpaidPenalty < 5
              ? 0
              : this.typeService.manageAmount(unpaidPenalty);

          totalPaidAmt = this.typeService.manageAmount(totalPaidAmt);
          totalUnpaidAmt = status === '1' ? 0 : totalUnpaidAmt;
          totalUnpaidAmt = this.typeService.manageAmount(totalUnpaidAmt);
          paidEmiAmt = this.typeService.manageAmount(paidEmiAmt);
          unpaidEmi = this.typeService.manageAmount(
            unpaidEmi > 1 ? unpaidEmi : 0,
          );
          paidLegalCharge = this.typeService.manageAmount(paidLegalCharge);
          unPaidLegalCharge =
            status == '1' && unPaidLegalCharge < 5
              ? 0
              : this.typeService.manageAmount(unPaidLegalCharge);
          paidBouncCharge = this.typeService.manageAmount(paidBouncCharge);
          unPaidBounceCharge =
            status == '1' && unPaidBounceCharge < 5
              ? 0
              : this.typeService.manageAmount(unPaidBounceCharge);

          paidDiferredAmount =
            this.typeService.manageAmount(paidDiferredAmount);
          unPaidDeferredAmount =
            status == '1' && unPaidDeferredAmount < 5
              ? 0
              : this.typeService.manageAmount(unPaidDeferredAmount);
          // prepare data
          const objData: any = {
            id: emiId,
            status: status == '1' ? 'PAID' : 'UNPAID',
            emiDate: this.typeService.getDateFormated(emi.emi_date, '/'),
            emi_date: emi.emi_date,
            repaymentDate,
            emiAmount,
            principal,
            interest,
            penaltyDays,
            totalBounceCharge,
            totalPenalty,
            paidPenalty,
            unpaidPenalty,
            totalEmiAmount:
              emiAmount +
              totalPenalty +
              totalBounceCharge +
              totalLegalCharge +
              deferredAmount,
            totalPaidAmount: totalPaidAmt,
            totalUnpaidAmount: totalUnpaidAmt,
            paidEmiAmount: paidEmiAmt,
            unpaidEmi,
            unPaidLegalCharge,
            paidLegalCharge,
            paidBouncCharge,
            unPaidBounceCharge,
            paidDiferredAmount,
            paymentType: payments?.type ?? '-',
            legalCharge: totalLegalCharge ?? 0,
            deferredInterest: deferredAmount ?? 0,
            unPaidDeferredAmount,
          };

          if (penaltyDays > 0 || status == '1')
            objData.dueStatus =
              penaltyDays > 0 && status == '1'
                ? 'DELAY'
                : penaltyDays > 0
                ? 'DEFAULT'
                : 'ONTIME';
          objData.waiveOff = waiveOff;

          totalReceivable +=
            emiAmount +
            totalPenalty +
            totalBounceCharge +
            totalLegalCharge +
            deferredAmount;

          totalRemaining += totalUnpaidAmt;
          emiDetails.push(objData);
        } catch (error) {}
      }
      if (loanData?.loanStatus == 'Complete') isEligibleForClosureOffer = false;
      return {
        EMIData: emiDetails,
        interestRate: loanData?.interestRate ?? '-',
        disbursementDate: this.typeService.getDateFormated(
          loanData?.loan_disbursement_date,
          '/',
        ),
        totalReceivable,
        totalReceived,
        totalRemaining,
        delayDays,
        remainingCharges,
        loanStatus,
        // Part Pay Info
        isPartPayEnable: isPartPayEnable == 1 ? true : false,
        isEligibleForPartPay,
        adminName: adminInfo1?.fullName,
        // Flag For Both Settlement and Loan Closure Offer
        isEligibleForClosureOffer,
        // Loan Closure Offer
        loanClosureMailCount,
        isLoanClosure,
        loanClosureEnabledAdmin,
        // Loan Settlement
        settlementMailCount,
        isLoanSettled,
        loanSettleEnabledAdmin,
        foreclosureCharges,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getPaymentsDetails(emiData, transData) {
    try {
      const emiId = emiData?.id;
      let paymentDetail: any = {};
      let totalPaidAmount = 0;
      let totalPaidEmi = 0;
      let totalPaidPenalty = 0;
      let totalLegalCharge = 0;
      let totalBounceCharge = 0;
      let totalDefInterestAmount = 0;
      let totalPenaltyCharges = 0;
      const payments = transData.filter(
        (item) => emiId == item.emiId || !item.emiId,
      );
      for (let index = 0; index < payments.length; index++) {
        try {
          const ele = payments[index];
          const paidEmiAmount = ele.principalAmount + ele.interestAmount;
          if (ele.type !== 'FULLPAY') {
            totalPaidAmount += ele.paidAmount;
            totalPaidEmi += paidEmiAmount;
            totalPaidPenalty += ele.penaltyAmount;
            totalLegalCharge +=
              (ele?.legalCharge ?? 0) +
              (ele?.sgstOnLegalCharge ?? 0) +
              (ele?.cgstOnLegalCharge ?? 0);
            totalBounceCharge +=
              (ele?.bounceCharge ?? 0) +
              (ele?.sgstOnBounceCharge ?? 0) +
              (ele?.cgstOnBounceCharge ?? 0);
            totalDefInterestAmount += ele?.regInterestAmount ?? 0;
            totalPenaltyCharges +=
              (ele?.penalCharge ?? 0) +
              (ele?.cgstOnPenalCharge ?? 0) +
              (ele?.sgstOnPenalCharge ?? 0);
          }
          if (emiId == ele?.emiId) paymentDetail = ele;
          else if (!paymentDetail?.type) paymentDetail = ele;
        } catch (error) {}
      }
      paymentDetail.totalPaidAmount = Math.round(totalPaidAmount);
      paymentDetail.totalPaidEmi = Math.round(totalPaidEmi);
      paymentDetail.totalPaidPenalty = Math.round(totalPaidPenalty);
      paymentDetail.totalLegalCharge = Math.round(totalLegalCharge);
      paymentDetail.totalBounceCharge = Math.round(totalBounceCharge);
      paymentDetail.totalDefInterestAmount = Math.round(totalDefInterestAmount);
      paymentDetail.totalPenaltyCharges = Math.round(totalPenaltyCharges);
      return paymentDetail;
    } catch (error) {}
  }

  private newEmiBifurcation(
    approvedAmount,
    installmentDays: any[],
    installmentDate: any[],
    totalDays,
    interestRate,
    anummInterest,
  ) {
    try {
      // calculate daily interestRate
      let annualInterestRate = anummInterest / 100;
      const emiData = [];
      // Calculate the total number of installments
      const numInstallments = installmentDays.length;

      // Calculate  intesest rate
      const monthlyInterestRate: any = annualInterestRate / 12;

      //calculate emi amount
      const emiAmt = this.typeService.manageAmount(
        approvedAmount *
          monthlyInterestRate *
          (Math.pow(1 + monthlyInterestRate, numInstallments) /
            (Math.pow(1 + monthlyInterestRate, numInstallments) - 1)),
      );
      const perDay = Math.round(emiAmt / totalDays);
      let totalInterestAmount = 0;
      let totalPrincipalAmt = 0;
      let totalEmiAmount = 0;
      let consistentAmt;
      let remainingAmount = 0;

      //calculate principal and interest amount
      for (let i = 0; i < installmentDays.length; i++) {
        try {
          const isLastLength = i === installmentDays.length - 1;
          const isFirstIndex = i === 0;
          const ele = installmentDays[i];
          let interestAmt = this.typeService.manageAmount(
            approvedAmount * monthlyInterestRate,
          );
          let principalAmt = emiAmt - interestAmt;
          approvedAmount -= principalAmt;

          //if approveAmount is remaining then those amount manage in last emi principal amount
          if (isLastLength) principalAmt += approvedAmount;

          //if b/w first and last interst amount of emi then it manage in last emi of interest
          if (isFirstIndex) {
            consistentAmt = principalAmt + interestAmt;
          } else if (!isLastLength) {
            const consistentDiff = consistentAmt - (principalAmt + interestAmt);
            if (consistentDiff != 0) interestAmt += consistentDiff;
          }

          //caculate total principal, interest and emi
          totalPrincipalAmt += principalAmt;
          totalInterestAmount += interestAmt;

          totalEmiAmount += principalAmt + interestAmt;

          //push data
          emiData.push({
            Date: installmentDate[i],
            Emi: Math.round(principalAmt) + Math.round(interestAmt),
            Days: ele,
            PrincipalCovered: Math.round(principalAmt),
            InterestCalculate: Math.round(interestAmt),
            RateofInterest: parseFloat(interestRate).toFixed(3) + '%',
          });
        } catch (error) {}
      }

      totalEmiAmount = Math.round(totalEmiAmount);
      totalInterestAmount = Math.round(totalInterestAmount);
      totalPrincipalAmt = Math.round(totalPrincipalAmt);
      return { emiData, totalEmiAmount, totalInterestAmount, perDay };
    } catch (error) {
      console.log({ error });
      return k500Error;
    }
  }
}
