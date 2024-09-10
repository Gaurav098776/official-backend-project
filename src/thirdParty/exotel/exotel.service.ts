// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import axios from 'axios';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import {
  CALL_SERVICE,
  EXOTEL_CATEGORY_PER_DAY_LIMIT,
  gIsPROD,
  INCOMMING_CALL_STATUSES,
  IncommingCallCollection,
  isUAT,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { EXOTEL_URL, EXOTEL_URL_LSP } from 'src/constants/network';
import { registeredUsers } from 'src/entities/user.entity';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { kExotelAppIds } from 'src/constants/objects';
import { TypeService } from 'src/utils/type.service';
import { Op, Sequelize, UUIDV4, where } from 'sequelize';
import { ExotelCategoryEntity } from 'src/entities/exotelCategory.entity';
import { CrmRepository } from 'src/repositories/crm.repository';
import { kCompleted, kIncommingCall, kNoDataFound } from 'src/constants/strings';
import { RedisService } from 'src/redis/redis.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import admin from 'firebase-admin';
import { UserRepository } from 'src/repositories/user.repository';
import { CryptService } from 'src/utils/crypt.service';
import { TelegramService } from '../telegram/telegram.service';
import { CommonService } from 'src/utils/common.service';
import { SlackService } from '../slack/slack.service';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';
import { v4 as uuidv4 } from 'uuid';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';

@Injectable()
export class exotelService {
  firebaseDB: any;
  callActiveObj = {}

  constructor(
    private readonly repository: ExotelCallHistoryRepository,
    private readonly categoryRepository: ExotelCategoryRepository,
    private readonly apiService: APIService,
    private readonly typeService: TypeService,
    private readonly crmRepository: CrmRepository,
    private readonly redisService: RedisService,
    private readonly commonSharedService: CommonSharedService,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly telegramService: TelegramService,
    private readonly commonService: CommonService,
    private readonly slack: SlackService,
  ) {
    if (gIsPROD || isUAT) this.firebaseDB = admin.firestore();
  }

  async updateCallEvents() {
    try {
      const minTime = new Date();
      minTime.setDate(minTime.getDate() - 2);
      const attributes = ['id', 'referenceId', 'categoryId', 'userId'];
      const callOptions = {
        where: { createdAt: { [Op.gte]: minTime }, status: 'INITIALIZED' },
      };
      const categoryAttr = ['id', 'status'];
      const categoryOptions: any = {
        where: {
          status: 'INITIALIZED',
          serviceType: CALL_SERVICE.EXOTEL
        },
        order: [['id', 'DESC']],
      };
      const callHitoryInclude = {
        model: ExotelCallHistory,
        attributes,
        options: callOptions,
      };
      categoryOptions.include = [callHitoryInclude];
      const tableData = await this.categoryRepository.getTableWhereData(
        categoryAttr,
        categoryOptions,
      );
      if (tableData == k500Error) return k500Error;

      for (let i = 0; i < tableData.length; i++) {
        try {
          await this.typeService.delay(1000);
          let callData = tableData[i]?.callLogs;
          const letesUpdated = await this.updateCallDetails(callData);
          if (letesUpdated == k500Error) continue;
          if (letesUpdated.status) {
            const categoryId = tableData[i].id;
            const updateData: any = { status: letesUpdated.status };
            if (letesUpdated.endDate) updateData.endDate = letesUpdated.endDate;
            if (letesUpdated.subStatus)
              updateData.subStatus = letesUpdated.subStatus;
            await this.categoryRepository.updateRowData(updateData, categoryId);
          }
        } catch (error) { }
      }
      return true;
    } catch (error) {
      return k500Error;
    }
  }

