import { Inject, Injectable } from '@nestjs/common';
import { APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY } from 'src/constants/entities';
import { k500Error } from 'src/constants/misc';
import { approvedLoanAmountFromSalary } from 'src/entities/salary.range.entity';
import { RepositoryManager } from './repository.manager';

@Injectable()
export class SalaryRangeRepository {
  constructor(
    @Inject(APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY)
    private readonly repository: typeof approvedLoanAmountFromSalary,
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
