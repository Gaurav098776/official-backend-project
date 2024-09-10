// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  DUPLICATE_PROFILE,
  GLOBAL_RANGES,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  KICICIUPI,
  kCompleted,
  kInactiveUser,
  kNoDataFound,
  kUsrCategories,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { TypeService } from 'src/utils/type.service';
import { CommonSharedService } from './common.shared.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { BankingSharedService } from './banking.service';
import { Op, Sequelize, where } from 'sequelize';
import { BankingRepository } from 'src/repositories/banking.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { CryptService } from 'src/utils/crypt.service';
import { MasterEntity } from 'src/entities/master.entity';
import { CrmRepository } from 'src/repositories/crm.repository';
import { FileService } from 'src/utils/file.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
import { EligibilitySharedService } from './eligibility.shared.service';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { TallyService } from 'src/admin/tally/tally.service';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { registeredUsers } from 'src/entities/user.entity';
import { APIService } from 'src/utils/api.service';
import { nUserMigrate } from 'src/constants/network';
import { EMIRepository } from 'src/repositories/emi.repository';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { CalculationSharedService } from './calculation.service';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';

import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { EmploymentHistoryDetailsEntity } from 'src/entities/employment.history.entity';
import { LocationEntity } from 'src/entities/location.entity';

@Injectable()
export class MigrationSharedService {
  startTime;
  constructor(
    private readonly empRepo: EmploymentRepository,
    private readonly kycRepo: KYCRepository,
    private readonly loanRepo: LoanRepository,
    private readonly masterRepo: MasterRepository,
    private readonly locationRepo: LocationRepository,
    private readonly salarySlipRepo: SalarySlipRepository,
    private readonly userRepo: UserRepository,
    private readonly workMailRepo: WorkMailRepository,
    private readonly transRepo: TransactionRepository,
    private readonly typeService: TypeService,
    private readonly commonSharedService: CommonSharedService,
    private readonly tallyService: TallyService,
    @Inject(forwardRef(() => BankingSharedService))
    private readonly sharedBanking: BankingSharedService,
    private readonly userDeleteRepo: UserDeleteRepository,
    private readonly cryptService: CryptService,
    private readonly api: APIService,
    // Repositories
    private readonly bankingRepo: BankingRepository,
    private readonly changLogsRepo: ChangeLogsRepository,
    private readonly crmRepo: CrmRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly deviceAppInfoRepo: DeviceInfoInstallAppRepository,
    private readonly repoManager: RepositoryManager,
    // Utils
    private readonly fileService: FileService,
    // Shared services
    private readonly predictionService: PredictionService,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly blockUserHistoryRepo: BlockUserHistoryRepository,
    private readonly predictionRepo: PredictionRepository,
    private readonly emiRepo: EMIRepository,
    @Inject(forwardRef(() => UserServiceV4))
    private readonly userService: UserServiceV4,
    private readonly employmentHistoryRepository: EmploymentHistoryRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly calculationSharedService: CalculationSharedService,
    private readonly cibilScoreRepo: CibilScoreRepository,
  ) {}

  async migrateTov3(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const toDay = this.typeService.getGlobalDate(new Date());
      // Get user data

      // Selfie
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = ['status'];
      // KYC
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarRejectReason',
        'aadhaarStatus',
        'kycCompletionDate',
        'panRejectReason',
        'panStatus',
        'updatedAt',
      ];
      // Work mail
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = [
        'approveById',
        'id',
        'rejectReason',
        'status',
      ];
      // Salary slip
      const salarySlipInclude: any = { model: SalarySlipEntity };
      salarySlipInclude.attributes = [
        'approveById',
        'id',
        'rejectReason',
        'status',
      ];
      // Employment
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = [
        'companyStatusApproveById',
        'companyVerification',
        'id',
        'rejectReason',
        'verifiedDate',
        'salary',
      ];
      empInclude.include = [salarySlipInclude, workMailInclude];
      // Bank
      const bankInclude: any = { model: BankingEntity };
      bankInclude.attributes = [
        'rejectReason',
        'salaryVerification',
        'salaryVerificationDate',
      ];
      // Subscription
      const subscriptionInclude: any = { model: SubScriptionEntity };
      subscriptionInclude.attributes = ['status', 'updatedAt'];
      // eSign
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = ['status', 'updatedAt'];
      // Loan
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = [
        'loan_disbursement',
        'loan_disbursement_date',
        'id',
        'loanStatus',
        'predictionId',
        'remark',
        'verifiedDate',
        'manualVerification',
      ];
      loanInclude.include = [bankInclude, eSignInclude, subscriptionInclude];
      const include = [empInclude, kycInclude, loanInclude, selfieInclude];
      const attributes = [
        'createdAt',
        'id',
        'homeStatus',
        'pin',
        'residenceRejectReason',
        'quantity_status',
        'contactRejectReason',
        'NextDateForApply',
      ];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const statusData = {
        phone: -1,
        permission: -1,
        selfie: -1,
        email: -1,
        contact: -1,
        pan: -1,
        basic: -1,
        personal: -1,
        professional: -1,
        pin: -1,
        aadhaar: -1,
        company: -1,
        workMail: -1,
        salarySlip: -1,
        bank: -1,
        residence: -1,
        loan: -2,
        reference: -1,
        eMandate: -1,
        eSign: -1,
        disbursement: -1,
        repayment: -2,
      };
      statusData.permission = 1;
      statusData.phone = +userData.phoneStatusVerified;
      statusData.basic = 1;
      statusData.email = +userData.emailStatusVerified;
      statusData.selfie = +(userData.selfieData?.status ?? '-1');
      statusData.personal = -1;

      statusData.residence = +userData.homeStatus;
      statusData.contact = +userData.quantity_status;
      statusData.pin = userData.pin ? 1 : -1;
      statusData.pan = +(userData.kycData?.panStatus ?? '-1');
      statusData.aadhaar = +(userData.kycData?.aadhaarStatus ?? '-1');
      statusData.company = +(
        userData.employmentData?.companyVerification ?? '-1'
      );
      const workMailData = userData.employmentData?.workMail ?? {};
      statusData.workMail = +(workMailData.status ?? '-1');
      const salarySlipData = userData.employmentData?.salarySlip ?? {};
      statusData.salarySlip = +(salarySlipData.status ?? '-1');

      const registeredDate = new Date(userData.createdAt).getTime();
      const dates = {
        registration: registeredDate,
        basicDetails: registeredDate,
        professionalDetails: registeredDate,
        residence: 0,
        aadhaar: 0,
        pan: 0,
        employment: 0,
        banking: 0,
        eligibility: 0,
        eMandate: 0,
        eSign: 0,
        disbursement: 0,
      };
      if (statusData.residence == 1 || statusData.residence == 3)
        dates.residence = registeredDate;
      const otherInfo = { salaryInfo: 0 };

      // Employment rejection
      otherInfo.salaryInfo = parseInt(
        (+(userData?.employmentData?.salary ?? '0').toString()).toFixed(),
      );
      if (!otherInfo.salaryInfo) statusData.professional = -1;
      else statusData.professional = 1;
      // Aadhaar and pan verification date
      const kycData = userData.kycData;
      if (kycData) {
        const kycCompletionDate = kycData.kycCompletionDate;
        if (kycCompletionDate) {
          dates.aadhaar = new Date(kycCompletionDate).getTime();
          dates.pan = new Date(kycCompletionDate).getTime();
        } else {
          dates.aadhaar = kycData.updatedAt.getTime();
          dates.pan = kycData.updatedAt.getTime();
        }
      }
      // Company verification date
      const empData = userData.employmentData;
      if (empData) {
        if (empData.verifiedDate)
          dates.employment = empData.verifiedDate.getTime();
      }

      const rejection = {
        aadhaar: '',
        pan: '',
        company: '',
        workMail: '',
        salarySlip: '',
        banking: '',
        residence: '',
        eligibility: '',
        eMandate: '',
        eSign: '',
        disbursement: '',
      };
      // Aadhaar and pan rejections
      if (kycData) {
        rejection.aadhaar = kycData.aadhaarRejectReason ?? '';
        rejection.pan = kycData.panRejectReason ?? '';
      }
      // Residence rejection
      rejection.residence = userData.residenceRejectReason ?? '';
      // Employment rejection
      rejection.company = userData.employmentData?.rejectReason ?? '';
      // Work mail rejection
      rejection.workMail = workMailData.rejectReason ?? '';
      // Salary slip rejection
      rejection.salarySlip = workMailData.salarySlip ?? '';

      // Status data before loan
      const registrationData = {
        status: statusData,
        dates,
        rejection,
        otherInfo,
        empId: null,
        companyAdminId: null,
        salarySlipId: null,
        salarySlipAdminId: null,
        workMailId: null,
        workMailAdminId: null,
      };
      // Foreign keys
      if (empData) {
        registrationData.empId = empData.id;
        registrationData.companyAdminId = empData.companyStatusApproveById;
      }
      if (workMailData) {
        registrationData.workMailId = workMailData.id;
        registrationData.workMailAdminId = workMailData.approveById;
      }
      if (salarySlipData) {
        registrationData.salarySlipId = salarySlipData.id;
        registrationData.salarySlipAdminId = workMailData.approveById;
      }

      const loanList = userData.loanData ?? [];
      loanList.sort((a, b) => a.id - b.id);

