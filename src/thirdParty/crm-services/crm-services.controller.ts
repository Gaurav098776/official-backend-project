import { Body, Controller, Post, Res, Put, Param, Get } from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { CRMSelectorService } from './crm-services.service';
import { CRMPipelineStages } from 'src/constants/objects';

@Controller('crm/leads')
export class CRMSelectorController {
  constructor(private readonly crmSelectorService: CRMSelectorService) {}

  @Post('createLead')
  async createLead(@Body() leadData: any, @Res() res) {
    try {
      const data: any = await this.crmSelectorService.createLead(leadData);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Put('updateLead/:leadId')
  async updateLead(
    @Param() param,
    @Body() leadData: any,
    @Res() res,
    updateStageNumber: number,
  ) {
    try {
      const leadId = param?.leadId;
      if (!leadId) {
        return res.json(kParamsMissing);
      }
      const response: any = await this.crmSelectorService.updateLead(
        leadData,
        updateStageNumber,
      );
      return res.json(response);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getLeadDetails/:leadId')
  async getLeadDetails(@Param() Param, @Res() res) {
    try {
      const leadId = Param?.leadId;
      if (!leadId) {
        return res.json(kParamsMissing);
      }
      const response = await this.crmSelectorService.getLeadDetails(leadId);
      return res.json(response);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('changeStage/:leadId')
  async changeStage(@Param() Param, @Res() res) {
    try {
      const leadId = Param?.leadId;
      const stageId = Number(CRMPipelineStages.BASIC_DETAILS.id);
      const response: any = await this.crmSelectorService.changeStage(
        leadId,
        stageId,
      );
      return res.json(response);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getLeadId/:userId')
  async getLeadId(@Param() Param, @Res() res) {
    try {
      const response: any = await this.crmSelectorService.getLeadId(Param);
      if (response?.message) return res.send(response);
      return response;
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getUserId/:leadId')
  async getUserId(@Param() Param, @Res() res) {
    try {
      const response: any = await this.crmSelectorService.getUserId(Param);
      if (response?.message) return res.send(response);
      return res.json(response);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('webhook')
  async storeKylasWebhook(@Body() body, @Res() res) {
    try {
      const data: any = this.crmSelectorService.funStoreKylasWebhook(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return kInternalError;
    }
  }
}
