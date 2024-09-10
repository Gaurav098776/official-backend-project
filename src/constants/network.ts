// Imports
import * as env from 'dotenv';
import {
  AUTOMATION_URL,
  CAMS_BASE_URL,
  FINVU_BASE_URL,
  HOST_URL,
  Latest_Version,
  THIRD_PARTY,
  gIsPROD,
} from './globals';
import { kGmailSecrets } from './objects';
import { EnvConfig } from 'src/configs/env.config';
env.config();

// Payment
export const CHECK_CALLBACK_V2_URL =
  HOST_URL + `${Latest_Version}/transaction/checkCallBack`;
// ##### Cashfree
//const CASHFREE_TEST_URL = 'https://test.cashfree.com/api/v2/';
const CASHFREE_PROD_URL = 'https://api.cashfree.com/api/v2/';
export const CASHFREE_BASE_URL =
  process.env.MODE == 'PROD' ? CASHFREE_PROD_URL : CASHFREE_PROD_URL;

export const CASHFREE_CREATE_PLAN = CASHFREE_BASE_URL + 'subscription-plans';
export const CF_SUBSCRIPTION = CASHFREE_BASE_URL + 'subscriptions';
export const CF_CHARGE = '/charge';
export const CF_ORDER = 'https://api.cashfree.com/pg/orders';
export const CF_ORDER_CHECK = CASHFREE_BASE_URL + 'orders/';
export const kGetCashfreePayment =
  'https://merchant.cashfree.com/merchants/pg/transactions/payments/view';
export const CF_SETTLEMENT = 'https://api.cashfree.com/pg/settlements';

export const CASHFREE_RETURN_URL =
  process.env.MODE == 'PROD'
    ? process.env.CASHFREE_RETURN_URL_PROD
    : process.env.CASHFREE_RETURN_URL_DEV;

const faceXURL = 'https://www.facexapi.com/';
const getFaceData = 'get_image_attr';
export const extractFaceData = faceXURL + getFaceData;

// ##### Google
const kGoogleAPIs = 'https://www.googleapis.com/';
const kGmailBaseURL = 'https://gmail.googleapis.com/gmail/v1/users/me/';
export const GMAIL_SEND_MAIL = kGmailBaseURL + 'messages/send';
export const GMAIL_GET_MAILS = kGmailBaseURL + 'messages/';
export const GMAIL_STATUS = kGmailBaseURL;
export const GMAIL_SEND_ATTACHMENT = GMAIL_SEND_MAIL + '?uploadType=multipart';
export const GET_OAUTH_INFO = `${kGoogleAPIs}oauth2/v1/tokeninfo?access_token=`;
export const nFirebaseNotification = 'https://fcm.googleapis.com/fcm/send';
export const nFirebaseHeaders = {
  Authorization: 'key=' + EnvConfig.network.nFirebaseMsgKey,
};

export function funGenerateOAuthToken(email) {
  const secrets = kGmailSecrets.find((el) => el.email == email);
  const clientId = secrets.clientId;
  const refreshToken = secrets.refreshToken;
  const secretId = secrets.clientSecret;
  return `${kGoogleAPIs}oauth2/v4/token?grant_type=refresh_token&client_id=${clientId}&client_secret=${secretId}&refresh_token=${refreshToken}`;
}

// Signdesk
export const DOC_UPLOAD_URL =
  'https://kyc.signdesk.in/api/live/documentVerification';
export const PAN_UPLOAD_URL_UAT =
  'https://kyc-uat.signdesk.co/api/sandbox/panVerification';
export const ADHAR_UPLOAD_URL_UAT =
  'https://kyc-uat.signdesk.co/api/sandbox/aadhaarXMLVerification';
export const SD_UAT_AADHAAR_OTP_V2 =
  'https://kyc-uat.signdesk.co/api/sandbox/aadhaarXMLSubmitOTP';
export const SD_LIVE_AADHAAR_OTP_V1 =
  'https://kyc.signdesk.in/api/live/submitOtp';
export const SD_AADHAAR_OTP =
  process.env.mode == 'PROD' ? SD_LIVE_AADHAAR_OTP_V1 : SD_UAT_AADHAAR_OTP_V2;
