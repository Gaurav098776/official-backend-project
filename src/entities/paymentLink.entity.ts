import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { loanTransaction as loan } from './loan.entity';
import { registeredUsers as user } from './user.entity';

@Table({})
export class PaymentLinkEntity extends Model<PaymentLinkEntity> {
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
  })
  link: string;

  @ForeignKey(() => loan)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => user)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: number;

  @Column({
    type: DataType.ENUM,
    defaultValue: null,
    values: ['1', '2'],
    allowNull: true,
    comment: '1=Settlement mail 2=Loan closure mail',
  })
  mailType: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isActive: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  expiryDate: string;
}
