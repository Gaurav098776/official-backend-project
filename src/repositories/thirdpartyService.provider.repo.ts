// Imports
import { Inject, Injectable } from '@nestjs/common';
import { THIRDPARTY_PROVIDER_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ThirdPartyProvider } from 'src/entities/thirdpartyProviders.entities';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ThirdPartyProviderRepo {
  constructor(
    @Inject(THIRDPARTY_PROVIDER_REPOSITORY)
    private readonly repository: typeof ThirdPartyProvider,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
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

  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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

  async updateWhereData(data: any, options: any) {
    try {
      return await this.repository.update(data, options);
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
  async bulkCreate(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
}
