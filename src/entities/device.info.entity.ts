// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
@Table({})
export class DeviceInfoAndInstallAppEntity extends Model<DeviceInfoAndInstallAppEntity> {
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
    type: DataType.TEXT,
    allowNull: true,
  })
  deviceInfo: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    defaultValue: [],
  })
  deviceInstallApp: string[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  version: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  webDeviceInfo: string;
}
