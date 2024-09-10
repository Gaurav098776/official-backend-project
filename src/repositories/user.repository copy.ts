import { Inject, Injectable } from '@nestjs/common';
import { USERHISTORY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { userHistory } from 'src/entities/user.history.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class DocHistoryRepository {
  constructor(
    @Inject(USERHISTORY_REPOSITORY)
    private readonly repository: typeof userHistory,
    private readonly repoManager: RepositoryManager,
  ) {}

  //#region find or create api
  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  //#endregion

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

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
