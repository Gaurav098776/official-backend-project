// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { Op } from 'sequelize';
import { CryptService } from 'src/utils/crypt.service';
import { k500Error } from 'src/constants/misc';
import {
  bCommonRatesURL,
  bDueRatesURL,
  kAadhaarService,
  kAccountInfo,
  kAddAadhareNumberRoute,
  kAddAccountNumberRoute,
  kAddIFSCRoute,
  kAugmountRoute,
  kAutomateResidenceRoute,
  kBankingRoute,
  kBasicDetailsRoute,
  kBasicInfo,
  kDashboardRoute,
  kDisbursementInfo,
  keMandateFailedInfo,
  keMandateInfo,
  kEmploymentInfo,
  kEmploymentRoute,
  kESignPendingInfo,
  kESignPreparationInfo,
  kEsignRoute,
  kGlobalTrail,
  kGoldRouteRoute,
  kIFSCInfo,
  kIsNeedTagSalaryRoute,
  kKYCInfo,
  kLoanAcceptInfo,
  kMandateRoute,
  kMissingMonthRoute,
  kNoDataFound,
  kNoRoute,
  kNotEligibleRoute,
  kNotEligibleText,
  kPermissionRoute,
  kPersonalDetailsRoute,
  kPersonalInfo,
  kPreferenceRoute,
  kProfessionalDetailsRoute,
  kProfessionalInfo,
  kRazorpay,
  kReApplyRoute,
  kReferenceInfo,
  kReferenceRoute,
  kReferralLive,
  kreloginRoute,
  kRepaymentRoute,
  kResidenceAutomationInfo,
  kResidenceProofInfo,
  kResidenceTypeInfo,
  kReUploadPanInfo,
  kReuploadPanRoute,
  kSalarySlipRoute,
  kSelectInterestRoute,
  kSelectLoanAmountRoute,
  kSelectPurposeRoute,
  kSetPassCodeRoute,
  kStatementInfo,
  kSubmitResidenceProofRoute,
  kTagSalaryInfo,
  kTakeSelfieRoute,
  kTEmailOtp,
  kTypeAddressRoute,
  kVerificationInfo,
  kWebviewRoute,
  kWorkEmailRoute,
  kWorkMailInfo,
  nomineeDetailsTag,
  kCibilAddressRoute,
  bMarketingBanners,
  kErrorMsgs,
  kSetPassCode,
  kHandyDocs,
  kBeforeRegText,
  kBeforeKYCVerificationText,
  kBeforeEmploymentVerificationText,
  kBeforeSalaryVerificationText,
  KBeforeResidenceVerificationText,
  kBeforeEligiblityText,
  kBeforeEMandateRegText,
  kBeforeESignText,
  kBeforeDisbursementText,
  kProfilePhotoInfo,
  SelfieRejected,
  SelfieUnderVerification,
  kDisbursementInfoNBFC,
  kKeyFactStatementRoute,
  kSuccessful,
  kEmailVerifiedSuccessfully,
  kTEmailVerificationLink,
  kEmailAlreadyVerified,
  kVerificationLinkExpired,
  kEmailVerifySuccessMessage,
  bMarketingBannersForActiveLoanLsp,
  bMarketingBannersForActiveLoanNBFC,
  kInactiveUser,
  SALARY_BANK_ACCOUNT_COOL_OFF,
  kSupportMail,
  kESignService,
  kSetu,
} from 'src/constants/strings';
import { MasterRepository } from 'src/repositories/master.repository';
import { CommonService } from 'src/utils/common.service';
import { MasterEntity } from 'src/entities/master.entity';
import { regEmail, regPanCard } from 'src/constants/validation';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import {
  ANDROID_VERSION,
  AUGMOUNT_URL,
  bannerOBJ,
  CONTACT_REFERENCE_LIMIT,
  gIsPROD,
  GLOBAL_RANGES,
  HEALTH_DATA,
  IOS_VERSION,
  READ_NOTIFICATION_DATA,
  SCREEN_TIME_DATA,
  SYSTEM_ADMIN_ID,
  UAT_PHONE_NUMBER,
  GLOBAL_FLOW,
  PAGE_LIMIT,
  MIN_SALARY,
  TOKEN_LENGTH,
  EXPITY_TIME,
  isUAT,
  REKYCDAYS,
  USER_WRONG_OTP_TIME_MINS,
  USER_LOGIN_CHANCE,
} from 'src/constants/globals';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { TypeService } from 'src/utils/type.service';
import {
  getEsignURLData,
  getmAadhaarData,
  getMandateData,
  getSubscriptionData,
  kDummyUserIds,
  kEmploymentFields,
  kExotelAppIds,
  kGetResidenceAutomationOptions,
  kRazorpayM2Auth,
  UserStage,
  kSignupFields,
  kRegistrationFields,
  kEligibilityFields,
} from 'src/constants/objects';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { BankingRepository } from 'src/repositories/banking.repository';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { KYCEntity } from 'src/entities/kyc.entity';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { LoanRepository } from 'src/repositories/loan.repository';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { ESignRepository } from 'src/repositories/esign.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { SenderService } from 'src/utils/sender.service';
import { MigrationSharedService } from 'src/shared/migration.service';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { FileService } from 'src/utils/file.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { LocationRepository } from 'src/repositories/location.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { LOAN_APPS } from 'src/constants/loanApps';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import {
  nRazorpayMandateAppCallback,
  nEmailVerifyNBFC,
  INVITATION_MANDATE_URL,
  nRazorpayMandateWebCallbackLenditt,
  nRazorpayMandateWebCallbackNbfc1,
} from 'src/constants/network';
import { RedisService } from 'src/redis/redis.service';
import { CibilService } from 'src/shared/cibil.service';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { EmiSharedService } from 'src/shared/emi.service';
import { randomBytes } from 'crypto';
import { AdminService } from 'src/admin/admin/admin.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { EnvConfig } from 'src/configs/env.config';
import { FramesEntity } from 'src/entities/frames_entity';
import { kFrameImages } from 'src/constants/directories';
import { registeredUsers } from 'src/entities/user.entity';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { BanksRepository } from 'src/repositories/banks.repository';
import { UserSharedService } from 'src/shared/user.share.service';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { ReasonsEntity } from 'src/entities/Reasons.entity';
import { MiscServiceV3 } from '../misc/misc.service.v3';
import { StringService } from 'src/utils/string.service';
@Injectable()
export class UserServiceV3 {
  constructor(
    private readonly repoManager: RepositoryManager,
    private readonly reqSupportRepo: RequestSupportRepository,
    private readonly bankingRepo: BankingRepository,
    private readonly commonService: CommonService,
    private readonly cryptService: CryptService,
    private readonly deviceRepo: DeviceRepository,
    private readonly eSignRepo: ESignRepository,
    private readonly exotelService: exotelService,
    private readonly googleService: GoogleService,
    private readonly kycRepo: KYCRepository,
    private readonly loanRepo: LoanRepository,
    private readonly locationRepo: LocationRepository,
    private readonly purposeRepo: PurposeRepository,
    private readonly masterRepo: MasterRepository,
    private readonly repository: UserRepository,
    private readonly blockUserHistoryRepo: BlockUserHistoryRepository,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly sharedEligibility: EligibilitySharedService,
    private readonly selfieRepo: UserSelfieRepository,
    private readonly typeService: TypeService,
    private readonly downloadTrackRepo: DownloaAppTrackRepo,
    private readonly DeviceRepo: DeviceRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly userSharedService: UserSharedService,
    private readonly senderService: SenderService,
    private readonly migrationSharedService: MigrationSharedService,
    private readonly allsmsService: AllsmsService,
    private readonly notificationService: SharedNotificationService,
    private readonly userActivityRepository: UserActivityRepository,
    private readonly deviceInfoInstallAppRepo: DeviceInfoInstallAppRepository,
    private readonly empRepo: EmploymentRepository,
    private readonly fileService: FileService,
    private readonly sharedMandate: MandateSharedService,
    private readonly cibilScoreRepo: CibilScoreRepository,
    private readonly installAppRepo: InstallAppRepository,
    private readonly userPermissionRepo: UserPermissionRepository,
    private readonly DeviceSIMRepo: DeviceSIMRepository,
    private readonly defaulterOnlineRepo: DefaulterOnlineRepository,
    private readonly emiRepo: EMIRepository,
    private readonly staticConfigRepo: StaticConfigRepository,
    private readonly sharedReferral: ReferralSharedService,
    @Inject(forwardRef(() => EmiSharedService))
    private readonly sharedEmi: EmiSharedService,
    private readonly adminService: AdminService,
    private readonly strService: StringService,
    // Database
    // Utils services
    private readonly whatsappService: WhatsAppService,
    private readonly redisService: RedisService,
    private readonly cibilService: CibilService,
    private readonly bankListRepo: BankListRepository,
    private readonly bankRepo: BanksRepository,
    private readonly miscService: MiscServiceV3,
  ) {}

