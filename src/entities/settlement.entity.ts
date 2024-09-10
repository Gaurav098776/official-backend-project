// Imports
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class SettlementEntity extends Model<SettlementEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  settlementId: string;

  //processed-razorpay,Paid-cashfree
  @Column({
    type: DataType.SMALLINT,
    comment: '1=processed/Paid',
  })
  status: number;

  //third party source
  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    comment: '0=Razorpay-1,1=Razorpay-2,2=Cashfree',
  })
  paymentGateway: number;

  //We will add it later
  @Column({
    allowNull: false,
    comment: '1 -> ICICI - 753',
    type: DataType.SMALLINT,
  })
  bankAccount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount: number;

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
    type: DataType.DOUBLE,
    allowNull: true,
  })
  adjustment: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  utr: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  settlementDate: string;
}
