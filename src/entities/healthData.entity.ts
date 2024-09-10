import { DataType } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({})
export class HealthDataEntity extends Model<HealthDataEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  value: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  unit: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  dateFrom: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  dateTo: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  dataType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  platform: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  sourceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  sourceName: string;
}
