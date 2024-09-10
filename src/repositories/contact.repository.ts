import { Inject, Injectable } from '@nestjs/common';
import { CONTACT_DETAILS_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { contactDetailEntity } from 'src/entities/contact.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class ContactRepository {
  constructor(
    @Inject(CONTACT_DETAILS_REPOSITORY)
    private readonly repository: typeof contactDetailEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async deleteWhereData(options: any) {
    return await this.repoManager.deleteWhereData(this.repository, options);
  }

  async getRowWhereData(attributes: any[], options: any) {
    return await this.repoManager.getRowWhereData(
      this.repository,
      attributes,
      options,
    );
  }

  
  async updateRowData(updatedData: any, id: number) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
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
