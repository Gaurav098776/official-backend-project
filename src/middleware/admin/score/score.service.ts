import { Injectable } from '@nestjs/common';
import { PAGE_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { scoringFieldGroup } from 'src/entities/score.group.entity';
import { scoring } from 'src/entities/scoring.entity';
import { SalaryGradeRepository } from 'src/repositories/salaryGrade.repository';
import { SalaryRangeRepository } from 'src/repositories/salaryRange.repository';
import { ScoreCardRepository } from 'src/repositories/scoreCard.repository';
import { ScoringFieldRepository } from 'src/repositories/scoreField.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class ScoreService {
  constructor(
    private readonly salaryRangeRepo: SalaryRangeRepository,
    private readonly salaryGradeRepo: SalaryGradeRepository,
    private readonly scoreCardRepo: ScoreCardRepository,
    private readonly scoringFieldRepo: ScoringFieldRepository,
    private readonly employmentSectorRepo: EmployementSectoreRepository,
    private readonly typeService: TypeService,
  ) {}

  async funGetAllSalaryGrade(query) {
    try {
      const page = query?.page ?? 1;
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const options = {
        order: [
          ['scoreGrade', 'ASC'],
          ['minSalary', 'ASC'],
        ],
        offset,
        limit: PAGE_LIMIT,
      };
      const attributes = [
        'id',
        'scoreGrade',
        'minSalary',
        'maxSalary',
        'approvedAmount',
      ];
      const salaryGradeData: any =
        await this.salaryRangeRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );
      if (salaryGradeData === k500Error) return kInternalError;
      const finalData: any = this.prepareFinalSalaryGradeData(
        salaryGradeData.rows,
      );
      if (finalData?.message) return finalData;
      return { count: salaryGradeData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareFinalSalaryGradeData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData = {};
          tempData['id'] = ele?.id;
          tempData['Grade'] = ele?.scoreGrade ?? '-';
          tempData['Minimum salary'] = ele?.minSalary ?? '-';
          tempData['Maximum salary'] = ele?.maxSalary ?? '-';
          tempData['Approved amount'] = ele?.approvedAmount ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      kInternalError;
    }
  }

  async funGetAllScoreGrade(query) {
    try {
      const page = query?.page ?? 1;
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const options = {
        offset,
        limit: PAGE_LIMIT,
      };
      const attributes = ['id', 'minscore', 'maxscore', 'scoregrade'];
      const scoreGradeData: any =
        await this.salaryGradeRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );
      if (scoreGradeData === k500Error) return kInternalError;
      const finalData: any = this.prepareFinalScoreGradeData(
        scoreGradeData.rows,
      );
      if (finalData?.message) return finalData;
      return { count: scoreGradeData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareFinalScoreGradeData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData = {};
          tempData['id'] = ele?.id;
          tempData['Minimum point'] = ele?.minscore ?? '-';
          tempData['Maximum point'] = ele?.maxscore ?? '-';
          tempData['Score'] = ele?.scoregrade ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      kInternalError;
    }
  }

  async getAllVersionData(query) {
    try {
      const page = query?.page ?? 1;
      const offset = page * PAGE_LIMIT - PAGE_LIMIT;
      const options = {
        offset,
        limit: PAGE_LIMIT,
        order: [['createdAt', 'DESC']],
      };
      const attributes = ['scoreCardId', 'name', 'isActive', 'createdAt'];
      const scoreCardData = await this.scoreCardRepo.getTableWhereData(
        attributes,
        options,
      );
      if (scoreCardData === k500Error) return kInternalError;
      const finalData: any = this.prepareFinalScoreCardData(scoreCardData);
      if (finalData?.message) return finalData;
      return { count: scoreCardData.length, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareFinalScoreCardData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData = {};
          const createdAt = this.typeService.getDateFormatted(ele?.createdAt);
          tempData['No'] = ele?.scoreCardId ?? '-';
          tempData['Date'] = createdAt ?? '-';
          tempData['Version'] = ele?.name ?? '-';
          tempData['Action'] = ele?.isActive == '1' ? 'Yes' : 'No';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      kInternalError;
    }
  }

  async allScoringByField() {
    try {
      const scoringFieldData = await this.getScoringFieldData();
      if (scoringFieldData === k500Error) return kInternalError;
      const finalData: any =
        this.prepareFinalScoringFieldData(scoringFieldData);
      if (finalData?.message) return finalData;

      //preparing basics Data scores
      let basics1Data = {};
      for (let i = 1; i < 3; i++) {
        try {
          basics1Data[`score${i}Data`] = finalData
            .filter((scoreData) => {
              return scoreData.scoreId == i;
            })
            .sort((a, b) => a.order - b.order);
        } catch (error) {}
      }

      //preparing professional Data scores
      let professional1Data = {};
      for (let i = 3; i < 9; i++) {
        try {
          professional1Data[`score${i}Data`] = finalData
            .filter((scoreData) => {
              return scoreData.scoreId == i;
            })
            .sort((a, b) => a.order - b.order);
        } catch (error) {}
      }

      //preparing netBanking Data scores
      let netBanking1Data: any = {};
      for (let i = 9; i < 35; i++) {
        try {
          netBanking1Data[`score${i}Data`] = finalData
            .filter((scoreData) => {
              return scoreData.scoreId == i;
            })
            .sort((a, b) => a.order - b.order);
        } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
      }
      return {
        BasicLoanDetails: basics1Data,
        ProfessionalDetails: professional1Data,
        NetBankingDetails: netBanking1Data,
      };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  private async getScoringFieldData() {
    try {
      const scoreCardRes = await this.getActiveScore();
      if (scoreCardRes === k500Error || !scoreCardRes.scoreCardId) {
        return kInternalError;
      }
      const id = scoreCardRes.scoreCardId;
      const scoringInclude = {
        attributes: ['score', 'descriptionId', 'scoringId', 'version'],
        where: { version: id },
        model: scoring,
      };
      const scoringFieldInclude = {
        attributes: ['descriptionName', 'orderingDisplay', 'type'],
        model: scoringFieldGroup,
        include: [scoringInclude],
      };
      const options = {
        include: [scoringFieldInclude],
      };
      const attributes = ['scoreId', 'scoreFieldName', 'scoreIsFlag'];
      const scoringFieldData = await this.scoringFieldRepo.getTableWhereData(
        attributes,
        options,
      );
      if (scoringFieldData?.message) return scoringFieldData;
      return scoringFieldData;
    } catch (error) {
      kInternalError;
    }
  }

  private prepareFinalScoringFieldData(scoringFieldData) {
    try {
      const finalData = [];
      scoringFieldData.map((scoreData) => {
        try {
          const tempData = {
            scoreId: scoreData?.scoreId,
            name: scoreData?.scoreFieldName,
            scoreFlag: scoreData?.scoreIsFlag,
            type: scoreData?.scoreField.type,
            order: scoreData?.scoreField?.orderingDisplay,
            score: scoreData?.scoreField?.score?.score,
            description: scoreData?.scoreField?.descriptionName,
            scoringId: scoreData?.scoreField?.score?.scoringId,
            descriptionId: scoreData?.scoreField?.score?.descriptionId,
            version: scoreData?.scoreField?.score?.version,
          };
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getActiveScore() {
    try {
      const options = {
        where: { isActive: '1' },
      };
      const attributes = ['scoreCardId'];
      const data = await this.scoreCardRepo.getRowWhereData(
        attributes,
        options,
      );
      return data;
    } catch (error) {
      kInternalError;
    }
  }

  async getAllSectorData() {
    try {
      const attributes = ['id', 'sectorName', 'sectorStatusVerified'];
      const options = {};
      const sectorData: any = await this.employmentSectorRepo.getTableWhereData(
        attributes,
        options,
      );
      if (sectorData === k500Error) return kInternalError;
      const finalData = this.prepareSectorFinalData(sectorData);
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private prepareSectorFinalData(list) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          if (ele?.sectorStatusVerified) {
            ele.sectorStatusVerified =
              ele.sectorStatusVerified == '0' ? 'Yes' : 'No';
          }
          const tempData = {};
          tempData['No'] = ele?.id ?? '-';
          tempData['Name'] = ele?.sectorName ?? '-';
          tempData['Is blackList?'] = ele?.sectorStatusVerified ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
