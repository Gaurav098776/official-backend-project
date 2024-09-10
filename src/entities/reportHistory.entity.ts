import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
@Table({})
export class ReportHistoryEntity extends Model<ReportHistoryEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  fromDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  toDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  downloadUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  reportName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '3'],
    defaultValue: '0',
    comment: '0=Pending 1=Complete 2=Failed 3=In-progress',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  apiUrl: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  extraparms: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  retryCount: number;
}
