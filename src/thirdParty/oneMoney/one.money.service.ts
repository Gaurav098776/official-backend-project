// Imports
import { Injectable } from '@nestjs/common';
import { APIService } from 'src/utils/api.service';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import {
  kOneMoneyHeaders,
  kOneMoneyProductId,
  nOneMoneyCallBackURL,
  nOneMoneyCheckStatus,
  nOneMoneyDecryptURL,
  nOneMoneyFIRequest,
  nOneMoneyGetallfiPDF,
  nOneMoneyGetallfidata,
  nOneMoneyGetalllatestfidata,
  nOneMoneyRedirectURL,
  nOneMoneyRequestConsent,
} from 'src/constants/network';
import { GlobalServices } from 'src/constants/globals';
import {
  kCapActive,
  kOneMoney,
  kSomthinfWentWrong,
} from 'src/constants/strings';
import { TypeService } from 'src/utils/type.service';
import { FileService } from 'src/utils/file.service';
import { kBanking } from 'src/constants/directories';
const fs = require('fs');

@Injectable()
export class OneMoneyService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly fileService: FileService,
  ) {}

  // Sending link to user
  async invitationLink(reqData) {
    try {
      // Params validation
      const phone = reqData.phone;
      if (!phone) return kParamMissing('phone');
      if (phone.length != 10)
        return k422ErrorMessage('Please enter valid phone number');
      const accNumber = reqData.accNumber;
      if (!accNumber) return kParamMissing('accNumber');
      const fipName = reqData.fipName;
      if (!fipName) return kParamMissing('fipName');

      // In case need to bypass global AA_SERVICE validation
      const isForcefully = reqData.isForcefully ?? false;
      if (GlobalServices.AA_SERVICE != kOneMoney && !isForcefully)
        return k422ErrorMessage(
          'One money service is not available at this moment',
        );

      // Consent request
      let url = nOneMoneyRequestConsent;
      // Auth headers
      const headers = kOneMoneyHeaders;
      // Body preparation
      const vua = `${phone}@onemoney`;
      let body: any = {
        partyIdentifierType: 'MOBILE',
        partyIdentifierValue: phone,
        productID: kOneMoneyProductId,
        accountID: accNumber,
        vua,
      };

      // API call
      let response = await this.api.post(url, body, null, null, { headers });
      if (response == k500Error) return kInternalError;
      if (response.status != 'success') return kInternalError;
      const consentHandle = response.data?.consent_handle;
      if (!consentHandle) return kInternalError;

      // Consent url request
      url = nOneMoneyRedirectURL;
      // Body preparation
      body = {
        consentHandle,
        userid: vua,
        redirectUrl: nOneMoneyCallBackURL,
        fipID: [fipName],
      };
      // API call
      response = await this.api.post(url, body, null, null, { headers });
      if (response == k500Error) return kInternalError;
      if (response.status != 'success') return kInternalError;
      const redirectionUrl = response.data.webRedirectionUrl;
      if (!redirectionUrl) return kInternalError;

      return {
        consentTxnId: consentHandle,
        url: redirectionUrl,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  // Checking the status of consent
  async checkStatus(reqData) {
    try {
      // Params validation
      const phone = reqData.phone;
      if (!phone) return kParamMissing('phone');
      if (phone.length != 10)
        return k422ErrorMessage('Please enter valid phone number');
      const accNumber = reqData.accNumber;
      if (!accNumber) return kParamMissing('accNumber');
      const consentTxnId = reqData.consentTxnId;
      if (!consentTxnId) return kParamMissing('consentTxnId');

      // Consent details request
      const url = nOneMoneyCheckStatus;
      // Auth headers
      const headers = kOneMoneyHeaders;
      // Body preparation
      const body = {
        partyIdentifierType: 'MOBILE',
        partyIdentifierValue: phone,
        productID: kOneMoneyProductId,
        accountID: accNumber,
      };

      // API call
      const response = await this.api.post(url, body, null, null, { headers });
      if (response == k500Error) return kInternalError;
      if (response.status != 'success') return kInternalError;
      const consentList = response.data;
      if (!consentList) return kInternalError;
      const targetData = consentList.find(
        (el) => el.consentHandle == consentTxnId,
      );
      if (
        !targetData ||
        targetData?.status != kCapActive ||
        !targetData?.consentID
      )
        return { isCompleted: false, ...targetData };

      return { isCompleted: true, ...targetData };
    } catch (error) {
      return kInternalError;
    }
  }

  //#region Decrypt URL
  async decryptURL(query) {
    try {
      if (!query?.ecres || !query?.resdate || !query?.fi)
        return kParamMissing();
      const url = nOneMoneyDecryptURL;
      // Auth headers
      const headers = kOneMoneyHeaders;
      const body = { webRedirectionURL: query };
      const result = await this.api.post(url, body, null, null, { headers });
      if (!result || result === k500Error) return kInternalError;
      if (result?.status === 'success') return result.data;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region fun Get all fi data
  async funGetallfidata(query) {
    try {
      const consentID = query?.consentID;
      if (!consentID) return kParamMissing('consentID');
      // Auth headers
      const headers = kOneMoneyHeaders;
      const body = { consentID };
      const url = nOneMoneyGetallfidata;
      const result = await this.api.post(url, body, null, null, { headers });
      if (!result || result === k500Error) return kInternalError;
      if (result?.status === 'success') return result.data;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region fun Request new fi data
  async funRequestNewfidata(query) {
    try {
      const consentId = query?.consentID;
      if (!consentId) return kParamMissing('consentID');
      // Auth headers
      const headers = kOneMoneyHeaders;
      const body = { consentId };
      const url = nOneMoneyFIRequest;
      const result = await this.api.post(url, body, null, null, { headers });
      if (!result || result === k500Error) return kInternalError;
      if (result?.status === 'success') return result.data;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region fun Get latest fi data
  async funGetLatestdata(query) {
    try {
      const consentID = query?.consentID;
      if (!consentID) return kParamMissing('consentID');
      // Auth headers
      const headers = kOneMoneyHeaders;
      const body = { consentID };
      const url = nOneMoneyGetalllatestfidata;
      const result = await this.api.post(url, body, null, null, { headers });
      if (!result || result === k500Error) return kInternalError;
      if (result?.status === 'success') return result.data;
      return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region fun Get latest fi data
  async fetchLatestData(query) {
    try {
      const consentID = query?.consentID;
      if (!consentID) return kParamMissing('consentID');
      const reqResult = await this.funRequestNewfidata(query);
      if (reqResult?.message) return reqResult;

      const fiResult = await this.funGetLatestdata(query);
      return fiResult;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region fun Get PDF FROM FI
  async funGetPDF(consentID, linkRefNumber) {
    try {
      if (!consentID) return kParamMissing('consentID');
      if (!linkRefNumber) return kParamMissing('linkRefNumber');
      // Auth headers
      const headers = kOneMoneyHeaders;
      const body = { consentID, linkRefNumber: [linkRefNumber] };
      const url = nOneMoneyGetallfiPDF;
      const result = await this.api.post(url, body, null, null, { headers });
      if (!result || result === k500Error) return kInternalError;
      if (result?.status === 'success' || result?.errorMsg)
        return k422ErrorMessage(kSomthinfWentWrong);
      try {
        const fileUrl = `./upload/${new Date().getTime()}.pdf`;
        fs.writeFileSync(fileUrl, result);
        await this.typeService.delay(1000);
        const url = await this.fileService.uploadFile(fileUrl, kBanking, 'pdf');
        if (url === k500Error) return kInternalError;
        return url;
      } catch (error) {}
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion
}
