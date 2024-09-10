// Imports
import { Op } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import { kInternalError } from 'src/constants/responses';
import { CompanyRepository } from 'src/repositories/google.company.repository';

@Injectable()
export class InstaFinancialService {
  constructor(
    private readonly api: APIService,
    private companyRepo: CompanyRepository,
  ) {}

  async searchCompany(searchStr) {
    try {
      if (!searchStr || searchStr?.length <= 2) return [];
      searchStr = searchStr.toUpperCase();

      let companyList = [];
      // Check locally in database
      companyList = await this.getCompanyDataLocally(searchStr);
      if (companyList.length > 0) return companyList;

      // LLP company search
      const llpURL = 'GetLLPNames';
      const llpData = await this.getCompanyRawData(llpURL, searchStr, 'SLBN');
      companyList.push(...llpData);

      // Private company search
      const privateURL = 'GetCompanyNames';
      const privateData = await this.getCompanyRawData(
        privateURL,
        searchStr,
        'SCBN',
      );
      companyList.push(...privateData);

      return companyList;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getCompanyDataLocally(searchStr) {
    try {
      const attributes = ['companyName'];
      const options = {
        where: {
          companyName: {
            [Op.like]: searchStr + '%',
          },
        },
      };
      let companyList = await this.companyRepo.getTableWhereData(
        attributes,
        options,
      );
      if (companyList == k500Error) return kInternalError;
      companyList = companyList.map((el) => el.companyName);
      return companyList;
    } catch (error) {
      return kInternalError;
    }
  }

  private async getCompanyRawData(
    endPoint: string,
    strSearch: string,
    mode: string,
    type = false,
  ) {
    try {
      const baseURL = 'https://www.instafinancials.com/ajax-caller.aspx/';

      const body = { strSearch, mode };
      const url = baseURL + endPoint;

      const response = await this.api.post(url, body);
      if (response == k500Error) return [];
      const data = response.d;
      if (!data) return [];

      const companyList = [];
      for (let index = 0; index < data.length; index++) {
        try {
          const rawData = data[index];
          const companyData = await this.getCompanyData(rawData, type);
          if (companyData) companyList.push(companyData);
        } catch (error) {}
      }

      return companyList;
    } catch (error) {
      return [];
    }
  }

  private async getCompanyData(rawData: string, type = false) {
    try {
      if (!rawData.includes(';')) return;
      const splittedSpans = rawData.split(';');
      const companyData: any = {};
      companyData.LLPID = splittedSpans[0];
      companyData.name = splittedSpans[1].trim();
      companyData.status = splittedSpans[6];
      companyData.cin = splittedSpans[2];
      // const statuses = ['ACTIVE'];
      // if (statuses.includes(companyData.status)) {
      delete companyData.status;
      delete companyData.address;
      await this.saveCompanyData(companyData);
      if (type) return companyData;
      return companyData.name;
      // }
    } catch (error) {}
  }

  //#region  this function for save company name
  private async saveCompanyData(companyData) {
    /// prepare data for create or update
    let companName = companyData.name.trim();
    const data = {
      companyName: companName.toUpperCase(),
      source: 'INSTAFINANCE',
    };
    /// get count of table
    const count = await this.companyRepo.getCountsWhere({
      where: {
        companyName: companName.toUpperCase(),
      },
    });
    /// if count get count 0 or error then go to create
    if (count === 0 || count === k500Error)
      await this.companyRepo.createRowData(data);
  }
  //#endregion

  async searchCompanyInInstafinanc(searchStr) {
    try {
      if (!searchStr || searchStr?.length <= 2) return [];
      searchStr = searchStr.toUpperCase();
      const companyListDataNew = [];
      // Check locally in database
      const companyList = await this.getcompanyDataFromDatabase(searchStr);
      if (companyList.length > 0) {
        for (let i = 0; i < companyList.length; i++) {
          try {
            const element = companyList[i];
            const companyName = element.companyName;
            if (companyName === searchStr && element?.companyDetails)
              companyListDataNew.push(element);
          } catch (error) {}
        }
      }
      const find = companyList.find((f) => f.companyName === searchStr);
      if (companyListDataNew.length === 0) {
        //LLP company search
        const llpURL = 'GetLLPNames';
        const llpData = await this.getCompanyRawData(
          llpURL,
          searchStr,
          'SLBN',
          true,
        );
        if (find)
          llpData.forEach((ele) => {
            if (ele.name === searchStr) ele.id = find.id;
          });
        // Private company search
        if (!llpData.length) {
          const privateURL = 'GetCompanyNames';
          const privateData = await this.getCompanyRawData(
            privateURL,
            searchStr,
            'SCBN',
            true,
          );

          if (find)
            privateData.forEach((ele) => {
              if (ele.name === searchStr) ele.id = find.id;
            });
          companyListDataNew.push(...privateData);
        } else companyListDataNew.push(...llpData);
      }

      return companyListDataNew;
    } catch (error) {
      return kInternalError;
    }
  }
  private async getcompanyDataFromDatabase(searchStr) {
    try {
      const attributes = ['id', 'companyName', 'CIN', 'companyDetails'];
      const options = {
        where: {
          companyName: {
            [Op.like]: searchStr + '%',
          },
        },
      };
      let companyList = await this.companyRepo.getTableWhereData(
        attributes,
        options,
      );
      if (companyList == k500Error) return kInternalError;
      return companyList;
    } catch (error) {
      return kInternalError;
    }
  }
}
