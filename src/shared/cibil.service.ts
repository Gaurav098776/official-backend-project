// Imports
import { Op } from 'sequelize';
import { Injectable } from '@nestjs/common';
import {
  CIBIL_MEMBER_PASS,
  CIBIL_MEMBER_USERID,
  MAX_INQUIRY_PAST_30_DAYS,
  CIBIL_MIN_PL_SCORE,
  NAME_MISS_MATCH_PER,
  MIN_CIBIL_SCORE,
  MIN_PL_SCORE,
  cibilIdType,
  cibilAccountOwnershipIndicator,
  cibilAccountType,
  cibilAddressCategory,
  cibilCollateralType,
  cibilCreditFacilityStatus,
  cibilOccupationCode,
  cibilPaymentFrequency,
  cibilResidenceCode,
  cibilSuitFiled,
  cibilTelephoneType,
  cibilStateCode,
  GLOBAL_RANGES,
  CIBIL_REDIS_KEY,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kNoDataFound,
} from 'src/constants/responses';
import { regPanCard } from 'src/constants/validation';
import { KYCEntity } from 'src/entities/kyc.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService, convertDateInDDMMYYYY } from 'src/utils/type.service';
import { NSModel } from 'src/admin/cibil_score/model/ns.tudf.model';
import { CibilThirdParty } from 'src/thirdParty/cibil/cibil.service';
import { RedisService } from 'src/redis/redis.service';
import { RedisKeys, kMockResponse, shortMonth } from 'src/constants/objects';
import { ValidationService } from 'src/utils/validation.service';
import { KycServiceV4 } from 'src/v4/kyc/kyc.service.v4';
import { kCibilScore } from 'src/constants/directories';
import { LoanRepository } from 'src/repositories/loan.repository';
import { DateService } from 'src/utils/date.service';
import { EnvConfig } from 'src/configs/env.config';
import { loanTransaction } from 'src/entities/loan.entity';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { NUMBERS } from 'src/constants/numbers';
@Injectable()
export class CibilService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly loanRepo: LoanRepository,
    private readonly CibilScoreRepo: CibilScoreRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly cryptService: CryptService,
    private readonly kycService: KycServiceV4,
    private readonly typeService: TypeService,
    private readonly NSModel: NSModel,
    private readonly cibilThirdParty: CibilThirdParty,
    // Database
    private readonly redis: RedisService,
    private readonly repo: RepositoryManager,
    // Utils
    private readonly validation: ValidationService,
    private readonly dateService: DateService,
  ) {}

  async cibilPersonalLoanScore(body: any) {
    try {
      // Validation -> Parameters
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');

      let loanId = body?.loanId;
      const cibilForceFetch = body?.cibilForceFetch == 'true';

      // Preparation -> Query
      const attributes = [
        'completedLoans',
        'fullName',
        'gender',
        'phone',
        'email',
        'appType',
      ];
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = [
        'id',
        'aadhaarDOB',
        'aadhaarAddress',
        'aadhaarAddressResponse',
        'panCardNumber',
        'panStatus',
        'pincode',
      ];
      const include = [kycInclude];
      const options = { include, where: { id: userId } };
      // Hit -> Query
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      // Validation -> Query data
      if (userData == k500Error) return kInternalError;
      if (!userData) return kNoDataFound;

      const appType = userData?.appType;
      userData.phone = this.cryptService.decryptPhone(userData.phone);

      // Preparation -> Address details
      const cibilAddress = this.typeService.getAadhaarAddress(userData.kycData);
      cibilAddress.address = cibilAddress.address.replace(/\s/g, '');
      const addressLine = this.NSModel.getAddressNameLines(
        cibilAddress.address,
        40,
      );
      const nameLine = this.NSModel.getAddressNameLines(userData.fullName, 26);
      let stateCode = this.NSModel.getStateCode(cibilAddress.state).replace(
        '0602',
        '',
      );

      let aadharDOB = await this.typeService.getDateAsPerAadhaarDOB(
        userData.kycData.aadhaarDOB,
      );

      var parts = aadharDOB.split('-');
      var cibilDOB = parts[2] + parts[1] + parts[0];
      let cibilGender =
        userData.gender.toLocaleUpperCase() == 'MALE' ? '2' : '1';

      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());

      if (
        stateCode == '99' ||
        !userData.kycData.pincode ||
        userData.kycData.pincode == '-'
      ) {
        stateCode = '99';
        userData.kycData.pincode = '999999';
      }

      // Preparation -> API
      const cibilReqData = {
        url: 'acquire/credit-assessment/v1/consumer-cir-cv',
        custRefId: loanId,
        sampledata: {
          serviceCode: 'CN1CAS0013',
          monitoringDate: monitoringDate,
          consumerInputSubject: {
            tuefHeader: {
              headerType: 'TUEF',
              version: '12',
              memberRefNo: 'MR' + loanId,
              gstStateCode: '01',
              enquiryMemberUserId: CIBIL_MEMBER_USERID,
              enquiryPassword: CIBIL_MEMBER_PASS,
              enquiryPurpose: '05',
              enquiryAmount: '000000001',
              scoreType: '16',
              outputFormat: '03',
              responseSize: '1',
              ioMedia: 'CC',
              authenticationMethod: 'L',
            },
            names: [
              {
                index: 'N01',
                firstName: nameLine[0] ?? '',
                middleName: nameLine[2] ?? '',
                lastName: nameLine[1] ?? '',
                birthDate: cibilDOB,
                gender: cibilGender,
              },
            ],
            ids: [
              {
                index: 'I01',
                idNumber: userData.kycData.panCardNumber,
                idType: '01',
              },
            ],
            telephones: [
              {
                index: 'T01',
                telephoneNumber: userData.phone,
                telephoneType: '01',
              },
            ],
            addresses: [
              {
                index: 'A01',
                line1: addressLine[0] ?? '',
                line2: addressLine[1] ?? '',
                line3: addressLine[2] ?? '',
                line4: addressLine[3] ?? '',
                line5: addressLine[4] ?? '',
                stateCode: stateCode,
                pinCode: userData.kycData.pincode,
                addressCategory: '01',
                residenceCode: '01',
              },
            ],
            enquiryAccounts: [
              {
                index: 'I01',
                accountNumber: '',
              },
            ],
          },
        },
      };

      try {
        let existingData;
        /* Manipulate the cibil response with the help of redis 
        as per testing requirements, Works in DEV, UAT, PROD all environment modes*/
        await this.delDataFromRedis(userId, false); // for single
        await this.delDataFromRedis(userId, true); // for multiple
        const mockResponse = await this.getMockResponse(
          userData.kycData.panCardNumber,
        );

        if (mockResponse != null) existingData = mockResponse;
        //if not hitting forcefully  cibil fetch button
        else if (!cibilForceFetch) {
          /* Manipulate the cibil response with the help of postgres 
        as per testing requirements, Works in DEV, UAT, PROD all environment modes*/
          const dbResponse = await this.getDBResponse(userId, loanId);
          if (dbResponse != null) existingData = dbResponse;
          // lsp user
          if (
            userData?.email &&
            (userData.email.includes(
              EnvConfig.emailDomain.companyEmailDomain1,
            ) ||
              userData.email.includes(
                EnvConfig.emailDomain.companyEmailDomain2,
              ))
          ) {
            existingData = kMockResponse;
            existingData.consumerCreditData[0].names[0].name =
              userData.fullName;
            existingData.consumerCreditData[0].names[0].birthDate = cibilDOB;
            existingData.consumerCreditData[0].names[0].gender = cibilGender;
          }
        }
        const getoptions = {
          where: { userId },
          order: [['id', 'DESC']],
        };
        let scoreData: any;
        let getDataFromRedis = await this.getDataFromRedis(userId, null, false);
        scoreData = getDataFromRedis;
        if (!getDataFromRedis || getDataFromRedis?.status != '1') {
          scoreData = await this.CibilScoreRepo.getRowWhereData(
            ['id', 'loanId'],
            getoptions,
          );
          if (scoreData == k500Error) return kInternalError;
          await this.setDataInRedis(userId, null, scoreData, false);
        }

        if (scoreData?.loanId !== loanId || cibilForceFetch) {
          const rData = {
            userId,
            loanId,
            type: '1',
          };

          //if cibit data is created again of existing user then it deleted data from redis

          scoreData = await this.CibilScoreRepo.createRowData(rData);
          if (scoreData == k500Error) return kInternalError;
          if (!scoreData) return k422ErrorMessage(kNoDataFound);
          await this.delDataFromRedis(userId, false); // for single
          await this.delDataFromRedis(userId, true); // for multiple
        }
        const cibilId = scoreData.id;
        const loanOpts = {
          where: { userId, loanStatus: ['InProcess', 'Accepted'] },
          order: [['id', 'DESC']],
        };
        const loanData = await this.loanRepo.getRowWhereData(['id'], loanOpts);
        if (loanData != k500Error && loanData?.id) {
          const lId = loanData.id;
          await this.loanRepo.updateRowData({ cibilId }, lId);
        }
        // API hit to cibil server
        const result: any =
          existingData != null
            ? existingData
            : await this.cibilThirdParty.CreditVisionScorePersonalLoanScore(
                cibilReqData,
              );

        // Response failure
        if (result?.message) {
          // Update failed response
          const updatedData: any = {};
          updatedData.status = '3';
          updatedData.responsedata = result;
          updatedData.requestdata = cibilReqData;
          await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
          result.success = false;
          return result;
        } else {
          // Update failed response
          if (result?.controlData?.success == false) {
            const updatedData: any = {};
            updatedData.status = '2';
            updatedData.responsedata = result;
            updatedData.requestdata = cibilReqData;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
            result.success = false;
            return result;
          }
          // Update success response
          else if (result?.controlData?.success == true) {
            const scoreDate = result?.consumerCreditData[0].scores[0].scoreDate;
            const fetchDate = scoreDate
              ? this.typeService.strDateToDate(
                  result.consumerCreditData[0]?.scores[0]?.scoreDate,
                )
              : null;
            // Validate name
            const isValidName = await this.validateNameAsPerCibil(
              userData.fullName,
              result.consumerCreditData[0]?.names ?? [],
              appType,
            );
            result.internal_name_check = isValidName;

            const updatedData: any = {};
            updatedData.status = '1';
            updatedData.requestdata = cibilReqData;
            updatedData.responsedata = result;
            if (fetchDate)
              updatedData.fetchDate = this.typeService
                .getGlobalDate(new Date(fetchDate))
                .toJSON();
            updatedData.tuefHeader = result.consumerCreditData[0]?.tuefHeader;
            updatedData.names = result.consumerCreditData[0]?.names;
            updatedData.ids = result.consumerCreditData[0]?.ids;
            updatedData.telephones = result.consumerCreditData[0]?.telephones;
            updatedData.emails = result.consumerCreditData[0]?.emails;
            updatedData.employment = result.consumerCreditData[0]?.employment;
            updatedData.scores = result.consumerCreditData[0]?.scores;
            updatedData.addresses = result.consumerCreditData[0]?.addresses;
            updatedData.enquiries = result.consumerCreditData[0]?.enquiries;

            let totalDelayDays = 0;
            let PLOutstanding = 0;
            let totalOutstanding = 0;
            let PLAccounts = 0;
            let ourOverdueAmount = 0;
            let ourOverdueAccounts = 0;
            let past6MonthDelay = 0;
            let today = new Date();
            today.setMonth(today.getMonth() - 6);
            if (result.consumerCreditData[0]?.accounts?.length > 0) {
              for (
                let index = 0;
                index < result.consumerCreditData[0]?.accounts.length;
                index++
              ) {
                const element = result.consumerCreditData[0]?.accounts[index];

                // CSC 1.0.0 -> Guarantor account should be in exception for all scenarios
                if (element.ownershipIndicator === 3) continue;

                totalOutstanding += element.currentBalance;
                if (!['01', '02', '03', '04'].includes(element.accountType)) {
                  PLOutstanding += element.currentBalance;
                  PLAccounts++;
                }
                const paymentHistory = await this.decodePaymentHistory(
                  element.paymentHistory,
                );
                element.lastDelayDays = paymentHistory.lastDelayDays;
                element.past6MonDelayDays = 0;
                if (element?.amountOverdue > 0 && !element?.dateClosed) {
                  totalDelayDays += paymentHistory.lastDelayDays;
                  ourOverdueAmount += element.amountOverdue;
                  ourOverdueAccounts++;
                }
                const dateReported = new Date(
                  this.typeService.strDateToDate(element.dateReported),
                );
                if (dateReported >= today) {
                  const monthDiff = this.typeService.dateDifference(
                    today,
                    dateReported,
                    'Month',
                  );

                  const historyArray =
                    monthDiff === 0
                      ? [paymentHistory.historyArray[0]]
                      : paymentHistory.historyArray.slice(0, monthDiff);

                  for (const entry of historyArray) {
                    const status = parseInt(entry.status);
                    if (!isNaN(status) && status > element.past6MonDelayDays)
                      element.past6MonDelayDays = status;
                  }
                  if (element.past6MonDelayDays > 0) past6MonthDelay = 1;
                }
              }
            }
            updatedData.accounts = result.consumerCreditData[0]?.accounts;
            updatedData.past6MonthDelay = past6MonthDelay;

            let monthlyIncome: any = 0;
            if (result.consumerCreditData[0]?.employment?.length > 0) {
              for (
                let index = 0;
                index < result.consumerCreditData[0]?.employment.length;
                index++
              ) {
                const element = result.consumerCreditData[0]?.employment[index];
                if (element?.income) {
                  if (element?.incomeFrequency == 'A')
                    monthlyIncome = element.income / 12;
                  else monthlyIncome = element.income;
                  monthlyIncome = isNaN(monthlyIncome)
                    ? 0
                    : parseInt(monthlyIncome);
                }
              }
            }
            updatedData.monthlyIncome = monthlyIncome;
            let panMatch = false;
            let cibilPan;
            if (result.consumerCreditData[0]?.ids?.length > 0) {
              for (
                let index = 0;
                index < result.consumerCreditData[0]?.ids.length;
                index++
              ) {
                const element = result.consumerCreditData[0]?.ids[index];
                if (
                  element?.idType == '01' &&
                  element?.idNumber == userData.kycData.panCardNumber
                ) {
                  panMatch = true;
                  cibilPan = element?.idNumber;
                }
              }
            }

            updatedData.cibilScore =
              result.consumerCreditData[0]?.scores[0]?.score.replace(
                /^0+/,
                '',
              ) ?? -1;
            updatedData.plScore =
              result.consumerCreditData[0]?.scores[1]?.score.replace(
                /^0+/,
                '',
              ) ?? -1;

            //setting Cibil score and PL score for every user after cibil hit in redis
            const mode = process.env.MODE;
            let cibilScoreObj: any = {
              cibilScore: parseInt(updatedData?.cibilScore),
              plScore: parseInt(updatedData?.plScore),
            };
            cibilScoreObj = JSON.stringify(cibilScoreObj);
            await this.redis.set(
              `CIBIL_SCORE_DATA_${userId}`,
              cibilScoreObj,
              604800,
            );

            updatedData.totalAccounts =
              result.consumerSummaryData?.accountSummary?.totalAccounts;
            updatedData.currentBalance =
              result.consumerSummaryData?.accountSummary?.currentBalance;
            updatedData.overdueBalance = ourOverdueAmount;
            updatedData.totalOverdueDays = totalDelayDays;
            updatedData.PLOutstanding = PLOutstanding;
            updatedData.PLAccounts = PLAccounts;
            updatedData.totalOutstanding = totalOutstanding;
            updatedData.overdueAccounts = ourOverdueAccounts;
            updatedData.highCreditAmount =
              result.consumerSummaryData?.accountSummary?.highCreditAmount;
            updatedData.zeroBalanceAccounts =
              result.consumerSummaryData?.accountSummary?.zeroBalanceAccounts;
            updatedData.oldestDateOpened =
              await this.typeService.cibiDateToDBDate(
                result.consumerSummaryData?.accountSummary?.oldestDateOpened,
              );
            updatedData.recentDateOpened =
              await this.typeService.cibiDateToDBDate(
                result.consumerSummaryData?.accountSummary?.recentDateOpened,
              );

            updatedData.totalInquiry =
              result.consumerSummaryData?.inquirySummary?.totalInquiry;
            updatedData.inquiryPast30Days =
              result.consumerSummaryData?.inquirySummary?.inquiryPast30Days;
            updatedData.recentInquiryDate =
              await this.typeService.cibiDateToDBDate(
                result.consumerSummaryData?.inquirySummary?.recentInquiryDate,
              );
            updatedData.inquiryPast12Months =
              result.consumerSummaryData?.inquirySummary?.inquiryPast12Months;
            updatedData.inquiryPast24Months =
              result.consumerSummaryData?.inquirySummary?.inquiryPast24Months;

            // Update cibil data
            let validCibilData = 0;
            if (isValidName == true && panMatch == true) {
              validCibilData = 1;
              if (regPanCard(cibilPan)) {
                const kycData = {
                  userId: userId,
                  pan: cibilPan,
                  consentMode: kCibilScore,
                };
                await this.kycService.validatePan(kycData, true);
              }
            }
            updatedData.validCibilData = validCibilData;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);

            if (result.consumerCreditData[0]?.addresses?.length > 0)
              await this.addCibilAddresses(
                userId,
                result.consumerCreditData[0]?.addresses,
              );
            result.success = true;

            // Validation -> CSC 1.1.0
            const completedLoans = userData.completedLoans ?? 0;
            const isPLExceptionUser =
              completedLoans >= GLOBAL_RANGES.PL_EXCEPTION_MIN_COMPLETED_LOANS;

            // #01 -> No cibil or PL history
            if (
              updatedData.cibilScore == -1 ||
              (updatedData.plScore == -1 && !isPLExceptionUser)
            ) {
              return { isLoanDeclined: true, result };
            }
            // #02 -> No personal loans history
            // else if (updatedData.PLAccounts == 0 && !isPLExceptionUser)
            //   return { isLoanDeclined: true, result };
            // #03 -> Amount overdue & Not ideal score
            else if (
              updatedData.overdueBalance > 0 &&
              (+updatedData.cibilScore < GLOBAL_RANGES.MIN_IDEAL_CIBIL_SCORE ||
                (+updatedData.plScore < GLOBAL_RANGES.MIN_IDEAL_PL_SCORE &&
                  !isPLExceptionUser))
            ) {
              return { isLoanDeclined: true, result };
            }
            // #04 -> Riskier PL score
            else if (
              updatedData.plScore < CIBIL_MIN_PL_SCORE &&
              !isPLExceptionUser
            ) {
              return { isLoanDeclined: true, result };
            }
            // #05 -> Ideal Cibil user but very high inquiry in past 30 days
            else if (
              updatedData.inquiryPast30Days > MAX_INQUIRY_PAST_30_DAYS &&
              updatedData.cibilScore < MIN_CIBIL_SCORE &&
              updatedData.plScore < MIN_PL_SCORE &&
              !isPLExceptionUser
            ) {
              return { isLoanDeclined: true, result };
            } else {
              let UUData = { maybeGoodCibil: 0 };
              if (
                updatedData.cibilScore >= MIN_CIBIL_SCORE &&
                updatedData.plScore >= MIN_PL_SCORE &&
                updatedData.totalOverdueDays == 0
              ) {
                UUData = { maybeGoodCibil: 1 };
              }
              await this.userRepo.updateRowData(UUData, userId);
              return {
                isLoanDeclined: false,
                success: true,
                ...updatedData,
                UUData,
              };
            }
          }
          // Update unexpected response
          else {
            const updatedData: any = {};
            updatedData.status = '4';
            updatedData.responsedata = result;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
            result.success = false;
            return result;
          }
        }
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  /* Manipulate the cibil response with the help of redis 
        as per testing requirements, Works in DEV, UAT, PROD all environment modes*/
  private async getMockResponse(panNumber) {
    // Check mock service
    let mockService =
      (await this.redis.getKeyDetails(RedisKeys.MOCK_SERVICES)) ?? {};
    if (typeof mockService == 'string') mockService = JSON.parse(mockService);

    const isMockCibilService = mockService.cibil_hard_pull ?? false;
    if (isMockCibilService?.toString() != 'true') return;

    // Get mock data
    let mockResponse =
      (await this.redis.getKeyDetails(RedisKeys.MOCK_CIBIL_DATA)) ?? {};
    if (typeof mockResponse == 'string')
      mockResponse = JSON.parse(mockResponse);
    if (typeof mockResponse == 'string')
      mockResponse = JSON.parse(mockResponse);

    if (mockResponse[panNumber])
      return { ...mockResponse[panNumber], internal_source: 'REDIS' };
    else return;
  }

  /* Manipulate the cibil response with the help of postgres 
        as per testing requirements, Works in DEV, UAT, PROD all environment modes*/
  private async getDBResponse(userId, loanId) {
    const today = new Date();
    // New cibil should not get fetched within 45 days of previous fetched date
    today.setDate(today.getDate() - 45);
    const attributes = ['id', 'loanId', 'responsedata'];
    const options = {
      order: [['id', 'DESC']],
      where: {
        userId,
        createdAt: { [Op.gte]: today },
        type: '1',
        status: '1',
      },
    };
    let existingData: any;
    let getDataFromRedis = await this.getDataFromRedis(userId, loanId, true);
    existingData = getDataFromRedis;
    if (!getDataFromRedis || getDataFromRedis?.status != '1') {
      existingData = await this.CibilScoreRepo.getTableWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return;
      if (!existingData.length) return;
      await this.setDataInRedis(userId, loanId, existingData, true);
    }

    let filteredData = null;
    for (let i = 0; i < existingData.length; i++) {
      const data = existingData[i];
      if (data?.responsedata && !data?.responsedata?.internal_source) {
        if (data.loanId !== loanId) {
          filteredData = {
            ...data.responsedata,
            internal_source: 'POSTGRES',
          };
        } else {
          filteredData = {
            ...data.responsedata,
          };
        }
        break;
      }
    }
    return filteredData;
  }

  // Validate wheater the name is correct or not
  private async validateNameAsPerCibil(
    targetName: string,
    names: any[],
    appType,
  ) {
    for (let index = 0; index < names.length; index++) {
      try {
        const cibilName = (names[0]?.name ?? '')
          .toLowerCase()
          .replace('null', '')
          .trim();
        const response = await this.validation.nameMatch(
          targetName,
          cibilName,
          appType,
        );
        if (response == k500Error) return kInternalError;
        if (response.valid == true) {
          if (response.data >= NAME_MISS_MATCH_PER) return true;
        }
      } catch (error) {}
    }

    return false;
  }

  async updateCibilScoreData() {
    try {
      const attributes = [
        'id',
        'accounts',
        'employment',
        'names',
        'requestdata',
        'ids',
      ];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['id', 'fullName', 'appType'];
      const include = [userInclude];
      const options = { include, where: { type: '1', status: '1' } };
      const cibilData: any = await this.CibilScoreRepo.getTableWhereData(
        attributes,
        options,
      );
      if (cibilData == k500Error) return kInternalError;
      if (!cibilData) return kNoDataFound;

      cibilData.forEach(async (result) => {
        // Validate name
        const isValidName = await this.validateNameAsPerCibil(
          result.registeredUsers.fullName,
          result?.names ?? [],
          result.registeredUsers.appType,
        );

        /// Update success response
        const updatedData: any = {};

        let totalDelayDays = 0;
        let PLOutstanding = 0;
        let totalOutstanding = 0;
        let PLAccounts = 0;
        if (result.accounts?.length > 0) {
          for (let index = 0; index < result.accounts.length; index++) {
            const element = result.accounts[index];
            totalOutstanding += element.currentBalance;
            if (!['01', '02', '03', '04'].includes(element.accountType)) {
              PLOutstanding += element.currentBalance;
              PLAccounts++;
            }
            const paymentHistory = await this.decodePaymentHistory(
              element.paymentHistory,
            );
            element.lastDelayDays = paymentHistory.lastDelayDays;
            if (element?.amountOverdue > 0)
              totalDelayDays += paymentHistory.lastDelayDays;
          }
        }
        updatedData.accounts = result.accounts;
        updatedData.totalOverdueDays = totalDelayDays;
        updatedData.PLOutstanding = PLOutstanding;
        updatedData.PLAccounts = PLAccounts;
        updatedData.totalOutstanding = totalOutstanding;

        let monthlyIncome: any = 0;
        if (result.employment?.length > 0) {
          for (let index = 0; index < result.employment.length; index++) {
            const element = result.employment[index];
            if (element?.income) {
              if (element?.incomeFrequency == 'A')
                monthlyIncome = element.income / 12;
              else monthlyIncome = element.income;
              monthlyIncome = isNaN(monthlyIncome)
                ? 0
                : parseInt(monthlyIncome);
            }
          }
        }
        updatedData.monthlyIncome = monthlyIncome;

        let panMatch = false;
        if (result.ids?.length > 0) {
          for (let index = 0; index < result.ids.length; index++) {
            const element = result.ids[index];
            if (
              element?.idType == '01' &&
              element?.idNumber ==
                result.requestdata.sampledata.consumerInputSubject.ids[0]
                  .idNumber
            ) {
              panMatch = true;
            }
          }
        }

        // Update cibil data
        let validCibilData = 0;
        if (isValidName == true && panMatch == true) validCibilData = 1;
        updatedData.validCibilData = validCibilData;

        const res = await this.CibilScoreRepo.updateRowData(
          updatedData,
          result.id,
        );
        if (res == k500Error) return kInternalError;
        return true;
      });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async cibilPreScreen(body: any) {
    try {
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');

      const attributes = ['panName', 'phone'];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return kNoDataFound;
      userData.phone = this.cryptService.decryptPhone(userData.phone);

      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());

      const nameLine = this.NSModel.getAddressNameLines(userData.panName, 26);

      const cibilReqData = {
        url: 'digital-onboarding/acquire/v1/prefill',
        custRefId: userId,
        sampledata: {
          serviceCode: 'CN1OPF0001',
          monitoringDate: monitoringDate,
          searchPaths: [
            {
              searchPath: 'phoneNameSearch',
            },
          ],
          consumerInputSubject: {
            tuefHeader: {
              headerType: 'TUEF',
              version: '12',
              memberRefNo: 'MR' + userData.phone,
              gstStateCode: '01',
              enquiryMemberUserId: CIBIL_MEMBER_USERID,
              enquiryPassword: CIBIL_MEMBER_PASS,
              enquiryPurpose: '65',
              enquiryAmount: '000000001',
              scoreType: '08',
              outputFormat: '03',
              responseSize: '1',
              ioMedia: 'CC',
              authenticationMethod: 'L',
            },
            names: [
              {
                index: 'N01',
                firstName: nameLine[0] ?? '',
                middleName: nameLine[2] ?? '',
                lastName: nameLine[1] ?? '',
              },
            ],
            telephones: [
              {
                index: 'T01',
                telephoneNumber: userData.phone,
                telephoneType: '01',
              },
            ],
          },
        },
      };

      /// Add data to cibil score table
      const rData = {
        userId,
        type: '2',
        requestdata: cibilReqData,
      };
      //if cibit data is created again of existing user then it deleted data from redis

      const scoreData = await this.CibilScoreRepo.createRowData(rData);
      if (scoreData == k500Error) return kInternalError;
      if (!scoreData) return k422ErrorMessage(kNoDataFound);
      await this.delDataFromRedis(userId, false); // for single
      await this.delDataFromRedis(userId, true); // for multiple
      try {
        const result: any = await this.cibilThirdParty.onlinePrefill(
          cibilReqData,
        );
        if (result?.message) {
          /// Update error response
          const updatedData: any = {};
          updatedData.status = '3';
          updatedData.responsedata = result;
          await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
          return result;
        } else {
          if (result?.controlData?.success == false) {
            /// Update failed response
            const updatedData: any = {};
            updatedData.status = '2';
            updatedData.responsedata = result;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
            return result;
          } else if (result?.controlData?.success == true) {
            /// Update success response
            const updatedData: any = {};
            updatedData.status = '1';
            updatedData.responsedata = result;
            updatedData.tuefHeader = result.consumerCreditData[0]?.tuefHeader;
            updatedData.names = result.consumerCreditData[0]?.names;
            updatedData.ids = result.consumerCreditData[0]?.ids;
            updatedData.telephones = result.consumerCreditData[0]?.telephones;
            updatedData.emails = result.consumerCreditData[0]?.emails;
            updatedData.employment = result.consumerCreditData[0]?.employment;
            updatedData.addresses = result.consumerCreditData[0]?.addresses;
            let monthlyIncome: any = 0;
            if (result.consumerCreditData[0]?.employment?.length > 0) {
              result.consumerCreditData[0]?.employment.forEach(
                async (element) => {
                  if (element?.income) {
                    if (element?.incomeFrequency == 'A')
                      monthlyIncome = element.income / 12;
                    else monthlyIncome = element.income;
                    monthlyIncome = isNaN(monthlyIncome)
                      ? 0
                      : parseInt(monthlyIncome);
                  }
                },
              );
            }
            updatedData.monthlyIncome = monthlyIncome;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
            if (result.consumerCreditData[0]?.addresses?.length > 0)
              await this.addCibilAddresses(
                userId,
                result.consumerCreditData[0]?.addresses,
              );
            return result;
          } else {
            /// Update unknown response
            const updatedData: any = {};
            updatedData.status = '4';
            updatedData.responsedata = result;
            await this.CibilScoreRepo.updateRowData(updatedData, scoreData.id);
            return result;
          }
        }
      } catch (error) {
        console.error('Error in: ', error);
        return kInternalError;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async addLeadingZero(number) {
    return number < 10 ? `0${number}` : `${number}`;
  }

  ///CibilDate 26072023 convert to db date 2023-07-26
  async cibiDateToDBDate(cibilDate) {
    if (cibilDate && cibilDate.length == 8) {
      let year = cibilDate.slice(4, 8);
      let month = cibilDate.slice(2, 4);
      let date = cibilDate.slice(0, 2);
      return year + '-' + month + '-' + date;
    } else return cibilDate;
  }

  async addCibilAddresses(userId, addresses) {
    let finalData = [];
    for (let i = 0; i < addresses.length; i++) {
      try {
        const address: any = addresses[i];
        const line1 = address.line1 ?? '';
        const line2 = address.line2 ?? '';
        const line3 = address.line3 ?? '';
        const line4 = address.line4 ?? '';
        const line5 = address.line5 ?? '';
        let addString =
          line1 + ' ' + line2 + ' ' + line3 + ' ' + line4 + ' ' + line5;
        addString = addString.replace(/  /g, '');

        const addData: any = {};
        addData.userId = userId;
        addData.status = '0';
        addData.address = addString;
        addData.type = '13';
        addData.subType = address?.index;
        finalData.push(addData);
      } catch (error) {}
    }
    const addressData = await this.addressRepo.bulkCreate(finalData);
    if (addressData === k500Error) return kInternalError;
    return addressData;
  }

  async decodePaymentHistory(paymentHistoryString) {
    const statusMapping = {
      STD: 'Standard',
      SMA: 'Special Mention Account',
      SUB: 'Substandard',
      DBT: 'Doubtful',
      LSS: 'Loss',
      XXX: 'Not Reported',
    };

    const historyArray = [];
    const last = paymentHistoryString.slice(0, 3);

    let lastDaysPastDue = parseInt(last, 10);
    if (['SMA', 'SUB', 'DBT', 'LSS'].includes(last)) {
      lastDaysPastDue = 999;
    }
    const lastDelayDays = isNaN(lastDaysPastDue) ? 0 : lastDaysPastDue;

    while (paymentHistoryString.length >= 3) {
      const code = paymentHistoryString.slice(0, 3);
      paymentHistoryString = paymentHistoryString.slice(3);

      let status;
      if (statusMapping[code]) {
        status = statusMapping[code];
      } else {
        const daysPastDue = parseInt(code, 10);
        status = isNaN(daysPastDue)
          ? 'Not Reported'
          : `${daysPastDue} Days Past Due`;
      }

      historyArray.push({ status });
    }

    return { lastDelayDays, historyArray };
  }

  async updateLastCibilHardPullLoanId(reqData) {
    // Params validation
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const loanId = reqData.loanId;
    if (!loanId) return kParamMissing('loanId');
    let scoreData: any;
    const getoptions = {
      where: { type: '1', userId },
      order: [['id', 'DESC']],
    };
    const attributes = ['id'];
    let getDataFromRedis = await this.getDataFromRedis(userId, loanId, false);
    scoreData = getDataFromRedis;
    if (!getDataFromRedis || getDataFromRedis?.status != '1') {
      scoreData = await this.CibilScoreRepo.getRowWhereData(
        attributes,
        getoptions,
      );
      if (scoreData == k500Error) return kInternalError;
      if (!scoreData) return kNoDataFound;
      await this.setDataInRedis(userId, loanId, scoreData, false);
    }

    const options = { where: { id: scoreData.id } };
    const result = await this.CibilScoreRepo.updateRowWhereData(
      { loanId },
      options,
    );
    if (result == k500Error) return kInternalError;
    const loanOpts = {
      where: { userId, loanStatus: ['InProcess', 'Accepted'] },
      order: [['id', 'DESC']],
    };
    const loanData = await this.loanRepo.getRowWhereData(['id'], loanOpts);
    const lId = loanData?.id;
    if (loanData != k500Error && lId && lId == loanId)
      await this.loanRepo.updateRowData({ cibilId: scoreData.id }, lId);

    return {};
  }

  // start region Get User CibilScore Data
  async funGetUserCibilScoreData(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      const id = reqData.id;
      const cibilData: any = await this.getAllCibilData(userId, reqData.type);
      if (cibilData?.message) return cibilData;
      const loanId = reqData?.loanId;
      let scoreData: any = {};
      let getDataFromRedis: any;

      // getDataFromRedis = await this.getDataFromRedis(userId, loanId);
      // scoreData = getDataFromRedis;

      // if (!getDataFromRedis || getDataFromRedis?.status != '1') {
      const attributes = [
        'loanId',
        'status',
        'cibilScore',
        'plScore',
        'totalAccounts',
        'overdueAccounts',
        'zeroBalanceAccounts',
        'highCreditAmount',
        'currentBalance',
        'overdueBalance',
        'totalOverdueDays',
        'PLOutstanding',
        'totalOutstanding',
        'monthlyIncome',
        'totalInquiry',
        'inquiryPast30Days',
        'inquiryPast12Months',
        'inquiryPast24Months',
        'recentDateOpened',
        'oldestDateOpened',
        'recentInquiryDate',
        'oldestInquiryDate',
        'PLAccounts',
        'responsedata',
        'names',
        'ids',
        'telephones',
        'emails',
        'employment',
        'scores',
        'addresses',
        'accounts',
        'enquiries',
      ];

      let idWhere = ``;
      if (id) idWhere += `AND \"id\" = '${id}'`;
      let loanIdWhere = ``;
      if (loanId) loanIdWhere += `AND \"loanId\" = '${loanId}'`;

      const rawQuery = `SELECT "${attributes.join('","')}"
        FROM "CibilScoreEntities"
        WHERE "type" = '1' AND "userId" = '${userId}'
        ${idWhere} ${loanIdWhere}
        ORDER BY "id" DESC  
        LIMIT 1`;
      const outputList = await this.repo.injectRawQuery(
        CibilScoreEntity,
        rawQuery,
        { source: 'REPLICA' },
      );
      if (outputList === k500Error) throw new Error();

      scoreData = outputList[0];
      if (!scoreData) return {};
      // await this.setDataInRedis(userId, loanId, scoreData, false);
      // }

      if (scoreData?.status) {
        scoreData.cibilScore = scoreData.cibilScore ?? '-';
        scoreData.plScore = scoreData.plScore ?? '-';
        scoreData.totalAccounts = scoreData.totalAccounts ?? '-';
        scoreData.overdueAccounts = scoreData.overdueAccounts ?? '-';
        scoreData.zeroBalanceAccounts = scoreData.zeroBalanceAccounts ?? '-';
        scoreData.highCreditAmount = scoreData.highCreditAmount ?? '-';
        scoreData.currentBalance = scoreData.currentBalance ?? '-';
        scoreData.overdueBalance = scoreData.overdueBalance ?? '-';
        scoreData.totalOverdueDays = scoreData.totalOverdueDays ?? '-';
        scoreData.PLOutstanding = scoreData.PLOutstanding ?? '-';
        scoreData.totalOutstanding = scoreData.totalOutstanding ?? '-';
        scoreData.monthlyIncome = scoreData.monthlyIncome ?? '-';
        scoreData.totalInquiry = scoreData.totalInquiry ?? '-';
        scoreData.inquiryPast30Days = scoreData.inquiryPast30Days ?? '-';
        scoreData.inquiryPast12Months = scoreData.inquiryPast12Months ?? '-';
        scoreData.inquiryPast24Months = scoreData.inquiryPast24Months ?? '-';
        if (cibilData) {
          scoreData.diffInCibil = cibilData?.diffInCibil;
          scoreData.diffInPl = cibilData?.diffInPl;
        }
        scoreData.recentDateOpened = scoreData.recentDateOpened
          ? this.typeService.dateToJsonStr(
              scoreData.recentDateOpened,
              'DD/MM/YYYY',
            )
          : '-';
        scoreData.oldestDateOpened = scoreData.oldestDateOpened
          ? this.typeService.dateToJsonStr(
              scoreData.oldestDateOpened,
              'DD/MM/YYYY',
            )
          : '-';
        scoreData.recentInquiryDate = scoreData.recentInquiryDate
          ? this.typeService.dateToJsonStr(
              scoreData.recentInquiryDate,
              'DD/MM/YYYY',
            )
          : '-';
        scoreData.oldestInquiryDate = scoreData.oldestInquiryDate
          ? this.typeService.dateToJsonStr(
              scoreData.oldestInquiryDate,
              'DD/MM/YYYY',
            )
          : '-';

        if (!reqData.type) {
          let isCibilFetchButton = false;
          const scoreDateStr = scoreData?.responsedata?.consumerCreditData
            ? scoreData?.responsedata?.consumerCreditData[0]?.scores[0]
                ?.scoreDate
            : null;
          if (scoreDateStr) {
            const day = parseInt(scoreDateStr.substr(0, 2), 10);
            const month = parseInt(scoreDateStr.substr(2, 2), 10) - 1; // Months are 0-indexed
            const year = parseInt(scoreDateStr.substr(4, 4), 10);

            let scoreDate = new Date(year, month, day);
            scoreDate = this.typeService.getGlobalDate(scoreDate);
            const todaydate = new Date();
            const cibilFetchDateObj =
              this.dateService.dateToReadableFormat(scoreDate);

            //date at which cibil fetched
            scoreData.cibilFetchDate = cibilFetchDateObj
              ? `${cibilFetchDateObj?.readableStr}`
              : '-';
            const diffInDays = this.typeService.differenceInDays(
              todaydate,
              scoreDate,
            );
            let nextCibilFetchDate = scoreDate;
            nextCibilFetchDate.setDate(nextCibilFetchDate.getDate() + 90);
            scoreData.nextCibilFetchDate =
              this.typeService.dateToJsonStr(nextCibilFetchDate) ?? '-';
            //giving manual cibil fetch button option after 30 days of cibil hit
            if (diffInDays > 30) isCibilFetchButton = true;
            scoreData.isCibilFetchButton = isCibilFetchButton;
          }
        }

        if (reqData?.type != 'all') delete scoreData?.responsedata;
      }

      if (reqData?.type == 'all' && scoreData?.status == '1') {
        scoreData.ids = scoreData.ids ?? [];
        scoreData.names = scoreData.names ?? [];
        scoreData.scores = scoreData.scores ?? [];
        scoreData.enquiries = scoreData.enquiries ?? [];
        scoreData.telephones = scoreData.telephones ?? [];
        scoreData.employment = scoreData.employment ?? [];
        scoreData.addresses = scoreData.addresses ?? [];
        scoreData.accounts = scoreData.accounts ?? [];
        if (!id) {
          scoreData.lastFetchedDates = cibilData;
        }

        scoreData.ids.forEach((element) => {
          if (element?.idType) element.idType = cibilIdType[element.idType];
        });

        scoreData.names.forEach((element) => {
          if (element?.birthDate)
            element.birthDate = this.typeService.cibiDateToDisplayDate(
              element.birthDate,
            );
          if (element.gender == '1') {
            element.gender = 'Female';
          } else if (element.gender == '2') {
            element.gender = 'Male';
          } else if (element.gender == '3') {
            element.gender = 'Transgender';
          }
        });

        scoreData.scores.forEach((element) => {
          element.score = element.score.replace(/^0+/, '') ?? -1;
          if (element?.scoreDate)
            element.scoreDate = this.typeService.cibiDateToDisplayDate(
              element.scoreDate,
            );
        });

        scoreData.enquiries.forEach((element) => {
          if (element?.enquiryDate)
            element.enquiryDate = this.typeService.cibiDateToDisplayDate(
              element.enquiryDate,
            );
          if (element?.enquiryPurpose)
            element.enquiryPurpose = cibilAccountType[element.enquiryPurpose];
        });

        scoreData.telephones.forEach((element) => {
          if (element?.telephoneType)
            element.telephoneType = cibilTelephoneType[element.telephoneType];
        });

        scoreData.employment.forEach((element) => {
          if (element?.dateReported)
            element.dateReported = this.typeService.cibiDateToDisplayDate(
              element.dateReported,
            );
          if (element?.accountType)
            element.accountType = cibilAccountType[element.accountType];
          if (element?.occupationCode)
            element.occupationCode =
              cibilOccupationCode[element.occupationCode];
        });

        scoreData.addresses.forEach((element) => {
          element.address = `${element?.line1 ? element?.line1 + ', ' : ''}${
            element?.line2 ? element?.line2 + ', ' : ''
          }${element?.line3 ? element?.line3 + ', ' : ''}${
            element?.line4 ? element?.line4 + ', ' : ''
          }${element?.line5 ? element?.line5 : ''}`;

          if (element?.addressCategory)
            element.addressCategory =
              cibilAddressCategory[element.addressCategory];
          if (element?.residenceCode)
            element.residenceCode = cibilResidenceCode[element.residenceCode];
          if (element?.dateReported)
            element.dateReported = this.typeService.cibiDateToDisplayDate(
              element.dateReported,
            );
          if (element?.stateCode)
            element.stateCode = cibilStateCode[element.stateCode];
          delete element.line1;
          delete element.line2;
          delete element.line3;
          delete element.line4;
          delete element.line5;
        });

        scoreData.accounts.forEach((element) => {
          if (element?.dateReported)
            element.dateReported = this.typeService.cibiDateToDisplayDate(
              element.dateReported,
            );
          if (element?.dateOpened)
            element.dateOpened = this.typeService.cibiDateToDisplayDate(
              element.dateOpened,
            );
          if (element?.paymentEndDate)
            element.paymentEndDate = this.typeService.cibiDateToDisplayDate(
              element.paymentEndDate,
            );
          if (element?.paymentStartDate)
            element.paymentStartDate = this.typeService.cibiDateToDisplayDate(
              element.paymentStartDate,
            );
          if (element?.dateClosed)
            element.dateClosed = this.typeService.cibiDateToDisplayDate(
              element.dateClosed,
            );
          if (element?.lastPaymentDate)
            element.lastPaymentDate = this.typeService.cibiDateToDisplayDate(
              element.lastPaymentDate,
            );
          if (element?.accountType)
            element.accountType = cibilAccountType[element.accountType];
          if (element?.paymentFrequency)
            element.paymentFrequency =
              cibilPaymentFrequency[element.paymentFrequency];
          if (element?.ownershipIndicator)
            element.ownershipIndicator =
              cibilAccountOwnershipIndicator[element.ownershipIndicator];
          if (element?.collateralType)
            element.collateralType =
              cibilCollateralType[element.collateralType];
          if (element?.suitFiled)
            element.suitFiled = cibilSuitFiled[element.suitFiled];
          if (element?.creditFacilityStatus)
            element.creditFacilityStatus =
              cibilCreditFacilityStatus[element.creditFacilityStatus];

          element.memberShortName = element.memberShortName ?? '-';
          element.accountNumber = element.accountNumber ?? '-';
          element.accountType = element.accountType ?? '-';
          element.ownershipIndicator = element.ownershipIndicator ?? '-';
          element.dateOpened = element.dateOpened ?? '-';
          element.lastPaymentDate = element.lastPaymentDate ?? '-';
          element.amountOverdue = element.amountOverdue ?? '-';
          element.dateReported = element.dateReported ?? '-';
          element.currentBalance = element.currentBalance ?? '-';
          element.paymentEndDate = element.paymentEndDate ?? '-';
          element.paymentHistory = element.paymentHistory ?? '-';
          element.highCreditAmount = element.highCreditAmount ?? '-';
          element.paymentFrequency = element.paymentFrequency ?? '-';
          element.paymentStartDate = element.paymentStartDate ?? '-';
          element.dateClosed = element.dateClosed ?? '-';
          element.collateralType = element.collateralType ?? '-';
          element.cashLimit = element.cashLimit ?? '-';
          element.creditLimit = element.creditLimit ?? '-';
          element.actualPaymentAmount = element.actualPaymentAmount ?? '-';
          element.suitFiled = element.suitFiled ?? '-';
          element.creditFacilityStatus = element.creditFacilityStatus ?? '-';
          element.collateralValue = element.collateralValue ?? '-';
          element.interestRate = element.interestRate ?? '-';
          element.paymentTenure = element.paymentTenure ?? '-';
          element.emiAmount = element.emiAmount ?? '-';
          element.woAmountTotal = element.woAmountTotal ?? '-';
          element.woAmountPrincipal = element.woAmountPrincipal ?? '-';
          element.settlementAmount = element.settlementAmount ?? '-';
          element.past6MonDelayDays = element.past6MonDelayDays ?? '-';
        });
      }
      return scoreData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getAllCibilData(userId, type) {
    try {
      let outputList: any;
      let getDataFromRedis;
      getDataFromRedis = await this.getDataFromRedis(userId, null, true);
      outputList = getDataFromRedis;
      if (!getDataFromRedis || getDataFromRedis?.status != '1') {
        const rawQuery = `SELECT "cibilScore", "id", "plScore", "responsedata", "scores", "status" 
        FROM "CibilScoreEntities" AS "cibil"
        WHERE "userId" = '${userId}'
        ORDER BY "id" DESC;`;

        outputList = await this.repo.injectRawQuery(
          CibilScoreEntity,
          rawQuery,
          { source: 'REPLICA' },
        );
        if (outputList == k500Error) throw new Error();
        await this.setDataInRedis(userId, null, outputList, true);
      }
      const dates = [];
      const scores = [];
      for (let i = 0; i < outputList.length; i++) {
        const currentData = outputList[i];
        if (
          !currentData?.responsedata?.internal_source &&
          currentData?.scores
        ) {
          const date = currentData?.scores[0]?.scoreDate;
          const formattedDate =
            date.slice(0, 2) + '/' + date.slice(2, 4) + '/' + date.slice(4);
          dates.push({
            date: formattedDate,
            id: currentData.id,
          });
          if (scores.length < 2)
            scores.push({
              cibilScore: currentData.cibilScore,
              plScore: currentData.plScore,
            });
        }
      }
      if (!type && scores.length === 2) {
        const diffInCibil = scores[0]?.cibilScore - scores[1]?.cibilScore;
        const diffInPl = scores[0]?.plScore - scores[1]?.plScore;

        return {
          diffInCibil: diffInCibil ? diffInCibil : 0,
          diffInPl: diffInPl ? diffInPl : 0,
        };
      } else if (type) {
        return dates;
      } else return;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get Cibil History Data for chart
  async getCibilHistoryData(userId, appType) {
    try {
      if (!userId) return kParamMissing('userId');
      if (!appType) return kParamMissing('appType');
      let cibilAttributes = [
        'cibilScore',
        'plScore',
        'accounts',
        'enquiries',
        'totalAccounts',
        'overdueAccounts',
        'zeroBalanceAccounts',
        'PLAccounts',
        'scores',
        'responsedata',
        'id',
      ];

      const cibilInclude: any = {
        required: false,
        model: CibilScoreEntity,
        attributes: cibilAttributes,
        where: { type: '1', status: '1' },
        order: [['id', 'DESC']],
      };
      const emiInclude: any = {
        required: false,
        model: EmiEntity,
        attributes: [
          'emi_date',
          'loanId',
          'payment_due_status',
          'payment_status',
          'id',
        ],
      };

      const loanInclude: any = {
        required: false,
        model: loanTransaction,
        attributes: ['id'],
        order: [['id', 'DESC']],
        include: [emiInclude],
      };

      const include = [loanInclude, cibilInclude];
      let options = { where: { id: userId }, limit: 4, include };
      let attributes = ['id'];

      let scoreData: any = await this.userRepo.getRowWhereData(
        attributes,
        options,
      );

      if (scoreData == k500Error) return kInternalError;
      scoreData?.cibilList.sort((a, b) => b.id - a.id);
      const scoreHistory = {
        yMax: 900,
        yMin: 999,
        chartData: [],
        chartInterval: 50,
      };

      const maxScoreMap = new Map();

      for (let i = 0; i < scoreData?.cibilList.length; i++) {
        const currentData = scoreData?.cibilList[i];
        if (!currentData?.cibilScore) continue;

        const date = currentData?.scores[0]?.scoreDate;
        if (!date) continue;

        let month = parseInt(date.slice(2, 4), 10);
        let year = parseInt(date.slice(6, 8), 10);
        let fullYear = parseInt(date.slice(4, 8), 10);
        let day = parseInt(date.slice(0, 2), 10);

        if (month < 1 || month > 12) continue;

        const monthName = shortMonth[month - 1];
        const key = `${monthName}-${year}`;

        const dateTimestamp = new Date(`${fullYear}-${month}-${day}`).getTime();

        if (
          !maxScoreMap.has(key) ||
          maxScoreMap.get(key).dateTimestamp < dateTimestamp
        ) {
          maxScoreMap.set(key, {
            xAxis: `${monthName} ${year}`,
            yAxis: currentData.cibilScore,
            monthNumber: month,
            yearNumber: fullYear,
            dateTimestamp: dateTimestamp,
          });
        }
      }

      scoreHistory.chartData = Array.from(maxScoreMap.values());

      if (scoreHistory.chartData.length > 0) {
        scoreHistory.yMin = Math.min(
          ...scoreHistory.chartData.map((data) => data.yAxis),
        );
      }

      scoreHistory.chartData.sort((a, b) => {
        if (a.yearNumber === b.yearNumber) {
          return a.monthNumber - b.monthNumber;
        }
        return a.yearNumber - b.yearNumber;
      });
      if (scoreHistory.chartData.length > 4) {
        scoreHistory.chartData = scoreHistory.chartData.slice(
          scoreHistory.chartData.length - 4,
          scoreHistory.chartData.length,
        );
      }
      scoreHistory.chartData.forEach((data) => {
        delete data.monthNumber;
        delete data.yearNumber;
        delete data.dateTimestamp;
      });

      scoreHistory.yMin = Math.floor((scoreHistory.yMin - 100) / 100) * 100;
      scoreData?.loanData.sort((a, b) => b.id - a.id);
      scoreData?.loanData[0]?.emiData?.sort((a, b) => a.id - b.id);

      let scoreAlert = {
        title: 'Boost Your Score!',
        subTitle: 'Boost your CIBIL Score with timely payments',
        imageUrl:
          'https://storage.googleapis.com/backend_static_stuff/startup_9071520%201.png',
        cardColor: '0xffD1E8D1',
        dotColor: '0xff008000',
      };

      if (scoreData?.loanData[0]?.emiData) {
        for (let i = 0; i < scoreData?.loanData[0]?.emiData.length; i++) {
          const currentData = scoreData?.loanData[0]?.emiData[i];

          if (currentData?.payment_status === '1') {
            scoreAlert = {
              title: 'Great News!',
              subTitle: 'You have made your repayments on-time. ',
              imageUrl:
                'https://storage.googleapis.com/backend_static_stuff/Group%2038058.png',
              cardColor: '0xffD1E8D1',
              dotColor: '0xff008000',
            };
          } else if (currentData?.payment_due_status === '1') {
            scoreAlert = {
              title: 'You are late!',
              subTitle: 'Please pay on-time to maintain your CIBIL Score',
              imageUrl:
                'https://storage.googleapis.com/backend_static_stuff/caution-sign_8637474%201.png',
              cardColor: '0xffFFCCCC',
              dotColor: '0xff008000',
            };
          }
        }
      }
      scoreData = scoreData?.cibilList[0];

      let totalAccounts = 0;
      let closedAccounts = 0;

      scoreData.accounts.forEach((ele) => {
        totalAccounts++;
        if (ele?.dateClosed) closedAccounts++;
      });

      let latestCibilDate = scoreData?.scores[0]?.scoreDate;
      latestCibilDate = this.typeService.cibiDateToDisplayDate(latestCibilDate);
      latestCibilDate = latestCibilDate.split('/');
      latestCibilDate = `${String(latestCibilDate[0])} ${
        shortMonth[Number(latestCibilDate[1]) - 1]
      } ${String(latestCibilDate[2]).slice(-2)}`;

      let remark = '';
      const score = scoreData?.cibilScore;
      if (score < 580) {
        remark = 'Poor';
      } else if (score >= 580 && score <= 669) {
        remark = 'Fair';
      } else if (score >= 670 && score <= 739) {
        remark = 'Good';
      } else if (score >= 740 && score <= 799) {
        remark = 'Very Good';
      } else {
        remark = 'Excellent';
      }
      const otherDetails = [];
      otherDetails.push({
        title: 'Accounts',
        desc: 'Check your all the Account details',
        type: 0,
        icon: 'https://storage.googleapis.com/backend_static_stuff/Accounts.png',
        data: [
          {
            title: 'Active accounts',
            value: totalAccounts - closedAccounts ?? 0,
          },
          {
            title: 'Overdue accounts',
            value: scoreData?.overdueAccounts ?? 0,
          },
          {
            title: 'Closed accounts',
            value: closedAccounts ?? 0,
          },
          {
            title: 'Total accounts',
            value: totalAccounts ?? 0,
          },
        ],
      });
      scoreData?.enquiries?.forEach((element) => {
        if (element?.enquiryDate) {
          element.Date = this.typeService.cibiDateToDisplayDate(
            element?.enquiryDate,
          );
          element.Date = element.Date.split('/');
          element.Date = `${String(element.Date[0])} ${
            shortMonth[Number(element.Date[1]) - 1]
          } ${String(element.Date[2]).slice(-2)}`;
        }

        if (element?.enquiryPurpose)
          element.Purpose = cibilAccountType[element?.enquiryPurpose];

        if (element?.enquiryAmount)
          element.Amount =
            ' ₹ ' +
            this.typeService.amountNumberWithCommas(element?.enquiryAmount);
        delete element?.enquiryPurpose;
        delete element?.enquiryDate;
        delete element?.enquiryAmount;
        delete element?.memberShortName;
        delete element?.index;
      });
      otherDetails.push({
        title: 'Enquiries',
        desc: 'Check your Past Enquiries',
        type: 1,
        icon: 'https://storage.googleapis.com/backend_static_stuff/Enquiries.png',
        data: scoreData?.enquiries,
      });
      if (appType == 0) {
        otherDetails.map((ele) => {
          if (ele?.type == 1)
            ele.icon =
              'https://storage.googleapis.com/backend_static_stuff/enquiries1.svg';
          if (ele?.type == 0)
            ele.icon =
              'https://storage.googleapis.com/backend_static_stuff/accounts1.svg';
        });
      }

      return {
        cibilScore: scoreData?.cibilScore,
        latestCibilDate,
        color: '0xff008000',
        remark,
        scoreAlert,
        scoreHistory,
        otherDetails,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  async getDataFromRedis(userId, loanId?, isMultiple = false) {
    let key;
    if (isMultiple) {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_MULTIPLE_DATA}`;
      if (loanId)
        key = `${userId}_${loanId}_${CIBIL_REDIS_KEY.FOR_MULTIPLE_DATA}`;
    } else {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_SINGLE_DATA}`;
      if (loanId)
        key = `${userId}_${loanId}_${CIBIL_REDIS_KEY.FOR_SINGLE_DATA}`;
    }
    let redisData = await this.redis.get(key);
    redisData = redisData ? JSON.parse(redisData) : null;
    return redisData;
  }

  async setDataInRedis(userId, loanId?, data?, isMultiple = false) {
    let key;
    if (isMultiple) {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_MULTIPLE_DATA}`;
      if (loanId)
        key = `${userId}_${loanId}_${CIBIL_REDIS_KEY.FOR_MULTIPLE_DATA}`;
    } else {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_SINGLE_DATA}`;
      if (loanId)
        key = `${userId}_${loanId}_${CIBIL_REDIS_KEY.FOR_SINGLE_DATA}`;
    }
    data = JSON.stringify(data);
    await this.redis.set(key, data, NUMBERS.FIVE_DAYS_IN_SECONDS);
  }

  async delDataFromRedis(userId, isMultiple = false) {
    let key;
    if (isMultiple) {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_MULTIPLE_DATA}`;
    } else {
      key = `${userId}_${CIBIL_REDIS_KEY.FOR_SINGLE_DATA}`;
    }
    let redisData = await this.redis.del(key);
    return {};
  }
}
