import { Inject, Injectable } from '@nestjs/common';
import { REFERENCES_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { ReferencesEntity } from 'src/entities/references.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ReferenceRepository {
  constructor(
    @Inject(REFERENCES_REPOSITORY)
    private readonly repository: typeof ReferencesEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    try {
      const creationData = await this.repository.create(data);
      if (creationData) return creationData['dataValues'];
      return k500Error;
    } catch (error) {
      return k500Error;
    }
  }

  async create(data) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async findOne(attributes: string[], options) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
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

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
