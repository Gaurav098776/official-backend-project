// Imports
import { Op } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { ThirdPartyServiceRepo } from 'src/repositories/thirdParty.service.repo';
import { ThirdPartyProviderRepo } from 'src/repositories/thirdpartyService.provider.repo';
import { GlobalServices, PAGE_LIMIT, gIsPROD } from 'src/constants/globals';
import { RedisService } from 'src/redis/redis.service';
import {
  kAadhaarService,
  kCallService,
  kEMandateService,
  kESignService,
  kEmailService,
  kPanService,
  kPaymentMode,
  kUPIMode,
} from 'src/constants/strings';

@Injectable()
export class ServiceService {
  constructor(
    private readonly providerRepo: ThirdPartyProviderRepo,
    private readonly repository: ThirdPartyServiceRepo,
    private readonly redisService: RedisService,
  ) {
    this.syncServices();
  }

  async addServiceProviders(reqData: any) {
    try {
      const providerList = reqData.providerList;
      if (!providerList) return kParamMissing('providerList');
      const total = providerList.length;
      if (total == 0) return k422ErrorMessage('No providers to be added');

      let failed = 0;
      for (let index = 0; index < total; index++) {
        try {
          const creationData = providerList[index];
          const createdData = await this.providerRepo.createRowData(
            creationData,
          );
          if (createdData == k500Error) failed++;
        } catch (error) {}
      }

      if (failed > 0)
        return k422ErrorMessage('Service provider already exists');
      return { successMsg: 'Service provider added successfully' };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async addService(reqData: any) {
    try {
      const name = reqData.name;
      if (!name) return kParamMissing('name');

      const creationData = { name };
      const createdData = await this.repository.createRowData(creationData);
      if (createdData == k500Error)
        return k422ErrorMessage(`Service ${name} already exists`);

      return { successMsg: `${name} added successfully` };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getServiceList(reqData: any) {
    try {
      const id = reqData.id;
      const attributes = [
        'activeProviderIds',
        'id',
        'multiple',
        'name',
        'status',
        'totalProviderIds',
      ];
      const searchText = reqData.searchText ?? '';
      const limit = PAGE_LIMIT;
      const page = reqData.page;
      const offset = !page ? null : page * limit - limit;

      const options: any = { limit, offset, order: [['name', 'ASC']] };
      if (id) options.where = { id };
      if (searchText.length >= 2)
        options.where = { name: { [Op.iRegexp]: searchText } };

      const serviceListData = await this.repository.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (serviceListData == k500Error) return kInternalError;

      const finalizedList = [];
      for (let index = 0; index < serviceListData.rows.length; index++) {
        try {
          const serviceData = serviceListData.rows[index];
          const activeProviderIds = serviceData.activeProviderIds ?? [];
          const totalProviderIds = serviceData.totalProviderIds ?? [];
          // for particular id data
          const providerList = await this.getProviderList(
            id ? totalProviderIds : activeProviderIds,
          );
          if (providerList == k500Error) continue;

          const activeProviders = providerList.filter((el) =>
            activeProviderIds.includes(el.id),
          );
          const totalProviders = providerList.filter((el) =>
            totalProviderIds.includes(el.id),
          );

          const data: any = { activeProviders, status: serviceData.status };
          data.id = serviceData.id;
          data.name = serviceData.name;
          if (id) data.totalProviders = totalProviders;
          data.multiple = serviceData.multiple;
          finalizedList.push(data);

          // for particular id data
          if (id) return data;
        } catch (error) {}
      }

      return { count: serviceListData.count, rows: finalizedList };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getMultipleActiveService(query) {
    try {
      const serviceType = query.serviceType;
      const attributes = [
        'activeProviderIds',
        'id',
        'multiple',
        'name',
        'status',
        'totalProviderIds',
      ];
      const serviceData = await this.repository.getRowWhereData(attributes, {
        where: { name: serviceType },
      });
      if (!serviceData || serviceData == k500Error)
        return k422ErrorMessage('Service not found');
      const totalProviderIds = serviceData.totalProviderIds;
      const activeProviderIds = serviceData.activeProviderIds;
      const providerList: any = await this.getProviderList(totalProviderIds);
      if (providerList.message) return k422ErrorMessage('Providers not found');
      const activeProviders = providerList.filter((el) =>
        activeProviderIds.includes(el.id),
      );
      const totalProviders = providerList.filter((el) =>
        totalProviderIds.includes(el.id),
      );
      return {
        id: serviceData.id,
        status: serviceData.status,
        activeProvides: activeProviders,
        totalProvider: totalProviders,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  private async getProviderList(ids: number[]) {
    try {
      const attributes = ['id', 'name'];
      const options = {
        order: [['name', 'ASC']],
        where: { id: ids, status: true },
      };

      const providerList = await this.providerRepo.getTableWhereData(
        attributes,
        options,
      );
      if (providerList == k500Error) return kInternalError;
      return providerList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async updateService(reqData: any) {
    try {
      let activeProviderIds = reqData.activeProviderIds;
      if (!activeProviderIds) return kParamMissing('activeProviderIds');
      activeProviderIds = [...new Set(activeProviderIds)];
      const id = reqData.id;
      if (!id) return kParamMissing('id');
      let status = reqData.status;
      if (status == null) return kParamMissing('status');
      if (activeProviderIds.length == 0 && status)
        return k422ErrorMessage('At least one service should be active');

      const serviceData = await this.getServiceList({ id });
      if (serviceData.message) return serviceData;
      if (serviceData.rows?.length == 0)
        return k422ErrorMessage('No data found');

      const targetData = serviceData;
      const totalProviders = targetData.totalProviders;
      const activeProviders = targetData.activeProviders;
      let activeIds = activeProviders.map((el) => el.id);
      if (status == false) {
        activeProviderIds = activeIds.filter(
          (el) => !activeProviderIds.includes(el),
        );
        if (activeProviderIds.length > 0) status = true;
      }
      const outsiderId = activeProviderIds.find(
        (el) => !totalProviders.find((subEl) => subEl.id == el),
      );
      if (outsiderId)
        return k422ErrorMessage(
          `id ${outsiderId} is not eligible to add in ${serviceData.name} service`,
        );

      if (activeProviderIds.length > 1 && !targetData.multiple)
        return k422ErrorMessage(
          `Only one service can be enable for ${serviceData.name} service`,
        );

      const updatableData = { activeProviderIds, status };
      const updateResult = await this.repository.update(updatableData, id);
      if (updateResult == k500Error)
        return k422ErrorMessage(
          `Error while updating the ${serviceData.name} service`,
        );

      await this.syncServices();
      return {
        successMsg: `${serviceData.name} service is updated`,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async syncServices() {
    try {
      // Wait until database module initialized
      await this.delay(2500);

      const services = await this.getServiceList({});
      if (services.message) return services;

      const targetList = services.rows ?? [];
      for (let index = 0; index < targetList.length; index++) {
        try {
          let pushArray = [];
          const targetData = targetList[index];
          if (!targetData.status) continue;

          const name = targetData.name;
          const activeProviders = targetData.activeProviders ?? [];
          const serviceLength = activeProviders.length;
          let serviceName = activeProviders[0].name;
          // Aadhaar service
          if (name == kAadhaarService && serviceLength == 1) {
            GlobalServices.AADHAAR_SERVICE = serviceName;
            await this.redisService.set(kAadhaarService, serviceName, -1);
          }

          // Pan service
          if (name == kPanService && serviceLength == 1) {
            GlobalServices.PAN_SERVICE = serviceName;
            await this.redisService.set(kPanService, serviceName, -1);
          }

          // Emandate service
          if (name == kEMandateService && serviceLength == 1) {
            GlobalServices.EMANDATE_SERVICE = serviceName;
            await this.redisService.set(kEMandateService, serviceName, -1);
          }

          // ESign service
          if (name == kESignService && serviceLength == 1) {
            GlobalServices.ESIGN_SERVICE = serviceName;
            await this.redisService.set(kESignService, serviceName, -1);
          }

          // Payment service
          if (name == kPaymentMode) {
            serviceName = activeProviders?.map((ele) => ele.name);
            if (serviceName.includes('RAZORPAY')) {
              pushArray.push('RAZORPAY');
            }
            if (serviceName.includes('CASHFREE')) {
              pushArray.push('CASHFREE');
            }
            if (serviceName.includes('UPI_SERVICE')) {
              pushArray.push('UPI_SERVICE');
            }
            if (serviceName.includes('RAZORPAY_SDK')) {
              pushArray.push('RAZORPAY_SDK');
            }
            await this.redisService.set(
              kPaymentMode,
              JSON.stringify(pushArray),
              -1,
            );
          }
          // Email service
          if (name == kEmailService && serviceLength == 1) {
            GlobalServices.EMAIL_SERVICE = serviceName;
            await this.redisService.set(kEmailService, serviceName, -1);
          }
          if (name == kCallService && serviceLength == 1) {
            GlobalServices.CALL_SERVICE = serviceName;
            await this.redisService.set(kEmailService, serviceName, -1);
          }
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private delay = (ms) => new Promise((res) => setTimeout(res, ms));
}
