import {
  Model,
  Table,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { IS_ACTIVE, promoCodeStatus } from 'src/constants/globals';

@Table({})
export class PromoCodeEntity extends Model<PromoCodeEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING(20) })
  promo_code: string;

  @Column({ type: DataType.STRING })
  promo_code_url: string;

  @Column({ type: DataType.SMALLINT, comment: 'discount is in percentage' })
  discount: number;

  @Column({ type: DataType.SMALLINT })
  delay_day: number;

  @Column({
    type: DataType.SMALLINT,
    comment: '0=every_time, 1=salary_day, 2=only_one_time',
    defaultValue: promoCodeStatus.DAY_WISE,
  })
  type: number;

  @Column({ type: DataType.STRING, allowNull: true })
  end_date: string;

  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
  count: number;

  @Column({ type: DataType.SMALLINT, defaultValue: 0 })
  before_days: number;

  @Column({ type: DataType.SMALLINT, defaultValue: IS_ACTIVE })
  is_active: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  adminId: string;
}
