// Imports
import * as env from 'dotenv';
import * as str from './strings';
import { EventEmitter } from 'events';
import { EnvConfig } from 'src/configs/env.config';

env.config();

export let appEmitter = new EventEmitter({});

export const PASSWORD_EXPIRE_DAY = 30;
export const PASSCODE_EXPIRE_DAY = 120;

export const isUAT = process.env.MODE == 'UAT';
export const isLOG = process.env.LOG == 'true';
export const NOTIFICATION_STATUS = process.env.NOTIFICATION_STATUS;
export const HOST_URL = process.env.HOST_URL;
export const SERVER_MODE = process.env.MODE ?? 'DEV';
export const gIsPROD = SERVER_MODE == 'PROD';
export const gIsPriamryNbfc = EnvConfig.nbfc.nbfcType === '0';
/// max auto debit count perday
export const MAX_AUTO_DEBIT_COUNT = 5;

/// Minimum interest for full pay button
export const MINIMUM_INTEREST_FOR_FULL_PAY = 0.2;

// agreement cooling off period
export const LOAN_AGREEMENT_COOLINGOFF_PERIOD = 3;

// manage amount
export const disburseAmt = 'DISBURSEMENT';
export const ECS_BOUNCE_CHARGE = +EnvConfig.charge.bounceCharge;
export const ECS_BOUNCE_WITH_GST =
  ECS_BOUNCE_CHARGE + Math.round((+EnvConfig.charge.bounceCharge ?? 0) * 0.18);

//latest Version
export const Latest_Version = 'v4';

export const MAX_LOAN_AMOUNT = 50000;
export const MIN_LOAN_AMOUNT = 10000;
export const MAX_SALARY_PORTION = 0.8;
export const MAX_DURATION = 75;
export const LOAN_MIN = 30;
export const MATCH_TRANSACTIONS_THRESHOULD = 5;

export const GOOGLE_MAP_API = 'https://maps.googleapis.com/maps/';
export const GMAPS_KEY = process.env.GOOGLE_MAP_API_KEY;

// CommonService
export const locationAddressURL = `${GOOGLE_MAP_API}api/geocode/json?`;

//KYC
export const AADHAAR_XML = 'aadhaar_xml';
export const DRIVING_LICENCE = 'Driving licence';
export const FRONT_SIDE_OF_DRIVING_LICENSE = 'front_side_of_driving_license';
export const BACK_SIDE_OF_DRIVING_LICENSE = 'back_side_of_driving_licence';
export const VOTER_ID = 'Voter Id';
export const FRONT_SIDE_OF_VOTER_ID = 'front_side_of_voterId';
export const BACK_SIDE_OF_VOTER_ID = 'back_side_of_voterId';
export const PASSPORT = 'Passport';
export const FRONT_SIDE_OF_PASSPORT = 'front_side_of_passport';
export const BACK_SIDE_OF_PASSPORT = 'back_side_of_passport';

// Signdesk
export const APPLICATION_ID =
  'lenditt-innovations-technologies-pvt-ltd_kyc_live';

export const APPLICATION_ID_MANDATE =
  'lenditt-innovations--technologies-pvt-ltd_Emandate_Live';

export const APPLICATION_ID_UAT =
  'lenditt-innovations-technologies-pvt-ltd_kyc_uat';
export const NAME_VALIDATE = 60;
//Location
export const MAX_LAT_LIMIT = 0.00006;

export const MAX_BEARING_LIMIT = 0.001;

export const MAX_BEARING_LIMIT_PREDICTION = 0.003;
export const INDIA_CENTER_LAT = 22.7357804;
export const INDIA_CENTER_LONG = 78.757966;

export const MAX_SINGLE_LAT_LIMIT = 0.0005;

export const MAX_SINGLE_BEARING_LIMIT = 0.05;

export const MAX_LAT_ADDRESS_LIMIT = 0.000115;
export const MAX_BEARING_ADDRESS_LIMIT = 0.0015;
export const ADDRESS_MATCH_PERCENTAGE = 80;

//Admin - Frontend
export const PAGE_LIMIT = 10;

export const CF_CALLBACK_URL = HOST_URL + `${Latest_Version}/mandate/callback`;

export const APP_NAME = EnvConfig.nbfc.appCamelCaseName;
export const NBFC_NAME = EnvConfig.nbfc.nbfcName;
export const NBFC_ADDRESS = EnvConfig.nbfc.nbfcAddress;
export const equifaxMemberID = '024FP03625';
export const equifaxMemberName = EnvConfig.nbfc.nbfcCodeName;

export const tudfMemberID = 'NB79940001';
export const tudfMemberName = EnvConfig.nbfc.nbfcCodeName;

export const kCrifName = 'CRIF';
export const crifMemberID = 'NBF0001362';
export const crifMemberName = EnvConfig.nbfc.nbfcCodeName;

export const SYSTEM_ADMIN_ID = 37;
export const CIBIL_ADMIN_ID = 165;

