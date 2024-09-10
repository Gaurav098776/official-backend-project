// Imports
import { k500Error } from 'src/constants/misc';
import { EnvConfig } from 'src/configs/env.config';
import { CryptService } from 'src/utils/crypt.service';
import { k403Forbidden } from 'src/constants/responses';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Latest_Version } from 'src/constants/globals';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly cryptService: CryptService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const reqId: any = (req.headers ?? {}).reqid;
      // if (reqId) {
      //   const rawId = this.cryptService.decryptRequestId(reqId);
      //   const currentTime = new Date().getTime();
      //   if (currentTime > rawId) {
      //     try {
      //       console.log(
      //         'k403Forbidden3',
      //         req.baseUrl,
      //         new Date(),
      //         req.headers['adminid'],
      //         req.headers['access-token'],
      //         currentTime - rawId,
      //       );
      //     } catch (error) {
      //       console.log({ error });
      //     }
      //     return this.sendResponse(res, k403Forbidden, 403);
      //   }
      // }
      let targetData = req.body?.data ?? req.query?.data;
      const str = typeof targetData == 'string' ? targetData : '';

      const headers = req.headers ?? {};
      const isLSPReq = headers?.appid || headers?.secretkey;
      const appType = +headers?.apptype;

      if (
        !isLSPReq &&
        targetData &&
        (str.includes('=') || str.includes('U2F'))
      ) {
        targetData = targetData.replace(/ /g, '+');
        // Checks -> Default encryption
        const reqUrl: string = req.baseUrl.toLowerCase().trim();
        let defaultKey;
        if (reqUrl == `/${Latest_Version}/misc/getconfigs`)
          defaultKey =
            appType == 0
              ? EnvConfig.secrets.defaultAppEncKeyLenditt
              : EnvConfig.secrets.defaultAppEncKeyNbfc1;

        // if (!reqId && !defaultKey && !reqUrl.includes('metrics/insert')) {
        //   try {
        //     console.log(
        //       'k403Forbidden4',
        //       req.baseUrl,
        //       new Date(),
        //       req.headers['adminid'],
        //       req.headers['access-token'],
        //       str,
        //     );
        //   } catch (error) {
        //     console.log({ error });
        //   }
        //   return this.sendResponse(res, k403Forbidden, 403);
        // }
        const decryptedData = this.cryptService.decryptRequest(
          targetData,
          defaultKey,
        );
        if (decryptedData === k500Error) {
          console.log(
            'k403Forbidden5',
            req.baseUrl,
            new Date(),
            req.headers['adminid'],
            req.headers['access-token'],
          );
          return this.sendResponse(res, k403Forbidden, 403);
        }

        if (req.body?.data) req.body = decryptedData;
        if (req.query?.data) req.query = decryptedData;
      } else {
        if (req?.body) req.body = req?.body?.data ?? req?.body;
        if (req?.query) req.query = req?.query;
      }

      // Decrypt request
      if (isLSPReq && req.query?.encData) {
        const decryptedRequest = this.cryptService.decryptLspRequest(
          req.query?.encData,
        );
        if (!decryptedRequest?.decrypted) {
          console.log(
            'k403Forbidden6',
            req.baseUrl,
            new Date(),
            req.headers['adminid'],
            req.headers['access-token'],
          );
          return this.sendResponse(res, k403Forbidden, 403);
        }
        req.query = decryptedRequest.data;
      }
      if (isLSPReq && req.body?.encData) {
        const decryptedRequest = this.cryptService.decryptLspRequest(
          req.body?.encData,
        );
        if (!decryptedRequest?.decrypted) {
          console.log(
            'k403Forbidden7',
            req.baseUrl,
            new Date(),
            req.headers['adminid'],
            req.headers['access-token'],
          );
          return this.sendResponse(res, k403Forbidden, 403);
        }
        req.body = decryptedRequest.data;
      }
    } catch (error) {
      console.log(
        'k403Forbidden8',
        req.baseUrl,
        new Date(),
        req.headers['adminid'],
        req.headers['access-token'],
      );
      return this.sendResponse(res, k403Forbidden, 403);
    }
    next();
  }

  private sendResponse(response, data, statusCode) {
    response.statusCode = statusCode;
    return response.json(data);
  }
}
