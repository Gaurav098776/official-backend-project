// Imports
import { Injectable } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';
import {
  GLOBAL_RANGES,
  GLOBAL_TEXT,
  GlobalServices,
  ECS_BOUNCE_CHARGE,
  GLOBAL_CHARGES,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  kGetActiveSettings,
  kReferralBannerData,
  kConfigSteps,
  ratingAndReview,
} from 'src/constants/objects';
import {
  kInternalError,
  kParamMissing,
  kInvalidParamValue,
} from 'src/constants/responses';
import {
  bCommonRatesURL,
  NBFCPlayStoreLink,
  kAugmontUrl,
  kInsuranceTermCondition,
  kNbfcUrl,
  kPaymentMode,
  kRazorpay,
  kVerificationsMail,
  lspAppStoreLink,
  lspPlaystoreLink,
  shareAppTextNBFC,
  shareAppTextLsp,
  kRuppe,
} from 'src/constants/strings';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { LoanRepository } from 'src/repositories/loan.repository';

//Importing Tables
import { UserRatingsEntity } from 'src/entities/user_ratings_entity';
import { FileService } from 'src/utils/file.service';
import { StringService } from 'src/utils/string.service';
import { RedisService } from 'src/redis/redis.service';
import { CreditAnalystService } from 'src/admin/admin/creditAnalystRedis.service';

@Injectable()
export class MiscServiceV4 {
  constructor(
    // Shared Services
    private readonly common: CommonSharedService,
    private readonly typeService: TypeService,
    private readonly downloadTrackRepo: DownloaAppTrackRepo,
    private readonly userRepo: UserRepository,
    private readonly purposeRepo: PurposeRepository,
    private readonly bankListRepo: BankListRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly userLoanDeclineRepo: UserLoanDeclineRepository,
    private readonly reasonRepo: ReasonRepository,
    private readonly repoManager: RepositoryManager,
    private readonly loanRepo: LoanRepository,

    // Utils
    private readonly fileService: FileService,
    private readonly strService: StringService,
    private readonly redisService: RedisService,
    private readonly creditAnalystService: CreditAnalystService,
  ) {}

  async getConfigs(query) {
    const appType = query?.apptype;
    let configData = await this.redisService.get('CONFIG_DATA');
    if (!configData) {
      configData = await this.creditAnalystService.storeConfigData();
      if (!configData) return kInternalError;
      configData = await this.redisService.get('CONFIG_DATA');
    }
    configData = await JSON.parse(configData);
    const res = await this.storeDeviceIdAtFirstTime(query);

    configData.isGoldFlowAvailable = false;
    if (query.type == '1') configData.interestRatePerDay = '0.09%';
    else
      configData.interestRatePerDay = `${GLOBAL_RANGES.MIN_PER_DAY_INTEREST_RATE}%`;
    const maxLoanAmount = this.typeService.amountNumberWithCommas(
      GLOBAL_RANGES.MAX_LOAN_AMOUNT,
    );
    configData.maxLoanAmount = `up to Rs.${maxLoanAmount}`;
    configData.loanTenureDays = `up to ${GLOBAL_TEXT.MAX_LOAN_TENURE_FOR_TEXT_ONLY} days`;
    configData.noOfEmis = `up to ${GLOBAL_TEXT.NO_OF_EMIS_FOR_TEXT_ONLY}`;
    configData.bannerURL = bCommonRatesURL;
    configData.isManualContactFlow = true;
    configData.referralBannerData = kReferralBannerData;
    configData.resources = {
      pdfIcon:
        'https://storage.googleapis.com/backend_static_stuff/Group%2019504.png',
    };

    // Razorpay SDK -> Payment flow
    let paymentSource = await this.common.getServiceName(kPaymentMode);
    if (!paymentSource) paymentSource = GlobalServices.PAYMENT_MODE;
    configData.isRazorpay = false;
    if (paymentSource.includes('RAZORPAY')) {
      configData.rzpId = process.env.RAZOR_PAY_ID ?? '';
      configData.isRazorpay = true;
    }

    configData.serverTimestamp = this.typeService.getServerTimestamp();

    // Android
    let androidVer = query?.androidVersion;
    androidVer = androidVer ? androidVer.split('.')[0] : 0;
    let isFaceLiveness = androidVer !== 0 && androidVer < 9 ? false : true;
    configData.isFaceLiveness = isFaceLiveness;

    configData.loanMaxAmountWithSign = '₹' + maxLoanAmount;
    configData.loanMaxAmountWithoutSign = maxLoanAmount;

    configData.webApplink =
      appType == 0
        ? EnvConfig.network.flutterWebLenditt
        : EnvConfig.network.flutterWebNbfc1;
    configData.documentListSteps = kConfigSteps;

    // Urls
    configData.nbfcUrl = kNbfcUrl;
    configData.augmontUrl = kAugmontUrl;
    // Gmail verification mails
    configData.gmailVerificationMail = kVerificationsMail;

    return configData;
  }

