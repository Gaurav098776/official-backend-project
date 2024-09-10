import { ElephantService } from './elephant.service';
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('elephant')
export class ElephantController {
  constructor(private readonly service: ElephantService) {}

  @Get('token')
  async funToken(@Res() res) {
    try {
      const data: any = await this.service.generateAuthToken();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('proposal')
  async funProposal(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.initiateProposal(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkInsuranceStatus')
  async checkInsuranceStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funCheckInsuranceStatus(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
