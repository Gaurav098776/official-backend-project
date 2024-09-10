// Imports
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { registeredUsers as user } from './user.entity';

@Table({})
export class APILogsEntity extends Model<APILogsEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.ENUM,
    values: ['ADMIN', 'USER'],
  })
  type: string;

  @ForeignKey(() => user)
  @Column({
    type: DataType.UUID,
    // Do not remove below comment (This is for cassandra setup)
    comment: 'PRIMARY KEY FOR CS',
    allowNull: true,
    defaultValue: null,
  })
  userId: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    // Do not remove below comment (This is for cassandra setup)
    comment: 'PRIMARY KEY FOR CS',
    allowNull: true,
    defaultValue: null,
  })
  adminId: number;

  @Column({
    type: DataType.INTEGER,
    // Do not remove below comment (This is for cassandra setup)
    comment: 'PRIMARY KEY FOR CS',
    allowNull: true,
    defaultValue: null,
  })
  loanId: number;

  @Column({
    type: DataType.TEXT,
    // Do not remove below comment (This is for cassandra setup)
    comment: 'PRIMARY KEY FOR CS',
    allowNull: false,
  })
  apiEndpoint: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  body: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  headers: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  data: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  ip: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  sourceId: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    defaultValue: null,
  })
  traceId: number;
}
