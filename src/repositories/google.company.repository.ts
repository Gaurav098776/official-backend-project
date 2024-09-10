import { k500Error } from 'src/constants/misc';
import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { COMPANY_REPOSITORY } from 'src/constants/entities';
import { GoogleCompanyResultEntity } from 'src/entities/company.entity';

@Injectable()
export class CompanyRepository {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: typeof GoogleCompanyResultEntity,
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
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  //#region this function give count of company
  async getCountsWhere(options: any) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
  //#endregion
}
