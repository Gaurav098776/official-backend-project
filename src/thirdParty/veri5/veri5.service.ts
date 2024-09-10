import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import * as FormData from 'form-data';
import * as fs from 'fs';
import {
  KHOSLA_CLIENT_CODE,
  KHOSLA_DOC,
  KHOSLA_DOWNLOAD_AADHAAR,
  KHOSLA_DOWNLOAD_ESIGN_URL,
  KHOSLA_ESIGN_SALT,
  KHOSLA_FETCHKYC_URL,
  KHOSLA_INITIATE_URL,
  KHOSLA_KYC_API_KEY,
  KHOSLA_KYC_SALT,
  KHOSLA_PAN_VERIFICATION,
} from 'src/constants/network';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { kQa } from 'src/constants/strings';

@Injectable()
export class Veri5Service {
  constructor(
    private readonly apiService: APIService,
    private readonly cryptService: CryptService,
    private readonly fileService: FileService,
  ) {}

  async getAadhaarDetails(data) {
    try {
      const uuid = data.uuid;
      const client_code = KHOSLA_CLIENT_CODE;
      const api_key = KHOSLA_KYC_API_KEY;
      const salt = KHOSLA_KYC_SALT;
      const secretKey = `${client_code}|${uuid}|${api_key}|${salt}`;
      const hash = this.cryptService.getHash(secretKey);
      const body = {
        headers: {
          client_code,
        },
        request: {
          uuid,
          api_key,
          hash,
        },
      };
      const url = KHOSLA_FETCHKYC_URL;
      const response = await this.apiService.post(url, body, null, null, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response == k500Error || !response.response_data) return k500Error;
      const address = response.response_data.address;
      const dob = response.response_data.dob;
      const addressDetails = Buffer.from(
        response?.response_data?.seg_address,
        'base64',
      ).toString();
      const full_name = response.response_data?.name;
      const profile_image = response.response_data.doc_face;
      const gender = response?.response_data?.gender;
      const updateData: any = {
        address,
        dob,
        addressDetails,
        aadhaarAddressResponse: JSON.stringify(addressDetails),
        profile_image,
        full_name,
        gender,
      };
      const downloaAadharData = await this.downloadAadhaar(data);
      if (downloaAadharData == k500Error) return k500Error;
      const aadhaarDocument = await this.fileService.base64ToURL(
        downloaAadharData?.doc_content,
        'zip',
      );
      if (aadhaarDocument == k500Error) return k500Error;
      updateData.aadhaarDoc = aadhaarDocument;
      updateData.aadhaarPassword = downloaAadharData.password;

      return updateData;
    } catch (error) {
      return k500Error;
    }
  }

  async downloadAadhaar(data) {
    try {
      const secretKey = `${KHOSLA_CLIENT_CODE}|${data.uuid}|${KHOSLA_KYC_API_KEY}|${KHOSLA_KYC_SALT}`;
      const hash = this.cryptService.getHash(secretKey);
      const body = {
        headers: {
          client_code: KHOSLA_CLIENT_CODE,
          function_code: 'DOWNLOAD',
          function_sub_code: 'DELETE',
        },
        request: {
          uuid: data.uuid,
          api_key: KHOSLA_KYC_API_KEY,
          hash,
        },
      };
      const url = KHOSLA_DOWNLOAD_AADHAAR;
      const response = await this.apiService.post(url, body, null, null, {
        headers: { 'Content-Type': 'application/json' },
      });
      // const response: any = kAddAadharResponseData;
      if (response == k500Error || !response.response_data) return k500Error;
      return response.response_data;
    } catch (error) {
      return k500Error;
    }
  }

