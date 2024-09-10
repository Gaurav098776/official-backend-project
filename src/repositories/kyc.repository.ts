import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { KYCEntity } from 'src/entities/kyc.entity';
import { KYC_REPOSITORY } from 'src/constants/entities';

@Injectable()
export class KYCRepository {
  constructor(
    @Inject(KYC_REPOSITORY)
    private readonly repository: typeof KYCEntity,
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

  async getRowWhereData(attributes: string[], options: any) {
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

  async updateRowData(updatedData: any, id: number, silent?) {
    return await this.repoManager.updateRowData(
      this.repository,
      updatedData,
      id,
      silent,
    );
  }
  async updateRowWhereData(updatedData: any, options: {}) {
    return await this.repoManager.updateRowWhereData(
      this.repository,
      updatedData,
      options,
    );
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return await this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async deleteWhereData(options: any) {
    try {
      return await this.repoManager.deleteWhereData(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
}
