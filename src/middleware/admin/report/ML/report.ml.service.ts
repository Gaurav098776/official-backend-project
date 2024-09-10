import { Op, Sequelize } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { CryptService } from 'src/utils/crypt.service';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { TypeService } from 'src/utils/type.service';
import { LoanRepository } from 'src/repositories/loan.repository';
import { registeredUsers } from 'src/entities/user.entity';
import { KYCEntity } from 'src/entities/kyc.entity';
import { AddressesEntity } from 'src/entities/addresses.entity';
import { crmActivity } from 'src/entities/crm.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { loanTransaction } from 'src/entities/loan.entity';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { employmentDetails } from 'src/entities/employment.entity';
import { SalarySlipEntity } from 'src/entities/salarySlip.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import {
  familyList,
  MAX_BEARING_LIMIT,
  MAX_LAT_LIMIT,
} from 'src/constants/globals';
import { DeviceSIMRepository } from 'src/repositories/deviceSIM.repository';
import { DeviceInfoInstallAppRepository } from 'src/repositories/deviceInfoInstallApp.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { EmiEntity } from 'src/entities/emi.entity';
import { BankingEntity } from 'src/entities/banking.entity';
import { employmentDesignation } from 'src/entities/designation.entity';
import { employmentType } from 'src/entities/employment.type';
import { employmentSector } from 'src/entities/sector.entity';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { TransactionEntity } from 'src/entities/transaction.entity';

@Injectable()
export class ReportMLService {
  constructor(
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly conatctsRepo: UniqueConatctsRepository,
    private readonly simRepo: DeviceSIMRepository,
    private readonly deviceInfoRepo: DeviceInfoInstallAppRepository,
    private readonly locationRepo: LocationRepository,
    private readonly mailRepo: MailTrackerRepository,
  ) {}

  //#region user master Data for ML
  async findMasterDataForML() {
    try {
      if (process.env.MODE == 'PROD') return k422ErrorMessage();
      const options = this.prePareOptionsForML();
      if (options?.message) return options;
      const userData = await this.findDataFromOptio(options);
      if (userData.message) return userData;
      const finalData: any = await this.prePareRowDataForML(userData);
      if (finalData?.message) return finalData;
      const fileName = new Date().toJSON() + '---ml.xlsx';
      const lastEmiData: any = {
        sheets: ['ML'],
        data: [finalData],
        sheetName: fileName,
      };
      await this.typeService._objectToExcel(lastEmiData);
      // return finalData;
    } catch (error) {}
  }
  //#endregion

