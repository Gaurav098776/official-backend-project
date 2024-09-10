import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class ReasonsEntity extends Model<ReasonsEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
    unique: true,
  })
  reason: string;
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string;
}
