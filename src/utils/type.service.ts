import * as excel from 'excel4node';
import { Injectable } from '@nestjs/common';
import {
  INDIA_CENTER_LAT,
  INDIA_CENTER_LONG,
  disburseAmt,
  MAX_AGE,
  MIN_AGE,
  locationAddressURL,
} from 'src/constants/globals';
import { APIService } from './api.service';
import {
  kBigFonts,
  kMonths,
  kSmallFonts,
  shortMonth,
} from 'src/constants/objects';
import { k500Error, k999Error } from 'src/constants/misc';
import { kNotEligibleForNBFC, kRuppe, kUTCTrail } from 'src/constants/strings';
import {
  k422ErrorMessage,
  kInternalError,
  kTimeout,
} from 'src/constants/responses';
import * as fs from 'fs';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { kPostoffice } from 'src/constants/network';
import { Sequelize } from 'sequelize';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CryptoJS = require('crypto-js');

@Injectable()
export class TypeService {
  constructor(private readonly apiService: APIService) {}
  /// number add commas
  numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  numberRoundWithCommas(x) {
    if (typeof x === 'string' && x.includes('L')) {
      // If the input includes "L", return it as is
      return x;
    }
    x = Math.round(+x);
    return this.amountNumberWithCommas(x);
  }

  amountNumberWithCommas(x) {
    try {
      let amount = typeof x != 'string' ? x.toString() : x;
      if (amount.includes('.')) amount = (+amount).toFixed(2);
      if (amount.length < 6)
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      else {
        amount = amount.toString().replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        let tempAmount = '';
        let isCommas = false;
        for (let index = amount.length - 1; index >= 0; index--) {
          const element = amount[index];
          if (element.includes('L')) continue;
          if (element == ',') isCommas = true;
          else if (isCommas) {
            isCommas = false;
            tempAmount += element + ',';
          } else tempAmount += element;
        }
        let finalAmount = '';
        for (let index = tempAmount.length - 1; index >= 0; index--) {
          const element = tempAmount[index];
          finalAmount += element;
        }
        if (finalAmount.startsWith(','))
          finalAmount = finalAmount.replace(',', '');
        return finalAmount;
      }
    } catch (error) {
      return x;
    }
  }

  // manage amount round for inProcess and repay loan
  manageAmount(x, type?) {
    try {
      let amount = parseInt(x);
      if (x > amount && type != disburseAmt) amount++;
      return amount;
    } catch (error) {
      return Math.round(x);
    }
  }

