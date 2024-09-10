import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { Key } from 'src/authentication/auth.guard';
import { UserService } from 'src/admin/user/user.service';
import { WebviewServiceV4 } from './webview.service.v4';

@Controller('webview')
export class WebviewControllerV4 {
  constructor(
    private readonly service: WebviewServiceV4,
    private readonly userService: UserService,
  ) {}

  @Get('getOTPTriggers')
  async funGetOTPTriggers(@Query() query, @Res() res) {
    try {
      const data = await this.service.getOTPTriggers(query);
      const errorMsg = data?.message;
      if (errorMsg) return res.json(k422ErrorMessage(errorMsg));

      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('validateResponse')
  async validateResponse(@Key() usersId, @Body() body, @Res() res) {
    try {
      const userId = usersId ?? body?.userId;
      const data = await this.service.validateResponse({ ...body, userId });
      let flowData = {};

      // Silent response to user
      if (data['message']) return res.json(kSuccessData);
      if (data.needUserInfo)
        flowData = await this.userService.getUserProfile({ userId: userId });

      data.hideKeyboard = true;
      return res.json({ ...kSuccessData, data: { ...data, ...flowData } });
    } catch (error) {
      return res.json(kSuccessData);
    }
  }
}
