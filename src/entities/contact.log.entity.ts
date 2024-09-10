// Imports
import { DataType } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({ timestamps: false })
export class ContactLogEntity extends Model<ContactLogEntity> {
  @Column({ type: DataType.STRING(32), allowNull: false, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  phone: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.ARRAY(DataType.DOUBLE), defaultValue: [] })
  timeStamps: number[];

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment:
      'if duration is 0 then not enter the data, key is time stamp value:duration',
  })
  duration: any;

  @Column({ type: DataType.SMALLINT, defaultValue: 1, comment: '1 call log' })
  type: number;
}
