import { gIsPROD, templateDesign } from './globals';

export const kMediaImages = 'mediaImages';
export const kFrameImages = 'capturedFrames';
export const kResidenceDocs = 'residenceProof';
export const kLegalNoticeDocs = gIsPROD ? 'legalNotice' : 'uatLegalNotice';
export const ktempLegalNoticeDocs = 'tempLegalNotice';
export const kAadhaarImagesfront = 'aadhaarImagesfront';
export const kAadhaarImagesback = 'aadhaarImagesback';
export const kPanImages = 'panImages';
export const kOtherDocumentImagesfront = 'otherDocumentImagesfront';
export const kOtherDocumentImagesback = 'otherDocumentImagesback';
export const kCibilScore = 'cibilScore';
export const kStamp = 'stamp';
export const kTempAgreement = 'tempAgreement';
export const kBanking = 'banking';
/// any time delete compress bucket in google colud
export const kCompress = 'compress';
/// local store
export const kPromiseToPayTemplate = `upload/templateDesign##templateDesignNumber##/templates/promiseToPay.html`;
export const kMandateTemplatePath = `upload/templateDesign##templateDesignNumber##/templates/mandate_invitation.html`;
export const kESignTemplate = `upload/templateDesign##templateDesignNumber##/templates/eSign_invitation.html`;
export const kEmailOTPTemplate = `upload/templateDesign##templateDesignNumber##/templates/email_otp.html`;
export const kAdminEmailOTPTemplatePath = `upload/templateDesign${templateDesign}/templates/email_otp_admin_nbfc.html`;
export const kOverDueTemplatePath = `upload/templateDesign##templateDesignNumber##/templates/overDueLoan.html`;
export const KBlankPDFUrl = './upload/legal/tmp/blank.PDF';
export const kNocPath = 'upload';
export const kEmailRefundTemplatePath = `upload/templateDesign##templateDesignNumber##/templates/refund-process.html`;
export const kEmailPaymentReminder = `upload/templateDesign##templateDesignNumber##/templates/paymentReminder.html`;
export const kEmailPaymentReminderCRM = `upload/templateDesign##templateDesignNumber##/templates/crm/payment_reminder.html`;
export const kEmailEligibleInterestPath = `upload/templateDesign##templateDesignNumber##/templates/eligible_interest_temp.html`;
export const kpenaltyWaivePromo = `upload/templateDesign##templateDesignNumber##/templates/penalty_waive_off_promo_code.html`;
export const kDatabasePerformanceTemplatePath = `upload/templateDesign${templateDesign}/templates/databasePerformance.html`;
export const kloanApprovalTemplate = `upload/templateDesign##templateDesignNumber##/templates/loan_approved.html`;
export const kVerificationEmail = `upload/templateDesign##templateDesignNumber##/templates/verification_email.html`;
export const kNetBankingNotify = `upload/templateDesign${templateDesign}/templates/NetBankingNotify.html`;
export const kMismatchedEmiCreation = `upload/templateDesign${templateDesign}/templates/mismatchedEmiCreation.html`;
export const kDemandLetterMail = `upload/templateDesign##templateDesignNumber##/demand-letter/demand-letter-mail.html`;
export const kDemandLetter1Mail = `upload/templateDesign${templateDesign}/demand-letter/demand-letter-1.html`;
export const kDemandLetter2Mail = `upload/templateDesign${templateDesign}/demand-letter/demand-letter-2.html`;

export const kLegalMailFormate = `upload/templateDesign##templateDesignNumber##/legal/legal-mail-formate.html`;
export const kSummonsMailFormate = `upload/templateDesign##templateDesignNumber##/legal/summons.mail.formate.html`;
export const kSummonsWarrant = `upload/templateDesign##templateDesignNumber##/legal/summons_warrant.html`;
export const kWarrantMail = `upload/templateDesign##templateDesignNumber##/legal/warrent-mail.html`;
export const kTriggerMailFormate = `upload/templateDesign${templateDesign}/legal/trigger.mail.formate.html`;
export const kQueryFail = `upload/templateDesign${templateDesign}/templates/query_fail.html`;
export const kUnclosedLoanEmi = `upload/templateDesign${templateDesign}/templates/unclosed_loan_emi.html`;
export const kTaxInvoice = `upload/templateDesign${templateDesign}/Tax invoice/Tax invoice.html`;
export const kZoopESign = `upload/templateDesign${templateDesign}/zoop/zoop_esign.html`;
export const kLoanRejected = `upload/templateDesign##templateDesignNumber##/templates/loan_rejected.html`;
export const kTransactionRedirect = `upload/templateDesign${templateDesign}/templates/payments/transaction_redirect.html`;
export const kTransactionSuccess = 'upload/templateDesign1/templates/payment_success.html';
export const kTransactionFailed = 'upload/templateDesign1/templates/payment_failed.html';
export const kMailBodyNoc = `upload/templateDesign##templateDesignNumber##/templates/mailBodyNOC.html`;

export const kESignProcessingPath = `upload/templateDesign${templateDesign}/templates/esign-formate/esign_processing.html`;
export const kKeyFactStatementPath = `upload/templateDesign${templateDesign}/agreement/KFS_02.hbs`;
export const kLedgerStatementPath1 = `upload/templateDesign${templateDesign}/ledger/ledger-1.hbs`;
export const kLedgerStatementPath2 = `upload/templateDesign${templateDesign}/ledger/ledger-2.hbs`;
export const kOntimeNocPath = `upload/templateDesign${templateDesign}/templates/onTime.html`;
export const KSettleNocPath = `upload/templateDesign${templateDesign}/templates/settleNOC.html`;
export const kUpcomingPenalChanges = `upload/templateDesign${templateDesign}/templates/upcoming-penal-charges.html`;

export const kSettlementLoan = `upload/templateDesign##templateDesignNumber##/templates/loan-settlement.html`;
export const kLoanClosure = `upload/templateDesign##templateDesignNumber##/templates/loan-closure-offer.html`;
//daily report to management template
export const tDailyReportCollectionTemplate = `upload/templateDesign${templateDesign}/templates/daily-report-collection.hbs`;
export const tDailyReportManagementTemplate = `upload/templateDesign${templateDesign}/templates/daily-report-management.hbs`;
export const tDailyRegistrationReportTemplate = `upload/templateDesign${templateDesign}/templates/daily-report-registration.hbs`;
export const tLegalFormatePath = `upload/templateDesign${templateDesign}/legal/legal_notice_1.hbs`;
export const kSummonsWarrantLokAdalat = `upload/templateDesign##templateDesignNumber##/legal/summons_warrant_lok_adalat.html`;
// Cloud store
export const kLegalWarrantIcon =
  'https://storage.googleapis.com/backend_static_stuff/warrent.gif';
export const kLegalSummonsIcon =
  'https://storage.googleapis.com/backend_static_stuff/Summons.gif';
export const kLegalDemandLetterIcon =
  'https://storage.googleapis.com/backend_static_stuff/Demand%20draft.gif';
export const kLegalNoticeIcon =
  'https://storage.googleapis.com/backend_static_stuff/Notice.gif';
// LCR report to management
export const tLCRReportToManagementTemplate = `upload/templateDesign${templateDesign}/templates/LCR_Report.hbs`;
