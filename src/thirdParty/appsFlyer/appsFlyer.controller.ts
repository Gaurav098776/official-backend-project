// Imports
import {
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { AppsFlyerService } from './appsFlyer.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';

@Controller('thirdparty/appsflyer')
export class AppsFlyerController {
  constructor(private readonly service: AppsFlyerService) {}

  @Post('syncMissingData')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async funSyncMissingData(@UploadedFile() file, @Res() res) {
    try {
      const data: any = await this.service.syncMissingData({ file });
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
