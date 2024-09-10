import { Injectable } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import * as FormData from 'form-data';
import * as fs from 'fs';
import {
  AUGMONT_BANKS_URL,
  AUGMONT_BUY_URL,
  AUGMONT_EMAIL,
  AUGMONT_INVOICE_URL,
  AUGMONT_LOGIN_URL,
  AUGMONT_MERCHANT_URL,
  AUGMONT_PASSBOOK_URL,
  AUGMONT_PASSWORD,
  AUGMONT_RATES_URL,
  AUGMONT_SELL_URL,
  AUGMONT_TRANSFER_URL,
  AUGMONT_USER_URL,
} from 'src/constants/network';
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kNoDataFound,
  kParamMissing,
  kSuccessMessage,
} from 'src/constants/responses';
import {
  kAugmontPINCodeRoute,
  kBankDetailsRoute,
  kLegalMail,
  kShareAppRoute,
  kSomthinfWentWrong,
  kUserNotExist,
} from 'src/constants/strings';
import { BankingRepository } from 'src/repositories/banking.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { APIService } from 'src/utils/api.service';
import { CryptService } from 'src/utils/crypt.service';
import { AugmontTransactionRepository } from 'src/repositories/augmont_transaction.repository';
import {
  AUGMONT_BUY,
  AUGMONT_GST,
  AUGMONT_PROCESSING_FEES,
  AUGMONT_SELL,
  AUGMONT_TRANSFER,
  MAX_ANNUAL_GOLD_BUY_AMOUNT,
  MAX_ANNUAL_GOLD_BUY_QUANTITY,
  MAX_ANNUAL_SILVER_BUY_QUANTITY,
  MAX_DAY_BUY_AMOUNT,
  MIN_BUY_AMOUNT,
} from 'src/constants/globals';
import { TypeService } from 'src/utils/type.service';
import { RedisService } from 'src/redis/redis.service';
import { FileService } from 'src/utils/file.service';
import { kTaxInvoice } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';

let token;
let expiresAt = 0;

