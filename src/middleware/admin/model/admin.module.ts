// Imports
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppProvider } from 'src/app/app.provider';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { CIBILRepository } from 'src/repositories/cibil.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { FlowRepository } from 'src/repositories/flow.repository';
import { DocHistoryRepository } from 'src/repositories/user.repository copy';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { CIBILScoreController } from '../cibil_score/cibilScore.controller';
import { CIBILScoreService } from '../cibil_score/cibilScore.service';
import { CIBILTxtToObjectService } from '../cibil_score/cibilTxtToObject.service';
import { EmploymentController } from '../employment/employment.controller';
import { EmploymentService } from '../employment/employment.service';
import { SalaryService } from '../employment/salary.service';
import { WorkMailService } from '../employment/workMail.service';
import { TransactionController } from '../transaction/transaction.controller';
import { TransactionService } from '../transaction/transaction.service';
import { AdminListController } from '../list/admin.list.controller';
import { AdminListService } from '../list/admin.list.service';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { BankingController } from '../banking/banking.controller';
import { BankingService } from '../banking/banking.service';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { ReportController } from '../report/report.controller';
import { ReportSubscriptionService } from '../report/subscription/report.subscription.service';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { UserRepository } from 'src/repositories/user.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { ReportAnalysisService } from '../report/analysis/report.analysis.service';
import { DefaulterController } from '../defaulter/defaulter.controller';
import { DefaulterService } from '../defaulter/defaulter.service';
import { ESignRepository } from 'src/repositories/esign.repository';
import { ESignController } from '../esign/esign.controller';
import { ESignService } from '../esign/esign.service';
import { MandateController } from '../mandate/mandate.controller';
import { MandateService } from '../mandate/mandate.service';
import { DashboardLoanService } from '../loan/dashboard.loan.service';
import { KycDashboardService } from '../kyc/kyc.service';
import { BankingRepository } from 'src/repositories/banking.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { ReportService } from '../report/report.service';
import { BanksRepository } from 'src/repositories/banks.repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { LegalController } from '../legal/legal.controller';
import { LegalService } from '../legal/legal.service';
import { ReportMLService } from '../report/ML/report.ml.service';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { LegalNoticeController } from '../legalNotice/legalNotice.controller';
import { LegalNoticeService } from '../legalNotice/legalNotice.service';
import { GmailService } from 'src/utils/gmail.service';
import { SalaryGradeRepository } from 'src/repositories/salaryGrade.repository';
import { SalaryRangeRepository } from 'src/repositories/salaryRange.repository';
import { ScoreController } from '../score/score.controller';
import { ScoreService } from '../score/score.service';
import { ScoreCardRepository } from 'src/repositories/scoreCard.repository';
import { ScoringFieldRepository } from 'src/repositories/scoreField.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { LocationRepository } from 'src/repositories/location.repository';
import { ValidationService } from 'src/utils/validation.service';
import { AdminNotificationController } from '../notification/admin.notification.contoller';
import { TemplateRepository } from 'src/repositories/template.repository';
import { NotificationService } from 'src/thirdParty/notificationService/notification.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { TransactionDevelopmentService } from '../transaction/trans.dev.service';
import { ReportEmiService } from '../report/emi/report.emi.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { AnalysisController } from '../analysis/analysis.controller';
import { AnalysisService } from '../analysis/analysis.service';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { AdminVerificationController } from '../adminVerification/verification.controller';
import { AdminVerificationService } from '../adminVerification/verification.service';
import { MasterRepository } from 'src/repositories/master.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { ManualVerifiedCompanyRepo } from 'src/repositories/manual.verified.company.repository';
import { VerificationPrepare } from '../adminVerification/verification.prepare';
import { UserServiceV3 } from 'src/v3/user/user.service.v3';
import { CommonService } from 'src/utils/common.service';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { EmiSharedService } from 'src/shared/emi.service';
import { CibilService } from 'src/shared/cibil.service';
import { NSModel } from 'src/admin/cibil_score/model/ns.tudf.model';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { CibilThirdParty } from 'src/thirdParty/cibil/cibil.service';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { ScoreRepository } from 'src/repositories/score.repository';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { RefundService } from '../transaction/refund.service';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { CrmReasonRepository } from 'src/repositories/Crm.reasons.repository';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { ResidenceController } from '../residence/residence.controller';
import { ResidenceService } from '../residence/residence.service';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { BankingSharedService } from 'src/shared/banking.service';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { KycController } from '../kyc/kyc.controller';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { EligibilityController } from 'src/admin/eligibility/eligibility.controller';
import { EligibilityService } from 'src/admin/eligibility/eligibility.service';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
import { AssignmentService } from 'src/admin/assignment/assignment.service';
import { LocationService } from 'src/admin/location/location.service';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { SigndeskMandateService } from 'src/admin/mandate/signdesk.mandate.service.v2';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { RedisModule } from 'src/redis/redis.module';
import { SharedModule } from 'src/shared/module/shared.module';
import { SenderService } from 'src/utils/sender.service';
import { MigrationSharedService } from 'src/shared/migration.service';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { AuthMiddleware } from 'src/middleware/auth.middleware';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { Msg91Service } from 'src/utils/msg91Sms';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { CRMController } from 'src/admin/crm/crm.controller';
import { CRMService } from 'src/admin/crm/crm.service';
import { CrmRepository } from 'src/repositories/crm.repository';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { CrmDispositionRepo } from 'src/repositories/crm.disposition';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { DepartmentRepo } from 'src/repositories/department.respository';
import { LoanController } from 'src/admin/loan/loan.controller';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { DashboardDisbursement } from 'src/admin/disbursement/disbursementDeshboard.service';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { ContactSharedService } from 'src/shared/contact.service';
import { UserDeleteService } from 'src/shared/delete.user.service';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { LoanService } from 'src/admin/loan/loan.service';
import { ElephantService } from 'src/thirdParty/elephant/elephant.service';
import { KycServiceV3 } from 'src/v3/kyc/kyc.service.v3';
import { DisbursementController } from 'src/admin/disbursement/disbursement.controller';
import { DisbursementService } from 'src/admin/disbursement/disbursement.service';
import { EmiController } from 'src/admin/emi/emi.controller';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { AppsFlyerService } from 'src/thirdParty/appsFlyer/appsFlyer.service';
import { EMIService } from 'src/admin/emi/emi.service';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { LegalFormateService } from 'src/admin/legal/legal.fomate';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { ServiceService } from 'src/admin/transaction/service/service.service';
import { ThirdPartyProviderRepo } from 'src/repositories/thirdpartyService.provider.repo';
import { ServiceController } from 'src/admin/transaction/service/service.controller';
import { ThirdPartyServiceRepo } from 'src/repositories/thirdParty.service.repo';
import { AARepository } from 'src/repositories/aa.repository';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { FinalVerificationService } from 'src/admin/adminVerification/finalVerification.service';
import { RoleManagementService } from 'src/admin/admin/roleManagement.service';
import { AdminRoleModuleRepository } from 'src/repositories/adminRoleModule.repository';
import { AccessOfListRepository } from 'src/repositories/access_of_list.repository';
import { APIAccessListRepository } from 'src/repositories/api_access_list.repository';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { MigrateLegalService } from 'src/admin/legal/migrate.legal.service';
import { MailService } from 'src/thirdParty/mail/email.service';
import { StringService } from 'src/utils/string.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { HealthDataRepository } from 'src/repositories/healthData.repository';
import { OtherPermissionDataRepository } from 'src/repositories/otherPermissionData.repository';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { QualityParameterController } from 'src/admin/qualityParameter/qualityParameter.controller';
import { QualityParameterService } from 'src/admin/qualityParameter/qualityParameter.service';
import { QualityParameterRepository } from 'src/repositories/qualityParameter.repository';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { CIBILTriggerRepository } from 'src/repositories/cibilTrigger.repository';
import { TallyController } from 'src/admin/tally/tally.controller';
import { TallyService } from 'src/admin/tally/tally.service';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { SettlementRepository } from 'src/repositories/settlement.repository';
import { GoogleCordinatesRepository } from 'src/repositories/googleCordinates.repository';
import { MediaController } from 'src/admin/media/media.controller';
import { MediaSharedService } from 'src/shared/media.service';
import { ResidenceServiceV3 } from 'src/v3/residence/residence.service.v3';
import { KycSharedService } from 'src/shared/kyc.shared.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { DefaulterPromoCodeRepository } from 'src/repositories/defaulterPromoCode.repository';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { MiscController } from 'src/admin/misc/misc.controller';
import { MiscService } from 'src/admin/misc/misc.service';
import { ipMasterService } from 'src/admin/ipMaster/ipMaster.service';
import { ipMasterController } from 'src/admin/ipMaster/ipMaster.controller';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { CRMSelectorService } from 'src/thirdParty/crm-services/crm-services.service';
import { KylasService } from 'src/thirdParty/crm-services/kylas/kylas.service';
import { JwtService } from '@nestjs/jwt';
import { MetricsController } from '../metrics/metrics.controller';
import { MetricsService } from '../metrics/metrics.service';
import { QAController } from 'src/qa/qa.controller';
import { QAService } from 'src/qa/qa.service';
import { CollectionDashboardController } from '../collectionDashboard/collectionDashboard.controller';
import { collectionDashboardService } from '../collectionDashboard/collectionDashboard.service';
import { CreditAnalystService } from '../admin/creditAnalystRedis.service';
import { MiscServiceV3 } from 'src/v3/misc/misc.service.v3';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { AdminDashboardController } from '../adminDashboard/dashboard.controller';
import { AdminDashboardService } from '../adminDashboard/dashboard.service';
import { MarketingService } from '../marketing/marketing.service';
import { MarketingController } from '../marketing/marketing.controller';
import { UserSharedLogTrackerMiddleware } from 'src/shared/logtracker.middleware';
import { SetuService } from 'src/thirdParty/setu/setu.service';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { ResponseRepository } from 'src/repositories/response.repository';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { CollectionReportRepository } from 'src/repositories/collectionReport.repository';
import { ReferralHistoryRepository } from 'src/repositories/referralHistory.repository';
import { TataTeleService } from 'src/thirdParty/tataTele/tataTele.service';
import { CallingService } from '../calling/calling.service';
import { CallingController } from '../calling/calling.controller';
import { RBIGuidelineRepository } from 'src/repositories/rbiGuideline.repository';
import { RBIGuidelineEntity } from 'src/entities/rbiGuideline.entity';
import { HealthService } from '../health/health.service';
import { HealthController } from '../health/health.controller';
import { AlertService } from '../alert/alert.service';
import { AlertController } from '../alert/alert.controller';
import { SlackService } from 'src/thirdParty/slack/slack.service';