  async getUserPlatform(callLogs: any) {
    try {
      const userId = callLogs.map((user) => user.userId);
      const loanInclude = {
        model: loanTransaction,
        attributes: ['appType'],
        required: false
      };
      const masterInclude: any = {
        model: MasterEntity,
        attributes: ['loanId'],
        include: loanInclude,
      };
      const attr = ['id', 'appType'];
      const options = {
        where: {
          id: { [Op.in]: userId },
        },
        include: masterInclude,
      };
      const users = await this.userRepo.getTableWhereData(attr, options);
      callLogs.forEach((dataItem) => {
        let userDetail = users.find((user) => user.id === dataItem.userId);
        if (userDetail) {
          dataItem.appType = userDetail?.masterData?.loanData?.appType ?? userDetail.appType;
        }
      });
    } catch (error) { }
    return callLogs
  }

  async updateCallDetails(tableData = []) {
    try {
      let status: any = null;
      let subStatus: any = null;
      let isAllCallDone = false;
      let endDate;
      for (let i = 0; i < tableData.length; i++) {
        await this.typeService.delay(500);
        const element = tableData[i];
        const newCallSid = element?.referenceId.replace(/-/g, '');
        const url = EXOTEL_URL.replace('connect', newCallSid);
        let result = await this.apiService.get(url);
        if (result == k500Error) return k500Error
        const response = result.Call;
        const getStatuses: any = this.getStatus(response.Status);
        if (getStatuses != 'INITIALIZED') isAllCallDone = true;
        if (getStatuses != 'INITIALIZED' && getStatuses != 'COMPLETED') {
          status = getStatuses;
          subStatus = response.Status;
        }
        const data = {
          status: getStatuses,
          subStatus: response.Status,
          callTime: response.Duration,
          callStartDate: response.StartTime,
          callEndDate: response.EndTime,
        };
        endDate = response?.EndTime ?? new Date();
        await this.repository.updateRowData(data, tableData[i].id);
      }
      if (isAllCallDone) {
        status = 'COMPLETED';
        subStatus = 'completed';
      }
      return { status, subStatus, endDate };
    } catch (error) {
      return k500Error;
    }
  }

  async getSubStatus() {
    try {
      const attributes = ['subStatus'];
      const options = {
        group: 'subStatus',
      };
      const result = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (result == k500Error) return k500Error;
      return result;
    } catch (error) {
      return k500Error;
    }
  }

  async getAllExotelData(passData) {
    try {
      const attributes = [
        'id',
        'loanId',
        'status',
        'subStatus',
        'callTime',
        'callStartDate',
        'callEndDate',
        'to',
        'createdAt',
        'referenceId',
        'response',
        'adminId',
      ];
      const theOptions: any = {
        where: { userId: passData.userId },
        limit: PAGE_LIMIT,
        order: [['id', 'DESC']],
      };
      if (passData.loanId) theOptions.where.loanId = passData.loanId;
      if (passData.status) theOptions.where.status = passData.status;
      theOptions.offset = passData.page * PAGE_LIMIT - PAGE_LIMIT;
      const categoryInclude = {
        model: ExotelCategoryEntity,
        attributes: ['id', 'category', 'from', 'status', 'createdAt'],
      };
      theOptions.include = [categoryInclude];
      const callData: any = await this.repository.getTableWhereDataWithCounts(
        attributes,
        theOptions,
      );
      if (callData == k500Error) return k500Error;
      let completed = 0;
      const data = callData.rows;
      for (let index = 0; index < data.length; index++) {
        try {
          const ele = data[index];
          ele.createdByAdmin = await this.commonSharedService.getAdminData(
            ele?.adminId,
          );
          if (ele.status == 'completed') completed++;
        } catch (error) { }
      }
      callData.completeCalls = completed;
      return callData;
    } catch (error) {
      return k500Error;
    }
  }

  getCallBody(fromPhone, callerId, appId) {
    try {
      return `From=${fromPhone}&CallerId=${callerId}&Url=http://my.exotel.com/Exotel/exoml/start_voice/${appId}`;
    } catch (error) {
      return k500Error;
    }
  }

