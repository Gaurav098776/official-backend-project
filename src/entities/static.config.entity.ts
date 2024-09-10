import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class StaticConfigEntity extends Model<StaticConfigEntity> {
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
  })
  type: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  data: string[];
  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: true,
  })
  lastUpdateIndex: number;
}
