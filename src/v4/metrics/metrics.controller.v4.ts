// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';

@Controller('metrics')
export class MetricsControllerV4 {
  constructor(private readonly service: MetricsSharedService) {}

  @Post('insertLog')
  async funInsertLog(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.insertLog(body);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
