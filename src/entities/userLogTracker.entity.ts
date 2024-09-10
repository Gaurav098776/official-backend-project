import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
import { loanTransaction } from './loan.entity';
import { ipMasterEntity } from './ipMaster.entity';

@Table({})
export class UserLogTracker extends Model<UserLogTracker> {
  @Column({
    primaryKey: true,
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => ipMasterEntity)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ip: string;

  @BelongsTo(() => ipMasterEntity)
  ipMaster: ipMasterEntity;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  stage: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  deviceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  ipLocation: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  ipCountry: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  otherDetails: any;
}
