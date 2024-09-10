import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ timestamps: true })
export class ActiveLoanAddressesEntity extends Model<ActiveLoanAddressesEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  loanId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarAddress: string;

  @Column({
    type: 'point',
    allowNull: true,
  })
  aadhaarLatLong: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  isActive: boolean;
}
