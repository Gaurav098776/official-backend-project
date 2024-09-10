import { Column, DataType, Model, Table } from 'sequelize-typescript';
@Table({})
export class banks extends Model<banks> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.STRING(49),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  logo: string;
}
