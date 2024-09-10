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
import { BankingEntity } from './banking.entity';
import { admin } from './admin.entity';
import { EmiEntity } from './emi.entity';

@Table({ timestamps: false })
export class AAEntity extends Model<AAEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  //#region Relation -> User table
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
  //#endregion

  //#region Relation -> Loan table
  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: string;

  @BelongsTo(() => loanTransaction, {
    foreignKey: 'loanId',
    targetKey: 'id',
    constraints: false,
  })
  loanData: loanTransaction;
  //#endregion

  //#region Relation -> Banking table
  @ForeignKey(() => BankingEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  bankingId: string;

  @BelongsTo(() => BankingEntity, {
    foreignKey: 'bankingId',
    targetKey: 'id',
    constraints: false,
  })
  bankingData: BankingEntity;
  //#endregion

  //#region Relation -> Emi table
  @ForeignKey(() => EmiEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emiId: string;

  @BelongsTo(() => EmiEntity, {
    foreignKey: 'emiId',
    targetKey: 'id',
    constraints: false,
  })
  emiData: EmiEntity;
  //#endregion

  //#region Relation -> Admin table
  @ForeignKey(() => admin)
  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
  })
  adminId: string;

  @BelongsTo(() => admin, {
    foreignKey: 'adminId',
    targetKey: 'id',
    constraints: false,
  })
  adminData: admin;
  //#endregion

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    comment:
      '1 -> Financial approval, 2 -> Defaulter check, 3 -> Pre emi check',
  })
  purpose: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  initiatedOn: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  endOn: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  balance: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lastTransactionBalance: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  lastTransactionOn: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    comment: '1 -> CAMS, 2-> ONE_MONEY',
  })
  source: number;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  consentId: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    comment: 'Indicates weather the data is todays latest data or not',
  })
  latestFetch;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Encrypted value of bank statement url',
  })
  statementUrl;
}
