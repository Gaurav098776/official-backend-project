import { Inject, Injectable } from '@nestjs/common';
import { BLOCK_USER_HISTORY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { BlockUserHistoryEntity } from 'src/entities/block.user.history.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class BlockUserHistoryRepository {
  constructor(
    @Inject(BLOCK_USER_HISTORY_REPOSITORY)
    private readonly repository: typeof BlockUserHistoryEntity,
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

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async createRowData(options) {
    return await this.repoManager.createRowData(this.repository, options);
  }

  async bulkCreate(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
}