export const signdesk_mandate_req =
  'https://api.signdesk.in/api/live/emandateRequest';
export const signdesk_mandate_check =
  'https://api.signdesk.in/api/emandate/getEmandateStatus';
export const kGetSigndeskPayment =
  'https://signdesk.in/emandate/#/emandate/debitsheetreport/';
export const nSigndeskWebhook =
  HOST_URL + `${Latest_Version}/transaction/checkSDAutoDebits`;

// MSG91
export const MSG91_URL = `https://api.msg91.com/api/v5/flow/`;
export const MSG_DLV_URL = `https://api.msg91.com/dlr/pushUrl.php`;

//nimbus SMS
export const NIMBUS_URL = 'http://nimbusit.co.in/api/';
export const NIMBUS_SEND_URL = NIMBUS_URL + 'swsend.asp?';
export const NIMBUS_USERNAME = 't1lenditt';
export const NIMBUS_PASSWORD = process.env.NIMBUS_PASSWORD;
export const DLT_REG_ID = '1301161821253584240';
// export const DLT_REG_ID = '1201159409941345107'; // test dlt

// Kylas CRM
export const KYLAS_URL = 'https://api.kylas.io/v1/leads/';

//Automation
const kAutomationURL = process.env.AUTOMATION_URL;
export const WHATSAPP_URL = kAutomationURL + 'whatsApp/';
export const SEND_WHATSAPP_MESSAGE = WHATSAPP_URL + 'sendMessage';
export const SEND_TELEGRAM_MESSAGE = kAutomationURL + 'sendTelegramMessage';

// LSP -> In House payments and other
// 4500
export const kFrontendBaseURL = process.env.FRONTEND_BASE_URL;
export const nPaymentCheckoutURL = kFrontendBaseURL + 'cashfree-v3/?sessionId=';
export const nPaymentRedirect = kFrontendBaseURL + 'payments?key=';
export const nPaymentRedirectNbfc1 =
  kFrontendBaseURL + 'repayment-reminder?key=';
export const CF_RETURN_URL = kFrontendBaseURL + 'cashfree-payment/order/';
export const aaURL = kFrontendBaseURL + 'pages/' + 'aa';

//Razorpay
const RAZORPAY_URL = 'https://api.razorpay.com/v1/';
export const RAZORPAY_CREATE_CUSTOMER = RAZORPAY_URL + 'customers';
export const RAZORPAY_CREATE_ORDER = RAZORPAY_URL + 'orders';

//Razorpay
export const RAZORPAY_API_URL = 'https://api.razorpay.com/v1/';
export const RAZORPAY_CALLBACK_URL = kFrontendBaseURL + 'payment/';

// Admin

export const UpdateBankStatementDetails =
  process.env.NET_BANKING_URL + 'users/updateBankStatementDetails';
export const AddAdditionalAccount =
  process.env.NET_BANKING_URL + 'users/addAdditionalAccount';

// Legal Notice API
export const legalNoticeAPI =
  process.env.LEGAL_NOTICE + 'legalNotice/createLegalNotice';

// ReInitiate Disbursement
export const reInitiateDisbursement =
  process.env.MASTER_SCHEDULER + 'admin/disbursement/reInitiateDisbursement';

// ##### Razorpay
const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1/';
export const kRazorOrders = RAZORPAY_BASE_URL + 'orders/';
export const kRazorPayments = RAZORPAY_BASE_URL + 'payments/';
export const kRazorPaymentsLink = RAZORPAY_BASE_URL + 'payment_links/';
export const kRazorInvoices = RAZORPAY_BASE_URL + 'invoices/';
export const kRazorPayouts = RAZORPAY_BASE_URL + 'payouts';
export const nRazorSettlements = RAZORPAY_BASE_URL + 'settlements';
export const nRazorTransactions = RAZORPAY_BASE_URL + 'transactions';
export const nFetchPayoutDetails =
  EnvConfig.network.nMasterSchedularUrl +
  '/thirdParty/razorpay/checkPayoutStatus';