  async storeDeviceIdAtFirstTime(query) {
    try {
      if (!query?.deviceId || !query?.type) return false;
      const deviceId = query.deviceId;
      const typeOfDevice = query.type;
      //check device Id already exist
      const options = { where: { deviceId } };
      const checkIfUserPresent = await this.downloadTrackRepo.getCountsWhere(
        options,
      );
      //chech device already registred
      const userOptions = { where: {} };
      if (query.typeOfDevice === '2')
        userOptions.where = {
          webRecentDeviceId: deviceId,
        };
      else
        userOptions.where = {
          recentDeviceId: deviceId,
        };
      const checkUserRegisterPresent = await this.userRepo.getCountsWhere(
        userOptions,
      );
      if (checkIfUserPresent > 0 || checkUserRegisterPresent > 0) return false;
      const currDate: any = this.typeService.getGlobalDate(new Date());
      await this.downloadTrackRepo.create({
        deviceId,
        typeOfDevice,
        registeredDate: currDate.toJSON(),
      });
    } catch (error) {
      return false;
    }
  }

  async getLoanPurposeList() {
    try {
      const attributes = [
        'id',
        'purposeName',
        'header',
        'image',
        'primaryColor',
        'primaryAccentColor',
        'purposeStatusVerified',
        'textColor',
      ];
      const options = { where: { purposeStatusVerified: '1' } };

      const purposeList = await this.purposeRepo.getTableWhereData(
        attributes,
        options,
      );
      if (purposeList == k500Error) return kInternalError;
      return purposeList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getAvailableBankList() {
    try {
      const attributes = [
        'aaService',
        'id',
        'bankCode',
        'bankName',
        'image',
        'pdfService',
      ];
      const options = { where: { statusFlag: '1' } };
      const bankList = await this.bankListRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankList == k500Error) return kInternalError;
      return bankList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getSettingsData(data) {
    try {
      const settingsList = kGetActiveSettings();
      const insuranceData = settingsList.find((el) => el?.title == 'Insurance');
      if (insuranceData) {
        const key = `TEMPLATE_FAQ_INSURANCE`;
        let FAQData = await this.redisService.get(key);
        FAQData = FAQData ?? null;
        FAQData = JSON.parse(FAQData) ?? [];

        if (!FAQData.length) {
          const faqAttr = ['title', 'content'];
          const faqOps = { where: { type: 'FAQ', subType: 'INSURANCE' } };
          FAQData = await this.templateRepo.getTableWhereData(faqAttr, faqOps);
          if (FAQData === k500Error) throw new Error();
        }
        insuranceData.data.FAQ = FAQData;
        insuranceData.data.termCondition = kInsuranceTermCondition;
      }
      //Charges page
      const chargesObj = settingsList.find((el) => el?.title == 'Charges');
      if (chargesObj) {
        const userId = data?.userId;
        const lastLoan = await this.loanRepo.getRowWhereData(
          ['charges', 'penaltyCharges'],
          { where: { userId, loanStatus: 'Active' }, order: [['id', 'DESC']] },
        );
        if (lastLoan === k500Error) throw new Error();
        const loanCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/currencyinr-r_360.png',
          title: 'Loan Charges',
          description: 'Applicable on the approved loan amount',
          chargesData: {
            'Processing fees': `${GLOBAL_CHARGES.PROCESSING_FEES}%`,
            'Online convenience fees': `${kRuppe}${GLOBAL_CHARGES.INSURANCE_FEE}`,
            'Document charge': `${GLOBAL_CHARGES.DOC_CHARGE_PER}%`,
          },
        };

        loanCharges.chargesData[
          'Risk assessment charges'
        ] = `${GLOBAL_CHARGES.RISK_ASSESSMENT_PER}%#*\nFor applicable users*#`;

        loanCharges.chargesData[
          'SGST#*\nSGST is inclusive As specified by Government of India*#'
        ] = `${GLOBAL_CHARGES.GST / 2}%`;

        loanCharges.chargesData[
          'CGST#*\nCGST is inclusive As specified by Government of India*#'
        ] = `${GLOBAL_CHARGES.GST / 2}%`;
        const penalCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/percent-r_360.png',
          title: 'Penal Charges #*(+ GST as applicable)*#',
          description: 'Only applicable on the past due EMI principal amount',
          chargesData: {
            'Days Past Due 1 to 3 days': '5%',
            'Days Past Due 4 to 14 days': '10%',
            'Days Past Due 15 to 30 days': '15%',
            'Days Past Due 31 to 60 days': '20%',
            'Days Past Due 60+ days': '25%',
          },
        };
        const otherCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/receipt-r_360.png',
          title: 'Other Charges',
          chargesData: {
            'ECS Bounce charges': `${this.strService.readableAmount(
              ECS_BOUNCE_CHARGE,
            )}#*\n(+ GST as applicable)*# `,
          },
        };

        if (data.appType == 0) {
          loanCharges.icon =
            'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/loanCharges/loan_charges%20(1).svg';
          penalCharges.icon =
            'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/loanCharges/penal_charges.svg';
          otherCharges.icon =
            'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/loanCharges/other_charges.svg';
        }

        if (lastLoan && !lastLoan?.penaltyCharges) {
          otherCharges.chargesData[
            'Deferred Interest#*\n0.2% per day, which equals to 73% annually.*#'
          ] = '';
          chargesObj.data = [loanCharges, otherCharges];
        } else {
          otherCharges.chargesData[
            'Deferred Interest#*\nIn the event of delayed EMI Payments, regular interest will accumulate on the outstanding EMI principal amount.*#'
          ] = '';
          chargesObj.data = [loanCharges, penalCharges, otherCharges];
        }
        otherCharges.chargesData['Legal Charge'] = `${
          kRuppe +
          this.typeService.amountNumberWithCommas(GLOBAL_CHARGES.LEGAL_CHARGE)
        }#*\n(+ GST as applicable)*#`;
      }
      return settingsList;
    } catch (error) {
      return [];
    }
  }

