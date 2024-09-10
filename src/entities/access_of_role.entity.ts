import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { AccessOfListEntity } from './access_of_list.entity';
import { AdminRole } from './admin.role.entity';
import { AdminRoleModuleEntity } from './role.module.entity';
import { AdminSubRoleModuleEntity } from './role.sub.module.entity';

@Table({})
export class AccessOfRoleEntity extends Model<AccessOfRoleEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => AdminRole)
  @Column({ type: DataType.INTEGER, allowNull: false })
  roleId: number;

  @ForeignKey(() => AdminRoleModuleEntity)
  @Column({ type: DataType.INTEGER, allowNull: true })
  roleModelId: number;

  @ForeignKey(() => AdminSubRoleModuleEntity)
  @Column({ type: DataType.INTEGER, allowNull: true })
  subRoleModelId: number;

  @ForeignKey(() => AccessOfListEntity)
  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    allowNull: true,
    defaultValue: [],
  })
  access_list: number;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '0',
    comment: '0 fo pending 1 for done.',
  })
  isActive: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: SYSTEM_ADMIN_ID,
  })
  adminId: number;

  @BelongsTo(() => AdminRole)
  roleData: AdminRole;

  @BelongsTo(() => AdminRoleModuleEntity)
  roleModelData: AdminRoleModuleEntity;

  @BelongsTo(() => AdminSubRoleModuleEntity)
  subRoleModelData: AdminSubRoleModuleEntity;
}
