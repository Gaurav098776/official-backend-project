import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class DownloaAppTrack extends Model<DownloaAppTrack> {
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
    unique: true,
  })
  deviceId: string;
  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
  })
  typeOfDevice: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isRegistered: boolean;
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isExits: boolean;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  registeredDate: string;
}
