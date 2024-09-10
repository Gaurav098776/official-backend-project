import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { BRANCHES_REPOSITORY } from 'src/constants/entities';
import { branches } from 'src/entities/branches.entity';

@Injectable()
export class BranchesRepository {
  constructor(
    @Inject(BRANCHES_REPOSITORY)
    private readonly repository: typeof branches,
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
}
