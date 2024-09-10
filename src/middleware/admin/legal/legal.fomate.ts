import { Injectable } from '@nestjs/common';
import {
  razorPay,
  nextChar,
  LEGAL_SIGN,
  demandLetterSubject,
  DEMAND_STATUS,
  LEGAL_STATUS,
  CASE_INPROGRESS,
  notSent,
  sentStatusObj,
  CASE_TOBE_FILE,
  CASE_FILLED,
  SUMMONS,
  WARRENT,
  CASE_WITHDRAWAL,
  CASE_DISPOSAL,
  PAID_LEGAL,
  CASE_ASSIGN,
  CASE_TOBE_FILE_DAYS,
  CASE_INPROGRESS_DAYS,
  SIGNDESK,
  BREW_SITE_LOG,
  MAIL_TRACK_LINK,
  LEGEL_PHONE_NUMBER,
  BELOW_OUTSTANDING_AMOUNT,
  templateDesign,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import {
  NBFCAppStoreLink,
  NBFCPlayStoreLink,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kLegalMail,
  kLegalNumber,
  kLegalProcess,
  kNBFCLegalMailForAttachment,
  kRazorpay,
  klspLegalMail,
  lspAppStoreLink,
  lspPlaystoreLink,
} from 'src/constants/strings';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import * as fs from 'fs';
import {
  kGetCashfreePayment,
  kGetRazorpayPayment,
  kGetSigndeskPayment,
} from 'src/constants/network';
import {
  kDemandLetterMail,
  kLegalMailFormate,
  kSummonsMailFormate,
  kWarrantMail,
  tLegalFormatePath,
} from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
import { CommonSharedService } from 'src/shared/common.shared.service';

@Injectable()
export class LegalFormateService {
  constructor(
    private readonly fileService: FileService,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly sharedCommonService: CommonSharedService,
  ) {}

  async prepareDemandLetter(tran, page1, page2) {
    try {
      //get current data
      const emi = tran.emiData;
      const userData = tran.userData;
      const kycData = userData.kycData;
      const loanData = tran.loanData;
      const currentDate = new Date();
      const eSignData = loanData.eSignData;
      const appType = loanData?.appType;
      const appName = appType == 1 ? kInfoBrandNameNBFC : kInfoBrandName;
      const playStoreLink = appType == 1 ? NBFCPlayStoreLink : lspPlaystoreLink;
      const appStoreLink = appType == 1 ? NBFCAppStoreLink : lspAppStoreLink;
      //convert into readable formate
      const today = this.typeService.getDateFormatted(currentDate);
      let aadhaarAddress = kycData.aadhaarAddress;
      const aggrementDate = eSignData
        ? this.typeService.getDateFormatted(eSignData.createdAt)
        : today;
      try {
        aadhaarAddress = JSON.parse(aadhaarAddress);
      } catch (err) {}
      let city = aadhaarAddress?.dist ?? '-';
      let address = this.typeService.addressFormat(aadhaarAddress);
      let emiAmount =
        (emi?.principalCovered ?? 0) +
        (emi?.interestCalculate ?? 0) -
        (emi?.paid_principal ?? 0) -
        (emi?.paid_interest ?? 0) +
        (emi?.penalty ?? 0) +
        (emi?.regInterestAmount ?? 0) -
        (emi?.paidRegInterestAmount ?? 0) +
        (emi?.bounceCharge ?? 0) +
        (emi?.gstOnBounceCharge ?? 0) -
        (emi?.paidBounceCharge ?? 0) +
        (emi?.dpdAmount ?? 0) +
        (emi?.penaltyChargesGST ?? 0) -
        (emi?.paidPenalCharge ?? 0) +
        (emi?.legalCharge ?? 0) +
        (emi?.legalChargeGST ?? 0) -
        (emi?.paidLegalCharge ?? 0);
      page1 = page1.replace('##CURRENT_DATE##', today);
      //create demand letter
      page1 = page1.replace('##EMI_NUMBER##', emi.emiNumber);
      page1 = page1.replace(
        '##NBFCREGISTRATIONNUMBER##',
        EnvConfig.nbfc.nbfcRegistrationNumber,
      );
      page1 = page1.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
      page1 = page1.replace('##CINNO##', EnvConfig.nbfc.nbfcCINNumber);
      page1 = this.replaceAll(page1, '##USERNAME##', userData.fullName);
      page1 = page1.replace('##ADDRESS##', address);
      page1 = page1.replace('##LOANID##', loanData.id);
      page1 = page1.replace('##CITY##', city);
      page1 = page1.replace(
        '##PHONE##',
        this.cryptService.decryptPhone(userData.phone),
      );
      page1 = page1.replace('##EMAIL##', userData.email);
      page1 = page1.replace('##PAN_NUMBER##', kycData.panCardNumber);
      page1 = page1.replace(
        '##LOAN_AMOUNT##',
        this.typeService.numberRoundWithCommas(loanData.netApprovedAmount),
      );
      page1 = page1.replace('##DURATION##', loanData.approvedDuration);
      page1 = page1.replace('##AGGREEMENT_CREATEDATE##', aggrementDate);
      page1 = page1.replace('##COMPANY_PHONE##', LEGEL_PHONE_NUMBER);

      page1 = page1.replace('##COMPANY_EMAIL##', kNBFCLegalMailForAttachment);

      page1 = page1.replace(
        '##EMI_DATE##',
        this.typeService.getDateFormatted(emi.emi_date),
      );
      emiAmount = this.typeService.numberRoundWithCommas(+emiAmount);
      page1 = page1.replace('##EMI_AMOUNT##', emiAmount);
      page1 = page1.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
      page1 = page1.replace('##APPNAME##', appName);
      page1 = page1.replace('##NBFCADDRESS##', EnvConfig.nbfc.nbfcAddress);
      //page no 2
      page2 = page2.replace('##CURRENT_DATE##', today);
      page2 = page2.replace('##PLAYSTORELINK##', playStoreLink);
      page2 = page2.replace('##APPSTORELINK##', appStoreLink);
      page2 = page2.replace(
        '##NBFCREGISTRATIONNUMBER##',
        EnvConfig.nbfc.nbfcRegistrationNumber,
      );
      page2 = page2.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
      page2 = page2.replace('##CINNO##', EnvConfig.nbfc.nbfcCINNumber);
      page2 = page2.replace('##NBFCADDRESS##', EnvConfig.nbfc.nbfcAddress);
      return [page1, page2];
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  //prepare legal formate data to create legal data
  async prepareLegalFormate(data, source: string = null) {
    try {
      //get all user datat
      const userData = data.registeredUsers;
      const kycData = userData.kycData;
      //gett all emi data
      const emiData = data.unpaidEmi;
      //adovate data tobe created
      const advocateData = data?.advocateData;
      const signature_image = advocateData?.otherData?.signature_image;
      const advocateAddress = advocateData?.otherData?.address ?? '';
      const enrollment = advocateData?.otherData?.enrollmentNo;
      const esingData = data?.eSignData;
      const failedAutodebit = data?.fullPayAutodebit;
      const disbursementData = data.disbursementData;
      const appType = data?.appType;
      //disubrsement type and mode
      const disMode =
        disbursementData.mode == razorPay || !disbursementData?.mode
          ? 'RAZORPAYX'
          : disbursementData.mode;

      const createDate = this.typeService.getDateFormatted(
        failedAutodebit.subscriptionDate,
      );

      const aggrementDate = this.typeService.getDateFormatted(
        esingData.createdAt,
      );
      const netApprovedAmount = +(data?.netApprovedAmount ?? 0);
      let aadhaarAddress = kycData.aadhaarAddress;
      try {
        aadhaarAddress = JSON.parse(aadhaarAddress);
      } catch (err) {}
      let address = this.typeService.addressFormat(aadhaarAddress);
      const repaymentData: any = this.prepareRepaymentEmiText(emiData);
      if (repaymentData.message) return kInternalError;
      const emiAutodebitFailedRes: any = this.autodebitFailedEmiDateText(
        emiData,
        failedAutodebit,
      );
      if (emiAutodebitFailedRes.message) return kInternalError;
      const totalOutStandingAmount: any = this.calcDueAmount(emiData);

      if (totalOutStandingAmount.message) return kInternalError;
      const totalOutStanding = Math.round(
        totalOutStandingAmount.expectedAmount,
      );
      const passData = {
        nbfcName: EnvConfig.nbfc.nbfcName,
        legalNumber: EnvConfig.number.legalNumber,
        //advocate details
        adv_phone: await this.cryptService.decryptText(
          advocateData?.phone ?? '',
        ),
        adv_email: kNBFCLegalMailForAttachment,
        adv_enr_no: enrollment,
        adv_name: advocateData?.fullName?.toUpperCase(),
        adv_address: advocateAddress,
        //legal created date
        autodebit_failedDate: createDate,
        //user details
        userName: userData.fullName,
        aadhaarAddress: address,
        panNumber: kycData.panCardNumber,
        userEmail: userData.email,
        userPhone: this.cryptService.decryptPhone(userData.phone),
        loanId: data.id,
        loanApprovedAmount: netApprovedAmount,
        loanApprovedAmountWords:
          this.typeService.getAmountInWords(netApprovedAmount),
        dis_mode: disMode,
        dis_bank_utr: disbursementData?.utr,
        bankName: disbursementData?.bank_name,
        accountNumber: disbursementData?.account_number,
        ifcsCode: disbursementData.ifsc,
        agreementDate: aggrementDate,
        duration: data.approvedDuration,
        emiData: repaymentData,
        failedEmiDate: emiAutodebitFailedRes.failedEmiText,
        failedAutodebitText: emiAutodebitFailedRes.autoDebitFailedResponse,
        autodebitAmount: emiAutodebitFailedRes?.amount,
        autodebitAmountWords: this.typeService.getAmountInWords(
          emiAutodebitFailedRes?.amount,
        ),
        totalOutStanding,
        totalOutStandingWords:
          this.typeService.getAmountInWords(totalOutStanding),
        legal_sing: LEGAL_SIGN,
        adv_sign: signature_image,
        appName:
          appType == 1
            ? kInfoBrandNameNBFC.toUpperCase()
            : kInfoBrandName.toUpperCase(),
        nbfcAddress: EnvConfig.nbfc.nbfcAddress,
      };
      const hbsData = await this.fileService.hbsHandlebars(
        tLegalFormatePath,
        passData,
        source,
      );
      if (hbsData === k500Error) return kInternalError;
      return { hbsData, passData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  private prepareRepaymentEmiText(emiData) {
    try {
      const repaymentArray = [];
      let count: any = 'a';
      emiData.forEach((emi) => {
        const emiAmount = Math.round(
          (emi?.principalCovered ?? 0) +
            (emi?.interestCalculate ?? 0) -
            (emi?.paid_principal ?? 0) -
            (emi?.paid_interest ?? 0) +
            (emi?.penalty ?? 0) +
            (emi?.regInterestAmount ?? 0) -
            (emi?.paidRegInterestAmount ?? 0) +
            (emi?.bounceCharge ?? 0) +
            (emi?.gstOnBounceCharge ?? 0) -
            (emi?.paidBounceCharge ?? 0) +
            (emi?.dpdAmount ?? 0) +
            (emi?.penaltyChargesGST ?? 0) -
            (emi?.paidPenalCharge ?? 0) +
            (emi?.legalCharge ?? 0) +
            (emi?.legalChargeGST ?? 0) -
            (emi?.paidLegalCharge ?? 0),
        );
        const emiNumber =
          emi.emiNumber == 1
            ? 'First'
            : emi.emiNumber == 2
            ? 'Second'
            : emi.emiNumber == 3
            ? 'Third'
            : 'Fourth';

        const passData = {
          title: count,
          emiNumber: emiNumber,
          emiAmount,
          emiAmountWords: this.typeService.getAmountInWords(emiAmount),
          emi_date: this.typeService.getDateFormatted(emi.emi_date),
        };
        count = nextChar(count);
        repaymentArray.push(passData);
      });
      return repaymentArray;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  private autodebitFailedEmiDateText(emiData, autodebit) {
    try {
      let emiDates = emiData.map((ele) =>
        this.typeService.getDateFormatted(ele.emi_date),
      );
      const response = JSON.parse(autodebit?.response ?? '');
      const amount = autodebit.paidAmount;
      const autoDebitFailedResponse =
        response?.payment?.failureReason ??
        response.error_description ??
        response?.error_reason ??
        response?.error_message ??
        '-';
      return {
        failedEmiText: emiDates.join(' and '),
        autoDebitFailedResponse,
        amount,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  calcDueAmount(emiData) {
    const passData = {
      expectedAmount: 0,
    };
    try {
      //calculate all the amount for required
      if (!Array.isArray(emiData)) emiData = [emiData];
      for (let i = 0; i < emiData.length; i++) {
        try {
          const emi = emiData[i];
          const totalExpectedAmount =
            (emi?.principalCovered ?? 0) +
            (emi?.interestCalculate ?? 0) -
            (emi?.paid_principal ?? 0) -
            (emi?.paid_interest ?? 0) +
            (emi?.penalty ?? 0) +
            (emi?.regInterestAmount ?? 0) -
            (emi?.paidRegInterestAmount ?? 0) +
            (emi?.bounceCharge ?? 0) +
            (emi?.gstOnBounceCharge ?? 0) -
            (emi?.paidBounceCharge ?? 0) +
            (emi?.dpdAmount ?? 0) +
            (emi?.penaltyChargesGST ?? 0) -
            (emi?.paidPenalCharge ?? 0) +
            (emi?.legalCharge ?? 0) +
            (emi?.legalChargeGST ?? 0) -
            (emi?.paidLegalCharge ?? 0);
          passData.expectedAmount += +totalExpectedAmount.toFixed(2);
        } catch (error) {}
      }
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //both legal and demand formate prepared here
  async prepareMailFormate(passData) {
    try {
      let path;
      // const appType = passData?.loanData?.appType;
      const appType = +templateDesign;
      if (passData.type == DEMAND_STATUS) {
        path = await this.sharedCommonService.getEmailTemplatePath(
          kDemandLetterMail,
          appType,
          null,
          null,
        );
      } else if (passData.type == LEGAL_STATUS) {
        path = await this.sharedCommonService.getEmailTemplatePath(
          kLegalMailFormate,
          appType,
          null,
          null,
        );
      } else if (passData.type == SUMMONS) {
        path = await this.sharedCommonService.getEmailTemplatePath(
          kSummonsMailFormate,
          appType,
          null,
          null,
        );
      } else if (passData.type == WARRENT) {
        path = await this.sharedCommonService.getEmailTemplatePath(
          kWarrantMail,
          appType,
          null,
          null,
        );
      }
      let htmlData = fs.readFileSync(path, 'utf-8');
      const currentDate = new Date();
      //get current date
      const userData = passData.userData;
      let city = 'Ahmedabad';
      let state = 'Gujarat';

      const loanData = passData.loanData;
      let disbursementDate = loanData?.loan_disbursement_date;
      disbursementDate = this.typeService.getDateFormatted(disbursementDate);
      const appName =
        appType == 1
          ? kInfoBrandNameNBFC.toUpperCase()
          : kInfoBrandName.toUpperCase();
      htmlData = htmlData.replace(/##USERNAME##/g, userData.fullName);
      const notMatch = [SUMMONS, WARRENT];
      if (!notMatch.includes(+passData.type)) {
        const today = this.typeService.getDateFormatted(currentDate);
        const followerData = loanData.followerData;
        const transactionData: any = loanData?.transactionData ?? [];
        //full pay autodebit data
        const fullPayData = transactionData.find(
          (ele) => ele.id == passData.transactionId,
        );
        const response = JSON.parse(fullPayData?.response ?? '{}');
        //placed amount and reason
        const amount = fullPayData?.paidAmount ?? 0;
        const autoDebitFailedResponse =
          response?.payment?.failureReason ??
          response.error_description ??
          response?.error_reason ??
          response?.error_message ??
          'Balance Insufficient';

        let companyPhone = followerData?.companyPhone;
        let phone = followerData?.phone;
        if (companyPhone)
          companyPhone = await this.cryptService.decryptText(companyPhone);
        phone = await this.cryptService.decryptText(phone);

        const disbursementData = (loanData?.disbursementData ?? [])[0];
        const emiData = passData.emiData;
        const subType = passData.subType;
        const emiAmount =
          (emiData?.principalCovered ?? 0) +
          (emiData?.interestCalculate ?? 0) -
          (emiData?.paid_principal ?? 0) -
          (emiData?.paid_interest ?? 0) +
          (emiData?.penalty ?? 0) +
          (emiData?.regInterestAmount ?? 0) -
          (emiData?.paidRegInterestAmount ?? 0) +
          (emiData?.bounceCharge ?? 0) +
          (emiData?.gstOnBounceCharge ?? 0) -
          (emiData?.paidBounceCharge ?? 0) +
          (emiData?.dpdAmount ?? 0) +
          (emiData?.penaltyChargesGST ?? 0) -
          (emiData?.paidPenalCharge ?? 0) +
          (emiData?.legalCharge ?? 0) +
          (emiData?.legalChargeGST ?? 0) -
          (emiData?.paidLegalCharge ?? 0);
        //create demand letter
        htmlData = htmlData.replace('##CURRENT_DATE##', today);
        htmlData = htmlData.replace(
          '##DUE_AMOUNT##',
          this.typeService.numberRoundWithCommas(+emiAmount),
        );
        htmlData = htmlData.replace(
          '##EMI_DUE_DATE##',
          this.typeService.getDateFormatted(emiData?.emi_date),
        );

        let companyPhoneText = '';
        if (companyPhone && companyPhone != phone)
          companyPhoneText += `${companyPhone}/`;
        if (phone) companyPhoneText += phone.toString();

        htmlData = this.replaceAll(
          htmlData,
          '##COMPANY_PHONE##',
          LEGEL_PHONE_NUMBER,
        );
        htmlData = htmlData.replace(/##EMI_TYPE##/g, subType);
        //common to legal and demand
        htmlData = htmlData.replace('##LOANID##', loanData?.id ?? '-');
        htmlData = htmlData.replace(
          '##DISBUREMENT_ACCOUNT##',
          disbursementData.account_number ?? '-',
        );
        htmlData = htmlData.replace(
          '##DISBURSED##',
          this.typeService.numberRoundWithCommas(disbursementData.amount / 100),
        );
        htmlData = htmlData.replace(
          '##BANK##',
          disbursementData?.bank_name ?? '',
        );
        htmlData = htmlData.replace('##UTR##', disbursementData?.utr ?? '');
        htmlData = htmlData.replace(
          '##FULLPAYDATE##',
          this.typeService.getDateFormatted(fullPayData?.subscriptionDate),
        );
        htmlData = htmlData.replace('##FAILREASON##', autoDebitFailedResponse);
        htmlData = htmlData.replace(
          '##FULLPAY##',
          this.typeService.numberRoundWithCommas(+amount.toFixed(2)),
        );
        htmlData = htmlData.replace(
          '##NETAPPROVEDAMOUNT##',
          this.typeService.numberRoundWithCommas(loanData?.netApprovedAmount),
        );
      } else if (passData.type == WARRENT) {
        htmlData = htmlData.replace('##STATE##', state);
        htmlData = htmlData.replace('##CITY##', city);
        htmlData = this.prepareWarrentCaseHtml(htmlData, passData?.caseDetails);
      }
      htmlData = htmlData.replace(
        '##LEGALNUMBER##',
        EnvConfig.number.legalNumber,
      );
      if (appType == 0)
        htmlData = htmlData.replace(/##APPLEGALMAIL##/g, klspLegalMail);
      else htmlData = htmlData.replace(/##APPLEGALMAIL##/g, kLegalMail);

      htmlData = htmlData.replace(/##MAIL##/g, kLegalMail);
      htmlData = this.replaceAll(htmlData, '##LEGALNUMBER##', kLegalNumber);
      htmlData = this.replaceAll(
        htmlData,
        '##NBFCNAME##',
        EnvConfig.nbfc.nbfcName,
      );
      htmlData = htmlData.replace(
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      htmlData = htmlData.replace('##DISBURSEMENTDATE##', disbursementDate);
      htmlData = htmlData.replace('##APPNAME##', appName);
      htmlData = this.replaceAll(htmlData, '##NBFC##', EnvConfig.nbfc.nbfcName);
      htmlData = this.replaceAll(
        htmlData,
        '##COLLECTIONNUMBER##',
        EnvConfig.number.collectionNumber,
      );
      let fileName = 'demand-letter.pdf';
      if (passData.type == LEGAL_STATUS) fileName = 'Legal-notice.pdf';
      else if (passData.type == SUMMONS) fileName = 'Summons.pdf';
      let attechments = [];
      if (passData.type != WARRENT)
        attechments = [
          {
            filename: fileName,
            path: passData.url,
            contentType: 'application/pdf',
          },
        ];
      let subject;
      //subType==1...3(emi-1..3) and 4=FULLPAY
      if (passData.type == DEMAND_STATUS) {
        if (passData.subType < 4)
          subject = demandLetterSubject.replace(
            '##EMI_TYPE##',
            `EMI-${passData.subType}`,
          );
        else if (passData.subType == 4)
          subject = demandLetterSubject.replace('##EMI_TYPE##', `FULLPAY`);
      } else if (passData.type == LEGAL_STATUS) subject = 'Legal Notice';
      else if (passData.type == SUMMONS)
        subject = `Urgent Action Required for ${userData.fullName}: Court Summons Issued for Overdue Loan`;
      else if (passData.type == WARRENT)
        subject = `BAILABLE WARRANT ISSUED FOR: ${userData.fullName}`;
      return { htmlData, subject, attechments };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  prepareWarrentCaseHtml(htmlData, caseDetails) {
    try {
      htmlData = htmlData.replace('##CCNUMBER##', caseDetails?.ccNumber ?? '');
      htmlData = htmlData.replace('##COURT##', caseDetails?.courtName ?? '');

      //Get year from ccNumber
      const ccNumber = caseDetails?.ccNumber ?? '';
      const cyear = ccNumber.substr(ccNumber.length - 4);
      htmlData = htmlData.replace('##YEAR##', cyear);

      // code commented due to crHearingDate is not required field for warrent
      // if (caseDetails?.crHearingDate) {
      //   const crYear = new Date(caseDetails.crHearingDate).getFullYear();
      //   htmlData = htmlData.replace('##YEAR##', crYear);
      // }
      return htmlData;
    } catch (error) {
      return htmlData;
    }
  }
  async prepareAllLegalData(data, type, allEmi, isAdvocate = false) {
    try {
      const finalData: any = [];

      for (let i = 0; i < data.length; i++) {
        try {
          //legal data
          const legal = data[i];
          const loanData = legal?.loanData;
          const subData = loanData?.subscriptionData;
          const followerData = loanData.followerData;
          const esingData = loanData?.eSignData;
          const disbursementData = loanData?.disbursementData;
          const disData = disbursementData;
          const transactionData = legal.loanData.transactionData ?? [];
          const userData = legal?.userData;
          const kycData = userData?.kycData;
          const trackingData = legal?.trackingData;
          const otherDetails = legal?.otherDetails ?? {};
          const workMailData = userData?.masterData?.workMailData;
          let isWorkMail =
            (workMailData?.status == '1' || workMailData?.status == '3') &&
            workMailData?.email;

          let subType = 'EMI';
          if (legal.subType && legal.subType < 4)
            subType = subType + '-' + legal.subType;
          else if (legal.subType == 4) subType = 'FULLPAY';
          let loanEmis = allEmi.filter((emi) => emi.loanId == legal.loanId);
          // const emiData = legal?.emiData ?? loanEmis;

          const dates = legal.dates;
          const advocateData = legal?.advocateData;
          const sentType = legal.sentType;
          const sentStatus = this.checkAllSentTypes(sentType);
          const emiData = loanEmis.find((emi) => emi.id == legal.emiId);
          const unpaidEmi = loanEmis.filter(
            (emi) => emi.payment_status == '0' && emi.payment_due_status == '1',
          );
          const calculation = await this.calcDueLegalAmount(
            loanData?.id,
            unpaidEmi,
            transactionData,
            legal.createdAt,
            type,
            legal.transactionId,
            loanEmis,
            subData,
          );
          const passData: any = {};
          passData['id'] = legal?.id;
          passData['Loan ID'] = loanData?.id;
          let letterColum = 'Document letter';
          if (type == DEMAND_STATUS) letterColum = 'Demand letter';
          else if (
            [
              LEGAL_STATUS,
              CASE_TOBE_FILE,
              CASE_INPROGRESS,
              CASE_FILLED,
            ].includes(type)
          )
            letterColum = 'Legal notice';
          else if (type == SUMMONS) letterColum = 'Summons';
          else if (type == WARRENT) letterColum = 'Warrent';
          else letterColum = 'Legal notice';
          if (
            type != CASE_WITHDRAWAL &&
            type != CASE_DISPOSAL &&
            type != PAID_LEGAL &&
            type != CASE_ASSIGN
          ) {
            passData[letterColum] = legal?.url ?? '-';
            passData['Loan agreement'] =
              esingData?.signed_document_upload ?? '-';
          }
          this.updateCreateColumnName(passData, type, legal.createdAt);

          passData['userId'] = legal?.userId;
          passData['Customer name'] = userData.fullName;
          passData['Email'] = userData.email;
          if (!isAdvocate)
            passData['Work mail'] = isWorkMail ? workMailData.email : '-';
          passData['Phone number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          passData['PAN number'] = kycData?.panCardNumber;
          passData['Aadhaar address'] = legal.address ?? '-';
          passData['City'] = legal?.city ?? '-';
          passData['Pincode'] = legal?.pincode ?? '-';
          passData['State'] = legal?.state ?? '-';
          passData['Loan tenure'] = loanData?.approvedDuration;
          passData['Disbursement date'] = this.typeService.getDateFormatted(
            loanData.loan_disbursement_date,
          );
          passData['Loan amount'] =
            this.typeService.numberRoundWithCommas(
              +loanData?.netApprovedAmount,
            ) ?? '-';
          passData['Loan status'] = loanData?.loanStatus ?? '-';
          if (
            type == CASE_WITHDRAWAL ||
            type == CASE_DISPOSAL ||
            type == PAID_LEGAL
          ) {
            passData['Total paid amount'] =
              this.typeService.numberRoundWithCommas(calculation?.totalPaid) ??
              '-';
            passData['Last payment date'] = calculation.lastPaymentDate;
          } else {
            if (!isAdvocate) {
              let noticeTypeCol = 'EMI number';
              if (DEMAND_STATUS != type) noticeTypeCol = 'Type';
              passData[noticeTypeCol] = subType ?? '-';
            }
          }
          if (
            type == DEMAND_STATUS ||
            type == LEGAL_STATUS ||
            type == CASE_TOBE_FILE ||
            type == CASE_INPROGRESS ||
            type == CASE_ASSIGN ||
            type == CASE_FILLED ||
            type == SUMMONS ||
            type == WARRENT
          ) {
            if (!isAdvocate)
              passData['As on due amount'] =
                this.typeService.numberRoundWithCommas(
                  calculation.expectedAmount,
                );
            if (type == CASE_ASSIGN) {
              passData['Principal and Interest'] =
                this.typeService.numberRoundWithCommas(calculation.totalEmiAmt);
              passData['Paid principal & Interest'] =
                this.typeService.numberRoundWithCommas(
                  calculation.totalPaidEmiAmt,
                );
              passData['Paid principal & Interest(%)'] = `${(
                +calculation?.percentage ?? 0
              ).toFixed(2)}%`;
            }

            if (type == DEMAND_STATUS) {
              passData['Due date'] = this.typeService.getDateFormatted(
                emiData.emi_date,
              );
              passData['Total penalty days'] = emiData?.penalty_days ?? 0;
            }
          }
          if (![PAID_LEGAL, CASE_WITHDRAWAL, CASE_DISPOSAL].includes(type)) {
            this.emiDetails(
              passData,
              transactionData,
              loanEmis,
              isAdvocate,
              subData,
              type,
            );
            this.calcPartpayment(passData, transactionData, loanEmis);
          }
          if (!isAdvocate)
            passData['Follower name'] = followerData?.fullName ?? '-';
          if (
            [
              CASE_INPROGRESS,
              CASE_FILLED,
              SUMMONS,
              WARRENT,
              CASE_WITHDRAWAL,
              CASE_DISPOSAL,
            ].includes(type)
          )
            this.caseFilledColumns(passData, legal);
          if (type != DEMAND_STATUS && !isAdvocate) {
            passData['Advocate name'] = advocateData?.fullName ?? '-';
            passData['Advocate phone'] = this.cryptService.decryptSyncText(
              advocateData?.phone ?? '',
            );
          }
          if (type == WARRENT)
            passData['Sent from'] = otherDetails?.isCourt
              ? 'Court'
              : advocateData?.fullName;
          if (
            type != CASE_WITHDRAWAL &&
            type != CASE_DISPOSAL &&
            type != PAID_LEGAL &&
            type != CASE_ASSIGN
          ) {
            passData['AD placed amount'] =
              this.typeService.numberRoundWithCommas(
                calculation.emiAutodebitAmount,
              );
            passData['AD placed date'] = calculation.autoDebitDate;
            passData['AD response date'] = calculation.autoDebitFailedDate;
            passData['AD source'] = calculation.autoDebitSource;

            passData['Auto-debit failed reason'] =
              calculation.autoDebitFailedResponse;
            passData['Auto-debit link'] = calculation.autodebitLink;
            if (!isAdvocate) {
              passData['Amount paid (before letter)'] =
                this.typeService.numberRoundWithCommas(
                  calculation.beforeDlLetterPayment,
                );
              passData['Amount paid (after letter)'] =
                this.typeService.numberRoundWithCommas(
                  calculation.afterDlLetterPayment,
                );
            }
            passData['Sent on email'] = sentStatus.email;
            passData['Email link'] = legal?.mailTrackData?.refrenceId
              ? MAIL_TRACK_LINK +
                legal?.mailTrackData?.refrenceId +
                `&email=${userData.email}`
              : '-';
            let emailTrackDate =
              dates.sendEmail != -1 ? dates?.sendEmail : dates.email;
            this.emailTrackDates(passData, sentType.email, emailTrackDate);
            if (!isAdvocate) {
              passData['Sent on work mail'] = sentStatus.workMail;
              let workMailTrackDate =
                dates.sendWorkMail != -1 ? dates.sendWorkMail : dates.workMail;
              this.emailTrackDates(
                passData,
                sentType.workMail,
                workMailTrackDate,
                true,
              );
            }
            if (!isAdvocate) {
              passData['Sent on WhatsApp'] = sentStatus.whatsApp;
              if (type != DEMAND_STATUS)
                passData['Sent physical'] = sentStatus.physical;
            }
          }
          if (
            !isAdvocate &&
            ![
              DEMAND_STATUS,
              CASE_WITHDRAWAL,
              CASE_DISPOSAL,
              CASE_ASSIGN,
            ].includes(type)
          )
            this.consignmentData(passData, trackingData, type);
          passData['Bank name'] = disData?.bank_name ?? '-';
          passData['Account number'] = disData?.account_number ?? '-';
          passData['IFSC'] = disData?.ifsc ?? '-';
          passData['Disbursement source'] = disData?.source ?? kRazorpay;
          passData['UTR number'] = disData?.utr ?? '-';
          if (!isAdvocate)
            passData['Days post letter sent'] = this.daysSince(dates?.email);
          if (type == LEGAL_STATUS) {
            if (dates?.email != -1) {
              let sentEmail =
                dates.sendEmail != -1 ? dates.sendEmail : dates.email;
              let readyForDate = new Date(sentEmail);
              readyForDate.setDate(
                readyForDate.getDate() + CASE_TOBE_FILE_DAYS,
              );
              passData['Ready for filing date'] =
                this.typeService.getDateFormatted(readyForDate);
            }
          }
          if (type == CASE_INPROGRESS || type == CASE_TOBE_FILE) {
            let moveInProgress = new Date(legal.createdAt);
            if (type == CASE_INPROGRESS)
              passData['Days in-progress queue'] =
                this.daysSince(moveInProgress);
            else {
              moveInProgress.setDate(
                moveInProgress.getDate() + CASE_INPROGRESS_DAYS,
              );
              passData['Last filing date'] =
                this.typeService.getDateFormatted(moveInProgress);
            }
          }

          if (type == SUMMONS)
            passData['Days summons received'] = this.daysSince(legal.createdAt);
          else if (type == WARRENT)
            passData['Days warrent received'] = this.daysSince(legal.createdAt);
          if (type == CASE_WITHDRAWAL) {
            passData['Days since payment received'] = this.daysSince(
              legal?.createdAt,
            );
          }
          //final obj pushed in list
          finalData.push(passData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  private calcPartpayment(passData, transactionData, loanEmisData) {
    try {
      const unpaidEmis = loanEmisData.filter(
        (emi) => emi.payment_status == '0' && emi.payment_due_status == '1',
      );
      const emiIds = unpaidEmis.map((emi) => emi.id);
      const recivedPartpaymentTran = transactionData.filter(
        (tran) =>
          emiIds.includes(tran.emiId) &&
          tran.status == 'COMPLETED' &&
          tran.type != 'REFUND',
      );
      const totalRecivedPartpayment = recivedPartpaymentTran.reduce(
        (prev, tran) => {
          return prev + (tran?.paidAmount ?? 0);
        },
        0,
      );
      passData['Recived partpayment'] = this.typeService.numberRoundWithCommas(
        totalRecivedPartpayment ?? 0,
      );
    } catch (error) {
      passData['Recived partpayment'] = 0;
    }
  }
  private updateCreateColumnName(passData, type, createdAt) {
    let formatedCreated = this.typeService.getDateFormatted(createdAt);
    try {
      let columnName = '';
      if (type == DEMAND_STATUS) columnName = 'Demand created date';
      else if (type == LEGAL_STATUS) columnName = 'Legal created date';
      else if (type == CASE_TOBE_FILE) columnName = 'Ready for filling date';
      else if (type == CASE_INPROGRESS) columnName = 'Case inprogress date';
      else if (type == CASE_FILLED) columnName = 'Case created date';
      else if (type == SUMMONS) columnName = 'Summons created date';
      else if (type == WARRENT) columnName = 'Warrant created date';
      else if (type == CASE_WITHDRAWAL) columnName = 'Case withdrawal date';
      else if (type == CASE_DISPOSAL) columnName = 'Case disposal date';
      else if (type == PAID_LEGAL) columnName = 'Paid date';
      else if (type == CASE_ASSIGN) columnName = 'Assign date';
      passData[columnName] = formatedCreated;
    } catch (error) {
      passData['Create date'] = formatedCreated;
    }
  }
  private emiDetails(
    passData,
    transactionData,
    emiData,
    isAdvocate = false,
    subData = null,
    legalType = null,
  ) {
    try {
      passData[`Emi 1 date`] = '-';
      passData[`Emi 1 amount`] = '-';
      passData[`Emi 1 penalty`] = '-';
      passData[`Emi 1 status`] = '-';
      passData[`Emi 1 AD-link`] = '-';

      passData[`Emi 2 date`] = '-';
      passData[`Emi 2 amount`] = '-';
      passData[`Emi 2 penalty`] = '-';
      passData[`Emi 2 status`] = '-';
      passData[`Emi 2 AD-link`] = '-';

      passData[`Emi 3 date`] = '-';
      passData[`Emi 3 amount`] = '-';
      passData[`Emi 3 penalty`] = '-';
      passData[`Emi 3 status`] = '-';
      passData[`Emi 3 AD-link`] = '-';

      passData[`Emi 4 date`] = '-';
      passData[`Emi 4 amount`] = '-';
      passData[`Emi 4 penalty`] = '-';
      passData[`Emi 4 status`] = '-';
      passData[`Emi 4 AD-link`] = '-';

      const faileAutodebitTransaction = transactionData.filter(
        (tran) =>
          (tran.source == 'AUTOPAY' || tran.subSource == 'AUTODEBIT') &&
          tran.status == 'FAILED' &&
          tran.type == 'EMIPAY',
      );
      transactionData = transactionData.filter(
        (tran) => tran.status == 'COMPLETED' && tran.type != 'REFUND',
      );
      emiData.sort((a, b) => a.id - b.id);
      emiData.forEach((emi) => {
        passData[`Emi ${emi.emiNumber} date`] =
          this.typeService.getDateFormatted(emi.emi_date);
        const emiAmount = +emi.principalCovered + +emi.interestCalculate;
        passData[`Emi ${emi.emiNumber} amount`] =
          this.typeService.numberRoundWithCommas(emiAmount);
        let transaction = transactionData.filter(
          (tran) => tran.emiId == emi.id,
        );
        let totalPaidPenalty = 0;
        transaction.forEach((tran) => {
          totalPaidPenalty += tran?.penaltyAmount ?? 0;
        });

        if (!isAdvocate)
          passData[`Emi ${emi.emiNumber} penalty`] =
            this.typeService.numberRoundWithCommas(
              emi?.penalty ?? 0 + totalPaidPenalty ?? 0,
            );

        if (
          emi.payment_status == '0' &&
          emi.payment_due_status == '1' &&
          legalType != CASE_ASSIGN
        ) {
          const emiAutodebit = faileAutodebitTransaction.find(
            (tran) => tran.emiId == emi.id,
          );
          const source = subData?.mode ?? SIGNDESK;
          if (emiAutodebit)
            passData[`Emi ${emi.emiNumber} AD-link`] = this.failedAutodebitLink(
              source,
              emiAutodebit,
            );
        }
        passData[`Emi ${emi.emiNumber} status`] =
          emi.payment_status == '1'
            ? 'PAID'
            : emi.payment_status == '0' && emi.payment_due_status == '1'
            ? 'UNPAID'
            : 'PENDING';
      });

      if (isAdvocate) {
        delete passData[`Emi 1 penalty`];
        delete passData[`Emi 2 penalty`];
        delete passData[`Emi 3 penalty`];
        delete passData[`Emi 4 penalty`];
      }
    } catch (error) {}
  }
  private setLink(data, type = 'EMAIL') {
    try {
      if (type == 'EMAIL') {
        let response = this.cryptService.decryptSyncText(data.response);
        response = JSON.parse(response);
        const uuids = (response?.uuids ?? [])[0];
        if (uuids) {
          return BREW_SITE_LOG + uuids;
        }
      }
      return '-';
    } catch (error) {
      return '-';
    }
  }
  private emailTrackDates(passData, mailStatus, dates, isWorkMail = false) {
    try {
      let allStatus = [1, 2, 3, 5, 6];
      let prefix = isWorkMail ? `Work email` : 'Email';
      let columnName = `${prefix} date`;
      if (allStatus.includes(mailStatus)) {
        let emailReceivedDate = dates;
        if (emailReceivedDate != -1) {
          emailReceivedDate = this.typeService.getDateFormatted(
            new Date(emailReceivedDate),
          );
          passData[columnName] = emailReceivedDate ?? '-';
        }
      } else passData[columnName] = '-';
    } catch (error) {}
  }
  private consignmentData(passData, trackingData, type) {
    try {
      let deliveredDate;
      let returnDate;
      const trackResponse = JSON.parse(
        trackingData?.legalNoticeTrackResponse ?? null,
      );
      if (trackResponse) {
        let res = trackResponse?.data[0];
        const lastDate = this.typeService.getDateFormatted(
          trackingData?.lastResponseDate,
        );
        if (trackingData.status == 'Complete')
          deliveredDate = res?.Date ?? lastDate;
        else if (trackingData.status == 'Return')
          returnDate = res?.Date ?? lastDate;
      }
      passData['RPAD date'] = trackingData?.createdAt
        ? this.typeService.getDateFormatted(trackingData?.createdAt)
        : '-';
      passData['RPAD number'] = trackingData?.consignmentNo ?? '-';
      passData['RPAD deliverd date'] = deliveredDate ?? '-';
      passData['RPAD return date'] = returnDate ?? '-';
    } catch (error) {}
  }

  private datesColumns(passData, legal, type) {
    try {
      let dates = legal.dates ?? {};
      let otherDetails = legal?.otherDetails;
      if ([SUMMONS, WARRENT].includes(type)) {
        const nextHearingDate = dates?.nextHearingDate ?? -1;
        const receivedDate = dates?.recivedDate ?? -1;
        const issueDate = dates?.issueDate ?? -1;
        passData['Next hearing date'] =
          nextHearingDate != -1 && nextHearingDate
            ? this.typeService.getDateFormatted(new Date(+nextHearingDate))
            : '-';
        let dateColumnsName = 'Received date';
        let isseueDateColumn = '';
        let numberOfIssue;
        let issueCount = otherDetails?.subType ?? 0;
        if (type == SUMMONS) {
          dateColumnsName = 'Summmon received';
          isseueDateColumn = 'Summons issue';
          numberOfIssue = 'Re-issue summons';
        } else if (type == WARRENT) {
          dateColumnsName = 'Warrent received';
          isseueDateColumn = 'Warrent issue';
          numberOfIssue = 'Re-issue warrent';
        }
        if (numberOfIssue) passData[numberOfIssue] = issueCount;
        passData[dateColumnsName] =
          receivedDate != -1 && receivedDate
            ? this.typeService.getDateFormatted(new Date(+receivedDate))
            : '-';
        passData[isseueDateColumn] =
          issueDate != -1 && issueDate
            ? this.typeService.getDateFormatted(new Date(+issueDate))
            : '-';
      }
    } catch (error) {}
  }
  private caseFilledColumns(passData, data) {
    try {
      const caseDetails = data?.caseDetails;

      if (data.type != CASE_DISPOSAL) {
        const firstHearingDate =
          caseDetails?.firstHearingDate != -1 && caseDetails?.firstHearingDate
            ? this.typeService.getDateFormatted(
                new Date(caseDetails?.firstHearingDate),
              )
            : '-';
        passData['Case filed date'] =
          caseDetails?.caseFiledDate != -1 && caseDetails?.caseFiledDate
            ? this.typeService.getDateFormatted(
                new Date(caseDetails?.caseFiledDate),
              )
            : '-';
        passData['CR number'] =
          caseDetails?.crNumber != -1 &&
          caseDetails?.crNumber != '' &&
          caseDetails?.crNumber
            ? caseDetails?.crNumber
            : '-';
        passData['CR hearing date'] =
          caseDetails?.crHearingDate != -1 && caseDetails?.crHearingDate
            ? this.typeService.getDateFormatted(
                new Date(caseDetails?.crHearingDate),
              )
            : '-';
        passData['CR reason'] = caseDetails?.crReason ?? '-';
        passData['CC number'] =
          caseDetails?.ccNumber != -1 ? caseDetails?.ccNumber : '-';
        passData['Court name'] = caseDetails?.courtName ?? '-';
        passData['Court number'] = caseDetails?.courtNumber ?? '-';
        passData['Complaint id'] = caseDetails?.complainantId ?? '-';
        passData['Complainant name'] = caseDetails?.complainantName ?? '-';

        passData['First hearing date'] = firstHearingDate ?? '-';
        this.datesColumns(passData, data, data.type);
        if (data.type != CASE_INPROGRESS)
          passData['Days since filed'] = this.daysSince(data.createdAt);
      } else {
        const dates = data?.dates;
        passData['Case disposal reason'] = caseDetails.disposalReason ?? '-';
        passData['Case disposal date'] =
          dates?.disposalDate != -1 && dates?.disposalDate
            ? this.typeService.getDateFormatted(new Date(dates.disposalDate))
            : '-';
      }
    } catch (error) {}
  }
  private daysSince(createdAt) {
    try {
      if (!createdAt || createdAt == -1) return 0;
      createdAt = new Date(createdAt);
      const createDate = this.typeService.getGlobalDate(createdAt);
      const today = this.typeService.getGlobalDate(new Date());
      const diffrence = this.typeService.dateDifference(
        createDate,
        today,
        'Days',
      );
      return diffrence ?? 0;
    } catch (error) {
      return 0;
    }
  }
  async calcDueLegalAmount(
    loanId,
    emiData,
    transactionData,
    createdDate,
    type = 1,
    legalTransactionId = null,
    allEmi = [],
    subData = null,
  ) {
    const passData = {
      expectedAmount: 0,
      emiAutodebitAmount: 0,
      autoDebitFailedResponse: '',
      autoDebitDate: '',
      autoDebitFailedDate: '',
      autodebitLink: '',
      autoDebitSource: '',
      beforeDlLetterPayment: 0,
      afterDlLetterPayment: 0,
      totalOutStanding: 0,
      totalEmiAmt: 0,
      totalPaidEmiAmt: 0,
      percentage: 0,
      totalPaid: 0,
      lastPaymentDate: '',
    };
    try {
      //calculate all the amount for required
      if (type == DEMAND_STATUS) {
        if (!Array.isArray(emiData)) emiData = [emiData];
        for (let i = 0; i < emiData.length; i++) {
          try {
            const emi = emiData[i];
            let autoDebitTransaction: any;
            const tranCalc = this.calcTransaction(
              transactionData,
              createdDate,
              emi,
              legalTransactionId,
            );
            autoDebitTransaction = tranCalc.autoDebitTransaction;
            const outStanding = this.calcTotalOutStanding(transactionData, emi);

            passData.totalPaid = +tranCalc?.totalPaidAmount.toFixed(2) ?? 0;
            passData.totalOutStanding += +(
              +outStanding.totalPrincipal +
              outStanding.totalIntest +
              outStanding.totalPenalty
            ).toFixed(2);
            const totalExpectedAmount =
              (emi?.principalCovered ?? 0) +
              (emi?.interestCalculate ?? 0) -
              (emi?.paid_principal ?? 0) -
              (emi?.paid_interest ?? 0) +
              (emi?.penalty ?? 0) +
              (emi?.regInterestAmount ?? 0) -
              (emi?.paidRegInterestAmount ?? 0) +
              (emi?.bounceCharge ?? 0) +
              (emi?.gstOnBounceCharge ?? 0) -
              (emi?.paidBounceCharge ?? 0) +
              (emi?.dpdAmount ?? 0) +
              (emi?.penaltyChargesGST ?? 0) -
              (emi?.paidPenalCharge ?? 0) +
              (emi?.legalCharge ?? 0) +
              (emi?.legalChargeGST ?? 0) -
              (emi?.paidLegalCharge ?? 0);
            passData.emiAutodebitAmount = autoDebitTransaction.paidAmount;
            const response = JSON.parse(autoDebitTransaction?.response ?? '');
            passData.autoDebitDate = this.typeService.getDateFormatted(
              autoDebitTransaction.subscriptionDate,
            );
            passData.autoDebitFailedDate = this.typeService.getDateFormatted(
              autoDebitTransaction.completionDate ??
                autoDebitTransaction.subscriptionDate,
            );
            passData.autoDebitSource = subData?.mode ?? SIGNDESK;
            passData.autodebitLink = this.failedAutodebitLink(
              passData.autoDebitSource,
              autoDebitTransaction,
            );
            passData.autoDebitFailedResponse =
              response?.payment?.failureReason ??
              response.error_description ??
              response?.error_reason ??
              response?.error_message ??
              'Balance Insufficient';
            passData.expectedAmount += +totalExpectedAmount.toFixed(2);
            passData.beforeDlLetterPayment += tranCalc.beforePay;
            passData.afterDlLetterPayment += tranCalc.afterPay;
          } catch (error) {}
        }
      } else if (type != DEMAND_STATUS) {
        emiData.forEach((emi) => {
          const totalExpectedAmount =
            (emi?.principalCovered ?? 0) +
            (emi?.interestCalculate ?? 0) -
            (emi?.paid_principal ?? 0) -
            (emi?.paid_interest ?? 0) +
            (emi?.penalty ?? 0) +
            (emi?.regInterestAmount ?? 0) -
            (emi?.paidRegInterestAmount ?? 0) +
            (emi?.bounceCharge ?? 0) +
            (emi?.gstOnBounceCharge ?? 0) -
            (emi?.paidBounceCharge ?? 0) +
            (emi?.dpdAmount ?? 0) +
            (emi?.penaltyChargesGST ?? 0) -
            (emi?.paidPenalCharge ?? 0) +
            (emi?.legalCharge ?? 0) +
            (emi?.legalChargeGST ?? 0) -
            (emi?.paidLegalCharge ?? 0);
          passData.expectedAmount += +totalExpectedAmount.toFixed(2);
        });
        const isNew = transactionData.find(
          (ele) => ele.remarks == kLegalProcess,
        );

        const tranCalc = this.calcTransaction(
          transactionData,
          createdDate,
          null,
        );
        if (type == CASE_ASSIGN) {
          transactionData = transactionData.filter(
            (tran) => tran.status == 'COMPLETED' && tran.type != 'REFUND',
          );

          const repaymentData: any =
            await this.sharedCommonService.calcuLoanRepayment(loanId, true);

          if (repaymentData) {
            passData.totalEmiAmt = repaymentData.totalEmiAmount;
            passData.totalPaidEmiAmt = repaymentData.totalPaidAmount;
            passData.percentage = repaymentData.paidPercantage;
          }
        }
        passData.totalPaid = +tranCalc?.totalPaidAmount.toFixed(2) ?? 0;
        passData.beforeDlLetterPayment += tranCalc.beforePay;
        passData.afterDlLetterPayment += tranCalc.afterPay;
        const fullPayTran = transactionData.filter(
          (ele) =>
            (ele.source == 'AUTOPAY' || ele.subSource == 'AUTODEBIT') &&
            ele.status == 'FAILED' &&
            ele.type == 'FULLPAY' &&
            ((isNew && ele.remarks == kLegalProcess) || !isNew) &&
            ((legalTransactionId && ele.id == legalTransactionId) ||
              !legalTransactionId),
        );
        const fullPayAutodebit = fullPayTran[0];
        if (fullPayAutodebit) {
          const response = JSON.parse(fullPayAutodebit?.response ?? '');
          passData.emiAutodebitAmount = fullPayAutodebit.paidAmount;
          passData.autoDebitDate = this.typeService.getDateFormatted(
            fullPayAutodebit.subscriptionDate,
          );
          passData.autoDebitFailedDate = this.typeService.getDateFormatted(
            fullPayAutodebit?.completionDate ??
              fullPayAutodebit.subscriptionDate,
          );
          passData.autoDebitSource = subData?.mode ?? SIGNDESK;
          passData.autodebitLink = this.failedAutodebitLink(
            passData.autoDebitSource,
            fullPayAutodebit,
          );
          passData.autoDebitFailedResponse =
            response?.payment?.failureReason ??
            response.error_description ??
            response?.error_reason ??
            response?.error_message ??
            'Balance Insufficient';
        }
      }
      transactionData.sort((a, b) => b.id - a.id);
      passData.lastPaymentDate = transactionData[0].completionDate
        ? this.typeService.getDateFormatted(transactionData[0].completionDate)
        : '-';
      passData.afterDlLetterPayment = +(
        passData?.afterDlLetterPayment ?? 0
      ).toFixed(2);
      passData.beforeDlLetterPayment = +(
        passData.beforeDlLetterPayment ?? 0
      ).toFixed(2);
      return passData;
    } catch (error) {
      return passData;
    }
  }
  failedAutodebitLink(source, autodebitData) {
    try {
      let paymentURL = '-';
      const utr = autodebitData.utr;
      if (source == 'CASHFREE') {
        const response = JSON.parse(autodebitData?.response);
        const resObj = Array.isArray(response) ? response[0] : response;
        const paymentId = resObj?.cf_payment_id ?? resObj?.payment?.referenceId;
        paymentURL = `${kGetCashfreePayment}?txId=${paymentId}`;
      } else if (source == 'RAZORPAY') {
        paymentURL = `${kGetRazorpayPayment}payments/${utr}`;
      } else if (source == 'SIGNDESK') {
        const mandateId = utr.split('-id-')[1];
        paymentURL =
          mandateId != 'NA' ? `${kGetSigndeskPayment}${mandateId}` : '-';
      }
      return paymentURL;
    } catch (error) {
      return '-';
    }
  }
  calcTotalOutStanding(transactionData, emi) {
    let totalPrincipal = 0;
    let totalIntest = 0;
    let totalPenalty = 0;
    try {
      totalPrincipal += +emi.principalCovered ?? 0;
      totalIntest += +emi.interestCalculate ?? 0;
      transactionData.forEach((ele) => {
        if (ele.emiId == emi.id && emi.payment_status == '1') {
          totalPenalty += ele?.penaltyAmount ?? 0;
        } else if (emi.payment_status == '0') {
          if (ele.emiId == emi.id) {
            totalPenalty += (emi?.penalty ?? 0) + (ele?.penaltyAmount ?? 0);
          } else totalPenalty += emi?.penalty ?? 0;
        } else if (emi.pay_type == 'FULLPAY' && ele.type == 'FULLPAY') {
          totalPenalty += ele?.penaltyAmount ?? 0;
        }
      });
      return { totalPrincipal, totalIntest, totalPenalty };
    } catch (error) {
      return { totalPrincipal, totalIntest, totalPenalty };
    }
  }
  calcTransaction(
    transactionData,
    legalCreatedDate,
    emi,
    legalTransactionId = null,
  ) {
    let beforePay = 0;
    let afterPay = 0;
    let autoDebitTransaction;
    let totalPaidAmount = 0;
    try {
      for (let i = 0; i < transactionData.length; i++) {
        try {
          const ele = transactionData[i];
          //check all the paid transactin
          if (ele.status == 'COMPLETED' && ele.type != 'REFUND') {
            totalPaidAmount += ele.paidAmount;
            const dlCreated = this.typeService.getGlobalDate(legalCreatedDate);
            const tranCompletionDate = this.typeService.getGlobalDate(
              ele.completionDate,
            );

            if ((emi && ele.emiId == emi.id) || !emi) {
              if (tranCompletionDate.getTime() < dlCreated.getTime())
                beforePay += ele.paidAmount;
              else if (tranCompletionDate.getTime() >= dlCreated.getTime())
                afterPay += ele.paidAmount;
            }
          } else if (ele.id == legalTransactionId)
            //check all emi failed auto debit
            autoDebitTransaction = ele;
        } catch (error) {}
      }
      return { beforePay, afterPay, autoDebitTransaction, totalPaidAmount };
    } catch (error) {
      return { beforePay, afterPay, autoDebitTransaction, totalPaidAmount };
    }
  }

  checkAllSentTypes(sentType) {
    const sentObj = {
      email: notSent,
      workMail: notSent,
      sms: notSent,
      physical: notSent,
      whatsApp: notSent,
    };
    try {
      //check all sent type
      sentObj.email = sentStatusObj[sentType?.email ?? '-1'];
      sentObj.workMail = sentStatusObj[sentType?.workMail ?? '-1'];
      sentObj.sms = sentStatusObj[sentType?.sms ?? '-1'];
      sentObj.physical = sentStatusObj[sentType?.physical ?? '-1'];
      sentObj.whatsApp = sentStatusObj[sentType?.whatsApp ?? '-1'];
      return sentObj;
    } catch (error) {
      return sentObj;
    }
  }
  mapLegalWiseData(
    legalData,
    kycData,
    masterData,
    advocateData,
    disbursementData,
    transactionData,
    esignData,
    followerData,
    subscriptionData,
    mailTrackData,
  ) {
    try {
      let kyc = kycData.find((kyc) => kyc.id == legalData.userData.kycId);
      let master = masterData.find(
        (mst) => legalData.userData.masterId == mst.id,
      );
      let advocate = advocateData.find((adv) => adv.id == legalData.advocateId);
      let disbur = disbursementData.find(
        (dis) => dis.loanId == legalData.loanId,
      );
      const trans = transactionData.filter(
        (ele) => ele.loanId == legalData.loanId,
      );

      const esign = esignData.find(
        (ele) => ele.id == legalData.loanData.esign_id,
      );

      const follower = followerData.find(
        (ele) => ele.id == legalData.loanData.followerId,
      );
      const subData = subscriptionData.find(
        (ele) => ele.id == legalData.loanData.subscriptionId,
      );
      const mailData = mailTrackData.find(
        (ele) => ele.id == legalData.mailTrackId,
      );
      legalData.userData.kycData = kyc ?? null;
      legalData.userData.masterData = master ?? null;
      legalData.advocateData = advocate ?? null;
      legalData.loanData.disbursementData = disbur ?? null;
      legalData.loanData.transactionData = trans ?? [];
      legalData.loanData.eSignData = esign ?? {};
      legalData.loanData.subscriptionData = subData ?? null;
      legalData.loanData.followerData = follower ?? {};
      legalData.mailTrackData = mailData ?? {};
      return legalData;
    } catch (error) {
      return legalData;
    }
  }

  prepareAutodebitData(data, emiData) {
    try {
      const userData = data.userData;
      const loanData = data?.loanData;
      const adminData = data?.adminData;
      let disbursementData: any = {};
      const subscriptionData = loanData?.subscriptionData;
      try {
        disbursementData = loanData?.disbursementData[0];
      } catch (error) {}
      let emi_amount = 0;
      let penalty_days = 0;
      emiData.forEach((ele) => {
        try {
          if (ele?.payment_status == '0') {
            penalty_days += ele?.penalty_days ?? 0;
            emi_amount += +(ele?.emi_amount ?? 0) + +(ele?.penalty ?? 0);
          }
        } catch (error) {}
      });
      emi_amount = +emi_amount.toFixed(2);
      const autodebitAmount = data?.paidAmount ?? 0;
      const passData = {
        'Loan id': data?.loanId ?? '-',
        userId: userData.id,
        'Customer name': userData?.fullName ?? '-',
        'Phone number': this.cryptService.decryptPhone(userData?.phone) ?? '-',
        'As on due amount': this.typeService.numberRoundWithCommas(emi_amount),
        'Delay days': penalty_days,
        'Place date':
          this.typeService.getDateFormatted(data?.subscriptionDate) ?? '-',
        'Disburse amount': this.typeService.numberRoundWithCommas(
          (disbursementData?.amount ?? 0) / 100,
        ),
        'Disburse date': this.typeService.getDateFormatted(
          loanData?.loan_disbursement_date,
        ),
        'Bank name': disbursementData?.bank_name ?? '-',
        IFSC: disbursementData?.ifsc,
        'Account number': disbursementData?.account_number ?? '-',
        'Auto-debit': data?.type ?? '-',
        'Auto-debit amount':
          this.typeService.numberRoundWithCommas(autodebitAmount),
        'Placed by': adminData?.fullName ?? '-',
        Status: data?.status == 'INITIALIZED' ? 'Pending' : '-',
        'E-mandate type': subscriptionData?.mode,
      };
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  groupedLegal(legalData) {
    try {
      let passData = {};
      legalData.forEach((legal) => {
        if (passData[legal.loanId]) passData[legal.loanId].push(legal);
        else passData[legal.loanId] = [legal];
      });
      for (let key in passData) passData[key].sort((a, b) => a.id - b.id);
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
