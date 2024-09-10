// Imports
import { Module } from '@nestjs/common';
import { AppProvider } from 'src/app/app.provider';
import { RedisModule } from 'src/redis/redis.module';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { ESignRepository } from 'src/repositories/esign.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { CashFreeService } from 'src/thirdParty/cashfree/cashfree.service';
import { RazorpoayService } from 'src/thirdParty/razorpay/razorpay.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { CommonSharedService } from '../common.shared.service';
import { LogsSharedService } from '../logs.service';
import { MandateSharedService } from '../mandate.service';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { TemplateRepository } from 'src/repositories/template.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { AssignmentSharedService } from '../assignment.service';
import { CalculationSharedService } from '../calculation.service';
import { EmiSharedService } from '../emi.service';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { LoanSharedService } from '../loan.shared.service';
import { InsuranceRepository } from 'src/repositories/insurance.repository';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { PredictionRepository } from 'src/repositories/prediction.repository';
import { ResponseRepository } from 'src/repositories/response.repository';
const moduleControllers = [];
const repositories = [
  BankingRepository,
  LoanRepository,
  RepositoryManager,
  SubscriptionRepository,
  ValidationService,
  AdminRepository,
  AdminSubRoleModuleRepository,
  AccessOfRoleRepository,
  AdminRoleRepository,
  ESignRepository,
  UserLogTrackerRepository,
  DeviceInfoInstallAppRepository,
  EMIRepository,
  UserActivityRepository,
  MasterRepository,
  StaticConfigRepository,
  TemplateRepository,
  PurposeRepository,
  EmployementDegignationRepository,
  EmployementSectoreRepository,
  ManualVerifiedWorkEmailRepository,
  TemplateRepository,
  TransactionRepository,
  LegalNoticeRepository,
  ChangeLogsRepository,
  StaticConfigRepository,
  LegalCollectionRepository,
  EmploymentRepository,
  KYCRepository,
  CibilScoreRepository,
  InsuranceRepository,
  IpMasterRepository,
  PredictionRepository,
  ResponseRepository
];
const moduleServices = [MandateSharedService];
const otherServices = [
  APIService,
  CryptService,
  TypeService,
  ValidationService,
  CommonSharedService,
  AwsService,
  LogsSharedService,
  AssignmentSharedService,
  CalculationSharedService,
  EmiSharedService,
  CalculationSharedService,
  EmiSharedService,
  AssignmentSharedService,
  LoanSharedService,
];
const thirdPartyServices = [
  CashFreeService,
  RazorpoayService,
  SigndeskService,
  UserRepository,
  UserSelfieRepository,
  AdminRepository,
  AdminSubRoleModuleRepository,
  AccessOfRoleRepository,
  AdminRoleRepository,
];

@Module({
  imports: [
    RedisModule.register({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    }),
  ],
  controllers: [...moduleControllers],
  providers: [
    ...repositories,
    ...AppProvider,
    ...moduleServices,
    ...otherServices,
    ...thirdPartyServices,
  ],

  exports: [CommonSharedService],
})
export class SharedModule {}
