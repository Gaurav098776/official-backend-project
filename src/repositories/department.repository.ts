import { Inject, Injectable } from '@nestjs/common';
import { DEPARTMENT_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { Department } from 'src/entities/department.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class DepartmentRepository {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY)
    private readonly repository: typeof Department,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRawData(createData) {
    try {
      return await this.repository.create(createData);
    } catch (error) {
      return k500Error;
    }
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

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowWhereData(updatedData: any, options: {}) {
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

  async updateWhereData(data: any, options: any) {
    try {
      return await this.repository.update(data, options);
    } catch (error) {
      return k500Error;
    }
  }

  async getAllRawDataWithCount(attributes: string[], options: any) {
    try {
      const listData = await this.repository.findAndCountAll({
        attributes,
        ...options,
      });
      listData.rows = listData.rows.map((el) => el.get({ plain: true }));
      return listData;
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
}