//  sms flow id
export const EMIOverDueSMSID = '65f02c68d6fc05647175ae92'; //old 60eecca0853be5389d1e6285
export const RefundSMSId = '65f1b441d6fc0532aa1bd112'; //old '645356c4d6fc053f276e7902';
export const PaymentFailedSMSId = '65f02be2d6fc053dd253e322'; //old '614c235b10afa65fcc73d163';
export const paidLegalSmsId = '65f1bb1ad6fc05225e210b12'; //old '648b14b3d6fc055da6677f12';
export const caseFilledSMSId = '65f029a7d6fc0569233eb1a2'; //old 652677e8d6fc05683f2cd1e2
export const PaymentSuccessSMSId = '65f1b5d4d6fc05388c324d42'; //old '648afec1d6fc057eef04aa62';
export const NotAppliedUserSMSId = '649696e3d6fc055f102f76f2';
export const SendReviewMsgId = '65f3da13d6fc052006649e23'; //old '653a3628d6fc051dee18f7e2';
export const SEND_OTP_TEMPLATE = '65efe7dfd6fc0505fd5c86a2';

// kyc doc types
export const KYCAADHAAR = 'AADHAAR_VERIFICATION';
export const KYCPAN = 'PAN_VERIFICATION';
export const KYCOTHERDOC = 'OTHERDOC_VERIFICATION';

// Other server ports
export const AUTOMATION_URL = process.env.AUTOMATION_URL;

// CAMS
const isCAMSPROD = (process.env.CAMS_MODE ?? 'UAT') == 'PROD';
export const CAMS_BASE_URL = isCAMSPROD
  ? process.env.CAMS_PROD_BASE_URL
  : process.env.CAMS_UAT_BASE_URL;
export const CAMS_FIU_ID = isCAMSPROD
  ? process.env.CAMS_PROD_FIU_ID
  : process.env.CAMS_UAT_FIU_ID;
export const CAMS_REDIRECTION_KEY = isCAMSPROD
  ? process.env.CAMS_PROD_REDIRECTION_KEY
  : process.env.CAMS_UAT_REDIRECTION_KEY;
export const CAMS_USER_ID = isCAMSPROD
  ? process.env.CAMS_PROD_USER_ID
  : process.env.CAMS_UAT_USER_ID;

// FINVU
export const FINVU_BASE_URL = `https://${EnvConfig.finvu.finvuBaseType}.fiulive.finfactor.co.in/finsense/API/V2/`;
// CIBIL -> 3rd Party
export const isCIBILPROD = (process.env.CIBIL_MODE ?? 'UAT') == 'PROD';
// for bypass user
export const MIN_CIBIL_SCORE = 700;
export const MIN_PL_SCORE = 700;
export const CIBIL_MIN_OVERDUE = 0;
export const INQUIRY_PAST_30_DAYS = 10;
// for restrict user
export const MAX_INQUIRY_PAST_30_DAYS = 10;
export const CIBIL_MIN_PL_SCORE = 500;
export const CIBIL_BASE_URL = isCIBILPROD
  ? process.env.CIBIL_BASE_URL_PROD
  : process.env.CIBIL_BASE_URL_UAT;
export const CIBIL_API_KEY = isCIBILPROD
  ? process.env.CIBIL_API_KEY_PROD
  : process.env.CIBIL_API_KEY_UAT;
export const CIBIL_MEMBER_REF_ID = isCIBILPROD
  ? process.env.CIBIL_MEMBER_REF_ID_PROD
  : process.env.CIBIL_MEMBER_REF_ID_UAT;
export const CIBIL_MEMBER_USERID = isCIBILPROD
  ? process.env.CIBIL_MEMBER_USERID_PROD
  : process.env.CIBIL_MEMBER_USERID_UAT;
export const CIBIL_MEMBER_PASS = isCIBILPROD
  ? process.env.CIBIL_MEMBER_PASS_PROD
  : process.env.CIBIL_MEMBER_PASS_UAT;

// ICICI UPI
export const isICICIPROD = (process.env.ICICI_UPI_MODE ?? 'UAT') == 'PROD';
export const ICICI_BASE_URL = isICICIPROD
  ? process.env.ICICI_BASE_URL_PROD
  : process.env.ICICI_BASE_URL_UAT;
export const ICICI_MERCHANT_ID = isICICIPROD
  ? process.env.ICICI_MERCHANT_ID_PROD
  : process.env.ICICI_MERCHANT_ID_UAT;
export const ICICI_TERMINAL_ID = isICICIPROD
  ? process.env.ICICI_TERMINAL_ID_PROD
  : process.env.ICICI_TERMINAL_ID_UAT;
export const ICICIVPA = isICICIPROD
  ? process.env.ICICI_PROD_VPA
  : process.env.ICICI_UAT_VPA;
// Khosla -> 3rd Party
export const KYC_MODE: any = 'ZOOP';
export const ESIGN_MODE: any = 'ZOOP';
// MixPanel
export const MX_TOKEN = process.env.MX_TOKEN;

// Sender service
export const SMS_SERVICE = process.env.SMS_SERVICE ?? false;
export const MSG91 = 'MSG91';
export const NIMBUS = 'NIMBUS';

// Services
export const SENSEDATA_SERVICE = false;

// App env
export const IOS_VERSION = 346;
export const ANDROID_VERSION = 346;

// Re-kyc
export const REKYCDAYS = 365;
// Re-mandate
export const REMANDATEDAYS = 365;

export const SETTLEMENT_DESABLE = true;

export const kAdminRejectForLessSalary =
  'We are unable to proceed your loan application at this time as this does not meet our eligibility criteria';

