// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class RBIGuidelineEntity extends Model<RBIGuidelineEntity> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  keyPoints: string;
  
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  docUrl: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;
}
