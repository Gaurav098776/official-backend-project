// Imports
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import { JwtService } from '@nestjs/jwt';
import { TypeService } from './type.service';
import { k500Error } from 'src/constants/misc';
import { numberCodes } from 'src/constants/objects';
import { EnvConfig } from 'src/configs/env.config';
import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { kInvalidParamValue, kParamMissing } from 'src/constants/responses';
import { CRYPT_PATH } from 'src/constants/paths';
import { SlackService } from 'src/thirdParty/slack/slack.service';

@Injectable()
export class CryptService implements OnModuleInit {
  private authPrivateKey: string;

  constructor(
    @Inject(forwardRef(() => JwtService))
    private readonly jwtService: JwtService,
    private readonly typeService: TypeService,
    // Third party
    private readonly slack: SlackService,
  ) {}

  async onModuleInit() {
    // Loading the private key from a file
    if (!this.authPrivateKey) {
      this.authPrivateKey = await fs.readFileSync(
        CRYPT_PATH.authPrivateKey,
        'utf-8',
      );
    }
  }

  async encryptText(text: string) {
    try {
      const encryptedText = await CryptoJS.AES.encrypt(
        text,
        process.env.SECRET_ED_KEY,
      ).toString();
      return encryptedText;
    } catch (error) {}
  }

  getDynamicKey() {
    const globalDate = this.typeService.getGlobalDate(new Date());
    return globalDate.getTime().toString() + '==';
  }

  encryptResponse(text: string) {
    try {
      const encryptedText = CryptoJS.AES.encrypt(
        text,
        process.env.SECRET_ED_KEY,
      ).toString();
      return encryptedText;
    } catch (error) {}
  }

  decryptRequest(text: string, decKey = undefined) {
    const globalDate = this.typeService.getGlobalDate(new Date());
    const dynamicKey = globalDate.getTime().toString() + '==';
    const bytes = CryptoJS.AES.decrypt(text, decKey ?? dynamicKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedText);
  }

