import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { nAutomationBaseURL, nVerifyByTruecaller } from 'src/constants/network';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { RedisService } from 'src/redis/redis.service';
import { APIService } from 'src/utils/api.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly api: APIService,
    private readonly redis: RedisService,
  ) {}

  async addressesToCoordinates(address) {
    try {
      const url = 'http://localhost:3200/getLatLongFromaddress';
      const result = await this.api.requestPost(url, { address });
      if ((result?.valid ?? false) === true) return result?.data;
      if (result == k500Error || result == kInternalError)
        return kInternalError;
      return [];
    } catch (error) {
      return kInternalError;
    }
  }

  async updatePorts(reqData) {
    try {
      const ports = reqData.ports;
      if (!ports) return kParamMissing('ports');

      const key = 'AUTOMATION_CLUSTER_PORTS';
      await this.redis.set(key, JSON.stringify(ports));

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async verifyContacts(reqData) {
    try {
      const numbers = reqData.numbers;
      if (!numbers) return kParamMissing('numbers');
      const count = reqData.count ?? 1;

      if (numbers.length > 5)
        return k422ErrorMessage('Only 5 numbers can get checked at a time');

      // URL
      const automationBaseURL = nAutomationBaseURL;
      const availablePort: any = await this.getAvailablePort();
      if (availablePort?.message) return availablePort;
      const url = automationBaseURL + availablePort + nVerifyByTruecaller;
      // Body preparation
      const body = { numbers };
      
      // API call
      const response = await this.api.requestPost(url, body);
      if (response == k500Error) return kInternalError;
      if (!response.valid) return kInternalError;
      if (!response.data) return kInternalError;
      if (response.data.length == 0 && count <= 10) {
        reqData.count = count + 1;
        return await this.verifyContacts(reqData);
      } else if (response.data.find((el) => el == '500Error') && count <= 10) {
        reqData.count = count + 1;
        return await this.verifyContacts(reqData);
      }

      return response.data;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getAvailablePort() {
    try {
      const ports = [2001, 2002, 2003, 2004];
      const index = Math.floor(Math.random() * ports.length);

      return ports[index];
    } catch (error) {
      return kInternalError;
    }
  }
}
