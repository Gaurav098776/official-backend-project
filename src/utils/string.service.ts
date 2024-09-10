// Imports
import { Injectable } from '@nestjs/common';
import { kRuppe } from 'src/constants/strings';

@Injectable()
export class StringService {
  makeFirstLetterCapital(targetString: string) {
    if (!targetString) return targetString;
    if (typeof targetString != 'string') return targetString;

    if (targetString.length == 1) return targetString.toUpperCase();
    return targetString.charAt(0).toUpperCase() + targetString.slice(1);
  }

  readableAmount(amount, skipRuppe = false) {
    if (amount == null) return '-';

    const formattedAmount = this.amountNumberWithCommas(amount);
    if (skipRuppe) return formattedAmount;
    return kRuppe + formattedAmount;
  }

  private amountNumberWithCommas(x) {
    let amount: string = x.toString();
    if (amount.length < 6)
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    else {
      amount = x.toString().replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      let tempAmount = '';
      let isCommas = false;
      for (let index = amount.length - 1; index >= 0; index--) {
        const element = amount[index];
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
  }
}
