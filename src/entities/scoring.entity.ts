import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table
export class scoring extends Model<scoring> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  scoringId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  descriptionId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  score: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  version: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  status: boolean;
}
