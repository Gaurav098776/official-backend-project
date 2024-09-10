import { Inject, Injectable } from '@nestjs/common';
import { ADMINROLEMODULE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { AdminRoleModuleEntity } from 'src/entities/role.module.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AdminRoleModuleRepository {
  constructor(
    @Inject(ADMINROLEMODULE_REPOSITORY)
    private readonly repository: typeof AdminRoleModuleEntity,
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
    return await this.repoManager.updateRowData(
      this.repository,
      updatedData,
      id,
    );
  }

  async create(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }
}
