import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { registeredUsers } from './user.entity';
import { admin } from './admin.entity';

@Table({})
export class AddressesEntity extends Model<AddressesEntity> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.ENUM,
    values: [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
    ],
    comment:
      '0=KYC, 1=NETBANKING, 2=SENSEDATA_ZOMATO. 3=SENSEDATA_FLIPKART, 4=SENSEDATA_AMAZONE, 5=SENSEDATA_BLINKIT,6=OTHER, 7=LSP_ZOMATO, 8=LSP_SWIGGY, 9=LSP_FLIPKART, 10=LSP_DMART, 11=BANK_ADDRESS, 12=TYPE_ADDRESS, 13=CIBIL',
  })
  type: string;

  @ForeignKey(() => registeredUsers)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  address: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  subType: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  lat: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  long: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  bearing: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  frontImage: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  backImage: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2', '4', '5'],
    comment:
      '0=pending, 1=accepted by system, 2=verified by admin, 5 = Automation verification pending, 4 = Automation ignored',
    allowNull: true,
  })
  status: string;

  @ForeignKey(() => admin)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  adminId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  refId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  response: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {
      address: '',
      probability: -1,
      type: -1,
    },
  })
  probability: {
    address: string;
    probability: number;
    type: number;
  };

  @Column({
    type: DataType.SMALLINT,
    allowNull: true,
    comment: '1=Residence, 2=Communication, 3=Both',
  })
  addressFlag: number;
}
