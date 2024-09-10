// Imports
import { Injectable } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import * as fs from 'fs';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { k500Error } from 'src/constants/misc';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { Department } from 'src/entities/department.entity';
import { Op } from 'sequelize';
import { CrmRepository } from 'src/repositories/crm.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { UserRepository } from 'src/repositories/user.repository';
import {
  COLLECTION,
  crmTypeTitle,
  SUPPORT,
  TypeService,
} from 'src/utils/type.service';
import { EmiEntity } from 'src/entities/emi.entity';
import { CrmReasonRepository } from 'src/repositories/Crm.reasons.repository';
import { admin } from 'src/entities/admin.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { CryptService } from 'src/utils/crypt.service';
import { isUAT, PAGE_LIMIT, templateDesign } from 'src/constants/globals';
import { CrmReasonEntity } from 'src/entities/crm.reasons.entity';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { MasterRepository } from 'src/repositories/master.repository';
import {
  StrAdminAccess,
  StrDefault,
  kNoDataFound,
  nbfcInfoStr,
} from 'src/constants/strings';
import { EMIRepository } from 'src/repositories/emi.repository';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { DateService } from 'src/utils/date.service';
import { kLspMsg91Templates, kMsg91Templates } from 'src/constants/objects';
import { nPaymentRedirect } from 'src/constants/network';
import { EnvConfig } from 'src/configs/env.config';
import { kEmailPaymentReminderCRM } from 'src/constants/directories';
import { RedisService } from 'src/redis/redis.service';
import { NUMBERS } from 'src/constants/numbers';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class CRMService {
  constructor(
    private readonly crmStatusRepo: CrmStatusRepository,
    private readonly crmTitleRepo: CrmTitleRepository,
    private readonly dateService: DateService,
    private readonly dispositionRepo: CrmDispositionRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly emiRepo: EMIRepository,
    private readonly adminRepo: AdminRepository,
    private readonly crmRepo: CrmRepository,
    private readonly loanRepository: LoanRepository,
    private readonly userRepository: UserRepository,
    private readonly typeService: TypeService,
    private readonly crmReasonsRepo: CrmReasonRepository,
    private readonly cryptService: CryptService,
    private readonly defaulterOnlineRepo: DefaulterOnlineRepository,
    private readonly commonShared: CommonSharedService,
    private readonly masterRepo: MasterRepository,
    private readonly sharedNotification: SharedNotificationService,
    private readonly redisService: RedisService,
    private readonly repoManager: RepositoryManager,
  ) {}

  async migrateCrmTitles() {
    try {
      const jsonData = fs.readFileSync('./upload/crmParameter.json', 'utf-8');
      if (!jsonData) return kInternalError;
      const parsedData = JSON.parse(jsonData);
      for (const key in parsedData) {
        try {
          const mainData = parsedData[key];
          for (const subKey in mainData) {
            try {
              const subDisposition = mainData[subKey];
              const disposition = subDisposition['disposition'];
              const departmentIds = subDisposition['departmentIds'];
              let departmentData = await this.getDepartmentIds(departmentIds);
              let sourceData = await this.crmStatusRepo.getRowWhereData(
                ['id'],
                {
                  where: { status: subKey },
                },
              );
              if (!sourceData || sourceData == k500Error) {
                sourceData = await this.crmStatusRepo.createRowData({
                  status: subKey,
                  departmentIds: departmentData,
                });
                if (sourceData == k500Error) continue;
              } else {
                await this.crmStatusRepo.updateRowData(
                  { departmentIds: departmentData },
                  sourceData.id,
                );
              }
              for (let i = 0; i < disposition.length; i++) {
                try {
                  const dis = disposition[i];
                  const disDeparment = dis['departmentIds'];
                  let departmentData = await this.getDepartmentIds(
                    disDeparment,
                  );

                  delete dis['departmentIds'];
                  for (const dKey in dis) {
                    try {
                      let disId;
                      const checkDisData =
                        await this.dispositionRepo.getRowWhereData(['id'], {
                          where: { title: dKey },
                        });
                      if (!checkDisData) {
                        const createdData: any =
                          await this.dispositionRepo.createRowData({
                            title: dKey,
                            statusId: sourceData.id,
                            departmentIds: departmentData,
                          });
                        if (createdData) disId = createdData.id;
                      } else {
                        await this.dispositionRepo.updateRowData(
                          { departmentIds: departmentData },
                          checkDisData.id,
                        );
                        disId = checkDisData.id;
                      }
                      let titleData = dis[dKey];
                      for (let j = 0; j < titleData.length; j++) {
                        try {
                          let each = titleData[j];
                          const exitingData: any =
                            await this.crmTitleRepo.getRowWhereData(
                              ['id', 'title'],
                              {
                                where: { title: each.title },
                              },
                            );
                          departmentData = await this.getDepartmentIds(
                            each.departmentIds,
                          );
                          each.departmentIds = departmentData;
                          if (!exitingData) {
                            titleData = {
                              ...each,
                              crmDispositionId: disId,
                            };
                            await this.crmTitleRepo.createRowData(titleData);
                          } else {
                            await this.crmTitleRepo.updateRowData(
                              {
                                ...each,
                                crmDispositionId: disId,
                              },
                              exitingData.id,
                            );
                          }
                        } catch (error) {}
                      }
                    } catch (error) {}
                  }
                } catch (error) {}
              }
            } catch (error) {}
          }
        } catch (error) {}
      }

      return parsedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getTodayCrmData(query) {
    try {
      const status: any = query.status ?? '-1';
      const adminId: any = query.adminId ?? '-1';
      const page: number = query.page ?? 1;
      const start_Date = query?.start_date;
      const end_Date = query?.end_date;
      const searchText: string = query.searchText;
      if (!start_Date && !end_Date) return kParamsMissing;

      let { fromDate, endDate }: any = this.typeService.getUTCDateRange(
        start_Date,
        end_Date,
      );
      const passData = { fromDate, endDate, searchText, adminId, status, page };
      const crmOptions: any = this.prepareCrmOptions(passData);
      if (crmOptions.message) return kInternalError;
      const attributes = [
        'id',
        'userId',
        'categoryId',
        'due_date',
        'status',
        'adminId',
        'read',
        'closingDate',
        'remark',
        'createdAt',
        'settlementData',
        'amount',
        'reason',
        'referenceName',
        'relationData',
      ];

      const crmData: any = await this.crmRepo.getTableWhereCountData(
        attributes,
        crmOptions,
      );
      if (crmData == k500Error)
        return { valid: false, message: 'crm data not found' };
      const finalData = [];
      for (let i = 0; i < crmData.rows.length; i++) {
        try {
          const element = crmData.rows[i];
          element.registeredUsers.phone = this.cryptService.decryptPhone(
            element.registeredUsers.phone,
          );
          if (element.settlementData)
            element.settlementData = JSON.parse(element.settlementData);
          if (!element.descriptionData)
            element.descriptionData = element.description ?? element.remark;
          const relationData = element.relationData;
          delete element.relationData;
          let pinCrm = 0;
          if (element?.registeredUsers?.pinCrm?.id == element?.id) pinCrm = 1;
          delete element.registeredUsers.pinCrm;
          finalData.push({ ...element, ...relationData, pinCrm });
        } catch (error) {}
      }

      return { count: crmData.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private prepareCrmOptions(passData) {
    try {
      let userWhere;
      let loanId;
      let search = (passData?.searchText ?? '').toLowerCase();
      if (search) {
        if (search.startsWith('l-')) loanId = search.replace('l-', '');
        else if (!isNaN(search)) {
          search = this.cryptService.encryptPhone(search);
          if (search == k500Error) return k500Error;
          search = search.split('===')[1];
          userWhere = { phone: { [Op.like]: '%' + search + '%' } };
        } else userWhere = { fullName: { [Op.iRegexp]: passData?.searchText } };
      }

      const userInlude = {
        model: registeredUsers,
        attributes: ['fullName', 'phone', 'pinCrm'],
        where: userWhere,
      };
      //not remove beacuse admin is include inside the the include
      const adminInclude = {
        model: admin,
        as: 'adminData',
        attributes: ['id', 'fullName'],
        include: [{ model: Department, attributes: ['id', 'department'] }],
      };
      const closeByInclude = {
        model: admin,
        as: 'closedByData',
        attributes: ['id', 'fullName'],
      };

      const loanInclude = {
        model: loanTransaction,
        attributes: ['id'],
      };
      let condition = {};
      if (passData?.status && passData.status != '-1')
        condition['status'] = passData.status.toString();
      if (passData?.adminId && passData.adminId != '-1')
        condition['adminId'] = passData.adminId;
      if (passData.categoryId) condition['categoryId'] = passData.categoryId;
      if (passData.userId) condition['userId'] = passData.userId;
      if (loanId) condition['loanId'] = loanId;
      let where: any = {};
      if (passData.fromDate && passData.endDate && !passData?.isViewAll) {
        where = {
          createdAt: {
            [Op.gte]: passData.fromDate,
            [Op.lte]: passData.endDate,
          },
        };
      }
      const crmOptions: any = {
        where: {
          ...where,
          isDelete: '0',
          ...condition,
        },
        order: [['createdAt', 'DESC']],
        include: [userInlude, adminInclude, loanInclude, closeByInclude],
      };
      if (passData.page) {
        const offset = passData.page * PAGE_LIMIT - PAGE_LIMIT;
        const limit = PAGE_LIMIT;
        crmOptions.limit = limit;
        crmOptions.offset = offset;
      }
      return crmOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetUserCrmActivity(query) {
    try {
      if (!query.start_date || !query.end_date) return kParamsMissing;
      const startDate = query.start_date;
      const endDate = query.end_date;
      const adminId = query?.adminId;
      const userId = query?.userId;
      const categoryId = query?.categoryId;
      const isViewAll = query?.isViewAll == 'true';
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const attributes = [
        'userId',
        'categoryId',
        'due_date',
        'status',
        'adminId',
        'read',
        'id',
        'closingDate',
        'createdAt',
        'remark',
        'settlementData',
        'amount',
        'reason',
        'referenceName',
        'relationData',
      ];
      const passData = {
        categoryId,
        adminId,
        isViewAll,
        userId,
        fromDate: range.fromDate,
        endDate: range.endDate,
      };
      const crmOptions = await this.prepareCrmOptions(passData);
      if (crmOptions.message) return crmOptions;
      let crmData: any = await this.crmRepo.getTableWhereData(
        attributes,
        crmOptions,
      );
      if (crmData == k500Error)
        return { valid: false, message: 'CRM not found' };
      crmData = crmData.map((ele) => {
        if (ele.settlementData)
          ele.settlementData = JSON.parse(ele.settlementData);
        const relationData = ele.relationData;
        delete ele.relationData;
        ele = { ...ele, ...relationData };
        return ele;
      });
      const finalData: any = await this.crmFormateByDay(crmData);
      if (finalData.message) return k422ErrorMessage('Can not fetch CRM!');
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async crmFormateByDay(data: any[]) {
    try {
      for (let index = 0; index < data.length; index++) {
        const element = data[index];
        if (element?.closedByData?.departmentId) {
          const tempData = await this.departmentRepo.getRowWhereData(
            ['department'],
            {
              where: { id: element.closedByData.departmentId },
            },
          );
          if (tempData != k500Error)
            data[index]['department'] = tempData.department;
        }
      }

      data = data.map((obj) => ({
        ...obj,
        onlyDate: obj.createdAt.toJSON().substring(0, 10),
      }));
      return this.groupByKey(data, 'onlyDate');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  groupByKey(array, key) {
    const data = array.reduce(function (r, a) {
      r[a[key]] = r[a[key]] || [];
      r[a[key]].push(a);
      return r;
    }, Object.create(null));
    return { ...data };
  }

  async getDispositionData(query) {
    try {
      if (!query.statusId || !query.departmentId) return kParamsMissing;
      const deparmentIds = +query.departmentId;
      const attributes = ['id', 'title', 'statusId', 'departmentIds'];
      const options = {};
      const key = `${deparmentIds}_DISPOSITION_DATA`;
      let finalResponse = [];
      let finalData = await this.redisService.getKeyDetails(key);
      if (!finalData) {
        finalData = await this.dispositionRepo.getTableWhereData(
          attributes,
          options,
        );
        if (finalData == k500Error) return kInternalError;
        await this.redisService.set(
          key,
          JSON.stringify(finalData),
          NUMBERS.SEVEN_DAYS_IN_SECONDS,
        );
        finalData = await this.redisService.getKeyDetails(key);
      }
      finalData = JSON.parse(finalData);
      finalData.forEach((data) => {
        if (
          data.statusId == query.statusId &&
          data.departmentIds.includes(deparmentIds)
        ) {
          finalResponse.push({ id: data.id, title: data.title });
        }
      });
      return finalResponse;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getDepartmentIds(deparmentData) {
    try {
      let departmentData: any = await this.departmentRepo.getTableWhereData(
        ['id'],
        {
          where: { department: deparmentData },
        },
      );
      if (departmentData == k500Error) departmentData = [];
      return departmentData.map((ele) => ele.id);
    } catch (error) {
      return [];
    }
  }

  async checkCrmDataAsStatus(data) {
    try {
      const options = {
        where: { id: data.adminId },
        include: [
          { model: Department, attributes: ['id', 'department', 'loanStatus'] },
        ],
      };
      const adminData = await this.adminRepo.getRoweData(['id'], options);
      if (adminData == k500Error || !adminData)
        return k422ErrorMessage('admin not found!');

      const adminDepartment = adminData.departmentData.department;
      const loanStatus = adminData.departmentData.loanStatus;

      const queryString = `SELECT "id", "loanStatus", "appType" FROM "loanTransactions" AS "loanTransaction" WHERE "loanTransaction"."userId" = '${data.userId}' ORDER BY "loanTransaction"."id" DESC LIMIT 1`;
      let loanData: any = await this.repoManager.injectRawQuery(
        loanTransaction,
        queryString,
        { source: 'REPLICA' },
      );

      if (loanData[0] && loanData != k500Error) {
        data.appType = loanData[0].appType;
        if (loanStatus.includes(loanData[0].loanStatus)) {
          data.loanId = loanData[0].id;
        }
      }
      data.adminId = data.adminId;
      data.remark = data.remark;
      data.adminDepartment = adminDepartment;
      const relationData: any = {};
      if (data.statusId) {
        const crmStatusData = await this.getCrmStatusData(data.statusId);
        if (crmStatusData.message) return crmStatusData;
        relationData.statusId = crmStatusData.id;
        relationData.statusName = crmStatusData.status;
      }
      if (data.crmReasonId) {
        const crmReasonData = await this.getCrmReasonData(data.crmReasonId);
        if (crmReasonData.message) return crmReasonData;
        relationData.reasonId = crmReasonData.id;
        relationData.reasonName = crmReasonData.reason;
      }
      if (data.dispositionId) {
        const disData: any = await this.getCrmDisData(data.dispositionId, [
          'templateList',
        ]);
        if (disData.message) return disData;
        relationData.dispositionId = disData.id;
        relationData.dispositionName = disData.title;
        let templateList = disData.templateList ?? [];
        data.templateData = templateList.find(
          (el) => el.isActive && el.titleId == data.titleId,
        );
      }
      if (data.titleId) {
        const crmTitleData: any = await this.crmTitleRepo.getRowWhereData(
          [
            'id',
            'isAmount',
            'isDate',
            'isReference',
            'isReason',
            'isSettlement',
            'title',
          ],
          { where: { id: data?.titleId } },
        );

        if (crmTitleData == k500Error) return k500Error;
        relationData.titleId = crmTitleData.id;
        relationData.titleName = crmTitleData.title;
        if (crmTitleData.isAmount) {
          if (!data?.amount) return k422ErrorMessage('Amount is Required');
        }
        if (crmTitleData.isDate && !crmTitleData.isSettlement) {
          if (!data?.due_date) return k422ErrorMessage('Due Date is Required');
          data.due_date = new Date(data.due_date).toJSON();
        }
        if (crmTitleData.isReference) {
          if (!data?.referenceName)
            return k422ErrorMessage('Reference Name is Required');
        }
        if (crmTitleData.isSettlement) {
          if (!data.settlementData || data.settlementData.length == 0)
            return k422ErrorMessage('Settlement data is Required');
        }
        if (crmTitleData.isReason) {
          if (!data.reason)
            return k422ErrorMessage('Reason Status is Required');
        }
      }

      if (data.message) return data;
      delete data.titleId;
      delete data.crmReasonId;
      delete data.dispositionId;
      delete data.statusId;
      if (data.exotelCallRes) relationData.exotel = data.exotelCallRes;

      data.relationData = relationData;
      data.status = '0';
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmStatusData(id) {
    try {
      const crmStatusData = await this.crmStatusRepo.getRowWhereData(
        ['id', 'status'],
        { where: { id } },
      );
      if (crmStatusData == k500Error || !crmStatusData)
        return k422ErrorMessage('source not found!');
      return crmStatusData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmReasonData(id) {
    try {
      const crmReasonData = await this.crmReasonsRepo.getRowWhereData(
        ['id', 'reason'],
        { where: { id } },
      );
      if (crmReasonData == k500Error || !crmReasonData)
        return k422ErrorMessage('Reason not found!');
      return crmReasonData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmDisData(id, extraAttrs = []) {
    try {
      const crmDisData = await this.dispositionRepo.getRowWhereData(
        ['id', 'title', ...extraAttrs],
        { where: { id } },
      );
      if (!crmDisData) return k422ErrorMessage('Disposition not found!');
      if (crmDisData == k500Error) return kInternalError;
      return crmDisData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmActiviType(department, loanId = null) {
    try {
      let type = '0';
      if (loanId) {
        const loanOptions: any = { where: { id: loanId } };
        const today = this.typeService.getGlobalDate(new Date());
        const loanInclude = {
          model: EmiEntity,
          attributes: ['emi_date', 'payment_status', 'payment_due_status'],
        };
        loanOptions.include = loanInclude;
        const loanEmiData: any = await this.loanRepository.getRowWhereData(
          [],
          loanOptions,
        );
        for (let i = 0; i < loanEmiData.emiData.length; i++) {
          try {
            const ele = loanEmiData.emiData[i];
            const emiDate = new Date(ele.emi_date);
            if (
              emiDate.getTime() < today.getTime() &&
              ele.payment_status == '0' &&
              ele.payment_due_status == '1'
            ) {
              if (department == COLLECTION) type = '1';
              else type = '0';
              break;
            } else if (
              emiDate.getTime() == today.getTime() &&
              ele.payment_status == '0'
            )
              type = '2';
            else if (
              emiDate.getTime() == today.getTime() &&
              ele.payment_status == '1'
            )
              if (department == COLLECTION) type = '0';
              else type = '1';
            else type = '0';
          } catch (error) {}
        }
      }
      return { id: type, title: crmTypeTitle[type] };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async createCrm(body) {
    try {
      // Params validation
      const statusId = body?.statusId;
      if (!statusId) return kParamMissing('statusId');
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      const dispositionId = body?.dispositionId;
      if (!dispositionId) return kParamMissing('dispositionId');
      const adminId = +body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      if (!body.remark) return kParamMissing('remark');

      const createData: any = await this.checkCrmDataAsStatus(body);
      const templateData = createData.templateData ?? { isActive: false };
      delete createData.templateData;
      if (createData.message) return createData;
      const getCrmType: any = await this.getCrmActiviType(
        createData.adminDepartment,
        createData?.loanId,
      );
      if (getCrmType.message) return getCrmType;
      createData.categoryId = getCrmType.id;

      const isAssigned: any = await this.assignAdminAtFirstCrm(
        createData?.userId,
        createData?.adminId,
      );
      if (isAssigned.message) return isAssigned;
      if (
        createData?.settlementData &&
        createData?.settlementData.length != 0
      ) {
        let settlmentData = createData.settlementData.map((ele) => {
          return {
            amount: ele.amount,
            due_date: new Date(ele.due_date),
            read: '0',
            ptpStatus: '0',
          };
        });
        settlmentData = settlmentData.sort(
          (a, b) => a.due_date.getTime() - b.due_date.getTime(),
        );
        createData.settlementData = JSON.stringify(settlmentData);
        createData.due_date = settlmentData[0].due_date;
      } else createData.settlementData = null;
      const admin = await this.commonShared.getAdminData(adminId);
      let currentCrmId;
      let crmSuccessMsg = '';
      createData.lastUpdatedBy = admin?.fullName;
      if (body?.crmId) {
        const updateCrm: any = await this.crmRepo.updateRowData(
          createData,
          body.crmId,
        );
        if (updateCrm[0] > 0) currentCrmId = body.crmId;
        else return k422ErrorMessage('CRM not updated');
        createData.id = body.crmId;
        await this.defaulterOnlineCRM(createData);
        // temporary redis code commented due to PROD issue
        // const key = `${userId}_USER_BASIC_DETAILS`;
        // await this.redisService.del(key);
        crmSuccessMsg = 'CRM updated successfully!';
      } else {
        // CRM rights validation
        const accessResult: any = await this.validateCRMRights(userId, adminId);
        if (accessResult?.message) return accessResult;

        createData.crmOrder = 1;
        const createdCrm: any = await this.crmRepo.createRawData(createData);
        if (createdCrm == k500Error) return k422ErrorMessage('CRM not created');
        currentCrmId = createdCrm.id;
        await this.defaulterOnlineCRM(createdCrm);
        // temporary redis code commented due to PROD issue
        // const key = `${userId}_USER_BASIC_DETAILS`;
        // await this.redisService.del(key);
        crmSuccessMsg = 'CRM created successfully!';
      }

      await this.updateAndClosePreviousCrms(
        createData.adminId,
        currentCrmId,
        createData.userId,
      );
      const relationData = createData?.relationData ?? {};
      let userCrm = createData;
      userCrm = { ...createData, ...relationData };
      delete userCrm?.userId;
      delete userCrm?.adminId;
      delete userCrm?.id;
      delete userCrm?.crmId;
      delete userCrm?.relationData;
      delete userCrm?.lastUpdatedBy;
      delete userCrm?.pinCrm;
      userCrm.adminName = admin?.fullName;
      userCrm.createdAt = new Date().toJSON();
      let pinCrm;
      if (body.pinCrm) pinCrm = { id: currentCrmId, ...userCrm };
      const updatedData = { lastCrm: userCrm, pinCrm };
      await this.userRepository.updateRowData(updatedData, userId);

      if (crmSuccessMsg) {
        // Sending notification, SMS and Email to current or past defaulter user
        if (templateData.isActive) {
          this.notifyDefaulterAboutCRM(
            userId,
            createData.loanId,
            adminId,
            templateData,
            createData,
            currentCrmId,
          );
        }
        if (templateData.titleId == 81) {
          const disData: any = await this.getCrmDisData(dispositionId, [
            'templateList',
          ]);
          if (disData.message) return disData;
          let templateList = disData.templateList ?? [];
          const templateData = templateList.find(
            (el) => el.isActive && el.titleId == 44,
          );

          await this.notifyDefaulterAboutCRM(
            userId,
            createData.loanId,
            adminId,
            templateData,
            createData,
            currentCrmId,
          );
        }

        return crmSuccessMsg;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async validateCRMRights(userId, adminId) {
    try {
      // Get user's master data
      const attributes = ['loanId', 'status'];
      const options = { order: [['id', 'DESC']], where: { userId } };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);

      // Check which rights needs to validate as per user's loan status
      const statusData = masterData.status ?? {};
      const loanStatus = statusData.loan ?? '-2';
      let loanStage = StrAdminAccess.preDisbursementCRM;
      if (loanStatus == 6) {
        loanStage = StrAdminAccess.postDisbursementCRM;
        const attributes = ['emi_date', 'payment_status', 'payment_due_status'];
        const options = {
          order: [['id', 'ASC']],
          where: { loanId: masterData.loanId },
        };
        const emiList = await this.emiRepo.getTableWhereData(
          attributes,
          options,
        );
        if (emiList == k500Error) return kInternalError;

        const today = this.typeService.getGlobalDate(new Date());
        for (let index = 0; index < emiList.length; index++) {
          try {
            const emiData = emiList[index];
            const isDefault =
              emiData.payment_due_status == '1' &&
              emiData.payment_status == '0';
            if (isDefault) {
              loanStage = StrAdminAccess.delayUnpaidEMICRM;
              break;
            }

            // Pre EMI
            const emiDate = new Date(emiData.emi_date);
            if (today.getTime() <= emiDate.getTime()) {
              const dayDifference = this.typeService.dateDifference(
                today,
                emiDate,
              );
              if (dayDifference <= 7) loanStage = StrAdminAccess.upcomingEMICRM;
            }
          } catch (error) {}
        }
      }

      return await this.adminRepo.checkHasAccess(adminId, loanStage, 2);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Sending notification, SMS and Email to current or past defaulter user
  private async notifyDefaulterAboutCRM(
    userId,
    loanId,
    adminId,
    templateData,
    crmData,
    currentCrmId,
  ) {
    try {
      // Validation -> Parameters
      if (!loanId) return kParamMissing('loanId');

      // Query
      const attributes = ['id'];
      const options = { where: { loanId, payment_due_status: '1' } };
      const emiData = await this.emiRepo.getRowWhereData(attributes, options);
      if (!emiData) return k422ErrorMessage(kNoDataFound);
      if (emiData == k500Error) return kInternalError;

      // Get agent data
      const adminData = await this.adminRepo.getRowWhereData(['companyPhone'], {
        where: { id: adminId },
      });
      if (!adminData) return k422ErrorMessage(kNoDataFound);
      if (adminData == k500Error) return kInternalError;
      if (!adminData?.companyPhone) return k422ErrorMessage(kNoDataFound);
      const agentPhone = await this.cryptService.decryptText(
        adminData.companyPhone,
      );

      const appType = crmData?.appType;
      // Required content
      let newPTPDate = '-';
      let newPTPTime = '-';
      let previousPTPDate = '-';
      let previousPTPTime = '-';
      let previousAmount = '-';
      let previousPTPData = {};
      let totalSettlementParts = 0;
      let newAmount = 0;

      // Send notification
      let notificationTitle = '-';
      let notificationBody = '-';
      if (templateData.notification) {
        notificationTitle =
          templateData.notificationTitle ?? StrDefault.notificationTitle;
        notificationBody = templateData.notificationBody ?? '';
        // Agent number
        if (notificationBody.includes('##AGENT_NUMBER##')) {
          notificationBody = notificationBody.replace(
            /##AGENT_NUMBER##/g,
            agentPhone,
          );
        }
        // New PTP date
        if (notificationBody.includes('##NEW_DATE##')) {
          const dueDate = new Date(crmData.due_date);
          if (isNaN(dueDate.getTime())) return kInvalidParamValue('due_date');
          const dateInfo = this.dateService.dateToReadableFormat(dueDate);
          newPTPDate = dateInfo.readableStr;
          newPTPTime = `${dateInfo.hours}:${dateInfo.minutes} ${dateInfo.meridiem}`;
          notificationBody = notificationBody.replace(
            /##NEW_DATE##/g,
            newPTPDate,
          );
        }
        // New PTP time
        if (notificationBody.includes('##NEW_TIME##')) {
          notificationBody = notificationBody.replace(
            /##NEW_TIME##/g,
            newPTPTime,
          );
        }
        // Previous date
        if (notificationBody.includes('##PREVIOUS_DATE##')) {
          const attributes = ['amount', 'due_date'];
          const options = {
            order: [['id', 'DESC']],
            where: {
              loanId,
              [Op.or]: [
                {
                  relationData: {
                    [Op.contains]: { titleName: 'Will pay part payment' },
                  },
                },
                {
                  relationData: {
                    [Op.contains]: { titleName: 'Promise to Pay' },
                  },
                },
                {
                  relationData: {
                    [Op.contains]: {
                      titleName: 'PTP Broken and New PTP Given',
                    },
                  },
                },
              ],
              id: { [Op.ne]: currentCrmId },
            },
          };
          const crmData = await this.crmRepo.getRowWhereData(
            attributes,
            options,
          );
          if (!crmData) return k422ErrorMessage(kNoDataFound);
          if (crmData == k500Error) return kInternalError;
          previousPTPData = crmData;

          previousAmount = crmData.amount?.toString() ?? '-';
          const dueDate = new Date(crmData.due_date);
          if (isNaN(dueDate.getTime())) return kInvalidParamValue('due_date');
          const dateInfo = this.dateService.dateToReadableFormat(dueDate);
          previousPTPDate = dateInfo.readableStr;
          previousPTPTime = `${dateInfo.hours}:${dateInfo.minutes} ${dateInfo.meridiem}`;
          notificationBody = notificationBody.replace(
            /##PREVIOUS_DATE##/g,
            previousPTPDate,
          );
        }
        // Previous PTP time
        if (notificationBody.includes('##PREVIOUS_TIME##')) {
          notificationBody = notificationBody.replace(
            /##PREVIOUS_TIME##/g,
            previousPTPTime,
          );
        }
        // Previous amount
        if (notificationBody.includes('##PREVIOUS_AMOUNT##')) {
          notificationBody = notificationBody.replace(
            /##PREVIOUS_AMOUNT##/g,
            `Rs.${previousAmount}`,
          );
        }
        // New amount
        if (notificationBody.includes('##NEW_AMOUNT##')) {
          if (!crmData.amount) return kParamMissing('amount');
          newAmount = crmData.amount;
          notificationBody = notificationBody.replace(
            /##NEW_AMOUNT##/g,
            `Rs.${newAmount.toString()}`,
          );
        }
        // Settlement parts
        if (notificationBody.includes('##TOTAL_PARTS##')) {
          let settlementData = crmData.settlementData ?? '';
          if (!settlementData) return kParamMissing('settlementData');
          settlementData = JSON.parse(settlementData);
          totalSettlementParts = settlementData.length;
          notificationBody = notificationBody.replace(
            /##TOTAL_PARTS##/g,
            totalSettlementParts.toString(),
          );
          settlementData.forEach((el, index) => {
            try {
              const targetDate = this.typeService.getGlobalDate(el.due_date);
              if (isNaN(targetDate.getTime()))
                return kInvalidParamValue('due_date');
              const targetDateInfo =
                this.dateService.dateToReadableFormat(targetDate);
              const date = targetDateInfo.readableStr;
              const time =
                targetDateInfo.hours +
                ':' +
                targetDateInfo.minutes +
                ' ' +
                targetDateInfo.meridiem;

              let part = ` payment of Rs.${el.amount} needs to be done on or before ${date} and ${time}`;
              if (index < settlementData.length - 1) part += ' and ';
              if (index == 0) {
                notificationBody = notificationBody.replace(
                  /##PART_ONE##/g,
                  '1st' + part,
                );
              } else if (index == 1) {
                notificationBody = notificationBody.replace(
                  /##PART_TWO##/g,
                  '2nd' + part,
                );
              } else if (index == 2) {
                notificationBody = notificationBody.replace(
                  /##PART_THREE##/g,
                  '3rd' + part,
                );
              }
            } catch (error) {}
          });
          if (notificationBody.includes('##PART_ONE##'))
            notificationBody = notificationBody.replace(/##PART_ONE##/g, '');
          if (notificationBody.includes('##PART_TWO##'))
            notificationBody = notificationBody.replace(/##PART_TWO##/g, '');
          if (notificationBody.includes('##PART_THREE##'))
            notificationBody = notificationBody.replace(/##PART_THREE##/g, '');
        }
      }

      // Send email
      if (templateData.email) {
        const emailTitle = templateData.emailTitle ?? StrDefault.emailTitle;
        const emailTemplatePath = await this.commonShared.getEmailTemplatePath(
          kEmailPaymentReminderCRM,
          appType,
          null,
          null,
        );
        if (!emailTemplatePath)
          return k422ErrorMessage('Email template path is missing');
        let html = (await fs.readFileSync(emailTemplatePath)).toString();
        if (html.includes('##HEADER_IMAGE##')) {
          const imageUrl = templateData.headerImageHTML;
          if (!imageUrl) return k422ErrorMessage('headerImageHTML is missing');
          html = html.replace(/##HEADER_IMAGE##/g, imageUrl);
        }
        if (html.includes('##CONTENT##')) {
          const content = templateData.emailContent;
          if (!content) return k422ErrorMessage('Html content is missing');
          html = html.replace(/##CONTENT##/g, content);
        }
        if (html.includes('##NBFCSHORTNAME##')) {
          html = html.replace(
            /##NBFCSHORTNAME##/g,
            EnvConfig.nbfc.nbfcCamelCaseName,
          );
        }

        if (html.includes('##NBFCLOGO##')) {
          html = html.replace(/##NBFCLOGO##/g, EnvConfig.url.nbfcLogo);
        }
        if (html.includes('##NBFCINFO##')) {
          html = html.replace(/##NBFCINFO##/g, nbfcInfoStr);
        }
        // Payment button
        if (html.includes('##PAYMENT_BUTTON##')) {
          const buttonHtml = templateData.buttonHtml;
          if (!buttonHtml) return k422ErrorMessage('buttonHtml is missing');
          html = html.replace(/##PAYMENT_BUTTON##/g, buttonHtml);
        }
        // Payment link
        if (html.includes('##PAYMENT_LINK##')) {
          const paymentKey = loanId * 484848;
          const paymentLink = nPaymentRedirect + paymentKey;
          html = html.replace(/##PAYMENT_LINK##/g, paymentLink);
        }
        if (html.includes('##AGENT_NUMBER##'))
          // Agent number
          html = html.replace(/##AGENT_NUMBER##/g, agentPhone);
        // Email title
        if (html.includes('##TITLE##')) {
          const titleContent = templateData.emailTitleContent;
          if (!titleContent) return k422ErrorMessage('titleContent is missing');
          html = html.replace(/##TITLE##/g, titleContent);
        }

        // New PTP date
        if (html.includes('##NEW_DATE##')) {
          if (!newPTPDate || !newPTPTime) {
            const dueDate = new Date(crmData.due_date);
            if (isNaN(dueDate.getTime())) return kInvalidParamValue('due_date');
            newPTPDate = this.typeService.jsonToReadableDate(dueDate.toJSON());
            const hours = dueDate.getHours();
            const minutes = dueDate.getMinutes();
            const tail = hours >= 12 ? 'PM' : 'AM';
            newPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
              minutes <= 9 ? '0' + minutes : minutes
            } ${tail}`;
          }
          html = html.replace(/##NEW_DATE##/g, newPTPDate);
        }
        // New PTP time
        if (html.includes('##NEW_TIME##')) {
          html = html.replace(/##NEW_TIME##/g, newPTPTime);
        }
        // Previous date
        if (html.includes('##PREVIOUS_DATE##')) {
          if (!previousPTPData) {
            const attributes = ['amount', 'due_date'];
            const options = {
              order: [['id', 'DESC']],
              where: {
                loanId,
                [Op.or]: [
                  {
                    relationData: {
                      [Op.contains]: { titleName: 'Will pay part payment' },
                    },
                  },
                  {
                    relationData: {
                      [Op.contains]: { titleName: 'Promise to Pay' },
                    },
                  },
                  {
                    relationData: {
                      [Op.contains]: {
                        titleName: 'PTP Broken and New PTP Given',
                      },
                    },
                  },
                ],
                id: { [Op.ne]: currentCrmId },
              },
            };
            const crmData = await this.crmRepo.getRowWhereData(
              attributes,
              options,
            );
            if (!crmData) return k422ErrorMessage(kNoDataFound);
            if (crmData == k500Error) return kInternalError;

            previousAmount = crmData.amount?.toString() ?? '-';
            const dueDate = new Date(crmData.due_date);
            if (isNaN(dueDate.getTime())) return kInvalidParamValue('due_date');
            previousPTPDate = this.typeService.jsonToReadableDate(
              dueDate.toJSON(),
            );
            const hours = dueDate.getHours();
            const minutes = dueDate.getMinutes();
            const tail = hours >= 12 ? 'PM' : 'AM';
            previousPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
              minutes <= 9 ? '0' + minutes : minutes
            } ${tail}`;
          }
          html = html.replace(/##PREVIOUS_DATE##/g, previousPTPDate);
        }
        // Previous PTP time
        if (html.includes('##PREVIOUS_TIME##')) {
          html = html.replace(/##PREVIOUS_TIME##/g, previousPTPTime);
        }
        // Previous amount
        if (html.includes('##PREVIOUS_AMOUNT##')) {
          html = html.replace(/##PREVIOUS_AMOUNT##/g, `Rs.${previousAmount}`);
        }
        // New amount
        if (html.includes('##NEW_AMOUNT##')) {
          if (!crmData.amount) return kParamMissing('amount');
          newAmount = crmData.amount;
          html = html.replace(/##NEW_AMOUNT##/g, `Rs.${newAmount.toString()}`);
        }
        // Settlement parts
        if (html.includes('##TOTAL_PARTS##')) {
          let settlementData = crmData.settlementData ?? '';
          if (!settlementData) return kParamMissing('settlementData');
          settlementData = JSON.parse(settlementData);
          totalSettlementParts = settlementData.length;
          html = html.replace(
            /##TOTAL_PARTS##/g,
            totalSettlementParts.toString(),
          );
          settlementData.forEach((el, index) => {
            try {
              const targetDate = this.typeService.getGlobalDate(el.due_date);
              if (isNaN(targetDate.getTime()))
                return kInvalidParamValue('due_date');
              const targetDateInfo =
                this.dateService.dateToReadableFormat(targetDate);
              const date = targetDateInfo.readableStr;
              const time =
                targetDateInfo.hours +
                ':' +
                targetDateInfo.minutes +
                ' ' +
                targetDateInfo.meridiem;

              let part = ` payment of Rs.${el.amount} needs to be done on or before ${date} and ${time}`;
              if (index < settlementData.length - 1) part += ' and ';
              if (index == 0) {
                html = html.replace(/##PART_ONE##/g, '1st' + part);
              } else if (index == 1) {
                html = html.replace(/##PART_TWO##/g, '2nd' + part);
              } else if (index == 2) {
                html = html.replace(/##PART_THREE##/g, '3rd' + part);
              }
            } catch (error) {}
          });
          if (html.includes('##PART_ONE##'))
            html = html.replace(/##PART_ONE##/g, '');
          if (html.includes('##PART_TWO##'))
            html = html.replace(/##PART_TWO##/g, '');
          if (html.includes('##PART_THREE##'))
            html = html.replace(/##PART_THREE##/g, '');
        }

        // Get user email id
        const options = {
          where: {
            id: userId,
          },
        };
        const userData = await this.userRepository.getRowWhereData(
          ['email'],
          options,
        );
        if (!userData) return k422ErrorMessage(kNoDataFound);
        if (userData == k500Error) return kInternalError;

        // Sending email to user
        const email = userData.email;
        await this.sharedNotification.sendEmailToUser(
          StrDefault.customEmail,
          email,
          userId,
          { subject: emailTitle, html, userId, appType },
        );
      }

      // Send sms
      let isMsgSent = false;
      const smsOptions: any = {};
      let smsId = '';
      if (templateData.sms) {
        const smsTemplateId = templateData.smsTemplateId ?? '';
        const lspSmsTemplateId = templateData.lspSmsTemplateId ?? '';
        if (!smsTemplateId) return kParamMissing('smsTemplateId');
        if (!lspSmsTemplateId) return kParamMissing('lspSmsTemplateId');
        const smsData =
          appType == 1
            ? kMsg91Templates[smsTemplateId]
            : kLspMsg91Templates[lspSmsTemplateId];
        const varOptions = smsData.varOptions ?? [];
        for (let index = 0; index < varOptions.length; index++) {
          try {
            const el = varOptions[index];
            const key = el.key;
            const title = el.title;
            if (key && title) {
              // New amount
              if (title == '##NEW_AMOUNT##') {
                if (!crmData.amount) return kParamMissing('amount');
                newAmount = crmData.amount;
                smsOptions[key] = `Rs.${newAmount.toString()}`;
              }
              // Agent number
              else if (title == '##AGENT_NUMBER##')
                smsOptions[key] = agentPhone;
              // PTP
              else if (title == '##NEW_DATE## AND ##NEW_TIME##') {
                if (!newPTPDate || !newPTPTime) {
                  const dueDate = new Date(crmData.due_date);
                  if (isNaN(dueDate.getTime()))
                    return kInvalidParamValue('due_date');
                  newPTPDate = this.typeService.jsonToReadableDate(
                    dueDate.toJSON(),
                  );
                  const hours = dueDate.getHours();
                  const minutes = dueDate.getMinutes();
                  const tail = hours >= 12 ? 'PM' : 'AM';
                  newPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
                    minutes <= 9 ? '0' + minutes : minutes
                  } ${tail}`;
                }
                smsOptions[key] = newPTPDate + ' and ' + newPTPTime;
              }
              // Previous amount
              else if (title == '##PREVIOUS_AMOUNT##') {
                smsOptions[key] = `Rs.${previousAmount}`;
              }
              // Previous date
              else if (title == '##PREVIOUS_DATE##') {
                if (!previousPTPData) {
                  const attributes = ['amount', 'due_date'];
                  const options = {
                    order: [['id', 'DESC']],
                    where: {
                      loanId,
                      [Op.or]: [
                        {
                          relationData: {
                            [Op.contains]: {
                              titleName: 'Will pay part payment',
                            },
                          },
                        },
                        {
                          relationData: {
                            [Op.contains]: { titleName: 'Promise to Pay' },
                          },
                        },
                        {
                          relationData: {
                            [Op.contains]: {
                              titleName: 'PTP Broken and New PTP Given',
                            },
                          },
                        },
                      ],
                      id: { [Op.ne]: currentCrmId },
                    },
                  };
                  const crmData = await this.crmRepo.getRowWhereData(
                    attributes,
                    options,
                  );
                  if (!crmData) return k422ErrorMessage(kNoDataFound);
                  if (crmData == k500Error) return kInternalError;

                  previousAmount = crmData.amount?.toString() ?? '-';
                  const dueDate = new Date(crmData.due_date);
                  if (isNaN(dueDate.getTime()))
                    return kInvalidParamValue('due_date');
                  previousPTPDate = this.typeService.jsonToReadableDate(
                    dueDate.toJSON(),
                  );
                  const hours = dueDate.getHours();
                  const minutes = dueDate.getMinutes();
                  const tail = hours >= 12 ? 'PM' : 'AM';
                  previousPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
                    minutes <= 9 ? '0' + minutes : minutes
                  } ${tail}`;
                }
                smsOptions[key] = previousPTPDate;
              }
              // Previous time
              else if (title == '##PREVIOUS_TIME##')
                smsOptions[key] = previousPTPTime;
              // New date
              else if (title == '##NEW_DATE##') {
                if (!newPTPDate || !newPTPTime) {
                  const dueDate = new Date(crmData.due_date);
                  if (isNaN(dueDate.getTime()))
                    return kInvalidParamValue('due_date');
                  newPTPDate = this.typeService.jsonToReadableDate(
                    dueDate.toJSON(),
                  );
                  const hours = dueDate.getHours();
                  const minutes = dueDate.getMinutes();
                  const tail = hours >= 12 ? 'PM' : 'AM';
                  newPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
                    minutes <= 9 ? '0' + minutes : minutes
                  } ${tail}`;
                }
                smsOptions[key] = newPTPDate;
              } // New time
              else if (title == '##NEW_TIME##') {
                if (!newPTPDate || !newPTPTime) {
                  const dueDate = new Date(crmData.due_date);
                  if (isNaN(dueDate.getTime()))
                    return kInvalidParamValue('due_date');
                  newPTPDate = this.typeService.jsonToReadableDate(
                    dueDate.toJSON(),
                  );
                  const hours = dueDate.getHours();
                  const minutes = dueDate.getMinutes();
                  const tail = hours >= 12 ? 'PM' : 'AM';
                  newPTPTime = `${hours <= 9 ? '0' + hours : hours}:${
                    minutes <= 9 ? '0' + minutes : minutes
                  } ${tail}`;
                }
                smsOptions[key] = newPTPTime;
              }
            }
          } catch (error) {}
        }
        smsId = appType == 1 ? smsTemplateId : lspSmsTemplateId;
        isMsgSent = true;
      }
      const userData = [];
      userData.push({ userId, appType });
      const alertData = {
        userData,
        title: notificationTitle ?? '-',
        content: notificationBody ?? '-',
        adminId,
        data: null,
        smsOptions,
        isMsgSent,
        smsId,
      };

      if (isMsgSent || templateData.notification) {
        await this.sharedNotification.sendNotificationToUser(alertData);
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async defaulterOnlineCRM(crm) {
    try {
      if (crm) {
        const options = {
          where: {
            userId: crm.userId,
            lastOnline: this.typeService.getGlobalDate(new Date()).toJSON(),
            crmId: { [Op.eq]: null },
          },
        };

        const att = ['id'];
        const result = await this.defaulterOnlineRepo.getRoweData(att, options);
        if (result?.id) {
          const update = { crmId: crm.id };
          await this.defaulterOnlineRepo.updateRowData(update, result.id);
        }
      }
    } catch (error) {}
  }

  async updateAndClosePreviousCrms(adminId, currentCrmId, userId = null) {
    try {
      if (!userId) return kInternalError;
      const closingDate = new Date();
      const updateData = { status: '1', closingDate };
      const crmWhere: any = { userId: userId, id: { [Op.ne]: currentCrmId } };
      const lastCrm: any = await this.crmRepo.getRowWhereData(
        ['id', 'adminId'],
        {
          where: crmWhere,
          order: [['id', 'DESC']],
        },
      );
      if (lastCrm === k500Error) return kInternalError;
      if (!lastCrm) return {};
      if (lastCrm.id == currentCrmId) {
        const data: any = await this.crmRepo.updateRowData(
          { ...updateData, crmOrder: { [Op.or]: [null, -1] } },
          lastCrm.id,
        );
        if (data === k500Error) return kInternalError;
      } else {
        const data: any = await this.crmRepo.updateRowData(
          { ...updateData, crmOrder: 0 },
          lastCrm.id,
        );
        if (data === k500Error) return kInternalError;
      }
      const updatedData: any = await this.crmRepo.updateRowWhereData(
        { crmOrder: -1 },
        { where: { ...crmWhere, adminId } },
      );
      if (updatedData === k500Error) return kInternalError;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async assignAdminAtFirstCrm(userId, adminId) {
    try {
      const adminData = await this.adminRepo.getRoweData(['id', 'roleId'], {
        where: { id: adminId },
        include: [
          {
            model: Department,
            attributes: ['id', 'department'],
            where: { department: SUPPORT },
          },
        ],
      });
      if (!adminData || adminData == k500Error) return {};
      const isNotAssign = await this.userRepository.getRowWhereData(['id'], {
        where: { id: userId, assignTo: { [Op.eq]: null } },
      });
      if (isNotAssign && isNotAssign != k500Error)
        await this.userRepository.updateRowData({ assignTo: adminId }, userId);
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async departmentFromAdmin(adminId) {
    try {
      const departmentInclude = {
        model: Department,
        attributes: ['id', 'department', 'loanStatus'],
      };
      const adminData = await this.adminRepo.getRoweData(['id'], {
        where: { id: adminId },
        include: [departmentInclude],
      });
      if (adminData == k500Error || !adminData) return kInternalError;
      const deparmentData = adminData?.departmentData;
      return {
        departmentId: deparmentData.id,
        loanStatus: deparmentData.loanStatus,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getSourceData(query, filter = {}) {
    try {
      if (!query?.adminId) return kParamsMissing;
      const departmentData: any = await this.departmentFromAdmin(query.adminId);
      if (departmentData.message) return departmentData;
      const deparmentIds = [departmentData.departmentId];
      const key = `${deparmentIds}_SOURCE_DATA`;
      let data = await this.redisService.getKeyDetails(key);
      if (!data) {
        data = await this.crmStatusRepo.getTableWhereData(['id', 'status'], {
          where: { departmentIds: { [Op.contains]: deparmentIds }, ...filter },
        });
        if (data == k500Error) return kInternalError;
        await this.redisService.set(
          key,
          JSON.stringify(data),
          NUMBERS.SEVEN_DAYS_IN_SECONDS,
        );
      } else data = JSON.parse(data);
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getTitlesData(query) {
    try {
      if (!query?.dispositionId || !query.departmentId) return kParamsMissing;
      const loanStatus = query?.loanStatus;
      const disId = query.dispositionId;
      const departmentIds = [query.departmentId];
      let status = '0';
      if (loanStatus == 'Active') status = '1';
      const key = `${disId}_${departmentIds}_${status}_CRMTITLES`;
      let crmTitleData = await this.redisService.getKeyDetails(key);
      if (!crmTitleData) {
        crmTitleData = await this.crmTitleRepo.getTableWhereData(
          [
            'id',
            'title',
            'isAmount',
            'isDate',
            'isReference',
            'isReason',
            'isSettlement',
            'loanStatus',
            'crmDispositionId',
          ],
          {
            where: {
              crmDispositionId: disId,
              departmentIds: { [Op.contains]: departmentIds },
              loanStatus: { [Op.or]: ['2', status] },
            },
          },
        );
        await this.redisService.set(
          key,
          JSON.stringify(crmTitleData),
          NUMBERS.SEVEN_DAYS_IN_SECONDS,
        );
      } else crmTitleData = JSON.parse(crmTitleData);
      // for getting Date and Time
      for (let i = 0; i < crmTitleData.length; i++) {
        const element = crmTitleData[i];
        if (
          element['id'] === 70 &&
          element['loanStatus'] === 0 &&
          element['crmDispositionId'] === 1
        ) {
          crmTitleData[i]['isDate'] = true;
        }
      }

      if (crmTitleData == k500Error) return kInternalError;
      return crmTitleData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCrmReasons(query) {
    try {
      const departmentId = query?.departmentId;
      const userId = query?.userId;
      if (!departmentId) return kParamMissing('depearmentId');
      const data: any = await this.crmReasonsRepo.getTableWhereData(
        ['id', 'reason'],
        {
          where: { departmentId },
        },
      );
      if (data == k500Error) return kInternalError;
      //get previous crm reason validate
      const previousReason: any = await this.lastCrmReason(userId);
      //check previous crm reason data
      if (previousReason?.crmReasonData && previousReason != k500Error) {
        const previousCrmReason = previousReason?.crmReasonData;
        data.previousReason.reason = { isReason: previousCrmReason.reason };
        data.previousReason.isReason = previousCrmReason.isReason;
      }
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async lastCrmReason(userId) {
    try {
      return this.crmRepo.getRowWhereData(['id', 'reason'], {
        where: { userId },
        include: [{ model: CrmReasonEntity, attributes: ['id', 'reason'] }],
        order: [['id', 'DESC']],
      });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async fetchUnreadDueCrm(query) {
    if (!query.adminId) return kParamMissing('adminId is missing!');

    const todayDate = new Date();
    const userInlude = {
      model: registeredUsers,
      attributes: ['fullName', 'phone'],
    };
    const adminInclude = {
      model: admin,
      as: 'adminData',
      attributes: ['id', 'fullName'],
    };
    const closeByInclude = {
      model: admin,
      as: 'closedByData',
      attributes: ['id', 'fullName'],
    };
    const loanInclude = {
      model: loanTransaction,
      attributes: ['id', 'loanStatus'],
    };

    const attributes = [
      'id',
      'userId',
      'adminId',
      'createdAt',
      'due_date',
      'settlementData',
      'remark',
      'relationData',
    ];
    const options = {
      where: {
        adminId: query.adminId,
        read: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: false }] },
        status: { [Op.ne]: '1' },
        due_date: { [Op.lte]: todayDate.toJSON() },
      },
      order: [['createdAt', 'DESC']],
      include: [userInlude, adminInclude, loanInclude, closeByInclude],
    };
    const crmData = await this.crmRepo.getTableWhereData(attributes, options);
    if (crmData == k500Error) return k422ErrorMessage('CRM not found');
    let updatedCrmData: any = [];
    for (let i = 0; i < crmData.length; i++) {
      try {
        const element = crmData[i];
        crmData[i].registeredUsers.phone = this.cryptService.decryptPhone(
          element.registeredUsers.phone,
        );
        if (crmData[i]?.settlementData)
          crmData[i].settlementData = JSON.parse(element.settlementData);
        const relationData: any = element.relationData;
        delete element.relationData;

        updatedCrmData.push({
          ...element,
          ...relationData,
        });
      } catch (error) {}
    }
    return updatedCrmData;
  }

  async updateUnreadDueCrms(body) {
    try {
      const crmIds: any = body.crmIds;
      if (!crmIds || crmIds.length == 0)
        return kParamMissing('crmIds should not be empty!');
      for (let i = 0; i < crmIds.length; i++) {
        try {
          const element = crmIds[i];
          const getCrmReadTitle: any = await this.crmRepo.getRowWhereData(
            ['id', 'settlementData'],
            { where: { id: element, settlementData: { [Op.ne]: null } } },
          );
          let udpateData: any = {};
          if (getCrmReadTitle) {
            const settlementData = JSON.parse(getCrmReadTitle?.settlementData);
            const signlSettlement = settlementData.findIndex((ele) => {
              return ele?.read == '0';
            });
            if (signlSettlement != -1) {
              settlementData[signlSettlement].read = '1';
              if (signlSettlement + 1 < settlementData?.length) {
                const upcoming = settlementData[signlSettlement + 1];
                udpateData.due_date = upcoming.due_date;
              } else {
                udpateData.read = true;
              }
              udpateData.settlementData = JSON.stringify(settlementData);
              await this.crmRepo.updateRowData(udpateData, element);
            } else {
              await this.crmRepo.updateRowData({ read: true }, element);
            }
          } else this.crmRepo.updateRowData({ read: true }, element);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateCrmData() {
    try {
      const options: any = {};
      if (!isUAT) {
        options.where = { relationData: { [Op.eq]: null } };
        options.limit = 100;
      }
      const crmData = await this.crmRepo.getTableWhereData(
        ['id', 'titleId', 'crmReasonId', 'crmStatusId'],
        options,
      );
      if (crmData.length == 0) return [];
      for (let i = 0; i < crmData.length; i++) {
        try {
          const crm: any = crmData[i];
          const relationData: any = {};
          if (crm.crmStatusId) {
            const crmStatusData = await this.crmStatusRepo.getRowWhereData(
              ['id', 'status'],
              { where: { id: crm.crmStatusId } },
            );
            if (crmStatusData == k500Error || !crmStatusData) continue;
            relationData.statusId = crmStatusData.id;
            relationData.statusName = crmStatusData.status;
          }
          if (crm.crmReasonId) {
            const crmReasonData = await this.crmReasonsRepo.getRowWhereData(
              ['id', 'reason'],
              { where: { id: crm.crmReasonId } },
            );
            if (crmReasonData == k500Error || !crmReasonData) continue;
            relationData.reasonId = crmReasonData.id;
            relationData.reasonName = crmReasonData.reason;
          }
          if (crm.titleId) {
            const crmTitleData: any = await this.crmTitleRepo.getRowWhereData(
              ['id', 'title'],
              { where: { id: crm.titleId } },
            );
            if (crmTitleData == k500Error || !crmTitleData) continue;
            relationData.titleId = crmTitleData.id;
            relationData.titleName = crmTitleData.title;
          }
          await this.crmRepo.updateRowData({ relationData }, crm.id);
        } catch (error) {}
      }
      if (!isUAT) return this.migrateCrmData();
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migaretCrmTitleData() {
    try {
      const titleData = await this.crmTitleRepo.getTableWhereData(
        ['id', 'departmentIds', 'departmentId'],
        { where: { departmentIds: { [Op.eq]: null } } },
      );
      if (titleData == k500Error) return kInternalError;
      for (let i = 0; i < titleData.length; i++) {
        try {
          const title = titleData[i];
          const departmentIds: any = title?.departmentIds ?? [];
          const departmentId = title?.departmentId;
          const findDepartment = departmentIds.filter(
            (dep) => dep != departmentId,
          );
          findDepartment.push(departmentId);
          await this.crmTitleRepo.updateRowData(
            { departmentIds: findDepartment },
            title.id,
          );
        } catch (error) {}
      }
      return titleData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateDisposition(reqData) {
    try {
      // Params validation
      const targetList = reqData.targetList;
      if (!targetList) return kParamMissing('targetList');

      for (let index = 0; index < targetList.length; index++) {
        try {
          const targetData = targetList[index];
          const dispositionId = targetData.dispositionId;
          if (!dispositionId) continue;

          await this.dispositionRepo.updateRowData(targetData, dispositionId);
        } catch (error) {}
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCrmTitleByAdmin(query) {
    try {
      const adminId = +query?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const options = {
        where: { id: adminId },
        include: { model: Department, attributes: ['id', 'department'] },
      };
      const adminData: any = await this.adminRepo.getRoweData(
        ['id', 'fullName'],
        options,
      );
      if (adminData === k500Error) return kInternalError;
      if (!adminData) return kNoDataFound;
      const department = adminData?.departmentData?.department;
      const departmentId = adminData?.departmentData?.id;
      const loanData = await this.loanRepository.getRowWhereData(['id'], {
        where: { userId: userId, loanStatus: 'Active' },
      });
      if (loanData === k500Error) return kInternalError;
      query.loanId = loanData?.id;
      const type: any = await this.getCrmActivityType(
        department,
        query?.loanId,
      );
      if (type?.message) return type;
      const reasons: any = await this.getCrmReasons({ departmentId });
      if (reasons?.message) return reasons;
      if (reasons?.length > 0) adminData.reasonData = reasons;
      if (department != COLLECTION) {
        const activities: any = await this.getCrmTitlesByStatus(
          adminData?.departmentData?.id,
          adminData?.departmentData?.department,
        );
        if (activities?.message) return activities;
        adminData.activities = activities;
      }
      adminData.type = type;
      let status: any = [];
      if (department == SUPPORT) status = [{ id: '0', status: 'In Process' }];
      else if (department == COLLECTION) {
        status = await this.getCrmStatus(adminData?.departmentData?.id);
        if (status?.message) return status;
      } else
        status = [
          { id: '0', status: 'In Process' },
          { id: '3', status: 'pending' },
        ];
      adminData.status = status;
      return adminData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCrmStatus(departmentId) {
    try {
      const data = await this.crmStatusRepo.getTableWhereData(
        ['id', 'status'],
        {
          where: { departmentId },
        },
      );
      if (data === k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCrmTitlesByStatus(statusId, department = COLLECTION) {
    try {
      const options: any = {};
      if (COLLECTION == department) options.where = { crmStatusId: statusId };
      else options.where = { departmentId: statusId };
      const data = await this.crmTitleRepo.getTableWhereData(
        [
          'id',
          'title',
          'isAmount',
          'isDate',
          'isReference',
          'isReason',
          'isSettlement',
        ],
        options,
      );
      if (data === k500Error) return kInternalError;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getCrmActivityType(department, loanId = null) {
    try {
      let type = '0';
      if (loanId) {
        const loanOptions: any = { where: { id: loanId } };
        const today = this.typeService.getGlobalDate(new Date());
        const loanInclude = {
          model: EmiEntity,
          attributes: ['emi_date', 'payment_status', 'payment_due_status'],
        };
        loanOptions.include = loanInclude;
        const loanEmiData: any = await this.loanRepository.getRowWhereData(
          [],
          loanOptions,
        );
        if (loanEmiData === k500Error) return kInternalError;
        for (let i = 0; i < loanEmiData?.emiData.length; i++) {
          try {
            const ele = loanEmiData.emiData[i];
            const emiDate = new Date(ele?.emi_date);
            if (
              emiDate.getTime() < today.getTime() &&
              ele?.payment_status == '0' &&
              ele?.payment_due_status == '1'
            ) {
              if (department == COLLECTION) type = '1';
              else type = '0';
              break;
            } else if (
              emiDate.getTime() == today.getTime() &&
              ele?.payment_status == '0'
            )
              type = '2';
            else if (
              emiDate.getTime() == today.getTime() &&
              ele?.payment_status == '1'
            )
              if (department == COLLECTION) type = '0';
              else type = '1';
            else type = '0';
          } catch (error) {}
        }
      }
      return { id: type, title: crmTypeTitle[type] };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateTemplateList(body) {
    try {
      const id = body?.id;
      if (!id) return kParamMissing('id');
      const opt = { where: { id } };
      let crmData: any = await this.dispositionRepo.getRowWhereData(
        ['id', 'templateList'],
        opt,
      );
      if (!crmData.templateList)
        return { message: 'Template list data is not found' };
      for (let i = 0; i < crmData.templateList.length; i++) {
        try {
          const ele = crmData.templateList[i];
          ele.headerImageHTML = ele.headerImageHTML.replace(
            'https://storage.googleapis.com/lenditt_user_images/mediaImages%2F1687590469924.png',
            EnvConfig.gCloudAssets.crmHeaderV1,
          );
          ele.headerImageHTML = ele.headerImageHTML.replace(
            'https://storage.googleapis.com/lenditt_user_images/mediaImages%2F1687758639516.jpeg',
            EnvConfig.gCloudAssets.crmHeaderV2,
          );

          ele.emailTemplatePath = ele.emailTemplatePath.replace(
            './upload/templates/crm/payment_reminder.html',
            `./upload/templateDesign${templateDesign}/templates/crm/payment_reminder.html`,
          );
          ele.emailContent = ele?.emailContent.replace(
            'Lenditt Loan Application',
            EnvConfig.nbfc.nbfcName,
          );
          ele.emailContent = ele?.emailContent.replace(
            'Lenditt',
            EnvConfig.nbfc.nbfcCodeNameS,
          );
          ele.notificationBody = ele?.notificationBody.replace(
            'Lenditt Loan Application',
            EnvConfig.nbfc.nbfcName,
          );
          ele.notificationBody = ele?.notificationBody.replace(
            'Lenditt',
            EnvConfig.nbfc.nbfcCodeNameS,
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '649328c5d6fc057e2b28d7a2',
            '65f1be9dd6fc05414f6f1192',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6493294dd6fc053e3e54bed2',
            '65f1be74d6fc05619e2a5db2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64932b97d6fc0544eb626392',
            '65f1be2fd6fc0518b17fecc2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64932d77d6fc052f6a78cd42',
            '65f1bd4cd6fc055aa47d1183',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '649326bbd6fc057c76119172',
            '65f1cae4d6fc0540cd588f62',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6493275dd6fc054649180c03',
            '65f1ca38d6fc054442633862',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '649327bad6fc053cb6496096',
            '65f1ca16d6fc053da017ca02',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '649188efd6fc050527050382',
            '65f1b618d6fc054736704bf2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6491884ad6fc0556a663bc93',
            '65f024b7d6fc0529d515d7d3',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6491b0f1d6fc051c546a57d3',
            '65f1cc10d6fc054c852063d2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6491b157d6fc052ce276e552',
            '65f1bc0cd6fc05753a3f9e52',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64928433d6fc053b765598a3',
            '65f1b53cd6fc0542193166d3',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '6491b0f1d6fc051c546a57d3',
            '65f1cc10d6fc054c852063d2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64928433d6fc053b765598a3',
            '65f1b53cd6fc0542193166d3',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64928881d6fc0522e75b2b43',
            '65f1bd2bd6fc053e2575aa02',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '649325e4d6fc056ab21d2e34',
            '65f02551d6fc0540fc7d97d2',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64932caed6fc056aee6a1162',
            '65f1cb08d6fc05388a655643',
          );
          ele.smsTemplateId = ele?.smsTemplateId.replace(
            '64932c5dd6fc0564c3238983',
            '65f1cb58d6fc05592f105091',
          );
        } catch (error) {}
      }
      const updateData = {
        templateList: crmData.templateList,
      };
      await this.dispositionRepo.updateRowData(updateData, id);
      return crmData;
    } catch (error) {}
  }
}
