// Imports
import { Injectable } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class HealthService {
  constructor(private readonly api: APIService) {}

  async statusCheck(reqData) {
    // MANDATORY -> Server version
    const server_version = EnvConfig.server.version;
    if (!server_version) {
      return { status: false, reason: 'SELF_HOST_VERSION_MISSING' };
    }
    // CHECKS -> Server version
    if (reqData.server_version) {
      if (reqData.server_version != server_version) {
        return {
          status: false,
          reason: `VERSION_MISSING_FOR_${EnvConfig.server.origin}`,
        };
      }
    }

    const originKey = reqData.originKey;

    let status = true;
    let reason = 'UNKNOWN';
    let insights: any = {
      BANKING_PRO: { url: EnvConfig.server.bankingProBaseUrl, status: true },
      // ML_WORLD: { status: false },
    };

    const keys = Object.keys(insights);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      if (key == originKey) continue;
      const value = insights[key];

      let url = value.url;
      if (!url) {
        reason = `${key} url is not found in backend-nbfc`;
        break;
      }
      url += 'admin/health/statusCheck';
      const params = { server_version };
      const response = await this.api.get(url, params);
      if (response?.status != true) {
        status = false;
        reason = `Check failed at ${key} with error ${
          response?.reason ?? response
        }`;
        insights[key].status = false;
        break;
      }
    }

    if (status == true) {
      reason = '';
      insights = {};
    }

    return { status, reason, insights };
  }
}
