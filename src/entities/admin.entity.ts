// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Department } from './department.entity';
import { EnvConfig } from 'src/configs/env.config';

@Table({})
export class admin extends Model<admin> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  fullName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  jwtDetails: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  roleId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  email: string;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phone: string;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '0000' })
  otp: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '0 fo pending 1 for done.',
  })
  phoneStatusVerified: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '0 fo pending 1 for done.',
  })
  emailStatusVerified: string;

  @Column({ type: DataType.STRING, allowNull: true })
  password: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '0 fo Not Active 1 for Active.',
  })
  isActive: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: true,
    comment: 'true:is super admin,false for normal',
  })
  isLendingSuperAdmin: boolean;
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  passwordExpireDate: any;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  collection: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  lending: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  waiveOff: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  changeableData: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  failedAutoDebit: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  thirdPartyViews: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  legalTeamView: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  changeLoanDetails: boolean;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  departmentId: number;

  @BelongsTo(() => Department, {
    foreignKey: 'departmentId',
    targetKey: 'id',
    constraints: false,
  })
  departmentData: Department;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  customerSupport: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  userBlock: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  paymentUpdate: boolean;

  @Column({
    type: DataType.ENUM,
    values: [EnvConfig.nbfc.nbfcShortName],
    allowNull: true,
  })
  nbfcType: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isRefund: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lastPasswordUpdatedDate: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  staticOtp: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoginDate: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyPhone: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
    defaultValue: [],
  })
  recentPassword: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      address: '',
      case_per: 0,
      enrollmentNo: 0,
      signature_image: '',
      eligibleForDPD1: false,
    },
  })
  otherData: {
    address: string;
    case_per: number;
    eligibleForDPD1: boolean;
    enrollmentNo: number;
    signature_image: string;
  };

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '0 for Not Login 1 for Login.',
  })
  isLogin: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  wrongOtpCount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastOtpAttemptTime: any;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  })
  latestRBIGuideline: boolean;
}
