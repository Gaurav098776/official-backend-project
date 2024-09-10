import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { ReasonsEntity } from './Reasons.entity';
import { registeredUsers } from './user.entity';
@Table({})
export class BlockUserHistoryEntity extends Model<BlockUserHistoryEntity> {
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

  @BelongsTo(() => registeredUsers)
  userData: registeredUsers;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    values: ['0', '1', '2'],
  })
  isBlacklist: string;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  coolOfDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason: string;
  @ForeignKey(() => ReasonsEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  reasonId: number;

  @BelongsTo(() => ReasonsEntity)
  reasonData: ReasonsEntity;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  approveBy: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  blockedBy: number;

  @BelongsTo(() => admin)
  blockByAdmin: admin;
}
