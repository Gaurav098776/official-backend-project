// Imports
import { DigiLockerService } from './digilocker.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';

@Controller('thirdParty/digiLocker')
export class DigiLockerController {
  constructor(private readonly service: DigiLockerService) {}

  @Get('checkExistance')
  async funCheckExistance(@Query() query, @Res() res) {
    try {
      const data = await this.service.checkExistance(query.aadhaarNumber ?? '');
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('invitation')
  async funInvitation(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.invitation(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('pullAadhaar')
  async funPullAadhaar(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.pullAadhaar(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('digilockerMetadata')
  async funDigilockerMetadata(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.digilockerMetadata(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
