import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table({})
export class DeviceSIM extends Model<DeviceSIM> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  operatorName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  simNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  operatorName2: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  simNumber2: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '1=Active 0=Inactive',
    allowNull: false,
  })
  isActive: string;
}