  // User tries to Login or Signup in the app
  async logIn(reqData, headers) {
    try {
      // Params validation
      let phone = reqData.phone;
      const fcmToken = reqData.fcmToken ?? '';
      const recentDeviceId = reqData.recentDeviceId ?? '';
      const typeOfDevice = reqData.typeOfDevice;
      const platform = reqData.platform;

      const appType = headers['apptype'] ?? headers['appType'] ?? 0;
      const smsKey = reqData?.smsKey;

      if (!phone) return kParamMissing('phone');
      if (!fcmToken && platform != 'WEB') return kParamMissing('fcmToken');
      if (typeOfDevice != '2') {
        if (!fcmToken) return kParamMissing('fcmToken');
      }
      if (!recentDeviceId) return kParamMissing('recentDeviceId');
      if (!typeOfDevice) return kParamMissing('typeOfDevice');
      if (isNaN(phone)) return kInvalidParamValue('phone');
      if (phone.length != 10)
        return k422ErrorMessage('Please enter correct 10 digit phone number');

      const contact = phone;
      // Encrypt phone
      phone = this.cryptService.encryptPhone(phone);
      const tail = phone.split('===')[1];

      // Existing user
      const attributes = [
        'email',
        'id',
        'recentDeviceId',
        'typeOfDevice',
        'fcmToken',
        'pin',
        'isCibilConsent',
        'referralCode',
        'isRedProfile',
        'otp',
        'isDeleted',
        'phone',
      ];
      const options = {
        where: { phone: { [Op.like]: '%' + tail } },
        order: [['isBlacklist']],
      };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      const updateData: any = {};

      const checkData = await this.checkDeviceLoanIsActive(
        recentDeviceId,
        userData?.id,
      );
      if (checkData?.message) return checkData;
      let checkUserEligibleForLogin = userData;
      if (reqData.newSignUpFlow && userData) {
        const attr = ['status'];
        const option = { where: { userId: userData?.id } };
        const phoneStatus = await this.masterRepo.getRowWhereData(attr, option);
        checkUserEligibleForLogin =
          userData &&
          phoneStatus?.status.phone == '1' &&
          userData?.isDeleted == '0';
      }
      if (checkUserEligibleForLogin) {
        reqData.id = userData.id;
        await this.addOrupdateDeviceInfo(reqData);
        let changeToken = false;
        //check web fcm scenario here
        if (typeOfDevice === '2') {
          updateData.webFcmToken = fcmToken;
          updateData.webRecentDeviceId = recentDeviceId;
        } else {
          if (userData?.fcmToken && userData?.fcmToken != fcmToken) {
            changeToken = true;
            await this.senderService.sendNewLogInPushNotification(
              userData.fcmToken,
            );
          } else updateData.fcmToken = fcmToken;
          if (userData.recentDeviceId != recentDeviceId) {
            updateData.recentDeviceId = recentDeviceId;
            if (userData.recentDeviceId != recentDeviceId) {
              updateData.recentDeviceId = recentDeviceId;
              const updateBody = {
                recentDeviceId: recentDeviceId,
                fcmToken: fcmToken,
                typeOfDevice: typeOfDevice,
                id: userData.id,
                isLoggedIn: '0',
              };
              const updateResult = await this.registerDevice(updateBody);
              if (updateResult == k500Error) return kInternalError;
            }
          }
        }
        if (userData.typeOfDevice != typeOfDevice)
          updateData.typeOfDevice = typeOfDevice;
        const otp = this.commonService.generateOTP(reqData.phone);
        updateData.otp = otp;
        updateData.appType = appType;
        if (userData.isCibilConsent != 1) {
          const attributes = ['id', 'loanStatus'];
          const options = {
            order: [['id', 'DESC']],
            where: { userId: userData.id },
          };
          const loanData = await this.loanRepo.getRowWhereData(
            attributes,
            options,
          );
          if (loanData == k500Error) return kInternalError;
          if (loanData?.loanStatus != 'Active') updateData.isCibilConsent = 2;
        }

        if (!userData.referralCode) {
          const uniqueCode = await this.sharedReferral.getUniqueReferralCode();
          if (uniqueCode && !uniqueCode?.message) {
            userData.referralCode = uniqueCode;
            updateData.referralCode = uniqueCode;
          }
        }

        // Cibil consent
        if (reqData.isCibilConsent == true) updateData.isCibilConsent = 1;
        await this.repository.updateRowData(updateData, userData.id);
        await this.removePreviousFcmToken(fcmToken, userData.id);
        await this.checkAndUpdateDownloadApp(
          updateData.recentDeviceId,
          'LOGIN',
        );
        const result = await this.routeDetails(userData);
        if (!userData?.pin || changeToken || userData?.isRedProfile === 1) {
          // Call user or send OTP via sms
          let authType = 'otp';
          if (reqData?.typeOfDevice != '1')
            authType = reqData?.authType?.toLowerCase() ?? 'otp';

          // SMS auth
          if (
            authType != 'call' ||
            this.isBelowAndroid9ForCall(reqData) == true ||
            GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'SMS'
          ) {
            // Temporary fixes for nbfc app
            if (authType != 'call')
              await this.allsmsService.sendOtp(otp, phone, smsKey);

            result.showOTPBox = true;
            result.otpBoxValue = '+91 ' + this.cryptService.decryptPhone(phone);
            // Send Email as well
            if (userData.email) {
              try {
                const data = {
                  name: userData.fullName,
                  code: otp,
                  userId: userData.id,
                };
                this.notificationService.sendEmail(
                  kTEmailOtp,
                  userData.email,
                  data,
                );
              } catch (error) {}
            }
          }
          // Call auth
          else if (GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'CALL') {
            const exotelData = this.getExotelVerificationCallData();
            delete result.showOTPBox;
            delete result.otpBoxValue;
            result.durationInMills = 2000;
            result.timeoutInMills = 60000;
            result.verificationNumber = exotelData.callId;
            this.exotelService.sendCallReq('91' + result?.userData?.phone, {
              callId: exotelData.callId,
              appId: exotelData.appId,
            });
          }
          if (GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'SMS' && authType == 'call')
            result.timeoutInMills = 0;

          delete result.continueRoute;
          delete result.rootRoute;
          result.type = 'phone';
        }
        return result;
      }

      // Register new user
      return await this.signUp(
        {
          phone,
          fcmToken,
          recentDeviceId,
          typeOfDevice,
          contact,
          appType,
          userData,
        },
        reqData,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  async checkNewUserEligibleOrNot(reqData) {
    try {
      const userId = reqData?.userId;
      const isSalaried = reqData?.isSalaried;
      const salaryMode = reqData?.salaryMode;
      let salary = reqData?.salary;
      const smsKey = reqData?.smsKey;

      const userData = {
        isSalaried,
        salaryMode,
      };
      if (isSalaried == '0') {
        (userData.salaryMode = null), (userData.isSalaried = null);
        salary = '';
      }
      const updateUserData = await this.repository.updateRowData(
        userData,
        userId,
      );
      if (updateUserData == k500Error) return kInternalError;
      if (salary || salary == '') {
        const attr = ['otherInfo'];
        const options = {
          where: {
            userId,
          },
        };
        const masterData = await this.masterRepo.getRowWhereData(attr, options);
        if (!masterData) return k422ErrorMessage(kNoDataFound);
        masterData.otherInfo.salaryInfo = salary;
        const updateMasterData = await this.masterRepo.updateRowWhereData(
          masterData,
          options,
        );
        if (updateMasterData == k500Error) return kInternalError;
      }
      const attr = ['phone'];
      const options = {
        where: {
          id: userId,
        },
      };
      const { phone } = await this.repository.getRowWhereData(attr, options);
      if (!phone) return k422ErrorMessage(kNoDataFound);
      if (
        isSalaried == 1 &&
        (salaryMode == 1 || salaryMode == 2) &&
        salary >= MIN_SALARY
      ) {
        const result = await this.reSendOtpPhone(userId, phone, smsKey);
        if (!result) return kInternalError;
        return {
          showOTPBox: true,
          type: 'phone',
          otpBoxValue: '+91 ' + this.cryptService.decryptPhone(phone),
        };
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async updateSkipReferralField() {
    try {
      const options = {
        attributes: ['id', 'masterId', 'referredBy', 'referralSkip'],
        where: {
          referredBy: { [Op.eq]: null },
          referralSkip: { [Op.eq]: false },
        },
        include: [
          {
            model: MasterEntity,
            attributes: ['userId', 'id', 'status'],
            where: { status: { basic: 1 } },
          },
        ],
      };
      const userData = await this.repository.getTableWhereData(
        ['userId'],
        options,
      );
      const userIds = [];
      userData.forEach((items) => {
        userIds.push(items.id);
      });
      if (userIds.length == 0) return 'No User Found';
      const updatedData = {
        referralSkip: true,
      };
      const option = { where: { id: { [Op.in]: userIds } }, silent: true };
      const update = await this.repository.updateRowWhereData(
        updatedData,
        option,
      );
      return true;
    } catch (error) {
      return kInternalError;
    }
  }

  async getUserRegistrationFields(id) {
    try {
      if (!id) return kParamMissing('userId');
      const userData = await this.repository.getRowWhereData(
        ['referredBy', 'referralSkip', 'communicationLanguage'],
        { where: { id } },
      );
      let communicationLanguage = false;
      const language = userData?.communicationLanguage;
      if (language == 1 || language == 2) communicationLanguage = true;
      if (userData?.referredBy && userData?.referralSkip == false)
        var isReferred = true;
      else if (userData?.referralSkip == true) var isReferred = true;
      else var isReferred = false;
      const options = await this.getPurposeList();
      const bankOptions = await this.miscService.getAvailableBankList();
      const transformedOptions = options.map((option) => ({
        id: option.id,
        value: option.purposeName,
      }));
      const transformedBankOptions = bankOptions.map((option) => ({
        id: option.id,
        value: option.bankName,
      }));
      const registrationFields = [];
      kRegistrationFields.forEach((data) => {
        if (data.title == 'Loan purpose') {
          data.options = transformedOptions;
        }
        if (data.title == 'Select salary bank') {
          transformedBankOptions.push({
            id: -1,
            value: 'Other',
          });
          data.options = transformedBankOptions;
        }
        if (isReferred && data.title != 'Enter referral code') {
          registrationFields.push(data);
        } else if (!isReferred) {
          registrationFields.push(data);
        }
      });
      if (communicationLanguage) {
        const fieldsWithoutPreferredLang = registrationFields.filter(
          (item) => item.title !== 'Communication Language',
        );
        return fieldsWithoutPreferredLang;
      }
      return registrationFields;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region check device to loan active
  private async checkDeviceLoanIsActive(activeDeviceId, userId: null) {
    try {
      const exceptions = ['-1', 'NOT_FOUND'];
      if (exceptions.includes(activeDeviceId)) return;

      const where: any = { activeDeviceId, loanStatus: 'Active' };
      if (userId) where.userId = { [Op.ne]: userId };
      const att = ['id'];
      const find = await this.loanRepo.getRowWhereData(att, { where });
      if (find) {
        let id = find.id;
        const year = new Date().getFullYear().toString();
        id = year.substring(0, 2) + id + year.substring(2);
        if (userId) {
          const opts = { where: { userId, loanStatus: 'Active' } };
          const findActive = await this.loanRepo.getRowWhereData(att, opts);
          if (findActive?.id) return;
        }
        return k422ErrorMessage(kErrorMsgs.SAME_DEVICE_LOAN_ACTIVE + id);
      }
    } catch (error) {}
  }
  //#endregion

  // User registration
  async signUp(reqData, body) {
    try {
      const isLspReq = body.lspSignUp;
      if (!reqData.typeOfDevice) return kParamMissing('typeOfDevice');
      const smsKey = body?.smsKey;
      const dates = {
        registration: new Date().getTime(),
        basicDetails: 0,
        aadhaar: 0,
        employment: 0,
        banking: 0,
        residence: 0,
        eligibility: 0,
        eMandate: 0,
        eSign: 0,
        disbursement: 0,
      };
      const status = {
        pan: -1,
        pin: -1,
        bank: -1,
        loan: -2,
        basic: -1,
        eSign: -1,
        email: -1,
        phone: -1,
        selfie: -1,
        aadhaar: -1,
        company: -1,
        contact: -1,
        eMandate: -1,
        personal: -1,
        workMail: -1,
        reference: -1,
        repayment: -2,
        residence: -1,
        permission: 1,
        salarySlip: -1,
        disbursement: -1,
        professional: -1,
      };
      const masterAttr = {
        dates,
        status,
      };
      let masterData: any;
      if (reqData?.userData) {
        const options = {
          where: {
            userId: reqData?.userData.id,
          },
          order: [['id', 'DESC']],
        };
        const masterDetails = await this.masterRepo.getRowWhereData(
          ['id'],
          options,
        );
        if (masterDetails == k500Error) return kInternalError;
        const masterOptions = {
          where: { id: masterDetails.id },
          returning: true,
          raw: true,
          plain: true,
        };
        masterData = await this.masterRepo.updateRowWhereData(
          masterAttr,
          masterOptions,
        );
        if (masterData == k500Error) return kInternalError;
        masterData = masterData[1];
      } else {
        masterData = await this.masterRepo.createRowData(masterAttr);
        if (masterData == k500Error) return kInternalError;
      }
      const masterId = masterData.id;
      const phone = reqData.phone;
      const allPhone = [reqData.contact];
      const fcmToken = reqData.fcmToken;
      const recentDeviceId = reqData.recentDeviceId ?? '';
      const typeOfDevice = reqData.typeOfDevice;
      const referralCode = await this.sharedReferral.getUniqueReferralCode();
      const appType = reqData.appType;
      const otp =
        body.newSignUpFlow && !isLspReq
          ? null
          : this.commonService.generateOTP();
      const lspId = isLspReq ? body?.lspId : null;
      const userData: any = {
        masterId,
        phone,
        fcmToken,
        recentDeviceId,
        typeOfDevice,
        otp,
        allPhone,
        isCibilConsent: body.newSignUpFlow ? 1 : 2,
        stage: UserStage.PHONE_VERIFICATION,
        appType,
        lspId,
      };
      if (typeOfDevice === '2') {
        userData.webFcmToken = fcmToken;
        userData.webRecentDeviceId = recentDeviceId;
      } else {
        userData.fcmToken = fcmToken;
        userData.recentDeviceId = recentDeviceId;
      }
      userData.isDeleted = 0;
      if (referralCode && !referralCode?.message)
        userData.referralCode = referralCode;
      let userCreatedData: any;

      if (reqData?.userData) {
        const options = {
          where: {
            id: reqData?.userData.id,
          },
          returning: true,
          raw: true,
          plain: true,
        };
        userCreatedData = await this.repository.updateRowWhereData(
          userData,
          options,
        );
        if (userCreatedData == k500Error) return kInternalError;
        userCreatedData = userCreatedData[1];
      } else {
        userCreatedData = await this.repository.createRowData(userData);
        if (userCreatedData == k500Error) return kInternalError;
      }
      const userId = userCreatedData.id;
      await this.checkAndUpdateDownloadApp(userCreatedData.recentDeviceId);
      await this.registerDevice(userCreatedData);
      await this.masterRepo.updateRowData({ userId }, masterId);

      // Call user or send OTP via sms
      let authType = 'otp';
      if (body?.typeOfDevice != '1')
        authType = body?.authType?.toLowerCase() ?? 'otp';
      if (
        authType != 'call' ||
        this.isBelowAndroid9ForCall(body) == true ||
        GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'SMS'
      ) {
        // Temporary fixes for nbfc app
        if (authType != 'call')
          await this.allsmsService.sendOtp(otp, phone, smsKey);
      }

      body.id = userId;
      await this.addOrupdateDeviceInfo(body);

      this.addAppsFlyerId(userId);
      let finalizedData: any;
      finalizedData = {
        newRegistration: true,
        userData: { id: userId },
        eligibility: kEligibilityFields,
        loginQuestions: kSignupFields,
      };
      if (!body.newSignUpFlow || isLspReq) {
        // Call user or send OTP via sms
        let authType = 'otp';
        if (body?.typeOfDevice != '1')
          authType = body?.authType?.toLowerCase() ?? 'otp';
        if (
          authType != 'call' ||
          this.isBelowAndroid9ForCall(body) == true ||
          GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'SMS'
        ) {
          await this.allsmsService.sendOtp(otp, phone);
        }
        await this.addOrupdateDeviceInfo(body);
        finalizedData = {
          userData: { id: userId },
          showOTPBox: true,
          newRegistration: true,
          type: 'phone',
          otpBoxValue: '+91 ' + this.cryptService.decryptPhone(phone),
        };
        if (
          authType == 'call' &&
          this.isBelowAndroid9ForCall(body) == false &&
          GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'CALL'
        ) {
          const exotelData = this.getExotelVerificationCallData();
          delete finalizedData.showOTPBox;
          delete finalizedData.otpBoxValue;
          finalizedData.durationInMills = 2000;
          finalizedData.timeoutInMills = 60000;
          finalizedData.verificationNumber = exotelData.callId;
          this.exotelService.sendCallReq('91' + phone, {
            callId: exotelData.callId,
            appId: exotelData.appId,
          });
        }
      }
      if (GLOBAL_FLOW.NUMBER_AUTH_IN_APP == 'SMS' && authType == 'call')
        finalizedData.timeoutInMills = 0;
      return finalizedData;
    } catch (error) {
      return kInternalError;
    }
  }

  // Android devices below android 9 getting crashes for call verification
  private isBelowAndroid9ForCall(reqData) {
    try {
      if (reqData.typeOfDevice != '0') return true;
      const authType = reqData?.authType?.toLowerCase() ?? 'otp';
      if (authType != 'call') return false;

      if (authType == 'call' && reqData.deviceInfo) {
        const deviceInfo = JSON.parse(reqData.deviceInfo ?? '{}');
        const sdkVersion = +deviceInfo.sdkInt_version;
        if (!isNaN(sdkVersion) && sdkVersion <= 27) return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async addAppsFlyerId(userId) {
    try {
      const attributes = ['deviceId'];
      const options = { order: [['id', 'DESC']], where: { userId } };
      const deviceData = await this.deviceRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!deviceData) return k422ErrorMessage(kNoDataFound);
      const deviceId = deviceData.deviceId;
      if (!deviceId) return k422ErrorMessage('deviceId not found');

      const appsFlyerId = await this.googleService.appsFlyerDetails({
        deviceId,
      });
      if (appsFlyerId.message) return appsFlyerId;

      // Update user data
      const updatedData = { appsFlyerId };
      const updateResponse = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (updateResponse == k500Error) return kInternalError;

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  //#region  add or update device info
  private async addOrupdateDeviceInfo(body) {
    try {
      const deviceId = body?.recentDeviceId;
      const deviceInfo = body?.deviceInfo;
      const userId = body?.id;
      const appVersion = body?.appVersion;
      if (deviceId && deviceInfo && userId) {
        const data: any = { deviceId, userId };
        if (body.typeOfDevice === '2') {
          data.webDeviceInfo = deviceInfo;
        } else data.deviceInfo = deviceInfo;
        if (appVersion) data.version = appVersion;
        const options = { where: { deviceId, userId } };
        const att = ['id'];
        const find = await this.deviceInfoInstallAppRepo.findOne(att, options);
        if (find && find !== k500Error)
          await await this.deviceInfoInstallAppRepo.update(data, find.id);
        else await await this.deviceInfoInstallAppRepo.create(data);
      }
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  private async registerDevice(body) {
    try {
      const userId = body.id;
      await this.DeviceRepo.update({ isLoggedIn: '0' }, { userId });
      const where = {
        userId,
        deviceId: body.recentDeviceId,
      };
      const res = await this.DeviceRepo.getRowWhereData(['id'], { where });
      if (!res || res == k500Error) {
        const deviceData = {
          deviceId: body.recentDeviceId,
          fcmToken: body.fcmToken,
          typeOfDevice: body.typeOfDevice,
          userId,
        };
        await this.DeviceRepo.create(deviceData);
        await this.removePreviousFcmToken(deviceData.fcmToken, userId);
      }
    } catch (error) {
      return k500Error;
    }
  }

  private async checkAndUpdateDownloadApp(deviceId, type = 'REGISTER') {
    try {
      if (!deviceId) return false;
      const checkIfExits = await this.downloadTrackRepo.getRowWhereData(
        ['id', 'isRegistered'],
        { where: { deviceId } },
      );
      if (
        checkIfExits &&
        checkIfExits != k500Error &&
        !checkIfExits?.isRegistered &&
        type == 'LOGIN'
      ) {
        await this.downloadTrackRepo.updateRowData(
          { isExits: true },
          checkIfExits.id,
        );
      } else if (checkIfExits && type == 'REGISTER') {
        return await this.downloadTrackRepo.updateRowData(
          { isRegistered: true },
          checkIfExits.id,
        );
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async routeDetails(reqData) {
    try {
      // Params validation
      const id = reqData.id;
      if (!id) return kParamMissing('id');

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = [
        'id',
        'loanId',
        'status',
        'miscData',
        'coolOffData',
        'dates',
        'rejection',
        'empId',
        'salarySlipId',
      ];
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = ['id', 'image'];

      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = [
        'maskedAadhaar',
        'maskedPan',
        'panCardNumber',
        'aadhaarNumber',
        'aadhaarAddress',
      ];
      const include = [kycInclude, masterInclude, selfieInclude];
      const attributes = [
        'id',
        'createdAt',
        'email',
        'fullName',
        'image',
        'isBlacklist',
        'interestRate',
        'phone',
        'masterId',
        'typeAddress',
        'gender',
        'fcmToken',
        'stage',
        'stageStatus',
        'isCibilConsent',
        'stageTime',
        'panName',
        'userSelectedGender',
        'referralCode',
        'lastOnlineTime',
        'referralSkip',
        'referredBy',
        'isRedProfile',
        'maybeGoodCibil',
        'completedLoans',
        'appType',
        'typeOfDevice',
      ];
      const options = { include, where: { id } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const token = await this.ifTokenNotSame(userData, reqData);
      if (token) return token;
      userData.isAdminReq = reqData.isAdminReq ?? false;
      userData.ip = reqData.ip;
      return await this.getUserRoute(userData, reqData?.isMigrate ?? false);
    } catch (error) {
      return kInternalError;
    }
  }

  //#region  if token not same then
  async ifTokenNotSame(userData, reqData) {
    try {
      const fcmToken = userData?.fcmToken;
      const newFcmToken = reqData?.fcmToken;

      const isCibilConsent = userData?.isCibilConsent;
      const masterData = userData.masterData;
      if (newFcmToken && fcmToken != newFcmToken)
        return {
          route: kreloginRoute,
          continueRoute: kreloginRoute,
          userData: {},
        };
      if (isCibilConsent == 0 && masterData?.status?.loan != 6)
        return {
          route: kreloginRoute,
          continueRoute: kreloginRoute,
          userData: {},
        };
    } catch (error) {}
  }
  //#endregion

  private async getUserRoute(userDetails, isMigrate: false) {
    try {
      const userId = userDetails.id;
      const masterData = userDetails.masterData;
      if (!masterData) {
        if (!isMigrate) {
          await this.migrationSharedService.migrateTov3({ userId });
          return await this.routeDetails({ id: userId, isMigrate: true });
        }
        return k422ErrorMessage(kNoDataFound);
      }
      // generate referral code if not exist
      if (!userDetails?.referralCode) {
        const referralCode = await this.sharedReferral.getUniqueReferralCode();
        if (referralCode && !referralCode?.message) {
          userDetails.referralCode = referralCode;
          await this.repository.updateRowData({ referralCode }, userId);
        }
      }
      const gender = (userDetails?.gender ?? 'MALE').toUpperCase();
      const userData: any = {
        id: userId,
        name: userDetails.fullName,
        gender,
        isMandateFailed: masterData?.status?.eMandate == 2 ? true : false,
        referralCode: userDetails.referralCode,
        isLoanDetailsPdfAvailable: true,
      };

      const statusData = masterData.status ?? {};

      //for showing NOC request option to user
      let isNOCRequestByUser = false;
      const loanAtr = ['nocURL'];
      const loanOptions = {
        where: {
          userId,
          loanStatus: 'Complete',
        },
        order: [['id', 'DESC']],
      };
      const loanData = await this.loanRepo.getRowWhereData(
        loanAtr,
        loanOptions,
      );
      if (loanData === k500Error) return kInternalError;
      if (loanData) {
        if (!loanData?.nocURL) isNOCRequestByUser = true;
      }

      userData.isNOCRequestByUser = isNOCRequestByUser;
      userData.isCibilConsent = userDetails.isCibilConsent;
      userData.appendText = 'On next loan';
      userData.bannerHeader = 'Reduced rates, increased happieness!';
      userData.needHealthData = HEALTH_DATA;
      userData.canFetchBgNotifications = READ_NOTIFICATION_DATA;
      userData.canFetchScreenTime = SCREEN_TIME_DATA;
      userData.referralHighlight =
        new Date(kReferralLive).getTime() >=
        new Date(userDetails?.lastOnlineTime).getTime();
      // Member since
      userData.memberSince = this.typeService.dateToFormatStr(
        userDetails.createdAt,
      );
      // Phone
      userData.phone = this.cryptService.decryptPhone(userDetails.phone);
      // Selfie
      if ((statusData?.selfie ?? -1) != -1)
        userData.image = userDetails?.selfieData?.image ?? userDetails?.image;
      userData.augmountURL = AUGMOUNT_URL;
      // Masked pan
      userData.maskedPan = userDetails.kycData?.maskedPan;
      if (userDetails?.panName) userData.panName = userDetails?.panName;
      if (userDetails?.userSelectedGender)
        userData.userSelectedGender = userDetails.userSelectedGender;
      // Masked aadhaar
      userData.maskedAadhaar = userDetails.kycData?.maskedAadhaar;
      const kycCompleteDate = masterData?.dates?.aadhaar;
      if (kycCompleteDate) {
        const dueDate = new Date(kycCompleteDate);
        dueDate.setDate(dueDate.getDate() + REKYCDAYS);
        const day = String(dueDate.getDate()).padStart(2, '0');
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const year = dueDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        userData.reKycDate = formattedDate;
      }
      userData.address = userDetails.kycData?.aadhaarAddress
        ? this.typeService.addressFormat(userDetails?.kycData?.aadhaarAddress)
        : '';

      // Delete account restrictions
      userData.deleteAccRestriction = userDetails?.isRedProfile == 2;

      if (statusData.pin == 1) userData.isPinExist = true;
      if (statusData.loan == 6) userData.loanStatusActive = true;
      // Salary Missing Month
      if (statusData.bank == 4 || statusData.bank == 0) {
        const bankData = await this.getBankingData(userData.id);
        if (bankData.message) return bankData;

        const monthlyDetails = bankData?.otherDetails?.salary?.monthlyDetails;
        if (monthlyDetails) {
          const currentDate = new Date();
          const lastDate = new Date(currentDate);
          lastDate.setMonth(lastDate.getMonth() - 1);

          if (currentDate.getDate() < bankData.salaryDate) {
            currentDate.setMonth(currentDate.getMonth() - 1);
            lastDate.setMonth(lastDate.getMonth() - 1);
          }
          const [currentMonthEntry, lastMonthEntry] = monthlyDetails?.reduce(
            ([current, last], entry) => {
              const [day, month, year] = entry.monthYear.split('/').map(Number);
              const entryDate = new Date(year, month - 1);

              const isCurrentMonth =
                entryDate.getMonth() === currentDate.getMonth() &&
                entryDate.getFullYear() === currentDate.getFullYear();
              const isLastMonth =
                entryDate.getMonth() === lastDate.getMonth() &&
                entryDate.getFullYear() === lastDate.getFullYear();

              return [
                isCurrentMonth ? entry : current,
                isLastMonth ? entry : last,
              ];
            },
            [],
          );
          const isSalaryMonthMissing = !currentMonthEntry || !lastMonthEntry;
          userData.isSalaryMonthMissing = isSalaryMonthMissing;
        }
      }

      // #05 Not eligible route
      const notEligibleRoute: any = await this.checkNotEligibleRoute(
        masterData,
        userData,
        userDetails,
      );
      if (notEligibleRoute.message || notEligibleRoute.userData)
        return notEligibleRoute;

      // #01 Basic details route
      const basicDetailsRoute: any = await this.checkBasicDetailsRoute(
        statusData,
        userData,
        userDetails,
      );
      if (basicDetailsRoute.message || basicDetailsRoute.userData)
        return basicDetailsRoute;

      // #03 Personal details route
      const personalDetailsRoute: any = await this.checkPersonalDetailsRoute(
        statusData,
        userData,
        userDetails,
      );
      if (personalDetailsRoute.message || personalDetailsRoute.userData)
        return personalDetailsRoute;

      // sowing cibil score app side
      if (userData.isCibilConsent) {
        const mode = process.env.MODE;
        let cibilScoreData = await this.redisService.get(
          `${mode}_CIBIL_SCORE_DATA_${userId}`,
        );
        if (cibilScoreData === null) {
          let cibilScoreRes = await this.cibilService.funGetUserCibilScoreData({
            userId,
          });

          if (
            !cibilScoreRes?.message &&
            cibilScoreRes?.cibilScore &&
            cibilScoreRes?.cibilScore !== '-'
          ) {
            cibilScoreRes = JSON.stringify(cibilScoreRes);
            await this.redisService.set(
              `${mode}_CIBIL_SCORE_DATA_${userId}`,
              cibilScoreRes,
              86400,
            );
            cibilScoreData = cibilScoreRes;
          }
        }
        cibilScoreData = JSON.parse(cibilScoreData);
        const cibilScore =
          cibilScoreData?.cibilScore === '-'
            ? null
            : cibilScoreData?.cibilScore;
        if (cibilScore > 0) {
          let cibilObj: any = {
            cibilScore: cibilScore,
            colorCode: '',
            remark: '',
          };
          if (cibilScore > 0 && cibilScore <= 599) {
            cibilObj.colorCode = '0xffFF4E60';
            cibilObj.remark = 'High Risk';
          } else if (cibilScore >= 600 && cibilScore <= 649) {
            cibilObj.colorCode = '0xffFF8616';
            cibilObj.remark = 'Doubtful';
          } else if (cibilScore >= 650 && cibilScore <= 699) {
            cibilObj.colorCode = '0xffFCCA4E';
            cibilObj.remark = 'Satisfactory';
          } else if (cibilScore >= 700 && cibilScore <= 749) {
            cibilObj.colorCode = '0xff91C71F';
            cibilObj.remark = 'Good';
          } else if (cibilScore >= 750 && cibilScore <= 900) {
            cibilObj.colorCode = '0xff2BC432';
            cibilObj.remark = 'Excellent';
          }
          userData.cibilObj = cibilObj;
        }
      }
      // #04 Active loan route for rePayment
      const paymentRoute: any = await this.checkPaymentRoute(
        masterData,
        userData,
        userDetails,
      );
      if (paymentRoute.message || paymentRoute.userData) return paymentRoute;

      // #05 Professional details route
      const professionalDetailsRoute: any =
        await this.checkProfessionalDetailsRoute(
          statusData,
          userData,
          userDetails,
        );
      if (professionalDetailsRoute.message || professionalDetailsRoute.userData)
        return professionalDetailsRoute;

      // #06 If user need to set the 4 digit passCode for the security
      const passCodeRoute: any = await this.checkIfNeedToSetPassCode(
        masterData,
        userData,
        userDetails,
      );
      if (passCodeRoute.message || passCodeRoute.userData) return passCodeRoute;

      // #07 Aadhaar verification route
      const aadhaarRoute: any = await this.checkAadhaarVerificationRoute(
        masterData,
        userData,
        userDetails,
      );
      if (aadhaarRoute.message || aadhaarRoute.userData) return aadhaarRoute;

      // #08 Weather user is eligible for loan apply or not
      const reApplyRoute: any = await this.checkReApplyRoute(
        masterData,
        userData,
        userDetails,
      );
      if (reApplyRoute?.userData)
        reApplyRoute.userData.fields = kEmploymentFields;
      if (reApplyRoute.message || reApplyRoute.userData) return reApplyRoute;

      // #09 Employment route
      const empRoute: any = await this.checkEmploymentRoute(
        masterData,
        userData,
        userDetails,
      );
      if (empRoute.message || empRoute.userData) return empRoute;

      // #10 Work email route
      const workEmailRoute: any = await this.checkWorkEmailRoute(
        masterData,
        userData,
        userDetails,
      );
      if (workEmailRoute.message || workEmailRoute.userData)
        return workEmailRoute;

      // #11 Salary slip route
      const salarySlipRoute: any = await this.checkSalarySlipRoute(
        masterData,
        userData,
        userDetails,
      );
      if (salarySlipRoute.message || salarySlipRoute.userData)
        return salarySlipRoute;

      // #12 Selfie route
      const selfieRoute: any = await this.selfieRoute(
        masterData,
        userData,
        userDetails,
      );
      if (selfieRoute.message || selfieRoute.userData) return selfieRoute;

      // #13 Banking route
      const bankingRoute: any = await this.checkBankingRoute(
        masterData,
        userData,
        userDetails,
      );
      if (bankingRoute.message || bankingRoute.userData) return bankingRoute;

      // #14 Residence route
      const residenceRoute: any = await this.checkResidenceRoute(
        statusData,
        userData,
        userDetails,
      );
      if (residenceRoute.message || residenceRoute.userData)
        return residenceRoute;

      // #15 Loan accept route
      const loanAcceptRoute: any = await this.checkLoanAcceptRoute(
        statusData,
        userData,
        userDetails,
      );
      if (loanAcceptRoute.message || loanAcceptRoute.userData)
        return loanAcceptRoute;

      // #16 Reference route
      const referenceRoute: any = await this.checkReferenceRoute(
        masterData,
        userData,
        userDetails,
      );
      if (referenceRoute.message || referenceRoute.userData)
        return referenceRoute;

      // #17 Pan route
      const panRoute: any = await this.checkPanRoute(
        masterData,
        userData,
        userDetails,
      );
      if (panRoute.message || panRoute.userData) return panRoute;

      // #18 Contact route
      const contactRoute: any = await this.checkContactRoute(
        masterData,
        userData,
        userDetails,
      );
      if (contactRoute.message || contactRoute.userData) return contactRoute;

      // #19 Loan application under verification (Pan validation, Final verification automation)
      const loanVerificationRoute: any = await this.checkUnderVerificationRoute(
        statusData,
        userData,
        userDetails,
      );
      if (loanVerificationRoute.message || loanVerificationRoute.userData)
        return loanVerificationRoute;

      // #20 e-Mandate route (Netbanking or debit card)
      const mandateRoute: any = await this.checkMandateRoute(
        masterData,
        userData,
        userDetails,
      );
      if (mandateRoute.message || mandateRoute.userData) return mandateRoute;

      // #21 e-Sign route
      const eSignRoute: any = await this.checkESignRoute(
        masterData,
        userData,
        userDetails,
      );
      if (eSignRoute.message || eSignRoute.userData) return eSignRoute;

      // #22 Disbursement route
      const disbursementRoute: any = await this.checkDisbursementRoute(
        masterData,
        userData,
        userDetails,
      );
      if (disbursementRoute.message || disbursementRoute.userData)
        return disbursementRoute;

      // #Last if user not get any routes
      const lastRoute: any = await this.ifUserNotGetAnyRoutes(
        masterData,
        userData,
        userDetails,
      );
      if (lastRoute.message || lastRoute.userData) return lastRoute;

      return { userData };
    } catch (error) {}
  }

  // #01 Basic details route
  private async checkBasicDetailsRoute(statusData, userData, userDetails) {
    try {
      try {
        if (![-2, 2, 7].includes(statusData.loan ?? -2))
          userData.loanId = userDetails?.masterData?.loanId;
      } catch (error) {}
      // Phone verification
      const phoneStatus = statusData.phone ?? -1;
      if (phoneStatus == -1) {
        const phone = userData.phone;
        return await this.syncUserRouteDetails(
          {
            userData,
            showOTPBox: true,
            type: 'phone',
            otpBoxValue: '+91 ' + phone,
          },
          userDetails,
        );
      }

      // Permission status
      userData.handyDocs = true;
      if (
        userData.isCibilConsent == 2 &&
        userDetails?.masterData?.status?.permission == 1
      ) {
        userData.handyDocs = false;
      }
      const permissionStatus = statusData.permission ?? -1;
      if (
        permissionStatus == -1 ||
        (userData.isCibilConsent == 2 &&
          userDetails?.masterData?.status?.loan != 6)
      ) {
        userData.currentStepTitle = kHandyDocs;
        return await this.syncUserRouteDetails(
          {
            userData,
            continueRoute: kPermissionRoute,
            rootRoute: kPreferenceRoute,
          },
          userDetails,
        );
      }

      // Basic details
      const panStatus = statusData.pan ?? -1;
      const emailStatus = statusData.email ?? -1;
      // Email verified
      userData.email = userDetails.email;
      userData.isEmailVerified = false;
      if (emailStatus == 1) {
        userData.email = userDetails.email;
        userData.isEmailVerified = true;
      }
      if (panStatus == -1) {
        userData.currentStepTitle = kBasicInfo.title;
        userData.currentStepInfo = kBasicInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kBasicDetailsRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #02 Personal details route
  private async checkPersonalDetailsRoute(statusData, userData, userDetails) {
    try {
      if (statusData.basic != 1) return {};
      if (statusData.loan == 6) return {};
      if (statusData.loan == 7 && statusData.personal == 1) return {};
      // For re-apply user
      if (statusData.aadhaar == 1 || statusData.aadhaar == 3) return {};

      if (statusData.personal != 1) {
        const otherInfo = await this.getOtherInfo(userDetails.masterId);
        if (otherInfo.message) return otherInfo;
        userData.dependents = otherInfo.dependents ?? 0;
        userData.spouseName = otherInfo.spouseName ?? '';
        userData.motherName = otherInfo.motherName ?? '';
        userData.maritalInfo = otherInfo.maritalInfo ?? '';
        userData.vehicleInfo = otherInfo.vehicleInfo ?? [];
        userData.educationInfo = otherInfo.educationInfo ?? '';
        userData.residentialInfo = otherInfo.residentialInfo ?? '';
        userData.panNumber = userDetails.kycData?.panCardNumber ?? '';
        userData.purposeId = userDetails.masterData?.miscData?.purposeId;
        userData.currentStepTitle = kPersonalInfo.title;
        userData.currentStepInfo = kPersonalInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kPersonalDetailsRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #03 Professional details route
  private async checkProfessionalDetailsRoute(
    statusData,
    userData,
    userDetails,
  ) {
    try {
      if (statusData.personal != 1) return {};

      if (statusData.professional != 1) {
        const otherInfo = await this.getOtherInfo(userDetails.masterId);
        if (otherInfo.message) return otherInfo;

        // Already existing users
        if (!otherInfo.salaryInfo && otherInfo.employmentInfo) return {};

        userData.dependents = otherInfo.dependents ?? 0;
        userData.spouseName = otherInfo.spouseName ?? '';
        userData.motherName = otherInfo.motherName ?? '';
        userData.maritalInfo = otherInfo.maritalInfo ?? '';
        userData.vehicleInfo = otherInfo.vehicleInfo ?? [];
        userData.educationInfo = otherInfo.educationInfo ?? '';
        userData.residentialInfo = otherInfo.residentialInfo ?? '';
        userData.panNumber = userDetails.kycData?.panCardNumber ?? '';
        userData.purposeId = userDetails.masterData?.miscData?.purposeId;
        userData.currentStepTitle = kProfessionalInfo.title;
        userData.currentStepInfo = kProfessionalInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kProfessionalDetailsRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #04 Active loan route for payment
  private async checkPaymentRoute(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status ?? {};
      const datesData = masterData.dates ?? {};
      const disbursementDate = datesData.disbursement;
      const today = new Date();
      today.setHours(23, 59, 0, 0);
      userData.isPopup = false;
      if (disbursementDate && disbursementDate <= today.getTime()) {
        userData.isPopup = true;
      }
      if (statusData.loan == 6) {
        userData.loanId = masterData.loanId;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kRepaymentRoute },
          userDetails,
        );
      } else return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #05 Not eligible route
  private async checkNotEligibleRoute(masterData, userData, userDetails) {
    try {
      if (masterData.status.loan == 6) return {};

      // Permission status
      if (userDetails?.masterData?.status?.phone == 1) {
        userData.handyDocs = true;
        if (
          userData.isCibilConsent == 2 &&
          userDetails?.masterData?.status?.permission == 1
        ) {
          userData.handyDocs = false;
        }
        const permissionStatus =
          userDetails?.masterData?.status?.permission ?? -1;
        if (
          permissionStatus == -1 ||
          (userData.isCibilConsent == 2 &&
            userDetails?.masterData?.status?.loan != 6)
        ) {
          userData.currentStepTitle = kHandyDocs;
          return await this.syncUserRouteDetails(
            {
              userData,
              continueRoute: kPermissionRoute,
              rootRoute: kPreferenceRoute,
            },
            userDetails,
          );
        }
      }

      /// this condition only for old defulter
      if ((userDetails?.isRedProfile ?? 0) === 2) return {};
      // User blocked
      const isUserBlocked = userDetails.isBlacklist == 1;
      const status = masterData.status;
      const dates = masterData.dates;
      const userId = userDetails?.id;
      const loanId = masterData?.loanId;
      const masterId = masterData?.id;
      const info: any = {
        status,
        dates,
        userId,
        loanId,
        masterId,
        reason: masterData.coolOffData?.reason,
      };
      if (isUserBlocked) {
        // Removing unnecessary details
        if (userData.isEmailVerified) delete userData.isEmailVerified;
        if (userData.email) delete userData.email;
        userData.notEligibleText = kNotEligibleText;
        await this.onlyLoanReject(info);
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNotEligibleRoute },
          userDetails,
        );
      }

      // User cool off
      const coolOffEndsOn = masterData.coolOffData.coolOffEndsOn ?? '';
      if (!coolOffEndsOn) return {};
      const coolOffStartedOn = masterData.coolOffData.coolOffStartedOn ?? '';
      if (!coolOffStartedOn) return {};
      const coolOffEndDate = this.typeService.getGlobalDate(coolOffEndsOn);
      const coolOffStartDate = this.typeService.getGlobalDate(coolOffStartedOn);
      const today = this.typeService.getGlobalDate(new Date());
      // Past date
      if (coolOffEndDate <= today) return {};
      info.coolOffStartDate = coolOffStartDate;
      await this.onlyLoanReject(info);
      const totalDays = this.typeService.dateDifference(
        coolOffEndDate,
        coolOffStartDate,
      );
      const currentDays = this.typeService.dateDifference(
        coolOffStartDate,
        today,
      );

      userData.totalCoolOffDays = totalDays;
      userData.currentCoolOffDays = currentDays;
      userData.notEligibleText = kNotEligibleText;
      // Removing unnecessary details
      if (userData.isEmailVerified) delete userData.isEmailVerified;
      if (userData.email) delete userData.email;
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kNotEligibleRoute },
        userDetails,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  async onlyLoanReject(data) {
    try {
      const status = data.status;
      const dates = data.dates;
      const userId = data?.userId;
      const loanId = data?.loanId;
      const masterId = data?.masterId;
      const reason = data?.reason;
      const verifiedDate = data?.coolOffStartDate
        ? new Date(data?.coolOffStartDate)
        : new Date();
      if (status.loan == -1 && loanId && masterId && userId) {
        const reasonInc = { model: ReasonsEntity, attributes: ['reason'] };
        const userBH = await this.blockUserHistoryRepo.getRowWhereData(
          ['reason', 'blockedBy'],
          { where: { userId }, order: [['id', 'desc']], include: [reasonInc] },
        );
        if (userBH === k500Error) return kInternalError;
        const loanDt = await this.loanRepo.getRowWhereData(
          ['id', 'declineId'],
          { where: { id: loanId } },
        );
        if (loanDt === k500Error) return kInternalError;
        status.eligibility = 2;
        status.loan = 2;
        dates.eligibility = new Date(verifiedDate).getTime();
        dates.loan = new Date(verifiedDate).getTime();
        const remark =
          reason ??
          userBH?.reason ??
          userBH?.reasonData?.reason ??
          kInactiveUser;
        const loanUp: any = {
          loanStatus: 'Rejected',
          manualVerification: '2',
          manualVerificationAcceptId: userBH?.blockedBy ?? SYSTEM_ADMIN_ID,
          verifiedDate: verifiedDate.toJSON(),
        };
        if (!loanDt?.declineId) loanUp.remark = remark;
        await this.loanRepo.updateRowData(loanUp, loanId);
        await this.masterRepo.updateRowData({ status, dates }, masterId);
      }
    } catch (error) {}
  }

  // #06 If user need to set the 4 digit passCode for the security
  private async checkIfNeedToSetPassCode(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status ?? {};
      if (statusData.professional != 1) {
        // For existing users
        if (statusData.basic != 1) return {};
      }

      if (statusData.pin != 1) {
        userData.currentStepTitle = kSetPassCode;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kSetPassCodeRoute },
          userDetails,
        );
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #07 Aadhaar verification
  private async checkAadhaarVerificationRoute(
    masterData,
    userData,
    userDetails,
  ) {
    try {
      const statusData = masterData.status ?? {};
      if (statusData.pin != 1) return {};

      const aadhaarStatus = statusData.aadhaar ?? -1;
      if (aadhaarStatus == -1 || aadhaarStatus == 5) {
        userData.currentStepTitle = kKYCInfo.title;
        userData.currentStepInfo = kKYCInfo.info;
        const aadhaar_service = await this.commonSharedService.getServiceName(
          kAadhaarService,
        );
        userData.aadhaar_service = aadhaar_service;
        userData.change_service_in_second = 30;

        if (aadhaar_service == EnvConfig.nbfc.appName) {
          userData.webviewData = getmAadhaarData(userData.id);
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kWebviewRoute },
            userDetails,
          );
        } else {
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kAddAadhareNumberRoute },
            userDetails,
          );
        }
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #08 Weather user is eligible for loan apply or not
  private async checkReApplyRoute(existingMasterData, userData, userDetails) {
    const statusData = existingMasterData.status ?? {};

    const submitStatus = [0, 1, 3, 4];
    const empData = await this.getEmpDetails(userDetails.id);
    if (empData.message) return empData;
    const companyName = empData?.companyName ?? '';
    userData.companyName = companyName;

    // Not a single time employment was given (v2 users)
    if (statusData.company === -1 && statusData.loan === 2) {
      const empOptions = { where: { userId: userDetails.id } };
      const count = await this.repoManager.getCountsWhere(
        employmentDetails,
        empOptions,
      );
      if (count === k500Error) throw new Error();
      if (count === 0) return {};
    }

    if (statusData.loan === 2 && statusData.workMail == 2) {
      // Work mail rejection flow
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kReApplyRoute },
        userDetails,
      );
    }

    if (
      statusData.loan != 2 &&
      statusData.loan != 7 &&
      submitStatus.includes(statusData.workMail)
    ) {
      // Check salary slip for re-apply
      const miscData = existingMasterData.miscData ?? {};
      if (miscData.needSalarySlip && miscData.nextLoanPurposeId) {
        userData.needSalarySlip = true;
        const empData = await this.getEmpDetails(userDetails.id);
        if (empData.message) return empData;
        const companyName = empData?.companyName ?? '';
        if (!companyName) return {};
        userData.companyName = companyName;
        userData.workEmail = empData.workMail?.email ?? '';
        userData.purposeId = miscData.nextLoanPurposeId;
        userData.isCompanyVerified = true;
        if (userData.workEmail) userData.isWorkMailVerified = true;
        else userData.isWorkMailSkipped = true;
        const attributes = ['id', 'otherInfo'];
        const options = { where: { id: userDetails.masterId } };
        const masterData = await this.masterRepo.getRowWhereData(
          attributes,
          options,
        );
        if (masterData == k500Error) return kInternalError;
        if (!masterData) return k422ErrorMessage(kNoDataFound);
        // For user registered before app v3 flow went live
        if (
          masterData.otherInfo.employmentInfo == '' ||
          masterData.otherInfo.salaryInfo == 0
        )
          userData.needSalaryInfo = true;
        if (statusData.personal == -1) userData.needPersonalDetails = true;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kReApplyRoute },
          userDetails,
        );
      } else return {};
    }

    if (statusData.loan != 2 && statusData.loan != 7 && statusData.loan != -1)
      return {};
    // For the first attempt of loan we don't need to send reApply route to the frontend app
    const totalLoanCounts = await this.getTotalLoanCounts(userDetails.id);
    if (totalLoanCounts?.message) return totalLoanCounts;
    if (totalLoanCounts <= 1 && statusData.loan == -1) return {};
    // Get data
    const empInclude: any = { model: employmentDetails };
    empInclude.attributes = ['companyName'];
    const workMailInclude: any = { model: WorkMailEntity };
    workMailInclude.attributes = ['email'];
    workMailInclude.required = false;
    if (statusData.workMail != 4) empInclude.include = workMailInclude;
    const salarySlipInclude: any = { model: SalarySlipEntity };
    salarySlipInclude.required = false;
    salarySlipInclude.attributes = ['salarySlipDate'];
    const loanInclude: any = { model: loanTransaction };
    loanInclude.required = false;
    loanInclude.attributes = ['id', 'loanStatus'];
    const workMailIncludeNew: any = { model: WorkMailEntity };
    workMailIncludeNew.attributes = ['email'];
    workMailIncludeNew.required = false;
    const include = [empInclude, salarySlipInclude, loanInclude];
    if (statusData.workMail != 4) include.push(workMailIncludeNew);
    const attributes = ['id', 'otherInfo'];
    const options = { include, where: { id: userDetails.masterId } };
    const masterData = await this.masterRepo.getRowWhereData(
      attributes,
      options,
    );
    if (masterData == k500Error) return kInternalError;
    if (!masterData) return k422ErrorMessage(kNoDataFound);
    userData.companyName = masterData.empData?.companyName ?? '';
    userData.workEmail = masterData.workMailData?.email;
    if (!userData?.workEmail)
      userData.workEmail = masterData?.empData?.workMail?.email;
    // In case user started new loan, submitted purpose and kill the app
    if (statusData.loan != 2 && statusData.loan != 7) {
      let purposeId = existingMasterData.miscData.purposeId;
      if (purposeId == 0)
        purposeId = existingMasterData.miscData.nextLoanPurposeId ?? 0;
      if (purposeId != 0) userData.purposeId = purposeId;
    }

    // Checks whether requires new salary slip or not
    const salarySlipData = masterData.salarySlipData ?? {};
    let salarySlipDate =
      salarySlipData.salarySlipDate ?? '1970-01-01' + kGlobalTrail;
    salarySlipDate = new Date(salarySlipDate);
    const today = this.typeService.getGlobalDate(new Date());
    const diffInDays = this.typeService.dateDifference(today, salarySlipDate);
    if (
      diffInDays > GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS ||
      !existingMasterData?.salarySlipId
    )
      userData.needSalarySlip = true;

    // For user registered before app v3 flow went live
    if (
      masterData.otherInfo.employmentInfo == '' ||
      masterData.otherInfo.salaryInfo == 0
    )
      userData.needSalaryInfo = true;
    if (statusData.personal == -1) userData.needPersonalDetails = true;
    if (statusData.workMail == 2 && !userData?.needSalaryInfo) return {};
    const loanStatus = masterData?.loanData?.loanStatus;
    if (
      totalLoanCounts > 1 &&
      ((loanStatus == 'InProcess' && statusData.workMail == -1) ||
        (loanStatus == 'InProcess' && statusData.salarySlip == -1))
    )
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kReApplyRoute },
        userDetails,
      );

    if (loanStatus == 'InProcess') {
      return await this.funCheckWorkEmailOrSalarySlip(
        existingMasterData,
        userData,
        userDetails,
        true,
        false,
      );
    }
    return await this.syncUserRouteDetails(
      { userData, continueRoute: kReApplyRoute },
      userDetails,
    );
  }

  // #09 Employment details route
  private async checkEmploymentRoute(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status ?? {};
      if (statusData.aadhaar == -1) return {};

      const companyStatus = statusData.company ?? -1;
      // Pending from user
      if (companyStatus == -1) {
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        userData.fields = kEmploymentFields;

        return await this.syncUserRouteDetails(
          { userData, continueRoute: kEmploymentRoute },
          userDetails,
        );
      }

      // Pending from user after rejection
      if (companyStatus == 2) {
        userData.dashboardInfo = masterData.rejection.company ?? '';
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        userData.fields = kEmploymentFields;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kEmploymentRoute },
          userDetails,
        );
      } else if (companyStatus == 1) {
        return await this.funCheckWorkEmailOrSalarySlip(
          masterData,
          userData,
          userDetails,
          false,
          true,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async funCheckWorkEmailOrSalarySlip(
    masterData,
    userData,
    userDetails,
    callFromReapply,
    callFromEmployement,
  ) {
    try {
      const isWorkEmailOrSalarySlipUI = true;
      userData.isWorkEmailOrSalarySlipUI = isWorkEmailOrSalarySlipUI;
      let continueRoute = null;
      if (callFromReapply) {
        continueRoute = kReApplyRoute;
      }
      if (callFromEmployement) {
        continueRoute = kEmploymentRoute;
      }
      const statusData = masterData.status ?? {};
      if (statusData.company == -1) return {};

      const empData = await this.getEmpDetails(userDetails.id);
      if (empData.message) return empData;
      const companyName = empData?.companyName ?? '';
      if (!companyName) return {};
      userData.companyName = companyName;

      const submitStatuses = [0, 1, 3];
      // Pending from user
      if (statusData.workMail == -1 || statusData.salarySlip == -1) {
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;

        return await this.syncUserRouteDetails(
          { userData, continueRoute: continueRoute },
          userDetails,
        );
      } else if (statusData.workMail == 5) {
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        const finalizedData: any = {
          userData,
          continueRoute: continueRoute,
        };
        return await this.syncUserRouteDetails(finalizedData, userDetails);
      } else if (statusData.workMail == 2) {
        userData.dashboardInfo = masterData.rejection.workMail;
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: continueRoute },
          userDetails,
        );
      } else if (statusData.salarySlip == 2) {
        userData.loanId = userDetails.masterData.loanId;
        userData.dashboardInfo = masterData.rejection.salarySlip;

        // Get data
        const workMailInclude: any = { model: WorkMailEntity };
        workMailInclude.attributes = ['email'];
        const salarySlipInclude: any = { model: SalarySlipEntity };
        salarySlipInclude.required = false;
        salarySlipInclude.attributes = ['salarySlipDate'];
        const include = [workMailInclude, salarySlipInclude];
        const attributes = ['id', 'otherInfo'];
        const options = { include, where: { id: userDetails.masterId } };
        const targetMasterData = await this.masterRepo.getRowWhereData(
          attributes,
          options,
        );
        if (targetMasterData == k500Error) return kInternalError;
        if (!targetMasterData) return k422ErrorMessage(kNoDataFound);
        userData.workEmail = targetMasterData.workMailData?.email;

        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: continueRoute },
          userDetails,
        );
      } else if (submitStatuses.includes(statusData.bank)) {
        if (
          statusData.workMail == 0 ||
          statusData.salarySlip == 0 ||
          statusData.company == 0
        ) {
          userData.currentStepTitle = kVerificationInfo.title;
          userData.currentStepInfo = kVerificationInfo.info;
          return await this.syncUserRouteDetails(
            {
              userData,
              continueRoute: kNoRoute,
            },
            userDetails,
          );
        }
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #11 Work email route
  private async checkWorkEmailRoute(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status ?? {};
      if (statusData.company == -1) return {};

      // Pending from user
      if (statusData.workMail == -1) {
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kWorkEmailRoute },
          userDetails,
        );
      } else if (statusData.workMail == 5) {
        userData.currentStepTitle = kWorkMailInfo.title;
        userData.currentStepInfo = kWorkMailInfo.info;
        const finalizedData: any = {
          userData,
          continueRoute: kWorkEmailRoute,
        };
        return await this.syncUserRouteDetails(finalizedData, userDetails);
      } else if (statusData.workMail == 2) {
        userData.dashboardInfo = masterData.rejection.workMail;
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kWorkEmailRoute },
          userDetails,
        );
      } else if (statusData.workMail == 0) {
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #12 Salary slip route
  private async checkSalarySlipRoute(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status;
      if (statusData.workEmail == -1) return {};
      const submitStatuses = [0, 1, 3];
      // Pending from user
      if (statusData.salarySlip == -1 || statusData.salarySlip == 2) {
        userData.loanId = userDetails.masterData.loanId;
        if (statusData.workMail == 4) userData.isWorkMailSkipped = true;
        if (
          statusData.workMail == 1 ||
          statusData.workMail == 3 ||
          statusData.workMail == 0
        )
          userData.isWorkMailVerified = true;
        userData.currentStepTitle = kEmploymentInfo.title;
        userData.currentStepInfo = kEmploymentInfo.info;
        // Rejection from admin
        if (statusData.salarySlip == 2)
          userData.dashboardInfo = masterData.rejection.salarySlip;

        // Get data
        const empInclude: any = { model: employmentDetails };
        empInclude.attributes = ['companyName'];
        const workMailInclude: any = { model: WorkMailEntity };
        workMailInclude.attributes = ['email'];
        const salarySlipInclude: any = { model: SalarySlipEntity };
        salarySlipInclude.required = false;
        salarySlipInclude.attributes = ['salarySlipDate'];
        const include = [empInclude, salarySlipInclude];
        const attributes = ['id', 'otherInfo'];
        const options = { include, where: { id: userDetails.masterId } };
        const targetMasterData = await this.masterRepo.getRowWhereData(
          attributes,
          options,
        );
        if (targetMasterData == k500Error) return kInternalError;
        if (!targetMasterData) return k422ErrorMessage(kNoDataFound);

        userData.companyName = targetMasterData.empData?.companyName ?? '';
        userData.workEmail = targetMasterData.workMailData?.email;

        return await this.syncUserRouteDetails(
          {
            userData,
            continueRoute: kSalarySlipRoute,
          },
          userDetails,
        );
      } else if (submitStatuses.includes(statusData.bank)) {
        if (
          statusData.workMail == 0 ||
          statusData.salarySlip == 0 ||
          statusData.company == 0
        ) {
          userData.currentStepTitle = kVerificationInfo.title;
          userData.currentStepInfo = kVerificationInfo.info;
          return await this.syncUserRouteDetails(
            {
              userData,
              continueRoute: kNoRoute,
            },
            userDetails,
          );
        }
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #13 Banking route
  private async checkBankingRoute(masterData, userData, userDetails) {
    userData.loanId = userDetails?.masterData?.loanId;
    const statusData = masterData.status ?? {};
    if (statusData.salarySlip == -1 || statusData.workEmail == -1) return {};

    // No statement uploaded
    if (statusData.bank == -1) {
      userData.currentStepTitle = kStatementInfo.title;
      userData.currentStepInfo = kStatementInfo.info;

      // Get data
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = ['companyName', 'salary'];
      const include = [empInclude];
      const attributes = ['id'];
      const options = { include, where: { id: userDetails.masterId } };
      const rowData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (rowData == k500Error) return kInternalError;
      if (!rowData) return k422ErrorMessage(kNoDataFound);
      userData.companyName = rowData.empData?.companyName ?? '';
      userData.salary = parseInt(
        (+(rowData.empData?.salary ?? '0').toString()).toFixed(),
      );

      // Check banner eligibility
      await this.needInterestRateBanner(userData, userDetails.interestRate);
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kBankingRoute },
        userDetails,
      );
    }

    // Statement upload but some info is missing from user side
    if (statusData.bank == 4) {
      let continueRoute = kNoRoute;
      const bankData = await this.getBankingData(userData.id);
      if (bankData.message) return bankData;
      userData.loanId = masterData.loanId;

      // Missing particular month
      if (bankData.dataOfMonth && bankData?.dataOfMonth.includes('false')) {
        const empInclude: any = { model: employmentDetails };
        empInclude.attributes = ['companyName', 'salary'];
        const include = [empInclude];
        const attributes = ['id'];
        const options = { include, where: { id: userDetails.masterId } };
        const rowData = await this.masterRepo.getRowWhereData(
          attributes,
          options,
        );
        if (rowData == k500Error) return kInternalError;
        if (!rowData) return k422ErrorMessage(kNoDataFound);
        userData.companyName = rowData.empData?.companyName ?? '';
        userData.salary = parseInt(
          (+(rowData.empData?.salary ?? '0').toString()).toFixed(),
        );

        userData.bankCode = bankData.bank;
        userData.missingDataOfMonth = bankData.dataOfMonth;
        continueRoute = kMissingMonthRoute;
        userData.currentStepTitle = kStatementInfo.title;
        userData.currentStepInfo = kStatementInfo.info;
      }
      // User need to tag salary
      else if (bankData.isNeedTagSalary == '0') {
        const otherInfo = await this.getOtherInfo(userDetails.masterId);
        if (otherInfo.message) return otherInfo;
        userData.accNumber = bankData.accountNumber;
        userData.salary = +otherInfo.salaryInfo;
        if (!userData?.salary) {
          try {
            const option = { where: { userId: userData.id } };
            const att = ['salary'];
            const empData = await this.empRepo.getRowWhereData(att, option);
            if (empData?.salary)
              userData.salary = parseInt(
                (+(empData?.salary ?? '0').toString()).toFixed(),
              );
          } catch (error) {}
        }
        userData.currentStepTitle = kTagSalaryInfo.title;
        userData.currentStepInfo = kTagSalaryInfo.info;
        continueRoute = kIsNeedTagSalaryRoute;
      }
      // Awaiting response from account aggregator
      else if (bankData.consentTxnId || bankData.aaDataStatus === 1) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        continueRoute = kNoRoute;
      }
      // Masked account route
      else if (
        bankData.accountNumber?.includes('x') ||
        bankData.accountNumber?.includes('*')
      ) {
        userData.accNumber = bankData.accountNumber
          .replace(bankData.bank?.toLowerCase(), '')
          .replace(bankData.bank?.toUpperCase(), '');
        userData.currentStepTitle = kAccountInfo.title;
        userData.currentStepInfo = kAccountInfo.info;
        userData.ifscCode = bankData.ifsCode ?? '0';
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kAddAccountNumberRoute },
          userDetails,
        );
      }
      // IFSC route
      else if (bankData.ifsCode == '0') {
        userData.accNumber = bankData.accountNumber;
        userData.currentStepTitle = kIFSCInfo.title;
        userData.currentStepInfo = kIFSCInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kAddIFSCRoute },
          userDetails,
        );
      }

      return await this.syncUserRouteDetails(
        { userData, continueRoute },
        userDetails,
      );
    }

    const submitStatuses = [0, 1, 3];
    if (submitStatuses.includes(statusData.bank)) {
      if (statusData.loan == -1) {
        const bankData = await this.getBankingData(userData.id);
        if (bankData.message) return bankData;

        // Masked account route
        if (
          bankData.accountNumber?.includes('x') ||
          bankData.accountNumber?.includes('*')
        ) {
          userData.accNumber = bankData.accountNumber
            .replace(bankData.bank?.toLowerCase(), '')
            .replace(bankData.bank?.toUpperCase(), '');
          userData.currentStepTitle = kAccountInfo.title;
          userData.currentStepInfo = kAccountInfo.info;
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kAddAccountNumberRoute },
            userDetails,
          );
        }

        // IFSC route
        if (bankData.ifsCode == '0') {
          userData.accNumber = bankData.accountNumber;
          userData.currentStepTitle = kIFSCInfo.title;
          userData.currentStepInfo = kIFSCInfo.info;
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kAddIFSCRoute },
            userDetails,
          );
        }
      }

      // Manual verification
      if (statusData.bank == 0) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }
    }

    // Rejected by admin
    if (statusData.loan != 2 && statusData.bank == 2) {
      userData.dashboardInfo = masterData.rejection.banking;
      userData.currentStepTitle = kStatementInfo.title;
      userData.currentStepInfo = kStatementInfo.info;
      // Get data
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = ['companyName', 'salary'];
      const include = [empInclude];
      const attributes = ['id'];
      const options = { include, where: { id: userDetails.masterId } };
      const rowData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (rowData == k500Error) return kInternalError;
      if (!rowData) return k422ErrorMessage(kNoDataFound);
      userData.companyName = rowData.empData?.companyName ?? '';
      userData.salary = parseInt(
        (+(rowData.empData?.salary ?? '0').toString()).toFixed(),
      );
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kBankingRoute },
        userDetails,
      );
    }

    return {};
  }

  // Check banner eligibility
  private async needInterestRateBanner(userData, interestRate: number) {
    if (!userData.id) return;

    const loanAttr = ['interestRate'];
    const loanOptions = {
      order: [['id', 'DESC']],
      where: { loanStatus: 'Complete', userId: userData.id },
    };
    const previousLoanDetails = await this.loanRepo.getRowWhereData(
      loanAttr,
      loanOptions,
    );
    // No need to show error to user
    if (!previousLoanDetails || previousLoanDetails == k500Error) return;
    if (!previousLoanDetails.interestRate) return;
  }

  // #14 Residence route
  private async checkResidenceRoute(statusData, userData, userDetails) {
    try {
      if (!GLOBAL_FLOW.RESIDENCE_IN_APP) return {};
      const bank = statusData.bank;
      const residence = statusData.residence;
      const submitStatuses = [1, 3];
      if (!submitStatuses.includes(bank)) return {};
      if (submitStatuses.includes(residence)) return {};
      // go to next rout if cibil address selection completed
      if (residence == 7) return {};

      // return cibil address selection route
      if (userData.isCibilConsent == 1) {
        const scoreAttributes = ['id', 'cibilScore'];
        const scoreOptions = {
          order: [['id', 'DESC']],
          where: {
            type: '1',
            status: '1',
            userId: userData.id,
            cibilScore: { [Op.gt]: 1 },
          },
        };
        const scoreData = await this.cibilScoreRepo.getRowWhereData(
          scoreAttributes,
          scoreOptions,
        );
        if (scoreData == k500Error) return kInternalError;

        if (scoreData?.cibilScore) {
          userData.currentStepTitle = kResidenceTypeInfo.title;
          userData.currentStepInfo = kResidenceTypeInfo.info;
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kCibilAddressRoute },
            userDetails,
          );
        }
      }

      if (statusData.loan == -1 && !userDetails?.typeAddress) {
        const isLocationNotFetched = await this.isLocationNotFetched(
          userDetails.id,
        );
        if (!isLocationNotFetched) {
          userData.currentStepTitle = kResidenceTypeInfo.title;
          userData.currentStepInfo = kResidenceTypeInfo.info;
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kTypeAddressRoute },
            userDetails,
          );
        }
      }

      // Type address
      if (statusData.residence == 5 || statusData.residence == -1) {
        userData.currentStepTitle = kResidenceTypeInfo.title;
        userData.currentStepInfo = kResidenceTypeInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kTypeAddressRoute },
          userDetails,
        );
      }

