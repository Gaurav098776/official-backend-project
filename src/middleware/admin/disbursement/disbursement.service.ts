// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { gIsPROD } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k403Forbidden,
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kCashfree,
  kCompleted,
  kNoDataFound,
  kRefund,
  kRuppe,
} from 'src/constants/strings';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { AppsFlyerService } from 'src/thirdParty/appsFlyer/appsFlyer.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { LoanService } from '../loan/loan.service';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { UserRepository } from 'src/repositories/user.repository';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { ReferralStages, kRazorpayM2Auth } from 'src/constants/objects';
import { nFetchPayoutDetails, nRazorTransactions } from 'src/constants/network';
import { APIService } from 'src/utils/api.service';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { DateService } from 'src/utils/date.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { TypeService } from 'src/utils/type.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { LogsSharedService } from 'src/shared/logs.service';
import { UserSharedLogTrackerMiddleware } from 'src/shared/logtracker.middleware';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import * as fs from 'fs';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { loanTransaction } from 'src/entities/loan.entity';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';
import { KYCEntity } from 'src/entities/kyc.entity';

@Injectable()
export class DisbursementService {
  constructor(
    private readonly appsFlyer: AppsFlyerService,
    private readonly googleService: GoogleService,
    private readonly loanRepo: LoanRepository,
    private readonly loanService: LoanService,
    private readonly userRepo: UserRepository,
    private readonly userService: UserServiceV4,
    private readonly sharedReferral: ReferralSharedService,
    private readonly api: APIService,
    private readonly disRepo: DisbursmentRepository,
    private readonly dateService: DateService,
    private readonly sharedNotification: SharedNotificationService,
    private readonly typeService: TypeService,
    private readonly transRepo: TransactionRepository,
    // Shared
    private readonly calculation: CalculationSharedService,
    private readonly logService: LogsSharedService,
    @Inject(forwardRef(() => UserSharedLogTrackerMiddleware))
    private readonly userSharedLogTrackerMiddleware: UserSharedLogTrackerMiddleware,
    private readonly userLogTrackerRepository: UserLogTrackerRepository,
    private readonly repoManager: RepositoryManager,
  ) {}

