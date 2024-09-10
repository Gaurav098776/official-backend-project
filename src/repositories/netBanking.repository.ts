import { Inject, Injectable } from '@nestjs/common';
import { USERNETBANKINGDETAILES_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { userNetBankingDetails } from 'src/entities/netBanking.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class NetBankingRepository {
  constructor(
    @Inject(USERNETBANKINGDETAILES_REPOSITORY)
    private readonly repository: typeof userNetBankingDetails,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getRowWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getRowWhereData(
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

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }
}
