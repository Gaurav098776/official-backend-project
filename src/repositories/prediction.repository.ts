import { Injectable, Inject } from '@nestjs/common';
import { PREDICTION_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { PredictionEntity } from 'src/entities/prediction.entity';

@Injectable()
export class PredictionRepository {
  constructor(
    @Inject(PREDICTION_REPOSITORY)
    private readonly repository: typeof PredictionEntity,
  ) {}

  async createRowData(data: any) {
    try {
      const creationData = await this.repository.create(data);
      if (creationData) return creationData['dataValues'];
      return k500Error;
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowData(data: any, id: number, silent = false) {
    try {
      return await this.repository.update(data, { where: { id }, silent });
    } catch (error) {
      return k500Error;
    }
  }

  async updateWhereData(data: any, options: any) {
    try {
      return await this.repository.update(data, options);
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
      if (options.raw == true) return listData;
      return listData.map((element) => element.get({ plain: true }));
    } catch (error) {
      return k500Error;
    }
  }
}
