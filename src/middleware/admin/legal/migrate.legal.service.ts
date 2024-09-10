import { Op, Sequelize } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { TypeService } from 'src/utils/type.service';
import { LoanRepository } from 'src/repositories/loan.repository';
import { kInternalError } from 'src/constants/responses';
import {
  CASE_ASSIGN,
  CASE_DISPOSAL,
  CASE_FILLED,
  CASE_INPROGRESS,
  CASE_TOBE_FILE,
  CASE_WITHDRAWAL,
  DEMAND_STATUS,
  LEGAL_PROCESS,
  LEGAL_STATUS,
  PAID_LEGAL,
  SUMMONS,
  SYSTEM_ADMIN_ID,
  WARRENT,
} from 'src/constants/globals';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { LegalCollectionRepository } from 'src/repositories/legal.collection.repository';
import { LegalFormateService } from './legal.fomate';
import { LegalConsigmentRepository } from 'src/repositories/legal.consignment.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { LegalService } from './legal.service';
import { FileService } from 'src/utils/file.service';
import { LegalCollectionEntity } from 'src/entities/legal.collection.entity';
import { TransactionRepository } from 'src/repositories/transaction.repository';
import { loanTransaction } from 'src/entities/loan.entity';
import { EMIRepository } from 'src/repositories/emi.repository';

@Injectable()
export class MigrateLegalService {
  constructor(
    private readonly loanRepo: LoanRepository,
    private readonly typeService: TypeService,
    private readonly legalService: LegalService,
    private readonly legalRepo: LegalNoticeRepository,
    private readonly legalCollectionRepo: LegalCollectionRepository,
    private readonly legalFormateService: LegalFormateService,
    private readonly legalConsignmentRepo: LegalConsigmentRepository,
    private readonly fileSErvice: FileService,
    private readonly transactionRepo: TransactionRepository,
    private readonly emiRepo: EMIRepository,
  ) {}