@Injectable()
export class AugmontService {
  constructor(
    private readonly api: APIService,
    private readonly repository: AugmontTransactionRepository,
    private readonly userRepo: UserRepository,
    private readonly cryptService: CryptService,
    private readonly bankRepo: BankingRepository,
    private readonly typeService: TypeService,
    private readonly redisService: RedisService,
    private readonly fileService: FileService,
  ) {}
  header = { Authorization: '' };
  //#region get rate of gold and sliver
  async getRate() {
    try {
      await this.loginAPI();
      const result = await this.api.get(
        AUGMONT_RATES_URL,
        null,
        this.header,
        null,
        true,
      );
      if (result?.statusCode === 200) return result?.result?.data;
      else {
        try {
          if (result?.data?.statusCode === 401)
            await this.redisService.set('AUGMONT', '');
        } catch (error) {}
        return k422ErrorMessage(result?.message);
      }
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region call login api and get token
  private async loginAPI() {
    const key = 'AUGMONT';
    try {
      const augData = (await this.redisService.get(key)) ?? '';
      expiresAt = 0;
      token = '';
      try {
        if (augData) {
          const jsonDatas = JSON.parse(augData);
          expiresAt = jsonDatas?.expiresAt ?? 0;
          token = jsonDatas?.token ?? '';
          this.header.Authorization = token;
          token = '';
        }
      } catch (error) {}
      if (new Date().getTime() > expiresAt || !token) {
        const body = { email: AUGMONT_EMAIL, password: AUGMONT_PASSWORD };
        const result = await this.api.post(AUGMONT_LOGIN_URL, body);
        const data = result?.result?.data;
        if (data) {
          token = data.tokenType + ' ' + data.accessToken;
          const currentDate = new Date();
          currentDate.setMinutes(currentDate.getMinutes() + 10);
          expiresAt = currentDate.getTime();
          this.header.Authorization = token;
          const jsonData = { expiresAt, token };
          await this.redisService.set(key, JSON.stringify(jsonData));
        } else return k500Error;
      }
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region get user details
  async getUserDetails(userId) {
    try {
      let isRegister = false;
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return { isRegister };
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error) return { isRegister };
      const passbook = await this.getPassbookDetails(augmont_id, userId);
      if (!passbook || passbook === k500Error) return { isRegister };
      isRegister = true;
      return { isRegister, augmont_id, ...passbook };
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region get augmont id
  private async getAugmontId(userId) {
    try {
      const att = ['id', 'phone', 'augmont_id'];
      const option = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(att, option);
      if (!userData || userData === k500Error) return k500Error;
      const phone = this.cryptService.decryptPhone(userData.phone);
      const augmont_id = userData?.augmont_id ?? phone;
      return augmont_id;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region check in augmont
  private async checkUserInAugmont(augmont_id) {
    try {
      await this.loginAPI();
      const url = AUGMONT_USER_URL + augmont_id;
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) return result?.result?.data;
      else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region GET passbook details
  private async getPassbookDetails(augmont_id, userId) {
    try {
      await this.loginAPI();
      const url = AUGMONT_USER_URL + augmont_id + AUGMONT_PASSBOOK_URL;
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) {
        const data = result?.result?.data;
        if (data) {
          await this.updateGoldAndSilver(data, augmont_id, userId);
          return data;
        } else return;
      } else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region Update gold and silver
  private async updateGoldAndSilver(data, augmont_id, userId) {
    try {
      const update: any = { augmont_id };
      const goldGrms = +(data?.goldGrms ?? '0');
      const silverGrms = +(data?.silverGrms ?? '0');
      if (goldGrms) update.goldGrms = goldGrms;
      if (silverGrms) update.silverGrms = silverGrms;
      await this.userRepo.updateRowData(update, userId);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region Get User Buy Sell History
  async getUserBuySellHistory(userId) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;
      let buyList = await this.getBuyList(augmont_id);
      buyList = this.prePareBuyArray(buyList);

      let sellList = await this.getSellList(augmont_id);
      sellList = this.prePareSellArray(sellList);

      let transferList = await this.getTransferList(augmont_id);
      transferList = await this.prePareTransferArray(transferList, augmont_id);

      return { buyList, sellList, transferList };
    } catch (e) {
      return k500Error;
    }
  }
  //#endregion

  //#region get buy gold/sliver list
  private async getBuyList(augmont_id) {
    try {
      await this.loginAPI();
      const url =
        AUGMONT_MERCHANT_URL + augmont_id + AUGMONT_BUY_URL + '?count=100000';
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) return result?.result?.data;
      else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region pre pare Buy array
  private prePareBuyArray(buyList) {
    try {
      if (!buyList || buyList === k500Error) return [];
      const arry = [];
      buyList.forEach((buy) => {
        try {
          arry.push({
            merchantTransactionId: buy?.merchantTransactionId,
            transactionId: buy?.transactionId,
            type: buy?.type,
            qty: buy?.qty,
            amount: buy?.inclTaxAmt,
            createdAt: buy?.createdAt,
          });
        } catch (error) {}
      });
      return arry;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region get Sell gold/sliver list
  private async getSellList(augmont_id) {
    try {
      await this.loginAPI();
      const url =
        AUGMONT_MERCHANT_URL + augmont_id + AUGMONT_SELL_URL + '?count=100000';
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) return result?.result?.data;
      else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region pre pare Sell array
  private prePareSellArray(list) {
    try {
      if (!list || list === k500Error) return [];
      const array = [];
      list.forEach((sell) => {
        try {
          array.push({
            merchantTransactionId: sell?.merchantTransactionId,
            transactionId: sell?.transactionId,
            type: sell?.type,
            qty: sell?.qty,
            amount: +sell?.amount,
            createdAt: sell?.createdAt,
          });
        } catch (error) {}
      });
      return array;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region get Transfer gold/sliver list
  private async getTransferList(augmont_id) {
    try {
      await this.loginAPI();
      const url =
        AUGMONT_MERCHANT_URL +
        augmont_id +
        AUGMONT_TRANSFER_URL +
        '?count=100000';
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) return result?.result?.data;
      else return k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region pre pare Transfer array
  private async prePareTransferArray(list, augmont_id) {
    try {
      if (!list || list === k500Error) return [];
      const augmontList = [];
      list.forEach((data) => {
        if (!augmontList.includes(data.senderUniqueId))
          augmontList.push(data.senderUniqueId);
        if (!augmontList.includes(data.receiverUniqueId))
          augmontList.push(data.receiverUniqueId);
      });
      const att = ['fullName', 'augmont_id'];
      const options = { where: { augmont_id: augmontList } };
      let userList = await this.userRepo.getTableWhereData(att, options);
      if (!userList || userList === k500Error) userList = [];
      const array = [];
      list.forEach((data) => {
        try {
          const reciver = data.receiverUniqueId;
          const sender = data.senderUniqueId;
          const isSend = augmont_id === sender;
          let find;
          if (isSend) find = userList.find((f) => f.augmont_id === reciver);
          else find = userList.find((f) => f.augmont_id === sender);
          const name = find?.fullName ?? (isSend ? reciver : sender);
          array.push({
            isSend,
            name,
            merchantTransactionId: data?.merchantTransactionId,
            transactionId: data?.transactionId,
            type: data?.metalType,
            qty: data?.quantity,
            createdAt: data?.createdAt,
          });
        } catch (error) {}
      });
      return array;
    } catch (error) {
      return [];
    }
  }
  //#endregion

  //#region buy Gold Or Silver
  async buyGoldOrSilver(userId, body) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error)
        return { route: kAugmontPINCodeRoute };
      return await this.buyGS(userId, augmont_id, body);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region add pin code
  async addPinCode(userId, pinCode) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;

      const att = ['id', 'fullName', 'email'];
      const option = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(att, option);
      if (!userData || userData === k500Error) return k500Error;
      const body: any = {
        mobileNumber: augmont_id,
        uniqueId: augmont_id,
        emailId: userData.email,
        userName: userData.fullName,
        userPincode: pinCode,
      };
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error) {
        const url = AUGMONT_USER_URL;
        const result = await this.api.post(url, body, null, null, {
          headers: this.header,
        });
        if (result?.statusCode === 201) return kSuccessMessage(result?.message);
        else return k422ErrorMessage(result?.message);
      } else {
        const url = AUGMONT_USER_URL + augmont_id;
        const result = await this.api.put(url, body, { headers: this.header });
        if (result?.statusCode === 200) return kSuccessMessage(result?.message);
        else return k422ErrorMessage(result?.message);
      }
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region buy gold or silver
  private async buyGS(userId, augmont_id, data) {
    try {
      const rateRes = await this.getRate();
      const rate = rateRes?.rates;
      if (rate) {
        const metalType = data?.type;
        const checkBuy: any = await this.checkBuyLimit(rate, data);
        if (checkBuy?.message) return checkBuy;
        const merchantTransactionId = new Date().getTime().toString();
        /// create
        const createData: any = {
          userId,
          type: metalType,
          merchantTransactionId,
          mode: AUGMONT_BUY,
          charges: {
            gst: AUGMONT_GST,
            processingFees: AUGMONT_PROCESSING_FEES,
          },
        };
        const body: any = { metalType, uniqueId: augmont_id };
        if (data?.quantity) {
          createData.quantity = data?.quantity;
          body.quantity = data?.quantity;
        } else if (data?.amount) {
          createData.amount = data?.amount;
          body.amount = data?.amount;
        }
        const create = await this.repository.create(createData);
        if (!create || create === k500Error) return k500Error;
        //  api call
        body.merchantTransactionId = merchantTransactionId;
        body.blockId = rateRes?.blockId;
        if (metalType === 'gold') body.lockPrice = rate?.gBuy;
        else body.lockPrice = rate?.sBuy;

        const url = AUGMONT_MERCHANT_URL + AUGMONT_BUY;
        const result = await this.api.post(
          url,
          body,
          this.header,
          null,
          {},
          true,
        );
        const transactionId = result?.result?.data?.transactionId;
        let invoice;
        if (transactionId) {
          const invoiceUrl = await this.generateInvoice(transactionId);
          if (!invoiceUrl.message) invoice = invoiceUrl;
        }
        return await this.updateTransaction(result, create.id, invoice);
      } else return kBadRequest;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //check max limit for buy
  async checkBuyLimit(rate, data) {
    try {
      const userId = data?.userId;
      const metalType = data?.type;
      const quantity = data?.quantity;
      const amount = data?.amount;
      const isSilver = metalType == 'silver';
      const newRate = isSilver ? rate?.sBuy : rate?.gBuy;
      let tAmt = 0;
      let tQtt = 0;
      if (quantity) {
        tAmt = quantity * newRate;
        tQtt += quantity;
      } else if (amount) {
        tQtt = amount / newRate;
        tAmt += amount;
      }
      if (amount <= MIN_BUY_AMOUNT || tAmt <= MIN_BUY_AMOUNT)
        return k422ErrorMessage('Low buy amount!');
      const toDay = this.typeService.getGlobalDate(new Date());
      const status = ['INITIALIZED', 'COMPLETED'];
      const options: any = {
        where: { mode: AUGMONT_BUY, userId, status },
      };
      options.where.completionDate = toDay.toJSON();
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
      ];
      options.group = ['type'];
      /// check  daily buy limit
      const dayTra = await this.repository.getRoweData(att, options);
      if (dayTra === k500Error) return kInternalError;
      if ((dayTra?.totalAmount ?? 0) + tAmt > MAX_DAY_BUY_AMOUNT)
        return k422ErrorMessage('Exceed day limit.');

      options.group = ['type'];
      options.where.type = metalType;
      //current financial year
      const fYear = new Date();
      fYear.setFullYear(fYear.getFullYear() - 1);
      fYear.setMonth(3);
      fYear.setDate(1);
      const startYear = this.typeService.getGlobalDate(fYear);
      options.where.completionDate = { [Op.gte]: startYear };

      const annualTra = await this.repository.getRoweData(att, options);
      if (annualTra === k500Error) return kInternalError;
      const annualQtt = (+annualTra?.totalQuantity ?? 0) + tQtt;
      const annualAmt = (+annualTra?.totalAmount ?? 0) + tAmt;
      if (
        ((annualAmt >= MAX_ANNUAL_GOLD_BUY_AMOUNT ||
          annualQtt >= MAX_ANNUAL_GOLD_BUY_QUANTITY) &&
          !isSilver) ||
        (annualQtt >= MAX_ANNUAL_SILVER_BUY_QUANTITY && isSilver)
      )
        return k422ErrorMessage('Exceed annual limit.');

      return true;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region get Invoice
  async generateInvoice(transactionId) {
    try {
      if (!transactionId) return kParamMissing(transactionId);
      await this.loginAPI();
      const url = AUGMONT_INVOICE_URL + transactionId;
      const result = await this.api.get(url, null, this.header, null, true);
      if (result?.statusCode === 200) {
        const data = result?.result?.data;
        if (data) return this.generateInvoicePDF(data);
        else return;
      } else return kInternalError;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //Generate Invoice PDF
  private async generateInvoicePDF(data) {
    try {
      const path = kTaxInvoice;
      const invoiceDate = data?.invoiceDate;
      const taxSplit = data?.taxes?.taxSplit;
      const CGST = taxSplit?.find((tax) => tax?.type == 'CGST');
      const SGST = taxSplit?.find((tax) => tax?.type == 'SGST');
      const IGST = taxSplit?.find((tax) => tax?.type == 'IGST');
      const netAmount = (+data?.netAmount ?? 0).toFixed(2);
      const netAmountWords = this.typeService.getAmountInWords(netAmount);
      const dynamicValues = {
        name: data?.userInfo?.name,
        state: data?.userInfo?.state,
        invoiceNumber: data?.invoiceNumber,
        invoiceDate,
        placeOfSupply: '-',
        metalType: data?.metalType,
        purity: data?.purity,
        karat: data?.karat,
        transactionId: data?.transactionId,
        hsnCode: data?.hsnCode,
        quantity: data?.quantity,
        rate: data?.rate,
        unitType: data?.unitType,
        grossAmount: data?.grossAmount,
        totalTaxAmount: data?.taxes?.totalTaxAmount,
        CGSTAmount: CGST?.taxAmount,
        CGSTPerc: CGST?.taxPerc,
        SGSTAmount: SGST?.taxAmount,
        SGSTPerc: SGST?.taxPerc,
        IGSTAmount: IGST?.taxAmount,
        IGSTPerc: IGST?.taxPerc,
        grossInvoice: +data?.netAmount - +data?.discount[0]?.amount,
        discount: data?.discount[0]?.amount,
        netAmount,
        netAmountWords,
        legalMail: kLegalMail,
        NBFC: EnvConfig.nbfc.nbfcName,
        legalNumber: EnvConfig.number.legalNumber,
      };
      const filePath: any = await this.addDynamicValues(path, dynamicValues);
      if (filePath?.message) return filePath;
      const url = await this.fileService.uploadFile(filePath);
      if (url === k500Error) return kInternalError;
      return url;
    } catch (error) {
      return kInternalError;
    }
  }

  private async addDynamicValues(path: string, dynamicValues: any) {
    try {
      if (!dynamicValues) return kInternalError;
      let fileContent = fs.readFileSync(path, 'utf-8');
      Object.keys(dynamicValues).map((key) => {
        fileContent = fileContent.replace(
          new RegExp(`##${key}##`, 'g'),
          dynamicValues[key],
        );
      });
      const pdfPath = await this.fileService.dataToPDF(fileContent);
      if (pdfPath === k500Error) return kInternalError;
      return pdfPath;
    } catch (error) {
      return kInternalError;
    }
  }

  //get or update Buy Invoice
  async getBuyInvoice(query) {
    try {
      const userId = query?.userId;
      if (!userId) return kParamMissing('userId');
      const transactionId = query?.transactionId;
      if (!transactionId) return kParamMissing('transactionId');

      const option = {
        where: {
          transactionId,
          userId,
          status: 'COMPLETED',
          mode: AUGMONT_BUY,
        },
      };
      const data = await this.repository.getRoweData(['id', 'invoice'], option);
      if (data === k500Error) return kInternalError;
      if (!data) return kNoDataFound;
      let id = data?.id;
      let invoice = data?.invoice;
      if (!invoice) {
        invoice = await this.generateInvoice(transactionId);
        if (invoice?.message) return invoice;
        await this.repository.updateRowData({ invoice }, id);
      }
      return { invoice };
    } catch (error) {
      return kInternalError;
    }
  }

  //#region sell Gold Or Silver
  async sellGoldOrSilver(userId, body) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error)
        return k422ErrorMessage(kUserNotExist);
      const bankData = await this.getBankDetails(augmont_id, userId);
      if (!bankData) return k500Error;
      if (!bankData.userBankId) return bankData;
      return await this.sellGS(augmont_id, body, bankData, userId);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region get bank details
  private async getBankDetails(augmont_id, userId) {
    try {
      const url = AUGMONT_USER_URL + augmont_id + AUGMONT_BANKS_URL;
      const result = await this.api.get(url, null, this.header);
      if (result?.statusCode === 200) {
        const data = result?.result;
        if (data.length > 0)
          for (let index = 0; index < data.length; index++) {
            const bank = data[index];
            if (bank?.status === 'active') return bank;
          }
        /// find in litt db
        const options = {
          where: {
            userId,
            accountNumber: { [Op.ne]: null },
            ifsCode: { [Op.ne]: '0' },
            salaryVerification: { [Op.or]: ['1', '3'] },
          },
        };
        const att = ['accountNumber', 'ifsCode', 'name'];
        const bankData = await this.bankRepo.getRowWhereData(att, options);
        if (!bankData || bankData === k500Error)
          return { route: kBankDetailsRoute };
        const accountNumber = (bankData?.accountNumber ?? '').toLowerCase();
        if (accountNumber.includes('x') || accountNumber.includes('*'))
          return { route: kBankDetailsRoute };
        // if find then add to augmont
        return await this.addBankdetails(
          augmont_id,
          accountNumber,
          bankData?.name,
          bankData?.ifsCode,
        );
      } else return kBadRequest;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region add bank details
  private async addBankdetails(augmont_id, number, name, ifsc): Promise<any> {
    try {
      const body = { accountNumber: number, accountName: name, ifscCode: ifsc };
      const url = AUGMONT_USER_URL + augmont_id + AUGMONT_BANKS_URL;
      const result = await this.api.post(url, body, null, null, {
        headers: this.header,
      });
      if (result?.statusCode === 200) return result?.result?.data;
      else return kBadRequest;
    } catch (error) {
      return kBadRequest;
    }
  }
  //#endregion

  //#region check and create bank
  async checkAndAddBank(userId, body) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error)
        return k422ErrorMessage(kUserNotExist);
      /// add
      const accountNumber = body?.accountNumber;
      const ifsc = body?.ifscCode;
      const name = augmontData?.userName;
      return await this.addBankdetails(augmont_id, accountNumber, name, ifsc);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region sell gold or silver
  private async sellGS(augmont_id, data, bankData, userId) {
    try {
      const rateRes = await this.getRate();
      const rate = rateRes?.rates;
      if (rate) {
        const metalType = data?.type;
        const merchantTransactionId = new Date().getTime().toString();
        const checkLimit: any = await this.checkSellLimit(rate, data);
        if (checkLimit?.message) return checkLimit;
        /// create
        const createData: any = {
          userId,
          type: metalType,
          merchantTransactionId,
          mode: AUGMONT_SELL,
          charges: {
            gst: AUGMONT_GST,
            processingFees: AUGMONT_PROCESSING_FEES,
          },
        };
        if (data?.quantity) createData.quantity = data?.quantity;
        else if (data?.amount) createData.amount = data?.amount;
        const create = await this.repository.create(createData);
        if (!create || create === k500Error) return k500Error;
        /// api call
        const body = new FormData();
        body.append('metalType', metalType);
        body.append('uniqueId', augmont_id);
        if (data?.quantity) body.append('quantity', data?.quantity);
        else if (data?.amount) body.append('amount', data?.amount);
        body.append('merchantTransactionId', merchantTransactionId);
        body.append('blockId', rateRes?.blockId);
        if (metalType === 'gold') body.append('lockPrice', rate?.gSell);
        else body.append('lockPrice', rate?.sSell);
        body.append('userBank[userBankId]', bankData?.userBankId);
        const url = AUGMONT_MERCHANT_URL + AUGMONT_SELL;
        const result = await this.api.post(
          url,
          body,
          null,
          null,
          {
            headers: { ...this.header, ...body.getHeaders() },
          },
          true,
        );
        return await this.updateTransaction(result, create.id);
      } else return kBadRequest;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //check max limit for buy
  async checkSellLimit(rate, data) {
    try {
      const userId = data?.userId;
      const metalType = data?.type;
      const quantity = data?.quantity;
      const amount = data?.amount;
      const newRate = metalType == 'silver' ? +rate?.sBuy : +rate?.gBuy;

      let tAmt = 0;
      if (quantity) tAmt = quantity * newRate;
      else if (amount) tAmt += amount;
      const status = ['INITIALIZED', 'COMPLETED'];
      const option: any = { where: { userId, status, type: metalType } };
      const att: any = [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
      ];
      // buy transaction of 48 ago
      const bDate = new Date();
      bDate.setHours(bDate.getHours() - 48);
      const buyDate = this.typeService.getUTCDate(bDate.toString());
      option.where.mode = AUGMONT_BUY;
      option.where.updatedAt = { [Op.lte]: buyDate };
      const oldBuyTra = await this.repository.getRoweData(att, option);
      if (oldBuyTra === k500Error) return kInternalError;
      // all sell transaction
      option.where.mode = AUGMONT_SELL;
      delete option.where.updatedAt;
      const sellTra = await this.repository.getRoweData(att, option);
      if (sellTra === k500Error) return kInternalError;
      const buyAmt = +oldBuyTra?.totalAmount ?? 0;
      const sellAmt = +sellTra?.totalAmount ?? 0;
      const sellLimit = buyAmt - sellAmt;
      if (sellLimit < tAmt) return k422ErrorMessage('Exceed daily limit.');
      return true;
    } catch (error) {
      return kInternalError;
    }
  }
  //#endregion

  //#region transfer Gold Or Silver
  async transferGoldOrSilver(userId, body) {
    try {
      const augmont_id = await this.getAugmontId(userId);
      if (!augmont_id || augmont_id === k500Error) return kNoDataFound;
      const augmontData = await this.checkUserInAugmont(augmont_id);
      if (!augmontData || augmontData === k500Error)
        return k422ErrorMessage(kUserNotExist);
      const receiver_id = body?.receiver_id;
      const receiverData = await this.checkUserInAugmont(receiver_id);
      if (!receiverData || receiverData === k500Error)
        return { route: kShareAppRoute };
      return await this.transferGS(userId, augmont_id, body);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region transfer
  private async transferGS(userId, augmont_id, data) {
    try {
      const receiver_id = data.receiver_id;
      const type = data?.type;
      const quantity = data?.quantity;
      const merchantTransactionId = new Date().getTime().toString();

      /// create
      const create = await this.repository.create({
        userId,
        receiver_id,
        type,
        quantity,
        merchantTransactionId,
        mode: AUGMONT_TRANSFER,
      });
      if (!create || create === k500Error) return k500Error;

      const body = new FormData();
      body.append('sender[uniqueId]', augmont_id);
      body.append('receiver[uniqueId]', receiver_id);
      body.append('metalType', type);
      body.append('quantity', quantity);
      body.append('merchantTransactionId', merchantTransactionId);
      const url = AUGMONT_MERCHANT_URL + AUGMONT_TRANSFER;
      const result = await this.api.post(
        url,
        body,
        null,
        null,
        {
          headers: { ...this.header, ...body.getHeaders() },
        },
        true,
      );
      return await this.updateTransaction(result, create.id);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region update transaction
  private async updateTransaction(result, id, invoice?) {
    try {
      const response = JSON.stringify(result);
      if (result?.statusCode === 200) {
        const data = result?.result?.data;
        const transactionId = data?.transactionId;
        const createdAt = data?.createdAt;
        if (transactionId) {
          const completionDate = createdAt
            ? this.typeService.getGlobalDate(new Date(createdAt)).toJSON()
            : this.typeService.getGlobalDate(new Date()).toJSON();
          const update: any = {
            transactionId,
            completionDate,
            status: 'COMPLETED',
            response,
          };
          if (data?.quantity) update.quantity = +(data?.quantity ?? '0');
          if (data?.totalAmount) update.amount = +(data?.totalAmount ?? '0');
          if (invoice) update.invoice = invoice;
          await this.repository.updateRowData(update, id);
          const successResult: any = kSuccessMessage(result?.message);
          if (invoice) successResult.data.invoice = invoice;
          return successResult;
        } else return k422ErrorMessage(result?.message ?? kSomthinfWentWrong);
      } else if (result?.statusCode === 422) {
        const rData = result?.data;
        const error = Object.values(rData?.errors)[0][0]?.message;
        const update = { status: 'FAILED', response };
        await this.repository.updateWhere(update, id, {
          status: 'INITIALIZED',
        });
        return k422ErrorMessage(error);
      } else return k422ErrorMessage(result?.message ?? kSomthinfWentWrong);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion
}
