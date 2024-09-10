import { Inject, Injectable } from '@nestjs/common';
import { PURPOSE_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { loanPurpose } from 'src/entities/loan.purpose.entity';

@Injectable()
export class PurposeRepository {
  constructor(
    @Inject(PURPOSE_REPOSITORY)
    private readonly repository: typeof loanPurpose,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: string[], options: any) {
    try {
      const data = await this.repository.findOne({
        attributes,
        ...options,
      });
      if (!data) return;
      return data.get({ plain: true });
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
}