  /// number to words
  inWords(num) {
    const a = [
      '',
      'One ',
      'Two ',
      'Three ',
      'Four ',
      'Five ',
      'Six ',
      'Seven ',
      'Eight ',
      'Nine ',
      'Ten ',
      'Eleven ',
      'Twelve ',
      'Thirteen ',
      'Fourteen ',
      'Fifteen ',
      'Sixteen ',
      'Seventeen ',
      'Eighteen ',
      'Nineteen ',
    ];
    const b = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];
    if ((num = num.toString()).length > 9) return '-';
    const n: any = ('000000000' + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str +=
      n[1] != 0
        ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Million '
        : '';
    str +=
      n[2] != 0
        ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Hundred '
        : '';
    str +=
      n[3] != 0
        ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand '
        : '';
    str +=
      n[4] != 0
        ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred '
        : '';
    str +=
      n[5] != 0
        ? (str != '' ? 'and ' : '') +
          (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]])
        : '';
    return str != '' ? str + 'Only' : '';
  }
  //get Amount with point In Words
  getAmountInWords(amount) {
    try {
      const netAmount = amount.toString();
      const tempVal = netAmount.includes(kRuppe)
        ? netAmount.replace(/[₹,]/g, '')
        : netAmount.includes(',')
        ? netAmount.replace(/,/g, '')
        : netAmount;
      const tempArr = tempVal.split('.');
      const firstString = this.inWords(+tempArr[0]).replace(' Only', '');
      let decimalString;
      if (tempArr[1])
        decimalString = this.inWords(+tempArr[1]).replace(' Only', '');
      let word = firstString + ' Rupees ';
      if (decimalString) word = word + ' And ' + decimalString + ' Paisa ';
      word = word + 'Only';
      return word;
    } catch (error) {
      return '';
    }
  }

  getMonth(m) {
    const month = [
      'January ',
      'February ',
      'March ',
      'April ',
      'May ',
      'June ',
      'July ',
      'August ',
      'September ',
      'October ',
      'November ',
      'December ',
    ];
    return month[m];
  }
  getDateFormatedWithMonthFullName(date?: any) {
    const month = [
      'January ',
      'February ',
      'March ',
      'April ',
      'May ',
      'June ',
      'July ',
      'August ',
      'September ',
      'October ',
      'November ',
      'December ',
    ];
    const today = date ? new Date(date) : new Date();
    const dd = today.getDate();
    if (dd == 1 || dd == 31) dd + 'st, ';
    else if (dd == 2 || dd == 22) dd + 'nd, ';
    else if (dd == 3 || dd == 23) dd + 'rd, ';
    else dd + 'th, ';

    const mm = today.getMonth();
    const yyyy = today.getFullYear();
    return month[mm] + dd + ', ' + yyyy;
  }

  getSimpleDateFormat(date?: any) {
    const today = date ? new Date(date) : new Date();
    const dd = today.getDate();
    const mm = today.getMonth();
    const yyyy = today.getFullYear();
    return `${dd} ${shortMonth[mm]} ${String(yyyy).slice(-2)}`;
  }

  getUUID() {
    return uuidv4();
  }

  getGlobalDate(experimentDate: Date) {
    try {
      const currentDate = new Date(experimentDate);
      currentDate.setMinutes(currentDate.getMinutes() + 330);
      const currentStatic =
        currentDate.toJSON().substring(0, 10) + 'T10:00:00.000Z';

      return new Date(currentStatic);
    } catch (error) {
      return experimentDate;
    }
  }

  getDateFormated(date, connector = '-') {
    let today: any = new Date(date);
    let dd: any = today.getDate();

    let mm: any = today.getMonth() + 1;
    const yyyy = today.getFullYear();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    today = dd + connector + mm + connector + yyyy;
    return today;
  }

  dateTimeFormate(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const dateTime = `${year}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return dateTime;
  }

  unixMilisecondsToGlobalDate(unixDate: number) {
    try {
      const date: Date = new Date(unixDate);
      date.setMinutes(date.getMinutes() + 330);
      const staticDate = date.toJSON().substr(0, 10) + 'T10:00:00.000Z';
      return new Date(staticDate);
    } catch (error) {}
  }

  getUTCDateRange(date1: string, date2: string) {
    const dateA = this.getGlobalDate(new Date(date1));
    dateA.setDate(dateA.getDate() - 1);
    const fromDate = dateA.toJSON().substring(0, 10) + kUTCTrail;
    const dateB = this.getGlobalDate(new Date(date2));
    dateA.setDate(dateB.getDate() - 1);
    const endDate = dateB.toJSON().substring(0, 10) + kUTCTrail;

    return { fromDate, endDate };
  }

  sortObjectKeys(data: any) {
    return Object.keys(data)
      .sort()
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
  }

  /**
   * for generating key in app
   * @returns dateTime with 45 seconde added in milliseconds
   */
  getServerTimestamp() {
    const currentDate = new Date();
    currentDate.setSeconds(currentDate.getSeconds() + 45);
    return currentDate.getTime();
  }

  getUTCDate(date1: string) {
    const dateA = this.getGlobalDate(new Date(date1));
    dateA.setDate(dateA.getDate() - 1);
    const targetDate = dateA.toJSON().substring(0, 10) + kUTCTrail;
    return targetDate;
  }

  dateToUnixMiliSeconds(targetDate: Date) {
    const targetTime = Math.round(targetDate.getTime() / 1000);
    return targetTime;
  }

  ///CibilDate 26072023 convert to db date 2023-07-26
  cibiDateToDBDate(cibilDate) {
    if (cibilDate && cibilDate.length == 8) {
      let year = cibilDate.slice(4, 8);
      let month = cibilDate.slice(2, 4);
      let date = cibilDate.slice(0, 2);
      return year + '-' + month + '-' + date;
    } else return cibilDate;
  }

  ///CibilDate 26072023 convert to db date 26/07/2023
  cibiDateToDisplayDate(cibilDate) {
    if (cibilDate && cibilDate.length == 8) {
      let year = cibilDate.slice(4, 8);
      let month = cibilDate.slice(2, 4);
      let date = cibilDate.slice(0, 2);
      return date + '/' + month + '/' + year;
    } else return cibilDate;
  }

  getLastDateOfMonth(targetDate: Date) {
    let lastDate;

    const dates = [28, 29, 30, 31, 32];

    let tempDate = new Date(targetDate);
    for (let index = 0; index < dates.length; index++) {
      try {
        const date = dates[index];
        targetDate.setDate(date);

        if (targetDate.getMonth() != tempDate.getMonth()) {
          lastDate = new Date(tempDate);
          break;
        }

        tempDate = new Date(targetDate);
      } catch (error) {}
    }

    return lastDate;
  }

  dateRange(startDate, endDate) {
    const start = startDate.split('-');
    const end = endDate.split('-');
    const startYear = parseInt(start[0]);
    const endYear = parseInt(end[0]);
    const dates = [];
    for (let i = startYear; i <= endYear; i++) {
      const endMonth = i != endYear ? 11 : parseInt(end[1]) - 1;
      const startMon = i === startYear ? parseInt(start[1]) - 1 : 0;
      for (let j = startMon; j <= endMonth; j = j > 12 ? j % 12 || 11 : j + 1) {
        const month = j + 1;
        const displayMonth = month < 10 ? '0' + month : month;
        dates.push([i, displayMonth, '01'].join('-'));
      }
    }
    return dates;
  }

  getMonthsArr(startDate, endDate) {
    try {
      const start = startDate.split('-');
      const end = endDate.split('-');
      const startYear = parseInt(start[0]);
      const endYear = parseInt(end[0]);
      const months = [];
      for (let i = startYear; i <= endYear; i++) {
        const endMonth = i != endYear ? 11 : parseInt(end[1]) - 1;
        const startMon = i === startYear ? parseInt(start[1]) - 1 : 0;
        for (
          let j = startMon;
          j <= endMonth;
          j = j > 12 ? j % 12 || 11 : j + 1
        ) {
          const month = j + 1;
          const displayMonth = month < 10 ? +month : month;
          months.push([displayMonth, i].join(''));
        }
      }
      return months;
    } catch (error) {
      return null;
    }
  }

  jsonToReadableDate(date: string) {
    try {
      return date.substr(8, 2) + date.substr(4, 4) + date.substr(0, 4);
    } catch (error) {
      return date;
    }
  }

  differenceInDays(nextDate: Date, currentdate: Date) {
    try {
      const difference =
        this.getGlobalDate(nextDate).getTime() -
        this.getGlobalDate(currentdate).getTime();
      const diff = Math.abs(difference);
      const diffDays = Math.ceil(diff / (1000 * 3600 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  }

  dateDifference(nextDate: Date, currentdate: Date, type = 'Days') {
    try {
      let fromTime;
      let toTime;
      if (type == 'Days' || type === 'Years') {
        fromTime = this.getGlobalDate(currentdate).getTime();
        toTime = this.getGlobalDate(nextDate).getTime();
      } else {
        fromTime = currentdate.getTime();
        toTime = nextDate.getTime();
      }
      let difference = fromTime - toTime;
      difference = Math.abs(difference);
      if (type == 'Seconds')
        difference = Math.floor(Math.ceil(difference / (1000 * 60)) * 60);
      else if (type == 'Minutes')
        difference = Math.ceil(difference / (1000 * 60));
      else if (type == 'Hours')
        difference = Math.ceil(difference / (1000 * 3600));
      else if (type == 'Days')
        difference = Math.ceil(difference / (1000 * 3600 * 24));
      else if (type == 'Month') {
        difference =
          currentdate.getMonth() -
          nextDate.getMonth() +
          12 * (currentdate.getFullYear() - nextDate.getFullYear());
      } else if (type == 'Years')
        difference = Math.floor(
          Math.ceil(difference / (1000 * 3600 * 24)) / 365,
        );
      return difference;
    } catch (error) {
      return null;
    }
  }

  async getLocationFromAddress(address: string): Promise<any> {
    try {
      const addressString = this.addressFormat(address);
      const url = `${locationAddressURL}address=${addressString}&key=${process.env.GOOGLE_MAP_API_KEY}`;
      return await this.apiService.get(url);
    } catch (error) {
      return k500Error;
    }
  }

  addressFormat(address) {
    try {
      address = JSON.parse(address);
    } catch (error) {}
    let formatedAddress = '';
    if (address['house']) {
      const updatedHouse = this.checkAndRemoveComma(address['house']);
      formatedAddress += updatedHouse + ', ';
    }
    if (address['street']) {
      const updatedStreet = this.checkAndRemoveComma(address['street']);
      formatedAddress += updatedStreet + ', ';
    }
    if (address['landmark']) {
      const updatedLandmark = this.checkAndRemoveComma(address['landmark']);
      formatedAddress += updatedLandmark + ', ';
    }

    if (address['loc']) {
      const updatedLoc = this.checkAndRemoveComma(address['loc']);
      formatedAddress += updatedLoc + ', ';
    }

    if (address['vtc']) {
      const updatedVtc = this.checkAndRemoveComma(address['vtc']);
      formatedAddress += updatedVtc + ', ';
    }

    if (address['po']) {
      const updatedPo = this.checkAndRemoveComma(address['po']);
      formatedAddress += updatedPo + ', ';
    }
    if (address['subdist']) {
      const updatedSubdist = this.checkAndRemoveComma(address['subdist']);
      formatedAddress += updatedSubdist + ', ';
    }
    if (address['dist']) {
      const updatedDist = this.checkAndRemoveComma(address['dist']);
      formatedAddress += updatedDist + ', ';
    }
    if (address['state']) {
      const updatedState = this.checkAndRemoveComma(address['state']);
      formatedAddress += updatedState + ', ';
    }
    if (address['country']) {
      const updatedCountry = this.checkAndRemoveComma(address['country']);
      formatedAddress += updatedCountry;
    }
    formatedAddress = formatedAddress.replace(/#/g, '');
    formatedAddress = formatedAddress.replace(/\*/g, '');
    return formatedAddress;
  }

  splitToNChunks(array, n) {
    var arrays = [];

    for (let i = 0; i < array.length; i += n)
      arrays.push(array.slice(i, i + n));

    return arrays;
  }

  //#region  prepare aadhaar Address
  getAadhaarAddress(kycData) {
    let address = '-';
    let dist = '-';
    let state = '-';
    try {
      // aadhaarAddress
      const aadhaarAdd = kycData?.aadhaarAddress;
      const addre = JSON.parse(aadhaarAdd);
      if (addre?.country) address = this.addressFormat(aadhaarAdd);
      if (address === '-' && addre?.state)
        address = this.addressFormat(aadhaarAdd);
      if (address != '-') {
        dist = addre?.dist ?? '-';
        state = addre?.state ?? '-';
      }
      if (address === '-') {
        try {
          const aadhaarRes = JSON.parse(
            JSON.parse(kycData?.aadhaarAddressResponse),
          );
          dist = aadhaarRes?.dist ?? '-';
          state = aadhaarRes?.state ?? '-';
        } catch (error) {}
        address = addre;
      }
    } catch (error) {}
    return { address, dist, state };
  }
  //#endregion

  // start region to prepare offlineEkycObj
  async prepareOfflineEkycObj(kycData, fullName, gender, dates) {
    try {
      let address = kycData?.aadhaarAddress;
      address = address.replace(/#/g, '');
      address = address.replace(/\*/g, '');
      address = JSON.parse(address);

      let aadhaarDOB = kycData?.aadhaarDOB;
      aadhaarDOB = aadhaarDOB.split('/').reverse().join('-');

      const dateObject = new Date(dates?.aadhaar);
      const formattedTimeStamp = this.dateTimeFormate(dateObject);

      let formatedAddressObj: any = {
        name: fullName,
        aadhaarNumber: kycData?.maskedAadhaar,
        aadhaarImgae: kycData?.profileImage,
        gender,
        dateOfBirth: aadhaarDOB,
        careOf: JSON.parse(kycData?.aadhaarResponse)?.careof ?? '-',
        houseNo: '-',
        street: '-',
        landmark: '-',
        PostOffice: '-',
        locality: '-',
        vtc: '-',
        subDistrict: '-',
        district: '-',
        state: '-',
        country: '-',
        pincode: kycData?.pincode,
        timeStampOfflineEKyc: formattedTimeStamp,
      };
      if (address['house']) {
        const updatedHouse = this.checkAndRemoveComma(address['house']);
        formatedAddressObj.houseNo = updatedHouse;
      }
      if (address['street']) {
        const updatedStreet = this.checkAndRemoveComma(address['street']);
        formatedAddressObj.street = updatedStreet;
      }
      if (address['landmark']) {
        const updatedLandmark = this.checkAndRemoveComma(address['landmark']);
        formatedAddressObj.landmark = updatedLandmark;
      }
      if (address['po']) {
        const updatedPo = this.checkAndRemoveComma(address['po']);
        formatedAddressObj.PostOffice = updatedPo;
      }
      if (address['loc']) {
        const updatedLoc = this.checkAndRemoveComma(address['loc']);
        formatedAddressObj.locality = updatedLoc;
      }
      if (address['vtc']) {
        const updatedVtc = this.checkAndRemoveComma(address['vtc']);
        formatedAddressObj.vtc = updatedVtc;
      }
      if (address['subdist']) {
        const updatedSubdist = this.checkAndRemoveComma(address['subdist']);
        formatedAddressObj.subDistrict = updatedSubdist;
      }
      if (address['dist']) {
        const updatedDist = this.checkAndRemoveComma(address['dist']);
        formatedAddressObj.district = updatedDist;
      }
      if (address['state']) {
        const updatedState = this.checkAndRemoveComma(address['state']);
        formatedAddressObj.state = updatedState;
      }
      if (address['country']) {
        const updatedCountry = this.checkAndRemoveComma(address['country']);
        formatedAddressObj.country = updatedCountry;
      }
      return formatedAddressObj;
    } catch (error) {}
  }
  //#endregion

  checkAndRemoveComma(string) {
    if (string.includes(',')) {
      string = string.replace(/,/g, '');
    }
    return string;
  }
  // replaceAll(content, toReplace, replaceWith) {
  //   let search = new RegExp(toReplace, 'g');
  //   return content.replace(search, replaceWith);
  // }

  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }

  checkGenderWithAdhaar(name: string, gender: string) {
    const nameTitle = name.split(/[ .]+/)[0];
    const genderLowerCase = gender.toLowerCase();

    if (nameTitle === 'mr' && genderLowerCase !== 'male') {
      return false;
    } else if (nameTitle === 'mrs' && genderLowerCase !== 'female') {
      return false;
    } else if (nameTitle === 'ms' && genderLowerCase !== 'female') {
      return false;
    } else if (nameTitle === 'miss' && genderLowerCase !== 'female') {
      return false;
    } else return true;
  }

  _replaceNameSomeWord(name: string) {
    const nameList = name.split(' ').filter((value) => value != '');
    try {
      for (let index = 0; index < nameList.length; index++) {
        const element = nameList[index];
        if (
          element.startsWith('miss.') ||
          element.startsWith('ms.') ||
          element.startsWith('mr.') ||
          element.startsWith('mrs.') ||
          element.startsWith('mrs') ||
          element.startsWith('.')
        )
          nameList[index] = element
            ?.replace('miss.', '')
            ?.replace('ms.', '')
            ?.replace('mr.', '')
            ?.replace('mrs', '')
            ?.replace('.', '')
            ?.replace('mrs.', '');
      }
    } catch (error) {}
    const list = [];
    try {
      nameList.forEach((txt) => {
        try {
          if (txt.trim()) list.push(txt);
        } catch (error) {}
      });
    } catch (error) {}
    return list;
  }

  async getBase64FromImgUrl(imgUrl: string, isNeed = false) {
    try {
      const successData = await this.apiService.get(
        imgUrl,
        undefined,
        undefined,
        { responseType: 'arraybuffer' },
      );
      if (successData === k500Error) return k500Error;
      if (isNeed) return Buffer.from(successData, 'binary');
      else return Buffer.from(successData, 'binary').toString('base64');
    } catch (error) {
      return k500Error;
    }
  }

  getBearingFromLatLong(lat: number, long: number) {
    const latA = this.degreesToRadians(INDIA_CENTER_LAT);
    const latB = this.degreesToRadians(lat);
    const longA = this.degreesToRadians(INDIA_CENTER_LONG);
    const longB = this.degreesToRadians(long);

    const longDifference = longB - longA;

    const y = Math.sin(longDifference) * Math.cos(latB);
    const x =
      Math.cos(latA) * Math.sin(latB) -
      Math.sin(latA) * Math.cos(latB) * Math.cos(longDifference);

    const bearing = this.radiansToDegree(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  private degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  private radiansToDegree(radians) {
    return (radians * 180) / Math.PI;
  }

  _convertGoogleAddress(addressData) {
    try {
      if (!addressData) return '500';
      if (!addressData.geometry) return '500';
      if (!addressData.formatted_address) return '500';
      if (!addressData.address_components) return '500';
      const result = {};
      result['coordinates'] = this._convertCoordinates(addressData.geometry);
      result['addressLine'] = addressData.formatted_address;
      const addressComponents = addressData.address_components;
      for (let i = 0; i < addressComponents.length; i++) {
        try {
          const item = addressComponents[i];
          const types: Array<string> = item.types;
          if (types.includes('route')) {
            result['thoroughfare'] = item.long_name;
          } else if (types.includes('street_number')) {
            result['subThoroughfare'] = item.long_name;
          } else if (types.includes('country')) {
            result['countryName'] = item.long_name;
            result['countryCode'] = item.short_name;
          } else if (types.includes('locality')) {
            result['locality'] = item.long_name;
          } else if (types.includes('postal_code')) {
            result['postalCode'] = item.long_name;
          } else if (types.includes('postal_code')) {
            result['postalCode'] = item.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            result['adminArea'] = item.long_name;
          } else if (types.includes('administrative_area_level_2')) {
            result['subAdminArea'] = item.long_name;
          } else if (
            types.includes('sublocality') ||
            types.includes('sublocality_level_1')
          ) {
            result['subLocality'] = item.long_name;
          } else if (types.includes('premise')) {
            result['featureName'] = item.long_name;
          }
          result['featureName'] =
            result['featureName'] ?? result['addressLine'];
        } catch (error) {}
      }
      return result;
    } catch (error) {
      return '500';
    }
  }

  _convertCoordinates(geometry) {
    if (!geometry) return null;
    const location = geometry['location'];
    if (!location) return null;
    return {
      latitude: location['lat'],
      longitude: location['lng'],
    };
  }

  //#region _objectToExcel
  async _objectToExcel(rawData) {
    try {
      if (rawData.sheets == null || rawData.data == null) return;
      if (rawData.sheets.length != rawData.data.length) return;
      rawData;
      const workbook = new excel.Workbook();
      const bigFonts = workbook.createStyle(kBigFonts);
      const smallFonts = workbook.createStyle(kSmallFonts);
      for (
        let sheetIndex = 0;
        sheetIndex < rawData.sheets.length;
        sheetIndex++
      ) {
        try {
          const currentSheet = workbook.addWorksheet(
            rawData.sheets[sheetIndex],
          );
          for (let index = 0; index < rawData.data[index].length; index++) {
            try {
              const sheetDetails = rawData.data[index];
              for (let i = 0; i < sheetDetails.length; i++) {
                try {
                  const rowDetails = sheetDetails[i];
                  let initialIndex = 1;
                  for (const [key, value] of Object.entries(rowDetails)) {
                    try {
                      if (key) {
                        let updatedKey = '';
                        switch (key) {
                          case 'name': {
                            updatedKey = 'Name';
                            break;
                          }
                          case 'accId': {
                            updatedKey = 'Acc Id';
                            break;
                          }
                          case 'loanId': {
                            updatedKey = 'Loan id';
                            break;
                          }
                          case 'interest_rate': {
                            updatedKey = 'Interest rate';
                            break;
                          }
                          case 'loanStatus': {
                            updatedKey = 'Loan status';
                            break;
                          }
                          case 'approvedAmount': {
                            updatedKey = 'Approved amount';
                            break;
                          }
                          case 'repaidAmount': {
                            updatedKey = 'Repaid amount';
                            break;
                          }
                          case 'disbursementAmount': {
                            updatedKey = 'Disbursement amount';
                            break;
                          }
                          case 'emiAmount1': {
                            updatedKey = 'Emi 1 amount';
                            break;
                          }
                          case 'emiDate1': {
                            updatedKey = 'Emi 1 date';
                            break;
                          }
                          case 'emiPenalty1': {
                            updatedKey = 'Emi 1 penalty';
                            break;
                          }
                          case 'emiPrincipal1': {
                            updatedKey = 'Emi 1 principal';
                            break;
                          }
                          case 'emiInterest1': {
                            updatedKey = 'Emi 1 interest';
                            break;
                          }
                          case 'emiAmount2': {
                            updatedKey = 'Emi 2 amount';
                            break;
                          }
                          case 'emiDate2': {
                            updatedKey = 'Emi 2 date';
                            break;
                          }
                          case 'emiPenalty2': {
                            updatedKey = 'Emi 2 penalty';
                            break;
                          }
                          case 'emiPrincipal2': {
                            updatedKey = 'Emi 2 principal';
                            break;
                          }
                          case 'emiInterest2': {
                            updatedKey = 'Emi 2 interest';
                            break;
                          }
                          case 'emiAmount3': {
                            updatedKey = 'Emi 3 amount';
                            break;
                          }
                          case 'emiDate3': {
                            updatedKey = 'Emi 3 date';
                            break;
                          }
                          case 'emiPenalty3': {
                            updatedKey = 'Emi 3 penalty';
                            break;
                          }
                          case 'emiPrincipal3': {
                            updatedKey = 'Emi 3 principal';
                            break;
                          }
                          case 'emiInterest3': {
                            updatedKey = 'Emi 3 interest';
                            break;
                          }
                          case 'emiAmount4': {
                            updatedKey = 'Emi 4 amount';
                            break;
                          }
                          case 'emiDate4': {
                            updatedKey = 'Emi 4 date';
                            break;
                          }
                          case 'emiPenalty4': {
                            updatedKey = 'Emi 4 penalty';
                            break;
                          }
                          case 'emiPrincipal4': {
                            updatedKey = 'Emi 4 principal';
                            break;
                          }
                          case 'emiInterest4': {
                            updatedKey = 'Emi 4 interest';
                            break;
                          }
                          case 'fullPayAmount': {
                            updatedKey = 'Full pay amount';
                            break;
                          }
                          case 'fullPayPrincipal': {
                            updatedKey = 'Full pay principal';
                            break;
                          }
                          case 'fullPayInterest': {
                            updatedKey = 'Full pay interest';
                            break;
                          }
                          case 'emiRepayDate1': {
                            updatedKey = 'Emi 1 repay date';
                            break;
                          }
                          case 'emiRepayDate2': {
                            updatedKey = 'Emi 2 repay date';
                            break;
                          }
                          case 'emiRepayDate3': {
                            updatedKey = 'Emi 3 repay date';
                            break;
                          }
                          case 'emiRepayDate4': {
                            updatedKey = 'Emi 4 repay date';
                            break;
                          }
                          case 'processingFees': {
                            updatedKey = 'Processing Fees';
                            break;
                          }
                          case 'processingFeesPerc': {
                            updatedKey = 'Processing Fees Percentage';
                            break;
                          }
                          case 'stampDuty': {
                            updatedKey = 'Stamp Duty';
                            break;
                          }
                          case 'processingFeesGST': {
                            updatedKey = 'Processing fees income';
                            break;
                          }
                          case 'CGST': {
                            updatedKey = 'CGST';
                            break;
                          }
                          case 'stampDutyGST': {
                            updatedKey = 'Stamp duty income';
                            break;
                          }
                          case 'SGST': {
                            updatedKey = 'SGST';
                            break;
                          }
                          case 'fullPayDate': {
                            updatedKey = 'Full pay date';
                            break;
                          }
                          case 'expectedAmount': {
                            updatedKey = 'Expected amount';
                            break;
                          }
                          case 'loanDisbursementDate': {
                            updatedKey = 'Loan disbursement date';
                            break;
                          }
                          case 'approved_by': {
                            updatedKey = 'Approved by';
                            break;
                          }
                          default: {
                            if (rawData.needFindTuneKey ?? true)
                              updatedKey = this.fineTuneObjectKey(key);
                            break;
                          }
                        }
                        //for header of each columns
                        if (i === 0)
                          currentSheet
                            .cell(1, initialIndex)
                            .string(updatedKey !== '' ? updatedKey : key)
                            .style(bigFonts);

                        //for details of each row cells
                        currentSheet
                          .cell(i + 2, initialIndex)
                          .string((value ?? '-').toString())
                          .style(smallFonts);
                        //Responsive width of the cell
                        currentSheet
                          .column(initialIndex)
                          .setWidth(key.length * 1.75);
                        initialIndex++;
                      }
                    } catch (error) {}
                  }
                } catch (error) {}
              }
            } catch (error) {
              error;
            }
          }
        } catch (error) {}
      }
      const filePath = rawData.sheetName
        ? 'upload/report/' + rawData.sheetName
        : 'upload/file.xlsx';
      await workbook.write(filePath);
      return filePath;
    } catch (error) {}
  }

  fineTuneObjectKey(key) {
    try {
      let updatedKey = '';
      for (let index = 0; index < key.length; index++) {
        try {
          const targetStr = key[index];
          if (index == 0) updatedKey += targetStr.toUpperCase();
          else if (targetStr.toUpperCase() == targetStr && targetStr != '_')
            updatedKey += ' ' + targetStr;
          else if (targetStr == '_') updatedKey += ' ';
          else updatedKey += targetStr;
        } catch (error) {}
      }

      return updatedKey;
    } catch (error) {
      return key;
    }
  }

  fineTuneObject(obj) {
    Object.keys(obj).map((el) => {
      try {
        const updatedKey = this.fineTuneObjectKey(el);
        obj[updatedKey] = obj[el];
        delete obj[el];
      } catch (error) {}
    });
  }

  async _objectToExcelDefaulter(rawData) {
    try {
      if (rawData.sheets == null || rawData.data == null) return;
      if (rawData.sheets.length != rawData.data.length) return;
      rawData;
      const workbook = new excel.Workbook();
      const bigFonts = workbook.createStyle(kBigFonts);
      const smallFonts = workbook.createStyle(kSmallFonts);
      for (
        let sheetIndex = 0;
        sheetIndex < rawData.sheets.length;
        sheetIndex++
      ) {
        try {
          const currentSheet = workbook.addWorksheet(
            rawData.sheets[sheetIndex],
          );
          for (let index = 0; index < rawData.data[index].length; index++) {
            try {
              const sheetDetails = rawData.data[index];
              for (let i = 0; i < sheetDetails.length; i++) {
                try {
                  const rowDetails = sheetDetails[i];
                  let initialIndex = 1;
                  for (const [key, value] of Object.entries(rowDetails)) {
                    try {
                      if (key) {
                        let updatedKey = '';
                        switch (key) {
                          case 'loanId': {
                            updatedKey = 'Loan ID';
                            break;
                          }
                          case 'userId': {
                            updatedKey = 'user ID';
                            break;
                          }
                          case 'loanCount': {
                            updatedKey = 'Loan Count';
                            break;
                          }
                          case 'name': {
                            updatedKey = 'Name';
                            break;
                          }
                          case 'phone': {
                            updatedKey = 'Mobile';
                            break;
                          }
                          case 'loanAmount': {
                            updatedKey = 'Loan Amount';
                            break;
                          }
                          case 'processingFees': {
                            updatedKey = 'Processing Fee (In Rs.)';
                            break;
                          }
                          case 'stampDutyfee': {
                            updatedKey = 'Stamp Duty Fee (in Rs.)';
                            break;
                          }
                          case 'disburseAmount': {
                            updatedKey = 'Net Disbursed Amount (In RS.)';
                            break;
                          }
                          case 'disbursementAmount': {
                            updatedKey = 'Disbursement amount';
                            break;
                          }
                          case 'accountNumber': {
                            updatedKey = 'Bank Account No';
                            break;
                          }
                          case 'loanDisbursedDate': {
                            updatedKey = 'Borrow date';
                            break;
                          }
                          case 'dueEmis': {
                            updatedKey = 'Emi Due(No)';
                            break;
                          }
                          case 'emi1_due_date': {
                            updatedKey = 'Emi 1 Due Date';
                            break;
                          }
                          case 'emi1_due_amount': {
                            updatedKey = 'Emi 1 Due Amount';
                            break;
                          }
                          case 'emi2_due_date': {
                            updatedKey = 'Emi 2 Due Date';
                            break;
                          }
                          case 'emi2_due_amount': {
                            updatedKey = 'Emi 2 Due amount';
                            break;
                          }
                          case 'emi3_due_date': {
                            updatedKey = 'Emi 3 Due Date';
                            break;
                          }
                          case 'emi3_due_amount': {
                            updatedKey = 'Emi 3 Due Amount';
                            break;
                          }
                          case 'emi4_due_date': {
                            updatedKey = 'Emi 4 Due Date';
                            break;
                          }
                          case 'emi4_due_amount': {
                            updatedKey = 'Emi 4 Due Amount';
                            break;
                          }
                          case 'actual_due_amount': {
                            updatedKey = 'Actual Due Amount';
                            break;
                          }
                          case 'totalIntrestAndPenalty': {
                            updatedKey = 'Interest & Penalty as on Date';
                            break;
                          }
                          case 'totalPartPayment': {
                            updatedKey = 'Part Payment';
                            break;
                          }
                          case 'totalOverDueAmount': {
                            updatedKey = 'Over due amount as on Date';
                            break;
                          }
                          case 'loanDuration': {
                            updatedKey = 'Loan Duration';
                            break;
                          }
                          case 'emi1_due_days': {
                            updatedKey = 'Number of days over due (EMI1)';
                            break;
                          }
                          case 'emi2_due_days': {
                            updatedKey = 'Number of days over due (EMI2)';
                            break;
                          }
                          case 'emi3_due_days': {
                            updatedKey = 'Number of days over due (EMI3)';
                            break;
                          }
                          case 'emi4_due_days': {
                            updatedKey = 'Number of days over due (EMI4)';
                            break;
                          }
                          case 'penalty_perDay': {
                            updatedKey = 'Penalty Per Day';
                            break;
                          }
                          case 'penalty_percantage': {
                            updatedKey = 'Penalty Percantage';
                            break;
                          }
                          case 'emi1_interestPerDay': {
                            updatedKey = 'Emi 1 Interest Per Day';
                            break;
                          }
                          case 'emi2_interestPerDay': {
                            updatedKey = 'Emi 2 Interest Per Day';
                            break;
                          }
                          case 'emi3_interestPerDay': {
                            updatedKey = 'Emi 3 Interest Per Day';
                            break;
                          }
                          case 'emi4_interestPerDay': {
                            updatedKey = 'Emi 4 Interest Per Day';
                            break;
                          }
                          case 'netBankingGrade': {
                            updatedKey = 'Perfios Grade';
                            break;
                          }
                          case 'disburseTransactionId': {
                            updatedKey = 'Disbursed Transaction ID';
                            break;
                          }
                          case 'email': {
                            updatedKey = 'Email Address';
                            break;
                          }
                          case 'street': {
                            updatedKey = 'Street';
                            break;
                          }
                          case 'landmark': {
                            updatedKey = 'Landamark';
                            break;
                          }
                          case 'city': {
                            updatedKey = 'City';
                            break;
                          }
                          case 'state': {
                            updatedKey = 'State';
                            break;
                          }
                          case 'pincode': {
                            updatedKey = 'Pincode';
                            break;
                          }
                          case 'companyAddress': {
                            updatedKey = 'Address Office';
                            break;
                          }
                          case 'sector': {
                            updatedKey = 'Employement Sector';
                            break;
                          }
                          case 'degignation': {
                            updatedKey = 'Occupation Details';
                            break;
                          }
                          case 'empType': {
                            updatedKey = 'Employment Type';
                            break;
                          }
                          case 'purposeLoan': {
                            updatedKey = 'Purpose of the loan';
                            break;
                          }
                          case 'nbfc': {
                            updatedKey = 'NBFC Name';
                            break;
                          }
                          case 'employeename': {
                            updatedKey = 'Employer name';
                            break;
                          }
                          case 'autoDebit': {
                            updatedKey = 'Auto debit';
                            break;
                          }
                          case 'noticeDate': {
                            updatedKey = 'Notice Date';
                            break;
                          }
                          case 'notice25C': {
                            updatedKey = 'Notice25(C) Date';
                            break;
                          }
                          case 'lastPaymentDate': {
                            updatedKey = 'Last Payment Date';
                            break;
                          }
                          case 'lastAction': {
                            updatedKey = 'Last Activity';
                            break;
                          }
                          case 'approvedBy': {
                            updatedKey = 'Approved by';
                            break;
                          }
                          case 'lastCommentUser': {
                            updatedKey = 'Last Comment User';
                            break;
                          }
                          case 'lastCommentDate': {
                            updatedKey = 'Last Comment Date';
                            break;
                          }
                          default: {
                            break;
                          }
                        }
                        //for header of each columns
                        if (i === 0)
                          currentSheet
                            .cell(1, initialIndex)
                            .string(updatedKey !== '' ? updatedKey : key)
                            .style(bigFonts);

                        //for details of each row cells
                        currentSheet
                          .cell(i + 2, initialIndex)
                          .string((value ?? '-').toString())
                          .style(smallFonts);
                        //Responsive width of the cell
                        currentSheet
                          .column(initialIndex)
                          .setWidth(key.length * 1.75);
                        initialIndex++;
                      }
                    } catch (error) {}
                  }
                } catch (error) {}
              }
            } catch (error) {
              error;
            }
          }
        } catch (error) {}
      }
      const filePath = rawData.sheetName
        ? 'upload/report/' + rawData.sheetName
        : 'upload/file.xlsx';
      await workbook.write(filePath);
      return filePath;
    } catch (error) {}
  }
  //#endregion
  async storedChacheFiles(filePath, data) {
    try {
      try {
        const folderName = filePath?.split('/').splice(0, 3).join('/');
        fs.mkdirSync(folderName);
      } catch (error) {}
      fs.writeFileSync(
        filePath,
        JSON.stringify({ date: new Date().getTime(), data }),
      );
    } catch (error) {
      return false;
    }
  }

  async readChacheFiles(filePath, min) {
    try {
      const finalData: any = fs.readFileSync(filePath, 'utf-8');
      if (finalData) {
        const result = JSON.parse(finalData);
        if (result.date) {
          const lastResDiff = (new Date().getTime() - result.date) / 60000;
          if (lastResDiff < min) return result.data;
        }
      }
      return false;
    } catch (error) {}
  }

  dateToJsonStr(targetDate: Date, format = 'DD-MM-YYYY') {
    targetDate = new Date(targetDate);
    const jsonDate = targetDate.toJSON();
    const date = jsonDate.substring(8, 10);
    const month = jsonDate.substring(5, 7);
    const year = jsonDate.substring(0, 4);
    if (format == 'DD-MM-YYYY') return `${date}-${month}-${year}`;
    else if (format == 'YYYY-MM-DD') return `${year}-${month}-${date}`;
    else if (format == 'DD/MM/YYYY') return `${date}/${month}/${year}`;
    return `${date}-${month}-${year}`;
  }

  strDateToDate(cibilDate) {
    if (cibilDate && cibilDate.length == 8) {
      let year = cibilDate.slice(4, 8);
      let month = cibilDate.slice(2, 4);
      let date = cibilDate.slice(0, 2);
      return year + '-' + month + '-' + date;
    } else cibilDate;
  }

  getMonthAndYear(dateString) {
    try {
      const dateObject = new Date(dateString);
      const monthName = shortMonth[dateObject.getMonth()];
      const year = dateObject.getFullYear();
      return `${monthName}-${year}`;
    } catch (error) {}
  }
  //#region _arrayToExcel
  async _arrayToExcel(list: any[], fileName = '') {
    try {
      if (list.length < 1) return;
      const workbook = new excel.Workbook();
      const bigFonts = workbook.createStyle(kBigFonts);
      const smallFonts = workbook.createStyle(kSmallFonts);
      const currentSheet = workbook.addWorksheet('data');
      for (let index = 0; index < list.length; index++) {
        const element = list[index];
        for (let i = 0; i < element.length; i++) {
          const e = element[i];
          if (index === 0) {
            currentSheet
              .cell(1, i + 1)
              .string((e ?? '').toString())
              .style(bigFonts);
            currentSheet
              .column(i + 1)
              .setWidth((e ?? '').toString().length * 1.75);
          } else
            currentSheet
              .cell(index + 1, i + 1)
              .string(e.toString())
              .style(smallFonts);
        }
      }
      const filePath =
        'upload/report/' +
        (fileName
          ? fileName
          : 'thirdPartyCollection_' + new Date().toJSON().substring(0, 10)) +
        '.xlsx';
      await workbook.write(filePath);
      return filePath;
    } catch (error) {}
  }
  //#endregion

  // #gst calculation
  gstCalculations(processingFees: number, stampProfit) {
    let processingGST = (processingFees * 100) / 118;
    processingGST = parseFloat(processingGST.toFixed(2));
    let processingExcludingGST = processingFees - processingGST;
    processingExcludingGST = parseFloat(processingExcludingGST.toFixed(2));
    let stampGST = (stampProfit * 100) / 118;
    stampGST = parseFloat(stampGST.toFixed(2));
    let stampExcludingGST = stampProfit - stampGST;
    stampExcludingGST = parseFloat(stampExcludingGST.toFixed(2));
    return {
      processingGST,
      processingExcludingGST,
      stampGST,
      stampExcludingGST,
    };
  }

  getDateFormatted(date, connector = '-') {
    try {
      let today: any = new Date(date);
      let dd: any = today.getDate();
      let mm: any = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      if (dd < 10) dd = '0' + dd;
      if (mm < 10) mm = '0' + mm;
      today = dd + connector + mm + connector + yyyy;
      return today;
    } catch (error) {
      return '';
    }
  }
  // #end Gst calculations

  getDateList(startDate, endDate) {
    try {
      const listDate = [];
      const dateMove = new Date(startDate);
      let strDate = startDate;

      // while (strDate < endDate) {
      //   strDate = dateMove.toISOString().slice(0, 10);
      //   listDate.push(strDate);
      //   dateMove.setDate(dateMove.getDate() + 1);
      // }
      const dateLength = this.dateDifference(
        new Date(endDate),
        new Date(startDate),
      );
      for (let i = 0; i < dateLength + 1; i++) {
        try {
          strDate = dateMove.toISOString().slice(0, 10);
          listDate.push(strDate);
          dateMove.setDate(dateMove.getDate() + 1);
        } catch (error) {}
      }
      return listDate;
    } catch (error) {
      return k500Error;
    }
  }

  private getmonth(monthName: string) {
    let month;
    for (let index = 0; index < kMonths.length; index++) {
      const element = kMonths[index];
      if (
        element.toLocaleLowerCase().startsWith(monthName.toLocaleLowerCase())
      ) {
        if (index > 8) month = (index + 1).toString();
        else month = '0' + (index + 1).toString();
      }
    }
    return month;
  }

  //Convert 14/04/1998 string to 1998-04-14T10:00:00.000Z
  dateTimeToDate(dateTime: string, givenFormat?: string) {
    try {
      let dateString;
      if (dateTime.includes('T') && dateTime.includes('Z')) {
        return new Date(dateTime);
      } else if (!givenFormat) return;
      const format = givenFormat.toUpperCase();

      if (
        format === 'DD/MM/YYYY' ||
        format === 'DD-MM-YYYY' ||
        format === 'DD/MM/YYYY HHMMSS A' ||
        format === 'DD/MM/YY'
      ) {
        dateTime =
          dateTime.length == 9 ? dateTime.replace('/', '/0') : dateTime;
        const year: string =
          dateTime.length == 8
            ? '20' + dateTime.substring(6, 8)
            : dateTime.substring(6, 10);
        const month: string = dateTime.substring(3, 5);
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'DD MMM YYYY' || format === 'DD-MMM-YYYY') {
        dateTime = dateTime.length == format.length ? dateTime : '0' + dateTime;
        const monthString = dateTime.substring(3, 6);
        const year: string = dateTime.substring(7, 11);
        const month = this.getmonth(monthString);
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'MMM DD YYYY' || format === 'MMM DD,YYYY') {
        const year: string = dateTime.substring(7, 11);
        const month: string = this.getmonth(dateTime.substring(0, 3));
        const day: string = dateTime.substring(4, 6);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'MMM D, YYYY') {
        const year: string = dateTime.substring(
          dateTime.length - 4,
          dateTime.length,
        );
        const month: string = this.getmonth(dateTime.substring(0, 3));
        let day: string = dateTime.substring(4, 6);
        if (day.includes(',')) day = '0' + day.replace(',', '');
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'YYYY/MM/DD' || format === 'YYYY-MM-DD') {
        const year: string = dateTime.substring(0, 4);
        const month: string = dateTime.substring(5, 7);
        const day: string = dateTime.substring(8, 10);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'DD-MM-YY') {
        const year: string = '20' + dateTime.substring(6, 8);
        const month: string = dateTime.substring(3, 5);
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'DD MMM YY') {
        const year: string = '20' + dateTime.substring(7, 9);
        const month: string = this.getmonth(dateTime.substring(3, 6));
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'DDMMMYYYY' || format === 'DDMMMYY') {
        const year: string =
          (format === 'DDMMMYY' ? '20' : '') + dateTime.substring(5, 9);
        const month: string = this.getmonth(dateTime.substring(2, 5));
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (
        format === 'DD MMMM YYYY' ||
        format === 'DD-MMMM-YYYY' ||
        format === 'DD-MMM-YY'
      ) {
        const year: string =
          dateTime.length === 9
            ? '20' + dateTime.substring(dateTime.length - 2, dateTime.length)
            : dateTime.substring(dateTime.length - 4, dateTime.length);
        const month: string = this.getmonth(dateTime.substring(3, 6));
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      } else if (format === 'DD-M-YYYY') {
        const year: string = dateTime.substring(
          dateTime.length - 4,
          dateTime.length,
        );
        const month: string =
          dateTime.length == 9
            ? '0' + dateTime.substring(3, 4)
            : dateTime.substring(3, 5);
        const day: string = dateTime.substring(0, 2);
        dateString = `${year}-${month}-${day}T10:00:00.000Z`;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {}
  }

  //#region otp expired code
  otpIsExpired(date: Date, minutes = 10) {
    try {
      const ttl = minutes * 60 * 1000; // Minutes convert in miliseconds
      const currentTime = new Date().getTime();
      const lastTime = date.getTime() + ttl;
      if (currentTime < lastTime) return false;
      else return true;
    } catch (error) {
      return true;
    }
  }
  //#endregion

  //#region generate random code
  generateRandomCode(string_length) {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let randomstring = '';
    for (let i = 0; i < string_length; i++) {
      const rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring.toString();
  }
  //#endregion

  //#region string includes
  findIncludes(value: string, includes: string[]) {
    try {
      value = (value ?? '').toLocaleLowerCase();
      for (let index = 0; index < includes.length; index++) {
        const element = includes[index].toLocaleLowerCase();
        if (value.includes(element)) return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  //#region find differntion between tow date in hours
  findDiffInHours(date: Date, date2: Date) {
    try {
      const diff = date.getTime() - date2.getTime();
      return diff / 60000 / 60;
    } catch (error) {}
  }
  //#endregion

  //#region find the distance from 2 diff lat long
  getDistance(lat1, lon1, lat2, lon2, unit) {
    try {
      const radlat1 = (Math.PI * lat1) / 180;
      const radlat2 = (Math.PI * lat2) / 180;
      const theta = lon1 - lon2;
      const radtheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;
      if (unit == 'K') {
        dist = dist * 1.609344;
      }
      if (unit == 'N') {
        dist = dist * 0.8684;
      }
      return dist;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region  set time out function
  async timeout(timeOut: number, callback) {
    try {
      const isOpen = await new Promise(async (resolve) => {
        try {
          const timer = setTimeout(() => resolve(kTimeout), timeOut);
          callback((value) => {
            resolve(value);
          });
        } catch (error) {
          resolve(k500Error);
        }
      });
      return isOpen;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  getUserTypeAddress(jsonStr: string) {
    try {
      let typeAddress = JSON.parse(jsonStr);
      const flatInfo = typeAddress['Flat / Block number'];
      const societyInfo = typeAddress['Society name'];
      const landmarkInfo = typeAddress['Landmark'];
      typeAddress = `${flatInfo}, ${societyInfo}, ${landmarkInfo}`;
      return typeAddress;
    } catch (error) {
      return '';
    }
  }

  getUserAadharAddress(address: string) {
    try {
      address = JSON.parse(address);
      let formatedAddress = '';
      if (address['house']) {
        const updatedHouse = this.checkAndRemoveComma(address['house']);
        formatedAddress += updatedHouse + ', ';
      }
      if (address['street']) {
        const updatedStreet = this.checkAndRemoveComma(address['street']);
        formatedAddress += updatedStreet + ', ';
      }
      if (address['landmark']) {
        const updatedLandmark = this.checkAndRemoveComma(address['landmark']);
        formatedAddress += updatedLandmark + ', ';
      }
      if (address['po']) {
        const updatedPo = this.checkAndRemoveComma(address['po']);
        formatedAddress += updatedPo + ', ';
      }
      if (address['loc']) {
        const updatedPo = this.checkAndRemoveComma(address['loc']);
        formatedAddress += updatedPo + ', ';
      }
      if (address['vtc']) {
        const updatedPo = this.checkAndRemoveComma(address['vtc']);
        formatedAddress += updatedPo + ', ';
      }
      if (address['subdist']) {
        const updatedSubdist = this.checkAndRemoveComma(address['subdist']);
        formatedAddress += updatedSubdist + ', ';
      }
      if (address['dist']) {
        const updatedDist = this.checkAndRemoveComma(address['dist']);
        formatedAddress += updatedDist + ', ';
      }
      if (address['state']) {
        const updatedState = this.checkAndRemoveComma(address['state']);
        formatedAddress += updatedState + ', ';
      }
      if (address['country']) {
        const updatedCountry = this.checkAndRemoveComma(address['country']);
        formatedAddress += updatedCountry;
      }

      formatedAddress = formatedAddress.replace(/#/g, '');
      formatedAddress = formatedAddress.replace(/\*/g, '');
      return formatedAddress;
    } catch (error) {
      return '';
    }
  }

  dateToFormatStr(targetDate: Date) {
    try {
      const jsonDate = this.getGlobalDate(targetDate);
      const year = jsonDate.getFullYear().toString();

      let date = jsonDate.getDate().toString();
      if (date.length == 1) date = '0' + date;

      let month: any = jsonDate.getMonth();
      month = kMonths[month].substring(0, 3);
      return date + '-' + month + '-' + year;
    } catch (error) {}
  }

  //#region delay in MS
  delay = (ms) => new Promise((res) => setTimeout(res, ms));
  //#endregion

  //#region set value for cibil
  setValue(value: string, setValue: string, position: number, length: number) {
    try {
      if (setValue.length > length) return k999Error;
      let tempString = value.substring(0, position - 1);
      const remaingString = getSpace(length - setValue.length);
      tempString += setValue + remaingString;
      return tempString;
    } catch (error) {
      return k999Error;
    }
  }
  //#endregion

  //#region get verifiaction data
  getVerificationLastData(verificationList: any[]) {
    let minutes = 0;
    let waitingTime = '-';
    try {
      if (verificationList.length != 0) {
        const sortedData = verificationList.sort((a, b) => b?.id - a?.id);
        const data = sortedData[0];
        const createdAt = this.dateTimeToDate(data?.createdAt.toJSON());
        let endDate = this.dateTimeToDate(data?.endDate);
        if (!endDate) endDate = new Date();
        minutes = this.dateDifference(endDate, createdAt, 'Minutes');
        waitingTime = this.formateMinutes(minutes);
      }
    } catch (error) {}
    return { minutes, waitingTime };
  }
  //#endregion
  getVerificationTimeDiff(verificationList: any[]) {
    try {
      if (verificationList.length != 0) {
        const sortedData = verificationList.sort((a, b) => b?.id - a?.id);
        const data = sortedData[0];
        const createdAt = data.createdAt;
        let endDate = data?.endDate;
        if (!endDate) endDate = new Date();
        else endDate = new Date(endDate);
        const minutes = this.dateDifference(endDate, createdAt, 'Minutes');
        return { createdAt, endDate, minutes };
      }
      return {};
    } catch (error) {
      return {};
    }
  }
  //#region get data minutes to d h c
  formateMinutes(totalMinutes: number) {
    const absTotal = Math.abs(totalMinutes);
    const mins = absTotal % 60;
    const hours = Math.floor(absTotal / 60);
    const days = Math.floor(hours / 24);
    const hourss = hours % 24;
    return days + 'd, ' + hourss + 'h, ' + mins + 'm';
  }
  //#endregion

  //#region get credit data sorted
  sortCreditScore(creditScoreList) {
    let creditScore;
    try {
      if (creditScoreList.length != 0) {
        const sortedData = creditScoreList.sort((a, b) => b?.id - a?.id);
        creditScore = sortedData[0];
      }
    } catch (error) {}
    return creditScore;
  }
  //#endregion

  //object to array convert
  objListToArr(obj) {
    try {
      const finalArr = [];
      for (const key in obj) {
        try {
          const value = obj[key];
          value['key'] = typeof key == 'string' ? (+key).toString() : key;
          finalArr.push(value);
        } catch (error) {}
      }
      return finalArr;
    } catch (error) {
      return k500Error;
    }
  }

  manageDateAttr(formate, entity = '', column = '', isAttr = true) {
    try {
      let txt = column
        ? Sequelize.cast(Sequelize.col(column), 'timestamp with time zone')
        : Sequelize.literal(
            `${entity}"createdAt" at time zone 'Asia/Kolkata' at time zone 'utc'`,
          );
      const yearAttr = Sequelize.fn('DATE_PART', formate, txt);
      return isAttr ? [yearAttr, column + formate] : yearAttr;
    } catch (error) {
      return {};
    }
  }

  //#region getting user last active time
  getLastActiveUserTime(lastOnlineTime) {
    try {
      let lastActiveAgo = '';
      let lastActiveAgoMinutes = 0;
      if (lastOnlineTime) {
        const onlineDate = this.dateTimeToDate(lastOnlineTime);
        lastActiveAgoMinutes = this.dateDifference(
          onlineDate,
          new Date(),
          'Minutes',
        );
        lastActiveAgo = this.formateMinutes(lastActiveAgoMinutes);
      }
      return { lastActiveAgoMinutes, lastActiveAgo };
    } catch (error) {}
  }

  //#region get age from aadhar dob
  getAgeFromAadhar(aadharDOB) {
    try {
      const newDate = aadharDOB.split('/').reverse().join('-');
      const dateOfBirth = new Date(newDate);
      const diff = Date.now() - dateOfBirth.getTime();
      const ageDate = new Date(diff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return age;
    } catch (error) {}
  }
  //#endregion

  //#region to aadhaar DOB date in kyc format -> 2002-07-22
  async getDateAsPerAadhaarDOB(dateOfBirth) {
    if (dateOfBirth.includes('/')) {
      const modifiedDOB = dateOfBirth.split('/').reverse().join('-');
      const aadharDOB = modifiedDOB.split('-');

      aadharDOB[1] = await this.addLeadingZero(parseInt(aadharDOB[1], 10));
      aadharDOB[2] = await this.addLeadingZero(parseInt(aadharDOB[2], 10));

      return aadharDOB[0] + '-' + aadharDOB[1] + '-' + aadharDOB[2];
    }
    return dateOfBirth;
  }

  async addLeadingZero(number) {
    return number < 10 ? `0${number}` : `${number}`;
  }

  getPincodeFromAddress(aadhaarResponse) {
    let pincode = null;
    try {
      if (aadhaarResponse) {
        const response = JSON.parse(aadhaarResponse);
        pincode = response?.zip ?? response?.pincode ?? '-';
        if (pincode == '-' && response['addressDetails']) {
          try {
            let address = response['addressDetails'];
            if (typeof address == 'string') address = JSON.parse(address);
            pincode = address['pc'] ?? '-';
          } catch (error) {
            return pincode;
          }
        }
      }
      return pincode;
    } catch (error) {
      return pincode;
    }
  }
  //#region find pincode
  async findPinCode(address) {
    let pinCode = '';
    try {
      let po = (address.po ?? '').toLowerCase();
      let dist = (address.dist ?? '').toLowerCase();
      if (po && !pinCode) {
        po = po.replace(/\./g, ' ');
        const url = kPostoffice + po;
        pinCode = await this.callPinCodeApi(url);
      }
      if (!pinCode) {
        dist = dist.replace(/\./g, ' ');
        const url = kPostoffice + dist;
        pinCode = await this.callPinCodeApi(url);
      }
    } catch (error) {}
    if (!pinCode) pinCode = '-';
    return pinCode ?? '-';
  }
  //#endregion

  //#region api call for pin code
  async callPinCodeApi(url: string) {
    try {
      url = encodeURI(url);
      const result = await this.apiService.get(url);
      if (result[0]['Status'] == 'Success') {
        const data = result[0]['PostOffice'][0];
        return data?.Pincode;
      }
    } catch (error) {}
  }
  //#endregion

  //#region Checks user is eligible as per age criteria or not
  isEligibleAsPerAge(aadharDOB) {
    try {
      const newDate = aadharDOB.split('/').reverse().join('-');
      const dateOfBirth = new Date(newDate);
      const diff = Date.now() - dateOfBirth.getTime();
      const ageDate = new Date(diff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      const type = age < MIN_AGE ? 2 : age >= MAX_AGE ? 1 : 0;
      if (age < MIN_AGE || age >= MAX_AGE) return { type, age };
      return {};
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion
  //#region get overdue due day
  getOverDueDay(emiList) {
    let penalty_days = 0;
    try {
      const emiData = emiList.sort((a, b) => a.id - b.id);
      let startDate;
      for (let index = 0; index < emiData.length; index++) {
        try {
          const emi = emiData[index];
          if (emi.payment_due_status === '1' && emi?.penalty_update_date) {
            const date = new Date(emi.emi_date);
            const date1 = new Date(emi?.penalty_update_date);
            if (!startDate) startDate = date;
            if (startDate.getTime() < date.getTime()) startDate = date;
            const diffDays = this.differenceInDays(startDate, date1);
            startDate = date1;
            penalty_days += diffDays;
          }
        } catch (e) {}
      }
    } catch (error) {}
    return penalty_days;
  }
  //#endregion

  // Function to capitalize each word of a sentence
  async capitalizeFirstLetter(sentence) {
    if (typeof sentence !== 'string') {
      throw new Error('Input must be a string');
    }
    if (!sentence) {
      // Empty string provided, return it as is
      return sentence;
    }
    return sentence
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Converts 1,00,000 to 1L and 1,00,00,000 to 1Cr
  amountToLakhsAndCrores(input) {
    try {
      // Remove commas from the input
      const cleanedInput = input.replace(/,/g, '');
      const numberValue = parseInt(cleanedInput, 10);

      if (!isNaN(numberValue) && cleanedInput.length >= 6) {
        if (cleanedInput.length >= 8) {
          const crores = (numberValue / 1e7).toFixed(2);
          return `${crores}Cr`;
        } else {
          const lakhs = (numberValue / 1e5).toFixed(2);
          return `${lakhs}L`;
        }
      } else {
        return input;
      }
    } catch (error) {
      return input;
    }
  }

  // convert minutes to hours and days ago
  convertMinutesToHours(value) {
    try {
      let seconds = Math.floor((+new Date() - +new Date(value)) / 1000);
      if (seconds < 29)
        // less than 30 seconds ago will show as 'Just now'
        return 'Just now';
      const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hr: 3600,
        min: 60,
        sec: 1,
      };
      let counter;
      for (const i in intervals) {
        counter = Math.floor(seconds / intervals[i]);
        if (counter > 0)
          if (counter === 1) {
            return counter + ' ' + i + ' ago'; // singular (1 day ago)
          } else {
            return counter + ' ' + i + 's ago'; // plural (2 days ago)
          }
      }
      if (typeof value == 'object') {
        return '-';
      }
      return value;
    } catch (error) {
      return '';
    }
  }

  // get Date b/w two days
  getDateRange(startDate, endDate) {
    const dateRange = [];
    for (
      let currentDate = moment(startDate);
      currentDate <= moment(endDate);
      currentDate.add(1, 'day')
    ) {
      dateRange.push(currentDate.toDate());
    }
    return dateRange;
  }

  getDateTimeRange(startDate) {
    try {
      const startHour = moment(startDate).startOf('day').hour();

      const dateTimeRange = [];
      const currentEndHour = moment().hour();

      for (
        let currentDate = moment().startOf('day').hour(startHour);
        currentDate.isSameOrBefore(moment().endOf('day').hour(currentEndHour));
        currentDate.add(1, 'hour')
      ) {
        dateTimeRange.push(currentDate.toDate());
      }
      return dateTimeRange;
    } catch (error) {}
  }
}

//#region  convert Date in DDMMYYYY
export function convertDateInDDMMYYYY(convertDate: string) {
  try {
    const day = convertDate.substring(8, 10);
    const month = convertDate.substring(5, 7);
    const year = convertDate.substring(0, 4);
    return day + month + year;
  } catch (error) {
    return null;
  }
}
//#endregion

//#region get withe Space
export function getSpace(length: number) {
  // return Array(length).fill('\xa0').join('');
  let tempString = '';
  for (let index = 0; index < length; index++) {
    tempString += ' ';
  }
  return tempString;
}
export const requiredFeildsForCrm = ['COLLECTION'];
export const COLLECTION = 'COLLECTION';
export const LEAD = 'LEAD';
export const LENDING = 'LENDING';
export const SUPPORT = 'SUPPORT';
export const crmTypeTitle = {
  '0': 'Pre-calling',
  '1': 'Post-Calling',
  '2': 'On Due',
};
//#endregion

//#region encrypt text
export async function encryptText(text: string) {
  try {
    const encryptedText = await CryptoJS.AES.encrypt(
      text,
      process.env.SECRET_ED_KEY,
    ).toString();
    return encryptedText;
  } catch (error) {
    return null;
  }
}
//#endregion

//#region decrypt text
export function decryptText(text: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(text, process.env.SECRET_ED_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedText;
  } catch (error) {
    return null;
  }
}

function k408Error(k408Error: any): void {
  throw new Error('Function not implemented.');
}
//#endregion