export const nRazorSettlementsRecon =
  RAZORPAY_BASE_URL + 'settlements/recon/combined';
export const nRazorpayMandateAppCallback =
  HOST_URL + 'razorpay/razorpayMandateCallback';
export const nRazorpayMandateWebCallbackLenditt =
  HOST_URL + `${Latest_Version}/mandate/redirectLenditt`;
export const nRazorpayMandateWebCallbackNbfc1 =
  HOST_URL + `${Latest_Version}/mandate/redirectNbfc1`;

// kPostoffice
export const kPostoffice = 'https://api.postalpincode.in/postoffice/';
//  AUTO ddebit URL
export const AUTODEBIT_URI =
  'https://api.signdesk.in/api/emandate/submitAdhocDebitSheet';

// BANKING PRO URL
export const PRIMARY_BANKINGPRO_URL = process.env.PRIMARY_BANKING_PRO_URL;
export const SECONDARY_BANKINGPRO_URL = process.env.SECONDARY_BANKING_PRO_URL;
export const UPDATE_ACCOUNT_NUMBER =
  PRIMARY_BANKINGPRO_URL + 'transaction/updateAccountNumber';
export const UPLOAD_BANK_PDF =
  PRIMARY_BANKINGPRO_URL + 'statement/uploadPDFData';
export const nGetPdfUrl = 'statement/uploadPDFData';
export const GET_COMPARE_ACCOUNT =
  PRIMARY_BANKINGPRO_URL + 'transaction/getCompareAccounts';
export const GET_BANKING_SUMMARY =
  PRIMARY_BANKINGPRO_URL + 'statement/getBankingSummary';
export const REMOVE_PDF_PASSWORD =
  PRIMARY_BANKINGPRO_URL + 'statement/removePassword';
export const nSyncAuthAiTransactions =
  PRIMARY_BANKINGPRO_URL + 'statement/syncAAData';
export const nExtractData = PRIMARY_BANKINGPRO_URL + 'statement/extractData';

export const FIND_LAT_LOG_API = AUTOMATION_URL + 'getLatLongFromaddress';

// file Upload URL
export const UploadPDFFile =
  SECONDARY_BANKINGPRO_URL + 'statement/uploadPDFData';

// FINBIT
export const FIN_ACCESS_TOKEN = '?access_token=' + process.env.FIN_ACCESS_TOKEN;
export const UPLOAD_FIN360 =
  'https://www.fin360.in/bank-connect/api/v1/uploadStatement' +
  FIN_ACCESS_TOKEN;

export const GET_TRANSACTION_FIN =
  'https://www.fin360.in/bank-account/api/v1/transactions/';

// AuthAi urls
export const kRemovePassword = 'statement/removepassword';
export const kGetPdfURL = 'statement/uploadPDFData';
export const kSyncTrans = 'statement/syncAAData';
export const kGetFraudUsers = 'transaction/getFraudUsers';

// Automation urls
export const kcheckPaytmTrans = 'v1/upi/checkPaytmTransaction';

// 3rd Party -> CAMS
export const kCAMSGetAuthToken = CAMS_BASE_URL + 'FIU/Authentication';
export const kCAMSInvitation = CAMS_BASE_URL + 'FIU/RedirectAA';
export const kCAMSGetConsentDetails =
  CAMS_BASE_URL + 'Consent/GetDashboardData';
export const kCamsDownloadData = CAMS_BASE_URL + 'FIData/DownloadData';
export const kManualFetch = CAMS_BASE_URL + 'FIData/FetchPeriodicData';

//3rd Party -> FINVU
// 3rd Party -> GOOGLE
const kGoogleMapsBaseURL = 'https://maps.googleapis.com/maps/api/place/';
export const nSearchPlaces = kGoogleMapsBaseURL + 'autocomplete/json';
export const nGetPlaceData = kGoogleMapsBaseURL + 'details/json';

// Razorpay -> 3rd Party
export const kGetPayouts =
  'https://dashboard.razorpay.com/merchant/api/live/payouts?count=1&product=banking&skip=';
export const kGetPayoutData =
  'https://dashboard.razorpay.com/merchant/api/live/payouts/';
