// Imports
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppProvider } from 'src/app/app.provider';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { UserRepository } from 'src/repositories/user.repository';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { SenderService } from 'src/utils/sender.service';
import { TypeService } from 'src/utils/type.service';
import { CamsControllerThirdParty } from '../cams/cams.controller.thirdParty';
import { CamsServiceThirdParty } from '../cams/cams.service.thirdParty';
import { CashfreeController } from '../cashfree/cashfree.controller';
import { CashFreeService } from '../cashfree/cashfree.service';
import { Msg91Controller } from '../msg91/msg91.controller';
import { SendingBlueController } from '../sendingBlue/sendingBlue.controller';
import { MailService } from '../mail/email.service';
import { SigndeskService } from '../signdesk/signdesk.service';
import { SenseDataController } from '../senseData/sense.controller';
import { SenseDataService } from '../senseData/sense.service';
import { NetBankingRepository } from 'src/repositories/netBanking.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { SmsService } from '../sms91/sms91.service';
import { GmailService } from 'src/utils/gmail.service';
import { MixPanelController } from '../mixPanel/mixPanel.controller';
import { MixPanelService } from '../mixPanel/mixPanel.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { FlowRepository } from 'src/repositories/flow.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { SignDeskController } from '../signdesk/signdesk.controller';
import { RazorpayController } from '../razorpay/razorpay.controller';
import { RazorpoayService } from '../razorpay/razorpay.service';
import { CibilController } from 'src/thirdParty/cibil/cibil.controller';
import { CibilThirdParty } from 'src/thirdParty/cibil/cibil.service';
import { ICICIController } from 'src/thirdParty/icici/icici.controller';
import { ICICIThirdParty } from 'src/thirdParty/icici/icici.service';
import { EMIRepository } from 'src/repositories/emi.repository';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { AWSController } from '../awsServices/aws.controller';
import { AwsService } from '../awsServices/aws.service';
import { ContactRepository } from 'src/repositories/contact.repository';
import { Veri5Service } from '../veri5/veri5.service';
import { GoogleController } from '../google/google.controller';
import { GoogleService } from '../google/google.service';
import { exotelController } from '../exotel/exotel.controller';
import { exotelService } from '../exotel/exotel.service';
import { ExotelCallHistoryRepository } from 'src/repositories/exotelCallHistory.repository';
import { ExotelCategoryRepository } from 'src/repositories/exotelCategory.repository';
import { ZoopService } from '../zoop/zoop.service';
import { AugmontController } from '../augmont/augmont.controller';
import { AugmontService } from '../augmont/augmont.service';
import { BankingRepository } from 'src/repositories/banking.repository';
import { AugmontTransactionRepository } from 'src/repositories/augmont_transaction.repository';
import { ThirdPartyProviderRepo } from 'src/repositories/thirdpartyService.provider.repo';
import { ThirdPartyServiceRepo } from 'src/repositories/thirdParty.service.repo';
import { ValidationService } from 'src/utils/validation.service';
import { CompanyRepository } from 'src/repositories/google.company.repository';
import { AllsmsService } from '../SMS/sms.service';
import { crmActivityRepository } from 'src/repositories/crmActivities.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { DepartmentRepository } from 'src/repositories/department.repository';
import { DepartmentRepo } from 'src/repositories/department.respository';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { CrmRepository } from 'src/repositories/crm.repository';
import { RedisModule } from 'src/redis/redis.module';
import { CalculationSharedService } from 'src/shared/calculation.service';
import { MasterRepository } from 'src/repositories/master.repository';
import { EmiSharedService } from 'src/shared/emi.service';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { SMSController } from '../SMS/sms.controller';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { ElephantController } from '../elephant/elephant.controller';
import { ElephantService } from '../elephant/elephant.service';
import { ThirdPartyController } from '../thirdParty.controller';
import { AutomationService } from '../automation/automation.service';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { SendingBlueService } from '../sendingBlue/sendingBlue.service';
import { AppsFlyerController } from '../appsFlyer/appsFlyer.controller';
import { AppsFlyerService } from '../appsFlyer/appsFlyer.service';
import { OneMoneyService } from '../oneMoney/one.money.service';
import { OneMoneyController } from '../oneMoney/one.money.controller';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { BankingService } from 'src/admin/banking/banking.service';
import { AARepository } from 'src/repositories/aa.repository';
import { AuthAiService } from '../authAi/authAi.service';
import { BankingSharedService } from 'src/shared/banking.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { ResidenceSharedService } from 'src/shared/residence.service';
import { BankListRepository } from 'src/repositories/bankList.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { CommonService } from 'src/utils/common.service';
import { DeviceRepository } from 'src/repositories/device.repositoy';
import { ESignRepository } from 'src/repositories/esign.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { DownloaAppTrackRepo } from 'src/repositories/downloadTrack.repository';
import { MigrationSharedService } from 'src/shared/migration.service';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { Msg91Service } from 'src/utils/msg91Sms';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { InstallAppRepository } from 'src/repositories/installApps.repository';
import { BanksRepository } from 'src/repositories/banks.repository';
import { BanksRepo } from 'src/repositories/bank_repository';
import { BranchesRepository } from 'src/repositories/branches.repository';
import { WhatsAppController } from '../whatsApp/whatsApp.controller';
import { WhatsAppService } from '../whatsApp/whatsApp.service';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { KycServiceV4 } from 'src/v4/kyc/kyc.service.v4';
import { CibilService } from 'src/shared/cibil.service';
import { AdminService } from 'src/admin/admin/admin.service';
import { NSModel } from 'src/admin/cibil_score/model/ns.tudf.model';
import { BlockUserHistoryRepository } from 'src/repositories/user.blockHistory.repository';
import { ReasonRepository } from 'src/repositories/reasons.repository';
import { CRMSelectorService } from '../crm-services/crm-services.service';
import { CRMSelectorController } from '../crm-services/crm-services.controller';
import { KylasService } from '../crm-services/kylas/kylas.service';
import { TallyService } from 'src/admin/tally/tally.service';
import { SettlementRepository } from 'src/repositories/settlement.repository';
import { BlackListCompanyRepository } from 'src/repositories/blacklistCompanies.repository';
import { CRMService } from 'src/admin/crm/crm.service';
import { CrmReasonRepository } from 'src/repositories/Crm.reasons.repository';
import { LegalService } from 'src/admin/legal/legal.service';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { ReportService } from 'src/admin/report/report.service';
import { ReportHistoryRepository } from 'src/repositories/reportHistory.repository';
import { ReportEmiService } from 'src/admin/report/emi/report.emi.service';
import { CIBILScoreService } from 'src/admin/cibil_score/cibilScore.service';
import { CIBILRepository } from 'src/repositories/cibil.repository';
import { CIBILTriggerRepository } from 'src/repositories/cibilTrigger.repository';
import { CIBILTxtToObjectService } from 'src/admin/cibil_score/cibilTxtToObject.service';
import { SendGridService } from '../sendGrid/sendGrid.service';
import { SendGridController } from '../sendGrid/sendGrid.controller';
import { JwtService } from '@nestjs/jwt';
import { FinvuRepository } from 'src/repositories/finvu.repository';
import { DigiLockerController } from '../digilocker/digilocker.controller';
import { DigiLockerService } from '../digilocker/digilocker.service';
import { FinvuService } from '../finvu/finvu.service';
import { FinvuController } from '../finvu/finvu.controller';
import { TelegramService } from '../telegram/telegram.service';
import { TelegramController } from '../telegram/telegram.controller';
import { EmploymentService } from 'src/admin/employment/employment.service';
import { ManualVerifiedCompanyRepo } from 'src/repositories/manual.verified.company.repository';
import { AssignmentService } from 'src/admin/assignment/assignment.service';
import { CreditAnalystService } from 'src/admin/admin/creditAnalystRedis.service';
import { MiscServiceV3 } from 'src/v3/misc/misc.service.v3';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { UserLoanDeclineRepository } from 'src/repositories/userLoanDecline.repository';
import { EligibilityService } from 'src/admin/eligibility/eligibility.service';
import { ESignService } from 'src/admin/esign/esign.service';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { ESignSharedService } from 'src/shared/esign.shared.service';
import { BankingServiceV4 } from 'src/v4/banking/banking.service.v4';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { SetuService } from '../setu/setu.service';
import { CollectionReportRepository } from 'src/repositories/collectionReport.repository';
import { collectionDashboardService } from 'src/admin/collectionDashboard/collectionDashboard.service';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { ReferralTransactionRepository } from 'src/repositories/referralTransaction.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { RequestSupportRepository } from 'src/repositories/request_support.repository';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { DefaulterOnlineRepository } from 'src/repositories/defaulterOnline.repository';
import { ResponseRepository } from 'src/repositories/response.repository';
import { ReferralRepository } from 'src/repositories/referral.repository';
import { TataTeleController } from '../tataTele/tataTele.controller';
import { TataTeleService } from '../tataTele/tataTele.service';
import { SlackController } from '../slack/slack.controller';
import { SlackService } from '../slack/slack.service';

