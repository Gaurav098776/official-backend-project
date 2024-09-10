// Imports
import { Controller, Get, Res, Query, Post, Body, Req } from '@nestjs/common';
import { CronService } from './cron.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('admin/cron')
export class CronController {
  constructor(private readonly service: CronService) {}

  @Get('cronHistory')
  async getCronHistory(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.checkCronHistory(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('hitCronApi')
  async hitCronApi(@Body() body, @Res() res, @Req() req: any) {
    try {
      const adminId = req.header('adminId');
      const data = await this.service.hitCronApi(body, adminId);
      // if (data.message) return res.json(data);
      return res.json({ ...kSuccessData });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
