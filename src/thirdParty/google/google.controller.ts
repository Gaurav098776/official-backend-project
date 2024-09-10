// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { GoogleService } from './google.service';

@Controller('google')
export class GoogleController {
  constructor(private readonly service: GoogleService) {}

  @Get('getRefreshToken')
  async funGetRefreshToken(@Query() query, @Res() res) {
    try {
      const data = await this.service.getRefreshToken(query);
      if (data['message']) return res.json(k422ErrorMessage(data['message']));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('searchOrganisation')
  async funSearchOrganisation(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.searchOrganisation(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkParticularSender')
  async funCheckParticularMail(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkParticularSender(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('appsFlyerDetails')
  async funAppsFlyerDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.appsFlyerDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('logAppsFlyerEvent')
  async funLOgAppsFlyerEvent(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.logEventInFirebaseForAppsFlyer(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
