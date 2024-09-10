import sequelize from 'sequelize';
import { Inject, Injectable } from '@nestjs/common';
import { scoring } from 'src/entities/scoring.entity';
import { scoreCard } from 'src/entities/score.card.entity';
import { scoringFieldGroup } from 'src/entities/score.group.entity';
import {
  APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY,
  SALARYGRADE_REPOSITORY,
  SCORECARD_REPOSITORY,
  SCORINGFIELDGROUP_REPOSITORY,
  SCORINGFIELD_REPOSITORY,
} from 'src/constants/entities';
import { salaryGrade } from 'src/entities/salary.grade.entity';
import { approvedLoanAmountFromSalary } from 'src/entities/salary.range.entity';
import { k500Error } from 'src/constants/misc';
import { scoringField } from 'src/entities/score.field.entity';
const Op = sequelize.Op;

@Injectable()
export class ScoreRepository {
  constructor(
    @Inject(SALARYGRADE_REPOSITORY)
    private readonly salaryGradeRepo: typeof salaryGrade,
    @Inject(APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY)
    private readonly salaryRangeRepo: typeof approvedLoanAmountFromSalary,
    @Inject(SCORECARD_REPOSITORY)
    private readonly scoreCardRepo: typeof scoreCard,
    @Inject(SCORINGFIELDGROUP_REPOSITORY)
    private readonly scoreGroupRepo: typeof scoringFieldGroup,
    @Inject(SCORINGFIELD_REPOSITORY)
    private readonly scoringFieldRepo: typeof scoringField,
  ) {}

  private async getActiveScoreId() {
    try {
      return await this.scoreCardRepo.findOne<scoreCard>({
        where: { isActive: '1' },
      });
    } catch (error) {
      return k500Error;
    }
  }

  async findScoreData(id, value) {
    try {
      const activeScore: any = await this.getActiveScoreId();
      if (activeScore === k500Error) return activeScore;
      const scoreId = activeScore?.scoreCardId;
      const where = {
        scoreId: id,
        start: { [Op.lte]: value },
        end: { [Op.gte]: value },
      };
      if (scoreId)
        return await this.scoreGroupRepo.findOne({
          nest: true,
          raw: true,
          where,
          include: [
            {
              attributes: ['score'],
              where: { version: scoreId },
              model: scoring,
            },
          ],
        });
      else
        return await this.scoreGroupRepo.findOne({
          nest: true,
          raw: true,
          where,
          include: [{ attributes: ['score'], model: scoring }],
        });
    } catch (error) {
      return k500Error;
    }
  }

  async getGradeByScoreRange(score: number) {
    try {
      return await this.salaryGradeRepo.findOne({
        where: {
          minscore: { [Op.lte]: score },
          maxscore: { [Op.gte]: score },
        },
        raw: true,
      });
    } catch (error) {
      return k500Error;
    }
  }

  async getAmountBySalary(bySalary: { salary: any; grade: string }) {
    try {
      const data = await this.salaryRangeRepo.findOne({
        where: {
          scoreGrade: bySalary.grade,
          [Op.or]: [
            {
              minSalary: { [Op.lte]: bySalary.salary },
              maxSalary: { [Op.gte]: bySalary.salary },
            },
          ],
        },
        raw: true,
      });
      const scoreAmount = data?.approvedAmount ?? 0;
      if (scoreAmount && scoreAmount != 0) return data;
      return await this.salaryRangeRepo.findOne({
        where: {
          scoreGrade: bySalary.grade,
          [Op.or]: [
            {
              minSalary: { [Op.lte]: bySalary.salary - 1 },
              maxSalary: { [Op.gte]: bySalary.salary - 1 },
            },
          ],
        },
        raw: true,
      });
    } catch (error) {
      return k500Error;
    }
  }
}
