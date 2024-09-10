// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { ResidenceService } from './residence.service';

@Controller('admin/residence')
export class ResidenceController {
  constructor(private readonly service: ResidenceService) {}
  //#region update residence status
  @Post('changeResidenceStatus')
  async funResidenceStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.changeResidenceStatus(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('addressList')
  async funAddressList(@Query() query, @Res() res) {
    try {
      const data : any = await this.service.addressList(query);
      if (data?.message) return res.send(data);
      return res.send({...kSuccessData, data});

    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
