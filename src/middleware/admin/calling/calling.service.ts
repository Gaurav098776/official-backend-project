import { Injectable } from '@nestjs/common';
//import { each } from 'cheerio/lib/api/traversing';
import { retry } from 'rxjs';
import { col, fn, Op, Sequelize, where } from 'sequelize';
import {
  CALL_SERVICE,
  EXOTEL_CATEGORY_PER_DAY_LIMIT,
  GlobalServices,
  PAGE_LIMIT,
  SYSTEM_ADMIN_ID,
  exotelCategoryId,
  gIsPROD,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { CALL_STATUS, kExotelAppIds, kTataAppIds } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kCallDetailsNotFound, kUserCallRemark } from 'src/constants/strings';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';
import { ExotelCategoryEntity } from 'src/entities/exotelCategory.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { CrmRepository } from 'src/repositories/crm.repository';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { TataTeleService } from 'src/thirdParty/tataTele/tataTele.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { collectionDashboardService } from '../collectionDashboard/collectionDashboard.service';

@Injectable()
export class CallingService {
  constructor(
    private readonly crmRepository: CrmRepository,
    private readonly repository: ExotelCallHistoryRepository,
    private readonly commonService: CommonService,
    private readonly tataTeleService: TataTeleService,
    private readonly exotelService: exotelService,
    private readonly typeService: TypeService,
    private readonly categoryRepository: ExotelCategoryRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly userRepo: UserRepository,
    private readonly loanRepo: LoanRepository,
    private readonly cryptService: CryptService,
    private readonly collectionService: collectionDashboardService,
  ) { }
  //#region  make calling service
  async funmakeAgentCall(body: any) {
    try {
      if (!body.adminId) return kParamMissing('adminId');
      if (!body.userId) return kParamMissing('userId');
      if (!body.to) return kParamMissing('to');
      if (!body.from) return kParamMissing('from');
      //create crm when user try to call
      const createCrm: any = await this.crmRepository.createRawData({
        adminId: body?.adminId,
        userId: body?.userId,
        crmStatusId: 1,
        crmOrder: 0,
        status: '0',
        remark: kUserCallRemark,
      });
      if (createCrm == k500Error) return kInternalError;
      //check service
      const active_service = GlobalServices.CALL_SERVICE;
      //create row data
      const creationRes = await this.repository.createRawData({
        userId: body?.userId,
        categoryId: 1,
        adminId: body?.adminId,
        to: this.commonService.removePrefixFromMobile(body.to),
        from: this.commonService.removePrefixFromMobile(body.from),
        crmId: createCrm?.id,
        serviceType: active_service,
      });
      if (creationRes == k500Error) return kInternalError;
      //make call based on service
      let response: any = {};
      body.createLogId = creationRes.id;
      if (active_service == CALL_SERVICE.TATA_TELE)
        response = await this.tataTeleService.funMakeCallFromAgentToUser(body);
      else response = await this.exotelService.makeAgentToCustomerCall(body);
      if (response?.message) return kInternalError;
      await this.crmRepository.updateRowData(
        {
          callSid: response?.referenceId ?? creationRes?.id,
        },
        createCrm.id,
      );
      const updatecreationRes = await this.repository.updateRowData(
        response,
        creationRes.id,
      );
      if (updatecreationRes == k500Error) return kInternalError;
      return { id: creationRes.id, crmId: createCrm.id, ...response };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get event list
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
        'serviceType',
        'startDate',
        'endDate',
      ];
      const response = await this.categoryRepository.getTableWhereData(
        categoryAttr,
        categoryOptions,
      );
      if (response == k500Error) return kInternalError;
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
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get sub status
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
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get call log data
  async getCallLogData(query = null) {
    try {
      if (!query.categoryId) return kParamMissing('categoryId');
      query.page = +query.page || 1;
      query.categoryId = query.categoryId;
      query.download = query?.download ?? false;
      query.subStatus = query?.subStatus;
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
        where: { categoryId: query.categoryId },
      };
      if (query?.page && !query?.download) {
        options.offset = query.page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const categoryOptions: any = { where: { id: query.categoryId } };
      const categoryData = await this.categoryRepository.getRowWhereData(
        [
          'id',
          'category',
          'from',
          'status',
          'adminId',
          'startDate',
          'endDate',
          'serviceType',
        ],
        categoryOptions,
      );
      /// add getAdminData
      const adminData = await this.commonSharedService.getAdminData(
        categoryData?.adminId,
      );
      categoryData.createdByAdmin = adminData
        ? { id: adminData.id, fullName: adminData.fullName }
        : '-';
      if (categoryData == k500Error) return kInternalError;
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName'],
      };
      options.include = [userInclude];
      if (query.subStatus && query.subStatus != 'All')
        options.where.subStatus = query.subStatus;

      const response = await this.repository.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (response == k500Error) return kInternalError;
      return {
        total: response.count ?? 0,
        categoryData,
        data: response.rows ?? [],
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region call details
  async callDetails(query: any) {
    try {
      const exotelId = query?.id;
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
      else if (!getCallDetails) return k422ErrorMessage(kCallDetailsNotFound);
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
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get all all data
  async getAllCallData(passData) {
    try {
      if (!passData?.userId) return kParamMissing('userId');
      passData.page = +passData.page || 1;
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
        'serviceType',
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
      if (callData == k500Error) return kInternalError;
      let completed = 0;
      const data = callData.rows;
      for (let index = 0; index < data.length; index++) {
        try {
          const ele = data[index];
          const response: any = ele?.response ? JSON.parse(ele?.response) : {};
          ele.recordingUrl = response?.RecordingUrl ?? response?.recording_url;
          ele.createdByAdmin = await this.commonSharedService.getAdminData(
            ele?.adminId,
          );
          if (ele.status == 'completed') completed++;
        } catch (error) { }
      }
      callData.completeCalls = completed;
      return callData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region place call
  async placeCall(data) {
    try {
      const userId = data.targetList.map((user) => user.userId);
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
      data.targetList.forEach((dataItem) => {
        let userDetail = users.find((user) => user.id === dataItem.userId);
        if (userDetail) {
          dataItem.appType = userDetail?.masterData?.loanData?.appType ?? userDetail.appType;
        }
      });
      const canPlaceThisCall: any = await this.canPlaceCall(
        data.category,
        data.adminId,
      );

      if (canPlaceThisCall.message) return canPlaceThisCall;
      // No need to wait
      this.callTargetUsers(data, canPlaceThisCall);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Check daily limits and targetIds
  private async canPlaceCall(category: string, adminId = SYSTEM_ADMIN_ID) {
    try {
      let categoryCount: any = 0;
      const currDate = new Date();
      const range = this.typeService.getUTCDateRange(
        currDate.toJSON(),
        currDate.toJSON(),
      );
      let active_service: any = GlobalServices.CALL_SERVICE;
      const options = {
        where: {
          category,
          status: CALL_STATUS.COMPLETED,
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
          serviceType: active_service,
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
          status: CALL_STATUS.INITIALIZED,
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
      let data: any = {};
      if (active_service == CALL_SERVICE.EXOTEL) data = kExotelAppIds[category];
      else {
        data = kTataAppIds[`${category}_NBFC1`];
      }
      let is_force = false
      if (!data) {
        if (kExotelAppIds[`${category}_NBFC`] || kExotelAppIds[`${category}_LSP`]) {
          active_service = CALL_SERVICE.EXOTEL
          data = kExotelAppIds[`${category}_NBFC`]
          is_force = true
        }
      }
      // #INFO# need to place tata tele category service
      if (!data && !is_force)
        return k422ErrorMessage(`Category ${category} is not eligible`);

      const creationData = {
        category,
        from: data?.callId,
        adminId,
        serviceType: active_service,
        startDate: new Date(),
      };
      const creationRes = await this.categoryRepository.createRowData(
        creationData,
      );
      if (creationRes == k500Error) return kInternalError;
      return { ...data, categoryId: creationRes.id, active_service };
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region call targeted users
  async callTargetUsers(data, canPlaceThisCall) {
    try {
      const active_service =
        canPlaceThisCall?.active_service ?? GlobalServices.CALL_SERVICE;
      let callResponse: any = {};
      if (active_service == CALL_SERVICE.TATA_TELE) {
        const nbfc1Users = [];
        const lspUsers = [];
        data.targetList.forEach((user) => {
          user.appType == 1 ? nbfc1Users.push(user) : lspUsers.push(user);
        });
        canPlaceThisCall.appId = kTataAppIds[`${data.category}_NBFC1`].appId;
        if (nbfc1Users.length > 0) {
          const filteredData = { ...data, targetList: nbfc1Users };
          callResponse = await this.createTataTeleBrodCast(
            filteredData,
            canPlaceThisCall,
          );
        }
        if (lspUsers.length > 0) {
          const lspData = { ...data, targetList: lspUsers };
          canPlaceThisCall.appId = kTataAppIds[`${data.category}_LSP`].appId;
          callResponse = await this.createTataTeleBrodCast(
            lspData,
            canPlaceThisCall,
          );
        }
      } else if (active_service == CALL_SERVICE.EXOTEL) {
        const filteredData = { ...data, targetList: data.targetList };
        callResponse = await this.createExotelBrodCast(filteredData, canPlaceThisCall);
      }
      return callResponse;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region create brodcast in tata tele
  private async createTataTeleBrodCast(data: any, canPlaceThisCall: any) {
    try {
      const leadBrodList: any =
        await this.tataTeleService.createBrodCastUserList(data.category);
      if (leadBrodList == k500Error) return kInternalError;
      const leadListID = leadBrodList?.list_id;
      const createUserLeadList: any =
        await this.tataTeleService.createLeadOFBrodCast(
          leadListID,
          data,
          canPlaceThisCall,
        );

      if (createUserLeadList?.message) return kInternalError;
      const brodCastData = await this.tataTeleService.createBrodCastAndStart(
        data.category,
        leadListID,
        canPlaceThisCall,
      );
      if (brodCastData == k500Error) return kInternalError;
      await this.categoryRepository.updateRowData(
        {
          brodcast_id: brodCastData.brodcast_id,
        },
        canPlaceThisCall.categoryId,
      );
      createUserLeadList.map((each) => {
        {
          each.brodcast_id = brodCastData?.brodcast_id;
          each.response = brodCastData.response;
        }
      });
      if (brodCastData == k500Error) return kInternalError;
      return await this.repository.bulckCreate(createUserLeadList);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region make call exotel
  private async createExotelBrodCast(data: any, canPlaceThisCall: any) {
    try {
      let success = 0;
      let failed = 0;
      const tragetList = data?.targetList;
      for (let index = 0; index < tragetList.length; index++) {
        try {
          await this.typeService.delay(250);
          const targetData = data.targetList[index];
          const number = targetData.phone;
          let callResponse = {};
          callResponse = await this.exotelService.sendCallReq(
            number,
            canPlaceThisCall,
          );
          if (callResponse == kInternalError) {
            failed++;
            continue;
          }
          const creationData = {
            ...callResponse,
            userId: targetData.id ?? targetData.userId,
            loanId: targetData.loanId,
            emiId: targetData.emiId,
            categoryId: canPlaceThisCall.categoryId,
            serviceType: CALL_SERVICE.EXOTEL,
          };

          const creationRes = await this.repository.createRawData(creationData);
          if (creationRes == k500Error) failed++;
          else {
            success++;
          }
        } catch (error) {
          failed++;
        }
      }
      return { success, failed, totalCalls: data.targetList.length };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  //#endregion

  // change user phone number only for testing purpose
  async changePhoneNumber(body) {
    const phoneNum = body?.phone;
    const userId = body?.userId;

    if (!userId) return kParamMissing('userId');
    if (!phoneNum) return kParamMissing('phoneNum');
    if (gIsPROD) return false;
    console.log('working');
    const hashPhone = this.cryptService.getMD5Hash(phoneNum);
    const phone = this.cryptService.encryptPhone(phoneNum);
    const attr = ['hashPhone', 'phone', 'id'];
    const option = {
      where: {
        hashPhone,
      },
    };
    let userDetails = await this.userRepo.getRowWhereData(attr, option);
    if (userDetails === k500Error) return kInternalError;
    if (userDetails) {
      const data = {
        phone: `${userDetails.phone}ldskjf`,
        hashPhone: null,
      };
      const options = {
        where: {
          id: userDetails.id,
        },
      };
      await this.userRepo.updateRowWhereData(data, options);
    }
    const details = {
      phone: phone,
      hashPhone: hashPhone,
    };
    const opt = {
      where: {
        id: userId,
      },
    };
    await this.userRepo.updateRowWhereData(details, opt);
    return true;
  }

  async getAllCallhistory(query) {
    try {
      const page = query?.page ?? 1;
      let startDate = query?.start_date;
      let endDate = query?.end_date;
      let status = query?.status;
      let adminId = query?.adminId;

      let performance = (query?.performance ?? 'T').toUpperCase();

      let currentDates: any;
      let dateRange: any;
      if (query.performance !== 'CUSTOM') {
        currentDates = await this.collectionService.startEndDate(
          performance,
          false,
          query.quarterly,
        );

        dateRange = this.typeService.getUTCDateRange(
          currentDates.startDate.toString(),
          currentDates.endDate.toString(),
        );
      }

      const loanInclude: any = {
        model: loanTransaction,
        attributes: ['id', 'userId', 'loanStatus', 'loanAmount', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 1,
      };
      const userInclude: any = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone', 'image', 'hashPhone'],
        include: [loanInclude],
      };

      let options: any = {
        where: {
          categoryId: { [Op.eq]: exotelCategoryId },
          status: { [Op.in]: ['COMPLETED', 'NOT_ANSWERED'] },
        },
        order: [['createdAt', 'DESC']],
        include: [userInclude],
      };

      if (page) {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      if (status) {
        options.where.status = status;
      }

      if (query.performance === 'CUSTOM' && startDate && endDate) {
        const range = this.typeService.getUTCDateRange(startDate, endDate);
        options.where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      } else {
        options.where.createdAt = {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        };
      }
      if (adminId && adminId !== '-1') options.where.adminId = adminId;
      const fieldAttr: any = [
        'id',
        'userId',
        'loanId',
        'emiId',
        'callStartDate',
        'callEndDate',
        'to',
        'from',
        'callTime',
        'status',
        'adminId',
        'categoryId',
        'createdAt',
        'response',
      ];
      const data = await this.repository.getTableWhereDataWithCounts(
        fieldAttr,
        options,
      );

      const filterData = [];
      const countData: any = await this.getCountOfCalldata(query);

      for (let i = 0; i < data.rows.length; i++) {
        try {
          const row = data.rows[i];
          let phone;
          if (row?.userData?.phone) {
            phone = await this.cryptService.decryptPhone(row?.userData?.phone);
          }
          const response = JSON.parse(row?.response ?? '');
          const loanId =
            row?.userData?.loanData.length &&
            !['Rejected', 'Complete'].includes(
              row?.userData?.loanData[0].loanStatus,
            ) &&
            row?.userData?.loanData[0].id;
          let obj: any = {
            'Loan ID': row?.loanId || loanId || '-',
            'User name': row?.userData?.fullName || '-',
            'Phone number': phone || row?.from || '-',
            'Profile Image': row?.userData?.image || '-',
            'Call date & time': row?.callStartDate || '-',
            Status: row?.status || '-',
            userId: row?.userData?.id || '-',
          };
          if (status === 'COMPLETED') {
            obj = {
              ...obj,
              Duration: this.commonService.formatTime(row?.callTime) || '-',
              Recording: response && (response?.recording_url || '-'),
            };
          }
          filterData.push(obj);
        } catch (error) { }
      }
      return {
        rows: filterData,
        count: data.count,
        ...countData.prepareCounts,
        totalCount: countData.totalCount,
      };
    } catch (err) {
      return kInternalError;
    }
  }
  async getCountOfCalldata(query) {
    try {
      let startDate = query?.start_date;
      let endDate = query?.end_date;
      let adminId = query?.adminId;

      let performance = (query?.performance ?? 'T').toUpperCase();

      let currentDates: any;
      let dateRange: any;
      if (query.performance !== 'CUSTOM') {
        currentDates = await this.collectionService.startEndDate(
          performance,
          false,
          query.quarterly,
        );

        dateRange = this.typeService.getUTCDateRange(
          currentDates.startDate.toString(),
          currentDates.endDate.toString(),
        );
      }
      const countAttributes: any = [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('status')), 'count'],
      ];

      let countOptions: any = {
        where: {
          categoryId: { [Op.eq]: exotelCategoryId },
          status: { [Op.in]: ['COMPLETED', 'NOT_ANSWERED'] },
        },
        group: 'status',
      };

      let totalCountOption: any = {
        where: {
          categoryId: { [Op.eq]: exotelCategoryId },
          status: { [Op.in]: ['COMPLETED', 'NOT_ANSWERED'] },
        },
      };

      if (adminId && adminId !== '-1') {
        countOptions.where.adminId = adminId;
        totalCountOption.where.adminId = adminId;
      }

      if (query.performance === 'CUSTOM' && startDate && endDate) {
        const range = this.typeService.getUTCDateRange(startDate, endDate);
        countOptions.where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      } else {
        countOptions.where.createdAt = {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        };
      }

      const statusData = await this.repository.getTableWhereData(
        countAttributes,
        countOptions,
      );
      const totalCount = await this.repository.getCountsWhere(totalCountOption);
      let prepareCounts = { answered: 0, notAnswered: 0 };
      if (statusData.length) {
        statusData.forEach((row) => {
          const key = row.status === 'COMPLETED' ? 'answered' : 'notAnswered';
          prepareCounts[`${key}`] = parseInt(row.count);
        });
      }
      return { totalCount, prepareCounts };
    } catch (error) {
      return { totalCount: 0, prepareCounts: 0 };
    }
  }
}
