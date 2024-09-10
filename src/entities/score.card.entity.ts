import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table
export class scoreCard extends Model<scoreCard> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  scoreCardId: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: false,
    comment: '0 for inactive 1 for active',
  })
  isActive: string;
}
