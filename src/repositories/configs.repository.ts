// Imports
import { k500Error } from 'src/constants/misc';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIGURATION_REPOSITORY } from 'src/constants/entities';
import { Configuration } from 'src/entities/configuration.entity';

@Injectable()
export class ConfigsRepository {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY)
    private readonly repository: typeof Configuration,
  ) {}

  async getRowWhereData(attributes: string[], options: any) {
    try {
      return await this.repository.findOne({ attributes, ...options });
    } catch (error) {
      return k500Error;
    }
  }
}
