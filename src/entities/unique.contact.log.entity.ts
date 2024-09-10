// Imports
import { DataType } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({ timestamps: false })
export class UniqueContactLogEntity extends Model<UniqueContactLogEntity> {
  @Column({ type: DataType.STRING(50), allowNull: false, primaryKey: true })
  id: string;

  @Column({ type: DataType.ARRAY(DataType.UUID), allowNull: false })
  userId: string[];
}
