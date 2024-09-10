// Imports
import { Model } from 'mongoose';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { isLOG } from 'src/constants/globals';
import { BulkCreateOptions } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { InjectModel } from '@nestjs/mongoose';
import { Sequelize } from 'sequelize-typescript';
import { kCryptography } from 'src/constants/strings';
import { kInternalError } from 'src/constants/responses';
import { SlackService } from 'src/thirdParty/slack/slack.service';
import { APILogger, APILoggerDocument } from 'src/entities/api_logger.schema';
import { EnvConfig } from 'src/configs/env.config';
import {
  UserOnlineTime,
  UserOnlineTimeDocument,
} from 'src/entities/user_online_time.schema';

@Injectable()
export class RepositoryManager {
  constructor(
    // Database
    @InjectModel(APILogger.name)
    private readonly apiLoggerModel: Model<APILoggerDocument>,
    @InjectModel(UserOnlineTime.name)
    private readonly userOnlineTimeModel: Model<UserOnlineTimeDocument>,
    // Third party
    private readonly slack: SlackService,
  ) {}

  getRandomElement(arr) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

  async createRowData(repository: any, data: any) {
    try {
      // Document creation -> MongoDB
      if (repository?.name === 'APILogger') {
        try {
          const apiLoggerModel = new this.apiLoggerModel(data);
          return await apiLoggerModel.save();
        } catch (error) {
          await this.errorStoreInRedis(error, repository, 'createRowData');
          return k500Error;
        }
      } // Document creation -> MongoDB
      else if (repository?.name === 'UserOnlineTime') {
        try {
          const userOnlineTimeModel = new this.userOnlineTimeModel(data);
          return await userOnlineTimeModel.save();
        } catch (error) {
          await this.errorStoreInRedis(error, repository, 'createRowData');
          return k500Error;
        }
      }

      const newdata = await this.getEncryptedRawData(repository, data);
      if (newdata == k500Error) return k500Error;
      const createdData = await repository.create(newdata);

      if (!createdData) return k500Error;
      return createdData['dataValues'];
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'createRowData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async createRowDataWithCopy(repository: any, updatedData: any, id: number) {
    try {
      const existingData = await repository.findOne({
        where: { id },
        raw: true,
      });
      if (!existingData) return k500Error;
      const aadhaarLatLongPoint = existingData?.aadhaarLatLongPoint;
      if (aadhaarLatLongPoint) {
        const lat = aadhaarLatLongPoint['x'];
        const lng = aadhaarLatLongPoint['y'];
        const key = `${lat},${lng}`;
        existingData.aadhaarLatLongPoint = key;
      }
      const creationData = { ...existingData, ...updatedData };
      delete creationData.id;
      return await this.createRowData(repository, creationData);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'createRowDataWithCopy');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async createOrUpdateRowData(repository: any, updatedData: any, id: any) {
    try {
      const updateResult = await this.updateRowData(
        repository,
        updatedData,
        id,
      );
      if (updateResult != k500Error && updateResult == 0)
        return await this.createRowData(repository, updatedData);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'createOrUpdateRowData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getRowWhereData(repository: any, attributes: string[], options: any) {
    try {
      const newAttr = await this.getEncryptedAttr(attributes, repository);
      if (newAttr == k500Error) return k500Error;
      await this.finalizeIncludes(options.include ?? []);
      const data = await repository.findOne({
        attributes: newAttr,
        ...options,
      });
      if (!data) return;
      return data.get({ plain: true });
    } catch (error) {
      console.log({ error });
      await this.errorStoreInRedis(error, repository, 'getRowWhereData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getTableWhereData(repository: any, attributes: string[], options: any) {
    try {
      const newAttr = await this.getEncryptedAttr(attributes, repository);
      if (newAttr == k500Error) return k500Error;
      await this.finalizeIncludes(options.include ?? []);

      const listData = await repository.findAll({
        attributes: newAttr,
        ...options,
        distinct: true,
      });
      if (options.raw == true) return listData;
      return listData.map((element) => element.get({ plain: true }));
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'getTableWhereData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getTableCountWhereData(
    repository: any,
    attributes: string[],
    options: any,
  ) {
    try {
      const newAttr = await this.getEncryptedAttr(attributes, repository);
      if (newAttr == k500Error) return k500Error;
      await this.finalizeIncludes(options.include ?? []);

      const listData = await repository.findAndCountAll({
        attributes: newAttr,
        ...options,
        distinct: true,
      });

      if (options.raw == true) return listData;
      listData.rows = listData.rows.map((el) => el.get({ plain: true }));
      return listData;
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'getTableCountWhereData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateRowData(repository: any, updatedData: any, id, silent = false) {
    try {
      const newData = await this.getEncryptedRawData(repository, updatedData);
      if (newData == k500Error) return k500Error;
      return await repository.update(newData, { where: { id }, silent });
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'updateRowData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateRowDataWithOptions(
    repository: any,
    updatedData: any,
    options: any,
    id,
  ) {
    try {
      const newData = await this.getEncryptedRawData(repository, updatedData);
      if (newData == k500Error) return k500Error;
      return await repository.update(newData, { where: { id }, ...options });
    } catch (error) {
      await this.errorStoreInRedis(
        error,
        repository,
        'updateRowDataWithOptions',
      );
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateRowWhereData(repository: any, updatedData, options) {
    try {
      const newData = await this.getEncryptedRawData(repository, updatedData);
      if (newData == k500Error) return k500Error;
      return await repository.update(newData, options);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'updateRowWhereData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async deleteWhereData(repository: any, options: any, restricted = true) {
    try {
      const mode = process.env.MODE;
      if (mode != 'DEV' && restricted && mode != 'UAT') return false;
      return await repository.destroy({ ...options });
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'deleteWhereData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async deleteSingleData(repository: any, id: any, restricted = true) {
    try {
      const mode = process.env.MODE;
      if (mode != 'DEV' && restricted && mode != 'UAT') return false;
      return await repository.destroy({
        where: { id: id },
      });
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'deleteSingleData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async findOrCreate(repository: any, where: any, defaults: any) {
    try {
      return await repository.findOrCreate({ where, defaults });
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'findOrCreate');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateData(
    repository: any,
    updatedData: any,
    where: any,
    silent = false,
  ) {
    try {
      if (!where) return k500Error;
      const newData = await this.getEncryptedRawData(repository, updatedData);
      return await repository.update(newData, { where: where, silent });
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'updateData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateSilentData(
    repository: any,
    updatedData: any,
    where: any,
    silent = true,
  ) {
    try {
      if (!where) return k500Error;
      const newData = await this.getEncryptedRawData(repository, updatedData);
      return await repository.update(newData, { where: where, silent });
    } catch (error) {
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getCountsWhere(repository: any, options: any) {
    try {
      return await repository.count(options);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'getCountsWhere');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async bulkCreate(
    repository: any,
    data: any,
    bulkCreateOptions?: BulkCreateOptions,
  ) {
    try {
      const createdData = await repository.bulkCreate(data, bulkCreateOptions);
      if (!createdData) return k500Error;
      return createdData.map((el) => el.get({ plain: true }));
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'bulkCreate');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async finalizeIncludes(includes: any[]) {
    try {
      for (let index = 0; index < includes.length; index++) {
        const el = includes[index];
        const attributes = el.attributes;
        if (attributes)
          el.attributes = await this.getEncryptedAttr(attributes, el.model);
        if (el.include) await this.finalizeIncludes(el.include);
      }
      return includes;
    } catch (error) {
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getEncryptedAttr(attributes, repository) {
    try {
      if (
        !repository.options ||
        !repository.options.defaultScope ||
        !repository.options.defaultScope.attributes ||
        repository.options.defaultScope.attributes.length == 0
      )
        return attributes;

      const newAttr = [];
      const encryptedAttributes = [];
      const encryptedAttr: any =
        repository.options.defaultScope.attributes.include;
      encryptedAttr.forEach((singleAttr) => {
        encryptedAttributes.push(singleAttr[singleAttr.length - 1]);
      });
      attributes.forEach((element) => {
        if (encryptedAttributes.includes(element)) {
          newAttr.push([
            Sequelize.fn(
              'PGP_SYM_DECRYPT',
              Sequelize.cast(Sequelize.col(element), 'bytea'),
              kCryptography,
            ),
            element,
          ]);
        } else {
          if (!newAttr.includes(element)) newAttr.push(element);
        }
      });
      return newAttr;
    } catch (error) {
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async updateExitingData(rawData, attr) {
    try {
      const newData: any = {};
      if (!attr || attr.length == 0) return rawData;
      for (const key in rawData) {
        attr.forEach((element) => {
          if (element.includes(key)) {
            newData[key] = Sequelize.fn(
              'PGP_SYM_ENCRYPT',
              rawData[key],
              kCryptography,
            );
          } else {
            newData[key] = rawData[key];
          }
        });
      }
      return newData;
    } catch (error) {
      await this.errorStoreInRedis(error, '', 'updateExitingData');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async getEncryptedRawData(repository, rawData) {
    try {
      if (
        !repository.options ||
        !repository.options.defaultScope ||
        !repository.options.defaultScope.attributes ||
        repository.options.defaultScope.attributes.length == 0
      )
        return rawData;

      const encryptedAttributes = [];
      const encryptedAttr: any =
        repository.options.defaultScope.attributes.include;
      encryptedAttr.forEach((singleAttr) => {
        encryptedAttributes.push(singleAttr[singleAttr.length - 1]);
      });

      const newData: any = {};
      for (const key in rawData) {
        const data = rawData[key];
        if (encryptedAttributes.includes(key)) {
          newData[key] = Sequelize.fn('PGP_SYM_ENCRYPT', data, kCryptography);
        } else {
          newData[key] = rawData[key];
        }
      }
      return newData;
    } catch (error) {
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async injectRawQuery(repository, query, options: any = {}) {
    try {
      const listData = await repository.sequelize.query(query, {
        ...options,
        raw: true,
        nest: true,
      });
      if (!listData) return k500Error;
      return listData;
    } catch (error) {
      console.log({ error });
      await this.errorStoreInRedis(error, repository, 'injectRawQuery');
      if (isLOG) console.log(error);
      return k500Error;
    }
  }

  async distroy(repository, options) {
    try {
      if (!options?.id) return false;
      return await repository.distroy(options);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'distroy');
      if (isLOG) console.log(error);
      return kInternalError;
    }
  }

  async upsert(repository, data, options = {}) {
    try {
      return await repository.upsert(data, options);
    } catch (error) {
      await this.errorStoreInRedis(error, repository, 'upsert');
      if (isLOG) console.log(error);
      return kInternalError;
    }
  }

  //if error generate then store in redish server
  async errorStoreInRedis(error, repository?: any, initiator = 'Unknown') {
    try {
      const threads = [];
      // Send alert on telegram
      try {
        // Query error
        try {
          if (error.sql) {
            const content = `Query details !
            ${error.sql}`;
            threads.push(content);
          }
        } catch (error) {}
        // Full details
        try {
          if (error.sql) {
            const content = `Full details !
            ${error.toString()}`;
            threads.push(content);
          }
        } catch (error) {}
        // Stack details
        try {
          if (error?.stack) {
            const content = `Stack trace
              ${error?.stack?.toString()}`;
            threads.push(content);
          }
        } catch (error) {}

        try {
          const content = `Database error -> ${initiator}-${
            repository?.tableName ?? repository?.toString()
          }`;
          this.slack.sendMsg({ text: content, threads });
        } catch (error) {}
      } catch (error) {}

      return {};
    } catch (error) {}
  }
}
