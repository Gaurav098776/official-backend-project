import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { crmDescription } from './crmDescription.entity';
import { Department } from './department.entity';

@Table({})
export class CrmReasonEntity extends Model<CrmReasonEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    unique: true,
  })
  reason: string;
  @ForeignKey(() => Department)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  departmentId: number;

  @BelongsTo(() => Department, {
    foreignKey: 'departmentId',
    targetKey: 'id',
  })
  departmentData: Department;
}
