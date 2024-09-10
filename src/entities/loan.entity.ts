// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { TEXT } from 'sequelize';
import { EmiEntity } from './emi.entity';
import { registeredUsers } from './user.entity';
import { mandateEntity } from './mandate.entity';
import { esignEntity } from './esign.entity';
import { disbursementEntity } from './disbursement.entity';
import { loanPurpose } from './loan.purpose.entity';
import { employmentDetails } from './employment.entity';
import { userLoanDecline } from './loan.decline.entity';
import { BankingEntity } from './banking.entity';
import { admin } from './admin.entity';
import { SubScriptionEntity } from './subscription.entity';
import { TransactionEntity } from './transaction.entity';
import { PredictionEntity } from './prediction.entity';
import { GLOBAL_CHARGES } from 'src/constants/globals';
import { LegalNoticeEntity } from './notice.entity';
import { crmActivity } from './crm.entity';
import { MasterEntity } from './master.entity';
import { LegalCollectionEntity } from './legal.collection.entity';
import { InsuranceEntity } from './insurance.entity';
import { AAEntity } from './aggregator.entity';
import { CibilScoreEntity } from './cibil.score.entity';
import { GoogleCompanyResultEntity } from './company.entity';

@Table({})
export class loanTransaction extends Model<loanTransaction> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @ForeignKey(() => employmentDetails)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  empId: number;

  @ForeignKey(() => loanPurpose)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  purposeId: number;

  @ForeignKey(() => userLoanDecline)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declineId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Reason of user for declining loan',
  })
  userReasonDecline: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Eligible MAX Loan Amount',
  })
  loanAmount: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  interestRate: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '3', '4'],
    defaultValue: '0',
    allowNull: false,
  })
  durationType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  duration: string;

  @Column({
    type: DataType.ENUM,
    defaultValue: 'InProcess',
    values: ['InProcess', 'Accepted', 'Active', 'Rejected', 'Complete'],
    allowNull: false,
  })
  loanStatus: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment:
      '0->None, 1->Manual Bypass, 2->Loan Declined, 3->Regular Flow, 4->Error',
  })
  cibilSystemFlag: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  dueDate: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  score: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Admin Approved Loan Amount',
  })
  approvedLoanAmount: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  approvedDuration: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  TotalRepayAmount: string;

  @Column({
    type: DataType.ARRAY(TEXT),
    allowNull: true,
  })
  softApproval: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  loanFees: number;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: true,
  })
  workEmailStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otp: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loanRejectReason: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  netScore: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'User selected Loan Amount(actual loan amount)',
  })
  netApprovedAmount: string;

  @Column({
    type: DataType.ARRAY(TEXT),
    allowNull: true,
  })
  netEmiData: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netSoftApproval: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment:
      '0=Loan Not Disbursed, 1=Loan Disbursed,2=Loan Disbursement Initialized',
  })
  loan_disbursement: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loan_disbursement_date: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  perday: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  repaidAmount: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      gst_per: 0,
      gst_amt: 0,
      sgst_amt: 0,
      cgst_amt: 0,
      doc_charge_per: 0,
      insurance_fee: 0,
      risk_assessment_per: 0,
      risk_assessment_charge: 0,
    },
  })
  charges: {
    gst_per: number;
    gst_amt: number;
    sgst_amt: number;
    cgst_amt: number;
    doc_charge_per: number;
    doc_charge_amt: number;
    insurance_fee: number;
    risk_assessment_per: number;
    risk_assessment_charge: number;
  };

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fullRepaidDone: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0->Disable, 1->Enable',
  })
  isPartPayment: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON.stringify softApprovalData',
  })
  softApprovalData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON.stringify netApprovalData',
  })
  netApprovalData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loanRejectDate: string;

  @ForeignKey(() => mandateEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  mandate_id: number;

  @ForeignKey(() => esignEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  esign_id: number;

  @HasOne(() => esignEntity)
  eSignData: esignEntity;

  @ForeignKey(() => disbursementEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loan_disbursement_id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  stampFees: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalScore: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  applicationGrade: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netbankingGrade: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    values: ['0', '1', '2'],
    comment: '0=pending, 1=Accepted,2=Rejected',
  })
  softApprovalFlag: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  activeDeviceId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  remark: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  adminName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loanRejectBy: string;

  // id of admin who enabled partpay for user
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  partPayEnabledBy: number;

  @BelongsTo(() => loanPurpose, {
    foreignKey: 'purposeId',
    targetKey: 'id',
    constraints: false,
  })
  purpose: loanPurpose;

  @BelongsTo(() => userLoanDecline, {
    foreignKey: 'declineId',
    targetKey: 'id',
    constraints: false,
  })
  userDecline: userLoanDecline;

  @BelongsTo(() => employmentDetails, {
    foreignKey: 'empId',
    targetKey: 'id',
    constraints: false,
  })
  employment: employmentDetails;

  @BelongsTo(() => registeredUsers, {
    foreignKey: 'userId',
    targetKey: 'id',
    constraints: false,
  })
  registeredUsers: registeredUsers;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    defaultValue: '-1',
    values: ['-1', '0', '1', '2', '3', '5'],
  })
  manualVerification: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  verifiedDate: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  manualVerificationAcceptId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  manualVerificationAcceptName: string;

  @Column({
    type: DataType.TEXT,
    unique: true,
    allowNull: true,
  })
  uniqueId: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: GLOBAL_CHARGES.PROCESSING_FEES,
  })
  processingFees: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  prediction: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    unique: true,
  })
  accId: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_principal: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_interest: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  paid_penalty: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_principal: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_interest: number;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  waived_penalty: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  followerId: number;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  advocateId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'advocateId',
    targetKey: 'id',
    constraints: false,
  })
  advocateData: admin;

  @BelongsTo(() => admin, {
    foreignKey: 'followerId',
    targetKey: 'id',
    constraints: false,
  })
  followerData: admin;

  @BelongsTo(() => admin, {
    foreignKey: 'manualVerificationAcceptId',
    targetKey: 'id',
    constraints: false,
  })
  adminData: admin;

  @ForeignKey(() => BankingEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  bankingId: number;

  @BelongsTo(() => BankingEntity)
  bankingData: BankingEntity;

  @ForeignKey(() => SubScriptionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  subscriptionId: number;

  @BelongsTo(() => SubScriptionEntity)
  subscriptionData: SubScriptionEntity;

  @ForeignKey(() => PredictionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  predictionId: number;

  @BelongsTo(() => PredictionEntity)
  predictionData: PredictionEntity;

  @HasMany(() => disbursementEntity)
  disbursementData: disbursementEntity[];

  @HasMany(() => EmiEntity)
  emiData: EmiEntity[];

  @HasMany(() => crmActivity)
  crmList: crmActivity[];

  @HasMany(() => mandateEntity)
  mandateData: mandateEntity[];

  @HasMany(() => TransactionEntity)
  transactionData: TransactionEntity[];

  @HasMany(() => LegalNoticeEntity)
  legalList: LegalNoticeEntity[];

  @ForeignKey(() => LegalCollectionEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalId: number;
  @BelongsTo(() => LegalCollectionEntity, {
    foreignKey: 'legalId',
    targetKey: 'id',
    constraints: false,
  })
  legalData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  nocSentBy: number;

  @BelongsTo(() => admin, {
    foreignKey: 'nocSentBy',
    targetKey: 'id',
    constraints: false,
  })
  nocSentByAdminData: admin;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
  })
  noticePeriodStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loanPurpose: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  assignTo: number;

  @BelongsTo(() => admin, {
    foreignKey: 'assignTo',
    targetKey: 'id',
    constraints: false,
  })
  assignToData: admin;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  isNpa: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lastStage: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  completedLoan: number;

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  mandateAttempts: number;

  @ForeignKey(() => MasterEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  masterId: number;

  @BelongsTo(() => MasterEntity)
  masterData: MasterEntity;

  @Column({ type: DataType.TEXT, allowNull: true })
  nocURL: string;

  @Column({
    type: DataType.ENUM,
    allowNull: true,
    values: [
      'YET_TO_FILED',
      'IN_PROGRESS',
      'CASE_FILED',
      'WITHDRAWN',
      'ASSIGN_BACK',
    ],
  })
  suitFiledStatus: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  yetToFiledFrom: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  crNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  crReason: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  ccNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  courtNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  courtName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  complainant: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  advocate: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  legalInfo: any;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  legalType: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  nomineeDetail: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      planAPremium: 0,
      planBPremium: 0,
      totalPremium: 0,
      planBSumInsured: 0,
      status: 'yet_to_processed',
    },
  })
  insuranceDetails: any;

  @ForeignKey(() => InsuranceEntity)
  @Column({ type: DataType.INTEGER, allowNull: true })
  insuranceId: number;

  // Verified salary date
  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  salaryVerifiedAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'salaryVerifiedAdminId',
    targetKey: 'id',
    constraints: false,
  })
  salaryVerifiedAdminData: admin;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  verifiedSalaryDate: any;

  // One to many relations
  @HasMany(() => AAEntity)
  aaList: AAEntity[];

  @BelongsTo(() => InsuranceEntity, {
    foreignKey: 'insuranceId',
    targetKey: 'id',
    constraints: false,
  })
  insuranceData: InsuranceEntity;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      eligibleEmiDates: [],
      selectedOn: 0,
      selectedEmiDate: null,
    },
  })
  emiSelection: any;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: null })
  qualityParameters: any;

  @Column({ type: DataType.SMALLINT, allowNull: true, defaultValue: null })
  qualityScore: number;

  // Date of event -> when system checked the total principal amount before closing the loan
  @Column({ type: DataType.DATE, allowNull: true, defaultValue: null })
  check_total_principal_paid_date: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  loanCompletionDate: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  lastPayDate: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  nextPayDate: string;

  @Column({ type: DataType.TEXT, allowNull: true, defaultValue: '' })
  directorName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: '',
  })
  userCompanyPhone: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netPaySalary: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  approvedReason: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  insuranceOptValue: boolean;

  @Column({ type: DataType.TEXT, allowNull: true, defaultValue: null })
  check_emi_creation_date: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  promoCodeSentCount: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: 0,
    comment: '1->Yes, 0-No',
  })
  isNotBalanced: number;

  @Column({
    type: DataType.SMALLINT,
    defaultValue: 0,
    comment: '1->NBFC1, 0->LSP',
  })
  appType: number;

  @Column({
    allowNull: true,
    type: DataType.JSONB,
    defaultValue: {},
  })
  calculationDetails: {
    EMI_AMOUNT_CREATION: string;
    MAX_LOAN_TENURE_IN_DAYS: number;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  chargesDetails: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  eligibilityDetails: {
    isEligible: boolean;
  };

  @ForeignKey(() => CibilScoreEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  cibilId: number;

  @BelongsTo(() => CibilScoreEntity, {
    foreignKey: 'cibilId',
    targetKey: 'id',
    constraints: false,
  })
  cibilData: admin;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  feesIncome: number;

  @ForeignKey(() => GoogleCompanyResultEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  companyId: number;

  @BelongsTo(() => GoogleCompanyResultEntity, {
    foreignKey: 'companyId',
    targetKey: 'id',
    constraints: false,
  })
  companyIdData: GoogleCompanyResultEntity;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  loanGmv: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  penaltyCharges: any;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0->Low Risk, 1->Moderate risk, 2->High Risk, 3->Premium Risk',
  })
  categoryTag: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  loanAcceptStatus: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '0->Low Risk, 1->Moderate risk, 2->High Risk',
  })
  cibilBatchCategory: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  kfsStatus: number;

  @Column({ type: DataType.STRING, allowNull: true })
  Loss_assets: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  currentAccountBalance: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  balanceFetchDate: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  initialTypeOfDevice: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0=Android 1=iOS 2=Web',
    allowNull: true,
  })
  finalTypeOfDevice: string;
  
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  settlementMailCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanClosureMailCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanClosureEnabledBy: number;
  
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanSettlementEnabledBy: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isLoanClosure: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isLoanSettled: boolean;
}
