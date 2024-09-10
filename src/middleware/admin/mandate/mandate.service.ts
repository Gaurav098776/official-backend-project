// Imports
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import {
  kRazorpay,
  kInitiated,
  kFreshMandate,
  kQa,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { TypeService } from 'src/utils/type.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { CF_SUBSCRIPTION } from 'src/constants/network';
import { gIsPROD } from 'src/constants/globals';
import { APIService } from 'src/utils/api.service';
import { MasterRepository } from 'src/repositories/master.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { CASHFREE_HEADERS } from 'src/constants/objects';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { CryptService } from 'src/utils/crypt.service';
import { MandateSharedService } from 'src/shared/mandate.service';

@Injectable()
export class MandateService {
  constructor(
    private readonly api: APIService,
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
    private readonly repository: SubscriptionRepository,
    private readonly razorpayService: RazorpoayService,
    private readonly masterRepo: MasterRepository,
    private readonly sdService: SigndeskService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly cryptService: CryptService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly sharedMandate: MandateSharedService,
  ) {}

  async checkExistingStatus(
    id: number,
    isInitiated?: boolean,
    accountNumber?: string,
    userId?: string,
  ) {
    try {
      // Get data
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
      const existingData = await this.repository.getRowWhereData(
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
            if (umrn) updatedData.umrn = umrn;
            else if (isInitiated) updatedData.initiatedOn = new Date();
            const result = await this.repository.updateRowData(
              updatedData,
              existingData.id,
            );
            if (result == k500Error && gIsPROD) return kInternalError;
            existingData.status = status;
            //No need to reveal referenceId on frontend side
            delete existingData.referenceId;
            return existingData;
          } else return k500Error;
        } else return k500Error;
      } else if (existingData.mode === 'SIGNDESK') {
        const response = await this.sdService.checkMandateStatus(
          existingData.referenceId,
        );
        if (response.message) return response;
        // Check valid response
        return await this.checkNHandleSDStatusRes(response, existingData);
      } else return kInternalError;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async checkNHandleSDStatusRes(responseData, existingData) {
    try {
      if (responseData.status !== 'success') return k500Error;
      const status = responseData?.mandate_status;
      if (!status) return k500Error;
      const updatedData: any = { status };
      const umrn = responseData?.umrn;
      if (umrn) updatedData.umrn = umrn;

      const result = await this.repository.updateRowData(
        updatedData,
        existingData.id,
      );
      if (result == k500Error) return k500Error;
      existingData.status = status;
      // No need to reveal referenceId on frontend side
      delete existingData.referenceId;
      return existingData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getMandateStuckData() {
    try {
      const { options, pendingOptions } = this.loanOptions();
      if (options?.message) return options;
      if (pendingOptions?.message) return pendingOptions;
      const loanListData = await this.findLoanListData(options);
      if (loanListData?.message) return loanListData;
      const pendingListData = await this.findPendingListData(pendingOptions);
      if (pendingListData?.message) return pendingListData;
      const targetList: any = this.prepareTargetList(
        loanListData,
        pendingListData,
      );
      if (targetList?.message) return targetList;
      // return targetList
      const finalData = this.prepareFinalData(targetList);
      return { count: targetList.length, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private loanOptions(): any {
    const userInclude: any = { model: registeredUsers };
    userInclude.attributes = [
      'id',
      'completedLoans',
      'email',
      'fcmToken',
      'fullName',
      'typeOfDevice',
      'lastOnlineTime',
    ];
    userInclude.order = [['lastOnlineTime']];
    userInclude.where = { isBlacklist: { [Op.ne]: '1' } };

    const subscriptionInclude: any = { model: SubScriptionEntity };
    subscriptionInclude.where = {
      status: { [Op.or]: ['FAILED', 'INITIALIZED'] },
    };
    subscriptionInclude.required = true;
    subscriptionInclude.attributes = [
      'id',
      'accountNumber',
      'subType',
      'mode',
      'status',
      'createdAt',
      'updatedAt',
      'invitationLink',
      'response',
    ];

    const bankInclude = {
      model: BankingEntity,
      attributes: ['id', 'mandateBank'],
    };
    const include = [subscriptionInclude, userInclude, bankInclude];
    const options = {
      include,
      where: {
        loanStatus: 'Accepted',
        manualVerification: { [Op.or]: ['1', '3'] },
        esign_id: { [Op.eq]: null },
      },
    };
    const pendingOptions = {
      include: [userInclude, bankInclude],
      where: {
        loanStatus: 'Accepted',
        manualVerification: { [Op.or]: ['1', '3'] },
        subscriptionId: { [Op.eq]: null },
      },
    };
    return { options, pendingOptions };
  }

  async findLoanListData(options) {
    try {
      const attributes = ['id', 'mandateAttempts', 'updatedAt'];
      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList === k500Error) return kInternalError;
      return loanList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async findPendingListData(pendingOptions) {
    try {
      const attributes = ['id', 'mandateAttempts', 'updatedAt'];
      const pendingList = await this.loanRepo.getTableWhereData(
        attributes,
        pendingOptions,
      );
      if (pendingList === k500Error) return kInternalError;
      return pendingList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareTargetList(loanListData, pendingListData) {
    const targetList = loanListData.concat(pendingListData);
    targetList.forEach((el) => {
      try {
        const subscriptionData = el?.subscriptionData ?? {};
        const status = subscriptionData?.status;
        const mode = subscriptionData?.mode;
        const response = subscriptionData?.response;
        if ((status == 'FAILED' || mode == kRazorpay) && response) {
          const responseData = JSON.parse(response);
          el.failedResponse =
            responseData?.cf_message ?? responseData?.errorMsg ?? '';
          delete el?.subscriptionData?.response;
          if (responseData?.errorMsg) el.subscriptionData.status = 'FAILED';
        }
      } catch (error) {}
    });
    return targetList;
  }

  private prepareFinalData(list: any[]) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const user = ele?.registeredUsers;
          const verification = this.typeService.getVerificationLastData(
            user?.verificationTrackerData,
          );
          const createdDate = ele?.subscriptionData?.createdAt;
          const option = ele?.subscriptionData?.subType ?? '-';
          let lastActiveAgo: any = '';
          let lastActiveAgoMinutes: any = Infinity;
          if (user?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              user?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            lastActiveAgo =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }
          const tempData: any = {};
          tempData['Waiting time'] = verification?.waitingTime;
          tempData['Name'] = user?.fullName ?? '-';
          tempData['Completed loans'] = user?.completedLoans ?? '-';
          tempData['Platform'] = ele?.subscriptionData?.mode ?? '-';
          tempData['Bank name'] = ele?.bankingData?.mandateBank ?? '-';
          tempData['Account number'] =
            ele?.subscriptionData?.accountNumber ?? '-';
          tempData['Options'] =
            option == '-'
              ? '-'
              : option == 'debitCard'
              ? 'Debit Card'
              : 'Net Banking';
          tempData['Attempts'] = ele?.mandateAttempts ?? 0;
          tempData['Created date'] = createdDate
            ? this.typeService.getDateFormatted(createdDate)
            : '-';
          tempData['Device type'] = '-';
          if (ele?.registeredUsers?.typeOfDevice == '0')
            tempData['Device type'] = 'Android';
          if (ele?.registeredUsers?.typeOfDevice == '1')
            tempData['Device type'] = 'iOS';
          tempData['Reject reason'] = ele?.failedResponse ?? '-';
          tempData['Status'] = ele?.subscriptionData?.status ?? '';
          tempData['Invitation link'] =
            ele?.subscriptionData?.invitationLink ?? '-';
          tempData['userId'] = ele?.registeredUsers?.id ?? '-';
          tempData['mandateId'] = ele?.subscriptionData?.id ?? '-';
          tempData['isOnline'] =
            lastActiveAgoMinutes < 5 && lastActiveAgo != '';
          tempData['Last Active ago'] =
            lastActiveAgo == '' ? null : lastActiveAgo;
          tempData['loanId'] = ele?.id ?? '-';
          tempData['Difference in minutes'] = verification.minutes;
          tempData['lastActiveAgoMinutes'] = lastActiveAgoMinutes;
          finalData.push(tempData);
          finalData.sort(
            (a, b) => a?.lastActiveAgoMinutes - b?.lastActiveAgoMinutes,
          );
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async deleteMandate(loanId, adminId?) {
    return this.sharedMandate.deleteMandate(loanId, adminId);
  }

  async validateMandateRequest(loanId: number, userId: string) {
    try {
      //Validate loan flow
      const bankingAttributes = ['mandateAccount', 'mandateIFSC'];
      const bankingInclude = {
        model: BankingEntity,
        attributes: bankingAttributes,
      };
      const userAttributes = ['id', 'fullName', 'email', 'phone'];
      const userInclude = {
        model: registeredUsers,
        attributes: userAttributes,
      };
      const include = [bankingInclude, userInclude];
      const options: any = { where: { id: loanId } };
      options.include = include;
      const attributes = [
        'loanStatus',
        'netEmiData',
        'subscriptionId',
        'userId',
      ];
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);

      if (!loanData) return kInternalError;
      else if (loanData == k500Error) return kInternalError;
      else if (loanData.loanStatus != 'Accepted') return kInternalError;
      else if (!loanData.netEmiData) return kInternalError;
      if (loanData.userId != userId) return kInternalError;

      const bankingData = loanData.bankingData;
      const userData = loanData.registeredUsers;

      if (userData && userData.phone)
        userData.phone = await this.cryptService.decryptPhone(userData.phone);

      // Validate account data
      if (!bankingData) return kInternalError;
      const accountNumber = (bankingData.mandateAccount ?? '').toLowerCase();
      if (accountNumber.length < 5) return kInternalError;
      else if (accountNumber.includes('*') || accountNumber.includes('x'))
        return kInternalError;

      const existingData = await this.checkExistingStatus(
        null,
        null,
        accountNumber,
        userId,
      );
      if (existingData == k500Error) return kInternalError;
      if (existingData) {
        //Existing data needs to send again
        if (existingData.invitationLink) {
          //Repeated subscription data needs to get updated in new loan data
          if (!loanData.subscriptionId) {
            // await this.trackService.markAsSubscribed(userId);
            const updatedData = { subscriptionId: existingData.id };
            const result = await this.loanRepo.updateRowData(
              updatedData,
              loanId,
            );
            if (result == k500Error) return kInternalError;
          }
          return existingData;
        }
      }

      //Prepare data
      const preparedData: any = { ...userData, loanId };
      preparedData.accountNumber = bankingData.mandateAccount;
      preparedData.ifscCode = bankingData.mandateIFSC ?? '0';
      return preparedData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async saveInvitationResponse(data: any) {
    try {
      const initiatedOn = new Date();
      /* By default putting time of more than 15 mins 
      so frontend can prevent previous request in progress issue */
      initiatedOn.setMinutes(initiatedOn.getMinutes() - 15);
      data.initiatedOn = initiatedOn;

      // Create data in subscription entity
      const creationData = await this.subscriptionRepo.createRowData(data);
      if (!creationData || creationData == k500Error) return kInternalError;
      const id = creationData.id;

      // Update data in loan entity
      const updatedData = { subscriptionId: id };
      const updateResult = await this.loanRepo.updateRowData(
        updatedData,
        data.loanId,
      );

      if (updateResult == k500Error) return kInternalError;

      return {
        id,
        invitationLink: data.invitationLink,
        initiatedOn,
        status: data.status,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async sendInvitationLinkViaMail(body) {
    try {
      const loanId: number = body?.loanId;
      if (!loanId) return kParamMissing;
      const att = ['subscriptionId', 'appType'];
      const loanData = await this.loanRepo.getRowWhereData(att, {
        where: { id: loanId },
      });
      if (!loanData || loanData === k500Error) return k500Error;
      const id = loanData?.subscriptionId;
      const attributes = ['invitationLink', 'status'];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['email', 'fullName', 'id'];
      const options = { where: { id }, include: [userInclude] };
      const subscriptionData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (!subscriptionData) return false;
      else if (subscriptionData == k500Error) return kInternalError;
      else if (subscriptionData.status != 'INITIALIZED') return false;
      else if (!subscriptionData.user) return false;
      const type = 'MANDATE_INVITATION';
      const email = gIsPROD ? subscriptionData.user.email : kQa[1];
      const data: any = { name: subscriptionData.user.fullName };
      data.link = subscriptionData.invitationLink;
      data.userId = subscriptionData.user.id;
      data.appType = loanData.appType;
      return await this.sharedNotification.sendEmail(type, email, data);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkPendingEmandate() {
    try {
      const subScriptionInclude: any = { model: SubScriptionEntity };
      subScriptionInclude.attributes = [
        'id',
        'referenceId',
        'status',
        'accountNumber',
        'mode',
      ];
      subScriptionInclude.where = { mode: { [Op.ne]: kRazorpay } };
      const loanInclude: any = { model: loanTransaction };
      loanInclude.attributes = ['subscriptionId'];
      loanInclude.include = [subScriptionInclude];
      const include = [loanInclude];
      const attributes = ['id', 'status', 'dates', 'userId'];
      const options = {
        include,
        where: {
          status: {
            loan: { [Op.or]: [1, 3] },
            eMandate: 0,
          },
        },
      };
      const masterData = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      return await this.checkAllPendingMandate(masterData);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async checkAllPendingMandate(masterData) {
    try {
      for (let i = 0; i < masterData.length; i++) {
        try {
          const master = masterData[i];
          const loanData = master.loanData;
          const subscriptionData = loanData.subscriptionData;
          const statusData = master?.status ?? {};
          const dates = master?.dates ?? {};
          const masterId = master.id;
          const response = await this.sharedMandate.checkStatusOnModes(
            subscriptionData,
          );
          if (response.message) continue;
          dates.eMandate = new Date().getTime();
          // Update data
          if (
            (subscriptionData.status == 'INITIALIZED' ||
              statusData.eMandate != 1) &&
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
            if (updateResult == k500Error) continue;

            // Update master data
            statusData.eMandate = 1;
            updatedData = { dates, status: statusData };
            updateResult = await this.masterRepo.updateRowData(
              updatedData,
              masterId,
            );
          } else if (
            subscriptionData.status == 'INITIALIZED' &&
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
        } catch (error) {}
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async notificationToMandateFailUser() {
    try {
      const date1 = new Date();
      date1.setMinutes(date1.getMinutes() - 15);
      const date2 = new Date();
      date2.setMinutes(date2.getMinutes() - 14);

      const attributes = ['userId', 'status'];
      const options = {
        where: {
          status: 'FAILED',
          updatedAt: { [Op.gte]: date1, [Op.lte]: date2 },
        },
        include: [],
      };
      const failedData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (failedData === k500Error) return kInternalError;
      const userList = failedData.map((e) => e?.userId);
      const body = {
        userList,
        content: kFreshMandate,
        title: 'Mandate waiting for you',
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return failedData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

}
