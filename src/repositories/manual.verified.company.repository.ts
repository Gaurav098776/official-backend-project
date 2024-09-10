import { Inject, Injectable } from '@nestjs/common';
import { MANUAL_VERIFIED_COMPANY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { MailTrackerEntity } from 'src/entities/mail.tracker.entity';
import { ManualVerifiedCompanyEntity } from 'src/entities/manual.verified.company.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ManualVerifiedCompanyRepo {
  constructor(
    @Inject(MANUAL_VERIFIED_COMPANY_REPOSITORY)
    private readonly repository: typeof ManualVerifiedCompanyEntity,
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
  async getTableWhereDataWithCounts(attributes: string[], options: any) {
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
  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  async updateRowDataWithOptions(updateData, options: any, id) {
    try {
      return await this.repoManager.updateRowDataWithOptions(
        this.repository,
        updateData,
        options,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowData(updateData, id: any) {
    try {
      return await this.repoManager.updateRowData(
        this.repository,
        updateData,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowWhereData(updateData, options: any) {
    try {
      return await this.repoManager.updateRowWhereData(
        this.repository,
        updateData,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }
  async getCountsWhere(options) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }
}
