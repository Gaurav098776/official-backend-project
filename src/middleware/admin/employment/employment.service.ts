// Imports
import { Op, Sequelize } from 'sequelize';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  employementMessageFun,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  CompanyVerifiedSuccess,
  kNoDataFound,
  SalarySlipVerificationSucess,
  SCopanyNotVerfy,
  SCopanyVerfication,
  SSalarySlipNotVerify,
  SSalarySlipVerification,
  SWorkEmailNotVerify,
  SWorkEmailVerification,
  vCompany,
  vSalarySlip,
  vWorkMail,
  WorkMailVerificationSucess,
} from 'src/constants/strings';
import { EmiEntity } from 'src/entities/emi.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { ManualVerifiedCompanyRepo } from 'src/repositories/manual.verified.company.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CryptService } from 'src/utils/crypt.service';
import { DateService } from 'src/utils/date.service';
import { TypeService } from 'src/utils/type.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentSector } from 'src/entities/sector.entity';
import { employmentType } from 'src/entities/employment.type';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { StringService } from 'src/utils/string.service';
import { PredictionService } from '../eligibility/prediction.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { RedisService } from 'src/redis/redis.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { loanTransaction } from 'src/entities/loan.entity';

@Injectable()
export class EmploymentService {
  constructor(
    private readonly repository: EmploymentRepository,
    private readonly userRepository: UserRepository,
    private readonly salarySlipRepository: SalarySlipRepository,
    private readonly workMailRepository: WorkMailRepository,
    private readonly manualVerifyCompanyRepo: ManualVerifiedCompanyRepo,
    private readonly masterRepository: MasterRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    @Inject(forwardRef(() => UserServiceV4))
    private readonly userService: UserServiceV4,
    private readonly sharedNotification: SharedNotificationService,
    private readonly loanRepo: LoanRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly dateService: DateService,
    private readonly StringService: StringService,
    private readonly empHistoryRepo: EmploymentHistoryRepository,
    private readonly predictionService: PredictionService,
    private readonly eligiblityService: EligibilityService,
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly CompanyRepo: CompanyRepository,
    // Database
    private readonly repo: RepositoryManager,
  ) {}

