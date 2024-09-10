import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { crmDescription } from './crmDescription.entity';
import { crmDisposition } from './crmDisposition.entity';
import { crmStatus } from './crmStatus.entity';
import { Department } from './department.entity';

@Table({})
export class crmTitle extends Model<crmTitle> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  departmentId: number;

  @BelongsTo(() => Department, {
    foreignKey: 'departmentId',
    targetKey: 'id',
  })
  departmentData: Department;

  @ForeignKey(() => crmStatus)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmStatusId: number;

  @BelongsTo(() => crmStatus, {
    foreignKey: 'crmStatusId',
    targetKey: 'id',
  })
  crmStatusData: crmStatus;

  @ForeignKey(() => crmDisposition)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmDispositionId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    unique: true,
  })
  title: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isAmount: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isDate: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isReference: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isReason: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isSettlement: boolean;
  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
  })
  loanStatus: string;
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [],
  })
  departmentIds: number;
  @HasMany(() => crmDescription)
  descriptionData: crmDescription[];
}
