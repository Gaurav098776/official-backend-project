// Imports
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppProvider } from 'src/app/app.provider';
import { RedisModule } from 'src/redis/redis.module';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { BanksRepo } from 'src/repositories/bank_repository';
import { BanksRepository } from 'src/repositories/banks.repository';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { ESignRepository } from 'src/repositories/esign.repository';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { FlowRepository } from 'src/repositories/flow.repository';
import { DocHistoryRepository } from 'src/repositories/user.repository copy';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { ScoreRepository } from 'src/repositories/score.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { BankingSharedService } from 'src/shared/banking.service';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { ContactSharedService } from 'src/shared/contact.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { EmiSharedService } from 'src/shared/emi.service';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { LogsSharedService } from 'src/shared/logs.service';
import { UserSharedLogTrackerMiddleware } from 'src/shared/logtracker.middleware';
import { MandateSharedService } from 'src/shared/mandate.service';
import { MigrationSharedService } from 'src/shared/migration.service';
import { SharedModule } from 'src/shared/module/shared.module';
import { ResidenceSharedControllerV3 } from 'src/shared/residence.controller.v3';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { UserDeleteService } from 'src/shared/delete.user.service';
import { CibilService } from 'src/shared/cibil.service';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { InstaFinancialService } from 'src/thirdParty/instafinancial/instafinancial.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { CibilThirdParty } from 'src/thirdParty/cibil/cibil.service';
import { APIService } from 'src/utils/api.service';
import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { GmailService } from 'src/utils/gmail.service';
import { Msg91Service } from 'src/utils/msg91Sms';
import { SenderService } from 'src/utils/sender.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { BankingControllerV3 } from '../banking/banking.controller.v3';
import { BankingServiceV3 } from '../banking/banking.service.v3';
import { EmploymentControllerV3 } from '../employment/employment.controller.v3';
import { EmploymentServiceV3 } from '../employment/employment.service.v3';
import { EsignControllerV3 } from '../esign/esign.controller.v3';
import { EsignServiceV3 } from '../esign/esign.service.v3';
import { KycControllerV3 } from '../kyc/kyc.controller.v3';
import { KycServiceV3 } from '../kyc/kyc.service.v3';
import { LoanControllerV3 } from '../loan/loan.controller.v3';
import { LoanServiceV3 } from '../loan/loan.service.v3';
import { MandateControllerV3 } from '../mandate/mandate.controller.v3';
import { MandateServiceV3 } from '../mandate/mandate.service.v3';
import { NotificationControllerV3 } from '../notification/notification.controller.v3';
import { NotificationServiceV3 } from '../notification/notification.service.v3';
import { ResidenceControllerV3 } from '../residence/residence.controller.v3';
import { ResidenceServiceV3 } from '../residence/residence.service.v3';
import { PassCodeServiceV3 } from '../user/passcode.service.v3';
import { UserControllerV3 } from '../user/user.controller.v3';
import { UserServiceV3 } from '../user/user.service.v3';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
import { AssignmentService } from 'src/admin/assignment/assignment.service';
import { LocationService } from 'src/admin/location/location.service';
import { NSModel } from 'src/admin/cibil_score/model/ns.tudf.model';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { LocationControllerV3 } from '../location/location.controller.v3';
import { LocationServiceV3 } from '../location/location.service.v3';
import { DefaulterSharedService } from 'src/shared/defaulter.shared.service';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { AdminService } from 'src/admin/admin/admin.service';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { CrmRepository } from 'src/repositories/crm.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { OneMoneyService } from 'src/thirdParty/oneMoney/one.money.service';
import { HealthDataRepository } from 'src/repositories/healthData.repository';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { ContactControllerV3 } from '../contacts/contact.controller.v3';
import { ContactServiceV3 } from '../contacts/contact.service.v3';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { OtherPermissionDataRepository } from 'src/repositories/otherPermissionData.repository';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { LegalServiceV3 } from '../legal/legal.service.v3';
import { LegalControllerV3 } from '../legal/legal.controller.v3';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { ContactLogRepository } from 'src/repositories/contact.log.repository';
import { UniqueContactLogRepository } from 'src/repositories/unique.contact.log.repository';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { ReferralHistoryRepository } from 'src/repositories/referralHistory.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { RazorpayService } from 'src/utils/razorpay.service';
import { LegalService } from 'src/admin/legal/legal.service';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { NotificationService } from 'src/thirdParty/notificationService/notification.service';
import { LegalFormateService } from 'src/admin/legal/legal.fomate';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { MailService } from 'src/thirdParty/mail/email.service';
import { MiscControllerV3 } from '../misc/misc.controller.v3';
import { MiscServiceV3 } from '../misc/misc.service.v3';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { TransactionControllerV3 } from '../transaction/transaction.controller.v3';
import { ReferralControllerV3 } from '../referral/referral.controller.v3';
import { ReferralServiceV3 } from '../referral/referral.service.v3';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { BankingService } from 'src/admin/banking/banking.service';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { MediaControllerV3 } from '../media/media.controller.v3';
import { EMIService } from 'src/admin/emi/emi.service';
import { AARepository } from 'src/repositories/aa.repository';
import { GoogleCordinatesRepository } from 'src/repositories/googleCordinates.repository';
import { MediaSharedService } from 'src/shared/media.service';
import { KycSharedService } from 'src/shared/kyc.shared.service';
import { WebviewControllerV3 } from '../webview/webview.controller.v3';
import { WebviewServiceV3 } from '../webview/webview.service.v3';
import { UserService } from 'src/admin/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ContactRepository } from 'src/repositories/contact.repository';
import { MetricsControllerV3 } from '../metrics/metrics.controller';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { CRMSelectorService } from 'src/thirdParty/crm-services/crm-services.service';
import { KylasService } from 'src/thirdParty/crm-services/kylas/kylas.service';
import { CRMService } from 'src/admin/crm/crm.service';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { DefaulterPromoCodeRepository } from 'src/repositories/defaulterPromoCode.repository';
import { CrmReasonRepository } from 'src/repositories/Crm.reasons.repository';
import { TallyService } from 'src/admin/tally/tally.service';
import { SettlementRepository } from 'src/repositories/settlement.repository';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { ReportService } from 'src/admin/report/report.service';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { ReportEmiService } from 'src/admin/report/emi/report.emi.service';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { MarketingControllerv3 } from 'src/v3/marketing/marketing.controller.v3';
import { SharChatService } from 'src/thirdParty/sharChat/sharChat.service';
import { CIBILScoreService } from 'src/admin/cibil_score/cibilScore.service';
import { CIBILRepository } from 'src/repositories/cibil.repository';
import { CIBILTriggerRepository } from 'src/repositories/cibilTrigger.repository';
import { CIBILTxtToObjectService } from 'src/admin/cibil_score/cibilTxtToObject.service';
import { HDFCBankingService } from 'src/v3/banking/hdfc.service.v3';
import { commonNetBankingService } from 'src/v3/banking/commom.netbanking.service.v3';
import { FinvuRepository } from 'src/repositories/finvu.repository';
import { FinvuService } from 'src/thirdParty/finvu/finvu.service';
import { EmploymentService } from 'src/admin/employment/employment.service';
import { ManualVerifiedCompanyRepo } from 'src/repositories/manual.verified.company.repository';
import { CreditAnalystService } from 'src/admin/admin/creditAnalystRedis.service';
import { EligibilityService } from 'src/admin/eligibility/eligibility.service';
import { ESignService } from 'src/admin/esign/esign.service';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { DepartmentRepo } from 'src/repositories/department.respository';
import { SetuService } from 'src/thirdParty/setu/setu.service';
import { AnalysisService } from 'src/admin/analysis/analysis.service';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { CollectionReportRepository } from 'src/repositories/collectionReport.repository';
import { ResponseRepository } from 'src/repositories/response.repository';
import { SlackService } from 'src/thirdParty/slack/slack.service';

