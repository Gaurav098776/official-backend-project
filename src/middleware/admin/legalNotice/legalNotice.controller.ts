import { Controller } from '@nestjs/common';
import { Body, Post, Res } from '@nestjs/common/decorators';
import {
  k409ErrorMessage,
  kInternalError,
  kParamsMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import { kNotUpdated, kUpdateDataSuccessfully } from 'src/constants/strings';
import { LegalNoticeService } from './legalNotice.service';

@Controller('admin/legalNotice')
export class LegalNoticeController {
  constructor(private readonly service: LegalNoticeService) {}

  //status [0=physical,1=email,2=whatsapp,3=recived]
  @Post('updateLegalNoticeStatus')
  async updateLegalNoticeStatue(@Body() body, @Res() res) {
    try {
      if (!body || !body.id || !body.status || !body.adminId)
        return res.json(kParamsMissing);
      if (body.isSent) {
        if (!body.sendDate) return res.json(kParamsMissing);
      }
      const result = await this.service.updateLegalNoticestatus(body);
      if (result?.message) return res.json(result);
      else if (result.toString() == '0')
        return res.json(k409ErrorMessage(kNotUpdated));
      else return res.json(kSUCCESSMessage(kUpdateDataSuccessfully));
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
