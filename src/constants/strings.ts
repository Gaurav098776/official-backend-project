import { EnvConfig } from 'src/configs/env.config';

// Imports
export const kGlobalTrail = 'T10:00:00.000Z';
export const kUTCTrail = 'T18:30:00.000Z';

// Admin's and QA's Mails
export const kAdmins = process.env.ADMIN_EMAILS?.split(',') ?? [];
export const kQa = process.env.QA_EMAILS?.split(',') ?? [];
export const kCC = [...kAdmins, ...kQa];

// Organisation Mails
export const kLegalTeamMail = EnvConfig.mail.legalTeamMail;
export const kSupportMail = EnvConfig.mail.suppportMail;
export const kNBFCSuportOnlyForEmail = EnvConfig.mail.NBFCSuportForEmail; //use for only email footer template
export const kNBFCLegalMailForAttachment =
  EnvConfig.mail.NBFCLegalMailForAttachment; //legal mail for attechments
export const kTechSupportMail = EnvConfig.mail.techSupportMail;
export const kLspDevGmail = EnvConfig.mail.lspDevGmail;

// Organisation Contact Numbers
export const kWhatsAppNumber = EnvConfig.number.whatsappNumber;
export const kCollectionPhone = EnvConfig.number.collectionNumber;
export const kHelpContact = EnvConfig.number.helpContact;
export const kLegalNumber = EnvConfig.number.legalNumber;

// Organisation name
export const kInfoBrandName = EnvConfig.nbfc.appCamelCaseName;
export const kInfoBrandNameNBFC = `${EnvConfig.nbfc.nbfcCamelCaseName}`;
export const kNBFC = EnvConfig.nbfc.nbfcName;
export const kNBFCFromName = EnvConfig.nbfc.NBFCFromName;

export const kVerificationsMail = EnvConfig.mail.verificationsMail;

export const kNoReplyMail = EnvConfig.mail.noReplyMail;
export const kCollectionEmail = EnvConfig.mail.collectionEmail;
export const kLegalMail = EnvConfig.mail.legalMail;
export const kiosLink =
  'https://apps.apple.com/in/app/lenditt-your-financial-buddy/id1577363656';
export const kPlayStoreLink =
  'https://play.google.com/store/apps/details?id=com.fintech.lenditt';

export const kFinalLoanAcceptTitle = '🤝 Superb, Loan approved';
export const kFinalLoanAcceptBody =
  'Congratulations! Your loan application is approved; tap here to get the disbursement';
export const kTInterestEligibleSub =
  "Congratulations! You're Eligible for Special 0.1% per day Interest Rate";

export const kValidEmail = 'Please enter valid email';
export const kEmailExist = 'This email already exist';
export const kEmailVerified = 'Email alread verified';
export const kInActiveAdmin = 'Login disabled, Contact Admin';
export const kInvalidDepartment = 'Please select a valid department';

export const kValidPhone = 'Please enter valid mobile number';

export const kValidComapnyPhone = 'Please enter valid company mobile number';
export const kSomthinfWentWrong = 'Something went wrong. Please try again.';

export const kByPass = 'BY_PASS';

export const kEsignCantClose =
  'Can not Reject Loan Due to Esign already Signed';

export const kOTPInvalid = 'OTP is invalid';
export const kOTPIsExpired = 'OTP is expired';

export const kInvalidReferCode = 'Invalid referral code!';
export const kAlreadyInitialized = 'One transaction is already in progress!';

export const kDigiLocker = 'DIGILOCKER';

export const kEnterValidAadhaarNumber = 'Enter the valid Aadhaar number';
/// email templte text
export const kTEmailOtp = 'EMAIL OTP';
export const kTAdminEmailOtp = 'ADMIN EMAIL OTP';
export const kTMandateIn = 'MANDATE_INVITATION';
export const kTOverDue = `${EnvConfig.nbfc.nbfcShortName} OVER DUE EMAIL`;
export const kTCollectionSummary = 'DAILY_REPORT_COLLECTION';
export const kTInterestEligible = 'INTEREST ELIGIBLE';
export const kDailyRegistrationReport = 'DAILY_REGISTRATION_REPORT';
export const kTEmailVerificationLink = 'EMAIL VERIFICATION LINK';

// banking
export const kAccountExist = 'Account number already exists in another user';
export const kAccountNotMatch = 'Account number not match';
export const NO_VALID_TRANSACTIONS =
  'Transaction amount less than minimum required criteria';

/// employement
export const kSubmissionOfEmploymentNotCom =
  'Submission of employment details is not completed';
export const kCanNotSelectThisCompany = 'Can not select this company';

///  verification Progress
export const kPending = 'Pending';
export const kUnder_Verification = 'Under Verification';
export const kUserBlocked = 'User Blocked!!';
export const kUserUnBlocked = 'User Unblocked!!';
export const kUserCoolOf = 'User in cool-off';
export const kSuccessful = 'Successful';

/// not eligible
export const kNotEligible = 'Not eligible';
export const kNotEligibleSubTitle =
  'You are not eligible as per minimal criteria. Please read our terms and conditions and minimal eligibility criteria before you re-apply. We look forward to serving your financial needs.';
export const kReApplyTime =
  'We are sorry to inform you that your loan application was declined \n\nYou can always re-apply for a new loan after ##**days##. We look forward to serving your financial needs.';

/// reject message
export const MIN_SCORE_MESS = 'NOT ELIGIBLE AS PER ELIGIBLE SCORE';
export const DELETE_ACCOUNT_MSG = 'DELETE ACCOUNT BY USER';
export const BAD_CIBIL_SCORE_MSG = 'BAD CIBIL SCORE';
export const ACTIVE_ACCOUNT_MSG =
  'While your loan is active, you cannot delete the account.';
export const APPROVED_SALARY_IS_NOT_MACTCH_WITH_STATE_SALARY =
  'APPROVED SALARY IS NOT MATCHED WITH STATE SALARY';