// Marketing & Products
export const AUGMOUNT_URL = 'https://lenditt.augmont.com/buy';
export const SHARCHAT_EVENT_URL =
  'https://apis.sharechat.com/a1s-s2s-service/v1/events/';
export const ADVID = 'LENDITTADV23';

// OTHER Purpose IDotherPurposeId
export const OTHER_PURPOSE_ID = 9;
export const OTHER_PURPOSE_NAME = 'Personal reason';

// Third party Service
export const THIRD_PARTY = process.env.THIRD_PARTY_BASE_URL;
//list of service
export const ZOOP = 'ZOOP';
export const SIGNDESK = 'SIGNDESK';
export const VERI5 = 'VERI5';
export const CASHFREE = 'CASHFREE';
export const RAZORPAY = 'RAZORPAY';
export const AMAZON = 'AMAZON';
export const BHARTPAY = 'BHARATPAY';
export const PAYTM = 'PAYTM';
export const PHONEPE = 'PHONEPE';
export const CAMS = 'CAMS';
export const AUTHAI = 'AUTHAI';

// User Eligibility

export const UPI = 'UPI';
export const PAYMENT_SERVICE = 'PAYMENT_SERVICE';
export const ESIGN_SERVICE = 'ESIGN_SERVICE';
export const PAN_SERVICE = 'PAN_SERVICE';
export const AADHAAR_SERVICE = 'AADHAAR_SERVICE';

// Need Pan image from user side or not
export const CREDIT_SCORE_REFRESH_DAYS = 45;
export const PAN_IMAGE_REQUIRED = false;
/* Need optional docs like Election Card, Driving License, Aadhar Card Back
along with Aadhaar card and pan card or not */
export const OPTIONAL_DOCS_REQUIRED = false;
// eSign service provider mode
export const ESIGN_SERVICE_MODE: 'SIGNDESK' | 'VERI5' | 'ZOOP' = 'ZOOP';

// UPI Service via Paytm Merchant
export const UPI_SERVICE = true;
export const PAYMENT_SOURCE = 'RAZORPAY';
export const UPI_MODE: 'BHARATPE' | 'PAYTM' | 'PHONEPE' = 'BHARATPE';
export const NIMBUS_SERVICE = true;

// CRM third party services
export const CRM_SERVICE_ENABLE = false;
export const CRM_SERVICES = {
  KYLAS: 'kylas',
};
export const KYLAS_API_KEY = process.env.KYLAS_API_KEY;
//user permissions
export const HEALTH_DATA = true;
export const READ_NOTIFICATION_DATA = true;
export const SCREEN_TIME_DATA = true;

// Ranges
export const EXOTEL_CATEGORY_PER_DAY_LIMIT = 10;

export const REFRESH_DIFF_IN_MINU = 15;

export const BANK_NAME_FOR_IFSC = {
  AXIS: 'Axis Bank',
  DBS: 'DEVELOPMENT BANK OF SINGAPORE',
  YES: 'Yes Bank',
  UNION_BANK: 'Union Bank of India',
  UJJIVAN_SMALL_FINANCE_BANK: 'Ujjivan Small Finance Bank',
  SBI: 'State Bank of India',
  STANDARD_CHARTERED: 'Standard Chartered Bank',
  SOUTH_INDIAN: 'South Indian Bank',
  RBL: 'RBL Bank',
  PNB: 'Punjab National Bank',
  PAYTM_BANK: 'Paytm Payments Bank',
  KOTAK: 'Kotak Mahindra Bank',
  KARNATAKA: 'Karnataka Bank',
  INDUSIND: 'Indusind Bank',
  INDIAN_OVERSEAS: 'Indian Overseas Bank',
  IDFC: 'IDFC FIRST Bank',
  IDBI: 'IDBI',
  ICICI: 'ICICI Bank',
  HSBC: 'Hongkong & Shanghai Banking Corporation',
  ANDHRA_BANK: 'Union Bank of India',
  AU_SMALL_FINANCE_BANK: 'AU Small Finance Bank',
  BANK_OF_BARODA: 'Bank of Baroda',
  BANK_OF_MAHARASHTRA: 'Bank of Maharashtra',
  CANARA: 'Canara Bank',
  CENTRAL_BANK: 'Central Bank of India',
  CITI: 'CITI Bank',
  CITY_UNION: 'City Union Bank',
  DCB: 'DCB Bank',
  DEUTSCHE_BANK: 'Deutsche Bank',
  EQUITAS_SMALL_FINANCE_BANK: 'Equitas Small Finance Bank',
  FEDERAL: 'Federal Bank',
  HDFC: 'HDFC Bank',
  BOI: 'Bank of India',
  INDIAN_BANK: 'Indian Bank',
  KARNATAKA_VG: 'Karnataka Vikas Grameena Bank',
  ANDHRA_PG: 'Andhra Pragathi Grameena Bank',
  NSDL: 'NSDL Payments Bank',
};

//augmont
export const AUGMONT_BUY = 'buy';
export const AUGMONT_SELL = 'sell';
export const AUGMONT_TRANSFER = 'transfer';
export const MIN_BUY_AMOUNT = 100;
export const MAX_DAY_BUY_AMOUNT = 180000;
export const MAX_ANNUAL_SILVER_BUY_QUANTITY = 20000; //gram
export const MAX_ANNUAL_GOLD_BUY_AMOUNT = 5000000;
export const MAX_ANNUAL_GOLD_BUY_QUANTITY = 1000; //gram
export const AUGMONT_GST = 3; // percentage
export const AUGMONT_PROCESSING_FEES = 0;

