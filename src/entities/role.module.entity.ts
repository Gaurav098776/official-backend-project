import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { AdminSubRoleModuleEntity } from './role.sub.module.entity';

@Table({})
export class AdminRoleModuleEntity extends Model<AdminRoleModuleEntity> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  title: string;

  @Column({
    type: DataType.ENUM,
    values: ['0', '1'],
    defaultValue: '1',
    comment: '0 for inactive 1 for active.',
  })
  isActive: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  adminId: number;

  @HasMany(() => AdminSubRoleModuleEntity)
  subRoleModel: AdminSubRoleModuleEntity[];
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  roleOrder: number;
}
