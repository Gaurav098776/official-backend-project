// Imports
import { Inject, Injectable } from '@nestjs/common';
import { CONTACT_LOG_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { ContactLogEntity } from 'src/entities/contact.log.entity';

@Injectable()
export class ContactLogRepository {
  constructor(
    @Inject(CONTACT_LOG_REPOSITORY)
    private readonly repository: typeof ContactLogEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: string) {
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async countOfRowData(options: any) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return await this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async bulkCreate(data, options={}) {
    return await this.repoManager.bulkCreate(this.repository, data, options);
  }
}
