// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ timestamps: false })
export class PhoneEntity extends Model<PhoneEntity> {
  @Column({
    type: DataType.STRING(32),
    allowNull: false,
    primaryKey: true,
  })
  phone: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isWhatsApp: boolean;
}
