import { Injectable } from '@nestjs/common';
import {
  kInternalError,
  k422ErrorMessage,
  kParamMissing,
} from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { KYLAS_URL } from '../../../constants/network';
import { KylasHeader, CRMPipelineStages } from '../../../constants/objects';
import { k500Error } from 'src/constants/misc';
import { UserRepository } from 'src/repositories/user.repository';
import { CRMService } from 'src/admin/crm/crm.service';
import { AdminRepository } from 'src/repositories/admin.repository';

@Injectable()
export class KylasService {
  constructor(
    private readonly api: APIService,
    private readonly userRepo: UserRepository,
    private readonly crmService: CRMService,
    private readonly adminRepo: AdminRepository,
  ) {}
  private readonly baseUrl = KYLAS_URL;
  async createLead(leadData: any) {
    try {
      const leadPhoneNumbers = [];
      const phoneNumberObj = {
        type: 'MOBILE',
        code: 'IN',
        value: leadData.phone,
        dialCode: '+91',
        primary: true,
      };
      leadPhoneNumbers.push(phoneNumberObj);
      const createLeadData = {
        phoneNumbers: leadPhoneNumbers,
      };
      const data = await this.api.post(
        this.baseUrl,
        createLeadData,
        null,
        null,
        {
          headers: KylasHeader,
        },
        true,
      );
      if (data?.message) return kInternalError;
      return data;
    } catch (error) {
      return kInternalError;
    }
  }

  async updateLead(updatedLeadData: any, updateStageNumber: number) {
    try {
      const leadId = parseInt(updatedLeadData.userData.leadId);
      const userLeadData = await this.getLeadDetails(leadId);
      var finalizedData = userLeadData;
      if (updateStageNumber === CRMPipelineStages.AADHAR_DETAILS.id) {
        const name =
          updatedLeadData?.reqData?.panName ??
          updatedLeadData?.updatedData?.fullName;
        if (name) {
          const firstName = name.split(' ')[0];
          const lastName = name.split(' ')[1] ?? '';
          finalizedData.firstName = firstName;
          finalizedData.lastName = lastName;
        }
      }
      const url = this.baseUrl + `${leadId}`;
      const response = await this.api.put(url, finalizedData, {
        headers: KylasHeader,
      });
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  // function will be getting userId and return Lead Id
  async getLeadId(Param) {
    try {
      const userId = Param?.userId ?? Param?.id;
      const attributes = ['leadId'];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      const leadId = userData.leadId;
      if (!leadId) return k422ErrorMessage('User is not registered in CRM!');
      return leadId;
    } catch (error) {
      return kInternalError;
    }
  }

  async getLeadDetails(leadId: number) {
    try {
      const url = this.baseUrl + `${leadId}`;
      const response = await this.api.get(url, null, KylasHeader, null, true);
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  async changeStage(userData: any, stageId: number) {
    try {
      const leadId = userData?.leadId ?? (await this.getLeadId(userData));
      const url = `${this.baseUrl}${leadId}/pipeline-stages/${stageId}/activate`;
      const Body = {
        reasonForClosing: userData.reason ?? null,
        actualValue: null,
      };
      const response = await this.api.post(
        url,
        Body,
        null,
        null,
        {
          headers: KylasHeader,
        },
        true,
      );
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }
  async getUserId(Param: any) {
    try {
      const options = { where: { leadId: parseInt(Param?.leadId) } };
      const userData = await this.userRepo.getRowWhereData(['id'], options);
      if (userData == k500Error) return kInternalError;
      const userId = userData.id;
      if (!userId) return k422ErrorMessage('User is not registered in CRM!');
      return userId;
    } catch (error) {
      return kInternalError;
    }
  }
  async getKylasData(Body: any) {
    try {
      const leadId = Body.entity.relations[0].entityId;
      if (!leadId) return kParamMissing('leadId');
      const userId = await this.getUserId({ leadId });
      const options = {
        where: { crmId: Body.entity.createdBy.id },
      };
      const adminData = await this.adminRepo.getRoweData(['id'], options);
      const data = {
        statusId: '1',
        userId: userId,
        dispositionId: '1',
        adminId: adminData === undefined ? 37 : adminData.id ?? 37,
        remark: this.removeDoubleCurlyBraces(Body.entity.descriptionPlainText),
        titleId: '68',
      };
      const response = await this.crmService.createCrm(data);
      if (response?.message) return kInternalError;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  removeDoubleCurlyBraces(inputString: string): string {
    const resultString = inputString
      .replace(/\{\{.*?\}\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return resultString;
  }
}
