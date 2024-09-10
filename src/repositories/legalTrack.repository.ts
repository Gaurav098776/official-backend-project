import { Inject, Injectable } from '@nestjs/common';
import { LEGAL_NOTICE_TRACKER_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { LegalNoticeTrackEntity } from 'src/entities/noticeLog.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class LegalTrackRepository {
  constructor(
    @Inject(LEGAL_NOTICE_TRACKER_REPOSITORY)
    private readonly repository: typeof LegalNoticeTrackEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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
  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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

  async create(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
  async updateRowData(updatedData: any, id: number) {
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }
}
