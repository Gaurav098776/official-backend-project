// Imports
import { Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('mixPanel')
export class MixPanelController {
  @Post('trackEvent')
  async funTrackEvent(@Res() res) {
    try {
      return res.send(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
