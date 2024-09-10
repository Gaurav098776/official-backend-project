// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { ContactServiceV4 } from './contact.service.v4';

@Controller('contact')
export class ContactControllerV4 {
  constructor(private readonly service: ContactServiceV4) {}

  @Post('syncCallLogs')
  async funSyncCallLogs(@Body() body, @Res() res) {
    try {
      return res.send(kSuccessData);
      // const data: any = await this.service.syncCallLogs(body);
      // if (data?.message) return res.send(data);
      // return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('syncContacts')
  async funSyncContacts(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.syncContacts(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
