import { k422Error, k500Error, k999Error } from 'src/constants/misc';
import { kPostoffice } from 'src/constants/network';
import { registeredUsers } from 'src/entities/user.entity';
import { APIService } from 'src/utils/api.service';
import { convertDateInDDMMYYYY } from 'src/utils/type.service';
import { PostCodeModel } from './postCode.model';
import { STATE_LIST_TUDF, STATE_PIN_TUDF } from './values';
import { Injectable } from '@nestjs/common';

export const pcodeList: PostCodeModel[] = [];
@Injectable()
export class NSModel {
  constructor(private readonly apiService: APIService) {}

  ST: string = 'PN03N01';
  name: string = ''; //R
  dob: string = ''; //F
  gender: string = ''; //R//F
  //Identification Segment
  ID: string = 'ID03I01';
  idType: string = '010201'; //R
  idNumber: string = '';
  //Telephone Segment
  PT: string = 'PT03T01';
  phoneNumber: string = ''; //R
  phoneType: string = ''; //R
  //Email Contact Segment
  EC: string = 'EC03C01';
  email: string = ''; //R
  //Address Segment (PA)
  PA: string = 'PA03A01';
  address: string = '';
  stateCode: string = '';
  pinCode: string = '';
  addressCategory: string = '080204';
  residenceCode: string = '090202';

  //#region fill data
  async fillData(users: registeredUsers) {
    try {
      const model: NSModel = new NSModel(this.apiService);
      const modelNew: any = {
        ...model,
        apiService: null,
      };
      delete modelNew.apiService;

      modelNew.name = this.getNameAndAddress(users.fullName);
      modelNew.dob = this.getDOB(users?.kycData?.aadhaarDOB);
      modelNew.gender =
        '0801' + (users.gender.toUpperCase() == 'MALE' ? '2' : '1');
      modelNew.idNumber = '0210' + users?.kycData?.panCardNumber;
      modelNew.phoneNumber = '01' + users.phone.length + users.phone;
      modelNew.phoneType = '030201';
      modelNew.email = '01' + users.email.length + users.email;
      try {
        const address = JSON.parse(users?.kycData?.aadhaarAddress);
        modelNew.address = this.findAddress(address);
        modelNew.stateCode = this.getStateCode(address.state);
        let pincode = '';
        try {
          if (users?.kycData?.aadhaarResponse) {
            const respo = JSON.parse(users?.kycData?.aadhaarResponse);
            pincode = respo?.pincode ?? respo?.zip;
            if (pincode) pincode = '0706' + pincode;
          }
        } catch (error) {}
        if (!pincode.startsWith('0706'))
          pincode = await this.findPinCode(address);
        if (!pincode.startsWith('0706')) pincode = '0706999999';
        modelNew.pinCode = pincode;
        const value = this.validDateCodes(modelNew.stateCode, modelNew.pinCode);
        modelNew.stateCode = value.sCode;
        modelNew.pinCode = value.pCode;
      } catch (error) {}
      try {
        const resCode = users?.masterData?.otherInfo?.residentialInfo ?? '';
        if (resCode.toLowerCase() === 'owned') {
          modelNew.addressCategory = '080201';
          modelNew.residenceCode = '090201';
        }
      } catch (error) {}
      return modelNew;
    } catch (error) {
      return null;
    }
  }
  //#endregion