// interest banner
const baseGoogleBanner = 'https://storage.googleapis.com/backend_static_stuff';

export const bannerOBJ = {
  MALE: {
    '0.172': `${baseGoogleBanner}/Male_0.172.png`,
    '0.200': `${baseGoogleBanner}/Male-0.2.png`,
    '0.225': `${baseGoogleBanner}/Male-0.225.png`,
    '0.250': `${baseGoogleBanner}/Male-0.250.png`,
    '0.275': `${baseGoogleBanner}/Male-0.275.png`,
    '0.300': `${baseGoogleBanner}/Male-0.3.png`,
    '0.325': `${baseGoogleBanner}/Male-0.325.png`,
    '0.350': `${baseGoogleBanner}/Male-0.350.png`,
    '0.375': `${baseGoogleBanner}/Male-0.375.png`,
  },
  FEMALE: {
    '0.100': `${baseGoogleBanner}/Female-0.1.png`,
    '0.125': `${baseGoogleBanner}Female-0.125.png`,
    '0.150': `${baseGoogleBanner}/Female-0.150.png`,
    '0.172': `${baseGoogleBanner}/Female_0.172.png`,
    '0.175': `${baseGoogleBanner}/Female-0.175.png`,
    '0.200': `${baseGoogleBanner}/Female-0.2.png`,
    '0.225': `${baseGoogleBanner}/Female-0.225.png`,
    '0.250': `${baseGoogleBanner}/Female-0.250.png`,
    '0.275': `${baseGoogleBanner}/Female-0.275.png`,
  },
};

// OTP
export const EMAIL_OTP_SUBJECT = `OTP For ${EnvConfig.nbfc.nbfcShortName}`;
export class GlobalServices {
  static AA_SERVICE = str.kOneMoney;
  static AADHAAR_SERVICE: 'DIGILOCKER' | 'ZOOP' | 'DIGILOCKER_IN_HOUSE' =
    'DIGILOCKER';
  static ALLOWED_CONTACTS = ['REFERENCES', 'CONTACTS'];
  static EMAIL_SERVICE: 'BREVO' | 'GMAIL' | 'SENDGRID' = 'BREVO';
  static PAN_SERVICE = EnvConfig.nbfc.appName;
  static INSURANCE_SERVICE = 'ELEPHANT'; //ELEPHANT //NONE
  static INSURANCE_OPT_VALUE = true;
  static EMANDATE_SERVICE = 'RAZORPAY';
  static ESIGN_SERVICE = 'ZOOP';
  static PAYMENT_MODE = 'RAZORPAY';
  static REFERRAL_SOURCE = 'CASHFREE';
  static UPI_MODE = 'ICICI_UPI';
  static EMANDATE = str.kRazorpay;
  static RENDER_EMAIL_HTML = true;
  static SELECTED_CRM = 'kylas';
  static CALL_SERVICE: 'EXOTEL' | 'TATA_TELE' = 'TATA_TELE';
  static UPI_SERVICE = 'UPI_SERVICE';
}

//response Messages
//sucees
// export const kNoticeSuccess = 'Legal Notice Created succesfully!';
export const kNotPlaceAutoDebit = 'AD NOT PLACED';

// employement
export const employementMessageFun = (title, status) => {
  if (status == 1 || status == '3') return `${title} approved!`;
  else if (status == 2) return `${title} rejected!`;
};

/// firebase
export const fbContactTC = 'Contact_TRUE_CALLER';

// Admin
export const ADMIN_USER_URL = process.env.ADMIN_USER_URL;
export const familyList = [
  'father',
  'pappa',
  'papa',
  'dad',
  'daddy',
  'paa',
  'maa',
  'mom',
  'mommy',
  'mummy',
  'mama',
  'mother',
  'sister',
  'sis',
  'didi',
  'bro',
  'bhaiya',
  'bhai',
  'brother',
  'uncle',
  'anty',
  'nana',
  'naana',
  'anna',
  'chinna',
  'wife',
  'landlord',
  'landlady',
  'manavi',
  'love',
  'sweethart',
  'jijaji',
  'jija',
  'jiju',
  'mam',
  'madam',
];

// Age criteria as per aadhaar
export const MIN_AGE = 21;
export const MAX_AGE = 50;

export const puppeteerConfig: any =
  process.env?.PUPPETEER_EXECUTABLE_PATH == undefined
    ? { headless: 'new' }
    : {
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      };
export const manualBanksList = ['DEUTSCHE_BANK'];

//stamp taken or not taken in loan agreement
export const isStamp = false;
export const insuranceWaiting = 48; // hours
export const INSURANCE_EMI_PROTECTOR_FEE = 14.08;
export const ADDRESS_AUTO_VARIFY_PROBABILITY = 70;
export const kInsuranceWaitingTag = `Your Insurance policy will be emailed within ${insuranceWaiting} hours if you don’t receive please email us on ${str.kSupportMail}`;
export const kInsuranceWaitingTagNBFC = `Your Insurance policy will be emailed within ${insuranceWaiting} hours if you don’t receive please email us on ${str.kSupportMail}`;
export const nbfcAppLink = EnvConfig.url.nbfcAppLink;
export const valueInsurance = { value: {}, relationshipCode: [] };

