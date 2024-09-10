// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import { Op, Sequelize } from 'sequelize';
import { EnvConfig } from 'src/configs/env.config';
import { CHANGE_LOGS_REPOSITORY } from 'src/constants/entities';
import {
  ADMIN_LOGIN_CHANCE,
  ADMIN_WRONG_OTP_TIME_MINS,
  BLOCK_USER,
  BLOCK_USER_STATUS_FORMATE,
  CREDIT_ANALYST_ROLE,
  EMAIL_OTP_SUBJECT,
  PAGE_LIMIT,
  PASSWORD_EXPIRE_DAY,
  SYSTEM_ADMIN_ID,
  advocate_role,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k409ErrorMessage,
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import {
  USER_IS_NOT_MATCHED_WITH_COUNTRY,
  kAdminDashboardRoute,
  kAdminOTPRoute,
  kCompanyAlreadyBlacklisted,
  kCurrentPasswordAreSame,
  kEmailNotFound,
  kInActiveAdmin,
  kInvalidDepartment,
  kLoginSuccessfully,
  kNoDataFound,
  kNoSuchCompanyTheList,
  kOTPInvalid,
  kOTPIsExpired,
  kOTPSentInEmail,
  kPasswordChangeSuccessfully,
  kReCreatedAdminPasswordRoute,
  kRoleNotExist,
  kSelectedDateShouldNotbe,
  kTAdminEmailOtp,
  kUserBlocked,
  kUserCoolOf,
  kUserUnBlocked,
  kValidComapnyPhone,
  kValidEmail,
  kValidPassword,
  kValidPhone,
  kWrongCredentials,
  kYouHaveAccess,
  kNoReplyMail,
  kSupportMail,
} from 'src/constants/strings';
import { regEmail, regPassword, regPhone } from 'src/constants/validation';
import { BankingEntity } from 'src/entities/banking.entity';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';
import { crmTitle } from 'src/entities/crmTitle.entity';
import { Department } from 'src/entities/department.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { RedisService } from 'src/redis/redis.service';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { CrmRepository } from 'src/repositories/crm.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { DefaulterSharedService } from 'src/shared/defaulter.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { EmiSharedService } from 'src/shared/emi.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { CreditAnalystService } from './creditAnalystRedis.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import * as moment from 'moment';
import { APIService } from 'src/utils/api.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { FormUsers } from 'src/entities/formUsers.entity';
import { DateService } from 'src/utils/date.service';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { BlockUserHistoryEntity } from 'src/entities/block.user.history.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly typeService: TypeService,
    private readonly loanRepo: LoanRepository,
    private readonly userRepo: UserRepository,
    private readonly allsmsService: AllsmsService,
    private readonly adminRepo: AdminRepository,
    private readonly userBlackListHistory: BlockUserHistoryRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligiblityService: EligibilitySharedService,
    private readonly reasonRepo: ReasonRepository,
    private readonly masterRepo: MasterRepository,
    private readonly defualterOnlineRepo: DefaulterOnlineRepository,
    private readonly bankRepo: BankingRepository,
    @Inject(forwardRef(() => CalculationSharedService))
    private readonly sharedCalculationService: CalculationSharedService,
    @Inject(forwardRef(() => EmiSharedService))
    private readonly sharedEmi: EmiSharedService,
    @Inject(CHANGE_LOGS_REPOSITORY)
    private readonly changeLogsRepo: typeof ChangeLogsEntity,
    private readonly changeLogRepo: ChangeLogsRepository,
    private readonly crmRepo: CrmRepository,
    private readonly cryptService: CryptService,
    private readonly commonSharedService: CommonSharedService,
    private readonly sharedAssingService: AssignmentSharedService,
    private readonly validationService: ValidationService,
    private readonly departmentRepo: DepartmentRepository,
    private readonly blackListCompanyRepo: BlackListCompanyRepository,
    private readonly commonService: CommonService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly adminSubModelRepo: AdminSubRoleModuleRepository,
    private readonly roleAccessRepo: AccessOfRoleRepository,
    private readonly userActivityRepo: UserActivityRepository,
    private readonly emiRepo: EMIRepository,
    private readonly roleRepo: AdminRoleRepository,
    private readonly defaulterSharedService: DefaulterSharedService,
    private readonly jwtService: JwtService,
    private readonly sharedTransactionService: SharedTransactionService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => CreditAnalystService))
    private readonly creditAnalystService: CreditAnalystService,
    private readonly redisService: RedisService,
    private readonly userServiceV4: UserServiceV4,
    // Utils
    private readonly api: APIService,
    private readonly repoManager: RepositoryManager,
    private readonly dateService: DateService,
    private readonly authAiService: AuthAiService,
  ) {}

  async fetchAllAdminLoggerData(query) {
    try {
      return { count: 0, rows: [] };
    } catch (error) {
      return kInternalError;
    }
  }

  private prepareFinalList(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const createdAt = this.typeService.getDateFormatted(ele?.createdAt);
          const tempData: any = {};
          if (ele?.browser == '') ele.browser = '-';
          if (ele?.page == '') ele.page = '-';
          if (ele?.action == '') ele.action = '-';
          tempData['Admin name'] = ele?.name ?? '-';
          tempData['Api called'] = ele?.api ?? '-';
          tempData['Page'] = ele?.page ?? '-';
          tempData['Action performed'] = ele?.action ?? '-';
          tempData['Browser'] = ele?.browser ?? '-';
          tempData['platform'] = ele?.platform ?? '-';
          tempData['Created at'] = createdAt ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateRemarkByLoanId(body) {
    try {
      const remark = body.remark;
      const adminId = body.adminId;
      const id = body.loanId;
      const where = { loanStatus: 'InProcess' };
      const updateData = {
        remark,
        manualVerificationAcceptId: adminId,
      };
      const updateResult = await this.loanRepo.updateWhere(
        updateData,
        id,
        where,
      );
      if (!updateResult || updateResult == k500Error) return kInternalError;
      return true;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region Getting all defaulter with CRMs who is online today
  async getOnlineDefaulters(query) {
    try {
      if (!query?.adminId) return kParamMissing();
      const onlineDefaulterData: any = await this.getDefaulterOnlineData(query);
      if (onlineDefaulterData?.message) return onlineDefaulterData;
      const finalData: any = this.prepareFinalDefaulters(onlineDefaulterData);
      if (finalData?.message) return finalData;
      return { count: finalData.length, data: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Getting all defaulter's data who is online today
  private async getDefaulterOnlineData(query) {
    try {
      const adminId = query?.adminId;
      const selfieInclude = {
        model: UserSelfieEntity,
        attributes: ['id', 'image'],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone'],
        include: [selfieInclude],
      };
      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = ['payment_status', 'payment_due_status'];
      const loanInclude: { model; attributes?; include? } = {
        model: loanTransaction,
      };
      loanInclude.attributes = ['id'];
      loanInclude.include = [emiInclude];
      const attributes = ['id', 'userId', 'loanId'];
      const options = {
        where: {
          adminId,
          lastOnline: this.typeService.getGlobalDate(new Date()).toJSON(),
          crmId: { [Op.eq]: null },
        },
        include: [loanInclude, userInclude],
      };
      const onlineData = await this.defualterOnlineRepo.getTableWhereData(
        attributes,
        options,
      );
      if (onlineData === k500Error) return kInternalError;

      const crmTitlesInclude = {
        model: crmTitle,
        attributes: ['id', 'title'],
      };
      const crmAttr = [
        'id',
        'userId',
        'loanId',
        'createdAt',
        'remark',
        'description',
        'relationData',
        'due_date',
        'status',
        'adminId',
      ];
      const finalizedList = [];
      for (let i = 0; i < onlineData.length; i++) {
        try {
          const row = onlineData[i];
          const loanData = row?.loanData ?? {};
          const emiList = loanData.emiData ?? [];
          // Admin should not show popup if there is no  unpaid delay emi
          const isEMIUnPaid = emiList.find(
            (el) => el.payment_status == '0' && el.payment_due_status == '1',
          );
          if (!isEMIUnPaid) continue;
          const crmOps = {
            where: { userId: row?.userId },
            order: [['id', 'DESC']],
            include: [crmTitlesInclude],
            limit: 3,
          };
          const crmData: any = await this.crmRepo.getTableWhereData(
            crmAttr,
            crmOps,
          );
          if (crmData && crmData != k500Error) {
            for (let i = 0; i <= crmData.length - 1; i++) {
              let adminData = await this.commonSharedService.getAdminData(
                crmData[i].adminId,
              );
              crmData[i].adminData = adminData;
              row.crmData = crmData;
            }
          }
          finalizedList.push(row);
        } catch (error) {
          console.log(error);
        }
      }
      return finalizedList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private prepareFinalDefaulters(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData = {};
          tempData['userId'] = ele?.userId ?? '-';
          tempData['userImage'] = ele?.user?.selfieData?.image ?? '-';
          tempData['phone'] =
            this.cryptService.decryptPhone(ele?.user?.phone) ?? '-';
          tempData['User name'] = ele?.user?.fullName ?? '-';
          tempData['Loan ID'] = ele?.loanId ?? '-';
          const crmData = ele?.crmData ?? [];
          const crmList = [];
          for (let i = 0; i < crmData.length; i++) {
            try {
              const crm = crmData[i];
              const tempCrm = {};
              tempCrm['Loan ID'] = crm?.loanId ?? ele?.loanId ?? '-';
              tempCrm['Created date'] =
                this.typeService.getDateFormatted(crm?.createdAt) ?? '-';
              tempCrm['Title'] =
                crm?.relationData?.titleName ?? crm?.titleData?.title ?? '-';
              tempCrm['Description'] = crm?.remark ?? crm?.description ?? '-';
              tempCrm['Due date'] = crm?.due_date
                ? this.typeService.getDateFormatted(crm?.due_date)
                : '-';
              tempCrm['Status'] = crm?.status ?? '-';
              tempCrm['Admin name'] = crm?.adminData?.fullName ?? '-';
              crmList.push(tempCrm);
            } catch (error) {}
          }
          tempData['CRM data'] = crmList;
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      kInternalError;
    }
  }

  // check ip web
  async funIpCheckWeb(body) {
    const userId = body.userId;
    const internalResponse = body.internalResponse;
    if (!userId) return;
    if ((internalResponse?.country ?? '').toLowerCase() === 'india') {
      const option = { where: { userId } };
      const att = ['id', 'status'];
      const result = await this.masterRepo.getRowWhereData(att, option);
      if (!result || result === k500Error) return kInternalError;
      if (!result.id) return kInternalError;
      const status = result?.status ?? {};
      status.ipCheck = 1;
      const update = { status };
      await this.masterRepo.updateRowData(update, result.id);
    }
    // User is currently outside of india
    else {
      const data = {
        userId,
        reasonId: 44,
        reason: USER_IS_NOT_MATCHED_WITH_COUNTRY,
        type: '1',
        status: '1',
        adminId: SYSTEM_ADMIN_ID,
      };
      await this.changeBlacklistUser(data);
    }
  }

  async changeBlacklistUser(body) {
    try {
      const userId = body.userId;
      const reasonId = body?.reasonId;
      const reason = body?.reason;
      const status = body?.status;
      const adminId = body.adminId;
      const type = body?.type ?? '1';
      const nextApplyDate = body?.nextApplyDate
        ? this.typeService.getGlobalDate(body?.nextApplyDate)
        : body?.nextApplyDate;

      if (
        !adminId ||
        !userId ||
        !type ||
        (type == '1' && !status) ||
        (type == '2' && !nextApplyDate) ||
        (status != '0' && !reasonId && !reason)
      )
        return kParamsMissing;
      const masterInclude = {
        required: false,
        model: MasterEntity,
        attributes: ['id', 'coolOffData'],
      };
      const checkUser = await this.userRepo.getRowWhereData(
        ['id', 'isBlacklist'],
        {
          where: { id: userId },
          include: [masterInclude],
        },
      );
      if (checkUser === k500Error) return kInternalError;
      if (!checkUser) return k422ErrorMessage(kNoDataFound);
      const masterData = checkUser?.masterData;
      const coolOffData = masterData?.coolOffData ?? {};
      const today = this.typeService.getGlobalDate(new Date());
      // type=='1' then put in blacklist
      let result: any;
      if (type == '1') {
        if (checkUser?.isBlacklist == status) return 'Already Updated';
        const updatedData = { isBlacklist: status };
        if (status == '0') {
          coolOffData.coolOffStartedOn = '';
          coolOffData.coolOffEndsOn = '';
        }
        result = await this.userRepo.updateRowData(updatedData, userId);
      } else if (type == '2') {
        // type=='2' then put in cool-off
        if (nextApplyDate <= today)
          return k422ErrorMessage(kSelectedDateShouldNotbe);
        coolOffData.coolOffStartedOn = today.toJSON();
        coolOffData.coolOffEndsOn = nextApplyDate.toJSON();
        coolOffData.count = (coolOffData?.count ?? 0) + 1;
        coolOffData.reason = reason;
        coolOffData.reasonId = reasonId;
        result = await this.masterRepo.updateRowData(
          { coolOffData },
          masterData?.id,
        );
      }
      let message: any;
      // check if data updated
      if (result != k500Error && result[0] == 1) {
        if (status == '1' || (status == '0' && type === '2')) {
          //step reject when user in block or in cool-off
          await this.rejectLoanOnBlock(
            userId,
            adminId,
            reasonId,
            nextApplyDate,
            reason,
            status,
          );
          message = status == '1' && type == '1' ? kUserBlocked : kUserCoolOf;
        } else message = kUserUnBlocked;
        //manage history
        const historyData = {
          reasonId,
          userId,
          reason,
          isBlacklist: type == '1' ? status : '',
          blockedBy: adminId,
          coolOfDate: nextApplyDate ? nextApplyDate?.toJSON() : null,
        };
        await this.userBlackListHistory.createRowData(historyData);
      }

      await this.userServiceV4.routeDetails({ id: userId });

      return message;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  private async rejectLoanOnBlock(
    userId,
    adminId,
    reasonId,
    nextApplyDate,
    reason,
    status,
  ) {
    try {
      if (reasonId) {
        const attributes = ['reason'];
        const options = { where: { id: reasonId } };
        const reasonData = await this.reasonRepo.getRowWhereData(
          attributes,
          options,
        );
        if (!reasonData) return k422ErrorMessage('No data found');
        if (reasonData == k500Error) return kInternalError;
        reason = reasonData?.reason ?? '';
      }

      const loanOptions = {
        where: {
          userId,
          loanStatus: { [Op.or]: ['InProcess', 'Accepted'] },
        },
        order: [['id', 'DESC']],
      };
      const loanData = await this.loanRepo.getRowWhereData(['id'], loanOptions);
      if (loanData === k500Error) return k500Error;
      //if loan exists then reject loan
      if (loanData) {
        await this.sharedEligiblityService.rejectLoan(
          adminId,
          loanData.id,
          reason,
          userId,
          nextApplyDate,
          null,
          true,
          status == '1' ? true : false,
        );
      }

      //reject step if loan is not available
      await this.sharedEligiblityService.checkAndRejectSteps(userId, reason);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async validatedToken(token) {
    try {
      const att = ['id', 'roleId', 'jwtDetails'];
      const where = { jwtDetails: { [Op.iRegexp]: token }, isActive: '1' };
      const result = await this.adminRepo.getRoweData(att, { where });
      if (!result || result === k500Error) return false;
      const jwt = result.jwtDetails;
      if (jwt) {
        const find = JSON.parse(jwt).find((f) => f.jwtToken === token);
        if (find) {
          const currDate = new Date();
          const expiryDate = new Date(find.jwtTokenExpireDate);
          if (expiryDate.getTime() > currDate.getTime())
            return { id: result.id, roleId: result.roleId };
        }
      }
      return false;
    } catch (error) {
      console.log({ token: error });
      return false;
    }
  }

  async loanDataChangeAbilityCheck(email, token) {
    try {
      const data = await this.checkNValidateToken(email, token);
      if (data.isExpired) return false;
      if (data.adminData && data.adminData.changeableData) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async checkNValidateToken(email, token) {
    try {
      const attributes = [
        'id',
        'fullName',
        'roleId',
        'email',
        'password',
        'phone',
        'jwtDetails',
        'thirdPartyViews',
        'changeableData',
        'isRefund',
      ];
      const allAdmins = await this.adminRepo.getTableWhereData(attributes, {});
      let checkUser;
      for (let index = 0; index < allAdmins.length; index++) {
        try {
          const adminData = allAdmins[index];
          adminData.email = await this.cryptService.decryptText(
            adminData.email,
          );
          if (adminData.email == email.toLowerCase()) {
            checkUser = adminData;
            break;
          }
        } catch (error) {}
      }
      let currJwt;
      let isTokenExpired = true;
      if (checkUser.jwtDetails) {
        JSON.parse(checkUser.jwtDetails).map((singleData) => {
          if (token == singleData.jwtToken) {
            currJwt = singleData;
          }
        });
        if (currJwt) {
          const currDate = new Date();
          const expiryDate = new Date(currJwt.jwtTokenExpireDate);
          isTokenExpired = expiryDate.getTime() < currDate.getTime();
        } else {
          isTokenExpired = true;
        }
      }
      return { isExpired: isTokenExpired, adminData: checkUser };
    } catch (error) {
      return { isExpired: false };
    }
  }

  async validateAdminRequest(id: number, type: string) {
    try {
      const attributes = ['id'];
      const where: any = { id };
      where[type] = true;
      const options = { where };
      const adminData = await this.adminRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!adminData) return false;
      else if (adminData == k500Error) return k500Error;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funChangeApprovalAmount(body) {
    try {
      const loanId = body.loanId;
      if (!loanId) return kParamMissing('loanId');
      const amount = body.amount;
      if (!amount) return kParamMissing('amount');
      const adminId = body.adminId;
      if (!adminId) return kParamMissing('adminId');
      return await this.sharedCalculationService.acceptAmount(body);
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  async changeSalaryDate(body) {
    try {
      const adminId = body.adminId;
      const loanId = body.loanId;
      const newDate = body.salaryDate;
      if (!adminId || !loanId || !newDate) return kParamsMissing;
      if (newDate < 1 || newDate > 31)
        return k422ErrorMessage('Invalid salaryDate');
      // Get and validate data
      const attributes = [
        'esign_id',
        'interestRate',
        'loanStatus',
        'netApprovedAmount',
        'bankingId',
        'netSoftApproval',
        'userId',
      ];
      const bankingInclude = {
        model: BankingEntity,
        attributes: ['id', 'salaryDate'],
      };
      const options = { where: { id: loanId }, include: [bankingInclude] };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      else if (!loanData) return k422ErrorMessage('Loan data not found!');
      const loanStatus = loanData.loanStatus;
      if (loanStatus != 'InProcess' && loanStatus != 'Accepted')
        return k422ErrorMessage(`Loan is ${loanStatus}`);
      else if (loanData.esign_id) k422ErrorMessage('Esign inititated!');
      const bankingData = loanData.bankingData;
      const reqData = {
        loanId,
        userId: loanData.userId,
        bankingId: loanData.bankingId,
        oldData: bankingData.salaryDate,
        newData: newDate,
        adminId,
        ip: body.ip,
      };
      const changeSalaryDate: any = await this.updateSalaryDate(reqData);
      if (changeSalaryDate?.message) return changeSalaryDate;
      const updatedData = await this.sharedEmi.refreshCalculation(loanId);
      if (updatedData.message) return updatedData;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async updateSalaryDate(data: any) {
    try {
      const salaryDate = data?.newData;
      const bankingId: number = data?.bankingId;
      data.type = 'Verification';
      data.subType = 'Salary Date';
      const result = await this.changeLogRepo.create(data);
      if (!result || result === k500Error) return kInternalError;
      const update = await this.bankRepo.update({ salaryDate }, bankingId);
      if (!update || update === k500Error) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async funGetPersonalDetails(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'lastOnlineTime'],
      };
      const options = {
        where: { userId },
        include: [userInclude],
        order: [['id', 'DESC']],
      };
      const data = await this.masterRepo.getRowWhereData(
        ['otherInfo', 'loanId'],
        options,
      );
      if (data === k500Error) return kInternalError;
      const otherInfo = data?.otherInfo;
      const relation =
        otherInfo?.maritalInfo == 'Married' ? 'Spouse Name' : 'Mother Name';
      const personalData = {
        'Marital Information': otherInfo?.maritalInfo ?? '-',
        Dependents: otherInfo?.dependents ?? '-',
        [relation]:
          otherInfo?.maritalInfo == 'Married'
            ? otherInfo?.spouseName != ''
              ? otherInfo?.spouseName
              : '-'
            : otherInfo?.motherName != ''
            ? otherInfo?.motherName
            : '-',
        'Employment Information':
          otherInfo?.employmentInfo != '' ? otherInfo?.employmentInfo : '-',
        'Salary Information':
          otherInfo?.salaryInfo != '' ? otherInfo?.salaryInfo : '-',
        'Residential Information':
          otherInfo?.residentialInfo != '' ? otherInfo?.residentialInfo : '-',
        'Education Information':
          otherInfo?.educationInfo != '' ? otherInfo?.educationInfo : '-',
        'Vehicle Information':
          otherInfo?.vehicleInfo?.length != 0
            ? otherInfo?.vehicleInfo?.toString()
            : '-',
      };

      const userData = data?.userData ?? {};
      let lastActiveAgoMinutes: any = Infinity;
      let lastOnlineTime;
      let isOnline;
      if (userData?.lastOnlineTime) {
        const lastOnline = this.typeService.dateTimeToDate(
          userData?.lastOnlineTime,
        );
        lastActiveAgoMinutes = this.typeService.dateDifference(
          lastOnline,
          new Date(),
          'Minutes',
        );
        lastOnlineTime = this.typeService.convertMinutesToHours(lastOnline);
        isOnline = lastActiveAgoMinutes < 5;
      }
      return {
        personalData,
        loanId: data?.loanId,
        lastOnlineTime,
        isOnline,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getMasterData(query) {
    try {
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const options = { where: { loanId } };
      const masterData = await this.masterRepo.getTableWhereData(null, options);
      if (masterData === k500Error) return kInternalError;
      return masterData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async getAdvocateData() {
    try {
      const advocateUpdateData =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      if (advocateUpdateData.message) return advocateUpdateData;
      else if (!advocateUpdateData)
        return k422ErrorMessage(`${advocate_role} not found!`);
      advocateUpdateData.map((ele) => {
        ele.phone = this.cryptService.decryptSyncText(ele.phone);
        ele.email = this.cryptService.decryptSyncText(ele.email);
      });
      return advocateUpdateData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async funUpdateAdminData(data) {
    try {
      if (!data.updateList) return kParamMissing('updateList');
      let advocateData = await this.sharedAssingService.fetchAdminAccordingRole(
        advocate_role,
        true,
      );
      const updateList = data?.updateList ?? [];
      if (!advocateData) return k422ErrorMessage(`${advocate_role} not found!`);
      let remaniningAdv = advocateData.filter((adv) => {
        let find = updateList.find((upd) => upd.adminId == adv.id);
        if (!find) return adv;
      });
      //check remaning total
      let remaningTotal = remaniningAdv.reduce((prev, re) => {
        return prev + (re?.otherData?.case_per ?? 0);
      }, 0);
      // check total percantage
      let total = updateList.reduce((prev, up) => {
        return prev + (up?.case_per ?? 0);
      }, remaningTotal);
      //check total should be match
      if (total != 100)
        return k422ErrorMessage(
          'Total of the percentage distribution should be 100',
        );
      else {
        for (let i = 0; i < updateList.length; i++) {
          try {
            const update = updateList[i];
            const adminId = update.adminId;
            let adminData = advocateData.find((adv) => adv.id == adminId);
            //check admin id is exits or not
            if (!adminId) return kParamMissing('adminId');
            const otherData: any = adminData?.otherData;
            //udpate admin data
            otherData.case_per = update.case_per;
            await this.adminRepo.updateRowData({ otherData }, adminId);
          } catch (error) {}
        }
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region update User loan Status by ontime delay
  async updateUserLoanStatus(query) {
    try {
      // Find loan by id max
      const loanStatus =
        query?.both === 'true' ? ['Complete', 'Active'] : ['Active'];
      let options: any = { where: { loanStatus }, group: ['userId'] };
      const att = [[Sequelize.fn('MAX', Sequelize.col('id')), 'id'], 'userId'];
      let loanList = await this.loanRepo.getTableWhereData(att, options);
      if (loanList === k500Error) return kInternalError;

      // find user id emi with is defaulter
      const loanIds = loanList.map((loan) => loan.id);

      // Table joins
      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = ['payment_due_status', 'payment_status'];
      // Query preparation
      const include = [emiInclude];
      const attributes = ['userId'];
      options = { include, where: { id: loanIds } };
      // Query
      loanList = await this.loanRepo.getTableWhereData(attributes, options);
      if (loanList == k500Error) return kInternalError;

      const onTimeUsers = [];
      const delayedUsers = [];
      const defaultedUsers = [];
      loanList.forEach((el) => {
        try {
          const userId = el.userId;
          const emiList = el.emiData ?? {};
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
      let updatedData = { loanStatus: 3 };
      options = { where: { id: defaultedUsers } };
      await this.userRepo.updateRowWhereData(updatedData, options);

      // Update delayed users
      updatedData = { loanStatus: 2 };
      options = { where: { id: delayedUsers } };
      await this.userRepo.updateRowWhereData(updatedData, options);

      // Update on time users
      updatedData = { loanStatus: 1 };
      options = { where: { id: onTimeUsers } };
      await this.userRepo.updateRowWhereData(updatedData, options);

      return {
        total: onTimeUsers.length + delayedUsers.length + defaultedUsers.length,
        onTime: onTimeUsers.length,
        delayed: delayedUsers.length,
        defaulted: defaultedUsers.length,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion
  async testNameMissMatch() {
    try {
      const name1 = 'kunjan';
      const name2 = 'kunjan rajesh kumar barot';
      const isNameMissMatch = await this.validationService.nameMatch(
        name1,
        name2,
        0,
      );
      return isNameMissMatch;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAdminData(reqData) {
    // Params validation
    const type: string = reqData.type?.toUpperCase() ?? 'ALL';

    // Query preparation
    const attributes = ['fullName', 'id'];
    const where: any = {};
    if (type != 'ALL') {
      if (type == 'COLLECTION') where.collection = true;
      if (type == 'LENDING') where.lending = true;
    }
    const options: any = { where };

    // Get data from admin table
    const data = await this.adminRepo.getTableWhereData(attributes, options);
    if (data == k500Error) return kInternalError;
    return data;
  }

  //#startregion get Department
  async getDepartmentList() {
    try {
      const att = ['id', 'department'];
      const options = { order: [['id']] };
      const result = await this.departmentRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get black list companies
  async getAllBlacklistCompanies(query) {
    try {
      const page = +(query?.page ?? 1);
      const attributes = ['id', 'companyName', 'adminId'];
      const options: any = { order: [['companyName']] };
      if (query?.searchText)
        options.where = { companyName: { [Op.iRegexp]: query?.searchText } };
      if (query?.download != 'true') {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const result =
        await this.blackListCompanyRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #start region find by email
  async fetchByEmail(query) {
    try {
      const email = query?.email;
      if (!email) return kParamMissing('email');
      const attr = ['id', 'email', 'nbfcType', 'fullName'];
      const options = { order: [['id']] };
      const adminList = await this.adminRepo.getTableWhereData(attr, options);
      if (adminList === k500Error) return kInternalError;
      let foundUser;
      for (let i = 0; i < adminList.length; i++) {
        try {
          const element = adminList[i];
          element.email = await this.cryptService.decryptText(element?.email);
          if (element?.email === email.toLowerCase()) {
            foundUser = element;
            break;
          }
        } catch (error) {}
      }
      if (!foundUser) return k422ErrorMessage(kEmailNotFound);
      return foundUser;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async downloadKYCDocuments(query) {
    try {
      const url = query?.imageURl;
      if (!url) return kParamMissing('imageURl');
      const data = await this.typeService.getBase64FromImgUrl(url, true);
      if (data === k500Error) return kInternalError;
      const fileName = new Date().getTime() + '.jpg';
      const filePath = './upload/' + fileName;
      await fs.writeFileSync(filePath, data, 'base64');
      const bufferdata = await fs.readFileSync(filePath);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {}
      return bufferdata;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region forgot password
  async forgotAdminPassword(body) {
    try {
      const email = (body?.email ?? '').trim().toLowerCase();
      const adminId = body?.adminId;
      const tempOtp = body?.otp;
      let password = body?.password ?? '';
      if (password && !regPassword(password))
        return k422ErrorMessage(kValidPassword);
      /// send otp
      if (email && !tempOtp) {
        if (!regEmail(email)) return k422ErrorMessage(kValidEmail);
        const admin = await this.fetchByEmail({ email });
        if (admin?.message) return admin;
        // const result = await this.sendOTPtoAdmin(admin.id); for mobile otp varifiaction
        const result: any = await this.sendOTPtoAdminViaEmail(
          admin?.id,
          admin?.fullName,
        );
        if (result?.message) return result;
        return kSUCCESSMessage(kOTPSentInEmail, { adminId: admin?.id });
      }
      if ((!adminId || !tempOtp) && (!adminId || !password))
        return kParamsMissing;
      if (adminId && tempOtp) {
        /// validate otp
        const validateOTP: any = await this.validateAdminOtp(adminId, tempOtp);
        if (validateOTP?.message) return validateOTP;
        if (validateOTP !== true) return validateOTP;
        return { adminId };
      } else if (adminId && password) {
        // check current password match or not match with old password
        const att = ['password', 'id', 'email', 'recentPassword'];
        const option = { where: { id: adminId } };
        const adminDetails: any = await this.adminRepo.getRowWhereData(
          att,
          option,
        );
        let checkRecent: any = {};
        if (adminDetails === k500Error) return kInternalError;
        let recentList = adminDetails.recentPassword;
        if (!recentList || recentList.length == 0)
          recentList = [adminDetails.password];
        checkRecent = await this.updateAndCheckLast3Passwords(
          recentList,
          password,
        );

        if (checkRecent?.message) return kInternalError;
        if (checkRecent?.isMatch)
          return k409ErrorMessage(kCurrentPasswordAreSame);

        /// update password
        if (checkRecent?.isUpdate) {
          password = await this.cryptService.encryptText(password);
          const otp = this.commonService.generateOTP();
          const update = {
            password,
            recentPassword: checkRecent?.recentPassword ?? [],
            phoneStatusVerified: '1',
            otp,
            lastPasswordUpdatedDate: this.typeService
              .getGlobalDate(new Date())
              .toJSON(),
          };
          const result = await this.adminRepo.updateRowData(update, adminId);
          if (result === k500Error) return kInternalError;
          return kSUCCESSMessage(kPasswordChangeSuccessfully, { adminId });
        }
      }
      return k422ErrorMessage('Password not changed');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region send otp to admin via email
  async sendOTPtoAdminViaEmail(id, fullName) {
    try {
      const options = { where: { id } };
      const att = ['id', 'email'];
      const admin = await this.adminRepo.getRoweData(att, options);
      if (admin === k500Error) return kInternalError;
      const otp = this.commonService.generateOTP();
      const updateData = { emailStatusVerified: '0', otp };
      const result = await this.adminRepo.updateRowData(updateData, id);
      if (result === k500Error) return kInternalError;
      let email = admin?.email;
      if (!regEmail(email))
        email = await this.cryptService.decryptText(admin?.email);
      let message = 'Hello ' + fullName;
      message +=
        ',<br/><br/>Your one time password for admin dashboard is ' +
        '<b>' +
        otp +
        '</b>';
      const fromMail = kNoReplyMail;
      const replyTo = kSupportMail;

      await this.sharedNotificationService.sendMailFromSendinBlue(
        email,
        EMAIL_OTP_SUBJECT,
        message,
        null,
        [],
        [],
        fromMail,
        replyTo,
      );
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region validate admin otp
  private async validateAdminOtp(id, otp) {
    try {
      const options = { where: { id } };
      const att = ['id', 'otp', 'updatedAt'];
      const admin = await this.adminRepo.getRoweData(att, options);
      if (admin === k500Error) return kInternalError;
      if (admin.otp != otp) return k422ErrorMessage(kOTPInvalid);
      if (this.typeService.otpIsExpired(admin.updatedAt))
        return k422ErrorMessage(kOTPIsExpired);
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //  #start region update last 3passwords
  async updateAndCheckLast3Passwords(passswordList, currentPassword) {
    const finalObj = {
      isMatch: false,
      isUpdate: false,
      recentPassword: passswordList,
    };
    try {
      const isMatchRecent = await passswordList.find((ele) => {
        const exitPass = this.cryptService.decryptSyncText(ele);
        return exitPass == currentPassword;
      });

      if (isMatchRecent) finalObj.isMatch = true;
      else {
        finalObj.isUpdate = true;
        if (passswordList.length == 3) passswordList.shift();
        currentPassword = await this.cryptService.encryptText(currentPassword);
        passswordList.push(currentPassword);
        finalObj.recentPassword = passswordList;
      }
      return finalObj;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  //#region check has Access
  private async checkHasAccess(adminId, type) {
    try {
      //// find admin data
      const adminAtt = ['roleId'];
      const adminOptions = {
        where: {
          id: adminId,
          isActive: '1',
        },
      };
      const findAdmin = await this.adminRepo.getRowWhereData(
        adminAtt,
        adminOptions,
      );
      if (!findAdmin || findAdmin === k500Error)
        return k422ErrorMessage(kYouHaveAccess);
      const roleId = findAdmin?.roleId;
      if (!roleId) return k422ErrorMessage(kYouHaveAccess);
      //// sub model
      const attSub = ['id'];
      const options = { where: { title: type } };
      const sub = await this.adminSubModelRepo.getRoweData(attSub, options);
      if (!sub || sub === k500Error) return k422ErrorMessage(kYouHaveAccess);
      const subRoleModelId = sub?.id;
      if (!subRoleModelId) return k422ErrorMessage(kYouHaveAccess);
      //// find acceess
      const attAccess = ['id', 'isActive', 'access_list'];
      const optionsAcc = { where: { roleId, subRoleModelId } };
      const find = await this.roleAccessRepo.getRoweData(attAccess, optionsAcc);
      if (!find || find === k500Error) return k422ErrorMessage(kYouHaveAccess);
      const access_list = find?.access_list ?? [];
      if (!access_list.includes(2)) return k422ErrorMessage(kYouHaveAccess);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getChangeableData(query) {
    try {
      const adminId: number = parseInt(query?.adminId);
      if (!adminId) return kParamMissing('adminId');
      const loanId = query?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const hasAccess = await this.checkHasAccess(
        adminId,
        'change approved data',
      );
      if (hasAccess) return hasAccess;

      const attributes = [
        'esign_id',
        'netApprovedAmount',
        'approvedLoanAmount',
        'loanAmount',
        'bankingId',
        'manualVerification',
        'mandate_id',
        'loanStatus',
        'subscriptionId',
      ];
      const bankInclude: any = { model: BankingEntity };
      const subscriptionInclude: any = {
        model: SubScriptionEntity,
        required: false,
      };
      subscriptionInclude.attributes = ['umrn'];
      const include = [bankInclude, subscriptionInclude];
      const options = { where: { id: loanId }, include };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      const maxLoanAmount = loanData?.loanAmount;
      const netApprovedAmount = loanData?.netApprovedAmount;
      if (loanData === k500Error) return kInternalError;
      else if (!loanData) return k422ErrorMessage(kNoDataFound);
      else if (!netApprovedAmount || !maxLoanAmount || loanData.esign_id)
        return {};

      //Net approval amount
      const changeableData: any = { netApprovedAmount, maxLoanAmount };

      let esignStatus = false;
      let mandateStatus = false;
      let showAmountChangeStatus = true;
      const manualVerification = loanData?.manualVerification;
      if (manualVerification == '1' || manualVerification == '3') {
        showAmountChangeStatus = false;
        const isRegistered = loanData?.subscriptionData?.umrn;
        const loanStatus = loanData?.loanStatus;
        if (
          !loanData?.esign_id &&
          isRegistered &&
          (loanStatus == 'InProcess' || loanStatus == 'Accepted')
        )
          esignStatus = true;

        if (
          !loanData.mandate_id &&
          !loanData.subscriptionId &&
          loanStatus == 'Accepted'
        )
          mandateStatus = true;
      }

      changeableData.esignStatus = esignStatus;
      changeableData.mandateStatus = mandateStatus;
      changeableData.showAmountChangeStatus = showAmountChangeStatus;

      //Set values
      const salaryAccount: any = {};
      const additionalAccount: any = {};
      let mandateDetails: any = {};
      let disbursementDetails: any = {};
      const bankingData = loanData?.bankingData;
      salaryAccount.number = loanData?.bankingData?.accountNumber;
      salaryAccount.ifscCode = loanData?.bankingData?.ifsCode;
      salaryAccount.bank = loanData?.bankingData?.bank;
      // Salary account
      if (loanData?.bankingData?.accountNumber == bankingData?.mandateAccount) {
        mandateDetails = { ...salaryAccount };
        salaryAccount.activeMandate = true;
        additionalAccount.activeMandate = false;
      }
      if (
        loanData?.bankingData?.accountNumber == bankingData?.disbursementAccount
      ) {
        disbursementDetails = { ...salaryAccount };
        salaryAccount.activeDisbursement = true;
        additionalAccount.activeDisbursement = false;
      }
      // Additional account
      if (loanData?.bankingData?.additionalAccountNumber) {
        additionalAccount.number =
          loanData?.bankingData?.additionalAccountNumber;
        additionalAccount.ifscCode = loanData?.bankingData?.additionalIFSC;
        additionalAccount.bank = loanData?.bankingData?.additionalBank;
      }
      if (
        loanData?.bankingData?.additionalAccountNumber &&
        loanData?.bankingData?.additionalAccountNumber ==
          bankingData?.mandateAccount
      ) {
        mandateDetails = { ...additionalAccount };
        salaryAccount.activeMandate = false;
        additionalAccount.activeMandate = true;
      }
      if (
        loanData?.bankingData?.additionalAccountNumber &&
        loanData?.bankingData?.additionalAccountNumber ==
          bankingData?.disbursementAccount
      ) {
        disbursementDetails = { ...additionalAccount };
        salaryAccount.activeDisbursement = false;
        additionalAccount.activeDisbursement = true;
      }
      //Removing unnecessary stuff
      delete mandateDetails?.activeMandate;
      delete mandateDetails?.activeDisbursement;
      delete disbursementDetails?.activeMandate;
      delete disbursementDetails?.activeDisbursement;
      changeableData.salaryAccount = salaryAccount;
      if (additionalAccount?.number)
        changeableData.additionalAccount = additionalAccount;
      changeableData.mandateDetails = mandateDetails;
      changeableData.disbursementDetails = disbursementDetails;
      changeableData.loanStatus = loanData?.loanStatus;
      return changeableData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async checkNUpdateWaiver(body) {
    try {
      const userId: string = body.userId;
      if (!userId) return kParamMissing('userId');
      const adminId: number = +body.adminId;
      if (!adminId) return kParamMissing('adminId');
      const loanId: number = +body.loanId;
      if (!loanId) return kParamMissing('loanId');
      const emiId: number = +body.emiId;
      if (!emiId) return kParamMissing('emiId');
      const amount: number = +body.amount;
      if (!amount) return kParamMissing('amount');
      const closeTheEmi: boolean = body?.closeTheEmi == true ? true : false;

      // check permission
      const adminData = await this.adminRepo.checkHasAccess(
        adminId,
        'waive off',
      );
      if (adminData !== true) return adminData;
      // Check loan active
      const loanAttr = ['id', 'loanStatus', 'penaltyCharges'];
      const loanOptions = {
        where: {
          id: loanId,
          loanStatus: 'Active',
        },
      };
      const loanData = await this.loanRepo.getRowWhereData(
        loanAttr,
        loanOptions,
      );
      if (!loanData || loanData == k500Error) return kInternalError;
      // Check emi amount
      const emiAttr = [
        'id',
        'emi_amount',
        'principalCovered',
        'interestCalculate',
        'penalty',
        'regInterestAmount',
        'bounceCharge',
        'gstOnBounceCharge',
        'dpdAmount',
        'penaltyChargesGST',
        'legalCharge',
        'legalChargeGST',
        'paid_waiver',
        'unpaid_waiver',
        'paid_principal',
        'paid_interest',
        'paidRegInterestAmount',
        'paidBounceCharge',
        'paidPenalCharge',
        'paidLegalCharge',
        'waived_regInterest',
        'waived_bounce',
        'waived_penal',
        'waived_legal',
      ];
      const emiOptions = {
        where: {
          id: emiId,
        },
      };
      const emiData: any = await this.emiRepo.getRowWhereData(
        emiAttr,
        emiOptions,
      );
      if (!emiData || emiData == k500Error) return kInternalError;
      if (!loanData?.penaltyCharges?.MODIFICATION_CALCULATION)
        emiData.bounceCharge = 0;
      const paidWaiver = +emiData?.paid_waiver ?? 0;
      const unpaidWaiver = +emiData?.unpaid_waiver ?? 0;
      let emiAmount =
        (emiData?.principalCovered ?? 0) +
        (emiData?.interestCalculate ?? 0) -
        (emiData?.paid_principal ?? 0) -
        (emiData?.paid_interest ?? 0);
      let penalty = this.typeService.manageAmount(emiData?.penalty ?? 0);
      let regInterestAmount = this.typeService.manageAmount(
        (emiData?.regInterestAmount ?? 0) -
          (emiData?.paidRegInterestAmount ?? 0),
      );
      let bounceCharge = this.typeService.manageAmount(
        (emiData?.bounceCharge ?? 0) +
          (emiData?.gstOnBounceCharge ?? 0) -
          (emiData?.paidBounceCharge ?? 0),
      );
      let penalCharge = this.typeService.manageAmount(
        (emiData?.dpdAmount ?? 0) +
          (emiData?.penaltyChargesGST ?? 0) -
          (emiData?.paidPenalCharge ?? 0),
      );
      let legalCharge = this.typeService.manageAmount(
        (emiData?.legalCharge ?? 0) +
          (emiData?.legalChargeGST ?? 0) -
          (emiData?.paidLegalCharge ?? 0),
      );
      let outStanding =
        emiAmount +
        penalty +
        regInterestAmount +
        bounceCharge +
        penalCharge +
        legalCharge;
      const minus10 = outStanding - 10;
      const plus10 = outStanding + 10;
      if (closeTheEmi) {
        if (amount < minus10 || amount > plus10)
          return {
            valid: false,
            message: 'Invalid waiver amount to close EMI!',
          };
      } else {
        if (amount > minus10)
          return {
            valid: false,
            message: 'Invalid waiver amount!',
          };
      }

      // Check emi due and update
      const updateEMIOptions = {
        where: {
          id: emiId,
          payment_status: '0',
          [Op.or]: [
            { payment_due_status: '1' },
            { bounceCharge: { [Op.gt]: 0 } },
          ],
        },
      };
      if (closeTheEmi) {
        const updateData = {};
        updateData['payment_status'] = '1';
        updateData['payment_done_date'] = this.typeService
          .getGlobalDate(new Date())
          .toJSON();
        updateData['pay_type'] = 'EMIPAY';
        const emiUpdateRes = await this.emiRepo.updateRowDataWithOptions(
          updateData,
          updateEMIOptions,
          emiId,
        );
        if (!emiUpdateRes || emiUpdateRes == k500Error) return kInternalError;
        if (emiUpdateRes[0] === 0)
          return {
            valid: false,
            message: 'Failed to update emi!',
          };
      }
      const waiverUpdateRes: any =
        await this.sharedEmi.calculateNUpdateEmiWaiver(
          amount,
          emiAmount,
          penalty,
          regInterestAmount,
          bounceCharge,
          penalCharge,
          legalCharge,
          emiId,
          closeTheEmi ? paidWaiver : unpaidWaiver,
          closeTheEmi,
          emiData,
        );
      if (waiverUpdateRes?.message) return waiverUpdateRes;
      if (!waiverUpdateRes || waiverUpdateRes == k500Error)
        return kInternalError;
      const userActivity = {
        emiId: emiId,
        waiver_emiAmount: waiverUpdateRes?.waiver_emiAmount ?? 0,
        waiver_penalty: waiverUpdateRes?.waiver_penalty ?? 0,
        waiver_regIntAmount: waiverUpdateRes?.waiver_regIntAmount ?? 0,
        waiver_bounce: waiverUpdateRes?.waiver_bounce ?? 0,
        waiver_penal: waiverUpdateRes?.waiver_penal ?? 0,
        waiver_legal: waiverUpdateRes?.waiver_legal ?? 0,
      };
      const createAcitivity = {
        loanId,
        userId,
        type: closeTheEmi ? 'WAIVER_PAID' : 'WAIVER',
        date: this.typeService.getGlobalDate(new Date()).toJSON(),
        respons: JSON.stringify(userActivity),
      };
      await this.userActivityRepo.createRowData(createAcitivity);
      await this.sharedCalculationService.updateWaivedBifurcation(
        emiId,
        userActivity,
      );
      const logCreateObj: any = {
        userId,
        loanId,
        type: 'Waiver',
        subType: 'Waiver',
        oldData:
          (+emiData.emi_amount ?? 0) +
          (+emiData.penalty ?? 0) +
          (+emiData.regInterestAmount ?? 0) +
          (+emiData.bounceCharge ?? 0) +
          (+emiData.gstOnBounceCharge ?? 0) +
          (+emiData.dpdAmount ?? 0) +
          (+emiData.penaltyChargesGST ?? 0) +
          (+emiData.legalCharge ?? 0) +
          (+emiData.legalChargeGST ?? 0),
        newData: waiverUpdateRes.updatedOutstandingAmount,
        adminId,
        ip: body.ip,
      };
      await this.changeLogRepo.create(logCreateObj);
      if (closeTheEmi) {
        const canCompleteLoan =
          await this.sharedTransactionService.isEligibleForLoanClose(loanId);
        if (canCompleteLoan)
          return await this.sharedTransactionService.closeTheLoan({
            loanId,
            userId,
          });
      }
      return waiverUpdateRes;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // #region all admin details
  async getAllAdminDetails(query) {
    try {
      const page = query?.page ?? 1;
      const pageSize = query?.pageSize ?? PAGE_LIMIT;
      const roleId = query?.roleId;
      let searchText: any = query?.searchText;
      const att = [
        'id',
        'fullName',
        'roleId',
        'email',
        'phone',
        'companyPhone',
        'lastLoginDate',
        'isActive',
        'nbfcType',
        'otherData',
        'createdAt',
        'isLogin',
      ];
      const options: any = {
        where: {},
        order: [['id']],
        include: [{ model: Department, attributes: ['id', 'department'] }],
      };
      if (roleId) options.where.roleId = roleId;

      if (query?.download == 'true') searchText = '';
      if (query?.download != 'true' && !searchText) {
        options.offset = page * pageSize - pageSize;
        options.limit = pageSize;
      }
      const result = await this.adminRepo.getTableWhereDataWithCounts(
        att,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      const adminList = [];
      let count = 0;
      for (let index = 0; index < result?.rows?.length; index++) {
        try {
          const e: any = result.rows[index];
          e.isLogin = e.isLogin == null ? 0 : e.isLogin;
          e.email = await this.cryptService.decryptText(e.email);
          e.phone = await this.cryptService.decryptText(e.phone);
          const fullName = e?.fullName?.toUpperCase();

          if (e?.companyPhone)
            e.companyPhone = await this.cryptService.decryptText(
              e?.companyPhone,
            );

          if (searchText) {
            let fullNameSearch;
            if (isNaN(searchText)) fullNameSearch = searchText.toUpperCase();
            if (
              fullName.includes(fullNameSearch) ||
              e.email.includes(searchText) ||
              (e?.phone && e?.phone?.includes(searchText)) ||
              (e?.companyPhone && e?.companyPhone?.includes(searchText))
            ) {
              count++;
              adminList.push(e);
            }
          } else adminList.push(e);
        } catch (error) {}
      }
      const finalData = { count: result.count, rows: adminList };
      if (searchText) finalData.count = count;
      if (count > 10) {
        const skip1 = page * pageSize - pageSize;
        finalData.rows = adminList.slice(skip1, skip1 + pageSize);
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  // #endregion

  ///#region edit Admin
  async editAdmin(body) {
    try {
      const adminId = body?.adminId;
      const isActive = body?.isActive;
      const roleId = body?.roleId;
      const departmentId = body?.departmentId;
      const phone = body?.phone;
      let email = body?.email;
      const companyPhone = body?.companyPhone;
      const nbfcType = body?.nbfcType;
      let case_per = body?.case_per;
      let address = body?.address;
      let signature_image = body?.signature_image;
      let enrollmentNo = body?.enrollmentNo;
      let personalEmail = body?.personalEmail;
      if (
        !adminId ||
        (!isActive && !roleId && !departmentId && !phone && !nbfcType)
      )
        return kParamsMissing;
      if (phone && !regPhone(phone)) return k422ErrorMessage(kValidPhone);
      if (companyPhone && !regPhone(companyPhone))
        return k422ErrorMessage(kValidComapnyPhone);
      if (email) {
        email = email.toLowerCase();
        if (!regEmail(email))
          return k422ErrorMessage('Please enter valid email address');
      }
      const update: any = {};
      if (nbfcType) update.nbfcType = nbfcType;
      if (isActive) update.isActive = isActive;
      if (departmentId) {
        const isDepartmentExits = await this.departmentRepo.getRowWhereData(
          ['id'],
          { where: { id: departmentId } },
        );
        if (!isDepartmentExits || isDepartmentExits === k500Error)
          return k422ErrorMessage(kInvalidDepartment);
        update.departmentId = departmentId;
      }
      /// check role is exist or not
      if (roleId) {
        const findRole = await this.checkRoleExist(roleId);
        if (findRole) return findRole;
        update.roleId = roleId;
      }

      //  check email is exist or not
      if (email) {
        const att = ['email'];
        const find = await this.adminRepo.getTableWhereData(att, {
          where: { id: { [Op.ne]: adminId } },
        });
        if (find === k500Error) return kInternalError;
        for (let i = 0; i < find.length; i++) {
          const ele = find[i];
          const existedEmail = await this.cryptService.decryptText(ele?.email);
          if (existedEmail == email)
            return k422ErrorMessage(
              'Email id is already in use, try with another email address',
            );
        }
      }
      if (isActive == '0') {
        update.jwtDetails = null;
        const options: any = {
          where: { followerId: adminId, loanStatus: 'Active' },
          include: [
            {
              model: EmiEntity,
              attributes: [],
              where: { payment_status: '0', payment_due_status: '0' },
            },
          ],
        };
        const loanData = await this.loanRepo.getTableWhereData(['id'], options);
        if (loanData === k500Error) return kInternalError;

        if (loanData && loanData.length > 0) {
          for (const loan of loanData) {
            await this.loanRepo.updateRowData({ followerId: null }, loan.id);
          }
        }
      }
      if (phone) update.phone = await this.cryptService.encryptText(phone);
      if (companyPhone)
        update.companyPhone = await this.cryptService.encryptText(companyPhone);
      if (email) update.email = await this.cryptService.encryptText(email);
      else update.companyPhone = null;
      const checkAdvocateRole = await this.roleRepo.getRoweData(
        ['id', 'title'],
        { where: { id: roleId, title: advocate_role } },
      );
      let updateExitingUpdate = [];
      let isAdvocate = false;
      if (checkAdvocateRole) {
        const passData = {
          case_per,
          address,
          signature_image,
          enrollmentNo,
          adminId,
          personalEmail,
        };
        const advocateUpdateData: any =
          await this.defaulterSharedService.updateAdvocateDetails(passData);
        if (advocateUpdateData.message) return advocateUpdateData;

        update.otherData = advocateUpdateData?.newAdvocateData ?? {};
        updateExitingUpdate = advocateUpdateData?.exitingAdvocateUpdate ?? [];
        isAdvocate = true;
      }
      const result = await this.adminRepo.updateRowData(update, adminId);
      if (!result || result === k500Error) return kInternalError;
      if (result.toString() == '0') return kBadRequest;
      if (isAdvocate)
        await this.defaulterSharedService.updateAdvocateDetails(
          null,
          updateExitingUpdate,
          true,
        );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region create admin
  async createAdmin(body: any) {
    try {
      const fullName = (body?.fullName ?? '').trim();
      const roleId = body?.roleId;
      const departmentId = body?.departmentId;
      const nbfcType = body?.nbfcType;
      let email = (body?.email ?? '').trim().toLowerCase();
      let phone = (body?.phone ?? '').trim().toLowerCase();
      let companyPhone = (body?.companyPhone ?? '').trim();
      let case_per = body?.case_per;
      let address = body?.address;
      let signature_image = body?.signature_image;
      let enrollmentNo = body?.enrollmentNo;
      let personalEmail = (body?.personalEmail ?? '').trim();

      if (!roleId) return kParamMissing('roleId');
      if (!fullName) return kParamMissing('fullName');
      if (!email) return kParamMissing('email');
      if (!phone) return kParamMissing('phone');
      if (!regEmail(email)) return k422ErrorMessage(kValidEmail);
      if (!regPhone(phone)) return k422ErrorMessage(kValidPhone);

      const att = ['phone', 'email', 'companyPhone'];
      const find = await this.adminRepo.getTableWhereData(att, {});
      if (!find || find === k500Error) return kInternalError;
      const checkAdvocateRole = await this.roleRepo.getRoweData(
        ['id', 'title'],
        { where: { id: roleId, title: advocate_role } },
      );
      let updateExitingUpdate = [];
      let isAdvocate = false;
      let otherData = {};
      if (checkAdvocateRole) {
        const passData = {
          case_per,
          address,
          signature_image,
          enrollmentNo,
          personalEmail,
        };
        const advocateUpdateData: any =
          await this.defaulterSharedService.updateAdvocateDetails(passData);
        if (advocateUpdateData.message) return advocateUpdateData;
        otherData = advocateUpdateData?.newAdvocateData ?? {};
        updateExitingUpdate = advocateUpdateData?.exitingAdvocateUpdate ?? [];
        isAdvocate = true;
      }
      /// check add or not
      for (let index = 0; index < find.length; index++) {
        try {
          const e = find[index];
          /// check phone
          const tempPhone = await this.cryptService.decryptText(e?.phone);
          if (tempPhone) {
            if (tempPhone.trim().toLowerCase() == phone)
              return k409ErrorMessage();
          } else return kInternalError;
          //if user enters professional number then check if alredy exists
          if (companyPhone && e.companyPhone) {
            const comapanyPhoneExits = await this.cryptService.decryptText(
              e.companyPhone,
            );
            if (comapanyPhoneExits) {
              if (comapanyPhoneExits.trim().toLowerCase() == companyPhone)
                return k409ErrorMessage('Company phone already exits!');
            } else return kInternalError;
          }
          const tempEmail = await this.cryptService.decryptText(e.email);
          if (tempEmail) {
            if (tempEmail.trim().toLowerCase() == email)
              return k409ErrorMessage();
          } else return kInternalError;
        } catch (error) {}
      }
      /// check role is exist or not
      const findRole = await this.checkRoleExist(roleId);
      if (findRole) return findRole;
      /// create the data
      let password = this.commonService.generatePassword();
      phone = await this.cryptService.encryptText(phone);
      email = await this.cryptService.encryptText(email);
      password = await this.cryptService.encryptText(password);
      if (companyPhone)
        companyPhone = await this.cryptService.encryptText(companyPhone);
      //  add global date
      let lastPasswordUpdatedDate = this.typeService
        .getGlobalDate(new Date())
        .toJSON();
      const data = {
        fullName,
        roleId,
        email,
        phone,
        password,
        nbfcType,
        departmentId,
        companyPhone,
        lastPasswordUpdatedDate,
        otherData,
      };
      const result = await this.adminRepo.createRowData(data);
      if (result === k500Error) return kInternalError;
      if (result?.roleId == '4') {
        await this.creditAnalystService.storeCreditAnalystOnRedis();
      }
      if (isAdvocate)
        await this.defaulterSharedService.updateAdvocateDetails(
          null,
          updateExitingUpdate,
          true,
        );
      /// send mail
      email = await this.cryptService.decryptText(email);
      let message =
        'Hello ' +
        fullName +
        ',<br/><br/>Your password for admin dashboard is ';
      message += await this.cryptService.decryptText(password);
      message += `<br/>start exploring the admin dashboard from ${process.env.DASHBOARD_URL}`;

      const fromMail = kNoReplyMail;
      const replyTo = kSupportMail;

      await this.sharedNotificationService.sendMailFromSendinBlue(
        email,
        `Password For ${EnvConfig.nbfc.nbfcName}`,
        message,
        null,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region check role is exist or not
  async checkRoleExist(roleId) {
    try {
      const where = { id: roleId };
      const findRole = await this.roleRepo.getRoweData(['id'], { where });
      if (findRole === k500Error) return kInternalError;
      if (!findRole) return k422ErrorMessage(kRoleNotExist);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region black list companies
  async blackListCompanies(companyName, adminId, blockedBy?) {
    try {
      companyName = companyName.trim().toUpperCase();
      const options = { where: { companyName } };
      const find = await this.blackListCompanyRepo.getRowWhereData(
        ['id'],
        options,
      );
      if (find === k500Error) return k500Error;
      if (find) return k422ErrorMessage(kCompanyAlreadyBlacklisted);
      const createData = { companyName, adminId: adminId, blockedBy };
      const result = await this.blackListCompanyRepo.createRawData(createData);
      if (result === k500Error) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region login
  async login(body, token) {
    try {
      const email = (body?.email ?? '').trim().toLowerCase();
      const password = body?.password ?? '';
      const otp = body?.otp;
      if (!email && !otp) return kParamsMissing;
      if (!email && !token && otp) return kParamsMissing;
      if (email) if (!regEmail(email)) return k422ErrorMessage(kValidEmail);
      const admin = await this.checkAdmin(email, token);
      if (!admin) return k422ErrorMessage(kEmailNotFound);
      if (admin === k500Error) return k500Error;
      if (admin?.isActive != '1') return k422ErrorMessage(kInActiveAdmin);

      // Validate google auth
      const isGoogleEmail = body?.isGoogleEmail;
      if (isGoogleEmail == true) {
        if (!body?.googleToken) return kParamMissing('googleToken');
        const googleToken = body?.googleToken;
        const url = EnvConfig.neighbour.studioBaseUrl + 'google/verifyToken';
        const response = await this.api.post(url, { token: googleToken });
        if (response?.data != true) return kInvalidParamValue('googleToken');
      }

      /// admin check role is active
      const where = { id: admin?.roleId };
      const findRole = await this.roleRepo.getRoweData(['id', 'isActive'], {
        where,
      });
      const roleActive = findRole?.isActive;
      if (roleActive != '1') return k422ErrorMessage(kInActiveAdmin);

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const expryDate = new Date();
      expryDate.setHours(23, 59, 59, 999);
      let isJWTExit = false;
      let jwt = [];
      /// find token and check it's valide
      try {
        JSON.parse(admin?.jwtDetails).forEach((element) => {
          try {
            const expDate = element?.jwtTokenExpireDate;
            if (
              startDate.getTime() <= expDate &&
              expryDate.getTime() >= expDate
            ) {
              jwt.push(element);
              if (element?.jwtToken === token) isJWTExit = true;
            }
          } catch (error) {}
        });
      } catch (error) {}
      if (otp) {
        if (!isGoogleEmail) {
          /// validate otp
          if (admin.staticOtp) {
            if (otp != admin?.staticOtp) return k422ErrorMessage(kOTPInvalid);
            // if (otp != '2952') return k422ErrorMessage(kOTPInvalid);
          } else {
            const validateOTP = await this.validateAminOtp(admin?.id, otp);
            if (validateOTP !== true) return validateOTP;
          }
          isJWTExit = true;
        }
      } else {
        /// check password
        if (!isGoogleEmail) {
          if (!password) return kParamsMissing;
          if (password !== admin?.password)
            return k422ErrorMessage(kWrongCredentials);

          // check password expire or not
          const currentDate = this.typeService.getGlobalDate(new Date());
          currentDate.setDate(currentDate.getDate() - PASSWORD_EXPIRE_DAY);
          const lastPasswordUpdated =
            admin?.lastPasswordUpdatedDate ?? currentDate;
          const diffDay = this.typeService.differenceInDays(
            lastPasswordUpdated,
            new Date(),
          );
          if (diffDay >= PASSWORD_EXPIRE_DAY) {
            delete admin?.jwtDetails;
            delete admin?.password;
            delete admin?.phone;
            delete admin?.lastPasswordUpdatedDate;
            delete admin?.staticOtp;
            admin.route = kReCreatedAdminPasswordRoute;
            return admin;
          }

          /// check send otp or not
          if (!isJWTExit && !admin.staticOtp) {
            const result = await this.sendOTPtoAdmin(admin?.id);
            if (result) return result;
          }
        }
      }
      /// generate jwt token and add to response
      const findToken = jwt.find((e) => e.jwtToken === token);
      let jwtToken = await this.generateToken(admin?.id);
      if (!findToken) {
        if (isGoogleEmail) isJWTExit = true;
        if (isJWTExit) {
          const newObj = {
            jwtToken: jwtToken,
            jwtTokenExpireDate: expryDate.getTime(),
          };
          jwt = [newObj];
        }
      } else jwtToken = token;

      /// update
      const update: any = {
        jwtDetails: JSON.stringify(jwt),
        phoneStatusVerified: '0',
      };
      if (isJWTExit) update.phoneStatusVerified = '1';
      if (isJWTExit) update.lastLoginDate = new Date();
      if (isJWTExit) update.isLogin = '1';
      const result = await this.adminRepo.updateRowData(update, admin?.id);

      if (!result || result === k500Error) return k500Error;
      if (result?.roleId == CREDIT_ANALYST_ROLE) {
        await this.creditAnalystService.storeCreditAnalystOnRedis();
      }
      if (isJWTExit && admin?.roleId == CREDIT_ANALYST_ROLE) {
        const redisData = await this.redisService.get(
          'CREDIT_ANALYSTS_ADMIN_LIST',
        );
        const data = await JSON.parse(redisData);
        data.forEach((user) => {
          if (user.id === admin?.id) {
            user.isLogin = '1';
          }
        });
        await this.redisService.set(
          'CREDIT_ANALYSTS_ADMIN_LIST',
          JSON.stringify(data),
        );
      }
      const adminList = await this.redisService.get('ADMIN_LIST');
      const admins = await JSON.parse(adminList);
      admins[admin.id] = {
        isLogin: 1,
        lastActivityTime: new Date(),
      };
      await this.redisService.set('ADMIN_LIST', JSON.stringify(admins));
      delete admin?.jwtDetails;
      delete admin?.password;
      admin.phone = await this.cryptService.decryptText(admin?.phone);
      if (admin?.companyPhone)
        admin.companyPhone = await this.cryptService.decryptText(
          admin?.companyPhone,
        );
      delete admin?.staticOtp;
      delete admin?.lastPasswordUpdatedDate;
      admin.jwtToken = jwtToken;
      const tempRoute = isJWTExit ? kAdminDashboardRoute : kAdminOTPRoute;
      admin.route = isGoogleEmail ? kAdminDashboardRoute : tempRoute;
      return kSUCCESSMessage(kLoginSuccessfully, admin);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  async logOut(body) {
    try {
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');

      const adminRoleDetails = await this.adminRepo.getRowWhereData(
        ['roleId'],
        { where: { id: adminId } },
      );

      if (adminRoleDetails === k500Error) return k500Error;

      const update = {
        jwtDetails: null,
        isLogin: 0,
      };
      const adminDetails = await this.adminRepo.updateRowData(update, adminId);
      if (!adminDetails || adminDetails === k500Error) return k500Error;
      if (adminRoleDetails.roleId == CREDIT_ANALYST_ROLE) {
        const redisData = await this.redisService.get(
          'CREDIT_ANALYSTS_ADMIN_LIST',
        );
        const data = await JSON.parse(redisData);
        data.forEach((user) => {
          if (user.id === adminId) {
            user.isLogin = '0';
          }
        });

        await this.redisService.set(
          'CREDIT_ANALYSTS_ADMIN_LIST',
          JSON.stringify(data),
        );
      }
      const adminList = await this.redisService.get('ADMIN_LIST');
      const admins = await JSON.parse(adminList);
      if (adminId in admins) {
        admins[adminId].isLogin = 0;
        admins[adminId].lastActivityTime = null;
      }
      await this.redisService.set('ADMIN_LIST', JSON.stringify(admins));
      return kSUCCESSMessage;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region check admin
  async checkAdmin(email, token) {
    try {
      const attributes = [
        'id',
        'email',
        'phone',
        'password',
        'jwtDetails',
        'fullName',
        'roleId',
        'nbfcType',
        'isActive',
        'lastPasswordUpdatedDate',
        'companyPhone',
        'staticOtp',
        'latestRBIGuideline',
      ];
      const options: any = { where: {} };
      if (!email && token) options.where.jwtDetails = { [Op.iRegexp]: token };
      const depertmentInclude = {
        model: Department,
        attributes: ['id', 'department'],
        required: false,
      };
      options.include = [depertmentInclude];
      const allAdmins = await this.adminRepo.getTableWhereData(
        attributes,
        options,
      );

      if (allAdmins == k500Error) return k500Error;

      let checkUser;
      for (let index = 0; index < allAdmins?.length; index++) {
        try {
          const adminData: any = allAdmins[index];
          adminData.email = await this.cryptService.decryptText(
            adminData?.email,
          );
          adminData.password = await this.cryptService.decryptText(
            adminData?.password,
          );
          if (email) {
            if (adminData.email == email) {
              checkUser = adminData;
              break;
            }
          } else if (token && (adminData?.jwtDetails ?? '').includes(token)) {
            checkUser = adminData;
            break;
          }
        } catch (error) {}
      }
      return checkUser;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  //#region validate admin otp
  private async validateAminOtp(id, otp) {
    try {
      const options = { where: { id } };
      const att = [
        'id',
        'otp',
        'updatedAt',
        'lastOtpAttemptTime',
        'wrongOtpCount',
      ];
      const currentDate = new Date();

      const admin = await this.adminRepo.getRoweData(att, options);
      if (!admin || admin === k500Error) return k500Error;

      let chanceLeft = admin?.wrongOtpCount;
      let timeDiff;
      if (admin.lastOtpAttemptTime) {
        timeDiff = await this.typeService.dateDifference(
          currentDate,
          admin.lastOtpAttemptTime,
          'Minutes',
        );
      }
      if (admin?.otp != otp) {
        chanceLeft = chanceLeft + 1;
        if (
          chanceLeft > ADMIN_LOGIN_CHANCE &&
          timeDiff < ADMIN_WRONG_OTP_TIME_MINS
        ) {
          return k422ErrorMessage(
            `Please try again after ${
              ADMIN_WRONG_OTP_TIME_MINS - timeDiff + 1
            } minutes`,
          );
        } else if (timeDiff >= ADMIN_WRONG_OTP_TIME_MINS) chanceLeft = 1;
        const updateData = {
          wrongOtpCount: chanceLeft,
          lastOtpAttemptTime: currentDate,
        };
        await this.adminRepo.updateRowData(updateData, id);

        if (chanceLeft == 3)
          return k422ErrorMessage(
            `Please try again after ${
              ADMIN_WRONG_OTP_TIME_MINS - timeDiff + 1
            } minutes`,
          );
        return k422ErrorMessage(
          `Incorrect OTP, Please try again only ${
            ADMIN_LOGIN_CHANCE - chanceLeft
          } chances left`,
        );
      }
      if (this.typeService.otpIsExpired(admin?.updatedAt))
        return k422ErrorMessage(kOTPIsExpired);
      if (
        chanceLeft < ADMIN_LOGIN_CHANCE ||
        timeDiff >= ADMIN_WRONG_OTP_TIME_MINS
      ) {
        const updateData = {
          wrongOtpCount: 0,
          lastOtpAttemptTime: null,
        };
        await this.adminRepo.updateRowData(updateData, id);
        return true;
      } else
        return k422ErrorMessage(
          `Please try again after ${
            ADMIN_WRONG_OTP_TIME_MINS - timeDiff + 1
          } minutes`,
        );
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  //#region send otp to admin
  async sendOTPtoAdmin(id) {
    try {
      const options = { where: { id } };
      const currentDate = new Date();
      const att = [
        'email',
        'fullName',
        'id',
        'phone',
        'companyPhone',
        'lastOtpAttemptTime',
        'wrongOtpCount',
      ];
      const admin = await this.adminRepo.getRoweData(att, options);
      if (!admin || admin === k500Error) return k500Error;
      let timeDiff;
      if (admin.lastOtpAttemptTime) {
        timeDiff = await this.typeService.dateDifference(
          currentDate,
          admin.lastOtpAttemptTime,
          'Minutes',
        );
      }

      if (
        admin.wrongOtpCount >= ADMIN_LOGIN_CHANCE &&
        timeDiff <= ADMIN_WRONG_OTP_TIME_MINS
      )
        return k422ErrorMessage(
          `Please try again after ${
            ADMIN_WRONG_OTP_TIME_MINS - timeDiff + 1
          } minutes`,
        );
      const otp = this.commonService.generateOTP();
      const updateData = { phoneStatusVerified: '0', otp };
      const result = await this.adminRepo.updateRowData(updateData, id);
      if (!result || result === k500Error) return k500Error;
      let phone = admin?.companyPhone ?? admin?.phone;
      if (phone?.length > 11)
        phone = await this.cryptService.decryptText(phone);
      await this.allsmsService.sendOtp(otp, phone, null, true);
      // Send Email OTP
      const email = await this.cryptService.decryptText(admin?.email);
      const data = {
        name: admin?.fullName ?? 'Admin',
        code: otp,
      };
      this.sharedNotificationService.sendEmail(kTAdminEmailOtp, email, data);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  //#region generate Token for admin
  async generateToken(adminId: number) {
    try {
      const token = await this.jwtService.signAsync(
        { adminId },
        { secret: 'secret', expiresIn: 365 * 24 * 60 * 60 },
      );
      return token;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  async getChangeLogs(query) {
    try {
      const page: number = +query?.page;
      let startDate = query?.startDate;
      if (!startDate) return kParamMissing('startDate');
      let endDate = query?.endDate;
      if (!endDate) return kParamMissing('endDate');
      const searchText = query?.searchText;
      const type = query?.type;
      const subType = query?.subType;
      const isdownload = query?.download;

      let changelogOffset, chnagelogLimit;
      startDate = new Date(startDate);
      startDate.setHours(0, 0);
      endDate = new Date(endDate);
      endDate.setHours(23, 59);
      if (page) {
        changelogOffset = page * PAGE_LIMIT - PAGE_LIMIT;
        chnagelogLimit = PAGE_LIMIT;
      }
      const attributes = [
        'loanId',
        'newData',
        'oldData',
        'type',
        'updatedAt',
        'userId',
        'adminId',
        'subType',
        'ip',
        'status',
      ];
      const changelogWhere: any = {
        createdAt: {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        },
      };
      if (query.adminId) changelogWhere.adminId = query.adminId;
      if (type) changelogWhere.type = type;
      if (subType) changelogWhere.subType = subType;
      let searchWhere: any = {};
      let search = (searchText ?? '').toLowerCase();
      if (search) {
        if (search.startsWith('l-'))
          changelogWhere.loanId = search.replace('l-', '');
        else if (!isNaN(search)) {
          search = this.cryptService.encryptPhone(search);
          if (search == k500Error) return kInternalError;
          search = search.split('===')[1];
          searchWhere.phone = { [Op.like]: '%' + search + '%' };
        } else searchWhere.fullName = { [Op.iRegexp]: search };
      }

      const logs: any = await this.changeLogsRepo.findAndCountAll({
        attributes,
        order: [['updatedAt', 'DESC']],
        where: changelogWhere,
        raw: true,
        nest: true,
        offset: isdownload == 'true' ? null : changelogOffset,
        limit: isdownload == 'true' ? null : chnagelogLimit,
      });

      const userIds: any = logs.rows.reduce((acc, row) => {
        if (row.userId) acc.push(row.userId);
        return acc;
      }, []);

      const userData = await this.getUserData(userIds);
      const userObject = userData.reduce((acc, user) => {
        acc[user.id] = {
          fullName: user.fullName,
          phone: this.cryptService.decryptPhone(user.phone),
        };
        return acc;
      }, {});

      let rows = [];
      for (let i = 0; i < logs.rows.length; i++) {
        try {
          const adminId = logs?.rows[i]?.adminId;
          const admindata = await this.commonSharedService.getAdminData(
            adminId,
          );
          if (admindata == k500Error) return kInternalError;

          let oldData = logs?.rows[i]?.oldData ?? '-';
          let newData: any = '';
          try {
            newData = logs?.rows[i]?.newData
              ? JSON.parse(logs?.rows[i]?.newData)
              : '-';
          } catch (error) {
            newData = logs?.rows[i]?.newData;
          }
          const formatDate = (date) =>
            (date.length > 5
              ? this.typeService.getSimpleDateFormat(date)
              : date) ?? '-';

          if (newData !== '-') {
            if (newData.hasOwnProperty('loanId')) delete newData.loanId;
            if (newData.hasOwnProperty('userId')) delete newData.userId;
            if (newData.hasOwnProperty('status')) delete newData.status;
            if (newData.hasOwnProperty('adminId')) delete newData.adminId;
            if (newData.hasOwnProperty('id')) delete newData.id;
            if (newData.hasOwnProperty('password')) newData.password = '******';
            if (newData.hasOwnProperty('otp')) newData.otp = '******';
            if (newData.hasOwnProperty('nextDateForApply'))
              newData.nextDateForApply = formatDate(newData.nextDateForApply);
            if (newData.hasOwnProperty('salaryDate'))
              newData.salaryDate = formatDate(newData.salaryDate);
            if (newData.hasOwnProperty('crHearingDate'))
              newData.crHearingDate = formatDate(newData.crHearingDate);
            if (newData.hasOwnProperty('caseFiledDate'))
              newData.caseFiledDate = formatDate(newData.caseFiledDate);
            if (newData.hasOwnProperty('firstHearingDate'))
              newData.firstHearingDate = formatDate(newData.firstHearingDate);
            if (newData.hasOwnProperty('disposalDate'))
              newData.disposalDate = formatDate(newData.disposalDate);
            if (newData.hasOwnProperty('nextHearingDate'))
              newData.nextHearingDate = formatDate(newData.nextHearingDate);
            if (newData.hasOwnProperty('receivedDate'))
              newData.receivedDate = formatDate(newData.receivedDate);
            if (newData.hasOwnProperty('issueDate'))
              newData.issueDate = formatDate(newData.issueDate);
          }
          const userId = logs?.rows[i]?.userId;

          const prepareData = {
            'Loan ID': logs?.rows[i]?.loanId ?? '-',
            userId: userId ?? '-',
            Name: userObject[`${userId}`]?.fullName ?? '-',
            Phone: userObject[`${userId}`]?.phone ?? '-',
          };
          prepareData['Category'] = logs?.rows[i]?.type ?? '-';
          prepareData['Sub Category'] = logs?.rows[i]?.subType ?? '-';
          prepareData['Old Data'] = oldData ?? '-';
          prepareData['New Data'] = newData ?? '-';
          prepareData['Action'] = logs?.rows[i]?.status ?? '-';
          prepareData['Ip'] = logs?.rows[i]?.ip ?? '-';
          prepareData['Last updated'] =
            this.dateService.readableDate(logs?.rows[i]?.updatedAt) ?? '-';
          prepareData['Last updated by'] = admindata?.fullName ?? '-';
          rows.push(prepareData);
        } catch (error) {}
      }
      if (isdownload == 'true') {
        rows.forEach((row) => {
          if (row['New Data']) {
            let newData = row['New Data'];
            row['New Data'] = JSON.stringify(newData);
          }
        });
        const path = 'LogHistory.xlsx';
        const rawExcelData = {
          sheets: ['LogHistory'],
          data: [rows],
          sheetName: path,
          needFindTuneKey: false,
        };
        const excelResponse: any = await this.fileService.objectToExcel(
          rawExcelData,
        );
        if (excelResponse?.message) return excelResponse;

        const fileURL = await this.fileService.uploadFile(
          excelResponse?.filePath,
          'LogHistory',
          'xlsx',
        );
        if (fileURL.message) return fileURL;
        return { fileURL };
      }
      return { count: logs?.count, rows };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async calculateWaiver(newData, oldData, isdownload = 'false') {
    try {
      let calculatedWaiver = 0;
      let newData1 = newData;
      if (newData === oldData) {
        calculatedWaiver = newData;
        newData1 = 0;
      } else {
        calculatedWaiver = +oldData - +newData;
      }
      return { newData1, calculatedWaiver };
    } catch (error) {}
  }

  //#region unblock companies
  async removeBlacklistCompanies(body) {
    try {
      const companyId = body?.companyId;
      if (!companyId) return kParamMissing('Company ID');
      const options = { where: { id: companyId } };
      const find = await this.blackListCompanyRepo.getRowWhereData(
        ['id'],
        options,
      );
      if (find === k500Error) return kInternalError;
      if (!find) return k422ErrorMessage(kNoSuchCompanyTheList);
      const result = await this.blackListCompanyRepo.deleteSingleData(
        companyId,
        false,
      );
      if (result === k500Error) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async syncCreditAnalystInRedis() {
    try {
      const result =
        await this.creditAnalystService.storeCreditAnalystOnRedis();
      if (!result) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async syncCSEInRedis() {
    try {
      const result = await this.creditAnalystService.storeCSEOnRedis();
      if (!result) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateInActiveUsers() {
    let tDate = this.typeService
      .getGlobalDate(moment().subtract(30, 'days').toDate())
      .toJSON();

    const attribute = ['id', 'roleId', 'isActive', 'lastLoginDate'];
    const options = {
      where: {
        roleId: { [Op.ne]: 1 },
        createdAt: { [Op.lt]: tDate },
        [Op.or]: [
          { lastLoginDate: { [Op.lt]: tDate } },
          { lastLoginDate: null },
        ],
        isActive: { [Op.eq]: '1' },
      },
    };
    const result = await this.adminRepo.getTableWhereData(attribute, options);
    if (result === k500Error) throw new Error();
    for (let i = 0; i < result.length; i++) {
      const updateData = { isActive: '0', isLogin: '0' };
      const id = result[i].id;
      await this.adminRepo.updateRowData(updateData, id);
    }
    return result;
  }

  async syncTempListForInsuranceFAQ() {
    try {
      const result =
        await this.creditAnalystService.storeTempListForInsuranceFAQ();
      if (!result) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async syncTempListTempIdDataOnRedis() {
    try {
      const result =
        await this.creditAnalystService.storeTempListTempIdDataOnRedis();
      if (!result) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // UserForm
  async getRegistrationFormUsers(query) {
    const searchText = query?.searchText ?? '';
    const download = query?.download;
    const page = query?.page ?? 1;
    const startDate = query?.startDate;
    const endDate = query?.endDate;

    const dateRange = await this.typeService.getUTCDateRange(
      startDate ?? new Date().toString(),
      endDate ?? new Date().toString(),
    );
    const attr = [
      'id',
      'fullName',
      'mobileNumber',
      'salaryRange',
      'employmentType',
      'city',
      'webType',
      'createdAt',
    ];

    let searchWhere;
    if (searchText && query?.download != 'true') {
      searchWhere = {
        [Op.or]: [
          { fullName: { [Op.iRegexp]: searchText } },
          { mobileNumber: { [Op.like]: '%' + searchText + '%' } },
        ],
      };
    }
    const userFormOption: any = {
      where: {
        createdAt: {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        },
        ...searchWhere,
      },
      order: [['id', 'DESC']],
    };

    if (query?.download != 'true') {
      userFormOption.offset = page * PAGE_LIMIT - PAGE_LIMIT;
      userFormOption.limit = PAGE_LIMIT;
    }

    const formUserData = await this.repoManager.getTableCountWhereData(
      FormUsers,
      attr,
      userFormOption,
    );
    if (formUserData == k500Error) throw new Error();
    const finalDownload = await this.prepareDataForUsersForm(formUserData);
    // Download Options
    if (download === 'true') {
      const rawExcelData = {
        sheets: 'Web-Registration-User',
        data: finalDownload.rows,
        sheetName: 'Web_Registration_User.xlsx',
        needFindTuneKey: false,
      };

      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;

      const fileURL = await this.fileService.uploadFile(
        excelResponse?.filePath,
        'Web-Registration-User',
        'xlsx',
      );
      if (fileURL.message) return fileURL;
      return { fileURL };
    }
    return finalDownload;
  }

  private async prepareDataForUsersForm(userData) {
    const finalObj = {
      count: userData.count,
      rows: [],
    }; // Check if there are no transactions
    if (userData.count === 0) return finalObj;
    userData.rows.forEach((element) => {
      // Prepare data for duplicate transaction object
      const userFormObject = {
        'Full name': element?.fullName ?? '-',
        'Mobile number': element?.mobileNumber ?? '-',
        'Salary range': element?.salaryRange ?? '-',
        'Employment type': element?.employmentType ?? '-',
        City: element?.city ?? '-',
        'Web type': element?.webType ?? '-',
        'Created date':
          this.dateService.dateToReadableFormat(element?.createdAt)
            .readableStr ?? '-',
      };
      // Add the duplicate transaction object to the final data array
      finalObj.rows.push(userFormObject);
    });
    // return { rows: finalData, count: userData.count };
    return finalObj;
  }

  async getDuplicateTransactionUsers(query) {
    const accountId = query?.accountId ?? '';
    const searchText = query?.searchText ?? '';
    const download = query?.download;
    const page = query?.page ?? 1;
    const startDate = query?.startDate;
    const endDate = query?.endDate;

    const dateRange = await this.typeService.getUTCDateRange(
      startDate ?? new Date().toString(),
      endDate ?? new Date().toString(),
    );
    const blockUserAttributes = ['userId', 'isBlacklist'];
    const userInclude = {
      model: registeredUsers,
      where: {
        isBlacklist: '1',
      },
    };

    const blockUserOptions: any = {
      where: {
        reasonId: 68,
        isBlacklist: '1',
        createdAt: {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        },
      },
      include: [userInclude],
    };

    if (query?.download != 'true') {
      blockUserOptions.offset = page * PAGE_LIMIT - PAGE_LIMIT;
      blockUserOptions.limit = PAGE_LIMIT;
    }

    const blockUserData = await this.repoManager.getTableWhereData(
      BlockUserHistoryEntity,
      blockUserAttributes,
      blockUserOptions,
    );
    if (blockUserData == k500Error) throw new Error();
    const userIds = [...new Set(blockUserData.map(({ userId }) => userId))];
    const transactionAttributes = [
      'loanId',
      'userId',
      'name',
      'bank',
      'bankStatement',
      'accountNumber',
      'matchedTransactionsDetail',
    ];
    const transactionOptions: any = {
      where: {
        userId: userIds,
        isFraud: true,
      },
    };
    if (accountId) transactionOptions.where.accountNumber = accountId;
    if (searchText) {
      if (searchText.startsWith('l-')) {
        transactionOptions.where.loanId = searchText.replace('l-', '');
      } else transactionOptions.where.name = { [Op.iRegexp]: searchText };
    }
    const transactionData = await this.bankRepo.getTableWhereDataWithCounts(
      transactionAttributes,
      transactionOptions,
    );
    if (!transactionData || transactionData == k500Error) throw new Error();

    // Download Options
    if (download === 'true') {
      const rawExcelData = {
        sheets: 'Duplicate-transactions-users',
        data: [],
        sheetName: 'Duplicate_transactions_users.xlsx',
        needFindTuneKey: false,
      };

      transactionData.rows.forEach((row) => {
        // Prepare rowData for the current row as an object
        const rowData = {
          'Loan ID': row.loanId,
          userId: row.userId,
          'User name': row.name,
          Bank: row.bank,
          View: row.bankStatement,
        };

        Object.keys(row.matchedTransactionsDetail).forEach(
          (matchKey, index) => {
            const matchDetail = row.matchedTransactionsDetail[matchKey];
            rowData[`Match With ID${index + 1}`] = matchKey;
            rowData[`Match With Name${index + 1}`] = matchDetail.name;
            rowData[`Match With AcNo${index + 1}`] = matchDetail.accountNumber;
          },
        );

        // Push rowData object to rawExcelData data
        rawExcelData.data.push(rowData);
      });

      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse?.message) return excelResponse;

      const fileURL = await this.fileService.uploadFile(
        excelResponse?.filePath,
        'Duplicate-transactions-users',
        'xlsx',
      );
      if (fileURL.message) return fileURL;
      return { fileURL };
    }
    return await this.prepareDataForDuplicateTransactionUsers(transactionData);
  }

  //#region  get duplicate account tractions
  async funDuplicateAccountTransaction(query) {
    const accountId = query?.accountId;
    if (!accountId) return kParamMissing('accountId');
    //get account data with match account trasactions
    const responseData = await this.authAiService.getFraudUsers(accountId);
    if (responseData === k500Error) throw new Error();

    return await this.prepareDataForDuplicateAccountTransactions(
      query,
      responseData,
      accountId,
    );
  }
  //#endregion

  private async prepareDataForDuplicateAccountTransactions(
    reqData,
    responseData,
    accountNumber,
  ) {
    const page = +(reqData?.page ?? 1);
    const attributes = [
      'bank',
      'accountNumber',
      'ifsCode',
      'matchedTransactionsDetail',
    ];
    const options: any = {
      where: {
        accountNumber,
      },
    };
    const bankingData = await this.repoManager.getRowWhereData(
      BankingEntity,
      attributes,
      options,
    );
    if (!bankingData || bankingData === k500Error) throw new Error();

    const matchedAccountNumbers = bankingData?.matchedTransactionsDetail;
    const fraudUsersObject = Object.values(matchedAccountNumbers).map(
      (user) => {
        const { name, accountNumber } = user as {
          name: string;
          accountNumber: string;
        };
        return { name, accountNumber };
      },
    );
    const offset = reqData?.download !== 'true' ? (page - 1) * PAGE_LIMIT : 0;
    const limit =
      reqData?.download !== 'true' ? PAGE_LIMIT : responseData.length;

    const paginatedNarrations = responseData
      .slice(offset, offset + limit)
      .map((el) => ({
        narration: el.id,
        fraudUsersObject,
      }));

    const finalObject = {
      'Bank Name': bankingData?.bank ?? '-',
      'Account Number': bankingData?.accountNumber ?? '-',
      IFSC: bankingData?.ifsCode ?? '-',
      'Matched users': Object.keys(matchedAccountNumbers).length,
      narrations: {
        count: paginatedNarrations.length,
        rows: paginatedNarrations,
      },
    };
    return finalObject;
  }

  private async prepareDataForDuplicateTransactionUsers(transactionData) {
    const finalData = [];
    // Check if there are no transactions
    if (transactionData.count === 0) return finalData;

    transactionData.rows.forEach((element) => {
      // Prepare data for duplicate transaction object
      const duplicateTransactionObject = {
        'Loan ID': element?.loanId,
        userId: element?.userId,
        'User name': element?.name,
        Bank: element?.bank,
        View: element?.bankStatement,
        'Match With': element?.matchedTransactionsDetail,
        Status: BLOCK_USER_STATUS_FORMATE[BLOCK_USER.BLOCK],
      };
      // Add the duplicate transaction object to the final data array
      finalData.push(duplicateTransactionObject);
    });
    return { rows: finalData, count: transactionData.count };
  }

  async getTransactionMatchedUser(reqData) {
    // Parameter Checking
    const { userId } = reqData;
    if (!userId) return kParamMissing('userId');
    // Fetch transaction data
    const transactionAttributes = [
      'bankStatement',
      'matchedTransactionsDetail',
    ];
    const transactionOptions = {
      where: {
        userId,
        isFraud: true,
      },
    };
    const transactionData = await this.bankRepo.getRowWhereData(
      transactionAttributes,
      transactionOptions,
    );
    if (transactionData === k500Error) throw new Error();

    const matchedUsers = [];
    const matchedAccountNumbers = transactionData?.matchedTransactionsDetail;

    // Get all userIds from matchedAccountNumbers
    const userIds = matchedAccountNumbers
      ? Object.keys(matchedAccountNumbers).filter((id) => id !== userId)
      : [];

    const bankUrl = await this.bankRepo.getTableWhereData(
      ['bankStatement', 'userId'],
      { where: { userId: userIds }, order: [['id', 'DESC']] },
    );
    if (bankUrl === k500Error) throw new Error();

    // Fetch blacklist data for all userIds
    const blackListData = await this.repoManager.getTableWhereData(
      registeredUsers,
      ['id', 'isBlacklist'],
      {
        where: {
          id: userIds,
        },
      },
    );
    if (blackListData === k500Error) throw new Error();

    // Map over userIds and process the data
    if (userIds.length > 0) {
      for (const userId of userIds) {
        const user = matchedAccountNumbers[userId];
        const userData = blackListData.find((data) => data?.id === userId);
        const bankData = bankUrl.find((data) => data?.userId === userId);

        // Determine user status based on blacklist data
        const status =
          userData?.isBlacklist == '1' ? BLOCK_USER.BLOCK : BLOCK_USER.ACTIVE;

        matchedUsers.push({
          userId,
          Name: user.name,
          View: bankData.bankStatement,
          Status: BLOCK_USER_STATUS_FORMATE[status],
        });
      }
    }

    return {
      matchedUsers,
      userBankStatement: transactionData?.bankStatement,
    };
  }

  async getUserData(userId) {
    try {
      const userData = await this.userRepo.getTableWhereData(
        ['fullName', 'id', 'phone'],
        { where: { id: userId } },
      );
      if (userData === k500Error) return kInternalError;
      return userData;
    } catch (error) {
      return kInternalError;
    }
  }
}
