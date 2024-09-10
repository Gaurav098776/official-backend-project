import { Inject, Injectable } from '@nestjs/common';
import { API_LOGGER_REPOSITORY } from 'src/constants/entities';
import { APILogsEntity } from 'src/entities/apilog.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class APILogsRepository {
  constructor(
    @Inject(API_LOGGER_REPOSITORY)
    private readonly repository: typeof APILogsEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data) {
    return this.repoManager.createRowData(this.repository, data);
  }
  async bulkCreate(data) {
    return this.repoManager.bulkCreate(this.repository, data);
  }
}
