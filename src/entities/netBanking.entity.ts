import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table
export class userNetBankingDetails extends Model<userNetBankingDetails> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  loanId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  accountHolderName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  accountNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  accountType: string;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
    comment: '[1]=User Name,[2]=Bank Name,[3]=Account Number',
  })
  accountDetails: Array<string>;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    comment: '0=Basic Login, 1=PDF based Login',
    allowNull: true,
  })
  loginType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  accountUID: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankStatement: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.TEXT,
    comment: '0=Salary Not Eligible, 1=Salary Eligible',
    allowNull: true,
    validate: {
      isIn: [['0', '1']],
    },
  })
  Is_salary: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankAccountHolderName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankAccountNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankAccountUID: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankAccountIFSCode: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netBankingScoreData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  netBankingSummaryData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fraudReport: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment:
      '0=Upload Pending, 1=Accepted Auto, 2=Rejected, 3=Accepted By Admin, 4=Pending(Admin)',
  })
  salaryVerification: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  attempts: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  manualBankStatement: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  adminVerifiedSalary: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: '0=Admin has not verified, 1=Admin has verified',
    validate: {
      isIn: [['0', '1']],
    },
    defaultValue: '0',
  })
  adminSalaryVerified: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminVerifiedSalaryDate: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: '0=Admin has not verified, 1=Admin has verified',
    validate: {
      isIn: [['0', '1']],
    },
    defaultValue: '0',
  })
  adminSalaryDateVerified: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  adminChangedBank: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'We have found this salary.',
  })
  manualSalary: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'We have found this salary date',
  })
  manualSalaryDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Salary Verification date',
  })
  salaryVerifiedDate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  readonly availableBalance: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  readonly bank: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Transactions',
  })
  transactionData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  userNetBankingApproveBy: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bankStatementRejectReason: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  fraudDetected: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalAccount: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  isNeedAdditionalAccount: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalAccountHolderName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalAccountDetails: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalBank: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalNetBankingScoreData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalNetBankingSummaryData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Transactions',
  })
  additionalTransactionData: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalFilePath: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalIFSCode: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  useAdditionalAsPrimary: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  additionalAccountType: string;

  @Column({
    type: DataType.ENUM,
    values: [
      'SALARY_VERIFIED_NEED_TRUE',
      'SALARY_NOT_VERIFIED_NEED_FALSE',
      'SALARY_NOT_VERIFIED_NEED_TRUE',
      'BY_PASS',
    ],
    allowNull: true,
  })
  status: string;
}