  //#region get verification data fun
  async getVerificationData(query) {
    try {
      const options = this.prepareVerficationDataOptions(query);
      if (options?.message) return options;
      const comapanyData = await this.findCompanyData(options);
      if (comapanyData?.message) return comapanyData;
      const finalData = this.prepareCompanyData(comapanyData?.rows);
      return { count: comapanyData.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare verficationData options
  private prepareVerficationDataOptions(query) {
    try {
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const sizePage = query?.sizePage ?? PAGE_LIMIT;
      const searchText = query?.searchText;
      const startDate = query?.startDate ?? null;
      const endDate = query?.endDate ?? null;
      const download = query?.download ?? 'false';
      const toDay = this.typeService.getGlobalDate(new Date());

      /// user
      const registeredModel: any = {
        model: registeredUsers,
        attributes: ['fullName', 'city', 'completedLoans'],
        where: { isBlacklist: { [Op.ne]: '1' }, homeStatus: { [Op.ne]: '-1' } },
      };
      //For searching using User Names
      if (searchText)
        registeredModel.where.fullName = { [Op.iRegexp]: searchText };

      if (status === '0') {
        registeredModel.where['NextDateForApply'] = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
      }
      /// salary slip and work mail
      const empWhere = { status: { [Op.ne]: '-1' } };
      const include = [
        registeredModel,
        { model: SalarySlipEntity, attributes: [], where: empWhere },
        { model: WorkMailEntity, attributes: [], where: empWhere },
      ];

      //// where condition
      const notNull = { [Op.ne]: null };
      const where: any = { salarySlipId: notNull, workMailId: notNull };
      if (status === '0') where.bankingId = notNull;
      if (status !== '4')
        if (status === '1') where.companyVerification = { [Op.or]: ['1', '3'] };
        else where.companyVerification = status;
      if (startDate && endDate && status !== '0') {
        const range = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      }
      //// add options
      const options: any = { include, where, distinct: true };
      if (status != '0' && download != 'true') {
        options.offset = (+page ?? 1) * sizePage - sizePage;
        options.limit = sizePage;
      }
      options.order = [['updatedAt', 'DESC']];
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region find company Data
  private async findCompanyData(options: any) {
    try {
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
      const result = await this.repository.getTableWhereDataWithCounts(
        attr,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region pre pare company row data
  private prepareCompanyData(list) {
    const finalData = [];
    try {
      list.forEach((element) => {
        try {
          const tempData: any = {};
          const url = (element?.companyUrl ?? '-').trim();
          const contact = (element?.companyPhone ?? '-').trim();
          const address = (element?.companyAddress ?? '-').trim();
          tempData['Name'] = element?.user?.fullName;
          tempData['Company name'] = element?.companyName ?? '-';
          tempData['Company URL'] = url ? url : '-';
          tempData['Company contact'] = contact ? contact : '-';
          tempData['Company address'] = address ? address : '-';
          tempData['Completed loans'] = element?.user?.completedLoans ?? 0;
          tempData['City'] = element?.user?.city;
          tempData['Last action by'] =
            element?.companyStatusApproveByName ?? 'SYSTEM';
          tempData['userId'] = element?.userId ?? '-';
          tempData['Status'] = element?.companyVerification;
          tempData['Reject reason'] = element?.rejectReason;
          tempData['employeeId'] = element?.id ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
    } catch (error) {}
    return finalData;
  }

  async getEmployementData(userId) {
    try {
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['status', 'email', 'tempStatus', 'tempEmail', 'masterId'],
      };
      const empInclude = {
        model: employmentDetails,
        attributes: [
          'id',
          'salarySlipId',
          'companyName',
          'companyPhone',
          'companyUrl',
          'userId',
          'masterId',
        ],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: [
          'id',
          'userId',
          'loanId',
          'status',
          'dates',
          'workMailAdminId',
          'salarySlipAdminId',
          'companyAdminId',
          'empId',
          'salarySlipId',
          'workMailId',
          'rejection',
        ],
        include: [workMailInclude, empInclude],
      };
      const att = ['id', 'email', 'fullName', 'fcmToken', 'phone', 'masterId'];
      const options = { where: { id: userId }, include: [masterInclude] };
      const userData = await this.userRepository.getRowWhereData(att, options);
      if (userData == k500Error || !userData) return kInternalError;
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async changeEmployementData(body) {
    try {
      if (!body?.userId || !body?.adminId || !body?.status || !body?.type)
        return kParamsMissing;
      if (body.status == '2') if (!body.rejectReason) return kParamsMissing;
      if (body.status == '3' && !body?.remark) return kParamsMissing;
      const userId = body.userId;
      const adminId = body.adminId;
      const status = body.status;
      const rejectionReason = body?.rejectReason;
      const type = body?.type;
      const remark = body?.remark;
      const salaryDate = body?.salaryDate;
      const loanId = body?.loanId;
      if (type == 'LOAN' && !loanId) return kParamMissing('loanId');
      const userData = await this.getEmployementData(userId);
      if (!userData?.masterData)
        return k422ErrorMessage('Employement data not found!');
      const updateEmpData: any = await this.changeEmployementStatus(
        type,
        status,
        adminId,
        userData,
        remark,
        rejectionReason,
        salaryDate,
        loanId,
      );
      return updateEmpData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  preapareUpdateData(
    type,
    status,
    userId,
    adminId,
    remark,
    rejectionReason,
    masterData,
    salaryDate,
  ) {
    try {
      const updateData: any = {
        status: status,
        approveById: adminId,
        remark: remark,
        rejectReason: rejectionReason ?? '',
      };
      const rejection = masterData.rejection ?? {};
      const masterUpdate: any = {};
      if (type == 'SALARYSLIP') {
        masterUpdate.salarySlipAdminId = adminId;
        masterUpdate.rejection = {
          ...rejection,
          salarySlip: rejectionReason ?? '',
        };

        updateData.salaryVerifiedDate = new Date().toJSON();
        if (salaryDate)
          updateData.salarySlipDate = new Date(salaryDate).toJSON();
      } else if (type == 'WORKMAIL') {
        updateData.verifiedDate = new Date().toJSON();
        updateData.userId = userId;
        masterUpdate.rejection = {
          ...rejection,
          workMail: rejectionReason ?? '',
        };
        masterUpdate.workMailAdminId = adminId;
      } else if (type == 'COMPANY') {
        delete updateData.approveById;
        delete updateData.status;
        updateData.companyVerification = status;
        updateData.companyStatusApproveById = adminId;
        updateData.verifiedDate = new Date().toJSON();
        masterUpdate.rejection = {
          ...rejection,
          company: rejectionReason ?? '',
        };
        masterUpdate.companyAdminId = adminId;
      }
      return { updateData, masterUpdate };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  preapareLogData(type, userId, status, adminId, remark, rejectionReason) {
    try {
      const logObj: any = {
        userId: userId,
        status,
        remark,
        reason: rejectionReason ?? '',
        adminId,
      };

      if (type == 'SALARYSLIP') logObj.type = vSalarySlip;
      else if (type == 'WORKMAIL') logObj.type = vWorkMail;
      else if (type == 'COMPANY') logObj.type = vCompany;
      return logObj;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async changeEmployementStatus(
    type,
    status,
    adminId,
    userData,
    remark,
    rejectionReason,
    salaryDate,
    loanId,
  ) {
    try {
      const userId = userData.id;
      const masterData = userData?.masterData;
      const statusData = masterData.status;
      if (!masterData) return kInternalError;
      const data: any = await this.preapareUpdateData(
        type,
        status,
        userId,
        adminId,
        remark,
        rejectionReason,
        masterData,
        salaryDate,
      );
      if (data.message) return data;
      let updateData = data.updateData;
      masterData.masterUpdate = data.masterUpdate;
      const logData: any = this.preapareLogData(
        type,
        userId,
        status,
        adminId,
        remark,
        rejectionReason,
      );
      if (logData.message) return logData;
      let finalResult: any;
      let successMessage = '';
      const checkStages = ['SALARYSLIP', 'WORKMAIL'];
      if (
        checkStages.includes(type) &&
        statusData.company != '1' &&
        statusData.company != '3'
      )
        return k422ErrorMessage('Company should be verified first!');
      if (type == 'SALARYSLIP') {
        finalResult = await this.updateSalarySlipData(
          updateData,
          status,
          masterData,
        );
        successMessage = employementMessageFun('Salary slip', status);
      } else if (type == 'WORKMAIL') {
        finalResult = await this.updateWorkMailStatus(
          status,
          updateData,
          masterData,
        );
        successMessage = employementMessageFun('Work mail', status);
      } else if (type == 'COMPANY') {
        finalResult = await this.updateCompanyStatus(
          userData,
          updateData,
          type,
        );
        successMessage = employementMessageFun('Company', status);
      } else if (type == 'LOAN') {
        finalResult = await this.eligiblityService.rejectLoanFromAdmin({
          userId,
          loanId,
          adminId,
          remark: remark ?? rejectionReason,
        });
        successMessage = employementMessageFun('Loan', status);
      }
      await this.userService.routeDetails({ id: userId });
      if (finalResult?.message) return finalResult;

      if (rejectionReason && status == '2') {
        const reason = await this.commonSharedService.getRejectReasonTemplate(
          rejectionReason,
        );

        if (reason?.message) {
          // return rejectionReason;
        } else rejectionReason = reason;
      }
      const att = ['id'];
      const options = { where: { userId } };
      const loanData = await this.loanRepo.getRowWhereData(att, options);
      await this.predictionService.assignToAdmin(loanData.id);

      await this.sendNotificationToUser(
        status,
        userData,
        rejectionReason,
        type,
        adminId,
      );

      return successMessage;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async updateSalarySlipData(updateData, status, masterData) {
    try {
      let newData;
      const statusData = masterData.status;
      const masterUpdate = masterData.masterUpdate;
      let finalData;
      if (statusData.salarySlip == status)
        return k422ErrorMessage('Salary already updated');
      if (statusData.salarySlip == '2') {
        if (statusData.salarySlip == 1 || statusData.salarySlip == 3)
          return k422ErrorMessage('Salary already verified');
        newData = await this.salarySlipRepository.createRowDataWithCopy(
          updateData,
          masterData.salarySlipId,
        );
        if (newData == k500Error) return kInternalError;
        finalData = await this.repository.updateRowData(
          { salarySlipId: newData.id },
          masterData.empId,
        );
        masterUpdate.salarySlipId = newData.id;
      } else {
        finalData = await this.salarySlipRepository.updateRowData(
          updateData,
          masterData.salarySlipId,
        );
      }
      if (finalData == k500Error || finalData[0] <= 0) return kInternalError;
      masterData.masterUpdate = masterUpdate;
      await this.approvedEmployementDate(masterData, status, 'SALARYSLIP');
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async approvedEmployementDate(
    masterData,
    status,
    type,
    adminId = SYSTEM_ADMIN_ID,
  ) {
    try {
      const loanId = masterData?.loanId;
      const userId = masterData?.userId;
      const dates = masterData?.dates ?? {};
      const statusData: any = masterData.status;
      const approvedStatus = [1, 3, 4];
      if (
        type == 'SALARYSLIP' &&
        status == '3' &&
        approvedStatus.includes(statusData.company) &&
        approvedStatus.includes(statusData.workMail)
      ) {
        dates.employment = new Date().getTime();
      } else if (
        type == 'WORKMAIL' &&
        status == '3' &&
        approvedStatus.includes(statusData.company) &&
        approvedStatus.includes(statusData.salarySlip)
      )
        dates.employment = new Date().getTime();
      else if (
        type == 'COMPANY' &&
        status == '3' &&
        approvedStatus.includes(statusData.workMail) &&
        approvedStatus.includes(statusData.salarySlip)
      )
        dates.employment = new Date().getTime();
      let allStatus = [1, 2, 3, 4];
      if (allStatus.includes(+status)) {
        if (status == '2') dates.employment = new Date().getTime();
        if (type == 'SALARYSLIP') statusData.salarySlip = +status;
        else if (type == 'WORKMAIL') {
          if (status != '2') {
            const workMailData = masterData?.workMailData;
            const empData = masterData?.empData;
            await this.commonSharedService.checkManualWorkMail(
              workMailData,
              empData,
              { status },
              adminId,
            );
          }
          statusData.workMail = +status;
        } else if (type == 'COMPANY') statusData.company = +status;
      }
      await this.masterRepository.updateRowData(
        { dates, status: statusData, ...masterData.masterUpdate },
        masterData.id,
      );
      if (
        status == '3' &&
        userId &&
        loanId &&
        (statusData.bank == 1 || statusData.bank == 3)
      ) {
        const finalApproval = await this.sharedEligibility.finalApproval({
          loanId,
          userId,
        });
        if (finalApproval.message) return finalApproval;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async updateWorkMailStatus(status, rawData, masterData) {
    try {
      let isNewEntry = true;
      let statusData = masterData?.status;
      let workMailData = masterData?.workMailData;
      let masterUpdate = masterData.masterUpdate;
      let approveById = rawData.approveById;
      let workMailAdminId = masterData.workMailAdminId;
      const workMail = statusData.workMail;
      const empId = masterData?.empId;
      if (workMail == 0 && !masterData.workMailId && empId) {
        const empOpt = { where: { id: empId } };
        const empData = await this.repository.getRowWhereData(
          ['workMailId'],
          empOpt,
        );
        const masterId = masterData?.id;
        if (empData != k500Error && empData?.workMailId && masterId) {
          const wmUpdate = await this.masterRepository.updateRowData(
            { workMailId: empData?.workMailId },
            masterId,
          );
          if (wmUpdate != k500Error)
            masterData.workMailId = empData?.workMailId;
        }
      }
      if (workMail == status)
        return k422ErrorMessage('Workmail already updated!');
      if (workMail == 0 && workMailAdminId == SYSTEM_ADMIN_ID)
        isNewEntry = false;
      if (workMail == status && workMailAdminId == approveById)
        isNewEntry = false;
      let updateData: any;
      if (status == '2') {
        if (workMail == 1 || workMail == 3)
          return k422ErrorMessage('Work mail already verified');
        updateData = await this.workMailRepository.updateRowData(
          rawData,
          masterData.workMailId,
        );
      } else if (isNewEntry) {
        if (workMailData.tempStatus == '0' && workMailData?.tempEmail)
          rawData.email = workMailData.tempEmail;
        const createData = await this.workMailRepository.createRowData(rawData);
        if (!createData || createData === k500Error) return kInternalError;
        updateData = await this.repository.updateRowData(
          { workMailId: createData.id },
          masterData.empId,
        );
        masterUpdate.workMailId = createData.id;
      } else {
        updateData = await this.workMailRepository.updateRowData(
          rawData,
          masterData.workMailId,
        );
      }
      if (updateData == k500Error || updateData[0] <= 0) return kInternalError;
      masterData.masterUpdate = masterUpdate;
      await this.approvedEmployementDate(
        masterData,
        status,
        'WORKMAIL',
        approveById,
      );
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async updateCompanyStatus(userData, updateData, notifyUser = true) {
    try {
      const status = updateData.companyVerification;
      const masterData = userData.masterData;
      const empData = masterData.empData;
      const statusData = masterData.status;
      if (statusData.company == status)
        return k422ErrorMessage('Company already updated!');
      if (status == '2') {
        if (statusData.company == 1 || statusData.company == 3)
          return k422ErrorMessage('Company already verified!');
        const rejectData: any = {};
        rejectData.status = status;
        rejectData.verifiedDate = updateData.verifiedDate;
        rejectData.rejectReason = updateData.rejectReason;
        rejectData.approveById = updateData.companyStatusApproveById;
        //salary slip payload
        let rejectMasterData = { ...masterData };
        const masterRejection = masterData.rejection;
        rejectMasterData.masterUpdate = {
          rejection: {
            ...masterRejection,
            salarySlip: updateData.rejectReason,
          },
          workMailAdminId: rejectData.approveById,
        };
        await this.updateWorkMailStatus(status, rejectData, rejectMasterData);
        rejectMasterData.masterUpdate = {
          rejection: {
            ...masterRejection,
            workMail: updateData.rejectReason,
          },
          salarySlipAdminId: rejectData.approveById,
        };
        rejectData.salaryVerifiedDate = rejectData.verifiedDate;
        delete rejectData.verifiedDate;
        await this.updateSalarySlipData(rejectData, status, rejectMasterData);
      }
      const updateManualVerifiedCompany: any =
        await this.updateManualVerifiedCompany(status, empData);
      if (updateManualVerifiedCompany.message)
        return updateManualVerifiedCompany;
      const updateRes = await this.repository.updateRowData(
        updateData,
        masterData.empId,
      );
      if (updateRes == k500Error) return kInternalError;
      await this.approvedEmployementDate(masterData, status, 'COMPANY');
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async sendNotificationToUser(
    status,
    userData,
    rejectionReasonData,
    type,
    adminId,
  ) {
    try {
      let title;
      let body;
      userData.phone = await this.cryptService.decryptPhone(userData.phone);
      if (type == 'SALARYSLIP') {
        if (status == 3) {
          title = SSalarySlipVerification;
          body = SalarySlipVerificationSucess;
        } else if (status == 2) {
          title = SSalarySlipNotVerify;
          body = rejectionReasonData?.content;
        }
      } else if (type == 'WORKMAIL') {
        if (status == 3) {
          title = SWorkEmailVerification;
          body = WorkMailVerificationSucess;
        } else if (status == 2) {
          title = SWorkEmailNotVerify;
          body = rejectionReasonData.content;
        }
      } else if (type == 'COMPANY') {
        if (status == 3) {
          title = SCopanyVerfication;
          body = CompanyVerifiedSuccess;
        } else if (status == 2) {
          title = SCopanyNotVerfy;
          body = rejectionReasonData.content;
        }
      }

      // Push notification
      this.sharedNotification.sendNotificationToUser({
        userList: [userData.id],
        title,
        content: body,
        adminId,
      });

      //  SMS alert
      const fullName = userData.fullName;
      const smsOptions: any = { fullName, name: fullName };
      if (status == '2') smsOptions.reason = rejectionReasonData.content;

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateManualVerifiedCompany(status, employeeData) {
    try {
      if (status == '2') return true;
      let updatedUrl = employeeData.companyUrl;
      if (!updatedUrl || updatedUrl.length === 0) updatedUrl = '_URL';
      const rowsUpdated = await this.manualVerifyCompanyRepo.updateRowWhereData(
        { isActive: true },
        {
          where: {
            companyName: { [Op.iRegexp]: employeeData.companyName },
            url: updatedUrl,
          },
        },
      );
      if (rowsUpdated[0] === 0) {
        this.manualVerifyCompanyRepo.create({
          companyName: employeeData.companyName,
          url: updatedUrl,
          isActive: true,
        });
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getCompanyActivity(query) {
    const userId = query.userId;
    if (!userId) return kParamMissing('userId');
    const empInclude = {
      model: employmentDetails,
      attributes: ['companyName'],
    };
    const options = { include: [empInclude], where: { id: userId } };
    const userData = await this.userRepository.getRowWhereData(['id'], options);
    if (userData == k500Error) return k500Error;
    if (!userData) return k422ErrorMessage(kNoDataFound);
    const companyName = (userData?.employmentData?.companyName ?? '')
      .trim()
      .toUpperCase();
    if (!companyName) return {};
    const getCompanyId = await this.CompanyRepo.getRowWhereData(['id'], {
      where: { companyName: companyName },
      order: [['createdAt', 'DESC']],
      limit: 1,
    });
    if (getCompanyId === k500Error) throw new Error();
    else if (!getCompanyId) return {};
    const cId = getCompanyId.id;

    const rawQuery = `SELECT SUM("loanGmv") AS "totalCompanyGmv" 
    FROM "loanTransactions"
    WHERE "loanStatus" IN ('Active', 'Complete')
    AND "companyId" = '${cId}'`;
    const outputList = await this.repo.injectRawQuery(
      loanTransaction,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();
    const totalCompanyGmvAmt = outputList[0].totalCompanyGmv ?? 0;

    const userInclude = {
      model: registeredUsers,
      attributes: ['id', 'fullName'],
    };
    const emiInclude = {
      model: EmiEntity,
      attributes: [
        'id',
        'penalty_days',
        'payment_status',
        'payment_due_status',
      ],
    };
    const loanOptions = {
      where: {
        loanStatus: { [Op.or]: ['Complete', 'Active'] },
        companyId: cId,
      },
      include: [emiInclude, userInclude],
      distinct: true,
    };
    const attributes = [
      'id',
      'netApprovedAmount',
      'interestRate',
      'loanStatus',
    ];
    const loanData = await this.loanRepo.getCountWhereData(
      attributes,
      loanOptions,
    );
    if (loanData === k500Error) return kInternalError;

    const prepareData: any = await this.prepareCompanyActivityData(
      loanData.rows,
    );
    prepareData.companyName = companyName;
    prepareData.count = loanData.count;
    prepareData.totalCompanyGmvAmt = totalCompanyGmvAmt;
    return prepareData;
  }

  //prepare company activity data
  async prepareCompanyActivityData(data) {
    try {
      const tempArr = [];
      let defaulterCount = 0;
      let defaulterAmount: any = 0;
      let delayCount = 0;
      let delayAmount: any = 0;
      let onTimeCount = 0;
      let onTimeAmount: any = 0;
      let inProgressCount = 0;
      let inProgressAmount: any = 0;
      let totalInterestRate = 0;
      let totalDisburse = 0;
      let totalDisburseAmount: any = 0;
      let defaulterPercentage: any = 0;
      let delayPercentage: any = 0;
      let inProgressPercentage: any = 0;
      let onTimePercentage: any = 0;
      let avgInterest: any = 0;

      if (data.length) {
        for (let index = 0; index < data.length; index++) {
          try {
            const element = data[index];
            // console.log({ element });
            const emiData = element?.emiData;
            const netApprovedAmount = element?.netApprovedAmount ?? 0;
            let status;
            const defaulter = [];
            const ontime = [];
            const delay = [];
            const inProgress = [];
            let delayDays = 0;
            emiData.forEach((el) => {
              try {
                const payment_due_status = el?.payment_due_status;
                const payment_status = el?.payment_status;

                if (payment_due_status == '1' && el?.penalty_days > delayDays)
                  delayDays = el?.penalty_days;

                if (payment_due_status === '1' && payment_status === '0')
                  defaulter.push(el);
                else if (payment_due_status === '1' && payment_status === '1')
                  delay.push(el);
                else if (payment_due_status === '0' && payment_status === '1')
                  ontime.push(el);
                else if (payment_due_status === '0' && payment_status === '0')
                  inProgress.push(el);
              } catch (error) {}
            });

            if (defaulter.length > 0) {
              defaulterCount++;
              defaulterAmount += +netApprovedAmount;
              status = 'defaulter';
            } else if (delay.length > 0) {
              delayCount++;
              delayAmount += +netApprovedAmount;
              status = 'delay';
            } else if (inProgress.length > 0) {
              inProgressCount++;
              inProgressAmount += +netApprovedAmount;
              status = 'In-progress';
            } else if (ontime.length > 0) {
              onTimeCount++;
              onTimeAmount += +netApprovedAmount;
              status = 'OnTime';
            }

            const ObjData = {};
            if (
              element.loanStatus === 'Active' ||
              element.loanStatus === 'Complete'
            ) {
              totalDisburse += 1;
              totalDisburseAmount += +element.netApprovedAmount;
            }

            const approvedAmount: any = +element?.netApprovedAmount ?? 0;
            totalInterestRate += +parseFloat(element.interestRate)?.toFixed(3);

            ObjData['id'] = element.registeredUsers?.id ?? '-';
            ObjData['Loan Id'] = element.id ?? '-';
            ObjData['Name'] = element.registeredUsers?.fullName ?? '-';
            ObjData['Approved amount'] =
              this.StringService.readableAmount(approvedAmount);
            ObjData['Interest'] =
              parseFloat(element.interestRate)?.toFixed(3) + '%' ?? '-';
            ObjData['Delay days'] = delayDays ?? 0;
            ObjData['Status'] = status ?? null;

            tempArr.push(ObjData);
          } catch (error) {}
        }

        // Calculate percentage
        defaulterPercentage = Math.round(
          (defaulterAmount / totalDisburseAmount) * 100,
        );
        delayPercentage = Math.round((delayAmount / totalDisburseAmount) * 100);
        inProgressPercentage = Math.round(
          (inProgressAmount / totalDisburseAmount) * 100,
        );
        onTimePercentage = Math.round(
          (onTimeAmount / totalDisburseAmount) * 100,
        );
        avgInterest = (totalInterestRate / data.length).toFixed(3);

        // Format amount with commas and rupees sign
        defaulterAmount = this.StringService.readableAmount(defaulterAmount);
        delayAmount = this.StringService.readableAmount(delayAmount);
        onTimeAmount = this.StringService.readableAmount(onTimeAmount);
        inProgressAmount = this.StringService.readableAmount(inProgressAmount);
        totalDisburseAmount =
          this.StringService.readableAmount(totalDisburseAmount);
      }
      return {
        rows: tempArr,
        defaulterCount: defaulterCount.toString(),
        defaulterAmount: defaulterAmount.toString(),
        defaulterPercentage: defaulterPercentage.toString(),
        delayCount: delayCount.toString(),
        delayAmount: delayAmount.toString(),
        delayPercentage: delayPercentage.toString(),
        onTimeCount: onTimeCount.toString(),
        onTimeAmount: onTimeAmount.toString(),
        onTimePercentage: onTimePercentage.toString(),
        inProgressCount: inProgressCount.toString(),
        inProgressAmount: inProgressAmount.toString(),
        inProgressPercentage: inProgressPercentage.toString(),
        avgInterest: avgInterest.toString(),
        totalDisburse: totalDisburse.toString(),
        totalDisburseAmount: totalDisburseAmount.toString(),
      };
    } catch (error) {
      console.log({ error });
    }
  }

  // filter active emi data
  findActiveEmi(emiData) {
    try {
      const temp = [...emiData];
      temp.sort((a, b) => a.id - b.id);
      for (let index = 0; index < temp.length; index++) {
        try {
          const element = temp[index];
          if (element.payment_status !== '1' || temp.length - 1 == index)
            return element;
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getEmploymentDetails(query) {
    try {
      const userId = query.userId;
      if (!userId) return kParamsMissing;
      const attributes = [
        'companyName',
        'companyPhone',
        'companyUrl',
        'companyAddress',
        'sectorId',
        'designationId',
        'salary',
        'salaryDate',
        'id',
        'startDate',
        'otherInfo',
        'updatedCompanyName',
        'companyNameChangeBy',
      ];
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['email', 'status', 'id', 'verifiedDate', 'approveById'],
      };
      const salarySlipInclude = {
        model: SalarySlipEntity,
        attributes: [
          'id',
          'url',
          'netPayAmount',
          'salaryVerifiedDate',
          'salarySlipDate',
          'status',
          'response',
          'approveById',
          'createdAt',
        ],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'status'],
      };
      const include = [workMailInclude, salarySlipInclude, masterInclude];
      const options = {
        include,
        where: { userId },
      };
      // temporary redis code commented due to PROD issue
      // const key = `${userId}_USER_EMPLOYMENT_DETAILS`;
      // let data = await this.redisService.getKeyDetails(key);
      // if (!data) {
      const data = await this.repository.getRowWhereData(attributes, options);
      if (!data) return {};
      if (data == k500Error) return kInternalError;
      // } else data = JSON.parse(data);

      const approvedStatus = ['1', '3', '4'];
      // if (
      //   data?.updatedCompanyName ||
      //   (approvedStatus.includes(data?.workMail?.status) &&
      //     approvedStatus.includes(data?.salarySlip?.status))
      // )
      //   await this.redisService.set(
      //     key,
      //     JSON.stringify(data),
      //     NUMBERS.SEVEN_DAYS_IN_SECONDS,
      //   );

      if (data?.startDate)
        data.startDate = this.typeService.getDateFormatted(data?.startDate);
      if (data.workMail) {
        if (data.workMail?.verifiedDate)
          data.workMail.verifiedDate = this.typeService.getDateFormatted(
            data.workMail?.verifiedDate,
          );

        const WorkApprovedName = await this.commonSharedService.getAdminData(
          data.workMail.approveById,
        );

        if (WorkApprovedName)
          data.workMail.adminName = WorkApprovedName?.fullName ?? null;
      }

      if (data?.salarySlip) {
        if (data.salarySlip?.salaryVerifiedDate)
          data.salarySlip.salaryVerifiedDate =
            this.typeService.getDateFormatted(
              data.salarySlip?.salaryVerifiedDate,
            );

        if (data.salarySlip?.salarySlipDate)
          data.salarySlip.salarySlipMonth = this.typeService.getMonthAndYear(
            data.salarySlip?.salarySlipDate,
          );
        const salaryApprovedName = await this.commonSharedService.getAdminData(
          data.salarySlip.approveById,
        );
        if (salaryApprovedName)
          data.salarySlip.adminName = salaryApprovedName?.fullName ?? null;
        data.salarySlip.createdAt = this.typeService.getDateFormatted(
          data.salarySlip?.createdAt,
        );
        const employeeDetails = JSON.parse(data.salarySlip.response);
        if (employeeDetails?.Type === 'Offer Letter') {
          data.salarySlip.type = 'Offer Letter';
        } else if (employeeDetails?.Type === 'BankStatement') {
          data.salarySlip.type = 'Bank Statement';
          if (employeeDetails?.bank_name)
            data.salarySlip.bankName = employeeDetails.bank_name;
        } else if (employeeDetails?.Type === 'Invalid document') {
          data.salarySlip.type = 'Invalid document';
        } else if (employeeDetails?.Type === 'Salary Slip') {
          data.salarySlip.type = 'Salary Slip';
        } else {
          data.salarySlip.type = 'Other Document';
        }
        delete data.salarySlip?.response;
        delete data.salarySlip?.salarySlipDate;
      }
      const statusData = data?.masterData?.status;
      // if  salary slip skiped
      if (data?.salarySlip === null && statusData?.salarySlip === 4) {
        const salarySlip: any = {};
        salarySlip.status = '4';
        data.salarySlip = salarySlip;
      }

      if (data.sectorId) {
        const sectorData: any = await this.commonSharedService.getSectorData(
          data.sectorId,
        );
        if (sectorData == k500Error) data.sector = null;
        data.sector = sectorData?.sectorName ?? null;
      }

      if (data.designationId) {
        const designationData: any =
          await this.commonSharedService.getDesignationData(data.designationId);
        if (designationData == k500Error) data.designation = null;
        data.designation = designationData?.designationName ?? null;
      }
      let lastPayDate: string = data?.otherInfo?.lastPayDate
        ? this.dateService.dateToReadableFormat(
            data?.otherInfo?.lastPayDate ?? '',
          ).readableStr
        : '';
      let nextPayDate: string = data?.otherInfo?.nextPayDate
        ? this.dateService.dateToReadableFormat(
            data?.otherInfo?.nextPayDate ?? '',
          ).readableStr
        : '';

      lastPayDate = lastPayDate?.split('-')?.join('/') ?? undefined;
      nextPayDate = nextPayDate?.split('-')?.join('/') ?? undefined;

      data.otherInfo = {
        ...data?.otherInfo,
        lastPayDate,
        nextPayDate,
      };

      if (data?.updatedCompanyName) {
        const companyChangeByAdmin =
          await this.commonSharedService.getAdminData(
            data?.companyNameChangeBy,
          );
        data.companyChangeByAdmin = companyChangeByAdmin?.fullName ?? '-';
        delete data?.companyNameChangeBy;
      } else {
        delete data?.updatedCompanyName;
        delete data?.companyNameChangeBy;
        delete data?.companyChangeByAdmin;
      }

      delete data?.masterData;
      return data;
    } catch (error) {
      console.log({ error });

      return kInternalError;
    }
  }

  // #startregion user work basic details
  async fetchUserWorkBasicDetailsHistory(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const empAttr = [
        'id',
        'updatedAt',
        'companyName',
        'companyUrl',
        'companyPhone',
        'commision',
        'startDate',
        'companyAddress',
        'otherInfo',
        'companyNameChangeBy',
        'updatedCompanyName',
      ];
      const empOptions: any = {
        where: {
          userId,
        },
        include: [
          { model: employmentDesignation, attributes: ['designationName'] },
          { model: employmentSector, attributes: ['sectorName'] },
          { model: employmentType, attributes: ['typeName'] },
        ],
        order: [['id', 'DESC']],
      };
      const empData = await this.empHistoryRepo.getTableWhereData(
        empAttr,
        empOptions,
      );
      if (empData === k500Error) return kInternalError;
      const finalData = [];
      for (let i = 0; i < empData.length; i++) {
        try {
          const ele = empData[i];
          let companyNameChangeBy = '-';
          if (ele?.companyNameChangeBy) {
            const adminData = await this.commonSharedService.getAdminData(
              ele?.companyNameChangeBy,
            );
            companyNameChangeBy = adminData?.fullName ?? '-';
          }
          const preparedObj: any = {
            id: ele?.id,
            updatedAt: ele?.updatedAt
              ? this.typeService.getDateFormated(ele?.updatedAt)
              : '-',
            companyName: ele?.companyName ?? '-',
            companyUrl: ele?.companyUrl != '' ? ele?.companyUrl : '-',
            companyPhone: ele?.companyPhone != '' ? ele?.companyPhone : '-',
            commision: ele?.commision ?? '-',
            startDate: ele?.startDate
              ? this.typeService.getDateFormated(ele?.startDate)
              : '-',
            companyAddress: ele?.companyAddress ?? '-',
            lastPayDate: ele?.otherInfo?.lastPayDate
              ? this.typeService.getDateFormated(ele?.otherInfo?.lastPayDate)
              : '-',
            nextPayDate: ele?.otherInfo?.nextPayDate
              ? this.typeService.getDateFormated(ele?.otherInfo?.nextPayDate)
              : '-',
            directorName: ele?.otherInfo?.directorName ?? '-',
            netPaySalary: ele?.otherInfo?.netPaySalary ?? '-',
            userCompanyPhone: ele?.otherInfo?.userCompanyPhone ?? '-',
            designation: ele?.designation.designationName ?? '-',
            sector: ele?.sector?.sectorName ?? '-',
            employementType: ele?.employementTypeData?.typeName ?? '-',
            updatedCompanyName: ele?.updatedCompanyName ?? '-',
            companyNameChangeBy: companyNameChangeBy,
          };
          finalData.push(preparedObj);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion
}
