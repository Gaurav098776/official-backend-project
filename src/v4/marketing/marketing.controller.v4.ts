import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { SharChatService } from 'src/thirdParty/sharChat/sharChat.service';

@Controller('marketing')
export class MarketingControllerV4 {
  constructor(private readonly sharChatService: SharChatService) {}
  @Post('sharChatPostback')
  async funSharChatPostback(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharChatService.sharChatPostback(body);
      if (data?.message && data?.valid === false) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