  async veri5PanCard(panNumber) {
    try {
      const client_code = KHOSLA_CLIENT_CODE;
      const stan = 'stan' + new Date().getTime().toString();
      const body = {
        headers: {
          client_code,
          sub_client_code: client_code,
          stan,
          channel_code: 'ANDROID_SDK',
          channel_version: '',
          client_ip: '',
          transmission_datetime: '155325508029',
          operation_mode: 'SELF',
          run_mode: 'DEFAULT',
          actor_type: 'DEFAULT',
          user_handle_type: 'EMAIL',
          user_handle_value: kQa[1],
          location: 'NA',
          function_code: 'VERIFY_PAN',
          function_sub_code: 'NUMBER',
        },
        request: {
          pan_details: {
            pan_number: panNumber,
          },
        },
      };
      const url = KHOSLA_PAN_VERIFICATION;
      const response: any = await this.apiService.post(url, body, null, null, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response == k500Error || response.verification_status == 'FAIL')
        return k500Error;

      try {
        const verifiedData = JSON.parse(response.verified_data);
        const result = { extracted_data: verifiedData };
        result.extracted_data.pan_number = panNumber;
        response.result = result;
      } catch (error) {}
      return response;
    } catch (error) {
      return k500Error;
    }
  }

  async uploadAggrementForVeri5(agreementPath, userData) {
    try {
      if (!agreementPath || !userData) return k500Error;
      const fileContent = await fs.readFileSync(agreementPath);
      const url = KHOSLA_DOC;
      const reqId = new Date().getTime().toString();
      const fileName = agreementPath
        ?.split('/')
        ?.slice(-1)[0]
        .replace('.pdf', '');
      const page_no = 'all';
      const doc_type = 'pdf';
      const secrets = `${KHOSLA_ESIGN_SALT}|${reqId}|${fileName}|${page_no}|${doc_type}`;
      const hash = this.cryptService.getHash(secrets);
      const bodyFormData = new FormData();
      const name = userData.fullName.split(' ')[0];
      bodyFormData.append('client_code', KHOSLA_CLIENT_CODE);
      bodyFormData.append('client_request_id', reqId);
      bodyFormData.append('doc_type', doc_type);
      bodyFormData.append('reason', 'Loan Agreement');
      bodyFormData.append('signer_location', userData.city || 'india');
      bodyFormData.append('signer_name', name ?? userData.fullName);
      bodyFormData.append('filename', fileName);
      bodyFormData.append('rectangle', '772,100,370,0');
      bodyFormData.append('page_no  ', page_no);
      bodyFormData.append('hash', hash);
      bodyFormData.append('doc_no', '1');
      bodyFormData.append('file', fileContent, fileName + '.pdf');
      const response: any = await this.apiService.post(
        url,
        bodyFormData,
        null,
        null,
        {
          headers: { ...bodyFormData.getHeaders() },
        },
      );
      response.requestId = reqId;
      return response;
    } catch (error) {
      console.log({error})
      return k500Error;
    }
  }

  async getEsignInviteLink(docId) {
    try {
      if (!docId) return false;
      const secrets = `${docId}|${KHOSLA_ESIGN_SALT}`;
      const hash = this.cryptService.getHash(secrets);
      const invite_url = `${KHOSLA_INITIATE_URL}?id=${docId}&h=${hash}`;
      return { invite_url };
    } catch (error) {
      console.log({error})
      return k500Error;
    }
  }

  async checkEsignStatusAndDownaload(docId) {
    try {
      if (!docId) return false;
      const secrets = docId;
      const hash = this.cryptService.getHash(secrets);

      const body = {
        id: docId,
        hash,
      };
      const response = await this.apiService.post(
        KHOSLA_DOWNLOAD_ESIGN_URL,
        body,
        null,
        null,
        { headers: { 'Content-Type': 'application/json' } },
      );
      const isSigned = response.code != '101' && response != k500Error;
      return {
        isSigned,
        fileContent: response.responseData?.fileContent,
        signerName: response.responseData?.nameAsPerAadhar,
      };
    } catch (error) {
      return k500Error;
    }
  }
}
