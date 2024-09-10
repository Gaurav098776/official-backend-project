import { Inject, Injectable } from '@nestjs/common';
import { SALARYGRADE_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { salaryGrade } from 'src/entities/salary.grade.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class SalaryGradeRepository {
  constructor(
    @Inject(SALARYGRADE_REPOSITORY)
    private readonly repository: typeof salaryGrade,
    private readonly repoManager: RepositoryManager,
  ) {}

  async getTableWhereDataWithCounts(attributes: string[], options: any) {
    try {
      return this.repoManager.getTableCountWhereData(
        this.repository,
        attributes,
        options,
      );
    } catch (error) {
      return k500Error;
    }
  }
}
