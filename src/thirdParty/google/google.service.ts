// Imports
import { Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import { google } from 'googleapis';
import { Op } from 'sequelize';
import { GMAPS_KEY, SERVER_MODE } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  funGenerateOAuthToken,
  GET_OAUTH_INFO,
  GMAIL_GET_MAILS,
  nGetPlaceData,
  nSearchPlaces,
} from 'src/constants/network';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kNoDataFound,
  kVerificationsMail,
  kLegalTeamMail,
} from 'src/constants/strings';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
const OAuth2 = google.auth.OAuth2;

const tokenData: any = {
  [kLegalTeamMail]: {},
  [kVerificationsMail]: {},
};
let firebaseDB;

@Injectable()
export class GoogleService {
  constructor(
    private readonly api: APIService,
    private readonly companyRepo: CompanyRepository,
    private readonly typeService: TypeService,
  ) {
    if (process.env.MODE == 'PROD' || process.env.MODE == 'UAT')
      firebaseDB = admin.firestore();
  }

  async getRefreshToken(data: any) {
    try {
      const oauth2Client = new OAuth2(
        data.clientId,
        data.clientSecret,
        'http://localhost:3000/',
      );
      if (!data.code) {
        const authURL = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: data.scopes,
        });
        return { authURL };
      } else {
        const { tokens }: any = await oauth2Client.getToken(data.code);
        return tokens;
      }
    } catch (error) {}
  }

  async searchOrganisation(reqData: any) {
    try {
      const searchText = reqData.searchText;
      if (!searchText) return kParamMissing('searchText');
      // In case need details based on placeId of particular place
      const needDetails = reqData.needDetails?.toString() == 'true';

      let response: any = await this.getCompanyDataLocally(
        searchText.toUpperCase(),
      );
      if (response) return response;

      response = await this.getCompanyDataFromAPI(searchText);
      const predictions = response.predictions ?? [];
      for (let index = 0; index < predictions.length; index++) {
        try {
          const predictionData = predictions[index];
          const placeId = predictionData.place_id;
          if (!placeId) continue;

          if (needDetails) {
            const placeDetails = await this.searchPlace(placeId);
            if (placeDetails.message) continue;
            await this.syncCompanyDetails(placeDetails);
            return placeDetails;
          } else return predictionData;
        } catch (error) {}
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async getCompanyDataFromAPI(companyName) {
    try {
      const url = nSearchPlaces;
      const params = {
        input: companyName,
        components: 'country:in',
        key: GMAPS_KEY,
      };
      const response = await this.api.get(url, params);
      if (response == k500Error) return kInternalError;

      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  // the error response is not returned as user experience getting affected
  private async getCompanyDataLocally(companyName) {
    try {
      const attributes = ['id', 'response'];
      const options = {
        where: { companyName, forMigration: { [Op.ne]: true } },
      };

      const companyData = await this.companyRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!companyData || companyData == k500Error) return;

      return JSON.parse(companyData.response);
    } catch (error) {
      return;
    }
  }

  // store data in db to save the api cose for duplicate api requests
  private async syncCompanyDetails(companyData) {
    try {
      const creationData = {
        companyName: companyData.name?.toUpperCase(),
        response: JSON.stringify(companyData),
        source: 'GOOGLE',
      };

      // Check existing data
      const attributes = ['id'];
      const options = {
        where: {
          companyName: creationData.companyName,
        },
      };
      const existingData = await this.companyRepo.getRowWhereData(
        attributes,
        options,
      );
      if (existingData && existingData != k500Error) {
        const updateResult = await this.companyRepo.updateRowData(
          creationData,
          existingData.id,
        );
        if (updateResult == k500Error) return kInternalError;
        return {};
      } else {
        const createdData = await this.companyRepo.createRowData(creationData);
        if (createdData == k500Error) return kInternalError;
        return createdData;
      }
    } catch (error) {
      return kInternalError;
    }
  }

  private async searchPlace(placeId) {
    try {
      const url = nGetPlaceData;
      const params = {
        placeid: placeId,
        key: GMAPS_KEY,
      };
      const response = await this.api.get(url, params);
      if (response == k500Error) return kInternalError;

      const finalizeData = response.result ?? {};
      if (finalizeData.reviews) delete finalizeData.reviews;
      if (finalizeData.photos) delete finalizeData.photos;
      if (finalizeData.current_opening_hours)
        delete finalizeData.current_opening_hours;
      if (finalizeData.opening_hours) delete finalizeData.opening_hours;
      return response.result ?? {};
    } catch (error) {
      return kInternalError;
    }
  }

  async checkParticularSender(reqData) {
    try {
      const email = reqData.email?.toLowerCase();
      if (!email) return kParamMissing('email');
      const appType = reqData.appType;
      const from = `from:${email}`;
      const params = {
        email: kVerificationsMail,
        q: from,
      };
      let data: any = await this.getEmailStatus(params);
      if (data.message) return [];
      const emailList = data.emailList ?? [];
      if (emailList.length == 0) return [];
      return emailList.filter((el) => {
        const difference = this.typeService.dateDifference(
          el.mailDate,
          new Date(),
        );
        return difference <= 1;
      });
    } catch (error) {
      return kInternalError;
    }
  }

  private async getEmailStatus(queryParams: any = {}) {
    try {
      const email = queryParams.email;
      const accessToken = await this.getAccessToken(email);
      if (accessToken == k500Error) return kInternalError;
      const url = GMAIL_GET_MAILS;
      const headers = this.getHeaders(email);
      delete queryParams.email;

      const msgResponse = await this.api.get(url, queryParams, headers);
      if (msgResponse == k500Error) return kInternalError;

      const emailList: any[] = [];
      for (let index = 0; index < msgResponse.messages.length; index++) {
        const message = msgResponse.messages[index];
        const msgId = message.id;
        const msgURL = url + msgId;
        const response = await this.api.get(msgURL, null, headers);
        if (response == k500Error) continue;
        const data = this.getGmailData(response);
        if (data == k500Error) continue;
        emailList.push(data);
      }
      return { emailList, count: msgResponse.resultSizeEstimate ?? 0 };
    } catch (error) {
      return kInternalError;
    }
  }

  private async getAccessToken(email: string) {
    try {
      const isNeedToGenerate = await this.isNeedNewToken(email);
      if (isNeedToGenerate) {
        const result = await this.generateAccessToken(email);
        if (result == k500Error) return k500Error;
      }
    } catch (error) {
      return k500Error;
    }
  }

  private async isNeedNewToken(email): Promise<boolean> {
    try {
      const gmailAccessToken = tokenData[email].accessToken;
      const lastSyncTime = tokenData[email].lastSyncTime;
      if (!gmailAccessToken || !lastSyncTime) return true;

      const currentDate = new Date();
      const differenceInMillies = this.typeService.dateDifference(
        currentDate,
        lastSyncTime,
        'Milliseconds',
      );
      if (differenceInMillies < 5 * 60 * 1000) return false;

      const url = GET_OAUTH_INFO + gmailAccessToken;
      const response = await this.api.get(url);
      if (!response) return true;
      else if (response == k500Error) return true;
      const expireTime = response.expires_in;
      if (!expireTime) return true;
      if (expireTime >= 500) return false;

      return true;
    } catch (error) {
      return true;
    }
  }

  private getHeaders(email: string) {
    try {
      return {
        Authorization: tokenData[email].accessToken,
      };
    } catch (error) {}
  }

  private async generateAccessToken(email: string) {
    try {
      const url = funGenerateOAuthToken(email);
      const response = await this.api.post(url);
      if (!response) return;
      else if (response == k500Error) return k500Error;
      tokenData[email]['accessToken'] = 'Bearer ' + response.access_token;
      tokenData[email]['lastSyncTime'] = new Date();
    } catch (error) {
      return tokenData[email].accessToken;
    }
  }

  private getGmailData(gmailData) {
    try {
      const data: any = {
        mailId: gmailData.id,
        historyId: gmailData.historyId,
        snippet: gmailData.snippet,
        mailDate: new Date(+gmailData.internalDate),
      };

      //Get snippet domain
      if (data.snippet) {
        const possibleDomains = data.snippet
          .split(' ')
          .filter((el) => el.includes('@') && el.includes('.'));
        if (possibleDomains.length > 0) data.snippetDomain = possibleDomains[0];
        if (data.snippetDomain && data.snippetDomain.endsWith('.')) {
          data.snippetDomain = data.snippetDomain.substring(
            0,
            data.snippetDomain.length - 1,
          );
        }
        if (data.snippetDomain?.includes('@')) {
          const atIndex = data.snippetDomain.indexOf('@') + 1;
          data.snippetDomain = data.snippetDomain.substring(
            atIndex,
            data.snippetDomain.length,
          );
        }
      }

      //Get sender info
      const headers = gmailData.payload.headers;
      const senderData = headers.find((el) => el.name == 'From').value;
      const index01 = senderData.indexOf('<') + 1;
      const index02 = senderData.indexOf('>');
      const senderId = senderData.substring(index01, index02);
      data.senderId = senderId.toLowerCase();

      return data;
    } catch (error) {
      return k500Error;
    }
  }

  async addLogsToFirebase(reqData) {
    try {
      let body = reqData.body;
      if (!body) return kParamMissing('body');
      body = JSON.stringify(body);
      const path = reqData.path;
      if (!path) return kParamMissing('path');

      const data = { body, serverMode: SERVER_MODE, dateTime: new Date() };
      await firebaseDB.collection(path).doc().set(data);
    } catch (error) {
      return kInternalError;
    }
  }

  async appsFlyerDetails(reqData) {
    try {
      // Params validation
      const deviceId = reqData.deviceId;
      if (!deviceId) return kParamMissing('deviceId');

      const docData = (
        await firebaseDB.collection('appFlyersLogs').doc(deviceId).get()
      ).data();
      if (!docData) return k422ErrorMessage(kNoDataFound);
      if (!docData.appsFlyerId)
        return k422ErrorMessage('Field appsFlyerId is missing');
      return docData.appsFlyerId;
    } catch (error) {
      return kInternalError;
    }
  }

  async logEventInFirebaseForAppsFlyer(reqData) {
    try {
      const userId = reqData.userId ?? reqData.id;
      const deviceId = reqData.deviceId ?? reqData.recentDeviceId;
      const eventData = {
        event: reqData.eventName ?? 'Unknown',
        date: new Date().toISOString(),
        deviceId: deviceId,
        userId: userId,
        udId: [deviceId, userId],
        apfId: reqData.appsFlyerId,
        extra: { backendReq: true },
      };
      await firebaseDB.collection('appsFlyersEvents').doc().set(eventData);
    } catch (error) {}
  }

  async validateSignInToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.email_verified === true) return true;
      else return false;
    } catch (error) {
      return false;
    }
  }
}
