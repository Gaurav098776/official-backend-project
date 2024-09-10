// Imports
import { Controller, Get, Res } from '@nestjs/common';
import { DocService } from './doc.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('doc')
export class DocController {
  constructor(private readonly service: DocService) {}

  @Get()
  async funGet(@Res() res) {
    try {
      const data: any = await this.service.list();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
