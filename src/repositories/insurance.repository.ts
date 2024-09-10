import { Inject, Injectable } from '@nestjs/common';
import { INSURANCE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { InsuranceEntity } from 'src/entities/insurance.entity';

@Injectable()
export class InsuranceRepository {
  constructor(
    @Inject(INSURANCE_REPOSITORY)
    private readonly repository: typeof InsuranceEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
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

  //#region create new Data
  async create(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region deleteData Data
  async deleteData(id: any, restricted?: boolean) {
    try {
      return await this.repoManager.deleteSingleData(
        this.repository,
        id,
        restricted,
      );
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion
}
