import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class AccessOfListEntity extends Model<AccessOfListEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  title: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  adminId: number;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '0 for inactive 1 for active.',
  })
  isActive: string;
}
