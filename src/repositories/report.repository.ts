import { Inject, Injectable } from '@nestjs/common';
import { REPORT_LIST_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ReportListEntity } from 'src/entities/report.list.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ReportRepository {
  constructor(
    @Inject(REPORT_LIST_REPOSITORY)
    private readonly repository: typeof ReportListEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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
  async getTableCountWhereData(attributes: string[], options: any) {
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }
}
