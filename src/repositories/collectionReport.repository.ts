import { Inject, Injectable } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { COLLECTION_REPORT } from '../constants/entities';
import { CollectionReport } from 'src/entities/collectionReport.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class CollectionReportRepository {
  constructor(
    @Inject(COLLECTION_REPORT)
    private readonly repository: typeof CollectionReport,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async bulkCreate(data) {
    return this.repoManager.bulkCreate(this.repository, data);
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }
}
