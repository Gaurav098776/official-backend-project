// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import {
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
  GLOBAL_RANGES,
  GLOBAL_FLOW,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kSuccessMessage,
} from 'src/constants/responses';
import { admin } from 'src/entities/admin.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { LocationEntity } from 'src/entities/location.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { VerificationPrepare } from './verification.prepare';
import {
  BAD_CIBIL_SCORE_MSG,
  CREDITANALYST,
  kAssignmentSuccessMessage,
  kFailed,
  kInitiated,
  kNoDataFound,
} from 'src/constants/strings';
import { RedisService } from 'src/redis/redis.service';
import { BankingRepository } from 'src/repositories/banking.repository';
import { UserStage } from 'src/constants/objects';
import {
  kLoanAcceptInfo,
  kSomthinfWentWrong,
  kSubmitTheDetails,
  kpleaseSubmitYourDetails,
  redirectKBankStatement,
  redirectKEmployment,
  redirectKReference,
  redirectKResidence,
  salaryMissingDetails,
  redirectKSelectLoanAmount,
  redirectKWorkMail,
  redirectKSalaryOrOffer,
} from 'src/constants/strings';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { CibilService } from 'src/shared/cibil.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { SequelOptions } from 'src/interfaces/include.options';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminService } from '../admin/admin.service';
import { AnalysisService } from '../analysis/analysis.service';
import { FileService } from 'src/utils/file.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { BankingSharedService } from 'src/shared/banking.service';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';

@Injectable()
export class AdminVerificationService {
  constructor(
    private readonly bankingRepo: BankingRepository,
    private readonly userRepository: UserRepository,
    private readonly cryptService: CryptService,
    private readonly prepareService: VerificationPrepare,
    private readonly typeService: TypeService,
    private readonly masterRepo: MasterRepository,
    private readonly employementRepo: EmploymentRepository,
    private readonly redisService: RedisService,
    private readonly sharedCommonService: CommonSharedService,
    private readonly salarySlipRepo: SalarySlipRepository,
    private readonly workMailRepo: WorkMailRepository,
    private readonly loanRepo: LoanRepository,
    private readonly notificationService: SharedNotificationService,
    private readonly commonService: CommonSharedService,
    private readonly userLogTrackerRepo: UserLogTrackerRepository,
    private readonly cibilService: CibilService,
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly adminRepo: AdminRepository,
    private readonly adminService: AdminService,
    private readonly analysisService: AnalysisService,
    private readonly fileService: FileService,
    private readonly repoManager: RepositoryManager,
    private readonly sharedbanking: BankingSharedService,
    private readonly changeLogsRepo: ChangeLogsRepository,
  ) {}

