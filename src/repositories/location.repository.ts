import { Inject, Injectable } from '@nestjs/common';
import { LOCATION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { LocationEntity } from 'src/entities/location.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class LocationRepository {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly repository: typeof LocationEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async bulkCreate(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
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

  async updateRowData(updatedData: any, id: number | number[]) {
    try {
      return await this.repository.update(updatedData, { where: { id } });
    } catch (error) {
      return k500Error;
    }
  }
}
