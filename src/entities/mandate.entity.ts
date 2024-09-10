// Imports
import {
  Table,
  Model,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
import { loanTransaction } from './loan.entity';

@Table({})
export class mandateEntity extends Model<mandateEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  reference_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  debtor_account_type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  debtor_account_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  debtor_name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  email_address: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  first_collection_date: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  phone_number: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  mobile_number: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  amount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  api_response_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emandate_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  quick_invite_url: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response_time_stamp: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0 means Unsigned, 1 means Signed, 2 means Rejected',
    allowNull: true,
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  actual_status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  umrn: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => loanTransaction)
  loan: loanTransaction;
}
