import { Inject, Injectable } from '@nestjs/common';
import { USER_PERMISSION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { UserPermissionEntity } from 'src/entities/userPermission.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class UserPermissionRepository {
  constructor(
    @Inject(USER_PERMISSION_REPOSITORY)
    private readonly repository: typeof UserPermissionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: any[], options: any) {
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async updateWhere(updateData: any, id: any, where: any) {
    try {
      if (!id) return k500Error;
      where.id = id;

      return await this.repoManager.updateRowWhereData(
        this.repository,
        updateData,
        { where },
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: any[], options: any) {
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

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getCountsWhere(options) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

  async deleteSingleData(id) {
    try {
      return this.repoManager.deleteSingleData(this.repository, id);
    } catch (error) {
      return k500Error;
    }
  }
}
