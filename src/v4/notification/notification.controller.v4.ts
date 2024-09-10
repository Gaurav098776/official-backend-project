import { Controller, Get, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { NotificationServiceV4 } from './notification.service.v4';

@Controller('notification')
export class NotificationControllerV4 {
  constructor(private readonly service: NotificationServiceV4) {}

  @Get('countList')
  async funCountList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.countList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
