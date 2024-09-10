import { Inject, Injectable } from '@nestjs/common';
import { DISBURSEMENTENTITY_REPOSITORY } from 'src/constants/entities';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class DisbursmentRepository {
  constructor(
    @Inject(DISBURSEMENTENTITY_REPOSITORY)
    private readonly repository: typeof disbursementEntity,
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowDataWithOptions(updatedData: any, options: any, id: number) {
    try {
      return this.repoManager.updateRowDataWithOptions(
        this.repository,
        updatedData,
        options,
        id,
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

  async deleteWOptions(options: any) {
    try {
      return await this.repository.destroy(options);
    } catch (error) {
      return null;
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
}
