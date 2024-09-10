// Imports
import { Module } from '@nestjs/common';
import { DatabaseProvider } from './db.provider';
import { DataBaseService } from './db.service';
import { CsQueryService } from './cassandra/cs.query';
import { PgQueryService } from './postgres/pg.query.service';
import { CsConnectService } from './cassandra/cs.connect.service';
import { DBController } from './db.controller';
import { ClickHouseService } from './clickhouse/clickhouse.service';
import { RepositoryManager } from 'src/repositories/repository.manager';

const repositories = [RepositoryManager];

@Module({
  controllers: [DBController],
  providers: [
    ...DatabaseProvider,
    DataBaseService,
    CsQueryService,
    PgQueryService,
    CsConnectService,
    ClickHouseService,
    ...repositories
  ],
  exports: [ClickHouseService],
})
export class DatabaseModule {}
