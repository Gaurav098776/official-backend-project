// Imports
import { k500Error } from 'src/constants/misc';
import { Inject, Injectable } from '@nestjs/common';
import { AA_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { AAEntity } from 'src/entities/aggregator.entity';

@Injectable()
export class AARepository {
  constructor(
    @Inject(AA_REPOSITORY)
    private readonly repository: typeof AAEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return this.repoManager.createRowData(this.repository, data);
  }

  async getRowWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getRowWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
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

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }
}