// Dynamic flow
export const GLOBAL_FLOW = {
  CIBIL_IDEAL_USER: true,
  EMI_SELECTION_IN_APP: 'ALL', // Limit to 3 days before and after LIMITTO3D
  NUMBER_AUTH_IN_APP: 'SMS', // SMS, CALL ( Verify user's signup / login process )
  REFERENCE_IN_APP: false,
  FINAL_VERIFICATION: 'AUTO', // MANUAL, AUTO
  RESIDENCE_IN_APP: false,
  CIBIL_HIT_MODE: 'IN_HOUSE', // IN_HOUSE, THIRD_PARTY
  SHOW_DEFERRED_INTEREST: true, // deferred interest in KFS
  SALARY_COOLOFF_BEFORE_STATEMENT: false,
  EXPRESS_REAPPLY_FLOW: false,
  WORK_MAIL_SALARYSLIP_SKIP: true,
};
// Dynamic values
export const GLOBAL_RANGES = {
  RISK_CATEGORY: {
    HIGH: {
      minValue: 700,
      maxValue: 749,
    },
    MEDIUM: {
      minValue: 750,
      maxValue: 799,
    },
    LOW: {
      minValue: 800,
      maxValue: 830,
    },
    PREMIUM: {
      minValue: 831,
      maxValue: 900,
    },
  },
  // Cibil ranges
  MIN_IDEAL_CIBIL_SCORE: +EnvConfig.score.minCibil,
  MAX_IDEAL_CIBIL_SCORE: 800,
  MIN_IDEAL_PL_SCORE: +EnvConfig.score.minPl,
  MAX_IDEAL_PL_SCORE: 800,
  MAX_PREMIUM_CIBIL_SCORE: +EnvConfig.score.maxPremiumCibil,
  MAX_PREMIUM_PL_SCORE: +EnvConfig.score.maxPremiumPl,
  MAX_IDEAL_OVERDUE_AMOUNT: 0,
  MIN_SALARY_AMOUNT: EnvConfig.nbfc.nbfcType == '1' ? 15000 : 20000,
  MAX_SALARY_AMOUNT: 100000,
  PL_EXCEPTION_MIN_COMPLETED_LOANS: 3, // CSC 1.1.0

  MAX_LOAN_TENURE_IN_DAYS: +EnvConfig.loan.loanMaxTenure,
  MIN_LOAN_AMOUNT: +EnvConfig.loan.nbfcMinLoanAmount,
  MAX_LOAN_AMOUNT: +EnvConfig.loan.nbfcMaxLoanAmount,
  MAX_SALARY_PORTION: 75, // Max eligible loan amount should not exceeds the percentage of this value with respect to approved salary
  MAX_AUTODEBIT_PLACE_AMOUNT: 499000,
  MAX_ELIGIBLE_SALARY_DATE_IN_DAYS: 100,
  MAX_PER_DAY_INTEREST_RATE: 0.084,
  MIN_PER_DAY_INTEREST_RATE: 0.1,
  INTEREST_PENALTY_FOR_OVERDUE: 0.025,
  MAX_TOTAL_FULL_PAY_INTEREST_RATE: 0.2,
  SLIDER_AMOUNT_SLAB: 500,
  LOAN_REJECTION_WITH_LOW_SCORE_COOL_OFF: 90,
  CIBIL_SCORE_BYPASS: 730,
  PL_SCORE_BYPASS: 730,
  MIN_ANNUAL_INTEREST_RATE: 28,
  MIN_EMPLOYMENT_SALARY: 10000
};
export const minPerDayInt = 0.076;
export const kSelectedLoanAmount =
  'Selected loan amount must be between ' +
  GLOBAL_RANGES.MIN_LOAN_AMOUNT +
  ' to ' +
  GLOBAL_RANGES.MAX_LOAN_AMOUNT;

// Dynamic text
export const GLOBAL_TEXT = {
  MAX_LOAN_TENURE_FOR_TEXT_ONLY: '120', // Do not use this for any logic, this is just to show loan tenure in app
  NO_OF_EMIS_FOR_TEXT_ONLY: '4', // Do not use this for any logic, this is just to show no. of Emi in app
};

// global charges
export const GLOBAL_CHARGES = {
  RISKASS_PER_CIBIL_UP799: 0,
  RISKASS_PER_CIBIL_UP699: 0,
  RISKASS_PER_CIBIL_DW699: 0,
  DOC_CHARGE_PER: +EnvConfig.charge.documentCharge,
  STAMP_FEES: isStamp ? +EnvConfig.charge.stampFees : 0,
  INSURANCE_FEE: isStamp
    ? +EnvConfig.charge.onlineConvenienceFeesWithStampFees
    : +EnvConfig.charge.onlineConvenienceFeesWithoutStampFees,
  PROCESSING_FEES: +EnvConfig.charge.processingFees,
  WITHOUT_INSURANCE_PROCESSING_FEES: 6.5,
  WITH_INSURANCE_PROCESSING_FEES: 6.5,
  GST: 18,
  LOAN_REJECTION_WITH_LOW_SCORE_COOL_OFF: 90,
  FORECLOSURE_PERC: +EnvConfig.charge.forcloseCharge,
  INTEREST_PENALTY_FOR_OVERDUE: 0.025, // Interest rate increases for last loan delay more than 1 day
  LEGAL_CHARGE: +EnvConfig.charge.legalCharge,
  RISK_ASSESSMENT_PER: +EnvConfig.charge.riskAssessmentPer,
};
//disbursement time
export const MAX_DIS_TIME = 120;
export const DisbursementBanner =
  'https://storage.googleapis.com/backend_static_stuff/Banner_5.png';
