import { Injectable } from '@nestjs/common';
import * as Mixpanel from 'mixpanel';
import { MX_TOKEN, SERVER_MODE } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import { FlowRepository } from 'src/repositories/flow.repository';
import { CryptService } from 'src/utils/crypt.service';

const mx = Mixpanel.init(MX_TOKEN);

@Injectable()
export class MixPanelService {
  constructor(
    private readonly cryptService: CryptService,
    private readonly flowRepo: FlowRepository,
  ) {}

  async registerUser(data: any) {
    try {
      const fullName = data.fullName;
      const ip = data.ip;
      const phone = data.phone;
      const userData = {
        ip,
        $first_name: fullName,
        $last_name: '',
        $email: '',
        $created: new Date().toISOString(),
        $onesignal_user_id: data.phone,
        ServerMode: SERVER_MODE,
        $moengage_user_id: data.phone,
      };

      mx.people.set(phone, userData);
    } catch (error) {}
  }

  async updateUserData(userData) {
    try {
      const phone = userData.phone;
      delete userData.phone;
      mx.people.set(phone, userData);
    } catch (error) {}
  }

  // Closed due to event is not triggered as per v3
  async trackEvent(data: any) {
    try {
      return {};
      if (data.type == 'augmount') return;

      const os =
        data.deviceType == '1'
          ? 'IOS'
          : data.deviceType == '2'
          ? 'Unknown'
          : 'Android';
      const distinct_id = data.phone ?? '';
      const userData = {
        distinct_id,
        $os: os,
        ip: data.ip,
        routingType: data.type,
        deviceId: data.deviceId,
        ServerMode: SERVER_MODE,
      };

      const userId = data.userId;
      let userDetails: any = {};
      if (userId != '') {
        const attributes = ['userData'];
        const options = {
          where: { id: userId },
        };
        const flowData = await this.flowRepo.getRowWhereData(
          attributes,
          options,
        );
        if (flowData == k500Error) return kInternalError;
        userDetails = JSON.parse(flowData?.userData);
      }

      const eventName = this.getRoutingName(data.route, userDetails);
      if (eventName == '') return;

      if (userData.distinct_id == '') userData.distinct_id = userData.deviceId;
      if (userData.distinct_id.length != 10 && userDetails.phone) {
        const phone = await this.cryptService.decryptPhone(userDetails.phone);
        if (phone == k500Error) return;
        mx.alias(userData.distinct_id, phone);
        userData.distinct_id = phone;
      }

      mx.track(eventName, userData);
    } catch (error) {
      return kInternalError;
    }
  }

  async trackServerEvent(data: any) {
    try {
      const eventData = { ...data, type: 'push', deviceType: '2' };
      if (!eventData.ip) return;
      if (!eventData.route) return;
      eventData.deviceId = '';

      await this.trackEvent(eventData);
    } catch (error) {}
  }

  async trackMarketingEvent(eventName: string, data: any) {
    try {
      const userData = {
        distinct_id: data.ip,
        $os: data.os,
        ip: data.ip,
      };

      mx.track(eventName, userData);
    } catch (error) {}
  }

  private getRoutingName(route, userData) {
    try {
      const isRepeaterUser =
        userData.completedLoans != null && userData.completedLoans > 1;
      const employmentData = userData.employmentData ?? {};
      const salarySlipData = employmentData.salarySlip ?? {};
      const workMailData = employmentData.workMail ?? {};
      let bankingData = employmentData.bankingData ?? {};
      const loanData = bankingData.loanData ?? {};
      if (loanData.loanStatus) bankingData = loanData.bankingData ?? {};

      const uploadedStatus = ['0', '1', '3'];

      const page = route.replace('Routes.', '');

      switch (page) {
        case 'termScreen':
          return '1.1 - App terms';
        case 'addNameV2':
          return '1.2 - Add name';
        case 'addPhoneV2':
          return '1.3 - Add phone';
        case 'addEmailV2':
          return '1.4 - Add email';
        case 'captureSelfieV2':
          if (userData.selfieData.image != null) return '';
          return '1.5 - Capture selfie';

        case 'addEmploymentV2':
          if (employmentData.id) return '';
          return '1.6 - Add employment';
        case 'searchCompanyV2':
          if (employmentData.id) return '';
          return '1.6.1 - Search company';
        case 'searchSectorV2':
          if (employmentData.id) return '';
          return '1.6.2 - Search sector';
        case 'searchDesignationV2':
          if (employmentData.id) return '';
          return '1.6.3 - Search designation';

        case 'salaryV2':
          if (!salarySlipData.status) return '1.7 - Upload salary slip';
          if (uploadedStatus.includes(salarySlipData.status)) {
            if (!bankingData.salaryVerification && !isRepeaterUser)
              return '1.8 - Upload bank statement';
            if (!bankingData.salaryVerification && isRepeaterUser)
              return '2.2 - Upload bank statement';
          }
          return '';

        case 'selectWorkEmailV2':
          if (!isRepeaterUser) return '1.9 - Add work email';
          else return '2.1 - Re verify work email';
        case 'addWorkEmailV2':
          if (!isRepeaterUser && workMailData.status == '5')
            return '1.9.2 - Verify work email OTP';
          return '';

        case 'selectWorkEmailV2':
          if (!isRepeaterUser) return '1.9 - Add work email';
          else return '2.1 - Re verify work email';
        case 'addWorkEmailV2':
          if (!isRepeaterUser && workMailData.status == '5')
            return '1.9.2 - Verify work email OTP';

        case 'typeAddressRoute':
          return '1.10 - Type residence address';
        case 'automateResidenceV2':
          return '1.10.1 - Residence automation selection';
        case 'inAppAutomationresidenceV2':
          return '1.10.2 - Residence automation login';
        case 'submitResidenceV2':
          return '1.10.3 - submit residence proof';

        case 'allDocumentRouteV2':
          return '1.11 - Upload KYC docs';

        case 'setPinV2':
          return '1.12 - Set 4 digit pin';

        case 'selectAmountV2':
          if (isRepeaterUser) return '2.3 - Select amount';
          return '1.13 - Select amount';

        case 'aadhaarOTPV2':
          return '1.14 - Verify KYC OTP';

        case 'referenceV2':
          if (isRepeaterUser) return '2.4 - Submit references';
          return '1.14 - Submit references';

        case 'subscriptionV2':
          if (isRepeaterUser) return '2.5 - Mandate authorization';
          return '1.15 - Mandate authorization';

        case 'loanofferv2':
          return '4.1 - Latest offers';
        case 'chatScreen':
          return '4.2 - Chat screen';
        case 'termsScreen':
          return '4.3 - Terms & Privacy policy';

        default:
          return '';
      }
    } catch (error) {
      return '';
    }
  }
}
