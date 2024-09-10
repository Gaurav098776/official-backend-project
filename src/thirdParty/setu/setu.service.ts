import { Injectable } from '@nestjs/common';
import { APIService } from 'src/utils/api.service';
import * as fs from 'fs';
import * as FormData from 'form-data';
import {
  SETU_CREATE_REQUEST_URL,
  SETU_ESIGN_INIT_URL,
  ZOOP_RESPONSE_URL,
} from 'src/constants/network';
import { FileService } from 'src/utils/file.service';
import { kInternalError } from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import { ValidationService } from 'src/utils/validation.service';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class SetuService {
  constructor(
    private readonly api: APIService,
    private readonly validation: ValidationService,
    private readonly fileService: FileService,
  ) {}

  headers: any = {
    'x-client-id': EnvConfig.setu.clientId,
    'x-client-secret': EnvConfig.setu.clientSecret,
    'x-product-instance-id': EnvConfig.setu.productInstanceId,
  };

  //#region setu esign init
  async setuInit(data) {
    let signer_name = data.name;
    if (signer_name.includes("'")) signer_name = signer_name.replace(/'/g, '');

    const path = data.path;
    const filePath = await fs.readFileSync(path);
    const fileName = path?.split('/')?.slice(-1)[0].replace('.pdf', '');
    const body = new FormData();
    body.append('name', signer_name);
    body.append('document', filePath, fileName + '.pdf');
    const url = SETU_ESIGN_INIT_URL;
    const response = await this.api.post(url, body, null, null, {
      headers: { ...this.headers, ...body.getHeaders() },
    });

    const redirectUrl = `${ZOOP_RESPONSE_URL}?documentId=${response.id}`;
    let onPages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (EnvConfig.nbfcType === '0') {
      onPages = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28,
      ];
    }
    const bodyData = {
      documentId: response.id,
      redirectUrl,
      signers: [
        {
          identifier: data.phone,
          displayName: signer_name,
          signature: {
            height: 60,
            onPages,
            position: 'bottom-right',
            width: 180,
          },
        },
      ],
    };

    const createRequestUrl = SETU_CREATE_REQUEST_URL;
    const res = await this.api.post(createRequestUrl, bodyData, null, null, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
    });
    if (!res || res === k500Error) throw new Error();
    if (res?.status === 'sign_initiated') return res;
    return false;
  }
  //#endregion

  //#region check status of esign
  async checkStatusOfeSign(id) {
    const getRequestUrl = `${SETU_CREATE_REQUEST_URL}/${id}`;
    const result = await this.api.get(getRequestUrl, null, this.headers);
    if (!result || result === k500Error) throw new Error();
    if (result.status == 'sign_complete') {
      const probability = this.validation.getTextProbability(
        result?.signers[0].displayName,
        result?.signers[0].signatureDetails.aadhaarName,
      );
      let status = '0';
      let nameMissMatch = false;
      let signed_document_upload;
      if (probability < 40) nameMissMatch = true;
      else {
        const downloadUrl = `${getRequestUrl}/download`;
        const downloadData = await this.api.get(
          downloadUrl,
          null,
          this.headers,
        );
        const signed_url = downloadData.downloadUrl;
        if (signed_url) {
          const base64 = await this.fileService.urlToBuffer(signed_url);
          if (!base64 || base64 === k500Error) throw new Error();
          const url = await this.fileService.base64ToURL(base64);
          if (url === k500Error || url?.message) throw new Error();
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
    } else return false;
  }
  //#endregion
}