const repositories = [
  AARepository,
  AddressesRepository,
  AdminRepository,
  AdminRoleRepository,
  AdminSubRoleModuleRepository,
  AccessOfRoleRepository,
  CrmDispositionRepository,
  CrmDispositionRepo,
  CrmRepository,
  CrmStatusRepository,
  CrmTitleRepository,
  CompanyRepository,
  DepartmentRepository,
  DepartmentRepo,
  InstallAppRepository,
  PredictionRepository,
  UserRepository,
  EmploymentRepository,
  SalarySlipRepository,
  EmploymentHistoryRepository,
  FlowRepository,
  DocHistoryRepository,
  UserDeleteRepository,
  ReportHistoryRepository,
  ChangeLogsRepository,
  TransactionRepository,
  BankingRepository,
  ExotelCallHistoryRepository,
  ExotelCategoryRepository,
  LoanRepository,
  SubscriptionRepository,
  TransactionRepository,
  ESignRepository,
  StaticConfigRepository,
  CrmTitleRepository,
  BanksRepository,
  BranchesRepository,
  LegalNoticeRepository,
  UserRepository,
  UniqueConatctsRepository,
  DeviceSIMRepository,
  DeviceInfoInstallAppRepository,
  InstallAppRepository,
  LocationRepository,
  MailTrackerRepository,
  EmployementSectoreRepository,
  SalaryRangeRepository,
  SalaryGradeRepository,
  ScoreCardRepository,
  ScoringFieldRepository,
  StampRepository,
  LocationRepository,
  CrmReasonRepository,
  ReferenceRepository,
  DownloaAppTrackRepo,
  MasterRepository,
  WorkMailRepository,
  EmploymentRepository,
  UserLogTrackerRepository,
  ManualVerifiedCompanyRepo,
  BankingRepository,
  PurposeRepository,
  UserSelfieRepository,
  CibilScoreRepository,
  BlackListCompanyRepository,
  ScoreRepository,
  StateEligibilityRepository,
  EmployementSectoreRepository,
  DefaulterOnlineRepository,
  DownloaAppTrackRepo,
  TemplateRepository,
  DeviceRepository,
  ReferenceRepository,
  MigrationSharedService,
  BlockUserHistoryRepository,
  ReasonRepository,
  UserActivityRepository,
  CrmRepository,
  ManualVerifiedWorkEmailRepository,
  DefaulterOnlineRepository,
  DisbursmentRepository,
  ManualVerifiedWorkEmailRepository,
  LegalCollectionRepository,
  ThirdPartyProviderRepo,
  ThirdPartyServiceRepo,
  LegalConsigmentRepository,
  ThirdPartyProviderRepo,
  ThirdPartyServiceRepo,
  AdminRoleModuleRepository,
  AccessOfListRepository,
  APIAccessListRepository,
  InsuranceRepository,
  UserPermissionRepository,
  SettlementRepository,
  GoogleCordinatesRepository,
  DefaulterPromoCodeRepository,
  IpMasterRepository,
  ConfigsRepository,
  UserLoanDeclineRepository,
  ReferralRepository,
  ResponseRepository,
  RequestSupportRepository,
  ReferralTransactionRepository,
  CollectionReportRepository,
  ReferralHistoryRepository,
  RBIGuidelineRepository,
];

