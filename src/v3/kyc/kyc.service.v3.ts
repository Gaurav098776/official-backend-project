// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  gIsPROD,
  KYC_MODE,
  SIGNDESK,
  NAME_MISS_MATCH_PER,
  REKYCDAYS,
  SYSTEM_ADMIN_ID,
  ZOOP,
  MIN_AGE,
  isUAT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { getmAadhaarData } from 'src/constants/objects';
import { MockResponses } from 'src/constants/objects';
import { ReferralStages } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kAddAadhareNumberRoute,
  kKYCInfo,
  kWebviewRoute,
  kAadhaarService,
  kEnterValidAadhaarNumber,
  kNoDataFound,
  kSigndesk,
  kNotEligibleForNBFC,
  kDigiLocker,
} from 'src/constants/strings';
import { regPanCard } from 'src/constants/validation';
import { KYCEntity } from 'src/entities/kyc.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import { ReferralSharedService } from 'src/shared/referral.share.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { ValidationService } from 'src/utils/validation.service';
import { AdminService } from 'src/admin/admin/admin.service';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { DigiLockerService } from 'src/thirdParty/digilocker/digilocker.service';
import { CibilScoreRepository } from 'src/repositories/cibil.score.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { EnvConfig } from 'src/configs/env.config';
import { UserServiceV3 } from '../user/user.service.v3';

@Injectable()
export class KycServiceV3 {
  constructor(
    private readonly fileService: FileService,
    private readonly masterRepo: MasterRepository,
    private readonly misMatchRepo: MissMacthRepository,
    private readonly repository: KYCRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly zoopService: ZoopService,
    private readonly commonSharedService: CommonSharedService,
    private readonly sigDeskservice: SigndeskService,
    private readonly validation: ValidationService,
    @Inject(forwardRef(() => EligibilitySharedService))
    private readonly eligibilitySharedService: EligibilitySharedService,
    private readonly adminService: AdminService,
    private readonly sharedReferral: ReferralSharedService,
    private readonly addressesRepo: AddressesRepository,
    @Inject(forwardRef(() => UserServiceV3))
    private readonly userService: UserServiceV3,
    // Database
    private readonly repoManager: RepositoryManager,
    // Third party services
    private readonly digiLocker: DigiLockerService,
    private readonly cibilScoreRepo: CibilScoreRepository,
  ) {}

