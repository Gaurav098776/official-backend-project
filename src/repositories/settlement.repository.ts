import { Inject, Injectable } from '@nestjs/common';
import { SETTLEMENT_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { SettlementEntity } from 'src/entities/settlement.entity';

@Injectable()
export class SettlementRepository {
  constructor(
    @Inject(SETTLEMENT_REPOSITORY)
    private readonly repository: typeof SettlementEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRawData(createData) {
    try {
      return await this.repository.create(createData);
    } catch (error) {
      return k500Error;
    }
  }

  async bulkCreate(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
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

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }
}
