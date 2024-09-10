// Imports
import { createClient } from 'redis';
import { RedisModule } from './redis.module';
import { EnvConfig } from 'src/configs/env.config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_PREFIX } from 'src/constants/globals';
import { kParamMissing } from 'src/constants/responses';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisModule.name);
  private client: any;
  public prefix: string = REDIS_PREFIX ? REDIS_PREFIX : '';
  constructor(@Inject('REDIS_CONNECTION_CONFIG_OPTIONS') private options) {
    this.initialize(options);
  }

  async initialize(options) {
    this.client = createClient({
      url: `redis://${
        options.auth_user == undefined ? '' : options.auth_user
      }:${options.auth_pass}@${options.host}:${options.port}`,
    });
    this.client.on('error', (err) => this.logger.error('Redis -> ' + err));
    this.client.on('ready', () => this.logger.log('Redis client is connected'));
    this.client.connect();
  }

  async del(key) {
    try {
      return this.client.del(this.prefix + key);
    } catch (error) {
      return null;
    }
  }

  // GET retrieves a string value.
  async get(key: string) {
    try {
      return await this.client.get(this.prefix + key);
    } catch (error) {
      return null;
    }
  }

  // SET stores a string value.
  async set(key, value, time = -1) {
    try {
      await this.client.set(this.prefix + key, value);
      if (time == -1) return true;
      await this.client.expire(this.prefix + key, time);
      return true;
    } catch (error) {
      return null;
    }
  }

  // HGETALL get all fields on a hash.
  async hGetAll(key: string) {
    try {
      return await this.client.hGetAll(this.prefix + key);
    } catch (error) {
      return null;
    }
  }

  // HSET sets the value of one or more fields on a hash.
  // eslint-disable-next-line @typescript-eslint/ban-types
  async hSet(key, values: Object, time = -1): Promise<any> {
    try {
      await this.client.hSet(this.prefix + key, values);
      if (time == -1) return true;
      await this.client.expire(this.prefix + key, time);
      return true;
    } catch (error) {
      return null;
    }
  }

  async mGet(...keys) {
    try {
      return this.client.mGet(keys.map((key) => this.prefix + key).join(','));
    } catch (error) {
      return null;
    }
  }

  // Returns the details as per environment mode
  async getKeyDetails(key: string) {
    return await this.get(key);
  }

  // Update the details as per environment mode
  async updateKeyDetails(key: string, data: any, time?: number) {
    return await this.set(key, data, time);
  }

  //#region
  async redisKeyLists(reqData) {
    const keys = reqData?.keys;
    if (!keys) return kParamMissing('keys');
    const filter = `*${this.prefix + keys}*`;
    return await this.client.sendCommand(['KEYS', filter]); // 'OK'
  }
  //#endregion

  //#region
  async redisKeyDelete(reqData) {
    const searchKey = reqData.searchKey;
    if (!searchKey) return kParamMissing('searchKey');
    const filter = `*${this.prefix + searchKey}*`;
    let keysList = await this.client.sendCommand(['KEYS', filter]);
    return await this.client.sendCommand(['DEL', ...keysList]);
  }
  //#endregion

  //#region
  async redisKeyValue(reqData) {
    const key = reqData?.key;
    if (!key) return kParamMissing('key');
    let value = await this.client.sendCommand(['GET', this.prefix + key]);
    if (typeof value != 'string') {
      value = JSON.parse(value);
    }
    return value;
  }
  //#endregion

  async setRedisKeyValue(reqData) {
    let key = reqData?.key;
    if (!key) return kParamMissing('key');
    let newValue = reqData?.newValue;
    if (!newValue) return kParamMissing('newValue');
    const jsonValue =
      typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
    return await this.set(key, jsonValue);
  }
}
