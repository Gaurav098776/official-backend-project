// Imports
import * as fs from 'fs';
import {
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { FileService } from 'src/utils/file.service';
import { MetricsEntity } from 'src/entities/metrics.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class MetricsSharedService {
  constructor(
    private readonly repo: RepositoryManager,
    private readonly fileService: FileService,
  ) {}

  async insertLog(reqData) {
    if (!reqData?.values?.bankCode && reqData.type != '1') return {};

    // Params validation
    const userId = reqData.userId;
    if (!userId && reqData.type != 3) return kParamMissing('userId');
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    const types = [1, 2, 3];
    if (!types.includes(type)) return kInvalidParamValue('type');
    const loanId = reqData.loanId;
    const status = reqData.status;
    if (!status) return kParamMissing('status');
    if (![1, 2, 3].includes(status)) return kInvalidParamValue('status');
    const subType = reqData.subType;
    const deviceId = reqData.deviceId;
    if (reqData.type == 3 && !deviceId) return kParamMissing('deviceId');
    const reqUrl = reqData.reqUrl;
    const values = reqData.values ?? {};
    const internalResponse = reqData.internalResponse;

    // Create log
    const creationData = {
      loanId,
      logDate: new Date(),
      reqUrl,
      status,
      subType,
      type,
      userId,
      values,
      deviceId,
    };
    const createdData = await this.repo.createRowData(
      MetricsEntity,
      creationData,
    );
    if (createdData == k500Error) return kInternalError;

    if (internalResponse)
      this.uploadAndSaveTracesData(createdData.id, internalResponse);
    return {};
  }

  async uploadAndSaveTracesData(id, content) {
    try {
      if (!content.includes('PERIODIC_HTML_FETCH ->')) return;
      const filePath = './upload/' + new Date().getTime().toString() + '.html';
      content = content.replace(/PERIODIC_HTML_FETCH ->/g, '');
      await fs.writeFileSync(filePath, content);
      const sourceUrl = await this.fileService.uploadFile(
        filePath,
        'Metrics',
        'html',
      );
      if (sourceUrl?.message) return sourceUrl;

      await this.repo.updateRowData(MetricsEntity, { sourceUrl }, id);
    } catch (error) {}
  }
}