const repositories = [
  AARepository,
  AddressesRepository,
  BankListRepository,
  BanksRepository,
  BanksRepo,
  BranchesRepository,
  CompanyRepository,
  DeviceRepository,
  DeviceInfoInstallAppRepository,
  KYCRepository,
  ESignRepository,
  BankingRepository,
  DownloaAppTrackRepo,
  MasterRepository,
  EMIRepository,
  ExotelCategoryRepository,
  InstallAppRepository,
  FlowRepository,
  SubscriptionRepository,
  CrmTitleRepository,
  CrmDispositionRepository,
  DepartmentRepository,
  DepartmentRepo,
  CrmStatusRepository,
  CrmRepository,
  UserSelfieRepository,
  MailTrackerRepository,
  TemplateRepository,
  AdminRepository,
  StaticConfigRepository,
  AccessOfRoleRepository,
  AdminRoleRepository,
  ManualVerifiedWorkEmailRepository,
  AdminSubRoleModuleRepository,
  UserActivityRepository,
  EmployementSectoreRepository,
  PurposeRepository,
  EmployementDegignationRepository,
  LegalNoticeRepository,
  LegalNoticeRepository,
  ManualVerifiedWorkEmailRepository,
  StaticConfigRepository,
  MediaRepository,
  MissMacthRepository,
  LegalCollectionRepository,
  SalarySlipRepository,
  WorkMailRepository,
  CibilScoreRepository,
  BlockUserHistoryRepository,
  ReasonRepository,
  SettlementRepository,
  BlackListCompanyRepository,
  UserDeleteRepository,
  ReportHistoryRepository,
  CIBILRepository,
  CIBILTriggerRepository,
  FinvuRepository,
  ManualVerifiedCompanyRepo,
  ConfigsRepository,
  UserLoanDeclineRepository,
  StateEligibilityRepository,
  CollectionReportRepository,
  DisbursmentRepository,
  ReferralTransactionRepository,
  EmploymentHistoryRepository,
  PredictionRepository,
  StampRepository,
  ReferenceRepository,
  IpMasterRepository,
  RequestSupportRepository,
  DeviceSIMRepository,
  DefaulterOnlineRepository,
  ResponseRepository,
  ReferralRepository,
];
const adminServices = [
  BankingService,
  TallyService,
  CIBILScoreService,
  CIBILTxtToObjectService,
  EmploymentService,
  AssignmentService,
  CreditAnalystService,
  EligibilityService,
  ESignService,
  ESignSharedService,
  collectionDashboardService,
];
const thirdPartyService = [
  BankingSharedService,
  DigiLockerService,
  FinvuService,
  ResidenceSharedService,
  SharedNotificationService,
  FinvuService,
  SlackService,
  TelegramService,
  MiscServiceV3,
  SlackService,
];
const sharedServices = [MigrationSharedService, CommonService];
const v4Services = [BankingServiceV4, UserServiceV4, KycServiceV4];

