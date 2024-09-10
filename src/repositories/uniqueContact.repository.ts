// Imports
import { Inject, Injectable } from '@nestjs/common';
import { UNIQUE_CONTACT_REPOSITORY } from 'src/constants/entities';
import { uniqueContactEntity } from 'src/entities/unique.contact.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';
import { Op } from 'sequelize';

@Injectable()
export class UniqueConatctsRepository {
  constructor(
    @Inject(UNIQUE_CONTACT_REPOSITORY)
    private readonly repository: typeof uniqueContactEntity,
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
      const result = await this.repoManager.getTableWhereData(
        this.repository,
        attributes,
        options,
      );
      if (result == k500Error) return k500Error;
      return result;
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowData(updatedData: any, id: string) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async createRowData(data: any) {
    try {
      return await this.repoManager.createRowData(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async countOfRowData(options: any) {
    try {
      return await this.repoManager.getCountsWhere(this.repository, options);
    } catch (error) {
      return k500Error;
    }
  }

  async updateData(updatedData: any, whereData: any) {
    try {
      return await this.repoManager.updateData(
        this.repository,
        updatedData,
        whereData,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
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

  async bulkCreate(data) {
    return await this.repoManager.bulkCreate(this.repository, data);
  }

  async findUserContact(attributes, userId) {
    const where = { userId: { [Op.contains]: [userId] } };
    return await this.repoManager.getTableWhereData(
      this.repository,
      attributes,
      { where },
    );
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }
}
