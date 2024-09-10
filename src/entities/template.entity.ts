// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class TemplateEntity extends Model<TemplateEntity> {
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
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  content: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subType: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  templateId: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  smsOptions: {};

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  lspTemplateId: string;
}
