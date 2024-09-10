// Imports
import Admin from 'firebase-admin';
import * as fs from 'fs';
import * as FormData from 'form-data';
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import {
  CIBIL_ADMIN_ID,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { admin } from 'src/entities/admin.entity';
import * as str from 'src/constants/strings';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { gIsPROD } from 'src/constants/globals';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
let firebaseDB: Admin.firestore.Firestore;
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { MediaRepository } from 'src/repositories/media.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { DateService } from 'src/utils/date.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { SequelOptions } from 'src/interfaces/include.options';
import { MasterEntity } from 'src/entities/master.entity';
import { EnvConfig } from 'src/configs/env.config';
import { esignEntity } from 'src/entities/esign.entity';
import { APIService } from 'src/utils/api.service';
import { kErrorMsgs } from 'src/constants/strings';
import { nCibilRiskCategoryFromBatch } from 'src/constants/network';

@Injectable()
export class DashboardService {
  constructor(
    private readonly StampRepo: StampRepository,
    private readonly locationRepo: LocationRepository,
    private readonly masterRepo: MasterRepository,
    private readonly loanRepo: LoanRepository,
    private readonly emiRepo: EMIRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly disbursmentRepo: DisbursmentRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly userRepo: UserRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly dateService: DateService,
    private readonly repoManager: RepositoryManager,
    // Shared services
    private readonly commonServices: CommonSharedService,
    private readonly deviceAppInfoRepo: DeviceInfoInstallAppRepository,
    private readonly sharedCalculation: CalculationSharedService,
    private readonly api: APIService,
  ) {
    if (process.env.MODE == 'PROD' || process.env.MODE == 'UAT')
      firebaseDB = Admin.firestore();
  }

  async fetchAllStampDetails(query) {
    try {
      const options: any = this.prepareStampDetailsOptions(query);
      if (options?.message) return kInternalError;
      const stampCount = await this.getStampCount();
      if (stampCount?.message) return stampCount;
      const stampDetailsData = await this.getStampDetailsData(options);
      if (stampDetailsData?.message) return stampDetailsData;
      const finalStampData: any = this.prepareStampFinalData(
        stampDetailsData.rows,
      );
      if (finalStampData?.message) return finalStampData;
      return { stampCount, finalStampData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  prepareStampDetailsOptions(query) {
    try {
      const page = query.page ?? 1;
      const status = query.status ?? 1;
      const search = query.search ?? '';
      let conditions;
      if (status == 0 && !search)
        conditions = {
          takenStatus: { [Op.eq]: '0' },
        };
      else if (status == 0 && search && search.length >= 3)
        conditions = {
          takenStatus: { [Op.eq]: '0' },
          certificateNo: { [Op.iRegexp]: search },
        };
      else if (status == 1 && !search) conditions = null;
      else if (status == 1 && search && search.length >= 3)
        conditions = { certificateNo: { [Op.iRegexp]: search } };
      else if (status == 2 && !search)
        conditions = {
          takenStatus: { [Op.eq]: '1' },
          signStatus: { [Op.eq]: '0' },
        };
      else if (status == 2 && search && search.length >= 3)
        conditions = {
          takenStatus: { [Op.eq]: '1' },
          signStatus: { [Op.eq]: '0' },
          certificateNo: { [Op.iRegexp]: search },
        };
      else if (status == 3 && !search)
        conditions = {
          signStatus: { [Op.eq]: '1' },
        };
      else if (status == 3 && search && search.length >= 3)
        conditions = {
          signStatus: { [Op.eq]: '1' },
          certificateNo: { [Op.iRegexp]: search },
        };
      const skip1 = page * PAGE_LIMIT - PAGE_LIMIT;
      const options = {
        offset: skip1,
        limit: PAGE_LIMIT,
        order: [['createdAt', 'DESC']],
        where: conditions,
      };
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getStampCount() {
    try {
      const stampCount: any = {};
      stampCount.all = await this.StampRepo.getCountsWhere({});
      stampCount.free = await this.StampRepo.getCountsWhere({
        where: { takenStatus: '0' },
      });
      stampCount.inUse = await this.StampRepo.getCountsWhere({
        where: { takenStatus: '1', signStatus: '0' },
      });
      stampCount.used = await this.StampRepo.getCountsWhere({
        where: { signStatus: '1' },
      });
      return stampCount;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async getStampDetailsData(options) {
    try {
      const attr = [
        'id',
        'certificateNo',
        'certificateIssuedDate',
        'accountReference',
        'uniqueDocReference',
        'purchasedBy',
        'descOfDoc',
        'description',
        'considerationPrice',
        'firstParty',
        'secondParty',
        'stampDutyPaidBy',
        'stampDutyAmount',
        'stampId',
        'stampImage',
        'takenStatus',
        'takenStatusDate',
        'signStatus',
        'signStatusDate',
      ];
      const stampData = await this.StampRepo.getTableWhereDataWithCounts(
        attr,
        options,
      );
      if (stampData == k500Error) return kInternalError;
      return stampData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareStampFinalData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData = {};
          if (ele?.certificateIssuedDate == '') ele.certificateIssuedDate = '-';
          if (ele?.uniqueDocReference == '') ele.uniqueDocReference = '-';
          if (ele?.purchasedBy == '') ele.purchasedBy = '-';
          tempData['Stamp id'] = ele?.id ?? '-';
          tempData['Stampduty paid by'] = ele?.stampDutyPaidBy ?? '-';
          tempData['Stampduty amount'] = ele?.stampDutyAmount ?? '-';
          tempData['Certificate no'] = ele?.certificateNo ?? '-';
          tempData['Certificate issued date'] =
            ele?.certificateIssuedDate ?? '-';
          tempData['Account reference'] = ele?.accountReference ?? '-';
          tempData['Unique doc reference'] = ele?.uniqueDocReference ?? '-';
          tempData['Purchased by'] = ele?.purchasedBy ?? '-';
          tempData['Desc of doc'] = ele?.descOfDoc ?? '-';
          tempData['Consideration price'] = ele?.considerationPrice ?? '-';
          tempData['First party'] = ele?.firstParty ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetLocationHistory(query) {
    try {
      const userId = query.userId;
      const attributes = [
        'id',
        'userId',
        'location',
        'lat',
        'long',
        'bearing',
        'createdAt',
      ];
      const options = { where: { userId } };
      const locationData = await this.locationRepo.getTableWhereData(
        attributes,
        options,
      );
      if (locationData === k500Error) return kInternalError;
      return locationData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  funGetMasterData() {
    try {
      const createData = {
        eduction: 'Diploma',
        MaritalStatus: 'Married',
      };
      const data: any = this.masterRepo.createRowData({
        otherInfo: createData,
      });
      if (data == k500Error) return k500Error;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region  get all disbursed loans
  async allDisbursedLoans(query) {
    let findData: any = await this.findLoanData(query);
    let totalData: any;
    if (query?.count === 'true')
      totalData = await this.getDisbursedTotalData(query);

    if (totalData === k500Error) return kInternalError;
    if (findData.message) return findData;

    const prePareData: any = await this.prePareAllDisbursedData(findData);
    if (totalData?.message) return totalData;
    if (prePareData?.message) return prePareData;
    let preParetotalData: any;
    if (totalData) preParetotalData = this.prePareDisbursedTotalData(totalData);
    if (preParetotalData?.message) return preParetotalData;

    const count = findData?.count;
    return { count, rows: prePareData, ...preParetotalData };
  }
  //#endregion

  //#region find loan data
  private async findLoanData(query) {
    const options = this.prePareOptions(query);
    let searchText: string = query?.searchText ?? '';
    // minimum 3 characters required for searching
    if (searchText.length < 3) searchText = '';
    if (searchText && searchText.startsWith('l-')) {
      searchText = searchText.replace('l-', '');
      options.where.id = +searchText;
      searchText = '';
    }
    if (options.message) return options;
    const include = this.getAllDisbursedInlcued(searchText);
    options.include = include;
    const attributes = [
      'id',
      'interestRate',
      'approvedDuration',
      'netApprovedAmount',
      'loan_disbursement_date',
      'stampFees',
      'loanFees',
      'completedLoan',
      'charges',
      'insuranceDetails',
      'insuranceId',
      'qualityParameters',
      'appType',
      'processingFees',
    ];
    const find = await this.loanRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (!find || find === k500Error) return kInternalError;
    const loanIds = find.rows.map((loan) => loan.id);
    const where = { loanId: loanIds };
    // Hit -> Query
    const emiData: any = await this.emiRepo.getTableWhereData(
      [
        'id',
        'loanId',
        'emi_amount',
        'principalCovered',
        'interestCalculate',
        'penalty',
      ],
      { where },
    );
    // Validation -> Query data
    if (emiData == k500Error) throw new Error();

    const att = [
      'id',
      'loanId',
      'payout_id',
      'amount',
      'account_number',
      'ifsc',
      'bank_name',
    ];
    const disbData = await this.disbursmentRepo.getTableWhereData(att, {
      where,
    });
    // Validation -> Query data
    if (disbData === k500Error) throw new Error();

    //get emi data and disbursement data for loan
    find.rows.map((loan) => {
      try {
        let emis = emiData.filter((emi) => emi.loanId == loan.id);
        loan.emiData = emis;
        loan.disbursementData = [disbData.find((f) => f.loanId === loan.id)];
      } catch (error) {}
    });

    return find;
  }
  //#endregion

  //#region prePare Options
  private prePareOptions(query) {
    try {
      const startDate = this.typeService
        .getGlobalDate(query?.start_date ?? new Date())
        .toJSON();
      const endDate = this.typeService
        .getGlobalDate(query?.end_date ?? new Date())
        .toJSON();
      const type = (query?.type ?? '').toUpperCase();
      const where: any = {};
      where.loan_disbursement = '1';
      where.loan_disbursement_date = { [Op.gte]: startDate, [Op.lte]: endDate };
      const options: any = { where };
      if (query?.download != 'true') {
        const page = +(query?.page ?? 1);
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      options.order = [
        ['id', 'DESC'],
        ['loan_disbursement_date', 'DESC'],
      ];
      if (type === 'SYSTEM')
        options.where.manualVerificationAcceptId = {
          [Op.or]: [CIBIL_ADMIN_ID, SYSTEM_ADMIN_ID, null],
        };
      else if (type === 'MANUAL')
        options.where.manualVerificationAcceptId = {
          [Op.notIn]: [CIBIL_ADMIN_ID, SYSTEM_ADMIN_ID],
        };

      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region all disbursed loan inlcued
  private getAllDisbursedInlcued(searchText) {
    let where;
    if (searchText)
      if (!isNaN(searchText)) {
        let encryptedData = this.cryptService.encryptPhone(searchText);
        if (encryptedData == k500Error) return k500Error;
        encryptedData = encryptedData.split('===')[1];
        where = { phone: { [Op.like]: '%' + encryptedData + '%' } };
      } else if (isNaN(searchText))
        where = { fullName: { [Op.iRegexp]: searchText } };

    //
    const subScrMode = {
      model: SubScriptionEntity,
      attributes: ['id', 'mode'],
    };
    //
    const predictionInclude = {
      model: PredictionEntity,
      attributes: ['categorizationTag'],
    };
    // Table join -> Banking entity
    const bankingInclude: SequelOptions = { model: BankingEntity };
    bankingInclude.attributes = [
      'adminSalary',
      'otherDetails',
      'salary',
      'salaryDate',
    ];
    bankingInclude.required = false;
    //
    const insuranceInclude = {
      model: InsuranceEntity,
      attributes: ['id', 'response'],
    };
    //
    const adminModel = {
      model: admin,
      attributes: ['id', 'fullName'],
      as: 'adminData',
    };
    //
    const purposeModel = {
      model: loanPurpose,
      attributes: ['id', 'purposeName'],
    };
    /// user include
    const designationModel = {
      model: employmentDesignation,
      attributes: ['designationName', 'id'],
    };
    const empInclude = {
      model: employmentDetails,
      attributes: ['id', 'companyName', 'salary'],
      include: [designationModel],
    };
    const kycInclude = {
      model: KYCEntity,
      attributes: ['id', 'aadhaarDOB'],
    };
    const cibilInclude = {
      model: CibilScoreEntity,
      attributes: ['cibilScore', 'id', 'plScore', 'overdueBalance'],
      required: false,
      order: [['id', 'DESC']],
    };
    const masterInclude: SequelOptions = { model: MasterEntity };
    masterInclude.attributes = ['assignedCSE', 'otherInfo'];
    const userModel = {
      model: registeredUsers,
      attributes: [
        'id',
        'fullName',
        'phone',
        'gender',
        'completedLoans',
        'city',
        'state',
        'kycId',
        'lastCrm',
      ],
      where,
      include: [empInclude, kycInclude, masterInclude],
    };

    const include = [
      adminModel,
      purposeModel,
      subScrMode,
      userModel,
      predictionInclude,
      insuranceInclude,
      bankingInclude,
      cibilInclude,
    ];
    return include;
  }
  //#endregion

  //#region pre pare all disbured Data
  private async prePareAllDisbursedData(findData: any) {
    const array = [];
    for (let index = 0; index < findData.rows.length; index++) {
      try {
        const element = findData.rows[index];
        const onlineFee = Math.round(+(element?.charges?.insurance_fee ?? 0));
        const riskAssessmentCharges = Math.round(
          +(element?.charges?.risk_assessment_charge ?? 0),
        );
        const documentCharges = Math.round(
          +(element?.charges?.doc_charge_amt ?? 0),
        );
        const gstAmount = Math.round(+(element?.charges?.gst_amt ?? 0));
        const insurancePremium = element?.insuranceId
          ? Math.round(+(element?.insuranceDetails?.totalPremium ?? 0))
          : 0;
        let policyExpiryDate = null;
        if (element?.insuranceData?.response) {
          const responseData = JSON.parse(
            JSON.stringify(element.insuranceData.response),
          );
          const policyIssuance = responseData.policyIssuance;
          if (Array.isArray(policyIssuance) && policyIssuance.length > 0) {
            const policy = policyIssuance[0];
            policyExpiryDate = policy.policy_expiry_date;
          }
        }
        const policy_expiry_date = policyExpiryDate
          ? this.typeService.getDateFormatted(policyExpiryDate)
          : '-';
        const temp: any = {};
        const user = element?.registeredUsers;
        const masterData = user?.masterData ?? {};
        const assignedCSE = masterData?.assignedCSE;
        const employment = user?.employmentData;
        const disbursed = element?.disbursementData[0];
        const emiData = element.emiData;
        const bankingData = element?.bankingData ?? {};
        const disbDate = new Date(element.loan_disbursement_date);
        const lastCrm = user?.lastCrm;
        const cibilData = element?.cibilData ?? {};
        let totalInterestAmount = 0;
        let totalExpectedAmount = 0;

        for (let index = 0; index < emiData.length; index++) {
          try {
            const emi = emiData[index];
            const principalAmount = emi?.principalCovered ?? 0;
            const interestAmount = emi?.interestCalculate ?? 0;
            totalInterestAmount += interestAmount;
            totalExpectedAmount += principalAmount + interestAmount;
          } catch (error) {}
        }
        totalExpectedAmount = Math.floor(totalExpectedAmount);
        totalInterestAmount = Math.floor(totalInterestAmount);

        const qualityParameters = element.qualityParameters ?? {};
        const qualityAdminId = qualityParameters.adminId;

        temp['userId'] = user?.id ?? '';
        temp['Loan ID'] = element?.id;
        temp['Name'] = user?.fullName ?? '-';
        const phone = this.cryptService.decryptPhone(user?.phone);
        temp['Phone'] = phone;
        temp['Completed loans'] = element?.completedLoan ?? '0';
        temp['App platform'] =
          element?.appType == 1
            ? EnvConfig.nbfc.nbfcShortName
            : EnvConfig.nbfc.appName;
        temp['Employment information'] =
          masterData?.otherInfo?.employmentInfo ?? '';
        temp['Interest rate'] = `${+element?.interestRate}%`;
        temp['Loan tenure (days)'] = +element?.approvedDuration;
        temp['Approved amount'] = +(+element?.netApprovedAmount).toFixed();

        temp['Disbursed amount'] = +((disbursed?.amount ?? 0) / 100).toFixed();
        temp['Processing fees'] = this.typeService.manageAmount(
          (+element?.netApprovedAmount * element?.processingFees) / 100,
        );

        temp['Document charges'] = documentCharges;
        temp['Online convenience fees'] = onlineFee;
        temp['Risk assessment fees'] = riskAssessmentCharges;
        temp['Insurance premium'] = insurancePremium;
        temp['Stamp duty fees'] = +element?.stampFees;
        temp['GST amount'] = gstAmount;
        temp['Total expected amount'] = +totalExpectedAmount;
        temp['Total interest amount'] = +totalInterestAmount;
        temp['Total EMI'] = emiData.length;
        temp['Cibil score'] = cibilData?.cibilScore ?? '-';
        temp['Pl score'] = cibilData?.plScore ?? '-';
        temp['Company name'] = employment?.companyName ?? '';
        temp['Designation'] = employment?.designation?.designationName ?? '';
        temp['Gender'] = (user?.gender ?? 'MALE').toUpperCase();
        temp['State'] = user?.state ?? '-';
        temp['Account number'] = +disbursed?.account_number;
        temp['Bank name'] = disbursed?.bank_name;
        temp['Ifsc  code'] = disbursed?.ifsc;
        temp['Mandate type'] = element?.subscriptionData?.mode ?? str.kSigndesk;
        temp['Disbursement date'] = this.typeService.getDateFormatted(disbDate);
        temp['Loan approved by'] = element?.adminData?.fullName ?? 'system';
        temp['Insurance'] = element?.insuranceId ? 'Yes' : 'No';
        temp['Insurance end date'] = policy_expiry_date;
        temp['Risk category'] =
          element?.predictionData?.categorizationTag?.slice(0, -5) ?? '-';
        temp['Quality status'] = qualityAdminId ? 'Checked' : 'Not checked';
        temp['Quality admin'] = !qualityAdminId
          ? '-'
          : (await this.commonServices.getAdminData(qualityAdminId)).fullName;
        temp['Last crm by'] = lastCrm?.adminName ?? '-';
        temp['CRM'] = lastCrm?.statusName ?? '-';
        temp['Crm date'] = lastCrm?.createdAt
          ? this.typeService.getDateFormatted(lastCrm?.createdAt)
          : '-';
        temp['Remark'] = lastCrm?.remark ?? '-';
        temp['Disposition'] = lastCrm?.dispositionName ?? '-';
        temp['Salary date'] = bankingData?.salaryDate ?? '-';
        temp['Approved salary'] =
          bankingData?.salary ??
          bankingData?.adminSalary ??
          bankingData?.otherDetails?.salary?.average ??
          '-';
        temp['Assigned CSE'] =
          (await this.commonServices.getAdminData(assignedCSE))?.fullName ??
          '-';
        temp['Overdue amount'] = cibilData?.overdueBalance ?? '-';

        array.push(temp);
      } catch (error) {}
    }
    return array;
  }
  //#endregion

  //#region get Disbursed Total Data
  private async getDisbursedTotalData(query) {
    try {
      query.download = 'true';
      query.type = 'ALL';
      const options = this.prePareOptions(query);
      if (options.message) return options;
      const att = [
        'manualVerificationAcceptId',
        'completedLoan',
        [Sequelize.fn('COUNT', Sequelize.col('loanTransaction.id')), 'count'],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.cast(
              Sequelize.col('netApprovedAmount'),
              'double precision',
            ),
          ),
          'amount',
        ],
      ];
      options.where.completedLoan = 0;
      options.where.loanStatus = { [Op.or]: ['Active', 'Complete'] };
      options.group = ['completedLoan', 'manualVerificationAcceptId'];
      delete options.order;
      const multiOptions: any = {
        ...options,
        where: { ...options.where, completedLoan: { [Op.gt]: 0 } },
      };
      let [firstLoans, multipleLoans]: any[] = [
        this.loanRepo.getTableWhereData(att, options),
        this.loanRepo.getTableWhereData(att, multiOptions),
      ];
      [firstLoans, multipleLoans] = await Promise.all([
        firstLoans,
        multipleLoans,
      ]);
      if (!firstLoans || firstLoans === k500Error) return kInternalError;
      if (!multipleLoans || multipleLoans === k500Error) return kInternalError;
      return { firstLoans, multipleLoans };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region pre pare disbursed Total Data
  private prePareDisbursedTotalData(totalData) {
    const firstLoans = totalData?.firstLoans ?? [];
    const multipleLoans = totalData?.multipleLoans ?? [];
    const data = {
      totalCount: 0,
      totalAmount: 0,
      systemTotalCount: 0,
      systemTotalAmount: 0,
      manualTotalCount: 0,
      manualTotalAmount: 0,
      newTotalCount: 0,
      newTotalAmount: 0,
      repeatedTotalCount: 0,
      repeatedTotalAmount: 0,
    };
    firstLoans.forEach((ele) => {
      try {
        const id = ele?.manualVerificationAcceptId ?? SYSTEM_ADMIN_ID;
        const amount = ele?.amount ?? 0;
        const count = +(ele?.count ?? 0);
        data.totalCount += count;
        data.totalAmount += amount;
        data.newTotalCount += count;
        data.newTotalAmount += amount;
        if (id === SYSTEM_ADMIN_ID || id === CIBIL_ADMIN_ID) {
          data.systemTotalCount += count;
          data.systemTotalAmount += amount;
        } else {
          data.manualTotalCount += count;
          data.manualTotalAmount += amount;
        }
      } catch (error) {}
    });

    multipleLoans.forEach((ele) => {
      try {
        const id = ele?.manualVerificationAcceptId ?? SYSTEM_ADMIN_ID;
        const amount = ele?.amount ?? 0;
        const count = +(ele?.count ?? 0);
        data.totalCount += count;
        data.totalAmount += amount;
        data.repeatedTotalCount += count;
        data.repeatedTotalAmount += amount;
        if (id === SYSTEM_ADMIN_ID || id === CIBIL_ADMIN_ID) {
          data.systemTotalCount += count;
          data.systemTotalAmount += amount;
        } else {
          data.manualTotalCount += count;
          data.manualTotalAmount += amount;
        }
      } catch (error) {}
    });
    return data;
  }

  //  #start region  getRepaidCardData
  async getRepaidCardData() {
    try {
      const att: any = [
        [Sequelize.fn('sum', Sequelize.col('paidAmount')), 'amount'],
      ];
      const where: any = { status: 'COMPLETED', type: { [Op.ne]: 'REFUND' } };
      const option = { where };
      const totalAmount = await this.transactionRepo.getRowWhereData(
        att,
        option,
      );

      if (totalAmount === k500Error) return kInternalError;
      // Make common dates
      // CURRENT MONTH
      const cStartDate = new Date();
      cStartDate.setDate(1);
      cStartDate.setHours(0);
      const cEndDate = new Date();
      cEndDate.setFullYear(cEndDate.getFullYear(), cEndDate.getMonth() + 1, 0);
      cEndDate.setHours(23, 59);

      option.where.completionDate = {
        [Op.gte]: cStartDate.toJSON(),
        [Op.lte]: cEndDate.toJSON(),
      };
      const cAmount = await this.transactionRepo.getRowWhereData(att, option);
      if (cAmount === k500Error) return kInternalError;

      // LAST MONTH
      const lStartDate = new Date();
      lStartDate.setDate(1);
      lStartDate.setMonth(lStartDate.getMonth() - 1);
      lStartDate.setHours(0);
      const lEndDate = new Date();
      lEndDate.setDate(15);
      // lEndDate.setMonth(lEndDate.getMonth() - 1);
      lEndDate.setDate(0);
      lEndDate.setHours(23, 59);

      option.where.completionDate = {
        [Op.gte]: lStartDate.toJSON(),
        [Op.lte]: lEndDate.toJSON(),
      };
      const lAmount = await this.transactionRepo.getRowWhereData(att, option);
      if (lAmount === k500Error) return kInternalError;

      const finalTotalRepay = totalAmount?.amount ?? 0;
      const cmTotalRepay = cAmount?.amount ?? 0;
      const lmTotalRepay = lAmount?.amount ?? 0;
      return { finalTotalRepay, cmTotalRepay, lmTotalRepay };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  tempDate;
  tempCount;

  //#region get chat count
  async getChatCount() {
    try {
      if (this.tempDate) {
        const cTime = new Date().getTime();
        const diff = cTime - this.tempDate;
        if (diff < 60000) {
          if (this.tempCount >= 99) return '99+';
          else return this.tempCount.toString();
        }
      }

      const key = (gIsPROD ? 'PROD' : 'UAT') + '-Recent Chats';
      const docData =
        EnvConfig.nbfcType == '1'
          ? await firebaseDB
              .collection(key)
              .where('count', '>', 0)
              .where('nbfcType', '==', 1)
              .limit(99)
              .get()
          : await firebaseDB
              .collection(key)
              .where('count', '>', 0)
              .where('nbfcType', '!=', '1')
              .limit(99)
              .get();

      const querySnapshots = docData.docs;
      this.tempCount = querySnapshots.length;
      this.tempDate = new Date().getTime();
      if (this.tempCount >= 99) return '99+';
      else return this.tempCount.toString();
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #startregion get payment data
  async funGetPaymentData() {
    try {
      let sDate = this.typeService.getGlobalDate(new Date()).toJSON();
      let eDate = this.typeService.getGlobalDate(new Date()).toJSON();

      const options: any = {
        where: {
          completionDate: { [Op.gte]: sDate, [Op.lte]: eDate },
          status: 'COMPLETED',
          type: { [Op.ne]: 'REFUND' },
        },
      };
      const attributes = [
        'id',
        'completionDate',
        'status',
        'source',
        'paidAmount',
        'principalAmount',
        'interestAmount',
      ];
      const paymentData =
        await this.transactionRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );

      if (paymentData === k500Error) return kInternalError;
      options.include = [
        { model: registeredUsers, where: { typeOfDevice: '1' } },
      ];
      let iosDeviceCounts = await this.transactionRepo.getCountsWhere(options);
      if (iosDeviceCounts === k500Error) iosDeviceCounts = 0;
      let totalPaymentAmount = 0;
      let totalprincipalAmount = 0;
      let totalInterestAmount = 0;
      paymentData.rows.forEach((ele) => {
        totalPaymentAmount += +ele?.paidAmount;
        totalprincipalAmount += +ele?.principalAmount;
        totalInterestAmount += +ele?.interestAmount;
      });
      totalPaymentAmount = Math.floor(totalPaymentAmount);
      totalprincipalAmount = Math.floor(totalprincipalAmount);
      totalInterestAmount = Math.floor(totalInterestAmount);
      return {
        totalPaymentAmount,
        iosDeviceCounts,
        count: paymentData?.count,
        totalprincipalAmount,
        totalInterestAmount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // #start region
  private getDates() {
    const date = new Date().getDate();
    const month = new Date().getMonth();
    const month1 = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const lastDate =
      month1 === 2
        ? year & 3 || (!(year % 25) && year & 15)
          ? 28
          : 29
        : 30 + ((month1 + (month1 >> 3)) & 1);
    let startDate: Date;
    let endDate: Date;
    try {
      if (date > 15) {
        startDate = this.typeService.getGlobalDate(new Date(year, month, date));
        endDate = this.typeService.getGlobalDate(
          new Date(year, month, lastDate),
        );
        endDate.setDate(endDate.getDate() + 15);
      } else {
        startDate = new Date(year, month, date);
        endDate = new Date(year, month, lastDate);
      }
    } catch (error) {}
    endDate.setDate(endDate.getDate() + 1);
    return { startDate, endDate };
  }
  //#endregion

  // get 15 Days Count And Amount Emi Data
  async get15DaysCountAndAmountEmiData() {
    try {
      let startDate;
      let endDate;
      const tempData = this.getDates();
      startDate = this.typeService.getGlobalDate(tempData?.startDate);
      endDate = this.typeService.getGlobalDate(tempData?.endDate);
      endDate.setDate(endDate.getDate() - 1);
      const emiOption = {
        where: {
          emi_date: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
          payment_status: '0',
        },
        group: ['loanId'],
      };
      const emiList: any = await this.emiRepo.getTableWhereData(
        ['loanId'],
        emiOption,
      );
      if (emiList === k500Error) return kInternalError;
      const loanList = emiList.map((el) => el?.loanId);
      const loanAttr = ['id', 'loanStatus', 'cibilBatchCategory'];
      const loanOptions = {
        where: { id: loanList },
        include: [
          {
            model: EmiEntity,
            attributes: [
              'id',
              'emi_date',
              'emi_amount',
              'loanId',
              'payment_done_date',
              'payment_status',
              'payment_due_status',
            ],
            where: {
              payment_status: '0',
            },
          },
        ],
      };
      const upcomingEMIData = await this.loanRepo.getTableWhereData(
        loanAttr,
        loanOptions,
      );

      if (upcomingEMIData === k500Error) return kInternalError;

      let upcomingEMI = [];
      let defaulterEMI = [];
      upcomingEMIData.forEach((element) => {
        try {
          const dueStatus = element?.emiData.map(
            (el) => el?.payment_due_status,
          );
          if (dueStatus.includes('1')) defaulterEMI.push(element);
          upcomingEMI.push(element);
        } catch (error) {}
      });
      let first15DayAmount = 0;
      let last15DayAmount = 0;
      let first15DayCount = 0;
      let last15DayCount = 0;
      let totalLast15DayHighRiskUserCount = 0;
      let totalFirst15DayHighRiskUserCount = 0;
      let defaultEMIAmount = 0;
      let defaultEMICount = 0;
      let totalDefaultHighRiskUserCount = 0;
      upcomingEMI.forEach((element) => {
        try {
          const emiData = element?.emiData;
          let last15DayHighRiskUserCount = 0;
          let first15DayHighRiskUserCount = 0;
          emiData.forEach((ele) => {
            try {
              if (
                ele?.payment_status == '0' &&
                ele?.payment_due_status == '0'
              ) {
                const emiDate = new Date(ele.emi_date);
                if (
                  emiDate.getTime() >= startDate.getTime() &&
                  emiDate.getTime() <= endDate.getTime()
                ) {
                  const day = emiDate.getDate();
                  element.newEmiData = ele;
                  if (day > 15) {
                    last15DayAmount += +ele?.emi_amount;
                    last15DayCount += 1;
                    if (element?.cibilBatchCategory == 2)
                      last15DayHighRiskUserCount++;
                  } else {
                    first15DayAmount += +ele?.emi_amount;
                    first15DayCount += 1;
                    if (element?.cibilBatchCategory == 2)
                      first15DayHighRiskUserCount++;
                  }
                }
              }
            } catch (error) {}
          });
          totalLast15DayHighRiskUserCount += last15DayHighRiskUserCount;
          totalFirst15DayHighRiskUserCount += first15DayHighRiskUserCount;
        } catch (error) {}
      });

      defaulterEMI.forEach((element) => {
        try {
          const emiData = element?.emiData;
          emiData.forEach((ele) => {
            try {
              if (
                ele?.payment_status == '0' &&
                ele?.payment_due_status == '0'
              ) {
                const emiDate = new Date(ele.emi_date);
                if (emiDate >= startDate && emiDate <= endDate) {
                  element.newEmiData = ele;
                  defaultEMIAmount += +ele?.emi_amount;
                  defaultEMICount += 1;
                  delete element?.emiData;
                }
              }
            } catch (error) {}
          });
          if (element?.cibilBatchCategory == 2) totalDefaultHighRiskUserCount++;
        } catch (error) {}
      });

      let result: any = {
        startDate,
        endDate,
        first15DayAmount,
        last15DayAmount,
        first15DayCount,
        last15DayCount,
        defaultEMIAmount,
        defaultEMICount,
        totalDefaultHighRiskUserCount,
        totalFirst15DayHighRiskUserCount,
        totalLast15DayHighRiskUserCount,
      };

      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get Active Part Payment Details
  async getActivePartPaymentDetails(query) {
    try {
      const adminId = query?.adminId ?? -1;
      const searchText = query?.searchText ?? '';

      const where: any = { loanStatus: 'Active' };
      if (adminId != -1) where.followerId = adminId;
      const include = [];
      const order = [['id', 'desc']];
      const traInclude = {
        attributes: ['id'],
        model: TransactionEntity,
        where: { status: 'COMPLETED', type: 'PARTPAY' },
        include: [
          {
            attributes: ['id'],
            model: EmiEntity,
            where: {
              payment_status: '0',
              payment_due_status: '1',
              penalty_days: { [Op.gte]: 1 },
            },
          },
        ],
        order,
      };
      include.push(traInclude);

      /// emi
      const attributes = [
        'id',
        'principalCovered',
        'interestCalculate',
        'penalty',
        'partPaymentPenaltyAmount',
        'penalty_days',
        'pay_type',
        'fullPayPenalty',
        'emi_amount',
        'payment_status',
        'payment_due_status',
      ];
      const emiInclude = {
        attributes,
        model: EmiEntity,
        include: [
          {
            attributes: [
              'id',
              'paidAmount',
              'principalAmount',
              'interestAmount',
              'penaltyAmount',
            ],
            model: TransactionEntity,
            required: false,
            where: { status: 'COMPLETED' },
          },
        ],
      };
      include.push(emiInclude);
      /// admin
      /// user
      const userWhere: any = {};
      if (searchText) userWhere.fullName = { [Op.iRegexp]: searchText };
      const userInclude = {
        attributes: ['id', 'fullName', 'phone', 'email'],
        model: registeredUsers,
        where: userWhere,
      };

      include.push(userInclude);
      const options = { where, include };
      const att = ['id', 'followerId', 'manualVerificationAcceptId'];
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      if (result.length == 0) return result;
      const finalData = await this.prePareActivePartPayData(result);
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prePare active part pay data
  private async prePareActivePartPayData(result) {
    try {
      const finalData = [];
      for (let index = 0; index < result.length; index++) {
        const e = result[index];
        const adminfollowerData =
          (await this.commonServices.getAdminData(e?.followerId))?.fullName ??
          '-';
        e.followerData = adminfollowerData;
        const adminData = await this.commonServices.getAdminData(
          e?.manualVerificationAcceptId,
        );
        e.adminData = { fullName: adminData?.fullName ?? '-' };

        try {
          const temp = {
            'Loan ID': e.id,
            Name: e?.registeredUsers?.fullName,
            'Mobile number': this.cryptService.decryptPhone(
              e?.registeredUsers?.phone,
            ),
            Email: e?.registeredUsers?.email,
            userId: e?.registeredUsers?.id,
            'Penalty days': 0,
            'Paid amount': 0,
            'Total unpaid emi amount': 0,
            'Unpaid emi amount': 0,
            'Unpaid penalty amount': 0,
            'Loan approved by': e?.adminData?.fullName,
            'Follower name': e?.followerData,
          };

          const emiData = e?.emiData;
          const remainData = {
            emiAmount: 0,
            paidPenaltyAmount: 0,
            fullPayPenalty: 0,
            penalty: 0,
          };
          for (let index = 0; index < emiData.length; index++) {
            const element = emiData[index];
            try {
              const status = element?.payment_status;
              if (status === '0' && element?.payment_due_status == '1') {
                temp['Penalty days'] += element?.penalty_days ?? 0;
                remainData.emiAmount +=
                  status === '1' ? 0 : +(element?.emi_amount ?? 0);
                remainData.penalty += +element?.penalty;
              }
              const transaction = element?.transactionData;
              transaction.forEach((res) => {
                try {
                  temp['Paid amount'] += +res?.paidAmount ?? 0;
                } catch (error) {}
              });
            } catch (error) {}
          }
          temp['Total unpaid emi amount'] =
            remainData?.emiAmount + remainData?.penalty;
          temp['Unpaid emi amount'] = remainData?.emiAmount;
          temp['Unpaid penalty amount'] = remainData?.penalty;
          finalData.push(temp);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // #startregion get all chat documents user userId
  async fetchAllChatDocumentByUserId(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const attr = [
        'id',
        'userId',
        'docUrl',
        'docType',
        'type',
        'password',
        'isDeleted',
        'adminId',
        'createdAt',
      ];
      const obj: any = { [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }] };
      const options = {
        where: {
          userId: userId,
          isDeleted: obj,
        },
        order: [['id', 'DESC']],
      };
      const data: any = await this.mediaRepo.getTableWhereData(attr, options);
      if (data === k500Error) return kInternalError;
      let checkIfAddressProf = false;
      for (let i = 0; i < data.length; i++) {
        const ele = data[i];
        try {
          const adminId = ele?.adminId;
          let adminData = await this.commonServices.getAdminData(adminId);
          ele.adminData =
            adminData?.id === null
              ? { fullName: 'User' }
              : { id: adminData?.id, fullName: adminData?.fullName };

          if (ele.docType === 'addressProof') {
            checkIfAddressProf = true;
          }
        } catch (error) {}
      }

      if (!checkIfAddressProf) {
        const userData = await this.userRepo.getRowWhereData(
          ['id', 'homeProofImage', 'createdAt', 'residenceAdminId'],
          { where: { id: userId } },
        );
        if (userData === k500Error) return kInternalError;
        if (!userData) return k422ErrorMessage(str.kNoDataFound);
        if (userData?.homeProofImage) {
          const type = userData?.homeProofImage?.split('.').reverse()[0];
          data.push({
            userId,
            docUrl: userData.homeProofImage,
            type,
            docType: 'addressProof',
            createdAt: userData.createdAt,
            adminData: userData?.residenceAdminData ?? {
              fullName: 'User',
            },
          });
        }
      }
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #start region get all device by userID
  async getAllDeviceByUserId(query) {
    // Validation -> Parameter
    const userId = query?.userId;
    if (!userId) return kParamMissing('userId');
    // Hit -> Query
    const user = await this.userRepo.getRowWhereData(['id', 'recentDeviceId'], {
      where: { id: userId },
    });
    if (user === k500Error) throw new Error();
    if (!user) return k422ErrorMessage(str.kNoDataFound);
    // Preparation -> Query
    const attributes = ['id', 'deviceId', 'createdAt', 'updatedAt'];
    // Hit -> Query
    const deviceData = await this.deviceRepo.getTableWhereData(attributes, {
      where: { userId },
      order: [['id', 'DESC']],
    });
    // Validation -> Query data
    if (deviceData === k500Error) throw new Error();

    const idList = [...new Set(deviceData.map((item) => item?.deviceId))];
    const attr = ['id', 'deviceId', 'deviceInfo', 'webDeviceInfo'];
    const opts = { where: { deviceId: idList } };
    const deviceDetails = await this.deviceAppInfoRepo.getTableWhereData(
      attr,
      opts,
    );
    // Validation -> Query data
    if (deviceDetails === k500Error) throw new Error();

    const uniqueDevice = [];
    for (let i = 0; i < deviceData.length; i++) {
      try {
        const ele = deviceData[i];
        const deviceId = ele?.deviceId;
        const find = uniqueDevice.find((fd) => fd?.deviceId == deviceId);
        if (find) continue;

        const obj: any = { deviceId };
        obj.status = deviceId == user?.recentDeviceId ? 'Active' : 'Inactive';
        const details = deviceDetails.find((f) => f?.deviceId == deviceId);
        const deviceInfo = details?.deviceInfo
          ? JSON.parse(details?.deviceInfo)
          : {};
        obj.Type = deviceInfo?.brand
          ? 'Android'
          : deviceInfo?.localizedModel
          ? 'IOS'
          : '-';

        obj.brand = deviceInfo?.brand ?? deviceInfo?.name ?? '-';
        obj.deviceName = deviceInfo?.model ?? '-';
        obj.OSVersion =
          deviceInfo?.release_version ?? deviceInfo?.systemVersion ?? '-';

        // Web device info
        if (details.webDeviceInfo) {
          try {
            const webInfo = JSON.parse(details.webDeviceInfo);
            if (webInfo.user_agent) {
              const browserDetails = this.getBrowserDetails(webInfo.user_agent);
              obj.brand = browserDetails?.os_family;
              obj.Type = 'WEB';
              obj.deviceName = browserDetails?.browser_family;
            }
          } catch (error) {}
        }

        const createDate = this.dateService.dateToReadableFormat(
          ele?.createdAt,
        );
        const updateDate = this.dateService.dateToReadableFormat(
          ele?.updatedAt,
        );
        obj.createdAt = `${createDate.readableStr} ${createDate.hours}:${createDate.minutes} ${createDate.meridiem}`;
        obj.updatedAt = `${updateDate.readableStr} ${updateDate.hours}:${updateDate.minutes} ${updateDate.meridiem}`;
        uniqueDevice.push(obj);
      } catch (error) {}
    }
    uniqueDevice.sort((a, b) => a.status.localeCompare(b.status));
    return uniqueDevice;
  }

  private getBrowserDetails(userAgentString) {
    var ua = userAgentString || navigator.userAgent;
    var browserDetails: any = {};

    var match =
      ua.match(
        /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
      ) || [];
    if (/trident/i.test(match[1])) {
      var tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      browserDetails.browser_family = 'IE';
      browserDetails.browser_version = tem[1] || '';
    }
    if (match[1] === 'Chrome') {
      let tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
      if (tem != null) {
        browserDetails.browser_family = tem[1].replace('OPR', 'Opera');
        browserDetails.browser_version = tem[2];
      }
    }
    match = match[2]
      ? [match[1], match[2]]
      : [navigator.appName, navigator.appVersion, '-?'];

    if (browserDetails.browser_family === undefined) {
      browserDetails.browser_family = match[0];
      browserDetails.browser_version = match[1];
    }

    var OSName = 'Unknown OS';
    if (ua.indexOf('Win') != -1) OSName = 'Windows';
    if (ua.indexOf('Mac') != -1) OSName = 'Mac';
    if (ua.indexOf('Linux') != -1) OSName = 'Linux';
    if (ua.indexOf('iPhone') != -1) OSName = 'iPhone';
    if (ua.indexOf('iPad') != -1) OSName = 'iPad';
    if (ua.indexOf('Android') != -1) OSName = 'Android';

    browserDetails.os_family = OSName;

    return browserDetails;
  }

  // #start get net banking data
  async getNetbankingNMandateData(query) {
    try {
      if (!query?.loanId) return kParamMissing('loanId');
      const loanId = +query.loanId;
      const loanData = await this.getLoanDataForNetBanking(loanId);
      if (loanData?.message) return loanData;
      const netBankingData = await this.getAllNetBankingData(
        loanData?.bankingData,
        loanData?.loanStatus,
      );
      if (netBankingData?.message) return netBankingData;
      return { loanData, netBankingData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  async getLoanDataForNetBanking(loanId: number) {
    try {
      const loanAttr = [
        'id',
        'userId',
        'bankingId',
        'subscriptionId',
        'mandate_id',
        'loanStatus',
        'approvedDuration',
        'TotalRepayAmount',
        'repaidAmount',
        'bankingId',
      ];
      const loanOptions = {
        where: {
          id: loanId,
        },
        include: [
          {
            attributes: ['fullName', 'email', 'phone'],
            model: registeredUsers,
            include: [
              {
                model: employmentDetails,
                attributes: ['companyName', 'salary', 'salarySlipId'],
                include: [
                  {
                    model: SalarySlipEntity,
                    attributes: ['netPayAmount', 'id'],
                  },
                ],
              },
            ],
          },
          {
            model: BankingEntity,
            attributes: [
              'netBankingScore',
              'accountNumber',
              'ifsCode',
              'name',
              'bank',
              'adminSalary',
              'salary',
              'additionalAccountNumber',
              'additionalBank',
              'additionalIFSC',
              'isNeedAdditional',
              'tagSalaryData',
            ],
          },
          {
            model: EmiEntity,
          },
          { model: mandateEntity },
          { model: BankingEntity },
          { model: SubScriptionEntity },
        ],
      };
      const loanData = await this.loanRepo.getRowWhereData(
        loanAttr,
        loanOptions,
      );
      if (loanData === k500Error) return kInternalError;
      if (
        loanData?.registeredUsers &&
        loanData?.registeredUsers?.employmentData
      ) {
        loanData.employment = loanData?.registeredUsers?.employmentData;
      }
      // employment   employmentData  registeredUsers)
      if (loanData?.registeredUsers && loanData?.registeredUsers?.phone) {
        loanData.registeredUsers.phone = await this.cryptService.decryptPhone(
          loanData?.registeredUsers?.phone,
        );
      }
      loanData.emiData.sort((a, b) => a?.id - b?.id);
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAllNetBankingData(bankingData, loanStatus: string, temp = false) {
    try {
      if (!bankingData) return kInternalError;
      try {
        bankingData['isAdditionalAccount'] = false;
      } catch (error) {}
      return bankingData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Loan History Counts
  async getLoanTransactionService(userId) {
    try {
      const loanHistoryData = {
        totalAmount: 0,
        totalCount: 0,
        onTimeAmount: 0,
        onTimeCount: 0,
        delayAmount: 0,
        delayCount: 0,
        inProgressAmount: 0,
        inProgressCount: 0,
        defaulterAmount: 0,
        defaulterCount: 0,
      };
      const loanAttr = [
        'id',
        'userId',
        'loanStatus',
        'loanAmount',
        'manualVerificationAcceptId',
      ];
      const include = [
        {
          model: loanPurpose,
          attributes: ['purposeName'],
        },
        {
          model: EmiEntity,
          as: 'emiData',
          attributes: [
            'id',
            'userId',
            'loanId',
            'emi_date',
            'emi_amount',
            'payment_status',
            'payment_due_status',
            'penalty',
          ],
          order: [['emi_date', 'ASC']],
        },
      ];
      const options = {
        where: { userId },
        order: [['id', 'DESC']],
        include,
      };
      const loanData = await this.loanRepo.getTableWhereData(loanAttr, options);
      if (loanData === k500Error) return kInternalError;
      for (let i = 0; i < loanData.length; i++) {
        try {
          const data = { ...loanData[i] };
          const adminId = data.manualVerificationAcceptId;

          const adminData = await this.commonServices.getAdminData(adminId);
          data.adminData = adminData.id === null ? null : adminData;

          loanHistoryData.totalCount += 1;
          if (data.loanStatus == 'Active' || data.loanStatus == 'Complete') {
            let onTimeIsCounted = false;
            let delayIsCounted = false;
            let inProgressIsCounted = false;
            let defaulterIsCounted = false;
            let defaulterEmisCounts = 0;
            for (let i = 0; i < data.emiData.length; i++) {
              try {
                const currentEmi = { ...data.emiData[i] };
                loanHistoryData.totalAmount += parseFloat(
                  currentEmi.emi_amount,
                );
                // emi paid without any penalty
                if (
                  currentEmi.payment_status == '1' &&
                  currentEmi.payment_due_status == '0'
                ) {
                  loanHistoryData.onTimeAmount += parseFloat(
                    currentEmi.emi_amount,
                  );
                  if (!onTimeIsCounted) loanHistoryData.onTimeCount += 1;
                  onTimeIsCounted = true;
                }
                // emi paid with penalty
                if (
                  currentEmi.payment_status == '1' &&
                  currentEmi.payment_due_status == '1'
                ) {
                  loanHistoryData.delayAmount +=
                    parseFloat(currentEmi.emi_amount) + currentEmi.penalty;
                  if (!delayIsCounted) loanHistoryData.delayCount += 1;
                  delayIsCounted = true;
                }
                // emi unpaid but no penalty
                if (
                  currentEmi.payment_status == '0' &&
                  currentEmi.payment_due_status == '0'
                ) {
                  loanHistoryData.inProgressAmount += parseFloat(
                    currentEmi.emi_amount,
                  );
                  if (!inProgressIsCounted)
                    loanHistoryData.inProgressCount += 1;
                  inProgressIsCounted = true;
                }
                // emi unpaid but penalty
                if (
                  currentEmi.payment_status == '0' &&
                  currentEmi.payment_due_status == '1'
                ) {
                  defaulterEmisCounts++;
                  if (defaulterEmisCounts === data.emiData.length) {
                    // Full pay amount
                    const fullPayData =
                      await this.sharedCalculation.getFullPaymentData({
                        loanId: data.id,
                      });
                    if (fullPayData?.message) return fullPayData;
                    loanHistoryData.defaulterAmount = fullPayData.totalAmount;
                  } else {
                    loanHistoryData.defaulterAmount +=
                      parseFloat(currentEmi.emi_amount) + currentEmi.penalty;
                  }
                  if (!defaulterIsCounted) loanHistoryData.defaulterCount += 1;
                  defaulterIsCounted = true;
                }
              } catch (error) {}
            }
          }
        } catch (error) {}
      }
      const result = {
        total: loanHistoryData.totalAmount.toFixed(2),
        totalCount: loanHistoryData.totalCount,
        onTime: loanHistoryData.onTimeAmount.toFixed(2),
        onTimeCount: loanHistoryData.onTimeCount,
        delay: loanHistoryData.delayAmount.toFixed(2),
        delayCount: loanHistoryData.delayCount,
        inProgress: loanHistoryData.inProgressAmount.toFixed(2),
        inProgressCount: loanHistoryData.inProgressCount,
        defaulter: loanHistoryData.defaulterAmount.toFixed(2),
        defaulterCount: loanHistoryData.defaulterCount,
      };
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getDashboardData() {
    const listResult = await Promise.all([
      // #01 -> Users insights
      this.registeredUsersInsights(),
      // #02 -> Recovered insights
      this.recoveredAmountInsights(),
      // #03 -> Disbursed insights
      this.disbursedLoanInsights(),
    ]);

    return { ...listResult[0], ...listResult[1], ...listResult[2] };
  }

  // #01 -> Users insights
  private async registeredUsersInsights() {
    // Preparation ->  Last month's insights
    let date = new Date();
    let lastMonthY = date.getFullYear();
    let lastMonthM = date.getMonth() - 1;
    let lastMonthD = new Date(lastMonthY, lastMonthM, 1);
    let lastMonthD1 = new Date(lastMonthY, lastMonthM + 1, 0);
    const range = this.typeService.getUTCDateRange(
      lastMonthD.toString(),
      lastMonthD1.toString(),
    );
    const lastMonthOptions = {
      where: {
        createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
      },
    };
    const lastMonthIOSOptions = {
      where: {
        createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        typeOfDevice: '1',
      },
    };

    // Current month's insights
    let y = date.getFullYear();
    let m = date.getMonth();
    let currMonthD = new Date(y, m, 1);
    currMonthD.setDate(currMonthD.getDate());
    let currMonthD1 = new Date();
    const currRange = this.typeService.getUTCDateRange(
      currMonthD.toString(),
      currMonthD1.toString(),
    );
    const currentMonthOptions = {
      where: {
        createdAt: {
          [Op.gte]: currRange.fromDate,
          [Op.lte]: currRange.endDate,
        },
      },
    };
    const currentMonthIOSOptions = {
      where: {
        createdAt: {
          [Op.gte]: currMonthD.toJSON(),
          [Op.lte]: currMonthD1.toJSON(),
        },
        typeOfDevice: '1',
      },
    };

    const uniqueLoanUserAttr = [
      [
        Sequelize.literal(`COUNT(DISTINCT "loanTransaction"."userId")`),
        'uniqueUsersCount',
      ],
    ];
    const uniqueLoanUserOptions = {
      where: {
        loanStatus: { [Op.in]: ['Active', 'Complete'] },
      },
    };

    const listResult = await Promise.all([
      // All
      this.userRepo.getCountsWhere({}),
      // Last month
      this.userRepo.getCountsWhere(lastMonthOptions),
      this.userRepo.getCountsWhere(lastMonthIOSOptions),
      // Current month
      this.userRepo.getCountsWhere(currentMonthOptions),
      this.userRepo.getCountsWhere(currentMonthIOSOptions),
      // Unique loan users
      this.loanRepo.getRowWhereData(uniqueLoanUserAttr, uniqueLoanUserOptions),
    ]);

    return {
      totalUsers: listResult[0],
      totalUniqueUsers: +listResult[5].uniqueUsersCount,
      lastMonthUsers: listResult[1],
      lastMonthIOSUsers: listResult[2],
      lastMonthAndroidUsers: listResult[1] - listResult[2],
      currentMonthUsers: listResult[3],
      currentMonthIOSUsers: listResult[4],
      currentMonthAndroidUsers: listResult[3] - listResult[4],
    };
  }

  // #02 -> Recovered insights
  private async recoveredAmountInsights() {
    const listResult: any = await Promise.all([
      this.getPartPrincipalAmount(),
      this.getReceivedPrincipal(),
      this.getUpcommingPrincipal(),
    ]);
    const defaulterPrincipal: any = await this.defaultedPrincipal(
      listResult[0],
    );

    return {
      receivedPrincipal: Math.floor(listResult[0] + listResult[1]),
      upcommingPrincipal: listResult[2]?.principalAmt,
      upcommingInterest: listResult[2]?.interestAmt,
      defaulterPrincipal,
    };
  }

  // #03 -> Disbursed insights
  private async disbursedLoanInsights() {
    // Last month's insights
    const date = this.typeService.getGlobalDate(new Date());
    const y = date.getFullYear();
    const m = date.getMonth();
    const lastMonthD = this.typeService.getGlobalDate(new Date(y, m - 1, 1));
    const lastMonthD1 = this.typeService.getGlobalDate(new Date(y, m, 0));

    // Current month's insights
    const curreDate = this.typeService.getGlobalDate(new Date());
    const currY = curreDate.getFullYear();
    const currM = curreDate.getMonth();
    const currD = this.typeService.getGlobalDate(new Date(currY, currM, 1));
    const currD1 = this.typeService.getGlobalDate(new Date());

    const listResult = await Promise.all([
      // Last month's insights
      this.getDisbursedUsersCountWhere(lastMonthD, lastMonthD1),
      this.getDisbursedUsersCountWhere(
        lastMonthD,
        lastMonthD1,
        'NEWUSERSCOUNT',
      ),
      this.getDisbursedUsersCountWhere(
        lastMonthD,
        lastMonthD1,
        'IOSDEVICECOUNT',
      ),
      // Current month's insights
      this.getDisbursedUsersCountWhere(currD, currD1),
      this.getDisbursedUsersCountWhere(currD, currD1, 'NEWUSERSCOUNT'),
      this.getDisbursedUsersCountWhere(currD, currD1, 'IOSDEVICECOUNT'),
      // Today's insights
      this.getTodaysDisbursmentCountsWithAmount(),
      // Total insights
      this.loanRepo.getRowWhereData(
        [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.cast(
                Sequelize.col('netApprovedAmount'),
                'double precision',
              ),
            ),
            'totalApprovedAmount',
          ],
        ],
        {
          where: { loanStatus: { [Op.in]: ['Active', 'Complete'] } },
        },
      ),
    ]);

    return {
      lastMonthData: {
        totalCount: +listResult[0].disbursedCount,
        totalAmount: +listResult[0].amount,
        newUsersCount: +listResult[1].disbursedCount,
        newUsersAmount: +listResult[1].amount,
        iosUsersCount: +listResult[2].disbursedCount,
        iosUsersAmount: +listResult[2].amount,
        androidUsersCount:
          +listResult[0].disbursedCount - +listResult[2].disbursedCount,
        androidUsersAmount: +listResult[0].amount - +listResult[2].amount,
      },
      currentMonthData: {
        totalCount: +listResult[3].disbursedCount,
        totalAmount: +listResult[3].amount,
        newUsersCount: +listResult[4].disbursedCount,
        newUsersAmount: +listResult[4].amount,
        iosUsersCount: +listResult[5].disbursedCount,
        iosUsersAmount: +listResult[5].amount,
        androidUsersCount:
          +listResult[3].disbursedCount - +listResult[5].disbursedCount,
        androidUsersAmount: +listResult[3].amount - +listResult[5].amount,
      },
      todayData: listResult[6],
      totalDisbursedCount: +listResult[7].count,
      totalApprovedAmount: +listResult[7].totalApprovedAmount,
    };
  }

  private async getDisbursedUsersCountWhere(d, d1, type?) {
    const rawOptions: any = {
      include: [],
      where: {
        loan_disbursement: '1',
        loan_disbursement_date: {
          [Op.gte]: d.toJSON(),
          [Op.lte]: d1.toJSON(),
        },
      },
    };

    //  get counts of new users with daterange
    if (type == 'NEWUSERSCOUNT') {
      const tempLoan: any = await this.loanRepo.getTableWhereData(
        ['id', 'userId', 'completedLoan', 'netApprovedAmount'],
        rawOptions,
      );
      if (tempLoan === k500Error) throw new Error();

      const userList = [];
      let newCount = 0;
      let newAmount = 0;
      tempLoan.forEach((e) => {
        userList.push(e.userId);
        if (e.completedLoan < 1) {
          newCount++;
          newAmount += +e.netApprovedAmount;
        }
      });
      return { disbursedCount: newCount, amount: newAmount.toFixed(2) };
    } else if (type == 'IOSDEVICECOUNT') {
      rawOptions.include.push({
        model: registeredUsers,
        attributes: ['id'],
        where: { typeOfDevice: '1' },
      });
    }

    // Total count & amount
    const disbursedCount: any = await this.loanRepo.getTableWhereDataWithCounts(
      ['id', 'netApprovedAmount'],
      rawOptions,
    );
    if (disbursedCount === k500Error) throw new Error();

    // Preparation -> Response
    let amount = 0;
    disbursedCount.rows.forEach((element) => {
      amount += +element.netApprovedAmount;
    });
    amount = +amount.toFixed(2);
    return { disbursedCount: +disbursedCount.count, amount };
  }

  private async getTodaysDisbursmentCountsWithAmount() {
    // Preparation -> Query
    const today = this.typeService.getGlobalDate(new Date()).toJSON();
    const loanAttr: any = [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
      [
        Sequelize.fn(
          'SUM',
          Sequelize.cast(
            Sequelize.col('netApprovedAmount'),
            'double precision',
          ),
        ),
        'totalApprovedAmount',
      ],
    ];
    const loanOptions = {
      where: {
        loan_disbursement_date: today,
        loanStatus: { [Op.in]: ['Active', 'Complete'] },
      },
    };
    // Hit -> Query
    const loanData = await this.repoManager.getRowWhereData(
      loanTransaction,
      loanAttr,
      loanOptions,
    );
    // Validation -> Query data
    if (loanData == k500Error) throw new Error();

    const todayD = new Date();
    todayD.setHours(0, 0, 1, 0);
    const todayD1 = new Date();
    todayD1.setHours(23, 59, 59);

    // Today's new user's insights
    const allNewDisbursedUsersCount = await this.getDisbursedUsersCountWhere(
      todayD,
      todayD1,
      'NEWUSERSCOUNT',
    );
    // Today's repeater user's insights
    let repeatedUserAmount =
      +loanData.totalApprovedAmount - +allNewDisbursedUsersCount.amount;
    repeatedUserAmount = +repeatedUserAmount.toFixed(2);
    // Today's IOS user's insights
    const allIOSDevicesCounts: any = await this.getDisbursedUsersCountWhere(
      todayD,
      todayD1,
      'IOSDEVICECOUNT',
    );

    // Preparation -> Return response
    return {
      totalCount: +loanData.totalCount,
      totalApprovedAmount: +loanData.totalApprovedAmount,
      totalNewUsers: allNewDisbursedUsersCount.disbursedCount,
      totalRepeatedUser:
        +loanData.totalCount - +allNewDisbursedUsersCount.disbursedCount,
      newUserAmount: +allNewDisbursedUsersCount.amount,
      repeatedUserAmount,
      iosDeviceCounts: +allIOSDevicesCounts.disbursedCount,
    };
  }

  // total defaulter principal
  async defaultedPrincipal(totalPartPrincipalAmount) {
    // Query preparations
    const attributes: any = [
      [
        Sequelize.fn('SUM', Sequelize.col('principalCovered')),
        'principalAmount',
      ],
    ];
    const options = {
      where: { payment_status: '0', payment_due_status: '1' },
    };
    // Query
    const emiData: any = await this.emiRepo.getRowWhereData(
      attributes,
      options,
    );
    if (emiData == k500Error) return kInternalError;
    const defaultedPrincipal = emiData.principalAmount;
    return Math.abs(defaultedPrincipal) - Math.abs(totalPartPrincipalAmount);
  }

  private async getPartPrincipalAmount() {
    // EMI table join
    const emiInclude: { model; attributes? } = { model: EmiEntity };
    emiInclude.attributes = ['id'];
    const include = [emiInclude];

    const attributes = [
      [
        Sequelize.fn('SUM', Sequelize.col('principalAmount')),
        'principalAmount',
      ],
    ];
    // Query preparation
    const options = {
      group: [`"TransactionEntity"."id"`, `"emiData"."id"`],
      include,
      where: {
        [Op.and]: Sequelize.literal(
          `"emiData"."payment_status" = '0' AND "emiData"."payment_due_status" = '1'`,
        ),
        status: str.kCompleted,
        type: { [Op.ne]: 'REFUND' },
      },
    };
    // Query
    const transList = await this.transactionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (transList === k500Error) throw new Error();

    let partPaidPrincipalAmount = 0;
    transList.forEach((el) => {
      partPaidPrincipalAmount += el.principalAmount ?? 0;
    });

    return Math.floor(partPaidPrincipalAmount);
  }

  // total received principal
  async getReceivedPrincipal() {
    // Query preparations
    const attributes: any = [
      [
        Sequelize.fn('SUM', Sequelize.col('principalCovered')),
        'principalAmount',
      ],
    ];
    const options = {
      where: { payment_status: '1' },
    };
    // Query
    const emiData: any = await this.emiRepo.getRowWhereData(
      attributes,
      options,
    );
    if (emiData === k500Error) throw new Error();

    return Math.floor(emiData.principalAmount);
  }

  // total upcomming principal
  async getUpcommingPrincipal() {
    const emiAtt: any = [
      [Sequelize.fn('SUM', Sequelize.col('principalCovered')), 'principalAmt'],
      [Sequelize.fn('SUM', Sequelize.col('interestCalculate')), 'interestAmt'],
    ];
    const options = { where: { payment_status: '0', payment_due_status: '0' } };
    const totalPrAmt: any = await this.emiRepo.getRowWhereData(emiAtt, options);
    if (!totalPrAmt || totalPrAmt === k500Error) return kInternalError;
    return {
      principalAmt: totalPrAmt?.principalAmt,
      interestAmt: totalPrAmt?.interestAmt,
    };
  }

  async fetchAllDocumentsLoanWise(reqData) {
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');
    const loanId = reqData?.loanId;
    try {
      let attachmentDocs: any;
      if (!loanId) {
        attachmentDocs = await this.fetchAllChatDocumentByUserId({
          userId,
        });
        if (attachmentDocs?.message) return attachmentDocs;
      }
      const otherDocs = await this.getOtherDocuments(reqData);
      if (otherDocs?.message) return otherDocs;

      const finalData = await this.prepareFinalData(attachmentDocs, otherDocs);
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getOtherDocuments(reqData) {
    const userId = reqData?.userId;
    const loanId = +reqData?.loanId;
    try {
      const attributes = ['id', 'nocURL'];
      const eSignInclude = {
        model: esignEntity,
        attributes: ['signed_document_upload', 'content_type', 'createdAt'],
      };

      const insuranceInclude = {
        model: InsuranceEntity,
        attributes: ['insuranceURL', 'insuranceURL1', 'createdAt'],
      };
      const options: any = {};
      options.where = loanId ? { id: loanId, userId } : { userId };
      options.order = [['id', 'desc']];
      options.include = [eSignInclude, insuranceInclude];

      const documentDetails = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (documentDetails === k500Error) return kInternalError;
      return documentDetails;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareFinalData(attachmentDocs, otherDocs) {
    const finalData = [];
    try {
      if (attachmentDocs) {
        for (let attachmentDoc of attachmentDocs) {
          const doc = {
            loanId: '-',
            document: attachmentDoc?.docType ?? '-',
            documentType: attachmentDoc?.type ?? '-',
            password: attachmentDoc?.password ?? '-',
            docUrl: attachmentDoc?.docUrl ?? '-',
            uploadedBy: attachmentDoc?.adminData.fullName ?? '-',
            date: attachmentDoc?.createdAt ?? '-',
          };
          finalData.push(doc);
        }
      }

      for (let otherDoc of otherDocs) {
        if (otherDoc?.nocURL) {
          const docType = otherDoc.nocURL.split('.').reverse()[0];
          const nocDoc = {
            loanId: otherDoc?.id ?? '-',
            document: 'NOC',
            documentType: docType ?? '-',
            password: '-',
            docUrl: otherDoc?.nocURL ?? '-',
            uploadedBy: '-',
            date: '-',
          };
          finalData.push(nocDoc);
        }

        if (otherDoc?.eSignData) {
          const loanAgreeDoc = {
            loanId: otherDoc?.id ?? '-',
            document: 'Loan Agreement',
            documentType: otherDoc?.eSignData.content_type.toLowerCase() ?? '-',
            password: '-',
            docUrl: otherDoc?.eSignData.signed_document_upload ?? '-',
            uploadedBy: '-',
            date: otherDoc?.eSignData.createdAt ?? '-',
          };
          finalData.push(loanAgreeDoc);
        }

        if (otherDoc?.insuranceData) {
          const insuranceDoc1 = {
            loanId: otherDoc?.id ?? '-',
            document: 'Health & Emi Insurance(Care)',
            documentType: 'pdf',
            password: '-',
            docUrl: otherDoc?.insuranceData?.insuranceURL ?? '-',
            uploadedBy: '-',
            date: otherDoc?.insuranceData?.createdAt ?? '-',
          };
          const insuranceDoc2 = {
            loanId: otherDoc?.id ?? '-',
            document: 'Loss of job Insurance(Acko)',
            documentType: 'pdf',
            password: '-',
            docUrl: otherDoc?.insuranceData?.insuranceURL1 ?? '-',
            uploadedBy: '-',
            date: otherDoc?.insuranceData?.createdAt ?? '-',
          };
          finalData.push(insuranceDoc1, insuranceDoc2);
        }
      }

      return finalData;
    } catch (error) {}
  }

  async funUploadBatchFile(reqData) {
    const path = `${reqData?.file?.destination}${reqData?.file?.filename}`;
    const filePath = fs.readFileSync(path);

    const body = new FormData();
    body.append('file', filePath, reqData?.file?.filename);
    const url = nCibilRiskCategoryFromBatch;
    const data = await this.api.post(url, body);
    if (data === k500Error) throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    const totalLists = this.typeService.splitToNChunks(data.data, 1000);
    const riskCategoryMap = {
      'LOW RISK': 0,
      'MODERATE RISK': 1,
      'HIGH RISK': 2,
    };
    const promiseList = [];
    for (let index = 0; index < totalLists.length; index++) {
      const targetList = totalLists[index];
      let updateQuery = '';
      for (let i = 0; i < targetList.length; i++) {
        const ele = targetList[i];
        const loanId = ele.LoanId;
        const cibilBatchCategory = riskCategoryMap[ele['Risk Category']];
        updateQuery += `UPDATE  public."loanTransactions"
        SET "cibilBatchCategory" = '${cibilBatchCategory}' 
        WHERE id = '${loanId}'; `;
      }
      promiseList.push(
        this.repoManager.injectRawQuery(loanTransaction, updateQuery),
      );
    }
    const updates = await Promise.all(promiseList);
    if (updates.some((update) => update === k500Error))
      throw new Error(kErrorMsgs.INTERNAL_SERVER_ERROR);
    return true;
  }
}
