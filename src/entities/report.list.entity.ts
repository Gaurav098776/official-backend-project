import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';

@Table({})
export class ReportListEntity extends Model<ReportListEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  type: string;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isDate: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isSearch: boolean;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isDownload: boolean;
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;
}
