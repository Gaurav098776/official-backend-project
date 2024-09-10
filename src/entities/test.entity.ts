import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class TestEntity extends Model<TestEntity> {
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
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  data: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;
}