export const kGetRazorpayPayment = 'https://dashboard.razorpay.com/app/';
export const nGetIFSC = 'https://ifsc.razorpay.com/';
export const nMandateInvitation =
  RAZORPAY_URL + 'subscription_registration/auth_links';
export const nGetInvoiceData = RAZORPAY_API_URL + 'invoices/';
export const nGetPaymentData = RAZORPAY_API_URL + 'payments/';
export const nCreateRazorpayCustomer = RAZORPAY_API_URL + 'customers';
export const nCreateRazorpayOrder = RAZORPAY_API_URL + 'orders';
export function nGetPaymentsByOrderId(orderId) {
  return RAZORPAY_API_URL + 'orders/' + orderId + '/payments';
}
export function nGetTokenById(customerId, tokenId) {
  return RAZORPAY_API_URL + 'customers/' + customerId + '/tokens/' + tokenId;
}
export const nPlaceRazorpayAutoDebit =
  RAZORPAY_API_URL + 'payments/create/recurring/';
export const nRazorpayCheckout =
  'https://api.razorpay.com/v1/standard_checkout/checkout';
//  sense data base url
export const SENSEDATA_BASE_URL = 'https://10sensedataapi.com/prod/';
export const SENSEDATA_GET_ADDRESS_URL = SENSEDATA_BASE_URL + 'api/address/';

export const IFSC_VALIDATE_URL = 'https://ifsc.razorpay.com/';

//zomato, swiggy, flipkart
export const ZOMATO_ORDER_DATA_URL =
  'https://www.zomato.com/webroutes/user/orders';
export const SWIGGY_ORDER_DATA_URL = 'https://www.swiggy.com/dapi/order/all';
export const FLIPKART1_ORDER_DATA_URL =
  'https://1.rome.api.flipkart.com/api/5/self-serve/orders';
export const FLIPKART2_ORDER_DATA_URL =
  'https://2.rome.api.flipkart.com/api/5/self-serve/orders';
export const FLIPKART_SINGLE_ORDER_URL =
  '.rome.api.flipkart.com/api/4/self-serve/order/detail';
export const MYNTRA_SINGLE_ORDER_URL =
  'https://api.myntra.com/v2/user/order/address/';
export const DMART_ORDER_DATA_URL =
  'https://digital.dmart.in/api/v3/secure/orders/list';

//khosla
export const KHOSLA_CLIENT_CODE = process.env.KHOSLA_CLIENT_CODE;
export const KHOSLA_KYC_API_KEY = process.env.KHOSLA_KYC_API_KEY;
export const KHOSLA_KYC_SALT = process.env.KHOSLA_KYC_SALT;
export const KHOSLA_ESIGN_SALT = process.env.KHOSLA_ESIGN_SALT;
export const KHOSLA_BASE_URL = 'https://prod.veri5digital.com/';
const KHOSLA_KYC_BASE = KHOSLA_BASE_URL + 'okyc/api/v1.0';
export const KHOSLA_GET_CAPTCHA_URL = KHOSLA_KYC_BASE + '/getCaptcha';
export const KHOSLA_GET_NEW_CAPTCHA_URL = KHOSLA_KYC_BASE + '/getNewCaptcha';
export const KHOSLA_ENTER_OTP_URL = KHOSLA_KYC_BASE + '/enterOtp';
export const KHOSLA_VERIFYAADHAAR = KHOSLA_KYC_BASE + '/enterAadhaar';
export const KHOSLA_FETCHKYC_URL = KHOSLA_KYC_BASE + '/fetchKYCData';
export const KHOSLA_DOWNLOAD_AADHAAR = KHOSLA_KYC_BASE + '/fetchOfflineXML';
const KHOSLA_PAN_BASE = KHOSLA_BASE_URL + 'service/api/1.0';
export const KHOSLA_PAN_VERIFICATION = KHOSLA_PAN_BASE + '/verifyUserIdDoc';
//esign apis
const KHOSLA_ESIGN_BASE = KHOSLA_BASE_URL + 'esign';
export const KHOSLA_DOC = KHOSLA_ESIGN_BASE + '/uploadDocument';
export const KHOSLA_INITIATE_URL = KHOSLA_ESIGN_BASE + '/_initiateEsign';
export const KHOSLA_DOWNLOAD_ESIGN_URL =
  KHOSLA_ESIGN_BASE + '/_downloadDocument';