      // e-Commerce
      if (statusData.residence == 6) {
        userData.currentStepTitle = kResidenceAutomationInfo.title;
        userData.currentStepInfo = kResidenceAutomationInfo.info;
        userData.residenceAutomationModes =
          kGetResidenceAutomationOptions(userDetails);
        userData.loanId = userDetails.masterData?.loanId;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kAutomateResidenceRoute },
          userDetails,
        );
      }

      // Proof
      if (statusData.residence == 4) {
        userData.currentStepTitle = kResidenceProofInfo.title;
        userData.currentStepInfo = kResidenceProofInfo.info;
        userData.loanId = userDetails.masterData?.loanId;
        userData.typeAddress = this.formateTypeAddress(
          userDetails?.typeAddress,
        );
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kSubmitResidenceProofRoute },
          userDetails,
        );
      }

      // Manual verification
      if (statusData.residence == 0) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      } // Rejected by admin
      else if (statusData.residence == 2) {
        userData.dashboardInfo = userDetails.masterData?.rejection.residence;
        userData.currentStepTitle = kResidenceProofInfo.title;
        userData.currentStepInfo = kResidenceProofInfo.info;
        userData.typeAddress = this.formateTypeAddress(
          userDetails?.typeAddress,
        );
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kSubmitResidenceProofRoute },
          userDetails,
        );
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  //#region formate type address
  private formateTypeAddress(typeAddress) {
    let text = '';
    try {
      const data = JSON.parse(typeAddress);
      text = data['Flat / Block number'] + ', ';
      text += data['Society name'] + ', ';
      text += data['Landmark'];
    } catch (error) {}
    return text;
  }
  //#endregion

  // #15 Loan accept route
  private async checkLoanAcceptRoute(statusData, userData, userDetails) {
    try {
      if (statusData.loan != -1) return {};

      const approvedStatus = [1, 3, 4, 7, 8];
      const isApprovedEmp =
        approvedStatus.includes(statusData.company) &&
        approvedStatus.includes(statusData.workMail) &&
        approvedStatus.includes(statusData.salarySlip);
      const isApprovedBankStatement = approvedStatus.includes(statusData.bank);
      const isResidence = approvedStatus.includes(statusData.residence);
      const isSelfieApproved = approvedStatus.includes(statusData.selfie);
      if (
        isApprovedEmp &&
        isApprovedBankStatement &&
        isResidence &&
        isSelfieApproved
      ) {
        const bankingData = await this.getBankingData(userData.id);
        if (bankingData.message) return bankingData;

        const bank = await this.bankListRepo.getRowWhereData(['bankName'], {
          where: { bankCode: bankingData?.bank },
        });
        if (bank?.bankName) {
          const bankId = await this.bankRepo.getRowWhereData(['id'], {
            where: { name: { [Op.iLike]: `%${bank.bankName}%` } },
          });
          if (bankId?.id) userData.bankId = bankId.id;
        }
        userData.accNumber = bankingData.accountNumber;
        userData.ifscCode = bankingData.ifsCode;
        const loanId = userDetails.masterData.loanId;
        userData.loanId = loanId;
        const loan = await this.loanRepo.getRowWhereData(
          ['id', 'loanAmount', 'approvedLoanAmount', 'emiSelection'],
          { where: { id: loanId } },
        );
        if (loan === k500Error) return kInternalError;
        const approvedAmount = +(
          loan?.approvedLoanAmount ??
          loan?.loanAmount ??
          0
        );
        userData.approvedAmount = approvedAmount;
        userData.amountSliderSlab = GLOBAL_RANGES.SLIDER_AMOUNT_SLAB;
        // const score = await this.sharedEligibility.getAmountRange(
        //   userData.loanId,
        //   statusData,
        // );
        // if (score.message) return score;
        // userData.score = score;
        const emiSelectedDate =
          loan?.emiSelection?.selectedEmiDate ?? bankingData?.salaryDate ?? 1;
        userData.emiSelectedDate = emiSelectedDate;
        userData.calenderData =
          this.commonSharedService.getCalenderDataForEMI(emiSelectedDate);
        const manualSalaryData: any =
          await this.sharedEmi.checkIfUserCanSelectEmiDate(
            loanId,
            bankingData?.salaryDate,
          );
        userData.eligibleEmiDates =
          loan?.emiSelection?.eligibleEmiDates ??
          manualSalaryData.eligibleEmiDates;
        userData.showCalendar = manualSalaryData.showCalendar ?? false;
        userData.forcefullEmiSelection = manualSalaryData.canSelectEmiDate
          ? true
          : false;
        userData.nomineeDetailsTag = nomineeDetailsTag;
        userData.currentStepTitle = kLoanAcceptInfo.title;
        userData.currentStepInfo =
          kLoanAcceptInfo.info +
          Math.floor(approvedAmount).toString() +
          '##. Accept the loan to proceed further.';
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kSelectLoanAmountRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #16 Reference route
  private async checkReferenceRoute(masterData, userData, userDetails) {
    try {
      if (!GLOBAL_FLOW.REFERENCE_IN_APP) return {};

      if (masterData.status.loan != 4) {
        if (masterData.status.contact != 2 && masterData.status.reference != 2)
          return {};
      }
      const statusRef = masterData.status.reference;
      const approved = [1, 3, 4];
      if (approved.includes(statusRef)) return {};

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + CONTACT_REFERENCE_LIMIT);
      const formattedDate = this.typeService.dateToJsonStr(
        futureDate,
        'DD/MM/YYYY',
      );
      const consentTxt = `I agree that my reference details can be used for my future loans until ${formattedDate}`;
      userData.loanId = masterData.loanId;

      userData.currentStepTitle = kReferenceInfo.title;
      userData.currentStepInfo = kReferenceInfo.info;
      userData.consent = consentTxt;
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kReferenceRoute },
        userDetails,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  // #17 Pan route
  private async checkPanRoute(masterData, userData, userDetails) {
    try {
      // Re upload pan
      if (masterData.status.pan == 6 || masterData.status.pan == 2) {
        if (masterData.status.pan == 2)
          userData.dashboardInfo = userDetails.masterData?.rejection.pan;
        userData.currentStepTitle = kReUploadPanInfo.title;
        userData.currentStepInfo = kReUploadPanInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kReuploadPanRoute },
          userDetails,
        );
      }

      // Pan verification (Admin)
      if (masterData.status.pan == 0) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #18 contact route
  private async checkContactRoute(masterData, userData, userDetails) {
    try {
      if (masterData.status.contact == 0) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #19 Loan application under verification (Pan validation, Selfie validation, Final verification automation) or manual admin approval
  private async checkUnderVerificationRoute(statusData, userData, userDetails) {
    try {
      if (statusData.selfie == 0) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = kVerificationInfo.info;
        return await this.syncUserRouteDetails(
          {
            userData,
            continueRoute: kNoRoute,
          },
          userDetails,
        );
      }
      if (
        statusData.reference != 1 &&
        statusData.reference != 3 &&
        statusData.reference != 4
      )
        return {};
      if (statusData.loan != 5 && statusData.loan != 0) return {};

      userData.currentStepTitle = kVerificationInfo.title;
      userData.currentStepInfo = kVerificationInfo.info;
      return await this.syncUserRouteDetails(
        { userData, continueRoute: kNoRoute },
        userDetails,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  // #20 e-Mandate route (Netbanking or debit card)
  private async checkMandateRoute(masterData, userData, userDetails) {
    try {
      if (masterData.status.loan != 1 && masterData.status.loan != 3) return {};
      const appType = userDetails?.appType ?? userDetails?.apptype;
      // Mandate generation pending from user side
      if (masterData.status.eMandate == -1) {
        const bankData = await this.getBankingData(userData.id);
        if (bankData.message) return bankData;
        userData.mandateAcc = bankData.mandateAccount ?? '';
        userData.ifscCode = bankData.mandateIFSC ?? '';
        userData.loanId = masterData.loanId;
        userData.bankName = (bankData.mandateBank ?? '').replace(/_/g, ' ');
        userData.currentStepTitle = keMandateInfo.title;
        userData.currentStepInfo = keMandateInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kMandateRoute },
          userDetails,
        );
      }

      // Mandate registration pending from user side
      if (masterData.status.eMandate == 5 || masterData.status.eMandate == 0) {
        userData.loanId = masterData.loanId;
        const subscriptionData = await this.getSubscriptionData(
          userData.loanId,
        );
        if (subscriptionData.message) return subscriptionData;
        if (subscriptionData.mode == kRazorpay) {
          const webviewData = getMandateData(
            userData.loanId.id,
            userData.loanId,
          );
          const res = JSON.parse(subscriptionData.response);
          if (subscriptionData?.invitationLink)
            webviewData.initialURL = subscriptionData.invitationLink;
          else {
            const htmlData = await this.fileService.hbsHandlebars(
              'views/razorpayMandate.hbs',
              {
                name: EnvConfig.nbfc.nbfcName,
                key: kRazorpayM2Auth.username,
                customer_id: subscriptionData.subscriptionId,
                order_id: res?.id,
                callbackUrl:
                  userDetails.typeOfDevice == '2'
                    ? appType == 0
                      ? nRazorpayMandateWebCallbackLenditt
                      : nRazorpayMandateWebCallbackNbfc1
                    : nRazorpayMandateAppCallback,
              },
            );
            webviewData.initialHTMLData = htmlData;
            /// this make for flutter web only
            webviewData.initialURL = INVITATION_MANDATE_URL + userData.id;
          }
          webviewData['launchURL'] = true;
          userData.webviewData = webviewData;
          userData.webviewData.showLink = true;
          userData.webviewData.linkTitle = 'Complete E-mandate in browser';
        } else
          userData.webviewData = getSubscriptionData(
            userData.id,
            userData.loanId,
            subscriptionData.invitationLink,
          );
        userData.currentStepTitle = keMandateInfo.title;
        userData.currentStepInfo = keMandateInfo.info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kWebviewRoute },
          userDetails,
        );
      }

      // Mandate registration failed from NPCI
      if (masterData.status.eMandate == 2) {
        const subscriptionData = await this.getSubscriptionData(
          userData.loanId,
        );
        if (subscriptionData.message) return subscriptionData;
        const diffMin = this.typeService.dateDifference(
          subscriptionData?.updatedAt,
          new Date(),
          'Minutes',
        );
        const diffTime = 15 - diffMin;
        await this.sharedMandate.autoDeleteMandate(
          subscriptionData.updatedAt,
          userData.loanId,
        );
        const rawResponse = subscriptionData.response;
        if (!rawResponse) return {};
        const response = JSON.parse(rawResponse);
        if (!response.errorMsg) return {};
        const info = keMandateFailedInfo.info.replace(
          '15',
          diffTime.toString(),
        );
        userData.dashboardInfo = userDetails.masterData?.rejection.eMandate;
        userData.mandateWaiting = diffTime;
        userData.currentStepTitle = keMandateFailedInfo.title;
        userData.currentStepInfo = info;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #21 e-Sign route
  private async checkESignRoute(masterData, userData, userDetails) {
    try {
      if (masterData.status.eMandate != 1) return {};
      const eSign = masterData.status.eSign;
      userData.canDeleteAccount = (eSign ?? -1) < 0;
      if (eSign == -1 || eSign == 0) {
        userData.loanId = masterData.loanId;
        const dateDiff = this.typeService.dateDifference(
          new Date(masterData.miscData.lastLocationDateTime),
          new Date(),
          'Hours',
        );
        let needLocation = false;
        if (
          dateDiff > 1 ||
          masterData.miscData.locationStage !== UserStage.ESIGN
        )
          needLocation = true;
        userData.needLocation = needLocation;
        const ESignData = await this.getESignData(userData.loanId);
        if (ESignData?.message) return ESignData;
        const mode = await this.commonSharedService.getServiceName(
          kESignService,
        );
        if (!ESignData) {
          userData.currentStepTitle = kESignPreparationInfo.title;
          userData.currentStepInfo = kESignPreparationInfo.info;
          userData.showDeclineButton = false;
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kEsignRoute },
            userDetails,
          );
        } else {
          userData.currentStepTitle = kESignPendingInfo.title;
          userData.currentStepInfo = kESignPendingInfo.info;
          userData.showDeclineButton = false;
          const esign_url = mode == kSetu ? ESignData?.signed_document : '';
          const aadhaarNumber = userDetails.kycData?.aadhaarNumber;
          userData.webviewData = getEsignURLData(
            masterData.loanId,
            ESignData?.quick_invite_url,
            esign_url,
            aadhaarNumber,
          );
          userData.webviewData['launchURL'] = true;
          userData.webviewData.showLink = true;
          userData.webviewData.linkTitle = 'Complete E-sign in browser';
          return await this.syncUserRouteDetails(
            { userData, continueRoute: kWebviewRoute },
            userDetails,
          );
        }
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // #22 Disbursement route
  private async checkDisbursementRoute(masterData, userData, userDetails) {
    try {
      if (masterData.status.eSign != 1) return {};
      const disbursement = masterData.status.disbursement;
      if (disbursement == -1 || disbursement == 0) {
        const loanId = masterData.loanId;
        userData.loanId = loanId;
        userData.currentStepTitle = kDisbursementInfo.title;
        userData.disbursementInitiate = true;
        const emiList = await this.loanRepo.getRowWhereData(
          ['netEmiData', 'appType'],
          { where: { id: loanId } },
        );
        userData.currentStepInfo =
          emiList?.appType == 1
            ? kDisbursementInfoNBFC.info
            : kDisbursementInfo.info;
        if (emiList === k500Error) return kInternalError;
        const netEmiData = emiList?.netEmiData;
        if (netEmiData) {
          const emiData = [];
          netEmiData.forEach((emi) => {
            try {
              const tempObj = JSON.parse(emi);
              const emiObj = {
                'EMI date': tempObj?.Date,
                'EMI amount': this.strService.readableAmount(tempObj?.Emi ?? 0),
              };
              emiData.push(emiObj);
            } catch (error) {}
          });
          userData.emiData = emiData;
        }
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Basic, Personal and Professional details for user
  private async getOtherInfo(masterId) {
    const attributes = ['otherInfo'];
    const options = { where: { id: masterId } };
    const masterData = await this.masterRepo.getRowWhereData(
      attributes,
      options,
    );
    if (masterData == k500Error) return kInternalError;
    if (!masterData) return k422ErrorMessage(kNoDataFound);
    return masterData.otherInfo;
  }

  // Employment data
  private async getEmpDetails(userId) {
    try {
      // Work mail join
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = ['email'];
      const include = [workMailInclude];
      const attributes = ['companyName'];
      const options = {
        order: [['id', 'DESC']],
        where: { userId },
        include,
      };
      const empData = await this.empRepo.getRowWhereData(attributes, options);
      if (empData == k500Error) return kInternalError;
      if (!empData) return {};
      return empData;
    } catch (error) {
      return kInternalError;
    }
  }

  private async isLocationNotFetched(userId) {
    try {
      const options = { where: { userId } };
      const count = await this.locationRepo.getCountsWhere(options);
      return count == 0;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getTotalLoanCounts(userId) {
    try {
      const options = { where: { userId } };
      const loanCount = await this.loanRepo.getCountsWhere(options);
      if (loanCount === k500Error) return kInternalError;
      return loanCount;
    } catch (error) {
      return kInternalError;
    }
  }

  // Bank details for user
  private async getBankingData(userId) {
    try {
      const attributes = [
        'aaDataStatus',
        'accountNumber',
        'bank',
        'consentTxnId',
        'dataOfMonth',
        'ifsCode',
        'isNeedTagSalary',
        'mandateAccount',
        'mandateBank',
        'mandateIFSC',
        'salaryDate',
        'otherDetails',
      ];
      const options = {
        order: [['id', 'DESC']],
        where: { userId },
      };
      const bankData = await this.bankingRepo.getRowWhereData(
        attributes,
        options,
      );
      if (bankData == k500Error) return kInternalError;
      if (!bankData) return k422ErrorMessage(kNoDataFound);

      return bankData;
    } catch (error) {
      return kInternalError;
    }
  }

  // Mandate details for user
  private async getSubscriptionData(loanId) {
    try {
      const subScriptionInclude: any = { model: SubScriptionEntity };
      subScriptionInclude.attributes = [
        'invitationLink',
        'mode',
        'response',
        'subscriptionId',
        'createdAt',
        'updatedAt',
      ];
      const include = [subScriptionInclude];
      const attributes = ['subscriptionId'];
      const options = { include, where: { id: loanId } };
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      return loanData.subscriptionData ?? {};
    } catch (error) {
      return kInternalError;
    }
  }

  // eSign details for user
  private async getESignData(loanId) {
    try {
      const attributes = ['id', 'quick_invite_url', 'signed_document'];
      const options = { order: [['id', 'DESC']], where: { loanId } };
      const eSignData = await this.eSignRepo.getRowWhereData(
        attributes,
        options,
      );
      if (eSignData == k500Error) return kInternalError;
      // Here we are not throwing an error of no data founds as we are telling user about eSign is getting generated
      return eSignData;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region set banner url and interest rate
  private async setBannerURLAndInterestRate(finalizedData, userDetails) {
    /// show banner if routes is reapply or repay

    const currentTime = new Date();

    const currentHour = currentTime.getHours();

    const isNightTime = currentHour >= 23 || currentHour < 9;

    const route = finalizedData?.continueRoute ?? '';
    if ([kReApplyRoute, kRepaymentRoute].includes(route)) {
      const id = userDetails.id;
      const bannerData = await this.getBannerURL(userDetails?.gender, id);
      finalizedData.userData.nextEligibleInterest = bannerData?.interestRate;
    }
    const index = Math.floor(Math.random() * bMarketingBanners.length);
    finalizedData.userData.bannerURL = bMarketingBanners[index];

    // Marketing banners -> Active loan users
    if (route === kRepaymentRoute) {
      // Active loan lsp
      if (userDetails.appType == '0') {
        const index = Math.floor(
          Math.random() * bMarketingBannersForActiveLoanLsp.length,
        );
        finalizedData.userData.bannerURL =
          bMarketingBannersForActiveLoanLsp[index];
      } // Active loan nbfc
      else if (userDetails.appType == '1') {
        const index = Math.floor(
          Math.random() * bMarketingBannersForActiveLoanNBFC.length,
        );
        finalizedData.userData.bannerURL =
          bMarketingBannersForActiveLoanLsp[index];
      }
    }
    // Delay banner
    else if (
      finalizedData.continueRoute == kNoRoute ||
      finalizedData.rootRoute == kNoRoute
    ) {
      if (isNightTime) {
        if (userDetails.appType == '0')
          finalizedData.userData.bannerURL =
            'https://storage.googleapis.com/backend_static_stuff/NonNBFC_Banner_v4.0.png';
        else if (userDetails.appType == '1')
          finalizedData.userData.bannerURL = `https://storage.googleapis.com/${EnvConfig.gCloudAssets.cloudStaticBucketName}/${EnvConfig.gCloudAssets.appBannerV1}`;
      } else {
        if (userDetails.appType == '0')
          finalizedData.userData.bannerURL =
            'https://storage.googleapis.com/backend_static_stuff/nonNBFC.png';
        else if (userDetails.appType == '1')
          finalizedData.userData.bannerURL = `https://storage.googleapis.com/${EnvConfig.gCloudAssets.cloudStaticBucketName}/${EnvConfig.gCloudAssets.appBannerV2}`;
      }
    }
  }
  //#endregion

  // Update the stage and status in user entity (If requires)
  private async syncUserRouteDetails(finalizedData, userDetails) {
    try {
      if (!finalizedData.userData) return {};

      let stage;
      let stageStatus;

      // PHONE VERIFICATION
      if (finalizedData.type == 'phone') {
        stageStatus = -1;
        stage = UserStage.PHONE_VERIFICATION;
      }
      // EMAIL VERIFICATION
      else if (finalizedData.type == 'email') {
        stageStatus = -1;
        stage = UserStage.BASIC_DETAILS;
      }
      // WORK EMAIL VERIFICATION
      else if (finalizedData.type == 'workEmail') {
        stageStatus = -1;
        stage = UserStage.EMPLOYMENT;
      } else {
        const statusData = userDetails.masterData?.status ?? {};
        switch (finalizedData.continueRoute) {
          // APP PERMISSION
          case kPermissionRoute:
            stage = UserStage.BASIC_DETAILS;
            stageStatus = -1;
            break;

          // BASIC DETAILS
          case kBasicDetailsRoute:
            stage = UserStage.BASIC_DETAILS;
            stageStatus = -1;
            break;

          // PERSONAL DETAILS
          case kPersonalDetailsRoute:
            stage = UserStage.BASIC_DETAILS;
            stageStatus = -1;
            break;

          // PROFESSIONAL DETAILS
          case kProfessionalDetailsRoute:
            stage = UserStage.BASIC_DETAILS;
            stageStatus = -1;
            break;

          // ADD AADHAR DETAILS
          case kAddAadhareNumberRoute:
            stage = UserStage.AADHAAR;
            stageStatus = -1;
            break;

          // NOT ELIGIBLE
          case kNotEligibleRoute:
            stage = UserStage.NOT_ELIGIBLE;
            stageStatus = 2;
            break;

          // SET PASSCODE
          case kSetPassCodeRoute:
            stage = UserStage.PIN;
            stageStatus = -1;
            break;

          // Webview
          case kWebviewRoute:
            const webviewType = finalizedData.userData.webviewData?.type;
            // AADHAAR VERIFICATION
            if (webviewType == 'mAadhaar') {
              stage = UserStage.AADHAAR;
              stageStatus = -1;
            } else if (webviewType == 'SUBSCRIPTION') {
              stage = UserStage.MANDATE;
              stageStatus = -1;
            }
            // ESign pending from user side
            else if (webviewType == 'ESIGN') {
              stage = UserStage.ESIGN;
              stageStatus = -1;
            }
            break;

          // Employment details
          case kEmploymentRoute:
            stage = UserStage.EMPLOYMENT;
            stageStatus = -1;
            break;

          // WORK EMAIL
          case kWorkEmailRoute:
            stage = UserStage.EMPLOYMENT;
            stageStatus = -1;
            break;

          // SALARY SLIP
          case kSalarySlipRoute:
            stage = UserStage.EMPLOYMENT;
            stageStatus = -1;
            break;

          // BANK VERIFICATION
          case kBankingRoute:
            stage = UserStage.BANKING;
            stageStatus = -1;
            break;
          case kMissingMonthRoute:
            stage = UserStage.BANKING;
            stageStatus = -1;
            break;
          case kIsNeedTagSalaryRoute:
            stage = UserStage.BANKING;
            stageStatus = 0;
            break;
          case kAddAccountNumberRoute:
            stage = UserStage.BANKING;
            stageStatus = -1;
            break;
          case kAddIFSCRoute:
            stage = UserStage.BANKING;
            stageStatus = -1;
            break;

          // Residence -> Pending from user
          case kSubmitResidenceProofRoute:
            stage = UserStage.RESIDENCE;
            stageStatus = -1;
            break;
          case kTypeAddressRoute:
            stage = UserStage.RESIDENCE;
            stageStatus = -1;
            break;
          case kAutomateResidenceRoute:
            stage = UserStage.RESIDENCE;
            stageStatus = -1;
            break;
          case kCibilAddressRoute:
            stage = UserStage.RESIDENCE;
            stageStatus = -1;
            break;

          // Selfie -> Pending from user
          case kTakeSelfieRoute:
            stage = UserStage.SELFIE;
            stageStatus = -1;
            break;

          // SELECT AND ACCEPT LOAN AMOUNT
          case kSelectLoanAmountRoute:
            stage = UserStage.LOAN_ACCEPT;
            stageStatus = -1;
            break;

          // SUBMIT REFERENCE
          case kReferenceRoute:
            stage = UserStage.CONTACT;
            stageStatus = -1;
            break;

          case kNoRoute:
            // Employment verification pending from admin
            if (statusData.company == 0) {
              stage = UserStage.EMPLOYMENT;
              stageStatus = 0;
            } else if (statusData.workMail == 0) {
              stage = UserStage.EMPLOYMENT;
              stageStatus = 0;
            } else if (statusData.salarySlip == 0) {
              stage = UserStage.EMPLOYMENT;
              stageStatus = 0;
            }
            // Banking verification pending from admin
            else if (statusData.bank == 0) {
              stage = UserStage.BANKING;
              stageStatus = 0;
            }
            // Residence verification pending from admin
            else if (statusData.residence == 0) {
              stage = UserStage.RESIDENCE;
              stageStatus = 0;
            }
            // Selfie verification pending from admin
            else if (statusData.selfie == 0) {
              stage = UserStage.SELFIE;
              stageStatus = 0;
            } // Contact verification pending from admin
            else if (statusData.contact == 0) {
              stage = UserStage.CONTACT;
              stageStatus = 0;
            }
            // Pan verification pending from admin
            else if (statusData.pan == 0) {
              stage = UserStage.PAN;
              stageStatus = 0;
            } // Final verification pending from admin
            else if (statusData.loan == 0) {
              stage = UserStage.FINAL_VERIFICATION;
              stageStatus = 0;
            } else if (statusData.eMandate == 2) {
              stage = UserStage.MANDATE;
              stageStatus = -1;
            }
            // Disbursement process pending from admin
            else if (statusData.disbursement == 0) {
              stage = UserStage.DISBURSEMENT;
              stageStatus = 0;
            }
            // PAN VERIFICATION
            else if (
              (statusData.reference == 1 || statusData.reference == 4) &&
              statusData.pan == 0
            ) {
              stage = UserStage.PAN;
              stageStatus = 0;
            } else if (
              (statusData.reference == 1 || statusData.reference == 4) &&
              statusData.pan == 2
            ) {
              stage = UserStage.PAN;
              stageStatus = 2;
            }
            // FINAL VERIFICATION
            else if (
              statusData.loan == 0 &&
              (statusData.reference == 1 || statusData.reference == 4) &&
              statusData.pan != 0 &&
              statusData.contact != 0 &&
              statusData.selfie != 0
            ) {
              stage = UserStage.FINAL_VERIFICATION;
              stageStatus = 0;
            }
            // Fall back
            else {
              stage = UserStage.NO_ROUTE;
              stageStatus = -1;
            }
            break;

          // PAN VERIFICATION
          case kReuploadPanRoute:
            stage = UserStage.PAN;
            stageStatus = -1;
            break;

          // Mandate -> Pending from user
          case kMandateRoute:
            stage = UserStage.MANDATE;
            stageStatus = -1;
            break;

          // ESign -> Pending from user
          case kEsignRoute:
            stage = UserStage.ESIGN;
            stageStatus = -1;
            break;

          // Loan payment -> Pending from user
          case kRepaymentRoute:
            stage = UserStage.REPAYMENT;
            stageStatus = -1;
            break;

          // Re - Apply loan
          case kReApplyRoute:
            stage = UserStage.REAPPLY;
            stageStatus = -1;

          default:
            break;
        }
      }

      this.prepareStepper(userDetails, finalizedData);

      // Need to update the data
      if (
        userDetails.stage != stage ||
        userDetails.stageStatus != stageStatus ||
        !userDetails.stageTime
      ) {
        const updatedData: any = {
          stage,
          stageStatus,
        };
        if (!userDetails.isAdminReq || userDetails.isAdminReq == 'false')
          updatedData.stageTime = new Date();

        const updateResult = await this.repository.updateRowData(
          updatedData,
          finalizedData.userData.id,
        );
        if (updateResult == k500Error) return kInternalError;
      }

      await this.setBannerURLAndInterestRate(finalizedData, userDetails);

      return finalizedData;
    } catch (error) {
      return kInternalError;
    }
  }

  private prepareStepper(userDetails, finalizedData) {
    try {
      const nonDashboardRoutes = [
        kPermissionRoute,
        kReApplyRoute,
        kRepaymentRoute,
      ];
      const continueRoute = finalizedData.continueRoute ?? '';
      if (finalizedData.type == 'phone') return {};
      if (finalizedData.userData.notEligibleText) return;
      if (nonDashboardRoutes.includes(continueRoute)) return;

      const dates = userDetails.masterData?.dates ?? {};
      const statusData = userDetails.masterData?.status ?? {};
      const approval = [1, 3];
      const selfie = statusData?.selfie;
      const pan = statusData?.pan;
      if (selfie == 0 && [1, 3].includes(statusData.bank)) {
        finalizedData.userData.selfieUnderVerification = true;
        finalizedData.userData.currentStepInfo = SelfieUnderVerification;
      }
      const stepperInfo: any = [
        { name: 'Registration', description: kBeforeRegText },
        { name: 'KYC verification', description: kBeforeKYCVerificationText },
        {
          name: 'Employment verification',
          description: kBeforeEmploymentVerificationText,
        },
        {
          name: 'Salary verification',
          description: kBeforeSalaryVerificationText,
        },
        ...(GLOBAL_FLOW.RESIDENCE_IN_APP
          ? [
              {
                name: 'Residence verification',
                description: KBeforeResidenceVerificationText,
              },
            ]
          : []),
        { name: 'PAN verification', description: kBeforeKYCVerificationText },
        { name: 'Final verification', description: kBeforeEligiblityText },
        { name: 'E-Mandate', description: kBeforeEMandateRegText },
        { name: 'E-Sign', description: kBeforeESignText },
        { name: 'Disbursement', description: kBeforeDisbursementText },
      ];
      if (
        ![0, 2, 6].includes(pan) ||
        continueRoute == kSelectLoanAmountRoute ||
        continueRoute == kTakeSelfieRoute
      )
        stepperInfo.splice(
          stepperInfo.findIndex((item) => item?.name === 'PAN verification'),
          1,
        );

      const total = stepperInfo.length;
      let count = 0;
      const isRejected = (finalizedData.userData.dashboardInfo ?? '') != '';
      let remark = finalizedData.userData?.dashboardInfo;
      if (remark)
        remark = remark.charAt(remark.length - 1) != '.' ? remark + '.' : '';
      const currentStep = {
        reject: isRejected,
        info: remark ?? finalizedData?.userData?.currentStepInfo,
      };
      for (let index = 0; index < stepperInfo.length; index++) {
        try {
          const el = stepperInfo[index];
          const key = el.name ?? '';
          // #01 - Registration
          if (key == 'Registration') {
            if (
              continueRoute == kBasicDetailsRoute ||
              continueRoute == kPersonalDetailsRoute ||
              continueRoute == kProfessionalDetailsRoute
            ) {
              el.isPending = true;
              el.currentStep = kBasicInfo;
            } else if (
              continueRoute == kTakeSelfieRoute &&
              ![0, 2].includes(selfie)
            ) {
              el.isPending = true;
              el.currentStep = kProfilePhotoInfo;
            }
            if (
              dates['registration'] != 0 &&
              el.isRejected != true &&
              el.isPending != true &&
              el.underVerification != true &&
              approval.includes(statusData.professional)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['registration']),
              );
              el.description = kSuccessful;
            }
          }
          // #02 - KYC
          else if (key == 'KYC verification') {
            if (
              continueRoute == kSetPassCodeRoute ||
              continueRoute == kAddAadhareNumberRoute
            ) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kKYCInfo;
              }
            } else if (continueRoute == kWebviewRoute) {
              if (finalizedData.userData.webviewData?.type == 'mAadhaar') {
                if (isRejected) {
                  el.isRejected = true;
                  el.currentStep = currentStep;
                } else {
                  el.isPending = true;
                  el.currentStep = kVerificationInfo;
                }
              }
            }
            if (
              dates['aadhaar'] != 0 &&
              !el.isPending &&
              el.underVerification != true &&
              approval.includes(statusData.aadhaar)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['aadhaar']),
              );
              el.description = kSuccessful;
            }
          }
          // Pan
          else if (key == 'PAN verification') {
            if (continueRoute == kReuploadPanRoute) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kReUploadPanInfo;
              }
            } else if (continueRoute == kNoRoute && statusData?.pan == 0) {
              el.underVerification = true;
              el.currentStep = kVerificationInfo;
            }
          }
          // #03 - Employment
          else if (key == 'Employment verification') {
            if (
              continueRoute == kEmploymentRoute ||
              continueRoute == kWorkEmailRoute ||
              continueRoute == kSalarySlipRoute
            ) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kEmploymentInfo;
              }
            } else if (
              continueRoute == kNoRoute ||
              continueRoute == kBankingRoute ||
              continueRoute == kMissingMonthRoute ||
              continueRoute == kAddIFSCRoute ||
              continueRoute == kIsNeedTagSalaryRoute ||
              continueRoute == kAddAccountNumberRoute ||
              continueRoute == kTakeSelfieRoute
            ) {
              if (
                statusData.company == 0 ||
                statusData.workMail == 0 ||
                statusData.salarySlip == 0
              ) {
                el.underVerification = true;
                el.currentStep = kVerificationInfo;
              }
            }
            if (
              dates['employment'] != 0 &&
              statusData.company != 0 &&
              statusData.workMail != 0 &&
              statusData.salarySlip != 0 &&
              el.isRejected != true &&
              el.isPending != true &&
              el.underVerification != true
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['employment']),
              );
              el.description = kSuccessful;
            }
          }
          // 05 - Salary verification
          else if (key == 'Salary verification') {
            if (
              continueRoute == kIsNeedTagSalaryRoute ||
              continueRoute == kAddAccountNumberRoute ||
              continueRoute == kAddIFSCRoute ||
              continueRoute == kBankingRoute ||
              continueRoute == kMissingMonthRoute
            ) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kStatementInfo;
              }
            } else if (
              statusData.bank == 0 ||
              (statusData.bank == 4 && continueRoute == kNoRoute)
            ) {
              el.underVerification = true;
              el.currentStep = kVerificationInfo;
            }
            if (
              dates['banking'] != 0 &&
              el.isRejected != true &&
              el.isPending != true &&
              el.underVerification != true &&
              [1, 3, 4].includes(statusData.workMail) &&
              [1, 3, 4].includes(statusData.salarySlip) &&
              approval.includes(statusData.bank)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['banking']),
              );
              el.description = kSuccessful;
            }
          }
          // #06 - Residence
          if (key == 'Residence verification') {
            if (
              continueRoute == kSubmitResidenceProofRoute ||
              continueRoute == kAutomateResidenceRoute ||
              continueRoute == kTypeAddressRoute ||
              continueRoute == kCibilAddressRoute
            ) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kResidenceProofInfo;
              }
            } else if (
              continueRoute == kNoRoute &&
              statusData?.residence == 0
            ) {
              el.underVerification = true;
              el.currentStep = kVerificationInfo;
            }
            if (
              dates['residence'] != 0 &&
              el.isRejected != true &&
              el.isPending != true &&
              el.underVerification != true &&
              approval.includes(statusData.bank) &&
              [1, 3, 4].includes(statusData.workMail) &&
              [1, 3, 4].includes(statusData.salarySlip) &&
              [1, 3, 7, 8].includes(statusData.residence)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['residence']),
              );
              el.description = kSuccessful;
            }
          }
          // #07 - Eligibility (Loan)
          else if (key == 'Final verification') {
            if (continueRoute == kSelectLoanAmountRoute) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = {
                  title: 'Loan approved',
                  info: finalizedData?.userData?.currentStepInfo,
                };
              }
            } else if (
              (continueRoute == kNoRoute ||
                continueRoute == kTakeSelfieRoute ||
                continueRoute == kReferenceRoute ||
                statusData.contact == 0) &&
              statusData.loan == 0
            ) {
              if (isRejected && continueRoute != kTakeSelfieRoute) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.underVerification = true;
                el.currentStep = kVerificationInfo;
              }
            }
            if (
              dates['eligibility'] != 0 &&
              el.underVerification != true &&
              approval.includes(statusData.loan)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['eligibility']),
              );
              el.description = kSuccessful;
            }
          }
          // #08 - eMandate registration
          else if (key == 'E-Mandate') {
            if (continueRoute == kMandateRoute) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = keMandateInfo;
              }
            } else if (continueRoute == kWebviewRoute) {
              if (finalizedData.userData.webviewData?.type == 'SUBSCRIPTION') {
                if (isRejected) {
                  el.isRejected = true;
                  el.currentStep = currentStep;
                } else {
                  el.isPending = true;
                  el.currentStep = keMandateInfo;
                }
              }
            } else if (
              continueRoute == kNoRoute &&
              (finalizedData?.userData?.currentStepTitle ==
                keMandateFailedInfo.title ||
                statusData?.eMandate == 2)
            ) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = { reject: isRejected };
                el.description = '';
              } else {
                el.isPending = true;
                el.currentStep = keMandateFailedInfo;
              }
            }
            if (
              dates['eMandate'] != 0 &&
              dates['eligibility'] != 0 &&
              approval.includes(statusData.eMandate)
            ) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['eMandate']),
              );
              el.description = kSuccessful;
            }
          }
          // #9 - eSign
          else if (key == 'E-Sign') {
            const eSignNotCreated =
              continueRoute == kEsignRoute &&
              finalizedData?.userData?.currentStepTitle ==
                kESignPreparationInfo.title;
            const eSignCreated =
              continueRoute == kWebviewRoute &&
              finalizedData?.userData?.webviewData?.type == 'ESIGN';
            if (eSignNotCreated || eSignCreated) {
              if (isRejected) {
                el.isRejected = true;
                el.currentStep = currentStep;
              } else {
                el.isPending = true;
                el.currentStep = kESignPreparationInfo;
              }
            }
            if (dates['eSign'] != 0 && approval.includes(statusData.eSign)) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['eSign']),
              );
              el.description = kSuccessful;
            }
          }
          // #10 - Disbursement
          else if (key == 'Disbursement') {
            if (
              continueRoute == kNoRoute &&
              finalizedData?.userData?.currentStepTitle ==
                kDisbursementInfo.title
            ) {
              el.isPending = true;
              el.currentStep = kDisbursementInfo;
            }
            if (dates['disbursement'] != 0) {
              count++;
              el.date = this.typeService.convertMinutesToHours(
                new Date(dates['disbursement']),
              );
              el.description = kSuccessful;
            }
          }
          if (el.isPending == true) break;
        } catch (error) {}
      }

      finalizedData.userData.progressInfo = Math.floor((count * 100) / total);
      finalizedData.userData.stepperInfo = stepperInfo;
      if (finalizedData.continueRoute)
        finalizedData.rootRoute = kDashboardRoute;
    } catch (error) {}
  }

  async uploadSelfie(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const selfieURL = reqData.selfieURL;
      if (!selfieURL) return kParamMissing('selfieURL');
      const selfieFromRetry = reqData.selfieFromRetry ?? false;

      // Get user data
      const userData = await this.getUserData(reqData, [], ['dates']);
      if (userData.message) return userData;
      const masterData = userData.masterData;
      const statusData = masterData?.status ?? {};
      const datesData = masterData?.dates ?? {};
      const masterId = userData.masterId;

      // Selfie validation
      const selfieStatus = statusData?.selfie;
      if (selfieStatus == 1 || selfieStatus == 3)
        return k422ErrorMessage('Selfie already uploaded');

      // Add selfie
      const creationData: any = {
        userId,
        rejectReason: null,
        adminId: null,
      };
      if (selfieFromRetry === true) {
        creationData.details = { selfieFromRetry };
        creationData.status = '0';
        creationData.tempImage = selfieURL;
      }
      const checkExitsData = await this.selfieRepo.getRowWhereData(
        ['id', 'image'],
        {
          where: { userId },
          order: [['id', 'DESC']],
        },
      );
      if (checkExitsData === k500Error) return kInternalError;
      let createdData;
      if (checkExitsData && checkExitsData?.image && userData?.selfieId) {
        creationData.tempImage = selfieURL;
        createdData = await this.selfieRepo.createRowDataWithCopy(
          creationData,
          userData.selfieId,
        );
      } else {
        creationData.image = selfieURL;
        createdData = await this.selfieRepo.createRowData(creationData);
      }
      if (createdData == k500Error) return kInternalError;
      // Update user data
      const updatedData: any = { selfieId: createdData?.id };
      if (selfieStatus != 2) updatedData.image = selfieURL;

      const userUpdate = await this.repository.updateRowData(
        updatedData,
        userId,
      );
      if (userUpdate == k500Error) return kInternalError;
      /// compare with aws
      const selfie = await this.commonSharedService.validateWithAadhareImage(
        userId,
        statusData,
      );
      // Update master data
      statusData.selfie = selfie;
      datesData.selfie = new Date().getTime();
      const approved = [1, 3, 4];
      if (
        approved.includes(statusData.pan) &&
        approved.includes(statusData.selfie) &&
        approved.includes(statusData.contact) &&
        approved.includes(statusData.reference)
      ) {
        statusData.loan = 0;
        statusData.eligibility = 0;
      }
      const updatedStatus = { status: statusData, dates: datesData };
      const masterUpdate = await this.masterRepo.updateRowData(
        updatedStatus,
        masterId,
      );
      if (masterUpdate == k500Error) return kInternalError;
      const loanId = masterData.loanId;
      if (loanId && selfie == 1 && statusData.loan == 0) {
        const finalData = { loanId: masterData.loanId, userId };
        await this.sharedEligibility.finalApproval(finalData);
      }
      return await this.routeDetails({ id: userId });
    } catch (error) {
      return kInternalError;
    }
  }

  async generateOTP(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const smsKey = reqData?.smsKey;

      const extraAttr = type == 'phone' ? ['phone'] : ['email', 'fullName'];
      const userData = await this.getUserData(reqData, extraAttr);
      if (userData.message) return userData;
      const otp = this.commonService.generateOTP();
      const statusData = userData.masterData?.status ?? {};
      // Phone OTP
      if (type == 'phone') {
        if (!userData.phone)
          return k422ErrorMessage(
            'Please add phone number before proceeding for the verification',
          );
        // if (statusData.phone == 1)
        //   return k422ErrorMessage('Phone already verified');
        const phone = this.cryptService.decryptPhone(userData.phone);
        await this.allsmsService.sendOtp(otp, phone, smsKey);
      }
      // Email OTP
      else if (type == 'email') {
        if (!userData.email)
          return k422ErrorMessage(
            'Please add email address before proceeding for the verification',
          );
        if (statusData.email == 1)
          return k422ErrorMessage('Email address already verified');
        const email = userData.email;
        const data = { name: userData.fullName, code: otp, userId: userId };
        await this.notificationService.sendEmail(kTEmailOtp, email, data);
      }

      const updateResult = await this.repository.updateRowData({ otp }, userId);
      if (updateResult == k500Error) return kInternalError;
      return { successMsg: 'OTP generated successfully' };
    } catch (error) {
      return kInternalError;
    }
  }

  async verifyOTP(reqData) {
    try {
      // Params validation
      const id = reqData.userId;
      if (!id) return kParamMissing('userId');
      const otp = reqData.otp;
      if (!otp) return kParamMissing('otp');
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const typeofDevice = reqData.typeofDevice;
      const currentDate = new Date();

      // Get user data
      const att = [
        'otp',
        'isRedProfile',
        'phone',
        'wrongOtpCount',
        'lastOtpAttemptTime',
      ];
      const userData = await this.getUserData(reqData, att, ['dates']);
      if (userData.message) return userData;
      const statusData = userData.masterData?.status ?? {};
      let chanceLeft = userData?.wrongOtpCount;
      let timeDiff;
      if (userData.lastOtpAttemptTime) {
        timeDiff = await this.typeService.dateDifference(
          currentDate,
          userData.lastOtpAttemptTime,
          'Minutes',
        );
      }

      // OTP validation
      if (userData.otp != otp && type != 'phonenumber') {
        chanceLeft = chanceLeft + 1;

        if (
          chanceLeft > USER_LOGIN_CHANCE &&
          timeDiff <= USER_WRONG_OTP_TIME_MINS
        ) {
          return k422ErrorMessage(
            `Please try again after ${
              USER_WRONG_OTP_TIME_MINS - timeDiff + 1
            } minutes`,
          );
        } else if (timeDiff >= USER_WRONG_OTP_TIME_MINS) chanceLeft = 1;

        const updateData = {
          wrongOtpCount: chanceLeft,
          lastOtpAttemptTime: currentDate,
        };
        await this.repository.updateRowData(updateData, id);

        if (chanceLeft == 3)
          return k422ErrorMessage(
            `Please try again after ${
              USER_WRONG_OTP_TIME_MINS - timeDiff + 1
            } minutes`,
          );
        return k422ErrorMessage(
          `Incorrect OTP, Please try again only ${
            USER_LOGIN_CHANCE - chanceLeft
          } chances left`,
        );
      } else if (
        type == 'phonenumber' &&
        otp != kExotelAppIds.USER_CALL_VERIFICATION_1.callId &&
        otp != kExotelAppIds.USER_CALL_VERIFICATION_2.callId &&
        otp != kExotelAppIds.USER_CALL_VERIFICATION_3.callId
      )
        return k422ErrorMessage('Phone number validation failed !');
      const updatedData: any = { status: statusData };
      const updated: any = {};

      if (
        chanceLeft < USER_LOGIN_CHANCE ||
        timeDiff > USER_WRONG_OTP_TIME_MINS
      ) {
        // Phone
        if (type == 'phone' || type == 'phonenumber') {
          let fcmToken = reqData.fcmToken;
          if (typeofDevice == '2') {
            if (fcmToken) updated.webFcmToken = fcmToken ?? '';
          } else {
            if (fcmToken) updated.fcmToken = fcmToken ?? '';
          }
          if (statusData.phone == 1) {
            // if isRedProfile then reset user route
            if (userData?.isRedProfile === 1) {
              const redProfileData: any = await this.markAsRedProfile({ id });
              if (redProfileData?.message) return redProfileData;
              if (redProfileData === 0) updated.isRedProfile = 0;
            }

            // Update user data
            updated.wrongOtpCount = 0;
            updated.lastOtpAttemptTime = null;

            await Promise.all([
              this.repository.updateRowData(updated, id),
              this.removePreviousFcmToken(fcmToken, id),
            ]);

            const routeDetails = await this.routeDetails({ id });
            // Need changes for play store / app store dummy account as they should see permission screen each time login
            if (kDummyUserIds.includes(routeDetails.userData?.id ?? ''))
              routeDetails.continueRoute = kPermissionRoute;
            // Generate auth
            routeDetails.jwtToken = await this.cryptService.generateJWT({
              phone: this.cryptService.decryptPhone(userData.phone),
              userId: id,
            });
            return routeDetails;
          }
          updatedData.status.phone = 1;

          //sending first time registred user a regard whatsapp message
          if (updatedData?.status?.email === -1) {
            // temporary code commented
            // await this.sendRegistrationWhatsappMsg(id, userData);
          }
        }
        // Email
        else if (type == 'email') updatedData.status.email = 1;

        // Check if all basic details are filled
        if (
          updatedData.status.email == 1 &&
          updatedData.status.pan == 5 &&
          updatedData.status.basic != 1
        ) {
          updatedData.status.basic = 1;
          // Syncing date for stepper
          const dates = userData.masterData.dates ?? {};
          if (dates.basicDetails == 0) {
            updatedData.dates = dates;
            updatedData.dates.basicDetails = new Date().getTime();
          }
        }

        // Update master data
        const updateResult = await this.masterRepo.updateRowData(
          updatedData,
          userData.masterId,
        );
        if (updateResult == k500Error) return kInternalError;

        // Generate auth
        updated.jwtToken = await this.cryptService.generateJWT({
          phone: this.cryptService.decryptPhone(userData.phone),
          userId: id,
        });
        // Update user data
        updated.wrongOtpCount = 0;
        updated.lastOtpAttemptTime = null;

        /// update user status
        await this.repository.updateRowData(updated, id);

        const routeDetails = await this.routeDetails({ id });
        if (!routeDetails.message) routeDetails.jwtToken = updated.jwtToken;
        return routeDetails;
      } else
        return k422ErrorMessage(
          `Please try again after ${
            USER_WRONG_OTP_TIME_MINS - timeDiff + 1
          } minutes`,
        );
    } catch (error) {
      return kInternalError;
    }
  }

  async submitRoute(reqData) {
    try {
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const id = reqData.userId;
      if (!id) return kParamMissing('userId');

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const include = [masterInclude];
      const attributes = ['masterId'];
      const options = { include, where: { id } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      // Update as per route
      const statusData = userData.masterData.status ?? {};
      if (type == 'permission') {
        const updatedData: any = { status: statusData };
        updatedData.status.permission = 1;
        const updateResult = await this.masterRepo.updateRowData(
          updatedData,
          userData.masterId,
        );
        if (updateResult == k500Error) return kInternalError;
        if (reqData.isCibilConsent == true) {
          const updatedData: any = { isCibilConsent: 1 };
          let updateResult = await this.repository.updateRowData(
            updatedData,
            id,
          );
          if (updateResult == k500Error) return kInternalError;
        }
        return await this.routeDetails({ id });
      } else if (type == 'augmount') {
        const updatedData: any = { isInterestedInGold: true };
        const updateResult = await this.repository.updateRowData(
          updatedData,
          id,
        );
        if (updateResult == k500Error) return kInternalError;
        const userDetails = await this.routeDetails({ id });
        if (userDetails.message) return userDetails;
        userDetails.continueRoute = kAugmountRoute;
        return userDetails;
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async submitCibilConsent(reqData) {
    try {
      const isCibilConsent = reqData.isCibilConsent;
      if (!isCibilConsent) return kParamMissing('isCibilConsent');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      if (reqData.isCibilConsent == true) {
        const updatedData: any = { isCibilConsent: 1 };
        let updateResult = await this.repository.updateRowData(
          updatedData,
          userId,
        );
        if (updateResult == k500Error) return kInternalError;
        return updateResult;
      } else return k422ErrorMessage('Cibil Flow is disable');
    } catch (error) {
      return kInternalError;
    }
  }

  async submitNewUserDetails(reqData) {
    // Validation -> Parameters
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const email = reqData.email?.toLowerCase();
    if (!email) return kParamMissing('email');
    if (!regEmail(email))
      return k422ErrorMessage('Please enter valid email address');
    const existingEmail: any = await this.isEmailExists(userId, email);
    if (existingEmail.message) return existingEmail;
    let pan = reqData.pan?.toUpperCase();
    if (!pan) return kParamMissing('pan');
    const purposeId = reqData.purposeId;
    if (!purposeId) return kParamMissing('purposeId');
    const vehicleInfo = reqData.vehicleInfo;
    if (!vehicleInfo) return kParamMissing('vehicleInfo');
    const educationInfo = reqData.educationInfo;
    if (!educationInfo) return kParamMissing('educationInfo');
    const residentialInfo = reqData.residentialInfo;
    if (!residentialInfo) return kParamMissing('residentialInfo');
    const empInfo = (reqData.empInfo ?? '').toLowerCase();
    if (!empInfo) return kParamMissing('empInfo');
    const maritalInfo = reqData.maritalInfo;
    if (!maritalInfo) return kParamMissing('maritalInfo');
    const usercommunicationLanguage = reqData.communicationLanguage;
    const userBank = reqData.bankId;
    if (!userBank) return kParamMissing('bankId');
    let dependents = 0;
    let spouseName = '';
    let motherName = '';
    if (maritalInfo == 'Married') {
      dependents = +reqData.dependents;
      spouseName = reqData.spouseName;
      if (!spouseName) return kParamMissing('spouseName');
    } else {
      motherName = reqData.motherName;
      if (!motherName) return kParamMissing('motherName');
    }

    // Gather data -> User details
    const userData = await this.getUserData(
      reqData,
      [
        'fullName',
        'isRedProfile',
        'kycId',
        'leadId',
        'appType',
        'typeOfDevice',
        'referredBy',
      ],
      ['dates', 'otherInfo', 'coolOffData'],
    );
    // Validation -> Gathered data
    if (userData.message) return userData;
    var referralSkip;
    if (userData?.referredBy == null) referralSkip = true;
    const statusData = userData.masterData?.status ?? {};
    const miscData = userData.masterData?.miscData ?? {};
    const masterId = userData.masterId;
    const dates = userData.masterData?.dates ?? {};
    const rejection = userData.masterData?.rejection ?? {};
    const tempOtherInfo = userData.masterData?.otherInfo ?? {};
    const otherInfo = {
      ...tempOtherInfo,
      maritalInfo,
      dependents,
      spouseName,
      motherName,
      vehicleInfo,
      educationInfo,
      residentialInfo,
    };
    const coolOffData = userData.masterData?.coolOffData ?? {};

    // Logic -> IDV 1.0.0
    if (userData.typeOfDevice !== '0') {
      const emailToken = randomBytes(64)
        .toString('base64')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');
      const link = nEmailVerifyNBFC + emailToken;
      const data = {
        name: userData.fullName,
        link: link,
        userId: userId,
        hour: EXPITY_TIME,
      };
      await this.notificationService.sendEmail(
        kTEmailVerificationLink,
        email,
        data,
        null,
        // 'SENDGRID',
      );
      const allEmail = [email];
      const verificationEmailSendDate = new Date();
      let updateData: any = {
        email,
        emailToken,
        allEmail,
        verificationEmailSendDate,
        referralSkip,
      };
      if (usercommunicationLanguage)
        updateData.communicationLanguage = usercommunicationLanguage;
      const updateEmail = await this.repository.updateRowData(
        updateData,
        userId,
      );
      if (updateEmail === k500Error) throw new Error();
    } else {
      let updateData: any = {
        email,
        emailVerificationType: 3,
        referralSkip,
      };
      if (usercommunicationLanguage)
        updateData.communicationLanguage = usercommunicationLanguage;
      const updateEmail = await this.repository.updateRowData(
        updateData,
        userId,
      );
      if (updateEmail === k500Error) throw new Error();
    }

    // Pan
    let masterUpdateData: any = {
      status: statusData,
      dates,
      rejection,
      otherInfo,
    };
    if (!regPanCard(pan))
      return k422ErrorMessage('Please enter valid pan number');
    if (![1, 3].includes(statusData?.pan ?? -1)) {
      const existingPan: any = await this.isPanExists(userId, pan);
      if (existingPan.message) return existingPan;
      // Create KYC data
      const maskedPan =
        pan.substring(0, 2) + 'xxx' + pan[5] + 'xx' + pan.substring(8, 10);
      const creationData = { maskedPan, panCardNumber: pan, userId };
      let kycId = userData?.kycId;
      if (!kycId) {
        const createdData = await this.kycRepo.createRowData(creationData);
        if (createdData === k500Error) throw new Error();
        kycId = createdData.id;
      }
      if (!kycId) throw new Error();
      // Update user data
      const kycUpdateData = { kycId };
      let kycUpdateResult = await this.repository.updateRowData(
        kycUpdateData,
        userId,
      );
      if (kycUpdateResult === k500Error) throw new Error();
      statusData.pan = 5;
    }

    // Loan purpose
    const existingPurposeData: any = await this.isPurposeExists(purposeId);
    if (existingPurposeData.message) return existingPurposeData;
    // Update data in miscData
    miscData.purposeName = existingPurposeData.purposeName;
    if (reqData.reApply) miscData.nextLoanPurposeId = existingPurposeData.id;
    else miscData.purposeId = existingPurposeData.id;
    masterUpdateData.miscData = miscData;
    if (statusData.pan != -1) {
      statusData.basic = 1;
      // Syncing date for stepper
      if (dates.basicDetails == 0) {
        masterUpdateData.dates.basicDetails = new Date().getTime();
      }
    }

    // Professional details
    const salaryInfo = userData.masterData?.otherInfo?.salaryInfo;

    let reason;
    let isCoolOff = false;
    let isBlackList = false;
    let reasonId = null;
    const targetDate = this.typeService.getGlobalDate(new Date());
    const empApprove = [
      'salaried professional',
      'salaried',
      'consultant',
      'self-employed',
    ];
    let count = coolOffData?.count ?? 0;

    if (!empApprove.includes(empInfo) && empInfo != 'student') {
      reason = 'User is not salaried';
      isBlackList = true;
    } else if (empInfo == 'student') {
      reason = 'Not eligible employment sector';
      targetDate.setDate(targetDate.getDate() + 180);
      isCoolOff = true;
    } else if (userBank == -1) {
      reasonId = 59;
      isCoolOff = true;
      reason = SALARY_BANK_ACCOUNT_COOL_OFF;
      if (count == 0 || !count) targetDate.setDate(targetDate.getDate() + 1);
      else if (count == 1) targetDate.setDate(targetDate.getDate() + 30);
      else targetDate.setDate(targetDate.getDate() + 90);
    }

    if (isCoolOff) {
      const checkCoolOffData: any = await this.adminService.changeBlacklistUser(
        {
          userId,
          adminId: SYSTEM_ADMIN_ID,
          type: '2',
          reason: reason,
          status: '0',
          nextApplyDate: targetDate,
          reasonId,
        },
      );
      if (checkCoolOffData.message) return kInternalError;
    } else if (isBlackList) {
      const checkBlackListData: any =
        await this.adminService.changeBlacklistUser({
          userId,
          adminId: SYSTEM_ADMIN_ID,
          type: '1',
          reason: reason,
          status: '1',
          nextApplyDate: targetDate,
        });
      if (checkBlackListData.message) return kInternalError;
    }

    if ((isCoolOff || isBlackList) && masterUpdateData.status.loan == -1) {
      masterUpdateData.status.loan = 2;
      masterUpdateData.status.eligibility = 2;
      masterUpdateData.dates.loan = new Date().getTime();
      const update: any = { loanStatus: 'Rejected' };
      if (reason) {
        update.remark = reason;
        update.manualVerification = '2';
        update.manualVerificationAcceptId = SYSTEM_ADMIN_ID;
        masterUpdateData.rejection.loan = reason;
      }
      const loanId = userData.masterData?.loanId;
      const where = { userId, loanStatus: 'InProcess' };
      if (loanId) await this.loanRepo.updateWhere(update, loanId, where);
    }
    // Update master data
    if (!isCoolOff && !isBlackList) {
      masterUpdateData.status.professional = 1;
      masterUpdateData.dates.professionalDetails = new Date().getTime();
    }
    masterUpdateData.otherInfo.salaryBankAccountId = userBank;
    masterUpdateData.otherInfo.employmentInfo = empInfo;
    masterUpdateData.status.personal = 1;
    // Logic -> IDV 1.0.0
    if (userData.typeOfDevice === '0') masterUpdateData.status.email = 1;
    // Hit -> Query
    const updatedResult = await this.masterRepo.updateRowData(
      masterUpdateData,
      masterId,
    );
    // Validation -> Query result
    if (updatedResult === k500Error) throw new Error();

    return await this.routeDetails({ id: userId });
  }

  async verifyEmailToken(reqData) {
    try {
      const token = reqData.token;
      if (!token) return kParamMissing('token');
      if (token.length !== TOKEN_LENGTH) return kInvalidParamValue('token');
      const attr = [
        'id',
        'emailToken',
        'verificationEmailSendDate',
        'fcmToken',
      ];
      const options = {
        where: {
          emailToken: token,
        },
      };
      const userData = await this.repository.getRowWhereData(attr, options);
      if (!userData) return kInvalidParamValue('token');
      const updateAttr = ['status'];
      const updateOptions = {
        where: {
          userId: userData?.id,
        },
      };
      const masterDetails = await this.masterRepo.getRowWhereData(
        updateAttr,
        updateOptions,
      );
      let finalizedData: any;

      const emailSendDate = userData.verificationEmailSendDate;
      const currentDate = new Date();
      const dateDifference = await this.typeService.dateDifference(
        emailSendDate,
        currentDate,
        'Hours',
      );
      if (masterDetails.status.email == 1) {
        finalizedData = {
          messageInfo: kEmailAlreadyVerified,
          status: 2,
        };
        return finalizedData;
      }
      if (dateDifference > EXPITY_TIME) {
        finalizedData = {
          messageInfo: kVerificationLinkExpired,
          status: 3,
        };
        return finalizedData;
      }
      const emailVerificationType = 1;
      const userUpdateData = await this.repository.updateRowData(
        { emailVerificationType },
        userData?.id,
      );
      if (userUpdateData == k500Error) return kInternalError;
      masterDetails.status.email = 1;
      const masterData = await this.masterRepo.updateRowWhereData(
        masterDetails,
        updateOptions,
      );
      if (masterData == k500Error) return kInternalError;
      if (userData.fcmToken) {
        await this.notificationService.sendPushNotification(
          userData.fcmToken,
          kEmailVerifiedSuccessfully,
          kEmailVerifySuccessMessage,
        );
      }
      finalizedData = {
        messageInfo: kEmailVerifiedSuccessfully,
        status: 1,
      };
      return finalizedData;
    } catch (error) {
      return kInternalError;
    }
  }

  async reSendOtpPhone(id: string, phone?: number, smsKey?: any) {
    try {
      const otp = this.commonService.generateOTP();
      const res = await this.repository.updateRowData({ otp }, id);
      if (!res || res === k500Error) return k500Error;
      if (!phone) {
        const user = await this.findUserById(['phone'], id);
        if (!user || user == k500Error) return k500Error;
        phone = user.phone;
      }
      await this.allsmsService.sendOtp(otp, phone, smsKey);
      return true;
    } catch (error) {
      return k500Error;
    }
  }

  async reSendEmail(reqData) {
    try {
      const userId = reqData?.userId;
      if (!userId) return kParamMissing('userId');
      const newEmail = reqData?.email;

      const masterInclude = [
        {
          model: MasterEntity,
          attribures: ['status'],
        },
      ];
      const attr = ['appType', 'email'];
      const options = {
        include: masterInclude,
        where: {
          id: userId,
        },
      };
      const userData = await this.repository.getRowWhereData(attr, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);

      const emailStatus = userData?.masterData?.status?.email;
      if (emailStatus === 1) return k422ErrorMessage(kEmailAlreadyVerified);
      let receiverEmail = userData?.email;
      if (newEmail) {
        const checkEmailExist: any = await this.isEmailExists(userId, newEmail);
        if (checkEmailExist?.message) return checkEmailExist;
        receiverEmail = newEmail;
      }
      const emailToken = randomBytes(64)
        .toString('base64')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');
      const link = nEmailVerifyNBFC + emailToken;
      const data = {
        name: userData.fullName,
        link: link,
        userId: userId,
        hour: EXPITY_TIME,
      };
      await this.notificationService.sendEmail(
        kTEmailVerificationLink,
        receiverEmail,
        data,
        null,
        // 'SENDGRID',
      );
      const allEmail = [receiverEmail];
      const verificationEmailSendDate = new Date();
      const updateEmail = await this.repository.updateRowData(
        {
          email: receiverEmail,
          emailToken,
          allEmail,
          verificationEmailSendDate,
        },
        userId,
      );
      if (updateEmail == k500Error) return kInternalError;
      return true;
    } catch (error) {
      return kInternalError;
    }
  }

  async findUserById(attributes: string[], id) {
    try {
      return await this.repository.getRowWhereData(attributes, {
        where: { id },
      });
    } catch (error) {
      return k500Error;
    }
  }

  async reSendOtpEmail(id: string) {
    try {
      const otp = this.commonService.generateOTP();
      const res = await this.repository.updateRowData({ otp }, id);
      if (!res || res === k500Error) return k500Error;
      const attributes = ['email', 'fullName'];
      const user = await this.findUserById(attributes, id);
      if (!user || user == k500Error) return k500Error;
      const email = user.email;
      const data = { name: user.fullName, code: otp, userId: id };
      const result = await this.notificationService.sendEmail(
        kTEmailOtp,
        email,
        data,
      );
      if (result) return true;
      else return false;
    } catch (error) {
      return false;
    }
  }

  async submitPersonalDetails(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const maritalInfo = reqData.maritalInfo;
      if (!maritalInfo) return kParamMissing('maritalInfo');
      let dependents = 0;
      let spouseName = '';
      let motherName = '';
      if (maritalInfo == 'Married') {
        dependents = +reqData.dependents;
        spouseName = reqData.spouseName;
        if (!spouseName) return kParamMissing('spouseName');
      } else {
        motherName = reqData.motherName;
        if (!motherName) return kParamMissing('motherName');
      }
      const vehicleInfo = reqData.vehicleInfo;
      if (!vehicleInfo) return kParamMissing('vehicleInfo');
      const educationInfo = reqData.educationInfo;
      if (!educationInfo) return kParamMissing('educationInfo');
      const residentialInfo = reqData.residentialInfo;
      if (!residentialInfo) return kParamMissing('residentialInfo');

      // Get user data
      const userData = await this.getUserData(reqData, [], ['otherInfo']);
      if (userData.message) return userData;

      const masterId = userData.masterId;
      const statusData = userData.masterData?.status ?? {};
      const tempOtherInfo = userData.masterData?.otherInfo ?? {};
      const otherInfo = {
        ...tempOtherInfo,
        maritalInfo,
        dependents,
        spouseName,
        motherName,
        vehicleInfo,
        educationInfo,
        residentialInfo,
      };
      // Update master data
      const updatedData = { status: statusData, otherInfo };
      updatedData.status.personal = 1;
      const updateResult = await this.masterRepo.updateRowData(
        updatedData,
        masterId,
      );
      if (updateResult == k500Error) return kInternalError;

      return await this.routeDetails({ id: userId });
    } catch (error) {
      return kInternalError;
    }
  }

  // Checks whether Email address exists in another user or not
  private async isEmailExists(userId, email) {
    try {
      const attributes = ['id'];
      const options = { where: { email, id: { [Op.ne]: userId } } };

      const existingData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (existingData == k500Error) return kInternalError;
      if (existingData)
        return k422ErrorMessage(
          'Email id is already in use, try with another email address',
        );

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Checks whether Pan number exists in another user or not
  private async isPanExists(userId, pan) {
    try {
      const maskedPan =
        pan.substring(0, 2) + 'xxx' + pan[5] + 'xx' + pan.substring(8, 10);

      const attributes = ['panCardNumber'];
      const options = {
        where: {
          maskedPan,
          userId: { [Op.ne]: userId },
          panStatus: { [Op.or]: ['1', '3'] },
        },
      };
      const kycList = await this.kycRepo.getTableWhereData(attributes, options);
      if (kycList == k500Error) return kInternalError;

      // Pan exist validation
      for (let index = 0; index < kycList.length; index++) {
        try {
          const kycData = kycList[index];
          // Works only in PRODUCTION and UAT except mock pan number
          if (
            gIsPROD ||
            (isUAT &&
              !EnvConfig.mock.panNumbers.includes(kycData?.panCardNumber))
          ) {
            if (kycData?.panCardNumber == pan)
              return k422ErrorMessage(
                'Pan number already in use, try with another pan number',
              );
          }
        } catch (error) {}
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Checks whether loan purpose exists or not
  private async isPurposeExists(id) {
    try {
      const attributes = ['purposeName'];
      const options = { where: { id } };

      const purposeData = await this.purposeRepo.getRowWhereData(
        attributes,
        options,
      );
      if (purposeData == k500Error) return kInternalError;
      if (!purposeData) return k422ErrorMessage(kNoDataFound);
      return { id, purposeName: purposeData.purposeName };
    } catch (error) {
      return kInternalError;
    }
  }

  private async getUserData(reqData, extraAttr = [], extraFields = []) {
    try {
      const id = reqData.userId;
      if (!id) return kParamMissing('userId');
      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status', 'miscData', ...extraFields];
      const include = [masterInclude];
      const attributes = ['masterId', 'selfieId', ...extraAttr];
      const options = { include, where: { id } };
      const userData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      return userData;
    } catch (error) {
      return kInternalError;
    }
  }

  async getPurposeList() {
    try {
      const attributes = ['id', 'purposeName'];
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

  async getcommunicationLanguage(id) {
    try {
      if (!id) return kParamMissing('userId');
      const userData = await this.repository.getRowWhereData(
        ['communicationLanguage'],
        { where: { id } },
      );
      const lang = userData?.communicationLanguage;
      if (lang == 1 || lang == 2) return;
      let languageObject = [];
      kRegistrationFields.forEach((ele) => {
        if (ele.title == 'Communication Language')
          languageObject.push(ele.options);
      });
      return languageObject[0];
    } catch (error) {
      return kInternalError;
    }
  }

  //#region  #22 retake selfie route
  private async selfieRoute(masterData, userData, userDetails) {
    try {
      const statusData = masterData.status;
      // if (statusData.selfie != 2) return {};
      const approvedStatus = [1, 3];
      // Pending from user
      if (statusData.selfie == 2) {
        userData.loanId = userDetails.masterData.loanId;
        userData.currentStepTitle = kProfilePhotoInfo.title;
        userData.currentStepInfo = kProfilePhotoInfo.info;
        // Rejection from admin
        userData.dashboardInfo = SelfieRejected;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kTakeSelfieRoute },
          userDetails,
        );
      } else if (
        statusData.selfie == 0 &&
        approvedStatus.includes(statusData.bank)
      ) {
        userData.currentStepTitle = kVerificationInfo.title;
        userData.currentStepInfo = SelfieUnderVerification;
        return await this.syncUserRouteDetails(
          { userData, continueRoute: kNoRoute },
          userDetails,
        );
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region check App version
  checkAppVersion(deviceType, appVersion): any {
    if (deviceType == '2') return {};

    const route = 'updateAppRoute';
    const updateAppRoute = { route, continueRoute: route, userData: {} };
    try {
      const version = parseFloat(appVersion);
      if (version) {
        if (deviceType == '1' && IOS_VERSION > version) return updateAppRoute;
        else if (deviceType == '0' && ANDROID_VERSION > version)
          return updateAppRoute;
      } else return updateAppRoute;
    } catch (error) {
      return updateAppRoute;
    }
  }
  //#endregion

  //#region #Last if user not get any routes
  private async ifUserNotGetAnyRoutes(masterData, userData, userDetails) {
    try {
      const userId = userDetails.id;
      const loanId = masterData.loanId;
      const date = this.typeService.getGlobalDate(new Date()).toJSON();
      const createData = { userId, loanId, type: 'USER_STUCK', date };
      const where: any = { userId, type: 'USER_STUCK' };
      if (loanId) where.loanId = loanId;
      await this.userActivityRepository.findOrCreate(createData, where);
      return await this.syncUserRouteDetails(
        {
          userData,
          continueRoute: kNoRoute,
        },
        userDetails,
      );
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region get banner URL
  private async getBannerURL(gender: any, userId) {
    let bannerURL = bCommonRatesURL;
    let interest = 0;

    const checkInterest: any =
      await this.commonSharedService.getEligibleInterestRate({
        userId,
        checkBanner: true,
      });

    interest = (checkInterest?.interestRate ?? checkInterest).toFixed(3);
    const getBanner = checkInterest?.getBanner;

    if (gender) {
      if (gender.toUpperCase() == 'FEMALE')
        bannerURL = bannerOBJ['FEMALE'][interest];
      else bannerURL = bannerOBJ['MALE'][interest];
    }

    bannerURL = bannerURL ?? bCommonRatesURL;
    if (!getBanner) return { bannerURL: bDueRatesURL, interestRate: '' };

    return { bannerURL, interestRate: interest };
  }
  //#endregion

  async userMigration(page) {
    try {
      const limit = 5000;
      const offset = (page * limit).toFixed();
      const data = await this.repository.getTableWhereData(['id'], {
        offset,
        limit,
        order: [['updatedAt', 'desc']],
      });
      for (let index = 0; index < data.length; index++) {
        if (index % 100 == 0) console.log(page, index);
        const userId = data[index].id;
        await this.routeDetails({ id: userId });
      }
      return data;
    } catch (error) {}
  }

  //#region
  async submitInstalledApps(reqData) {
    try {
      let { userId, apps, deviceId, platform, deviceScore } = reqData;

      if (!userId) return kParamMissing('userId');
      if (!platform) return kParamMissing('platform');
      if (!deviceId) return kParamMissing('deviceId');

      if (!apps) {
        apps = [];
      }

      // getting pk of deviceId

      const attributes = ['id'];
      const options = { where: { deviceId, userId } };

      const result = await this.deviceRepo.getRowWhereData(attributes, options);
      if (!result) return k422ErrorMessage('No data found');
      if (result === k500Error) return kInternalError;
      await this.deviceRepo.update(
        { deviceScore: deviceScore },
        { id: result.id },
      );
      const { id: deviceIdPK } = result;
      const typeOfDevice = platform.toString();

      // filtering the app with non empty name or package name
      const filteredApps = [];

      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        try {
          const { appName, packageName } = app;

          let isValid = appName && packageName;

          if (!isValid) continue;

          isValid = LOAN_APPS.find(
            (loanApp) =>
              loanApp.package.toLowerCase() ===
              packageName.toString().toLowerCase(),
          );

          if (!isValid) continue;

          if (isValid) {
            filteredApps.push(app);
          }
        } catch (error) {}
      }

      const currenltyInstalledAppsId = [];

      let bulkCreateData = filteredApps.map((app) => {
        // generating unique id from, deviceId + packageName
        const deviceAppId = this.cryptService.getMD5Hash(
          deviceIdPK + app.packageName,
        );
        currenltyInstalledAppsId.push(deviceAppId);
        // 1 - installed, 0 - deleted
        const status = 1;

        return {
          ...app,
          deviceId: deviceIdPK,
          typeOfDevice,
          deviceAppId,
          status,
        };
      });

      const createResult = await this.installAppRepo.bulkCreate(
        bulkCreateData,
        {
          updateOnDuplicate: ['status'],
        },
      );
      if (createResult === k500Error) return kInternalError;

      // store count of appInstall in user repo
      if (filteredApps.length) {
        const updateData = { installAppCount: filteredApps?.length ?? 0 };
        await this.repository.updateRowData(updateData, userId);
      }
      const where = {
        deviceId: deviceIdPK,
        deviceAppId: {
          [Op.notIn]: currenltyInstalledAppsId,
        },
      };

      const updateResult = await this.installAppRepo.updateWhereData(
        {
          status: 0,
        },
        where,
      );

      if (updateResult === k500Error) return kInternalError;

      return createResult;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  private getExotelVerificationCallData() {
    const indexes = [0, 1, 2];
    const index = indexes[Math.floor(Math.random() * indexes.length)];
    return kExotelAppIds['USER_CALL_VERIFICATION_' + (index + 1)];
  }

  //add Device SIM Info Data
  async addDeviceSIMInfo(passData) {
    try {
      const userId = passData.userId;
      const simNumber = passData.simNumber;
      const operatorName = passData.operatorName;
      const simNumber2 = passData?.simNumber2;
      const operatorName2 = passData?.operatorName2;
      let isActive;
      const simWhere = { where: { userId } };
      const simData = await this.DeviceSIMRepo.getTableWhereData(
        ['id', 'simNumber'],
        simWhere,
      );
      if (simData == k500Error) return k500Error;
      const allNumbers = [];
      simData.map((el) => allNumbers.push(el.simNumber));
      if (allNumbers.includes(simNumber)) {
        isActive = '1';
        const sameUpdateData = {
          isActive,
          operatorName,
          simNumber2,
          operatorName2,
        };
        const sameUpdateOp = { where: { userId, simNumber } };
        const sameUpdate = await this.DeviceSIMRepo.updateWhereData(
          sameUpdateData,
          sameUpdateOp,
        );
        if (sameUpdate == k500Error) return kInternalError;
        isActive = '0';
        const updateOp = {
          where: { userId, simNumber: { [Op.ne]: simNumber } },
        };
        return await this.DeviceSIMRepo.updateWhereData({ isActive }, updateOp);
      } else {
        isActive = '1';
        const data = {
          userId,
          isActive,
          simNumber,
          operatorName,
          simNumber2,
          operatorName2,
        };
        const createRow = await this.DeviceSIMRepo.createRowData(data);
        if (createRow == k500Error) return kInternalError;
        isActive = '0';
        const updateOp = {
          where: { userId, simNumber: { [Op.ne]: simNumber } },
        };
        return await this.DeviceSIMRepo.updateWhereData({ isActive }, updateOp);
      }
    } catch (error) {
      return kInternalError;
    }
  }

  //#region
  async lastOnlineTime(userId): Promise<any> {
    const lastOnlineTime = new Date().toJSON();
    const isInstallApp = this.typeService.getGlobalDate(new Date()).toJSON();
    const data = {
      userId,
      type: 'LAST_ONLINE',
      date: isInstallApp,
    };
    Promise.all([
      this.updateDefaulterOnline(userId, isInstallApp),
      this.userActivityRepository.createRowData(data),
      this.repository.updateRowData({ lastOnlineTime }, userId),
    ]);
    // Updating User's Time Usage Stats
    this.userSharedService.getUserTimeStatics(userId);
  }
  //#endregion

  private async updateDefaulterOnline(userId, isInstallApp) {
    try {
      // Check existing data
      // Preparation -> Query
      const userAttr = ['loanStatus'];
      const userOptions = { where: { id: userId } };
      // Hit -> Query
      const userData = await this.repoManager.getRowWhereData(
        registeredUsers,
        userAttr,
        userOptions,
      );
      // Validation -> Query data
      if (userData == k500Error) throw new Error();
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData.loanStatus != 3) return {};

      const options = { where: { userId }, order: [['lastOnline', 'DESC']] };
      const defaulterTimeData = await this.defaulterOnlineRepo.getRoweData(
        ['id', 'lastOnline', 'adminId', 'loanId'],
        options,
      );
      let lastTime: any = '';
      if (defaulterTimeData && defaulterTimeData !== k500Error)
        lastTime = this.typeService.getDateFormatted(
          defaulterTimeData.lastOnline,
        );
      const currentTime = this.typeService.getDateFormatted(isInstallApp);

      //Adding new entry only if it is a new day
      if (lastTime != currentTime || !defaulterTimeData) {
        await this.addDefaulterOnlineTime(userId, isInstallApp);
      } else {
        if (!defaulterTimeData?.adminId && defaulterTimeData?.loanId) {
          const att = ['id', 'followerId'];
          const options = {
            where: { id: defaulterTimeData.loanId, loanStatus: 'Active' },
          };
          const result = await this.loanRepo.getRowWhereData(att, options);
          if (!result || result === k500Error) return kInternalError;
          if (result.followerId)
            await this.defaulterOnlineRepo.updateRowData(
              { adminId: result.followerId },
              defaulterTimeData?.id,
            );
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }

  //#region adding defaulter online status
  async addDefaulterOnlineTime(userId, lastOnline) {
    try {
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'followerId'],
        required: true,
      };
      const emiAttr = ['id'];
      const options = {
        where: { userId, payment_status: '0', payment_due_status: '1' },
        include: [loanInclude],
      };
      const emiData: any = await this.emiRepo.getRowWhereData(emiAttr, options);
      if (!emiData || emiData === k500Error) return kInternalError;
      if (emiData?.id) {
        const createDefaulterLastOnline = {
          userId,
          loanId: emiData.loan?.id,
          lastOnline,
          adminId: emiData.loan?.followerId ?? null,
          crmId: null,
        };
        await this.defaulterOnlineRepo.create(createDefaulterLastOnline);
      }
    } catch (error) {
      return kInternalError;
    }
  }

  //#get company contact details
  async getCompanyContactInfo(userId) {
    // Validation -> Parameters
    if (!userId) return kParamMissing('userId');

    // Preparation -> Query
    const options = {
      where: { id: userId },
      include: [{ model: loanTransaction, attributes: ['id', 'loanStatus'] }],
    };
    // Hit -> Query
    const userData = await this.repository.getRowWhereData(
      ['id', 'appType'],
      options,
    );
    // Validation -> Query data
    if (userData === k500Error) throw new Error();
    if (!userData) return k422ErrorMessage(kNoDataFound);

    // Checks -> Loan status with respective platform type
    userData?.loanData.sort((a, b) => b?.id - a?.id);
    const lastLoanStatus = userData?.loanData[0]?.loanStatus ?? '';
    const appType = userData?.appType;
    let type = '';
    const lStatus = ['InProcess', 'Accepted'];
    if (lastLoanStatus == 'Active' && appType == '0') type = 'ACTIVELOAN';
    else if (lStatus.includes(lastLoanStatus) && appType == '0')
      type = 'INPROCESSLOAN';
    else if (lastLoanStatus == 'Active' && appType == '1')
      type = 'ACTIVELOANNBFC1';
    else if (lStatus.includes(lastLoanStatus) && appType == '1')
      type = 'INPROCESSLOANNBFC1';
    else if (lastLoanStatus == 'Rejected' || lastLoanStatus == '') {
      if (appType == '1') type = 'INPROCESSLOANNBFC1';
      else type = 'INPROCESSLOAN';
    } else {
      if (appType == '1') type = 'INPROCESSLOANNBFC1';
      else type = 'INPROCESSLOAN';
    }
    let contactData: any = {};

    if (type != '') {
      // Hit -> Query
      contactData = await this.staticConfigRepo.getRowWhereData(
        ['id', 'data'],
        { where: { type } },
      );
      // Validation -> Query data
      if (contactData === k500Error) throw new Error();
      if (!contactData) return k422ErrorMessage(kNoDataFound);
    }
    const contactInfo = contactData?.data
      ? JSON.parse(contactData?.data[0] ?? {})
      : {};

    return contactInfo;
  }

  //#region select Interest
  async selectInterest(userId: string, body: any) {
    try {
      const isInterestedInLoan = body.isInterestedInLoan;
      const isInterestedInGold = body.isInterestedInGold;
      const updateData: any = {};
      if (isInterestedInLoan) updateData.isInterestedInLoan = true;
      if (isInterestedInGold) updateData.isInterestedInGold = true;
      const update = await this.repository.updateRowData(updateData, userId);
      if (update === k500Error) return k500Error;
      const result = await this.routeDetails({ id: userId });
      if (result?.rootRoute === kSelectInterestRoute && isInterestedInGold) {
        result.route = kGoldRouteRoute;
        if (!result?.userData?.augmountURL)
          result.userData.augmountURL = AUGMOUNT_URL;
      } else if (
        result?.rootRoute === kSelectInterestRoute &&
        isInterestedInLoan
      )
        result.route = kSelectPurposeRoute;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region red profile user
  async markAsRedProfile(reqData) {
    try {
      // Params validation
      const userId = reqData.id ?? reqData.userId;
      if (!userId) return kParamMissing('id');
      // find active loan
      const att = ['id'];
      const options = { where: { userId, loanStatus: 'Active' } };
      const result = await this.loanRepo.getRowWhereData(att, options);
      if (result === k500Error) return kInternalError;
      if (!result) return 0;
      // if no active loan then
      else {
        const dates = {
          registration: new Date().getTime(),
          basicDetails: 0,
          aadhaar: 0,
          employment: 0,
          banking: 0,
          residence: 0,
          eligibility: 0,
          eMandate: 0,
          eSign: 0,
          disbursement: 0,
        };
        let status = {
          pan: -1,
          pin: -1,
          bank: -1,
          loan: -2,
          basic: -1,
          eSign: -1,
          email: -1,
          phone: 1,
          selfie: -1,
          aadhaar: -1,
          company: -1,
          contact: -1,
          eMandate: -1,
          personal: -1,
          workMail: -1,
          reference: -1,
          repayment: -2,
          residence: -1,
          permission: -1,
          salarySlip: -1,
          disbursement: -1,
          professional: -1,
          isRedProfile: 2,
        };
        const createdData = await this.masterRepo.createRowData({
          status,
          dates,
          userId: userId,
          coolOffData: {},
        });
        if (createdData == k500Error) return kInternalError;
        if (!createdData) return k422ErrorMessage(kNoDataFound);
        const updateData = { isRedProfile: 2, masterId: createdData.id };
        await this.repository.updateRowData(updateData, userId);
      }
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  async getUserAppPermissions(reqData) {
    // Params handling
    const platform = +reqData.platform ?? 0;

    // Get permission list
    const attributes = ['id', 'title', 'img', 'asset', 'description'];
    const where: any = {};
    if (platform == 0) where.android = true;
    else if (platform == 1) where.IOS = true;
    else if (platform == 2) where.WEB = true;

    const options = { where };
    const permissionList = await this.userPermissionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (permissionList === k500Error) return kInternalError;

    // Fine tune
    const finalizedList = [];
    permissionList.forEach((el) => {
      const subTitle = el.description ?? '';
      finalizedList.push({
        id: el.id,
        title: el.title,
        subTitle: subTitle,
        subtitle: subTitle,
        img: el.img,
        asset: el.asset,
      });
    });
    return finalizedList;
  }

  // #start region send registered user whatsapp message
  async sendRegistrationWhatsappMsg(userId, userData) {
    try {
      const adminId = userData?.adminId ?? SYSTEM_ADMIN_ID;
      let number = this.cryptService.decryptPhone(userData?.phone);
      let whatsappOption: any = {};
      if (!gIsPROD) {
        number = UAT_PHONE_NUMBER[0];
        whatsappOption.email = kSupportMail;
      }
      whatsappOption.userId = userId;
      whatsappOption.number = number;
      whatsappOption.adminId = adminId;
      whatsappOption.title = 'Registration';
      whatsappOption.requestData = 'registration message';
      // await this.whatsappService.sendWhatsAppMessage(whatsappOption);
      this.whatsappService.sendWhatsAppMessageMicroService(whatsappOption);
    } catch (error) {
      return kInternalError;
    }
  }
  // #end region send registered user whatsapp message

  //Remove previous fcmToken if new User is login with same device id
  async removePreviousFcmToken(fcmToken, userId) {
    try {
      const options = {
        where: { fcmToken, id: { [Op.ne]: userId } },
      };
      const updateExistingFcmToken = await this.repository.updateRowWhereData(
        { fcmToken: '' },
        options,
      );
      if (updateExistingFcmToken == k500Error) return kInternalError;
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // add request support data
  async requestSupport(body) {
    // params validation
    const { userId, loanId, reason, connectVia, type } = body;
    if (!userId) return kParamMissing('userId');
    let lastStep = body?.lastStep;
    if (!lastStep) return kParamMissing('lastStep');
    if (lastStep == kWebviewRoute) {
      if (type == 'mAadhaar') lastStep = kAddAadhareNumberRoute;
      else if (type == 'SUBSCRIPTION') lastStep = kMandateRoute;
      else if (type == 'ESIGN') lastStep = kEsignRoute;
    }
    //get step
    lastStep = await this.getSteps(lastStep);
    const createData = await this.reqSupportRepo.create({
      userId,
      loanId,
      lastStep,
      reason,
      connectVia,
    });
    if (createData === k500Error) return kInternalError;
    return createData;
  }

  async getRequestSupportData(query) {
    try {
      const page = query?.page;
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const searchText = query?.searchText;
      const download = query?.download ?? false;
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      const options: any = { where: { createdAt: dateRange } };
      if (searchText) {
        if (searchText.startsWith('l-'))
          options.where.loanId = searchText.replace('l-', '');
      }
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes = [
        'userId',
        'loanId',
        'lastStep',
        'reason',
        'assign',
        'connectVia',
      ];

      const result = await this.reqSupportRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (result === k500Error) return kInternalError;
      const finalData = [];
      for (let i = 0; i < result.rows.length; i++) {
        try {
          const ele = result.rows[i];
          const temp = {};
          const userId = ele?.userId ?? '-';
          const userData = await this.repository.getTableWhereData(
            ['fullName', 'email', 'phone'],
            {
              where: { id: userId },
            },
          );
          if (userData == k500Error) continue;
          for (let i = 0; i < userData.length; i++) {
            try {
              const element = userData[i];
              temp['User ID'] = ele?.userId ?? '-';
              temp['Loan ID'] = ele?.loanId ?? '-';
              (temp['Name'] = element?.fullName ?? '-'),
                (temp['Email'] = element?.email ?? '-');
              temp['Phone'] =
                this.cryptService.decryptPhone(element?.phone) ?? '-';
              temp['Last Step'] = ele?.lastStep ?? '-';
              temp['Reason'] = ele?.reason ?? '-';
              temp['Assign'] = ele?.assign ?? '-';
              temp['Connect Via'] = ele?.connectVia ?? '-';
              finalData.push(temp);
            } catch (error) {}
          }
        } catch (error) {}
      }
      if (download === 'true') {
        const rawExcelData = {
          sheets: ['local-reports'],
          data: [finalData],
          sheetName: 'Need assistance.xlsx',
          needFindTuneKey: false,
        };
        const url: any = await this.fileService.objectToExcelURL(rawExcelData);
        if (url?.message) return url;
      } else {
        return { count: result.count, finalData };
      }
    } catch (error) {
      return kInternalError;
    }
  }

  //get stage according to step
  async getSteps(lastStep) {
    try {
      switch (lastStep) {
        case kEmploymentRoute:
          return 'employment';
        case kWorkEmailRoute:
          return 'employment';
        case kAddAadhareNumberRoute:
          return 'aadhaar';
        case kBankingRoute:
          return 'bank';
        case kAddAccountNumberRoute:
          return 'bank';
        case kAddIFSCRoute:
          return 'bank';
        case kSubmitResidenceProofRoute:
          return 'residence';
        case kTypeAddressRoute:
          return 'residence';
        case kAutomateResidenceRoute:
          return 'residence';
        case kCibilAddressRoute:
          return 'residence';
        case kPermissionRoute:
          return 'registration';
        case kBasicDetailsRoute:
          return 'registration';
        case kPersonalDetailsRoute:
          return 'registration';
        case kProfessionalDetailsRoute:
          return 'registration';
        case kMissingMonthRoute:
          return 'missing_bank';
        case kIsNeedTagSalaryRoute:
          return 'missing_bank';
        case kMandateRoute:
          return 'eMandate';
        case kEsignRoute:
          return 'eSign';
        case kRepaymentRoute:
          return 'repayment';
        case kReApplyRoute:
          return 'reapply';
        case kReuploadPanRoute:
          return 'pan';
        case kReferenceRoute:
          return 'reference';
        case kSelectLoanAmountRoute:
          return 'loan';
        case kKeyFactStatementRoute:
          return 'loan';
        case kTakeSelfieRoute:
          return 'selfie';
        case kSetPassCodeRoute:
          return 'pin';
        default:
          return '';
      }
    } catch (error) {
      return '';
    }
  }

  // save image
  async saveImageFrame(body) {
    const deviceId = body?.deviceId ?? '';
    const image = body?.image ?? '';
    const extra = body?.extra ?? {};
    const userId = extra?.userId;

    // Generate -> GCP Url
    const fileUrl = await this.fileService.base64ToFileURL(
      image,
      'png',
      kFrameImages,
    );
    if (fileUrl == k500Error) throw new Error();
    // Silent error so user won't get affected
    if (!fileUrl) return {};

    // Hit -> Query
    const creationData = { deviceId, userId, url: fileUrl };
    await this.repoManager.createRowData(FramesEntity, creationData);

    return {};
  }
}
