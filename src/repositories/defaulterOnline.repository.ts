import { Inject, Injectable } from '@nestjs/common';
import { DEFAULTER_ONLINE_ENTITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { DefaulterOnlineEntity } from 'src/entities/defaulterOnline.entity';

@Injectable()
export class DefaulterOnlineRepository {
  constructor(
    @Inject(DEFAULTER_ONLINE_ENTITY_REPOSITORY)
    private readonly repository: typeof DefaulterOnlineEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
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

  async updateRowWhereData(updatedData: any, options: {}) {
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

  //#region create new Data
  async create(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion
}
