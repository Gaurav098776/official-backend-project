// Imports
import { Inject, Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { ResponseEntity } from 'src/entities/response.entity';
import { RepositoryManager } from './repository.manager';
import { RESPONSE_REPOSITORY } from 'src/constants/entities';

@Injectable()
export class ResponseRepository {
  constructor(
    @Inject(RESPONSE_REPOSITORY)
    private readonly repository: typeof ResponseEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
}
