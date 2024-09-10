import {
  BelongsTo,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Column, DataType } from 'sequelize-typescript';
import { admin } from './admin.entity';
import { LegalConsigment } from './legal.consignment.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class LegalNoticeEntity extends Model<LegalNoticeEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  url: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'adminId',
    targetKey: 'id',
    constraints: false,
  })
  adminData: admin;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'userId',
    targetKey: 'id',
    constraints: false,
  })
  registeredUsers: registeredUsers;

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
  sendAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'sendAdminId',
    targetKey: 'id',
    constraints: false,
  })
  sendAdminData: admin;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sendDate: Date;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emailAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'emailAdminId',
    targetKey: 'id',
    constraints: false,
  })
  emailAdminData: admin;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  emailDate: Date;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  whatsAppAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'whatsAppAdminId',
    targetKey: 'id',
    constraints: false,
  })
  whatsAppAdminData: admin;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  whatsAppDate: Date;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  receivedAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'receivedAdminId',
    targetKey: 'id',
    constraints: false,
  })
  receivedAdminData: admin;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  receivedDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  consignmentNo: string;

  @HasMany(() => LegalConsigment)
  trackData: LegalConsigment[];

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  legalNoticeTrackResponse: string;

  @Column({
    type: DataType.ENUM,
    values: [
      'Initiate',
      'Sent',
      'Process',
      'Return',
      'Complete',
      'Block',
      'MIGRATED',
    ],
    defaultValue: 'Initiate',
  })
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastResponseDate: Date;

  @Column({
    type: DataType.ENUM,
    values: ['SOFT_NOTICE', 'SIGNED_NOTICE', 'SUMMONS', 'WARRANT'],
    allowNull: true,
  })
  noticeType: string;

  @Column({
    type: DataType.ENUM,
    values: [
      'SUMMONS',
      'RESUMMONS1',
      'RESUMMONS2',
      'BIWARRANT1',
      'BIWARRANT2',
      'NONBIWARRANT',
    ],
    allowNull: true,
  })
  noticeSubType: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  uploadedDate: Date;

  @Column({
    type: DataType.ENUM,
    values: ['FULLPAY'],
    allowNull: true,
  })
  purpose: string;
  ele: { fullName: any };
}
