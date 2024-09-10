// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { admin } from './admin.entity';
import { MasterEntity } from './master.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class WorkMailEntity extends Model<WorkMailEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  email: string;

  // -1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject
  // 3 for Accept(admin), 4 for skip, 5 for user side otp verification pending
  @Column({
    type: DataType.ENUM,
    values: ['-1', '0', '1', '2', '3', '4', '5'],
    defaultValue: '-1',
    comment:
      '-1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject 3 for Accept(admin), 4 for skip',
    allowNull: true,
  })
  status: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejectReason: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  remark: string;

  @Column({ type: DataType.DATE, allowNull: true })
  verifiedDate: Date;

  @Column({ type: DataType.STRING, allowNull: true })
  otp: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  emailCode: string;

  @Column({
    type: DataType.ENUM,
    allowNull: true,
    defaultValue: '-1',
    values: ['-1', '0', '1', '2'],
  })
  codeStatus: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  tempEmail: string;

  // -1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject
  //  5 for user side otp verification pending
  @Column({
    type: DataType.ENUM,
    values: ['-1', '0', '1', '2', '5'],
    defaultValue: '-1',
    comment:
      '-1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject',
    allowNull: true,
  })
  tempStatus: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  approveById: number;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => admin)
  admin: admin;

  @ForeignKey(() => MasterEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  masterId: number;

  @BelongsTo(() => MasterEntity)
  masterData: MasterEntity;
}
