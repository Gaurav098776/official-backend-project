import { Inject, Injectable } from '@nestjs/common';
import { CRON_TRAKING_REPOSITORY } from 'src/constants/entities';
import { RepositoryManager } from './repository.manager';
import { CronTrakingEntity } from 'src/entities/cron.track.entity';

@Injectable()
export class CronTrakingRepository {
  constructor(
    @Inject(CRON_TRAKING_REPOSITORY)
    private readonly repository: typeof CronTrakingEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async updateRowData(updatedData: any, id: number) {
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }
}
