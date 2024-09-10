import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';

@Table({})
export class AugmontTransactionEntity extends Model<AugmontTransactionEntity> {
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

  @Column({ type: DataType.DOUBLE, allowNull: true })
  quantity: number;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  amount: number;

  @Column({
    type: DataType.ENUM,
    values: ['INITIALIZED', 'COMPLETED', 'FAILED'],
    defaultValue: 'INITIALIZED',
  })
  status: string;

  @Column({ type: DataType.STRING, allowNull: true })
  completionDate: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  merchantTransactionId: string;

  @Column({ type: DataType.STRING, unique: true })
  transactionId: string;

  @Column({ type: DataType.ENUM, values: ['gold', 'silver'], allowNull: false })
  type: string;

  @Column({
    type: DataType.ENUM,
    values: ['buy', 'sell', 'transfer'],
    allowNull: false,
  })
  mode: string;

  @Column({ type: DataType.STRING, allowNull: true })
  receiver_id: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  response: string;

  @BelongsTo(() => registeredUsers)
  userData: registeredUsers;

  @Column({ type: DataType.JSONB, allowNull: true })
  charges: any;

  @Column({ type: DataType.TEXT, allowNull: true })
  invoice: string;
}
