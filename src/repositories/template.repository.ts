import { Inject, Injectable } from '@nestjs/common';
import { TEMPLATE_ENTITY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { TemplateEntity } from 'src/entities/template.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class TemplateRepository {
  constructor(
    @Inject(TEMPLATE_ENTITY)
    private readonly repository: typeof TemplateEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(createData) {
    try {
      return await this.repoManager.createRowData(this.repository, createData);
    } catch (error) {
      return k500Error;
    }
  }
  async bulkCreate(createData) {
    try {
      return await this.repoManager.bulkCreate(this.repository, createData);
    } catch (error) {
      return k500Error;
    }
  }

  async getRowWhereData(attributes: string[], options: any) {
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
