import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { PAGE_LIMIT, SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { reInitiateDisbursement } from 'src/constants/network';
import { kUniversalIFSC } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound, kReEsignNotify } from 'src/constants/strings';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { ESignRepository } from 'src/repositories/esign.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';

@Injectable()
export class DashboardDisbursement {
  constructor(
    private readonly loanRepo: LoanRepository,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly disbursmentRepo: DisbursmentRepository,
    private readonly adminRepository: AdminRepository,
    private readonly apiService: APIService,
    private readonly eSignRepo: ESignRepository,
    private readonly masterRepo: MasterRepository,
    private readonly userActivityRepo: UserActivityRepository,
    private readonly stampRepo: StampRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly userService: UserServiceV4,
    private readonly bankingRepo: BankingRepository,
  ) {}

  async getQueuedDisbursements(needCounts = false) {
    try {
      const options = this.prepareOptionForQueuedDisbursements();
      const attributes = ['id', 'userId', 'updatedAt'];
      if (needCounts) {
        const loanCount = await this.loanRepo.getCountsWhere(options);
        if (loanCount === k500Error) return kInternalError;
        return { counts: loanCount };
      } else {
        const loanData = await this.loanRepo.getTableWhereData(
          attributes,
          options,
        );
        if (loanData === k500Error) return kInternalError;
        return this.prepareDataForQueuedDisbursements(loanData);
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareDataForQueuedDisbursements(data) {
    try {
      const finalData: any = [];
      data.forEach((item) => {
        const tmpData: any = {};
        try {
          let disbursementData = (item?.disbursementData ?? [{}])[0];
          if (!disbursementData) disbursementData = {};
          const userData = item.registeredUsers ?? {};
          const verification = this.typeService.getVerificationLastData(
            userData.verificationTrackerData,
          );
          tmpData['userId'] = item?.userId;
          tmpData['Waiting time'] = verification?.waitingTime;
          tmpData['Difference in minutes'] = verification?.minutes;
          tmpData['Name'] = userData.fullName;
          tmpData['Loan id'] = item?.id;
          tmpData['Mobile number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          tmpData['Completed loans'] = userData.completedLoans;
          tmpData['Failed reason'] = '-';
          tmpData['Bank'] = disbursementData.bank_name ?? '-';
          tmpData['Status'] = (
            disbursementData.status ?? 'INITIALIZED'
          ).toUpperCase();
          finalData.push(tmpData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareOptionForQueuedDisbursements() {
    try {
      const disbursementInclude: any = {
        distinct: true,
        model: disbursementEntity,
        attributes: ['id', 'status', 'bank_name'],
      };
      const eSignInclude: any = { distinct: true, model: esignEntity };
      eSignInclude.attributes = ['id'];
      eSignInclude.where = { status: '1' };
      const userInclude: any = { distinct: true, model: registeredUsers };
      userInclude.attributes = ['id', 'completedLoans', 'fullName', 'phone'];
      userInclude.where = { isBlacklist: { [Op.ne]: '1' } };
      const options: any = {
        distinct: true,
        include: [disbursementInclude, eSignInclude, userInclude],
        where: {
          loanStatus: 'Accepted',
          manualVerification: { [Op.or]: ['1', '3'] },
        },
      };
      return options;
    } catch (error) {}
  }

  async getDisbursementFailedReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const download = query?.download ?? 'false';
      const page = query?.page ?? 1;
      const searchText = query?.searchText;
      const attributes = [
        'id',
        'loanId',
        'userId',
        'bank_name',
        'source',
        'amount',
        'account_number',
        'response',
        'createdAt',
      ];
      const userInc: any = {
        model: registeredUsers,
        attributes: ['fullName', 'phone'],
      };
      if (searchText) {
        userInc.where = {};
        if (!isNaN(searchText)) {
          let encPhone = this.cryptService.encryptPhone(searchText);
          encPhone = encPhone.split('===')[1];
          userInc.where.phone = { [Op.iRegexp]: encPhone };
        } else userInc.where.fullName = { [Op.iRegexp]: searchText };
      }
      const loanInc: any = {
        model: loanTransaction,
        attributes: ['id', 'netApprovedAmount', 'loanStatus'],
      };
      const options: any = {
        where: {
          status: { [Op.or]: ['reversed', 'cancelled', 'rejected', 'failed'] },
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        },
        include: [userInc, loanInc],
        order: [['id']],
      };
      if (download != 'true') {
        options.limit = PAGE_LIMIT;
        options.offset = +page * PAGE_LIMIT - PAGE_LIMIT;
      }
      const failedData = await this.disbursmentRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (failedData === k500Error) return kInternalError;
      const finalData = await this.prepareFailedDisbursementData(
        failedData?.rows,
      );
      return { count: failedData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareFailedDisbursementData(data) {
    try {
      const finalData = [];
      data.forEach((item) => {
        try {
          const tmpData: any = {
            userId: '-',
            Name: '-',
            Phone: '-',
            'Loan Id': '-',
            'Loan Status': '-',
            'Disbursement Amount': '-',
            'Fail Reason': '-',
            Source: '-',
            'Account No.': '-',
            Bank: '-',
            'Approved Amount': '-',
            Created: '-',
          };
          const user = item?.user;
          const loan = item?.loan;
          const resp = JSON.parse(item?.response);
          const reason = resp?.status_details?.description;
          tmpData['userId'] = item?.userId ?? '-';
          tmpData['Name'] = user?.fullName ?? '-';
          tmpData['Phone'] = this.cryptService.decryptPhone(user?.phone) ?? '-';
          tmpData['Loan Id'] = item?.loanId ?? '-';
          tmpData['Loan Status'] = loan?.loanStatus ?? '-';
          tmpData['Disbursement Amount'] =
            Math.floor((item?.amount ?? 0) / 100) ?? '-';
          tmpData['Fail Reason'] = reason ?? '-';
          tmpData['Source'] = item?.source ?? '-';
          tmpData['Account No.'] = item?.account_number ?? '-';
          tmpData['Bank'] = item?.bank_name ?? '-';
          tmpData['Approved Amount'] =
            (+loan?.netApprovedAmount).toFixed() ?? '-';
          tmpData['Created'] = this.typeService.getDateFormatted(
            item?.createdAt,
          );
          finalData.push(tmpData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region re-initiate disbursement
  async reInitiateDisbursement(body) {
    try {
      // if (process.env.MODE !== 'PROD') return kInternalError;
      const loanId = body?.loanId;
      const adminId = body?.adminId;
      const isUniversalIFSC = body?.isUniversalIFSC ?? false;
      if (!loanId) return kParamMissing('loanId');
      if (!adminId) return kParamMissing('adminId');
      const hasAccess = await this.adminRepository.checkHasAccess(
        adminId,
        'disbursement failed',
      );
      if (hasAccess !== true) return hasAccess;
      const userInc = {
        model: registeredUsers,
        attributes: ['id', 'isBlacklist'],
      };
      const loanOps = {
        where: { id: loanId },
        include: [userInc],
      };
      const loanAttr = ['id', 'loanStatus'];
      const loan = await this.loanRepo.getRowWhereData(loanAttr, loanOps);
      if (loan === k500Error) return kInternalError;
      if (!loan) return k422ErrorMessage(kNoDataFound);
      if (loan?.loanStatus != 'Accepted')
        return k422ErrorMessage('Loan is not at accepted stage');
      const isBlacklist = loan?.registeredUsers?.isBlacklist;
      if (isBlacklist == '1') return k422ErrorMessage('User is blocked');
      const disbAttr = ['id', 'bank_name'];
      const status = ['reversed', 'cancelled', 'rejected', 'failed'];
      const disbOptions = { where: { loanId, status: { [Op.or]: status } } };
      const disbursement = await this.disbursmentRepo.getRowWhereData(
        disbAttr,
        disbOptions,
      );
      if (!disbursement || disbursement === k500Error)
        return k422ErrorMessage(
          'Cannot find failed disbursement for this loan!',
        );

      const bankName = disbursement?.bank_name;
      if (isUniversalIFSC) {
        if (!kUniversalIFSC[bankName])
          return k422ErrorMessage(
            `Universal IFSC for ${bankName} not found, kindly contact IT support`,
          );
        const bankOptions = { where: { loanId }, order: [['id', 'DESC']] };
        const bankData = await this.bankingRepo.getRowWhereData(
          ['id'],
          bankOptions,
        );
        if (bankData === k500Error) return kInternalError;
        const mandateIFSC = kUniversalIFSC[bankName];
        const disbursementIFSC = kUniversalIFSC[bankName];
        const ifsCode = kUniversalIFSC[bankName];

        const updatedData = {
          mandateIFSC,
          disbursementIFSC,
          ifsCode,
        };
        await this.bankingRepo.updateRowData(updatedData, bankData?.id);
      }
      // delete failed disbursement & update loanData(re-initiate disbursement)
      const source = body.source;
      const transferMode = (body.transferMode ?? 'IMPS').toUpperCase();
      const response = await this.apiService.requestPost(
        reInitiateDisbursement,
        { loanId, source, transferMode },
      );
      if (response === k500Error) return kInternalError;
      if (response?.message && typeof response?.message == 'object')
        return response?.message;
      return response;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  async reInitiateAllFailedDisbursements() {
    try {
      const loanInclude: any = {
        model: loanTransaction,
        attributes: ['id'],
        where: {
          loanStatus: 'Accepted',
          loan_disbursement_id: null,
        },
      };
      const attributes = ['loanId'];
      const options = {
        where: { status: { [Op.or]: ['reversed', 'failed'] } },
        include: [loanInclude],
      };
      const disbursementList = await this.disbursmentRepo.getTableWhereData(
        attributes,
        options,
      );
      if (disbursementList === k500Error) return kInternalError;

      for (let index = 0; index < disbursementList.length; index++) {
        try {
          const disbursementData = disbursementList[index];
          const loanId = disbursementData?.loanId;
          const data = { loanId, adminId: SYSTEM_ADMIN_ID };
          const response = await this.reInitiateDisbursement(data);
        } catch (error) {}
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // reDirect user in Esing after DisbursementFailed
  async reEsingAfterDisbursementFailed(body) {
    try {
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const pastDay = new Date();
      pastDay.setDate(pastDay.getDate() - 1);
      pastDay.setUTCHours(23, 59, 59, 0);

      const userInc = {
        model: registeredUsers,
        attributes: [],
        where: { isBlacklist: { [Op.ne]: '1' } },
      };
      const esignInc = {
        model: esignEntity,
        attributes: [],
        where: { status: '1' },
      };
      const loanIncl = {
        model: loanTransaction,
        attributes: [],
        where: { loanStatus: 'Accepted' },
        include: [esignInc],
      };
      // Disbursment data
      const declined = ['reversed', 'cancelled', 'rejected', 'failed'];
      const disAttr = ['id', 'userId'];
      const disOps = {
        where: {
          loanId,
          status: { [Op.or]: declined },
          createdAt: { [Op.lte]: pastDay },
        },
        include: [userInc, loanIncl],
      };
      const disbursement = await this.disbursmentRepo.getRowWhereData(
        disAttr,
        disOps,
      );
      if (disbursement === k500Error) return kInternalError;
      if (!disbursement) return k422ErrorMessage(kNoDataFound);
      return await this.deleteEsignAndDisbursement(loanId, disbursement);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // delete Esign and failed Disbursement
  async deleteEsignAndDisbursement(loanId, disbursement) {
    try {
      if (disbursement) {
        const userId = disbursement?.userId;
        // E-Sign data
        const opts = { where: { status: '1', loanId } };
        const eSing = await this.eSignRepo.getRowWhereData(null, opts);
        if (eSing === k500Error) return kInternalError;
        // Master data
        const master = await this.masterRepo.getRowWhereData(
          ['id', 'status', 'dates'],
          { where: { loanId } },
        );
        if (master === k500Error) return kInternalError;
        if (!disbursement?.id || !eSing?.id || !master?.id) return kBadRequest;
        const statusData = master.status;
        const dates = master.dates;
        // for eSign history
        const esignData = {
          loanId,
          userId,
          type: 'DELETE_DONE_ESIGN',
          date: this.typeService.getGlobalDate(new Date()).toJSON(),
          respons: JSON.stringify(eSing),
        };
        await this.userActivityRepo.createRowData(esignData);
        // permanent stemp reserved
        if (eSing?.stampId) {
          const stempUpdate = await this.stampRepo.updateRowData(
            { takenStatus: '2' },
            eSing?.stampId,
          );
          if (stempUpdate === k500Error) return kInternalError;
        }
        // delete esign
        const deleteEsign = await this.eSignRepo.deleteWhereData({
          where: { id: eSing?.id },
          limit: 1,
        });
        if (deleteEsign === k500Error) return kInternalError;
        statusData.eSign = -1;
        dates.eSign = 0;
        // update loan
        const updateLoan = await this.loanRepo.updateRowData(
          { loan_disbursement_id: null, esign_id: null },
          loanId,
        );
        if (updateLoan === k500Error) return kInternalError;
        const data = { loanId, adminId: SYSTEM_ADMIN_ID };
        statusData.disbursement = -1;
        dates.disbursement = 0;
        // update master
        const updateMaster = await this.masterRepo.updateRowData(
          { status: statusData, dates },
          master.id,
        );
        if (updateMaster === k500Error) return kInternalError;
        await this.reInitiateDisbursement(data);
        // send notification
        const body = {
          userList: [userId],
          title: 'Complete your Re-Esign process!',
          content: kReEsignNotify,
        };
        this.sharedNotification.sendNotificationToUser(body);
        await this.userService.routeDetails({ id: userId });
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