export const APPROVED_SALARY_IS_NOT_MATCH_WITH_AREA =
  'APPROVED SALARY IS NOT MATCHED WITH AREA';
export const USER_IS_NOT_MATCHED_WITH_COUNTRY =
  'USER IS NOT MATCHED WITH COUNTRY';
export const ENTERED_SALARY_IS_BELOW =
  'User entered salary is less than minimum salary criteria!';
export const LESS_CONTACTS = 'Less Contact';
export const SELF_EMPLOYEE_WITH_LESS_CIBIL_SCORE =
  'Self Employed with less CIBIL score!';
export const IP_ADDRESS_IS_BLACKLISTED = 'IP address is blacklisted';
export const IP_SECURITY_ISSUE = 'IP Security Issue';
export const MIN_SALARY_CRITERIA = 'Minimum Salary';
export const INCORPORATE_DATE_IS_LESS_THAN_ONE_YEAR =
  'Incorporate date is less than one year';
export const COMPANY_STATUS_IS_NOT_ACTIVE = 'Company status is not active';
export const COMPANY_BLACKLIST = 'Company Blacklist';
export const SALARY_BANK_ACCOUNT_COOL_OFF =
  'The user salary bank account is not within our service';
export const POLITICALLY_EXPOSED = 'User is Politically Exposed';
export const ALREADY_LOAN_ACTIVE = 'Already Loan is active with Different NBFC';
export const USER_WITH_DEFAULTER_SAME_ADDRESS =
  'Same address detected with defaulter address';
export const TRANSACTIONS_MATCHED_WITH_USER =
  'User transaction matched with another user transactions';
/// loan
export const kLoanNotProgress = 'Loan is not in progress!';
export const kDuplicateLoan = 'Duplicate Loan';

export const kLoanMaintainSufficientBalance =
  'Please maintain sufficient balance';
export const kAutoDebitNotSuccessFull =
  'Penalty amount will be reduced on successful Auto-debit. In case Auto-debit is not successful we request to make the payment.';
export const kAutoDebitNotInitilize =
  'Kindly make the EMI payment to avoid legal consequence';
// verification step
export const vCompany = 'COMPANY';
export const vSalarySlip = 'SALARYSLIP';
export const vWorkMail = 'WORKMAIL';
export const vResidence = 'RESIDENCE';

export const vFinalBucket = 'FINALBUCKET';
export const vMandate = 'MANDATE';

//  signDesk validation errors
export const MissMatchName = 'Users name does not matched with document';

export const InvalidIfscCode =
  'IFSC is invalid! Please enter correct IFSC code';

/// notification text
export const kNoTemplateFound = 'No such template found';

/// route
export const kDashboardRoute = 'dashboardRoute';
export const kPreferenceRoute = 'preferenceRoute';
export const kPermissionRoute = 'handyDocsRoute';
export const kAugmountRoute = 'augmountRoute';
export const kBasicDetailsRoute = 'basicDetailsRoute';
export const kPersonalDetailsRoute = 'personalDetailsRoute';
export const kProfessionalDetailsRoute = 'professionalDetailsRoute';
export const kRepaymentRoute = 'repaymentRoute';
export const kNotEligibleRoute = 'notEligibleRoute';
export const kSetPassCodeRoute = 'setPassCodeRoute';
export const kChangePassCodeRoute = 'changePassCodeRoute';
export const kAddAadhareNumberRoute = 'addAadhareNumberRoute';
export const kWebviewRoute = 'webviewRoute';
export const kReApplyRoute = 'reApplyRoute';
export const kExpressReApplyRoute = 'expressReapplyRoute';
export const kEmploymentRoute = 'employmentRoute';
export const kWorkEmailRoute = 'workEmailRoute';
export const kSalarySlipRoute = 'salarySlipRoute';
export const kBankingRoute = 'bankingRoute';
export const kMissingMonthRoute = 'missingMonthRoute';
export const kEmailVerificationRoute = 'emailVerificationRoute';
export const kHavingTroubleRoute = 'havingTroubleRoute';
export const kTakeSelfieRoute = 'takeSelfieRoute';
export const kSetPinRoute = 'setPinRoute';
export const kPinVerificationRoute = 'pinVerificationRoute';
export const kCheckPinRoute = 'checkPinRoute';
export const kCompanyDetailsRoute = 'companyDetailsRoute';
export const kSameCompanyRoute = 'stillWorkingSameCompanyRoute';
export const kStillWorkingSameCompanyRoute = 'stillWorkingSameCompanyRoute';
export const kAddWorkEmailRoute = 'addWorkEmailRoute';
export const kAddSalarySlipRoute = 'addSalarySlipRoute';
export const kNetBankingRoute = 'netBankingRoute';
export const kTransferFundsUiV2 = 'transferFundsUiV2';
export const kReUploadNetBankingRoute = 'reUploadNetBankingRoute';
export const kAddAccountNumberRoute = 'addAccountNumberRoute';
export const kAddIFSCRoute = 'addIFSCRoute';
export const kAddAdditionalIFSCRoute = 'addAdditionalIFSCRoute';
export const kVerificationProgressRoute = 'verificationProgressRoute';
export const kTypeAddressRoute = 'typeAddressRoute';
export const kCibilAddressRoute = 'cibilAddressRoute';
export const kAutomateResidenceRoute = 'automateResidenceRoute';
export const kInAppAutomateResidenceRoute = 'inAppAutomationresidenceRoute';
export const kSubmitResidenceProofRoute = 'submitResidenceProofRoute';
export const kResidenceProofRoute = 'residenceProofRoute';
export const kReuploadPanRoute = 'reUploadPanCardRoute';
export const kReferenceRoute = 'referenceRoute';
export const kIsNeedTagSalaryRoute = 'isNeedTagSalaryRoute';
export const kNoRoute = 'noRoute';
export const kServiceUnavailableRoute = 'serviceUnavailableRoute';
export const kSelectLoanAmountRoute = 'selectLoanAmountRoute';
export const kKeyFactStatementRoute = 'keyFactStatementRoute';
export const kAcceptInsuranceRoute = 'acceptInsuranceRoute';
export const kMandateRoute = 'mandateRoute';
export const kEsignRoute = 'esignRoute';
export const kSelectInterestRoute = 'selectInterestRoute';
export const kGoldRouteRoute = 'augmountUIv2';
export const kreloginRoute = 'reloginRoute';
export const kReferralWalletRoute = 'referralWalletRoute';
export const kReferBottomSheetRoute = 'referBottomSheetRoute';
export const kchatScreenRoute = 'chatScreenRoute';
//contact message
export const ContactVerifiedSuccess =
  'You are getting closer to your loan; tap here to proceed';
