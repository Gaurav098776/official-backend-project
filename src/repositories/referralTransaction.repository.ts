import { Inject, Injectable } from '@nestjs/common';
import { REFERRAL_TRANSACTION_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { ReferralTransactionEntity } from 'src/entities/referralTransaction.entity';

@Injectable()
export class ReferralTransactionRepository {
  constructor(
    @Inject(REFERRAL_TRANSACTION_REPOSITORY)
    private readonly repository: typeof ReferralTransactionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getRowWhereData(attributes: string[], options: any) {
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
  async updateRowData(updatedData: any, id: any) {
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

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async injectRawQuery(query) {
    return await this.repoManager.injectRawQuery(this.repository, query);
  }

  async getCountWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }
}
