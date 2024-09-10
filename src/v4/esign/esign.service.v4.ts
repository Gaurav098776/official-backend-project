import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kESignProcessingPath } from 'src/constants/directories';
import { ESignRepository } from 'src/repositories/esign.repository';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import * as fs from 'fs';
@Injectable()
export class EsignServiceV4 {
  constructor(
    private readonly eSignRepo: ESignRepository,
    private readonly sharedService: ESignSharedService,
  ) {}

  //#region zoop call back response
  async zoopCallBackURL(body) {
    const htmlData = (await fs.readFileSync(kESignProcessingPath)).toString();
    try {
      const rawData = body?.payload ?? '';
      const isJSONData = typeof rawData != 'string';
      const data = isJSONData ? rawData : JSON.parse(body?.payload ?? '');
      const document_id = data['request_id'];
      if (!document_id) return htmlData;
      const where = { document_id };
      const eSignData = await this.eSignRepo.getRowWhereData(
        ['id', 'loanId', 'userId'],
        { where },
      );
      if (eSignData == k500Error) return htmlData;
      if (!eSignData) htmlData;

      const id = eSignData.id;
      const updateData = { response: JSON.stringify(data) };
      const updatedResult = await this.eSignRepo.updateRowData(updateData, id);
      if (updatedResult == k500Error) return htmlData;
      await this.sharedService.checkStatus({ loanId: eSignData.loanId });
      return htmlData;
    } catch (e) {
      return htmlData;
    }
  }
  //#endregion
}
