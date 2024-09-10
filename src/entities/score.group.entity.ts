import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { scoringField } from './score.field.entity';
import { scoring } from './scoring.entity';
@Table
export class scoringFieldGroup extends Model<scoringFieldGroup> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  descriptionId: number;

  @ForeignKey(() => scoringField)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  scoreId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  descriptionName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: false,
  })
  isActive: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  orderingDisplay: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  start: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  mid: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  end: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  type: string;

  @BelongsTo(() => scoring, {
    foreignKey: 'descriptionId',
    targetKey: 'descriptionId',
    constraints: false,
  })
  score: scoring;
}
