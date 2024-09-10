// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kInitiated, kNoDataFound, kRazorpay } from 'src/constants/strings';
import { loanTransaction } from 'src/entities/loan.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { MasterRepository } from 'src/repositories/master.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { IpCheckService } from 'src/shared/ipcheck.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { UserRepository } from 'src/repositories/user.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { CF_SUBSCRIPTION, signdesk_mandate_check } from 'src/constants/network';
import { CASHFREE_HEADERS } from 'src/constants/objects';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { gIsPROD } from 'src/constants/globals';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { APIService } from 'src/utils/api.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
@Injectable()
export class MandateServiceV4 {
  constructor(
    private readonly masterRepo: MasterRepository,
    private readonly sharedMandate: MandateSharedService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly signdeskMandateService: SigndeskService,
    // Shared services
    private readonly ipCheckService: IpCheckService,
    private readonly sharedUser: UserSharedService,
    private readonly notificationService: SharedNotificationService,
    private readonly userRepo: UserRepository,
    private readonly api: APIService,
    private readonly loanRepository: LoanRepository,
    private readonly razorpayService: RazorpoayService,
    private readonly eligibilitySharedService: EligibilitySharedService,
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

      // Checking User's Eligibility
      const eligibility: any =
        await this.eligibilitySharedService.checkUserEligiblity(
          reqData?.userId,
        );
      if (eligibility.message) return kInternalError;
      if (eligibility == false) return { needUserInfo: true };

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
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async validateCallbackData(data: any) {
    try {
      // Validation
      let status = data.cf_status;
      const referenceId = data.cf_subReferenceId;
      const attributes = ['id', 'userId'];
      const options = { where: { referenceId } };
      const existingData = await this.subscriptionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return k500Error;
      else if (!existingData) return false;
      if (status != 'BANK_APPROVAL_PENDING' && status != 'ACTIVE') {
        if (status == 'ERROR' && data.cf_checkoutStatus == 'FAILED') {
          const updatedData: any = {
            response: JSON.stringify(data),
            status: 'FAILED',
          };
          await this.subscriptionRepo.updateRowData(
            updatedData,
            existingData.id,
          );
          return {};
        } else return false;
      }
      const umrn = data.cf_umrn;
      if (!umrn || umrn.length < 4) return false;

      // check update
      const id = existingData.id;
      const response = await this.checkExistingStatus(id);
      if (response == k500Error) return k500Error;
      status = response.status;
      if (status != 'BANK_APPROVAL_PENDING' && status != 'ACTIVE') return false;
      const responseData = JSON.stringify(data);
      const updatedData = { response: responseData };
      const result = await this.subscriptionRepo.updateRowData(updatedData, id);
      if (result == k500Error) return k500Error;
      const loanData: any = await this.loanRepository.getRowWhereData(['id'], {
        where: {
          subscriptionId: id,
        },
      });
      const userAttr = ['fcmToken'];
      const userOptions = { where: { id: existingData.userId } };
      const userData = await this.userRepo.getRowWhereData(
        userAttr,
        userOptions,
      );

      // Push notification
      if (userData && userData.fcmToken)
        await this.notificationService.sendPushNotification(
          userData.fcmToken,
          'eMandate registered',
          'Your eMandate registration is completed successfully!',
        );
      return { status };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
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
        (subscriptionData.status == kInitiated || statusData.eMandate != 1) &&
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
        rejection.eMandate = response?.errorMsg ?? response?.error_description;
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
      console.log({ error });

      return kInternalError;
    }
  }
  async checkExistingStatus(
    id: number,
    isInitiated?: boolean,
    accountNumber?: string,
    userId?: string,
  ) {
    try {
      //Get data
      const attributes = [
        'id',
        'initiatedOn',
        'invitationLink',
        'mode',
        'referenceId',
        'status',
        'userId',
      ];
      const options = { where: !userId ? { id } : { userId, accountNumber } };
      const existingData = await this.subscriptionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return k500Error;

      //No existing data
      if (!existingData) return;
      const mandateId = existingData?.id;
      if (existingData.mode == kRazorpay) {
        const response: any = await this.razorpayService.checkOrderStatus(
          existingData.referenceId,
          mandateId,
        );
        if (response.message) return response;
        return existingData;
      } else if (existingData.mode === 'CASHFREE') {
        //Check new update
        const url = CF_SUBSCRIPTION + '/' + existingData.referenceId;
        const headers = CASHFREE_HEADERS;
        const response = await this.api.get(url, null, headers);

        if (response == k500Error) return k500Error;
        if (response.status == 'OK' && response.subscription) {
          const status = response.subscription.status;
          const umrn = response.subscription.umrn;
          if (status) {
            //Update data
            const updatedData: any = { status };
            if (umrn) {
              updatedData.umrn = umrn;
            } else if (isInitiated) updatedData.initiatedOn = new Date();
            const result = await this.subscriptionRepo.updateRowData(
              updatedData,
              existingData.id,
            );
            if (result == k500Error && gIsPROD) return k500Error;
            existingData.status = status;
            //No need to reveal referenceId on frontend side
            delete existingData.referenceId;
            return existingData;
          } else return k500Error;
        } else return k500Error;
      } else if (existingData.mode === 'SIGNDESK') {
        const mandateCheckSDBody = {
          emandate_id: existingData.referenceId,
        };
        const response = await this.signdeskMandateService.eMandateRequest(
          signdesk_mandate_check,
          mandateCheckSDBody,
        );
        if (response == kInternalError) return kInternalError;
        // Check valid response
        const handleResult = await this.checkNHandleSDStatusRes(
          response,
          existingData,
        );
        if (handleResult == k500Error) return k500Error;
        return handleResult;
      } else return k500Error;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  private async checkNHandleSDStatusRes(responseData, existingData) {
    try {
      if (responseData.status !== 'success') return k500Error;
      const status = responseData?.mandate_status;
      if (!status) return k500Error;
      const updatedData: any = { status };
      const umrn = responseData?.umrn;
      if (umrn) {
        updatedData.umrn = umrn;
      }
      const result = await this.subscriptionRepo.updateRowData(
        updatedData,
        existingData.id,
      );
      if (result == k500Error) return k500Error;
      existingData.status = status;
      //No need to reveal referenceId on frontend side
      delete existingData.referenceId;
      return existingData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
}
