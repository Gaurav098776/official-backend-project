import { Inject, Injectable } from '@nestjs/common';
import { LOANTRANSACTION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { loanTransaction } from 'src/entities/loan.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class LoanRepository {
  constructor(
    @Inject(LOANTRANSACTION_REPOSITORY)
    private readonly repository: typeof loanTransaction,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async getTableWhereData(attributes: any[], options: any) {
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
  async updateRowWhereData(updatedData: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        updatedData,
        options,
      );
    } catch (error) {
      console.log(error);
      return k500Error;
    }
  }

  async updateRowData(updatedData: any, id: any, silent = false) {
    try {
      return this.repoManager.updateRowData(
        this.repository,
        updatedData,
        id,
        silent,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async updateSilentData(updatedData: any, where: any, silent = true) {
    try {
      return this.repoManager.updateSilentData(
        this.repository,
        updatedData,
        where,
        silent,
      );
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

  async getTableWhereDataWithCounts(attributes: any[], options: any) {
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

  async injectRawQuery(query, options?: any) {
    return await this.repoManager.injectRawQuery(
      this.repository,
      query,
      options,
    );
  }

  async getCountWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }
}
