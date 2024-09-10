import { Inject, Injectable } from '@nestjs/common';
import { SALARY_SLIP_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class SalarySlipRepository {
  constructor(
    @Inject(SALARY_SLIP_REPOSITORY)
    private readonly repository: typeof SalarySlipEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRawData(createData) {
    try {
      return await this.repoManager.createRowData(this.repository, createData);
    } catch (error) {
      return k500Error;
    }
  }

  async findOne(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async findAll(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  //#region update emp data
  async update(updatedData: any, where: any) {
    return await this.repoManager.updateData(
      this.repository,
      updatedData,
      where,
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
  //#region create slary slip data
  async create(data: any) {
    return this.repoManager.createRowData(this.repository, data);
  }
  //#endregion

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

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async deleteWhereData(options: any) {
    try {
      return await this.repoManager.deleteWhereData(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }
  async getRowWhereData(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
}
