// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class CIBILEntity extends Model<CIBILEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => loanTransaction)
  @Column({ type: DataType.INTEGER, unique: true, allowNull: false })
  loanId: number;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  nextDate: string;

  /// user base details segment
  @Column({ type: DataType.TEXT, allowNull: false })
  nSegment: string;

  /// account transaction segment
  @Column({ type: DataType.TEXT, allowNull: false })
  aSegment: string;
}
