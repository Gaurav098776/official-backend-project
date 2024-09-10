import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { EnvConfig } from 'src/configs/env.config';
import {
  CALL_SERVICE,
  exotelCategoryId,
  gIsPROD,
  INCOMMING_CALL_STATUSES,
  IncommingCallCollection,
  isUAT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { TATA_TELE_APIS } from 'src/constants/network';
import { CALL_STATUS, getStatus } from 'src/constants/objects';
import { kInternalError } from 'src/constants/responses';
import {
  kIncommingCall,
  kNoDataFound,
  kUserCallRemark,
} from 'src/constants/strings';
import { RedisService } from 'src/redis/redis.service';
import { CrmRepository } from 'src/repositories/crm.repository';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { APIService } from 'src/utils/api.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import admin from 'firebase-admin';
import { LoanRepository } from 'src/repositories/loan.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class TataTeleService {
  firebaseDB: any;
  callActiveObj = {};
  constructor(
    private readonly apiService: APIService,
    private readonly redisService: RedisService,
    private readonly repository: ExotelCallHistoryRepository,
    private readonly exotelCategoryRepository: ExotelCategoryRepository,
    private readonly typeService: TypeService,
    private readonly commonService: CommonService,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly loanRespository: LoanRepository,
    private readonly adminRepo: AdminRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly crmRepository: CrmRepository,
  ) {
    if (gIsPROD || isUAT) this.firebaseDB = admin.firestore();
  }

  //#region  generate token
  async generateAuthenticateToken() {
    try {
      //get already exists token
      const staticData = await this.redisService.get(EnvConfig.tatalTele.type);
      const currentTime = new Date();
      if (staticData) {
        const data = JSON.parse(staticData);
        const expireTime = new Date(data.expireIn);
        if (expireTime.getTime() >= currentTime.getTime())
          return data.access_token;
      }
      //if not then create new and save into database
      const body = {
        email: EnvConfig.tatalTele.LoginId,
        password: EnvConfig.tatalTele.Password,
      };
      const response = await this.apiService.post(
        TATA_TELE_APIS.GENERATE_TOKEN,
        body,
      );
      if (response == k500Error) return kInternalError;
      currentTime.setSeconds(currentTime.getSeconds() + response?.expires_in);
      response.expireIn = currentTime;
      //if exist then update the new token
      await this.redisService.set(
        EnvConfig.tatalTele.type,
        JSON.stringify(response),
      );
      return response?.access_token;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  make agent to user call
  async funMakeCallFromAgentToUser(body: any) {
    try {
      // make paylaod
      const payload: any = {
        agent_number: gIsPROD ? body.from : process.env.EXOTEL_TEST_PHONE_FROM,
        destination_number: gIsPROD
          ? body.to
          : process.env.EXOTEL_TEST_PHONE_TO,
        caller_id: EnvConfig.tatalTele.callerID,
        async: +(body?.async ?? 0),
        get_call_id: EnvConfig.tatalTele.isGetCallerID,
        custom_identifier: body.createLogId,
      };
      //generate token
      const token = await this.generateAuthenticateToken();
      if (token?.message) return kInternalError;
      const options = { headers: { Authorization: token } };
      //get caller response
      let callResponse: any = { subStatus: CALL_STATUS.INPROGRESS };
      try {
        callResponse = await this.apiService.post(
          TATA_TELE_APIS.CLICK_TO_CALL,
          payload,
          null,
          null,
          options,
        );
        if (callResponse == k500Error || !callResponse?.success)
          callResponse = {
            status: CALL_STATUS.NOT_ANSWERED,
            subStatus: CALL_STATUS.FAILED,
          };
      } catch (error) {}

      return {
        referenceId: callResponse?.referenceId,
        status: callResponse?.status ?? CALL_STATUS.INITIALIZED,
        subStatus: callResponse?.subStatus ?? CALL_STATUS.INPROGRESS,
        response: JSON.stringify(callResponse),
        to: this.commonService.removePrefixFromMobile(body?.to.toString()),
        from: this.commonService.removePrefixFromMobile(body?.from.toString()),
      };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  check status of caller
  async updateCallStatus(body: any) {
    try {
      const attributes = ['id', 'referenceId', 'status'];
      const options: any = {
        where: {
          [Op.or]: [
            {
              status: {
                [Op.notIn]: [CALL_STATUS.COMPLETED, CALL_STATUS.NOT_ANSWERED],
              },
            },
            {
              referenceId: {
                [Op.eq]: null,
              },
            },
          ],
          serviceType: CALL_SERVICE.TATA_TELE,
        },
      };
      if (body.call_id) options.where.referenceId = body.call_id;
      //get call history data
      const getCallHistoryData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (getCallHistoryData.length == 0) return [];
      //update all the history data
      for (let i = 0; i < getCallHistoryData.length; i++) {
        try {
          const eachCall = getCallHistoryData[i];
          //check all status
          const updateData = await this.checkStatusCall(eachCall);
          if (updateData == k500Error) continue;
          await this.repository.updateRowData(updateData, eachCall.id);
        } catch (error) {}
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  get status of call
  async checkStatusCall(payload: any) {
    try {
      const parameter: any = {};
      if (payload.referenceId) parameter.call_id = payload?.referenceId;
      else {
        const currentDate = new Date();
        const from_date = this.typeService.getDateFormated(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        const to_date = this.typeService.getDateFormated(currentDate);
        parameter.to_date = to_date;
        parameter.from_date = from_date;
      }
      //get auth token
      const token = await this.generateAuthenticateToken();
      if (token?.message) return kInternalError;
      const headers = { Authorization: token };
      //get call response status
      const response = await this.apiService.get(
        TATA_TELE_APIS.GET_CALL_RECORD,
        parameter,
        headers,
      );
      if (!response?.results || (response?.results ?? []).length == 0)
        return {};
      const callData = response?.results[0];
      const combinedDateTime = callData?.date + ' ' + callData.time;
      const startDate = new Date(combinedDateTime);
      //update data
      const updateData: any = {
        status: getStatus(callData?.status),
        subStatus: callData.status,
        callStartDate: startDate,
        callEndDate: new Date(callData?.end_stamp),
        callTime: callData?.call_duration ?? 0,
        response: JSON.stringify(callData),
      };
      if (!payload?.referenceId) updateData.referenceId = callData.call_id;
      return updateData;
    } catch (error) {
      return k500Error;
    }
  }

  //#region  call back updateStatus
  async callBackStatusUpdate(callData: any) {
    try {
      const updateData: any = {
        status: getStatus(callData.call_status),
        subStatus: callData.call_status,
        callStartDate: new Date(callData?.start_stamp),
        callEndDate: callData?.end_stamp ? new Date(callData?.end_stamp) : null,
        callTime: callData?.duration ?? 0,
        response: JSON.stringify(callData),
      };

      const options: any = {
        where: {
          serviceType: CALL_SERVICE.TATA_TELE,
        },
        order: [['id', 'desc']],
      };

      let to;
      if (callData?.call_to_number) {
        to = this.commonService.removePrefixFromMobile(
          callData?.call_to_number,
        );
      }

      if (callData.direction == 'broadcast') {
        if (isNaN(callData.campaign_id)) return {};
        options.where.brodcast_id = callData?.campaign_id;
        options.where.to = to;
      } else if (callData.direction == 'inbound') {
        options.where.referenceId = callData?.call_id;
        //send incoming call notifications
        await this.sendNoticationForIncomingCalls(callData, to, updateData);
      } else options.where.id = callData?.custom_identifier;

      const getRecord = await this.repository.getRowWhereData(
        ['id', 'referenceId', 'brodcast_id'],
        options,
      );
      if (getRecord == k500Error || !getRecord) return;
      if (!getRecord.referenceId || callData.direction == 'broadcast')
        updateData.referenceId = callData.call_id;
      await this.repository.updateRowData(updateData, getRecord.id);
      if (getRecord.brodcast_id)
        await this.updateBrodCast(getRecord.brodcast_id);

      return updateData;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  private async sendNoticationForIncomingCalls(callData, to, updateData) {
    try {
      let fromUser = callData?.caller_id_number;
      const hashPhone = this.cryptService.getMD5Hash(fromUser);
      fromUser = callData?.caller_id_number;
      const attr = ['id', 'fullName', 'phone', 'image'];
      const userOptions = {
        where: {
          hashPhone,
        },
      };
      const user = await this.userRepo.getRowWhereData(attr, userOptions);
      const phone = await this.cryptService.decryptPhone(user?.phone);
      if (!user || user == k500Error) return kNoDataFound;
      const adminCallData = await this.repository.getRowWhereData(
        ['id', 'referenceId', 'to'],
        { where: { referenceId: callData.call_id } },
      );

      if (!adminCallData) return {};
      to = this.commonService.removePrefixFromMobile(adminCallData.to);
      const eventName = `INCOMING_${to}`;
      const sendEventObj = {
        ...updateData,
        status: INCOMMING_CALL_STATUSES.CUT,
        userId: user?.id,
        from: fromUser,
        phone,
        image: user?.image,
        userName: user?.fullName,
        callSid: callData?.call_id,
      };

      const adminData: any = await this.commonSharedService.getAdminData(to);
      const adminId = adminData?.id;
      let payload: any = {
        adminId: adminId,
        userId: user?.id,
        crmStatusId: 1,
        crmOrder: 0,
        status: '0',
        remark: kIncommingCall,
        callSid: callData?.call_id,
        categoryId: 0,
      };
      if (['busy', 'missed', 'no-answer'].includes(callData?.call_status)) {
        sendEventObj.status = INCOMMING_CALL_STATUSES.MISSED;
        payload.relationData = {
          statusName: 'Phone',
          statusId: 1,
          dispositionId: 2,
          dispositionName: 'Call not received',
          titleName: 'Not Reachable',
          titleId: 43,
        };

        await this.createOrUpdateCrm(payload);
        // check call_id and update crmDispositions
      } else if (['Answered'].includes(callData?.call_status)) {
        this.callActiveObj[eventName] = INCOMMING_CALL_STATUSES.ACTIVE;
        let createCrm: any = await this.createOrUpdateCrm(payload);
        sendEventObj.status = INCOMMING_CALL_STATUSES.ACTIVE;
        sendEventObj.crmId = createCrm?.id;
      } else if (['completed', 'answered'].includes(callData?.call_status)) {
        delete this.callActiveObj[eventName];
        let createCrm: any = await this.createOrUpdateCrm(payload);
        sendEventObj.status = INCOMMING_CALL_STATUSES.CUT;
        sendEventObj.crmId = createCrm?.id;
      }

      this.sendEvent(eventName, sendEventObj);
    } catch (error) {
      console.log('error: ', error);
    }
  }

  private async createOrUpdateCrm(payload: any) {
    try {
      const callSid = payload.callSid;
      const checkCrm: any = await this.crmRepository.getRowWhereData(['id'], {
        where: { callSid },
      });

      if (checkCrm && checkCrm != k500Error) {
        return checkCrm;
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
    } catch (error) {}
  }

  //#region update brodcast status
  private async updateBrodCast(brodcast_id: number) {
    try {
      const checkAnyInProgress = await this.repository.getCountsWhere({
        where: { brodcast_id, status: { [Op.eq]: CALL_STATUS.INITIALIZED } },
      });
      if (checkAnyInProgress === k500Error) return {};
      else if (checkAnyInProgress == 0) {
        const token = await this.generateAuthenticateToken();
        if (token?.message) return kInternalError;
        const headers = { Authorization: token };
        const brodCastEnd = TATA_TELE_APIS.CLOSE_BRODCAST_STATUS + brodcast_id;
        //get call response status
        this.apiService.get(brodCastEnd, {}, headers).catch((err) => {});
        const endDate = new Date();
        await this.exotelCategoryRepository.updateRowWhereData(
          { status: CALL_STATUS.COMPLETED, endDate },
          {
            where: { brodcast_id, status: { [Op.ne]: CALL_STATUS.COMPLETED } },
          },
        );
      }
    } catch (error) {
      return {};
    }
  }
  //#endregion

  //#region  create lead
  async createLeadOFBrodCast(
    brodCastLeadID: number,
    data: any,
    canPlaceThisCall: any,
  ) {
    try {
      const tragetList = data?.targetList;
      const url = `${TATA_TELE_APIS.CREATE_USER_LEADS}/${brodCastLeadID}`;
      const token = await this.generateAuthenticateToken();
      if (token?.message) return kInternalError;
      const headers = { Authorization: token };
      const final_list = [];
      for (let i = 0; i < tragetList.length; i++) {
        try {
          const targetData = data?.targetList[i];
          const number = targetData.phone;
          final_list.push({
            userId: targetData.userId ?? tragetList[i]?.id,
            loanId: targetData.loanId,
            emiId: targetData.emiId,
            referenceId: brodCastLeadID,
            to: this.commonService.removePrefixFromMobile(number.toString()),
            categoryId: canPlaceThisCall.categoryId,
            serviceType: CALL_SERVICE.TATA_TELE,
            status: CALL_STATUS.INITIALIZED,
            subStatus: CALL_STATUS.INPROGRESS,
            adminId: data.adminId,
          });
        } catch (error) {}
      }
      const phones = final_list.map((each) => {
        return {
          field_0: each.to,
          field_1: each.userId,
          priority: 1,
        };
      });
      const payload = {
        data: phones,
        duplicate_option: 'skip',
      };

      const leadResponse = await this.apiService.post(
        url,
        payload,
        null,
        null,
        { headers },
      );
      if (leadResponse == k500Error) return kInternalError;
      return final_list;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region  create brod cast lead list
  async createBrodCastUserList(brodCastLeadName: string) {
    try {
      const payload = {
        name: this.typeService.replaceAll(brodCastLeadName, '_', ' '),
        description: this.typeService.replaceAll(brodCastLeadName, '_', ' '),
      };

      //get auth token
      const token = await this.generateAuthenticateToken();
      if (token?.message) return kInternalError;
      const headers = { Authorization: token };
      const brodCastLeadRes = await this.apiService.requestPost(
        TATA_TELE_APIS.BRODCAST_USER_CREATE,
        payload,
        headers,
      );

      return brodCastLeadRes;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region create brodcast
  async createBrodCastAndStart(category: string, leadId: number, appData: any) {
    try {
      const currentDate = new Date();
      const payload: any = {
        name: this.typeService.replaceAll(category, '_', ' '),
        description: this.typeService.replaceAll(category, '_', ' '),
        phone_number_list: leadId,
        destination: `auto_attendant||${appData.appId}`,
        timeout: '40',
        concurrent_limit: '5',
        retry_after_minutes: '30',
        number_of_retry: '1',
        caller_id_number: appData?.callId,
        start_date_time: this.typeService.dateTimeFormate(currentDate),
      };
      currentDate.setDate(currentDate.getDate() + 1);
      payload.end_date_time = this.typeService.dateTimeFormate(currentDate);
      //get auth token
      const token = await this.generateAuthenticateToken();
      if (token?.message) return kInternalError;
      const headers = { Authorization: token };

      const brodCastLeadRes = await this.apiService.requestPost(
        TATA_TELE_APIS.CREATE_BROD_CAST,
        payload,
        headers,
      );
      if (brodCastLeadRes == k500Error || !brodCastLeadRes?.broadcast_id)
        return brodCastLeadRes;
      const brodCastURL = `${TATA_TELE_APIS.START_BROD_CAST}/${brodCastLeadRes?.broadcast_id}`;
      const startBrodCast = await this.apiService.requestGet(
        brodCastURL,
        headers,
      );
      if (startBrodCast == k500Error) return k500Error;
      return {
        brodcast_id: brodCastLeadRes?.broadcast_id,
        response: JSON.stringify({ brodCastLeadRes, startBrodCast }),
      };
    } catch (error) {
      return k500Error;
    }
  }

  async callRecievedOnServer(body: any) {
    try {
      let fromUser = body?.caller_id_number;
      const hashPhone = this.cryptService.getMD5Hash(fromUser);
      const attr = ['id', 'fullName', 'phone', 'image'];
      const options = {
        where: {
          hashPhone,
        },
      };
      const to = this.commonService.removePrefixFromMobile(
        body?.agent_number.toString(),
      );
      const from = this.commonService.removePrefixFromMobile(
        fromUser.toString(),
      );

      const adminData: any = await this.commonSharedService.getAdminData(to);
      const adminId = adminData?.id;
      let payload: any = {
        categoryId: exotelCategoryId, // inbound call category
        to,
        from,
        callStartDate: new Date(body?.date),
        response: JSON.stringify(body),
        referenceId: body?.call_id,
        serviceType: CALL_SERVICE.TATA_TELE,
        adminId,
      };
      const user = await this.userRepo.getRowWhereData(attr, options);
      if (user && Object.keys(user)?.length) {
        const phone = await this.cryptService.decryptPhone(user?.phone);
        // if (!user || user == k500Error) return kNoDataFound;

        const loan: any = await this.loanRespository.getRowWhereData(
          ['id', 'loanStatus', 'userId'],
          {
            where: { userId: user?.id },
            order: [['id', 'DESC']],
          },
        );
        let loanId;
        if (
          loan != k500Error &&
          loan &&
          loan?.loanStatus != 'Rejected' &&
          loan?.loanStatus != 'Complete'
        )
          loanId = loan.id;

        // if (data == k500Error) return kInternalError;
        payload = {
          ...payload,
          loanId,
          userId: user?.id,
        };

        const eventName = `INCOMING_${to}`;
        const eventData = {
          status: INCOMMING_CALL_STATUSES.INCOMING,
          phone,
          image: user?.image,
          userName: user?.fullName,
          ...payload,
        };
        await this.sendEvent(eventName, eventData);
      }

      const data = await this.repository.createRawData(payload);
      return data;
    } catch (error) {
      return kInternalError;
    }
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
}
