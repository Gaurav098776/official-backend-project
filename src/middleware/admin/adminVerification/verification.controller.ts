// Imports
import { AdminVerificationService } from './verification.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { FinalVerificationService } from './finalVerification.service';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('admin/verification')
export class AdminVerificationController {
  constructor(
    private readonly service: AdminVerificationService,
    private readonly finalService: FinalVerificationService,
  ) {}

  @Get('employementVerificationData')
  async funGetAllEmployementVerificationData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getEmployementVerificationData(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('bankStatementVerification')
  async funGetbankStatementVerification(@Query() query, @Res() res) {
    try {
      const data = await this.service.funGetBankStatementVerificationData(
        query,
      );
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('residenceVerification')
  async funResidenceVerification(@Query() query, @Res() res) {
    try {
      const data = await this.service.funResidenceVerification(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('selfieVerification')
  async funSelfieVerificaiton(@Query() query, @Res() res) {
    try {
      const data = await this.service.funSelfieVerification(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('contactVerification')
  async funContactVerification(@Query() query, @Res() res) {
    try {
      const data = await this.service.funContactVerificaion(query);

      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('kycVerification')
  async funKycVerification(@Query() query, @Res() res) {
    try {
      const data = await this.service.funKycVerification(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('finalVerificationData')
  async finalVerificationData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funFinalVerificationData(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('eMandateVerificationData')
  async funEmandateVerificationData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funEmandateVerificationData(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('esignVerificationData')
  async funEsignVerificationData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funEsignVerificationData(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('disburesementVerificationData')
  async funDisburesementVerificationData(@Query() query, @Res() res) {
    try {
      const data = await this.service.funDisburesementVerificationData(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('/getAllVerificationCount')
  async funGetAllVerificationCount(@Res() res) {
    try {
      const data: any = await this.service.funGetAllVerificationCount();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/updateDates')
  async funUpdateDates(@Res() res) {
    try {
      const data: any = await this.service.updateDates();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get list of Redirect by loanId
  @Post('/redirectToSpecificStep')
  async redirectToSpecificStep(@Body() body, @Res() res) {
    try {
      const data = await this.service.redirectToSpecificStep(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get base details
  @Get('/getBaseDetails')
  async getBaseDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getBaseDetails(query?.userId);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get loan details  by userId
  @Get('/getLoanDetails')
  async getLoanDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getLoanDetails(query?.loanId);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion
  @Get('pendingCount')
  async funPendingCount(@Res() res) {
    try {
      const data: any = await this.service.pendingCount();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('employment')
  async funEmployment(@Res() res) {
    try {
      const data: any = await this.service.employment();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('employmentDetails')
  async funEmploymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.employmentDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('banking')
  async funBnaking(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.banking(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('reFetchBankVerification')
  async funRefetchBankVerification(@Body() body, @Res() res) {
    try {
      await this.service.reFetchBankVerification(body);
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('residence')
  async funResidence(@Res() res) {
    try {
      const data: any = await this.service.residence();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('selfie')
  async funSelfie(@Res() res) {
    try {
      const data: any = await this.service.selfie();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('contact')
  async funContact(@Res() res) {
    try {
      const data: any = await this.service.contact();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('kyc')
  async funKyc(@Res() res) {
    try {
      const data: any = await this.service.kyc();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('finalApproval')
  async funFinalApproval(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.finalApproval(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('eMandate')
  async funEMandate(@Res() res) {
    try {
      const data: any = await this.service.eMandate();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('eSign')
  async funESign(@Res() res) {
    try {
      const data: any = await this.service.eSign();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('disbursement')
  async funDisbursement(@Res() res) {
    try {
      const data: any = await this.service.disbursement();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#region get Company details count
  @Get('/getCompanyDetails')
  async getCompanyDetails(@Query() query, @Res() res) {
    try {
      const data = await this.finalService.getCompanyDetails(
        query?.companyName,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get Crm count
  @Get('/getCrmCount')
  async getCrmCount(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getCrmCount(query?.loanId);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get name mismatch
  @Get('/getNameMissmatch')
  async getNameMissmatch(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getNameMissmatch(query?.loanId);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  // clon migrate api for move Stuck User In Final Bucket
  @Post('migrateUserInFB')
  async migrateUserInFB(@Res() res) {
    try {
      const data: any = await this.service.migrateUserInFB();
      if (data.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region get cibil score data by loanId
  @Post('/getCibilScoreData')
  async getCibilScoreData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getCibilScoreData(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUserTrackinglogs')
  async funGetUserTrackingLogs(@Res() res, @Query() query) {
    try {
      const data = await this.service.getUserTrackingLogs(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get User Data which match aadhar location under 5km
  @Get('getNearestAadhaarLocationUsers')
  async getNearestAadhaarLocationUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getNearestAadhaarLocationUsers(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // hit cibil once again due to cibil error
  @Post('cibilHitInBanking')
  async funCibilHitInBanking(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funCibilHitInBanking(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //edit company name if mismatch
  @Post('editCompanyNameMismatch')
  async editCompanyNameMismatch(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.editCompanyNameMismatch(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('manualAssignVerification')
  async manualAssignVerification(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.manualAsignVerification(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('manualAssignUserStuck')
  async manualAssignUserStuck(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.manualAssignUserStuck(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('creditAnalystAdmins')
  async creditAnalystAdmins(@Res() res) {
    try {
      const data: any = await this.service.creditAnalystAdmins();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('cseAdmins')
  async cseAdmins(@Res() res) {
    try {
      const data: any = await this.service.cseAdmins();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('reshuffleVerificationAssignment')
  async reshuffleVerificationAssignment(@Body() Body, @Res() res) {
    try {
      const data: any = await this.service.reshuffleVerificationAssignment(
        Body,
      );
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('reshuffleUserStuckAssignment')
  async reshuffleUserStuckAssignment(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.reshuffleUserStuckAssignment(body);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getExactAadhaarLocationUsers')
  async getExactAadhaarLocationUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.finalService.getExactAadhaarLocationUsers(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return kInternalError;
    }
  }
}
