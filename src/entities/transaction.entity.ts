import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { admin } from './admin.entity';
import { EmiEntity } from './emi.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class TransactionEntity extends Model<TransactionEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  paidAmount: number;

  @Column({
    type: DataType.ENUM,
    values: ['INITIALIZED', 'COMPLETED', 'FAILED'],
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  completionDate: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  transactionId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  utr: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  source: string;

  @Column({
    type: DataType.ENUM,
    values: ['FULLPAY', 'EMIPAY', 'PARTPAY', 'SETTLEDPAY', 'REFUND'],
    allowNull: false,
  })
  type: string;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @BelongsTo(() => registeredUsers)
  userData: registeredUsers;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @BelongsTo(() => loanTransaction)
  loanData: loanTransaction;

  @ForeignKey(() => EmiEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emiId: number;

  @BelongsTo(() => EmiEntity)
  emiData: EmiEntity;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  principalAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  principalDifference: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  interestAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  interestDifference: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  penaltyAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  penaltyDifference: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subSource: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  bankSettlementDate: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  closingBalance: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  accStatus: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  adminId: number;

  @BelongsTo(() => admin)
  admin: admin;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subscriptionDate: string;

  @Column({
    type: DataType.ENUM,
    values: ['FULLPAY_SETTLED', 'WAIVER_SETTLED'],
    allowNull: true,
  })
  settled_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  remarks: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  followerId: number;

  @Column({ type: DataType.DOUBLE, allowNull: true, defaultValue: 0 })
  roundOff: number;

  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  tran_unique_id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  feesIncome: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  mode: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  forClosureAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  regInterestAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  sgstForClosureCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  cgstForClosureCharge: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  forClosureDays: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  bounceCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  penalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  sgstOnBounceCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  cgstOnBounceCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  sgstOnPenalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  cgstOnPenalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  sgstOnLegalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  cgstOnLegalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  legalCharge: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  maxDPD: number;
}
