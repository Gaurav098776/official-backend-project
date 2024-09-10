// Imports
import { Injectable } from '@nestjs/common/decorators';
import { Op } from 'sequelize';
import {
  OPTIONAL_DOCS_REQUIRED,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
  valueInsurance,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { IFSC_VALIDATE_URL } from 'src/constants/network';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kNoTemplateFound } from 'src/constants/strings';
import { admin } from 'src/entities/admin.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { CrmReasonEntity } from 'src/entities/crm.reasons.entity';
import { Department } from 'src/entities/department.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { CrmRepository } from 'src/repositories/crm.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { DateService } from 'src/utils/date.service';
import { TypeService, crmTypeTitle } from 'src/utils/type.service';
import { EnvConfig } from 'src/configs/env.config';
import { MasterRepository } from 'src/repositories/master.repository';

@Injectable()
export class DashboardLoanService {
  constructor(
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly loanRepo: LoanRepository,
    private readonly apiService: APIService,
    private readonly templeteRepo: TemplateRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly commonSharedService: CommonSharedService,
    private readonly dateService: DateService,
    private readonly crmRepo: CrmRepository,
    private readonly masterRepo: MasterRepository,
  ) {}

  async getAllLoanVerificationData(query) {
    try {
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
        'assignTo',
      ];
      const option: any = this.prepareOptionsForFB(
        query.status,
        query?.page ?? 1,
        query.searchText,
        query.adminId,
        query.startDate,
        query.endDate,
        query.newOrRepeated,
        query.download,
      );
      const loanData: any = await this.loanRepo.getTableWhereDataWithCounts(
        loanAttr,
        option,
      );
      if (!loanData || loanData == k500Error) return k500Error;

      const finalData: any = await this.preparDataForFinalVerification(
        loanData.rows,
      );
      if (finalData == k500Error) return k500Error;
      return {
        count: loanData.count,
        rows: finalData,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async checkIfscCode(ifsc = null) {
    try {
      if (!ifsc) return false;
      const url = IFSC_VALIDATE_URL + ifsc;
      const result: any = await this.apiService.requestGet(url);
      if (!result || result === k500Error) return false;
      if (result?.IFSC) return true;
      return false;
    } catch (error) {}
  }
  private prepareOptionsForFB(
    status: string,
    page: number,
    searchText: any,
    adminId,
    startDate = null,
    endDate = null,
    newOrRepeated = null,
    download = 'false',
  ) {
    try {
      /// user where condition
      const userWhere: any = {
        isBlacklist: '0',
        quantity_status: { [Op.or]: ['1', '3'] },
      };
      const toDay = this.typeService.getGlobalDate(new Date());
      if (searchText) {
        let encryptedData = '';
        if (!isNaN(searchText)) {
          encryptedData = this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];
        }
        userWhere[Op.or] = [
          { fullName: { [Op.iRegexp]: searchText } },
          {
            phone: {
              [Op.like]: encryptedData ? '%' + encryptedData + '%' : null,
            },
          },
        ];
      }
      if (newOrRepeated == '1') userWhere.completedLoans = 0;
      else if (newOrRepeated == '0') userWhere.completedLoans = { [Op.gt]: 0 };
      let where: any = {};
      if (adminId) where.assignTo = adminId;
      if (startDate && endDate) {
        startDate = this.typeService.getGlobalDate(startDate);
        endDate = this.typeService.getGlobalDate(endDate);
        where.verifiedDate = {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        };
      }
      let whereManual = {};
      if (status === '1') {
        where['manualVerification'] = { [Op.or]: ['1', '3'] };
      } else if (status == '2' || status == '4') {
        if (status == '2') where['loanStatus'] = 'Rejected';
        if (status == '2') where['manualVerification'] = '2';
        where = {
          ...where,
          [Op.or]: [
            {
              [Op.and]: [
                { remark: { [Op.ne]: 'Inactive User response' } },
                { remark: { [Op.ne]: 'Declined by user' } },
              ],
            },
            { remark: { [Op.eq]: null } },
          ],
        };
        where['declineId'] = { [Op.eq]: null };
        whereManual = { salaryVerification: { [Op.ne]: '2' } };
      } else if (status == '0') {
        userWhere.NextDateForApply = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
        where['manualVerification'] = status;
      }
      const kycInclude: any = {
        attributes: ['id'],
        model: KYCEntity,
        where: {
          aadhaarStatus: { [Op.or]: ['1', '3'] },
          panStatus: { [Op.or]: ['1', '3'] },
        },
      };
      if (OPTIONAL_DOCS_REQUIRED)
        kycInclude.where.otherDocStatus = { [Op.or]: ['1', '3'] };

      const selfieInclude = {
        attributes: ['id', 'status'],
        model: UserSelfieEntity,
        where: {
          status: { [Op.or]: ['1', '3'] },
        },
      };
      const loanOptions = {
        distinct: true,
        where,
        include: [
          { model: PredictionEntity, attributes: ['reason'], required: false },
          {
            model: registeredUsers,
            attributes: ['id', 'fullName', 'phone', 'city', 'completedLoans'],
            where: userWhere,
            include: [kycInclude, selfieInclude],
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
            where: whereManual,
          },
        ],
        order: [['updatedAt', 'DESC']],
      };

      if (status != '0' && download != 'true') {
        loanOptions['offset'] = ((page || 1) - 1) * PAGE_LIMIT;
        loanOptions['limit'] = PAGE_LIMIT;
      }
      return loanOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async preparDataForFinalVerification(data) {
    const finalData = [];
    try {
      for (let i = 0; i < data.length; i++) {
        try {
          const tmpData: any = {};
          const item = data[i];
          const user = item.registeredUsers ?? {};
          const bankingData = item.bankingData ?? {};
          bankingData.assignedAdminData =
            await this.commonSharedService.getAdminData(
              bankingData?.assignedTo,
            );
          const verification = this.typeService.getVerificationLastData(
            user?.verificationTrackerData,
          );
          const predictionData = item.predictionData ?? {};
          const predictionReason = predictionData.reason;
          if (predictionReason && (user?.completedLoans ?? 0) > 0) {
            const reasonData = JSON.parse(predictionReason);
            const firstElement = Object.keys(reasonData)[0];
            if (firstElement) {
              tmpData['predictionData'] = firstElement
                .replace(/_/g, ' ')
                .toUpperCase();
            }
          }
          tmpData['userId'] = user?.id;
          tmpData['loanId'] = item.id;
          tmpData['Waiting time'] = verification.waitingTime;
          tmpData['Difference in minutes'] = verification.minutes;
          tmpData['Assign'] =
            (await this.commonSharedService.getAdminData(item?.assignTo))
              .fullName ?? '-';
          tmpData['assignId'] =
            (await this.commonSharedService.getAdminData(item?.assignTo)).id ??
            '-';
          tmpData['Loan id'] = item.id;
          tmpData['Name'] = user?.fullName ?? '-';
          tmpData['Mobile number'] = this.cryptService.decryptPhone(user.phone);
          tmpData['Applied loan amount'] = item?.loanAmount ?? 0;
          tmpData['Approved loan amount'] = item?.netApprovedAmount ?? 0;
          tmpData['Salary'] = bankingData?.salary ?? 0;
          tmpData['City'] = user?.city ?? '-';
          tmpData['Completed loans'] = user?.completedLoans ?? 0;
          tmpData['Last action by'] =
            (
              await this.commonSharedService.getAdminData(
                item?.manualVerificationAcceptId,
              )
            )?.fullName ?? '-';
          tmpData['Last updated'] = this.typeService.dateToJsonStr(
            item?.verifiedDate ?? item?.updatedAt,
            'DD/MM/YYYY',
          );
          tmpData['Reject reason'] = item?.remark ?? '-';
          tmpData['Status'] = item?.manualVerification;
          const ifsc = bankingData?.disbursementIFSC;
          const isValidIfsc = await this.checkIfscCode(ifsc);
          if (!isValidIfsc) tmpData['ifscTagged'] = 'IFSC NOT VALID';
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async sendNotificationBeforeLoanDecline() {
    try {
      const before7Day = new Date();
      before7Day.setDate(before7Day.getDate() - 7);
      const endDate = this.typeService.getUTCDate(before7Day.toString());
      const options = {
        where: {
          loanStatus: { [Op.or]: ['InProcess', 'Accepted'] },
          createdAt: { [Op.lte]: endDate },
        },
      };
      const attributes = ['id', 'userId', 'appType'];
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanData === k500Error) return kInternalError;
      //get templete id
      const tempOpt = { where: { subType: 'BEFORE_LOAN_DECLINE' } };
      const template = await this.templeteRepo.getRowWhereData(['id'], tempOpt);
      if (template === k500Error) return kInternalError;
      if (!template) return k422ErrorMessage(kNoTemplateFound);
      const data = { userData: loanData, id: template?.id, isMsgSent: true };
      return await this.sharedNotification.sendNotificationToUser(data);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getLoanHistory(query) {
    try {
      // Params validation
      const userId = query.userId;
      if (!userId) return kParamMissing('userId');
      const attributes = [
        'followerId',
        'id',
        'createdAt',
        'emiSelection',
        'loan_disbursement_date',
        'qualityScore',
        'interestRate',
        'netApprovedAmount',
        'loanStatus',
        'purposeId',
        'approvedDuration',
        'loanAmount',
        'nocURL',
        'netbankingGrade',
        'netScore',
        'remark',
        'adminName',
        'esign_id',
        'userReasonDecline',
        'declineId',
        'loanRejectReason',
        'manualVerificationAcceptId',
        'netApprovalData',
        'manualVerification',
        'insuranceDetails',
        'nomineeDetail',
        'isPartPayment',
        'verifiedSalaryDate',
        'cibilSystemFlag',
        'appType',
        'categoryTag',
        'isLoanClosure',
        'isLoanSettled',
      ];
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_date',
          'waiver',
          'payment_due_status',
          'penalty_update_date',
          'paid_waiver',
          'unpaid_waiver',
          'penalty_days',
          'loanId',
        ],
      };
      const bankingInclude = {
        model: BankingEntity,
        attributes: [
          'isNeedAdditional',
          'salaryVerification',
          'id',
          'nameMissMatchAdmin',
          'salary',
        ],
      };
      const predictionInclude: any = { model: PredictionEntity };
      predictionInclude.required = false;
      predictionInclude.attributes = [
        'automationDetails',
        'categorizationDetails',
        'ml_approval',
        'categorizationTag',
      ];
      const include = [emiInclude, bankingInclude, predictionInclude];
      const options = { include, where: { userId }, order: [['id', 'DESC']] };
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanData == k500Error) return kInternalError;
      const lastCrm = await this.getLastCrm(loanData, userId);

      const loanIds = loanData.map((el) => el?.id);

      const masterOptions = { where: { loanId: loanIds } };
      const masterData = await this.masterRepo.getTableWhereData(
        ['id', 'loanId', 'assignedCSE'],
        masterOptions,
      );
      if (masterData === k500Error) return kInternalError;

      if (valueInsurance?.relationshipCode?.length == 0)
        await this.commonSharedService.refreshInsuranceArray();
      for (let index = 0; index < loanData?.length; index++) {
        try {
          const element = loanData[index];
          const masterFilter = masterData.filter(
            (masterRes) => masterRes.loanId == element?.id,
          );
          if (masterFilter.length > 0) {
            loanData[index].assignedCSE =
              (
                await this.commonSharedService.getAdminData(
                  masterFilter[0].assignedCSE,
                )
              )?.fullName ?? '-';
          }
          let categoryTag = element?.categoryTag;
          loanData[index].app =
            element?.appType == 1
              ? EnvConfig.nbfc.nbfcShortName
              : EnvConfig.nbfc.appName;
          delete loanData[index].appType;
          if (categoryTag == 0) categoryTag = 'Low risk';
          else if (categoryTag == 1) categoryTag = 'Moderate risk';
          else if (categoryTag == 2) categoryTag = 'High risk';
          else if (categoryTag == 3) categoryTag = 'Premium';

          element.categoryTag =
            categoryTag ?? element.predictionData?.categorizationTag ?? '-';
          // User have selected emi date or not
          const emiSelection = element.emiSelection ?? {};
          if (emiSelection.selectedEmiDate) {
            element.selectedEmiDate = emiSelection.selectedEmiDate;
            delete element.emiSelection;
          }
          element.netApprovedAmount = +element?.netApprovedAmount ?? 0;
          const adminId =
            element?.manualVerificationAcceptId ?? SYSTEM_ADMIN_ID;
          if (adminId == SYSTEM_ADMIN_ID) element.lastActionBy = 'System';
          else {
            const adminData = await this.commonSharedService.getAdminData(
              adminId,
            );
            element.lastActionBy = adminData?.fullName ?? '-';
          }
          if (element?.bankingData?.nameMissMatchAdmin) {
            const adminData = await this.commonSharedService.getAdminData(
              element?.bankingData?.nameMissMatchAdmin,
            );
            element.bankingData.nameMissMatchAdmin = adminData?.fullName ?? '-';
          }
          const purposeData: any =
            await this.commonSharedService.getLoanPurpose(element?.purposeId);
          element.purpose = purposeData?.purposeName ?? null;

          // Banking details
          if (element.bankingData) {
            // Salary details
            if (element.bankingData?.salary) {
              element.verifiedSalary = element.bankingData.salary;
              delete element.bankingData.salary;
            }
          }

          // Prediction
          // ML Prediction
          if (element.predictionData) {
            if (element.predictionData?.categorizationDetails) {
              const categorizationData =
                element.predictionData?.categorizationDetails ?? {};
              element.userCategoryTag =
                element.predictionData?.categorizationDetails.category ?? '';
              const userCategoryData: any = {};
              let totalScore = 0;
              for (const key in categorizationData) {
                try {
                  const value = categorizationData[key];
                  if (key != 'totalValue') userCategoryData[key] = value?.value;
                  else totalScore = value;
                } catch (error) {}
              }
              userCategoryData.totalScore = totalScore;
              element.userCategoryData = userCategoryData;
            }
            // Model 1 -> Repayment model
            const automationDetails =
              element.predictionData?.automationDetails ?? {};
            if (automationDetails && automationDetails?.model_version) {
              delete automationDetails.feedData;
              element.predictionDetails = automationDetails;
            }
            // Model 2 -> Final approval model
            const ml_approval = element.predictionData?.ml_approval ?? {};
            if (ml_approval && ml_approval?.model_version) {
              delete ml_approval.feedData;
              element.ml_approval = ml_approval;
            }
            delete element.predictionData;
          }
          // insurance details
          const insurance = element?.insuranceDetails;
          if (insurance) {
            insurance.planAPremium = this.typeService.manageAmount(
              insurance?.planAPremium ?? 0,
            );
            insurance.planBPremium = this.typeService.manageAmount(
              insurance?.planBPremium ?? 0,
            );
            insurance.planCPremium = this.typeService.manageAmount(
              insurance?.planCPremium ?? 0,
            );
            insurance.totalPremium = this.typeService.manageAmount(
              insurance?.totalPremium ?? 0,
            );
          }
          // Nominee details
          const nominee = element?.nomineeDetail;
          if (nominee) {
            const DOB = new Date(nominee.Nominee_dob);
            const YOB = DOB.getFullYear();
            nominee.Age = new Date().getFullYear() - YOB;
            nominee.Nominee_dob = this.typeService.dateToJsonStr(
              DOB,
              'DD/MM/YYYY',
            );
            const rCode = nominee.Nominee_Relationship_Code;
            const findCode = valueInsurance.relationshipCode.find(
              (f) => f.code === rCode,
            );
            nominee.Relation = findCode ? findCode?.name ?? '-' : '-';
          }
          element.penalty_days = this.typeService.getOverDueDay(
            element.emiData,
          );

          // Follower details
          if (index == 0) {
            const followerId = element.followerId;
            const followerData = await this.commonSharedService.getAdminData(
              followerId,
            );
            delete followerData.email;
            element.followerData = followerData;
            delete element.followerId;
          }
        } catch (error) {}
      }
      return { loanData, lastCrm };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getLastCrm(loanData, userId) {
    try {
      const adminInclude = {
        model: admin,
        as: 'adminData',
        attributes: ['id', 'fullName'],
        include: [{ model: Department, attributes: ['id', 'department'] }],
      };
      const reasonInclude = {
        model: CrmReasonEntity,
        attributes: ['id'],
      };
      const options: any = {
        where: {},
        order: [['createdAt', 'DESC']],
        include: [adminInclude, reasonInclude],
      };
      if (loanData.length == 0) options.where.userId = userId;
      else options.where.loanId = loanData[0].id;
      const attributes = [
        'id',
        'categoryId',
        'adminId',
        'remark',
        'createdAt',
        'reason',
        'loanId',
        'relationData',
      ];
      const lastCrmData = await this.crmRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!lastCrmData) return {};
      if (lastCrmData == k500Error) return kInternalError;
      const crmData = await this.prepareLastCrmDate(lastCrmData);
      return crmData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async prepareLastCrmDate(lastCrmData) {
    const lastCRM = {};

    if (lastCrmData?.createdAt || lastCrmData?.createdAt != '') {
      lastCRM['Date & Time'] = this.dateService.readableDate(
        lastCrmData?.createdAt,
      );
    } else lastCRM['Date & Time'] = '-';
    lastCRM['Title'] = lastCrmData?.relationData?.statusName ?? '-';
    lastCRM['Category'] = crmTypeTitle[lastCrmData?.categoryId] ?? '-';
    lastCRM['Description'] = lastCrmData?.remark ?? '-';
    lastCRM['Loan Id'] = lastCrmData?.loanId ?? '-';
    lastCRM['Action By'] = lastCrmData?.adminData?.fullName ?? '-';
    lastCRM['Department'] =
      lastCrmData?.adminData?.departmentData?.department ?? '-';
    lastCRM['Reason'] = lastCrmData?.crmReasonData ?? '-';

    return lastCRM;
  }
}
