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
import { loanTransaction } from './loan.entity';
@Table({})
export class CibilScoreEntity extends Model<CibilScoreEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.ENUM,
    defaultValue: '1',
    values: ['1', '2'],
    allowNull: false,
    comment: '1=PL Score 2=Prefill',
  })
  type: string;

  @Column({
    type: DataType.ENUM,
    defaultValue: '0',
    values: ['0', '1', '2', '3', '4'],
    allowNull: false,
    comment: '0=Pending 1=Success 2=Failed, 3=Error, 4=Unknown',
  })
  status: string;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
    allowNull: false,
    comment: '0=No 1=Yes',
  })
  validCibilData: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  cibilScore: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  plScore: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalAccounts: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  PLAccounts: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  overdueAccounts: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  zeroBalanceAccounts: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  highCreditAmount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  currentBalance: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  overdueBalance: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalOverdueDays: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  PLOutstanding: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalOutstanding: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  monthlyIncome: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalInquiry: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  inquiryPast30Days: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  inquiryPast12Months: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  inquiryPast24Months: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  recentDateOpened: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  oldestDateOpened: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  recentInquiryDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  oldestInquiryDate: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  requestdata: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  responsedata: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  tuefHeader: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  names: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  ids: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  telephones: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  emails: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  employment: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  scores: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  addresses: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  accounts: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  enquiries: string;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'userId',
    targetKey: 'id',
    constraints: false,
  })
  registeredUsers: registeredUsers;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
    allowNull: false,
    comment: '0=No 1=Yes',
  })
  past6MonthDelay: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fetchDate: string;
}