  decryptRequestId(text: string) {
    const globalDate = this.typeService.getGlobalDate(new Date());
    const dynamicKey = globalDate.getTime().toString() + '==';
    const bytes = CryptoJS.AES.decrypt(text, dynamicKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedText;
  }

  async decryptText(text: string) {
    try {
      const bytes = CryptoJS.AES.decrypt(text, process.env.SECRET_ED_KEY);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedText;
    } catch (error) {}
  }

  decryptSyncText(text: string) {
    try {
      const bytes = CryptoJS.AES.decrypt(text, process.env.SECRET_ED_KEY);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedText;
    } catch (error) {
      try {
        // Alert
        const threads = [`Raw text -> ${text}`];
        threads.push(`Error stack\n` + (error?.stack ?? `${error}`));
        this.slack.sendMsg({ text: `Decryption error`, threads });
      } catch (err) {}
    }
  }

  getHash(secretKey) {
    try {
      return CryptoJS.SHA256(secretKey).toString(CryptoJS.enc.Hex);
    } catch (error) {
      return k500Error;
    }
  }

  getMD5Hash(value) {
    try {
      return CryptoJS.MD5(value).toString();
    } catch (error) {}
  }

  //#region encrypt Phone fun
  encryptPhone(phone: number | string) {
    try {
      if (!phone) return k500Error;
      const cleanPhone = this.sanitizePhone(phone);

      if (cleanPhone === k500Error) return k500Error;
      let encryptedStr = '';
      let lastStr = '';
      for (let i = 0; i < cleanPhone.length; i++) {
        const element = cleanPhone[i];

        const array = numberCodes[element];
        if (array) {
          const randomIndex = this.randomNumWRange(0, 9);
          encryptedStr += array[randomIndex];
          lastStr += array[0];
        } else return k500Error;
      }

      return encryptedStr + '===' + lastStr;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region  decrypt Phone fun
  decryptPhone(encPhone: string) {
    try {
      if (!encPhone) return k500Error;
      if (typeof encPhone !== 'string') return k500Error;
      let decryptStr = '';
      const finalStr = encPhone.split('===')[0];
      const splitArr = finalStr.match(/.{3}/g);
      for (let i = 0; i < splitArr.length; i++) {
        const element = splitArr[i];
        Object.keys(numberCodes).map(function (key) {
          try {
            if (numberCodes[key].includes(element)) decryptStr += key;
          } catch (error) {}
        });
      }
      return finalStr.length % decryptStr.length === 0 ? decryptStr : k500Error;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  private sanitizePhone(phone: number | string) {
    try {
      let phoneStr = phone.toString();
      // if (phoneStr.length < 7) return k500Error;
      phoneStr = phoneStr.replace(/\D/g, '');
      return phoneStr;
    } catch (error) {
      return k500Error;
    }
  }

  private randomNumWRange(min = 0, max = 1) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  //#region get phone number key
  async getSysKey() {
    try {
      const generatedNumCode = this.generateNumberCodeArr();
      const codeStr = JSON.stringify(generatedNumCode);
      return await this.encryptText(codeStr);
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region generate Number Code
  private generateNumberCodeArr() {
    const numberCodes = {};
    const commonCodes = [];
    for (let i = 0; i < 10; i++) {
      const codeArr = [];
      while (codeArr.length < 10) {
        const randomKey = this.makeid(3);
        if (!commonCodes.includes(randomKey)) {
          codeArr.push(randomKey);
          commonCodes.push(randomKey);
        }
      }
      numberCodes[i.toString()] = codeArr;
    }
    return numberCodes;
  }
  //#endregion

  //#region get rendom code
  private makeid(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++)
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
  }
  //#endregion

  //#region  encrypt or decrypt by Phone numbers
  async encryptAndDecryptPhone(list: []) {
    try {
      const tempList = [];
      for (let index = 0; index < list.length; index++) {
        try {
          const value: any = list[index];
          const isKey = value.includes('===');
          if (isKey) {
            const phone = this.decryptPhone(value);
            if (phone === k500Error) return k500Error;
            tempList.push({ phone, key: value });
          } else {
            const key = this.encryptPhone(value);
            if (key === k500Error) return k500Error;
            tempList.push({ phone: value, key });
          }
        } catch (error) {}
      }
      return tempList;
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  //#region decrypt multipule userdata phone numbers
  async decryptUseresData(usersData) {
    try {
      if (!usersData && usersData.length < 0) return usersData;
      for (let index = 0; index < usersData.length; index++) {
        try {
          const singleUser = usersData[index];
          if (!singleUser.phone) continue;
          const decryptedPhone = await this.decryptPhone(singleUser.phone);
          usersData[index].phone = decryptedPhone;
        } catch (error) {}
      }
      return usersData;
    } catch (error) {
      return usersData;
    }
  }

  cryptData(reqData) {
    let content: string = reqData.content;
    if (!content) return kParamMissing('content');
    if (typeof content != 'string') kInvalidParamValue('content');
    const mode: 'encrypt' | 'decrypt' = reqData.mode;
    if (!mode) return kParamMissing('mode');

    if (mode == 'decrypt') {
      content = content.replace(/ /g, '+');
      const decryptedText = this.decryptSyncText(content);
      if (decryptedText.includes('{')) return JSON.parse(decryptedText);
      return this.decryptSyncText(content);
    }
  }

  //#region generate JWT token
  async generateJWT(data, expire_time: string = null) {
    const secret = EnvConfig.secrets.jwtKey;
    let singInOptions: any = { secret };
    //this should not use for mobile app side token
    if (expire_time) singInOptions.expiresIn = expire_time; //formate should be 1s,1m,1h
    return await this.jwtService.signAsync(data, { ...singInOptions });
  }
  //#endregion

  //#region verify JWT token
  async verifyJWT(token) {
    const secret = EnvConfig.secrets.jwtKey;
    const payload = await this.jwtService.verifyAsync(token, { secret });
    if (payload?.expiry_date)
      if (new Date().getTime() > payload?.expiry_date) return false;
    return payload;
  }
  //#endregion

  decryptPayloadChunk(encString: string): string {
    const decryptedData = crypto.privateDecrypt(
      {
        key: this.authPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encString, 'base64'),
    );

    return decryptedData.toString('utf-8'); // Use appropriate encoding
  }

  decryptLspRequest(encString) {
    try {
      // Chunk wise decryption
      if (encString.includes('FeksbbskeF==')) {
        const encSpans = encString.split('FeksbbskeF==');
        let decryptedStr = '';
        encSpans.forEach((el) => {
          if (el.length > 0) {
            const decStr = this.decryptPayloadChunk(el);
            decryptedStr += decStr;
          }
        });

        return { decrypted: true, data: JSON.parse(decryptedStr) };
      }

      const decryptedData = crypto.privateDecrypt(
        {
          key: this.authPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(encString, 'base64'),
      );

      return { decrypted: true, data: JSON.parse(decryptedData.toString()) };
    } catch (error) {
      return { decrypted: false, error: error.toString() };
    }
  }

  encryptLspResponse(encString) {
    const decryptedData = crypto.privateDecrypt(
      {
        key: this.authPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encString, 'base64'),
    );

    return JSON.parse(decryptedData.toString());
  }
}
