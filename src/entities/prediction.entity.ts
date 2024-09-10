// Imports
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';

@Table({})
export class PredictionEntity extends Model<PredictionEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  predictionN: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  predictionP: boolean;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  finalApproval: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  contact_verification: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  location_verification: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  defaulter_location: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  emi_verification: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  salary_verification: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  email_verification: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  ecs_verification: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  categorizationDetails: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  categorizationScore: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  categorizationTag: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  aadhaarLatLong: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  automationDetails: any;

  // Final approval prediction
  @Column({ type: DataType.JSONB, allowNull: true })
  ml_approval: any;

  // Reason for putting loan in manual verification
  @Column({ type: DataType.JSONB, allowNull: true })
  manualReason: any;
}
