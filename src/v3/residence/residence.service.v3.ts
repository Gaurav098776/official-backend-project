import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  HOST_URL,
  Latest_Version,
  SENSEDATA_SERVICE,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import {
  k500Error,
  Kadhar,
  KDrivingLicense,
  kElectricityBill,
  kPGAgreement,
  kRentAgreement,
} from 'src/constants/misc';
import {
  FLIPKART1_ORDER_DATA_URL,
  FLIPKART2_ORDER_DATA_URL,
  FLIPKART_SINGLE_ORDER_URL,
  SWIGGY_ORDER_DATA_URL,
  ZOMATO_ORDER_DATA_URL,
} from 'src/constants/network';
import {
  getFlipkartData,
  getSwiggyData,
  kZomatoData,
} from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound, vResidence } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';

@Injectable()
export class ResidenceServiceV3 {
  constructor(
    private readonly addressRepo: AddressesRepository,
    private readonly api: APIService,
    private readonly masterRepo: MasterRepository,
    @Inject(forwardRef(() => ResidenceSharedService))
    private readonly sharedResidence: ResidenceSharedService,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly validationService: ValidationService,
  ) {}

  async submitTypeAddress(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const blockNo = reqData.blockNo;
      if (!blockNo) return kParamMissing('blockNo');
      const societyNo = reqData.societyNo;
      if (!societyNo) return kParamMissing('societyNo');
      const landmark = reqData.landmark;
      if (!landmark) return kParamMissing('landmark');
      let pinAddress = reqData.pinAddress;
      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const include = [masterInclude];
      const attributes = ['masterId'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData == k500Error) return kInternalError;

      const statusData = userData.masterData.status ?? {};
      // if (statusData.residence == 1 || statusData.residence == 3)
      //   return k422ErrorMessage('Residence already verified');

      const typeAddress = JSON.stringify({
        'Flat / Block number': blockNo,
        'Society name': societyNo,
        Landmark: landmark,
      });
      statusData.residence = 6;
      let updatedData: any = { typeAddress };

      try {
        if (!pinAddress) {
          pinAddress = JSON.parse(pinAddress);
          const lat = pinAddress?.lat;
          const long = pinAddress?.long;
          updatedData.pinAddresslatLong = [lat, long];
          updatedData.pinAddress = pinAddress?.fullAddress;
          updatedData.city = pinAddress?.city;
          updatedData.state = pinAddress?.state;
        }
      } catch (error) {}
      // Update user data

      let updateResult = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      updatedData = { status: statusData };
      updateResult = await this.masterRepo.updateRowData(
        updatedData,
        userData.masterId,
      );
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  async getResidenceAutomationData(reqData) {
    try {
      // Params validation
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const include = [masterInclude];
      const attributes = ['masterId'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const statusData = userData.masterData?.status ?? {};
      if (statusData.residence == 1 || statusData.residence == 3)
        return k422ErrorMessage('Residence already verified');
      if (statusData.residence != 6)
        return k422ErrorMessage('Residence can not be submitted');

      if (type == 'Flipkart')
        return { mode: getFlipkartData(userId), needUserInfo: true };
      else if (type == 'Zomato')
        return { mode: kZomatoData, needUserInfo: true };
      else if (type == 'Swiggy')
        return { mode: getSwiggyData(userId), needUserInfo: true };
      else if (type == 'Manual verification') {
        // Update user data
        let updatedData: any = { homeStatus: '4' };
        let updateResult = await this.userRepo.updateRowData(
          updatedData,
          userId,
        );
        if (updateResult == k500Error) return kInternalError;
        // Update master data
        statusData.residence = 4;
        updatedData = { status: statusData };
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          userData.masterId,
        );
        if (updateResult == k500Error) return kInternalError;
      }

      return { manualRoute: true, needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  async validateAutomation(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const response = reqData.internalResponse;
      if (!response) return kParamMissing('internalResponse');
      const type = reqData.type;
      if (!type) return kParamMissing('type');

      if (type == 'FLIPKART')
        return await this.handleFlipkartFlow(response, userId);
      if (type == 'SWIGGY')
        return await this.handleSwiggyFlow(response, userId);

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async handleFlipkartFlow(response: any, userId) {
    try {
      const headers: any = {
        cookie: `SN=${response.SN}`,
        'User-Agent': 'Mozilla/5.0',
        'X-User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
      };
      let page = 1;
      let result: any;
      let allUrl;
      let DC;
      let orderIds = [];

      for (let i = 1; i <= page; i++) {
        try {
          allUrl = `${FLIPKART1_ORDER_DATA_URL}?page=${page}`;
          result = await this.api.requestGet(allUrl, headers);
          if (result == k500Error) continue;
          if (result.ERROR_CODE == 2000) {
            allUrl = `${FLIPKART2_ORDER_DATA_URL}?page=${page}`;
            result = await this.api.requestGet(allUrl, headers);
            if (result == k500Error) continue;
          }
          DC = allUrl.charAt(8);
          const orders = result?.RESPONSE?.multipleOrderDetailsView?.orders;
          if (orders.length == 7) page++;
          orders.map((element) => {
            orderIds.push(element.orderMetaData?.orderId);
          });
        } catch (error) {}
      }
      orderIds = [...new Set(orderIds)];
      for (let index = 0; index < orderIds.length; index++) {
        try {
          let url;
          let response: any;
          const element = orderIds[index];
          if (DC == 1 || DC == 2) {
            url = `https://${[
              DC,
            ]}${FLIPKART_SINGLE_ORDER_URL}?order_id=${element}`;
            response = await this.api.requestGet(url, headers);
            if (response == k500Error) continue;
          } else {
            url = `https://${FLIPKART_SINGLE_ORDER_URL}?order_id=${element}`;
            response = await this.api.requestGet(url, headers);
            if (response == k500Error) continue;
          }
          const item =
            response?.RESPONSE?.orderView?.unitProperties?.FLIPKART
              ?.itemTypeList[0];
          const shipping = response?.RESPONSE?.orderView?.addresses?.SHIPPING;
          const second =
            response?.RESPONSE?.orderView?.units?.[item].deliveryDataBag
              ?.promiseDataBag?.actualDeliveredDate;

          if ((shipping?.addressLine1 || shipping?.addressLine2) && second) {
            const date = new Date(second);
            // Prevent too older addresses
            const diffInDays = this.typeService.dateDifference(
              new Date(),
              date,
            );
            if (diffInDays >= 180) continue;

            const address =
              shipping?.addressLine1 + ', ' + shipping?.addressLine2;
            const attributes = ['id'];
            const options = { where: { userId, address } };
            // Prevent duplication
            const existingData = await this.addressRepo.getRowWhereData(
              attributes,
              options,
            );
            if (existingData && existingData != k500Error) {
              const updateData = { status: '0' };
              await this.addressRepo.updateRowData(updateData, existingData.id);
            } else {
              const creationData = {
                response: JSON.stringify(shipping),
                userId,
                address,
                type: '9',
                status: '0',
              };
              await this.addressRepo.createRowData(creationData);
            }
          }
        } catch (error) {}
      }

      const state = { isProcessing: false };
      await this.sharedResidence.validateAddress({
        userId,
        type: 'ECOMMADDRESS',
      });

      return { needUserInfo: true, state };
    } catch (error) {
      return kInternalError;
    }
  }

  private async handleSwiggyFlow(response: any, userId) {
    try {
      // #01 Get cookies
      const sid = response._sid;
      const tid = response._session_tid;
      if (sid && tid) {
        const headers: any = {
          cookie: `_sid=${sid}; _session_tid=${tid}`,
          'User-Agent': 'Mozilla/5.0',
        };
        const callbackList = [
          {
            url: SWIGGY_ORDER_DATA_URL,
            method: 'GET',
            headers,
            callbackData: {
              url: HOST_URL + `${Latest_Version}/residence/validateAutomation`,
              method: 'POST',
              body: {
                userId,
                type: 'SWIGGY',
              },
            },
          },
        ];
        const state = { isProcessing: true };
        return { callbackList, state };
      } // #02 Get addresses
      else if (response.data?.orders) {
        const orders = response.data?.orders;
        for (let index = 0; index < orders.length; index++) {
          try {
            const orderData = orders[index];
            if (orderData.order_status != 'Delivered') continue;

            const addressData = orderData.delivery_address;
            const address = (
              (addressData.flat_no ?? '') +
              ' ' +
              (addressData.address_line1 ?? '') +
              ' ' +
              (addressData.address_line2 ?? '') +
              ' ' +
              (addressData.landmark ?? '')
            )
              .trim()
              .replace('  ', ' ');
            const lat = orderData.cust_lat_lng?.lat ?? '';
            const long = orderData.cust_lat_lng?.lng ?? '';
            const response = JSON.stringify(orderData);

            // Prevent duplication
            const attributes = ['id'];
            const options = { where: { address, userId } };
            const existingData = await this.addressRepo.getRowWhereData(
              attributes,
              options,
            );
            if (existingData && existingData != k500Error) {
              const updateData = { status: '0' };
              await this.addressRepo.updateRowData(updateData, existingData.id);
            } else {
              // Insert data
              const creationData = {
                address,
                userId,
                response,
                lat,
                long,
                type: '8',
                status: '0',
              };
              const createdData = await this.addressRepo.createRowData(
                creationData,
              );
              if (createdData == k500Error) continue;
            }
          } catch (error) {}
        }
        const state = { isProcessing: false };
        await this.sharedResidence.validateAddress({
          userId,
          type: 'ECOMMADDRESS',
        });

        return { needUserInfo: true, state };
      } else return k422ErrorMessage('Invalid request');
    } catch (error) {
      return kInternalError;
    }
  }

  async submitProof(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const fileURL = reqData.fileURL;
      if (!fileURL) return kParamMissing('fileURL');
      const type = reqData.type;
      if (!type) return kParamMissing('type');

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['dates', 'status'];
      const include = [masterInclude];
      const attributes = ['masterId', 'isRedProfile'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const statusData = userData.masterData?.status ?? {};
      const dates = userData.masterData?.dates ?? {};
      if (
        statusData.residence == 1 ||
        statusData.residence == 3 ||
        statusData.residence == 7
      )
        return k422ErrorMessage('Residence already verified');
      if (statusData.residence != 4 && statusData.residence != 2)
        return k422ErrorMessage('Residence proof can not accepted');
      const isRedProfile = (userData?.isRedProfile ?? 0) === 2;
      let status = '0';
      // if old defulter then approved
      if (isRedProfile) {
        status = '1';
        dates.residence = new Date().getTime();
      }
      // Update user data
      let updatedData: any = {
        homeProofImage: fileURL,
        homeStatus: status,
        homeProofType: this.getTypeID(type),
      };
      let updateResult = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResult == k500Error) return kInternalError;

      // Update master data
      statusData.residence = +status;
      updatedData = { dates, status: statusData };
      updateResult = await this.masterRepo.updateRowData(
        updatedData,
        userData.masterId,
      );
      if (updateResult == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  private getTypeID(type: string) {
    try {
      if (type === kPGAgreement) return '0';
      else if (type === kElectricityBill || type == 'Electricity bill')
        return '1';
      else if (type === kRentAgreement || type == 'Rent agreement') return '2';
      else if (type == 'PG agreement') return '2';
      else if (type === Kadhar || type == 'Aadhaar card') return '3';
      else if (type === KDrivingLicense) return '4';
    } catch (error) {}
    /// other
    return '5';
  }

  async validateResidenceAutomation(userId: string) {
    try {
      if (SENSEDATA_SERVICE) await this.delay(4000);

      const attributes = ['address', 'id'];
      const options = { where: { status: { [Op.or]: ['4', '5'] }, userId } };

      const addresses = await this.addressRepo.getTableWhereData(
        attributes,
        options,
      );
      if (addresses == k500Error) return kInternalError;

      const userAttr = ['typeAddress'];
      const userOptions = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(
        userAttr,
        userOptions,
      );
      if (!userData) return k422ErrorMessage('No user data found');
      else if (userData == k500Error) return kInternalError;

      for (let index = 0; index < addresses.length; index++) {
        try {
          const addressData = addresses[index];
          addressData.status = '4';
          const addressA = addressData.address;
          const typeAddress = this.typeService.getUserTypeAddress(
            userData.typeAddress,
          );

          const probability = this.validationService.getTextProbability(
            addressA,
            typeAddress,
            [
              'cross',
              'road',
              'india',
              'opp',
              'opposite',
              'near',
              'nr.',
              'nr',
              'bh',
              'bh.',
              'b/h',
            ],
          );
          if (probability >= 40) addressData.status = '1';
          await this.addressRepo.updateRowData(addressData, addressData.id);
        } catch (error) {}
      }

      const updatedData: any = {};
      const isApproved = addresses.find((el) => el.status == '1');
      updatedData.homeStatus = isApproved ? '1' : '5';
      if (isApproved) updatedData.residenceProofApproveByName = 'SYSTEM';
      const updateResponse = await this.userRepo.updateRowData(
        updatedData,
        userId,
      );
      if (updateResponse == k500Error) return kInternalError;

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  delay = (ms) => new Promise((res) => setTimeout(res, ms));
}
