import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  kEsignCantClose,
  kSomthinfWentWrong,
  vFinalBucket,
} from 'src/constants/strings';
import { esignEntity } from 'src/entities/esign.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ESignService } from '../esign/esign.service';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { PAGE_LIMIT } from 'src/constants/globals';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';

@Injectable()
export class EligibilityService {
  constructor(
    private readonly masterRepo: MasterRepository,
    private readonly loanRepo: LoanRepository,
    private readonly sharedEligiblityService: EligibilitySharedService,
    private readonly userRepo: UserRepository,
    private readonly reasonRepo: ReasonRepository,
    private readonly predictionRepo: PredictionRepository,
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly esignService: ESignService,
    private readonly stateEligibilityRepo: StateEligibilityRepository,
    private readonly userBlockHistoryRepo: BlockUserHistoryRepository,
    private readonly commonSharedSerivce: CommonSharedService,
  ) {}

  private async getLoanData(reqData) {
    try {
      const loanId = reqData.loanId;
      const loanInclude: any = { model: loanTransaction };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'fcmToken'],
      };
      loanInclude.attributes = [
        'id',
        'userId',
        'loan_disbursement_id',
        'loanStatus',
      ];
      const esignAttr = ['id', 'document_id', 'esign_mode', 'status'];
      const esignInclude = {
        model: esignEntity,
        attributes: esignAttr,
      };
      loanInclude.include = [esignInclude];
      const include = [loanInclude, userInclude];
      const attributes = ['dates', 'id', 'loanId', 'status'];
      const options: any = {
        include,
        where: {
          loanId,
          'status.loan': { [Op.notIn]: [6, 7] },
        },
      };
      const masterList = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;
      return masterList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async rejectLoanFromAdmin(body) {
    try {
      const remark = body.remark;
      const adminId = body.adminId;
      const loanId = body?.loanId;
      const userId = body?.userId;
      let nextDateForApply = body?.nextDateForApply;
      const declineId = body?.declineId;
      if (!adminId || !loanId || !userId) return kParamsMissing;
      const masterData = await this.getLoanData(body);
      if (!masterData || masterData.message)
        return k422ErrorMessage('Loan data not found!');
      const loanData = masterData?.loanData;
      if (loanData?.loanStatus == 'Rejected')
        return k422ErrorMessage('Loan is already Rejected');
      const eSignData = loanData?.eSignData;
      if (eSignData) {
        // check if esign completed or not
        let body = {
          esignId: eSignData?.id,
          adminId,
          loanId,
        };
        if (eSignData.status == '1') return k422ErrorMessage(kEsignCantClose);
        if (eSignData.status == '0') {
          const deleteEsign = await this.esignService.funDeleteEsign(body);
          if (deleteEsign?.message) return deleteEsign;
        }
      }
      if (masterData) {
        if (loanData?.loan_disbursement_id)
          return k422ErrorMessage('Disbursement initiated!');
        await this.sharedEligiblityService.rejectLoan(
          adminId,
          loanId,
          remark,
          userId,
          nextDateForApply,
          declineId,
          true,
        );
        if (nextDateForApply)
          nextDateForApply = this.typeService.getGlobalDate(nextDateForApply);
        else {
          nextDateForApply = this.typeService.getGlobalDate(new Date());
          nextDateForApply.setDate(nextDateForApply.getDate() + 1);
        }
        //manage history
        const historyData = {
          userId,
          reason: remark,
          isBlacklist: '0',
          blockedBy: adminId,
          coolOfDate: nextDateForApply.toJSON(),
        };
        await this.userBlockHistoryRepo.createRowData(historyData);
        const reasonData: any = await this.reasonRepo.getRowWhereData(
          ['id', 'reason'],
          { where: { id: declineId } },
        );
        const reason = reasonData?.reason;
        return await this.sharedEligiblityService.checkAndRejectSteps(
          userId,
          reason,
        );
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region  reinitiate to final bucket
  async reinitiateToFinalBucket(body) {
    try {
      if (!body?.loanId || !body?.adminId) return kParamsMissing;
      const loanId = body.loanId;
      const adminId = body.adminId;
      const attributes = ['id', 'status', 'userId', 'dates', 'coolOffData'];
      const loanInclude = {
        model: loanTransaction,
        attributes: [
          'id',
          'loanStatus',
          'manualVerification',
          'manualVerificationAcceptId',
        ],
        where: { loanStatus: 'Rejected', subscriptionId: { [Op.eq]: null } },
      };
      const options = {
        where: { loanId, status: { eMandate: -1 } },
        include: [loanInclude],
      };
      const mastarData: any = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );

      if (mastarData === k500Error) return kInternalError;
      if (!mastarData)
        return k422ErrorMessage("Can't move to the final verification");
      const statusData = mastarData?.status ?? {};
      const coolOffData = mastarData?.coolOffData ?? {};
      const loanData = mastarData.loanData;
      const bankVerification = statusData?.bank ?? -1;
      if (bankVerification != 1 && bankVerification != 3)
        return k422ErrorMessage('Bank statement not verified!');
      if (
        !loanData.manualVerificationAcceptId &&
        loanData.manualVerification != '2'
      )
        return k422ErrorMessage('Loan is not verified!');
      const loanUpdateRes = await this.loanRepo.updateRowData(
        {
          manualVerification: '0',
          manualVerificationAcceptId: adminId,
          loanStatus: 'Accepted',
        },
        loanId,
      );
      if (loanUpdateRes === k500Error)
        return k422ErrorMessage('Loan is not initiated to final verification');
      statusData.loan = 0;
      statusData.eligibility = 0;
      coolOffData.coolOffStartedOn = '';
      coolOffData.coolOffEndsOn = '';
      await this.masterRepo.updateRowData(
        { status: statusData, coolOffData },
        mastarData.id,
      );

      const updateUserRes = await this.userRepo.updateRowData(
        { NextDateForApply: null },
        mastarData.userId,
      );
      if (updateUserRes === k500Error) return kInternalError;
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region migreate LoanAutomation
  async migreateLoanAutomation() {
    try {
      const options = { where: { automationDetails: { [Op.ne]: null } } };
      const att = ['id', 'automationDetails'];
      const list = await this.predictionRepo.getTableWhereData(att, options);
      if (!list || list === k500Error) return kInternalError;
      // for (let index = 0; index < 10; index++) {
      for (let index = 0; index < list.length; index++) {
        const ele = list[index];
        if (index % 100 == 0) console.log((index * 100) / list.length);
        const data = ele?.automationDetails ?? {};
        let no_of_salary = 0;
        let date = new Date();
        date.setMonth(date.getMonth() - 2);
        date.setDate(1);
        date = this.typeService.getGlobalDate(date);
        try {
          const salaryList = data?.salary ?? [];
          salaryList.forEach((ele) => {
            try {
              let salaryDate = ele['Date Time'];
              if (salaryDate) {
                salaryDate = salaryDate.split('/').reverse().join('-');
                salaryDate = this.typeService.getGlobalDate(
                  new Date(salaryDate),
                );
                if (salaryDate.getTime() >= date.getTime()) no_of_salary += 1;
              }
            } catch (error) {}
          });
        } catch (e) {}
        data.no_of_salary = no_of_salary;
        const baseUrl = this.commonSharedSerivce.getPythonBaseUrl(0); // static lsp
        const url = baseUrl + 'v2/prediction/loanApproved';
        const result = await this.api.requestPost(url, data);
        const labal = result?.data?.label;
        if (labal) {
          data.label = labal;
          const update = { automationDetails: data };
          await this.predictionRepo.updateRowData(update, ele.id);
        }
        if (!labal) console.log(result, data);
      }
    } catch (error) {}
  }
  //#endregion

  //#resgion getStates for state-wise salary
  async getStates(query) {
    try {
      const searchText = query?.searchText ?? '';
      const download = query?.download ?? false;
      const page = query?.page ?? 1;

      const attributes = [
        'id',
        'stateName',
        'isActive',
        'eligibility_new',
        'eligibility_repeat',
      ];
      const options: any = { where: {}, order: [['stateName']] };
      if (searchText) {
        options.where.stateName = { [Op.iRegexp]: searchText };
      }
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const stateList =
        await this.stateEligibilityRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );
      if (!stateList || stateList == k500Error) return kInternalError;
      return stateList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region update eligibility for state-wise salary
  async updatestateEligibilityData(body) {
    try {
      const id = body?.id;
      if (!id) return kParamMissing('id');
      const updatedData: any = {};
      if (body?.eligibility_new)
        updatedData.eligibility_new = body?.eligibility_new;
      if (body?.eligibility_repeat)
        updatedData.eligibility_repeat = body?.eligibility_repeat;
      if (body?.isActive) updatedData.isActive = body?.isActive;
      const updateResult = await this.stateEligibilityRepo.updateRowData(
        updatedData,
        id,
      );
      if (updateResult === k500Error) return kInternalError;
      if (updateResult == 0) return k422ErrorMessage(kSomthinfWentWrong);
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
