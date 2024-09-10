import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_COORDINATES_REPOSITORY } from 'src/constants/entities';
import { GoogleCoordinatesEntity } from 'src/entities/googleCoordinates.entity';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class GoogleCordinatesRepository {
  constructor(
    @Inject(GOOGLE_COORDINATES_REPOSITORY)
    private readonly repository: typeof GoogleCoordinatesEntity,
  ) {}

  async create(data) {
    try {
      return await this.repository.create(data);
    } catch (error) {
      return k500Error;
    }
  }
  async getRowWhereData(attributes: string[], options: any) {
    try {
      return await this.repository.findOne({ attributes, ...options });
    } catch (error) {
      return k500Error;
    }
  }
}
