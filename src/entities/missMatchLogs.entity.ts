import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
@Table
export class missMatchLogs extends Model<missMatchLogs> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  name1: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  name2: string;

  @Column({
    type: DataType.ENUM,
    values: ['BANK_STATMENT', 'KYC', 'ADHAR_CARD', 'PAN_CARD'],
    allowNull: true,
  })
  type: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  data: string;

  @Column({ type: DataType.ENUM, allowNull: true, values: ['0', '1', '2'] })
  status: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejectReason: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  adminId: string;
}
