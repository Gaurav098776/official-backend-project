// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
import { loanTransaction } from './loan.entity';

@Table({ timestamps: false })
export class MetricsEntity extends Model<MetricsEntity> {
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
  loanId: string;

  @Column({
    allowNull: false,
    comment: '1 -> BANKING, 2 -> AADHAAR',
    type: DataType.SMALLINT,
  })
  type: number;

  @Column({
    allowNull: true,
    comment: '1 -> IN APP NETBAKING, 2 -> Account aggregator',
    type: DataType.SMALLINT,
  })
  subType: number;

  @Column({
    allowNull: true,
    type: DataType.STRING(64),
  })
  reqUrl: string;

  @Column({
    allowNull: false,
    comment: '1 -> START, 2 -> IN PROCESS, 3 -> END',
    type: DataType.SMALLINT,
  })
  status: number;

  @Column({
    allowNull: true,
    type: DataType.JSONB,
  })
  values: any;

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  sourceUrl: string;

  @Column({
    allowNull: false,
    type: DataType.DATE,
  })
  logDate: number;

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  deviceId: string;
}
