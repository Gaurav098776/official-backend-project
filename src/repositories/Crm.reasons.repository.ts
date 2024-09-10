import { Inject, Injectable } from '@nestjs/common';
import { CRM_REASON_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { CrmReasonEntity } from 'src/entities/crm.reasons.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class CrmReasonRepository {
  constructor(
    @Inject(CRM_REASON_REPOSITORY)
    private readonly repository: typeof CrmReasonEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  async createBulkData(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getTableWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }
}
