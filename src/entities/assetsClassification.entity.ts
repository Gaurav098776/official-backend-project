// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class assetsClassification extends Model<assetsClassification> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  date: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  count: any;

  @Column({ type: DataType.TEXT, allowNull: false })
  SMA_ALL: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  SMA_0: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  SMA_1: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  SMA_2: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  Standard_Asset: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  NPA_90_to_180: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  NPA_181_to_365: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  SubStandard_Asset: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  Loss_Asset: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  Doubtful_Asset: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  upcoming: string;
}
