import { Inject, Injectable } from '@nestjs/common';
import { CHAT_DOCUMENTENTITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ChatDocumentEntity } from 'src/entities/media.entity';
import { RepositoryManager } from './repository.manager';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class MediaRepository {
  constructor(
    @Inject(CHAT_DOCUMENTENTITY_REPOSITORY)
    private readonly repository: typeof ChatDocumentEntity,
    private readonly repoManager: RepositoryManager,
    private readonly redisService: RedisService,
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowWhereData(updatedData: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        updatedData,
        options,
      );
    } catch (error) {
      return k500Error;
    }
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
    const userId = data?.userId;
    const key = `${userId}_USER_PROFILE`;
    await this.redisService.del(key);
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
