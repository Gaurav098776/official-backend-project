// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { Key } from 'src/authentication/auth.guard';
import { ReferralServiceV4 } from './referral.service.v4';
import { UserServiceV4 } from '../user/user.service.v4';

@Controller('referral')
export class ReferralControllerV4 {
  constructor(
    private readonly service: ReferralServiceV4,
    private readonly userService: UserServiceV4,
  ) {}

  @Post('checkReferralCode')
  async checkReferralCode(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.checkReferralCode(body);
      if (data?.message) return res.json(data);
      if (data.needUserInfo) {
        const referralApplied = data?.referralApplied == true ? true : false;
        data = await this.userService.routeDetails({ id: body.userId });
        if (referralApplied) data.userData.referralApplied = referralApplied;
        if (data?.message) return res.send(data);
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('referralData')
  async getReferralData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getReferralData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('referralAmountBalance')
  async funReferralAmountBalance(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.referralAmountBalance(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('referralActivity')
  async funReferralActivity(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.referralActivity(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('referralWithdraw')
  async funReferralWithdraw(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.referralWithdraw(body);
      if (data?.message) return res.json(data);
      if (data?.continueRoute) {
        const routData = await this.userService.routeDetails({
          id: body.userId,
        });
        data.userData = routData?.userData ? routData.userData : {};
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('topReferralData')
  async getTopReferralData(@Key() userId, @Res() res) {
    try {
      const data: any = await this.service.getTopReferralData({ userId });
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
