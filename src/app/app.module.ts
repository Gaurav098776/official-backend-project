// Imports
import { AppService } from './app.service';
import { AppProvider } from './app.provider';
import {
  Global,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { APIService } from 'src/utils/api.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { DatabaseModule } from 'src/database/db.module';
import { ValidationService } from 'src/utils/validation.service';
import { CommonService } from 'src/utils/common.service';
import { Msg91Service } from 'src/utils/msg91Sms';
import { SenderService } from 'src/utils/sender.service';
import { GmailService } from 'src/utils/gmail.service';
import { AppModuleThirdParty } from 'src/thirdParty/appThirdParty/app.thirdParty.module';
import { UtilController } from 'src/utils/util.controller';
import { CryptService } from 'src/utils/crypt.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
import { exotelService } from 'src/thirdParty/exotel/exotel.service';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { RedisModule } from 'src/redis/redis.module';
import { AdminModule } from 'src/admin/model/admin.module';
import { AppModuleV3 } from 'src/v3/module/app.module.v3';
import { RouterModule } from 'nest-router';
import { SharedController } from 'src/shared/shared.controller';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { UserRepository } from 'src/repositories/user.repository';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { crmActivityRepository } from 'src/repositories/crmActivities.repository';
import { ScoreRepository } from 'src/repositories/score.repository';
import { EmiSharedService } from 'src/shared/emi.service';
import { LoanRepository } from 'src/repositories/loan.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { SseService } from 'src/utils/sse.service';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { CrmRepository } from 'src/repositories/crm.repository';
import { MigrationSharedService } from 'src/shared/migration.service';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { UserServiceV3 } from 'src/v3/user/user.service.v3';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { SharedModule } from 'src/shared/module/shared.module';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { ESignRepository } from 'src/repositories/esign.repository';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CibilService } from 'src/shared/cibil.service';
import { CibilThirdParty } from 'src/thirdParty/cibil/cibil.service';
import { NSModel } from 'src/admin/cibil_score/model/ns.tudf.model';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { PredictionService } from 'src/admin/eligibility/prediction.service';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { MandateSharedService } from 'src/shared/mandate.service';
import { AssignmentService } from 'src/admin/assignment/assignment.service';
import { LocationRepository } from 'src/repositories/location.repository';
import { LocationService } from 'src/admin/location/location.service';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { SendingBlueService } from 'src/thirdParty/sendingBlue/sendingBlue.service';
import { GoogleService } from 'src/thirdParty/google/google.service';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { BankingSharedService } from 'src/shared/banking.service';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { DateService } from 'src/utils/date.service';
import { EMIRepository } from 'src/repositories/emi.repository';
import { StringService } from 'src/utils/string.service';
import { UserSharedService } from 'src/shared/user.share.service';
import { HealthDataRepository } from 'src/repositories/healthData.repository';
import { OtherPermissionDataRepository } from 'src/repositories/otherPermissionData.repository';
import { AuthMiddleware } from 'src/middleware/auth.middleware';
import { ContactLogRepository } from 'src/repositories/contact.log.repository';
import { UniqueContactLogRepository } from 'src/repositories/unique.contact.log.repository';
import { ContactSharedService } from 'src/shared/contact.service';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { AdminNotificationService } from 'src/admin/notification/admin.notification.service';
import { DefaulterService } from 'src/admin/defaulter/defaulter.service';
import { CamsServiceThirdParty } from 'src/thirdParty/cams/cams.service.thirdParty';
import { CronTrakingRepository } from 'src/repositories/cron.traking.repository';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { ListService } from 'src/utils/list.service';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { GoogleCordinatesRepository } from 'src/repositories/googleCordinates.repository';
import { SharedTransactionService } from 'src/shared/transaction.service';
import { ResidenceServiceV3 } from 'src/v3/residence/residence.service.v3';
import { KycSharedService } from 'src/shared/kyc.shared.service';
import { UserService } from 'src/admin/user/user.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { RazorpayService } from 'src/utils/razorpay.service';
import { StampRepository } from 'src/repositories/stamp.repository';
import { LegalService } from 'src/admin/legal/legal.service';
import { LegalFormateService } from 'src/admin/legal/legal.fomate';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { MailService } from 'src/thirdParty/mail/email.service';
import { FunService } from 'src/utils/function.service';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { EmploymentServiceV3 } from 'src/v3/employment/employment.service.v3';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { InstaFinancialService } from 'src/thirdParty/instafinancial/instafinancial.service';
import { LogsSharedService } from 'src/shared/logs.service';
import { DataBaseService } from 'src/database/db.service';
import { CsQueryService } from 'src/database/cassandra/cs.query';
import { CsConnectService } from 'src/database/cassandra/cs.connect.service';
import { PgQueryService } from 'src/database/postgres/pg.query.service';
import { ResponseRepository } from 'src/repositories/response.repository';
import { AARepository } from 'src/repositories/aa.repository';
import { BankingServiceV3 } from 'src/v3/banking/banking.service.v3';
import { BankingService } from 'src/admin/banking/banking.service';
import { BanksRepository } from 'src/repositories/banks.repository';
import { BanksRepo } from 'src/repositories/bank_repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { OneMoneyService } from 'src/thirdParty/oneMoney/one.money.service';
import { CronService } from 'src/admin/cron/cron.service';
import { CronController } from 'src/admin/cron/cron.controller';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { ReferralHistoryRepository } from 'src/repositories/referralHistory.repository';
import { DefaulterSharedService } from 'src/shared/defaulter.shared.service';
import { ContactRepository } from 'src/repositories/contact.repository';
import { KycServiceV3 } from 'src/v3/kyc/kyc.service.v3';
import { AdminService } from 'src/admin/admin/admin.service';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { JwtService } from '@nestjs/jwt';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { KylasService } from 'src/thirdParty/crm-services/kylas/kylas.service';
import { CRMSelectorService } from 'src/thirdParty/crm-services/crm-services.service';
import { RefreshDataMiddleware } from 'src/middleware/refreshData.middleware';
import { TallyService } from 'src/admin/tally/tally.service';
import { SettlementRepository } from 'src/repositories/settlement.repository';
import { EMIService } from 'src/admin/emi/emi.service';
import { PromoCodeService } from 'src/shared/promo.code.service';
import { DefaulterPromoCodeRepository } from 'src/repositories/defaulterPromoCode.repository';
import { CRMService } from 'src/admin/crm/crm.service';
import { CrmReasonRepository } from 'src/repositories/Crm.reasons.repository';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { ReportService } from 'src/admin/report/report.service';
import { ReportEmiService } from 'src/admin/report/emi/report.emi.service';
import { NetbankingServiceV3 } from 'src/v3/banking/netbanking.service.v3';
import { DocModule } from 'src/doc/doc.module';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { CIBILScoreService } from 'src/admin/cibil_score/cibilScore.service';
import { CIBILRepository } from 'src/repositories/cibil.repository';
import { CIBILTriggerRepository } from 'src/repositories/cibilTrigger.repository';
import { CIBILTxtToObjectService } from 'src/admin/cibil_score/cibilTxtToObject.service';
import { SendGridService } from 'src/thirdParty/sendGrid/sendGrid.service';
import { IpCheckService } from 'src/shared/ipcheck.service';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { HDFCBankingService } from 'src/v3/banking/hdfc.service.v3';
import { commonNetBankingService } from 'src/v3/banking/commom.netbanking.service.v3';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { RedisService } from 'src/redis/redis.service';
import { FinvuRepository } from 'src/repositories/finvu.repository';
import { FinvuService } from 'src/thirdParty/finvu/finvu.service';
import { DigiLockerService } from 'src/thirdParty/digilocker/digilocker.service';
import { collectionDashboardService } from 'src/admin/collectionDashboard/collectionDashboard.service';
import { LoanService } from 'src/admin/loan/loan.service';
import { ElephantService } from 'src/thirdParty/elephant/elephant.service';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { QualityParameterService } from 'src/admin/qualityParameter/qualityParameter.service';
import { QualityParameterRepository } from 'src/repositories/qualityParameter.repository';
import { LoanSharedService } from 'src/shared/loan.shared.service';
import { TelegramService } from 'src/thirdParty/telegram/telegram.service';
import { EmploymentService } from 'src/admin/employment/employment.service';
import { ManualVerifiedCompanyRepo } from 'src/repositories/manual.verified.company.repository';
import { CreditAnalystService } from 'src/admin/admin/creditAnalystRedis.service';
import { MiscServiceV3 } from 'src/v3/misc/misc.service.v3';
import { EligibilityService } from 'src/admin/eligibility/eligibility.service';
import { ESignService } from 'src/admin/esign/esign.service';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { AppModuleV4 } from 'src/v4/module/app.module.v4';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { BankingServiceV4 } from 'src/v4/banking/banking.service.v4';
import { ContactServiceV4 } from 'src/v4/contacts/contact.service.v4';
import { EmploymentServiceV4 } from 'src/v4/employment/employment.service.v4';
import { EsignServiceV4 } from 'src/v4/esign/esign.service.v4';
import { KycServiceV4 } from 'src/v4/kyc/kyc.service.v4';
import { NetbankingServiceV4 } from 'src/v4/banking/netbanking.service.v4';
import { LegalServiceV4 } from 'src/v4/legal/legal.service.v4';
import { LoanServiceV4 } from 'src/v4/loan/loan.service.v4';
import { LocationServiceV4 } from 'src/v4/location/location.service.v4';
import { MandateServiceV4 } from 'src/v4/mandate/mandate.service.v4';
import { MiscServiceV4 } from 'src/v4/misc/misc.service.v4';
import { NotificationServiceV4 } from 'src/v4/notification/notification.service.v4';
import { ReferralServiceV4 } from 'src/v4/referral/referral.service.v4';
import { ResidenceServiceV4 } from 'src/v4/residence/residence.service.v4';
import { PassCodeServiceV4 } from 'src/v4/user/passcode.service.v4';
import { WebviewServiceV4 } from 'src/v4/webview/webview.service.v4';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { DepartmentRepo } from 'src/repositories/department.respository';
import { ApiMiddleware } from './api.middleware';
import { SetuService } from 'src/thirdParty/setu/setu.service';
import { CollectionReportRepository } from 'src/repositories/collectionReport.repository';
import { SlackService } from 'src/thirdParty/slack/slack.service';
import { AnalysisService } from 'src/admin/analysis/analysis.service';
import { UserSharedLogTrackerMiddleware } from 'src/shared/logtracker.middleware';
import { staticConfig } from 'src/constants/static.config';

