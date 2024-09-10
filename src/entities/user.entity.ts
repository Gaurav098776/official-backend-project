// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  HasOne,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { EmiEntity } from './emi.entity';
import { employmentDetails } from './employment.entity';
import { loanTransaction } from './loan.entity';
import { device } from './device.entity';
import { LocationEntity } from './location.entity';
import { GLOBAL_RANGES } from 'src/constants/globals';
import { KYCEntity } from './kyc.entity';
import { AddressesEntity } from './addresses.entity';
import { UserSelfieEntity } from './user.selfie.entity';
import { admin } from './admin.entity';
import { EmploymentHistoryDetailsEntity } from './employment.history.entity';
import { crmActivity } from './crm.entity';
import { MasterEntity } from './master.entity';
import { AAEntity } from './aggregator.entity';
import { ReferralEntity } from './referral.entity';
import { CibilScoreEntity } from './cibil.score.entity';
import { SalarySlipEntity } from './salarySlip.entity';

@Table({})
export class registeredUsers extends Model<registeredUsers> {
  @Column({
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    type: DataType.UUID,
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fullName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  panName: string;

  @Column({
    type: DataType.ENUM,
    values: ['Male', 'Female', 'MALE', 'FEMALE'],
    allowNull: true,
  })
  gender: string;

  @Column({
    type: DataType.ENUM,
    values: ['MALE', 'FEMALE', 'OTHER'],
    allowNull: true,
  })
  userSelectedGender: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  email: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    unique: true,
  })
  phone: string;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  communicationLanguage: number; // 1:English 2:Hindi

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otp: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  token: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  pin: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fcmToken: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  recentDeviceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  webFcmToken: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  webRecentDeviceId: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  typeOfDevice: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  residenceAddress: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment:
      '0=Document not Verified,1=Document Verified,2=Document Rejected,3 = Admin Verified, 4 = Skip address',
    defaultValue: '-1',
    validate: { isIn: [['-1', '0', '1', '2', '3', '4', '5', '6']] },
  })
  homeStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  homeProofImage: string;

  @Column({
    type: DataType.TEXT,
    comment: '0=PG,1=Electricity Bill,2=Rent,3=adhar4=drivinglicense',
    allowNull: true,
    validate: {
      isIn: [['0', '1', '2', '3', '4', '5']],
    },
  })
  homeProofType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pinAddress: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  typeAddress: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  pinAddresslatLong: string[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  completedLoans: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  residenceProofApproveByName: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  uniqueAadhaarId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: '0',
    values: ['0', '1', '2'],
  })
  isBlacklist: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '0->Not Deleted, 1->Deleted, 2->Relogin and till submitemployment',
  })
  isDeleted: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '0->No, 1->Yes',
  })
  isCibilConsent: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '0->NO, 1->YES',
  })
  maybeGoodCibil: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '0->NO, 1->YES',
  })
  politicallyExposed: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  residenceRejectReason: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'city',
  })
  city: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: '0=Not Enough,1=Enough 2=Rejected',
  })
  quantity_status: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalContact: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  contactRejectReason: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  eligibleForPromoCode: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  contactApproveBy: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  contactApprovedId: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  residenceAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'residenceAdminId',
    targetKey: 'id',
    constraints: false,
  })
  residenceAdminData: admin;

  @BelongsTo(() => admin, {
    foreignKey: 'contactApprovedId',
    targetKey: 'id',
    constraints: false,
  })
  contactAdminData: admin;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isInterested: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  NextDateForApply: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: GLOBAL_RANGES.MAX_PER_DAY_INTEREST_RATE,
  })
  interestRate: number;

  @HasMany(() => CibilScoreEntity)
  cibilList: CibilScoreEntity[];

  @HasMany(() => EmiEntity)
  emiData: EmiEntity[];

  @HasOne(() => employmentDetails)
  employmentData: employmentDetails;

  @HasMany(() => EmploymentHistoryDetailsEntity)
  employementHistoryData: EmploymentHistoryDetailsEntity[];

  @HasMany(() => loanTransaction)
  loanData: loanTransaction[];

  @HasMany(() => device)
  deviceData: device[];

  @HasMany(() => LocationEntity)
  locationData: LocationEntity[];

  @HasMany(() => SalarySlipEntity)
  salaryData: SalarySlipEntity[];

  @HasMany(() => AddressesEntity)
  addressData: AddressesEntity[];

  @HasMany(() => crmActivity)
  crmList: crmActivity[];

  @HasMany(() => AAEntity)
  aaList: AAEntity[];

  @ForeignKey(() => KYCEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  kycId: number;

  @BelongsTo(() => KYCEntity)
  kycData: KYCEntity;

  @ForeignKey(() => UserSelfieEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  selfieId: number;

  @BelongsTo(() => UserSelfieEntity)
  selfieData: UserSelfieEntity;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  homeType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  state: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isInterestedInLoan: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isInterestedInGold: boolean;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  assignTo: number;

  @Column({ type: DataType.STRING, allowNull: true })
  isUnInstallApp: string;

  @Column({ type: DataType.STRING, allowNull: true })
  lastOnlineTime: string;

  @Column({ type: DataType.STRING, allowNull: true })
  mostFrequentHour: string;

  @Column({ type: DataType.STRING, allowNull: true })
  mostFrequentDay: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  defaulterContactCount: number;

  @BelongsTo(() => admin)
  assingedAdmin: admin;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  augmont_id: string;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  goldGrms: number;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  silverGrms: number;
  @Column({ type: DataType.INTEGER, allowNull: true })
  defaulterCount: number;

  // Master data relation
  @ForeignKey(() => MasterEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  masterId: number;

  @BelongsTo(() => MasterEntity)
  masterData: MasterEntity;

  @Column({ type: DataType.STRING, allowNull: true })
  appsFlyerId: string;

  @Column({ type: DataType.SMALLINT, allowNull: true })
  stage: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: -1,
    comment: '-1 -> User side pending, 0 -> Admin side pending',
  })
  stageStatus: number;

  @Column({ type: DataType.DATE, allowNull: true })
  stageTime: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  lastCrm: any;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '1 -> Ontime, 2 ->  Delayed, 3 -> Defaulter',
    defaultValue: 0,
  })
  loanStatus: number;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    defaultValue: [],
  })
  otherPhone: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    defaultValue: [],
  })
  otherEmail: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    defaultValue: [],
  })
  allPhone: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    defaultValue: [],
  })
  allEmail: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  addedBy: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  referralCode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  referredBy: string;

  @ForeignKey(() => ReferralEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  referralId: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  referralPoints: number;

  @Column({
    comment: '0-> NORMAL,1-> INITIALIZED,2-> START PROCESS, 3-> END PROCESS',
    defaultValue: 0,
    type: DataType.SMALLINT,
  })
  isRedProfile: number;

  @Column({ type: DataType.INTEGER, allowNull: true, comment: 'Last loan' })
  lastLoanId: number;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: false })
  referralSkip: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Lead ID generated through CRM',
  })
  leadId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'currently active CRM',
  })
  selectedCRM: string;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
    comment: '0->LSP, 1->NBFC1',
  })
  appType: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  jwtToken: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0 -> No, 1 ->  Yes',
  })
  isSalaried: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '1 -> NEFT, 2 ->  IMPS, 3 -> CASH',
  })
  salaryMode: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emailToken: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment:
      '1 -> TOKEN, 2 -> OTP, 3 -> Auto verify via existing logged in popup',
  })
  emailVerificationType: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  verificationEmailSendDate: Date;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
  })
  installAppCount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  gmvAmount: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  lspId: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastPasscodeSetAt: Date;

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
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true,
  })
  uniqueId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  categoryScore: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  hashPhone: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  pinCrm: any;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  bioMetric: boolean;

  @Column({
    allowNull: true,
    defaultValue: {},
    type: DataType.JSONB,
  })
  aaAttempts: any;
}
