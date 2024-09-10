// Imports
import { Injectable } from '@nestjs/common/decorators';
import { Op } from 'sequelize';
import { PAGE_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kNoDataFound,
  kParamMissing,
  kWrongDetails,
} from 'src/constants/responses';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class ipMasterService {
  constructor(
    private readonly ipMasterRepo: IpMasterRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly typeService: TypeService,
  ) {}

  // get ipMasterlist api
  async getIpMasterList(body) {
    try {
      const attributes = [
        'ip',
        'status',
        'country',
        'response',
        'isBlacklist',
        'updatedAt',
        'lastUpdatedBy',
      ];

      const searchText = body?.searchText ?? '';
      const page = +body?.page || 1;
      const filter = +body?.filterStatus;
      let searchWhere: any = {};
      const download = body?.download ?? false;

      if (searchText.length >= 2) {
        searchWhere = {
          [Op.or]: [
            { country: { [Op.regexp]: searchText } },
            { ip: { [Op.iLike]: '%' + searchText + '%' } },
          ],
        };
      }
      if (filter == 1) searchWhere.isBlacklist = filter;
      else if (filter == 0) searchWhere.isBlacklist = null;
      const options: any = {
        where: searchWhere,
        order: [['country', 'ASC']],
      };

      if (download !== 'true') {
        const offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.offset = offset;
        options.limit = PAGE_LIMIT;
      }

      const ipMasterList = await this.ipMasterRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );

      if (ipMasterList === k500Error) return kInternalError;

      const finalData = [];
      for (let index = 0; index < ipMasterList.rows.length; index++) {
        try {
          let ipMaster = ipMasterList.rows[index];

          if (ipMaster.isBlacklist == '1') ipMaster.isBlacklist = 'Blacklist';
          else ipMaster.isBlacklist = 'Active';

          ipMaster.formattedDate =
            this.typeService.getDateFormatted(ipMaster?.updatedAt) ?? '-';

          ipMaster.lastUpdatedBy =
            (await this.commonSharedService.getAdminData(
              ipMaster?.lastUpdatedBy,
            )) ?? '-';

          const jsonResponse = JSON.parse(ipMaster.response);

          const obj = {
            'IP address': ipMaster?.ip ?? '-',
            Country: ipMaster?.country ?? '-',
            State: jsonResponse?.region ?? '-',
            City: jsonResponse?.city ?? '-',
            Status: ipMaster?.isBlacklist ?? '-',
            'Last updated': ipMaster?.formattedDate ?? '-',
            'Last update by': ipMaster?.lastUpdatedBy.fullName ?? '-',
          };
          finalData.push(obj);
        } catch (error) {}
      }
      ipMasterList.rows = finalData;
      return ipMasterList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //update Ip Master Api
  async updateIpMasterList(reqData: any) {
    try {
      const ip = reqData?.ip;
      if (!ip) return kParamMissing('ip');
      const isBlackList = reqData.isBlacklist;
      if (!isBlackList) return kParamMissing('isBlackList');
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');

      const allowedBlackList = ['Active', 'Blacklist'];
      if (!allowedBlackList.includes(isBlackList)) return kWrongDetails;

      const IpMaster = await this.ipMasterRepo.getRowWhereData(['ip'], {
        where: { ip: ip },
      });
      if (IpMaster === k500Error) return kInternalError;
      if (!IpMaster) return k422ErrorMessage(kNoDataFound);

      let ipBlackList = 0;
      if (isBlackList == 'Blacklist') ipBlackList = 1;

      const updatedData = {
        isBlacklist: ipBlackList,
        lastUpdatedBy: adminId,
      };
      const updatedResult = await this.ipMasterRepo.updateWhereData(
        updatedData,
        { ip },
      );
      if (updatedResult === k500Error) return kInternalError;
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