import { MongooseModule } from '@nestjs/mongoose';
import { APILogger, APILoggerSchema } from 'src/entities/api_logger.schema';
import { EnvConfig } from 'src/configs/env.config';
import { CallingService } from 'src/admin/calling/calling.service';
import { TataTeleService } from 'src/thirdParty/tataTele/tataTele.service';
import { RBIGuidelineRepository } from 'src/repositories/rbiGuideline.repository';
import { RBIGuidelineEntity } from 'src/entities/rbiGuideline.entity';
import { HDFCBankingServiceV4 } from 'src/v4/banking/hdfc.service.v4';
import { commonNetBankingServiceV4 } from 'src/v4/banking/common.netbanking.service.v4';
import { RedisController } from 'src/redis/redis.controller';
import { KafkaService } from 'src/microservice/kafka/kafka.service';
import {
  UserOnlineTime,
  UserOnlineTimeSchema,
} from 'src/entities/user_online_time.schema';

export const routes = [
  {
    path: 'v4',
    module: AppModuleV4,
  },
];

const adminServices = [
  AdminNotificationService,
  CallingService,
  EMIService,
  BankingService,
  DefaulterService,
  LegalFormateService,
  PredictionService,
  MailService,
  TallyService,
  CIBILTxtToObjectService,
  collectionDashboardService,
  LoanService,
  QualityParameterService,
  CreditAnalystService,
  EligibilityService,
  ESignService,
];
const appV3Services = [
  BankingServiceV3,
  EmploymentServiceV3,
  NetbankingServiceV3,
  UserServiceV3,
  HDFCBankingService,
  commonNetBankingService,
  KycServiceV3,
];
const appV4Services = [
  BankingServiceV4,
  ContactServiceV4,
  EmploymentServiceV4,
  KycServiceV4,
  LocationServiceV4,
  MandateServiceV4,
  NotificationServiceV4,
  PassCodeServiceV4,
  ResidenceServiceV4,
  UserServiceV4,
  EsignServiceV4,
  LegalServiceV4,
  MiscServiceV4,
  WebviewServiceV4,
  ReferralServiceV4,
  NetbankingServiceV4,
  PassCodeServiceV4,
  LoanServiceV4,
  MiscServiceV3,
  UserSharedLogTrackerMiddleware,
  HDFCBankingServiceV4,
  commonNetBankingServiceV4,
];
const thirdPartyServices = [
  AuthAiService,
  CamsServiceThirdParty,
  TataTeleService,
  DigiLockerService,
  InstaFinancialService,
  MailService,
  OneMoneyService,
  RazorpayService,
  WhatsAppService,
  KylasService,
  CRMSelectorService,
  ICICIThirdParty,
  CIBILScoreService,
  FinvuService,
  ElephantService,
  TelegramService,
  SlackService,
];
const dbServices = [
  CsQueryService,
  CsConnectService,
  DataBaseService,
  PgQueryService,
  RedisService,
];
const utilsServices = [
  CryptService,
  FunService,
  ListService,
  StringService,
  RazorpayService,
  TypeService,
];
const sharedServices = [
  CommonSharedService,
  EligibilitySharedService,
  KycSharedService,
  LogsSharedService,
  MandateSharedService,
  MetricsSharedService,
  ContactSharedService,
  CalculationSharedService,
  UserSharedService,
  SharedTransactionService,
  ReferralSharedService,
  DefaulterSharedService,
  SharedNotificationService,
  PromoCodeService,
  AdminService,
  IpCheckService,
  ESignSharedService,
  LoanSharedService,
];
const repositories = [
  ConfigsRepository,
  UserLoanDeclineRepository,
  ContactRepository,
  AARepository,
  BanksRepository,
  BanksRepo,
  BranchesRepository,
  CrmRepository,
  DeviceSIMRepository,
  DisbursmentRepository,
  EmploymentHistoryRepository,
  HealthDataRepository,
  LegalCollectionRepository,
  OtherPermissionDataRepository,
  ReferenceRepository,
  CronTrakingRepository,
  UniqueConatctsRepository,
  LegalCollectionRepository,
  ReferralRepository,
  ReferralHistoryRepository,
  ReferralTransactionRepository,
  PredictionRepository,
  ResponseRepository,
  ScoreRepository,
  StampRepository,
  DisbursmentRepository,
  UserPermissionRepository,
  DefaulterOnlineRepository,
  GoogleCordinatesRepository,
  StampRepository,
  DisbursmentRepository,
  StampRepository,
  DisbursmentRepository,
  UserPermissionRepository,
  UserDeleteRepository,
  CrmReasonRepository,
  SettlementRepository,
  DefaulterPromoCodeRepository,
  ReportHistoryRepository,
  CIBILRepository,
  CIBILTriggerRepository,
  IpMasterRepository,
  RepositoryManager,
  FinvuRepository,
  InsuranceRepository,
  QualityParameterRepository,
  ConfigsRepository,
  UserLoanDeclineRepository,
  RequestSupportRepository,
  CollectionReportRepository,
  RBIGuidelineRepository,
];

