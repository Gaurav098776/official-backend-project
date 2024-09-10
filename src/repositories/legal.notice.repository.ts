import { Inject, Injectable } from '@nestjs/common';
import { LEGAL_NOTICE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { LegalNoticeEntity } from 'src/entities/notice.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class LegalNoticeRepository {
  constructor(
    @Inject(LEGAL_NOTICE_REPOSITORY)
    private readonly repository: typeof LegalNoticeEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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
  async update(updatedData: any, where: any) {
    return await this.repoManager.updateData(
      this.repository,
      updatedData,
      where,
    );
  }
}
