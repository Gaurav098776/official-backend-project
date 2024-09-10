// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';
import {
  CREDIT_SCORE_REFRESH_DAYS,
  GLOBAL_RANGES,
  GLOBAL_TEXT,
  GlobalServices,
  ECS_BOUNCE_CHARGE,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  kGetActiveSettings,
  kCreditRange,
  kReferralBannerData,
  kConfigSteps,
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
} from 'src/constants/strings';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { TypeService } from 'src/utils/type.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { LoanRepository } from 'src/repositories/loan.repository';
import { StringService } from 'src/utils/string.service';

//Importing Tables
import { UserRatingsEntity } from 'src/entities/user_ratings_entity';
import { FileService } from 'src/utils/file.service';

@Injectable()
export class MiscServiceV3 {
  constructor(
    // Shared Services
    private readonly common: CommonSharedService,
    private readonly configRepo: ConfigsRepository,
    private readonly typeService: TypeService,
    private readonly downloadTrackRepo: DownloaAppTrackRepo,
    private readonly userRepo: UserRepository,
    private readonly purposeRepo: PurposeRepository,
    private readonly bankListRepo: BankListRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly empRepo: EmploymentRepository,
    private readonly userLoanDeclineRepo: UserLoanDeclineRepository,
    private readonly reasonRepo: ReasonRepository,
    private readonly repoManager: RepositoryManager,
    // Utils
    private readonly fileService: FileService,
    private readonly loanRepo: LoanRepository,
    private readonly strService: StringService,
  ) {}

