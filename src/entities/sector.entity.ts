import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ timestamps: false })
export class employmentSector extends Model<employmentSector> {
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
  sectorName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: true,
  })
  sectorStatusVerified: string;
}
