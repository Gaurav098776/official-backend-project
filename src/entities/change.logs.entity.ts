import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';
import { ipMasterEntity } from './ipMaster.entity';

@Table({})
export class ChangeLogsEntity extends Model<ChangeLogsEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    comment: '["Employment"]',
  })
  type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    comment: '["Approval Amount"]',
  })
  subType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'data before change happen',
  })
  oldData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'data after change happen',
  })
  newData: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  status: string;

  @ForeignKey(() => ipMasterEntity)
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  ip: string;
}
