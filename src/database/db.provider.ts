// Imports
import { databaseConfig } from './db.config';
import { Sequelize } from 'sequelize-typescript';
import { EmiEntity } from 'src/entities/emi.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { LegalNoticeEntity } from 'src/entities/notice.entity';
import { mandateEntity } from 'src/entities/mandate.entity';
import { admin } from 'src/entities/admin.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { userLoanDecline } from 'src/entities/loan.decline.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { employmentType } from 'src/entities/employment.type';
import { employmentSector } from 'src/entities/sector.entity';
import { employmentDesignation } from 'src/entities/designation.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { EmploymentHistoryDetailsEntity } from 'src/entities/employment.history.entity';
import { userHistory } from 'src/entities/user.history.entity';
import { ChatDocumentEntity } from 'src/entities/media.entity';
import { userNetBankingDetails } from 'src/entities/netBanking.entity';
import { BankList } from 'src/entities/bank.entity';
import { scoreCard } from 'src/entities/score.card.entity';
import { scoringField } from 'src/entities/score.field.entity';
import { scoringFieldGroup } from 'src/entities/score.group.entity';
import { scoring } from 'src/entities/scoring.entity';
import { salaryGrade } from 'src/entities/salary.grade.entity';
import { approvedLoanAmountFromSalary } from 'src/entities/salary.range.entity';
import { LocationEntity } from 'src/entities/location.entity';
import { ChangeLogsEntity } from 'src/entities/change.logs.entity';
import { AdminRoleModuleEntity } from 'src/entities/role.module.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { GoogleCoordinatesEntity } from 'src/entities/googleCoordinates.entity';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { crmActivity } from 'src/entities/crm.entity';
import { stamp } from 'src/entities/stamp.entity';
import { StateEligibilty } from 'src/entities/stateEligibility.entity';
import { device } from 'src/entities/device.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { contactDetailEntity } from 'src/entities/contact.entity';
import { ManualVerifiedCompanyEntity } from 'src/entities/manual.verified.company.entity';
import { ManualVerifiedWorkEmailEntity } from 'src/entities/manualVerifiedWorkEmail.entity';
import { DeviceInfoAndInstallAppEntity } from 'src/entities/device.info.entity';
import { BlockUserHistoryEntity } from 'src/entities/block.user.history.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { TestEntity } from 'src/entities/test.entity';
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
import { LegalConsigment } from 'src/entities/legal.consignment.entity';
import { FlowEntity } from 'src/entities/flow.entity';
import { MailTrackerEntity } from 'src/entities/mail.tracker.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { YearOutstandingEntity } from 'src/entities/year.outstanding.entity';
import { Configuration } from 'src/entities/configuration.entity';
import { AdminRole } from 'src/entities/admin.role.entity';
import { UserLogTracker } from 'src/entities/userLogTracker.entity';
import { StaticConfigEntity } from 'src/entities/static.config.entity';
import { ExotelCallHistory } from 'src/entities/ExotelCallHistory.entity';
import { ExotelCategoryEntity } from 'src/entities/exotelCategory.entity';
import { TemplateEntity } from 'src/entities/template.entity';
import { AccessOfListEntity } from 'src/entities/access_of_list.entity';
import { AdminSubRoleModuleEntity } from 'src/entities/role.sub.module.entity';
import { AccessOfRoleEntity } from 'src/entities/access_of_role.entity';
import { APIAccessListEntity } from 'src/entities/api.list.entity';
import { crmDescription } from 'src/entities/crmDescription.entity';
import { LegalNoticeTrackEntity } from 'src/entities/noticeLog.entity';
import { UserPermissionEntity } from 'src/entities/userPermission.entity';
import { DeviceSIM } from 'src/entities/deviceSIM.entity';
import { UserDelete } from 'src/entities/userDelete.entity';
import { BlacklistCompanyEntity } from 'src/entities/blacklistCompanies.entity';
import { ReasonsEntity } from 'src/entities/Reasons.entity';
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
import { AAEntity } from 'src/entities/aggregator.entity';
import { InsuranceEntity } from 'src/entities/insurance.entity';
import { InstallAppEntity } from 'src/entities/InstallApp.entities';
import { UniqueContactLogEntity } from 'src/entities/unique.contact.log.entity';
import { ContactLogEntity } from 'src/entities/contact.log.entity';
import { CronTrakingEntity } from 'src/entities/cron.track.entity';
import { cibilTriggerEntity } from 'src/entities/cibilTrigger.entity';
import { CibilScoreEntity } from 'src/entities/cibil.score.entity';
import { QualityParameterEntity } from 'src/entities/qualityParameter.entity';
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
import { CacheEntity } from 'src/entities/cache_entity';
import { FinvuEntity } from 'src/entities/finvu.entity';
import { SystemTraceEntity } from 'src/entities/system_trace.entity';
import { FramesEntity } from 'src/entities/frames_entity';
import { UserRatingsEntity } from 'src/entities/user_ratings_entity';
import { RecoveryRateHistoryEntity } from 'src/entities/recoveryRateHistory.entity';
import { CollectionReport } from 'src/entities/collectionReport.entity';
import { bannerEntity } from 'src/entities/banner.entity';
import { LCREntity } from 'src/entities/lcr.entity';
import { MailTrackerArchive } from 'src/entities/maiTracker.archive.entity';
import { RBIGuidelineEntity } from 'src/entities/rbiGuideline.entity';
import { PaymentLinkEntity } from 'src/entities/paymentLink.entity';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';
import { assetsClassification } from 'src/entities/assetsClassification.entity';
import { FormUsers } from 'src/entities/formUsers.entity';
import { EnvConfig } from 'src/configs/env.config';
import { TransactionInitializedArchiveEntity } from 'src/entities/transactionInitializedArchive.entity';
import { PhoneEntity } from 'src/entities/phone.entity';
import { whatsappMSGEntity } from 'src/entities/whatsappMSGEntity';

