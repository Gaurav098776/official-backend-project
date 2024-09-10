import { Inject, Injectable } from '@nestjs/common';
import { ESIGN_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { esignEntity } from 'src/entities/esign.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ESignRepository {
  constructor(
    @Inject(ESIGN_REPOSITORY)
    private readonly repository: typeof esignEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getTableCountWhereData(attributes: string[], options: any) {
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

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(
      this.repository,
      options,
      false,
    );
  }

  async getRowWhereData(attributes: any[], options: any) {
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

  async distroy(options) {
    try {
      if (!options?.id) return false;
      return this.repoManager.distroy(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

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

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
}
