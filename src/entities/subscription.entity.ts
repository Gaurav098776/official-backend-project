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
export class SubScriptionEntity extends Model<SubScriptionEntity> {
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
  subscriptionId: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  referenceId: string;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  accountNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: true,
  })
  umrn: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  invitationLink: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  mode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  planId: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  initiatedOn: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxDebitAmount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  mandateExpireDate: string;
}
