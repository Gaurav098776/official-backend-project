import { Inject, Injectable } from '@nestjs/common';
import { WhereOptions } from 'sequelize/types/model';
import { USER_LOAN_DECLINE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { userLoanDecline } from 'src/entities/loan.decline.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class UserLoanDeclineRepository {
  constructor(
    @Inject(USER_LOAN_DECLINE_REPOSITORY)
    private readonly repository: typeof userLoanDecline,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getRowWhereData(attributes: string[], options: any) {
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

  async updateRowData(data: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, data, id);
    } catch (error) {
      return k500Error;
    }
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  //#region find or create api
  async findOrCreate(defaults: any, where?: WhereOptions<registeredUsers>) {
    return await this.repoManager.findOrCreate(
      this.repository,
      where,
      defaults,
    );
  }
  //#endregion
  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }
}