  async placeCall(data) {
    try {
      const canPlaceThisCall: any = await this.canPlaceCall(
        data.category,
        data.adminId,
      );
      if (canPlaceThisCall.message) return canPlaceThisCall;
      // No need to wait
      this.callTargetUsers(data, canPlaceThisCall);
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async callTargetUsers(data, canPlaceThisCall) {
    try {
      let success = 0;
      let failed = 0;
      const phones = [process.env.EXOTEL_TARGET_USER_PHONE];
      for (
        let index = 0;
        index < (gIsPROD ? data.targetList.length : phones.length);
        index++
      ) {
        try {
          await this.delay(250);
          const targetData = data.targetList[index];
          const number = gIsPROD ? targetData.phone : phones[index];
          const callResponse = await this.sendCallReq(number, canPlaceThisCall);
          if (callResponse == kInternalError) {
            failed++;
            continue;
          }
          const creationData: any = { response: callResponse.response };
          creationData.userId = targetData.id ?? targetData.userId;
          creationData.loanId = targetData.loanId;
          creationData.emiId = targetData.emiId;
          creationData.referenceId = callResponse.referenceId;
          creationData.status = callResponse.status;
          creationData.subStatus = callResponse.subStatus;
          creationData.categoryId = canPlaceThisCall.categoryId;
          creationData.to = callResponse.from;
          creationData.serviceType = CALL_SERVICE.EXOTEL;
          const creationRes = await this.repository.createRawData(creationData);
          if (creationRes == k500Error) failed++;
          else success++;
        } catch (error) {
          failed++;
        }
      }
      return { success, failed, totalCalls: data.targetList.length };
    } catch (error) {
      return kInternalError;
    }
  }

  // Check daily limits and targetIds
  private async canPlaceCall(category: string, adminId = SYSTEM_ADMIN_ID) {
    try {
      let categoryCount: any = 0;
      const currDate = new Date();
      const range = this.typeService.getUTCDateRange(
        currDate.toJSON(),
        currDate.toJSON(),
      );
      const options = {
        where: {
          category,
          status: kCompleted,
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
        },
      };
      categoryCount = await this.categoryRepository.getCountsWhere(options);
      if (categoryCount == k500Error) return kInternalError;
      if (categoryCount >= EXOTEL_CATEGORY_PER_DAY_LIMIT)
        return k422ErrorMessage(
          'Maximum limit reached for placing call for ' + category,
        );

      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - 6);
      const initializedOptions = {
        where: {
          createdAt: { [Op.gte]: createdAt },
          category,
          status: 'INITIALIZED',
        },
      };
      categoryCount = await this.categoryRepository.getCountsWhere(
        initializedOptions,
      );
      if (categoryCount == k500Error) return kInternalError;
      if (categoryCount > 0)
        return k422ErrorMessage(
          'Please wait untill previous request get completed',
        );

      const data = kExotelAppIds[category];
      if (!data)
        return k422ErrorMessage(`Category ${category} is not eligible`);
      const creationData = { category, from: data.callId, adminId };
      const creationRes = await this.categoryRepository.createRowData(
        creationData,
      );
      if (creationRes == k500Error) return kInternalError;
      return { ...data, categoryId: creationRes.id };
    } catch (error) {
      return kInternalError;
    }
  }

  async sendCallReq(number: string, details: any) {
    try {
      // Exotel call should only works in production
      // if (!gIsPROD) return kInternalError;
      const body = this.getCallBody(number, details.callId, details.appId);
      const url = details.user_type == 'LSP' ? EXOTEL_URL_LSP : EXOTEL_URL;
      const response = await this.apiService.exotelPost(url, body);
      if (response == k500Error) return kInternalError;
      const callData = response.Call ?? {};
      const responseData: any = {
        referenceId: callData.Sid,
        status: this.getStatus(callData.Status),
        subStatus: callData.Status,
        response: JSON.stringify(callData),
        to: this.commonService.removePrefixFromMobile(callData?.To.toString()),
        from: this.commonService.removePrefixFromMobile(
          callData?.From.toString(),
        ),
        serviceType: CALL_SERVICE.EXOTEL,
      };
      return responseData;
    } catch (error) {
      return kInternalError;
    }
  }

  private getStatus(subStatus: string) {
    switch (subStatus) {
      case 'in-progress':
        return 'INITIALIZED';
      case 'completed':
        return 'COMPLETED';
      case 'busy':
        return 'NOT_ANSWERED';
      case 'no-answer':
        return 'NOT_ANSWERED';
      case 'failed':
        return 'NOT_ANSWERED';
      default:
        return 'INITIALIZED';
    }
  }

  delay = (ms) => new Promise((res) => setTimeout(res, ms));
  async getCallLogData(passData = null) {
    try {
      const attributes = [
        'id',
        'status',
        'subStatus',
        'createdAt',
        'loanId',
        'to',
        'referenceId',
      ];
      const options: any = {
        where: { categoryId: passData.categoryId },
      };
      if (passData?.page && !passData?.download) {
        options.offset = passData.page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const categoryOptions: any = { where: { id: passData.categoryId } };
      const categoryData = await this.categoryRepository.getRowWhereData(
        ['id', 'category', 'from', 'status', 'adminId'],
        categoryOptions,
      );
      /// add getAdminData
      const adminData = await this.commonSharedService.getAdminData(
        categoryData?.adminId,
      );
      categoryData.createdByAdmin = adminData
        ? { id: adminData.id, fullName: adminData.fullName }
        : '-';
      if (categoryData == k500Error) return k500Error;
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName'],
      };
      options.include = [userInclude];
      if (passData.subStatus && passData.subStatus != 'All')
        options.where.subStatus = passData.subStatus;

      const response = await this.repository.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (response == k500Error) return response;
      return {
        total: response.count ?? 0,
        categoryData,
        data: response.rows ?? [],
      };
    } catch (error) {
      return k500Error;
    }
  }

  async getEventCallHistory(passData) {
    try {
      const startDate = passData.startDate ?? new Date();
      const endDate = passData.endDate ?? new Date();
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const categoryOptions: any = {
        where: {
          createdAt: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
        order: [['id', 'DESC']],
      };
      if (passData.category) categoryOptions.where.category = passData.category;
      const categoryAttr = [
        'id',
        'status',
        'subStatus',
        'adminId',
        'from',
        'category',
        'createdAt',
      ];
      const response = await this.categoryRepository.getTableWhereData(
        categoryAttr,
        categoryOptions,
      );
      if (response == k500Error) return k500Error;
      const finalData = [];
      for (let i = 0; i < response.length; i++) {
        try {
          const element = response[i];
          const adminData = await this.commonSharedService.getAdminData(
            element?.adminId,
          );
          element.createdByAdmin = adminData
            ? { id: adminData.id, fullName: adminData.fullName }
            : '-';
          const options = {
            where: { categoryId: element.id },
            group: 'subStatus',
          };
          const attributes: any = [
            'subStatus',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalEvent'],
          ];
          let callData = await this.repository.getTableWhereData(
            attributes,
            options,
          );
          if (callData == k500Error) callData = [];
          finalData.push({ ...element, eventData: callData });
        } catch (error) { }
      }
      return finalData;
    } catch (error) {
      return k500Error;
    }
  }

  async makeAgentToCustomerCall(values: {
    from: number;
    to: number;
    userId: string;
    adminId: number;
    roleId: number;
    createLogId?: number;
  }) {
    try {
      const isCollectionNumber = [5, 9, 11, 12].includes(values?.roleId ?? -1);
      const phone = isCollectionNumber
        ? process.env.EXOTEL_EXO_COLLECTION_PHONE
        : process.env.EXOTEL_EXO_PHONE;
      let body = gIsPROD
        ? `From=${values.from}&CallerId=${phone}&To=${values.to}`
        : `From=${process.env.EXOTEL_TEST_PHONE_FROM}&CallerId=${process.env.EXOTEL_EXO_PHONE}&To=${process.env.EXOTEL_TEST_PHONE_TO}`;
      const url = `https://${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}@api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;
      body += `&StatusCallback= ${process.env.HOST_URL}thirdParty/exotel/exotelStatusCallBack&StatusCallbackEvents[0]=terminal&StatusCallbackContentType=application/json&StatusCallbackEvents[1]=answered&CustomField=${values.createLogId}&Record=true`;

      const response: any = await axios.post(url, body).catch(() => {
        return kInternalError;
      });
      try {
        if (!response || !response?.data?.Call) {
          // Alert
          try {
            const threads = [];
            threads.push(`API body\n` + `${body}`);
            this.slack.sendMsg({
              text: `Exotel api error -> ${url}`,
              threads,
            });
          } catch (error) { }
        }
      } catch (error) { }
      if (!response) return kInternalError;
      const callResponse = response?.data?.Call;
      return {
        referenceId: callResponse?.Sid,
        status: this.getStatus(callResponse?.Status),
        subStatus: callResponse?.Status,
        response: JSON.stringify(callResponse),
        to: this.commonService.removePrefixFromMobile(values?.to.toString()),
        from: this.commonService.removePrefixFromMobile(
          values?.from.toString(),
        ),
      };
    } catch (error) {
      // Alert
      try {
        const threads = [];
        threads.push(`Error stack\n` + (error?.stack ?? `${error}`));

        this.slack.sendMsg({
          text: 'Exotel error -> makeAgentToCustomerCall()',
          threads,
        });
      } catch (error) { }

      return kInternalError;
    }
  }

  async exotelCallEvent(values: any) {
    try {
      let callEventType = values?.EventType;
      let adminData = await this.commonSharedService.getAdminData(
        values?.AgentEmail,
      );
      if (!adminData) return {}
      let adminCompanyPhone = this.commonService.removePrefixFromMobile(adminData.companyPhone)
      if (!adminCompanyPhone) return
      const eventName = `INCOMING_${adminCompanyPhone}`;
      const fromUser = this.commonService.removePrefixFromMobile(values.CallFrom)
      const hashPhone = this.cryptService.getMD5Hash(fromUser);
      const attr = ['id', 'fullName', 'phone', 'image'];
      const userOptions = {
        where: {
          hashPhone,
        },
      };
      const user = await this.userRepo.getRowWhereData(attr, userOptions);
      const phone = await this.cryptService.decryptPhone(user?.phone);
      if (!user || user == k500Error) return kNoDataFound
      const adminId = adminData?.id
      const subStatus = this.getStatus(values.Status)
      let payload: any = {
        categoryId: 0, // inbound call category
        to: adminCompanyPhone,
        from: phone,
        callStartDate: new Date(values?.CurrentTime),
        response: JSON.stringify(values),
        referenceId: values?.CallSid,
        serviceType: CALL_SERVICE.EXOTEL,
        adminId,
      };
      const sendEventObj: any = {
        userId: user?.id,
        from: fromUser,
        phone,
        image: user?.image,
        userName: user?.fullName,
        callSid: values?.CallSid,
        subStatus
      }
      let crmPayload: any = {
        adminId: adminId,
        userId: user?.id,
        crmStatusId: 1,
        crmOrder: 0,
        status: '0',
        remark: kIncommingCall,
        callSid: values?.CallSid,
        categoryId: 0,
      };
      if (callEventType == 'Ringing') {
        const getCrm = await this.createOrUpdateCrm(crmPayload)
        sendEventObj.crmId = getCrm?.id
        payload.crmId = getCrm?.id
        sendEventObj.status = INCOMMING_CALL_STATUSES.INCOMING
        this.callActiveObj[eventName] = { [phone]: INCOMMING_CALL_STATUSES.INCOMING }
        await this.repository.createRawData(payload)
      } else {
        let is_update = false
        if (callEventType == 'Answered') {
          this.callActiveObj[eventName] = { [phone]: INCOMMING_CALL_STATUSES.ACTIVE }
          sendEventObj.status = INCOMMING_CALL_STATUSES.ACTIVE
        } else if (callEventType == 'Terminal') {
          if (
            this.callActiveObj[eventName]
            && this.callActiveObj[eventName][phone]
            && this.callActiveObj[eventName][phone] == INCOMMING_CALL_STATUSES.ACTIVE) {
            sendEventObj.status = INCOMMING_CALL_STATUSES.CUT
          } else {
            sendEventObj.status = INCOMMING_CALL_STATUSES.MISSED
            if (this.callActiveObj[eventName]
              && this.callActiveObj[eventName][phone] == INCOMMING_CALL_STATUSES.INCOMING) is_update = true
            crmPayload.relationData = {
              statusName: 'Phone',
              statusId: 1,
              dispositionId: 2,
              dispositionName: 'Call not received',
              titleName: 'Not Reachable',
              titleId: 43,
            };
          }
          const getCrm = await this.createOrUpdateCrm(crmPayload, is_update)
          sendEventObj.crmId = getCrm?.id
          payload.crmId = getCrm?.id
          delete this.callActiveObj[eventName];
        }
      }
      this.sendEvent(eventName, sendEventObj)
      return true;
    } catch (error) {
      return k500Error;
    }
  }

  private async createOrUpdateCrm(payload: any, is_update = false) {
    try {
      const callSid = payload.callSid;
      let checkCrm: any = await this.crmRepository.getRowWhereData(['id'], {
        where: { callSid },
      });

      if (checkCrm && checkCrm != k500Error && !is_update) {
        return checkCrm;
      } else if (checkCrm && checkCrm != k500Error && is_update) {
        await this.crmRepository.updateRowData(payload, checkCrm.id);
      } else {
        const created: any = await this.crmRepository.createRawData(payload);
        const update = { status: 1 };
        const options = {
          where: {
            userId: payload.userId,
            id: { [Op.ne]: created?.id },
            status: { [Op.ne]: '1' },
          },
        };
        await this.crmRepository.updateRowWhereData(update, options);

        return created;
      }
    } catch (error) { }
  }

  async sendEvent(event, data) {
    try {
      data.eventType = event;
      data.currentDate = new Date().getTime();
      data.id = uuidv4();

      const filteredData = this.filterUndefinedProperties(data);
      this.firebaseDB
        .collection(IncommingCallCollection)
        .add(filteredData)
        .catch(function (error) {
          console.log('error: ', error);
        });
    } catch (error) {
      console.log({ error });
    }
  }

  filterUndefinedProperties(obj: any): any {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined),
    );
  }


  async exotelStatusCallBack(response) {
    try {
      const status = response?.Status;
      if (!status) return kParamMissing('status');
      const CustomField = response?.CustomField;
      if (!CustomField) return kParamMissing('CustomField');

      const updateStatus = await this.repository.updateRowData(
        {
          status: this.getStatus(status),
          subStatus: status,
          callStartDate: response?.StartTime,
          callEndDate: response?.EndTime,
          callTime: response?.ConversationDuration,
          response: JSON.stringify(response),
        },
        CustomField,
      );
      if (updateStatus == k500Error) return kInternalError;
    } catch (error) {
      return kInternalError;
    }
  }

  async ExotelCallDetails(body) {
    try {
      const exotelId = body?.id;
      if (!exotelId) return kParamMissing('id');
      const attributes = ['subStatus', 'response', 'callTime', 'referenceId'];
      const options = {
        where: { id: exotelId },
      };
      const getCallDetails = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (getCallDetails == k500Error) return kInternalError;
      const response = JSON.parse(getCallDetails?.response);
      const prepareData = {
        Sid: getCallDetails?.referenceId,
        RecordingUrl: response?.RecordingUrl ?? response?.recording_url,
        Status: getCallDetails?.subStatus,
        Duration: getCallDetails?.callTime,
        PhoneNumberSid:
          response?.PhoneNumberSid ??
          response?.did_number ??
          response?.caller_id_number,
      };
      return prepareData;
    } catch (error) {
      return kInternalError;
    }
  }
}