  //#region prePare options for ML
  private prePareOptionsForML() {
    try {
      const options: any = {
        // where: {
        //   id: [
        //     'e68df872-9c27-485f-8131-b79536b2728f',
        //     '003d73b0-5047-4cb3-80bf-82ae069114db',
        //     '0002031a-aace-42d2-8285-7bee804199eb',
        //   ],
        // },
      };
      //#region include
      ///crm
      const crmModel = {
        model: crmActivity,
        attributes: ['id', 'loanId', 'createdAt'],
        where: {
          loanId: { [Op.ne]: null },
          titleId: [30, 34, 35, 36, 37, 39, 40, 41, 46],
        },
        required: false,
      };
      /// address
      const addressModel = {
        model: AddressesEntity,
        attributes: ['id', 'status'],
        where: { status: '1' },
        required: false,
      };
      /// kyc
      const kycModel = {
        model: KYCEntity,
        attributes: ['aadhaarDOB', 'aadhaarAddress'],
      };

      /// transaction
      const transModel = {
        model: TransactionEntity,
        attributes: ['id', 'source', 'subSource'],
        where: { status: 'COMPLETED' },
        required: false,
      };
      /// emi
      const emiModel = {
        model: EmiEntity,
        attributes: ['id', 'emi_date', 'payment_done_date', 'penalty_days'],
      };
      /// banking
      const bankingModel = {
        model: BankingEntity,
        attributes: ['id', 'adminSalary', 'salary'],
      };
      // loan
      const loanInclude: any = { model: loanTransaction };
      loanInclude.where = {
        loanStatus: ['Active', 'Complete', 'Rejected'],
        bankingId: { [Op.ne]: null },
        approvedDuration: { [Op.ne]: null },
      };
      loanInclude.include = [bankingModel, emiModel, transModel];
      loanInclude.attributes = [
        'id',
        'loanStatus',
        'interestRate',
        'duration',
        'approvedDuration',
        'netScore',
        'loan_disbursement_date',
      ];
      /// empl
      const slipModel = { model: SalarySlipEntity, attributes: ['status'] };
      const workModel = { model: WorkMailEntity, attributes: ['status'] };
      const desiModel = {
        model: employmentDesignation,
        attributes: ['designationName'],
      };
      const typeModel = { model: employmentType, attributes: ['typeName'] };
      const sectorModel = {
        model: employmentSector,
        attributes: ['sectorName'],
      };
      const empModel: any = {
        model: employmentDetails,
        attributes: ['companyName', 'startDate'],
        include: [slipModel, workModel, desiModel, typeModel, sectorModel],
      };
      options.include = [
        kycModel,
        addressModel,
        crmModel,
        loanInclude,
        empModel,
      ];
      //#endregion

      return options;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find data from options
  private async findDataFromOptio(options) {
    try {
      const att = [
        'id',
        'completedLoans',
        'gender',
        'city',
        'state',
        'isUnInstallApp',
      ];
      const result = await this.userRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region prePare row Data for ML
  private async prePareRowDataForML(userData) {
    try {
      const len = userData.length;
      console.log('totle', len);
      const finalList = [];
      const emailData = await this.getCountOfEmailDelived(userData);
      for (let index = 0; index < len; index++) {
        // for (let index = 0; index < 1; index++) {
        try {
          if (index % 100 === 0)
            console.log(new Date().toJSON(), (index * 100) / len);
          const user = userData[index];
          const id = user.id;
          const conatctData = await this.findContect(user);
          const infoData = await this.findDiveInfoAndOther(id);
          const nearBy = await this.findNearestUser(id);
          const emp = user?.employmentData;
          const loan = user?.loanData;
          const ageData = this.findAge(user?.kycData?.aadhaarDOB);
          const isAddress = user?.addressData.length > 0 ? 'YES' : 'No';
          const diffInday = this.typeService.dateDifference(
            emp.startDate,
            new Date(),
          );

          const slip = emp?.salarySlip?.status == '1' ? 'System' : 'Manual';
          const workStatus = emp?.workMail?.status;
          const work =
            workStatus == '1'
              ? 'System'
              : workStatus == '4'
              ? 'Skip'
              : 'Manual';

          const findEmial = emailData.find((f) => f.userId == id);
          const countEmil = findEmial?.count ?? 0;
          const addressData = this.getCityState(user);
          for (let i = 0; i < loan.length; i++) {
            try {
              const ele = loan[i];
              const bank = this.findApprovedSalary(ele?.bankingData);
              const crmData = this.getCRMCallingCount(user?.crmList, ele);
              const emiData = this.getRepaymenstData(ele);
              const temp: any = {
                loanId: ele.id,
                'Completed Loans': user?.completedLoans ?? 0,
                Age: ageData.age,
                'Age range': ageData.ageRange,
                Gender: (user?.gender ?? 'NA').toLowerCase(),
                'Interest Rate': ele?.interestRate ?? 'NA',
                'Loan tenure': ele?.approvedDuration ?? '-1',
                'Net score': ele?.netScore ?? '-1',
                'Address verified with e-com': isAddress,
                City: addressData.city,
                State: addressData.state,
                'Total phone contact count': conatctData.total,
                'Family contact count': conatctData.family,
                'Sir / Madam contact count': conatctData?.sir,
                'Office contact count': conatctData?.office,
                'HR contact count': conatctData?.hr,
                'Sim operator': infoData.sim,
                'Mobile Handset': infoData.handset,
                'OS version': infoData.os,
                'Nearest/Defaulter/Blocked user count': nearBy.defaulter,
                'Normal user count': nearBy.normal,
                'Approved Salary': bank.salary,
                'Salary range': bank.salaryRange,
                Company: emp?.companyName ?? 'NA',
                'Employed since in days': diffInday ?? 'NA',
                Type: emp?.employementTypeData?.typeName ?? 'NA',
                Sector: emp?.sector?.sectorName ?? 'NA',
                Designation: emp?.designation?.designationName ?? 'NA',
                'Salary slip verified': slip,
                'Work email verified': work,
                'Crm precalling count': crmData.pre,
                'Crm ondue calling count': crmData.onDue,
                'Crm postcalling count': crmData.post,
                'Is app uninstalled': user?.isUnInstallApp ? 'YES' : 'NO',
                'Email delivered count': countEmil,
                'Loan status': this.getLoanStatus(ele),
                'Repayment status': emiData.rePaied,
                'Delayed days': emiData.delay,
                'Repayment via': this.getPaidVia(ele?.transactionData),
              };

              finalList.push(temp);
            } catch (error) {}
          }
        } catch (error) {}
      }
      return finalList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get citi State
  private getCityState(user) {
    const data = { city: 'NA', state: 'NA' };
    try {
      let address = user?.kycData?.aadhaarAddress ?? '';
      if (address) address = JSON.parse(user?.kycData?.aadhaarAddress);
      let city = (user?.city ?? '').trim();
      let state = (user?.state ?? '').trim();
      if (address) {
        if (!city || !state) {
          city = (address['dist'] ?? 'NA').trim();
          state = (address['state'] ?? 'NA').trim();
        }
      }
      if (!city) city = 'NA';
      if (!state) state = 'NA';
      data.city = city.trim() ?? 'NA';
      data.state = state.trim() ?? 'NA';
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get loan status
  private getLoanStatus(loan) {
    let loanStatus = 'NA';
    try {
      if (loan?.loanStatus === 'Rejected') loanStatus = 'Rejected';
      else {
        const find = loan?.emiData.find((f) => (f?.penalty_days ?? 0) > 0);
        if (find) loanStatus = 'Default';
        else loanStatus = 'Approved';
      }
    } catch (error) {}
    return loanStatus;
  }
  //#endregion

  //#region find contect and get counts
  private async findContect(user) {
    const data = { total: 0, family: 0, sir: 0, office: 0, hr: 0 };
    try {
      const userId = user.id;
      const att = ['name'];
      const result = await this.conatctsRepo.findUserContact(att, userId);
      if (!result || result === k500Error) return data;
      data.total = result.length;
      let companyName = user?.employmentData?.companyName ?? '';
      companyName = companyName.toLowerCase().split(' ');
      for (let index = 0; index < result.length; index++) {
        try {
          const name: string = (result[index].name[userId] ?? '').toLowerCase();
          /// office
          for (let i = 0; i < companyName.length; i++) {
            const txt: string = companyName[i] ?? '';
            if (name.includes(txt) && txt.length > 2) {
              data.office += 1;
              break;
            }
          }
          // sir madam
          if (
            name.startsWith('sir ') ||
            name.endsWith(' sir') ||
            name.includes('madam')
          )
            data.sir += 1;
          // hr
          if (name.startsWith('hr ') || name.endsWith(' hr')) data.hr += 1;
          /// family
          for (let i = 0; i < familyList.length; i++) {
            try {
              const tempTxt = familyList[i];
              if (name.includes(tempTxt)) {
                data.family += 1;
                break;
              }
            } catch (error) {}
          }
        } catch (error) {}
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region find dive info and other
  private async findDiveInfoAndOther(userId) {
    const data = { sim: 'NA', handset: 'NA', os: 'NA' };
    try {
      const att = ['id', 'operatorName'];
      const opti = { order: [['id', 'desc']], where: { userId } };
      const simData = await this.simRepo.getRowWhereData(att, opti);
      const att1 = ['id', 'deviceId', 'deviceInfo'];
      const appInfo = await this.deviceInfoRepo.getTableWhereData(att1, opti);
      if (!appInfo || appInfo === k500Error) return data;
      for (let index = 0; index < appInfo.length; index++) {
        try {
          const info = JSON.parse(appInfo[index]?.deviceInfo ?? '');
          if (info) {
            data.handset = info?.brand ?? info?.localizedModel ?? '';
            data.os = info?.sdkInt_version ?? info?.systemVersion ?? '';
          }
        } catch (error) {}
      }
      data.sim = simData?.operatorName ?? 'NA';
      if (!((data?.sim).trim() ?? '')) data.sim = 'NA';
      if (!((data?.handset).trim() ?? '')) data.handset = 'NA';
      if (!((data?.os).trim() ?? '')) data.os = 'NA';
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region find nearest user
  private async findNearestUser(userId) {
    const data = { defaulter: 0, normal: 0 };
    try {
      const att = ['id', 'bearing', 'lat', 'long'];
      const result = await this.locationRepo.getTableWhereData(att, {
        where: { userId },
      });
      if (!result || result === k500Error) return data;
      const rowData = this.removeClosestDuplicates(result);
      return await this.getNearestByAllLocations(rowData, userId);
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region remove close duplicate
  private removeClosestDuplicates(locations) {
    const accurateLocations = [];
    try {
      for (let index = 0; index < locations.length; index++) {
        try {
          const locationData = locations[index];
          const isAdded = accurateLocations.find((element) => {
            const lat = parseFloat(element.lat);
            const difference = Math.abs(lat - parseFloat(locationData.lat));
            return difference <= MAX_LAT_LIMIT;
          });
          if (!isAdded) accurateLocations.push(locationData);
        } catch (erorr) {}
      }
    } catch (error) {}
    return accurateLocations;
  }
  //#endregion

  //#region  git data from db
  private async getNearestByAllLocations(locations, userId: string) {
    const data = { defaulter: 0, normal: 0 };
    try {
      const tempArray = [];
      for (let index = 0; index < locations.length; index++) {
        try {
          const location = locations[index];
          const maxBearingLimit = location.bearing + MAX_BEARING_LIMIT;
          const minBearingLimit = location.bearing - MAX_BEARING_LIMIT;
          const maxLat = (parseFloat(location.lat) + MAX_LAT_LIMIT).toString();
          const minLat = (parseFloat(location.lat) - MAX_LAT_LIMIT).toString();
          tempArray.push({
            bearing: { [Op.lte]: maxBearingLimit, [Op.gte]: minBearingLimit },
            lat: { [Op.lte]: maxLat, [Op.gte]: minLat },
          });
        } catch (error) {}
      }

      const att = ['userId'];
      const orp = {
        where: { [Op.or]: tempArray, userId: { [Op.ne]: userId } },
      };
      const result = await this.locationRepo.getTableWhereData(att, orp);
      if (!result || result === k500Error) return data;
      const userList = [];
      result.forEach((ele) => {
        try {
          userList.push(ele.userId);
        } catch (error) {}
      });
      if (userList.length > 0) {
        const options = {
          where: { id: userList },
          include: [
            {
              model: EmiEntity,
              attributes: ['payment_due_status', 'payment_status'],
            },
          ],
        };
        const att1 = ['id', 'isBlacklist'];
        const userData = await this.userRepo.getTableWhereData(att1, options);
        if (!userData || userData === k500Error) return data;
        for (let index = 0; index < userData.length; index++) {
          const user = userData[index];
          if (user?.isBlacklist === '1') data.defaulter += 1;
          else {
            const find = user?.emiData.find(
              (f) => (f?.payment_due_status ?? '') === '1',
            );
            if (find) data.defaulter += 1;
            else data.normal += 1;
          }
        }
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region  get count of emial delived
  private async getCountOfEmailDelived(userData) {
    try {
      const userId = [...new Set(userData.map((item) => item.id))];
      const att: any = [
        [Sequelize.fn('Count', Sequelize.col('status')), 'count'],
        'userId',
      ];
      const options = {
        where: { userId, status: ['Done', 'Received'], type: 'EMAIL' },
        group: ['userId'],
      };
      const result = await this.mailRepo.getTableWhereData(att, options);
      if (!result || result === k500Error) return [];
      return result;
    } catch (error) {}
    return [];
  }
  //#endregion

  //#region find age
  private findAge(aadhaarDOB) {
    const data = { age: 'NA', ageRange: 'NA' };
    try {
      if (aadhaarDOB) {
        aadhaarDOB += 'T10:00:00.000Z';
        const diff = this.typeService.dateDifference(
          new Date(aadhaarDOB),
          new Date(),
          'Years',
        );
        data.age = diff.toFixed();
        const start = Math.floor(diff / 5) * 5 + 1;
        const end = start + 4;
        data.ageRange = start.toFixed() + ' - ' + end.toFixed();
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region approved salary
  private findApprovedSalary(bankData) {
    const data = { salary: 'NA', salaryRange: 'NA' };
    try {
      const salary = bankData?.adminSalary ?? bankData?.salary;
      if (salary) {
        data.salary = salary.toFixed();
        const start = Math.floor(salary / 5000) * 5000 + 1;
        const end = start + 4999;
        data.salaryRange = start.toFixed() + ' - ' + end.toFixed();
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get crm calling count
  private getCRMCallingCount(crmList, loan) {
    const data = { pre: 0, onDue: 0, post: 0 };
    try {
      const filter = crmList.filter((f) => f.loanId == loan.id);
      if (filter.length > 0) {
        filter.forEach((crm) => {
          const date = loan?.loan_disbursement_date;
          if (date) {
            try {
              if (crm.createdAt.getTime() <= new Date(date).getTime())
                data.pre += 1;
              else {
                const emiData = loan.emiData;
                emiData.sort((b, a) => a.id - b.id);
                const find = emiData.find((f) => (f?.penalty_days ?? 0) > 0);
                if (find)
                  if (
                    crm.createdAt.getTime() >= new Date(find.emi_date).getTime()
                  )
                    data.post += 1;
                  else data.onDue += 1;
                else data.onDue += 1;
              }
            } catch (error) {}
          } else data.pre += 1;
        });
      }
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get repaymenst data
  private getRepaymenstData(loanData) {
    const data = { rePaied: 'NA', delay: 0 };
    try {
      const emiData = loanData?.emiData;
      emiData.sort((a, b) => a.id - b.id);
      for (let index = 0; index < emiData.length; index++) {
        const emi = emiData[index];
        if (emi?.payment_done_date) {
          const emiDate = new Date(emi.emi_date).getTime();
          const paidedDate = new Date(emi.payment_done_date).getTime();
          if (emiDate > paidedDate) data.rePaied = 'Prepayment';
          else if (emiDate === paidedDate) data.rePaied = 'Ontime';
          else if (emiDate < paidedDate) data.rePaied = 'Post due';
        }
        data.delay += emi?.penalty_days ?? 0;
      }
      if (loanData?.loanStatus === 'Active' && data.rePaied == 'NA')
        data.rePaied = 'InProgress';
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region get paid via
  private getPaidVia(transactionData) {
    let via = '';
    try {
      for (let index = 0; index < transactionData.length; index++) {
        const tran = transactionData[index];
        let temp = '';
        if (tran?.source === 'AUTOPAY') temp = 'AUTODEBIT';
        else temp = tran?.subSource ?? '';
        if (!via.includes(temp)) via += temp + ', ';
      }
    } catch (error) {}
    if (!via) via = 'NA';
    return via;
  }
  //#endregion
}
