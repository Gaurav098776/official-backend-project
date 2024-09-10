import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { WhatsAppService } from './whatsApp.service';
import { k422Error, k500Error } from 'src/constants/misc';

@Controller('whatsApp/')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Post('sendMessage')
  async sendWhatsAppMessage(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.sendWhatsAppMessageMicroService(
        body,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      return kInternalError;
    }
  }

  @Post('webhook')
  async storeWhatsAppWebhook(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.storeWhatsAppWebhookResponse(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      return kInternalError;
    }
  }

  // start region send whatsapp campaign message
  @Post('sendCampaignMessage')
  async funSendCampaignMessage(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.sendCampaignMessage(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData });
    } catch (error) {
      return kInternalError;
    }
  }
  // end region
}
