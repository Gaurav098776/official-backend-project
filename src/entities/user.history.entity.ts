import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';

@Table({})
export class userHistory extends Model<userHistory> {
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

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  reason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  documentFrontImage: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  documentBackImage: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  documentType: string;
}
