import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class InsuranceEntity extends Model<InsuranceEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.INTEGER })
  status: number;

  @Column({ type: DataType.STRING, allowNull: true })
  completionDate: string;

  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  leadId: string;

  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  lan_id: string;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({ type: DataType.INTEGER, allowNull: false, unique: true })
  loanId: number;

  @BelongsTo(() => loanTransaction, {
    foreignKey: 'loanId',
    targetKey: 'id',
    constraints: false,
  })
  loanData: loanTransaction;

  @Column({ type: DataType.TEXT, allowNull: true })
  insuranceURL: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  insuranceURL1: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  body: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  response: string;
}
