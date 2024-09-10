// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({})
export class SystemTraceEntity extends Model<SystemTraceEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  sessionId: string;

  @Column({
    allowNull: false,
    comment: `1 -> Adding bounce charge to EMI table,
              2 -> Reversal of bounce charge, penalty amount and penalty days
              3 -> Paid legal to case disposal with file
              4 -> Case withdrawal to case disposal with file
              7 -> Refund initiate`,
    type: DataType.INTEGER,
  })
  type: number;

  // User table
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  // Loan table
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: string;

  // EMI table
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  emiId: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
    unique: true,
  })
  uniqueId: string;
}
