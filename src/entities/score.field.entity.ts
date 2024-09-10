import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';
import { scoringFieldGroup } from './score.group.entity';

@Table({})
export class scoringField extends Model<scoringField> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  scoreId: number;
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  scoreFieldName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: false,
  })
  scoreIsFlag: string;

  @BelongsTo(() => scoringFieldGroup, {
    foreignKey: 'scoreId',
    targetKey: 'scoreId',
    constraints: false,
  })
  scoreField: scoringFieldGroup;
}
