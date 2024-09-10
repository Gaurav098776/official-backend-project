// Imports
const os = require('os');
import * as env from 'dotenv';

env.config();

export const EnvConfig = {
  isLogging: process.env.LOGGING == 'TRUE',
  isProd: (process.env.MODE ?? 'DEV') == 'PROD',
  isDev: (process.env.MODE ?? 'DEV') == 'DEV',

  ssl: {
    prodDomainKey: process.env.PROD_DOMAIN_KEY,
    prodDomainCert: process.env.PROD_DOMAIN_CERT,
    uatDomainKey: process.env.UAT_DOMAIN_CERT,
    uatDomainCert: process.env.UAT_DOMAIN_KEY,
  },

  nbfc: {
    nbfcName: process.env.NBFCNAME,
    appName: process.env.APPNAME,
    nbfcShortName: process.env.NBFCSHORTNAME,
    nbfcCodeName: process.env.NBFCCODENAME,
    nbfcCodeNameS: process.env.NBFCCODENAME_S,
    appCamelCaseName:
      process.env.APPNAME?.charAt(0)?.toUpperCase() +
      (process.env.APPNAME?.slice(1)?.toLowerCase() || ''),
    nbfcCamelCaseName:
      process.env.NBFCSHORTNAME?.charAt(0)?.toUpperCase() +
      (process.env.NBFCSHORTNAME?.slice(1)?.toLowerCase() || ''),
    nbfcAddress: process.env.NBFCADDRESS,
    nbfcRegistrationNumber: process.env.NBFC_REGISTRATION_NUMBER,
    nbfcCINNumber: process.env.NBFC_CIN_NUMBER,
    nbfcGrievance: process.env.NBFCGRIEVANCE,
    nbfcIrmodel: process.env.NBFCIRMODEL,
    nbfcGrievanceOfficer: process.env.GRIEVANCE_OFFICER,
    nbfcType: process.env.NBFCTYPE,
    nbfcBgColor: process.env.NBFC_BG_COLOR,
    nbfcPlaystoreLink: process.env.NBFC_PLAYSTORE_LINK,
    nbfcAppLink: process.env.NBFC_APPSTORE_LINK,
    NBFCFromName: process.env.NBFCFROMNAME,
    legalNoticeAddress: process.env.LEGAL_NOTICE_ADDRESS,
  },
  gCloudCred: {
    projectName: process.env.CLOUD_PROJECT_NAME,
    bucketName: process.env.CLOUD_BUCKET_NAME,
    appCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  gCloudAssets: {
    defaultNotiIcn: process.env.DEFAULT_NOTIFICATION_ICON,
    cloudStaticBucketName: process.env.CLOUD_STATIC_BUCKET_NAME,
    marketingBannerImg: process.env.MARKETING_BANNER_IMG,
    marketingBannerActiveLoan: process.env.MARKETING_BANNER_ACTIVE_LOAN,
    insuranceTncPdf: process.env.INSURANCE_TERM_CONDITION,
    insuranceDeclarationPdf: process.env.INSURANCE_DECLARATION,
    appBannerV1: process.env.APP_BANNER_V1,
    appBannerV2: process.env.APP_BANNER_V2,
    appLogoV1: process.env.APP_LOGO_V1,
    crmHeaderV1: process.env.CRM_HEADER_IMG_V1,
    crmHeaderV2: process.env.CRM_HEADER_IMG_V2,
  },
  mail: {
    noReplyMail: process.env.NOREPLY_MAIL,
    suppportMail: process.env.SUPPORT_MAIL,
    verificationsMail: process.env.SUPPORT_MAIL,
    techSupportMail: process.env.TECH_SUPPORT_MAIL,
    collectionEmail: process.env.COLLECTION_MAIL,
    legalMail: process.env.LEGAL_MAIL,
    legalTeamMail: process.env.LEGAL_TEAM_MAIL,
    legalSignLink: process.env.LEGAL_SIGN_LINK,
    lspDevGmail: process.env.LSP_DEV_GMAIL,
    grievanceMail: process.env.GRIEVANCE_MAIL,
    adminMails: process.env.ADMIN_EMAILS,
    NBFCSuportForEmail: process.env.NBFC_SUPPORT_FOR_EMAIL,
    NBFCLegalMailForAttachment: process.env.NBFC_LEGAL_MAIL_FOR_ATTACH,
    infoMail: process.env.INFO_MAIL,
  },

  loan: {
    loanMaxTenure: process.env.LOAN_MAX_TENURE,
    nbfcMaxLoanAmount: process.env.LOAN_MAX_AMOUNT,
    nbfcMinLoanAmount: process.env.LOAN_MIN_AMOUNT,
    maxEMIs: +process.env.MAX_EMIS,
  },

  charge: {
    documentCharge: process.env.DOCUMENT_CHARGE,
    stampFees: process.env.STAMP_FEES,
    processingFees: process.env.PROCESSING_FEES,
    onlineConvenienceFeesWithoutStampFees:
      process.env.ONLINE_CONVENIENCE_FEES_WITHOUT_STAMP_FEES,
    onlineConvenienceFeesWithStampFees:
      process.env.ONLINE_CONVENIENCE_FEES_WITH_STAMP_FEES,
    legalCharge: process.env.LEGAL_CHARGE,
    forcloseCharge: process.env.FORECLOSE_CHARGE,
    bounceCharge: process.env.BOUNCE_CHARGE,
    riskAssessmentPer: process.env.RISK_ASSESSMENT_PER,
  },

  number: {
    whatsappNumber: process.env.WHATSAPP_NUMBER,
    collectionNumber: process.env.COLLECTION_NUMBER,
    helpContact: process.env.HELP_CONTACT,
    legalNumber: process.env.LEGAL_NUMBER,
    grievanceNumber: process.env.GRIEVANCE_NUMBER,
  },
  url: {
    nbfcWebUrl: process.env.NBFC_WEB_URL,
    nbfcLogo: process.env.NBFC_LOGO,
    nbfcSmallLogo: process.env.NBFC_LOGO_SMALL,
    reviewLink: process.env.REVIEW_LINK,
    lspAppLink: process.env.LSP_APP_LINK,
    nbfcAppLink: process.env.NBFC_APP_LINK,
  },

  bureauReportCreds: {
    // For CIBIL
    cibilTudfMemberID: process.env.CIBIL_TUDF_MEMBER_ID,
    cibilTudfMemberName: process.env.NBFCCODENAME,
    // For EQUIFAX
    equifaxMemberID: process.env.EQUIFAX_FAX_MEMBER_ID,
    equifaxMemberName: process.env.NBFCCODENAME,
    // For CRIF
    crifMemberID: process.env.CRIF_MEMBER_ID,
    crifMemberName: process.env.NBFCCODENAME,
  },

  otherNBFCUrl: {
    otherNbfcBaseUrl: [process.env.OTHER_NBFC_BASE_URL1],
  },

  whiteListedIPs: ['129.154.237.168', '129.151.46.149'],

  digiLocker: {
    clientId: process.env.DIGILOCKER_CLIENT_ID,
    redirectUrl: process.env.DIGILOCKER_REDIRECT_URL,
    secretKey: process.env.DIGILOCKER_SECRET_KEY,
  },

  setu: {
    clientId: process.env.SETU_CLIENT_ID,
    clientSecret: process.env.SETU_CLIENT_SECRET,
    productInstanceId: process.env.SETU_PRODUCT_INSTANCE_ID,
  },

  google: {
    account01: {
      clientId: process.env.G1_CLIENT_ID,
      secretKey: process.env.G1_SECRET_KEY,
      refreshToken: process.env.G1_REFRESH_TOKEN,
    },
  },

  database: {
    cassandra: {
      host1: process.env.DB_CS_HOST1,
      username: process.env.DB_CS_USER,
      password: process.env.DB_CS_PASS,
    },
    mongodb: {
      host: process.env.MONGO_DB_HOST,
      password: process.env.MONGO_DB_PASSWORD,
      port: process.env.MONGO_DB_PORT,
      username: process.env.MONGO_DB_USERNAME,
      databaseName: process.env.MONGO_DB_DATABASE_NAME,
    },
    postgresql: {
      isReplicaOn: process.env.DB_REPLICA_MODE == 'ON',
      host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
      username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
      password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
      port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
      replicaHostA: process.env.DB_REPLICA_A_HOST,
      replicaHostB: process.env.DB_REPLICA_B_HOST,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
    },
    cryptographyLsp: process.env.LSP_DB_CRYPTOGRAPHY,
  },

  finvu: {
    userId: process.env.FINVU_USERID,
    password: process.env.FINVU_PASSWORD,
    finvuBaseType: process.env.FINVU_NBFC,
  },

  lsp: {
    baseUrl: process.env.LSP_BASE_URL,
    hosts: process.env.LSP_HOST?.split(',') ?? [],
    id: process.env.LSP_ID,
    key: process.env.LSP_KEY,
    mail: {
      lspNoReplyMail: process.env.LSP_NOREPLY_MAIL,
      lspSuppportMail: process.env.LSP_SUPPORT_MAIL,
      lspLegalMail: process.env.LSP_LEGAL_MAIL,
      lspCollectionMail: process.env.LSP_COLLECTION_MAIL,
    },
    number: {
      lsphelpContactBeforeDisbursement:
        process.env.LSP_HELP_CONTACT_BEFORE_DISBURSEMENT,
      lsphelpContactAfterDisbursement:
        process.env.LSP_HELP_CONTACT_AFTER_DISBURSEMENT,
    },
    url: {
      lspTermAndConditionLink: process.env.LSP_TERM_AND_CONDITION_LINK,
      lspPrivacyPolicyLink: process.env.LSP_PRIVACY_POLICY_LINK,
      lspLogo: process.env.LSP_LOGO,
    },
    LSPFromName: process.env.LSPFROMNAME,
  },

  mock: {
    panNumbers: [
      process.env.MOCK_PAN_NUMBER_01,
      process.env.MOCK_PAN_NUMBER_02,
      process.env.MOCK_PAN_NUMBER_03,
      process.env.MOCK_PAN_NUMBER_04,
      process.env.MOCK_PAN_NUMBER_05,
      process.env.MOCK_PAN_NUMBER_06,
      process.env.MOCK_PAN_NUMBER_07,
      process.env.MOCK_PAN_NUMBER_08,
      process.env.MOCK_PAN_NUMBER_09,
    ],
  },

  network: {
    flutterWebLenditt: process.env.FLUTTER_WEB_LENDITT,
    flutterWebNbfc1: process.env.FLUTTER_WEB_NBFC1,
    hostUrl: process.env.HOST_URL,
    opsUrl: process.env.OPS_SERVER_URL,
    nMasterSchedularUrl: process.env.MASTER_SCHEDULER ?? '',
    uatURL: process.env.UAT_URL,
    nFirebaseMsgKey: process.env.FCM_SERVER_KEY,
  },

  secrets: {
    defaultAppEncKeyLenditt: process.env.DEFAULT_APP_ENC_KEY_LENDITT,
    defaultAppEncKeyNbfc1: process.env.DEFAULT_APP_ENC_KEY_NBFC1,
    encKey: process.env.SECRET_ED_KEY,
    devOpsKey: process.env.DEV_OPS_KEY,
    jwtKey: process.env.JWT_KEY,
    qaTestKey: process.env.QA_TEST_KEY,
    studioJwt: process.env.STUDIO_JWT_KEY,
  },

  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    channelId: process.env.SLACK_CHANNEL_ID,
    csTeamChannelId: process.env.SLACK_CS_TEAM_CHANNEL_ID,
    AppDevelopmentChannelId: process.env.SLACK_APP_DEVELOPMENT_ID,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },

  emailDomain: {
    companyEmailDomain1: process.env.COMPANY_EMAIL_DOMAIN1,
    companyEmailDomain2: process.env.COMPANY_EMAIL_DOMAIN2,
  },

  permissionsLink: {
    nbfc: [
      process.env.CIBIL_LINK,
      process.env.TERM_AND_CONDITION_LINK,
      process.env.PRIVACY_POLICY_LINK,
    ],
  },

  server: {
    parallelServer: process.env.PARALLEL_SERVER_BASE_URL,
    encServerBaseUrl: process.env.ENC_SERVER_BASE_URL,
    bankingProBaseUrl: process.env.PRIMARY_BANKING_PRO_URL,
    origin: process.env.SERVER_ORIGIN,
    sourceId: os.hostname(),
    version: process.env.SERVER_VERSION,
  },

  neighbour: {
    studioBaseUrl: process.env.STUDIO_BASE_URL,
  },

  platFormName: {
    app: [process.env.APP_0, process.env.APP_1],
  },

  nbfcType: process.env.NBFCTYPE,
  score: {
    minPl: process.env.MIN_PL_SCORE,
    maxPremiumPl: process.env.MAX_PREMIUM_PL_SCORE,
    minCibil: process.env.MIN_CIBIL_SCORE,
    maxPremiumCibil: process.env.MAX_PREMIUM_CIBIL_SCORE,
  },

  exotel: {
    userVerificationPhone1: process.env.EXOTEL_USER_VERI_PHONE1,
    userVerificationPhone2: process.env.EXOTEL_USER_VERI_PHONE2,
    userVerificationPhone3: process.env.EXOTEL_USER_VERI_PHONE3,
    userPhone: process.env.EXOTEL_EXO_PHONE,
    userVerificationAppId: process.env.EXOTEL_USER_VERI_APPID,
    userTodayAppId: process.env.EXOTEL_TODAY_APPID,
    userUpcomingAppId: process.env.EXOTEL_UPCOMING_APPID,
    userDefaulterAppId: process.env.EXOTEL_DEFAULTER_APPID,
    userCompleteStepAppId_NBFC:process.env.NBFC_EXOTEL_COMPLETE_STEP_APPID,
    userCompleteStepPhone_NBFC:process.env.NBFC_EXOTEL_COMPLETE_STEP_PHONE,
    userCompleteStepAppId_LSP:process.env.LSP_EXOTEL_COMPLETE_STEP_APPID,
    userCompleteStepPhone_LSP:process.env.LSP_EXOTEL_COMPLETE_STEP_PHONE

  },
  emiBifurcation: process.env.EMI_CALCULATION,

  tatalTele: {
    LoginId: process.env.TATA_TELE_LOGIN_ID,
    Password: process.env.TATA_TELE_PASSWORD,
    callerID: process.env.TATA_TELE_CALLER_ID,
    isGetCallerID: 1,
    type: 'TATA_TELE_ACCESS_TOKEN',
    userUpcomingEmiCallId: process.env.TATA_TELE_UPCOMING_CALLER_ID,
    userUpcomingEmiNbfc1AppId: process.env.TATA_TELE_UPCOMING_EMI_NBFC1_APP_ID,
    userUpcomingEmiLspAppId: process.env.TATA_TELE_UPCOMING_EMI_LSP_APP_ID,

    userDayAgoEmiCallId: process.env.TATA_TELE_DAY_AGO_EMI_CALLER_ID,
    userDayAgoEmiNbfc1AppId: process.env.TATA_TELE_DAY_AGO_EMI_NBFC1_APP_ID,
    userDayAgoEmiLspAppId: process.env.TATA_TELE_DAY_AGO_EMI_LSP_APP_ID,

    userTodayEmiCallId: process.env.TATA_TELE_TODAY_EMI_CALLER_ID,
    userTodayEmiNbfc1AppId: process.env.TATA_TELE_TODAY_EMI_NBFC1_APP_ID,
    userTodayEmiLspAppId: process.env.TATA_TELE_TODAY_EMI_LSP_APP_ID,

    userOverDueCallId: process.env.TATA_TELE_OVERDUE_EMI_CALLER_ID,
    userOverdueNbfc1AppId: process.env.TATA_TELE_OVERDUE_EMI_NBFC1_APP_ID,
    userOverdueLspAppId: process.env.TATA_TELE_OVERDUE_EMI_LSP_APP_ID,

    userTodayEmiFailedCallId: process.env.TATA_TELE_AUTODEBIT_FAILED_CALLER_ID,
    userTodayEmiFailedNbfc1AppId:
      process.env.TATA_TELE_AUTODEBIT_FAILED_EMI_NBFC1_APP_ID,
    userTodayEmiFailedLspAppId:
      process.env.TATA_TELE_AUTODEBIT_FAILED_EMI_LSP_APP_ID,
  },

  kafka: {
    isKafkaOn: process.env.KAFKA_ON,
    KAFKA_BROKER: process.env.KAFKA_BROKER,
    clientId: process.env.KAFKA_CLIENT_ID,
    groupId: process.env.KAFKA_GROUP_ID,
    mechanism: process.env.KAFKA_MECHANISM,
    userName: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
    host: process.env.KAFKA_HOST,
    kafkaApiHost: process.env.KAFKA_API_HOST,
  },
};
