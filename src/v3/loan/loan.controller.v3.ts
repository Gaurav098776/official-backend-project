// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  k403Forbidden,
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import {
  iFramePromoCodeLink,
  kAcceptInsuranceRoute,
  kKeyFactStatementRoute,
  kPromoInvalid,
} from 'src/constants/strings';
import { UserServiceV3 } from '../user/user.service.v3';
import { LoanServiceV3 } from './loan.service.v3';
import { Key } from 'src/authentication/auth.guard';
import { OTHER_PURPOSE_ID } from 'src/constants/globals';
import { UserService } from 'src/admin/user/user.service';
import { TallyService } from 'src/admin/tally/tally.service';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { LoanSharedService } from 'src/shared/loan.shared.service';

@Controller('loan')
export class LoanControllerV3 {
  constructor(
    private readonly service: LoanServiceV3,
    private readonly promoCodeService: PromoCodeService,
    private readonly sharedTransactionService: SharedTransactionService,
    private readonly userServiceV3: UserServiceV3,
    private readonly userService: UserService,
    // Admin services
    private readonly tallyAdminService: TallyService,
    private readonly loanSharedService: LoanSharedService,
  ) {}

  @Get('rejectReasonList')
  async funRejectReasonList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.rejectReasonList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('decline')
  async funDecline(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.decline(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('updateEmiDate')
  async funUpdateEmiDate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateEmiDate(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('acceptAmount')
  async funAcceptAmount(@Body() body, @Res() res) {
    try {
      let data: any = {};
      const acceptData: any = await this.service.acceptAmount(body);
      if (acceptData?.message) return res.send(acceptData);
      if (acceptData.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      if (data?.userData?.score)
        data.userData.score.forcefullEmiSelection = false;

      // Insurance flow
      if (acceptData.nomineeRelationship) {
        data.continueRoute = kAcceptInsuranceRoute;
        data.nomineeRelationship = acceptData.nomineeRelationship;
      }
      // KFS flow
      else if (acceptData.kfsData) {
        data.userData.KFSDoc = acceptData.kfsData;
        data.continueRoute = kKeyFactStatementRoute;
      }

      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('acceptKFS')
  async funAcceptKFS(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.acceptKFS(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region  accept insurance and add Nominee Detail
  @Post('acceptInsurance')
  async funAcceptInsurance(@Body() body, @Res() res) {
    try {
      let data: any = {};
      let acceptData: any = await this.service.funAcceptInsurance(body);
      if (acceptData?.message) return res.send(acceptData);
      if (acceptData.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      data.userData.KFSDoc = acceptData.kfsData;
      data.continueRoute = kKeyFactStatementRoute;
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitReferences')
  async funSubmitReferences(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitReferences(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('syncFirebaseContact')
  async funSyncFirebaseContact(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.syncFirebaseContact(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('syncRemainingContacts')
  async funSyncRemainingContacts(@Res() res) {
    try {
      this.service.syncRemainingContacts();
      return res.send(kSuccessData);
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('getCibilAddressesList')
  async funCibilAddressesList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.getCibilAddressesList(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitUserAddressSelection')
  async funSubmitUserAddressSelection(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitUserAddressSelection(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo)
        data = await this.userServiceV3.routeDetails({ id: body.userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('activeLoanDetails')
  async funActiveLoanDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getActiveLoanDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('histories')
  async funHistory(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getHistories(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region when loan Active then call api to change status
  @Get('loanIsActive')
  async loanIsActive(@Query() query, @Res() res) {
    try {
      const data = await this.service.loanIsActive(query.loanId);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region when loan Active then call api to change status
  @Get('checkIfAnyUserNotCloseLoan')
  async checkIfAnyUserNotCloseLoan(@Query() query, @Res() res) {
    try {
      const data = await this.service.checkIfAnyUserNotCloseLoan(query?.limit);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  @Get('loanNotDisbursementBanner')
  async funLoanNotDisbursementBanner(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funLoanNotDisbursementBanner(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //get loan details only
  @Get('getLoanDetails')
  async funGetLoanDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getLoanDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // get user loan Repayment transactions
  @Get('getLoanRepaymentDetails')
  async funGetLoanRepaymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getLoanRepaymentDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // get user loan emi and repayment data
  @Get('getLoanEmiRepaymentDetails')
  async funGetLoanEmiRepaymentDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.loanSharedService.getLoanEmiRepaymentDetails(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region add purpose id
  @Post('addPurpose')
  async addPurpose(@Key() userId, @Body() body, @Res() res) {
    try {
      userId = userId ?? body.userId;
      if (!userId) return res.json(k403Forbidden);
      if (!body.purposeId) return res.json(kParamsMissing);
      body.userId = userId;
      if (body.purposeId == OTHER_PURPOSE_ID && !body?.note)
        return res.json(kParamsMissing);
      /// add or update purpose
      const result = await this.service.addPurpose(body);
      if (result === kInternalError) return res.json(kInternalError);
      /// check what is next route
      const data = await this.userService.getUserProfile({ userId: userId });
      if (data === kInternalError) return res.json(kInternalError);
      else if (data) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion
  //get disbursement details
  @Get('getDisbursementDetails')
  async disbursedDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDisbursementDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('ledgerDetails')
  async funLedgerDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.tallyAdminService.getLedgerLoanDetails(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get users EMIs with promo code details
  @Get('getUserWaiveOffEligibility')
  async getUserWaiveOffEligibility(@Query() query, @Res() res) {
    try {
      const data: any = await this.promoCodeService.getUserWaiveOffEligibility(
        query,
      );
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get users promo codes eligibility
  @Get('checkUserPromoEligibility')
  async checkUserPromoEligibility(@Query() query, @Res() res) {
    try {
      const isEligible: any =
        await this.promoCodeService.checkUserPromoEligibility(query);
      const data = {
        isEligible: isEligible,
        message: kPromoInvalid,
      };
      if (isEligible?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get razorpay payment links
  @Get('getPaymentLink')
  async getPaymentLink(@Query() query, @Res() res) {
    try {
      let loanId = query.loanId;
      const data: any = await this.sharedTransactionService.closeLoan({
        loanId,
      });
      if (data?.message) return res.send(data);
      let htmlFile = iFramePromoCodeLink.replace(
        '##PAYMENT_URL##',
        data?.paymentLink,
      );
      if (data?.message) return res.send(data);
      return res.send(htmlFile);
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion

  //#region get loan and emi data
  @Get('getDataFromUId')
  async funGetDataFromUId(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.fetchDataFromUId(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion
  @Post('acceptAmountCharges')
  async funAcceptAmountCharges(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.acceptAmountCharges(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //startregion for sending NOC to  user on his request
  @Get('nocRequestByUser')
  async funNocRequestByDelayUser(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funNocRequestByUser(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
  //#endregion
}
