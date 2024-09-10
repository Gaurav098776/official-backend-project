import { Inject, Injectable } from '@nestjs/common';
import { EMIENTITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { EmiEntity } from 'src/entities/emi.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class EMIRepository {
  constructor(
    @Inject(EMIENTITY_REPOSITORY)
    private readonly repository: typeof EmiEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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
    try {
      return await this.repoManager.getTableCountWhereData(
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

  async updateRowData(updatedData: any, id: number, silent = false) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async getAllRawDataWithCount(attributes: string[], options: any) {
    try {
      const listData = await this.repository.findAndCountAll({
        attributes,
        ...options,
      });
      listData.rows = listData.rows.map((el) => el.get({ plain: true }));
      return listData;
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async updateRowDataWithOptions(updatedData: any, options, id: number) {
    return this.repoManager.updateRowDataWithOptions(
      this.repository,
      updatedData,
      options,
      id,
    );
  }

  async injectRawQuery(query) {
    return await this.repoManager.injectRawQuery(this.repository, query);
  }
}