  async funMigrate(type) {
    try {
      //start from here
      const data = await this.getRowDataForLegal(type);
      //get all the legal data and its consignment data
      if (data?.message) return data;
      // grouped legal loan wise
      const groupedLegal = data.groupedLegal;
      //consignment details as per legal
      const legalConsigmentData = data?.legalConsigmentData ?? [];
      const advocateList = data?.advocateList ?? [];
      const finalData = [];
      let count = 0;
      const len = Object.keys(groupedLegal).length;
      for (let key in groupedLegal) {
        try {
          let oldNotices = groupedLegal[key];
          const advocateData = advocateList.find((adv) => adv.id == key);
          count += 1;
          if (count % 100 == 0) console.log(count, (count * 100) / len);
          for (let i = 0; i < oldNotices.length; i++) {
            try {
              const oldNotice = oldNotices[i];
              const url = (oldNotice?.url ?? '').trim();
              if (!url) continue;
              const legalConsignment = legalConsigmentData.filter(
                (con) => con.legalId == oldNotice.id,
              );
              //create payloads
              const passData: any = {
                userId: oldNotice.userId,
                loanId: oldNotice.loanId,
                url: oldNotice.url,
                adminId: oldNotice.adminId,
                createdAt: oldNotice.createdAt,
                updatedAt: oldNotice.updatedAt,
              };
              const otherDetails: any = { isHistory: -1, isAssign: -1 };
              const sentType = {
                email: -1,
                workMail: -1,
                physical: -1,
                whatsApp: -1,
              };
              const sentBy = {};
              const dates: any = {
                email: -1,
                workMail: -1,
                nextHearingDate: -1,
                disposalDate: -1,
                uploadDate: -1,
              };
              if (oldNotice?.emailAdminId || oldNotice?.purpose === 'FULLPAY') {
                sentBy['emailAdminId'] =
                  oldNotice?.emailAdminId ?? SYSTEM_ADMIN_ID;
                sentType.email = 2;
                dates.email = this.typeService
                  .getGlobalDate(oldNotice?.emailDate ?? oldNotice.createdAt)
                  .getTime();
                dates.sendEmail = dates.email;
              }
              if (oldNotice.whatsAppAdminId) {
                sentBy['whatsAppAdminId'] = oldNotice.whatsAppAdminId;
                sentType.whatsApp = 1;
                dates.whatsApp = this.typeService
                  .getGlobalDate(oldNotice?.whatsAppDate ?? oldNotice.createdAt)
                  .getTime();
              }
              if (oldNotice.uploadedDate) {
                dates.uploadDate = this.typeService
                  .getGlobalDate(oldNotice.uploadedDate)
                  .getTime();
              }
              passData.otherDetails = otherDetails;
              passData.sentType = sentType;
              passData.dates = dates;
              passData.sentBy = sentBy;

              if (
                oldNotice.noticeType == 'SOFT_NOTICE' ||
                oldNotice.noticeType == 'SIGNED_NOTICE'
              ) {
                passData.type = LEGAL_STATUS;
                if (oldNotice.noticeType == 'SOFT_NOTICE')
                  otherDetails.subType = 1;
              } else if (oldNotice.noticeType == 'SUMMONS') {
                passData.type = SUMMONS;
                otherDetails.subType = 1;
                if (oldNotice.noticeSubType == 'RESUMMONS2')
                  otherDetails.subType = 2;
                try {
                  const find = oldNotices[i + 1];
                  if (find) {
                    dates.nextHearingDate = this.typeService
                      .getGlobalDate(find.createdAt)
                      .getTime();
                  }
                } catch (error) {}
              } else if (oldNotice.noticeType == 'WARRANT') {
                passData.type = WARRENT;
                otherDetails.subType = 1;
                if (oldNotice.noticeSubType == 'BIWARRANT2')
                  otherDetails.subType = 2;
                else if (oldNotice.noticeSubType == 'NONBIWARRANT')
                  otherDetails.subType = 3;
                try {
                  const find = oldNotices[i + 1];
                  if (find) {
                    dates.nextHearingDate = this.typeService
                      .getGlobalDate(find.createdAt)
                      .getTime();
                  }
                } catch (error) {}
              }
              if (advocateData) passData.advocateId = advocateData.advocateId;
              if (oldNotice?.purpose === 'FULLPAY') passData.subType = 4;

              finalData.push(passData);
              const createdData =
                await this.legalService.createAndUpdateNewLegal(
                  passData,
                  null,
                  false,
                  true,
                );
              // update consignment details to new legal
              if (
                createdData &&
                createdData != k500Error &&
                !createdData?.message
              ) {
                if (legalConsignment && legalConsignment.length > 0) {
                  let conIds = legalConsignment.map((cn) => cn.id);
                  await this.legalConsignmentRepo.updateRowData(
                    { legalCollectionId: createdData?.id },
                    conIds,
                  );
                  let letestCon = legalConsignment[0];
                  await this.legalCollectionRepo.updateRowData(
                    { trackId: letestCon?.id },
                    createdData.id,
                  );
                }
                await this.legalRepo.updateRowData(
                  { status: 'MIGRATED-1' },
                  oldNotice.id,
                );
              }
            } catch (error) {}
          }
        } catch (error) {}
      }
      return finalData;
    } catch (error) {}
  }

