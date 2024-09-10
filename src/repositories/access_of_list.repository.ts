import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_OF_LIST_REPOSITORY } from 'src/constants/entities';
import { AccessOfListEntity } from 'src/entities/access_of_list.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AccessOfListRepository {
  constructor(
    @Inject(ACCESS_OF_LIST_REPOSITORY)
    private readonly repository: typeof AccessOfListEntity,
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
}
