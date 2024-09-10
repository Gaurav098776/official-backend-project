// Imports
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class disbursementEntity extends Model<disbursementEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  payout_id: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  currency: string;

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
    type: DataType.TEXT,
    allowNull: true,
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  utr: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  mode: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  purpose: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  narration: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  batch_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  failure_reason: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  queue_if_low_balance: boolean;

  //fund_account

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  account_type: string;

  //->bank_account
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  ifsc: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  account_number: string;
  //<-

  //->contact
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  contact: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reference_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON.stringify',
  })
  response: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bank_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fundAccount: string;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    unique: true,
  })
  loanId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  source: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  settlementDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON.stringify',
  })
  settlementData: string;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => loanTransaction)
  loan: loanTransaction;

  @Column({
    allowNull: true,
    defaultValue: {},
    type: DataType.JSONB,
  })
  requestdata: any;
}
