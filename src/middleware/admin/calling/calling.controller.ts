import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { CallingService } from './calling.service';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';

@Controller('admin/calling')
export class CallingController {
  constructor(private readonly service: CallingService) { }
  //#region make agent call
  @Post('makeAgentCall')
  async funMakeAgentCall(@Body() body, @Res() res) {
    const data: any = await this.service.funmakeAgentCall(body);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region call event history data
  @Get('getCallEventData')
  async funGetCallEventHistoryData(@Query() query, @Res() res) {
    const data: any = await this.service.getEventCallHistory(query);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region get status
  @Get('getSubStatus')
  async funGetSubStatus(@Res() res) {
    const data = await this.service.getSubStatus();
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region get call hitory logs
  @Get('getCallLogData')
  async getCallLogData(@Query() query, @Res() res) {
    const data: any = await this.service.getCallLogData(query);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region  call details
  @Post('callDetails')
  async callDetails(@Body() body, @Res() res) {
    const data: any = await this.service.callDetails(body);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region get  call history data
  @Get('getCallHistoryData')
  async getCallHistoryData(@Query() query, @Res() res) {
    const data: any = await this.service.getAllCallData(query);
    if (data.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
  //#endregion

  //#region  make dummy call
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
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('changePhone')
  async changePhone(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.changePhoneNumber(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return kInternalError;
    }
  }

  @Get('getCallHistory')
  async getCallHistory(@Query() query, @Res() res) {
    const data: any = await this.service.getAllCallhistory(query);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
}
