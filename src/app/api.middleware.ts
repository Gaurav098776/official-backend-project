// Imports
import * as fs from 'fs';
import { JwtService } from '@nestjs/jwt';
import { EnvConfig } from 'src/configs/env.config';
import { k403Forbidden, kInternalError } from 'src/constants/responses';
import { CryptService } from 'src/utils/crypt.service';
import { Request, Response, NextFunction } from 'express';
import { getUserId } from 'src/authentication/auth.guard';
import { getClientIp } from '@supercharge/request-ip/dist';
import { Injectable, NestMiddleware, OnModuleInit } from '@nestjs/common';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { CRYPT_PATH } from 'src/constants/paths';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { Latest_Version } from 'src/constants/globals';
import * as rawbody from 'raw-body';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { SlackService } from 'src/thirdParty/slack/slack.service';
import { regUUID } from 'src/constants/validation';
import { staticConfig } from 'src/constants/static.config';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { APILogger } from 'src/entities/api_logger.schema';
import { k500Error } from 'src/constants/misc';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';

@Injectable()
export class ApiMiddleware implements NestMiddleware, OnModuleInit {
  private authPublicKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly cryptService: CryptService,
    // Database
    private readonly repo: RepositoryManager,
    // Shared services
    private readonly sharedMetrics: MetricsSharedService,
    private readonly sharedService: CommonSharedService,
    // Third party
    private readonly slack: SlackService,
    // Utils services
    private readonly iciciThirdParty: ICICIThirdParty,
  ) {}

  async onModuleInit() {
    // Loading the public key from a file
    if (!this.authPublicKey) {
      this.authPublicKey = await fs.readFileSync(
        CRYPT_PATH.authPublicKey,
        'utf-8',
      );
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const reqUrl: string = req.baseUrl.toLowerCase().trim();
      let adminAccessCheck: any;
      if (reqUrl == '/icici/callback') {
        if (req.readable) {
          const raw = await rawbody(req);
          const text = raw.toString().trim();
          req.body = text;
          req.body = await this.iciciThirdParty.decryptICICIResponse(req.body);
        }
      }
      const isCachedAPI = staticConfig.refreshMiddlewareEndpoints.find((el) =>
        reqUrl.includes(el.path?.toLowerCase()),
      );

      if (reqUrl.startsWith('/admin/')) {
        const adminId = req.headers['adminid'];
        adminAccessCheck = await this.checkAdminSecurity(req, reqUrl);
        if (adminId) {
          await this.sharedService.updateActivityTime(adminId);
        }
        await this.createAdminActivityLogs(req, reqUrl);
      }

      await this.manageMetrics(req);

      await this.createLogs(req);

      if (adminAccessCheck || adminAccessCheck === false) {
        if (!adminAccessCheck || !adminAccessCheck?.roleId) {
          console.log(
            'k403Forbidden1',
            req.baseUrl,
            new Date(),
            req.headers['adminid'],
            req.headers['access-token'],
          );
          return res.json(k403Forbidden);
        }
      }

      const isValidReq = await this.validateAPIRequest(req);
      if (!isValidReq) {
        console.log(
          'k403Forbidden2',
          req.baseUrl,
          new Date(),
          req.headers['adminid'],
          req.headers['access-token'],
        );
        return res.json(k403Forbidden);
      }

      // Alert
      if (!isCachedAPI) {
        let body: any = {};
        const chunks = [];
        const oldEnd = res.end;
        res.end = (chunk) => {
          if (chunk) chunks.push(Buffer.from(chunk));
          body = Buffer.concat(chunks).toString('utf8');
          return oldEnd.call(res, body);
        };
        const paramsDetails = req.query ?? {};
        let bodyDetails = req.body ?? {};
        res.on('finish', async () => {
          try {
            if (typeof body == 'string') body = JSON.parse(body);
            if (body.valid === false) {
              this.slack.sendMsg({
                text: `API Request error -> ${reqUrl}`,
                threads: [
                  JSON.stringify(body),
                  `Params details -> ${JSON.stringify(paramsDetails)}`,
                  `Body details -> ${JSON.stringify(bodyDetails)}`,
                ],
              });
            }
          } catch (error) {}
        });
      }

      // Currently works just for Flutter web
      this.encryptResponseBody(req, res);
    } catch (error) {}

    next();
  }

  private async checkAdminSecurity(req, reqUrl) {
    const excludedAPIList = [
      '/admin/admin/findallrole',
      '/admin/admin/login',
      '/admin/admin/adminpassword',
      '/admin/metrics/insertlog',
      '/admin/banking/aabanks',
      '/admin/loan/getloanemirepaymentdetails',
      '/admin/defaulter/checkuserpromoeligibility',
      '/admin/defaulter/getuserwaiveoffeligibility',
      '/admin/notification/emailstatusupdate',
      '/admin/transaction/createpaymentorder',
      '/admin/transaction/checkpaymentorder',
      '/admin/loan/getdatafromuid',
      '/admin/user/sendotpfordeleteaccount',
      '/admin/user/verifyotpfordeleteaccount',
      '/admin/loan/getloanemirepaymentdetails',
      '/admin/defaulter/checkuserpromoeligibility',
      '/admin/notification/webformsendotp',
      '/admin/notification/submitwebform',
    ];
    const token = req.headers['access-token'];
    const secretKey = req.headers['qa-test-key'];
    const adminId = req.headers['adminid'];
    let data: any;
    if (token) data = await this.sharedService.validatedToken(token);
    else if (secretKey)
      data =
        secretKey != EnvConfig.secrets.qaTestKey ? false : { roleId: true };
    else if (!token && !secretKey && !excludedAPIList.includes(reqUrl)) {
      data = false;
    }
    return data;
  }

  private async createAdminActivityLogs(req, reqUrl) {
    try {
      let ip: any = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      if (ip == '::1') ip = '144.24.112.239';
      if (typeof ip == 'string') ip = ip.replace('::ffff:', '');

      const urls = {
        '/admin/admin/login': 'Login',
        '/admin/admin/logout': 'Logout',
        '/admin/admin/adminpassword': 'Password Change',
        '/admin/legal/sendlegalmail': 'Legal Mail',
        '/admin/legal/assingedtocollection': 'Assign collection',
        '/admin/legal/changeadvocate': 'Change Advocate',
        '/admin/legal/movetocasetobefile': 'Case File',
        '/admin/legal/movetoinprogress': 'Move In-Progress',
        '/admin/legal/fillinginprogress': 'Filling In-Progress',
        '/admin/legal/uploadsummons': 'Summons',
        '/admin/legal/uploadwarrent': 'Warrent',
        '/admin/legal/casedisposal': 'Case Disposal',
        '/admin/legal/casedisposalviafile': 'File Case Disposal',
        '/admin/legal/tracklegalconsignmentdata': 'Legal Consignment',
        '/admin/legal/updatelegalsentstatus': 'Legal Status',
        '/admin/employment/changeemployementstatus': 'Employment',
        '/admin/banking/changenetbankingstatus': 'Banking',
        '/admin/user/changeselfiestatus': 'Selfie',
        '/admin/kyc/changekycstatus': 'KYC',
        '/admin/eligibility/finalapproval': 'FV',
        '/admin/mandate/generatelink': 'Emandate',
        '/admin/esign/inviteforesign': 'Esign',
      };
      if (!Object.keys(urls).includes(reqUrl)) return {};

      const newData = req.method === 'GET' ? req.query : req.body;
      let adminId = newData?.adminId || req.headers['adminid'];

      if (reqUrl.includes('/admin/admin/login')) {
        const adminData = await this.sharedService.getAdminData(newData.email);
        adminId = adminData.id;
      }
      //check status whether accpeted or decline for verification tab
      const status =
        newData?.status == '3'
          ? 'ACCEPT'
          : newData?.status == '2' || newData?.status == '6'
          ? 'DECLINE'
          : null;

      let type;
      if (reqUrl.includes('/admin/admin')) type = 'Admin';
      else if (reqUrl.includes('/admin/legal')) type = 'Legal';
      else type = 'Verification';

      // Sort the URLs by their length in descending order to ensure that
      // more specific, longer URLs are checked first.
      const sortedUrls = Object.entries(urls).sort(
        (a, b) => b[0].length - a[0].length,
      );

      const subType =
        sortedUrls.find(([url]) => reqUrl.includes(url))?.[1] || '';

      // If the URL includes 'legal' and contains loanIds
      if (reqUrl.includes('/legal') && newData.loanIds) {
        const ids = Array.isArray(newData.loanIds)
          ? newData.loanIds
          : [newData.loanIds];
        for (const id of ids) {
          const { ids, ...restOfNewData } = newData;
          const currentNewData = { ...restOfNewData, id };
          const data = {
            userId: newData?.userId,
            type: 'Legal',
            subType,
            loanId: id ?? '-',
            oldData: '',
            newData: JSON.stringify(currentNewData),
            adminId,
            status,
            ip,
          };
          const createdData = await this.repo.createRowData(
            ChangeLogsEntity,
            data,
          );
          if (createdData === k500Error) return kInternalError;
        }
      } else {
        if (reqUrl.includes('/admin/admin/adminpassword') && !newData.password)
          return;
        const data = {
          userId: newData?.userId,
          type,
          subType,
          loanId: newData.loanId,
          oldData: '',
          newData: JSON.stringify(newData),
          adminId,
          status,
          ip,
        };
        const createdData = await this.repo.createRowData(
          ChangeLogsEntity,
          data,
        );
        if (createdData === k500Error) return kInternalError;
      }
    } catch (error) {}
  }

  private async createLogs(req) {
    try {
      const reqUrl: string = req.baseUrl.toLowerCase().trim();
      const data: any = { body: {}, sourceId: EnvConfig.server.sourceId };
      const headers = req?.headers ?? {};
      const token = headers['access-token'];
      const secret_key = headers['secret_key'];
      const adminId = headers?.adminId;
      let query = req.query;
      let body = req.body;

      // Exception due to size limit
      if (reqUrl == `/${Latest_Version}/user/saveimageframe`) return {};

      if (token) {
        data.type = 'ADMIN';
        const adminData: any = await this.jwtService.decode(token);
        if (adminData?.adminId) data.adminId = adminData.adminId;
      } else if (reqUrl.startsWith('/admin/')) data.type = 'ADMIN';
      else data.type = data.type ?? 'USER';

      if (secret_key) data.userId = getUserId(secret_key);

      if (body) {
        const targetData = this.getValideJson(body);
        if (targetData?.data)
          targetData.data = await this.cryptService.decryptRequest(body.data);
        body = targetData?.data ?? targetData;
      }
      if (query) {
        const targetData = this.getValideJson(query);
        if (targetData?.data)
          targetData.data = await this.cryptService.decryptRequest(query.data);
        query = targetData;
      }
      data.traceId = body?.traceId ?? query?.traceId;
      data.body = JSON.stringify({ ...body, ...query });
      // UserId
      data.userId =
        data?.userId ?? data?.body?.userId ?? body?.userId ?? query?.userId;
      if (!data.userId && data.type == 'USER') {
        if (reqUrl.startsWith(`/${Latest_Version}/user/`)) {
          if (query?.id && regUUID(query?.id)) {
            data.userId = query.id;
          }
        } else data.userId = null;
      }
      // AdminId
      data.adminId =
        data?.adminId ??
        adminId ??
        data?.body?.adminId ??
        body?.adminId ??
        query?.adminId ??
        0;
      data.loanId =
        data?.loanId ??
        data?.body?.loanId ??
        body?.loanId ??
        query?.loanId ??
        0;
      if (data.loanId == 'undefined') data.loanId = 0;
      if (typeof data.loanId == 'object') data.loanId = data.loanId[1];
      data.apiEndpoint = reqUrl ?? '-';
      data.headers = JSON.stringify(headers);

      if (data.apiEndpoint?.length <= 2) data.apiEndpoint = '-';

      if (data.userId == '') console.log('APILOGS USERID', reqUrl);

      try {
        if (data.userId && !regUUID(data.userId)) data.userId = null;
        else if (data.userId == '' && !regUUID(data.userId)) data.userId = null;
      } catch (error) {}

      // Ip
      let ip: string = getClientIp(req);
      if (ip) ip = ip.replace(/f/g, '').replace(/:/g, '');
      if (ip == '1') ip = '110.227.999.999';

      if (req.headers.lspip) {
        try {
          if (EnvConfig.whiteListedIPs.includes(ip))
            ip = req.headers.lspip?.split(',')[0]?.trim();
        } catch (error) {}
      }

      if (ip == '::1') ip = '144.24.112.239';
      if (typeof ip == 'string') ip = ip.replace('::ffff:', '');
      data.ip = ip;

      new Promise(async (resolve, reject) => {
        await this.repo.createRowData(APILogger, data);
        resolve({});
      }).catch((err) => {});
    } catch (error) {}
  }
  //#endregion

  //#for validate and get JSON string
  private getValideJson(data) {
    try {
      if (typeof data === 'string') return JSON.parse(data);
      return data;
    } catch (error) {
      return data;
    }
  }
  //#endregion

  private async validateAPIRequest(req) {
    try {
      const reqUrl: string = req.baseUrl.toLowerCase().trim();
      let query = req.query;
      let body = req.body;
      const headers = req.headers ?? {};

      // Request -> LSP host
      if (headers?.appid || headers?.secretkey) {
        const host = headers.host ?? '';
        // Request from non white listed ip
        if (!EnvConfig.lsp.hosts.includes(host)) {
          return false;
        }
        // Unauthorized credentials
        if (EnvConfig.lsp.id != headers.appid?.toLowerCase()) {
          return false;
        }
        if (!EnvConfig.lsp.id) {
          return false;
        }
        if (!headers.appid?.toLowerCase()) {
          return false;
        }
        if (EnvConfig.lsp.key != headers.secretkey?.toLowerCase()) {
          return false;
        }
        if (!EnvConfig.lsp.key) {
          return false;
        }
        if (!headers.secretkey?.toLowerCase()) {
          return false;
        }
      }

      // Validate jwt auth
      if (reqUrl.startsWith(`/${Latest_Version}/`)) {
        const excludedList = [
          `/${Latest_Version}/user/checkpasscode`,
          `/${Latest_Version}/user/forgetpasscode`,
          `/${Latest_Version}/misc/getconfigs`,
          `/${Latest_Version}/user/login`,
          `/${Latest_Version}/user/verifyotp`,
          `/${Latest_Version}/user/generateotp`,
          `/${Latest_Version}/metrics/insertlog`,
          `/${Latest_Version}/user/lastonlinetime`,
        ];
        if (!excludedList.includes(reqUrl)) {
          const jwtToken = req.headers['authorization'];
          const secretKey = req.headers['secret_key'];
          const platform = body?.platform ?? query?.platform ?? '';
          const typeOfDevice = body?.typeOfDevice ?? query?.typeOfDevice ?? '';
          const userId =
            body?.userId ?? query?.userId ?? body?.id ?? query?.id ?? secretKey;
          const excludeForWEB = [
            '/v4/misc/getconfigs',
            '/v4/user/checkuserpermissionslist',
            '/v4/user/login',
            '/v4/user/checknewusereligibleornot',
          ];
          if (typeOfDevice == 2 && !excludeForWEB.includes(reqUrl)) {
            const jwtData = await this.cryptService.verifyJWT(jwtToken);
            if (jwtData.userId != userId || !userId) return false;
            if (!jwtToken) return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.log({ error });
      return false;
    }
  }

  private async manageMetrics(req) {
    try {
      const reqUrl: string = req.baseUrl.toLowerCase().trim();
      const query = req.query ?? {};
      const body = req.body ?? {};

      // Start netbanking journey
      if (reqUrl == `/${Latest_Version}/banking/netbankingflowdetails`) {
        const reqData = {
          loanId: query.loanId,
          type: 1,
          reqUrl,
          subType: 1,
          status: 1,
          userId: query.userId,
          values: { bankCode: query.bankCode },
        };
        await this.sharedMetrics.insertLog(reqData);
      }
      // Continue netbanking journey
      else if (reqUrl == `/${Latest_Version}/banking/validateeligibility`) {
        if (body?.accountDetails?.inAppService == true) {
          const reqData = {
            type: 1,
            reqUrl,
            subType: 1,
            status: 2,
            userId: body.userId,
            values: { bankCode: body?.accountDetails?.bankCode },
          };
          await this.sharedMetrics.insertLog(reqData);
        }
      }
      // Aadhaar verification
      else if (reqUrl == `/${Latest_Version}/kyc/aadhaarotprequest`) {
        const reqData = {
          type: 2,
          reqUrl,
          status: 1,
          userId: body.userId,
          values: {},
        };
        await this.sharedMetrics.insertLog(reqData);
      }
    } catch (error) {}
  }

  private encryptResponseBody(req, res) {
    let query = req.query ?? {};
    let body = req.body ?? {};
    const reqData = Object.keys(body).length != 0 ? body : query;
    const encKey = this.cryptService.getDynamicKey();
    const headers = req.headers ?? {};
    const isLSPReq = headers?.appid || headers?.secretkey;
    // Currently response encryption works just for flutter web
    if (!isLSPReq && reqData.typeOfDevice != '2') return {};

    const originalSend = res.send;
    res.send = function () {
      if (typeof arguments[0] == 'string') {
        try {
          const decryptedRes = JSON.parse(arguments[0]);

          try {
            const encryptedData = encryptRes(decryptedRes);
            arguments[0] = encryptedData;
          } catch (error) {}
        } catch (error) {}
      }
      originalSend.apply(res, arguments);
    };

    const authPublicKey = this.authPublicKey;
    function divideStringByLength(string: string, length: number): string[] {
      const dividedParts: string[] = [];
      let currentIndex: number = 0;
      while (currentIndex < string.length) {
        const currentPart: string = string.substr(currentIndex, length);
        dividedParts.push(currentPart);
        currentIndex += length;
      }
      return dividedParts;
    }
    function encryptRes(responseBody: any) {
      if (isLSPReq) {
        const crypto = require('crypto');
        const responseStr = JSON.stringify(responseBody);
        const spans = divideStringByLength(responseStr, 150);
        let encRes = '';
        spans.forEach((el) => {
          const encryptedData = crypto
            .publicEncrypt(
              {
                key: authPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              },
              Buffer.from(el, 'utf-8'),
            )
            .toString('base64');
          encRes += encryptedData + 'FeksbbskeF==';
        });
        responseBody = { encData: encRes };
      } else {
        const CryptoJS = require('crypto-js');
        const encryptedStr = CryptoJS.AES.encrypt(
          JSON.stringify(responseBody),
          encKey,
        ).toString();
        responseBody = { encData: encryptedStr };
      }

      return JSON.stringify(responseBody);
    }
  }
}
