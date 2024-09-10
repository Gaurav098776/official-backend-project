import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
import { ReferralEntity } from './referral.entity';

@Table({})
export class ReferralHistoryEntity extends Model<ReferralHistoryEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => ReferralEntity)
  @Column({ type: DataType.INTEGER, allowNull: false })
  referralId: number;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  referredBy: string;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  referredTo: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  time: number;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  stage: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
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
