// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kParamMissing, kSuccessData } from 'src/constants/responses';
import { SendGridService } from './sendGrid.service';

@Controller('/sendGrid')
export class SendGridController {
  constructor(private readonly service: SendGridService) {}

  @Post('sendMail')
  async funSendMail(@Body() body, @Res() res) {
    try {
      const email = body?.email;
      const subject = body?.subject;
      if (!subject) return kParamMissing('subject');
      if (!email) return kParamMissing('email');
      const html = body?.html;
      const attachments = body.attachments ?? [];
      const ccMail = body.cc ?? [];
      const bccMail = body.bcc ?? [];
      const tags = body?.tags ?? [];
      const data: any = await this.service.sendMail(email,subject,html,attachments,ccMail,bccMail,tags,body?.replyTo,body?.from);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
