// Imports
import { Injectable } from '@nestjs/common';
import * as Cipher from 'aes-ecb';
import {
  APPLICATION_ID_UAT,
  APPLICATION_ID,
  AADHAAR_XML,
  DRIVING_LICENCE,
  FRONT_SIDE_OF_DRIVING_LICENSE,
  BACK_SIDE_OF_DRIVING_LICENSE,
  VOTER_ID,
  FRONT_SIDE_OF_VOTER_ID,
  BACK_SIDE_OF_VOTER_ID,
  PASSPORT,
  FRONT_SIDE_OF_PASSPORT,
  BACK_SIDE_OF_PASSPORT,
  APPLICATION_ID_MANDATE,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  SD_LIVE_AADHAAR_OTP_V1,
  ADHAR_UPLOAD_URL_UAT,
  DOC_UPLOAD_URL,
  SD_UAT_AADHAAR_OTP_V2,
  PAN_UPLOAD_URL_UAT,
  signdesk_mandate_check,
  nSigndeskWebhook,
} from 'src/constants/network';
import { kSignDeskUploadBody } from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { AUTODEBIT_URI } from 'src/constants/network';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { ResponseRepository } from 'src/repositories/response.repository';
import { kSigndesk } from 'src/constants/strings';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-parse-application-id':
    process.env.SIGNDESKUAT == 'TRUE' ? APPLICATION_ID_UAT : APPLICATION_ID,
  'x-parse-rest-api-key':
    process.env.SIGNDESKUAT == 'TRUE'
      ? process.env.REST_API_KEY_UAT
      : process.env.REST_API_KEY,
};

@Injectable()
export class SigndeskService {
  constructor(
    private readonly apiService: APIService,
    private readonly typeService: TypeService,
    // Repositories
    private readonly responseRepo: ResponseRepository,
  ) {}

  async addAadhaarNumber(aadhaarNumber: string) {
    try {
      const aadhaar_number = aadhaarNumber.replace(/ /g, '');
      let xmljson;
      const signDeskUAT = process.env.SIGNDESKUAT;
      const reference_id = this.getRefId();

      if (signDeskUAT == 'TRUE')
        xmljson = {
          reference_id,
          source_type: 'id',
          source: aadhaar_number,
        };
      else
        xmljson = {
          reference_id,
          documents: [
            {
              type: AADHAAR_XML,
              aadhaar_number,
            },
          ],
        };
      const aadhaarURL =
        signDeskUAT == 'TRUE' ? ADHAR_UPLOAD_URL_UAT : DOC_UPLOAD_URL;
      return await this.submitToSignDesk(xmljson, aadhaarURL);
      // return kMockAadhaarResponse01;
    } catch (error) {
      return kInternalError;
    }
  }

  async validateAadhaarOTP(otpJson: any) {
    try {
      const signDeskUAT = process.env.SIGNDESKUAT;
      const url =
        signDeskUAT == 'TRUE' ? SD_UAT_AADHAAR_OTP_V2 : SD_LIVE_AADHAAR_OTP_V1;
      const response = await this.submitToSignDesk(otpJson, url);
      if (response['message']) return k422ErrorMessage(response['message']);
      const resultData = response.result ?? response.documents_status[0];
      if (!resultData) return kInternalError;
      if (!resultData.validated_data) return kInternalError;
      const userData = resultData.validated_data;
      // delete userData.profile_image;
      delete userData.face_status;
      delete userData.face_score;
      return userData;
    } catch (error) {
      return kInternalError;
    }
  }

  async validatePanCard(fileURL: string) {
    try {
      const base64Content = await this.typeService.getBase64FromImgUrl(fileURL);
      if (base64Content == k500Error) return kInternalError;

      let jsonData;
      const signDeskUAT = process.env.SIGNDESKUAT;
      const reference_id = this.getRefId();
      if (signDeskUAT == 'TRUE')
        jsonData = {
          reference_id,
          source_type: 'base64',
          source: base64Content,
        };
      else {
        const spans = fileURL.split('.');
        const panFormat = spans[spans.length - 1].toUpperCase();
        jsonData = {
          reference_id,
          documents: [
            {
              type: 'PAN',
              format: panFormat,
              content: base64Content,
            },
          ],
        };
      }

      const url = signDeskUAT == 'TRUE' ? PAN_UPLOAD_URL_UAT : DOC_UPLOAD_URL;

      const response = await this.submitToSignDesk(jsonData, url);
      // return {
      //   statusCode: 422,
      //   message: 'From UIDAI, The documents could not be processed.',
      //   valid: false,
      //   data: { message: 'From UIDAI, The documents could not be processed.' }
      // };
      return response;
      // return {
      //   status: 'success',
      //   reference_id: 'lendittbuqlga7',
      //   transaction_id: 'TXNPW5C23MG9W',
      //   response_time_stamp: '2022-06-14T20:32:50',
      //   result: {
      //     extracted_data: {
      //       name: 'Malav Dalvadi',
      //       pan_number: 'CCSPD2q736E',
      //       dob: '14/04/1998',
      //       father_name: 'DEVENKUMAR DASHRATHLAL PATEL',
      //     },
      //     validated_data: {
      //       client_id: 'pan_DkZtganwzjIEBpGluiju',
      //       pan_number: 'CCSPD2q736E',
      //       full_name: 'Malav Dalvadi',
      //       category: 'person',
      //     },
      //     valid_pan: true,
      //     data_match: { full_name: 89, pan_number: 100 },
      //     data_match_aggregate: 95,
      //   },
      // };
    } catch (error) {
      return kInternalError;
    }
  }

