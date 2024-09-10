import { Inject, Injectable } from '@nestjs/common';
import { OTHER_PERMISSION_DATA_ENTITY_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { OtherPermissionDataEntity } from 'src/entities/otherPermissionData.entity';

@Injectable()
export class OtherPermissionDataRepository {
  constructor(
    @Inject(OTHER_PERMISSION_DATA_ENTITY_REPOSITORY)
    private readonly repository: typeof OtherPermissionDataEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async countOfRowData(options: any) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

  async updateData(updatedData: any, whereData: any) {
    try {
      return await this.repoManager.updateData(
        this.repository,
        updatedData,
        whereData,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return await this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async bulkCreate(data) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
}
