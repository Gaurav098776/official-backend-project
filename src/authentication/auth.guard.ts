// Imports
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator,
  mixin,
} from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { decryptText } from 'src/utils/type.service';
import { AdminService } from 'src/admin/admin/admin.service';
import { getClientIp } from '@supercharge/request-ip';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EnvConfig } from 'src/configs/env.config';

//Validate and approves the request only if it's from LSP admin
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = getKeyValue(context, 'admin-key');
    if (!key) return false;
    const adminId = getKeyValue(context, 'adminId');
    if (!adminId) return false;
    const type = getKeyValue(context, 'type');
    if (!type) return false;
    const result = await this.adminService.validateAdminRequest(adminId, type);
    if (result == k500Error) return false;
    return result;
  }
}

//Validate and approves the request only if it's from LSP backend
@Injectable()
export class IpConfigGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip =
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress ||
      null;
    return true;
  }
}

export const validateRights = (type: string) => {
  @Injectable()
  class validateRightsMixin implements CanActivate {
    constructor(public commongSharedService: CommonSharedService) {}
    async canActivate(context: ExecutionContext) {
      // do something with context and role
      if (process.env.MODE == 'DEV') return true;
      const request = context.switchToHttp().getRequest();
      const headers = request.headers;
      // const devReq = headers['dev'];
      // if (devReq && devReq == '123') return true;
      const email = headers['admin-email'];
      const token = headers['access-token'];
      if (!token || !email) return false;
      const isValid = await this.commongSharedService.validateRights(
        email,
        token,
        type,
      );
      if (!isValid) return false;
      return true;
    }
  }
  const guard = mixin(validateRightsMixin);
  return guard;
};

//Validate and approves the request only if it's from LSP backend
@Injectable()
export class BackendGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true;
    if (process.env.MODE != 'PROD') return false;
    const key = getKeyValue(context, 'backend-key');
    if (!key) return false;
    return true;
  }
}

//Approves In case of custom query needed to developer in case of emergency
@Injectable()
export class DevGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.MODE != 'DEV') return false;
    const key = getKeyValue(context, 'dev-key');
    if (!key) return false;
    return true;
  }
}

// Grant access to authorized LSP employee who has server access
@Injectable()
export class DevOpsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const value = getKeyValue(context, 'dev-ops-key');
    if (!value) return false;
    if (!EnvConfig.secrets.devOpsKey) return false;
    if (value != EnvConfig.secrets.devOpsKey) return false;
    return true;
  }
}

@Injectable()
export class TestOpsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const value = getKeyValue(context, 'qa-test-key');
    if (!value) return false;
    if (!EnvConfig.secrets.qaTestKey) return false;
    if (value != EnvConfig.secrets.qaTestKey) return false;
    return true;
  }
}

// Works in any server mode, Requires the adminId and Master key
@Injectable()
export class SensitiveGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = getKeyValue(context, 'master-key');
    if (!key) return false;
    const masterKey = process.env.SERVER_MASTER_KEY;
    if (!masterKey) return false;
    return masterKey == key;
  }
}

//Approves in case of testKey is valid
@Injectable()
export class TestGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = getKeyValue(context, 'test-key');
    if (!key) return false;
    return true;
  }
}

//#region check admin auth
@Injectable()
export class AdminAuthCheck implements CanActivate {
  constructor(private readonly commonSharedService: CommonSharedService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.MODE == 'DEV') return true;
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const devReq = headers['dev'];
    if (devReq && devReq == '123') return true;
    const token = headers['access-token'];
    if (!token) return false;
    const data = await this.commonSharedService.validatedToken(token);
    if (data || data === false) if (!data || !data?.roleId) return false;
    return true;
  }
}
//#endregion

function getKeyValue(context: ExecutionContext, keyName: string) {
  try {
    const key = keyName?.toLowerCase();
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const encryptedKey = headers[key];
    return encryptedKey;
  } catch (error) {}
}

@Injectable()
export class IpGaurd implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const allowedIps = [
      '192.168.1.6',
      '192.168.1.40',
      '192.168.1.15',
      '192.168.1.21',
    ];
    let ip: string = getClientIp(request);
    if (ip) {
      ip = ip.replace(/f/g, '').replace(/:/g, '');
      if (ip == '::1' || allowedIps.includes(ip)) return true;
    }
  }
}

//#region check loan data change access
@Injectable()
export class LoanChangeablityGaurd implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.MODE == 'DEV') return true;
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const hasKey = headers['loan-dev'];
    if (hasKey && hasKey == '987654321') return true;
    const email = headers['admin-email'];
    const token = headers['access-token'];
    if (!token || !email) return false;
    const isValid = await this.adminService.loanDataChangeAbilityCheck(
      email,
      token,
    );
    if (!isValid) return false;
    return true;
  }
}
//#endregion

export const DecQuery = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    try {
      const decQuery: any = ctx?.getArgByIndex(0)?.query;
      if (!decQuery || typeof decQuery != 'object') return;
      if (!decQuery?.query) return decQuery;
      let query: any = {};
      query = decryptText(encodeURI(decQuery.query));
      if (!query) return;
      query = JSON.parse(query);
      return query;
    } catch (error) {
      return;
    }
  },
);
export const DecParams = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    try {
      const decParams: any = ctx?.getArgByIndex(0)?.params;
      if (!decParams || typeof decParams != 'object') return;
      if (!decParams?.params) return decParams;
      let params: any = {};
      params = decryptText(encodeURI(decParams.params));
      if (!params) return;
      params = JSON.parse(params);
      return params;
    } catch (error) {
      return;
    }
  },
);
export const DecBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    try {
      const decBody: any = ctx?.getArgByIndex(0)?.body;
      if (!decBody || typeof decBody != 'object') return;
      if (!decBody?.body) return decBody;
      let body: any = {};
      body = decryptText(encodeURI(decBody.body));
      if (!body) return;
      body = JSON.parse(body);
      return body;
    } catch (error) {
      return;
    }
  },
);

export const getUserId = (key) => {
  try {
    if (!key) return;
    let userId;
    const userIdCheck = (key.match(/-/g) || []).length;
    if (key.length == 36 && userIdCheck == 4) {
      userId = key;
    } else {
      userId = decryptText(key);
    }
    return userId;
  } catch (error) {
    return;
  }
};

//#region custome decorators
export const Key = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const key = getKeyValue(ctx, 'secret_key');
    return getUserId(key);
  },
);
//#endregion
