// Imports
import admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kNoDataFound,
  kParamMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import {
  kBankingRoute,
  kDashboardRoute,
  kNoBalance,
  kReferralChars,
  kAlreadyInitialized,
  kErrorMsgs,
} from 'src/constants/strings';
import { UserRepository } from 'src/repositories/user.repository';
import { Op, Sequelize } from 'sequelize';
import { getReferralPoints, ReferralStages } from 'src/constants/objects';
import { ReferralHistoryRepository } from 'src/repositories/referralHistory.repository';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { SharedNotificationService } from './services/notification.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { APIService } from 'src/utils/api.service';
import { nInitiateReferralWithdrawal } from 'src/constants/network';
import { gIsPROD, isUAT } from 'src/constants/globals';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { registeredUsers } from 'src/entities/user.entity';

let firebaseDB;

@Injectable()
export class ReferralSharedService {
  constructor(
    private readonly referralRepo: ReferralRepository,
    private readonly userRepo: UserRepository,
    private readonly referralHistoryRepo: ReferralHistoryRepository,
    private readonly referralTransRepo: ReferralTransactionRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly bankRepo: BankingRepository,
    private readonly emiRepo: EMIRepository,
    // Utils
    private readonly api: APIService,
    // Database
    private readonly repo: RepositoryManager,
  ) {
    if (gIsPROD || isUAT) firebaseDB = admin.firestore();
  }

