// Imports
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { Inject, Injectable } from '@nestjs/common/decorators';
import { CrmRepository } from 'src/repositories/crm.repository';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import { registeredUsers } from 'src/entities/user.entity';
import {
  DEMO_DETAILS,
  isUAT,
  legalString,
  MAX_BEARING_LIMIT,
  MAX_LAT_LIMIT,
  PAGE_LIMIT,
  SETTLEMENT_DESABLE,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { LoanRepository } from 'src/repositories/loan.repository';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { loanTransaction } from 'src/entities/loan.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { CryptService } from 'src/utils/crypt.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';
import { BankingRepository } from 'src/repositories/banking.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import {
  KLspSupportMail,
  kAutoDebit,
  kCalBySystem,
  kChangeFollowerId,
  kCompleted,
  kFailed,
  kFullPay,
  kInitiated,
  kLspNoReplyMail,
  kNoReplyMail,
  kQa,
  kRefund,
  kRuppe,
  kSigndesk,
  kSupportMail,
  kTCollectionSummary,
  kfinvu,
  nbfcInfoStr,
} from 'src/constants/strings';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { BankingEntity } from 'src/entities/banking.entity';
import { crmActivity } from 'src/entities/crm.entity';
import { AAEntity } from 'src/entities/aggregator.entity';
import { DateService } from 'src/utils/date.service';
import { MasterEntity } from 'src/entities/master.entity';
import { FileService } from 'src/utils/file.service';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { StringService } from 'src/utils/string.service';
import { CommonService } from 'src/utils/common.service';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { SequelOptions } from 'src/interfaces/include.options';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import * as fs from 'fs';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { EMIService } from '../emi/emi.service';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { kPromiseToPayTemplate } from 'src/constants/directories';
import { employmentDetails } from 'src/entities/employment.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { forwardRef } from '@nestjs/common';
import { FinvuService } from 'src/thirdParty/finvu/finvu.service';
import { IsUUID } from 'sequelize-typescript';
import { EnvConfig } from 'src/configs/env.config';
import { UserService } from '../user/user.service';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { CallingService } from '../calling/calling.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { LocationEntity } from 'src/entities/location.entity';

const ptpCrmIds = [44, 80, 81];

let gActiveCollectionExecutives = [];

@Injectable()
export class DefaulterService {
  constructor(
    private readonly bankingRepo: BankingRepository,
    @Inject(forwardRef(() => CamsServiceThirdParty))
    private readonly camsService: CamsServiceThirdParty,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly crmRepo: CrmRepository,
    private readonly dateService: DateService,
    private readonly fileService: FileService,
    private readonly loanRepo: LoanRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly adminRepo: AdminRepository,
    private readonly emiRepo: EMIRepository,
    private readonly userRepo: UserRepository,
    private readonly locationRepo: LocationRepository,
    private readonly cryptService: CryptService,
    private readonly commonService: CommonSharedService,
    private readonly typeService: TypeService,
    private readonly selfieRepo: UserSelfieRepository,
    private readonly callingService: CallingService,
    private readonly defualterOnlineRepo: DefaulterOnlineRepository,
    // Admin services
    private readonly emiService: EMIService,
    private readonly userService: UserService,
    // Repositories
    private readonly legalCollectionRepo: LegalCollectionRepository,
    private readonly userActivityRepo: UserActivityRepository,
    // Shared services
    private readonly calculcation: CalculationSharedService,
    private readonly sharedTransaction: SharedTransactionService,
    // Utils services
    private readonly strService: StringService,
    private readonly common: CommonService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly staticConfigRepo: StaticConfigRepository,
    // Third party Services
    private readonly finvuService: FinvuService,
    // Database
    private readonly repo: RepositoryManager,
  ) {}

  async getPTPReminders(reqData) {
    const crmList: any = await this.getDataForPTPReminders(reqData);

    const finalizedData: any = [];
    for (let index = 0; index < crmList.length; index++) {
      try {
        const element = crmList[index];
        let settlementData: any = element?.settlementData;

        let amount = 0;
        const dueAmount = await this.getDueAmount(element.loanId);
        if (settlementData) {
          settlementData = JSON.parse(settlementData);
          const signlSettlement = settlementData.findIndex(
            (ele) => ele?.ptpStatus == '0' || !ele?.ptpStatus,
          );
          if (signlSettlement != -1)
            amount = settlementData[signlSettlement].amount;
        } else amount = element.amount;

        finalizedData.push({
          id: element.id,
          userId: element.userId,
          amount,
          totalAmount: dueAmount,
          userName: element.fullName,
        });
      } catch (error) {
        console.log({ error });
      }
    }
    return finalizedData;
  }

