import {
  Table,
  Column,
  Model,
  DataType,
  Sequelize,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
@Table({})
export class device extends Model<device> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  deviceId: string;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  typeOfDevice: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fcmToken: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '1=LoggedIn 0=LoggedOut',
    allowNull: true,
  })
  isLoggedIn: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  deviceScore: string;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;
}
