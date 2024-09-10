// Imports
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { CronTrakingRepository } from 'src/repositories/cron.traking.repository';
import { TypeService } from 'src/utils/type.service';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
} from 'src/constants/responses';
import { cronTime } from 'src/constants/objects';
import { APIService } from 'src/utils/api.service';
import { EnvConfig } from 'src/configs/env.config';
@Injectable()
export class CronService {
  constructor(
    private readonly repository: CronTrakingRepository,
    private readonly typeServices: TypeService,
    private readonly api: APIService,
  ) {}

  async checkCronHistory(query) {
    try {
      let toDay = query?.toDate ?? new Date();
      const range = this.typeServices.getUTCDateRange(toDay, toDay);
      const attributes = ['type', 'createdAt'];
      let where: any = {};
      where.createdAt = {
        [Op.gte]: range.fromDate,
        [Op.lte]: range.endDate,
      };

      const data = await this.repository.getTableWhereData(attributes, {
        where,
      });
      if (data == k500Error) return kInternalError;
      const cronData = await this.checkCronStatus(data, range.fromDate);
      const prepareData = await this.cronPrepareData(cronData, data);
      return prepareData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // Check Status Of Cron
  async checkCronStatus(data, fromDate) {
    let tempData: any = [];
    for (let i = 0; i < cronTime.length; i++) {
      try {
        const d1 = cronTime[i];
        const timeData = data.find((d) => d1.cron_name == d.type);
        if (timeData) d1.status = 'execute';
        else {
          let currentTime = new Date(); // current time
          const date = new Date();
          date.setHours(d1.hours, d1.min); // cron timme
          const start_date = new Date();
          start_date.setHours(0, 0, 0, 0);

          if (new Date(fromDate).getTime() < start_date.getTime())
            d1.status = 'expired';
          else if (
            new Date(fromDate).getTime() > currentTime.getTime() ||
            currentTime.getTime() < date.getTime()
          )
            d1.status = 'yet to execute';
          else d1.status = 'not execute';
        }
        tempData.push(d1);
      } catch (error) {}
    }
    return tempData;
  }

  //Cron Data Prepare
  async cronPrepareData(cronData, data) {
    const finalData: any = [];
    for (let i = 0; i < cronData.length; i++) {
      try {
        const element = cronData[i];
        const cronName = element?.name;
        const timeData = data.find((d) => d.type == element?.cron_name);
        const createdAt = timeData?.createdAt;
        const temp: any = {};
        for (let j = 0; j < cronName.length; j++) {
          const ele = cronName[j];
          temp['Cron time'] = `Every Day ${element?.cron_name}` ?? '-';
          temp['Cron name'] = ele ?? '-';
          temp['Last cron date & time'] = createdAt
            ? createdAt.toLocaleString({ timeZone: 'Asia/Kolkata' })
            : '-';
          temp['Cron status'] = element?.status ?? '-';
          temp['Cron Type'] = element?.cron_name;
        }
        finalData.push(temp);
      } catch (error) {}
    }
    return finalData;
  }

  // Cron Api Hit
  async hitCronApi(body, adminId) {
    try {
      const type = body?.type;
      const reqData = { type, adminId };

      const cron = cronTime.find((d) => d.cron_name == type);
      if (!cron) return kBadRequest;

      const date = new Date();
      date.setHours(cron.hours, cron.min + 5);
      const toDate = new Date();
      if (toDate.getTime() >= date.getTime()) {
        const headers = { 'dev-ops-key': EnvConfig.secrets.devOpsKey };
        const res = await this.api.requestPost(
          cron.triggeredAPIs,
          reqData,
          headers,
        );
        if (res === k500Error) return kInternalError;
        return res;
      } else
        return k422ErrorMessage('You can not execute future cron at this time');
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
