// Imports
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { CamsServiceThirdParty } from './cams.service.thirdParty';

@Controller('thirdParty/cams')
export class CamsControllerThirdParty {
  constructor(private readonly service: CamsServiceThirdParty) {}

  @Get('getAuthToken')
  async funGetAuthToken(@Res() res) {
    try {
      const data = await this.service.getAuthToken();
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('fetchData')
  async funFetchData(@Body() body, @Res() res) {
    try {
      const consentId = body?.consentId;
      if (!consentId)
        return res.json(k422ErrorMessage('Parameter consentId missing'));

      await this.service.fetchData(consentId);
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  // Callback response from CAMS server
  @Post('syncData')
  async funSyncData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.syncData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
