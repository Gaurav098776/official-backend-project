import { Inject, Injectable } from '@nestjs/common';
import { CRMACTIVITY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { crmActivity } from 'src/entities/crm.entity';

@Injectable()
export class crmActivityRepository {
  constructor(
    @Inject(CRMACTIVITY_REPOSITORY)
    private readonly repository: typeof crmActivity,
  ) {}

  async createRawData(createData) {
    try {
      return await this.repository.create(createData);
    } catch (error) {
      console.log(error);
      return k500Error;
    }
  }
  async createBulkData(createData) {
    try {
      return await this.repository.bulkCreate(createData);
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
      console.log(error);
      return k500Error;
    }
  }

  async getTableWhereCountData(attributes: any[], options: any) {
    try {
      const listData = await this.repository.findAndCountAll({
        attributes,
        ...options,
      });
      if (options.raw == true) return listData;
      return {
        count: listData.count,
        rows: listData.rows.map((element) => element.get({ plain: true })),
      };
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
  async updateRowWhereData(updatedData: any, options) {
    try {
      return await this.repository.update(updatedData, options);
    } catch (error) {
      return k500Error;
    }
  }
}
