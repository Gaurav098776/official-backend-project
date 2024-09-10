import { Injectable, Inject } from '@nestjs/common';
import { SCORECARD_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { scoreCard } from 'src/entities/score.card.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ScoreCardRepository {
  constructor(
    @Inject(SCORECARD_REPOSITORY)
    private readonly repository: typeof scoreCard,
    private readonly repoManager: RepositoryManager,
  ) {}

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
  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
}