export const SContactVerification = 'Reference Contacts verified 👌';
export const SContactNotVerify =
  'Sorry, Unable to verify reference Contacts 🤞';
// employment messages
export const CompanyVerifiedSuccess =
  'You are getting closer to your loan; tap here to proceed';

// work email message
export const WorkMailVerificationSucess =
  'You are getting closer to your loan; tap here to proceed';
export const BankStatmentVerificationSuccess =
  'You are getting closer to your loan; tap here to proceed';

export const SalarySlipVerificationSucess =
  'You are getting closer to your loan; tap here to proceed';

export const ResidenceVerificationSuccess =
  'Your address document is verified successfully; tap here to proceed';

export const SelfieverificationSuccess =
  'Your Profile image verified successfully; tap here to proceed';
export const SelfieRejected =
  "We're sorry, but the selfie you uploaded has been rejected. Please re-upload a professional selfie.";
export const SelfieUnderVerification =
  'We are currently verifying your selfie. Thank you for your patience.';

// title/step for notification
export const SCopanyVerfication = 'Company verified 👌';
export const SCopanyNotVerfy = 'Sorry, Unable to verify Company details 🤞';
export const kSelectPurposeRoute = 'selectLoanPurposeRoute';
export const kPGPDecrypt = 'PGP_SYM_DECRYPT';
export const SWorkEmailVerification = 'Employment verified 👌';

export const SWorkEmailNotVerify =
  'Sorry, Employment details cannot be verified 🤞';
export const SSalarySlipVerification = 'Salary slip verified 👌';
export const SSalarySlipNotVerify = 'Sorry, Salary is not verified 🤞';
export const SSalaryVerification = 'Salary verified 👌';
export const SSalaryNotVerification = 'Sorry, Salary is not verified 🤞';
export const SResidenceVerification = 'Address verified 👍';
export const SResidenceNotVerify = 'Sorry, Address is not verified 🤞';
export const SSelfieVerification = 'Profile image verified 👍';
export const SSelfieNotVerify = 'Sorry, Profile image is not verified 🤞';
export const DisbursementSuccessTitleOnTime = 'It was quick 👍';
export const DisbursementSuccessBodyOnTime =
  'Your loan has been disbursed to your bank account in just ##MIN## min ##SEC## sec';
export const DisbursementSuccessTitle = '🤝 Loan disbursed';
export const DisbursementSuccessBody = `Your loan has been successfully disbursed to your bank account with Transaction number ##UTR##. Thank you for choosing ${EnvConfig.nbfc.nbfcName} 🙏`;
//  KYC verification Messages
export const PanVerificationSuccess =
  'Your pan card is verified successfully; tap here to proceed';
export const AadhaarVerificationSuccess =
  'Your aadhaar card is verified successfully; tap here to proceed';
export const OptionalDocVerificationSuccess =
  'Your optional document is verified successfully; tap here to proceed';
export const kZoopConsentText =
  'I hear by declare my consent agreement for fetching my pan information';

export const kStatementInfo = {
  title: 'Bank statement',
  info: 'Upload your ##*last 4 months## salary account bank statement to check your loan eligibility.',
};

export const kAadhaarConsentText =
  'I hear by declare my consent agreement for fetching my information via ZOOP API';

export const kHandyDocs = 'Eligibility Documents';
export const kSetPassCode = 'Set Passcode';
/// admin
export const kYouHaveAccess = "You don't have access";
export const kYHNAOfUpdatePayments = "You haven't access of update payments";
export const kPleaseProvidevalidStatus = 'Please provide valid status';

export const kCurrentPasswordAreSame =
  'Current password and previous password are same';

/// tracking text
export const tRegistration = 'Registration';
export const tEmployment = 'Employment';
export const tResidence = 'Residence';
export const tKYC = 'KYC verification';
export const tAadhaar = 'Aadhaar verification';
export const tPan = 'PAN verification';
export const tContact = 'Contact';
export const tNetbanking = 'Salary verification';
export const tApproval = 'Final approval';
export const tLoanAccept = 'Loan accept';
export const tEMandate = 'e-Mandate';
export const tESign = 'e-Sign';
export const tDisbursement = 'Disbursement';
export const tSuccess = 'Success';
export const tRejected = 'Rejected';
export const tInProgress = 'In Progress';
export const tPending = 'Pending';

/// transaction
export const kAmountLessThanPrincipal =
  'Enter amount is less than principal amount';
export const kAmountLessThanPrincipalAndInt =
  'Enter amount is less than Principal amount and Interest';
export const kAmountGreaterThan = 'Enter amount is greater than EMI amount';
export const kTransactionIdExists = 'Transaction id already exists';
export const kPleaceEnterValidSubmissionDate =
  'Please enter valide submission date';
export const kPleaseProvideFutureDue = 'Please provide future due date!';
export const kYouReachedAutoDebitLimit = 'You reached auto debit limit';
export const kWrongSourceType = 'Wrong source type';

