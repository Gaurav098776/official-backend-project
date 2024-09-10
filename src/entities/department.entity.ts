import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class Department extends Model<Department> {
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
    unique: true,
  })
  department: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: false,
  })
  loanStatus: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'true=read, false=false',
  })
  isDelete: boolean;
}
