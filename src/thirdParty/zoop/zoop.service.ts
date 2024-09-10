import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import * as fs from 'fs';
import {
  kAadhaarConsentText,
  kZoopConsentText,
  signer_purpose,
} from 'src/constants/strings';
import {
  ZOOP_AADHAAR_URL,
  ZOOP_ESIGN_CHECK_URL,
  ZOOP_ESIGN_INIT_URL,
  ZOOP_OPT_VERIFY_URL,
  ZOOP_PAN_URL,
  ZOOP_RESPONSE_URL,
} from 'src/constants/network';

import puppeteer from 'puppeteer';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { puppeteerConfig } from 'src/constants/globals';
import { ValidationService } from 'src/utils/validation.service';
import { kZoopESign } from 'src/constants/directories';

const zoopHeaders = {
  'app-id': process.env.ZOOP_APP_ID,
  'api-key': process.env.ZOOP_API_KEY,
  'Content-Type': 'application/json',
};

@Injectable()
export class ZoopService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly fileService: FileService,
    private readonly validation: ValidationService,
  ) {}

  //#region zoop esign init
  async esignInit(data) {
    try {
      let signer_name = data.name;
      if (signer_name.includes("'"))
        signer_name = signer_name.replace(/'/g, '');
      const signer_email = data.email;
      const signer_city = data.city;
      const path = data.path;
      if (!signer_name || !signer_email || !signer_city || !path) return false;

      const fileData = fs.readFileSync(path);
      const base64 = Buffer.from(fileData).toString('base64');

      const body = {
        signers: [
          {
            signer_name,
            signer_email,
            signer_city,
            signer_purpose: signer_purpose,
            sign_coordinates: [{ page_num: 0, x_coord: 0, y_coord: 0 }],
          },
        ],
        txn_expiry_min: 1440,
        response_url: ZOOP_RESPONSE_URL,
        redirect_url: ZOOP_RESPONSE_URL,
        document: { info: signer_purpose, data: base64 },
      };
      const url = ZOOP_ESIGN_INIT_URL;
      const res = await this.api.post(url, body, zoopHeaders);
      if (!res || res === k500Error) return k500Error;
      if (res?.success === true) return res?.requests?.[0]['request_id'];
      return false;
    } catch (error) {
      console.log('esignInit', error);
      return k500Error;
    }
  }
  //#endregion

  //#region open in html
  async openInHTMLAndGetURL(id) {
    try {
      const filePath = kZoopESign;
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace('##ID##', id);
      const browser = await puppeteer.launch(puppeteerConfig);
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      await page.setContent(content);
      await this.typeService.delay(1000);
      const url = await page.url();
      await browser.close();
      return url;
    } catch (error) {
      console.log({error})
      return k500Error;
    }
  }
  //#endregion

  //#region check status of esing
  async checkStatusOfeSing(id) {
    try {
      const url = ZOOP_ESIGN_CHECK_URL + id;
      let signed_document_upload;
      const result = await this.api.get(url, null, zoopHeaders);
      if (!result || result === k500Error) return kInternalError;
      if (result?.transaction_status === 'SUCCESS') {
        const probability = this.validation.getTextProbability(
          result?.signer_name,
          result?.aadhaar_name,
        );
        let status = '0';
        let nameMissMatch = false;
        if (probability < 40) nameMissMatch = true;
        else {
          const signed_url = result?.document?.signed_url;
          if (signed_url) {
            const base64 = await this.fileService.urlToBuffer(signed_url);
            if (!base64 || base64 === k500Error) return kInternalError;
            const url = await this.fileService.base64ToURL(base64);
            if (url === k500Error || url?.message) return kInternalError;
            status = '1';
            signed_document_upload = url;
          }
        }
        return {
          signed_document_upload,
          status,
          nameMissMatch,
          response: JSON.stringify(result),
        };
      } else if (result?.transaction_status === 'GATEWAY_OPENED') return false;
      else if (result?.transaction_status === 'ESP_FAILURE') return false;
      else if (result?.transaction_status === 'ESP_REDIRECTED') return false;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region pan card verification
  async checkPanCard(panNumber) {
    try {
      const body = {
        data: {
          customer_pan_number: panNumber,
          consent: 'Y',
          consent_text: kZoopConsentText,
        },
      };
      const url = ZOOP_PAN_URL;
      const res = await this.api.post(url, body, zoopHeaders);
      if (!res) return k500Error;
      if (res?.response_code == 100) return res;
      else if (res?.response_message)
        return k422ErrorMessage(res?.response_message);
      else if (res === k500Error) return k422ErrorMessage('No Record Found');
      else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //zoop service for aadhar verificaton
  async checkAadhaarRequest(aadhaarNumber) {
    try {
      const body = {
        data: {
          customer_aadhaar_number: aadhaarNumber,
          consent: 'Y',
          consent_text: kAadhaarConsentText,
        },
      };
      const url = ZOOP_AADHAAR_URL;
      const response = await this.api.post(
        url,
        body,
        zoopHeaders,
        {},
        {},
        true,
      );
      if (response === k500Error) return kInternalError;
      else if (response?.response_message && !response?.success)
        return k422ErrorMessage(response?.response_message);
      else if (!response?.valid && !response?.success)
        return k422ErrorMessage(response?.data?.response_message);
      return response;
    } catch (error) {
      return kInternalError;
    }
  }
  //#zoop aadhaar request

  /* Zoop Aadhaar OTP verify*/
  async verifyAadhaarOTP(request_id, otp) {
    try {
      const body = {
        data: {
          request_id,
          otp,
          consent: 'Y',
          consent_text: kAadhaarConsentText,
        },
      };
      const url = ZOOP_OPT_VERIFY_URL;
      const response = await this.api.post(
        url,
        body,
        zoopHeaders,
        {},
        {},
        true,
      );
      if (response === k500Error) return kInternalError;
      else if (response?.response_message && !response?.success)
        return k422ErrorMessage(response?.response_message);
      else if (!response?.valid && !response?.success)
        return k422ErrorMessage(response?.data?.response_message);
      return response;
    } catch (error) {
      return kInternalError;
    }
  }
}
