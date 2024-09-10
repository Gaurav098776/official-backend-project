import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { AccessOfListEntity } from './access_of_list.entity';
import { AdminRoleModuleEntity } from './role.module.entity';

@Table({})
export class AdminSubRoleModuleEntity extends Model<AdminSubRoleModuleEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  title: string;

  @ForeignKey(() => AdminRoleModuleEntity)
  @Column({ type: DataType.INTEGER, allowNull: false })
  roleModelId: number;

  @ForeignKey(() => AccessOfListEntity)
  @Column({ type: DataType.ARRAY(DataType.INTEGER), allowNull: true })
  access_list: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  adminId: number;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '0 for inactive 1 for active.',
  })
  isActive: string;
}
