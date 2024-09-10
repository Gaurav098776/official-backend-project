import { Inject, Injectable } from '@nestjs/common';
import { ADDRESSES_REPOSITORY } from 'src/constants/entities';
import { AddressesEntity } from 'src/entities/addresses.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class AddressesRepository {
  constructor(
    @Inject(ADDRESSES_REPOSITORY)
    private readonly repository: typeof AddressesEntity,
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

  async updateRowData(updatedData: any, id: number) {
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

  async bulkCreate(data: any) {
    try {
      return await this.repoManager.bulkCreate(this.repository, data);
    } catch (error) {
      return k500Error;
    }
  }

  async getCountsWhere(options) {
    return await this.repoManager.getCountsWhere(this.repository, options);
  }

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async findAndUpdateOrCreate(data: {
    userId: string;
    address: string;
    shipping?: string;
    type: string;
    status: string;
    probability?: { address?: string; probability?: number; type?: number };
    subType?: string;
  }) {
    try {
      const { userId, address, shipping, type, status, probability, subType } =
        data;
      const attributes = ['id'];
      const options = { where: { userId, address } };
      // Prevent duplication
      const existingData = await this.getRowWhereData(attributes, options);
      if (existingData && existingData != k500Error) {
        const updateData = { status: '0', subType };
        await this.updateRowData(updateData, existingData.id);
      } else {
        const creationData = {
          response: JSON.stringify(shipping),
          userId,
          address,
          type,
          status,
          subType,
        };
        if (!probability) {
          creationData['probability'] = probability;
        }
        await this.createRowData(creationData);
      }
    } catch (error) {}
  }
}
