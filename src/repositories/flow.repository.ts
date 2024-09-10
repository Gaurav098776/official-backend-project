import { Inject, Injectable } from '@nestjs/common';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { FlowEntity } from 'src/entities/flow.entity';
import { FLOW_REPOSITORY } from 'src/constants/entities';

@Injectable()
export class FlowRepository {
  constructor(
    @Inject(FLOW_REPOSITORY)
    private readonly repository: typeof FlowEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createOrUpdateRowData(data: any, id: any) {
    try {
      return await this.repoManager.createOrUpdateRowData(
        this.repository,
        data,
        id,
      );
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
  async getTableWhereData(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
