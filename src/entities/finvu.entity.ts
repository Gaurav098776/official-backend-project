// Imports
import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class FinvuEntity extends Model<FinvuEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({ type: DataType.UUID, allowNull: true })
  userId: string;

  @ForeignKey(() => loanTransaction)
  @Column({ type: DataType.INTEGER, allowNull: true })
  loanId: number;

  @Column({
    comment: '1 -> Request, 2 -> Response',
    type: DataType.SMALLINT,
    allowNull: true,
  })
  type: number;

  @Column({
    comment: '1 -> Callback data, 2 -> Fetch data, 3 -> BSA data , 4-> Pending Request Data',
    type: DataType.SMALLINT,
    allowNull: true,
  })
  subType: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  data: any;
}
