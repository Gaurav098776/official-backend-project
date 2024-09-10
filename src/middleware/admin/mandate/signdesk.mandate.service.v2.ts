import { Injectable } from '@nestjs/common';
import * as Cipher from 'aes-ecb';
import { APPLICATION_ID_MANDATE } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-parse-application-id': APPLICATION_ID_MANDATE,
  'x-parse-rest-api-key': process.env.REST_API_KEY_MANDATE,
};

@Injectable()
export class SigndeskMandateService {
  constructor(private readonly apiService: APIService) {}

  async eMandateRequest(url, body) {
    try {
      const successData = await this.apiService.post(url, body, headers);
      if (successData === k500Error) return kInternalError;
      return successData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async encryptData(keyString, data) {
    return Cipher.encrypt(keyString, data);
  }

  async decryptData(keyString, data) {
    return Cipher.decrypt(keyString, data);
  }
}
