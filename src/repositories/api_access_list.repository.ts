import { Inject, Injectable } from '@nestjs/common';
import { API_ACCESS_LIST_REPOSITORY } from 'src/constants/entities';
import { APIAccessListEntity } from 'src/entities/api.list.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class APIAccessListRepository {
  constructor(
    @Inject(API_ACCESS_LIST_REPOSITORY)
    private readonly repository: typeof APIAccessListEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
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
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async bulkCreate(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
}
