// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class UserPermissionEntity extends Model<UserPermissionEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  img: string;

  @Column({ type: DataType.STRING, allowNull: false })
  asset: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  description: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  android: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  IOS: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  WEB: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  nbfcWEB: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  lspImg: string;
}
