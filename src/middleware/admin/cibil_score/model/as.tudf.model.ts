import { tudfMemberName } from 'src/constants/globals';
import { k500Error, k999Error } from 'src/constants/misc';
import { EmiEntity } from 'src/entities/emi.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { convertDateInDDMMYYYY, TypeService } from 'src/utils/type.service';

export class ASModel {
  TL: string = 'TL04T001';
  memberCode: string = '';
  memberName: string = '0207' + tudfMemberName;
  accountNumber: string = '';
  accountType: string = '040205';
  ownershipIndicator: string = '05011';
  disbursedDate: string = '';
  paymentLastDate: string = '';
  dateClosed: string = '';
  dateReported: string = '';
  sanctionedAmount: string = '';
  currentBalance: string = ''; ///baki
  amountOverdue: string = '';
  dueDay: string = '';
  suitFiled: string = '210200';
  settledStaus: string = '';
  assetClassification: string = '260201';
  repaymentTenure: string = '';
  emiAmount: string = '';
  writtenOffAmount: string = '';
  writtenOffPAmount: string = '';
  settledAmount: string = '';
  paymentFrequency: string = '440203';
  paymentAmount: string = '';
  occupationCode: string = '460201';
  netIncome: string = '';
  netIndicator: string = '';
  monthlyIndicator: string = '';
  oldAccountNumber: string = '';

  //#region fill data
  fillData(loan: loanTransaction, toDate: any, memberCode, memberName, settledData) {
    try {
      if (!memberCode) return k500Error;
      const model: ASModel = new ASModel();
      model.memberCode = this.addCodeAndLength('01', memberCode);
      model.memberName = this.addCodeAndLength('02', memberName);
      const accountNumber = 'CF' + loan?.id ?? '';
      model.accountNumber = this.addCodeAndLength('03', accountNumber);
      const disbursedDate = convertDateInDDMMYYYY(loan.loan_disbursement_date);
      model.disbursedDate = this.addCodeAndLength('08', disbursedDate);
      model.paymentLastDate = this.findLastPaymentDate(loan);
      model.dateClosed = this.getLoanClosedDate(loan);
      if (toDate) {
        const dateReported = convertDateInDDMMYYYY(toDate);
        model.dateReported = this.addCodeAndLength('11', dateReported);
      }

      let amount = +loan.netApprovedAmount;
      amount = Math.round(amount);
      model.sanctionedAmount = this.addCodeAndLength('12', amount.toString());

      model.currentBalance = this.findcurrentBalance(loan);
      const dueAmountAndDay = this.getOverDueAmountAndDueDay(loan, toDate);
      model.amountOverdue = dueAmountAndDay.overdueAmount;
      model.dueDay = dueAmountAndDay.dueDay;

      const settled = this.findSettledStaus(loan, settledData);
      if (settled) {
        model.settledStaus = settled.staus;
        model.writtenOffAmount = this.addCodeAndLength('41', settled.amount);
        model.writtenOffPAmount = this.addCodeAndLength(
          '42',
          settled.principalWaiver,
        );
        model.settledAmount = this.findActualAmount(loan, '43');
      }
      if (loan.approvedDuration)
        model.repaymentTenure = this.getRepaymentTenure(loan.emiData);
      model.emiAmount = this.findEmiAmount(loan.emiData, toDate);
      model.paymentAmount = this.findActualAmount(loan);
      try {
        let salary =
          loan?.bankingData?.adminSalary ?? loan?.bankingData?.salary ?? 0;
        if (salary) {
          try {
            salary = Math.round(salary);
            if (salary) {
              model.netIncome = this.addCodeAndLength('47', salary.toString());
              model.netIndicator = '4801N';
              model.monthlyIndicator = '4901M';
            }
          } catch (error) {}
        }
      } catch (error) {}
      model.suitFiled = this.getSuitFiled(loan, dueAmountAndDay.dueDay);
      model.assetClassification = this.getAssetClassification(
        loan,
        dueAmountAndDay.dueDay,
      );
      return model;
    } catch (error) {
      return null;
    }
  }
  //#endregion

