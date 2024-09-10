import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { employmentType } from './employment.type';
import { employmentSector } from './sector.entity';
import { registeredUsers } from './user.entity';
import { employmentDesignation } from './designation.entity';
import { admin } from './admin.entity';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { SalarySlipEntity } from './salarySlip.entity';

@Table({})
export class EmploymentHistoryDetailsEntity extends Model<EmploymentHistoryDetailsEntity> {
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

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  companyName: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    comment: '0 for comapny Found in google 1 for Manual Verification.',
    allowNull: true,
  })
  companyStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyPhone: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyAddress: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '3'],
    comment:
      '0 for pending 1 for accepted(auto) 2 for rejected 3 for Accept(Admin) .',
    allowNull: false,
  })
  companyVerification: string;

  @Column({
    type: DataType.TEXT,
    comment: 'JSON.stringify',
    allowNull: true,
  })
  salarySlip1Response: string;

  @ForeignKey(() => employmentSector)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sectorId: number;

  @ForeignKey(() => employmentDesignation)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  designationId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endDate: any;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  salary: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  salaryDate: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  workEmail: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    comment: '0 for same domain 1 for Manual Verification.',
    allowNull: true,
  })
  workEmailDomain: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  otp: string;
  @Column({
    type: DataType.ENUM,
    values: ['-1', '0', '1', '2', '3'],
    defaultValue: '-1',
    comment:
      '-1 for not verified by user, 0 for pending 1 for done(Auto) 2 for reject 3 for Accept(admin).',
    allowNull: true,
  })
  emailStatusVerified: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  companyStatusApproveById: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  companyStatusApproveByName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  tempWorkEmail: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  tempOtp: string;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    validate: {
      isIn: [['-1', '0', '1', '2']],
    },
  })
  tempEmailStatusVerified: string;

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
  companyAddressLatLong: string[];

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  pinAddressLatLong: string[];

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  emailCode: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    validate: {
      isIn: [['0', '1', '2']],
    },
  })
  codeStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  codeStatusDate: string;

  @ForeignKey(() => employmentType)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  employmentTypeId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  commision: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  emailStatusVerifiedDate: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: '-1',
  })
  salaryStatus: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  salaryVerifiedDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'SalarySlip1',
  })
  salarySlip1: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'SalarySlip1 Password',
  })
  salarySlip1Password: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Work Email verification type: 0=Email,1=Slip',
  })
  emailVerificationType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'city',
  })
  city: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'pincode',
  })
  pincode: string;

  @BelongsTo(() => employmentType, {
    foreignKey: 'employmentTypeId',
    targetKey: 'id',
    constraints: false,
  })
  employementTypeData: employmentType;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => employmentSector, {
    foreignKey: 'sectorId',
    targetKey: 'id',
    constraints: false,
  })
  sector: employmentSector;

  @BelongsTo(() => employmentDesignation, {
    foreignKey: 'designationId',
    targetKey: 'id',
    constraints: false,
  })
  designation: employmentDesignation;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  workEmailApproveByName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  rejectReason: string;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  salarySlipRejectReason: string;
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  salarySlipApproveByName: string;
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  salarySlipApproveById: number;

  @ForeignKey(() => SalarySlipEntity)
  @Column({ type: DataType.INTEGER, allowNull: true })
  salarySlipId: number;

  @BelongsTo(() => SalarySlipEntity)
  salarySlip: SalarySlipEntity;

  @Column({ type: DataType.STRING, allowNull: true })
  type: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  otherInfo: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'updated company name',
  })
  updatedCompanyName: string;

   //admin id of one who change company Name
   @Column({
    allowNull: true,
    type: DataType.SMALLINT,
  })
  companyNameChangeBy: number;
}
