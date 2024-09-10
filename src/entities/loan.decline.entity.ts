import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class userLoanDecline extends Model<userLoanDecline> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  userDeclineReasonTitle: string;

  @Column({
    type: DataType.TEXT,
    values: ['0', '1'],
    defaultValue: '0',
    allowNull: false,
  })
  userDeclineStatus: string;
}
