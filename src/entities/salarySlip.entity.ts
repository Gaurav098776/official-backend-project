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
export class SalarySlipEntity extends Model<SalarySlipEntity> {
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

  @Column({ type: DataType.TEXT, allowNull: false, comment: 'Salary Slip' })
  url: string;

  @Column({ type: DataType.DOUBLE, allowNull: true, defaultValue: 0 })
  netPayAmount: number;

  @Column({ type: DataType.STRING, allowNull: true })
  salarySlipDate: string;

  @Column({ type: DataType.STRING, allowNull: true })
  joiningDate: string;

  @Column({ type: DataType.STRING, allowNull: true })
  panNumber: string;

  @Column({ type: DataType.STRING, allowNull: true })
  bankAccountNumber: string;

  @Column({
    type: DataType.ENUM,
    values: ['-1', '0', '1', '2', '3'],
    defaultValue: '-1',
    comment:
      '-1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject 3 for Accept(admin)',
    allowNull: true,
  })
  status: string;

  @Column({ type: DataType.DATE, allowNull: true })
  salaryVerifiedDate: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejectReason: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  remark: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  comment: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  response: string;

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

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  companyName: string;
}
