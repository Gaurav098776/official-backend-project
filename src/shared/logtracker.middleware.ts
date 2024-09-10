// Imports
import { k500Error } from 'src/constants/misc';
import { kUserLogs } from 'src/constants/objects';
import { CryptService } from 'src/utils/crypt.service';
import { Request, Response, NextFunction } from 'express';
import { Inject, Injectable, NestMiddleware, forwardRef } from '@nestjs/common';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { LogsSharedService } from './logs.service';
import { UserRepository } from 'src/repositories/user.repository';
import { APIService } from 'src/utils/api.service';
import { nIpCheck, nIpCheckerKey } from 'src/constants/network';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { EnvConfig } from 'src/configs/env.config';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { UserLogTracker } from 'src/entities/userLogTracker.entity';

const logStages = ['Bank statement submitted', 'Loan purpose selected'];

@Injectable()
export class UserSharedLogTrackerMiddleware implements NestMiddleware {
  constructor(
    private readonly userLogTrackerRepo: UserLogTrackerRepository,
    private readonly deviceInfoRepo: DeviceInfoInstallAppRepository,
    private readonly userRepo: UserRepository,
    @Inject(forwardRef(() => LogsSharedService))
    private readonly logService: LogsSharedService,
    private readonly cryptService: CryptService,
    private readonly apiService: APIService,
    private readonly ipMasterRepo: IpMasterRepository,
    private readonly repoManager: RepositoryManager,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      let reqUrl = req.originalUrl;
      try {
        if (reqUrl.includes('?')) reqUrl = reqUrl.split('?')[0];
      } catch (error) {}
      const stage = kUserLogs[reqUrl];

      if (stage) {
        let canLog = false;
        let userId: any = req.headers.secret_key;
        const body = req.body;
        let loanId;
        if (!userId && body) userId = body.userId;

        const userData = await this.getUserData(userId);
        if (userData?.message) return res.json(kInternalError);

        if (body) loanId = body.loanId ?? userData?.masterData?.loanId;
        let ip: any =
          req.headers['x-forwarded-for'] ||
          req.socket.remoteAddress ||
          req.headers?.lspip ||
          null;
        if (req.headers.lspip) {
          try {
            if (EnvConfig.whiteListedIPs.includes(ip)) {
              if (typeof req.headers.lspip == 'string') {
                ip = req.headers.lspip?.split(',')[0]?.trim();
              } else ip = req.headers.lspip;
            }
          } catch (error) {}
        }
        if (ip == '::1') ip = '144.24.112.239';
        if (typeof ip == 'string') ip = ip.replace('::ffff:', '');

        let ipLocation;
        let ipCountry;

        if (ip) {
          const checkIpExist: any = await this.isIpExistInMaster(ip);
          if (checkIpExist?.message) return checkIpExist;
          if (checkIpExist && checkIpExist.status === 1) {
            let parseRes = checkIpExist?.response
              ? JSON.parse(checkIpExist?.response)
              : {};
            ipLocation = parseRes?.city;
            ipCountry = parseRes?.country?.toLowerCase();
          } else {
            const response = await this.apiService.get(
              nIpCheck + ip + '?key=' + nIpCheckerKey,
              { security: 1 },
              {},
              { timeout: 5000 },
            );
            let success = response?.success;
            let responseData;
            if (response === k500Error) {
              success = false;
              responseData = JSON.stringify({ response });
            } else {
              responseData = JSON.stringify(response);
            }
            ipLocation = response?.city;
            ipCountry = response?.country?.toLowerCase();
            let securityIssue = false;
            if (response?.security) {
              securityIssue = Object.values(response?.security).some(
                (value) => value === true,
              );
            }
            const updateData = {
              status: success ? 1 : 0,
              country: ipCountry,
              response: responseData,
              isSecurityIssue: securityIssue ? 1 : 0,
            };
            if (checkIpExist && checkIpExist.status === 0) {
              await this.ipMasterRepo.updateWhereData(updateData, {
                ip: checkIpExist.ip,
              });
            } else {
              const add = await this.ipMasterRepo.create({ ...updateData, ip });
            }
          }
        }
        const allPlatformAPIs = ['Select loan amount', 'Accept loan'];
        if (allPlatformAPIs.includes(stage)) {
          if (body) {
            const adminId = body.adminId ?? -1;
            if (adminId == -1) canLog = true;
          }
        } else canLog = true;

        if (userId && ip && canLog) {
          if (userId.includes('=='))
            userId = await this.cryptService.decryptText(userId);

          let deviceId = await this.getDeviceId(userId);
          let brand: any = '';
          let model = '';
          if (deviceId?.deviceInfo == null) {
            deviceId.webDeviceInfo = deviceId?.webDeviceInfo
              ? JSON.parse(deviceId?.webDeviceInfo)
              : {};
            brand = deviceId?.webDeviceInfo.user_agent ?? '-';
            model = '';
          } else {
            deviceId.deviceInfo = deviceId?.deviceInfo
              ? JSON.parse(deviceId?.deviceInfo)
              : {};
            brand =
              deviceId?.deviceInfo?.brand ?? deviceId?.deviceInfo?.name ?? '';
            model = deviceId?.deviceInfo?.model ?? '-';
          }
          if (!brand) {
            brand = '-';
          }
          if (model === '-') {
            model = '';
          }
          const city = userData?.city ?? '-';
          const device = [brand, model]
            .filter((part) => part !== '-')
            .join(' ');
          const otherDetails = {
            device: device || '-',
          };

          const passData = {
            userId,
            stage,
            loanId,
            ip,
            deviceId: '-',
            city,
            ipLocation,
            ipCountry,
            otherDetails,
          };
          if (stage == 'Mobile number verified')
            this.addPermissionGrantedLog(passData);
          else if (logStages.includes(stage)) this.trackUserLog(res, passData);
          else await this.userLogTrackerRepo.create(passData);
        }
      }
    } catch (error) {}
    next();
  }

  async getUserData(userId: string) {
    try {
      const masterInclude = {
        model: MasterEntity,
        attributes: ['loanId'],
      };
      const attributes = ['city'];
      const options = { where: { id: userId }, include: masterInclude };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData === k500Error) return kInternalError;
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async addPermissionGrantedLog(passData) {
    try {
      const userId = passData.userId;

      const queryString = `SELECT "id" FROM "UserLogTrackers" AS "UserLogTracker" WHERE "UserLogTracker"."stage" = 'User accepted permissions' AND "UserLogTracker"."userId" = '${userId}' LIMIT 1`;
      const isDataExists = await this.repoManager.injectRawQuery(
        UserLogTracker,
        queryString,
        { source: 'REPLICA' },
      );

      if (isDataExists.length > 0 || isDataExists == k500Error) return;
      const newData = { ...passData };
      newData.stage = 'User accepted permissions';
      await this.userLogTrackerRepo.create(newData);
      await this.userLogTrackerRepo.create(passData);
    } catch (error) {}
  }

  trackUserLog = (res: Response, passData: any) => {
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

    res.end = (...chunk) => {
      const resArgs = [];
      for (let i = 0; i < chunk.length; i++) resArgs[i] = chunk[i];

      if (resArgs[0]) chunkBuffers.push(Buffer.from(resArgs[0]));
      const body = Buffer.concat(chunkBuffers).toString('utf8');
      const responseLog = {
        response: {
          statusCode: res.statusCode,
          body: JSON.parse(body) || body || {},
          headers: res.getHeaders(),
        },
      };
      rawResponseEnd.apply(res, resArgs);
      try {
        const response = JSON.parse(body) || body || {};
        const loanId =
          response?.data?.loanId ?? response?.data?.userData?.loanId;
        if (!passData?.loanId && loanId) passData.loanId = loanId;
        this.logService.trackUserLog(passData);
      } catch (error) {}
      return responseLog as unknown as Response;
    };
  };

  private async getDeviceId(userId) {
    const options = {
      where: { userId },
      order: [['updatedAt', 'DESC']],
    };
    const deviceData = await this.deviceInfoRepo.findOne(
      ['deviceId', 'deviceInfo', 'webDeviceInfo'],
      options,
    );
    if (!deviceData) return k422ErrorMessage('No data found');
    return deviceData;
  }

  async isIpExistInMaster(ip) {
    try {
      const attributes = ['ip', 'status', 'response'];
      const options = { where: { ip } };
      const ipMasterData = await this.ipMasterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (ipMasterData === k500Error) return kInternalError;
      return ipMasterData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
