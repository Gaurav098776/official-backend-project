import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { PAGE_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { admin } from 'src/entities/admin.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { registeredUsers } from 'src/entities/user.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { EmploymentRepository } from 'src/repositories/employment.repository';
import { SalarySlipRepository } from 'src/repositories/salarySlip.repository';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class SalaryService {
  constructor(
    private readonly repository: SalarySlipRepository,
    private readonly empRepo: EmploymentRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly commonSharedService: CommonSharedService,
  ) {}

  //#region get salaty slip verifiaction data
  async getSalarySlipData(query) {
    try {
      /// pre pare options
      const options = this.salarySlipDataOptions(query);

      if (options?.message) return options;
      /// find row data of salary slip
      const salarySlipData = await this.findRowData(options);
      if (salarySlipData?.message) return salarySlipData;
      /// prepare salary slip data
      const finalData: any = this.prePareSlipRowData(salarySlipData?.rows);
      if (finalData?.message) return finalData;
      return { count: salarySlipData.count, rows: finalData };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  // #endregion

  //#region salary slip options fun
  private salarySlipDataOptions(query) {
    try {
      const status = query?.status ?? '0';
      const page = query?.page ?? 1;
      const sizePage = query?.sizePage ?? PAGE_LIMIT;
      const searchText = query?.searchText;
      const startDate = query?.startDate ?? null;
      const endDate = query?.endDate ?? null;
      const download = query?.download ?? 'false';
      const toDay = this.typeService.getGlobalDate(new Date());
      //// where condition
      const where: any = {
        companyVerification: { [Op.or]: ['1', '3'] },
        salarySlipId: { [Op.ne]: null },
        workMailId: { [Op.ne]: null },
      };
      if (status != '0' && startDate && endDate) {
        const range = this.typeService.getUTCDateRange(
          startDate.toString(),
          endDate.toString(),
        );
        where.createdAt = { [Op.gte]: range.fromDate, [Op.lte]: range.endDate };
      }

      const salarySlipWhere: any = {};
      if (status === '1') salarySlipWhere.status = { [Op.or]: ['1', '3'] };
      else if (status != '4') salarySlipWhere.status = status;
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

      /// work email condition
      const emailWhere: any = {};
      if (status === '0') {
        emailWhere.status = { [Op.ne]: '2' };
        userWhere.NextDateForApply = {
          [Op.or]: [{ [Op.lte]: toDay.toJSON() }, { [Op.eq]: null }],
        };
        where.bankingId = { [Op.ne]: null };
      }

      /// user model
      const userInclude = {
        model: registeredUsers,
        where: { ...userWhere, ...searchWhere },
        attributes: ['fullName', 'phone', 'city'],
      };
      // salary slip model
      const salarySlipAttributes = [
        'url',
        'status',
        'salaryVerifiedDate',
        'createdAt',
        'updatedAt',
        'netPayAmount',
        'rejectReason',
      ];
      const salaryInclude = {
        model: SalarySlipEntity,
        where: salarySlipWhere,
        salarySlipAttributes,
        include: [{ model: admin, attributes: ['fullName'] }],
      };
      const workMailInclude = {
        model: WorkMailEntity,
        attributes: ['id'],
        where: emailWhere,
      };

      const options: any = { distinct: true, where };
      options.include = [userInclude, salaryInclude, workMailInclude];
      options.order = [['updatedAt', 'DESC']];
      if (status != '0' && download != 'true') {
        options.offset = (+page ?? 1) * sizePage - sizePage;
        options.limit = sizePage;
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
      const attributes = ['id', 'userId', 'companyName', 'updatedAt'];
      const result = await this.empRepo.getTableWhereDataWithCounts(
        attributes,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      result.rows.forEach((ele) => {
        ele.user.phone = this.cryptService.decryptPhone(ele.user.phone);
      });
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region pre pare slip row Data
  private prePareSlipRowData(list: any[]) {
    try {
      const finalData = [];
      list.forEach((ele) => {
        try {
          const tempData: any = {};
          const slip = ele?.salarySlip;

          const period =
            JSON.parse(slip.response).employeeDetails?.SalaryPeriod ?? '-';

          let lastUpdate = (
            slip?.salaryVerifiedDate ?? slip?.updatedAt
          ).toJSON();

          lastUpdate = this.typeService.getDateFormatted(lastUpdate);
          const createdAt = this.typeService.getDateFormatted(
            slip?.createdAt?.toJSON(),
          );

          tempData['Mobile number'] = ele?.user?.phone;
          tempData['Name'] = ele?.user?.fullName ?? '-';

          tempData['Company name'] = ele?.companyName ?? '-';
          tempData['Salary slip'] = slip?.url ?? '-';
          tempData['Net salary'] = slip?.netPayAmount ?? '-';
          tempData['Salary period'] = period;
          tempData['City'] = ele?.user?.city ?? '-';
          tempData['Created at'] = createdAt;
          tempData['Last updated'] = lastUpdate;
          tempData['Last action by'] = slip?.admin?.fullName;
          tempData['userId'] = ele?.userId;
          tempData['Reject reason'] = slip?.rejectReason ?? '-';
          tempData['Status'] = slip?.status;

          finalData.push(tempData);
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region salary slip history
  async fetchUserSalarySlipDetailsHistory(query) {
    try {
      const userId = query.userId;
      if (!userId) return kParamMissing('userId');
      const salarySlipAttr = [
        'id',
        'userId',
        'url',
        'salarySlipDate',
        'status',
        'response',
        'createdAt',
        'netPayAmount',
        'approveById',
      ];
      const salarySlipOptions = {
        where: {
          userId,
        },
        order: [['id', 'DESC']],
        include: [
          {
            model: admin,
            attributes: ['fullName'],
          },
        ],
      };
      // find the salary slip data for employment history
      const salarySlip = await this.repository.findAll(
        salarySlipAttr,
        salarySlipOptions,
      );

      if (salarySlip === k500Error) return kInternalError;
      if (!salarySlip) return [];

      // prepare data for salary slip data for employment history
      const response: any = await this.prepareDataEmploymentSalaryslipHistory(
        salarySlip,
      );
      if (response?.message) return kInternalError;
      return response;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  async prepareDataEmploymentSalaryslipHistory(listSalarySlip) {
    const finalData = [];
    try {
      for (const element of listSalarySlip) {
        try {
          let updateDataObject = {};
          updateDataObject['userId'] = element?.userId;
          updateDataObject['Upload date'] =
            await this.typeService.getDateFormatted(element?.createdAt);
          updateDataObject['ID'] = element?.id;
          updateDataObject['view'] = element?.url;
          const date = element?.salarySlipDate
            ? new Date(element?.salarySlipDate)
            : null;
          updateDataObject['Salary slip month'] = date
            ? this.typeService.getMonth(date.getMonth())
            : '-';
          updateDataObject['Net pay'] = element?.netPayAmount;
          updateDataObject['Status'] = element?.status;
          const adminName =
            (await this.commonSharedService.getAdminData(element?.approveById))
              ?.fullName ?? '-';
          updateDataObject['Last action by'] = adminName;

          if (element?.response) {
            const response = JSON.parse(element.response);
            if (response?.Type === 'Offer Letter') {
              updateDataObject['type'] = 'Offer Letter';
            } else if (response?.Type === 'BankStatement') {
              updateDataObject['type'] = 'Bank Statement';
              if (response?.bank_name)
                updateDataObject['bankName'] = response.bank_name;
            } else if (response?.Type === 'Invalid document') {
              updateDataObject['type'] = 'Invalid document';
            } else if (response?.Type === 'Salary Slip') {
              updateDataObject['type'] = 'Salary Slip';
            } else {
              updateDataObject['type'] = 'Other Document';
            }
          }
          finalData.push(updateDataObject);
        } catch (error) {}
      }
      return finalData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
