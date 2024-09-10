// Imports
import { Workbook } from 'exceljs';
import { Injectable } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { UserRepository } from 'src/repositories/user.repository';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { nAppsFlyerEvent } from 'src/constants/network';
import { APIService } from 'src/utils/api.service';
import { k500Error } from 'src/constants/misc';
import { GoogleService } from '../google/google.service';

@Injectable()
export class AppsFlyerService {
  constructor(
    private readonly api: APIService,
    private readonly fileService: FileService,
    private readonly googleService: GoogleService,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
  ) {}

  async syncMissingData(reqData) {
    try {
      // Params validation
      const file = reqData.file;
      if (!file) return kParamMissing('file');
      const filePath = file.filename;
      if (!filePath) return kParamMissing('file');
      if (!filePath.endsWith('csv') && !filePath.endsWith('xlsx')) {
        await this.fileService.removeFile(filePath);
        return k422ErrorMessage('Kindly provide valid excel file');
      }

      // Get the required data from the excel report
      const extractedList: any = await this.extractDataForExcel(filePath);
      if (extractedList?.message) return extractedList;

      // Update missing user's data
      const updatedResponse: any = await this.updateList(extractedList);
      if (updatedResponse?.message) return updatedResponse;

      await this.fileService.removeFile(filePath);
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Get the required data from the excel report
  private async extractDataForExcel(filePath) {
    try {
      const workbook = new Workbook();
      const workSheet = await workbook.csv.readFile(filePath);

      const columns = {
        eventValue: 'F',
        mediaSource: 'O',
        appsFlyerId: 'AI',
      };

      const extractedList = [];
      workSheet.eachRow((row, index) => {
        try {
          if (index === 1) return;

          const eventValue = JSON.parse(
            (row.getCell(columns.eventValue).value ?? {}).toString(),
          );

          const { userId } = eventValue;
          const appsFlyerId = (
            row.getCell(columns.appsFlyerId).value ?? ''
          ).toString();
          const userDataObject = {
            userId,
            appsFlyerId,
          };

          extractedList.push(userDataObject);
        } catch (error) {}
      });

      return extractedList;
    } catch (error) {
      return kInternalError;
    }
  }

  // Update missing user's data
  private async updateList(extractedList) {
    try {
      for (let index = 0; index < extractedList.length; index++) {
        try {
          const data = extractedList[index];
          const id = data.userId;
          const appsFlyerId = data.appsFlyerId;

          if (!id || !appsFlyerId) continue;
          const updatedData = { appsFlyerId };
          const options = { where: { appsFlyerId: null, id } };
          await this.userRepo.updateRowWhereData(updatedData, options);
        } catch (error) {}
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async logDisbursementEvent(reqData) {
    try {
      await this.googleService.logEventInFirebaseForAppsFlyer({
        ...reqData,
        eventName: 'disbursement',
      });
      // Params validation
      const appsFlyerId = reqData.appsFlyerId;
      if (!appsFlyerId) return kParamMissing('appsFlyerId');
      const typeOfDevice = reqData.typeOfDevice;
      if (!typeOfDevice) return kParamMissing('typeOfDevice');
      const disbursementDate = reqData.disbursementDate;
      if (!disbursementDate) return kParamMissing('disbursementDate');
      const isIOS = typeOfDevice == '1';
      const androidId = process.env.APPS_FLYER_ANDROID_ID;
      const iosId = process.env.APPS_FLYER_IOS_ID;

      // URL
      const url = nAppsFlyerEvent + (isIOS ? iosId : androidId);

      // Auth
      const headers = { authentication: process.env.APPS_FLYER_KEY };

      // Body preparation
      const body = {
        appsflyer_id: appsFlyerId,
        eventName: 'Disbursement',
        eventValue: this.typeService.jsonToReadableDate(
          disbursementDate.toJSON(),
        ),
        eventTime: new Date(disbursementDate)
          .toISOString()
          .replace('T', ' ')
          .replace('Z', ''),
      };

      // API call
      const response = await this.api.post(url, body, headers);
      if (!response || response == k500Error) return kInternalError;
      if (response != 'ok') return kInternalError;

      return {};
    } catch (error) {
      return kInternalError;
    }
  }
}