const repositories = [
  ContactRepository,
  AdminRepository,
  DefaulterPromoCodeRepository,
  AdminRoleRepository,
  AddressesRepository,
  AccessOfRoleRepository,
  AdminSubRoleModuleRepository,
  BanksRepo,
  BanksRepository,
  BankingRepository,
  BankListRepository,
  BlackListCompanyRepository,
  BranchesRepository,
  CompanyRepository,
  ChangeLogsRepository,
  EMIRepository,
  EmployementDegignationRepository,
  EmploymentHistoryRepository,
  EmployementSectoreRepository,
  ESignRepository,
  ExotelCallHistoryRepository,
  ExotelCategoryRepository,
  InstallAppRepository,
  KYCRepository,
  LegalNoticeRepository,
  LoanRepository,
  LocationRepository,
  MasterRepository,
  MediaRepository,
  MissMacthRepository,
  PurposeRepository,
  ReferenceRepository,
  RepositoryManager,
  SalarySlipRepository,
  FlowRepository,
  DocHistoryRepository,
  DeviceSIMRepository,
  UserDeleteRepository,
  ScoreRepository,
  StaticConfigRepository,
  StateEligibilityRepository,
  SubscriptionRepository,
  TransactionRepository,
  UniqueConatctsRepository,
  UserLoanDeclineRepository,
  UserRepository,
  UserSelfieRepository,
  WorkMailRepository,
  EmploymentRepository,
  MailTrackerRepository,
  StampRepository,
  BlockUserHistoryRepository,
  DeviceInfoInstallAppRepository,
  UserActivityRepository,
  ReasonRepository,
  PredictionRepository,
  ManualVerifiedWorkEmailRepository,
  CrmRepository,
  CrmStatusRepository,
  CrmTitleRepository,
  CrmDispositionRepository,
  DepartmentRepository,
  DepartmentRepo,
  DefaulterOnlineRepository,
  HealthDataRepository,
  LegalNoticeRepository,
  OtherPermissionDataRepository,
  LegalCollectionRepository,
  InsuranceRepository,
  ContactLogRepository,
  UniqueContactLogRepository,
  CibilScoreRepository,
  UserPermissionRepository,
  ConfigsRepository,
  AARepository,
  GoogleCordinatesRepository,
  DisbursmentRepository,
  ConfigsRepository,
  ReferralRepository,
  ReferralHistoryRepository,
  DisbursmentRepository,
  UserPermissionRepository,
  IpMasterRepository,
  CrmReasonRepository,
  SettlementRepository,
  ReportHistoryRepository,
  CIBILRepository,
  CIBILTriggerRepository,
  FinvuRepository,
  ManualVerifiedCompanyRepo,
  ReferralTransactionRepository,
  RequestSupportRepository,
  CollectionReportRepository,
  ResponseRepository,
  ReferralTransactionRepository
];
const thirdPartyServices = [
  AuthAiService,
  AutomationService,
  CashFreeService,
  exotelService,
  FinvuService,
  ReferenceRepository,
  CamsServiceThirdParty,
  GoogleService,
  InstaFinancialService,
  RazorpoayService,
  SigndeskService,
  ZoopService,
  Veri5Service,
  AwsService,
  GmailService,
  Msg91Service,
  CibilThirdParty,
  RazorpayService,
  NotificationService,
  MailService,
  OneMoneyService,
  CRMSelectorService,
  KylasService,
  ICICIThirdParty,
  SharChatService,
  CIBILScoreService,
  FinvuService,
  SetuService,
  SlackService
];
const moduleControllers = [
  BankingControllerV3,
  ContactControllerV3,
  EmploymentControllerV3,
  KycControllerV3,
  LoanControllerV3,
  LocationControllerV3,
  MandateControllerV3,
  MetricsControllerV3,
  NotificationControllerV3,
  ResidenceControllerV3,
  UserControllerV3,
  EsignControllerV3,
  LegalControllerV3,
  MediaControllerV3,
  MiscControllerV3,
  TransactionControllerV3,
  WebviewControllerV3,
  ReferralControllerV3,
  MarketingControllerv3,
];
const sharedControllers = [ResidenceSharedControllerV3];
const moduleServices = [
  BankingServiceV3,
  ContactServiceV3,
  EmploymentServiceV3,
  KycServiceV3,
  LoanServiceV3,
  LocationServiceV3,
  MandateServiceV3,
  NotificationServiceV3,
  PassCodeServiceV3,
  ResidenceServiceV3,
  UserServiceV3,
  EsignServiceV3,
  LegalServiceV3,
  MiscServiceV3,
  WebviewServiceV3,
  ReferralServiceV3,
];
const sharedServices = [
  AssignmentSharedService,
  BankingSharedService,
  CalculationSharedService,
  ContactSharedService,
  DefaulterSharedService,
  EligibilitySharedService,
  EmiSharedService,
  MandateSharedService,
  ResidenceSharedService,
  SharedNotificationService,
  ESignSharedService,
  AllsmsService,
  CommonSharedService,
  MetricsSharedService,
  MigrationSharedService,
  LogsSharedService,
  UserSharedService,
  UserDeleteService,
  UserDeleteService,
  CibilService,
  MediaSharedService,
  SharedTransactionService,
  KycSharedService,
  ReferralSharedService,
];
const otherServices = [
  PromoCodeService,
  APIService,
  CryptService,
  CommonService,
  TypeService,
  ValidationService,
  ZoopService,
  DeviceRepository,
  DownloaAppTrackRepo,
  UserLogTrackerRepository,
  TemplateRepository,
  SenderService,
  PredictionService,
  AssignmentService,
  LocationService,
  AdminService,
  NSModel,
  EMIService,
  BankingService,
  UserPermissionRepository,
  LegalService,
  LegalFormateService,
  LegalConsigmentRepository,
  UserService,
  CRMService,
  ReportService,
  ReportEmiService,
  HDFCBankingService,
  commonNetBankingService,
  AnalysisService,
  UserSharedLogTrackerMiddleware,
];
const adminServices = [
  BankingService,
  TallyService,
  CIBILTxtToObjectService,
  EmploymentService,
  EligibilityService,
  ESignService,
];

