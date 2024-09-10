// Imports
import { isNumber } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { CryptService } from './crypt.service';
import { kDummyAccs } from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class CommonService {
  constructor(private readonly cryptService: CryptService) {}

  getRandomId() {
    return (
      EnvConfig.nbfc.nbfcCodeName +
      Math.random().toString(36).substr(2, 9) +
      Date.now()
    );
  }

  async softapprovalFunction(
    approvedAmount: any,
    interestRate,
    installmentDate: any,
    installmentDays,
    totaldays,
  ) {
    let tempApprovedAmount = approvedAmount;
    let toatlEmiamount: number = 0;
    let totalInterestAmount: number = 0;
    let softApproval: any = [];
    let perDay = Math.round(approvedAmount / totaldays).toFixed(2);
    for (let index = 0; index < installmentDays.length; index++) {
      const element = installmentDays[index];
      let prinAmount = (approvedAmount / totaldays) * element;
      let emiInterestAmount =
        ((tempApprovedAmount * interestRate) / 100) * element;
      tempApprovedAmount = tempApprovedAmount - prinAmount;
      softApproval.push({
        Date: installmentDate[index],
        Emi: Math.round(prinAmount + emiInterestAmount).toFixed(2),
        Days: element,
        PrincipalCovered: Math.round(prinAmount).toFixed(2),
        InterestCalculate: Math.round(emiInterestAmount).toFixed(2),
        RateofInterest: parseFloat(interestRate).toFixed(3) + '%',
      });
      toatlEmiamount += +Math.round(prinAmount + emiInterestAmount).toFixed(2);
      totalInterestAmount += +Math.round(emiInterestAmount).toFixed(2);
    }
    return { softApproval, toatlEmiamount, totalInterestAmount, perDay };
  }

  //#region generate 4 digit otp
  generateOTP(phone?: string) {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) OTP += digits[Math.floor(Math.random() * 10)];
    const mode = process.env.MODE;
    if (mode == 'DEV' || mode == 'UAT' || kDummyAccs.includes(phone ?? ''))
      return '1111';
    return OTP.toString();
  }
  //#endregion

  //#region generate
  generatePassword() {
    const caps = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const str = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    let password = '';
    password += caps.charAt(Math.floor(Math.random() * 26));
    for (let i = 0; i < 4; i++)
      password += str.charAt(Math.floor(Math.random() * 26));
    password += '@';
    for (let i = 0; i < 4; i++)
      password += digits[Math.floor(Math.random() * 10)];
    return password.toString();
  }
  //#endregion

  getSearchData(searchText) {
    try {
      searchText = (searchText ?? '').trim();
      if (searchText?.length <= 2) searchText = '';

      // Search with loan Id
      let searchType = 'Name';
      if (searchText && searchText?.toLowerCase().startsWith('l-')) {
        searchText = searchText.slice(2);
        if (!isNumber(+searchText))
          return k422ErrorMessage('Please enter valid loanId');
        searchType = 'LoanId';
      }
      // Search with phone number
      else if (searchText && isNumber(+searchText)) {
        const encryptedData = this.cryptService.encryptPhone(searchText);
        searchText = '%' + encryptedData.split('===')[1] + '%';
        searchType = 'Number';
      }

      return { type: searchType, text: searchText };
    } catch (error) {
      return kInternalError;
    }
  }

  removePrefixFromMobile(phone: string) {
    if (phone.length == 10) return phone;
    let cleanedNumber = phone.replace(/^\+?91/, '');
    // Extract last 10 digits
    return cleanedNumber.slice(-10);
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    // Pad the hours, minutes, and seconds with leading zeros if needed
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
}
