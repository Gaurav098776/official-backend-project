import { Inject, Injectable } from '@nestjs/common';
import { EXOTEL_CALL_HISTORY_ENTITY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ExotelCallHistoryRepository {
  constructor(
    @Inject(EXOTEL_CALL_HISTORY_ENTITY)
    private readonly repository: typeof ExotelCallHistory,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRawData(createData) {
    try {
      const result: any = await this.repoManager.createRowData(
        this.repository,
        createData,
      );
      return result;
    } catch (error) {
      return k500Error;
    }
  }

  async bulckCreate(createDataList: any) {
    try {
      const result: any = await this.repoManager.bulkCreate(
        this.repository,
        createDataList,
      );
      return result;
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

  async updateRowData(updatedData: any, id: number | number[]) {
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

  //#endregion
}
