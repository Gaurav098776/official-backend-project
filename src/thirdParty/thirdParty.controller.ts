import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { AutomationService } from './automation/automation.service';

@Controller('thirdParty/')
export class ThirdPartyController {
  constructor(private readonly automation: AutomationService) {}

  @Post('automation/updatePorts')
  async funUpdatePorts(@Body() body, @Res() res) {
    try {
      const data: any = await this.automation.updatePorts(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('automation/verifyContacts')
  async funVerifyContacts(@Body() body, @Res() res) {
    try {
      const data = await this.automation.verifyContacts(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('angularLog')
  async angularLog(@Body() body, @Res() res) {
    try {
      return res.send({ ...kSuccessData });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
