import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/repositories/user.repository';
import { CryptService } from 'src/utils/crypt.service';
import {
  kInternalError,
  kNoDataFound,
  kParamMissing,
} from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import { KYCEntity } from 'src/entities/kyc.entity';
import { UserSelfieEntity } from 'src/entities/user.selfie.entity';
import { StateEligibilityRepository } from 'src/repositories/stateEligibility.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { TypeService } from 'src/utils/type.service';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import { BankingEntity } from 'src/entities/banking.entity';
import { PredictionEntity } from 'src/entities/prediction.entity';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { Op, Sequelize } from 'sequelize';
import { CrmRepository } from 'src/repositories/crm.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { MissMacthRepository } from 'src/repositories/missMatchName.repository';
import { GLOBAL_RANGES, valueInsurance } from 'src/constants/globals';
import { MasterEntity } from 'src/entities/master.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { salaryMissingDetails } from 'src/constants/strings';

@Injectable()
export class FinalVerificationService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly stateRepo: StateEligibilityRepository,
    private readonly locationRepo: LocationRepository,
    private readonly cryptService: CryptService,
    private readonly typeService: TypeService,
    private readonly empRepo: EmploymentRepository,
    private readonly loanRepo: LoanRepository,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly emiRepo: EMIRepository,
    private readonly referenceRepo: ReferenceRepository,
    private readonly crmRepo: CrmRepository,
    private readonly commonService: CommonSharedService,
    private readonly missMacthRepo: MissMacthRepository,
  ) {}

  //#region get base details
  async getBaseDetails(userId) {
    try {
      if (!userId) return kParamMissing();
      const userData = await this.getUserData(userId);
      if (userData?.message) return userData;
      const prepare: any = await this.prepareData(userData);
      const state = await this.getStateEligibility(userData);
      const lastAddress = await this.getLastLocation(userId);
      const kycAddre = this.typeService.getAadhaarAddress(userData?.kycData);
      const selfieData = this.getUserProfileData(userData);
      const lastCrm = await this.getLastCrm(userId, userData.lastCrm);

      /// prepare final data
      const finalData: any = {};
      finalData.name = userData?.fullName ?? '-';
      finalData.phone = this.cryptService.decryptPhone(userData?.phone);
      finalData.state = userData?.state ?? '-';
      finalData.stateEligibility = state;
      finalData.aadhaarAddress = kycAddre?.address;
      finalData.lastAddress = lastAddress;
      finalData.selfieData = selfieData;
      finalData.defaulterContactCount = userData?.defaulterContactCount ?? '-';
      finalData.lastCrm = lastCrm;
      finalData.nomineeDetail = prepare.nomineeInfo;
      finalData.otherDetails = prepare.getOtherInfo;
      finalData.cibilDetails = prepare.cibilDetails;
      finalData.predictionInfo = prepare.predictionInfo;

      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region Get User Data
  private async getUserData(id) {
    try {
      /// selfi
      const selfieInclude: any = { model: UserSelfieEntity };
      selfieInclude.attributes = ['image', 'response'];

      /// kyc inclued
      const attributes = ['aadhaarAddress', 'profileImage'];
      const kycInclude = { model: KYCEntity, attributes };

      // ML Prediction info
      const predictionInclude: any = { model: PredictionEntity };
      predictionInclude.attributes = ['id', 'automationDetails', 'reason'];

      /// loan inclued
      const loanAttr = ['nomineeDetail'];
      const loanInc: any = {
        model: loanTransaction,
        attributes: loanAttr,
      };
      loanInc.include = [predictionInclude];

      // Mother/Spouse info
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['otherInfo'];
      masterInclude.include = [loanInc];

      const include = [kycInclude, selfieInclude, masterInclude];
      const options = { include, where: { id }, order: [['id', 'DESC']] };
      const att = [
        'id',
        'fullName',
        'phone',
        'state',
        'defaulterContactCount',
        'lastCrm',
      ];
      const result = await this.userRepo.getRowWhereData(att, options);
      if (!result) return kNoDataFound;
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region prepare result's Data
  private async prepareData(data) {
    const nomineeInfo = {
      NomineeName: '-',
      NomineeContact: '-',
      Relation: '-',
    };
    const predictionInfo = {
      mlPrediction: '-',
      nearAAdhaarCount: '-',
      exactAadhaarCount: '-',
    };
    const getOtherInfo = {
      motherName: '-',
      spouseName: '-',
    };
    const cibilDetails = {
      crif: '-',
      cibilScore: '-',
      experianScore: '-',
      equifaxScore: '-',
    };
    try {
      // Nominee
      const nomineeData = data?.masterData?.loanData?.nomineeDetail;
      if (nomineeData) {
        const rCode = nomineeData.Nominee_Relationship_Code;
        await this.commonService.refreshInsuranceArray();
        const findCode = valueInsurance.relationshipCode.find(
          (f) => f.code === rCode,
        );
        (nomineeInfo.NomineeName =
          nomineeData?.Nominee_First_Name +
            ' ' +
            nomineeData?.Nominee_Last_Name ?? '-'),
          (nomineeInfo.NomineeContact =
            nomineeData?.Nominee_Contact_Number ?? '-'),
          (nomineeInfo.Relation = findCode?.name ?? '-');
      }
      // prediction
      const predictionData =
        data?.masterData?.loanData?.predictionData?.automationDetails;
      if (predictionData?.label) {
        predictionInfo.mlPrediction = predictionData?.label ?? '-';
      }

      // user Count which found under 5km aadhaar location
      const predictionReasonData = JSON.parse(
        data?.masterData?.loanData?.predictionData?.reason,
      );
      if (predictionReasonData?.matchLatLongCount) {
        predictionInfo.nearAAdhaarCount =
          predictionReasonData?.matchLatLongCount ?? '-';
      }
      if (
        predictionReasonData?.exactMatchAddressCount &&
        predictionReasonData.exactMatchAddressCount > 0
      ) {
        predictionInfo.exactAadhaarCount =
          predictionReasonData?.exactMatchAddressCount ?? 0 ?? '-';
      }

      // Mother/Spouse
      const masterData = data?.masterData?.otherInfo;
      if (masterData) {
        if (masterData?.motherName)
          getOtherInfo.motherName = masterData?.motherName ?? '-';
        if (masterData?.spouseName)
          getOtherInfo.spouseName = masterData?.spouseName ?? '-';
      }

      //CIBIL
      const cibilData = data?.pbData ?? 0;
      if (cibilData.length > 0) {
        cibilDetails.crif = cibilData[0].highmarkScore ?? '-';
        cibilDetails.cibilScore = cibilData[0].cibilScore ?? '-';
        cibilDetails.experianScore = cibilData[0].experianScore ?? '-';
        cibilDetails.equifaxScore = cibilData[0].equifaxScore ?? '-';
      }

      return { nomineeInfo, predictionInfo, getOtherInfo, cibilDetails };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get state eligibility amount
  private async getStateEligibility(userData: any) {
    const data = { newAmount: 0, repeatAmount: 0 };
    try {
      let state = userData?.state;
      try {
        if (!state) state = JSON.parse(userData?.kycData?.aadhaarAddress).state;
      } catch (error) {}
      state = state.toLowerCase();
      if (state) {
        const att = ['eligibility_new', 'eligibility_repeat'];
        const options = { where: { stateName: state } };
        const stateData = await this.stateRepo.getRowWhereData(att, options);
        if (stateData == k500Error) return data;
        data.newAmount = stateData.eligibility_new;
        data.repeatAmount = stateData.eligibility_repeat;
      }
      return data;
    } catch (error) {
      return data;
    }
  }
  //#endregion

  //#region get last location
  private async getLastLocation(userId) {
    let address = '-';
    try {
      const options = { where: { userId }, order: [['id', 'desc']] };
      const att = ['location'];
      const result = await this.locationRepo.getRowWhereData(att, options);
      if (result == k500Error) address = '-';
      else address = result?.location ?? '-';
    } catch (error) {}
    return address;
  }
  //#endregion

  //#region get user profile picture
  private getUserProfileData(userData) {
    const selfieData = userData?.selfieData;
    const kycData = userData?.kycData;
    const data = { image: '-', aadhaarImage: '-', matched: 0 };
    try {
      data.image = selfieData?.image ?? '-';
      if (selfieData?.response) {
        const response = JSON.parse(selfieData?.response);
        data.aadhaarImage = response?.imageB ?? '-';
        if (response.SourceImageFace) {
          const simlarity = Math.round(
            response?.FaceMatches[0]?.Similarity ?? 0,
          );
          const facaMatch = response?.FaceMatches?.length > 0;
          if (facaMatch || simlarity) data.matched = simlarity;
        }
      }
      if (data.aadhaarImage == '-')
        data.aadhaarImage = kycData?.profileImage ?? '-';
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get last crm data
  private async getLastCrm(userId, lastCrm) {
    const data = {
      date: '-',
      subTitle: '-',
      title: '-',
      remark: '-',
      admin: '-',
      department: '-',
    };
    try {
      if (lastCrm) {
        data.date = lastCrm?.createdAt ?? '-';
        data.subTitle = lastCrm?.titleName ?? '-';
        data.title = lastCrm?.statusName ?? '-';
        data.remark = lastCrm?.remark ?? '-';
        data.department = lastCrm?.adminDepartment ?? '-';
        data.admin = lastCrm?.adminName ?? '-';
      } else {
        const options = { where: { userId }, order: [['id', 'desc']] };
        const att = ['id', 'relationData', 'adminId', 'createdAt', 'remark'];
        const result: any = await this.crmRepo.getRowWhereData(att, options);
        if (!result || result == k500Error) return data;
        data.date = new Date(result.createdAt).toJSON();
        data.remark = result?.remark ?? '-';
        data.title = result?.relationData?.statusName ?? '-';
        data.subTitle = result?.relationData?.dispositionName ?? '-';
        const adminData = await this.commonService.getAdminData(result.adminId);
        if (adminData?.fullName) data.admin = adminData?.fullName;
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get loan details by userId
  async getLoanDetails(loanId) {
    // Params validation
    if (!loanId) return kParamMissing('loanId');

    // Get target loan data
    const loanData = await this.getLoanData(loanId);
    if (loanData?.message) return loanData;

    // Get employment data
    const empData: any = await this.getEmpDetails(loanData?.userId);
    if (empData?.message) return empData;

    const date = await this.getSalaryDate(loanData);
    const emiData = await this.getLoanOnTimeorDelay(loanData?.userId);
    const reference: any = await this.getReference(loanData?.userId);
    const finalData: any = { ...empData, ...emiData, ecsBounce: '-' };
    let categoryTag = loanData?.categoryTag;
    if (categoryTag == 0) categoryTag = 'Low risk';
    else if (categoryTag == 1) categoryTag = 'Moderate risk';
    else if (categoryTag == 2) categoryTag = 'High risk';
    else if (categoryTag == 3) categoryTag = 'Premium';

    finalData.categoryTag = categoryTag ?? '-';

    // ML Prediction details
    const automationDetails = loanData.predictionData?.automationDetails ?? {};
    // Model 1 -> Repayment prediction
    if (automationDetails?.model_version) {
      delete automationDetails.feedData;
      finalData.predictionDetails = automationDetails;
    }
    // Model 2 -> Final approval prediction
    const ml_approval = loanData.predictionData?.ml_approval ?? {};
    if (ml_approval?.model_version) {
      delete ml_approval.feedData;
      finalData.ml_approval = ml_approval;
    }

    try {
      const bank = loanData?.bankingData ?? {};

      // User have selected emi date or not
      const emiSelection = loanData.emiSelection ?? {};
      if (emiSelection.selectedEmiDate) {
        finalData.selectedEmiDate = emiSelection.selectedEmiDate;
      }

      finalData.approveSalary = bank?.adminSalary ?? bank?.salary ?? '0';
      finalData.netApprovedAmount = loanData?.netApprovedAmount ?? '0';
      if (loanData?.approvedLoanAmount)
        finalData.adminApprovedAmount = loanData?.approvedLoanAmount;
      finalData.loanAmount = loanData?.loanAmount ?? '0';
      finalData.approveDate = date;
      finalData.averageSalary = bank?.otherDetails?.salary?.average ?? '-';
      finalData.salaryList = bank?.otherDetails?.salary?.monthlyDetails ?? [];
      if (bank?.netBankingScore)
        finalData.ecsBounce = JSON.parse(bank?.netBankingScore)?.bounceCount;
      if (bank?.tagSalaryData) finalData.tagSalaryData = bank.tagSalaryData;
    } catch (error) {}

    finalData.suspicious = reference?.suspicious ?? false;
    finalData.suspiciousCount = reference?.suspiciousCount;
    finalData.reference = reference?.contacts ?? [];
    return finalData;
  }
  //#endregion

  //#region get emp details
  private async getEmpDetails(userId) {
    try {
      /// salary inclued
      const salaryInclude = {
        model: SalarySlipEntity,
        attributes: ['id', 'url', 'netPayAmount', 'response', 'approveById'],
      };
      const options = { where: { userId }, include: [salaryInclude] };
      const att = ['companyName', 'companyUrl', 'salary'];
      const result = await this.empRepo.getRowWhereData(att, options);
      let missingDetails = '';
      if (result?.salarySlip) {
        let response = result?.salarySlip?.response
          ? JSON.parse(result?.salarySlip?.response)
          : {};
        let salaryDate;
        const currentDate = this.typeService.getGlobalDate(new Date());
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(
          currentDate.getDate() -
            GLOBAL_RANGES.MAX_ELIGIBLE_SALARY_DATE_IN_DAYS,
        );
        salaryDate = this.typeService.getGlobalDate(response?.SalaryPeriod);
        if (response?.document_type) {
          missingDetails += response?.document_type + '/ ';
        }
        if (!response?.name || response?.name === null) {
          missingDetails += salaryMissingDetails.USER_NAME_MISMATCH + '/ ';
        }
        if (!response?.companyName || response?.companyName === null) {
          missingDetails += salaryMissingDetails.COMPANY_NAME_MISMATCH + '/ ';
        }
        if (!response?.netPayAmount || response?.netPayAmount === null) {
          missingDetails += salaryMissingDetails.PAY_AMOUNT_NOT_FOUND + '/ ';
        }
        if (!response?.SalaryPeriod || response?.SalaryPeriod === null) {
          missingDetails += salaryMissingDetails.SALARY_PERIOD_NOT_FOUND;
        } else if (response?.SalaryPeriod && currentDate >= salaryDate) {
          missingDetails += salaryMissingDetails.SALARY_PERIOD_NOT_VALID;
        }
      }
      if (missingDetails.endsWith('/ '))
        missingDetails = missingDetails.slice(0, -2);
      const adminData = await this.commonService.getAdminData(
        result?.salarySlip?.approveById,
      );
      if (!result || result === k500Error) return kInternalError;
      return {
        companyName: result?.companyName ?? '-',
        companyUrl: result?.companyUrl ?? '-',
        enteredSalary: result?.salary ?? '0',
        salarySlip: result?.salarySlip?.url ?? '-',
        netPayAmount: result?.salarySlip?.netPayAmount ?? '0',
        missingDetails: missingDetails,
        approvedBy: adminData?.fullName,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get current accepted loan
  private async getLoanData(id) {
    try {
      /// Prediction
      const predictionInc = {
        model: PredictionEntity,
        attributes: ['categorizationTag', 'automationDetails', 'ml_approval'],
      };
      /// banking inclued
      const attr = [
        'salary',
        'salaryDate',
        'adminSalary',
        'otherDetails',
        'netBankingScore',
        'tagSalaryData',
      ];
      const bankInc = { model: BankingEntity, attributes: attr };
      const options = { where: { id }, include: [bankInc, predictionInc] };
      const att = [
        'emiSelection',
        'id',
        'userId',
        'netApprovedAmount',
        'approvedLoanAmount',
        'loanAmount',
        'categoryTag',
      ];
      const result = await this.loanRepo.getRowWhereData(att, options);
      if (!result || result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get salary date
  private async getSalaryDate(loanData) {
    let date = '-';
    try {
      date = loanData?.bankingData?.salaryDate ?? '-';
      const options = {
        where: {
          loanId: loanData?.id,
          type: 'Verification',
          subType: 'Salary Date',
        },
        order: [['id', 'desc']],
      };
      const att = ['newData'];
      const result = await this.changeLogsRepo.getRowWhereData(att, options);
      if (result?.newData) {
        if (result?.newData != '-') date = result?.newData ?? '-';
        if (date == '-') date = loanData?.bankingData?.salaryDate ?? '-';
      }
    } catch (error) {}
    return date;
  }
  //#endregion

  //#region get loan count by userId with ontime or delay
  private async getLoanOnTimeorDelay(userId) {
    const data = { total: 0, ontime: 0, delay: 0, lastDelay: 0 };
    try {
      if (!userId) return data;
      const options = { where: { userId } };
      const att = ['id', 'loanId', 'payment_due_status', 'penalty_days'];
      const result = await this.emiRepo.getTableWhereData(att, options);
      if (result && result != k500Error && result.length > 0) {
        result.sort((b, a) => a.loanId - b.loanId);
        const loanIDList = [];
        for (let index = 0; index < result.length; index++) {
          const emi = result[index];
          const loanId = emi.loanId;
          const find = loanIDList.find((f) => f === loanId);
          if (!find) {
            loanIDList.push(loanId);
            data.total += 1;
            const filter = result.filter(
              (f) => f.loanId == loanId && f.payment_due_status == '1',
            );
            if (filter.length > 0) {
              data.delay += 1;
              if (index === 0)
                filter.forEach((ele) => {
                  data.lastDelay += +ele.penalty_days;
                });
            } else data.ontime += 1;
          }
        }
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get reference
  private async getReference(userId) {
    try {
      const options = { where: { userId }, order: [['id', 'desc']] };
      const att = ['contacts'];
      const result = await this.referenceRepo.findOne(att, options);
      if (!result || result === k500Error) return [];
      const reference: any = await this.getSuspiciousUserReference(
        result?.contacts,
        userId,
      );
      if (!reference || reference?.message) return {};
      return reference;
    } catch (error) {}
    return [];
  }
  //#endregion

  // get suspicious user's references
  private async getSuspiciousUserReference(contacts, user) {
    try {
      let suspicious = false;
      let contactQuery = '';
      contacts.forEach((con, ind) => {
        try {
          contactQuery += `"ReferencesEntity"."contacts" @> '[{"number":"${con.number}"}]'`;
          if (contacts.length - 1 != ind) contactQuery += ' OR ';
        } catch (error) {}
      });
      const options = {
        where: {
          [Op.and]: [
            Sequelize.literal(
              `id in (SELECT MAX("id") FROM "ReferencesEntities" AS "ReferencesEntity" WHERE (${contactQuery}) GROUP BY "userId")`,
            ),
          ],
        },
      };
      const att = ['id', 'userId', 'contacts'];
      const result = await this.referenceRepo.getTableWhereData(att, options);
      if (!result || result == k500Error) return kInternalError;
      const userList = [];
      result.forEach((e) => {
        if (user != e.userId) userList.push(e.userId);
      });
      const loanData = await this.loanRepo.getTableWhereData(['userId'], {
        where: { loanStatus: 'Active', userId: userList },
      });
      if (!loanData || loanData === k500Error) return kInternalError;
      const loan = loanData.map((l) => l.userId);
      result.forEach((ele) => {
        try {
          const userId = ele.userId;
          const contact = ele?.contacts ?? [];
          const active = loan.includes(userId);
          if (active) {
            const match = contacts.find((o1) => {
              return contact.some((o2) => {
                return o1.number == o2.number;
              });
            });
            if (match) {
              suspicious = true;
              match.suspiciousUser = userId;
            }
          }
        } catch (error) {}
      });
      const suspiciousCount = contacts.filter((f) => f?.suspiciousUser).length;
      return { suspicious, suspiciousCount, contacts };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region get Company details count
  async getCompanyDetails(companyName) {
    try {
      /// get same company user list
      companyName = (companyName ?? '').trim();
      if (!companyName) return kParamMissing();
      const options = { where: { companyName: { [Op.iRegexp]: companyName } } };
      const att = ['userId'];
      const empData = await this.empRepo.getTableWhereData(att, options);
      if (!empData || empData == k500Error) return kInternalError;
      const userIdList = [...new Set(empData.map((item) => item.userId))];
      //// get last loanId to user
      const lastLoan = await this.getlastLoanIdsToUserId(userIdList);
      if (lastLoan?.message) return lastLoan;
      /// get Ontime delay defaulter count
      return await this.getUniqueCount(lastLoan);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion get Company details count

  //#region get last loanId to userId
  private async getlastLoanIdsToUserId(userIds): Promise<any> {
    try {
      const options = { where: { userId: userIds }, group: ['userId'] };
      const att: any = [
        [Sequelize.fn('max', Sequelize.col('loanId')), 'loanId'],
      ];
      const result = await this.emiRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      const loanIdS: any[] = [...new Set(result.map((item) => item.loanId))];
      return loanIdS;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get Ontime delay defaulter
  private async getUniqueCount(loanId) {
    const data = { total: 0, ontime: 0, delay: 0, defaulter: 0 };
    try {
      const options = { where: { loanId } };
      const att = ['id', 'loanId', 'payment_due_status', 'payment_status'];
      const result = await this.emiRepo.getTableWhereData(att, options);
      if (result && result != k500Error && result.length > 0) {
        for (let index = 0; index < loanId.length; index++) {
          try {
            const id = loanId[index];
            const defaulter = result.find(
              (f) =>
                f.loanId == id &&
                f.payment_due_status == '1' &&
                f.payment_status == '0',
            );
            const delay = result.find(
              (f) =>
                f.loanId == id &&
                f.payment_due_status == '1' &&
                f.payment_status == '1',
            );
            if (defaulter) data.defaulter += 1;
            else if (delay) data.delay += 1;
            else data.ontime += 1;
            data.total += 1;
          } catch (error) {}
        }
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get crm count
  async getCrmCount(loanId) {
    try {
      if (!loanId) return kParamMissing();
      /// find loan Data
      const options = { where: { id: loanId } };
      const att = ['id', 'createdAt', 'userId'];
      const data = await this.loanRepo.getRowWhereData(att, options);
      if (!data || data == k500Error) return kInternalError;
      /// find crm data
      return await this.getCRMDataCount(data.userId, data.createdAt);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  //#region get crm data count of phone email and whatsapp
  private async getCRMDataCount(userId, date) {
    const data = { phone: 0, email: 0, whatsapp: 0 };
    try {
      const options = {
        where: {
          userId,
          createdAt: { [Op.gte]: date },
          relationData: { statusId: { [Op.or]: [1, 3, 4] } },
        },
      };
      const att = ['id', 'relationData'];
      const result: any = await this.crmRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return data;
      for (let index = 0; index < result.length; index++) {
        try {
          const ele = result[index];
          if (ele?.relationData?.statusId == 1) data.phone += 1;
          if (ele?.relationData?.statusId == 3) data.email += 1;
          if (ele?.relationData?.statusId == 4) data.whatsapp += 1;
        } catch (error) {}
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get name mismacth
  async getNameMissmatch(loanId) {
    try {
      if (!loanId) return kParamMissing();
      /// find data in loan
      const option = { where: { id: loanId } };
      const att = ['id', 'userId', 'createdAt', 'updatedAt'];
      const loan = await this.loanRepo.getRowWhereData(att, option);
      if (!loan || loan === k500Error) return '-';
      /// find data of name mismatch
      const options = {
        where: {
          status: '1',
          userId: loan.userId,
          updatedAt: {
            [Op.gte]: loan.createdAt,
            [Op.lte]: loan.updatedAt,
          },
        },
      };
      const attr = ['id', 'type', 'adminId'];
      const missData = await this.missMacthRepo.getRowWhereData(attr, options);
      if (!missData || missData == k500Error) return '-';
      const adminData = await this.commonService.getAdminData(
        missData?.adminId,
      );
      return adminData?.fullName ?? '-';
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion
  async getNearestAadhaarLocationUsers(query) {
    const userId = query.userId;
    if (!userId) return kParamMissing('userId');
    return await this.commonService.findAadhaarLocationUsers(userId, 'nearest');
  }

  async getExactAadhaarLocationUsers(query) {
    const userId = query.userId;
    if (!userId) return kParamMissing('userId');
    return await this.commonService.findAadhaarLocationUsers(userId, 'exact');
  }
}
