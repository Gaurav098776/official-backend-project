import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class AdminRole extends Model<AdminRole> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  title: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '0 for inactive 1 for active.',
  })
  isActive: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  adminId: number;
}
