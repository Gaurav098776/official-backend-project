import { Inject, Injectable } from '@nestjs/common';
import { AUGMONT_TRANSACTION_REPOSITORY } from 'src/constants/entities';
import { AugmontTransactionEntity } from 'src/entities/augmont.transaction.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class AugmontTransactionRepository {
  constructor(
    @Inject(AUGMONT_TRANSACTION_REPOSITORY)
    private readonly repository: typeof AugmontTransactionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async updateWhere(updateData: any, id: any, where: any) {
    if (!id) return k500Error;
    where.id = id;

    return await this.repoManager.updateRowWhereData(
      this.repository,
      updateData,
      { where },
    );
  }
}
