// Imports
import { Inject, Injectable } from '@nestjs/common';
import { MASTER_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { MasterEntity } from 'src/entities/master.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class MasterRepository {
  constructor(
    @Inject(MASTER_REPOSITORY)
    private readonly repository: typeof MasterEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: number, silent = false) {
    if (updatedData?.dates)
      updatedData.dates = this.updateDate(updatedData.dates);
    const updateData = await this.repoManager.updateRowData(
      this.repository,
      updatedData,
      id,
      silent,
    );
    return updateData;
  }

  async updateOnlyRowData(updatedData: any, id: number) {
    const updateData = await this.repoManager.updateRowData(
      this.repository,
      updatedData,
      id,
    );
    return updateData;
  }

  async updateRowWhereData(updatedData: any, options: {}) {
    if (updatedData?.dates)
      updatedData.dates = this.updateDate(updatedData.dates);
    const updateData = await this.repoManager.updateRowWhereData(
      this.repository,
      updatedData,
      options,
    );
    return updateData;
  }

  async createRowData(data: any) {
    const createData = await this.repoManager.createRowData(
      this.repository,
      data,
    );
    return createData;
  }

  async createRowDataWithCopy(data: any, id: number) {
    try {
      if (data?.dates) data.dates = this.updateDate(data.dates);
      return await this.repoManager.createRowDataWithCopy(
        this.repository,
        data,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }
  private updateDate(dates) {
    try {
      if (dates) {
        for (let key in dates) {
          if (dates[key]) dates[key] = new Date(dates[key]).getTime();
        }
      }
      return dates;
    } catch (error) {
      return dates;
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

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async upsert(data, options = {}) {
    return this.repoManager.upsert(this.repository, data, options);
  }
}
