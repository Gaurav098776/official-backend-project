import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class employmentType extends Model<employmentType> {
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
  })
  typeName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: true,
  })
  typeStatusVerified: string;
}
