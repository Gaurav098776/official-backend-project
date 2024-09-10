// Imports
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import * as pdf2base64 from 'pdf-to-base64';
import {
  disburseAmt,
  ESIGN_SERVICE_MODE,
  gIsPROD,
  isStamp,
  NAME_MISS_MATCH_PER,
  NBFC_NAME,
  OTHER_PURPOSE_ID,
  OTHER_PURPOSE_NAME,
  puppeteerConfig,
  LOAN_AGREEMENT_COOLINGOFF_PERIOD,
  GLOBAL_FLOW,
  templateDesign,
  GLOBAL_CHARGES,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kMonths } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  IP_ADDRESS_IS_BLACKLISTED,
  kCollectionEmail,
  kESignService,
  keSignSuccessNotify,
  kHelpContact,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  kSetu,
  kSomthinfWentWrong,
  kSupportMail,
  kVeri5,
  kWaitForDisbursement,
  kZoop,
  USER_IS_NOT_MATCHED_WITH_COUNTRY,
} from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { esignEntity } from 'src/entities/esign.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { loanPurpose } from 'src/entities/loan.purpose.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { ESignRepository } from 'src/repositories/esign.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { StampRepository } from 'src/repositories/stamp.repository';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { APIService } from 'src/utils/api.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { EmiSharedService } from './emi.service';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { CryptService } from 'src/utils/crypt.service';
import { MandateSharedService } from './mandate.service';
import { kTempAgreement } from 'src/constants/directories';
import { MasterEntity } from 'src/entities/master.entity';
import { SharedNotificationService } from './services/notification.service';
import { ValidationService } from 'src/utils/validation.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { CommonSharedService } from './common.shared.service';
import { UserLogTrackerRepository } from 'src/repositories/userLogTracker.repository';
import { IpMasterRepository } from 'src/repositories/ipMaster.repository';
import { IpCheckService } from './ipcheck.service';
import { EnvConfig } from 'src/configs/env.config';
import { SetuService } from 'src/thirdParty/setu/setu.service';
import { StringService } from 'src/utils/string.service';
import { RedisService } from 'src/redis/redis.service';
@Injectable()
export class ESignSharedService {
  constructor(
    private readonly eSignRepo: ESignRepository,
    private readonly typeService: TypeService,
    private readonly veri5Service: Veri5Service,
    private readonly zoopService: ZoopService,
    private readonly loanRepo: LoanRepository,
    private readonly apiService: APIService,
    private readonly masterRepo: MasterRepository,
    private readonly esingRepo: ESignRepository,
    @Inject(forwardRef(() => EmiSharedService))
    private readonly emiSharedService: EmiSharedService,
    private readonly fileService: FileService,
    private readonly stampRepo: StampRepository,
    private readonly referenceRepo: ReferenceRepository,
    private readonly cryptService: CryptService,
    private readonly sharedMandateService: MandateSharedService,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly validation: ValidationService,
    private readonly signDeskService: SigndeskService,
    private readonly commonSharedService: CommonSharedService,
    private readonly userLogTrackerRepo: UserLogTrackerRepository,
    private readonly ipMasterRepo: IpMasterRepository,
    private readonly ipCheckService: IpCheckService,
    private readonly setuService: SetuService,
    private readonly stringService: StringService,
    private readonly redisService: RedisService,
  ) {}

