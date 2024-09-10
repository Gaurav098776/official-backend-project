// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { GLOBAL_FLOW, gIsPROD } from 'src/constants/globals';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCompleted,
  kNoDataFound,
  kNotEligibleForNBFC,
  tAadhaar,
  tApproval,
  tContact,
  tDisbursement,
  tEMandate,
  tESign,
  tEmployment,
  tInProgress,
  tLoanAccept,
  tNetbanking,
  tPan,
  tPending,
  tRegistration,
  tRejected,
  tResidence,
  tSuccess,
} from 'src/constants/strings';
import { admin } from 'src/entities/admin.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { ElephantService } from 'src/thirdParty/elephant/elephant.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { QualityParameterService } from '../qualityParameter/qualityParameter.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import {
  kGetCashfreePayment,
  kGetRazorpayPayment,
  kGetSigndeskPayment,
} from 'src/constants/network';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { EmiSharedService } from 'src/shared/emi.service';
import { EMIRepository } from 'src/repositories/emi.repository';
import { FileService } from 'src/utils/file.service';

@Injectable()
export class LoanService {
  constructor(
    private readonly cryptService: CryptService,
    private readonly elephantService: ElephantService,
    private readonly repository: LoanRepository,
    private readonly emiRepo: EMIRepository,
    private readonly typeService: TypeService,
    private readonly insuranceRepo: InsuranceRepository,
    private readonly fileService: FileService,
    // Repositories
    private readonly masterRepo: MasterRepository,
    @Inject(forwardRef(() => QualityParameterService))
    private readonly qualityParameterService: QualityParameterService,
    private readonly commonService: CommonSharedService,
    private readonly sharedCalculation: CalculationSharedService,
    private readonly emiSharedService: EmiSharedService,
    private readonly loanRepo: LoanRepository,
  ) {}

  async addAccIdToMissingOne(loanId: number) {
    const attributes = ['id'];
    const order = [['loan_disbursement_date', 'ASC']];
    const where: any = {
      accId: { [Op.eq]: null },
    };
    if (loanId) where.id = loanId;
    else where.loan_disbursement_date = { [Op.ne]: null };
    const options: any = { order, where };

    const loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) throw new Error();

    let accNumber = await this.getNextAccId();