  private async getDueAmount(loanId) {
    try {
      const loanData = await this.loanRepo.getRowWhereData(['id'], {
        where: { id: loanId },
        include: [
          {
            required: false,
            model: TransactionEntity,
            attributes: ['id', 'paidAmount', 'emiId', 'type'],
            where: {
              status: 'COMPLETED',
              type: { [Op.ne]: 'REFUND' },
              penaltyAmount: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: 0 }] },
            },
          },
          {
            model: EmiEntity,
            attributes: [
              'payment_status',
              'payment_due_status',
              'principalCovered',
              'interestCalculate',
              'penalty',
              'id',
            ],
          },
        ],
      });
      if (!loanData || loanData == k500Error) return 0;
      const transactionData: any = loanData?.transactionData ?? [];
      const emiData: any = loanData?.emiData;
      let totalPaidAmount: any = 0;
      let totalDueAmount: any = 0;
      for (let i = 0; i < emiData.length; i++) {
        try {
          const emi = emiData[i];
          if (emi.payment_status == '0' && emi.payment_due_status == '1') {
            const emiTra = transactionData.filter((ele) => ele.emiId == emi.id);
            const emiAmount =
              (emi?.principalCovered ?? 0) + (emi?.interestCalculate ?? 0);
            const penalty = emi?.penalty ?? 0;
            totalDueAmount += emiAmount + penalty;
            emiTra.forEach((element) => {
              totalPaidAmount += element?.paidAmount ?? 0;
            });
          }
        } catch (error) {}
      }
      return Math.floor(totalDueAmount - totalPaidAmount);
    } catch (error) {
      return 0;
    }
  }

  private async getDataForPTPReminders(reqData: any) {
    const adminId = reqData.adminId;
    if (!adminId) return kParamMissing('adminId');

    const maxDate = new Date();
    const minDate = new Date();
    minDate.setHours(minDate.getHours() - 3);

    let whereStr = '';
    if (SETTLEMENT_DESABLE) whereStr = `AND "settlementData" IS NULL`;

    const rawQuery = `SELECT "user"."fullName", "crmActivities"."id", "userId", "adminId", "crmActivities"."createdAt", "crmActivities"."amount",
    "crmActivities"."due_date", "crmActivities"."relationData", "crmActivities"."loanId", "crmActivities"."settlementData"
    FROM "crmActivities"
    INNER JOIN "registeredUsers" AS "user" ON "user"."id" = "crmActivities"."userId"
    WHERE "adminId" = '${adminId}' AND ("ptpStatus" IS NULL OR "ptpStatus" = 'false')
    AND "due_date" >= '${minDate.toJSON()}' AND "due_date" <= '${maxDate.toJSON()}'
    AND "amount" IS NOT NULL ${whereStr}
    ORDER BY "crmActivities"."id" DESC`;
    const outputList = await this.repo.injectRawQuery(crmActivity, rawQuery, {
      source: 'REPLICA',
    });
    if (outputList == k500Error) throw new Error();

    return outputList;
  }

  async updatePTPReminders(reqData: any) {
    try {
      const id = reqData.crmId;
      if (!id) return kParamMissing('crmId');

      const getPTPcrm: any = await this.crmRepo.getRowWhereData(
        ['settlementData'],
        { where: { id } },
      );
      if (!getPTPcrm) return k422ErrorMessage('CRM not found');
      if (getPTPcrm == k500Error) return kInternalError;

      const updateData: any = {};
      if (getPTPcrm.settlementData) {
        const settlementData: any = JSON.parse(getPTPcrm?.settlementData);
        const signlSettlement = settlementData.findIndex((ele) => {
          return ele?.ptpStatus == '0' || !ele?.ptpStatus;
        });
        if (signlSettlement != -1) {
          settlementData[signlSettlement].ptpStatus = '1';
          if (signlSettlement + 1 < settlementData?.length) {
            const upcoming = settlementData[signlSettlement + 1];
            updateData.due_date = upcoming.due_date;
          } else updateData.ptpStatus = true;
          updateData.settlementData = JSON.stringify(settlementData);
        } else updateData.ptpStatus = true;
      } else updateData.ptpStatus = true;

      const updateResponse = await this.crmRepo.updateRowData(updateData, id);
      if (updateResponse == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //Defaulter Location
  async findDefaulterUserLocation(query) {
    try {
      const delayDay = query?.delayDay;
      const id = query?.userId;
      const where: any = {};
      where.payment_due_status = '1';
      if (delayDay) {
        where.payment_status = '0';
        where.penalty_days = { [Op.lt]: delayDay };
      }
      if (id) where.userId = id;

      const options: any = { where, group: ['userId'] };
      const emiAttr = ['userId'];
      const userList: any = await this.emiRepo.getTableWhereData(
        emiAttr,
        options,
      );
      if (userList === k500Error) return kInternalError;

      const tempData: any = {};
      const userData: any = [];
      for (let i = 0; i < userList.length; i++) {
        try {
          if (isUAT && i % 100 === 0) console.log('defaulter location', i);
          const userId = userList[i]?.userId;
          const locationData: any = await this.findNearestUser({ userId });
          if (locationData?.message) continue;
          tempData[userId] = locationData.defaulter;
          for (let j = 0; j < locationData.normalUser.length; j++) {
            try {
              if (!tempData[userId]) {
                const id = locationData.normalUser[j].userId;
                const normalUserData: any = await this.findNearestUser({
                  userId: id,
                });
                if (!normalUserData?.message)
                  tempData[id] = normalUserData.defaulter;
              }
            } catch (error) {}
          }
        } catch (error) {}
      }

      const value: any = Object.values(tempData);
      const key: any = Object.keys(tempData);
      const unique = value.filter((item, i, ar) => ar.indexOf(item) === i);

      const result = key.map((ele) => ({
        id: ele,
        count: tempData[ele],
      }));

      unique.forEach((item) => {
        userData.push({
          id: result.filter((d) => d.count === item).map((d) => d.id),
          count: item,
        });
      });
      await this.updateData(userData);
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateData(userData) {
    try {
      for (let i = 0; i < userData.length; i++) {
        try {
          const defaulterCount = userData[i].count;
          await this.userRepo.updateRowData({ defaulterCount }, userData[i].id);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region find nearest user
  async findNearestUser(query) {
    const userId = query?.userId;
    if (!userId) return kParamMissing('userId');
    if (!IsUUID(userId)) return kInvalidParamValue('userId');

    const onlyCount = query?.onlyCount ?? false;
    const data = { defaulter: 0, normal: 0, defaulterUser: [], normalUser: [] };
    try {
      const rawQuery = `SELECT "bearing", "id", "lat", "long"
      FROM "LocationEntities" 
      WHERE "userId" = '${userId}'`;
      const outputList = await this.repo.injectRawQuery(
        LocationEntity,
        rawQuery,
        { source: 'REPLICA' },
      );
      if (outputList == k500Error) throw new Error();

      const rowData = this.removeClosestDuplicates(outputList);
      return await this.getNearestByAllLocations(rowData, userId, onlyCount);
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region remove close duplicate
  private removeClosestDuplicates(locations) {
    const accurateLocations = [];
    try {
      for (let index = 0; index < locations.length; index++) {
        try {
          const locationData = locations[index];
          const isAdded = accurateLocations.find((element) => {
            const lat = parseFloat(element.lat);
            const difference = Math.abs(lat - parseFloat(locationData.lat));
            return difference <= MAX_LAT_LIMIT;
          });
          if (!isAdded) accurateLocations.push(locationData);
        } catch (erorr) {}
      }
    } catch (error) {}
    return accurateLocations;
  }
  //#endregion

  //#region  git data from db
  private async getNearestByAllLocations(
    locations,
    userId: string,
    onlyCount: any = false,
  ) {
    const data = { defaulter: 0, normal: 0, defaulterUser: [], normalUser: [] };
    try {
      const tempArray = [];
      for (let index = 0; index < locations.length; index++) {
        try {
          const location = locations[index];
          const maxBearingLimit = location.bearing + MAX_BEARING_LIMIT;
          const minBearingLimit = location.bearing - MAX_BEARING_LIMIT;
          const maxLat = (parseFloat(location.lat) + MAX_LAT_LIMIT).toString();
          const minLat = (parseFloat(location.lat) - MAX_LAT_LIMIT).toString();
          tempArray.push({
            bearing: { [Op.lte]: maxBearingLimit, [Op.gte]: minBearingLimit },
            lat: { [Op.lte]: maxLat, [Op.gte]: minLat },
          });
        } catch (error) {}
      }

      const att = ['userId', 'location', 'lat', 'long', 'bearing'];
      const orp = {
        where: { [Op.or]: tempArray, userId: { [Op.ne]: userId } },
      };
      const result = await this.locationRepo.getTableWhereData(att, orp);
      if (!result || result === k500Error) return data;
      const userList = [];
      result.forEach((ele) => {
        try {
          if (!userList.includes(ele.userId)) userList.push(ele.userId);
        } catch (error) {}
      });
      if (userList.length > 0) {
        if (onlyCount == 'true')
          return await this.getCountOfNeraestUser(userList);
        else {
          const options = {
            where: { id: userList },
            include: [
              {
                model: EmiEntity,
                attributes: ['payment_due_status', 'penalty_days'],
              },
            ],
          };
          const att1 = ['id', 'fullName'];
          const userData = await this.userRepo.getTableWhereData(att1, options);
          if (!userData || userData === k500Error) return data;
          for (let index = 0; index < userData.length; index++) {
            try {
              const user = userData[index];
              const userLocation = result.find((f) => f.userId === user.id);
              if (user?.emiData)
                user?.emiData.sort(
                  (a, b) => (b?.penalty_days ?? -1) - (a?.penalty_days ?? -1),
                );
              const find = user?.emiData.find(
                (f) => (f?.payment_due_status ?? '') === '1',
              );
              userLocation.fullName = user?.fullName;
              const dueDay = find?.penalty_days ?? 0;
              if (find) {
                userLocation.status = dueDay > 5 ? 'DEFAULTER' : 'DELAY';
                userLocation.dueDay = dueDay;
                data.defaulter += 1;
                data.defaulterUser.push(userLocation);
              } else {
                userLocation.status = 'NORMAL';
                userLocation.dueDay = dueDay;
                data.normal += 1;
                data.normalUser.push(userLocation);
              }
            } catch (error) {}
          }
        }
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get count of neraest user
  private async getCountOfNeraestUser(userId) {
    const data = { total: 0, defaulter: 0, normal: 0 };
    try {
      const options = {
        where: { userId, payment_due_status: '1' },
        group: ['userId'],
      };
      const att = ['userId'];
      const result = await this.emiRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return data;
      userId.forEach((ele) => {
        try {
          const find = result.find((f) => f.userId === ele);
          if (find) data.defaulter += 1;
          else data.normal += 1;
          data.total += 1;
        } catch (error) {}
      });
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region getDefaulterAssign
  async getDefaulterAssign() {
    try {
      const options = {
        where: { followerId: { [Op.ne]: null }, loanStatus: 'Active' },
        group: ['followerId'],
      };
      const att = ['followerId'];
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      const adminList = [];
      result.forEach((ele) => {
        try {
          adminList.push(ele.followerId);
        } catch (error) {}
      });

      const adminOpti = { where: { id: adminList }, order: [['id']] };
      const adminAtt = ['id', 'fullName'];
      const adminData = await this.adminRepo.getTableWhereData(
        adminAtt,
        adminOpti,
      );
      if (!adminData || adminData === k500Error) return kInternalError;
      return adminData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get defaulter details
  async getDefaulterDetails(query) {
    try {
      const rowData = await this.getDueEmiRowData(query);
      if (rowData?.message) return rowData;
      const data = await this.getEmiIdAndLoanId(rowData);
      const loanData = await this.getLoanData(data);
      const salaryDate = await this.getSalaryDate(loanData);
      const locations = await this.getLastLoactionData(loanData);
      const prePare = await this.prePareDefauterData(
        data,
        loanData,
        locations,
        salaryDate,
      );
      return { count: rowData.count, rows: prePare };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get salary date
  private async getSalaryDate(loanData: any) {
    const dateList = [];
    try {
      const loanList = [...new Set(loanData.map((item) => item.id))];
      // Get changed salary date by admin user
      const changeAttr = ['id', 'loanId', 'newData'];
      const changeOptions: any = {
        where: {
          loanId: loanList,
          type: 'Verification',
          subType: 'Salary Date',
          newData: { [Op.ne]: '-' },
        },
      };
      let changedList = await this.changeLogsRepo.getTableWhereData(
        changeAttr,
        changeOptions,
      );
      if (changedList == k500Error) changedList = [];
      loanList.forEach((ele) => {
        try {
          const find = loanData.find((f) => f.id === ele);
          const findsalary = changedList.find((f) => f.loanId === ele)?.newData;
          const date = findsalary ?? find?.bankingData?.salaryDate ?? '-';
          dateList.push({ date, loanId: ele });
        } catch (error) {}
      });
    } catch (error) {}
    return dateList;
  }
  //#endregion

  //#region get due emi row Data
  private async getDueEmiRowData(query) {
    try {
      /// query params
      const adminId = query?.adminId;
      const page = +(query?.page ?? 1);
      const fromDay = +query.fromDay;
      const toDay = +query.toDay;
      const isAll = (query?.type ?? 'all').toLowerCase() == 'all';
      const searchText: string = (query?.searchText ?? '').toLowerCase();
      const sorting = query?.sorting ?? 'online';
      const isDownload = (query?.download ?? 'false') === 'true';
      const notice = (query?.notice ?? 'all').toLowerCase();

      const att: any = isAll ? ['loanId'] : ['id', 'loanId'];
      const options: any = {
        where: { payment_due_status: '1', payment_status: '0' },
        include: [{ model: registeredUsers, attributes: [] }],
      };

      if (notice === 'sent')
        options.where = { ...options.where, legalId: { [Op.ne]: null } };
      else if (notice === 'pending')
        options.where = { ...options.where, legalId: { [Op.eq]: null } };
      /// sorting data by due day or last online time
      if (sorting == 'due_day') {
        if (isAll) {
          options.group = ['loanId'];
          options.order = [
            [Sequelize.fn('min', Sequelize.col('EmiEntity.penalty_days'))],
            ['loanId'],
          ];
        } else options.order = ['penalty_days'];
      } else {
        if (isAll)
          options.group = ['loanId', Sequelize.col('"user"."lastOnlineTime"')];
        options.order = [
          [Sequelize.col('"user"."lastOnlineTime"'), 'desc NULLS LAST'],
        ];
      }

      /// add filter of penalty day
      let penalty_days;
      if (Number(toDay) && Number(fromDay))
        penalty_days = { [Op.gte]: fromDay, [Op.lte]: toDay };
      else if (Number(fromDay)) penalty_days = { [Op.gte]: fromDay };
      else if (Number(fromDay)) penalty_days = { [Op.lte]: toDay };
      if (penalty_days) options.where.penalty_days = penalty_days;

      /// find by search text
      if (searchText) {
        if (searchText.startsWith('l-'))
          options.where.loanId = searchText.replace('l-', '');
        else if (Number(searchText)) {
          let phone = this.cryptService.encryptPhone(+searchText);
          phone = phone.split('===')[1];
          options.include[0].where = { phone: { [Op.iRegexp]: phone } };
        } else
          options.include[0].where = { fullName: { [Op.iRegexp]: searchText } };
      }

      /// find by follower id
      if (adminId) {
        const loanIncled: any = { model: loanTransaction, attributes: [] };
        loanIncled.where = { followerId: adminId };
        options.include.push(loanIncled);
      }

      /// set page limit or offset
      if (!isDownload) {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      /// find data from db
      let result;
      if (isDownload)
        result = await this.emiRepo.getTableWhereData(att, options);
      else
        result = await this.emiRepo.getTableWhereDataWithCounts(att, options);
      if (!result || result === k500Error) return kInternalError;
      if (isDownload) result = { count: result.length, rows: result };
      if (typeof result.count === 'object') result.count = result.count.length;
      return result;
    } catch (error) {}
  }

  async checkDefaultersBalance(reqData) {
    try {
      const targetList = await this.getTargetListForAABalanceCheck(reqData);
      if (targetList?.message) return targetList;

      const data = [];
      for (let index = 0; index < targetList.length; index++) {
        const targetData = targetList[index];
        const loanId = targetData.loanId;
        try {
          const consentRawResponse = targetData.consentResponse;
          const consentResponse = JSON.parse(consentRawResponse);
          const fetchCount = consentResponse.fetchCount ?? 0;
          // if (fetchCount >= 4) {
          //   data.push({
          //     loanId,
          //     status: kFailed,
          //     reason: 'Maximum fetch attempt reached',
          //   });
          //   continue;
          // }

          const consentId = targetData.consentId;
          await this.camsService.fetchData(consentId);

          // Update banking data
          const bankingId = targetData.id;
          consentResponse.fetchCount = fetchCount + 1;
          const updatedData = {
            consentResponse: JSON.stringify(consentResponse),
          };
          await this.bankingRepo.updateRowData(updatedData, bankingId);
        } catch (error) {
          try {
            data.push({ loanId, status: kFailed, reason: error?.toString() });
          } catch (error) {}
        }
      }

      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get emi id and loanId
  private getEmiIdAndLoanId(rowData) {
    const loanId = [];
    const emiId = [];
    try {
      rowData.rows.forEach((ele) => {
        try {
          if (ele?.loanId) loanId.push(ele?.loanId);
          if (ele?.id) emiId.push({ loanId: ele.loanId, emiId: ele?.id });
        } catch (error) {}
      });
    } catch (error) {}
    return { loanId, emiId };
  }
  //#endregion

  //#region get loan Data
  private async getLoanData(data) {
    try {
      const loanId = [...new Set(data.loanId.map((item) => item))];
      const options: any = { where: { id: loanId } };
      /// user Include
      const userInclude = {
        model: registeredUsers,
        attributes: [
          'fullName',
          'phone',
          'typeAddress',
          'state',
          'city',
          'lastOnlineTime',
          'id',
        ],
        include: [
          {
            model: KYCEntity,
            attributes: [
              'id',
              'aadhaarAddress',
              'aadhaarResponse',
              'aadhaarAddressResponse',
            ],
          },
        ],
      };

      /// emi include
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emiDate',
          'emi_amount',
          'penalty',
          'penalty_days',
          'legalId',
          'payment_status',
          'payment_due_status',
        ],
      };

      /// sub scription
      const subInclude = { attributes: ['mode'], model: SubScriptionEntity };
      /// banking
      const bankInclude = { attributes: ['salaryDate'], model: BankingEntity };
      options.include = [subInclude, userInclude, emiInclude, bankInclude];
      /// att
      const att = [
        'id',
        'userId',
        'followerId',
        'netApprovedAmount',
        'loanFees',
        'stampFees',
        'loan_disbursement_date',
        'manualVerificationAcceptId',
      ];
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {}
  }

  private async getTargetListForAABalanceCheck(reqData) {
    try {
      const loanId = reqData.loanId;
      const targetSalaryDate = reqData.salaryDate;

      const today = new Date();
      if (targetSalaryDate) today.setDate(targetSalaryDate);
      today.setDate(today.getDate() - 2);
      const postSalaryDate = today.getDate().toString();
      //  today.setDate(today.getDate() + 4);
      // const preSalaryDate = today.getDate().toString();

      // Get all defaulter's list
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = ['id'];
      emiInclude.where = { payment_due_status: '1', payment_status: '0' };
      const include = [emiInclude];
      const loanOptions = { include };
      let loanList: any = [];
      if (loanId) loanList = [{ id: loanId }];
      else
        loanList = await this.loanRepo.getTableWhereData(['id'], loanOptions);
      if (loanList == k500Error) return kInternalError;
      loanList = loanList.map((el) => el.id);

      // Get changed salary date by admin user
      const changeAttr = [
        [Sequelize.fn('max', Sequelize.col('id')), 'max'],
        'loanId',
        'newData',
      ];
      const changeOptions: any = {
        where: {
          newData: { [Op.or]: [postSalaryDate] },
          loanId: loanList,
          type: 'Salary Date',
        },
        group: ['loanId', 'newData'],
      };
      const changedList = await this.changeLogsRepo.getTableWhereData(
        changeAttr,
        changeOptions,
      );
      if (changedList == k500Error) return kInternalError;
      const changedLoanIds = changedList.map((el) => el.loanId);
      const remainingLoanIds = loanList.filter((el) => {
        const isExist = changedLoanIds.find((subEl) => subEl == el);
        if (!isExist) return true;
      });

      let attributes = ['loanId'];
      let options: any = {
        where: {
          loanId: remainingLoanIds,
          salaryDate: { [Op.or]: [+postSalaryDate] },
        },
      };
      let bankingList = await this.bankingRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankingList == k500Error) return kInternalError;
      const finalizedLoanList = bankingList.map((el) => el.loanId);
      finalizedLoanList.concat(changedLoanIds);
      loanList = [...new Set(loanList)];

      // Target defaulters with account aggregator verification
      attributes = ['id', 'loanId', 'consentId', 'consentResponse'];
      options = {
        where: {
          consentTxnId: { [Op.ne]: null },
          consentResponse: { [Op.ne]: null },
          loanId: loanList,
          // salaryDate: { [Op.or]: [+postSalaryDate] },
        },
      };
      bankingList = await this.bankingRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankingList == k500Error) return kInternalError;

      return bankingList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get last location Data
  private async getLastLoactionData(loanData) {
    try {
      /// const find max == last location
      const userId = [...new Set(loanData.map((loan) => loan.userId))];
      const options: any = { where: { userId } };
      options.order = [[Sequelize.fn('max', 'id')]];
      options.group = ['userId'];
      const att: any = [[Sequelize.fn('max', Sequelize.col('id')), 'max']];
      const result = await this.locationRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return [];
      const locationId = [...new Set(result.map((data) => data.max))];
      /// find data from entity
      const opti = { where: { id: locationId } };
      const att1 = ['location', 'userId'];
      const data = await this.locationRepo.getTableWhereData(att1, opti);
      if (!data || data === k500Error) return [];
      return data;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region get prePare data
  private async prePareDefauterData(data, loanData, locationData, salaryDate) {
    const findList = [];
    try {
      const emiId = data.emiId;
      const loanId = data.loanId;
      const isDays = emiId.length > 0;
      const emiList = [];
      for (let index = 0; index < loanId.length; index++) {
        try {
          const id = loanId[index];
          const find = loanData.find((f) => f.id === id);
          if (!find) continue;
          const user = find?.registeredUsers;
          const kyc = user?.kycData;
          const emi = find?.emiData;
          const tempMap: any = {};
          tempMap['userId'] = user?.id ?? '-';
          tempMap['Loan ID'] = id;
          tempMap['Name'] = user?.fullName ?? '-';
          const phone = this.cryptService.decryptPhone(user?.phone);
          tempMap['Mobile number'] = phone;
          const followerAdmin = await this.commonService.getAdminData(
            find.followerId,
          );
          tempMap['Follower name'] = followerAdmin?.fullName ?? '-';

          const findSalaryDate = salaryDate.find((f) => f.loanId === id);
          tempMap['Salary date'] = findSalaryDate?.date ?? '-';

          emi.sort((a, b) => a.id - b.id);
          let delayDay;
          let dueAmount = 0;
          let legalNotice = true;
          let otherEMIdue = false;
          if (isDays) {
            const tempEMI = emiId.find(
              (f) => f.loanId == id && !emiList.includes(f.emiId),
            );
            const findEMI = emi.find((f) => f.id === tempEMI.emiId);
            emiList.push(tempEMI.emiId);
            dueAmount += +findEMI.emi_amount + findEMI.penalty;
            tempMap['Due amount till date'] = dueAmount.toFixed(2);
            let date = this.typeService.getDateFormatted(findEMI?.emiDate);
            if (!date || (date ?? '').includes('NaN')) date = '-';
            tempMap['Due date'] = date;
            tempMap['Delay days'] = findEMI?.penalty_days ?? '-';
            const filter = emi.filter(
              (f) =>
                f.payment_status === '0' &&
                f.payment_due_status === '1' &&
                f.id != findEMI.id,
            );
            if (filter.length > 0) otherEMIdue = true;
            legalNotice = findEMI.legalId == null ? false : true;
          } else {
            /// this loop for emiDate
            for (let i = 0; i < 3; i++) {
              try {
                const e = emi[i];
                const isPaid = (e?.payment_status ?? '1') === '1';
                let date = this.typeService.getDateFormatted(e?.emiDate);
                if (!date || (date ?? '').includes('NaN')) date = '-';
                tempMap[`Emi ${i + 1} date`] = isPaid ? '-' : date;
                if (
                  !isPaid &&
                  (delayDay ?? 100000) > (e?.penalty_days ?? 0) &&
                  e?.penalty_days
                )
                  delayDay = e?.penalty_days;
                if (!isPaid) dueAmount += +e.emi_amount + e.penalty;
              } catch (error) {}
            }
            tempMap['Delay days'] = delayDay ?? '-';
            tempMap['Due amount till date'] = dueAmount.toFixed(2);

            /// this loop for emiDate
            for (let i = 0; i < 3; i++) {
              try {
                const e = emi[i];
                const isPaid = (e?.payment_status ?? '1') === '1';
                let date = this.typeService.getDateFormatted(e?.emiDate);
                if (!date || (date ?? '').includes('NaN')) date = '-';
                const keyAmount = `Emi ${i + 1} amount`;
                tempMap[keyAmount] = isPaid ? '-' : (+e.emi_amount).toFixed(2);
                const keyPenalty = `Emi ${i + 1} penalty`;
                tempMap[keyPenalty] = isPaid ? '-' : (+e.penalty).toFixed(2);
                if (!isPaid && legalNotice)
                  legalNotice = e.legalId == null ? false : true;
              } catch (error) {}
            }
          }

          tempMap['Legal notice'] = legalNotice;
          tempMap['Final approved'] = find?.netApprovedAmount ?? '-';
          const amount =
            +find?.netApprovedAmount - find?.loanFees - find?.stampFees;
          tempMap['Amount disbursed'] = amount ?? '-';
          let date = this.typeService.getDateFormatted(
            find?.loan_disbursement_date,
          );
          if (!date || (date ?? '').includes('NaN')) date = '-';
          tempMap['Disbursement date'] = date;
          tempMap['E-Mandate type'] = find?.subscriptionData?.mode ?? '-';

          let zipCode = '-';
          let aadhaarAddress = '-';
          let typeAddress = '-';
          let userLocation = '-';
          let state = '-';
          let city = '-';

          try {
            const address = this.typeService.getAadhaarAddress(kyc);
            aadhaarAddress = address?.address ?? '-';
            city = address?.dist;
            state = address?.state;
            try {
              const aadhaarRes = JSON.parse(kyc?.aadhaarResponse);
              zipCode = aadhaarRes?.zip ?? '-';
              if (zipCode == '-') {
                try {
                  const addressDet = JSON.parse(aadhaarRes?.addressDetails);
                  zipCode = addressDet?.pc ?? '-';
                } catch (error) {}
              }
            } catch (error) {}

            if (user?.typeAddress)
              typeAddress = this.typeService.getUserTypeAddress(
                user?.typeAddress,
              );
            const findLocation = locationData.find(
              (f) => f.userId == find.userId,
            );
            if (findLocation) userLocation = findLocation?.location ?? '-';
          } catch (error) {}
          tempMap['Zip Code'] = zipCode;
          tempMap['Aadhaar address'] = aadhaarAddress;
          tempMap['Type address'] = typeAddress;
          tempMap['User location'] = userLocation;
          tempMap['City'] = city;
          tempMap['State'] = state;
          const admin = await this.commonService.getAdminData(
            find.manualVerificationAcceptId,
          );
          tempMap['Loan approved by'] = admin?.fullName ?? '-';
          tempMap['otherEMIdue'] = otherEMIdue;
          tempMap['lastOnlineTime'] = user?.lastOnlineTime ?? '-';
          findList.push(tempMap);
        } catch (error) {}
      }
    } catch (error) {}
    return findList;
  }
  //#endregion

  //#region -> Dashboard card for defaulter user's insights
  async dashboardCard(reqData) {
    try {
      // Get target loans
      const loanList: any = await this.getDataForDashboardCard(reqData);
      if (loanList?.message) return loanList;

      // Data preparation
      let totalExpectedPrincipal = 0;
      let totalExpectedInterest = 0;
      let totalExpectedPenalty = 0;
      let totalPartPayUsers = 0;
      let totalPaidPartPayment = 0;
      let totalRemainingPartPayment = 0;
      let accountAggregatorUsers = 0;
      const dateWiseData: any = [
        {
          Days: '1 to 15',
          minPenaltyDays: 1,
          maxPenaltyDays: 15,
          'Total users': 0,
          'AA users': 0,
          'Amount to be recovered': 0,
          'Principal to be recovered': 0,
          'Demand letter sent': 0,
          'Demand letter remaining': 0,
        },
        {
          Days: '16 to 30',
          minPenaltyDays: 16,
          maxPenaltyDays: 30,
          'Total users': 0,
          'AA users': 0,
          'Amount to be recovered': 0,
          'Principal to be recovered': 0,
          'Demand letter sent': 0,
          'Demand letter remaining': 0,
        },
        {
          Days: '31 to 60',
          minPenaltyDays: 31,
          maxPenaltyDays: 60,
          'Total users': 0,
          'AA users': 0,
          'Amount to be recovered': 0,
          'Principal to be recovered': 0,
          'Demand letter sent': 0,
          'Demand letter remaining': 0,
        },
        {
          Days: '61 to 90',
          minPenaltyDays: 61,
          maxPenaltyDays: 90,
          'Total users': 0,
          'AA users': 0,
          'Amount to be recovered': 0,
          'Principal to be recovered': 0,
          'Demand letter sent': 0,
          'Demand letter remaining': 0,
        },
        {
          Days: '90+',
          minPenaltyDays: 91,
          maxPenaltyDays: Infinity,
          'Total users': 0,
          'AA users': 0,
          'Amount to be recovered': 0,
          'Principal to be recovered': 0,
          'Demand letter sent': 0,
          'Demand letter remaining': 0,
        },
      ];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          let expectedPrincipal = 0;
          let expectedInterest = 0;
          let expectedPenalty = 0;

          // Emi calculation
          const emiList = loanData.emiData ?? [];
          let transList = [];
          let penaltyDays = 0;
          for (let i = 0; i < emiList.length; i++) {
            try {
              const emiData = emiList[i];
              const emiPrincipal = emiData.principalCovered ?? 0;
              expectedPrincipal += emiPrincipal;
              const emiInterest = emiData.interestCalculate ?? 0;
              expectedInterest += emiInterest;
              const emiPenalty = emiData.penalty ?? 0;
              expectedPenalty += emiPenalty;
              penaltyDays += emiData.penalty_days ?? 0;
              transList = [...transList, ...(emiData.transactionData ?? [])];
            } catch (error) {}
          }
          // Cams details
          const bankingData = loanData.bankingData ?? {};
          if (bankingData.id) accountAggregatorUsers++;
          // Penalty days wuse data
          const targetIndex = dateWiseData.findIndex(
            (el) =>
              penaltyDays >= el.minPenaltyDays &&
              penaltyDays <= el.maxPenaltyDays,
          );
          if (targetIndex == -1) continue;
          dateWiseData[targetIndex]['Total users']++;
          if (bankingData.id) dateWiseData[targetIndex]['AA users']++;

          // Payment calculation
          let isPartPaid = false;
          let paidPrincipal = 0;
          let paidInterest = 0;
          for (let i = 0; i < transList.length; i++) {
            try {
              const transData = transList[i];
              isPartPaid = true;
              // Paid principal amount
              const principalAmount = transData.principalAmount ?? 0;
              if (principalAmount > 0) {
                paidPrincipal += principalAmount;
                totalPaidPartPayment += principalAmount;
              }

              // Paid interest amount
              const interestAmount = transData.interestAmount ?? 0;
              if (interestAmount > 0) {
                paidInterest += interestAmount;
                totalPaidPartPayment += interestAmount;
              }

              // Paid penalty amount
              const penaltyAmount = transData.penaltyAmount ?? 0;
              if (penaltyAmount > 0) {
                totalPaidPartPayment += penaltyAmount;
              }
            } catch (error) {}
          }

          let remainingPrincipal = expectedPrincipal - paidPrincipal;
          if (remainingPrincipal < 0) remainingPrincipal = 0;
          remainingPrincipal = Math.floor(remainingPrincipal);
          let remainingInterest = expectedInterest - paidInterest;
          if (remainingInterest < 0) remainingInterest = 0;
          remainingInterest = Math.floor(remainingInterest);

          dateWiseData[targetIndex]['Principal to be recovered'] +=
            remainingPrincipal;
          expectedPenalty = Math.floor(expectedPenalty);
          dateWiseData[targetIndex]['Amount to be recovered'] +=
            remainingPrincipal + remainingInterest + expectedPenalty;

          totalExpectedPrincipal += remainingPrincipal;
          totalExpectedInterest += remainingInterest;
          totalExpectedPenalty += expectedPenalty;

          // Notice sent or not
          let demandLetterSent = 'Sent';
          if (loanData.legalEmiList?.length == 0) demandLetterSent = 'Not sent';
          else {
            const isSent =
              emiList.length == (loanData.legalEmiList?.length ?? 0);
            if (isSent) demandLetterSent = 'Sent';
            else demandLetterSent = 'Not sent';
          }
          if (demandLetterSent == 'Sent')
            dateWiseData[targetIndex]['Demand letter sent']++;
          else dateWiseData[targetIndex]['Demand letter remaining']++;

          // Total active partial paid loans
          if (isPartPaid) {
            totalPartPayUsers++;
            totalRemainingPartPayment +=
              remainingPrincipal + remainingInterest + expectedPenalty;
          }
        } catch (error) {}
      }

      // Fine tuning
      totalExpectedPrincipal = Math.floor(totalExpectedPrincipal);
      totalExpectedInterest = Math.floor(totalExpectedInterest);
      totalExpectedPenalty = Math.floor(totalExpectedPenalty);
      totalPaidPartPayment = Math.floor(totalPaidPartPayment);

      for (let index = 0; index < dateWiseData.length; index++) {
        const el = dateWiseData[index];
        for (const key in el) {
          const value = el[key];
          if (
            key == 'Amount to be recovered' ||
            key == 'Principal to be recovered'
          ) {
            el[key] = kRuppe + this.typeService.amountNumberWithCommas(value);
          } else if (key == 'Total users' || key == 'AA users')
            el[key] = this.typeService.amountNumberWithCommas(value);
        }
      }
      return {
        'Total users': loanList.length,
        'AA users': this.typeService.amountNumberWithCommas(
          accountAggregatorUsers,
        ),
        'Amount to be recovered':
          kRuppe +
          this.typeService.amountNumberWithCommas(
            totalExpectedPrincipal +
              totalExpectedInterest +
              totalExpectedPenalty,
          ),
        'Principal to be recovered':
          kRuppe +
          this.typeService.amountNumberWithCommas(totalExpectedPrincipal),

        'Active part payment':
          this.typeService.amountNumberWithCommas(totalPartPayUsers),
        'Received part payment':
          kRuppe +
          this.typeService.amountNumberWithCommas(totalPaidPartPayment),
        'Yet to receive part payment':
          kRuppe +
          this.typeService.amountNumberWithCommas(
            Math.floor(totalRemainingPartPayment),
          ),
        dateWiseData,
        // loanList,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForDashboardCard(reqData) {
    try {
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      let fromDate = reqData.minDate;
      if (!fromDate)
        fromDate = this.typeService.getGlobalDate(new Date()).toJSON();
      let toDate = reqData.maxDate;
      if (!toDate) toDate = this.typeService.getGlobalDate(new Date()).toJSON();

      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 1);
      minDate.setHours(0);
      minDate.setMinutes(0);
      minDate.setSeconds(0);
      const maxDate = new Date();
      maxDate.setHours(23);
      maxDate.setMinutes(59);
      maxDate.setSeconds(59);

      let adminList = [];
      // Specific admin
      if (adminId != -1) adminList.push(adminId);
      // All admin
      else {
        const followerList = await this.loanRepo.getTableWhereData(
          ['followerId'],
          { group: ['followerId'], where: { followerId: { [Op.ne]: null } } },
        );
        if (followerList == k500Error) return kInternalError;
        adminList = followerList.map((el) => el.followerId);
      }

      // Table joins
      const bankingInclude: any = { model: BankingEntity };
      bankingInclude.attributes = ['id'];
      bankingInclude.where = { consentId: { [Op.ne]: null } };
      bankingInclude.required = false;
      const transInclude: any = { model: TransactionEntity };
      transInclude.attributes = [
        'paidAmount',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'type',
      ];
      transInclude.required = false;
      transInclude.where = { status: kCompleted };
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'interestCalculate',
        'legalId',
        'principalCovered',
        'penalty',
        'penalty_days',
      ];
      emiInclude.include = [transInclude];
      const include = [bankingInclude, emiInclude];
      // Query preparation
      let attributes = ['id'];
      let options: any = {
        include,
        where: {
          loanStatus: 'Active',
          [Op.and]: Sequelize.literal(
            `"emiData"."payment_status" = '0' AND "emiData"."payment_due_status" = '1'`,
          ),
        },
      };
      if (adminId != -1) options.where.followerId = adminId;
      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      const finalizedLoanIds = loanList.map((el) => el.id);
      options = {
        group: ['emiId', 'loanId'],
        where: {
          emiId: { [Op.ne]: null },
          loanId: { [Op.in]: finalizedLoanIds },
          type: { [Op.in]: [1, 2] },
        },
      };
      attributes = ['emiId', 'loanId'];
      const legalList = await this.legalCollectionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (legalList == k500Error) return kInternalError;

      loanList.forEach((el) => {
        legalList.forEach((subEl) => {
          const loanId = subEl.loanId;
          const emiId = subEl.emiId;
          if (el.id == loanId) {
            if (!el.legalList) el.legalEmiList = [];
            el.legalEmiList.push(emiId);
          }
        });
        // For old users we need to manage it via Emi Table (Migration issue)
        el.emiData?.forEach((subEl) => {
          if (subEl.legalId) {
            if (!el.legalList) el.legalEmiList = [];
            el.legalEmiList.push(subEl.id);
          }
        });
      });

      return loanList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async partPayments(reqData) {
    try {
      const loanListData: any = await this.getDataForPartPayments(reqData);
      if (loanListData.message) return loanListData;

      const isDownload = reqData.download?.toString() == 'true';

      const preparedList = [];
      for (let index = 0; index < loanListData.rows.length; index++) {
        try {
          try {
            const loanData = loanListData.rows[index];
            const bankingData = loanData.bankingData ?? {};
            const subscriptionData = loanData.subscriptionData ?? {
              mode: kSigndesk,
            };
            const userData = loanData.registeredUsers ?? {};
            const crmData = userData.lastCrm ?? {};
            const kycData = userData.kycData ?? {};
            const masterData = userData.masterData ?? {};
            const disbursementList = loanData.disbursementData ?? [];
            const disbursementData = disbursementList[0];
            let emiList = loanData.emiData ?? [];
            emiList = emiList.sort((a, b) => a.id - b.id);
            const firstEMIData = emiList[0];
            let dueAmount = emiList.reduce(
              (prev, curr) =>
                prev + (parseFloat(curr.emi_amount) + curr.penalty),
              0,
            );
            dueAmount = Math.floor(dueAmount);
            const dueDateInfo = this.dateService.dateToReadableFormat(
              firstEMIData.emi_date,
            );
            let pinCode = '-';
            try {
              const response = JSON.parse(kycData.aadhaarResponse);
              pinCode = response.zip ?? response.pincode ?? '-';
            } catch (error) {}
            const disbursedDateInfo = this.dateService.dateToReadableFormat(
              loanData.loan_disbursement_date,
            );
            let crmDate = '-';
            let unTouchedPTPUser = 'No';
            let unTouchedUser = 'No';
            if (crmData.createdAt) {
              const crmDateInfo = this.dateService.dateToReadableFormat(
                crmData.createdAt,
              );
              crmDate = crmDateInfo.readableStr;
              // Untouched user
              if (!ptpCrmIds.includes(crmData.titleId)) {
                const today = new Date();
                const crmDate = new Date(crmData.createdAt);
                const dateDifference = this.typeService.dateDifference(
                  today,
                  crmDate,
                  'Days',
                );
                if (dateDifference > 3) unTouchedUser = 'Yes';
              }
              // Un-touched ptp user
              else if (crmData.due_date) {
                const today = new Date();
                const crmDate = new Date(crmData.due_date);
                const dateDifference = this.typeService.dateDifference(
                  today,
                  crmDate,
                  'Days',
                );
                const isPTPPaid = crmData.isPTPPaid ?? false;
                if (dateDifference > 3 && !isPTPPaid) unTouchedPTPUser = 'Yes';
              }
            }
            const overDueCalculation: any =
              this.calculcation.getOverDueInsightsForLoan(loanData);
            preparedList.push({
              userId: loanData.userId,
              'Loan ID': loanData.id,
              Name: userData.fullName ?? '-',
              Phone: this.cryptService.decryptPhone(userData.phone),
              Follower: (
                await this.commonService.getAdminData(loanData.followerId)
              ).fullName,
              'Approved amount':
                Math.floor(loanData.netApprovedAmount ?? '0') ?? '-',
              'Delay days': emiList.reduce(
                (prev, curr) => prev + (curr.penalty_days ?? 0),
                0,
              ),
              'Due date': dueDateInfo.readableStr,
              'Received part payment': isDownload
                ? overDueCalculation.totalPaid
                : this.strService.readableAmount(overDueCalculation.totalPaid),
              'Yet to received': isDownload
                ? overDueCalculation.totalRemaining
                : this.strService.readableAmount(
                    overDueCalculation.totalRemaining,
                    isDownload,
                  ),
              'Remaining emi amount to be recovered':
                this.strService.readableAmount(
                  overDueCalculation.totalRemainingPI,
                  isDownload,
                ),
              'Disbursement date': disbursedDateInfo.readableStr ?? '-',
              'Disbursement amount':
                '₹ ' +
                this.typeService.amountNumberWithCommas(
                  Math.floor(disbursementData.amount / 100),
                ),
              'Salary date': loanData.verifiedSalaryDate ?? '-',
              'Mandate source': subscriptionData.mode ?? '-',
              City: this.strService.makeFirstLetterCapital(
                userData.city ?? '-',
              ),
              State: this.strService.makeFirstLetterCapital(
                userData.state ?? '-',
              ),
              Pincode: pinCode,
              'Aadhaar address':
                this.typeService.getAadhaarAddress(kycData).address ?? '-',
              'Type address':
                this.typeService.getUserTypeAddress(
                  userData.typeAddress ?? '-',
                ) ?? '-',
              'User location': masterData?.miscData?.lastLocation ?? '-',
              'AA User': bankingData.consentId ? 'Yes' : 'No',
              'Un-touched user': unTouchedUser,
              'Un-touched PTP user': unTouchedPTPUser,
              'CRM date': crmDate ?? '-',
              'CRM disposition': crmData.dispositionName ?? '-',
              'CRM description': crmData.remark ?? '-',
              'CRM added by': crmData.adminName ?? '-',
              'Approved by': (
                await this.commonService.getAdminData(
                  loanData.manualVerificationAcceptId,
                )
              ).fullName,
              lastOnlineTime: userData.lastOnlineTime,
              otherEMIdue: emiList.length > 1,
            });
          } catch (error) {}
        } catch (error) {}
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Part pay users'],
          data: [preparedList],
          sheetName: 'Part pay users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count: loanListData.count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForPartPayments(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      if (isNaN(adminId)) return kInvalidParamValue('adminId');
      const isDownload = reqData.download?.toString() == 'true';
      const page = reqData.page;
      if (!isDownload && !page) return kParamMissing('page');

      const searchData: any = this.common.getSearchData(reqData.searchText);
      if (searchData?.message) return searchData;

      const adminList = await this.getTargetAdmins(adminId);

      let transactionInclude: { model; attributes?; required?; where? } = {
        model: TransactionEntity,
      };
      transactionInclude.attributes = ['id'];
      transactionInclude.where = {
        type: { [Op.ne]: 'REFUND' },
        status: kCompleted,
      };
      let emiInclude: { model; attributes?; include?; where? } = {
        model: EmiEntity,
      };
      emiInclude.attributes = ['id'];
      emiInclude.where = { payment_status: '0', payment_due_status: '1' };
      emiInclude.include = [transactionInclude];
      let include = [emiInclude];
      // Search by user's name
      if (searchData.text != '' && searchData.type == 'Name') {
        const userInclude: { model; attributes?; where? } = {
          model: registeredUsers,
        };
        userInclude.attributes = ['id'];
        userInclude.where = { fullName: { [Op.iRegexp]: searchData.text } };
        include.push(userInclude);
      }
      // Search by user's phone number
      else if (searchData.text != '' && searchData.type == 'Number') {
        const userInclude: { model; attributes?; where? } = {
          model: registeredUsers,
        };
        userInclude.attributes = ['id'];
        userInclude.where = { phone: { [Op.iLike]: searchData.text } };
        include.push(userInclude);
      }
      let attributes = ['id'];
      let options: any = {
        order: [['id']],
        include,
        where: { followerId: { [Op.in]: adminList }, loanStatus: 'Active' },
      };
      // Search by loanId
      if (searchData.text != '' && searchData.type == 'LoanId')
        options.where.id = searchData.text;

      // Query
      const loanRawList = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (loanRawList == k500Error) return kInternalError;
      const loanIds = loanRawList.rows.map((el) => el.id);

      // Query preparation
      attributes = [
        'followerId',
        'id',
        'loan_disbursement_date',
        'manualVerificationAcceptId',
        'netApprovedAmount',
        'userId',
        'verifiedSalaryDate',
      ];
      const bankingInclude: { model; attributes? } = { model: BankingEntity };
      bankingInclude.attributes = ['consentId'];
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = ['amount'];
      transactionInclude = {
        model: TransactionEntity,
      };
      transactionInclude.required = false;
      transactionInclude.where = {
        status: kCompleted,
        type: { [Op.ne]: 'REFUND' },
      };
      transactionInclude.attributes = [
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      emiInclude = {
        model: EmiEntity,
      };
      emiInclude.attributes = [
        'emi_amount',
        'emi_date',
        'penalty',
        'id',
        'penalty_days',
        'principalCovered',
        'interestCalculate',
      ];
      emiInclude.include = [transactionInclude];
      emiInclude.where = { payment_status: '0', payment_due_status: '1' };
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarResponse',
        'aadhaarAddressResponse',
      ];
      const masterInclude: { model; attributes? } = { model: MasterEntity };
      masterInclude.attributes = ['miscData'];
      const userInclude: { model; attributes?; include? } = {
        model: registeredUsers,
      };
      userInclude.attributes = [
        'city',
        'fullName',
        'lastCrm',
        'lastOnlineTime',
        'phone',
        'state',
        'typeAddress',
      ];
      userInclude.include = [kycInclude, masterInclude];
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = ['mode'];
      include = [
        bankingInclude,
        disbursementInclude,
        emiInclude,
        subscriptionInclude,
        userInclude,
      ];

      options = { include, order: [['id']], where: { id: loanIds } };
      if (!isDownload) {
        options.limit = PAGE_LIMIT;
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
      }
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      return { count: loanRawList.count, rows: loanList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async unTouchedCrmUsers(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount == 'true';
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const type = reqData.type;
      if (!isCountOnly && !type) return kParamMissing('type');
      const page = reqData.page;
      if (!isCountOnly && !page) return kParamMissing('page');

      const adminIds = await this.getTargetAdmins(adminId);

      if (isCountOnly) return await this.unTouchedCrmUserCounts(adminIds);
      else if (type == 1)
        return await this.unTouchedUsers({ adminIds, ...reqData });
      else if (type == 2)
        return await this.unTouchedPTPs({ adminIds, ...reqData });
      else return kInvalidParamValue('type');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async unTouchedCrmUserCounts(adminIds) {
    try {
      const reqData = { adminIds, isCount: true };
      const countData = await Promise.all([
        await this.unTouchedUsers(reqData),
        await this.unTouchedPTPs(reqData),
      ]);

      const unTouchedUsers: any = countData[0];
      if (unTouchedUsers?.message) return unTouchedUsers;
      const unTouchedPTPs: any = countData[1];
      if (unTouchedPTPs?.message) return unTouchedPTPs;

      return { unTouchedUsers, unTouchedPTPs };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Defaulters who's last crm is 3 days ago without any ptps
  private async unTouchedUsers(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount?.toString() == 'true';
      const page = reqData.page;
      const isDownload = reqData.download?.toString() == 'true';
      const searchData: any = await this.common.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      // Prepare date range
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 3);
      const minDueDate = this.dateService.utcDateRange(minDate);
      const minRange = minDueDate.minRange;

      let attributes: any = ['userId'];

      // Un touched users
      // Query preparation
      let userInclude: { model; attributes?; where? } = {
        model: registeredUsers,
      };
      userInclude.attributes = ['id'];
      let include = [userInclude];
      let options: any = {
        order: [['id']],
        include,
        where: { followerId: reqData.adminIds, loanStatus: 'Active' },
      };
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;
      const userIds = loanList.map((el) => el.registeredUsers?.id);
      options = {
        where: {
          id: userIds,
          [Op.or]: [
            { lastCrm: { [Op.eq]: null } },
            {
              lastCrm: {
                createdAt: { [Op.lte]: minRange },
                titleId: { [Op.notIn]: ptpCrmIds },
              },
            },
          ],
          loanStatus: 3,
        },
      };
      // Query
      if (isCountOnly) {
        const noCrmCounts = await this.userRepo.getCountsWhere(options);
        if (noCrmCounts == k500Error) return kInternalError;
        return this.typeService.amountNumberWithCommas(noCrmCounts);
      }

      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = [
        'emi_date',
        'penalty_days',
        'penalty',
        'principalCovered',
        'interestCalculate',
      ];
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = ['amount'];
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = ['mode'];
      const loanInclude: { model; attributes?; include? } = {
        model: loanTransaction,
      };
      const transactionInclude: { model; attributes?; required?; where? } = {
        model: TransactionEntity,
      };
      transactionInclude.attributes = [
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      transactionInclude.where = {
        status: kCompleted,
        type: { [Op.ne]: 'REFUND' },
      };
      transactionInclude.required = false;
      loanInclude.attributes = [
        'loan_disbursement_date',
        'manualVerificationAcceptId',
        'netApprovedAmount',
        'followerId',
        'verifiedSalaryDate',
      ];
      loanInclude.include = [
        emiInclude,
        disbursementInclude,
        subscriptionInclude,
        transactionInclude,
      ];
      const masterInclude: { model; attributes?; include?; where? } = {
        model: MasterEntity,
      };
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarResponse',
        'aadhaarAddressResponse',
      ];
      masterInclude.attributes = ['loanId', 'miscData'];
      masterInclude.include = [loanInclude];
      // Search with loanId
      if (searchData.type == 'LoanId')
        masterInclude.where = { loanId: searchData.text };
      include = [kycInclude, masterInclude];
      attributes = [
        'city',
        'fullName',
        'id',
        'lastCrm',
        'phone',
        'state',
        'typeAddress',
      ];
      if (!isDownload) {
        options.limit = PAGE_LIMIT;
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
      }
      options.include = include;
      if (searchData.text != '') {
        // Search with user's name
        if (searchData.type == 'Name')
          options.where.fullName = { [Op.iRegexp]: searchData.text };
        // Search with user's phone
        else if (searchData.type == 'Number')
          options.where.phone = { [Op.iLike]: searchData.text };
      }

      const userList = await this.userRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      const preparedList = [];
      for (let index = 0; index < userList.rows.length; index++) {
        try {
          const userData = userList.rows[index];
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const loanData = masterData.loanData ?? {};
          const adminId = loanData.followerId;
          const crmData = userData.lastCrm ?? {};
          const disbursementList = loanData.disbursementData ?? [];
          const disbursementData = disbursementList[0];
          const emiList = loanData.emiData ?? [];
          const dueDateInfo = this.dateService.dateToReadableFormat(
            emiList[0].emi_date,
          );
          let pinCode = '-';
          try {
            const response = JSON.parse(kycData.aadhaarResponse);
            pinCode = response.zip ?? response.pincode ?? '-';
          } catch (error) {}
          const adminData = await this.commonService.getAdminData(adminId);
          let crmDate = '-';
          if (crmData.createdAt) {
            const crmDateInfo = this.dateService.dateToReadableFormat(
              crmData.createdAt,
            );
            crmDate = crmDateInfo.readableStr;
          }
          const approvedByAdmin = await this.commonService.getAdminData(
            loanData.manualVerificationAcceptId,
          );
          const disbursementDateInfo = this.dateService.dateToReadableFormat(
            loanData.loan_disbursement_date,
          );
          const subscriptionData = loanData.subscriptionData ?? {};
          const dueDetails: any =
            this.calculcation.getOverDueInsightsForLoan(loanData);
          preparedList.push({
            userId: userData.id,
            Name: userData.fullName ?? '-',
            'Loan Id': masterData.loanId ?? '-',
            Phone: this.cryptService.decryptPhone(userData.phone ?? '') ?? '',
            'Follower name': adminData.fullName ?? '-',
            'Approved amount':
              kRuppe +
              this.typeService.amountNumberWithCommas(
                +loanData.netApprovedAmount,
              ),
            'Delay days': emiList.reduce(
              (prev, curr) => prev + (curr.penalty_days ?? 0),
              0,
            ),
            'Due date': dueDateInfo.readableStr,
            'Due amount': this.strService.readableAmount(
              dueDetails.totalExpected,
            ),
            'Amount to be recovered': this.strService.readableAmount(
              dueDetails.totalRemaining,
            ),
            'Disbursement date': disbursementDateInfo.readableStr,
            'Disbursement amount': this.strService.readableAmount(
              Math.floor(disbursementData.amount / 100).toString(),
            ),
            'Salary date': loanData.verifiedSalaryDate ?? '-',
            'Mandate source': subscriptionData.mode ?? kSigndesk,
            City: this.strService.makeFirstLetterCapital(userData.city ?? '-'),
            State: this.strService.makeFirstLetterCapital(
              userData.state ?? '-',
            ),
            Pincode: pinCode ?? '-',
            'Aadhaar address':
              this.typeService.getAadhaarAddress(kycData).address ?? '-',
            'Type address':
              this.typeService.getUserTypeAddress(
                userData.typeAddress ?? '-',
              ) ?? '-',
            'User location': masterData?.miscData?.lastLocation ?? '-',
            'Approved by': approvedByAdmin.fullName ?? '-',
            'CRM date': crmDate ?? '-',
            'CRM disposition': crmData.dispositionName ?? '-',
            'CRM description': crmData.remark ?? '-',
            'CRM added by': crmData.adminName ?? '-',
          });
        } catch (error) {}
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['UnTouched users'],
          data: [preparedList],
          sheetName: 'UnTouched users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count: userList.count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Defaulters who's last ptp is expired and no action taken
  private async unTouchedPTPs(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount?.toString() == 'true';
      const isDownload = reqData.download?.toString() == 'true';

      const searchData: any = await this.common.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      const todayRange = new Date().toJSON();
      const adminIds = reqData.adminIds;

      // Table joins
      let userInclude: { model; attributes?; where? } = {
        model: registeredUsers,
      };
      userInclude.attributes = ['id'];
      let include = [userInclude];

      // Get target loans
      let attributes: any = ['id'];
      let options: any = {
        include,
        where: {
          loanStatus: 'Active',
          followerId: { [Op.in]: adminIds },
          [Op.and]: Sequelize.literal(`"registeredUsers"."loanStatus" = 3`),
        },
      };
      // Search with loanId
      if (searchData.text != '') {
        if (searchData.type == 'LoanId') options.where.id = searchData.text;
      }
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;
      let userIds = loanList.map((el) => el.registeredUsers?.id);
      const loanIds = loanList.map((el) => el.id);

      // Get last crm of users
      options = {
        where: {
          id: userIds,
          lastCrm: {
            loanId: { [Op.in]: loanIds },
            due_date: { [Op.lte]: todayRange },
            titleId: { [Op.in]: ptpCrmIds },
            isPTPPaid: null,
          },
        },
      };

      if (searchData.text != '') {
        // Search with user's name
        if (searchData.type == 'Name')
          options.where.fullName = { [Op.iRegexp]: searchData.text };
        // Search with user's phone
        else if (searchData.type == 'Number')
          options.where.phone = { [Op.iLike]: searchData.text };
      }

      // Get counts
      let unTouchedPTPs = 0;
      const count = await this.userRepo.getCountsWhere(options);
      if (count == k500Error) return kInternalError;
      unTouchedPTPs = count;
      if (isCountOnly) return count;

      attributes = ['userId'];

      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = [
        'emi_date',
        'penalty_days',
        'penalty',
        'principalCovered',
        'interestCalculate',
      ];
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = ['amount'];
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = ['mode'];
      const transactionInclude: { model; attributes?; required?; where? } = {
        model: TransactionEntity,
      };
      transactionInclude.attributes = [
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      transactionInclude.where = {
        status: kCompleted,
        type: { [Op.ne]: 'REFUND' },
      };
      transactionInclude.required = false;
      const loanInclude: { model; attributes?; include? } = {
        model: loanTransaction,
      };
      loanInclude.attributes = [
        'loan_disbursement_date',
        'followerId',
        'manualVerificationAcceptId',
        'netApprovedAmount',
        'verifiedSalaryDate',
      ];
      loanInclude.include = [
        disbursementInclude,
        emiInclude,
        subscriptionInclude,
        transactionInclude,
      ];
      const masterInclude: { model; attributes?; include? } = {
        model: MasterEntity,
      };
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarResponse',
        'aadhaarAddressResponse',
      ];
      masterInclude.include = [loanInclude];
      masterInclude.attributes = ['loanId', 'miscData'];
      include = [kycInclude, masterInclude];
      attributes = ['city', 'fullName', 'id', 'lastCrm', 'phone', 'state'];
      options.include = include;
      const userList = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;

      const preparedList = [];
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const loanData = masterData.loanData ?? {};
          const adminId = loanData.followerId;
          const crmData = userData.lastCrm ?? {};
          const disbursementList = loanData.disbursementData ?? [];
          const disbursementData = disbursementList[0];
          const emiList = loanData.emiData ?? [];
          const dueDateInfo = this.dateService.dateToReadableFormat(
            emiList[0].emi_date,
          );
          let pinCode = '-';
          try {
            const response = JSON.parse(kycData.aadhaarResponse);
            pinCode = response.zip ?? response.pincode ?? '-';
          } catch (error) {}
          const adminData = await this.commonService.getAdminData(adminId);
          let crmDate = '-';
          let ptpDate = '-';
          let ptpAmount = '-';
          if (crmData.createdAt) {
            const crmDateInfo = this.dateService.dateToReadableFormat(
              crmData.createdAt,
            );
            crmDate = crmDateInfo.readableStr;
            if (crmData.amount)
              ptpAmount = this.strService.readableAmount(crmData.amount);
            if (crmData.due_date) {
              const dueDateInfo = this.dateService.dateToReadableFormat(
                crmData.due_date,
              );
              ptpDate = dueDateInfo.readableStr;
            }
          }
          const approvedByAdmin = await this.commonService.getAdminData(
            loanData.manualVerificationAcceptId,
          );
          const disbursementDateInfo = this.dateService.dateToReadableFormat(
            loanData.loan_disbursement_date,
          );
          const subscriptionData = loanData.subscriptionData ?? {};
          const dueDetails: any =
            this.calculcation.getOverDueInsightsForLoan(loanData);
          preparedList.push({
            userId: userData.id,
            Name: userData.fullName ?? '-',
            'Loan Id': masterData.loanId ?? '-',
            Phone: this.cryptService.decryptPhone(userData.phone ?? '') ?? '',
            'Follower name': adminData.fullName ?? '-',
            'Approved amount':
              kRuppe +
              this.typeService.amountNumberWithCommas(
                +loanData.netApprovedAmount,
              ),
            'Delay days': emiList.reduce(
              (prev, curr) => prev + (curr.penalty_days ?? 0),
              0,
            ),
            'Due date': dueDateInfo.readableStr,
            'Due amount': this.strService.readableAmount(
              dueDetails.totalExpected,
            ),
            'Amount to be recovered': this.strService.readableAmount(
              dueDetails.totalRemaining,
            ),
            'Disbursement date': disbursementDateInfo.readableStr,
            'Disbursement amount': this.strService.readableAmount(
              Math.floor(disbursementData.amount / 100).toString(),
            ),
            'Salary date': loanData.verifiedSalaryDate ?? '-',
            'Mandate source': subscriptionData.mode ?? kSigndesk,
            City: this.strService.makeFirstLetterCapital(userData.city ?? '-'),
            State: this.strService.makeFirstLetterCapital(
              userData.state ?? '-',
            ),
            Pincode: pinCode ?? '-',
            'Aadhaar address':
              this.typeService.getAadhaarAddress(kycData).address ?? '-',
            'Type address':
              this.typeService.getUserTypeAddress(
                userData.typeAddress ?? '-',
              ) ?? '-',
            'User location': masterData?.miscData?.lastLocation ?? '-',
            'Approved by': approvedByAdmin.fullName ?? '-',
            'CRM date': crmDate ?? '-',
            'CRM disposition': crmData.dispositionName ?? '-',
            'CRM description': crmData.remark ?? '-',
            'PTP date': ptpDate,
            'PTP amount': ptpAmount,
            'CRM added by': crmData.adminName ?? '-',
          });
        } catch (error) {}
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['UnTouched PTPs'],
          data: [preparedList],
          sheetName: 'UnTouched PTPs.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count: unTouchedPTPs, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async dayWiseDetails(reqData) {
    try {
      const sorting = reqData.sorting ?? 'Delay days';
      const sortingType = reqData.sortingType ?? 'ASC';
      const justData = reqData.justData == 'true';
      const isDownload = reqData.download == 'true';
      const isNotification = reqData.notification?.toString() == 'true';
      const loanList: any = await this.getDataForDayWiseDetails(reqData);
      if (loanList?.message) return loanList;
      if (isNotification) return loanList;

      const finalizedLoanIds = loanList.rows.map((el) => el.id);

      //Options for PTP
      const PtpOptions = {
        where: {
          loanId: finalizedLoanIds,
          relationData: { titleId: { [Op.in]: ptpCrmIds } },
          due_date: { [Op.gte]: this.typeService.getGlobalDate(new Date()) },
        },
        order: [['id', 'DESC']],
      };
      const getPTPForLoans = await this.crmRepo.getTableWhereData(
        ['id', 'loanId', 'due_date', 'amount'],
        PtpOptions,
      );
      if (getPTPForLoans === k500Error) return kInternalError;

      const getEmis = await this.emiRepo.getTableWhereData(
        ['id', 'loanId', 'payment_status', 'payment_due_status'],
        { where: { loanId: finalizedLoanIds } },
      );
      if (getEmis === k500Error) return kInternalError;

      // Prepare list for front-end
      const count = loanList.count;
      let preparedList = [];
      const todayJson = this.typeService.getGlobalDate(new Date()).toJSON();
      for (let index = 0; index < loanList.rows.length; index++) {
        try {
          const loanData = loanList.rows[index];

          //set overDue EMIs count
          loanData.totalOverdueEmiCount = getEmis.filter(
            (item) =>
              item.loanId === loanData.id && item.payment_due_status === '1',
          ).length;

          //set upcoming EMIs count
          loanData.upcomingEmiCount = getEmis.filter(
            (item) =>
              item.loanId === loanData.id &&
              item.payment_status === '0' &&
              item.payment_due_status === '0',
          ).length;

          //set PTP details
          const findPtp = getPTPForLoans.find(
            (item) => item.loanId == loanData.id,
          );

          let fetchTime = '-';
          if (loanData?.balanceFetchDate != null) {
            const dateStr = this.dateService.dateToReadableFormat(
              new Date(loanData?.balanceFetchDate),
            );
            fetchTime = `${dateStr.readableStr} ${dateStr.hours}:${dateStr.minutes} ${dateStr.meridiem}`;
          }

          const legal_Status = legalString[loanData?.legalData?.type];
          let policyExpiryDate = null;
          if (loanData?.insuranceData?.response) {
            const responseData = JSON.parse(loanData.insuranceData.response);
            const policyInsurance = responseData.policyIssuance;
            if (Array.isArray(policyInsurance) && policyInsurance.length > 0) {
              const policy = policyInsurance[0];
              policyExpiryDate = policy.policy_expiry_date;
            }
          }
          if (policyExpiryDate) {
            const policyExpiryDateInfo = this.dateService.dateToReadableFormat(
              new Date(policyExpiryDate),
            );
            policyExpiryDate = policyExpiryDateInfo.readableStr;
          }
          const bankingData = loanData.bankingData ?? {};
          const subscriptionData = loanData.subscriptionData ?? {
            mode: kSigndesk,
          };
          const userData = loanData.registeredUsers ?? {};
          const crmData = userData.lastCrm ?? {};
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const disbursementList = loanData.disbursementData ?? [];
          const disbursementData = disbursementList[0];
          const empData = userData.employmentData ?? {};
          const cibilData = loanData.cibilData ?? {};
          let emiList = loanData.emiData ?? [];
          emiList = emiList.sort((a, b) => a.id - b.id);

          let smaType = '-';
          const futureEMI = emiList.find((el) => el.emi_date >= todayJson);
          //set part payments amount
          loanData.receivedPartPaymentAmount = 0;
          //set remaining interest amount to be recovered
          loanData.remainingInterestAmount = 0;
          //set remaining charges to be recovered
          loanData.remainingCharges = 0;
          //set remaining principal amount to be recovered
          loanData.remainingPrincipalAmount = 0;
          let totalDelayDays = 0;
          let lastOverDueEMI;
          emiList.forEach((el) => {
            try {
              if (
                el?.payment_due_status == '1' &&
                el?.penalty_days > totalDelayDays
              )
                totalDelayDays = el?.penalty_days;
              // SMAs category
              if (el.payment_due_status == '1' && !futureEMI) {
                lastOverDueEMI = el;
              }

              //update value of remaining principal amount to be recovered
              loanData.remainingPrincipalAmount +=
                el?.principalCovered - el?.paid_principal;

              //update value of remaining principal amount to be recovered
              loanData.remainingInterestAmount +=
                el?.interestCalculate - el?.paid_interest;

              //Update value of remaining charges
              loanData.remainingCharges +=
                (+el.regInterestAmount ?? 0) -
                (+el.paidRegInterestAmount ?? 0) +
                (+el.legalCharge ?? 0) +
                (+el.legalChargeGST ?? 0) -
                (+el.paidLegalCharge ?? 0) +
                (+el.penalty ?? 0) +
                (+el.dpdAmount ?? 0) +
                (+el.penaltyChargesGST ?? 0) -
                (+el.paidPenalCharge ?? 0) +
                (+el.bounceCharge ?? 0) +
                (+el.gstOnBounceCharge ?? 0) -
                (+el.paidBounceCharge ?? 0);

              const partPayments = el?.transactionData?.reduce(
                (total, item) => {
                  return item.type === 'PARTPAY'
                    ? total + item.paidAmount
                    : total;
                },
                0,
              );

              //update value of part payment amount
              loanData.receivedPartPaymentAmount += partPayments;
            } catch (error) {}
          });

          //manage charges amount
          loanData.remainingCharges = this.typeService.manageAmount(
            loanData.remainingCharges,
          );
          // SMAs category
          if (lastOverDueEMI?.penalty_days && !futureEMI) {
            if (lastOverDueEMI?.penalty_days <= 30) smaType = 'SMA-0';
            else if (lastOverDueEMI?.penalty_days <= 60) smaType = 'SMA-1';
            else if (lastOverDueEMI?.penalty_days <= 90) smaType = 'SMA-2';
            else if (lastOverDueEMI?.penalty_days > 90) smaType = 'NPA';
          }

          if (totalDelayDays == 0)
            totalDelayDays = emiList.reduce(
              (prev, curr) => prev + (curr.penalty_days ?? 0),
              0,
            );
          const firstEMIData = emiList[0];
          let dueAmount = emiList.reduce(
            (prev, curr) => prev + (parseFloat(curr.emi_amount) + curr.penalty),
            0,
          );
          dueAmount = Math.floor(dueAmount);
          const dueDateInfo = this.dateService.dateToReadableFormat(
            firstEMIData.emi_date,
          );
          let pinCode = '-';
          try {
            const response = JSON.parse(kycData.aadhaarResponse);
            pinCode = response.zip ?? response.pincode ?? '-';
          } catch (error) {}
          const disbursedDateInfo = this.dateService.dateToReadableFormat(
            loanData.loan_disbursement_date,
          );
          let crmDate = '-';
          if (crmData.createdAt) {
            const crmDateInfo = this.dateService.dateToReadableFormat(
              crmData.createdAt,
            );
            crmDate = crmDateInfo.readableStr;
          }

          const overDueCalculation: any =
            this.calculcation.getOverDueInsightsForLoan(loanData);
          const obj: any = {
            userId: loanData.userId,
            'Loan ID': loanData.id,
            Name: userData.fullName ?? '-',
            Phone: this.cryptService.decryptPhone(userData.phone),
            Follower: (
              await this.commonService.getAdminData(loanData.followerId)
            ).fullName,
            Email: userData.email ?? '-',
            WorkMail: userData?.employmentData?.workMail?.email ?? '-',
            'App platform':
              EnvConfig?.platFormName?.app[loanData?.appType ?? 0] ?? '-',
            LegalStatus: legal_Status ?? '-',
            'Approved amount': this.strService.readableAmount(
              loanData.netApprovedAmount,
            ),
            'Delay days': totalDelayDays,
            'SMA category': smaType,
            'Cibil score': cibilData.cibilScore ?? '-',
            'PL score': cibilData.plScore ?? '-',
            'Completed loans': userData?.completedLoans ?? '0',
            'Due date': dueDateInfo.readableStr,
            'Current balance':
              loanData?.currentAccountBalance != null
                ? +loanData?.currentAccountBalance
                : '-',
            'Fetch time': fetchTime,
            'Eligible For PromoCode':
              loanData.registeredUsers.eligibleForPromoCode,
            'Total remaining amount': this.strService.readableAmount(
              overDueCalculation.totalRemaining,
              isDownload,
            ),
            'Remaining EMI amount': this.strService.readableAmount(
              overDueCalculation.totalRemainingPI,
              isDownload,
            ),
            'Total overdue EMI': loanData?.totalOverdueEmiCount,
            'Upcoming EMI': loanData?.upcomingEmiCount,
            'Remaining principal': this.strService.readableAmount(
              loanData?.remainingPrincipalAmount,
            ),
            'Remaining interest': this.strService.readableAmount(
              loanData?.remainingInterestAmount,
            ),
            'Remaining charges': this.strService.readableAmount(
              loanData?.remainingCharges,
            ),
            'Received part payment': this.strService.readableAmount(
              loanData?.receivedPartPaymentAmount,
            ),
            'Disbursement date': disbursedDateInfo.readableStr ?? '-',
            'Disbursement amount': this.strService.readableAmount(
              Math.floor(disbursementData.amount / 100),
            ),
            'Salary date': loanData.verifiedSalaryDate ?? '-',
            'Mandate source': subscriptionData.mode ?? '-',
            'Company name': empData?.companyName ?? '-',
            City: this.strService.makeFirstLetterCapital(userData.city ?? '-'),
            State: this.strService.makeFirstLetterCapital(
              userData.state ?? '-',
            ),
            Pincode: pinCode,
            'Aadhaar address':
              this.typeService.getAadhaarAddress(kycData).address ?? '-',
            'Type address':
              this.typeService.getUserTypeAddress(
                userData.typeAddress ?? '-',
              ) ?? '-',
            'User location': masterData?.miscData?.lastLocation ?? '-',
            'AA User': bankingData.consentId ? 'Yes' : 'No',
            Insurance: loanData?.insuranceId ? 'Yes' : 'No',
            'Insurance End Date': policyExpiryDate ?? '-',
            'CRM date': crmDate ?? '-',
            'CRM disposition': crmData.dispositionName ?? '-',
            'CRM description': crmData.remark ?? '-',
            'CRM added by': crmData.adminName ?? '-',
            'Approved by': (
              await this.commonService.getAdminData(
                loanData.manualVerificationAcceptId,
              )
            ).fullName,
            lastOnlineTime: userData.lastOnlineTime,
            otherEMIdue: emiList.length > 1,
            appType: loanData?.appType,
            'Last PTP amount': findPtp?.amount
              ? this.strService.readableAmount(findPtp?.amount)
              : '-',
            'Last PTP due date': findPtp?.due_date
              ? this.dateService.dateToReadableFormat(findPtp?.due_date)
                  .readableStr
              : '-',
          };
          if (isDownload)
            obj.lastSeenInMin =
              this.typeService.getLastActiveUserTime(userData.lastOnlineTime)
                ?.lastActiveAgoMinutes ?? '-';
          preparedList.push(obj);
        } catch (error) {}
      }
      if (justData) return preparedList;
      if (sorting == 'Delay days' && sortingType == 'ASC') {
        preparedList = preparedList.sort(
          (a, b) => a['Delay days'] - b['Delay days'],
        );
      } else if (sorting == 'Delay days' && sortingType == 'DESC') {
        preparedList = preparedList.sort(
          (b, a) => a['Delay days'] - b['Delay days'],
        );
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Defaulter users'],
          data: [preparedList],
          sheetName: 'Defaulter users.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForDayWiseDetails(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const minPenaltyDays = reqData.minPenaltyDays;
      const maxPenaltyDays = reqData.maxPenaltyDays;
      const page = reqData.page;
      const isDownload = reqData.download == 'true';
      const isMonthData = reqData?.isMonthData ?? false;
      const isNotification = reqData.notification?.toString() == 'true';
      if (!isMonthData && !page && !isDownload && !isNotification)
        return kParamMissing('page');

      const searchData: any = this.common.getSearchData(reqData.searchText);
      if (searchData?.message) return searchData;

      const sorting = reqData.sorting ?? 'Delay days';
      const sortingType = reqData.sortingType ?? 'ASC';

      // Table joins
      const loanInclude: { model; attributes?; where? } = {
        model: loanTransaction,
      };
      loanInclude.attributes = ['id'];
      loanInclude.where = { followerId: adminId };
      const insuranceInclude: { model; attributes? } = {
        model: InsuranceEntity,
      };
      insuranceInclude.attributes = ['id', 'response'];
      let include = [loanInclude];
      // Query preparation
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      let attributes: any = ['loanId'];
      let options: any = {
        limit: PAGE_LIMIT,
        offset,
        order: [],
        group: ['loanId'],
        where: { payment_status: '0', payment_due_status: '1' },
      };
      if (
        isDownload ||
        isNotification ||
        sorting == 'Demand letter' ||
        isMonthData
      ) {
        delete options.offset;
        delete options.limit;
      }
      if (searchData.text != '') {
        // Search by user's name
        if (searchData.type == 'Name') {
          const userInclude: { model; attributes?; where? } = {
            model: registeredUsers,
          };
          userInclude.where = { fullName: { [Op.iRegexp]: searchData.text } };
          options.include = [userInclude];
          options.group.push('"user.id"');
        } // Search by user's phone
        else if (searchData.type == 'Number') {
          const userInclude: { model; attributes?; where? } = {
            model: registeredUsers,
          };
          userInclude.where = { phone: { [Op.like]: searchData.text } };
          options.include = [userInclude];
          options.group.push('"user.id"');
          // Search by loanId
        } else if (searchData.type == 'LoanId')
          options.where.loanId = searchData.text;
      }

      let having;
      if (minPenaltyDays && !maxPenaltyDays)
        having = Sequelize.literal(`SUM("penalty_days") >= ${minPenaltyDays}`);
      else if (!minPenaltyDays && maxPenaltyDays)
        having = Sequelize.literal(`SUM("penalty_days") <= ${maxPenaltyDays}`);
      else if (minPenaltyDays && maxPenaltyDays) {
        having = Sequelize.literal(`SUM("penalty_days") >= ${minPenaltyDays}
        AND SUM("penalty_days") <= ${maxPenaltyDays}`);
      }
      if (adminId != -1) {
        options.include = include;
        options.group.push('"loan.id"');
      }
      if (sorting == 'Delay days') {
        if (sortingType == 'ASC')
          options.order.push([
            Sequelize.literal(`SUM("penalty_days"), "loanId"`),
          ]);
        else if (sortingType == 'DESC')
          options.order.push([
            Sequelize.literal(`SUM("penalty_days") DESC, "loanId"`),
          ]);
        else return kInvalidParamValue('sortingType');
      }
      if (having) options.having = having;
      // Query
      let loanIdList = await this.emiRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (loanIdList == k500Error) return kInternalError;
      const loanIds = loanIdList.rows.map((el) => el.loanId);
      // Query preparation
      if (!isNotification) {
        attributes = [
          'followerId',
          'id',
          'loan_disbursement_date',
          'manualVerificationAcceptId',
          'netApprovedAmount',
          'userId',
          'verifiedSalaryDate',
          'insuranceId',
          'appType',
          'currentAccountBalance',
          'balanceFetchDate',
        ];
      } else attributes = ['userId', 'appType'];
      const predictionInclude: { model; attributes? } = {
        model: PredictionEntity,
      };
      predictionInclude.attributes = ['id', 'categorizationTag'];
      const bankingInclude: { model; attributes? } = { model: BankingEntity };
      bankingInclude.attributes = ['consentId'];
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = ['amount'];
      const transactionInclude: { model; attributes?; where?; required? } = {
        model: TransactionEntity,
      };
      transactionInclude.required = false;
      transactionInclude.where = {
        status: kCompleted,
        type: { [Op.ne]: 'REFUND' },
      };
      transactionInclude.attributes = [
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
        'type',
        'paidAmount',
      ];
      const emiInclude: { model; attributes?; where?; include? } = {
        model: EmiEntity,
      };
      if (!isNotification) {
        emiInclude.attributes = [
          'emi_amount',
          'emi_date',
          'penalty',
          'id',
          'penalty_days',
          'principalCovered',
          'interestCalculate',
          'payment_due_status',
          'legalId',
          'unpaid_waiver',
          'payment_status',
          'paid_principal',
          'paid_interest',
          'regInterestAmount',
          'paidRegInterestAmount',
          'legalCharge',
          'legalChargeGST',
          'paidLegalCharge',
          'dpdAmount',
          'penaltyChargesGST',
          'paidPenalCharge',
          'bounceCharge',
          'gstOnBounceCharge',
          'paidBounceCharge',
        ];
      } else emiInclude.attributes = ['id'];
      emiInclude.include = [transactionInclude];
      emiInclude.where = { payment_status: '0', payment_due_status: '1' };
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarResponse',
        'aadhaarAddressResponse',
      ];
      const masterInclude: { model; attributes? } = { model: MasterEntity };
      masterInclude.attributes = ['miscData'];
      const cibilScoreInclude: { model; attributes? } = {
        model: CibilScoreEntity,
      };
      const worMailInclude: any = { model: WorkMailEntity };
      worMailInclude.attributes = ['email'];
      cibilScoreInclude.attributes = ['id', 'userId', 'cibilScore', 'plScore'];
      const companyInclude: any = { model: employmentDetails };
      companyInclude.attributes = ['id', 'companyName'];
      companyInclude.include = [worMailInclude];
      const userInclude: { model; attributes?; include? } = {
        model: registeredUsers,
      };
      userInclude.attributes = [
        'city',
        'fullName',
        'lastCrm',
        'lastOnlineTime',
        'phone',
        'email',
        'state',
        'typeAddress',
        'completedLoans',
        'eligibleForPromoCode',
        'appType',
      ];
      userInclude.include = [kycInclude, masterInclude, companyInclude];
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = ['mode'];
      const legalCollectionInclude: { model; attributes?; required?; where? } =
        {
          model: LegalCollectionEntity,
        };
      legalCollectionInclude.attributes = ['id', 'type'];
      legalCollectionInclude.required = false;
      // legalCollectionInclude.where = { type: { [Op.in]: [1, 2] } };
      include = [emiInclude];
      if (!isNotification) {
        include = [
          ...include,
          bankingInclude,
          disbursementInclude,
          legalCollectionInclude,
          subscriptionInclude,
          userInclude,
          predictionInclude,
          insuranceInclude,
          cibilScoreInclude,
        ];
      }
      options = {
        include,
        where: { id: loanIds },
      };

      let legalList: any = [];
      if (!isNotification) {
        const options = {
          group: ['emiId', 'loanId', 'type'],
          where: {
            emiId: { [Op.ne]: null },
            loanId: { [Op.in]: loanIds },
            type: { [Op.in]: [1, 2] },
          },
        };
        const attributes = ['emiId', 'loanId', 'type'];
        legalList = await this.legalCollectionRepo.getTableWhereData(
          attributes,
          options,
        );
        if (legalList == k500Error) return kInternalError;
      }
      let legalCount = 0;
      if (sorting == 'Demand letter') {
        const tempLoanList = await this.loanRepo.getTableWhereData(['id'], {
          include: [emiInclude],
          where: { id: loanIds },
        });
        if (tempLoanList == k500Error) return kInternalError;
        tempLoanList.forEach((el) => {
          legalList.forEach((subEl) => {
            const loanId = subEl.loanId;
            const emiId = subEl.emiId;
            if (el.id == loanId) {
              if (!el.legalList) el.legalEmiList = [];
              el.legalEmiList.push(emiId);
            }
          });
          // For old users we need to manage it via Emi Table (Migration issue)
          el.emiData?.forEach((subEl) => {
            if (subEl.legalId) {
              if (!el.legalList) el.legalEmiList = [];
              el.legalEmiList.push(subEl.id);
            }
          });

          const legalEmiList = el.legalEmiList ?? [];
          const emiList = el.emiData ?? [];
          el.isDLSent = legalEmiList.length == emiList.length;
        });
        let legalLoanIds = [];
        if (sortingType == 'SENT') {
          const filteredLoans = tempLoanList.filter((el) => el.isDLSent);
          legalCount = filteredLoans.length;
          legalLoanIds = filteredLoans.map((el) => el.id);
        } else if (sortingType == 'NOT SENT') {
          const filteredLoans = tempLoanList.filter((el) => !el.isDLSent);
          legalCount = filteredLoans.length;
          legalLoanIds = filteredLoans.map((el) => el.id);
        }
        options.where.id = legalLoanIds;
        if ((!isDownload && !isNotification) || !isMonthData) {
          options.limit = PAGE_LIMIT;
          options.offset = offset;
        }
      }

      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      if (!isNotification) {
        loanList.forEach((el) => {
          legalList.forEach((subEl) => {
            const loanId = subEl.loanId;
            const emiId = subEl.emiId;
            if (el.id == loanId) {
              if (!el.legalData?.id) {
                el.legalData = { type: subEl.type };
              }
              if (!el.legalList) el.legalEmiList = [];
              el.legalEmiList.push(emiId);
            }
          });
          // For old users we need to manage it via Emi Table (Migration issue)
          el.emiData?.forEach((subEl) => {
            if (subEl.legalId) {
              if (!el.legalList) el.legalEmiList = [];
              el.legalEmiList.push(subEl.id);
            }
          });
        });
      } else {
        const userData = loanList.map((el) => ({
          userId: el.userId,
          appType: el.appType,
        }));

        return userData;
      }

      return {
        rows: loanList,
        count:
          sorting == 'Demand letter' ? legalCount : loanIdList.count.length,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async loanAssetsData(reqData) {
    const loanData = await this.dayWiseDetails(reqData);
    const today = new Date();
    today.setDate(today.getDate() - 548);
    let before18count = 0;
    let after18count = 0;
    let beforAmount = 0;
    let afterAmount = 0;
    loanData.rows.forEach((data) => {
      const date = this.dateService.readableStrToDate(
        data['Disbursement date'],
      );
      const remainingEmi = parseInt(
        data['Remaining emi amount to be recovered'].replace(/[₹,]/g, ''),
        10,
      );
      if (date > today) {
        after18count++;
        afterAmount += remainingEmi;
      } else {
        before18count++;
        beforAmount += remainingEmi;
      }
    });
    return {
      subStandardcount: after18count,
      subStandardamount: afterAmount,
      doubtfulcount: before18count,
      doubtfulamount: beforAmount,
    };
  }

  async collectionSummary(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const isCountOnly = reqData.isCount == 'true';
      const isDownload = (reqData.download?.toString() ?? 'false') == 'true';
      const type = reqData.type ?? '';

      let adminList = [];
      if (adminId != -1) adminList.push(adminId);
      else adminList = await this.getTargetAdmins(adminId);
      reqData.adminList = adminList;

      // Call details
      const callData: any = await this.callSummary(reqData);
      if (callData?.message) return callData;

      // PTP details
      const ptpSummary: any = await this.ptpSummary(reqData);
      if (ptpSummary?.message) return ptpSummary;

      if (isCountOnly) return { callData, ptpSummary };

      // Fine tune and merge data
      const adminData = {};
      reqData.adminList.forEach((el) => {
        adminData[el] = {
          'Total PTPs': [],
          'Paid PTPs': [],
          'Unique calls': [],
          'Non connected calls': [],
        };
      });
      callData.forEach((el) => {
        try {
          const adminId = el.adminId;
          delete el.adminId;
          adminData[adminId]['Unique calls'].push(el);
          if (el.status == 'NOT RECEIVED')
            adminData[adminId]['Non connected calls'].push(el);
        } catch (error) {}
      });
      ptpSummary.forEach((el) => {
        try {
          const adminId = el.adminId;
          delete el.adminId;
          adminData[adminId]['Total PTPs'].push(el);
          if (el.paid) adminData[adminId]['Paid PTPs'].push(el);
        } catch (error) {}
      });

      const finalizedList = [];
      for (const key in adminData) {
        const value = adminData[key];
        value.adminId = key;
        value.name = (await this.commonService.getAdminData(key)).fullName;
        const totalPTPs = (value['Total PTPs'] ?? []).length;
        const totalPTPAmount = (value['Total PTPs'] ?? []).reduce(
          (prev, curr) => prev + curr['Amount'],
          0,
        );
        const paidPTPs = (value['Paid PTPs'] ?? []).length;
        const receivedPTPAmount = (value['Paid PTPs'] ?? []).reduce(
          (prev, curr) => prev + curr['Received Amount'],
          0,
        );
        let ptpSuccessRatio = '0%';
        let ptpAmountSuccessRatio = '0%';
        if (totalPTPs != 0) {
          ptpSuccessRatio =
            parseFloat(((paidPTPs * 100) / totalPTPs).toFixed(2)) + '%';
          ptpAmountSuccessRatio =
            parseFloat(
              ((receivedPTPAmount * 100) / totalPTPAmount).toFixed(2),
            ) + '%';
        }
        value.summary = {
          PTP: totalPTPs,
          'PTP action': paidPTPs,
          'PTP percentage': ptpSuccessRatio,
          Achievement: ptpAmountSuccessRatio,
        };
        finalizedList.push(value);
      }

      finalizedList.forEach((el) => {
        el['Total PTPs'].forEach((subEl) => {
          subEl['Amount'] = this.strService.readableAmount(subEl['Amount']);
        });
        el['Paid PTPs'].forEach((subEl) => {
          if (!subEl['Amount'].includes(kRuppe)) {
            subEl['Amount'] = this.strService.readableAmount(subEl['Amount']);
          }
        });
        el['Total PTPs'].forEach((subEl) => {
          if (subEl['Received Amount'] != '-')
            subEl['Received Amount'] = this.strService.readableAmount(
              subEl['Received Amount'],
            );
        });
        el['Paid PTPs'].forEach((subEl) => {
          if (!subEl['Received Amount'].includes(kRuppe)) {
            subEl['Received Amount'] = this.strService.readableAmount(
              subEl['Received Amount'],
            );
          }
        });
      });

      if (isDownload) {
        let sheetNames;
        const excelDataList = [];
        const excelData: any = {};
        const fromDateInfo = this.dateService.dateToReadableFormat(
          reqData.minDate,
        );
        const toDateInfo = this.dateService.dateToReadableFormat(
          reqData.maxDate,
        );

        if ((type ?? '') != '') {
          if (!adminId) return kInvalidParamValue('adminId');
          const adminData = finalizedList.find((el) => el.adminId == adminId);
          // Download all available admin's data
          if (!adminData) {
            finalizedList.forEach((el) => {
              const targetList = el[type] ?? [];
              targetList.forEach((subEl) => {
                const ptpDate = subEl['Due date'];
                delete subEl['Due date'];
                delete subEl.userId;
                if (subEl.Amount?.includes(kRuppe))
                  subEl.Amount = subEl.Amount.replace(/₹/g, '');
                if (subEl['Received Amount']?.includes(kRuppe))
                  subEl['Received Amount'] = subEl['Received Amount'].replace(
                    /₹/g,
                    '',
                  );
                excelDataList.push({
                  'Follower name': el.name ?? '',
                  Date: ptpDate,
                  ...subEl,
                });
              });
            });
          } // Download particular admin's data
          else {
            let targetList = adminData[type];
            if (targetList.length == 0)
              return k422ErrorMessage(`${type} has no data`);
            targetList = targetList.forEach((el) => {
              const ptpDate = el['Due date'];
              delete el['Due date'];
              delete el.userId;
              if (el.Amount?.includes(kRuppe))
                el.Amount = el.Amount.replace(/₹/g, '');
              if (el['Received Amount']?.includes(kRuppe))
                el['Received Amount'] = el['Received Amount'].replace(/₹/g, '');
              excelDataList.push({
                'Follower name': adminData.name ?? '',
                Date: ptpDate,
                ...el,
              });
            });
          }
        } else {
          // Separate data into different arrays based on types
          const totalPTPsData = [];
          const paidPTPsData = [];
          const uniqueCallsData = [];
          const nonConnectedCallsData = [];
          finalizedList.forEach((el) => {
            excelDataList.push({
              'Follower name': el.name ?? '-',
              Date: fromDateInfo.readableStr + ' to ' + toDateInfo.readableStr,
              'Total PTPs': this.strService.readableAmount(
                el['Total PTPs'].length,
                true,
              ),
              'Paid PTPs': this.strService.readableAmount(
                el['Paid PTPs'].length,
                true,
              ),
              'PTP percentage': (el.summary ?? {})['PTP percentage'],
              Achievement: (el.summary ?? {})['Achievement'],
              'Unique calls': this.strService.readableAmount(
                el['Unique calls'].length,
                true,
              ),
              'Non connected calls': this.strService.readableAmount(
                el['Non connected calls'].length,
                true,
              ),
            });
            totalPTPsData.push(
              ...el['Total PTPs'].map(({ userId, ...rest }) => {
                // Remove currency symbol from 'Amount'
                const amount = rest.Amount.replace(/₹/g, '');
                // Remove currency symbol from 'Received Amount'
                const receivedAmount = rest['Received Amount'].replace(
                  /₹/g,
                  '',
                );
                return {
                  'Follower name': el.name ?? '-',
                  ...rest,
                  Amount: amount,
                  'Received Amount': receivedAmount,
                };
              }),
            );
            paidPTPsData.push(
              ...el['Paid PTPs'].map(({ userId, ...rest }) => {
                // Remove currency symbol from 'Amount'
                const amount = rest.Amount.replace(/₹/g, '');
                // Remove currency symbol from 'Received Amount'
                const receivedAmount = rest['Received Amount'].replace(
                  /₹/g,
                  '',
                );
                return {
                  'Follower name': el.name ?? '-',
                  ...rest,
                  Amount: amount,
                  'Received Amount': receivedAmount,
                };
              }),
            );
            uniqueCallsData.push(
              ...el['Unique calls'].map(({ ...rest }) => {
                return {
                  'Follower name': el.name ?? '-',
                  ...rest,
                };
              }),
            );
            nonConnectedCallsData.push(
              ...el['Non connected calls'].map(({ ...rest }) => {
                return {
                  'Follower name': el.name ?? '-',
                  ...rest,
                };
              }),
            );
          });
          excelData['Collection summary'] = excelDataList;
          excelData['Total PTPs'] = totalPTPsData;
          excelData['Paid PTPs'] = paidPTPsData;
          excelData['Unique calls'] = uniqueCallsData;
          excelData['Non connected calls'] = nonConnectedCallsData;
          sheetNames = Object.keys(excelData);
        }
        let rawExcelData;
        if (excelData && Object.keys(excelData).length > 0 && sheetNames) {
          const sheetDataList = sheetNames.map(
            (sheetName) => excelData[sheetName],
          );
          rawExcelData = {
            sheets: sheetNames,
            data: sheetDataList,
            sheetName: (type ?? '') != '' ? type : 'Collection summary',
            needFindTuneKey: false,
          };
        } else {
          rawExcelData = {
            sheets: [(type ?? '') != '' ? type : 'Collection summary'],
            data: [excelDataList],
            sheetName: (type ?? '') != '' ? type : 'Collection summary',
            needFindTuneKey: false,
          };
        }
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }
      return finalizedList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async callSummary(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount == 'true';
      const minDate = reqData.minDate;
      if (!minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (!maxDate) return kParamMissing('maxDate');
      const range = this.dateService.utcDateRange(minDate, maxDate);

      // Query preparation
      let attributes: any = [[Sequelize.fn('MAX', Sequelize.col('id')), 'id']];
      let options: any = {
        group: ['loanId'],
        where: {
          adminId: { [Op.in]: reqData.adminList },
          callSid: { [Op.ne]: null },
          createdAt: { [Op.gte]: range.minRange, [Op.lte]: range.maxRange },
          relationData: { dispositionId: { [Op.in]: [1, 2] } },
        },
      };
      // Query
      let crmIds: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (crmIds == k500Error) return kInternalError;
      crmIds = crmIds.map((el) => el.id);
      const totalCalls = crmIds.length;

      // Pagination data
      const include = [];
      if (!isCountOnly) {
        const userInclude: { model; attributes? } = { model: registeredUsers };
        userInclude.attributes = ['fullName', 'phone'];
        include.push(userInclude);
        attributes = [
          'adminId',
          'createdAt',
          'loanId',
          'relationData',
          'userId',
        ];
        options = { include, where: { id: crmIds } };
        let targetList;
        // All calls
        targetList = await this.crmRepo.getTableWhereData(attributes, options);
        if (targetList == k500Error) return kInternalError;
        // Fine tuning
        const preparedList = [];
        targetList.forEach((el) => {
          try {
            const userData = el.registeredUsers ?? {};
            const dateInfo = this.dateService.dateToReadableFormat(
              el.createdAt,
            );
            const dispositionId = el.relationData?.dispositionId;
            const data = {
              adminId: el.adminId,
              name: userData.fullName ?? '-',
              Phone: this.cryptService.decryptPhone(userData.phone ?? '') ?? '',
              userId: el.userId,
              loanId: el.loanId,
              callTime:
                dateInfo.readableStr +
                ' ' +
                dateInfo.hours +
                ':' +
                dateInfo.minutes +
                dateInfo.meridiem,
              status: dispositionId == 1 ? 'RECEIVED' : 'NOT RECEIVED',
            };
            preparedList.push(data);
          } catch (error) {}
        });
        return preparedList;
      }

      // Connected calls
      attributes = ['id'];
      delete options.group;
      options.where.id = { [Op.in]: crmIds };
      options.where.relationData = { dispositionId: 1 };
      // Query
      const connectedCalls = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (connectedCalls == k500Error) return kInternalError;

      // Not connected calls
      attributes = ['id'];
      delete options.group;
      options.where.id = { [Op.in]: crmIds };
      options.where.relationData = { dispositionId: 2 };
      // Query
      const notConnectedCalls = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (notConnectedCalls == k500Error) return kInternalError;

      if (isCountOnly)
        return {
          totalCalls,
          connectedCalls: connectedCalls.length,
          notConnectedCalls: notConnectedCalls.length,
        };

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async ptpSummary(reqData) {
    try {
      // Params validation
      const isCountOnly = reqData.isCount == 'true';
      const minDate = reqData.minDate;
      if (!minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (!maxDate) return kParamMissing('maxDate');
      const range = this.dateService.utcDateRange(minDate, maxDate);
      let adminIds = reqData.adminList ?? [];
      // Due to re shuffling of cases happens anytime
      const allAdminIds = await this.getTargetAdmins(-1);

      if (!Array.isArray(adminIds)) {
        adminIds = [adminIds];
      }
      // Active loanIds
      let attributes: any = ['id'];
      let options: any = {
        where: {
          followerId: { [Op.in]: adminIds },
          loanStatus: {
            [Op.or]: [{ [Op.eq]: 'Active' }, { [Op.eq]: 'Complete' }],
          },
        },
      };
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;
      const loanIds = loanList.map((el) => el.id);

      // Query preparation
      attributes = [
        'amount',
        'loanId',
        'transactionId',
        [Sequelize.fn('MAX', Sequelize.col('crmActivity.id')), 'id'],
      ];
      // Loan table join
      const loanInclude: SequelOptions = { model: loanTransaction };
      loanInclude.attributes = ['followerId'];
      const include = [loanInclude];
      options = {
        include,
        group: ['amount', 'loanId', 'transactionId', 'loanData.id'],
        where: {
          relationData: { titleId: { [Op.in]: ptpCrmIds } },
          adminId: { [Op.in]: allAdminIds },
          due_date: { [Op.gte]: range.minRange, [Op.lte]: range.maxRange },
        },
      };

      if (!isCountOnly) {
        // Query preparation
        attributes = [[Sequelize.fn('MAX', Sequelize.col('id')), 'id']];
        options = {
          group: ['loanId'],
          where: {
            relationData: { titleId: { [Op.in]: ptpCrmIds } },
            adminId: { [Op.in]: allAdminIds },
            due_date: { [Op.gte]: range.minRange, [Op.lte]: range.maxRange },
          },
        };
        // Query
        let crmIds: any = await this.crmRepo.getTableWhereData(
          attributes,
          options,
        );
        if (crmIds == k500Error) return kInternalError;
        crmIds = crmIds.map((el) => el.id);

        // Query preparation
        attributes = [
          'adminId',
          'amount',
          'due_date',
          'loanId',
          'transactionId',
          'userId',
          'totalReceivedAmount',
        ];
        const userInclude: { model; attributes? } = { model: registeredUsers };
        userInclude.attributes = ['fullName', 'phone'];
        const transactionInclude: SequelOptions = { model: TransactionEntity };
        transactionInclude.attributes = ['completionDate', 'paidAmount'];
        const include = [loanInclude, userInclude, transactionInclude];
        options = {
          include,
          where: { id: crmIds },
          order: [['due_date', 'ASC']],
        };
        // Query
        const crmList: any = await this.crmRepo.getTableWhereData(
          attributes,
          options,
        );
        if (crmList == k500Error) return kInternalError;

        const preparedList = [];
        crmList.forEach((el) => {
          try {
            // Here we are taking current follower as ptp admin due to re shuffling issue
            el.adminId = el.loanData?.followerId;
            const userData: any = el.registeredUsers ?? {};
            const dateInfo = this.dateService.dateToReadableFormat(
              this.typeService.getGlobalDate(el.due_date),
            );
            const data: any = {
              userId: el.userId,
              Name: userData.fullName ?? '',
              Phone: this.cryptService.decryptPhone(userData.phone) ?? '',
              'Loan Id': el.loanId,
              Amount: Math.floor(el.amount ?? 0),
              // Here we are taking current follower as ptp admin due to re shuffling issue
              adminId: el.loanData?.followerId,
              paid: el.transactionId ? true : false,
              'Received Amount': '-',
              'Due date': dateInfo.readableStr,
              'Received date': '-',
            };
            if (data.paid) {
              const dateInfo = this.dateService.dateToReadableFormat(
                el.due_date,
              );
              data['Due date'] = dateInfo.readableStr;
              data['Received Amount'] = Math.floor(el.totalReceivedAmount);
              const dateDetail = this.dateService.dateToReadableFormat(
                el.transactionData?.completionDate,
              );
              data['Received date'] = dateDetail.readableStr;
              preparedList.push(data);
            } else if (loanIds.includes(el.loanId)) {
              preparedList.push(data);
            }
          } catch (error) {}
        });
        return preparedList;
      }

      // Query
      let crmList: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (crmList == k500Error) return kInternalError;
      const finalizedList = [];
      const finalizedLoanIds = [];
      crmList.forEach((el) => {
        // Prevent duplication
        if (!finalizedLoanIds.includes(el.loanId)) {
          if (
            adminIds.includes(el.loanData?.followerId?.toString()) ||
            adminIds.includes(el.loanData?.followerId)
          ) {
            finalizedLoanIds.push(el.loanId);
            finalizedList.push(el);
          }
        }
      });
      crmList = finalizedList;
      // Calculation
      let totalAmount = crmList.reduce(
        (prev, curr) => Math.floor(prev + curr.amount),
        0,
      );
      totalAmount =
        kRuppe + this.typeService.amountNumberWithCommas(totalAmount);
      const paidPTPs = crmList.filter((el) => el.transactionId).length;
      const unPaidPTPList = crmList.filter(
        (el) => !el.transactionId && loanIds.includes(el.loanId),
      );
      const unPaidPTPs = unPaidPTPList.length;
      const totalPtps = paidPTPs + unPaidPTPs;
      let successRatio =
        parseFloat(((paidPTPs * 100) / totalPtps).toFixed(2)).toString() + '%';
      if (totalPtps == 0) successRatio = 0 + '%';

      return { totalPtps, totalAmount, paidPTPs, successRatio, unPaidPTPs };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async onlineUsers(reqData) {
    // Params validation
    const adminId = reqData.adminId;
    if (!adminId) return kParamMissing('adminId');
    const isCountOnly = reqData.isCount == 'true';
    const page = reqData.page;
    if (!page && !isCountOnly) return kParamMissing('page');

    // Range preparation
    const adminList = await this.getTargetAdmins(adminId);
    const minTime = new Date();
    minTime.setMinutes(minTime.getMinutes() - 10);
    const lastOnlineTime = minTime.toJSON();

    const rawQuery = `SELECT "id" FROM "registeredUsers"
      WHERE "loanStatus" = '3' AND "lastOnlineTime" >= '${lastOnlineTime}'`;
    const outputList = await this.repo.injectRawQuery(
      registeredUsers,
      rawQuery,
      { source: 'REPLICA' },
    );
    if (outputList == k500Error) throw new Error();

    let userIds = outputList;
    if (userIds === k500Error) return kInternalError;
    userIds = userIds.map((el) => el?.id);

    // Query preparation
    let options: any = {
      where: {
        followerId: { [Op.in]: adminList },
        userId: { [Op.in]: userIds },
        loanStatus: 'Active',
      },
    };
    // Query
    if (isCountOnly) {
      const count = await this.loanRepo.getCountsWhere(options);
      if (count == k500Error) return kInternalError;
      return { count };
    }
    const kycInclude: { model; attributes? } = { model: KYCEntity };
    kycInclude.attributes = [
      'aadhaarAddress',
      'aadhaarResponse',
      'aadhaarAddressResponse',
    ];
    const masterInclude: { model; attributes? } = {
      model: MasterEntity,
    };
    masterInclude.attributes = ['miscData'];
    const userInclude: { model; attributes?; include? } = {
      model: registeredUsers,
    };
    userInclude.attributes = [
      'city',
      'fullName',
      'lastOnlineTime',
      'phone',
      'state',
      'typeAddress',
    ];
    userInclude.include = [masterInclude, kycInclude];
    const emiInclude: { model; attributes? } = { model: EmiEntity };
    emiInclude.attributes = [
      'emi_amount',
      'emi_date',
      'penalty',
      'id',
      'penalty_days',
    ];
    const bankingInclude: { model; attributes? } = { model: BankingEntity };
    bankingInclude.attributes = ['salaryDate'];
    const disbursementInclude: { model; attributes? } = {
      model: disbursementEntity,
    };
    disbursementInclude.attributes = ['amount'];
    const include = [
      bankingInclude,
      disbursementInclude,
      emiInclude,
      userInclude,
    ];
    options.include = include;
    options.limit = PAGE_LIMIT;
    options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
    const attributes = [
      'followerId',
      'id',
      'loan_disbursement_date',
      'manualVerificationAcceptId',
      'netApprovedAmount',
      'userId',
    ];
    const loanList = await this.loanRepo.getTableWhereDataWithCounts(
      attributes,
      options,
    );
    if (loanList == k500Error) return kInternalError;

    const preparedList = [];
    for (let index = 0; index < loanList.rows.length; index++) {
      const loanData = loanList.rows[index];
      const bankingData = loanData.bankingData ?? {};
      const subscriptionData = loanData.subscriptionData ?? {
        mode: kSigndesk,
      };
      const userData = loanData.registeredUsers ?? {};
      const kycData = userData.kycData ?? {};
      const masterData = userData.masterData ?? {};
      const disbursementList = loanData.disbursementData ?? [];
      const disbursementData = disbursementList[0];
      let emiList = loanData.emiData ?? [];
      emiList = emiList.sort((a, b) => a.id - b.id);
      const firstEMIData = emiList[0];
      let dueAmount = emiList.reduce(
        (prev, curr) => prev + (parseFloat(curr.emi_amount) + curr.penalty),
        0,
      );
      dueAmount = Math.floor(dueAmount);
      const dueDateInfo = this.dateService.dateToReadableFormat(
        firstEMIData.emi_date,
      );
      let pinCode = '-';
      try {
        const response = JSON.parse(kycData.aadhaarResponse);
        pinCode = response.zip ?? response.pincode ?? '-';
      } catch (error) {}
      const disbursedDateInfo = this.dateService.dateToReadableFormat(
        loanData.loan_disbursement_date,
      );

      preparedList.push({
        userId: loanData.userId,
        'Loan ID': loanData.id,
        Name: userData.fullName ?? '-',
        Phone: this.cryptService.decryptPhone(userData.phone),
        Follower: (await this.commonService.getAdminData(loanData.followerId))
          .fullName,
        'Approved amount': Math.floor(loanData.netApprovedAmount ?? '0') ?? '-',
        'Delay days': emiList.reduce(
          (prev, curr) => prev + (curr.penalty_days ?? 0),
          0,
        ),
        'Due date': dueDateInfo.readableStr,
        'Due amount': '₹ ' + this.typeService.amountNumberWithCommas(dueAmount),
        'Disbursement date': disbursedDateInfo.readableStr ?? '-',
        'Disbursement amount':
          '₹ ' +
          this.typeService.amountNumberWithCommas(
            Math.floor(disbursementData.amount / 100),
          ),
        'Salary date': bankingData.salaryDate ?? '-',
        'Mandate source': subscriptionData.mode ?? '-',
        City: userData.city ?? '-',
        State: userData.state ?? '-',
        Pincode: pinCode,
        'Aadhaar address':
          this.typeService.getAadhaarAddress(kycData).address ?? '-',
        'Type address':
          this.typeService.getUserTypeAddress(userData.typeAddress ?? '-') ??
          '-',
        'User location': masterData?.miscData?.lastLocation ?? '-',
        'Approved by': (
          await this.commonService.getAdminData(
            loanData.manualVerificationAcceptId,
          )
        ).fullName,
        lastOnlineTime: userData.lastOnlineTime,
        otherEMIdue: emiList.length > 1,
      });
    }

    return { count: loanList.count, rows: preparedList };
  }

  async aaUsers(reqData) {
    try {
      // Data preparation
      const loanList = await this.getDataForaaUsers(reqData);
      if (loanList?.message) return loanList;
      const isDownload = reqData.download?.toString() == 'true';
      const type = (reqData.type ?? 'all').toLowerCase();

      const today = new Date();
      today.setDate(today.getDate() - 5);
      const minDate = this.typeService.getGlobalDate(today).toJSON();

      const preparedList = [];
      for (let index = 0; index < loanList.rows.length; index++) {
        try {
          const loanData = loanList.rows[index];
          let transList =
            type == 'unplaced' ? [] : loanData.transactionData ?? [];
          transList = transList.filter(
            (el) =>
              el.status == kInitiated &&
              el.subSource == kAutoDebit &&
              el.subscriptionDate > minDate,
          );
          let aaList = loanData.aaList ?? [];
          aaList = aaList.filter((el) => el.endOn);

          const subscriptionData = loanData.subscriptionData ?? {
            mode: kSigndesk,
          };
          const userData = loanData.registeredUsers ?? {};
          const kycData = userData.kycData ?? {};
          const masterData = userData.masterData ?? {};
          const disbursementList = loanData.disbursementData ?? [];
          const disbursementData = disbursementList[0];
          let emiList = loanData.emiData ?? [];
          emiList = emiList.sort((a, b) => a.id - b.id);
          const firstEMIData = emiList[0];
          let dueAmount = emiList.reduce(
            (prev, curr) => prev + (parseFloat(curr.emi_amount) + curr.penalty),
            0,
          );
          dueAmount = Math.floor(dueAmount);
          const dueDateInfo = this.dateService.dateToReadableFormat(
            firstEMIData.emi_date,
          );
          let pinCode = '-';
          try {
            const response = JSON.parse(kycData.aadhaarResponse);
            pinCode = response.zip ?? response.pincode ?? '-';
          } catch (error) {}
          const disbursedDateInfo = this.dateService.dateToReadableFormat(
            loanData.loan_disbursement_date,
          );

          let crmDate = '-';
          let ptpDate = '-';
          let ptpAmount = '-';
          const crmData = userData.lastCrm ?? {};
          if (crmData.createdAt) {
            const crmDateInfo = this.dateService.dateToReadableFormat(
              crmData.createdAt,
            );
            crmDate = crmDateInfo.readableStr;
            if (ptpCrmIds.includes(crmData.titleId)) {
              const ptpDateInfo = this.dateService.dateToReadableFormat(
                crmData.due_date,
              );
              ptpDate = ptpDateInfo.readableStr;
              ptpAmount = this.strService.readableAmount(crmData.amount);
            }
          }

          transList.forEach((el) => {
            try {
              const dateInfo = this.dateService.dateToReadableFormat(
                el.subscriptionDate,
              );
              el.date = dateInfo.readableStr;
              el.amount = Math.floor(el.paidAmount);
              delete el.paidAmount;
              delete el.subscriptionDate;
            } catch (error) {}
          });
          let balance = 0;
          let lastTransactionDate = '-';
          let statementUrl = '-';
          const fetchedList = [];
          if (aaList?.length > 0) {
            aaList = aaList.sort((b, a) => a.id - b.id);
            const latestData = aaList[0];
            balance = latestData.balance ?? 0;
            if (latestData.lastTransactionOn) {
              const lastTransDateInfo = this.dateService.unixToReadableFormat(
                latestData.lastTransactionOn,
              );
              lastTransactionDate = lastTransDateInfo.readableStr;
            }
            if (latestData.statementUrl)
              statementUrl =
                this.cryptService.decryptSyncText(latestData.statementUrl) ??
                '-';
          }
          aaList.forEach((el) => {
            try {
              const dateInfo = this.dateService.unixToReadableFormat(el.endOn);
              fetchedList.push({
                fetchedDate:
                  dateInfo.readableStr +
                  ' ' +
                  dateInfo.hours +
                  ':' +
                  dateInfo.minutes +
                  dateInfo.meridiem,
                balance: el.balance ?? 0,
              });
            } catch (error) {}
          });

          const dueDetails: any =
            this.calculcation.getOverDueInsightsForLoan(loanData);
          const preparedData: any = {
            userId: userData.id,
            'Loan ID': loanData.id,
            Name: userData.fullName ?? '-',
            Phone: this.cryptService.decryptPhone(userData.phone),
            Follower: (
              await this.commonService.getAdminData(loanData.followerId)
            ).fullName,
            'Approved amount':
              Math.floor(loanData.netApprovedAmount ?? '0') ?? '-',
            'Delay days': emiList.reduce(
              (prev, curr) => prev + (curr.penalty_days ?? 0),
              0,
            ),
            'Due date': dueDateInfo.readableStr,
            'Due amount': this.strService.readableAmount(
              dueDetails.totalExpected.toString(),
            ),
            'Amount to be recovered': this.strService.readableAmount(
              dueDetails.totalExpected.toString(),
            ),
            'Disbursement date': disbursedDateInfo.readableStr ?? '-',
            'Disbursement amount':
              '₹ ' +
              this.typeService.amountNumberWithCommas(
                Math.floor(disbursementData.amount / 100),
              ),
            'Salary date': loanData.verifiedSalaryDate ?? '-',
            'Mandate source': subscriptionData.mode ?? '-',
            City: this.strService.makeFirstLetterCapital(userData.city ?? '-'),
            State: this.strService.makeFirstLetterCapital(
              userData.state ?? '-',
            ),
            Pincode: pinCode,
            'Aadhaar address':
              this.typeService.getAadhaarAddress(kycData).address ?? '-',
            'Type address':
              this.typeService.getUserTypeAddress(
                userData.typeAddress ?? '-',
              ) ?? '-',
            'User location': masterData?.miscData?.lastLocation ?? '-',
            'Approved by': (
              await this.commonService.getAdminData(
                loanData.manualVerificationAcceptId,
              )
            ).fullName,
            'Emi Id': loanData?.emiData[0].id ?? '-',
            'Placed auto debits': transList,
            'Hit count': aaList.length ?? 0,
            'Current balance': balance,
            'Last transaction date': lastTransactionDate,
            Statement: statementUrl,
            'Fetched list': fetchedList,
            'CRM date': crmDate ?? '-',
            'CRM disposition': crmData.dispositionName ?? '-',
            'CRM description': crmData.remark ?? '-',
            'CRM added by': crmData.adminName ?? '-',
            'PTP date': ptpDate,
            'PTP amount': ptpAmount,
          };
          if (isDownload) {
            preparedData['Total autodebits'] =
              preparedData.placedAutoDebits?.length ?? 0;
            preparedData['Total balance fetched'] =
              preparedData.fetchedList?.length ?? 0;
            delete preparedData['Fetched list'];
            delete preparedData['Placed auto debits'];
          }
          preparedList.push(preparedData);
        } catch (error) {}
      }

      // Generate excel
      if (isDownload) {
        const rawExcelData = {
          sheets: ['Aggregator - Defaulters'],
          data: [preparedList],
          sheetName: 'Aggregator - Defaulters.xlsx',
          needFindTuneKey: true,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        return { fileUrl: url };
      }

      return { count: loanList.count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForaaUsers(reqData) {
    try {
      // Params validation
      const page = reqData.page;
      if (!page) return kParamMissing('page');
      const type = (reqData.type ?? 'all').toLowerCase();

      const searchData: any = await this.common.getSearchData(
        reqData.searchText,
      );
      if (searchData?.message) return searchData;

      const today = new Date();
      today.setDate(today.getDate() - 5);
      const minDate = this.typeService.getGlobalDate(today).toJSON();

      const isDownload = reqData.download == 'true';
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const adminList = await this.getTargetAdmins(adminId);

      const bankingInclude: { model; attributes?; where? } = {
        model: BankingEntity,
      };
      bankingInclude.attributes = ['id'];
      bankingInclude.where = { consentId: { [Op.ne]: null } };
      let userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['id'];
      userInclude.where = { loanStatus: 3 };
      let include = [bankingInclude, userInclude];
      if (type != 'all') {
        const transInclude: { model; attributes?; where? } = {
          model: TransactionEntity,
        };
        transInclude.attributes = ['id', 'status', 'subscriptionDate'];
        if (type == 'placed')
          transInclude.where = { status: kInitiated, subSource: kAutoDebit };
        else if (type == 'unplaced')
          transInclude.where = { subSource: kAutoDebit };
        transInclude.where = { ...(transInclude.where ?? {}) };
        transInclude.where.subscriptionDate = { [Op.gte]: minDate };
        include.push(transInclude);
      }
      let attributes: any = ['id'];
      let options: any = {
        include,
        order: [['id', 'DESC']],
        where: { followerId: { [Op.in]: adminList }, loanStatus: 'Active' },
      };
      // Search by loanId
      if (searchData.text != '' && searchData.type == 'LoanId')
        options.where.id = searchData.text;
      // Query
      let loanList = await this.loanRepo.getTableWhereData(attributes, options);
      if (loanList == k500Error) return kInternalError;
      if (type == 'unplaced') {
        loanList = loanList.filter((el) => {
          let transList = el.transactionData ?? [];
          transList = transList.filter(
            (el) => el.status == kInitiated && el.subscriptionDate > minDate,
          );
          if (transList.length == 0) return true;
        });
      }
      const loanIds = loanList.map((el) => el.id);

      // Table join
      const aaInclude: any = { model: AAEntity };
      aaInclude.attributes = [
        'balance',
        'endOn',
        'id',
        'latestFetch',
        'lastTransactionOn',
        'statementUrl',
      ];
      aaInclude.required = false;
      aaInclude.where = { purpose: 2 };
      const disbursementInclude: { model; attributes? } = {
        model: disbursementEntity,
      };
      disbursementInclude.attributes = ['amount'];
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'penalty_days',
        'emi_date',
        'principalCovered',
        'interestCalculate',
        'penalty',
      ];
      emiInclude.required = false;
      emiInclude.where = { payment_due_status: '1', payment_status: '0' };
      const transInclude: any = { model: TransactionEntity };
      transInclude.attributes = [
        'status',
        'subSource',
        'paidAmount',
        'subscriptionDate',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      transInclude.required = false;
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarResponse',
        'aadhaarAddressResponse',
      ];
      const masterInclude: { model; attributes? } = { model: MasterEntity };
      masterInclude.attributes = ['miscData'];
      userInclude = { model: registeredUsers };
      userInclude.attributes = [
        'city',
        'fullName',
        'id',
        'lastCrm',
        'phone',
        'state',
        'typeAddress',
        'kycId',
        'masterId',
      ];
      userInclude.include = [kycInclude, masterInclude];
      const subscriptionInclude: { model; attributes? } = {
        model: SubScriptionEntity,
      };
      subscriptionInclude.attributes = ['mode'];

      // Search by user's name
      if (searchData.text != '' && searchData.type == 'Name')
        userInclude.where = { fullName: { [Op.iRegexp]: searchData.text } };
      // Search by user's phone
      else if (searchData.text != '' && searchData.type == 'Number')
        userInclude.where = { phone: { [Op.iLike]: searchData.text } };

      // Query preparation
      include = [
        aaInclude,
        disbursementInclude,
        emiInclude,
        subscriptionInclude,
        transInclude,
        userInclude,
      ];
      attributes = [
        'followerId',
        'id',
        'loan_disbursement_date',
        'netApprovedAmount',
        'verifiedSalaryDate',
        'manualVerificationAcceptId',
      ];
      options = { include, where: { id: loanIds } };
      if (!isDownload) {
        options.limit = PAGE_LIMIT;
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
      }
      // Query
      loanList = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      return loanList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getTargetAdmins(adminId) {
    let adminList = [];
    if (adminId != -1) adminList.push(adminId);
    else {
      if (gActiveCollectionExecutives.length != 0)
        return gActiveCollectionExecutives;

      const attributes = ['followerId'];
      const options = {
        group: ['followerId'],
        where: { followerId: { [Op.ne]: null } },
      };
      const followerList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      adminList = followerList.map((el) => el.followerId);

      let totalAdmins = await this.adminRepo.getTableWhereData(
        ['isActive', 'id'],
        { where: { id: adminList } },
      );
      totalAdmins = totalAdmins.filter((el) => el.isActive == '1');
      gActiveCollectionExecutives = totalAdmins.map((el) => el.id);
      return gActiveCollectionExecutives;
    }

    return adminList;
  }

  async performanceSummary(reqData) {
    try {
      // Get data from database
      const targetData: any = await this.getDataForPerformanceSummary(reqData);
      if (targetData?.message) return targetData;

      // Calculation
      const loanList = targetData.loanList;
      const adminList = targetData.adminList;
      const adminData = {};
      adminList.forEach((el) => {
        adminData[el] = {
          totalPTPCount: 0,
          successPTPCount: 0,
          uniqueCalls: 0,
          totalNonConnectedCalls: 0,
          totalDue: 0,
          principalDue: 0,
          receivedDue: 0,
        };
      });
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const crmList = loanData.crmList ?? [];
          const transList = loanData.transactionData ?? [];
          const followerId = loanData.followerId;
          const isFollowerAvailable = adminList.includes(followerId);

          const transIds = [];
          let callConnectedAdmins = [];
          crmList.forEach((el) => {
            try {
              const titleId = el.relationData?.titleId ?? 0;
              const adminId = el.adminId;
              const isAdminAvailable = adminList.includes(adminId);

              // Call details
              if (el.callSid) {
                // Call connected
                if (el.relationData?.dispositionId == 1)
                  callConnectedAdmins.push(adminId);
              }

              // PTP
              if (ptpCrmIds.includes(titleId)) {
                const ptpDate = this.typeService.getGlobalDate(el.due_date);
                if (!isNaN(ptpDate.getTime()) && isAdminAvailable)
                  adminData[adminId].totalPTPCount++;

                for (let i = 0; i < transList.length; i++) {
                  try {
                    const transData = transList[i];
                    const transId = transData.id;
                    if (transIds.includes(transId)) continue;

                    const paidDate = new Date(transData.completionDate);
                    if (isNaN(paidDate.getTime())) continue;
                    const diffInDays = this.typeService.dateDifference(
                      paidDate,
                      ptpDate,
                      'Days',
                    );
                    if (diffInDays <= 2) {
                      const paidAmount = transData.paidAmount ?? 0;
                      if (isAdminAvailable) {
                        adminData[adminId].receivedDue += paidAmount;
                        adminData[adminId].successPTPCount++;
                        transIds.push(transId);
                      }
                    }
                  } catch (error) {}
                }
              }
            } catch (error) {}
          });
          callConnectedAdmins = [...new Set(callConnectedAdmins)];
          callConnectedAdmins.forEach((adminId) => {
            adminData[adminId].uniqueCalls++;
          });

          for (let i = 0; i < transList.length; i++) {
            try {
              const transData = transList[i];
              const transId = transData.id;
              if (transIds.includes(transId)) continue;

              const paidAmount = transData.paidAmount ?? 0;
              if (isFollowerAvailable) {
                adminData[followerId].receivedDue += paidAmount;
                transIds.push(transId);
              }
            } catch (error) {}
          }
        } catch (error) {}
      }

      const preparedList = [];
      for (const key in adminData) {
        const adminInfo = await this.commonService.getAdminData(key);
        const name = adminInfo.fullName ?? '';
        adminData[key].receivedDue = Math.floor(adminData[key].receivedDue);
        preparedList.push({ adminId: key, name, ...adminData[key] });
      }
      return preparedList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDataForPerformanceSummary(reqData) {
    try {
      // Params validation
      const minDate = reqData.minDate;
      if (!minDate) return kParamMissing('minDate');
      const maxDate = reqData.maxDate;
      if (!maxDate) return kParamMissing('maxDate');

      const followerList = await this.loanRepo.getTableWhereData(
        ['followerId'],
        { group: ['followerId'], where: { followerId: { [Op.ne]: null } } },
      );
      if (followerList == k500Error) return kInternalError;
      const adminList = followerList.map((el) => el.followerId);

      // Table joins
      const crmInclude: { model; attributes?; required?; where? } = {
        model: crmActivity,
      };
      crmInclude.attributes = [
        'amount',
        'adminId',
        'callSid',
        'due_date',
        'relationData',
      ];
      crmInclude.required = false;
      crmInclude.where = {
        adminId: { [Op.in]: adminList },
        [Op.or]: [
          {
            due_date: { [Op.ne]: null },
            relationData: { titleId: { [Op.in]: ptpCrmIds } },
          },
          {
            callSid: { [Op.ne]: null },
          },
        ],
      };
      const transInclude: { model; attributes?; required?; where? } = {
        model: TransactionEntity,
      };
      transInclude.attributes = ['completionDate', 'paidAmount'];
      transInclude.where = { status: kCompleted };
      transInclude.required = false;
      // Query preparation
      const include = [crmInclude, transInclude];
      const attributes = ['followerId', 'id'];
      const options = {
        include,
        where: {
          loan_disbursement_date: { [Op.gte]: minDate },
          followerId: { [Op.ne]: null },
        },
      };
      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      return { adminList, loanList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion -> Dashboard card for defaulter user's insights

  async onlineDefaulterUsers(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;

      if (!adminId) return kParamMissing('adminId');
      const isCountOnly = reqData.isCount == 'true';
      const isNotification = reqData.notification?.toString() == 'true';

      //Range Preparation
      const adminList = await this.getTargetAdmins(adminId);
      const minTime = new Date();
      minTime.setMinutes(minTime.getMinutes() - 10);
      const lastOnlineTime = minTime.toJSON();

      let options: any = {
        order: [['id']],
        where: {
          loanStatus: 3,
          lastOnlineTime: { [Op.gte]: lastOnlineTime },
        },
      };
      let userIds = await this.userRepo.getTableWhereData(['id'], options);
      if (userIds === k500Error) return kInternalError;
      userIds = userIds.map((el) => el?.id);

      // Query preparation
      options = {
        where: {
          followerId: { [Op.in]: adminList },
          userId: { [Op.in]: userIds },
          loanStatus: 'Active',
        },
      };
      // Query
      if (isCountOnly) {
        const count = await this.loanRepo.getCountsWhere(options);
        if (count == k500Error) return kInternalError;
        return { count };
      }
      const crmInclude: SequelOptions = {
        model: crmActivity,
      };
      crmInclude.attributes = ['id', 'amount', 'due_date'];
      crmInclude.where = {
        'relationData.titleId': {
          [Op.in]: ptpCrmIds,
        },
      };
      crmInclude.required = false;
      const transInclude: { model; attributes?; where? } = {
        model: TransactionEntity,
      };
      transInclude.attributes = [
        'id',
        'status',
        'createdAt',
        'principalAmount',
        'interestAmount',
        'penaltyAmount',
      ];
      transInclude.where = { subSource: 'AUTODEBIT' };
      const userInclude: { model; attributes?; include? } = {
        model: registeredUsers,
      };
      userInclude.attributes = [
        'id',
        'fullName',
        'phone',
        'lastCrm',
        'selfieId',
        'eligibleForPromoCode',
      ];
      const emiInclude: { model; attributes? } = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'principalCovered',
        'interestCalculate',
        'penalty',
        'penalty_days',
        'unpaid_waiver',
      ];
      const include = [emiInclude, userInclude, transInclude, crmInclude];
      options.include = include;
      const attributes = [
        'id',
        'userId',
        'appType',
        'currentAccountBalance',
        'balanceFetchDate',
      ];
      const loanList = await this.loanRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );

      if (loanList == k500Error) return kInternalError;
      if (isNotification) {
        const userData = loanList.rows.map((el) => ({
          userId: el.userId,
          appType: el.appType,
        }));
        return userData;
      }

      const selfieIds = loanList.rows.map((el) => el.registeredUsers?.selfieId);

      const selfieattributes = ['id', 'image'];
      const selfieData = await this.selfieRepo.getTableWhereData(
        selfieattributes,
        {
          where: { id: { [Op.in]: selfieIds } },
        },
      );

      const preparedList = [];
      for (let index = 0; index < loanList.rows.length; index++) {
        try {
          const loanData = loanList.rows[index];
          const userData = loanData.registeredUsers ?? {};
          const emiList = loanData.emiData ?? {};
          const crmList = loanData.crmList ?? {};
          const lastCrmItem = crmList?.slice(-1)[0];
          const ptpDate = lastCrmItem
            ? this.dateService.dateToReadableFormat(lastCrmItem.due_date)
                .readableStr
            : '-';
          let transData = loanData.transactionData ?? {};
          transData = transData.sort((a, b) => b.id - a.id);
          const overDueCalculation: any =
            this.calculcation.getOverDueInsightsForLoan(loanData);
          const selfieId = userData?.selfieId;
          const selfie = selfieData.find((selfie) => selfie.id === selfieId);
          let fetchTime = '-';
          if (loanData?.balanceFetchDate != null) {
            const dateStr = this.dateService.dateToReadableFormat(
              new Date(loanData?.balanceFetchDate),
            );
            fetchTime = `${dateStr.readableStr} ${dateStr.hours}:${dateStr.minutes} ${dateStr.meridiem}`;
          }

          preparedList.push({
            userId: loanData.userId,
            'Loan ID': loanData.id,
            Name: userData.fullName ?? '-',
            'Amount to be recovered': this.strService.readableAmount(
              overDueCalculation.totalRemaining,
            ),
            'Principal to be recovered': this.strService.readableAmount(
              overDueCalculation.totalRemainingPrincipal,
            ),
            'Delay days': emiList.reduce(
              (prev, curr) => prev + (curr.penalty_days ?? 0),
              0,
            ),
            'Current balance':
              loanData?.currentAccountBalance != null
                ? +loanData?.currentAccountBalance
                : '-',
            'Fetch time': fetchTime,
            'Last action by': userData?.lastCrm?.adminName ?? '-',
            Waiver: loanData.emiData[0].unpaid_waiver,
            'Eligible For PromoCode':
              loanData?.registeredUsers?.eligibleForPromoCode,
            'Ptp amount': crmList?.slice(-1)[0]?.amount ?? '-',
            'Ptp date': ptpDate,
            'Last payment attempt': transData[0]?.createdAt ?? '-',
            'AD Status': transData[0]?.status ?? '-',
            Phone: this.cryptService.decryptPhone(userData.phone),
            Image: selfie?.image ?? '-',
            appType: loanData?.appType,
          });
        } catch (error) {}
      }
      return { count: loanList.count, rows: preparedList };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get Defaulters Card Data
  async getDefaultersCardData(query) {
    try {
      const adminId = query?.adminId;
      const result: any = await this.getDefaulterCountRowData(+(adminId ?? -1));
      if (result?.message) return result;
      return this.prePareDefaulterCount(result);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async takeFollowUp(data: any) {
    try {
      let adminId: any = data.adminId;
      let loanIds: any[] = data.loanIds;
      const fileName = data?.fileName;
      const changeBy = data.changeBy ?? SYSTEM_ADMIN_ID;
      const ip = data.ip;
      let fileData;
      if (fileName) {
        fileData = await this.assignFollowerIdByFile(fileName);
        if (!fileData || fileData.message) return fileData;
        for (let [adminId, loanIds] of Object.entries(fileData)) {
          try {
            await this.updateFollowerAndHistory(adminId, loanIds, changeBy, ip);
          } catch (error) {}
        }
        return fileData;
      }
      return await this.updateFollowerAndHistory(adminId, loanIds, changeBy,ip);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async notifyTodaysDuePTPs() {
    try {
      const usersList: any = await this.getTodaysDuePTPUsrs();
      if (usersList.message) return usersList;
      let length = usersList?.length;
      for (let i = 0; i < length; i++) {
        try {
          const ele = usersList[i];
          let userId = ele?.registeredUsers?.id;
          let loanId = ele?.loanId;
          const appType = ele?.loanData?.appType;
          let fullName = ele?.registeredUsers?.fullName;
          let email = ele?.registeredUsers?.email;
          let phone = ele?.registeredUsers?.phone;
          let amount = this.typeService.amountNumberWithCommas(ele?.amount);
          let due_date: any = this.dateService.dateToReadableFormat(
            ele?.due_date,
          );
          let adminData = await this.commonService.getAdminData(ele?.adminId);
          let adminPhone = adminData?.companyPhone;
          let emiId = ele?.registeredUsers?.emiData[0];

          const body = {
            adminId: ele.adminId,
            emiId: emiId.id,
            loanId,
            amount: ele?.amount,
            dueAmount: ele?.amount,
            source: 'RAZORPAY',
            subSource: 'WEB',
            isGreaterEMI: false,
          };
          const link = await this.sharedTransaction.funCreatePaymentOrder(body);
          if (!link || link === k500Error) return kInternalError;

          //send Mail
          const kPromiseToPayPath =
            await this.commonService.getEmailTemplatePath(
              kPromiseToPayTemplate,
              appType,
              null,
              null,
            );
          const htmlData = fs.readFileSync(kPromiseToPayPath, 'utf-8');
          if (!htmlData) return k422ErrorMessage('Mail format not readable');
          let formateHtml = htmlData;
          formateHtml = formateHtml.replace('##NAME##', fullName);
          formateHtml = formateHtml.replace('##DATE##', due_date.readableStr);
          formateHtml = this.replaceAll(formateHtml, '##AMOUNT##', amount);
          if (adminPhone) {
            formateHtml = formateHtml.replace(
              '##AGENTPHONE##',
              '+91' + adminPhone,
            );
          } else {
            formateHtml = formateHtml.replace(
              '##AGENTPHONE##',
              EnvConfig.number.collectionNumber,
            );
          }
          formateHtml = formateHtml.replace('##PAYNOW##', link?.paymentLink);
          formateHtml = formateHtml.replace(
            '##COLLECTIONEMAIL##',
            EnvConfig.mail.collectionEmail,
          );
          formateHtml = formateHtml.replace('##NBFCINFO##', nbfcInfoStr);
          formateHtml = formateHtml.replace(
            '##COLLECTIONCONTACT##',
            EnvConfig.number.collectionNumber,
          );
          formateHtml = this.replaceAll(
            formateHtml,
            '##NBFCSHORTNAME##',
            EnvConfig.nbfc.nbfcCamelCaseName,
          );
          formateHtml = formateHtml.replace(
            '##APPNAME##',
            EnvConfig.nbfc.appCamelCaseName,
          );
          let fromMail = kNoReplyMail;
          let replyTo = kSupportMail;
          if (appType == '0') {
            fromMail = kLspNoReplyMail;
            replyTo = KLspSupportMail;
          }
          let subject = `Friendly Reminder: Promise to Pay Due Today`;
          await this.sharedNotificationService.sendMailFromSendinBlue(
            email,
            subject,
            formateHtml,
            userId,
            [],
            [],
            fromMail,
            replyTo,
          );

          //send SMS (Pending because of Message id)
          // const smsOptions = {
          // smsId: MSG91Templete.PTP_REMINDER,
          // name: fullName,
          // amount,
          // date: due_date.readableStr,
          // var1: 'chirag',
          // };
          // this.smsService.sendSMS(phone, MSG91, smsOptions);
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region getdefaulter card Row Data
  private async getDefaulterCountRowData(adminId = -1) {
    try {
      const emiAmount = [
        Sequelize.fn(
          'SUM',
          Sequelize.cast(Sequelize.col('emi_amount'), 'double precision'),
        ),
        'emiAmount',
      ];
      const penalty = [
        Sequelize.fn('SUM', Sequelize.col('penalty')),
        'penalty',
      ];
      //#region get emi amount details penalty daye
      const options: any = {
        where: { payment_status: '0', payment_due_status: '1' },
        group: ['penalty_days', 'loanId'],
        order: [['penalty_days']],
        include: [],
      };
      if (adminId != -1)
        options.include.push({
          model: loanTransaction,
          attributes: [],
          where: { followerId: adminId },
        });
      const emiAtt: any = [
        'penalty_days',
        'loanId',
        emiAmount,
        penalty,
        [
          Sequelize.fn('SUM', Sequelize.col('principalCovered')),
          'principalAmount',
        ],
        [
          Sequelize.fn('count', Sequelize.col('"EmiEntity"."legalId"')),
          'legalCount',
        ],
      ];
      const emiData = await this.emiRepo.getTableWhereData(emiAtt, options);
      if (emiData === k500Error) return kInternalError;
      //#endregion

      //#region get transaction data penalty day
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('paidAmount')), 'paidAmount'],
        [Sequelize.fn('SUM', Sequelize.col('principalAmount')), 'amount'],
        'emiData.penalty_days',
      ];
      const emiInclude = {
        attributes: ['penalty_days', emiAmount, penalty],
        model: EmiEntity,
        where: options.where,
      };
      const optiTran: any = {
        where: { status: 'COMPLETED' },
        include: [emiInclude],
        group: ['emiData.penalty_days', 'status', 'emiData.id'],
      };
      if (adminId != -1)
        optiTran.include.push({
          model: loanTransaction,
          attributes: [],
          where: { followerId: adminId },
        });

      const transData = await this.transactionRepo.getTableWhereData(
        att,
        optiTran,
      );
      if (transData === k500Error) return kInternalError;
      //#endregion

      //#region get online customer data penalty day
      const attr: any = ['penalty_days', 'loanId'];
      const currentTime = new Date();
      currentTime.setMinutes(currentTime.getMinutes() - 5);

      options.include.push({
        model: registeredUsers,
        attributes: [],
        where: { lastOnlineTime: { [Op.gte]: currentTime.toJSON() } },
      });
      const onlineData = await this.emiRepo.getTableWhereData(attr, options);
      if (onlineData === k500Error) return kInternalError;
      //#endregion

      return { emiData, transData, onlineData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prePare defaulter count day wites
  private prePareDefaulterCount(result) {
    try {
      const oneToFifteen = this.formattingDataInFromToDay(result, 0, 15);
      if (oneToFifteen['message']) return oneToFifteen;
      const sixteenToThirty = this.formattingDataInFromToDay(result, 16, 30);
      if (sixteenToThirty['message']) return sixteenToThirty;
      const thirthyPlus = this.formattingDataInFromToDay(result, 31, 100000);
      if (thirthyPlus['message']) return thirthyPlus;
      const allCard = this.formattingDataInFromToDay(result, 0, 100000);
      if (allCard['message']) return allCard;
      const activePayments = this.prePareActivePayments(result);
      if (activePayments['message']) return allCard;
      return {
        oneToFifteen,
        sixteenToThirty,
        thirthyPlus,
        allCard,
        activePayments,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region formating data in form to to day
  private formattingDataInFromToDay(result, from: number, to: number) {
    try {
      const loanId = [];
      const onlineLoanId = [];
      const emiData: any[] = (result?.emiData ?? []).filter(
        (f) => f.penalty_days >= from && f.penalty_days <= to,
      );
      const transData: any[] = (result?.transData ?? []).filter(
        (f) =>
          (f?.emiData?.penalty_days ?? 0) >= from &&
          (f?.emiData?.penalty_days ?? 0) <= to,
      );
      const onlineData: any[] = (result?.onlineData ?? []).filter(
        (f) => f.penalty_days >= from && f.penalty_days <= to,
      );
      const data = {
        count: 0,
        amount: 0,
        noticePending: 0,
        noticeSent: 0,
        online: 0,
        principalAmount: 0,
      };

      for (let index = 0; index < emiData.length; index++) {
        try {
          const emi = emiData[index];
          if (!loanId.includes(emi?.loanId)) {
            data.count += 1;
            data.noticeSent += +emi?.legalCount;
            loanId.push(emi?.loanId);
          }
          data.amount += emi?.emiAmount + emi?.penalty ?? 0;
          data.principalAmount += +emi?.principalAmount;
        } catch (error) {}
      }
      for (let index = 0; index < transData.length; index++) {
        try {
          const trans = transData[index];
          data.principalAmount -= trans?.amount ?? 0;
        } catch (error) {}
      }
      for (let index = 0; index < onlineData.length; index++) {
        try {
          const element = onlineData[index];
          if (!onlineLoanId.includes(element?.loanId)) {
            data.online += 1;
            onlineLoanId.push(element?.loanId);
          }
        } catch (error) {}
      }
      data.amount = +data.amount.toFixed();
      data.principalAmount = +data.principalAmount.toFixed();
      data.noticePending = data.count - data.noticeSent;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region  prepare active part paymenst
  private prePareActivePayments(result) {
    try {
      const transData: any[] = result?.transData ?? [];
      const data = {
        totalCount: 0,
        paidAmount: 0,
        remainingAmount: 0,
      };
      for (let index = 0; index < transData.length; index++) {
        try {
          const trans = transData[index];
          data.totalCount += 1;
          data.paidAmount += trans?.paidAmount ?? 0;
          data.remainingAmount +=
            (trans?.emiData?.emiAmount ?? 0) + (trans?.emiData?.penalty ?? 0);
        } catch (error) {}
      }
      data.paidAmount = +data.paidAmount.toFixed();
      data.remainingAmount = +data.remainingAmount.toFixed();
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getTodaysDuePTPUsrs() {
    try {
      const today: any = await this.dateService.utcDateRange(
        new Date(),
        new Date(),
      );
      const attributes = [
        'id',
        'userId',
        'loanId',
        'amount',
        'due_date',
        'adminId',
      ];
      const userInclude: any = {
        model: registeredUsers,
      };
      userInclude.attributes = ['id', 'fullName', 'email', 'phone'];
      userInclude.where = {
        loanStatus: 3,
      };
      const loanInclude: any = {
        model: loanTransaction,
        attributes: ['appType'],
      };
      // Emi
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = ['id'];
      emiInclude.where = { payment_due_status: '1', payment_status: '0' };
      emiInclude.order = [['id', 'ASC']];
      userInclude.include = [emiInclude];

      const options: any = {
        where: {
          due_date: {
            [Op.gte]: today.minRange,
            [Op.lte]: today.maxRange,
          },
          relationData: { titleId: { [Op.in]: ptpCrmIds } },
          [Op.or]: [{ trans_status: -1 }, { transactionId: { [Op.eq]: null } }],
        },
        include: [userInclude, loanInclude],
      };
      const usersList = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (usersList == k500Error) return kInternalError;
      return usersList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async autoAssignDefaulters(ip) {
    // Preparation -> Query
    const emiInclude: any = { model: EmiEntity };
    emiInclude.attributes = ['id'];
    emiInclude.where = { payment_due_status: '1', payment_status: '0' };
    const attributes = ['id', 'userId', 'followerId'];
    const options = {
      include: [emiInclude],
      where: { followerId: { [Op.eq]: null }, loanStatus: 'Active' },
    };
    // Hit -> Query
    const loanList = await this.loanRepo.getTableWhereData(attributes, options);
    // Validation -> Query data
    if (loanList === k500Error) throw new Error();
    // Hit -> Query
    let executiveList = await this.adminRepo.getAdminsFromDepartment(
      'collection',
      ['id', 'otherData'],
    ); // Validation -> Query data
    if (executiveList.message) return executiveList;
    executiveList = executiveList.filter(
      (el) => el.otherData?.eligibleForDPD1 === true,
    );

    let failedCount = 0;
    let successCount = 0;
    const totalCount = loanList.length;
    for (let index = 0; index < totalCount; index++) {
      try {
        const loanData = loanList[index];
        const loanId = loanData.id;
        const userId = loanData.userId;
        delete loanData.emiData;

        const followerId = await this.assignCollectionExecutive(executiveList);
        if (followerId.message) {
          failedCount++;
          continue;
        }

        // Update row data -> Loan table
        const updatableData = { followerId };
        // Hit -> Query
        const updateResponse = await this.loanRepo.updateRowData(
          updatableData,
          loanId,
        );
        // Validation -> Query data
        if (updateResponse == k500Error) {
          failedCount++;
          continue;
        } else successCount++;

        // Update online defaulters
        await this.updateDefaulterAdmin(followerId, loanId);

        const createData = {
          userId,
          loanId,
          type: 'Defaulter',
          subType: kChangeFollowerId,
          oldData: '',
          newData: followerId,
          adminId: SYSTEM_ADMIN_ID,
          ip
        };
        await this.changeLogsRepo.create(createData);
      } catch (error) {}
    }

    return { failedCount, successCount, totalCount };
  }

  private async assignCollectionExecutive(targetList) {
    // Preparation -> Query
    const attributes = ['id', 'lastUpdateIndex'];
    const options = { where: { type: 'DEFAULTER_EXECUTIVES' } };
    // Hit -> Query
    const assignableData = await this.staticConfigRepo.getRowWhereData(
      attributes,
      options,
    );
    // Validation -> Query data
    if (assignableData === k500Error) throw new Error();
    if (!assignableData) return k422ErrorMessage(kNoDataFound);

    const lastUpdateIndex = assignableData.lastUpdateIndex ?? 0;
    let nextIndex = lastUpdateIndex + 1;
    if (nextIndex >= targetList.length) nextIndex = 0;

    const id = assignableData.id;
    const updatableData = { lastUpdateIndex: nextIndex };
    // Hit -> Query
    const updateResponse = await this.staticConfigRepo.updateRowData(
      updatableData,
      id,
    );
    // Validation -> Query data
    if (updateResponse === k500Error) throw new Error();

    return targetList[nextIndex].id;
  }

  private async updateDefaulterAdmin(followerId, loanId) {
    const updateOptions = { where: { loanId, adminId: { [Op.eq]: null } } };

    await this.defualterOnlineRepo.updateRowWhereData(
      { adminId: followerId },
      updateOptions,
    );
  }

  //#region  check app is install origin not
  async checkAppIsInstall(userId) {
    try {
      const userData = await this.getUserData(userId);
      if (userData?.message) return userData;

      const length = userData.length;
      const spans = await this.typeService.splitToNChunks(userData, 50);

      for (let index = 0; index < spans.length; index++) {
        const list = [];
        const targetList = spans[index];
        for (let i = 0; i < targetList.length; i++) {
          const item = targetList[i];
          list.push(this.userService.updateCheckAppInstalled(item));
        }
        await Promise.all(list);
      }
      return length;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get user Data
  private async getUserData(userId) {
    try {
      let options;

      if (userId) options = { where: { id: userId } };
      else {
        const loanModel = {
          model: loanTransaction,
          where: { loanStatus: 'Active' },
          attributes: ['id'],
        };
        options = { include: [loanModel] };
      }
      if (options) {
        const isUnInstallApp = this.typeService
          .getGlobalDate(new Date())
          .toJSON();
        options.where = {
          ...options.where,
          [Op.or]: [
            { isUnInstallApp: { [Op.ne]: isUnInstallApp } },
            { isUnInstallApp: { [Op.eq]: null } },
          ],
        };
        const att = ['id', 'fcmToken', 'isUnInstallApp'];
        const result = await this.userRepo.getTableWhereData(att, options);
        if (result === k500Error) return kInternalError;
        return result;
      } else return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async trackSettledAvail(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      const creationData = {
        userId,
        type: 'SETTLEMENT_AVAIL',
        date: this.typeService.getGlobalDate(new Date()).toJSON(),
      };
      const createdData = await this.userActivityRepo.createRowData(
        creationData,
      );
      if (createdData == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #startregion callDefaulters
  async callDefaulters(query) {
    // Params validation
    const adminId = query.adminId;
    if (!adminId) return kParamMissing('adminId');
    const startDate = query.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = query.endDate;
    if (!endDate) return kParamMissing('endDate');
    const category = query.category;
    if (!category) return kParamMissing('category');
    let targetList = [];
    // Get target audiance
    if (category.includes('DEFAULTER') && !category.includes('UPCOMING')) {
      const params: any = {
        adminId: -1,
        page: 1,
        justData: 'true',
        download: 'true',
      };
      const minPenaltyDays = query?.minPenaltyDays;
      const maxPenaltyDays = query?.maxPenaltyDays;
      if (minPenaltyDays && maxPenaltyDays) {
        params.minPenaltyDays = minPenaltyDays;
        params.maxPenaltyDays = maxPenaltyDays;
      } else if (minPenaltyDays) params.minPenaltyDays = minPenaltyDays;
      const defaultList = await this.dayWiseDetails(params);
      if (defaultList?.message) return defaultList;
      targetList = defaultList;
    } else {
      const passData = {
        adminId,
        emiStatus: '3', // 3 indicates upcoming defaulter category whoes atleast one EMI is past due
        start_date: this.typeService.getGlobalDate(startDate).toJSON(),
        end_date: this.typeService.getGlobalDate(endDate).toJSON(),
        dataWithoutLimit: true,
        extraColumns: ['emiId'],
      };
      const upcomingDefList = await this.emiService.getEmidateRange(passData);
      if (upcomingDefList?.message) return upcomingDefList;
      targetList = upcomingDefList?.rows ?? [];
    }
    // Prepare data for calling
    const finalData = [];
    for (let i = 0; i < targetList.length; i++) {
      try {
        let ele = targetList[i];
        const defaulterObj: any = {
          emiId: ele?.emiId,
          phone: ele['Mobile Number'] ?? ele['Phone'],
          userId: ele?.userId ?? '',
          loanId: ele['Loan Id'] ?? ele['Loan ID'],
        };
        finalData.push(defaulterObj);
      } catch (error) {}
    }
    const callPassData = {
      category,
      adminId: adminId != -1 ? adminId : SYSTEM_ADMIN_ID,
      targetList: finalData,
    };
    /* 'avoidCall' parameter is for testing purposes 
    which simply returns the list of target audiance
    and does not triggers the actual call (even in PRODUCTION !)*/
    const avoidCall = query?.avoidCall?.toString() == 'true';
    if (avoidCall) return callPassData;
    // Starts the calling
    else return await this.callingService.placeCall(callPassData);
  }

  async assignFollowerIdByFile(fileName) {
    try {
      const fileListData: any = await this.fileService.excelToArray(
        fileName,
        {},
        true,
      );
      if (!fileListData || fileListData.message) return fileListData;
      const columnName = fileListData.columnName;
      const fileData = fileListData.finalData;
      if (columnName.includes('Admin ID') && columnName.includes('Loan ID')) {
        const finalData = {};
        for (let i = 0; i < fileData.length; i++) {
          try {
            const element = fileData[i];
            const adminId = element['Admin ID'];
            if (!adminId) continue;
            if (finalData[adminId]) {
              finalData[adminId].push(element['Loan ID']);
            } else {
              finalData[adminId] = [element['Loan ID']];
            }
          } catch (error) {}
        }
        return finalData;
      } else
        return k422ErrorMessage(`Please Enter Proper 'Admin ID' and 'Loan ID'`);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateFollowerAndHistory(adminId, loanIds, changeBy,ip) {
    try {
      for (let index = 0; index < loanIds.length; index++) {
        try {
          //Data validation
          const loanId = loanIds[index];
          const attributes = ['id', 'loanStatus', 'userId', 'followerId'];
          const options = {
            where: { id: loanId },
          };
          const loanData = await this.loanRepo.getRowWhereData(
            attributes,
            options,
          );
          if (loanData == k500Error) continue;
          else if (!loanData) continue;
          else if (loanData.loanStatus != 'Active') continue;

          const oldAdmin = loanData?.followerId ?? '';
          const userId = loanData.userId;
          //Data updation
          const updatedData = { followerId: adminId };
          const updateData = await this.loanRepo.updateRowData(
            updatedData,
            loanId,
          );
          //history
          const createData = {
            userId,
            loanId,
            type: 'Defaulter',
            subType: kChangeFollowerId,
            oldData: oldAdmin,
            newData: adminId,
            adminId: changeBy,
          };
          const createdData = await this.changeLogsRepo.create(createData);
          if (!createdData || createdData == k500Error) return kInternalError;
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async placePIWiseAutoDebits(reqData) {
    // Get target list from database
    const loanList: any = await this.getDataForPlacePIWiseAutoDebits(reqData);
    if (loanList?.message) return loanList;

    // Prepare data for auto debit
    const placeList = [];
    const tommorrow = this.typeService.getGlobalDate(new Date());
    tommorrow.setDate(tommorrow.getDate() + 1);
    const submissionDate = tommorrow.toJSON();
    for (let index = 0; index < loanList.length; index++) {
      try {
        const loanData = loanList[index];
        loanData.emiData.sort((a, b) => a.id - b.id);
        const emiList = loanData.emiData.filter((el) => +el.emi_amount > 10);
        if (emiList.length == 0) continue;
        let duePIAmount = emiList.reduce(
          (curr, el) => curr + +el.emi_amount,
          0,
        );
        duePIAmount = Math.floor(duePIAmount);
        const emiId = emiList[0].id;
        if (!emiId) continue;
        const loanId = loanData.id;
        if (!loanId) continue;

        placeList.push(
          ...Array(5).fill({
            amount: Math.floor(duePIAmount / 5),
            emiId,
            sendSMS: false,
            loanId,
            adminId: SYSTEM_ADMIN_ID,
            source: 'AUTOPAY',
            submissionDate,
            isGreaterEMI: true,
            remarks: 'COLLECTION_DEPARTMENT_DEMAND',
          }),
        );
      } catch (error) {}
    }

    // Place auto debit
    for (let index = 0; index < placeList.length; index++) {
      try {
        const data = placeList[index];
        const response = await this.sharedTransaction.funCreatePaymentOrder(
          data,
        );
        // Do not remove this log
        console.log({
          response,
          loanId: data.loanId,
          index,
          totalLength: placeList.length,
        });
      } catch (error) {}
    }
  }

  private async getDataForPlacePIWiseAutoDebits(reqData) {
    // Params validation
    const adminId = reqData.adminId;
    if (!adminId) return kParamMissing('adminId');
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    let loanIds = reqData.loanIds;
    // In case loop got terminated some how so we can start from last loanId
    const lastUsedLoanId = reqData.lastUsedLoanId;

    let attributes: any = [];
    let options: any = {};

    // Get target loanIds
    if (!loanIds) {
      attributes = ['loanId'];
      options = {
        group: ['loanId'],
        where: {
          emi_date: { [Op.gte]: startDate, [Op.lte]: endDate },
          loanId: { [Op.notIn]: DEMO_DETAILS.LOAN_IDS },
          payment_status: '0',
          payment_due_status: '1',
          partOfemi: 'LAST',
        },
      };
      if (lastUsedLoanId) options.where.loanId = { [Op.gt]: lastUsedLoanId };
      const emiList = await this.emiRepo.getTableWhereData(attributes, options);
      if (emiList == k500Error) return kInternalError;
      loanIds = emiList.map((el) => el.loanId);
    }

    // Table joins
    const emiInclude: SequelOptions = { model: EmiEntity };
    emiInclude.attributes = ['emi_amount', 'id'];
    emiInclude.where = {
      emi_date: { [Op.gte]: startDate, [Op.lte]: endDate },
      payment_status: '0',
      payment_due_status: '1',
    };
    const include = [emiInclude];

    attributes = ['id'];
    options = {
      include,
      order: [['id']],
      where: { id: loanIds, loanStatus: 'Active' },
    };

    const loanList = await this.loanRepo.getTableWhereData(attributes, options);
    if (loanList == k500Error) return kInternalError;
    return loanList;
  }
  //#region get daily defaulter sunnary
  async dailySummaryDelivery(reqData) {
    let date = new Date();
    date.setDate(date.getDate() - 1);
    if (reqData?.date) date = reqData?.date;
    const end_date = this.typeService.getGlobalDate(date);
    const start_date = new Date(end_date);
    start_date.setDate(1);

    /// get completed date range data  from transaction
    const temp_trans: any = await this.getTransactionData(start_date, end_date);
    if (temp_trans?.message) return temp_trans;

    /// get defaulter emi unpaid
    const emi_data = await this.getUnPaidDefaulterEMI(temp_trans);
    if (emi_data?.message) return kInternalError;

    /// prepare transaction
    const final_trans = await this.prePareTransaction(temp_trans, emi_data);

    /// pre pare summary object
    return await this.prePareSummaryObject(final_trans, emi_data, end_date);
  }
  //#endregion

  //#region get transaction data
  private async getTransactionData(start_date, end_date) {
    const options = {
      where: {
        status: 'COMPLETED',
        type: { [Op.ne]: kRefund },
        followerId: { [Op.ne]: null },
        completionDate: {
          [Op.gte]: start_date.toJSON(),
          [Op.lte]: end_date.toJSON(),
        },
      },
    };
    const att = ['paidAmount', 'completionDate', 'loanId', 'emiId'];

    const result = await this.transactionRepo.getTableWhereData(att, options);
    if (!result || result === k500Error) return kInternalError;
    if (result.length === 0) return kNoDataFound;
    return result;
  }
  //#endregion

  //#region get unpaid defaulter emi
  private async getUnPaidDefaulterEMI(transaction_data) {
    const loan_id_list = transaction_data.map((m) => m.loanId).filter((f) => f);
    if (loan_id_list.length === 0) return kNoDataFound;

    const options = {
      where: {
        [Op.or]: [
          { payment_status: '0', payment_due_status: '1' },
          { loanId: loan_id_list, payment_due_status: '1' },
        ],
      },
      order: [['id']],
    };
    const att = [
      'id',
      'loanId',
      'emi_amount',
      'payment_status',
      'payment_due_status',
      'pay_type',
      'penalty_days',
      'principalCovered',
      'interestCalculate',
      'penalty',
    ];
    const result = await this.emiRepo.getTableWhereData(att, options);
    if (!result || result === k500Error) return kInternalError;

    /// get follower id
    const loan_options = {
      where: {
        [Op.or]: [{ id: loan_id_list }, { loanStatus: 'Active' }],
        followerId: { [Op.ne]: null },
      },
    };
    const loan_att = ['id', 'followerId'];
    const loan_result = await this.loanRepo.getTableWhereData(
      loan_att,
      loan_options,
    );
    if (!loan_result || loan_result === k500Error) return kInternalError;
    for (let index = 0; index < result.length; index++) {
      const emi = result[index];
      const find = loan_result.find((f) => f.id === emi.loanId);
      if (find) result[index].followerId = find.followerId;
    }
    return result;
  }
  //#endregion

  //#region prepare transaction
  private async prePareTransaction(transaction_data, emi_data) {
    for (let index = 0; index < transaction_data.length; index++) {
      const trans = transaction_data[index];
      const loanId = trans.loanId;
      const emiId = trans.emiId;

      const filter = emi_data.filter((f) => f.loanId === loanId);
      filter.sort((a, b) => a.penalty_days - b.penalty_days);
      let find;
      if (emiId) {
        find = filter.find((f) => f.id === emiId);
      } else if (filter.length > 0) {
        const dueStatus = filter.find(
          (f) => f.pay_type === kFullPay && f.payment_due_status === '1',
        );
        if (dueStatus) transaction_data[index].payment_due_status = '1';
        find = filter[0];
        if (find) {
          find.penalty_days = filter.reduce(
            (sum, emi) => sum + (emi?.penalty_days ?? 0),
            0,
          );
        }
      }
      if (find) {
        transaction_data[index].penalty_days = find.penalty_days;
        transaction_data[index].followerId = find.followerId;
        if (find.id === emiId && !transaction_data[index].payment_due_status)
          transaction_data[index].payment_due_status = find.payment_due_status;
      }
    }
    return transaction_data.filter((f) => f.penalty_days);
  }
  //#endregion

  //#region prepare object summary
  private async prePareSummaryObject(transaction_data, emi_data, end_date) {
    const day_ranges = [
      { key: '1-15', min: 1, max: 15 },
      { key: '16-30', min: 16, max: 30 },
      { key: '31-60', min: 31, max: 60 },
      { key: '61-90', min: 61, max: 90 },
      { key: '91+', min: 91, max: 10000 },
    ];

    // pre pare agent or day wise data
    const { day_wise, agent_wise } = await this.prePareDayOrAgent(
      transaction_data,
      day_ranges,
    );

    const day_agent_wise = await this.prePareDayAndAgent(
      transaction_data,
      emi_data,
      end_date,
      day_ranges,
    );

    const reportDate = new Date(end_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    await this.sharedNotificationService.sendEmailToUser(
      kTCollectionSummary,
      kQa[0],
      null,
      { reportDate, day_wise, agent_wise, day_agent_wise },
    );
    return { reportDate, day_wise, agent_wise, day_agent_wise };
  }
  //#endregion

  //#region pre pare day or agent wise data
  private async prePareDayOrAgent(transaction_data, day_ranges) {
    const day_wise = {};
    const agent_wise = {};
    for (let index = 0; index < transaction_data.length; index++) {
      try {
        const trans = transaction_data[index];
        const date_key = new Date(trans.completionDate).getDate();
        if (trans?.payment_due_status === '1') {
          const day_key = day_ranges.find(
            (f) => trans.penalty_days >= f.min && f.max >= trans.penalty_days,
          )?.key;
          /// if first time then add date keys
          if (!day_wise[date_key]) {
            day_wise[date_key] = { key: date_key };
            day_ranges.forEach((ele) => {
              day_wise[date_key][ele.key] = 0;
            });
            day_wise[date_key].Total = 0;
          }
          day_wise[date_key][day_key] += trans.paidAmount;
          day_wise[date_key].Total += trans.paidAmount;

          /// if first time agent
          if (!agent_wise[date_key]) agent_wise[date_key] = { key: date_key };
          const followerId = await this.commonService.getAdminData(
            trans.followerId,
          );
          const followerName = followerId?.fullName;
          if (!agent_wise[date_key][followerName])
            agent_wise[date_key][followerName] = 0;
          agent_wise[date_key][followerName] += trans.paidAmount;
        }
      } catch (error) {}
    }

    const day_wise_details = Object.values(day_wise);
    /// pre pare object for total
    const temp = this.prePareObjectKey(day_wise_details);
    day_wise_details.push(temp);
    /// formate amount
    this.formateAmount(day_wise_details);

    let agent_wise_details = Object.values(agent_wise);
    agent_wise_details = this.setAgentWiseDetails(agent_wise_details);
    let adminList = Object.keys(agent_wise_details[0]);
    adminList.shift();

    /// pre pare object for total
    const temp_agent = this.prePareObjectKey(agent_wise_details);
    agent_wise_details.push(temp_agent);
    /// formate amount
    this.formateAmount(agent_wise_details);
    return {
      day_wise: day_wise_details,
      agent_wise: { agent_wise_details, adminList },
    };
  }
  //#endregion

  //#region pre pare agent and day wise data
  private async prePareDayAndAgent(
    transaction_data,
    emi_data,
    end_date,
    day_ranges,
  ) {
    const staticConfigData = await this.staticConfigRepo.getTableWhereData(
      ['id', 'data'],
      { where: { type: 'COLLECTION_REPORT' } },
    );
    const result = {};
    staticConfigData.forEach((item) => {
      const [key, ...values] = item.data;
      result[key] = {
        key,
        value: values.map(Number),
      };
    });

    const acenna_list = result['Acenna'];
    const debtcare_list = result['Debtcare'];
    const drTech_list = result['Dr Tech'];
    const day_agent_wise = {};
    // const follower_list1: any = [...new Set(emi_data.map((m) => m.followerId))];
    // follower_list1.sort((a, b) => a - b);

    let adminId = -1;
    const follower_list = await this.getTargetAdmins(adminId);
    follower_list.sort((a, b) => a - b);

    for (let index = 0; index < follower_list.length; index++) {
      const followerId = await this.commonService.getAdminData(
        follower_list[index],
      );

      if (!followerId?.id) continue;
      let followerName = followerId?.fullName;
      if (acenna_list.value.includes(followerId?.id)) {
        followerName = acenna_list.key;
        if (!day_agent_wise[followerName])
          day_agent_wise[followerName] = { key: followerName };
      } else if (debtcare_list.value.includes(followerId?.id)) {
        followerName = debtcare_list.key;
        if (!day_agent_wise[followerName])
          day_agent_wise[followerName] = { key: followerName };
      } else if (drTech_list.value.includes(followerId?.id)) {
        followerName = drTech_list.key;
        if (!day_agent_wise[followerName])
          day_agent_wise[followerName] = { key: followerName };
      } else day_agent_wise[followerName] = { key: followerName };
      let total_overdue = 0;
      let total_recovered = 0;
      for (let j = 0; j < day_ranges.length; j++) {
        const range = day_ranges[j];
        /// sum recode amount
        let sum_recover = transaction_data
          .filter(
            (f) =>
              f.followerId === followerId.id &&
              f.completionDate === end_date.toJSON() &&
              f.penalty_days >= range.min &&
              f.penalty_days <= range.max &&
              f.payment_due_status === '1',
          )
          .map((m) => m.paidAmount)
          .reduce((a, b) => a + b, 0);

        /// sum overdue amount
        const loanList = [
          ...new Set(
            emi_data
              .filter((f) => f.followerId === followerId.id)
              .map((m) => m.loanId),
          ),
        ];

        let sum_overdue = 0;
        for (let i = 0; i < loanList.length; i++) {
          const loanId = loanList[i];
          const emi_list = emi_data.filter(
            (f) =>
              f.followerId === followerId.id &&
              f.payment_status == '0' &&
              loanId == f.loanId,
          );

          if (emi_list.length) {
            const penalty_days = emi_list.reduce(
              (a, b) => a + b?.penalty_days,
              0,
            );
            if (penalty_days >= range.min && penalty_days <= range.max) {
              sum_overdue += emi_list
                .map((m) => +m.emi_amount + +m.penalty)
                .reduce((a, b) => a + b, 0);
            }
          }
        }

        if (day_agent_wise[followerName][range.key]) {
          sum_overdue += day_agent_wise[followerName][range.key].overdue;
          sum_recover += day_agent_wise[followerName][range.key].recovered;
        }

        total_overdue += sum_overdue;
        total_recovered += sum_recover;
        day_agent_wise[followerName][range.key] = {
          overdue: sum_overdue,
          recovered: sum_recover,
        };
      }
      day_agent_wise[followerName]['Total'] = {
        overdue: total_overdue,
        recovered: total_recovered,
      };
    }

    const day_agent_wise_details = Object.values(day_agent_wise);
    /// pre pare object for total
    const temp_agent = this.prePareObjectKey(
      JSON.parse(JSON.stringify(day_agent_wise_details)),
    );
    day_agent_wise_details.push(temp_agent);
    /// formate amount
    this.formateAmount(day_agent_wise_details);
    return day_agent_wise_details;
  }
  //#endregion

  //#region pre pare object key
  private prePareObjectKey(data_temp) {
    const temp = { key: 'Total' };
    for (let index = 0; index < data_temp.length; index++) {
      const ele = data_temp[index];
      const keys = Object.keys(ele);
      keys.forEach((key) => {
        if (key !== 'key') {
          const value = ele[key] ?? 0;
          if (typeof value === 'object') {
            if (!temp[key]) temp[key] = JSON.parse(JSON.stringify(value));
            else {
              const temp_keys = Object.keys(value);
              temp_keys.forEach((temp_ele) => {
                temp[key][temp_ele] =
                  temp[key][temp_ele] + value[temp_ele] ?? 0;
              });
            }
          } else temp[key] = (temp[key] ?? 0) + value;
        }
      });
    }
    return temp;
  }
  //#endregion

  //#region set agent wise details
  private setAgentWiseDetails(agent_wise_details) {
    let agent_list = [];
    for (let index = 0; index < agent_wise_details.length; index++) {
      const ele = agent_wise_details[index];
      agent_list.push(...Object.keys(ele));
    }
    agent_list = [...new Set(agent_list)];
    agent_wise_details.sort((a, b) => a.key - b.key);

    const temp_list = [];

    for (let index = 0; index < agent_wise_details.length; index++) {
      const ele = agent_wise_details[index];
      const temp = { key: 0 };
      let total = 0;
      let acennaTotal = 0;
      let debtcareTotal = 0;
      let drTechTotal = 0;
      agent_list.forEach((key) => {
        const lowerKey = key.toLowerCase();
        temp[key] = ele[key] ?? 0;
        if (lowerKey !== 'key') {
          total += ele[key] ?? 0;
          if (lowerKey.includes('acenna')) acennaTotal += ele[key] ?? 0;
          if (lowerKey.includes('debtcare')) debtcareTotal += ele[key] ?? 0;
          if (lowerKey.includes('dr tech')) drTechTotal += ele[key] ?? 0;
        }
      });
      const search = ['acenna', 'debtcare', 'dr tech'];

      const filteredTemp = Object.keys(temp)
        .filter(
          (key) => !search.some((term) => key.toLowerCase().includes(term)),
        )
        .reduce((result, key) => {
          result[key] = temp[key];
          return result;
        }, {});

      filteredTemp['Acenna'] = acennaTotal;
      filteredTemp['Debtcare'] = debtcareTotal;
      filteredTemp['Dr Tech'] = drTechTotal;
      filteredTemp['Total'] = total;
      temp_list.push(filteredTemp);
    }
    return temp_list;
  }
  //#endregion

  //#region formate amount in
  private formateAmount(day_wise_details) {
    day_wise_details.forEach((ele) => {
      const keys = Object.keys(ele);
      keys.forEach((key) => {
        if (key != 'key') {
          const value = ele[key];
          if (typeof value === 'object') {
            const temp_keys = Object.keys(value);
            temp_keys.forEach((temp_key) => {
              const a = ele[key][temp_key];
              ele[key][
                temp_key
              ] = `${kRuppe} ${this.typeService.amountToLakhsAndCrores(
                this.typeService.numberRoundWithCommas(ele[key][temp_key] ?? 0),
              )}`;
            });
          } else
            ele[key] = `${kRuppe} ${this.typeService.amountToLakhsAndCrores(
              this.typeService.numberRoundWithCommas(value),
            )}`;
        }
      });
    });
  }
  //#endregion

  async reverseSettlement(body) {
    try {
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const loanId = body?.loanId;
      if (!loanId) return kParamMissing('loanId');
      const grantedAdmins = [1, 2, 7, 8, 14, 31, 48, 56, 63];
      if (!grantedAdmins.includes(adminId))
        return k422ErrorMessage('Unauthorized attempt');
      const ip = body.ip;

      // Get data
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = [
        'id',
        'interestCalculate',
        'payment_status',
        'penalty',
        'principalCovered',
        'partPaymentPenaltyAmount',
        'waiver',
      ];
      const transactionInclude: any = { model: TransactionEntity };
      transactionInclude.attributes = [
        'completionDate',
        'id',
        'interestAmount',
        'paidAmount',
        'penaltyAmount',
        'principalAmount',
        'response',
      ];
      transactionInclude.where = { status: kCompleted };
      transactionInclude.required = false;
      const attributes = ['loanStatus', 'userId'];
      const options = {
        include: [emiInclude, transactionInclude],
        where: { id: loanId },
      };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage('No data found');
      const userId = loanData?.userId;
      const isLoanActive = loanData.loanStatus == 'Active';
      if (!isLoanActive) return k422ErrorMessage('Loan should be active');

      // PI Wise calculation for EMIs
      const emiList = loanData.emiData ?? [];
      const transList = loanData.transactionData ?? [];
      transList.sort((a, b) => a.id - b.id);
      const expectedPrincipalAmount = emiList.reduce(
        (accumulator, currentValue) => {
          const principalAmount = currentValue.principalCovered ?? 0;
          const interestAmount = currentValue.interestCalculate ?? 0;
          return Math.floor(accumulator + principalAmount + interestAmount);
        },
        0,
      );
      const totalPaidAmount = transList.reduce((accumulator, currentValue) => {
        return Math.floor(accumulator + currentValue?.paidAmount);
      }, 0);
      const diffAmount = expectedPrincipalAmount - totalPaidAmount;
      if (diffAmount > 10) {
        return k422ErrorMessage(
          'Total outstanding amount is still not covered',
        );
      }

      for (let index = 0; index < transList.length; index++) {
        try {
          const rawResponse = transList[index].response
            ? JSON.parse(transList[index].response)
            : {};
          transList[index].response = JSON.stringify({
            ...rawResponse,
            reverseSettlement: JSON.stringify(transList[index]),
          });
          transList[index].interestAmount = 0;
          transList[index].penaltyAmount = 0;
          transList[index].principalAmount = 0;
          transList[index].coveredAmount = transList[index]?.paidAmount;
          for (let i = 0; i < emiList.length; i++) {
            try {
              if (transList[index]?.paidAmount == 0) continue;
              const dueAmount =
                emiList[i]?.principalCovered + emiList[i]?.interestCalculate;
              if (dueAmount == 0) continue;
              this.reCalculateBifurcation(transList[index], emiList[i]);
            } catch (error) {}
          }
        } catch (error) {}
      }
      const isDiscrepancy = emiList.find(
        (el) => el.principalCovered > 1 || el.interestCalculate > 1,
      );
      if (isDiscrepancy)
        return k422ErrorMessage(
          'Complex calculation required, kindly contact IT support',
        );

      // Penalty calculation
      for (let index = 0; index < transList.length; index++) {
        try {
          transList[index].interestAmount = parseFloat(
            transList[index].interestAmount.toFixed(2),
          );
          transList[index].penaltyAmount = parseFloat(
            transList[index].penaltyAmount.toFixed(2),
          );
          transList[index].principalAmount = parseFloat(
            transList[index].principalAmount.toFixed(2),
          );
          if (transList[index].paidAmount == 0) continue;

          transList[index].penaltyAmount = parseFloat(
            transList[index].paidAmount.toFixed(2),
          );
          transList[index].paidAmount = 0;
        } catch (error) {}
      }

      // Cross verification
      let paidBifurcation = 0;
      let totalCovered = 0;
      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          paidBifurcation +=
            transData.principalAmount +
            transData.penaltyAmount +
            transData.interestAmount;
          totalCovered += transData.coveredAmount;
          delete transData.coveredAmount;
          delete transData.paidAmount;
          transData.accStatus = kCalBySystem;
        } catch (error) {}
      }
      const difference = Math.abs(paidBifurcation - totalCovered);
      if (difference > 2)
        return k422ErrorMessage(
          'Complex calculation, kindly contact IT support',
        );

      let paidPenalty = 0;
      // Update transactions as per new bifurcation
      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          const id = transData?.id;
          delete transData.id;
          const updatedData = { ...transData };
          paidPenalty += updatedData?.penaltyAmount;
          delete updatedData.completionDate;
          const updateRes = await this.transactionRepo.updateRowData(
            updatedData,
            id,
            true,
          );
          if (updateRes == k500Error)
            return k422ErrorMessage('Error while updating the transactions');
        } catch (error) {}
      }
      let totalExpectedAmount = 0;

      // Close remaining EMIs
      for (let index = 0; index < emiList.length; index++) {
        try {
          const emiData = emiList[index];
          const principalAmount = +emiData?.principalCovered ?? 0;
          const interestAmount = +emiData?.interestCalculate ?? 0;
          if (emiData?.pay_type == 'FULLPAY') {
            const fullPayInterest = Math.ceil(+emiData?.fullPayInterest);
            totalExpectedAmount += principalAmount + fullPayInterest;
          } else totalExpectedAmount += principalAmount + interestAmount;
          const updatedData: any = { pay_type: 'EMIPAY', penalty: 0 };
          if (emiData.payment_status != '1') {
            updatedData.payment_done_date =
              transList[transList.length - 1]?.completionDate;
            updatedData.payment_status = '1';
          }
          /// if paidPenalty amount is geter then zero
          if (paidPenalty > 0) {
            updatedData.partPaymentPenaltyAmount = 0;
            let emiPenalty =
              (emiData.penalty ?? 0) + (emiData.partPaymentPenaltyAmount ?? 0);
            if (emiPenalty >= paidPenalty) {
              updatedData.partPaymentPenaltyAmount = paidPenalty;
              emiData.penalty = emiPenalty - paidPenalty;
              paidPenalty = 0;
            } else {
              updatedData.partPaymentPenaltyAmount = emiPenalty;
              paidPenalty -= emiPenalty;
              emiData.penalty = 0;
            }
          }
          const waiver = emiData.waiver ?? 0;
          updatedData.waiver = waiver + emiData.penalty ?? 0;

          const updateRes = await this.emiRepo.updateRowData(
            updatedData,
            emiData.id,
          );
          if (updateRes == k500Error)
            return k422ErrorMessage('Error while updating the emis');
        } catch (error) {}
      }
      const canCompleteLoan =
        await this.sharedTransaction.isEligibleForLoanClose(loanId);
      if (canCompleteLoan) {
        const closeLoan: any = await this.sharedTransaction.closeTheLoan({
          loanId,
          userId,
        });
        if (closeLoan?.message) return closeLoan;
      }
      return await this.keepLogForReverseSettlement(
        loanId,
        loanData.userId,
        adminId,
        ip
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private reCalculateBifurcation(transData, emiData) {
    // Principal Amount
    if (
      emiData.principalCovered != 0 &&
      transData.paidAmount > emiData.principalCovered
    ) {
      transData.principalAmount += emiData.principalCovered;
      transData.paidAmount = transData.paidAmount - emiData.principalCovered;
      emiData.principalCovered = 0;
    } else if (
      emiData.principalCovered != 0 &&
      transData.paidAmount < emiData.principalCovered
    ) {
      emiData.principalCovered =
        emiData.principalCovered - transData.paidAmount;
      transData.principalAmount += transData.paidAmount;
      transData.paidAmount = 0;
    }
    if (transData.paidAmount == 0) return;

    // Interest Amount
    if (
      emiData.interestCalculate != 0 &&
      transData.paidAmount > emiData.interestCalculate
    ) {
      transData.interestAmount += emiData.interestCalculate;
      transData.paidAmount = transData.paidAmount - emiData.interestCalculate;
      emiData.interestCalculate = 0;
    } else if (
      emiData.interestCalculate != 0 &&
      transData.paidAmount < emiData.interestCalculate
    ) {
      emiData.interestCalculate =
        emiData.interestCalculate - transData.paidAmount;
      transData.interestAmount += transData.paidAmount;
      transData.paidAmount = 0;
    }
    if (transData.paidAmount == 0) return;
  }

  private async keepLogForReverseSettlement(loanId, userId, adminId,ip) {
    try {
      const creationData = {
        loanId,
        adminId,
        userId,
        type: 'Defaulters',
        subType: 'Reverse settlement',
        newData: '',
        oldData: '',
        ip
      };
      const createdData = await this.changeLogsRepo.create(creationData);
      if (createdData == k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async periodicFetchAAUser(query) {
    // Param Validation
    const loanId = query.loanId;
    if (!loanId) return kParamMissing('loanId');

    // Hit -> Query
    const bankAttr = [
      'id',
      'sessionId',
      'consentId',
      'consentHandleId',
      'consentPhone',
    ];
    const bankOptions = {
      order: [['id', 'DESC']],
      where: {
        consentMode: kfinvu,
        consentId: { [Op.ne]: null },
        consentStatus: 'ACCEPTED',
        loanId,
      },
    };
    // Hit -> Query
    const bankingData = await this.bankingRepo.findOne(bankAttr, bankOptions);
    // Validation -> Query data
    if (bankingData === k500Error) throw new Error();
    if (!bankingData) return k422ErrorMessage(kNoDataFound);

    // Request new data
    const consentId = bankingData.consentId;
    const consentHandleId = bankingData.consentHandleId;
    const custId = this.cryptService.decryptPhone(bankingData.consentPhone);
    const sessionId = await this.finvuService.fetchDataRequest(
      custId,
      consentId,
      consentHandleId,
    );

    // Update bank record
    const updateData = await this.bankingRepo.updateRowData(
      { sessionId },
      bankingData.id,
    );
    if (updateData === k500Error) throw new Error();

    return true;
  }

  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
}
