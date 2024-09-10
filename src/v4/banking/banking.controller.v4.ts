// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import {
  kDashboardRoute,
  kReferralWalletRoute,
  kWebviewRoute,
} from 'src/constants/strings';
import { BankingSharedService } from 'src/shared/banking.service';
import { UserServiceV4 } from '../user/user.service.v4';
import { BankingServiceV4 } from './banking.service.v4';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CibilService } from 'src/shared/cibil.service';
import { DevOpsGuard, Key } from 'src/authentication/auth.guard';
import { NetbankingServiceV4 } from './netbanking.service.v4';

@Controller('banking')
export class BankingControllerV4 {
  constructor(
    private readonly service: BankingServiceV4,
    private readonly userService: UserServiceV4,
    private readonly sharedBankService: BankingSharedService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly cibilService: CibilService,
    private readonly netBankingService: NetbankingServiceV4,
  ) {}

  // Get all available bank list
  @Get('list')
  async funList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('newList')
  async newList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getNewList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Get netbanking flow json
  @Get('netbankingFlowDetails')
  async funNetBankingFlowDetails(@Query() query, @Res() res) {
    try {
      const aaData: any = await this.service.netbankingFlowDetails(query);
      if (aaData?.message) return res.send(aaData);
      let data: any = {};
      if (aaData.needUserInfo) {
        data = await this.userService.routeDetails({ id: query.userId });
        if (data.message) return res.send(data);
        data.userData.webviewData = aaData.webviewData;
        data.continueRoute = kWebviewRoute;
      }

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('ifscDetails')
  async funIfscDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.ifscDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('validateEligibility')
  async funValidateEligibility(@Key() userId, @Body() body, @Res() res) {
    try {
      if (!body?.userId) body.userId = userId;
      let data: any = await this.service.validateEligibility(body);
      if (data?.message) return res.send(data);
      // In app net banking
      const isFailedAttempt = data.isFailedAttempt == true;
      const referralFlow = data?.referralFlow == true ? true : false;
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        // Referral flow
        if (referralFlow) data.continueRoute = kReferralWalletRoute;
        if (isFailedAttempt) data.continueRoute = kDashboardRoute;
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('previousAAData')
  async funPreviousAAData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.previousAAData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('inviteForAA')
  async funInviteForAA(@Body() body, @Res() res) {
    try {
      const aaData: any = await this.service.inviteForAA(body);
      if (aaData?.message) return res.send(aaData);
      let data: any = {};
      if (aaData.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data.message) return res.send(data);
      }
      if (!aaData.existingConsent) {
        data.userData.webviewData = aaData.webviewData;
        data.continueRoute = kWebviewRoute;
      }

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('validateAA')
  async funValidateAA(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.validateAA(body);
      if (data?.message) return res.send(data);
      const referralFlow = data?.referralFlow == true ? true : false;
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (referralFlow) data.continueRoute = kReferralWalletRoute;
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('syncAAData')
  async syncAAData(@Body() body, @Res() res, @Req() req) {
    try {
      const data: any = await this.service.syncAAData(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        const profileData = await this.userService.routeDetails({
          id: data.userId,
        });
        if (profileData?.message) return res.send(data);
        const adminId = req.headers['adminid'];
        if (data?.notifyUser) {
          const notificationData = {
            userId: data.userId,
            adminId,
            userList: [data.userId],
            title: profileData.userData?.currentStepTitle ?? '',
            content: (profileData.userData?.currentStepInfo ?? '')
              .replace(/\#/g, '')
              .replace(/\*/g, ''),
          };
          await this.sharedNotification.sendNotificationToUser(
            notificationData,
          );
        }
        return res.send({ ...kSuccessData, data: profileData });
      }
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('tagSalaries')
  async funTagSalaries(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.tagSalaries(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('updateAccDetails')
  async funUpdateAccDetails(@Body() body, @Res() res) {
    try {
      let data: any = await this.sharedBankService.updateAccDetails(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('ifscList')
  async funIfscList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.ifscList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getPreviousCamsData')
  async funGetPreviousCams(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getPreviousCams(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @UseGuards(DevOpsGuard)
  @Post('CibilPersonalLoanScore')
  async funCibilPersonalLoanScore(@Body() body, @Res() res) {
    try {
      const data: any = await this.cibilService.cibilPersonalLoanScore(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('BulkCibilPersonalLoanScore')
  async funBulkCibilPersonalLoanScore(@Body() body, @Res() res) {
    try {
      const results: any = [];
      if (body.list) {
        for (let index = 0; index < body.list.length; index++) {
          const element = body.list[index];
          if (element.userId && element.loanId) {
            const data: any = await this.cibilService.cibilPersonalLoanScore(
              element,
            );
            results.push(data);
          }
        }
        return res.json({ ...kSuccessData, results });
      }
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('updateCibilScoreData')
  async funUpdateCibilScoreData(@Body() body, @Res() res) {
    try {
      const data: any = await this.cibilService.updateCibilScoreData();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('CibilPreScreen')
  async funCibilPreScreen(@Body() body, @Res() res) {
    try {
      const data: any = await this.cibilService.cibilPreScreen(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('findPendigOneMoneyUser')
  async findPendigOneMoneyUser(@Res() res) {
    try {
      const data: any = await this.service.findPendigOneMoneyUser();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('submitNetBankingTrigger')
  async submitNetBankingTrigger(@Body() body, @Res() res) {
    try {
      const data: any = await this.netBankingService.submitNetBankingTrigger(
        body,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('getLatestMonthBankStatement')
  async getLatestMonthBankStatement(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.sharedBankService.getLatestMonthBankStatement(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('prepareWebviewData')
  async funPrepareWebviewData(@Body() body, @Res() res) {
    try {
      const data: any = await this.netBankingService.prepareWebviewData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('convertBase64ToPdf')
  async funConvertBase64ToPdf(@Body() body, @Res() res) {
    try {
      const data: any = await this.netBankingService.convertBase64ToPdf(body);
      if (data?.message) return res.json(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
