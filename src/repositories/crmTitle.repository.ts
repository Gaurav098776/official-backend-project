import { Inject, Injectable } from '@nestjs/common';
import {
  CRMTITLE_REPOSITORY,
  CRM_DESCRIPTION_ENTITY,
} from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { crmTitle } from 'src/entities/crmTitle.entity';
import { RepositoryManager } from './repository.manager';
import { crmDescription } from 'src/entities/crmDescription.entity';

@Injectable()
export class CrmTitleRepository {
  constructor(
    @Inject(CRMTITLE_REPOSITORY)
    private readonly repository: typeof crmTitle,
    @Inject(CRM_DESCRIPTION_ENTITY)
    private readonly crmDesRepository: typeof crmDescription,
  ) {}

  async createRowData(data) {
    try {
      return await this.repository.create(data);
    } catch (error) {
      return k500Error;
    }
  }
  async getRowWhereData(attributes: string[], options: any) {
    try {
      const data = await this.repository.findOne({
        attributes,
        ...options,
      });
      if (!data) return;
      return data.get({ plain: true });
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereData(attributes: string[], options: any) {
    try {
      const listData = await this.repository.findAll({
        attributes,
        ...options,
      });
      return listData.map((element) => element.get({ plain: true }));
    } catch (error) {
      return k500Error;
    }
  }

  async getCountWhereData(attributes: string[], options: any) {
    try {
      const listData = await this.repository.findAndCountAll({
        attributes,
        ...options,
      });
      return listData;
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowData(updatedData: any, id: number | number[]) {
    try {
      return await this.repository.update(updatedData, { where: { id } });
    } catch (error) {
      return k500Error;
    }
  }
}