export const MSG91Templete = {
  DISBUREMENT: '65f03265d6fc054ba11cb0f2', //old 60eec950f268b346836df912
  PAYMENT_REMINDER: '6638cbbad6fc05431b691622', //old 60eec81788b2dc2c8e612bb6
  DEFAULTER_PROMO_CODE_OFFER: '65f15cfcd6fc0565c455b9a3', //old '653a2f74d6fc0533c9796163',
  PAYMENT_REQUEST: '666405d9d6fc054a063c3e32',
  // // PTP_REMINDER: '65f3ef38d6fc05600904c972' //old '64c3c87cd6fc05330669f4c2',
  // PTP_REMINDER: '60eec81788b2dc2c8e612bb6',
};

export const notSent = 'Not sent';
export const sent = 'Sent';
export const delivered = 'Delivered';
export const opened = 'Opened';
export const clicked = 'Clicked';
export const returnStatus = 'Return';
export const block = 'Expire';
export const demandLetterSubject = 'Loan EMI Demand Letter -##EMI_TYPE##';
export const sentStatusObj = {
  '-1': notSent,
  '1': sent,
  '2': delivered,
  '3': opened,
  '4': returnStatus,
  '5': block,
  '6': clicked,
};

export const advocate_role = 'advocate';
export const COMPLAINANT = 'COMPLAINANT';
export const razorPay = 'RAZORPAY';
export const nextChar = (c) => {
  return String.fromCharCode(c.charCodeAt(0) + 1);
};
export const LEGAL_SIGN = EnvConfig.mail.legalSignLink;

//IMPORTANT
// do not change this value based on this percantage legal case will assing
export const BELOW_OUTSTANDING_AMOUNT = 5000;

export const AUTODEBIT_PLACE = 12;
export const LEGAL_PROCESS = 2;

export const DEMAND_STATUS = 1;
export const LEGAL_STATUS = 2;
export const CASE_TOBE_FILE = 3;
export const CASE_INPROGRESS = 4;
export const CASE_FILLED = 5;
export const SUMMONS = 6;
export const WARRENT = 7;
export const CASE_WITHDRAWAL = 8;
export const CASE_DISPOSAL = 9;
export const PAID_LEGAL = 10;
export const CASE_ASSIGN = 11;

export const legalStep = {
  DEMAND_STATUS,
  LEGAL_STATUS,
  SUMMONS,
  WARRENT,
};
export const legalString = {
  [DEMAND_STATUS]: 'Demand letter',
  [LEGAL_STATUS]: 'Legal notice',
  [CASE_TOBE_FILE]: 'Ready for filing',
  [CASE_INPROGRESS]: 'Filing in-progress',
  [CASE_FILLED]: 'Case filed',
  [SUMMONS]: 'Summons',
  [WARRENT]: 'Warrant',
  [CASE_WITHDRAWAL]: 'Case withdrawal',
  [CASE_DISPOSAL]: 'Case disposal',
  [CASE_ASSIGN]: 'Case assign to collection',
  [AUTODEBIT_PLACE]: 'Autodebit placed',
};
export const CASE_TOBE_FILE_DAYS = 16;
export const CASE_INPROGRESS_DAYS = 30;
export const TRACKING_RES_HOURSE = 3;
export const DELETED_FILE_PATH =
  'https://storage.googleapis.com/backend_static_stuff/file-deleted.png';
export const LIMIT_PER_CRON = 20;

export const cibilIdType = {
  '01': 'Income Tax ID Number (PAN)',
  '02': 'Passport Number',
  '03': 'Voter ID Number',
  '04': 'Driver’s License Number',
  '05': 'Ration Card Number',
  '06': 'Universal ID Number (UID)',
  '07': 'Additional ID 1 (For Future Use)',
  '08': 'Additional ID 2 (For Future Use)',
  '09': 'CKYC',
  '10': 'NREGA Card Number',
};

export const cibilTelephoneType = {
  '00': 'Not Classified',
  '01': 'Mobile Phone',
  '02': 'Home Phone',
  '03': 'Office Phone',
};

export const cibilOccupationCode = {
  '01': 'Salaried',
  '02': 'Self Employed Professional',
  '03': 'Self Employed',
  '04': 'Others',
};

export const cibilAddressCategory = {
  '01': 'Permanent Address',
  '02': 'Residence Address',
  '03': 'Office Address',
  '04': 'Not Categorized',
  '05': 'Mortgage Property address',
};

export const cibilResidenceCode = {
  '01': 'Owned',
  '02': 'Rented',
};

export const cibilAccountOwnershipIndicator = {
  '1': 'Individual',
  '2': 'Authorised User (refers to supplementary credit card holder)',
  '3': 'Guarantor',
  '4': 'Joint',
  '5': 'Deceased',
};

