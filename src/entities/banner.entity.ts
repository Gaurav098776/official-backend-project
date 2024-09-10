import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({})
export class bannerEntity extends Model<bannerEntity> {
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
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  bannerUrl: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  fromDate: any;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  toDate: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  platForm: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  screen: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isAllTime: string;
}
