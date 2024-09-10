// Imports
import { Table, Column, Model, DataType } from 'sequelize-typescript';
import { EnvConfig } from 'src/configs/env.config';
@Table({})
export class Configuration extends Model<Configuration> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  approvalMode: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  cameraRegisterMode: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  KYCRoute: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  thirdPartyApi: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  thirdPartyApiReason: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  emailDomain: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  chatbotData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  androidVersion: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  iosVersion: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  androidForcefully: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  iosForcefully: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netBankingUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emandateKey: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  getEmandateStatusUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  esignKey: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  getEsignStatusUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  esignReturnUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emandateReturnUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  KYCRouteReason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  maleInterestRate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  femaleInterestRate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  rzpKeyId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  rzpKeySecret: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emandateApplicationId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  esignApplicationId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  infoKeep: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  maxRadius: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  cityFilter: boolean;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    defaultValue: [],
  })
  eligibleCities: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  upiEnable: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: EnvConfig.nbfc.nbfcShortName,
  })
  upiReceiver: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'Q082448450@ybl',
  })
  merchentUPIId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  advertiseURL: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  bankingProAppID: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  bankingProKeySecret: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isRazorpay: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  cashFreeService: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  stuckContactUsFlow: boolean;
}
