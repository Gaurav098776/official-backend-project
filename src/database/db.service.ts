// Imports
import * as fs from 'fs';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { CsQueryService } from './cassandra/cs.query';
import { CryptService } from 'src/utils/crypt.service';
import { RedisService } from 'src/redis/redis.service';
import { CacheEntity } from 'src/entities/cache_entity';
import { DbQueryInterface } from './db.query.interface';
import { registeredUsers } from 'src/entities/user.entity';
import { PgQueryService } from './postgres/pg.query.service';
import { ICacheDetails, IUpdateCacheDetails } from './db.interfaces';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { kDatabasePerformanceTemplatePath } from 'src/constants/directories';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { isArray } from 'class-validator';
import {
  kCC,
  kNoDataFound,
  kSupportMail,
  kTechSupportMail,
  nbfcInfoStr,
} from 'src/constants/strings';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class DataBaseService {
  constructor(
    private readonly crypt: CryptService,
    private readonly redis: RedisService,
    private readonly repoManager: RepositoryManager,
    private readonly csQueryService: CsQueryService,
    private readonly pgService: PgQueryService,
    private readonly sharedNotificationService: SharedNotificationService,
  ) {}

  async findOne(options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'CS') {
      options.limit = 1;
      return await this.csQueryService.injectQuery(
        options,
        'READ',
        null,
        'ONE',
      );
    } else if (options.type == 'PG')
      return await this.pgService.injectQuery(options, 'READ');
    else throw Error('Invalid value -> type');
  }

  async findAll(options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'CS') {
      return await this.csQueryService.injectQuery(
        options,
        'READ',
        null,
        'ALL',
      );
    } else if (options.type == 'PG')
      return await this.pgService.injectQuery(options, 'READ', null, 'ALL');
    else throw Error('Invalid value -> type');
  }

  async count(options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'CS')
      return await this.csQueryService.injectQuery(
        options,
        'READ',
        null,
        'COUNT',
      );
    else if (options.type == 'PG') return await options.entity.count(options);
    else throw Error('Invalid value -> type');
  }

  async create(data: any, options: DbQueryInterface) {
    try {
      if (!options.type) options.type = 'PG';

      if (options.type == 'CS') {
        options.limit = 1;
        return await this.csQueryService.injectQuery(options, 'CREATE', data);
      } else if (options.type == 'PG') {
        const createdtData = await options.entity.create(data);
        return createdtData['dataValues'];
      }
    } catch (error) {}
  }

  async update(data: any, options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'CS')
      return await this.csQueryService.injectQuery(options, 'UPDATE', data);
    else if (options.type == 'PG')
      return await options.entity.update(data, options);
    else throw Error('Invalid value -> type');
  }

  async delete(options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'PG') return await options.entity.destroy(options);
  }

  async injectQuery(options: DbQueryInterface) {
    if (!options.type) options.type = 'PG';

    if (options.type == 'CS')
      return await this.csQueryService.injectRawQuery(options);
    else if (options.type == 'PG')
      return await this.pgService.injectRawQuery(options);
    else throw Error('Invalid value -> type');
  }

  async getDatabaseQueryPerformance(reqData: any) {
    try {
      const rawQuery = `SELECT pid, user, pg_stat_activity.query_start, EXTRACT(SECOND FROM now() - pg_stat_activity.query_start) AS query_time_seconds, query, state, wait_event_type, wait_event FROM pg_stat_activity WHERE EXTRACT(SECOND FROM now() - pg_stat_activity.query_start) > ${
        reqData?.time ?? 10
      } AND pg_stat_activity.query <> '<IDLE>' AND state = 'active';`;
      const rows = await this.pgService.injectRawQuery({
        entity: registeredUsers,
        rawQuery,
      });
      const queries = rows[0];
      queries.forEach(async (query) => {
        try {
          await this.sendMailDatabasePerformance(query);
        } catch (error) {}
      });
    } catch (error) {
      return kInternalError;
    }
  }

  private async sendMailDatabasePerformance(query: any) {
    try {
      let htmlData = fs.readFileSync(kDatabasePerformanceTemplatePath, 'utf-8');
      if (!htmlData) return k422ErrorMessage('Mail format not readable');
      let tableHtml = `
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px;">No.</th>
          <th style="border: 1px solid black; padding: 8px;">Query</th>
          <th style="border: 1px solid black; padding: 8px;">Execution Time(MilliSeconds)</th>
          <th style="border: 1px solid black; padding: 8px;">Date and Time</th>
        </tr>
      </thead>
      <tbody>
      <tr>
        <td style="border: 1px solid black; padding: 8px;">${1}.</td>
        <td style="border: 1px solid black; padding: 8px;">${query?.query}</td>
        <td style="border: 1px solid black; padding: 8px;">${
          query?.query_time_seconds
        }</td>
        <td style="border: 1px solid black; padding: 8px;">${
          query?.query_start
        }</td>
    </tr>
      </tbody>
    </table>
  `;
      htmlData = htmlData.replace('##TABLE##', tableHtml);
      htmlData = htmlData.replace('##NBFCINFO##', nbfcInfoStr);
      htmlData = htmlData.replace(
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      // SEND MAIL
      const subject = 'CRITICAL: DATABASE PERFORMANCE';
      await this.sharedNotificationService.sendMailFromSendinBlue(
        kTechSupportMail,
        subject,
        htmlData,
        null,
        kCC,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  // SENSITIVE DEV API
  async cacheDetails(reqData: ICacheDetails) {
    // Params validation
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    const allTypes = ['ELIGIBILITY'];
    if (!allTypes.includes(type)) return kInvalidParamValue('type');

    return await this.getCacheData(type);
  }

  // Get value from redis, if not found then take value from postgresql and update in redis too
  async getCacheData(key: string): Promise<any> {
    const data = await this.redis.getKeyDetails(key);
    if (!data) throw new Error(kNoDataFound);
    if (typeof data == 'string' && data.includes('U2F')) {
      const rawData = await this.crypt.decryptSyncText(data);
      if (typeof rawData == 'string' && rawData.includes('{')) {
        return JSON.parse(rawData);
      } else return rawData;
    } else return data;
  }

  // SENSITIVE DEV API
  async updateCacheDetails(reqData: IUpdateCacheDetails) {
    // Params validation
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    const allTypes = ['ELIGIBILITY'];
    if (!allTypes.includes(type)) return kInvalidParamValue('type');
    const targetData = reqData.targetData;
    if (!targetData) return kParamMissing('targetData');

    await this.updateCacheData(type, targetData);
    return { successMsg: 'Cache data updated sucessfully !' };
  }

  // Update value in postgresql and in redis
  async updateCacheData(key: string, value: any): Promise<Boolean> {
    let targetValue: any = {};
    if (isArray(value)) targetValue = [...value];
    else targetValue = { ...value };
    if (typeof targetValue == 'object') {
      targetValue = JSON.stringify(targetValue);
      targetValue = await this.crypt.encryptText(targetValue);
    }

    // Query preparation
    const cacheAttr = ['id'];
    const cacheOptions = { where: { name: key } };
    // Query
    const cacheData = await this.repoManager.getRowWhereData(
      CacheEntity,
      cacheAttr,
      cacheOptions,
    );
    if (cacheData === k500Error)
      throw new Error('Error while fn -> updateCacheData');

    // Insert in postgresql if not exists
    if (!cacheData) {
      const creationData = { name: key, value: targetValue };
      const createdData = await this.repoManager.createRowData(
        CacheEntity,
        creationData,
      );
      if (createdData === k500Error)
        throw new Error('Error while fn -> updateCacheData -> creation');
    }
    // Update in postgresql if exists
    else {
      if (!cacheData.id)
        throw new Error('Error while fn -> updateCacheData -> pre updation');

      const updatedData = { value: targetValue };
      const updatedResponse = await this.repoManager.updateRowData(
        CacheEntity,
        updatedData,
        cacheData.id,
      );
      if (updatedResponse === k500Error)
        throw new Error('Error while fn -> updateCacheData -> updation');
    }

    // Update in redis
    await this.redis.updateKeyDetails(key, targetValue);
    return true;
  }
}