export const cibilSuitFiled = {
  '00': 'No Suit Filed',
  '01': 'Suit filed',
  '02': 'Wilful default',
  '03': 'Suit filed (Wilful default)',
};

export const cibilCreditFacilityStatus = {
  '00': 'Restructured Loan',
  '01': 'Restructured Loan (Govt. Mandated)',
  '02': 'Written-off',
  '03': 'Settled',
  '04': 'Post (WO) Settled',
  '05': 'Account Sold',
  '06': 'Written Off and Account Sold',
  '07': 'Account Purchased',
  '08': 'Account Purchased and Written Off',
  '09': 'Account Purchased and Settled',
  '10': 'Account Purchased and Restructured',
  '11': 'Restructured due to Natural Calamity',
  '12': 'Restructured due to COVID-19',
  '13': 'Post Write Off Closed',
  '14': 'Restructured & Closed',
  '15': 'Auctioned & Settled',
  '16': 'Repossessed & Settled',
  '17': 'Guarantee Invoked',
};

export const cibilCollateralType = {
  '00': 'No Collateral',
  '01': 'Property',
  '02': 'Gold',
  '03': 'Shares',
  '04': 'Saving Account and Fixed Deposit',
  '05': 'Multiple Securities',
  '06': 'Others',
};

export const cibilPaymentFrequency = {
  '01': 'Weekly',
  '02': 'Fortnightly',
  '03': 'Monthly',
  '04': 'Quarterly',
  '05': 'Bullet payment',
  '06': 'Daily',
  '07': 'Half yearly',
  '08': 'Yearly',
  '09': 'On-demand',
};

export const cibilAccountType = {
  '01': 'Auto Loan (Personal)',
  '02': 'Housing Loan',
  '03': 'Property Loan',
  '04': 'Loan Against Shares / Securities',
  '05': 'Personal Loan',
  '06': 'Consumer Loan',
  '07': 'Gold Loan ',
  '08': 'Education Loan',
  '09': 'Loan to Professional',
  '10': 'Credit Card',
  '11': 'Leasing',
  '12': 'Overdraft',
  '13': 'Two-Wheeler Loan',
  '14': 'Non-Funded Credit Facility',
  '15': 'Loan Against Bank Deposits',
  '16': 'Fleet Card',
  '17': 'Commercial Vehicle Loan',
  '18': 'Telco - Wireless',
  '19': 'Telco - Broadband',
  '20': 'Telco - Landline',
  '21': 'Seller Financing',
  '23': 'GECL Loan Secured',
  '24': 'GECL Loan Unsecured',
  '31': 'Secured Credit Card',
  '32': 'Used Car Loan',
  '33': 'Construction Equipment Loan',
  '34': 'Tractor Loan',
  '35': 'Corporate Credit Card',
  '36': 'Kisan Credit Card',
  '37': 'Loan on Credit Card',
  '38': 'Prime Minister Jaan Dhan Yojana - Overdraft',
  '39': 'Mudra Loans - Shishu / Kishor / Tarun',
  '40': 'Microfinance - Business Loan',
  '41': 'Microfinance - Personal Loan',
  '42': 'Microfinance - Housing Loan',
  '43': 'Microfinance - Others',
  '44': 'Pradhan Mantri Awas Yojana - Credit Link Subsidy Scheme MAY CLSS',
  '45': 'P2P Personal Loan',
  '46': 'P2P Auto Loan',
  '47': 'P2P Education Loan',
  '50': 'Business Loan - Secured',
  '51': 'Business Loan - General',
  '52': 'Business Loan - Priority Sector - Small Business',
  '53': 'Business Loan - Priority Sector - Agriculture',
  '54': 'Business Loan - Priority Sector - Others',
  '55': 'Business Non-Funded Credit Facility - General',
  '56': 'Business Non-Funded Credit Facility-Priority Sector- Small Business',
  '57': 'Business Non-Funded Credit Facility-Priority Sector-Agriculture',
  '58': 'Business Non-Funded Credit Facility-Priority Sector-Others',
  '59': 'Business Loan Against Bank Deposits',
  '61': 'Business Loan - Unsecured',
  '00': 'Other',
};

export const cibilStateCode = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttaranchal',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura ',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Orissa',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Pondicherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '99': 'APO Address',
};
/// old defulter score
export const NAME_MISS_MATCH_PER = 80;

export const BREW_SITE_LOG = 'https://app-smtp.brevo.com/log/preview/';
export const MAIL_TRACK_LINK =
  process.env.HOST_URL + `admin/legal/launchMailPage?refrenceId=`;

//ptpCrmId
export const ptpCrmIds = [44, 80, 81];

///instafinance url
export const INSTAFINACIAL_LLP_COMPANY_URL =
  'https://www.instafinancials.com/LLP/LLP.aspx';
export const INSTAFINACIAL_COMPANY_DIRECTOR_URL =
  'https://www.instafinancials.com/company-directors';
//lsp review link
export const REVIEW_LINK = EnvConfig.url.reviewLink;

/// 1 year in Days
export const COMPANY_INCORPORATION_MIN_DAY = 365;

export const IS_ACTIVE = 1;
export const IS_DEACTIVE = 0;

export const PROMO_VALID_TIME = 24; //in hours

