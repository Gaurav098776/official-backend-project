import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class whatsappMSGEntity extends Model<whatsappMSGEntity> {
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
  })
  messageTitle: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalCount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  templateContent: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  eligibleMsgCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  passMsgCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  failedMsgCount: number;
}
