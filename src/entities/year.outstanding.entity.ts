import {
  Table,
  Column,
  Model,
  DataType
} from 'sequelize-typescript';

@Table({})
export class YearOutstandingEntity extends Model<YearOutstandingEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  outstandingDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  url: string;

  @Column({
    type: DataType.ENUM,
    values: ['1', '2'],
    defaultValue: '1',
    comment: '1=Summary 2=Row',
    allowNull: false,
  })
  type: string;
}