export const promoCodeStatus = {
  DAY_WISE: 0,
  SALARY_WISE: 1,
  DATE_WISE: 2,
};
export const promoCodeRemark = 'PROMO_CODE_APPLIED';
export const CONTACT_REFERENCE_LIMIT = 90;
export const PRODUCT_DESCRIPTION = 'PERSONAL LOAN';

/// aadhare radius
export const AADHARE_LAT_LONG_RADIUS = '3.10685'; /// this Radius in mile  == 5 KM
// Demo details
export const DEMO_DETAILS = {
  LOAN_IDS: [615],
};

//// UAT PHONE NUMBER
export const UAT_PHONE_NUMBER = [
  '9468575178',
  '9099098587',
  '7600550021',
  '9925016055',
  '8200008270',
  '7874846122',
];

export const MSG_TITLES = {
  PROMO_CODE_TITLE: 'Promo Code',
  REVIEW_LINK_TITLE: 'Review Link',
};

export const RESIDENCE_CRITERIA = 6; //in months

export const LSP_START_DATE = '2021-08-01';

export const LSP_APP_LINK = EnvConfig.url.lspAppLink;
export const NBFC_APP_LINK = EnvConfig.url.nbfcAppLink;

export const nGoogleSearch = 'https://www.google.com/search';
export const nRazorpayIFSC = 'https://ifsc.razorpay.com/';

// ecs bounce count
export const LAST_CHECK_DAYS = 30;
export const ECS_BOUNCE_LIMIT = 3;

//legal number which add send notifcation
export const MIN_SALARY = 19999;
export const MAX_SALARY = 50000;
export const BASE_AMOUNT = 0;
export const EXPITY_TIME = 48;
export const TOKEN_LENGTH = 88;

export const DAY_LIMIT = 31;

// legal company number
export const LEGAL_NUMBER = EnvConfig.number.legalNumber;
export const LEGEL_PHONE_NUMBER = EnvConfig.number.legalNumber;

//template design number
export const templateDesign = process.env.TEMPLATE_DESIGN;
//chance left
export const ADMIN_LOGIN_CHANCE = 3;
export const USER_LOGIN_CHANCE = 3;

//holding time after chances are completed
export const ADMIN_WRONG_OTP_TIME_MINS = 5;
export const USER_WRONG_OTP_TIME_MINS = 5;

export const APP_TYPE = '0';
export const CREDIT_ANALYST_ROLE = '4';
export const CSE_ROLE = '3';
export const REDIS_PREFIX = process.env.REDIS_PREFIX;
export const LOGOUTTIME = 60;

//penalty charges according delay days
export const PENALTY_CHARGES = {
  DPD_1_TO_3_days_IN_PA: 5,
  DPD_4_TO_14_days_IN_PA: 10,
  DPD_15_TO_30_days_IN_PA: 15,
  DPD_31_TO_60_days_IN_PA: 20,
  DPD_MORE_THAN_61_days_IN_PA: 25,
  MODIFICATION_CALCULATION: true,
};

export const penaltyChargesObj = {
  DPD_1_TO_3: false,
  DPD_4_TO_14: false,
  DPD_15_TO_30: false,
  DPD_31_TO_60: false,
  DPD_MORE_THAN_61: false,
  LEGAL_CHARGE: true,
};

export const loansOutstandingSetting = {
  // //first roun
  // 47378: 0,
  // 145367: 0,
  // 149174: 0,
  // 149929: 0,
  // 155882: 0,
  // 166752: 0,
  // 168093: 0,
  // 169134: 0,
  // 150559: 0,
  // 154959: 0,
  // 160549: 0,
  // 166542: 0,
  // 6767: 0,
  // 169164: 0,
  // 99437: 0,
  // 149071: 0,
  // //Second round
  // 170712: 58190,
  // 6278: 40910,
  // 171704: 3383,
  // 169296: 3248,
};

export const CALL_SERVICE = {
  EXOTEL: 'EXOTEL',
  TATA_TELE: 'TATA_TELE',
};

export const telegramExecptionUrls = [
  'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=',
  'https://ifsc.razorpay.com',
];

export const INSURANCE_SERVICES = {
  ACCEDENT_AND_EMIP: true,
  LOSS_OF_JOB: true,
};
export const DUPLICATE_PROFILE = 'Duplicate user profile';
export const LCR_DATA_SEND_THRESHOLD_DAYS = 2;
//Data before above number of days will be sent in LCR report

export const exotelCategoryId = process.env.EXOTEL_INCOMING_CATEGORY;
export const INCOMMING_CALL_STATUSES = {
  INCOMING: 'INCOMING',
  ACTIVE: 'ACTIVE',
  MISSED: 'MISSED',
  CUT: 'CALL_CUT',
};
export const CIBIL_REDIS_KEY = {
  FOR_SINGLE_DATA: 'SINGLE_CIBIL_DATA',
  FOR_MULTIPLE_DATA: 'MULTIPLE_CIBIL_DATA',
};

export const BLOCK_USER = {
  BLOCK: 1,
  ACTIVE: 0,
};

export const BLOCK_USER_STATUS_FORMATE = {
  [BLOCK_USER.BLOCK]: 'Blocked',
  [BLOCK_USER.ACTIVE]: 'Active',
};


export const IncommingCallCollection = EnvConfig.isProd
  ? 'incoming-calling'
  : 'incoming-calling-uat';