// TransactionEntity
export const kCalBySystem = 'CALCULATED_BY_SYSTEM';

//  rights based on role
export const KLOANCHANGEABLE = 'changeableData';
export const KLOANREFUND = 'isRefund';

//  NOTIFICATION
export const nNewDeviceLogin = '👀 New Device Login detected';
export const nNewDeviceLoginBody =
  'Seems you have logged-in from a different device';
export const nLoanApproved = '☑️ Loan approved';
export const nKYCPAN = 'KYC - PAN verified 👌';
export const nKYCNotPAN = 'Sorry, PAN is not verified 🤞';

/// admin
export const kLoginSuccessfully = 'Login successfully';
export const kPasswordChangeSuccessfully = 'Password was changed successfully';
export const kOTPSentInPhone = 'OTP sent on your registered mobile number';
export const kOTPSentInEmail = 'OTP sent on your email';
export const kUpdateDataSuccessfully = 'Update data successfully';
export const kNotUpdated = 'Record not updated';
export const kRoleNotExist = 'Role does not exist';
export const kValidPassword = 'Please enter valid password';
export const kWrongCredentials = 'Wrong Credentials!';
export const kAdminOTPRoute = 'adminOTPRoute';
export const kReCreatedAdminPasswordRoute = 'reCreatedAdminPasswordRoute';
export const kAdminDashboardRoute = 'adminDashboardRoute';
export const kAdminRoleNotActive = 'Admin Role Not Active';
export const kCompanyAlreadyBlacklisted = 'Company already blacklisted!';
export const kNoSuchCompanyTheList = 'No such company in the list';
export const kEmailNotFound = 'Email not found!';
export const kBankStatementFailedMSJ =
  'We were unable to verify your bank account information. If you continue to have issues, please contact our customer support team for assistance.';
export const kInactiveUser = 'Inactive User response';
// Promocode Response
export const kPromoInvalid = 'Please enter the valid promo code';
///user update stages
export const ADD_BANKING_STAGE = 'ADD_BANKING_STAGE';
export const REJECTED_BANKING_STAGE = 'REJECTED_BANKING_STAGE';
export const NEED_TAG_SALARY_BANKING_STAGE = 'NEED_TAG_SALARY_BANKING_STAGE';
export const ADD_IFSC_BANKING_STAGE = 'ADD_IFSC_BANKING_STAGE';
export const ADD_ACCOUNT_NO_BANKING_STAGE = 'ADD_ACCOUNT_NO_BANKING_STAGE';
export const REJECTED_WORKMAIL_STAGE = 'REJECTED_WORKMAIL_STAGE';
export const ADD_RESIDENCE_STAGE = 'ADD_RESIDENCE_STAGE';
export const ADD_AUTOMATION_RESIDENCE_STAGE = 'ADD_AUTOMATION_RESIDENCE_STAGE';
export const REJECTED_RESIDENCE_STAGE = 'REJECTED_RESIDENCE_STAGE';
export const PIN_VERIFICATION_STAGE = 'PIN_VERIFICATION_STAGE';
export const ADD_REFERENCE_STAGE = 'ADD_REFERENCE_STAGE';
export const SELECT_LOAN_AMOUNT_STAGE = 'SELECT_LOAN_AMOUNT_STAGE';
export const KEY_FACT_STATEMENT_STAGE = 'KEY_FACT_STATEMENT_STAGE';
export const MANDATE_STAGE = 'MANDATE_STAGE';
export const ESIGN_STAGE = 'ESIGN_STAGE';
export const NOROUTE = 'NOROUTE';
export const SELFIE_VERIFICATION_FROM_ADMIN = 'SELFIE_VERIFICATION_FROM_ADMIN';
export const COMPANY_VERIFICATION_FROM_ADMIN =
  'COMPANY_VERIFICATION_FROM_ADMIN';
export const SALARYSLIP_VERIFICATION_FROM_ADMIN =
  'SALARYSLIP_VERIFICATION_FROM_ADMIN';
export const BANKING_VERIFICATION_FROM_ADMIN =
  'BANKING_VERIFICATION_FROM_ADMIN';
export const WORKMAIL_VERIFICATION_FROM_ADMIN =
  'WORKMAIL_VERIFICATION_FROM_ADMIN';
export const KYC_VERIFICATION_FROM_ADMIN = 'KYC_VERIFICATION_FROM_ADMIN';
export const RESIDENCE_VERIFICATION_FROM_ADMIN =
  'RESIDENCE_VERIFICATION_FROM_ADMIN';
export const CONTACT_VERIFICATION_FROM_ADMIN =
  'CONTACT_VERIFICATION_FROM_ADMIN';
export const FINAL_VERIFICATION_FROM_ADMIN = 'FINAL_VERIFICATION_FROM_ADMIN';

// Dashboard
export const kSelectedDateShouldNotbe =
  'Selected date should not be from the past';
/// stamp

//assignTypes admin
export const FINALBUCKETADMINS = 'FINALBUCKETADMINS';
export const BANKINGADMINS = 'BANKINGADMINS';
export const CSEADMINS = 'CSEADMINS';
/// e-sign
export const signer_purpose = 'Loan Agreement';

// Notification
export const kLoanDeclined = 'Loan Declined';
export const kInternalPolicy =
  'We are sorry to inform you that your loan application is declined due to NBFC credit policy';

// /// gold /silver
export const kAugmontPINCodeRoute = 'augmontPINCodeRoute';
export const kBankDetailsRoute = 'bankDetailsRoute';
export const kShareAppRoute = 'shareAppRoute';
export const kUserNotExist = 'User not exist';
export const kPleaceEnterValidPincode = 'Please enter valide Pincode';

