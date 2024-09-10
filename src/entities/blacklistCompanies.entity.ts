import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({})
export class BlacklistCompanyEntity extends Model<BlacklistCompanyEntity> {
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
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  blockedBy: string;
}