  //#endregion
  commonUserOptions(
    query: any = {},
    userWhere: any = {},
    userInclude: any = [],
    masterWhere: any = {},
    masterAttr: any = [],
    masterInc: any = [],
    veryType: any = [],
    filterFeild = null,
    userAttr: any = [],
    type = null,
  ) {
    try {
      let searchText = query?.searchText;
      const download = query?.download ?? 'false';
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const newOrRepeated = query?.newOrRepeated ?? null;
      const toDay = this.typeService.getGlobalDate(new Date());
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString: any = searchText.substring(2);
        if (firstTwoLetters == 'l-' || firstTwoLetters == 'L-')
          masterWhere.loanId = +restOfString;
        else {
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userWhere.phone = { [Op.iRegexp]: searchText };
          } else
            userWhere[Op.or] = [
              { fullName: { [Op.iRegexp]: searchText } },
              { email: { [Op.iRegexp]: searchText } },
            ];
        }
      }
      if (newOrRepeated == '1') userWhere.completedLoans = 0;
      else if (newOrRepeated == '0') userWhere.completedLoans = { [Op.gt]: 0 };
      const masterInclude: any = {
        model: MasterEntity,
        attributes: ['id', 'status', 'rejection', 'loanId', ...masterAttr],
        where: masterWhere,
        include: masterInc,
      };
      if (status == 0) {
        userWhere['NextDateForApply'] = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
        userWhere['isBlacklist'] = { [Op.ne]: '1' };
        masterWhere.status.loan = { [Op.ne]: 2 };
      }
      if (status != '0' && query.startDate && query.endDate && filterFeild) {
        const range: any = this.typeService.getUTCDateRange(
          query.startDate,
          query.endDate,
        );
        range.fromDate = new Date(range.fromDate).getTime();
        range.endDate = new Date(range.endDate).getTime();
        masterWhere.dates = {
          [filterFeild]: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        };
      }
      let mainOptions: any = {};
      if (query.status == '0') {
        mainOptions = {
          where: {
            ...userWhere,
          },
          include: [...userInclude, masterInclude],
        };
      } else {
        const userMainInclude: any = {
          model: registeredUsers,
          attributes: [
            'id',
            'fullName',
            'phone',
            'createdAt',
            'completedLoans',
            ...userAttr,
          ],
          where: {
            ...userWhere,
          },
          required: true,
          include: [...userInclude],
        };
        const masterInclude = {
          required: true,
          where: masterWhere,
          model: MasterEntity,
          attributes: [...masterAttr, 'status', 'rejection', 'loanId', 'dates'],
          include: [...masterInc],
        };
        if (type == 'EMP') {
          mainOptions = {
            include: [userMainInclude, masterInclude],
            order: [['verifiedDate', 'DESC']],
          };
        } else {
          mainOptions = {
            where: masterWhere,
            include: [...masterInc, userMainInclude],
            order: [[`dates.${filterFeild}::timestamp`, 'ASC']],
          };
        }
      }
      if (status != '0' && download != 'true') {
        mainOptions.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        mainOptions.limit = PAGE_LIMIT;
      }
      return mainOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getEmployementVerificationData(query) {
    try {
      const empOption = await this.prepareEmployementOptions(query);
      if (empOption.message) return kInternalError;
      let data: any = [];

      const attr = [
        'id',
        'userId',
        'companyName',
        'companyPhone',
        'companyUrl',
        'createdAt',
        'companyAddress',
        'companyStatusApproveByName',
        'companyVerification',
        'updatedAt',
        'verifiedDate',
        'rejectReason',
      ];
      data = await this.employementRepo.getTableWhereDataWithCounts(
        attr,
        empOption,
      );
      if (data == k500Error) return kInternalError;
      data.rows = await this.prepareService.prepareCompanyData(data.rows);
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareEmployementOptions(query) {
    try {
      const status = query?.status ?? '0';
      // Salary slip table join
      const salarySlipAttributes = [
        'approveById',
        'url',
        'status',
        'salaryVerifiedDate',
        'createdAt',
        'updatedAt',
        'netPayAmount',
        'rejectReason',
        'approveById',
      ];
      const salaryInclude = {
        model: SalarySlipEntity,
        attributes: salarySlipAttributes,
      };
      // Work mail table join
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['approveById', 'id', 'status', 'email', 'rejectReason'],
      };
      let userWhere: any = {};
      let masterWhere: any = {};
      if (status == '2')
        masterWhere.status = {
          [Op.and]: {
            bank: { [Op.ne]: '-1' },
            [Op.or]: [{ company: 2 }, { workMail: 2 }, { salarySlip: 2 }],
          },
        };
      else if (status == '1') {
        const approvedStatus = [1, 3, 4];
        masterWhere.status = {
          [Op.and]: {
            bank: { [Op.ne]: '-1' },
            company: { [Op.or]: approvedStatus },
            workMail: { [Op.or]: approvedStatus },
            salarySlip: { [Op.or]: approvedStatus },
          },
        };
      } else {
        const allStatus = [1, 2, 3, 0, 4];
        masterWhere.status = {
          [Op.and]: {
            bank: { [Op.ne]: '-1' },
            company: { [Op.or]: allStatus },
            workMail: { [Op.or]: allStatus },
            salarySlip: { [Op.or]: allStatus },
          },
        };
      }
      const attr = [
        'id',
        'userId',
        'companyName',
        'companyPhone',
        'companyUrl',
        'companyAddress',
        'companyStatusApproveByName',
        'companyVerification',
        'updatedAt',
        'rejectReason',
      ];
      const empInclude: any = {
        model: employmentDetails,
        attributes: attr,
        required: true,
      };
      const masterInclude = [empInclude, salaryInclude, workMailInclude];
      const userOptions = this.commonUserOptions(
        query,
        userWhere,
        [],
        masterWhere,
        ['rejection', 'salarySlipId', 'workMailId', 'loanId', 'empId'],
        masterInclude,
        ['EMPLOYMENT'],
        'employment',
        [],
        'EMP',
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareBankOptions(query) {
    try {
      const status = query?.status ?? '0';
      const adminId = query?.adminId;

      const userWhere: any = {};
      const masterWhere: any = {};
      const previousCon = {
        company: { [Op.in]: [1, 3] },
        workMail: { [Op.in]: [1, 3, 4] },
        salarySlip: { [Op.in]: [1, 3] },
      };
      if (status == '0')
        masterWhere.status = {
          ...previousCon,
          bank: +status,
        };
      else if (status == '1')
        masterWhere.status = {
          bank: { [Op.or]: [1, 3] },
        };
      else if (status == '2')
        masterWhere.status = { bank: 2, loan: { [Op.ne]: 2 } };
      else if (status == '5') masterWhere.status = { loan: 2, bank: 2 };
      else
        masterWhere.status = {
          ...previousCon,
          bank: { [Op.or]: [1, 2, 3, 0] },
        };

      if (adminId) masterWhere.bankAssingId = adminId;
      const bankingInclude = {
        model: BankingEntity,
        attributes: [
          'id',
          'userId',
          'name',
          'accountNumber',
          'bankStatement',
          'bank',
          'adminId',
          'salary',
          'salaryDate',
          'rejectReason',
          'status',
          'salaryVerification',
          'attempts',
          'additionalBankStatement',
          'isNeedAdditional',
          'additionalURLs',
          'createdAt',
          'updatedAt',
          'isNeedTagSalary',
          'assignedTo',
          'otherDetails',
        ],

        required: true,
      };
      const attr = [
        'id',
        'userId',
        'companyName',
        'companyPhone',
        'companyUrl',
        'companyAddress',
        'salary',
        'salaryDate',
        'updatedAt',
      ];
      const empInclude: any = {
        model: employmentDetails,
        attributes: attr,
        required: true,
      };
      const loanData = {
        attributes: ['id', 'loanStatus', 'createdAt'],
        model: loanTransaction,
        include: [bankingInclude],
        required: true,
      };
      const cibilInclude = {
        model: CibilScoreEntity,
        attributes: ['id', 'userId', 'cibilScore', 'plScore'],
        required: false,
      };
      const masterInclude = [loanData, empInclude];
      const userOptions = this.commonUserOptions(
        query,
        userWhere,
        [cibilInclude],
        masterWhere,
        ['bankAssingId'],
        masterInclude,
        ['NETBANKING'],
        'banking',
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetBankStatementVerificationData(query) {
    try {
      const bankOptions = await this.prepareBankOptions(query);
      query.status = query?.status ?? '0';
      if (bankOptions.message) return kInternalError;
      const attributes = ['id', 'fullName', 'city', 'phone', 'completedLoans'];
      let data: any = [];
      if (query.status == '0')
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          bankOptions,
        );
      else {
        const masterAttributes = ['id', 'loanId', 'dates', 'bankAssingId'];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          masterAttributes,
          bankOptions,
        );
      }
      if (data == k500Error) return kInternalError;
      data.rows = await this.prepareService.prepareBankingRowData(
        data.rows,
        query,
      );
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareResidenceOptions(query) {
    try {
      if (!query.status) return kParamMissing('status');
      if (query.status != '0' && !query.download)
        if (!query.page) return kParamMissing('page');
      const status = query.status;
      const userWhere: any = {};
      const masterWhere: any = {};
      const approvedStatus = [1, 3];
      const empApprovedStatus = [1, 3, 4];
      const empApproved = {
        company: { [Op.or]: empApprovedStatus },
        workMail: { [Op.or]: empApprovedStatus },
        salarySlip: { [Op.or]: empApprovedStatus },
      };
      if (status == '0') {
        masterWhere.status = {
          ...empApproved,
          bank: { [Op.or]: approvedStatus },
          residence: 0,
        };
      } else if (status == '1') {
        masterWhere.status = { residence: { [Op.or]: approvedStatus } };
      } else if (status == '2') {
        masterWhere.status = {
          residence: +status,
        };
      } else {
        masterWhere.status = {
          ...empApproved,
          bank: { [Op.or]: approvedStatus },
          residence: { [Op.or]: [1, 3, 0, 2] },
        };
      }
      const masterAttr = ['otherInfo'];
      const locationInclude = {
        required: false,
        model: LocationEntity,
        attributes: ['id', 'location'],
      };
      const userAttr = [
        'homeProofImage',
        'homeType',
        'pinAddress',
        'homeStatus',
        'typeAddress',
        'residenceRejectReason',
        'residenceProofApproveByName',
        'homeProofType',
        'residenceAdminId',
        'contactApprovedId',
        'createdAt',
      ];
      const userOptions = this.commonUserOptions(
        query,
        userWhere,
        [locationInclude],
        masterWhere,
        masterAttr,
        [],
        ['RESIDENCE'],
        'residence',
        userAttr,
      );
      if (userOptions.message) return kInternalError;
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funResidenceVerification(query) {
    try {
      const userOptions = this.prepareResidenceOptions(query);
      if (userOptions.message) return userOptions;
      const attributes = [
        'id',
        'fullName',
        'city',
        'phone',
        'completedLoans',
        'homeProofImage',
        'homeType',
        'pinAddress',
        'homeStatus',
        'typeAddress',
        'createdAt',
        'residenceRejectReason',
        'residenceProofApproveByName',
        'homeProofType',
      ];
      let data: any = [];
      if (query.status == '0')
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      else {
        const masterAttributes = [
          'id',
          'coolOffData',
          'status',
          'rejection',
          'dates',
          'loanId',
          'empId',
          'userId',
          'otherInfo',
        ];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          masterAttributes,
          userOptions,
        );
      }

      if (data == k500Error) return kInternalError;
      data.rows = this.prepareService.prepareResidenceData(data.rows);
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async preapareSelfieOptions(query) {
    try {
      const status = query?.status ?? '0';
      const kycInclude = {
        model: KYCEntity,
        attributes: ['id', 'aadhaarFront', 'profileImage'],
      };
      const selfieInclude: any = {
        model: UserSelfieEntity,
        attributes: [
          'id',
          'image',
          'status',
          'tempImage',
          'adminId',
          'response',
          'rejectReason',
          'updatedAt',
        ],
      };
      const approvedStatus = [1, 3];
      const empApproved = [1, 3, 4];
      const masterWhere: any = {};
      const previouspproved = {
        company: { [Op.or]: empApproved },
        workMail: { [Op.or]: empApproved },
        salarySlip: { [Op.or]: empApproved },
        bank: { [Op.or]: approvedStatus },
      };
      if (status == '0') {
        masterWhere.status = {
          ...previouspproved,
          selfie: 0,
        };
      } else if (status == '1')
        masterWhere.status = {
          selfie: { [Op.or]: approvedStatus },
        };
      else if (status == '2') masterWhere.status = { selfie: +status };
      else
        masterWhere.status = {
          selfie: { [Op.or]: [1, 2, 3, 0] },
        };
      const userInclude = [selfieInclude, kycInclude];
      const userAttr = ['selfieId', 'kycId'];
      const userOptions = this.commonUserOptions(
        query,
        {},
        userInclude,
        masterWhere,
        ['dates'],
        [],
        ['SELFIE'],
        'selfie',
        userAttr,
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funSelfieVerification(query) {
    try {
      const userOptions: any = await this.preapareSelfieOptions(query);
      if (userOptions.message) return userOptions;
      const attributes = ['id', 'fullName', 'phone', 'city', 'completedLoans'];
      let data: any = [];
      if (query.status == '0')
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      else {
        const masterAttributes = [
          'id',
          'coolOffData',
          'status',
          'rejection',
          'dates',
          'loanId',
          'empId',
          'userId',
        ];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          masterAttributes,
          userOptions,
        );
      }
      if (data == k500Error) return kInternalError;
      const finalData: any = this.prepareService.prepareSelfieVerificationData(
        data.rows,
      );
      if (finalData.message) return finalData;
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funContactVerificaion(query) {
    try {
      const status = query?.status ?? '0';
      const empApproved = ['1', '3', '4'];
      const approvedStatus = ['1', '3'];
      const masterWhere: any = {};
      const previouspproved = {
        company: { [Op.or]: empApproved },
        workMail: { [Op.or]: empApproved },
        salarySlip: { [Op.or]: empApproved },
        residence: { [Op.or]: approvedStatus },
        selfie: { [Op.or]: approvedStatus },
        bank: { [Op.or]: approvedStatus },
        reference: { [Op.ne]: -1 },
      };
      if (status == '0') {
        masterWhere.status = {
          ...previouspproved,
          contact: 0,
        };
      } else if (status == '1') {
        masterWhere.status = { contact: { [Op.or]: approvedStatus } };
      } else if (status == '2') {
        masterWhere.status = { contact: +status };
      } else
        masterWhere.status = {
          ...previouspproved,
          contact: { [Op.or]: ['1', '2', '3', '0'] },
        };

      const userAttr = ['contactApprovedId', 'totalContact'];
      const userOptions = this.commonUserOptions(
        query,
        {},
        [],
        masterWhere,
        [],
        [],
        ['CONTACT'],
        'contact',
        userAttr,
      );
      if (userOptions.message) return userOptions;
      const attributes = [
        'id',
        'fullName',
        'city',
        'completedLoans',
        'totalContact',
      ];
      let data: any = [];
      if (query.status == '0') {
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      } else {
        const attributes = ['id', 'status', 'dates', 'rejection', 'loanId'];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      }
      if (data == k500Error) return kInternalError;

      const finalData: any = await this.prepareService.prepareContactData(
        data.rows,
      );
      if (finalData.message) return kInternalError;
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareKycOptions(query) {
    try {
      const status = query.status;
      let masterWhere: any = {};
      const approvedStatus = [1, 3];
      const empStatus = [1, 3, 4];

      const kycAttr = [
        'id',
        'userId',
        'maskedAadhaar',
        'aadhaarStatus',
        'aadhaarFront',
        'aadhaarBack',
        'aadhaarVerifiedAdmin',
        'aadhaarRejectReason',
        'aadhaarResponse',
        'pan',
        'panCardNumber',
        'panStatus',
        'panResponse',
        'panVerifiedAdmin',
        'panUploadedAdmin',
        'panRejectReason',
        'otherDocType',
        'otherDocFront',
        'otherDocBack',
        'otherDocStatus',
        'otherDocResponse',
        'otherDocRejectReason',
        'otherDocVerifiedAdmin',
        'otherDocUploadedAdmin',
      ];
      let kycInclude = {
        model: KYCEntity,
        attributes: kycAttr,
      };
      const userInclude = [kycInclude];
      const previouspproved = {
        company: { [Op.or]: empStatus },
        workMail: { [Op.or]: empStatus },
        salarySlip: { [Op.or]: empStatus },
        residence: { [Op.or]: approvedStatus },
        contact: { [Op.or]: approvedStatus },
        bank: { [Op.or]: approvedStatus },
      };
      if (status == 0) {
        masterWhere = {
          status: {
            ...previouspproved,
            pan: 0,
          },
        };
      } else if (status == 1) {
        masterWhere.status = {
          aadhaar: { [Op.or]: approvedStatus },
          pan: { [Op.or]: approvedStatus },
        };
      } else if (status == 2) {
        masterWhere.status = {
          [Op.or]: [{ aadhaar: status }, { pan: status }],
        };
      } else {
        const allStatus = [1, 2, 3, 0];
        masterWhere.status = {
          ...previouspproved,
          [Op.or]: [
            { aadhaar: { [Op.or]: allStatus } },
            { pan: { [Op.or]: allStatus } },
          ],
        };
      }
      const userAttr = ['kycId', 'completedLoans', 'phone', 'city'];
      const userOptions = this.commonUserOptions(
        query,
        {},
        userInclude,
        masterWhere,
        [],
        [],
        ['KYC'],
        'pan',
        userAttr,
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funKycVerification(query) {
    try {
      const userOptions = this.prepareKycOptions(query);
      const attributes = [
        'id',
        'fullName',
        'phone',
        'city',
        'completedLoans',
        'lastOnlineTime',
      ];
      let data: any = [];
      if (query.status == '0')
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      else {
        const masterAttributes = [
          'id',
          'coolOffData',
          'status',
          'rejection',
          'dates',
          'loanId',
          'empId',
          'userId',
        ];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          masterAttributes,
          userOptions,
        );
      }
      if (data == k500Error) return kInternalError;
      const finalData: any =
        await this.prepareService.prepareKycVerificationData(data.rows);
      if (finalData.message) return finalData;
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareFinalVerificationOptions(query) {
    try {
      const status = query?.status ?? 0;
      const adminId = query.adminId;
      const masterWhere: any = {};
      const approvedStatus = [1, 3];
      const empStatus = [1, 3, 4];

      const previouspproved = {
        company: { [Op.or]: empStatus },
        workMail: { [Op.or]: empStatus },
        salarySlip: { [Op.or]: empStatus },
        residence: { [Op.or]: approvedStatus },
        contact: { [Op.or]: approvedStatus },
        bank: { [Op.or]: approvedStatus },
      };
      if (status == 0) {
        masterWhere.status = {
          ...previouspproved,
          loan: 0,
          eligibility: 0,
        };
      } else if (status == 1) {
        masterWhere.status = {
          eligibility: { [Op.or]: approvedStatus },
        };
      } else if (status == 2) {
        masterWhere.status = {
          ...previouspproved,
          eligibility: +status,
        };
      } else {
        const allStatus = [0, 1, 3, 2];
        masterWhere.status = {
          ...previouspproved,
          eligibility: { [Op.or]: allStatus },
        };
      }
      if (adminId) masterWhere.loanAssingId = adminId;
      const loanAttr = [
        'id',
        'manualVerification',
        'empId',
        'userId',
        'loanAmount',
        'netApprovedAmount',
        'manualVerificationAcceptName',
        'manualVerificationAcceptId',
        'prediction',
        'updatedAt',
        'bankingId',
        'remark',
        'loanRejectReason',
        'approvedReason',
        'categoryTag',
      ];
      const loanInclude = {
        model: loanTransaction,
        attributes: loanAttr,
        include: [
          { model: PredictionEntity, attributes: ['reason'], required: false },
          {
            model: admin,
            as: 'adminData',
            attributes: ['id', 'fullName'],
            required: false,
          },
          {
            model: BankingEntity,
            attributes: [
              'id',
              'salary',
              'adminSalary',
              'disbursementIFSC',
              'salaryVerification',
              'assignedTo',
            ],
          },
        ],
      };
      const loanAssignInclude = {
        model: admin,
        as: 'loanAssignData',
        attributes: ['id', 'fullName'],
        required: false,
      };
      const userOptions = this.commonUserOptions(
        query,
        {},
        [],
        masterWhere,
        ['loanAssingId'],
        [loanInclude, loanAssignInclude],
        ['FINALBUCKET'],
        'eligibility',
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async funFinalVerificationData(query) {
    try {
      const userOptions = this.prepareFinalVerificationOptions(query);
      if (userOptions.message) return userOptions;
      const attributes = [
        'id',
        'fullName',
        'phone',
        'city',
        'completedLoans',
        'lastOnlineTime',
      ];
      let data: any = [];
      if (query.status == '0')
        data = await this.userRepository.getTableWhereDataWithCounts(
          attributes,
          userOptions,
        );
      else {
        const masterAttributes = [
          'id',
          'coolOffData',
          'status',
          'rejection',
          'dates',
          'loanId',
          'empId',
          'userId',
        ];
        data = await this.masterRepo.getTableWhereDataWithCounts(
          masterAttributes,
          userOptions,
        );
      }
      if (data == k500Error) return kInternalError;
      const finalData = await this.prepareService.prepareFinalVerificationData(
        data.rows,
      );
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareEmandateOptions(query) {
    try {
      const subscriptionInclude: any = { model: SubScriptionEntity };
      subscriptionInclude.required = false;
      subscriptionInclude.attributes = [
        'id',
        'accountNumber',
        'subType',
        'mode',
        'status',
        'createdAt',
        'updatedAt',
        'invitationLink',
        'response',
      ];

      const bankInclude = {
        model: BankingEntity,
        attributes: ['mandateBank', 'mandateAccount', 'mandateBank'],
      };
      const include = [subscriptionInclude, bankInclude];
      const loanAttr = [
        'id',
        'mandateAttempts',
        'updatedAt',
        'netApprovedAmount',
      ];
      const loanInclude = {
        model: loanTransaction,
        attributes: loanAttr,
        include,
      };
      let pending = [0, -1, 2];
      const masterWhere = {
        status: {
          [Op.and]: [
            { eligibility: { [Op.in]: [1, 3] } },
            { loan: { [Op.in]: [1, 3] } },
            { eMandate: { [Op.in]: pending } },
          ],
        },
      };
      const userOptions = this.commonUserOptions(
        query,
        {},
        [],
        masterWhere,
        [],
        [loanInclude],
        ['MANDATE'],
      );
      return userOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funEmandateVerificationData(query) {
    try {
      query.status = '0';
      const userOptions: any = this.prepareEmandateOptions(query);
      if (userOptions.message) return userOptions;
      const attributes = [
        'id',
        'fullName',
        'phone',
        'city',
        'completedLoans',
        'lastOnlineTime',
        'typeOfDevice',
      ];
      const data: any = await this.userRepository.getTableWhereDataWithCounts(
        attributes,
        userOptions,
      );
      if (data == k500Error) return kInternalError;
      const finalData: any = this.prepareService.prepareMandateData(data.rows);
      if (finalData.message) return finalData;
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funEsignVerificationData(query) {
    try {
      query.status = '0';
      const esignInclude = {
        model: esignEntity,
        attributes: [
          'id',
          'quick_invite_url',
          'updatedAt',
          'createdAt',
          'nameMissMatch',
          'name_as_per_aadhaar',
          'response',
          'status',
        ],
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'esign_id', 'netApprovedAmount'],
        include: [esignInclude],
      };
      const approvedStatus = [1, 3];
      const masterWhere = {
        status: {
          eligibility: { [Op.or]: [1, 3] },
          loan: { [Op.or]: [1, 3] },
          eMandate: { [Op.or]: approvedStatus },
          eSign: { [Op.or]: [-1, 0] },
        },
      };
      const userOptions = this.commonUserOptions(
        query,
        {},
        [],
        masterWhere,
        [],
        [loanInclude],
        ['ESIGN'],
      );
      if (userOptions.message) return userOptions;
      const attributes = [
        'id',
        'fullName',
        'city',
        'completedLoans',
        'lastOnlineTime',
      ];
      const data = await this.userRepository.getTableWhereDataWithCounts(
        attributes,
        userOptions,
      );
      if (data == k500Error) return kInternalError;
      const finalData: any = this.prepareService.prepareEsignVerificationData(
        data.rows,
        query.download,
      );
      if (finalData.message) return finalData;
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funDisburesementVerificationData(query) {
    try {
      query.status = '0';

      const disbursementInclude: any = {
        distinct: true,
        model: disbursementEntity,
        attributes: ['id', 'status', 'bank_name', 'response'],
      };
      const loanInclude: any = {
        model: loanTransaction,
        attributes: ['id', 'netApprovedAmount'],
        distinct: true,
        include: [disbursementInclude],
      };
      const masterWhere = {
        status: {
          eligibility: { [Op.or]: [1, 3] },
          loan: { [Op.or]: [1, 3] },
          eSign: 1,
          eMandate: 1,
          disbursement: { [Op.or]: [0, -1] },
        },
      };
      const userOptions = this.commonUserOptions(
        query,
        {},
        [],
        masterWhere,
        [],
        [loanInclude],
        ['DISBURSEMENT'],
      );
      if (userOptions.message) return kInternalError;
      const attributes = [
        'id',
        'fullName',
        'city',
        'phone',
        'completedLoans',
        'lastOnlineTime',
      ];
      const data: any = await this.userRepository.getTableWhereDataWithCounts(
        attributes,
        userOptions,
      );
      if (data == k500Error) return kInternalError;
      const finalData = await this.prepareService.prepareDisbursementData(
        data.rows,
      );
      data.rows = finalData;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetAllVerificationCount() {
    try {
      const verificationObj = {
        employement: 0,
        banking: 0,
        residence: 0,
        selfie: 0,
        contact: 0,
        kyc: 0,
        finalVerification: 0,
        mandate: 0,
        esign: 0,
        disbursement: 0,
      };
      let masterWhere: any = {};
      const approvedStatus = [1, 3];

      masterWhere.status = {
        [Op.and]: {
          loan: { [Op.in]: [-1, -2, 7] },
          bank: { [Op.in]: [0, 1, 3, 4] },
          company: { [Op.ne]: 2 },
          salarySlip: { [Op.ne]: 2 },
          workMail: { [Op.ne]: 2 },
          [Op.or]: [{ company: 0 }, { workMail: 0 }, { salarySlip: 0 }],
        },
      };
      verificationObj.employement = await this.getVerificationCount(
        masterWhere,
      );
      const empApproved = [1, 3, 4];
      const previouspproved: any = {
        bank: { [Op.ne]: -1 },
        company: { [Op.or]: empApproved },
        workMail: { [Op.or]: empApproved },
        salarySlip: { [Op.or]: empApproved },
      };
      masterWhere.status = {
        ...previouspproved,
        bank: 0,
      };
      verificationObj.banking = await this.getVerificationCount(masterWhere);
      previouspproved.bank = { [Op.or]: approvedStatus };
      masterWhere.status = {
        ...previouspproved,
        residence: 0,
      };
      verificationObj.residence = await this.getVerificationCount(masterWhere);
      previouspproved.residence = { [Op.or]: approvedStatus };
      masterWhere.status = {
        ...previouspproved,
        selfie: 0,
      };
      verificationObj.selfie = await this.getVerificationCount(masterWhere);
      previouspproved.selfie = { [Op.or]: approvedStatus };
      previouspproved.reference = { [Op.ne]: -1 };
      masterWhere.status = {
        ...previouspproved,
        contact: 0,
      };
      verificationObj.contact = await this.getVerificationCount(masterWhere);
      previouspproved.contact = { [Op.or]: approvedStatus };
      masterWhere = {
        status: {
          ...previouspproved,
          pan: 0,
        },
      };
      verificationObj.kyc = await this.getVerificationCount(masterWhere);
      previouspproved.pan = { [Op.or]: approvedStatus };
      masterWhere.status = {
        ...previouspproved,
        eligibility: 0,
        loan: 0,
      };
      verificationObj.finalVerification = await this.getVerificationCount(
        masterWhere,
      );
      masterWhere = {
        status: {
          [Op.and]: {
            eligibility: { [Op.or]: [1, 3] },
            loan: { [Op.or]: [1, 3] },
            eMandate: { [Op.or]: [0, -1, 2] },
          },
        },
      };
      verificationObj.mandate = await this.getVerificationCount(masterWhere);
      masterWhere.status = {
        eligibility: { [Op.or]: [1, 3] },
        loan: { [Op.or]: [1, 3] },
        eMandate: 1,
        eSign: { [Op.or]: [-1, 0] },
      };
      verificationObj.esign = await this.getVerificationCount(masterWhere);
      masterWhere.status = {
        eligibility: { [Op.or]: [1, 3] },
        loan: { [Op.or]: [1, 3] },
        eMandate: 1,
        eSign: 1,
        disbursement: { [Op.or]: [-1, 0] },
      };
      verificationObj.disbursement = await this.getVerificationCount(
        masterWhere,
      );
      return verificationObj;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getVerificationCount(masterWhere: any = {}) {
    try {
      const toDay = this.typeService.getGlobalDate(new Date());
      const userOptions: any = {
        where: {
          isBlacklist: { [Op.ne]: '1' },
          NextDateForApply: {
            [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
          },
        },
      };
      masterWhere.status.loan = { [Op.ne]: 2 };
      const masterInclude = { model: MasterEntity, where: masterWhere };
      userOptions.include = [masterInclude];
      const data = await this.userRepository.getCountsWhere(userOptions);
      if (data === k500Error) return 0;
      return data;
    } catch (error) {
      return 0;
    }
  }

  async updateDates() {
    try {
      const data = await this.masterRepo.getTableWhereData(['id', 'dates'], {});
      if (data == k500Error) return kInternalError;
      for (let i = 0; i < data.length; i++) {
        try {
          const each = data[i];
          await this.masterRepo.updateRowData({ dates: each.dates }, each.id);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get redirect row Data
  private async getRedirectRowData(loanId, type: string = '') {
    try {
      const loanInclude = {
        model: loanTransaction,
        attributes: ['bankingId'],
        where: {
          loanStatus: ['InProcess', 'Accepted'],
          id: loanId,
        },
      };
      const options: any = {
        where: { status: { loan: { [Op.or]: [-2, -1, 0, 4, 5] } }, loanId },
        include: [loanInclude],
      };
      const att = ['id', 'status'];
      if (type) {
        options.include.push({
          model: registeredUsers,
          attributes: ['id', 'fcmToken'],
        });
        att.push(
          ...[
            'dates',
            'rejection',
            'userId',
            'empId',
            'workMailId',
            'salarySlipId',
          ],
        );
      }
      const masterData = await this.masterRepo.getRowWhereData(att, options);
      if (masterData == k500Error) return kInternalError;
      return masterData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get redirect list
  private getRedirectList(status) {
    const statusList = [0, 1, 3, 4, 5, 6];
    const finalList = [];
    /// company
    if (statusList.includes(status?.company))
      finalList.push(redirectKEmployment);

    /// salarySlip
    if (statusList.includes(status?.salarySlip)) {
      finalList.push(redirectKSalaryOrOffer);
    }

    /// workMail
    if (statusList.includes(status?.workMail))
      finalList.push(redirectKWorkMail);

    /// bank
    if (statusList.includes(status?.bank))
      finalList.push(redirectKBankStatement);

    /// residence
    if (
      [0, 1, 3, 7, 8].includes(status?.residence) &&
      GLOBAL_FLOW.RESIDENCE_IN_APP
    )
      finalList.push(redirectKResidence);

    return finalList;
  }
  //#endregion

  // User tracking logs
  async getUserTrackingLogs(reqData) {
    try {
      // Params validation
      const loanId = reqData?.loanId;
      const isDownload = reqData?.download == 'true' ?? 'false';
      if (!loanId) return kParamMissing('loanId');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      // Table joins
      const disbursementInclude: any = { model: disbursementEntity };
      disbursementInclude.attributes = ['createdAt'];
      disbursementInclude.required = false;
      const include = [disbursementInclude];

      const attributes = ['id', 'loanStatus', 'updatedAt'];
      const options = { include, order: [['id', 'ASC']], where: { userId } };
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      const index = loanList.findIndex((el) => el.id == loanId);
      const firstLoan = index == 0;
      const loanData = loanList[index];
      let maxDate;
      if (
        loanData.loanStatus == 'Active' ||
        loanData.loanStatus == 'Complete'
      ) {
        const disbursementList = loanData.disbursementData ?? [];
        if (disbursementList.length > 0)
          maxDate = disbursementList[0].createdAt;
      } else if (loanData.loanStatus == 'Rejected')
        maxDate = loanData.updatedAt;

      const logAttr = [
        'id',
        'userId',
        'loanId',
        'stage',
        'createdAt',
        'ip',
        'deviceId',
        'city',
        'ipLocation',
        'ipCountry',
        'otherDetails',
      ];
      const where: any = {
        loanId,
        stage: { [Op.ne]: 'Payment Order Created' },
      };
      if (firstLoan) {
        where.userId = userId;
        where.loanId = { [Op.or]: [loanId, null] };
      }
      const LogOptions = { order: [['id', 'ASC']], where };
      const logList = await this.userLogTrackerRepo.getTableWhereData(
        logAttr,
        LogOptions,
      );
      if (logList == k500Error) return kInternalError;
      const data = await this.prepareData(logList);

      if (isDownload) {
        const rawExcelData = {
          sheets: ['User Logs'],
          data: [data],
          sheetName: 'User Logs.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region Update Redirect to specific step
  async redirectToSpecificStep(body): Promise<any> {
    try {
      const loanId = body?.loanId;
      const type = body?.type;
      if (!body?.adminId || !loanId || !type) return kParamMissing();
      /// find Data
      const masterData = await this.getRedirectRowData(loanId, type);
      if (masterData?.message) return masterData;
      if (!masterData) return k422ErrorMessage(kSomthinfWentWrong);
      /// prepare list and check type is exite
      const finalList = this.getRedirectList(masterData?.status);
      const find = finalList.find((f) => f.key === type);
      if (!find) return k422ErrorMessage(kSomthinfWentWrong);
      /// reject steps
      await this.rejectRedirectStep(masterData, body, loanId);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region reject redirect step
  private async rejectRedirectStep(masterData, body, loanId) {
    try {
      const type = body?.type;
      const adminId = body?.adminId;
      let content = body?.content ?? '';
      let title = body?.title ?? '';
      const status = masterData?.status;
      const dates = masterData?.dates;
      const rejection = masterData?.rejection;
      const updateData: any = { status, dates, rejection };
      const statusList = [0, 1, 3, 4, 5, 6];
      let selectLoanAmount = false;
      let selectCompany = false;
      let sendNotification = false;

      //#region Company
      if (type == redirectKEmployment.key) {
        if (statusList.includes(status.salarySlip)) {
          await this.rejectCompany(masterData, updateData, content, adminId);
          selectCompany = true;
          sendNotification = true;
        }
      }
      //#endregion

      //#region salary slip
      if (type == redirectKSalaryOrOffer.key || selectCompany) {
        if (statusList.includes(status.salarySlip)) {
          await this.rejectSalarySlip(masterData, updateData, content, adminId);
          sendNotification = true;
        }
      }
      //#endregion

      //#region work mail
      if (type == redirectKWorkMail.key || selectCompany) {
        if (statusList.includes(status.workMail)) {
          await this.rejectWorkMail(masterData, updateData, content, adminId);
          sendNotification = true;
        }
      }
      //#endregion

      //#region Residence
      if (type == redirectKResidence.key) {
        if (statusList.includes(status.residence)) {
          await this.rejectResidence(masterData, updateData, content, adminId);
          sendNotification = true;
        }
      }
      //#endregion

      //#region Reference
      if (type == redirectKReference.key) {
        if (statusList.includes(status.reference)) {
          await this.rejectReference(masterData, updateData, content, adminId);
          sendNotification = true;
        }
      }
      //#endregion

      //#region bank
      if (type == redirectKBankStatement.key || selectCompany) {
        if (statusList.includes(status.bank)) {
          await this.rejectBank(masterData, updateData, content, adminId);
          selectLoanAmount = true;
          sendNotification = true;
        }
      }
      //#endregion

      //#region Select loan amount routs
      if (type == redirectKSelectLoanAmount.key || selectLoanAmount) {
        const loan = status.loan;
        if (loan == 0 || loan == 4 || loan == 5) {
          await this.selectLoanAmount(updateData, loanId);
          sendNotification = true;
          if (!selectLoanAmount) {
            title = kLoanAcceptInfo.title;
            content =
              'You are eligible for the loan. Accept the loan to proceed further';
          }
        }
      }
      //#endregion

      /// update master
      const id = masterData.id;
      const result = await this.masterRepo.updateRowData(updateData, id);
      if (result == k500Error) return kInternalError;

      const fcmToken = masterData?.userData?.fcmToken;
      if (!content) {
        title = kSubmitTheDetails;
        content = kpleaseSubmitYourDetails;
      }
      if (fcmToken && content && sendNotification) {
        await this.notificationService.sendPushNotification(
          fcmToken,
          title ?? kSubmitTheDetails,
          content,
          {},
          true,
          adminId,
          { userId: masterData?.userId },
        );
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region reject company
  private async rejectCompany(masterData, updateData, content, approveById) {
    try {
      updateData.status.company = 2;
      updateData.dates.employment = new Date().getTime();
      updateData.rejection.company = content;
      updateData.companyAdminId = approveById;
      const id = masterData.empId;
      if (!id) return kInternalError;
      /// update Company entity
      const update = {
        companyVerification: '2',
        companyStatusApproveById: approveById,
      };
      const result = await this.salarySlipRepo.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {}
  }

  //#region reject salary slip
  private async rejectSalarySlip(masterData, updateData, content, approveById) {
    try {
      updateData.status.salarySlip = 2;
      updateData.dates.employment = new Date().getTime();
      updateData.rejection.salarySlip = content;
      updateData.salarySlipAdminId = approveById;
      const id = masterData.salarySlipId;
      if (!id) return kInternalError;
      /// update salary slip entity
      const salaryVerifiedDate = this.typeService.getGlobalDate(new Date());
      const update: any = { salaryVerifiedDate, status: '2', approveById };
      update.rejectReason = content;
      const result = await this.salarySlipRepo.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region reject work mail
  private async rejectWorkMail(masterData, updateData, content, approveById) {
    try {
      updateData.status.workMail = 2;
      updateData.dates.employment = new Date().getTime();
      updateData.rejection.workMail = content;
      updateData.workMailAdminId = approveById;
      const id = masterData.workMailId;
      if (!id) return kInternalError;
      /// update work mail entity
      const verifiedDate = this.typeService.getGlobalDate(new Date());
      const update: any = { verifiedDate, status: '2', approveById };
      update.rejectReason = content;
      const result = await this.workMailRepo.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region reject Residence
  private async rejectResidence(masterData, updateData, content, approveById) {
    try {
      updateData.status.residence = 2;
      updateData.dates.residence = new Date().getTime();
      updateData.rejection.residence = content;

      const id = masterData.userId;
      if (!id) return kInternalError;
      /// update user entity
      const update: any = { homeStatus: '2', residenceAdminId: approveById };
      update.residenceRejectReason = content;
      const result = await this.userRepository.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region reject Reference
  private async rejectReference(masterData, updateData, content, approveById) {
    try {
      updateData.status.loan = 4;
      updateData.status.reference = 2;
      updateData.status.contact = 2;
      updateData.dates.contact = new Date().getTime();
      updateData.rejection.contact = content;

      const id = masterData.userId;
      if (!id) return kInternalError;
      /// update user entity
      const update: any = {
        quantity_status: '2',
        contactApprovedId: approveById,
      };
      update.contactRejectReason = content;
      const adminData = await this.commonService.getAdminData(approveById);
      if (adminData?.fullName) update.contactApproveBy = adminData?.fullName;

      const result = await this.userRepository.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region select loan amount
  private async selectLoanAmount(updateData, loanId) {
    try {
      updateData.status.loan = -1;
      const update: any = { loanStatus: 'InProcess' };
      const result = await this.loanRepo.updateRowData(update, loanId);
      if (result == k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region reject Bank
  private async rejectBank(masterData, updateData, content, approveById) {
    try {
      updateData.status.bank = 2;
      updateData.dates.banking = new Date().getTime();
      updateData.rejection.banking = content;
      const id = masterData?.loanData?.bankingId;
      if (!id) return kInternalError;
      /// update banking entity
      const update: any = {
        salaryVerification: '2',
        salaryVerificationDate: new Date().toJSON(),
        adminId: approveById,
      };
      update.rejectReason = content;
      const result = await this.bankingRepo.updateRowData(update, id);
      if (result == k500Error) return kInternalError;
    } catch (error) {}
  }

  // Get all pending verification count
  // Includes -> Employment, Banking, Residence, Selfie
  async pendingCount() {
    const key = 'ADMIN_VERIFICATION_COUNT';
    try {
      const existingData = await this.redisService.getKeyDetails(key);
      if (existingData) return JSON.parse(existingData);
    } catch (error) {}

    // Query preparation
    const attributes = [
      'stage',
      [Sequelize.fn('COUNT', Sequelize.col('stage')), 'count'],
    ];
    const options = {
      group: 'stage',
      where: {
        [Op.or]: [
          // Pending from admin
          { stageStatus: 0 },
          // Pending from user but nees to show in verification for EMandate and ESign
          {
            stage: { [Op.or]: [UserStage.MANDATE, UserStage.ESIGN] },
          },
        ],
      },
    };

    // Query
    const usersListData = await this.userRepository.getTableWhereData(
      attributes,
      options,
    );
    if (usersListData == k500Error) throw new Error();

    const finalizedData = {
      banking: 0,
      employment: 0,
      residence: 0,
      selfie: 0,
      contact: 0,
      kyc: 0,
      finalApproval: 0,
      eMandate: 0,
      eSign: 0,
      disbursement: 0,
      total: 0,
    };
    usersListData.forEach((el) => {
      try {
        const stage = el.stage ?? '';
        if (stage == UserStage.EMPLOYMENT) {
          finalizedData.employment = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.BANKING) {
          finalizedData.banking = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.RESIDENCE) {
          finalizedData.residence = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.SELFIE) {
          finalizedData.selfie = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.CONTACT) {
          finalizedData.contact = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.PAN) {
          finalizedData.kyc = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.FINAL_VERIFICATION) {
          finalizedData.finalApproval = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.MANDATE) {
          finalizedData.eMandate = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.ESIGN) {
          finalizedData.eSign = +el.count;
          finalizedData.total += +el.count;
        } else if (stage == UserStage.DISBURSEMENT) {
          finalizedData.disbursement = +el.count;
          finalizedData.total += +el.count;
        }
      } catch (error) {}
    });

    let ttlInSeconds = 30;
    if (finalizedData.total >= 100) ttlInSeconds = 45;

    await this.redisService.updateKeyDetails(
      key,
      JSON.stringify(finalizedData),
      ttlInSeconds,
    );

    return finalizedData;
  }
  //#endregion

  // Employment verification list
  async employment() {
    // Table joins
    const masterInclude: any = { model: MasterEntity };
    masterInclude.attributes = [
      'companyAdminId',
      'loanId',
      'salarySlipAdminId',
      'workMailAdminId',
      'otherInfo',
    ];
    masterInclude.include = { model: loanTransaction };
    masterInclude.include.attributes = ['id', 'assignTo'];
    const companyInclude: any = { model: employmentDetails };
    companyInclude.attributes = [
      'id',
      'companyName',
      'salarySlipId',
      'workMailId',
    ];
    const salaryInclude: any = {
      model: SalarySlipEntity,
    };
    salaryInclude.attributes = ['id', 'response', 'userId'];
    const include = [companyInclude, masterInclude, salaryInclude];

    // Query preparation
    const attributes = [
      'city',
      'completedLoans',
      'fullName',
      'id',
      'phone',
      'stageTime',
      'lastCrm',
    ];
    const options = {
      include,
      where: { stage: UserStage.EMPLOYMENT, stageStatus: 0 },
      order: [[salaryInclude, 'id', 'DESC']],
    };

    // Query
    const userList = await this.userRepository.getTableWhereData(
      attributes,
      options,
    );

    if (userList == k500Error) return kInternalError;
    const totalCount = userList.length ?? 0;
    const preparedList = [];

    let savedAdmins = await this.redisService.get('ADMIN_LIST');
    if (savedAdmins) savedAdmins = JSON.parse(savedAdmins);
    let loanList = [];
    // Get last approved amount
    // const userIds = userList.map((el) => el.id);
    // const loanAttr = ['id', 'netApprovedAmount', 'userId', 'assignTo'];
    // const loanOptions = {
    //   order: [['id', 'DESC']],
    //   where: { loanStatus: 'Complete', userId: { [Op.in]: userIds } },
    // };
    // const loanList = await this.loanRepo.getTableWhereData(
    //   loanAttr,
    //   loanOptions,
    // );
    // if (loanList === k500Error) throw Error();

    for (let index = 0; index < totalCount; index++) {
      try {
        const userData = userList[index];
        if (!userData) continue;
        const lastCrm = userData?.lastCrm;
        const empData = userData.employmentData ?? {};
        const masterData = userData.masterData ?? {};
        const salaryData = userData.salaryData ?? [];
        const loanData = masterData.loanData ?? {};
        let missingDetails = '';
        let response =
          salaryData.length > 0
            ? JSON.parse(
                salaryData[0]?.response ? salaryData[0]?.response : null,
              ) ?? {}
            : {};
        let salaryDate;
        const currentDate = this.typeService.getGlobalDate(new Date());
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(
          currentDate.getDate() -
            GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS,
        );
        salaryDate = this.typeService.getGlobalDate(response?.SalaryPeriod);
        if (response?.document_type) {
          missingDetails += response?.document_type + ', ';
        }
        if (!response?.name || response?.name === null) {
          missingDetails += salaryMissingDetails.USER_NAME_MISMATCH + ', ';
        }
        if (!response?.companyName || response?.companyName === null) {
          missingDetails += salaryMissingDetails.COMPANY_NAME_MISMATCH + ', ';
        }
        if (!response?.netPayAmount || response?.netPayAmount === null) {
          missingDetails += salaryMissingDetails.PAY_AMOUNT_NOT_FOUND + ', ';
        }
        if (!response?.SalaryPeriod || response?.SalaryPeriod === null) {
          missingDetails += salaryMissingDetails.SALARY_PERIOD_NOT_FOUND;
        } else if (response?.SalaryPeriod && currentDate >= salaryDate) {
          missingDetails += salaryMissingDetails.SALARY_PERIOD_NOT_VALID;
        }
        if (missingDetails.endsWith(', '))
          missingDetails = missingDetails.slice(0, -2);
        const crmData = lastCrm
          ? {
              CRM: lastCrm?.statusName,
              Title: lastCrm?.titleName,
              Remark: lastCrm?.remark,
              Disposition: lastCrm?.dispositionName,
            }
          : {};
        const ExtraData = {};
        if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
        const diffInMinutes = this.typeService.dateDifference(
          new Date(),
          userData.stageTime,
          'Minutes',
        );

        let lastApprovedAmount = '-';
        let previousLoans = loanList.filter((el) => el.userId == userData.id);
        if (previousLoans.length > 0) {
          previousLoans = previousLoans.sort((b, a) => a.id - b.id);
          lastApprovedAmount = previousLoans[0].netApprovedAmount ?? 0;
        }

        const preparedData = {
          'Difference in minutes': diffInMinutes,
          'Waiting time': this.getWaitingTime(diffInMinutes),
          Assign:
            (await this.sharedCommonService.getAdminData(loanData?.assignTo))
              ?.fullName ?? '-',
          'Loan Id': masterData.loanId ?? '-',
          Name: userData.fullName ?? '-',
          'Mobile number': this.cryptService.decryptPhone(userData.phone),
          'Last CRM by': lastCrm?.adminName ?? '-',
          'Completed loans': userData.completedLoans ?? 0,
          'Last approved amount': lastApprovedAmount,
          'Employment information':
            masterData?.otherInfo?.employmentInfo === ''
              ? '-'
              : masterData?.otherInfo?.employmentInfo ?? '-',
          'Company name': empData?.companyName ?? '-',
          'Missing Details': missingDetails,
          City: userData?.city ?? '-',
          'Last action by': '-',
          userId: userData.id ?? '-',
          assignId: loanData?.assignTo ?? '-',
          employeeId: empData?.id,
          workMailId: empData?.workMailId,
          salarySlipId: empData?.salarySlipId,
          Status: '0',
          ExtraData,
        };
        const companyAdminId = masterData.companyAdminId;
        const salarySlipAdminId = masterData.salarySlipAdminId;
        const workMailAdminId = masterData.workMailAdminId;
        let targetAdminId;
        if (companyAdminId && companyAdminId != SYSTEM_ADMIN_ID)
          targetAdminId = companyAdminId;
        if (salarySlipAdminId && salarySlipAdminId != SYSTEM_ADMIN_ID)
          targetAdminId = salarySlipAdminId;
        if (workMailAdminId && workMailAdminId != SYSTEM_ADMIN_ID)
          targetAdminId = workMailAdminId;
        if (targetAdminId)
          preparedData['Last action by'] =
            (await this.sharedCommonService.getAdminData(targetAdminId))
              ?.fullName ?? '-';
        preparedList.push(preparedData);
      } catch (error) {}
    }

    return { count: totalCount, rows: preparedList };
  }
  //#endregion

  // Get detailed summry of particular user's employment
  async employmentDetails(reqData) {
    try {
      // Params validation
      const empId = reqData.empId;
      if (!empId) return kParamMissing('empId');
      // Query preparation
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = ['id', 'email', 'status'];
      const salarySlipIncldue: any = { model: SalarySlipEntity };
      salarySlipIncldue.attributes = [
        'id',
        'status',
        'url',
        'response',
        'rejectReason',
        'salarySlipDate',
      ];
      const include = [workMailInclude, salarySlipIncldue];
      const attributes = [
        'companyAddress',
        'companyPhone',
        'companyName',
        'companyUrl',
        'companyVerification',
      ];
      const options = { include, where: { id: empId } };

      // Query
      const empData = await this.employementRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!empData) return k422ErrorMessage(kNoDataFound);
      let missingDetails = [];
      const finalizedData: any = {
        companyAddress: empData.companyAddress ?? '',
        companyUrl: empData.companyUrl ?? '',
        companyPhone: empData.companyPhone ?? '',
        companyStatus: 'Pending',
        workMailStatus: 'Pending',
        workMail: '',
        salarySlipStatus: 'Skipped',
        verificationDocumentUrl: '',
        systemDeclineReason: missingDetails,
      };

      // Company
      const companyStatus = empData.companyVerification;
      if (['1', '3'].includes(companyStatus))
        finalizedData.companyStatus = 'Approved';
      if (companyStatus == '2') finalizedData.companyStatus = 'Rejected';

      // Work mail
      const workMailData = empData.workMail ?? {};
      if (['1', '3', '4'].includes(workMailData.status))
        finalizedData.workMailStatus = 'Approved';
      if (workMailData.status == '2') finalizedData.workMailStatus = 'Rejected';
      if (workMailData.email) finalizedData.workMail = workMailData.email;
      else if (workMailData.status == '4') finalizedData.workMail = 'Skipped';

      // Salary slip
      const salarySlipData = empData?.salarySlip;
      if (salarySlipData) {
        finalizedData.salarySlipStatus = 'Pending';
        finalizedData.verificationDocumentUrl = salarySlipData?.url ?? '-';

        if (['1', '3', '4'].includes(salarySlipData?.status))
          finalizedData.salarySlipStatus = 'Approved';
        if (salarySlipData?.status == '2')
          finalizedData.salarySlipStatus = 'Rejected';

        let response = JSON.parse(salarySlipData?.response);

        if (response?.Type === 'Offer Letter') {
          finalizedData.type = 'Offer Letter';
        } else if (response?.Type === 'BankStatement') {
          finalizedData.type = 'Bank Statement';
          if (response?.bank_name) finalizedData.bankName = response.bank_name;
        } else if (response?.Type === 'Invalid document') {
          finalizedData.type = 'Invalid document';
        } else if (response?.Type === 'Salary Slip') {
          finalizedData.type = 'Salary Slip';
        } else {
          finalizedData.type = 'Other Document';
        }

        let salaryDate;
        const currentDate = this.typeService.getGlobalDate(new Date());
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(
          currentDate.getDate() -
            GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS,
        );
        salaryDate = this.typeService.getGlobalDate(response?.SalaryPeriod);
        if (response?.document_type) {
          missingDetails.push(response?.document_type);
        }
        if (!response?.name || response?.name === null) {
          missingDetails.push(salaryMissingDetails.USER_NAME_MISMATCH);
        }
        if (!response?.companyName || response?.companyName === null) {
          missingDetails.push(salaryMissingDetails.COMPANY_NAME_MISMATCH);
          finalizedData.editCompanyName = 'true';
        }
        if (!response?.netPayAmount || response?.netPayAmount === null) {
          missingDetails.push(salaryMissingDetails.PAY_AMOUNT_NOT_FOUND);
        }
        if (!response?.SalaryPeriod || response?.SalaryPeriod === null) {
          missingDetails.push(salaryMissingDetails.SALARY_PERIOD_NOT_FOUND);
        } else if (response?.SalaryPeriod && currentDate >= salaryDate) {
          missingDetails.push(salaryMissingDetails.SALARY_PERIOD_NOT_VALID);
        }
      }
      return finalizedData;
    } catch (error) {}
  }

  async banking(query) {
    try {
      const status = query?.status ?? '0';
      const attributes = [
        'id',
        'accountNumber',
        'ifsCode',
        'additionalURLs',
        'assignedTo',
        'bank',
        'bankStatement',
        'loanId',
        'userId',
        'salary',
        'salaryDate',
        'attempts',
        'adminId',
        'otherDetails',
        'rejectReason',
        'salaryVerification',
        'salaryVerificationDate',
        'createdAt',
        'updatedAt',
        'nameMissMatch',
        'name',
      ];
      const options: any = await this.bankingOptions(query);
      if (options?.message) return options;
      // Query
      const bankData = await this.bankingRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (bankData === k500Error) throw new Error();
      return await this.prepareBankData(bankData, status);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async bankingOptions(query) {
    try {
      //  Pending = '0', Approved = '1',  Decline = '2', All = '4', LoanDecline = '6'
      const status = query?.status ?? '0';
      // newOrRepeated (0 = Repeated, 1 = New)
      const newOrRepeated = query?.newOrRepeated;
      let searchText = query?.searchText;
      const download = query?.download ?? 'false';
      const page = query?.page ?? 1;
      const adminId = query?.adminId;
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const bankWhere: any = {};
      let userWhere: any;
      if (searchText) {
        const firstTwoCh = searchText.substring(0, 2).toLowerCase();
        if (firstTwoCh == 'l-') bankWhere.loanId = +searchText.substring(2);
        else {
          userWhere = {};
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userWhere.phone = { [Op.iRegexp]: searchText };
          } else
            userWhere[Op.or] = [
              { fullName: { [Op.iRegexp]: searchText } },
              { email: { [Op.iRegexp]: searchText } },
            ];
        }
      }
      if (newOrRepeated) {
        userWhere = userWhere ? userWhere : {};
        if (newOrRepeated == '1') userWhere.completedLoans = 0;
        else if (newOrRepeated == '0')
          userWhere.completedLoans = { [Op.gt]: 0 };
      }
      // Query preparation
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = ['companyName', 'salary', 'salaryDate'];
      const cibilInc = {
        model: CibilScoreEntity,
        attributes: ['id', 'status', 'userId', 'cibilScore', 'plScore'],
        required: false,
      };
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['otherInfo'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = [
        'id',
        'city',
        'completedLoans',
        'fullName',
        'phone',
        'stageTime',
        'stageStatus',
        'stage',
        'lastCrm',
      ];
      if (userWhere) userInclude.where = userWhere;
      userInclude.include = [empInclude, masterInclude];
      const loanInc: any = {
        model: loanTransaction,
        attributes: ['id', 'assignTo'],
        where: {},
        include: [cibilInc],
      };
      if (status == '2') loanInc.where.loanStatus = { [Op.ne]: 'Rejected' };
      else if (status == '6') loanInc.where.loanStatus = 'Rejected';
      const include = [userInclude, loanInc];
      if (status == '0') {
        if (adminId) bankWhere.assignedTo = adminId;
        return {
          where: {
            ...bankWhere,
            salaryVerification: status,
            [Op.and]: [
              Sequelize.literal(`"user"."stage" = ${UserStage.BANKING}`),
            ],
          },
          include,
          order: [['id', 'DESC']],
        };
      }

      let salSatus = status;
      if (status == '1') salSatus = ['3'];
      else if (status == '2' || status == '6') salSatus = ['2'];
      else if (status == '4') salSatus = ['0', '2', '3'];
      if (!Array.isArray(salSatus)) salSatus = [salSatus];
      if (adminId) bankWhere.adminId = adminId;
      else bankWhere.adminId = { [Op.ne]: SYSTEM_ADMIN_ID };
      let bankId = [];
      if (status != '4') {
        const bankAttr: any = [
          [Sequelize.fn('MAX', Sequelize.col('id')), 'id'],
          'loanId',
        ];
        const bankOpts = {
          where: {
            salaryVerification: { [Op.in]: salSatus },
            salaryVerificationDate: dateRange,
            ...bankWhere,
          },
          group: ['loanId'],
          order: [[Sequelize.literal('"id" DESC')]],
        };
        const bankList = await this.bankingRepo.getTableWhereData(
          bankAttr,
          bankOpts,
        );
        if (bankList === k500Error) throw new Error();
        bankId = bankList.map((b) => b?.id);
      }

      const opts: any = {
        where: { id: bankId },
        include,
        order: [['id', 'DESC']],
      };
      if (status == '4')
        opts.where = {
          salaryVerification: { [Op.or]: salSatus },
          salaryVerificationDate: dateRange,
          ...bankWhere,
        };
      if (download != 'true') {
        opts.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        opts.limit = PAGE_LIMIT;
      }
      return opts;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // prepare data
  async prepareBankData(bankData, status) {
    let loanList: any = [];
    // if (status == '0') {
    //   // Get last approved amount
    //   const totalUserIds = [...new Set(bankData.rows.map((el) => el.userId))];
    //   const loanAttr = ['id', 'netApprovedAmount', 'userId'];
    //   const loanOptions = {
    //     where: {
    //       id: {
    //         [Op.in]: Sequelize.literal(
    //           `(SELECT MAX(id) FROM "loanTransactions" WHERE "loanStatus" = 'Complete' AND "userId" IN (:totalUserIds) GROUP BY "userId")`,
    //         ),
    //       },
    //     },
    //     order: [['id', 'DESC']],
    //     replacements: { totalUserIds },
    //   };
    //   loanList = await this.loanRepo.getTableWhereData(loanAttr, loanOptions);
    //   if (loanList === k500Error) throw Error();
    // }
    const length = bankData.rows.length;
    const preparedList = [];
    const userIds = [];
    for (let index = 0; index < length; index++) {
      try {
        const bank = bankData.rows[index];
        const user = bank.user ?? {};
        // Temporary solution
        if (status === '0' && user.stageStatus != 0) continue;
        const emp = user?.employmentData ?? {};
        const master = user?.masterData ?? {};
        const loan = bank?.loanData ?? {};
        const cibil = loan?.cibilData ?? {};
        if (userIds.includes(user.id) && status == '0') continue;
        let isCibilError = false;
        if (cibil?.status == '2' || cibil?.status == '3') isCibilError = true;
        const lastCrm = user?.lastCrm;
        const bankStatus = bank?.salaryVerification;
        const updatedAt = bank?.salaryVerificationDate ?? bank?.updatedAt;
        const createdAt = this.typeService.getDateFormatted(bank?.createdAt);
        const lastUpdate = this.typeService.getDateFormatted(updatedAt);
        const preparedData: any = {};
        const ExtraData = {};
        if (status == '0') {
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            user.stageTime,
            'Minutes',
          );
          preparedData['Difference in minutes'] = diffInMinutes;
          preparedData['Waiting time'] = this.getWaitingTime(diffInMinutes);
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
        }
        preparedData['Assign'] =
          (await this.sharedCommonService.getAdminData(loan?.assignTo))
            ?.fullName ?? '-';
        preparedData['Loan id'] = bank.loanId ?? '-';
        preparedData['Name'] = user.fullName ?? '-';
        preparedData['Mobile number'] =
          this.cryptService.decryptPhone(user.phone) ?? '-';
        if (status == '0') {
          let lastApprovedAmount: any = '-';
          let previousLoans = loanList.filter((el) => el.userId == user.id);
          if (previousLoans.length > 0) {
            previousLoans = previousLoans.sort((b, a) => a.id - b.id);
            lastApprovedAmount = +previousLoans[0].netApprovedAmount ?? 0;
          }
          preparedData['Last approved amount'] = lastApprovedAmount;
          preparedData['Last CRM by'] = lastCrm?.adminName ?? '-';
        }
        preparedData['Completed loans'] = user?.completedLoans ?? '0';
        preparedData['Employment information'] =
          master?.otherInfo?.employmentInfo === ''
            ? '-'
            : master?.otherInfo?.employmentInfo ?? '-';
        preparedData['Applied bank'] = bank.bank ?? '-';
        preparedData['Account number'] = bank.accountNumber ?? '-';
        preparedData['IFSC code'] = bank.ifsCode ?? '-';
        preparedData['Company name'] = emp.companyName ?? '-';
        preparedData['Salary'] = emp.salary ?? '-';
        preparedData['Statement'] = bank.bankStatement ?? '-';
        preparedData['Additional Urls'] = bank?.additionalURLs ?? '[]';
        preparedData['Cibil score'] = cibil?.cibilScore ?? '-';
        preparedData['PL score'] = cibil?.plScore ?? '-';
        preparedData['City'] = user?.city ?? '-';
        preparedData['Created date'] = createdAt;
        if (status != '0')
          preparedData[
            status == '1'
              ? 'Approved by'
              : status == '2'
              ? 'Rejected by'
              : 'Last action by'
          ] =
            (await this.sharedCommonService.getAdminData(bank?.adminId))
              ?.fullName ?? '-';
        preparedData[
          status == '0'
            ? 'Last updated'
            : status == '2' || status == '6'
            ? 'Reject date'
            : 'Verified date'
        ] = lastUpdate;
        if (status == '2' || status == '6') {
          preparedData['Reject reason'] = bank?.rejectReason ?? '-';
          preparedData['Reject counts'] = bank?.attempts ?? '-';
        }
        preparedData['bankingId'] = bank.id ?? '-';
        preparedData['userId'] = user.id ?? '-';
        preparedData['assignId'] = loan?.assignTo ?? '-';
        preparedData['userSalaryDate'] = emp?.salaryDate ?? '-';
        preparedData['systemDate'] = bank?.salaryDate ?? '-';
        preparedData['actualSalary'] = bank?.salary ?? '-';
        preparedData['Status'] = bankStatus;
        preparedData['ExtraData'] = ExtraData;
        if (status == '0')
          preparedData['salary_list'] = bank?.otherDetails?.salary ?? {};
        preparedData['isCibilError'] = isCibilError;
        preparedData['nameMissMatch'] = bank?.nameMissMatch == 0 ? true : '-';
        preparedData['accountName'] = bank?.name ?? '-';
        preparedList.push(preparedData);
        userIds.push(user.id);
      } catch (error) {}
    }
    if (status == '0')
      return { count: preparedList.length, rows: preparedList };
    bankData.rows = preparedList;
    return bankData;
  }

  async reFetchBankVerification(reqData) {
    const targetList = await this.banking({});
    const targetLoanIds = reqData.targetLoanIds ?? [];

    const rows = targetList.rows ?? [];

    const loanIds = rows.map((el) => el['Loan id']);

    const bankingInclude: SequelOptions = { model: BankingEntity };
    bankingInclude.attributes = ['accountDetails', 'bankStatement'];
    bankingInclude.where = {
      accountDetails: { [Op.ne]: null },
      salaryVerification: '0',
    };
    const include = [bankingInclude];
    const loanAttr = ['id', 'userId'];
    const loanOptions = {
      include,
      where: { id: loanIds, loanStatus: 'InProcess' },
    };

    const loanList = await this.repoManager.getTableWhereData(
      loanTransaction,
      loanAttr,
      loanOptions,
    );
    if (loanList == k500Error) throw new Error();

    for (let index = 0; index < loanList.length; index++) {
      try {
        const loanData = loanList[index];
        const bankingData = loanData?.bankingData ?? {};

        const loanId = loanData.id;
        if (targetLoanIds.length > 0) {
          if (!targetLoanIds.includes(loanId)) continue;
        }

        console.log({ index, loanId, total: loanList.length });

        const body = {
          accountDetails: JSON.parse(bankingData.accountDetails),
          filePath: bankingData.bankStatement,
          userId: loanData.userId,
        };

        const result = await this.sharedbanking.validateEligibility(body);
        console.log({ result });
      } catch (error) {}
    }

    return {};
  }

  async selfie() {
    try {
      // Query preparation
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = ['profileImage'];
      const masterInclude: { model; attributes?; include? } = {
        model: MasterEntity,
      };
      masterInclude.attributes = ['loanId', 'otherInfo'];
      masterInclude.include = { model: loanTransaction };
      masterInclude.include.attributes = ['id', 'assignTo'];
      const selfieInclude: { model; attributes? } = { model: UserSelfieEntity };
      selfieInclude.attributes = [
        'id',
        'image',
        'response',
        'tempImage',
        'adminId',
      ];
      const include = [kycInclude, masterInclude, selfieInclude];
      const attributes = [
        'city',
        'completedLoans',
        'fullName',
        'id',
        'phone',
        'stageTime',
        'lastCrm',
      ];
      const options = {
        include,
        where: { stage: UserStage.SELFIE, stageStatus: 0 },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      // Fine tuning
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const selfieData = userData.selfieData ?? {};
          const lastCrm = userData?.lastCrm;
          const loanData = masterData?.loanData ?? {};
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          let matchPer: any = 0;
          let confidence = 0;
          try {
            const response = selfieData?.response
              ? JSON.parse(selfieData?.response)
              : {};
            if (response?.SourceImageFace) {
              const simlarity = Math.round(
                response?.FaceMatches[0]?.Similarity ?? 0,
              );
              confidence = Math.round(
                response?.SourceImageFace?.Confidence ?? 0,
              );
              const facaMatch = response?.FaceMatches?.length > 0;
              if (facaMatch || simlarity) matchPer = simlarity;
            }
          } catch (error) {}

          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            Assign:
              (await this.sharedCommonService.getAdminData(loanData?.assignTo))
                ?.fullName ?? '-',
            'Loan id': masterData.loanId ?? '-',
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            City: userData.city ?? '-',
            'Profile image': selfieData.image
              ? decodeURIComponent(selfieData.image)
              : null,
            Profile_tempImg: selfieData.tempImage
              ? decodeURIComponent(selfieData.tempImage)
              : null,
            Aadhar_image: kycData.profileImage
              ? decodeURIComponent(kycData.profileImage)
              : null,
            Similarity: matchPer,
            Confidence: confidence,
            'Last action by': selfieData?.adminId
              ? (
                  await this.sharedCommonService.getAdminData(
                    selfieData?.adminId,
                  )
                )?.fullName
              : '-',
            userId: userData.id ?? '-',
            assignId: loanData?.assignTo ?? '-',
            selfieId: selfieData.id ?? '-',
            Status: '0',
            ExtraData,
          };
          preparedList.push(preparedData);
        } catch (error) {}
      }

      return { rows: preparedList, count: preparedList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async contact() {
    try {
      if (!GLOBAL_FLOW.REFERENCE_IN_APP) {
        return { rows: [], count: 0 };
      }

      // Query preparation
      const masterInclude: { model; attributes? } = { model: MasterEntity };
      masterInclude.attributes = ['loanId'];
      const include = [masterInclude];
      const attributes = [
        'city',
        'completedLoans',
        'fullName',
        'id',
        'phone',
        'stageTime',
        'totalContact',
        'lastCrm',
        'contactApprovedId',
      ];
      const options = {
        include,
        where: { stage: UserStage.CONTACT, stageStatus: 0 },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      // Fine tuning
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const lastCrm = userData?.lastCrm;
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          const approvedId = userData?.contactApprovedId;
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            'Loan id': masterData.loanId,
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            Contacts: userData.totalContact ?? 0,
            City: userData.city ?? '-',
            'Last action by': approvedId
              ? (await this.sharedCommonService.getAdminData(approvedId))
                  ?.fullName
              : '-',
            userId: userData.id ?? '-',
            Status: '0',
            ExtraData,
          };
          preparedList.push(preparedData);
        } catch (error) {}
      }
      return { rows: preparedList, count: preparedList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async kyc() {
    try {
      // Query preparation
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarFront',
        'aadhaarBack',
        'aadhaarResponse',
        'aadhaarVerifiedAdmin',
        'maskedAadhaar',
        'pan',
        'panStatus',
        'panCardNumber',
        'panResponse',
        'nameSimilarity',
      ];
      const masterInclude: { model; attributes?; include? } = {
        model: MasterEntity,
      };
      masterInclude.attributes = ['loanId', 'otherInfo'];
      masterInclude.include = { model: loanTransaction };
      masterInclude.include.attributes = ['id', 'assignTo'];
      const include = [kycInclude, masterInclude];
      const attributes = [
        'city',
        'fullName',
        'id',
        'phone',
        'stageTime',
        'totalContact',
        'lastCrm',
        'completedLoans',
      ];
      const options = {
        include,
        where: { stage: UserStage.PAN, stageStatus: 0 },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;
      let savedAdmins = await this.redisService.get('ADMIN_LIST');
      if (savedAdmins) savedAdmins = JSON.parse(savedAdmins);

      // Fine tuning
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const lastCrm = userData?.lastCrm;
          const loanData = masterData?.loanData ?? {};
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          let aadhaarResponse: any = {};
          let panName = '';
          if (kycData?.panResponse) {
            const panResponse = JSON.parse(kycData?.panResponse);
            const document_status = panResponse?.document_status;
            const finalResponse: any = document_status ?? panResponse?.result;
            panName =
              finalResponse && finalResponse.length > 0
                ? finalResponse[0]?.validated_data?.full_name ?? '-'
                : finalResponse?.user_full_name ?? '-';
          }
          if (kycData.aadhaarResponse)
            aadhaarResponse = JSON.parse(kycData.aadhaarResponse);
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            Assign:
              (await this.sharedCommonService.getAdminData(loanData?.assignTo))
                ?.fullName ?? '-',
            'Loan id': masterData?.loanId ?? '-',
            Name: userData.fullName ?? '-',
            Approve: userData.kycData?.nameSimilarity > 0 ? true : false,
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            City: userData.city ?? '-',
            'Last action by':
              (
                await this.sharedCommonService.getAdminData(
                  kycData.aadhaarVerifiedAdmin,
                )
              )?.fullName ?? '-',
            aadhaarFront: kycData.aadhaarFront,
            aadhaarBack: kycData.aadhaarBack,
            aadhaarNumber: kycData.maskedAadhaar ?? '-',
            'Aadhaar name':
              aadhaarResponse?.full_name ??
              aadhaarResponse?.name ??
              aadhaarResponse?.localResName ??
              '-',
            pan: kycData.pan,
            panCardNumber: kycData.panCardNumber ?? '-',
            'Pan name': panName,
            panStatus: kycData?.panStatus ?? '-',
            userId: userData.id ?? '-',
            assignId: loanData?.assignTo ?? '-',
            Status: '0',
            ExtraData,
          };
          preparedList.push(preparedData);
        } catch (error) {}
      }
      return { rows: preparedList, count: preparedList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async finalApproval(query) {
    const status = query?.status ?? '0';
    const attributes = [
      'id',
      'userId',
      'remark',
      'assignTo',
      'updatedAt',
      'loanAmount',
      'verifiedDate',
      'approvedReason',
      'netApprovedAmount',
      'manualVerification',
      'manualVerificationAcceptId',
    ];
    const options: any = await this.finalApprovalOptions(query);
    if (options?.message) return options;
    // Query
    const loanData = await this.loanRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (loanData === k500Error) throw new Error();
    return await this.prepareFinalApproval(loanData, status);
  }

  async finalApprovalOptions(query) {
    try {
      //  Pending = '0', Approved = '1',  LoanDecline = '2'
      let status = query?.status ?? '0';
      status = status == '1' ? '3' : status;
      // newOrRepeated (0 = Repeated, 1 = New)
      const newOrRepeated = query?.newOrRepeated;
      const adminId = query?.adminId;
      let searchText = query?.searchText;
      const download = query?.download ?? 'false';
      const page = query?.page ?? 1;
      const startDate = this.typeService.getGlobalDate(
        query?.startDate ?? new Date(),
      );
      const endDate = this.typeService.getGlobalDate(
        query?.endDate ?? new Date(),
      );
      let loanWhere: any = {};
      let userWhere: any;
      if (searchText) {
        const firstTwoCh = searchText.substring(0, 2).toLowerCase();
        if (firstTwoCh == 'l-') loanWhere.id = +searchText.substring(2);
        else {
          userWhere = {};
          if (!isNaN(searchText)) {
            searchText = this.cryptService.encryptPhone(searchText);
            searchText = searchText.split('===')[1];
            userWhere.phone = { [Op.iRegexp]: searchText };
          } else
            userWhere[Op.or] = [
              { fullName: { [Op.iRegexp]: searchText } },
              { email: { [Op.iRegexp]: searchText } },
            ];
        }
      }
      if (newOrRepeated) {
        userWhere = userWhere ? userWhere : {};
        if (newOrRepeated == '1') userWhere.completedLoans = 0;
        else if (newOrRepeated == '0')
          userWhere.completedLoans = { [Op.gt]: 0 };
      }
      // Query preparation
      const bankInc: any = { model: BankingEntity };
      bankInc.attributes = ['salary', 'adminSalary', 'otherDetails'];
      const masterInc: any = { model: MasterEntity };
      masterInc.attributes = ['otherInfo'];
      const predictionInclude: any = { model: PredictionEntity };
      predictionInclude.attributes = ['reason'];
      const userInc: any = { model: registeredUsers };
      userInc.attributes = [
        'id',
        'city',
        'completedLoans',
        'fullName',
        'phone',
        'stageTime',
        'stageStatus',
        'stage',
        'lastCrm',
      ];
      if (userWhere) userInc.where = userWhere;
      const cibilInc = {
        model: CibilScoreEntity,
        attributes: ['id', 'status', 'cibilScore', 'plScore'],
        required: false,
      };
      const include = [
        masterInc,
        userInc,
        bankInc,
        cibilInc,
        predictionInclude,
      ];
      if (status == '0') {
        if (adminId) loanWhere.assignTo = adminId;
        loanWhere.manualVerification = '0';
        return {
          where: {
            ...loanWhere,
            [Op.and]: [
              Sequelize.literal(
                `"registeredUsers"."stage" = ${UserStage.FINAL_VERIFICATION}`,
              ),
            ],
          },
          include,
          order: [['id', 'DESC']],
        };
      }
      if (adminId) loanWhere.manualVerificationAcceptId = adminId;
      else loanWhere.manualVerificationAcceptId = { [Op.ne]: SYSTEM_ADMIN_ID };
      const manualVerification =
        status == '4' ? { [Op.in]: ['0', '3', '2'] } : status;
      const opts: any = {
        where: {
          ...loanWhere,
          manualVerification,
          verifiedDate: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
        include,
        order: [['id', 'DESC']],
      };
      if (download != 'true') {
        opts.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        opts.limit = PAGE_LIMIT;
      }
      return opts;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // prepare data
  async prepareFinalApproval(loanData, status) {
    let loanList: any = [];
    // if (status == '0') {
    //   // Get last approved amount
    //   const totalUserIds = loanData.rows.map((el) => el.userId);
    //   const loanAttr = ['id', 'netApprovedAmount', 'userId'];
    //   const loanOptions = {
    //     where: { loanStatus: 'Complete', userId: totalUserIds },
    //     order: [['id', 'DESC']],
    //   };
    //   loanList = await this.loanRepo.getTableWhereData(loanAttr, loanOptions);
    //   if (loanList === k500Error) throw Error();
    // }

    const length = loanData.rows.length;
    let loanAmountRepeater = 0;
    let loanAmountNew = 0;
    let loanCountRepeater = 0;
    let loanCountNew = 0;
    const preparedList = [];
    for (let index = 0; index < length; index++) {
      try {
        const loan = loanData.rows[index];
        const master = loan?.masterData ?? {};
        const user = loan.registeredUsers ?? {};
        const bank = loan?.bankingData ?? {};
        const cibil = loan?.cibilData ?? {};
        const prediction = loan?.predictionData ?? {};
        let isCibilError = false;
        if (cibil?.status !== '1') isCibilError = true;
        const lastCrm = user?.lastCrm;
        const lStatus = loan?.manualVerification ?? '0';
        const updatedAt = loan?.verifiedDate ?? loan?.updatedAt;
        const lastUpdate = this.typeService.getDateFormatted(updatedAt);
        const ecsBounceCount =
          bank?.otherDetails?.ecsDetails?.ecsBounceCount ?? 0;
        const preparedData: any = {};
        const ExtraData = {};
        if (status == '0') {
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            user.stageTime,
            'Minutes',
          );
          preparedData['Difference in minutes'] = diffInMinutes;
          preparedData['Waiting time'] = this.getWaitingTime(diffInMinutes);
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
        }

        const predictionData = prediction?.reason
          ? JSON.parse(prediction.reason)
          : {};
        let exactMatchUserIds = predictionData.exactMatchAddressUsers ?? [];
        if (exactMatchUserIds[0]?.userId) {
          exactMatchUserIds = exactMatchUserIds.map((user) => user.userId);
        }
        let userNames: any = [];
        if (
          predictionData?.exactMatchAddressCount &&
          predictionData.exactMatchAddressCount > 0
        ) {
          userNames = await this.userRepository.getTableWhereData(
            ['fullName'],
            {
              where: {
                id: {
                  [Op.in]: exactMatchUserIds,
                },
              },
            },
          );
          if (!userNames || userNames == k500Error) throw new Error();
        }
        preparedData['Suspicious'] = {
          Aadhaar:
            userNames.length > 0
              ? userNames.map((user) => user?.fullName ?? '-')
              : userNames,
        };
        preparedData['Assign'] = loan?.assignTo
          ? (await this.sharedCommonService.getAdminData(loan?.assignTo))
              ?.fullName ?? '-'
          : '-';
        preparedData['Loan id'] = loan.id ?? '-';
        preparedData['Name'] = user.fullName ?? '-';
        preparedData['Mobile number'] =
          this.cryptService.decryptPhone(user.phone) ?? '-';
        if (status == '0') {
          let lastApprovedAmount = '-';
          let previousLoans = loanList.filter((el) => el.userId == user.id);
          if (previousLoans.length > 0) {
            previousLoans = previousLoans.sort((b, a) => a.id - b.id);
            lastApprovedAmount = (+(
              previousLoans[0]?.netApprovedAmount ?? 0
            )).toFixed();
          }
          preparedData['Last approved amount'] = lastApprovedAmount;
          preparedData['Last CRM by'] = lastCrm?.adminName ?? '-';
        }
        preparedData['Completed loans'] = user?.completedLoans ?? 0;
        preparedData['Employment information'] =
          master?.otherInfo?.employmentInfo === ''
            ? '-'
            : master?.otherInfo?.employmentInfo ?? '-';
        preparedData['Offered amount'] = loan?.loanAmount ?? '0';
        preparedData['Applied amount'] = loan?.netApprovedAmount ?? '0';
        preparedData['Salary'] = Math.round(
          bank?.adminSalary ?? bank?.salary ?? 0,
        );
        preparedData['Cibil score'] = cibil?.cibilScore ?? '-';
        preparedData['PL score'] = cibil?.plScore ?? '-';
        preparedData['City'] = user?.city ?? '-';
        if (status != '0')
          preparedData[
            status == '1'
              ? 'Approved by'
              : status == '2'
              ? 'Rejected by'
              : 'Last action by'
          ] =
            (
              await this.sharedCommonService.getAdminData(
                loan?.manualVerificationAcceptId,
              )
            )?.fullName ?? '-';
        preparedData[
          status == '0'
            ? 'Last updated'
            : status == '2' || status == '6'
            ? 'Reject date'
            : 'Verified date'
        ] = lastUpdate;
        if (status == '2') preparedData['Reject reason'] = loan?.remark ?? '-';
        else if (status == '1')
          preparedData['Approved reason'] = loan?.approvedReason ?? '-';
        preparedData['userId'] = user.id ?? '-';
        preparedData['assignId'] = loan?.assignTo ?? '-';
        preparedData['Status'] = lStatus == '3' ? '1' : lStatus;
        preparedData['ExtraData'] = ExtraData;
        preparedData['isCibilError'] = isCibilError;
        preparedData['ECS bounce count'] = ecsBounceCount;

        if (user?.completedLoans > 0) {
          loanAmountRepeater += +(loan?.netApprovedAmount ?? 0);
          loanCountRepeater++;
        } else {
          loanAmountNew += +(loan?.netApprovedAmount ?? 0);
          loanCountNew++;
        }
        preparedList.push(preparedData);
      } catch (error) {}
    }
    if (status == '0')
      return {
        count: preparedList.length,
        rows: preparedList,
        loanAmountRepeater: loanAmountRepeater,
        loanAmountNew: loanAmountNew,
        loanCountRepeater: loanCountRepeater,
        loanCountNew: loanCountNew,
      };
    loanData.rows = preparedList;
    return loanData;
  }

  async eMandate() {
    try {
      // Query preparation
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = [
        'accountNumber',
        'createdAt',
        'mode',
        'response',
        'status',
      ];
      const bank = { model: BankingEntity, attributes: ['mandateBank'] };
      const loanInclude: { model; attributes?; include? } = {
        model: loanTransaction,
      };
      loanInclude.attributes = [
        'mandateAttempts',
        'esign_id',
        'netApprovedAmount',
        'subscriptionId',
        'appType',
      ];
      loanInclude.include = [subscriptionInclude, bank];
      const masterInclude: { model; attributes?; include? } = {
        model: MasterEntity,
      };
      masterInclude.include = [loanInclude];
      masterInclude.attributes = ['loanId', 'otherInfo'];
      const include = [masterInclude];
      const attributes = [
        'city',
        'completedLoans',
        'fullName',
        'id',
        'lastOnlineTime',
        'phone',
        'stageTime',
        'typeOfDevice',
        'lastCrm',
      ];
      const options = { include, where: { stage: UserStage.MANDATE } };
      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      // Fine tuning
      const preparedList = [];
      let loanAmountRepeater = 0;
      let loanAmountNew = 0;
      let loanCountRepeater = 0;
      let loanCountNew = 0;
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const loanData = masterData.loanData ?? {};
          const bankData = loanData?.bankingData ?? {};
          const subscriptionData = loanData.subscriptionData ?? {};
          const lastCrm = userData?.lastCrm;
          const appType = loanData?.appType;
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            isOnline: false,
            'Last Active ago': '',
            'Loan Id': masterData.loanId ?? '-',
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? '0',
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            'Loan Amount': loanData.netApprovedAmount ?? '-',
            Platform: subscriptionData.mode ?? '-',
            'Bank name': bankData?.mandateBank ?? '-',
            'Account number': subscriptionData?.accountNumber ?? '-',
            Attempts: subscriptionData.mandateAttempts ?? '0',
            'Created date': '-',
            'Device type': userData.typeOfDevice == '1' ? 'IOS' : 'Android',
            'Reject reason': '-',
            Status: subscriptionData?.status?.toUpperCase() ?? kInitiated,
            userId: userData.id ?? '-',
            mandateId: loanData.subscriptionId ?? '-',
            ExtraData,
            appType,
          };

          let lastActiveAgoMinutes: any = Infinity;
          if (userData?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              userData?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            preparedData.isOnline = lastActiveAgoMinutes <= 5;
            preparedData['Last Active ago'] =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }
          if (subscriptionData.createdAt) {
            preparedData['Created date'] = this.typeService.jsonToReadableDate(
              subscriptionData.createdAt.toJSON(),
            );
          }
          if (subscriptionData.response) {
            const responseData = JSON.parse(subscriptionData?.response);
            preparedData['Reject reason'] =
              responseData?.cf_message ??
              responseData?.errorMsg ??
              responseData?.error_description ??
              '';
            if (preparedData['Reject reason']) preparedData.Status = kFailed;
          }

          if (userData?.completedLoans > 0) {
            loanAmountRepeater += +(loanData?.netApprovedAmount ?? 0);
            loanCountRepeater++;
          } else {
            loanAmountNew += +(loanData?.netApprovedAmount ?? 0);
            loanCountNew++;
          }
          preparedList.push(preparedData);
        } catch (error) {}
      }
      return {
        rows: preparedList,
        count: preparedList.length,
        loanAmountRepeater: loanAmountRepeater,
        loanAmountNew: loanAmountNew,
        loanCountRepeater: loanCountRepeater,
        loanCountNew: loanCountNew,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion
  async disbursement() {
    try {
      // Query preparation
      const bankingInclude: { model; attributes? } = { model: BankingEntity };
      bankingInclude.attributes = ['disbursementBank'];
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = [
        'payout_id',
        'source',
        'status',
        'response',
      ];
      const loanInclude: { model; attributes?; include? } = {
        model: loanTransaction,
      };
      loanInclude.attributes = ['netApprovedAmount'];
      loanInclude.include = [bankingInclude, disbursementInclude];
      const masterInclude: { model; attributes?; include? } = {
        model: MasterEntity,
      };
      masterInclude.attributes = ['loanId', 'otherInfo'];
      masterInclude.include = [loanInclude];
      const include = [masterInclude];
      const attributes = [
        'completedLoans',
        'fullName',
        'id',
        'phone',
        'stageTime',
        'lastCrm',
      ];
      const options = {
        include,
        where: { stage: UserStage.DISBURSEMENT, stageStatus: 0 },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      // Fine tuning
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const loanData = masterData.loanData ?? {};
          const bankingData = loanData.bankingData ?? {};
          let disbursementData = {
            response: '',
            status: 'INITIALIZED',
            source: '',
            payout_id: '',
          };
          const disbursementList = loanData?.disbursementData ?? [];
          if (disbursementList.length > 0)
            disbursementData = disbursementList[0];
          let disbursementResponse: any = {};
          if (disbursementData.response)
            disbursementResponse = JSON.parse(disbursementData.response);
          const failureReason =
            disbursementResponse?.failure_reason ??
            disbursementResponse?.status_details?.description ??
            '-';
          const invalidDetailsReason = [
            'Payout failed due to invalid beneficiary account details.',
            'Payout failed as the IFSC code is invalid. Please correct the IFSC code and retry.',
            'IFSC Code is Not Valid. Please check and retry.',
          ];
          let isUniversalIFSC = false;
          if (invalidDetailsReason.includes(failureReason))
            isUniversalIFSC = true;

          const lastCrm = userData?.lastCrm;
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData?.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            'Loan Id': masterData.loanId ?? '-',
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            'Loan Amount': loanData.netApprovedAmount ?? 0,
            Bank: bankingData.disbursementBank ?? '-',
            Source: disbursementData?.source ?? '-',
            'Payout Id':
              disbursementResponse?.transId ??
              disbursementData?.payout_id ??
              '-',
            'Failed reason': failureReason ?? '-',
            isUniversalIFSC,
            Status: disbursementData.status?.toUpperCase() ?? 'INITIALIZED',
            userId: userData.id ?? '-',
            ExtraData,
          };
          preparedList.push(preparedData);
        } catch (error) {}
      }
      return { rows: preparedList, count: preparedList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private getWaitingTime(diffInMinutes) {
    const today = new Date();
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - diffInMinutes);
    const finalizedData = {
      minutes: diffInMinutes,
      createdAt: createdAt.toJSON(),
      endDate: today.toJSON(),
    };
    return finalizedData;
  }

  async eSign() {
    try {
      // Query preparation
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = ['createdAt', 'esign_mode', 'nameMissMatch'];
      const loanInclude: { model; attributes?; include?; required } = {
        model: loanTransaction,
        required: true,
      };
      loanInclude.attributes = [
        'assignTo',
        'esign_id',
        'loanAmount',
        'netApprovedAmount',
        'appType',
      ];
      loanInclude.include = [eSignInclude];
      const masterInclude: { model; attributes?; include?; required } = {
        model: MasterEntity,
        required: true,
      };
      masterInclude.include = [loanInclude];
      masterInclude.attributes = ['loanId', 'otherInfo'];
      const include = [masterInclude];
      const attributes = [
        'city',
        'completedLoans',
        'fullName',
        'id',
        'lastOnlineTime',
        'phone',
        'stageTime',
        'totalContact',
        'lastCrm',
      ];
      const options = {
        include,
        where: { stage: UserStage.ESIGN },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      // Fine tuning
      const preparedList = [];
      let loanAmountRepeater = 0;
      let loanAmountNew = 0;
      let loanCountRepeater = 0;
      let loanCountNew = 0;
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const loanData = masterData.loanData ?? {};
          const eSignData = loanData.eSignData ?? {};
          let response = eSignData.response ?? {};
          try {
            response = JSON.parse(response);
          } catch (error) {}
          const lastCrm = userData?.lastCrm;
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const appType = loanData?.appType;
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            isOnline: false,
            'Last Active ago': '-',
            'Loan Id': masterData.loanId ?? '-',
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '-',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            'Employment information':
              masterData?.otherInfo?.employmentInfo === ''
                ? '-'
                : masterData?.otherInfo?.employmentInfo ?? '-',
            'Loan Amount': loanData.netApprovedAmount,
            Source: eSignData?.esign_mode ?? '-',
            'Created date': this.typeService.jsonToReadableDate(
              eSignData?.createdAt?.toJSON(),
            ),
            'Name mismatch': eSignData?.nameMissMatch ?? false,
            'Esign name':
              response?.aadhaar_name ??
              response?.result?.signer?.fetched_name ??
              '-',
            userId: userData.id ?? '-',
            esignId: loanData.esign_id ?? '-',
            Status: '0',
            ExtraData,
            appType,
          };

          let lastActiveAgoMinutes: any = Infinity;
          if (userData?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              userData?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            preparedData.isOnline = lastActiveAgoMinutes <= 5;
            preparedData['Last Active ago'] =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }

          if (userData?.completedLoans > 0) {
            loanAmountRepeater += +(loanData?.netApprovedAmount ?? 0);
            loanCountRepeater++;
          } else {
            loanAmountNew += +(loanData?.netApprovedAmount ?? 0);
            loanCountNew++;
          }

          preparedList.push(preparedData);
        } catch (error) {}
      }
      return {
        rows: preparedList,
        count: preparedList.length,
        loanAmountRepeater: loanAmountRepeater,
        loanAmountNew: loanAmountNew,
        loanCountRepeater: loanCountRepeater,
        loanCountNew: loanCountNew,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async residence() {
    try {
      // Query preparation
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['loanId', 'miscData'];
      const include = [masterInclude];
      const attributes = [
        'city',
        'fullName',
        'homeProofImage',
        'homeType',
        'id',
        'phone',
        'pinAddress',
        'residenceAdminId',
        'residenceProofApproveByName',
        'residenceRejectReason',
        'stageTime',
        'typeAddress',
        'lastCrm',
        'completedLoans',
      ];
      const options = {
        include,
        where: { stage: UserStage.RESIDENCE, stageStatus: 0 },
      };

      // Query
      const userList = await this.userRepository.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;
      let savedAdmins = await this.redisService.get('ADMIN_LIST');
      if (savedAdmins) savedAdmins = JSON.parse(savedAdmins);

      // Fine tuning
      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const masterData = userData.masterData ?? {};
          const typeAddress = userData?.typeAddress
            ? JSON.parse(userData.typeAddress)
            : '-';
          const lastCrm = userData?.lastCrm;
          const crmData = lastCrm
            ? {
                CRM: lastCrm?.statusName,
                Title: lastCrm?.titleName,
                Remark: lastCrm?.remark,
                Disposition: lastCrm?.dispositionName,
              }
            : {};
          const ExtraData = {};
          if (crmData?.CRM) ExtraData['Last CRM by'] = crmData;
          const diffInMinutes = this.typeService.dateDifference(
            new Date(),
            userData.stageTime,
            'Minutes',
          );
          const preparedData = {
            'Difference in minutes': diffInMinutes,
            'Waiting time': this.getWaitingTime(diffInMinutes),
            'Loan id': masterData.loanId ?? '-',
            Name: userData.fullName ?? '-',
            'Mobile number':
              this.cryptService.decryptPhone(userData.phone) ?? '',
            'Last CRM by': lastCrm?.adminName ?? '-',
            'Completed loans': userData.completedLoans ?? 0,
            'Type of document': userData.homeType ?? '-',
            Optional: userData.homeProofImage ?? '',
            City: userData.city ?? '-',
            'Last action by':
              userData.residenceProofApproveByName ??
              (
                await this.sharedCommonService.getAdminData(
                  userData.residenceAdminId,
                )
              )?.fullName ??
              '-',
            userId: userData.id ?? '-',
            'Type Address': typeAddress,
            'Last Location': masterData.miscData?.lastLocation ?? '-',
            'Pin Address': userData.pinAddress ?? '',
            'Reject reason': userData.residenceRejectReason ?? '-',
            Status: '0',
            ExtraData,
          };
          preparedList.push(preparedData);
        } catch (error) {}
      }
      return { rows: preparedList, count: preparedList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // clon migrate api for move Stuck User In Final Bucket
  async migrateUserInFB() {
    try {
      const attributes = ['id', 'status'];
      const options = {
        where: {
          status: {
            bank: { [Op.in]: [1, 3] },
            pan: { [Op.in]: [1, 3] },
            selfie: { [Op.in]: [1, 3] },
            contact: { [Op.in]: [1, 3] },
            eMandate: -1,
            loan: 4,
          },
        },
      };
      const loanList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList === k500Error) return kInternalError;
      for (let index = 0; index < loanList.length; index++) {
        try {
          const ele = loanList[index];
          const id = ele.id;
          const status = ele.status;
          status.loan = 0;
          status.eligibility = 0;
          const update = { status };
          await this.masterRepo.updateRowData(update, id);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get user cibil score data
  async getCibilScoreData(reqData) {
    try {
      const cibilData = await this.cibilService.funGetUserCibilScoreData(
        reqData,
      );
      return cibilData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //cibil hit due to cibil error
  async funCibilHitInBanking(body) {
    try {
      const userId = body?.userId;
      const loanId = body?.loanId;
      const cibilForceFetch = body?.cibilForceFetch;
      const attributes = ['id'];
      const options: any = {
        where: { userId },
      };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return kNoDataFound;

      const cibilResult = await this.cibilService.cibilPersonalLoanScore({
        userId,
        loanId,
        cibilForceFetch,
      });

      if (cibilResult?.message)
        return k422ErrorMessage(
          'Unable to Fetch CIBIL details, Contact IT Support',
        );
      if (cibilResult?.controlData?.success == false)
        return k422ErrorMessage(
          'Unable to Fetch CIBIL details, Contact IT Support',
        );

      if (cibilResult.isLoanDeclined == true) {
        const remark = BAD_CIBIL_SCORE_MSG;
        const adminId = SYSTEM_ADMIN_ID;
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 90);

        ///Reject loan at this step

        await this.adminService.changeBlacklistUser({
          userId,
          adminId,
          type: '2',
          reason: remark,
          reasonId: 52,
          status: '0',
          nextApplyDate: targetDate,
        });
        const errorMsg = k422ErrorMessage(
          'Loan declined as profile not matched with CIBIL criteria',
        );
        return {
          isLoanDeclined: true,
          ...errorMsg,
        };
      } else if (cibilResult.isLoanDeclined == false) {
        let scoreData: any = {};
        scoreData.cibilScore =
          cibilResult?.responsedata?.consumerCreditData[0]?.scores[0]?.score.replace(
            /^0+/,
            '',
          );
        scoreData.plScore =
          cibilResult?.responsedata?.consumerCreditData[0]?.scores[1]?.score.replace(
            /^0+/,
            '',
          );
        return scoreData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Edit Company Name Mismatch
  async editCompanyNameMismatch(reqData) {
    try {
      const updatedCompanyName = reqData?.updatedCompanyName;
      if (!updatedCompanyName) return kParamMissing('CompanyName');

      const adminId = reqData?.adminId;
      if (!adminId) return kParamMissing('adminId');

      const empId = reqData?.empId;
      if (!empId) return kParamMissing('empId');

      const updatedData = { updatedCompanyName, companyNameChangeBy: adminId };
      await this.employementRepo.updateRowData(updatedData, empId);

      const empData = await this.employementRepo.getRowWhereData(
        ['userId', 'companyName'],
        { where: { id: empId } },
      );
      if (empData == k500Error) return kInternalError;
      const data = {
        userId: empData?.userId,
        type: 'Verification',
        subType: 'Company Name',
        oldData: empData.companyName ?? '',
        newData: updatedCompanyName,
        adminId,
        ip: reqData?.ip ?? '',
      };
      await this.changeLogsRepo.create(data);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async manualAsignVerification(reqData) {
    try {
      const assignId = reqData?.assignId;
      const loanId = reqData?.loanId;
      if (!assignId) return kParamMissing('assignId');
      if (!loanId) return kParamMissing('loanId');
      const updateData = {
        assignTo: assignId,
      };
      const option = {
        where: {
          id: { [Op.in]: loanId },
          loanStatus: { [Op.in]: ['Accepted', 'InProcess'] },
        },
      };
      const updateAssignee = await this.loanRepo.updateRowWhereData(
        updateData,
        option,
      );
      if (updateAssignee === k500Error) return k500Error;
      return kSuccessMessage(kAssignmentSuccessMessage);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async manualAssignUserStuck(reqData) {
    try {
      const assignId = reqData?.assignId;
      const userIds = reqData?.userId;
      if (!assignId) return kParamMissing('assignId');
      if (!userIds) return kParamMissing('userId');
      const updateData = {
        assignedCSE: assignId,
      };
      const attr = ['masterId'];
      const options = {
        where: {
          id: { [Op.in]: userIds },
        },
      };
      const masterDetails = await this.userRepository.getTableWhereData(
        attr,
        options,
      );
      if (masterDetails == k500Error) return kInternalError;
      const masterIds = masterDetails.map((master) => master.masterId);
      const updateAssignee = await this.masterRepo.updateRowWhereData(
        updateData,
        { where: { id: { [Op.in]: masterIds } } },
      );
      if (updateAssignee === k500Error) return k500Error;
      return kSuccessMessage(kAssignmentSuccessMessage);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async creditAnalystAdmins() {
    try {
      const options = {
        where: { roleId: CREDITANALYST, isActive: '1' },
        order: [['id']],
      };
      const creditAnalysts = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        options,
      );
      if (creditAnalysts == k500Error) return kInternalError;
      return creditAnalysts;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async cseAdmins() {
    try {
      let cseAdmins = await this.redisService.get('CSE_ADMIN_LIST');
      if (!cseAdmins) return kInternalError;
      cseAdmins = JSON.parse(cseAdmins);
      const result = cseAdmins.map((admin) => {
        return {
          id: admin.id,
          fullName: admin.fullName,
        };
      });
      return result;
    } catch (error) {}
  }

  async reshuffleVerificationAssignment(body) {
    try {
      const type = body?.type;
      if (!type) return kParamMissing('type');
      let details;

      switch (type) {
        case 'Employment':
          details = await this.employment();
          break;
        case 'Bank verification':
          details = await this.banking('');
          break;
        case 'Selfie':
          details = await this.selfie();
          break;
        case 'Kyc':
          details = await this.kyc();
          break;
        case 'Final verification':
          details = await this.finalApproval('');
          break;
        default:
          return kParamMissing('Invalid type');
      }

      let loanId = type == 'Employment' ? 'Loan Id' : 'Loan id';
      if (details?.message) return details;
      const ids = [];
      for (const item of details.rows) {
        ids.push(item[loanId]);
      }
      const result = await this.sharedEligibility.assignToCa(ids);
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async reshuffleUserStuckAssignment(body) {
    body.download = 'true';
    const userDetails = await this.analysisService.funGetUserStuckData(body);
    const userIds = [];
    for (const item of userDetails.rows) {
      userIds.push(item?.userId);
    }
    const attr = ['masterId'];
    const options = {
      where: {
        id: { [Op.in]: userIds },
      },
    };
    let masterIds = await this.userRepository.getTableWhereData(attr, options);
    if (masterIds == k500Error) return kInternalError;
    masterIds = masterIds.map((master) => master.masterId);
    const result = await this.sharedEligibility.assignToCSE(masterIds);
    return result;
  }

  async prepareData(data) {
    try {
      let finalData: any = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        let prepareData: any = {};
        prepareData['Id'] = item?.id;
        prepareData['LoanId'] = item?.loanId ?? '-';
        prepareData['UserId'] = item?.userId ?? '-';
        prepareData['Stage'] = item?.stage ?? '-';
        prepareData['CreatedAt'] = item?.createdAt ?? '-';
        prepareData['Ip'] = item?.ip ?? '-';
        prepareData['Device Id'] = item?.deviceId ?? '-';
        prepareData['City'] = item?.city ?? '-';
        prepareData['Ip Location'] = item?.ipLocation ?? '-';
        prepareData['Ip Country'] = item.ipCountry ?? '-';
        prepareData['UTR'] = item?.otherDetails?.utr ?? '-';
        prepareData['Loan Amount'] = item?.otherDetails?.loanAmount ?? '-';
        prepareData['Bank Account'] = item?.otherDetails?.bankAccount ?? '-';
        prepareData['Payout Account'] =
          item?.otherDetails?.payoutAccount ?? '-';
        prepareData['Mode Of Payment'] =
          item?.otherDetails?.modeOfPayment ?? '-';
        prepareData['Device'] = item?.otherDetails?.device ?? '-';
        prepareData['Repay Account'] = item?.otherDetails?.repayAccount ?? '-';
        prepareData['Account Deducted'] =
          item?.otherDetails?.accountDeductes ?? '-';

        finalData.push(prepareData);
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
