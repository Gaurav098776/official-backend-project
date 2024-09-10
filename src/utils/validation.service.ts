// Imports
import { Injectable } from '@nestjs/common';
import { nIpCheck, nIpCheckerKey } from 'src/constants/network';
import { APIService } from './api.service';
import { TypeService } from './type.service';
import { k422ErrorMessage } from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { NAME_MISS_MATCH_PER } from 'src/constants/globals';

@Injectable()
export class ValidationService {
  constructor(
    private readonly typeService: TypeService,
    private readonly commonService: CommonSharedService,
    private readonly apiService: APIService,
  ) {}

  //#region  compare name
  async compareName(
    name1: string,
    name2: string,
    gender?: string,
    appType?: number,
  ) {
    try {
      const nameA = name1.toLowerCase();
      const nameB = name2.toLowerCase();

      const spansA = this.typeService._replaceNameSomeWord(nameA);
      const spansB = this.typeService._replaceNameSomeWord(nameB);
      if (!this.typeService.checkGenderWithAdhaar(nameB, gender)) {
        return false;
      }
      const nameMatch = await this.nameMatch(
        spansA.join(' '),
        spansB.join(' '),
        appType,
      );
      if (nameMatch?.valid) {
        if (nameMatch.data >= NAME_MISS_MATCH_PER) return true;
        else return false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  private checkNameProbability(spansA: string[], spansB: string[]) {
    try {
      // let number = 0;
      // let count = 0;
      // for (let index = 0; index < spansA.length; index++) {
      //   const name1 = spansA[index];
      //   if (name1) {
      //     spansB.forEach((name2) => {
      //       const probab = this.getTextProbability(name1, name2);
      //       if ((probab ?? 0) != 0) number += probab;
      //     });
      //     count++;
      //   }
      // }
      // if (number / count > 72) return true;

      spansA.sort();
      spansB.sort();
      const targetA = spansA.join('');
      const targetB = spansB.join('');
      const textProbability = this.getTextProbability(targetA, targetB);
      if (textProbability > 70) return true;
      if (spansA.length > 0 && spansB.length > 0) {
        let bigSpans = spansA;
        let lessSpans = spansB;
        if (spansA.length < spansB.length) {
          bigSpans = spansB;
          lessSpans = spansA;
        }
        let count = 0;
        let probability = 0;
        bigSpans.forEach((el) => {
          lessSpans.forEach((e) => {
            if (e.length > 2) {
              let temp;
              if (el.length > 2) {
                if (e.includes(el)) temp = 100;
                else if (el.includes(e)) temp = 100;
              } else {
                if (e.startsWith(el)) temp = 100;
                else if (el.startsWith(e)) temp = 100;
              }
              if (!temp) temp = this.getTextProbability(el, e);
              if (temp > 25) {
                probability += temp;
                count++;
              }
            }
          });
        });

        if (count && probability) probability = probability / count;
        if (
          probability > 60 &&
          (count > 1 || spansB.length == 1 || spansA.length == 1)
        )
          return true;
        else if (probability > 50 && count > 4) return true;
        else if (probability > 55 && count > 3) return true;
        else if (probability > 56 && count > 2) return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  getTextProbability(textA: string, textB: string, exceptions: string[] = []) {
    try {
      const isArranged = textA.trim().length > textB.trim().length;

      let targetA = (isArranged ? textA : textB)
        .toLowerCase()
        .replace(/[0-9]/g, '');
      let targetB = (!isArranged ? textA : textB)
        .toLowerCase()
        .replace(/[0-9]/g, '');
      exceptions.forEach((el) => {
        try {
          targetA = targetA.replace(el, '');
          targetB = targetB.replace(el, '');
        } catch (error) {}
      });

      targetA = targetA.trim();
      targetB = targetB.trim();

      const spanA = targetA.split('');
      const spanB = targetB.split('');

      let matchedCount = 0;
      for (let index = 0; index < spanA.length; index++) {
        try {
          const currentTextA = spanA[index];
          let currentTextB = '';
          if (spanB.length > index) currentTextB = spanB[index];

          if (currentTextA === currentTextB) matchedCount++;
          else {
            if (index === 0 || index === spanA.length - 1) continue;
            const previousWordA = spanA[index - 1];
            const nextWordA = spanA[index + 1];
            const wordA = previousWordA + currentTextA + nextWordA;
            if (targetB.includes(wordA)) matchedCount++;
          }
        } catch (error) {}
      }

      let probability = (matchedCount * 100) / spanA.length;
      probability = parseFloat(probability.toFixed(2));
      return probability;
    } catch (error) {}
  }

  _compareNameCount(spansA: string[], spansB: string[]) {
    let matchedCount = 0;
    try {
      spansA.forEach((elementA) => {
        for (let index = 0; index < spansB.length; index++) {
          const elementB = spansB[index];
          if (elementA == elementB) {
            matchedCount++;
            break;
          } else if (elementA.startsWith(elementB)) {
            matchedCount++;
            break;
          } else if (
            (elementA.includes(elementB) || elementB.includes(elementA)) &&
            spansA.length > 1 &&
            spansB.length > 1
          ) {
            if (elementB.startsWith(elementA)) {
              matchedCount++;
              break;
            }
          }
        }
      });
    } catch (error) {}
    return matchedCount;
  }

  //#region Compare account number
  getCompareAN(accountNumber: string, dbAccountNumber: string) {
    try {
      accountNumber = accountNumber.toLocaleLowerCase();
      dbAccountNumber = dbAccountNumber.toLocaleLowerCase();
      if (accountNumber == dbAccountNumber) return true;
      let anList = [];
      let dbANList = [];
      if (accountNumber.includes('x')) anList = accountNumber.split('x');
      else if (accountNumber.includes('*')) anList = accountNumber.split('*');
      if (dbAccountNumber.includes('x')) dbANList = dbAccountNumber.split('x');
      else if (dbAccountNumber.includes('*'))
        dbANList = dbAccountNumber.split('*');
      if (anList.length == 0 && dbANList.length == 0) {
        const maskAN = this.startWithZero(accountNumber);
        const newAN = this.startWithZero(dbAccountNumber);
        if (newAN == maskAN) return true;
        else return false;
      }
      if (anList.length == 0) anList = [accountNumber];
      if (dbANList.length == 0) dbANList = [dbAccountNumber];
      return this.getAccountMachCount(
        anList.length > dbANList.length ? dbANList : anList,
        anList.length > dbANList.length ? anList : dbANList,
      );
    } catch (error) {
      return false;
    }
  }

  //#region if start with zero then remove the zero
  private startWithZero(value: string) {
    try {
      if (!value.startsWith('0')) return value;
      let tempValue = '';
      let isStopCheck = false;
      for (let index = 0; index < value.length; index++) {
        const element = value[index];
        if (element != '0') isStopCheck = true;
        if (isStopCheck) tempValue += element;
      }
      return tempValue;
    } catch (error) {
      return value;
    }
  }
  //#endregion

  private getAccountMachCount(list1: string[], list2: string[]) {
    let countOfAN = 0;
    if (list1.toString() == list2.toString()) return true;
    for (let i = 0; i < list1.length; i++) {
      const element = list1[i];
      if (element == '') continue;
      for (let index = 0; index < list2.length; index++) {
        const dbElement = list2[index];
        if (dbElement == '') continue;
        let isCheck = false;
        if (index === 0) {
          isCheck = true;
          if (element.startsWith(dbElement)) countOfAN++;
          else if (dbElement.startsWith(element)) countOfAN++;
        }
        if (index === list2.length - 1) {
          if (element.endsWith(dbElement)) countOfAN++;
          else if (dbElement.endsWith(element)) countOfAN++;
          isCheck = true;
        }
        if (
          isCheck == false &&
          ((i != 0 && i != list1.length - 1) || list1.length == 1)
        )
          if (element.includes(dbElement)) countOfAN++;
      }
    }
    list2 = list2.filter((item) => item);
    if (list2.length == countOfAN) return true;
    else return false;
  }
  //#endregion

  async waitUntil(validation, ms, maxAttempt = 40, currentAttempt = 0) {
    try {
      return new Promise((resolve, reject) => {
        try {
          setTimeout(async () => {
            if (validation()) {
              resolve({});
              return;
            } else if (currentAttempt >= maxAttempt)
              resolve(
                k422ErrorMessage(
                  'Oops ! Connection timeout please try again !',
                ),
              );
            else {
              currentAttempt++;
              resolve(
                await this.waitUntil(
                  validation,
                  ms,
                  maxAttempt,
                  currentAttempt,
                ),
              );
            }
          }, ms);
        } catch (error) {
          reject({});
        }
      });
    } catch (error) {
      return {};
    }
  }

  async addressMatch(addressOne, addressTwo, appType) {
    const baseUrl = this.commonService.getPythonBaseUrl(appType);
    const url = baseUrl + 'v2/address/verification';
    const probability: number = await new Promise((resolve) => {
      this.apiService
        .requestPost(url, {
          addressOne,
          addressTwo,
        })
        .then((res) => {
          if (res.valid) {
            resolve(res.data);
          } else {
            resolve(0);
          }
        })
        .catch((error) => {
          console.error('validation service addressMatch', 319);
          console.error(error);
          resolve(0);
        });
    });
    return probability;
  }

  async nameMatch(nameOne, nameTwo, appType) {
    const baseUrl = this.commonService.getPythonBaseUrl(appType);
    const url = baseUrl + 'v2/address/name-match';
    return this.apiService.requestPost(url, {
      nameOne,
      nameTwo,
    });
  }

  async isIndianIp(ip) {
    try {
      const response = await this.apiService.get(
        nIpCheck + ip + '?key=' + nIpCheckerKey,
        { security: 1 },
        {},
        { timeout: 5000 },
      );
      if (response == k500Error) return true;
      const securityIssue = Object.values(response?.security).some(
        (value) => value === true,
      );
      if (securityIssue == true) return { securityIssue };
      if (response?.country?.toLowerCase() == 'india') return true;
      return false;
    } catch (error) {
      return true;
    }
  }

  private commonNameVariations: { [key: string]: string } = {
    ltd: 'limited',
    pvt: 'private',
    // Add more variations as needed
  };

  checkSimilarity(name1: string, name2: string): boolean {
    const normalizedName1 = this.normalizeCompanyName(name1);
    const normalizedName2 = this.normalizeCompanyName(name2);

    const similarity = this.calculateSimilarity(
      normalizedName1,
      normalizedName2,
    );
    const similarityThreshold = 0.8;
    return similarity >= similarityThreshold;
  }

  normalizeCompanyName(name: string): string {
    let normalized = name.toLowerCase();
    normalized = normalized.replace(/\s*(and|&|,|\.)\s*/g, ' ');
    const words = normalized.split(/\s+/);

    // Replace common variations for each word
    const replacedWords = words.map((word) => {
      let modifiedWord = word;

      Object.entries(this.commonNameVariations).forEach(([key, value]) => {
        const regex = new RegExp(key, 'gi');
        modifiedWord = modifiedWord.replace(regex, value);
      });
      return modifiedWord;
    });

    // Join the words back into a single string
    normalized = replacedWords.join(' ');
    return normalized;
  }

  calculateSimilarity(name1: string, name2: string): number {
    const set1 = new Set(name1.split(' '));
    const set2 = new Set(name2.split(' '));

    const intersectionSize = this.intersectionSize(set1, set2);
    const unionSize = this.unionSize(set1, set2);
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
  }

  intersectionSize<T>(set1: Set<T>, set2: Set<T>): number {
    return Array.from(set1).filter((element) => set2.has(element)).length;
  }

  unionSize<T>(set1: Set<T>, set2: Set<T>): number {
    return new Set([...set1, ...set2]).size;
  }
}
