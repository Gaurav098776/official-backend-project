import { Inject, Injectable } from '@nestjs/common';
import { REQUEST_SUPPORT_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { RequestSupportEntity } from 'src/entities/request_support.entity';
import { kInternalError } from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
export class RequestSupportRepository {
  constructor(
    @Inject(REQUEST_SUPPORT_REPOSITORY)
    private readonly repository: typeof RequestSupportEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async create(postData: any) {
    try {
      return await this.repoManager.createRowData(this.repository, postData);
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
}
