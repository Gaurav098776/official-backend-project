// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { KycDashboardService } from './kyc.service';

@Controller('admin/kyc')
export class KycController {
  constructor(private readonly service: KycDashboardService) {}

  @Post('changeKycStatus')
  async funChangeKycStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funChangeKycStatus(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getKYCDocuments')
  async funGetKYCDocuments(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getKYCDocuments(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getUserKycDetailsHistory')
  async funGetUserKycDetailsHistory(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getUserKycDetailsHistory(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migratePincode')
  async funMigratePincode(@Res() res) {
    try {
      const data: any = await this.service.funMigratePincode();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // For data analyst team
  @Get('idToPanNumber')
  async funIdToPanNumber(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.idToPanNumber(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
