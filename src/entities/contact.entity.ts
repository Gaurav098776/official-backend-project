import { registeredUsers } from './user.entity';
import { DataType, ForeignKey } from 'sequelize-typescript';
import { Table, Column, Model } from 'sequelize-typescript';

@Table({ timestamps: false })
export class contactDetailEntity extends Model<contactDetailEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  name: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  number: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyName: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isUpdate: boolean;

  // @Column({
  //   type: DataType.TEXT,
  //   allowNull: true,
  // })
  // response: string;
}