@Module({
  exports: [SlackService],
  imports: [
    ConfigModule,
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    }),
  ],
  controllers: [
    CamsControllerThirdParty,
    CashfreeController,
    DigiLockerController,
    ElephantController,
    GoogleController,
    FinvuController,
    MixPanelController,
    Msg91Controller,
    RazorpayController,
    CibilController,
    ICICIController,
    SendingBlueController,
    SendGridController,
    SenseDataController,
    SignDeskController,
    SMSController,
    AWSController,
    exotelController,
    AugmontController,
    ThirdPartyController,
    AppsFlyerController,
    OneMoneyController,
    WhatsAppController,
    CRMSelectorController,
    FinvuController,
    SlackController,
    TelegramController,
    TataTeleController,
  ],
  providers: [
    ...adminServices,
    ...sharedServices,
    ...thirdPartyService,
    ...repositories,
    ...v4Services,
    AppsFlyerService,
    AutomationService,
    AuthAiService,
    EmiSharedService,
    ElephantService,
    CamsServiceThirdParty,
    CashFreeService,
    GoogleService,
    LoanRepository,
    CalculationSharedService,
    NetBankingRepository,
    MixPanelService,
    APIService,
    RepositoryManager,
    SigndeskService,
    TypeService,
    EmploymentRepository,
    UserLogTrackerRepository,
    UserRepository,
    ChangeLogsRepository,
    CryptService,
    SenderService,
    GmailService,
    crmActivityRepository,
    SmsService,
    MailService,
    SenseDataService,
    LocationRepository,
    TransactionRepository,
    RazorpoayService,
    CibilThirdParty,
    ICICIThirdParty,
    AwsService,
    ExotelCallHistoryRepository,
    exotelService,
    ContactRepository,
    Veri5Service,
    ZoopService,
    ValidationService,
    BankingRepository,
    AugmontTransactionRepository,
    ThirdPartyProviderRepo,
    ThirdPartyServiceRepo,
    AllsmsService,
    CommonSharedService,
    CryptService,
    SendingBlueService,
    SendGridService,
    AugmontService,
    OneMoneyService,
    ManualVerifiedWorkEmailRepository,
    StaticConfigRepository,
    AssignmentSharedService,
    Msg91Service,
    WhatsAppService,
    UserPermissionRepository,
    UserDeleteRepository,
    CibilService,
    AdminService,
    NSModel,
    KylasService,
    CRMSelectorService,
    CRMService,
    CrmReasonRepository,
    LegalService,
    LegalConsigmentRepository,
    ...AppProvider,
    ReportService,
    ReportEmiService,
    JwtService,
    SetuService,
    TataTeleService,
  ],
})
export class AppModuleThirdParty {}
