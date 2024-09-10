// Imports
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table({})
export class BankList extends Model<BankList> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  bankName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  systemBankName: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  bankCode: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: false,
    comment: '0->Deactive, 1->Active',
  })
  statusFlag: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.TEXT,
    comment: '0=disable,1=enable',
    allowNull: true,
    validate: {
      isIn: [['0', '1']],
    },
  })
  netBankingService: string;

  @Column({
    type: DataType.TEXT,
    comment: '0=disable,1=finbit,2=litt',
    allowNull: true,
    validate: {
      isIn: [['0', '1', '2']],
    },
  })
  pdfService: string;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '0->CAMS, 1->ONEMONEY, 2->FINVU',
  })
  aaService: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    defaultValue: 0,
    comment: '-1 -> Disabled 0 -> CAMS, 1 -> ONEMONEY, 2 -> FINVU',
  })
  aaMode: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fipName: string;

  // In-house netbanking flow with webview in mobile app (flutter)
  @Column({
    allowNull: true,
    comment: 'true -> Enabled, false -> Disabled',
    defaultValue: false,
    type: DataType.BOOLEAN,
  })
  inAppService: boolean;

  //admin id of one who updated last
  @Column({
    allowNull: true,
    defaultValue: SYSTEM_ADMIN_ID,
    type: DataType.SMALLINT,
  })
  lastUpdatedBy: number;

  // In-house statement upload flow with banking pro
  @Column({
    allowNull: true,
    comment: 'true -> Enabled, false -> Disabled',
    defaultValue: false,
    type: DataType.BOOLEAN,
  })
  statementService: boolean;

  // Data for custom web page for bank selection for account aggregator
  @Column({
    allowNull: true,
    defaultValue: {
      fipId: '',
      fipName: '',
      logo: '',
      number: 10000,
    },
    type: DataType.JSONB,
  })
  aaData: {};

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      aa: -1,
      statement: true,
      netBanking: false,
    },
  })
  service: {
    aa: number;
    statement: boolean;
    netbanking: boolean;
  };
}
