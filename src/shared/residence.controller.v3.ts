import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { ResidenceSharedService } from './residence.service';

@Controller('shared/residence')
export class ResidenceSharedControllerV3 {
  constructor(private readonly service: ResidenceSharedService) {}

  @Post('validateAddress')
  async funValidateAddress(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.validateAddress(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
