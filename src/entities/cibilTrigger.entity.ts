import { Table, Model, DataType, Column } from 'sequelize-typescript';

@Table({})
export class cibilTriggerEntity extends Model<cibilTriggerEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  data: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'date of add CIBIL Trigger Data',
  })
  submissionDate: string;
}
