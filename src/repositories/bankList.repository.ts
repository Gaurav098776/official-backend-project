import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { TOTAL_BANK_REPOSITORY } from 'src/constants/entities';
import { BankList } from 'src/entities/bank.entity';

@Injectable()
export class BankListRepository {
  constructor(
    @Inject(TOTAL_BANK_REPOSITORY)
    private readonly repository: typeof BankList,
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

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    return this.repoManager.getTableCountWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async updateRowData(data: any, id: string) {
    return this.repoManager.updateRowData(this.repository, data, id);
  }
}
