import { Inject, Injectable } from '@nestjs/common';
import { CIBIL_REPOSITORY } from 'src/constants/entities';
import { CIBILEntity } from 'src/entities/cibil.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class CIBILRepository {
  constructor(
    @Inject(CIBIL_REPOSITORY)
    private readonly repository: typeof CIBILEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
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
}
