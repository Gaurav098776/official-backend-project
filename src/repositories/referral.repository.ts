import { Inject, Injectable } from '@nestjs/common';
import { REFERRAL_REPOSITORY } from 'src/constants/entities';
import { ReferralEntity } from 'src/entities/referral.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class ReferralRepository {
  constructor(
    @Inject(REFERRAL_REPOSITORY)
    private readonly repository: typeof ReferralEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
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

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
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