function getReplicationConfigs(config, database) {
  if (EnvConfig.database.postgresql.isReplicaOn) {
    const masterHost = EnvConfig.database.postgresql.host;
    const username = EnvConfig.database.postgresql.username;
    const password = EnvConfig.database.postgresql.password;
    const read = [];
    const replicaHostA = EnvConfig.database.postgresql.replicaHostA;
    if (replicaHostA) {
      read.push({ host: replicaHostA, username, password, database });
    }
    const replicaHostB = EnvConfig.database.postgresql.replicaHostB;
    if (replicaHostB) {
      read.push({ host: replicaHostB, username, password, database });
    }
    config.replication = {
      read,
      write: { host: masterHost, username, password, database },
    };
  }
}

const baseProvider = [
  // Litt database
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const config: any = databaseConfig.user;
      getReplicationConfigs(config, config.database);
      const sequelize = new Sequelize(config);
      const entities: any = [
        admin,
        crmActivity,
        crmTitle,
        approvedLoanAmountFromSalary,
        ChatDocumentEntity,
        disbursementEntity,
        InstallAppEntity,
        EmiEntity,
        employmentDetails,
        employmentDesignation,
        EmploymentHistoryDetailsEntity,
        employmentSector,
        employmentType,
        esignEntity,
        ExotelCallHistory,
        ExotelCategoryEntity,
        KYCEntity,
        LegalNoticeEntity,
        LegalNoticeTrackEntity,
        loanTransaction,
        loanPurpose,
        LocationEntity,
        MasterEntity,
        APILogsEntity,
        mandateEntity,
        Configuration,
        PredictionEntity,
        registeredUsers,
        DeviceInfoAndInstallAppEntity,
        InstallAppEntity,
        salaryGrade,
        scoring,
        scoreCard,
        scoringField,
        scoringFieldGroup,
        stamp,
        SubScriptionEntity,
        userHistory,
        userLoanDecline,
        BankingEntity,
        GoogleCoordinatesEntity,
        device,
        TransactionEntity,
        ManualVerifiedCompanyEntity,
        ManualVerifiedWorkEmailEntity,
        BlockUserHistoryEntity,
        UserLogTracker,
        ReferencesEntity,
        SalarySlipEntity,
        WorkMailEntity,
        AddressesEntity,
        Department,
        LegalConsigment,
        UserSelfieEntity,
        YearOutstandingEntity,
        crmDescription,
        crmStatus,
        AugmontTransactionEntity,
        ReasonsEntity,
        UserActivityEntity,
        UserDelete,
        CIBILEntity,
        CrmReasonEntity,
        GoogleCompanyResultEntity,
        DefaulterOnlineEntity,
        crmDisposition,
        LegalCollectionEntity,
        AAEntity,
        InsuranceEntity,
        QualityParameterEntity,
        CibilScoreEntity,
        ReferralEntity,
        ReferralHistoryEntity,
        ReferralTransactionEntity,
        SettlementEntity,
        ipMasterEntity,
        RecoveryRateHistoryEntity,
        CollectionReport,
      ];
      sequelize.addModels(entities);
      await sequelize.sync();
      return sequelize;
    },
  },
  {
    provide: 'SEQUELIZENETBANKINGDB',
    useFactory: async () => {
      const config: any = databaseConfig.netbanking;
      getReplicationConfigs(config, config.database);
      const sequelize = new Sequelize(config);
      const entities = [
        PaymentLinkEntity,
        APILogsEntity,
        FinvuEntity,
        FramesEntity,
        SystemTraceEntity,
        userNetBankingDetails,
        FormUsers,
        PhoneEntity,
        ChangeLogsEntity,
        whatsappMSGEntity,
      ];
      sequelize.addModels(entities);
      await sequelize.sync();
      return sequelize;
    },
  },
  // Contact database
  {
    provide: 'SEQUELIZECONTACTDB',
    useFactory: async () => {
      const config: any = databaseConfig.contact;
      getReplicationConfigs(config, config.database);
      const sequelize = new Sequelize(config);
      const entities = [
        Configuration,
        contactDetailEntity,
        TestEntity,
        uniqueContactEntity,
        missMatchLogs,
        HealthDataEntity,
        OtherPermissionDataEntity,
        UniqueContactLogEntity,
        ContactLogEntity,
      ];
      sequelize.addModels(entities);
      await sequelize.sync();
      return sequelize;
    },
  },
  // IndBank database
  {
    provide: 'SEQUELIZEINDBANKDB',
    useFactory: async () => {
      const config: any = databaseConfig.indbank;
      getReplicationConfigs(config, config.database);
      const sequelize = new Sequelize(config);
      const entities = [
        BankList,
        CacheEntity,
        MetricsEntity,
        UsersFlowDataEntity,
        FlowEntity,
        MailTrackerEntity,
        StaticConfigEntity,
        StateEligibilty,
        TemplateEntity,
        AdminRoleModuleEntity,
        AdminRole,
        AdminSubRoleModuleEntity,
        AccessOfListEntity,
        AccessOfRoleEntity,
        APIAccessListEntity,
        UserPermissionEntity,
        DeviceSIM,
        BlacklistCompanyEntity,
        ReportListEntity,
        DownloaAppTrack,
        banks,
        branches,
        ThirdPartyProvider,
        ThirdPartyServiceEntities,
        CronTrakingEntity,
        cibilTriggerEntity,
        UserRatingsEntity,
        RBIGuidelineEntity,
        LCREntity,
        ActiveLoanAddressesEntity,
        // Third party
        ResponseEntity,
        ReportHistoryEntity,
        PromoCodeEntity,
        RequestSupportEntity,
        bannerEntity,
        assetsClassification,
      ];
      sequelize.addModels(entities);
      await sequelize.sync();
      return sequelize;
    },
  },
  // ARCHIVED database
  {
    provide: 'SEQUELIZEARCHIVEDDB',
    useFactory: async () => {
      const config: any = databaseConfig.archived;
      getReplicationConfigs(config, config.database);
      const sequelize = new Sequelize(config);
      const entities = [
        MailTrackerArchive,
        TransactionInitializedArchiveEntity,
      ];
      sequelize.addModels(entities);
      await sequelize.sync();
      return sequelize;
    },
  },
];

export const DatabaseProvider = baseProvider;
