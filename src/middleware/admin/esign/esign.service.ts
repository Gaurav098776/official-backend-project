// Imports
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import { esignEntity } from 'src/entities/esign.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { ESignRepository } from 'src/repositories/esign.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { UserRepository } from 'src/repositories/user.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';

@Injectable()
export class ESignService {
  constructor(
    private readonly eSignRepo: ESignRepository,
    private readonly typeService: TypeService,
    private readonly veri5Service: Veri5Service,
    private readonly zoopService: ZoopService,
    private readonly loanRepo: LoanRepository,
    private readonly apiService: APIService,
    private readonly masterRepo: MasterRepository,
    private readonly sharedEsingService: ESignSharedService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly userRepo: UserRepository,
  ) {}

  async getStuckTableData(query) {
    try {
      const options = this.getOptions(query?.searchText);
      if (options?.message) return options;
      const listData = await this.findListData(options);
      if (listData?.message) return listData;
      const finalData: any = this.prepareFinalData(
        listData.rows,
        query?.download,
      );
      if (finalData?.message) return finalData;
      return { count: listData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private getOptions(searchText) {
    try {
      const loanWhere: any = {};
      const userWhere: any = {};
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString = searchText.substring(2);
        if (firstTwoLetters == 'l-') {
          loanWhere.id = +restOfString;
        } else userWhere.fullName = { [Op.iRegexp]: searchText };
      }
      const loanInclude = {
        model: loanTransaction,
        where: { ...loanWhere, loanStatus: 'Accepted' },
        attributes: ['id'],
      };
      const userInclude = {
        model: registeredUsers,
        where: { ...userWhere, isBlacklist: '0' },
        attributes: ['id', 'fullName', 'completedLoans', 'lastOnlineTime'],
        order: [['lastOnlineTime']],
      };
      const include = [loanInclude, userInclude];
      const where = { status: '0' };
      const options: any = { include, where };
      return options;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async findListData(options) {
    try {
      const attributes = ['id', 'quick_invite_url', 'updatedAt', 'createdAt'];
      const listData = await this.eSignRepo.getTableCountWhereData(
        attributes,
        options,
      );

      return listData;
    } catch (error) {
      kInternalError;
    }
  }

  private prepareFinalData(list, download) {
    const finalData = [];
    try {
      list.forEach((ele) => {
        try {
          const tempData: any = {};
          const createdAt = this.typeService.getDateFormatted(ele?.createdAt);
          const user = ele?.user;
          let lastActiveAgo: any = '';
          let lastActiveAgoMinutes: any = Infinity;
          if (user?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              user?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            lastActiveAgo =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }
          tempData['Name'] = ele?.user?.fullName ?? '-';
          tempData['loanId'] = ele?.loan?.id ?? '-';
          tempData['Completed loans'] = ele?.user?.completedLoans ?? '-';
          tempData['Quick invite url'] = ele?.quick_invite_url ?? '-';
          tempData['Created date'] = createdAt ?? '-';
          tempData['isOnline'] =
            lastActiveAgoMinutes < 5 && lastActiveAgo != '';
          tempData['Last Active ago'] =
            lastActiveAgo == '' ? null : lastActiveAgo;
          tempData['userId'] = ele?.user?.id ?? '-';
          if (download != 'true') {
            tempData['esignId'] = ele?.id ?? '-';
          }
          tempData['lastActiveAgoMinutes'] = lastActiveAgoMinutes;
          finalData.push(tempData);
          finalData.sort(
            (a, b) => a?.lastActiveAgoMinutes - b?.lastActiveAgoMinutes,
          );
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async funDeleteEsign(body) {
    try {
      if (!body?.esignId || !body?.adminId || !body?.loanId)
        return kParamsMissing;
      const esignId = body.esignId;
      const loanId = body.loanId;
      const attributes = ['id', 'dates', 'status', 'loanId'];
      const options: any = {
        where: { loanId, status: { eSign: '0', loan: { [Op.notIn]: [6, 7] } } },
      };
      const esignAttr = [
        'id',
        'loanId',
        'document_id',
        'stampId',
        'userId',
        'esign_mode',
        'status',
      ];
      const esignInclude = {
        model: esignEntity,
        attributes: esignAttr,
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['esign_id'],
        include: [esignInclude],
      };
      options.include = [loanInclude];
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!masterData || masterData === k500Error)
        return {
          valid: false,
          message: 'Failed to fetch esign data!',
        };
      const loanData = masterData.loanData;
      const esignData = loanData.eSignData;
      const statusData = masterData?.status ?? {};
      let statusResponse;
      if (esignData.esign_mode == 'VERI5') {
        statusResponse = await this.veri5Service.checkEsignStatusAndDownaload(
          esignData.document_id,
        );

        if (esignData.status == '1')
          return {
            valid: false,
            message: 'Esign already signed!',
          };
        if (statusResponse == k500Error)
          return {
            valid: false,
            message: 'Failed to fetch esign data!',
          };
        if (statusResponse.fileContent)
          return {
            valid: false,
            message: 'Esign already signed!',
          };
      } else if (esignData.esign_mode == 'ZOOP') {
        const statusResponse: any = await this.zoopService.checkStatusOfeSing(
          esignData.document_id,
        );
        if (statusResponse?.message) return statusResponse;
        if (statusResponse?.status === '1')
          return k422ErrorMessage('Esign already signed!');
      } else {
        statusResponse = await this.getSignatureStatus({
          document_id: esignData.document_id,
        });
        if (!statusResponse || statusResponse === k500Error)
          return {
            valid: false,
            message: 'Failed to fetch esign data!',
          };
        if (
          statusResponse['status'] == 'success' &&
          statusResponse['signer_info'][0]?.status == 'signed'
        )
          return {
            valid: false,
            message: 'Esign already signed!',
          };
      }
      const deletOptions = {
        where: { status: '0', id: esignId },
      };
      const tempEsignData = await this.deleteEsign(deletOptions);
      if (!tempEsignData || tempEsignData[0] <= 0)
        return k422ErrorMessage('Esign not deleted');
      if (esignId == loanData.esign_id) {
        const updateData = await this.loanRepo.updateRowData(
          { esign_id: null },
          masterData.loanId,
        );

        if (!updateData || updateData === k500Error)
          return {
            valid: false,
            message: 'Failed to update esign id in loan entry!',
          };
        statusData.eSign = -1;
        await this.masterRepo.updateRowData(
          { status: statusData },
          masterData.id,
        );
        return true;
      } else {
        return {
          valid: false,
          message: 'Loan and esign id mismatch!',
        };
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getSignatureStatus(req_data) {
    try {
      const url = 'https://api.signdesk.in/api/live/getSignatureStatus';
      const headers = {
        'Content-Type': 'application/json',
        'x-parse-rest-api-key': 'd12e8567d6c47f19ce7b15791c237aad',
        'x-parse-application-id':
          'lenditt-innovations--technologies-pvt-ltd_live_esign',
      };
      const body = { document_id: req_data.document_id };
      const response = await this.apiService.requestPost(url, body, headers);
      if (!response) return k500Error;
      return response;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async deleteEsign(options: any) {
    try {
      return await this.eSignRepo.deleteWhereData(options);
    } catch (error) {
      return null;
    }
  }

  async checkPendingEsign() {
    try {
      const eSignInclude: any = {
        model: esignEntity,
        where: { status: '0' },
        attributes: ['id', 'response'],
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus', 'esign_id'],
        include: [eSignInclude],
      };
      const options = {
        where: {
          status: {
            eligibility: { [Op.or]: [1, 3] },
            loan: { [Op.or]: [1, 3] },
            eMandate: 1,
            eSign: 0,
          },
        },
        include: [loanInclude],
      };
      const attributes = ['id', 'status', 'dates', 'rejection', 'loanId'];
      const masterData = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      return await this.checkAllPendingStatus(masterData);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkAllPendingStatus(masterData) {
    try {
      for (let i = 0; i < masterData.length; i++) {
        try {
          const master = masterData[i];
          const loanData = master.loanData;
          await this.sharedEsingService.checkStatus({ loanId: loanData.id });
        } catch (error) {}
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async regenerateEsign(body) {
    try {
      if (!body.adminId) return kParamMissing('adminId');
      const eSignAttr = [
        'id',
        'userId',
        'loanId',
        'signed_document',
        'quick_invite_url',
        'esign_mode',
        'status',
        'createdAt',
        'updatedAt',
      ];

      let tempDate = new Date();
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setHours(tempDate.getHours() - 1);
      //Loan include
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['id'];
      loanInclude.where = { loanStatus: 'Accepted' };

      const options: any = {
        where: {
          status: '0',
          createdAt: { [Op.lt]: tempDate },
        },
        include: [loanInclude],
      };
      const eSingData = await this.eSignRepo.getTableWhereData(
        eSignAttr,
        options,
      );
      if (eSingData === k500Error) return kInternalError;
      const adminId = body?.adminId;
      for (let i = 0; i < eSingData.length; i++) {
        try {
          const eSignId = eSingData[i]?.id;
          const loanId = eSingData[i]?.loanId;
          const userId = eSingData[i]?.userId;
          const deletefunDeleteEsign: any = await this.funDeleteEsign({
            esignId: eSignId,
            adminId,
            loanId,
          });
          if (deletefunDeleteEsign?.message) continue;
          if (deletefunDeleteEsign === k500Error) continue;
          const finalResult: any = await this.sharedEsingService.inviteForESign(
            loanId,
            true,
            userId,
          );
          if (finalResult === k500Error) continue;
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getLoanAgreement(query) {
    try {
      const loanId = query.loanId;
      if (!loanId) return kParamsMissing;
      const data = await this.eSignRepo.getRowWhereData(
        ['signed_document_upload', 'eSign_agree_data'],
        { where: { loanId } },
      );
      if (data == k500Error) return kInternalError;
      data.eSign_agree_data = data?.eSign_agree_data
        ? JSON.parse(data.eSign_agree_data)
        : {};
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async notifyPendingUsers(reqData) {
    try {
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = ['quick_invite_url'];
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['id', 'appType'];
      loanInclude.include = [eSignInclude];
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['id'];
      masterInclude.where = {
        status: {
          loan: { [Op.or]: [1, 3] },
          eMandate: 1,
          eSign: 0,
        },
      };
      masterInclude.include = [loanInclude];
      const include = [masterInclude];
      const attributes = ['email', 'fullName', 'id'];
      const options = {
        include,
        where: {
          isBlacklist: '0',
        },
      };
      const userList = await this.userRepo.getTableWhereData(
        attributes,
        options,
      );
      if (userList == k500Error) return kInternalError;
      for (let index = 0; index < userList.length; index++) {
        try {
          const userData = userList[index];
          const id = userData.id;
          const data: any = { name: userData.fullName };
          const eSignData = userData.masterData?.loanData?.eSignData ?? {};
          data.link = eSignData?.quick_invite_url ?? '';
          data.appType = userData?.masterData?.loanData?.appType;
          data.userId = id;
          await this.sharedNotification.sendEmailToUser(
            'ESIGN_INVITATION',
            userData.email,
            id,
            data,
          );
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
