// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { CryptService } from './crypt.service';
import { FileService } from './file.service';
import { ValidationService } from './validation.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';

@Controller('/util')
export class UtilController {
  constructor(
    private readonly cryptService: CryptService,
    private readonly fileService: FileService,
    private readonly validation: ValidationService,
  ) {}

  @Get('testEnc')
  async testEnc(@Query() query, @Res() res) {
    try {
      const num = query.num;
      const data = await this.cryptService.encryptPhone(num);
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('testDecrypt')
  async testDecrypt(@Query() query, @Res() res) {
    try {
      const encStr = query.encStr;
      const data = this.cryptService.decryptPhone(encStr);
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('genNumberCodeKey')
  async funGenSysKey(@Res() res) {
    try {
      const data = await this.cryptService.getSysKey();
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  //#region encrypt decrypt Phone number list
  @Post('encryptAndDecryptPhones')
  async encryptPhones(@Body() body, @Res() res) {
    try {
      const list = body.phoneNumbers;
      if (!list) return res.json(kParamsMissing);
      const data: any = await this.cryptService.encryptAndDecryptPhone(list);
      if (data === k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('compareNames')
  async funCompareNames(@Body() body, @Res() res) {
    try {
      const nameA = body.nameA;
      const nameB = body.nameB;
      const data = this.validation.getTextProbability(nameA, nameB, [
        'cross',
        'road',
        'india',
        'opp',
        'opposite',
        'near',
        'nr.',
        'nr',
        'bh',
        'bh.',
        'b/h',
      ]);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('base64ToURL')
  async funBase64ToURL(@Body() body, @Res() res) {
    try {
      const data = await this.fileService.base64ToURL(body.data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('excelToArray')
  @UseInterceptors(FileInterceptor('xlsx', kUploadFileObj()))
  async uploadStamp(@UploadedFile() file, @Res() res) {
    try {
      if (!file) return res.json(kParamsMissing);
      const path = file.filename;
      const result: any = await this.fileService.excelToArray(path);
      await this.fileService.removeFile(path);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('cryptData')
  async funCryptData(@Query() query, @Res() res) {
    try {
      const data: any = await this.cryptService.cryptData(query);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('testLoad')
  async funTestLoad(@Res() res) {
    try {
      const path01 = './upload/agreement/KFS_01.hbs';
      const page01 = await this.fileService.hbsHandlebars(path01, {});
      const data = await this.fileService.dataToPDF(page01);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
