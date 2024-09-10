// Imports
import { extname } from 'path';
import * as CryptoJS from 'crypto-js';
import * as env from 'dotenv';
import { diskStorage } from 'multer';
import {
  kComplyMessage,
  kCongratsText,
  kEligibleLoanAmount,
  kEmailOrSalaryOption,
  kLegalTeamMail,
  kLoanEligibleText,
  KLspComplyMessage,
  kLspNotSalaried,
  kLspSalaryModeError,
  kNewEligibleLoanAmount,
  kNewEligibleLoanAmountUpto2Lac,
  kNoReplyMail,
  kNotEligiblityText,
  kNotSalaried,
  kVerificationsMail,
} from './strings';
import {
  aaURL,
  nCronControllerAPI,
  nFinvuJourneyURL,
  nIpCheck,
  ZOOP_RESPONSE_URL,
  nPaymentRedirect,
} from './network';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import {
  HOST_URL,
  SERVER_MODE,
  KYLAS_API_KEY,
  MIN_SALARY,
  MAX_SALARY,
  BASE_AMOUNT,
  Latest_Version,
  GLOBAL_FLOW,
} from './globals';
import { kInternalError } from './responses';
import { EnvConfig } from 'src/configs/env.config';

env.config();

export const kGmailSecrets = [
  {
    clientId: EnvConfig.google.account01.clientId,
    clientSecret: EnvConfig.google.account01.secretKey,
    email: kNoReplyMail,
    refreshToken: EnvConfig.google.account01.refreshToken,
  },
  {
    clientId: process.env.S1_CLIENT_ID,
    clientSecret: process.env.S1_SECRET_KEY,
    email: kNoReplyMail,
    refreshToken: process.env.S1_GMAIL_REFRESH_TOKEN,
  },
  {
    clientId: process.env.S2_CLIENT_ID,
    clientSecret: process.env.S2_SECRET_KEY,
    email: kNoReplyMail,
    refreshToken: process.env.S2_GMAIL_REFRESH_TOKEN,
  },
  {
    clientId: process.env.S3_CLIENT_ID,
    clientSecret: process.env.S3_SECRET_KEY,
    email: kNoReplyMail,
    refreshToken: process.env.S3_GMAIL_REFRESH_TOKEN,
  },
  {
    clientId: process.env.L1_CLIENT_ID,
    clientSecret: process.env.L1_SECRET_KEY,
    email: kLegalTeamMail,
    refreshToken: process.env.L1_GMAIL_REFRESH_TOKEN,
  },
  {
    clientId: process.env.V1_CLIENT_ID,
    clientSecret: process.env.V1_SECRET_KEY,
    email: kVerificationsMail,
    refreshToken: process.env.V1_GMAIL_REFRESH_TOKEN,
  },
  {
    clientId: process.env.GMAIL_NBFC1_VERIFICATION_CLIENT_ID,
    clientSecret: process.env.GMAIL_NBFC1_VERIFICATION_CLIENT_SECRET,
    email: kVerificationsMail,
    refreshToken: process.env.GMAIL_NBFC1_VERIFICATION_REFRESH_TOKEN,
  },
];

export const kUploadFileObj = (path = './') => {
  return {
    storage: diskStorage({
      destination: path,
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
  };
};

export const kUploadFileObjTest = (path = './') => {
  return {
    storage: diskStorage({
      destination: path,
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}${extname(file.originalname)}`);
      },
    }),
  } as MulterOptions;
};

export const kBigFonts = {
  font: {
    size: 16,
  },
  alignment: {
    wrapText: true,
  },
};

export const kSmallFonts = {
  font: {
    size: 12,
  },
  alignment: {
    wrapText: true,
  },
};

// Signdesk
export const kSignDeskUploadBody = {
  enc_mode: 'symmetric',
  api_data: '',
  is_encrypted: true,
};
// Signdesk end

// Cashfree
export const CASHFREE_HEADERS = {
  'X-Client-Id': process.env.CASHFREE_CLIENT_ID_PROD,
  'X-Client-Secret': process.env.CASHFREE_CLIENT_SECRET_PROD,
};

export const SENSEDATA_HEADERS = {
  Authorization: 'Bearer ' + process.env.SENSEDATA_AUTH_TOKEN,
  'Content-Type': 'application/json',
};

export const CASHFREE_HEADERS_V2 = {
  'X-Client-Id': process.env.CASHFREE_CLIENT_ID_PROD,
  'X-Client-Secret': process.env.CASHFREE_CLIENT_SECRET_PROD,
  'x-api-version': '2022-09-01',
};

export const CASHFREE_BANK_LIST = [
  'AUBL',
  'BARB',
  'CBIN',
  'CIUB',
  'CNRB',
  'COSB',
  'DEUT',
  'DLXB',
  'ESFB',
  'FDRL',
  'HDFC',
  'IBKL',
  'ICIC',
  'IDFB',
  'INDB',
  'IOBA',
  'KARB',
  'KKBK',
  'MAHB',
  'PUNB',
  'PYTM',
  'RATN',
  'SBIN',
  'SCBL',
  'TMBL',
  'USFB',
  'UTIB',
  'YESB',
  'SIBL',
  'DBSS',
  'JSFB',
  'HSBC',
  'KVBL',
  'CITI',
  'DCBL',
  'BDBL',
  'UCBA',
  'IDIB',
  'UBIN',
  'CSBK',
  'VARA',
  'KVGB',
  'APGB',
];

export function getMandateData(userId, loanId) {
  return {
    initialHTMLData: null,
    initialURL: '',
    initialLoader: false,
    title: 'E-mandate',
    type: 'SUBSCRIPTION',
    showPinchDialog: false,
    holdTime: 30,
    appLifecycleTriggers: {
      resumed: {
        triggers: [],
        apiTriggers: [
          {
            url: HOST_URL + `${Latest_Version}/mandate/checkStatus`,
            method: 'POST',
            body: { loanId, userId },
          },
        ],
      },
    },
    jsTriggers: {
      'https://enach.npci.org.in/onmags/sendRequest': {
        onLoadStop: {
          triggers: [
            "if(document.getElementById('ErrorDesc').value==='MER_DUPLC_REQUEST' && document.getElementById('ErrorCode').value==='534') console.log('duplicate_mandate')",
          ],
        },
        consoles: [
          {
            combinations: ['duplicate_mandate'],
            state: { holdMandate: true },
          },
        ],
      },
      [HOST_URL + 'razorpay/razorpayMandateCallback']: {
        onLoadStart: {
          state: { isProcessing: true },
          triggers: ['console.log("LENDITT_SUBSCRIPTION_CHECK");'],
        },
        consoles: [
          {
            combinations: ['LENDITT_SUBSCRIPTION_CHECK'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/mandate/checkStatus`,
                method: 'POST',
                body: { loanId, userId },
              },
            ],
          },
        ],
      },
    },
    apiTriggers: {},
    stopRedirects: ['redirect_callback'],
    responseStr: [],
    keyboardScripts: [],
  };
}

export const kCFMockChargeInit = {
  status: 'OK',
  message: 'Subscription charge initialized',
  payment: {
    paymentId: 3609399,
    subReferenceId: 2899358,
    currency: 'INR',
    amount: 1,
    cycle: 2,
    status: 'INITIALIZED',
    remarks: 'Charge Subscription',
    addedOn: '2022-02-27 15:57:33',
    scheduledOn: '2022-02-28',
    initiatedOn: '2022-02-27',
    retryAttempts: 0,
  },
};
// WhatsApp header
export const KWpHeadersNbfc = {
  'API-KEY': process.env.WS_AUTH_KEY_NBFC,
  'content-type': 'application/json',
};
export const KWpHeadersLsp = {
  'API-KEY': process.env.WS_AUTH_KEY_LSP,
  'content-type': 'application/json',
};

// ##### NBFC Msg91
export const kMSG91Headers = {
  authkey: process.env.MSG91_AUTH_KEY,
  'content-type': 'application/JSON',
  sender: process.env.MSG91_SENDER,
};

// ##### NBFC Msg91
export const kLspMSG91Headers = {
  authkey: process.env.LSPMSG91_AUTH_KEY,
  'content-type': 'application/JSON',
  sender: process.env.LSPMSG91_SENDER,
};

// ##### Razorpay
export const kRazorpayAuth = {
  username: process.env.RAZOR_PAY_ID,
  password: process.env.RAZOR_PAY_KEY,
};

// ##### SendinBlue
export const kSendingBlueAuth = {
  user: process.env.SENDINBLUE_USER,
  pass: process.env.SENDINBLUE_PASS,
};

export const kScoreFieldObjectList = [
  { id: 9, name: 'Opening balance', key: 'openingBalance' },
  { id: 10, name: 'Closing balance', key: 'closeBalance' },
  { id: 11, name: 'Total number of inflow count', key: 'inFlowCount' },
  { id: 12, name: 'Total number of inflow amount', key: 'inFlowAmount' },
  { id: 13, name: 'Total number of outflow count', key: 'outFlowCount' },
  { id: 14, name: 'Total number of outflow amount', key: 'outFlowAmount' },
  {
    id: 15,
    name: 'Total number of cash withdrawal count',
    key: 'cashWithdrawalCount',
  },
  {
    id: 16,
    name: 'Total number of cash withdrawal amount',
    key: 'cashWithdrawalAmount',
  },
  {
    id: 17,
    name: 'Total number of salary count',
    key: 'incomeCount',
  },
  {
    id: 18,
    name: 'Total number of salary amount',
    key: 'incomeAmount',
  },
  {
    id: 19,
    name: 'Total number of credit card count',
    key: 'creditCardCount',
  },
  {
    id: 20,
    name: 'Total number of credit card amount',
    key: 'creditCardAmount',
  },
  {
    id: 21,
    name: 'Total number of loan count',
    key: 'loanCount',
  },
  {
    id: 22,
    name: 'Total number of loan amount',
    key: 'loanAmount',
  },
  {
    id: 23,
    name: 'Total number of bank charges count',
    key: 'bankChargeCount',
  },
  {
    id: 24,
    name: 'Total number of bank charges amount',
    key: 'bankChargeAmount',
  },
  {
    id: 25,
    name: 'Total number of bounce count',
    key: 'bounceCount',
  },
  {
    id: 26,
    name: 'Total number of bounce amount',
    key: 'bounceAmount',
  },
  {
    id: 27,
    name: 'Total number of investment count',
    key: 'investmentCount',
  },
  {
    id: 28,
    name: 'Total number of investment amount',
    key: 'investmentAmount',
  },
  {
    id: 29,
    name: '5th day balance',
    key: 'balance5',
  },
  {
    id: 30,
    name: '10th day balance',
    key: 'balance10',
  },
  {
    id: 31,
    name: '15th day balance',
    key: 'balance15',
  },
  {
    id: 32,
    name: '20th day balance',
    key: 'balance20',
  },
  {
    id: 33,
    name: '25th day balance',
    key: 'balance25',
  },
  {
    id: 34,
    name: '30th day balance',
    key: 'balance30',
  },
];

export const kKeyFactStatement = [
  '##selfieImg##',
  '##signingDate##',
  '##fullName##',
  '##nbfcName##',
  '##loanId##',
  '##netApporvedAmount##',
  '##approvedDay##',
  '##interest##',
  '##emiCount##',
  '##perAnnumInterest##',
  '##signingDate1##',
  '##TOTALINTEREST##',
  '##emiEndDate##',
  '##PROCESSING_PERC##',
  '##fees##',
  '##DOC_PERC##',
  '##documentCharges##',
  '##sgstCharges##',
  '##cgstCharges##',
  '##ecsCharges##',
  '##deferredInterest##',
  '##RISK_PERC##',
  '##STAMP_OR_RISK_ASSESSMENT_CHARGES##',
  '##refName1##',
  '##refPhone1##',
  '##refPermissionDate1##',
  '##refGivenBy1##',
  '##refName2##',
  '##refPhone2##',
  '##refPermissionDate2##',
  '##refGivenBy2##',
  '##refName3##',
  '##refPhone3##',
  '##refPermissionDate3##',
  '##refGivenBy3##',
  '##refName4##',
  '##refPhone4##',
  '##refPermissionDate4##',
  '##refGivenBy4##',
  '##refName5##',
  '##refPhone5##',
  '##refPermissionDate5##',
  '##refGivenBy5##',
  '##helplinePhoneNumber##',
  '##supportEmail##',
  '##supportCollection##',
  // '##INSURANCE_PREMIUM_AMOUNT##',
  // '##INSURANCE_BY##',
  '##Cooling_off_period**##',
  '##INSURANCE_FEES##',
  '##interestRatePerDay##',
  '##aprCharges##',
  '##disbursedAmt##',
  '##lendingPartner##',
  '##APPNAME##',
  '##nbfcAddress##',
  '##infoEmail##',
  '##NBFCLOGO##',
  '##nbfcGrievance##',
  '##customerId##',
];

export const kAgreementStatics = [
  '##selfieImg##',
  '##loanId##',
  '##fullName1##',
  '##borrowerName1##',
  '##fullName##',
  '##userEmail##',
  '##panNumber##',
  '##aadhaarNumber##',
  '##AadhaarAddress##',

  '##date1##',
  '##date2##',
  '##netApporvedAmount##',
  '##finalLoanAmount##',
  '##loanAmount##',
  '##loanPurpose##',
  '##purpose##',
  '##totalRepay##',
  '##loanInterest##',
  '##interest##',
  '##perAnnumInterest##',
  '##perAnnumInterest1##',
  '##perAnnumPenalty##',
  '##interest1##',
  '##penalty1##',
  '##loanInterest1##',
  '##loanDays##',
  '##approvedDay##',

  '##repaymentDate1##',
  '##principalAmount1##',
  '##emiInterestAmount1##',
  '##daysInterestCalc1##',
  '##emiRateOfInterest1##',
  '##repaymentAmount1##',

  '##repaymentDate2##',
  '##principalAmount2##',
  '##emiInterestAmount2##',
  '##daysInterestCalc2##',
  '##emiRateOfInterest2##',
  '##repaymentAmount2##',

  '##repaymentDate3##',
  '##principalAmount3##',
  '##emiInterestAmount3##',
  '##daysInterestCalc3##',
  '##emiRateOfInterest3##',
  '##repaymentAmount3##',

  '##repaymentDate4##',
  '##principalAmount4##',
  '##emiInterestAmount4##',
  '##daysInterestCalc4##',
  '##emiRateOfInterest4##',
  '##repaymentAmount4##',

  '##TOTAL_PRINCIPAL_AMOUNT##',
  '##TOTAL_INTEREST_AMOUNT##',
  '##TOTAL_DAYS##',
  '##RATE_OF_INTEREST##',
  '##TOTAL_REPAYMENT_AMOUNT##',
  '##INSURANCE_CHARGES##',
  '##CONVENIENCE_CHARGES##',

  '##loanAmount##',
  '##TOTALINTEREST##',

  '##PROCESSING_PERC##',
  '##fees##',
  '##DOC_PERC##',
  '##documentCharges##',
  // '##gstCharges##',
  '##sgstCharges##',
  '##cgstCharges##',
  '##stamp##',
  '##DISBURSEMENT_AMOUNT##',

  '##appName##',
  '##officeAddress##',
  '##lenderName##',
  '##nbfcName##',
  '##nbfcName1##',

  '##repaymentDate12##',
  '##day1##',
  '##month1##',
  '##year1##',
  '##agreementDate1##',
  '##agreementDate##',
  '##stampNumber##',

  '##signingDate##',
  '##signingDate1##',
  '##emiCount##',
  '##emiStartDate##',
  '##emiEndDate##',
  '##ecsCharges##',
  '##refName1##',
  '##refPhone1##',
  '##refPermissionDate1##',
  '##refGivenBy1##',
  '##refName2##',
  '##refPhone2##',
  '##refPermissionDate2##',
  '##refGivenBy2##',
  '##refName3##',
  '##refPhone3##',
  '##refPermissionDate3##',
  '##refGivenBy3##',
  '##refName4##',
  '##refPhone4##',
  '##refPermissionDate4##',
  '##refGivenBy4##',
  '##refName5##',
  '##refPhone5##',
  '##refPermissionDate5##',
  '##refGivenBy5##',

  '##INSURANCE_PREMIUM_AMOUNT##',
  '##INSURANCE_BY##',
  '##INSURANCE_FEES##',
  '##GST_CHARGES##',

  '##nbfcAddress##',
];