@Module({
  imports: [
    SharedModule,
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    }),
  ],
  controllers: [...moduleControllers, ...sharedControllers],
  providers: [
    ...adminServices,
    ...sharedServices,
    ...repositories,
    ...AppProvider,
    ...moduleServices,
    ...otherServices,
    ...thirdPartyServices,
    JwtService,
    CreditAnalystService,
  ],
})
export class AppModuleV3 implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserSharedLogTrackerMiddleware).forRoutes(
      {
        path: 'v3/user/logIn',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/verifyOTP',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/submitBasicDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/submitPersonalDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/submitProfessionalDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/setPassCode',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/user/uploadSelfie',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/employment/submitDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/employment/updateWorkEmail',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/employment/validateSalarySlip',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/employment/verifyOTP',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/banking/validateEligibility',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/banking/inviteForAA',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/banking/validateAA',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/banking/tagSalaries',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/banking/updateAccDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/kyc/validatemAadhaar',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/kyc/aadhaarOtpRequest',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/kyc/aadhaarOtpVerify',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/kyc/validatePan',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/kyc/submitPanDetails',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/residence/submitTypeAddress',
        method: RequestMethod.GET,
      },
      {
        path: 'v3/residence/requestAutomationURL',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/residence/validateAutomation',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/residence/submitProof',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/loan/submitReferences',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/loan/acceptAmount',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/loan/acceptKFS',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/loan/decline',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/mandate/generateLink',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/mandate/checkStatus',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/esign/inviteForESign',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/esign/checkEsingStatus',
        method: RequestMethod.POST,
      },
      {
        path: 'v3/esign/zoopCallBackURL',
        method: RequestMethod.POST,
      },
    );
  }
}
