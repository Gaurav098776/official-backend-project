import {
  Table,
  Column,
  DataType,
  ForeignKey,
  Model,
  BelongsTo,
} from 'sequelize-typescript';
import { banks } from './banks.entity';

@Table({})
export class branches extends Model<branches> {
  @Column({
    type: DataType.STRING(11),
    allowNull: false,
    primaryKey: true,
  })
  ifsc: string;

  @ForeignKey(() => banks)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  bank_id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  branch: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  address: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  city: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  district: string;

  @Column({
    type: DataType.STRING(26),
    allowNull: false,
  })
  state: string;

  @BelongsTo(() => banks, {
    foreignKey: 'bank_id',
    targetKey: 'id',
    constraints: false,
  })
  bank: banks;
}
