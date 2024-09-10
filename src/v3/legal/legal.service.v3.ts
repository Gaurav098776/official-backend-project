// Imports
import { Injectable } from '@nestjs/common';
import {
  CASE_FILLED,
  DEMAND_STATUS,
  LEGAL_STATUS,
  SUMMONS,
  WARRENT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import {
  kLegalDemandLetterIcon,
  kLegalNoticeIcon,
  kLegalSummonsIcon,
  kLegalWarrantIcon,
} from 'src/constants/directories';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class LegalServiceV3 {
  constructor(
    private readonly legalCollectionRepo: LegalCollectionRepository,
    private readonly emiRepo: EMIRepository,
    private readonly typeService: TypeService,
  ) {}

  async addLegalDocs(query) {
    // Validation -> Parameters
    const loanId = query?.loanId;
    if (!loanId) return kParamMissing('loanId');

    const isDelayed = await this.emiRepo.getTableWhereData(
      ['id', 'partOfemi'],
      { where: { loanId, payment_due_status: '1' } },
    );
    if (!isDelayed || isDelayed.length == 0 || isDelayed == k500Error)
      return {};
    const attributes = ['caseDetails', 'id', 'type', 'url', 'createdAt'];
    const options = { where: { loanId }, order: [['id', 'DESC']] };
    const legalData = await this.legalCollectionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (legalData === k500Error) throw new Error();

    const data: any = {};
    const documents = [];
    const allType = [];
    const docType = [DEMAND_STATUS, SUMMONS, WARRENT, LEGAL_STATUS];

    // Preparation -> Legal data
    for (let index = 0; index < legalData.length; index++) {
      try {
        const noticeData = legalData[index];
        const type = noticeData?.type;
        if (type && !allType.includes(type)) allType.push(type);
        if (docType.includes(type)) {
          const formattedDate = this.typeService.dateToJsonStr(
            noticeData.createdAt,
            'DD/MM/YYYY',
          );
          const preparedObj = this.prepareLegalData(noticeData.type);
          preparedObj.url = noticeData.url;
          preparedObj.previewTitle = 'Created date: ' + formattedDate;
          documents.push(preparedObj);
        }
      } catch (error) {}
    }

    documents.sort((a, b) => a.id - b.id);
    data.documents = documents;
    // It will be return if the last EMI is not in default
    const partOfemi = isDelayed.find((el) => el.partOfemi === 'LAST');
    if (!partOfemi) return data;

    //legal steeper Data
    const legalSteeperInfo: any = [
      { name: 'Demand letter' },
      { name: 'Legal notice' },
      { name: 'Case filed' },
      { name: 'Summons' },
      { name: 'Warrant' },
    ];
    if (!allType.includes(1)) {
      legalSteeperInfo.splice(
        legalSteeperInfo.findIndex((item) => item?.name === 'Demand letter'),
        1,
      );
    }

    let stepperData = { isPendingAssigned: false };
    for (let index = 0; index < legalSteeperInfo.length; index++) {
      try {
        const ele = legalSteeperInfo[index];
        const key = ele?.name ?? '';
        if (key == 'Demand letter')
          this.latestLegalAction(legalData, allType, ele, 1, stepperData);
        else if (key == 'Legal notice')
          this.latestLegalAction(legalData, allType, ele, 2, stepperData);
        else if (key == 'Case filed')
          this.latestLegalAction(legalData, allType, ele, 5, stepperData);
        else if (key == 'Summons')
          this.latestLegalAction(legalData, allType, ele, 6, stepperData);
        else if (key == 'Warrant')
          this.latestLegalAction(legalData, allType, ele, 7, stepperData);
        else if (key == 'Case withdrawal')
          this.latestLegalAction(legalData, allType, ele, 8, stepperData);
        else if (key == 'Case disposal')
          this.latestLegalAction(legalData, allType, ele, 9, stepperData);
      } catch (error) {}
    }
    data.steeperInfo = legalSteeperInfo;
    return data;
  }

  private prepareLegalData(type) {
    const obj: any = {
      [DEMAND_STATUS]: {
        title: 'Demand letter',
        url: '',
        id: DEMAND_STATUS,
        icon: kLegalDemandLetterIcon,
      },
      [LEGAL_STATUS]: {
        title: 'Legal notice',
        url: '',
        id: LEGAL_STATUS,
        icon: kLegalNoticeIcon,
      },
      [SUMMONS]: {
        title: 'Summons',
        id: SUMMONS,
        url: '',
        icon: kLegalSummonsIcon,
      },
      [WARRENT]: {
        title: 'Warrant',
        id: WARRENT,
        url: '',
        icon: kLegalWarrantIcon,
      },
    };
    return obj[type];
  }

  latestLegalAction(legalData, allType, ele, type, stepperData) {
    try {
      if (allType.includes(type)) {
        const dL = legalData
          .filter((item) => item?.type === type)
          .sort((a, b) => b?.createdAt - a?.createdAt)[0];

        if (dL.type === CASE_FILLED)
          dL.createdAt = new Date(
            dL.caseDetails?.caseFiledDate ?? dL.createdAt,
          );

        ele.date = this.typeService.getGlobalDate(dL.createdAt);
        ele.isDone = true;
      } else if (!stepperData.isPendingAssigned) {
        stepperData.isPendingAssigned = true;
        ele.isPending = true;
      } else ele.isAwaited = true;
    } catch (error) {
      return ele;
    }
  }
}
