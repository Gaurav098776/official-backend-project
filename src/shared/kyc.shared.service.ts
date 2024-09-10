// Imports
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/admin/user/user.service';
import {
  OPTIONAL_DOCS_REQUIRED,
  KYC_MODE,
  GlobalServices,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { kPanService } from 'src/constants/strings';
import { KYCEntity } from 'src/entities/kyc.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { RedisService } from 'src/redis/redis.service';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { SigndeskService } from 'src/thirdParty/signdesk/signdesk.service';
import { Veri5Service } from 'src/thirdParty/veri5/veri5.service';
import { ZoopService } from 'src/thirdParty/zoop/zoop.service';
import { ValidationService } from 'src/utils/validation.service';

@Injectable()
export class KycSharedService {
  constructor(
    private readonly kycRepo: KYCRepository,
    private readonly userRepo: UserRepository,
    private readonly selfieRepo: UserSelfieRepository,
    private readonly redisService: RedisService,
    private readonly validationService: ValidationService,
    private readonly missMacthRepo: MissMacthRepository,
    private readonly userService: UserService,
    private readonly zoopService: ZoopService,
    private readonly veri5Service: Veri5Service,
    private readonly sigDeskservice: SigndeskService,
    private readonly awsService: AwsService,
  ) {}

  async validateSelfieWithAadhaar(userId) {
    try {
      const selfieInclude = {
        model: UserSelfieEntity,
        attributes: ['id', 'image', 'status'],
      };
      const kycInclude = {
        model: KYCEntity,
        attributes: ['profileImage', 'aadhaarFront'],
      };
      const userData = await this.userRepo.getRowWhereData(['id', 'selfieId'], {
        where: {
          id: userId,
        },
        include: [selfieInclude, kycInclude],
      });
      if (userData === k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage('No data found');

      const selfieData = userData?.selfieData ?? {};
      const kycData = userData?.kycData ?? {};
      const aadhaarImage = kycData?.profileImage ?? kycData?.aadhaarFront;
      if (!aadhaarImage)
        return k422ErrorMessage('Aadhaar profile image not found');
      if (selfieData.status != '5')
        return k422ErrorMessage('Validation could not be processed');
      const selfieImage = selfieData.image;
      if (!selfieImage) return k422ErrorMessage('selfie image  not found');

      const compareImgRes = await this.awsService.compareImages({
        imageA: selfieImage,
        imageB: aadhaarImage,
      });
      if (compareImgRes.message) return compareImgRes;
      const isMatched = compareImgRes.isMatched ?? false;

      const updatedData: any = { response: JSON.stringify(compareImgRes) };
      if (isMatched) {
        updatedData.status = '1';
        updatedData.verifiedDate = new Date().toJSON();
      } else {
        updatedData.status = '0';
        updatedData.tempImage = null;
      }
      await this.selfieRepo.updateRowData(updatedData, selfieData.id);

      return await this.userService.getUserProfile({ userId: userId });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async validateKYCDocsExceptAadhaarCard(userId: string) {
    const panResponse: any = await this.validatePanCard(userId, 'skip', 'skip');

    if (panResponse.valid) {
      if (OPTIONAL_DOCS_REQUIRED)
        return await this.validateOtherDoc(userId, 'skip', 'skip', 'skip');
      else return await this.userService.getUserProfile({ userId: userId });
    }
    return panResponse;
  }

  async validatePanCard(
    userId: string,
    filePath: string,
    panNumber: string,
    adminId?: number,
    skipNameCheck = false,
  ) {
    try {
      const attributes = ['id', 'fullName', 'isBlacklist'];
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attributes = [
        'aadhaarStatus',
        'pan',
        'panCardNumber',
        'panStatus',
        'id',
      ];
      const include = [kycInclude];
      const options = { where: { id: userId }, include };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return kBadRequest;
      if (userData == k500Error) return kInternalError;
      if (userData.isBlacklist == '1') return kBadRequest;

      const existingKYCData = userData.kycData;
      if (!existingKYCData)
        return k422ErrorMessage(
          'Verify aadhaar card before proceeding for pan card',
        );
      else if (
        existingKYCData.aadhaarStatus != '1' &&
        existingKYCData.aadhaarStatus != '3'
      )
        return k422ErrorMessage(
          'Verify aadhaar card before proceeding for pan card',
        );
      else if (
        existingKYCData.panStatus == '1' ||
        existingKYCData.panStatus == '3'
      )
        return { ...kSuccessData, data: { status: existingKYCData.panStatus } };

      const isSkipped = filePath == 'skip';
      const targetFilePath = isSkipped ? existingKYCData.pan : filePath;
      const targetPanNumber = isSkipped
        ? existingKYCData.panCardNumber
        : panNumber;
      let validatedResponse: any;
      const pan_service = await this.getServiceName(kPanService);
      if (pan_service == 'ZOOP') {
        validatedResponse = await this.zoopService.checkPanCard(
          targetPanNumber,
        );
        if (validatedResponse === k500Error) return kInternalError;
      } else if (pan_service == 'VERI5')
        validatedResponse = await this.veri5Service.veri5PanCard(
          targetPanNumber,
        );
      else
        validatedResponse = await this.sigDeskservice.validatePanCard(
          targetFilePath,
        );
      validatedResponse = await this.validatePanCardResponse(
        userData,
        validatedResponse,
        targetFilePath,
        targetPanNumber,
        adminId,
        skipNameCheck,
      );

      if (validatedResponse['message'])
        return k422ErrorMessage(validatedResponse['message']);

      if (existingKYCData.panStatus == '2') {
        const createdData = await this.kycRepo.createRowDataWithCopy(
          validatedResponse,
          existingKYCData.id,
        );
        if (createdData == k500Error) return kInternalError;
        const kycId = createdData.id;
        const updatedData = await this.userRepo.updateRowData(
          { kycId },
          userId,
        );
        if (updatedData == k500Error) return kInternalError;
      } else {
        const kycUpdatedData = await this.kycRepo.updateRowData(
          validatedResponse,
          existingKYCData.id,
        );
        if (kycUpdatedData == k500Error) return kInternalError;
      }
      return { ...kSuccessData, data: { status: validatedResponse.panStatus } };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getServiceName(serviceName) {
    const info = await this.redisService.get(serviceName);
    return info ?? GlobalServices[serviceName];
  }

  private async validatePanCardResponse(
    userData: registeredUsers,
    panResponse: any,
    filePath: string,
    panNumber: string,
    adminId: number,
    skipNameCheck = false,
  ) {
    try {
      const errorMsg = panResponse['message'];
      if (errorMsg) {
        if (errorMsg == 'No Record Found') {
          const panStatus = userData?.kycData?.panStatus;
          // Last pan attempt
          if (panStatus == '6') return panResponse;
          // Re-upload pan card
          else if (panStatus == '5')
            return { panStatus: '6', panResponse: JSON.stringify(panResponse) };
          return this.markKYCAsManual('PanCard', panResponse, filePath);
        } else return this.markKYCAsManual('PanCard', panResponse, filePath);
      }
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
      if (!skipNameCheck) {
        const isValidName = await this.validationService.compareName(
          userData.fullName,
          panName,
        );
        if (!isValidName) {
          const data = {
            type: 'KYC',
            userId: userData.id,
            name1: userData.fullName,
            name2: panName,
          };
          await this.missMacthRepo.create(data);
          return this.markKYCAsManual('PanCard', panResponse, filePath);
        }
      }

      const pan_number =
        resultData?.pan_number ??
        extractedData.pan_number ??
        validatedData.pan_number;
      if (pan_number != panNumber)
        return this.markKYCAsManual('PanCard', panResponse, filePath);
      if (resultData?.pan_status && resultData?.pan_status != 'VALID')
        return this.markKYCAsManual('PanCard', panResponse, filePath);

      const kycData: any = {
        panStatus: '1',
        kycCompletionDate: new Date().toJSON(),
      };
      kycData.panVerifiedAdmin = 37;
      kycData.pan = filePath;
      kycData.panCardNumber = panNumber;
      kycData.maskedPan =
        panNumber.substring(0, 2) +
        'xxx' +
        panNumber[5] +
        'xx' +
        panNumber.substring(8, 10);

      try {
        resultData.extracted_data.pan_number = kycData.maskedPan;
        resultData.extracted_data.PAN_Number = kycData.maskedPan;
        resultData.validated_data.pan_number = kycData.maskedPan;
        if (panResponse.result) panResponse.result = { ...resultData };
        else if (panResponse.document_status)
          panResponse.document_status = [...resultData];
      } catch (error) {}

      const response = JSON.stringify(panResponse);
      kycData.panResponse = response;
      if (adminId) kycData.panUploadedAdmin = adminId;
      kycData.kyc_mode = KYC_MODE;
      return kycData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  markKYCAsManual(type: string, response: any, frontImage: string) {
    try {
      const updatedData: any = {};
      switch (type) {
        case 'PanCard':
          updatedData.panStatus = '0';
          updatedData.panResponse = JSON.stringify(response);
          updatedData.pan = frontImage;
          updatedData.panRejectReason = null;
          return updatedData;
        case 'otherDoc':
          updatedData.otherDocStatus = '0';
          updatedData.otherDocResponse = JSON.stringify(response);
          updatedData.otherDocFront = frontImage;
          updatedData.otherDocRejectReason = null;
          return updatedData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async validateOtherDoc(
    userId: string,
    otherDocType: string,
    documentFrontImagePath: string,
    documentBackImagePath?: string,
    adminId?: number,
    skipNameCheck = false,
  ) {
    try {
      const attributes = ['fullName', 'id', 'isBlacklist'];
      const kycInclude: any = { model: KYCEntity };
      kycInclude.attribute = [
        'aadhaarStatus',
        'id',
        'panStatus',
        'otherDocStatus',
        'otherDocType',
        'otherDocFront',
        'otherDocBack',
      ];
      const include = [kycInclude];
      const options = { where: { id: userId }, include };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return kBadRequest;
      if (userData == k500Error) return kInternalError;
      if (userData.isBlacklist == '1') return kBadRequest;

      const existingKYCData = userData.kycData;
      if (!existingKYCData)
        return k422ErrorMessage(
          'Verify aadhaar card before proceeding for optional document',
        );
      else if (
        existingKYCData.aadhaarStatus != '1' &&
        existingKYCData.aadhaarStatus != '3'
      )
        return k422ErrorMessage(
          'Verify aadhaar card before proceeding for optional document',
        );
      else if (
        existingKYCData.panStatus != '1' &&
        existingKYCData.panStatus != '3' &&
        existingKYCData.panStatus != '0' &&
        existingKYCData.panStatus != '2'
      )
        return k422ErrorMessage(
          'Verify pan card before proceeding for optional document',
        );
      else if (
        existingKYCData.otherDocStatus == '1' ||
        existingKYCData.otherDocStatus == '3'
      )
        return {
          ...kSuccessData,
          data: { status: existingKYCData.otherDocStatus },
        };

      const isSkipped = documentFrontImagePath == 'skip';
      const frontImage = isSkipped
        ? existingKYCData.otherDocFront
        : documentFrontImagePath;
      const backImage = isSkipped
        ? existingKYCData.otherDocBack
        : documentBackImagePath;
      const targetDocType = isSkipped
        ? existingKYCData.otherDocType
        : otherDocType;

      const otherDocResponse = await this.sigDeskservice.validateOtherDoc(
        frontImage,
        targetDocType,
        backImage,
      );
      const validatedResponse = await this.validateOtherDocResponse(
        userData,
        otherDocResponse,
        targetDocType,
        frontImage,
        backImage,
        adminId,
        skipNameCheck,
      );
      if (validatedResponse['message'])
        return k422ErrorMessage(validatedResponse['message']);

      if (existingKYCData.otherDocStatus != '2') {
        const updatedData = await this.kycRepo.updateRowData(
          validatedResponse,
          existingKYCData.id,
        );
        if (updatedData == k500Error) return kInternalError;
      } else {
        const createdData = await this.kycRepo.createRowDataWithCopy(
          validatedResponse,
          existingKYCData.id,
        );
        if (createdData == k500Error) return kInternalError;
        const kycId = createdData.id;
        const updatedData = await this.userRepo.updateRowData(
          { kycId },
          userId,
        );
        if (updatedData == k500Error) return kInternalError;
      }

      return await this.userService.getUserProfile({ userId: userId });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async validateOtherDocResponse(
    userData: registeredUsers,
    otherDocResponse: any,
    otherDocType: string,
    frontImage: string,
    backImage: string,
    adminId?: number,
    skipNameCheck = false,
  ) {
    try {
      if (otherDocResponse == k500Error)
        return this.markKYCAsManual('otherDoc', otherDocResponse, frontImage);

      const kycData: any = { otherDocType };
      kycData.otherDocFront = frontImage;
      kycData.otherDocBack = backImage;
      kycData.otherDocResponse = JSON.stringify(otherDocResponse);
      if (otherDocResponse['valid'] == false) kycData.otherDocStatus = '0';
      else if (otherDocResponse['document_status']) {
        const resultData = otherDocResponse['document_status'][0];
        const extractedData = resultData.extracted_data;

        if (!skipNameCheck) {
          const otherDocName = extractedData.Name;
          const userName = userData.fullName;
          const isValidName = await this.validationService.compareName(
            userName,
            otherDocName,
          );
          if (!isValidName) {
            const data = {
              type: 'KYC',
              userId: userData.id,
              name1: userName,
              name2: otherDocName,
            };
            await this.missMacthRepo.create(data);
            kycData.otherDocStatus = '0';
          }
          if (kycData.otherDocStatus != '0' && isValidName) {
            kycData.otherDocStatus = '1';
            kycData.otherDocVerifiedAdmin = 37;
          }
        } else {
          kycData.otherDocStatus = '1';
          kycData.otherDocVerifiedAdmin = 37;
        }
        if (adminId) {
          if (kycData.otherDocStatus == '1') {
            kycData.otherDocVerifiedAdmin = adminId;
            kycData.otherDocStatus = '3';
          }
          kycData.otherDocUploadedAdmin = adminId;
        }
      } else return kInternalError;
      if (kycData.otherDocStatus == '1' || kycData.otherDocStatus == '3') {
        const data = userData.kycData;
        const isAadhaarVerified =
          data.aadhaarStatus == '1' || data.aadhaarStatus == '3';
        const isPanVerified = data.panStatus == '1' || data.panStatus == '3';
        if (isAadhaarVerified && isPanVerified)
          kycData.kycCompletionDate = new Date().toJSON();
      }
      return kycData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
