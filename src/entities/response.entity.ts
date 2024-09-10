// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class ResponseEntity extends Model<ResponseEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  source: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  consentId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  clientTxnId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  custId: string;
}
