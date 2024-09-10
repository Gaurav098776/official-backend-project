import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { AdminRole } from './admin.role.entity';

@Table({})
export class APIAccessListEntity extends Model<APIAccessListEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.TEXT, allowNull: false, unique: true })
  endPoint: string;

  @ForeignKey(() => AdminRole)
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [],
  })
  role_list: number;

  // @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  // required_params: string;
  @Column({
    type: DataType.ENUM,
    values: ['0', '1', '2'],
    defaultValue: '0',
    comment: '0=ADMIN, 1=USER, 2=BOTH',
  })
  endPointUsefor: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  adminId: number;
}