export const bankingStuck = [
  ADD_BANKING_STAGE,
  REJECTED_BANKING_STAGE,
  NEED_TAG_SALARY_BANKING_STAGE,
  ADD_IFSC_BANKING_STAGE,
  ADD_ACCOUNT_NO_BANKING_STAGE,
];

export const residenceStuck = [
  ADD_RESIDENCE_STAGE,
  REJECTED_RESIDENCE_STAGE,
  ADD_AUTOMATION_RESIDENCE_STAGE,
];

export const loanAcceptStuck = [
  SELECT_LOAN_AMOUNT_STAGE,
  KEY_FACT_STATEMENT_STAGE,
];
export const referenceStuck = [ADD_REFERENCE_STAGE];
export const esignStuck = [ESIGN_STAGE];
export const mandateStuck = [MANDATE_STAGE];

export const underVerification = [
  COMPANY_VERIFICATION_FROM_ADMIN,
  SALARYSLIP_VERIFICATION_FROM_ADMIN,
  BANKING_VERIFICATION_FROM_ADMIN,
  WORKMAIL_VERIFICATION_FROM_ADMIN,
  RESIDENCE_VERIFICATION_FROM_ADMIN,
  PIN_VERIFICATION_STAGE,
  SELFIE_VERIFICATION_FROM_ADMIN,
  CONTACT_VERIFICATION_FROM_ADMIN,
  KYC_VERIFICATION_FROM_ADMIN,
  FINAL_VERIFICATION_FROM_ADMIN,
];

export const kUnderVerification = 'UNDER VERIFICATION';

// Notifications
export const keSignSuccessNotify = 'E-Sign completed successfully 👌';
export const kWaitForDisbursement = 'Disbursement process has been initiated';
export const kFreshMandate =
  'Your fresh e-mandate is waiting for you!! Please try agian';
export const kReEsignNotify =
  'Complete your Re-Esign process to get the loan amount disbursed into your bank account.';
export const kCoolOffPeriodOverTitle = 'Waiting period is over';
export const kCoolOffPeriodOverContent = `🥳 Celebrate! Your waiting period is over, access easy loans now! 💸💳`;

// Defaulter
export const kChangeFollowerId = 'Change followerId';

// Payment type
export const kAutoDebit = 'AUTODEBIT';
export const kUpi = 'UPI';

//Sub Source
export const kApp = 'APP';
export const kWeb = 'WEB';

// Services
export const kCashfree = 'CASHFREE';
export const kRazorpay = 'RAZORPAY';
export const KICICIUPI = 'ICICI_UPI';
export const kSigndesk = 'SIGNDESK';
export const kSDK = 'SDK';
export const kSetu = 'SETU';
export const kZoop = 'ZOOP';
export const kVeri5 = 'VERI5';

// Decline reasons
export const kNotEligibleForNBFC =
  'You are not eligible as per NBFC credit policy';

// Types
export const kCompleted = 'COMPLETED';
export const kInitiated = 'INITIALIZED';
export const kStuck = 'STUCK';
export const kFailed = 'FAILED';
export const kSignedNotice = 'SIGNED_NOTICE';
export const kCapActive = 'ACTIVE';
export const kUsrCategories = 'UserCategorization';
export const kHighRisk = 'High risk';
export const kModerateRisk = 'Moderate risk';
export const kReferral = 'REFERRAL';
export const kRefund = 'REFUND';
// shows that loan is closed with partial payment.
export const kLoanClosureStr = 'LOAN_CLOSURE';
export const kLoanSettled = 'LOAN_SETTLEMENT';

// Services
export const kAadhaarService = 'AADHAAR_SERVICE';
export const kPanService = 'PAN_SERVICE';
export const kEMandateService = 'EMANDATE_SERVICE';
export const kESignService = 'ESIGN_SERVICE';
export const kPaymentMode = 'PAYMENT_MODE';
export const kUPIMode = 'UPI_MODE';
export const kEmailService = 'EMAIL_SERVICE';
export const kCallService = 'CALL_SERVICE';

// API Response
export const kNoDataFound = 'No data found';
export const kNoBalance = 'Not enough balance!';

// Eligiblity
export const kNotEligibleText =
  'We regret to inform you that your loan application has been rejected as ##*it does not meet NBFC credit policy##.';

// Dashboard Info
// #01 Basic details
export const kBasicInfo = {
  title: 'Basic details',
  info: 'To continue, please provide the required basic details.',
};
// #02 Personal details
export const kPersonalInfo = {
  title: 'Personal details',
  info: 'Submit required personal details to proceed further.',
};
// #03 Professional details
export const kProfessionalInfo = {
  title: 'Professional details',
  info: 'Submit required professional details to proceed further.',
};
// Aadhar verification
export const kKYCInfo = {
  title: 'Verify Aadhaar',
  info: 'Complete your KYC verification by providing 12 digit aAdhaar number.',
};
// Employment details
export const kEmploymentInfo = {
  title: 'Employment details',
  info: 'Update your company details to check your loan eligibility.',
};