  async getConfigs(query) {
    const attributes = [
      'androidForcefully',
      'androidVersion',
      'approvalMode',
      'bankingProKeySecret',
      'bankingProAppID',
      'chatbotData',
      'infoKeep',
      'iosForcefully',
      'iosVersion',
      'thirdPartyApi',
      'thirdPartyApiReason',
      'stuckContactUsFlow',
    ];
    const options = {};
    // Hit -> Query
    const configData: any = await this.configRepo.getRowWhereData(
      attributes,
      options,
    );
    if (configData == k500Error || !configData) return {};
    await this.storeDeviceIdAtFirstTime(query);

    configData.dataValues.isGoldFlowAvailable = false;
    if (query.type == '1') configData.dataValues.interestRatePerDay = '0.09%';
    else
      configData.dataValues.interestRatePerDay = `${GLOBAL_RANGES.MIN_PER_DAY_INTEREST_RATE}%`;
    const maxLoanAmount = this.typeService.amountNumberWithCommas(
      GLOBAL_RANGES.MAX_LOAN_AMOUNT,
    );
    configData.dataValues.maxLoanAmount = `up to Rs.${maxLoanAmount}`;
    configData.dataValues.loanTenureDays = `up to ${GLOBAL_TEXT.MAX_LOAN_TENURE_FOR_TEXT_ONLY} days`;
    configData.dataValues.noOfEmis = `up to ${GLOBAL_TEXT.NO_OF_EMIS_FOR_TEXT_ONLY}`;
    configData.dataValues.bannerURL = bCommonRatesURL;
    configData.dataValues.isManualContactFlow = true;
    configData.dataValues.referralBannerData = kReferralBannerData;
    configData.dataValues.resources = {
      pdfIcon:
        'https://storage.googleapis.com/backend_static_stuff/Group%2019504.png',
    };

    // Razorpay SDK -> Payment flow
    let paymentSource = await this.common.getServiceName(kPaymentMode);
    if (!paymentSource) paymentSource = GlobalServices.PAYMENT_MODE;
    configData.dataValues.isRazorpay = false;
    if (paymentSource == kRazorpay) {
      configData.dataValues.rzpId = process.env.RAZOR_PAY_ID ?? '';
      configData.dataValues.isRazorpay = true;
    }

    configData.dataValues.serverTimestamp =
      this.typeService.getServerTimestamp();

    // Android
    let androidVer = query?.androidVersion;
    androidVer = androidVer ? androidVer.split('.')[0] : 0;
    let isFaceLiveness = androidVer !== 0 && androidVer < 9 ? false : true;
    configData.dataValues.isFaceLiveness = isFaceLiveness;

    configData.dataValues.loanMaxAmountWithSign = '₹' + maxLoanAmount;
    configData.dataValues.loanMaxAmountWithoutSign = maxLoanAmount;

    configData.dataValues.webApplink = EnvConfig.network.flutterWebLenditt;
    configData.dataValues.documentListSteps = kConfigSteps;

    // Urls
    configData.dataValues.nbfcUrl = kNbfcUrl;
    configData.dataValues.augmontUrl = kAugmontUrl;

    // Gmail verification mails
    configData.dataValues.gmailVerificationMail = kVerificationsMail;
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
      const options = {
        where: { statusFlag: '1' },
        order: [['bankName', 'ASC']],
      };
      const bankList = await this.bankListRepo.getTableWhereData(
        attributes,
        options,
      );
      if (bankList == k500Error) return kInternalError;
      return bankList;
    } catch (error) {
      return kInternalError;
    }
  }

  async getSettingsData(data) {
    let userId = data.userId;
    try {
      const insuranceService = process.env.INSURANCE_SERVICE;
      if (insuranceService == 'true') {
        const settingsList = kGetActiveSettings();
        const insuranceData = settingsList.find(
          (el) => el?.title == 'Insurance',
        );
        if (insuranceData) {
          const faqAttr = ['title', 'content'];
          const faqOps = { where: { type: 'FAQ', subType: 'INSURANCE' } };
          const FAQData = await this.templateRepo.getTableWhereData(
            faqAttr,
            faqOps,
          );
          if (FAQData === k500Error) return kInternalError;
          insuranceData.data.FAQ = FAQData;
          insuranceData.data.termCondition = kInsuranceTermCondition;
        }
        //Charges page
        const loanChargesData = await this.loanRepo.getRowWhereData(
          ['charges', 'processingFees'],
          { where: { userId } },
        );
        if (loanChargesData == k500Error) throw new Error();
        const ele = loanChargesData?.charges;

        const loanCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/currencyinr-r_360.png',
          title: 'Loan Charges',
          description: 'Applicable on the approved loan amount',
          chargesData: {
            'Processing fees': `#*||0B1218||##${
              loanChargesData?.processingFees ?? 0
            }%##*#`,
            'Online convenience fees': `#*||0B1218||##${this.strService.readableAmount(
              ele?.insurance_fee ?? 0,
            )}##*#`,
            'Document charge': `#*||0B1218||##${ele?.doc_charge_per ?? 0}%##*#`,
            'SGST#*||7A7A7A||SGST is inclusive As specified by Government of India*#': `#*||0B1218||##${
              ele?.sgst_amt ?? 0
            }%##*#`,
            'CGST#*||7A7A7A||CGST is inclusive As specified by Government of India*#': `#*||0B1218||##${
              ele?.cgst_amt ?? 0
            }%##*#`,
          },
        };
        const penalCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/percent-r_360.png',
          title: 'Penal Charges',
          description: 'Only applicable on the past due EMI principal amount',
          chargesData: {
            'Days Past Due 1 to 3 days#*||7A7A7A||If your EMI gets delayed by 1 to 3 days you will be charged 5% on your delayed EMI principal amount.*#':
              '#*||0B1218||##5%##*#',
            'Days Past Due 4 to 14 days#*||7A7A7A||If your EMI gets delayed by 4 to 14 days you will be charged 10% on your delayed EMI principal amount.*#':
              '#*||0B1218||##10%##*#',
            'Days Past Due 15 to 30 days#*||7A7A7A||If your EMI gets delayed by 15 to 30 days you will be charged 15% on your delayed EMI principal amount.*#':
              '#*||0B1218||##15%##*#',
            'Days Past Due 31 to 60 days#*||7A7A7A||If your EMI gets delayed by 31 to 60 days you will be charged 20% on your delayed EMI principal amount.*#':
              '#*||0B1218||##20%##*#',
            'Days Past Due 60+ days#*||7A7A7A||If your EMI gets delayed by 60+ days you will be charged 25% on your delayed EMI principal amount.*#':
              '#*||0B1218||##25%##*#',
          },
        };
        const otherCharges = {
          icon: 'https://storage.googleapis.com/backend_static_stuff/receipt-r_360.png',
          title: 'Other Charges',
          chargesData: {
            'ECS Bounce charges': `#*||0B1218||##${this.strService.readableAmount(
              ECS_BOUNCE_CHARGE,
            )}##*#`,
            'Deferred Interest#*||7A7A7A||In the event of delayed EMI Payments, regular interest will accumulate on the outstanding EMI principal amount.*#':
              '',
          },
        };
        const chargesObj: any = {
          service: true,
          title: 'Charges',
          data: [loanCharges, penalCharges, otherCharges],
        };
        settingsList.push(chargesObj);

        return settingsList;
      }
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
