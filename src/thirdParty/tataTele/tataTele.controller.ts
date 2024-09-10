import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { MakeAgentToCustomerCallDto } from './tatatele.dto';
import { TataTeleService } from './tataTele.service';
import { kSuccessData } from 'src/constants/responses';

@Controller('/thirdParty/tataTele')
export class TataTeleController {
  constructor(private readonly service: TataTeleService) {}

  //#region make call to customer and agent
  @Post('makeCallFromAgentToUser')
  async funMakeCallFromAgentToUser(
    @Body() body: MakeAgentToCustomerCallDto,
    @Res() res,
  ) {
    const response: any = await this.service.funMakeCallFromAgentToUser(body);
    if (response?.message) return res.json(response);
    return res.json({ ...kSuccessData, response });
  }
  //#endregion

  //#region  update call history
  @Get('updateCallHistory')
  async funUpdateCallHistoryData(@Query() query, @Res() res) {
    const response: any = await this.service.updateCallStatus(query);
    if (response?.message) return res.json(response);
    return res.json({ ...kSuccessData, response });
  }
  //#endregion

  //#region  update call history
  @Post('callBack')
  async funCallBackStatus(@Body() body, @Res() res) {
    const response: any = await this.service.callBackStatusUpdate(body);
    if (response?.message) return res.json(response);
    return res.json({ ...kSuccessData, response });
  }
  //#endregion

  @Post('callRecievedOnServer')
  async callRecievedOnServer(@Body() body, @Res() res) {
    const response: any = await this.service.callRecievedOnServer(body);
    if (response?.message) return res.json(response);
    return res.json({ ...kSuccessData, response });
  }
}
