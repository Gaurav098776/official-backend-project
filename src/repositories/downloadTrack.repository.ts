import { Inject, Injectable } from '@nestjs/common';
import { DOWNLOAD_APP_TRACK } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { DownloaAppTrack } from 'src/entities/downloads.app.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class DownloaAppTrackRepo {
  constructor(
    @Inject(DOWNLOAD_APP_TRACK)
    private readonly repository: typeof DownloaAppTrack,
    private readonly repoManager: RepositoryManager,
  ) {}
  async create(data) {
    return await this.repoManager.createRowData(this.repository, data);
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
}
