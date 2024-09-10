// Imports
import { Op } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { loanTransaction } from 'src/entities/loan.entity';
import { TypeService } from 'src/utils/type.service';
import { registeredUsers } from 'src/entities/user.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { CryptService } from 'src/utils/crypt.service';
import { k500Error } from 'src/constants/misc';
import { EMIRepository } from 'src/repositories/emi.repository';
import { PAGE_LIMIT } from 'src/constants/globals';
import { kCompleted, kEMIPay, kFullPay, kPartPay } from 'src/constants/strings';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { FileService } from 'src/utils/file.service';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
@Injectable()
export class ReportEmiService {
  constructor(
    // Repositories
    private readonly emiRepo: EMIRepository,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    // Utils
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly fileService: FileService,
    // Shared services
    private readonly sharedCalculation: CalculationSharedService,
  ) {}

  async getAllEMIDataDateWise(query) {
    try {
      if (!query.startDate || !query.endDate) return kParamMissing('date');
      if (!query.download && !query.page) return kParamMissing('page');
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const options = await this.prepareEMIDataOptions(query);
      if (options?.message) return options;
      const emiData: any = await this.emiRepo.getAllRawDataWithCount(
        [
          'emiNumber',
          'id',
          'emi_date',
          'pay_type',
          'fullPayPrincipal',
          'fullPayInterest',
          'fullPayPenalty',
          'principalCovered',
          'interestCalculate',
          'penalty',
          'payment_status',
          'payment_due_status',
          'payment_done_date',
          'waiver',
          'paid_waiver',
          'unpaid_waiver',
          'partPaymentPenaltyAmount',
          'loanId',
          'regInterestAmount',
          'paidRegInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'paidBounceCharge',
          'totalPenalty',
          'dpdAmount',
          'penaltyChargesGST',
          'paidPenalCharge',
          'legalCharge',
          'legalChargeGST',
          'paidLegalCharge',
        ],
        options,
      );
      if (emiData === k500Error) return kInternalError;
      const finalData = [];

      for (let index = 0; index < emiData?.rows.length; index++) {
        try {
          const ele = emiData?.rows[index];
          const user = ele?.user;
          const loan = ele?.loan;
          const transData = loan?.transactionData;
          let totalPaid = 0;
          for (let i = 0; i < transData.length; i++) {
            try {
              const el = transData[i];
              if (ele.id === el.emiId) totalPaid += el.paidAmount ?? 0;
            } catch (error) {}
          }
          const emiList = loan?.emiData;
          if (emiList) emiList.sort((a, b) => a?.id - b?.id);

          const obj = {};
          obj['userId'] = user?.id ?? '-';
          obj['Name'] = user?.fullName ?? '-';
          obj['Phone number'] =
            this.cryptService.decryptPhone(user?.phone) ?? '-';
          obj['Loan Id'] = loan?.id ?? '-';
          obj['Interest rate'] = loan?.interestRate ?? '-';
          obj['Loan disbursement date'] =
            this.typeService.getDateFormatted(loan?.loan_disbursement_date) ??
            '-';
          obj['Loan status'] = loan?.loanStatus ?? '-';
          obj['Approved amount'] = loan?.netApprovedAmount
            ? loan?.netApprovedAmount
            : '-';
          for (let i = 1; i <= 4; i++) {
            try {
              const emi = emiList[i - 1];
              const amount = +emi?.emi_amount;
              const eDate = emi?.emi_date;
              if (+emi.totalPenalty > 0) emi.bounceCharge = 0;
              if (+emi.dpdAmount > 0) {
                let cGstOnPenal = this.typeService.manageAmount(
                  (+emi.penaltyChargesGST ?? 0) / 2,
                );
                let sGstOnPenal = this.typeService.manageAmount(
                  (+emi.penaltyChargesGST ?? 0) / 2,
                );
                emi.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
              }
              const principal = +emi?.principalCovered;
              const interest = +emi?.interestCalculate;
              let totalPenalty =
                (+emi?.totalPenalty ?? 0) +
                (+emi.dpdAmount ?? 0) +
                (+emi.penaltyChargesGST ?? 0) +
                (+emi.bounceCharge ?? 0) +
                (+emi.gstOnBounceCharge ?? 0) +
                (+emi.regInterestAmount ?? 0) +
                (+emi.legalCharge ?? 0) +
                (+emi.legalChargeGST ?? 0);
              totalPenalty = this.typeService.manageAmount(totalPenalty);
              let remainingBounceCharge =
                (+emi.bounceCharge ?? 0) +
                (+emi.gstOnBounceCharge ?? 0) -
                (+emi.paidBounceCharge ?? 0);
              let remainingDeferredInt =
                (+emi.regInterestAmount ?? 0) -
                (+emi.paidRegInterestAmount ?? 0);
              let remainingLegalCharge =
                (+emi.legalCharge ?? 0) +
                (+emi.legalChargeGST ?? 0) -
                (+emi.paidLegalCharge ?? 0);
              let remainingPenalCharge =
                (+emi.penalty ?? 0) +
                (+emi.dpdAmount ?? 0) +
                (+emi.penaltyChargesGST ?? 0) -
                (+emi.paidPenalCharge ?? 0);
              remainingBounceCharge = this.typeService.manageAmount(
                remainingBounceCharge,
              );
              remainingDeferredInt =
                this.typeService.manageAmount(remainingDeferredInt);
              remainingLegalCharge =
                this.typeService.manageAmount(remainingLegalCharge);
              remainingPenalCharge =
                this.typeService.manageAmount(remainingPenalCharge);
              const remainingPenalty =
                remainingPenalCharge +
                remainingDeferredInt +
                remainingBounceCharge +
                remainingLegalCharge;
              const doneDate = emi?.payment_done_date;
              obj[`EMI ${i} amount`] = this.typeService.amountNumberWithCommas(
                amount ? amount.toFixed(2) : '-',
              );
              obj[`EMI ${i} due date`] = eDate
                ? this.typeService.getDateFormatted(eDate)
                : '-';
              obj[`EMI ${i} principal`] =
                this.typeService.amountNumberWithCommas(
                  principal ? principal : '-',
                );
              obj[`EMI ${i} interest`] =
                this.typeService.amountNumberWithCommas(
                  interest ? interest : '-',
                );
              obj[`EMI ${i} Total Penalty`] = totalPenalty
                ? this.typeService.amountNumberWithCommas(totalPenalty)
                : '-';
              obj[`EMI ${i} Remaining Penalty`] = remainingPenalty
                ? this.typeService.amountNumberWithCommas(remainingPenalty)
                : '-';
              obj[`EMI ${i} done date`] = doneDate
                ? this.typeService.getDateFormatted(doneDate)
                : '-';
            } catch (error) {}
          }
          obj[`paid amount`] =
            this.typeService.amountNumberWithCommas(totalPaid);

          finalData.push(obj);
        } catch (error) {}
      }
      if (query.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Emi due.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;

        const updatedData = { downloadUrl: url, status: '1' };
        await this.reportHistoryRepo.updateRowData(
          updatedData,
          query.downloadId,
        );
        return { fileUrl: url };
      }
      return { count: emiData?.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async prepareEMIDataOptions(query) {
    try {
      const startDate = this.typeService.getGlobalDate(query?.startDate);
      const endDate = this.typeService.getGlobalDate(query?.endDate);
      const page = +query?.page ?? 1;
      const download = query?.download ?? 'false';
      const searchText = query?.searchText;
      let userOptions: any = {};
      if (searchText) {
        let encrPhone = '';
        if (!isNaN(searchText)) {
          encrPhone = this.cryptService.encryptPhone(searchText);
          encrPhone = encrPhone.split('===')[1];
          userOptions = {
            phone: { [Op.iRegexp]: encrPhone },
          };
        } else
          userOptions = {
            fullName: { [Op.iRegexp]: searchText },
          };
      }
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['id', 'fullName', 'phone'];
      if (searchText) userInclude.where = userOptions;
      const transInclude: { model; attributes?; where?; required? } = {
        model: TransactionEntity,
      };
      transInclude.attributes = [
        'id',
        'interestAmount',
        'penaltyAmount',
        'type',
        'paidAmount',
      ];
      transInclude.required = false;
      transInclude.where = {
        status: kCompleted,
        type: { [Op.in]: [kEMIPay, kPartPay, 'REFUND'] },
      };
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_date',
          'pay_type',
          'fullPayPrincipal',
          'fullPayInterest',
          'fullPayPenalty',
          'principalCovered',
          'interestCalculate',
          'penalty',
          'payment_status',
          'payment_due_status',
          'payment_done_date',
          'waiver',
          'paid_waiver',
          'unpaid_waiver',
          'partPaymentPenaltyAmount',
          'loanId',
          'regInterestAmount',
          'paidRegInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'paidBounceCharge',
          'totalPenalty',
          'dpdAmount',
          'penaltyChargesGST',
          'paidPenalCharge',
          'legalCharge',
          'legalChargeGST',
          'paidLegalCharge',
        ],
        include: [transInclude],
      };
      const loanAttr = [
        'id',
        'interestRate',
        'loan_disbursement_date',
        'loanStatus',
        'netApprovedAmount',
      ];
      const transactionInclude: any = {
        model: TransactionEntity,
        required: false,
        attributes: [
          'id',
          'paidAmount',
          'type',
          'penaltyAmount',
          'principalAmount',
          'interestAmount',
          'emiId',
          'loanId',
        ],
        where: { status: 'COMPLETED' },
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: loanAttr,
        include: [emiInclude, transactionInclude],
      };
      const options: any = {
        where: {
          emi_date: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
        order: [['id', 'DESC']],
        distinct: true,
        include: [userInclude, loanInclude],
      };
      if (download != 'true' && !searchText) {
        options.offset = page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = 1 * PAGE_LIMIT;
      }
      return options;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getCompletedEmiData(start_date: Date, end_date: Date) {
    try {
      return await this.emiRepo.getTableWhereData(['id'], {
        where: {
          payment_status: '1',
          payment_done_date: {
            [Op.gte]: start_date.toJSON(),
            [Op.lte]: end_date.toJSON(),
          },
        },
        include: [
          {
            model: loanTransaction,
            where: { loanStatus: 'Complete' },
            attributes: ['id'],
          },
        ],
        raw: true,
        nest: true,
      });
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
}
