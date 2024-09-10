import { Inject, Injectable } from '@nestjs/common';
import { WhereOptions } from 'sequelize/types/model';
import { USER_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { registeredUsers } from 'src/entities/user.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: typeof registeredUsers,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return this.repoManager.createRowData(this.repository, data);
  }

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

  async updateRowData(data: any, id: string, silent = false) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id, silent);
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowDataWithOptions(data: any, options: any, id: string) {
    try {
      return this.repoManager.updateRowDataWithOptions(
        this.repository,
        data,
        options,
        id,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowWhereData(data: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        data,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  //#region find or create api
  async findOrCreate(defaults: any, where?: WhereOptions<registeredUsers>) {
    return await this.repoManager.findOrCreate(
      this.repository,
      where,
      defaults,
    );
  }
  //#endregion
  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
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
}
