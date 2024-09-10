import { Controller, Get, Query, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { SenseDataService } from './sense.service';

@Controller('/senseData')
export class SenseDataController {
  constructor(private readonly service: SenseDataService) {}

  @Get('genrateAccessToken')
  async funGenrateAcceassToken(@Res() res) {
    try {
      const data = await this.service.genrateAccessToken();
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('callBack')
  async funCallback(@Query() query, @Res() res) {
    try {
      const spans = query?.userId.split('?transactionId=');
      const userId = spans[0];
      const transactionId = spans[1].trim();
      if (!transactionId || !userId) return res.json(kParamsMissing);

      const data = await this.service.fetchAddresses(transactionId, userId);
      if (data['message']) return res.json(k422ErrorMessage(data['message']));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
