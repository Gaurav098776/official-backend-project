// Imports
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { MetricsService } from './metrics.service';

@Controller('admin/metrics')
export class MetricsController {
  constructor(
    // Admin services
    private readonly service: MetricsService,
    // Shared services
    private readonly sharedService: MetricsSharedService,
  ) {}

  @Post('insertLog')
  async funInsertLog(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedService.insertLog(body);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('insights')
  async funInsights(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.insights(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
