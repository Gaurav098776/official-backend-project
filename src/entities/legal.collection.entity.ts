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
import { admin } from './admin.entity';
import { EmiEntity } from './emi.entity';
import { LegalConsigment } from './legal.consignment.entity';
import { TransactionEntity } from './transaction.entity';

@Table({})
export class LegalCollectionEntity extends Model<LegalCollectionEntity> {
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
  userData: registeredUsers;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  loanId: number;

  @BelongsTo(() => loanTransaction, {
    foreignKey: 'loanId',
    targetKey: 'id',
    constraints: false,
  })
  loanData: loanTransaction;

  @ForeignKey(() => EmiEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emiId: number;

  @BelongsTo(() => EmiEntity, {
    foreignKey: 'emiId',
    targetKey: 'id',
    constraints: false,
  })
  emiData: EmiEntity;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    // values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    comment:
      '1:DEMANDLATTER, 2:NOTICE,3:READY_TO_FILL,4:FILLING_IN_PROGRESS,5:CASE_FILLED,6:SUMMONS,7:WARRENT,8:CASE_WITHDRAWAL,9:CASE_DISPOSAL,10:PAID_LEGAL,11:CASE_ASSIGN',
  })
  type: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    // values: [1, 2, 3, 4],
    comment: '1:EMI-1, 2:EMI-2,3:EMI-3,4:FULLPAY',
  })
  subType: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      // -1 indicates pending from user ,1 sent,2 delivered, 3 opened, 4 return,5 block,
      email: -1,
      workMail: -1,
      physical: -1,
      whatsApp: -1,
    },
  })
  sentType: {
    email: number;
    workMail: number;
    physical: number;
    whatsApp: number;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      emailAdminId: 0,
      workMailAdminId: 0,
      physicalAdminId: 0,
      whatsAppAdminId: 0,
    },
  })
  sentBy: {
    emailAdminId: number;
    workMailAdminId: number;
    physicalAdminId: number;
    whatsAppAdminId: number;
  };

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  advocateId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'advocateId',
    targetKey: 'id',
    constraints: false,
  })
  advocateData: admin;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  url: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      crNumber: -1,
      crHearingDate: -1,
      crReason: '',
      ccNumber: -1,
      courtName: '',
      courtNumber: '',
      firstHearingDate: -1,
      complainantId: '',
    },
  })
  caseDetails: {
    crNumber: number;
    crHearingDate: string;
    crReason: string;
    ccNumber: number;
    courtName: string;
    courtNumber: number;
    firstHearingDate: number;
    complainantId: number;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      email: -1,
      workMail: -1,
      sendEmail: -1,
      sendWorkMail: -1,
      recivedDate: -1,
      nextHearingDate: -1,
      disposalDate: -1,
      issueDate: -1,
    },
  })
  dates: {
    email: number;
    workMail: number;
    sendEmail: number;
    sendWorkMail: number;
    recivedDate: number;
    nextHearingDate: number;
    disposalDate: number;
    issueDate: number;
  };

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      isAssign: -1,
      isHistory: -1,
    },
  })
  otherDetails: {
    isAssign: number;
    isHistory: number;
  };

  @ForeignKey(() => LegalConsigment)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  trackId: number;

  @BelongsTo(() => LegalConsigment, {
    foreignKey: 'trackId',
    targetKey: 'id',
    constraints: false,
  })
  trackingData: LegalConsigment;

  @ForeignKey(() => TransactionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  transactionId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  mailTrackId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  })
  mailReSend: boolean;
}