  async validateOtherDoc(
    frontImage: string,
    docType: string,
    backImage?: string,
  ) {
    try {
      let doc1type;
      let doc2type;

      if (docType != DRIVING_LICENCE && !backImage)
        return k422ErrorMessage('Back side image required');

      switch (docType) {
        case DRIVING_LICENCE:
          doc1type = FRONT_SIDE_OF_DRIVING_LICENSE;
          if (backImage) doc2type = BACK_SIDE_OF_DRIVING_LICENSE;
          break;
        case VOTER_ID:
          doc1type = FRONT_SIDE_OF_VOTER_ID;
          doc2type = BACK_SIDE_OF_VOTER_ID;
          break;
        case PASSPORT:
          doc1type = FRONT_SIDE_OF_PASSPORT;
          doc2type = BACK_SIDE_OF_PASSPORT;
          break;
        default:
          return kInternalError;
      }

      const spans = frontImage.split('.');
      const extension1 = spans[spans.length - 1].toUpperCase();
      const frontBase64 = await this.typeService.getBase64FromImgUrl(
        frontImage,
      );
      if (frontBase64 == k500Error) return kInternalError;
      const frontData = {
        type: doc1type,
        format: extension1,
        content: frontBase64,
      };
      const jsonList = [frontData];
      if (backImage && docType != DRIVING_LICENCE) {
        const spans = backImage.split('.');
        const extension2 = spans[spans.length - 1].toUpperCase();
        const backBase64 = await this.typeService.getBase64FromImgUrl(
          frontImage,
        );
        if (frontBase64 == k500Error) return kInternalError;
        const backData = {
          type: doc2type,
          format: extension2,
          content: backBase64,
        };
        jsonList.push(backData);
      }
      const jsonData = {
        reference_id: this.getRefId(),
        documents: jsonList,
      };
      return await this.submitToSignDesk(jsonData, DOC_UPLOAD_URL);
    } catch (error) {
      return kInternalError;
    }
  }

