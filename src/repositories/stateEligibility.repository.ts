import { Inject, Injectable } from '@nestjs/common';
import { STATE_ELIGIBILITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { StateEligibilty } from 'src/entities/stateEligibility.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class StateEligibilityRepository {
  constructor(
    @Inject(STATE_ELIGIBILITY_REPOSITORY)
    private readonly repository: typeof StateEligibilty,
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
      return this.repoManager.updateRowData(this.repository, updatedData, id);
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

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  //#region find or create api
  async create(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
   }
  }
  //#endregion
}
