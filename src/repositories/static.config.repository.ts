import { Inject, Injectable } from '@nestjs/common';
import { STATIC_CONFIG_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { StaticConfigEntity } from 'src/entities/static.config.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class StaticConfigRepository {
  constructor(
    @Inject(STATIC_CONFIG_REPOSITORY)
    private readonly repository: typeof StaticConfigEntity,
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowWhereData(updatedData: any, options) {
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

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async createRowWhereData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
}
