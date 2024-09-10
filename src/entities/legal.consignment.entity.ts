import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { LegalNoticeEntity } from './notice.entity';
import { admin } from './admin.entity';
import { LegalCollectionEntity } from './legal.collection.entity';

@Table({})
export class LegalConsigment extends Model<LegalConsigment> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => LegalNoticeEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalId: number;
  @ForeignKey(() => LegalCollectionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalCollectionId: number;
  @BelongsTo(() => LegalNoticeEntity)
  legalnoticeData: LegalNoticeEntity;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  consignmentNo: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  legalNoticeTrackResponse: string;

  @Column({
    type: DataType.ENUM,
    values: ['Initiate', 'Sent', 'Process', 'Return', 'Complete', 'Block'],
    defaultValue: 'Initiate',
  })
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastResponseDate: Date;

  @Column({
    type: DataType.ENUM,
    values: [
      'RESIDENCE',
      'BANK',
      'AADHAAR',
      'RENT',
      'DRIVING_LICENCE',
      'PG',
      'OFFICE',
      'BILLING',
      'OTHER',
    ],
    defaultValue: 'RESIDENCE',
  })
  addressType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  manualAddress: string;
  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  createdBy: number;
  @BelongsTo(() => admin)
  createdData: admin;
}