const v3Services = [ResidenceServiceV3];

const modules = [DocModule];
@Global()
@Module({
  imports: [
    // Connection -> MongoDB
    MongooseModule.forRoot(
      `mongodb://${EnvConfig.database.mongodb.host}:${EnvConfig.database.mongodb.port}/${EnvConfig.database.mongodb.databaseName}`,
      {
        user: EnvConfig.database.mongodb.username,
        pass: EnvConfig.database.mongodb.password,
        authSource: 'admin',
      },
    ),
    // Injection -> MongoDB Schema
    MongooseModule.forFeature([
      { name: APILogger.name, schema: APILoggerSchema },
      { name: UserOnlineTime.name, schema: UserOnlineTimeSchema },
    ]),

    ...modules,
    DatabaseModule,
    SharedModule,
    AppModuleThirdParty,
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    }),
    AdminModule,
    AppModuleV3,
    AppModuleV4,
    RouterModule.forRoutes(routes),
  ],
  exports: [
    MongooseModule,
    DateService,
    FileService,
    JwtService,
    SseService,
    SendingBlueService,
    ...appV3Services,
    ...appV4Services,
    ...adminServices,
    ...dbServices,
    ContactLogRepository,
    UniqueContactLogRepository,
    ...thirdPartyServices,
    // ...repositories,
    ...sharedServices,
    ...utilsServices,
    ...v3Services,
    MongooseModule,
    KafkaService,
  ],
  controllers: [
    AppController,
    SharedController,
    UtilController,
    CronController,
    RedisController,
  ],
  providers: [
    ...appV3Services,
    ...appV4Services,
    ...adminServices,
    ...dbServices,
    ...utilsServices,
    ...repositories,
    ...sharedServices,
    ...utilsServices,
    ...v3Services,
    JwtService,
    APIService,
    AppService,
    AuthAiService,
    DateService,
    LegalService,
    LegalFormateService,
    TransactionRepository,
    BankingRepository,
    EmploymentRepository,
    ChangeLogsRepository,
    FileService,
    InstallAppRepository,
    GmailService,
    LoanRepository,
    ValidationService,
    ESignRepository,
    CommonService,
    Msg91Service,
    SenderService,
    SseService,
    exotelService,
    EmiSharedService,
    LegalConsigmentRepository,
    ExotelCallHistoryRepository,
    ExotelCategoryRepository,
    crmActivityRepository,
    BlackListCompanyRepository,
    CrmTitleRepository,
    CrmDispositionRepository,
    DepartmentRepo,
    DepartmentRepository,
    CrmStatusRepository,
    UserRepository,
    KYCRepository,
    UserSelfieRepository,
    MissMacthRepository,
    ResidenceSharedService,
    AutomationService,
    PurposeRepository,
    StateEligibilityRepository,
    CompanyRepository,
    BankingSharedService,
    UserServiceV3,
    MasterRepository,
    CrmTitleRepository,
    CrmDispositionRepository,
    CrmStatusRepository,
    AssignmentSharedService,
    BankListRepository,
    MigrationSharedService,
    MediaRepository,
    SalarySlipRepository,
    WorkMailRepository,
    DownloaAppTrackRepo,
    DeviceRepository,
    UserLogTrackerRepository,
    TemplateRepository,
    AllsmsService,
    MailTrackerRepository,
    AwsService,
    CibilService,
    NSModel,
    CibilScoreRepository,
    CibilThirdParty,
    AddressesRepository,
    AdminRepository,
    AdminSubRoleModuleRepository,
    AccessOfRoleRepository,
    AdminRoleRepository,
    BlockUserHistoryRepository,
    ReasonRepository,
    RazorpoayService,
    AssignmentService,
    LocationRepository,
    LocationService,
    SubscriptionRepository,
    CashFreeService,
    SigndeskService,
    StaticConfigRepository,
    UserActivityRepository,
    DeviceInfoInstallAppRepository,
    InstallAppRepository,
    ManualVerifiedWorkEmailRepository,
    ManualVerifiedWorkEmailRepository,
    EmployementDegignationRepository,
    EmployementSectoreRepository,
    LegalNoticeRepository,
    ContactLogRepository,
    UniqueContactLogRepository,
    AssignmentSharedService,
    EMIRepository,
    AssignmentSharedService,
    KycServiceV4,
    AdminService,
    ...AppProvider,
    ...thirdPartyServices,
    SendingBlueService,
    SendGridService,
    GoogleService,
    LegalService,
    LegalFormateService,
    CronService,
    LegalFormateService,
    MailService,
    ResidenceServiceV3,
    UserService,
    ZoopService,
    SetuService,
    Veri5Service,
    CRMService,
    ReportService,
    ReportEmiService,
    EmploymentService,
    ManualVerifiedCompanyRepo,
    AnalysisService,
    RBIGuidelineEntity,
    KafkaService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude({ path: 'v2/misc/getConfigs', method: RequestMethod.GET })
      .forRoutes('*');

    consumer.apply(ApiMiddleware).forRoutes('*');

    consumer
      .apply(RefreshDataMiddleware)
      .forRoutes(...staticConfig.refreshMiddlewareEndpoints);
  }
}
