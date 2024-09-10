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
export class LocationEntity extends Model<LocationEntity> {
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
  user: registeredUsers;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  location: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  lat: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  long: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  bearing: number;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  truecallerData: string;

  // @Column({
  //   type: DataType.INTEGER,
  //   allowNull: true,
  // })
  // pincode: number;
}
