import { Controller, Get, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { NotificationServiceV3 } from './notification.service.v3';

@Controller('notification')
export class NotificationControllerV3 {
  constructor(private readonly service: NotificationServiceV3) {}

  @Get('countList')
  async funCountList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.countList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