  async markDisbursementAsComplete(reqData) {
    try {
      // Params validation
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');

      // Insurance proposal (One time)
      await this.loanService.insuranceProposal({ loanId });

      const disbursementInclude: any = { model: disbursementEntity };
      disbursementInclude.attributes = [
        'updatedAt',
        'bank_name',
        'account_number',
        'utr',
        'source',
      ];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = [
        'appsFlyerId',
        'id',
        'recentDeviceId',
        'typeOfDevice',
        'phone',
      ];
      const include = [disbursementInclude, userInclude];
      const attributes = ['loanStatus', 'loanAmount', 'appType'];
      const options = { include, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      if (loanData == k500Error) return kInternalError;

      let payoutAccount = '';
      const bankDetails = fs.readFileSync('bankDetails.json', 'utf8');
      const kTallyPayoutBanks = bankDetails ? JSON.parse(bankDetails) : {};

      if (loanData?.disbursementData[0]?.source === 'RAZORPAY_M2') {
        payoutAccount = kTallyPayoutBanks['RAZORPAY_M2_DEFAULT_ACC'];
      } else if (loanData?.disbursementData[0]?.source === kCashfree) {
        payoutAccount = kTallyPayoutBanks['ICICI_CONNECTED_51633_23f0101'];
      } else {
        payoutAccount = kTallyPayoutBanks['RBL - bacc_JRtlJu0ZyNn17I'];
      }

      const otherDetails = {
        loanAmount: loanData?.loanAmount,
        bankAccount:
          loanData?.disbursementData[0]?.bank_name +
          '-' +
          loanData?.disbursementData[0]?.account_number,
        utr: loanData?.disbursementData[0]?.utr,
        payoutAccount,
      };
      const passData = {
        userId: loanData.registeredUsers.id,
        stage: `Loan Disbursement`,
        loanId: reqData?.loanId,
        ip: '-',
        deviceId: '-',
        city: '-',
        ipLocation: '-',
        ipCountry: '-',
        otherDetails,
      };
      await this.userLogTrackerRepository.create(passData);
      if (!gIsPROD) return k403Forbidden;

      if (loanData.loanStatus != 'Active' && loanData.loanStatus != 'Complete')
        return k422ErrorMessage('Loan is not active or completed');

      const disbursementDate = loanData.disbursementData[0].updatedAt;
      if (!disbursementDate)
        return k422ErrorMessage('disbursementDate is not found');

      const userData = loanData.registeredUsers ?? {};
      if (!userData) return k422ErrorMessage('No user data found');
      await this.userService.routeDetails({ id: userData.id });
      await this.sharedReferral.addReferral({
        userId: userData.id,
        loanId,
        stage: ReferralStages.LOAN_ACTIVE,
      });
      // Fallback for appsFlyerId missing in db for old users
      if (!userData.appsFlyerId) {
        const appsFlyerId = await this.googleService.appsFlyerDetails({
          deviceId: userData.recentDeviceId,
        });
        if (appsFlyerId?.message) return {};
        await this.userRepo.updateRowData({ appsFlyerId }, userData.id);
        userData.appsFlyerId = appsFlyerId;
      }

      await this.appsFlyer.logDisbursementEvent({
        ...userData,
        disbursementDate,
      });

      // send review link msg
      await this.sharedNotification.sendReviewMessage({
        phoneNumber: userData?.phone,
        loanId,
        appType: loanData?.appType,
      });
      await this.calculation.calculateCLTV({ loanIds: [loanId] });

      // add address in active loan address
      const kycInclude = {
        model: KYCEntity,
        attributes: ['aadhaarAddress', 'aadhaarLatLong'],
      };
      const option = {
        where: { id: userData.id },
        include: kycInclude,
      };

      const data = await this.userRepo.getRowWhereData(['id'], option);
      if (!data || data == k500Error) throw new Error();
      if (data?.kycData?.aadhaarAddress) {
        const address = JSON.parse(data.kycData.aadhaarAddress);
        const trimmedAddress = Object.values(address)
          .join(' ')
          .split(/[\s,-]+/g);
        const aadhaarAddress = trimmedAddress.join(' ').trim();
        let latLngObject = JSON.parse(data.kycData.aadhaarLatLong);
        let aadhaarLatLongPoint = null;
        if (latLngObject) {
          const lat = latLngObject['lat'];
          const lng = latLngObject['lng'];
          aadhaarLatLongPoint = `${lat},${lng}`;
        }

        const createdData = {
          loanId,
          userId: userData.id,
          aadhaarAddress,
          aadhaarLatLong: aadhaarLatLongPoint,
          isActive: true,
        };
        await this.repoManager.createRowData(
          ActiveLoanAddressesEntity,
          createdData,
        );
      }
      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async reLogMissedEvents() {
    try {
      const userInclude: any = { model: registeredUsers };
      userInclude.where = { appsFlyerId: { [Op.ne]: null } };
      const include = [userInclude];
      const attributes = ['id'];
      const options = {
        include,
        where: { loanStatus: { [Op.or]: ['Active', 'Complete'] } },
        limit: 1,
      };

      const loanList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      if (loanList == k500Error) return kInternalError;

      for (let index = 0; index < loanList.length; index++) {
        try {
          const loanId = loanList[index].id;
          await this.markDisbursementAsComplete({ loanId });
        } catch (error) {}
      }

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async disbursementSettlement(body) {
    // Query preparation
    const startDate = body?.startDate ?? new Date();
    const endDate = body?.endDate ?? new Date();
    const range = await this.dateService.unixDateRange(startDate, endDate);
    const account_number = process.env.RAZORPAY_M2_ACCOUNT_NUMBER;
    if (!account_number) return kParamMissing('account_number');

    //For razorpay M2
    const auth = kRazorpayM2Auth;
    const razorpayTransactions = await this.getRazorpayTransactions(
      account_number,
      range,
      auth,
    );

    let loanData = {};
    for (let i = 0; i < razorpayTransactions.length; i++) {
      try {
        const ele = razorpayTransactions[i];
        const transactionId = ele.id;

        // Fetch transaction details
        const transUrl = nRazorTransactions + '/' + transactionId;
        const transDetails = await this.api.get(transUrl, null, null, {
          auth,
        });
        if (transDetails === k500Error) continue;

        // Fetch payout details
        const body = {
          payout_id: transDetails?.source?.id,
          source: 'RAZORPAY_M2',
        };
        let payoutDetails = await this.api.requestPost(
          nFetchPayoutDetails.replace('//thirdParty', '/thirdParty'),
          body,
        );
        if (payoutDetails === k500Error) continue;
        if (payoutDetails.valid == false) continue;
        payoutDetails = payoutDetails.data;

        const textToRemove = 'Loan Disbursement of ';
        const startIndex =
          payoutDetails.narration.indexOf(textToRemove) + textToRemove.length;
        const loanId = payoutDetails.narration.slice(startIndex);
        if (!loanId) continue;
        const transactionDetails = {
          created_at: ele.created_at,
          paymentDetails: payoutDetails,
        };
        if (loanData[loanId]) loanData[loanId].push(transactionDetails);
        else loanData[loanId] = [transactionDetails];
      } catch (error) {}
    }
    const filteredLoanData = Object.keys(loanData).reduce((result, loanId) => {
      const filteredDetails = loanData[loanId].filter(
        (item) => item.paymentDetails.status === 'processed',
      );
      if (filteredDetails.length > 0) {
        filteredDetails.sort((a, b) => {
          return +new Date(b.created_at) - +new Date(a.created_at);
        });

        const latestData = filteredDetails[0];
        result[loanId] = latestData;
      }
      return result;
    }, {});

    for (const loan in filteredLoanData) {
      try {
        const data = filteredLoanData[loan];
        const settlementData = JSON.stringify(data?.paymentDetails);

        const updatedData = {
          settlementDate: new Date(data?.created_at * 1000),
          settlementData,
        };
        await this.disRepo.updateRowWhereData(updatedData, {
          where: { loanId: loan },
        });
      } catch (error) {}
    }

    return {};
  }

  private async getRazorpayTransactions(
    account_number,
    range,
    auth,
    skip = 0,
    totalTransactions = [],
  ) {
    const params = {
      account_number,
      from: range.minRange,
      to: range.maxRange,
      count: 100,
      skip,
    };
    const razorpay2: any = await this.api.get(
      nRazorTransactions,
      params,
      null,
      {
        auth,
      },
    );
    if (razorpay2 === k500Error) return kInternalError;
    if (razorpay2.count === 0) return totalTransactions;
    totalTransactions.push(...(razorpay2.items ?? []));
    if (razorpay2.count != 100) return totalTransactions;
    return await this.getRazorpayTransactions(
      account_number,
      range,
      auth,
      skip + 100,
      totalTransactions,
    );
  }

  async getFiscalSummaryDisbursement(reqData) {
    try {
      const year = reqData?.year;
      if (!year) return kParamMissing('year');
      const today = new Date();

      const years = new Date(
        today.getFullYear() - year,
        today.getMonth(),
        today.getDate(),
      );

      const startDate: any = this.typeService.getGlobalDate(years).toJSON();
      const endDate: any = this.typeService.getGlobalDate(today).toJSON();

      const loanData: any = await this.getLoanData(startDate, endDate);
      if (loanData == k500Error) return kInternalError;

      const transData = await this.getTransData(startDate, endDate);
      if (transData === k500Error) return kInternalError;

      const userData = await this.getUserData(startDate, endDate);
      if (userData === k500Error) return kInternalError;

      const defaulterData = await this.getDefaulterUserData(startDate, endDate);
      if (defaulterData === k500Error) return kInternalError;

      const loanExpectedData = await this.loanExpectedData(startDate, endDate);
      if (loanExpectedData === k500Error) return kInternalError;

      const data = {
        loanData,
        transData,
        defaulterData,
        userData,
        loanExpectedData,
      };
      const finalData = await this.prepareFiscalData(data, year);

      return finalData;
    } catch (error) {
      console.error(error);
      return kInternalError;
    }
  }

  private async getLoanData(startDate, endDate) {
    try {
      const options: any = {
        where: {
          loan_disbursement: '1',
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          loanStatus: { [Op.or]: ['Active', 'Complete'] },
        },
      };
      const disDate = 'loan_disbursement_date';
      const group = [
        this.typeService.manageDateAttr('month', '', disDate, false),
        this.typeService.manageDateAttr('year', '', disDate, false),
        'loanTransaction.id',
      ];
      const attributes = [
        this.typeService.manageDateAttr('month', '', disDate),
        this.typeService.manageDateAttr('year', '', disDate),
        [
          Sequelize.fn('COUNT', Sequelize.col('loanTransaction.id')),
          'totalcount',
        ],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.cast(
              Sequelize.col('netApprovedAmount'),
              'double precision',
            ),
          ),
          'netTotal',
        ],
      ];

      options.group = group;
      return await this.loanRepo.getTableWhereData(attributes, options);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getTransData(startDate, endDate) {
    try {
      const transOptions: any = {
        where: {
          status: kCompleted,
          type: { [Op.ne]: kRefund },
          completionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
      };
      const completionDate = 'completionDate';
      const transGroup = [
        this.typeService.manageDateAttr('month', '', completionDate, false),
        this.typeService.manageDateAttr('year', '', completionDate, false),
      ];
      const transAttributes: any = [
        this.typeService.manageDateAttr('month', '', completionDate),
        this.typeService.manageDateAttr('year', '', completionDate),
        [
          Sequelize.fn(
            'SUM',
            Sequelize.cast(
              Sequelize.col('principalAmount'),
              'double precision',
            ),
          ),
          'totalPrincAmount',
        ],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.cast(Sequelize.col('interestAmount'), 'double precision'),
          ),
          'totalIntAmount',
        ],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.cast(Sequelize.col('penaltyAmount'), 'double precision'),
          ),
          'totalPenaltyAmount',
        ],
      ];
      transOptions.group = transGroup;
      return await this.transRepo.getTableWhereData(
        transAttributes,
        transOptions,
      );
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getUserData(startDate, endDate) {
    try {
      const range = this.typeService.getUTCDateRange(startDate, endDate);

      const userOptions: any = {
        where: {
          createdAt: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
      };
      const userGroup = [
        this.typeService.manageDateAttr(
          'month',
          '"registeredUsers".',
          '',
          false,
        ),
        this.typeService.manageDateAttr(
          'year',
          '"registeredUsers".',
          '',
          false,
        ),
      ];
      const userAttributes: any = [
        this.typeService.manageDateAttr('month', '"registeredUsers".'),
        this.typeService.manageDateAttr('year', '"registeredUsers".'),
        [
          Sequelize.fn('COUNT', Sequelize.col('registeredUsers.id')),
          'userCount',
        ],
      ];
      userOptions.group = userGroup;
      return await this.userRepo.getTableWhereData(userAttributes, userOptions);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getDefaulterUserData(startDate, endDate) {
    try {
      const disDate = 'loan_disbursement_date';
      const loanOptions: any = {
        where: {
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          loanStatus: 'Active',
        },
        include: [
          {
            model: registeredUsers,
            attributes: [],
            where: { loanStatus: '3' },
            required: true,
          },
        ],
      };
      const loanGroup = [
        this.typeService.manageDateAttr('month', '', disDate, false),
        this.typeService.manageDateAttr('year', '', disDate, false),
      ];
      const loanAttributes = [
        this.typeService.manageDateAttr('month', '', disDate),
        this.typeService.manageDateAttr('year', '', disDate),
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.literal('DISTINCT "loanTransaction"."userId"'),
          ),
          'totalDefaultCount',
        ],
      ];
      loanOptions.group = loanGroup;
      return await this.loanRepo.getTableWhereData(loanAttributes, loanOptions);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async loanExpectedData(startDate, endDate) {
    try {
      const options: any = {
        where: {
          loan_disbursement: '1',
          loan_disbursement_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        include: [
          {
            model: EmiEntity,
            as: 'emiData',
            attributes: [],
          },
        ],
      };
      const disDate = 'loan_disbursement_date';
      const group = [
        this.typeService.manageDateAttr('month', '', disDate, false),
        this.typeService.manageDateAttr('year', '', disDate, false),
      ];
      const attributes = [
        this.typeService.manageDateAttr('month', '', disDate),
        this.typeService.manageDateAttr('year', '', disDate),
        [
          Sequelize.fn('SUM', Sequelize.col('emiData.interestCalculate')),
          'totalInterestAmount',
        ],
      ];
      options.group = group;
      options.raw = true;
      return await this.loanRepo.getTableWhereData(attributes, options);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async prepareFiscalData(data, years) {
    try {
      const { loanData, transData, defaulterData, userData, loanExpectedData } =
        data;
      const startMonth = 4;
      const endMonth = 3;
      const financialYearData = [];

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const startYear =
        currentMonth > endMonth ? currentYear - years + 1 : currentYear - years;

      for (let year = startYear; year <= new Date().getFullYear(); year++) {
        const financialYear = await this.calculateFinancialYear(
          year,
          currentMonth,
          startMonth,
          currentYear,
        );
        if (
          loanData.some((item) => item.loan_disbursement_dateyear === year) &&
          transData.some((item) => item.completionDateyear === year) &&
          userData.some((item) => item.year === year) &&
          financialYear != null
        ) {
          const netPrincipalAmount = await this.filterAndSum(
            loanData,
            'loan_disbursement_date',
            'netTotal',
            year,
            startMonth,
            endMonth,
          );
          const disbursedLoan = await this.filterAndSum(
            loanData,
            'loan_disbursement_date',
            'totalcount',
            year,
            startMonth,
            endMonth,
          );
          const netInterestAmount = await this.filterAndSum(
            loanExpectedData,
            'loan_disbursement_date',
            'totalInterestAmount',
            year,
            startMonth,
            endMonth,
          );
          const netRepaidPrincAmount = await this.filterAndSum(
            transData,
            'completionDate',
            'totalPrincAmount',
            year,
            startMonth,
            endMonth,
          );
          const netRepaidIntAmount = await this.filterAndSum(
            transData,
            'completionDate',
            'totalIntAmount',
            year,
            startMonth,
            endMonth,
          );
          const netRepaidPenaltyAmount = await this.filterAndSum(
            transData,
            'completionDate',
            'totalPenaltyAmount',
            year,
            startMonth,
            endMonth,
          );
          const netUserCount = await this.filterAndSum(
            userData,
            '',
            'userCount',
            year,
            startMonth,
            endMonth,
          );
          const netDefaultData = await this.filterAndSum(
            defaulterData,
            'loan_disbursement_date',
            'totalDefaultCount',
            year,
            startMonth,
            endMonth,
          );

          const defaulter: any =
            Number(((netDefaultData / disbursedLoan) * 100).toFixed(2)) || 0;
          financialYearData.push({
            fiscalYear: `FY (${financialYear})`,
            registration: `${this.typeService.amountNumberWithCommas(
              netUserCount,
            )}`,
            loanDisbursed: `${this.typeService.amountNumberWithCommas(
              disbursedLoan,
            )}`,
            principalAmount: `${kRuppe}${this.typeService.amountNumberWithCommas(
              Math.floor(netPrincipalAmount),
            )}`,
            interestAmount: `${kRuppe}${this.typeService.amountNumberWithCommas(
              Math.floor(netInterestAmount),
            )}`,
            receivedPrincipal: `${kRuppe}${this.typeService.amountNumberWithCommas(
              Math.floor(netRepaidPrincAmount),
            )}`,
            recievedInterest: `${kRuppe}${this.typeService.amountNumberWithCommas(
              Math.floor(netRepaidIntAmount),
            )}`,
            recievedPenalty: `${kRuppe}${this.typeService.amountNumberWithCommas(
              Math.floor(netRepaidPenaltyAmount),
            )}`,
            defaulterUserPercent: `${defaulter}%`,
          });
        }
      }

      financialYearData.sort((a, b) =>
        b.fiscalYear.localeCompare(a.fiscalYear),
      );

      return financialYearData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  private async calculateFinancialYear(year, month, startMonth, currentYear) {
    return year === currentYear && month < startMonth
      ? null
      : `${year}-${year + 1}`;
  }

  private async filterAndSum(
    data,
    dateField,
    sumField,
    year,
    startMonth,
    endMonth,
  ) {
    const fromDate = this.typeService.getGlobalDate(
      new Date(year, startMonth - 1),
    );
    const toDate = this.typeService.getGlobalDate(
      new Date(year + 1, endMonth - 1),
    );

    const filteredData = data.filter((item) => {
      const itemDate = this.typeService.getGlobalDate(
        new Date(item[dateField + 'year'], item[dateField + 'month'] - 1),
      );
      return itemDate >= fromDate && itemDate <= toDate;
    });

    const sum = filteredData.reduce(
      (total, item) => total + (+item[sumField] || 0),
      0,
    );
    return sum;
  }
}
