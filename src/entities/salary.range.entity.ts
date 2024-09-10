import { Table, Model, DataType, Column } from 'sequelize-typescript';

@Table({ timestamps: false })
export class approvedLoanAmountFromSalary extends Model<approvedLoanAmountFromSalary> {
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
  scoreGrade: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  minSalary: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  maxSalary: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  approvedAmount: any;
}
