import { Inject, Injectable } from '@nestjs/common';
import { REASON_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ReasonsEntity } from 'src/entities/Reasons.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ReasonRepository {
  constructor(
    @Inject(REASON_REPOSITORY)
    private readonly repository: typeof ReasonsEntity,
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
  async createBulkData(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }
  async createRowData(data: any) {
    try {
      const creationData = await this.repository.create(data);
      if (creationData) return creationData['dataValues'];
      return k500Error;
    } catch (error) {
      return k500Error;
    }
  }

  async getRowWhereData(attributes: string[], options: any) {
    try {
      const data = await this.repository.findOne({
        attributes,
        ...options,
      });
      if (!data) return;
      return data.get({ plain: true });
    } catch (error) {
      return k500Error;
    }
  }

  async countWhereData(options: any) {
    try {
      return await this.repository.count({
        ...options,
      });
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
