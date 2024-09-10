import { Inject, Injectable } from '@nestjs/common';
import { BANKING_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { BankingEntity } from 'src/entities/banking.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class BankingRepository {
  constructor(
    @Inject(BANKING_REPOSITORY)
    private readonly repository: typeof BankingEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async createRowDataWithCopy(data: any, id: number) {
    try {
      return await this.repoManager.createRowDataWithCopy(
        this.repository,
        data,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async update(updateData: any, id: any) {
    return await this.repoManager.updateRowData(
      this.repository,
      updateData,
      id,
    );
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

  async findAll(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  //#region create the banking data
  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  //#endregion

  //#region find one
  async findOne(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

  //#region find and count all
  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
  async getTableWhereData(attributes: string[], options: {}) {
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
  async copyWith(updatedData: any, id: number) {
    return await this.repoManager.createRowDataWithCopy(
      this.repository,
      updatedData,
      id,
    );
  }
}
