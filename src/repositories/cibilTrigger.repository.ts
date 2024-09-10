import { Inject, Injectable } from '@nestjs/common';
import { CIBIL_TRIGGER_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { cibilTriggerEntity } from 'src/entities/cibilTrigger.entity';

@Injectable()
export class CIBILTriggerRepository {
  constructor(
    @Inject(CIBIL_TRIGGER_REPOSITORY)
    private readonly repository: typeof cibilTriggerEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  //#region find on
  async getRowWhereData(attributes, options) {
    try {
      return await this.repoManager.getRowWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {}
  }

  async getTableWhereData(attributes, options) {
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
  
  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  // create
  async createRowData(data: any) {
    try {
      return this.repository.create(data);
    } catch (error) {
      return k500Error;
    }
  }

  async bulkCreate(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  //#endregion
  async updateRowData(data: any, id) {
    try {
      if (!id) return k500Error;
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowWhereData(data: any, options: any) {
    try {
      return this.repository.update(data, options);
    } catch (error) {
      return k500Error;
    }
  }
}
