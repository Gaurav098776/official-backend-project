import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ timestamps: false })
export class loanPurpose extends Model<loanPurpose> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  purposeName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  header: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  primaryColor: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  primaryAccentColor: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    allowNull: true,
  })
  purposeStatusVerified: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  textColor: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  image_url: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  lsp_image_url: string;
}
