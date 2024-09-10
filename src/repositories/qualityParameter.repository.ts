import { Injectable, Inject } from '@nestjs/common';
import { QualityParameterEntity } from 'src/entities/qualityParameter.entity';
import { RepositoryManager } from './repository.manager';
import { QUALITY_PARAMETERS_REPOSITORY } from 'src/constants/entities';

export type QualityParameterType = {
  adminId: number;
  title: string;
  options: any;
  version: number;
  disabled?: '0' | '1';
};

@Injectable()
export class QualityParameterRepository {
  constructor(
    @Inject(QUALITY_PARAMETERS_REPOSITORY)
    private readonly repository: typeof QualityParameterEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

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

  async bulkCreate(data: QualityParameterType[]) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
}
