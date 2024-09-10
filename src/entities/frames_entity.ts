// Imports
import { Table, Model, Column, DataType } from 'sequelize-typescript';

@Table({})
export class FramesEntity extends Model<FramesEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  deviceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  userId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  url: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  sessionId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  screenName: string;
}
