import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { kYouHaveAccess } from 'src/constants/strings';
import { admin } from 'src/entities/admin.entity';
import { AccessOfRoleRepository } from './access_of_role.repository';
import { AdminRoleRepository } from './admin_role.repository';
import { AdminSubRoleModuleRepository } from './admin_sub_role_module.repository';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class AdminRepository {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly repository: typeof admin,
    private readonly repoManager: RepositoryManager,
    private readonly adminSubModelRepo: AdminSubRoleModuleRepository,
    private readonly roleAccessRepo: AccessOfRoleRepository,
    private readonly roleRepo: AdminRoleRepository,
  ) {}

  async createRowData(data: any) {
    return await this.repoManager.createRowData(this.repository, data);
  }

  async findAll(data: any) {
    return await this.repository.findAll(data);
  }

  async getRowWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getRowWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getRoweData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getRowWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereData(attributes: string[], options: any) {
    try {
      return await this.repoManager.getTableWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  async updateRowData(updatedData: any, id: any) {
    try {
      return this.repoManager.updateRowData(this.repository, updatedData, id);
    } catch (error) {
      return k500Error;
    }
  }

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }

  //#region check has Access
  async checkHasAccess(adminId, type, access = -1) {
    try {
      //// find admin data
      const att = ['roleId'];
      const where = { id: adminId, isActive: '1' };
      const findAdmin = await this.getRoweData(att, { where });
      if (!findAdmin || findAdmin === k500Error)
        return k422ErrorMessage(kYouHaveAccess);
      const roleId = findAdmin?.roleId;
      if (!roleId) return k422ErrorMessage(kYouHaveAccess);

      // sub model
      const attSub = ['id'];
      type = type.toLowerCase();
      const options = { where: { title: type } };
      const sub = await this.adminSubModelRepo.getRoweData(attSub, options);
      if (!sub || sub === k500Error) return k422ErrorMessage(kYouHaveAccess);
      const subRoleModelId = sub?.id;
      if (!subRoleModelId) return k422ErrorMessage(kYouHaveAccess);

      // find access
      const attAccess = ['id', 'isActive', 'access_list'];
      const optionsAcc = { where: { roleId, subRoleModelId } };
      const find = await this.roleAccessRepo.getRoweData(attAccess, optionsAcc);
      if (!find || find === k500Error) return k422ErrorMessage(kYouHaveAccess);
      const access_list = find?.access_list ?? [];
      if (access != -1) {
        if (!access_list.includes(access))
          return k422ErrorMessage(kYouHaveAccess);
      } else if (!access_list.includes(2))
        return k422ErrorMessage(kYouHaveAccess);
      return true;
    } catch (error) {
      return k422ErrorMessage(kYouHaveAccess);
    }
  }
  //#endregion

  async getAdminsFromDepartment(departmentName: string, attributes = ['id']) {
    try {
      const roleId = await this.getRoleIdForDepartment(departmentName);
      if (roleId.message) return roleId;

      const options = {
        order: [['id', 'DESC']],
        where: { isActive: '1', roleId },
      };
      const adminList = await this.getTableWhereData(attributes, options);
      if (adminList == k500Error) return kInternalError;
      return adminList;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getRoleIdForDepartment(departmentName: string) {
    try {
      const attributes = ['id'];
      const options = { where: { isActive: '1', title: departmentName } };

      const roleData = await this.roleRepo.getRoweData(attributes, options);
      if (roleData == k500Error) return kInternalError;
      if (!roleData) return k422ErrorMessage('No data found');
      return roleData.id;
    } catch (error) {
      return kInternalError;
    }
  }
  async update(updateData: any, where: any) {
    return await this.repoManager.updateData(
      this.repository,
      updateData,
      where,
    );
  }
}
