import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { MediaSharedService } from 'src/shared/media.service';

@Controller('media')
export class MediaControllerV4 {
  constructor(private readonly mediaSharedService: MediaSharedService) {}

  @Post('uploadMedia')
  async funUploadMedia(@Body() body, @Res() res) {
    try {
      const docUrl: string = body.url;
      const type: string = body.type;
      const userId: string = body.userId ?? '';
      const docType: string = body.docType ?? 'Other';
      const password: string = body.password ?? '';
      const adminId = body?.adminId;
      const fromMobile = body?.fromMobile ?? false;
      if (!docUrl && !type && !adminId) return res.json(kParamsMissing);
      const mediaData: any = {
        docType,
        docUrl,
        password,
        type,
        userId,
        adminId,
        fromMobile,
      };
      const result = await this.mediaSharedService.uploadMediaToCloud(
        mediaData,
      );
      if (result == k500Error) return res.json(kInternalError);
      return res.json({ valid: true, data: { mediaUrl: result.docUrl } });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('deleteMedia')
  async funDeleteMedia(@Body() body, @Res() res) {
    try {
      const docId: number = +body?.docId;
      if (!docId) return res.json(kParamsMissing);
      const result: any = await this.mediaSharedService.deleteRowData(docId);
      if (result == k500Error) return res.json(kInternalError);
      if (result.message) return res.json(result);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