/// submit api
export const SUBMIT_PHONE_URL = THIRD_PARTY + 'v1/firebase/submitPhone';
const EXOTEL_BASE_API = '@api.exotel.com';
export const EXOTEL_URL = `https://${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}${EXOTEL_BASE_API}/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`;
export const EXOTEL_URL_LSP = `https://${process.env.LSP_EXOTEL_API_KEY}:${process.env.LSP_EXOTEL_API_TOKEN}${EXOTEL_BASE_API}/v1/Accounts/${process.env.LSP_EXOTEL_SID}/Calls/connect.json`;

/// Zoop
export const ZOOP_BASE_URL = process.env.ZOOP_BASE_URL;
export const AADHAAR_URL = process.env.AADHAAR_URL;
/// call back
export const ZOOP_RESPONSE_URL =
  HOST_URL + `${Latest_Version}/esign/zoopCallBackURL`;
// zoop esign
export const ZOOP_ESIGN_INIT_URL = ZOOP_BASE_URL + 'contract/esign/v5/init';
export const ZOOP_ESIGN_CHECK_URL =
  ZOOP_BASE_URL + 'contract/esign/v5/fetch/request?request_id=';
/// Zoop PAN
export const ZOOP_PAN_URL = ZOOP_BASE_URL + 'api/v1/in/identity/pan/lite';
export const ZOOP_AADHAAR_URL = ZOOP_BASE_URL + 'in/identity/okyc/otp/request';
export const ZOOP_OPT_VERIFY_URL =
  ZOOP_BASE_URL + 'in/identity/okyc/otp/verify';

/// Setu esign
export const SETU_BASE_URL = process.env.SETU_BASE_URL;
export const SETU_ESIGN_INIT_URL = SETU_BASE_URL + 'api/documents';
export const SETU_CREATE_REQUEST_URL = SETU_BASE_URL + 'api/signature';

/// augmont
export const AUGMONT_BASE_URL = process.env.AUGMONT_BASE_URL;
export const AUGMONT_EMAIL = process.env.AUGMONT_EMAIL;
export const AUGMONT_PASSWORD = process.env.AUGMONT_PASSWORD;
export const AUGMONT_MERCHANT_URL = AUGMONT_BASE_URL + 'merchant/v1/';
// end points
export const AUGMONT_LOGIN_URL = AUGMONT_MERCHANT_URL + 'auth/login';
export const AUGMONT_RATES_URL = AUGMONT_MERCHANT_URL + 'rates';

// user
export const AUGMONT_USER_URL = AUGMONT_MERCHANT_URL + 'users/';
export const AUGMONT_PASSBOOK_URL = '/passbook';
export const AUGMONT_BANKS_URL = '/banks';

// buy and sell
export const AUGMONT_BUY_URL = '/buy';
export const AUGMONT_SELL_URL = '/sell';
export const AUGMONT_TRANSFER_URL = '/transfer';
export const AUGMONT_INVOICE_URL = AUGMONT_MERCHANT_URL + 'invoice/';

// Elephant
const nElephant_base_url = process.env.ELEPHANT_BASE_URL;
const nElephant_base_1_url = process.env.ELEPHANT_BASE_1_URL;
export const nElephantToken = nElephant_base_url + '/generateToken';
export const nElephantProposal = nElephant_base_url + '2/saveProposalapi';
export const nElephantCOI = nElephant_base_1_url + 'getCoi';
export const nElephantCheckStatus = nElephant_base_url + '2/getStatus';
/// MASTER_SCHEDULER
export const SCHEDULER_URL = process.env.MASTER_SCHEDULER;
export const CF_PAYOUT_URL = SCHEDULER_URL + 'thirdParty/cashfree/payout';
export const CF_CHECK_PAYOUT_URL =
  SCHEDULER_URL + 'thirdParty/cashfree/checkPayoutStatus';