  async validatemAadhaar(reqData) {
    try {
      const userId = reqData?.userId;
      const otp = reqData?.otp;
      let internalResponse;
      if (otp) {
        const response = await this.aadhaarOtpVerify(reqData);
        if (response?.message) return response;
        reqData.internalResponse = response;
      }
      internalResponse = reqData.aadhaarResponse ?? reqData.internalResponse;
      if (!internalResponse) return kParamMissing('internalResponse');
      if (typeof internalResponse != 'object')
        internalResponse = JSON.parse(internalResponse);

      // Converting response into simple object
      const mAadhaarResponse: any = await this.fineTunemAadhaarResponse(
        internalResponse,
      );
      if (mAadhaarResponse.message) return mAadhaarResponse;

      // Checks whether aadhaar number exists in another user or not
      const aadhaarNumber = mAadhaarResponse.basicDetails.aadhaarNumber;
      const existingData: any = await this.isAadhaarExists(
        userId,
        aadhaarNumber,
      );
      if (existingData.message) return existingData;

      // this fun check already approved aadhaar number match with new ones
      // this fun use for rekyc, delete account and old defuter
      const alreadyApproved = await this.checkUserAadhaarAlreadyApproved(
        userId,
        aadhaarNumber,
      );
      if (alreadyApproved?.message) return alreadyApproved;

      // Checks user is eligible as per age criteria or not
      const ageCriteria: any = this.typeService.isEligibleAsPerAge(
        mAadhaarResponse.basicDetails.dob,
      );
      if (ageCriteria?.type) {
        var birthDate = new Date(mAadhaarResponse.basicDetails.dob);
        var targetDate = new Date(
          birthDate.getFullYear() + MIN_AGE,
          birthDate.getMonth(),
          birthDate.getDate(),
        );
        await this.adminService.changeBlacklistUser({
          userId,
          reasonId: 59,
          reason: kNotEligibleForNBFC,
          type: ageCriteria?.type,
          adminId: SYSTEM_ADMIN_ID,
          status: '1',
          nextApplyDate: targetDate,
        });
        return { needUserInfo: true };
      }

      // Get lat long of the aadhaar address
      const aadhaarLatLong = await this.getAadhaarCoordinates(
        mAadhaarResponse.aadhaarAddress,
      );

      // Validate user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['id', 'status', 'dates', 'otherInfo'];
      const include = [masterInclude];
      const attributes = [
        'kycId',
        'referralId',
        'completedLoans',
        'createdAt',
        'isRedProfile',
        'isCibilConsent',
        'leadId',
      ];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (!userData.kycId) return k422ErrorMessage(kNoDataFound);

      const statusData = userData.masterData.status ?? {};
      const dates = userData.masterData.dates ?? {};
      const masterId = userData.masterData.id;
      const isRedProfile = userData?.isRedProfile === 2;
      // if (statusData.aadhaar == '1' || statusData.aadhaar == '3')
      //   return k422ErrorMessage('Aadhaar already verified');

      // Update KYC data
      const basicDetails = mAadhaarResponse.basicDetails ?? {};

      let pincode = this.typeService.getPincodeFromAddress(
        mAadhaarResponse.aadhaarResponse,
      );
      let updatedData: any = {
        aadhaarLatLong,
        aadhaarNumber,
        aadhaarState: mAadhaarResponse?.aadhaarAddress?.state,
        aadhaarDOB: basicDetails.dob,
        profileImage: basicDetails.profileImage,
        maskedAadhaar: this.getMaskedAadhaarNumber(aadhaarNumber),
        aadhaarStatus: '1',
        aadhaarVerifiedAdmin: SYSTEM_ADMIN_ID,
        aadhaarResponse: mAadhaarResponse.aadhaarResponse,
        aadhaarAddress: JSON.stringify(mAadhaarResponse.aadhaarAddress),
        pincode,
        kyc_mode:
          mAadhaarResponse.aadhaarServiceMode ??
          (await this.commonSharedService.getServiceName(kAadhaarService)),
      };
      const kycMode = updatedData.kyc_mode;
      if (kycMode == kDigiLocker) {
        const aadhaarResponse = JSON.parse(mAadhaarResponse?.aadhaarResponse);
        const match =
          aadhaarResponse?.digiReresponse?.authResponse?.scope?.split(
            'pan-PANCR-',
          );
        if (match && match?.length > 1) {
          const pan = match[1]?.split(' ')[0];
          const isValidate = regPanCard(pan);
          if (isValidate) {
            const panCardNumber = pan;
            const maskedPan =
              pan.substring(0, 2) +
              'xxx' +
              pan[5] +
              'xx' +
              pan.substring(8, 10);
            const kycUpdateData = {
              panCardNumber,
              maskedPan,
            };
            const result = await this.repository.updateRowData(
              kycUpdateData,
              userData.kycId,
            );
            if (result == k500Error) return kInternalError;

            const kycData = {
              userId: userId,
              pan: pan,
              consentMode: kDigiLocker,
            };
            const validatePan = await this.validatePan(kycData, true);
            if (validatePan.statusData && validatePan.dates) {
              statusData.pan = validatePan?.statusData?.pan;
              dates.pan = validatePan?.dates?.pan;
            }
          }
        }
      }
      if (aadhaarLatLong) {
        const latLngObject = JSON.parse(aadhaarLatLong);
        const lat = latLngObject['lat'];
        const lng = latLngObject['lng'];
        if (lat !== undefined && lng !== undefined)
          updatedData.aadhaarLatLongPoint = `${lat},${lng}`;
      }
      let updateResult = await this.repository.updateRowData(
        updatedData,
        userData.kycId,
      );

      if (updateResult == k500Error) return kInternalError;
      //add address in all address entity
      try {
        const aadhaarAddress = this.typeService.getUserAadharAddress(
          updatedData?.aadhaarAddress,
        );
        await this.addressesRepo.findAndUpdateOrCreate({
          userId,
          address: aadhaarAddress,
          type: '0',
          status: '1',
          subType: 'AADHAAR',
        });
      } catch (error) {}
      // Update user data
      updatedData = {
        fullName: basicDetails.name,
        gender: basicDetails.gender,
        state: (mAadhaarResponse?.aadhaarAddress?.state ?? '').toUpperCase(),
        city: (
          mAadhaarResponse?.aadhaarAddress?.districtName ?? ''
        ).toUpperCase(),
      };
      updateResult = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResult == k500Error) return kInternalError;
      // here we have to update name again

      // Update master data
      updatedData = { status: statusData, dates };
      updatedData.status.aadhaar = 1;
      updatedData.dates.aadhaar = new Date().getTime();
      // if old defulter then approved
      if (isRedProfile) {
        updatedData.status.selfie = 1;
        updatedData.dates.selfie = new Date().getTime();
      } else {
        // AWS compare selfie with aadhar image
        const selfie = await this.commonSharedService.validateWithAadhareImage(
          userId,
          statusData,
        );
        // Update master data
        updatedData.status.selfie = selfie;
        updatedData.dates.selfie = new Date().getTime();
      }

      updateResult = await this.masterRepo.updateRowData(updatedData, masterId);
      if (updateResult == k500Error) return kInternalError;

      /// check name validations
      const nameCheck = await this.eligibilitySharedService.nameValidation(
        userId,
      );
      if (nameCheck === false) return { needUserInfo: true };

      // update referrals if exist on complete KYC
      const diffDays = this.typeService.differenceInDays(
        new Date(),
        userData.createdAt,
      );
      const completedLoans = userData.completedLoans;
      if (userData?.referralId && completedLoans == 0 && diffDays < REKYCDAYS) {
        const refData = { userId, stage: ReferralStages.AADHAAR };
        await this.sharedReferral.addReferral(refData);
      }

      // if not old defaulter then Check eligibility
      // Check eligibility as per state salary
      if (!isRedProfile) {
        const eligibility =
          await this.eligibilitySharedService.validateStateWiseEligibility({
            userId,
          });
        if (eligibility.message) return eligibility;
      }

      const state = { isProcessing: false };
      return { needUserInfo: true, state };
    } catch (error) {
      return kInternalError;
    }
  }

  // Converting response into simple object
  private async fineTunemAadhaarResponse(internalResponse) {
    const aadhaarNumber = (internalResponse.responseData.uid ?? '').toString();
    delete internalResponse.responseData.uid ?? '';
    const fullResponse = internalResponse.responseData ?? '';
    let profileImage;
    if (fullResponse.residentPhoto)
      profileImage = await this.fileService.base64ToURL(
        fullResponse.residentPhoto,
        'jpg',
      );
    if (profileImage?.message) return profileImage;
    delete fullResponse.residentPhoto ?? '';

    const aadhaarResponse = JSON.stringify(fullResponse);
    const aadhaarAddress = {
      country: 'India',
      dist: fullResponse.districtName ?? '',
      state: fullResponse.stateName ?? '',
      po: fullResponse.poName ?? '',
      loc: fullResponse.locality ?? '',
      vtc: fullResponse.vtcName ?? '',
      subdist: fullResponse.subDistrictName ?? '',
      street: fullResponse.street ?? '',
      house: fullResponse.building ?? '',
      landmark: fullResponse.landmark ?? '',
    };
    const basicDetails = {
      name: fullResponse.name ?? '',
      dob: fullResponse.dob ?? '',
      aadhaarNumber,
      gender: (fullResponse.gender ?? 'MALE').toUpperCase(),
      mobile: fullResponse.mobile ?? '',
      profileImage,
    };
    return {
      basicDetails,
      aadhaarAddress,
      aadhaarResponse,
      aadhaarServiceMode: fullResponse.aadhaar_service,
    };
  }

  // Checks whether aadhaar number exists in another user or not
  private async isAadhaarExists(userId, aadhaarNumber) {
    try {
      const maskedAadhaar = this.getMaskedAadhaarNumber(aadhaarNumber);
      const attributes = ['aadhaarNumber'];
      const options = { where: { maskedAadhaar, userId: { [Op.ne]: userId } } };

      const kycList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (kycList == k500Error) return kInternalError;

      for (let index = 0; index < kycList.length; index++) {
        try {
          const targetNumber = kycList[index].aadhaarNumber;
          // Works only in PRODUCTION
          if (aadhaarNumber == targetNumber && gIsPROD)
            return k422ErrorMessage(
              'Aadhaar number already in use, try again with another aadhaar number',
            );
        } catch (error) {}
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // Get lat long of the aadhaar address
  private async getAadhaarCoordinates(aadhaarAddress) {
    try {
      const response = await this.typeService.getLocationFromAddress(
        JSON.stringify(aadhaarAddress),
      );
      if (response == k500Error) return;
      return JSON.stringify(response.results[0].geometry.location);
    } catch (error) {}
  }

  // Convert aadhaar number into masked aadhaar number
  private getMaskedAadhaarNumber(aadhaarNumber) {
    return 'xxxx xxxx ' + aadhaarNumber.substring(8, 12);
  }

  async aadhaarOtpRequest(data) {
    // Validation -> Parameters
    const aadhaarNumber = data?.aadhaarNumber;
    const userId = data?.userId;
    if (!userId) return kParamMissing('userId');
    if (!aadhaarNumber) return kParamMissing('aadhaarNumber');

    // Check existing data of aadhaar number
    const existingData: any = await this.isAadhaarExists(userId, aadhaarNumber);
    if (existingData.message) return existingData;

    // Check user's attempt for KYC
    const kycAttr = ['attemptData', 'id'];
    const kycOptions = { order: [['id', 'DESC']], where: { userId } };
    const kycData = await this.repoManager.getRowWhereData(
      KYCEntity,
      kycAttr,
      kycOptions,
    );
    if (kycData === k500Error) throw new Error();
    // User will go with zoop for re-attempt
    let isReAttempted = false;
    let attemptCount: 0;
    if (kycData) {
      const attemptData = kycData.attemptData ?? { count: 0 };
      attemptCount = attemptData.count ?? 0;
      if (attemptData.count >= 2) isReAttempted = true;
    }
    attemptCount++;

    // Update record -> KYC table
    if (kycData.id) {
      const updatedData = {
        attemptData: {
          count: attemptCount,
          lastAttemptOn: new Date().toJSON(),
        },
      };
      const updateResult = await this.repoManager.updateRowData(
        KYCEntity,
        updatedData,
        kycData.id,
      );
      if (updateResult === k500Error) throw new Error();
    }

    const aadhaar_service: any = await this.commonSharedService.getServiceName(
      kAadhaarService,
    );
    // Flow -> Digilocker
    if (aadhaar_service == 'DIGILOCKER' && !isReAttempted)
      return await this.digiLocker.invitation({ aadhaarNumber, userId });

    const response: any = await this.zoopService.checkAadhaarRequest(
      aadhaarNumber,
    );
    if (response?.message) return response;
    if (response?.success) {
      const reference_id = response?.request_id;
      const transaction_id = '';
      return { needBottomSheet: true, reference_id, transaction_id };
    } else return kInternalError;
  }

  async validatePan(reqData, isBanking = false) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const isReAttempt = reqData.isReAttempt == true;
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = ['panCardNumber'];
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['dates', 'loanId', 'status'];
      const include = [kycInclude, masterInclude];
      const attributes = [
        'fullName',
        'isRedProfile',
        'kycId',
        'masterId',
        'appType',
      ];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData == k500Error) return kInternalError;

      const appType = userData?.appType;
      let panNumber = userData.kycData?.panCardNumber;
      const statusData = userData.masterData?.status ?? {};
      const dates = userData.masterData?.dates ?? {};
      if (statusData.pan == 1 || statusData.pan == 3)
        return { needUserInfo: true };
      const cibilData = await this.cibilScoreRepo.getRowWhereData(
        ['validCibilData', 'ids'],
        { where: { status: '1', type: '1', userId }, order: [['id', 'DESC']] },
      );
      if (cibilData == k500Error) return kInternalError;
      if (cibilData?.validCibilData == 0 && !isReAttempt) {
        for (let i = 0; i < cibilData?.ids.length; i++) {
          const ele = cibilData?.ids[i];
          if (ele?.idType === '01') {
            panNumber = ele.idNumber;
            break;
          }
        }
      }
      if (!panNumber) return k422ErrorMessage('Pan number not found');

      if (!userData.fullName && !isBanking)
        return k422ErrorMessage('User name not found');

      if (reqData?.pan === panNumber && isBanking) {
        // Update kyc data
        const updatedData: any = {
          panStatus: '1',
          panResponse: JSON.stringify({ source: reqData?.consentMode }),
          panVerifiedAdmin: SYSTEM_ADMIN_ID,
        };
        let updateResult = await this.repository.updateRowData(
          updatedData,
          userData.kycId,
        );
        if (updateResult === k500Error) return kInternalError;
        // Update master data
        statusData.pan = 1;
        dates.pan = new Date().getTime();
        const updatedMasterData = { status: statusData, dates };
        updateResult = await this.masterRepo.updateRowData(
          updatedMasterData,
          userData.masterId,
        );
        if (updateResult === k500Error) return kInternalError;
        return { needUserInfo: true, statusData, dates };
      }
      const panResponse = await this.zoopService.checkPanCard(panNumber);

      // Invalid pan number
      if (
        panResponse == k500Error ||
        panResponse.message == 'No Record Found'
      ) {
        // Update kyc data
        let updatedData: any = { panStatus: '6' };
        let updateResult = await this.repository.updateRowData(
          updatedData,
          userData.kycId,
        );
        if (updateResult == k500Error) return kInternalError;

        // Update master data
        statusData.pan = 6;
        updatedData = { status: statusData };
        updateResult = await this.masterRepo.updateRowData(
          updatedData,
          userData.masterId,
        );

        if (isReAttempt)
          return k422ErrorMessage('Please enter correct pan number');
      }
      // Validate response
      else {
        // Fine tune data from response
        const resultData =
          panResponse.result ?? panResponse?.document_status[0] ?? panResponse;
        if (!resultData) return kInternalError;
        const extractedData = resultData.extracted_data ?? {};
        const validatedData = resultData.validated_data ?? {};
        const panName =
          resultData?.user_full_name ??
          extractedData.name ??
          extractedData.Name ??
          validatedData.full_name;

        let panStatus = 1;

        // Compare name as per aadhaar
        const isNameMissMatch: any = await this.validation.nameMatch(
          userData.fullName,
          panName,
          appType,
        );

        // Check if pan already exists and verified
        const isPanVerified: any = await this.isPanExists(userId, panNumber);
        if (isPanVerified?.message) return isPanVerified;
        if (isPanVerified == 6) panStatus = isPanVerified;

        const kycData: any = { panVerifiedAdmin: SYSTEM_ADMIN_ID };
        let isValidName: any = false;
        kycData.nameSimilarity = isNameMissMatch?.data ?? 0;
        if (isNameMissMatch?.valid) {
          if (isNameMissMatch.data >= NAME_MISS_MATCH_PER) isValidName = true;
          else isValidName = false;
        } else
          isValidName = await this.validation.compareName(
            userData.fullName,
            panName,
          );
        kycData.kyc_mode = KYC_MODE;
        if (!isValidName && panStatus != 6) {
          const data = {
            type: 'KYC',
            userId,
            name1: userData.fullName,
            name2: panName,
          };
          await this.misMatchRepo.create(data);
          panStatus = 0;
        }
        kycData.panCardNumber = panNumber;
        kycData.maskedPan =
          panNumber.substring(0, 2) +
          'xxx' +
          panNumber[5] +
          'xx' +
          panNumber.substring(8, 10);
        const response = JSON.stringify(panResponse);
        kycData.panResponse = response;
        kycData.panStatus = panStatus.toString();

        // Update kyc data
        let updateResult = await this.repository.updateRowData(
          kycData,
          userData.kycId,
        );
        if (updateResult == k500Error) return kInternalError;
        // Update master data
        statusData.pan = panStatus;
        const approved = [1, 3, 4];
        if (
          approved.includes(statusData.pan) &&
          approved.includes(statusData.selfie) &&
          approved.includes(statusData.contact) &&
          approved.includes(statusData.reference)
        ) {
          statusData.loan = 0;
          statusData.eligibility = 0;
        }
        const updateData = {
          status: statusData,
          dates: userData.masterData?.dates,
        };
        if (panStatus == 1) updateData.dates.pan = new Date().getTime();

        updateResult = await this.masterRepo.updateRowData(
          updateData,
          userData.masterId,
        );
        if (updateResult == k500Error) return kInternalError;

        /// check final approval when loan status is 0
        if (statusData?.loan == 0 && userData?.masterData?.loanId) {
          const finalData = { loanId: userData.masterData.loanId, userId };
          await this.eligibilitySharedService.finalApproval(finalData);
        }
      }

      if (statusData.pan == 6 && isReAttempt) {
        await this.userService.routeDetails({ id: userId });
        return k422ErrorMessage('Please enter correct pan number');
      }

      return { panStatus: statusData.pan, needUserInfo: true };
    } catch (error) {
      return kInternalError;
    }
  }

  async aadhaarOtpVerify(data) {
    try {
      const reference_id = data?.reference_id;
      const transaction_id = data?.transaction_id;
      const aadhaar_number = data?.aadhaarNumber;
      const otp = data?.otp;

      // Testing purposes
      if (!gIsPROD && otp == '111111') return MockResponses.hardikUIDAISuccess;

      if (!reference_id || !otp || !aadhaar_number) return kParamMissing();
      let response;
      const aadhaar_service = await this.commonSharedService.getServiceName(
        kAadhaarService,
      );
      let aadhaarServiceMode = 'ZOOP';
      if (aadhaar_service == kSigndesk) {
        aadhaarServiceMode = kSigndesk;
        if (!transaction_id) return kParamMissing();
        const otpJson = { reference_id, transaction_id, otp: otp.toString() };
        response = await this.sigDeskservice.validateAadhaarOTP(otpJson);
        if (response?.message) return response;
      } else {
        response = await this.zoopService.verifyAadhaarOTP(reference_id, otp);
        if (response?.message) return response;
      }
      if (!response) return kInternalError;
      const prePareData = {
        status: 'Success',
        responseData: {
          state: '',
          valid: true,
          eid: '',
          informationSharingConsent: true,
          localResName: '',
          localCareof: '',
          localBuilding: '',
          email: '',
          dob: '',
          mobile: '',
          gender: 'MALE',
          landmark: null,
          street: '',
          locality: '',
          district: '',
          vtc: '',
          building: '',
          districtName: '',
          vtcName: '',
          stateName: '',
          poName: '',
          careof: '',
          poNameLocal: '',
          localVtc: '',
          localState: '',
          localDistrict: '',
          pincode: '',
          uid: aadhaar_number,
          localStreet: '',
          localLocality: '',
          localLandmark: null,
          refId: null,
          langCode: '',
          relationInfo: null,
          biometricFlag: false,
          dobStatus: '',
          enrolmentDate: '',
          enrolmentNumber: '',
          enrolmentType: '',
          exceptionPhoto: null,
          isCurrent: false,
          isNRI: 'false',
          isdCode: '+91',
          poType: null,
          poa: null,
          poi: null,
          residentPhoto: '',
          subDistrict: '',
          subDistrictLocalName: '',
          subDistrictName: '',
          updatedEIds: [],
          updatedEIdsCount: 0,
          updatedRefIds: [],
          updatedRefIdsCount: 0,
          name: '',
          aadhaar_service: aadhaarServiceMode,
        },
      };

      if (aadhaar_service == 'SIGNDESK') {
        prePareData.responseData.localResName = response?.full_name ?? '';
        prePareData.responseData.email = response?.email_hash ?? '';
        prePareData.responseData.dob = response?.dob ?? '';
        prePareData.responseData.mobile = response?.mobile_hash ?? '';
        const gender =
          (response?.gender ?? 'M').toLowerCase() == 'm' ? 'MALE' : 'FEMALE';
        prePareData.responseData.gender = gender;
        prePareData.responseData.building = response?.address?.house ?? '';
        prePareData.responseData.street = response?.address?.street ?? '';
        prePareData.responseData.locality = response?.address?.loc ?? '';
        prePareData.responseData.districtName = response?.address?.dist ?? '';
        prePareData.responseData.vtcName = response?.address?.vtc ?? '';
        prePareData.responseData.stateName = response?.address?.state ?? '';
        prePareData.responseData.poName = response?.address?.po ?? '';
        prePareData.responseData.careof = response?.care_of ?? '';
        prePareData.responseData.pincode = response?.zip;
        prePareData.responseData.residentPhoto = response?.profile_image ?? '';
        prePareData.responseData.subDistrictName =
          response?.address?.subdist ?? '';
        prePareData.responseData.name = response?.full_name;
      } else {
        const zoopData = response?.result;
        prePareData.responseData.localResName = zoopData?.user_full_name ?? '';
        let dob = zoopData?.user_dob;
        try {
          if (zoopData?.user_dob) {
            const date = this.typeService.dateTimeToDate(
              zoopData?.user_dob,
              'DD/MM/YYYY',
            );
            let month: any = date.getMonth();
            month += 1;
            if (month < 10) month = '0' + month;
            let day: any = date.getDate();
            if (day < 10) day = '0' + day;
            dob = date.getFullYear() + '-' + month + '-' + day;
          }
        } catch (error) {}
        prePareData.responseData.dob = dob ?? '';
        const gender =
          (zoopData?.user_gender ?? 'M').toLowerCase() == 'm'
            ? 'MALE'
            : 'FEMALE';
        prePareData.responseData.gender = gender;
        prePareData.responseData.building = zoopData?.user_address?.house ?? '';
        prePareData.responseData.street = zoopData?.user_address?.street ?? '';
        prePareData.responseData.locality = zoopData?.user_address?.loc ?? '';
        prePareData.responseData.districtName =
          zoopData?.user_address?.dist ?? '';
        prePareData.responseData.vtcName = zoopData?.user_address?.vtc ?? '';
        prePareData.responseData.stateName =
          zoopData?.user_address?.state ?? '';
        prePareData.responseData.subDistrictName =
          zoopData?.user_address?.subdist ?? '';
        prePareData.responseData.poName = zoopData?.user_address?.po ?? '';
        prePareData.responseData.careof = zoopData?.user_parent_name ?? '';
        prePareData.responseData.pincode = zoopData?.address_zip;
        prePareData.responseData.residentPhoto =
          zoopData?.user_profile_image ?? '';
        prePareData.responseData.name = zoopData?.user_full_name;
      }
      if (!prePareData?.responseData?.name) return k500Error;
      return JSON.stringify(prePareData);
    } catch (error) {
      return kInternalError;
    }
  }

  async submitPanDetails(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const fileURL = reqData.fileURL;
      if (!fileURL) return kParamMissing('fileURL');
      const panNumber = reqData.panNumber;
      if (!panNumber) return kParamMissing('panNumber');
      if (!regPanCard(panNumber))
        return k422ErrorMessage('Please and valid pan number');

      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status'];
      const include = [masterInclude];
      const attributes = ['kycId', 'masterId'];
      const options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const statusData = userData.masterData?.status ?? {};
      if (statusData.pan != 6 && statusData.pan != 2 && statusData.pan != 5)
        return k422ErrorMessage('Pan submission failed');

      // Update kyc data
      const maskedPan =
        panNumber.substring(0, 2) +
        'xxx' +
        panNumber[5] +
        'xx' +
        panNumber.substring(8, 10);
      let updatedData: any = {
        panStatus: '5',
        maskedPan,
        pan: fileURL,
        panCardNumber: panNumber,
      };
      const createdData = await this.repository.createRowDataWithCopy(
        updatedData,
        userData.kycId,
      );
      if (createdData == k500Error) return kInternalError;
      // Update user data
      updatedData = { kycId: createdData.id };
      let updatedResult = await this.userRepo.updateRowData(
        updatedData,
        userId,
      );
      if (updatedResult == k500Error) return kInternalError;
      // Update master data
      statusData.pan = 5;
      updatedData = { status: statusData };
      updatedResult = await this.masterRepo.updateRowData(
        updatedData,
        userData.masterId,
      );

      return await this.validatePan({ userId, isReAttempt: true });
    } catch (error) {
      return kInternalError;
    }
  }

  // Checks whether Pan number exists in another user or not
  private async isPanExists(userId, pan) {
    try {
      const maskedPan =
        pan.substring(0, 2) + 'xxx' + pan[5] + 'xx' + pan.substring(8, 10);

      const attributes = ['panCardNumber'];
      const options = {
        where: {
          maskedPan,
          userId: { [Op.ne]: userId },
          panStatus: { [Op.or]: ['1', '3'] },
        },
      };
      const kycList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (kycList == k500Error) return kInternalError;

      // Pan exist validation
      for (let index = 0; index < kycList.length; index++) {
        try {
          const kycData = kycList[index];
          // Works in PRODUCTION and UAT except mock pan number
          if (
            gIsPROD ||
            (isUAT &&
              !EnvConfig.mock.panNumbers.includes(kycData?.panCardNumber))
          ) {
            if (kycData?.panCardNumber == pan) return 6;
          }
        } catch (error) {}
      }

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async changeAadhaarService(body, routeDetails) {
    const userData = routeDetails.userData;
    if (userData.currentStepTitle != kKYCInfo.title) return routeDetails;
    let aadhaar_service = await this.commonSharedService.getServiceName(
      'AADHAAR_SERVICE',
    );

    aadhaar_service =
      body.aadhaar_service == 'LENDITT'
        ? ZOOP
        : body.aadhaar_service == ZOOP
        ? SIGNDESK
        : 'LENDITT';
    userData['aadhaar_service'] = aadhaar_service;
    if (aadhaar_service == 'LENDITT') {
      userData.webviewData = getmAadhaarData(userData.id);
      return { userData, continueRoute: kWebviewRoute };
    } else {
      return { userData, continueRoute: kAddAadhareNumberRoute };
    }
  }

  async profileImage(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      const attributes = ['profileImage'];
      const options = { order: [['id', 'DESC']], where: { userId } };
      const kycData = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (kycData == k500Error) return kInternalError;
      if (!kycData) return k422ErrorMessage(kNoDataFound);

      return { aadharProfile: kycData.profileImage };
    } catch (error) {
      return kInternalError;
    }
  }

  async validateStuckPanUsers() {
    try {
      const userInclude: { model; attributes?; where? } = {
        model: registeredUsers,
      };
      userInclude.attributes = ['id'];
      userInclude.where = { isBlacklist: { [Op.ne]: '1' } };
      const include = [userInclude];
      const attributes = ['userId'];
      const options = {
        include,
        limit: 10,
        where: {
          status: {
            contact: { [Op.in]: [1, 3, 4] },
            loan: 4,
            pan: 5,
            reference: { [Op.in]: [1, 3, 4] },
          },
        },
      };

      // Query
      const masterList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;

      const userIds = [];
      for (let index = 0; index < masterList.length; index++) {
        try {
          const masterData = masterList[index];
          const userId = masterData.userId;
          await this.validatePan({ userId });
          userIds.push(userId);
        } catch (error) {}
      }

      return { userIds };
    } catch (error) {
      return kInternalError;
    }
  }

  //#region check user aadhaar already approved or not
  private async checkUserAadhaarAlreadyApproved(userId, aadhaarNumber) {
    try {
      const options = {
        where: { userId, aadhaarStatus: '1' },
        order: [['id', 'desc']],
      };
      const att = ['aadhaarNumber'];
      const result = await this.repository.getRowWhereData(att, options);
      if (result === k500Error) return kInternalError;
      if (!result || (result?.aadhaarNumber ?? '').trim() === aadhaarNumber)
        return;
      return k422ErrorMessage(kEnterValidAadhaarNumber);
    } catch (error) {
      return kInternalError;
    }
  }

  //#region migrate kyc address to lat log
  // if null aadhaarLatLong  it update in Kyc
  async updateLatLngkycData() {
    try {
      // find null and empty aadhaarLatLong
      const where = {
        aadhaarAddress: { [Op.ne]: null },
        [Op.or]: [
          { aadhaarLatLong: { [Op.eq]: null } },
          { aadhaarLatLong: { [Op.eq]: '' } },
        ],
      };
      const kycData = await this.repository.getTableWhereData(
        ['id', 'aadhaarLatLong', 'aadhaarAddress'],
        { where },
      );
      for (let i = 0; i < kycData.length; i++) {
        const element = kycData[i];
        const aadhaarAddress = element?.aadhaarAddress ?? '-';
        const addressLatLng = await this.getAadhaarCoordinates(
          JSON.parse(aadhaarAddress),
        );
        if (addressLatLng) {
          const latAndLng = { aadhaarLatLong: addressLatLng };
          // update aadhaarLatLong
          await this.repository.updateRowData(latAndLng, element.id, true);
        }
      }
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion
}