  //#region  convertInFormat
  convertInFormat() {
    try {
      const ns = this.nsFormat();
      const id = this.idFormat();
      const pt = this.ptFormat();
      const ec = this.ecFormat();
      const address = this.addressFormat();
      if (ns == k500Error || id == k500Error || pt == k500Error)
        return k500Error;
      if (ec == k500Error || address == k500Error) return k500Error;
      return ns + id + pt + ec + address;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region convert in cibil name Segment format
  nsFormat() {
    try {
      //// this call for Required filed only
      let formateText = '';
      if (!this.name || !this.dob || !this.gender) return k422Error;
      formateText += this.ST;
      formateText += this.name;
      formateText += this.dob;
      formateText += this.gender;
      if (formateText.length > 174) return k999Error;
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region convert in cibil Identification Segment format
  idFormat() {
    try {
      //// this call for Required filed only
      let formateText = '';
      if (this.idNumber.length == 14) {
        formateText += this.ID;
        formateText += this.idType;
        formateText += this.idNumber;
        if (formateText.length > 71) return k999Error;
      }
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region convert in cibil Telephone Segment format
  ptFormat() {
    try {
      let formateText = '';
      if (this.phoneNumber.length > 5) {
        formateText += this.PT;
        formateText += this.phoneNumber;
        formateText += this.phoneType;
        if (formateText.length > 28) return k999Error;
      }
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region convert in cibil Email Contact Segment format
  ecFormat() {
    try {
      let formateText = '';
      if (this.email.length > 5) {
        formateText += this.EC;
        formateText += this.email;
        if (formateText.length > 73) return k999Error;
      }
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region convert in cibil Address Segment format
  addressFormat() {
    try {
      let formateText = '';
      formateText += this.PA;
      formateText += this.address;
      formateText += this.stateCode;
      formateText += this.pinCode;
      formateText += this.addressCategory;
      formateText += this.residenceCode;
      if (formateText.length > 259) return k999Error;
      return formateText;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
  //#endregion

  //#region get name consumer field and address
  private getNameAndAddress(name: string, lendth: number = 27) {
    try {
      if (name.length < lendth) {
        let nameLength = name.length < 10 ? '0' + name.length : name.length;
        return '01' + nameLength + name;
      } else {
        const txtList = name.split(' ');
        const newArray = [];
        txtList.forEach((element) => {
          if (element.length < lendth) {
            if (newArray.length == 0) newArray.push(element);
            else {
              const index = newArray.length - 1;
              const value = newArray[index];
              if ((value ?? '').length + element.length < lendth - 1)
                newArray[index] = value + ' ' + element;
              else newArray.push(element);
            }
          }
        });
        let nameString = '';
        for (let index = 0; index < newArray.length; index++) {
          // TUDF have only 5 consumer field
          if (index < 5) {
            const element = newArray[index];
            const nameLength =
              element.length < 10 ? '0' + element.length : element.length;
            nameString += '0' + (index + 1) + nameLength + element;
          }
        }
        return nameString;
      }
    } catch (error) {}
  }
  //#endregion

  //#region get address lines
  getAddressNameLines(name: string, lendth: number = 40) {
    try {
      if (name.length < lendth) {
        return [name];
      } else {
        if (name.includes(',') && !name.includes(', ')) {
          name = name.replace(/\,/g, ', ');
        }
        const txtList = name.split(' ');
        const newArray = [];
        txtList.forEach((element) => {
          if (element.length < lendth) {
            if (newArray.length == 0) newArray.push(element);
            else {
              const index = newArray.length - 1;
              const value = newArray[index];
              if ((value ?? '').length + element.length < lendth - 1)
                newArray[index] = value + ' ' + element;
              else newArray.push(element);
            }
          }
        });
        return newArray;
      }
    } catch (error) {}
  }
  //#endregion

  //#region get dob
  private getDOB(dob: string) {
    try {
      if (dob) {
        const tempDOB = convertDateInDDMMYYYY(new Date(dob).toJSON());
        if (tempDOB != '01011970') return '0708' + tempDOB;
      }
    } catch (error) {}
  }
  //#endregion

  //#region  find address
  findAddress(address) {
    let txtAddress = '';
    try {
      txtAddress += address.house;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.landmark;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.street;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.loc;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.po;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.dist;
      if (!txtAddress.endsWith(', ') && txtAddress) txtAddress += ', ';
      txtAddress += address.state;
      txtAddress = this.getNameAndAddress(txtAddress, 41);
      return txtAddress;
    } catch (error) {}
  }
  //#endregion

  //#region find pincode
  async findPinCode(address) {
    let pinCode = '';
    try {
      let po = (address.po ?? '').toLocaleLowerCase();
      let dist = (address.dist ?? '').toLocaleLowerCase();
      const state = (address.state ?? '').toLocaleLowerCase();
      pinCode = this.findPinCodeInList(po, dist, state);
      if (po && !pinCode) {
        po = po.replace(/\./g, ' ');
        const url = kPostoffice + po;
        await this.callPinCodeApi(url);
        pinCode = this.findPinCodeInList(po, dist, state);
      }
      if (!pinCode) {
        dist = dist.replace(/\./g, ' ');
        const url = kPostoffice + dist;
        await this.callPinCodeApi(url);
        pinCode = this.findPinCodeInList('', dist, state);
      }
    } catch (error) {}
    if (pinCode) pinCode = '0706' + pinCode;
    else {
      this.addPinCode(address);
      pinCode = '0706999999';
    }
    return pinCode;
  }
  //#endregion

  //#region add pin code data in pcodelist
  private addPinCode(address) {
    try {
      const model = new PostCodeModel();
      const po = address?.po;
      const dist = address?.dist;
      let name = po;
      if (!name) name = dist;
      model.name = (name ?? '').toLocaleLowerCase();
      model.circle = (address?.landmark ?? '').toLocaleLowerCase();
      model.district = (address?.dist ?? '').toLocaleLowerCase();
      model.division = '';
      model.region = (address?.country ?? '').toLocaleLowerCase();
      model.state = (address?.state ?? '').toLocaleLowerCase();
      model.pincode = '999999';
      const findData = pcodeList.find(
        (a) => a.pincode == model.pincode && a.name == model.name,
      );
      if (!findData) pcodeList.push(model);
    } catch (error) {}
  }
  //#endregion

  //#region find pin code from list
  findPinCodeInList(po: string, dist: string, state: string) {
    try {
      if (dist == 'bengaluru') dist = 'bangalore';
      let list = [];
      pcodeList.forEach((element) => {
        let count = 0;
        if (po != '') {
          if (element.name.includes(po)) count++;
        } else if (element.name.includes(dist)) count++;
        if (
          element.district.includes(dist) ||
          dist.includes(element.district) ||
          dist.includes(element.district.replace(' ', '')) ||
          element.district.includes(dist.replace(' ', ''))
        )
          count++;
        if (
          element.state.includes(state) ||
          state.includes(element.state) ||
          element.circle.includes(state) ||
          state.includes(element.circle)
        )
          count++;
        if (count >= 2) list.push({ count, ...element });
      });

      list = list.sort((b, a) => a.count - b.count);
      if (list.length > 0) return list[0].pincode;
      return '';
    } catch (error) {
      return '';
    }
  }
  //#endregion

  //#region api call for pin code
  async callPinCodeApi(url: string) {
    try {
      url = encodeURI(url);
      const result = await this.apiService.get(url);
      if (result[0]['Status'] == 'Success') {
        result[0]['PostOffice'].forEach((element) => {
          try {
            const data = new PostCodeModel().json(element);
            const findData = pcodeList.find(
              (a) => a.pincode == data.pincode && a.name == data.name,
            );
            if (!findData) pcodeList.push(data);
          } catch (error) {}
        });
      }
    } catch (error) {}
  }
  //#endregion

  //#region find state code
  getStateCode(state: any): string {
    try {
      for (let index = 0; index < STATE_LIST_TUDF.length; index++) {
        const element = STATE_LIST_TUDF[index].toLocaleLowerCase().trim();
        if (element == state.toLocaleLowerCase().trim()) {
          index++;
          if (index < 10) return ('06020' + index).toString();
          else return '0602' + index.toString();
        }
      }
    } catch (error) {}
    return '060299';
  }
  //#endregion

  //#region valid date pin code and state code
  private validDateCodes(stateCode: string, pinCode: string) {
    const sCode = '060299';
    const pCode = '0706999999';
    try {
      if (stateCode === sCode || pinCode === pCode) return { sCode, pCode };
      const code = stateCode.replace('0602', '');
      const pin = +pinCode.substring(4, 6);
      const min: number = STATE_PIN_TUDF[code].min;
      const max: number = STATE_PIN_TUDF[code].max;
      if (pin >= min && pin <= max) return { sCode: stateCode, pCode: pinCode };
      else return { sCode, pCode };
    } catch (error) {
      return { sCode, pCode };
    }
  }
  //#endregion

  //#region for excel
  forExcel() {
    try {
      const array = [];
      array.push(this.name ?? '');
      array.push(this.dob ?? '');
      array.push(this.gender ?? '');
      array.push(this.idNumber ?? '');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push(this.phoneNumber ?? '');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push(this.email ?? '');
      array.push('');
      array.push(this.address ?? '');
      array.push(this.stateCode ?? '');
      array.push(this.pinCode ?? '');
      array.push(this.addressCategory ?? '');
      array.push(this.residenceCode ?? '');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      array.push('');
      for (let index = 0; index < array.length; index++) {
        const e = array[index];
        if (e) array[index] = e.substring(4);
      }
      return array;
    } catch (error) {
      return [];
    }
  }
  //#endregion
}
