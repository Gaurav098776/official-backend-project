import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { crmTitle } from './crmTitle.entity';

@Table({})
export class crmDescription extends Model<crmDescription> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;
  @ForeignKey(() => crmTitle)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  titleId: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  description: string;
}
