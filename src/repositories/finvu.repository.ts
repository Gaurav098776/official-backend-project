import { Inject, Injectable } from '@nestjs/common';
import { FINVU_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { FinvuEntity } from 'src/entities/finvu.entity';

@Injectable()
export class FinvuRepository {
  constructor(
    @Inject(FINVU_REPOSITORY)
    private readonly repository: typeof FinvuEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async updateWhere(updateData: any, id: any, where: any) {
    if (!id) return k500Error;
    where.id = id;

    return await this.repoManager.updateRowWhereData(
      this.repository,
      updateData,
      { where },
    );
  }

  async updateWhereData(updateData: any, where: any) {
    return await this.repoManager.updateRowWhereData(
      this.repository,
      updateData,
      { where },
    );
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

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
}
