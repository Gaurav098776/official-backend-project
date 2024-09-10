// Imports
import {
  APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY,
  CHAT_DOCUMENTENTITY_REPOSITORY,
  EMPLOYEEDETAILS_HISTORY_REPOSITORY,
  EMPLOYEEDETAILS_REPOSITORY,
  LEGAL_NOTICE_REPOSITORY,
  LOANTRANSACTION_REPOSITORY,
  TOTAL_BANK_REPOSITORY,
  SALARYGRADE_REPOSITORY,
  SCORECARD_REPOSITORY,
  SCORINGFIELDGROUP_REPOSITORY,
  SCORINGFIELD_REPOSITORY,
  SCORING_REPOSITORY,
  USERHISTORY_REPOSITORY,
  USERNETBANKINGDETAILES_REPOSITORY,
  USER_REPOSITORY,
  EMIENTITY_REPOSITORY,
  ADMIN_REPOSITORY,
  LOCATION_REPOSITORY,
  DISBURSEMENTENTITY_REPOSITORY,
  CHANGE_LOGS_REPOSITORY,
  ADMINROLEMODULE_REPOSITORY,
  BANKING_REPOSITORY,
  GOOGLE_COORDINATES_REPOSITORY,
  SUBSCRIPTION_ENTITY,
  ESIGN_REPOSITORY,
  CRMACTIVITY_REPOSITORY,
  CRMTITLE_REPOSITORY,
  STAMP_REPOSITORY,
  STATE_ELIGIBILITY_REPOSITORY,
  TRANSACTION_REPOSITORY,
  CONTACT_DETAILS_REPOSITORY,
  MANUAL_VERIFIED_COMPANY_REPOSITORY,
  MANUAL_VERIFIED_WORK_EMAIL_REPOSITORY,
  DEVICE_REPOSITORY,
  DEVICE_INFO_AND_INSTALL_APP_REPOSITORY,
  BLOCK_USER_HISTORY_REPOSITORY,
  PREDICTION_REPOSITORY,
  TEST_REPOSITORY,
  MANDATE_REPOSITORY,
  REFERENCES_REPOSITORY,
  MISSMATCH_LOGS_REPOSITORY,
  UNIQUE_CONTACT_REPOSITORY,
  SALARY_SLIP_REPOSITORY,
  WORK_EMAIL_REPOSITORY,
  USERS_FLOW_DATA_REPOSITORY,
  ADDRESSES_REPOSITORY,
  KYC_REPOSITORY,
  DEPARTMENT_REPOSITORY,
  EMPLOYEMENT_SECTOR_ENTITY,
  DEGIGNATION_REPOSITORY,
  EMPLOYEMENT_TYPE_ENTITY,
  PURPOSE_REPOSITORY,
  CONFIGS_REPOSITORY,
  LEGAL_CONSIGNMENT_REPOSITORY,
  FLOW_REPOSITORY,
  SCOREGRADE_REPOSITORY,
  MAIL_TRACKER_REPOSITORY,
  USER_LOG_TRACKER_REPOSITORY,
  USER_SELFIE_REPOSITORY,
  CONFIGURATION_REPOSITORY,
  ADMINROLE_REPOSITORY,
  STATIC_CONFIG_REPOSITORY,
  USER_LOAN_DECLINE_REPOSITORY,
  EXOTEL_CALL_HISTORY_ENTITY,
  EXOTEL_CATEGORY_ENTITY,
  TEMPLATE_ENTITY,
  ADMIN_SUB_ROLE_MODULE_REPOSITORY,
  ACCESS_OF_LIST_REPOSITORY,
  ACCESS_OF_ROLE_REPOSITORY,
  API_ACCESS_LIST_REPOSITORY,
  CRM_DESCRIPTION_ENTITY,
  USER_PERMISSION_REPOSITORY,
  LEGAL_NOTICE_TRACKER_REPOSITORY,
  REASON_REPOSITORY,
  DEVICESIM_REPOSITORY,
  DELETE_USER,
  BLACKLIST_COMPANIES_REPOSITORY,
  CRMSTATUS_REPOSITORY,
  AUGMONT_TRANSACTION_REPOSITORY,
  REPORT_LIST_REPOSITORY,
  USER_ACTIVITY_REPOSITORY,
  CIBIL_REPOSITORY,
  API_LOGGER_REPOSITORY,
  CRM_REASON_REPOSITORY,
  THIRDPARTY_PROVIDER_REPOSITORY,
  THIRDPARTY_SERVICE_REPOSITORY,
  BANKS_REPOSITORY,
  BRANCHES_REPOSITORY,
  COMPANY_REPOSITORY,
  DOWNLOAD_APP_TRACK,
  MASTER_REPOSITORY,
  CRMDISPOSITION_REPOSITORY,
  DEFAULTER_ONLINE_ENTITY_REPOSITORY,
  LEGAL_COLLECTION,
  HEALTH_DATA_ENTITY_REPOSITORY,
  AA_REPOSITORY,
  OTHER_PERMISSION_DATA_ENTITY_REPOSITORY,
  INSURANCE_REPOSITORY,
  INSTALL_APP_REPOSITORY,
  CONTACT_LOG_REPOSITORY,
  UNIQUE_CONTACT_LOG_REPOSITORY,
  CRON_TRAKING_REPOSITORY,
  CIBIL_TRIGGER_REPOSITORY,
  CIBIL_SCORE_REPOSITORY,
  QUALITY_PARAMETERS_REPOSITORY,
  REFERRAL_REPOSITORY,
  REFERRAL_HISTORY_REPOSITORY,
  REFERRAL_TRANSACTION_REPOSITORY,
  RESPONSE_REPOSITORY,
  REPORT_HISTORY_REPOSITORY,
  SETTLEMENT_REPOSITORY,
  METRICS_REPOSITORY,
  IP_MASTER_REPOSITORY,
  PROMO_CODE_ENTITY_REPOSITORY,
  REQUEST_SUPPORT_REPOSITORY,
  FINVU_REPOSITORY,
  COLLECTION_REPORT,
  RBI_GUIDELINE_REPOSITORY,
  WHATSAPP_MESSAGE_REPOSITORY,
} from 'src/constants/entities';
import { registeredUsers } from 'src/entities/user.entity';
import { userHistory } from 'src/entities/user.history.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { ChatDocumentEntity } from 'src/entities/media.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { EmploymentHistoryDetailsEntity } from 'src/entities/employment.history.entity';
import { userNetBankingDetails } from 'src/entities/netBanking.entity';
import { LegalNoticeEntity } from 'src/entities/notice.entity';
import { BankList } from 'src/entities/bank.entity';
import { approvedLoanAmountFromSalary } from 'src/entities/salary.range.entity';
import { scoring } from 'src/entities/scoring.entity';
import { scoringFieldGroup } from 'src/entities/score.group.entity';
import { scoringField } from 'src/entities/score.field.entity';
import { scoreCard } from 'src/entities/score.card.entity';
import { salaryGrade } from 'src/entities/salary.grade.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { admin } from 'src/entities/admin.entity';
import { LocationEntity } from 'src/entities/location.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';
import { AdminRoleModuleEntity } from 'src/entities/role.module.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { GoogleCoordinatesEntity } from 'src/entities/googleCoordinates.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { crmActivity } from 'src/entities/crm.entity';
import { stamp } from 'src/entities/stamp.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { contactDetailEntity } from 'src/entities/contact.entity';
import { ManualVerifiedCompanyEntity } from 'src/entities/manual.verified.company.entity';
import { ManualVerifiedWorkEmailEntity } from 'src/entities/manualVerifiedWorkEmail.entity';
import { device } from 'src/entities/device.entity';
import { DeviceInfoAndInstallAppEntity } from 'src/entities/device.info.entity';
import { BlockUserHistoryEntity } from 'src/entities/block.user.history.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { TestEntity } from 'src/entities/test.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { ReferencesEntity } from 'src/entities/references.entity';
import { missMatchLogs } from 'src/entities/missMatchLogs.entity';
import { uniqueContactEntity } from 'src/entities/unique.contact.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { UsersFlowDataEntity } from 'src/entities/user.flow.entity';
import { AddressesEntity } from 'src/entities/addresses.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { crmTitle } from 'src/entities/crmTitle.entity';
import { Department } from 'src/entities/department.entity';
import { employmentSector } from 'src/entities/sector.entity';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentType } from 'src/entities/employment.type';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { LegalConsigment } from 'src/entities/legal.consignment.entity';
import { FlowEntity } from 'src/entities/flow.entity';
import { MailTrackerEntity } from 'src/entities/mail.tracker.entity';
import { AdminRole } from 'src/entities/admin.role.entity';
import { UserLogTracker } from 'src/entities/userLogTracker.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { EncryptionInterceptor } from 'src/intercept/resHandler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StaticConfigEntity } from 'src/entities/static.config.entity';
import { userLoanDecline } from 'src/entities/loan.decline.entity';
import { Configuration } from 'src/entities/configuration.entity';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';
import { StateEligibilty } from 'src/entities/stateEligibility.entity';
import { ExotelCategoryEntity } from 'src/entities/exotelCategory.entity';
import { TemplateEntity } from 'src/entities/template.entity';
import { AdminSubRoleModuleEntity } from 'src/entities/role.sub.module.entity';
import { AccessOfListEntity } from 'src/entities/access_of_list.entity';
import { AccessOfRoleEntity } from 'src/entities/access_of_role.entity';
import { APIAccessListEntity } from 'src/entities/api.list.entity';
import { crmDescription } from 'src/entities/crmDescription.entity';
import { UserPermissionEntity } from 'src/entities/userPermission.entity';
import { LegalNoticeTrackEntity } from 'src/entities/noticeLog.entity';
import { ReasonsEntity } from 'src/entities/Reasons.entity';
import { DeviceSIM } from 'src/entities/deviceSIM.entity';
import { BlacklistCompanyEntity } from 'src/entities/blacklistCompanies.entity';
import { crmStatus } from 'src/entities/crmStatus.entity';
import { AugmontTransactionEntity } from 'src/entities/augmont.transaction.entity';
import { ReportListEntity } from 'src/entities/report.list.entity';
import { UserActivityEntity } from 'src/entities/user.activity.entity';
import { ThirdPartyProvider } from 'src/entities/thirdpartyProviders.entities';
import { ThirdPartyServiceEntities } from 'src/entities/thirdParty.service.entities';
import { CIBILEntity } from 'src/entities/cibil.entity';
import { APILogsEntity } from 'src/entities/apilog.entity';
import { CrmReasonEntity } from 'src/entities/crm.reasons.entity';
import { banks } from 'src/entities/banks.entity';
import { branches } from 'src/entities/branches.entity';
import { GoogleCompanyResultEntity } from 'src/entities/company.entity';
import { DownloaAppTrack } from 'src/entities/downloads.app.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { crmDisposition } from 'src/entities/crmDisposition.entity';
import { DefaulterOnlineEntity } from 'src/entities/defaulterOnline.entity';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';
import { HealthDataEntity } from 'src/entities/healthData.entity';
import { OtherPermissionDataEntity } from 'src/entities/otherPermissionData.entity';
import { UserDelete } from 'src/entities/userDelete.entity';
import { AAEntity } from 'src/entities/aggregator.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { InstallAppEntity } from 'src/entities/InstallApp.entities';
import { ContactLogEntity } from 'src/entities/contact.log.entity';
import { UniqueContactLogEntity } from 'src/entities/unique.contact.log.entity';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { QualityParameterEntity } from 'src/entities/qualityParameter.entity';
import { cibilTriggerEntity } from 'src/entities/cibilTrigger.entity';
import { CronTrakingEntity } from 'src/entities/cron.track.entity';
import { ReferralEntity } from 'src/entities/referral.entity';
import { ReferralHistoryEntity } from 'src/entities/referralHistory.entity';
import { ReferralTransactionEntity } from 'src/entities/referralTransaction.entity';
import { ResponseEntity } from 'src/entities/response.entity';
import { ReportHistoryEntity } from 'src/entities/reportHistory.entity';
import { SettlementEntity } from 'src/entities/settlement.entity';
import { MetricsEntity } from 'src/entities/metrics.entity';
import { ipMasterEntity } from 'src/entities/ipMaster.entity';
import { PromoCodeEntity } from 'src/entities/promocode.entity';
import { RequestSupportEntity } from 'src/entities/request_support.entity';
import { EnvConfig } from 'src/configs/env.config';
import { FinvuEntity } from 'src/entities/finvu.entity';
import { CollectionReport } from 'src/entities/collectionReport.entity';
import { RBIGuidelineEntity } from 'src/entities/rbiGuideline.entity';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';
import { whatsappMSGEntity } from 'src/entities/whatsappMSGEntity';

