import { Table, Model, DataType, Column } from 'sequelize-typescript';

@Table({ timestamps: false })
export class salaryGrade extends Model<salaryGrade> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  minscore: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxscore: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  scoregrade: string;
}
