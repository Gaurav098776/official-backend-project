import { ForeignKey, Model, Table } from 'sequelize-typescript';
import { Column, DataType } from 'sequelize-typescript';
import { admin } from './admin.entity';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';

@Table({})
export class ManualVerifiedWorkEmailEntity extends Model<ManualVerifiedWorkEmailEntity> {
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
  domain: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  url: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  })
  isActive: boolean;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  approveById: number;

  @Column({ type: DataType.STRING, allowNull: true })
  companyName: string;
}
