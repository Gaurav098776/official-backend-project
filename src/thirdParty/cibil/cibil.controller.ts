// Imports
import { CibilThirdParty } from './cibil.service';
import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { DevOpsGuard } from 'src/authentication/auth.guard';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('cibil')
export class CibilController {
  constructor(private readonly service: CibilThirdParty) {}

  @Post('CreditVisionScore')
  async funCreditVisionScore(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.CreditVisionScore(body);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('CreditVisionScorePersonalLoanScore')
  async funCreditVisionScorePersonalLoanScore(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.CreditVisionScorePersonalLoanScore(
        body,
      );
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('OnlinePrefill')
  async funOnlinePrefill(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.onlinePrefill(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('ConsumerCIRMultiSearchPath')
  async funConsumerCIRMultiSearchPath(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.consumerCIRMultiSearchPath(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkAllAPI')
  async funCheckAllAPI(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkAllAPI(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @UseGuards(DevOpsGuard)
  @Post('updateMockResponse')
  async funUpdateMockResponse(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateMockResponse(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
