// Imports
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class ThirdPartyProvider extends Model<ThirdPartyProvider> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'true -> Active, false -> InActive',
  })
  status: boolean;
}