// automation (truecaller)
export const nAutomationBaseURL = process.env.AUTOMATION_BASE_URL;
export const nVerifyByTruecaller = '/v1/truecaller/searchNumbers';

// AppsFlyer -> 3rd party
const appsFlyerBaseURL = gIsPROD
  ? process.env.APPS_FLYER_PROD_URL
  : process.env.APPS_FLYER_PROD_URL;
export const nAppsFlyerEvent = appsFlyerBaseURL + 'inappevent/';

// One money -> 3rd Party
const kOneMoneyMode = process.env.ONE_MONEY_MODE ?? 'DEV';
/// client id
const kOneMoneyClientIdUAT = process.env.ONE_MONEY_CLIENT_ID_UAT;
const kOneMoneyClientIdPROD = process.env.ONE_MONEY_CLIENT_ID_PROD;
const nOneMoneyClientId =
  kOneMoneyMode == 'PROD' ? kOneMoneyClientIdPROD : kOneMoneyClientIdUAT;

/// client secret
const kOneMoneyClientSecretUAT = process.env.ONE_MONEY_CLIENT_SECRET_UAT;
const kOneMoneyClientSecretPROD = process.env.ONE_MONEY_CLIENT_SECRET_PROD;
const nOneMoneyClientSecret =
  kOneMoneyMode == 'PROD'
    ? kOneMoneyClientSecretPROD
    : kOneMoneyClientSecretUAT;

/// client org id
const kOneMoneyOrgIdUAT = process.env.ONE_MONEY_ORGANISATION_ID_UAT;
const kOneMoneyOrgIdPROD = process.env.ONE_MONEY_ORGANISATION_ID_PROD;
const kOneMoneyOrgId =
  kOneMoneyMode == 'PROD' ? kOneMoneyOrgIdPROD : kOneMoneyOrgIdUAT;

/// client product id
const kOneMoneyProductIdUAT = process.env.ONE_MONEY_PRODUCT_ID_UAT;
const kOneMoneyProductIdPROD = process.env.ONE_MONEY_PRODUCT_ID_PROD;
export const kOneMoneyProductId =
  kOneMoneyMode == 'PROD' ? kOneMoneyProductIdPROD : kOneMoneyProductIdUAT;

/// base url
const kOneMoneyBaseURLUAT = process.env.ONE_MONEY_BASE_URL_UAT;
const kOneMoneyBaseURLPROD = process.env.ONE_MONEY_BASE_URL_PROD;
export const kOneMoneyBaseURL =
  kOneMoneyMode == 'PROD' ? kOneMoneyBaseURLPROD : kOneMoneyBaseURLUAT;

/// app identifire
const kOneMoneyAppIdentifierUAT = process.env.ONE_MONEY_APP_IDENTIFIER_UAT;
const kOneMoneyAppIdentifierPROD = process.env.ONE_MONEY_APP_IDENTIFIER_PROD;
const kOneMoneyAppIdentifier =
  kOneMoneyMode == 'PROD'
    ? kOneMoneyAppIdentifierPROD
    : kOneMoneyAppIdentifierUAT;

export const kOneMoneyHeaders = {
  client_id: nOneMoneyClientId,
  client_secret: nOneMoneyClientSecret,
  organisationId: kOneMoneyOrgId,
  appIdentifier: kOneMoneyAppIdentifier,
};

// Finvu
export const kFinvuHeaders = {
  rid: '42c06b9f-cc5b-4a53-9119-9ca9d8e9acdb234567890',
  ts: '2019-07-15T11:03:44.427+0000',
  channelId: 'finsense',
};
export const kfinvuBody = {
  userId: EnvConfig.finvu.userId,
  password: EnvConfig.finvu.password,
};
export const kFinvuGetAuthToken = FINVU_BASE_URL + 'User/Login';
export const kFinvuRequestConsent = FINVU_BASE_URL + 'ConsentRequestPlus';
export const kFinvuDecryptURL = FINVU_BASE_URL + 'Webview/Decrypt';
export const kFinvuDataRequest = FINVU_BASE_URL + 'FIRequest';
export const nFinvuFetchData = FINVU_BASE_URL + 'FIDataFetch';
export const kFinvuStatusCheck = FINVU_BASE_URL + 'ConsentStatus';
export const kFinvuAuthCheck = `https://${EnvConfig.finvu.finvuBaseType}.fiulive.finfactor.co.in/finsense/API/V2/fips/`;
export const nFinvuDeliveryCheck = FINVU_BASE_URL + 'FIStatus/';
export const kFinvuTypeFetchData = FINVU_BASE_URL + 'FIDataReport';
export const nFinvuJourneyURL = kFrontendBaseURL + 'finvu';

