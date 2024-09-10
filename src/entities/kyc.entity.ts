// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DBService } from 'src/utils/db.service';
import { admin } from './admin.entity';
import { registeredUsers } from './user.entity';

const defaultScope: any = {
  attributes: {
    include: DBService.encryptAttributes([
      'aadhaarNumber',
      'aadhaarFront',
      'aadhaarBack',
      'panCardNumber',
      'pan',
      'otherDocFront',
      'otherDocBack',
      'profileImage',
      'aadhaarDoc',
    ]),
  },
};

@Table({ defaultScope })
export class KYCEntity extends Model<KYCEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  maskedAadhaar: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '-1',
  })
  aadhaarStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarFront: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarBack: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  aadhaarDOB: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarAddress: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarAddressResponse: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  aadhaarLatLong: string;

  @Column({
    type: 'point',
    allowNull: true,
  })
  aadhaarLatLongPoint: any;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  aadhaarVerifiedAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'aadhaarVerifiedAdmin',
    targetKey: 'id',
    constraints: false,
  })
  aadhaarVerifiedAdminData: admin;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  aadhaarRejectReason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarResponse: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
  })
  aadhaarState: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  eligibilityDetails: {};

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarDoc: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  aadhaarPassword: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  maskedPan: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  panCardNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pan: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '-1',
  })
  panStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  panResponse: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  panRejectReason: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  panVerifiedAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'panVerifiedAdmin',
    targetKey: 'id',
    constraints: false,
  })
  panVerifiedAdminData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  panUploadedAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'panUploadedAdmin',
    targetKey: 'id',
    constraints: false,
  })
  panUploadedAdminData: admin;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  otherDocType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otherDocFront: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otherDocBack: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '-1',
  })
  otherDocStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otherDocResponse: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otherDocRejectReason: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  kycCompletionDate: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  kyc_mode: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  nameSimilarity: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  otherDocVerifiedAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'otherDocVerifiedAdmin',
    targetKey: 'id',
    constraints: false,
  })
  otherDocVerifiedAdminData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  otherDocUploadedAdmin: number;

  @BelongsTo(() => admin, {
    foreignKey: 'otherDocUploadedAdmin',
    targetKey: 'id',
    constraints: false,
  })
  otherDocUploadedAdminData: admin;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  profileImage: string;

  @Column({
    type: DataType.STRING(8),
    allowNull: true,
  })
  pincode: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { count: 0, lastAttemptOn: null },
  })
  attemptData: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  aadhaarNo: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  customerRefId: number;
}
