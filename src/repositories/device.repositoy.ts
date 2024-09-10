import { Inject, Injectable } from '@nestjs/common';
import { WhereOptions } from 'sequelize/types/model';
import { DEVICE_REPOSITORY } from 'src/constants/entities';
import { device } from 'src/entities/device.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class DeviceRepository {
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly repository: typeof device,
    private readonly repoManager: RepositoryManager,
  ) {}

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
  async getTableWhereData(attributes: string[], options: {}) {
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

  //#region create device data
  async create(data) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  //#endregion

  //#region update device data
  async update(updateData: any, where: WhereOptions<device>) {
    return await this.repoManager.updateData(
      this.repository,
      updateData,
      where,
    );
  }
  //#endregion

  async bulkCreate(data) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
}
