// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { CrmReasonEntity } from './crm.reasons.entity';
import { crmDescription } from './crmDescription.entity';
import { crmStatus } from './crmStatus.entity';
import { crmTitle } from './crmTitle.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';
import { TransactionEntity } from './transaction.entity';
@Table({})
export class crmActivity extends Model<crmActivity> {
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
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'userId',
    targetKey: 'id',
    constraints: false,
  })
  registeredUsers: registeredUsers;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '3', '4'],
    comment: '0=Pre-calling , 1=Post-calling,2=OnDue,3=General,4=Other',
  })
  categoryId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  due_date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  title: string;
  @ForeignKey(() => crmTitle)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  titleId: number;

  @ForeignKey(() => crmDescription)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  descriptionId: number;

  @BelongsTo(() => crmTitle, {
    foreignKey: 'titleId',
    targetKey: 'id',
    constraints: false,
  })
  titleData: crmTitle;

  @BelongsTo(() => crmDescription, {
    foreignKey: 'descriptionId',
    targetKey: 'id',
    constraints: false,
  })
  descriptionData: crmTitle;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '3', '4'],
    comment: '0=in progress, 1=done, 2=reject, 3=pending,4=Promise to pay',
  })
  status: string;

  @ForeignKey(() => crmStatus)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmStatusId: number;

  @BelongsTo(() => crmStatus, {
    foreignKey: 'crmStatusId',
    targetKey: 'id',
    constraints: false,
  })
  crmStatusData: crmStatus;

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

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @BelongsTo(() => loanTransaction, {
    foreignKey: 'loanId',
    targetKey: 'id',
    constraints: false,
  })
  loanData: loanTransaction;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  closedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  closingDate: Date;

  @BelongsTo(() => admin, {
    foreignKey: 'closedBy',
    targetKey: 'id',
    constraints: false,
  })
  closedByData: admin;

  @Column({
    type: DataType.INTEGER,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '0=not deteled, 1=deleted',
  })
  isDelete: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  remark: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'true=read, false=unRead',
  })
  read: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  lastUpdatedBy: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  referenceName: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  reason: boolean;

  @ForeignKey(() => CrmReasonEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmReasonId: number;

  @BelongsTo(() => CrmReasonEntity, {
    foreignKey: 'crmReasonId',
    targetKey: 'id',
    constraints: false,
  })
  crmReasonData: CrmReasonEntity;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  settlementData: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  ptpStatus: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: -1,
    allowNull: true,
    comment: '0 = ADMIN_LAST, 1 = LAST, -1 = default',
  })
  crmOrder: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  relationData: string;

  @Column({ type: DataType.STRING(32), allowNull: true })
  callSid: string;

  @ForeignKey(() => TransactionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  transactionId: number;

  @BelongsTo(() => TransactionEntity, {
    foreignKey: 'transactionId',
    targetKey: 'id',
    constraints: false,
  })
  transactionData: TransactionEntity;

  @Column({
    type: DataType.INTEGER,
    defaultValue: -1,
    allowNull: true,
  })
  trans_status: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  totalReceivedAmount: number;
}
