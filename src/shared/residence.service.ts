import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import { kNotEligibleForNBFC } from 'src/constants/strings';
import { KYCEntity } from 'src/entities/kyc.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { Op } from 'sequelize';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MasterEntity } from 'src/entities/master.entity';
import {
  ADDRESS_AUTO_VARIFY_PROBABILITY as ADDRESS_AUTO_VERIFY_PROBABILITY,
  GLOBAL_FLOW,
  HOST_URL,
  Latest_Version,
  RESIDENCE_CRITERIA,
  SYSTEM_ADMIN_ID,
} from 'src/constants/globals';
import { ResidenceServiceV4 } from 'src/v4/residence/residence.service.v4';
import { KYCRepository } from 'src/repositories/kyc.repository';
import {
  FLIPKART1_ORDER_DATA_URL,
  FLIPKART2_ORDER_DATA_URL,
  FLIPKART_SINGLE_ORDER_URL,
  SWIGGY_ORDER_DATA_URL,
  ZOMATO_ORDER_DATA_URL,
} from 'src/constants/network';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class ResidenceSharedService {
  constructor(
    private readonly addressRepo: AddressesRepository,
    private readonly automation: AutomationService,
    private readonly bankRepo: BankingRepository,
    private readonly locationRepo: LocationRepository,
    private readonly masterRepo: MasterRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly validation: ValidationService,
    private readonly residenceService: ResidenceServiceV4,
    private readonly kycRepo: KYCRepository,
    private readonly api: APIService,
  ) {}

  //#region Residence Automation
  async validateAddress(reqData) {
    try {
      let isResidence = await this.getResidenceStatus(reqData);
      if (isResidence === k500Error) return kInternalError;
      if (isResidence === 'true') return { needToVerifyAddress: false };
      // Prepare & validate request
      const preparedData: any = await this.validateReqDataForValidateAddress(
        reqData,
      );
      if (preparedData.message) return preparedData;

      // Aadhaar address
      const aadhaarAddress = this.typeService.getUserAadharAddress(
        preparedData.rawAadhaarAddress,
      );
      // Bank address
      const bankAddress = preparedData?.accountDetails?.address;
      // Type address
      let typeAddress = '';
      // if (preparedData.typeAddress)
      //   typeAddress = this.typeService.getUserTypeAddress(
      //     preparedData.typeAddress,
      //   );
      let updatedData: any = { homeStatus: '5' };
      const userId = reqData.userId;

      const appType = preparedData?.appType;
      // #1 Probability check for aadhaar and bank address
      let probability = 0;
      if (bankAddress) {
        probability = await this.validation.addressMatch(
          aadhaarAddress,
          bankAddress,
          appType,
        );
        await this.addressRepo.findAndUpdateOrCreate({
          userId,
          address: bankAddress,
          status: probability > ADDRESS_AUTO_VERIFY_PROBABILITY ? '1' : '4',
          type: '11',
          probability: {
            address: aadhaarAddress,
            probability: probability,
            type: 0,
          },
          subType: 'BANK',
        });
        if (probability > ADDRESS_AUTO_VERIFY_PROBABILITY)
          updatedData.homeStatus = '1';
      }

      // #2 Probability check for aadhaar and type address
      if (typeAddress && updatedData.homeStatus == '5') {
        probability = await this.validation.addressMatch(
          aadhaarAddress,
          typeAddress,
          appType,
        );
        await this.addressRepo.findAndUpdateOrCreate({
          userId,
          address: aadhaarAddress,
          status: probability > ADDRESS_AUTO_VERIFY_PROBABILITY ? '1' : '4',
          type: '0',
          probability: {
            address: typeAddress,
            probability: probability,
            type: 12,
          },
          subType: 'AADHAAR',
        });
        if (probability > ADDRESS_AUTO_VERIFY_PROBABILITY)
          updatedData.homeStatus = '1';
      }

      // #3 Probability check for bank address and type address
      if (typeAddress && updatedData.homeStatus == '5' && bankAddress) {
        probability = await this.validation.addressMatch(
          typeAddress,
          bankAddress,
          appType,
        );
        await this.addressRepo.findAndUpdateOrCreate({
          userId,
          address: typeAddress,
          status: probability > ADDRESS_AUTO_VERIFY_PROBABILITY ? '1' : '4',
          type: '12',
          probability: {
            address: bankAddress,
            probability: probability,
            type: 11,
          },
        });
        if (probability > ADDRESS_AUTO_VERIFY_PROBABILITY)
          updatedData.homeStatus = '1';
      }

      // #4 lat long check for live location of last 2 weeks and type address
      if (typeAddress && updatedData.homeStatus == '5') {
        // Get location data
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 14);
        const locationAttr = ['location', 'lat', 'long'];
        const locationOptions = {
          limit: 10,
          where: { createdAt: { [Op.gte]: minDate }, userId },
        };
        const locationList = await this.locationRepo.getTableWhereData(
          locationAttr,
          locationOptions,
        );
        if (locationList == k500Error) return kInternalError;

        // Validation check
        const latLongData = await this.automation.addressesToCoordinates(
          typeAddress,
        );
        if (!latLongData.message && latLongData.lat && latLongData.long) {
          const typeLat = +latLongData.lat;
          const typeLong = +latLongData.long;
          for (let index = 0; index < locationList.length; index++) {
            try {
              const locationData = locationList[index];
              const distance: any = this.typeService.getDistance(
                typeLat,
                typeLong,
                locationData.lat,
                locationData.long,
                'K',
              );
              if (distance === k500Error) continue;
              if (distance <= 1) {
                updatedData.homeStatus = '1';
                break;
              }
            } catch (error) {}
          }
        }
      }

      // #5 Probability check for eCommerce and type address
      if (typeAddress && updatedData.homeStatus == '5') {
        const addressAttr = ['id', 'address'];
        const addressOptions = {
          where: {
            userId,
            type: { [Op.notIn]: ['0', '1', '6', '12', '11'] },
            [Op.or]: [{ status: '0' }, { status: { [Op.eq]: null } }],
          },
        };
        const addressList = await this.addressRepo.getTableWhereData(
          addressAttr,
          addressOptions,
        );
        if (addressList == k500Error) return kInternalError;

        for (let index = 0; index < addressList.length; index++) {
          try {
            const eCommerceAdd = addressList[index].address;
            const id = addressList[index].id;
            probability = await this.validation.addressMatch(
              typeAddress,
              eCommerceAdd,
              appType,
            );
            if (probability > ADDRESS_AUTO_VERIFY_PROBABILITY) {
              updatedData.homeStatus = '1';
              await this.addressRepo.updateRowData({ status: '1' }, id);
            } else await this.addressRepo.updateRowData({ status: '4' }, id);
          } catch (error) {}
        }
        if (
          (addressList.length > 0 || reqData?.type == 'ECOMMADDRESS') &&
          updatedData.homeStatus != '1'
        )
          updatedData.homeStatus = '4';
        else if (updatedData.homeStatus != '1') updatedData.homeStatus = '6';
      }

      // Update user data
      let updateResponse = await this.userRepo.updateRowData(
        updatedData,
        userId,
      );
      if (updateResponse == k500Error) return kInternalError;

      // Update master data
      const statusData = preparedData.masterData?.status ?? {};
      const dates = preparedData.masterData?.dates ?? {};
      const masterId = preparedData.masterData?.id;
      statusData.residence = +updatedData.homeStatus;
      updatedData = { dates, status: statusData };
      if (statusData.residence == 1 || statusData.residence == 3)
        updatedData.dates.residence = new Date();
      if (!GLOBAL_FLOW.RESIDENCE_IN_APP) updatedData.status.residence = 8;
      updateResponse = await this.masterRepo.updateRowData(
        updatedData,
        masterId,
      );
      if (updateResponse == k500Error) return kInternalError;

      return { needUserInfo: true };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getResidenceStatus(reqData) {
    try {
      let getLastAddressVerifiedDate = await this.getMasterInfo(
        reqData?.userId,
      );
      if (getLastAddressVerifiedDate === k500Error) return k500Error;
      if (
        getLastAddressVerifiedDate != undefined &&
        (getLastAddressVerifiedDate?.status?.residence === 1 ||
          getLastAddressVerifiedDate?.status?.residence === 3 ||
          getLastAddressVerifiedDate?.status?.residence === 7)
      ) {
        let getMaster = await this.masterRepo.getRowWhereData(
          ['id', 'status', 'dates'],
          {
            where: {
              userId: reqData.userId,
            },
            order: [['id', 'DESC']],
          },
        );
        if (getMaster === k500Error) return k500Error;
        var lastVerifiedDate = new Date(
          getLastAddressVerifiedDate?.dates?.residence,
        );
        let currentDate = new Date();
        lastVerifiedDate.setMonth(
          lastVerifiedDate.getMonth() + RESIDENCE_CRITERIA,
        );

        if (lastVerifiedDate > currentDate) {
          //update residence status
          const statusData = getMaster?.status;
          statusData.residence = !GLOBAL_FLOW.RESIDENCE_IN_APP ? 8 : 3;
          const dates = getMaster?.dates;
          dates.residence = getLastAddressVerifiedDate?.dates?.residence;

          let updateMaster = await this.masterRepo.updateRowData(
            {
              status: statusData,
              dates: dates,
            },
            getMaster?.id,
          );
          if (updateMaster == k500Error) return k500Error;
          return 'true';
        } else {
          return 'false';
        }
      } else {
        return 'false';
      }
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  // Basic, Personal and Professional details for user
  private async getMasterInfo(userId) {
    try {
      const attributes = ['id', 'otherInfo', 'status', 'dates', 'userId'];
      const options = {
        where: { userId, status: { residence: { [Op.in]: [1, 3, 7] } } },
        order: [['id', 'DESC']],
      };
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (masterData == k500Error) return k500Error;
      return masterData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  private async validateReqDataForValidateAddress(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      // User validation
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = ['aadhaarAddress', 'aadhaarStatus'];
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['dates', 'id', 'status'];
      const include = [kycInclude, masterInclude];
      const attributes = [
        'homeStatus',
        'isBlacklist',
        'typeAddress',
        'appType',
      ];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData.isBlacklist == '1')
        return k422ErrorMessage(kNotEligibleForNBFC);
      if (
        ['1', '3'].includes(userData.homeStatus) &&
        [1, 3].includes(userData.masterData?.status?.residence)
      )
        return k422ErrorMessage('Residence already verified');
      const kycData = userData.kycData;
      if (!kycData) return k422ErrorMessage(kNoDataFound);
      if (!['1', '3'].includes(kycData.aadhaarStatus))
        return k422ErrorMessage('Aadhaar is not verified');
      const rawAadhaarAddress = kycData.aadhaarAddress;
      if (!rawAadhaarAddress)
        return k422ErrorMessage('Aadhaar address not found');

      // Bank validation
      const bankAttr = ['accountDetails', 'salaryVerification'];
      const bankOptions = { order: [['id', 'DESC']], where: { userId } };
      const bankData = await this.bankRepo.getRowWhereData(
        bankAttr,
        bankOptions,
      );
      if (!bankData) return k422ErrorMessage(kNoDataFound);
      // if (!['1', '3'].includes(bankData.salaryVerification))
      //   return k422ErrorMessage('Bank details not verified');
      const rawAccDetails = bankData.accountDetails;
      if (!rawAccDetails) return k422ErrorMessage('Account details not found');
      const accountDetails = JSON.parse(bankData.accountDetails);
      // if (!accountDetails.address)
      //   return k422ErrorMessage('Bank statement address not found');

      return {
        accountDetails,
        rawAadhaarAddress,
        typeAddress: userData.typeAddress,
        masterData: userData.masterData,
        appType: userData?.appType,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  async handleCamsFlow(data: any) {
    try {
      await this.delay(2500);
      const userId = data.userId;

      const callBackData = {
        url: HOST_URL + `${Latest_Version}/banking/checkAAStatus`,
        urlMethod: 'POST',
        waitForCallbackResponse: true,
        directSource: {
          userId,
          type: 'CAMS_CHECK_CONSENT',
          subType: '',
          checkStage: 'First',
        },
        directProcessing: true,
      };
      return { callbackList: [callBackData] };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async handleSwiggyFlow(data: any) {
    try {
      await this.delay(2000);

      const rawResponse =
        typeof data.response == 'object'
          ? data.response
          : JSON.parse(data.response);
      const cookieData =
        typeof rawResponse.cookie == 'object'
          ? rawResponse.cookie
          : JSON.parse(rawResponse.cookie);

      const sid = cookieData._sid;
      const userId = data.userId;
      const sessionTid = cookieData._session_tid;
      if (!sid || !userId || !sessionTid) return {};
      const cookie = `_sid=${sid}; _session_tid=${sessionTid}`;

      const addressResponse: any = await this.getSwiggyOrderLocations(
        cookie,
        userId,
      );
      return addressResponse;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async handleZomatoFlow(data: any) {
    try {
      const rawResponse =
        typeof data.response == 'object'
          ? data.response
          : JSON.parse(data.response);
      const cookieData =
        typeof rawResponse.cookie == 'object'
          ? rawResponse.cookie
          : JSON.parse(rawResponse.cookie);

      const cid = cookieData.cid;
      const userId = data.userId;
      const zat = cookieData.zat;
      if (!cid || !userId || !zat) return {};
      const cookie = `cid=${cid}; zat=${zat}`;
      const addressResponse: any = await this.getZomatoOrderLocations(
        cookie,
        userId,
      );
      return addressResponse;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async handleUIDAIFlow(data: any) {
    try {
      const type = data.type ?? data.source?.type ?? '';
      let response: any = {};
      if (data.response) response = JSON.parse(data.response);

      if (type == 'UIDAI_CAPTCHA') {
        const base64Captcha = response.captchaBase64String;
        const captchaTxnId = response.captchaTxnId;
        return {
          isCaptchaLoader: false,
          isLoader: false,
          updateState: true,
          captchaText: '',
          base64Captcha,
          tempData: { captchaTxnId, type },
        };
      } else if (type == 'UIDAI_CAPTCHA_SUBMISSION') {
        const uidNumber = await this.getAadhaarNumber(data.userId);
        const errorMsg = uidNumber.message;
        if (errorMsg) return k422ErrorMessage(errorMsg);
        const valueData = data.value ?? {};
        const tempData: any = valueData.tempData ?? {};
        const directSource = {
          captchaTxnId: tempData.captchaTxnId,
          captchaValue: valueData.captchaText,
          transactionId: 'MYAADHAAR:' + this.typeService.getUUID(),
          uidNumber,
        };
        tempData.captchaText = valueData.captchaText;

        const callbackList: any = [
          {
            url: 'https://tathya.uidai.gov.in/unifiedAppAuthService/api/v2/generate/aadhaar/otp',
            urlMethod: 'POST',
            waitForCallbackResponse: true,
            callbackURL:
              HOST_URL + `${Latest_Version}/webview/validateResponse`,
            directSource,
            source: { type: 'UIDAI_REQUEST_OTP' },
          },
        ];
        return { callbackList, tempData };
      } else if (type == 'UIDAI_REQUEST_OTP') {
        if (response.status == 'Failure') {
          return {
            Internal_Error_Message: response.message ?? 'Invalid Captcha',
            callbackList: [
              {
                url: 'https://tathya.uidai.gov.in/unifiedAppAuthService/api/v2/get/captcha',
                urlMethod: 'POST',
                waitForCallbackResponse: true,
                callbackURL:
                  HOST_URL + `${Latest_Version}/webview/validateResponse`,
                directSource: {
                  captchaLength: '3',
                  captchaType: '2',
                  langCode: 'en',
                },
                source: { type: 'UIDAI_CAPTCHA' },
              },
            ],
          };
        } else {
          const tempData = data.tempData ?? {};
          const tempResponseData = { ...response, tempData };
          return {
            tempData: tempResponseData,
            isCaptchaLoader: false,
            isLoader: false,
            updateState: true,
            captchaText: '',
            isCaptchaFill: false,
            showOTPFill: true,
          };
        }
      } else if (type == 'UIDAI_RESEND_OTP') {
        const tempData = data.tempData?.tempData ?? {};
        const uidNumber = await this.getAadhaarNumber(data.userId);
        const errorMsg = uidNumber.message;
        if (errorMsg) return k422ErrorMessage(errorMsg);
        if (!tempData.captchaText) return {};
        const directSource = {
          captchaTxnId: tempData.captchaTxnId,
          captchaValue: tempData.captchaText,
          transactionId: 'MYAADHAAR:' + this.typeService.getUUID(),
          uidNumber,
        };
        const callbackList: any = [
          {
            url: 'https://tathya.uidai.gov.in/unifiedAppAuthService/api/v2/generate/aadhaar/otp',
            urlMethod: 'POST',
            waitForCallbackResponse: true,
            callbackURL:
              HOST_URL + `${Latest_Version}/webview/validateResponse`,
            directSource,
            source: { type: 'UIDAI_REQUEST_OTP' },
          },
        ];
        return { callbackList };
      }

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getAadhaarNumber(userId) {
    try {
      const attributes = ['aadhaarNumber'];
      const options = { order: [['id', 'DESC']], where: { userId } };

      const kycData = await this.kycRepo.getRowWhereData(attributes, options);
      if (kycData == k500Error) return kInternalError;
      if (!kycData) return k422ErrorMessage('No data found');

      return kycData.aadhaarNumber;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async handleSubscriptionFlow(data: any) {
    try {
      const loanId = data.loanId;
      if (!loanId) return kParamMissing('loanId');
      const response = data.response;
      if (!response) return kParamMissing('response');
      const queryData = decodeURIComponent(response);
      const querySpans = queryData?.split('&');
      const callbackList: any = [
        {
          url: HOST_URL + `${Latest_Version}/mandate/checkStatus`,
          directSource: { loanId },
          urlMethod: 'POST',
          waitForCallbackResponse: true,
        },
      ];
      return { callbackList, directProcessing: true };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async handleFlipkartFlow(data: any) {
    try {
      const rawResponse =
        typeof data.response == 'object'
          ? data.response
          : JSON.parse(data.response);
      const cookieData =
        typeof rawResponse.cookie == 'object'
          ? rawResponse.cookie
          : JSON.parse(rawResponse.cookie);

      const sn = cookieData.SN;
      const userId = data.userId;
      if (!sn || !userId) return {};
      const cookie = `SN=${sn};`;
      const addressResponse: any = await this.getFlipkartOrderLocations(
        cookie,
        userId,
      );
      return addressResponse;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //get flipkart order delivery address data
  async getFlipkartOrderLocations(cookie, userId = '') {
    try {
      const headers: any = {
        cookie,
        'User-Agent': 'Mozilla/5.0',
        'X-User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
      };
      let page = 1;
      let result: any;
      let allUrl;
      let DC;
      let orderIds = [];
      const allOrderData = [];
      for (let i = 1; i <= page; i++) {
        try {
          allUrl = `${FLIPKART1_ORDER_DATA_URL}?page=${page}`;
          result = await this.api.requestGet(allUrl, headers);
          if (result == k500Error) return k500Error;
          if (result.ERROR_CODE == 2000) {
            allUrl = `${FLIPKART2_ORDER_DATA_URL}?page=${page}`;
            result = await this.api.requestGet(allUrl, headers);
            if (result == k500Error) return k500Error;
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
            if (response == k500Error) return k500Error;
          } else {
            url = `https://${FLIPKART_SINGLE_ORDER_URL}?order_id=${element}`;
            response = await this.api.requestGet(url, headers);
            if (response == k500Error) return k500Error;
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
            const details: any = {
              orderDate: this.typeService.getGlobalDate(date),
              deliveryAddress:
                shipping?.addressLine1 + ', ' + shipping?.addressLine2,
              deliveryAdd: JSON.stringify(shipping),
            };
            allOrderData.push(details);
          }
        } catch (error) {}
      }

      const creationResponse: any = await this.addAddressData(
        allOrderData,
        userId,
        '9',
      );
      if (creationResponse.message) return creationResponse;
      return await this.residenceService.validateResidenceAutomation(userId);
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async addAddressData(addressList: any[], userId: string, type: string) {
    try {
      const response = JSON.stringify(addressList);
      const creationData: any = {
        adminId: SYSTEM_ADMIN_ID,
        response,
        status: '5',
        type,
        userId,
      };
      const priveusAddresses = await this.addressRepo.getTableWhereData(
        ['address', 'id', 'type', 'status'],
        { where: { userId } },
      );
      let availableAddress: any = {};
      if (priveusAddresses && priveusAddresses !== k500Error) {
        for (let i = 0; i < priveusAddresses.length; i++) {
          let key = '';
          if (typeof priveusAddresses[i]['address'] === 'string')
            key = `${[
              ...priveusAddresses[i]?.address?.split(' '),
            ]}`.toLocaleLowerCase();
          availableAddress[key] = true;
        }
      }
      for (let index = 0; index < 10; index++) {
        try {
          const address = addressList[index].deliveryAddress;
          if (
            !availableAddress[`${[...address.split(' ')]}`.toLocaleLowerCase()]
          ) {
            creationData.address = address;
            await this.addressRepo.createRowData(creationData);
          }
        } catch (error) {}
      }

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  //get zomato order delivery address data
  async getZomatoOrderLocations(cookie, userId = '') {
    try {
      const headers = { cookie };
      let page = 0;
      let totalPage = 1;
      const allOrderData: any = [];
      for (let i = 0; i < totalPage; i++) {
        try {
          page++;
          const url = `${ZOMATO_ORDER_DATA_URL}?page=${page}`;
          const response = await this.api.requestGet(url, headers);
          if (response == k500Error) continue;
          totalPage = response.sections.SECTION_USER_ORDER_HISTORY?.totalPages;
          Object.keys(response.entities?.ORDER).forEach((element) => {
            const order = response.entities?.ORDER[element];
            const date = order?.orderDate.split(' at ')[0];
            if (order?.deliveryDetails?.deliveryStatus == 4) {
              const details: any = {
                orderDate: this.typeService.getGlobalDate(date),
                deliveryAddress: order?.deliveryDetails?.deliveryAddress,
              };
              allOrderData.push(details);
            }
          });
        } catch (error) {}
      }

      const creationResponse: any = await this.addAddressData(
        allOrderData,
        userId,
        '7',
      );
      if (creationResponse.message) return creationResponse;
      return await this.residenceService.validateResidenceAutomation(userId);
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  //get swiggy order delivery address data
  async getSwiggyOrderLocations(cookie, userId = '') {
    try {
      const headers: any = {
        cookie,
        'User-Agent': 'Mozilla/5.0',
      };
      let totalPage = 1;
      let orderId = '';
      const allOrderData: any = [];
      for (let i = 0; i < totalPage; i++) {
        try {
          const url = `${SWIGGY_ORDER_DATA_URL}?order_id=${orderId}`;
          const response = await this.api.requestGet(url, headers);
          if (response == k500Error) return k500Error;
          response.data?.orders.forEach((element) => {
            if (element?.order_delivery_status == 'delivered') {
              const address = element?.delivery_address;
              const details: any = {
                orderDate: this.typeService.getGlobalDate(element?.order_time),
                deliveryAddress:
                  address?.flat_no +
                  ', ' +
                  address?.address_line2 +
                  ', ' +
                  address?.address_line1,
                deliveryLocation: address?.address,
                deliveryAdd: JSON.stringify(address),
              };
              allOrderData.push(details);
            }
          });
          orderId =
            response.data?.orders[response.data?.orders.length - 1]?.order_id;
          if (orderId) totalPage += 1;
          if (response.data?.orders.length < 9) break;
        } catch (error) {}
      }

      const creationResponse: any = await this.addAddressData(
        allOrderData,
        userId,
        '8',
      );
      if (creationResponse.message) return creationResponse;
      return await this.residenceService.validateResidenceAutomation(userId);
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
}
