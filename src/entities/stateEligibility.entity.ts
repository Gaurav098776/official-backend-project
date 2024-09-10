import { Table, Model, DataType, Column } from 'sequelize-typescript';

@Table({})
export class StateEligibilty extends Model<StateEligibilty> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  stateName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    allowNull: false,
  })
  isActive: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    defaultValue: 20000,
  })
  eligibility_new: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
    defaultValue: 20000,
  })
  eligibility_repeat: number;
}
