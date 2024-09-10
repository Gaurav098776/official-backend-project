import { DataType } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({})
export class OtherPermissionDataEntity extends Model<OtherPermissionDataEntity> {
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
    type: DataType.STRING,
    allowNull: true,
  })
  loanId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  response: string;
}
