import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { admin } from './admin.entity';

@Table({})
export class CollectionReport extends Model<CollectionReport> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'adminId',
    targetKey: 'id',
    constraints: false,
  })
  adminData: admin;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  totalCases: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  amountToBeRecovered: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  principalToBeRecovered: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  activePartPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  receivedPartPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  demandCase: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  demandPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  noticeCase: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  noticePayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  summonsCase: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  summonsPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  warrentCase: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  warrentPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  totalPtp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  paidPtp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  unpaidPtp: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  ptpAmount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  totalCalls: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  connectedCalls: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  notConnectedCalls: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  todayPayment: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  monthlyPayment: number;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  bucketWise: any;
}
