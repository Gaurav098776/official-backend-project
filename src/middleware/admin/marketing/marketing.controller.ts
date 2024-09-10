import {
  Controller,
  Post,
  Get,
  Res,
  Body,
  UseInterceptors,
  Query,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { MarketingService } from './marketing.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CreditAnalystService } from '../admin/creditAnalystRedis.service';
import { kUploadFileObj } from 'src/constants/objects';
@Controller('admin/marketing')
export class MarketingController {
  constructor(
    private readonly service: MarketingService,
    private readonly creditAnalyst: CreditAnalystService,
  ) {}

  @Post('manageBanner')
  @UseInterceptors(FilesInterceptor('files'))
  async funManageBanner(@UploadedFiles() files, @Body() body, @Res() res) {
    try {
      const data: any = await this.service.funManageBanner({ files, body });
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('storeBanners')
  async storeBanners(@Res() res) {
    try {
      const data: any = await this.creditAnalyst.storeBanners();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getBannersData')
  async funGetBannersData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetBannersData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('getBulkWhatsAppData')
  async funGetBulkWhatsAppData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getBulkWhatsAppData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Post('sendBulkWhatsAppData')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async funSendBulkWhatsAppData(
    @UploadedFile() file,
    @Body() body,
    @Res() res,
  ) {
    try {
      body.file = file;
      const data: any = await this.service.sendBulkWhatsAppData({ body, file });
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
    }
  }
}
