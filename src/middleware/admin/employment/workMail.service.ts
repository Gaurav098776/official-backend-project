import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { PAGE_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound } from 'src/constants/strings';
import { BankingEntity } from 'src/entities/banking.entity';
import { MailTrackerArchive } from 'src/entities/maiTracker.archive.entity';
import { MailTrackerEntity } from 'src/entities/mail.tracker.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class WorkMailService {
  constructor(
    private readonly empRepo: EmploymentRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly CommonSharedService: CommonSharedService,
    private readonly repository: WorkMailRepository,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly repoManager: RepositoryManager,
  ) {}

  //#region get workEmail data fun
  async getWorkMailData(query) {
    try {
      const options = this.getWorkEmailDataOptions(query);
      if (options?.message) return options;

      /// find row data of Work Mails
      const workMailData = await this.findRowData(options);
      if (workMailData?.message) return workMailData;

      //// Preparing Work Mail data
      const finalData = await this.prepareWorkMailData(workMailData?.rows);
      return { count: workMailData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region workEmail data options
  private getWorkEmailDataOptions(query) {
    try {
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const sizePage = query?.sizePage ?? PAGE_LIMIT;
      const searchText = query?.searchText;
      const startDate = query?.startDate ?? null;
      const endDate = query?.endDate ?? null;
      const download = query?.download ?? 'false';
      const toDay = this.typeService.getGlobalDate(new Date());
      /// where condition
      let workMailWhere: any = {};
      if (status === '1') workMailWhere.status = { [Op.or]: ['1', '3'] };
      else if (status === '0')
        workMailWhere = { [Op.or]: [{ status: '0' }, { tempStatus: '0' }] };
      else if (status === '2') workMailWhere.status = '2';
      else if (status === '7') workMailWhere.status = '4';

      if (status != '0' && startDate && endDate) {
        const range = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        workMailWhere.createdAt = {
          [Op.gte]: range.fromDate,
          [Op.lte]: range.endDate,
        };
      }
      /// user where
      const userWhere: any = {
        isBlacklist: { [Op.ne]: '1' },
        homeStatus: { [Op.ne]: '-1' },
      };
      let searchWhere: any = {};
      if (searchText) {
        let encryptedSearch = '';
        if (!isNaN(searchText)) {
          encryptedSearch = this.cryptService.encryptPhone(searchText);
          encryptedSearch = encryptedSearch.split('===')[1];
        }
        searchWhere = {
          [Op.or]: [
            { fullName: { [Op.iRegexp]: searchText } },
            {
              phone: {
                [Op.like]: encryptedSearch ? '%' + encryptedSearch + '%' : null,
              },
            },
          ],
        };
      }
      /// company where
      const empWhere: any = {
        companyVerification: { [Op.or]: ['1', '3'] },
        workMailId: { [Op.ne]: null },
        salarySlipId: { [Op.ne]: null },
      };
      /// salary slip
      const salarySlipWhere: any = {};
      const bankingWhere: any = {};
      if (status === '0') {
        userWhere.NextDateForApply = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
        empWhere.bankingId = { [Op.ne]: null };
        salarySlipWhere.status = { [Op.or]: ['1', '3'] };
        bankingWhere.salaryVerification = { [Op.or]: ['1', '3'] };
      }

      /// temp email
      const attributes = ['email', 'status', 'rejectReason', 'approveById'];
      attributes.push('tempEmail');
      attributes.push('tempStatus');

      const options: any = {
        order: [['updatedAt', 'DESC']],
        where: empWhere,
        distinct: true,
        include: [
          {
            model: SalarySlipEntity,
            attributes: [],
            where: salarySlipWhere,
          },
          {
            model: registeredUsers,
            attributes: ['id', 'fullName', 'city', 'phone'],
            where: { ...userWhere, ...searchWhere },
          },
          {
            model: WorkMailEntity,
            where: workMailWhere,
            attributes,
          },
          {
            model: BankingEntity,
            where: bankingWhere,
            attributes: [],
          },
        ],
      };
      if (status != '0' && download != 'true') {
        options.offset = (+page ?? 1) * PAGE_LIMIT - PAGE_LIMIT;
        options.limit = PAGE_LIMIT;
      }
      return options;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find row data
  private async findRowData(options) {
    try {
      const attributes = [
        'userId',
        'companyName',
        'companyStatus',
        'createdAt',
        'updatedAt',
        'emailVerificationType',
        'workMailId',
        'companyUrl',
      ];
      const result = await this.empRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      result.rows.forEach((element) => {
        element.user.phone = this.cryptService.decryptPhone(element.user.phone);
      });
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  private async prepareWorkMailData(list) {
    const finalData = [];
    try {
      for (let index = 0; index < list.length; index++) {
        const element = list[index];
        try {
          const tempData: any = {};
          const workMail = element?.workMail;
          let lastUpdate = workMail?.verifiedDate ?? element?.updatedAt;
          lastUpdate ? (lastUpdate = lastUpdate.toJSON()) : '-';
          lastUpdate = this.typeService.getDateFormatted(lastUpdate);
          const createdAt = this.typeService.getDateFormatted(
            element?.createdAt.toJSON(),
          );
          tempData['Mobile number'] = element?.user?.phone;
          tempData['Name'] = element?.user?.fullName ?? '-';
          tempData['Company name'] = element?.companyName ?? '-';
          tempData['Work email'] = element?.workMail?.email ?? '-';
          tempData['Company URL'] = element?.companyUrl;
          tempData['City'] = element?.user?.city ?? '-';
          tempData['Created at'] = createdAt;
          tempData['Last updated'] = lastUpdate;
          tempData['Last action by'] =
            (await this.CommonSharedService.getAdminData(workMail?.approveById))
              ?.fullName ?? 'SYSTEM';
          tempData['userId'] = element?.userId;
          tempData['Email verification type'] =
            element?.emailVerificationType ?? '-';
          tempData['Reject reason'] = workMail?.rejectReason ?? '-';
          tempData['Status'] = workMail?.status ?? '';
          tempData['tempEmail'] = workMail?.tempEmail ?? '-';
          tempData['tempStatus'] = workMail?.tempStatus;
          finalData.push(tempData);
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
    return finalData;
  }

  async fetchUserWorkEmailDetailsHistory(reqData) {
    try {
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const attributes = [
        'id',
        'userId',
        'email',
        'status',
        'createdAt',
        'approveById',
      ];
      const options = {
        where: { userId },
        order: [['id', 'DESC']],
      };
      // find data of work email
      const workEmail = await this.repository.findAll(attributes, options);
      if (!workEmail || !workEmail.length)
        return k422ErrorMessage(kNoDataFound); // if  we are not able to find any data
      if (workEmail == k500Error) return kInternalError;

      // Prepare data for work email
      const response: any = await this.prepareDataEmploymentWorkmailHistory(
        workEmail,
      );
      if (response?.message) return kInternalError;
      return response;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async prepareDataEmploymentWorkmailHistory(listWorkEmail) {
    const finalData = [];
    try {
      for (const element of listWorkEmail) {
        try {
          let updateDataObject = {};
          updateDataObject['userId'] = element?.userId;
          updateDataObject['ID'] = element?.id;
          updateDataObject['Work email'] =
            element?.email == '' ? '-' : element?.email ?? '-';
          updateDataObject['Status'] = element?.status;
          updateDataObject['Date'] = this.typeService.getDateFormatted(
            element?.createdAt,
          );
          const adminName =
            (await this.CommonSharedService.getAdminData(element?.approveById))
              ?.fullName ?? '-';
          updateDataObject['Last action by'] = adminName;
          finalData.push(updateDataObject);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // Archive notification older than 6 months
  async archiveOldNotifications() {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 180);
    const options = {
      where: {
        type: 'NOTIFICATION',
        createdAt: { [Op.lte]: pastDate.toJSON() },
      },
      limit: 10000,
    };

    // Find old notifications
    const oldNotifications = await this.mailTrackerRepo.getTableWhereData(
      [
        'id',
        'userId',
        'loanId',
        'type',
        'title',
        'status',
        'subStatus',
        'isSender',
        'refrenceId',
        'response',
        'statusDate',
        'source',
        'content',
        'requestData',
        'sentBy',
        'legalId',
        'service',
        'notificationFlag',
        'createdAt',
        'updatedAt',
      ],
      options,
    );
    if (oldNotifications == k500Error) throw new Error();

    if (oldNotifications.length > 0) {
      const createData = await this.repoManager.bulkCreate(
        MailTrackerArchive,
        oldNotifications,
      );
      if (createData == k500Error) throw new Error();

      const mailIds = oldNotifications.map((el) => el.id);
      const deleteData = await this.repoManager.deleteWhereData(
        MailTrackerEntity,
        { where: { id: { [Op.in]: mailIds } } },
        false
      );
      if (deleteData == k500Error) throw new Error();
    }
    return true;
  }
}
