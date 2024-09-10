// Imports
import { Op, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { EmiEntity } from 'src/entities/emi.entity';
import { TypeService } from 'src/utils/type.service';
import { registeredUsers } from 'src/entities/user.entity';
import { LoanRepository } from 'src/repositories/loan.repository';
import {
  getSmsUuid,
  kAutoDebit,
  kCollectionPhone,
  kEMIPay,
  kFailed,
  kFullPay,
  kInitiated,
  kLegalProcess,
  kNoDataFound,
  kQa,
  kAdmins,
  kLegalMail,
  nbfcInfoStr,
  kNoReplyMail,
  kLegalNumber,
  kCompleted,
  kLspNoReplyMail,
  klspLegalMail,
} from 'src/constants/strings';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  AUTODEBIT_PLACE,
  BREW_SITE_LOG,
  CASE_ASSIGN,
  CASE_DISPOSAL,
  CASE_FILLED,
  CASE_INPROGRESS,
  CASE_INPROGRESS_DAYS,
  CASE_TOBE_FILE,
  CASE_TOBE_FILE_DAYS,
  CASE_WITHDRAWAL,
  COMPLAINANT,
  DEMAND_STATUS,
  HOST_URL,
  LEGAL_NUMBER,
  LEGAL_PROCESS,
  LEGAL_STATUS,
  LIMIT_PER_CRON,
  MSG91,
  PAGE_LIMIT,
  PAID_LEGAL,
  SUMMONS,
  SYSTEM_ADMIN_ID,
  TRACKING_RES_HOURSE,
  UAT_PHONE_NUMBER,
  WARRENT,
  advocate_role,
  caseFilledSMSId,
  gIsPROD,
  paidLegalSmsId,
  legalStep,
  GLOBAL_CHARGES,
  templateDesign,
  legalString,
  gIsPriamryNbfc,
} from 'src/constants/globals';
import { CryptService } from 'src/utils/crypt.service';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { LegalConsigment } from 'src/entities/legal.consignment.entity';
import { EMIRepository } from 'src/repositories/emi.repository';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import * as fs from 'fs';
import { FileService } from 'src/utils/file.service';
import {
  kDemandLetter1Mail,
  kDemandLetter2Mail,
  kLegalNoticeDocs,
  kSummonsWarrant,
  kSummonsWarrantLokAdalat,
  kTriggerMailFormate,
  kUpcomingPenalChanges,
  tLegalFormatePath,
} from 'src/constants/directories';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { esignEntity } from 'src/entities/esign.entity';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { KYCRepository } from 'src/repositories/kyc.repository';
import { admin } from 'src/entities/admin.entity';
import { MasterEntity } from 'src/entities/master.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { LegalFormateService } from './legal.fomate';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { ESignRepository } from 'src/repositories/esign.repository';
import { SubScriptionEntity } from 'src/entities/subscription.entity';
import { APIService } from 'src/utils/api.service';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { MasterRepository } from 'src/repositories/master.repository';
import { DisbursmentRepository } from 'src/repositories/disbursement.repository';
import { UserActivityRepository } from 'src/repositories/user.activity.repository';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { MailService } from 'src/thirdParty/mail/email.service';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { SequelOptions } from 'src/interfaces/include.options';
import { SendingBlueService } from 'src/thirdParty/sendingBlue/sendingBlue.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';
import { SystemTraceEntity } from 'src/entities/system_trace.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { EnvConfig } from 'src/configs/env.config';
import { kLspMsg91Templates, kMsg91Templates } from 'src/constants/objects';
@Injectable()
export class LegalService {
  constructor(
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
    private readonly commonSharedService: CommonSharedService,
    private readonly cryptService: CryptService,
    private readonly transactionRepo: TransactionRepository,
    private readonly emiRepo: EMIRepository,
    private readonly fileService: FileService,
    private readonly legalCollectionRepo: LegalCollectionRepository,
    private readonly sharedNotificationService: SharedNotificationService,
    private readonly kycRepo: KYCRepository,
    private readonly legalFormateService: LegalFormateService,
    private readonly sharedAssingService: AssignmentSharedService,
    private readonly esignRepo: ESignRepository,
    private readonly apiRequest: APIService,
    private readonly legalConsignmentRepo: LegalConsigmentRepository,
    private readonly adminRepo: AdminRepository,
    private readonly allSmsService: AllsmsService,
    private readonly masterRepo: MasterRepository,
    private readonly disburementRepo: DisbursmentRepository,
    private readonly userActivityRepo: UserActivityRepository,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly mailService: MailService,
    private readonly staticConfig: StaticConfigRepository,
    private readonly subScriptionRepo: SubscriptionRepository,
    private readonly workMailRepo: WorkMailRepository,
    // Third party services
    private readonly brevoService: SendingBlueService,
    // Database
    private readonly repo: RepositoryManager,
  ) {}

