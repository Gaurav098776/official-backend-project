// Imports
import { Injectable } from '@nestjs/common';
import { nInsertLog } from 'src/constants/network';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';

@Injectable()
export class MetricsServiceV4 {
  constructor(private readonly sharedService: MetricsSharedService) {}

  private async kLoginSplashScreenFlow(reqData) {
    const loginAPITriggers = [
      {
        // Metrics #01 -> first APP loads
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 3,
          values: { Activity: 'APP_OPENED', step: reqData.step }, // values error or something
        },
      },
      {
        // Metrics #02 -> For Update pop-up
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 2,
          values: { Activity: 'LOGIN', step: 2 }, // values error or something
        },
      },
      {
        // Metrics #03 -> Cliking On Login Button
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 3,
          values: { Activity: 'LOGIN', step: 3 }, // values error or something
        },
      },
      {
        // Metrics #04 -> Reading Permission and Agree to policy
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 2,
          values: { Activity: 'LOGIN', step: 4 }, // values error or something
        },
      },
      {
        // Metrics #05 -> Phone Number Enter Screen
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 2,
          values: { Activity: 'LOGIN', step: 5 }, // values error or something
        },
      },
      {
        // Metrics #06 -> OTP Enter Screen
        url: nInsertLog,
        method: 'POST',
        needWebResponse: false,
        body: {
          loanId: reqData.loanId,
          userId: reqData.userId,
          type: 3, // login
          subType: 1, // 1 -> APP login screen, 2 -> web APP
          status: 2,
          values: { Activity: 'LOGIN', step: 6 }, // values error or something
        },
      },
    ];
    const reqBody = {
      deviceId: reqData.deviceId,
      type: 3, // login
      subType: 1, // 1 -> APP login screen, 2 -> web APP
      status: reqData.status,
      values: {
        Activity: reqData.activity,
        step: reqData.step,
        error: reqData.error,
      }, // values error or something
    };
    const response: any = await this.sharedService.insertLog(reqBody);
    if (response?.message) return reqBody;
    return true;
  }
}