  async userLoanDeclineReasons() {
    try {
      const attributes = ['id', 'userDeclineReasonTitle'];
      const options = {
        where: { userDeclineStatus: '0' },
      };
      const reasons = await this.userLoanDeclineRepo.getTableWhereData(
        attributes,
        options,
      );
      if (!reasons || reasons == k500Error) return kInternalError;
      return reasons;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async getBlackListReason() {
    try {
      const attributes = ['id', 'reason'];
      const options = {
        where: { status: true, type: 'USER_BLACKLIST' },
      };
      const blackListReason = await this.reasonRepo.getTableWhereData(
        attributes,
        options,
      );
      if (!blackListReason || blackListReason == k500Error)
        return kInternalError;
      return blackListReason;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async shareTextApp(headers: Headers) {
    try {
      const appType = headers['apptype'] ?? 0;
      const data: any = {};
      if (appType == 0) {
        data.shareAppText = shareAppTextLsp;
        data.playstoreLink = lspPlaystoreLink;
        data.appStoreLink = lspAppStoreLink;
      } else {
        data.shareAppText = shareAppTextNBFC;
        data.playstoreLink = NBFCPlayStoreLink;
      }
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async storeUserRating(body) {
    const userId = body?.userId;
    const rating = body?.rating ?? '';
    if (!userId) return kParamMissing('userId');
    if (!rating) return kParamMissing('rating');
    if (rating < 1 || rating > 5) return kInvalidParamValue('rating');
    const ratingData = { userId, rating };
    const createdData = await this.repoManager.createRowData(
      UserRatingsEntity,
      ratingData,
    );

    if (createdData == k500Error) throw new Error();

    return createdData;
  }

  async uploadFile(reqData) {
    const media = reqData.media;
    if (!media) return kParamMissing('media');

    return await this.fileService.binaryToFileURL(
      media,
      reqData.extension,
      reqData.directory,
    );
  }
}