// One money
export const nOneMoneyRequestConsent = kOneMoneyBaseURL + 'v2/requestconsent';
export const nOneMoneyRedirectURL =
  kOneMoneyBaseURL + 'webRedirection/getEncryptedUrl';
export const nOneMoneyDecryptURL =
  kOneMoneyBaseURL + 'webRedirection/decryptUrl';
export const nOneMoneyCheckStatus = kOneMoneyBaseURL + 'v2/getconsentslist';
export const nOneMoneyGetallfidata = kOneMoneyBaseURL + 'getallfidata';
export const nOneMoneyFIRequest = kOneMoneyBaseURL + 'fi/request';
export const nOneMoneyGetalllatestfidata =
  kOneMoneyBaseURL + 'getalllatestfidata';
export const nOneMoneyGetallfiPDF = kOneMoneyBaseURL + 'getallfidataPdf';
export const nOneMoneyCallBackURL = aaURL;

// // Neighbor servers
// export const nAARedirectionURL =
//   process.env.SECONDARY_ANGULAR_AA_REDIRECTION_URL;

// Python server
export const PY_BACKEND_BASE_URL_LSP = process.env.PY_BACKEND_URL_LSP;
export const PY_BACKEND_BASE_URL_NBFC = process.env.PY_BACKEND_URL_NBFC;

// LSP ML
const LSP_ML_WORLD_BASE_URL = process.env.LSP_ML_WORLD;
export const nCibilRiskCategoryFromBatch =
  LSP_ML_WORLD_BASE_URL + 'v1/cibil/riskCategory_from_batch';
export const nValidateOfferLetter =
  LSP_ML_WORLD_BASE_URL + 'v1/offer_letter/verify';

export const nObjectToExcel = LSP_ML_WORLD_BASE_URL + 'v1/jsonto/excel';

// IP
export const nIpCheck = 'https://ipwhois.pro/';
export const nIpCheckerKey = process.env.IP_CHECKER_KEY;

// Banking
export const nNetbankingTriggers =
  HOST_URL + `${Latest_Version}/banking/submitNetBankingTrigger`;
export const nPrepareWebViewData =
  HOST_URL + `${Latest_Version}/banking/prepareWebviewData`;
export const nConvertBase64ToPdf =
  HOST_URL + `${Latest_Version}/banking/convertBase64ToPdf`;

// Banking pro server
export const nSyncTransactions =
  PRIMARY_BANKINGPRO_URL + 'transaction/syncData';
export const nPrepareWebviewData =
  PRIMARY_BANKINGPRO_URL + 'transaction/prepareWebviewData';

// Host server
export const nInsertLog = HOST_URL + `${Latest_Version}/metrics/insertLog`;

// Schedular server
export const nInitiateReferralWithdrawal =
  EnvConfig.network.nMasterSchedularUrl + 'admin/referral/initiateWithdrawal';
export const nCronControllerAPI =
  EnvConfig.network.nMasterSchedularUrl + 'cron/';

//whatsApp Api
export const WS_URL = 'https://crmapi.com.bot/whatsapp/waba';

//telegram api
export const TELEGRAM_URL = 'https://api.telegram.org/bot';

//promo code
export const promoCode =
  HOST_URL + `${Latest_Version}/loan/getPaymentLink?loanId=`;

/// emandate url for flutter web
export const INVITATION_MANDATE_URL =
  HOST_URL + `${Latest_Version}/mandate/link/`;

//instafinace company url
export const INSTAFINACIAL_LLP_COMPANY_URL =
  'https://www.instafinancials.com/LLP/LLP.aspx/';
