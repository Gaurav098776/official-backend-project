// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { IFSC_VALIDATE_URL } from 'src/constants/network';
import { kInternalError } from 'src/constants/responses';
import { kRazorpay } from 'src/constants/strings';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class VerificationPrepare {
  constructor(
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly apiService: APIService,
    private readonly commonShared: CommonSharedService,
  ) {}

  async prepareCompanyData(list) {
    const finalData = [];
    try {
      for (let index = 0; index < list.length; index++) {
        try {
          const element = list[index];
          const tempData: any = {};
          const masterData = element?.masterData;
          const userData = element.user ?? element;
          const statusData = masterData.status;
          const rejection = masterData.rejection;
          const empData = element?.user ? element : masterData?.empData;
          const url = empData?.companyUrl ? (empData?.companyUrl).trim() : '-';
          const salaryData = masterData?.salarySlipData;
          const workMailData = masterData?.workMailData;
          const contact = empData?.companyPhone
            ? empData.companyPhone.trim()
            : '-';
          const address = empData?.companyAddress
            ? empData.companyAddress.trim()
            : '-';

          tempData['Name'] = userData?.fullName ?? '-';
          tempData['Mobile number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          tempData['Loan Id'] = masterData?.loanId ?? '-';
          tempData['Company name'] = empData?.companyName ?? '-';
          tempData['Company URL'] = url;
          tempData['Company contact'] = contact;
          tempData['Company address'] = address;
          tempData['Salary Slip'] = salaryData?.url ?? '-';
          tempData['Salary status'] = statusData?.salarySlip ?? '-1';
          tempData['work mail'] = workMailData?.email ?? '-';
          tempData['work mail status'] = statusData?.workMail ?? '-1';
          tempData['Completed loans'] = userData?.completedLoans ?? 0;
          tempData['City'] = userData?.city;
          // Last approved by admin
          const salaryAdminData = await this.commonShared.getAdminData(
            salaryData?.approveById,
          );
          const workMailAdminData = await this.commonShared.getAdminData(
            workMailData?.approveById,
          );
          if (salaryAdminData.fullName != 'System')
            tempData['Last action by'] = salaryAdminData?.fullName;
          else if (workMailAdminData.fullName != 'System')
            tempData['Last action by'] = workMailAdminData?.fullName;
          else tempData['Last action by'] = 'System';
          tempData['userId'] = userData?.id ?? '-';
          tempData['Status'] = statusData?.company ?? '-';
          const companyRejectReason = rejection?.company;
          const salaryRejectReason = rejection?.salarySlip;
          const workMailRejectReason = rejection?.workMail;
          tempData['Reject reason'] =
            companyRejectReason ||
            salaryRejectReason ||
            workMailRejectReason ||
            '-';
          tempData['employeeId'] = empData?.id ?? '-';
          finalData.push(tempData);
        } catch (error) {}
      }
    } catch (error) {}
    return finalData;
  }

  async prepareBankingRowData(list: any[], query) {
    try {
      const length = list.length;
      const finalData = [];
      for (let index = 0; index < length; index++) {
        try {
          const ele = list[index];
          const userData = ele?.userData ?? ele;

          const masterData = ele?.masterData ?? ele;
          const employementData = masterData.empData;
          const loanData = masterData.loanData;
          const banking = loanData?.bankingData;
          const adminData = await this.commonShared.getAdminData(
            banking?.adminId,
          );
          const assignData = await this.commonShared.getAdminData(
            masterData?.bankAssingId,
          );
          const date = banking?.salaryVerificationDate ?? banking?.updatedAt;
          const lastUpdate = this.typeService.getDateFormatted(date);
          const createdAt = this.typeService.getDateFormatted(
            banking?.createdAt,
          );
          let verifiedDate = userData?.verifiedDate ?? date;
          verifiedDate = this.typeService.getDateFormatted(verifiedDate);
          const tempData: any = {};
          tempData['Assign'] = assignData?.fullName ?? '-';
          tempData['Loan id'] = masterData?.loanId ?? '-';
          tempData['Name'] = userData?.fullName ?? '-';
          tempData['Mobile number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          tempData['Applied bank'] = banking?.bank ?? '-';
          tempData['Account number'] = banking?.accountNumber ?? '-';
          tempData['Company name'] = employementData?.companyName ?? '-';
          tempData['Salary'] = employementData?.salary ?? '-';
          tempData['Statement'] = banking?.bankStatement;
          let cibilList = userData?.cibilList ?? [];
          cibilList = cibilList.sort((b, a) => a.id - b.id);
          tempData['Cibil score'] = cibilList[0]?.cibilScore?.toString() ?? '-';
          tempData['PL score'] = cibilList[0]?.plScore?.toString() ?? '-';
          tempData['Additional statement'] =
            banking?.additionalBankStatement ?? '-';
          tempData['Additional Urls'] = banking?.additionalURLs ?? [];
          tempData['Completed loans'] = userData?.completedLoans ?? '-';
          tempData['City'] = userData?.city ?? '-';
          tempData['Created at'] = createdAt ?? '-';
          tempData['Last updated'] = lastUpdate ?? '-';
          tempData['Last action by'] = adminData?.fullName ?? '-';
          tempData['Reject counts'] = banking?.attempts ?? '-';
          tempData['Verified Date'] = verifiedDate;
          tempData['Reject reason'] = banking?.rejectReason ?? '-';
          tempData['Status'] = banking?.salaryVerification ?? '';
          tempData['bankingId'] = banking?.id ?? '-';
          tempData['userId'] = userData?.id ?? '-';
          tempData['assignId'] = masterData?.bankAssingId ?? '-';
          tempData['userSalaryDate'] = employementData?.salaryDate ?? '-';
          tempData['systemDate'] = banking?.salaryDate ?? '-';
          tempData['actualSalary'] = banking?.adminSalary ?? banking?.salary;
          tempData['isNeedTagSalary'] = banking?.isNeedTagSalary ?? '-';
          // In case of auto skip salary tag when no transaction had been found
          if (tempData['isNeedTagSalary']?.length < 4)
            tempData['isNeedTagSalary'] = '-';
          if (query?.download != 'true')
            tempData['byPass_status'] = banking?.status ?? '-';
          tempData['salary_list'] = banking?.otherDetails?.salary ?? {};
          finalData.push(tempData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#endregion
  prepareResidenceData(data) {
    try {
      const finalData = [];
      data.forEach((item) => {
        try {
          const userData = item.userData ?? item;
          try {
            if (userData?.addressData) {
              const addressData = userData?.addressData.sort(
                (a, b) => b?.id - a?.id,
              );
              const eCommerceAdd = [];
              addressData.forEach((ele) => {
                try {
                  const find = eCommerceAdd.find((add) => add == ele?.address);
                  if (!find)
                    eCommerceAdd.push({
                      address: ele?.address,
                      status: ele.status,
                    });
                } catch (error) {}
              });
              userData.eCommerceAddress = eCommerceAdd;
            }
          } catch (error) {}
          const lastLocation = userData?.locationData.sort(
            (a, b) => b?.id - a?.id,
          )[0]?.location;
          const tmpData: any = {};
          const masterData = item?.masterData ?? item;
          tmpData['Loan id'] = masterData?.loanId ?? '-';
          tmpData['Mobile number'] = this.cryptService.decryptPhone(
            userData?.phone,
          );
          tmpData['Name'] = userData?.fullName;
          tmpData['Type of document'] = userData?.homeProofType ?? '-';
          tmpData['Optional'] = userData?.homeProofImage ?? '-';
          const cibilList = userData?.cibilList ?? [];
          cibilList.sort((b, a) => a.id - b.id);
          tmpData['Cibil score'] = cibilList[0]?.cibilScore?.toString() ?? '-';
          tmpData['PL score'] = cibilList[0]?.plScore?.toString() ?? '-';
          tmpData['City'] = userData?.city ?? '-';
          tmpData['Created at'] = userData?.createdAt
            ?.toJSON()
            ?.substring(0, 10);
          tmpData['Last action by'] =
            userData?.residenceProofApproveByName ?? '-';
          tmpData['Status'] = userData?.homeStatus;
          tmpData['userId'] = userData?.id;
          tmpData['Type'] = userData?.homeType ?? '-';
          tmpData['Type Address'] =
            JSON.parse(userData?.typeAddress ?? {}) ?? '-';
          tmpData['E-commerce address'] = userData?.eCommerceAddress ?? '-';
          tmpData['Last Location'] = lastLocation ?? '-';
          tmpData['Pin Address'] = userData?.pinAddress ?? '-';
          tmpData['Reject reason'] = userData?.residenceRejectReason ?? '-';

          finalData.push(tmpData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  prepareSelfieVerificationData(data) {
    try {
      const finalData = [];
      data.forEach((ele) => {
        try {
          const tempData: any = {};
          const userData = ele?.userData ?? ele;
          const selfieData = userData?.selfieData;
          const verification = this.typeService.getVerificationTimeDiff(
            userData.verificationTrackerData,
          );

          const masterData = ele?.masterData ?? ele;
          const statusData = masterData?.status ?? {};
          const dates = masterData?.dates ?? {};
          const kycData = userData?.kycData;
          let matchPer: any = 0;
          try {
            const response = JSON.parse(selfieData?.response);
            if (response.SourceImageFace) {
              const simlarity = response?.SourceImageFace?.Confidence ?? 0;
              const facaMatch = response?.FaceMatches?.length > 0;
              if (facaMatch) matchPer = simlarity.toFixed(2);
              else matchPer = (100 - simlarity).toFixed();
            }
          } catch (error) {}
          if (statusData.selfie == '5') statusData.selfie = 0;
          userData.phone = this.cryptService.decryptPhone(userData.phone);
          const date = dates?.selfie
            ? new Date(dates.selfie)
            : selfieData?.updatedAt;
          const lastUpdate = this.typeService.getDateFormatted(date);
          tempData['Waiting time'] = verification;
          tempData['Mobile number'] = userData?.phone;
          tempData['Loan id'] = masterData?.loanId ?? '-';
          tempData['Name'] = userData?.fullName;
          tempData['City'] = userData?.city ?? '-';
          tempData['Completed loans'] = userData?.completedLoans ?? 0;
          tempData['Profile image'] = selfieData?.image ?? '-';
          tempData['Profile_tempImg'] = selfieData?.tempImage ?? '-';
          tempData['Aadhar_image'] =
            kycData?.profileImage ?? kycData?.aadhaarFront;
          tempData['Similarity'] = matchPer;
          tempData['Last updated'] = lastUpdate;
          tempData['Last action by'] = selfieData?.admin?.fullName ?? 'SYSTEM';
          tempData['Reject reason'] = selfieData?.rejectReason ?? '-';
          tempData['Status'] = statusData?.selfie ?? '-';
          tempData['userId'] = userData?.id ?? '-';
          tempData['selfieId'] = selfieData?.id ?? '-';
          tempData['Difference in minutes'] = verification?.minutes;

          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async prepareContactData(data) {
    const finalData = [];
    try {
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        const tmpData: any = {};
        try {
          const userData = item?.userData ?? item;
          const masterData = item?.masterData ?? item;
          const statusData = masterData.status;
          const rejection = masterData.rejection;
          tmpData['userId'] = userData?.id;
          tmpData['Loan id'] = masterData?.loanId ?? '-';
          tmpData['Name'] = userData?.fullName;
          tmpData['Contacts'] = userData?.totalContact ?? 0;
          tmpData['City'] = userData?.city ?? '-';
          tmpData['Last action by'] =
            userData.quantity_status == '1'
              ? 'system'
              : (
                  await this.commonShared.getAdminData(
                    userData?.contactApprovedId,
                  )
                )?.fullName ?? '-';
          tmpData['Status'] = statusData?.contact ?? '-';
          tmpData['Reject reason'] = rejection?.contact ?? '-';
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async prepareKycVerificationData(data) {
    const finalData = [];
    try {
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        const tmpData: any = {};
        try {
          const userData = item?.userData ?? item;
          const verification = this.typeService.getVerificationTimeDiff(
            userData?.verificationTrackerData,
          );
          const kycData = userData?.kycData;
          const masterData = item?.masterData ?? item;
          const statusData = masterData.status;
          const rejection = masterData.rejection;
          const successStatus = [1, 3];
          let status: any = '0';
          if (
            successStatus.includes(statusData.aadhaar) &&
            successStatus.includes(statusData.pan)
          )
            status = '1';
          else if (statusData.aadhaar == '2' || statusData.pan == '2')
            status = '2';
          tmpData['userId'] = userData?.id;
          tmpData['Waiting time'] = verification;
          tmpData['Mobile number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          tmpData['Loan id'] = masterData?.loanId ?? '-';
          tmpData['Name'] = userData?.fullName;
          //aadhaar doc data
          tmpData['aadhaarFront'] = kycData?.aadhaarFront ?? '-';
          tmpData['aadhaarBack'] = kycData?.aadhaarBack ?? '-';
          tmpData['aadhaarNumber'] = kycData?.maskedAadhaar ?? '-';
          tmpData['aadhaarStatus'] = status?.aadhaar ?? '-';
          tmpData['aadhaarRejectReason'] = rejection?.aadhaar ?? '-';
          tmpData['aadhaarVerifiedAdmin'] =
            kycData?.aadhaarVerifiedAdmin ?? '-';
          tmpData['aadhaarVerifiedAdminName'] =
            (
              await this.commonShared.getAdminData(
                kycData?.aadhaarVerifiedAdmin,
              )
            )?.fullName ?? '-';
          if (kycData?.aadhaarResponse) {
            const aadhaarResponse = JSON.parse(kycData?.aadhaarResponse);
            tmpData['Aadhaar name'] =
              aadhaarResponse?.full_name ??
              aadhaarResponse?.name ??
              aadhaarResponse?.localResName ??
              '-';
          }
          //pan card  data
          tmpData['pan'] = kycData?.pan ?? '-';
          tmpData['panCardNumber'] = kycData?.panCardNumber ?? '-';
          tmpData['panStatus'] = statusData?.pan ?? '-';
          tmpData['Reject reason'] = rejection.aadhaar ?? rejection?.pan ?? '-';

          if (kycData?.panResponse) {
            const panResponse = JSON.parse(kycData?.panResponse);
            const document_status = panResponse?.document_status;
            const finalResponse: any = document_status ?? panResponse?.result;
            tmpData['Pan name'] =
              finalResponse && finalResponse.length > 0
                ? finalResponse[0]?.validated_data?.full_name ?? '-'
                : finalResponse?.user_full_name ?? '-';
          }
          tmpData['City'] = userData?.city;
          tmpData['Last action by'] =
            (await this.commonShared.getAdminData(kycData?.panVerifiedAdmin))
              ?.fullName ?? '-';
          tmpData['Difference in minutes'] = verification?.minutes;
          tmpData['Status'] = status;
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  async prepareFinalVerificationData(data) {
    try {
      const finalData = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const ele = data[i];
          const tmpData: any = {};
          const userData = ele?.userData ?? ele;
          const masterData = ele?.masterData ?? ele;
          const loanData = masterData.loanData;
          const statusData = masterData?.status;
          const bankingData = loanData.bankingData ?? {};
          let categoryTag = loanData?.categoryTag;
          const verification = this.typeService.getVerificationTimeDiff(
            ele?.verificationTrackerData,
          );
          if (categoryTag == 0) categoryTag = 'Low risk';
          else if (categoryTag == 1) categoryTag = 'Moderate risk';
          else if (categoryTag == 2) categoryTag = 'High risk';
          else if (categoryTag == 3) categoryTag = 'Premium';
          const predictionData = loanData.predictionData ?? {};
          const predictionReason = predictionData.reason;
          if (predictionReason && (ele?.completedLoans ?? 0) > 0) {
            const reasonData = JSON.parse(predictionReason);
            const firstElement = Object.keys(reasonData)[0];
            if (firstElement) {
              tmpData['predictionData'] = firstElement
                .replace(/_/g, ' ')
                .toUpperCase();
            }
          }
          tmpData['userId'] = userData?.id;
          tmpData['Waiting time'] = verification;
          tmpData['Assign'] = masterData?.loanAssignData?.fullName ?? '-';
          tmpData['assignId'] = masterData?.loanAssingId ?? '-';
          tmpData['Loan id'] = loanData.id;
          tmpData['Name'] = userData?.fullName ?? '-';
          tmpData['Mobile number'] = this.cryptService.decryptPhone(
            userData.phone,
          );
          tmpData['Applied loan amount'] = loanData?.loanAmount ?? 0;
          tmpData['Approved loan amount'] = loanData?.netApprovedAmount ?? 0;
          tmpData['Salary'] = bankingData?.salary ?? 0;
          const cibilList = userData?.cibilList ?? [];
          cibilList.sort((b, a) => a.id - b.id);
          tmpData['Cibil score'] = cibilList[0]?.cibilScore?.toString() ?? '-';
          tmpData['PL score'] = cibilList[0]?.plScore?.toString() ?? '-';
          tmpData['City'] = userData?.city ?? '-';
          tmpData['Completed loans'] = userData?.completedLoans ?? 0;
          tmpData['Last action by'] = loanData?.adminData?.fullName ?? 'System';
          tmpData['Last updated'] = this.typeService.dateToJsonStr(
            loanData?.verifiedDate ?? loanData?.updatedAt,
            'DD/MM/YYYY',
          );
          tmpData['Difference in minutes'] = verification?.minutes;
          tmpData['Reject reason'] = loanData?.remark ?? '-';
          tmpData['Approved reason'] = loanData?.approvedReason ?? '-';
          tmpData['Status'] = statusData?.eligibility;
          tmpData['categoryTag'] = categoryTag ?? '-';
          const ifsc = bankingData?.disbursementIFSC;
          const isValidIfsc = await this.checkIfscCode(ifsc);
          if (!isValidIfsc) tmpData['ifscTagged'] = 'IFSC NOT VALID';
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async checkIfscCode(ifsc = null) {
    try {
      if (!ifsc) return false;
      const url = IFSC_VALIDATE_URL + ifsc;
      const result: any = await this.apiService.requestGet(url);
      if (!result || result === k500Error) return false;
      if (result?.IFSC) return true;
      return false;
    } catch (error) {}
  }
  prepareMandateData(data) {
    try {
      const finalData = [];
      data.forEach((ele) => {
        try {
          const verification = this.typeService.getVerificationTimeDiff(
            ele?.verificationTrackerData,
          );
          const masterData = ele?.masterData;
          const loanData = masterData.loanData;
          const subscriptionData = loanData?.subscriptionData ?? {};
          const createdDate = subscriptionData?.createdAt;
          const option = subscriptionData?.subType ?? '-';
          let lastActiveAgo: any = '';
          let lastActiveAgoMinutes: any = Infinity;
          if (ele?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              ele?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            lastActiveAgo =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }

          if (
            (subscriptionData?.status == 'FAILED' ||
              subscriptionData?.mode == kRazorpay) &&
            subscriptionData?.response
          ) {
            const responseData = JSON.parse(subscriptionData?.response);
            subscriptionData.failedResponse =
              responseData?.cf_message ?? responseData?.errorMsg ?? '';
            if (responseData?.errorMsg) subscriptionData.status = 'FAILED';
          }
          const tempData: any = {};
          tempData['Waiting time'] = verification;
          tempData['Name'] = ele?.fullName ?? '-';
          tempData['Mobile number'] =
            this.cryptService.decryptPhone(ele?.phone) ?? '-';
          tempData['Loan Id'] = masterData?.loanId ?? '-';
          tempData['Loan Amount'] = loanData?.netApprovedAmount ?? 0;
          tempData['Completed loans'] = ele?.completedLoans ?? '-';
          tempData['Platform'] = subscriptionData?.mode ?? '-';
          tempData['Bank name'] = loanData?.bankingData?.mandateBank ?? '-';
          tempData['Account number'] =
            loanData?.bankingData?.mandateAccount ?? '-';
          tempData['Options'] =
            option == '-'
              ? '-'
              : option == 'debitCard'
              ? 'Debit Card'
              : 'Net Banking';
          tempData['Attempts'] = loanData?.mandateAttempts ?? 0;
          tempData['Created date'] = createdDate
            ? this.typeService.getDateFormatted(createdDate)
            : '-';
          tempData['Device type'] = '-';
          if (ele?.typeOfDevice == '0') tempData['Device type'] = 'Android';
          if (ele?.typeOfDevice == '1') tempData['Device type'] = 'iOS';
          tempData['mandateId'] = subscriptionData?.id ?? '-';
          tempData['Reject reason'] = subscriptionData?.failedResponse ?? '-';
          tempData['Status'] = subscriptionData?.status ?? 'Pending';
          tempData['Invitation link'] = subscriptionData?.invitationLink ?? '-';
          tempData['userId'] = ele?.id ?? '-';
          tempData['isOnline'] =
            lastActiveAgoMinutes < 5 && lastActiveAgo != '';
          tempData['Last Active ago'] =
            lastActiveAgo == '' ? null : lastActiveAgo;
          tempData['lastActiveAgoMinutes'] = lastActiveAgoMinutes;
          tempData['Difference in minutes'] = verification?.minutes;

          finalData.push(tempData);
          finalData.sort(
            (a, b) =>
              (a?.lastActiveAgoMinutes ?? 0) - (b?.lastActiveAgoMinutes ?? 0),
          );
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  prepareEsignVerificationData(data, download) {
    const finalData = [];
    try {
      data.forEach((ele) => {
        try {
          const tempData: any = {};
          const verification = this.typeService.getVerificationTimeDiff(
            ele?.verificationTrackerData,
          );
          const masterData = ele.masterData;
          const loanData = masterData.loanData;
          const esignData = loanData.eSignData;
          const createdAt = esignData?.createdAt
            ? this.typeService.getDateFormatted(esignData?.createdAt)
            : null;
          let lastActiveAgo: any = '';
          let lastActiveAgoMinutes: any = Infinity;
          if (ele?.lastOnlineTime) {
            const lastOnlineTime = this.typeService.dateTimeToDate(
              ele?.lastOnlineTime,
            );
            lastActiveAgoMinutes = this.typeService.dateDifference(
              lastOnlineTime,
              new Date(),
              'Minutes',
            );
            lastActiveAgo =
              this.typeService.formateMinutes(lastActiveAgoMinutes);
          }
          let response = esignData?.response;
          try {
            response = JSON.parse(response);
          } catch (err) {}
          tempData['Waiting time'] = verification;
          tempData['Name'] = ele?.fullName ?? '-';
          tempData['Loan Id'] = loanData?.id ?? '-';
          tempData['Completed loans'] = ele?.completedLoans ?? '-';
          tempData['Loan Amount'] = loanData?.netApprovedAmount ?? 0;
          tempData['Quick invite url'] = esignData?.quick_invite_url ?? '-';
          tempData['Created date'] = createdAt ?? '-';
          tempData['isOnline'] =
            lastActiveAgoMinutes < 5 && lastActiveAgo != '';
          tempData['Last Active ago'] =
            lastActiveAgo == '' ? null : lastActiveAgo;
          tempData['userId'] = ele?.id ?? '-';
          if (download != 'true') {
            tempData['esignId'] = esignData?.id ?? '-';
          }
          tempData['lastActiveAgoMinutes'] = lastActiveAgoMinutes;
          tempData['Difference in minutes'] = verification?.minutes;
          const isNameMissMatch = esignData?.nameMissMatch ?? false;
          tempData['Name mis match'] = isNameMissMatch;
          tempData['Reject reason'] = isNameMissMatch ? 'Name mismatch' : '-';
          tempData['Status'] =
            masterData?.status?.eSign == 0 ? 'INITIALIZED' : 'PENDING';
          const fetch_name =
            response?.aadhaar_name ??
            response?.result?.signer?.fetched_name ??
            '-';
          tempData['Esign name'] = fetch_name;
          finalData.push(tempData);
          finalData.sort(
            (a, b) => a?.lastActiveAgoMinutes - b?.lastActiveAgoMinutes,
          );
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async prepareDisbursementData(data) {
    try {
      const finalData: any = [];
      let reasonList = [];
      try {
        const disbursementList = [];
        for (let i = 0; i < data.length; i++) {
          try {
            const item = data[i];
            const loanData = item.masterData.loanData;
            let disbursementData = loanData?.disbursementData;
            disbursementData = (disbursementData ?? [{}])[0] ?? {};
            if (
              disbursementData.status != 'processed' &&
              disbursementData.status != 'processing' &&
              disbursementData.status != 'queued'
            )
              disbursementList.push(disbursementData.id);
          } catch (e) {}
        }
      } catch (error) {}

      for (let i = 0; i < data.length; i++) {
        const tmpData: any = {};
        try {
          const item = data[i];
          const masterData = item.masterData;
          const loanData = masterData.loanData;
          let disbursementData = loanData?.disbursementData ?? {};
          disbursementData = (disbursementData ?? [{}])[0] ?? {};
          const disResp = disbursementData?.response
            ? JSON.parse(disbursementData?.response)
            : {};

          const failureReason =
            disResp?.failure_reason ??
            disResp?.status_details?.description ??
            disResp?.msg ??
            '-';
          const verification = this.typeService.getVerificationTimeDiff(
            item.verificationTrackerData,
          );
          tmpData['userId'] = item?.id;
          tmpData['Waiting time'] = verification;
          tmpData['Name'] = item.fullName;
          tmpData['Loan Id'] = loanData?.id;
          tmpData['Loan Amount'] = loanData?.netApprovedAmount ?? 0;
          tmpData['Mobile number'] = this.cryptService.decryptPhone(item.phone);
          tmpData['Completed loans'] = item.completedLoans;
          tmpData['Failed reason'] = failureReason;
          tmpData['Bank'] = disbursementData.bank_name ?? '-';
          tmpData['Difference in minutes'] = verification?.minutes;

          tmpData['Status'] = (
            disbursementData?.status ?? 'INITIALIZED'
          ).toUpperCase();
          finalData.push(tmpData);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
