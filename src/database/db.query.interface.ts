import { FindOptions } from 'sequelize/types';

export interface DbQueryInterface extends FindOptions {
  attributes?: any[];
  type?: 'PG' | 'CS';
  entity: any;
  rawQuery?: string;
  fineTuneRawQuery?: boolean;
}
