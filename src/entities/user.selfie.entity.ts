import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { admin } from './admin.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class UserSelfieEntity extends Model<UserSelfieEntity> {
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
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  tempImage: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  adminId: number;

  @Column({
    type: DataType.TEXT,
    comment: '0=not Verified,1=Verified,2=Rejected, 3=manual verified',
    allowNull: true,
    defaultValue: '-1',
    validate: {
      isIn: [['-1', '0', '1', '2', '3', '5']],
    },
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  verifiedDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  rejectReason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  extraData: string;

  @BelongsTo(() => admin)
  admin: admin;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  details: string;
}
