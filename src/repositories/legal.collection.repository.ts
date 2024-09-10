import { Inject, Injectable } from '@nestjs/common';
import { LEGAL_COLLECTION } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';

@Injectable()
export class LegalCollectionRepository {
  constructor(
    @Inject(LEGAL_COLLECTION)
    private readonly repository: typeof LegalCollectionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}
  async bulkCreate(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async getTableWhereData(attributes: any[], options: any) {
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

  async updateRowData(updatedData: any, id: number, silent = false) {
    try {
      return this.repoManager.updateRowData(
        this.repository,
        updatedData,
        id,
        silent,
      );
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

  async updateWhere(updateData: any, id: any, where: any) {
    if (!id) return k500Error;
    where.id = id;

    return await this.repoManager.updateRowWhereData(
      this.repository,
      updateData,
      { where },
    );
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

  async create(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async createRowDataWithCopy(data: any, id: number) {
    try {
      return await this.repoManager.createRowDataWithCopy(
        this.repository,
        data,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }
  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
}
