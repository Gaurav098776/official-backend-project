import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class RequestSupportEntity extends Model<RequestSupportEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lastStep: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  connectVia: string;
}
