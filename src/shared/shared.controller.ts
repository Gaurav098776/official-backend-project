// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  kBadRequest,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { EligibilitySharedService } from './eligibility.shared.service';
import { MigrationSharedService } from './migration.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { DevOpsGuard, SensitiveGuard } from 'src/authentication/auth.guard';
import { CommonSharedService } from './common.shared.service';
import { EmiSharedService } from './emi.service';
import { ContactSharedService } from './contact.service';
import { k500Error } from 'src/constants/misc';
import { SharedTransactionService } from './transaction.service';
import { ReferralSharedService } from './referral.share.service';
import { UserSharedService } from './user.share.service';
import { UserService } from 'src/admin/user/user.service';
import { CalculationSharedService } from './calculation.service';

@Controller('shared')
export class SharedController {
  constructor(
    private readonly eligibility: EligibilitySharedService,
    private readonly migration: MigrationSharedService,
    private readonly sharedEMI: EmiSharedService,
    private readonly userService: UserServiceV4,
    private readonly commonService: CommonSharedService,
    private readonly sharedContacts: ContactSharedService,
    private readonly sharedTransaction: SharedTransactionService,
    private readonly sharedReferral: ReferralSharedService,
    private readonly sharedUser: UserSharedService,
    private readonly adminUserService: UserService,
    private readonly calculation: CalculationSharedService,
  ) {}

