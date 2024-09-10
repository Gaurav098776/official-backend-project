// Imports
import { Get, Query, Res, Post, Body, Controller } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { BankingSharedService } from 'src/shared/banking.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { BankingService } from './banking.service';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('admin/banking')
export class BankingController {
  constructor(
    private readonly service: BankingService,
    private readonly userService: UserServiceV4,
    private readonly sharedBankService: BankingSharedService,
  ) {}

  @Get('aaBanks')
  async funAABanks(@Res() res) {
    try {
      const data = await this.service.aaBanks();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //#region get verification data
  @Get('verificationData')
  async getBankVerificationData(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.funGetVerificationData(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //#endregion

  @Get('findIfscDetails')
  async findIfscDetails(@Res() res, @Query() query) {
    try {
      const data: any = await this.service.findIfscDetails(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // Admin panel -> verification/bankStatements
  @Post('changeNetBankingStatus')
  async funUpdateNetBankingStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.changeNetBankingStatus(body);
      // Refresh user stage
      await this.userService.routeDetails({ id: body.userId ?? data?.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //#region update net banking statment
  @Post('updateAdditionalAccountFlag')
  async funChangeIsNeedAdditionalStatus(@Body() body, @Res() res) {
    try {
      const result: any = await this.service.changeIsNeedAdditionalStatus(body);
      if (result?.message) return res.send(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  @Post('backInToBank')
  async funBackInToBank(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funBackInToBank(body);
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('skipBankstatement')
  async funSkipBankstatement(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.funSkipStatement(body);
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('updateAccountDetails')
  async updateAccDetails(@Body() body, @Res() res) {
    try {
      const data = await this.sharedBankService.updateAccDetails(body);
      if (data.message) return res.json(data);
      await this.userService.routeDetails({ id: body.userId });
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('uploadAdditionalStatement')
  async uploadAdditionalStatement(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedBankService.uploadAdditionalStatement(
        body,
      );
      if (data.message) return res.json(data);
      await this.userService.routeDetails({ id: body.userId });
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('/getAllBankStatement')
  async funGetAllBankStatement(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetAllBankStatement(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migrateSkipBankStatementData')
  async migrateSkipBankStatementData(@Res() res) {
    try {
      const data = await this.service.migrateSkipBankStatementData();
      return res.json({ ...kSuccessData });
    } catch (error) {
      return;
    }
  }

  // Let users try again if response is not received from AA server in n minutes
  @Post('resetAAStuckUsers')
  async funResetAAStuckUsers(@Res() res) {
    try {
      await this.service.resetAAStuckUsers();
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('getBankingDataByLoanId')
  async fungetBankingDataByLoanId(@Query() query, @Res() res) {
    try {
      //Params validation
      const loanId: number = +query.loanId;
      if (!loanId) return res.json(kParamsMissing);
      const data = await this.service.gatherBankingDataByLoanId(loanId);
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //#region Account aggregator
  @Get('aaInsights')
  async funAAInsights(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.aaInsights(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kSuccessData);
    }
  }

  @Post('checkAABalance')
  async funCheckAABalance(@Body() body, @Res() res) {
    try {
      // Multiple checks
      if (body.loanIds) {
        let success = 0;
        let failed = 0;
        const emiIds = body.emiIds ?? [];
        for (let index = 0; index < body.loanIds?.length; index++) {
          try {
            const loanId = body.loanIds[index];
            const reqData = { ...body, loanId };
            if (emiIds.length >= index) {
              reqData.emiId = emiIds[index];
            }
            const response: any = await this.service.checkAABalance(reqData);
            if (response.message) failed++;
            else success++;
          } catch (error) {}
        }
        const data = { success, failed };
        return res.send({ ...kSuccessData, data });
      }
      // Single checks
      else {
        const data: any = await this.service.checkAABalance(body);
        if (data?.message) return res.send(data);
        return res.send({ ...kSuccessData, data });
      }
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('syncAABalance')
  async funSyncAABalance(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.syncAABalance(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('reinitAAConsentUsers')
  async funReinitAAConsent(@Res() res) {
    try {
      const data: any = await this.service.funReinitAAConsent();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion  Account aggregator

  // check pending AA response and update account details for cron api
  @Post('getPendingAAResponse')
  async funGetPendingAAResponse(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getPendingAAResponse(body);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // update blank mandateAccount for cron api
  @Post('updateBlankMandateAccount')
  async funUpdateBlankMandateAccount(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateBlankMandateAccount(body);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // get bank list api
  @Post('getAllBankList')
  async getAllBankList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getAllBankList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //update bank list api
  @Post('updateAllBankList')
  async updateBankList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateBankList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('netBankingStuckUsersNotify')
  async netBankingStuckUsers(@Res() res) {
    try {
      const data: any = await this.service.netBankingStuckUsersNotify();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  //#region
  @Post('updateAdditionalIfsc')
  async funUpdateAdditionalIfsc(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkNUpdateAddtionalIfsc(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion

  //#region
  @Post('updateAccountDetials')
  async updateAccountDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateBankDetail(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  //#endregion

  //#region
  @Get('getBankingDataByUserId')
  async fungetBankingDataByUserId(@Query() query, @Res() res) {
    try {
      //Params validation
      const data: any = await this.service.getBankingDataByUserId(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //new update bank list api
  @Post('updateNewAllBankList')
  async updateNewBankList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateNewBankList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // new get bank list api
  @Post('getNewAllBankList')
  async getNewAllBankList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getNewAllBankList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('dailyBankStatementUpdate')
  async dailyBankStatementUpdate(@Res() res) {
    try {
      const data: any = await this.sharedBankService.dailyBankStatementUpdate();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('sendSummaryToSlack')
  async funSendSummaryToSlack(@Body() body, @Res() res) {
    const data: any = await this.sharedBankService.sendSummaryToSlack(body);
    if (data?.message) return res.send(data);
    return res.send({ ...kSuccessData, data });
  }
}