export const AppProvider = [
  {
    provide: 'REDIS_CONNECTION_CONFIG_OPTIONS',
    useValue: {
      host: EnvConfig.database.redis.host,
      port: EnvConfig.database.redis.port,
      auth_pass: EnvConfig.database.redis.auth_pass,
    },
  },
  // Banking
  { provide: AA_REPOSITORY, useValue: AAEntity },

  { provide: APP_INTERCEPTOR, useValue: EncryptionInterceptor },

  //Profile
  {
    provide: USER_REPOSITORY,
    useValue: registeredUsers,
  },
  {
    provide: CONFIGURATION_REPOSITORY,
    useValue: Configuration,
  },
  {
    provide: LOCATION_REPOSITORY,
    useValue: LocationEntity,
  },
  {
    provide: GOOGLE_COORDINATES_REPOSITORY,
    useValue: GoogleCoordinatesEntity,
  },
  {
    provide: USERHISTORY_REPOSITORY,
    useValue: userHistory,
  },
  {
    provide: FLOW_REPOSITORY,
    useValue: FlowEntity,
  },

  //Employment
  {
    provide: EMPLOYEEDETAILS_REPOSITORY,
    useValue: employmentDetails,
  },
  {
    provide: EMPLOYEEDETAILS_HISTORY_REPOSITORY,
    useValue: EmploymentHistoryDetailsEntity,
  },
  {
    provide: EMPLOYEMENT_SECTOR_ENTITY,
    useValue: employmentSector,
  },
  {
    provide: SALARY_SLIP_REPOSITORY,
    useValue: SalarySlipEntity,
  },
  {
    provide: WORK_EMAIL_REPOSITORY,
    useValue: WorkMailEntity,
  },
  {
    provide: BLACKLIST_COMPANIES_REPOSITORY,
    useValue: BlacklistCompanyEntity,
  },

  //Loan
  {
    provide: LOANTRANSACTION_REPOSITORY,
    useValue: loanTransaction,
  },

  //EMI
  {
    provide: EMIENTITY_REPOSITORY,
    useValue: EmiEntity,
  },

  //Disbursement
  {
    provide: DISBURSEMENTENTITY_REPOSITORY,
    useValue: disbursementEntity,
  },

  //Media
  {
    provide: CHAT_DOCUMENTENTITY_REPOSITORY,
    useValue: ChatDocumentEntity,
  },

  //NetBanking
  {
    provide: USERNETBANKINGDETAILES_REPOSITORY,
    useValue: userNetBankingDetails,
  },
  {
    provide: BANKING_REPOSITORY,
    useValue: BankingEntity,
  },

  //Legal
  {
    provide: LEGAL_NOTICE_REPOSITORY,
    useValue: LegalNoticeEntity,
  },
  {
    provide: LEGAL_NOTICE_TRACKER_REPOSITORY,
    useValue: LegalNoticeTrackEntity,
  },

  //Bank
  {
    provide: TOTAL_BANK_REPOSITORY,
    useValue: BankList,
  },

  //Scoring
  {
    provide: APPROVEDLOANAMOUNTFROMSALARY_REPOSITORY,
    useValue: approvedLoanAmountFromSalary,
  },
  {
    provide: SALARYGRADE_REPOSITORY,
    useValue: salaryGrade,
  },
  {
    provide: SCORING_REPOSITORY,
    useValue: scoring,
  },
  {
    provide: SCORECARD_REPOSITORY,
    useValue: scoreCard,
  },
  {
    provide: SCOREGRADE_REPOSITORY,
    useValue: approvedLoanAmountFromSalary,
  },
  {
    provide: SCORINGFIELD_REPOSITORY,
    useValue: scoringField,
  },
  {
    provide: SCORINGFIELDGROUP_REPOSITORY,
    useValue: scoringFieldGroup,
  },

  //Admin
  {
    provide: ADMIN_REPOSITORY,
    useValue: admin,
  },
  {
    provide: API_LOGGER_REPOSITORY,
    useValue: APILogsEntity,
  },
  {
    provide: ADMINROLE_REPOSITORY,
    useValue: AdminRole,
  },
  {
    provide: CRMACTIVITY_REPOSITORY,
    useValue: crmActivity,
  },
  {
    provide: CRMTITLE_REPOSITORY,
    useValue: crmTitle,
  },
  { provide: CRMDISPOSITION_REPOSITORY, useValue: crmDisposition },
  {
    provide: ADMINROLEMODULE_REPOSITORY,
    useValue: AdminRoleModuleEntity,
  },
  {
    provide: CHANGE_LOGS_REPOSITORY,
    useValue: ChangeLogsEntity,
  },
  {
    provide: ADMIN_SUB_ROLE_MODULE_REPOSITORY,
    useValue: AdminSubRoleModuleEntity,
  },
  {
    provide: ACCESS_OF_LIST_REPOSITORY,
    useValue: AccessOfListEntity,
  },
  {
    provide: ACCESS_OF_ROLE_REPOSITORY,
    useValue: AccessOfRoleEntity,
  },
  {
    provide: API_ACCESS_LIST_REPOSITORY,
    useValue: APIAccessListEntity,
  },

  //Contacts
  {
    provide: CONTACT_DETAILS_REPOSITORY,
    useValue: contactDetailEntity,
  },
  {
    provide: CONTACT_LOG_REPOSITORY,
    useValue: ContactLogEntity,
  },
  {
    provide: UNIQUE_CONTACT_LOG_REPOSITORY,
    useValue: UniqueContactLogEntity,
  },
  //Mandate
  {
    provide: MANDATE_REPOSITORY,
    useValue: mandateEntity,
  },
  {
    provide: SUBSCRIPTION_ENTITY,
    useValue: SubScriptionEntity,
  },

  // Exotel -> 3rd Party
  {
    provide: EXOTEL_CALL_HISTORY_ENTITY,
    useValue: ExotelCallHistory,
  },
  {
    provide: EXOTEL_CATEGORY_ENTITY,
    useValue: ExotelCategoryEntity,
  },

  //ESign
  {
    provide: ESIGN_REPOSITORY,
    useValue: esignEntity,
  },
  {
    provide: STAMP_REPOSITORY,
    useValue: stamp,
  },
  {
    provide: STATE_ELIGIBILITY_REPOSITORY,
    useValue: StateEligibilty,
  },
  //Transactions
  {
    provide: TRANSACTION_REPOSITORY,
    useValue: TransactionEntity,
  },
  //  manual verified company
  {
    provide: MANUAL_VERIFIED_COMPANY_REPOSITORY,
    useValue: ManualVerifiedCompanyEntity,
  },
  {
    provide: MANUAL_VERIFIED_WORK_EMAIL_REPOSITORY,
    useValue: ManualVerifiedWorkEmailEntity,
  },
  //  device
  {
    provide: DEVICE_REPOSITORY,
    useValue: device,
  },
  {
    provide: DEVICESIM_REPOSITORY,
    useValue: DeviceSIM,
  },
  {
    provide: DELETE_USER,
    useValue: UserDelete,
  },
  {
    provide: DEVICE_INFO_AND_INSTALL_APP_REPOSITORY,
    useValue: DeviceInfoAndInstallAppEntity,
  },
  {
    provide: INSTALL_APP_REPOSITORY,
    useValue: InstallAppEntity,
  },
  {
    provide: BLOCK_USER_HISTORY_REPOSITORY,
    useValue: BlockUserHistoryEntity,
  },
  {
    provide: USER_LOG_TRACKER_REPOSITORY,
    useValue: UserLogTracker,
  },

  //Eligibility
  {
    provide: PREDICTION_REPOSITORY,
    useValue: PredictionEntity,
  },

  //Test
  {
    provide: TEST_REPOSITORY,
    useValue: TestEntity,
  },
  {
    provide: REFERENCES_REPOSITORY,
    useValue: ReferencesEntity,
  },
  { provide: MISSMATCH_LOGS_REPOSITORY, useValue: missMatchLogs },
  {
    provide: UNIQUE_CONTACT_REPOSITORY,
    useValue: uniqueContactEntity,
  },
  {
    provide: USERS_FLOW_DATA_REPOSITORY,
    useValue: UsersFlowDataEntity,
  },
  {
    provide: ADDRESSES_REPOSITORY,
    useValue: AddressesEntity,
  },
  {
    provide: KYC_REPOSITORY,
    useValue: KYCEntity,
  },
  {
    provide: DEPARTMENT_REPOSITORY,
    useValue: Department,
  },
  {
    provide: DEGIGNATION_REPOSITORY,
    useValue: employmentDesignation,
  },
  {
    provide: EMPLOYEMENT_TYPE_ENTITY,
    useValue: employmentType,
  },
  {
    provide: PURPOSE_REPOSITORY,
    useValue: loanPurpose,
  },
  {
    provide: CONFIGS_REPOSITORY,
    useValue: Configuration,
  },
  {
    provide: LEGAL_CONSIGNMENT_REPOSITORY,
    useValue: LegalConsigment,
  },
  {
    provide: MAIL_TRACKER_REPOSITORY,
    useValue: MailTrackerEntity,
  },
  {
    provide: USER_SELFIE_REPOSITORY,
    useValue: UserSelfieEntity,
  },
  {
    provide: STATIC_CONFIG_REPOSITORY,
    useValue: StaticConfigEntity,
  },

  {
    provide: USER_LOAN_DECLINE_REPOSITORY,
    useValue: userLoanDecline,
  },
  { provide: TEMPLATE_ENTITY, useValue: TemplateEntity },
  { provide: CRM_DESCRIPTION_ENTITY, useValue: crmDescription },

  // user permission
  {
    provide: USER_PERMISSION_REPOSITORY,
    useValue: UserPermissionEntity,
  },
  // user activity
  {
    provide: USER_ACTIVITY_REPOSITORY,
    useValue: UserActivityEntity,
  },
  {
    provide: REASON_REPOSITORY,
    useValue: ReasonsEntity,
  },
  {
    provide: CRMSTATUS_REPOSITORY,
    useValue: crmStatus,
  },

  /// aaugmont
  {
    provide: AUGMONT_TRANSACTION_REPOSITORY,
    useValue: AugmontTransactionEntity,
  },
  {
    provide: REPORT_LIST_REPOSITORY,
    useValue: ReportListEntity,
  },
  {
    provide: THIRDPARTY_PROVIDER_REPOSITORY,
    useValue: ThirdPartyProvider,
  },
  {
    provide: THIRDPARTY_SERVICE_REPOSITORY,
    useValue: ThirdPartyServiceEntities,
  },
  /// cibil
  {
    provide: CIBIL_REPOSITORY,
    useValue: CIBILEntity,
  },
  {
    provide: CIBIL_TRIGGER_REPOSITORY,
    useValue: cibilTriggerEntity,
  },
  {
    provide: CIBIL_SCORE_REPOSITORY,
    useValue: CibilScoreEntity,
  },
  {
    provide: CRM_REASON_REPOSITORY,
    useValue: CrmReasonEntity,
  },
  {
    provide: BANKS_REPOSITORY,
    useValue: banks,
  },
  { provide: COMPANY_REPOSITORY, useValue: GoogleCompanyResultEntity },

  // User
  {
    provide: MASTER_REPOSITORY,
    useValue: MasterEntity,
  },
  {
    provide: DOWNLOAD_APP_TRACK,
    useValue: DownloaAppTrack,
  },

  {
    provide: CRMDISPOSITION_REPOSITORY,
    useValue: crmDisposition,
  },
  // Bank
  {
    provide: BRANCHES_REPOSITORY,
    useValue: branches,
  },
  {
    provide: BANKS_REPOSITORY,
    useValue: banks,
  },
  {
    provide: DEFAULTER_ONLINE_ENTITY_REPOSITORY,
    useValue: DefaulterOnlineEntity,
  },
  {
    provide: PROMO_CODE_ENTITY_REPOSITORY,
    useValue: PromoCodeEntity,
  },
  {
    provide: LEGAL_COLLECTION,
    useValue: LegalCollectionEntity,
  },
  // health data
  {
    provide: HEALTH_DATA_ENTITY_REPOSITORY,
    useValue: HealthDataEntity,
  },
  //Other Permission Data
  {
    provide: OTHER_PERMISSION_DATA_ENTITY_REPOSITORY,
    useValue: OtherPermissionDataEntity,
  },
  {
    provide: INSURANCE_REPOSITORY,
    useValue: InsuranceEntity,
  },
  {
    provide: CRON_TRAKING_REPOSITORY,
    useValue: CronTrakingEntity,
  },
  {
    provide: QUALITY_PARAMETERS_REPOSITORY,
    useValue: QualityParameterEntity,
  },
  // Referral
  { provide: REFERRAL_REPOSITORY, useValue: ReferralEntity },
  { provide: REFERRAL_HISTORY_REPOSITORY, useValue: ReferralHistoryEntity },
  {
    provide: REFERRAL_TRANSACTION_REPOSITORY,
    useValue: ReferralTransactionEntity,
  },
  // Third party
  {
    provide: RESPONSE_REPOSITORY,
    useValue: ResponseEntity,
  },
  // Report
  {
    provide: REPORT_HISTORY_REPOSITORY,
    useValue: ReportHistoryEntity,
  },
  {
    provide: COLLECTION_REPORT,
    useValue: CollectionReport,
  },
  //razorpay and cashfree settlement
  {
    provide: SETTLEMENT_REPOSITORY,
    useValue: SettlementEntity,
  },
  {
    provide: METRICS_REPOSITORY,
    useValue: MetricsEntity,
  },
  // Ip master
  {
    provide: IP_MASTER_REPOSITORY,
    useValue: ipMasterEntity,
  },
  // Request Support
  {
    provide: REQUEST_SUPPORT_REPOSITORY,
    useValue: RequestSupportEntity,
  },
  // finvu
  {
    provide: FINVU_REPOSITORY,
    useValue: FinvuEntity,
  },
  //RBI Guideline
  {
    provide: RBI_GUIDELINE_REPOSITORY,
    useValue: RBIGuidelineEntity,
  },
  //Whatsapp MSG
  {
    provide: WHATSAPP_MESSAGE_REPOSITORY,
    useValue: whatsappMSGEntity,
  },
];
