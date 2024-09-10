import { Injectable } from '@nestjs/common';
import { k422Error, k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import { QualityParameterRepository } from 'src/repositories/qualityParameter.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';

@Injectable()
export class QualityParameterService {
  constructor(
    private readonly repository: QualityParameterRepository,
    private readonly staticRepo: StaticConfigRepository,
  ) {}

  async getQualityParameter(prepare = false, getDisabled?) {
    try {
      const attributes = ['title', 'options', 'disabled', 'version'];
      const latestVersion = await this.getLastVersion();

      const options: any = { where: { version: latestVersion } };
      if (getDisabled != 'true') options.where.disabled = '0';
      const data = await this.repository.getTableWhereData(attributes, options);
      if (data === k500Error) return kInternalError;
      let preparedData = data;
      if (prepare) preparedData = this.getPreparedData(data);
      return preparedData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private getPreparedData(data) {
    try {
      const prepareData = [];
      for (let i = 0; i < data?.length; i++) {
        try {
          const tempObj: any = data[i];
          const keys = Object.keys(tempObj?.options ?? '{}');
          // add first option with having score
          keys
            ?.sort(
              (a, b) =>
                tempObj?.options[b]?.score ??
                0 - tempObj?.options[a]?.score ??
                0,
            )
            .forEach((item, id) => (tempObj[`option${id + 1}`] = item));
          delete tempObj.options;
          prepareData.push(tempObj);
        } catch (error) {}
      }
      return prepareData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async addQualityParameter(body, adminId) {
    try {
      let newData: any = body.qualityParameters ?? [];
      if (!adminId) return kParamMissing('adminId');
      if (!newData || !newData?.length) return kParamsMissing;

      // convert new data to lower case
      newData = await this.getLowerCaseData(newData);
      if (newData?.message) return newData;
      // get current version
      let version = await this.getLastVersion();
      if (version === k500Error) return kInternalError;
      if (typeof version != 'number') return k422Error;

      // get current version data
      const prevAttrs = ['title', 'options', 'disabled'];
      const prevOpts = { where: { version } };
      const previousData = await this.repository.getTableWhereData(
        prevAttrs,
        prevOpts,
      );
      if (previousData === k500Error) return kInternalError;
      // check if data is changed
      const isSame: any = this.compareData(previousData, newData);
      if (isSame?.message) return isSame;
      if (isSame) return kSUCCESSMessage('Data is same as per latest version');

      // version update
      version++;
      const bulkData =
        previousData?.map((item) => {
          const isDisabled = newData.find(
            (disabled) => disabled?.title == item.title,
          );
          // check if options are updated for same title
          const optUpdatedId = newData?.findIndex((optionData) => {
            let isSame = true;
            if (optionData?.title == item.title) {
              const oldKeys = Object.keys(item?.options ?? {});
              const newKeys = Object.keys(optionData?.options ?? {});
              oldKeys.sort();
              newKeys.sort();
              if (oldKeys.length == newKeys.length) {
                for (let i = 0; i < oldKeys.length; i++) {
                  if (oldKeys[i] !== newKeys[i]) {
                    isSame = false;
                    break;
                  }
                }
              } else isSame = false;
            }
            return (
              optionData?.title == item.title &&
              !isSame &&
              item?.disabled == '1'
            );
          });

          if (optUpdatedId !== -1) {
            item = newData[optUpdatedId];
          }

          if (isDisabled) {
            item.disabled = isDisabled.disabled;
          }
          item.version = version;
          item.adminId = adminId;
          return item;
        }) ?? [];
      // filter already added in bulk data
      newData = newData?.filter(
        (item) => !bulkData?.find((data) => data.title == item.title),
      );

      // prepare bulkData
      for (let i = 0; i < newData.length; i++) {
        try {
          const current = newData[i];
          const options: any = current?.options;
          const keys = Object.keys(options ?? {});
          if (keys?.length !== 2) return kInternalError;
          current.options[keys[0]] = { score: 10 };
          current.version = version;
          current.adminId = adminId;
          bulkData.push(current);
        } catch (error) {}
      }

      if (!bulkData) return kSUCCESSMessage;
      // add quality parameter
      const bulkCreate = await this.repository.bulkCreate(bulkData);
      if (bulkCreate === k500Error) return kInternalError;

      // update version in static entity
      const updateVersion: any = await this.updateVersion(version);
      if (updateVersion?.message) return updateVersion;
      return 'Success';
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private compareData(oldData, newData) {
    try {
      if (!oldData) return false;
      oldData?.sort((a, b) => a?.title - b?.title);
      newData?.sort((a, b) => a?.title - b?.title);

      const titleExists = newData.findIndex((item) => {
        return (
          oldData?.findIndex(
            (old) =>
              old?.title == item?.title && item?.disabled == old?.disabled,
          ) != -1
        );
      });
      if (titleExists != -1) return true;

      if (newData?.length < oldData?.length) {
        // check if new data already exist and disabled is not changed
        for (let i = 0; i < newData?.length; i++) {
          try {
            const newP = newData[i];
            const oldP = oldData?.findIndex((item) => {
              let isSame = false;
              if (item?.title == newP?.title) {
                isSame = true;
                const oldKeys = Object.keys(item?.options ?? {}).sort();
                const newKeys = Object.keys(newP?.options ?? {}).sort();

                if (oldKeys.length === newKeys.length) {
                  for (let i = 0; i < newKeys.length; i++) {
                    try {
                      if (oldKeys[i] !== newKeys[i]) isSame = false;
                    } catch (e) {}
                  }
                }
              }
              return (
                item?.title == newP?.title &&
                item?.disabled == newP?.disabled &&
                isSame
              );
            });
            if (oldP == -1) return false;
          } catch (error) {}
        }
        return true;
      }

      if (oldData?.length != newData?.length) return false;
      for (let i = 0; i < oldData.length; i++) {
        try {
          const oldD = oldData[i];
          const newD = newData[i];
          if (oldD.title != newD.title) return false;
          if (oldD?.disabled !== newD?.disabled) return false;
          const oldKeys = Object.keys(oldD.options);
          const newKeys = Object.keys(newD.options);
          if (oldKeys.length !== newKeys.length) return false;
          oldKeys.sort();
          newKeys.sort();
          if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) return false;
        } catch (error) {}
      }
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getLastVersion() {
    try {
      const staticAttributes = ['lastUpdateIndex'];
      const staticOptions = { where: { type: 'QUALITYPARAMETERS' } };
      const latestVersion = await this.staticRepo.getRowWhereData(
        staticAttributes,
        staticOptions,
      );
      if (latestVersion === k500Error) return kInternalError;
      return latestVersion?.lastUpdateIndex;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async updateVersion(version: number) {
    try {
      const staticOptions = { where: { type: 'QUALITYPARAMETERS' } };
      const update = await this.staticRepo.updateRowWhereData(
        { lastUpdateIndex: version },
        staticOptions,
      );
      if (update === k500Error) return kInternalError;
      return { update, version };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getLowerCaseData(data) {
    try {
      const prepareData = [];
      const version = await this.getLastVersion();
      for (let i = 0; i < data?.length; i++) {
        try {
          const item = data[i];
          const options = {};
          const keys = new Set(Object.keys(item?.options ?? {}));
          // convert options all keys in lower case
          if (keys.size == 2 || keys.size == 0)
            keys?.forEach((curr) => {
              const value = item.options[curr];
              if (typeof value == 'string')
                options[curr.toLowerCase()] = value.toLowerCase();
              else {
                const subOpts = {};
                if (typeof value == 'object') {
                  Object.keys(value).forEach((key) => {
                    const currValue =
                      typeof value[key] == 'string'
                        ? value[key].toLowerCase()
                        : value[key];
                    subOpts[key.toLowerCase()] = currValue;
                  });
                }
                options[curr.toLowerCase()] = subOpts;
              }
            });
          else return kParamMissing('options are not valid');

          const preparedObj = {
            title: (item?.title ?? '').toLowerCase(),
            options,
            disabled: item?.disabled ?? '0',
            remarks: item?.remarks ?? undefined,
            version,
          };
          prepareData.push(preparedObj);
        } catch (error) {}
      }
      return prepareData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
