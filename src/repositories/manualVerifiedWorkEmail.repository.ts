import { Inject, Injectable } from '@nestjs/common';
import { MANUAL_VERIFIED_WORK_EMAIL_REPOSITORY } from 'src/constants/entities';
import { ManualVerifiedWorkEmailEntity } from 'src/entities/manualVerifiedWorkEmail.entity';
import { RepositoryManager } from './repository.manager';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class ManualVerifiedWorkEmailRepository {
  constructor(
    @Inject(MANUAL_VERIFIED_WORK_EMAIL_REPOSITORY)
    private readonly repository: typeof ManualVerifiedWorkEmailEntity,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getCount(where: any) {
    return await this.repoManager.getCountsWhere(this.repository, { where });
  }

  //#region update emp data
  async update(updatedData: any, where: any) {
    return await this.repoManager.updateData(
      this.repository,
      updatedData,
      where,
    );
  }
  //#endregion

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

  //#region create slary slip data
  async create(data: any) {
    return this.repoManager.createRowData(this.repository, data);
  }
  //#endregion
}
