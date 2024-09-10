import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import { FINALBUCKETADMINS, BANKINGADMINS } from 'src/constants/strings';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { COLLECTION } from 'src/utils/type.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AssignmentSharedService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly staticConfig: StaticConfigRepository,
    private readonly adminRoles: AdminRoleRepository,
    private readonly redisService: RedisService,
  ) {}

  async checkAdminDataFetch(type, isUpdated = false) {
    try {
      let key: string
      let adminType:string
      if (type == FINALBUCKETADMINS) adminType = 'CREDITANALYST', key = 'CREDIT_ANALYST_ADMIN';
      else if (type == BANKINGADMINS) adminType = 'CSE', key = 'CSE_ADMIN';
      if (!type) return false;
      let assingData = await this.redisService.get(key);
      const object = {
        id: 1,
        type: adminType,
        lastUpdateIndex: 0,
      };
      if (!assingData) {
        let setassingData = await this.redisService.set(
          key,
          JSON.stringify(object),
        );
        if (!setassingData) return kInternalError;
        assingData = await this.redisService.get(key);
      }
      const adminData: any = await this.fetchAdminAccordingRole(type);
      if (!adminData) return false;
      let lastUpdateIndex = JSON.parse(assingData).lastUpdateIndex;
      if (isUpdated) {
        lastUpdateIndex += 1;
        if (lastUpdateIndex >= adminData.length) lastUpdateIndex = 0;
        object.lastUpdateIndex = lastUpdateIndex;
        await this.redisService.set(
          key,
          JSON.stringify(object),
        );
      }
      return adminData[lastUpdateIndex];
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async fetchadmins(ids, type, redisKey) {
    try {
      let assingData = await this.redisService.get(redisKey);
      const object = {
        id: 1,
        type,
        lastUpdateIndex: 0,
      };
      if (!assingData) {
        let setassingData = await this.redisService.set(
          redisKey,
          JSON.stringify(object),
        );
        if (!setassingData) return kInternalError;
        assingData = await this.redisService.get(redisKey);
      }
      let adminData: any
      if(type === 'CREDITANALYST'){
        adminData = await this.fetchAssignee('CREDIT_ANALYSTS_ADMIN_LIST');
      }else{
        adminData = await this.fetchAssignee('CSE_ADMIN_LIST');
      }
      if (!adminData) return kInternalError;
      let lastUpdateIndex = JSON.parse(assingData).lastUpdateIndex;
      let result: any = [];
      if(type === 'CREDITANALYST'){
      for (const item of ids) {
        const data = await this.assignLoanIds(
          item.id,
          lastUpdateIndex,
          adminData,
          true,
        );
        if (!data) return kInternalError;
        result.push(data.result);
        lastUpdateIndex = data.lastUpdateIndex;
      }
    }else{
      for(const item of ids){
        const data = await this.assignMasterIds(item, lastUpdateIndex, adminData, true)
        if (!data) return kInternalError;
        result.push(data.result);
        lastUpdateIndex = data.lastUpdateIndex;
      }
    }
      object.lastUpdateIndex = lastUpdateIndex;
      await this.redisService.set(
        redisKey,
        JSON.stringify(object),
      );
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async assignLoanIds(loanId, lastUpdateIndex, adminData, isUpdated) {
    let index = isUpdated
      ? lastUpdateIndex + 1 >= adminData.length
        ? 0
        : lastUpdateIndex + 1
      : lastUpdateIndex;
    const finalData = {
      result: {
        loanId: loanId,
        assignTo: adminData[index].id,
      },
      lastUpdateIndex: index,
    };
    return finalData;
  }

  async assignMasterIds(masterId, lastUpdateIndex, adminData, isUpdated) {
    let index = isUpdated
    ? lastUpdateIndex + 1 >= adminData.length
      ? 0
      : lastUpdateIndex + 1
    : lastUpdateIndex;
    const finalData = {
      result: {
        id: masterId,
        assignTo: adminData[index].id,
      },
      lastUpdateIndex: index
    }
    return finalData
  }

  async fetchAssignee(redisKey) {
    try {
      let adminData = await this.redisService.get(redisKey);
      if (!adminData) return kInternalError;
      adminData = JSON.parse(adminData);
      const onlineAdmins = adminData.filter((user) => user.isLogin == 1);

      // If there are no online admins, then get offline admins
      const creditAnalysts =
        onlineAdmins.length == 0
          ? adminData.filter((user) => user.isLogin == 0)
          : onlineAdmins;

      const sortedCreditAnalysts = creditAnalysts.sort((a, b) => b.id - a.id);
      return sortedCreditAnalysts;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  
  async fetchAdminAccordingRole(type, needData = false) {
    try {
      let where: any = { isActive: '1' };
      if (type == FINALBUCKETADMINS) where.title = 'credit analyst';
      else if (type == BANKINGADMINS) where.title = 'cse';
      else if (type == COLLECTION) where.title = 'collection';
      else if (type) where.title = type;
      if (!where?.title) return false;
      const adminRole = await this.adminRoles.getRoweData(['id'], {
        where,
      });
      if (!adminRole || adminRole == k500Error) return false;
      // find admin
      let options = {
        where: { roleId: adminRole.id, isActive: '1', isLogin: '1' },
        order: [['id', 'DESC']],
      };
      let attr = ['id'];
      if (needData) attr = [...attr, 'otherData', 'email', 'phone', 'fullName'];
      let adminData = await this.adminRepo.getTableWhereData(attr, options);
      if (adminData.length == 0) {
        options.where = { roleId: adminRole.id, isActive: '1', isLogin: '0' };
        adminData = await this.adminRepo.getTableWhereData(attr, options);
      }
      if (!adminData || adminData == k500Error) return false;
      return needData ? adminData : adminData.map((ele) => ele.id);
    } catch (error) {
      return false;
    }
  }
}
