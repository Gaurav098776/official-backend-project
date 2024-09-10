// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';

@Table({})
export class ReferralTransactionEntity extends Model<ReferralTransactionEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @BelongsTo(() => registeredUsers)
  userData: registeredUsers;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 1,
    comment: '0 == INITIALIZED, 1 == COMPLETED, 2 == FAILED',
  })
  status: number;

  @Column({
    type: DataType.STRING(128),
    allowNull: false,
    unique: true,
  })
  transactionId: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
    unique: true,
  })
  utr: string;

  @Column({
    type: DataType.STRING(12),
    allowNull: false,
    comment: 'Payout source -> CASHFREE, RAZORPAY, RAZORPAY_M2',
  })
  source: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0 == NEFT, 1 == IMPS',
  })
  mode: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  referenceId: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  payoutId: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  completionDate: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  subscriptionDate: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  fees: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  tax: number;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
  })
  bankName: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
  })
  ifsc: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
  })
  accountNumber: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.STRING(15),
    allowNull: true,
  })
  contact: string;

  @Column({
    type: DataType.STRING(256),
    allowNull: true,
  })
  failureReason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;
}
