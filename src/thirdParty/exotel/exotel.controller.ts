// Imports
import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { MakeAgentToCustomerCallDto } from './exotel.dto';
import { exotelService } from './exotel.service';
@Controller('/thirdParty/exotel')
export class exotelController {
  constructor(private readonly service: exotelService) {}

  @Get('updateCallHistoryData')
  async funUpdateCallHistoryData(@Res() res) {
    try {
      
      this.service.updateCallEvents().catch((error) => {});
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getExotelCallHistoryData')
  async getExotelCallHistoryData(@Query() query, @Res() res) {
    try {
      const page = +query.page || 1;
      const status = query?.status;
      const userId = query.userId;
      const loanId = query.loanId;
      if (!userId) return res.json(kParamsMissing);
      const passData = { page, status, userId, loanId };
      const result = await this.service.getAllExotelData(passData);
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getCallEventData')
  async getCallEventData(@Query() query, @Res() res) {
    try {
      const category = query.category;
      const startDate = query.startDate;
      const endDate = query.endDate;
      const passData = { category, startDate, endDate };
      const response = await this.service.getEventCallHistory(passData);
      if (response == k500Error || !response) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      return k500Error;
    }
  }

  @Get('getCallLogData')
  async getCallLogData(@Query() query, @Res() res) {
    try {
      const page = +query.page || 1;
      const categoryId = query.categoryId;
      const download = query?.download ?? false;
      if (!categoryId) return res.json(kParamsMissing);
      const subStatus = query?.subStatus;
      const passData = { categoryId, page, subStatus, download };
      const response = await this.service.getCallLogData(passData);
      if (response == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('makeDummyCall')
  async funMakeDummyCall(@Body() body, @Res() res) {
    try {
      const category: string = body?.category ?? '';
      if (!category)
        return res.json(k422ErrorMessage('Parameter category is missing'));
      const targetList: string[] = body?.targetList ?? [];
      if (!targetList)
        return res.json(
          k422ErrorMessage('Parameter targetList is missing or empty'),
        );

      const data = await this.service.placeCall({ category, targetList });
      if (data.message) return res.json(k422ErrorMessage(data.message));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('getSubStatus')
  async funGetSubStatus(@Res() res) {
    try {
      const response = await this.service.getSubStatus();
      if (response == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('makeAgentToCustomer')
  async funMakeAgentToCustomer(
    @Body() body: MakeAgentToCustomerCallDto,
    @Res() res,
  ) {
    try {
      const data: any = await this.service.makeAgentToCustomerCall(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('exotelCallEvent')
  async exotelCallEvent(@Query() query: Object, @Res() res) {
    try {
      const response = await this.service.exotelCallEvent(query);
      if (response == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: response });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('exotelStatusCallBack')
  async exotelStatusCallBack(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.exotelStatusCallBack(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('ExotelCallDetails')
  async ExotelCallDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.ExotelCallDetails(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