  //#region convert in cibil format
  convertInFormat() {
    try {
      //// this call for Required filed only
      let formateText = '';
      formateText += this.TL;
      formateText += this.memberCode;
      formateText += this.memberName;
      formateText += this.accountNumber;
      formateText += this.accountType;
      formateText += this.ownershipIndicator;
      formateText += this.disbursedDate;
      formateText += this.paymentLastDate;
      formateText += this.dateClosed;
      formateText += this.dateReported;
      formateText += this.sanctionedAmount;
      formateText += this.currentBalance;
      formateText += this.amountOverdue;
      formateText += this.dueDay;
      formateText += this.oldAccountNumber;
      formateText += this.suitFiled;
      formateText += this.settledStaus;
      formateText += this.assetClassification;
      formateText += this.repaymentTenure;
      formateText += this.emiAmount;
      formateText += this.writtenOffAmount;
      formateText += this.writtenOffPAmount;
      formateText += this.settledAmount;
      formateText += this.paymentFrequency;
      formateText += this.paymentAmount;
      formateText += this.occupationCode;
      formateText += this.netIncome;
      formateText += this.netIndicator;
      formateText += this.monthlyIndicator;
      if (formateText.length > 433) k999Error;
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region add code and length
  addCodeAndLength(code: string, value: string) {
    if (value) {
      if (value.length > 0) {
        let length: number = value.length;
        return code + (length < 10 ? '0' + length : length) + value;
      }
    }
    return '';
  }
  //#endregion

  //#region  find last payment date
  findLastPaymentDate(loanData: loanTransaction) {
    try {
      let lastPaymentData;
      /// transaction Data
      loanData.transactionData.forEach((element) => {
        try {
          if (element.status == 'COMPLETED') {
            let emiDate = new Date(element.completionDate).getTime();
            if (lastPaymentData) {
              if (emiDate > lastPaymentData) lastPaymentData = emiDate;
            } else lastPaymentData = emiDate;
          }
        } catch (error) {}
      });
      if (lastPaymentData) {
        return this.addCodeAndLength(
          '09',
          convertDateInDDMMYYYY(new Date(lastPaymentData).toJSON()),
        );
      } else return '';
    } catch (error) {}
    return '';
  }
  //#endregion

  //#region  get loan closed date
  getLoanClosedDate(loan: loanTransaction) {
    try {
      if (loan.loanStatus != 'Complete') return '';
      let emiData: EmiEntity[] = loan.emiData;
      emiData = emiData.sort(
        (a, b) =>
          new Date(a.payment_done_date).getTime() -
          new Date(b.payment_done_date).getTime(),
      );
      let date = emiData[emiData.length - 1].payment_done_date;
      date = convertDateInDDMMYYYY(date);
      if (date) return this.addCodeAndLength('10', date);
    } catch (error) {}
    return '';
  }
  //#endregion

  //#region get overdue amount and due day
  private getOverDueAmountAndDueDay(loan: loanTransaction, toDate) {
    let dueDay = '';
    let overdueAmount = '';
    let amount = 0;
    let penalty_days = 0;
    try {
      if (loan?.loanStatus !== 'Complete') {
        let prev_emiDate;
        const emiData = loan.emiData.sort((a, b) => a.id - b.id);
        emiData.reverse();
        emiData.forEach((emi) => {
          try {
            let isLess = true;
            if (emi.payment_done_date)
              isLess = !(
                new Date(emi.payment_done_date).getTime() <=
                new Date(toDate).getTime()
              );
            else if (emi.payment_status === '1') isLess = false;
            if (emi.emi_date && isLess)
              isLess =
                new Date(emi.emi_date).getTime() <= new Date(toDate).getTime();
            if (
              (emi.payment_status === '0' &&
                emi.payment_due_status === '1' &&
                isLess) ||
              isLess
            ) {
              const emi_date = new Date(emi.emi_date);
              const pDay = +emi.penalty_days;
              if (+emi.penalty > 0 && +emi.bounceCharge == 500)
                emi.bounceCharge = 0;
              amount +=
                // Principal + Interest(Remaining)
                (+emi.emi_amount ?? 0) +
                // Penalty(Penalty + Bounce)(Only For Old User)
                (+emi.penalty ?? 0) +
                // Deferred Interest
                ((+emi.regInterestAmount ?? 0) -
                  (+emi.paidRegInterestAmount ?? 0)) +
                // ECS
                ((+emi.bounceCharge ?? 0) +
                  (+emi.gstOnBounceCharge ?? 0) -
                  (+emi.paidBounceCharge ?? 0)) +
                // Penal Charges(Only For New User)
                ((+emi.dpdAmount ?? 0) +
                  (+emi.penaltyChargesGST ?? 0) -
                  (+emi.paidPenalCharge ?? 0)) +
                // Legal Charges
                ((+emi.legalCharge ?? 0) +
                  (+emi.legalChargeGST ?? 0) -
                  (+emi.paidLegalCharge ?? 0));
              if (prev_emiDate) {
                const day = this.getDurationDay(emi_date, prev_emiDate);
                if (+day > pDay) penalty_days += pDay;
                else penalty_days += +day;
              } else penalty_days += pDay;
              prev_emiDate = emi_date;
            }
          } catch (error) {}
        });
        if (penalty_days > 900) penalty_days = 900;
        amount = Math.round(amount);
        if (penalty_days === 0) amount = 0;
      }
    } catch (error) {}
    overdueAmount = this.addCodeAndLength('14', amount.toString());
    dueDay = this.addCodeAndLength('15', penalty_days.toString());
    return { overdueAmount, dueDay };
  }
  //#endregion

  findDueDay(loan: loanTransaction) {
    try {
      if (loan.registeredUsers.phone == '7600550021') return '15010';
      if (loan.id == 580) return '';
      let penalty_days = 0;
      let prev_emiDate;
      const emiData = loan.emiData.sort((a, b) => a.id - b.id);
      emiData.reverse();
      emiData.forEach((element) => {
        if (element.payment_due_status == '1')
          if (prev_emiDate) {
            const day = this.getDurationDay(
              new Date(element.emi_date),
              prev_emiDate,
            );
            if (+day > +element.penalty_days)
              penalty_days += +element.penalty_days;
            else penalty_days += +day;
          } else penalty_days += +element.penalty_days;
        prev_emiDate = new Date(element.emi_date);
      });
      if (penalty_days > 900) penalty_days = 900;
      if (penalty_days)
        return this.addCodeAndLength('15', penalty_days.toString());
    } catch (error) {}
    return '15010';
  }
  //#endregion

  //#region get dates duration in day
  private getDurationDay(date1?: Date, date2?: Date): any {
    try {
      if (date1 && date2) {
        date1.setHours(0);
        date2.setHours(1);
        const diffTime = date2.getTime() - date1.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays.toFixed();
      }
    } catch (error) {}
    return;
  }
  //#endregion

  //#region get find settled status
  findSettledStaus(loan: loanTransaction, settledData) {
    try {
      try {
        const find = settledData.find((f) => f.loanId === loan.id);
        if (find) return;
      } catch (error) {}
      let waiver = 0;
      let principalWaiver = 0;
      const emiData: EmiEntity[] = loan.emiData;
      const transData = loan.transactionData;
      emiData.forEach((emi) => {
        let amount = 0;
        amount += +emi.waiver;
        amount += +emi.paid_waiver;
        amount += +emi.unpaid_waiver;
        if (amount && emi.payment_status === '1') {
          const pAmount = emi.principalCovered;
          let tempAmount = 0;
          tempAmount += +emi?.fullPayPrincipal;
          for (let index = 0; index < transData.length; index++) {
            try {
              const element = transData[index];
              if (element.emiId === emi.id)
                tempAmount += element.principalAmount;
            } catch (error) {}
          }
          const diff = pAmount - tempAmount;
          if (diff > 10) principalWaiver += diff;
        }
        waiver += amount;
      });
      if (waiver) {
        waiver = Math.round(waiver);
        if (waiver > 500) {
          if (principalWaiver > waiver) principalWaiver = waiver;
          principalWaiver = Math.round(principalWaiver);
          return {
            staus: '220203',
            amount: waiver.toString(),
            principalWaiver: principalWaiver.toString(),
          };
        }
      }
    } catch (error) {}
    return;
  }
  //#endregion

  //#region get emi anount
  findEmiAmount(emi: EmiEntity[], toDate) {
    try {
      let amount = 0;
      emi.forEach((element) => {
        try {
          if (
            element.payment_status == '0' &&
            new Date(element.emi_date).getTime() <= new Date(toDate).getTime()
          ) {
            if (+element.penalty > 0 && +element.bounceCharge == 500)
              element.bounceCharge = 0;
            amount +=
              // Principal
              (+element.principalCovered ?? 0) +
              // Regular Int
              (+element.interestCalculate ?? 0) +
              // Penalty(Penalty + Bounce)(Only For Old User)
              (+element.penalty ?? 0) +
              // Deferred Interest
              ((+element.regInterestAmount ?? 0) -
                (+element.paidRegInterestAmount ?? 0)) +
              // ECS
              ((+element.bounceCharge ?? 0) +
                (+element.gstOnBounceCharge ?? 0) -
                (+element.paidBounceCharge ?? 0)) +
              // Penal Charges(Only For New User)
              ((+element.dpdAmount ?? 0) +
                (+element.penaltyChargesGST ?? 0) -
                (+element.paidPenalCharge ?? 0)) +
              // Legal Charges
              ((+element.legalCharge ?? 0) +
                (+element.legalChargeGST ?? 0) -
                (+element.paidLegalCharge ?? 0));
          }
        } catch (error) {}
      });
      amount = Math.round(amount);
      if (amount) return this.addCodeAndLength('40', amount.toString());
    } catch (error) {}
    return '';
  }
  //#endregion

  //#region get actual payment amount
  findActualAmount(loan: loanTransaction, code = '45') {
    try {
      if (loan.registeredUsers.phone == '7600550021') return '';
      let amount = 0;
      loan.transactionData.forEach((e) => {
        if (e.paidAmount) amount += e.paidAmount;
      });
      amount = Math.round(amount);
      if (amount) return this.addCodeAndLength(code ?? '45', amount.toString());
    } catch (error) {}
    return '';
  }
  //#endregion

  //#region get current balance
  findcurrentBalance(loan: loanTransaction): string {
    try {
      if (loan.registeredUsers.phone == '7600550021') return '13010';
      if (loan.loanStatus != 'Complete') {
        const emiData = loan.emiData.filter((e) => e.payment_status == '0');
        let principalCovered = 0;
        emiData.forEach((emi) => {
          if (emi.payment_status === '0') {
            if (+emi.penalty > 0 && +emi.bounceCharge == 500)
              emi.bounceCharge = 0;
            principalCovered +=
              // Principal + Interest(Remaining)
              (+emi.emi_amount ?? 0) +
              // Penalty(Penalty + Bounce)(Only For Old User)
              (+emi.penalty ?? 0) +
              // Deferred Interest
              ((+emi.regInterestAmount ?? 0) -
                (+emi.paidRegInterestAmount ?? 0)) +
              // ECS
              ((+emi.bounceCharge ?? 0) +
                (+emi.gstOnBounceCharge ?? 0) -
                (+emi.paidBounceCharge ?? 0)) +
              // Penal Charges(Only For New User)
              ((+emi.dpdAmount ?? 0) +
                (+emi.penaltyChargesGST ?? 0) -
                (+emi.paidPenalCharge ?? 0)) +
              // Legal Charges
              ((+emi.legalCharge ?? 0) +
                (+emi.legalChargeGST ?? 0) -
                (+emi.paidLegalCharge ?? 0));
          }
        });
        principalCovered = Math.round(principalCovered);
        return this.addCodeAndLength('13', principalCovered.toString());
      }
    } catch (error) {}
    return '13010';
  }
  //#endregion

  //#region for excel
  forExcel() {
    try {
      const array = [];
      array.push(this.memberCode ?? '');
      array.push(this.memberName ?? '');
      array.push(this.accountNumber ?? '');
      array.push(this.accountType ?? '');
      array.push(this.ownershipIndicator ?? '');
      array.push(this.disbursedDate ?? '');
      array.push(this.paymentLastDate ?? '');
      array.push(this.dateClosed ?? '');
      array.push(this.dateReported ?? '');
      array.push(this.sanctionedAmount ?? '');
      array.push(this.currentBalance ?? '');
      array.push(this.amountOverdue ?? '');
      array.push(this.dueDay ?? '');
      array.push('');
      array.push('');
      array.push(this.oldAccountNumber ?? '');
      array.push('');
      array.push('');
      array.push('');
      array.push(this.suitFiled ?? '');
      array.push(this.settledStaus ?? '');
      array.push(this.assetClassification ?? '');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push(this.repaymentTenure ?? '');
      array.push(this.emiAmount ?? '');
      array.push(this.writtenOffAmount ?? '');
      array.push(this.writtenOffPAmount ?? '');
      array.push(this.settledAmount ?? '');
      array.push(this.paymentFrequency ?? '');
      array.push(this.paymentAmount ?? '');
      array.push(this.occupationCode ?? '');
      array.push(this.netIncome ?? '');
      array.push(this.netIndicator ?? '');
      array.push(this.monthlyIndicator ?? '');
      for (let index = 0; index < array.length; index++) {
        const e = array[index];
        if (e) array[index] = e.substring(4);
      }
      return array;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region  repayment Tenure
  getRepaymentTenure(emiData: any[]) {
    try {
      return this.addCodeAndLength('39', emiData.length.toString());
    } catch (error) {}
    return '';
  }
  //#endregion

  //#region get suit file
  private getSuitFiled(loan, dueDay: string): string {
    let suit = '00';
    try {
      if (loan?.loanStatus !== 'Complete') {
        if (loan.isLegal) suit = '03';
        else {
          const day = +dueDay.substring(4);
          if (day > 60) suit = '02';
        }
      }
    } catch (er) {}
    return this.addCodeAndLength('21', suit);
  }
  //#endregion

  //#region asset Classification
  private getAssetClassification(loan, dueDay: string) {
    try {
      if (loan?.loanStatus !== 'Complete') {
        if (loan.id === 5650) console.log(dueDay);
        const day = +dueDay.substring(4);
        if (day > 90) return '260202';
      }
    } catch (error) {}
    return '260201';
  }
  //#endregion
}
