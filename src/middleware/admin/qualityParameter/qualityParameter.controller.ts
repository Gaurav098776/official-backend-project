import { Controller, Get, Res, Post, Body, Req, Query } from '@nestjs/common';
import {
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { QualityParameterService } from './qualityParameter.service';

@Controller('admin/qualityParameter')
export class QualityParameterController {
  constructor(private readonly service: QualityParameterService) {}

  @Get('getQualityParameter')
  async getQualityParameter(@Query() req, @Res() res) {
    try {
      const getDisabled = req?.getDisabled ?? false;
      const data: any = await this.service.getQualityParameter(
        true,
        getDisabled,
      );
      if (data?.message) return res.json(data);
      res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('addQualityParameter')
  async addQualityParameter(@Req() req, @Body() body, @Res() res) {
    try {
      const adminId = req.headers?.adminid ?? '';
      const data: any = await this.service.addQualityParameter(body, adminId);
      if (data?.message) return res.json(data);
      res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