      if (loanList.length <= 0) {
        let interestRate: any =
          await this.commonSharedService.getEligibleInterestRate({ userId });
        if (interestRate?.message)
          interestRate = GLOBAL_RANGES.MIN_PER_DAY_INTEREST_RATE;
        const creationData = {
          interestRate: interestRate.toString(),
          userId,
        };
        const loanData = await this.loanRepo.createRowData(creationData);
        if (!loanData || loanData == k500Error) return kInternalError;
        const masterData = {
          dates: registrationData.dates,
          loanId: loanData.id,
          rejection,
          status: registrationData.status,
          userId,
          empId: registrationData.empId,
          workMailId: registrationData.workMailId,
          salarySlipId: registrationData.salarySlipId,
          companyAdminId: registrationData.companyAdminId,
          workMailAdminId: registrationData.workMailAdminId,
          salarySlipAdminId: registrationData.salarySlipAdminId,
          otherInfo: registrationData.otherInfo,
        };
        const createMaster = await this.masterRepo.createRowData(masterData);
        if (!createMaster || createMaster === k500Error) return kInternalError;

        // Update user data
        let updatedData = { masterId: createMaster.id };
        let updateResult = await this.userRepo.updateRowData(
          updatedData,
          userId,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update loan data
        updateResult = await this.loanRepo.updateRowData(
          updatedData,
          loanData.id,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update emp data
        if (empData.id) {
          updateResult = await this.empRepo.updateRowData(
            updatedData,
            empData.id,
          );
          if (updateResult == k500Error) return kInternalError;
        }

        // Update work mail data
        if (workMailData.id) {
          updateResult = await this.workMailRepo.updateRowData(
            updatedData,
            workMailData.id,
          );
          if (updateResult == k500Error) return kInternalError;
        }

        // Update salary slip data
        if (salarySlipData.id) {
          updateResult = await this.salarySlipRepo.updateRowData(
            updatedData,
            salarySlipData.id,
          );
          if (updateResult == k500Error) return kInternalError;
        }
      }

      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const masterData = {
            dates: registrationData.dates,
            loanId: loanData.id,
            rejection,
            status: registrationData.status,
            userId,
            empId: registrationData.empId,
            workMailId: registrationData.workMailId,
            salarySlipId: registrationData.salarySlipId,
            companyAdminId: registrationData.companyAdminId,
            workMailAdminId: registrationData.workMailAdminId,
            salarySlipAdminId: registrationData.salarySlipAdminId,
          };

          if (index == loanList.length - 1) {
            if (userData.NextDateForApply != null) {
              masterData['coolOffData'] = {
                count: 1,
                coolOffEndsOn: this.typeService
                  .getGlobalDate(userData.NextDateForApply)
                  .toJSON(),
                coolOffStartedOn: toDay.toJSON(),
              };
            }
          }
          masterData.status['eligibility'] = +loanData?.manualVerification;
          // Loan status
          const loanStatus = loanData.loanStatus;
          masterData.status.loan = -1;
          if (loanStatus == 'Rejected') {
            masterData.status.loan = 2;
            masterData.status['eligibility'] = 2;
          } else if (loanStatus == 'Complete') masterData.status.loan = 7;
          else if (loanStatus == 'Active') masterData.status.loan = 6;
          else if (loanStatus == 'Accepted' && loanData?.manualVerification) {
            if (loanData?.manualVerification == '5') {
              masterData.status.loan = 4;
              masterData.status['eligibility'] = 4;
            } else masterData.status.loan = +loanData?.manualVerification;
          }
          // Loan date
          if (loanData.verifiedDate)
            dates.eligibility = new Date(loanData.verifiedDate).getTime();
          // Loan rejection
          masterData.rejection.eligibility = loanData.remark ?? '';

          // Banking status
          const bankingData = loanData.bankingData ?? {};
          const salaryVerification = +(bankingData?.salaryVerification ?? '-1');
          masterData.status.bank = salaryVerification;
          // Banking date
          if (bankingData.salaryVerificationDate)
            dates.banking = new Date(
              bankingData.salaryVerificationDate,
            ).getTime();

          // Reference status
          const isReferenceSubmitted = loanData.predictionId != null;
          masterData.status.reference = isReferenceSubmitted ? 1 : -1;

          // eMandate status
          const subscriptionData = loanData.subscriptionData ?? {};
          const subscriptionStatus = (
            subscriptionData.status ?? 'INITIALIZED'
          ).toUpperCase();
          if (
            ['ON_HOLD', 'ACTIVE', 'BANK_APPROVAL_PENDING'].includes(
              subscriptionStatus,
            )
          )
            masterData.status.eMandate = 1;
          else if (subscriptionStatus == 'FAILED')
            masterData.status.eMandate = 2;
          // eSign date
          if (subscriptionData.updatedAt)
            dates.eMandate = new Date(subscriptionData.updatedAt).getTime();

          // eSign status
          const eSignData = loanData.eSignData ?? { status: '-1' };
          masterData.status.eSign = +eSignData.status;
          // eSign date
          if (eSignData.updatedAt)
            dates.eSign = new Date(eSignData.updatedAt).getTime();

          // Disbursement status
          const isDisbursed = loanData.loan_disbursement != null;
          masterData.status.disbursement = isDisbursed ? 1 : -1;
          // Disbursement date
          if (loanData.loan_disbursement_date) {
            dates.disbursement = new Date(
              loanData.loan_disbursement_date,
            ).getTime();
          }

          // const att = ['id'];
          // const options = { where: { loanId: loanData.id } };
          // const find = await this.masterRepo.getRowWhereData(att, options);
          // if (find === k500Error) continue;
          // const id = find?.id;
          // // Create master data
          // const createdData = id
          //   ? await this.masterRepo.updateRowData(masterData, id)
          //   : await this.masterRepo.createRowData(masterData);
          // if (createdData == k500Error) continue;
          let upsert = await this.masterRepo.upsert(masterData, {
            conflictFields: ['loanId'],
          });
          if (upsert.statusCode == k500Error) continue;
          // Update user data
          let updatedData = { masterId: upsert[0].id };
          let updateResult;
          if (loanList.length - 1 == index) {
            updateResult = await this.userRepo.updateRowData(
              updatedData,
              userId,
            );
            if (updateResult == k500Error) continue;
          }

          // Update loan data
          updateResult = this.loanRepo.updateRowData(updatedData, loanData.id);
          //if (updateResult == k500Error) continue;

          // Update emp data
          if (empData.id) {
            updateResult = this.empRepo.updateRowData(updatedData, empData.id);
            //if (updateResult == k500Error) continue;
          }

          // Update work mail data
          if (workMailData.id) {
            updateResult = this.workMailRepo.updateRowData(
              updatedData,
              workMailData.id,
            );
            //if (updateResult == k500Error) continue;
          }

          // Update salary slip data
          if (salarySlipData.id) {
            updateResult = this.salarySlipRepo.updateRowData(
              updatedData,
              salarySlipData.id,
            );
            if (updateResult == k500Error) continue;
          }

          //await this.userService.routeDetails({ id: userId });
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async userMigration(query) {
    let count = 0;
    const apiList = ['http://localhost:3006/v3/user/userMigration?page='];
    for (let index = 0; index < 55; index++) {
      try {
        let url = apiList[count];
        url += index;
        console.log(count, url);
        count++;
        if (count >= apiList.length) {
          await this.typeService.delay(120000);
          count = 0;
        }
      } catch (error) {}
    }
  }

  async startPagination(offset, limit, page) {
    try {
      const data = await this.userRepo.getTableWhereData(['id'], {
        offset,
        limit,
        order: [['id']],
      });
      for (let index = 0; index < data.length; index++) {
        if (index % 100 == 0) console.log(index, page);
        const userId = data[index].id;
        // const res = await this.migrateTov3({ userId });
        // // if (res) console.log(res, userId);
        // await this.userService.routeDetails({ id: userId });
      }
      await this.typeService.delay(100000);
      console.log('data.length', data.length);
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  // Adding last location in master data if not exists
  async migrateLastLocation(userId) {
    const rawQuery = `SELECT "createdAt", "lat", "location", "long"
      FROM "LocationEntities" 
      WHERE "userId" = '${userId}' LIMIT 1;`;
    const outputList = await this.repoManager.injectRawQuery(
      LocationEntity,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();

    const locationData = outputList[0];
    if (locationData == k500Error) throw new Error();

    if (!locationData) return { lastLocation: '-', lastLocationDateTime: '-' };

    const lastLocation = locationData.location ?? '-';
    const lastLocationDateTime = locationData.createdAt?.getTime();

    // Get master data
    const masterAttr = ['id', 'miscData'];
    const masterOptions = { order: [['id', 'DESC']], where: { userId } };
    let masterData = await this.masterRepo.getRowWhereData(
      masterAttr,
      masterOptions,
    );
    if (masterData == k500Error) throw new Error();

    // In case data not migrated to v3
    if (!masterData) {
      await this.migrateTov3({ userId });
      masterData = await this.masterRepo.getRowWhereData(
        masterAttr,
        masterOptions,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);
    }

    // Update master data
    const miscData = masterData.miscData ?? {};
    miscData.lastLocation = lastLocation;
    miscData.lastLocationDateTime = lastLocationDateTime;
    miscData.lastLat = +locationData.lat;
    miscData.lastLong = +locationData.long;
    const updatedData = { miscData };
    const updateResponse = await this.masterRepo.updateRowData(
      updatedData,
      masterData.id,
    );
    if (updateResponse == k500Error) return kInternalError;

    return { lastLocation, lastLocationDateTime };
  }

  async migrateMasterLoanRejactByBank(reqData) {
    try {
      const attributes = ['id', 'subscriptionDate'];
      const options = { where: { completionDate: 'nullT10:00:00.000Z' } };

      const transList = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList?.message) return transList;

      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          if (!transData.subscriptionDate) continue;

          const updatedData = { completionDate: transData.subscriptionDate };
          await this.transRepo.updateRowData(updatedData, transData.id);
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async refreshUserStage(reqData) {
    const userIds = reqData.userIds;
    try {
      const options = { where: { id: { [Op.in]: userIds } } };
      let userList = await this.userRepo.getTableWhereData(['id'], options);
      console.log(userList.length);
      if (userList == k500Error) return userList;
      userList = userList.map((el) => el.id);

      return { userIds: userList };
    } catch (error) {}
  }

  async checkNReVerifyBank(body) {
    try {
      const loanIds = body?.loanIds ?? [];
      if (loanIds.length === 0) return [];
      const bankingInclude: any = { model: BankingEntity };
      bankingInclude.attributes = [
        'accountDetails',
        'bankStatement',
        'consentResponse',
      ];
      bankingInclude.where = { loanId: loanIds };
      const include = [bankingInclude];
      const attributes = ['id', 'userId'];
      const options = { include, where: { loanStatus: 'InProcess' } };

      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      const userIds = [];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const userId = loanData.userId;
          const bankingData = loanData.bankingData ?? {};

          const preparedData = {
            filePath: bankingData.bankStatement,
            userId,
            additionalURLs: [],
            accountDetails: JSON.parse(bankingData.accountDetails),
          };
          if (!preparedData.filePath && bankingData.consentResponse) {
            const response = JSON.parse(bankingData.consentResponse);
            preparedData.filePath = response.pdfURL;
          }
          console.log(loanData.id, userId, index);
          const response = await this.sharedBanking.validateEligibility(
            preparedData,
          );
          console.log('response', response);
          userIds.push(userId);
        } catch (error) {}
      }
      return { userIds };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Migrating salary date from banking table and change logs table to loan table
  async migrateVerifiedSalaryDate() {
    try {
      const attributes = ['id'];
      const options = {
        where: {
          loanStatus: { [Op.or]: ['Active', 'Complete'] },
          verifiedSalaryDate: { [Op.eq]: null },
        },
      };
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const loanId = loanData.id;
          const salaryDate = await this.getApprovedSalaryDate(loanId);
          if (salaryDate?.message) continue;
          if (!salaryDate) continue;

          const updatedData = { verifiedSalaryDate: salaryDate };
          await this.loanRepo.updateRowData(updatedData, loanId);
          console.log(index, loanList.length);
        } catch (error) {}
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async oldCrmToLastCrmInUser() {
    try {
      let attributes: any = ['id'];
      let options: any = {
        order: [['updatedAt', 'DESC']],
        where: { lastCrm: { [Op.eq]: null }, loanStatus: 3 },
      };

      const userList = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      const userIds = userList.map((el) => el.id);
      attributes = [[Sequelize.fn('MAX', Sequelize.col('id')), 'id']];
      options = {
        group: [['id', 'userId']],
        where: { userId: { [Op.in]: userIds } },
      };
      // Get last crm
      let crmList: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (crmList == k500Error) return kInternalError;
      const crmIds = crmList.map((el) => el.id);
      options = { order: [['id', 'DESC']], where: { id: crmIds } };
      crmList = await this.crmRepo.getTableWhereData(null, options);
      if (crmList == k500Error) return kInternalError;

      for (let index = 0; index < userList.length; index++) {
        const userData = userList[index];
        const userId = userData.id;
        const crmData = crmList.find((el) => el.userId == userId);
        if (!crmData || !userId) continue;
        const relationData = crmData.relationData ?? {};
        const lastCrm = {
          amount: crmData.amount,
          loanId: crmData.loanId,
          reason: crmData.reason,
          remark: crmData.remark,
          status: crmData.status,
          titleId: crmData.titleId,
          crmOrder: crmData.crmOrder,
          due_date: crmData.due_date,
          reasonId: crmData.crmReasonId,
          statusId: relationData?.statusId ?? crmData.crmStatusId,
          adminName: (
            await this.commonSharedService.getAdminData(crmData.adminId)
          ).fullName,
          createdAt: crmData?.createdAt
            ? new Date(crmData.createdAt).toJSON()
            : '',
          titleName: 'Phone Busy',
          categoryId: crmData.categoryId,
          reasonName: 'Medical Issue',
          statusName: relationData?.statusName ?? '',
          dispositionId: relationData?.dispositionId,
          referenceName: crmData.referenceName ?? '',
          settlementData: crmData.settlementData,
          adminDepartment: '',
          dispositionName: relationData?.dispositionName ?? '',
        };
        const updatedData = { lastCrm };
        await this.userRepo.updateRowData(updatedData, userId);
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getApprovedSalaryDate(loanId) {
    try {
      const attributes = ['newData'];
      const options = {
        order: [['id', 'DESC']],
        where: { newData: { [Op.ne]: '-' }, loanId, type: 'Salary Date' },
      };
      const changedData = await this.changLogsRepo.getRowWhereData(
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
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region migrate tansaction who date not in global
  async migrateTansactionCompletionDate() {
    try {
      const options = {
        where: {
          completionDate: { [Op.notLike]: '%T10:00:00.000Z' },
          status: 'COMPLETED',
        },
        order: [['id']],
      };
      const att = ['id', 'completionDate'];
      const result = await this.transRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      for (let index = 0; index < result.length; index++) {
        try {
          const data = result[index];
          if (!data?.completionDate) continue;
          const completionDate = this.typeService
            .getGlobalDate(new Date(data.completionDate))
            .toJSON();
          const update = await this.transRepo.updateRowData(
            { completionDate },
            data.id,
            true,
          );
          console.log(update, data.id);
        } catch (error) {}
      }
    } catch (error) {}
  }
  //#endregion

  // migration api for adminId to FollowerId in Transaction
  async migrateFollowerIdInTransaction(reqData) {
    try {
      const attributes = ['id', 'adminId'];
      const options = { where: { followerId: null, adminId: { [Op.ne]: 37 } } };
      const transList = await this.transRepo.getTableWhereData(
        attributes,
        options,
      );
      if (transList?.message) return transList;
      const finalData = {};
      for (let index = 0; index < transList.length; index++) {
        try {
          const trans = transList[index];
          const followerId = trans?.adminId;
          if (!followerId) continue;
          if (finalData[followerId]) finalData[followerId].push(trans.id);
          else finalData[followerId] = [trans.id];
        } catch (error) {}
      }
      const keys = Object.keys(finalData);
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        try {
          const update = await this.transRepo.updateRowData(
            { followerId: +key },
            finalData[key],
            true,
          );
          console.log(key, update);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // migrate phone and email in allPhone & allEmail
  async migrateAllPhoneEmail() {
    try {
      const options = {
        where: {
          [Op.or]: [
            { allPhone: { [Op.eq]: null } },
            { allEmail: { [Op.eq]: null } },
          ],
        },
        limit: 1000,
      };
      const att = ['id', 'phone', 'email'];
      const result = await this.userRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      const length = result.length;
      for (let index = 0; index <= length; index++) {
        try {
          const ele = result[index];
          const id = ele.id;
          const phone = this.cryptService.decryptPhone(ele?.phone);
          const email = ele?.email;
          const updateData = {
            allPhone: phone ? [phone] : [],
            allEmail: email ? [email] : [],
          };
          await this.userRepo.updateRowData(updateData, id, true);
        } catch (error) {}
      }
      if (length != 0) await this.migrateAllPhoneEmail();
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // migrate not updated WorkMail Status
  async migrateWorkMailStatus() {
    try {
      const options = {
        where: { status: { workMail: 0, loan: { [Op.or]: [6, 7] } } },
      };
      const masterData = await this.masterRepo.getTableWhereData(
        ['id'],
        options,
      );
      if (masterData === k500Error) return kInternalError;
      const masterIds = masterData.map((f) => f.id);
      const masterInc = { model: MasterEntity, attributes: ['id', 'status'] };
      const attr = ['id', 'status', 'masterId'];
      const ops = {
        where: { masterId: masterIds },
        include: [masterInc],
        order: [['id', 'DESC']],
      };
      const mailData = await this.workMailRepo.getTableWhereData(attr, ops);
      if (mailData === k500Error) return kInternalError;
      const workMailData = [];
      mailData.forEach((work) => {
        try {
          const find = workMailData.find((f) => f.masterId == work.masterId);
          if (!find) workMailData.push(work);
        } catch (error) {}
      });
      const statusPainding: any = [];
      const length = workMailData.length;
      for (let index = 0; index < length; index++) {
        try {
          const workDT = workMailData[index];
          const workMailId = workDT.id;
          const master = workDT.masterData;
          const masterId = master.id;
          const status = master.status;
          const workMailStatus = workDT?.status;
          const updateMaster: any = {};
          console.log('masterId', masterId);
          if (workMailStatus == '0') {
            status.workMail = 3;
            updateMaster.status = status;
            statusPainding.push(workMailId);
          } else {
            status.workMail = +workMailStatus;
            updateMaster.status = status;
          }
          await this.masterRepo.updateRowData(updateMaster, masterId, true);
        } catch (error) {}
      }
      console.log('statusPainding', statusPainding);
      const updateWorkEmail = { status: '3' };
      await this.workMailRepo.updateRowData(
        updateWorkEmail,
        statusPainding,
        true,
      );
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async resetAffectedUsers() {
    try {
      const attributes = ['id', 'phone', 'fullName'];

      const options = {
        where: {
          id: [
            'f0e6ab66-9c11-4cee-949b-732e14a0aa08',
            '296887d8-a2d8-44bf-963a-a6085d876991',
          ],
          stage: 19,
        },
      };

      const userList = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      const finalizedList = [];
      for (let index = 0; index < userList.length; index++) {
        const userData = userList[index];
        finalizedList.push({
          userId: userData.id,
          name: userData.fullName ?? '',
          phone: this.cryptService.decryptPhone(userData.phone),
        });
      }

      const rawExcelData = {
        sheets: ['Affected users'],
        data: [finalizedList],
        sheetName: 'Affected users.xlsx',
        needFindTuneKey: true,
      };
      const url: any = await this.fileService.objectToExcelURL(rawExcelData);
      if (url?.message) return url;
      return { fileUrl: url };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateRejectReason() {
    try {
      const loanInc = {
        model: loanTransaction,
        attributes: ['id', 'remark', 'manualVerificationAcceptId'],
        where: { loanStatus: 'Rejected', remark: null, declineId: null },
      };
      const empApprove = ['salaried professional', 'salaried', 'consultant'];
      const ops = {
        where: { otherInfo: { employmentInfo: { [Op.notIn]: empApprove } } },
        include: [loanInc],
        order: [['id', 'DESC']],
      };
      const attr = ['loanId', 'otherInfo'];
      const masterData = await this.masterRepo.getTableWhereData(attr, ops);
      if (masterData === k500Error) return kInternalError;
      for (let index = 0; index < masterData.length; index++) {
        try {
          const master = masterData[index];
          const loan = master?.loanData;
          const loanId = loan?.id;
          const adminId = loan?.manualVerificationAcceptId ?? SYSTEM_ADMIN_ID;
          const empInfo = master?.otherInfo?.employmentInfo;
          let reason;
          if (empInfo == 'student') {
            reason = 'Not eligible employment sector';
          } else if (
            empInfo == 'self-employed' ||
            empInfo == 'retired' ||
            empInfo == 'homemaker'
          )
            reason = 'User is not salaried';
          const obj: any = {
            manualVerificationAcceptId: adminId,
            manualVerification: '2',
          };
          if (reason) obj.remark = reason;
          console.log('UPDATE:', index, loanId);
          await this.loanRepo.updateRowData(obj, loanId, true);
        } catch (error) {}
      }
      return masterData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // migrate old user's categorization due to employement startdate missing
  async migrateUserCategorization() {
    try {
      const predictionIncl = {
        model: PredictionEntity,
        attributes: ['id', 'categorizationTag'],
        where: { categorizationTag: { [Op.eq]: null } },
      };
      const ops = {
        where: { loanStatus: { [Op.in]: ['Active', 'Complete'] } },
        include: [predictionIncl],
        order: [['id', 'DESC']],
      };
      const attr = ['id'];
      const loanData = await this.loanRepo.getTableWhereData(attr, ops);
      if (loanData === k500Error) return kInternalError;
      const length = loanData.length;
      console.log(length);
      // return loanData;
      for (let index = 0; index < loanData.length; index++) {
        try {
          const loan = loanData[index];
          const loanId = loan?.id;
          const data = {
            loanId,
            type: kUsrCategories,
            updateScore: true,
            migrate: true,
          };
          const tagData = await this.sharedEligibility.calculateScore(data);
          if (tagData?.message) continue;
        } catch (error) {}
      }
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateCgstAndSgstAmount() {
    try {
      const loanData = await this.loanRepo.getTableWhereData(
        ['id', 'charges'],
        { where: { loanStatus: { [Op.ne]: 'Rejected' } } },
      );
      if (loanData === k500Error) return kInternalError;

      const length = loanData.length;
      console.log('Total loan', length);
      for (let index = 0; index < length; index++) {
        try {
          const loan = loanData[index];
          const charges = loan?.charges;
          const gst_amt = charges?.gst_amt;

          if (
            gst_amt !== undefined &&
            (!charges?.cgst_amt || !charges?.sgst_amt)
          ) {
            const subGST = parseFloat((gst_amt / 2).toFixed(2));
            charges.cgst_amt = subGST;
            charges.sgst_amt = subGST;
            if (loan?.id)
              await this.loanRepo.updateRowData({ charges }, loan.id, true);
          }
        } catch (error) {}
      }
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //delete error files
  async migrateDeleteErrorFiles() {
    try {
      const attributes = ['id', 'errorFileCount', 'errorFiles'];
      const options: any = {
        where: {
          errorFileCount: { [Op.ne]: 0 },
        },
      };
      const data = await this.userDeleteRepo.getTableWhereData(
        attributes,
        options,
      );
      if (data === k500Error) return kInternalError;

      for (let index = 0; index < data.length; index++) {
        try {
          const errorFiles: any = [];
          const ele = data[index];
          for (let j = 0; j < ele?.errorFiles.length; j++) {
            try {
              const res = await this.fileService.deleteGoogleCloudeFile(
                ele?.errorFiles[j],
              );
              if (res != 204) errorFiles.push(ele?.errorFiles[j]);
            } catch (error) {}
            const Rupdated2: any = {};
            Rupdated2.errorFileCount = errorFiles.length;
            Rupdated2.errorFiles = errorFiles;
            await this.userDeleteRepo.updateRowData(Rupdated2, ele.id);
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //migrate loanCompletionDate
  async migrateLoanCompletionDate() {
    try {
      const emiInc = {
        model: EmiEntity,
        attributes: ['payment_done_date'],
        where: { payment_done_date: { [Op.ne]: null }, partOfemi: 'LAST' },
      };
      const ops = {
        where: {
          loanStatus: 'Complete',
          loanCompletionDate: { [Op.eq]: null },
        },
        include: [emiInc],
      };
      const attr = ['id', 'loanCompletionDate'];
      const loanData = await this.loanRepo.getTableWhereData(attr, ops);
      if (loanData === k500Error) return kInternalError;
      const length = loanData.length;
      if (length == 0) return {};
      console.log(length);
      for (let index = 0; index < length; index++) {
        try {
          const loan = loanData[index];
          const loanId = loan?.id;
          const emi = loan?.emiData ?? [];
          const doneDate = emi[0]?.payment_done_date;
          const loanCompletionDate = doneDate
            ? this.typeService.getGlobalDate(doneDate).toJSON()
            : null;
          await this.loanRepo.updateRowData(
            { loanCompletionDate },
            loanId,
            true,
          );
        } catch (error) {}
      }
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateLoanBalancedStatus(body) {
    try {
      let startDate = body?.startDate;
      let endDate = body?.endDate;
      startDate = this.typeService.getGlobalDate(startDate).toJSON();
      endDate = this.typeService.getGlobalDate(endDate).toJSON();

      const attributes = ['id', 'loanStatus'];
      const options: any = {
        where: {
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          loanStatus: 'Complete',
        },
      };
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;

      const length = loanData.length;
      console.log('l', length);

      for (let i = 0; i < length; i++) {
        const ele = loanData[i];
        const balanceDetails: any =
          await this.tallyService.getLedgerLoanDetails({ loanId: ele?.id });
        if (balanceDetails.balance > 100) {
          const update: any = { isNotBalanced: 1 };
          await this.loanRepo.updateRowData(update, ele.id, true);
        }
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // migrate aadharLatlong  in aadharLatlongPoint in KYC
  async migrateKYCLatLongToPoint() {
    try {
      //get user which aadhaarLatLong is not null and empty
      const options = {
        where: {
          aadhaarLatLong: { [Op.or]: { [Op.notIn]: [null, ''] } },
          aadhaarLatLongPoint: { [Op.eq]: null },
        },
      };
      const att = ['id', 'aadhaarLatLong'];
      const kycData = await this.kycRepo.getTableWhereData(att, options);
      if (kycData === k500Error) return kInternalError;

      const update_data = {};

      /// pre pare the data
      for (let i = 0; i < kycData.length; i++) {
        try {
          const element = kycData[i];
          const aadhaarLatLong = element?.aadhaarLatLong;
          if (aadhaarLatLong) {
            const latLngObject = JSON.parse(aadhaarLatLong);
            const lat = latLngObject['lat'];
            const lng = latLngObject['lng'];
            if (lat !== undefined && lng !== undefined) {
              const id = element.id;
              const key = `${lat},${lng}`;
              if (update_data[key]) update_data[key].push(id);
              else update_data[key] = [id];
            }
          }
        } catch (error) {}
      }

      /// update the data

      const keys = Object.keys(update_data);
      for (let index = 0; index < keys.length; index++) {
        try {
          const key = keys[index];
          const id = update_data[key];
          if (index % 100 === 0) console.log(index, new Date());
          const update = { aadhaarLatLongPoint: key };
          await this.kycRepo.updateRowData(update, id, true);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //migrate  aadhaarResponse column address related keys to aadhaarAddress column in KYCentities
  async migrateAaddharResponseToAadhaarAddress() {
    try {
      const kycAtr = ['id', 'aadhaarAddress', 'aadhaarResponse', 'kyc_mode'];
      const kycOptions = {
        where: {
          kyc_mode: { [Op.or]: ['ZOOP', 'LENDITT'] },
        },
      };

      const kycData = await this.kycRepo.getTableWhereData(kycAtr, kycOptions);
      if (kycData === k500Error) return kInternalError;
      for (let index = 0; index < kycData.length; index++) {
        try {
          const ele = kycData[index];
          const aadhaarAddressObj = JSON.parse(ele?.aadhaarAddress);
          const aadhaarResponseObj = JSON.parse(ele?.aadhaarResponse);
          const id = ele?.id;
          if (
            aadhaarAddressObj?.dist === '' &&
            aadhaarResponseObj?.districtName !== ''
          ) {
            aadhaarAddressObj.dist = aadhaarResponseObj?.districtName;
          }
          if (
            aadhaarAddressObj?.state === '' &&
            aadhaarResponseObj?.stateName !== ''
          ) {
            aadhaarAddressObj.state = aadhaarResponseObj?.stateName;
          }
          if (
            aadhaarAddressObj?.po === '' &&
            aadhaarResponseObj?.poName !== ''
          ) {
            aadhaarAddressObj.po = aadhaarResponseObj?.poName;
          }
          if (
            aadhaarAddressObj?.loc === '' &&
            aadhaarResponseObj?.locality !== ''
          ) {
            aadhaarAddressObj.loc = aadhaarResponseObj?.locality;
          }
          if (
            aadhaarAddressObj?.vtc === '' &&
            aadhaarResponseObj?.vtcName !== ''
          ) {
            aadhaarAddressObj.vtc = aadhaarResponseObj?.vtcName;
          }
          if (
            aadhaarAddressObj?.subdist === '' &&
            aadhaarResponseObj?.subDistrictName !== ''
          ) {
            aadhaarAddressObj.subdist = aadhaarResponseObj?.subDistrictName;
          }
          if (
            aadhaarAddressObj?.street === '' &&
            aadhaarResponseObj?.street !== ''
          ) {
            aadhaarAddressObj.street = aadhaarResponseObj?.street;
          }
          if (
            aadhaarAddressObj?.house === '' &&
            aadhaarResponseObj?.building !== ''
          ) {
            aadhaarAddressObj.house = aadhaarResponseObj?.building;
          }

          const updatedData = {
            aadhaarAddress: JSON.stringify(aadhaarAddressObj),
          };
          await this.kycRepo.updateRowData(updatedData, id, true);
        } catch (error) {}
      }
      return { Res: 'allDataUpdated' };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // start region  user remove from blacklis and cooloff
  async migrateCoolOffUSer() {
    try {
      //get blackuser and coolOffUser with respect of resonId
      const opt = {
        where: { reasonId: { [Op.or]: [53, 55] }, blockedBy: SYSTEM_ADMIN_ID },
      };
      const getBlacklistUser =
        await this.blockUserHistoryRepo.getTableWhereData(['userId'], opt);
      if (getBlacklistUser === k500Error) return kInternalError;
      let userIds = [...new Set(getBlacklistUser.map((el) => el.userId))];
      if (!userIds.length) return [];
      let userOption: any = { where: { id: userIds } };
      let masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['userId', 'coolOffData'];
      userOption.include = [masterInclude];
      //get coolOff User blockuser and coolOffUser
      const userData = await this.userRepo.getTableWhereData(
        ['id', 'isBlacklist', 'phone'],
        userOption,
      );
      if (userData === k500Error) return kInternalError;
      let filteredData = [];
      for (let i = 0; i < userData?.length; i++) {
        try {
          const ele = userData[i];
          let updateData;
          const userId = ele?.id;
          const mobileNumber = this.cryptService.decryptPhone(ele?.phone);
          let isBlacklist = ele?.isBlacklist;
          let coolOffData = ele?.masterData?.coolOffData;
          if (isBlacklist === '1') {
            isBlacklist = '0';
            updateData = await this.userRepo.updateRowWhereData(
              { isBlacklist },
              { where: { id: userId } },
            );
            if (updateData === k500Error) continue;
            filteredData.push({ userId, mobileNumber });
          }
          if (
            !(
              coolOffData.coolOffEndsOn == '' ||
              coolOffData.coolOffStartedOn == ''
            )
          ) {
            coolOffData.count = 0;
            coolOffData.coolOffEndsOn = '';
            coolOffData.coolOffStartedOn = '';
            updateData = await this.masterRepo.updateRowWhereData(
              { coolOffData },
              { where: { userId } },
            );
            if (updateData === k500Error) continue;
            filteredData.push({ userId, mobileNumber });
          }
        } catch (error) {}
      }
      return filteredData;
    } catch (error) {}
  }
  //#endregion

  //migrate loan feesIncome
  async migrateLoanfeesIncome() {
    try {
      const opts = {
        where: {
          feesIncome: 0,
          loanStatus: { [Op.or]: ['Active', 'Complete'] },
        },
      };
      const loanData = await this.loanRepo.getTableWhereData(
        ['id', 'loanFees', 'charges', 'loanCompletionDate'],
        opts,
      );
      if (loanData === k500Error) return kInternalError;
      const length = loanData?.length;
      console.log('Total Loan', length);

      for (let i = 0; i < length; i++) {
        try {
          const loan = loanData[i];
          const loanId = loan?.id;
          console.log('loanId', loanId);
          const loanFees = +(loan?.loanFees ?? 0);
          const charges = loan?.charges ?? {};
          const gstAmt = +(charges?.gst_amt ?? 0);
          if (loanFees && gstAmt) {
            const feesIncome: any = Math.round(loanFees - gstAmt);
            await this.loanRepo.updateRowData({ feesIncome }, loanId, true);
            console.log(loanId, 'feesIncome', feesIncome);
          }
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // migrate user data
  async migrateNewUserData(reqData) {
    try {
      const lspId = reqData?.lspId;
      if (!lspId) return kParamMissing('lspId');
      const locationData = reqData?.locationList;
      if (!locationData) return kParamMissing('locationList');
      const deviceData = reqData?.deviceList;
      if (!deviceData) return kParamMissing('deviceList');
      const deviceInfoData = reqData?.deviceInfoList;
      if (!deviceInfoData) return kParamMissing('deviceInfoList');
      const userBasicDetails = reqData?.basicData;
      if (!userBasicDetails) return kParamMissing('basicData');

      const userDetails = await this.userRepo.getRowWhereData(['id'], {
        where: { lspId },
      });
      if (userDetails === k500Error) return kInternalError;
      if (!userDetails) return k422ErrorMessage(kNoDataFound);

      const masterData = await this.masterRepo.getRowWhereData(['otherInfo'], {
        where: {
          userId: userDetails.id,
        },
      });
      if (!masterData) return k422ErrorMessage(kNoDataFound);
      masterData.otherInfo.salaryInfo = userBasicDetails?.salary;

      locationData.forEach((location) => {
        location.userId = userDetails.id;
      });

      deviceData.forEach((device) => {
        device.userId = userDetails.id;
      });

      deviceInfoData.forEach((deviceInfo) => {
        deviceInfo.userId = userDetails.id;
      });
      const [
        locationDetails,
        deviceDetails,
        deviceInfoDetails,
        userData,
        updateMasterData,
      ]: any = await Promise.all([
        // location details
        this.locationRepo.bulkCreate(locationData),

        // device details
        this.deviceRepo.bulkCreate(deviceData),

        // device info details
        this.deviceAppInfoRepo.bulkCreate(deviceInfoData),

        // user basic details
        this.userRepo.updateRowWhereData(
          {
            isSalaried: userBasicDetails?.isSalaried,
            salaryMode: userBasicDetails?.salaryMode,
          },
          {
            where: {
              id: userDetails.id,
            },
          },
        ),

        this.masterRepo.updateRowWhereData(masterData, {
          where: {
            userId: userDetails.id,
          },
        }),
      ]);

      if (
        locationDetails === k500Error ||
        deviceDetails === k500Error ||
        deviceInfoDetails === k500Error ||
        userData === k500Error ||
        updateMasterData == k500Error
      )
        return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateExistingUser(reqData) {
    try {
      const rowQ = `SELECT "phone", "createdAt", "updatedAt" FROM public."registeredUsers" where "appType" = '0' AND "lspId" is null AND "uniqueId" <= ${reqData.max} AND "uniqueId" > ${reqData.min} order by "uniqueId" desc limit 1000`;
      console.log(rowQ);
      const userDetails = await this.repoManager.injectRawQuery(
        registeredUsers,
        rowQ,
      );
      if (userDetails.length == 0) return 'all completed';
      if (userDetails == k500Error)
        console.log('userDetails error', userDetails);
      console.log('userDetails', userDetails.length);
      const encryptedPhone = [];
      userDetails.map((user) => {
        encryptedPhone.push(user.phone);
        user.phone = this.cryptService.decryptPhone(user.phone);
      });
      const url = nUserMigrate;
      const lspIds = await this.api.requestPost(url, userDetails);
      console.log('lspIds', lspIds?.data?.length);
      lspIds.data.map((user, index) => {
        user.phone = encryptedPhone[index];
      });
      const query = lspIds.data
        .map(
          (entry) =>
            `UPDATE public."registeredUsers" SET "lspId" = '${entry.id}' WHERE phone = '${entry.phone}';`,
        )
        .join('');
      const queryData = await this.repoManager.injectRawQuery(
        registeredUsers,
        query,
      );
      if (queryData == k500Error) return k500Error;
      await this.migrateExistingUser(reqData);
      return true;
    } catch (error) {
      console.log('error', error);
      return kInternalError;
    }
  }

  async migrateExistingUserV2(reqData) {
    try {
      const rowQ = `SELECT id, "phone", "createdAt", "updatedAt" FROM public."registeredUsers" where "appType" = '0' AND "lspId" is null AND "uniqueId" <= ${reqData.max} AND "uniqueId" > ${reqData.min} order by "uniqueId" desc limit 1000`;
      const userDetails = await this.repoManager.injectRawQuery(
        registeredUsers,
        rowQ,
      );
      if (userDetails.length == 0) return 'all completed';
      if (userDetails == k500Error)
        console.log('userDetails error', userDetails);
      console.log('userDetails', userDetails.length);
      userDetails.map((user) => {
        user.phone = this.cryptService.decryptPhone(user.phone);
      });
      const url = nUserMigrate;
      const lspIds = await this.api.requestPost(url, {
        targetList: userDetails,
      });
      console.log('lspIds', lspIds?.data?.length);
      for (let index = 0; index < lspIds?.data.length; index++) {
        try {
          const element = lspIds.data[index];
          const res = await this.userRepo.updateRowData(
            { lspId: element.lspId },
            element.userId,
            true,
          );
        } catch (error) {
          console.log('errorS', error);
        }
      }
      await this.migrateExistingUserV2(reqData);
      return true;
    } catch (error) {
      console.log('error', error);
      return kInternalError;
    }
  }

  // migrate loan reject reason
  async migrateLoanRejectRemark(body) {
    try {
      const userId = body?.userIds ?? [];
      const loanInc = {
        model: loanTransaction,
        attributes: [
          'id',
          'userId',
          'loanStatus',
          'loanRejectReason',
          'remark',
          'declineId',
        ],
      };
      const userData = await this.userRepo.getTableWhereData(['id'], {
        where: { id: userId },
        include: [loanInc],
      });
      if (userData === k500Error) return kInternalError;
      const length = userData?.length;
      console.log('Total Loan', length);

      for (let i = 0; i < length; i++) {
        try {
          const user = userData[i];
          const loanData = user?.loanData;
          const loanDT = loanData.filter(
            (el) =>
              !el?.declineId &&
              !el?.loanRejectReason &&
              !el?.remark &&
              el?.loanStatus == 'Rejected',
          );
          for (let index = 0; index < loanDT.length; index++) {
            const loan = loanDT[index];
            const loanId = loan?.id;
            const dwId = loanId - 1;
            const upId = loanId + 1;
            const dwLoan = loanData.find((f) => f.id == dwId);
            const upLoan = loanData.find((f) => f.id == upId);
            let remark = kInactiveUser;
            if (dwLoan || upLoan) {
              console.log('loanId', loanId);
              remark = 'Duplicate entry';
            }
            // await this.loanRepo.updateRowData({ remark }, loanId, true);
          }
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateKycData(offset = 0, limit = 1000) {
    try {
      const attributes = ['id', 'aadhaarNumber'];
      const options = {
        where: {
          aadhaarNumber: { [Op.ne]: null },
          aadhaarNo: { [Op.eq]: null },
          [Op.and]: {
            id: { [Op.lt]: 200 },
          },
        },
        limit: 1000,
      };

      const rowQ = `SELECT "id", PGP_SYM_DECRYPT(CAST("aadhaarNumber" AS BYTEA), 'LENDITT')
      AS "aadhaarNumber" FROM "KYCEntities" AS "KYCEntity"
      WHERE "KYCEntity"."aadhaarNumber" IS NOT NULL AND "KYCEntity"."aadhaarNo" IS NULL AND id <= ${
        offset + limit
      } AND id > ${offset}`;
      const response = await this.repoManager.injectRawQuery(KYCEntity, rowQ);
      if (response == k500Error) {
        console.log(rowQ, { response });
        await this.migrateKycData(offset + limit, limit);
      }
      console.log(offset, offset + limit, response.length);
      ///code here

      let finalizedData: any = [];
      for (let data of response) {
        let customerRefId: number;
        let aadhaarNo: Text;
        if (!data?.aadhaarNumber.includes('test')) {
          customerRefId = data?.aadhaarNumber
            ? Number(data.aadhaarNumber.substring(0, 8))
            : null;
          aadhaarNo = data?.aadhaarNumber
            ? this.cryptService.getMD5Hash(data.aadhaarNumber)
            : null;
        } else {
          const extractAadhaarNo = data?.aadhaarNumber.slice(9) ?? null;
          customerRefId = extractAadhaarNo
            ? Number(extractAadhaarNo.substring(0, 8))
            : null;
          aadhaarNo = extractAadhaarNo
            ? this.cryptService.getMD5Hash(extractAadhaarNo)
            : null;
        }

        const updatedData = {
          id: data.id,
          customerRefId,
          aadhaarNo,
        };
        if (
          updatedData.customerRefId == null ||
          updatedData.aadhaarNo == null ||
          isNaN(updatedData.customerRefId)
        ) {
          console.log('data', data);
          continue;
        }
        finalizedData.push(updatedData);
      }
      console.log('final', finalizedData.length);
      const updateQueries = finalizedData
        .map(
          (update) => `
            UPDATE public."KYCEntities" 
            SET "customerRefId" = '${update.customerRefId}', "aadhaarNo" = '${update.aadhaarNo}' 
            WHERE id = '${update.id}';
        `,
        )
        .join('');

      const updateAadhar = await this.repoManager.injectRawQuery(
        KYCEntity,
        updateQueries,
      );
      if (updateAadhar == k500Error) return kInternalError;
      // if (length !== 0) await this.migrateKycData();

      if (response.length !== 0)
        await this.migrateKycData(offset + limit, limit);
      console.log('completeddd');
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // async migratePredictionData() {
  //   try {
  //     const attributes = ['loanId', 'id'];
  //     const options = {
  //       where: {
  //         [Op.or]: [
  //           Sequelize.literal(
  //             `"automationDetails"->'message'->>'message' = 'INTERNAL_SERVER_ERROR'`,
  //           ),
  //           Sequelize.literal(
  //             `"ml_approval"->'message'->>'message' = 'INTERNAL_SERVER_ERROR'`,
  //           ),
  //         ],
  //       },
  //       limit: 100,
  //       order: [['id', 'DESC']],
  //     };
  //     const loanIds: any = await this.predictionRepo.getTableWhereData(
  //       attributes,
  //       options,
  //     );
  //     if (loanIds?.message) return kInternalError;

  //     const updateQueries = promiseData
  //       .map(
  //         (update) => `
  //           UPDATE public."PredictionEntities"
  //       SET "automationDetails" = '${JSON.stringify(
  //         update.data1,
  //       )}',"ml_approval" = '${JSON.stringify(update.data2)}'
  //       WHERE "id" = '${update.id}';
  //       `,
  //       )
  //       .join('');

  //     const updateData = await this.repoManager.injectRawQuery(
  //       PredictionEntity,
  //       updateQueries,
  //     );
  //     if (updateData == k500Error) return kInternalError;
  //     if (loanIds.length !== 0) await this.migratePredictionData();
  //     return true;
  //   } catch (error) {
  //     console.log({ error });
  //     return kInternalError;
  //   }
  // }

  async migratePredictionData(offset = 115279, limit = 100) {
    try {
      const rowQ = `SELECT id, "loanId"
      FROM public."PredictionEntities"
      where ("automationDetails"->'message'->>'message' = 'INTERNAL_SERVER_ERROR' or "ml_approval"->'message'->>'message' = 'INTERNAL_SERVER_ERROR') AND id <= ${
        offset + limit
      } AND id > ${offset}`;
      const loanIds: any = await this.repoManager.injectRawQuery(
        PredictionEntity,
        rowQ,
      );
      if (loanIds?.message) return kInternalError;
      console.log(offset, offset + limit, loanIds.length);

      // let finalData = [];
      // for (let loanIdKey of loanIds) {
      //   const transactionData: any =
      //     await this.predictionService.getTransctionDataByLoanId(
      //       loanIdKey['loanId'],
      //     );
      //   if (!transactionData) return true;

      //   const [data1, data2]: any = await Promise.all([
      //     this.predictionService.predictRepaymentStatusFromPY(
      //       loanIdKey['loanId'],
      //       transactionData,
      //     ),
      //     this.predictionService.predictLoanApprovalStatusFromPY(
      //       loanIdKey['loanId'],
      //       transactionData,
      //     ),
      //   ]);
      //   finalData.push({ data1, data2, id: loanIdKey.id });
      // }
      const promises = loanIds.map(async (loanIdKey) => {
        const transactionData =
          await this.predictionService.getTransctionDataByLoanId(
            loanIdKey['loanId'],
          );
        if (!transactionData)
          return { data1: null, data2: null, id: loanIdKey.id };

        const [data1, data2] = await Promise.all([
          this.predictionService.predictRepaymentStatusFromPY(
            loanIdKey['loanId'],
            transactionData,
          ),
          this.predictionService.predictLoanApprovalStatusFromPY(
            loanIdKey['loanId'],
            transactionData,
          ),
        ]);

        return { data1, data2, id: loanIdKey.id };
      });

      const promiseData = await Promise.all(promises);
      const updateQueries = promiseData
        .map(
          (update) => `
            UPDATE public."PredictionEntities"
        SET "automationDetails" = '${JSON.stringify(
          update.data1,
        )}',"ml_approval" = '${JSON.stringify(update.data2)}'
        WHERE "id" = '${update.id}';
        `,
        )
        .join('');

      const updateData = await this.repoManager.injectRawQuery(
        PredictionEntity,
        updateQueries,
      );
      if (updateData == k500Error) return kInternalError;
      if (loanIds.length !== 0)
        await this.migratePredictionData(offset + limit, limit);
      return true;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  async migrateIntrestRate(query) {
    if (!query?.readOnly) return kParamMissing('readOnly status');
    const tag = query?.readOnly;
    const userInclude = {
      model: registeredUsers,
      attributes: ['id', 'fullName'],
    };
    const masterInclude = {
      model: MasterEntity,
      attributes: ['id'],
      where: { status: { bank: { [Op.in]: ['1', '3'] } } },
      include: [userInclude],
    };
    const option = {
      where: {
        loanStatus: { [Op.in]: ['Accepted', 'InProcess'] },
        esign_id: null,
      },
      include: [masterInclude],
    };
    const loanList = await this.loanRepo.getTableWhereDataWithCounts(
      ['id', 'loanStatus', 'userId'],
      option,
    );
    if (loanList == k500Error) throw new Error();

    if (tag == 'true') return loanList;
    const finalData = [];
    for (let i = 0; i < loanList.rows.length; i++) {
      try {
        const ele = loanList.rows[i];
        const loanId = ele?.id;
        const userId = ele?.userId;

        if (loanId && userId) {
          await this.sharedEligibility.checkLoanEligibility({
            loanId,
            userId,
          });
          finalData.push({ loanId, userId });
        }
      } catch (error) {}
    }
    return finalData;
  }

  //start region migrate upi payments mismatched date data
  async migrateUpiMismatchedDateData(body) {
    try {
      const startDate = body?.startDate;
      const endDate = body?.endDate;
      const transAtr = ['id', 'emiId', 'loanId', 'response', 'type'];
      const transOptions = {
        where: {
          source: KICICIUPI,
          status: kCompleted,
          completionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
          [Op.or]: [{ type: 'EMIPAY' }, { type: 'FULLPAY' }],
        },
        order: [['id', 'ASC']],
      };
      const transactionData = await this.transRepo.getTableWhereData(
        transAtr,
        transOptions,
      );
      if (transactionData === k500Error) return kInternalError;
      for (let i = 0; i < transactionData.length; i++) {
        try {
          const ele = transactionData[i];
          const transId = ele?.id;
          const emiId = ele?.emiId;
          const loanId = ele?.loanId;
          const type = ele?.type;
          const responseObj = JSON.parse(ele?.response);
          const originalTxnCompletionDate = responseObj?.TxnCompletionDate;
          const year = originalTxnCompletionDate.slice(0, 4);
          const month = originalTxnCompletionDate.slice(4, 6);
          const day = originalTxnCompletionDate.slice(6, 8);
          const hour = originalTxnCompletionDate.slice(8, 10);
          const minute = originalTxnCompletionDate.slice(10, 12);
          const second = originalTxnCompletionDate.slice(12, 14);
          let paymentDate = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:${second}`,
          );
          paymentDate.setMinutes(paymentDate.getMinutes());
          paymentDate = this.typeService.getGlobalDate(paymentDate);
          await this.transRepo.updateRowData(
            { completionDate: paymentDate.toJSON() },
            transId,
            true,
          );
          if (type === 'EMIPAY' && emiId) {
            await this.emiRepo.updateRowData(
              { payment_done_date: paymentDate.toJSON() },
              emiId,
              true,
            );
          }
          if (type === 'FULLPAY') {
            const emiAtr = ['id', 'pay_type'];
            const emiOptions = { where: { loanId } };
            const emiData = await this.emiRepo.getTableWhereData(
              emiAtr,
              emiOptions,
            );
            if (emiData === k500Error) return kInternalError;
            emiData.sort((a, b) => a.id - b.id);
            emiData.forEach(async (el) => {
              if (el?.pay_type === 'FULLPAY') {
                await this.emiRepo.updateRowData(
                  { payment_done_date: paymentDate.toJSON() },
                  el?.id,
                  true,
                );
              }
            });
          }
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // migrate user to bank under verification for loan offer screen
  async migrateUserFromFVtoBank() {
    const masterInc: any = {
      model: MasterEntity,
      attributes: ['id', 'status'],
      where: {
        status: {
          loan: { [Op.in]: [-1, 0] },
          bank: { [Op.in]: [1, 3] },
        },
      },
    };
    const bankInc: any = {
      model: BankingEntity,
      attributes: ['id', 'salaryVerification'],
    };
    const attr = ['id', 'userId'];
    const options: any = {
      where: { loanStatus: { [Op.or]: ['InProcess', 'Accepted'] } },
      include: [masterInc, bankInc],
    };
    const loanData = await this.loanRepo.getTableWhereData(attr, options);
    if (loanData == k500Error) throw new Error();

    console.log(loanData);

    const length = loanData.length;
    // for (let i = 0; i < length; i++) {
    //   try {
    //     const ele = loanData[i];
    //     const masterData = ele.masterData;
    //     const bankData = ele.bankingData;
    //     const status = masterData.status;
    //     const updatedData = {
    //       manualVerification: -1,
    //       loanStatus: 'InProcess',
    //     };
    //     await this.loanRepo.updateRowData(updatedData, ele.id, true);
    //     status.loan = -1;
    //     status.eligibility = -1;
    //     status.bank = 0;
    //     const masterUpdatedData = { status };
    //     await this.masterRepo.updateRowData(
    //       masterUpdatedData,
    //       masterData.id,
    //       true,
    //     );

    //     await this.bankingRepo.updateRowData(
    //       { salaryVerification: '0' },
    //       bankData.id,
    //     );
    //     await this.userService.routeDetails({ id: ele.userId });
    //   } catch (error) {}
    // }
    return {};
  }

  async migrateUserPhone(offset = 0, limit = 1000, length = 0) {
    try {
      length = length + limit;
      const attr = ['id', 'uniqueId', 'phone', 'createdAt'];
      const option = {
        limit,
        where: {
          phone: { [Op.ne]: null },
          hashPhone: { [Op.eq]: null },
          uniqueId: { [Op.and]: [{ [Op.gt]: offset }, { [Op.lte]: length }] },
        },
        order: [['uniqueId', 'ASC']],
      };
      let userDetails = await this.userRepo.getTableWhereData(attr, option);
      if (!userDetails || userDetails == k500Error) return kInternalError;
      for (let i = 0; i < userDetails.length; i++) {
        const userData = userDetails[i];
        const decryptedPhone = this.cryptService.decryptPhone(userData.phone);
        const hashPhone = this.cryptService.getMD5Hash(decryptedPhone);
        const data = {
          hashPhone,
        };
        const users = await this.userRepo.updateRowData(
          data,
          userData.id,
          true,
        );
        if (users == k500Error) {
          await this.blockDuplicateUsers(userData);
        }
      }

      if (userDetails.length != 0) {
        return await this.migrateUserPhone(offset + limit, limit, length);
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async blockDuplicateUsers(user) {
    try {
      const blockUsersId = [];
      const blockUsersHistory = [];
      let userProfileResult: any;
      const usersWithEmail = [];
      const withoutEmailUser = [];

      const tail = user.phone.split('===')[1];
      const masterInclude = {
        model: MasterEntity,
        attributes: ['status', 'dates'],
      };
      const attr = ['id', 'phone', 'hashPhone', 'email', 'lastOnlineTime'];
      const option = {
        where: {
          phone: { [Op.like]: '%' + tail },
        },
        include: masterInclude,
        order: [['id']],
      };
      const duplicates = await this.userRepo.getTableWhereData(attr, option);
      if (duplicates == k500Error) return kInternalError;

      const addToBlockHistory = (user) => {
        blockUsersId.push(user.id);
        blockUsersHistory.push({
          isBlackList: 1,
          userId: user.id,
          blockedBy: SYSTEM_ADMIN_ID,
          reasonId: 64,
          reason: DUPLICATE_PROFILE,
        });
      };

      const updateProfile = (user) => {
        if (user.hashPhone) {
          return;
        }
        const decryptedPhone = this.cryptService.decryptPhone(user.phone);
        const hashPhone = this.cryptService.getMD5Hash(decryptedPhone);

        return {
          data: { hashPhone },
          id: user.id,
        };
      };

      await Promise.all(
        duplicates.map(async (user) => {
          const aadhaar = user?.masterData.status.aadhaar;
          if (aadhaar == '1') {
            userProfileResult = await updateProfile(user);
          } else {
            if (user.email) {
              usersWithEmail.push(user);
            } else {
              withoutEmailUser.push(user);
            }
          }
        }),
      );

      if (usersWithEmail.length > 1) {
        const latestUser = usersWithEmail.reduce((maxUser, currentUser) => {
          const maxUserDate = Math.max(
            ...Object.values(maxUser.masterData.dates).map(
              (val: number) => val,
            ),
          );
          const currentUserDate = Math.max(
            ...Object.values(currentUser.masterData.dates).map(
              (val: number) => val,
            ),
          );
          return currentUserDate >= maxUserDate ? currentUser : maxUser;
        });
        await Promise.all(
          usersWithEmail.map((user) => {
            if (user.id !== latestUser.id) {
              addToBlockHistory(user);
            }
          }),
        );

        userProfileResult
          ? addToBlockHistory(latestUser)
          : (userProfileResult = await updateProfile(latestUser));
      } else if (usersWithEmail.length == 1) {
        userProfileResult
          ? addToBlockHistory(usersWithEmail[0])
          : (userProfileResult = await updateProfile(usersWithEmail[0]));
      }

      if (withoutEmailUser.length > 1) {
        const latestUser = withoutEmailUser.reduce((maxUser, currentUser) => {
          const maxUserTime = new Date(maxUser.lastOnlineTime);
          const currentUserTime = new Date(currentUser.lastOnlineTime);
          return currentUserTime >= maxUserTime ? currentUser : maxUser;
        });

        await Promise.all(
          withoutEmailUser.map((user) => {
            if (user.id !== latestUser.id) {
              addToBlockHistory(user);
            }
          }),
        );

        userProfileResult
          ? addToBlockHistory(latestUser)
          : (userProfileResult = await updateProfile(latestUser));
      } else if (withoutEmailUser.length == 1) {
        addToBlockHistory(withoutEmailUser[0]);
      }

      const data = {
        isBlacklist: '1',
        hashPhone: null,
      };
      const options = {
        where: {
          id: { [Op.in]: blockUsersId },
        },
        silent: true,
      };
      const updateDuplicate = await this.userRepo.updateRowWhereData(
        data,
        options,
      );
      if (updateDuplicate == k500Error) return kInternalError;
      if (userProfileResult) {
        const { data, id } = userProfileResult;
        const updateUserProfile = await this.userRepo.updateRowData(
          data,
          id,
          true,
        );
        if (updateUserProfile == k500Error) return kInternalError;
      }
      await this.blockUserHistoryRepo.bulkCreate(blockUsersHistory);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrationCltvData(body) {
    console.log('migrationCltvData start');
    let unMatchCompany = [];
    const status = body.status ?? [
      'InProcess',
      'Accepted',
      'Active',
      'Complete',
    ];
    const attr = ['id', 'createdAt', 'userId'];
    const opt = {
      where: {
        companyId: { [Op.eq]: null },
        loanStatus: { [Op.in]: status },
      },
      limit: 5000,
    };

    const data = await this.loanRepo.getTableWhereDataWithCounts(attr, opt);
    if (data == k500Error) throw new Error();
    const userIds: any = data.rows.map((row) => row.userId);
    console.log('userIds', userIds.length);

    const attributes = ['userId', 'companyName', 'createdAt'];
    const options = {
      where: {
        userId: userIds,
      },
    };

    let missingComp: any =
      await this.employmentHistoryRepository.getTableWhereData(
        attributes,
        options,
      );
    if (missingComp == k500Error) throw new Error();

    const value: any = await this.empRepo.getTableWhereData(
      attributes,
      options,
    );
    if (value == k500Error) throw new Error();
    if (value) missingComp = [...missingComp, ...value];

    console.log('missingComp', missingComp.length);

    const companyNames = new Set();
    const closestEntries = [];

    for (let index = 0; index < data.rows.length; index++) {
      const element = data.rows[index];
      const createdAt: any = new Date(element.createdAt);
      let minDifference = Infinity;
      let closestEntry = null;

      const userEmploymentHistory = missingComp.filter(
        (comp) => comp.userId === element.userId,
      );
      if (userEmploymentHistory && userEmploymentHistory.length > 0) {
        for (let j = 0; j < userEmploymentHistory.length; j++) {
          const value = userEmploymentHistory[j];
          const compantDate: any = new Date(value.createdAt);
          const difference = Math.abs(compantDate - createdAt);
          if (difference < minDifference) {
            minDifference = difference;
            closestEntry = value;
          }
        }
      }

      if (closestEntry) {
        closestEntries.push({ loanId: element.id, closestEntry });
        companyNames.add(closestEntry.companyName.toUpperCase());
      }
    }
    const compIdResults = await this.companyRepository.getTableWhereData(
      ['id', 'companyName'],
      {
        where: { companyName: { [Op.in]: Array.from(companyNames) } },
      },
    );
    if (compIdResults == k500Error) throw new Error();
    console.log('compIdResults', compIdResults.length);

    const companyNameToIdMap = {};
    for (let i = 0; i < compIdResults.length; i++) {
      const result = compIdResults[i];
      companyNameToIdMap[result.companyName.toUpperCase()] = result.id;
    }
    const updatePromises = closestEntries.map(
      async ({ loanId, closestEntry }) => {
        const companyName = closestEntry.companyName.toUpperCase();
        let companyId = companyNameToIdMap[companyName] ?? 0;

        if (!companyId) {
          unMatchCompany.push({ companyName: closestEntry.companyName });
        }

        await this.loanRepo.updateRowData({ companyId }, loanId, true);
      },
    );

    await Promise.all(updatePromises);

    await this.migrationCltvData(body);
    return unMatchCompany;
  }

  async addMissingCompany(body) {
    console.log('addMissingCompany start');
    const companyNames = new Set();
    const status = body.status ?? [
      'InProcess',
      'Accepted',
      'Active',
      'Complete',
    ];
    const attr = ['id', 'createdAt', 'userId'];
    const opt = {
      where: {
        companyId: { [Op.eq]: null },
        loanStatus: { [Op.in]: status },
      },
    };

    const data = await this.loanRepo.getTableWhereDataWithCounts(attr, opt);
    if (data == k500Error) throw new Error();

    const userIds: any = data.rows.map((row) => row.userId);
    console.log('userIds', userIds.length);

    const attributes = ['userId', 'companyName', 'createdAt'];
    const options = {
      where: {
        userId: userIds,
      },
    };

    let missingComp: any =
      await this.employmentHistoryRepository.getTableWhereData(
        attributes,
        options,
      );
    if (missingComp == k500Error) throw new Error();

    const value: any = await this.empRepo.getTableWhereData(
      attributes,
      options,
    );
    if (value == k500Error) throw new Error();
    if (value) missingComp = [...missingComp, ...value];

    console.log('missingComp', missingComp.length);

    for (let index = 0; index < data?.rows?.length; index++) {
      const element = data.rows[index];
      const createdAt: any = new Date(element.createdAt);
      let minDifference = Infinity;
      let closestEntry = null;

      const userEmploymentHistory = missingComp.filter(
        (comp) => comp.userId === element?.userId,
      );

      if (userEmploymentHistory && userEmploymentHistory.length > 0) {
        for (let j = 0; j < userEmploymentHistory.length; j++) {
          const value = userEmploymentHistory[j];
          const compantDate: any = new Date(value.createdAt);
          const difference = Math.abs(compantDate - createdAt);

          if (difference < minDifference) {
            minDifference = difference;
            closestEntry = value;
          }
        }
      }

      if (closestEntry) {
        companyNames.add(closestEntry?.companyName?.toUpperCase());
      }
    }

    const compIdResults = await this.companyRepository.getTableWhereData(
      ['id', 'companyName'],
      {
        where: { companyName: { [Op.in]: Array.from(companyNames) } },
      },
    );
    if (compIdResults == k500Error) throw new Error();
    console.log('compIdResults', compIdResults.length);

    let checkCompany = Array.from(companyNames);
    const compIdResultsSet = new Set(
      compIdResults.map((result) => result?.companyName),
    );

    for (const companyName of checkCompany) {
      if (!compIdResultsSet.has(companyName)) {
        console.log('companyName', companyName);
        const data = {
          companyName,
          forMigration: true,
        };
        await this.companyRepository.createRowData(data);
      }
    }
    return { checkCompany };
  }

  async funCibilFetchDateMigrate(reqData) {
    const cibilOptions: any = { where: { status: '1' } };
    if (reqData?.userId) cibilOptions.where.userId = reqData?.userId;
    const cibilList = await this.cibilScoreRepo.getTableWhereData(
      ['id', 'userId', 'scores'],
      cibilOptions,
    );
    if (cibilList == k500Error) throw new Error();
    for (let i = 0; i < cibilList.length; i++) {
      try {
        const ele = cibilList[i];
        let fetchDate = ele?.scores[0].scoreDate;
        if (!fetchDate) continue;
        fetchDate = this.typeService.strDateToDate(fetchDate);
        fetchDate = this.typeService.getGlobalDate(fetchDate).toJSON();
        const updateOption = {
          where: {
            id: ele?.id,
            fetchDate: null,
          },
        };
        await this.cibilScoreRepo.updateRowWhereData(
          { fetchDate },
          updateOption,
        );
      } catch (error) {}
    }
    return {};
  }

  async dpdAdditionInTransactions(body) {
    try {
      const startDate = body.startDate;
      if (!startDate) return kParamMissing('startDate');
      const endDate = body.endDate;
      if (!endDate) return kParamMissing('endDate');
      const emiInc = {
        model: EmiEntity,
        attributes: [
          'emi_date',
          'payment_done_date',
          'id',
          'payment_due_status',
          'penalty_days',
        ],
        where: { payment_due_status: '1' },
      };
      const loanInc = {
        model: loanTransaction,
        include: [emiInc],
        attributes: ['id'],
      };
      const TodayDate = new Date(startDate).toJSON();
      const tillDate = new Date(endDate).toJSON();
      const range = this.typeService.getUTCDateRange(TodayDate, tillDate);
      const dateRange = {
        [Op.gte]: range.fromDate,
        [Op.lte]: range.endDate,
      };
      const options = {
        where: { status: 'COMPLETED', createdAt: dateRange },
        include: [loanInc],
        order: [['id', 'DESC']],
      };
      const att = ['id', 'type', 'emiId', 'completionDate'];
      // Hit -> Query
      const transData = await this.transRepo.getTableWhereData(att, options);
      if (transData === k500Error) return kInternalError;

      for (let i = 0; i < transData.length; i++) {
        try {
          const element = transData[i];
          const emiData = element?.loanData?.emiData;
          const paymentDate: any = this.typeService.getGlobalDate(
            element.completionDate,
          );
          let transId = element.id;
          let maxDPD = 0;
          let instantaneousDelayDays = 0;
          emiData.forEach((ele) => {
            const emiDate: any = this.typeService.getGlobalDate(ele.emi_date);
            const emiDoneDate: any = ele.payment_done_date
              ? this.typeService.getGlobalDate(ele.payment_done_date)
              : null;
            if (
              emiDoneDate &&
              emiDoneDate < paymentDate &&
              ele?.payment_due_status != '1'
            )
              return;
            if (paymentDate > emiDate) {
              let delayDays = this.typeService.differenceInDays(
                paymentDate,
                emiDate,
              );
              if (
                emiDoneDate &&
                emiDoneDate < paymentDate &&
                ele?.payment_due_status == '1'
              )
                delayDays = ele?.penalty_days ?? 0;
              if (delayDays > 0) instantaneousDelayDays = delayDays;
              if (instantaneousDelayDays > maxDPD)
                maxDPD = instantaneousDelayDays;
            }
          });
          if (maxDPD === 0) continue;
          await this.transRepo.updateRowData({ maxDPD }, transId, true);
        } catch (error) {}
      }
    } catch (error) {}
  }

  async migrateActiveLoanAddress(limit: number, offset: number) {
    try {
      const query = `SELECT DISTINCT ON ("a"."userId") 
      "a".id, "a"."userId","a"."loanStatus", "b"."aadhaarAddress", "b"."aadhaarLatLong"
      FROM public."loanTransactions" as "a"
      INNER JOIN public."KYCEntities" as "b"
      ON "a"."userId" = "b"."userId"
      WHERE "a"."loanStatus" = 'Active'
      AND "b"."aadhaarAddress" is not null
      AND "b"."aadhaarLatLong" is not null
      AND "b"."aadhaarLatLong" != ''
      LIMIT ${limit}
      OFFSET ${offset};`;
      const loanData = await this.repoManager.injectRawQuery(
        loanTransaction,
        query,
      );
      if (!loanData || loanData == k500Error) throw new Error();

      const promise = loanData.map((loan) => {
        const userAddress = JSON.parse(loan.aadhaarAddress);
        const addressArray = Object.values(userAddress)
          .join(' ')
          .split(/[\s,-]+/);
        const address = addressArray.join(' ').trim();
        let latLngObject = JSON.parse(loan.aadhaarLatLong);
        let aadhaarLatLongPoint = null;
        if (latLngObject) {
          const lat = latLngObject['lat'];
          const lng = latLngObject['lng'];
          aadhaarLatLongPoint = `${lat},${lng}`;
        }
        return {
          aadhaarAddress: address,
          loanId: loan.id,
          userId: loan.userId,
          aadhaarLatLong: aadhaarLatLongPoint,
          isActive: true,
        };
      });

      const resolvedPromise = await Promise.all(promise);
      const data = await this.repoManager.bulkCreate(
        ActiveLoanAddressesEntity,
        resolvedPromise,
      );
      if (data == k500Error) throw new Error();

      if (loanData.length > 0)
        await this.migrateActiveLoanAddress(limit, offset + limit);
      return;
    } catch (error) {
      throw new Error(error);
    }
  }

  async addCompanyDataInCompanyRepo() {
    console.log('migration started');
    const rawQuery = `SELECT emp."companyName" as company1, google."companyName" as googComp
    FROM (
    SELECT UPPER("companyName") as "companyName" FROM public."EmploymentHistoryDetailsEntities"
    UNION
    SELECT UPPER("companyName") as "companyName" FROM public."employmentDetails"
    ) AS emp
    LEFT JOIN public."GoogleCompanyResultEntities" AS google
    ON emp."companyName" = google."companyName"
    WHERE google."companyName" IS NULL
    AND emp."companyName" != '' and  length(emp."companyName")<255
    LIMIT 5000`;

    const queryData: any = await this.repoManager.injectRawQuery(
      EmploymentHistoryDetailsEntity,
      rawQuery,
    );
    if (queryData == k500Error) throw new Error();
    if (queryData.length <= 0) return 'DONE';
    console.log('queryData.length', queryData.length);
    for (let i = 0; i < queryData.length; i++) {
      try {
        const element = queryData[i];
        const data = {
          companyName: element.company1.toUpperCase(),
          forMigration: true,
        };
        await this.companyRepository.createRowData(data);
      } catch (error) {
        console.log({ error });
      }
    }
    await this.addCompanyDataInCompanyRepo();
  }
}
