// Imports
import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import {
  SYSTEM_ADMIN_ID,
  gIsPROD,
  isUAT,
  DELETED_FILE_PATH,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import {
  kNoDataFound,
  kTEmailOtp,
  DELETE_ACCOUNT_MSG,
  ACTIVE_ACCOUNT_MSG,
} from 'src/constants/strings';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { EmploymentHistoryRepository } from 'src/repositories/employmentHistory.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { AddressesRepository } from 'src/repositories/addresses.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { FlowRepository } from 'src/repositories/flow.repository';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { MediaRepository } from 'src/repositories/media.repository';
import { BankingRepository } from 'src/repositories/banking.repository';
import { DocHistoryRepository } from 'src/repositories/user.repository copy';
import { MasterRepository } from 'src/repositories/master.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { UserDeleteRepository } from 'src/repositories/userDetele.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';

import { CommonService } from 'src/utils/common.service';
import { CryptService } from 'src/utils/crypt.service';
import { Msg91Service } from 'src/utils/msg91Sms';
import { FileService } from 'src/utils/file.service';
import { MasterEntity } from 'src/entities/master.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';
import admin from 'firebase-admin';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
@Injectable()
export class UserDeleteService {
  firebaseDB;
  constructor(
    private readonly userRepo: UserRepository,
    private readonly userSelfieRepo: UserSelfieRepository,
    private readonly locationRepo: LocationRepository,
    private readonly salarySlipRepo: SalarySlipRepository,
    private readonly employmentHistoryRepo: EmploymentHistoryRepository,
    private readonly employmentRepo: EmploymentRepository,
    private readonly referenceRepo: ReferenceRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly deviceandAppsRepo: DeviceInfoInstallAppRepository,
    private readonly deviceSIMRepo: DeviceSIMRepository,
    private readonly flowRepo: FlowRepository,
    private readonly mismatchRepo: MissMacthRepository,
    private readonly conatctsRepo: UniqueConatctsRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly bankingRepo: BankingRepository,
    private readonly docHistoryRepo: DocHistoryRepository,
    private readonly masterRepo: MasterRepository,
    private readonly loanRepo: LoanRepository,
    private readonly userDeleteRepo: UserDeleteRepository,
    private readonly kycRepo: KYCRepository,

    private readonly commonService: CommonService,
    private readonly cryptService: CryptService,
    private readonly fileService: FileService,
    private readonly msg91Service: Msg91Service,
    private readonly notificationService: SharedNotificationService,
    private readonly eligibilityService: EligibilitySharedService,
    private readonly allSmsService: AllsmsService,
  ) {
    if (gIsPROD || isUAT) this.firebaseDB = admin.firestore();
  }

  async generateOTP(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const smsKey = reqData?.smsKey;

      const extraAttr = type == 'phone' ? ['phone'] : ['email', 'fullName'];
      const userData = await this.getUserData(reqData, extraAttr);
      if (userData.message) return userData;
      const otp = this.commonService.generateOTP();
      const statusData = userData.masterData?.status ?? {};
      // Phone OTP
      if (type == 'phone') {
        if (!userData.phone)
          return k422ErrorMessage(
            'Please add phone number before proceeding for the verification',
          );
        const phone = this.cryptService.decryptPhone(userData.phone);
        await this.allSmsService.sendOtp(otp, phone, smsKey);
      }
      // Email OTP
      else if (type == 'email') {
        if (!userData.email)
          return k422ErrorMessage(
            'Please add email address before proceeding for the verification',
          );
        if (statusData.email == 1)
          return k422ErrorMessage('Email address already verified');
        const email = userData.email;
        const data = { name: userData.fullName, code: otp, userId: userId };
        await this.notificationService.sendEmail(kTEmailOtp, email, data);
      }

      const updateResult = await this.userRepo.updateRowData({ otp }, userId);
      if (updateResult == k500Error) return kInternalError;
      return { successMsg: 'OTP generated successfully' };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funVerifyOtpForDeleteAccount(reqData) {
    try {
      // Params validation
      const token = reqData.token;
      if (!token) return kParamMissing('token');
      const otp = reqData.otp;
      if (!otp) return kParamMissing('otp');
      const mode = reqData.mode;
      if (!mode) return kParamMissing('mode');

      const options = {
        where: {
          phone: {
            [Op.like]: token ? '%' + token + '%' : null,
          },
        },
      };
      const userDetails = await this.userRepo.getRowWhereData(
        ['id', 'otp'],
        options,
      );
      if (userDetails == k500Error) return kInternalError;
      if (!userDetails) return k422ErrorMessage(kNoDataFound);

      // OTP validation
      if (userDetails.otp != otp)
        return k422ErrorMessage('Incorrect OTP, Please try again');

      /// Check user last loan status
      let lastLoanStatus = await this.chekUserLoanStatus({
        userId: userDetails.id,
      });
      if (lastLoanStatus === false) {
        return k422ErrorMessage(ACTIVE_ACCOUNT_MSG);
      }

      /// Deleting user sensitive/personal data
      let updatedData = await this.deleteUserSensitiveData({
        userId: userDetails.id,
        mode: reqData.mode,
      });
      if (updatedData.message) return updatedData;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async getUserData(reqData, extraAttr = [], extraFields = []) {
    try {
      const id = reqData.userId;
      if (!id) return kParamMissing('userId');
      // Get user data
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['status', 'miscData', ...extraFields];
      const include = [masterInclude];
      const attributes = ['masterId', 'selfieId', ...extraAttr];
      const options = { include, where: { id } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      return userData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Send otp to user for delete account
  async funSendOtpForDeleteAccount(reqData) {
    try {
      // Params validation
      const mobileNo = reqData.mobileNo;
      if (!mobileNo) return kParamMissing('mobileNo');
      const smsKey = reqData?.smsKey;

      const encryptedPhone = await this.cryptService.encryptPhone(mobileNo);

      const attributes = ['id', 'fullName', 'isDeleted'];
      const options = {
        where: {
          phone: {
            [Op.like]: encryptedPhone.split('===')[1]
              ? '%' + encryptedPhone.split('===')[1] + '%'
              : null,
          },
        },
      };
      const userDetails = await this.userRepo.getRowWhereData(
        attributes,
        options,
      );
      if (userDetails == k500Error) return kInternalError;
      if (!userDetails) return k422ErrorMessage(kNoDataFound);

      const rData = { userId: userDetails.id, type: 'phone', smsKey };
      const otp = this.generateOTP(rData);
      return {
        showOTPBox: true,
        type: 'deleteAccount',
        token: encryptedPhone.split('===')[1],
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Fun for check user loan active or inprogress
  async chekUserLoanStatus(reqData) {
    try {
      const options = {
        where: { userId: reqData.userId },
        order: [['id', 'DESC']],
      };
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'loanStatus', 'esign_id'],
        options,
      );
      if (!loanData) return true;
      if (
        loanData.loanStatus === 'Active' ||
        (loanData.loanStatus === 'Accepted' && loanData.esign_id !== null)
      ) {
        return false;
      } else if (
        (loanData.loanStatus === 'InProcess' ||
          loanData.loanStatus === 'Accepted') &&
        loanData.esign_id === null
      ) {
        const remark = DELETE_ACCOUNT_MSG;
        const adminId = SYSTEM_ADMIN_ID;
        ///Reject loan if esign pending
        await this.eligibilityService.rejectLoan(
          adminId,
          loanData?.id,
          remark,
          reqData.userId,
          null,
        );
        await this.eligibilityService.checkAndRejectSteps(
          reqData.userId,
          remark,
        );
        return true;
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  /// fn for delete all user personal data
  async deleteUserSensitiveData(reqData) {
    try {
      let chatName = 'UAT-Chats';
      let RecentChatName = 'UAT-Recent Chats';
      if (gIsPROD) {
        chatName = 'Chats';
        RecentChatName = 'Recent Chats';
      }

      /// Add data to delete account report
      const reportData = {
        userId: reqData.userId,
        mode: reqData.mode,
      };
      const deleteData = await this.userDeleteRepo.createRowData(reportData);
      if (deleteData == k500Error) return kInternalError;
      if (!deleteData) return k422ErrorMessage(kNoDataFound);

      const options = { where: { userId: reqData.userId } };
      const options2 = { where: { id: reqData.userId } };

      /// Delete users single unique contact
      await this.conatctsRepo.deleteWhereData({
        where: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('array_length', Sequelize.col('userId'), 1),
              { [Op.eq]: 1 },
            ),
          ],
          userId: { [Op.contains]: [reqData.userId] },
        },
      });

      /// Get users multiple contact and remove
      const opt = {
        where: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('array_length', Sequelize.col('userId'), 1),
              { [Op.gt]: 1 },
            ),
          ],
          userId: { [Op.contains]: [reqData.userId] },
        },
      };
      const att = ['id', 'userId', 'name', 'searchName'];
      const uniqueData = await this.conatctsRepo.getTableWhereData(att, opt);
      if (uniqueData == k500Error) return kInternalError;
      if (!uniqueData) return k422ErrorMessage(kNoDataFound);
      uniqueData.forEach((item) => {
        const index = item.userId.indexOf(reqData.userId);
        item.userId.splice(index, 1);
        delete item.name[reqData.userId];
        this.conatctsRepo.updateRowData(item, item.id);
      });

      /// Get user employement files and update data
      const Files: any = {};
      Files.salarySlip = [];
      const empData = await this.employmentRepo.findAll(
        [
          'id',
          'companyPhone',
          'companyUrl',
          'companyAddress',
          'sectorId',
          'designationId',
          'startDate',
          'endDate',
          'salary',
          'salaryDate',
          'otp',
          'tempOtp',
          'pinAddress',
          'typeAddress',
          'companyAddressLatLong',
          'pinAddressLatLong',
          'employmentTypeId',
          'commision',
          'salarySlip1',
          'salarySlip1Type',
          'salarySlip2',
          'salarySlip2Type',
          'salarySlip3',
          'salarySlip3Type',
          'salarySlip1Password',
          'salarySlip2Password',
          'salarySlip3Password',
          'userEnteredDomain',
          'salarySlip1Response',
          'salarySlip2Response',
          'salarySlip3Response',
          'pincode',
          'city',
          'bankingId',
          'salarySlipId',
        ],
        options,
      );
      if (empData == k500Error) return kInternalError;
      if (!empData) return k422ErrorMessage(kNoDataFound);
      empData.forEach((item) => {
        if (item.salarySlip1) Files.salarySlip.push(item.salarySlip1);
        if (item.salarySlip2) Files.salarySlip.push(item.salarySlip2);
        if (item.salarySlip3) Files.salarySlip.push(item.salarySlip3);

        const updated: any = {};
        updated.companyPhone = '';
        updated.companyUrl = '';
        updated.companyAddress = '';
        updated.sectorId = 0;
        updated.designationId = 0;
        updated.startDate = null;
        updated.endDate = null;
        updated.salary = 0;
        updated.salaryDate = 0;
        updated.otp = 0;
        updated.tempOtp = 0;
        updated.pinAddress = '';
        updated.typeAddress = '';
        updated.companyAddressLatLong = [];
        updated.pinAddressLatLong = [];
        updated.employmentTypeId = 0;
        updated.commision = '';
        updated.salarySlip1 = '';
        updated.salarySlip1Type = '';
        updated.salarySlip2 = '';
        updated.salarySlip2Type = '';
        updated.salarySlip3 = '';
        updated.salarySlip3Type = '';
        updated.salarySlip1Password = '';
        updated.salarySlip2Password = '';
        updated.salarySlip3Password = '';
        updated.userEnteredDomain = '';
        updated.salarySlip1Response = '';
        updated.salarySlip2Response = '';
        updated.salarySlip3Response = '';
        updated.pincode = '';
        updated.city = '';
        updated.bankingId = null;
        updated.salarySlipId = null;

        this.employmentRepo.updateRowData(updated, item.id);
      });

      /// Get user employment history files and delete data
      const empHistoryData = await this.employmentHistoryRepo.findAll(
        ['id', 'salarySlip1'],
        options,
      );
      if (empHistoryData == k500Error) return kInternalError;
      if (!empHistoryData) return k422ErrorMessage(kNoDataFound);
      for (let i = 0; i < empHistoryData.length; i++) {
        if (empHistoryData[i].salarySlip1)
          Files.salarySlip.push(empHistoryData[i].salarySlip1);
      }
      await this.employmentHistoryRepo.deleteWhereData(options);

      /// Get user salary slip files and update
      const salarySlipData = await this.salarySlipRepo.findAll(
        [
          'id',
          'url',
          'netPayAmount',
          'salarySlipDate',
          'joiningDate',
          'panNumber',
          'bankAccountNumber',
          'response',
        ],
        options,
      );
      if (salarySlipData == k500Error) return kInternalError;
      if (!salarySlipData) return k422ErrorMessage(kNoDataFound);
      salarySlipData.forEach((item) => {
        if (item.url) Files.salarySlip.push(item.url);

        const updated: any = {};
        updated.url = '';
        updated.netPayAmount = 0;
        updated.salarySlipDate = null;
        updated.joiningDate = null;
        updated.panNumber = null;
        updated.bankAccountNumber = null;
        updated.response = '';
        this.salarySlipRepo.updateRowData(updated, item.id);
      });

      /// Get user selfie files and delete
      Files.selfie = [];
      const selfieData = await this.userSelfieRepo.getTableWhereData(
        ['id', 'image', 'tempImage'],
        options,
      );
      if (selfieData == k500Error) return kInternalError;
      if (!selfieData) return k422ErrorMessage(kNoDataFound);
      selfieData.forEach((item) => {
        if (item.image) Files.selfie.push(item.image);
        if (item.tempImage) Files.selfie.push(item.tempImage);
      });
      await this.userSelfieRepo.deleteWhereData(options);

      /// Get user banking files and update
      Files.banking = [];
      const bankingData = await this.bankingRepo.getTableWhereData(
        ['id', 'bankStatement', 'additionalBankStatement', 'additionalURLs'],
        options,
      );
      if (bankingData == k500Error) return kInternalError;
      if (!bankingData) return k422ErrorMessage(kNoDataFound);
      bankingData.forEach((item) => {
        if (item.bankStatement) Files.banking.push(item.bankStatement);
        if (item.additionalBankStatement)
          Files.banking.push(item.additionalBankStatement);
        if (item.additionalURLs && item.additionalURLs != '[]') {
          const addFiles = JSON.parse(item.additionalURLs);
          Files.banking.push(...addFiles);
        }
        const updated: any = {};
        updated.bankStatement = '';
        updated.additionalBankStatement = '';
        updated.additionalURLs = '[]';
        this.bankingRepo.updateRowData(updated, item.id);
      });

      /// Get user chat files and delete
      Files.chat = [];
      const chatData = await this.mediaRepo.getTableWhereData(
        ['id', 'docUrl'],
        options,
      );
      if (chatData == k500Error) return kInternalError;
      if (!chatData) return k422ErrorMessage(kNoDataFound);
      chatData.forEach((item) => {
        if (item.docUrl) Files.chat.push(item.docUrl);
      });
      await this.mediaRepo.deleteWhereData(options);

      /// Get user document files and delete
      Files.doc = [];
      const docData = await this.docHistoryRepo.getTableWhereData(
        ['id', 'documentFrontImage', 'documentBackImage'],
        options,
      );
      if (docData == k500Error) return kInternalError;
      if (!docData) return k422ErrorMessage(kNoDataFound);
      docData.forEach((item) => {
        if (item.documentFrontImage) Files.doc.push(item.documentFrontImage);
        if (item.documentBackImage) Files.doc.push(item.documentBackImage);
      });
      await this.docHistoryRepo.deleteWhereData(options);

      /// Get user mismatch files and update
      Files.mismatch = [];
      const mismatchData = await this.mismatchRepo.getTableWhereData(
        ['id', 'data'],
        options,
      );
      if (mismatchData == k500Error) return kInternalError;
      if (!mismatchData) return k422ErrorMessage(kNoDataFound);
      mismatchData.forEach((item) => {
        if (item.data) {
          let jData = JSON.parse(item.data);
          Files.mismatch.push(jData.filePath);
          const updated: any = {};
          delete jData['filePath'];
          updated.data = JSON.stringify(jData);
          this.mismatchRepo.updateRowData(updated, item.id);
        }
      });

      /// Deliting users data by userId

      await this.locationRepo.deleteWhereData(options);

      await this.employmentHistoryRepo.deleteWhereData(options);

      await this.referenceRepo.deleteWhereData(options);

      await this.addressRepo.deleteWhereData(options);

      await this.deviceandAppsRepo.deleteWhereData(options);

      await this.deviceSIMRepo.deleteWhereData(options);

      await this.flowRepo.deleteWhereData(options2);

      /// Get user kyc files and update
      Files.kyc = [];
      const kycData = await this.kycRepo.getTableWhereData(
        [
          'id',
          'aadhaarFront',
          'aadhaarBack',
          'pan',
          'otherDocFront',
          'otherDocBack',
          'aadhaarDoc',
          'profileImage',
        ],
        options,
      );
      if (kycData == k500Error) return kInternalError;
      if (!kycData) return k422ErrorMessage(kNoDataFound);
      kycData.forEach((item) => {
        if (item.aadhaarFront) Files.kyc.push(item.aadhaarFront);
        if (item.aadhaarBack) Files.kyc.push(item.aadhaarBack);
        if (item.pan) Files.kyc.push(item.pan);
        if (item.otherDocFront) Files.kyc.push(item.otherDocFront);
        if (item.otherDocBack) Files.kyc.push(item.otherDocBack);
        if (item.aadhaarDoc) Files.kyc.push(item.aadhaarDoc);
        if (item.profileImage) Files.kyc.push(item.profileImage);

        const updated: any = {};
        updated.aadhaarFront = null;
        updated.aadhaarBack = null;
        updated.pan = null;
        updated.otherDocFront = null;
        updated.otherDocBack = null;
        updated.aadhaarDoc = null;
        updated.profileImage = null;
        this.kycRepo.updateRowData(updated, item.id);
      });

      /// Get User All Chat data from firebase
      let getAllChat: any = await this.firebaseDB
        .collection(chatName)
        .doc(reqData.userId)
        .collection('Chats')
        .get();

      /// Get User Recent Chat data from firebase
      let getRecentChat: any = await this.firebaseDB
        .collection(RecentChatName)
        .doc(reqData.userId)
        .get();

      /// Update user recent chat if it is file
      if (
        getRecentChat.data() &&
        (getRecentChat.data().type == 'JPG' ||
          getRecentChat.data().type == 'PDF' ||
          getRecentChat.data().type == 'JPEG' ||
          getRecentChat.data().type == 'PNG')
      ) {
        this.firebaseDB.collection(RecentChatName).doc(reqData.userId).update({
          image: '',
          type: 'PNG',
          message: DELETED_FILE_PATH,
        });
      }

      /// Update user chat if it is file
      getAllChat.docs.forEach((item) => {
        if (
          item.data().type == 'JPG' ||
          item.data().type == 'PDF' ||
          item.data().type == 'JPEG' ||
          item.data().type == 'PNG'
        ) {
          this.firebaseDB
            .collection(chatName)
            .doc(reqData.userId)
            .collection('Chats')
            .doc(item.id)
            .update({
              type: 'PNG',
              message: DELETED_FILE_PATH,
            });
        }
      });

      ///Get user master data and update
      const masterOption = {
        where: { userId: reqData.userId },
        order: [['id', 'DESC']],
      };
      const masterData = await this.masterRepo.getTableWhereData(
        ['id', 'miscData', 'status', 'otherInfo', 'coolOffData', 'empId'],
        masterOption,
      );
      if (masterData == k500Error) return kInternalError;
      if (!masterData) return k422ErrorMessage(kNoDataFound);
      const lastMasterData = masterData[0];
      masterData.forEach((item) => {
        if (item.miscData.purposeId) item.miscData.purposeId = 0;
        if (item.miscData.purposeName) item.miscData.purposeName = '';
        if (item.miscData.lastLat) item.miscData.lastLat = 0;
        if (item.miscData.lastLong) item.miscData.lastLong = 0;
        if (item.miscData.lastLocation) item.miscData.lastLocation = '';
        if (item.miscData.lastLocationDateTime)
          item.miscData.lastLocationDateTime = 0;

        if (item.otherInfo.dependents) item.otherInfo.dependents = 0;
        if (item.otherInfo.motherName) item.otherInfo.motherName = '';
        if (item.otherInfo.salaryInfo) item.otherInfo.salaryInfo = 0;
        if (item.otherInfo.spouseName) item.otherInfo.spouseName = '';
        if (item.otherInfo.maritalInfo) item.otherInfo.maritalInfo = '';
        if (item.otherInfo.vehicleInfo) item.otherInfo.vehicleInfo = [];
        if (item.otherInfo.educationInfo) item.otherInfo.educationInfo = '';
        if (item.otherInfo.employmentInfo) item.otherInfo.employmentInfo = '';
        if (item.otherInfo.residentialInfo) item.otherInfo.residentialInfo = '';

        const updated: any = {};
        updated.miscData = item.miscData;
        updated.otherInfo = item.otherInfo;
        this.masterRepo.updateOnlyRowData(updated, item.id);
      });

      /// Get user loan data and update
      const loanData = await this.loanRepo.getTableWhereData(
        ['id', 'residenceId', 'purposeId', 'otp', 'loanPurpose'],
        options,
      );
      if (loanData == k500Error) return kInternalError;
      if (!loanData) return k422ErrorMessage(kNoDataFound);
      loanData.forEach((item) => {
        const updated: any = {};
        updated.residenceId = null;
        updated.purposeId = null;
        updated.otp = null;
        updated.loanPurpose = null;
        this.loanRepo.updateRowData(updated, item.id);
      });

      /// Get user proof image and delete
      Files.user = [];
      const userData = await this.userRepo.getRowWhereData(
        ['id', 'image', 'homeProofImage'],
        options2,
      );
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData.homeProofImage) Files.user.push(userData.homeProofImage);
      if (userData.image) Files.user.push(userData.image);

      /// Count all files
      const totalFileCount =
        Files.salarySlip.length +
        Files.selfie.length +
        Files.banking.length +
        Files.chat.length +
        Files.doc.length +
        Files.mismatch.length +
        Files.kyc.length +
        Files.user.length;

      /// Count unique files
      const allFiles = [
        ...Files.salarySlip,
        ...Files.selfie,
        ...Files.banking,
        ...Files.chat,
        ...Files.doc,
        ...Files.mismatch,
        ...Files.kyc,
        ...Files.user,
      ];
      const uniqueFiles = [...new Set(allFiles)];

      const dates = {
        registration: new Date().getTime(),
        basicDetails: 0,
        aadhaar: 0,
        employment: 0,
        banking: 0,
        residence: 0,
        eligibility: 0,
        eMandate: 0,
        eSign: 0,
        disbursement: 0,
      };
      let status = {
        pan: -1,
        pin: -1,
        bank: -1,
        loan: lastMasterData?.status?.loan,
        basic: -1,
        eSign: -1,
        email: 1,
        phone: 1,
        selfie: -1,
        aadhaar: -1,
        company: -1,
        contact: -1,
        eMandate: -1,
        personal: -1,
        workMail: -1,
        reference: -1,
        repayment: -2,
        residence: -1,
        permission: -1,
        salarySlip: -1,
        disbursement: -1,
        professional: -1,
      };
      const createdData = await this.masterRepo.createRowData({
        status,
        dates,
        userId: reqData.userId,
        coolOffData: lastMasterData?.coolOffData,
        empId: lastMasterData?.empId,
        assignedCSE: null,
      });
      if (createdData == k500Error) return kInternalError;
      if (!createdData) return k422ErrorMessage(kNoDataFound);

      ///Update user data
      const updated: any = {};
      updated.isDeleted = 1;
      updated.isCibilConsent = 0;
      updated.pin = null;
      updated.token = null;
      updated.fcmToken = null;
      updated.residenceAddress = '';
      updated.homeProofImage = null;
      updated.pinAddress = '';
      updated.typeAddress = '';
      updated.pinAddresslatLong = [];
      updated.selfieId = null;
      updated.image = '';
      updated.defaulterContactCount = 0;
      updated.defaulterCount = 0;
      updated.masterId = createdData.id;
      let updatedData = await this.userRepo.updateRowData(
        updated,
        reqData.userId,
      );
      if (updatedData == k500Error) return kInternalError;
      if (!updatedData) return k422ErrorMessage(kNoDataFound);

      /// Update user all files to report
      const Rupdated: any = {};
      Rupdated.totalFileCount = totalFileCount;
      Rupdated.uniqueFileCount = uniqueFiles.length;
      Rupdated.allFiles = Files;
      await this.userDeleteRepo.updateRowData(Rupdated, deleteData.id);

      /// Delete all files from google cloud storage
      const errorFiles = [];
      for (let index = 0; index < uniqueFiles.length; index++) {
        const element = uniqueFiles[index];
        const res = await this.fileService.deleteGoogleCloudeFile(element);
        if (res != 204) errorFiles.push(element);
      }

      /// Update error files and complete all delete
      const Rupdated2: any = {};
      Rupdated2.status = 'Complete';
      Rupdated2.errorFileCount = errorFiles.length;
      Rupdated2.errorFiles = errorFiles;
      await this.userDeleteRepo.updateRowData(Rupdated2, deleteData.id);

      return updatedData;
    } catch (error) {
      console.log(error);
      return kInternalError;
    }
  }
}
