import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { crmActivity } from './crm.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';
@Table({})
export class DefaulterOnlineEntity extends Model<DefaulterOnlineEntity> {
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

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  loanId: number;
  @BelongsTo(() => loanTransaction)
  loanData: loanTransaction;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastOnline: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @ForeignKey(() => crmActivity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmId: number;
  @BelongsTo(() => crmActivity)
  crmData: crmActivity;
}
