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
import { admin } from './admin.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';
import { LegalNoticeEntity } from './notice.entity';
import { mandateEntity } from './mandate.entity';
import { TransactionEntity } from './transaction.entity';
import { LegalCollectionEntity } from './legal.collection.entity';

@Table({})
export class EmiEntity extends Model<EmiEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  emi_date: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  emiNumber: Number;

  @Column({
    type: DataType.ENUM,
    allowNull: true,
    values: ['FIRST', 'SECOND', 'LAST'],
    defaultValue: null,
  })
  partOfemi: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  emiDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  emi_amount: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  payment_done_date: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Pending,1=Done,2=Rejected',
    allowNull: false,
    defaultValue: '0',
  })
  payment_status: string;

  @Column({
    type: DataType.TEXT,
    comment: '0=Payment not Due,1=Payment Due',
    allowNull: true,
  })
  payment_due_status: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  penalty: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  penalty_days: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  penalty_update_date: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  short_url: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => mandateEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  mandate_id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @ForeignKey(() => LegalNoticeEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalId: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0.0,
  })
  partPaymentAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0.0,
  })
  partPaymentPenaltyAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0.0,
  })
  principalCovered: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0.0,
  })
  interestCalculate: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  adminName: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waiver: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paid_waiver: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  unpaid_waiver: number;

  @Column({
    type: DataType.ENUM,
    values: ['FULLPAY', 'EMIPAY', 'PARTPAY', 'SETTLEDPAY'],
    allowNull: true,
  })
  pay_type: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  fullPayPrincipal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  fullPayInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  fullPayPenalty: number;

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
  sgstForClosureCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  cgstForClosureCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  fullPayLegalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0.0,
  })
  totalPenalty: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_principal: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_interest: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_penalty: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_principal: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_interest: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_penalty: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  settledId: number;

  @HasMany(() => TransactionEntity)
  transactionData: TransactionEntity[];

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => loanTransaction)
  loan: loanTransaction;

  @BelongsTo(() => LegalNoticeEntity)
  legalData: LegalNoticeEntity;

  @BelongsTo(() => mandateEntity)
  mandate: mandateEntity;

  @HasMany(() => LegalCollectionEntity)
  legalCollectionData: LegalCollectionEntity[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    // '1:Demand letter',
  })
  legalType: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0, allowNull: true })
  bounceCharge: number;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  gstOnBounceCharge: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      DPD_1_TO_3: false,
      DPD_4_TO_14: false,
      DPD_15_TO_30: false,
      DPD_31_TO_60: false,
      DPD_MORE_THAN_61: false,
      LEGAL_CHARGE: true,
    },
  })
  penaltyCharges: {
    DPD_1_TO_3: boolean;
    DPD_4_TO_14: boolean;
    DPD_15_TO_30: boolean;
    DPD_31_TO_60: boolean;
    DPD_MORE_THAN_61: boolean;
    LEGAL_CHARGE: boolean;
  };

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  dpdAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  regInterestAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  penaltyChargesGST: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidRegInterestAmount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  legalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidBounceCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidPenalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  paidLegalCharge: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  legalChargeGST: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  fullPayRegInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  fullPayBounce: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  fullPayPenal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waived_regInterest: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waived_bounce: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waived_penal: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  waived_legal: number;
}
