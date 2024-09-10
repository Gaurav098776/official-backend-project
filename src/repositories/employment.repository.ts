import { Inject, Injectable } from '@nestjs/common';
import { EMPLOYEEDETAILS_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { employmentDetails } from 'src/entities/employment.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class EmploymentRepository {
  constructor(
    @Inject(EMPLOYEEDETAILS_REPOSITORY)
    private readonly repository: typeof employmentDetails,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async findOne(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  //#region update emp data
  async update(updatedData: any, where: any, silent = false) {
    return await this.repoManager.updateData(
      this.repository,
      updatedData,
      where,
      silent,
    );
  }
  //#endregion

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  //#region find all
  async findAll(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

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
  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }
}
