import { Inject, Injectable } from '@nestjs/common';
import { EXOTEL_CATEGORY_ENTITY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ExotelCategoryEntity } from 'src/entities/exotelCategory.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ExotelCategoryRepository {
  constructor(
    @Inject(EXOTEL_CATEGORY_ENTITY)
    private readonly repository: typeof ExotelCategoryEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(createData) {
    try {
      return await this.repoManager.createRowData(this.repository, createData);
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

  async updateRowWhereData(updatedData: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        updatedData,
        options,
      );
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
}