// Work mail
export const kWorkMailInfo = {
  title: 'Work mail',
  info: 'verify to get instant discount on interest rate.',
};
// Bank
export const kIFSCInfo = {
  title: 'Bank details',
  info: 'Provide your bank details to proceed further.',
};
export const kTagSalaryInfo = {
  title: 'Select salary transaction',
  info: 'Tag your salary transaction to verify your salary which can help us to check your eligibility.',
};
export const kAccountInfo = {
  title: 'Bank details',
  info: 'Provide your bank account details to proceed further.',
};
// Verification
export const kVerificationInfo = {
  title: 'Application under process',
  info: 'We are verifying your details. Please be patient. We will update you soon.',
  // info:'We would like to inform you that we are currently undergoing operational changes to improve our services and enhance user experience on our mobile app. However, these changes might result in a delay of 48-72 hours in processing new loan applications.'
};
// Residence
export const kResidenceTypeInfo = {
  title: 'Verify residence',
  info: 'Submit your correspondence residence address details.',
};
export const kResidenceAutomationInfo = {
  title: 'Verify residence',
  info: 'Verify your correspondence residence address details via eCommerce for express verification.',
};
export const kResidenceProofInfo = {
  title: 'Verify residence',
  info: 'Upload residence document to verify correspondence address details.',
};
export const kReferenceInfo = {
  title: 'Submit reference number',
  info: 'Please provide any 5 reference numbers from your contact list.',
};
export const kReUploadPanInfo = {
  title: 'Pan verification',
  info: 'We could not verify your PAN details. Please resubmit for further processing.',
};
export const kPasscodeResetInfo = {
  title: 'Passcode Reset',
  info: 'Please reset your passcode.',
};
export const kLoanAcceptInfo = {
  title: 'Loan approved',
  info: 'Hurray ! you are eligible for the loan amount of ##*Rs.',
};
export const keMandateInfo = {
  title: 'Register E-Mandate',
  info: 'To register for the Auto-pay via E-Mandate click on continue.',
};
export const keMandateFailedInfo = {
  title: 'E-Mandate failed',
  info: 'Please wait for 15 minutes, We will send you new E-Mandate invitation.',
};

// Verification
export const kESignPreparationInfo = {
  title: 'E-Sign process',
  info: 'To E-Sign your loan agreement digitally, click on continue.',
};
export const kDisbursementInfo = {
  title: 'Disbursement initiated',
  info: `We are happy to inform you that the disbursement of your loan has been initiated. You can expect to receive the loan amount in your bank account within 24 hours. If you have any questions or concerns, please feel free to contact our customer support team at ##*${EnvConfig.mail.suppportMail}##.`,
};

export const kDisbursementInfoNBFC = {
  title: 'Disbursement initiated',
  info: `Dear Customer, we’re pleased to inform you that the disbursement of your loan has been initiated. You should expect to receive the loan amount in your bank account within 24 hours. If you have any questions or concerns, please contact our customer support team at ##*${EnvConfig.mail.suppportMail}##. Thank you for choosing ${EnvConfig.nbfc.nbfcCamelCaseName}.`,
};

export const kESignPendingInfo = {
  title: 'E-Sign pending',
  info: 'Complete your E-Sign process to get the loan amount disbursed into your bank account.',
};
export const kProfilePhotoInfo = {
  title: 'Upload profile photo',
  info: 'Please capture your profile photo to continue with the loan application.',
};
// Forbidden
export const kDevReqProhibited =
  'Development execution is prohibited in production';

// Transaction
export const kFullPay = 'FULLPAY';
export const kEMIPay = 'EMIPAY';
export const kPartPay = 'PARTPAY';
export const kDirectBankPay =
  EnvConfig.nbfc.nbfcType === '0' ? 'ICICI DIRECT' : 'YES-8662';
export const kSplitRefundable = 'SPLITTED_REFUNDABLE';

// Legal suitFiled statuses
export const kLegalProcess = 'LEGAL_PROCESS';
/// banner urls
export const bCommonRatesURL =
  'https://storage.googleapis.com/backend_static_stuff/Common-rates.png';
export const bDueRatesURL =
  'https://storage.googleapis.com/backend_static_stuff/1685427153492.png';
export const bMarketingBanners = [
  'https://storage.googleapis.com/backend_static_stuff/NonNBFC_Dashboard_v1.0.png',
  `https://storage.googleapis.com/${EnvConfig.gCloudAssets.cloudStaticBucketName}/${EnvConfig.gCloudAssets.marketingBannerImg}`,
];

export const bMarketingBannersForActiveLoanLsp = [
  'https://storage.googleapis.com/backend_static_stuff/upi%20banner.png',
];
export const bMarketingBannersForActiveLoanNBFC = [
  `https://storage.googleapis.com/${EnvConfig.gCloudAssets.cloudStaticBucketName}/${EnvConfig.gCloudAssets.marketingBannerActiveLoan}`,
];

// 3rd Parties
export const kCAMS = 'CAMS';
export const kOneMoney = 'ONE_MONEY';
export const kfinvu = 'FINVU';
export const kFinvuRequestConsentDiscription = 'Periodic Bank Statement Fetch';
export const kFinvuRequestConsentTemplateName = 'BANK_STATEMENT_PERIODIC';
//bank list
export const kNetBanking = 'NETBANKING';
export const kBankingPro = 'BANKING_PRO';

// Redirect
export const redirectKEmployment = { key: 'Employment' };
export const redirectKSalarySlip = { key: 'Salary slip' };
export const redirectKSalaryOrOffer = {
  key: 'Salary slip/Offer letter',
};
export const redirectKWorkMail = { key: 'Work mail', tempKey: 'WORKMAIL' };
export const redirectKBankStatement = {
  key: 'Bank statement',
  tempKey: 'BANK_STATEMENT_REJECT_REASON',
};
export const redirectKResidence = { key: 'Residence', tempKey: 'RESIDENCE' };
export const redirectKSelectLoanAmount = { key: 'Select loan amount' };
export const redirectKReference = { key: 'Reference', tempKey: 'CONTACT' };
export const kSubmitTheDetails = 'Submit the details for loan application';
export const kpleaseSubmitYourDetails =
  'Please submit your details to proceed with the loan application';
/// INSURANCE
export const kInsurance = 'INSURANCE';
export const kInsuranceRelationshipCode = 'INSURANCE_RELATIONSHIP_CODE';
export const kPleaseSelectValidNomineeRelationshipCode =
  'Please select a valid nominee relationship';
export const nomineeDetailsTag =
  'Correct nominee details are essential for a smooth insurance claim process';
export const kInsuranceTermCondition = EnvConfig.gCloudAssets.insuranceTncPdf;
export const healthPolicy = 'Health & Emi policy';
export const lojPolicy = 'Loss of job policy';

