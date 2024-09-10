import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class CronTrakingEntity extends Model<CronTrakingEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
  })
  adminId: number;

  @Column({ type: DataType.STRING })
  type: string;

  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  unique_key: string;
}
