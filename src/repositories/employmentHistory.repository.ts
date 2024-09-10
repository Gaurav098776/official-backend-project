import { Inject, Injectable } from '@nestjs/common';
import { EMPLOYEEDETAILS_HISTORY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { EmploymentHistoryDetailsEntity } from 'src/entities/employment.history.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class EmploymentHistoryRepository {
  constructor(
    @Inject(EMPLOYEEDETAILS_HISTORY_REPOSITORY)
    private readonly repository: typeof EmploymentHistoryDetailsEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async findAll(attributes: string[], options: any) {
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      options,
    );
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
}
