import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { admin } from './admin.entity';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';

@Table({})
export class QualityParameterEntity extends Model<QualityParameterEntity> {
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  options: any;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  version: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: null,
  })
  adminId: number;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '1 for disabled 0 for active',
  })
  disabled: '0' | '1';
}
