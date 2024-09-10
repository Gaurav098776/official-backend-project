import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class UserActivityEntity extends Model<UserActivityEntity> {
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

  @ForeignKey(() => loanTransaction)
  @Column({ type: DataType.INTEGER, allowNull: true })
  loanId: number;
  @Column({
    type: DataType.ENUM,
    values: [
      'LAST_ONLINE',
      'INSTALL_APP_CHECK',
      'UNINSTALL_APP_CHECK',
      'LOAN_ACTIVE',
      'SETTLEMENT_AVAIL',
      'DEFAULTER_FOLLOWER',
      'DEFAULTER_ASSIGN',
      'WAIVER',
      'WAIVER_REVERSED',
      'WAIVER_PAID',
      'USER_STUCK',
      'USER_REMOVE_STUCK',
      'CHANGE_ADVOCATE',
      'DELETE_DONE_ESIGN',
    ],
  })
  type: string;
  @Column({ type: DataType.TEXT, allowNull: false })
  date: string;
  @Column({ type: DataType.TEXT, allowNull: true })
  respons: string;
}
