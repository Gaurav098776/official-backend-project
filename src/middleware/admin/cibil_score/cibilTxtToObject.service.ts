import { Injectable } from '@nestjs/common';
import { kCibilScore } from 'src/constants/directories';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamsMissing } from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { ASModel } from './model/as.tudf.model';
import { NSModel } from './model/ns.tudf.model';
import {
  gIsPriamryNbfc,
  kCrifName,
  tudfMemberName,
} from 'src/constants/globals';
@Injectable()
export class CIBILTxtToObjectService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
    private readonly fileService: FileService,
  ) {}

  async getTxtToExcel(query) {
    try {
      const url = query?.url;
      if (!url) return kParamsMissing;
      /// get the Data
      let contains = await this.api.get(url);
      if (!contains || contains === k500Error) return kInternalError;
      contains = contains.replace('TRLR', '');
      const list = contains.split('ES02**');
      const objectData = [];
      /// split the Data from text
      for (let index = 0; index < list.length; index++) {
        try {
          const as = new ASModel();
          const split = list[index].split(as.TL);
          const data = this.textToObject(split[0]);
          const ts = split[1];
          data.ts = this.getKeyAndValue(ts);
          if (data?.ts) {
            if (data.ts['01'])
              data.ts['01'] = gIsPriamryNbfc ? 'NB79940001' : 'NB3267';
            if (data.ts['02'])
              data.ts['02'] = gIsPriamryNbfc
                ? tudfMemberName
                : tudfMemberName + 'AL';
            objectData.push(data);
          }
        } catch (error) {}
      }
      const name = (query?.name ?? 'CIBIL').toUpperCase().trim();
      /// prePare object fro excel
      const finalData = [];
      objectData.forEach((element) => {
        try {
          const data = this.makeOneObject(element);
          if (data)
            if (name === kCrifName) {
              const crifData = this.makeObjectFroCRIF(data);
              if (crifData) finalData.push(crifData);
            } else finalData.push(data);
        } catch (error) {}
      });
      /// create excel
      const sheetName = name + '-' + new Date().getTime() + '.xlsx';
      const data = { sheets: [name], data: [finalData], sheetName };
      const path = await this.fileService.objectToExcelURL(data);
      if (path?.message) return kInternalError;
      return { path, finalData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#region text to object
  private textToObject(nSegment) {
    try {
      const split = this.textSplit(nSegment);
      const data: any = {};
      data.name = this.getKeyAndValue(split.name);
      data.identification = this.getKeyAndValue(split.identification);
      data.phone = this.getKeyAndValue(split.phone);
      data.email = this.getKeyAndValue(split.email);
      data.address = this.getKeyAndValue(split.address);
      return data;
    } catch (error) {}
    return null;
  }
  //#endregion

  //#region text split
  private textSplit(nSegment) {
    const ns = new NSModel(this.api);
    /// name Segment
    const nStartIndex = nSegment.indexOf(ns.ST);
    const nEndIndex = nSegment.indexOf(ns.ID);
    const name = nSegment.substring(nStartIndex, nEndIndex).replace(ns.ST, '');
    /// Identification Segment
    const iStartIndex = nSegment.indexOf(ns.ID);
    const iEndIndex = nSegment.indexOf(ns.PT);
    const identification = nSegment
      .substring(iStartIndex, iEndIndex)
      .replace(ns.ID, '');
    /// Phone Segment
    const pStartIndex = nSegment.indexOf(ns.PT);
    const pEndIndex = nSegment.indexOf(ns.EC);
    const phone = nSegment.substring(pStartIndex, pEndIndex).replace(ns.PT, '');
    /// Email Segment
    const eStartIndex = nSegment.indexOf(ns.EC);
    const eEndIndex = nSegment.indexOf(ns.PA);
    const email = nSegment.substring(eStartIndex, eEndIndex).replace(ns.EC, '');
    /// Address Segment
    const aStartIndex = nSegment.indexOf(ns.PA);
    const address = nSegment.substring(aStartIndex).replace(ns.PA, '');
    return { name, identification, phone, email, address };
  }
  //#endregion

  //#region get key and value
  private getKeyAndValue(text: string) {
    try {
      const data = {};
      let count = 0;
      while (count != 100 && text.length > 0) {
        try {
          count++;
          const key = text.substring(0, 2);
          const length = text.substring(2, 4);
          const index = 4 + +length;
          let value = text.substring(4, index);
          data[key] = value;
          const removeTXT = text.substring(0, index);
          text = text.replace(removeTXT, '');
        } catch (error) {}
      }
      return data;
    } catch (error) {}
  }
  //#endregion

  //#region make object
  private makeOneObject(data) {
    /// name
    const name = this.prePareObject(this.pnObject, data?.name);
    const identification = this.prePareObject(
      this.idObject,
      data?.identification,
    );
    const phone = this.prePareObject(this.ptObject, data?.phone);
    const email = this.prePareObject(this.ecObject, data?.email);
    const address = this.prePareObject(this.paObject, data?.address);
    const ts = this.prePareObject(this.tlObject, data?.ts);
    const finalData = {
      ...name,
      ...identification,
      ...phone,
      ...email,
      ...address,
      ...ts,
    };
    return finalData;
  }
  //#endregion

  //#region prePare Object for excel
  private prePareObject(obj, data) {
    const finalData = {};
    const keys = Object.keys(obj);
    keys.sort();
    for (let index = 0; index < keys.length; index++) {
      try {
        const key = keys[index];
        const value = data[key] ?? '';
        const ke = obj[key];
        finalData[ke] = value;
      } catch (error) {}
    }
    return finalData;
  }
  //#endregion

  //#region make object for CRIF
  private makeObjectFroCRIF(data) {
    try {
      const keys = Object.keys(this.crifObjectcrifObject);
      const tempData = {};
      for (let id = 0; id < keys.length; id++) {
        const key = keys[id];
        const value = this.crifObjectcrifObject[key];
        let tempValue = '';
        if (value.length > 0) {
          value.forEach((ele) => {
            tempValue += (data[ele] ?? '') + ' ';
          });
        }
        tempData[key] = tempValue.trim();
      }
      return tempData;
    } catch (error) {}
  }
  //#endregion

  //#region  this all is object data
  pnObject = {
    '01': 'Consumer Name Field1',
    '02': 'Consumer Name Field2',
    '03': 'Consumer Name Field3',
    '04': 'Consumer Name Field4',
    '05': 'Consumer Name Field5',
    '07': 'Date of Birth',
    '08': 'Gender',
  };
  idObject = {
    '01': 'ID Type',
    '02': 'ID Number',
    '03': 'Issue Date',
    '04': 'Expiration Date',
  };
  ptObject = {
    '01': 'Telephone Number',
    '02': 'Telephone Extension',
    '03': 'Telephone Type',
  };
  ecObject = { '01': 'E-Mail ID' };
  paObject = {
    '01': 'Address Line1',
    '02': 'Address Line2',
    '03': 'Address Line3',
    '04': 'Address Line4',
    '05': 'Address Line5',
    '06': 'State Code',
    '07': 'PIN Code',
    '08': 'Address Category',
    '09': 'Residence Code',
  };
  tlObject = {
    '01': 'Current/New Reporting Member Code',
    '02': 'Current/New Member Short Name',
    '03': 'Current/New Account Number',
    '04': 'Account Type',
    '05': 'Ownership Indicator',
    '08': 'Date Opened/Disbursed',
    '09': 'Date of Last Payment',
    '10': 'Date Closed',
    '11': 'Date Reported and Certified',
    '12': 'High Credit/Sanctioned Amount',
    '13': 'Current Balance',
    '14': 'Amount Overdue',
    '15': 'Number of Days Past Due',
    '16': 'Old Reporting Member Code',
    '17': 'Old Member Short Name',
    '18': 'Old Account Number',
    '19': 'Old Account Type',
    '20': 'Old Ownership Indicator',
    '21': 'Suit Filed / Wilful Default',
    '22': 'Written-off and Settled Status',
    '26': 'Asset Classification',
    '34': 'Value of Collateral',
    '35': 'Type of Collateral',
    '36': 'Credit Limit',
    '37': 'Cash Limit',
    '38': 'Rate Of Interest',
    '39': 'Repayment Tenure',
    '40': 'EMI Amount',
    '41': 'Written-off Amount (Total)',
    '42': 'Written-off Amount (Principal)',
    '43': 'Settlement Amount',
    '44': 'Payment Frequency',
    '45': 'Actual Payment Amount',
    '46': 'Occupation Code',
    '47': 'Income',
    '48': 'Net/Gross Income Indicator',
    '49': 'Monthly/Annual Income Indicator',
  };
  //#endregion

  //#region CRIF Object prepare
  crifObjectcrifObject = {
    'Consumer Name': [
      'Consumer Name Field1',
      'Consumer Name Field2',
      'Consumer Name Field3',
      'Consumer Name Field4',
      'Consumer Name Field5',
    ],
    'Date of Birth': ['Date of Birth'],
    Gender: ['Gender'],
    'Income Tax ID Number': ['ID Number'],
    'Passport Number': [],
    'Passport Issue Date': [],
    'Passport Expiry Date': [],
    'Voter ID Number': [],
    'Driving License Number': [],
    'Driving License Issue Date': [],
    'Driving License Expiry Date': [],
    'Ration Card Number': [],
    'Universal ID Number': [],
    'Additional ID #1': [],
    'Additional ID #2': [],
    'Telephone No.Mobile': ['Telephone Number'],
    'Telephone No.Residence': [],
    'Telephone No.Office': [],
    'Extension Office': [],
    'Telephone No.Other ': [],
    'Extension Other': [],
    'Email ID 1': ['E-Mail ID'],
    'Email ID 2': [],
    'Address 1': [
      'Address Line1',
      'Address Line2',
      'Address Line3',
      'Address Line4',
      'Address Line5',
    ],
    'State Code 1': ['State Code'],
    'PIN Code 1': ['PIN Code'],
    'Address Category 1': ['Address Category'],
    'Residence Code 1': ['Residence Code'],
    'Address 2': [],
    'State Code 2': [],
    'PIN Code 2': [],
    'Address Category 2': [],
    'Residence Code 2': [],

    'Current/New Member Code': ['Current/New Reporting Member Code'],
    'Current/New Member Short Name': ['Current/New Member Short Name'],
    'Curr/New Account No': ['Current/New Account Number'],
    'Account Type': ['Account Type'],
    'Ownership Indicator': ['Ownership Indicator'],
    'Date Opened/Disbursed': ['Date Opened/Disbursed'],
    'Date of Last Payment': ['Date of Last Payment'],
    'Date Closed': ['Date Closed'],
    'Date Reported': ['Date Reported and Certified'],
    'High Credit/Sanctioned Amt': ['High Credit/Sanctioned Amount'],
    'Current  Balance': ['Current Balance'],
    'Amt Overdue': ['Amount Overdue'],
    'No of Days Past Due': ['Number of Days Past Due'],
    'Old Mbr Code': ['Old Reporting Member Code'],
    'Old Mbr Short Name': ['Old Member Short Name'],
    'Old Acc No': ['Old Account Number'],
    'Old Acc Type': ['Old Account Type'],
    'Old Ownership Indicator': ['Old Ownership Indicator'],
    'Suit Filed / Wilful Default': ['Suit Filed / Wilful Default'],
    'Credit Facility Status': ['Written-off and Settled Status'],
    'Asset Classification': ['Asset Classification'],
    'Value of Collateral': ['Value of Collateral'],
    'Type of Collateral': ['Type of Collateral'],
    'Credit Limit': ['Credit Limit'],
    'Cash Limit': ['Cash Limit'],
    'Rate of Interest': ['Rate Of Interest'],
    RepaymentTenure: ['Repayment Tenure'],
    'EMI Amount': ['EMI Amount'],
    'Written- off Amount (Total) ': ['Written-off Amount (Total)'],
    'Written- off Principal Amount': ['Written-off Amount (Principal)'],
    'Settlement Amt': ['Settlement Amount'],
    'Payment Frequency': ['Payment Frequency'],
    'Actual Payment Amt': ['Actual Payment Amount'],
    'Occupation Code': ['Occupation Code'],
    Income: ['Income'],
    'Net/Gross Income Indicator': ['Net/Gross Income Indicator'],
    'Monthly/Annual Income Indicator': ['Monthly/Annual Income Indicator'],
  };
  //#endregion
}