  //#region get row data for legal
  private async getRowDataForLegal(type, loanId?) {
    try {
      let optionsGrp: any = {
        where: {
          status: { [Op.ne]: 'MIGRATED-1' },
          [Op.and]: [{ url: { [Op.ne]: null } }, { url: { [Op.ne]: '' } }],
        },
        group: ['loanId'],
      };
      // if (loanId && loanId.length > 0) optionsGrp.where['loanId'] = loanId;
      if (type.length > 0) optionsGrp.where.noticeType = type;
      /// get loanid to legal entity
      const grpNotice = await this.legalRepo.getTableWhereData(
        ['loanId'],
        optionsGrp,
      );
      if (grpNotice == k500Error) return kInternalError;

      const loanIds = [...new Set(grpNotice.map((ele) => ele.loanId))];
      const options: any = { order: [['id']], where: { loanId: loanIds } };
      if (type.length > 0) options.where.noticeType = type;
      /// get all notice data from loanId
      const oldNoticeData = await this.legalRepo.getTableWhereData(
        null,
        options,
      );
      if (oldNoticeData == k500Error) return kInternalError;
      /// formateing data
      const groupedLegal = await this.legalFormateService.groupedLegal(
        oldNoticeData,
      );
      if (oldNoticeData.length == 0) return oldNoticeData;
      /// find consignment data from legal id
      const legalIds = [...new Set(oldNoticeData.map((ele) => ele.id))];
      const legalConsigmentData =
        await this.legalConsignmentRepo.getTableWhereData(['id', 'legalId'], {
          where: { legalId: legalIds },
          order: [['id', 'DESC']],
        });
      if (legalConsigmentData == k500Error) return kInternalError;

      /// find advocate
      const ops = { where: { id: loanIds } };
      const att = ['id', 'advocateId'];
      const advocateList = await this.loanRepo.getTableWhereData(att, ops);
      if (advocateList == k500Error) return kInternalError;
      return { groupedLegal, legalConsigmentData, advocateList };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region update advocate
  async migrateAdvocate() {
    try {
      const options = { where: { advocate: { [Op.ne]: null } } };
      const att = ['id', 'advocate'];
      const list = await this.loanRepo.getTableWhereData(att, options);
      if (!list || list == k500Error) return kInternalError;
      const advocateList = {
        'Devendra Patkar': 83,
        'Jitendra Tolambia': 95,
        Swapnil: 110,
      };
      const updateList = {};
      const unFind = [];
      list.forEach((ele) => {
        const find = advocateList[ele.advocate];
        if (find) {
          if (updateList[find]) updateList[find].push(ele.id);
          else updateList[find] = [ele.id];
        } else unFind.push(ele);
      });

      const keys = Object.keys(updateList);
      for (let index = 0; index < keys.length; index++) {
        try {
          const key = keys[index];
          const update = await this.loanRepo.updateRowData(
            { advocateId: +key },
            updateList[key],
          );
        } catch (error) {}
      }
      return { updateList, unFind };
    } catch (error) {}
  }
  //#endregion

  //#region case ready for filed migare
  async caseReadyForFiledMigare() {
    try {
      const options = {
        where: {
          type: LEGAL_STATUS,
          subType: 4,
          sentType: { email: 1 },
          otherDetails: { isHistory: -1 },
        },
      };
      const att = ['createdAt', 'updatedAt', 'loanId'];
      const list = await this.legalCollectionRepo.getTableWhereData(
        att,
        options,
      );
      const finalData = [];
      for (let index = 0; index < list.length; index++) {
        try {
          const ele = list[index];
          if (index % 100 == 0) console.log(index, (index * 100) / list.length);
          const createdAt = new Date(ele.createdAt);
          createdAt.setDate(createdAt.getDate() + 15);
          const updatedAt = new Date(ele.updatedAt);
          updatedAt.setDate(updatedAt.getDate() + 15);
          const passData = {
            createdAt,
            updatedAt,
            type: CASE_TOBE_FILE,
            loanId: ele.loanId,
          };
          finalData.push(passData);
          await this.legalService.createAndUpdateNewLegal(
            passData,
            null,
            false,
            true,
          );
        } catch (error) {}
      }
      return finalData;
    } catch (error) {}
  }
  //#endregion

  //#region case filed migare
  async caseFiledMigare() {
    try {
      /// find loanData
      const options = {
        where: {
          suitFiledStatus: ['CASE_FILED', 'IN_PROGRESS'],
          legalInfo: {
            [Op.or]: [
              { isHistory: { [Op.eq]: null } },
              { isHistory: { [Op.ne]: 1 } },
            ],
          },
        },
      };
      const att = [
        'id',
        'suitFiledStatus',
        'yetToFiledFrom',
        'loanStatus',
        'legalId',
        'legalInfo',
        'ccNumber',
        'crNumber',
        'crReason',
        'courtName',
        'courtNumber',
        'complainant',
      ];
      const loanData = await this.loanRepo.getTableWhereData(att, options);
      if (!loanData || loanData == k500Error) return kInternalError;

      const finalData = [];
      let loanIds = [];
      /// filed inprogress
      for (let index = 0; index < loanData.length; index++) {
        try {
          const ele = loanData[index];
          if (index % 100 == 0)
            console.log(index, (index * 100) / loanData.length);
          let createdAt;
          if (
            ele.legalInfo?.madeInProgressOn &&
            ele.legalInfo?.madeInProgressOn.includes('T')
          )
            createdAt = new Date(ele.legalInfo?.madeInProgressOn);

          const passData: any = { type: CASE_INPROGRESS, loanId: ele.id };
          if (createdAt) {
            passData.createdAt = createdAt;
            passData.updatedAt = createdAt;
          }

          /// filed inprogress
          await this.legalService.createAndUpdateNewLegal(passData, null);
          const legalInfo = ele?.legalInfo ?? {};
          if (legalInfo) {
            legalInfo.isHistory = 1;
            await this.loanRepo.updateRowData({ legalInfo }, ele.id);
          }
          /// case filed
          if (ele?.suitFiledStatus != 'CASE_FILED') continue;
          passData.type = CASE_FILLED;
          passData.caseDetails = {
            ccNumber: (ele?.ccNumber ?? '').trim(),
            crNumber: (ele?.crNumber ?? '').trim(),
            crReason: (ele?.crReason ?? '').trim(),
            courtName: (ele?.courtName ?? '').trim(),
            courtNumber: (ele?.courtNumber ?? '').trim(),
            complainantId: 54,
            crHearingDate: new Date(legalInfo.caseFiledDate).getTime(),
            firstHearingDate: new Date(legalInfo.firstHearingDate).getTime(),
          };

          passData.createdAt = new Date(legalInfo?.caseFiledDate);
          passData.updatedAt = new Date(legalInfo?.caseFiledDate);
          /// create case file
          await this.legalService.createAndUpdateNewLegal(passData, null);

          finalData.push(passData);
        } catch (error) {}
      }

      return finalData;
    } catch (error) {}
  }

  async checkAllActiveLegalAndClose() {
    try {
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId'],
        {
          where: {
            type: {
              [Op.notIn]: [
                PAID_LEGAL,
                CASE_ASSIGN,
                CASE_WITHDRAWAL,
                CASE_DISPOSAL,
              ],
            },
            otherDetails: {
              isHistory: { [Op.or]: [-1, null] },
              isAssign: { [Op.or]: [-1, null] },
            },
          },
        },
      );
      if (legalData == k500Error) return kInternalError;
      const loanIds = legalData.map((legal) => legal.loanId);
      await this.legalService.legalCloseLegalAndCloseLoan({
        loanIds,
        isMigrate: true,
      });
      return loanIds;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  async funMigreateFiledCase() {
    try {
      //get fileData
      const fileData: any = await this.fileSErvice.excelToArray(
        './upload/legal/Summons list.xlsx',
      );

      //Error return
      if (fileData.message) return fileData;
      //get all loan details
      let loanIds = fileData.map((each) => each['Loan id']);
      loanIds = loanIds.filter((id) => !isNaN(id));
      //get all legalData for loans
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'loanId', 'caseDetails', 'type', 'otherDetails'],
        {
          where: {
            loanId: { [Op.in]: loanIds },
          },
          order: [['id', 'DESC']],
        },
      );
      //return error
      if (legalData == k500Error) return kInternalError;
      let allUpdateSummonsData = [];
      //check for each loan id
      let caseData = [];
      for (let i = 0; i < fileData.length; i++) {
        try {
          const element = fileData[i];
          let advocateId = element.advocateId;
          //hey loan legalData
          const legalLoanData = legalData.filter(
            (legal) => legal.loanId == element['Loan id'],
          );
          //check  if case already case
          let alreadyCreatedDCase = legalLoanData.find(
            (legal) => legal.type == CASE_FILLED,
          );
          //ignore if created
          let loanWarrentSummonsData = legalLoanData.filter((legal) =>
            [WARRENT, SUMMONS].includes(legal.type),
          );
          loanWarrentSummonsData.sort((a, b) => b.id - a.id);
          allUpdateSummonsData.push(...loanWarrentSummonsData);
          if (!alreadyCreatedDCase) {
            //fill date of case filed
            const caseFiledDate = this.typeService
              .getGlobalDate(element['CASE FILED Date'])
              .getTime();
            const firstHearingDate = this.typeService
              .getGlobalDate(element['1ST Hearing DATE'])
              .getTime();
            const caseDetails: any = {
              caseFiledDate: caseFiledDate,
              crReason: '',
              ccNumber: element['CC Number'] != '-' ? element['CC Number'] : -1,
              courtName: element['Court Name'],
              courtNumber: element['Court Number'],
              firstHearingDate: firstHearingDate,
            };
            if (element['Complaint Name']) {
              let complainantList = {
                'Satvinder singh': '14',
                'Kupali dholakiya': '42',
                'Sunidhee shrey': '54',
                'Vikas Daiya': '136',
              };
              caseDetails.complainantId =
                complainantList[element['Complaint Name']];
            }
            if (element['Advocate']) {
              let advocateList = {
                Swapnil: '110',
                Labdhi: '46',
                patkar: '83',
                Jitu: '95',
              };
              if (!advocateId) advocateId = advocateList[element['Advocate']];
            }
            // //check last past legals
            if (legalLoanData.length > 0) {
              //map case detaialse
              loanWarrentSummonsData = loanWarrentSummonsData.map(
                (legal) => (legal.caseDetails = caseDetails),
              );
              //check preivous data
              const previousLegalData = legalLoanData.filter((legal) =>
                [LEGAL_STATUS, CASE_TOBE_FILE, CASE_INPROGRESS].includes(
                  legal.type,
                ),
              );
              //get last letest data
              const previousLegal = previousLegalData.sort(
                (a, b) => b.id - a.id,
              );
              if (previousLegal.length > 0) {
                const last = previousLegal[0];
                let otherDetails = { isHistory: -1, isAssign: -1 };
                if (loanWarrentSummonsData.length > 0)
                  otherDetails.isHistory = 1;
                let passData: any = {
                  caseDetails,
                  otherDetails,
                  advocateId,
                  subType: 4,
                  type: CASE_FILLED,
                  createdAt: new Date(),
                };
                if (
                  !caseDetails?.ccNumber ||
                  caseDetails.ccNumber == '-' ||
                  caseDetails?.ccNumber == -1
                )
                  passData.type = CASE_INPROGRESS;
                caseData.push(passData);
                if (last)
                  await this.legalService.createAndUpdateNewLegal(
                    passData,
                    last,
                    false,
                    true,
                  );
              }
              //push udpate summons to loans
            }
            allUpdateSummonsData.push(...loanWarrentSummonsData);
          } else {
            loanWarrentSummonsData.map((summons) => {
              summons.caseDetails = alreadyCreatedDCase?.caseDetails;
            });
            caseData.push(alreadyCreatedDCase);
          }
        } catch (error) {}
      }
      for (let i = 0; i < allUpdateSummonsData.length; i++) {
        try {
          let summons = allUpdateSummonsData[i];
          if (summons.caseDetails)
            await this.legalCollectionRepo.updateRowData(
              { caseDetails: summons.caseDetails },
              summons.id,
            );
        } catch (error) {}
      }
      await this.legalService.legalCloseLegalAndCloseLoan({ loanIds });
      return { caseData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // Make all the old legal for fullpay autodebit
  async funMakeEligibleForAutodebit() {
    try {
      const exceptionLoanIds = [
        407632, 407188, 406643, 406203, 406150, 404553, 404464, 404185, 403700,
        403625, 403504, 403380, 403340, 402784, 402707, 402551, 402248, 402091,
        401426, 401075, 401050, 400342, 399934, 399582, 399422, 399063, 398264,
        398134, 398095, 397852, 397788, 397432, 397233, 397189, 396991, 396355,
        395915, 395765, 395754, 395431, 395387, 394996, 394888, 394272, 394041,
        393747, 393269, 392608, 392428, 392412, 392380, 392348, 392333, 392234,
        391913, 391151, 390760, 390497, 389524, 389223, 389192, 388935, 387794,
        387313, 387060, 386741, 386459, 386342, 386065, 385731, 181019, 180934,
        180877, 180767, 180378, 179908, 179750, 179103, 179043, 178737, 178704,
        178661, 178652, 178512, 178459, 178395, 178355, 178215, 178097, 177866,
        177656, 177589, 177573, 177502, 177436, 177394, 177033, 177015, 176566,
        176293, 176290, 176252, 176232, 176197, 176149, 176145, 176131, 176041,
        175996, 175877, 175809, 175744, 175701, 175639, 175445, 175314, 175141,
        174926, 174805, 174763, 174691, 174640, 174416, 174409, 174236, 174213,
        174192, 174180, 174043, 174027, 173971, 173921, 173837, 173757, 173754,
        173723, 173644, 173591, 173550, 173473, 173420, 173395, 173358, 173353,
        173323, 173319, 173299, 173246, 173244, 173147, 173106, 173085, 173023,
        172862, 172650, 172620, 172609, 172593, 172579, 172465, 172331, 172243,
        172185, 172183, 172181, 172172, 172159, 172100, 172043, 171848, 171745,
        171620, 171577, 171460, 171316, 171219, 171194, 171107, 171085, 171055,
        170904, 170836, 170476, 170381, 170349, 170319, 170008, 169698, 169546,
        169510, 169347, 169292, 169285, 169235, 169206, 169011, 168888, 168658,
        168452, 168262, 168197, 167970, 167796, 167692, 167083, 167063, 166803,
        166728, 166666, 166569, 166179, 165922, 165846, 165518, 165508, 165374,
        165311, 165307, 164871, 164706, 164512, 164078, 163766, 163693, 163681,
        163617, 163345, 163331, 163135, 163065, 162664, 162413, 162323, 162305,
        161602, 161189, 161090, 160775, 160543, 160449, 160226, 160161, 159920,
        159675, 158832, 158066, 157413, 157240, 157128, 157020, 155172, 153380,
        148245, 146212, 145455, 141786, 140389, 137569, 119196, 59818, 9922,
        176763, 391032, 410202, 404378, 402328, 398536, 394894, 405385, 396076,
        389592, 408375, 403022, 389561, 398538, 396768, 391458, 180778, 178681,
        391152, 175972, 174498, 174392, 173536, 172852, 172850, 172081, 166563,
        173775, 173762, 173396, 167797,
      ];
      let lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      lastMonthDate.setDate(1);
      lastMonthDate = this.typeService.getGlobalDate(lastMonthDate);

      const maxTransactions = await this.transactionRepo.getTableWhereData(
        [[Sequelize.fn('max', Sequelize.col('id')), 'tranId']],
        {
          where: {
            status: 'FAILED',
            type: 'FULLPAY',
            adminId: SYSTEM_ADMIN_ID,
            loanId: { [Op.notIn]: exceptionLoanIds },
            [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
          },
          group: ['loanId'],
        },
      );
      if (maxTransactions == k500Error) return kInternalError;
      const tranIds = maxTransactions.map((mt) => mt.tranId);
      if (tranIds?.length == 0) return {};

      const fullpayTransaction = await this.transactionRepo.getTableWhereData(
        ['id', 'subscriptionDate', 'loanId'],
        {
          where: {
            id: tranIds,
            status: 'FAILED',
            type: 'FULLPAY',
            adminId: SYSTEM_ADMIN_ID,
            subscriptionDate: { [Op.lte]: lastMonthDate.toJSON() },
            [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
          },
        },
      );
      if (fullpayTransaction == k500Error) return kInternalError;
      if (fullpayTransaction?.length == 0) return {};
      let placeLoans = fullpayTransaction.map((tran) => tran.loanId);

      //get last fullpay autodebit data
      const loanData = await this.loanRepo.getTableWhereData(
        ['id', 'legalType', 'legalId'],
        {
          where: {
            id: placeLoans,
            loanStatus: 'Active',
            legalType: {
              [Op.or]: [
                { [Op.eq]: null },
                { [Op.in]: [LEGAL_PROCESS, CASE_TOBE_FILE] },
              ],
            },
          },
        },
      );
      if (loanData == k500Error) return kInternalError;
      if (loanData?.length == 0) return {};

      const loanIDs = loanData.map((loan) => loan.id);
      let otherDetails = {
        isHistory: 1,
      };
      // update loans old legal as history
      const legalData = await this.legalCollectionRepo.updateRowWhereData(
        { otherDetails },
        { where: { loanId: loanIDs } },
      );
      if (legalData == k500Error) return kInternalError;
      // Make loan to eligible for legal
      await this.loanRepo.updateRowData(
        { legalType: null, legalId: null },
        loanIDs,
      );
      let fullPayTranIds = fullpayTransaction.map((tran) => tran.id);
      // make old transaciton as proccessed
      await this.transactionRepo.updateRowData(
        { remarks: 'LEGAL_PROCESS' },
        fullPayTranIds,
      );
      return loanIDs;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  async removeAllUpcomingEmiNotice() {
    try {
      const loanInclude = {
        model: loanTransaction,
        where: {
          loanStatus: 'Active',
        },
        attributes: ['id', 'loanStatus'],
      };
      //check all the active and not processed legal
      //check loan tenue over or not
      const attributes = [
        'id',
        'loanId',
        'emi_date',
        'payment_status',
        'payment_due_status',
      ];
      const emiOptions: any = {
        where: {
          partOfemi: 'LAST',
          payment_status: '0',
          payment_due_status: '0',
        },
        include: [loanInclude],
      };
      //get all the emi data
      const emiData = await this.emiRepo.getTableWhereData(
        attributes,
        emiOptions,
      );
      if (emiData == k500Error) return kInternalError;
      let loanIDs = emiData.map((emi) => emi.loanId);
      const legalData = await this.legalCollectionRepo.getTableWhereData(
        ['id', 'type', 'subType', 'createdAt', 'loanId'],
        {
          where: {
            type: {
              [Op.in]: [LEGAL_PROCESS, CASE_TOBE_FILE],
            },
            [Op.or]: [
              { subType: { [Op.eq]: null } },
              {
                loanId: loanIDs,
              },
            ],
            otherDetails: {
              isHistory: { [Op.or]: [-1, null] },
              isAssign: { [Op.or]: [-1, null] },
            },
          },
        },
      );
      if (legalData == k500Error) return kInternalError;
      loanIDs = legalData.map((legal) => legal.loanId);

      let otherDetails = {
        isHistory: 1,
      };
      // update loans old legal as history
      const updateLEgal = await this.legalCollectionRepo.updateRowWhereData(
        { otherDetails },
        { where: { loanId: loanIDs } },
      );
      if (updateLEgal == k500Error) return kInternalError;
      console.log('LEGAL_UPDATE', updateLEgal[0]);
      // Make loan to eligible for legal
      const updateLegalLoans = await this.loanRepo.updateRowData(
        { legalType: null, legalId: null },
        loanIDs,
      );
      if (updateLegalLoans == k500Error) return kInternalError;
      console.log('LEGAL_LOANS', updateLegalLoans[0]);

      // make old transaciton as proccessed
      const fullpayTransaction = await this.transactionRepo.getTableWhereData(
        ['id', 'subscriptionDate', 'loanId'],
        {
          where: {
            loanId: loanIDs,
            status: 'FAILED',
            type: 'FULLPAY',
            adminId: SYSTEM_ADMIN_ID,
            remarks: { [Op.ne]: 'LEGAL_PROCESS' },
            [Op.or]: [{ source: 'AUTOPAY' }, { subSource: 'AUTODEBIT' }],
          },
        },
      );
      if (fullpayTransaction == k500Error) return kInternalError;
      if (fullpayTransaction?.length == 0) return {};
      let fullPayTranIds = fullpayTransaction.map((tran) => tran.id);
      const udpateLEgalTransation = await this.transactionRepo.updateRowData(
        { remarks: 'LEGAL_PROCESS' },
        fullPayTranIds,
      );
      console.log('LEGAL_PROCESS_TRANACTION', udpateLEgalTransation[0]);

      return loanIDs;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
