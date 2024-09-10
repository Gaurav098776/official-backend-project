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
} from 'src/constants/responses';
import { Op, Sequelize } from 'sequelize';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { CryptService } from 'src/utils/crypt.service';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { ReferralHistoryRepository } from 'src/repositories/referralHistory.repository';
import { TypeService } from 'src/utils/type.service';
import {
  ReferralStages,
  getReferralPoints,
  shortMonth,
} from 'src/constants/objects';
import { BankingRepository } from 'src/repositories/banking.repository';
import {
  kBankingRoute,
  kDashboardRoute,
  kErrorMsgs,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kInvalidReferCode,
  kWithdrawalTag,
} from 'src/constants/strings';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { gIsPROD, isUAT } from 'src/constants/globals';
let firebaseDB;
@Injectable()
export class ReferralServiceV4 {
  constructor(
    private readonly repository: ReferralRepository,
    private readonly referralHistoryRepo: ReferralHistoryRepository,
    private readonly referralTransRepo: ReferralTransactionRepository,
    private readonly sharedReferral: ReferralSharedService,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly selfieRepo: UserSelfieRepository,
    private readonly userRepo: UserRepository,
    private readonly bankRepo: BankingRepository,
  ) {
    if (gIsPROD || isUAT) firebaseDB = admin.firestore();
  }

