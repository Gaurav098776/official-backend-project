import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { device } from './device.entity';

@Table({})
export class InstallAppEntity extends Model<InstallAppEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => device)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  deviceId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  appName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  packageName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  category: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    unique: true,
  })
  deviceAppId: string;

  @Column({
    type: DataType.SMALLINT,
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  typeOfDevice: number;

  @Column({
    type: DataType.SMALLINT,
    comment: '0=deleted 1=installed',
    allowNull: true,
    defaultValue: 1,
  })
  status: number;
}
