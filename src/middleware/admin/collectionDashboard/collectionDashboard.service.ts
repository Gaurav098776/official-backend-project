import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { kInternalError, kInvalidParamValue } from 'src/constants/responses';
import { ReportService } from '../report/report.service';
import { TypeService } from 'src/utils/type.service';
import { DefaulterService } from '../defaulter/defaulter.service';
import { CrmRepository } from 'src/repositories/crm.repository';
import { DateService } from 'src/utils/date.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { exotelCategoryId, SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { kMonths } from 'src/constants/objects';
import { k500Error } from 'src/constants/misc';
import { Op, Sequelize } from 'sequelize';
import * as moment from 'moment';
import { LoanService } from '../loan/loan.service';
import { admin } from 'src/entities/admin.entity';
import { StringService } from 'src/utils/string.service';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';

let totalAmount: any = 0;
const allowedPerformances: any = ['T', 'M', 'Q', 'W'];
const allowedQuarterly: any = ['Q1', 'Q2', 'Q3', 'Q4', 'AQ'];

@Injectable()
export class collectionDashboardService {
  constructor(
    private readonly typeService: TypeService,
    @Inject(forwardRef(() => DefaulterService))
    private readonly service: DefaulterService,
    private readonly dateService: DateService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
    private readonly crmRepo: CrmRepository,
    private readonly commonSharedService: CommonSharedService,
    @Inject(forwardRef(() => LoanService))
    private readonly loanService: LoanService,
    private readonly strService: StringService,
    private readonly exotelCallHistoryService: ExotelCallHistoryRepository,
  ) {}
  async collectionChartData(body) {
    try {
      body.adminId = body?.adminId ?? '-1';
      let performance = (body?.performance ?? 'T').toUpperCase();
      const adminList = await this.service.getTargetAdmins(body.adminId);

      let lastDates: any = [];
      let lastDateRange: any = [];
      let lastDateRangeData: any = [];
      let currentData: any = [];
      let previousData: any = [];

      const currentDates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (currentDates.message) return currentDates;
      if (performance == 'T') {
        await Promise.all(
          adminList.map(async (user) => {
            const data = await this.reportService.collectionPaymentByAdmin(
              currentDates.startDate,
              currentDates.endDate,
              user,
              null,
            );
            if (data === k500Error) return kInternalError;
            for (let index = 0; index < data.paymentData.length; index++) {
              const element = data.paymentData[index];
              currentData.push({
                amount: element?.amount,
                paidDate: element?.paidDate,
                completionDate: element?.completionDate,
              });
            }
          }),
        );
        currentData = await this.getFinalData(
          performance,
          currentData,
          body.quarterly,
          true,
        );
      } else {
        const currentDateRangeData: any = [];

        await Promise.all(
          adminList.map(async (user) => {
            const data = await this.reportService.collectionPaymentByAdmin(
              currentDates.startDate,
              currentDates.endDate,
              user,
              null,
            );
            if (data === k500Error) return kInternalError;
            for (let index = 0; index < data.paymentData.length; index++) {
              const element = data.paymentData[index];
              currentDateRangeData.push({
                amount: element?.amount,
                paidDate: element?.paidDate,
                completionDate: element?.completionDate,
              });
            }
          }),
        );

        const currentDateRange = this.typeService.getDateRange(
          new Date(currentDates.startDate),
          new Date(currentDates.endDate),
        );
        currentData = await this.mapDateData(
          currentDateRangeData,
          currentDateRange,
        );
        currentData = await this.getFinalData(
          performance,
          currentData,
          body.quarterly,
          true,
        );
      }

      if (performance == 'W' || performance == 'M' || performance == 'T') {
        lastDates = await this.startEndDate(performance, true, body.quarterly);
        if (lastDates.message) return currentDates;
        if (performance == 'T') {
          await Promise.all(
            adminList.map(async (user) => {
              const data = await this.reportService.collectionPaymentByAdmin(
                lastDates.startDate,
                lastDates.endDate,
                user,
                null,
              );
              if (data === k500Error) return kInternalError;
              for (let index = 0; index < data.paymentData.length; index++) {
                const element = data.paymentData[index];
                previousData.push({
                  amount: element?.amount,
                  paidDate: element?.paidDate,
                  completionDate: element?.completionDate,
                });
              }
            }),
          );
          previousData = await this.getFinalData(performance, previousData);
        } else {
          await Promise.all(
            adminList.map(async (user) => {
              const data = await this.reportService.collectionPaymentByAdmin(
                lastDates.startDate,
                lastDates.endDate,
                user,
                null,
              );
              if (data === k500Error) return kInternalError;
              for (let index = 0; index < data.paymentData.length; index++) {
                const element = data.paymentData[index];
                lastDateRangeData.push({
                  amount: element?.amount,
                  paidDate: element?.paidDate,
                  completionDate: element?.completionDate,
                });
              }
            }),
          );
          if (lastDateRangeData === k500Error) return kInternalError;
          lastDateRange = this.typeService.getDateRange(
            new Date(lastDates.startDate),
            new Date(lastDates.endDate),
          );
          previousData = await this.mapDateData(
            lastDateRangeData,
            lastDateRange,
          );
          previousData = await this.getFinalData(performance, previousData);
        }
      }
      if (totalAmount > 0) totalAmount = totalAmount.toFixed(0);

      return { currentData, previousData, totalAmount };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async totalCollection(body) {
    try {
      let performance = (body?.performance ?? 'T').toUpperCase();
      const adminList = await this.service.getTargetAdmins(-1);

      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (dates.message) return dates;

      if (performance == 'T') {
        dates.startDate = this.typeService
          .getGlobalDate(new Date(dates.startDate))
          .toJSON();
        dates.endDate = this.typeService
          .getGlobalDate(new Date(dates.endDate))
          .toJSON();
      }

      let result: any = await this.getAllUsersData(
        dates.startDate,
        dates.endDate,
        adminList,
      );
      result = result.slice(0, 3);

      if (result === k500Error) return kInternalError;
      const currentData = [];
      if (result[0]?.amount == 0) return currentData;
      for (let i = 0; i < result.length; i++) {
        try {
          const indexData = result[i];
          let name: any = await this.commonSharedService.getAdminData(
            indexData.adminId,
          );
          if (i <= 2 && indexData.amount > 0) {
            currentData.push({
              Rank: i + 1,
              Name: name.fullName,
            });
          }
        } catch (error) {}
      }
      return { currentData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async collectionGoalData(body) {
    try {
      const adminId = body?.adminId ?? '-1';
      const adminList = await this.service.getTargetAdmins(adminId);
      let performance = (body?.performance ?? 'T').toUpperCase();
      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );

      if (dates.message) return dates;
      const bodyData = {
        adminList,
        minDate: dates.startDate,
        maxDate: dates.endDate,
        isCount: 'false',
      };

      let currentData: any = [];
      currentData = await this.getAllUsersData(
        dates.startDate,
        dates.endDate,
        adminList,
      );
      if (currentData === k500Error) return kInternalError;

      let crmList: any = await this.getPtpGoalDataQuery(bodyData, adminId);
      if (crmList === k500Error) return kInternalError;
      let collectionGoal: any = crmList?.totalAmount ?? 0;
      let amount: any = 0;
      for (let index = 0; index < currentData.length; index++) {
        const element = currentData[index];
        amount += element.amount;
      }
      let remainingAmount: any = collectionGoal - amount;

      if (collectionGoal < amount) {
        remainingAmount = 0;
      }
      let collectionPercent: any = 0;

      if (collectionGoal != 0 && amount > 0) {
        collectionPercent = parseFloat(
          ((amount * 100) / collectionGoal).toFixed(),
        );
      }
      if (amount > 0 || remainingAmount > 0 || collectionGoal > 0) {
        collectionGoal = collectionGoal.toFixed();
        amount = amount.toFixed();
        remainingAmount = remainingAmount.toFixed();
      }
      return {
        collectionGoal,
        collected: amount,
        remainingAmount,
        collectionPercent,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async ptpData(body) {
    try {
      const adminId = body?.adminId ?? '-1';
      const adminList = await this.service.getTargetAdmins(adminId);
      let performance = (body?.performance ?? 'T').toUpperCase();
      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );

      if (dates.message) return dates;
      const bodyData = {
        adminList,
        minDate: dates.startDate,
        maxDate: dates.endDate,
        isCount: 'false',
      };
      const result = await this.getPtpGoalDataQuery(bodyData, adminId);
      if (result === k500Error) return kInternalError;
      delete result.totalAmount;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async crmActivity(body) {
    try {
      const adminId = body?.adminId ?? '-1';
      let performance = (body?.performance ?? 'T').toUpperCase();

      let currentData: any = [];

      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (dates.message) return dates;
      let todayRange = this.typeService.getUTCDateRange(
        dates.startDate.toString(),
        dates.endDate.toString(),
      );

      const adminInclude = {
        model: admin,
        as: 'adminData',
        attributes: ['id', 'fullName'],
        where: { departmentId: '4' },
      };

      let attributes: any = [
        [
          Sequelize.fn(
            'date_trunc',
            'day',
            Sequelize.col('crmActivity.createdAt'),
          ),
          'paidDate',
        ],
        [Sequelize.fn('COUNT', Sequelize.col('crmActivity.id')), 'amount'],
      ];
      let options = {
        where: {
          adminId: { [Op.ne]: SYSTEM_ADMIN_ID },
          createdAt: {
            [Op.gte]: todayRange.fromDate,
            [Op.lte]: todayRange.endDate,
          },
          loanId: { [Op.ne]: null },
        },
        include: [adminInclude],
        group: ['adminData.id', 'paidDate'],
      };
      if (adminId != -1) {
        options.where.adminId = adminId;
      }
      if (performance === 'T') {
        attributes = [
          'createdAt',
          [Sequelize.fn('COUNT', Sequelize.col('crmActivity.id')), 'amount'],
        ];
        options.group = ['crmActivity.createdAt', 'adminData.id'];
      }
      let crmList: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );
      if (crmList === k500Error) return kInternalError;
      if (performance !== 'T') {
        const currentDateRange = this.typeService.getDateRange(
          new Date(dates.startDate),
          new Date(dates.endDate),
        );
        currentData = await this.mapDateData(crmList, currentDateRange);
        currentData = await this.getFinalData(
          performance,
          currentData,
          body.quarterly,
          true,
        );
        return { currentData, totalAmount };
      }
      const startTime = new Date('2024-01-20T00:00:00.000Z');
      const endTime = new Date('2024-01-20T23:59:59.999Z');

      const intervalStarts = [];
      for (
        let time = startTime.getTime();
        time <= endTime.getTime();
        time += 4 * 3600 * 1000
      ) {
        const startDate = new Date(time);
        const endDate = new Date(time + 4 * 3600 * 1000);
        const startHour = startDate.getUTCHours();
        const endHour = endDate.getUTCHours();
        const endAMPM = endHour >= 12 ? 'PM' : 'AM';
        const formattedStartHour = startHour % 12 === 0 ? 12 : startHour % 12;
        const formattedEndHour = endHour % 12 === 0 ? 12 : endHour % 12;
        const formattedInterval = `${formattedStartHour}-${formattedEndHour}${endAMPM}`;
        intervalStarts.push(formattedInterval);
      }

      currentData = intervalStarts.map((name) => ({
        name,
        amount: 0,
      }));
      totalAmount = 0;
      crmList.forEach((item) => {
        const date: any = this.typeService
          .dateTimeFormate(item.createdAt)
          .split(' ')[1]
          .substring(0, 2);
        const intervalIndex = Math.floor(date / 4);
        if (intervalIndex >= 0 && intervalIndex < currentData.length) {
          currentData[intervalIndex].amount += +item.amount;
        }
        totalAmount += +item.amount;
      });
      return { currentData, totalAmount };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async recentCrmActivity(body) {
    try {
      let finalData: any = [];
      const adminId = body?.adminId ?? '-1';
      let performance = (body?.performance ?? 'T').toUpperCase();
      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (dates.message) return dates;
      let todayRange = this.typeService.getUTCDateRange(
        dates.startDate.toString(),
        dates.endDate.toString(),
      );

      const adminInclude = {
        model: admin,
        as: 'adminData',
        attributes: ['id', 'fullName'],
        where: { departmentId: '4' },
      };

      let attributes: any = ['loanId', 'relationData', 'adminId'];
      let options = {
        where: {
          adminId: { [Op.ne]: SYSTEM_ADMIN_ID },
          createdAt: {
            [Op.gte]: todayRange?.fromDate,
            [Op.lte]: todayRange?.endDate,
          },
          loanId: { [Op.ne]: null },
        },
        include: [adminInclude],
        limit: 5,
        order: [['createdAt', 'DESC']],
      };
      if (adminId != -1) {
        options.where.adminId = adminId;
        attributes = ['loanId', 'relationData', 'createdAt'];
      }

      let crmList: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );

      if (crmList === k500Error) return kInternalError;

      for (let index = 0; index < crmList.length; index++) {
        try {
          let values: any = {};
          const element = crmList[index];
          let name: any = await this.commonSharedService.getAdminData(
            element?.adminId,
          );
          values.loanId = element?.loanId ?? '-';
          const { EMIData }: any =
            await this.loanService.funEMIAndRepaymentData({
              loanId: values.loanId,
            });

          if (EMIData === k500Error) return kInternalError;

          values.source = element?.relationData?.statusName ?? '-';
          values.disposition = element?.relationData?.dispositionName ?? '-';
          if (adminId != -1) {
            const targetDateInfo = this.dateService.dateToReadableFormat(
              element?.createdAt,
            );
            values.time =
              targetDateInfo.hours +
                ':' +
                targetDateInfo.minutes +
                ' ' +
                targetDateInfo.meridiem ?? '-';
          } else {
            values.executive = name.fullName ?? '-';
          }
          values.unpaidAmount = this.strService.readableAmount(
            EMIData?.totalRemaining ?? '0',
          );
          finalData.push(values);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async bucketWiseCollection(body) {
    try {
      const adminId = body?.adminId ?? '-1';
      const adminList = await this.service.getTargetAdmins(adminId);
      let performance = (body?.performance ?? 'T').toUpperCase();
      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (dates.message) return dates;
      const currentDateRangeData: any = [];

      await Promise.all(
        adminList.map(async (user) => {
          const data = await this.reportService.collectionPaymentByAdmin(
            dates.startDate,
            dates.endDate,
            user,
            null,
          );
          if (data === k500Error) return kInternalError;
          for (let index = 0; index < data.paymentData.length; index++) {
            const element = data.paymentData[index];
            currentDateRangeData.push({
              amount: element?.amount,
              delayDays: element?.delayDays,
            });
          }
        }),
      );

      const buckets = {
        '1-15 Days': { name: '1-15 Days', amount: 0 },
        '16-30 Days': { name: '16-30 Days', amount: 0 },
        '31-45 Days': { name: '31-45 Days', amount: 0 },
        '46-60 Days': { name: '46-60 Days', amount: 0 },
        '61-75 Days': { name: '61-75 Days', amount: 0 },
        '76-90 Days': { name: '76-90 Days', amount: 0 },
        '90+ Days': { name: '90+ Days', amount: 0 },
      };

      currentDateRangeData.forEach((entry) => {
        const { amount, delayDays } = entry;

        if (delayDays >= 1 && delayDays <= 15) {
          buckets['1-15 Days'].amount += amount;
        } else if (delayDays >= 16 && delayDays <= 30) {
          buckets['16-30 Days'].amount += amount;
        } else if (delayDays >= 31 && delayDays <= 45) {
          buckets['31-45 Days'].amount += amount;
        } else if (delayDays >= 46 && delayDays <= 60) {
          buckets['46-60 Days'].amount += amount;
        } else if (delayDays >= 61 && delayDays <= 75) {
          buckets['61-75 Days'].amount += amount;
        } else if (delayDays >= 76 && delayDays <= 90) {
          buckets['76-90 Days'].amount += amount;
        } else {
          buckets['90+ Days'].amount += amount;
        }
      });

      return {
        buckets: Object.values(buckets),
        userCount: currentDateRangeData.length,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async crmStatistics(body) {
    try {
      const adminId = body?.adminId ?? '-1';
      let performance = (body?.performance ?? 'T').toUpperCase();
      const dates: any = await this.startEndDate(
        performance,
        false,
        body.quarterly,
      );
      if (dates.message) return dates;
      let todayRange = this.typeService.getUTCDateRange(
        dates.startDate.toString(),
        dates.endDate.toString(),
      );

      const adminInclude = {
        model: admin,
        as: 'adminData',
        attributes: ['id'],
        where: { departmentId: '4' },
      };

      let attributes: any = ['relationData', 'adminId'];
      let options = {
        where: {
          adminId: { [Op.ne]: SYSTEM_ADMIN_ID },
          createdAt: {
            [Op.gte]: todayRange?.fromDate,
            [Op.lte]: todayRange?.endDate,
          },
          loanId: { [Op.ne]: null },
        },
        include: [adminInclude],
        order: [['createdAt', 'DESC']],
      };
      if (adminId != -1) {
        options.where.adminId = adminId;
      }

      let crmList: any = await this.crmRepo.getTableWhereData(
        attributes,
        options,
      );

      if (crmList === k500Error) return kInternalError;
      const statusCounts = crmList.reduce((acc, record) => {
        const statusName = record?.relationData?.statusName ?? '-';
        acc[statusName] = (acc[statusName] || 0) + 1;
        return acc;
      }, {});

      const allStatusNames = ['Whatsapp', 'Query', 'Phone', 'SMS', 'EMAIL'];

      const statusData = allStatusNames.map((statusName) => ({
        statusName,
        amount: statusCounts[statusName] || 0,
      }));
      return { currentData: statusData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async mapDateData(result, currentDateRange) {
    try {
      const dataValue: any = [];

      for (let i = 0; i < currentDateRange.length; i++) {
        const eDate = currentDateRange[i];
        const temp = {
          name: moment(eDate).toDate(),
          amount: 0,
        };
        const dayRecords = result.filter((el) =>
          moment(eDate).isSame(moment(el?.paidDate), 'day'),
        );
        if (dayRecords.length > 0) {
          temp.amount = dayRecords.reduce((sum, record) => {
            return sum + (+record.amount || 0);
          }, 0);
        }
        dataValue.push(temp);
      }
      return dataValue;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAllUsersData(startDate, endDate, adminList) {
    try {
      const currentData = [];

      await Promise.all(
        adminList.map(async (user) => {
          const data = await this.reportService.collectionPaymentByAdmin(
            startDate,
            endDate,
            user,
            null,
          );
          currentData.push({
            adminId: user,
            amount: data.totalAmount,
          });
        }),
      );
      currentData.sort((a, b) => b.amount - a.amount);

      return currentData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async startEndDate(type, previous = false, quarterly = null) {
    try {
      if (quarterly) quarterly = quarterly.toUpperCase();

      if (!allowedPerformances.includes(type))
        return kInvalidParamValue('performances');

      if (type === 'W') {
        if (previous) {
          let startOfLastWeek: any = this.typeService
            .getGlobalDate(
              moment().startOf('isoWeek').subtract(1, 'week').toDate(),
            )
            .toJSON();
          let endOfLastWeek: any = this.typeService
            .getGlobalDate(
              moment().endOf('isoWeek').subtract(1, 'week').toDate(),
            )
            .toJSON();
          return { startDate: startOfLastWeek, endDate: endOfLastWeek };
        }
        let startOfWeek: any = this.typeService
          .getGlobalDate(moment().startOf('isoWeek').toDate())
          .toJSON();

        let endOfWeek: any = this.typeService
          .getGlobalDate(moment().endOf('isoWeek').toDate())
          .toJSON();
        return { startDate: startOfWeek, endDate: endOfWeek };
      }
      if (type === 'M') {
        if (previous) {
          let lastMonthSD = this.typeService
            .getGlobalDate(
              moment().subtract(1, 'months').startOf('month').toDate(),
            )
            .toJSON();

          let lastMonthLD = this.typeService
            .getGlobalDate(
              moment().subtract(1, 'months').endOf('month').toDate(),
            )
            .toJSON();

          return { startDate: lastMonthSD, endDate: lastMonthLD };
        }
        let currentMonthSD = this.typeService
          .getGlobalDate(moment().startOf('month').toDate())
          .toJSON();

        let currentMonthLD = this.typeService
          .getGlobalDate(moment().endOf('month').toDate())
          .toJSON();
        return { startDate: currentMonthSD, endDate: currentMonthLD };
      }
      if (type === 'T') {
        const fromDateCD = moment().toDate().toJSON();
        if (previous) {
          const fromDateLD = new Date(fromDateCD);
          fromDateLD.setDate(fromDateLD.getDate() - 1);

          const toDateLD = new Date(fromDateLD);
          toDateLD.setDate(fromDateLD.getDate());

          return { startDate: fromDateLD, endDate: toDateLD };
        }
        return { startDate: fromDateCD, endDate: fromDateCD };
      }
      if (type === 'Q') {
        if (quarterly || quarterly == '') {
          if (!allowedQuarterly.includes(quarterly))
            return kInvalidParamValue('quarterly');
        }
        if (quarterly === 'AQ') {
          let today: any = new Date();

          let startDate: any = new Date(today);
          let endDate: any = new Date(today);

          const month = today.getMonth() + 1;
          if (month >= 4 && month <= 6) {
            startDate.setMonth(3, 1);
            endDate.setMonth(5, 30);
          } else if (month >= 7 && month <= 9) {
            startDate.setMonth(3, 1);
            endDate.setMonth(8, 30);
          } else if (month >= 10 && month <= 12) {
            startDate.setMonth(3, 1);
            endDate.setMonth(11, 31);
          } else {
            startDate.setMonth(3, 1);
            endDate.setMonth(2, 31);
            startDate.setFullYear(startDate.getFullYear() - 1);
          }

          startDate = this.typeService.getGlobalDate(startDate).toJSON();
          endDate = this.typeService.getGlobalDate(endDate).toJSON();
          return { startDate, endDate };
        }
        let currentQuarter;
        let today: any = new Date();
        let startDate: any = new Date(today);
        let endDate: any = new Date(today);

        const month = today.getMonth() + 1;
        if (month >= 4 && month <= 6) {
          currentQuarter = 'Q1';
        } else if (month >= 7 && month <= 9) {
          currentQuarter = 'Q2';
        } else if (month >= 10 && month <= 12) {
          currentQuarter = 'Q3';
        } else {
          currentQuarter = 'Q4';
        }
        let targetQuarter = quarterly ?? currentQuarter;
        if (currentQuarter === 'Q4' && targetQuarter !== 'Q4') {
          startDate.setFullYear(startDate.getFullYear() - 1);
          endDate.setFullYear(endDate.getFullYear() - 1);
        }

        if (targetQuarter === 'Q1') {
          startDate.setMonth(3, 1);
          endDate.setMonth(5, 30);
        } else if (targetQuarter == 'Q2') {
          startDate.setMonth(6, 1);
          endDate.setMonth(8, 30);
        } else if (targetQuarter == 'Q3') {
          startDate.setMonth(9, 1);
          endDate.setMonth(11, 31);
        } else if (targetQuarter == 'Q4') {
          startDate.setMonth(0, 1);
          endDate.setMonth(2, 31);
        } else {
          return kInternalError;
        }
        startDate = this.typeService.getGlobalDate(startDate).toJSON();
        endDate = this.typeService.getGlobalDate(endDate).toJSON();
        return { startDate, endDate };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getFinalData(type, data, quarterly = null, previous = false) {
    try {
      let currentData: any = [];
      if (previous) totalAmount = 0;
      if (type === 'W') {
        const weekNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        currentData = data.reduce((acc, entry) => {
          const date = new Date(entry.name);
          const weekKey = `${weekNames[date.getDay()]}`;

          if (!acc.some((obj) => obj.name === weekKey)) {
            acc.push({ name: weekKey, amount: 0 });
          }

          const weekObj = acc.find((obj) => obj.name === weekKey);
          weekObj.amount += entry.amount;
          if (previous) totalAmount += entry.amount;
          return acc;
        }, []);
      }
      if (type === 'M') {
        data.forEach((entry) => {
          const date = new Date(entry.name);
          let weekKey;

          if (date.getDate() >= 1 && date.getDate() <= 7) {
            weekKey = '1 to 7';
          } else if (date.getDate() >= 8 && date.getDate() <= 15) {
            weekKey = '8 to 15 ';
          } else if (date.getDate() >= 16 && date.getDate() <= 22) {
            weekKey = '16 to 22';
          } else if (date.getDate() >= 23 && date.getDate() <= 31) {
            weekKey = '23 to 31';
          }
          if (!currentData.some((obj) => obj.name === weekKey)) {
            currentData.push({ name: weekKey, amount: 0 });
          }
          const weekObj = currentData.find((obj) => obj.name === weekKey);
          weekObj.amount += entry.amount;
          if (previous) totalAmount += entry.amount;
        });
      }
      if (type === 'Q') {
        if (quarterly.toUpperCase() == 'AQ') {
          data.forEach((entry) => {
            const date = new Date(entry.name);
            const month = date.getMonth() + 1;
            let weekKey;

            if (month >= 4 && month <= 6) {
              weekKey = 'Q1';
            } else if (month >= 7 && month <= 9) {
              weekKey = 'Q2';
            } else if (month >= 10 && month <= 12) {
              weekKey = 'Q3';
            } else {
              weekKey = 'Q4';
            }

            if (!currentData.some((obj) => obj.name === weekKey)) {
              currentData.push({ name: weekKey, amount: 0 });
            }

            const weekObj = currentData.find((obj) => obj.name === weekKey);
            weekObj.amount += entry.amount;
            if (previous) totalAmount += entry.amount;
          });
          return currentData;
        }
        currentData = data.reduce((acc, entry) => {
          const date = new Date(entry.name);
          const monthKey = `${kMonths[date.getMonth()]
            .slice(0, 3)
            .toUpperCase()}`;

          if (!acc.some((obj) => obj.name === monthKey)) {
            acc.push({ name: monthKey, amount: 0 });
          }
          const monthObj = acc.find((obj) => obj.name === monthKey);
          monthObj.amount += entry.amount;
          if (previous) totalAmount += entry.amount;
          return acc;
        }, []);
      }
      if (type === 'T') {
        //For setting the time interval
        const startTime = new Date('2024-01-20T00:00:00.000Z');
        const endTime = new Date('2024-01-20T23:59:59.999Z');

        const intervalStarts = [];
        for (
          let time = startTime.getTime();
          time <= endTime.getTime();
          time += 4 * 3600 * 1000
        ) {
          const date = new Date(time);
          const hour = date.getUTCHours();
          const ampm = hour < 12 ? 'AM' : 'PM';
          const formattedHour = (hour % 12 === 0 ? 12 : hour % 12) + ' ' + ampm;
          intervalStarts.push(formattedHour);
        }

        currentData = intervalStarts.map((name) => ({
          name,
          amount: 0,
        }));

        data.forEach((item) => {
          const date: any = this.typeService
            .dateTimeFormate(item.completionDate)
            .split(' ')[1]
            .substring(0, 2);

          const intervalIndex = Math.floor(date / 4);

          if (intervalIndex >= 0 && intervalIndex < currentData.length) {
            currentData[intervalIndex].amount += item.amount;
          }
          if (previous) totalAmount += item.amount;
        });
      }
      return currentData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getPtpGoalDataQuery(bodyData, adminId) {
    try {
      const values: any = await this.service.ptpSummary(bodyData);
      if (values.message) return values;

      const groupedData = values.reduce((acc, obj) => {
        const { adminId, paid, Amount } = obj;

        if (!acc[adminId]) {
          acc[adminId] = {
            adminId,
            totalPtps: 0,
            paidPTPs: 0,
            unPaidPTPs: 0,
            totalAmount: 0,
          };
        }

        acc[adminId].totalPtps++;
        acc[adminId].totalAmount += Amount;

        if (paid) {
          acc[adminId].paidPTPs++;
        } else {
          acc[adminId].unPaidPTPs++;
        }

        return acc;
      }, {});

      const groupedArray: any = Object.values(groupedData);
      let searchData: any = {};

      if (adminId != -1) {
        searchData = groupedArray.find((item) => item.adminId == adminId);
        if (!searchData)
          return { totalPtps: 0, paidPTPs: 0, unPaidPTPs: 0, totalAmount: 0 };
      } else {
        searchData = groupedArray.reduce(
          (sum, current) => {
            sum.totalPtps += current?.totalPtps ?? 0;
            sum.paidPTPs += current?.paidPTPs ?? 0;
            sum.unPaidPTPs += current?.unPaidPTPs ?? 0;
            sum.totalAmount += current?.totalAmount ?? 0;
            return sum;
          },
          { totalPtps: 0, paidPTPs: 0, unPaidPTPs: 0, totalAmount: 0 },
        );
      }
      delete searchData.adminId;
      return searchData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCallCountDashboard(query) {
    try {
      const adminId = query?.adminId ?? '-1';
      let performance = (query?.performance ?? 'T').toUpperCase();

      const currentDates: any = await this.startEndDate(
        performance,
        false,
        query.quarterly,
      );

      let dateRange: any = this.typeService.getUTCDateRange(
        currentDates.startDate.toString(),
        currentDates.endDate.toString(),
      );

      const attributes: any = [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('status')), 'count'],
      ];

      let countOptions: any = {
        where: {
          categoryId: { [Op.eq]: exotelCategoryId },
          status: { [Op.in]: ['COMPLETED', 'NOT_ANSWERED'] },
        },
        group: 'status',
      };

      let totalCountOption: any = {
        where: {
          categoryId: { [Op.eq]: exotelCategoryId },
          status: { [Op.in]: ['COMPLETED', 'NOT_ANSWERED'] },
        },
      };

      if (adminId && adminId !== '-1') {
        countOptions.where.adminId = adminId;
      }

      if (dateRange.fromDate && dateRange.endDate) {
        countOptions.where.createdAt = {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        };

        totalCountOption.where.createdAt = {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        };
      }

      if (adminId && adminId !== '-1') {
        countOptions.where.adminId = adminId;
        totalCountOption.where.adminId = adminId;
      }

      const data = await this.exotelCallHistoryService.getTableWhereData(
        attributes,
        countOptions,
      );

      const totalCount = await ExotelCallHistory.count(totalCountOption);

      let statusData: any = [
        {
          status: 'ANSWERED',
          count: '0',
        },
        {
          status: 'NOT ANSWERED',
          count: '0',
        },
      ];

      if (data.length) {
        statusData = statusData.map((row) => {
          const findLabel =
            row.status === 'ANSWERED' ? 'COMPLETED' : 'NOT_ANSWERED';
          const matchData = data.find((item) => item.status === findLabel);

          if (matchData) {
            return {
              ...matchData,
              status:
                matchData.status === 'COMPLETED' ? 'ANSWERED' : 'NOT ANSWERED',
              count: matchData?.count || 0,
            };
          } else return row;
        });
      }

      return { statusData, totalCount };
    } catch (err) {
      console.log('err: ', err);
    }
  }
}
