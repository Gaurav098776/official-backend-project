import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { kCibilScore } from 'src/constants/directories';
import {
  crifMemberID,
  crifMemberName,
  PAGE_LIMIT,
  equifaxMemberID,
  equifaxMemberName,
  kCrifName,
  tudfMemberID,
  tudfMemberName,
} from 'src/constants/globals';
import { k302Error, k500Error, k999Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import { BankingEntity } from 'src/entities/banking.entity';
import { EmiEntity } from 'src/entities/emi.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { ChangeLogsRepository } from 'src/repositories/changeLogs.repository';
import { CIBILRepository } from 'src/repositories/cibil.repository';
import { EMIRepository } from 'src/repositories/emi.repository';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { CryptService } from 'src/utils/crypt.service';
import { FileService } from 'src/utils/file.service';
import { convertDateInDDMMYYYY, TypeService } from 'src/utils/type.service';
import { ASModel } from './model/as.tudf.model';
import { NSModel, pcodeList } from './model/ns.tudf.model';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { CIBILTriggerRepository } from 'src/repositories/cibilTrigger.repository';
import { CIBILExcelTriggerColumns } from 'src/constants/objects';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { EnvConfig } from 'src/configs/env.config';
const fs = require('fs');
@Injectable()
export class CIBILScoreService {
  constructor(
    private readonly typeService: TypeService,
    private readonly emiRepo: EMIRepository,
    private readonly loanRepo: LoanRepository,
    private readonly tranRepo: TransactionRepository,
    private readonly cryptService: CryptService,
    private readonly kycRepo: KYCRepository,
    private readonly cibilRepo: CIBILRepository,
    private readonly fileService: FileService,
    private readonly changeLogsRepo: ChangeLogsRepository,
    private readonly userRepo: UserRepository,
    private readonly triggerRepo: CIBILTriggerRepository,
    private readonly legalRepo: LegalCollectionRepository,
    private readonly nsModel: NSModel,
  ) {}

  //#region find cibil row Data
  async getCIBILScore(body) {
    try {
      const type = body?.type;

      if (!body.startDate || !body.endDate || !type) return kParamsMissing;
      let fromDate = this.typeService.getGlobalDate(body.startDate).toJSON();
      let toDate = this.typeService.getGlobalDate(body.endDate).toJSON();
      fromDate = fromDate.substring(0, 10) + 'T00:00:00.000Z';
      toDate = toDate.substring(0, 10) + 'T23:59:59.000Z';
      if (!fromDate || !toDate) return kParamsMissing;
      return await this.findCibilRowData(fromDate, toDate, type, body);
    } catch (error) {}
  }
  //#endregion

  //#region find cibil data
  private async findCibilRowData(fromDate, toDate, type, body) {
    try {
      /// find loanIDs base on EMI Date and EMI Done Date
      // const loanIdList: any = [3531];
      // const loanIdList: any = await this.getEMIDataForCibil(fromDate, toDate);
      // find loan entity and  trantcation  for cibil
      const loanIdList: any = await this.getLoanData(fromDate, toDate, body);
      if (loanIdList?.message) return loanIdList;
      /// find Cibil data
      const cibilData = await this.findCibilDataFromLoanId(loanIdList);
      if (cibilData?.message) return cibilData;
      /// find settledData
      const settledData = await this.findSettledData(loanIdList);
      /// find user details
      const userData = await this.findUserDataFromLoanId(loanIdList);
      if (userData?.message) return userData;
      /// find legal data
      const legalData = await this.getLegalData(userData);
      if (legalData?.message) return legalData;

      /// find kyc Data
      const kycData = await this.findKYCData(userData, cibilData);
      if (kycData?.message) return kycData;
      /// get pin code data from local
      await this.getPinCodeData();
      const result = await this.prePareTubeData(
        userData,
        cibilData,
        toDate,
        type,
        settledData,
      );
      if (!result || result === k500Error) return kInternalError;
      else if (result === k302Error || result === k999Error) return kBadRequest;
      return await this.uploadInCloud(fromDate, toDate, result);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find emi data to loanID  for cibil
  private async getEMIDataForCibil(fromDate, toDate) {
    try {
      const date = { [Op.gte]: fromDate, [Op.lte]: toDate };
      const options = {
        where: {
          [Op.or]: [
            { emi_date: date },
            { payment_done_date: date },
            {
              emi_date: { [Op.lte]: toDate },
              payment_status: '0',
              payment_due_status: '1',
            },
          ],
          userId: { [Op.ne]: 'a1fd2860-252c-435d-bc95-1ed3f65ef6e2' },
        },
        group: ['loanId'],
      };
      const att = ['loanId'];
      const result = await this.emiRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      const loanList: any[] = [...new Set(result.map((item) => item.loanId))];
      return loanList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find loan entity and  trantcation  for cibil
  private async getLoanData(fromDate, toDate, body) {
    try {
      const options: any = {
        where: {
          // LoanIds in Exceptions for reporting
          id: { [Op.notIn]: [787829, 792993] },
          loanStatus: 'Active',
          loan_disbursement_date: { [Op.lte]: toDate },
          userId: {
            [Op.notIn]: [
              'a1fd2860-252c-435d-bc95-1ed3f65ef6e2',
              'd1c4bbad-34bf-4dfa-950f-be833a1f4ad3',
            ],
          },
        },
        group: ['id'],
      };
      const att = ['id'];
      if (body?.download === 'false' || body?.download === undefined) {
        options.offset = (+body?.page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      let loanList = [...new Set(result.map((item) => item.id))];
      const date = { [Op.gte]: fromDate, [Op.lte]: toDate };
      delete options.where.loanStatus;
      delete options.where.loan_disbursement_date;
      options.where = {
        ...options.where,
        status: 'COMPLETED',
        completionDate: date,
        loanId: { [Op.notIn]: loanList },
      };
      options.group = ['loanId'];
      const att1 = ['loanId'];
      const tranData = await this.tranRepo.getTableWhereData(att1, options);
      if (!tranData || tranData === k500Error) return kInternalError;
      loanList = [...loanList, ...new Set(tranData.map((item) => item.loanId))];
      return loanList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find user Data from loanID
  private async findUserDataFromLoanId(loanIdList) {
    try {
      const userModel = {
        model: registeredUsers,
        attributes: ['fullName', 'gender', 'phone', 'email'],
        include: [{ model: MasterEntity, attributes: ['otherInfo'] }],
      };
      const bankAtt = ['disbursementAccount', 'salary', 'adminSalary'];
      const bankModel = { model: BankingEntity, attributes: bankAtt };
      const emiModel = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_date',
          'emi_amount',
          'payment_done_date',
          'payment_status',
          'payment_due_status',
          'penalty',
          'penalty_days',
          'partPaymentPenaltyAmount',
          'waiver',
          'principalCovered',
          'payment_done_date',
          'paid_waiver',
          'unpaid_waiver',
          'interestCalculate',
          'fullPayPrincipal',
          'paid_principal',
          'paid_interest',
          'regInterestAmount',
          'paidRegInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'paidBounceCharge',
          'totalPenalty',
          'dpdAmount',
          'penaltyChargesGST',
          'paidPenalCharge',
          'legalCharge',
          'legalChargeGST',
          'paidLegalCharge',
        ],
      };
      const tranModel = {
        model: TransactionEntity,
        attributes: [
          'paidAmount',
          'status',
          'completionDate',
          'emiId',
          'principalAmount',
        ],
        required: false,
        where: { status: 'COMPLETED', type: { [Op.ne]: 'REFUND' } },
      };
      const options = {
        where: {
          loanStatus: { [Op.or]: ['Complete', 'Active'] },
          id: loanIdList,
        },
        include: [userModel, bankModel, emiModel, tranModel],
      };
      const att = [
        'id',
        'loan_disbursement_date',
        'netApprovedAmount',
        'loanStatus',
        'userId',
        'approvedDuration',
        'legalType',
        'legalId',
      ];
      const result = await this.loanRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      for (let index = 0; index < result.length; index++) {
        const item = result[index];
        if (item.registeredUsers && item.registeredUsers.phone) {
          item.registeredUsers.phone = await this.cryptService.decryptPhone(
            item.registeredUsers.phone,
          );
        }
      }
      const filterData = result.filter(
        (el) =>
          !(
            el.registeredUsers.email.includes(
              EnvConfig.emailDomain.companyEmailDomain1,
            ) ||
            el.registeredUsers.email.includes(
              EnvConfig.emailDomain.companyEmailDomain2,
            )
          ),
      );
      return filterData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find cibil Data from loanId
  private async findCibilDataFromLoanId(loanIdList) {
    try {
      const options = { where: { [Op.or]: [{ loanId: loanIdList }] } };
      const att = ['id', 'loanId', 'nSegment', 'aSegment'];
      const result = await this.cibilRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      result.forEach((ele) => {
        try {
          const find = loanIdList.find((id) => id === ele.loanId);
          if (!find) loanIdList.push(ele.loanId);
        } catch (error) {}
      });
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find kyc Data because rekyc flow
  private async findKYCData(userData, cibilData) {
    try {
      const userIDList = [];
      userData.forEach((ele) => {
        try {
          const loanId = ele.id;
          const userId = ele.userId;
          const findUser = userIDList.find((f) => f === userId);
          if (!findUser) {
            const findLoan = cibilData.find((f) => f.loanId === loanId);
            if (!findLoan) userIDList.push(userId);
          }
        } catch (error) {}
      });
      if (userData.length > 0) {
        const kycAtt = [
          'userId',
          'aadhaarDOB',
          'aadhaarAddress',
          'panCardNumber',
          'aadhaarResponse',
        ];
        const option = {
          where: {
            aadhaarDOB: { [Op.ne]: null },
            aadhaarStatus: '1',
            userId: userIDList,
          },
          order: [['id', 'desc']],
        };
        const result = await this.kycRepo.getTableWhereData(kycAtt, option);
        if (!result || result === k500Error) return kInternalError;
        userData.forEach((ele) => {
          const find = result.find((f) => f.userId === ele.userId);
          if (find) ele.registeredUsers.kycData = find;
        });
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get pin code Data from json file
  private async getPinCodeData() {
    try {
      const fileUrl = './upload/pincode.json';
      try {
        fs.readFile(fileUrl, 'utf8', (err, data) => {
          try {
            const list = JSON.parse(data);
            if (pcodeList.length != list.length)
              list.forEach((element) => {
                pcodeList.push(element);
              });
          } catch (error) {}
        });
      } catch (error) {}
      await this.typeService.delay(500);
    } catch (error) {}
  }
  //#endregion

  //#region pre pare cibil data
  private async prePareTubeData(
    userData,
    cibilData,
    toDate,
    type,
    settledData,
  ) {
    try {
      const member = this.getMemberData(type);
      if (!member?.memberId) return k500Error;
      let finalText = '';
      const hs = this.getTUDFHeaderSegment(
        toDate,
        member.memberId,
        member.memberName,
      );
      if (hs == k999Error) return k999Error;
      finalText += hs;
      for (let index = 0; index < userData.length; index++) {
        try {
          if (index % 100 === 0)
            console.log(index, `Total -> ${userData.length}`);

          const ele = userData[index];
          const findData = cibilData.find((f) => f.loanId === ele.id);

          const pn = findData?.id
            ? this.nsModel
            : await this.nsModel.fillData(ele.registeredUsers);
          if (!pn) return k500Error;
          const asModel = new ASModel();
          const accountS = asModel.fillData(
            ele,
            toDate,
            member.memberCode,
            member.memberName,
            settledData,
          );
          if (!accountS || accountS === k500Error) return k500Error;
          const as = accountS.convertInFormat();
          const baseDetails = findData?.id
            ? findData?.nSegment
            : pn.convertInFormat();
          if (baseDetails === k500Error || as === k500Error) return k500Error;
          finalText += baseDetails + as + 'ES02**';
          if (finalText.includes(k999Error)) return k999Error;
          const createData = await this.addDataInCIBIL(
            ele,
            pn,
            accountS,
            findData,
          );
          if (createData.message) return createData;
        } catch (error) {}
      }
      finalText += 'TRLR';
      return finalText;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get member data
  private getMemberData(type) {
    let memberId;
    let memberName;
    let memberCode;
    try {
      const creds = EnvConfig.bureauReportCreds;
      if (type === 'CIBIL') {
        memberId = creds?.cibilTudfMemberID;
        memberName = creds?.cibilTudfMemberName;
        memberCode = creds?.cibilTudfMemberID;
      } else if (type === 'EQUIFAX') {
        memberId = creds?.equifaxMemberID;
        memberName = creds?.equifaxMemberName;
        memberCode = creds?.equifaxMemberID;
      } else if (type === kCrifName) {
        memberId = creds?.crifMemberID;
        memberName = creds?.crifMemberName;
        memberCode = creds?.crifMemberID;
      }
    } catch (error) {}
    return { memberId, memberName, memberCode };
  }
  //#endregion

  //#region Header segment of TUDF
  getTUDFHeaderSegment(toDate, memberID, memberName) {
    let hs = '';
    hs = this.typeService.setValue(hs, 'TUDF12', 1, 6); // Segment Tag and Version
    hs = this.typeService.setValue(hs, memberID, 7, 30); // Member ID
    hs = this.typeService.setValue(hs, memberName, 37, 16); // Member Short Name
    hs = this.typeService.setValue(hs, '', 53, 2); //  Cycle Identification
    const reportedDate = convertDateInDDMMYYYY(toDate); //  Date Reported and Certified
    hs = this.typeService.setValue(hs, reportedDate, 55, 8);
    hs = this.typeService.setValue(hs, '', 63, 30); // Reporting Password
    hs = this.typeService.setValue(hs, 'L', 93, 1); //  Authentication Method
    hs = this.typeService.setValue(hs, '00000', 94, 5); //  Future Use
    hs = this.typeService.setValue(hs, '', 99, 48); //  Member Data
    if (hs.includes(k999Error) || hs.length != 146) return k999Error;
    return hs;
  }
  //#endregion

  //#region add data in cibil table
  private async addDataInCIBIL(
    ele,
    nsModel: NSModel,
    asModel: ASModel,
    cibilData,
  ) {
    try {
      const nSegment = cibilData?.nSegment ?? nsModel.convertInFormat();
      const aSegment = asModel.convertInFormat();
      const loanId = ele.id;
      const userId = ele.userId;
      const data: any = { loanId, userId, nSegment, aSegment };
      const date = this.typeService.getGlobalDate(new Date());
      date.setDate(10);
      if (asModel.dueDay != '15010') date.setMonth(date.getMonth() + 1);
      data.nextDate = date.toJSON();
      if (cibilData?.id) {
        const update = await this.cibilRepo.updateRowData(data, cibilData?.id);
        if (!update || update === k500Error) return kInternalError;
      } else {
        const create = await this.cibilRepo.createRowData(data);
        if (!create || create === k500Error) return kInternalError;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region upload in cloud
  private async uploadInCloud(fromDate, toDate, finalText) {
    try {
      if (pcodeList.length > 0) {
        try {
          const fileUrl = './upload/pincode.json';
          fs.writeFileSync(fileUrl, JSON.stringify(pcodeList));
        } catch (error) {}
      }

      try {
        let fileName =
          convertDateInDDMMYYYY(fromDate) +
          '_' +
          convertDateInDDMMYYYY(toDate) +
          '_' +
          new Date().getTime() +
          '.txt';
        fs.writeFileSync('./upload/' + fileName, finalText);
        await this.typeService.delay(500);
        const url = await this.fileService.uploadFile(
          './upload/' + fileName,
          kCibilScore,
          'txt',
          fileName,
        );
        if (url === k500Error) return kInternalError;
        return url;
      } catch (error) {}
    } catch (error) {}
    return kInternalError;
  }

  //#endregion

  //#region  find settled Data
  private async findSettledData(loanIdList: any) {
    try {
      const options = {
        where: { loanId: loanIdList, type: 'CIBIL_SETTLED_AMOUNT' },
      };
      const att = ['loanId'];
      const result = await this.changeLogsRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return [];
      return result;
    } catch (error) {}
    return [];
  }
  //#endregion

  // Add CIBIL Trigger Data from Excel
  async addCIBILTriggerData(body) {
    try {
      const file = body.file;
      if (!file) return kParamMissing('file');
      const adminId = body.adminId;
      if (!adminId) return kParamMissing('adminId');
      const orgName = file?.originalname;
      if (!orgName.endsWith('xlsx'))
        return k422ErrorMessage('Upload valid excel file!');
      const fileName = file?.filename;
      const data: any = await this.fileService.excelToArray(
        fileName,
        CIBILExcelTriggerColumns,
      );
      if (data?.message) return data;
      await this.fileService.removeFile(fileName);
      const loanIdList = [...new Set(data.map((l) => l['Loan ID']))];
      const userInc = {
        model: registeredUsers,
        attributes: [
          'id',
          'otherPhone',
          'otherEmail',
          'allPhone',
          'allEmail',
          'addedBy',
        ],
      };
      const loanData = await this.loanRepo.getTableWhereData(['id', 'userId'], {
        where: { id: loanIdList },
        include: [userInc],
      });
      if (loanData === k500Error) return kInternalError;
      return await this.bulkCreateTriggerData(data, loanData, adminId);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // Bulk Create CIBIL Trigger Data
  async bulkCreateTriggerData(data, loanData, adminId) {
    try {
      const submissionDate = this.typeService.getGlobalDate(new Date());
      const triggerData = [];
      const length = data.length;
      for (let index = 0; index <= length; index++) {
        try {
          const ele = data[index];
          const loanId = ele['Loan ID'];
          let userId;
          // contact number
          const contact1 = +ele?.latestPhoneNumber;
          const contact2 = +ele?.secondPhoneNumber;
          let num1: string;
          let num2: string;
          if (contact1 && contact1 != 0) {
            num1 = (contact1 ?? '').toString().replace(/\D/g, '');
            if (num1.length === 12 && num1.startsWith('91'))
              num1 = num1.replace('91', '');
          }
          if (contact2 && contact2 != 0) {
            num2 = (contact2 ?? '').toString().replace(/\D/g, '');
            if (num2.length === 12 && num2.startsWith('91'))
              num2 = num2.replace('91', '');
          }
          // email
          const email1 = ele['Email.1'] ? ele['Email.1'].toLowerCase() : null;
          const email2 = ele['Email.2'] ? ele['Email.2'].toLowerCase() : null;
          const loan = loanData.find((f) => f.id == loanId);
          if (loan) {
            userId = loan.userId;
            const allPhone = loan.registeredUsers?.allPhone ?? [];
            const allEmail = loan.registeredUsers?.allEmail ?? [];
            const otherPhone = loan.registeredUsers?.otherPhone ?? [];
            const otherEmail = loan.registeredUsers?.otherEmail ?? [];
            const addedBy = loan.registeredUsers?.addedBy ?? {};

            if (num1 && !allPhone.includes(num1)) {
              allPhone.push(num1);
              otherPhone.push(num1);
              addedBy[num1] = 'TRIGGER';
            }
            if (num2 && !allPhone.includes(num2)) {
              allPhone.push(num2);
              otherPhone.push(num2);
              addedBy[num2] = 'TRIGGER';
            }
            if (email1 && !allEmail.includes(email1)) {
              allEmail.push(email1);
              otherEmail.push(email1);
              addedBy[email1] = 'TRIGGER';
            }
            if (email2 && !allEmail.includes(email2)) {
              allEmail.push(email2);
              otherEmail.push(email2);
              addedBy[email2] = 'TRIGGER';
            }
            const updateUser = {
              otherPhone,
              otherEmail,
              allPhone,
              allEmail,
              addedBy,
            };
            await this.userRepo.updateRowData(updateUser, userId);
          }
          const obj = { data: ele, loanId, userId, submissionDate, adminId };
          triggerData.push(obj);
        } catch (error) {}
      }
      // bulk Create
      const create = await this.triggerRepo.bulkCreate(triggerData);
      if (create === k500Error) return kInternalError;
      return triggerData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // Get CIBIL Trigger Data
  async getCIBILTriggerData(query) {
    try {
      const userId = query?.userId;
      const loanId: number = query?.loanId;
      if (!userId && !loanId) return kParamMissing('userId or loanId');
      const page = query?.page;
      const download = query?.download ?? 'false';
      const triggerDate = query?.triggerDate;
      const isCountOnly = query?.isCountOnly ?? false;
      if (isCountOnly == true) {
        const countOps: any = { where: {} };
        if (loanId) countOps.where.loanId = loanId;
        else if (userId) countOps.where.userId = userId;
        const countData = await this.triggerRepo.getCountsWhere(countOps);
        if (countData === k500Error) return kInternalError;
        return { triggerCount: countData };
      }
      const toDate = new Date();
      let sDate = query?.startDate;
      let eDate = query?.endDate;
      if (!sDate || !eDate) {
        sDate = toDate;
        eDate = toDate;
      }
      const startDate = this.typeService.getGlobalDate(sDate);
      const endDate = this.typeService.getGlobalDate(eDate);
      const attr = ['id', 'data', 'loanId', 'userId', 'submissionDate'];
      const opts: any = { where: {}, order: [['id', 'DESC']] };

      if (triggerDate != 'all')
        opts.where.submissionDate = {
          [Op.gte]: startDate.toJSON(),
          [Op.lte]: endDate.toJSON(),
        };
      if (loanId) opts.where.loanId = loanId;
      else if (userId) opts.where.userId = userId;
      if (download != 'true') {
        opts.offset = +(page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        opts.limit = PAGE_LIMIT;
      }

      const data = await this.triggerRepo.getTableWhereDataWithCounts(
        attr,
        opts,
      );
      if (data === k500Error) return kInternalError;
      const finalData: any = this.prepareTriggerData(data.rows);
      if (finalData?.message) return kInternalError;
      data.rows = finalData;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // prepare CIBIL Trigger Data
  private prepareTriggerData(data) {
    try {
      const length = data.length;
      const finalData = [];
      for (let index = 0; index <= length; index++) {
        try {
          const ele = data[index];
          const tri = ele?.data;
          const date = this.typeService.getDateFormatted(ele?.submissionDate);
          // merge address
          const latestAdress = `${
            tri?.latestAddressLine1 ? tri?.latestAddressLine1 + ', ' : ''
          }${tri?.latestAddressLine2 ? tri?.latestAddressLine2 + ', ' : ''}${
            tri?.latestAddressLine3 ? tri?.latestAddressLine3 + ', ' : ''
          }${tri?.latestAddressLine4 ? tri?.latestAddressLine4 + ', ' : ''}${
            tri?.latestAddressLine5 ? tri?.latestAddressLine5 : ''
          }`;
          const secondAdress = `${
            tri?.secondAddressLine1 ? tri?.secondAddressLine1 + ', ' : ''
          }${tri?.secondAddressLine2 ? tri?.secondAddressLine2 + ', ' : ''}${
            tri?.secondAddressLine3 ? tri?.secondAddressLine3 + ', ' : ''
          }${tri?.secondAddressLine4 ? tri?.secondAddressLine4 + ', ' : ''}${
            tri?.secondAddressLine5 ? tri?.secondAddressLine5 : ''
          }`;
          // check contact name
          const contactName = `${
            tri?.contactName1 ? tri?.contactName1 + ', ' : ''
          }${tri?.contactName3 ? tri?.contactName3 + ', ' : ''}`;
          const contactName1 = `${
            tri?.contactName2 ? tri?.contactName2 + ', ' : ''
          }${tri?.contactName4 ? tri?.contactName4 + ', ' : ''}${
            tri?.contactName5 ? tri?.contactName5 + ', ' : ''
          }`;

          const obj: any = { Date: date };
          obj['Trigger Type'] = tri['Trigger Type'] ?? '-';
          obj['Loan ID'] = tri['Loan ID'] ?? '-';
          obj['Agent Name'] = tri['Agent Name'] ?? '-';
          obj['Account Type'] = tri?.accountType ?? '-';
          obj['Contact Info Name'] = contactName ?? '-';
          obj['Contact Info Name - 1'] = contactName1 ?? '-';
          obj['Contact Info Latest Address'] = latestAdress ?? '-';
          obj['Latest Address Category'] = tri?.latestAddressCategory ?? '-';
          obj['Latest State'] = tri?.latestState ?? '-';
          obj['Latest Pin Code'] = tri?.latestPinCode ?? '-';
          obj['Contact Info Second Address'] = secondAdress ?? '-';
          obj['Second Address Category'] = tri?.secondAddressCategory ?? '-';
          obj['Second State'] = tri?.secondState ?? '-';
          obj['Second Pin Code'] = tri?.secondPinCode ?? '-';
          obj['Contact Info Latest Phone'] =
            (tri?.latestPhoneNumber ?? '-') +
            `${tri?.latestPhoneType ? '(' + tri?.latestPhoneType + ')' : ''}`;
          obj['Contact Info Second Phone'] =
            (tri?.secondPhoneNumber ?? '-') +
            `${tri?.secondPhoneType ? '(' + tri?.secondPhoneType + ')' : ''}`;
          obj['Email 1'] = tri['Email.1'] ?? '-';
          obj['Email 2'] = tri['Email.2'] ?? '-';
          finalData.push(obj);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region get legal data
  private async getLegalData(userData) {
    try {
      const legalList = [];
      for (let index = 0; index < userData.length; index++) {
        try {
          const loan = userData[index];
          userData[index].isLegal = false;
          if (loan.loanStatus === 'Active') {
            const legalType = loan?.legalType ?? -1;
            if (legalType === 4) legalList.push(loan?.legalId);
            else if ([5, 6, 7, 8].includes(legalType))
              userData[index].isLegal = true;
          }
        } catch (error) {}
      }
      const att = ['loanId', 'caseDetails'];
      const options = { where: { id: legalList } };
      const legalData = await this.legalRepo.getTableWhereData(att, options);
      if (!legalData || legalData === k500Error) return kInternalError;

      for (let index = 0; index < legalData.length; index++) {
        try {
          const legal = legalData[index];
          const ccNumber = (legal?.caseDetails?.ccNumber ?? -1)
            .toString()
            .trim();
          const crNumber = (legal?.caseDetails?.crNumber ?? -1)
            .toString()
            .trim();
          let isLegal = false;
          if (crNumber && crNumber != '-1') isLegal = true;
          if (ccNumber && ccNumber != '-1') isLegal = true;
          if (isLegal) {
            const findIndex = userData.findIndex((f) => f.id === legal.loanId);
            userData[findIndex].isLegal = true;
          }
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
