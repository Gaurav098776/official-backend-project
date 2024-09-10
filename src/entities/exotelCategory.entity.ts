import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { ExotelCallHistory } from './ExotelCallHistory.entity';

@Table({})
export class ExotelCategoryEntity extends Model<ExotelCategoryEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'INITIALIZED',
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: 'in-process',
  })
  subStatus: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  from: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  category: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 37,
  })
  adminId: number;

  @Column({
    type: DataType.STRING(20),
  })
  serviceType: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  brodcast_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  startDate: Date;
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endDate: Date;

  @BelongsTo(() => admin)
  createdByAdmin: admin;

  @HasMany(() => ExotelCallHistory)
  callLogs: ExotelCallHistory[];
}
