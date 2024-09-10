import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';

@Table({})
export class ReferralEntity extends Model<ReferralEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  referredBy: string;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  referredTo: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  time: number;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  stage: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  points: number;

  @Column({ type: DataType.STRING, allowNull: false })
  referralCode: string;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'referredBy',
    targetKey: 'id',
    constraints: false,
  })
  referredByData: registeredUsers;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'referredTo',
    targetKey: 'id',
    constraints: false,
  })
  referredToData: registeredUsers;
}
