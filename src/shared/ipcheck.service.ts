// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import {
  IP_ADDRESS_IS_BLACKLISTED,
  IP_SECURITY_ISSUE,
  USER_IS_NOT_MATCHED_WITH_COUNTRY,
} from 'src/constants/strings';
import { kInternalError } from 'src/constants/responses';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { ValidationService } from 'src/utils/validation.service';
import { ipMasterEntity } from 'src/entities/ipMaster.entity';
import { EnvConfig } from 'src/configs/env.config';
import { AdminService } from 'src/admin/admin/admin.service';

@Injectable()
export class IpCheckService {
  allLoanPurpose: any[];
  allAdminData: any[] = [];
  allDesignationData: any[];
  allSectorData: any[];
  constructor(
    // Repositories
    private readonly userLogTrackerRepo: UserLogTrackerRepository,
    // Services
    private readonly validationService: ValidationService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
  ) {}

  //ip check at every step
  async ipCheck(userId, loanId) {
    try {
      if (EnvConfig.isDev) return {};

      const attributes = ['ip'];
      const ipMasterInclude = {
        model: ipMasterEntity,
        attributes: ['isBlacklist', 'country', 'isSecurityIssue'],
        where: { status: 1 },
        required: false,
      };
      const options = { where: { loanId }, include: [ipMasterInclude] };
      const ipRecords = await this.userLogTrackerRepo.getTableWhereData(
        attributes,
        options,
      );
      if (ipRecords == k500Error) return kInternalError;

      const uniqueRecords: any = Object.values(
        ipRecords.reduce((acc, record) => ((acc[record.ip] = record), acc), {}),
      );

      for (const record of uniqueRecords) {
        try {
          const ipData = record?.ipMaster;
          const ip = record?.ip;
          // Whitelisted Ips of LSP
          if (EnvConfig.lsp.hosts.includes(ip)) continue;

          if (ipData) {
            const { isBlacklist, isSecurityIssue, country } = ipData;
            if (isBlacklist === 1)
              return await this.checkIpData(
                userId,
                57,
                IP_ADDRESS_IS_BLACKLISTED,
              );
            if (isSecurityIssue === 1)
              return await this.checkIpData(userId, 58, IP_SECURITY_ISSUE);
            if (country !== 'india')
              return await this.checkIpData(
                userId,
                44,
                USER_IS_NOT_MATCHED_WITH_COUNTRY,
              );
          } else {
            const checkIp: any = await this.validationService.isIndianIp(ip);
            if (checkIp?.securityIssue == true)
              return await this.checkIpData(userId, 58, IP_SECURITY_ISSUE);
            else if (checkIp === false)
              return await this.checkIpData(
                userId,
                44,
                USER_IS_NOT_MATCHED_WITH_COUNTRY,
              );
          }
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkIpData(userId, reasonId, reason) {
    const data = {
      userId,
      reasonId,
      reason,
      type: '1',
      status: '1',
      adminId: SYSTEM_ADMIN_ID,
    };
    await this.adminService.changeBlacklistUser(data);
    return true;
  }
}
