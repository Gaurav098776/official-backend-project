import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table
export class employmentDesignation extends Model<employmentDesignation> {
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
  designationName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: true,
  })
  designationStatusVerified: string;
}
