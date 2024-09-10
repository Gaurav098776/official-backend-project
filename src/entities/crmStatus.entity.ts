import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Department } from './department.entity';

@Table({})
export class crmStatus extends Model<crmStatus> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  @ForeignKey(() => Department)
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [],
  })
  departmentIds: number;
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  departmentId: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    unique: true,
  })
  status: string;
}
