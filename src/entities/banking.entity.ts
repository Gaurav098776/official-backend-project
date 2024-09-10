// Imports
import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  HasOne,
} from 'sequelize-typescript';
import { UUID } from 'crypto';
import { admin } from './admin.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';

@Table({})
export class BankingEntity extends Model<BankingEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  mandateAccount: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  mandateBank: string;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: '0' })
  mandateIFSC: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  disbursementAccount: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  disbursementBank: string;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: '0' })
  disbursementIFSC: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  mandateAdminId: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  disbursementAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'mandateAdminId',
    targetKey: 'id',
    constraints: false,
  })
  mandateAdminData: admin;

  @BelongsTo(() => admin, {
    foreignKey: 'disbursementAdminId',
    targetKey: 'id',
    constraints: false,
  })
  disbursementAdminData: admin;

  @Column({ type: DataType.STRING, allowNull: true })
  accountUID: string;

  @Column({ type: DataType.STRING, allowNull: true })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  accountNumber: string;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: '0' })
  ifsCode: string;

  @Column({ type: DataType.STRING, allowNull: true })
  bankStatement: string;

  @Column({ type: DataType.STRING, allowNull: true })
  bank: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  accountDetails: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  netBankingScore: string;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  salary: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  salaryDate: number;

  @Column({
    type: DataType.STRING,
    comment:
      '-1 pending from user, 0 pending from admin , 1 by pass, 2 reject 3 admin approved',
    values: ['-1', '0', '1', '2', '3'],
    defaultValue: '-1',
  })
  salaryVerification: string;

  @Column({ type: DataType.STRING, allowNull: true })
  salaryVerificationDate: string;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  attempts: number;

  @ForeignKey(() => admin)
  @Column({ type: DataType.INTEGER, defaultValue: SYSTEM_ADMIN_ID })
  adminId: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejectReason: string;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: false })
  isNeedAdditional: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  additionalName: string;

  @Column({ type: DataType.STRING, allowNull: true })
  additionalBank: string;

  @Column({ type: DataType.STRING, allowNull: true })
  additionalAccountNumber: string;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: '0' })
  additionalIFSC: string;

  @Column({ type: DataType.STRING, allowNull: true })
  additionalBankStatement: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  additionalAccountDetails: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    values: [
      'SALARY_VERIFIED_NEED_TRUE',
      'SALARY_NOT_VERIFIED_NEED_FALSE',
      'SALARY_NOT_VERIFIED_NEED_TRUE',
      'BY_PASS',
    ],
  })
  status: string;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: true })
  userId: string;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  adminSalary: number;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => admin, {
    foreignKey: 'adminId',
    targetKey: 'id',
    constraints: false,
  })
  netApproveByData: admin;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: '-1',
    comment: '0 pending from user side, 1 given by user, 2 skip by user',
  })
  isNeedTagSalary: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  tagSalaryData: string;

  @ForeignKey(() => loanTransaction)
  @Column({ type: DataType.INTEGER, allowNull: true })
  loanId: number;

  @HasOne(() => loanTransaction)
  loanData: loanTransaction;

  @Column({ type: DataType.TEXT, allowNull: true })
  dataOfMonth: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  additionalURLs: string;

  @ForeignKey(() => admin)
  @Column({ type: DataType.INTEGER, defaultValue: SYSTEM_ADMIN_ID })
  uploadedByadmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'uploadedByadmin',
    targetKey: 'id',
    constraints: false,
  })
  uploadedByadminData: admin;

  @ForeignKey(() => admin)
  @Column({ type: DataType.INTEGER, defaultValue: SYSTEM_ADMIN_ID })
  additionalUploadedByadmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'additionalUploadedByadmin',
    targetKey: 'id',
    constraints: false,
  })
  additionalUploadedByadminData: admin;

  @ForeignKey(() => admin)
  @Column({ type: DataType.INTEGER })
  assignedTo: number;

  @BelongsTo(() => admin, {
    foreignKey: 'assignedTo',
    targetKey: 'id',
    constraints: false,
  })
  assignedAdminData: admin;

  @ForeignKey(() => admin)
  @Column({ type: DataType.INTEGER, allowNull: true })
  nameMissMatchAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'nameMissMatchAdmin',
    targetKey: 'id',
    constraints: false,
  })
  nameMissMatchAdminData: admin;

  @Column({ type: DataType.UUID, allowNull: true })
  consentTxnId: UUID;

  @Column({ type: DataType.UUID, allowNull: true })
  consentId: UUID;

  @Column({ type: DataType.TEXT, allowNull: true })
  consentURL: string;

  @Column({ type: DataType.STRING, allowNull: true })
  consentStatus: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  consentResponse: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  consentPhone: string;

  @Column({ type: DataType.STRING, allowNull: true })
  consentPhoneStatus: string;

  @Column({ type: DataType.STRING, allowNull: true })
  consentPhoneOTP: string;

  @Column({ type: DataType.STRING, allowNull: true })
  consentMode: string;

  @Column({ type: DataType.STRING, allowNull: true })
  accountID: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  otherDetails: any;

  @Column({ type: DataType.STRING(34), allowNull: true })
  type: string;

  @Column({ type: DataType.UUID })
  consentHandleId: UUID;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '1 -> Requested, 2 -> Failed, 3 -> Fetched',
  })
  aaDataStatus: number;

  @Column({ type: DataType.UUID, allowNull: true })
  sessionId: UUID;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: false })
  isFraud: boolean;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  matchedTransactionsDetail: any;
  
  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0 -> Manual,1 -> Approved, 2 -> Rejected',
  })
  nameMissMatch: number;

  @Column({ 
    type: DataType.INTEGER 
  })
  skipStmtAdmin: number;
  
  @Column({ 
    type: DataType.STRING,
    allowNull: true,
  })
  lastTransactionDate: string;
}
