import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_SUB_ROLE_MODULE_REPOSITORY } from 'src/constants/entities';
import { AdminSubRoleModuleEntity } from 'src/entities/role.sub.module.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AdminSubRoleModuleRepository {
  constructor(
    @Inject(ADMIN_SUB_ROLE_MODULE_REPOSITORY)
    private readonly repository: typeof AdminSubRoleModuleEntity,
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

  async create(data) {
    return this.repoManager.createRowData(this.repository, data);
  }
}
