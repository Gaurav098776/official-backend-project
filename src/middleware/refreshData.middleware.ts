// Imports
import * as env from 'dotenv';
import { TypeService } from 'src/utils/type.service';
import { RedisService } from 'src/redis/redis.service';
import { kSuccessData } from 'src/constants/responses';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Latest_Version, REFRESH_DIFF_IN_MINU } from 'src/constants/globals';

env.config();

@Injectable()
export class RefreshDataMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly typeService: TypeService,
  ) {}

  // These endpoints should not contain any trails rather than endpoint itself
  private strictKeyEndPoints = [
    `/${Latest_Version}/banking/list`,
    `/${Latest_Version}/misc/getConfigs`,
  ];
  // These endpoints should not contain any trails rather than endpoint itself and typeOfDevice
  private platformEndPoints = [`/${Latest_Version}/banking/list`];
  // There endpoints are called from schedular

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      let timeInMin = REFRESH_DIFF_IN_MINU;
      const query = req?.query;
      const endpoint = req.originalUrl?.split('?')[0];
      let url: any = req.originalUrl;

      if (query) {
        let queryString = '';
        for (const key in query) {
          if (key == 'isRefresh') continue;
          queryString += `${key}=${query[key]}&`;
        }
        url = url.split('?')[0];
        url += queryString;
      }
      url = url.split('/');
      const apis60Mins = [
        `/${Latest_Version}/user/getcompanycontactinfo`,
        `/${Latest_Version}/misc/getsettingsdata`,
        `/${Latest_Version}/banking/list`,
        `/${Latest_Version}/misc/getConfigs`,
        `/${Latest_Version}/misc/userLoanDeclineReasons`,
        `/${Latest_Version}/user/checkUserPermissionsList`,
        '/admin/transaction/getlastautodebitresponse',
        '/admin/user/getinstalledapps',
        '/admin/cibilscore/getcibiltriggerdata',
        '/admin/collectionDashboard/totalCollection',
        '/admin/collectionDashboard/collectionChartData',
        '/admin/collectionDashboard/collectionGoalData',
        '/admin/collectionDashboard/ptpData',
        '/admin/collectionDashboard/recentCrmActivity',
        '/admin/collectionDashboard/crmActivity',
        '/admin/collectionDashboard/bucketWiseCollection',
        '/admin/collectionDashboard/crmStatistics',
      ];

      // Key generation
      const mode = process.env.MODE;
      const PORT = process.env.PORT;
      let key = PORT + url[url.length - 1];
      if (this.strictKeyEndPoints.includes(endpoint)) {
        // Based on platform
        if (this.platformEndPoints.includes(endpoint)) {
          let query = req.query ?? {};
          let body = req.body ?? {};
          const reqData = Object.keys(body).length != 0 ? body : query;
          if (reqData?.typeOfDevice)
            key = 'PLATFORM_' + reqData?.typeOfDevice + '_' + endpoint;
          else key = endpoint;
        } else key = endpoint;
      }
      if (req.originalUrl.startsWith('/admin/report/getRecoveryRate'))
        timeInMin = 60;
      else if (req.originalUrl.startsWith('/admin/emi/statusInsights'))
        timeInMin = 60;
      else if (apis60Mins.some((api) => req.originalUrl.startsWith(api)))
        timeInMin = 60;
      if (mode == 'DEV') next();
      else {
        try {
          const isRefresh = req?.query?.isRefresh ?? false;
          const tempData = await this.redisService.hGetAll(key);
          if (tempData) {
            const lastUpdated = tempData?.time;
            if (lastUpdated) {
              const diff = this.typeService.dateDifference(
                new Date(lastUpdated),
                new Date(),
                'Minutes',
              );
              if (diff <= timeInMin && isRefresh != 'true') {
                const data = JSON.parse(tempData?.response);
                return res.json({ ...kSuccessData, data, lastUpdated });
              }
            }
            await this.prepareResponse(res, key, timeInMin);
          }
        } catch (error) {}
        next();
      }
    } catch (error) {
      next();
    }
  }

  async prepareResponse(res, key, diffInMinutes) {
    try {
      const rawResponse = res.write;
      const rawResponseEnd = res.end;
      const chunkBuffers = [];
      res.write = (...chunks) => {
        const resArgs = [];
        for (let i = 0; i < chunks.length; i++) {
          resArgs[i] = chunks[i];
          if (!resArgs[i]) {
            res.once('drain', res.write);
            i--;
          }
        }
        if (resArgs[0]) chunkBuffers.push(Buffer.from(resArgs[0]));

        return rawResponse.apply(res, resArgs);
      };
      res.end = async (...chunk) => {
        const resArgs = [];
        for (let i = 0; i < chunk.length; i++) {
          resArgs[i] = chunk[i];
        }
        if (resArgs[0]) chunkBuffers.push(Buffer.from(resArgs[0]));
        const responseBody = Buffer.concat(chunkBuffers).toString('utf8');
        const data = responseBody ?? '';
        if (data && typeof data == 'string') {
          const finalResponse = JSON.parse(data);
          await this.updateAndInsertData(finalResponse, key, diffInMinutes);
          rawResponseEnd.apply(res, resArgs);
        }
      };
    } catch (error) {}
  }

  async updateAndInsertData(finalResponse, key, diffInMinutes) {
    try {
      if (finalResponse?.valid === true) {
        const response = JSON.stringify(finalResponse?.data ?? '');
        const time = new Date().toJSON();
        await this.redisService.hSet(
          key,
          {
            response,
            time,
          },
          diffInMinutes * 60,
        );
      }
    } catch (error) {}
  }
}