export const INSTAFINACIAL_URL = 'https://www.instafinancials.com/';
export const nInstafinaceLlpComapny =
  INSTAFINACIAL_LLP_COMPANY_URL + 'PopulateLLPData';
export const nInstafinaceLlpDirectorName =
  INSTAFINACIAL_LLP_COMPANY_URL + 'PopulateDirectorsData';
export const nInstafinacePrivateComapny = INSTAFINACIAL_URL + 'company/';
export const nInstafinacePrivateDirectorName =
  INSTAFINACIAL_URL + 'company-directors';

// Digilocker
const digiLockerBaseUrl = 'https://api.digitallocker.gov.in/public/';
export const nDigiLockerExistance =
  'https://digilocker.meripehchaan.gov.in/public/account/2/verify';
export const nDigiLockerAuthorize = digiLockerBaseUrl + 'oauth2/1/authorize';
export const nDigiLockerGetAuthToken = digiLockerBaseUrl + 'oauth2/1/token';
export const nDigiLockerPullAadhaar =
  digiLockerBaseUrl + 'oauth2/3/xml/eaadhaar';
export const nEmailVerifyNBFC =
  kFrontendBaseURL +
  `verify-${EnvConfig.nbfc.nbfcShortName.toLowerCase()}` +
  '?key=';
//sendGrid Api
export const sendGridKey = 'Bearer ' + process.env.SENDGRID_API_KEY;
export const SENDGRIDBASE_URL = 'https://api.sendgrid.com/v3/mail/send';
export const nUserMigrate =
  'http://129.151.46.149/prod/v4/shared/migrateUserDetailsv2';
export const nUATUserMigrate =
  'http://140.238.250.7/uat-api/v4/shared/migrateUserDetailsv2';

export const nDirectCibilFetch =
  EnvConfig.server.parallelServer + 'cibil/CreditVisionScorePersonalLoanScore';

export const TATA_TELE_APIS = {
  GENERATE_TOKEN: 'https://api-smartflo.tatateleservices.com/v1/auth/login',
  CLICK_TO_CALL: 'https://api-smartflo.tatateleservices.com/v1/click_to_call',
  GET_CALL_RECORD: 'https://api-smartflo.tatateleservices.com/v1/call/records',
  BRODCAST_USER_CREATE:
    'https://api-smartflo.tatateleservices.com/v1/broadcast/list',
  CREATE_USER_LEADS:
    'https://api-smartflo.tatateleservices.com/v1/broadcast/leads',
  CREATE_BROD_CAST: 'https://api-smartflo.tatateleservices.com/v1/broadcast',
  START_BROD_CAST:
    'https://api-smartflo.tatateleservices.com/v1/broadcast/start',
  CLOSE_BRODCAST_STATUS:
    'https://api-smartflo.tatateleservices.com/v1/broadcast/end/',
};

// Neighbour -> Studio
export const nCheckWhatsAppNumber =
  EnvConfig.neighbour.studioBaseUrl + 'thirdParty/whatsApp/isRegistered';
export const nSendWhatsAppMsg =
  EnvConfig.neighbour.studioBaseUrl + 'thirdParty/whatsApp/sendMsg';

// Thirdparty -> Slack
const slackBaseUrl = 'https://slack.com/api/';
export const nSlackMsg = slackBaseUrl + 'chat.postMessage';
export const nGetSlackMsg = slackBaseUrl + 'conversations.history';

const microServiceApiBaseUrl = EnvConfig.kafka.kafkaApiHost;

export const sendWhatsAppMicroServiceUrl = `${microServiceApiBaseUrl}/api/whatsApp/send_whatsapp_message`;
export const sendSendCampaignMessageMicroServiceUrl = `${microServiceApiBaseUrl}/api/whatsApp/send_whatsapp_campaign`;
export const storeWhatsAppWebhook = `${microServiceApiBaseUrl}/api/whatsApp/store_whatsapp_webhook`;
export const sendSlackMessageApi = `${microServiceApiBaseUrl}/api/send_slack_message`;
export const slackApiError = `${microServiceApiBaseUrl}/api/send_slack_api_error_message`;
