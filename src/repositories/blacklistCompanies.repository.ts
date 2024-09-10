import { Inject, Injectable } from '@nestjs/common';
import { BLACKLIST_COMPANIES_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { BlacklistCompanyEntity } from 'src/entities/blacklistCompanies.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class BlackListCompanyRepository {
  constructor(
    @Inject(BLACKLIST_COMPANIES_REPOSITORY)
    private readonly repository: typeof BlacklistCompanyEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRawData(createData) {
    try {
      return await this.repository.create(createData);
    } catch (error) {
      return k500Error;
    }
  }

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

  async updateRowData(updatedData: any, id: number) {
    try {
    const a = await this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async deleteSingleData(id, restricted=true) {
    try {
      return await this.repoManager.deleteSingleData(this.repository, id, restricted)
    } catch (error) {
      return k500Error
    }
  }
}
