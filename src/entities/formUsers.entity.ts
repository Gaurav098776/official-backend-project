// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table({})
export class FormUsers extends Model<FormUsers> {
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
  fullName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  mobileNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  OTP: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  salaryRange: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  city: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  employmentType: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: '0-LSP, 1-NBFC',
  })
  webType: number;
}