  async funDeleteEsign(body) {
    try {
      if (!body?.esignId || !body?.adminId) return kParamsMissing;
      const esignId = body.esignId;
      const loanId = body.loanId;
      const attributes = ['id', 'dates', 'status', 'loanId'];
      const options: any = {
        where: { loanId, status: { eSign: 0, loan: { [Op.notIn]: [6, 7] } } },
      };
      const esignAttr = [
        'id',
        'loanId',
        'document_id',
        'stampId',
        'userId',
        'esign_mode',
        'status',
        'api_response_id',
      ];
      const esignInclude = {
        model: esignEntity,
        attributes: esignAttr,
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['esign_id'],
        include: [esignInclude],
      };
      options.include = [loanInclude];
      const masterData = await this.masterRepo.getRowWhereData(
        attributes,
        options,
      );
      if (!masterData || masterData === k500Error)
        return { valid: false, message: 'Failed to fetch esign data!' };
      const loanData = masterData.loanData;
      const esignData = loanData.esignData;
      const statusData = masterData?.status ?? {};
      let statusResponse;
      if (esignData.esign_mode == kVeri5) {
        statusResponse = await this.veri5Service.checkEsignStatusAndDownaload(
          esignData.document_id,
        );

        if (esignData.status == '1')
          return {
            valid: false,
            message: 'Esign already signed!',
          };
        if (statusResponse == k500Error)
          return {
            valid: false,
            message: 'Failed to fetch esign data!',
          };
        if (statusResponse.fileContent)
          return {
            valid: false,
            message: 'Esign already signed!',
          };
      } else if (esignData.esign_mode == kZoop) {
        const result: any = await this.zoopService.checkStatusOfeSing(
          esignData.document_id,
        );
        if (result?.message) return result;
        if (result?.status === '1')
          return k422ErrorMessage('Esign already signed!');
      } else if (esignData.esign_mode == kSetu) {
        const result: any = await this.setuService.checkStatusOfeSign(
          esignData.api_response_id,
        );
        if (result?.status == 'sign_complete')
          return k422ErrorMessage('Esign already signed!');
      } else {
        statusResponse = await this.getSignatureStatus({
          document_id: esignData.document_id,
        });
        if (!statusResponse || statusResponse === k500Error)
          return {
            valid: false,
            message: 'Failed to fetch esign data!',
          };
        if (
          statusResponse['status'] == 'success' &&
          statusResponse['signer_info'][0]?.status == 'signed'
        )
          return {
            valid: false,
            message: 'Esign already signed!',
          };
      }
      const deletOptions = {
        where: {
          status: '0',
          id: esignId,
        },
      };
      const tempEsignData = await this.deleteEsign(deletOptions);
      if (!tempEsignData || tempEsignData[0] <= 0)
        return k422ErrorMessage('Esign not deleted');
      if (esignId == loanData.esign_id) {
        const updateData = await this.loanRepo.updateRowData(
          { esign_id: null, loanStatus: 'InProcess' },
          masterData.loanId,
        );

        if (!updateData || updateData === k500Error)
          return {
            valid: false,
            message: 'Failed to update esign id in loan entry!',
          };
        statusData.loan = -1;
        statusData.esign = 0;
        await this.masterRepo.updateRowData(
          { status: statusData },
          masterData.id,
        );
      } else {
        return {
          valid: false,
          message: 'Loan and esign id mismatch!',
        };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getSignatureStatus(req_data) {
    try {
      const url = 'https://api.signdesk.in/api/live/getSignatureStatus';
      const headers = {
        'Content-Type': 'application/json',
        'x-parse-rest-api-key': 'd12e8567d6c47f19ce7b15791c237aad',
        'x-parse-application-id':
          'lenditt-innovations--technologies-pvt-ltd_live_esign',
      };
      const body = { document_id: req_data.document_id };
      const response = await this.apiService.requestPost(url, body, headers);
      if (!response) return k500Error;
      return response;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async deleteEsign(options: any) {
    try {
      return await this.eSignRepo.distroy(options);
    } catch (error) {
      return null;
    }
  }

  async inviteForESign(
    loanId: number,
    inProcess = false,
    userId,
    typeOfDevice?: string,
  ) {
    try {
      // Refresh the EMI calculation
      await this.emiSharedService.refreshCalculation(loanId);
      // Validate and prepare data
      const preparedData = await this.validateAgreementRequest(
        loanId,
        inProcess,
      );
      if (preparedData == k500Error) return kInternalError;
      if (preparedData == false) return k422ErrorMessage(kSomthinfWentWrong);
      const masterData = preparedData.masterData;
      // Check for existence
      if (typeOfDevice != '2') {
        const existingData = await this.checkExistingData(preparedData);
        if (existingData == k500Error) return kInternalError;
        else if (existingData) return existingData;
        const esignData = await this.checkPageIsExpired(
          preparedData?.eSignData,
        );
        if (esignData) return esignData;
      }
      // Agreement creation
      const agreementData: any = await this.createAgreement(preparedData);
      if (agreementData == k500Error) return kInternalError;
      else if (agreementData == false)
        return k422ErrorMessage(kSomthinfWentWrong);
      else if (agreementData?.message) throw new Error();

      const result = await this.sendAgreementRequest(
        preparedData,
        agreementData.agreementPath,
        typeOfDevice,
      );
      // Save invitation response
      if (result == k500Error) return kInternalError;
      else if (result == false) return k422ErrorMessage(kSomthinfWentWrong);
      const rawData = {
        ...result,
        stampId: agreementData.stampId,
        eSign_agree_data: agreementData?.dynamicData ?? {},
      };
      let id;
      let status;
      const statusData = masterData.status;
      if (preparedData?.eSignData?.id) {
        id = preparedData?.eSignData?.id;
        status = preparedData?.eSignData?.status;
        statusData.eSign = +status;
        const update = await this.eSignRepo.updateRowData(rawData, id);
        if (update == k500Error) return kInternalError;
        else if (!update) return k422ErrorMessage(kSomthinfWentWrong);
      } else {
        const creationData = await this.esingRepo.createRawData(rawData);
        if (creationData == k500Error) return kInternalError;
        else if (!creationData) return k422ErrorMessage(kSomthinfWentWrong);
        id = creationData.id;
        status = creationData.status;
        statusData.eSign = +status;
      }
      if (!id) return k422ErrorMessage(kSomthinfWentWrong);
      const updatedData: any = { esign_id: id };
      if (inProcess) {
        updatedData.loanStatus = 'Accepted';
        statusData.loan = 1;
        statusData.eligibility = 1;
      }
      const updatedResult = await this.loanRepo.updateRowData(
        updatedData,
        loanId,
      );
      if (updatedResult == k500Error) return kInternalError;
      await this.masterRepo.updateRowData(
        { status: statusData },
        masterData.id,
      );
      await this.fileService.removeFile(agreementData.agreementPath);

      const ipCheck: any = await this.ipCheckService.ipCheck(userId, loanId);
      if (ipCheck == true) return { needUserInfo: true };

      return {
        id,
        quick_invite_url: rawData.quick_invite_url,
        status,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async sendAgreementRequest(
    loanData: loanTransaction,
    agreementPath: string,
    typeOfDevice: string,
  ) {
    try {
      let mode = await this.commonSharedService.getServiceName(kESignService);
      if (typeOfDevice && typeOfDevice == '2') mode = kZoop;
      if (!mode) mode = loanData?.eSignData?.esign_mode ?? ESIGN_SERVICE_MODE;
      const url = loanData?.eSignData?.signed_document ?? '';
      const birthYear = await this.typeService.getDateAsPerAadhaarDOB(
        loanData?.registeredUsers?.kycData?.aadhaarDOB,
      );
      const targetPath = await this.fileService.compressIfNeed(
        agreementPath,
        12000,
      );
      if (targetPath == k500Error) return k500Error;
      const signed_document = url ? url : await this.fileToUpload(targetPath);
      const userName = loanData.registeredUsers.fullName;
      const refDocId = this.getRandomId();
      const last4DigitAadhaar =
        loanData.registeredUsers.kycData.maskedAadhaar.split(' ')[2];
      const docInfo = {
        reference_doc_id: refDocId,
        content_type: 'PDF',
        content: await pdf2base64(targetPath),
        signature_sequence: 'parallel',
        custom: { name: userName },
      };
      let response;
      let data: any = {};
      if (mode == kVeri5) {
        const userData = loanData.registeredUsers;
        response = await this.veri5Service.uploadAggrementForVeri5(
          targetPath,
          userData,
        );
        data.reference_id = response?.requestId;
        if (!response.responseData || response == k500Error) return k500Error;
        const document_id = response?.responseData;
        response = await this.veri5Service.getEsignInviteLink(document_id);
        if (!response.invite_url || response == k500Error || !response)
          return k500Error;
        data.reference_doc_id = refDocId;
        data.esign_mode = kVeri5;
        data.document_id = document_id;
        data.quick_invite_url = response?.invite_url;
        data.docket_title = 'loan Agreement';
        data.signer_ref_id = this.getRandomId();
      } else if (mode == kSetu) {
        const userData = loanData.registeredUsers;
        const body = {
          name: userData?.fullName,
          path: targetPath,
          phone: userData?.phone,
        };
        const response: any = await this.setuService.setuInit(body);
        if (response === false || !response) return kInternalError;
        data.reference_id = this.getRandomId();
        data.reference_doc_id = refDocId;
        data.esign_mode = kSetu;
        data.document_id = response.documentId;
        data.quick_invite_url = response.signers[0].url;
        data.docket_title = 'loan Agreement';
        data.signer_ref_id = this.getRandomId();
        data.api_response_id = response.id;
      } else if (mode == kZoop) {
        const userData = loanData.registeredUsers;
        let city = 'Unknown';
        try {
          city =
            JSON.parse(userData?.kycData?.aadhaarAddress ?? '')?.dist ?? city;
          city = city?.replace(/\./g, '');
        } catch (e) {}

        const body = {
          name: userData?.fullName,
          email: userData?.email,
          city: city ?? userData?.city,
          path: targetPath,
        };

        // Remove special characters
        if (body?.city) {
          body.city = body?.city
            .replace(/\−/g, '')
            .replace(/\-/g, '')
            .replace(/\&/g, '')
            .replace(/\\/g, '');
        }

        response = await this.zoopService.esignInit(body);
        if (response === k500Error) return k500Error;
        if (response === false || !response) return kInternalError;
        const document_id = response;
        const url = await this.zoopService.openInHTMLAndGetURL(document_id);
        if (!url || url === k500Error) return k500Error;
        data.reference_id = this.getRandomId();
        data.reference_doc_id = refDocId;
        data.esign_mode = kZoop;
        data.document_id = document_id;
        data.quick_invite_url = url;
        data.docket_title = 'loan Agreement';
        data.signer_ref_id = this.getRandomId();
      } else {
        const signerInfo = {
          document_to_be_signed: refDocId,
          signer_position: { appearance: 'bottom-right' },
          signer_ref_id: this.getRandomId(),
          signer_email: loanData.registeredUsers.email,
          signer_name: userName,
          sequence: 1,
          page_number: 'all',
          signature_type: 'aadhaar',
          trigger_esign_request: true,
          esign_type: 'otp',
          signer_mobile: loanData.registeredUsers.phone,
          signer_remarks: EnvConfig.nbfc.appName,
          signer_validation_inputs: {
            year_of_birth: birthYear.substring(0, 4),
            gender: loanData.registeredUsers.gender[0],
            name_as_per_aadhaar: userName,
            last_four_digits_of_aadhaar: last4DigitAadhaar,
          },
        };
        const body = {
          reference_id: this.getRandomId(),
          docket_title: 'Loan Agreement',
          enable_email_notification: true,
          documents: [docInfo],
          signers_info: [signerInfo],
        };
        const url = 'https://api.signdesk.in/api/live/signRequest';
        const headers = {
          'Content-Type': 'application/json',
          'x-parse-rest-api-key': 'd12e8567d6c47f19ce7b15791c237aad',
          'x-parse-application-id':
            'lenditt-innovations--technologies-pvt-ltd_live_esign',
        };
        response = await this.apiService.post(url, body, headers);
        if (!response) return k500Error;
        else if (response.status != 'success') return false;
        data = { docket_id: response.docket_id };
        const successInfo = response.signer_info[0];
        data.esign_mode = mode;
        data.document_id = successInfo.document_id;
        data.api_response_id = response.api_response_id;
        data.quick_invite_url = successInfo.invitation_link;
        data.signer_ref_id = signerInfo.signer_ref_id;
        data.reference_id = body?.reference_id;
        data.docket_title = body.docket_title;
        data.reference_doc_id = docInfo.reference_doc_id;
      }
      data.last_four_digits_of_aadhaar = last4DigitAadhaar;
      data.name_as_per_aadhaar = loanData.registeredUsers.fullName;
      data.signer_email = loanData.registeredUsers.email;
      data.gender = loanData.registeredUsers.gender[0];
      data.signer_mobile = loanData.registeredUsers.phone;
      data.userId = loanData.userId;
      data.signer_name = loanData.registeredUsers.fullName;
      data.year_of_birth = birthYear.substring(0, 4);
      data.content_type = 'PDF';
      data.loanId = loanData.id;
      if (signed_document) data.signed_document = signed_document;
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async fileToUpload(filePath) {
    try {
      const newPath = './upload/' + new Date().getTime() + '.pdf';
      fs.copyFileSync(filePath, newPath);
      const url = await this.fileService.uploadFile(newPath, kTempAgreement);
      if (!url || url === k500Error) return '';
      return url;
    } catch (er) {}
  }

  private getRandomId() {
    return (
      EnvConfig.nbfc.nbfcCodeName +
      Math.random().toString(36).substring(2, 9) +
      Date.now()
    );
  }

  async checkPageIsExpired(eSignData) {
    try {
      if (eSignData) {
        if (eSignData?.esign_mode === kVeri5) {
          const url = eSignData.quick_invite_url;
          const browser = await puppeteer.launch(puppeteerConfig);
          const context = await browser.createIncognitoBrowserContext();
          const page = await context.newPage();
          await page.goto(url);
          await this.typeService.delay(1000);
          const html = await page.content();
          await browser.close();
          if (!html.includes('Page Expired'))
            return {
              id: eSignData.id,
              quick_invite_url: eSignData.quick_invite_url,
              status: eSignData.status,
            };
        } else
          return {
            ////
            id: eSignData.id,
            quick_invite_url: eSignData.quick_invite_url,
            status: eSignData.status,
          };
      }
    } catch (error) {}
  }

  private async checkExistingData(loanData: loanTransaction) {
    try {
      const loanId = loanData.id;
      const attributes = ['id', 'quick_invite_url', 'status'];
      const options = { where: { loanId } };
      const existingData = await this.esingRepo.getRowWhereData(
        attributes,
        options,
      );
      return existingData;
    } catch (error) {
      console.log({ error });
      return k500Error;
    }
  }

  private async validateAgreementRequest(loanId: number, inProcess: boolean) {
    try {
      // Validate loan flow
      const bankingAttributes = ['mandateAccount', 'mandateIFSC'];
      const bankingInclude = {
        model: BankingEntity,
        attributes: bankingAttributes,
      };
      const purposeAttributes = ['id', 'purposeName'];
      const purposeInclude = {
        model: loanPurpose,
        attributes: purposeAttributes,
      };
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = ['image'];
      const userAttributes = [
        'id',
        'email',
        'fullName',
        'gender',
        'phone',
        'city',
        'uniqueId',
      ];
      const userInclude = {
        model: registeredUsers,
        attributes: userAttributes,
        include: [
          selfieInclude,
          {
            model: KYCEntity,
            attributes: [
              'maskedAadhaar',
              'aadhaarAddress',
              'profileImage',
              'aadhaarDOB',
              'panCardNumber',
              'aadhaarResponse',
              'aadhaarAddressResponse',
              'pincode',
              'updatedAt',
            ],
          },
        ],
      };

      const attri = [
        'id',
        'signed_document',
        'quick_invite_url',
        'esign_mode',
        'status',
        'stampId',
      ];
      const eSignInclude = { model: esignEntity, attributes: attri };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'status', 'dates'],
      };
      const include = [
        bankingInclude,
        purposeInclude,
        userInclude,
        eSignInclude,
        masterInclude,
      ];
      const options: any = { where: { id: loanId } };
      options.include = include;
      const attributes = [
        'approvedDuration',
        'interestRate',
        'loanFees',
        'loanStatus',
        'manualVerification',
        'netEmiData',
        'netApprovedAmount',
        'stampFees',
        'TotalRepayAmount',
        'updatedAt',
        'userId',
        'charges',
        'insuranceDetails',
        'insuranceOptValue',
        'nomineeDetail',
        'processingFees',
        'appType',
        'esign_id',
        'eligibilityDetails',
      ];
      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (!loanData) return false;
      else if (loanData == k500Error) return k500Error;
      else if (loanData.loanStatus != 'Accepted' && !inProcess) return false;
      const isLoanApproved =
        loanData.manualVerification == '1' ||
        loanData.manualVerification == '3';
      if (!isLoanApproved) return false;

      const bankingData = loanData.bankingData;
      let netApprovedAmount = loanData.netApprovedAmount;
      // Validate subscription status
      const subscriptionData =
        await this.sharedMandateService.checkExistingStatus(
          null,
          null,
          bankingData.mandateAccount,
          loanData.userId,
          netApprovedAmount,
        );
      if (subscriptionData == k500Error) return k500Error;
      else if (!subscriptionData) return false;
      const mode = subscriptionData.mode;
      const subscriptionStatus = subscriptionData.status;
      const isMandateRegistered =
        (mode == 'CASHFREE' &&
          (subscriptionStatus == 'BANK_APPROVAL_PENDING' ||
            subscriptionStatus == 'ACTIVE' ||
            subscriptionStatus == 'ON_HOLD')) ||
        (mode == 'SIGNDESK' && subscriptionStatus == 'Registered') ||
        (mode == 'RAZORPAY' && subscriptionStatus == 'ACTIVE');
      if (!isMandateRegistered) return false;
      loanData.id = loanId;
      if (loanData.registeredUsers && loanData.registeredUsers.phone) {
        loanData.registeredUsers.phone = await this.cryptService.decryptPhone(
          loanData.registeredUsers.phone,
        );
      }
      // This condition work not work in production
      if (!gIsPROD)
        if (
          !(
            loanData?.registeredUsers?.email.includes(
              EnvConfig.emailDomain.companyEmailDomain1,
            ) ||
            loanData?.registeredUsers?.email.includes(
              EnvConfig.emailDomain.companyEmailDomain2,
            )
          )
        )
          return k422ErrorMessage(kSomthinfWentWrong);
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async createAgreement(loanData: loanTransaction) {
    try {
      try {
        const url = loanData?.eSignData?.signed_document;
        if (loanData?.eSignData && url) {
          const filePath = await this.fileService.urlToBuffer(url, true, 'pdf');
          if (filePath && filePath !== k500Error)
            return {
              agreementPath: filePath,
              stampId: loanData?.eSignData?.stampId,
            };
        }
      } catch (error) {}

      let stampData = null;
      let stampImage = null;
      // Reserve the stamp
      if (isStamp) {
        const attributes = ['id', 'certificateNo', 'stampImage'];
        const options = { where: { takenStatus: '0', signStatus: '0' } };
        stampData = await this.stampRepo.getRowWhereData(attributes, options);
        if (stampData == k500Error) return k500Error;
        else if (!stampData) return false;
        stampImage = stampData.stampImage;
        // this code need to compress stampImage image for agrement
        // any time delete compress bucket in google colud
        const filePath: any = await this.fileService.sharpCompression(
          stampData.stampImage,
        );
        if (filePath && filePath != k500Error)
          if (!filePath?.message) stampImage = filePath;
        const updatedData = {
          takenStatus: '1',
          takenStatusDate: new Date().toJSON(),
        };
        const reserveData = await this.stampRepo.updateRowData(
          updatedData,
          stampData.id,
        );
        if (reserveData == k500Error) return k500Error;
      }
      const preparedData = await this.prepareAgreementObject(
        loanData,
        stampData?.certificateNo,
      );
      if (preparedData == k500Error) return preparedData;

      //Individual PDF page creation
      let currentPage;
      const allPages = preparedData?.preparedData;
      const nextPages: string[] = [];
      for (let index = 0; index < allPages.length; index++) {
        const pageData = allPages[index];
        const pdfPath = await this.fileService.dataToPDF(pageData);
        if (pdfPath == k500Error) return k500Error;
        if (index == 0) currentPage = pdfPath.toString();
        else nextPages.push(pdfPath.toString());
        if (isStamp) {
          if (index == 5) nextPages.push(stampImage);
        }
      }
      const agreementPath = await this.fileService.mergeMultiplePDF(
        nextPages,
        currentPage,
      );
      if (agreementPath == k500Error) return k500Error;
      await this.fileService.removeFiles([...nextPages, currentPage]);
      if (isStamp) {
        return { agreementPath, stampId: stampData.id };
      }
      const userData = loanData.registeredUsers;
      const key = `${userData?.id}_USER_PROFILE`;
      await this.redisService.del(key);
      return { agreementPath, dynamicData: preparedData?.dynamicData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async prepareAgreementObject(
    loanData: loanTransaction,
    certificateNo: any,
  ) {
    try {
      const dynamicData = await this.convertDataToObject(
        loanData,
        certificateNo,
      );
      if (dynamicData == k500Error) return dynamicData;
      if (dynamicData?.message) throw new Error();

      //Page 01 - KFS - 01
      const path01 = `./upload/templateDesign${templateDesign}/agreement/KFS_01.hbs`;
      const page01 = await this.fileService.hbsHandlebars(path01, dynamicData);
      if (page01 == k500Error) return page01;

      //Page 011 - Grievance Redressal mechanism
      const path011 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal.hbs`;
      const page011 = await this.fileService.hbsHandlebars(
        path011,
        dynamicData,
      );
      if (page011 == k500Error) return page011;

      //Page 012 - KFS - 03
      const path012 = `./upload/templateDesign${templateDesign}/agreement/KFS_03.hbs`;
      const page012 = await this.fileService.hbsHandlebars(
        path012,
        dynamicData,
      );
      if (page012 == k500Error) return path012;

      //Page 02 - Sanction letter - 01
      const path02 = `./upload/templateDesign${templateDesign}/agreement/sanction_letter_01.hbs`;
      const page02 = await this.fileService.hbsHandlebars(path02, dynamicData);
      if (page02 == k500Error) return page02;

      //Page 03 - Sanction letter - 02
      const path03 = `./upload/templateDesign${templateDesign}/agreement/sanction_letter_02.hbs`;
      const page03 = await this.fileService.hbsHandlebars(path03, dynamicData);
      if (page03 == k500Error) return page03;

      //Page 04 - self-declaration-1
      const path04 = `./upload/templateDesign${templateDesign}/agreement/self-declaration-1.hbs`;
      const page04 = await this.fileService.hbsHandlebars(path04, dynamicData);
      if (page04 == k500Error) return page04;

      //page 05 - self-declaration-2
      const path05 = `./upload/templateDesign${templateDesign}/agreement/self-declaration-2.hbs`;
      const page05 = await this.fileService.hbsHandlebars(path05, dynamicData);
      if (page05 == k500Error) return page05;

      //Page 06 - ekyc page
      const path06 = `./upload/templateDesign${templateDesign}/agreement/ekyc.hbs`;
      const page06 = await this.fileService.hbsHandlebars(path06, dynamicData);
      if (page06 == k500Error) return page06;

      //Page 013 - Grievance Redressal 01
      const path013 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal_01.hbs`;
      const page013 = await this.fileService.hbsHandlebars(
        path013,
        dynamicData,
      );
      if (page013 == k500Error) return path013;

      //Page 014 - Grievance Redressal 02
      const path014 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal_02.hbs`;
      const page014 = await this.fileService.hbsHandlebars(
        path014,
        dynamicData,
      );
      if (page014 == k500Error) return path014;

      //Page 07 - Agreement page - 01
      const path07 = `./upload/templateDesign${templateDesign}/agreement/agreement_01.hbs`;
      const page07 = await this.fileService.hbsHandlebars(path07, dynamicData);
      if (page07 == k500Error) return page07;

      //Page 08 - Agreement page - 02
      const path08 = `./upload/templateDesign${templateDesign}/agreement/agreement_02.hbs`;
      const page08 = await this.fileService.hbsHandlebars(path08, dynamicData);
      if (page08 == k500Error) return page08;

      //Page 09 - Agreement page - 03
      const path09 = `./upload/templateDesign${templateDesign}/agreement/agreement_03.hbs`;
      const page09 = await this.fileService.hbsHandlebars(path09, dynamicData);
      if (page09 == k500Error) return page09;

      //Page 10 - Agreement page - 04
      const path10 = `./upload/templateDesign${templateDesign}/agreement/agreement_04.hbs`;
      const page10 = await this.fileService.hbsHandlebars(path10, dynamicData);
      if (page10 == k500Error) return page10;

      let preparedData = [
        page01,
        page011,
        page012,
        page02,
        page03,
        page04,
        page05,
        page06,
        page013,
        page014,
        page07,
        page08,
        page09,
        page10,
      ];

      //Page 01 - KFS - 01
      const path_hindi_01 = `./upload/templateDesign${templateDesign}/agreement/KFS_HINDI_01.hbs`;
      const page_hindi_01 = await this.fileService.hbsHandlebars(
        path_hindi_01,
        dynamicData,
      );
      if (page_hindi_01 == k500Error) return page_hindi_01;

      //Page 011 - Grievance Redressal mechanism
      const path_hindi_011 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal_hindi.hbs`;
      const page_hindi_011 = await this.fileService.hbsHandlebars(
        path_hindi_011,
        dynamicData,
      );
      if (page_hindi_011 == k500Error) return page_hindi_011;

      //Page 012 - KFS - 03
      const path_hindi_012 = `./upload/templateDesign${templateDesign}/agreement/KFS_HINDI_03.hbs`;
      const page_hindi_012 = await this.fileService.hbsHandlebars(
        path_hindi_012,
        dynamicData,
      );
      if (page_hindi_012 == k500Error) return page_hindi_012;

      //Page 02 - Sanction letter - 01
      const path_hindi_02 = `./upload/templateDesign${templateDesign}/agreement/sanction_letter_hindi_01.hbs`;
      const page_hindi_02 = await this.fileService.hbsHandlebars(
        path_hindi_02,
        dynamicData,
      );
      if (page_hindi_02 == k500Error) return page_hindi_02;

      //Page 03 - Sanction letter - 02
      const path_hindi_03 = `./upload/templateDesign${templateDesign}/agreement/sanction_letter_hindi_02.hbs`;
      const page_hindi_03 = await this.fileService.hbsHandlebars(
        path_hindi_03,
        dynamicData,
      );
      if (page_hindi_03 == k500Error) return page_hindi_03;

      //Page 04 - self-declaration-1
      const path_hindi_04 = `./upload/templateDesign${templateDesign}/agreement/self_declaration_hindi-1.hbs`;
      const page_hindi_04 = await this.fileService.hbsHandlebars(
        path_hindi_04,
        dynamicData,
      );
      if (page_hindi_04 == k500Error) return page_hindi_04;

      //page 05 - self-declaration-2
      const path_hindi_05 = `./upload/templateDesign${templateDesign}/agreement/self_declaration_hindi-2.hbs`;
      const page_hindi_05 = await this.fileService.hbsHandlebars(
        path_hindi_05,
        dynamicData,
      );
      if (page_hindi_05 == k500Error) return page_hindi_05;

      //Page 06 - ekyc page
      const path_hindi_06 = `./upload/templateDesign${templateDesign}/agreement/ekyc_hindi.hbs`;
      const page_hindi_06 = await this.fileService.hbsHandlebars(
        path_hindi_06,
        dynamicData,
      );
      if (page_hindi_06 == k500Error) return page_hindi_06;

      //Page 013 - Grievance Redressal 01
      const path_hindi_013 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal_hindi_01.hbs`;
      const page_hindi_013 = await this.fileService.hbsHandlebars(
        path_hindi_013,
        dynamicData,
      );
      if (page_hindi_013 == k500Error) return page_hindi_013;

      //Page 014 - Grievance Redressal 02
      const path_hindi_014 = `./upload/templateDesign${templateDesign}/agreement/grievance_redressal_hindi_02.hbs`;
      const page_hindi_014 = await this.fileService.hbsHandlebars(
        path_hindi_014,
        dynamicData,
      );
      if (page_hindi_014 == k500Error) return page_hindi_014;

      //Page 07 - Agreement page - 01
      const path_hindi_07 = `./upload/templateDesign${templateDesign}/agreement/agreement_hindi_01.hbs`;
      const page_hindi_07 = await this.fileService.hbsHandlebars(
        path_hindi_07,
        dynamicData,
      );
      if (page_hindi_07 == k500Error) return page_hindi_07;

      //Page 08 - Agreement page - 02
      const path_hindi_08 = `./upload/templateDesign${templateDesign}/agreement/agreement_hindi_02.hbs`;
      const page_hindi_08 = await this.fileService.hbsHandlebars(
        path_hindi_08,
        dynamicData,
      );
      if (page_hindi_08 == k500Error) return page_hindi_08;

      //Page 09 - Agreement page - 03
      const path_hindi_09 = `./upload/templateDesign${templateDesign}/agreement/agreement_hindi_03.hbs`;
      const page_hindi_09 = await this.fileService.hbsHandlebars(
        path_hindi_09,
        dynamicData,
      );
      if (page_hindi_09 == k500Error) return page_hindi_09;

      //Page 10 - Agreement page - 04
      const path_hindi_10 = `./upload/templateDesign${templateDesign}/agreement/agreement_hindi_04.hbs`;
      const page_hindi_10 = await this.fileService.hbsHandlebars(
        path_hindi_10,
        dynamicData,
      );
      if (page_hindi_10 == k500Error) return page_hindi_10;

      const hindiPages = [
        page_hindi_01,
        page_hindi_011,
        page_hindi_012,
        page_hindi_02,
        page_hindi_03,
        page_hindi_04,
        page_hindi_05,
        page_hindi_06,
        page_hindi_013,
        page_hindi_014,
        page_hindi_07,
        page_hindi_08,
        page_hindi_09,
        page_hindi_10,
      ];
      preparedData.push(...hindiPages);

      return { preparedData, dynamicData };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private async convertDataToObject(
    loanData: loanTransaction,
    certificateNo: any,
  ) {
    try {
      const userData = loanData.registeredUsers;
      const rawAddress = userData.kycData.aadhaarAddress;
      const mobileNumber = userData.phone;
      const uniqueId = userData.uniqueId;
      const aadhaarAddress = this.typeService.addressFormat(rawAddress);
      const updatedAt = this.typeService.getGlobalDate(loanData.updatedAt);
      const updatedDate = this.typeService.getDateFormated(updatedAt);
      const emiDetails: any = this.getEmiDetails(loanData.netEmiData);
      if (emiDetails === k500Error) return emiDetails;
      const emiData = emiDetails?.emiData ?? [];
      const emiStartDate = emiData[0]?.dueDate ?? '-';
      const emiEndDate = emiData[emiData.length - 1]?.dueDate ?? '-';
      const charges: any = loanData?.charges ?? {};
      const netApprovedAmount = +(loanData?.netApprovedAmount ?? 0);
      // Online convenience fees
      const onlineConvenienceCharge = this.typeService.manageAmount(
        charges?.insurance_fee ?? 0,
      );
      const riskAssessmentPr = loanData?.charges?.risk_assessment_per ?? '';
      const riskAssessmentCharge = this.typeService.manageAmount(
        loanData?.charges?.risk_assessment_charge ?? 0,
      );
      const appType = loanData?.appType;
      let editedloanFees =
        +(loanData?.loanFees ?? 0) -
        +(charges?.gst_amt ?? 0) -
        +(charges?.doc_charge_amt ?? 0) -
        +(charges?.insurance_fee ?? 0) -
        +(charges?.risk_assessment_charge ?? 0);
      editedloanFees = this.typeService.manageAmount(editedloanFees);

      const editedStampFees =
        '₹' + this.typeService.amountNumberWithCommas(loanData?.stampFees ?? 0);
      const docCharge = this.typeService.manageAmount(
        charges?.doc_charge_amt ?? 0,
      );
      const documentChargeAmount =
        '₹' + this.typeService.amountNumberWithCommas(docCharge);
      const sgstChargeAmount =
        '₹' +
        this.typeService.amountNumberWithCommas(
          (charges?.sgst_amt ?? 0).toFixed(2),
        );
      const cgstChargeAmount =
        '₹' +
        this.typeService.amountNumberWithCommas(
          (charges?.cgst_amt ?? 0).toFixed(2),
        );
      const day = updatedAt.getDate();
      const month = kMonths[updatedAt.getMonth()];
      const year = updatedAt.getFullYear();
      const readableDate = `${day} day of ${month}, ${year}`;

      const appName = appType == 1 ? kInfoBrandNameNBFC : kInfoBrandName;
      let companySupportEmail = kSupportMail;
      let companyCollectionEmail = kCollectionEmail;
      let companyPhonenumber = kHelpContact;
      // Insurance details

      const insuranceDetails = loanData?.insuranceDetails ?? {};
      const insuranceTotalFee = insuranceDetails.totalPremium ?? 0;
      const insuranceBy = insuranceTotalFee > 0 ? 'Care Health & Acko' : '-';
      let purposeName = OTHER_PURPOSE_NAME;
      if (loanData?.purpose?.id != OTHER_PURPOSE_ID)
        purposeName = loanData.purpose?.purposeName ?? OTHER_PURPOSE_NAME;

      const selfieImage = userData?.selfieData?.image;
      /// this code need to compress profile image for agrement
      /// any time delete compress bucket in google colud
      const selfie = await this.fileService.sharpCompression(selfieImage);
      if (!selfie || selfie === k500Error) return kInternalError;
      if (selfie?.message) return selfie;
      const selfieCSS = await this.fileService.getOrientationCSS(selfieImage);
      const signingDate = this.typeService.getDateFormatted(new Date());
      // 19 above
      let anumm = 146;
      let penaltyPerAnnum = anumm;
      let disbursedAmount = 0;
      let aprCharges = 0;
      const eligibilityDetails: any = loanData?.eligibilityDetails;
      const eliAnumm = eligibilityDetails?.anummIntrest;
      try {
        if (eliAnumm) {
          anumm = eliAnumm;
        } else {
          anumm = +loanData.interestRate * 365;
          anumm = +anumm.toFixed(3);
        }
        anumm = +anumm.toFixed(3);
        penaltyPerAnnum = anumm;
        penaltyPerAnnum = +penaltyPerAnnum.toFixed(3);
        disbursedAmount =
          netApprovedAmount -
          +(loanData?.loanFees ?? 0) -
          +(loanData?.stampFees ?? 0) -
          +(insuranceTotalFee ?? 0);
        const totalInterest = parseFloat(
          emiDetails.total.interest.replace('₹', '').replace(/,/g, ''),
        );
        const percentageChange =
          ((totalInterest + +(loanData?.loanFees ?? 0)) / disbursedAmount) *
          100;
        aprCharges = (percentageChange * 365) / +loanData.approvedDuration;
        aprCharges = +aprCharges.toFixed(2);
      } catch (error) {}
      disbursedAmount = this.typeService.manageAmount(
        disbursedAmount,
        disburseAmt,
      );

      // Reference details
      const referenceData = [];
      if (GLOBAL_FLOW.REFERENCE_IN_APP) {
        let refList: any = await this.referenceRepo.findOne(
          ['contacts', 'createdAt'],
          { where: { userId: userData.id }, order: [['id', 'DESC']] },
        );
        if (refList == k500Error) refList = null;
        const contactData = refList?.contacts ?? [];
        contactData.sort((a, b) => {
          const name1 = a?.name ? a?.name.toLowerCase() : '-';
          const name2 = b?.name ? b?.name.toLowerCase() : '-';
          if (name1 < name2) return -1;
          if (name1 > name2) return 1;
          return 0;
        });
        let createdAt = refList?.createdAt;
        try {
          const refHour = createdAt?.getHours();
          const refMins = createdAt?.getMinutes();
          createdAt = this.typeService.getDateFormatted(createdAt);
          createdAt = `${createdAt} ${refHour}:${refMins}`;
        } catch (error) {}
        for (let i = 0; i < 5; i++) {
          try {
            const contactItem = refList?.contacts[i];
            if (contactItem)
              referenceData.push({
                id: i + 1,
                refName: contactItem?.name ?? '-',
                refPhone: contactItem?.number ?? '-',
                refPermissionDate: createdAt,
                refGivenBy: userData?.fullName ?? '-',
              });
          } catch (error) {}
        }
      }
      //Automation contact refernce
      let usedReferences;
      if (loanData.masterData.status.reference === 4)
        usedReferences =
          'Your previous reference contact number is used in this new loan agreement.';
      let isRiskAssessmentCharge = riskAssessmentCharge > 0 ? true : false;
      const offlineEkycObj = await this.typeService.prepareOfflineEkycObj(
        loanData?.registeredUsers?.kycData,
        loanData?.registeredUsers?.fullName,
        loanData?.registeredUsers?.gender,
        loanData?.masterData?.dates,
      );

      const aadhaarCSS = await this.fileService.getOrientationCSS(
        offlineEkycObj?.aadhaarImgae,
      );
      let isInsuranceCharge = insuranceTotalFee > 0 ? true : false;
      const insuranceCharge = this.stringService.readableAmount(
        insuranceTotalFee.toFixed(2) ?? 0,
      );
      let showLendingPartner = appType == 0 ? true : false;
      const nbfcLogo = EnvConfig.url.nbfcLogo;
      const legalNoticeAddress = EnvConfig.nbfc.legalNoticeAddress;
      const nbfcGrievance = EnvConfig.nbfc.nbfcGrievance;
      const nbfcIrmodel = EnvConfig.nbfc.nbfcIrmodel;
      const companyGrievanceEmail = EnvConfig.mail.grievanceMail;
      const grievanceNumber = EnvConfig.number.grievanceNumber;
      const grievanceOfficer = EnvConfig.nbfc.nbfcGrievanceOfficer;
      const legalSignLink = EnvConfig.mail.legalSignLink;
      let preparedObject: any = {
        showLendingPartner,
        nbfcLogo,
        legalNoticeAddress,
        nbfcGrievance,
        nbfcIrmodel,
        grievanceNumber,
        grievanceOfficer,
        legalSignLink,
        // kfs01
        borrowerImg: selfie,
        selfieCSS,
        signingDate,
        borrowerName: userData.fullName,
        nbfcName: NBFC_NAME,
        loanId: loanData.id,
        loanAmount:
          '₹' + this.typeService.amountNumberWithCommas(netApprovedAmount),
        loanTenure: loanData.approvedDuration,
        interestRatePerDay: loanData.interestRate,
        numberOfEmis: emiData?.length,
        interestRateFixed: anumm,
        totalInterestAmount: emiDetails.total.interest,
        loanStartDate: updatedDate,
        emiStartDate,
        emiEndDate,
        aprCharges,
        insuranceBy,
        processingPercentage: loanData.processingFees,
        processingAmount:
          '₹' + this.typeService.amountNumberWithCommas(editedloanFees),
        documentPercentage: charges?.doc_charge_per ?? '-',
        documentAmount: documentChargeAmount,
        sgstCharges: sgstChargeAmount,
        cgstCharges: cgstChargeAmount,
        onlineConvenienceCharge:
          '₹' +
          this.typeService.amountNumberWithCommas(onlineConvenienceCharge),
        insuranceCharge,
        showDeferredInterest: GLOBAL_FLOW.SHOW_DEFERRED_INTEREST,
        penaltyRatePerDay: +loanData?.interestRate,
        foreclosureCharge: GLOBAL_CHARGES.FORECLOSURE_PERC,
        penaltyRatePerAnnum: penaltyPerAnnum,
        referenceData,
        companySupportEmail,
        companyCollectionEmail,
        companyGrievanceEmail,
        companyPhonenumber,
        LOAN_AGREEMENT_COOLINGOFF_PERIOD,
        customerId: uniqueId,
        //contact reference
        usedReferences,
        // sanction 01
        applicationDate: updatedDate,
        aadhaarAddress,
        purposeName,
        mobileNumber,
        emiData: emiDetails.emiData,
        emiTotalPrincipal: emiDetails.total.principal,
        emiTotalInterest: emiDetails.total.interest,
        emiTotalDays: emiDetails.total.days,
        emiInterestRate: emiDetails.total.rateOfInterest,
        emiTotalAmount: emiDetails.total.amount,
        isInsuranceCharge,
        disbursementAmount:
          '₹' + this.typeService.amountNumberWithCommas(disbursedAmount),
        // sanction 02
        // agreement01
        borrowerEmail: userData.email,
        agreementDate: readableDate,
        panNumber: userData.kycData.panCardNumber,
        appName: appName,
        nbfcAddress: EnvConfig.nbfc.nbfcAddress,
        // agreement 04
        dayOfSignature: day,
        monthOfSignature: month,
        yearOfSignature: year,
        isStamp,
        isRiskAssessmentCharge,
        riskAssessmentPr,
        riskAssessmentCharge: '₹' + riskAssessmentCharge,
        //offline ekyc
        aadhaarNumber: offlineEkycObj?.aadhaarNumber,
        aadhharImage: offlineEkycObj?.aadhaarImgae,
        aadhaarCSS: aadhaarCSS,
        gender: offlineEkycObj?.gender,
        dateOfBirth: offlineEkycObj?.dateOfBirth,
        careOf: offlineEkycObj?.careOf,
        houseNo: offlineEkycObj?.houseNo,
        street: offlineEkycObj?.street,
        landmark: offlineEkycObj?.landmark,
        PostOffice: offlineEkycObj?.PostOffice,
        locality: offlineEkycObj?.locality,
        vtc: offlineEkycObj?.vtc,
        subDistrict: offlineEkycObj?.subDistrict,
        district: offlineEkycObj?.district,
        state: offlineEkycObj?.state,
        pincode: offlineEkycObj?.pincode,
        timeStampOfflineEKyc: offlineEkycObj?.timeStampOfflineEKyc,
        legalCharge: this.typeService.amountNumberWithCommas(
          GLOBAL_CHARGES.LEGAL_CHARGE,
        ),
      };
      if (certificateNo) {
        preparedObject.stampNumber = certificateNo;
        preparedObject.stampCharges = editedStampFees;
      }
      return preparedObject;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  private getEmiDetails(rawData: string[]) {
    try {
      const emiData = [];
      let totalDays = 0;
      let totalPrincipal = 0;
      let totalIntererst = 0;
      let rateOfInterest = 0;
      for (let index = 0; index < rawData?.length; index++) {
        try {
          const data = rawData[index] ? JSON.parse(rawData[index]) : {};
          const dueDate = this.typeService.getDateFormated(data.Date);
          const principal = +(data.PrincipalCovered ?? 0);
          const interest = +(data.InterestCalculate ?? 0);
          const dueAmount = +(data.Emi ?? 0);
          totalPrincipal += principal;
          totalIntererst += interest;
          totalDays += data?.Days ?? 0;
          rateOfInterest = data?.RateofInterest ?? '';
          const tempEMIObj = {
            id: index + 1,
            dueDate,
            principal: '₹' + this.typeService.amountNumberWithCommas(principal),
            interest: '₹' + this.typeService.amountNumberWithCommas(interest),
            days: data.Days,
            interestRate: rateOfInterest,
            dueAmount: '₹' + this.typeService.amountNumberWithCommas(dueAmount),
          };
          emiData.push(tempEMIObj);
        } catch (error) {}
      }
      totalPrincipal = this.typeService.manageAmount(totalPrincipal);
      totalIntererst = this.typeService.manageAmount(totalIntererst);
      const totalPremium = totalPrincipal + totalIntererst;
      return {
        emiData,
        total: {
          principal:
            '₹' + this.typeService.amountNumberWithCommas(totalPrincipal),
          interest:
            '₹' + this.typeService.amountNumberWithCommas(totalIntererst),
          days: totalDays,
          rateOfInterest,
          amount: '₹' + this.typeService.amountNumberWithCommas(totalPremium),
        },
      };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async checkStatus(body) {
    try {
      // Params validation
      if (!body.loanId) return kParamMissing('loanId');

      const loanId = body.loanId;
      const attributes = ['userId', 'id', 'esign_id'];
      const eSignInclude: any = { model: esignEntity };
      eSignInclude.attributes = [
        'document_id',
        'docket_id',
        'esign_mode',
        'id',
        'status',
        'signed_document_upload',
        'response',
        'api_response_id',
      ];
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['fullName', 'fcmToken', 'appType'];
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'status', 'rejection', 'dates'],
      };
      const include = [eSignInclude, userInclude, masterInclude];
      const options = { include, where: { id: loanId } };

      const loanData = await this.loanRepo.getRowWhereData(attributes, options);
      if (loanData == k500Error) return kInternalError;
      else if (!loanData) return kInternalError;
      const eSignData = loanData?.eSignData;
      if (!eSignData) return kInternalError;

      //* appsFlyer events to be triggerd on successful eSign.
      const eSignEventTriggers = ['Disbursement'];
      let statusResponse: any = {};

      //checking if already eSign done then will not send push notification again
      if (eSignData?.status === '1') {
        const userId = loanData?.userId;
        statusResponse.isSigned = true;
        statusResponse.eventTriggers = eSignEventTriggers;
        return { ...statusResponse, userId };
      }

      let updatedData: any = {};
      const masterData = loanData?.masterData;
      const userData = loanData.registeredUsers;
      const appType = userData?.appType;
      const userId = loanData.userId;
      const statusData = masterData.status;
      const dates = masterData?.dates ?? {};
      const docId = eSignData.document_id;

      if (eSignData.esign_mode == kVeri5) {
        statusResponse = await this.veri5Service.checkEsignStatusAndDownaload(
          docId,
        );
        if (statusResponse.isSigned) {
          const signerName = statusResponse.signerName;
          const userName = loanData.registeredUsers?.fullName;
          let checkNameMatch = false;
          const isNameMissMatch: any = await this.validation.nameMatch(
            signerName,
            userName,
            appType,
          );
          if (isNameMissMatch?.valid) {
            if (isNameMissMatch.data >= NAME_MISS_MATCH_PER)
              checkNameMatch = true;
            else checkNameMatch = false;
          } else
            checkNameMatch = this.checkEsignNameMatch(signerName, userName);
          if (!checkNameMatch) {
            statusResponse.isSigned = false;
            updatedData = { nameMissMatch: true };
          } else {
            updatedData = { status: '1' };
            statusResponse.eventTriggers = eSignEventTriggers;
          }
        }
      } else if (eSignData.esign_mode == kZoop) {
        try {
          const result: any = await this.zoopService.checkStatusOfeSing(docId);
          if (result === false) return {};
          if (!result) return kInternalError;
          if (result?.message) return result;
          if (eSignData?.response) delete result.response;
          updatedData = result;
          // Check If ip is Indian before proceeding
          if (result.status == '1') {
            const isIndianIp: any = await this.ipCheckService.ipCheck(
              userId,
              loanId,
            );
            if (isIndianIp?.message) return isIndianIp;
            // Ip outside of india
            if (isIndianIp == true) {
              updatedData.status = '2';
              updatedData.ipChecked = false;
              updatedData.ipChecked_date = new Date().toJSON();
              await this.eSignRepo.updateRowData(updatedData, eSignData.id);
              return { userId };
            }

            updatedData.ipChecked = true;
            updatedData.ipChecked_date = new Date().toJSON();
          }
          statusResponse = {
            isSigned: result?.status === '1' ? true : false,
          };
          if (result.status == '1') {
            statusResponse.eventTriggers = eSignEventTriggers;
            const fcmToken = userData.fcmToken;
            await this.sharedNotificationService.sendPushNotification(
              fcmToken,
              keSignSuccessNotify,
              kWaitForDisbursement,
            );
          }
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      } else if (eSignData.esign_mode == kSetu) {
        try {
          const id = eSignData.api_response_id;
          const result: any = await this.setuService.checkStatusOfeSign(id);
          if (result === false) return {};
          if (!result) return kInternalError;
          if (result?.message) return result;
          if (eSignData?.response) delete result.response;
          updatedData = result;
          // Check If ip is Indian before proceeding
          if (result.status == '1') {
            const isIndianIp: any = await this.ipCheckService.ipCheck(
              userId,
              loanId,
            );
            if (isIndianIp?.message) return isIndianIp;
            // Ip outside of india
            if (isIndianIp == true) {
              updatedData.status = '2';
              updatedData.ipChecked = false;
              updatedData.ipChecked_date = new Date().toJSON();
              await this.eSignRepo.updateRowData(updatedData, eSignData.id);
              return { userId };
            }
            updatedData.ipChecked = true;
            updatedData.ipChecked_date = new Date().toJSON();
          }
          statusResponse = {
            isSigned: result?.status === '1' ? true : false,
          };
          if (result.status == '1') {
            statusResponse.eventTriggers = eSignEventTriggers;
            const fcmToken = userData.fcmToken;
            await this.sharedNotificationService.sendPushNotification(
              fcmToken,
              keSignSuccessNotify,
              kWaitForDisbursement,
            );
          }
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      } else {
        statusResponse = await this.signDeskService.checkESignStatus(docId);
        if (statusResponse['message'])
          return k422ErrorMessage(statusResponse['message']);
        updatedData = { status: statusResponse.isSigned ? '1' : '0' };
        if (statusResponse.isSigned) {
          statusResponse.eventTriggers = eSignEventTriggers;
        }
      }

      if (
        updatedData.status == '1' &&
        !(eSignData?.signed_document_upload ?? '')
      )
        if (eSignData.esign_mode == kVeri5)
          await this.getSignedAgreement(
            eSignData.id,
            docId,
            '',
            statusResponse.fileContent,
            eSignData.esign_mode,
          );
        else if (eSignData.esign_mode != kZoop)
          await this.getSignedAgreement(
            eSignData.id,
            docId,
            eSignData.docket_id,
            null,
            eSignData.esign_mode,
          );
      const updateResponse = await this.eSignRepo.updateRowData(
        updatedData,
        eSignData.id,
      );
      statusData.eSign = updatedData?.status == '1' ? 1 : 0;
      dates.eSign = updatedData?.status == '1' ? new Date().getTime() : 0;
      if (updatedData?.status == '1')
        if (statusData.disbursement != 1) statusData.disbursement = 0;
      await this.masterRepo.updateRowData(
        { status: statusData, dates },
        masterData.id,
      );
      if (updateResponse == k500Error) return kInternalError;

      if (body?.typeofdevice)
        await this.loanRepo.updateRowData(
          { finalTypeOfDevice: body?.typeofdevice },
          loanId,
        );

      return { ...statusResponse, userId };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private checkEsignNameMatch(name1, name2) {
    try {
      const probability = this.validation.getTextProbability(name1, name2);
      if (probability < 50) return false;
      else true;
    } catch (error) {
      return true;
    }
  }

  private async getSignedAgreement(
    id,
    document_id: string,
    docket_id: string,
    fileContent = null,
    eSignMode: 'SIGNDESK' | 'VERI5',
  ) {
    try {
      let url;
      if (eSignMode == kVeri5 && fileContent)
        url = await this.fileService.base64ToURL(fileContent);
      else {
        const response = await this.signDeskService.getSignedAgreement(
          document_id,
          docket_id,
        );
        if (response['message']) return;

        if (!response) console.log('DELETED');
        url = await this.fileService.base64ToURL(response);
      }
      if (url['message']) return;
      const updatedData = { signed_document_upload: url };
      await this.eSignRepo.updateRowData(updatedData, id);
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async ipCheckInEsign(loanId) {
    try {
      const date = new Date();
      date.setHours(date.getHours() - 24);
      const attributes = ['ip'];
      const options = {
        where: {
          loanId,
          // createdAt: { [Op.gte]: date },
        },
        order: [['ip', 'DESC']],
        group: ['ip'],
      };
      const maxIpRecord = await this.userLogTrackerRepo.getTableWhereData(
        attributes,
        options,
      );
      if (maxIpRecord == k500Error) return kInternalError;
      const result = { status: true, reasonid: 0, reason: '' };

      //check if ip is blacklisted
      const blacklistIP = maxIpRecord.map((ele) => ele.ip);
      const blacklistList = await this.ipMasterRepo.getRowWhereData(['ip'], {
        where: { ip: blacklistIP, isBlacklist: 1 },
      });
      if (blacklistList == k500Error) return kInternalError;

      if (blacklistList) {
        result.status = false;
        result.reasonid = 57;
        result.reason = IP_ADDRESS_IS_BLACKLISTED;
        return result;
      }

      let length = maxIpRecord.length;
      for (let i = 0; i < length; i++) {
        try {
          const ip = maxIpRecord[i].ip;
          const checkIp = await this.validation.isIndianIp(ip);
          if (checkIp == false) {
            result.status = false;
            result.reasonid = 44;
            result.reason = USER_IS_NOT_MATCHED_WITH_COUNTRY;
            break;
          }
        } catch (error) {}
      }
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
