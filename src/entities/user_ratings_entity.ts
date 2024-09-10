// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class UserRatingsEntity extends Model<UserRatingsEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  rating: number;
}
