import { Inject, Injectable } from '@nestjs/common';
import { USER_ACTIVITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { UserActivityEntity } from 'src/entities/user.activity.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class UserActivityRepository {
  constructor(
    @Inject(USER_ACTIVITY_REPOSITORY)
    private readonly repository: typeof UserActivityEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  /// find or create
  async findOrCreate(defaults: any, where: any) {
    return await this.repoManager.findOrCreate(
      this.repository,
      where,
      defaults,
    );
  }
  //#endregion

  //#region  find on
  async getRowWhereData(attributes, options) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

  // create
  async createRowData(data: any) {
    try {
      return this.repository.create(data);
    } catch (error) {
      return k500Error;
    }
  }
  async getTableWhereData(attributes, options) {
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
  //#endregion
  async updateRowDataID(data: any, id) {
    try {
      if (!id) return k500Error;
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }
  async updateRowData(data: any, options: any) {
    try {
      return this.repository.update(data, options);
    } catch (error) {
      return k500Error;
    }
  }
  async bulkCreate(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
}