  //#endregion
  async getLoanData(loanIds, transactionData, isFullPay = false) {
    try {
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const adminInclude = { as: 'followerData', ...includes.adminInclude };
      const options = {
        where: { id: loanIds },
        include: [adminInclude],
      };
      const loanData = await this.loanRepo.getTableWhereData(
        [
          'id',
          'netApprovedAmount',
          'loanStatus',
          'approvedDuration',
          'esign_id',
          'advocateId',
          'subscriptionId',
          'loan_disbursement_date',
          'appType',
        ],
        options,
      );
      if (loanData == k500Error) return kInternalError;
      const kycIds = transactionData.map((ele) => ele.userData.kycId);
      const kycAllData: any = await this.kycRepo.getTableWhereData(
        ['id', 'panCardNumber', 'aadhaarAddress'],
        { where: { id: kycIds } },
      );
      if (kycAllData == k500Error) return kInternalError;
      const esignData = await this.esignRepo.getTableWhereData(
        ['id', 'createdAt', 'loanId'],
        { where: { loanId: loanIds } },
      );
      if (esignData == k500Error) return kInternalError;
      const emiData = await this.emiRepo.getTableWhereData(
        ['id', 'emi_date', 'payment_status', 'loanId', 'payment_due_status'],
        { where: { loanId: loanIds } },
      );
      if (emiData == k500Error) return kInternalError;

      const finalData: any = [];
      for (let i = 0; i < transactionData.length; i++) {
        try {
          const ele: any = transactionData[i];
          const emi = ele.emiData;
          const loan = loanData.find((loan) => loan.id == ele.loanId);
          ele.loanData = loan ?? {};
          let allEmis = emiData.filter((ele) => ele.loanId == loan.id);
          const followerData: any = loan?.followerData;
          const companyPhone =
            followerData?.companyPhone ?? followerData?.phone;
          const userData = ele.userData;
          const kycData = kycAllData.find((kyc) => kyc.id == userData.kycId);
          const eSignData = esignData.find((es) => es.id == loan.esign_id);
          //if all the emi delayed then not create demand letter
          allEmis.sort((a, b) => a.id - b.id);
          //emi number
          const index = allEmis.findIndex((el) => el.id == emi.id);
          ele.emiData.emiNumber = index + 1;
          ele.loanData.eSignData = eSignData;
          ele.loanData.companyPhone = companyPhone
            ? await this.cryptService.decryptText(companyPhone)
            : kCollectionPhone;
          ele.userData.kycData = kycData;
          finalData.push(ele);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      return transactionData;
    }
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }
  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  async getDelayEmiList(passData) {
    try {
      const loanList = passData?.loanIds;
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const emiInclude = includes.emiInclude;
      const userInclude: any = includes.userInclude;
      const loanInclude: any = includes.loanInclude;
      emiInclude.where = {
        payment_status: '0',
        payment_due_status: '1',
        legalType: { [Op.eq]: null },
        emi_date: { [Op.gte]: '2023-06-29T10:00:00.000Z' },
      };
      const options: any = {
        where: {
          subscriptionDate: { [Op.eq]: Sequelize.col('"emiData"."emi_date"') },
          status: 'FAILED',
          adminId: SYSTEM_ADMIN_ID,
          type: 'EMIPAY',
          [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
        },
        include: [emiInclude, userInclude, loanInclude],
      };
      if (passData.limit) {
        let limit = passData?.limit ?? 50;
        options.limit = +limit;
      }
      if (loanList) options.where.loanId = loanList.split(',').map((l) => +l);
      let transactionData: any = await this.transactionRepo.getTableWhereData(
        [
          'id',
          'status',
          'createdAt',
          'emiId',
          'loanId',
          'userId',
          'completionDate',
          'subscriptionDate',
          'subStatus',
        ],
        options,
      );
      if (transactionData == k500Error) return kInternalError;
      transactionData.forEach((transaction) => {
        if (!transaction?.loanData?.penaltyCharges?.MODIFICATION_CALCULATION) {
          transaction.emiData.bounceCharge = 0;
        }
      });
      const loanIds = [...new Set(transactionData.map((ele) => ele?.loanId))];
      transactionData = await this.getLoanData(loanIds, transactionData);
      return transactionData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funCreateDemandLetter(query) {
    try {
      //get all the emi list which autodebit failed and delay
      const transactionData: any = await this.getDelayEmiList(query);
      if (transactionData?.message) return transactionData;
      //read demand letter formate
      const htmlPage1 = fs.readFileSync(kDemandLetter1Mail, 'utf-8');
      const htmlPage2 = fs.readFileSync(kDemandLetter2Mail, 'utf-8');
      const finalData: any = [];
      //create demand letter
      for (let i = 0; i < transactionData.length; i++) {
        try {
          const trans = transactionData[i];
          const emi = trans.emiData;
          const passData: any = {};
          //prepare all the html content according pages
          const demandPath: any =
            await this.legalFormateService.prepareDemandLetter(
              trans,
              htmlPage1,
              htmlPage2,
            );
          if (demandPath.message) continue;
          const url = await this.makePdfAndUploadToCloud(demandPath);
          if (!url) continue;
          passData.userId = trans.userId;
          passData.loanId = trans.loanId;
          passData.emiId = emi.id;
          passData.adminId = SYSTEM_ADMIN_ID;
          passData.url = url;
          passData.type = DEMAND_STATUS;
          passData.subType = emi.emiNumber;
          passData.transactionId = trans.id;
          //final demand payload array
          finalData.push(passData);
        } catch (error) {}
      }
      if ((finalData ?? []).length == 0) return [];
      //create demand letters
      const createdData = await this.legalCollectionRepo.bulkCreate(finalData);
      if (createdData == k500Error) return kInternalError;
      //update all emi which demand already created
      const transactionIds = [];
      transactionData.forEach((tran) => {
        let find = createdData.find((crt) => crt.emiId == tran.emiId);
        if (find) transactionIds.push(tran.id);
      });
      const emiIds = createdData.map((ele) => ele.emiId);
      await this.emiRepo.updateRowData({ legalType: DEMAND_STATUS }, emiIds);
      await this.updateLegalProcessTransaction(transactionIds);
      //sent mail to all users
      let ids = createdData.map((ele) => ele.id);
      await this.sendNoticeToUser({
        isSentWorkMail: true,
        ids,
        noticeType: DEMAND_STATUS,
      });
      return transactionData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async makePdfAndUploadToCloud(
    filePath,
    otherContent = {},
    isSingle = false,
  ) {
    try {
      let currentPage;
      let nextPages: any = [];
      let path;
      if (isSingle)
        path = await this.fileService.dataToPDF(filePath, otherContent);
      else {
        for (let index = 0; index < filePath.length; index++) {
          try {
            const pageData = filePath[index];
            const pdfPath = await this.fileService.dataToPDF(
              pageData,
              otherContent,
            );
            if (index == 0) currentPage = pdfPath.toString();
            else nextPages.push(pdfPath.toString());
          } catch (error) {}
        }
        path = await this.fileService.mergeMultiplePDF(nextPages, currentPage);
        await this.fileService.removeFiles([...nextPages, currentPage]);
      }
      if (path == k500Error) return null;
      // store  pdf  in cloud
      const url: any = await this.fileService.uploadFile(
        path,
        kLegalNoticeDocs,
      );
      if (!url || url == k500Error) return null;
      return url;
    } catch (error) {
      return null;
    }
  }

  async getTransactionData(
    loanIds,
    loanData?,
    allTransaction = false,
    needPaidOnly = false,
    legalTranIds = [],
  ) {
    try {
      let options: any = {};
      if (legalTranIds.length == 0) {
        //check transaction should not be processed
        let legalProcessWhere: any = {
          remarks: {
            [Op.or]: [{ [Op.ne]: kLegalProcess }, { [Op.eq]: null }],
          },
        };
        //get letest fullpay autodebit buy system
        const maxTransactions = await this.transactionRepo.getTableWhereData(
          [[Sequelize.fn('max', Sequelize.col('id')), 'tranId']],
          {
            where: {
              loanId: loanIds,
              status: 'FAILED',
              type: 'FULLPAY',
              ...legalProcessWhere,
              adminId: SYSTEM_ADMIN_ID,
              [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
            },
            group: ['loanId'],
          },
        );
        if (!maxTransactions || maxTransactions == k500Error)
          return kInternalError;
        const tranIds = maxTransactions.map((tran) => tran.tranId);
        //get all the fullpay failed transaction data
        options = {
          where: {
            id: tranIds,
            status: 'FAILED',
            [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
            ...legalProcessWhere,
            subStatus: {
              [Op.or]: [{ [Op.eq]: null }, { [Op.ne]: 'AD_NOT_PLACED' }],
            },
            utr: { [Op.ne]: null },
          },
        };
        //check need all transction all paid only
        if (allTransaction || needPaidOnly) {
          options.where = { loanId: loanIds };
          if (needPaidOnly) {
            options.where.status = 'COMPLETED';
            options.where.type = { [Op.ne]: 'REFUND' };
          }
        }
      } else options.where = { id: legalTranIds, loanId: loanIds };
      //get transation data
      const transactionData = await this.transactionRepo.getTableWhereData(
        [
          'id',
          'status',
          'createdAt',
          'emiId',
          'loanId',
          'completionDate',
          'subscriptionDate',
          'paidAmount',
          'source',
          'subSource',
          'subStatus',
          'response',
          'utr',
          'type',
          'principalAmount',
          'interestAmount',
          'penaltyAmount',
          'adminId',
          'remarks',
        ],
        options,
      );
      if (transactionData == k500Error) return kInternalError;
      if (needPaidOnly) {
        transactionData.sort((a, b) => b.id == a.id);
        return transactionData;
      }
      if (allTransaction) return transactionData;
      loanData = loanData.map((loan) => {
        const tran = transactionData.find((tran) => tran.loanId == loan.id);
        loan.transactionData = tran ?? null;
        return loan;
      });
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getDelayFullPayLoan(loanIds, query?) {
    try {
      // Required table joins
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const emiInclude: any = includes.emiInclude;
      const disbursementInclude: any = includes.disbursementInclude;
      const userInclude: any = includes.userInclude;
      const esingInclude = includes.esingInclude;

      // Query preparation
      const options: any = {
        where: {
          id: loanIds,
          loanStatus: 'Active',
          legalType: {
            [Op.or]: [
              {
                [Op.notIn]: [
                  LEGAL_STATUS,
                  CASE_TOBE_FILE,
                  CASE_INPROGRESS,
                  CASE_FILLED,
                  SUMMONS,
                  WARRENT,
                  CASE_WITHDRAWAL,
                  CASE_DISPOSAL,
                  CASE_ASSIGN,
                  PAID_LEGAL,
                  AUTODEBIT_PLACE,
                ],
              },
              { [Op.eq]: null },
            ],
          },
        },
        include: [emiInclude, disbursementInclude, userInclude, esingInclude],
      };
      if (query.limit) options.limit = +query?.limit ?? 50;
      // Query
      let loanData: any = await this.loanRepo.getTableWhereData(
        [
          'id',
          'netApprovedAmount',
          'userId',
          'loanStatus',
          'duration',
          'esign_id',
          'advocateId',
          'approvedDuration',
          'appType',
        ],
        options,
      );
      if (loanData == k500Error) return kInternalError;

      let finalData = [];
      let notPlaced = [];
      loanIds = loanData.map((loan) => loan.id);
      //check all the full pay transaction
      loanData = await this.getTransactionData(loanIds, loanData);
      if (loanData.message) return kInternalError;
      const kycIds = loanData.map((ele) => ele.registeredUsers.kycId);
      // KYC details
      const kycAllData: any = await this.kycRepo.getTableWhereData(
        ['id', 'panCardNumber', 'aadhaarAddress'],
        { where: { id: kycIds } },
      );

      // Advocate details
      const adminData: any =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      if (adminData.message) return kInternalError;
      else if (!adminData)
        return k422ErrorMessage(`${advocate_role} not found!`);

      for (let i = 0; i < loanData.length; i++) {
        try {
          const loan = loanData[i];
          //all emi data
          const allEmiData = loan.emiData;
          //transction data
          const transactionData = loan.transactionData;
          //disbursement data
          let disbursementData = loan?.disbursementData ?? [];
          //get letest disbursememt data
          disbursementData = disbursementData.sort((a, b) => b.id - a.id)[0];
          //filter out all the due and unpaid emi data
          const remainingEmi = allEmiData.filter(
            (emi) => emi.payment_status == '0' && emi.payment_due_status == '1',
          );
          remainingEmi.sort((a, b) => a.id - b.id);
          loan.unpaidEmi = remainingEmi;
          //register users data
          const userData = loan.registeredUsers;
          //update kyc data to perticular loan
          const kycData = kycAllData.find((kyc) => kyc.id == userData.kycId);
          loan.registeredUsers.kycData = { ...kycData };
          //find is there any advocate already assigned
          const advocateData = adminData.find(
            (ele) => ele.id == loan.advocateId,
          );
          //checking if advocate is not present then reassing
          if (!advocateData) loan.advocateId = null;
          loan.advocateData = advocateData ?? null;
          loan.disbursementData = disbursementData;
          //if there is fullpay transaction exits then append
          if (transactionData) {
            loan.fullPayAutodebit = transactionData;
            finalData.push(loan);
          } else notPlaced.push(loan.id);
        } catch (error) {}
      }
      //return final data

      return { finalData, notPlaced };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getDefaultLoanData(query) {
    try {
      // Get required table joins
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;

      // Check all the active and not processed legal
      loanInclude.where = {
        loanStatus: 'Active',
        legalType: {
          [Op.or]: [
            {
              [Op.notIn]: [
                LEGAL_STATUS,
                CASE_TOBE_FILE,
                CASE_INPROGRESS,
                CASE_FILLED,
                SUMMONS,
                WARRENT,
                CASE_WITHDRAWAL,
                CASE_DISPOSAL,
                CASE_ASSIGN,
                PAID_LEGAL,
                AUTODEBIT_PLACE,
              ],
            },
            { [Op.eq]: null },
          ],
        },
      };

      // Check loan is fully overdue or not
      const attributes = ['id', 'loanId'];
      const today = this.typeService.getGlobalDate(new Date());

      const emiOptions: any = {
        where: { partOfemi: 'LAST', emi_date: { [Op.lt]: today } },
        include: [loanInclude],
      };
      if (query.loanIds) emiOptions.where.loanId = query.loanIds;

      // Get all the emi data
      const emiData = await this.emiRepo.getTableWhereData(
        attributes,
        emiOptions,
      );
      if (emiData == k500Error) return kInternalError;
      // Filter unique loans
      const loanIds = [...new Set(emiData.map((ele) => ele?.loanId))];
      const data = await this.getDelayFullPayLoan(loanIds, query);
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async assingAdvocate(loanData) {
    try {
      let adminData = await this.sharedAssingService.fetchAdminAccordingRole(
        advocate_role,
        true,
      );

      if (adminData == k500Error) return kInternalError;
      if (!adminData) return k422ErrorMessage(`${advocate_role} not found!`);
      adminData = adminData.filter(
        (admin) => (admin?.otherData?.case_per ?? 0) > 0,
      );
      const adminIds = adminData.map((admin) => admin.id);
      const tempLoanData = loanData.filter(
        (ele) =>
          !ele?.advocateId ||
          (ele?.advocateId && !adminIds.includes(ele.advocateId)),
      );
      const totalLegal = tempLoanData.length;
      let finalData = [];
      for (let i = 0; i < adminData.length; i++) {
        try {
          const admin = adminData[i];
          const otherData = admin?.otherData;
          const case_per = otherData?.case_per ?? 0;
          const legalAssing = Math.round((totalLegal * case_per) / 100);
          const legalData = tempLoanData.splice(0, legalAssing);
          const loanIds = legalData.map((loan) => loan.id);
          admin.loanIds = loanIds;
          finalData.push(admin);
        } catch (error) {
          console.error('Error in: ', error);
          return kInternalError;
        }
      }
      if (tempLoanData.length > 0) {
        let randomAdv = Math.floor(Math.random() * adminData.length);
        const loanIds = tempLoanData.map((loan) => loan.id);
        finalData[randomAdv].loanIds.push(...loanIds);
      }
      //udpate advocate in loan data
      for (let i = 0; i < adminData.length; i++) {
        try {
          const admin = adminData[i];
          let loanIDs = admin.loanIds;
          await this.loanRepo.updateRowData({ advocateId: admin.id }, loanIDs);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async createLegalPdf(loanData) {
    try {
      //check and assign all the advocate to the loan for legal process based on percantage
      const adminData: any = await this.assingAdvocate(loanData);
      if (adminData.message) return kInternalError;
      const otherContent = {
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:7px;white-space:nowrap;margin-left:25px;width:100%;">
      <span style="display:inline-block;float:right;margin-right:10px;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
      </span>
  </div>`,
      };
      const htmlData = fs.readFileSync(tLegalFormatePath, 'utf8');
      const transactionIds = [];
      let finalData = [];
      let userData = [];
      for (let i = 0; i < loanData.length; i++) {
        try {
          const loan = loanData[i];
          const transactionData = loan.transactionData;
          const appType = loan?.appType;
          const admin = adminData.find((ele) => ele.loanIds.includes(loan.id));
          if (admin) loan.advocateData = admin;
          const legalCreate: any =
            await this.legalFormateService.prepareLegalFormate(loan, htmlData);
          if (
            legalCreate.message ||
            legalCreate?.passData?.failedAutodebitText == '-' ||
            !legalCreate?.passData?.failedAutodebitText
          )
            continue;

          const url = await this.makePdfAndUploadToCloud(
            legalCreate.hbsData,
            otherContent,
            true,
          );
          if (!url) continue;
          const passData: any = {};
          passData.userId = loan.userId;
          passData.loanId = loan.id;
          passData.adminId = SYSTEM_ADMIN_ID;
          passData.url = url;
          passData.type = LEGAL_STATUS;
          passData.subType = 4;
          passData.advocateId = loan?.advocateData?.id;
          passData.transactionId = transactionData.id;
          //final legal payload array
          transactionIds.push({ tranId: transactionData.id, loanId: loan.id });
          finalData.push(passData);
          userData.push({ userId: loan.userId, appType });
          const smsOptions: any = {};
          const smsData: any = kMsg91Templates[kMsg91Templates.LegalNotice];
          const varOptions = smsData.varOptions ?? [];
          for (let index = 0; index < varOptions.length; index++) {
            try {
              const el = varOptions[index];
              const key = el.key;
              const title = el.title;
              if (key && title) {
                if (title == '##AGENT_NUMBER##') smsOptions[key] = LEGAL_NUMBER;
              }
            } catch (error) {}
          }
          const body = {
            userData,
            isMsgSent: true,
            title: 'Legal Notice',
            smsId: kMsg91Templates.LegalNotice,
            smsOptions,
            id: 487,
          };
          await this.sharedNotificationService.sendNotificationToUser(body);
        } catch (error) {}
      }
      const legalData = await this.legalCollectionRepo.bulkCreate(finalData);
      if (legalData == k500Error) return kInternalError;
      const ids = legalData.map((ele) => ele.id);
      const updateTrans = [];
      //update transaction which processed for legal
      transactionIds.forEach((tran) => {
        let find = legalData.find((legal) => tran.loanId == legal.loanId);
        if (find) updateTrans.push(tran.tranId);
      });
      await this.updateLegalToLoan(legalData);
      await this.updateLegalProcessTransaction(updateTrans);
      await this.sendNoticeToUser({
        isSentWorkMail: true,
        ids,
        noticeType: LEGAL_STATUS,
      });
      return loanData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateLegalProcessTransaction(transactionIds) {
    try {
      return await this.transactionRepo.updateRowData(
        { remarks: kLegalProcess },
        transactionIds,
      );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funCreateLegalNotice(query) {
    try {
      //get all defaulter data
      const data: any = await this.getDefaultLoanData(query);
      if (data.message) return data;
      // Legal eligible data
      const finalData = data.finalData;
      const notPlacedAutodebit = data.notPlaced;
      await this.placeRemainingAutoDebit(notPlacedAutodebit);
      // if (!gIsPriamryNbfc) return {}; //Temporary disabled sending legal notice for NBFC 1
      return await this.createLegalPdf(finalData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funAssingedToCollection(body) {
    try {
      const legalId = body.legalId;
      const adminId = body?.adminId ?? SYSTEM_ADMIN_ID;
      if (!legalId) return kParamMissing('legalId');

      const legalData = await this.legalCollectionRepo.getRowWhereData(
        ['id', 'otherDetails', 'loanId'],
        {
          where: {
            id: legalId,
            type: { [Op.or]: [LEGAL_STATUS, CASE_TOBE_FILE, CASE_INPROGRESS] },
            otherDetails: {
              isAssign: { [Op.or]: [-1, null] },
              isHistory: { [Op.or]: [-1, null] },
            },
          },
        },
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const passData: any = {
        type: CASE_ASSIGN,
        adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const isCaseAssingToCollection =
        await this.commonSharedService.calcuLoanRepayment(legalData.loanId);

      if (isCaseAssingToCollection) {
        await this.loanRepo.updateRowData(
          { legalType: CASE_ASSIGN },
          legalData.loanId,
        );
        return await this.createAndUpdateNewLegal(passData, legalData, true);
      } else
        return k422ErrorMessage(
          'Outstanding principal amount should be less than 5000',
        );
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async placeRemainingAutoDebit(loanIds) {
    const coolOffLoanIds: any = await this.getCoolOffLoanIds(loanIds);
    if (coolOffLoanIds?.message) return coolOffLoanIds;
    let placedLoanIds = [];
    for (let i = 0; i < loanIds.length; i++) {
      try {
        const loanId = loanIds[i];
        if (coolOffLoanIds.includes(loanId)) continue;

        // Check any full pay autodebit placed before
        let dateRange = new Date();
        dateRange.setDate(dateRange.getDate() - 7);
        dateRange = this.typeService.getGlobalDate(dateRange);
        const checkIfAnyInti: any = await this.transactionRepo.getRowWhereData(
          ['id', 'type', 'createdAt'],
          {
            where: {
              loanId,
              type: kFullPay,
              status: kInitiated,
              createdAt: { [Op.gte]: dateRange.toJSON() },
              adminId: SYSTEM_ADMIN_ID,
              [Op.or]: [{ source: 'AUTOPAY' }, { subSource: kAutoDebit }],
            },
          },
        );
        if (checkIfAnyInti && checkIfAnyInti != k500Error) continue;
        //add legal charge
        await this.addLegalCharge(loanId);

        // Place fullpay autodebit
        const placed = await this.placeAutodebit(loanId);
        if (!placed.valid) continue;
        await this.loanRepo.updateRowData(
          { legalType: AUTODEBIT_PLACE },
          loanId,
        );
        placedLoanIds.push(loanId);
      } catch (error) {}
    }
    return placedLoanIds;
  }

  /* Legally we can not place autodebit again 
    if previous one is failed within 3 days or 
    placed minimum 3 autodebits in current month */
  private async getCoolOffLoanIds(loanIds) {
    // Check failed within 3 days
    const minDate = this.typeService.getGlobalDate(new Date());
    minDate.setDate(minDate.getDate() - 3);
    const attributes = ['loanId'];
    const options = {
      group: ['loanId'],
      where: {
        loanId: { [Op.in]: loanIds },
        type: kEMIPay,
        subSource: kAutoDebit,
        [Op.or]: [
          { status: kInitiated },
          {
            status: kFailed,
            completionDate: { [Op.gte]: minDate.toJSON() },
          },
        ],
      },
    };
    const transList = await this.transactionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (transList == k500Error) return kInternalError;
    let recentlyFailedLoanIds = transList.map((el) => el.loanId);

    // Check if max attempt per month is exhausted
    let maxAttemptList: any = [];
    const remainingLoanIds = loanIds
      .filter((el) => !recentlyFailedLoanIds.includes(el))
      .join(',');
    if (remainingLoanIds?.length > 0) {
      const today = this.typeService.getGlobalDate(new Date());
      today.setDate(1);
      const queryStr = `SELECT "loanId" FROM "TransactionEntities"
      WHERE "loanId" in (${remainingLoanIds}) AND "subSource" = '${kAutoDebit}'
      AND "status" = '${kFailed}' AND "subscriptionDate" >= '${today.toJSON()}'
      GROUP BY "loanId"
      HAVING COUNT("loanId") > 2`;
      maxAttemptList = await this.repo.injectRawQuery(
        TransactionEntity,
        queryStr,
      );
      if (maxAttemptList == k500Error) return kInternalError;
      maxAttemptList = maxAttemptList.map((el) => el.loanId);
    }

    return recentlyFailedLoanIds.concat(maxAttemptList);
  }

  async makeLegalEligible(id, loanId, userId, isRealTime = false) {
    try {
      const getTransactionData = await this.transactionRepo.getRowWhereData(
        ['id', 'type'],
        {
          where: {
            id,
            type: kFullPay,
            status: kFailed,
            loanId,
            userId,
            adminId: SYSTEM_ADMIN_ID,
            [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
          },
        },
      );
      if (getTransactionData && getTransactionData != k500Error) {
        const loan = await this.loanRepo.getRowWhereData(['id', 'loanStatus'], {
          where: { id: loanId, loanStatus: 'Active' },
        });
        if (loan && loan != k500Error)
          await this.loanRepo.updateRowData({ legalType: null }, loanId);
      }
      if (isRealTime == true) {
        await this.funCreateLegalNotice({ loanIds: [loanId] });
      }
    } catch (error) {}
  }

  async placeAutodebit(loanId) {
    try {
      const body = {
        adminId: SYSTEM_ADMIN_ID,
        emiId: -1,
        loanId,
        sendSMS: false,
        source: 'AUTOPAY',
      };
      const headers = { 'qa-test-key': EnvConfig.secrets.qaTestKey };
      const url = `${HOST_URL}admin/transaction/createPaymentOrder`;
      return await this.apiRequest.requestPost(url, body, headers);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateLegalToLoan(legalData) {
    try {
      const loanUpdateRecord = legalData.map((ele) => {
        return {
          legalId: ele.id,
          loanId: ele.loanId,
        };
      });
      for (let i = 0; i < loanUpdateRecord.length; i++) {
        try {
          const each = loanUpdateRecord[i];
          await this.loanRepo.updateRowData(
            { legalId: each.legalId, legalType: LEGAL_PROCESS },
            each.loanId,
          );
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async sendNoticeToUser(data: any) {
    try {
      //formate into array
      const isSentWorkMail = data?.isSentWorkMail ?? false;
      let ids: any = data.ids;
      let otherEmail = data?.otherEmail ?? [];
      const noticeType = data?.noticeType ?? 1;
      let sendDate = data?.sendDate;
      const adminId = data?.adminId ?? SYSTEM_ADMIN_ID;
      const mailReSend = data?.mailReSend ?? false;
      if (!Array.isArray(data.ids)) ids = [ids];
      if (!ids || ids.length == 0) return kParamMissing('ids');
      //fetch all the required includes
      const include = [];
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude: any = includes.loanInclude;
      loanInclude.include = [];
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone', 'email'],
        include: [],
      };
      //include  mail required includes
      const notMatch = [SUMMONS, WARRENT];
      if (!notMatch.includes(+noticeType)) {
        const emiInclude = includes.emiInclude;
        const disburesementInclude = includes.disbursementInclude;
        const masterInclude: any = includes.masterInclude;
        const workMailInclude = includes.workMailInclude;
        masterInclude.include = [workMailInclude];
        userInclude.include.push(masterInclude);
        const transactionInclude = includes.transactionInclude;
        include.push(emiInclude);
        loanInclude.include = [disburesementInclude, transactionInclude];
      }
      const adminInclude = {
        as: 'followerData',
        ...includes.adminInclude,
      };
      loanInclude.include.push(adminInclude);
      include.push(loanInclude, userInclude);
      //master include
      const options = {
        where: { id: ids, type: noticeType },
        include,
      };
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        [
          'id',
          'type',
          'sentType',
          'url',
          'userId',
          'subType',
          'dates',
          'loanId',
          'transactionId',
          'advocateId',
          'sentBy',
          'caseDetails',
        ],
        options,
      );
      if (legalData == k500Error) return kInternalError;
      legalData.forEach((legal) => {
        if (
          !legal?.loanData?.penaltyCharges?.MODIFICATION_CALCULATION &&
          legal.emiData
        )
          legal.emiData.bounceCharge = 0;
      });
      const loanIds = legalData.map((legal) => legal.loanId);
      const advocateData: any =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      if (!advocateData || advocateData == k500Error)
        return k422ErrorMessage(`${advocate_role} not found!`);
      let transactions: any = [];
      if (noticeType != SUMMONS) {
        let legalTransactionIds = legalData.map((legal) => legal.transactionId);
        transactions = await this.getTransactionData(
          loanIds,
          null,
          true,
          false,
          legalTransactionIds,
        );
      }
      // sent demand letter one by one
      for (let i = 0; i < legalData.length; i++) {
        try {
          const legal = legalData[i];
          const userData = legal.userData;
          const followerData = legal?.loanData?.followerData;
          // const appType = legal?.loanData?.appType;
          const appType = +templateDesign;
          const masterData = userData?.masterData;
          const workMailData = masterData?.workMailData;
          const sentType: any = legal?.sentType ?? {};
          const sentBy: any = legal?.sentBy;
          const dates: any = legal?.dates ?? {};
          const legalId = legal.id;
          const advocateId = legal.advocateId;
          let isWorkMail = false;
          if (legal.type != SUMMONS) {
            const tran = transactions.filter(
              (tran) => tran.loanId == legal.loanId,
            );
            legal.loanData.transactionData = tran ?? [];
          }
          let content = {
            to: gIsPROD ? userData.email : kQa[0],
            workMail: '',
          };
          //prod validation
          let email: any = gIsPROD ? [userData.email] : [kQa[1]];
          if (isSentWorkMail)
            if (workMailData?.email && workMailData?.status != '4') {
              email.push(workMailData.email);
              content.workMail = gIsPROD ? workMailData.email : kAdmins[1];
              isWorkMail = true;
            }
          if (otherEmail.length > 0) email = [...email, ...otherEmail];
          //attachments
          //mail formate for demand letter
          let formateData: any = {};
          formateData = await this.legalFormateService.prepareMailFormate(
            legal,
          );
          if (formateData.message) continue;
          let bccMail = [];
          if (followerData?.email) {
            const adminMail = await this.cryptService.decryptText(
              followerData.email,
            );
            bccMail.push(gIsPROD ? adminMail : kAdmins[2]);
          }

          const advocate = advocateData.find((adv) => adv.id == advocateId);
          if (advocate) {
            const advEmail = await this.cryptService.decryptText(
              advocate.email,
            );
            bccMail.push(gIsPROD ? advEmail : kAdmins[0]);
          }
          const subject = formateData.subject;
          const attechments = formateData.attechments;
          const htmlData = formateData.htmlData;
          let replyTo = kLegalMail;
          let fromMail = kLegalMail;
          if (appType == 0) {
            fromMail = klspLegalMail;
            replyTo = klspLegalMail;
          }
          const sentMail =
            await this.sharedNotificationService.sendMailFromSendinBlue(
              email,
              subject,
              htmlData,
              userData.id,
              [],
              attechments,
              fromMail,
              replyTo,
              { legalId, content },
              bccMail,
            );
          if (sentMail == k500Error) continue;
          const mailTrackId = sentMail?.id;
          //update mail sent for demand letter
          const currentDate = new Date();
          if (sendDate || currentDate) {
            sendDate = this.typeService.getGlobalDate(sendDate ?? currentDate);
            if (!dates.email || dates.email == -1)
              dates.email = sendDate.getTime();
            else dates.reSendEmail = sendDate.getTime();
            if (isWorkMail) {
              if (!dates.workMail || dates.workMail == -1)
                dates.workMail = sendDate.getTime();
              else dates.reSendWorkMailEmail = sendDate.getTime();
            }
            sentType.email = 1;
            if (isWorkMail) {
              sentType.workMail = 1;
              sentBy.workMailAdminId = adminId;
            }
            sentBy.emailAdminId = adminId;
          }
          let updateData: any = {
            sentType: sentType,
            dates,
            sentBy,
            mailTrackId,
          };
          if (mailReSend) updateData.mailReSend = true;
          await this.legalCollectionRepo.updateRowData(updateData, legal.id);
        } catch (error) {}
      }
      return true;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  legalAdditionalIncludes(where = {}) {
    try {
      const kycInclude = {
        model: KYCEntity,
        attributes: ['id', 'panCardNumber', 'aadhaarAddress'],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: [
          'id',
          'fullName',
          'phone',
          'email',
          'city',
          'state',
          'kycId',
          'masterId',
        ],
      };
      const transactionInclude = {
        model: TransactionEntity,
        attributes: [
          'id',
          'status',
          'createdAt',
          'emiId',
          'loanId',
          'completionDate',
          'subscriptionDate',
          'paidAmount',
          'source',
          'subSource',
          'response',
          'type',
          'principalAmount',
          'interestAmount',
        ],
      };
      const emiInclude = {
        model: EmiEntity,
        attributes: [
          'id',
          'emi_amount',
          'emi_date',
          'principalCovered',
          'interestCalculate',
          'penalty',
          'penalty_days',
          'payment_status',
          'payment_due_status',
          'legalType',
          'partOfemi',
          'emiNumber',
          'loanId',
          'paid_principal',
          'paid_interest',
          'paid_penalty',
          'paidBounceCharge',
          'paidPenalCharge',
          'paidLegalCharge',
          'paidRegInterestAmount',
          'regInterestAmount',
          'bounceCharge',
          'gstOnBounceCharge',
          'dpdAmount',
          'penaltyChargesGST',
          'legalCharge',
          'legalChargeGST',
        ],
      };
      const disbursementInclude = {
        model: disbursementEntity,
        attributes: [
          'id',
          'account_number',
          'bank_name',
          'ifsc',
          'utr',
          'mode',
          'amount',
          'source',
        ],
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: [
          'id',
          'netApprovedAmount',
          'loanStatus',
          'duration',
          'esign_id',
          'advocateId',
          'approvedDuration',
          'subscriptionId',
          'loan_disbursement_date',
          'followerId',
          'appType',
          'penaltyCharges',
        ],
      };
      const adminInclude = {
        model: admin,
        attributes: [
          'id',
          'fullName',
          'companyPhone',
          'phone',
          'email',
          'otherData',
        ],
      };
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'workMailId'],
      };
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['id', 'email', 'status'],
      };
      const esingInclude = {
        model: esignEntity,
        attributes: ['id', 'createdAt'],
      };
      return {
        loanInclude,
        emiInclude,
        disbursementInclude,
        transactionInclude,
        userInclude,
        kycInclude,
        adminInclude,
        masterInclude,
        workMailInclude,
        esingInclude,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  getFilterBy(filterBy, status) {
    let filterObj = { sentType: {} };
    try {
      if (!status) return filterObj;
      status = +status;
      if (filterBy == 'email') {
        filterObj.sentType[filterBy] = status;
      } else if (filterBy == 'workMail') {
        filterObj.sentType[filterBy] = status;
      } else if (filterBy == 'whatsApp') {
        filterObj.sentType[filterBy] = status;
      } else if (filterBy == 'physical') {
        filterObj.sentType[filterBy] = status;
      } else if (!filterBy && status) {
        filterObj = {
          sentType: {
            [Op.or]: [
              { email: +status },
              { workMail: +status },
              { whatsApp: +status },
              { physical: +status },
            ],
          },
        };
      }
      return filterObj;
    } catch (error) {
      return filterObj;
    }
  }

  async getAllLegalData(query) {
    try {
      const type = query.type;
      let isAdvocate = query?.isAdvocate ?? false;
      const adminId = query?.adminId;
      let advocateId = query?.advocateId;
      const filterBy = query?.filter;
      //get if user is advocate then return advocate data only
      const advocateData =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      if (advocateData)
        isAdvocate = advocateData.find((adv) => adv.id == adminId);
      if (isAdvocate) advocateId = adminId;

      let status = query?.status;
      if (isAdvocate && !advocateId) return kParamMissing('advocateId');
      if (!type) return kParamMissing('type');

      //required payload
      const startDate = query?.startDate ?? new Date();
      const endDate = query?.endDate ?? new Date();
      const page = query?.page ?? 1;
      const download = query?.download ?? 'false';
      let searchText = query?.searchText;
      //legal range
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      //get all required legal includes
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const userInclude: any = includes.userInclude;

      let userWhere: any = {};
      let legalWhere: any = {};
      if (searchText) {
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString: any = searchText.substring(2);
        if (firstTwoLetters == 'l-' || firstTwoLetters == 'L-')
          legalWhere.loanId = +restOfString;
        else if (!isNaN(searchText)) {
          searchText = this.cryptService.encryptPhone(searchText);
          searchText = searchText.split('===')[1];
          userWhere.phone = { [Op.like]: '%' + searchText + '%' };
        } else if (searchText.includes('@'))
          userWhere.email = { [Op.like]: '%' + searchText + '%' };
        else {
          userWhere.fullName = { [Op.iRegexp]: searchText };
        }
      }
      const loanInclude: any = includes.loanInclude;
      userInclude.where = userWhere;
      let include: any = [userInclude, loanInclude];
      if (type != CASE_DISPOSAL && type != PAID_LEGAL && type != CASE_ASSIGN) {
        const lealConsgimentInclude = {
          model: LegalConsigment,
          attributes: [
            'id',
            'legalId',
            'status',
            'legalNoticeTrackResponse',
            'consignmentNo',
            'lastResponseDate',
            'addressType',
            'manualAddress',
            'createdAt',
            'legalCollectionId',
          ],
        };
        include = [...include, lealConsgimentInclude];
      }
      let filterObj = this.getFilterBy(filterBy, status);
      let sortBy = [['id', 'DESC']];
      if (type == SUMMONS || type == WARRENT)
        sortBy = [[`dates.nextHearingDate::timestamp`]];

      const options: any = {
        where: {
          type: type,
          ...legalWhere,
          ...filterObj,
          otherDetails: {
            isHistory: { [Op.or]: [-1, null] },
          },
        },
        include,
        order: sortBy,
      };
      if (!(isAdvocate && type == CASE_WITHDRAWAL))
        options.where.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };

      if (advocateId) options.where.advocateId = advocateId;
      //if download true then ignore pagination
      if (download != 'true') {
        options.offset = +page * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes: any = [
        'id',
        'url',
        'sentType',
        'type',
        'emiId',
        'userId',
        'subType',
        'createdAt',
        'loanId',
        'caseDetails',
        'dates',
        'otherDetails',
        'advocateId',
        'trackId',
        'transactionId',
        'mailTrackId',
      ];
      //get all legal data
      const legalData =
        await this.legalCollectionRepo.getTableWhereDataWithCounts(
          attributes,
          options,
        );
      if (legalData == k500Error) return kInternalError;
      // prepare all data
      //get additional data
      const loanIds = legalData.rows.map((legal) => legal.loanId);
      const kycIds = legalData.rows.map((legal) => legal?.userData?.kycId);
      const esignIds = legalData.rows.map((legal) => legal?.loanData.esign_id);
      const subscriptionId = legalData.rows.map(
        (legal) => legal?.loanData?.subscriptionId,
      );
      const followerIds = legalData.rows.map(
        (legal) => legal.loanData.followerId,
      );
      const masterIds = legalData.rows.map(
        (legal) => legal?.userData?.masterId,
      );
      const mailTrackIds = legalData.rows.map((legal) => legal.mailTrackId);

      const additionalData: any = await this.getAllDataByLegal(
        kycIds,
        masterIds,
        loanIds,
        esignIds,
        followerIds,
        subscriptionId,
        mailTrackIds,
      );
      if (additionalData.message) return additionalData;
      const kycData = additionalData?.kycData ?? [];
      const masterData = additionalData?.masterData ?? [];
      const disbursementData = additionalData?.disbursementData ?? [];
      const esignData = additionalData?.esignData ?? [];
      const followerData = additionalData.followerData ?? [];
      const subscriptionData = additionalData.subscriptionData ?? [];
      const mailTrackData = additionalData.mailTrackData ?? [];

      let emiData = await this.getEmiData(loanIds, true);
      let needPaid = [CASE_WITHDRAWAL, CASE_DISPOSAL, PAID_LEGAL];
      const transactions = await this.getTransactionData(
        loanIds,
        null,
        true,
        needPaid.includes(+type) ? true : false,
      );
      if (transactions.message) return kInternalError;
      legalData.rows = legalData.rows.map((ele) => {
        return this.legalFormateService.mapLegalWiseData(
          ele,
          kycData,
          masterData,
          advocateData,
          disbursementData,
          transactions,
          esignData,
          followerData,
          subscriptionData,
          mailTrackData,
        );
      });

      legalData.rows = this.appendCityAndPincode(legalData.rows);
      const finalData: any = await this.legalFormateService.prepareAllLegalData(
        legalData.rows,
        +type,
        emiData,
        isAdvocate,
      );
      //return if any error occurs
      if (finalData.message) return finalData;
      legalData.rows = finalData;
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  appendCityAndPincode(data) {
    try {
      let finalData = [];
      for (let i = 0; i < data.length; i++) {
        let legal = data[i];
        try {
          let userData = legal.userData;
          let kycData = userData.kycData;
          let aadhaarAddress = kycData?.aadhaarAddress ?? '';
          let pincode = kycData?.pincode ?? '-';
          try {
            aadhaarAddress = JSON.parse(aadhaarAddress);
          } catch (err) {}
          //aadhaar formate
          let address =
            typeof aadhaarAddress == 'string'
              ? aadhaarAddress
              : this.typeService.addressFormat(aadhaarAddress);
          let city = aadhaarAddress?.dist ?? aadhaarAddress?.subdist ?? '';
          let state = aadhaarAddress?.state;
          legal.city = city;
          legal.state = state;
          legal.pincode = pincode;
          legal.address = address;
          finalData.push(legal);
        } catch (error) {
          finalData.push(legal);
        }
      }
      return finalData;
    } catch (error) {
      return data;
    }
  }

  async getAllDataByLegal(
    kycIds,
    masterIds,
    loanIds,
    esignIds,
    followerIds,
    subIds,
    mailTrackIds,
  ) {
    try {
      const kycData = await this.kycRepo.getTableWhereData(
        ['id', 'panCardNumber', 'aadhaarAddress', 'pincode'],
        { where: { id: kycIds } },
      );
      if (kycData == k500Error) return kInternalError;

      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['id', 'email', 'status'],
        required: false,
      };
      const masterData = await this.masterRepo.getTableWhereData(
        ['id', 'workMailId'],
        { where: { id: masterIds }, include: [workMailInclude] },
      );
      if (masterData == k500Error) return kInternalError;
      const esignData = await this.esignRepo.getTableWhereData(
        ['id', 'loanId', 'signed_document_upload'],
        { where: { id: esignIds, status: '1' } },
      );
      if (esignData == k500Error) return kInternalError;
      const followerData = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        { where: { id: followerIds } },
      );
      if (followerData == k500Error) return kInternalError;
      const disbursementData = await this.disburementRepo.getTableWhereData(
        [
          'id',
          'account_number',
          'bank_name',
          'ifsc',
          'utr',
          'mode',
          'amount',
          'source',
          'loanId',
        ],
        {
          where: {
            loanId: loanIds,
            utr: { [Op.ne]: null },
            status: 'processed',
          },
        },
      );
      if (disbursementData == k500Error) return kInternalError;
      const subscriptionData = await this.subScriptionRepo.getTableWhereData(
        ['id', 'mode'],
        { where: { id: subIds } },
      );
      if (subscriptionData == k500Error) return kInternalError;
      const mailTrackData = await this.mailTrackerRepo.getTableWhereData(
        ['id', 'refrenceId'],
        { where: { id: mailTrackIds } },
      );
      if (mailTrackData == k500Error) return kInternalError;

      return {
        kycData,
        masterData,
        disbursementData,
        esignData,
        followerData,
        subscriptionData,
        mailTrackData,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funCheckLegalAssingToCollection(passData: any = {}) {
    try {
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const loanInclude = includes.loanInclude;
      const emiInclude = includes.emiInclude;

      loanInclude.include = [emiInclude];
      loanInclude.where = { loanStatus: 'Active' };
      const options: any = {
        where: {
          otherDetails: {
            isAssign: { [Op.or]: [-1, null] },
            isHistory: { [Op.or]: [-1, null] },
          },

          type: { [Op.or]: [LEGAL_STATUS, CASE_TOBE_FILE, CASE_INPROGRESS] },
        },
        include: [loanInclude],
      };
      if (passData.loanId) options.where.loanId = passData.loanId;
      let legalData: any = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails'],
        options,
      );

      if (legalData == k500Error) return kInternalError;
      const loanIds = legalData.map((legal) => legal.loanId);
      if (loanIds.length === 0 || !loanIds) return;

      const transaction = await this.getTransactionData(
        loanIds,
        null,
        false,
        true,
      );
      if (transaction.message) return kInternalError;
      legalData = legalData.map((legal) => {
        legal.loanData.transactionData = transaction.filter(
          (tran) => tran.loanId == legal.loanId,
        );
        return legal;
      });

      for (let i = 0; i < legalData.length; i++) {
        try {
          const legal = legalData[i];
          const loanId = legal?.loanId;
          const isCaseAssingToCollection =
            await this.commonSharedService.calcuLoanRepayment(loanId);

          if (isCaseAssingToCollection)
            await this.funAssingedToCollection({ legalId: legal.id });
        } catch (error) {}
      }
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funChangeAdvocate(body) {
    try {
      let advocateId = body.advocateId;
      let legalId = body?.legalId;
      let adminId = body?.adminId;
      if (!legalId || !advocateId || !adminId) return kParamsMissing;
      //check legal is present or not
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'userId'],
        {
          where: {
            id: legalId,
            type: { [Op.or]: [LEGAL_STATUS, CASE_TOBE_FILE] },
          },
        },
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const adminData: any =
        await this.sharedAssingService.fetchAdminAccordingRole(advocate_role);
      if (!adminData) return kInternalError;
      const isExits = adminData.includes(+advocateId);
      if (!isExits) return k422ErrorMessage('Admin is not ' + advocate_role);
      const legalIds = legalData.map((ele) => ele.id);
      const loanIds = legalData.map((ele) => ele.loanId);
      //update advocate to all legal
      const updateLegal = await this.legalCollectionRepo.updateRowData(
        { advocateId: advocateId },
        legalIds,
      );
      if (updateLegal == k500Error)
        return k422ErrorMessage('Admin not changed!');
      await this.loanRepo.updateRowData({ advocateId: adminId }, loanIds);
      // prepare data to store in user activity
      const userActivityData = legalData.map((item) => ({
        userId: item.userId,
        loanId: item.loanId,
        type: 'CHANGE_ADVOCATE',
        date: this.typeService.getGlobalDate(new Date()),
        respons: JSON.stringify({
          adminId: +adminId,
          legalId: +item.id,
          advocateId: +advocateId,
        }),
      }));
      const activity = await this.userActivityRepo.bulkCreate(userActivityData);
      if (activity === k500Error) return kInternalError;

      return updateLegal;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funMoveToCaseToBeFile(body) {
    try {
      const type = body?.type;
      const adminId = body?.adminId;
      const loanIds = body?.loanIds ?? [];
      if (type == 'MANUAL' && loanIds.length == 0)
        return kParamMissing('loanIds');
      if (type == 'MANUAL' && !adminId) return kParamMissing('adminId');
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      loanInclude.where = { loanStatus: 'Active' };
      let today: any = this.typeService.getGlobalDate(new Date());
      //check legal sent date diffrence 15 days or not
      today.setDate(today.getDate() - CASE_TOBE_FILE_DAYS);
      today = today.getTime();
      let successStatus = [2, 3, 6];
      const options: any = {
        where: {
          sentType: {
            [Op.or]: [
              { email: { [Op.or]: successStatus } },
              { workMail: { [Op.or]: successStatus } },
            ],
          },
          type: LEGAL_STATUS,
          otherDetails: {
            isAssign: { [Op.or]: [-1, null] },
            isHistory: { [Op.or]: [-1, null] },
          },
          [Op.and]: [
            Sequelize.literal(
              `(CAST(("LegalCollectionEntity"."dates"#>>'{sendEmail}') AS DOUBLE PRECISION) != -1
                and CAST(("LegalCollectionEntity"."dates"#>>'{sendEmail}') AS DOUBLE PRECISION) <= ${today}) or
                 (CAST(("LegalCollectionEntity"."dates"#>>'{sendWorkMail}') AS DOUBLE PRECISION) != -1
                and CAST(("LegalCollectionEntity"."dates"#>>'{sendWorkMail}') AS DOUBLE PRECISION) <= ${today})`,
            ),
          ],
        },
        include: [loanInclude],
      };
      if (type == 'MANUAL') {
        options.where = {
          type: LEGAL_STATUS,
          otherDetails: {
            isAssign: { [Op.or]: [-1, null] },
            isHistory: { [Op.or]: [-1, null] },
          },
          loanId: loanIds,
        };
      }
      //get all legal data
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails'],
        options,
      );

      //moving case tobe file from legal
      if (legalData === k500Error) return kInternalError;
      //move legal to next step
      await this.moveLegalNextStep(legalData, CASE_TOBE_FILE, adminId);
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // just for developer use only
  async moveToCaseToBeFileDEV(body) {
    try {
      const loanIds = body?.loanIds ?? [];
      if (loanIds.length == 0) return {};
      if (!gIsPROD) return {};
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      loanInclude.where = { loanStatus: 'Active' };
      const options = {
        where: {
          type: LEGAL_STATUS,
          otherDetails: {
            isAssign: { [Op.or]: [-1, null] },
            isHistory: { [Op.or]: [-1, null] },
          },
          loanId: loanIds,
        },
        include: [loanInclude],
      };
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails'],
        options,
      );
      if (legalData === k500Error) return kInternalError;
      //moving case tobe file from legal
      return this.moveLegalNextStep(legalData, CASE_TOBE_FILE);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funMoveToProgress(body) {
    try {
      const legalIds = body?.legalIds;
      const adminId = body?.adminId;
      if (!legalIds) return kParamMissing('legalIds');
      if (!adminId) return kParamMissing('adminId');
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      loanInclude.where = { loanStatus: 'Active' };
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails'],
        {
          where: {
            id: legalIds,
            type: CASE_TOBE_FILE,
            otherDetails: {
              isHistory: { [Op.or]: [-1, null] },
              isAssign: { [Op.or]: [-1, null] },
            },
          },
          include: [loanInclude],
        },
      );
      if (legalData == k500Error) return kInternalError;
      return await this.moveLegalNextStep(legalData, CASE_INPROGRESS, adminId);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async moveLegalNextStep(legalData, type, adminId = SYSTEM_ADMIN_ID) {
    try {
      for (let i = 0; i < legalData.length; i++) {
        try {
          const legal = legalData[i];
          let createData = {
            type,
            adminId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await this.createAndUpdateNewLegal(createData, legal);
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async createAndUpdateNewLegal(
    createData,
    legalData,
    isAssignTrue = false,
    isMigrate = false,
    historyReason?,
  ) {
    try {
      if (!legalData) {
        legalData = await this.legalCollectionRepo.getRowWhereData(
          ['id', 'otherDetails', 'loanId'],
          { where: { loanId: createData.loanId }, order: [['id', 'DESC']] },
        );
        if (legalData == k500Error) return {};
      }

      // create legal data
      const otherDetails = legalData?.otherDetails ?? {};
      const oldId = legalData?.id;
      const newCreated = oldId
        ? await this.legalCollectionRepo.createRowDataWithCopy(
            createData,
            legalData.id,
          )
        : await this.legalCollectionRepo.create(createData);
      if (!newCreated || newCreated == k500Error) return kInternalError;
      otherDetails.isHistory = 1;
      if (historyReason) otherDetails.historyReason = historyReason;
      if (isAssignTrue) otherDetails.isAssign = 1;

      //update old legal as history
      if (oldId)
        await this.legalCollectionRepo.updateRowData({ otherDetails }, oldId);
      const loanId = createData?.loanId ?? legalData.loanId;

      //update new legal in loan
      if (loanId)
        await this.loanRepo.updateRowData(
          { legalId: newCreated.id, legalType: createData.type },
          loanId,
        );
      // send mail to summons
      const mailSentTo = [SUMMONS, WARRENT, CASE_FILLED];
      if (mailSentTo.includes(+newCreated.type) && !isMigrate) {
        //notifyUser
        let ids = [newCreated.id];
        let noticeType = newCreated.type;
        await this.caseFilledNotifyUser(ids, noticeType);
        await this.sendNoticeToUser({
          isSentWorkMail: true,
          ids: ids,
          noticeType: noticeType,
        });
      }
      return newCreated;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funPlaceAutodebitAfterCase() {
    try {
      let today: any = this.typeService.getGlobalDate(new Date());
      //check case in progress createdAt date 30+ days then move into place autodebit
      today.setDate(today.getDate() - CASE_INPROGRESS_DAYS);
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      loanInclude.where = { loanStatus: 'Active' };
      const options = {
        where: {
          type: CASE_TOBE_FILE,
          otherDetails: {
            isHistory: { [Op.or]: [-1, null] },
            isAssign: { [Op.or]: [-1, null] },
          },
          createdAt: { [Op.lt]: today.toJSON() },
        },
        include: [loanInclude],
      };
      const legalData: any = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails'],
        options,
      );
      if (legalData == k500Error) return kInternalError;
      for (let i = 0; i < legalData.length; i++) {
        try {
          const legal = legalData[i];
          const placed: any = await this.placeRemainingAutoDebit([
            legal.loanId,
          ]);
          if (placed?.message || placed?.length == 0) continue;

          const otherDetails = { ...(legal?.otherDetails ?? {}) };
          otherDetails.isHistory = 1;
          if (placed.includes(legal.loanId)) {
            await this.legalCollectionRepo.updateRowData(
              { otherDetails },
              legal.id,
            );
          }
        } catch (error) {}
      }
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funAutoDebitList(query) {
    try {
      let startDate = query?.startDate ?? new Date();
      let endDate = query?.endDate ?? new Date();
      const page = query?.page ?? 1;
      const download = query.download ?? 'false';
      const searchText = query?.searchText;
      const isCount = query?.isCount ?? 'false';
      //date filter convert into global
      startDate = this.typeService.getGlobalDate(startDate);
      endDate = this.typeService.getGlobalDate(endDate);
      const userInclude: any = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'phone'],
      };
      let legalWhere: any = {};
      if (searchText) {
        let encryptedData = '';
        const firstTwoLetters = searchText.substring(0, 2).toLowerCase();
        const restOfString: any = searchText.substring(2);
        if (firstTwoLetters == 'l-' || firstTwoLetters == 'L-')
          legalWhere.loanId = +restOfString;
        else if (!isNaN(searchText)) {
          encryptedData = await this.cryptService.encryptPhone(searchText);
          encryptedData = encryptedData.split('===')[1];
          userInclude.where = {
            phone: { [Op.iRegexp]: encryptedData },
          };
        } else
          userInclude.where = {
            fullName: { [Op.iRegexp]: searchText },
          };
      }
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return includes;
      const loanInclude = includes.loanInclude;
      const disburesementInclude = includes.disbursementInclude;
      loanInclude.where = { loanStatus: 'Active' };
      // loanInclude.required = true;
      const subscriptionInclude = {
        model: SubScriptionEntity,
        attributes: ['id', 'mode'],
      };
      loanInclude.include = [disburesementInclude, subscriptionInclude];
      const include = [userInclude, loanInclude];

      //query options
      const options: any = {
        where: {
          ...legalWhere,
          status: 'INITIALIZED',
          adminId: SYSTEM_ADMIN_ID,
          type: 'FULLPAY',
          [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
          subscriptionDate: {
            [Op.gte]: startDate.toJSON(),
            [Op.lte]: endDate.toJSON(),
          },
        },
        order: [['id']],
        include,
      };
      if (isCount == 'true') {
        const autodebitCount = await this.transactionRepo.getCountsWhere(
          options,
        );
        if (autodebitCount == k500Error) return kInternalError;
        return { count: autodebitCount };
      }
      if (download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      const attributes = [
        'loanId',
        'status',
        'subscriptionDate',
        'type',
        'paidAmount',
        'subSource',
        'source',
        'adminId',
      ];
      const data: any = await this.transactionRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (data == k500Error) return kInternalError;
      const loanIds = data.rows.map((ele) => ele.loanId);
      const adminIds: any = [...new Set(data.rows.map((ele) => ele?.adminId))];
      const adminData = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        { where: { id: adminIds } },
      );
      if (adminData == k500Error) return kInternalError;
      const emiData: any = await this.getEmiData(loanIds);
      if (emiData.message) return emiData;
      const finalData = data.rows.map((ele) => {
        //get loan emis
        const emi = emiData.filter((emi) => emi.loanId == ele.loanId);
        const admin = adminData.find((adm) => adm.id == ele.adminId);
        ele.adminData = admin ?? null;
        return this.legalFormateService.prepareAutodebitData(ele, emi);
      });
      return { count: data.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getEmiData(loanIds, neeAll = false) {
    try {
      let options: any = {
        where: {
          loanId: loanIds,
        },
      };

      const emiData: any = await this.emiRepo.getTableWhereData(
        [
          'id',
          'emi_amount',
          'penalty',
          'penalty_days',
          'emi_date',
          'payment_due_status',
          'payment_status',
          'loanId',
          'principalCovered',
          'interestCalculate',
          'pay_type',
          'emiNumber',
          'fullPayPrincipal',
          'fullPayInterest',
          'fullPayPenalty',
        ],
        options,
      );
      if (emiData == k500Error) return kInternalError;
      return emiData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funFillingInProgress(body) {
    try {
      const id = body?.id;
      const isEdite = body?.isEdite ?? false;
      const ccNumber = body?.ccNumber;
      const crNumber = body?.crNumber;
      const crReason = body?.crReason;
      const courtName = body?.courtName;
      const courtNumber = body?.courtNumber;
      let caseFiledDate = body?.caseFiledDate;
      let crHearingDate = body?.crHearingDate;
      let firstHearingDate = body?.firstHearingDate;
      let complainantId = body?.complainantId;
      let adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      if (
        !id ||
        (isEdite && !ccNumber && !crNumber) ||
        (!isEdite &&
          (!courtName || !courtNumber || !complainantId || !caseFiledDate))
      )
        return kParamsMissing;
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      loanInclude.where = { loanStatus: 'Active' };
      let options = {
        where: {
          id,
          type: isEdite ? CASE_FILLED : CASE_INPROGRESS,
          otherDetails: {
            isHistory: { [Op.or]: [-1, null] },
            isAssign: { [Op.or]: [-1, null] },
          },
        },
        include: [loanInclude],
      };
      const legalData = await this.legalCollectionRepo.getRowWhereData(
        ['id', 'loanId', 'caseDetails', 'otherDetails'],
        options,
      );
      let caseFilled = {};
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const caseDetails = legalData?.caseDetails ?? {};
      let complainantName;
      if (complainantId) {
        const adminData = await this.adminRepo.getRoweData(['id', 'fullName'], {
          where: { id: complainantId },
        });

        if (!adminData || adminData == k500Error)
          return k422ErrorMessage('Complainant not found!');
        complainantName = adminData.fullName;
        caseDetails.complainantName = complainantName;
        complainantId = adminData.id;
      }
      if (isEdite || (!ccNumber && !crNumber)) {
        return await this.updateCaseDetails(caseDetails, body, legalData.id);
      } else {
        crHearingDate = crHearingDate
          ? this.typeService.getGlobalDate(crHearingDate)?.getTime()
          : '';
        firstHearingDate = firstHearingDate
          ? this.typeService.getGlobalDate(firstHearingDate)?.getTime()
          : '';
        caseFiledDate = caseFiledDate
          ? this.typeService.getGlobalDate(caseFiledDate)?.getTime()
          : '';
        caseDetails.ccNumber = ccNumber;
        caseDetails.crNumber = crNumber;
        caseDetails.crReason = crReason;
        caseDetails.courtName = courtName;
        caseDetails.courtNumber = courtNumber;
        caseDetails.crHearingDate = crHearingDate;
        caseDetails.firstHearingDate = firstHearingDate;
        caseDetails.complainantId = complainantId;
        caseDetails.complainantName = complainantName;
        caseDetails.caseFiledDate = caseFiledDate;
        const passData: any = {
          type: CASE_FILLED,
          createdAt: new Date(),
          updatedAt: new Date(),
          caseDetails,
          adminId,
        };
        caseFilled = await this.createAndUpdateNewLegal(passData, legalData);
        if (!caseFilled || caseFilled == k500Error)
          return k422ErrorMessage('Case not created!');
      }
      return caseFilled;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateCaseDetails(caseDetails, updatedData, id) {
    try {
      updatedData.crHearingDate = updatedData?.crHearingDate
        ? this.typeService.getGlobalDate(updatedData.crHearingDate)?.getTime()
        : '';
      updatedData.firstHearingDate = updatedData.firstHearingDate
        ? this.typeService
            .getGlobalDate(updatedData.firstHearingDate)
            ?.getTime()
        : '';
      updatedData.caseFiledDate = updatedData.caseFiledDate
        ? this.typeService.getGlobalDate(updatedData.caseFiledDate)?.getTime()
        : '';
      caseDetails.ccNumber = updatedData?.ccNumber ?? caseDetails?.ccNumber;
      caseDetails.crNumber = updatedData?.crNumber ?? caseDetails?.crNumber;
      caseDetails.crReason = updatedData?.crReason ?? caseDetails?.crReason;
      caseDetails.courtName = updatedData?.courtName ?? caseDetails?.courtName;
      caseDetails.courtNumber =
        updatedData?.courtNumber ?? caseDetails?.courtNumber;
      caseDetails.crHearingDate =
        updatedData?.crHearingDate ?? caseDetails?.crHearingDate;
      caseDetails.firstHearingDate =
        updatedData?.firstHearingDate ?? caseDetails?.firstHearingDate;
      caseDetails.caseFiledDate =
        updatedData?.caseFiledDate ?? caseDetails?.caseFiledDate;

      caseDetails.complainantId =
        updatedData?.complainantId ?? caseDetails?.complainantId;
      caseDetails.complainantName =
        updatedData?.complainantName ?? caseDetails?.complainantName;
      const adminId = updatedData.adminId;
      const caseFilled = await this.legalCollectionRepo.updateRowData(
        { caseDetails, adminId },
        id,
      );
      if (!caseFilled || caseFilled == k500Error)
        return k422ErrorMessage('Case not updated!');
      return caseFilled;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async legalCloseLegalAndCloseLoan(data) {
    try {
      let loanIds = data?.loanIds;
      if (!loanIds) return kParamsMissing;
      const competedLoans = await this.loanRepo.getTableWhereData(
        ['id', 'loanStatus'],
        {
          where: {
            id: loanIds,
            loanStatus: 'Complete',
            followerId: { [Op.ne]: null },
          },
        },
      );
      if (competedLoans == k500Error) return kInternalError;
      loanIds = competedLoans.map((ele) => ele.id);

      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'otherDetails', 'caseDetails', 'advocateId', 'type'],
        {
          where: {
            loanId: loanIds,
            type: {
              [Op.notIn]: [PAID_LEGAL, CASE_WITHDRAWAL, CASE_DISPOSAL],
            },
            otherDetails: {
              isHistory: { [Op.or]: [-1, null] },
              isAssign: { [Op.or]: [-1, null] },
            },
          },
        },
      );
      if (legalData == k500Error) return kInternalError;
      let caseFilled = [CASE_FILLED, SUMMONS, WARRENT];
      const advocateData =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      if (advocateData == k500Error) return kInternalError;
      else if (!advocateData)
        return k422ErrorMessage(`${advocate_role} not found!`);
      for (let i = 0; i < legalData.length; i++) {
        try {
          const legal = legalData[i];
          const loanId = legal.loanId;
          const advocate = advocateData.find(
            (ele) => ele.id == legal.advocateId,
          );
          let passData: any = {
            adminId: SYSTEM_ADMIN_ID,
            type: PAID_LEGAL,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          if (caseFilled.includes(+legal.type)) passData.type = CASE_WITHDRAWAL;
          await this.createAndUpdateNewLegal(passData, legal);
          if (caseFilled.includes(+legal.type) && advocate && !data?.isMigrate)
            await this.notifyAdvocateForClose(loanId, advocate);
        } catch (error) {}
      }
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async notifyAdvocateForClose(loanId, admin) {
    try {
      if (!admin) return {};
      const includes: any = this.legalAdditionalIncludes();
      const userInclude = includes.userInclude;
      const loanData = await this.loanRepo.getRowWhereData(
        ['id', 'loanStatus', 'appType'],
        { where: { id: loanId }, include: [userInclude] },
      );
      if (!loanData || loanData == k500Error) return kInternalError;
      const userData = loanData.registeredUsers;
      const fullName = userData.fullName;
      const phone = this.cryptService.decryptPhone(userData.phone);
      let customerDetails = `(${fullName})(${phone})`;
      const adminNumber = gIsPROD
        ? this.cryptService.decryptText(admin?.phone)
        : UAT_PHONE_NUMBER[3];
      // const appType = loanData?.appType;
      const appType = +templateDesign;
      await this.allSmsService.sendSMS(adminNumber, MSG91, {
        smsId:
          appType == 1
            ? kMsg91Templates.paidLegalSmsId
            : kLspMsg91Templates.paidLegalSmsId, //put legal notification to advocate for close legal
        number: customerDetails,
        loanId,
        appType,
      });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async addConsignmentNumber(body) {
    try {
      const legalId = body.legalId;
      const consignmentNo = body?.consignmentNo;
      const addressType = body?.addressType;
      const manualAddress = body?.manualAddress;
      const createdBy = body?.createdBy;
      if (!legalId || !consignmentNo || !addressType || !createdBy)
        return kParamsMissing;
      const firstmatch = consignmentNo.substring(0, 2);
      const endMatch = consignmentNo.substr(-2);
      const numberOnly = +consignmentNo.substring(2, 11);
      //validate consignment number
      if (
        consignmentNo.length != 13 ||
        firstmatch != 'RG' ||
        endMatch != 'IN' ||
        !Number.isInteger(numberOnly)
      ) {
        return k422ErrorMessage('consignment number not valid');
      }
      //check legal data present or not
      const legalData = await this.legalCollectionRepo.getRowWhereData(
        ['id', 'type', 'sentType', 'dates'],
        { where: { id: legalId, type: LEGAL_STATUS } },
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const passData: any = {
        legalCollectionId: legalId,
        consignmentNo,
        addressType,
        manualAddress,
        createdBy,
        legalId: null,
      };
      //check if consignment numbe already present or not
      const attributes = ['id'];
      const options = {
        where: { consignmentNo: consignmentNo, legalCollectionId: legalId },
      };
      const checkConsignmentNo =
        await this.legalConsignmentRepo.getRowWhereData(attributes, options);
      if (checkConsignmentNo)
        return k422ErrorMessage('Consignment already used!');
      //check address
      if (addressType == 'OTHER' && !manualAddress)
        return {
          valid: false,
          message: 'Enter manual address!',
        };
      //set default update -7 hourse so that tracking can start instant
      const previousDate = new Date();
      previousDate.setHours(previousDate.getHours() - 7);
      passData.lastResponseDate = previousDate;
      const data = await this.legalConsignmentRepo.create(passData);
      let sentType = legalData?.sentType ?? {};
      let dates = legalData?.dates ?? {};
      if (!data || data == k500Error)
        return k422ErrorMessage('Consignment number not created!');
      sentType.physical = 1;
      if (!dates?.physical) dates.physical = new Date().getTime();
      await this.legalCollectionRepo.updateRowData(
        { trackId: data.id, sentType, dates },
        legalData.id,
      );
      return data;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetLegalbyLoanId(query) {
    try {
      const loanId = query.loanId;
      const type = query.type;
      if (!loanId) return kParamMissing('loanId');
      else if (!type) return kParamMissing('type');

      let legalData: any = await this.legalCollectionRepo.getTableWhereData(
        [
          'id',
          'url',
          'sentType',
          'trackId',
          'adminId',
          'dates',
          'sentBy',
          'createdAt',
        ],
        {
          where: {
            loanId,
            type: +type,
          },
          order: [['id', 'DESC']],
        },
      );
      if (legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const adminArr = legalData.map((legal) => [
        ...Object.values(legal?.sentBy ?? {}),
        legal.adminId,
      ]);
      let adminIds = [];
      adminArr.forEach((element) => {
        adminIds.push(...element);
      });
      const adminData: any = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        {
          where: { id: adminIds },
        },
      );
      if (adminData == k500Error) return kInternalError;
      legalData = legalData.map((legal) => {
        let emailAdmin = adminData.find(
          (admin) => admin.id == legal?.sentBy?.emailAdminId ?? null,
        );
        let workMailAdmin = adminData.find(
          (admin) => admin.id == legal?.sentBy?.workMailAdminId ?? null,
        );
        let physicalAdmin = adminData.find(
          (admin) => admin.id == legal?.sentBy?.physicalAdminId ?? null,
        );
        let whatsappAdmin = adminData.find(
          (admin) => admin.id == legal?.sentBy?.whatsAppAdminId ?? null,
        );
        let createAdmin = adminData.find((admin) => admin.id == legal?.adminId);

        let passData = {};
        const sentObj = this.legalFormateService.checkAllSentTypes(
          legal.sentType,
        );
        passData['id'] = legal.id;
        passData['Create date'] = this.typeService.getDateFormatted(
          legal.createdAt,
        );
        passData['Creator name'] = createAdmin?.fullName ?? '-';
        let letterColum = 'Legal notice';
        if (type == DEMAND_STATUS) letterColum = 'Demand letter';
        else if (type == SUMMONS) letterColum = 'Summons';
        else if (type == WARRENT) letterColum = 'Warrent';
        passData[letterColum] = legal.url;
        passData['Sent on email'] = sentObj.email;
        passData['Email admin'] = emailAdmin?.fullName ?? '-';
        passData['Sent on work mail'] = sentObj.workMail;
        passData['Work mail admin'] = workMailAdmin?.fullName ?? '-';
        passData['Sent on physical'] = sentObj.physical;
        passData['Physical admin'] = physicalAdmin?.fullName ?? '-';
        passData['Sent on whatsapp'] = sentObj.whatsApp;
        passData['Whatsapp admin'] = whatsappAdmin?.fullName ?? '-';
        return passData;
      });
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetTrackingData(query) {
    try {
      const legalId = query.legalId;
      if (!legalId) return kParamMissing('legalId');
      const attr = [
        'id',
        'consignmentNo',
        'lastResponseDate',
        'status',
        'createdAt',
        'legalNoticeTrackResponse',
        'addressType',
        'manualAddress',
      ];
      const options = { where: { legalCollectionId: legalId }, order: ['id'] };
      const trackingData =
        await this.legalConsignmentRepo.getTableWhereDataWithCounts(
          attr,
          options,
        );
      if (trackingData == k500Error)
        return k422ErrorMessage('Tracking data not found!');
      let finalData = [];
      for (let i = 0; i < trackingData.rows.length; i++) {
        try {
          const element: any = trackingData.rows[i];
          let response = element?.legalNoticeTrackResponse
            ? JSON.parse(element.legalNoticeTrackResponse)
            : null;
          delete element.legalNoticeTrackResponse;
          element.response = response?.data ?? [];
          finalData.push(element);
        } catch (error) {}
      }
      return { count: trackingData.count, rows: finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funUploadSummons(body) {
    try {
      body.legalType = SUMMONS;
      const createdData: any = await this.funUploadCommonLegal(body);
      if (createdData.message) return createdData;
      return createdData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funUploadWarrent(body) {
    try {
      body.legalType = WARRENT;
      const createdData: any = await this.funUploadCommonLegal(body, true);
      if (createdData.message) return createdData;

      return createdData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funUploadCommonLegal(body, NOTIFICATION = false) {
    try {
      const id = body.id;
      const url = body?.url;
      const adminId = body?.adminId;
      const isCourt = body?.isCourt ?? false;
      let issueDate = body?.issueDate;
      let receivedDate = body?.receivedDate;
      let nextHearingDate = body?.nextHearingDate;
      let legalType = body?.legalType;
      if (!id) return kParamMissing('id');
      if (!adminId) return kParamMissing('adminId');
      if (!url) return kParamMissing('url');
      if (!receivedDate) return kParamMissing('receivedDate');
      if (!issueDate) return kParamMissing('issueDate');
      if (!legalType) return kParamMissing('legalType');
      // case should be filled and re-summons upload
      let typeWhere: any = {};
      if (legalType == SUMMONS) typeWhere = { [Op.or]: [CASE_FILLED, SUMMONS] };
      else if (legalType == WARRENT)
        typeWhere = { [Op.or]: [SUMMONS, WARRENT] };
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      const userInclude = includes.userInclude;
      loanInclude.where = { loanStatus: 'Active' };
      const legalData = await this.legalCollectionRepo.getRowWhereData(
        [
          'id',
          'otherDetails',
          'dates',
          'url',
          'adminId',
          'loanId',
          'type',
          'caseDetails',
          'sentType',
          'userId',
        ],
        {
          where: {
            id,
            type: typeWhere,
            otherDetails: {
              [Op.and]: [
                { isAssign: { [Op.or]: [-1, null] } },
                { isHistory: { [Op.or]: [-1, null] } },
              ],
            },
          },
          include: [loanInclude, userInclude],
        },
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal not found!');
      const dates = legalData?.dates;
      const sentType = legalData?.sentType;
      const otherDetails = legalData?.otherDetails ?? {};
      let createOther = { ...otherDetails };
      let count = 0;
      if (legalType == WARRENT && legalData.type == SUMMONS) count = 0;
      else count = otherDetails?.subType ?? 0;
      createOther.subType = count + 1;
      if (isCourt) createOther.isCourt = isCourt;
      sentType.email = -1;
      sentType.workMail = -1;
      sentType.physical = -1;
      dates.email = -1;
      dates.workMail = -1;
      dates.physical = -1;
      dates.sendEmail = -1;
      dates.sendWorkMail = -1;
      //update recived date and next hearing date
      dates.recivedDate = new Date(receivedDate).getTime();
      if (legalData.type == CASE_FILLED && legalType == SUMMONS)
        nextHearingDate = legalData.caseDetails?.firstHearingDate;
      else if (legalData.type == SUMMONS && legalType == WARRENT)
        nextHearingDate = nextHearingDate
          ? new Date(nextHearingDate).getTime()
          : dates?.nextHearingDate;
      else nextHearingDate = new Date(nextHearingDate).getTime();
      if (!nextHearingDate) return kParamMissing('nextHearingDate');
      dates.nextHearingDate = nextHearingDate;
      dates.issueDate = new Date(issueDate).getTime();
      const createData = {
        createdAt: new Date(),
        updatedAt: new Date(),
        url: url,
        adminId: adminId ?? SYSTEM_ADMIN_ID,
        dates,
        sentType,
        type: +legalType,
        otherDetails: createOther,
      };

      if (NOTIFICATION) {
        const fullName = legalData?.userData.fullName ?? 'Customer';
        const userId = legalData?.userData?.id ?? '-';
        const title = 'Bailable warrant is issued.';
        const content = `Dear ${fullName}, We regret to inform you that due to non-adherence to the court's order related to your first hearing date, a bailable warrant has been issued by the court. Please get in touch with our legal team to discuss more on this at ${LEGAL_NUMBER}.`;

        const smsOptions = {};
        const appType = legalData?.loanData?.appType;
        const smsData: any = kMsg91Templates[kMsg91Templates.LegalWarrants];
        const varOptions = smsData.varOptions ?? [];
        for (let index = 0; index < varOptions.length; index++) {
          try {
            const el = varOptions[index];
            const key = el.key;
            const title = el.title;
            if (key && title) {
              if (title == '##LEGAL_WARRENT##')
                smsOptions[key] = 'Legal Warrent';
              if (title == '##LEGAL_NUMBER##') smsOptions[key] = LEGAL_NUMBER;
            }
          } catch (error) {}
        }
        const userData = [];
        userData.push({ userId, appType });
        const body = {
          userData,
          content,
          title,
          isMsgSent: true,
          smsId: kMsg91Templates.LegalWarrants,
          smsOptions,
          id: 488,
        };
        this.sharedNotificationService.sendNotificationToUser(body);
      }
      const dataCreated: any = await this.createAndUpdateNewLegal(
        createData,
        legalData,
      );
      if (!dataCreated || dataCreated == k500Error)
        return k422ErrorMessage('Data not created');
      return dataCreated;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetcomplaintList(query) {
    try {
      const complainantData: any = await this.staticConfig.getRowWhereData(
        ['id', 'data'],
        { where: { type: COMPLAINANT } },
      );
      if (query.isAdd == 'true' && query.adminIds) {
        let adminIds = JSON.parse(query.adminIds);
        const exitingAdminIds = complainantData?.data ?? [];
        adminIds = [...new Set([...adminIds, ...exitingAdminIds])];
        if (!complainantData)
          await this.staticConfig.createRowWhereData({
            type: COMPLAINANT,
            data: adminIds,
          });
        else
          await this.staticConfig.updateRowData(
            {
              type: COMPLAINANT,
              data: adminIds,
            },
            complainantData.id,
          );
        return adminIds;
      }
      if (!complainantData)
        return k422ErrorMessage('Complainant admins not found!');
      const adminIds = complainantData?.data ?? [];

      const adminData: any = await this.adminRepo.getTableWhereData(
        ['id', 'fullName', 'otherData'],
        { where: { id: adminIds } },
      );
      if (!adminData) return k422ErrorMessage('Complainant admins not found!');
      adminData.map((ele) => {
        if (ele?.otherData?.isDefaultComplainant) ele.isDefault = 1;
        delete ele.otherData;
        return ele;
      });
      adminData.sort((a, b) => (b?.isDefault ?? 0) - (a?.isDefault ?? 0));
      return adminData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funCaseWithdrawal(query) {
    try {
      const legalId = query?.legalId;
      const adminId = query?.adminId;
      if (!legalId) return kParamMissing('legalId');
      if (!adminId) return kParamMissing('adminId');
      const options = {
        where: {
          id: legalId,
          type: WARRENT,
          otherDetails: {
            [Op.and]: [
              { isAssign: { [Op.or]: [-1, null] } },
              { isHistory: { [Op.or]: [-1, null] } },
            ],
          },
        },
      };
      const legalData = await this.legalCollectionRepo.getRowWhereData(
        ['id', 'type', 'loanId', 'otherDetails'],
        options,
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const createData = {
        type: CASE_WITHDRAWAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId,
      };

      return await this.createAndUpdateNewLegal(createData, legalData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funCaseDisposal(body, type?) {
    try {
      const legalId = body?.legalId;
      const disposalDate = body?.disposalDate;
      const disposalReason = body?.disposalReason;
      const adminId = body?.adminId;
      if (!legalId) return kParamMissing('legalId');
      if (!adminId) return kParamMissing('adminId');
      if (!disposalDate) return kParamMissing('disposalDate');
      if (!disposalReason) return kParamMissing('disposalReason');
      const options: any = {
        where: {
          id: legalId,
          otherDetails: {
            [Op.and]: [
              { isAssign: { [Op.or]: [-1, null] } },
              { isHistory: { [Op.or]: [-1, null] } },
            ],
          },
          type: CASE_WITHDRAWAL,
        },
      };
      if (type == 'PAID_LEGAL')
        options.where = {
          id: legalId,
          type: {
            [Op.in]: [
              CASE_FILLED,
              SUMMONS,
              WARRENT,
              CASE_WITHDRAWAL,
              PAID_LEGAL,
              CASE_ASSIGN,
            ],
          },
        };

      const legalData = await this.legalCollectionRepo.getRowWhereData(
        ['id', 'type', 'loanId', 'caseDetails', 'otherDetails', 'dates'],
        options,
      );
      if (!legalData || legalData == k500Error)
        return k422ErrorMessage('Legal data not found!');
      const dates = legalData?.dates ?? {};
      const caseDetails = legalData.caseDetails ?? {};
      const otherDetails = legalData.otherDetails ?? {};
      dates.disposalDate = new Date(disposalDate).getTime();
      caseDetails.disposalReason = disposalReason;
      const createData: any = {
        type: CASE_DISPOSAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminId,
        dates,
        caseDetails,
      };
      if (type == 'PAID_LEGAL') {
        const othDt: any = { ...otherDetails };
        othDt.isHistory = -1;
        if (othDt?.historyReason) othDt.historyReason = '';
        createData.otherDetails = othDt;
      }
      return this.createAndUpdateNewLegal(createData, legalData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async caseDisposalViaFile(body) {
    try {
      const type = body?.type ?? '';
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing(adminId);
      const fileName = body?.fileName;
      if (!fileName) return kParamMissing('fileName');
      const fileListData: any = await this.fileService.excelToArray(
        fileName,
        {},
        true,
      );
      if (fileListData.message) return fileListData;
      else if (!fileListData) return kBadRequest;

      const columnName = fileListData?.columnName ?? [];
      const fileData = fileListData?.finalData ?? [];
      await this.fileService.removeFile(fileName);

      if (
        columnName.includes('Loan Id') &&
        columnName.includes('Case Disposed Date') &&
        columnName.includes('Reason')
      ) {
        const loanList = [...new Set(fileData?.map((item) => item['Loan Id']))];
        let options: any = {
          where: { loanId: loanList },
          order: [['id', 'DESC']],
        };

        // if type is coming then options is change
        if (type == 'PAID_LEGAL') {
          if (
            !columnName.includes('CC Number') ||
            !columnName.includes('CR Number')
          )
            return k422ErrorMessage(
              'Please enter CC Number or CR Number column name!',
            );
          const loanInclude = {
            model: loanTransaction,
            attributes: ['id', 'loanStatus'],
            where: { loanStatus: 'Complete' },
          };
          options.include = [loanInclude];
        } else {
          options.where = {
            type: CASE_WITHDRAWAL,
            otherDetails: {
              [Op.and]: [
                { isAssign: { [Op.or]: [-1, null] } },
                { isHistory: { [Op.or]: [-1, null] } },
              ],
            },
          };
        }

        const legalData = await this.legalCollectionRepo.getTableWhereData(
          ['id', 'userId', 'type', 'loanId', 'caseDetails'],
          options,
        );
        if (!legalData || !legalData.length || legalData === k500Error)
          return k422ErrorMessage('Legal data not found!');

        for (let i = 0; i < fileData.length; i++) {
          try {
            const ele = fileData[i];
            const loanId = ele['Loan Id'];
            const legal = legalData.find((f) => f?.loanId == loanId);
            const caseDetails = legal?.caseDetails ?? {};
            const legalDis = legalData.find(
              (f) => f?.loanId == loanId && f?.type == CASE_DISPOSAL,
            );
            if (type == 'PAID_LEGAL') {
              ele['CC Number'] =
                ele['CC Number'] && ele['CC Number'] != '-'
                  ? ele['CC Number']
                  : null;
              ele['CR Number'] =
                ele['CR Number'] && ele['CR Number'] != '-'
                  ? ele['CR Number']
                  : null;
            }
            if (
              legalDis ||
              (type == 'PAID_LEGAL' && !ele['CC Number'] && !ele['CR Number'])
            )
              continue;

            if (legal) {
              // update CC and CR number
              if (legal?.id)
                await this.updateLegalData(ele, caseDetails, type, legal);

              // Create -> System trace row data
              // 3 for paid legal and 4 for case withdrawl
              const statusType = type == 'PAID_LEGAL' ? 3 : 4;
              const sessionId: string = uuidv4();
              const logData = {
                sessionId,
                type: statusType,
                loanId: legal.loanId,
                userId: legal.userId,
                uniqueId: `TYPE=${statusType}=LOAN=${legal.loanId}`,
              };
              const trace = await this.repo.createRowData(
                SystemTraceEntity,
                logData,
              );
              if (trace === k500Error) continue;

              const disposalDate = new Date(ele['Case Disposed Date']);
              const data = {
                legalId: legal?.id,
                disposalDate,
                disposalReason: ele['Reason'] ?? 'Loan Completed',
                adminId,
              };
              await this.funCaseDisposal(data, type);
            }
          } catch (error) {}
        }
        return fileData;
      } else return k422ErrorMessage('Please enter proper column name!');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async updateLegalData(ele, caseDetails, type, legal) {
    try {
      if (type == 'PAID_LEGAL') {
        const ccNumber = ele['CC Number']
          ? ele['CC Number'].toString()
          : caseDetails?.ccNumber ?? '';

        const crNumber = ele['CR Number']
          ? ele['CR Number'].toString()
          : caseDetails?.crNumber ?? '';
        // update cc and cr number
        caseDetails.ccNumber = ccNumber;
        caseDetails.crNumber = crNumber;
        await this.legalCollectionRepo.updateRowData(
          { caseDetails },
          legal?.id,
        );
      }
    } catch (error) {}
  }

  async funGetAllLegalCount(query) {
    try {
      const today = new Date();
      const adminId = query?.adminId;
      const range = this.typeService.getUTCDateRange(
        today.toString(),
        today.toString(),
      );
      const advocateData =
        await this.sharedAssingService.fetchAdminAccordingRole(
          advocate_role,
          true,
        );
      let advocateWhere: any = {};
      if (advocateData) {
        let isAdvocate = advocateData.find((adv) => adv.id == adminId);
        if (isAdvocate) advocateWhere.advocateId = adminId;
      }
      const options = {
        where: {
          type: [
            DEMAND_STATUS,
            LEGAL_STATUS,
            CASE_TOBE_FILE,
            CASE_INPROGRESS,
            CASE_FILLED,
            SUMMONS,
            WARRENT,
            CASE_WITHDRAWAL,
            CASE_DISPOSAL,
            PAID_LEGAL,
            CASE_ASSIGN,
          ],
          createdAt: { [Op.gte]: range.fromDate, [Op.lte]: range.endDate },
          ...advocateWhere,
          otherDetails: {
            [Op.and]: [
              { isAssign: { [Op.or]: [-1, null] } },
              { isHistory: { [Op.or]: [-1, null] } },
            ],
          },
        },
        group: ['type'],
      };
      const legalData = await this.legalCollectionRepo.getCountsWhere(options);
      if (legalData == kInternalError) return kInternalError;
      let passData: any = {
        demandLetter: 0,
        legalNotice: 0,
        caseTobeFile: 0,
        caseInprogress: 0,
        caseFilled: 0,
        summons: 0,
        warrent: 0,
        caseWithdrawal: 0,
        caseDisposal: 0,
        caseAssign: 0,
        paidLegal: 0,
        total: 0,
      };
      let total = 0;
      for (let i = 0; i < legalData.length; i++) {
        try {
          let legal = legalData[i];
          let type = legal.type;
          if (type == DEMAND_STATUS) passData['demandLetter'] += +legal.count;
          else if (type == LEGAL_STATUS)
            passData['legalNotice'] += +legal.count;
          else if (type == CASE_TOBE_FILE)
            passData['caseTobeFile'] += +legal.count;
          else if (type == CASE_INPROGRESS)
            passData['caseInprogress'] += +legal.count;
          else if (type == CASE_FILLED) passData['caseFilled'] += +legal.count;
          else if (type == SUMMONS) passData['summons'] += +legal.count;
          else if (type == WARRENT) passData['warrent'] += +legal.count;
          else if (type == CASE_WITHDRAWAL)
            passData['caseWithdrawal'] += +legal.count;
          else if (type == CASE_DISPOSAL)
            passData['caseDisposal'] += +legal.count;
          else if (type == PAID_LEGAL) passData['paidLegal'] += +legal.count;
          else if (type == CASE_ASSIGN) passData['caseAssign'] += +legal.count;
          passData.total += legal.count;
        } catch (error) {}
      }
      return passData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funGetLegalConsigmentTrackData() {
    try {
      const attr = ['id', 'consignmentNo'];
      let lastResBefor = new Date();
      lastResBefor.setHours(lastResBefor.getHours() - TRACKING_RES_HOURSE);
      const options = {
        where: {
          consignmentNo: { [Op.ne]: null },
          status: { [Op.notIn]: ['Complete', 'Return', 'Block'] },
          lastResponseDate: {
            [Op.or]: [{ [Op.eq]: null }, { [Op.lte]: lastResBefor.toJSON() }],
          },
        },
        limit: LIMIT_PER_CRON,
        order: [['id', 'DESC']],
      };
      const result = await this.legalConsignmentRepo.getTableWhereData(
        attr,
        options,
      );
      return result;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async trackLegalConsignmentData(body) {
    try {
      if (!body?.updateList) return kParamMissing('updateList');
      let updateList = body?.updateList ?? [];
      for (let i = 0; i < updateList.length; i++) {
        try {
          const legalTrac = updateList[i];
          if (!legalTrac.id) continue;
          const id = legalTrac.id;
          const update = legalTrac?.update;
          const legalData = await this.legalCollectionRepo.getRowWhereData(
            ['id', 'dates', 'sentType', 'trackId'],
            { where: { trackId: id } },
          );
          if (legalData && legalData != k500Error) {
            const sentType = legalData?.sentType;
            const legalId = legalData.id;
            if (update.status == 'Sent' || update.status == 'Process')
              sentType.physical = 1;
            else if (update.status == 'Return') sentType.physical = 4;
            else if (update.status == 'Complete') sentType.physical = 3;
            else if (update.status == 'Block') sentType.physical = 5;
            await this.legalCollectionRepo.updateRowData({ sentType }, legalId);
          }
          await this.legalConsignmentRepo.updateRowData(update, id);
        } catch (error) {}
      }
      return updateList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateLegalSentStatus(body) {
    try {
      const legalId = body?.legalId ?? '';
      const status = body?.status ?? '';
      const type = body?.type ?? '';
      const adminId = body?.adminId ?? '';
      const date = body?.date ?? '';
      if (!legalId) return kParamMissing('legalId');
      if (!status) return kParamMissing('status');
      if (!type) return kParamMissing('type');
      if (!adminId) return kParamMissing('adminId');
      if (!date) return kParamMissing('date');

      let newDate = this.typeService.getGlobalDate(date);
      if (newDate === date) return kInternalError;

      const attributes = ['sentType', 'id', 'dates', 'sentBy'];
      const options = {
        where: {
          id: legalId,
          otherDetails: {
            isHistory: { [Op.or]: [-1, null] },
          },
        },
      };
      // get legal record
      const currentLegal = await this.legalCollectionRepo.getRowWhereData(
        attributes,
        options,
      );
      if (currentLegal === k500Error) return kInternalError;
      if (!currentLegal) return k422ErrorMessage(kNoDataFound);
      const sentType = this.getSentType(type);
      if (!sentType) return kInternalError;
      // get updated status
      const updatedStatus = this.getUpdatedLegalStatus(
        sentType,
        status,
        currentLegal?.sentType,
      );
      if (updatedStatus?.message) return kInternalError;
      // get updated dates
      const updateDates = this.getUpdatedDates(
        sentType,
        newDate,
        currentLegal?.dates,
      );
      // get updated sentBy with adminId
      const updatedSentBy = this.getUpdateSentBy(
        sentType,
        adminId,
        currentLegal?.sentBy,
      );
      // update row with new data
      const updatedLegal = await this.legalCollectionRepo.updateRowData(
        { sentType: updatedStatus, dates: updateDates, sentBy: updatedSentBy },
        currentLegal.id,
      );
      if (updatedLegal === k500Error) return kInternalError;
      return {
        ...currentLegal,
        sentType: updatedStatus,
        dates: updateDates,
        sentBy: updatedSentBy,
      };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private getUpdateSentBy(sentType, adminId, sentBy) {
    try {
      if (!sentType) return sentBy;
      sentBy[`${sentType}AdminId`] = adminId;
      return sentBy;
    } catch (error) {
      return sentBy;
    }
  }

  private getUpdatedDates(sentType: string, newDate: Date, datesObj: any) {
    try {
      if (!sentType) return datesObj;
      datesObj[sentType] = newDate.getTime();
      return datesObj;
    } catch (error) {
      return datesObj;
    }
  }

  private getUpdatedLegalStatus(
    sentType: string,
    newStatus: string,
    statusObj: any,
  ) {
    try {
      if (!sentType) return statusObj;
      const statusTypes = ['-1', '1', '2'];
      if (!statusTypes.includes(newStatus)) return kInternalError;
      statusObj[sentType] = +newStatus;
      return statusObj;
    } catch (error) {
      return statusObj;
    }
  }

  private getSentType(type: string) {
    try {
      switch (+type) {
        case 1:
          return 'email';
        case 2:
          return 'workMail';
        case 3:
          return 'physical';
        case 4:
          return 'whatsApp';
        default:
          return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  async funLegalMailTrack(body) {
    try {
      const legalId = body?.legalId;
      const response = body?.response;
      if (!legalId) return kParamMissing('legalId');
      const targetEmail = response?.email;
      if (!targetEmail) return kParamMissing('targetEmail');

      const attr = ['id', 'sentType', 'dates', 'userId'];
      // -1 not sent, '2': delivered,'3': opened, '4': returnStatus,'5': block,
      let notMatch = [-1, 3, 5];
      let matchTypes = [LEGAL_STATUS, SUMMONS, WARRENT, DEMAND_STATUS];
      const options: any = {
        where: {
          id: legalId,
          sentType: {
            [Op.or]: [
              { email: { [Op.notIn]: notMatch } },
              { workMail: { [Op.notIn]: notMatch } },
            ],
          },
          type: matchTypes,
          otherDetails: { isHistory: { [Op.or]: [-1, null] } },
        },
        order: [['id', 'DESC']],
      };
      const legalData: any = await this.legalCollectionRepo.getRowWhereData(
        attr,
        options,
      );
      if (legalData == k500Error || !legalData)
        return k422ErrorMessage('Legal data not found!');

      // Get mail tracker data
      const mailTrackerData = await this.mailTrackerRepo.getRowWhereData(
        ['id', 'refrenceId', 'status', 'legalId', 'content'],
        { where: { userId: legalData?.userId, legalId } },
      );
      if (mailTrackerData == k500Error || !mailTrackerData)
        return k422ErrorMessage('Mail  data not found!');
      const referenceId = mailTrackerData?.refrenceId;
      if (!referenceId) return k422ErrorMessage('referenceId not found!');
      let content = JSON.parse(mailTrackerData?.content ?? null);

      if (!content) return {};
      if (targetEmail != content?.to && targetEmail != content?.workMail)
        return {};
      // Work mail delivery
      if (targetEmail == content.workMail) response.workMail = true;
      // Personal mail delivery
      else if (targetEmail == content?.to) response.to = true;
      else return {};

      // Update mail tracker id
      await this.legalCollectionRepo.updateRowData(
        { mailTrackId: mailTrackerData.id },
        mailTrackerData.legalId,
      );

      let trackResponse = {
        legalId: legalId,
        id: mailTrackerData?.id,
        response,
        legalData,
      };
      return await this.updateLegalCollectionMailStatus(trackResponse);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async updateLegalCollectionMailStatus(trackData) {
    try {
      const updatedData = [];
      try {
        const legalId = trackData?.legalId;
        const currentRecord = trackData?.legalData;
        if (!currentRecord || currentRecord === k500Error)
          return k422ErrorMessage('Records not found!');
        const sentType = currentRecord?.sentType;
        const dates = currentRecord?.dates;
        let response = trackData?.response;
        let tosentEmail = response?.to;
        let workMailSent = response?.workMail;
        let successStatus = [2, 3, 6];
        if (tosentEmail) {
          let updateData: any = this.eventUpdate(response);
          if (updateData == k500Error) return kInternalError;
          if (
            dates?.sendEmail == -1 &&
            successStatus.includes(updateData.status)
          )
            dates.sendEmail = updateData.date;
          dates.email = updateData.date;
          sentType.email = updateData.status;
        }
        if (workMailSent) {
          let udpateData: any = this.eventUpdate(response);
          if (udpateData == k500Error) return kInternalError;
          if (
            dates?.sendWorkMail == -1 &&
            successStatus.includes(udpateData.status)
          ) {
            dates.sendWorkMail = udpateData.date;
          }
          sentType.workMail = udpateData.status;
          dates.workMail = udpateData.date;
        }
        const updateStatus = await this.legalCollectionRepo.updateRowData(
          { sentType, dates },
          legalId,
        );
        if (updateStatus === k500Error) return kInternalError;
        updatedData.push({ legalId, updated: 1 });
      } catch (error) {}
      return updatedData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private eventUpdate(tosentEmail) {
    try {
      let status = this.checkEmailStatus(tosentEmail?.event);
      const emailDate = new Date(tosentEmail?.date).getTime();
      return { status, date: emailDate };
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  checkEmailStatus(event) {
    let status = -1;
    try {
      const errorStatuses = [
        'error',
        'blocked',
        'unsubscribed',
        'invalid_email',
        'hard_bounce',
        'deferred',
        'bounce',
        'dropped',
      ];
      const onProcess = ['soft_bounce', 'spam', 'processed'];

      const opened = ['unique_opened', 'opened', 'open', 'click'];
      const deliverd = 'delivered';
      if (event == deliverd) status = 2;
      else if (opened.includes(event)) status = 3;
      else if (errorStatuses.includes(event)) status = 5;
      else if (onProcess.includes(event)) status = 1;
      return status;
    } catch (error) {
      return status;
    }
  }

  //legalMailTrack migrate
  async migrateLegal() {
    try {
      let updates = [];
      let lastResBefor = new Date();
      lastResBefor.setDate(1);
      lastResBefor.setMonth(5);
      const mailTrackerDatas = await this.mailTrackerRepo.getTableWhereData(
        [
          [Sequelize.fn('max', Sequelize.col('id')), 'mailTrackId'],
          'refrenceId',
        ],
        {
          where: {
            createdAt: { [Op.gte]: lastResBefor.toJSON() },
            type: 'EMAIL',
          },
          group: ['refrenceId'],
        },
      );
      if (mailTrackerDatas == k500Error || !mailTrackerDatas)
        return k422ErrorMessage('Mail data not found!');
      const mailTrackerIds = mailTrackerDatas.map((mail) => mail.mailTrackId);
      const currentMailTrack = await this.mailTrackerRepo.getTableWhereData(
        ['id', 'legalId', 'status', 'statusDate', 'refrenceId', 'subStatus'],
        {
          where: { id: mailTrackerIds },
        },
      );
      if (currentMailTrack == k500Error || !currentMailTrack)
        return k422ErrorMessage('Legal data not found!');

      const legalMailTrackData = await this.mailTrackerRepo.getTableWhereData(
        ['id', 'legalId', 'status', 'statusDate', 'refrenceId', 'subStatus'],
        {
          where: {
            legalId: { [Op.ne]: null },
            statusDate: { [Op.ne]: null },
          },
        },
      );
      if (legalMailTrackData == k500Error || !legalMailTrackData)
        return k422ErrorMessage('Legal data not found!');
      const updateArr: any = [];
      for (let i = 0; i < legalMailTrackData.length; i++) {
        try {
          const element = legalMailTrackData[i];
          const findMailresponse = currentMailTrack.find(
            (mail) => mail.refrenceId == element.refrenceId,
          );

          if (!findMailresponse) continue;

          const response = {
            legalId: element.legalId,
            response: {
              event: findMailresponse.subStatus,
              date: findMailresponse.statusDate,
              to: true,
            },
          };
          await this.funLegalMailTrack(response);
          const updateMailLegal = {
            refrenceId: findMailresponse.refrenceId,
            legalId: element.legalId,
          };
          updateArr.push(updateMailLegal);
        } catch (e) {}
      }
      let legth = updateArr.length;
      for (let i = 0; i < legth; i++) {
        try {
          const ele = updateArr[i];
          const updatedRaws = await this.mailTrackerRepo.updateRowWhereData(
            { legalId: ele.legalId },
            { where: { refrenceId: ele.refrenceId } },
          );
          updates.push(updatedRaws);
        } catch (e) {}
      }
      return updateArr;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async migrateStatusMailTrack() {
    try {
      const legalMailTrackData = await this.mailTrackerRepo.getTableWhereData(
        null,
        { where: { legalId: { [Op.ne]: null } } },
      );
      if (legalMailTrackData === k500Error) return kInternalError;
      const reff = legalMailTrackData.map((e) => e.refrenceId);
      const length = reff.length;
      for (let i = 0; i < length; i++) {
        try {
          const refId = reff[i];
          const mailTr = legalMailTrackData.find((f) => f.refrenceId == refId);
          delete mailTr.id;
          delete mailTr.createdAt;
          delete mailTr.updatedAt;
          const eMail = mailTr?.content ? JSON.parse(mailTr?.content)?.to : '';
          const trackMail: any = await this.mailService.getMailTrackingResponse(
            refId,
          );
          if (trackMail == k500Error || !trackMail || trackMail?.message)
            continue;
          if (Array.isArray(trackMail)) {
            for (let index = 0; index < trackMail.length; index++) {
              try {
                const ele = trackMail[index];
                if (eMail == ele?.email) {
                  const events = ele?.events ?? [];
                  await this.createMailRepoRecords(events, mailTr);
                }
              } catch (error) {}
            }
          } else if (typeof trackMail == 'object') {
            try {
              if (eMail == trackMail?.email) {
                const events = trackMail?.events;
                await this.createMailRepoRecords(events, mailTr);
              }
            } catch (error) {}
          }
        } catch (error) {}
      }
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async createMailRepoRecords(events, mailTr) {
    try {
      for (let i = 0; i < events.length; i++) {
        try {
          const ev = events[i];
          const name = ev.name;
          if (name == 'sent') continue;
          const date = this.typeService.dateTimeFormate(new Date(ev.time));
          const status = this.preparedEmailStatus(name);
          const obj = {
            ...mailTr,
            status,
            subStatus: name,
            statusDate: date,
          };
          await this.mailTrackerRepo.create(obj);
        } catch (error) {}
      }
    } catch (error) {}
  }

  preparedEmailStatus(event) {
    let status = 'Process';
    try {
      const errorStatuses = [
        'error',
        'blocked',
        'unsubscribed',
        'invalid_email',
        'hard_bounce',
        'deferred',
      ];
      const onProcess = ['soft_bounce', 'spam'];
      const doneStatuses = [
        'click',
        'open',
        'unique_opened',
        'delivered',
        'opened',
      ];
      if (errorStatuses.includes(event)) status = 'Reject';
      if (doneStatuses.includes(event)) status = 'Done';
      if (onProcess.includes(event)) status = 'Process';
      return status;
    } catch (error) {
      return status;
    }
  }

  async migrateLegalAndStatus() {
    try {
      const mailStatusMigrate = await this.migrateStatusMailTrack();
      if (!mailStatusMigrate || mailStatusMigrate == kInternalError)
        return k422ErrorMessage('error in mailStatusMigrate');

      const migrateLegal = await this.migrateLegal();
      if (!migrateLegal || migrateLegal == kInternalError)
        return k422ErrorMessage('error in migrateLegal');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async funSendSelectedDefaulterNoticeMail() {
    try {
      const htmlData = fs.readFileSync(kTriggerMailFormate, 'utf-8');
      if (!htmlData) return k422ErrorMessage('Mail formate not readable');
      const fileData: any = await this.fileService.excelToArray(
        './upload/legal/sendDefaulterWarrentCase.xlsx',
      );
      if (fileData == k500Error) return kInternalError;
      const loanIds = fileData.map((file) => file['Loan ID']);
      const maxLegalLoans = await this.legalCollectionRepo.getTableWhereData(
        [[Sequelize.fn('max', Sequelize.col('id')), 'legalId']],
        {
          where: { loanId: loanIds, type: [SUMMONS, WARRENT] },
          group: ['loanId'],
        },
      );
      let legalIds = maxLegalLoans.map((legal) => legal.legalId);

      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'workMailId'],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email', 'masterId', 'addedBy'],
        include: [masterInclude],
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'followerId', 'appType'],
      };

      const legalLoanData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'caseDetails', 'userId'],
        {
          where: { id: legalIds, loanId: loanIds, type: [SUMMONS, WARRENT] },
          include: [userInclude, loanInclude],
        },
      );
      if (legalLoanData == k500Error) return kInternalError;

      const workMailIds = legalLoanData.map(
        (legal) => legal?.userData?.masterData?.workMailId,
      );
      const adminIDs = legalLoanData.map(
        (legal) => legal?.loanData?.followerId,
      );
      const workMailData = await this.workMailRepo.getTableWhereData(
        ['id', 'email', 'status'],
        { where: { id: workMailIds, status: ['1', '3'] } },
      );
      if (workMailData == k500Error) return kInternalError;
      const adminData = await this.adminRepo.getTableWhereData(
        ['id', 'email', 'phone', 'companyPhone'],
        { where: { id: adminIDs } },
      );
      if (workMailData == k500Error) return kInternalError;
      for (let i = 0; i < legalLoanData.length; i++) {
        try {
          const legal = legalLoanData[i];
          const caseDetails = legal?.caseDetails;
          // const appType = legal.loanData.appType;
          const appType = +templateDesign;
          let formateHtml = htmlData;
          formateHtml = this.replaceAll(
            htmlData,
            '##NBFC##',
            EnvConfig.nbfc.nbfcCamelCaseName,
          );
          const workMail = workMailData.find(
            (workMal) => workMal.id == legal?.userData?.masterData?.workMailId,
          );
          const admin = adminData.find(
            (admin) => admin.id == legal.loanData.followerId,
          );
          const userData = legal?.userData;
          const triggerData = userData?.addedBy ?? {};
          const triggerEmail = [];
          for (let key in triggerData) {
            if (triggerData[key] == 'TRIGGER')
              if (key.includes('@') && key != userData.email)
                triggerEmail.push(key);
          }
          const toMails = [userData.email, ...triggerEmail];
          if (workMail) toMails.push(workMail.email);
          formateHtml = formateHtml.replace(
            '##CUSTOMERNAME##',
            userData.fullName,
          );
          let caseFiledNumber = caseDetails?.ccNumber;
          caseFiledNumber =
            caseFiledNumber == '-1' || !caseFiledNumber || caseFiledNumber == ''
              ? caseDetails.crNumber
              : caseFiledNumber;
          if (
            caseFiledNumber == '-1' ||
            !caseFiledNumber ||
            caseFiledNumber == ''
          )
            continue;
          formateHtml = formateHtml.replace('##CCNUMBER##', caseFiledNumber);
          let ccMail = [];
          const adminContact = { ...admin };
          if (admin) {
            adminContact.email = this.cryptService.decryptSyncText(
              adminContact.email,
            );
            ccMail.push(adminContact.email);
            adminContact.companyPhone = this.cryptService.decryptSyncText(
              adminContact.companyPhone,
            );
          }
          formateHtml = formateHtml.replace(
            '##FOLLOWEREMAIL##',
            adminContact?.email ?? '',
          );
          formateHtml = formateHtml.replace(
            '##FOLLOWERPHONE##',
            adminContact?.companyPhone ?? '',
          );
          formateHtml = formateHtml.replace(
            '##NBFC##',
            EnvConfig.nbfc.nbfcName,
          );
          let replyTo = kLegalMail;
          let fromMail = kLegalMail;
          if (appType == 0) {
            fromMail = klspLegalMail;
            replyTo = klspLegalMail;
          }
          let subject = `Notice for "${userData.fullName}" who is absconding – Active Summons/Warrant issued and needs to be present in Court.`;
          await this.sharedNotificationService.sendMailFromSendinBlue(
            toMails,
            subject,
            formateHtml,
            userData.id,
            ccMail,
            [],
            fromMail,
            replyTo,
          );
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async launchMailPage(body) {
    try {
      const refrenceId = body?.refrenceId;
      if (!refrenceId) return kParamMissing('refrenceId');
      const email = body?.email;
      if (!email) return kParamMissing('email');
      const uuids = await this.getUUIDFromEmail(refrenceId, email);
      if (!uuids) return k422ErrorMessage('Page not found!');
      return BREW_SITE_LOG + uuids;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async getUUIDFromEmail(refrenceId, targetEmail = null) {
    try {
      const url = getSmsUuid + refrenceId;
      const headers = {
        'api-key': process.env.SENDINBLUE_KEY,
      };

      const apiRes = await this.apiRequest.get(url, {}, headers);
      if (apiRes == k500Error || !apiRes)
        return k422ErrorMessage('uuid data not found!');
      let transactionalEmails = apiRes?.transactionalEmails ?? [];
      // Get user's email's uuid tracking number
      if (targetEmail && targetEmail != null && targetEmail != '') {
        const targetData = transactionalEmails.find(
          (el) => el.email == targetEmail,
        );
        return targetData.uuid ?? '';
      }
      return transactionalEmails.map((item) => item.uuid)[0];
    } catch (Error) {
      return null;
    }
  }

  async migrateMailTrackerIdsintoLegal() {
    try {
      let lastResBefor = new Date();
      lastResBefor.setDate(1);
      lastResBefor.setMonth(5);
      const mailTrackerDatas = await this.mailTrackerRepo.getTableWhereData(
        [
          [Sequelize.fn('max', Sequelize.col('id')), 'mailTrackId'],
          'refrenceId',
        ],
        {
          where: {
            createdAt: { [Op.gte]: lastResBefor.toJSON() },
            type: 'EMAIL',
            status: { [Op.ne]: 'Sent' },
          },
          group: ['refrenceId'],
        },
      );
      if (mailTrackerDatas == k500Error || !mailTrackerDatas)
        return k422ErrorMessage('Mail data not found!');
      const mailTrackerIds = mailTrackerDatas.map((mail) => mail.mailTrackId);
      const currentMailTrack = await this.mailTrackerRepo.getTableWhereData(
        ['id', 'legalId', 'status', 'statusDate', 'refrenceId', 'subStatus'],
        {
          where: {
            id: mailTrackerIds,
            legalId: { [Op.ne]: null },
          },
        },
      );
      if (currentMailTrack == k500Error || !currentMailTrack)
        return k422ErrorMessage('Legal data not found!');
      const legalIds = currentMailTrack.map((mail) => mail.legalId);
      const legalData: any = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'type', 'loanId'],
        { where: { id: legalIds } },
      );
      if (legalData == k500Error || !legalData)
        return k422ErrorMessage('Legal data not found!');
      const legalUpdate = { legalIds: {}, loanIds: {} };
      for (let i = 0; i < currentMailTrack.length; i++) {
        try {
          const mail = currentMailTrack[i];
          const legal = legalData.find((legal) => legal.id == mail.legalId);
          if (legal?.type == DEMAND_STATUS)
            legalUpdate.legalIds[legal.id] = mail.id;
          else if (legal?.type == SUMMONS)
            legalUpdate.legalIds[legal.id] = mail.id;
          else if (legal?.type == WARRENT)
            legalUpdate.legalIds[legal.id] = mail.id;
          else if (legal?.type == LEGAL_STATUS)
            legalUpdate.loanIds[legal.loanId] = mail.id;
        } catch (error) {}
      }
      for (let key in legalUpdate.legalIds) {
        try {
          if (!key) continue;
          await this.legalCollectionRepo.updateRowData(
            { mailTrackId: legalUpdate.legalIds[key] },
            +key,
          );
        } catch (error) {}
      }
      for (let key in legalUpdate.loanIds) {
        try {
          if (!key) continue;
          await this.legalCollectionRepo.updateRowWhereData(
            { mailTrackId: legalUpdate.legalIds[key] },
            {
              where: {
                loanId: key,
                type: [CASE_TOBE_FILE, CASE_INPROGRESS, CASE_FILLED],
              },
            },
          );
        } catch (error) {}
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async makeEligibleForLegal(query) {
    try {
      const startDate: any = query.startDate;
      const endDate: any = query.endDate;
      if (!startDate) return kParamMissing('startDate');
      if (!endDate) return kParamMissing('endDate');
      const range = this.typeService.getUTCDateRange(startDate, endDate);
      const legalData: any = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'type', 'createdAt', 'loanId', 'transactionId'],
        {
          where: {
            createdAt: {
              [Op.gte]: range.fromDate,
              [Op.lte]: range.endDate,
            },
            type: [LEGAL_STATUS],
            otherDetails: {
              isAssign: { [Op.or]: [-1, null] },
              isHistory: { [Op.or]: [-1, null] },
            },
          },
        },
      );
      if (legalData == k500Error) return kInternalError;
      return {};
      const legalIds = legalData.map((legal) => legal.id);
      const loanIds = legalData.map((legal) => legal.loanId);

      const transactionIds = legalData.map((legal) => legal.transactionId);
      await this.loanRepo.updateRowData({ legalType: null }, loanIds);
      await this.transactionRepo.updateRowData(
        { remarks: null },
        transactionIds,
      );
      await this.legalCollectionRepo.updateRowData(
        { otherDetails: { isHistory: 1, isAssign: -1 } },
        legalIds,
      );
      return await this.funCreateLegalNotice({ loanIds });
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateMissedEmailStatus(reqData) {
    const data: any = await this.getDataForUpdateMissedEmailStatus(reqData);
    if (data?.message) return data;
    const targetList = data.targetList ?? [];
    const trackerList = data.trackerList ?? [];
    const workMailList = data.workMailList ?? [];
    const mode = reqData.mode ?? 'PERSONAL_EMAIL';

    // Iterate over loop for personal email
    if (mode == 'PERSONAL_EMAIL') {
      for (let index = 0; index < targetList.length; index++) {
        try {
          console.log(index, targetList.length);
          const legalData = targetList[index];
          const trackerData = trackerList.find(
            (el) => el.legalId == legalData.id,
          );
          if (!trackerData) continue;
          const referenceId = trackerData.refrenceId;
          if (!referenceId) continue;
          const userData = legalData.userData ?? {};
          const email = userData.email;
          if (!email) continue;
          const createdAt = legalData.createdAt;
          if (!createdAt) continue;
          const targetDate = createdAt.toJSON().substring(0, 10);
          // Update new data
          const legalId = legalData.id;
          if (!legalId) continue;

          // API call
          const response: any = await this.brevoService.getEmailStatus(
            referenceId,
            email,
            targetDate,
            [
              'legal notice',
              'loan emi demand letter',
              'urgent action required for',
            ],
          );
          // Error occured
          if (response?.message) continue;

          // Prepare data for update
          const sentType = legalData?.sentType ?? {};
          sentType.email = response.deliveryStatus;
          const dates = legalData?.dates ?? {};
          if (response.latestDate) dates.email = response.latestDate?.getTime();
          // For delivery attempt
          if (response.sourceDeliveryDate)
            dates.sendEmail = response.sourceDeliveryDate?.getTime();

          // Update data
          const updatedData = { dates, sentType };
          await this.legalCollectionRepo.updateRowData(updatedData, legalId);
        } catch (error) {}
      }
    }

    // Iterate over loop for work email
    if (mode == 'WORK_EMAIL') {
      for (let index = 0; index < targetList.length; index++) {
        try {
          console.log(index, targetList.length);
          const legalData = targetList[index];
          const trackerData = trackerList.find(
            (el) => el.legalId == legalData.id,
          );
          if (!trackerData) continue;
          const referenceId = trackerData.refrenceId;
          if (!referenceId) continue;
          const workMailData = workMailList.find(
            (el) => el.loanId == legalData.loanId,
          );
          if (!workMailData || !workMailData?.email) continue;
          const email = workMailData?.email;
          const createdAt = legalData.createdAt;
          if (!createdAt) continue;
          const targetDate = createdAt.toJSON().substring(0, 10);
          // Update new data
          const legalId = legalData.id;
          if (!legalId) continue;

          // API call
          const response: any = await this.brevoService.getEmailStatus(
            referenceId,
            email,
            targetDate,
            [
              'legal notice',
              'loan emi demand letter',
              'urgent action required for',
            ],
          );
          // Error occured
          if (response?.message) continue;

          // Prepare data for update
          const sentType = legalData?.sentType ?? {};
          // Resolving older bug
          delete sentType.sendWorkMail;
          sentType.workMail = response.deliveryStatus;
          const dates = legalData?.dates ?? {};
          if (response.latestDate)
            dates.workMail = response.latestDate?.getTime();
          // For delivery attempt
          if (response.sourceDeliveryDate)
            dates.sendWorkMail = response.sourceDeliveryDate?.getTime();

          // Update data
          const updatedData = { dates, sentType };
          await this.legalCollectionRepo.updateRowData(updatedData, legalId);
        } catch (error) {}
      }
    }
  }

  private async getDataForUpdateMissedEmailStatus(reqData) {
    const loanIds = reqData.loanIds;
    const mode = reqData.mode ?? 'PERSONAL_EMAIL';
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 2);
    const isForcefully = reqData.isForcefully ?? false;
    const oldDate = new Date();
    oldDate.setDate(1);
    oldDate.setMonth(6);
    oldDate.setFullYear(2023);
    const page = reqData.page;
    const limit = reqData.limit;

    // User table join
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['email'];
    const include = [userInclude];
    // Get target loans
    let attributes = [
      'createdAt',
      'dates',
      'id',
      'mailTrackId',
      'sentType',
      'loanId',
    ];
    let options: any = {
      include,
      order: [['id', 'ASC']],
      where: {
        mailTrackId: { [Op.ne]: null },
        otherDetails: { isHistory: -1 },
        sentType: { email: { [Op.in]: [-1, 1] } },
        type: {
          [Op.in]: [
            DEMAND_STATUS,
            LEGAL_STATUS,
            CASE_TOBE_FILE,
            CASE_INPROGRESS,
            CASE_FILLED,
            SUMMONS,
            WARRENT,
          ],
        },
      },
    };
    // Get only targeted loanIds
    if (loanIds) options.where.loanId = { [Op.in]: loanIds };
    else if (!isForcefully) options.where.createdAt = { [Op.gte]: minDate };
    if (isForcefully) options.where.createdAt = { [Op.gte]: oldDate };
    // Target work mail status
    if (mode == 'WORK_EMAIL')
      options.where.sentType = { workMail: { [Op.in]: [-1, 1] } };
    if (limit) options.limit = limit;
    if (page && limit) options.offset = page * limit - limit;

    const targetList = await this.legalCollectionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (targetList == k500Error) return kInternalError;

    // Get mail tracker data
    const trackerIds = targetList.map((el) => el?.mailTrackId);
    attributes = ['id', 'legalId', 'refrenceId'];
    options = { where: { id: trackerIds } };
    const trackerList = await this.mailTrackerRepo.getTableWhereData(
      attributes,
      options,
    );
    if (trackerList == k500Error) return kInternalError;

    // Get work mail data
    let workMailList = [];
    if (mode == 'WORK_EMAIL') {
      const loanIds = targetList.map((el) => el.loanId);
      // Work mail table join
      const workMailInclude: SequelOptions = { model: WorkMailEntity };
      workMailInclude.attributes = ['email'];
      const include = [workMailInclude];
      const attributes = ['loanId'];
      const options = { include, where: { loanId: { [Op.in]: loanIds } } };
      const masterList = await this.masterRepo.getTableWhereData(
        attributes,
        options,
      );
      if (masterList == k500Error) return kInternalError;
      workMailList = masterList.map((el) => {
        return { loanId: el.loanId, email: el.workMailData?.email };
      });
    }

    return { targetList, trackerList, workMailList };
  }

  async insertMissingMails(reqData) {
    const loanIds = reqData.loanIds;
    const minDate = new Date();
    minDate.setDate(1);
    minDate.setMonth(6);
    minDate.setFullYear(2023);

    // User table join
    const userInclude: SequelOptions = { model: registeredUsers };
    userInclude.attributes = ['email'];
    const include = [userInclude];

    let attributes = ['createdAt', 'id', 'loanId', 'type', 'userId'];
    let options: any = {
      include,
      order: [['id', 'DESC']],
      where: {
        createdAt: { [Op.gte]: minDate },
        mailTrackId: { [Op.eq]: null },
        otherDetails: { isHistory: -1 },
        type: {
          [Op.in]: [
            DEMAND_STATUS,
            LEGAL_STATUS,
            CASE_TOBE_FILE,
            CASE_INPROGRESS,
            CASE_FILLED,
            SUMMONS,
            WARRENT,
          ],
        },
      },
    };
    // Get only targeted loanIds
    if (loanIds) options.where.loanId = { [Op.in]: loanIds };
    const legalList = await this.legalCollectionRepo.getTableWhereData(
      attributes,
      options,
    );
    if (legalList == k500Error) return kInternalError;
    const legalIds = legalList.map((el) => el?.id);
    // Get tracker ids
    attributes = ['id', 'legalId', 'loanId'];
    options = {
      where: {
        legalId: { [Op.in]: legalIds },
        type: 'EMAIL',
      },
    };
    const trackerList = await this.mailTrackerRepo.getTableWhereData(
      attributes,
      options,
    );
    if (trackerList == k500Error) return kInternalError;

    const targetLoanIds = [];
    for (let index = 0; index < legalIds.length; index++) {
      try {
        const legalId = legalIds[index];
        let trackerData = trackerList.filter((el) => el.legalId == legalId);
        const legalData = legalList.find((el) => el.id == legalId);
        // Insert missing data
        if (trackerData.length == 0) {
          const userData = legalData.userData ?? {};
          const email = userData.email;
          const targetDate = legalData.createdAt.toJSON().substring(0, 10);
          const response: any = await this.brevoService.getEmailDetails(
            email,
            targetDate,
            [
              'legal notice',
              'loan emi demand letter',
              'urgent action required for',
            ],
          );
          if (response?.message) continue;
          if (response?.length > 0) {
            const targetResponse = response[0];
            const creationData = {
              loanId: legalData.loanId,
              type: 'EMAIL',
              userId: legalData.userId,
              status: 'Sent',
              subStatus: 'sent',
              title: targetResponse.subject,
              legalId,
              response: await this.cryptService.encryptText(
                JSON.stringify(targetResponse),
              ),
              refrenceId: targetResponse.messageId,
            };
            const createdData = await this.mailTrackerRepo.create(creationData);
            if (createdData == k500Error) continue;
            trackerData = [createdData];
          } else if (
            [CASE_TOBE_FILE, CASE_INPROGRESS, CASE_FILLED].includes(
              legalData.type,
            )
          ) {
            //  Get previous notice data
            let attributes: any = ['loanId', 'mailTrackId'];
            let options: any = {
              order: [['id', 'DESC']],
              where: {
                loanId: legalData.loanId,
                mailTrackId: { [Op.ne]: null },
                type: LEGAL_STATUS,
              },
            };
            const noticeData = await this.legalCollectionRepo.getRowWhereData(
              attributes,
              options,
            );
            if (noticeData == k500Error || !noticeData) continue;
            // Update tracker id
            if (noticeData.mailTrackId) {
              const updatedData = { mailTrackId: noticeData.mailTrackId };
              await this.legalCollectionRepo.updateRowData(
                updatedData,
                legalId,
              );
              if (!noticeData.loanId) continue;
              targetLoanIds.push(noticeData.loanId);
            }
          }
        }
        // Update missing data
        if (trackerData.length > 0) {
          trackerData = trackerData.sort((b, a) => a.id - b.id);
          const targetTracker = trackerData[0];
          if (legalId != targetTracker.legalId) continue;
          const updatedData = { mailTrackId: targetTracker.id };
          await this.legalCollectionRepo.updateRowData(updatedData, legalId);
          if (!targetTracker.loanId) continue;
          targetLoanIds.push(targetTracker.loanId);
        }
      } catch (error) {}
    }
  }

  async caseFilledNotifyUser(ids, noticeType) {
    try {
      const legalId = ids;
      const includes: any = this.legalAdditionalIncludes();
      if (includes.message) return kInternalError;
      const loanInclude = includes.loanInclude;
      const userInclude = includes.userInclude;
      loanInclude.where = { loanStatus: 'Active' };
      if (noticeType == CASE_FILLED) {
        const legalData = await this.legalCollectionRepo.getRowWhereData(
          ['id', 'loanId', 'otherDetails', 'caseDetails'],
          {
            where: {
              id: legalId,
              type: noticeType,
              otherDetails: {
                isHistory: { [Op.or]: [-1, null] },
                isAssign: { [Op.or]: [-1, null] },
              },
            },
            include: [loanInclude, userInclude],
          },
        );
        if (legalData == k500Error) return kInternalError;
        const loanId = legalData.loanData.id;
        const caseDetails = legalData?.caseDetails;
        // const appType = legalData?.loanData?.appType;
        const appType = +templateDesign;
        let userPhone = this.cryptService.decryptPhone(
          legalData?.userData?.phone,
        );
        const userId = legalData?.userData?.id;
        const fullName = legalData?.userData?.fullName ?? 'Customer';
        // send case filled sms to user
        const smsOptions: any = {
          smsId:
            appType == 1
              ? kMsg91Templates.caseFilledSMSId
              : kLspMsg91Templates.caseFilledSMSId,
          var2: EnvConfig.number.legalNumber,
          appType,
        };
        if (caseDetails?.ccNumber) smsOptions.var1 = `${caseDetails.ccNumber}`;
        else if (caseDetails?.crNumber)
          smsOptions.var1 = `${caseDetails.crNumber}`;

        if (!gIsPROD) {
          userPhone = UAT_PHONE_NUMBER[0];
        }
        await this.allSmsService.sendSMS(userPhone, MSG91, {
          ...smsOptions,
          loanId,
        });

        const content = `Dear ${fullName}, We regret to inform you that a Court Case has been filed against you due to non-payment of your loan outstanding with ${EnvConfig.nbfc.nbfcName}. Please get in touch with our legal team to discuss more on this at ${LEGAL_NUMBER}.`;
        // send push notification to user
        this.sharedNotificationService.sendNotificationToUser({
          userList: [userId],
          title: `Case has been filled agaist loan Id:${loanId}`,
          content,
        });
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // remove duplicat legal action
  async removeDuplicateLegel(query) {
    try {
      const loanId = query?.loanId;
      const type = query?.type;
      const attr = ['loanId', 'type', 'subType'];
      const opts: any = {
        where: { otherDetails: { isAssign: -1, isHistory: -1, subType: null } },
        group: ['loanId', 'type', 'subType'],
        having: Sequelize.literal('COUNT(id) > 1'),
      };
      if (loanId) opts.where.loanId = loanId;
      if (type) opts.where.type = type;
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        attr,
        opts,
      );
      if (legalData === k500Error) return kInternalError;
      if (legalData.length == 0) return [];

      const loanList = [...new Set(legalData.map((e) => e.loanId))];
      const attributes = ['id', 'loanId', 'type', 'subType'];
      const options: any = {
        where: { loanId: loanList },
        order: [['id', 'DESC']],
      };
      if (type) options.where.type = type;
      const allLegal = await this.legalCollectionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (allLegal === k500Error) return kInternalError;

      const uIds: any = [];
      for (const ele of legalData) {
        try {
          const { loanId, type, subType } = ele;
          const sameLegal = allLegal.filter(
            (f) =>
              f.loanId == loanId && f?.type == type && f?.subType == subType,
          );
          const latestId = sameLegal[0]?.id;
          sameLegal.forEach((el) => {
            if (el?.id != latestId) uIds.push(el?.id);
          });
        } catch (error) {}
      }

      // update duplicate(old) legal action as history
      const updateData = { otherDetails: { isAssign: -1, isHistory: 1 } };
      if (uIds.length > 0)
        await this.legalCollectionRepo.updateRowData(updateData, uIds, true);
      return legalData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async reminderHearingDate(type) {
    const fromDate = this.typeService.getGlobalDate(new Date()).getTime();
    let toDate: any = new Date();
    toDate.setDate(toDate.getDate() + 10);
    toDate = this.typeService.getGlobalDate(toDate).getTime();

    let where = `WHERE  "loan"."loanStatus" = 'Active' AND legal."otherDetails"->>'isHistory' != '1'`;
    if (type == 'NEXT_HD') {
      where += ` AND legal.type = '7' AND legal."dates"->>'nextHearingDate'  >= '${fromDate}' 
      AND legal."dates"->>'nextHearingDate' <= '${toDate}'`;
    } else if (type == 'FIRST_HD') {
      where += `AND legal."caseDetails"->>'firstHearingDate' >= '${fromDate}'  
    AND legal."caseDetails"->>'firstHearingDate' <= '${toDate}'`;
    }
    let query = `SELECT "legal"."id","legal"."userId","legal"."type", "legal"."caseDetails" AS "caseDetails" ,"legal"."dates" AS "dates", legal."loanId"  ,"loan"."loanStatus" AS status,"loan"."appType", u."fullName"
    FROM "LegalCollectionEntities" AS "legal" 
    INNER JOIN "loanTransactions" AS "loan" ON "legal"."loanId" = "loan"."id" 
    INNER JOIN "registeredUsers" AS "u" On u."id" = legal."userId"  ${where}`;

    const legalData = await this.repo.injectRawQuery(
      LegalCollectionEntity,
      query,
    );
    if (legalData == k500Error) throw new Error();

    for (let i = 0; i < legalData.length; i++) {
      try {
        const ele = legalData[i];
        let title;
        let content;
        const caseDetails = ele?.caseDetails;
        const userId = ele?.userId ?? '-';
        const appType = ele?.appType;
        const legalStatus = ele?.type;
        const fullName = ele?.fullName ?? 'Customer';
        const dates = ele?.dates;
        const nextHearingDate =
          this.typeService.getDateFormatted(new Date(dates?.nextHearingDate)) ??
          '-';

        const firstHearingDate =
          this.typeService.getDateFormatted(
            new Date(caseDetails?.firstHearingDate),
          ) ?? '-';
        title = 'Upcoming legal date.';
        content = `Dear ${fullName}, You have your 1st hearing date on ${firstHearingDate} you are requested to be present in Ahmedabad Court. Please get in touch with our legal team to discuss more on this at ${LEGAL_NUMBER}.`;

        if (type == 'NEXT_HD') {
          title = 'Upcoming bailable warrant hearing date';
          content = `Dear ${fullName}, You have your 2nd hearing date on ${nextHearingDate} you are requested to be present in Ahmedabad Court non-adherence may cause severe legal consequences. Please get in touch with our legal team to discuss more on this at ${LEGAL_NUMBER}`;
        }
        const userData = [];
        userData.push({ userId, appType });
        let smsOptions = {};
        const smsData: any = kMsg91Templates[kMsg91Templates.CourtHearingDate];
        const varOptions = smsData.varOptions ?? [];
        for (let index = 0; index < varOptions.length; index++) {
          try {
            const el = varOptions[index];
            const key = el.key;
            const title = el.title;
            if (key && title) {
              if (title == '##FULLNAME##') smsOptions[key] = fullName;
              if (title == '##HEARINGDATE##') smsOptions[key] = nextHearingDate;
              if (title == '##LEGALSTATUS##')
                smsOptions[key] = legalString[legalStatus];
              if (title == '##CONTACTNUMBER##') smsOptions[key] = LEGAL_NUMBER;
            }
          } catch (error) {}
        }
        const body = {
          userData,
          content,
          title,
          isMsgSent: true,
          smsId: kMsg91Templates.CourtHearingDate,
          smsOptions,
          id: 489,
        };
        await this.sharedNotificationService.sendNotificationToUser(body);
      } catch (error) {}
    }
    return {};
  }

  // resend legal mail
  async reSendLegalMail(query) {
    //formate  parameters
    const end_date = query?.endDate ?? new Date();
    const start_date =
      query?.startDate ?? new Date(new Date().setDate(end_date.getDate() - 5));
    const range = this.typeService.getUTCDateRange(start_date, end_date);
    const dateRange = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };

    const loanInclude = {
      model: loanTransaction,
      attributes: ['id', 'loanStatus'],
      where: { loanStatus: 'Active' },
    };
    const option = {
      where: {
        createdAt: dateRange,
        sentType: { email: -1 },
        otherDetails: { [Op.ne]: { isHistory: 1 } },
      },
      include: [loanInclude],
    };
    const attributes = ['id', 'adminId', 'type', 'userId'];
    const legalList = await this.legalCollectionRepo.getTableWhereData(
      attributes,
      option,
    );

    if (legalList == k500Error) throw new Error();
    let legalSteps = {
      WARRENT: [],
      SUMMONS: [],
      DEMAND_STATUS: [],
      LEGAL_STATUS: [],
    };

    //get user legalId
    legalList?.forEach((el) => {
      if (el?.type === WARRENT) {
        legalSteps.WARRENT.push(el?.id);
      } else if (el?.type === SUMMONS) {
        legalSteps.SUMMONS.push(el?.id);
      } else if (el?.type == LEGAL_STATUS) {
        legalSteps.LEGAL_STATUS.push(el?.id);
      } else if (el?.type == DEMAND_STATUS) {
        legalSteps.DEMAND_STATUS.push(el?.id);
      }
    });

    if (query.userlist) return legalList;

    //prepare data for resend mail which not send legal mail of user
    for (let item in legalSteps) {
      try {
        let data: any = { mailReSend: true };
        let ids = legalSteps[item];
        if (item == 'WARRENT') {
          data.ids = ids;
          data.noticeType = legalStep.WARRENT;
        } else if (item == 'DEMAND_STATUS') {
          data.ids = ids;
          data.noticeType = legalStep.DEMAND_STATUS;
        } else if (item == 'LEGAL_STATUS') {
          data.ids = ids;
          data.noticeType = legalStep.LEGAL_STATUS;
        } else if (item == 'SUMMONS') {
          data.ids = ids;
          data.noticeType = legalStep.SUMMONS;
        }

        if (data.ids.length) {
          await this.sendNoticeToUser(data);
        }
      } catch (error) {}
    }
    return { mailesend: true, legalList };
  }

  // send legal mail of Summons And Warrant Users for the offer remainder
  async sendReminderSummonsWarrant(query) {
    try {
      const emiInc = {
        model: EmiEntity,
        attributes: ['id', 'penalty_days'],
        where: { payment_status: '0', payment_due_status: '1' },
      };
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id', 'loanStatus', 'loan_disbursement_date', 'appType'],
        where: { loanStatus: 'Active' },
        include: [emiInc],
      };
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email'],
      };
      const caseDetails = { caseFiledDate: { [Op.notIn]: ['-1', ''] } };
      const option = {
        where: {
          type: { [Op.in]: [SUMMONS, WARRENT] },
          otherDetails: { isHistory: { [Op.ne]: 1 } },
          caseDetails: caseDetails,
        },
        include: [loanInclude, userInclude],
      };
      const attributes = ['id', 'adminId', 'type', 'userId', 'caseDetails'];
      const legalList = await this.legalCollectionRepo.getTableWhereData(
        attributes,
        option,
      );
      if (legalList == k500Error) throw new Error();
      const appType = +templateDesign;
      for (let i = 0; i < legalList.length; i++) {
        try {
          const ele = legalList[i];
          const loan = ele?.loanData;
          // const appType = loan?.appType;
          const kSummonsWarrantLokAdalatPath =
            await this.commonSharedService.getEmailTemplatePath(
              kSummonsWarrantLokAdalat,
              appType,
              null,
              null,
            );
          const kSummonsWarrantPath =
            await this.commonSharedService.getEmailTemplatePath(
              kSummonsWarrant,
              appType,
              null,
              null,
            );
          const template =
            query?.type == 'LOKADALAT'
              ? kSummonsWarrantLokAdalatPath
              : kSummonsWarrantPath;
          const emiData = loan?.emiData;
          const loanId = loan?.id;
          const userId = ele?.userId ?? '-';
          const fullName = ele?.userData?.fullName ?? 'Customer';
          const email = ele?.userData?.email ?? '-';
          const CCNumber = ele?.caseDetails?.ccNumber ?? '-';
          const legalType = ele?.type;
          const type = legalType == WARRENT ? 'Warrant' : 'Summons';
          const disDate = this.typeService.getDateFormatted(
            loan?.loan_disbursement_date,
          );
          let delayDays = 0;
          emiData.forEach((emi) => {
            if (emi?.penalty_days && delayDays < emi?.penalty_days)
              delayDays = emi?.penalty_days;
          });
          const caseFiledDate = this.typeService
            .getGlobalDate(ele?.caseDetails?.caseFiledDate)
            .toJSON();
          const year = caseFiledDate.substring(0, 4) ?? '-';

          const subject = query?.subject
            ? query?.subject
            : `Attention: Legal Action has been initiated against ${fullName}`;

          const legalAction =
            legalType == SUMMONS
              ? 'Legal action may result in court warrants, or other legal measures.'
              : '';
          let html: any = fs.readFileSync(template, 'utf-8');
          html = html.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
          html = html.replace('##fullName##', fullName);
          html = html.replace('##CCNumber##', CCNumber);
          html = html.replace('##Year##', year);
          html = html.replace('##DELAYDAYS##', delayDays);
          html = this.replaceAll(html, '##TYPE##', type);
          html = this.replaceAll(html, '##DISBURSEMENTDATE##', disDate);
          html = this.replaceAll(html, '##LNUMBER##', kLegalNumber);
          html = this.replaceAll(html, '##NBFC##', EnvConfig.nbfc.nbfcName);
          html = html.replace('##LEGAL_ACTION##', legalAction);
          html = html.replace('##REG##', EnvConfig.nbfc.nbfcRegistrationNumber);
          html = html.replace('##CINNO##', EnvConfig.nbfc.nbfcCINNumber);
          html = html.replace('##LEGALNUMBER##', EnvConfig.number.legalNumber);
          html = html.replace('##NBFCADDRESS##', EnvConfig.nbfc.nbfcAddress);
          let replyTo = kLegalMail;
          let fromMail = kLegalMail;
          if (appType == 0) {
            html = html.replace(/##LMAIL##/g, klspLegalMail);
            fromMail = klspLegalMail;
            replyTo = klspLegalMail;
          } else html = html.replace(/##LMAIL##/g, kLegalMail);
          await this.sharedNotificationService.sendMailFromSendinBlue(
            email,
            subject,
            html,
            userId,
            null,
            null,
            fromMail,
            replyTo,
          );
          console.log('loanId', loanId);
        } catch (error) {}
      }
      return {};
    } catch (error) {}
  }

  async sendUpcomingPenalCharges() {
    try {
      const userInclude = {
        model: registeredUsers,
        attributes: ['id', 'fullName', 'email'],
      };
      const option = {
        where: { loanStatus: 'Active' },
        include: [userInclude],
        order: [['id', 'DESC']],
      };
      const attributes = ['id', 'appType'];
      const userData = await this.loanRepo.getTableWhereData(
        attributes,
        option,
      );
      if (userData == k500Error) throw new Error();
      const template = kUpcomingPenalChanges;
      if (!gIsPROD) userData.length = 3;
      const appType = +templateDesign;
      for (let i = 0; i < userData.length; i++) {
        try {
          const ele = userData[i];
          const userId = ele?.registeredUsers?.id ?? '-';
          const fullName = ele?.registeredUsers?.fullName ?? 'Customer';
          const email = ele?.registeredUsers?.email ?? '-';
          // const appType = ele.appType
          const subject = `Important Update: Introduction of Penal Charges on EMI Delay`;
          let html: any = fs.readFileSync(template, 'utf-8');
          html = html.replace('##fullName##', fullName);
          html = html.replace('##NBFCINFO##', nbfcInfoStr);
          html = this.replaceAll(html, '##NBFCNAME##', EnvConfig.nbfc.nbfcName);
          html = html.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
          let fromMail = kNoReplyMail;
          if (appType == 0) fromMail = kLspNoReplyMail;

          await this.sharedNotificationService.sendMailFromSendinBlue(
            email,
            subject,
            html,
            userId,
            null,
            null,
            fromMail,
            fromMail,
          );
        } catch (error) {}
      }
      return {};
    } catch (error) {}
  }

  async addLegalCharge(loanId) {
    const transInclude = {
      model: TransactionEntity,
      attributes: ['id', 'principalAmount', 'type', 'status'],
      where: { status: kCompleted },
      required: false,
    };

    const emiInclude = {
      model: EmiEntity,
      attributes: [
        'id',
        'loanId',
        'principalCovered',
        'penaltyCharges',
        'emiNumber',
        'payment_due_status',
        'payment_status',
      ],
    };

    const options = {
      where: { id: loanId },
      include: [transInclude, emiInclude],
    };

    let emiPrincipalAmount = 0;
    let transPrincipalAmount = 0;
    let emiId;
    const loanData = await this.loanRepo.getRowWhereData(['id'], options);
    if (loanData == k500Error) throw new Error();
    const emiData = loanData?.emiData;
    let addLegalCharge = false;
    let transactionData = loanData?.transactionData;

    transactionData = await this.commonSharedService.filterTransActionData(
      transactionData,
    );
    emiData.forEach((el) => {
      emiPrincipalAmount += el?.principalCovered;
    });
    let emi;
    let flag = true;
    emiData.sort((a, b) => b.id - a.id);
    for (let i = 0; i < emiData.length; i++) {
      try {
        const ele = emiData[i];
        if (
          flag &&
          ele?.payment_due_status == '1' &&
          ele?.payment_status == '0'
        ) {
          emi = ele;
          flag = false;
          break;
        }
      } catch (error) {}
    }

    emiId = emi?.id;
    addLegalCharge = emi?.penaltyCharges?.LEGAL_CHARGE;
    transactionData.forEach((ele) => {
      transPrincipalAmount += ele?.principalAmount;
    });
    const legalChargeGST =
      (GLOBAL_CHARGES.LEGAL_CHARGE * GLOBAL_CHARGES.GST) / 100;
    let remPrincipalAmount = emiPrincipalAmount - transPrincipalAmount;
    if (remPrincipalAmount > 0 && addLegalCharge && emiId) {
      await this.emiRepo.updateRowDataWithOptions(
        { legalCharge: GLOBAL_CHARGES.LEGAL_CHARGE, legalChargeGST },
        { legalCharge: { [Op.in]: [null, 0] } },
        emiId,
      );
    }
  }
}
