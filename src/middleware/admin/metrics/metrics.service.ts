// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kCompleted, kInitiated, kStuck } from 'src/constants/strings';
import { MetricsEntity } from 'src/entities/metrics.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { kInvalidParamValue, kParamMissing } from 'src/constants/responses';

@Injectable()
export class MetricsService {
  constructor(
    // Database
    private readonly repo: RepositoryManager,
  ) {}

  async insights(reqData) {
    const targetData = await this.getDataForInsights(reqData);
    if (targetData?.message) return targetData;

    // Flow -> Login
    if (targetData.flowType === 'APP_LOGIN')
      return await this.prepareDataForLogin(targetData);

    // Flow -> Aadhaar
    if (targetData.flowType === 'AADHAAR')
      return await this.prepareDataForAadhaar(targetData);

    // Flow -> Account aggregator
    if (targetData.flowType === 'AA')
      return await this.prepareDataForAA(targetData);

    return {};
  }

  private async getDataForInsights(reqData): Promise<any> {
    // Validation -> Parameters
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    if (![1, 2, 3].includes(+type)) return kInvalidParamValue('type');
    const subType = reqData.subType;
    if (!subType) return kParamMissing('subType');
    const startDate = reqData.startDate;
    if (!startDate) return kParamMissing('startDate');
    const endDate = reqData.endDate;
    if (!endDate) return kParamMissing('endDate');
    const isCount = reqData.count === 'true';

    // Preparation -> Query
    const metricsAttr = ['loanId', 'status', 'userId', 'values', 'deviceId'];
    const metrcisOptions = { order: [['id', 'ASC']], where: { subType, type } };
    // Hit -> Query
    const logsList = await this.repo.getTableWhereData(
      MetricsEntity,
      metricsAttr,
      metrcisOptions,
    );
    // Validation -> Query data
    if (logsList === k500Error) throw new Error();

    let flowType = 'UNKNOWN';
    if (+type === 1 && +subType === 2) flowType = 'AA';
    else if (+type === 3) flowType = 'APP_LOGIN';
    return { isCount, logsList, flowType };
  }

  private prepareDataForAadhaar(targetData) {}

  private prepareDataForAA(targetData) {
    const consentData = {};

    // Group by consent handles
    for (let index = 0; index < targetData.logsList.length; index++) {
      try {
        const data = targetData.logsList[index];
        if (!data.values.referenceId) continue;

        if (consentData[data.values.referenceId])
          consentData[data.values.referenceId].push(data);
        else consentData[data.values.referenceId] = [data];
      } catch (error) {}
    }
    const finalizedList = [];

    const finalizedData = {
      totalAttempts: 0,
      totalCompleted: 0,
      totalStuck: 0,
      completedConversion: '',
      totalConsentSubmitted: 0,
      consentConversion: '',
    };

    for (const key in consentData) {
      const values = consentData[key];
      finalizedData.totalAttempts++;
      let status = 'STUCK';

      for (let index = 0; index < values.length; index++) {
        try {
          const value = values[index];
          if (value.status === 3) status = kCompleted;
          if (value.values.activity === 'VALIDATE_AA')
            finalizedData.totalConsentSubmitted++;
        } catch (error) {}
      }

      if (status == 'STUCK') finalizedData.totalStuck++;
      else if (status == kCompleted) finalizedData.totalCompleted++;

      finalizedList.push({
        bankCode: values[0].values.bankCode,
        loanId: values[0].loanId,
        status,
        userId: values[0].userId,
      });
    }

    // Total journey complete ratio
    if (finalizedData.totalAttempts === 0)
      finalizedData.completedConversion = '-';
    else if (finalizedData.totalCompleted === 0)
      finalizedData.completedConversion = '0%';
    else {
      finalizedData.completedConversion =
        Math.floor(
          (finalizedData.totalCompleted * 100) / finalizedData.totalAttempts,
        ) + '%';
    }

    // Consent submission complete ratio
    if (finalizedData.totalAttempts === 0)
      finalizedData.consentConversion = '-';
    else if (finalizedData.totalConsentSubmitted === 0)
      finalizedData.consentConversion = '0%';
    else {
      finalizedData.consentConversion =
        Math.floor(
          (finalizedData.totalConsentSubmitted * 100) /
            finalizedData.totalAttempts,
        ) + '%';
    }

    return targetData.isCount ? finalizedData : finalizedList;
  }

  private prepareDataForLogin(targetData) {
    const finalizedData = {
      totalAttempts: 0,
      totalCompleted: 0,
      totalStuck: 0,
      completedConversionRatio: '',
    };
    const lastStatusList = [];

    for (let index = targetData.logsList.length - 1; index >= 0; index--) {
      try {
        const log = targetData.logsList[index];
        const deviceId = log.deviceId;
        const step = log.values.step;

        // If deviceId already exists in lastStatusList, skip
        if (lastStatusList.some((item) => item.deviceId === deviceId)) {
          continue;
        }

        finalizedData.totalAttempts++;

        // Update counts based on the last status
        if (step === 1) {
          lastStatusList.push({ status: kInitiated, deviceId });
        } else if (step >= 16) {
          finalizedData.totalCompleted++;
          lastStatusList.push({ status: kCompleted, deviceId });
        } else {
          finalizedData.totalStuck++;
          lastStatusList.push({ status: kStuck, deviceId });
        }
      } catch (error) {}
    }

    // Calculate completed conversion ratio
    if (finalizedData.totalAttempts === 0) {
      finalizedData.completedConversionRatio = '-';
    } else if (finalizedData.totalCompleted === 0) {
      finalizedData.completedConversionRatio = '0%';
    } else {
      finalizedData.completedConversionRatio =
        Math.floor(
          (finalizedData.totalCompleted * 100) / finalizedData.totalAttempts,
        ) + '%';
    }

    return targetData.isCount ? finalizedData : lastStatusList;
  }
}
