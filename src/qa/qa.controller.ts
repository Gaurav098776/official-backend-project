// Imports
import { QAService } from './qa.service';
import { TestOpsGuard } from 'src/authentication/auth.guard';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';

@UseGuards(TestOpsGuard)
@Controller('admin/qa')
export class QAController {
  constructor(private readonly service: QAService) {}

  // Purpose -> Automation testing
  @Post('bulkEMIDetails')
  async funBulkEMIDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.bulkEMIDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  // Purpose -> Automation testing
  @Post('getLoanEmiTransData')
  async fungetLoanEmiTransData(@Body() body, @Res() res) {
    try {
      const data = await this.service.getLoanEmiTransData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
