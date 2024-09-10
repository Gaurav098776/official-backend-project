// Imports
import { Injectable } from '@nestjs/common';
import { DbQueryInterface } from '../db.query.interface';

@Injectable()
export class PgQueryService {
  async injectQuery(
    options: DbQueryInterface,
    type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    targetData?,
    filterType?: 'ALL' | 'ONE',
  ) {
    try {
      if (options.raw == null) options.raw = true;

      if (filterType == null) filterType == 'ONE';

      if (type == 'READ') {
        if (filterType == 'ALL') return await options.entity.findAll(options);
        else return await options.entity.findOne(options);
      }
    } catch (error) {}
  }

  async injectRawQuery(options: DbQueryInterface) {
    return await options.entity.sequelize.query(options.rawQuery);
  }
}
