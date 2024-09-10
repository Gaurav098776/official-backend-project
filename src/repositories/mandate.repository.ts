import { Inject, Injectable } from '@nestjs/common';
import { MANDATE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { mandateEntity } from 'src/entities/mandate.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class MandateRepository {
  constructor(
    @Inject(MANDATE_REPOSITORY)
    private readonly repository: typeof mandateEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(
      this.repository,
      options,
      false,
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
}
