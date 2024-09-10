import { Injectable } from '@nestjs/common';
import { HOST_URL, SENSEDATA_SERVICE } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  SENSEDATA_BASE_URL,
  SENSEDATA_GET_ADDRESS_URL,
} from 'src/constants/network';
import { SENSEDATA_HEADERS } from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class SenseDataService {
  constructor(
    private readonly addressRepo: AddressesRepository,
    private readonly api: APIService,
  ) {}

  async genrateAccessToken() {
    try {
      const url = SENSEDATA_BASE_URL + 'auth/token';
      const headers = SENSEDATA_HEADERS;
      const body = {
        grants_type: 'client_credentials',
        scopes: 'Amazon Zomato Flipkart',
      };
      const data = await this.api.requestPost(url, body, headers);
      if (data == k500Error) return kInternalError;
      if (!data.access_token) return kInternalError;
      return data.access_token;
    } catch (error) {
      return kInternalError;
    }
  }

  async requestAutomationURL(userId: string, type: string) {
    try {
      if (!SENSEDATA_SERVICE)
        return k422ErrorMessage('Service is not available at this time');
      const tokenData = await this.genrateAccessToken();
      if (tokenData['message']) return k422ErrorMessage(tokenData['message']);

      const host = SENSEDATA_BASE_URL + 'fastlink';
      const accessToken = `access_token=${tokenData}`;
      const urlType = `type=${type}`;
      const callback = `callback=${HOST_URL}senseData/callBack/?userId=${userId}`;
      const url = `${host}?${accessToken}&${urlType}&${callback}`;

      return { url };
    } catch (error) {
      return kInternalError;
    }
  }

  async fetchAddresses(transactionId: string, userId: string) {
    try {
      if (!SENSEDATA_SERVICE)
        return k422ErrorMessage('Service is not available at this time');
      const tokenData = await this.genrateAccessToken();
      if (tokenData['message']) return k422ErrorMessage(tokenData['message']);

      const headers = {
        Authorization: 'Bearer ' + tokenData,
        'Content-Type': 'application/json',
      };
      const url = `${SENSEDATA_GET_ADDRESS_URL}${transactionId}`;
      const response = await this.api.requestGet(url, headers);

      const rawResponseStr = JSON.stringify(response);
      if (
        response == k500Error ||
        !response.status ||
        response.message != 'Success'
      ) {
        return {
          message: 'INTERNAL_SERVER_ERROR',
          response: rawResponseStr,
        };
      }

      response.transactionId = transactionId;
      const addresses = response.data.address;
      if (addresses.length == 0)
        return {
          message: 'No_address_found',
          response: rawResponseStr,
        };
      delete response.data.address;

      const type = this.getAddressType(response.data.type);

      const addressData = [];
      for (let index = 0; index < addresses.length; index++) {
        try {
          const el = addresses[index];
          const data: any = { ...el, type, userId };
          delete data.createdAt;
          delete data.isDefault;
          delete data.isBusiness;
          data.refId = data.id;
          delete data.id;
          data.adminId = 37;
          data.status = '5';
          data.subType = data.name.toLowerCase();
          delete data.name;
          data.response = JSON.stringify({ ...response, address: el });
          addressData.push(data);

          const attributes = ['id'];
          const options = { where: { userId, address: data.address } };
          const existingData = await this.addressRepo.getRowWhereData(
            attributes,
            options,
          );
          if (!existingData) await this.addressRepo.createRowData(data);
        } catch (error) {}
      }

      return addressData;
    } catch (error) {
      return kInternalError;
    }
  }

  private getAddressType(type: string) {
    try {
      switch (type) {
        case 'Zomato':
          return '2';
        case 'Flipkart':
          return '3';
        case 'Amazon':
          return '4';
        case 'Blinkit':
          return '5';
        default:
          return '6';
      }
    } catch (error) {
      return '6';
    }
  }
}