const otherProviders = [
  RazorpoayService,
  ValidationService,
  LegalFormateService,
  MiscServiceV3,
];
const devServices = [TransactionDevelopmentService];
const thirdPartyServices = [
  AppsFlyerService,
  CamsServiceThirdParty,
  GoogleService,
  MailService,
  ElephantService,
  CRMSelectorService,
  KylasService,
  TataTeleService,
  SlackService,
];
const SharedServices = [MediaSharedService];

const adminServices = [HealthService];
const adminControllers = [HealthController];

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    }),
  ],
  controllers: [
    ...adminControllers,
    AdminController,
    AdminDashboardController,
    ServiceController,
    AdminListController,
    CIBILScoreController,
    CRMController,
    DisbursementController,
    EligibilityController,
    EmploymentController,
    LegalController,
    ReportController,
    TransactionController,
    DefaulterController,
    ESignController,
    MandateController,
    MetricsController,
    UserController,
    BankingController,
    LegalNoticeController,
    LoanController,
    ScoreController,
    DashboardController,
    AnalysisController,
    AdminNotificationController,
    AdminVerificationController,
    ResidenceController,
    KycController,
    AdminNotificationController,
    EmiController,
    QualityParameterController,
    TallyController,
    MediaController,
    MiscController,
    ipMasterController,
    QAController,
    CollectionDashboardController,
    MarketingController,
    CallingController,
    AlertController,
  ],
  providers: [
    ...adminServices,
    AdminDashboardService,
    EmiEntity,
    LegalService,
    AssignmentService,
    CRMService,
    DisbursementService,
    EligibilityService,
    EMIService,
    LocationService,
    EmiEntity,
    EmploymentService,
    LocationService,
    SalaryService,
    WorkMailService,
    BankingService,
    AdminService,
    CreditAnalystService,
    AdminListService,
    CIBILScoreService,
    TypeService,
    TransactionService,
    APIService,
    EMIRepository,
    RepositoryManager,
    LoanService,
    LoanRepository,
    CryptService,
    CIBILRepository,
    KYCRepository,
    FileService,
    SigndeskService,
    AuthAiService,
    CIBILTxtToObjectService,
    ReportSubscriptionService,
    ReportAnalysisService,
    DefaulterService,
    ESignService,
    MandateService,
    DashboardLoanService,
    KycDashboardService,
    ipMasterService,
    UserService,
    ReportAnalysisService,
    ReportMLService,
    LegalNoticeService,
    GmailService,
    PredictionService,
    PromoCodeService,
    ScoreService,
    MetricsService,
    DashboardService,
    ReportEmiService,
    RefundService,
    CashFreeService,
    NotificationService,
    AllsmsService,
    AnalysisService,
    NotificationService,
    CryptService,
    AnalysisService,
    AdminVerificationService,
    VerificationPrepare,
    UserServiceV3,
    CommonService,
    EligibilitySharedService,
    EmiSharedService,
    CibilService,
    CibilThirdParty,
    NSModel,
    RefundService,
    CashFreeService,
    ResidenceService,
    Veri5Service,
    ZoopService,
    SetuService,
    BankingSharedService,
    AssignmentSharedService,
    BankListRepository,
    MediaRepository,
    MissMacthRepository,
    ResidenceSharedService,
    ValidationService,
    AutomationService,
    SigndeskMandateService,
    exotelService,
    SharedNotificationService,
    ESignSharedService,
    MandateSharedService,
    CalculationSharedService,
    SenderService,
    AwsService,
    CommonSharedService,
    Msg91Service,
    DashboardDisbursement,
    ContactSharedService,
    ReportService,
    UserDeleteService,
    EmployementDegignationRepository,
    ServiceService,
    KycServiceV3,
    FinalVerificationService,
    RoleManagementService,
    MigrateLegalService,
    StringService,
    UserSharedService,
    HealthDataRepository,
    OtherPermissionDataRepository,
    UserSharedService,
    HealthDataRepository,
    OtherPermissionDataRepository,
    CIBILTriggerRepository,
    MigrateLegalService,
    QualityParameterService,
    QualityParameterRepository,
    WhatsAppService,
    TallyService,
    UserPermissionRepository,
    ResidenceServiceV3,
    KycSharedService,
    ReferralSharedService,
    MiscService,
    JwtService,
    QAService,
    AlertService,
    collectionDashboardService,
    UserSharedLogTrackerMiddleware,
    CallingService,
    ...AppProvider,
    ...devServices,
    ...repositories,
    ...otherProviders,
    ...thirdPartyServices,
    ...SharedServices,
    MarketingService,
    RBIGuidelineEntity,
  ],
})
export class AdminModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
