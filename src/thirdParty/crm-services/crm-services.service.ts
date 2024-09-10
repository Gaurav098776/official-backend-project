// Imports
import { Injectable } from '@nestjs/common';
import { KylasService } from './kylas/kylas.service';
import {
  CRM_SERVICES,
  CRM_SERVICE_ENABLE,
  GlobalServices,
} from '../../constants/globals';
import { kInternalError } from 'src/constants/responses';

@Injectable()
export class CRMSelectorService {
  constructor(private readonly kylasService: KylasService) {}

  async createLead(leadData: any) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.createLead(leadData);
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async updateLead(leadData: any, updateStageNumber: number) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.updateLead(
            leadData,
            updateStageNumber,
          );
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async getLeadDetails(leadId: number) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.getLeadDetails(leadId);
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async changeStage(userData: any, stageId: number) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.changeStage(
            userData,
            stageId,
          );
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async getLeadId(Param) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.getLeadId(Param);
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async getUserId(Param) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.getUserId(Param);
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async funStoreKylasWebhook(Body) {
    try {
      if (CRM_SERVICE_ENABLE) {
        if (GlobalServices.SELECTED_CRM == CRM_SERVICES.KYLAS) {
          const response = await this.kylasService.getKylasData(Body);
          return response;
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }
}
