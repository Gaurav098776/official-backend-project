// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ipMasterService } from './ipMaster.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('admin/ipMaster')
export class ipMasterController {
  constructor(private readonly ipService: ipMasterService) {}

  // get ipMasterlist api
  @Post('getIpMasterList')
  async getIpMasterList(@Body() body, @Res() res) {
    try {
      const data: any = await this.ipService.getIpMasterList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //update ipMasterlist api
  @Post('updateIpMasterList')
  async updateIpMasterList(@Body() body, @Res() res) {
    try {
      const data: any = await this.ipService.updateIpMasterList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
