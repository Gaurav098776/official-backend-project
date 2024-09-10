import { Inject, Injectable } from '@nestjs/common';
import { ADMINROLE_REPOSITORY } from 'src/constants/entities';
import { AdminRole } from 'src/entities/admin.role.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AdminRoleRepository {
  constructor(
    @Inject(ADMINROLE_REPOSITORY)
    private readonly repository: typeof AdminRole,
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
