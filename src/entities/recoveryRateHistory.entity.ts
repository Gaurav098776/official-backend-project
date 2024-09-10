// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class RecoveryRateHistoryEntity extends Model<RecoveryRateHistoryEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  Month: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  expectedPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  expectedInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  expectedPenalty: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  totalExpected: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidPenalty: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  totalPaid: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  discount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waivedOff: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waiverPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waiverInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waiverPenalty: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  prePaidPrinciple: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  prePaidInterest: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanCount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  totalPrePaidAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  unPaidPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  unPaidInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  unpaidPenalty: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  totalUnpaid: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  diffPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  diffInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  diffPenalty: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  refundAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  recoveryRate: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  prePaidRate: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isFuture: boolean;
}
