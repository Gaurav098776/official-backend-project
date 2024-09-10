// Imports
import { Injectable } from '@nestjs/common';
import { gIsPROD, kNotPlaceAutoDebit } from 'src/constants/globals';
import {
  kCalBySystem,
  kCashfree,
  kDevReqProhibited,
  kFailed,
  kInitiated,
} from 'src/constants/strings';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { k500Error } from 'src/constants/misc';
import { EmiEntity } from 'src/entities/emi.entity';
import { Op} from 'sequelize';
import { TypeService } from 'src/utils/type.service';

// This service is for development purposes only (For dummy operation in local or migration in prod)
@Injectable()
export class TransactionDevelopmentService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
  ) {}

  async addDummyTransaction(reqData) {
    try {
      if (gIsPROD) return k422ErrorMessage(kDevReqProhibited);

      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const paidAmount = reqData.paidAmount;
      if (!paidAmount) return kParamMissing('paidAmount');
      if (isNaN(paidAmount))
        return k422ErrorMessage('Invalid paidAmount value');
      if (paidAmount < 1 || paidAmount > 1000000)
        return k422ErrorMessage('Invalid paidAmount value');

      // Loan validation
      const emiInclude: any = { model: EmiEntity };
      emiInclude.attributes = ['id'];
      const attributes = ['loanStatus', 'userId'];
      const options = { include: emiInclude, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage('No data found');
      if (loanData.loanStatus != 'Active')
        return k422ErrorMessage('Loan is not active');
      const amount = this.typeService.manageAmount(paidAmount);
      // Create dummy data
      const emiList = loanData.emiData ?? [];
      emiList.sort((a, b) => a.id - b.id);
      const creationData: any = {
        accStatus: kCalBySystem,
        emiId: emiList[0].id,
        loanId,
        paidAmount: amount,
        status: kInitiated,
        type: 'PARTPAY',
        source: kCashfree,
        transactionId: new Date().getTime().toString(),
        userId: loanData.userId,
      };
      if (amount > paidAmount) {
        const roundOff = +(amount - paidAmount).toFixed(2);
        creationData.roundOff = roundOff;
      }
      const createdData = await this.repository.createRowData(creationData);
      if (createdData == k500Error) return kInternalError;

      return { id: createdData.id };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async markAsUnPlacedAutodebits() {
    try {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() - 7);
      const today = this.typeService.getGlobalDate(new Date()).toJSON();
      const attributes = ['id', 'loanId'];
      const options = {
        where: {
          subscriptionDate: { [Op.lt]: today },
          createdAt: { [Op.lte]: maxDate },
          response: null,
          utr: null,
          status: kInitiated,
          transactionId: { [Op.like]: '%-id-%' },
        },
      };

      const transList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (transList == k500Error) return kInternalError;

      for (let index = 0; index < transList.length; index++) {
        try {
          const transData = transList[index];
          const id = transData.id;

          // const updatedData = {
          //   status: kFailed,
          //   subStatus: kNotPlaceAutoDebit,
          // };
          // await this.repository.updateRowData(updatedData, id);
        } catch (error) {}
      }

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  
}
