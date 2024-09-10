// Imports
import { Injectable } from '@nestjs/common';
import { TypeService } from 'src/utils/type.service';
import { kParamMissing } from 'src/constants/responses';
import { LoanService } from 'src/admin/loan/loan.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { TransactionEntity } from 'src/entities/transaction.entity';
import {
  kCompleted,
  kFailed,
  kInitiated,
  kRefund,
} from 'src/constants/strings';
import { Op } from 'sequelize';
import { EmiEntity } from 'src/entities/emi.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { k500Error } from 'src/constants/misc';

@Injectable()
export class QAService {
  constructor(
    // Admin services
    private readonly loanService: LoanService,
    // Database
    private readonly repo: RepositoryManager,
    private readonly loanRepo: LoanRepository,
    // Utils
    private readonly typeService: TypeService,
  ) {}

  async bulkEMIDetails(reqData) {
    // Validation -> Parameters
    let loanIds = reqData.loanIds;
    if (!loanIds) return kParamMissing('loanIds');

    // Gather -> Loan details
    loanIds = [...new Set(loanIds)];
    const loanList = await this.loanService.getEMIDetails({ loanIds });

    const finalizedResult = {};
    const subList = this.typeService.splitToNChunks(loanList, 75);
    for (let index = 0; index < subList.length; index++) {
      try {
        const targetList = subList[index];
        const promiseList = [];
        for (let i = 0; i < targetList.length; i++) {
          try {
            promiseList.push(
              this.loanService.calculateEMIDetails(targetList[i]),
            );
          } catch (error) {}
        }
        const promiseResult = await Promise.all(promiseList);

        for (let i = 0; i < promiseResult.length; i++) {
          try {
            const result = promiseResult[i];
            const loanId = targetList[i].id;
            finalizedResult[loanId] = { emiDetails: result };
            finalizedResult[loanId].transactions =
              targetList[i].transactionData ?? [];
          } catch (error) {}
        }
      } catch (error) {}
    }

    return finalizedResult;
  }

  // api for QA automation for loan, emi and transaction data
  async getLoanEmiTransData(body) {
    try {
      const transInc = {
        model: TransactionEntity,
        attributes: null,
        where: {
          [Op.or]: [
            { status: kCompleted },
            { status: kFailed },
            { status: kInitiated, type: kRefund },
          ],
        },
        required: false,
      };
      const emiInc = { model: EmiEntity, attributes: null };
      const option = {
        where: { id: body?.loanId },
        include: [emiInc, transInc],
      };
      const loanAttr = [
        'id',
        'userId',
        'loanStatus',
        'interestRate',
        'netApprovedAmount',
        'loan_disbursement_date',
      ];
      const loanData = await this.loanRepo.getTableWhereData(loanAttr, option);
      if (loanData === k500Error) throw new Error();
      return loanData;
    } catch (error) {}
  }
}
