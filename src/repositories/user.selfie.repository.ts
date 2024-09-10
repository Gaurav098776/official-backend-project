import { Inject, Injectable } from '@nestjs/common';
import { USER_SELFIE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class UserSelfieRepository {
  constructor(
    @Inject(USER_SELFIE_REPOSITORY)
    private readonly repository: typeof UserSelfieEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
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

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
