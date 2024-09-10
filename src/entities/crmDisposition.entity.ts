// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { crmStatus } from './crmStatus.entity';
import { Department } from './department.entity';

@Table({})
export class crmDisposition extends Model<crmDisposition> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => crmStatus)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  statusId: number;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [],
  })
  departmentIds: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    unique: true,
  })
  title: string;

  // For sending the Email, SMS, Notification to user based on scenario
  @Column({
    type: DataType.ARRAY(DataType.JSONB),
    allowNull: true,
  })
  templateList: any[];
}