export const kMonths = [
  'January ',
  'February ',
  'March ',
  'April ',
  'May ',
  'June ',
  'July ',
  'August ',
  'September ',
  'October ',
  'November ',
  'December ',
];

export const kMonthDates = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31,
];

export const week = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export const kAllSalaryExceptions = [
  'for',
  'the',
  'month',
  'of',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

export const shortMonth = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const kSenderMails = [kLegalTeamMail];
export const kVerificationMails = [kVerificationsMail];

export const kExternalMailers = ['mailer-daemon@googlemail.com'];
export const kExceptionsDomains = [
  'gmail.com',
  'yahoo.co.in',
  'yahoo.com',
  'rediffmail.com',
  'rediffmail.co.in',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'live.co.uk',
  'outlook.in',
  'outlook.com',
  'yahoo.in',
  'email.com',
  'mail.com',
  'ymail.com',
  'rocketmail.com',
  'rediff.com',
  'aol.com',
  'me.com',
  'yahoo.co.uk',
  'hotmail.co.uk',
  'datamail.in',
  'hotmail.co.in',
  'msn.com',
  'yandex.com',
  'gmx.com',
  'gmx.us',
  'zoho.com',
  'protonmail.com',
  'themail3.net',
  'fuwa.be',
  'sika3.com',
  'tmail2.com',
  'fastmail.com',
  'fastmail.in',
  'fastmail.net',
  'newmail.top',
  'mail62.net',
  'mail365.com',
  'ezmail.top',
  'imaild.com',
  'mail-hub.top',
  'zohomail.com',
  'zohomail.in',
  'yopmail.com',
  'tmails.top',
  'mailbox.org',
  'mbox.re',
  'quick-mail.cc',
  'imail1.net',
  'imailt.com',
  'xmail2.net',
  'topmail2.com',
  'net2mail.top',
  '4tmail.com',
  'email1.pro',
  'runbox.com',
  'protonmail.ch',
  'mailinator.com',
  'mail1.top',
  'dmailpro.net',
  'mail8app.com',
  'workmail.com',
  'mailhub24.com',
  'mail.ru',
  '3mailapp.net',
  '4xmail.net',
  'email1.pro',
  'amail1.com',
  '7dmail.com',
  'ahk.jp',
  'janmail.org',
];

export const kMimeTypes = {
  csv: 'text/csv',
  doc: 'application/msword',
  docs: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const kDevTeamTelegramIds = [900322615, 1059487332];

export const kBankingProHeaders = {
  appId: process.env.APP_ID,
  secretKey: process.env.SECRET_KEY,
};

// Encryption
export let numberCodes;

export async function initializeNumberCodes() {
  try {
    numberCodes = await decryptText(process.env.ENC_SYS_KEY_PHONE);
    numberCodes = JSON.parse(numberCodes);
  } catch (error) { }
}

function decryptText(text: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(text, process.env.SECRET_ED_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) { }
}

export const kExotelAppIds = {
  USER_CALL_VERIFICATION_1: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userVerificationPhone1,
  },
  USER_CALL_VERIFICATION_2: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userVerificationPhone2,
  },
  USER_CALL_VERIFICATION_3: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userVerificationPhone3,
  },
  TODAY_EMI: {
    appId: EnvConfig.exotel.userTodayAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_1: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_1TO15: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_16TO30: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_31TO60: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_61TO90: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  DEFAULTER_91: {
    appId: EnvConfig.exotel.userDefaulterAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  UPCOMING_EMI: {
    appId: EnvConfig.exotel.userUpcomingAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  UPCOMING_DEFAULTER_EMI: {
    appId: EnvConfig.exotel.userUpcomingAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  SELECT_FIRST_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  SELFIE_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  EMAIL_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  COMPANY_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  SALARYSLIP_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  BANKSTATEMENT_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  MISSING_BANK_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  ADDITIONAL_STATEMENT_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  WORKMAIL_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  RESIDENCE_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  ADD_REFERENCE_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  SOFT_KYC_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  LOAN_PURPOSE_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  FINAL_KYC_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  LOAN_ACCEPT_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  FAILED_AUTO_DEBIT: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  REGISTRATION_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  AADHAAR_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  EMPLOYMENT_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  PAN_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  EMANDATE_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  ESIGN_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  IN_PROGRESS_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  QUALITY_STUCK: {
    appId: EnvConfig.exotel.userVerificationAppId,
    callId: EnvConfig.exotel.userPhone,
  },
  "REGISTRATION_ALL_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "REGISTRATION_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "SELFIE_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },
  "KYC_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "EMPLOYMENT_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "BANKSTATEMENT_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },


  "LOAN_ACCEPT_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "EMANDATE_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },

  "ESIGN_NBFC": {
    appId: EnvConfig.exotel.userCompleteStepAppId_NBFC,
    callId: EnvConfig.exotel.userCompleteStepPhone_NBFC,
  },


};

export const kTataAppIds = {
  // UP: {
  //   appId: EnvConfig.tatalTele.userVerificationAttendant1,
  //   callId: EnvConfig.tatalTele.userVerificationAppId,
  // },
  // USER_CALL_VERIFICATION_2: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.userVerificationPhone2,
  // },
  // USER_CALL_VERIFICATION_3: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.userVerificationPhone3,
  // },
  TODAY_EMI_NBFC1: {
    appId: EnvConfig.tatalTele.userTodayEmiNbfc1AppId,
    callId: EnvConfig.tatalTele.userTodayEmiCallId,
  },
  TODAY_EMI_LSP: {
    appId: EnvConfig.tatalTele.userTodayEmiLspAppId,
    callId: EnvConfig.tatalTele.userTodayEmiCallId,
  },
  DEFAULTER_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_1_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_1_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_1TO15_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_1TO15_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_16TO30_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_16TO30_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_31TO60_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_31TO60_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_61TO90_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_61TO90_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_91_NBFC1: {
    appId: EnvConfig.tatalTele.userOverdueNbfc1AppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  DEFAULTER_91_LSP: {
    appId: EnvConfig.tatalTele.userOverdueLspAppId,
    callId: EnvConfig.tatalTele.userOverDueCallId,
  },
  UPCOMING_EMI_NBFC1: {
    appId: EnvConfig.tatalTele.userUpcomingEmiNbfc1AppId,
    callId: EnvConfig.tatalTele.userUpcomingEmiCallId,
  },
  UPCOMING_EMI_LSP: {
    appId: EnvConfig.tatalTele.userUpcomingEmiLspAppId,
    callId: EnvConfig.tatalTele.userUpcomingEmiCallId,
  },
  UPCOMING_DEFAULTER_EMI_NBFC1: {
    appId: EnvConfig.tatalTele.userUpcomingEmiNbfc1AppId,
    callId: EnvConfig.tatalTele.userUpcomingEmiCallId,
  },
  UPCOMING_DEFAULTER_EMI_LSP: {
    appId: EnvConfig.tatalTele.userUpcomingEmiLspAppId,
    callId: EnvConfig.tatalTele.userUpcomingEmiCallId,
  },
  TODAY_EMI_FAILED_NBFC1: {
    appId: EnvConfig.tatalTele.userTodayEmiFailedNbfc1AppId,
    callId: EnvConfig.tatalTele.userTodayEmiFailedCallId,
  },
  TODAY_EMI_FAILED_LSP: {
    appId: EnvConfig.tatalTele.userTodayEmiFailedLspAppId,
    callId: EnvConfig.tatalTele.userTodayEmiFailedCallId,
  },
  // SELECT_FIRST_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // SELFIE_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // EMAIL_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // COMPANY_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // SALARYSLIP_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // BANKSTATEMENT_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // MISSING_BANK_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // ADDITIONAL_STATEMENT_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // WORKMAIL_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // RESIDENCE_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // ADD_REFERENCE_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // SOFT_KYC_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // LOAN_PURPOSE_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // FINAL_KYC_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // LOAN_ACCEPT_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // FAILED_AUTO_DEBIT: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // REGISTRATION_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // AADHAAR_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // EMPLOYMENT_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // PAN_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // EMANDATE_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // ESIGN_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // IN_PROGRESS_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
  // QUALITY_STUCK: {
  //   appId: EnvConfig.tatalTele.userVerificationAppId,
  //   callId: EnvConfig.tatalTele.callerID,
  // },
};

export const kMsg91Templates = {
  // CRM -> Call received
  '65f1b618d6fc054736704bf2': {
    title: 'Requested to call you back',
    dltId: '1107171025201129014',
    varOptions: [
      { key: 'var1', title: '##NEW_DATE##' },
      { key: 'var2', title: '##NEW_TIME##' },
      { key: 'var3', title: '##AGENT_NUMBER##' },
    ],
  }, //old 649188efd6fc050527050382  OVERDUELOAN
  '65f024b7d6fc0529d515d7d3': {
    title: 'Settlement offer',
    dltId: '1107171016120511266',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE##' },
      { key: 'var3', title: '##NEW_TIME##' },
      { key: 'var4', title: '##AGENT_NUMBER##' },
    ],
    //old 6491884ad6fc0556a663bc93
  },
  '65f1cc10d6fc054c852063d2': {
    title: 'Payment update',
    dltId: '1107171025592367079',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 6491b0f1d6fc051c546a57d3
  '65f1bc0cd6fc05753a3f9e52': {
    title: 'Part payment request',
    dltId: '1307168724697229451',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE##' },
      { key: 'var3', title: '##NEW_TIME##' },
      { key: 'var4', title: '##AGENT_NUMBER##' },
    ],
  }, //old 6491b157d6fc052ce276e552
  // '65f1b53cd6fc0542193166d3': {
  //   title: 'Last PTP failed new PTP given',
  //   dltId: '1107171025184199847',
  //   varOptions: [
  //     { key: 'var1', title: '##NEW_AMOUNT##' },
  //     { key: 'var2', title: '##NEW_DATE## AND ##NEW_TIME##' },
  //     { key: 'var3', title: '##AGENT_NUMBER##' },
  //   ],
  // }, //old 6491b1ced6fc051f460a70b3  in msg91 promice to pay
  '65f1b53cd6fc0542193166d3': {
    title: 'PTP request',
    dltId: '1107171025184199847',
    varOptions: [
      { key: 'var1', title: '##PREVIOUS_AMOUNT##' },
      { key: 'var2', title: '##PREVIOUS_DATE##' },
      { key: 'var3', title: '##PREVIOUS_TIME##' },
      { key: 'var4', title: '##NEW_DATE##' },
      { key: 'var5', title: '##NEW_TIME##' },
      { key: 'var6', title: '##AGENT_NUMBER##' },
    ],
  }, //old 64928433d6fc053b765598a3
  '65f1bd2bd6fc053e2575aa02': {
    title: 'Legal activity started',
    dltId: '1107171025265820483',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 64928881d6fc0522e75b2b43
  '65f02551d6fc0540fc7d97d2': {
    title: 'Need time to repay',
    dltId: '1107171016051724271',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE## AND ##NEW_TIME##' },
      { key: 'var3', title: '##AGENT_NUMBER##' },
    ],
    //old 649325e4d6fc056ab21d2e34 test both content
  },
  // CRM -> Call not received
  '65f1cae4d6fc0540cd588f62': {
    title: 'Msg & Email dropped',
    dltId: '1107171025455367766',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 649326bbd6fc057c76119172
  '65f1ca38d6fc054442633862': {
    title: 'Number switched off',
    dltId: '1107171025446213381',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 6493275dd6fc054649180c03
  '65f1ca16d6fc053da017ca02': {
    title: 'Number unreachable',
    dltId: '1107171025437827876',
    varOptions: [{ key: 'var', title: '##AGENT_NUMBER##' }],
  }, //old 649327bad6fc053cb6496096
  '65f1bfbed6fc0549cd7418e2': {
    title: 'Number busy',
    dltId: '1107171025380849356',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 6493284dd6fc05665c249bc2
  // CRM -> SMS
  '65f1be9dd6fc05414f6f1192': {
    title: 'Msg received',
    dltId: '1107171025373256498',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 649328c5d6fc057e2b28d7a2
  '65f1be74d6fc05619e2a5db2': {
    title: 'Msg sent',
    dltId: '1107171025363091880',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 6493294dd6fc053e3e54bed2
  // CRM -> Email
  '65f1be2fd6fc0518b17fecc2': {
    title: 'Email sent for repayment',
    dltId: '1107171025321616898',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 64932b97d6fc0544eb626392
  '65f1bd4cd6fc055aa47d1183': {
    title: 'Email received for repayment',
    dltId: '1107171025309885031',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 64932d77d6fc052f6a78cd42
  // CRM -> Whatsapp
  '65f1cb08d6fc05388a655643': {
    title: 'Whatsapp sent',
    dltId: '1107171025583430657',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 64932caed6fc056aee6a1162
  '65f1cb58d6fc05592f105091': {
    title: 'Whatsapp received',
    dltId: '1107171025466764449',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  }, //old 64932c5dd6fc0564c3238983

  //var Options for the followinf are left
  '65f3da13d6fc052006649e23': {
    title: 'Review link',
    dltId: '1107171042286842585',
  }, //old 653a3628d6fc051dee18f7e2
  '65f15cfcd6fc0565c455b9a3': {
    title: 'Penalty waive-off',
    dltId: '1107171015807413852',
  }, //old 653a2f74d6fc0533c9796163
  '65f3ef07d6fc05485d0c8b23': {
    title: 'CIBIL good user',
    dltId: '1107171042269434722',
  }, //old 652e5654d6fc0511cf052633
  '65f029a7d6fc0569233eb1a2': {
    title: 'Case filed intimation',
    dltId: '1107171015823623680',
    //old 652677e8d6fc05683f2cd1e2
  },
  '65f160c5d6fc0514ae101432': {
    title: 'Promise to pay',
    dltId: '1107171024298255830',
  }, //old 64e0be50d6fc053f085baa03
  '65f3ef38d6fc05600904c972': {
    title: 'Assistance Alert for defaulter',
    dltId: '1107171042242342738',
  }, //old 64c3c87cd6fc05330669f4c2
  '649696e3d6fc055f102f76f2': {
    title: 'Repaid Loan Ontime',
    dltId: '1307168751793642698',
  },
  '64932e9ed6fc056b464fdf82': {
    title: 'Settlement Offer Given',
    dltId: '1307168725157421541',
  },
  '65f028a4d6fc053cde623452': {
    title: 'Email Received Settlement',
    dltId: '1107171016036956360',
  }, //old 64932e08d6fc0504ba2f20e2
  '65f171d7d6fc05026030edf2': {
    title: 'Settlement request',
    dltId: '1107171016045396578',
  }, //old 649283b2d6fc05251a238822
  '65f1bce9d6fc051b8d1feb62': {
    title: 'RECEIVED PAYMENT',
    dltId: '1107171025239946419',
  }, //old 6491b288d6fc052c9a7adf73
  '65f198abd6fc0558e9765a92': {
    title: 'Bank statement rejection',
    dltId: '1107171024697643543',
  }, //old 612dd751c054d16e1308d7ca
  '65f198dad6fc0514d7067c92': {
    title: 'Bank statement verification',
    dltId: '1107171024704693386',
  }, //old 612dd722a921a67a3b006422
  '65f02c68d6fc05647175ae92': {
    title: 'Loan payment due',
    dltId: '1107171009663512708',
    //old 60eecca0853be5389d1e6285
  },
  '65f19a14d6fc053f424df112': {
    title: 'Manual company verification',
    dltId: '1107171024732625715',
  }, //old 612dd4d50c5a870994692595
  '65f199ead6fc053d44455da3': {
    title: 'Manual company rejection',
    dltId: '1107171024725781647',
  }, //old 612dd5ae6e6fa51c456e3af3
  '65f03348d6fc0560b1501c12': {
    title: 'Work email verification',
    dltId: '1107170998945492913',
  }, //old 60e6c6df5344291cad2079b2
  '65f16429d6fc056871522192': {
    title: 'Work email rejection',
    dltId: '1107171024608167131',
  }, //old 60f25e4646c5b64853341e1a
  '65f170b2d6fc05202609a9e3': {
    title: 'Manual salary slip verification',
    dltId: '1107171024655887939',
  }, //old 6135dc6c2c64e43f4851ef34
  '65f164b0d6fc05062d42fe32': {
    title: 'Manual salary slip rejection',
    dltId: '1107171024638712301',
  }, //old 6135dc8aaa4edd58e85c7372
  '65f199bbd6fc056ba56083a2': {
    title: 'Residence proof verification',
    dltId: '1107171024718804267',
  }, //old 612dd60f58424f7b98639118
  '65f19920d6fc053a0b530b52': {
    title: 'Residence proof rejection',
    dltId: '1107171024712159729',
  }, //old 612dd6a7b9983b467821c362
  '65f1b441d6fc0532aa1bd112': {
    title: 'Refund Amount',
    dltId: '1107171025121593788',
  }, //old 645356c4d6fc053f276e7902
  '65f02be2d6fc053dd253e322': {
    title: 'Payment failure',
    dltId: '1107171009680401773',
  }, //old  614c235b10afa65fcc73d163
  '65f1b5d4d6fc05388c324d42': {
    title: 'Payment successful',
    dltId: '1107171025192865374',
  }, //old 648afec1d6fc057eef04aa62
  '65f1bb1ad6fc05225e210b12': {
    title: 'Inform To Advocate',
    dltId: '1107171025212013936',
  }, //old 648b14b3d6fc055da6677f12
  '6404638ad6fc051653753d43': {
    title: 'Bureau & lower interest',
    dltId: '1307167282597030406',
  },
  '65f1ad64d6fc0537ae073ef1': {
    title: 'Lower Interest Ontime',
    dltId: '1107171024817738634',
  }, //old 64046258d6fc0542b0778f53
  '65f1ad9ad6fc055efb31c6b3': {
    title: 'System timeline LNDITT',
    dltId: '1107171464367343924',
  }, //old 64045cc9d6fc056b0e28f772
  '65f03265d6fc054ba11cb0f2': {
    title: 'Loan Approval',
    dltId: '1107170998997930005',
  },
  '6638cbbad6fc05431b691622': {
    title: 'Payment reminder',
    dltId: '1107171499521835337',
  },
  '65efe7dfd6fc0505fd5c86a2': {
    title: 'OTP Verification',
    dltId: '1107171009698166827',
  },
  '666405d9d6fc054a063c3e32': {
    title: 'Payment Request',
    dltId: '1107171655355250181',
  },
  '65f15f8dd6fc0573bd262572': {
    title: 'Legal Notice',
    dltId: '1107171024249596157',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '65f15eebd6fc052e0a0b3c12': {
    title: 'Legal : Warrants',
    dltId: '1107171024232751981',
    varOptions: [
      { key: 'var1', title: '##LEGAL_WARRENT##' },
      { key: 'var2', title: '##LEGAL_NUMBER##' },
    ],
  },
  '66265d6ad6fc053cdf226d82': {
    title: 'Court Hearing Date',
    dltId: '1107171378234755510',
    varOptions: [
      { key: 'FULLNAME', title: '##FULLNAME##' },
      { key: 'HEARINGDATE', title: '##HEARINGDATE##' },
      { key: 'LEGALSTATUS', title: '##LEGALSTATUS##' },
      { key: 'CONTACTNUMBER', title: '##CONTACTNUMBER##' },
    ],
  },
  '66265ab4d6fc056d46576fb2': {
    title: 'Field Visit 1 DPD',
    dltId: '1107171378410285388',
    varOptions: [
      { key: 'FULLNAME', title: '##FULLNAME##' },
      { key: 'CONTACTNUMBER', title: '##CONTACTNUMBER##' },
    ],
  },
  DISBUREMENT: '65f03265d6fc054ba11cb0f2', //old 60eec950f268b346836df91
  PAYMENT_REMINDER: '6638cbbad6fc05431b691622', //old 60eec81788b2dc2c8e612bb6
  DEFAULTER_PROMO_CODE_OFFER: '65f15cfcd6fc0565c455b9a3', //old '653a2f74d6fc0533c9796163',
  PTP_REMINDER: '65f3ef38d6fc05600904c972', //old '64c3c87cd6fc05330669f4c2',
  // PTP_REMINDER: '60eec81788b2dc2c8e612bb6',
  EMIOverDueSMSID: '65f02c68d6fc05647175ae92', //old 60eecca0853be5389d1e6285
  RefundSMSId: '65f1b441d6fc0532aa1bd112', //old '645356c4d6fc053f276e7902';
  PaymentFailedSMSId: '65f02be2d6fc053dd253e322', //old '614c235b10afa65fcc73d163';
  paidLegalSmsId: '65f1bb1ad6fc05225e210b12', //old '648b14b3d6fc055da6677f12';
  caseFilledSMSId: '65f029a7d6fc0569233eb1a2', //old 652677e8d6fc05683f2cd1e2
  PaymentSuccessSMSId: '65f1b5d4d6fc05388c324d42', //old '648afec1d6fc057eef04aa62';
  NotAppliedUserSMSId: '649696e3d6fc055f102f76f2',
  SendReviewMsgId: '65f3da13d6fc052006649e23', //old '653a3628d6fc051dee18f7e2';
  SEND_OTP_TEMPLATE: '65efe7dfd6fc0505fd5c86a2',
  PAYMENT_REQUEST: '666405d9d6fc054a063c3e32',
  CourtHearingDate: '66265d6ad6fc053cdf226d82',
  LegalWarrants: '65f15eebd6fc052e0a0b3c12',
  LegalNotice: '65f15f8dd6fc0573bd262572',
};

export const kLspMsg91Templates = {
  // CRM -> Call received
  '649188efd6fc050527050382': {
    title: 'Requested to call you back',
    dltId: '1307168683621812242',
    varOptions: [
      { key: 'var1', title: '##NEW_DATE##' },
      { key: 'var2', title: '##NEW_TIME##' },
      { key: 'var3', title: '##AGENT_NUMBER##' },
    ],
  },
  '6491884ad6fc0556a663bc93': {
    title: 'Settlement offer',
    dltId: '1307168724601201211',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE##' },
      { key: 'var3', title: '##NEW_TIME##' },
      { key: 'var4', title: '##AGENT_NUMBER##' },
    ],
  },
  '6491b0f1d6fc051c546a57d3': {
    title: 'Payment update',
    dltId: '1307168725648206856',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '6491b157d6fc052ce276e552': {
    title: 'Part payment request',
    dltId: '1307168724697229451',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE##' },
      { key: 'var3', title: '##NEW_TIME##' },
      { key: 'var4', title: '##AGENT_NUMBER##' },
    ],
  },
  '6491b1ced6fc051f460a70b3': {
    title: 'Need time to repay',
    dltId: '1307168683141329360',
    varOptions: [
      { key: 'var1', title: '##PREVIOUS_AMOUNT##' },
      { key: 'var2', title: '##PREVIOUS_DATE##' },
      { key: 'var3', title: '##PREVIOUS_TIME##' },
      { key: 'var4', title: '##NEW_DATE##' },
      { key: 'var5', title: '##NEW_TIME##' },
      { key: 'var6', title: '##AGENT_NUMBER##' },
    ],
  },
  '64928881d6fc0522e75b2b43': {
    title: 'Legal activity started',
    dltId: '1307168724763062344',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '649325e4d6fc056ab21d2e34': {
    title: 'Need time to repay',
    dltId: '1307168724769835309',
    varOptions: [
      { key: 'var1', title: '##NEW_AMOUNT##' },
      { key: 'var2', title: '##NEW_DATE## AND ##NEW_TIME##' },
      { key: 'var3', title: '##AGENT_NUMBER##' },
    ],
  },
  // CRM -> Call not received
  '649326bbd6fc057c76119172': {
    title: 'Msg & Email dropped',
    dltId: '1307168725088577108',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '6493275dd6fc054649180c03': {
    title: 'Number switched off',
    dltId: '1307168725094205139',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '649327bad6fc053cb6496096': {
    title: 'Number unreachable',
    dltId: '1307168725098348669',
    varOptions: [{ key: 'var', title: '##AGENT_NUMBER##' }],
  },
  '6493284dd6fc05665c249bc2': {
    title: 'Number busy',
    dltId: '1307168725103136790',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  // CRM -> SMS
  '649328c5d6fc057e2b28d7a2': {
    title: 'Msg received',
    dltId: '1307168725116073280',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '6493294dd6fc053e3e54bed2': {
    title: 'Msg sent',
    dltId: '1307168725122005859',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  // CRM -> Email
  '64932b97d6fc0544eb626392': {
    title: 'Email sent for repayment',
    dltId: '1307168725173439876',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '64932d77d6fc052f6a78cd42': {
    title: 'Email received for repayment',
    dltId: '1307168725179918431',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  // CRM -> Whatsapp
  '64932caed6fc056aee6a1162': {
    title: 'Whatsapp sent',
    dltId: '1307168725283937968',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  '64932c5dd6fc0564c3238983': {
    title: 'Whatsapp received',
    dltId: '1307168725279022059',
    varOptions: [{ key: 'var1', title: '##AGENT_NUMBER##' }],
  },
  //var Options for the following are left
  '653a3628d6fc051dee18f7e2': {
    title: 'Review link',
    dltId: '1307169831110955417',
  },
  '653a2f74d6fc0533c9796163': {
    title: 'Penalty waive-off',
    dltId: '1307169830139535031',
  },
  '652e5654d6fc0511cf052633': {
    title: 'CIBIL good user',
    dltId: '1307169701971033257',
  },
  '652677e8d6fc05683f2cd1e2': {
    title: 'Case filed intimation',
    dltId: '1307169700225725911',
  },
  '64e0be50d6fc053f085baa03': {
    title: 'Promise to pay',
    dltId: '1307169596517438538',
  },
  '64c3c87cd6fc05330669f4c2': {
    title: 'Assistance Alert for defaulter',
    dltId: '1307169027603166364',
  },
  '649696e3d6fc055f102f76f2': {
    title: 'Repaid Loan Ontime',
    dltId: '1307168751793642698',
  },
  '64932e9ed6fc056b464fdf82': {
    title: 'Settlement Offer Given',
    dltId: '1307168725157421541',
  },
  '64932e08d6fc0504ba2f20e2': {
    title: 'Email Received Settlement',
    dltId: '1307168725199815264',
  },
  '649283b2d6fc05251a238822': {
    title: 'Settlement request',
    dltId: '1307168724734963801',
  },
  '6491b288d6fc052c9a7adf73': {
    title: 'RECEIVED PAYMENT',
    dltId: '1307168724712818383',
  },
  '612dd751c054d16e1308d7ca': {
    title: 'Bank statement rejection',
    dltId: '1307163116839703602',
  },
  '612dd722a921a67a3b006422': {
    title: 'Bank statement verification',
    dltId: '1307163116835761421',
  },
  '60eecca0853be5389d1e6285': {
    title: 'Loan payment due',
    dltId: '1307162572334149354',
  },
  '612dd4d50c5a870994692595': {
    title: 'Manual company verification',
    dltId: '1307163116814153313',
  },
  '612dd5ae6e6fa51c456e3af3': {
    title: 'Manual company rejection',
    dltId: '1307163116820292717',
  },
  '60e6c6df5344291cad2079b2': {
    title: 'Work email verification',
    dltId: '1307162572192663626',
  },
  '60f25e4646c5b64853341e1a': {
    title: 'Work email rejection',
    dltId: '1307162626675085797',
  },
  '6135dc6c2c64e43f4851ef34': {
    title: 'Manual salary slip verification',
    dltId: '1307163116856749635',
  },
  '6135dc8aaa4edd58e85c7372': {
    title: 'Manual salary slip rejection',
    dltId: '1307163116863382199',
  },
  '612dd60f58424f7b98639118': {
    title: 'Residence proof verification',
    dltId: '1307163116824308506',
  },
  '612dd6a7b9983b467821c362': {
    title: 'Residence proof rejection',
    dltId: '1307163116831652798',
  },
  '645356c4d6fc053f276e7902': {
    title: 'Refund Amount',
    dltId: '1307168251663016885',
  },
  '614c235b10afa65fcc73d163': {
    title: 'Payment failure',
    dltId: '1307162572373657558',
  },
  '648afec1d6fc057eef04aa62': {
    title: 'Payment successful',
    dltId: '1307168682595551711',
  },
  '648b14b3d6fc055da6677f12': {
    title: 'Inform To Advocate',
    dltId: '1307168683541999664',
  },
  '6404638ad6fc051653753d43': {
    title: 'Bureau & lower interest',
    dltId: '1307167282597030406',
  },
  '64046258d6fc0542b0778f53': {
    title: 'Lower Interest Ontime',
    dltId: '1307167282594901697',
  },
  '64045cc9d6fc056b0e28f772': {
    title: 'System timeline LNDITT',
    dltId: '1307167282591542801',
  },
  '60eec950f268b346836df912': {
    title: 'Loan Approval',
    dltId: '1307162572174936882',
  },
  '60eec81788b2dc2c8e612bb6': {
    title: 'Payment reminder',
    dltId: '1307162572299259325',
  },
  '665187d2d6fc0508eb498153': {
    title: 'OTP Verification',
    dltId: '1307162626643788321',
  },
  '666447ecd6fc051e4453afd2': {
    title: 'Payment Request',
    dltId: '1307171784445639628',
  },
  DISBUREMENT: '60eec950f268b346836df912',
  PAYMENT_REMINDER: '60eec81788b2dc2c8e612bb6',
  DEFAULTER_PROMO_CODE_OFFER: '653a2f74d6fc0533c9796163',
  PTP_REMINDER: '64c3c87cd6fc05330669f4c2',
  EMIOverDueSMSID: '60eecca0853be5389d1e6285',
  RefundSMSId: '645356c4d6fc053f276e7902',
  PaymentFailedSMSId: '614c235b10afa65fcc73d163',
  paidLegalSmsId: '648b14b3d6fc055da6677f12',
  caseFilledSMSId: '652677e8d6fc05683f2cd1e2',
  PaymentSuccessSMSId: '648afec1d6fc057eef04aa62',
  NotAppliedUserSMSId: '649696e3d6fc055f102f76f2',
  SendReviewMsgId: '653a3628d6fc051dee18f7e2',
  SEND_OTP_TEMPLATE: '665187d2d6fc0508eb498153',
  PAYMENT_REQUEST: '666447ecd6fc051e4453afd2',
};

export const kUserLogs = {
  [`/${Latest_Version}/user/verifyOTP`]: 'Mobile number verified',
  [`/${Latest_Version}/user/submitNewUserDetails`]: 'Basic Details verified',
  [`/${Latest_Version}/user/uploadSelfie`]: 'Profile picture submitted',
  [`/${Latest_Version}/employment/submitDetails`]: 'Employement submitted',
  [`/${Latest_Version}/employment/updateWorkEmail`]: 'Workmail submitted',
  [`/${Latest_Version}/employment/verifyOTP`]: 'Workmail Verified',
  [`/${Latest_Version}/kyc/validatemAadhaar`]: 'Aadhaar submitted',
  [`/${Latest_Version}/kyc/aadhaarOtpVerify`]: 'Aadhaar verified',
  [`/${Latest_Version}/banking/inviteForAA`]: 'Bank statement started',
  [`/${Latest_Version}/banking/validateEligibility`]:
    'Bank statement submitted',
  [`/${Latest_Version}/banking/validateAA`]: 'Bank statement submitted',
  [`/${Latest_Version}/loan/submitReferences`]: 'References submitted',
  [`/${Latest_Version}/loan/acceptAmount`]: 'Loan accepted',
  [`/${Latest_Version}/mandate/generateLink`]: 'E-Mandate registration',
  [`/${Latest_Version}/mandate/generateLink/`]: 'E-Mandate registration',
  [`/${Latest_Version}/esign/inviteForESign`]: 'Invited for E-Sign',
  [`/${Latest_Version}/esign/checkEsingStatus`]: 'E-Sign Completed',
  [`/${Latest_Version}/transaction/createPaymentOrder`]:
    'Payment Order Created',
};

//daily report to management
export const disburseFilds = [
  'Daily Interest Rate (%)',
  'New Loan Count',
  'New Loan Amount',
  'Repeat Loan Count',
  'Repeat Loan Amount',
  'Total Loan Count',
  'Total Loan Amount',
];
export const repaidFilds = [
  'Daily Interest Rate (%)',
  'Principal Recovered',
  'Interest Charges Recovered',
  'Penalty Recovered',
  'New User Amount Recovered',
  'Repeat User Amount Recovered',
  'Total Amount Recovered',
];
//daily collection report
export const dayWiseFields = [
  'Bucket',
  '1-15',
  '16-30',
  '31-60',
  '61-90',
  '90+',
  'Total',
];
//ledger
export const ledgerFields = [
  'TXN DATE',
  'PARTICULARS',
  'PLATFORM',
  'UTR',
  'DR',
  'CR',
  'BALANCE',
];
export const desiredRangeOrder = ['1-15', '16-30', '31-60', '61-90', '90+'];

// Web data -> Account aggregator
export function getAAWebData(initialURL, userId) {
  return {
    initialProcessing: true,
    jsTriggers: {
      [aaURL]: {
        onLoadStart: {
          triggers: [],
          state: { isProcessing: true },
        },
        consoles: [
          {
            combinations: ['CAMS_RESPONSE'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/banking/validateAA`,
                method: 'POST',
                body: { userId },
              },
            ],
          },
        ],
      },
      'https://webrd.onemoney.in/aa/v2/redirect': {
        onUpdateVisitedHistory: {
          triggers: [],
          state: { isProcessing: true },
        },
        consoles: [
          {
            combinations: ['CAMS_RESPONSE'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/banking/validateAA`,
                method: 'POST',
                body: { userId },
              },
            ],
          },
        ],
      },
      [nFinvuJourneyURL]: {
        allowContains: true,
        allowAnyConsole: true,
        consoles: [
          {
            combinations: ['FINVU_AA_JOURNEY_COMPLETED'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/banking/validateAA`,
                method: 'POST',
                headers: {},
                body: { userId },
              },
            ],
            state: { isProcessing: true },
          },
        ],
        onLoadStop: {
          state: { isProcessing: false },
        },
      },
      [initialURL]: {
        onLoadStop: { state: { isProcessing: false } },
      },
    },
    apiTriggers: {},
    initialURL,
    type: 'CAMS_AA',
  };
}

export function getSwiggyData(userId) {
  return {
    title: 'Verify your residence',
    initialURL: 'https://www.swiggy.com/auth',
    initialLoader: true,
    type: 'SWIGGY',
    jsTriggers: {
      'https://www.swiggy.com/auth': {
        onLoadStart: {
          triggers: [
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
        },
        onLoadStop: {
          state: { isLoader: false },
          triggers: [
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
        },
      },
      'https://www.swiggy.com/auth/otp-verify': {
        allowAnyConsole: true,
        consoles: [
          {
            urlCombinations: ['https://www.swiggy.com'],
            state: { getCookies: true, isLoader: true },
            cookies: ['_sid', '_session_tid'],
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/residence/validateAutomation`,
                method: 'POST',
                body: { type: 'SWIGGY', userId },
              },
            ],
          },
        ],
      },
    },
    apiTriggers: {},
  };
}

export function getFlipkartData(userId) {
  return {
    title: 'Verify your residence',
    initialURL:
      'https://www.flipkart.com/login?ret=%2F&entryPage=HEADER_ACCOUNT&sourceContext=DEFAULT',
    initialLoader: true,
    type: 'FLIPKART',
    jsTriggers: {
      'https://www.flipkart.com/login': {
        onLoadStart: {
          triggers: [
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
        },
        onLoadStop: {
          state: { isLoader: false },
          triggers: [
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
        },
      },
      'https://www.flipkart.com/': {
        allowAnyConsole: true,
        onLoadStart: { state: { isProcessing: true } },
        consoles: [
          {
            urlCombinations: ['https://www.flipkart.com/'],
            state: { getCookies: true },
            cookies: ['SN', 's_sq'],
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/residence/validateAutomation`,
                method: 'POST',
                body: {
                  userId,
                  type: 'FLIPKART',
                },
              },
            ],
          },
        ],
      },
    },
    apiTriggers: {},
  };
}

export function getSubscriptionData(userId, loanId, initialURL) {
  return {
    title: 'Register eMandate',
    initialURL,
    type: 'SUBSCRIPTION',
    jsTriggers: {
      [HOST_URL + `${Latest_Version}/mandate/callback`]: {
        onLoadStart: {
          state: { isProcessing: true },
          triggers: ['console.log("LENDITT_SUBSCRIPTION_CHECK");'],
        },
        consoles: [
          {
            combinations: ['LENDITT_SUBSCRIPTION_CHECK'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/mandate/checkStatus`,
                method: 'POST',
                body: { loanId, userId },
              },
            ],
          },
        ],
      },
    },
    apiTriggers: {},
  };
}

export const kSubscriptionData = {
  initialHTMLData: null,
  initialURL: '',
  initialLoader: false,
  title: 'E-mandate',
  type: 'SUBSCRIPTION',
  showPinchDialog: true,
  holdTime: 30,
  jsTriggers: {
    'https://enach.npci.org.in/onmags/sendRequest': {
      onLoadStop: {
        triggers: [
          "if(document.getElementById('ErrorDesc').value==='MER_DUPLC_REQUEST' && document.getElementById('ErrorCode').value==='534') console.log('duplicate_mandate')",
        ],
      },
      consoles: [
        {
          combinations: ['duplicate_mandate'],
          state: { holdMandate: true },
        },
      ],
    },
  },
  apiTriggers: {},
  redirectIncludes: ['/v1/payments/'],
  stopRedirects: ['redirect_callback'],
  responseStr: [],
  keyboardScripts: [],
};

export function getCAMSBankStr(bankCode: string) {
  switch (bankCode.toLowerCase()) {
    case 'axis':
      return 'Axis';
    case 'icici':
      return 'ICICI Bank';
    case 'idfc':
      return 'IDFC';
    case 'kotak':
      return 'Kotak Mahindra Bank';
    default:
      return '';
  }
}
// Referral stages and points
export const ReferralStages = {
  SIGNUP: 1,
  AADHAAR: 6,
  LOAN_ACTIVE: 16,
  LOAN_COMPLETE: 17,
};

export function getReferralPoints(stage) {
  switch (stage) {
    case 6:
      return 25;
    case 16:
      return 25;
    case 17:
      return 25;
    default:
      return 0;
  }
}

export const CRMPipelineStages = {
  REGISTRATION: {
    id: 109349,
    name: 'Registration',
  },
  BASIC_DETAILS: {
    id: 109353,
    name: 'Basic Details',
  },
  AADHAR_DETAILS: {
    id: 109412,
    name: 'Aadhar Details',
  },
  EMPLOYMENT_DETAILS: {
    id: 109354,
    name: 'Employment Details',
  },
  BANKING_DETAILS: {
    id: 110089,
    name: 'Bank Details',
  },
  WON: {
    id: 109350,
    name: 'Won',
  },
  CLOSED_UNQUALIDIED: {
    id: 109351,
    name: 'Closed Unqualified',
  },
  CLOSED_LOST: {
    id: 109352,
    name: 'Closed lost',
  },
};

export const CRMPipelineObject = {
  id: 15799,
  name: 'Process Pipeline',
  stage: {
    id: 109172,
    name: 'registration',
  },
};

export const kReferralBannerData = [
  {
    labelData: 'LIVE NOW',
    uptoText: 'UPTO ₹300',
    perText: 'PER REFERRAL',
    title: 'REFER YOUR FRIENDS',
    subtitle: 'GET UNLIMITED CASH',
    btnTxt: 'REFER NOW!',
    bgColor: '0xffF5D1BC',
    labelTxtColor: '0xff816758',
    uptoBgColor: '0xff816758',
    btnBgColor: '0xff1C2525',
    gifColor: '0xffF5D1BC',
  },
  {
    labelData: 'LIVE NOW',
    uptoText: 'UPTO ₹300',
    perText: 'PER REFERRAL',
    title: 'REFER YOUR FRIENDS',
    subtitle: 'GET UNLIMITED CASH',
    btnTxt: 'REFER NOW!',
    bgColor: '0xffBCD3F5',
    labelTxtColor: '0xff7A91B4',
    uptoBgColor: '0xff7A91B4',
    btnBgColor: '0xff1C2525',
    gifColor: '0xffBCD3F5',
  },
  {
    labelData: 'LIVE NOW',
    uptoText: 'UPTO ₹300',
    perText: 'PER REFERRAL',
    title: 'REFER YOUR FRIENDS',
    subtitle: 'GET UNLIMITED CASH',
    btnTxt: 'REFER NOW!',
    bgColor: '0xffBDBCF5',
    labelTxtColor: '0xff9392C6',
    uptoBgColor: '0xff8180AF',
    btnBgColor: '0xff1C2525',
    gifColor: '0xffBDBCF5',
  },
];

export const kUIDAIData = {
  initialURL: 'https://myaadhaar.uidai.gov.in/genricDownloadAadhaar',
  initialLoader: false,
  isSix: true,
  type: 'UIDAI_FLOW',
  initialshowCaptcha: true,
  initialCaptchaLoader: true,
  jsTriggers: {
    'https://myaadhaar.uidai.gov.in/genricDownloadAadhaar': [
      "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",

      'isLoader=false',
    ],
  },
  apiTriggers: {
    'https://myaadhaar.uidai.gov.in/genricDownloadAadhaar': [
      {
        url: 'https://tathya.uidai.gov.in/unifiedAppAuthService/api/v2/get/captcha',
        urlMethod: 'POST',
        waitForCallbackResponse: true,
        callbackURL: HOST_URL + `${Latest_Version}/webview/validateResponse`,
        directSource: {
          captchaLength: '3',
          captchaType: '2',
          langCode: 'en',
        },
        source: { type: 'UIDAI_CAPTCHA' },
      },
    ],
  },
  captchaTriggers: {
    url: 'https://tathya.uidai.gov.in/unifiedAppAuthService/api/v2/get/captcha',
    urlMethod: 'POST',
    waitForCallbackResponse: true,
    callbackURL: HOST_URL + `${Latest_Version}/webview/validateResponse`,
    directSource: {
      captchaLength: '3',
      captchaType: '2',
      langCode: 'en',
    },
    source: { type: 'UIDAI_CAPTCHA' },
  },
  captchaSubmission: {
    url: HOST_URL + `${Latest_Version}/webview/validateResponse`,
    urlMethod: 'POST',
    waitForCallbackResponse: true,
    directSource: {
      source: { type: 'UIDAI_CAPTCHA_SUBMISSION' },
    },
    source: {},
  },
  resendOTP: {
    url: HOST_URL + `${Latest_Version}/webview/validateResponse`,
    urlMethod: 'POST',
    directSource: { type: 'UIDAI_RESEND_OTP' },
  },
  responseStr: [],
};

export function getmAadhaarData(userId) {
  return {
    title: 'Verify your aadhaar',
    initialURL: 'https://myaadhaar.uidai.gov.in/',
    initialLoader: true,
    type: 'mAadhaar',
    jsTriggers: {
      'https://myaadhaar.uidai.gov.in/': {
        onLoadStop: {
          triggers: ['document.getElementsByTagName("button")[0].click();'],
        },
        consoles: [
          {
            combinations: ['residentPhoto', 'mobile', 'careof'],
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/kyc/validatemAadhaar`,
                method: 'POST',
                body: {
                  userId,
                },
              },
            ],
          },
        ],
      },
      'https://tathya.uidai.gov.in/login': {
        onLoadStop: {
          state: { isLoader: false, isServiceWorking: true },
        },
      },
      'https://myaadhaar.uidai.gov.in/auth/redirect': {
        onLoadStart: {
          triggers: [
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
          state: { isProcessing: true },
        },
      },
    },
    apiTriggers: {},
  };
}

export const kFlipkartData = {
  initialURL:
    'https://www.flipkart.com/login?ret=%2F&entryPage=HEADER_ACCOUNT&sourceContext=DEFAULT',
  initialLoader: true,
  isSix: true,
  title: 'Login to verify residence',
  type: 'flipkart',
  jsTriggers: {
    'https://www.flipkart.com/login': [
      'cookieData=\'{"zomato.com":{"list":["cid","zat"]},"delayInSec":3,"type":"flipkartLogInCookie"}\'',

      'document.getElementsByTagName("button")[2].addEventListener("click", function () { console.log("showOTPFill=true"); });',
      'document.getElementsByTagName("button")[2].addEventListener("submit", function () { console.log("showOTPFill=true"); });',
      'document.getElementsByTagName("span")[0].remove();',

      'isLoader=false',
    ],
  },
  keyboardScripts: [
    'document.activeElement.blur();',
    'document.activeElement.blur();',
    'document.activeElement.blur();',
    'document.activeElement.blur();',
  ],
  responseStr: [],
};

export const kSwiggyData = {
  title: 'Verify your residence',
  initialURL: 'https://www.swiggy.com/auth',
  initialLoader: true,
  type: 'swiggy',
  jsTriggers: {
    'https://www.swiggy.com/auth': {
      onLoadStart: {
        triggers: [
          "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
        ],
      },
      onLoadStop: {
        state: { isLoader: false },
        triggers: [
          "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
        ],
      },
    },
    'https://www.swiggy.com/': {
      allowAnyConsole: true,
      consoles: [
        {
          urlCombinations: ['https://www.swiggy.com'],
          state: { getCookies: true, isLoader: false },
          cookies: ['_sid', '_session_tid'],
          apiTriggers: [
            {
              url: 'https://192.168.1.154:2005/v3/kyc/validatemAadhaar',
              method: 'POST',
              body: {
                userId: 'a7d9d405-5c75-42f1-9587-9e3c6d79266e',
              },
            },
          ],
        },
      ],
    },
  },
  apiTriggers: {},
};

export const kZomatoData = {
  initialURL: 'https://www.zomato.com/',
  initialLoader: true,
  title: 'Login to verify residence',
  type: 'zomato',
  jsTriggers: {
    'https://www.zomato.com/': [
      'document.body.getElementsByTagName("span")[0].click();',

      "Delayed=>10000#document.getElementsByTagName('h2')[0].innerText = 'Login to verify your residence'; document.getElementsByTagName('h2')[0].style.fontSize = '18px';",

      'cookieData=\'{"zomato.com":{"list":["cid","zat"]},"delayInSec":3,"type":"zomatoLogInCookie"}\'',

      // 'document.getElementsByTagName("span")[3].addEventListener("click", function () { if (document.getElementsByTagName("input")[0].value?.length == 10) console.log("showOTPFill=true") });',

      'isLoader=false',
    ],
  },
  responseStr: [],
};

export const kCreditRange = [
  {
    min: 300,
    max: 399,
    label: 'Poor',
    first: true,
    second: false,
    third: false,
    four: false,
  },
  {
    min: 400,
    max: 499,
    label: 'Good',
    first: true,
    second: true,
    third: false,
    four: false,
  },
  {
    min: 500,
    max: 699,
    label: 'Very Good',
    first: true,
    second: true,
    third: true,
    four: false,
  },
  {
    min: 700,
    max: 900,
    label: 'Excellent',
    first: true,
    second: true,
    third: true,
    four: true,
  },
];

export const kMockAadhaarResponse01 = {
  status: 'success',
  reference_id: 'lspbscaim1',
  transaction_id: 'TXNXEOM0E58ZL',
  response_time_stamp: '2022-07-05T16:02:37',
  document_status: [{ type: 'Aadhaar XML', status: 'success' }],
};

export const kMockAddressToCoordinates01 = [
  {
    address: '703, Zion prime, 7th floor, Hebatpur',
    id: 1701,
    lat: '23.0508124',
    long: '72.4848273',
  },
  {
    address: '305, Magnumm Inn, Above Honest 3rd floor, 3rd floor, Joshipura',
    id: 1702,
    lat: '21.5424048',
    long: '70.4552982',
  },
  {
    address:
      '410 A, Shilp Aron, Sindhubhavan road, bodakdev, Shilp Aaron, Bodakdev, Ahmedabad, Gujarat, India',
    id: 1703,
    lat: '23.0395091',
    long: '72.5003733',
  },
  {
    address: 'A4, Shree Chala, Ground Floor, Chala, Vapi',
    id: 1704,
    lat: '20.3900527',
    long: '72.8817619',
  },
  {
    address:
      '23, Aarohi Vila, Near Sun City, Marvel Society, South Bopal, Bopal, Ahmedabad',
    id: 1705,
    lat: '23.0211984',
    long: '72.4672348',
  },
  {
    address: '23, Aarohi Villa, Near Sun City, South Bopal, Bopal',
    id: 1706,
    lat: '23.0211984',
    long: '72.4672348',
  },
];

export const kAddressExceptions = [
  ',',
  'india',
  'usa',
  'phillippines',
  '/',
  '-',
  '',
];

// Residence route
const kResidenceAutomationOptions = [
  {
    asset: 'amazonV2',
    header: 'Amazon',
    title: 'Express verification',
    isActive: false,
  },
  {
    asset: 'blinkItV2',
    header: 'Blinkit',
    title: 'Express verification',
    isActive: false,
  },
  {
    asset: 'flipkartV2',
    header: 'Flipkart',
    title: 'Express verification',
    isActive: false,
  },
  {
    asset: 'swiggyV2',
    header: 'Swiggy',
    title: 'Express verification',
    isActive: false,
  },
  {
    asset: 'zomatoV2',
    header: 'Zomato',
    title: 'Express verification',
    isActive: false,
  },
  {
    asset: 'ManualVerificationLogoV2',
    header: 'Manual verification',
    title: 'Will go under manual verification and it might take sometime!!',
    isActive: true,
  },
];

export function kGetResidenceAutomationOptions(userDetails?) {
  try {
    if (userDetails.typeOfDevice != '2')
      return kResidenceAutomationOptions.filter((el) => el.isActive);
    else
      return [
        {
          asset: 'ManualVerificationLogoV2',
          header: 'Manual verification',
          title:
            'Will go under manual verification and it might take sometime!!',
        },
      ];
  } catch (error) {
    return [
      {
        asset: 'ManualVerificationLogoV2',
        header: 'Manual verification',
        title: 'Will go under manual verification and it might take sometime!!',
      },
    ];
  }
}

// ##### Kylas Header
export const KylasHeader = {
  'api-key': KYLAS_API_KEY,
  'Content-Type': 'application/json',
};

// Razorpay
export const kPayoutBanks = {
  bacc_HYmABgSBbPRozl: 'RAZORPAY X',
  bacc_JRtlJu0ZyNn17I: 'RBL',
};

export const kDynamicSettings: any[] = [
  {
    service: true,
    title: 'Insurance',
    data: {},
  },
  {
    service: true,
    title: 'Charges',
    data: {},
  },
];

export function kGetOTPTriggers(otp, type) {
  if (type == 'cams')
    return ` document.getElementsByTagName("p")[5].innerText = ""; for(let index = 0; index < ${otp.length}; index++) { const el = "${otp}"[index]; const element = document.getElementsByTagName("input")[index]; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(element, el); element.dispatchEvent(new Event("input", { bubbles: true}));}`;
  if (type == 'flipkart')
    return `for(let index = 0; index < ${otp.length}; index++) { const el = "${otp}"[index]; const element = document.getElementsByTagName("input")[index]; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(element, el); element.dispatchEvent(new Event("input", { bubbles: true}));}`;
  if (type == 'swiggy')
    return `for(let index = 0; index < ${otp.length}; index++) { const el = "${otp}"[index]; const element = document.getElementsByTagName("input")[index]; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(element, el); element.dispatchEvent(new Event("input", { bubbles: true}));} document.body.getElementsByTagName("button")[1].click();`;
  if (type == 'zomato')
    return `for(let index = 0; index < ${otp.length}; index++) { const el = "${otp}"[index]; const element = document.getElementsByTagName("input")[index]; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(element, el); element.dispatchEvent(new Event("input", { bubbles: true}));}`;
  if (type == 'UIDAI_FLOW') return;
  return `for(let index = 0; index < ${otp.length}; index++) { const el = "${otp}"[index]; const element = document.getElementsByClassName("clr-f dIB")[index]; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(element, el); element.dispatchEvent(new Event("input", { bubbles: true}));}`;
}

export function kGetActiveSettings() {
  try {
    return kDynamicSettings.filter((el) => el.service == true);
  } catch (error) {
    return [];
  }
}

export const KCaptchResponse = {
  response_data: {
    captcha:
      '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',
    uuid: '8208e9ad-8305-4833-96c4-49df4400da06',
  },
  response_status: {
    code: '000',
    message: 'Captcha fetched Successfully',
    status: 'SUCCESS',
  },
};

export const kAddAadharResponse = {
  response_data: {
    message: 'OTP sent to your Registered Mobile number',
  },
  response_status: {
    code: '000',
    message: 'OTP sent to your Registered Mobile number',
    status: 'SUCCESS',
  },
};

export const kAddAadharResponseData = {
  response_data: {
    doc_type: 'AADHAAR',
    document_id: 'XXXXXXXX7059',
    name: 'Rahil Patel', //name as in aadhaar XML file
    address: 'test', //Address as in aadhaar XML file
    gender: 'M', //Gender as in aadhaar XML file
    dob: '13/12/2000',
    doc_face: 'ghdfkjgdkf', //doc_face will be in base64
    father_name: '',
    mother_name: '',
    phone: '<hashed mobile value>',
    email: '',
    verified_by: '', //UIDAI entity
    verified_using: '', //digital signaure
    reference_id: '',
    seg_address: 'Base64 encoded string of segregated address',
    //unique id assign by UIDAI server while downloading aadhaar XML file
  },
  response_status: {
    code: '',
    message: '',
    status: 'SUCCESS|FAIL',
  },
};

export const kVeri5MockResponseAadhaar01 = {
  address:
    'S/O: Rasikbhai,D-402, Akash-3,132 Feet Road,B/H, A.E.C. Office,Naranpura,Naranpura Vistar,Ahmadabad City,Ahmedabad,Ahmedabad City,Gujarat,India,380013',
  dob: '14/12/1995',
  addressDetails:
    '{"country":"India","loc":"Naranpura","subdist":"Ahmadabad City","pc":"380013","vtc":"Ahmedabad City","street":"132 Feet Road","dist":"Ahmedabad","state":"Gujarat","co":"S\\/O: Rasikbhai","landmark":"B\\/H, A.E.C. Office","house":"D-402, Akash-3","po":"Naranpura Vistar"}',
  aadhaarAddressResponse:
    '"{\\"country\\":\\"India\\",\\"loc\\":\\"Naranpura\\",\\"subdist\\":\\"Ahmadabad City\\",\\"pc\\":\\"380013\\",\\"vtc\\":\\"Ahmedabad City\\",\\"street\\":\\"132 Feet Road\\",\\"dist\\":\\"Ahmedabad\\",\\"state\\":\\"Gujarat\\",\\"co\\":\\"S\\\\/O: Rasikbhai\\",\\"landmark\\":\\"B\\\\/H, A.E.C. Office\\",\\"house\\":\\"D-402, Akash-3\\",\\"po\\":\\"Naranpura Vistar\\"}"',
  profile_image:
    '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',
  full_name: 'Patel Vishal Rasikbhai',
  gender: 'M',
  aadhaarDoc:
    'https://storage.googleapis.com/backend_static_stuff/1665631711488.zip',
  aadhaarPassword: '1665',
};

export function kGetBankCode(bankCode) {
  try {
    switch (bankCode) {
      case 'PUNB':
        return 'PUNB_R';

      case 'BARB':
        return 'BARB_R';

      case 'BKID':
        return 'BOI';

      case 'IDIB':
        return 'INDIAN_BANK';

      case 'KVGB':
        return 'KARNATAKA_VG';

      case 'APGB':
        return 'ANDHRA_PG';

      case 'NSPB':
        return 'NSDL';

      default:
        return bankCode;
    }
  } catch (error) {
    return kInternalError;
  }
}

export const kFailedMatchForAWS = {
  SourceImageFace: {
    BoundingBox: {
      Width: 0.08201093971729279,
      Height: 0.099341481924057,
      Left: 0.1808568835258484,
      Top: 0.5423643589019775,
    },
    Confidence: 99.93203735351562,
  },
  FaceMatches: [],
  UnmatchedFaces: [
    {
      BoundingBox: {
        Width: 0.31947606801986694,
        Height: 0.18552914261817932,
        Left: 0.3411911129951477,
        Top: 0.8475890159606934,
      },
      Confidence: 70.55056762695312,
      Landmarks: [
        {
          Type: 'eyeLeft',
          X: 0.4316558837890625,
          Y: 0.9534050226211548,
        },
        {
          Type: 'eyeRight',
          X: 0.5319926142692566,
          Y: 0.9540430903434753,
        },
        {
          Type: 'mouthLeft',
          X: 0.45550408959388733,
          Y: 1.0179628133773804,
        },
        {
          Type: 'mouthRight',
          X: 0.5399672389030457,
          Y: 1.0188156366348267,
        },
        {
          Type: 'nose',
          X: 0.4737262725830078,
          Y: 1.0094364881515503,
        },
      ],
      Pose: {
        Roll: -1.1180949211120605,
        Yaw: -4.507333755493164,
        Pitch: 5.6618804931640625,
      },
      Quality: {
        Brightness: 70.0324478149414,
        Sharpness: 9.912903785705566,
      },
    },
  ],
  isMatched: false,
  isInternalError: true,
};

export const ptpCrmIds = [44, 80, 81];

// Razorpay -> 3rd Party
export const kRazorpayM1Auth = {
  username: process.env.RAZOR_PAY_ID,
  password: process.env.RAZOR_PAY_KEY,
};

export const kRazorpayM2Auth = {
  username: process.env.RAZORPAY_M2_APP_ID,
  password: process.env.RAZORPAY_M2_SECRET_ID,
};

export const kDevBankAccs = [
  '10067785453',
  '922010048193799',
  '916010009531049',
];

//#region get esign data
export function getEsignURLData(
  loanId,
  initialURL,
  previewURL,
  aadhaar_number,
) {
  return {
    title: 'Loan agreement',
    initialURL: initialURL,
    previewURL: previewURL,
    initialProcessing: false,
    type: 'ESIGN',
    showPinchDialog: true,
    appLifecycleTriggers: {
      resumed: {
        triggers: [],
        apiTriggers: [
          {
            url: HOST_URL + `${Latest_Version}/esign/checkEsingStatus`,
            method: 'POST',
            body: { loanId },
          },
        ],
      },
    },
    jsTriggers: {
      [ZOOP_RESPONSE_URL]: {
        onLoadStop: {
          state: { isLoader: true },
          triggers: ["console.log('LENDITT_ESIGN');"],
        },
        consoles: [
          {
            combinations: ['LENDITT_ESIGN'],
            state: { isLoader: true },
            apiTriggers: [
              {
                url: HOST_URL + `${Latest_Version}/esign/checkEsingStatus`,
                method: 'POST',
                body: { loanId },
              },
            ],
          },
        ],
      },
      'https://esign.egov-nsdl.com/nsdl-esp/authenticate/': {
        allowContains: true,
        onLoadStop: {
          triggers: [
            'var $scope=angular.element(document.getElementsByTagName("input")[1]).scope();$scope.$apply(()=>{$scope.chkvalue=!0,$scope.vid="' +
            aadhaar_number +
            '"});',
          ],
        },
      },
      'https://esign.verasys.in/esp/authpage': {
        onLoadStop: {
          triggers: [
            // 'document.getElementById("uid").value = ' + aadhaar_number,
            // 'document.getElementById("uid").readOnly = true',
            // 'document.getElementById("uid").dispatchEvent(new Event(\'change\'))',
            // 'document.getElementById("uid").focus()',
            // 'document.getElementById("uid").blur()',
          ],
        },
      },
    },
    popTriggers: {
      apiTriggers: [
        {
          url: HOST_URL + `${Latest_Version}/esign/checkEsingStatus`,
          method: 'POST',
          body: { loanId },
        },
      ],
    },
  };
}

//#endregion

// Need changes for play store / app store dummy account as they should see permission screen each time login
export const kDummyAccs = ['7600550021', '1211111111'];
export const kDummyUserIds = [
  '1fbde476-d038-4319-9144-82a6d463bba6',
  'a1fd2860-252c-435d-bc95-1ed3f65ef6e2',
];

// Accountings
export const fundAccData = {
  ICICI_CONNECTED_51633_23f0101: 'ICICI BANK',
};

// User current Stage
export const UserStage = {
  PHONE_VERIFICATION: 1,
  // Here basic details includes all 3 stages -> Basic, personal, professional
  BASIC_DETAILS: 2,
  SELFIE: 3,
  NOT_ELIGIBLE: 4,
  PIN: 5,
  AADHAAR: 6,
  EMPLOYMENT: 7,
  BANKING: 8,
  RESIDENCE: 9,
  LOAN_ACCEPT: 10,
  CONTACT: 11,
  PAN: 12,
  FINAL_VERIFICATION: 13,
  MANDATE: 14,
  ESIGN: 15,
  DISBURSEMENT: 16,
  REPAYMENT: 17,
  DEFAULTER: 18,
  REAPPLY: 19,
  NO_ROUTE: 20,
  EXPRESS_REAPPLY: 21,
};

export const RedisKeys = {
  CALCULATION_DATA: 'CALCULATION_DATA',
  MOCK_SERVICES: 'MOCK_SERVICES',
  MOCK_CIBIL_DATA: 'MOCK_CIBIL_DATA',
};

export const MockResponses = {
  hardikUIDAISuccess:
    '{"status":"Success","responseData":{"state":"","valid":true,"eid":"","informationSharingConsent":true,"localResName":"Vaghasiya Hardik Rameshbhai","localCareof":"","localBuilding":"","email":"","dob":"2000-11-17","mobile":"","gender":"MALE","landmark":null,"street":"","locality":"","district":"","vtc":"","building":"","districtName":"Junagadh","vtcName":"Umrali","stateName":"Gujarat","poName":"Umrali","careof":"","poNameLocal":"","localVtc":"","localState":"","localDistrict":"","pincode":"362020","uid":"894628052277","localStreet":"","localLocality":"","localLandmark":null,"refId":null,"langCode":"","relationInfo":null,"biometricFlag":false,"dobStatus":"","enrolmentDate":"","enrolmentNumber":"","enrolmentType":"","exceptionPhoto":null,"isCurrent":false,"isNRI":"false","isdCode":"+91","poType":null,"poa":null,"poi":null,"residentPhoto":"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","subDistrict":"","subDistrictLocalName":"","subDistrictName":"Bhesan","updatedEIds":[],"updatedEIdsCount":0,"updatedRefIds":[],"updatedRefIdsCount":0,"name":"Vaghasiya Hardik Rameshbhai","aadhaar_service":"ZOOP"}}',
};

export function getPaymentWebDataForICICIUPI(paymentLink, userId, loanId) {
  const jsTriggerURL = nPaymentRedirect.replace('?key=', '');
  return {
    title: 'Repayment',
    initialURL: paymentLink,
    initialLoader: true,
    useShouldInterceptRequest: false,
    useShouldInterceptAjaxRequest: false,
    jsTriggers: {
      [jsTriggerURL]: {
        consoles: [
          {
            combinations: ['stopProcessing'],
            state: {
              isProcessing: false,
              isLoader: false,
            },
          },
          // For razorpay and cashfree web payment
          {
            combinations: ['TRANSACTION_ID_'],
            apiTriggers: [
              {
                url: `${HOST_URL}${Latest_Version}/transaction/syncPaymentWebData`,
                body: {
                  userId,
                  loanId,
                },
                method: 'POST',
              },
            ],
          },
          {
            combinations: ['COMPLETED'],
            state: { isProcessing: true },
            apiTriggers: [
              {
                url: `${HOST_URL}${Latest_Version}/user/routeDetails?id=${userId}&appVersion=999`,
                method: 'GET',
              },
            ],
          },
          {
            combinations: ['FAILED'],
            state: { isProcessing: true },
            apiTriggers: [
              {
                url: `${HOST_URL}${Latest_Version}/user/routeDetails?id=${userId}&appVersion=999`,
                method: 'GET',
              },
            ],
          },
          {
            combinations: ['type', 'payment', 'launchURL'],
          },
        ],
      },
      'https://api.razorpay.com/v1/payments/': {
        allowContains: true,
        onLoadStart: {
          state: {
            isProcessing: true,
          },
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: {
              isProcessing: true,
              isLoader: true,
            },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: {
                  loanId,
                },
              },
            ],
          },
        ],
      },
      'https://razorpay.com/payment-link/': {
        allowContains: true,
        onLoadStart: {
          state: { isProcessing: true },
        },
        onLoadStop: {
          state: { isProcessing: false },
        },
      },
      [HOST_URL + `${Latest_Version}/transaction/checkCallBack`]: {
        allowContains: true,
        allowAnyConsole: true,
        onLoadStart: {
          state: { paymentLoader: true },
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        onLoanStop: {
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: { paymentLoader: true },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId, userId, isAnimation: true },
              },
            ],
          },
        ],
      },
      'https://payments.cashfree.com/order/': {
        allowContains: true,
        onLoadStop: {
          state: {
            isLoader: false,
            isProcessing: false,
          },
          triggers: [
            `setTimeout(async()=>{document.querySelectorAll("button[type='button']").forEach(e=>{"Skip"===e.innerText&&e.click()}),await new Promise(e=>setTimeout(e,200)),document.querySelector(".close").click()},1e3);`,
          ],
        },
      },
      [`${process.env.FRONTEND_BASE_URL}cashfree-payment`]: {
        allowContains: true,
        allowAnyConsole: true,
        onLoadStop: {
          state: {
            isProcessing: true,
            paymentLoader: true,
          },
          triggers: ['console.log("PAYMENT_CHECK")'],
        },
        onLoadStart: {
          state: {
            isProcessing: true,
            paymentLoader: true,
          },
          triggers: ['console.log("PAYMENT_CHECK")'],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: {
              isProcessing: true,
              isLoader: true,
            },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId, userId, isAnimation: true },
              },
            ],
          },
        ],
      },
    },
  };
}

export function getPaymentWebData(paymentLink, loanId) {
  return {
    title: 'Payment',
    initialURL: paymentLink,
    initialProcessing: true,
    type: 'PAYMENT-RAZORPAY',
    showPinchDialog: false,
    jsTriggers: {
      'https://api.razorpay.com/v1/payments/': {
        allowContains: true,
        onLoadStart: {
          state: {
            isProcessing: true,
          },
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: {
              isProcessing: true,
              isLoader: true,
            },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: {
                  loanId,
                },
              },
            ],
          },
        ],
      },
      'https://razorpay.com/payment-link/': {
        allowContains: true,
        onLoadStart: {
          state: { isProcessing: true },
        },
        onLoadStop: {
          state: { isProcessing: false },
        },
      },
      [HOST_URL + `${Latest_Version}/transaction/checkCallBack`]: {
        onLoadStart: {
          state: { isProcessing: true },
        },
        onLoanStop: {
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: { isProcessing: true },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId },
              },
            ],
          },
        ],
      },
    },
  };
}

export function getPaymentWebDatav2(paymentLink, loanId) {
  return {
    title: 'Payment',
    initialURL: paymentLink,
    initialProcessing: true,
    type: 'PAYMENT-RAZORPAY',
    showPinchDialog: false,
    jsTriggers: {
      'https://api.razorpay.com/v1/payments/': {
        allowContains: true,
        onLoadStart: {
          state: { paymentLoader: true },
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        onLoadStop: {
          triggers: [
            "document.getElementsByTagName('body').item(0).style.display = 'none'",
          ],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: { paymentLoader: true },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: {
                  loanId,
                },
              },
            ],
          },
        ],
      },
      'https://razorpay.com/payment-link/': {
        allowContains: true,
        onLoadStart: {
          state: { isProcessing: true },
        },
        onLoadStop: {
          state: { isProcessing: false },
        },
      },
      [HOST_URL + `${Latest_Version}/transaction/checkCallBack`]: {
        onLoadStart: {
          state: { paymentLoader: true },
        },
        onLoanStop: {
          triggers: ["console.log('PAYMENT_CHECK')"],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: { paymentLoader: true },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId },
              },
            ],
          },
        ],
      },
    },
  };
}

export function getCFPaymentWebData(paymentLink, loanId) {
  return {
    title: 'Payment',
    initialURL: paymentLink,
    initialProcessing: true,
    type: 'PAYMENT-CASHFREE',
    showPinchDialog: false,
    jsTriggers: {
      'https://payments.cashfree.com/order/': {
        allowContains: true,
        onLoadStop: {
          state: {
            isLoader: false,
            isProcessing: false,
          },
          triggers: [
            `setTimeout(async()=>{document.querySelectorAll("button[type='button']").forEach(e=>{"Skip"===e.innerText&&e.click()}),await new Promise(e=>setTimeout(e,200)),document.querySelector(".close").click()},1e3);`,
          ],
        },
      },
      'https://lendittfinserve.com/cashfree-payment': {
        onLoadStop: {
          state: {
            isProcessing: true,
            paymentLoader: true,
          },
          triggers: ['console.log("PAYMENT_CHECK")'],
        },
        consoles: [
          {
            combinations: ['PAYMENT_CHECK'],
            state: {
              isProcessing: true,
              isLoader: true,
            },
            apiTriggers: [
              {
                url:
                  HOST_URL + `${Latest_Version}/transaction/checkPaymentOrder`,
                method: 'POST',
                body: { loanId },
              },
            ],
          },
        ],
      },
    },
  };
}

export const kNotificationIcons = {
  'Payment successful':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017905576.svg',
  'eSign completed successfully 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017779259.svg',
  'Employment verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017759099.svg',
  'Bank Statement Verified':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017693295.svg',
  'eMandate registered':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017729939.svg',
  'Reference Contact Verified':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017944113.svg',
  'Profile image Verified':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017922426.svg',
  'Loan Declined':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017885350.svg',
  'Address verified 👍':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017649608.svg',
  'Salary verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017983556.svg',
  'It was quick 👍':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017854020.svg',
  'Loan Approved':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'Loan Rejected':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017885350.svg',
  'Phonebook Contacts verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017944113.svg',
  '🛑  Loan declined':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017885350.svg',
  'Congratulations!!! Your loan has been approved.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'KYC - Optional doc verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'KYC - PAN verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'Loan approved':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'Registration Successful':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'Selfie Normal Decline':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017885350.svg',
  'Kyc issue is resolve':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688119167490.svg',
  'Company verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  '🤝 Superb, Loan approved':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017834949.svg',
  'Reference Contacts Verified 👌':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017944113.svg',
  'Limited Offer !':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117326680.svg',
  'Limited offer !':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117326680.svg',
  'Final reminder for your approved loan. ':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Application under process':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete eMandate step and get the disbursement immediately':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete the application before 7:30PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete the application today before 1PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your application before 3PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your e-Mandate by 11:15 PM and get the disbursement in 5 mins':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your e-Mandate by 11:35 PM and get the disbursement immediately.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your e-Sign now!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 11:10PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 1PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 5:30PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 5PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 6:30PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 7PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application before 8:30PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application now':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application till 9 PM Today!!!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application today before 4PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your loan application today before 6:30PM':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Complete your process':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Do the e mandate and esign process and get the amount in 20 min ':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final Reminder ':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final Reminder for your approved loan':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final Reminder for your approved loan application':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final reminder for your approved loan application.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final Reminder for your approved loan application.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final reminder for your approved loan.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final Reminder for your approved loan.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Final reminder for your pending loan application.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Get the disbursement in 2 minutes':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Just few steps pending for loan amount...!!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Load deadline time active....😮':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your approved loan':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your approved loan application':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your approved loan application.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your loan application':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your loan application!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Regarding your loan application.':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'System Timeline':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118303391.svg',
  'Verify residence':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688017649608.svg',
  'Work mail':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118455595.svg',
  'Facing issue in E-sign?':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118560236.svg',
  ' Just few steps pending for loan amount...!!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'Complete a pending steps and Get a loan amount':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'Complete Remaining Steps ':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'Loan Application is pending':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'Pending loan application':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'e-Mandate issue is resolved. Try now !!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'e-Mandate Issue is Resolved. Try now!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'e-Sign issue resolved...!!!':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'KYC issue resolved':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688118728629.svg',
  'Alert on your loan application':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1688117553690.svg',
  'Referral Points Credited':
    'https://storage.googleapis.com/backend_static_stuff/_assets_NotificationIcons__1691486193005.svg',
  Default: `https://storage.googleapis.com/${EnvConfig.gCloudAssets.cloudStaticBucketName}/${EnvConfig.gCloudAssets.defaultNotiIcn}`,
};

export const CIBILExcelTriggerColumns = {
  'Contact Info-Name1': 'contactName1',
  'Contact Info-Name2': 'contactName2',
  'Contact Info-Name3': 'contactName3',
  'Contact Info-Name4': 'contactName4',
  'Contact Info-Name5': 'contactName5',
  'Acct Info-Account Type': 'accountType',
  'Contact Info-Latest Phone Number': 'latestPhoneNumber',
  'Contact Info-Second Phone Number': 'secondPhoneNumber',
  'Contact Info-Latest Phone Type': 'latestPhoneType',
  'Contact Info-Second Phone Type': 'secondPhoneType',
  'Contact Info-Latest Address - Pin Code': 'latestPinCode',
  'Contact Info-Second Address - Pin Code': 'secondPinCode',
  'Contact Info-Latest Address - State Code': 'latestState',
  'Contact Info-Second Address - State Code': 'secondState',
  'Contact Info-Latest Address - Address Line 1': 'latestAddressLine1',
  'Contact Info-Latest Address - Address Line 2': 'latestAddressLine2',
  'Contact Info-Latest Address - Address Line 3': 'latestAddressLine3',
  'Contact Info-Latest Address - Address Line 4': 'latestAddressLine4',
  'Contact Info-Latest Address - Address Line 5': 'latestAddressLine5',
  'Contact Info-Second Address - Address Line 1': 'secondAddressLine1',
  'Contact Info-Second Address - Address Line 2': 'secondAddressLine2',
  'Contact Info-Second Address - Address Line 3': 'secondAddressLine3',
  'Contact Info-Second Address - Address Line 4': 'secondAddressLine4',
  'Contact Info-Second Address - Address Line 5': 'secondAddressLine5',
  'Contact Info-Latest Address - Address Category': 'latestAddressCategory',
  'Contact Info-Second Address - Address Category': 'secondAddressCategory',
  'Contact Info-Latest Address - Residence Code': 'latestResidenceCode',
  'Contact Info-Second Address - Residence Code': 'secondResidenceCode',
  'Enquiry Info- Enquiry Type': 'enquiryType',
  'Enquiry Info- Enquiry Amount': 'enquiryAmount',
};

export const kNewEmploymentFields = [
  { name: 'Last salary pay date', type: 'date', key: 'lastPayDate' },
  { name: 'Next salary pay date', type: 'date', key: 'nextPayDate' },
];

export const kEmploymentFields = [
  { name: 'Enter Net pay salary', type: 'number', key: 'netPaySalary' },
  { name: 'Last salary pay date', type: 'date', key: 'lastPayDate' },
  { name: 'Next salary pay date', type: 'date', key: 'nextPayDate' },
];

// fields for repeater and working in same company
export const kSameEmploymentFields = [
  { name: 'Enter Net pay salary', type: 'number', key: 'netPaySalary' },
  { name: 'Last salary pay date', type: 'date', key: 'lastPayDate' },
  { name: 'Next salary pay date', type: 'date', key: 'nextPayDate' },
];

export function ipCheckWeb(ip: string) {
  // Bypass localhost
  if (ip?.startsWith('192.168.')) ip = '110.227.250.199';
  return {
    title: 'Please wait',
    initialURL: HOST_URL + `${Latest_Version}/user/checkIp`,
    initialLoader: true,
    type: 'LOCATION_CHECK',
    jsTriggers: {
      [HOST_URL + `${Latest_Version}/user/checkIp`]: {
        onLoadStart: {
          triggers: [
            "console.log('LOCATION_CHECK')",
            "(function(open) { XMLHttpRequest.prototype.open = function(m, u, a, us, p) { this.addEventListener('readystatechange', function() { console.log(this.response); }, false); open.call(this, m, u, a, us, p); }; })(XMLHttpRequest.prototype.open)",
          ],
        },
        consoles: [
          {
            combinations: ['LOCATION_CHECK'],
            apiTriggers: [
              {
                url: nIpCheck + ip,
                method: 'GET',
                headers: {},
                callbackData: {
                  url: HOST_URL + 'admin/admin/ipCheckWeb',
                  method: 'POST',
                  body: { type: 'LOCATION_CHECK' },
                },
              },
            ],
          },
        ],
      },
    },
  };
}

export const kBlocEvents = {
  workMailDone: 'REAPPY_WORK_MAIL_DONE',
};

export const cronTime: any = [
  {
    name: [
      'daily Report To Management',
      'reset dashboard counts',
      ' recreate the esing user',
      'check waiver and redo',
    ],
    cron_name: '12AM',
    hours: 0,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '12AM',
  },
  {
    name: [
      'update due emi',
      'update last loan status',
      'update penalty amount to user',
      'reset Todays Cool Off',
    ],
    cron_name: '01AM',
    hours: 1,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '01AM',
  },
  {
    name: ['check app is install or not in phone with notitication'],
    cron_name: '02AM',
    hours: 2,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '02AM',
  },
  {
    name: [
      'create Demand Letter',
      'update match defaulter contact count',
      'update defaulter location count',
    ],
    cron_name: '06AM',
    hours: 6,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '06AM',
  },
  {
    name: [
      'auto assign defaulters',
      'check Legals Assigned To Collection',
      ' move To Case To BeFile',
    ],
    cron_name: '07AM',
    hours: 7,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '07AM',
  },
  {
    name: [
      'send over due mail to user',
      'WhatsApp alert for next day emi due user',
      'Send notification before loan decline after 7 day',
      'Refund Automation',
    ],
    cron_name: '08AM',
    hours: 8,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '08AM',
  },
  {
    name: ['send notification to not applied user'],
    cron_name: '08AM30MIN',
    hours: 8,
    min: 30,
    triggeredAPIs: nCronControllerAPI + '08AM30MIN',
  },
  {
    name: ['Send SMS and notification to inProgress user'],
    cron_name: '09AM',
    hours: 9,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '09AM',
  },
  {
    name: ['Upcoming And Due Emi Notify'],
    cron_name: '10AM',
    hours: 10,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '10AM',
  },
  {
    name: ['call all today emi due'],
    cron_name: '11AM',
    hours: 11,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '11AM',
  },
  {
    name: ['create Legal notice'],
    cron_name: '11AM55MIN',
    hours: 11,
    min: 55,
    triggeredAPIs: nCronControllerAPI + '11AM55MIN',
  },
  {
    name: ['Check remaining insurance'],
    cron_name: '05PM',
    hours: 17,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '05PM',
  },
  {
    name: [
      'please auto debit for after case',
      'please auto debit on salary date',
    ],
    cron_name: '08PM',
    hours: 20,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '08PM',
  },
  {
    name: ['please auto debit for emiDues'],
    cron_name: '10PM',
    hours: 22,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '10PM',
  },
  {
    name: ['loan decline after 7 days'],
    cron_name: '11PM',
    hours: 23,
    min: 0,
    triggeredAPIs: nCronControllerAPI + '11PM',
  },
  {
    name: ['Reset Recovery Rate'],
    cron_name: '11PM55MIN',
    hours: 23,
    min: 55,
    triggeredAPIs: nCronControllerAPI + '11PM55MIN',
  },
];

export const kKeyTypes = {
  DEVICE_ANDROID: '0',
  DEVICE_IOS: '1',
  SELF_EMPLOYED: 'self-employed',
};

const getTodayDate = () => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
};

export const kMockResponse = {
  isMock: true,
  testMode: true,
  controlData: { success: true },
  consumerCreditData: [
    {
      ids: [
        { index: 'I01', idType: '01', idNumber: 'CJTPP8875Q' },
        { index: 'I02', idType: '06', idNumber: '613414980206' },
      ],
      names: [
        {
          name: 'Malav Rajen Dalvadi',
          index: 'N01',
          gender: '2',
          birthDate: '25091997',
        },
      ],
      emails: [
        { index: 'C01', emailID: 'AP00829173@TECHMAHINDRA.COM' },
        { index: 'C02', emailID: 'PARMARAMULROY@GMAIL.COM' },
        { index: 'C03', emailID: 'AMULROY.AR@GMAIL.COM' },
      ],
      scores: [
        {
          score: '750',
          scoreDate: getTodayDate(),
          scoreName: 'CIBILTUSC3',
          reasonCodes: [
            { reasonCodeName: 'reasonCode1', reasonCodeValue: '39' },
            { reasonCodeName: 'reasonCode2', reasonCodeValue: '40' },
            { reasonCodeName: 'reasonCode3', reasonCodeValue: '38' },
          ],
          scoreCardName: '08',
          scoreCardVersion: '10',
        },
        {
          score: '750',
          scoreDate: getTodayDate(),
          scoreName: 'PLSCORE',
          reasonCodes: [
            { reasonCodeName: 'reasonCode1', reasonCodeValue: '19' },
            { reasonCodeName: 'reasonCode2', reasonCodeValue: '10' },
            { reasonCodeName: 'reasonCode3', reasonCodeValue: '08' },
            { reasonCodeName: 'reasonCode4', reasonCodeValue: '20' },
          ],
          scoreCardName: '02',
          scoreCardVersion: '10',
        },
      ],
      accounts: [
        {
          index: 'T001',
          cashLimit: 5000,
          dateOpened: '26092022',
          accountType: '10',
          creditLimit: 50000,
          dateReported: '12072023',
          lastDelayDays: 0,
          currentBalance: 1250,
          paymentEndDate: '01122022',
          paymentHistory: '000XXX000000000000000000',
          lastPaymentDate: '22062023',
          memberShortName: 'NOT DISCLOSED',
          highCreditAmount: 2147,
          paymentStartDate: '01072023',
          ownershipIndicator: 1,
        },
        {
          index: 'T002',
          emiAmount: 2592,
          dateClosed: '31052023',
          dateOpened: '06072019',
          accountType: '08',
          dateReported: '30062023',
          interestRate: 9.5,
          lastDelayDays: 0,
          paymentTenure: 60,
          collateralType: '00',
          currentBalance: 0,
          paymentEndDate: '01072020',
          paymentHistory:
            'STDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTDSTD',
          lastPaymentDate: '31052023',
          memberShortName: 'NOT DISCLOSED',
          highCreditAmount: 120000,
          paymentFrequency: '08',
          paymentStartDate: '01062023',
          ownershipIndicator: 1,
          actualPaymentAmount: 83877,
        },
      ],
      addresses: [
        {
          index: 'A01',
          line1: 'TECH MAHINDRA LIMITED SUR 4 4  2ND FLOOR',
          line2: 'RAMDAS RD 142 PARK WEST APARTMENTS NEA',
          line3: 'R CHANCHALBA  BHARTIHOUSE',
          pinCode: '380054',
          stateCode: '24',
          dateReported: '12122022',
          addressCategory: '03',
        },
        {
          index: 'A02',
          line1: '229 KHRISTI NIVAS KHRISTI NIVAS  KHEDA',
          pinCode: '388245',
          stateCode: '24',
          dateReported: '05062021',
          addressCategory: '02',
        },
        {
          index: 'A03',
          line1: 'B 6 94 POLICE LINE',
          line2: 'GAMDI',
          pinCode: '388001',
          stateCode: '24',
          dateReported: '31072019',
          residenceCode: '01',
          addressCategory: '01',
        },
        {
          index: 'A04',
          line1: 'KHEDA',
          pinCode: '388245',
          stateCode: '24',
          dateReported: '22042019',
          addressCategory: '04',
        },
      ],
      enquiries: [
        {
          index: 'I001',
          enquiryDate: '25092022',
          enquiryAmount: 100000,
          enquiryPurpose: '10',
          memberShortName: 'NOT DISCLOSED',
        },
        {
          index: 'I002',
          enquiryDate: '10082022',
          enquiryAmount: 100,
          enquiryPurpose: '10',
          memberShortName: 'NOT DISCLOSED',
        },
        {
          index: 'I003',
          enquiryDate: '04062022',
          enquiryAmount: 100,
          enquiryPurpose: '10',
          memberShortName: 'NOT DISCLOSED',
        },
        {
          index: 'I004',
          enquiryDate: '13112021',
          enquiryAmount: 100000,
          enquiryPurpose: '10',
          memberShortName: 'NOT DISCLOSED',
        },
        {
          index: 'I005',
          enquiryDate: '05062021',
          enquiryAmount: 100000,
          enquiryPurpose: '10',
          memberShortName: 'NOT DISCLOSED',
        },
      ],
      employment: [
        {
          index: 'E01',
          accountType: '08',
          dateReported: '30062023',
          occupationCode: '04',
        },
      ],
      telephones: [
        { index: 'T01', telephoneType: '03', telephoneNumber: '9157897003' },
        { index: 'T02', telephoneType: '01', telephoneNumber: '9157897003' },
      ],
      tuefHeader: {
        version: '12',
        headerType: 'TUEF',
        memberRefNo: 'MR229009',
        dateProcessed: '05092023',
        timeProcessed: '185921',
        subjectReturnCode: 1,
        enquiryMemberUserId: 'NB79949988_CIRC2CNPE',
        enquiryControlNumber: '006397440518',
      },
    },
  ],
  consumerSummaryData: {
    accountSummary: {
      totalAccounts: 2,
      currentBalance: 1250,
      overdueBalance: 0,
      overdueAccounts: 0,
      highCreditAmount: 122147,
      oldestDateOpened: '06072019',
      recentDateOpened: '26092022',
      zeroBalanceAccounts: 1,
    },
    inquirySummary: {
      totalInquiry: 15,
      inquiryPast30Days: 2,
      recentInquiryDate: '25092022',
      inquiryPast12Months: 1,
      inquiryPast24Months: 3,
    },
  },
  internal_name_check: true,
};

export const kUniversalIFSC = {
  HDFC: 'HDFC0000313',
  IDFC: 'IDFB0021001',
  INDUSIND: 'INDB0000473',
  RBL: 'RATN0000192',
  AXIS: 'UTIB0002193',
  YES: 'YESB0000597',
  KOTAK: 'KKBK0004606',
  FEDERAL: 'FDRL0001302',
  KARNATAKA: 'KARB0000695',
  SBI: 'SBIN0000001',
};

export const kMockIpResponse = {
  ip: '171.50.244.113',
  success: true,
  type: 'IPv4',
  continent: 'Asia',
  continent_code: 'AS',
  country: 'India',
  country_code: 'IN',
  region: 'Gujarat',
  region_code: 'GJ',
  city: 'Ahmedabad',
  latitude: 23.022505,
  longitude: 72.5713621,
  is_eu: false,
  postal: '380001',
  calling_code: '91',
  capital: 'New Delhi',
  borders: 'BD,BT,CN,MM,NP,PK',
  flag: {
    img: 'https://cdn.ipwhois.io/flags/in.svg',
    emoji: '🇮🇳',
    emoji_unicode: 'U+1F1EE U+1F1F3',
  },
  connection: {
    asn: 24560,
    org: 'BHARTI-TELENET-LTD-MUMBAI',
    isp: 'Bharti Airtel Ltd., Telemedia Services',
    domain: 'airtel.com',
  },
  timezone: {
    id: 'Asia/Calcutta',
    abbr: 'IST',
    is_dst: false,
    offset: 19800,
    utc: '+05:30',
    current_time: '2023-12-20T12:38:58+05:30',
  },
  currency: {
    name: 'Indian Rupee',
    code: 'INR',
    symbol: '₹',
    plural: 'Indian rupees',
    exchange_rate: 83.088,
  },
  security: {
    anonymous: false,
    proxy: false,
    vpn: false,
    tor: false,
    hosting: false,
  },
};
export const kEligibilityFields = [
  {
    value: BASE_AMOUNT,
    isSuccess: false,
    notEligibleText: kNotEligiblityText,
  },
  {
    value: MIN_SALARY,
    isSuccess: true,
    congratsText: kCongratsText,
    loanEligibleText: kLoanEligibleText,
    loanAmount: kEligibleLoanAmount,
  },
  {
    value: MAX_SALARY,
    isSuccess: true,
    congratsText: kCongratsText,
    loanEligibleText: kLoanEligibleText,
    loanAmount: kNewEligibleLoanAmount,
  },
  {
    value: 100000,
    isSuccess: true,
    congratsText: kCongratsText,
    loanEligibleText: kLoanEligibleText,
    loanAmount: kNewEligibleLoanAmountUpto2Lac,
  },
];

export const kSignupFields = [
  {
    title: 'Are you salaried?',
    sub_title: 'Are you salaried?',
    placeholder: '',
    key: 'isSalaried',
    type: 3,
    label: 'Are you salaried?',
    index: 1,
    options: [
      {
        id: 0,
        value: 'No',
        error: kNotSalaried,
      },
      {
        id: 1,
        value: 'Yes',
        error: false,
        infoMessage: GLOBAL_FLOW.WORK_MAIL_SALARYSLIP_SKIP
          ? ''
          : kEmailOrSalaryOption,
      },
    ],
  },
  {
    title: 'Select your salary mode',
    sub_title: 'Select your salary mode',
    placeholder: '',
    key: 'salaryMode',
    type: 3,
    label: 'Select your salary mode',
    index: 2,
    options: [
      {
        id: 1,
        value: 'NEFT',
        error: false,
        infoMessage: kComplyMessage,
      },
      {
        id: 2,
        value: 'IMPS',
        error: false,
        infoMessage: kComplyMessage,
      },
      {
        id: 3,
        value: 'CASH',
        error: kNotSalaried,
      },
    ],
  },
  {
    title: 'Enter monthly in-hand salary',
    sub_title: 'Enter monthly in-hand salary',
    placeholder: '0.00',
    key: 'salary',
    type: 1,
    label: 'Enter monthly in-hand salary',
    index: 3,
    // api: 'v3/user/checkSalaryEligibility',
  },
];

export const kLspSignupFields = [
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/login-signup/employment_status.svg',
    title: 'Are you salaried?',
    sub_title: 'Are you salaried?',
    placeholder: 'Select the appropriate option',
    key: 'isSalaried',
    type: 3,
    label: 'Are you Salaried?',
    index: 1,
    options: [
      {
        id: 1,
        value: 'Yes',
        error: false,
        infoMessage: kEmailOrSalaryOption,
      },
      {
        id: 0,
        value: 'No',
        error: kLspNotSalaried,
      },
    ],
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/login-signup/salary_mode.svg',
    title: 'Your Salary Mode',
    sub_title: 'Select your salary mode',
    placeholder: 'How you receive your earnings?',
    key: 'salaryMode',
    type: 3,
    label: 'Salary Mode',
    index: 2,
    options: [
      {
        id: 1,
        value: 'NEFT',
        error: false,
        infoMessage: KLspComplyMessage,
      },
      {
        id: 2,
        value: 'IMPS',
        error: false,
        infoMessage: KLspComplyMessage,
      },
      {
        id: 3,
        value: 'CASH',
        error: kLspSalaryModeError,
      },
    ],
  },
  {
    title: 'Enter monthly in-hand salary',
    sub_title: 'Enter monthly in-hand salary',
    placeholder: 'Enter your monthly in-hand salary',
    key: 'salary',
    type: 1,
    label: 'Salary Amount',
    index: 3,
    // api: 'v3/user/checkSalaryEligibility',
  },
];
export const kRegistrationFields = [
  {
    title: 'Enter Email ID',
    sub_title:
      'To confirm your email address, we will send a verification link to this email',
    placeholder: 'Enter your valid Email Address',
    key: 'email',
    type: 1,
    label: 'Email ID',
    formatters: [5],
    validations: {
      regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`,
      error: 'Please enter a valid email ID',
    },
  },
  {
    title: 'Enter PAN number',
    placeholder: 'Enter your PAN Number',
    key: 'pan',
    type: 1,
    label: 'PAN Number',
    formatters: [6],
    validations: {
      regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}`,
      error: 'Please enter a valid PAN number',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/loan_purpose.svg',
    title: 'Loan Purpose',
    placeholder: 'Select your loan purpose',
    key: 'purposeId',
    type: 4,
    label: 'Loan Purpose',
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select a loan purpose',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/mode_of_communication%20(1).svg',
    title: 'Mode of Communication',
    placeholder: 'Language comfortable for you',
    key: 'communicationLanguage',
    type: 4,
    label: 'Mode of Communication',
    options: [
      { id: 1, value: 'English' },
      { id: 2, value: 'Hindi' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please Select Your Communication Language',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/politically_exposed.svg',
    title: 'Politically exposed?',
    placeholder: 'Are you a Politically Exposed Person?',
    key: 'politicallyExposed',
    type: 4,
    label: 'Politically Exposed',
    options: [
      { id: 1, value: 'Yes' },
      { id: 0, value: 'No' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please Select Your Political Exposition Status',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/login-signup/employment_status.svg',
    title: 'Your Employment Status',
    placeholder: 'Little info about your work!',
    key: 'empInfo',
    type: 4,
    label: 'Employment Status',
    options: [
      { id: 'Salaried', value: 'Salaried' },
      { id: 'Salaried professional', value: 'Salaried professional' },
      { id: 'Consultant', value: 'Consultant' },
      { id: 'Self-Employed', value: 'Self-Employed' },
      { id: 'Retired', value: 'Retired' },
      { id: 'Student', value: 'Student' },
      { id: 'Homemaker', value: 'Homemaker' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select an employment status',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/marital_status.svg',
    title: 'Your Marital Status',
    placeholder: 'Select your current relationship status',
    key: 'maritalInfo',
    type: 4,
    label: 'Marital Status',
    options: [
      {
        id: 'Single',
        value: 'Single',
        subQuestion: {
          title: 'Enter mother name',
          placeholder: 'Enter your mother name',
          key: 'motherName',
          type: 1,
          label: 'Mother Name',
          formatters: [4],
          validations: {
            error: 'Please enter mother name',
          },
        },
      },
      {
        id: 'Married',
        value: 'Married',
        subQuestion: {
          title: 'Enter spouse name',
          placeholder: 'Enter your spouse name',
          key: 'spouseName',
          type: 1,
          label: 'Spouse Name',
          formatters: [4],
          validations: {
            error: 'Please enter spouse name',
          },
        },
      },
    ],
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/vehical_ownership.svg',
    title: 'Vehicle Ownership',
    placeholder: 'Please Select your vehicle type',
    key: 'vehicleInfo',
    type: 4,
    label: 'Vehicle',
    options: [
      { id: 'Two wheeler', value: 'Two wheeler' },
      { id: 'Four wheeler', value: 'Four wheeler' },
      {
        id: 'Two wheeler, Four wheeler',
        value: 'I own both a 2-wheeler and a 4-wheeler',
      },
      { id: 'None', value: 'None' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select a vehicle',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/education_deatils.svg',
    title: 'Educational Background',
    placeholder: 'What is your highest level of education?',
    key: 'educationInfo',
    type: 4,
    label: 'Education',
    options: [
      { id: 'Less than High School', value: 'Less than High School' },
      { id: 'Completed High School', value: 'Completed High School' },
      { id: 'Diploma', value: 'Diploma' },
      { id: 'Graduate Degree', value: 'Graduate Degree' },
      { id: 'Postgraduate Degree', value: 'Postgraduate Degree' },
      { id: 'Masters Degree', value: 'Masters Degree' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select your education',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/residential_status.svg',
    title: 'Your residential status',
    placeholder: 'Your primary housing arrangement',
    key: 'residentialInfo',
    type: 4,
    label: 'Residential Status',
    options: [
      { id: 'Owned', value: 'Owned' },
      { id: 'Parental', value: 'Parental' },
      { id: 'Company provided', value: 'Company provided' },
      { id: 'Rented', value: 'Rented' },
    ],
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select your education',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/salary_bank%20(2).svg',
    title: 'Salary bank account',
    sub_title: 'We only support the banks listed here',
    placeholder: 'Select bank where your salary is being deposited',
    key: 'bankId',
    type: 4,
    label: 'Salary Bank',
    validations: {
      regex: `^(?!\s*$).+`,
      error: 'Please select a bank',
    },
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/basic-details/referral_code.svg',
    title: 'Enter your Referral Code!',
    sub_title: 'Enter referral code',
    placeholder:
      "Enjoy full access of our services even if you don't have a code!",
    key: 'code',
    type: 5,
    label: 'Referral Code',
    api: `${Latest_Version}/referral/checkReferralCode`,
    extra: {
      title: 'I have a referral code',
      sub_title: 'optional',
      label: 'I have a referral code',
    },
  },
];

export const kConfigSteps = [
  {
    title: 'LOAN ELIGIBILITY',
    index: 1,
    subFields: [
      {
        title: 'Salary slip',
        index: 1,
        tag: 'Latest month',
      },
      {
        title: 'Bank-statement',
        index: 2,
        tag: 'Last 4 months',
      },
    ],
  },
  {
    title: 'KYC VERIFICATION',
    index: 2,
    subFields: [
      {
        title: 'Aadhaar card',
        index: 1,
      },
      {
        title: 'PAN card',
        index: 2,
      },
    ],
  },
];

export const CALL_STATUS = {
  INPROGRESS: 'in-progress',
  INITIALIZED: 'INITIALIZED',
  COMPLETED: 'COMPLETED',
  NOT_ANSWERED: 'NOT_ANSWERED',
  FAILED: 'failed',
};

export function getStatus(subStatus?: string) {
  if ('in-progress' == subStatus) return CALL_STATUS.INITIALIZED;
  else if (['completed', 'answered'].includes(subStatus))
    return CALL_STATUS.COMPLETED;
  if (['busy', 'missed', 'no-answer', 'failed'].includes(subStatus))
    return CALL_STATUS.NOT_ANSWERED;
  else return CALL_STATUS.INITIALIZED;
}

// LCR Report Fields
export const lcrFields = [
  'Date',
  'Bank Balance',
  'Marketable Securities',
  'Total HQLA',
  'Expected Cash Inflow',
  'Stressed Cash Inflow',
  'Expected Cash Outflow',
  'Stressed Cash Outflow',
  'Total Net Cash Outflows',
  'LCR Percentage',
  'Updated By',
];

export const kLspEmploymentFields = [
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/company_name.svg',
    label: "Company's Name",
    title: "Your Company's Name",
    sub_title: 'Where are you currently working?',
    key: 'companyId',
    type: 4,
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/company_name.svg',
    label: 'Employment Sector',
    title: 'Employment sector',
    sub_title: 'Sector that best describes your work',
    key: 'sectorId',
    type: 4,
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/job_type.svg',
    label: 'Designation',
    title: 'Your Designation',
    sub_title: "What's your Job Role?",
    key: 'positionId',
    type: 4,
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/calendar.svg',
    title: 'Employment Start Date',
    sub_title: 'When did you join the current company?',
    key: 'startDateId',
    type: 7,
    label: 'Employment Start Date',
    validation: '',
  },
  {
    title: 'Salary Amount',
    sub_title: 'Enter your monthly in-hand salary',
    key: 'netPaySalary',
    label: 'Salary Amount',
    type: 1,
    validation: '',
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/calendar.svg',
    title: 'Most recent Salary Date',
    sub_title: 'When did you get your last Salary?',
    key: 'lastPayDate',
    type: 7,
    label: 'Last Salary Date',
  },
  {
    svg_icon:
      'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/employmentDetails/calendar.svg',
    title: 'Next Salary Date',
    sub_title: 'What is your next Salary Date?',
    key: 'nextPayDate',
    type: 7,
    label: 'Next Salary Date',
    validation: '',
  },
];

export const appStepeerImage = {
  disbursementImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/disbursement.svg',
  eMandateImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/emandate.svg',
  empImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/employment.svg',
  esignImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/esign.svg',
  loanOfferImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/loan%20offer.svg',
  salaryImg:
    'https://storage.googleapis.com/lenditt_user_images/lsp-new-flow/steeper/salary.svg',
};

export const ratingAndReview = [
  {
    profile:
      'https://storage.googleapis.com/backend_static_stuff/profile_1.svg',
    name: 'Tarun Narayanam',
    ratingValue: 5,
    ratingText:
      '"It was a great loan app for emergency and process was very fast and funds are disbursed within 20 minutes. Good experience."',
  },
  {
    profile:
      'https://storage.googleapis.com/backend_static_stuff/profile_2.svg',
    name: 'Manoj Tara',
    ratingValue: 5,
    ratingText:
      '"Awesome app, very easy process and quick to get the amount in the account. Customer service is very easy to access."',
  },
  {
    profile:
      'https://storage.googleapis.com/backend_static_stuff/profile_3.svg',
    name: 'Vikram Raju',
    ratingValue: 5,
    ratingText:
      '"Best app for loan. You are fabulous anyways in approving fast and disbursal is also very fast. Thank you so much Lenditt team."',
  },
];

export const REASON_ID = {
  LOAN_ALREADY_ACCEPTED: 65,
  USER_NOT_ELIGIBLE: 59,
};

export const REASON_REMARK = {
  LOAN_ALREADY_ACCEPTED: 'Already Loan is accepted with Different NBFC',
  USER_NOT_ELIGIBLE:
    "User not eligible as per our NBFC partner's credit policy",
};

export const kPaymentMode = {
  1: 'RAZORPAY',
  2: 'ICICI_UPI',
  3: 'CASHFREE',
};

export const TLWiseList: any = [
  {
    name: 'Harshil Patel',
    members: [
      {
        name: 'Nensi Jogani',
        slackuid: 'U05F64KJPE1',
      },
      {
        name: 'Meet Shah',
        slackuid: 'U05TV8XK65T',
      },
      {
        name: 'Hinal Thakrar',
        slackuid: 'U06ABUQ8747',
      },
      {
        name: 'Utkarsh Tiwari',
        slackuid: 'U06BHJKKEKF',
      },
    ],
  },
  {
    name: 'Satish Jogani',
    members: [
      {
        name: 'Ravi Sahu',
        slackuid: 'U05FMR9BRLH',
      },
      {
        name: 'Saurabh Pawar',
        slackuid: 'U06HJCLGHCZ',
      },
      {
        name: 'Koshal',
        slackuid: 'U06G2JE4D1U',
      },
      {
        name: 'Jeet Chadsaniya',
        slackuid: 'U07FF35L6KT',
      },
    ],
  },
  {
    name: 'Bhavesh Panchal',
    members: [
      {
        name: 'Bhavesh Panchal',
        slackuid: 'U06U129EBQB',
      },
      {
        name: 'Naren Singh',
        slackuid: 'U077EKE5WBE',
      },
      {
        name: 'Parth Ramchandani',
        slackuid: 'U07FGHF3YKU',
      },
    ],
  },
  {
    name: 'Hardik Patel',
    members: [
      {
        name: 'Kunj Rao',
        slackuid: 'U077H5VT57D',
      },
      {
        name: 'Dhruvkumar Nagar',
        slackuid: 'U05RJFZJZK2',
      },
      {
        name: 'Ashish Rayalwar',
        slackuid: 'U079816LX2Q',
      },
    ],
  },
  {
    name: 'Rahil Patel',
    members: [
      {
        name: 'Rutul Patel',
        slackuid: 'U06SNJY84UU',
      },
      {
        name: 'Priyanshu Bateriwala',
        slackuid: 'U07DKBZAGNB',
      },
      {
        name: 'Avni Pancholi',
        slackuid: 'U077QR653TK',
      },
      {
        name: 'Preetibardhan Rout',
        slackuid: 'U0780VBDQKA',
      },
      {
        name: 'Aniket Lagad',
        slackuid: 'U072TG9C4PP',
      },
    ],
  },
  {
    name: 'Mukund Patel',
    members: [
      {
        name: 'Jaydeepsinh Rathod',
        slackuid: 'U03M0CRF7K2',
      },
      {
        name: 'Deepak Katiyare',
        slackuid: 'U05AJSJ5REY',
      },
      {
        name: 'Krupali Lunagariya',
        slackuid: 'U06GCFGJA05',
      },
    ],
  },
  {
    name: 'Bhavesh Gohil',
    members: [
      {
        name: 'Bhavesh Gohil',
        slackuid: 'U04HNU0RZ60',
      },
      {
        name: 'Darshit Goyani',
        slackuid: 'U06G6DX4G2Z',
      },
      {
        name: 'Divyanshu Ranparia',
        slackuid: 'U069LTNCZL4',
      },
      {
        name: 'Shweta Bheda',
        slackuid: 'U06AHNJAUM7',
      },
      {
        name: 'Harsh Patel',
        slackuid: 'U05ML1R3XM5',
      },
    ],
  },
  {
    name: 'Tanish',
    members: [
      {
        name: 'Tanish',
        slackuid: 'U069HL81U4W',
      },
      {
        name: 'Rutvi Rathod',
        slackuid: 'U05DR8CLDJT',
      },
      {
        name: 'Anurag Dogne',
        slackuid: 'U06EAHWFZUL',
      },
      {
        name: 'Divya Sharma',
        slackuid: 'U07A3Q2BKT7',
      },
      {
        name: 'Nitiksha Prajapati',
        slackuid: 'U07AGP56DV0',
      },
      {
        name: 'Mansi Gandhi',
        slackuid: 'U072A93NDV4',
      },
    ],
  },
];

export const KInsurancePolicy = [
  {
    icon: 'https://storage.googleapis.com/backend_static_stuff/insurance_benefits_1.svg',
    title: 'Personal Accident Cover Amount',
    desc: 'Opting for Personal Accident Cover allows you to focus more on recovery without the stress of loan repayment.',
  },
  {
    icon: 'https://storage.googleapis.com/backend_static_stuff/insurance_benefits_1.svg',
    title: 'Critical Illness Cover Amount',
    desc: 'This insurance provides a safety net, covering your EMIs when medical expenses deplete your savings.',
  },
  {
    icon: 'https://storage.googleapis.com/backend_static_stuff/insurance_benefits_3.svg',
    title: 'Loss of Job',
    desc: 'With our Loss of Job cover, we cover up your loan, giving you the breathing room to focus on your next career move.',
  },
  {
    icon: 'https://storage.googleapis.com/backend_static_stuff/insurance_benefits_4.svg',
    title: 'EMI Protector - Hospitalization',
    desc: 'Your financial duties are paused with our EMI Protector for Hospitalization when your health takes priority. We cover up your loan, allowing you to heal without worrying.',
  },
];
export const MICRO_ALERT_TOPIC = {
  REPLY_TOPIC: 'reply-topic',
  SEND_SLACK_MSG: 'send.slack.message',
  SEND_API_ERROR_MESSAGE: 'send.apiError.message',
  SEND_WHATSAPP_MESSAGE: 'send.whatsapp.message',
  STORE_WHATSAPP_WEBHOOK: 'store.whatsapp.webhook',
  SEND_WHATSAPP_CAMPAIGN: 'send.whatsapp.campaign',
};
