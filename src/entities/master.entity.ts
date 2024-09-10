// Imports
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  HasOne,
  BelongsTo,
} from 'sequelize-typescript';
import { employmentDetails } from './employment.entity';
import { loanTransaction } from './loan.entity';
import { SalarySlipEntity } from './salarySlip.entity';
import { WorkMailEntity } from './workMail.entity';
import { admin } from './admin.entity';
import { registeredUsers } from './user.entity';
import { GLOBAL_FLOW } from 'src/constants/globals';

@Table({})
export class MasterEntity extends Model<MasterEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      // -1 indicates pending from user
      phone: -1,
      permission: -1,
      selfie: -1,
      email: -1,
      contact: -1,
      pan: -1,
      basic: -1,
      personal: -1,
      professional: -1,
      pin: -1,
      aadhaar: -1,
      company: -1,
      workMail: -1,
      salarySlip: -1,
      bank: -1,
      residence: GLOBAL_FLOW.RESIDENCE_IN_APP ? -1 : 8,
      // -2 indicates loan is not started yet
      loan: -2,
      // reference 4 indicates automation for contact reference
      reference: -1,
      eMandate: -1,
      eSign: -1,
      disbursement: -1,
      // -2 indicates repayment is not started yet
      repayment: -2,
    },
  })
  status: {
    phone: number;
    permission: number;
    selfie: number;
    email: number;
    contact: number;
    pan: number;
    basic: number;
    personal: number;
    professional: number;
    pin: number;
    aadhaar: number;
    company: number;
    workMail: number;
    salarySlip: number;
    bank: number;
    residence: number;
    loan: number;
    reference: number;
    eMandate: number;
    eSign: number;
    disbursement: number;
    repayment: number;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      registration: 0,
      basicDetails: 0,
      professionalDetails: 0,
      aadhaar: 0,
      selfie: 0,
      employment: 0,
      banking: 0,
      residence: 0,
      eligibility: 0,
      eMandate: 0,
      eSign: 0,
      disbursement: 0,
    },
  })
  dates: {
    registration: number;
    basicDetails: number;
    professionalDetails: number;
    aadhaar: number;
    selfie: number;
    employment: number;
    banking: number;
    residence: number;
    eligibility: number;
    eMandate: number;
    eSign: number;
    disbursement: number;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      aadhaar: '',
      pan: '',
      company: '',
      workMail: '',
      salarySlip: '',
      banking: '',
      residence: '',
      eligibility: '',
      eMandate: '',
      eSign: '',
      disbursement: '',
    },
  })
  rejection: {
    aadhaar: string;
    pan: string;
    company: string;
    workMail: string;
    salarySlip: string;
    banking: string;
    residence: string;
    eligibility: string;
    eMandate: string;
    eSign: string;
    disbursement: string;
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { purposeName: '', purposeId: 0 },
  })
  miscData: { purposeName: string; purposeId: number };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: { count: 0, coolOffEndsOn: '', coolOffStartedOn: '' },
  })
  coolOffData: {
    count: number;
    coolOffEndsOn: string;
    coolOffStartedOn: '';
  };

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      maritalInfo: '',
      spouseName: '',
      motherName: '',
      dependents: 0,
      vehicleInfo: [],
      educationInfo: '',
      residentialInfo: '',
      employmentInfo: '',
      salaryInfo: 0,
    },
  })
  otherInfo: {
    maritalInfo: string;
    spouseName: string;
    motherName: string;
    dependents: number;
    vehicleInfo: string[];
    educationInfo: string;
    residentialInfo: string;
    employmentInfo: string;
    salaryInfo: number;
  };

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  userId: string;

  @HasOne(() => registeredUsers, { sourceKey: 'userId', foreignKey: 'id' })
  userData: registeredUsers;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    unique: true,
  })
  loanId: number;

  @HasOne(() => loanTransaction, { sourceKey: 'loanId', foreignKey: 'id' })
  loanData: loanTransaction;

  @ForeignKey(() => employmentDetails)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  empId: number;

  @HasOne(() => employmentDetails, { sourceKey: 'empId', foreignKey: 'id' })
  empData: employmentDetails;

  @ForeignKey(() => WorkMailEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  workMailId: number;

  @HasOne(() => WorkMailEntity, { sourceKey: 'workMailId', foreignKey: 'id' })
  workMailData: WorkMailEntity;

  @ForeignKey(() => SalarySlipEntity)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  salarySlipId: number;

  @HasOne(() => SalarySlipEntity, {
    sourceKey: 'salarySlipId',
    foreignKey: 'id',
  })
  salarySlipData: SalarySlipEntity;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  companyAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'companyAdminId',
    targetKey: 'id',
    constraints: false,
  })
  companyAdminData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  salarySlipAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'salarySlipAdminId',
    targetKey: 'id',
    constraints: false,
  })
  salaryAdminData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  workMailAdminId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'workMailAdminId',
    targetKey: 'id',
    constraints: false,
  })
  workMailAdminData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  bankAssingId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'bankAssingId',
    targetKey: 'id',
    constraints: false,
  })
  bankAssignData: admin;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanAssingId: number;

  @BelongsTo(() => admin, {
    foreignKey: 'loanAssingId',
    targetKey: 'id',
    constraints: false,
  })
  loanAssignData: admin;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  expressReapply: boolean;
  
  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  assignedCSE: number;

  @BelongsTo(() => admin, {
    foreignKey: 'assignedCSE',
    targetKey: 'id',
    constraints: false,
  })
  cseAssignData: admin;
  
  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  loanAcceptStatus: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
  })
  kfsStatus: number;

  @Column({ type: DataType.DATE, allowNull: true })
  kfsAcceptDate: Date;
}

/// loan status
// -2 loan not yet started
// -1 loan in process
// 0 manual
// 1 auto
// 2 rejected
// 3 manual accept
// 4 at reference selection
// 5 all submited cron will check automation aapde je vat thai e
// 6 loan active
// 7 loan completed
