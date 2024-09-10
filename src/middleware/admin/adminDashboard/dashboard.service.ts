import { Injectable } from '@nestjs/common/decorators';
import { Op, Sequelize } from 'sequelize';
import { KBlankPDFUrl, ktempLegalNoticeDocs } from 'src/constants/directories';
import {
  DAY_LIMIT,
  kNotPlaceAutoDebit,
  PAGE_LIMIT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { UserStage } from 'src/constants/objects';
import { AddressesEntity } from 'src/entities/addresses.entity';
import { kDateRangeLimit } from 'src/constants/strings';
import { DateService } from 'src/utils/date.service';
import {
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
} from 'src/constants/responses';
import {
  kAutoDebit,
  kInitiated,
  kNoDataFound,
  tAadhaar,
  tApproval,
  tContact,
  tDisbursement,
  tEMandate,
  tEmployment,
  tESign,
  tInProgress,
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
import { EmiEntity } from 'src/entities/emi.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import * as moment from 'moment';
import { MasterEntity } from 'src/entities/master.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { StringService } from 'src/utils/string.service';
import { EnvConfig } from 'src/configs/env.config';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { regPanCard } from 'src/constants/validation';
import { CallingService } from '../calling/calling.service';

@Injectable()
export class AdminDashboardService {
  TrackingModel = {
    status: '',
    title: '',
    date: '',
    approvedBy: '',
    message: '',
    orderBy: '',
  };
  transactionIDsExits: any = [];
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly repoManager: RepositoryManager,
    private readonly cryptService: CryptService,
    private readonly transactionRepo: TransactionRepository,
    private readonly blockUserRepo: BlockUserHistoryRepository,
    private readonly userSelfieRepo: UserSelfieRepository,
    private readonly employmentRepo: EmploymentRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly fileService: FileService,
    private readonly disburesementRepo: DisbursmentRepository,
    private readonly loanRepo: LoanRepository,
    private readonly masterRepo: MasterRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    private readonly referralRepo: ReferralRepository,
    private readonly dateService: DateService,
    private readonly stringService: StringService,
    private readonly kycRepo: KYCRepository,
    private readonly callingService: CallingService
  ) { }

  //#region dowanloadDocument
  async downloadDocument(urlList) {
    try {
      const pathCollections = [];
      for (let i = 0; i < urlList.length; i++) {
        try {
          const result = await this.fileService.urlToBuffer(
            urlList[i],
            true,
            'pdf',
          );
          if (result && result !== k500Error)
            pathCollections.push(result, KBlankPDFUrl);
        } catch (error) { }
      }
      const currentPage = pathCollections[0];
      const mergedPdf = await this.fileService.mergeMultiplePDF(
        pathCollections.slice(1, pathCollections.length - 1),
        currentPage,
      );
      if (!mergedPdf || mergedPdf === k500Error) return kInternalError;
      const result = await this.fileService.uploadFile(
        mergedPdf,
        ktempLegalNoticeDocs,
      );
      if (result === k500Error || !result) return kInternalError;
      for (let index = 0; index < pathCollections.length; index++) {
        try {
          const path = pathCollections[index];
          if (KBlankPDFUrl != path) await this.fileService.removeFile(path);
        } catch (error) { }
      }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#end region

  async getTodayAutoDebitData(query) {
    try {
      const options = this.prePareOptionFroAutoDebit(query);
      if (options?.message) return options;
      const result: any = await this.findAutoDebitData(options);

      if (result?.message) return result;

      const finalData = await this.prepareData(result.rows);
      if (query?.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Defaulter auto debit.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        if (query?.downloadId)
          await this.reportHistoryRepo.updateRowData(
            updatedData,
            query.downloadId,
          );
        return { fileUrl: url };
      } else {
        return { count: result.count, finalData: finalData };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region prepare option for AutoDebit Data
  private prePareOptionFroAutoDebit(query) {
    const stDate = query?.start_date;
    const enDate = query?.end_date;
    const startDate = this.typeService.getGlobalDate(new Date(stDate));
    const endDate = this.typeService.getGlobalDate(new Date(enDate));
    const status = query?.status;
    const page = query?.page ?? 1;
    const pagesize = query?.pagesize ?? PAGE_LIMIT;
    const offset = pagesize * (page - 1);
    // Purpose -> QA Automation
    const skipPageLimit = query.skipPageLimit === 'true';

    if (!startDate || !endDate || !status) return kParamsMissing;
    // Where condition
    let where: any = {
      [Op.or]: [{ subSource: 'AUTODEBIT' }, { source: 'AUTOPAY' }],
    };
    if (query?.adminId) where.adminId = query?.adminId;
    if (status == '1' || status == '7') {
      where.status = 'INITIALIZED';
      where = { ...where, utr: { [Op.ne]: null } };
    } else if (status == '3' || status == '8') where.status = 'COMPLETED';
    else if (status == '4' || status == '9') {
      where.status = 'FAILED';
      where = {
        [Op.or]: [
          { ...where },
          {
            status: kInitiated,
            subSource: kAutoDebit,
            utr: { [Op.eq]: null },
          },
        ],
      };
    }
    const statusArr = [6, 7, 8, 9];
    let emiWhere: any = {};
    let required = true;
    const filterData: any = {
      [Op.gte]: startDate.toJSON(),
      [Op.lte]: endDate.toJSON(),
    };
    if (statusArr.includes(+status)) {
      let tranWhere: any = {};
      tranWhere.subscriptionDate = {
        [Op.eq]: Sequelize.col('"emiData"."emi_date"'),
      };
      emiWhere.emi_date = filterData;
      if (status == '9') emiWhere.payment_status = '0';
      where = { ...where, ...tranWhere };
    } else {
      let tranWhere: any = {
        [Op.and]: [
          { subscriptionDate: filterData },
          {
            [Op.or]: {
              emiId: { [Op.eq]: null },
              subscriptionDate: {
                [Op.ne]: Sequelize.col('"emiData"."emi_date"'),
              },
            },
          },
        ],
      };
      where = { ...where, ...tranWhere };
      required = false;
    }
    const whereName: any = {};
    const whereloan: any = {};
    let search = (query?.searchText ?? '').toLowerCase();
    if (search) {
      if (search.startsWith('l-')) whereloan.id = search.replace('l-', '');
      else if (!isNaN(search)) {
        search = this.cryptService.encryptPhone(search);
        if (search == k500Error) return k500Error;
        search = search.split('===')[1];
        whereName.phone = { [Op.like]: '%' + search + '%' };
      } else whereName.fullName = { [Op.iRegexp]: query?.searchText };
    }
    /// include
    const emiInclude = {
      model: EmiEntity,
      attributes: [
        'id',
        'emi_date',
        'emi_amount',
        'loanId',
        'userId',
        'payment_done_date',
        'payment_status',
        'payment_due_status',
      ],
      where: emiWhere,
      required,
    };
    const loanInclude = {
      model: loanTransaction,
      where: whereloan,
      attributes: [
        'appType',
        'id',
        'manualVerificationAcceptName',
        'manualVerificationAcceptId',
        'loan_disbursement_date',
        'loan_disbursement_id',
        'insuranceId',
        'currentAccountBalance',
        'balanceFetchDate',
      ],
      include: [
        { model: admin, attributes: ['id', 'fullName'], as: 'adminData' },
        { model: SubScriptionEntity, attributes: ['id', 'mode'] },
        { model: PredictionEntity, attributes: ['id', 'categorizationTag'] },
        { model: InsuranceEntity, attributes: ['id', 'response'] },
      ],
    };
    const userInclude = {
      model: registeredUsers,
      attributes: ['id', 'phone', 'fullName'],
      where: whereName,
    };

    const include = [emiInclude, loanInclude, userInclude];
    const options: any = { where, order: [['id']], include };
    if ((query?.download ?? 'false') != 'true' && !skipPageLimit) {
      options.limit = pagesize;
      options.offset = offset;
    }
    return options;
  }
  //#endregion

  //#region find autoDebit Data
  private async findAutoDebitData(option) {
    const attribures = [
      'id',
      'paidAmount',
      'status',
      'source',
      'subSource',
      'type',
      'userId',
      'completionDate',
      'loanId',
      'emiId',
      'utr',
      'transactionId',
      'subscriptionDate',
      'response',
      'subStatus',
      'adminId',
    ];
    const result = await this.transactionRepo.getTableWhereDataWithCounts(
      attribures,
      option,
    );
    if (!result || result === k500Error) return kInternalError;
    const disbursementIdlist = [];
    for (let i = 0; i < result.rows.length; i++) {
      try {
        const data = result.rows[i];
        const disbursementId = data?.loanData?.loan_disbursement_id;
        if (disbursementId) disbursementIdlist.push(disbursementId);
      } catch (error) { }
    }
    const disbursementData = await this.disburesementRepo.getTableWhereData(
      ['id', 'amount', 'bank_name', 'ifsc', 'account_number'],
      { where: { id: disbursementIdlist } },
    );

    if (disbursementData != k500Error) {
      for (let i = 0; i < result.rows.length; i++) {
        try {
          const data = result.rows[i];
          const disbursementId = data.loanData.loan_disbursement_id;
          const find = disbursementData.find((f) => f.id == disbursementId);
          if (find) data.disbursementData = find;
        } catch (error) { }
      }
    }
    return result;
  }
  //#endregion

  //#region prePare data autoDebit Data
  async prepareData(tranData) {
    const finalData = [];
    for (let i = 0; i < tranData.length; i++) {
      try {
        const data = tranData[i];

        const tempData: any = {};
        const phone = this.cryptService.decryptPhone(data?.userData?.phone);
        const loanData = data?.loanData;

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
          ? this.typeService.getDateFormatted(policyExpiryDate)
          : '-';
        const disbursementData = data?.disbursementData;
        const response =
          this.commonSharedService.getFailedReason(data?.response) ?? '-';
        let failedReason = null;
        try {
          const temp = JSON.parse(data?.response);
          if (response.includes('Duplicate transaction'))
            failedReason = kNotPlaceAutoDebit;
          else failedReason = temp?.reason ?? temp?.internalNote;
        } catch (error) { }
        const isPaid = data?.status === 'COMPLETED';
        const amount = data?.paidAmount ?? 0;
        const emiDate = data?.emiData?.emi_date;
        const emi_date = emiDate
          ? this.typeService.getDateFormatted(emiDate)
          : '-';
        const emi_done = isPaid
          ? this.typeService.getDateFormatted(
            data?.completionDate ?? data?.emiData?.payment_done_date,
          )
          : '-';
        const response_date = data?.completionDate
          ? this.typeService.getDateFormatted(data?.completionDate)
          : '-';
        const disbursement_date = this.typeService.getDateFormatted(
          loanData?.loan_disbursement_date,
        );

        const type = data?.source === 'AUTOPAY' ? 'AUTODEBIT' : data?.subSource;
        const amountDesc = Math.floor((disbursementData?.amount ?? 0) / 100);
        const emiAmount = +(data?.emiData?.emi_amount ?? data?.paidAmount ?? 0);
        tempData['userId'] = data?.userId;
        tempData['Name'] = data?.userData?.fullName ?? '-';
        tempData['Mobile number'] = phone ?? '-';
        tempData['Loan ID'] = loanData?.id;
        tempData['EMI amount'] = emiAmount.toFixed(2);
        tempData['Placed amount'] = amount;
        tempData['EMI date'] = emi_date;
        tempData['Current balance'] =
          loanData?.currentAccountBalance != null
            ? +loanData?.currentAccountBalance
            : '-';
        tempData['Fetch time'] = fetchTime;
        tempData['EMI paid date'] = emi_done;
        tempData['Payment type'] = type;
        tempData['UTR'] = data?.utr ?? '-';
        tempData["Today's EMI status"] = failedReason
          ? kNotPlaceAutoDebit
          : data?.status;
        tempData['AD Response date'] = response_date;
        tempData['EMI type'] = data?.type ?? '-';
        tempData['Amount disbursed'] = amountDesc;
        tempData['Disbursement date'] = disbursement_date;
        tempData['Bank name'] = disbursementData?.bank_name ?? '-';
        tempData['IFSC'] = disbursementData?.ifsc ?? '-';
        tempData['Account number'] = disbursementData?.account_number ?? '-';
        tempData['E-Mandate type'] =
          loanData?.subscriptionData?.mode ?? 'SIGNDESK';
        tempData['Loan approved by'] =
          (
            await this.commonSharedService.getAdminData(
              loanData?.manualVerificationAcceptId,
            )
          )?.fullName ?? '-';
        tempData['AD Placed by'] =
          (await this.commonSharedService.getAdminData(data?.adminId))
            ?.fullName ?? '-';
        tempData['Insurance'] = loanData?.insuranceId ? 'Yes' : 'No';
        tempData['Insurance End Date'] = policy_expiry_date;
        tempData['Risk Category'] =
          loanData?.predictionData?.categorizationTag?.slice(0, -5) ?? '-';
        tempData['Autodebit response'] = response;
        tempData['Autodebit failed from'] = data?.subStatus ?? '-';
        tempData['Platform'] =
          loanData?.appType == 1
            ? EnvConfig.nbfc.nbfcShortName
            : process.env.APP_0;
        // Autodebit failure
        if ((tempData['UTR'] ?? '-') == '-')
          tempData["Today's EMI status"] = kNotPlaceAutoDebit;

        finalData.push(tempData);
      } catch (error) { }
    }
    return finalData;
  }
  //#endregion

  //#region  get all Contact Data
  async getAllContactData(query) {
    try {
      const att = [
        'id',
        'fullName',
        'totalContact',
        'contactRejectReason',
        'contactApproveBy',
        'quantity_status',
        'city',
        'createdAt',
      ];
      const options = this.prepareOptionsForContactData(query);
      if (options?.message) return options;
      const result = await this.userRepo.getTableWhereDataWithCounts(
        att,
        options,
      );
      if (!result || result == k500Error) return kInternalError;
      const finalData: any = this.preparDataForContectData(result.rows);
      if (finalData?.message) return finalData;
      return { count: result.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region pre pare Option of contect data
  private prepareOptionsForContactData(query) {
    try {
      const status = query?.status ?? '0';
      const searchText = query?.searchText ?? '';
      const download = query?.download;
      const page = query?.page ?? 1;
      const pagesize = query?.pagesize ?? PAGE_LIMIT;
      const offset = pagesize * (page - 1);
      const toDay = this.typeService.getGlobalDate(new Date());
      const userOptions: any = {
        where: { isBlacklist: '0' },
        order: [['createdAt', 'DESC']],
      };
      const include: any = [];
      if (status == '1' || status == '3')
        userOptions.where['quantity_status'] = { [Op.in]: ['1', '3'] };
      else if (status && status != '4') {
        if (status == '0') {
          userOptions.where['NextDateForApply'] = {
            [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
          };
          const selfieInclude = {
            model: UserSelfieEntity,
            attributes: [],
            where: { status: { [Op.or]: ['1', '3'] } },
          };
          include.push(selfieInclude);
        }
        userOptions.where['quantity_status'] = status;
      } else userOptions.where['quantity_status'] = { [Op.ne]: null };
      if (searchText) userOptions.where.fullName = { [Op.iRegexp]: searchText };
      if (status != '0' && download != 'true') {
        userOptions.offset = offset;
        userOptions.limit = +pagesize || PAGE_LIMIT;
      }
      userOptions.include = include;
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region pre pare condtect Data
  private preparDataForContectData(data) {
    const finalData = [];
    try {
      data.forEach((item) => {
        const tmpData: any = {};
        try {
          tmpData['userId'] = item?.id;
          tmpData['Name'] = item?.fullName;
          tmpData['Contacts'] = item?.totalContact;
          tmpData['City'] = item?.city;
          tmpData['Last action by'] =
            item.quantity_status == '1' ? 'system' : item?.contactApproveBy;
          tmpData['Status'] = item?.quantity_status;
          tmpData['Reject reason'] = item?.contactRejectReason;
          finalData.push(tmpData);
        } catch (error) { }
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getResidenceVerificationData(
    status: string,
    page: number,
    searchText: any,
    download = 'false',
  ) {
    try {
      const userOptions: any = await this.prepareResidenceVerificationOptions(
        status,
        page,
        searchText,
        download,
      );
      if (userOptions === k500Error) return k500Error;
      const userData = await this.findResidenceData(userOptions);
      if (!userData || userData == k500Error) return k500Error;
      const finalData = this.prepareResidenceVerificationData(userData.rows);
      if (!finalData || finalData === k500Error) return k500Error;
      let count = userData.count;
      if (status == '0') count = finalData.length;
      return { count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async findResidenceData(options) {
    try {
      const userAttr = [
        'id',
        'fullName',
        'phone',
        'createdAt',
        'homeStatus',
        'homeProofImage',
        'homeProofType',
        'NextDateForApply',
        'residenceProofApproveByName',
        'typeAddress',
        'residenceRejectReason',
        'pinAddress',
        'city',
        'homeType',
      ];
      return await this.userRepo.getTableWhereDataWithCounts(userAttr, options);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  prepareResidenceVerificationData(data) {
    try {
      const finalData = [];
      data.forEach((item) => {
        try {
          try {
            if (item?.addressData) {
              const addressData = item?.addressData.sort(
                (a, b) => b?.id - a?.id,
              );
              const eCommerceAdd = [];
              addressData.forEach((ele) => {
                try {
                  const find = eCommerceAdd.find((add) => add == ele?.address);
                  if (!find) eCommerceAdd.push(ele?.address);
                } catch (error) { }
              });
              item.eCommerceAddress = eCommerceAdd;
            }
          } catch (error) { }
          const tmpData: any = {};
          const verification = this.typeService.getVerificationLastData(
            item?.verificationTrackerData,
          );
          tmpData['Waiting time'] = verification?.waitingTime;
          tmpData['Difference in minutes'] = verification?.minutes;
          tmpData['Mobile number'] = this.cryptService.decryptPhone(
            item?.phone,
          );
          tmpData['Name'] = item?.fullName;
          tmpData['Salary'] = item?.employmentData?.salary ?? 0;
          tmpData['Type of document'] = item?.homeProofType;
          tmpData['Optional'] = item?.homeProofImage;
          tmpData['City'] = item?.city ?? '-';
          tmpData['Created at'] = item?.createdAt.toJSON().substring(0, 10);
          tmpData['Last action by'] = item?.residenceProofApproveByName ?? '-';
          tmpData['Status'] = item?.homeStatus;
          tmpData['userId'] = item?.id;
          tmpData['Type'] = item?.homeType;
          tmpData['Pin Address'] = item?.pinAddress ?? '-';
          tmpData['Type Address'] =
            this.typeService.getUserTypeAddress(item?.typeAddress) ?? '-';
          tmpData['E-commerce address'] = item?.eCommerceAddress ?? '-';
          tmpData['Reject reason'] = item?.residenceRejectReason ?? '-';

          const coolOfDate = item?.NextDateForApply;
          let canAdd = true;
          if (coolOfDate) {
            const todayTime = new Date().getTime();
            if (coolOfDate.getTime() > todayTime) canAdd = false;
          }
          if (canAdd) finalData.push(tmpData);
        } catch (error) { }
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async prepareResidenceVerificationOptions(
    status,
    page,
    searchText,
    download = 'false',
  ) {
    try {
      const empInclude: any = {
        model: employmentDetails,
        attributes: ['id', 'salary'],
      };
      const userOptions: any = {
        where: { isBlacklist: '0', homeProofImage: { [Op.ne]: null } },
        order: [['id']],
        include: [
          {
            required: false,
            model: AddressesEntity,
            attributes: ['id', 'address'],
            where: { status: '1', type: { [Op.notIn]: ['0', '1'] } },
          },
        ],
      };
      if (status == '0') {
        userOptions.where.kycId = { [Op.ne]: null };
        userOptions.where.homeStatus = status;
        empInclude.where = { companyVerification: { [Op.or]: ['1', '3'] } };
        const BankingInclude: any = { model: BankingEntity, attributes: [] };
        BankingInclude.where = { salaryVerification: { [Op.or]: ['1', '3'] } };
        const SalaryInclude: any = { model: SalarySlipEntity, attributes: [] };
        SalaryInclude.where = { status: { [Op.or]: ['1', '3'] } };
        const workMailInclude: any = { model: WorkMailEntity, attributes: [] };
        workMailInclude.where = {
          status: { [Op.ne]: '2' },
          tempStatus: { [Op.ne]: '2' },
        };
        empInclude.include = [BankingInclude, SalaryInclude, workMailInclude];
      } else if (status == '1' || status == '3')
        userOptions.where['homeStatus'] = { [Op.in]: ['1', '3'] };
      else if (status == '2') userOptions.where['homeStatus'] = status;
      userOptions.include.push(empInclude);
      if (status != '0' && download != 'true') {
        userOptions.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        userOptions.limit = PAGE_LIMIT;
      }
      if (searchText) {
        let encryptedData = '';
        if (!isNaN(searchText)) {
          encryptedData = await this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];
          userOptions.where = {
            ...userOptions.where,
            phone: { [Op.iRegexp]: encryptedData },
          };
        } else
          userOptions.where = {
            ...userOptions.where,
            fullName: { [Op.iRegexp]: searchText },
          };
      }
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion
  async migrateTransactionDate() {
    try {
      const tranactionData: any = await this.transactionRepo.getTableWhereData(
        ['id', 'transactionId', 'completionDate', 'createdAt'],
        {
          where: {
            [Op.or]: [{ subSource: 'AUTODEBIT' }, { source: 'AUTOPAY' }],
            subscriptionDate: { [Op.eq]: null },
          },
        },
      );

      if (tranactionData == k500Error || tranactionData.length == 0) return {};
      const regEx = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;
      const updateData: any = {};
      for (let i = 0; i < tranactionData.length; i++) {
        try {
          const tran: any = tranactionData[i];
          const transactionId = tran?.transactionId;
          let found = tran?.transactionId.search(regEx);
          const completionDate = tran?.completionDate;
          let subscriptionDate: any;
          if (found == -1) {
            if (completionDate)
              subscriptionDate = this.typeService.getGlobalDate(completionDate);
            else {
              let createdAt = new Date(tran.createdAt);
              createdAt.setDate(createdAt.getDate() + 1);
              subscriptionDate = this.typeService.getGlobalDate(createdAt);
            }
            await this.transactionRepo.updateRowData(
              {
                subscriptionDate: subscriptionDate.toJSON(),
              },
              tran.id,
              true,
            );
          }
          let subDate = transactionId.substr(found, 10);
          if (updateData[subDate]) updateData[subDate].push(tran.id);
          else updateData[subDate] = [tran.id];
        } catch (error) { }
      }
      for (const key in updateData) {
        try {
          let subDate = this.typeService.dateTimeToDate(key, 'YYYY-MM-DD');
          await this.transactionRepo.updateRowData(
            {
              subscriptionDate: subDate.toJSON(),
            },
            updateData[key],
            true,
          );
        } catch (error) { }
      }
    } catch (error) {
      return {};
    }
  }

  async funTestingTodayDebitApi(query) {
    try {
      const stDate = query?.start_date;
      const enDate = query?.end_date;
      const startDate = this.typeService.getGlobalDate(new Date(stDate));
      const endDate = this.typeService.getGlobalDate(new Date(enDate));
      const passData: any = {};
      for (let dt = startDate; dt <= endDate; dt.setDate(dt.getDate() + 1)) {
        try {
          const pass1 = { start_date: dt, end_date: dt, status: 6 };
          const pass2 = { start_date: dt, end_date: dt, status: 5 };
          const emiData: any = await this.getTodayAutoDebitData(pass1);
          const autoDebit: any = await this.getTodayAutoDebitData(pass2);
          const date = dt.toJSON();
          passData[date] = {
            emi: emiData.count,
            autoDebit: autoDebit.count,
            total: emiData.count + autoDebit.count,
          };
        } catch (error) { }
      }
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  //#region  todayAutoDebitCount
  async todayAutoDebitCount() {
    const data = {
      // successEMICount: 0,
      // failedEMICount: 0,
      // pendingEMICount: 0,
      // totalEMICount: 0,
      // totalEMIAmount: 0,
      successAutoDebitCount: 0,
      successAutoDebitAmount: 0,
      failedAutoDebitCount: 0,
      failedAutoDebitAmount: 0,
      pendingAutoDebitCount: 0,
      pendingAutoDebitAmount: 0,
      totalAutoDebitCount: 0,
      totalAutoDebitAmount: 0,
    };
    try {
      const crre = new Date();
      const date = this.typeService.getGlobalDate(crre).toJSON();
      const emiModel: any = {
        model: EmiEntity,
        attributes: [],
        where: { emi_date: date },
        required: true,
      };
      const options: any = {
        where: {
          [Op.and]: [
            {
              subscriptionDate: {
                [Op.eq]: Sequelize.col('"emiData"."emi_date"'),
              },
            },
            { subscriptionDate: date },
          ],
        },
        include: [emiModel],
        group: ['status'],
      };
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'amount'],
        [Sequelize.fn('COUNT', Sequelize.col('status')), 'COUNT'],
        'status',
      ];

      // today emi
      // const todayEMI = await this.transactionRepo.getTableWhereData(
      //   att,
      //   options,
      // );

      const where = {
        [Op.and]: [
          { subscriptionDate: date },
          {
            [Op.or]: {
              emiId: { [Op.eq]: null },
              subscriptionDate: {
                [Op.ne]: Sequelize.col('"emiData"."emi_date"'),
              },
            },
          },
        ],
      };
      options.where = where;
      emiModel.required = false;
      emiModel.where = {};
      options.include = [emiModel];
      const todayAuto = await this.transactionRepo.getTableWhereData(
        att,
        options,
      );

      // if (todayEMI != k500Error) {
      //   todayEMI.forEach((emi) => {
      //     if (emi.status === 'INITIALIZED') data.pendingEMICount = +emi.COUNT;
      //     else if (emi.status === 'COMPLETED')
      //       data.successEMICount = +emi.COUNT;
      //     else if (emi.status === 'FAILED') data.failedEMICount = +emi.COUNT;
      //     data.totalEMICount += +emi.COUNT;
      //     data.totalEMIAmount += Math.floor(+emi.amount);
      //   });
      // }

      if (todayAuto != k500Error) {
        todayAuto.forEach((emi) => {
          if (emi.status === 'INITIALIZED') {
            data.pendingAutoDebitCount = +emi.COUNT;
            data.pendingAutoDebitAmount = +emi.amount;
          } else if (emi.status === 'COMPLETED') {
            data.successAutoDebitCount = +emi.COUNT;
            data.successAutoDebitAmount = +emi.amount;
          } else if (emi.status === 'FAILED') {
            data.failedAutoDebitCount = +emi.COUNT;
            data.failedAutoDebitAmount = +emi.amount;
          }
          data.totalAutoDebitCount += +emi.COUNT;
          data.totalAutoDebitAmount += Math.floor(+emi.amount);
        });
      }
    } catch (error) { }
    return data;
  }
  //#endregion

  // dropDown list for user ContinueStage
  async dropDownContinueStage() {
    try {
      const allStages = [
        'REGISTRATION',
        'SELFIE',
        'KYC',
        'EMPLOYMENT',
        'BANKSTATEMENT',
        'FINALBUCKET',
        "LOAN_ACCEPT",
        'EMANDATE',
        'ESIGN',
      ];
      return allStages;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getVerificationTrackingData(query) {
    const userId = query.userId;
    const loanId = query?.loanId;
    if (!userId) return kParamsMissing;
    const result = await this.findUserDataForTracking(userId, loanId);
    if (result?.message) return result;
    let list = await this.prepareTrackingData(result);
    return list;
  }

  async findUserDataForTracking(userId, loanId) {
    // subscription table join
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
    // mandate model
    const mandateAtt = ['actual_status', 'updatedAt'];
    const mandateInclude = { model: mandateEntity, attributes: mandateAtt };
    // esign and disbursemenst model
    const edAtt = ['status', 'updatedAt'];
    const esignInclude = { model: esignEntity, attributes: edAtt };
    const disbursementInclude = {
      model: disbursementEntity,
      attributes: edAtt,
    };
    const bankingAtt = [
      'salaryVerification',
      'salaryVerificationDate',
      'adminId',
    ];
    const bankingInclude: any = {
      required: false,
      model: BankingEntity,
      attributes: bankingAtt,
    };
    // loan model
    const loanInc: any = [
      subscriptionInclude,
      mandateInclude,
      esignInclude,
      disbursementInclude,
      bankingInclude,
    ];
    const loanAtt = [
      'manualVerification',
      'id',
      'remark',
      'loanRejectReason',
      'manualVerificationAcceptId',
    ];
    const loanInclude: any = {
      required: false,
      model: loanTransaction,
      attributes: loanAtt,
      include: loanInc,
    };

    // Workmail table join
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
    // Salary slip table join
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

    // company details model
    const empAtt = ['companyVerification', 'rejectReason', 'createdAt'];
    const empInclude: any = {
      model: employmentDetails,
      required: false,
      attributes: empAtt,
    };
    const kycMo = {
      required: false,
      model: KYCEntity,
      attributes: ['id', 'panVerifiedAdmin', 'aadhaarVerifiedAdmin'],
    };
    const userAttributes = [
      'id',
      'fullName',
      'residenceAdminId',
      'contactApprovedId',
    ];
    const userInclude = {
      model: registeredUsers,
      attributes: userAttributes,
      include: [kycMo],
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
      'workMailAdminId',
      'salarySlipAdminId',
      'companyAdminId',
    ];
    const masterData = await this.masterRepo.getRowWhereData(
      attributes,
      masterOptions,
    );
    if (masterData == k500Error) return kInternalError;
    if (!masterData) return k422ErrorMessage(kNoDataFound);
    return masterData;
  }

  async prepareTrackingData(data) {
    const masterData = data;
    const userData = data.userData;
    const kycData = userData.kycData;
    // #01 -> Registration
    const registration = this.getRegistrationTracking(masterData);
    // #02 -> Aadhaar
    const aadhaarTracking = await this.getAadhaarTracking(masterData, kycData);
    // #03 -> Employment
    const employement = await this.getEmployementTracking(masterData);
    // #04 -> Banking
    const netBanking = await this.getNetbankingTracking(masterData);
    // #05 -> Residence
    const residence = await this.getResidenceTracking(masterData, userData);
    // #06 -> Contact
    const contactTracking = await this.getContactTracking(masterData, userData);
    // #07 -> Pan
    const panTracking = await this.getPanTracking(masterData, kycData);
    // #08 -> Final verification
    const finalVerification = await this.getFinalVerification(masterData);
    // #09 -> Emandate
    const emandateVerification = await this.getEmandateVerification(masterData);
    // #10 -> ESign
    const esingVerification = await this.getEsignVerification(masterData);
    // #11 -> Disbursement
    const disbursementTrack = await this.getDisburesementTracking(masterData);

    const trackingList = [
      registration,
      aadhaarTracking,
      employement,
      netBanking,
      residence,
      contactTracking,
      panTracking,
      finalVerification,
      emandateVerification,
      esingVerification,
      disbursementTrack,
    ];
    trackingList.sort((a, b) => a.orderBy - b.orderBy);
    return this.prepareNextUnderVerification(trackingList);
  }

  // #01 -> Registration
  private getRegistrationTracking(masterData) {
    let tracking: any = {};
    tracking.title = tRegistration;
    tracking.orderBy = 0;
    try {
      const statusData = masterData?.status;
      const dates = masterData?.dates;
      const email = statusData?.email ?? -1;
      const basic = statusData?.basic ?? -1;
      const phone = statusData?.phone ?? -1;
      let status =
        email == '1' && basic == '1' && phone == '1'
          ? '1'
          : email == '-1' || basic == '-1' || phone == '-1'
            ? '-1'
            : '0';
      tracking.approveBy = 'system';
      tracking.date = dates?.registration
        ? new Date(dates.registration).toJSON()
        : 0;

      if (status == '1') tracking.status = tSuccess;
      else if (status == '-1') tracking.status = tPending;
    } catch (error) { }
    return tracking;
  }

  // #02 -> Aadhaar
  private async getAadhaarTracking(masterData, kycData) {
    let tracking: any = {};
    tracking.title = tAadhaar;
    tracking.orderBy = 1;
    try {
      const statusData = masterData?.status ?? {};
      const aadhaar = statusData?.aadhaar ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const approvedStatus = [1, 3];

      const approvedBy =
        (
          await this.commonSharedService.getAdminData(
            kycData.aadhaarVerifiedAdmin,
          )
        )?.fullName ?? '';
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
    } catch (error) { }
    return tracking;
  }

  // #03 -> Employment
  private async getEmployementTracking(masterData) {
    let tracking: any = {};
    tracking.title = tEmployment;
    tracking.orderBy = 2;
    try {
      const statusData = masterData?.status ?? {};
      const company = statusData?.company ?? -1;
      const salarySlip = statusData?.salarySlip ?? -1;
      const workMail = statusData?.workMail ?? -1;
      const dates = masterData?.dates;
      const rejection = masterData?.rejection;
      const approvedStatus = [1, 3, 4];

      const status =
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
      tracking.message = '';
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

      const workMailAdminData = await this.commonSharedService.getAdminData(
        masterData.workMailData.approveById,
      );
      const salarySlipAdminData = await this.commonSharedService.getAdminData(
        masterData.salarySlipData.approveById,
      );
      if (salarySlipAdminData?.fullName != 'System')
        tracking.approveBy = salarySlipAdminData.fullName;
      else if (workMailAdminData?.fullName != 'System')
        tracking.approveBy = workMailAdminData.fullName;
      else {
        tracking.approveBy =
          salarySlipAdminData?.fullName ?? workMailAdminData?.fullName ?? '';
      }
    } catch (error) { }
    return tracking;
  }

  // #04 -> Banking
  private async getNetbankingTracking(masterData) {
    let tracking: any = {};
    tracking.title = tNetbanking;
    tracking.orderBy = 2;
    try {
      const statusData = masterData?.status ?? {};
      const rejection = masterData?.rejection;
      const loanData = masterData?.loanData;
      const bankingData = loanData?.bankingData;
      const bank = statusData?.bank ?? -1;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      const status = approvedStatus.includes(bank)
        ? '1'
        : bank == '2'
          ? '2'
          : bank == '-1'
            ? '-1'
            : '0';
      tracking.approveBy =
        (await this.commonSharedService.getAdminData(bankingData?.adminId))
          .fullName ?? '';
      tracking.date = dates?.banking ? new Date(dates?.banking).toJSON() : 0;
      if (status == '1') tracking.status = tSuccess;
      else if (status == '2') {
        tracking.status = tRejected;
        tracking.message = rejection?.banking ?? '';
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) { }
    return tracking;
  }

  // #05 -> Residence
  private async getResidenceTracking(masterData, userData) {
    let tracking: any = {};
    tracking.title = tResidence;
    tracking.orderBy = 3;
    try {
      const statusData = masterData?.status ?? {};
      const residence = statusData?.residence ?? -1;
      const rejection = masterData.rejection;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      const status = approvedStatus.includes(residence)
        ? '1'
        : residence == '2'
          ? '2'
          : residence == '-1'
            ? '-1'
            : '0';
      tracking.date = 0;
      tracking.approveBy =
        (
          await this.commonSharedService.getAdminData(
            userData?.residenceAdminId,
          )
        ).fullName ?? '';
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
    } catch (error) { }
    return tracking;
  }

  // #06 -> Contact
  private async getContactTracking(masterData, userData) {
    let tracking: any = {};
    tracking.title = tContact;
    tracking.orderBy = 4;
    try {
      const statusData = masterData?.status ?? {};
      const contact = statusData?.contact ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const approvedStatus = [1, 3];
      const approvedBy =
        (
          await this.commonSharedService.getAdminData(
            userData?.contactApprovedId,
          )
        )?.fullName ?? '';
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
    } catch (error) { }
    return tracking;
  }

  // #07 -> Pan
  private async getPanTracking(masterData, kycData) {
    let tracking: any = {};
    tracking.title = tPan;
    tracking.orderBy = 5;
    try {
      const statusData = masterData?.status ?? {};
      const pan = statusData?.pan ?? -1;
      const dates = masterData.dates;
      const rejection = masterData.rejection;
      const approvedStatus = [1, 3];
      const approvedBy =
        (await this.commonSharedService.getAdminData(kycData?.panVerifiedAdmin))
          ?.fullName ?? '';
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
    } catch (error) { }
    return tracking;
  }

  // #08 -> Final verification
  private async getFinalVerification(masterData) {
    let tracking: any = {};
    tracking.title = tApproval;
    tracking.orderBy = 6;
    try {
      const statusData = masterData?.status ?? {};
      const loan = statusData?.loan ?? -1;
      const eligibility = statusData?.eligibility ?? -1;
      const rejection = masterData.rejection;
      const loanData = masterData?.loanData;
      const dates = masterData.dates;
      const approvedStatus = [1, 3];
      tracking.approveBy =
        (
          await this.commonSharedService.getAdminData(
            loanData.manualVerificationAcceptId,
          )
        )?.fullName ?? '';
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
        tracking.message = rejection?.eligiblity ?? rejection?.loan;
      } else if (status == '-1') tracking.status = tPending;
      else tracking.status = tInProgress;
    } catch (error) { }
    return tracking;
  }

  // #09 -> Emandate
  private async getEmandateVerification(masterData) {
    let tracking: any = {};
    tracking.title = tEMandate;
    tracking.orderBy = 7;
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
    } catch (error) { }
    return tracking;
  }

  // #10 -> Esign
  private async getEsignVerification(masterData) {
    let tracking: any = {};
    tracking.title = tESign;
    tracking.orderBy = 8;
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
    } catch (error) { }
    return tracking;
  }

  // #11 -> Disbursement
  private async getDisburesementTracking(masterData) {
    let tracking: any = {};
    tracking.title = tDisbursement;
    tracking.orderBy = 9;
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
    } catch (error) { }
    return tracking;
  }

  prepareNextUnderVerification(trackingData) {
    try {
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
        } catch (error) { }
      }
      return finalTrack;
    } catch (error) {
      return trackingData;
    }
  }

  async getAllUserData(query) {
    try {
      const searchText = query?.searchText ?? '';
      const page = query?.page ?? 1;
      const loanGoldCount = query?.getLoanGoldCount ?? false;
      const getNBFCCount = query?.getNBFCCount ?? false;
      let continueStage = query?.continueStage ?? 'all';
      const isBlacklist = query?.isBlacklist ?? undefined;
      const isInterestedInGold = query?.isInterestedInGold ?? undefined;
      const isInterestedInLoan = query?.isInterestedInLoan ?? undefined;
      const isNotRegistered = query?.isNotRegistered ?? undefined;
      const download = query?.download ?? false;
      const isNotification = query?.isNotification ?? false;
      const isCall = query?.isCall ?? false
      let startDate = query?.start_date;
      let endDate = query?.end_date;
      if (startDate)
        startDate = this.typeService.getGlobalDate(new Date(startDate));
      if (endDate) endDate = this.typeService.getGlobalDate(new Date(endDate));
      let searchWhere: any = {};
      let order = [['createdAt', 'DESC']];
      let encryptedData;
      const dataDifference = await this.typeService.dateDifference(
        endDate,
        startDate,
      );
      if (searchText) {
        order = [
          ['kycId', 'ASC'],
          ['createdAt', 'DESC'],
        ];
        // check if text is mobile number
        if (!isNaN(searchText)) {
          encryptedData = await this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];
        }
        if (encryptedData) {
          searchWhere = {
            phone: { [Op.like]: '%' + encryptedData + '%' },
          };
        } else {
          searchWhere = {
            fullName: { [Op.iRegexp]: searchText },
            city: { [Op.iRegexp]: searchText },
            email: { [Op.iRegexp]: searchText },
          };
        }
      }
      if (Object.keys(searchWhere).length > 0)
        searchWhere = { [Op.or]: searchWhere };
      if (isBlacklist) searchWhere.isBlacklist = isBlacklist;
      if (isInterestedInGold)
        searchWhere.isInterestedInGold = isInterestedInGold;
      if (isInterestedInLoan)
        searchWhere.isInterestedInLoan = isInterestedInLoan;
      if (startDate && endDate) {
        if (dataDifference > DAY_LIMIT)
          return k422ErrorMessage(kDateRangeLimit);
        const getRange = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        searchWhere.createdAt = {
          [Op.gte]: getRange.fromDate,
          [Op.lte]: getRange.endDate,
        };
      }
      searchWhere.stage = this.getContinueStageFilter(continueStage);
      if (searchWhere.stage == -1) delete searchWhere.stage;
      const userOptions: any = {
        where: searchWhere,
        order,
      };
      if (download !== 'true' && isNotification !== 'true' && isCall != 'true') {
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        userOptions.offset = offset;
        userOptions.limit = 1 * PAGE_LIMIT;
      }

      const userAttr = [
        'id',
        'phone',
        'fullName',
        'NextDateForApply',
        'gender',
        'email',
        'createdAt',
        'isBlacklist',
        'city',
        'homeStatus',
        'selfieId',
        'kycId',
        'isInterestedInLoan',
        'isInterestedInGold',
        'stage',
        'appType',
        'fcmToken',
        'isUnInstallApp',
        'salaryMode',
        'isSalaried',
        'lastCrm',
      ];
      const masterInclude: any = {
        model: MasterEntity,
        attributes: ['otherInfo', 'status'],
      };
      if (isNotRegistered == '1') {
        masterInclude.where = {
          'status.phone': {
            [Op.ne]: 1,
          },
        };
      }
      userOptions.include = masterInclude;
      const userData = await this.userRepo.getTableWhereDataWithCounts(
        userAttr,
        userOptions,
      );
      if (userData == k500Error) return kInternalError;
      // get list of user ids
      const userIds = userData.rows.map((user) => user?.id);
      // get salary of all users
      userData.rows = await this.addAllUserSalaryData(userData.rows, userIds);
      userData.rows = await this.cryptService.decryptUseresData(userData.rows);
      // adding isRegistered using kycId and structuring data
      const preparedRows = this.getPreparedData(userData.rows, download);
      // if isBlacklist is 1 then get block reason
      if (isBlacklist === '1') {
        userData.rows = await this.getAllUserLastBlockData(
          preparedRows,
          userIds,
        );
      } else if (isNotRegistered == '1') {
        userData.rows = await this.prepareNotRegisteredUserData(userData.rows);
      } else userData.rows = preparedRows;
      // sort registered users first
      userData.rows.sort((a, b) => b.Registered - a.Registered);
      if (userData.rows == k500Error) return kInternalError;
      if (loanGoldCount == 'true') {
        // get user count who are interested in loan and gold
        if (isNotRegistered == '1') {
          const countLoanGoldNotRegisteredUsers =
            await this.getNotRegisteredLoanAndGoldCount();
          userData.loan = countLoanGoldNotRegisteredUsers.loan;
          userData.gold = countLoanGoldNotRegisteredUsers.gold;
        } else {
          const countLoanGold = await this.getLoanAndGoldCount();
          userData.loan = countLoanGold.loan;
          userData.gold = countLoanGold.gold;
        }
      }

      if (getNBFCCount == 'true') {
        const getNBFCCountData = await this.getNBFCCount(searchWhere.createdAt);
        userData.NonNBFC = getNBFCCountData.NonNBFC;
        userData.NBFC = getNBFCCountData.NBFC;
      }
      if (query?.download === 'true') {
        const rawExcelData = {
          sheets: ['non-registered-users'],
          data: [userData.rows],
          sheetName: 'Non_registered_users.xlsx',
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );
        if (excelResponse?.message) return excelResponse;

        const fileURL = await this.fileService.uploadFile(
          excelResponse?.filePath,
          'non-registered-users',
          'xlsx',
        );
        if (fileURL.message) return fileURL;
        return { fileURL };
      }
      if (isCall == 'true' && isCall) {
        const targetList = userData?.rows.map(user => {
          return {
            userId: user["User Id"],
            phone: user["Mobile number"]
          }
        })
        if(continueStage=='all') return {} 
        const callData = { category: continueStage, adminId: query.adminId, targetList };
        const placeCall = await this.callingService.placeCall(callData);
        return placeCall
      }
      return userData;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region
  private getContinueStageFilter(stage) {
    try {
      switch (stage) {
        case 'REGISTRATION':
          return UserStage.BASIC_DETAILS;
        case 'SELFIE':
          return UserStage.SELFIE;
        case 'KYC':
          return [UserStage.AADHAAR, UserStage.PAN];
        case 'EMPLOYMENT':
          return UserStage.EMPLOYMENT;
        case 'BANKSTATEMENT':
          return UserStage.BANKING;
        case 'RESIDENCE':
          return UserStage.RESIDENCE;
        case 'REFERENCE':
          return UserStage.CONTACT;
        case 'FINALBUCKET':
          return UserStage.FINAL_VERIFICATION;
          case 'LOAN_ACCEPT':
          return UserStage.LOAN_ACCEPT;
        case 'EMANDATE':
          return UserStage.MANDATE;
        case 'ESIGN':
          return UserStage.ESIGN;
        default:
          return -1;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region get prepared data for allUserData
  private getPreparedData(userArr, download: any = false) {
    const preparedRows = [];
    for (let i = 0; i < userArr?.length; i++) {
      const item = userArr[i];
      const masterData = item?.masterData;
      const lastCrm = item?.lastCrm;

      // prepare table wise data
      const preparedObj = {
        'User Id': item?.id ?? '-',
        'Mobile number': item?.phone ?? '-',
        Name: item?.fullName ?? '-',
        'Next eligible date': item?.NextDateForApply
          ? this.typeService.getDateFormatted(item?.NextDateForApply)
          : '-',
        'Number Verified': item?.masterData?.status?.phone == 1 ? 'Yes' : 'No',
        'App platform':
          item?.appType == 1
            ? EnvConfig.nbfc.nbfcShortName
            : EnvConfig.nbfc.appName,
        SelfieId: item?.selfieId ?? '-',
        Gender: item?.gender ?? '-',
        Salary: item?.masterData?.otherInfo?.salaryInfo ?? '0',
        Email: item?.email ?? '-',
        kycId: item?.kycId ?? '-',
        City: item?.city ?? '-',
        'Employment information':
          masterData?.otherInfo?.employmentInfo === ''
            ? '-'
            : masterData?.otherInfo?.employmentInfo ?? '-',
        'Register date':
          download == 'true'
            ? new Date(item?.createdAt).toJSON().substring(0, 10)
            : item?.createdAt ?? '-',
        'Black list': item?.isBlacklist === '1' ? 'Blocked' : 'Active',
        isInterestedInGold: item?.isInterestedInGold ?? '-',
        isInterestedInLoan: item?.isInterestedInLoan ?? '-',
        Stage: this.getUserStage(item?.stage ?? '-'),
        'Last CRM by': lastCrm?.adminName ?? '-',
        'Last CRM remark': lastCrm?.remark ?? '-',
        'App Install': item?.fcmToken
          ? item?.isUnInstallApp
            ? 'No'
            : 'Yes'
          : '-',
        'Uninstall date': item?.fcmToken
          ? item?.isUnInstallApp
            ? this.typeService.getDateFormatted(item?.isUnInstallApp)
            : '-'
          : '-',
        'Salary mode':
          item?.salaryMode == '1'
            ? 'NEFT'
            : item?.salaryMode == '2'
              ? 'IMPS'
              : item?.salaryMode == '3'
                ? 'CASH'
                : '-',
        'Salaried status': item?.isSalaried == '1' ? 'Yes' : 'No',
        appType: item?.appType,
      };
      preparedRows.push(preparedObj);
    }
    return preparedRows;
  }

  private prepareNotRegisteredUserData(userArr) {
    try {
      const preparedRows = [];
      for (let i = 0; i < userArr?.length; i++) {
        const item = userArr[i];
        // prepare table wise data
        const preparedObj = {
          'User Id': item?.id ?? '-',
          'Mobile number': item?.phone ?? '-',
          'App platform':
            item?.appType == 1
              ? EnvConfig.nbfc.nbfcShortName
              : EnvConfig.nbfc.appName,
          Salary: item?.masterData?.otherInfo?.salaryInfo ?? '0',
          'Register date': item?.createdAt ?? '-',
          'App Install': item?.fcmToken
            ? item?.isUnInstallApp
              ? 'No'
              : 'Yes'
            : '-',
          'Uninstall date': item?.fcmToken
            ? item?.isUnInstallApp
              ? this.typeService.getDateFormatted(item?.isUnInstallApp)
              : '-'
            : '-',
          'Salary mode':
            item?.salaryMode == '1'
              ? 'NEFT'
              : item?.salaryMode == '2'
                ? 'IMPS'
                : item?.salaryMode == '3'
                  ? 'CASH'
                  : '-',
          'Salaried status': item?.isSalaried == '1' ? 'Yes' : 'No',
        };
        preparedRows.push(preparedObj);
      }
      return preparedRows;
    } catch (e) {
      return [];
    }
  }

  //#region getUserStage by stage id
  private getUserStage(stage) {
    switch (stage) {
      case UserStage.PHONE_VERIFICATION:
        return 'PHONE_VERIFICATION';
      case UserStage.BASIC_DETAILS:
        return 'BASIC_DETAILS';
      case UserStage.SELFIE:
        return 'SELFIE';
      case UserStage.NOT_ELIGIBLE:
        return 'NOT_ELIGIBLE';
      case UserStage.PIN:
        return 'PIN';
      case UserStage.AADHAAR:
        return 'AADHAAR';
      case UserStage.EMPLOYMENT:
        return 'EMPLOYMENT';
      case UserStage.BANKING:
        return 'BANKING';
      case UserStage.RESIDENCE:
        return 'RESIDENCE';
      case UserStage.LOAN_ACCEPT:
        return 'LOAN_ACCEPT';
      case UserStage.CONTACT:
        return 'CONTACT';
      case UserStage.PAN:
        return 'PAN';
      case UserStage.FINAL_VERIFICATION:
        return 'FINAL_VERIFICATION';
      case UserStage.MANDATE:
        return 'MANDATE';
      case UserStage.ESIGN:
        return 'ESIGN';
      case UserStage.DISBURSEMENT:
        return 'DISBURSEMENT';
      case UserStage.REPAYMENT:
        return 'REPAYMENT';
      case UserStage.DEFAULTER:
        return 'DEFAULTER';
      case UserStage.EXPRESS_REAPPLY:
        return 'EXPRESS REAPPLY';
      case UserStage.REAPPLY:
        return 'REAPPLY';
      default:
        return '-';
    }
  }

  //#region add salary to all users
  private async addAllUserSalaryData(userArr, userIds) {
    try {
      if (userIds.length > 0) {
        const salaryAttrs = ['id', 'userId', 'salary'];
        const salaryOpts = { where: { userId: userIds } };
        const salaryData = await this.employmentRepo.getTableWhereData(
          salaryAttrs,
          salaryOpts,
        );
        if (salaryData === k500Error) return userArr;
        for (let i = 0; i < userArr?.length; i++) {
          const find = salaryData.find((data) => data.userId === userArr[i].id);
          if (find) userArr[i].salary = find?.salary;
        }
      }
    } catch (e) { }
    return userArr;
  }

  //#region get user count interested in loan and gold
  private async getLoanAndGoldCount() {
    const data = { loan: 0, gold: 0 };
    try {
      const loan = this.userRepo.getCountsWhere({
        where: { isInterestedInLoan: true },
      });
      const gold = this.userRepo.getCountsWhere({
        where: { isInterestedInGold: true },
      });
      const [loanCount, goldCount] = await Promise.all([loan, gold]);
      if (loanCount !== k500Error) data.loan = loanCount;
      if (goldCount !== k500Error) data.gold = goldCount;
    } catch (e) { }
    return data;
  }

  private async getNotRegisteredLoanAndGoldCount() {
    const data = { loan: 0, gold: 0 };
    try {
      const masterInclude = [
        {
          model: MasterEntity,
          attributes: ['status'],
          where: { 'status.phone': { [Op.ne]: 1 } },
        },
      ];
      const loan = this.userRepo.getCountsWhere({
        include: masterInclude,
        where: { isInterestedInLoan: true },
      });
      const gold = this.userRepo.getCountsWhere({
        include: masterInclude,
        where: { isInterestedInGold: true },
      });
      const [loanCount, goldCount] = await Promise.all([loan, gold]);
      if (loanCount !== k500Error) data.loan = loanCount;
      if (goldCount !== k500Error) data.gold = goldCount;
    } catch (e) { }
    return data;
  }

  private async getNBFCCount(searchWhere) {
    const data = { NonNBFC: 0, NBFC: 0 };
    try {
      const masterInclude = [
        {
          model: MasterEntity,
          attributes: ['status'],
          where: { 'status.phone': { [Op.ne]: 1 } },
        },
      ];
      const nonNBFC = this.userRepo.getCountsWhere({
        include: masterInclude,
        where: {
          appType: 0,
          ...(searchWhere !== undefined ? { createdAt: searchWhere } : {}),
        },
      });
      const NBFC = this.userRepo.getCountsWhere({
        include: masterInclude,
        where: {
          appType: 1,
          ...(searchWhere !== undefined ? { createdAt: searchWhere } : {}),
        },
      });
      const [NonNBFCCount, NBFCcount] = await Promise.all([nonNBFC, NBFC]);
      if (NonNBFCCount !== k500Error) data.NonNBFC = NonNBFCCount;
      if (NBFCcount !== k500Error) data.NBFC = NBFCcount;
      return data;
    } catch (error) { }
  }

  //#region add all user last block data for getAllUserData by userData
  private async getAllUserLastBlockData(userArr, userIds) {
    try {
      const allUserLastBlock = await this.getLastUserBlockData(userIds);
      for (let i = 0; i < userArr.length; i++) {
        // if user block data found

        const userLastBlockData = allUserLastBlock.find(
          (block) => block?.userId === userArr[i]?.id,
        );
        if (userLastBlockData) {
          userArr[i]['Last updated by'] = userLastBlockData?.approveBy;
          userArr[i]['Last updated'] = this.typeService.getDateFormatted(
            userLastBlockData?.updatedAt,
          );
          userArr[i]['User block reason'] = userLastBlockData?.reason;
        }
      }
      return userArr;
    } catch (e) {
      return k500Error;
    }
  }

  //#region get last user block data
  private async getLastUserBlockData(userId) {
    try {
      const attributes: any = [
        'id',
        'userId',
        'reason',
        'approveBy',
        'updatedAt',
      ];
      const options = {
        where: {
          userId,
          isBlacklist: '1',
        },
        order: [['id', 'desc']],
      };
      const lastUserBlockData = await this.blockUserRepo.getTableWhereData(
        attributes,
        options,
      );
      return lastUserBlockData;
    } catch (e) {
      return k500Error;
    }
  }
  //#endregion

  //#region get user selfie image by userId
  async getUserSelfie(query) {
    try {
      const id = query?.id;
      if (!id) return kParamsMissing;
      const attributes = ['id', 'userId', 'image'];
      const options = { where: { id } };
      return await this.userSelfieRepo.getRowWhereData(attributes, options);
    } catch (e) {
      return k500Error;
    }
  }
  //#region master search
  async findAllUsers(query: any) {
    try {
      let searchText = query?.searchText ?? '';
      if (searchText.length < 3) return [];
      if (searchText.includes('+')) {
        searchText = searchText.replace(/\+/g, '');
        searchText = searchText.trim();
      }
      const filterBy = (query?.filterBy ?? 'All').toLowerCase();
      // user attributes
      const attributes = ['id', 'fullName', 'phone', 'email', 'loanStatus'];
      let result;
      let encryptedData = '';
      let where: any = {};
      if (!searchText) return [];

      // check first two letter (if 'l-' check loan-id)
      const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
      const restOfString = searchText.substring(2);

      /// find with loan
      if (firstTwoLetters === 'l-') {
        const userInclude: any = { model: registeredUsers, attributes };
        const options = { include: [userInclude], where: { id: restOfString } };
        const result = await this.loanRepo.getRowWhereData(['userId'], options);
        if (!result || result === k500Error) return [];
        // decrypt phone before sending in response
        const phone = this.cryptService.decryptPhone(
          result?.registeredUsers?.phone,
        );
        return [{ ...result?.registeredUsers, phone }];
      } else {
        const isValidPAN =
          regPanCard(searchText) || regPanCard(searchText?.toUpperCase());
        // if search text is a mobile number
        if (!isNaN(searchText)) {
          encryptedData = await this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];

          if (encryptedData)
            where = {
              phone: {
                [Op.like]: encryptedData ? '%' + encryptedData + '%' : null,
              },
            };
        } else if (searchText.includes('@'))
          where = { email: { [Op.iRegexp]: searchText } };
        else if (isValidPAN) {
          searchText = searchText?.toUpperCase();
          const maskedPan =
            searchText.substring(0, 2) +
            'xxx' +
            searchText[5] +
            'xx' +
            searchText.substring(8, 10);
          const options = {
            where: {
              maskedPan: { [Op.like]: maskedPan },
            },
          };
          const result = await this.kycRepo.getTableWhereData(['id'], options);
          const kycIds = [];
          result.forEach((kyc) => {
            kycIds.push(kyc.id);
          });
          const attr = ['userId', 'panCardNumber'];
          const option = { where: { id: { [Op.in]: kycIds } } };
          const encryptedPanDetails = await this.kycRepo.getTableWhereData(
            attr,
            option,
          );
          let userId = [];
          encryptedPanDetails.forEach((pan) => {
            if (pan.panCardNumber == searchText) {
              userId.push(pan.userId);
            }
          });
          where = { id: { [Op.in]: userId } };
        } else where = { fullName: { [Op.iRegexp]: searchText } };

        const order =
          filterBy == 'defaulter'
            ? [['loanStatus', 'DESC']]
            : [['loanStatus'], ['updatedAt', 'desc']];
        result = await this.userRepo.getTableWhereData(attributes, {
          where,
          order,
        });
        result = await this.cryptService.decryptUseresData(result);
        return result;
      }
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region updated Master search
  async findAllUpdatedUsers(query: any) {
    try {
      let searchText = query?.searchText ?? '';
      if (searchText.length < 3) return [];

      if (searchText.includes('+')) {
        searchText = searchText.replace(/\+/g, '').trim();
      }

      const filterBy = (query?.filterBy ?? 'All').toLowerCase();
      const searchType = this.determineSearchType(searchText);
      const replacements = await this.buildReplacements(searchText, searchType);
      if (replacements === k500Error) return replacements;

      replacements.filterBy = filterBy;

      const rawQuery = this.buildQuery(searchType);

      let result = await this.repoManager.injectRawQuery(
        registeredUsers,
        rawQuery,
        { replacements, source: 'REPLICA' },
      );
      if (result === k500Error) return result;
      result = await this.cryptService.decryptUseresData(result);
      return result;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  private determineSearchType(searchText: any): string {
    if (searchText?.startsWith('l-')) return 'loanId';
    if (searchText?.startsWith('L-')) return 'loanId';
    if (!isNaN(searchText)) return 'phone';
    if (searchText.includes('@')) return 'email';
    if (regPanCard(searchText) || regPanCard(searchText.toUpperCase()))
      return 'pan';
    return 'fullName';
  }

  private async buildReplacements(
    searchText: string,
    searchType: string,
  ): Promise<any> {
    let replacements: any = { searchText };
    if (searchType === 'loanId') {
      replacements.restOfString = searchText.substring(2);
    } else if (searchType === 'phone') {
      let encryptedPhone = await this.cryptService.encryptPhone(searchText);
      replacements.encryptedPhone = encryptedPhone.split('===')[1];
    } else if (searchType === 'pan') {
      searchText = searchText.toUpperCase();
      replacements.maskedPan =
        searchText.substring(0, 2) +
        'xxx' +
        searchText[5] +
        'xx' +
        searchText.substring(8, 10);

      // Step 1: Get matching IDs based on maskedPan
      const kycResults = await this.kycRepo.getTableWhereData(['id'], {
        where: { maskedPan: { [Op.like]: replacements.maskedPan } },
      });
      if (kycResults === k500Error) return kycResults;

      const kycIds = kycResults.map((kyc) => kyc.id);

      if (kycIds.length > 0) {
        // Step 2: Decrypt panCardNumber and match with search text
        const panResults = await this.kycRepo.getTableWhereData(
          ['userId', 'panCardNumber'],
          { where: { id: { [Op.in]: kycIds } } },
        );
        if (panResults === k500Error) return panResults;
        replacements.userIdFromPan = panResults
          .filter((pan) => pan.panCardNumber === searchText)
          .map((pan) => pan.userId);
      }
    }
    return replacements;
  }

  private buildQuery(searchType: string): string {
    return `
      WITH search_results AS (
        ${this.getSearchQuery(searchType)}
      )
      SELECT * FROM search_results
      ORDER BY
        CASE 
          WHEN :filterBy = 'defaulter' THEN "loanStatus"
          ELSE NULL
        END DESC,
        CASE 
          WHEN :filterBy != 'defaulter' THEN "loanStatus"
          ELSE NULL
        END,
        CASE 
          WHEN :filterBy != 'defaulter' THEN "updatedAt"
          ELSE NULL
        END DESC
      LIMIT 50;
    `;
  }

  private getSearchQuery(searchType: string): string {
    switch (searchType) {
      case 'loanId':
        return `
          SELECT u.id, u."fullName", u.phone, u.email, u."loanStatus", u."updatedAt"
          FROM "loanTransactions" AS lt
          JOIN "registeredUsers" AS u ON u.id = lt."userId"
          WHERE lt.id = :restOfString
        `;
      case 'phone':
        return `
          SELECT u.id, u."fullName", u.phone, u.email, u."loanStatus", u."updatedAt"
          FROM "registeredUsers" AS u
          WHERE u.phone LIKE '%' || :encryptedPhone || '%'
        `;
      case 'email':
        return `
          SELECT u.id, u."fullName", u.phone, u.email, u."loanStatus", u."updatedAt"
          FROM "registeredUsers" AS u
          WHERE u.email ~* :searchText
        `;
      case 'pan':
        return `
          SELECT u.id, u."fullName", u.phone, u.email, u."loanStatus", u."updatedAt"
          FROM "registeredUsers" AS u
          WHERE u.id IN (:userIdFromPan)
        `;
      case 'fullName':
      default:
        return `
          SELECT u.id, u."fullName", u.phone, u.email, u."loanStatus", u."updatedAt"
          FROM "registeredUsers" AS u
          WHERE u."fullName" ~* :searchText
        `;
    }
  }

  // get collection admin's collection amount
  async getCollectionAmount(query) {
    try {
      const sDate = query?.startDate ?? new Date();
      const eDate = query?.endDate ?? new Date();
      const range = this.typeService.getUTCDateRange(sDate, eDate);
      const followerId = query?.adminId;
      const options: any = {
        where: {
          status: 'COMPLETED',
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        },
      };
      if (followerId) options.where.followerId = followerId;
      const attributes: any = [
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'totalAmount'],
      ];
      const amount = await this.transactionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (amount === k500Error) return kInternalError;
      const totalAmount = +(amount?.totalAmount ?? 0).toFixed(2);
      return { totalAmount };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#regionn referral user data
  async getRegisteredUserData() {
    try {
      const attributes: any = [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'referralUser'],
        [Sequelize.fn('SUM', Sequelize.col('points')), 'referralAmount'],
      ];
      const referralData = await this.referralRepo.getRowWhereData(attributes, {
        where: { points: { [Op.gt]: 0 } },
      });
      if (referralData === k500Error) return kInternalError;
      return referralData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get graph data
  async getDashboardGraphData(query) {
    try {
      const subType = query?.subType;

      // for today repayment graph data
      if (
        ['Y', 'M', 'D', 'W', 'MAX', 'Q1', 'Q2', 'Q3', 'Q4', 'FYTD'].includes(
          subType,
        )
      ) {
        return await this.getLDInsideGraphData(subType);
      } else {
        let today = moment();
        let startDate = this.typeService.getGlobalDate(today.toDate());
        let endDate = this.typeService.getGlobalDate(today.toDate());
        const data = {
          loanDisburseGraphData: {},
          toDayLoanDisburseGraphData: {},
          repaymentGraphData: {},
          partPaymentGraphData: {},
          repaidAmountGraphData: {},
        };

        // for today loan disburse graph data
        const LDTodayGraphData = this.getToDayLDGraphData(startDate, endDate);

        // for today repayment graph data
        const repaymentGraphData = this.getRepaymentGraphData(
          startDate,
          endDate,
        );

        // for today part payment graph data
        const partPaymentGraphData = this.getPartPayGraphData(
          startDate,
          endDate,
        );

        // for loan disbursh graph data
        const loanDisburseGraphData = this.getLoanDisburshGraphData();

        // for repaid amount graph data
        const repaidAmountGraphData = this.getRepaidAmountGraphData();

        const [
          loanDisburhData,
          toDayLDData,
          repaymentData,
          partPayment,
          repaidAmount,
        ]: any = await Promise.all([
          loanDisburseGraphData,
          LDTodayGraphData,
          repaymentGraphData,
          partPaymentGraphData,
          repaidAmountGraphData,
        ]);

        if (loanDisburhData !== k500Error)
          data.loanDisburseGraphData = loanDisburhData;
        if (toDayLDData !== k500Error)
          data.toDayLoanDisburseGraphData = toDayLDData;
        if (repaymentData !== k500Error)
          data.repaymentGraphData = repaymentData;
        if (partPayment !== k500Error) data.partPaymentGraphData = partPayment;
        if (repaidAmount !== k500Error)
          data.repaidAmountGraphData = repaidAmount;
        return data;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getLDInsideGraphData(subType) {
    try {
      let today = moment();
      let startDate;
      let endDate;

      let yesterdayDate = this.typeService.getGlobalDate(
        moment(today).subtract(1, 'day').toDate(),
      );

      let finalData;
      if (subType == 'W') {
        // for week data of loan disburse
        let lastWeekSD = this.typeService.getGlobalDate(
          moment(yesterdayDate).subtract(6, 'days').toDate(),
        );
        startDate = lastWeekSD;
        endDate = yesterdayDate;
        finalData = await this.getDisbursData(startDate, endDate);
      } else if (subType == 'M') {
        // for month data of loan disburse
        let lastMonthSD = this.typeService.getGlobalDate(
          moment(yesterdayDate).subtract(30, 'days').toDate(),
        );
        startDate = lastMonthSD;
        endDate = yesterdayDate;
        finalData = await this.getDisbursData(startDate, endDate);
      } else if (subType == 'D') {
        // for today data of loan disburse
        startDate = this.typeService.getGlobalDate(today.toDate());
        endDate = this.typeService.getGlobalDate(today.toDate());
        finalData = await this.getToDayLDGraphData(startDate, endDate);
      } else if (subType == 'MAX') {
        startDate = moment('2021-01-01T10:00:00.000Z');
        startDate = this.typeService.getGlobalDate(startDate.toDate());
        endDate = this.typeService.getGlobalDate(today.toDate());
        finalData = await this.getAllDisburshData(startDate, endDate);
      } else if (subType == 'Y') {
        let lastMonthSD = this.typeService.getGlobalDate(
          moment(today).subtract(365, 'days').toDate(),
        );
        startDate = lastMonthSD;
        endDate = this.typeService.getGlobalDate(today.toDate());
        finalData = await this.getAllDisburshData(startDate, endDate, true);
      } else if (['Q1', 'Q2', 'Q3', 'Q4'].includes(subType)) {
        // get quaterly  data of loan disburse
        finalData = await this.getQuarterlyWiseData(subType);
      } else if (subType == 'FYTD') {
        // get Fiscal Year to Date(Starting from April)  data of loan disburse
        finalData = await this.getFYTDData();
      }
      return finalData;
    } catch (error) { }
  }

  private async getAllDisburshData(startDate, endDate, LAST_ONE_YAER = false) {
    try {
      const sqlQuery = `SELECT DATE_TRUNC('month',CAST("loan_disbursement_date" AS DATE)) AS date,
      count(loan.id) as count  , sum(disburse."amount")  as amount ,
      COUNT(CASE WHEN loan."completedLoan" = '0' THEN loan."userId" END) AS newUsersCount,
      COUNT(CASE WHEN loan."completedLoan" > '0' THEN loan."userId" END) AS repeatUsersCount,
      COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '0' THEN u.id END) AS nonnbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '0' THEN u.id END) AS nonnbfciosusers,
	    COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '1' THEN u.id END) AS nbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '1' THEN u.id END) AS nbfciosusers,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '0' THEN loan.id END) AS nonnbfcwebuser,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '1' THEN loan.id END) AS nbfcwebuser
      FROM public."loanTransactions" as loan
      INNER JOIN public."disbursementEntities" as disburse
      ON loan."id" = disburse."loanId"
      INNER JOIN public."registeredUsers" as u
      on u."id" = loan."userId" 
      WHERE loan."loanStatus" in ('Active','Complete') AND loan."loan_disbursement_date" >= '${startDate.toJSON()}'
      AND loan."loan_disbursement_date" <= '${endDate.toJSON()}'
      GROUP BY date`;

      const queryData = await this.repoManager.injectRawQuery(
        loanTransaction,
        sqlQuery,
      );

      if (queryData == k500Error) throw new Error();
      // Initialize variables
      let newUsersCount = 0;
      let repeatUsersCount = 0;
      let NonNBFCAndroidUsers = 0;
      let NonNBFCIosUsers = 0;
      let NBFCAndroidUsers = 0;
      let NBFCIosUsers = 0;
      let NonNBFCWebUsers = 0;
      let NBFCWebUsers = 0;
      let maxAmount = 0;
      let compareMaxAmount = 0;
      let finalData: any = [];

      for (let i = 0; i < queryData.length; i++) {
        try {
          const ele = queryData[i];
          const date = moment(ele.date);
          const year = date.year();
          const month = date.format('DD/MM/YYYY');
          const tempData: any = {
            date: month,
            count: +ele.count,
            amount: 0,
          };
          if (ele?.amount) {
            tempData.amount = +((ele.amount ?? 0) / 100).toFixed();
            maxAmount = tempData.amount;
            if (tempData.amount && tempData.amount > compareMaxAmount) {
              compareMaxAmount = tempData.amount;
            }
          }
          if (LAST_ONE_YAER == false) tempData.year = year;
          newUsersCount += +ele.newuserscount ?? 0;
          repeatUsersCount += +ele.repeatuserscount ?? 0;
          NonNBFCAndroidUsers += +ele?.nonnbfcandroidusers ?? 0;
          NonNBFCIosUsers += +ele?.nonnbfciosusers ?? 0;
          NBFCAndroidUsers += +ele?.nbfcandroidusers ?? 0;
          NBFCIosUsers += +ele?.nbfciosusers ?? 0;
          NonNBFCWebUsers += +ele?.nonnbfcwebuser ?? 0;
          NBFCWebUsers += +ele?.nbfcwebuser ?? 0;
          finalData.push(tempData);
        } catch (error) { }
      }
      // Return total count as an object
      return {
        newUsersCount,
        repeatUsersCount,
        NonNBFCAndroidUsers,
        NonNBFCIosUsers,
        NBFCAndroidUsers,
        NBFCIosUsers,
        NonNBFCWebUsers,
        NBFCWebUsers,
        compareMaxAmount,
        finalData,
      };
    } catch (error) { }
  }

  private async getRepaymentGraphData(startDate, endDate) {
    try {
      const sqlQuery = `SELECT DATE_TRUNC('hour', tran."updatedAt") AS date, COUNT(tran.id) AS count , SUM(tran."paidAmount") as amount
      FROM public."TransactionEntities" AS tran  where tran."status" = 'COMPLETED' AND type != 'REFUND'
        AND tran."completionDate" >= '${startDate.toJSON()}' AND tran."completionDate" <= '${endDate.toJSON()}'
      GROUP BY date ORDER BY date ASC`;

      const queryData: any = await this.repoManager.injectRawQuery(
        TransactionEntity,
        sqlQuery,
      );

      if (queryData == k500Error) throw new Error();
      return this.prepareHoursData(startDate, queryData);
    } catch (error) { }
  }

  private async getPartPayGraphData(startDate, endDate) {
    try {
      const sqlQuery = `SELECT DATE_TRUNC('hour', tran."updatedAt") AS date, COUNT(tran.id) AS count , SUM(tran."paidAmount") as amount
      FROM public."TransactionEntities" AS tran  where tran."status" = 'COMPLETED' AND type != 'REFUND' AND type = 'PARTPAY'
        AND tran."completionDate" >= '${startDate.toJSON()}' AND tran."completionDate" <= '${endDate.toJSON()}'
      GROUP BY date ORDER BY date ASC`;

      const queryData: any = await this.repoManager.injectRawQuery(
        TransactionEntity,
        sqlQuery,
      );
      if (queryData == k500Error) throw new Error();
      return this.prepareHoursData(startDate, queryData);
    } catch (error) { }
  }

  private async getToDayLDGraphData(startDate, endDate) {
    try {
      const sqlQuery = `SELECT DATE_TRUNC('hour', disburs."updatedAt") AS date, COUNT(disburs.id) AS count ,sum(disburs."amount") as amount,  
      COUNT(DISTINCT loan."userId") as newUsersCount ,
      COUNT(CASE WHEN loan."completedLoan" = '0' THEN loan."userId" END) AS newUsersCount,
      COUNT(CASE WHEN loan."completedLoan" > '0' THEN loan."userId" END) AS repeatUsersCount,
      COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '0' THEN u.id END) AS nonnbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '0' THEN u.id END) AS nonnbfciosusers,
	    COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '1' THEN u.id END) AS nbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '1' THEN u.id END) AS nbfciosusers,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '0' THEN loan.id END) AS nonnbfcwebuser,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '1' THEN loan.id END) AS nbfcwebuser
      FROM public."loanTransactions" AS loan
      INNER JOIN public."disbursementEntities" AS disburs ON loan."loan_disbursement_id" = disburs.id
      INNER JOIN public."registeredUsers" as u
      on u."id" = loan."userId"
      WHERE loan."loanStatus" IN ('Active', 'Complete')
      AND loan."loan_disbursement_date" >= '${startDate.toJSON()}'
      AND loan."loan_disbursement_date" <= '${endDate.toJSON()}'
      GROUP BY date
      ORDER BY date ASC`;

      const queryData: any = await this.repoManager.injectRawQuery(
        loanTransaction,
        sqlQuery,
      );
      if (queryData == k500Error) throw new Error();
      return this.prepareHoursData(startDate, queryData, true);
    } catch (error) { }
  }

  private async getRepaidAmountGraphData() {
    try {
      let today = moment();
      let startDate;
      let endDate;
      let yesterdayDate = this.typeService.getGlobalDate(
        moment(today).subtract(1, 'day').toDate(),
      );
      // Get first date of current month
      let firstDateOfCM = moment(today).startOf('month');
      // Current Month Data
      let currentMonthSD: any = moment(firstDateOfCM);
      startDate = this.typeService.getGlobalDate(currentMonthSD.toDate());
      endDate = yesterdayDate;
      const currentMonthData = await this.getRepaidData(
        startDate,
        endDate,
        true,
      );
      // Last Month Data
      firstDateOfCM.subtract(1, 'month');
      let lastMonthED: any = moment(firstDateOfCM).endOf('month');
      endDate = this.typeService.getGlobalDate(lastMonthED.toDate());
      let lastMonthSD: any = moment(lastMonthED).startOf('month');
      startDate = this.typeService.getGlobalDate(lastMonthSD.toDate());
      const lastMonthData = await this.getRepaidData(startDate, endDate, true);
      return { currentMonthData, lastMonthData };
    } catch (error) { }
  }

  private async getRepaidData(startDate, endDate, LAST_MONTH = false) {
    try {
      const sqlQuery = `SELECT "completionDate"  as date  , COUNT( id) AS count , SUM( "paidAmount") as amount
      FROM public."TransactionEntities"  where  "status" = 'COMPLETED' AND type != 'REFUND'
      AND  "completionDate" >= '${startDate.toJSON()}' AND  "completionDate" <= '${endDate.toJSON()}'
      group by date  order by date ;`;

      const queryData = await this.repoManager.injectRawQuery(
        TransactionEntity,
        sqlQuery,
      );

      if (queryData == k500Error) throw new Error();

      let currentMonthED: any = moment(startDate).endOf('month');
      currentMonthED = this.typeService.getGlobalDate(currentMonthED.toDate());
      const dateRange = this.typeService.getDateRange(
        new Date(startDate),
        (endDate = LAST_MONTH ? new Date(currentMonthED) : new Date(endDate)),
      );
      const finalData = [];

      for (let i = 0; i < dateRange.length; i++) {
        const eDate = dateRange[i];
        const temp = {
          date: moment(eDate).format('DD/MM/YYYY'),
          count: 0,
          amount: 0,
        };

        const findData = queryData.find((el) =>
          moment(eDate).isSame(moment(el?.date), 'day'),
        );

        if (findData?.count) temp.count = +findData.count;
        if (findData?.amount) temp.amount = +(findData.amount ?? 0).toFixed();
        finalData.push(temp);
      }
      return finalData;
    } catch (error) { }
  }

  async getQuarterlyWiseData(quarter = null) {
    let currentQuarter;
    let today: any = new Date();
    let startDate: any = new Date(today);
    let endDate: any = new Date(today);

    const month = today.getMonth() + 1;
    if (month >= 4 && month <= 6) {
      currentQuarter = 'Q1';
    } else if (month >= 7 && month <= 9) {
      currentQuarter = 'Q2';
    } else if (month >= 10 && month <= 12) {
      currentQuarter = 'Q3';
    } else {
      currentQuarter = 'Q4';
    }
    let targetQuarter = quarter ?? currentQuarter;

    if (currentQuarter === 'Q4' && targetQuarter !== 'Q4') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);
    }

    if (targetQuarter === 'Q1') {
      startDate.setMonth(3, 1);
      endDate.setMonth(5, 30);
    } else if (targetQuarter == 'Q2') {
      startDate.setMonth(6, 1);
      endDate.setMonth(8, 30);
    } else if (targetQuarter == 'Q3') {
      startDate.setMonth(9, 1);
      endDate.setMonth(11, 31);
    } else if (targetQuarter == 'Q4') {
      startDate.setMonth(0, 1);
      endDate.setMonth(2, 31);
    } else {
      return kInternalError;
    }
    startDate = this.typeService.getGlobalDate(startDate);
    endDate = this.typeService.getGlobalDate(endDate);

    return await this.getDisbursData(startDate, endDate);
  }

  async getFYTDData() {
    try {
      let today: any = new Date();
      let startDate: any = new Date(today);
      let endDate: any = new Date(today);
      const month = today.getMonth() + 1;
      if (month >= 4 && month <= 6) {
        startDate.setMonth(3, 1);
        endDate.setMonth(5, 30);
      } else if (month >= 7 && month <= 9) {
        startDate.setMonth(3, 1);
        endDate.setMonth(8, 30);
      } else if (month >= 10 && month <= 12) {
        startDate.setMonth(3, 1);
        endDate.setMonth(11, 31);
      } else {
        startDate.setMonth(3, 1);
        endDate.setMonth(2, 31);
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      return await this.getAllDisburshData(startDate, endDate);
    } catch (error) { }
  }

  private async getLoanDisburshGraphData() {
    try {
      let today = moment();
      let startDate;
      let endDate;
      let yesterdayDate = this.typeService.getGlobalDate(
        moment(today).subtract(1, 'day').toDate(),
      );
      // Get first date of current month
      let firstDateOfCM = moment(today).startOf('month');
      // Current Month Data
      let currentMonthSD: any = moment(firstDateOfCM);
      startDate = this.typeService.getGlobalDate(currentMonthSD.toDate());
      endDate = yesterdayDate;
      const LAST_MONTH = true;
      const currentMonthData = await this.getDisbursData(
        startDate,
        endDate,
        LAST_MONTH,
      );

      // Last Month Data
      firstDateOfCM.subtract(1, 'month');
      let lastMonthED: any = moment(firstDateOfCM).endOf('month');
      endDate = this.typeService.getGlobalDate(lastMonthED.toDate());
      let lastMonthSD: any = moment(lastMonthED).startOf('month');
      startDate = this.typeService.getGlobalDate(lastMonthSD.toDate());
      const lastMonthData = await this.getDisbursData(startDate, endDate);
      return { currentMonthData, lastMonthData };
    } catch (error) { }
  }

  async getDisbursData(startDate, endDate, LAST_MONTH = false) {
    let sqlQuery = `SELECT loan."loan_disbursement_date", count(loan.id) , sum(disburse."amount") as amount,  
      COUNT(CASE WHEN loan."completedLoan" = '0' THEN loan."userId" END) AS newUsersCount,
      COUNT(CASE WHEN loan."completedLoan" > '0' THEN loan."userId" END) AS repeatUsersCount,
      COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '0' THEN u.id END) AS nonnbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '0' THEN u.id END) AS nonnbfciosusers,
	    COUNT(CASE WHEN u."typeOfDevice" = '0' and loan."appType" = '1' THEN u.id END) AS nbfcandroidusers,
      COUNT(CASE WHEN u."typeOfDevice" = '1' and loan."appType" = '1' THEN u.id END) AS nbfciosusers,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '0' THEN loan.id END) AS nonnbfcwebuser,
      COUNT(CASE WHEN u."typeOfDevice" = '2' and loan."appType" = '1' THEN loan.id END) AS nbfcwebuser
      FROM public."loanTransactions" as loan  
      INNER JOIN public."disbursementEntities" as disburse 
      ON loan."id" = disburse."loanId"
      INNER JOIN public."registeredUsers" as u
      on u."id" = loan."userId"
      WHERE loan."loanStatus" in ('Active','Complete') 
      AND loan."loan_disbursement_date" >= '${startDate.toJSON()}'
      AND loan."loan_disbursement_date" <= '${endDate.toJSON()}'
      GROUP BY loan."loan_disbursement_date" 
      ORDER BY loan."loan_disbursement_date" ASC;`;

    const queryData = await this.repoManager.injectRawQuery(
      loanTransaction,
      sqlQuery,
    );

    if (queryData == k500Error) throw new Error();
    let currentMonthED: any = moment(startDate).endOf('month');
    currentMonthED = this.typeService.getGlobalDate(currentMonthED.toDate());
    const dateRange = this.typeService.getDateRange(
      new Date(startDate),
      (endDate = LAST_MONTH ? new Date(currentMonthED) : new Date(endDate)),
    );
    const finalData = [];
    // Initialize variables
    let newUsersCount = 0;
    let repeatUsersCount = 0;
    let NonNBFCAndroidUsers = 0;
    let NonNBFCIosUsers = 0;
    let NBFCAndroidUsers = 0;
    let NBFCIosUsers = 0;
    let NonNBFCWebUsers = 0;
    let NBFCWebUsers = 0;

    let maxAmount = 0;
    let compareMaxAmount = 0;
    // Loop through dateRange
    for (let i = 0; i < dateRange.length; i++) {
      try {
        const eDate = dateRange[i];
        const temp = {
          date: moment(eDate).format('DD/MM/YYYY'),
          count: 0,
          amount: 0,
        };

        const findData = queryData.find((el) =>
          moment(eDate).isSame(moment(el?.loan_disbursement_date), 'day'),
        );

        if (findData?.count) temp.count = +findData.count;
        if (findData?.amount) {
          temp.amount = +((findData.amount ?? 0) / 100).toFixed();
          maxAmount = temp.amount;
          if (temp.amount && temp.amount > compareMaxAmount) {
            compareMaxAmount = temp.amount;
          }
        }
        if (findData?.newuserscount) newUsersCount += +findData.newuserscount;
        if (findData?.repeatuserscount)
          repeatUsersCount += +findData.repeatuserscount;
        if (findData?.nonnbfcandroidusers)
          NonNBFCAndroidUsers += +findData.nonnbfcandroidusers;
        if (findData?.nonnbfciosusers)
          NonNBFCIosUsers += +findData.nonnbfciosusers;
        if (findData?.nbfcandroidusers)
          NBFCAndroidUsers += +findData.nbfcandroidusers;
        if (findData?.nbfciosusers) NBFCIosUsers += +findData.nbfciosusers;
        if (findData?.nonnbfcwebuser)
          NonNBFCWebUsers += +findData.nonnbfcwebuser;
        if (findData?.nbfcwebuser) NBFCWebUsers += +findData.nbfcwebuser;

        finalData.push(temp);
      } catch (error) { }
    }

    // Return total count as an object
    return {
      newUsersCount,
      repeatUsersCount,
      NonNBFCAndroidUsers,
      NonNBFCIosUsers,
      NBFCAndroidUsers,
      NBFCIosUsers,
      NonNBFCWebUsers,
      NBFCWebUsers,
      compareMaxAmount,
      finalData,
    };

    // return finalData;
  }

  private prepareHoursData(startDate, queryData, disAmount = false) {
    try {
      const dateRange = this.typeService.getDateTimeRange(startDate);
      const finalData = [];

      // Initialize variables
      let newUsersCount = 0;
      let repeatUsersCount = 0;
      let NonNBFCAndroidUsers = 0;
      let NonNBFCIosUsers = 0;
      let NBFCAndroidUsers = 0;
      let NBFCIosUsers = 0;
      let NonNBFCWebUsers = 0;
      let NBFCWebUsers = 0;
      let compareMaxAmount = 0;
      let maxAmount = 0;
      for (let i = 0; i < dateRange.length; i++) {
        const eDate = dateRange[i];
        const formattedDate = moment(eDate);

        // Format to 12-hour time with AM/PM
        const time = formattedDate.format('h:mm A');

        const temp = {
          time: time,
          count: 0,
          amount: 0,
        };
        const findData = queryData.find((el) =>
          moment(eDate).isSame(moment(el?.date), 'hour'),
        );

        if (findData?.count) temp.count = +findData.count;
        if (findData?.newuserscount) newUsersCount += +findData.newuserscount;
        if (findData?.repeatuserscount)
          repeatUsersCount += +findData.repeatuserscount;
        if (findData?.nonnbfcandroidusers)
          NonNBFCAndroidUsers += +findData.nonnbfcandroidusers;
        if (findData?.nonnbfciosusers)
          NonNBFCIosUsers += +findData.nonnbfciosusers;
        if (findData?.nbfcandroidusers)
          NBFCAndroidUsers += +findData.nbfcandroidusers;
        if (findData?.nbfciosusers) NBFCIosUsers += +findData.nbfciosusers;
        if (findData?.nonnbfcwebuser)
          NonNBFCWebUsers += +findData.nonnbfcwebuser;
        if (findData?.nbfcwebuser) NBFCWebUsers += +findData.nbfcwebuser;
        if (findData?.amount)
          if (disAmount) {
            temp.amount = +((findData.amount ?? 0) / 100).toFixed();
            maxAmount = temp.amount;
            if (temp.amount && temp.amount > compareMaxAmount) {
              compareMaxAmount = temp.amount;
            }
          } else {
            temp.amount = +(findData?.amount).toFixed();
            maxAmount = temp.amount;
            if (temp.amount && temp.amount > compareMaxAmount) {
              compareMaxAmount = temp.amount;
            }
          }

        finalData.push(temp);
      }
      // Return total count as an object
      return {
        newUsersCount,
        repeatUsersCount,
        NonNBFCAndroidUsers,
        NonNBFCIosUsers,
        NBFCAndroidUsers,
        NBFCIosUsers,
        NonNBFCWebUsers,
        NBFCWebUsers,
        compareMaxAmount,
        finalData,
      };
    } catch (error) { }
  }
}
