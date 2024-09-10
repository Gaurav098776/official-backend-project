import { Injectable } from '@nestjs/common';
import { Sequelize, Op, literal } from 'sequelize';
import {
  IS_ACTIVE,
  IS_DEACTIVE,
  LSP_APP_LINK,
  MSG91,
  MSG_TITLES,
  NBFC_APP_LINK,
  PROMO_VALID_TIME,
  SYSTEM_ADMIN_ID,
  gIsPROD,
  promoCodeStatus,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { loanTransaction } from 'src/entities/loan.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { DefaulterPromoCodeRepository } from 'src/repositories/defaulterPromoCode.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { TypeService } from 'src/utils/type.service';
import { nPaymentRedirect, promoCode } from 'src/constants/network';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { EmiEntity } from 'src/entities/emi.entity';
import { kLspMsg91Templates, kMsg91Templates } from 'src/constants/objects';
import { RedisService } from 'src/redis/redis.service';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class PromoCodeService {
  constructor(
    private readonly promoCodeRepo: DefaulterPromoCodeRepository,
    private readonly userRepo: UserRepository,
    private readonly emiRepo: EMIRepository,
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly commonSharedService: CommonSharedService,
    private readonly allSmsService: AllsmsService,
    private readonly repo: RepositoryManager,
    private readonly redisService: RedisService,
  ) {}

  async createPromoCodeData(data: any) {
    try {
      // Params validation
      const adminId = data?.adminId;
      if (!adminId) return kParamMissing('adminId');
      if (!data?.type && data?.type != 0) return kParamMissing('type');
      if (!data?.promo_code) return kParamMissing('promoCode');
      if (!data?.promo_code_url) return kParamMissing('promoCodeUrl');
      if (!data?.discount) return kParamMissing('discount');
      if (!data?.delay_day) return kParamMissing('delay_day');
      if (data?.type > 2 || data?.type < 0) return kParamMissing('type');
      if (
        (data?.type === 1 && !data?.count) ||
        (data?.type === 2 && !data?.end_date)
      )
        return kParamMissing('delay_day');
      let createObject: any = {
        promo_code: data?.promo_code,
        promo_code_url: data?.promo_code_url,
        discount: data?.discount,
        type: parseInt(data?.type),
        is_active: IS_ACTIVE,
        adminId: parseInt(data.adminId),
      };
      if (data?.promo_code.length > 10 || data?.promo_code.length < 6)
        return kInternalError;
      let isPromoCodeExist = await this.getPromoCodeDetails(['id'], {
        where: {
          promo_code: data?.promo_code,
        },
      });
      if (isPromoCodeExist?.message || isPromoCodeExist.length > 0)
        return isPromoCodeExist;
      let dt = new Date();
      if (createObject.type === promoCodeStatus.DAY_WISE) {
        // 0 = every_time;
        createObject.delay_day = data?.delay_day;
        createObject.end_date = null;
      } else if (createObject.type == promoCodeStatus.SALARY_WISE) {
        let isOfferExist = await this.getPromoCodeDetails(['id'], {
          where: {
            type: promoCodeStatus.SALARY_WISE,
            is_active: IS_ACTIVE,
          },
        });
        if (isOfferExist?.message) return isOfferExist;
        if (isOfferExist.length > 0) {
          let updateActive: any = await this.updateIsActive({
            adminId: parseInt(data?.adminId),
            id: isOfferExist[0]?.id,
          });
          if (updateActive?.message) return updateActive;
          let updateLoanPromoCount = await this.loanRepo.updateSilentData(
            { promoCodeSentCount: 0 },
            { loanStatus: 'Active' },
          );
          if (updateLoanPromoCount === k500Error) return kInternalError;
        }
        // 1 = salary_day;
        createObject.delay_day = data?.delay_day;
        createObject.count = data?.count;
        createObject.before_days = data?.before_days;

        createObject.end_date = null;
      } else {
        // 2 = only_one_time;
        createObject.delay_day = data?.delay_day;
        createObject.end_date = this.typeService
          .getGlobalDate(new Date(data?.end_date))
          .toJSON();
      }
      const createdData = await this.promoCodeRepo.createRowData(createObject);
      if (createdData === k500Error) return kInternalError;
      return createdData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async updateIsActive(body) {
    try {
      if (!body?.adminId) return kParamMissing('adminId');
      if (!body?.id) return kParamMissing('id');
      const updateData = await this.promoCodeRepo.updateRowData(
        { is_active: IS_DEACTIVE, admin_id: body?.adminId },
        body?.id,
      );
      if (updateData === k500Error) return kInternalError;
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getPromoCode(data) {
    try {
      if (!data?.adminId) return kParamMissing('adminId');
      let adminId = data?.adminId;
      let attributes = [
        'id',
        'promo_code',
        'promo_code_url',
        'discount',
        'adminId',
        'type',
        'is_active',
      ];
      let promoData: any = await this.getPromoCodeDetails(attributes, []);
      if (promoData?.message) return promoData;
      for (let i = 0; i < promoData.length; i++) {
        const adminData = await this.commonSharedService.getAdminData(
          promoData[i]?.adminId,
        );
        promoData[i].adminDetails = adminData;
      }
      return promoData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async promoCodeCron(reqData) {
    try {
      // making all true eligibleForPromoCode false
      const options = { where: { eligibleForPromoCode: true }, silent: true };
      await this.userRepo.updateRowWhereData(
        { eligibleForPromoCode: false },
        options,
      );

      const getPromoCodes = await this.getActivePromoCodes();
      if (getPromoCodes?.message || getPromoCodes.length == 0)
        return getPromoCodes;
      let currentDate = new Date().toISOString().split('T')[0];
      let tillDate = new Date();
      // tillDate.setHours(tillDate.getHours() + PROMO_VALID_TIME);
      // for last date of month
      //  tillDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      let loanIds = [];
      let maxLoanIds = [];
      let lastEmiLoanIds = [];
      let where: any = [];
      let includes = [];
      let endDates: any;
      let delayDays: any;
      let onDays: any;
      let endSalaryOfferDate: any;
      let salaryMonthRange = 0;

      let loan_id_list = [];
      for (let i = 0; i < getPromoCodes.length; i++) {
        if (getPromoCodes[i]?.type === promoCodeStatus.DATE_WISE) {
          //only one time on specific date
          if (currentDate == getPromoCodes[i]?.end_date) {
            endDates = getPromoCodes[i]?.end_date;
            delayDays = getPromoCodes[i]?.delay_day;
          }
          if (getPromoCodes[i]?.end_date)
            tillDate = new Date(getPromoCodes[i]?.end_date);
          where.push({
            penalty_days: {
              [Op.gte]: getPromoCodes[i]?.delay_day,
            },
          });
        } else if (getPromoCodes[i]?.type === promoCodeStatus.SALARY_WISE) {
          if (loan_id_list.length === 0) {
            const verifiedSalaryDate = new Date();
            verifiedSalaryDate.setDate(
              verifiedSalaryDate.getDate() + +getPromoCodes[i]?.before_days,
            );
            const optional = {
              where: {
                verifiedSalaryDate: verifiedSalaryDate.getDate(),
                loanStatus: 'Active',
                promoCodeSentCount: { [Op.lt]: getPromoCodes[i].count },
              },
            };
            const loan_result = await this.loanRepo.getTableWhereData(
              ['id'],
              optional,
            );
            loan_id_list = loan_result.map((m) => m.id);
          }

          endSalaryOfferDate = getPromoCodes[i].end_date;
          salaryMonthRange = getPromoCodes[i].count;
          if (loan_id_list.length > 0) {
            where.push({
              penalty_days: { [Op.gte]: getPromoCodes[i].delay_day },
              loanId: loan_id_list,
            });
          }
        } else {
          onDays = getPromoCodes[i].delay_day;
          where.push({
            penalty_days: getPromoCodes[i].delay_day,
          });
        }
      }
      where = {
        // [Op.or]: where,
        partOfemi: 'LAST',
        payment_due_status: '1',
        payment_status: '0',
      };
      let loanData = await this.findLoanIds(where, includes);
      if (loanData?.message) return loanData;

      loanIds = loanData.map((ele) => ele.loanId);
      let maxLoanData = await this.findMaxLoanIds(loanIds);
      if (maxLoanData?.message) return maxLoanData;

      maxLoanIds = maxLoanData.map((ele) => ele.id);
      let lastEmiLoanData = await this.findLastEmiLoanIds(
        maxLoanIds,
        where,
        includes,
      );
      if (lastEmiLoanData?.message) return lastEmiLoanData;
      lastEmiLoanIds = lastEmiLoanData.map((ele) => ele.loanId);
      let loopLength = lastEmiLoanIds.length;
      if (!gIsPROD) if (loopLength > 5) loopLength = 5;

      if (reqData.userlist) return lastEmiLoanData;
      //add sms and mail functionality here
      for (let j = 0; j < loopLength; j++) {
        const emi = lastEmiLoanData[j];
        const loan = emi?.loan;
        const user = emi?.user;
        const appType = loan?.appType;
        let templateData: any = await this.getEmiAmount(
          loan?.id,
          getPromoCodes,
        );
        templateData.userId = user?.id;
        templateData.name = user?.fullName;
        templateData.email = user?.email;
        templateData.loanId = loan?.id;
        templateData.appType = appType;
        templateData.validTime = PROMO_VALID_TIME;
        templateData.validTillDate = this.typeService.getDateFormatted(
          tillDate,
          '/',
        );

        const paymentKey = loan?.id * 484848;
        templateData.link = nPaymentRedirect + paymentKey;

        //send SMS
        const smsOptions: any = {
          smsId:
            templateData.appType == 1
              ? kMsg91Templates.DEFAULTER_PROMO_CODE_OFFER
              : kLspMsg91Templates.DEFAULTER_PROMO_CODE_OFFER,
          adminId: SYSTEM_ADMIN_ID,
          var1: templateData?.promoCode,
          var2: templateData?.discount + '%',
          var3: templateData?.link, // appType == 1 ? NBFC_APP_LINK : LSP_APP_LINK
          title: MSG_TITLES.PROMO_CODE_TITLE,
          short_url: '1',
          appType: templateData.appType,
        };
        await this.allSmsService.sendSMS(user?.phone, MSG91, smsOptions);
        //send email
        await this.sharedNotificationService.sendDefaulterWaiveOffMail(
          user?.email,
          templateData,
        );
      }
      // updating eligibleForPromoCode and promoCodeSentCount
      await this.updateEligibleForPromoCode(lastEmiLoanData);

      return getPromoCodes;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  private async updateEligibleForPromoCode(LoanData: any) {
    try {
      let userIds = [];
      let LoanIds = [];
      for (let index = 0; index < LoanData.length; index++) {
        userIds.push(LoanData[index]?.userId);
        LoanIds.push(LoanData[index]?.loanId);
      }
      let options = { where: { id: userIds }, silent: true };
      if (userIds.length > 0) {
        await this.userRepo.updateRowWhereData(
          { eligibleForPromoCode: true },
          options,
        );
      }
      options = { where: { id: LoanIds }, silent: true };
      if (LoanIds.length > 0)
        await this.loanRepo.updateRowWhereData(
          { promoCodeSentCount: literal('"promoCodeSentCount" + 1') },
          options,
        );
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async findLoanIds(whereObject, includes) {
    try {
      const promoData = await this.emiRepo.getTableWhereData(
        ['loanId', 'penalty_days', 'id'],
        {
          where: whereObject,
          include: includes,
        },
      );
      if (promoData === k500Error) return kInternalError;
      return promoData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async findMaxLoanIds(loanIds) {
    try {
      let attributes: any = [[Sequelize.fn('max', Sequelize.col('id')), 'id']];
      const loanData = await this.emiRepo.getTableWhereData(attributes, {
        where: {
          payment_status: '0',
          loanId: loanIds,
        },
        group: ['loanId'],
      });
      if (loanData === k500Error) return kInternalError;
      return loanData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async findLastEmiLoanIds(emiIds, where, includes) {
    try {
      includes.push({
        model: loanTransaction,
        attributes: [
          'id',
          'verifiedSalaryDate',
          'promoCodeSentCount',
          'appType',
        ],
      });
      includes.push({
        model: registeredUsers,
        attributes: ['id', 'email', 'phone', 'fcmToken', 'fullName'],
      });
      let attributes: any = ['id', 'loanId', 'userId', 'penalty_days'];
      where = { ...where, id: emiIds };
      const loanData = await this.emiRepo.getTableWhereData(attributes, {
        where,
        include: includes,
      });
      if (loanData === k500Error) return kInternalError;
      return loanData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getPromoCodeDetails(attributes, whereObject) {
    try {
      const promoData = await this.promoCodeRepo.getTableWhereData(
        attributes,
        whereObject,
      );
      if (promoData === k500Error) return kInternalError;
      return promoData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getActivePromoCodes() {
    const attributes = [
      'id',
      'promo_code',
      'promo_code_url',
      'discount',
      'before_days',
      'count',
      'delay_day',
      'end_date',
      'type',
      'is_active',
    ];
    return await this.getPromoCodeDetails(attributes, {
      where: {
        is_active: IS_ACTIVE,
        // [Op.or]: [
        //   { end_date: this.typeService.getGlobalDate(new Date()) },
        //   { end_date: { [Op.eq]: null } },
        // ],
      },
      order: [['id', 'DESC']],
    });
  }

  async getUsersPromoCode(body, getPromoCodes) {
    try {
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      let promoCode = [];
      let promoDetails: any = [];
      if (getPromoCodes.length > 0) {
        promoDetails = getPromoCodes;
      } else {
        promoDetails = await this.getActivePromoCodes();
      }
      if (promoDetails?.message || promoDetails.length <= 0) return promoCode;
      const activeLoan = await this.getUserActiveLoan(userId, null);
      if (activeLoan?.message || activeLoan?.length <= 0) return promoCode;
      for (let i = 0; i < promoDetails.length; i++) {
        let isEligible = await this.getUserEligibility(
          promoDetails[i],
          activeLoan,
        );
        if (isEligible === true) promoCode.push(promoDetails[i]);
      }
      return promoCode;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //for check users eligibility of promoCode
  async checkUserPromoEligibility(body) {
    try {
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      if (!body?.promoCode) return kParamMissing('promoCode');
      let validStatus: any = false;

      // Check delay user
      const emiAttributes = ['id'];
      const emiOptions = {
        where: {
          userId,
          partOfemi: 'LAST',
          payment_due_status: '1',
          payment_status: '0',
        },
      };
      const emiData = await this.repo.getRowWhereData(
        EmiEntity,
        emiAttributes,
        emiOptions,
      );
      if (emiData == k500Error) throw new Error();
      if (!emiData) return validStatus;

      const promoDetails = await this.getPromoCodeDetails(
        [
          'id',
          'promo_code',
          'delay_day',
          'type',
          'before_days',
          'end_date',
          'count',
        ],
        { where: { is_active: IS_ACTIVE, promo_code: body?.promoCode } },
      );
      if (promoDetails?.message || promoDetails.length <= 0) return validStatus;

      const activeLoan = await this.getUserActiveLoan(userId, null);
      if (activeLoan?.message || activeLoan.length <= 0) return validStatus;
      for (let i = 0; i < promoDetails.length; i++) {
        let isEligible = await this.getUserEligibility(
          promoDetails[i],
          activeLoan,
        );
        if (isEligible === true) return isEligible;
      }
      return validStatus;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getUserEligibility(promoDetails, activeLoan) {
    try {
      let currentDate = new Date().toISOString().split('T')[0];
      let salaryDate = new Date();
      salaryDate.setDate(salaryDate.getDate() + +promoDetails?.before_days);
      if (
        promoDetails?.type === promoCodeStatus.SALARY_WISE &&
        activeLoan?.penalty_days >= promoDetails?.delay_day &&
        activeLoan?.loan?.verifiedSalaryDate === salaryDate.getDate()
      ) {
        return true;
      } else if (
        promoDetails?.type === promoCodeStatus.DATE_WISE &&
        activeLoan?.penalty_days >= promoDetails?.delay_day
      ) {
        return true;
      } else if (
        promoDetails?.type === promoCodeStatus.DAY_WISE &&
        activeLoan?.penalty_days === promoDetails?.delay_day
      ) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  private async getUserActiveLoan(userId, loanId) {
    try {
      let whereObject: any = {
        where: {
          partOfemi: 'LAST',
          payment_status: '0',
          payment_due_status: '1',
        },
        include: [
          {
            model: loanTransaction,
            attributes: [
              'id',
              'verifiedSalaryDate',
              'promoCodeSentCount',
              'appType',
            ],
          },
        ],
        order: [['id', 'DESC']],
      };
      if (userId) whereObject.where.userId = userId;
      if (loanId) whereObject.where.loanId = loanId;
      let attributes = ['id', 'loanId', 'userId', 'penalty_days'];
      const activeLoan = await this.emiRepo.getRowWhereData(
        attributes,
        whereObject,
      );
      if (activeLoan === k500Error) return kInternalError;
      return activeLoan;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getEmiAmount(loanId, getPromoCodes) {
    try {
      let getEmiData = await this.emiRepo.getTableWhereData(
        [
          'id',
          'emi_date',
          'emi_amount',
          'penalty',
          'userId',
          'emiNumber',
          'penalty_days',
          'principalCovered',
          'interestCalculate',
          'paid_principal',
          'paid_interest',
          'paid_penalty',
          'paidBounceCharge',
          'paidPenalCharge',
          'paidLegalCharge',
          'paidRegInterestAmount',
          'regInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'dpdAmount',
          'penaltyChargesGST',
          'legalCharge',
          'legalChargeGST',
        ],
        {
          where: { loanId, payment_status: '0', payment_due_status: '1' },
          include: { model: loanTransaction, attributes: ['penaltyCharges'] },
        },
      );
      if (getEmiData === k500Error) return kInternalError;
      getEmiData.forEach((emi) => {
        if (!emi?.loan?.penaltyCharges?.MODIFICATION_CALCULATION) {
          emi.bounceCharge = 0;
        }
      });
      let emiDetails = await this.prepareRepaymentEmiText(
        getEmiData,
        getPromoCodes,
      );
      if (emiDetails?.message) return emiDetails;
      return emiDetails;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async prepareRepaymentEmiText(emiData, getPromoCodes) {
    try {
      let responseObj: any = {};
      const repaymentArray = [];
      let totalAmount = 0;
      let totalPenaltyAmount = 0;
      let totalDefferedAmount = 0;
      let totalBounceAmount = 0;
      let totalPenalAmount = 0;
      let totalLegalAmount = 0;
      let discountAmount = 0;
      let discount = 0;
      let rePayAmount = 0;
      let delayDay = 0;
      let promoCode = '';
      let getPromoCode: any = await this.getUsersPromoCode(
        {
          userId: emiData[0]?.userId,
        },
        getPromoCodes,
      );

      if (getPromoCode?.message) return getPromoCode;
      for (let i = 0; i < getPromoCode.length; i++) {
        if (getPromoCode[i].type === promoCodeStatus.DATE_WISE) {
          discount = getPromoCode[i]?.discount;
          promoCode = getPromoCode[i]?.promo_code;
          delayDay = getPromoCode[i]?.delay_day;
        } else if (getPromoCode[i].type === promoCodeStatus.SALARY_WISE) {
          discount = getPromoCode[i]?.discount;
          promoCode = getPromoCode[i]?.promo_code;
          delayDay = getPromoCode[i]?.delay_day;
        } else {
          discount = getPromoCode[i]?.discount;
          promoCode = getPromoCode[i]?.promo_code;
          delayDay = getPromoCode[i]?.delay_day;
        }
      }

      emiData.forEach((emi) => {
        const emiAmount =
          (emi?.principalCovered ?? 0) +
          (emi?.interestCalculate ?? 0) -
          (emi?.paid_principal ?? 0) -
          (emi?.paid_interest ?? 0);
          let cGstOnPenal = this.typeService.manageAmount(
            (emi.penaltyChargesGST ?? 0) / 2,
          );
          let sGstOnPenal = this.typeService.manageAmount(
            (emi.penaltyChargesGST ?? 0) / 2,
          );
          emi.penaltyChargesGST = cGstOnPenal + sGstOnPenal;
        const passData = {
          emiNumber: emi?.emiNumber,
          penaltyDays: emi?.penalty_days === null ? 0 : emi?.penalty_days,
          penalty: emi?.penalty ?? 0,
          defer:
            this.typeService.manageAmount((emi?.regInterestAmount ?? 0) - (emi?.paidRegInterestAmount ?? 0)),
          ecs:
            this.typeService.manageAmount((emi?.bounceCharge ?? 0) +
            (emi?.gstOnBounceCharge ?? 0) -
            (emi?.paidBounceCharge ?? 0)),
          penal:
            this.typeService.manageAmount((emi?.dpdAmount ?? 0) +
            (emi?.penaltyChargesGST ?? 0) -
            (emi?.paidPenalCharge ?? 0)),
          legal:
            this.typeService.manageAmount((emi?.legalCharge ?? 0) +
            (emi?.legalChargeGST ?? 0) -
            (emi?.paidLegalCharge ?? 0)),
          emiAmount: Math.round(+emiAmount),
          emi_date: this.typeService.getDateFormatted(emi.emi_date),
        };
        repaymentArray.push(passData);
        totalAmount +=
          passData.penalty +
          passData.emiAmount +
          passData.defer +
          passData.ecs +
          passData.penal +
          passData.legal;
        totalPenaltyAmount += passData.penalty;
        totalDefferedAmount += passData.defer;
        totalBounceAmount += passData.ecs;
        totalPenalAmount += passData.penal;
        totalLegalAmount += passData.legal;
      });

      discountAmount =
        ((totalPenaltyAmount +
          totalBounceAmount +
          totalPenalAmount +
          totalLegalAmount +
        totalDefferedAmount) *
          discount) /
        100;
      discount = Math.floor(discount)  
      rePayAmount = this.typeService.manageAmount(totalAmount - discountAmount);

      responseObj.totalAmount = Number(totalAmount).toFixed(2);
      responseObj.discountAmount = Number(discountAmount).toFixed(2);
      responseObj.rePayAmount = Number(rePayAmount).toFixed(2);
      responseObj.emis = repaymentArray;
      responseObj.discount = discount;
      responseObj.delay_day = delayDay;
      responseObj.promoCode = promoCode;
      return responseObj;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getUserWaiveOffEligibility(query) {
    try {
      let userId = query?.userId;
      let loanId = query?.loanId;
      let isLoanClosure = (query?.isLoanClosure ?? false) == 'true';
      let isLoanSettled = (query?.isLoanSettled ?? false) == 'true';
      if (!userId && !loanId) return kParamMissing();
      let userPromoDetails: any = {};
      let expireDate = new Date();
      const activeLoan = await this.getUserActiveLoan(userId, loanId);

      if (
        activeLoan === undefined ||
        activeLoan?.message ||
        activeLoan.length <= 0
      )
        return userPromoDetails;
      userId = activeLoan?.userId;
      let promoDetails: any = await this.getUsersPromoCode({ userId }, []);
      if (promoDetails?.message) return promoDetails;
      if (promoDetails.length === 0) return {};
      let getEmiAmount = await this.getEmiAmount(
        activeLoan?.loanId,
        promoDetails,
      );
      if (getEmiAmount?.message) return userPromoDetails;
      let getPromoData = await this.getPromoCodeDetails(['id'], {
        where: {
          is_active: IS_ACTIVE,
          delay_day: +getEmiAmount.delay_day + 1,
        },
      });
      getPromoData.length > 0
        ? expireDate.setDate(expireDate.getDate() + 1)
        : expireDate;
      if (getPromoData?.message) return userPromoDetails;
      userPromoDetails.emiDetails = getEmiAmount;

      // Platform Specifications
      const nbfc = EnvConfig.nbfc.nbfcShortName.toLocaleLowerCase();
      const lsp = EnvConfig.nbfc.appName.toLocaleLowerCase();
      const appType = activeLoan?.loan?.appType == 1 ? nbfc : lsp;
      // Fetching Banners From Redis for Promo Code Banner
      let bannerList = await this.redisService.get('BANNERS_LIST');
      bannerList = bannerList ?? null;
      bannerList = JSON.parse(bannerList);
      let bannerUrl = '';
      bannerList.forEach((ele) => {
        if (ele?.screen == '7' && ele?.platForm == appType)
          bannerUrl = ele?.bannerUrl[0];
      });
      userPromoDetails.emiDetails.dynamicWaiveOffBanner = bannerUrl;

      userPromoDetails.emiDetails.expireDate = expireDate;
      if (isLoanClosure || isLoanSettled) delete userPromoDetails.emiDetails;
      return userPromoDetails;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
