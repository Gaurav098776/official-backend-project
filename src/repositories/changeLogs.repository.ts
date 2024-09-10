import { Inject, Injectable } from '@nestjs/common';
import { CHANGE_LOGS_REPOSITORY } from 'src/constants/entities';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ChangeLogsRepository {
  constructor(
    @Inject(CHANGE_LOGS_REPOSITORY)
    private readonly repository: typeof ChangeLogsEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async findOne(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  //#region  find all
  async getTableWhereData(attributes, options) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion
}