  // check referral code is available or not(code validation)
  async checkReferralCode(body) {
    try {
      const code = body?.code;
      if (code && code.length != 6) return k422ErrorMessage(kInvalidReferCode);
      const skip = body?.skip == true ? true : false;
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      if (code) {
        // Check if service is available
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

        const referredByUser = await this.userRepo.getRowWhereData(['id'], {
          where: { referralCode: code },
        });

        if (referredByUser === k500Error) return kInternalError;
        if (!referredByUser) return k422ErrorMessage(kInvalidReferCode);
        const referredBy = referredByUser?.id;
        if (referredBy == userId) return k422ErrorMessage(kInvalidReferCode);
        const refer = {
          userId,
          referredBy,
          stage: ReferralStages.SIGNUP,
          referralCode: code,
        };
        const addReferral: any = await this.sharedReferral.addReferral(refer);
        if (addReferral?.message) return addReferral;
        return { needUserInfo: true, referralApplied: true };
      } else if (skip)
        await this.userRepo.updateRowData({ referralSkip: skip }, userId);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get referral history of userId
  async getReferralData(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      // get referral history data
      const attributes = ['points', 'referredTo', 'time', 'stage'];
      const options = {
        where: { referredBy: userId },
        order: [['id', 'DESC']],
      };
      const referralHistory = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (referralHistory === k500Error) return kInternalError;
      // get referred users data
      const userIds: string[] = referralHistory.map((i) => i.referredTo);
      const userAttrs = ['id', 'phone', 'fullName', 'selfieId'];
      const userOpts = { where: { id: userIds } };
      const usersData = await this.userRepo.getTableWhereData(
        userAttrs,
        userOpts,
      );
      if (usersData === k500Error) return kInternalError;
      // filtering users with having selfie id and get selfie id
      const selfieIds: number[] = usersData
        .filter((i) => i.selfieId)
        .map((i) => i.selfieId);

      // get selfie data by selfie id
      const selfieAttrs = ['image', 'userId'];
      const selfieOpts = { where: { id: selfieIds, image: { [Op.ne]: null } } };
      const selfieData = await this.selfieRepo.getTableWhereData(
        selfieAttrs,
        selfieOpts,
      );
      if (selfieData === k500Error) return kInternalError;
      // prepare referral data
      const referralData = [];
      for (let i = 0; i < referralHistory.length; i++) {
        try {
          const referral = referralHistory[i];
          const user = usersData.find((i) => i?.id === referral?.referredTo);
          const selfie = selfieData.find(
            (i) => i?.userId === referral?.referredTo,
          );
          if (!user) continue;
          const userId = user?.id;
          const phone = this.cryptService.decryptPhone(user?.phone);
          const points = referral?.points ?? 0;
          const lastStage = Object.keys(ReferralStages).find(
            (key) => ReferralStages[key] === referral?.stage,
          );

          const fullName = user?.fullName ?? '-';
          const image = selfie?.image;
          let date: any = new Date(+referral.time) ?? '';
          if (date)
            date = date.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          const obj = {
            userId,
            image,
            fullName,
            phone,
            date,
            points,
            lastStage,
          };
          referralData.push(obj);
        } catch (error) {}
      }
      return referralData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get total referral amount and balance
  async referralAmountBalance(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');

      // total earning
      const att: any = [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
        [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
      ];
      const opts = { where: { referredBy: userId } };
      const totalEarn = await this.repository.getRowWhereData(att, opts);
      if (totalEarn === k500Error) return kInternalError;
      const totalEarning = +(totalEarn?.totalPoints ?? 0);
      const totalCount = +(totalEarn?.totalCount ?? 0);
      // available balance
      const userOpt = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(
        ['referralPoints'],
        userOpt,
      );
      if (userData === k500Error) return kInternalError;
      const balance = +(userData?.referralPoints ?? 0);
      const options = { where: { status: 0, userId } };
      const tranData = await this.referralTransRepo.getRowWhereData(
        ['id', 'accountNumber'],
        options,
      );
      if (tranData === k500Error) return kInternalError;
      let referralInfo;
      if (tranData) {
        let acNo = tranData?.accountNumber ?? '';
        const stLength = acNo.length - 4;
        acNo =
          'xxxxxx' + tranData?.accountNumber.substring(stLength, acNo.length);
        referralInfo = kWithdrawalTag.replace('XXXX', acNo);
      }
      const data: any = { totalCount, totalEarning, balance };
      if (referralInfo) data.referralInfo = referralInfo;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get all referral points activity graph
  async referralActivity(query) {
    try {
      const userId = query?.userId;
      const filter = query?.filter ?? 'MONTH';
      if (!userId) return kParamMissing('userId');

      let startDate = new Date();
      let endDate = new Date();
      if (filter == 'DAY') startDate.setDate(1);
      else if (filter == 'MONTH') {
        startDate.setMonth(0);
        startDate.setDate(1);
      } else if (filter != 'YEAR') return kInvalidParamValue('filter');
      const range = this.typeService.getUTCDateRange(
        startDate.toJSON(),
        endDate.toJSON(),
      );
      const fKey = filter.toLowerCase();
      const commonOpts = this.referralFilterOpts(fKey);
      const attribtues = commonOpts?.attribtues;
      const group = commonOpts?.group;
      let createdAt = {};
      if (filter == 'YEAR') createdAt = { [Op.lte]: range.endDate };
      else createdAt = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const options: any = { where: { referredBy: userId, createdAt }, group };
      const totalEarn: any = await this.referralHistoryRepo.getTableWhereData(
        attribtues,
        options,
      );
      if (totalEarn === k500Error) return kInternalError;
      totalEarn.sort((a, b) => a[fKey] - b[fKey]);

      let length = 0;
      let ago5Years = 0;
      if (filter == 'DAY') {
        length = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0,
        ).getDate();
      } else if (filter == 'MONTH') length = shortMonth.length;
      else if (filter == 'YEAR') {
        ago5Years = new Date(
          startDate.setFullYear(startDate.getFullYear() - 5),
        ).getFullYear();
        length = 6;
      }
      const recordData = [];
      let totalAmt = 0;
      for (let index = 0; index < length; index++) {
        try {
          let obj = { key: '', totalCount: 0, totalPoints: 0 };
          let record: any = {};
          if (filter == 'DAY') {
            record = totalEarn.find((f) => f[fKey] == index + 1);
            obj.key = record ? record[fKey] : index + 1;
          } else if (filter == 'MONTH') {
            record = totalEarn.find((f) => f[fKey] == index + 1);
            obj.key = shortMonth[index];
          } else if (filter == 'YEAR') {
            const year = ago5Years + index;
            record = totalEarn.find((f) => f[fKey] == year);
            obj.key = record ? record[fKey] : year;
          }
          obj.totalCount = +(record?.totalCount ?? 0);
          obj.totalPoints = +(record?.totalPoints ?? 0);
          totalAmt += obj.totalPoints;
          recordData.push(obj);
        } catch (error) {}
      }
      if (filter == 'YEAR') length--;
      const average = Math.round(totalAmt / length);
      return { recordData, average };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  referralFilterOpts(filter) {
    try {
      const group = [
        this.typeService.manageDateAttr(filter, '"ReferralHistoryEntity".'),
      ];
      const attribtues: any = [
        this.typeService.manageDateAttr(filter, '"ReferralHistoryEntity".'),
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCount'],
        [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
      ];
      return { attribtues, group };
    } catch (error) {
      return {};
    }
  }

  // get all referral points Withdraw
  async referralWithdraw(body) {
    try {
      const userId = body?.userId;
      const amount: number = body?.amount;
      if (!userId) return kParamMissing('userId');
      if (!amount) return kParamMissing('amount');
      const attribtues = ['id', 'referralPoints'];
      const options: any = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attribtues, options);
      if (userData === k500Error) return kInternalError;

      // Check referral flow is active or not (in firebase config)
      let referralFlowActive = false;
      let key = 'UAT_Lenditt';
      if (gIsPROD) key = 'PROD_Lenditt';
      const template = (
        await firebaseDB.collection('APP_CONFIG_DATA').doc(key).get()
      ).data();

      const REFER_WALLET_FLOW: any = template?.REFER_WALLET_FLOW ?? false;
      if (REFER_WALLET_FLOW == true) referralFlowActive = true;
      if (referralFlowActive == false)
        return k422ErrorMessage(kErrorMsgs.SERVICE_UNAVAILABLE);

      const balance = +(userData?.referralPoints ?? 0);
      if (balance < amount)
        return k422ErrorMessage(`Wallet balance is Rs. ${balance}!`);
      const bankAttr = ['id', 'accountNumber', 'ifsCode', 'bank'];
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

      const data = { userId, amount };
      return await this.sharedReferral.placeReferralWithdraw(data);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get top referral users
  async getTopReferralData(reqData: any) {
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');
    try {
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
        'referredBy',
      ];
      const opts = { where: { points: { [Op.gt]: 0 } }, group: ['referredBy'] };
      let topUsers = await this.repository.getTableWhereData(att, opts);
      if (topUsers === k500Error) return kInternalError;
      if (!topUsers) return kNoDataFound;
      topUsers = topUsers.sort((a, b) => +b.totalPoints - +a.totalPoints);
      for (let index = 0; index < 3; index++) {
        try {
          const ele = topUsers[index];
          const userId = ele.referredBy;
          const selfieInc = { model: UserSelfieEntity, attributes: ['image'] };
          const uOps = { where: { id: userId }, include: [selfieInc] };
          const user = await this.userRepo.getRowWhereData(['fullName'], uOps);
          if (user === k500Error) continue;
          ele.fullName = user?.fullName;
          ele.image = user?.selfieData?.image;
        } catch (error) {}
      }
      const bannerData = await this.getReferralBannerData(reqData);
      return { topUsers, bannerData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get referral bonus points, title and description banner data
  async getReferralBannerData(reqData) {
    try {
      const userId = reqData?.userId;
      const userData: any = await this.userRepo.getRowWhereData(
        ['id', 'appType'],
        {
          where: { id: userId },
        },
      );
      const appName =
        userData?.appType == 1 ? kInfoBrandNameNBFC : kInfoBrandName;
      const banners = [];
      for (const key in ReferralStages) {
        try {
          const points = getReferralPoints(ReferralStages[key]);
          if (points == 0) continue;

          let desc = '';
          let title = '';
          if (key == 'AADHAAR') {
            title = `Earn flat ##*₹${25}*##`;
            desc = `When your friend register with KYC on ${appName} App.`;
          } else if (key == 'LOAN_ACTIVE') {
            title = `Earn upto ##*₹${50}*##`;
            desc = `When your friend get a first loan from ${appName} App.`;
          } else if (key == 'LOAN_COMPLETE') {
            title = `Earn upto ##*₹${100}*##`;
            desc = `When your friend complete the first loan re-payment of ${appName}.`;
          }

          banners.push({ title, desc });
        } catch (error) {}
      }
      return banners;
    } catch (error) {
      return [];
    }
  }
}
