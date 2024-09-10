import {
  Table,
  Column,
  Model,
  DataType,
  Sequelize,
  AllowNull,
} from 'sequelize-typescript';
@Table({})
export class UsersFlowDataEntity extends Model<UsersFlowDataEntity> {
  @Column({
    type: DataType.TEXT,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  initiate: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  signUp: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  login: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  permissionAccess: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  registered: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  month: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  typeOfDevice: string;
}
