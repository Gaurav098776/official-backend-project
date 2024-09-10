// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { KYCEntity } from 'src/entities/kyc.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { AwsService } from 'src/thirdParty/awsServices/aws.service';
import { UserSelfieRepository } from 'src/repositories/user.selfie.repository';
import { Op, Sequelize } from 'sequelize';
import { AdminRepository } from 'src/repositories/admin.repository';
import { RedisService } from 'src/redis/redis.service';
import { CryptService } from 'src/utils/crypt.service';
import { TemplateRepository } from 'src/repositories/template.repository';
import { PurposeRepository } from 'src/repositories/purpose.repository';
import { EmployementDegignationRepository } from 'src/repositories/degignation.repository';
import { EmployementSectoreRepository } from 'src/repositories/sector.repository';
import { BankingEntity } from 'src/entities/banking.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import {
  GlobalServices,
  SYSTEM_ADMIN_ID,
  gIsPROD,
  valueInsurance,
  AADHARE_LAT_LONG_RADIUS,
  UAT_PHONE_NUMBER,
  LOGOUTTIME,
  BELOW_OUTSTANDING_AMOUNT,
  templateDesign,
  ADDRESS_MATCH_PERCENTAGE,
} from 'src/constants/globals';
import {
  KLOANCHANGEABLE,
  KLOANREFUND,
  kCompleted,
  kInsurance,
  kInsuranceRelationshipCode,
  kRefund,
  kSomthinfWentWrong,
} from 'src/constants/strings';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { ManualVerifiedWorkEmailRepository } from 'src/repositories/manualVerifiedWorkEmail.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { UserStage } from 'src/constants/objects';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { TypeService } from 'src/utils/type.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { MasterRepository } from 'src/repositories/master.repository';
import { MasterEntity } from 'src/entities/master.entity';
import { EMIRepository } from 'src/repositories/emi.repository';
import { TransactionEntity } from 'src/entities/transaction.entity';
import * as fs from 'fs';
import {
  PY_BACKEND_BASE_URL_LSP,
  PY_BACKEND_BASE_URL_NBFC,
} from 'src/constants/network';
import { log } from 'console';
import { ActiveLoanAddressesEntity } from 'src/entities/activeLoanAddress.entity';

let gActiveCollectionExecutives = [];

@Injectable()
export class CommonSharedService {
  allLoanPurpose: any[];
  allAdminData: any[] = [];
  allDesignationData: any[];
  allSectorData: any[];
  constructor(
    private readonly userRepo: UserRepository,
    private readonly awsService: AwsService,
    private readonly selfieRepo: UserSelfieRepository,
    private readonly adminRepo: AdminRepository,
    private readonly typeService: TypeService,
    private readonly redisService: RedisService,
    private readonly cryptService: CryptService,
    private readonly staticConfig: StaticConfigRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly purposeRepo: PurposeRepository,
    private readonly designationRepo: EmployementDegignationRepository,
    private readonly sectorRepo: EmployementSectoreRepository,
    private readonly loanRepo: LoanRepository,
    private readonly manualWorkMailRepo: ManualVerifiedWorkEmailRepository,
    private readonly legalCollectionRepo: LegalCollectionRepository,
    private readonly empRepo: EmploymentRepository,
    private readonly KYCRepo: KYCRepository,
    // Database
    private readonly repoManager: RepositoryManager,
    private readonly whatsAppService: WhatsAppService,
    private readonly masterRepo: MasterRepository,
    // Repositories
    private readonly emiRepo: EMIRepository,
  ) {
    this.getAdminData(1);
  }

  //#region validate with aadhare profile image return selfie status
  async validateWithAadhareImage(userId, statusData) {
    try {
      const aadhaar = statusData?.aadhaar ?? -1;
      const selfie = statusData?.selfie ?? -1;
      if (aadhaar == 1 || aadhaar == 3) {
        /// kyc include
        const kycInclude: any = { model: KYCEntity };
        kycInclude.attributes = ['aadhaarFront', 'profileImage'];
        /// selfie include
        const selfieInclude: any = { model: UserSelfieEntity };
        selfieInclude.attributes = ['image'];
        const include = [kycInclude, selfieInclude];
        const options = { where: { id: userId }, include };
        const att = ['id', 'selfieId', 'isRedProfile'];
        const userData = await this.userRepo.getRowWhereData(att, options);
        if (!userData || userData === k500Error) return 5;
        const kycData = userData?.kycData;
        const aadhaarImg = kycData?.profileImage ?? kycData?.aadhaarFront ?? '';
        const isRedProfile = (userData?.isRedProfile ?? 0) === 2;
        const checkExitsData = await this.selfieRepo.getRowWhereData(
          ['details', 'id', 'tempImage'],
          { where: { userId }, order: [['id', 'DESC']] },
        );
        if (checkExitsData === k500Error) return kInternalError;
        const selfieImg =
          checkExitsData?.tempImage ?? userData?.selfieData?.image ?? '';
        if (!aadhaarImg || !selfieImg) return 5;
        /// compare image to aws
        const data = { imageA: selfieImg, imageB: aadhaarImg };
        const result = await this.awsService.compareImages(data);
        // update selfie data
        const verifiedDate = new Date().toJSON();
        const response = result?.message ? '' : JSON.stringify(result);
        const updatedData: any = {
          response,
          status: '0',
          verifiedDate,
        };
        if (
          checkExitsData?.details?.selfieFromRetry === true &&
          !isRedProfile
        ) {
          if (!checkExitsData?.tempImage) updatedData.tempImage = selfieImg;
          await this.selfieRepo.updateRowData(updatedData, userData.selfieId);
          return 0;
        }
        if (result?.isMatched) {
          if (selfie == 2) updatedData.status = '0';
          else {
            updatedData.status = '1';
            updatedData.image = selfieImg;
          }
        }

        /// if old defulter then approved
        if (isRedProfile) updatedData.status = '1';
        await this.selfieRepo.updateRowData(updatedData, userData.selfieId);
        if (isRedProfile) return 1;
        if (result?.isMatched) {
          if (selfie == 2) return 0;
          else return 1;
        } else return 0;
      } else return 5;
    } catch (error) {
      return 5;
    }
  }

