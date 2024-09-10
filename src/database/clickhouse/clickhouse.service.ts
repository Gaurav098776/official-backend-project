// Imports
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { createClient } from '@clickhouse/client';
import { EnvConfig } from 'src/configs/env.config';
import { APILoggerEntity } from './clickhouse.entity';

@Injectable()
export class ClickHouseService {
  clickhouseClient: any;
  constructor() {
    // this.clickhouseClient = createClient({
    //   url: EnvConfig.database.clickHouse.url,
    //   username: EnvConfig.database.clickHouse.username,
    //   password: EnvConfig.database.clickHouse.password,
    //   database: 'default',
    //   request_timeout: 30000,
    //   max_open_connections: Infinity,
    //   clickhouse_settings: { allow_experimental_object_type: 1 },
    // });
    // this.createTables();
  }

  //#region create table
  async createTables() {
    await this.clickhouseClient.command({ query: APILoggerEntity });
  }
  //#endregion

  //#region CREATE
  async create(tableName, data) {
    return await this.injectChQuery('CREATE', tableName, data);
  }
  //#endregion

  //#region
  private async injectChQuery(
    type: 'CREATE' | 'UPDATE' | 'FINDONE' | 'FINDALL',
    tableName: string,
    data,
  ) {
    try {
      if (type == 'CREATE') {
        const id = randomUUID();
        data.id = id;
        data.timeId = new Date().getTime();
        await this.clickhouseClient.insert({
          table: tableName,
          values: data,
          format: 'JSONEachRow',
        });
        return id;
      }
    } catch (error) {
      console.log({ error });
    }
  }
  //#endregion
}
