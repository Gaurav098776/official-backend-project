// Imports
import { Model, Table } from 'sequelize-typescript';
import { Column, DataType } from 'sequelize-typescript';

@Table({})
export class MailTrackerEntity extends Model<MailTrackerEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.UUID,
  })
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.STRING,
    values: ['EMAIL', 'TEXT', 'NOTIFICATION','WHATSAPP'],
  })
  type: string;

  @Column({
    type: DataType.TEXT,
  })
  title: string;

  @Column({
    type: DataType.ENUM,
    values: ['Sent', 'Done', 'Process', 'Reject', 'Received'],
    defaultValue: 'Sent',
  })
  status: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'sent',
  })
  subStatus: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    //if mail recived from user side then 'true' else 'false'
  })
  isSender: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  refrenceId: string;

  @Column({
    type: DataType.TEXT,
  })
  response: string;

  @Column({
    type: DataType.STRING,
  })
  statusDate: string;

  @Column({
    type: DataType.STRING,
  })
  source: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  content: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  requestData: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: 'system',
  })
  sentBy: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  service: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    comment: '0=unread 1=read',
    allowNull: true,
    defaultValue: '0',
  })
  notificationFlag: string;
}
