// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { ESignRepository } from 'src/repositories/esign.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { SharedTransactionService } from './transaction.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { nIpCheck, nIpCheckerKey } from 'src/constants/network';
import { UserSharedLogTrackerMiddleware } from './logtracker.middleware';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class LogsSharedService {
  constructor(
    private readonly eSignRepo: ESignRepository,
    private readonly loanRepo: LoanRepository,
    private readonly userLogTrackerRepo: UserLogTrackerRepository,
    private readonly deviceInfoRepo: DeviceInfoInstallAppRepository,
    private readonly emiRepo: EMIRepository,
    private readonly userActivityRepo: UserActivityRepository,
    @Inject(forwardRef(() => SharedTransactionService))
    private readonly sharedTransactions: SharedTransactionService,
    private readonly transactionRepo: TransactionRepository,
    private readonly ipMasterRepo: IpMasterRepository,
    private readonly userSharedLogTrackerMiddleware: UserSharedLogTrackerMiddleware,
    private readonly APIService: APIService,
  ) {}

  async trackUserLog(data: any) {
    try {
      const stageData: any = await this.checkStage(data);
      if (stageData.message) return stageData;

      const isExists: any = await this.checkIfExists(data);
      if (isExists.message) return isExists;
      // Prevents duplicate entry
      if (isExists) return {};

      const deviceId = await this.getDeviceId(data.userId);
      if (deviceId.message) return k422ErrorMessage(deviceId);
      data.deviceId = '-';
      const createdData = await this.userLogTrackerRepo.create(data);
      if (createdData == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async markeSignAsCompleted(userId, loanId) {
    try {
      const data = {
        userId,
        stage: 'E-Sign Completed',
        loanId,
      };
      return await this.trackUserLog(data);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async checkStage(data: any) {
    try {
      if (data.stage == 'E-Sign Completed') {
        const loanId = data.loanId;
        const attributes = ['id'];
        const options = { where: { loanId, status: '1' } };

        const eSignData = await this.eSignRepo.getRowWhereData(
          attributes,
          options,
        );
        if (!eSignData) return k422ErrorMessage('No data found');
        if (eSignData == k500Error) return kInternalError;
        const ip = await this.getRecentIPData(loanId);
        if (!data.ip) data.ip = ip;
        return data;
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get last IP
  async getRecentIPData(loanId) {
    try {
      const attributes = ['ip'];
      const options = { order: [['id', 'DESC']], where: { loanId } };

      const logData = await this.userLogTrackerRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!logData) return;
      if (logData == k500Error) return;
      return logData.ip;
    } catch (error) {
      return;
    }
  }

  // Prevents duplicate entry
  private async checkIfExists(data: any) {
    try {
      if (!data.loanId) return false;

      const today = new Date();
      today.setHours(today.getHours() - 1);
      const attributes = ['id'];
      const options = {
        where: {
          createdAt: { [Op.gte]: today },
          loanId: data.loanId,
          stage: data.stage,
          ip: data.ip,
        },
      };

      const existingData = await this.userLogTrackerRepo.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return kInternalError;
      if (existingData) return true;
      return false;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getDeviceId(userId) {
    try {
      const options = {
        where: { userId },
        order: [['updatedAt', 'DESC']],
      };
      const deviceData = await this.deviceInfoRepo.findOne(
        ['deviceId', 'deviceInfo', 'webDeviceInfo'],
        options,
      );
      if (!deviceData) return k422ErrorMessage('No data found');
      return deviceData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // In v3 flow few steps are related to loan but getting triggered before the loan starts
  // i.e. Basic Details verified, Professional Details verified, Employment submitted, Workmail submitted, Workmail Verified
  async addLoanIdsToPreLoanFields(userId: string, loanId: number) {
    try {
      // Params validation
      if (!loanId) return kParamMissing('loanId');
      if (!userId) return kParamMissing('userId');

      const attributes = ['createdAt'];
      const options = { where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      if (loanData == k500Error) return kInternalError;

      // Get log data
      const createdAt = loanData.createdAt;
      createdAt.setMinutes(createdAt.getMinutes() - 15);
      const logWhere = {
        loanId: null,
        stage: {
          [Op.or]: [
            'Basic Details verified',
            'Professional Details verified',
            'Employement submitted',
            'Workmail submitted',
            'Workmail Verified',
          ],
        },
        updatedAt: { [Op.gte]: createdAt },
        userId,
      };
      const updatedData = { loanId };
      await this.userLogTrackerRepo.updateWhereData(updatedData, logWhere);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region update paid waiver
  async paidWaiverUpdate(emiId, waiverData, activityId) {
    try {
      const emiData = await this.emiRepo.getRowWhereData(
        ['id', 'unpaid_waiver', 'paid_waiver'],
        { where: { id: emiId } },
      );
      if (!emiData || emiData == k500Error) return {};
      const paid_waiver = +(
        (emiData?.paid_waiver ?? 0) + (emiData?.unpaid_waiver ?? 0)
      ).toFixed(2);
      // //update waiver paid record
      const update = { paid_waiver, unpaid_waiver: 0 };
      const updatedEmi = await this.emiRepo.updateRowData(update, emiId);
      if (!updatedEmi || updatedEmi == k500Error) return {};
      // update waiver as paid_waiver
      if (updatedEmi[0] > 0) {
        waiverData.status = 'PAID';
        const update = {
          respons: JSON.stringify(waiverData),
          type: 'WAIVER_PAID',
        };
        await this.userActivityRepo.updateRowDataID(update, activityId);
      }
    } catch (err) {
      return k500Error;
    }
  }
  //#endregion

  //#region reverse wavier payment
  async reverseWaiverPayment(emiId, waiverData, activityId) {
    try {
      const emiData = await this.emiRepo.getRowWhereData(
        [
          'id',
          'emi_amount',
          'penalty',
          'regInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'dpdAmount',
          'penaltyChargesGST',
          'legalCharge',
          'legalChargeGST',
        ],
        { where: { id: emiId, payment_status: '0' } },
      );
      if (emiData == k500Error) return {};
      if (!emiData)
        return await this.paidWaiverUpdate(emiId, waiverData, activityId);
      //add amount to penalty and emi amount
      const emi_amount = +(
        +(waiverData?.emiAmount ?? 0) + (+emiData?.emi_amount ?? 0)
      ).toFixed(2);
      const penalty = +(
        (waiverData?.waiver_penalty ?? 0) + (+emiData?.penalty ?? 0)
      ).toFixed(2);
      const regInterestAmount =
        +(waiverData?.waiver_regIntAmount ?? 0) +
        +(emiData?.regInterestAmount ?? 0);
      const totalBounceCharge =
        +(waiverData?.waiver_bounce ?? 0) +
        +(emiData?.bounceCharge ?? 0) +
        +(emiData?.gstOnBounceCharge ?? 0);
      const totalPenalCharge =
        +(waiverData?.waiver_penal ?? 0) +
        +(emiData?.dpdAmount ?? 0) +
        (emiData?.penaltyChargesGST ?? 0);
      const totalLegalCharge =
        +(waiverData?.waiver_legal ?? 0) +
        +(emiData?.legalCharge ?? 0) +
        +(emiData?.legalChargeGST ?? 0);

      const bounceCharge = +(totalBounceCharge / 1.18).toFixed(2);
      const gstOnBounceCharge = +(totalBounceCharge - bounceCharge).toFixed(2);
      const dpdAmount = +(totalPenalCharge / 1.18).toFixed(2);
      const penaltyChargesGST = +(totalPenalCharge - dpdAmount).toFixed(2);
      const legalCharge = +(totalLegalCharge / 1.18).toFixed(2);
      const legalChargeGST = +(totalLegalCharge - legalCharge).toFixed(2);
      const updateData = {
        emi_amount,
        waived_principal: 0,
        waived_interest: 0,
        penalty,
        waived_penalty: 0,
        unpaid_waiver: 0,
        regInterestAmount,
        waived_regInterest: 0,
        bounceCharge,
        gstOnBounceCharge,
        waived_bounce: 0,
        dpdAmount,
        penaltyChargesGST,
        waived_penal: 0,
        legalCharge,
        legalChargeGST,
        waived_legal: 0,
      };
      const updatedEmi = await this.emiRepo.updateRowData(updateData, emiId);
      if (!updatedEmi || updatedEmi == k500Error) return {};
      //and update as paid reveserd waiver
      if (updatedEmi[0] > 0) {
        waiverData.status = 'REVERSED';
        const update = {
          respons: JSON.stringify(waiverData),
          type: 'WAIVER_REVERSED',
        };
        await this.userActivityRepo.updateRowDataID(update, activityId);
      }
      return {};
    } catch (error) {
      return {};
    }
  }
  //#endregion

  //#region migrate Unpaid waiver to Paid
  async migrateUnpaidWaiverToPaid() {
    try {
      const emiData = await this.emiRepo.getTableWhereData(
        ['id', 'unpaid_waiver', 'paid_waiver'],
        { where: { unpaid_waiver: { [Op.gt]: 0 } } },
      );
      if (emiData.length == 0) return [];
      for (let i = 0; i < emiData.length; i++) {
        try {
          const emi = emiData[i];
          const paid_waiver =
            (emi?.paid_waiver ?? 0) + (emi?.unpaid_waiver ?? 0);
          await this.emiRepo.updateRowData(
            { paid_waiver, unpaid_waiver: 0 },
            emi.id,
          );
        } catch (err) {}
      }
      return [];
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async funCheckWaiverPayment() {
    try {
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      //get active waiver details
      const att = ['id', 'type', 'loanId', 'userId', 'createdAt', 'respons'];
      const todaysWaiverData = await this.userActivityRepo.getTableWhereData(
        att,
        {
          where: { createdAt: { [Op.lte]: currentDate }, type: 'WAIVER' },
        },
      );
      if (todaysWaiverData == k500Error) return kInternalError;
      for (let i = 0; i < todaysWaiverData.length; i++) {
        try {
          const logs = todaysWaiverData[i];
          if (!logs?.respons) continue;
          const waiverData = JSON.parse(logs?.respons ?? '');
          const emiId = waiverData.emiId;
          //check aready reversed and paid_waiver
          if (waiverData?.status == 'REVERSED' || waiverData?.status == 'PAID')
            continue;
          const options = {
            where: {
              createdAt: { [Op.gte]: logs.createdAt },
              type: { [Op.ne]: 'REFUND' },
              status: 'COMPLETED',
              loanId: logs.loanId,
            },
          };
          // check transaction
          await this.sharedTransactions.checkCFOrder(logs.loanId, true);
          //check transaction after waiver
          const count = await this.transactionRepo.getCountsWhere(options);
          // //if payment not recived then revered waiver amount
          if (count > 0 && typeof count != 'string')
            await this.paidWaiverUpdate(emiId, waiverData, logs.id);
          else await this.reverseWaiverPayment(emiId, waiverData, logs.id);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  async getLocationByIp(ip) {
    try {
      let ipLocation;
      let ipCountry;
      if (ip) {
        const checkIpExist: any =
          await this.userSharedLogTrackerMiddleware.isIpExistInMaster(ip);
        if (checkIpExist?.message) return checkIpExist;
        if (checkIpExist && checkIpExist.status === 1) {
          let parseRes = checkIpExist?.response
            ? JSON.parse(checkIpExist?.response)
            : {};
          ipLocation = parseRes?.city;
          ipCountry = parseRes?.country?.toLowerCase();
        } else {
          const response = await this.APIService.get(
            nIpCheck + ip + '?key=' + nIpCheckerKey,
            { security: 1 },
            {},
            { timeout: 5000 },
          );
          let success = response?.success;
          let responseData;
          if (response === k500Error) {
            success = false;
            responseData = JSON.stringify({ response });
          } else {
            responseData = JSON.stringify(response);
          }
          ipLocation = response?.city;
          ipCountry = response?.country?.toLowerCase();
          let securityIssue = false;
          if (response?.security) {
            securityIssue = Object.values(response?.security).some(
              (value) => value === true,
            );
          }
          const updateData = {
            status: success ? 1 : 0,
            country: ipCountry,
            response: responseData,
            isSecurityIssue: securityIssue ? 1 : 0,
          };
          if (checkIpExist && checkIpExist.status === 0) {
            await this.ipMasterRepo.updateWhereData(updateData, {
              ip: checkIpExist.ip,
            });
          } else {
            const add = await this.ipMasterRepo.create({ ...updateData, ip });
          }
        }
      }
      return { ipCountry, ipLocation };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