  async validatedToken(token) {
    try {
      let jsonData = [];
      const key = `ADMIN_JWTDETAILS`;
      const rawData = await this.redisService.getKeyDetails(key);
      if (rawData) jsonData = JSON.parse(rawData);

      const currDate = new Date();

      // Check if the token is in the JSON file and if it's valid
      let tokenData = jsonData.find((entry) => entry.jwtToken === token);
      if (tokenData) {
        const expiryDate = new Date(tokenData.jwtTokenExpireDate);
        if (expiryDate.getTime() > currDate.getTime())
          return { id: tokenData.id, roleId: tokenData.roleId };
      }
      const att = ['id', 'roleId', 'jwtDetails'];
      const where = { jwtDetails: { [Op.iRegexp]: token }, isActive: '1' };
      const result = await this.adminRepo.getRoweData(att, { where });
      if (!result || result === k500Error) return false;
      const jwt = result.jwtDetails;
      if (jwt) {
        const find = JSON.parse(jwt).find((f) => f.jwtToken === token);
        if (find) {
          const currDate = new Date();
          const expiryDate = new Date(find.jwtTokenExpireDate);
          if (expiryDate.getTime() > currDate.getTime()) {
            const newTokenData = {
              id: result.id,
              roleId: result.roleId,
              jwtToken: token,
              jwtTokenExpireDate: find.jwtTokenExpireDate,
            };

            // Store the new token data in the JSON file
            const index = jsonData.findIndex(
              (token) => token.id === newTokenData.id,
            );
            if (index !== -1) jsonData[index] = newTokenData;
            else jsonData.push(newTokenData);

            await this.redisService.updateKeyDetails(
              key,
              JSON.stringify(jsonData),
            );

            return { id: result.id, roleId: result.roleId };
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  getPythonBaseUrl(appType = 0) {
    return appType == 1 ? PY_BACKEND_BASE_URL_NBFC : PY_BACKEND_BASE_URL_LSP;
  }
  async validateRights(email, token, type?) {
    try {
      const data = await this.checkNValidateToken(email, token);
      if (data.isExpired) return false;
      if (type == KLOANCHANGEABLE) {
        if (data.adminData && data.adminData.changeableData) {
          return true;
        }
      } else if (type == KLOANREFUND) {
        if (data.adminData && data.adminData.isRefund) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async checkNValidateToken(email, token) {
    try {
      const attributes = [
        'id',
        'fullName',
        'roleId',
        'email',
        'password',
        'phone',
        'jwtDetails',
        'thirdPartyViews',
        'changeableData',
        'isRefund',
      ];
      const allAdmins = await this.adminRepo.getTableWhereData(attributes, {});

      let checkUser;
      for (let index = 0; index < allAdmins.length; index++) {
        try {
          const adminData = allAdmins[index];

          adminData.email = await this.cryptService.decryptText(
            adminData.email,
          );

          if (adminData.email == email.toLowerCase()) {
            checkUser = adminData;
            break;
          }
        } catch (error) {}
      }
      let currJwt;
      let isTokenExpired = true;
      if (checkUser.jwtDetails) {
        JSON.parse(checkUser.jwtDetails).map((singleData) => {
          if (token == singleData.jwtToken) {
            currJwt = singleData;
          }
        });
        if (currJwt) {
          const currDate = new Date();
          const expiryDate = new Date(currJwt.jwtTokenExpireDate);
          isTokenExpired = expiryDate.getTime() < currDate.getTime();
        } else {
          isTokenExpired = true;
        }
      }
      return { isExpired: isTokenExpired, adminData: checkUser };
    } catch (error) {
      return { isExpired: false };
    }
  }

  async getServiceName(serviceName) {
    const info = await this.redisService.get(serviceName);
    return info ?? GlobalServices[serviceName];
  }

  //#region addOrUpdateStaticConfig
  async addOrUpdateStaticConfig(body) {
    try {
      if (!gIsPROD) {
        let data = body?.value;
        const type = body?.type;
        if (!type || !data) return kParamMissing();
        if (typeof data === 'object' && !data.length) data = [data];
        else if (typeof data != 'object') data = [data];
        const att = ['id'];
        const options = { where: { type } };
        const find = await this.staticConfig.getRowWhereData(att, options);
        let id;
        if (find?.id) id = find.id;
        if (id) {
          const updateData = { data };
          const update = await this.staticConfig.updateRowData(updateData, id);
          if (!update || update === k500Error) return kInternalError;
        } else {
          const createData = { type, data };
          const create = await this.staticConfig.create(createData);
          if (!create || create === k500Error) return kInternalError;
        }
      } else return k422ErrorMessage(kSomthinfWentWrong);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region refresh insurance array
  async refreshInsuranceArray() {
    try {
      const options = {
        where: { type: [kInsurance, kInsuranceRelationshipCode] },
      };
      const att = ['id', 'type', 'data'];
      let filter = await this.staticConfig.getTableWhereData(att, options);
      if (!filter || filter === k500Error) return kInternalError;
      let filterObj: any = {};
      for (let i = 0; i < filter.length; i++) {
        try {
          const ele = filter[i];
          Object.assign(filterObj, JSON.parse(ele.data));
        } catch (error) {}
      }
      return { ...filterObj };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion
  async checkManualWorkMail(
    workMailData,
    empData,
    updateData,
    approveById = SYSTEM_ADMIN_ID,
  ) {
    try {
      const workMail = workMailData.email;
      const domain = workMail.split('@')[1];
      const companyName = (empData?.companyName ?? '').toLowerCase().trim();
      if (!companyName) return false;
      let url = (empData?.companyUrl ?? '_URL').trim();
      if (!url) url = '_URL';
      const where = {
        domain,
        isActive: true,
        approveById: { [Op.ne]: null },
        companyName,
      };
      const checkExits = await this.manualWorkMailRepo.getRowWhereData(
        ['id', 'domain', 'url'],
        { where },
      );
      if (approveById != SYSTEM_ADMIN_ID) {
        if (
          (!checkExits || checkExits == k500Error) &&
          (updateData.status == '1' || updateData.status == '3')
        ) {
          const create = {
            domain,
            url,
            isActive: true,
            approveById,
            companyName,
          };
          await this.manualWorkMailRepo.create(create);
          return true;
        } else if (!checkExits || checkExits == k500Error) return false;
        else {
          const findURL = checkExits?.url ?? '_URL';
          if (findURL == '_URL' && findURL != url) {
            const update = { url, approveById };
            await this.manualWorkMailRepo.update(update, { id: checkExits.id });
          }
        }
      }
      if (!checkExits || checkExits == k500Error) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  //get transactions failed reason
  getFailedReason(response) {
    try {
      const failResponse = JSON.parse(response);
      let reason = '-';
      if (failResponse) {
        if (failResponse?.adNotPlaced === true) {
          reason = failResponse?.errorMsg ?? '-';
        } else if (failResponse.reason === 'INTERNAL_SERVER_ERROR') {
          reason = '-';
        } else {
          reason =
            failResponse?.error_message === 'NA'
              ? '-'
              : failResponse?.payment?.failureReason ??
                failResponse?.failureReason ??
                failResponse?.reason ??
                failResponse?.error_description ??
                '-';
        }
      }
      return reason;
    } catch (error) {
      return '-';
    }
  }

  async getRejectReasonTemplate(rejectReason) {
    try {
      if (!rejectReason) return {};
      const template = await this.templateRepo.getRowWhereData(['content'], {
        where: { title: rejectReason },
      });
      if (template === k500Error) return kInternalError;
      return template;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getEligibleInterestRate(reqData) {
    // Params validation
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');

    const options = {
      where: { userId },
      order: [['id', 'desc']],
    };

    const loanData = await this.loanRepo.getRowWhereData(
      ['id', 'interestRate'],
      options,
    );
    if (loanData == k500Error) throw new Error();
    let interestRate = loanData?.interestRate;
    const needDelayTag = reqData?.needDelayTag == true;
    const checkBanner = reqData?.checkBanner == true;
    // Update user data
    // await this.userRepo.updateRowData({ interestRate }, userId);

    // Returns the interest rate details with warrnings
    let delayInterestRate;

    if (needDelayTag) return { interestRate, delayInterestRate };
    if (checkBanner) return { interestRate, getBanner: false };

    return interestRate;
  }

  //#region this fun call for get company detials
  async getTansactionQueryParams(
    loanId,
    isCheckAddional = false,
    getData = false,
    accountNumber = '',
    referralFlow = false,
    bankCode?,
  ) {
    try {
      if (!loanId && !referralFlow) return kParamMissing('loanId');
      /// banking inclued
      const attributes = ['accountNumber', 'bank'];
      if (isCheckAddional) attributes.push('additionalAccountNumber');
      if (getData) attributes.push('salaryDate');
      const bankingModel = { model: BankingEntity, attributes };
      /// user inclued
      const empModel = {
        model: employmentDetails,
        attributes: ['companyName', 'salary'],
      };
      const userModel = {
        model: registeredUsers,
        attributes: ['id', 'fullName'],
        include: [empModel],
      };
      const include = [bankingModel, userModel];
      const options = { where: { id: loanId }, include };
      const att = ['id', 'userId', 'loan_disbursement_date', 'completedLoan'];
      const result = await this.loanRepo.getRowWhereData(att, options);
      if ((!result || result === k500Error) && !referralFlow)
        return kInternalError;
      const where = {
        id: { [Op.lt]: result?.id },
        loanStatus: 'Complete',
        userId: result.userId,
      };
      const lastLoan =
        result?.completedLoan > 0
          ? await this.loanRepo.getRowWhereData(att, {
              where,
              order: [['id', 'desc']],
            })
          : {};
      let url = '';
      try {
        const bank = result?.bankingData;
        const emp = result?.registeredUsers?.employmentData;
        const name = result?.registeredUsers?.fullName ?? '';
        let salaryAccountId = bank?.accountNumber ?? accountNumber ?? '';
        if (accountNumber) salaryAccountId = accountNumber ?? salaryAccountId;
        const additionalAccountId = bank?.additionalAccountNumber ?? '';
        const companyName = encodeURIComponent(emp?.companyName ?? '');
        const salary = +(emp?.salary ?? 0);
        const endDate = result?.loan_disbursement_date ?? '';
        const ecsCheckDate = lastLoan?.loan_disbursement_date ?? '';
        if (!salaryAccountId) return kInternalError;
        if (salaryAccountId) url += '?salaryAccountId=' + salaryAccountId;
        if (additionalAccountId && isCheckAddional)
          url += '&additionalAccountId=' + additionalAccountId;
        if (companyName) url += '&companyName=' + companyName;
        if (salary) url += '&salary=' + salary;
        if (endDate) url += '&endDate=' + endDate;
        if (ecsCheckDate) url += '&ecsCheckDate=' + ecsCheckDate;
        if (name) url += '&name=' + name;
        if (bank?.bank ?? bankCode)
          url += '&bankCode=' + (bank?.bank ?? bankCode);
      } catch (error) {}
      if (url) url = encodeURI(url);
      if (getData) return { ...result, url };
      return url;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }
  //#endregion

  //#region
  async getLoanPurpose(purposeId: number) {
    try {
      if (this.allLoanPurpose?.length > 0) {
        const findData = this.allLoanPurpose.find(
          (item) => item.id === purposeId,
        );
        if (findData) return findData;
        else this.allLoanPurpose = [];
      } else {
        const data: any = await this.purposeRepo.getTableWhereData(
          ['id', 'purposeName'],
          {},
        );
        if (data == k500Error) this.allLoanPurpose = [];
        this.allLoanPurpose = data;
        const findData = this.allLoanPurpose.find(
          (item) => item.id === purposeId,
        );
        if (findData) return findData;
      }
    } catch (error) {
      this.allLoanPurpose = [];
    }
  }
  //#endregion

  //#region get admin Data from adminId
  async getAdminData(filterByKey: number | string) {
    try {
      if (filterByKey == SYSTEM_ADMIN_ID || !filterByKey)
        return { id: filterByKey, fullName: 'System' };
      if (this.allAdminData.length > 0) {
        const findData = this.allAdminData.find(
          (item) =>
            item.id == filterByKey ||
            item.email == filterByKey ||
            item.companyPhone == filterByKey ||
            item.phone == filterByKey,
        );
        if (findData) return findData;
        else this.allAdminData = [];
      } else {
        const data = await this.adminRepo.getTableWhereData(
          ['id', 'fullName', 'email', 'phone', 'companyPhone'],
          {},
        );

        if (!data || data == k500Error) this.allAdminData = [];
        else {
          for (let i = 0; i < data.length; i++) {
            data[i].email = await this.cryptService.decryptText(data[i].email);
            data[i].phone = await this.cryptService.decryptText(data[i].phone);
            data[i].companyPhone = await this.cryptService.decryptText(
              data[i].companyPhone,
            );
          }
          this.allAdminData = data;
          const findData = this.allAdminData.find(
            (item) =>
              item.id == filterByKey ||
              item.email == filterByKey ||
              item.companyPhone == filterByKey ||
              item.phone == filterByKey,
          );
          if (findData) return findData;
        }
      }
    } catch (error) {
      this.allAdminData = [];
    }
  }
  //#endregion

  async getDesignationData(id: number) {
    try {
      if (this.allDesignationData?.length > 0) {
        const findData = this.allDesignationData.find((item) => item.id == id);
        if (findData) return findData;
        else this.allDesignationData = [];
      } else {
        const data = await this.designationRepo.getTableWhereData(
          ['id', 'designationName'],
          {},
        );
        if (data == k500Error) this.allDesignationData = [];
        this.allDesignationData = data;
        const findData = this.allDesignationData.find((item) => item.id == id);
        if (findData) return findData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async getSectorData(id: number) {
    try {
      if (this.allSectorData?.length > 0) {
        const findData = this.allSectorData.find((item) => item.id == id);
        if (findData) return findData;
        else this.allSectorData = [];
      } else {
        const data = await this.sectorRepo.getTableWhereData(
          ['id', 'sectorName'],
          {},
        );
        if (data == k500Error) this.allSectorData = [];
        this.allSectorData = data;
        const findData = this.allSectorData.find((item) => item.id == id);
        if (findData) return findData;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  //get legal notice by loanId and noticeType
  async getLegalDataByLoanId(loanId, noticeType?) {
    try {
      const attr = ['sentType', 'createdAt', 'type', 'dates'];
      const options: any = {
        where: {
          loanId,
          otherDetails: {
            isAssign: { [Op.or]: [-1, null] },
            isHistory: { [Op.or]: [-1, null] },
          },
        },
        order: [['id', 'DESC']],
      };
      if (noticeType) options.where.type = noticeType;
      const legalData = await this.legalCollectionRepo.getRowWhereData(
        attr,
        options,
      );
      if (legalData != k500Error && legalData) return legalData;
      return {};
    } catch (error) {
      return {};
    }
  }

  //collection executive
  async getCollectionExecutive(adminId) {
    let adminList = [];
    if (adminId != -1) adminList.push(adminId);
    else {
      if (gActiveCollectionExecutives.length != 0)
        return gActiveCollectionExecutives;

      const attributes = ['followerId'];
      const options = {
        group: ['followerId'],
        where: { followerId: { [Op.ne]: null } },
      };
      const followerList = await this.loanRepo.getTableWhereData(
        attributes,
        options,
      );
      adminList = followerList.map((el) => el.followerId);

      let totalAdmins = await this.adminRepo.getTableWhereData(
        ['isActive', 'id'],
        { where: { id: adminList } },
      );
      totalAdmins = totalAdmins.filter((el) => el.isActive == '1');
      gActiveCollectionExecutives = totalAdmins.map((el) => el.id);
      return gActiveCollectionExecutives;
    }

    return adminList;
  }

  stageNumberToStr(stageNumber) {
    switch (stageNumber) {
      case UserStage.PHONE_VERIFICATION:
        return 'PHONE_VERIFICATION';

      case UserStage.BASIC_DETAILS:
        return 'BASIC_DETAILS';

      case UserStage.SELFIE:
        return 'SELFIE';

      case UserStage.NOT_ELIGIBLE:
        return 'NOT_ELIGIBLE';

      case UserStage.PIN:
        return 'PIN';

      case UserStage.AADHAAR:
        return 'AADHAAR';

      case UserStage.EMPLOYMENT:
        return 'EMPLOYMENT';

      case UserStage.BANKING:
        return 'BANKING';

      case UserStage.RESIDENCE:
        return 'RESIDENCE';

      case UserStage.LOAN_ACCEPT:
        return 'LOAN_ACCEPT';

      case UserStage.CONTACT:
        return 'CONTACT';

      case UserStage.PAN:
        return 'PAN';

      case UserStage.FINAL_VERIFICATION:
        return 'FINAL_VERIFICATION';

      case UserStage.MANDATE:
        return 'MANDATE';

      case UserStage.ESIGN:
        return 'ESIGN';

      case UserStage.DISBURSEMENT:
        return 'DISBURSEMENT';

      case UserStage.REPAYMENT:
        return 'REPAYMENT';

      case UserStage.EXPRESS_REAPPLY:
        return 'EXPRESS REAPPLY';

      case UserStage.REAPPLY:
        return 'REAPPLY';

      default:
        return '-';
    }
  }

  // verify AadhaarLatLong
  async verifyAadhaarLatLong(userId, isData = false) {
    try {
      // find company name of user according to userId
      let attribute = ['companyName'];
      const options = { where: { userId } };
      const data = await this.empRepo.getRowWhereData(attribute, options);
      const companyName = data?.companyName;
      if (!companyName) return { status: false, enum: 'COMPANY_NAME_NOT_FIND' };
      //find user same company
      const result: any = await this.getSameCompanyUsers(companyName);
      if (result?.status || result?.enum) return result;
      if (result.length === 0) return { status: true };
      //if userid find in  getSameCompanyUsers() then match AadhaarLatLong under 5km
      return await this.matchAadhaarLatLong(userId, result, isData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // get user of same company Name
  async getSameCompanyUsers(companyName) {
    try {
      const attributes = ['userId'];
      const empOptions = { where: { companyName } };
      const companyListUser = await this.empRepo.getTableWhereData(
        attributes,
        empOptions,
      );
      if (!companyListUser || companyListUser == k500Error)
        return { status: false, enum: 'COMPANY_NAME_NOT_FIND' };

      const ids = [...new Set(companyListUser.map((item) => item.userId))];
      if (ids.length === 0) return { status: true };

      //get active user according to loan status active
      return await this.getActiveUsers(ids);
    } catch (error) {
      return { status: false, enum: 'COMPANY_NAME_NOT_FIND' };
    }
  }

  //get user which loan status active
  async getActiveUsers(userId) {
    try {
      const att = ['userId', 'id'];
      const options = { where: { userId, loanStatus: 'Active' } };
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result == k500Error)
        return { status: false, enum: 'PROBLEM_IN_ACTIVE' };
      return result;
    } catch (error) {
      return { status: false, enum: 'PROBLEM_IN_ACTIVE' };
    }
  }

  //check user between 5km
  async matchAadhaarLatLong(userId, Ids, isData) {
    try {
      const activeUserId = [...new Set(Ids.map((item) => item.userId))];
      const att = ['aadhaarLatLongPoint'];
      const options = { where: { userId } };

      const result = await this.KYCRepo.getRowWhereData(att, options);

      const aadhaarLatLongPoint = result?.aadhaarLatLongPoint ?? '-';
      if (!result || result == k500Error || aadhaarLatLongPoint === '-')
        return { status: false, enum: 'AADHAR_LAT_LONG_NOT_FOUND' };

      const userLat = aadhaarLatLongPoint['x'];
      const userLng = aadhaarLatLongPoint['y'];
      let kycOptions: any = {
        where: {
          userId: activeUserId,
          aadhaarStatus: '1',
          [Op.and]: [
            Sequelize.literal(`ACOS(
              SIN(RADIANS(${userLat})) * SIN(RADIANS("KYCEntity"."aadhaarLatLongPoint"[0])) +
              COS(RADIANS(${userLat})) * COS(RADIANS("KYCEntity"."aadhaarLatLongPoint"[0])) *
              COS(RADIANS("KYCEntity"."aadhaarLatLongPoint"[1]) - RADIANS(${userLng}))
          ) * 3958.8 <=${AADHARE_LAT_LONG_RADIUS}`),
          ],
        },
      };

      const users = await this.KYCRepo.getTableWhereData(
        ['id', 'userId'],
        kycOptions,
      );
      if (users === k500Error)
        return { status: false, enum: 'AADHAR_LAT_LONG_NOT_FOUND' };
      const userList = users.map((el) => el?.userId);
      // get exact aadhaar address users
      const matchAadhaarAddressUserIds = await this.matchExactAadhaarAddress(
        userId,
      );
      if (matchAadhaarAddressUserIds?.status == false)
        return matchAadhaarAddressUserIds;
      const exactAddressUsersLength =
        matchAadhaarAddressUserIds.exactMatchUsers.length;
      if (exactAddressUsersLength > 0) {
        const finalData = {};
        finalData['status'] = false;
        finalData['enum'] = 'LAT_LONG_FOUND_WITH_EXACT_ADDRESS';
        finalData['users'] = users.length ?? 0;
        finalData['exactAddressUsersList'] =
          matchAadhaarAddressUserIds.exactMatchUsers;
        finalData['exactAddressUsers'] = exactAddressUsersLength;
        if (users.length > 0) finalData['userList'] = userList;
        return finalData;
      }

      if (users.length == 0) {
        return {
          status: true,
          enum: 'LAT_LONG_NOT_FOUND_IN_ACTIVE_LOAN',
          users: users.length ?? 0,
        };
      }
      return {
        status: false,
        enum: 'LAT_LONG_FOUND_IN_ACTIVE_LOAN',
        users: users.length ?? 0,
        userList,
      };
    } catch (error) {
      return { status: false, enum: 'AADHAR_LAT_LONG_NOT_FOUND' };
    }
  }
  // get aadhaar location exact or within 5km
  async findAadhaarLocationUsers(userId: string, type: string) {
    const predictionInclude = {
      model: PredictionEntity,
      attribute: ['id', 'reason'],
    };
    if (type == 'nearest')
      predictionInclude['where'] = { aadhaarLatLong: false };
    const att = ['userId', 'id'];
    const options: any = { where: { userId }, order: [['id', 'DESC']] };
    options.include = [predictionInclude];
    const loanData = await this.loanRepo.getRowWhereData(att, options);
    if (loanData === k500Error) throw new Error();
    if (!loanData) return {};
    let predictReasonData = loanData?.predictionData?.reason;
    if (!predictReasonData) return {};
    predictReasonData = JSON.parse(predictReasonData);
    const exactMatchUsers = predictReasonData?.exactMatchAddressUsers ?? [];
    let exactMatchUsersPercentage =
      predictReasonData?.exactMatchAddressPercentage ?? [];
    let exactMatchAddressUserIds = exactMatchUsers;
    const oldUsers = exactMatchUsers[0]?.userId ? false : true;
    if (!oldUsers) {
      exactMatchAddressUserIds = exactMatchUsers.map((user) => user.userId);
      exactMatchUsersPercentage = exactMatchUsers.map(
        (user) => user.matchedPercentage,
      );
    }
    const userIds =
      type == 'nearest'
        ? predictReasonData?.matchLatLongUsers
        : exactMatchAddressUserIds;
    if (!userIds) return {};
    //emiInclude for penalty_days
    const emiInclude = {
      model: EmiEntity,
      attributes: [
        'emi_date',
        'payment_due_status',
        'penalty_days',
        'penalty_update_date',
      ],
    };
    //userInclude for users name
    const userInclude: any = {
      model: registeredUsers,
      attributes: ['id', 'fullName', 'phone'],
    };
    //kycInclude for aadhaar Aadress
    const kycInclude = {
      model: KYCEntity,
      attributes: ['id', 'aadhaarAddressResponse', 'aadhaarAddress'],
    };
    userInclude.include = [kycInclude];
    const include = [userInclude, emiInclude];
    const loanOptions: any = {
      where: {
        userId: userIds,
        loanStatus: { [Op.in]: ['Active', 'Complete'] },
      },
      include,
    };
    const attributes = ['id', 'userId', 'loanStatus'];
    const userMatchData = await this.loanRepo.getTableWhereData(
      attributes,
      loanOptions,
    );
    if (userMatchData === k500Error) throw new Error();
    const finalData = [];
    for (let i = 0; i < userMatchData.length; i++) {
      try {
        const element = userMatchData[i];
        const exist = finalData.find(
          (data) => data['User Id'] === element.userId,
        );
        if (exist) continue;
        let loanStatus = element?.loanStatus ?? '-';
        const emi = element.emiData.find(
          (emi) => emi.payment_due_status === '1',
        );
        // if (exactMatchUsers[0]?.userId) {
        //   const userDetails = exactMatchUsers.find(
        //     (user) => user.userId == element.userId,
        //   );
        // }
        const userIdIndex = userIds.findIndex((user) => user == element.userId);
        if (emi) loanStatus = 'Delay';
        const fullName = element?.registeredUsers?.fullName ?? '-';
        const phoneNumber =
          this.cryptService.decryptPhone(element?.registeredUsers?.phone) ??
          '-';
        const aadhaarAddress = this.typeService.getAadhaarAddress(
          element?.registeredUsers?.kycData,
        );
        const penalty_days = this.typeService.getOverDueDay(element?.emiData);

        const temp = {};
        temp['User Id'] = element?.userId ?? '-';
        temp['Loan ID'] = element?.id ?? '-';
        temp['Name'] = fullName;
        temp['Days of delay'] = penalty_days ?? 0;
        temp['Aadhaar address'] = aadhaarAddress?.address ?? '-';
        temp['Phone number'] = phoneNumber;
        temp['Loan Status'] = loanStatus;
        if (type != 'nearest')
          temp['Similarity %'] = exactMatchUsersPercentage[userIdIndex];
        finalData.push(temp);
      } catch (error) {}
    }
    return finalData;
  }

  getCalenderDataForEMI(emiDate) {
    try {
      const calenderData: any = {};
      if (emiDate) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const date = new Date();
        date.setDate(emiDate);
        // EMI date falls this month
        if (date.getMonth() == currentMonth) {
          // Date is in past
          if (today.getDate() >= date.getDate()) {
            date.setMonth(date.getMonth() + 1);
          } else {
            const diffInDays = this.typeService.dateDifference(date, today);
            // EMI should start from minimum 13 days of gap from today
            if (diffInDays <= 12) {
              date.setMonth(date.getMonth() + 1);
            }
          }
        }
        calenderData.month = date.getMonth();
        calenderData.year = date.getFullYear();
      }
      return calenderData;
    } catch (error) {
      return {};
    }
  }

  async sendDisbursementLimitRaisedWhatsAppMsg() {
    try {
      const att = ['userId'];
      const masterInclude = {
        model: MasterEntity,
        attributes: ['loanId'],
        where: {
          'status.loan': 2,
        },
      };
      const options = {
        where: {
          [Op.and]: [
            { loanStatus: { [Op.ne]: 'Active' } },
            { userReasonDecline: 'Need more loan amount' },
          ],
        },
        group: ['userId'],
      };
      const users = await this.loanRepo.getTableWhereData(att, options);
      const userIdsArray = users.map((user) => user.userId);
      const dataAtt = ['id', 'fullName', 'phone', 'email', 'appType'];
      const userOptions = gIsPROD
        ? {
            where: { id: { [Op.in]: userIdsArray } },
            include: [masterInclude],
          }
        : {
            where: { id: { [Op.in]: userIdsArray } },
            include: [masterInclude],
            limit: 2,
          };
      const userDetails = await this.userRepo.getTableWhereDataWithCounts(
        dataAtt,
        userOptions,
      );
      await Promise.all(
        userDetails.rows.map(async (user) => {
          const whatsappOptions = {
            number: gIsPROD
              ? this.cryptService.decryptPhone(user?.phone)
              : UAT_PHONE_NUMBER[0],
            userId: user?.id,
            customerName: user?.fullName,
            title: 'disbursement limit upgraded',
            email: user?.email,
            amount: '1 Lakh',
            loanId: user?.masterData?.loanId,
            appType: user?.appType,
          };
          // await this.whatsAppService.sendWhatsAppMessage(whatsappOptions);
          this.whatsAppService.sendWhatsAppMessageMicroService(whatsappOptions);
        }),
      );
      return { numberOfUsers: userDetails.count };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // calculation of loan repayment for move user assign to collection
  async calcuLoanRepayment(loanId, needData = false) {
    const tranInclude = {
      model: TransactionEntity,
      attributes: [
        'id',
        'loanId',
        'emiId',
        'principalAmount',
        'interestAmount',
        'transactionId',
        'type',
        'status',
        'paidAmount',
      ],

      where: { status: kCompleted },
      required: false,
    };
    const options = {
      where: { loanId, payment_status: '0', payment_due_status: '1' },
      include: [tranInclude],
    };
    const emiList = await this.emiRepo.getTableWhereData(
      [
        'id',
        'principalCovered',
        'paid_principal',
        'totalPenalty',
        'interestCalculate',
        'pay_type',
      ],
      options,
    );

    if (emiList == k500Error) throw new Error();
    if (!emiList.length) return false;
    let totalPaidAmount = 0;
    let totalEmiAmount = 0;
    for (let i = 0; i < emiList.length; i++) {
      try {
        const ele = emiList[i];
        let transactionData = ele?.transactionData;
        transactionData = await this.filterTransActionData(transactionData);
        transactionData.forEach((el) => {
          totalPaidAmount +=
            (el?.principalAmount ?? 0) + (el?.interestAmount ?? 0);
        });
        totalEmiAmount +=
          (ele?.principalCovered ?? 0) + (ele?.interestCalculate ?? 0);
      } catch (error) {}
    }
    let paidPercantage = (totalPaidAmount / totalEmiAmount) * 100;
    if (needData) return { paidPercantage, totalPaidAmount, totalEmiAmount };
    //if principle and interest total remanining <5000 then case assing to collection
    let remAmount = this.typeService.manageAmount(
      totalEmiAmount - totalPaidAmount,
    );
    if (remAmount < BELOW_OUTSTANDING_AMOUNT) return true;
    else return false;
  }
  async filterTransActionData(transData) {
    try {
      const refundData = transData.find(
        (el) => el?.type == 'REFUND' && el?.status == 'COMPLETED',
      );
      if (refundData) {
        transData.sort((a, b) => b.id - a.id);
        let extraPayment;
        for (let index = 0; index < transData.length; index++) {
          try {
            const element = transData[index];
            if (
              element.emiId &&
              element.emiId == refundData.emiId &&
              Math.abs(element.paidAmount + refundData?.paidAmount) < 10 &&
              element.type !== 'REFUND' &&
              element.status == 'COMPLETED'
            ) {
              extraPayment = element;
              break;
            }
          } catch (error) {}
        }

        transData = transData.filter(
          (el) =>
            el?.type !== 'REFUND' &&
            extraPayment?.transactionId !== el?.transactionId,
        );
      }
      transData.sort((a, b) => a.id - b.id);
      return transData;
    } catch (error) {}
  }

  async updateActivityTime(adminId) {
    let adminData = await this.redisService.get('ADMIN_LIST');
    adminData = await JSON.parse(adminData);
    if (adminId in adminData) {
      adminData[adminId].lastActivityTime = new Date();
    }
    const result = await this.redisService.set(
      'ADMIN_LIST',
      JSON.stringify(adminData),
    );
    return result;
  }

  async adminAutoLogout() {
    try {
      let adminData = await this.redisService.get('ADMIN_LIST');
      adminData = await JSON.parse(adminData);
      const adminIds = [];
      for (const key in adminData) {
        if (adminData[key].isLogin == 1) {
          const timeDiff = await this.typeService.dateDifference(
            new Date(adminData[key].lastActivityTime),
            new Date(),
            'Minutes',
          );
          if (timeDiff >= LOGOUTTIME) {
            adminData[key].isLogin = 0;
            adminData[key].lastActivityTime = null;
            adminIds.push(key);
          }
        }
      }
      const update = {
        jwtDetails: null,
        isLogin: 0,
      };
      const admins = await this.adminRepo.updateRowData(update, adminIds);
      if (!admins || admins === k500Error) return kInternalError;
      const redisResult = await this.redisService.set(
        'ADMIN_LIST',
        JSON.stringify(adminData),
      );
      if (!redisResult) return kInternalError;
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Checks user's bankcode and ifsc code combination
  checkBankCode(bankCode, ifscDetails) {
    try {
      const targetBankCode = ifscDetails.BANKCODE ?? ifscDetails.bankCode;

      let receivedCode = '';
      switch (targetBankCode) {
        // AU small finance bank
        case 'AUBL':
          receivedCode = 'AU_SMALL_FINANCE_BANK';
          break;

        case 'FINF':
          receivedCode = 'AU_SMALL_FINANCE_BANK';
          break;

        // DBS bank
        case 'DBSS':
          receivedCode = 'DBS';
          break;

        // AXIS Bank
        case 'UTIB':
          receivedCode = 'AXIS';
          break;

        // Bank of baroda bank
        case 'BARB':
          receivedCode = 'BANK_OF_BARODA';
          break;

        // Canara bank
        case 'CNRB':
          receivedCode = 'CANARA';
          break;

        case 'CBIN':
          receivedCode = 'CENTRAL_BANK';
          break;

        // City union bank
        case 'CIUB':
          receivedCode = 'CITY_UNION';
          break;

        // Federal bank
        case 'FDRL':
          receivedCode = 'FEDERAL';
          break;

        // ICICI Bank
        case 'ICIC':
          receivedCode = 'ICICI';
          break;

        // Indian overseas bank
        case 'IOBA':
          receivedCode = 'INDIAN_OVERSEAS';
          break;

        // IndusInd Bank
        case 'INDB':
          receivedCode = 'INDUSIND';
          break;

        // IDBI Bank
        case 'IBKL':
          receivedCode = 'IDBI';
          break;

        // IDFC Bank
        case 'IDFB':
          receivedCode = 'IDFC';
          break;

        // HDFC Bank
        case 'HDFC':
          receivedCode = 'HDFC';
          break;

        // Punjab national bank
        case 'PUNB':
          receivedCode = 'PNB';
          break;

        // State bank of india
        case 'SBIN':
          receivedCode = 'SBI';
          break;

        // Union bank of india
        case 'UBIN':
          receivedCode = 'UNION_BANK';
          break;

        // YES Bank
        case 'YESB':
          receivedCode = 'YES';
          break;

        // KOTAK Bank
        case 'KKBK':
          receivedCode = 'KOTAK';
          break;

        // KARNATAKA Bank
        case 'KARB':
          receivedCode = 'KARNATAKA';
          break;

        // Bank of India
        case 'BKID':
          receivedCode = 'BOI';
          break;

        // Indian Bank
        case 'IDIB':
          receivedCode = 'INDIAN_BANK';
          break;

        // Karnataka Vikas Grameena Bank
        case 'KVGB':
          receivedCode = 'KARNATAKA_VG';
          break;

        // Andhra Pragathi Grameena Bank
        case 'APGB':
          receivedCode = 'ANDHRA_PG';
          break;

        // NSDL Payments Bank
        case 'NSPB':
          receivedCode = 'NSDL';
          break;

        // HSBC Bank
        case 'HSBC':
          receivedCode = 'HSBC';
          break;

        case 'SCBL':
          receivedCode = 'STANDARD_CHARTERED';
          break;

        default:
          break;
      }

      if (bankCode == null) return receivedCode;
      if (receivedCode != bankCode)
        return k422ErrorMessage(
          `Kindly provide valid ifsc code for ${bankCode}`,
        );
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getRiskCategoryByScoreData(reqData) {
    const masterData = reqData.masterData;
    const userAge = this.typeService.getAgeFromAadhar(reqData.aadhaarDOB);
    const salaryInfo = await this.getSalaryRange(
      masterData.otherInfo.salaryInfo,
    );
    const ageRange = await this.getAgeRange(userAge);
    let vehicleInfo = '';
    try {
      vehicleInfo = masterData?.otherInfo?.vehicleInfo?.join('-');
    } catch (error) {}
    const maritalStatus = masterData.otherInfo.maritalInfo;

    const liveStateInfo = reqData?.liveState
      ? await this.typeService.capitalizeFirstLetter(reqData.liveState)
      : 0;

    const aadhaarStateInfo = await this.typeService.capitalizeFirstLetter(
      reqData.aadhaarState,
    );
    const data = fs.readFileSync('scores.json', 'utf8');
    const scoreData = JSON.parse(data);
    const liveStateScore = scoreData.liveState[liveStateInfo] ?? 0;
    const aadhaarStateScore = scoreData.aadhaarState[aadhaarStateInfo] ?? 0;
    const similarStateScoreInfo =
      liveStateScore === aadhaarStateScore ? 'Yes' : 'No';
    const vehicleScore = scoreData.vehicleInfo[vehicleInfo] ?? 0;
    const employmentScore =
      scoreData.employmentInfo[masterData.otherInfo.employmentInfo] ?? 0;
    const educationScore =
      scoreData.educationInfo[masterData.otherInfo.educationInfo] ?? 0;
    const residentialScore =
      scoreData.residentialInfo[masterData.otherInfo.residentialInfo] ?? 0;
    const salaryScore = scoreData.salaryRange[salaryInfo] ?? 0;
    const ageScore =
      maritalStatus === 'Single'
        ? scoreData.singleAge[ageRange] ?? 0
        : scoreData.marriedAge[ageRange] ?? 0;
    const similarStateScore =
      scoreData.similarState[similarStateScoreInfo] ?? 0;

    const scorePoint =
      liveStateScore +
      aadhaarStateScore +
      vehicleScore +
      employmentScore +
      educationScore +
      residentialScore +
      salaryScore +
      ageScore +
      similarStateScore;

    await this.repoManager.updateRowData(
      registeredUsers,
      { categoryScore: scorePoint },
      reqData.userId,
    );

    return {};
  }

  private async getSalaryRange(salary) {
    const salaryRanges = {
      '<20k': [0, 20000],
      '20k-30k': [20000, 30001],
      '31k-40k': [30001, 40001],
      '41k-50k': [40001, 50001],
      '51k-60k': [50001, 60001],
      '61k-70k': [60001, 70001],
      '71k-80k': [70001, 80001],
      '81k-1L': [80001, 100001],
      '>1L': [100001, Infinity],
    };
    let salaryRange = '';
    for (const range in salaryRanges) {
      const [min, max] = salaryRanges[range];
      if (salary >= min && salary < max) {
        salaryRange = range;
      }
    }
    return salaryRange;
  }

  private async getAgeRange(userAge) {
    const ageRanges = {
      '21-25': [21, 26],
      '26-30': [26, 31],
      '31-35': [31, 36],
      '36-40': [36, 41],
      '>40': [41, Infinity],
    };
    let ageRange = '';
    for (const range in ageRanges) {
      const [min, max] = ageRanges[range];
      if (userAge >= min && userAge < max) {
        ageRange = range;
      }
    }
    return ageRange;
  }

  async getEmailTemplatePath(
    template,
    appType?: number,
    userId?: string,
    loanId?: number,
  ) {
    try {
      if (appType != null) {
        if (template.includes('##templateDesignNumber##')) {
          template = template.replace(/##templateDesignNumber##/g, appType);
        }
        return template;
      } else {
        let appType;
        if (templateDesign == '1') {
          if (loanId) {
            const loanAtr = ['appType'];
            const loanOptions = {
              where: {
                id: loanId,
              },
            };
            const loanData = await this.loanRepo.getRowWhereData(
              loanAtr,
              loanOptions,
            );
            if (loanData === k500Error) return kInternalError;
            appType = loanData?.appType;
          } else {
            const userAtr = ['appType'];
            const userOptions = {
              where: {
                id: userId,
              },
            };
            const userData = await this.userRepo.getRowWhereData(
              userAtr,
              userOptions,
            );
            if (userData === k500Error) return kInternalError;
            appType = userData?.appType;
          }
        }
        if (templateDesign == '0') appType = 0;
        if (template.includes('##appType##')) {
          template = template.replace(/##appType##/g, appType);
        }
        return template;
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Get UserId From Phone
  async funGetUserIdFromPhone(reqData) {
    try {
      const phone = reqData?.phone;
      const phonenumber = [];
      for (let i = 0; i < phone.length; i++) {
        try {
          const ele = phone[i].toString();
          const encPhone = this.cryptService.getMD5Hash(ele);
          phonenumber.push(encPhone);
        } catch (error) {}
      }
      const userOptions = { where: { hashPhone: phonenumber } };
      const userList = await this.userRepo.getTableWhereData(
        ['id'],
        userOptions,
      );
      if (userList == k500Error) return kInternalError;
      const userIds = [...new Set(userList.map((ele) => ele?.id))];
      return userIds;
    } catch (error) {}
  }

  async matchExactAadhaarAddress(userId) {
    const kycData = await this.KYCRepo.getRowWhereData(
      ['aadhaarLatLong', 'aadhaarAddress', 'maskedAadhaar'],
      {
        where: { userId },
      },
    );
    const aadhaarPoints = kycData?.aadhaarLatLong ?? '-';
    const aadhaarLocation = kycData?.aadhaarAddress ?? '-';
    if (
      !kycData ||
      kycData == k500Error ||
      aadhaarPoints == '-' ||
      aadhaarLocation == '-'
    )
      return { status: false, enum: 'AADHAR_LAT_LONG_NOT_FOUND' };
    const latLong = JSON.parse(aadhaarPoints);
    const address = JSON.parse(aadhaarLocation);
    const trimmedAddress = Object.values(address)
      .join(' ')
      .split(/[\s,-]+/g);
    const addressLength = trimmedAddress.length;
    const aadhaarAddress = trimmedAddress.join(' ');

    const options = {
      where: {
        [Op.and]: [
          Sequelize.literal(`ACOS(
            SIN(RADIANS(${latLong.lat})) * SIN(RADIANS("ActiveLoanAddressesEntity"."aadhaarLatLong"[0])) +
            COS(RADIANS(${latLong.lat})) * COS(RADIANS("ActiveLoanAddressesEntity"."aadhaarLatLong"[0])) *
            COS(RADIANS("ActiveLoanAddressesEntity"."aadhaarLatLong"[1]) - RADIANS(${latLong.lng}))
        ) * 3958.8 <=${AADHARE_LAT_LONG_RADIUS}`),
        ],
        isActive: true,
        userId: { [Op.ne]: userId },
      },
    };
    const attributes = ['userId', 'aadhaarAddress', 'aadhaarLatLong'];
    const data = await this.repoManager.getTableWhereData(
      ActiveLoanAddressesEntity,
      attributes,
      options,
    );
    if (!data || data == k500Error) throw new Error();

    let eachMatchPercentage = 0;
    const exactMatchUsers = [];
    for (let userData of data) {
      let percentage = 0;
      const userAddress = userData.aadhaarAddress;
      const addressArray = Object.values(userAddress)
        .join(' ')
        .split(/[\s,-]+/);
      const userAddressLength = addressArray.length;

      if (userAddressLength > addressLength) {
        eachMatchPercentage = +(100 / addressLength).toFixed(2);
        trimmedAddress.forEach((value) => {
          if (userAddress.includes(value)) percentage += eachMatchPercentage;
        });
      } else {
        eachMatchPercentage = +(100 / userAddressLength).toFixed(2);
        addressArray.forEach((value) => {
          if (aadhaarAddress.includes(value)) percentage += eachMatchPercentage;
        });
      }
      percentage = Math.round(percentage);
      if (percentage == 100) {
        exactMatchUsers.push({
          userId: userData.userId,
          matchedPercentage: percentage,
        });
      }
    }
    return {
      exactMatchUsers,
    };
  }
}
