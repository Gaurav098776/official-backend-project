import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';

@Table({})
export class ipMasterEntity extends Model<ipMasterEntity> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  ip: string;

  @Column({
    type: DataType.SMALLINT,
    comment: '0 - res pending, 1 - ip res successfully fetched',
    allowNull: true,
  })
  status: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.SMALLINT,
    comment: '0 - false, 1 - true',
    allowNull: true,
  })
  isBlacklist: number;

  //admin id of one who updated last
  @Column({
    allowNull: true,
    defaultValue: SYSTEM_ADMIN_ID,
    type: DataType.SMALLINT,
  })
  lastUpdatedBy: number;

  @Column({
    type: DataType.SMALLINT,
    comment: '0 - false, 1 - true',
    allowNull: true,
  })
  isSecurityIssue: number;
}
