// Imports
import { LegalServiceV3 } from './legal.service.v3';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('legal')
export class LegalControllerV3 {
  constructor(private readonly service: LegalServiceV3) {}

  //#region when loan Active then call api to change status
  @Get('legalDetails')
  async funLegalDteails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.addLegalDocs(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion
}
