import { Controller, Query, Get, Res } from '@nestjs/common';
import { AlertService } from './alert.service';
import { kSuccessData, kInternalError } from 'src/constants/responses';
@Controller('/admin/alert')
export class AlertController {
  constructor(private readonly service: AlertService) {}
  //to get fault in system and our loan process
  @Get('getDeprecationInSystem')
  async funGetDeprecationInSystem(@Res() res, @Query() query) {
    try {
      const data: any = await this.service.getDeprecationInSystem();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion
}
