// Imports
import { Op, Sequelize } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { LSP_START_DATE, PAGE_LIMIT } from 'src/constants/globals';
import { kInternalError, kParamsMissing } from 'src/constants/responses';
import { TypeService } from 'src/utils/type.service';
import { EMIRepository } from 'src/repositories/emi.repository';
import { loanTransaction } from 'src/entities/loan.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { kMonths } from 'src/constants/objects';
import { UserRepository } from 'src/repositories/user.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { registeredUsers } from 'src/entities/user.entity';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { CryptService } from 'src/utils/crypt.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { FileService } from 'src/utils/file.service';
import { kCompleted, kInitiated } from 'src/constants/strings';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { RecoveryRateHistoryEntity } from 'src/entities/recoveryRateHistory.entity';
import { DateService } from 'src/utils/date.service';
@Injectable()
export class ReportAnalysisService {
  constructor(
    private readonly fileService: FileService,
    private readonly typeService: TypeService,
    private readonly emiRepo: EMIRepository,
    private readonly userRepo: UserRepository,
    private readonly kycRepo: KYCRepository,
    private readonly reportHistoryRepo: ReportHistoryRepository,
    private readonly loanRepo: LoanRepository,
    private readonly missMatchRepo: MissMacthRepository,
    private readonly cryptService: CryptService,
    private readonly repo: RepositoryManager,
    private readonly dateService: DateService,
  ) {}

