import { Injectable, Inject } from '@nestjs/common';
import { SCORINGFIELD_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { scoringField } from 'src/entities/score.field.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ScoringFieldRepository {
  constructor(
    @Inject(SCORINGFIELD_REPOSITORY)
    private readonly repository: typeof scoringField,
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
}
