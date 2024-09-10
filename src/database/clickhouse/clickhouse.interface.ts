export interface chOptionsInterface {
  attributes?: any[];
  where?: { [key: string]: any };
  limit?: number; //number;
  page?: number;
  order?: [string, 'ASC' | 'DESC'][];
  group?: string[]; // GroupOption;
}