// Eligibility
export const kKeyScoreData = 'SCORE_DATA';
export const kNoActiveScoreFound =
  'There is no active score exists as per score data record !';

export class StrAdminAccess {
  static preDisbursementCRM = 'pre disbursement crm';
  static postDisbursementCRM = 'post disbursement crm';
  static delayUnpaidEMICRM = 'delay unpaid emi crm';
  static upcomingEMICRM = 'upcoming emi crm';
}

export const StrDefault = {
  customEmail: 'Custom Email',
  emailTitle: 'Email',
  notificationTitle: 'Notification',
};

export const kRuppe = '₹';
export const StrUserCategory = {
  lowRisk: 'Low risk',
  moderateRisk: 'Moderate risk',
  highRisk: 'High risk',
};

export const getSmsUuid = 'https://api.brevo.com/v3/smtp/emails?messageId=';
export const smsTrackURL = 'https://api.brevo.com/v3/smtp/emails/';
export const kReferralChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
export const kWithdrawalTag =
  'We have received your previous withdrawal request and it is currently being processed. The requested amount will be deposited into your linked account ##*XXXX*## within 24 hours. Thank you for your patience.';
export const kReferralLive = '2023-08-01T10:00:00.000Z';

// MSG91
export const Msg91Str = {
  autoFillKey: '/lK3gtKYX67',
};

// Error msgs
export const kErrorMsgs = {
  AA_CONSENT_REJECTED: 'You have rejected the account aggregator consent',
  INTERNAL_SERVER_ERROR: 'INTERNAL SERVER ERROR',
  LOAN_NOT_ACCEPTED: 'Loan is not accepted.',
  SERVICE_UNAVAILABLE: 'Service is unavailable, Please try after sometime',
  NAME_NOT_MATCHED_AS_AADHAAR:
    'The aadhaar name does not match as per name registered in the bank statement',
  SAME_DEVICE_LOAN_ACTIVE:
    "The device you're trying to use seems to have an active loan. To log in with a different number, please make sure to repay/complete the loan first. error code: ",
  LESS_FULLPAY_AMOUNT: 'Entered amount is less than the full pay amount!',
  GREATER_FULLPAY_AMOUNT: 'Entered amount is greater than the full pay amount!',
};
// Warning msgs
export const kWarningMsgs = {
  ROI_WORK_MAIL_SKIPPED:
    'Interest rate increased due to not verified work mail !!',
  ROI_DELAY_HISTORY: 'Interest rate increased due to delayed repayment !!',
};

export const iFramePromoCodeLink = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${EnvConfig.nbfc.nbfcName}</title></head><body><iframe src=##PAYMENT_URL## width="100%" style="border:0px solid black;height:100vh;"></iframe></body></html>`;

export const EMI_AMOUNT =
  '<div style="  background-color: rgba(69, 227, 228, 0.05);margin-top: 10px;min-width: 100%;border-bottom: 1px inset;"><table style="min-width: 100%; font-size: 12px; font-weight: bold"class="emi-table"><tbody><tr><td>EMI ##EMI_NUMBER## amount</td><td style="text-align: right">₹##EMI_AMOUNT##</td></tr><tr><td style="color: #737373">Penalty <span style="color: #ff4b52">@##PENALTY_DAYS## days</span></td><td style="text-align: right; color: #ff4b52">₹##PENALTY##</td></tr>##ECS##</tbody></table></div>';

export const EMI_AMOUT_NBFC =
  '<div style="background-color: #ffffff"><table style="min-width: 100%; font-size: 12px; font-weight: bold" class="emi-table"><tbody><tr><td>EMI ##EMI_NUMBER## amount</td><td style="text-align: right">₹##EMI_AMOUNT##</td></tr><tr><td style="color: #737373">Penalty <span style="color: #ff4b52">@##PENALTY_DAYS## days</span></td><td style="text-align: right; color: #ff4b52">₹##PENALTY##</td></tr>##ECS##</tbody></table><div style="border: 1px solid #b3b3b3; margin: 0 10px"></div></div>';

export const ECS_HTML =
  '<tr><td style="color: #737373">ECS bounce charge</td><td style="text-align: right; color: #ff4b52">₹##ECS_CHARGE##</td></tr>';
export const ECS_HTML_NBFC =
  '<tr><td style="color: #737373">ECS bounce charge</td><td style="text-align: right; color: #ff4b52">₹##ECS_CHARGE##</td></tr>';

export const EMI_AMOUNT_LSP = `<table style="width: 100%; font-size: 12px; line-height: 30px;"><tbody><tr style="text-align: center"><td style="text-align: left; padding-left: 20px;">EMI ##EMI_NUMBER## amount:</td><td style="text-align: right; padding-right: 20px; font-weight: bold;">₹##EMI_AMOUNT##</td></tr><tr style="text-align: center"><td style="text-align: left; padding-left: 30px;">Penalty @##PENALTY_DAYS## days</td><td style="text-align: right; padding-right: 20px; font-weight: bold;">₹##PENALTY##</td>##ECS##</tbody></table>`;

export const ECS_HTML_LSP = `<tr style="text-align: center"><td style="text-align: left; padding-left: 30px;">ECS bounce charges</td><td style="text-align: right; padding-right: 20px; font-weight: bold;">₹##ECS_CHARGE##</td></tr>`;

export const salaryMissingDetails = {
  USER_NOT_FOUND: 'User name not found',
  USER_NAME_MISMATCH: 'User name mismatch',
  COMPANY_NOT_FOUND: 'Company name not found',
  COMPANY_NAME_MISMATCH: 'Company name mismatch',
  PAY_AMOUNT_NOT_FOUND: 'Pay Amount not found',
  SALARY_PERIOD_NOT_FOUND: 'Salary Period not found',
  SALARY_PERIOD_NOT_VALID: 'Salary Period date is not valid',
};

