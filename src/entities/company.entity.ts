import { Model, Table } from 'sequelize-typescript';
import { Column, DataType } from 'sequelize-typescript';

@Table({})
export class GoogleCompanyResultEntity extends Model<GoogleCompanyResultEntity> {
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
  companyName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    unique: true,
  })
  response: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  source: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  CIN: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  companyDetails: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  establishedDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  forMigration: boolean;
}
