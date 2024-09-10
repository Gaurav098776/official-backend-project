import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { Op } from 'sequelize';
import { MediaRepository } from 'src/repositories/media.repository';

@Injectable()
export class MediaSharedService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async uploadMediaToCloud(data: any) {
    try {
      const result = await this.mediaRepo.create(data);
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async deleteRowData(id: number) {
    try {
      const deleteRes = await this.mediaRepo.updateRowWhereData(
        { isDeleted: true },
        {
          where: {
            id,
            isDeleted: { [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }] },
          },
        },
      );
      if (deleteRes[0] == 0)
        return { valid: false, message: 'failed to delete the document!' };
      return deleteRes;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
}