export const NOCSubjectStr = `No objection certificate from ${EnvConfig.nbfc.nbfcName}`;

export const shareAppTextLsp = `Hi! I use ${EnvConfig.nbfc.appCamelCaseName} to get instant loans. Use this invitation from me to get your loan instantly and pay whenever you want.`;
export const shareAppTextNBFC = `Hi! I use ${EnvConfig.nbfc.nbfcCamelCaseName} to get instant loans. Use this invitation from me to get your loan instantly and pay whenever you want.`;
export const lspPlaystoreLink = `https://play.google.com/store/apps/details?id=com.fintech.lenditt`;
export const lspAppStoreLink = `https://apps.apple.com/in/app/lenditt-personal-loan-app/id1577363656`;
export const NBFCPlayStoreLink = EnvConfig.nbfc.nbfcPlaystoreLink;
export const NBFCAppStoreLink = EnvConfig.nbfc.nbfcAppLink;

// Add description in stepper of route details
export const kBeforeRegText =
  'Seamless registration experience, unlocking access with just a click.';
export const kBeforeKYCVerificationText =
  'Streamlined KYC verification, ensuring secure and compliant onboarding with ease.';
export const kBeforeEmploymentVerificationText =
  'Verify your employment by providing the Work email or salary slip.';
export const kBeforeSalaryVerificationText =
  'Verify your salary by providing the last four months of salary credits for loan eligibility.';
export const KBeforeResidenceVerificationText =
  'Verify your residence by providing your residence details.';
export const kBeforeEligiblityText = 'You are very close to getting the loan.';
export const kBeforeEMandateRegText =
  'Effortless E-Mandate setup for automated, secure, and hassle-free repayment of EMI’s.';
export const kBeforeESignText =
  'Sign your loan agreement digitally with ease, ensuring a seamless borrowing experience.';
export const kAfterESignText = 'E-Signed loan agreement successfully.';
export const kBeforeDisbursementText =
  'You are very close to getting the loan disbursement.';
export const kNotSalaried =
  'Thank you for your time and effort. Regrettably, this application is tailored for a professional salaried audience and may not align with your specific needs';
export const kComplyMessage = 'It will be verified against your bank statement';
export const kNotEligiblityText =
  'You are not eligible for a loan as per Our NBFC criteria. Please re-apply in the future. Thank you';
export const kCongratsText = 'Congratulations! ';
export const kLoanEligibleText = 'You can now avail loan up to ';
export const kEligibleLoanAmount = '₹ 50,000';
export const kNewEligibleLoanAmount = '₹ 1 Lakh';
export const kNewEligibleLoanAmountUpto2Lac = '₹ 2 Lakh';
export const kEmailVerifiedSuccessfully = 'Email verified! 👌';
export const kEmailAlreadyVerified = 'Email already verified.';
export const kEmailOrSalaryOption =
  'You will require to verify either with work email or salary slip';
export const kVerificationLinkExpired = 'Verification link expired';
export const kEmailVerifySuccessMessage =
  'We have successfully verified your email address.';
export const kDateRangeLimit = 'Please enter date range of one month.';
export const kLoanAutoRejStr =
  'Your loan application is valid for 7 days \nAfter this period, it will be automatically rejected';

export const kLspNotSalaried =
  'Thank you for taking the time to apply. Currently, our application is designed specifically for salaried professionals. However, we are continuously working on expanding our services. Please check back in the future for updates that may better suit your needs.';

export const KLspComplyMessage =
  'Your salary will be verified through your bank statements.';

export const kLspSalaryModeError =
  'Unfortunately, you do not meet our NBFC criteria for a loan at this time. Please consider re-applying in the future. Thank you.';

// Augmont Details
export const kAugmontUrl = 'https://www.augmont.com';

// NBFC Details
export const kNbfcUrl = EnvConfig.url.nbfcWebUrl;
export const CREDITANALYST = '4';
export const kAssignmentSuccessMessage = 'Verification assigned successfully.';
export const nbfcInfoStr = `<b> ${EnvConfig.nbfc.nbfcName} / </b> NBFC registration number:<b>${EnvConfig.nbfc.nbfcRegistrationNumber}</b>`;
export const kNbfcRegisterationNo = EnvConfig.nbfc.nbfcRegistrationNumber;
export const kCryptography = EnvConfig.database.cryptographyLsp;
export const kUpArrowURL =
  'https://storage.googleapis.com/backend_static_stuff/1675690313280.png';
export const kDownArrowURL =
  'https://storage.googleapis.com/backend_static_stuff/1675690305293.png';

export const kLspLogo = EnvConfig.lsp.url.lspLogo;
export const kLspTermAndCondition = EnvConfig.lsp.url.lspTermAndConditionLink;
export const kLspPrivacyPolicy = EnvConfig.lsp.url.lspPrivacyPolicyLink;
export const KLspSupportMail = EnvConfig.lsp.mail.lspSuppportMail;
export const kLspNoReplyMail = EnvConfig.lsp.mail.lspNoReplyMail;
export const klspCollectionMail = EnvConfig.lsp.mail.lspCollectionMail;
export const klspLegalMail = EnvConfig.lsp.mail.lspLegalMail;
export const kLSPFromName = EnvConfig.lsp.LSPFromName;
export const kLspHelpContactBeforeDisbursement =
  EnvConfig.lsp.number.lsphelpContactBeforeDisbursement;
export const kLspHelpContactAfterDisbursement =
  EnvConfig.lsp.number.lsphelpContactAfterDisbursement;
export const kNbfcTermAndCondition = EnvConfig.permissionsLink.nbfc[1];
export const kNbfcPrivacyPolicy = EnvConfig.permissionsLink.nbfc[2];

export const kUserCallRemark = 'Connection to customer....';

export const kCallDetailsNotFound = 'Call record not found';
export const kIncommingCall = 'Incomming Call....';