    for (let index = 0; index < loanList.length; index++) {
      try {
        const loanData = loanList[index];
        const updatedData = { accId: accNumber };
        const loanId = loanData.id;

        const updatedLoanData = await this.loanRepo.updateRowData(
          updatedData,
          loanId,
        );
        if (updatedLoanData != k500Error) accNumber++;
      } catch (error) {}
    }
  }

  private async getNextAccId() {
    const attributes = ['accId'];
    const where = { accId: { [Op.ne]: null } };
    const order = [['accId', 'DESC']];
    const options = { order, where };
    const loanData = await this.loanRepo.getRowWhereData(attributes, options);
    if (loanData == k500Error) throw new Error();
    else if (!loanData) return 1;
    else return loanData.accId + 1;
  }

  async insuranceProposal(reqData) {
    try {
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      // Joins
      const bankingInclude: any = { model: BankingEntity };
      bankingInclude.attributes = ['mandateAccount'];
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarAddressResponse',
        'aadhaarDOB',
        'aadhaarResponse',
      ];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = [
        'email',
        'gender',
        'isBlacklist',
        'fullName',
        'phone',
      ];
      userInclude.include = [kycInclude];
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = ['status'];
      const include = [bankingInclude, eSignInclude, userInclude];

      const attributes = [
        'userId',
        'approvedDuration',
        'insuranceDetails',
        'loan_disbursement_date',
        'manualVerification',
        'netApprovedAmount',
        'nomineeDetail',
        'loanStatus',
        'insuranceOptValue',
      ];
      const options = { include, where: { id: loanId } };

      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      if (loanData.loanStatus != 'Accepted' && loanData.loanStatus != 'Active')
        return k422ErrorMessage('Insurance procedure failed !');
      if (loanData.eSignData?.status != '1')
        return k422ErrorMessage('eSign process is yet to complete');
      if (!loanData.loan_disbursement_date && gIsPROD)
        return k422ErrorMessage('Disbursement yet to initiate');
      if (loanData.registeredUsers.isBlacklist == '1')
        return k422ErrorMessage(kNotEligibleForNBFC);
      // create data in
      let response: any = {};
      if (loanData?.insuranceOptValue == true) {
        const createData = { userId: loanData.userId, loanId, status: -1 };
        const result = await this.insuranceRepo.create(createData);
        if (!result || result === k500Error) return kInternalError;

        // update id
        await this.repository.updateRowData({ insuranceId: result.id }, loanId);

        loanData.id = loanId;
        const preparedData: any = await this.prepareDataForInsuranceProposal(
          loanData,
        );
        if (preparedData?.message) return preparedData;
        if (preparedData.pincode == '-')
          preparedData.pincode = await this.getPinCode(
            loanData.registeredUsers,
          );
        response = await this.elephantService.initiateProposal(preparedData);
        if (response?.message) return response;
        const update = { ...response };
        await this.insuranceRepo.updateRowData(update, result.id);
      }
      return response;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async prepareDataForInsuranceProposal(loanData) {
    try {
      const bankingData = loanData.bankingData ?? {};
      const userData = loanData.registeredUsers ?? {};
      const kycData = userData.kycData ?? {};
      let pincode = '-';
      try {
        if (kycData?.aadhaarResponse) {
          const response = JSON.parse(kycData?.aadhaarResponse);
          pincode = response?.zip ?? response?.pincode ?? '-';
          if (pincode == '-' && response['addressDetails']) {
            try {
              let address = response['addressDetails'];
              if (typeof address == 'string') address = JSON.parse(address);
              pincode = address['pc'] ?? '-';
            } catch (error) {}
          }
        }
      } catch (error) {}
      const data = {
        name: userData.fullName ?? '',
        phone: this.cryptService.decryptPhone(userData.phone),
        email: userData.email,
        dob: await this.typeService.getDateAsPerAadhaarDOB(kycData.aadhaarDOB),
        gender: userData.gender,
        bankAccNumber: bankingData.mandateAccount,
        aadhaarAddress: this.typeService.getAadhaarAddress(kycData).address,
        approvedAmount: +loanData.netApprovedAmount,
        loanTenure: loanData.approvedDuration,
        loanId: loanData.id,
        pincode: pincode,
        disbursementDate: loanData.loan_disbursement_date,
        insuranceDetails: loanData?.insuranceDetails ?? {},
        nomineeDetails: loanData?.nomineeDetail ?? {},
      };

      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get pincode
  private async getPinCode(userData) {
    try {
      const kycData = userData.kycData ?? {};
      const address = JSON.parse(kycData?.aadhaarAddress ?? '') ?? {};
      return await this.typeService.findPinCode(address);
    } catch (error) {}
    return '-';
  }
  //#endregion

  async trackerAndMissingMonth(reqData) {
    // Params validation
    const loanId = reqData.loanId;
    if (!loanId) return kParamMissing('loanId');
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');

    // Get data from database
    const result = await this.findUserDataForTracking(userId, loanId);
    if (result === k500Error) return kInternalError;

    const loanData = result?.loanData ?? {};
    const bankingData = loanData.bankingData ?? {};
    let isStatementMonthMissing = false;
    let monthList = [];
    const salaryVerification = bankingData.salaryVerification ?? '-1';
    if (
      bankingData.dataOfMonth &&
      bankingData?.dataOfMonth.includes('false') &&
      (salaryVerification == '4' ||
        (salaryVerification == '0' && !bankingData.skipStmtAdmin))
    ) {
      try {
        monthList = JSON.parse(bankingData.dataOfMonth);
        isStatementMonthMissing = true;
      } catch (error) {}
    }

    // Preparation for tracking data
    const list = await this.prepareTrackingData(result);
    return {
      verificationTrackerData: list,
      isStatementMonthMissing,
      monthList,
    };
  }

  async findUserDataForTracking(userId, loanId) {
    const adminInclude = { model: admin, attributes: ['fullName'] };
    // Subscription model
    const subAttributes = [
      'status',
      'mode',
      'response',
      'subType',
      'updatedAt',
    ];
    const subscriptionInclude = {
      model: SubScriptionEntity,
      attributes: subAttributes,
    };
    // Mandate model
    const mandateAtt = ['actual_status', 'updatedAt'];
    const mandateInclude = { model: mandateEntity, attributes: mandateAtt };
    // Esign and disbursemenst model
    const edAtt = ['status', 'updatedAt'];
    const esignInclude = { model: esignEntity, attributes: edAtt };
    const disbursementInclude = {
      model: disbursementEntity,
      attributes: edAtt,
    };
    const bankingAtt = [
      'salaryVerification',
      'salaryVerificationDate',
      'dataOfMonth',
      'skipStmtAdmin',
    ];
    const bankingInclude: any = {
      required: false,
      model: BankingEntity,
      attributes: bankingAtt,
      include: [{ ...adminInclude, as: 'netApproveByData' }],
    };
    // Loan model
    const loanInc: any = [
      subscriptionInclude,
      mandateInclude,
      esignInclude,
      disbursementInclude,
      bankingInclude,
      { ...adminInclude, as: 'adminData' },
    ];
    const loanAtt = [
      'manualVerification',
      'id',
      'remark',
      'loanRejectReason',
      'userReasonDecline',
      'declineId',
    ];
    const loanInclude: any = {
      required: false,
      model: loanTransaction,
      attributes: loanAtt,
      include: loanInc,
    };
    // Work mail model
    const workMailAttr = [
      'approveById',
      'status',
      'rejectReason',
      'verifiedDate',
    ];
    const workMailInclude: any = {
      required: false,
      model: WorkMailEntity,
      attributes: workMailAttr,
    };
    // Salary slip model
    const salarySlipAttr = [
      'approveById',
      'status',
      'rejectReason',
      'salaryVerifiedDate',
    ];
    const salarySlipInclude: any = {
      required: false,
      model: SalarySlipEntity,
      attributes: salarySlipAttr,
    };
    salarySlipInclude.include = [{ ...adminInclude, as: 'admin' }];
    // Company details model
    const empAtt = ['companyVerification', 'rejectReason', 'createdAt'];
    const empInclude: any = {
      model: employmentDetails,
      required: false,
      attributes: empAtt,
    };
    const kycMo = {
      required: false,
      model: KYCEntity,
      attributes: ['id'],
      include: [
        { ...adminInclude, as: 'panVerifiedAdminData' },
        { ...adminInclude, as: 'aadhaarVerifiedAdminData' },
      ],
    };
    const userAttributes = ['id', 'fullName'];
    const userInclude = {
      model: registeredUsers,
      attributes: userAttributes,
      include: [
        kycMo,
        { ...adminInclude, as: 'residenceAdminData' },
        { ...adminInclude, as: 'contactAdminData' },
      ],
    };
    const masterWhere: any = {};
    if (loanId) masterWhere.loanId = loanId;
    else if (userId) masterWhere.userId = userId;
    const masterOptions = {
      where: masterWhere,
      include: [
        userInclude,
        empInclude,
        salarySlipInclude,
        workMailInclude,
        loanInclude,
      ],
    };

    const attributes = [
      'id',
      'status',
      'rejection',
      'dates',
      'loanId',
      'salarySlipId',
      'workMailId',
      'empId',
      'kfsStatus',
      'kfsAcceptDate',
    ];
    const masterData = await this.masterRepo.getRowWhereData(
      attributes,
      masterOptions,
    );
    if (!masterData || masterData === k500Error) return kInternalError;
    return masterData;
  }

  async prepareTrackingData(data) {
    try {
      const masterData = data;
      const userData = data.userData;
      const kycData = userData.kycData;
      const registration = this.getRegistrationTracking(masterData);
      const employement = await this.getEmployementTracking(masterData);
      const residence = this.getResidenceTracking(masterData, userData);
      const netBanking = this.getNetbankingTracking(masterData);
      const aadhaarTracking = this.getAadhaarTracking(masterData, kycData);
      const contactTracking = this.getContactTracking(masterData, userData);
      const panTracking = this.getPanTracking(masterData, kycData);
      const finalVerification = this.getFinalVerification(masterData);
      const loanAccept = this.getLoanAccept(masterData);
      const emandateVerification = this.getEmandateVerification(masterData);
      const esingVerification = this.getEsignVerification(masterData);
      const disbursementTrack = this.getDisburesementTracking(masterData);

      const trackingList = [
        registration,
        aadhaarTracking,
        employement,
        netBanking,
        panTracking,
        finalVerification,
        emandateVerification,
        esingVerification,
        disbursementTrack,
      ];
      // Dynamic reference step
      if (contactTracking.masterStatus != 4) {
        if (GLOBAL_FLOW.REFERENCE_IN_APP) {
          delete contactTracking.masterStatus;
          trackingList.push(contactTracking);
        } else if (
          !GLOBAL_FLOW.REFERENCE_IN_APP &&
          contactTracking.masterStatus != -1
        ) {
          delete contactTracking.masterStatus;
          trackingList.push(contactTracking);
        }
      }
      // Dynamic residence step
      if (GLOBAL_FLOW.RESIDENCE_IN_APP) {
        delete residence?.masterStatus;
        trackingList.push(residence);
      } else if (
        !GLOBAL_FLOW.RESIDENCE_IN_APP &&
        [1, 3, 7].includes(residence?.masterStatus)
      ) {
        delete residence?.masterStatus;
        trackingList.push(residence);
      }
      // Dynamic loanAccept
      if (loanAccept.kfsStatus) {
        delete loanAccept.kfsStatus;
        trackingList.push(loanAccept);
      }

      trackingList.sort((a, b) => a.orderBy - b.orderBy);
      return this.prepareNextUnderVerification(trackingList);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getRegistrationTracking(masterData) {
    let tracking: any = {};
    tracking.title = tRegistration;
    tracking.orderBy = 0;
    try {
      const statusData = masterData?.status;
      const dates = masterData?.dates;
      const basic = statusData?.basic ?? -1;
      const phone = statusData?.phone ?? -1;
      let status =
        basic == '1' && phone == '1'
          ? '1'
          : basic == '-1' || phone == '-1'
          ? '-1'
          : '0';
      tracking.approveBy = 'system';
      tracking.date = dates?.registration
        ? new Date(dates.registration).toJSON()
        : 0;

      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
    } catch (error) {}
    return tracking;
  }

  private async getEmployementTracking(masterData) {
    let tracking: any = {};
    tracking.title = tEmployment;
    tracking.orderBy = 2;
    try {
      const statusData = masterData?.status ?? {};
      const company = statusData?.company ?? -1;
      const salarySlip = statusData?.salarySlip ?? -1;
      const workMail = statusData?.workMail ?? -1;
      const loan = statusData?.loan ?? -1;
      const dates = masterData?.dates;
      const rejection = masterData?.rejection;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const approvedStatus = [1, 3, 4];
      const salarySlipData = masterData?.salarySlipData ?? {};
      const salarySlipAdmin = (
        await this.commonService.getAdminData(salarySlipData.approveById)
      ).fullName
        ?.trim()
        ?.toLowerCase();
      const workMailData = masterData?.workMailData ?? {};
      const workMailAdmin = (
        await this.commonService.getAdminData(workMailData.approveById)
      ).fullName
        ?.trim()
        ?.toLowerCase();

      // Employment approved by
      tracking.approveBy = declineId ? 'User' : 'system';
      if (workMailAdmin && workMailAdmin != 'system')
        tracking.approveBy = workMailAdmin;
      else if (salarySlipAdmin && salarySlipAdmin != 'system')
        tracking.approveBy = salarySlipAdmin;

      let status =
        approvedStatus.includes(company) &&
        approvedStatus.includes(salarySlip) &&
        approvedStatus.includes(workMail)
          ? '1'
          : company == 2 || workMail == 2 || salarySlip == 2
          ? '2'
          : company == -1 || workMail == -1 || salarySlip == -1
          ? '-1'
          : '0';

      tracking.date = dates?.employment
        ? new Date(dates.employment).toJSON()
        : 0;
      tracking.message = workMail == 4 ? 'SKIPPED' : '';
      if (loan == 7) status = '1';
      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
      else if (status == '2') {
        tracking.status = tRejected;
        tracking.message =
          rejection.company ??
          rejection?.salarySlip ??
          rejection?.workMail ??
          '';
      } else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getResidenceTracking(masterData, userData) {
    let tracking: any = {};
    tracking.title = tResidence;
    tracking.orderBy = 3;
    try {
      const statusData = masterData?.status ?? {};
      const residence = statusData?.residence ?? -1;
      tracking.masterStatus = residence;
      const rejection = masterData.rejection;
      const dates = masterData.dates;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const approvedStatus = [1, 3, 7];
      const status = approvedStatus.includes(residence)
        ? '1'
        : residence == '2'
        ? '2'
        : residence == '-1'
        ? '-1'
        : '0';
      tracking.date = 0;
      tracking.approveBy = declineId
        ? 'User'
        : userData?.residenceAdminData?.fullName ?? '';
      if (status == '1') {
        tracking.status = tSuccess;
        tracking.date = dates?.residence
          ? new Date(dates.residence).toJSON()
          : 0;
      } else if (status == '2') {
        tracking.message = rejection?.residence ?? '';
        tracking.date = dates?.residence
          ? new Date(dates.residence).toJSON()
          : 0;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getNetbankingTracking(masterData) {
    let tracking: any = {};
    tracking.title = tNetbanking;
    tracking.orderBy = 2;

    const statusData = masterData?.status ?? {};
    const rejection = masterData?.rejection;
    const loanData = masterData?.loanData;
    const bankingData = loanData?.bankingData;
    const bank = statusData?.bank ?? -1;
    const dates = masterData.dates;
    const declineId = loanData?.declineId;
    const approvedStatus = [1, 3];
    const status = approvedStatus.includes(bank)
      ? '1'
      : bank == '2'
      ? '2'
      : bank == '-1'
      ? '-1'
      : '0';

    tracking.approveBy = declineId
      ? 'User'
      : bankingData?.netApproveByData?.fullName ?? '';
    tracking.date = dates?.banking ? new Date(dates?.banking).toJSON() : 0;
    if (status == '1') tracking.status = tSuccess;
    else if (status == '2') {
      tracking.status = tRejected;
      tracking.message = rejection?.banking ?? '';
    } else if (status == '-1') tracking.status = tPending;
    else tracking.status = tInProgress;

    return tracking;
  }

  private getAadhaarTracking(masterData, kycData) {
    let tracking: any = {};
    tracking.title = tAadhaar;
    tracking.orderBy = 1;
    try {
      const statusData = masterData?.status ?? {};
      const aadhaar = statusData?.aadhaar ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const approvedStatus = [1, 3];
      const approvedBy = declineId
        ? 'User'
        : kycData?.aadhaarVerifiedAdminData?.fullName;
      tracking.approveBy = approvedBy;

      const status = approvedStatus.includes(aadhaar)
        ? '1'
        : aadhaar == 2
        ? '2'
        : aadhaar == -1
        ? '-1'
        : '0';
      tracking.date = dates?.aadhaar ? new Date(dates?.aadhaar).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '2') {
        tracking.message = rejection?.aadhaar;
        tracking.status = tRejected;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getPanTracking(masterData, kycData) {
    let tracking: any = {};
    tracking.title = tPan;
    tracking.orderBy = 5;
    try {
      const statusData = masterData?.status ?? {};
      const pan = statusData?.pan ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const approvedStatus = [1, 3];
      const approvedBy = declineId
        ? 'User'
        : kycData?.panVerifiedAdminData?.fullName;
      tracking.approveBy = approvedBy;

      const status = approvedStatus.includes(pan)
        ? '1'
        : pan == 2
        ? '2'
        : pan == -1
        ? '-1'
        : '0';
      tracking.date = dates?.pan ? new Date(dates?.pan).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '2') {
        tracking.message = rejection.pan;
        tracking.status = tRejected;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getContactTracking(masterData, userData) {
    let tracking: any = {};
    tracking.title = tContact;
    tracking.orderBy = 4;
    try {
      const statusData = masterData?.status ?? {};
      const contact = statusData?.contact ?? -1;
      // Contact status depends on reference in v3 flow
      tracking.masterStatus = statusData?.reference ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const approvedStatus = [1, 3, 4];
      const approvedBy = declineId
        ? 'User'
        : userData?.contactAdminData?.fullName ?? 'system';
      tracking.approveBy = approvedBy;

      const status = approvedStatus.includes(contact)
        ? '1'
        : contact == 2
        ? '2'
        : contact == -1
        ? '-1'
        : '0';
      tracking.date = dates?.contact ? new Date(dates?.contact).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '2') {
        tracking.message = rejection.contact;
        tracking.status = tRejected;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getFinalVerification(masterData) {
    let tracking: any = {};
    tracking.title = tApproval;
    tracking.orderBy = 6;
    try {
      const statusData = masterData?.status ?? {};
      const eligibility = statusData?.eligibility ?? -1;
      const rejection = masterData.rejection;
      const loanData = masterData?.loanData;
      const declineId = loanData?.declineId;
      const adminData = loanData?.adminData;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      tracking.approveBy = declineId ? 'User' : adminData?.fullName ?? '';
      const status = approvedStatus.includes(eligibility)
        ? '1'
        : eligibility == '2'
        ? '2'
        : eligibility == '-1' || eligibility == '-2' || eligibility == '5'
        ? '-1'
        : '0';
      tracking.date = dates?.eligibility
        ? new Date(dates?.eligibility).toJSON()
        : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '2') {
        tracking.status = tRejected;
        tracking.message =
          loanData?.userReasonDecline ??
          loanData?.remark ??
          loanData?.loanRejectReason ??
          rejection?.eligiblity ??
          rejection?.loan;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getLoanAccept(masterData) {
    let tracking: any = {};
    tracking.title = tLoanAccept;
    tracking.orderBy = 7;
    try {
      const kfsStatus = masterData?.kfsStatus;
      const kfsAcceptDate = masterData.kfsAcceptDate;
      const approvedStatus = [1, 3];
      tracking.approveBy = 'system';
      tracking.kfsStatus = kfsStatus;
      const status = approvedStatus.includes(kfsStatus) ? '1' : '-1';
      tracking.date = kfsAcceptDate ? new Date(kfsAcceptDate).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
    } catch (error) {}
    return tracking;
  }

  private getEmandateVerification(masterData) {
    let tracking: any = {};
    tracking.title = tEMandate;
    tracking.orderBy = 8;
    try {
      const statusData = masterData?.status ?? {};
      const eMandate = statusData?.eMandate ?? -1;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      tracking.approveBy = 'system';
      const status = approvedStatus.includes(eMandate)
        ? '1'
        : eMandate == '-1'
        ? '-1'
        : '0';
      tracking.date = dates?.eMandate
        ? new Date(dates?.eMandate ?? 0).toJSON()
        : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getEsignVerification(masterData) {
    let tracking: any = {};
    tracking.title = tESign;
    tracking.orderBy = 9;
    try {
      const statusData = masterData?.status ?? {};
      const eSign = statusData?.eSign ?? -1;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      tracking.approveBy = 'system';
      const status = approvedStatus.includes(eSign)
        ? '1'
        : eSign == -1
        ? '-1'
        : '0';

      tracking.date = dates?.eSign ? new Date(dates.eSign).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  private getDisburesementTracking(masterData) {
    let tracking: any = {};
    tracking.title = tDisbursement;
    tracking.orderBy = 10;
    try {
      const statusData = masterData?.status ?? {};
      const disbursement = statusData?.disbursement ?? -1;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      tracking.approveBy = 'system';
      const status = approvedStatus.includes(disbursement)
        ? '1'
        : disbursement == -1
        ? '-1'
        : '0';
      tracking.date = dates?.disbursement
        ? new Date(dates?.disbursement).toJSON()
        : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) {}
    return tracking;
  }

  prepareNextUnderVerification(trackingData) {
    let finalTrack: any = [];
    for (let i = 0; i < trackingData.length; i++) {
      try {
        let trackData: any = trackingData[i];
        if (i > 0) {
          const previousOne = trackingData[i - 1];
          if (trackData.status != tRejected)
            if (
              previousOne.status == tInProgress ||
              previousOne.status == tPending ||
              previousOne.status == tRejected
            ) {
              trackData.status = tPending;
            }
        }
        finalTrack.push(trackData);
      } catch (error) {}
    }
    return finalTrack;
  }

  //#region update pending
  async updatePendingInsurance(query) {
    try {
      const list = await this.findPendingInsurance(query);
      if (list?.message) return list;
      for (let index = 0; index < list.length; index++) {
        try {
          const data = list[index];
          if (data) {
            const lanId = data?.lan_id;
            if (lanId) {
              const result = await this.elephantService.getCOI(lanId);
              if (result?.message) continue;
              if (result?.success === true) {
                try {
                  const update: any = {};
                  const url = (result?.url ?? '').trim();
                  const url1 = (result?.url1 ?? '').trim();
                  if (url) update.insuranceURL = url;
                  if (url1) update.insuranceURL1 = url1;
                  await this.insuranceRepo.updateRowData(update, data.id);
                } catch (error) {}
              }
            }
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region find pending insurance
  private async findPendingInsurance(query) {
    try {
      const options: any = {
        where: {
          [Op.or]: [
            { insuranceURL: { [Op.eq]: null } },
            { insuranceURL1: { [Op.eq]: null } },
          ],
        },
      };
      if (query?.loanId) options.where.loanId = query?.loanId;
      const att = ['id', 'lan_id'];
      const result = await this.insuranceRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region migrate lanid
  async migrateLanId() {
    try {
      const options = { where: { lan_id: { [Op.eq]: null } } };
      const att = ['id', 'body', 'response'];
      const result = await this.insuranceRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      for (let index = 0; index < result.length; index++) {
        try {
          const ele = result[index];
          const response = JSON.parse(ele.response);
          const body = JSON.parse(ele.body);
          const leadId = response?.LeadId ?? '';
          if (leadId) {
            const lan_id =
              response?.lan_id ??
              body?.QuoteRequest?.LoanDetails?.LoanAccountNo ??
              '';
            if (lan_id) {
              const update = { leadId, lan_id, status: 1 };
              await this.insuranceRepo.updateRowData(update, ele.id);
            }
          } else console.log(ele.id);
        } catch (error) {}
      }
    } catch (error) {}
  }
  //#endregion

  //#region reinitiate insurance
  async reinitiateInsurance(body) {
    try {
      const loanId = body?.loanId;
      const isUpdate = body?.isUpdate ?? false;
      const options: any = {
        where: {
          status: 2,
          leadId: { [Op.eq]: null },
          lan_id: { [Op.eq]: null },
        },
      };
      if (loanId) options.where.loanId = loanId;
      const att = ['id', 'loanId', 'status', 'response'];
      const result = await this.insuranceRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      if (isUpdate === true)
        for (let index = 0; index < result.length; index++) {
          try {
            const ele = result[index];
            if (ele?.loanId) {
              const response = JSON.parse(ele?.response);
              if (response?.success != true) {
                const data = await this.insuranceRepo.deleteData(ele.id, false);
                if (data === k500Error) continue;
                await this.insuranceProposal({ loanId: ele?.loanId });
              }
            }
          } catch (error) {}
        }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get loan and emi wise paid and waived bifurcation data
  async loanPaidWaivedData(query) {
    try {
      const id = query?.loanId ?? '';
      if (!id) return kParamMissing('loanId');
      const loanAttr = [
        'id',
        'netApprovedAmount',
        'loanStatus',
        'paid_principal',
        'paid_interest',
        'paid_penalty',
        'waived_principal',
        'waived_interest',
        'waived_penalty',
      ];

      const emiAttr = [
        'id',
        'penalty',
        'principalCovered',
        'interestCalculate',
        'waiver',
        'paid_waiver',
        'unpaid_waiver',
        'paid_principal',
        'paid_interest',
        'paid_penalty',
        'waived_principal',
        'waived_interest',
        'waived_penalty',
      ];
      const emiInclude = { model: EmiEntity, attributes: emiAttr };

      const loanOpt = {
        where: { id },
        include: [emiInclude],
      };

      const loanData: any = await this.repository.getRowWhereData(
        loanAttr,
        loanOpt,
      );
      if (loanData == k500Error) return kInternalError;

      loanData.TotalRepayAmount = loanData.emiData.reduce((acc, emi, idx) => {
        acc += +emi.principalCovered;
        acc += +emi.interestCalculate;
        acc += +emi.penalty;
        loanData.emiData[idx].emi_amount =
          +emi.principalCovered + +emi.interestCalculate;
        return acc;
      }, 0);
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region add QualityParameters to loan
  async addQualityParameters(body) {
    try {
      const loanId = body?.loanId;
      const adminId = body?.adminId;
      let newParameters = body?.qualityParameters;
      if (!loanId) return kParamMissing('loanId');
      if (!adminId) return kParamMissing('adminId');
      if (!newParameters) return kParamMissing('newParameters');

      newParameters = await this.qualityParameterService.getLowerCaseData(
        newParameters,
      );
      if (newParameters?.message) return newParameters;
      if (!newParameters) return kBadRequest;

      // check loan must be complete
      const loanStatus: any = await this.getLoanStatusByLoanId(loanId);
      if (loanStatus?.message) return loanStatus;
      if (loanStatus !== 1) return k422ErrorMessage(kNoDataFound);

      // get quality parameters from Database
      const oldParameters: any =
        await this.qualityParameterService.getQualityParameter(false);
      if (oldParameters?.message) return oldParameters;

      const isSame: any = this.compareQualityParameters(
        oldParameters,
        newParameters,
      );
      if (isSame?.message) return isSame;
      if (!isSame) return k422ErrorMessage('Parameter field missing');

      // check only one option must be selected for all parameters
      const isSelected: any = this.checkAllQualitySelected(newParameters);

      if (isSelected?.message) return isSelected;
      if (isSelected == false) return k422ErrorMessage('Select any one option');

      const qualityData: any = this.getQualityScore(
        oldParameters,
        newParameters,
      );
      if (qualityData?.message) return kInternalError;

      const qualityScore = qualityData?.qualityScore;
      newParameters = qualityData?.newParameters;

      // add quality parameters and quality score to the loan id
      const updatedLoanQuality = await this.repository.updateRowData(
        { qualityParameters: { data: newParameters, adminId }, qualityScore },
        loanId,
      );
      if (updatedLoanQuality === k500Error) return kInternalError;
      return { loanId, qualityScore };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async enablePartPay(body) {
    const id = body?.loanId;
    if (!id) return kParamMissing('loanId');
    const adminId = body?.adminId;
    if (!adminId) return kParamMissing('adminId');

    const attributes = ['penalty_days', 'payment_status'];
    const loanInclude = {
      model: loanTransaction,
      attributes: ['isPartPayment'],
      where: { loanStatus: 'Active' },
    };
    const options = {
      where: {
        loanId: id,
        payment_status: '0',
        penalty_days: { [Op.gt]: 0 },
      },
      include: [loanInclude],
    };
    const emiData = await this.emiRepo.getRowWhereData(attributes, options);
    if (emiData == k500Error) return kInternalError;
    if (!emiData) return k422ErrorMessage('Not Eligible for Part-Pay');

    const loanData = emiData?.loan;
    // Enable part pay if User is delay(Weather he is One day delay)
    const isPartPayment = loanData?.isPartPayment ?? 0 ? 0 : 1;
    const updateLoan: any = await this.repository.updateRowData(
      { isPartPayment, partPayEnabledBy: adminId },
      id,
    );
    if (updateLoan == k500Error) return kInternalError;
    return true;
  }

  //#region get quality score
  private getQualityScore(oldData, newData) {
    try {
      oldData?.sort((a, b) => a?.title - b?.title);
      newData?.sort((a, b) => a?.title - b?.title);
      let qualityScore = 0;
      let newParameters = [];
      for (let i = 0; i < newData?.length; i++) {
        try {
          const options = newData[i]?.options;
          const oldOptions = oldData[i]?.options;
          const key = Object.keys(oldOptions ?? '{}');
          if (!key) continue;
          key.forEach((i) => {
            try {
              options[i].score = oldOptions[i]?.score ?? 0;
              if (options[i]?.selected == true) {
                qualityScore += oldOptions[i]?.score ?? 0;
              }
            } catch (error) {}
          });
          newParameters.push({ ...newData[i], options });
        } catch (error) {}
      }
      qualityScore = Math.round(qualityScore / newData?.length);
      return { qualityScore, newParameters };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get loan status for loan id
  private async getLoanStatusByLoanId(id: number) {
    try {
      const loanOpt = {
        where: {
          id,
          loanStatus: ['Active', 'Complete'],
          qualityParameters: { [Op.eq]: null },
        },
      };
      const loanData = await this.repository.getCountsWhere(loanOpt);
      if (loanData === k500Error) return kInternalError;
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check all parameter must be selected from options
  private checkAllQualitySelected(qualityParameters) {
    try {
      for (let i = 0; i < qualityParameters?.length; i++) {
        try {
          const options = qualityParameters[i]?.options;
          if (!options) continue;
          const keys = Object.keys(options);
          const selected = keys.filter(
            (item) => options[item].selected == true,
          );
          if (selected.length !== 1) return false;
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region compare parameters with latest version
  private compareQualityParameters(oldData, newData) {
    try {
      if (oldData?.length != newData?.length) return false;
      oldData?.sort((a, b) => a?.title - b?.title);
      newData?.sort((a, b) => a?.title - b?.title);

      for (let i = 0; i < oldData.length; i++) {
        try {
          const oldD = oldData[i];
          const newD = newData[i];
          if (oldD.title != newD.title) return false;
          if (oldD?.disabled !== newD?.disabled) return false;
          const oldKeys = Object.keys(oldD.options);
          const newKeys = Object.keys(newD.options);
          if (oldKeys.length !== newKeys.length) return false;
          oldKeys.sort();
          newKeys.sort();
          if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) return false;
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get loan quality parameters by loan id
  async getQualityParameters(query) {
    try {
      const id = query?.loanId;
      if (!id) return kParamMissing('loanId');
      const data = await this.repository.getRowWhereData(
        ['qualityParameters'],
        { where: { id } },
      );
      if (data === k500Error) return kInternalError;
      const adminData = await this.commonService.getAdminData(
        data?.qualityParameters?.adminId,
      );
      if (adminData === k500Error) return kInternalError;
      return {
        data: this.prepareQualityData(data?.qualityParameters?.data),
        adminName: adminData?.fullName,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare quality parameters data
  private prepareQualityData(data) {
    try {
      const preparedData = [];
      for (let i = 0; i < data?.length; i++) {
        try {
          const tempObj = data[i];
          const options = tempObj?.options;
          const keys = Object.keys(options ?? '{}');
          if (!keys?.length) continue;
          keys?.sort(
            (a, b) => (options[b]?.score ?? 0) - (options[a]?.score ?? 0),
          );
          const tempOpts = [];
          // prepare options
          for (let j = 0; j < keys.length; j++) {
            try {
              const key = keys[j];
              const rawData = options[key];
              tempOpts.push({
                option: key,
                selected: rawData?.selected ?? 'false',
              });
            } catch (error) {}
          }
          tempObj.options = tempOpts;
          delete tempObj?.disabled;
          preparedData.push(tempObj);
        } catch (error) {}
      }
      return preparedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Insurance Migrate for Null Insurance ids
  async InsuranceMigrate() {
    try {
      const attributes = ['id'];
      const date = new Date();
      date.setDate(date.getDate() - 2);
      const twoDaysAgo = await this.typeService.getGlobalDate(date).toJSON();
      const options = {
        where: {
          loanStatus: 'Active',
          insuranceId: { [Op.eq]: null },
          insuranceOptValue: true,
          loan_disbursement_date: { [Op.gte]: twoDaysAgo },
        },
      };
      const loanIds = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (loanIds == k500Error) return kInternalError;
      let length = loanIds.length;
      for (let index = 0; index < length; index++) {
        try {
          const element = loanIds[index];
          await this.insuranceProposal({ loanId: element.id });
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funEMIAndRepaymentData(data) {
    try {
      const loanId = data?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const attributes = [
        'id',
        'loanStatus',
        'userId',
        'netEmiData',
        'interestRate',
        'loan_disbursement_date',
        'penaltyCharges',
      ];
      const transactionInclude = {
        model: TransactionEntity,
        required: false,
        order: [['id', 'DESC']],
        attributes: [
          'id',
          'emiId',
          'paidAmount',
          'status',
          'completionDate',
          'subscriptionDate',
          'source',
          'type',
          'subSource',
          'accStatus',
          'transactionId',
          'utr',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
          'userId',
          'subStatus',
          'createdAt',
          'adminId',
          'legalCharge',
          'cgstOnLegalCharge',
          'sgstOnLegalCharge',
          'cgstOnPenalCharge',
          'sgstOnPenalCharge',
          'penalCharge',
          'regInterestAmount',
          'bounceCharge',
          'cgstOnBounceCharge',
          'sgstOnBounceCharge',
        ],
      };
      const EmiInclude = {
        model: EmiEntity,
        attributes: [
          'bounceCharge',
          'emi_amount',
          'emi_date',
          'id',
          'payment_status',
          'payment_due_status',
          'principalCovered',
          'interestCalculate',
          'penalty',
          'penalty_days',
          'partPaymentPenaltyAmount',
          'waiver',
          'paid_waiver',
          'unpaid_waiver',
          'fullPayPrincipal',
          'fullPayPenalty',
          'fullPayInterest',
          'settledId',
          'userId',
          'pay_type',
          'legalCharge',
          'legalChargeGST',
          'fullPayLegalCharge',
          'regInterestAmount',
          'dpdAmount',
          'penaltyChargesGST',
          'gstOnBounceCharge',
          'fullPayPenal',
          'fullPayRegInterest',
          'fullPayBounce',
          'waived_regInterest',
          'waived_bounce',
          'waived_penal',
          'waived_legal',
          'paid_principal',
          'paid_interest',
        ],
      };
      const subsInclude = {
        model: SubScriptionEntity,
        attributes: ['id', 'mode'],
      };
      const options = {
        where: { id: loanId },
        include: [EmiInclude, transactionInclude, subsInclude],
      };
      const loanData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      const fullPay = await this.sharedCalculation.getFullPaymentData({
        loanId,
      });
      if (loanData?.emiData?.length == 0) {
        const NetEMIData = await this.prepareNetEmiData(loanData);
        return { EMIData: NetEMIData, transactionData: [] };
      }
      const EMIData = await this.emiSharedService.prepareEMIDetails(loanData);
      for (let index = 0; index < loanData?.transactionData.length; index++) {
        const ele = loanData?.transactionData[index];
        try {
          const emiData = loanData?.emiData;
          emiData.sort((a, b) => a.id - b.id);
          ele.emiNum = '';
          emiData.forEach((el, index) => {
            try {
              if (ele?.emiId == el.id) ele.emiNum = `EMI-${index + 1}`;
              if (ele.type == 'FULLPAY' && el.pay_type == 'FULLPAY') {
                if (ele.emiNum == '') ele.emiNum = `EMI-${index + 1}`;
                else ele.emiNum += ` & ${index + 1}`;
              }
            } catch (error) {}
          });
          const adminData = await this.commonService.getAdminData(ele.adminId);
          ele.admin = { id: adminData.id, fullName: adminData.fullName };
          const mode = loanData?.subscriptionData?.mode;
          ele.source = ele?.source == 'AUTOPAY' ? mode : ele?.source;
          const source = ele?.source;
          const type = ele?.type;
          ele['Response date'] = ele?.completionDate ?? '-';
          ele.createdAt =
            ele?.subSource == 'AUTODEBIT'
              ? ele.subscriptionDate
              : ele.createdAt;
          const utr = ele?.utr;
          ele.paymentURL = '-';
          if (ele?.status != 'INITIALIZED') {
            if (source == 'CASHFREE') {
              const response = JSON.parse(ele?.response);
              const resObj = Array.isArray(response) ? response[0] : response;
              const paymentId =
                resObj?.cf_payment_id ?? resObj?.payment?.referenceId;
              ele.paymentURL = `${kGetCashfreePayment}?txId=${paymentId}`;
            } else if (source == 'RAZORPAY') {
              const pay = type == 'REFUND' ? 'refunds/' : 'payments/';
              ele.paymentURL = `${kGetRazorpayPayment}${pay}${utr}`;
            } else if (source == 'SIGNDESK') {
              const mandateId = utr.split('-id-')[1];
              ele.paymentURL =
                mandateId != 'NA' ? `${kGetSigndeskPayment}${mandateId}` : '-';
            }
          }
          delete ele.subscriptionDate;
          delete ele.completionDate;
        } catch (error) {}
      }
      return {
        EMIData,
        transactionData: loanData?.transactionData,
        fullPay: fullPay?.totalAmount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getFullPayAmount(reqData: any) {
    try {
      const id = reqData.loanId;
      if (!id) return kParamMissing('loanId');
      let targetDate = reqData.targetDate;
      if (targetDate) {
        targetDate = new Date(targetDate);
        const today = new Date();
        const differenceInDays = this.typeService.dateDifference(
          today,
          targetDate,
          'Days',
        );
        if (differenceInDays > 3)
          return k422ErrorMessage('Transaction is more than 3 days old');
      } else targetDate = new Date();
      const data = await this.sharedCalculation.getFullPaymentData(reqData);
      if (data?.message) return data;
      const fullPayAmount = data?.totalAmount;
      if (!fullPayAmount) return kInternalError;
      return fullPayAmount;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async massEMIRepaymentDetails(reqData) {
    // Params validation
    const loanIds = reqData.loanIds;
    if (!loanIds) return kParamMissing('loanIds');

    const finalizedData = {};
    const totalLists = this.typeService.splitToNChunks(loanIds, 100);
    for (let index = 0; index < totalLists.length; index++) {
      try {
        const targetList = totalLists[index];
        const promiseList = [];
        for (let i = 0; i < targetList.length; i++) {
          try {
            const loanId = targetList[i];
            promiseList.push(this.funEMIAndRepaymentData({ loanId }));
          } catch (error) {}
        }
        const spanResponse = await Promise.all(promiseList);
        for (let i = 0; i < targetList.length; i++) {
          try {
            const loanId = targetList[i];
            if (spanResponse[i]?.message) continue;
            finalizedData[loanId] = spanResponse[i];
          } catch (error) {}
        }
      } catch (error) {}
    }

    return finalizedData;
  }

  async getEMIDetails(data) {
    // Validation -> Parameters
    const loanId = data?.loanId;
    if (!loanId && !data.loanIds) return kParamMissing('loanId');
    // Purpose -> Testing
    const loanIds = data?.loanIds;

    // Preparation -> Query
    const loanAttr = [
      'id',
      'netEmiData',
      'penaltyCharges',
      'interestRate',
      'loan_disbursement_date',
      'isPartPayment',
      'partPayEnabledBy',
      'loanClosureMailCount',
      'settlementMailCount',
      'loanClosureEnabledBy',
      'loanSettlementEnabledBy',
      'isLoanClosure',
      'loanStatus',
    ];
    const traAttrs = [
      'id',
      'emiId',
      'paidAmount',
      'status',
      'completionDate',
      'subscriptionDate',
      'type',
      'principalAmount',
      'interestAmount',
      'penaltyAmount',
      'transactionId',
      'createdAt',
      'legalCharge',
      'cgstOnLegalCharge',
      'sgstOnLegalCharge',
      'cgstOnPenalCharge',
      'sgstOnPenalCharge',
      'penalCharge',
      'regInterestAmount',
      'bounceCharge',
      'cgstOnBounceCharge',
      'sgstOnBounceCharge',
      'forClosureAmount',
      'sgstForClosureCharge',
      'cgstForClosureCharge',
    ];
    const emiAttr = [
      'id',
      'bounceCharge',
      'gstOnBounceCharge',
      'emi_amount',
      'emi_date',
      'payment_status',
      'payment_due_status',
      'principalCovered',
      'interestCalculate',
      'penalty',
      'totalPenalty',
      'penalty_days',
      'partPaymentPenaltyAmount',
      'waiver',
      'paid_waiver',
      'unpaid_waiver',
      'fullPayPrincipal',
      'fullPayPenalty',
      'fullPayInterest',
      'pay_type',
      'legalCharge',
      'legalChargeGST',
      'fullPayLegalCharge',
      'regInterestAmount',
      'dpdAmount',
      'penaltyChargesGST',
      'fullPayPenal',
      'fullPayRegInterest',
      'fullPayBounce',
      'waived_regInterest',
      'waived_bounce',
      'waived_penal',
      'waived_legal',
      'paid_principal',
      'paid_interest',
    ];
    const transInc = {
      model: TransactionEntity,
      attributes: traAttrs,
      where: { status: kCompleted },
      required: false,
    };
    if (loanIds)
      transInc.attributes = ['completionDate', 'loanId', 'paidAmount', 'type'];

    const emiInc = { model: EmiEntity, attributes: emiAttr };
    const options = {
      where: { id: loanIds ?? loanId },
      include: [emiInc, transInc],
    };
    // Hit -> Query
    if (loanIds)
      return await this.repository.getTableWhereData(loanAttr, options);
    // Hit -> Query
    const loanData = await this.repository.getRowWhereData(loanAttr, options);
    // Validation -> Query data
    if (loanData === k500Error) throw new Error();
    if (!loanData) return k422ErrorMessage(kNoDataFound);
    const emiData = loanData.emiData;
    for (let index = 0; index < emiData.length; index++) {
      const ele = emiData[index];
      // Penal Charge GST
      let cGstOnPenal = this.typeService.manageAmount(
        (ele.penaltyChargesGST ?? 0) / 2,
      );
      let sGstOnPenal = this.typeService.manageAmount(
        (ele.penaltyChargesGST ?? 0) / 2,
      );
      ele.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
    }

    return await this.calculateEMIDetails(loanData);
  }

  async calculateEMIDetails(loanData) {
    // Before loan is active
    if (loanData?.emiData?.length == 0) {
      const NetEMIData = this.prepareNetEmiData(loanData);
      return { EMIData: NetEMIData };
    }
    const emiData: any = await this.emiSharedService.prepareEMIDetails(
      loanData,
    );
    if (emiData?.message) return emiData;
    const fullPay = await this.sharedCalculation.getFullPaymentData({
      loanId: loanData.id,
    });
    if (fullPay?.message) return fullPay;

    return {
      ...emiData,
      fullPay: fullPay?.totalAmount,
    };
  }

  prepareNetEmiData(loanData) {
    try {
      const EmiData = [];
      const netEmiData = loanData.netEmiData;
      for (let index = 0; index < netEmiData.length; index++) {
        try {
          const emi = JSON.parse(netEmiData[index]);
          const ObjData = {
            emiDate: this.typeService.getDateFormated(emi.Date, '/'),
            emiAmount: emi.Emi,
            emiDays: emi.Days,
            principal: emi.PrincipalCovered,
            interest: emi.InterestCalculate,
            interestRate: emi.RateofInterest,
          };
          EmiData.push(ObjData);
        } catch (error) {}
      }
      return EmiData;
    } catch (error) {
      return [];
    }
  }

  async foreCloseReport(data) {
    const loanId = data?.loanId;
    const download = data?.download;
    let startDate;
    let endDate;
    if (data?.startDate && data?.endDate) {
      startDate = this.typeService.getGlobalDate(data.startDate);
      endDate = this.typeService.getGlobalDate(data.endDate);
    }
    if (!loanId && !startDate && !endDate) return {};
    const loanAttr = [
      'id',
      'loan_disbursement_date',
      'loanCompletionDate',
      'userId',
    ];
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
    const emiAttr = [
      'id',
      'emi_amount',
      'emi_date',
      'principalCovered',
      'interestCalculate',
    ];
    const transInc = {
      model: TransactionEntity,
      attributes: traAttrs,
      where: { status: kCompleted },
      required: false,
    };
    const userInc = {
      model: registeredUsers,
      attributes: ['id', 'fullName', 'phone'],
    };
    const emiInc = { model: EmiEntity, attributes: emiAttr };
    const options: any = {
      where: { loanStatus: 'Complete' },
      include: [userInc, emiInc, transInc],
    };
    if (loanId) options.where.id = loanId;
    if (startDate && endDate)
      options.where.loan_disbursement_date = {
        [Op.gte]: startDate.toJSON(),
        [Op.lte]: endDate.toJSON(),
      };
    const loanData = await this.repository.getTableWhereData(loanAttr, options);
    if (loanData === k500Error) throw new Error();
    const length = loanData.length;
    if (length == 0) return k422ErrorMessage(kNoDataFound);
    const finalData = [];
    for (let i = 0; i < length; i++) {
      const loan = loanData[i];
      const user = loan.registeredUsers;
      const emiData = loan.emiData;
      emiData.sort((a, b) => b.id - a.id);
      const lastEmiDate = this.typeService.getGlobalDate(emiData[0].emi_date);
      const loanCompletionDate = this.typeService.getGlobalDate(
        loan?.loanCompletionDate,
      );
      if (lastEmiDate < loanCompletionDate) continue;
      const trans = loan?.transactionData ?? [];
      const originalTrans = await this.commonService.filterTransActionData(
        trans,
      );
      let expectedPrincipal = 0;
      let expectedInterest = 0;
      for (let e = 0; e < emiData.length; e++) {
        const emi = emiData[e];
        expectedPrincipal += emi?.principalCovered ?? 0;
        expectedInterest += emi?.interestCalculate ?? 0;
      }
      let paidPrincipal = 0;
      let paidInterest = 0;
      for (let t = 0; t < originalTrans.length; t++) {
        const tra = originalTrans[t];
        paidPrincipal += tra?.principalAmount ?? 0;
        paidInterest += tra?.interestAmount ?? 0;
      }
      const obj = {
        loanId: loan.id,
        userId: loan.userId,
        Name: user.fullName,
        Phone: this.cryptService.decryptPhone(user.phone),
        'Disbursement date': this.typeService.getDateFormatted(
          loan.loan_disbursement_date,
        ),
        'Loan completion date': this.typeService.getDateFormatted(
          loan.loanCompletionDate,
        ),
        'Expected principal': +expectedPrincipal,
        'Paid principal': +paidPrincipal.toFixed(2),
        'Expected interest': +expectedInterest,
        'Paid interest': +paidInterest.toFixed(2),
        'Interest difference': +(expectedInterest - paidInterest).toFixed(2),
      };
      finalData.push(obj);
    }
    if (download == true) {
      const rawExcelData = {
        sheets: ['foreClose-report'],
        data: [finalData],
        sheetName: 'foreClose-report.xlsx',
      };

      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      return { fileUrl: url };
    } else return finalData;
  }
}
