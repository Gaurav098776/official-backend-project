import { Table, Model, DataType, Column } from 'sequelize-typescript';

@Table({})
export class stamp extends Model<stamp> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  certificateNo: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  certificateIssuedDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  accountReference: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  uniqueDocReference: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  purchasedBy: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  descOfDoc: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  considerationPrice: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  firstParty: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  secondParty: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  stampDutyPaidBy: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  stampDutyAmount: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  stampId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  stampImage: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'The Status of stamp when it is first taken; 0=Free; 1=Taken',
  })
  takenStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'takenStatus Date for cron timer count',
  })
  takenStatusDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'The Status of stamp when it is esigned; 0=Free; 1=Signed',
  })
  signStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'signStatus Date for cron timer count',
  })
  signStatusDate: string;
}