  @Post('removeFromCoolOff')
  async funRemoveFromCoolOff(@Body() body, @Res() res) {
    try {
      const data: any = await this.adminUserService.removeFromCoolOff(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('validateStateWiseEligibility')
  async funValidateStateWiseEligibility(@Body() body, @Res() res) {
    try {
      const data: any = await this.eligibility.validateStateWiseEligibility(
        body,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkInterestRate')
  async funCheckInterestRate(@Body() body, @Res() res) {
    try {
      const data: any = await this.commonService.getEligibleInterestRate(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region addOrUpdateStaticConfig
  @Post('addOrUpdateStaticConfig')
  async addOrUpdateStaticConfig(@Body() body, @Res() res) {
    try {
      const data: any = await this.commonService.addOrUpdateStaticConfig(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#endregion
  @Get('migrateMasterLoanRejactByBank')
  async migrateMasterLoanRejactByBank(@Query() query, @Res() res) {
    try {
      const data: any = await this.migration.migrateMasterLoanRejactByBank(
        query,
      );
      if (data?.message) return res.send(data);

      if (data?.userIds) {
        for (let index = 0; index < data?.userIds?.length; index++) {
          if (index % 100 == 0) console.log(index);
          await this.userService.routeDetails({
            id: data?.userIds[index],
          });
        }
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region refresh insurance array value
  @Get('refreshInsuranceArray')
  async refreshInsuranceArray(@Res() res) {
    try {
      const data: any = await this.commonService.refreshInsuranceArray();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region Scoring

  //#region Scoring
  @Get('calculateScore')
  async funCalculateScore(@Query() query, @Res() res) {
    try {
      const data: any = await this.eligibility.calculateScore(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  @UseGuards(SensitiveGuard)
  @Post('changeScoreJson')
  async funChangeScoreJson(@Body() body, @Res() res) {
    try {
      const data: any = await this.eligibility.changeScoreJson(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Post('refreshUserStage')
  async funRefreshUserStage(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.refreshUserStage(body);
      if (data?.message) return res.send(data);

      if (data?.userIds) {
        for (let index = 0; index < data?.userIds?.length; index++) {
          if (index % 100 == 0) console.log(index);
          const response = await this.userService.routeDetails({
            id: data?.userIds[index],
            // isAdminReq: true
          });
          if (response.message) console.log({ id: data?.userIds[index] });
          console.log(response?.continueRoute);
        }
      }

      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('getTansactionQueryParams')
  async getTansactionQueryParams(@Query() query, @Res() res) {
    try {
      const data: any = await this.commonService.getTansactionQueryParams(
        query?.loanId,
        query?.isCheckAddional ?? false,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('checkNReVerifyBank')
  async funCheckNReVerifyBank(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.checkNReVerifyBank(body);
      if (data?.userIds) {
        for (let index = 0; index < data?.userIds?.length; index++) {
          if (index % 100 == 0) console.log(index);
          const response = await this.userService.routeDetails({
            id: data?.userIds[index],
            // isAdminReq: true
          });
          if (response.message) console.log({ id: data?.userIds[index] });
          console.log(response?.continueRoute);
        }
      }
    } catch (error) {}
  }

  @Post('refreshCalculation')
  async funRefreshCalculation(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedEMI.refreshCalculation(body.loanId);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('migrateVerifiedSalaryDate')
  async funMigrateVerifiedSalaryDate(@Res() res) {
    try {
      await this.migration.migrateVerifiedSalaryDate();
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // migration api for adminId to FollowerId in Transaction
  @Post('oldCrmToLastCrmInUser')
  async funOldCrmToLastCrmInUser(@Res() res) {
    try {
      const data: any = await this.migration.oldCrmToLastCrmInUser();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('migrateFollowerIdInTransaction')
  async migrateFollowerIdInTransaction(@Query() query, @Res() res) {
    try {
      const data = await this.migration.migrateFollowerIdInTransaction(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('migrateTansactionCompletionDate')
  async migrateTansactionCompletionDate(@Body() body, @Res() res) {
    try {
      const data = await this.migration.migrateTansactionCompletionDate();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // migrate not updated WorkMail Status
  @Get('migrateWorkMailStatus')
  async migrateWorkMailStatus(@Res() res) {
    try {
      const data: any = await this.migration.migrateWorkMailStatus();
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('syncRemainingContacts')
  async funSyncRemainingContacts(@Res() res) {
    try {
      await this.sharedContacts.syncRemainingContacts();
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // SENSITIVE TEST API
  @UseGuards(DevOpsGuard)
  @Post('checkLoanEligibility')
  async funCheckLoanEligibility(@Body() body, @Res() res) {
    try {
      const data: any = await this.eligibility.checkLoanEligibility(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('resetAffectedUsers')
  async funResetAffectedUsers(@Res() res) {
    try {
      const data: any = await this.migration.resetAffectedUsers();
      if (data?.message) return res.send(data);
      if (data?.userIds) {
        for (let index = 0; index < data?.userIds?.length; index++) {
          if (index % 100 == 0) console.log(index);
          const response = await this.userService.routeDetails({
            id: data?.userIds[index],
          });
          if (response.message) console.log({ id: data?.userIds[index] });
        }
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('checkCFOrder')
  async funCheckCFOrder(@Query() query, @Res() res) {
    try {
      //Params validation
      const loanId: number = query?.loanId;
      if (!loanId) return res.json(kParamsMissing);
      const checkAllPending = query?.checkAllPending ?? false;
      const data = await this.sharedTransaction.checkCFOrder(
        loanId,
        checkAllPending,
      );
      if (data == k500Error) return res.json(kInternalError);
      else if (data == false) return res.json(kBadRequest);
      return res.send({ ...kSuccessData, data });
    } catch (error) {}
  }

  @Post('addReferral')
  async addReferral(@Body() body, @Res() res) {
    try {
      const data = await this.sharedReferral.addReferral(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('migrateRejectReason')
  async funMigrateRejectReason(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateRejectReason();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // migrate old user's categorization due to employement startdate missing
  @Post('migrateUserCategorization')
  async migrateUserCategorization(@Res() res) {
    try {
      const data: any = await this.migration.migrateUserCategorization();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //sgst and cgst migration
  @Post('migrateCgstAndSgstAmount')
  async funMigrateCgstAndSgstAmount(@Res() res) {
    try {
      const data: any = await this.migration.migrateCgstAndSgstAmount();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //migration kyc lat log
  @Post('migrateKYCLatLongToPoint')
  async migrateKYCLatLongToPoint(@Res() res) {
    try {
      const data: any = await this.migration.migrateKYCLatLongToPoint();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //migrate delete error files
  @Post('migrateDeleteErrorFiles')
  async funMigrateDeleteErrorFiles(@Res() res) {
    try {
      const data: any = await this.migration.migrateDeleteErrorFiles();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //migrate loanCompletionDate
  @Post('migrateLoanCompletionDate')
  async funMigrateLoanCompletionDate(@Res() res) {
    try {
      const data: any = await this.migration.migrateLoanCompletionDate();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // check stuck user's RouteDetails (ex.after disbursement)
  @Get('checkStuckRouteDetails')
  async funCheckStuckRouteDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.sharedUser.checkStuckRouteDetails(query);
      if (data?.message) return res.json(data);
      if (data.length > 0) {
        for (let index = 0; index < data.length; index++) {
          try {
            const id = data[index];
            if (index % 100 == 0) console.log(index);
            const response: any = await this.userService.routeDetails({ id });
            if (response?.message) console.log('Route Error', id);
            console.log(response?.continueRoute);
          } catch (error) {}
        }
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  //migrate loan Unbalanced status
  @Post('migrateLoanBalancedStatus')
  async funMigrateLoanBalancedStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateLoanBalancedStatus(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //migrate  aadhaarResponse column address related keys to aadhaarAddress column in KYCentities
  @Get('migrateAadhaarResponseToAadhaarAddress')
  async funMigrateAadhaarResponseToAadhaarAddress(@Res() res) {
    try {
      const data: any =
        await this.migration.migrateAaddharResponseToAadhaarAddress();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //migrate user from blacklist and cooloff to active for company blaclist
  @Get('migrateCoolOffUSer')
  async migrateCoolOffUSer(@Res() res) {
    try {
      const data: any = await this.migration.migrateCoolOffUSer();
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('sendDisbursementLimitRaisedWhatsAppMsg')
  async funSendDisbursementLimitRaisedWhatsAppMsg(@Res() res) {
    try {
      const data: any =
        await this.commonService.sendDisbursementLimitRaisedWhatsAppMsg();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //Send notification and whatsapp message when CoolOff is over
  @Get('completionOfCoolOffUSer')
  async completionOfCoolOffUSer(@Res() res) {
    try {
      const data: any = await this.sharedUser.completionOfCoolOffUSer();
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //migrate loan feesIncome
  @Get('migrateLoanfeesIncome')
  async migrateLoanfeesIncome(@Res() res) {
    try {
      const data: any = await this.migration.migrateLoanfeesIncome();
      if (data?.message) return res.send(data);
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('calculateCLTV')
  async funCalculateCLTV(@Body() body, @Res() res) {
    try {
      const data = await this.calculation.calculateCLTV(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('migrateNewUserData')
  async funMigrateNewUserData(@Body() Body, @Res() res) {
    try {
      const data: any = await this.migration.migrateNewUserData(Body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('migrateExistingUser')
  async funMigrateExistingUser(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateExistingUser(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.log({ error });
      return res.json(kInternalError);
    }
  }

  @Post('migrateExistingUserv2')
  async funMigrateExistingUserV2(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateExistingUserV2(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.log({ error });
      return res.json(kInternalError);
    }
  }

  // migrate loan reject reason
  @Post('migrateLoanRejectRemark')
  async funMigrateLoanRejectRemark(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateLoanRejectRemark(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('migrateKycData')
  async migrateKycData(@Res() res) {
    try {
      const data: any = await this.migration.migrateKycData();
      if (data?.message) return res.send(data);
      return res.json(kSuccessData);
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('migratePredictionData')
  async funMigratePredictionData(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migratePredictionData();
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('migrateIntrestRate')
  async funMigrateIntrestRate(@Query() query, @Res() res) {
    try {
      const data: any = await this.migration.migrateIntrestRate(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  //start region migrate upi payments mismatched date data
  @Post('migrateUpiMismatchedDateData')
  async funMigrateUpiMismatchedDateData(@Body() body, @Res() res) {
    try {
      const data: any = await this.migration.migrateUpiMismatchedDateData(body);
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('adminAutoLogout')
  async adminAutoLogout(@Res() res) {
    try {
      const data: any = await this.commonService.adminAutoLogout();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('splitPaymentsforPI')
  async funSplitPaymentsforPI(@Body() body) {
    return await this.calculation.splitPaymentsforPI(body);
  }

  // migrate user to bank under verification for loan offer screen
  @Post('migrateUserFromFVtoBank')
  async funMigrateUserFromFVtoBank(@Res() res) {
    try {
      const data: any = await this.migration.migrateUserFromFVtoBank();
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('reCalculatePaidAmounts')
  async funReCalculatePaidAmounts(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedTransaction.reCalculatePaidAmounts(
        body,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('migrateUserPhone')
  async migrateUserPhone(@Res() res) {
    try {
      const data: any = await this.migration.migrateUserPhone();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('migrationCltvData')
  async funmigrationCltvData(@Body() body, @Res() res) {
    const data: any = await this.migration.migrationCltvData(body);
    if (data?.message) return res.send(data);
    return res.send({ ...kSuccessData, data });
  }
  
  @Post('addMissingCompany')
  async funaddMissingCompany(@Body() body, @Res() res) {
    const data: any = await this.migration.addMissingCompany(body);
    if (data?.message) return res.send(data);
    return res.send({ ...kSuccessData, data });
  }

  @Post('checkUserEligiblity')
  async funCheckUserEligiblity(@Body() body, @Res() res) {
    try {
      const data: any = await this.eligibility.checkUserEligiblity(
        body?.userId,
      );
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  
  @Post('getUserIdFromPhone')
  async funGetUserIdFromPhone(@Body() body, @Res() res) {
    try {
      const data: any = await this.commonService.funGetUserIdFromPhone(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  
  @Post('migrateAddressData')
  async funMigrateActiveLoanAddresses(@Body() body, @Res() res) {
    try {
      const limit = body?.limit ?? 100;
      const offset = body?.offset ?? 0;
      const data: any = await this.migration.migrateActiveLoanAddress(
        limit,
        offset,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('addCompanyDataInCompanyRepo')
  async finAddCompanyDataInCompanyRepo(@Body() body, @Res() res) {
    console.log('herer')
    const data:any=await this.migration.addCompanyDataInCompanyRepo()
    if(data?.message) return res.send(data)
      return res.send({...kSuccessData, data })
  }
}