  // create unique referral code
  async getUniqueReferralCode() {
    try {
      let uniqueCode;
      const checked: string[] = [];
      while (uniqueCode == undefined) {
        const checkList = this.getReferralCodeList(checked);
        const checkUnique: any = await this.checkReferralUniqueness(checkList);
        if (!checkUnique?.message) {
          if (!checkUnique) checked.push(...checkList);
          else uniqueCode = checkUnique;
        }
      }
      return uniqueCode;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // generate random referral codes
  getReferralCodeList(old?: string[]): string[] {
    const data = [];
    // generate 5 unique referral codes
    while (data.length < 5) {
      let referCode = '';
      for (let i = 0; i < 6; i++) {
        let charPos = Math.floor(Math.random() * (kReferralChars.length - 1));
        referCode += kReferralChars.charAt(charPos);
      }
      if (!data.includes(referCode) && !old?.includes(referCode))
        data.push(referCode);
    }
    return data;
  }

  // check if user exist with refer code
  private async checkReferralUniqueness(checkList: string[]) {
    const rawQuery = `SELECT "id" FROM "registeredUsers"
    WHERE "referralCode" IN ('${checkList.join("','")}')`;

    const outputList = await this.repo.injectRawQuery(
      registeredUsers,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();

    const uniqueIndex = checkList.findIndex(
      (str) => outputList.findIndex((refer) => refer !== str) == -1,
    );
    if (uniqueIndex !== -1) return checkList[uniqueIndex];
    return false;
  }

  // give referral points to referredBy user for signup, loan disbursement and loan repayment
  async addReferral(body) {
    try {
      const userId = body?.userId;
      const referredBy = body?.referredBy;
      const referralCode = body?.referralCode;
      const stage = body?.stage;
      const allStage = [1, 6, 16, 17];
      if (!userId) return kParamMissing('userId');
      if (!stage) return kParamMissing('stage');
      if (!allStage.includes(stage)) return kInvalidParamValue('stage');

      // Check referral flow is active or not (in firebase config)
      let referralFlowActive = false;
      let key = 'UAT_Lenditt';
      if (gIsPROD) key = 'PROD_Lenditt';
      const template = (
        await firebaseDB.collection('APP_CONFIG_DATA').doc(key).get()
      ).data();

      const REFER_AND_EARN_FLOW = template?.REFER_AND_EARN_FLOW ?? false;

      if (REFER_AND_EARN_FLOW == true) referralFlowActive = true;

      if (referralFlowActive == false)
        return k422ErrorMessage(kErrorMsgs.SERVICE_UNAVAILABLE);
      if (stage === ReferralStages.SIGNUP) {
        if (!referralCode) return kParamMissing('referralCode');
        if (!referredBy) return kParamMissing('referredBy');
        const checkRefer = await this.userRepo.getRowWhereData(
          ['referredBy', 'referralId'],
          { where: { id: userId } },
        );
        if (checkRefer === k500Error) return kInternalError;
        if (checkRefer?.referredBy || checkRefer?.referralId)
          return k422ErrorMessage('Already registered user!');
        const referralData: any = {
          referredBy,
          referredTo: userId,
          time: new Date().getTime(),
          stage,
          points: 0,
          referralCode,
        };
        const createReferral = await this.referralRepo.createRowData(
          referralData,
        );
        if (createReferral === k500Error) return kInternalError;
        const referralId = createReferral.id;
        referralData.referralId = referralId;
        const createHisReferral = await this.referralHistoryRepo.createRowData(
          referralData,
        );
        if (createHisReferral === k500Error) return kInternalError;
        const update = await this.userRepo.updateRowData(
          { referredBy, referralId },
          userId,
        );
        if (update === k500Error) return kInternalError;
        return update;
      } else {
        const masterInc: any = {
          model: MasterEntity,
          attributes: ['id'],
          where: {},
        };
        const option: any = {
          where: {
            id: userId,
            completedLoans: 0,
            referralId: { [Op.ne]: null },
          },
          include: [masterInc],
        };
        if (stage === ReferralStages.AADHAAR)
          masterInc.where.status = { aadhaar: 1 };
        else if (
          stage === ReferralStages.LOAN_ACTIVE ||
          stage === ReferralStages.LOAN_COMPLETE
        ) {
          const loanId = body?.loanId;
          if (!loanId) return kParamMissing('loanId');
          let loanStatus;
          if (stage === ReferralStages.LOAN_ACTIVE) loanStatus = 6;
          if (stage === ReferralStages.LOAN_COMPLETE) loanStatus = 7;
          masterInc.where.status = { loan: loanStatus };
          masterInc.where.loanId = loanId;
        }
        const userData = await this.userRepo.getRowWhereData(
          ['referralId'],
          option,
        );
        if (userData === k500Error) return kInternalError;
        if (!userData) return {};
        return await this.updateReferral(userData.referralId, stage);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateReferral(referralId, stage) {
    try {
      const points: any = getReferralPoints(stage);
      const referralData = await this.referralRepo.getRowWhereData(null, {
        where: { id: referralId },
      });
      if (referralData === k500Error) return kInternalError;
      if (!referralData) return kNoDataFound;
      const userId = referralData?.referredBy;
      const time = new Date().getTime();
      delete referralData.id;
      delete referralData.createdAt;
      delete referralData.updatedAt;
      const refHistory = await this.referralHistoryRepo.createRowData({
        ...referralData,
        referralId,
        points,
        stage,
        time,
      });
      if (refHistory === k500Error) return kInternalError;
      const referralUpdate = await this.referralRepo.updateRowData(
        { stage, points: points + (referralData?.points ?? 0) },
        referralId,
      );
      if (referralUpdate === k500Error) return kInternalError;

      // add referral points to referredBy user
      const userData = await this.userRepo.getRowWhereData(['referralPoints'], {
        where: { id: userId },
      });
      if (userData === k500Error) return kInternalError;
      if (!userData) return kNoDataFound;
      const updated = await this.userRepo.updateRowData(
        { referralPoints: (userData?.referralPoints ?? 0) + points },
        userId,
      );
      if (updated === k500Error) return kInternalError;
      const title = 'Referral Points Credited';
      const content = `Dear Customer, your friend has successfully used your referral code to loan process. As promised, we’ve credited Rs.${points} to your wallet. You can withdraw these points anytime.`;
      const body = {
        userList: [userId],
        content,
        title,
        message: content,
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // check And Place Referral Withdraw
  async placeReferralWithdraw(body) {
    try {
      const userId = body?.userId;
      const amount = body?.amount ? Math.round(body?.amount) : body?.amount;
      if (!userId) return kParamMissing('userId');
      if (!amount) return kParamMissing('amount');
      if (amount < 100)
        return k422ErrorMessage('Minimum withdrawal amount is Rs.100 !');

      // Check defaulter user
      const emiOps = {
        where: { userId, payment_due_status: '1', payment_status: '0' },
      };
      const defaulter = await this.emiRepo.getRowWhereData(['loanId'], emiOps);
      if (defaulter === k500Error) return kInternalError;
      if (defaulter) {
        return k422ErrorMessage(
          `Complete your loan ${defaulter?.loanId ?? ''}!`,
        );
      }

      const kycInc = {
        model: KYCEntity,
        attributes: ['aadhaarAddress', 'aadhaarAddressResponse'],
      };
      const attr = ['id', 'fullName', 'phone', 'email', 'referralPoints'];
      const options = { where: { id: userId }, include: [kycInc] };
      const userData: any = await this.userRepo.getRowWhereData(attr, options);
      if (userData === k500Error) return kInternalError;
      const balance = userData?.referralPoints ?? 0;
      if (balance < amount) return k422ErrorMessage(kNoBalance);
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
      ];
      const opts = { where: { referredBy: userId } };
      const totalEarn = await this.referralRepo.getRowWhereData(att, opts);
      if (totalEarn === k500Error) return kInternalError;
      const totalEarning = +(totalEarn?.totalPoints ?? 0);
      const tranData: any = await this.checkTransactionData(userId);
      if (tranData?.message) return tranData;
      const withdrawAmt = tranData.withdrawAmt + amount;
      const isInitialized = tranData.isInitialized;
      if (isInitialized) return k422ErrorMessage(kAlreadyInitialized);
      if (totalEarning < withdrawAmt) return k422ErrorMessage(kNoBalance);
      const bankAttr = [
        'disbursementAccount',
        'disbursementBank',
        'disbursementIFSC',
        'accountNumber',
        'ifsCode',
        'bank',
      ];
      const bankOpt = { where: { userId }, order: [['id', 'DESC']] };
      const bankData = await this.bankRepo.getRowWhereData(bankAttr, bankOpt);
      if (bankData === k500Error) return kInternalError;
      if (!bankData) {
        return {
          userData: {},
          referralFlow: true,
          continueRoute: kBankingRoute,
          rootRoute: kDashboardRoute,
        };
      }

      userData.bankData = bankData;
      userData.amount = amount;
      const initialized: any = await this.initializedReferral(userData);
      if (initialized?.message) return initialized;
      return initialized;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // check total and INITIALIZED referral transactions
  private async checkTransactionData(userId) {
    try {
      const att = ['id', 'amount', 'status'];
      const options = { where: { status: [0, 1], userId } };
      const tranData = await this.referralTransRepo.getTableWhereData(
        att,
        options,
      );
      if (tranData === k500Error) return kInternalError;
      let withdrawAmt = 0;
      let isInitialized = false;
      tranData.forEach((tra) => {
        try {
          const amount = parseFloat((tra.amount / 100).toFixed(2));
          const status = tra.status;
          if (status == 0) isInitialized = true;
          if (status == 1) withdrawAmt += amount;
        } catch (error) {}
      });
      return { withdrawAmt, isInitialized };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Referral payout
  private async initializedReferral(reqData) {
    // Prepare data
    const bankData = reqData?.bankData ?? {};
    const userId = reqData.id;
    const amount = parseFloat((reqData.amount * 100).toFixed(2));

    // Initiate payout request to schedular server
    const response = await this.api.requestPost(
      nInitiateReferralWithdrawal,
      reqData,
    );
    if (response == k500Error) return kInternalError;
    if (response.valid == false && response.message) return response;
    if (!response?.data?.isInitialized) return kInternalError;

    // Notify user about payout initialization
    const accountNumber =
      bankData.disbursementAccount ?? bankData.accountNumber;
    const points = parseFloat(((amount ?? 0) / 100).toFixed(2));
    const stLength = accountNumber.length - 4;
    const acno =
      'xxxxxx' + accountNumber.substring(stLength, accountNumber.length);
    const sMsg = 'Withdraw successfully initialized!';
    const content = `Your withdraw Rs.${points} successfully initialized. Your reward will be transferred to your linked account ${acno} within 24 hours.`;
    const body = {
      userList: [userId],
      content,
      title: sMsg,
      message: content,
    };
    await this.sharedNotification.sendNotificationToUser(body);
    return kSUCCESSMessage(sMsg, { message: sMsg });
  }
}
