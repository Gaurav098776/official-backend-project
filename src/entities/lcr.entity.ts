import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({})
export class LCREntity extends Model<LCREntity> {
  @Column({
    type: DataType.DATE,
    allowNull: false,
    primaryKey: true,
    unique: true,
  })
  date: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  bankBalance: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  marketableSecurity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  outflow: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  stressedOutflow: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  inflow: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  stressedInflow: false;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalNetOutflow: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  LCR: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  payload: any;
}
