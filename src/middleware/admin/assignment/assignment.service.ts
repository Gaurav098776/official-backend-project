import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { FINALBUCKETADMINS, BANKINGADMINS } from 'src/constants/strings';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { COLLECTION } from 'src/utils/type.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly staticConfig: StaticConfigRepository,
    private readonly adminRoles: AdminRoleRepository,
  ) {}

  async checkAdminDataFetch(type, isUpdated = false) {
    try {
      const assingData = await this.staticConfig.getRowWhereData(
        ['id', 'lastUpdateIndex'],
        { where: { type } },
      );
      if (!assingData || assingData == k500Error) return false;
      const adminData: any = await this.fetchAdminAccordingRole(type);
      if (!adminData) return false;
      let lastUpdateIndex = assingData.lastUpdateIndex;
      if (isUpdated) {
        lastUpdateIndex += 1;
        if (lastUpdateIndex >= adminData.length) lastUpdateIndex = 0;
        await this.staticConfig.updateRowData(
          { lastUpdateIndex },
          assingData.id,
        );
      }
      return adminData[lastUpdateIndex];
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  async fetchAdminAccordingRole(type) {
    try {
      let where: any = { isActive: '1' };
      if (type == FINALBUCKETADMINS) where.title = 'credit analyst';
      else if (type == BANKINGADMINS) where.title = 'cse';
      else if (type == COLLECTION) where.title = 'collection';
      if (!where?.title) return false;
      const adminRole = await this.adminRoles.getRoweData(['id'], {
        where,
      });
      if (!adminRole || adminRole == k500Error) return false;
      // find admin
      const options = {
        where: { roleId: adminRole.id, isActive: '1' },
        order: [['id']],
      };
      const adminData = await this.adminRepo.getTableWhereData(['id'], options);
      if (!adminData || adminData == k500Error) return false;
      return adminData.map((ele) => ele.id);
    } catch (error) {
      return false;
    }
  }
}
