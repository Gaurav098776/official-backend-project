import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_OF_ROLE_REPOSITORY } from 'src/constants/entities';
import { AccessOfRoleEntity } from 'src/entities/access_of_role.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AccessOfRoleRepository {
  constructor(
    @Inject(ACCESS_OF_ROLE_REPOSITORY)
    private readonly repository: typeof AccessOfRoleEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRoweData(attributes: string[], options: any) {
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

  async updateRowData(updatedData: any, id: number) {
    return this.repoManager.updateRowData(this.repository, updatedData, id);
  }

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async bulkCreate(data: any) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }
}
