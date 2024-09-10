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
import { EmiEntity } from './emi.entity';
import { ExotelCategoryEntity } from './exotelCategory.entity';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class ExotelCallHistory extends Model<ExotelCallHistory> {
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

  @BelongsTo(() => registeredUsers)
  userData: registeredUsers;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => EmiEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emiId: number;

  @BelongsTo(() => EmiEntity)
  emiData: EmiEntity;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  referenceId: string;
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  brodcast_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  callStartDate: string;
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  callEndDate: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  to: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  from: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  callTime: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'INITIALIZED',
  })
  status: string;

  @Column({
    type: DataType.STRING(20),
  })
  serviceType: string;
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 37,
  })
  adminId: number;

  @BelongsTo(() => admin)
  createdByAdmin: admin;

  @ForeignKey(() => ExotelCategoryEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  categoryId: number;

  @BelongsTo(() => ExotelCategoryEntity)
  categoryData: ExotelCategoryEntity;

  @ForeignKey(() => crmActivity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  crmId: number;
}
