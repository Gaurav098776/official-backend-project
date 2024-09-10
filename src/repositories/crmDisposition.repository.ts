import { Inject, Injectable } from '@nestjs/common';
import { CRMDISPOSITION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { crmDisposition } from 'src/entities/crmDisposition.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class CrmDispositionRepository {
  constructor(
    @Inject(CRMDISPOSITION_REPOSITORY)
    private readonly repository: typeof crmDisposition,
    private readonly repoManager: RepositoryManager,
  ) {}
  async createRowData(data) {
    try {
      return await this.repository.create(data);
    } catch (error) {
      console.log(error);
      return k500Error;
    }
  }
  async findOrCreate(data) {
    try {
      return await this.repository.findOrCreate(data);
    } catch (error) {
      return k500Error;
    }
  }
  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
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
}
