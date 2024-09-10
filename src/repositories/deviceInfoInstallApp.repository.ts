import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { DEVICE_INFO_AND_INSTALL_APP_REPOSITORY } from 'src/constants/entities';
import { DeviceInfoAndInstallAppEntity } from 'src/entities/device.info.entity';

@Injectable()
export class DeviceInfoInstallAppRepository {
  constructor(
    @Inject(DEVICE_INFO_AND_INSTALL_APP_REPOSITORY)
    private readonly repository: typeof DeviceInfoAndInstallAppEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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

  //#region  find one data
  async findOne(attributes: string[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  //#endregion

  //#region create new Data
  async create(data) {
    return await this.repoManager.createRowData(this.repository, data);
  }
  //#endregion

  //#region create new Data in bulk
  async bulkCreate(data) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
  //#endregion

  //#region update data
  async update(finalData: any, id: any) {
    return await this.repoManager.updateData(this.repository, finalData, {
      id,
    });
  }
  //#endregion

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}