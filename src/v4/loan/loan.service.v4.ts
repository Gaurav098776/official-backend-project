// Imports
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import {
  DisbursementBanner,
  GlobalServices,
  MAX_DIS_TIME,
  MAX_DURATION,
  MINIMUM_INTEREST_FOR_FULL_PAY,
  APP_NAME,
  NBFC_ADDRESS,
  NBFC_NAME,
  SYSTEM_ADMIN_ID,
  UPI_SERVICE,
  disburseAmt,
  kInsuranceWaitingTag,
  valueInsurance,
  gIsPROD,
  UAT_PHONE_NUMBER,
  isStamp,
  LOAN_AGREEMENT_COOLINGOFF_PERIOD,
  GLOBAL_FLOW,
  kInsuranceWaitingTagNBFC,
  GLOBAL_RANGES,
  kSelectedLoanAmount,
  GLOBAL_CHARGES,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  KInsurancePolicy,
  kLspMsg91Templates,
  kMsg91Templates,
} from 'src/constants/objects';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  DisbursementSuccessBody,
  DisbursementSuccessBodyOnTime,
  DisbursementSuccessTitle,
  DisbursementSuccessTitleOnTime,
  kAutoDebit,
  kAutoDebitNotInitilize,
  kAutoDebitNotSuccessFull,
  kCompleted,
  kInitiated,
  kInternalPolicy,
  kLoanMaintainSufficientBalance,
  kNoDataFound,
  kPleaseSelectValidNomineeRelationshipCode,
  kValidPhone,
  kPaymentMode,
  healthPolicy,
  kCollectionPhone,
  kDuplicateLoan,
  kRuppe,
  kHelpContact,
  kCollectionEmail,
  kRazorpay,
  kErrorMsgs,
  KICICIUPI,
  kSupportMail,
  nbfcInfoStr,
  kLspNoReplyMail,
  KLspSupportMail,
  kNoReplyMail,
  NBFCPlayStoreLink,
  lspPlaystoreLink,
  NBFCAppStoreLink,
  lspAppStoreLink,
  kLspHelpContactAfterDisbursement,
  lojPolicy,
} from 'src/constants/strings';
import { EmiEntity } from 'src/entities/emi.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { ContactSharedService } from 'src/shared/contact.service';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { KycServiceV4 } from '../kyc/kyc.service.v4';
import { UserRepository } from 'src/repositories/user.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { Op } from 'sequelize';
import { regUUID } from 'src/constants/validation';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { EMIRepository } from 'src/repositories/emi.repository';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { BankingEntity } from 'src/entities/banking.entity';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { CryptService } from 'src/utils/crypt.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { PromoCodeService } from 'src/shared/promo.code.service';
import {
  kloanApprovalTemplate,
  kKeyFactStatementPath,
} from 'src/constants/directories';
import { EmiSharedService } from 'src/shared/emi.service';
import { StringService } from 'src/utils/string.service';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { EnvConfig } from 'src/configs/env.config';
import { RedisService } from 'src/redis/redis.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { PaymentLinkEntity } from 'src/entities/paymentLink.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class LoanServiceV4 {
  constructor(
    private readonly automation: AutomationService,
    private readonly commonSharedService: CommonSharedService,
    private readonly sharedContact: ContactSharedService,
    private readonly fileService: FileService,
    private readonly loanDeclineRepo: UserLoanDeclineRepository,
    private readonly kycService: KycServiceV4,
    private readonly masterRepo: MasterRepository,
    private readonly repository: LoanRepository,
    private readonly referenceRepo: ReferenceRepository,
    private readonly typeService: TypeService,
    private readonly strService: StringService,
    private readonly userRepo: UserRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly loanRepo: LoanRepository,
    private readonly uniqueConatctsRepo: UniqueConatctsRepository,
    private readonly promoCodeService: PromoCodeService,
    private readonly cryptService: CryptService,
    private readonly whatsAppService: WhatsAppService,
    // Repositories
    private readonly emiRepo: EMIRepository,
    private readonly insuranceRepo: InsuranceRepository,
    private readonly cibilScoreRepo: CibilScoreRepository,
    private readonly kycRepo: KYCRepository,
    private readonly disbursedRepo: DisbursmentRepository,
    private readonly addressRepo: AddressesRepository,
    // Repositories
    private readonly subscriptionRepo: SubscriptionRepository,
    // Shared services
    private readonly sharedCalculation: CalculationSharedService,
    private readonly sharedEligiblityService: EligibilitySharedService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly sharedEmi: EmiSharedService,
    private readonly sharedTransactionService: SharedTransactionService,
    private readonly redisService: RedisService,
    private readonly repoManager: RepositoryManager,
  ) {}

  async rejectReasonList(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');

      // Get reason list
      const attributes = ['id', 'userDeclineReasonTitle'];
      const options = {
        where: { userDeclineStatus: '0' },
      };
      const reasonList = await this.loanDeclineRepo.getTableWhereData(
        attributes,
        options,
      );
      if (reasonList == k500Error) return kInternalError;
      return reasonList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async decline(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const reasonId = reqData.reasonId;
      if (!reasonId) return kParamMissing('reasonId');
      let reason = reqData?.reason;
      // if (!reason) return kParamMissing('reason');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      if (reasonId != 5) {
        const dReason = await this.loanDeclineRepo.getRowWhereData(
          ['userDeclineReasonTitle'],
          { where: { id: reasonId } },
        );
        if (dReason === k500Error) return kInternalError;
        reason = dReason?.userDeclineReasonTitle;
      }
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['loanStatus'];
      const include = [loanInclude];
      const attributes = ['id', 'status'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage('No data found');
      const statusData = masterData.status ?? {};

      // Loan validation
      const loanStatus = statusData.loan;
      const loanData = masterData.loanData ?? {};
      // Loan active
      if (loanStatus == 6 || loanData.loanStatus == 'Active')
        return k422ErrorMessage(
          'You can not reject the loan as the loan is active',
        );
      // Loan complete
      else if (loanStatus == 7 || loanData.loanStatus == 'Complete')
        return k422ErrorMessage(
          'You can not reject the loan as the loan is already completed',
        );
      // e-Sign generated
      else if (statusData.eSign != -1)
        return k422ErrorMessage(
          'You can not reject the loan as the eSign is already generated',
        );

      // Update loan data
      let updatedData: any = {
        loanStatus: 'Rejected',
        manualVerification: '2',
        declineId: reasonId,
        userReasonDecline: reason,
        verifiedDate: this.typeService.getGlobalDate(new Date()).toJSON(),
      };
      let updateResult = await this.repository.updateRowData(
        updatedData,
        loanId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      statusData.loan = 2;
      statusData.eligibility = 2;
      updatedData = { status: statusData };
      updateResult = await this.masterRepo.updateRowData(
        updatedData,
        masterData.id,
      );
      if (updateResult == k500Error) return kInternalError;
      await this.sharedEligiblityService.checkAndRejectSteps(userId, reason);
      return { needUserInfo: true };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Update the salary date if user is eligible for that
  async updateEmiDate(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    if (!regUUID(userId)) return kInvalidParamValue('userId');
    const emiDate = reqData.emiDate;
    if (!emiDate) return kParamMissing('emiDate');
    if (isNaN(emiDate)) return kInvalidParamValue('emiDate');
    if (emiDate < 1 || emiDate > 31) return kInvalidParamValue('emiDate');
    const prepareScreen = reqData?.prepareScreen == true ? true : false;
    const typeOfDevice = reqData.typeOfDevice;

    // Get loan data from database
    const attributes = ['id', 'loanStatus', 'emiSelection', 'loanAmount'];
    const options = { order: [['id', 'DESC']], where: { userId } };
    const loanData = await this.loanRepo.getRowWhereData(attributes, options);
    if (loanData === k500Error) return kInternalError;
    if (!loanData) return k422ErrorMessage(kNoDataFound);

    // Validation
    const emiSelection = loanData.emiSelection ?? {};
    if (!emiSelection?.eligibleEmiDates) {
      return k422ErrorMessage(
        'Salary date change can not proceed at this moment!',
      );
    }
    // Web is having older calender ui
    if (
      !emiSelection.eligibleEmiDates.includes(emiDate) &&
      typeOfDevice != '2'
    ) {
      return kInvalidParamValue('emiDate');
    }

    const loanId = loanData.id;
    reqData.loanId = loanId;
    const updatedData = {
      emiSelection: {
        selectedOn: Math.floor(new Date().getTime() / 1000),
        selectedEmiDate: emiDate,
      },
    };
    await this.loanRepo.updateRowData(updatedData, loanId);
    // Refresh the emi calculation based on new salary date
    const score = await this.sharedEligiblityService.getAmountRange(loanId, {});
    if (score.message) return score;

    reqData.amount = +(score?.approvedAmount ?? loanData?.loanAmount);
    if (prepareScreen) return await this.acceptAmountCharges(reqData);
    return { score };
  }

  async acceptAmount(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const amount = reqData.amount;
      if (!amount) return kParamMissing('amount');
      const result = await this.sharedCalculation.acceptAmount(reqData);
      if (result?.ipDecline || result?.message) return result;
      /* Taking default value as true for not to affecting in between users
      when we go live with dynamic insurance flow */
      // KFS flow
      const kfsData = await this.getKeyFactStatement(loanId);
      if (kfsData.message) return kfsData;
      return { needUserInfo: true, kfsData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getKeyFactStatement(id) {
    try {
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = ['image'];
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'uniqueId'],
        include: [selfieInclude],
      };
      const attributes = [
        'id',
        'approvedDuration',
        'interestRate',
        'loanFees',
        'loanStatus',
        'manualVerification',
        'netEmiData',
        'netApprovedAmount',
        'stampFees',
        'userId',
        'charges',
        'insuranceDetails',
        'insuranceOptValue',
        'processingFees',
        'appType',
        'eligibilityDetails',
      ];
      const options = {
        where: { id },
        include: [userInclude],
      };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      const KFSData: any = await this.convertDataToObject(loanData);
      if (KFSData?.message) return KFSData;
      const path = kKeyFactStatementPath;
      const KFSDoc: any = await this.addDynamicValues(KFSData, path);
      if (KFSDoc.message) return KFSDoc;
      return KFSDoc;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async convertDataToObject(loanData) {
    try {
      const userData = loanData?.registeredUsers;
      const netEmiData = loanData?.netEmiData ?? [];
      const interestRate = loanData?.interestRate;
      let totalInterest = 0;
      let totalPrincipal = 0;
      let totalDays = 0;
      let totalRepayAmount = 0;
      let emiRepayAmount;
      let htmlData = ``;
      const parsedEmiData = netEmiData.map((item, i) => {
        const emi = JSON.parse(item);
        totalInterest += +emi?.InterestCalculate;
        totalPrincipal += +emi?.PrincipalCovered;
        const emiDate = this.typeService.dateToJsonStr(emi?.Date);
        totalDays += +emi.Days;
        totalRepayAmount += emi?.Emi;
        emiRepayAmount = this.typeService.amountNumberWithCommas(emi?.Emi);

        htmlData += `<tr><td style="border: 1px solid #000; border-collapse: collapse height: 25px; text-align: center; font-size: 12px;">${
          i + 1
        }</td><td style="border:1px solid #000; border-collapse: collapse; text-align: center; font-size: 12px;">${emiDate}</td><td style="border: 1px solid #000; border-collapse:collapse; text-align: center; font-size: 12px;">${kRuppe}${this.typeService.amountNumberWithCommas(
          emi.PrincipalCovered,
        )}</td><td style="border: 1px solid #000; border-collapse: collapse;text-align: center; font-size: 12px;">${kRuppe}${this.typeService.amountNumberWithCommas(
          emi.InterestCalculate,
        )}</td><td style="border: 1px solid #000; border-collapse: collapse; text-align: center; font-size: 12px;">${
          emi.Days
        }</td><td style="border: 1px solid #000; border-collapse: collapse; text-align: center; font-size: 12px;">${
          emi.RateofInterest
        }</td><td style="border: 1px solid #000; border-collapse: collapse;text-align: center; font-size: 12px;">${kRuppe}${emiRepayAmount}</td></tr>`;
        return emi;
      });
      totalInterest = +totalInterest.toFixed(2);
      totalPrincipal = +totalPrincipal.toFixed(2);
      let totalAmount = +totalInterest + +totalPrincipal;
      totalAmount = +totalAmount.toFixed(2);
      totalRepayAmount =
        this.typeService.amountNumberWithCommas(totalRepayAmount);
      totalInterest = this.typeService.amountNumberWithCommas(totalInterest);
      totalPrincipal = this.typeService.amountNumberWithCommas(totalPrincipal);

      htmlData += `<tr><td colspan="2" style="border: 1px solid #000; border-collapse:collapse; height: 25px; text-align: center; font-size: 12px;">Total</td><td style="border: 1px solid #000; border-collapse: collapse; text-align: center;font-size: 12px;">${kRuppe}${totalPrincipal}</td><td style="border: 1px solid #000;border-collapse: collapse; text-align: center; font-size: 12px;">${kRuppe}${totalInterest}</td><td style="border: 1px solid #000; border-collapse: collapse;text-align: center; font-size: 12px;">${totalDays}</td><td style="border: 1px solid #000; border-collapse: collapse; text-align: center; font-size: 12px;">${interestRate}%</td><td style="border: 1px solid #000; border-collapse: collapse; text-align: center;font-size: 12px;">${kRuppe}${totalRepayAmount}</td></tr>`;

      const netApprovedAmount = +loanData?.netApprovedAmount;
      loanData.netApprovedAmount = this.typeService.amountNumberWithCommas(
        parseFloat(loanData?.netApprovedAmount).toFixed(2),
      );
      const insurance_fee = loanData?.charges?.insurance_fee ?? 0;
      const riskAssessmentPr = loanData?.charges?.risk_assessment_per;
      const risk_assessment_charge =
        loanData?.charges?.risk_assessment_charge ?? 0;
      const loanFees =
        '₹' +
        this.typeService.amountNumberWithCommas(
          (
            loanData?.loanFees -
            loanData?.charges['gst_amt'] -
            loanData?.charges['doc_charge_amt'] -
            insurance_fee -
            risk_assessment_charge
          ).toFixed(2),
        );
      const stampFees =
        '₹' +
        this.typeService.amountNumberWithCommas(loanData?.stampFees.toFixed(2));
      let anumm = 146;
      const documentChargeAmount =
        '₹' +
        this.typeService.amountNumberWithCommas(
          loanData?.charges['doc_charge_amt'].toFixed(2),
        );
      const sgstChargeAmount =
        '₹' +
        this.typeService.amountNumberWithCommas(
          loanData?.charges['sgst_amt'].toFixed(2),
        );
      const cgstChargeAmount =
        '₹' +
        this.typeService.amountNumberWithCommas(
          loanData?.charges['cgst_amt'].toFixed(2),
        );
      let penaltyPerAnnum = anumm * 2;
      const eligibilityDetails = loanData?.eligibilityDetails;
      const anummIntrest = eligibilityDetails?.anummIntrest;
      anumm = anummIntrest ? anummIntrest : +loanData.interestRate * 365;
      let disbursedAmount = 0;
      disbursedAmount = netApprovedAmount - +loanData?.loanFees.toFixed(2);
      disbursedAmount = disbursedAmount - +loanData?.stampFees.toFixed(2);
      disbursedAmount = this.typeService.manageAmount(
        disbursedAmount,
        disburseAmt,
      );
      let aprCharges = 0;
      totalInterest = parseFloat(
        totalInterest.toString().replace('₹', '').replace(/,/g, ''),
      );
      const percentageChange =
        ((totalInterest + +loanData?.loanFees) / disbursedAmount) * 100;
      aprCharges = (percentageChange * 365) / +loanData.approvedDuration;
      aprCharges = +aprCharges.toFixed(2);
      const appType = loanData.appType;
      const showLendingPartner = appType == 0 ? true : false;
      const signingDate = this.typeService.getDateFormatted(new Date());
      const KFSData: any = {};
      KFSData.selfieImg = userData?.selfieData?.image;
      KFSData.signingDate = signingDate;
      KFSData.fullName = userData?.fullName;
      KFSData.nbfcName = NBFC_NAME;
      KFSData.loanId = loanData?.id;
      KFSData.customerId = userData?.uniqueId;
      KFSData.netApporvedAmount = '₹' + loanData?.netApprovedAmount;
      KFSData.approvedDay = loanData?.approvedDuration;
      KFSData.interest = loanData?.interestRate;
      KFSData.emiCount = parsedEmiData.length;
      KFSData.perAnnumInterest = anumm.toFixed(3);
      KFSData.signingDate1 = signingDate;
      KFSData.TOTALINTEREST =
        ' ₹' + this.typeService.amountNumberWithCommas(totalInterest) + '/-';

      const endDate = this.typeService.getDateFormatted(
        parsedEmiData[parsedEmiData.length - 1]?.Date,
      );
      KFSData.emiEndDate = endDate;
      KFSData.PROCESSING_PERC = loanData.processingFees;
      KFSData.fees = loanFees;
      KFSData.DOC_PERC = loanData?.charges['doc_charge_per'] ?? '';
      KFSData.documentCharges = documentChargeAmount;
      KFSData.sgstCharges = sgstChargeAmount;
      KFSData.cgstCharges = cgstChargeAmount;
      KFSData.ecsCharges = '₹ 500';
      penaltyPerAnnum = anumm * 2;
      KFSData.penalty1 = (+loanData?.interestRate).toFixed(3);
      KFSData.foreclosureCharge = GLOBAL_CHARGES.FORECLOSURE_PERC;
      KFSData.perAnnumPenalty = penaltyPerAnnum.toFixed(3);
      KFSData.RISK_PERC = riskAssessmentPr ?? '';
      KFSData.riskAssessmentCharge = risk_assessment_charge ?? '';
      KFSData.legalCharge = this.typeService.amountNumberWithCommas(
        GLOBAL_CHARGES.LEGAL_CHARGE,
      );
      if (isStamp)
        KFSData.STAMP_OR_RISK_ASSESSMENT_CHARGES =
          kRuppe + (+stampFees).toFixed(2);
      else
        KFSData.STAMP_OR_RISK_ASSESSMENT_CHARGES =
          kRuppe + risk_assessment_charge.toFixed(2);
      KFSData.refName1 = '-';
      KFSData.refPhone1 = '-';
      KFSData.refPermissionDate1 = '-';
      KFSData.refGivenBy1 = '-';
      KFSData.refName2 = '-';
      KFSData.refPhone2 = '-';
      KFSData.refPermissionDate2 = '-';
      KFSData.refGivenBy2 = '-';
      KFSData.refName3 = '-';
      KFSData.refPhone3 = '-';
      KFSData.refPermissionDate3 = '-';
      KFSData.refGivenBy3 = '-';
      KFSData.refName4 = '-';
      KFSData.refPhone4 = '-';
      KFSData.refPermissionDate4 = '-';
      KFSData.refGivenBy4 = '-';
      KFSData.refName5 = '-';
      KFSData.refPhone5 = '-';
      KFSData.refPermissionDate5 = '-';
      KFSData.refGivenBy5 = '-';
      KFSData.helplinePhoneNumber = kHelpContact;
      KFSData.supportEmail = kSupportMail;
      KFSData.supportCollection = kCollectionEmail;

      /// insurance amount and data
      const tempInsurance_fee = insurance_fee
        ? '₹' +
          this.typeService.amountNumberWithCommas(insurance_fee.toFixed(2))
        : '-';
      let premiumAmount = loanData?.insuranceDetails?.totalPremium ?? 0;
      let isInsuranceCharge = premiumAmount > 0 ? true : false;
      if (premiumAmount)
        premiumAmount =
          '₹' +
          this.typeService.amountNumberWithCommas(premiumAmount.toFixed(2));
      else premiumAmount = '-';
      KFSData.premiumAmount = premiumAmount;
      KFSData.isInsuranceCharge = isInsuranceCharge;
      // User has opted out for insurance
      let insuranceBy = 'Care Health & Acko';
      if (loanData.insuranceOptValue == false) insuranceBy = '-';
      KFSData.insuranceBy = insuranceBy;
      KFSData.Cooling_off_period = `${LOAN_AGREEMENT_COOLINGOFF_PERIOD} Days`;
      KFSData.INSURANCE_FEES = tempInsurance_fee;
      KFSData.interestRatePerDay = loanData?.interestRate;
      KFSData.aprCharges = aprCharges;
      KFSData.disbursedAmt =
        kRuppe + this.typeService.amountNumberWithCommas(disbursedAmount);

      KFSData.showLendingPartner = showLendingPartner;
      KFSData.APPNAME = APP_NAME;
      KFSData.nbfcAddress = NBFC_ADDRESS;
      KFSData.htmlData = htmlData;
      KFSData.grievanceOfficer = EnvConfig.nbfc.nbfcGrievanceOfficer;
      KFSData.grievanceNumber = EnvConfig.number.grievanceNumber;
      KFSData.companyGrievanceEmail = EnvConfig.mail.grievanceMail;
      KFSData.nbfcLogo = EnvConfig.url.nbfcLogo;
      KFSData.nbfcIrmodel = EnvConfig.nbfc.nbfcIrmodel;

      return KFSData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async addDynamicValues(dynamicValues: any, filePath: string) {
    try {
      if (dynamicValues.selfieImage) {
        const fileName = new Date().getTime().toString() + '.png';
        const imagePath = './upload/' + fileName;
        try {
          const base64Content = await this.typeService.getBase64FromImgUrl(
            dynamicValues.selfieImage,
          );
          await fs.writeFileSync(imagePath, base64Content, 'base64');
        } catch (error) {
          console.log({ error });
        }
        const sty = 'style="border-radius:10px;height:90%;margin-top:10%"';
        dynamicValues.selfieCSS = sty;
        await this.fileService.removeFile(imagePath);
      }

      const file = await this.fileService.hbsHandlebars(
        filePath,
        dynamicValues,
      );
      if (file == k500Error) return file;

      return file;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async acceptKFS(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');

      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['loanStatus', 'netApprovedAmount'];
      const include = [loanInclude];
      const attributes = ['id', 'status', 'userId', 'dates', 'kfsStatus'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!masterData) return k422ErrorMessage(kNoDataFound);
      if (masterData == k500Error) return kInternalError;

      const masterId = masterData.id;
      const statusData = masterData.status ?? {};
      const dates = masterData.dates ?? {};
      const loanData = masterData.loanData ?? {};

      if (masterData.kfsStatus == 1)
        return k422ErrorMessage('Key fact statement can not accepted');
      else if (loanData.loanStatus != 'InProcess')
        return k422ErrorMessage('Key fact statement can not accepted');

      //Automation for Contact Reference
      const emiInclude = {
        model: EmiEntity,
        attributes: ['penalty_days'],
        required: true,
      };
      const loanOptions: any = {
        include: [emiInclude],
        where: {
          loanStatus: 'Complete',
          userId: masterData.userId,
        },
        order: [['id', 'DESC']],
      };
      const loanAttributes = ['id', 'loan_disbursement_date'];
      const lastLoan = await this.loanRepo.getRowWhereData(
        loanAttributes,
        loanOptions,
      );
      if (lastLoan === k500Error) return kInternalError;

      if (lastLoan) {
        const currentDate = this.typeService.getGlobalDate(new Date());
        const loanDisbursementDate = this.typeService.getGlobalDate(
          lastLoan?.loan_disbursement_date,
        );
        const dayDifference = this.typeService.dateDifference(
          currentDate,
          loanDisbursementDate,
        );
        const penaltyDays = lastLoan?.emiData.some(
          (emiItem) => emiItem.penalty_days > 0,
        );
        if (
          (dayDifference <= 90 && penaltyDays != true) ||
          !GLOBAL_FLOW.REFERENCE_IN_APP
        ) {
          statusData.reference = 4;
          statusData.contact = 4;
          dates.contact = new Date().getTime();
          const updatedData = { status: statusData };
          const updatedResult = await this.masterRepo.updateRowData(
            updatedData,
            masterId,
          );
          if (updatedResult === k500Error) return kInternalError;
        }
      }

      // // Update loan data
      let updatedData: any = { loanStatus: 'Accepted', kfsStatus: 1 };
      let updateResult = await this.repository.updateRowData(
        updatedData,
        loanId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      updatedData = { kfsStatus: 1, kfsAcceptDate: new Date() };
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async submitReferences(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const references = reqData.references;
      if (!references) return kParamMissing('references');

      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['id', 'cibilSystemFlag'];
      const include = [loanInclude];
      // Get master data
      const attributes = ['id', 'userId', 'status', 'dates'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);
      const statusData = masterData.status ?? {};
      const dates = masterData.dates ?? {};
      const isRedProfile =
        statusData.isRedProfile == 2 || statusData.isRedProfile == 3;

      if (
        (statusData.loan != 5 &&
          statusData.loan != 4 &&
          statusData.loan != 0) ||
        (statusData.reference != -1 &&
          statusData.reference != 0 &&
          statusData.reference != 2)
      )
        return k422ErrorMessage('Reference could not be submitted');

      // Add references
      const validateContact: any = await this.sharedContact.fineTuneContact(
        references,
        userId,
      );
      if (validateContact?.message) return validateContact;
      const contacts = validateContact?.references;
      if (contacts.length < 5)
        return k422ErrorMessage(
          'Please select a valid mobile number to proceed further',
        );
      const preparedList: any = await this.sharedContact.syncData(contacts);
      if (preparedList.message) return preparedList;

      // Insert references
      const creationData = { contacts, loanId, userId };
      const createdData = await this.referenceRepo.createRowData(creationData);
      if (createdData === k500Error) return kInternalError;

      // Update total contacts in user table
      const contactsOpt = { where: { userId: { [Op.contains]: [userId] } } };
      const contactsCount = await this.uniqueConatctsRepo.countOfRowData(
        contactsOpt,
      );
      if (contactsCount === k500Error) return kInternalError;
      const updatedData = { totalContact: contactsCount };
      const updateResult = await this.userRepo.updateRowData(
        updatedData,
        userId,
      );
      if (updateResult === k500Error) return kInternalError;

      const masterId = masterData?.id;
      if (
        validateContact?.verified ||
        masterData.loanData?.cibilSystemFlag == '1'
      )
        await this.getupdateRefe(loanId, statusData, dates, masterId, userId);
      // if old defulter then bypass
      else if (!isRedProfile) {
        // user in manual
        statusData.reference = 1;
        statusData.contact = 0;
        const updatedData = { status: statusData };
        const updateMaster = await this.masterRepo.updateRowData(
          updatedData,
          masterId,
        );
        if (updateMaster === k500Error) return kInternalError;
      }

      const panResponse: any = await this.kycService.validatePan({ userId });
      if (panResponse.message) return panResponse;

      // if old defulter then bypass
      if (isRedProfile) {
        masterData.status = statusData;
        await this.byPassFinalVerificationForRedProfile(masterData);
      }

      return panResponse;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // if old defulter then bypass
  private async byPassFinalVerificationForRedProfile(masterData) {
    const statusData = masterData.status ?? {};
    const isRedProfile =
      statusData.isRedProfile == 2 || statusData.isRedProfile == 3;
    if (!isRedProfile) return {};

    const dates = masterData.dates ?? {};
    dates.eligibility = new Date().getTime();

    statusData.loan = 1;
    statusData.eligibility = 1;
    statusData.pan = 1;
    const updatedData = { dates, status: statusData };
    const masterId = masterData.id;
    if (!masterId) return {};

    await this.masterRepo.updateRowData(updatedData, masterId);

    // Proceed for new mandate registration
    const userId = masterData.userId;
    if (!userId) return {};
    const attributes = ['accountNumber', 'id'];
    const options = { order: [['id', 'DESC']], where: { userId } };
    const subscriptionData = await this.subscriptionRepo.getRowWhereData(
      attributes,
      options,
    );
    if (subscriptionData == k500Error) return kInternalError;
    if (!subscriptionData) return k422ErrorMessage(kNoDataFound);
    let oldAccNumber = subscriptionData.accountNumber;
    if (!oldAccNumber) return k422ErrorMessage('Field oldAccNumber is missing');

    // Update old account number due to uniqueness issue
    if (!oldAccNumber.includes('OLD')) {
      const updatedData = {
        accountNumber: oldAccNumber + 'OLD' + new Date().getTime().toString(),
      };
      const subscriptionId = subscriptionData.id;
      if (!subscriptionId)
        return k422ErrorMessage('Field subscriptionId is missing');
      const updatedResponse = await this.subscriptionRepo.updateRowData(
        updatedData,
        subscriptionId,
      );
      if (updatedResponse == k500Error) return kInternalError;
      return {};
    }
  }

  async getupdateRefe(loanId, statusData, dates, masterId, userId) {
    try {
      // Update loan data
      let updatedData: any = {
        loanStatus: 'Accepted',
        manualVerification: '0',
      };
      let updateResult = await this.repository.updateRowData(
        updatedData,
        loanId,
      );
      if (updateResult == k500Error) return kInternalError;

      // Update user data
      const userUpdateData = { contactApprovedId: SYSTEM_ADMIN_ID };
      await this.userRepo.updateRowData(userUpdateData, userId);

      // Update master data
      statusData.reference =
        statusData.reference == 4 || !GLOBAL_FLOW.REFERENCE_IN_APP ? 4 : 1;
      statusData.contact = 1;

      const approved = [1, 3, 4];
      if (
        approved.includes(statusData.pan) &&
        approved.includes(statusData.selfie) &&
        approved.includes(statusData.contact)
      ) {
        statusData.loan = 0;
        statusData.eligibility = 0;
      }

      dates.contact = new Date().getTime();
      updatedData = { status: statusData, dates };
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      /// check final approval when loan status is 0
      if (statusData?.loan == 0 && loanId) {
        const finalData = { loanId, userId };
        await this.sharedEligiblityService.finalApproval(finalData);
      }

      return { needUserInfo: true };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async syncFirebaseContact(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      const contactData = await this.sharedContact.syncContacts(userId);
      if (contactData.message) return contactData;

      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status', 'loanId', 'dates'];
      const include = [masterInclude];
      const attributes = ['masterId', 'quantity_status'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const totalContact = contactData.totalContact;
      let updatedData: any = {
        quantity_status: userData.quantity_status ?? '0',
        totalContact,
      };
      if (
        updatedData.quantity_status != '1' &&
        updatedData.quantity_status != '3'
      ) {
        updatedData.totalContact = totalContact;
      }

      // Update user data
      let updateResult = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      const statusData = userData.masterData?.status ?? {};
      const dates = userData.masterData?.dates ?? {};
      const masterId = userData.masterId;
      statusData.contact = +updatedData.quantity_status;
      dates.contact = new Date().getTime();
      const approved = [1, 3, 4];
      if (
        approved.includes(statusData.pan) &&
        approved.includes(statusData.selfie) &&
        approved.includes(statusData.contact) &&
        approved.includes(statusData.reference)
      ) {
        statusData.eligibility = 0;
        statusData.loan = 0;
      }

      updatedData = { status: statusData, dates };
      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      /// check final approval when loan status is 0
      if (statusData?.loan == 0 && userData?.masterData?.loanId) {
        const finalData = { loanId: userData.masterData.loanId, userId };
        await this.sharedEligiblityService.finalApproval(finalData);
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getActiveLoanDetails(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');

      // Get loan data

      // Transaction
      const transInclude: any = { model: TransactionEntity };
      transInclude.attributes = ['id', 'paidAmount', 'status', 'utr', 'emiId'];
      // EMI
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'emi_date',
        'emi_amount',
        'payment_done_date',
        'payment_status',
        'payment_due_status',
        'penalty',
        'penalty_days',
        'principalCovered',
        'interestCalculate',
        'partPaymentPenaltyAmount',
        'settledId',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
      ];
      // Disbursement
      const disbursementIn: any = { model: disbursementEntity };
      disbursementIn.attributes = [
        'amount',
        'utr',
        'account_number',
        'bank_name',
      ];
      // eSign
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = ['signed_document_upload'];
      // Purpose
      const purposeInclude: any = { model: loanPurpose };
      purposeInclude.attributes = ['purposeName', 'image_url'];
      const include = [
        disbursementIn,
        eSignInclude,
        emiInclude,
        purposeInclude,
        transInclude,
      ];

      const attributes = [
        'id',
        'netEmiData',
        'loanFees',
        'stampFees',
        'interestRate',
        'loan_disbursement_date',
        'netApprovedAmount',
        'approvedDuration',
        'loanStatus',
        'isPartPayment',
        'nocURL',
        'insuranceId',
        'insuranceDetails',
        'charges',
        'processingFees',
        'appType',
      ];
      const options = { include, where: { id: loanId } };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );

      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      const emiData = loanData?.emiData;
      const attr = [
        'id',
        'emiId',
        'paidAmount',
        'completionDate',
        'status',
        'createdAt',
        'subscriptionDate',
        'updatedAt',
      ];
      const tempDate = [];
      let isSettled = false;
      let maxEMIId = 0;
      let maxPenaltyDays = 0;
      let settlementAmount = 0;
      emiData.forEach((ele) => {
        const total = +ele?.waiver + +ele?.paid_waiver + +ele?.unpaid_waiver;
        if (total > 0) isSettled = true;
        settlementAmount += total;
        if (ele?.payment_status === '0') tempDate.push(ele.emi_date);
        if (ele?.payment_status === '0' && ele?.payment_due_status === '1') {
          if (maxEMIId < ele.id) {
            maxEMIId = ele.id;
            maxPenaltyDays = ele?.penalty_days;
          }
        }
      });
      const option = {
        where: {
          loanId,
          subSource: kAutoDebit,
          subscriptionDate: tempDate,
        },
        order: [['id']],
      };
      const autoPayData = await this.transactionRepo.getTableWhereData(
        attr,
        option,
      );
      const autoPayDetail = [];
      autoPayData.forEach((d) => {
        try {
          const autoPayObj = [];
          let isPengingAutodebit = false;
          const emiObj = {};
          autoPayObj.push({
            name: 'Repayment requested to your bank',
            date: this.typeService.getGlobalDate(d.createdAt),
          });

          if (d?.status == 'INITIALIZED') {
            isPengingAutodebit = true;
            autoPayObj.push({
              name: 'Awaiting response from bank',
              isPending: d?.status == 'INITIALIZED' ? true : false,
            });
          } else
            autoPayObj.push({
              name: 'Repayment Status',
              date: d?.completionDate ?? d?.updatedAt,
              status: d?.status == kCompleted,
            });

          emiObj['id'] = d?.emiId;
          const emiDate = this.typeService.getGlobalDate(d.subscriptionDate);
          emiObj['EMI date'] = emiDate;
          emiObj['EMI Amount'] = d?.paidAmount;
          if (isPengingAutodebit) emiObj['stepperInfo'] = autoPayObj;
          let autoDebitMsg = '';
          if (isPengingAutodebit) autoDebitMsg = kLoanMaintainSufficientBalance;
          emiObj['autoPlaceMess'] = autoDebitMsg;
          const diff = this.typeService.dateDifference(
            emiDate,
            new Date(),
            'Hours',
          );
          emiObj['autoPlaceNotSuccess'] = isPengingAutodebit
            ? diff > 36
              ? kAutoDebitNotSuccessFull
              : ''
            : kAutoDebitNotInitilize;
          emiObj['pendingAutodebit'] = isPengingAutodebit;
          const find = autoPayDetail.find((f) => f['EMI id'] == d?.emiId);
          if (!find) autoPayDetail.push(emiObj);
        } catch (error) {}
      });

      const fullPayData = await this.sharedCalculation.getFullPaymentData({
        loanId,
      });
      if (fullPayData?.message) return fullPayData;

      let paymentSource = await this.commonSharedService.getServiceName(
        kPaymentMode,
      );
      if (!paymentSource) paymentSource = GlobalServices.PAYMENT_MODE;
      const data: any = { isUpiServiceAvailable: UPI_SERVICE };
      data.fullPayAmount = fullPayData.totalAmount;

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

      let partPaidAmount = 0;
      /// Check Already paid after create link
      if (partPayData?.id) {
        const partPaidOption = {
          where: {
            loanId,
            status: 'COMPLETED',
            id: { [Op.gt]: partPayData?.id },
            createdAt: dateRange,
          },
          order: [['id', 'DESC']],
        };
        const partPaidData = await this.transactionRepo.getRowWhereData(
          ['paidAmount', 'createdAt'],
          partPaidOption,
        );
        partPaidAmount = partPaidData?.paidAmount ?? 0;
      }

      /// Check for part payment enable/disable
      data.isPartPayment = false;
      data.minPartAmount = 0;
      data.collectionPhone = EnvConfig.number.collectionNumber;
      if (maxPenaltyDays > 90 && loanData.isPartPayment !== 0) {
        data.isPartPayment = true;
        if (partPaidAmount > 0) partPayData.paidAmount = 1000;
        data.minPartAmount = partPayData?.paidAmount ?? 1000;
        if (data.fullPayAmount < 1000) data.minPartAmount = data.fullPayAmount;
      }
      data.minPartAmount = parseInt(data.minPartAmount);

      data.paymentOptions = [
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

      const insuranceId = loanData?.insuranceId;
      const insurance = await this.getInsuranceData(insuranceId);
      // Add other loan details with formatting
      this.syncDashboardInfo(loanData, data, autoPayDetail, insurance);
      const repaymentData: any = await this.funEMIAndRepaymentData({
        loanId,
      });
      if (repaymentData.message) data.transactionData = [];
      else data.transactionData = repaymentData;
      if (data.loanStatus == 'Complete' && isSettled)
        data.loanStatus = 'Settled';
      if (isSettled) data.settlementAmount = settlementAmount;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funEMIAndRepaymentData(data) {
    try {
      if (!data.loanId) return kParamMissing('loanId');
      const attributes = [
        'id',
        'loanStatus',
        'userId',
        'netEmiData',
        'interestRate',
        'loan_disbursement_date',
      ];

      const transactionInclude = {
        model: TransactionEntity,
        required: false,
        order: [['id', 'DESC']],
        attributes: [
          'id',
          'emiId',
          'paidAmount',
          'completionDate',
          'source',
          'type',
          'subSource',
          'utr',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
          'userId',
          'createdAt',
        ],
        where: { status: 'COMPLETED' },
      };
      const emiInlude = {
        model: EmiEntity,
        attributes: ['id', 'emi_date', 'pay_type', 'payment_due_status'],
      };

      const options = {
        where: {
          id: data.loanId,
        },
        include: [transactionInclude, emiInlude],
      };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData === k500Error) return kInternalError;
      const transactionData = loanData?.transactionData ?? [];
      transactionData.sort((a, b) => b.id - a.id);
      const finalData = [];
      transactionData.forEach((ele) => {
        try {
          const emiData = loanData?.emiData;
          emiData.sort((a, b) => a.id - b.id);
          ele.emiNum = '';
          emiData.forEach((el, index) => {
            try {
              const emiDate = this.typeService.getGlobalDate(el.emi_date);
              const paymentDate = this.typeService.getGlobalDate(
                ele.completionDate,
              );
              if (
                (ele.emiId == el.id || ele.type == 'FULLPAY') &&
                emiDate.getTime() > paymentDate.getTime() &&
                el.payment_due_status == 0
              )
                ele.payType = 'PRE-PAID';
              else if (
                (ele.emiId == el.id || ele.type == 'FULLPAY') &&
                emiDate.getTime() <= paymentDate.getTime() &&
                el.payment_due_status == '0'
              )
                ele.payType = 'PAID-ontime';
              else if (
                (ele.emiId == el.id || ele.type == 'FULLPAY') &&
                emiDate.getTime() < paymentDate.getTime() &&
                el.payment_due_status == 1
              )
                ele.payType = 'PAID-delayed';
              if (ele?.emiId == el.id) ele.emiNum = `${index + 1}`;
              if (ele.type == 'FULLPAY' && el.pay_type == 'FULLPAY') {
                if (ele.emiNum == '') ele.emiNum = `${index + 1}`;
                else ele.emiNum += ` & ${index + 1}`;
              }
            } catch (error) {}
          });
          if (ele.type == 'REFUND') ele.payType = 'PAID';
          finalData.push(ele);
        } catch (error) {}
      });
      return finalData.sort((a, b) => b.id - a.id);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private syncDashboardInfo(loanData, data, autoPayDetail, insuranceData) {
    try {
      const appType = loanData?.appType;
      const appInsuranceLable =
        appType == 1 ? kInsuranceWaitingTagNBFC : kInsuranceWaitingTag;
      const transList = loanData.transactionData ?? [];
      transList.sort((b, a) => a.id - b.id);
      data.totalRepaidAmount = 0;
      transList.forEach((el) => {
        try {
          if (el.status == kCompleted && el.type != 'REFUND') {
            data.totalRepaidAmount += el.paidAmount ?? 0;
            try {
              loanData?.emiData.forEach((emi) => {
                if (emi.id === el.emiId) emi.utr = el.utr;
              });
            } catch (error) {}
          } else if (el.status == kInitiated && el.subSource == kAutoDebit)
            data.autoPayData = `Autodebit for your EMI due of #*Rs.${el.paidAmount}# has been initiated, Please keep sufficient amount in your bank account to avoid ECS penalty charges. Auto debit payment will reflect on the app by #*end of the day.`;
        } catch (error) {}
      });
      loanData?.emiData.forEach((emi) => {
        if (!emi?.utr && emi.payment_status == '1') {
          const find = transList.find(
            (f) => f.status == kCompleted && !f.emiId,
          );
          emi.utr = find?.utr;
        }
      });

      // EMI details
      const emiData = [];
      let totalOutstandingAmount = 0;
      let totalInterest = 0;
      loanData?.emiData.forEach((element) => {
        try {
          totalInterest += +element.interestCalculate;
          totalOutstandingAmount += element.principalCovered ?? 0;
          totalOutstandingAmount += element.interestCalculate ?? 0;
          totalOutstandingAmount +=
            (element?.penalty ?? 0) + (element?.partPaymentPenaltyAmount ?? 0);

          const find = autoPayDetail.find((f) => f?.id == element.id);
          element.info = find ? find : {};
          emiData.push(element);
        } catch (error) {}
      });
      emiData.sort((a, b) => a?.id - b?.id);
      data.emiData = emiData;
      data.totalOutstandingAmount = parseFloat(
        totalOutstandingAmount.toFixed(2),
      );
      const insuranceId = loanData?.insuranceId;
      const insurance = loanData?.insuranceDetails;
      const charges = loanData?.charges;
      const processingFeePerc = loanData.processingFees;
      const approvedLoanAmount = +loanData.netApprovedAmount;
      const processingFees = (approvedLoanAmount * processingFeePerc) / 100;

      // Dashboard data
      const dashboardData = {};
      const stampFees = (+loanData['stampFees']).toFixed(2);
      dashboardData['Bank account'] =
        loanData?.disbursementData[0]?.account_number ?? '-';
      dashboardData['Bank name'] =
        loanData?.disbursementData[0]?.bank_name ?? '-';
      dashboardData['UTR'] = loanData?.disbursementData[0]?.utr ?? '-';
      dashboardData['Loan amount'] = '₹ ' + loanData['netApprovedAmount'];
      dashboardData['No. of loan day'] = loanData['approvedDuration'];
      dashboardData['Interest'] = totalInterest.toFixed(2);
      dashboardData['Interest per day'] =
        parseFloat(loanData['interestRate']).toFixed(2) + '%';
      dashboardData['Processing fee'] = '₹ ' + processingFees.toFixed(2);
      dashboardData['Stamp duty fees + Service charges'] = '₹ ' + stampFees;
      dashboardData['Net amount disbursed'] =
        '₹ ' + ((loanData?.disbursementData[0]?.amount ?? 0) / 100).toFixed(2);
      dashboardData['Documentation charges'] =
        '₹ ' + (charges?.doc_charge_amt).toFixed(2);
      dashboardData['GST @18%'] = '₹ ' + (charges?.gst_amt).toFixed(2);
      dashboardData['insuranceId'] = insuranceId;
      if (insuranceId)
        dashboardData['Insurance premium amount'] =
          '₹ ' + (insurance?.totalPremium).toFixed(2);
      if (charges?.insurance_fee)
        dashboardData['Online convenience fees'] =
          '₹ ' + (charges?.insurance_fee).toFixed(2);

      data.dashboardData = dashboardData;
      data.purpose = loanData?.purpose?.purposeName ?? '-';
      data.purposeImage = loanData?.purpose?.image_url ?? null;
      data.loanStatus = loanData?.loanStatus ?? '-';
      data.loanAgreement = loanData?.eSignData?.signed_document_upload ?? '';
      data.nocURL = loanData?.nocURL ?? '';
      // this is tempery for testing
      if (loanData?.insuranceId) {
        if (
          insuranceData?.insurancePolicy1 ||
          insuranceData?.insurancePolicy2
        ) {
          if (insuranceData.insurancePolicy1) {
            data.insurancePolicy1 = 'Health protector policy';
            data.insuranceURL = insuranceData.insurancePolicy1;
          }
          if (insuranceData?.insurancePolicy2) {
            data.insurancePolicy2 = 'Emi protector policy';
            data.insuranceURL1 = insuranceData?.insurancePolicy2;
          }
        } else data.insuranceLable = appInsuranceLable;
      }

      data.disbursedDate = this.typeService.getGlobalDate(
        loanData.loan_disbursement_date,
      );
      data.paymentUIInfo = this.getPaymentUIInfo(emiData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
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

  private getPaymentUIInfo(emiList: any[]) {
    try {
      const uiInfo: any = {};

      for (let index = 0; index < emiList.length; index++) {
        try {
          const emiData = emiList[index];
          const isPaid = emiData.payment_status == '1';

          if (!isPaid && !uiInfo.dueDate) {
            uiInfo.dueDate = this.typeService.getGlobalDate(emiData.emi_date);
            uiInfo.dueAmount =
              parseFloat(emiData.emi_amount) + (emiData.penalty ?? 0.0);
            uiInfo.dueAmount = Math.floor(uiInfo.dueAmount);
            uiInfo.isDelayed = emiData.payment_due_status == '1';
            uiInfo.overdueDays = emiData.penalty_days ?? 0;
          }
        } catch (error) {}
      }

      return uiInfo;
    } catch (error) {
      return {};
    }
  }

  async getHistories(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      const purposeInclude: any = { model: loanPurpose };
      purposeInclude.attributes = ['purposeName', 'image_url', 'lsp_image_url'];
      const include = [purposeInclude];
      const attributes = [
        'id',
        'loanStatus',
        'netApprovedAmount',
        'remark',
        'createdAt',
      ];
      const options = {
        include,
        where: { userId },
        order: [['createdAt', 'DESC']],
      };
      const loanList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      const finalizedList = [];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loan = loanList[index];
          const obj: any = {
            id: loan.id,
            loanStatus: loan.loanStatus,
            netApprovedAmount: Math.floor(
              +(loan?.netApprovedAmount ?? 0),
            ).toString(),
            createdAt: loan.createdAt,
            loanPurpose: loan?.purpose?.purposeName ?? 'Personal Loan',
            image_url: loan?.purpose?.image_url,
            lsp_image_url: loan?.purpose?.lsp_image_url,
          };
          if (loan?.remark) obj.remark = kInternalPolicy;
          finalizedList.push(obj);
        } catch (error) {}
      }
      return finalizedList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region when loan Active then call api to change status
  async loanIsActive(loanId) {
    try {
      if (!loanId) return kParamMissing('loanId');
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['id', 'status', 'dates'];
      const include = [masterInclude];
      const options = { where: { id: loanId, loanStatus: 'Active' }, include };
      const att = ['id'];
      const find = await this.repository.getRowWhereData(att, options);
      if (!find || find === k500Error) return kInternalError;
      const status = find?.masterData?.status ?? {};
      const dates = find?.masterData?.dates ?? {};
      const id = find?.masterData?.id;
      if (id) {
        if (status.loan != 6) status.loan = 6;
        if (status.disbursement != 1) status.disbursement = 1;
        if (dates.disbursement == 0) dates.disbursement = new Date().getTime();
        await this.masterRepo.updateRowData({ status, dates }, id);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async syncRemainingContacts() {
    try {
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['totalContact', 'id'];
      const include = [userInclude];
      const attributes = ['status'];
      const options = {
        include,
        where: {
          status: {
            bank: { [Op.or]: [1, 3] },
            contact: 0,
            loan: { [Op.or]: [0, 4, 5] },
            reference: 1,
            residence: { [Op.or]: [1, 3] },
          },
        },
      };

      const masterList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;

      for (let index = 0; index < masterList.length; index++) {
        try {
          const masterData = masterList[index];
          const userData = masterData.userData ?? {};
          const totalContacts = userData.totalContact ?? 0;
          const userId = userData.id;

          if (totalContacts <= 15) await this.syncFirebaseContact({ userId });
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region check If Any User Not CloseLoan
  async checkIfAnyUserNotCloseLoan(limit = 10) {
    try {
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status', 'id', 'loanId'];
      masterInclude.where = {
        status: {
          [Op.or]: [
            {
              loan: { [Op.or]: [1, 3] },
            },
            {
              loan: 6,
              disbursement: 0,
            },
          ],
        },
      };
      const option = {
        where: { loanStatus: 'Active' },
        order: [['id', 'desc']],
        limit: limit ?? 10,
        include: [masterInclude],
      };
      const att = ['id', 'loanStatus'];
      try {
        const result = await this.repository.getTableWhereData(att, option);
        if (!result || result === k500Error) return kInternalError;
        for (let index = 0; index < result.length; index++) {
          try {
            const ele = result[index];
            const status = ele?.masterData?.status;
            const id = ele?.masterData?.id;
            const loanId = ele?.masterData?.loanId;
            if (
              id &&
              loanId == ele.id &&
              ele?.loanStatus === 'Active' &&
              status.loan != 6
            ) {
              status.loan = 6;
              status.disbursement = 1;
              await this.masterRepo.updateRowData({ status }, id);
            }
          } catch (error) {}
        }
      } catch (error) {}

      try {
        masterInclude.where = { status: { loan: 6 } };
        option.where.loanStatus = 'Complete';
        const result = await this.repository.getTableWhereData(att, option);
        if (!result || result === k500Error) return kInternalError;
        for (let index = 0; index < result.length; index++) {
          try {
            const ele = result[index];
            const status = ele?.masterData?.status;
            const id = ele?.masterData?.id;
            const loanId = ele?.masterData?.loanId;
            if (id && loanId == ele.id && status.loan == 6) {
              status.loan = 7;
              await this.masterRepo.updateRowData({ status }, id);
            }
          } catch (error) {}
        }
      } catch (error) {}
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region acceptInsurance
  async funAcceptInsurance(body) {
    try {
      // Params validation
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const userId = body.userId;
      if (!userId) return kParamMissing('userId');
      const code = body?.relationshipCode;
      const reg = /^\+?\d{10,12}$/;
      if (!body?.firstName || !body?.lastName || !body?.phone || !code)
        return kParamMissing();
      if (!reg.test(body?.phone)) {
        return k422ErrorMessage(kValidPhone);
      }
      const dob = body?.dob;
      if (!dob) return kParamMissing('dob');
      if (isNaN(new Date(dob)?.getTime())) return kInvalidParamValue('dob');

      let gender = 'M';
      if (valueInsurance?.relationshipCode?.length == 0)
        await this.commonSharedService.refreshInsuranceArray();
      const findCode = valueInsurance.relationshipCode.find(
        (f) => f.code === code,
      );
      if (findCode) gender = findCode?.gender ?? 'M';
      else return k422ErrorMessage(kPleaseSelectValidNomineeRelationshipCode);
      // this condition apply only Spouse
      if (code == '1') {
        const options = { where: { id: userId } };
        const att = ['gender'];
        const find = await this.userRepo.getRowWhereData(att, options);
        if (find && find != k500Error)
          gender = (find?.gender).toUpperCase() === 'MALE' ? 'F' : 'M';
      }
      gender = gender.toUpperCase();

      let num: string = (body?.phone ?? '').toString().replace(/\D/g, '');
      if (num.length > 10) num = num.slice(-10);

      const phoneResponse = await this.automation.verifyContacts({
        numbers: [num],
      });
      if (phoneResponse?.message) return kInternalError;
      if (phoneResponse?.length != 1) return kInternalError;
      if (!phoneResponse[0]?.name) {
        return k422ErrorMessage(
          `${num} is not valid number, Please enter any other valid number`,
        );
      }
      let truecaller_details = '';
      try {
        truecaller_details = JSON.stringify(phoneResponse);
      } catch (error) {}
      const nomineeDetail = {
        Nominee_First_Name: body?.firstName,
        Nominee_Last_Name: body?.lastName,
        Nominee_Contact_Number: num,
        Nominee_Home_Address: null,
        Nominee_gender: gender == 'M' ? 'Male' : 'Female',
        Nominee_Salutation: gender == 'M' ? 'Mr' : 'Ms',
        Nominee_Email: null,
        Nominee_Relationship_Code: code,
        Nominee_dob: dob,
        whatsAppURL: `https://wa.me/${num}`,
        truecaller_details,
      };

      const update = await this.loanRepo.updateRowData(
        { nomineeDetail },
        loanId,
      );
      if ((update ?? '').toString() != '1') return kInternalError;
      const kfsData = await this.getKeyFactStatement(loanId);
      if (kfsData.message) return kfsData;
      return { needUserInfo: true, kfsData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get Address List
  async getCibilAddressesList(body) {
    try {
      // Params validation
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const userId = body.userId;
      if (!userId) return kParamMissing('userId');

      const bankInc: any = { model: BankingEntity };
      bankInc.attributes = ['id', 'accountDetails'];
      const attributes = ['id', 'loanStatus', 'bankingId'];
      const include = [bankInc];
      const options = { where: { id: loanId, userId }, include };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);

      if (!loanData?.bankingData?.accountDetails)
        return k422ErrorMessage('Account details not found');
      const accountDetails = JSON.parse(loanData.bankingData.accountDetails);

      const kycAttributes = ['aadhaarAddress'];
      let kycData = await this.kycRepo.getRowWhereData(kycAttributes, {
        where: { userId },
        order: [['id', 'DESC']],
      });

      const rawAadhaarAddress = kycData?.aadhaarAddress;
      if (!rawAadhaarAddress)
        return k422ErrorMessage('Aadhaar address not found');

      const aadhaarAddress =
        this.typeService.getUserAadharAddress(rawAadhaarAddress);

      const scoreAttributes = ['id', 'addresses'];
      const scoreOptions = {
        order: [['id', 'DESC']],
        where: { type: '1', status: '1', userId: userId },
      };
      const scoreData = await this.cibilScoreRepo.getRowWhereData(
        scoreAttributes,
        scoreOptions,
      );
      if (scoreData == k500Error) return kInternalError;
      if (!scoreData) return k422ErrorMessage(kNoDataFound);
      scoreData.addresses.forEach((element) => {
        element.address = `${element?.line1 ? element?.line1 + ', ' : ''}${
          element?.line2 ? element?.line2 + ', ' : ''
        }${element?.line3 ? element?.line3 + ', ' : ''}${
          element?.line4 ? element?.line4 + ', ' : ''
        }${element?.line5 ? element?.line5 : ''}`;
        delete element.line1;
        delete element.line2;
        delete element.line3;
        delete element.line4;
        delete element.line5;
        delete element.pinCode;
        delete element.stateCode;
        delete element.dateReported;
        delete element.addressCategory;
        delete element.enquiryEnriched;
      });
      if (accountDetails?.address)
        scoreData.addresses.unshift({
          index: 'BANK',
          address: accountDetails?.address,
        });
      if (aadhaarAddress)
        scoreData.addresses.unshift({
          index: 'AADHAAR',
          address: aadhaarAddress,
        });
      return scoreData.addresses;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region submit user Address selection
  async submitUserAddressSelection(body) {
    // Params validation
    const loanId = body?.loanId;
    if (!loanId) return kParamMissing('loanId');
    const userId = body.userId;
    if (!userId) return kParamMissing('userId');
    const residence = body.residence;
    if (!residence) return kParamMissing('residence');
    const comunication = body.comunication;
    if (!comunication) return kParamMissing('comunication');

    // Query preparation
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = ['id', 'status', 'dates'];
    const include = [masterInclude];
    const attributes = ['id', 'masterId'];
    const options = { include, where: { id: loanId, userId } };
    // Query
    const loanData = await this.repository.getRowWhereData(attributes, options);
    // Query data validation
    if (loanData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (!loanData) return k422ErrorMessage(kNoDataFound);

    // Query preparation
    const scoreAttributes = ['id', 'addresses'];
    const scoreOptions = {
      order: [['id', 'DESC']],
      where: { type: '1', status: '1', userId: userId },
    };
    // Query
    const scoreData = await this.cibilScoreRepo.getRowWhereData(
      scoreAttributes,
      scoreOptions,
    );
    // Query data validation
    if (scoreData === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    if (!scoreData) return k422ErrorMessage(kNoDataFound);

    const cibilAddresses = scoreData?.addresses;
    for (let index = 0; index < cibilAddresses.length; index++) {
      try {
        const element = cibilAddresses[index];
        element.isresidence = false;
        element.iscomunication = false;
        if (element.index == residence) element.isresidence = true;
        if (element.index == comunication) element.iscomunication = true;
      } catch (error) {}
    }

    // Query preparation
    const addAttr = ['id', 'address', 'subType'];
    const addOps = {
      where: { userId, subType: { [Op.or]: [residence, comunication] } },
    };
    // Query
    const allAddresses = await this.addressRepo.getTableWhereData(
      addAttr,
      addOps,
    );
    // Query data validation
    if (allAddresses === k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    if (allAddresses) {
      let residenceTag = true;
      let comunicationTag = true;
      for (let i = 0; i < allAddresses.length; i++) {
        try {
          const add = allAddresses[i];
          const addId = add?.id;
          let addressFlag;
          if (add.subType == residence && add.subType == comunication) {
            addressFlag = 3;
            if (addId && addressFlag)
              await this.addressRepo.updateRowData({ addressFlag }, addId);
            residenceTag = false;
            comunicationTag = false;
          } else if (add.subType == residence && residenceTag) {
            addressFlag = 1;
            if (addId && addressFlag)
              await this.addressRepo.updateRowData({ addressFlag }, addId);
            residenceTag = false;
          } else if (add.subType == comunication && comunicationTag) {
            addressFlag = 2;
            if (addId && addressFlag)
              await this.addressRepo.updateRowData({ addressFlag }, addId);
            comunicationTag = false;
          }

          if (!residenceTag && !comunicationTag) break;
        } catch (error) {}
      }
    }
    // Update user selection in cibil table
    const updatedData = { addresses: scoreData.addresses };
    const result = await this.cibilScoreRepo.updateRowData(
      updatedData,
      scoreData.id,
    );
    if (result === k500Error) return kInternalError;

    // Update user data
    const updateUserData = { residenceAdminId: SYSTEM_ADMIN_ID };
    await this.userRepo.updateRowData(updateUserData, userId);

    // Update master data
    const statusData = loanData.masterData?.status ?? {};
    const dateData = loanData.masterData?.dates ?? {};
    statusData.residence = 7;
    dateData.residence = new Date().getTime();
    const updatedData1 = { status: statusData, dates: dateData };
    const updateResult = await this.masterRepo.updateRowData(
      updatedData1,
      loanData.masterId,
    );
    if (updateResult == k500Error)
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);

    return { needUserInfo: true };
  }
  //#endregion

  async funGetLoanData(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamsMissing;
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email', 'phone'],
      };
      const eSignInclude = {
        model: esignEntity,
        attributes: ['id', 'signed_document_upload'],
      };
      const disInclude = {
        model: disbursementEntity,
        attributes: [
          'id',
          'createdAt',
          'amount',
          'updatedAt',
          'status',
          'utr',
          'account_number',
          'bank_name',
        ],
        where: { status: 'processed' },
      };
      const purposeInclude = {
        model: loanPurpose,
        attributes: ['id', 'purposeName'],
      };
      const loanData: any = await this.loanRepo.getRowWhereData(
        ['id', 'createdAt', 'loan_disbursement_date', 'esign_id', 'appType'],
        {
          where: {
            userId: userId,
            loanStatus: 'Active',
          },
          include: [disInclude, userInclude, purposeInclude, eSignInclude],
        },
      );
      if (!loanData && loanData == k500Error) return kInternalError;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funLoanNotDisbursementBanner(query) {
    try {
      if (!query?.userId) return kParamsMissing;
      const userId = query?.userId;
      const loanData: any = await this.funGetLoanData(query);

      if (loanData?.message) return loanData;
      const createdAt = loanData.createdAt;
      const disbursementData = loanData.disbursementData;
      disbursementData.sort((b, a) => a.id - b.id);
      let loanDisDate = disbursementData[0]?.createdAt;
      const utr = disbursementData[0]?.utr;
      loanDisDate = new Date(loanDisDate);
      const dateDifference = this.typeService.dateDifference(
        loanDisDate,
        createdAt,
        'Seconds',
      );
      if (dateDifference == null) return false;
      const mins: any = dateDifference / 60;

      const appType = loanData.appType;
      const userData = [];
      userData.push({ userId, appType });
      const passData: any = {
        userData,
        image: DisbursementBanner,
        isMsgSent: true,
        isManualTitle: true,
      };
      let response;
      if (mins <= MAX_DIS_TIME)
        response = await this.disburementIn30min(
          mins,
          DisbursementSuccessTitleOnTime,
          DisbursementSuccessBodyOnTime,
          true,
          null,
        );
      else
        response = await this.disburementIn30min(
          mins,
          DisbursementSuccessTitle,
          DisbursementSuccessBody,
          false,
          utr,
        );
      if (response.message) return kInternalError;
      passData.title = response.title;
      passData.content = response.content;
      const smsData: any = await this.disburesmentSmsData(loanData);

      if (smsData.message) return kInternalError;
      passData.id = smsData.id;
      delete smsData.id;
      passData.smsOptions = smsData;
      await this.sharedNotificationService.sendNotificationToUser(passData);
      await this.sendDisbursementMailToUser(loanData);
      await this.preDataAndSendDisbursementWhatsappMsg(loanData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async disburementIn30min(mins, title, content, isOnTime = false, utr) {
    try {
      if (isOnTime) {
        const completedMins = Math.floor(mins);
        const remaingSecs: any = (mins - completedMins) * 60;
        content = content
          .replace('##MIN##', mins)
          .replace('##SEC##', remaingSecs);
      } else content = content.replace('##UTR##', utr);
      return { title, content };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async disburesmentSmsData(loanData) {
    try {
      const appType = loanData?.appType;
      const templateId =
        appType == 1
          ? kMsg91Templates.DISBUREMENT
          : kLspMsg91Templates.DISBUREMENT;

      // get data from redis
      let key = `TEMPLATE_DATA_BY_TEMPID`;
      let templeteData = await this.redisService.get(key);
      templeteData = templeteData ?? null;
      templeteData = JSON.parse(templeteData) ?? [];
      let id;
      //filter data from template id
      if (templeteData.length) {
        templeteData = templeteData.filter(
          (el) => el.templateId == templateId || el.lspTemplateId == templateId,
        );
        if (templeteData.length > 0) {
          id = templeteData[0].id;
        }
      }
      const userData = loanData.registeredUsers;
      const disData = loanData.disbursementData[0];
      return {
        id,
        name: userData.fullName,
        amount: disData.amount / 100,
        transaction: disData.utr,
        time: disData.updatedAt,
        appType,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendDisbursementMailToUser(loanData) {
    try {
      const appType = loanData?.appType;
      const templatePath = await this.commonSharedService.getEmailTemplatePath(
        kloanApprovalTemplate,
        appType,
        null,
        null,
      );
      let htmlData = (await fs.readFileSync(templatePath)).toString();
      const purposeData = loanData.purpose;
      const userData = loanData.registeredUsers;
      const esingData = loanData?.eSignData;
      const signed_document_upload = esingData?.signed_document_upload;
      const disData = loanData.disbursementData[0];
      htmlData = htmlData.replace('##NAME##', userData.fullName);
      htmlData = htmlData.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = htmlData.replace(
        '##NBFCCAMEL##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace(
        '##PURPOSE##',
        purposeData?.purposeName ?? '',
      );
      htmlData = htmlData.replace('##AccountNO##', disData.account_number);
      htmlData = htmlData.replace('##BANKNAME##', disData.bank_name);
      htmlData = htmlData.replace(
        '##FINALAMOUNT##',
        (disData.amount / 100).toFixed().toString(),
      );
      htmlData = htmlData.replace(
        '##FINALAMOUNT1##',
        (disData.amount / 100).toFixed().toString(),
      );
      htmlData = htmlData.replace('##BANKTRANSACTION##', disData.utr);
      htmlData = htmlData.replace('##LOANID##', loanData.id);
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = this.replaceAll(
        htmlData,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace(
        '##APPNAME##',
        EnvConfig.nbfc.appCamelCaseName,
      );
      const attachments: any = [
        {
          filename: 'Loan-aggrement.pdf',
          path: signed_document_upload,
          contentType: 'application/pdf',
        },
      ];
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      await this.sharedNotificationService.sendMailFromSendinBlue(
        userData.email,
        'Loan Approval',
        htmlData,
        userData.id,
        [],
        attachments,
        fromMail,
        replyTo,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //get loan details only
  async getLoanDetails(query) {
    try {
      const loanId = query?.loanId;
      const appType = query?.appType;
      if (!loanId) return kParamMissing('loanId');

      // Disbursement data
      const disbInc: any = { model: disbursementEntity };
      disbInc.attributes = ['amount', 'utr', 'account_number', 'bank_name'];
      // eSign doc
      const eSignInc: any = { model: esignEntity };
      eSignInc.attributes = ['signed_document_upload'];
      // emi data
      const emiInc: any = { model: EmiEntity };
      emiInc.attributes = [
        'interestCalculate',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
      ];

      // Purpose
      const purposeInc: any = { model: loanPurpose };
      purposeInc.attributes = ['purposeName', 'lsp_image_url'];
      const include = [emiInc, disbInc, eSignInc, purposeInc];
      const attributes = [
        'id',
        'loanFees',
        'stampFees',
        'interestRate',
        'loan_disbursement_date',
        'netApprovedAmount',
        'approvedDuration',
        'loanStatus',
        'nocURL',
        'insuranceId',
        'insuranceDetails',
        'charges',
      ];
      const options = { where: { id: loanId }, include };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      const emiData = loanData?.emiData;
      const disData = loanData?.disbursementData[0];
      const eSign = loanData?.eSignData;
      const purposeData = loanData?.purpose;
      const insurance = loanData?.insuranceDetails ?? {};
      const insuranceId = loanData?.insuranceId;
      const charges = loanData?.charges ?? {};
      const convenienceFee = charges?.insurance_fee;
      const riskAssessmentCharge = charges?.risk_assessment_charge;
      const docCharge = charges?.doc_charge_amt ?? 0;
      const gstPr = charges?.gst_per;
      const stampFees = loanData?.stampFees;
      const approvedAmount = (+loanData?.netApprovedAmount ?? 0).toFixed();

      const loanFees = Math.round(
        +(loanData?.loanFees ?? 0) -
          +(charges?.gst_amt ?? 0) -
          +docCharge -
          +(convenienceFee ?? 0) -
          +(riskAssessmentCharge ?? 0),
      );
      const interestTag = `@${(+loanData?.interestRate).toFixed(
        2,
      )}% per day for ${loanData?.approvedDuration ?? 0} days`;
      const gstTag = `Processing fees${
        convenienceFee ? ' + Online convenience fees' : ''
      }${docCharge ? ' + Documentation charges' : ''}`;

      let totalInterest = 0;
      let isSettled = false;
      let settlementAmount = 0;
      emiData.forEach((ele) => {
        try {
          totalInterest += +ele?.interestCalculate ?? 0;
          const total = +ele?.waiver + +ele?.paid_waiver + +ele?.unpaid_waiver;
          if (total > 0) isSettled = true;
          settlementAmount += total;
        } catch (error) {}
      });

      //color code
      const skyColor = '1BC8C9';
      const redColor = 'FF4E60';
      const loan = {};
      const loanDocuments = {};
      loan['Loan Id'] = '##' + loanData.id + '##';
      loan['Approved amount'] =
        '##' + this.strService.readableAmount(approvedAmount) + '##';
      if (insuranceId)
        loan['Insurance premium amount'] = insurance?.totalPremium
          ? '##' +
            this.strService.readableAmount(
              Math.round(insurance?.totalPremium ?? 0),
            ) +
            '##'
          : '##-##';
      if (convenienceFee)
        loan['Online convenience fees'] =
          '##' +
          this.strService.readableAmount(Math.round(convenienceFee)) +
          '##';
      if (riskAssessmentCharge)
        loan['Risk assessment charge'] =
          '##' +
          this.strService.readableAmount(Math.round(riskAssessmentCharge)) +
          '##';

      if (docCharge)
        loan['Documentation charges'] =
          '##' + this.strService.readableAmount(Math.round(docCharge)) + '##';
      loan['Processing fees'] =
        '##' + this.strService.readableAmount(loanFees) + '##';
      if (stampFees)
        loan['Stamp duty charges'] =
          '##' + this.strService.readableAmount(Math.round(stampFees)) + '##';
      if (charges?.gst_amt) {
        let gstKey = 'GST @18%';
        gstKey += `\n#*||${skyColor}||${gstTag}*#`;
        loan[gstKey] =
          '##' + this.strService.readableAmount(charges?.gst_amt) + '##';
      }
      loan['Disbursement loan amount'] =
        '##' +
        this.strService.readableAmount(
          Math.round((disData?.amount ?? 0) / 100),
        ) +
        '##';

      const interestKey = `Total interest amount\n#*||${skyColor}||${interestTag}*#`;
      loan[interestKey] =
        '##' + this.strService.readableAmount(Math.round(totalInterest)) + '##';
      loan['Disbursement date'] =
        '##' +
        new Date(loanData?.loan_disbursement_date).toLocaleString('default', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) +
        '##';
      loan['Bank name'] = '##' + disData?.bank_name + '##';
      loan['Account number'] = '##' + disData?.account_number + '##';
      loan['UTR'] = '##' + disData?.utr + '##';
      if (appType == 0) {
        loan['Loan purpose'] = purposeData?.purposeName ?? '-';
        loan['Image url'] = purposeData?.lsp_image_url;
        let totalCharges: any =
          convenienceFee + Math.round(docCharge) + loanFees;
        totalCharges += Math.round(totalCharges * (gstPr / 100));
        loan['Total charges'] = this.strService.readableAmount(totalCharges);
      }
      if (isSettled)
        loan['Settlement amount'] =
          `#*||${redColor}||##` +
          this.strService.readableAmount(Math.round(settlementAmount)) +
          '##*#';

      loanDocuments['Loan agreement'] = eSign?.signed_document_upload;
      if (loanData?.nocURL) loanDocuments['NOC'] = loanData?.nocURL;
      if (insuranceId) {
        const insuranceData = await this.getInsuranceData(insuranceId);
        if (insuranceData?.insurancePolicy1)
          loanDocuments[healthPolicy] = insuranceData?.insurancePolicy1;
        if (insuranceData?.insurancePolicy2)
          loanDocuments[lojPolicy] = insuranceData?.insurancePolicy2;
      }
      const loanStatus =
        loanData?.loanStatus == 'Complete' && isSettled
          ? 'Settled'
          : loanData?.loanStatus;

      return { 'Loan status': loanStatus, loan, loanDocuments };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // get user loan Repayment transactions
  async getLoanRepaymentDetails(query) {
    try {
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');

      //Transaction data
      const attributes = [
        'id',
        'emiId',
        'paidAmount',
        'completionDate',
        'type',
        'source',
        'subSource',
        'transactionId',
        'penaltyAmount',
        'response',
        'sgstOnPenalCharge',
        'cgstOnPenalCharge',
        'bounceCharge',
      ];
      const status = kCompleted;
      const options = { where: { loanId, status }, order: [['id', 'DESC']] };
      const traData = await this.transactionRepo.getTableWhereData(
        attributes,
        options,
      );

      if (traData === k500Error) return kInternalError;
      if (!traData) return k422ErrorMessage(kNoDataFound);
      //EMI data
      const emiAttr = [
        'id',
        'emi_date',
        'payment_due_status',
        'penalty_update_date',
        'pay_type',
        'penalty_days',
      ];
      const emiOps = { where: { loanId }, order: [['id']] };
      const emiData = await this.emiRepo.getTableWhereData(emiAttr, emiOps);

      if (emiData === k500Error) return kInternalError;

      const traLength = traData.length;
      const emiLength = emiData.length;
      const transactions = [];
      let isDelayed = false;
      for (let index = 0; index < traLength; index++) {
        try {
          const tra = traData[index];
          if (tra?.source === KICICIUPI) tra.source = 'UPI';
          const payDate = this.typeService.getGlobalDate(tra?.completionDate);
          const type = tra?.type;
          const penaltyAmount = this.typeService.manageAmount(
            tra?.penalCharge ??
              0 + tra?.sgstOnPenalCharge ??
              0 + tra?.cgstOnPenalCharge ??
              0,
            disburseAmt,
          );
          const paidAmount = this.typeService.manageAmount(
            (type == 'REFUND'
              ? Math.abs(tra?.paidAmount ?? 0)
              : tra?.paidAmount ?? 0) - penaltyAmount,
          );
          const response = tra?.response ? JSON.parse(tra.response) : {};
          const method =
            response?.method ??
            (response?.items ? response?.items[0]?.method : tra?.subSource) ??
            '-';
          const mode =
            method == 'emandate' || method == 'AUTODEBIT' ? 'e-NACH' : method;

          let emiNum;
          let payType;
          let delay;
          for (let i = 0; i < emiLength; i++) {
            try {
              const emi = emiData[i];
              const emiDate = this.typeService.getGlobalDate(emi.emi_date);
              if (tra?.emiId == emi.id || type == 'FULLPAY') {
                if (
                  emiDate.getTime() > payDate.getTime() &&
                  emi.payment_due_status == '0'
                )
                  payType = 'Pre';
                else if (
                  emiDate.getTime() == payDate.getTime() &&
                  emi.payment_due_status == '0'
                )
                  payType = 'Ontime';
                else if (
                  emiDate.getTime() < payDate.getTime() &&
                  emi.payment_due_status == '1'
                )
                  payType = 'Delayed';
                else if (emi.payment_due_status == '1') payType = 'Delayed';
                else if (emi.payment_due_status == '0') payType = 'Ontime';
              }
              if (emi.payment_due_status == '1' && !isDelayed) isDelayed = true;
              if (tra?.emiId == emi.id) {
                emiNum = `${i + 1}`;
                delay = emi?.penalty_days ?? 0;
              } else if (type == 'FULLPAY' && emi?.pay_type == 'FULLPAY') {
                if (!emiNum) emiNum = `${i + 1}`;
                else emiNum += ` & ${i + 1}`;
              }
            } catch (error) {}
          }

          if (type == 'FULLPAY')
            delay = this.typeService.getOverDueDay(emiData);
          if (type == 'REFUND') payType = 'Paid';

          //#*||FF4E60||value*# for red color
          //##value## for bold
          const redColor = 'FF4E60';
          let payStatus = '';
          let payTextStatus = '';
          if (payType == 'Ontime' || payType == 'Pre') {
            payStatus = `#*||3EC13B||##${payType}##*#`;
            payTextStatus = `#*||3EC13B||##${payType}##*#`;
          } else if (payType == 'Delayed') {
            payStatus = `#*||FF9C41||##${payType}##*#`;
            payTextStatus = `#*||${redColor}||##${payType}##*#`;
          } else if (payType == 'Paid') {
            payStatus = `#*||2DD2D3||##${payType}##*#`;
            payTextStatus = `#*||3EC13B||##${payType}##*#`;
          } else payStatus = `##${payType ?? '-'}##`;

          const payment: any = {};
          const paymentDetail: any = {};
          payment['EMI'] = '##' + emiNum + '##';
          paymentDetail['Status'] = payTextStatus;
          const date = this.typeService.getDateFormatted(payDate, '/');
          payment['Date'] = '##' + date + '##';
          paymentDetail['Date'] = '##' + date + '##';
          // paid amount
          payment['Amount'] = `##${this.strService.readableAmount(
            type == 'REFUND'
              ? Math.abs((tra?.paidAmount).toFixed(2) ?? 0)
              : tra?.paidAmount.toFixed(2) ?? 0,
          )}##`;
          paymentDetail['Amount'] = `##${this.strService.readableAmount(
            paidAmount,
          )}##`;

          // delay day
          if (delay && penaltyAmount) {
            if (delay == 1) delay = 1 + ' day';
            else delay = delay + ' days';
            paymentDetail['Delayed by'] = `#*||${redColor}||##${delay}##*#`;
          }

          if (penaltyAmount) {
            /// penalty
            paymentDetail['Penalty Amount'] =
              `#*||${redColor}||##` +
              this.strService.readableAmount(penaltyAmount) +
              '##*#';
            /// total paid amount
            const key = `Total Paid Amount\n#*||${redColor}||Inclusive of penalty*#`;
            paymentDetail[key] = `##${this.strService.readableAmount(
              paidAmount + penaltyAmount,
            )}##`;
          }

          paymentDetail['Transaction ID'] = `##${tra?.transactionId ?? '-'}##`;
          payment['Type'] = `##${type ?? '-'}##`;
          payment['Status'] = payStatus;
          paymentDetail['Payment via'] = `##${tra?.source ?? '-'}##`;
          paymentDetail['Payment mode'] = `##${mode.toUpperCase()}##`;
          payment.paymentDetail = paymentDetail;
          transactions.push(payment);
        } catch (error) {}
      }
      if (traLength == 0) {
        const find = emiData.find((f) => f.payment_due_status == '1');
        if (find) isDelayed = true;
      }

      return { title: 'Payment details', isDelayed, payment: transactions };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get user loan emi and repayment data
  async getLoanEmiRepaymentDetails(query) {
    try {
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');

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
        'source',
        'subSource',
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
        'emi_date',
        'pay_type',
        'emi_amount',
        'totalPenalty',
        'penalty_days',
        'bounceCharge',
        'payment_status',
        'fullPayPenalty',
        'principalCovered',
        'interestCalculate',
        'payment_due_status',
        'payment_done_date',
        'partPaymentPenaltyAmount',
        'emiNumber',
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
      ];
      const include = [emiInc, transInc, purposeInc, bankInc];
      const options = { where: { id: loanId }, include };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      return await this.getEMIandRepayDetail(loanData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //get emi data and repayment data
  private async getEMIandRepayDetail(loanData) {
    try {
      const loanId = loanData.id;
      const userId = loanData?.userId;
      const bank = loanData.bankingData;
      const emiData = loanData?.emiData;
      emiData.sort((a, b) => a.id - b.id);
      const transData = loanData?.transactionData ?? [];
      transData.sort((a, b) => b.id - a.id);
      const emiDates = emiData.map((emi) => {
        if (emi?.payment_status === '0') return emi.emi_date;
      });
      const traObj = { transData, emiData, emiDates };
      const traDetails = this.transactionAutodebitEMIInfo(traObj);
      const totalRepaidAmt = this.typeService.manageAmount(
        traDetails?.totalRepaidAmount ?? 0,
        disburseAmt,
      );
      const autoPayDetail = traDetails?.autoPayDetail ?? [];
      const data = { emiData, autoPayDetail, transData };
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
        this.strService.readableAmount(totalPayableAmt);
      finalData['Total repaid amount'] =
        this.strService.readableAmount(totalRepaidAmt);
      finalData['Total due amount'] =
        this.strService.readableAmount(totalDueAmt);
      finalData['Full Pay Amount'] =
        this.strService.readableAmount(fullPayAmount);
      finalData['Loan amount'] = this.strService.readableAmount(approvedAmount);
      finalData['fullPayAmount'] = fullPayAmount;

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
      if (penaltyDays > 90 && loanData.isPartPayment !== 0) {
        isPartPayment = true;
        if (partPaidAmount > 0) partPayData.paidAmount = 1000;
        minPartAmount = partPayData?.paidAmount ?? 1000;
        if (fullPayAmount < 1000) minPartAmount = fullPayAmount;
      }
      finalData.isPartPayment = isPartPayment;
      finalData.minPartAmount = this.strService.readableAmount(minPartAmount);

      // Fullpay button is enable or not
      finalData.isFullPayment = true;
      const interestRate = +(
        loanData?.interestRate ?? GLOBAL_RANGES.MAX_PER_DAY_INTEREST_RATE
      );
      if (interestRate <= MINIMUM_INTEREST_FOR_FULL_PAY) {
        const totalUnpaidEMIs = emiData.filter(
          (el) => el.payment_status != '1',
        );
        if (totalUnpaidEMIs.length == 1) finalData.isFullPayment = false;
      }

      //insurance
      const insuranceId = loanData?.insuranceId;
      if (insuranceId) {
        const insurance = await this.getInsuranceData(insuranceId);
        if (!insurance?.insurancePolicy1 && !insurance?.insurancePolicy2)
          finalData.insuranceLabel = kInsuranceWaitingTag;
      }
      const promoCodes: any = await this.promoCodeService.getUsersPromoCode(
        { userId },
        [],
      );
      if (promoCodes?.message) finalData.promoCodes = [];
      else finalData.promoCodes = promoCodes;
      //for showing web page for repayment
      let isWebViewPaymentUrl = false;
      const curDate = this.typeService.getGlobalDate(new Date()).toJSON();
      const transOptions = {
        where: {
          source: KICICIUPI,
          userId,
          status: 'FAILED',
          completionDate: curDate,
        },
      };
      const upiFailCount = await this.transactionRepo.getCountsWhere(
        transOptions,
      );
      if (
        upiFailCount != k500Error &&
        finalData?.promoCodes?.length === 0 &&
        !isPartPayment &&
        upiFailCount < 5
      )
        isWebViewPaymentUrl = true;

      finalData.isWebViewPaymentUrl = isWebViewPaymentUrl;
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //get emi data and payment detail
  private getEMIandAutoPayDetail(data) {
    try {
      const emiData = data?.emiData ?? [];
      const traData = data?.transData ?? [];
      const autoPayData = data?.autoPayDetail ?? [];
      let totalPayableAmount = 0;
      let totalDueAmount = 0;
      let penaltyDays;
      let isDelayed = false;
      const emiDetails = [];
      let needPay = false;
      emiData.sort((a, b) => a.id - b.id);
      emiData.forEach((ele) => {
        try {
          const emiId = ele.id;
          const payStatus = ele?.payment_status;
          const dueStatus = ele?.payment_due_status;
          let totalEMIAmount = 0;
          totalEMIAmount += +ele?.emi_amount ?? 0;
          totalEMIAmount += ele?.penalty ?? 0;
          if (payStatus == '0') totalDueAmount += totalEMIAmount;
          // Outstanding Amount
          totalPayableAmount += ele?.principalCovered ?? 0;
          totalPayableAmount += ele?.interestCalculate ?? 0;
          totalPayableAmount += ele?.penalty ?? 0;
          totalPayableAmount += ele?.partPaymentPenaltyAmount ?? 0;
          const delayDays = ele?.penalty_days;
          if (payStatus == '0' && dueStatus == '1' && !penaltyDays)
            penaltyDays = delayDays;
          totalEMIAmount = this.typeService.manageAmount(totalEMIAmount);
          const emiAmount = this.typeService.manageAmount(+ele.emi_amount);

          //EMI Pay Button
          let payButton = false;
          const emi_date = new Date(ele.emi_date).getTime();
          const today = this.typeService.getGlobalDate(new Date()).getTime();
          const emi_amount = this.strService.readableAmount(
            (+ele.emi_amount).toFixed(),
          );
          const bounceCharge = ele?.bounceCharge ?? 0;
          let withoutECS = +ele?.penalty - bounceCharge;
          if (withoutECS < 0) withoutECS = 0;
          const penalty = withoutECS
            ? this.strService.readableAmount(withoutECS)
            : '';

          let pay_emi_info;
          /// this prepare othe info
          if (emi_date <= today && needPay == true && payStatus == '0') {
            payButton = true;
            pay_emi_info = this.getPayButtonInfo(
              ele,
              emi_amount,
              penalty,
              totalDueAmount,
              emiData,
            );
          }

          /// first unpaid emi pay button enable
          if (needPay == false && payStatus == '0') {
            payButton = true;
            needPay = true;
            /// get pay emi info
            pay_emi_info = this.getPayButtonInfo(
              ele,
              emi_amount,
              penalty,
              totalDueAmount,
              null,
            );
          }
          if (pay_emi_info) pay_emi_info['id'] = ele.id;
          // EMI data
          let emi: any = {};
          let paymentDetails = {};
          emi['id'] = emiId;
          emi['EMI date'] = ele.emi_date;
          emi['EMI done date'] = ele?.payment_done_date;
          emi['EMI amount'] = this.strService.readableAmount(emiAmount);

          if (withoutECS < 0) withoutECS = 0;
          else withoutECS = this.typeService.manageAmount(+ele.penalty ?? 0);
          if (withoutECS)
            emi['Penalty'] = this.strService.readableAmount(withoutECS);
          if (ele?.bounceCharge) emi['EMI amount'] = emi_amount;
          if (penalty) emi['Penalty'] = penalty;
          if (bounceCharge)
            emi['ECS bounce charge'] =
              this.strService.readableAmount(bounceCharge);

          emi['Total EMI Amount'] =
            this.strService.readableAmount(totalEMIAmount);
          emi['totalEMIAmount'] = totalEMIAmount;
          emi['Delayed'] = dueStatus == '1' ? true : false;
          if (dueStatus == '1' || delayDays) {
            emi['Delay Days'] = delayDays;
            if (!isDelayed) isDelayed = true;
          }
          emi['Paid'] = payStatus == '1' ? true : false;
          emi['payButton'] = payButton;
          const autoDebit = autoPayData.find((a) => a?.emiId == emiId);
          emi['info'] = autoDebit ? autoDebit : {};
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
          emi['pay_emi_info'] = pay_emi_info;
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

  //get transaction data and autoPayDetail
  private transactionAutodebitEMIInfo(data) {
    try {
      const emiData = data?.emiData;
      const emiDates = emiData.map((emi) => {
        if (emi?.payment_status === '0') return emi.emi_date;
      });
      const transData = data?.transData;
      let totalRepaidAmount = 0;
      const autoPayDetail = [];
      const transLength = transData.length;
      for (let index = 0; index < transLength; index++) {
        try {
          const tra = transData[index];
          const status = tra.status;
          const paidAmount = tra.paidAmount;
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
          if (status == kCompleted) totalRepaidAmount += paidAmount ?? 0;
        } catch (error) {}
      }
      return { autoPayDetail, totalRepaidAmount };
    } catch (error) {
      return {};
    }
  }

  //#region add purpose id
  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  async addPurpose(body: any) {
    try {
      await this.delay(500);
      const userId = body.userId;
      const purposeId = body.purposeId;
      const note = (body.note ?? '').trim();
      const attributes = ['id', 'loanStatus', 'purposeId'];
      /// user active deviceId
      const userAtt = ['recentDeviceId'];
      const include = [{ model: registeredUsers, attributes: userAtt }];
      // recentDeviceId
      const options = { where: { userId }, order: [['id', 'desc']], include };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (!loanData || loanData === k500Error) return kInternalError;
      const status = loanData.loanStatus;
      let id = loanData.id;
      const finalData: any = { purposeId };
      if (note) finalData.loanPurpose = note;
      /// update
      if (status === 'InProcess' && !loanData.purposeId) {
        finalData.completedLoan = await this.getCompletedLoanCount(userId);
        const result = await this.loanRepo.updateRowData(finalData, id);
        if (!result || result === k500Error) return kInternalError;
      } else if (status === 'Rejected' || status === 'Complete') {
        //// create
        //// get complited loan count
        finalData.completedLoan = await this.getCompletedLoanCount(userId);
        const interestRate =
          await this.commonSharedService.getEligibleInterestRate({ userId });
        const activeDeviceId = loanData?.registeredUsers?.recentDeviceId;
        finalData.loanStatus = 'InProcess';
        finalData.userId = userId;
        finalData.interestRate = interestRate;
        finalData.loanAmount = GLOBAL_RANGES.MAX_LOAN_AMOUNT;
        finalData.duration = MAX_DURATION;
        finalData.activeDeviceId = activeDeviceId;
        const result = await this.loanRepo.create(finalData);
        if (!result || result === k500Error) return kInternalError;
        id = result.id;
      }
      const toDay = this.typeService.getGlobalDate(new Date());
      const where = { id: { [Op.ne]: id }, loanStatus: 'InProcess', userId };
      const result = await this.loanRepo.getTableWhereData(['id'], { where });
      let stage = '';
      try {
        const userData = await this.userRepo.getRowWhereData(['id', 'stage'], {
          where: { id: userId },
        });
        if (userData === k500Error) stage = '';
        stage = (userData?.stage ?? '').toString();
      } catch (error) {}

      if (result && result != k500Error && result.length > 0) {
        for (let index = 0; index < result.length; index++) {
          try {
            const loanId = result[index].id;
            await this.loanRepo.updateWhere(
              {
                loanStatus: 'Rejected',
                lastStage: stage,
                manualVerification: '2',
                manualVerificationAcceptId: SYSTEM_ADMIN_ID,
                remark: kDuplicateLoan,
                verifiedDate: toDay.toJSON(),
              },
              loanId,
              { loanStatus: 'InProcess', userId },
            );
          } catch (error) {}
        }
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // Track 4.1
  //get disbursed details

  async getDisbursementDetails(query) {
    try {
      const loanId = query?.loanId;
      const userId = query?.userId;
      if (!loanId || !userId) return kParamMissing();

      const disbursmentInc: any = { model: disbursementEntity };
      const attributes = [
        'id',
        'payout_id',
        'amount',
        'utr',
        'status',
        'mode',
        'account_number',
        'userId',
        'loanId',
        'bank_name',
      ];
      const include = [
        {
          model: loanTransaction,
          attributes: ['id', 'loan_disbursement_date'],
        },
      ];
      const options = {
        where: { loanId, userId, status: 'processed' },
        include,
      };
      const disbursedData: any = await this.disbursedRepo.getRowWhereData(
        attributes,
        options,
      );
      if (disbursedData == k500Error) return kInternalError;

      const data: any = {};
      if (disbursedData) {
        data['disbursedAmount'] = (disbursedData?.amount / 100).toFixed(2);
        data['disbursedDate'] = disbursedData?.loan?.loan_disbursement_date;
        data['transactionId'] = disbursedData?.payout_id;
        data['paidVia'] = disbursedData?.mode;
        data['bank'] = disbursedData?.bank_name;
        data['accountNo'] = disbursedData?.account_number;
      }

      const loanDisbursed = disbursedData ? true : false;
      return {
        loanDisbursed,
        data,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get complited loan count
  private async getCompletedLoanCount(userId) {
    try {
      const where = { userId, loanStatus: 'Complete' };
      const count = await this.loanRepo.getCountsWhere({ where });
      if (count !== k500Error) return count;
      return 0;
    } catch (error) {
      return 0;
    }
  }
  //#endregion

  async preDataAndSendDisbursementWhatsappMsg(loanData) {
    try {
      const adminId = loanData?.adminId ?? SYSTEM_ADMIN_ID;
      const loanId = loanData?.id;
      const appType = loanData?.appType;
      const loan_disbursement_date = loanData?.loan_disbursement_date;
      const amount = this.typeService.amountNumberWithCommas(
        loanData?.disbursementData[0]?.amount / 100,
      );
      const transactionId = loanData?.disbursementData[0]?.utr;
      const userId = loanData?.registeredUsers?.id;
      const customerName = loanData?.registeredUsers?.fullName;
      const email = loanData?.registeredUsers?.email;
      let number = this.cryptService.decryptPhone(
        loanData?.registeredUsers?.phone,
      );
      if (!gIsPROD) number = UAT_PHONE_NUMBER[0];
      const agreementURL = loanData?.eSignData?.signed_document_upload;
      const whatsappOption = {
        customerName,
        email,
        number,
        disbursedAmount: amount,
        transactionId: transactionId,
        disburseDate: this.typeService.dateToFormatStr(loan_disbursement_date),
        loanId,
        userId,
        agreementURL,
        adminId,
        title: 'Disbursement',
        requestData: 'disbursement',
        appType,
      };
      // await this.whatsAppService.sendWhatsAppMessage(whatsappOption);
      this.whatsAppService.sendWhatsAppMessageMicroService(whatsappOption);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get pay button info
  private getPayButtonInfo(
    emi_details,
    emi_amount,
    penalty,
    amount,
    emi_list: any,
  ) {
    const pay_emi_info = {};
    if (emi_list) {
      const today = this.typeService.getGlobalDate(new Date()).getTime();
      const filter = emi_list.filter(
        (f) =>
          f.payment_status == '0' && new Date(f.emi_date).getTime() <= today,
      );
      if (filter.length > 0) {
        let total_amount = 0;
        filter.forEach((ele) => {
          const emi_amount = this.strService.readableAmount(
            (+ele.emi_amount + +ele?.penalty).toFixed(),
          );
          const emi_emiNumber = ele?.emiNumber;
          total_amount += +ele.emi_amount + +ele.penalty;
          pay_emi_info['EMI ' + emi_emiNumber + ' Amount'] = emi_amount;

          const delayDays = ele?.penalty_days;
          if (delayDays || ele?.penalty) {
            const more_info = {};
            /// delay day
            if (delayDays)
              more_info['Delayed by'] =
                delayDays + ' Day' + (delayDays > 1 ? 's' : '');

            /// get penalty
            const bounceCharge = ele?.bounceCharge ?? 0;
            let penalty = +ele?.penalty - bounceCharge;
            if (penalty < 0) penalty = 0;
            if (penalty)
              more_info['Penalty'] = this.strService.readableAmount(penalty);

            /// bounce charge
            if (bounceCharge)
              more_info['ECS'] = this.strService.readableAmount(bounceCharge);

            pay_emi_info['emi_' + emi_emiNumber + '_more_info'] = more_info;
          }
        });
        pay_emi_info['Total amount to be repay\n#*Inclusive of Penalty*#'] =
          this.strService.readableAmount(total_amount);
        pay_emi_info['isGreaterEMI'] = true;
        pay_emi_info['amount'] = total_amount;
      } else return null;
    } else {
      pay_emi_info['EMI Amount'] = emi_amount;
      if (penalty) pay_emi_info['Penalty Amount'] = penalty;

      /// delay day
      const delayDays = emi_details?.penalty_days;
      if (delayDays)
        pay_emi_info['Delayed by'] =
          delayDays + ' Day' + (delayDays > 1 ? 's' : '');

      /// bounce charge
      const bounceCharge = emi_details?.bounceCharge ?? 0;
      if (bounceCharge)
        pay_emi_info['ECS'] = this.strService.readableAmount(bounceCharge);

      const key =
        'Total amount to be repay' +
        (penalty ? '\n#*Inclusive of Penalty*#' : '');
      pay_emi_info[key] = this.strService.readableAmount(amount);
      pay_emi_info['isGreaterEMI'] = false;
      pay_emi_info['amount'] = amount;
    }
    return pay_emi_info;
  }
  //#endregion

  // start region get loan and emi data from UId
  async fetchDataFromUId(query) {
    try {
      const key = query.key;
      if (!key) return kParamsMissing;
      const loanId = key / 484848;
      if (isNaN(loanId)) return k422ErrorMessage('Provide valid key');
      const transInclude: SequelOptions = { model: TransactionEntity };
      transInclude.required = false;
      transInclude.where = { status: kCompleted };
      transInclude.attributes = ['id', 'paidAmount'];
      const loanAttr = [
        'id',
        'loan_disbursement_date',
        'interestRate',
        'loanStatus',
        'netApprovedAmount',
        'loanCompletionDate',
        'appType',
        'loanClosureMailCount',
        'settlementMailCount',
      ];

      const emiInclude: any = {
        model: EmiEntity,
      };
      emiInclude.attributes = [
        'id',
        'emi_date',
        'partPaymentPenaltyAmount',
        'payment_due_status',
        'payment_status',
        'penalty',
        'penalty_days',
        'emi_amount',
        'principalCovered',
        'interestCalculate',
        'settledId',
      ];

      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName'],
      };
      const loanData = await this.loanRepo.getRowWhereData(loanAttr, {
        where: { id: loanId },
        include: [emiInclude, userInclude, transInclude],
      });
      if (loanData === k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      const TotalRepayAmount = loanData?.transactionData.reduce(
        (total, element) => {
          return total + (element?.paidAmount ?? 0);
        },
        0,
      );

      let isLoanClosure = false;
      let isLoanSettled = false;
      // Checking for link sent by admin(loan closure offer or Loan Settlement).
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

      const todayDate = this.typeService.getGlobalDate(new Date());
      const repayAmount = this.strService.readableAmount(TotalRepayAmount);
      const approvedAmount = this.strService.readableAmount(
        loanData?.netApprovedAmount,
      );
      const tempObj: any = {
        userId: loanData?.registeredUsers?.id,
        name: loanData?.registeredUsers?.fullName ?? '',
        fullpayAmount: 0,
        totalEmiAmount: 0,
        emiDate: null,
        penaltyAmount: 0,
        penaltyDays: 0,
        emiId: null,
        loanId: loanData.id,
        isLoanCompleted: loanData.loanStatus == 'Complete',
        playStoreLink:
          loanData?.appType == 1 ? NBFCPlayStoreLink : lspPlaystoreLink,
        appStoreLink:
          loanData?.appType == 1 ? NBFCAppStoreLink : lspAppStoreLink,
        totalRepayAmount: repayAmount,
        approvedAmount: approvedAmount,
        loanCompletionDate: loanData?.loanCompletionDate
          ? this.typeService.getDateFormated(loanData?.loanCompletionDate, '/')
          : '-',
        customerCareNumber:
          loanData?.appType == 0
            ? kLspHelpContactAfterDisbursement
            : kHelpContact,
        customerCareMail:
          loanData?.appType == 0 ? KLspSupportMail : kSupportMail,
        isLoanClosure,
        isLoanSettled,
      };
      let emiData = loanData.emiData;
      emiData = emiData.sort(
        (a, b) =>
          new Date(a.emi_date).getTime() - new Date(b.emi_date).getTime(),
      );
      if (!emiData) return kInternalError;
      const previousEmis = [];
      const upcommingEmis = [];
      let isDefaulter = false;
      let paidEmiCounts = 0;
      for (let i = 0; i < emiData.length; i++) {
        try {
          const emiItem = emiData[i];
          if (emiItem.payment_due_status === '1') isDefaulter = true;
          if (
            emiItem.payment_status === '0' &&
            new Date(emiItem.emi_date).getTime() < new Date(todayDate).getTime()
          ) {
            previousEmis.push(emiItem);
          } else if (emiItem.payment_status === '0')
            upcommingEmis.push(emiItem);
          if (emiItem.payment_status === '1') paidEmiCounts += 1;
        } catch (error) {}
      }
      tempObj.loanStatus = isDefaulter ? 'Delay' : 'On-Time';
      if (tempObj.isLoanCompleted) return tempObj;

      loanData.loanId = loanData?.id;
      //  full pay amount calculation
      const fullPayData = await this.sharedCalculation.getFullPaymentData(
        loanData,
      );
      tempObj.fullpayAmount = fullPayData.totalAmount;
      if (emiData.length == paidEmiCounts) tempObj.isLoanCompleted = true;
      if (previousEmis.length <= 1) {
        if (previousEmis.length == 1) {
          tempObj.totalEmiAmount =
            +previousEmis[0].emi_amount + +previousEmis[0].penalty;
          tempObj.penaltyAmount = +previousEmis[0].penalty ?? 0;
          tempObj.penaltyDays = previousEmis[0].penalty_days ?? '0';
          tempObj.emiDate = previousEmis[0].emi_date;
          tempObj.emiId = previousEmis[0].id;
        } else if (upcommingEmis.length) {
          tempObj.totalEmiAmount =
            +upcommingEmis[0].emi_amount + +upcommingEmis[0].penalty;
          tempObj.penaltyAmount = +upcommingEmis[0].penalty ?? 0;
          tempObj.penaltyDays = upcommingEmis[0].penalty_days ?? '0';
          tempObj.emiDate = upcommingEmis[0].emi_date;
          tempObj.emiId = upcommingEmis[0].id;
        }
      }
      let payment_service = await this.commonSharedService.getServiceName(
        'PAYMENT_MODE',
      );
      const netBankingSource = payment_service ?? kRazorpay;
      tempObj.netBankingSource = netBankingSource;
      return tempObj;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async acceptAmountCharges(reqData) {
    try {
      // Params validation
      const userId = reqData?.userId;
      const appType = reqData?.appType;
      if (!userId) return kParamMissing('userId');
      const loanId = reqData?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const amount: number = reqData?.amount;
      if (!amount) return kParamMissing('amount');
      let MIN_LOAN_AMOUNT = GLOBAL_RANGES.MIN_LOAN_AMOUNT;
      let MAX_LOAN_AMOUNT = GLOBAL_RANGES.MAX_LOAN_AMOUNT;
      if (amount < MIN_LOAN_AMOUNT && EnvConfig.nbfc.nbfcType == '1')
        MIN_LOAN_AMOUNT = amount;
      if (amount > 100000) MAX_LOAN_AMOUNT = 200000;
      if (amount < MIN_LOAN_AMOUNT || amount > MAX_LOAN_AMOUNT)
        return k422ErrorMessage(kSelectedLoanAmount);
      const loanData = await this.getLoanData(reqData);

      if (loanData.message) return loanData;
      const emiDate = loanData?.emiSelection?.selectedEmiDate;
      await this.repository.updateRowData(
        { netApprovedAmount: amount },
        loanId,
      );

      let insuranceOptValue = reqData?.isInsurancePolicy ?? false;
      const calculation = await this.sharedEmi.refreshCalculation(
        loanId,
        null,
        { emiDate, insuranceOptValue },
      );

      if (calculation?.message) return calculation;
      return await this.prepareAcceptScreen(calculation, appType);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private async getLoanData(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      const loanId = reqData?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const attr = ['id', 'userId', 'emiSelection'];
      const opts = { where: { id: loanId, userId } };
      const loanData = await this.repository.getRowWhereData(attr, opts);
      if (loanData === k500Error) return kInternalError;
      else if (!loanData) return kBadRequest;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareAcceptScreen(data, appType) {
    try {
      const result: any = {};
      const userId = data?.userId;
      const amount = data?.netApprovedAmount ?? 0;
      const anummIntrest = data?.anummIntrest;
      const approvedAmount = this.typeService.amountNumberWithCommas(amount);
      const interest = data.interestRate;
      const apr = anummIntrest ? anummIntrest : (interest * 365).toFixed(3);
      const tenure = data?.approvedDuration;
      const charges = data?.charges ?? {};
      const processPr = data?.processingFees;
      let processingFees: any = this.typeService.manageAmount(
        (amount * processPr) / 100,
      );
      const gstPr = charges?.gst_per;
      let gstCharge = charges?.gst_amt ?? 0;
      const docPr = charges?.doc_charge_per;
      let docCharge = charges?.doc_charge_amt ?? 0;
      let insuranceFee = charges?.insurance_fee ?? 0;
      const riskPr = charges?.risk_assessment_per ?? 1;
      let riskCharge = charges?.risk_assessment_charge ?? 0;
      const stampFees = data?.stampFees ?? 0;
      const insurance = data?.insuranceDetails ?? {};
      let totalCharges = insuranceFee + Math.round(docCharge) + processingFees;
      totalCharges += Math.round(totalCharges * (gstPr / 100));
      totalCharges = this.strService.readableAmount(totalCharges);

      const premium = Math.round(insurance?.totalPremium ?? 0);
      let disburseAmount =
        amount -
        processingFees -
        stampFees -
        docCharge -
        insuranceFee -
        gstCharge -
        riskCharge;

      result['minAmount'] = GLOBAL_RANGES.MIN_LOAN_AMOUNT;
      result['eligibleAmount'] =
        data?.approvedLoanAmount ?? data?.loanAmount ?? data?.netApprovedAmount;
      result['approvedAmount'] = `${kRuppe}${approvedAmount}`;
      let gstOn = 'Processing fees + Documentation charges';
      const chargesInfo = {};
      const insuranceInfo = {};
      processingFees = this.typeService.amountNumberWithCommas(processingFees);
      if (!processingFees.includes('.')) processingFees += '.00';
      chargesInfo[
        `Processing fees #*@${processPr}%*#`
      ] = `-${kRuppe}${processingFees}`;
      if (insuranceFee) {
        insuranceFee = this.typeService.amountNumberWithCommas(insuranceFee);
        if (!insuranceFee.includes('.')) insuranceFee += '.00';
        chargesInfo['Online convenience fees'] = `-${kRuppe}${insuranceFee}`;
        gstOn += ' + Online convenience fees';
      }
      if (riskCharge) {
        riskCharge = this.typeService.amountNumberWithCommas(riskCharge);
        if (!riskCharge.includes('.')) riskCharge += '.00';
        chargesInfo[
          `Risk assessment fees #*@${riskPr}%*#`
        ] = `-${kRuppe}${riskCharge}`;
        gstOn += ' + Risk assessment fees';
      }
      docCharge = this.typeService.amountNumberWithCommas(docCharge);
      if (!docCharge.includes('.')) docCharge += '.00';
      chargesInfo[`Document charges #*@${docPr}%*#`] = `-${kRuppe}${docCharge}`;
      gstCharge = this.typeService.amountNumberWithCommas(gstCharge);
      if (!gstCharge.includes('.')) gstCharge += '.00';
      if (data.insuranceOptValue == true) {
        insuranceInfo['Loan protect insurance premium'] =
          appType != 0
            ? `${this.strService.readableAmount(premium.toFixed(2))}`
            : `${this.strService.readableAmount(premium)}`;
        disburseAmount -= premium;
        result['insuranceInfo'] = insuranceInfo;
      }
      chargesInfo[`GST #*@${gstPr}%*#`] = `-${kRuppe}${gstCharge}`;

      if (GlobalServices.INSURANCE_SERVICE != 'NONE')
        result['insurancePolicy'] = KInsurancePolicy;

      result['chargesInfo'] = chargesInfo;
      result['gstOn'] = gstOn;
      result['loanTenure'] = `${tenure} days`;
      const netEmiData = this.getEmiList(data?.netEmiData ?? []);
      result['emiData'] = netEmiData?.emiList;
      const reData = { userId, needDelayTag: true };
      const interestData: any =
        await this.commonSharedService.getEligibleInterestRate(reData);
      const delayInterestRate = interestData?.delayInterestRate;
      if (delayInterestRate) result['delayInterestRate'] = delayInterestRate;
      const totalInterest = this.typeService.amountNumberWithCommas(
        netEmiData.totalInterest,
      );
      result['totalInterest'] = `${kRuppe}${totalInterest}`;
      result['totalInterestTag'] = `@${interest}% per day/APR ${apr}%`;
      result['forcefullEmiSelection'] = data?.canSelectEmiDate ? true : false;
      const emiSelectedDate = data?.emiSelectedDate;
      result['emiSelectedDate'] = emiSelectedDate;
      result['insuranceOptValue'] = GlobalServices.INSURANCE_OPT_VALUE ?? false;
      if (
        GlobalServices.INSURANCE_SERVICE &&
        GlobalServices.INSURANCE_SERVICE != 'NONE'
      ) {
        result['insurance'] = data.insurance;
        result['isInsurance'] = true;
      }

      disburseAmount = this.typeService.manageAmount(
        disburseAmount,
        disburseAmt,
      );
      result[
        'netDisbursementAmount'
      ] = `${kRuppe}${this.typeService.amountNumberWithCommas(disburseAmount)}`;
      result['calenderData'] =
        this.commonSharedService.getCalenderDataForEMI(emiSelectedDate);

      result[
        'latePaymentTag'
      ] = `In the event of delayed EMI payment, regular interest accumulates on the outstanding EMI principal amount, in addition to any applicable penal charges.`;

      if (appType == 0) {
        result['totalCharges'] = totalCharges;
        result['totalInterestTag'] = `${anummIntrest}%* APR`;
      }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  getEmiList(netEmiData) {
    try {
      const emiList = [];
      let totalInterest = 0;
      netEmiData.forEach((el, index) => {
        try {
          const emiNo = (index + 1).toString();
          const emiAmt = this.typeService.amountNumberWithCommas(el?.Emi ?? 0);
          const principalAmt = this.typeService.amountNumberWithCommas(
            el?.PrincipalCovered ?? 0,
          );
          const interestAmt = this.typeService.amountNumberWithCommas(
            el?.InterestCalculate ?? 0,
          );
          totalInterest += el?.InterestCalculate ?? 0;
          const emi = {
            emiNo,
            emiDate: this.typeService.getSimpleDateFormat(el?.Date),
            principalAmt: `${kRuppe}${principalAmt}`,
            interestAmt: `${kRuppe}${interestAmt}`,
            totalEmiAmt: `${kRuppe}${emiAmt}`,
          };
          emiList.push(emi);
        } catch (error) {}
      });
      return { emiList, totalInterest };
    } catch (error) {
      return {};
    }
  }

  //startregion for sending NOC to  user on his request
  async funNocRequestByUser(query) {
    try {
      const loanId = query?.loanId;
      const nocRequestKey = loanId + 'NOC_DETALS';
      if (!loanId) return kParamMissing('loanId');
      const loanAtr = ['nocURL'];
      const loanOptions = {
        where: {
          id: loanId,
          loanStatus: 'Complete',
        },
      };
      const loanData = await this.repository.getRowWhereData(
        loanAtr,
        loanOptions,
      );
      if (loanData === k500Error) return kInternalError;
      if (loanData?.nocURL) return { nocURL: loanData?.nocURL };

      //if NOC not sent
      const data = await this.sharedTransactionService.createUserNoc({
        loanId,
      });
      await this.redisService.del(nocRequestKey); //delete redis key
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
}
