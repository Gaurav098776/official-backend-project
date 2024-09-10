import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
@Table({})
export class UserDelete extends Model<UserDelete> {
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
    type: DataType.ENUM,
    defaultValue: 'InProcess',
    values: ['InProcess', 'Complete'],
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalFileCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  uniqueFileCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  errorFileCount: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  allFiles: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  errorFiles: string;

  @Column({
    type: DataType.ENUM,
    values: ['1', '2', '3'],
    defaultValue: '1',
    comment: '1=App 2=Web 3=Admin',
    allowNull: false,
  })
  mode: string;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'userId',
    targetKey: 'id',
    constraints: false,
  })
  registeredUsers: registeredUsers;
}
