import { Inject, Injectable } from '@nestjs/common';
import { CONFIGURATION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { Configuration } from 'src/entities/configuration.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ConfigurationRepository {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY)
    private readonly repository: typeof Configuration,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
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

  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }
}
