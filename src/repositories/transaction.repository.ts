import { Inject, Injectable } from '@nestjs/common';
import { TRANSACTION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class TransactionRepository {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly repository: typeof TransactionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getRowWhereData(attributes: any[], options: any) {
    try {
      return await this.repoManager.getRowWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
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
  async updateRowWhereData(updatedData: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        updatedData,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async deleteSingleData(id, restricted = true) {
    return await this.repoManager.deleteSingleData(
      this.repository,
      id,
      restricted,
    );
  }
  async getCountsWhere(options: any) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

}