  async getRecoveryRate(query) {
    try {
      const emiDate: any = await this.getLastEMIDate();
      if (emiDate?.message) return emiDate;
      const month = await this.typeService.dateDifference(
        new Date(LSP_START_DATE),
        new Date(),
        'Month',
      );
      const date = emiDate ?? new Date();
      let endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      let startDate = new Date();
      startDate.setMonth(startDate.getMonth() - month);
      startDate.setDate(1);
      if (query.startDate && query.endDate) {
        startDate = query.startDate;
        endDate = query.endDate;
      }
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const passData = { startDate, endDate, emiId: query.emiId };
      const emiOptions: any = await this.prepareRecoveryOptions(
        passData,
        query,
      );
      if (emiOptions == k500Error) return kInternalError;

      const emiData: any = await this.emiRecoverData(emiOptions);
      if (emiData == k500Error) return kInternalError;

      // https://dub.sh/1-0-5-1 -> Remaining amount should be in exception for current month
      const remainingAmount = await this.getTodaysRemainingAutodebits();

      return this.perepareRecoveryData(
        emiData,
        emiDate,
        query,
        remainingAmount,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getTodaysRemainingAutodebits() {
    const today = this.typeService.getGlobalDate(new Date()).toJSON();
    const rawQuery = `SELECT SUM("principalCovered" + "interestCalculate") AS "remainingAmount" 
    FROM "EmiEntities" AS "emi" 
    INNER JOIN "TransactionEntities" AS "trans" ON "emi"."id" = "trans"."emiId"
    WHERE "emi_date" = '${today}' AND "subscriptionDate" = '${today}' AND "emi"."payment_status" = '0'
    AND "status" = '${kInitiated}' AND "subSource" IN ('AUTODEBIT', 'AUTOPAY')`;

    const outputList = await this.repo.injectRawQuery(EmiEntity, rawQuery);
    if (outputList == k500Error) throw new Error();

    return outputList[0].remainingAmount ?? 0;
  }

  private async getLastEMIDate() {
    try {
      const options = {
        where: { payment_status: '1' },
        order: [['emi_date', 'desc']],
      };
      const att = ['emi_date'];
      const result = await this.emiRepo.getRowWhereData(att, options);
      if (result === k500Error) return kInternalError;
      return result?.emi_date ? new Date(result?.emi_date) : new Date();
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private prepareRecoveryOptions(reqData, query) {
    try {
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus'],
        include: [
          {
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
            where: { status: kCompleted },
          },
        ],
      };
      const emiOptions: any = {
        where: {
          emi_date: {
            [Op.gte]: reqData.startDate.toJSON(),
            [Op.lte]: reqData.endDate.toJSON(),
          },
        },
        include: [loanInclude],
        order: [['id', 'desc']],
      };
      if (reqData?.emiId) emiOptions.where.id = reqData.emiId;
      if (query.onlyWaivedOff) {
        if (query.download == 'false') {
          const page = query.page || 1;
          const offset = page * PAGE_LIMIT - PAGE_LIMIT;
          const limit = PAGE_LIMIT;
          emiOptions.offset = offset;
          emiOptions.limit = limit;
        }
        emiOptions.where = {
          ...emiOptions.where,
          [Op.or]: [
            { waiver: { [Op.gt]: 0 } },
            { paid_waiver: { [Op.gt]: 0 } },
            { unpaid_waiver: { [Op.gt]: 0 } },
          ],
        };
      }
      return emiOptions;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async emiRecoverData(options) {
    try {
      const emiAttributes = [
        'userId',
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
        'paid_principal',
        'paid_interest',
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
      ];
      return await this.emiRepo.getTableWhereDataWithCounts(
        emiAttributes,
        options,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private perepareRecoveryData(emiData, emiDate, query, remainingAmount) {
    try {
      const today = this.typeService.getGlobalDate(new Date());
      const currentMonth = this.convertIntoGroups(today);

      const onlyWaivedOff = query?.onlyWaivedOff ?? false;
      const finalData: any = {};
      const rowFinalData: any = { rows: [], count: emiData.count };
      for (let i = 0; i < emiData.rows.length; i++) {
        try {
          const emi = emiData.rows[i];
          if (onlyWaivedOff == true) {
            emi.calculation = this.getRateEMI(emi);
            rowFinalData.rows.push(emi);
            continue;
          }
          const emiDate: any = this.typeService.getGlobalDate(emi.emi_date);
          const monthGroups = this.convertIntoGroups(emiDate);
          const { weekGroup, totalDays, weeks } =
            this.dateService.convertIntoWeekGroups(emiDate);

          if (monthGroups != 'Aug-21') {
            if (finalData[monthGroups]) {
              if (!finalData[monthGroups].baseData) {
                finalData[monthGroups].baseData = {
                  expectedPrincipal: 0,
                  expectedInterest: 0,
                  paidPrincipal: 0,
                  paidInterest: 0,
                  paidPenalty: 0,
                };
              }
              const keys: any = Object.keys(finalData[monthGroups]);
              const data = this.getRateEMI(emi);
              keys.forEach((key) => {
                if (key != 'baseData' && !key.startsWith('week'))
                  finalData[monthGroups][key] += data[key];
              });
              // Recovery rate should have the base of as on today
              if (!data.isFutureEMI) {
                finalData[monthGroups].baseData.expectedPrincipal +=
                  data.expectedPrincipal;
                finalData[monthGroups].baseData.paidPrincipal +=
                  data.paidPrincipal;
                finalData[monthGroups].baseData.expectedInterest +=
                  data.expectedInterest;
                finalData[monthGroups].baseData.paidInterest +=
                  data.paidInterest;
                finalData[monthGroups].baseData.paidPenalty += data.paidPenalty;
              }

              // values for week wise data
              const weekData = finalData[monthGroups][weekGroup];
              weekData.loanCount += data.loanCount;
              weekData.prePaidPrinciple += data.prePaidPrinciple;
              weekData.prePaidInterest += data.prePaidInterest;
              weekData.totalPrePaidAmount += data.totalPrePaidAmount;
              weekData.waiverPrincipal += data.waiverPrincipal;
              weekData.waiverInterest += data.waiverInterest;
              weekData.waiverPenalty += data.waiverPenalty;
              weekData.totalDays = totalDays;
            } else {
              finalData[monthGroups] = this.getRateEMI(emi);
              // assign value for week wise data
              const weekNumber = parseInt(weekGroup.replace('week', ''));
              for (let i = 0; i <= weeks.length; i++) {
                finalData[monthGroups][`week${weeks[i].weekNumber}`] = {
                  totalDays: weeks[i].totalDays,
                  loanCount: 0,
                  prePaidPrinciple: 0,
                  prePaidInterest: 0,
                  totalPrePaidAmount: 0,
                  waiverPrincipal: 0,
                  waiverInterest: 0,
                  waiverPenalty: 0,
                };
                if (weeks[i].weekNumber == weekNumber) {
                  finalData[monthGroups][weekGroup] = {
                    totalDays: weeks[i].totalDays,
                    loanCount: finalData[monthGroups].loanCount,
                    prePaidPrinciple: finalData[monthGroups].prePaidPrinciple,
                    prePaidInterest: finalData[monthGroups].prePaidInterest,
                    totalPrePaidAmount:
                      finalData[monthGroups].totalPrePaidAmount,
                    waiverPrincipal: finalData[monthGroups].waiverPrincipal,
                    waiverInterest: finalData[monthGroups].waiverInterest,
                    waiverPenalty: finalData[monthGroups].waiverPenalty,
                  };
                }
              }
            }
          }
        } catch (error) {}
      }

      if (onlyWaivedOff == true) return rowFinalData;

      for (let monthKey in finalData) {
        try {
          const isCurrentMonth = monthKey == currentMonth;

          const keys = Object.keys(finalData[monthKey]);
          keys.forEach((key) => {
            if (key != 'baseData' && !key.startsWith('week'))
              finalData[monthKey][key] = Math.floor(finalData[monthKey][key]);
          });
          const monthValue = finalData[monthKey];

          // Recovery rate should have the base of as on today
          const isFuture = this.getFindThisMonthIsFuture(monthKey);
          let recoveryRate = 0;
          if (!isFuture) {
            // https://dub.sh/1-0-5-1 -> Remaining amount should be in exception for current month
            const dificitAmount = isCurrentMonth ? remainingAmount : 0;
            const baseData = monthValue.baseData ?? {};
            if (baseData.expectedPrincipal + baseData.expectedInterest != 0) {
              recoveryRate =
                ((baseData.paidPrincipal +
                  baseData.paidInterest +
                  (baseData.paidPenalty ?? 0)) /
                  (baseData.expectedPrincipal +
                    baseData.expectedInterest -
                    dificitAmount)) *
                100;
            }
          }
          let prePaidRate = 0;
          if (monthValue.expectedPrincipal + monthValue.expectedInterest != 0) {
            prePaidRate =
              ((monthValue.prePaidPrinciple +
                monthValue.prePaidInterest +
                (monthValue.paidPenalty ?? 0)) /
                (monthValue.expectedPrincipal + monthValue.expectedInterest)) *
              100;
          }
          recoveryRate = parseFloat(recoveryRate.toFixed(2));
          prePaidRate = parseFloat(prePaidRate.toFixed(2));

          finalData[monthKey].recoveryRate = recoveryRate;
          finalData[monthKey].prePaidRate = prePaidRate;
          finalData[monthKey].isFuture = isFuture;
          delete finalData[monthKey].baseData;
          delete finalData[monthKey].isFutureEMI;
        } catch (error) {}
      }
      const keys = Object.keys(finalData);
      const finalList = {};
      const newKeysist = [];
      keys.forEach((key) => {
        try {
          const month = key.split('-')[0];
          const year = '20' + key.split('-')[1];
          const time = new Date(year + month + '01').getTime();
          newKeysist.push({ key, time });
        } catch (error) {}
      });

      newKeysist.sort((a, b) => b.time - a.time);
      newKeysist.forEach((ele) => {
        try {
          const key = ele.key;
          finalList[key] = finalData[key];
        } catch (error) {}
      });

      // store all week data in an array with sorting
      for (const key in finalList) {
        if (finalList.hasOwnProperty(key)) {
          const monthData = finalList[key];
          const weekDataArray = [];

          for (const weekKey in monthData) {
            if (weekKey.startsWith('week')) {
              const weekNumber = parseInt(weekKey.replace('week', ''));
              weekDataArray.push({ week: weekNumber, ...monthData[weekKey] });
              delete monthData[weekKey];
            }
          }

          weekDataArray.sort((a, b) => a.week - b.week);
          monthData.weekData = weekDataArray;
        }
      }
      return finalList;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region find this month is future
  private getFindThisMonthIsFuture(monthKey) {
    try {
      const month = monthKey.split('-')[0].toLowerCase();
      const year = +('20' + monthKey.split('-')[1].toLowerCase());
      const find = kMonths.find((f) => f.toLowerCase().startsWith(month));
      const index = kMonths.indexOf(find);
      const date = new Date(year, index, 1).getTime();
      if (date > new Date().getTime()) return true;
    } catch (error) {}
    return false;
  }
  //#endregion

  private calculatePartPayment(emiId, transactionData) {
    const data = {
      paidPenalty: 0,
      paidPrincipal: 0,
      isEmiPaid: false,
      paidInterest: 0,
      refundAmount: 0,
    };
    try {
      let tran = [...transactionData];
      tran.forEach((ele) => {
        if (emiId == ele.emiId && ele.type == 'REFUND')
          data.refundAmount += ele.paidAmount;
      });
      tran = tran.sort(
        (a, b) =>
          a.penaltyAmount +
          a.principalAmount +
          a.interestAmount -
          (b.penaltyAmount + b.principalAmount + b.interestAmount),
      );
      tran.forEach((ele) => {
        if (
          emiId == ele.emiId &&
          (ele.type == 'PARTPAY' || ele.type == 'EMIPAY')
        ) {
          //SUBTRACK THE REFUND FROM PAID AMOUNT
          if (ele.paidAmount + data.refundAmount == 0 && ele.type == 'EMIPAY')
            data.refundAmount = 0;
          else {
            if (ele.type == 'EMIPAY') data.isEmiPaid = true;
            data.paidPenalty += ele?.penaltyAmount ?? 0;
            data.paidPrincipal += ele?.principalAmount ?? 0;
            data.paidInterest += ele?.interestAmount ?? 0;
          }
        }
      });
      if (tran.length > 0) {
        const find = tran.find((f) => f.type == 'FULLPAY');
        if (!find) data.isEmiPaid = true;
      }
      // if (data.refundAmount != 0) console.log(emiId, data.refundAmount, data);
    } catch (error) {}
    return data;
  }
  private getRateEMI(emi) {
    const data = {
      // Expected
      expectedPrincipal: 0,
      expectedInterest: 0,
      expectedDefInt: 0,
      expectedEcs: 0,
      expectedPenalty: 0,
      expectedLegalCharge: 0,
      totalExpected: 0,
      // Paid
      paidPrincipal: 0,
      paidInterest: 0,
      paidDefInt: 0,
      paidEcsCharge: 0,
      paidPenalty: 0,
      paidLegalCharge: 0,
      totalPaid: 0,
      discount: 0,
      // Waived
      waivedOff: 0,
      waiverPrincipal: 0,
      waiverInterest: 0,
      waiverPenalty: 0,
      waiverDefInt: 0,
      waiverEscCharge: 0,
      waiverLegalCharge: 0,
      // prepaid
      prePaidPrinciple: 0,
      prePaidInterest: 0,
      loanCount: 0,
      totalPrePaidAmount: 0,
      // Unpaid
      unPaidPrincipal: 0,
      unPaidInterest: 0,
      unPaidDefInt: 0,
      unPaidEcsCharge: 0,
      unpaidPenalty: 0,
      unPaidLegalCharge: 0,
      totalUnpaid: 0,
      // Diff
      diffPrincipal: 0,
      diffInterest: 0,
      diffDefInt: 0,
      diffEcsCharge: 0,
      diffPenalty: 0,
      diffLegalCharge: 0,
      refundAmount: 0,
      isFutureEMI: false,
    };
    try {
      // Recovery rate should have the base of as on today
      if (emi && emi.emi_date) {
        const todayTime = this.typeService.getGlobalDate(new Date()).getTime();
        const emiTime = new Date(emi.emi_date).getTime();
        data.isFutureEMI = todayTime < emiTime;
      }

      const loan = emi.loan;
      const transaction = loan.transactionData;
      const emiDate = this.typeService.getGlobalDate(emi.emi_date);
      const status = emi?.payment_status ?? '0';

      data.expectedPrincipal = emi.principalCovered;
      data.expectedInterest = emi.interestCalculate;
      data.expectedDefInt = emi.regInterestAmount;
      if (emi.totalPenalty == 0 && emi.bounceCharge > 0)
        data.expectedEcs = emi.bounceCharge + (emi.gstOnBounceCharge ?? 0);
      data.expectedPenalty =
        emi?.totalPenalty ?? 0 > 0
          ? emi.totalPenalty ?? 0
          : (emi.dpdAmount ?? 0) + (emi.penaltyChargesGST ?? 0);
      data.expectedLegalCharge = emi.legalCharge ?? 0 + emi.legalChargeGST ?? 0;
      //GET REFUND AMOUNT
      const paymentData = this.calculatePartPayment(emi.id, transaction);
      data.paidPrincipal = paymentData?.paidPrincipal ?? 0;
      data.paidInterest = paymentData?.paidInterest ?? 0;
      data.paidDefInt = emi.paidRegInterestAmount ?? 0;
      if (emi.totalPenalty == 0 && emi.bounceCharge > 0)
        data.paidEcsCharge = emi.paidBounceCharge;
      data.paidPenalty = paymentData.paidPenalty ?? 0;
      // else data.paidPenalty = emi.paidPenalCharge; // As of now no need to add any additional charges to recovery rate
      data.paidLegalCharge = emi.paidLegalCharge ?? 0;
      data.refundAmount = paymentData?.refundAmount ?? 0;
      const isEmiPaid = paymentData?.isEmiPaid ?? false;

      //end parpayment data
      let waiverDiff = 0;
      const tempWai =
        (emi.waiver ?? 0) + (emi.paid_waiver ?? 0) + (emi.unpaid_waiver ?? 0);
      //PAID EMIs
      if (status == '1') {
        let isPrePay = false;
        const emiDoneDate = emi?.payment_done_date;
        if (emiDoneDate) {
          const payDate = this.typeService.getGlobalDate(emiDoneDate);
          isPrePay = payDate.getTime() < emiDate.getTime();
        }
        if (isPrePay) {
          if (!isEmiPaid) {
            data.paidPrincipal =
              data.paidPrincipal + (emi?.fullPayPrincipal ?? 0);
            data.paidInterest = data.paidInterest + (emi?.fullPayInterest ?? 0);
            data.paidPenalty = data.paidPenalty + (emi?.fullPayPenalty ?? 0);
            data.prePaidPrinciple = data.paidPrincipal ?? 0;
            data.prePaidInterest = data.paidInterest ?? 0;
          } else {
            data.prePaidPrinciple = data.paidPrincipal ?? 0;
            data.prePaidInterest = data.paidInterest ?? 0;
          }
          data.expectedInterest = data.paidInterest ?? 0;
          data.loanCount = 1;
        } else if (!isEmiPaid) {
          data.paidPrincipal =
            data.paidPrincipal + (emi?.fullPayPrincipal ?? 0);
          data.paidInterest = data.paidInterest + (emi?.fullPayInterest ?? 0);
          data.paidPenalty = data.paidPenalty + (emi?.fullPayPenalty ?? 0);
        }
      } else {
        // all the unpaid pricipal and interest
        //  EMI PRINCIPAL-PART PAID PRINCIPAL (same for interest as well)
        data.unPaidPrincipal =
          (emi.principalCovered ?? 0) - (emi.paid_principal ?? 0);
        data.unPaidInterest =
          (emi.interestCalculate ?? 0) - (emi.paid_interest ?? 0);
        data.unPaidDefInt =
          (emi.regInterestAmount ?? 0) - (emi.paidRegInterestAmount ?? 0);
        if (emi.totalPenalty == 0 && emi.bounceCharge > 0)
          data.unPaidEcsCharge =
            (emi.bounceCharge ?? 0) +
            (emi.gstOnBounceCharge ?? 0) -
            (emi.paidBounceCharge ?? 0);
        data.unpaidPenalty =
          (emi?.penalty ?? 0) +
          (emi?.dpdAmount ?? 0) +
          (emi?.penaltyChargesGST ?? 0);
        data.unPaidLegalCharge =
          (emi.legalCharge ?? 0) +
          (emi.legalChargeGST ?? 0) -
          (emi.paidLegalCharge ?? 0);
      }

      const eTotal =
        data.expectedPrincipal + data.expectedInterest + data.expectedPenalty;
      const pTotal = data.paidPrincipal + data.paidInterest + data.paidPenalty;
      const diff = eTotal - pTotal;
      if ((diff > 10 || diff < -10) && status == '1') {
        this.getDiff(data);
        if (data.diffInterest < 0) data.paidInterest = data.expectedInterest;
        if (data.diffPrincipal < 0) data.paidPenalty = data.expectedPenalty;

        this.getDiff(data);
        data.waivedOff =
          (emi.waiver ?? 0) + (emi.paid_waiver ?? 0) + (emi.unpaid_waiver ?? 0);
        if (data.waivedOff > 0) {
          let waivedOff = data.waivedOff;
          if (data.diffPrincipal > 0 && waivedOff > 0) {
            if (waivedOff > data.diffPrincipal) {
              waivedOff -= data.diffPrincipal;
              data.waiverPrincipal = data.diffPrincipal;
              data.diffPrincipal = 0;
            } else {
              data.waiverPrincipal = waivedOff;
              data.diffPrincipal -= waivedOff;
              waivedOff = 0;
            }
          }
          if (data.diffInterest > 0 && waivedOff > 0) {
            if (waivedOff > data.diffInterest) {
              waivedOff -= data.diffInterest;
              data.waiverInterest = data.diffInterest;
              data.diffInterest = 0;
            } else {
              data.waiverInterest = waivedOff;
              data.diffInterest -= waivedOff;
              waivedOff = 0;
            }
          }

          if (data.diffPenalty > 0 && waivedOff > 0) {
            if (waivedOff > data.diffPenalty) {
              waivedOff -= data.diffPenalty;
              data.waiverPenalty = data.diffPenalty;
              data.diffPenalty = 0;
            } else {
              data.waiverPenalty = waivedOff;
              data.diffPenalty -= waivedOff;
              waivedOff = 0;
            }
          }

          if (data.diffDefInt > 0 && waivedOff > 0) {
            if (waivedOff > data.diffDefInt) {
              waivedOff -= data.diffDefInt;
              data.waiverDefInt = data.diffDefInt;
              data.diffDefInt = 0;
            } else {
              data.waiverDefInt = waivedOff;
              data.diffDefInt -= waivedOff;
              waivedOff = 0;
            }
          }

          if (data.diffEcsCharge > 0 && waivedOff > 0) {
            if (waivedOff > data.diffEcsCharge) {
              waivedOff -= data.diffEcsCharge;
              data.waiverEscCharge = data.diffEcsCharge;
              data.diffEcsCharge = 0;
            } else {
              data.waiverEscCharge = waivedOff;
              data.diffEcsCharge -= waivedOff;
              waivedOff = 0;
            }
          }

          if (data.diffLegalCharge > 0 && waivedOff > 0) {
            if (waivedOff > data.diffLegalCharge) {
              waivedOff -= data.diffLegalCharge;
              data.waiverLegalCharge = data.diffLegalCharge;
              data.diffLegalCharge = 0;
            } else {
              data.waiverLegalCharge = waivedOff;
              data.diffLegalCharge -= waivedOff;
              waivedOff = 0;
            }
          }
        }
        waiverDiff =
          data.waivedOff -
          (data.waiverPrincipal + data.waiverInterest + data.waiverPenalty);

        if (waiverDiff > 0) {
          data.waiverPenalty += waiverDiff;
        }
      }

      const waive =
        data.waiverPrincipal +
        data.waiverInterest +
        data.waiverPenalty +
        data.waiverEscCharge +
        data.waiverLegalCharge +
        data.waiverDefInt;
      const diffWaiver = tempWai - waive;
      if (diffWaiver > 10) {
        data.waivedOff += diffWaiver;
        data.waiverPenalty += diffWaiver;
        data.expectedPenalty += diffWaiver;
      }
      if (data.unPaidPrincipal < 0) data.unPaidPrincipal = 0;
      if (data.unPaidInterest < 0) data.unPaidInterest = 0;
      if (data.unpaidPenalty < 0) data.unpaidPenalty = 0;
      data.totalUnpaid =
        data.unPaidPrincipal +
        data.unPaidInterest +
        data.unPaidDefInt +
        data.unPaidEcsCharge +
        data.unpaidPenalty +
        data.unPaidLegalCharge;
      data.totalPaid =
        data.paidPrincipal +
        data.paidInterest +
        data.paidDefInt +
        data.paidEcsCharge +
        data.paidPenalty +
        data.paidLegalCharge;
      data.totalExpected =
        data.expectedPrincipal +
        data.expectedInterest +
        data.expectedDefInt +
        data.expectedEcs +
        data.expectedPenalty +
        data.expectedLegalCharge;
      data.totalPrePaidAmount = data.prePaidPrinciple + data.prePaidInterest;
      data.expectedPenalty +=
        data.expectedDefInt + data.expectedEcs + data.expectedLegalCharge;
      // data.paidPenalty +=
      //   data.paidEcsCharge + data.paidDefInt + data.paidLegalCharge;
      // As of now no need to add any additional charges to recovery rate
      data.unpaidPenalty +=
        data.unPaidEcsCharge + data.unPaidDefInt + data.unPaidLegalCharge;
      // //TOTAL PAID
      const toDays = new Date();
      /// day - 1 not day - 2 i put just for testing
      toDays.setDate(toDays.getDate() - 2);
      const toDay = this.typeService.getGlobalDate(toDays).getTime();
      if (emiDate.getTime() > toDay) {
        data.unPaidPrincipal = 0;
        data.unPaidInterest = 0;
        data.unpaidPenalty = 0;
        data.totalUnpaid = 0;
      }
    } catch (error) {}
    return data;
  }

  private convertIntoGroups(emiDate) {
    try {
      const month = this.typeService
        .getMonth(emiDate.getMonth())
        .replace(' ', '')
        .substring(0, 3);
      const year = emiDate.getFullYear().toString().substring(2);
      const monthYear = `${month}-${year}`;
      return monthYear;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //#region get diffrect
  private getDiff(data) {
    data.diffPrincipal = data.expectedPrincipal - data.paidPrincipal;
    if (data.diffPrincipal < 0) {
      const amount = -1 * data.diffPrincipal;
      data.paidPrincipal -= amount;
      data.paidInterest += amount;
      data.diffPrincipal = 0;
    }
    data.diffInterest = data.expectedInterest - data.paidInterest;
    if (data.diffInterest < 0) {
      const amount = -1 * data.diffInterest;
      data.paidInterest -= amount;
      data.paidPenalty += amount;
      data.diffInterest = 0;
    }
    data.diffPenalty = data.expectedPenalty - data.paidPenalty;
    if (data.diffPenalty < 0) {
      data.diffPenalty = 0;
      data.expectedPenalty += data.paidPenalty - data.expectedPenalty;
    }
    data.diffDefInt = data.expectedDefInt - data.paidDefInt;
    if (data.diffDefInt < 0) {
      data.diffDefInt = 0;
      data.expectedDefInt += data.paidDefInt - data.expectedDefInt;
    }
    data.diffDefEcs = data.expectedEcs - data.paidEcsCharge;
    if (data.diffDefEcs < 0) {
      data.diffDefEcs = 0;
      data.expectedEcs += data.paidEcsCharge - data.expectedEcs;
    }
    data.diffDefLegal = data.expectedLegalCharge - data.paidLegalCharge;
    if (data.diffDefLegal < 0) {
      data.diffDefLegal = 0;
      data.expectedLegalCharge +=
        data.paidLegalCharge - data.expectedLegalCharge;
    }
    return data;
  }
  //#endregion

  async getRegistredUserApprovalCount() {
    try {
      const startDate = new Date();
      const endDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const range = this.typeService.getUTCDateRange(
        startDate.toJSON(),
        endDate.toJSON(),
      );
      const userData: any = await this.userRepo.getTableWhereData(
        ['id', 'fullName', 'createdAt', 'kycId'],
        {
          where: {
            createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
          },
        },
      );
      const kycIds = [];
      userData.forEach((ele) => {
        if (ele?.kycId) kycIds.push(ele.kycId.toString());
      });
      const kycData: any = await this.kycRepo.getTableWhereData(
        ['id', 'userId', 'aadhaarStatus', 'panStatus'],
        {
          where: {
            panStatus: { [Op.or]: ['1', '3'] },
            id: {
              [Op.in]: kycIds,
            },
          },
        },
      );
      if (kycData == k500Error) return kInternalError;
      const attributes = ['userId'];
      const registerUserIds = kycData.map((ele) => ele.userId);
      const loanData = await this.loanRepo.getTableWhereData(attributes, {
        where: {
          loanStatus: { [Op.or]: ['Active', 'Complete'] },
          userId: registerUserIds,
        },
        group: ['userId'],
      });
      const takenLoanUser = loanData.map((loan) => loan.userId);
      const rejectData = await this.loanRepo.getCountsWhere({
        where: {
          [Op.and]: [
            { userId: registerUserIds },
            { userId: { [Op.notIn]: takenLoanUser } },
          ],
        },
        group: ['userId'],
      });

      return {
        startDate: range.fromDate,
        endDate: range.endDate,
        totalUser: userData.length,
        registerKycUser: kycData.length,
        userLoanApproved: loanData.length,
        totalUserRej: rejectData.length,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getNameMissMatchReport(query) {
    try {
      //get all the parameter
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const download = query?.download ?? 'false';
      let searchText = query?.searchText;
      //convert UTC date
      const dateRange = this.typeService.getUTCDateRange(startDate, endDate);
      //filter options
      const missNameOption: any = {
        where: {
          type: { [Op.in]: ['BANK_STATMENT'] },
          status: ['0', null],
          createdAt: {
            [Op.gte]: dateRange.fromDate,
            [Op.lte]: dateRange.endDate,
          },
        },
        order: [['id', 'DESC']],
      };
      //get all the data from the repo
      const logsData = await this.missMatchRepo.getTableWhereData(
        ['id', 'userId', 'type', 'data'],
        missNameOption,
      );
      if (logsData == k500Error) return kInternalError;
      let userSearch: any = {};
      //searching functionality
      if (searchText) {
        if (!isNaN(searchText)) {
          searchText = this.cryptService.encryptPhone(searchText);
          searchText = searchText.split('===')[1];
          userSearch.phone = { [Op.iRegexp]: searchText };
        } else
          userSearch[Op.or] = [
            { fullName: { [Op.iRegexp]: searchText } },
            { email: { [Op.iRegexp]: searchText } },
          ];
      }
      //get all the miss match users
      const userId = logsData.map((ele) => ele.userId);
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone', 'email'],
        where: userSearch,
      };
      const options = {
        where: { userId, loanStatus: 'InProcess' },
        order: [['id', 'DESC']],
        include: [userInclude],
      };
      //list all the name
      const loanData = await this.loanRepo.getTableWhereDataWithCounts(
        ['id', 'loanStatus', 'userId'],
        options,
      );
      if (loanData == k500Error) return kInternalError;
      const finalData: any = this.prepareMissMatchReport(
        loanData.rows,
        logsData,
      );
      if (finalData?.message) return kInternalError;

      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Name mismatch report.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }

      return { count: loanData.count, rows: finalData };
    } catch (error) {
      return [];
    }
  }

  async getUserMonthData(createdAt, type, app) {
    try {
      const options: any = {
        where: {
          createdAt,
          appType: `${app}`,
        },
        group: ['typeOfDevice', 'completedLoans'],
      };
      const userAttr = [
        this.typeService.manageDateAttr('month'),
        this.typeService.manageDateAttr('year'),
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalcount'],
        'typeOfDevice',
        'completedLoans',
      ];
      options.group.push(
        this.typeService.manageDateAttr('month', '', '', false),
      );
      options.group.push(
        this.typeService.manageDateAttr('year', '', '', false),
      );
      if (type == 'DAY') {
        userAttr.push(this.typeService.manageDateAttr('day'));
        options.group.push(
          this.typeService.manageDateAttr('day', '', '', false),
        );
      }

      const userData: any = await this.userRepo.getTableWhereData(
        userAttr,
        options,
      );
      if (userData == k500Error) return kInternalError;
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region find loan data
  async getLoanMonthData(range, type, app) {
    try {
      const userInclude = {
        model: registeredUsers,
        attributes: ['appType', 'typeOfDevice', 'createdAt', 'completedLoans'],
      };

      let include = [userInclude];
      let options = {
        where: {
          appType: `${app}`,
          [Op.or]: [
            {
              createdAt: {
                [Op.gte]: new Date(range.fromDate),
                [Op.lte]: new Date(range.endDate),
              },
              loanStatus: { [Op.notIn]: ['Active', 'Complete'] },
            },
            {
              loan_disbursement_date: {
                [Op.gte]: range.fromDate,
                [Op.lte]: range.endDate,
              },
              loanStatus: ['Active', 'Complete'],
            },
          ],
        },
        // limit: 5,
        include,
      };
      const attribtues = [
        'createdAt',
        'loanAmount',
        'netEmiData',
        'loan_disbursement_date',
        'charges',
        'netApprovedAmount',
        'completedLoan',
        'loanStatus',
        'appType',
        'processingFees',
        'id',
      ];

      const loanData: any = await this.loanRepo.getTableWhereData(
        attribtues,
        options,
      );
      if (loanData == k500Error) return kInternalError;

      for (let index = 0; index < loanData.length; index++) {
        const element = loanData[index];
        const createdAt = new Date(element?.createdAt);

        const month = createdAt.toLocaleString('default', { month: 'long' });
        const year = createdAt.getFullYear().toString();

        element.createdAt = `${month} ${year}`;
        if (element?.loan_disbursement_date) {
          const loan_disbursement_date = new Date(
            element?.loan_disbursement_date,
          );
          const month = loan_disbursement_date.toLocaleString('default', {
            month: 'long',
          });
          const year = loan_disbursement_date.getFullYear().toString();
          element.loan_disbursement_date = `${month} ${year}`;
        }

        element.typeOfDevice = element?.registeredUsers?.typeOfDevice;

        element.charges =
          (element?.charges?.doc_charge_amt || 0) +
          (element?.charges?.insurance_fee || 0) +
          (element?.charges?.risk_assessment_charge || 0) +
          ((element?.processingFees || 0) * (element?.netApprovedAmount || 0)) /
            100;

        element.expextedInterest = 0;
        for (let i = 0; i < element?.netEmiData?.length; i++) {
          const emi = JSON.parse(element?.netEmiData[i]);
          element.expextedInterest += +emi?.InterestCalculate ?? 0;
        }
      }

      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  prepareMissMatchReport(loanData, logsData) {
    try {
      const finalData = [];
      for (let i = 0; i < loanData.length; i++) {
        try {
          const loan = loanData[i];
          const userData = loan?.registeredUsers;
          const userId = userData?.id;
          const logs = logsData.find((f) => f.userId == userId);
          const tempObj: any = {};
          tempObj['userId'] = userId;
          tempObj['Name'] = userData?.fullName ?? '-';
          tempObj['Phone'] = this.cryptService.decryptPhone(userData.phone);
          tempObj['Email'] = userData?.email ?? '-';
          if (logs && logs.data) {
            let bank: any = {};
            try {
              bank = JSON.parse(logs?.data);
            } catch (error) {}
            const acc = bank?.accountDetails;
            // tempObj.isBankNameMissMatch = true;
            tempObj['Account name'] = acc?.name ?? '-';
            tempObj['Account number'] = acc?.accountNumber ?? '-';
            tempObj['Bank'] = acc?.bank ?? acc?.bankCode ?? '-';
            tempObj['Bank URL'] = bank?.filePath;
          }
          finalData.push(tempObj);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  async getMonthLoanFigureReport(query) {
    try {
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const app = query?.appType ?? '1';
      const type = query.type ?? 'MONTH';
      if (!startDate || !endDate) return kParamsMissing;
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const createdAt = {
        [Op.gte]: new Date(range.fromDate),
        [Op.lte]: new Date(range.endDate),
      };

      const userData = await this.getUserMonthData(createdAt, type, app);
      if (userData.message) return userData;
      const loanData = await this.getLoanMonthData(range, type, app);
      if (loanData.message) return loanData;
      const finalData = this.groupByDate(loanData, userData, type);
      if (query.download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData.rows],
          sheetName: 'Monthly loan figures.xlsx',
          needFindTuneKey: false,
          reportStore: true,
          startDate,
          endDate,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
        const updatedData = { downloadUrl: url, status: '1' };
        const downloadId = query.downloadId;
        await this.reportHistoryRepo.updateRowData(updatedData, downloadId);
        return { fileUrl: url };
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region group
  private groupByDate(loanData, userData, type) {
    const findData = [];
    try {
      try {
        if (type === 'MONTH') {
          userData.sort((a, b) => {
            if (a.year === b.year) return b.month - a.month;
            else return b.year - a.year;
          });
        } else {
          userData.sort((a, b) => {
            if (a.year === b.year) {
              if (a.month === b.month) {
                return b.day - a.day;
              }
              return b.month - a.month;
            }
            return b.year - a.year;
          });
        }
      } catch (error) {}
      for (let index = 0; index < userData.length; index++) {
        try {
          const ele = userData[index];
          const temp = {
            Month: '',
            'Registered User': 0,
            'Android Users': 0,
            'iOS Users': 0,
            'Web Users': 0,

            'Total Loan Applications': 0,
            'Approved Loan Application': 0,
            'Total disbursement': 0,

            'New Loan': 0,
            'Repeat Loan': 0,
            'New Loan Android Users': 0,
            'New Loan iOS Users': 0,
            'New Loan Web Users': 0,

            'Total Expected Interest': 0,
            'New Loan Expected Interest': 0,

            'Total Expected Interest (Android)': 0,
            'New Loan Expected Interest (Android)': 0,

            'Total Expected Interest (iOS)': 0,
            'New Loan Expected Interest (iOS)': 0,

            'Total Expected Interest (Web)': 0,
            'New Loan Expected Interest (Web)': 0,

            'Total Expected Fees': 0,
            'New Loan Expected Fees': 0,

            'Total Expected Fees from Android Users': 0,
            'New Loan Expected Fees from Android Users': 0,

            'Total Expected Fees from iOS Users': 0,
            'New Loan Expected Fees from iOS Users': 0,

            'Total Expected Fees from Web Users': 0,
            'New Loan Expected Fees from Web Users': 0,

            'New Loan Growth Rate %': 0,
          };
          let key = kMonths[ele.month - 1] + ele.year;
          if (type == 'DAY') key = ele.day + ' ' + key;
          const find = findData.find((f) => f.Month === key);
          const count = +ele.totalcount;
          if (find) {
            if (ele?.typeOfDevice == '0') find['Android Users'] += count;
            else if (ele?.typeOfDevice == '1') find['iOS Users'] += count;
            else if (ele?.typeOfDevice == '2') find['Web Users'] += count;
            find['Registered User'] += count;
          } else {
            if (ele?.typeOfDevice == '0') temp['Android Users'] += count;
            else if (ele?.typeOfDevice == '1') temp['iOS Users'] += count;
            else if (ele?.typeOfDevice == '2') temp['Web Users'] += count;
            temp['Registered User'] += count;
            temp.Month = key;
            findData.push(temp);
          }
        } catch (error) {}
      }
      for (let index = 0; index < loanData.length; index++) {
        try {
          const ele = loanData[index];
          let tempKey = ele.createdAt;
          if (type == 'DAY') tempKey = ele.day + ' ' + tempKey;
          let disbKey: any = '';
          if (ele.loan_disbursement_date) disbKey = ele.loan_disbursement_date;
          if (type == 'DAY')
            if (ele?.loan_disbursement_date)
              disbKey = ele?.loan_disbursement_date + ' ' + disbKey;
          let key = disbKey;
          if (!disbKey) key = tempKey;
          const find = findData.find((f) => f.Month === key);
          if (find) {
            find['Total Loan Applications']++;
            /// total new loan approved
            if (ele.loanStatus == 'Active' || ele.loanStatus == 'Complete') {
              ele.totalInterest = Number(ele?.expextedInterest).toFixed(2);
              ele.totalProcessing = Number(ele?.charges).toFixed(2);
              ele.totalProcessing = ele.totalProcessing ?? 0;
              const totalDisAmount = +ele?.netApprovedAmount ?? 0;
              find['Approved Loan Application']++;
              find['Total Expected Interest'] += +ele.totalInterest;
              find['Total disbursement'] += +totalDisAmount;
              find['Total Expected Fees'] += +ele.totalProcessing;
              if (ele?.typeOfDevice == '0') {
                find['Total Expected Interest (Android)'] += +ele.totalInterest;
                find['Total Expected Fees from Android Users'] +=
                  +ele.totalProcessing;
              } else if (ele?.typeOfDevice == '1') {
                find['Total Expected Interest (iOS)'] += +ele.totalInterest;
                find['Total Expected Fees from iOS Users'] +=
                  +ele.totalProcessing;
              } else if (ele?.typeOfDevice == '2') {
                find['Total Expected Interest (Web)'] += +ele.totalInterest;
                find['Total Expected Fees from Web Users'] +=
                  +ele.totalProcessing;
              }
              /// new loan
              if (ele?.completedLoan === 0) {
                find['New Loan']++;
                find['New Loan Expected Interest'] += +ele.totalInterest;
                find['New Loan Expected Fees'] += +ele.totalProcessing;
                if (ele?.typeOfDevice == '0') {
                  find['New Loan Android Users']++;
                  find['New Loan Expected Interest (Android)'] +=
                    +ele.totalInterest;
                  find['New Loan Expected Fees from Android Users'] +=
                    +ele.totalProcessing;
                } else if (ele?.typeOfDevice == '1') {
                  find['New Loan iOS Users']++;
                  find['New Loan Expected Interest (iOS)'] +=
                    +ele.totalInterest;
                  find['New Loan Expected Fees from iOS Users'] +=
                    +ele.totalProcessing;
                } else if (ele?.typeOfDevice == '2') {
                  find['New Loan Web Users']++;
                  find['New Loan Expected Interest (Web)'] +=
                    +ele.totalInterest;
                  find['New Loan Expected Fees from Web Users'] +=
                    +ele.totalProcessing;
                }
              } else find['Repeat Loan']++;
            }
          }
        } catch (error) {}
      }

      findData.forEach((ele) => {
        ele['Total disbursement'] = this.typeService.amountNumberWithCommas(
          +ele['Total disbursement'].toFixed(2),
        );
        ele['Total Expected Interest'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Interest'].toFixed(0),
          );
        ele['Total Expected Interest (Android)'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Interest (Android)'].toFixed(0),
          );
        ele['Total Expected Interest (iOS)'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Interest (iOS)'].toFixed(0),
          );
        ele['Total Expected Fees'] = this.typeService.amountNumberWithCommas(
          +ele['Total Expected Fees'].toFixed(0),
        );
        ele['Total Expected Fees from Android Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Fees from Android Users'].toFixed(0),
          );
        ele['Total Expected Fees from iOS Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Fees from iOS Users'].toFixed(0),
          );
        ele['New Loan Expected Interest'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Interest'].toFixed(0),
          );
        ele['New Loan Expected Interest (Android)'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Interest (Android)'].toFixed(0),
          );
        ele['New Loan Expected Interest (iOS)'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Interest (iOS)'].toFixed(0),
          );
        ele['New Loan Expected Fees'] = this.typeService.amountNumberWithCommas(
          +ele['New Loan Expected Fees'].toFixed(0),
        );
        ele['New Loan Expected Fees from Android Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Fees from Android Users'].toFixed(0),
          );
        ele['New Loan Expected Fees from iOS Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Fees from iOS Users'].toFixed(0),
          );
        ele['New Loan Expected Fees from Web Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Fees from Web Users'].toFixed(0),
          );
        ele['Total Expected Fees from Web Users'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Fees from Web Users'].toFixed(0),
          );
        ele['Total Expected Interest (Web)'] =
          this.typeService.amountNumberWithCommas(
            +ele['Total Expected Interest (Web)'].toFixed(0),
          );
        ele['New Loan Expected Interest (Web)'] =
          this.typeService.amountNumberWithCommas(
            +ele['New Loan Expected Interest (Web)'].toFixed(0),
          );
      });
      findData.sort((a, b) => a.index - b.index);

      for (let i = 0; i < findData.length; i++) {
        const currentMonth = findData[i];
        const previousMonth = findData[i + 1];

        const currentMonthNewLoan = currentMonth['New Loan'];
        const previousMonthNewLoan = previousMonth['New Loan'];

        const percentageGrowth =
          ((currentMonthNewLoan - previousMonthNewLoan) /
            (previousMonthNewLoan || 1)) *
          100;

        currentMonth['New Loan Growth Rate %'] = percentageGrowth.toFixed(0);
      }
      findData[findData.length - 1]['New Loan Growth Rate %'] = 0;
    } catch (error) {}
    return { count: findData.length, rows: findData };
  }

  async cibilDefaulters() {
    try {
      // Table joins
      const bankingInclude: { model; attributes? } = { model: BankingEntity };
      bankingInclude.attributes = ['accountNumber'];
      const emiInclude: { model; attributes?; where? } = { model: EmiEntity };
      emiInclude.attributes = ['id'];
      emiInclude.where = { payment_due_status: '1', payment_status: '0' };
      const kycInclude: { model; attributes? } = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarAddress',
        'aadhaarDOB',
        'panCardNumber',
        'aadhaarAddressResponse',
        'aadhaarResponse',
      ];
      const userInclude: { model; attributes?; include? } = {
        model: registeredUsers,
      };
      userInclude.attributes = ['fullName', 'gender', 'phone'];
      userInclude.include = [kycInclude];
      // Query preparations
      const include = [bankingInclude, emiInclude, userInclude];
      const attribtues = ['id', 'netApprovedAmount', 'userId'];
      const options = {
        order: [['id', 'DESC']],
        include,
        where: { loanStatus: 'Active' },
      };
      // Query
      const loanList = await this.loanRepo.getTableWhereData(
        attribtues,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      // Excel preparation
      const preparedList = [];
      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanData = loanList[index];
          const userData = loanData.registeredUsers ?? {};
          const kycData = userData.kycData ?? {};
          const bankingData = loanData.bankingData ?? {};
          const addressData = this.typeService.getAadhaarAddress(kycData);
          let dob = kycData.aadhaarDOB ?? '';
          dob = await this.typeService.getDateAsPerAadhaarDOB(dob);
          let pincode = '-';
          let state = '';
          let city = '';

          if (kycData.aadhaarResponse) {
            const aadharResponse = JSON.parse(kycData.aadhaarResponse);
            pincode = aadharResponse.zip ?? aadharResponse.pincode ?? '-';
            state = aadharResponse.address?.state ?? '';
            if (!pincode) {
              try {
                const rawResponse = aadharResponse.response;
                const response = JSON.parse(rawResponse);
                pincode = response?.aadhaarData?.pincode ?? '-';
              } catch (error) {}
            }
          }
          try {
            const aadhaarAddress = JSON.parse(kycData.aadhaarAddress) ?? {};
            if (typeof aadhaarAddress == 'string') {
              if (kycData.aadhaarAddressResponse) {
                let aadhaarAddress =
                  JSON.parse(kycData.aadhaarAddressResponse) ?? {};
                if (typeof aadhaarAddress == 'string')
                  aadhaarAddress = JSON.parse(aadhaarAddress);
                city = aadhaarAddress.vtc ?? '-';
              }
            } else city = aadhaarAddress.vtc ?? '-';
          } catch (error) {}

          const gender = userData.gender?.toUpperCase() ?? 'MALE';
          preparedList.push({
            'Member Reference Number': loanData.id,
            'Enquiry Amount': Math.floor(loanData.netApprovedAmount),
            'Consumer Name': userData.fullName ?? '-',
            'Date of Birth': dob.split('-').reverse().join('-'),
            gender: gender[0] == 'M' ? '2' : '1',
            'Income Tax ID Number': kycData.panCardNumber ?? '-',
            'Passport Number': '',
            'Voter ID Number': '',
            'Driver’s License Number': '',
            'Ration Card Number': '',
            'Universal ID Number': '',
            'Additional ID #1': '',
            'Additional ID #2': '',
            'Telephone Number 1 (Mobile)': this.cryptService.decryptPhone(
              userData.phone,
            ),
            'Telephone Number 2': '',
            'Telephone Number 3': '',
            'Telephone Number 4': '',
            'Address Line 1': addressData.address,
            'PIN Code 1': pincode,
            city,
            'Address Line 2': '',
            'State 2': '',
            'PIN Code 2': '',
            'Account Number': bankingData.accountNumber,
            state: state,
          });
        } catch (error) {}
      }

      const rawExcelData = {
        sheets: ['Defaulter - cibil report'],
        data: [preparedList],
        sheetName: 'Defaulter - cibil report.xlsx',
        needFindTuneKey: false,
      };
      const excelResponse: any = await this.fileService.objectToExcel(
        rawExcelData,
      );
      if (excelResponse.message) return excelResponse;

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funLoanApprovedByGender(month = null) {
    try {
      let startDate = new Date();
      startDate.setDate(1);
      let endDate: Date;
      if (month || month == 0) {
        if (month > startDate.getMonth())
          startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(month);
      }
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const loanWhere = {
        loanStatus: ['Active', 'Complete'],
        loan_disbursement_date: {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        },
      };
      const approvedMaleFemaleCharData = await this.prepareGenderLoanCharData(
        loanWhere,
      );
      if (approvedMaleFemaleCharData == k500Error) return k500Error;
      return approvedMaleFemaleCharData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async prepareGenderLoanCharData(loanWhere) {
    try {
      const userInlcude = {
        model: registeredUsers,
        attributes: ['id', 'gender'],
      };
      const options = {
        where: loanWhere,
        include: [userInlcude],
      };
      const attributes = ['id', 'loanStatus'];
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );

      const data = {};
      loanData.forEach((ele) => {
        const gender = ele?.registeredUsers?.gender.toLowerCase();
        if (data[gender]) data[gender] = data[gender] + 1;
        else data[gender] = 1;
      });
      const keys = Object.keys(data);
      const finalData = {};
      keys.forEach((element) => {
        try {
          finalData[`${element}_total`] = data[element];
          finalData[`${element}_percantage`] =
            +((data[element] * 100) / loanData.length).toFixed(2) || 0;
        } catch (error) {
          finalData[element] = 0;
        }
      });
      return { ...finalData, total: 100 };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funMonthEmiRepaid(month = null) {
    try {
      return await this.funEmiRepaidByGenderChart(month);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funEmiRepaidByGenderChart(month = null, otherInclude = null) {
    try {
      let startDate = new Date();
      startDate.setDate(1);
      let endDate: Date;
      if (month || month == 0) {
        if (month > startDate.getMonth())
          startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(month);
      }
      const currentDate = new Date();
      if (month == currentDate.getMonth()) {
        currentDate.setDate(currentDate.getDate() - 1);
        endDate = currentDate;
      } else
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0,
        );
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);

      const emiWhere: any = {
        where: {
          emi_date: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
      };
      if (otherInclude) emiWhere.include = [otherInclude];
      const emiData = await this.getEmiDataForChart(emiWhere);
      if (emiData == k500Error) return k500Error;
      const repaidData: any = await this.currentMonthRepaidChartData(emiData);
      if (repaidData == k500Error) return k500Error;
      const passData: any = {};
      for (const key in repaidData?.data) {
        try {
          const mainObj = repaidData.data[key];
          passData[key] = {
            total: mainObj,
            percantage: mainObj
              ? parseFloat(((mainObj / repaidData.total) * 100).toFixed(2))
              : mainObj,
          };
        } catch (error) {}
      }
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getEmiDataForChart(emiWhere) {
    try {
      const attributes = [
        'id',
        'emi_date',
        'payment_status',
        'payment_done_date',
        'userId',
        'emi_amount',
        'payment_due_status',
        'principalCovered',
        'interestCalculate',
      ];
      const emiData: any = await this.emiRepo.getTableWhereData(
        attributes,
        emiWhere,
      );
      return emiData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  currentMonthRepaidChartData(emiData) {
    try {
      // if (emiData.length == 0) return k500Error;
      const data = emiData;
      let onDueRepaid = 0;
      let preRepaid = 0;
      let postRepaid = 0;
      let defaulEmi = 0;
      let currentDate = new Date();
      currentDate = this.typeService.getGlobalDate(currentDate);
      const count = data.length;
      for (let i = 0; i < data.length; i++) {
        try {
          const emi = data[i];
          const emiDate = this.typeService.getGlobalDate(emi.emi_date);
          if (emi.payment_status == '1') {
            const paymentDate = this.typeService.getGlobalDate(
              emi.payment_done_date,
            );
            if (
              emiDate.getTime() == paymentDate.getTime() ||
              (emiDate.getTime() < paymentDate.getTime() &&
                emi.payment_due_status == '0')
            ) {
              onDueRepaid++;
            } else if (emiDate.getTime() > paymentDate.getTime()) {
              preRepaid++;
            } else if (emi.payment_due_status == '1') {
              postRepaid++;
            }
          } else if (emi.payment_due_status == '1' && emi.payment_status == '0')
            defaulEmi++;
        } catch (error) {}
      }

      return {
        data: {
          preRepaid,
          onDueRepaid,
          postRepaid,
          defaulEmi,
        },
        total: count,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funLoanApprovedByInterestrate(month = null) {
    try {
      let startDate = new Date();
      startDate.setDate(1);
      let endDate: Date;
      if (month || month == 0) {
        if (month > startDate.getMonth())
          startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(month);
      }
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const loanWhere = {
        loanStatus: ['Active', 'Complete'],
        loan_disbursement_date: {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        },
      };
      const interestRateApprovedCharData = await this.funInterateCharData(
        loanWhere,
      );
      if (interestRateApprovedCharData == k500Error) return k500Error;
      return interestRateApprovedCharData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funInterateCharData(loanWhere) {
    try {
      const options = {
        where: loanWhere,
        group: 'interestRate',
      };
      const attributes = [
        'interestRate',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalLoans'],
      ];
      const loanData = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      let loans = 0;
      loanData.forEach((ele) => {
        loans += +ele?.totalLoans;
      });
      const passData: any = {};
      loanData.forEach((ele) => {
        const parsedRate = parseFloat(ele?.interestRate).toString();
        if (passData[parsedRate]) {
          passData[parsedRate] += +ele?.totalLoans;
        } else {
          passData[parsedRate] = +ele?.totalLoans;
        }
      });
      for (const key of Object.keys(passData)) {
        const percantage = ((+passData[key] * 100) / loans).toFixed(2);
        passData[key] = { percantage: +percantage, totalLoans: passData[key] };
      }
      return { ...passData, total: 100 };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funEmiRepaidByInterestrate(month = null) {
    try {
      let startDate = new Date();
      startDate.setDate(1);
      let endDate: Date;
      if (month || month == 0) {
        if (month > startDate.getMonth())
          startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(month);
      }
      const currentDate = new Date();
      if (month == currentDate.getMonth()) {
        currentDate.setDate(currentDate.getDate() - 1);
        endDate = currentDate;
      } else
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0,
        );
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const emiWhere = {
        where: {
          payment_status: '1',
          emi_date: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
        include: [
          { model: loanTransaction, attributes: ['id', 'interestRate'] },
        ],
      };
      const emiData = await this.getEmiDataForChart(emiWhere);
      if (emiData == k500Error) return k500Error;
      const passData: any = {};
      let totalEmis = 0;
      emiData.forEach((ele) => {
        const loan = ele?.loan;
        const parsedRate = parseFloat(loan?.interestRate).toString();
        if (passData[parsedRate]) {
          passData[parsedRate] = passData[parsedRate] + 1;
        } else {
          passData[parsedRate] = 1;
        }
        totalEmis++;
      });
      for (const key of Object.keys(passData)) {
        const percantage = ((+passData[key] * 100) / totalEmis).toFixed(2);
        passData[key] = { percantage: +percantage, totalEmi: passData[key] };
      }
      return { ...passData, total: totalEmis };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async funEmiRepaidByGenderMale(month = null) {
    try {
      const userInlcude = {
        model: registeredUsers,
        where: { gender: { [Op.or]: ['Male', 'MALE'] } },
        attributes: ['id', 'gender'],
      };
      return await this.funEmiRepaidByGenderChart(month, userInlcude);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }
  async funEmiRepaidByGenderFemale(month = null) {
    try {
      const userInlcude = {
        model: registeredUsers,
        where: { gender: { [Op.or]: ['Female', 'FEMALE'] } },
        attributes: ['id', 'gender'],
      };
      return await this.funEmiRepaidByGenderChart(month, userInlcude);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async storeRecoveryRates(reqData) {
    try {
      const getRecoveryData = await this.getRecoveryRate(
        {
          startDate: reqData?.startDate,
          endDate: reqData?.endDate,
        } || {},
      );

      const keys = Object.keys(getRecoveryData).reverse();
      for (const key of keys) {
        const monthData = getRecoveryData[key];
        const formattedData = {};

        for (const [prop, value] of Object.entries(monthData)) {
          formattedData[prop] = value;
          // typeof value === 'number' && isNaN(value) ? null : value;
        }
        const today = new Date();
        const targetDate = this.typeService.getUTCDateRange(
          today.toString(),
          today.toString(),
        );

        const existingData = await this.repo.getRowWhereData(
          RecoveryRateHistoryEntity,
          ['id'],
          {
            where: {
              Month: key,
              createdAt: {
                [Op.gte]: targetDate.fromDate,
                [Op.lte]: targetDate.endDate,
              },
            },
          },
        );
        if (existingData) {
          const updatedData = await this.repo.updateRowData(
            RecoveryRateHistoryEntity,
            formattedData,
            existingData.id,
          );
          if (updatedData === k500Error) return kInternalError;
        } else {
          const newData = {
            Month: key,
            ...formattedData,
          };
          const createdData = await this.repo.createRowData(
            RecoveryRateHistoryEntity,
            newData,
          );
          if (createdData === k500Error) return kInternalError;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
