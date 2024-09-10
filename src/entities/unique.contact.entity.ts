// Imports
import { DataType } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({})
export class uniqueContactEntity extends Model<uniqueContactEntity> {
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: false,
  })
  userId: any[];

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  searchName: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isVerified: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  source: any;
}
