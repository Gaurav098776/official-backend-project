// Imports
import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { loanTransaction } from './loan.entity';
import { registeredUsers } from './user.entity';

@Table({})
export class esignEntity extends Model<esignEntity> {
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
  reference_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  docket_title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  reference_doc_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content_type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  signer_ref_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  signer_email: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  signer_name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  signer_mobile: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  year_of_birth: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  gender: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  name_as_per_aadhaar: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  last_four_digits_of_aadhaar: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  loanAgreement: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  quick_invite_url: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  docket_id: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  })
  nameMissMatch: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  api_response_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  document_id: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    comment: '0 means Unsigned, 1 means Signed, 2 means Rejected',
    defaultValue: '0',
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'BASE64',
  })
  signed_document: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Cloud',
  })
  signed_document_upload: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    unique: true,
  })
  esign_mode: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    unique: true,
  })
  stampId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @ForeignKey(() => loanTransaction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  loanId: number;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => registeredUsers)
  user: registeredUsers;

  @BelongsTo(() => loanTransaction)
  loan: loanTransaction;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  ipChecked: Boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  ipChecked_date: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  eSign_agree_data: string;
}
