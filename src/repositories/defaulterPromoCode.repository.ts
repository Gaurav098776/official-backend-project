import { Inject, Injectable } from '@nestjs/common';
import { PROMO_CODE_ENTITY_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { PromoCodeEntity } from 'src/entities/promocode.entity';

@Injectable()
export class DefaulterPromoCodeRepository {
  constructor(
    @Inject(PROMO_CODE_ENTITY_REPOSITORY)
    private readonly repository: typeof PromoCodeEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: number) {
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }
}
