import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { RepositoryManager } from './repository.manager';
import { WHATSAPP_MESSAGE_REPOSITORY } from 'src/constants/entities';
import { whatsappMSGEntity } from 'src/entities/whatsappMSGEntity';

@Injectable()
export class whatsappMSGRepository {
  constructor(
    @Inject(WHATSAPP_MESSAGE_REPOSITORY)
    private readonly repository: typeof whatsappMSGEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }
  async getTableWhereData(attributes: any[], options: any) {
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
  async updateRowWhereData(updatedData: any, options: any) {
    try {
      return this.repoManager.updateRowWhereData(
        this.repository,
        updatedData,
        options,
      );
    } catch (error) {
      console.log(error);
      return k500Error;
    }
  }

  async updateRowData(updatedData: any, id: any, silent = false) {
    try {
      return this.repoManager.updateRowData(
        this.repository,
        updatedData,
        id,
        silent,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: any[], options: any) {
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
