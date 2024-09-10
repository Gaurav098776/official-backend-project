import { Inject, Injectable } from '@nestjs/common';
import { SUBSCRIPTION_ENTITY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @Inject(SUBSCRIPTION_ENTITY)
    private readonly repository: typeof SubScriptionEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(createData) {
    try {
      return await this.repoManager.createRowData(this.repository, createData);
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

  async getTableCountWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getTableCountWhereData(
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

  async getCountsWhereData(options) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
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

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(
      this.repository,
      options,
      false,
    );
  }

  async deleteRowData(id: number) {
    try {
      return await this.repository.destroy({ where: { id } });
    } catch (error) {
      return k500Error;
    }
  }
}
