// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kInitiated, kNoDataFound } from 'src/constants/strings';
import { loanTransaction } from 'src/entities/loan.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { MasterRepository } from 'src/repositories/master.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { IpCheckService } from 'src/shared/ipcheck.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { UserSharedService } from 'src/shared/user.share.service';

@Injectable()
export class MandateServiceV3 {
  constructor(
    private readonly masterRepo: MasterRepository,
    private readonly sharedMandate: MandateSharedService,
    private readonly subscriptionRepo: SubscriptionRepository,
    // Shared services
    private readonly ipCheckService: IpCheckService,
    private readonly sharedUser: UserSharedService,
  ) {}

  async generateLink(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const mode = reqData?.mode;

      // Get master data
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['bankingId'];
      const include = [loanInclude];
      const attributes = ['status'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);
      const statusData = masterData.status ?? {};

      if (statusData.loan != 1 && statusData.loan != 3)
        return k422ErrorMessage('Loan is not approved');
      if (statusData.eMandate != -1 && statusData.eMandate != 2)
        return k422ErrorMessage('request could not be completed');

      const bankingId = masterData.loanData?.bankingId;
      const linkData = await this.sharedMandate.generateLink({
        bankingId,
        type,
        mode,
      });
      if (linkData.message) return linkData;

      const ipCheck: any = await this.ipCheckService.ipCheck(
        reqData?.userId,
        loanId,
      );
      if (ipCheck == true) return { needUserInfo: true };

      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  async checkStatus(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');

      const subScriptionInclude: any = { model: SubScriptionEntity };
      subScriptionInclude.attributes = [
        'id',
        'referenceId',
        'status',
        'accountNumber',
        'mode',
      ];
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['subscriptionId'];
      loanInclude.include = [subScriptionInclude];
      const include = [loanInclude];
      const attributes = ['id', 'status', 'dates', 'rejection', 'userId'];
      const options = { include, where: { loanId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);

      const statusData = masterData.status ?? {};
      const dates = masterData.dates ?? {};
      const masterId = masterData.id;
      const userId = masterData.userId;
      const subscriptionData = masterData.loanData?.subscriptionData ?? {};

      const response = await this.sharedMandate.checkStatusOnModes(
        subscriptionData,
      );
      if (response.message) return response;
      dates.eMandate = new Date().getTime();
      let isMandateRegistered = false;

      // Update data on successful registration
      if (
        (subscriptionData.status == kInitiated || statusData.mandate != 1) &&
        response.isRegistered
      ) {
        // Update subscription data
        let updatedData: any = {
          response: response.response,
          umrn: response.umrn,
          status: response.status,
        };
        let updateResult = await this.subscriptionRepo.updateRowData(
          updatedData,
          subscriptionData.id,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update master data
        statusData.eMandate = 1;
        updatedData = { dates, status: statusData };
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          masterId,
        );
        if (updateResult == k500Error) return kInternalError;
        isMandateRegistered = true;
      }
      // Mandate is rejected
      else if (
        subscriptionData.status == kInitiated &&
        response?.status == kInitiated &&
        response?.errorMsg?.length > 2
      ) {
        // Update subscription data for failure
        let updatedData: any = {
          response: JSON.stringify(response),
          status: 'FAILED',
        };
        let updateResult: any = await this.subscriptionRepo.updateRowData(
          updatedData,
          subscriptionData.id,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update master data for failure
        statusData.eMandate = 2;
        const rejection = masterData.rejection ?? {};
        rejection.eMandate = response?.errorMsg;
        updatedData = { status: statusData, rejection, dates };
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          masterId,
        );
        if (updateResult == k500Error) return kInternalError;
      }

      // if old defulter then stop user at successful mandate registration
      if (isMandateRegistered)
        await this.sharedUser.resetRedProfile(userId, loanId);

      return { needUserInfo: true, state: { isProcessing: false } };
    } catch (error) {
      return kInternalError;
    }
  }
}
