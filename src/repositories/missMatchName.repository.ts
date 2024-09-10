import { Inject, Injectable } from '@nestjs/common';
import { MISSMATCH_LOGS_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { missMatchLogs } from 'src/entities/missMatchLogs.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class MissMacthRepository {
  constructor(
    @Inject(MISSMATCH_LOGS_REPOSITORY)
    private readonly repository: typeof missMatchLogs,
    private readonly repoManager: RepositoryManager,
  ) {}

  async create(options: any) {
    return await this.repoManager.createRowData(this.repository, options);
  }

  async getTableWhereData(attributes: string[], options: {}) {
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

  //#region  update where Data
  async updateData(updateData: any, where: any) {
    return await this.repoManager.updateData(
      this.repository,
      updateData,
      where,
    );
  }
  //#endregion

  //#region get find one Data
  async getRowWhereData(attributes, options) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

  //#region  update where Data
  async updateRowData(updateData: any, id: number) {
    return await this.repoManager.updateRowData(
      this.repository,
      updateData,
      id,
    );
  }
  //#endregion
}