  async submitToSignDesk(xmlJson, url) {
    try {
      const api_encrypt_response = await this.encryptData(
        process.env.ENC_KEY_STRING,
        JSON.stringify(xmlJson).trim(),
      );
      const body = {
        ...kSignDeskUploadBody,
        api_data: api_encrypt_response,
      };
      const options = {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };
      const successData = await this.apiService.post(
        url,
        body,
        headers,
        null,
        options,
      );
      if (successData === k500Error) return k500Error;
      const message = successData.encrypted_response;
      const document_decrypt_message = await this.decryptData(
        process.env.ENC_KEY_STRING,
        message,
      );
      const signDeskRes = { status: true, message: document_decrypt_message };
      if (signDeskRes.status != true) return k422ErrorMessage();
      const response = JSON.parse(signDeskRes.message.replace(/}]}.*/g, '}]}'));
      if (response == k500Error) return kInternalError;
      if (response['valid'] == false) return signDeskRes;
      if (response['status'] === 'failed' && response['message'])
        return k422ErrorMessage('From UIDAI, ' + response['message']);
      if (response['status'] === 'failed' && response['error'])
        return k422ErrorMessage(response['error']);
      delete response.message;
      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  async signDeskApi(url, body) {
    try {
      const successData = await this.apiService.post(url, body, headers);
      if (successData === k500Error) return k500Error;

      const message = successData.encrypted_response;
      const document_decrypt_message = await this.decryptData(
        process.env.ENC_KEY_STRING,
        message,
      );

      return { status: true, message: document_decrypt_message };
    } catch (error) {
      return { status: false, message: error };
    }
  }

  async checkMandateStatus(referenceId) {
    try {
      const url = signdesk_mandate_check;
      const body = {
        emandate_id: referenceId,
      };
      const response = await this.apiService.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      return response;
    } catch (error) {
      console.log({error})
      return kInternalError;
    }
  }

  async placeAutoDebits(preparedList: any) {
    try {
      const mandateList = [];
      preparedList.forEach((el) => {
        mandateList.push({
          amount: Math.floor(el.paidAmount),
          emandate_id: el.mandateId,
        });
      });
      const body = {
        submission_date: preparedList[0].targetDate,
        mandate_list: mandateList,
      };
      if (process.env.MODE == 'PROD')
        return await this.apiService.post(AUTODEBIT_URI, body, headers);
      else return k500Error;

      // return {
      //   status: 'success',
      //   batch_id: '63132671534195aab95c37b2111',
      //   total_records: 1,
      //   records_success: 1,
      //   records_failed: 0,
      //   result: [
      //     {
      //       emandate_id: '6129ca7f05191c17ecf8ef9d',
      //       debit_amount: 11,
      //       status: 'success',
      //       error_code: 'NA',
      //       error_message: 'NA',
      //     },
      //   ],
      // };
      // return {
      //   status: 'success',
      //   batch_id: 'NA',
      //   total_records: 1,
      //   records_success: 0,
      //   records_failed: 1,
      //   result: [
      //     {
      //       emandate_id: '6129ca7f05191c17ecf8ef9d',
      //       debit_amount: 1,
      //       status: 'failed',
      //       error_code: 'dbst_128',
      //       error_message:
      //         'The value of the amount used in the request should be greater than or equal to 10.',
      //     },
      //   ],
      // };
    } catch (error) {
      return k500Error;
    }
  }

  async checkSubscriptionStatus(emandate_id: string) {
    try {
      const url = signdesk_mandate_check;
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-parse-application-id': APPLICATION_ID_MANDATE,
        'x-parse-rest-api-key': process.env.REST_API_KEY_MANDATE,
      };
      const body = { emandate_id };
      const response = await this.apiService.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      return {
        response: JSON.stringify(response),
        isRegistered: response.mandate_status == 'Registered',
        umrn: response.umrn,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async checkESignStatus(document_id: string) {
    try {
      const url = 'https://api.signdesk.in/api/live/getSignatureStatus';
      const headers = {
        'Content-Type': 'application/json',
        'x-parse-rest-api-key': 'd12e8567d6c47f19ce7b15791c237aad',
        'x-parse-application-id':
          'lenditt-innovations--technologies-pvt-ltd_live_esign',
      };
      const body = { document_id };
      const response = await this.apiService.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (response.status != 'success') return kInternalError;
      return { isSigned: (response.signer_info[0] ?? []).status == 'signed' };
    } catch (error) {
      return kInternalError;
    }
  }

  async getSignedAgreement(document_id: string, docket_id: string) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-parse-rest-api-key': 'd12e8567d6c47f19ce7b15791c237aad',
        'x-parse-application-id':
          'lenditt-innovations--technologies-pvt-ltd_live_esign',
      };
      const url = 'https://api.signdesk.in/api/live/getDocketInfo';
      const body = { document_id, docket_id };

      const response = await this.apiService.post(url, body, headers);
      if (response == k500Error) return kInternalError;
      if (response.status != 'success') return kInternalError;
      if (!response.docket_Info) return kInternalError;
      return response.docket_Info[0].content;
    } catch (error) {
      return kInternalError;
    }
  }
  async eMandateRequest(url, body) {
    try {
      const successData = await this.apiService.post(url, body, headers);
      if (successData === k500Error) return kInternalError;
      return successData;
    } catch (error) {
      return kInternalError;
    }
  }

  async encryptData(keyString, data) {
    return Cipher.encrypt(keyString, data);
  }

  async decryptData(keyString, data) {
    return Cipher.decrypt(keyString, data);
  }

  getRefId() {
    return 'lenditt' + Math.random().toString(36).substring(2, 9);
  }

  async debitSheetUpdate(reqData) {
    await this.responseRepo.createRowData({
      response: JSON.stringify(reqData),
      type: kSigndesk,
    });
    // Prepare response
    const autoDebitResponse: any = {};
    autoDebitResponse.type = reqData.type;
    autoDebitResponse.batch_id = reqData.batch_id;
    autoDebitResponse.mandate_list = [];
    const mandateList = reqData.mandate_list ?? [];

    for (let index = 0; index < mandateList.length; index++) {
      try {
        const mandateResult = mandateList[index];
        autoDebitResponse.mandate_list.push(mandateResult);
        autoDebitResponse.mandate_list = [];
        await this.apiService.requestPost(nSigndeskWebhook, autoDebitResponse);
      } catch (error) {}
    }
  }
}
