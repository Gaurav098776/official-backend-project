import { Inject, Injectable } from '@nestjs/common';
import { REPORT_HISTORY_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { ReportHistoryEntity } from 'src/entities/reportHistory.entity';
import { kInternalError } from 'src/constants/responses';

export class ReportHistoryRepository {
  constructor(
    @Inject(REPORT_HISTORY_REPOSITORY)
    private readonly repository: typeof ReportHistoryEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getTableCountWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return kInternalError;
    }
  }
  async create(postData) {
    try {
      return await this.repoManager.createRowData(this.repository, postData);
    } catch (error) {
      return kInternalError;
    }
  }

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return kInternalError;
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
      return kInternalError;
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
      return kInternalError;
    }
  }
}
