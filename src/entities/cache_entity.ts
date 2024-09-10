// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class CacheEntity extends Model<CacheEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING(32),
  })
  name: string;

  @Column({
    type: DataType.TEXT,
  })
  value: string;
}
