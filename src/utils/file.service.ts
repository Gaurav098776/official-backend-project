// Imports
import axios from 'axios';
import * as excel from 'excel4node';
import * as fs from 'fs';
import * as env from 'dotenv';
import * as handlebars from 'handlebars';
import base64topdf = require('base64topdf');
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { Storage } from '@google-cloud/storage';
import { kCompress, kMediaImages } from 'src/constants/directories';
import { APIService } from './api.service';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { AuthAiService } from 'src/thirdParty/authAi/authAi.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
import vision from '@google-cloud/vision';
import { gIsPROD, puppeteerConfig } from 'src/constants/globals';
import { TypeService } from './type.service';
import sharp = require('sharp');
import { kBigFonts, kSmallFonts } from 'src/constants/objects';
import { getOrientation } from 'get-orientation';
import { DateService } from './date.service';
import puppeteer from 'puppeteer';
import { BrowserData } from 'src/main';
import { kRuppe } from 'src/constants/strings';
import { EnvConfig } from 'src/configs/env.config';
import path = require('path');

env.config();

@Injectable()
export class FileService {
  googleStorage;
  constructor(
    private readonly api: APIService,
    private readonly authAi: AuthAiService,
    private readonly typeService: TypeService,
    private readonly dateService: DateService,
  ) {
    this.googleStorage = new Storage({
      keyFilename: EnvConfig.gCloudCred.appCredentials,
    });
  }
  async uploadFile(
    filePath: string,
    folderName?: string,
    extension?: string,
    fileName?: string,
  ): Promise<any> {
    try {
      const bufferData = await this.getBuffer(filePath);
      const url = await new Promise(async (resolve) => {
        const bucket = await this.googleStorage.bucket(
          EnvConfig.gCloudCred.bucketName,
        );
        let nameData: string = Date.now().toString();
        nameData = nameData.concat('.');
        nameData = nameData.concat(extension ?? 'pdf');

        let file = bucket.file(
          (folderName ?? kMediaImages) + '/' + (fileName ?? nameData),
        );

        if (fileName) {
          fileName = fileName.concat(Date.now().toString());
          fileName = fileName.concat('.' + extension);
          file = bucket.file(fileName ?? nameData);
        }
        file.save(bufferData, { validation: 'md5' }, function (error) {
          if (error) resolve({});
          else resolve({ url: file.publicUrl() });
        });
      });
      await this.removeFile(filePath);
      if (!url) return k500Error;
      return url['url'];
    } catch (error) {
      await this.removeFile(filePath);
      console.log({ error });
      return k500Error;
    }
  }

  async deleteGoogleCloudeFile(fileName?: string): Promise<any> {
    try {
      if (!gIsPROD) return 204;
      const storage = new Storage({
        projectId: EnvConfig.gCloudCred.projectName,
      });
      const bucket = await storage.bucket(EnvConfig.gCloudCred.bucketName);
      const filePath = fileName
        .split(EnvConfig.gCloudCred.bucketName)[1]
        .substring(1);

      let formattedPath = decodeURIComponent(filePath);
      let data = await bucket.file(formattedPath).delete();
      if (data[0]?.statusCode != 204) {
      }
      return data[0].statusCode;
    } catch (error) {
      return k500Error;
    }
  }

  async uploadBuffer(
    bufferData: Buffer,
    extension?: string,
    folderName?: string,
    fileName?: string,
  ): Promise<any> {
    try {
      const url = await new Promise(async (resolve) => {
        const storage = new Storage({
          projectId: EnvConfig.gCloudCred.projectName,
        });
        const bucket = await storage.bucket(EnvConfig.gCloudCred.bucketName);
        let nameData: string = Date.now().toString();
        nameData = nameData.concat('.');
        nameData = nameData.concat(extension ?? 'pdf');
        const file = bucket.file(
          (folderName ?? kMediaImages) + '/' + (fileName ?? nameData),
        );
        file.save(
          bufferData,
          { public: true, validation: 'md5' },
          function (error) {
            if (error) resolve({});
            else resolve({ url: file.publicUrl() });
          },
        );
      });
      if (!url) return k500Error;
      return url['url'];
    } catch (error) {
      return k500Error;
    }
  }

  async uploadFiles(fileUpload: any, name: string, fileFlag: number) {
    return new Promise(async (resolve) => {
      const storage = new Storage({
        projectId: EnvConfig.gCloudCred.projectName,
      });
      const bucket = await storage.bucket(EnvConfig.gCloudCred.bucketName);
      if (fileFlag == 1) {
        const typedata: string = fileUpload[0]['mimetype'];
        const type = typedata.split('/')[1];
        const date = Date.now();
        let nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('aadhaarImagesfront/' + nameData);
      } else if (fileFlag == 2) {
        const typedata: string = fileUpload[0]['mimetype'];
        const type = typedata.split('/')[1];
        const date = Date.now();
        let nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('aadhaarImagesback/' + nameData);
      } else if (fileFlag == 3) {
        const typedata: string = fileUpload['mimetype'];
        const type = typedata.split('/')[1];
        const date = Date.now();
        let nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('panImages/' + nameData);
      } else if (fileFlag == 4) {
        let nameData: string;
        nameData = name.concat('.');
        nameData = nameData.concat('octet-stream');
        const file = bucket.file('selfieImages/' + nameData);
      } else if (fileFlag == 5) {
        const typedata: string = fileUpload['mimetype'];
        let type = typedata.split('/')[1];
        try {
          if (fileUpload['originalname'].toLowerCase().endsWith('.pdf'))
            type = '.pdf';
        } catch (error) {}

        let nameData: string;
        nameData = name.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('residenceProof/' + nameData);
      } else if (fileFlag == 6) {
        const typedata: string = fileUpload[0]['mimetype'];
        var type = typedata.split('/')[1];
        var date = Date.now();
        var nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        var file = bucket.file('otherDocumentImagesfront/' + nameData);
      } else if (fileFlag == 7) {
        const typedata: string = fileUpload[0]['mimetype'];
        var type = typedata.split('/')[1];
        var date = Date.now();
        var nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('otherDocumentImagesback/' + nameData);
      } else if (fileFlag == 8) {
        const typedata: string = fileUpload['mimetype'];
        const type = typedata.split('/')[1];
        const date = Date.now();
        let nameData: string = name.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file('stamp/' + nameData);
      } else if (fileFlag == 9) {
        let nameData: string;
        nameData = name.concat('.');
        nameData = nameData.concat('jpg');
        const file = bucket.file('tempSelfie/' + nameData);
      }

      if (fileFlag == 1 || fileFlag == 2) {
        file.save(
          fileUpload[0]['buffer'],
          {
            public: true,
            validation: 'md5',
          },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      } else if (fileFlag == 3) {
        file.save(
          fileUpload['buffer'],
          {
            public: true,
            validation: 'md5',
          },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      } else if (fileFlag == 5 || fileFlag == 8) {
        file.save(
          fileUpload['buffer'],
          { public: true, validation: 'md5' },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      } else if (fileFlag == 6 || fileFlag == 7) {
        file.save(
          fileUpload[0]['buffer'],
          {
            public: true,
            validation: 'md5',
          },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      } else if (fileFlag == 9 || fileFlag == 4) {
        file.save(
          fileUpload,
          { public: true, validation: 'md5' },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      }
    });
  }

  async uploadManualFiles(fileUpload, fileName, path, fileFlag) {
    try {
      const url: any = await new Promise(async (resolve) => {
        const storage = new Storage({
          projectId: EnvConfig.gCloudCred.projectName,
        });
        const bucket = await storage.bucket(EnvConfig.gCloudCred.bucketName);
        if (fileFlag == 1) {
        }
        const typedata: string = fileUpload['mimetype'];
        const type = typedata.split('/')[1];
        const date = Date.now();
        let nameData: string = fileName.concat(date.toString());
        nameData = nameData.concat('.');
        nameData = nameData.concat(type);
        const file = bucket.file(path + '/' + nameData);

        file.save(
          fileUpload['buffer'],
          { public: true, validation: 'md5' },
          function (error) {
            if (error) {
              resolve({ status: false, message: error });
            } else {
              resolve({ status: true, data: file.publicUrl() });
            }
          },
        );
      });
      if (!url || !url.status) return k500Error;
      return url;
    } catch (error) {
      return k500Error;
    }
  }

  async compressIfNeed(targetPath: string, minKb: number) {
    try {
      const actualKb = (await fs.promises.stat(targetPath)).size / 1000;
      if (actualKb <= minKb) return targetPath;
      const instance = new ILovePDFApi(
        'project_public_4b04b0aedc9179491827125b6d52aac0_aeq34f6c25856b7a293d198644e57d06dfd3c',
        'secret_key_0701cd4578774b49624bd352f1ba2305_5Iazpaca5313f75f2a53e410ebe2b830badeb',
      );

      const task = instance.newTask('compress');
      const fileURL = await this.uploadFile(targetPath);
      const bufferData = await task
        .start()
        .then(() => {
          return task.addFile(fileURL);
        })
        .then(() => {
          return task.process();
        })
        .then(() => {
          return task.download();
        });

      const filePath = './' + new Date().getTime().toString() + '.pdf';
      await fs.writeFileSync(filePath, bufferData);
      await this.removeFile(targetPath);
      return filePath;
    } catch (error) {
      return kInternalError;
    }
  }

  async urlToBuffer(url: string, isNeedPath = false, extension = null) {
    try {
      const options = { responseType: 'arraybuffer' };
      const data = await this.api.get(url, {}, {}, { ...options });
      if (!data || data == k500Error) return data;
      let ext = 'jpg';
      if (extension) ext = extension;
      const filePath = './upload/' + new Date().getTime() + '.' + ext;
      const bufferData = Buffer.from(data, 'binary');
      await fs.writeFileSync(filePath, bufferData, 'base64');
      const base64Data = fs.readFileSync(filePath, 'base64');
      if (isNeedPath) return filePath;
      else {
        await this.removeFile(filePath);
        return base64Data;
      }
    } catch (error) {
      return k500Error;
    }
  }

  async base64ToFile(base64Content, extension = 'pdf') {
    try {
      const filePath = './' + new Date().getTime().toString() + '.' + extension;
      await fs.writeFileSync(filePath, base64Content, 'base64');
      return filePath;
    } catch (error) {
      kInternalError;
    }
  }

  async base64ToURL(base64Content, extension = 'pdf') {
    try {
      const filePath = './' + new Date().getTime().toString() + '.' + extension;
      let folder = 'esign';
      if (extension == 'png' || extension == 'jpeg' || extension != 'pdf') {
        folder = '';
        fs.writeFileSync(filePath, base64Content, 'base64');
      } else await base64topdf.base64Decode(base64Content, filePath);
      const urlResponse = await this.uploadFile(filePath, folder, extension);
      if (!urlResponse || urlResponse == k500Error) return kInternalError;
      return urlResponse;
    } catch (error) {
      return kInternalError;
    }
  }

  async fileUrlToBase64(fileUrl: string): Promise<string> {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });
    const fileContent = response.data;
    const base64 = Buffer.from(fileContent).toString('base64');
    return base64;
  }

  async fileUrlToFile(fileUrl: string): Promise<string> {
    const base64 = await this.fileUrlToBase64(fileUrl);
    const splittedSpans = fileUrl.split('.');
    const extension = splittedSpans[splittedSpans.length - 1];
    return await this.base64ToFile(base64, extension);
  }

  async binaryToFileURL(
    binaryStr,
    extension = 'pdf',
    folderName = kMediaImages,
    originalname?,
  ) {
    let filePath = './' + new Date().getTime().toString() + '.' + extension;
    if (originalname) filePath = './' + originalname + '.' + extension;
    const binaryData = Buffer.from(binaryStr, 'binary');
    await fs.writeFileSync(filePath, binaryData);
    const urlResponse = await this.uploadFile(
      filePath,
      folderName,
      extension,
      originalname,
    );
    if (!urlResponse || urlResponse == k500Error) throw new Error();

    return urlResponse;
  }

  async base64ToFileURL(
    base64Content,
    extension = 'pdf',
    folderName = kMediaImages,
  ) {
    const filePath = './' + new Date().getTime().toString() + '.' + extension;
    if (extension == 'png' || extension == 'jpeg' || extension != 'pdf') {
      fs.writeFileSync(filePath, base64Content, 'base64');
    } else await base64topdf.base64Decode(base64Content, filePath);
    const urlResponse = await this.uploadFile(filePath, folderName, extension);
    if (!urlResponse || urlResponse == k500Error) return kInternalError;
    return urlResponse;
  }

  async streamToURL(response, password?: string, type?: string) {
    const path = new Date().getTime() + '.pdf';
    if (type != 'stream') await fs.writeFileSync(path, Buffer.from(response));
    else await this.createTheFile(response, path);

    if (!password) {
      const fileUrl = await this.uploadFile(path);
      await this.removeFile(path);
      return fileUrl;
    }
    return await this.authAi.removePassword(path, password);
  }

  async dataToPDF(content: any, otherParams = {}) {
    try {
      const activePages = ((await BrowserData.browserInstance.pages()) ?? [])
        .length;
      if (activePages == 0)
        BrowserData.browserInstance = await puppeteer.launch(puppeteerConfig);
      const filePath = './upload/' + new Date().getTime() + '.pdf';
      const page = await BrowserData.browserInstance.newPage();
      await page.setDefaultNavigationTimeout(0);
      await page.setContent(content);
      await page.pdf({
        format: 'A4',
        path: filePath,
        timeout: 0,
        printBackground: true,
        omitBackground: true,
        ...otherParams,
      });
      const totalPages = ((await BrowserData.browserInstance.pages()) ?? [])
        .length;
      if (totalPages >= 3) await page.close();
      return filePath;
      // return await new Promise((resolve, reject) => {
      //   pdf.create(content, options).toFile(filePath, function (error, data) {
      //     if (error) reject(k500Error);
      //     else if (data.filename) resolve(filePath);
      //     reject(k500Error);
      //   });
      // });
    } catch (error) {
      return k500Error;
    }
  }

  async mergeMultiplePDF(nextPages: string[], currentPage) {
    try {
      const cover = await PDFDocument.load(fs.readFileSync(currentPage));
      const doc = await PDFDocument.create();
      const coverPages = await doc.copyPages(cover, cover.getPageIndices());
      for (const page of coverPages) doc.addPage(page);
      for (let index = 0; index < nextPages.length; index++) {
        const imageURL = 'https://storage.googleapis.co';
        let targetPage = nextPages[index];

        if (index < nextPages.length - 1) {
          const nextPage = nextPages[index + 1];
          const nextPageHasImage = nextPage.startsWith(imageURL);
          if (nextPageHasImage) continue;
        }

        let isNetWorkImage = false;
        isNetWorkImage = targetPage.startsWith(imageURL);
        if (isNetWorkImage == true && index != 0)
          targetPage = nextPages[index - 1];
        let content = await PDFDocument.load(fs.readFileSync(targetPage));

        //Image insertion
        let imagePath;
        if (isNetWorkImage == true) {
          const bufferData = await this.urlToBuffer(nextPages[index]);

          const img = await content.embedJpg(bufferData);
          const imagePage = content.insertPage(1);
          imagePage.drawImage(img, {
            x: 0,
            y: 0,
            width: imagePage.getWidth(),
            height: imagePage.getHeight(),
          });
          imagePath = './upload/' + new Date().getTime() + '.pdf';
          await fs.writeFileSync(imagePath, await content.save());
          content = await PDFDocument.load(fs.readFileSync(imagePath));
        }
        //PDF merge
        const pageIndices = content.getPageIndices();
        const contentPages = await doc.copyPages(content, pageIndices);
        for (const page of contentPages) doc.addPage(page);

        if (imagePath) await this.removeFile(imagePath);
      }
      const pdfPath1 = './upload/' + Date.now() + '.pdf';
      fs.writeFileSync(pdfPath1, await doc.save());
      return pdfPath1;
    } catch (error) {
      console.log({ error });
      return k500Error;
    }
  }

  private async getBuffer(filePath: string) {
    try {
      if (filePath) return fs.readFileSync(filePath);
      return '500';
    } catch (error) {
      return '500';
    }
  }

  async removeFile(filePath: string) {
    try {
      if (filePath) await fs.unlinkSync(filePath);
    } catch (error) {
      return '500';
    }
  }

  async removeFiles(filePaths: string[]) {
    try {
      for (let index = 0; index < filePaths.length; index++) {
        try {
          const filePath = filePaths[index];
          if (filePath) await fs.unlinkSync(filePath);
        } catch (error) {}
      }
    } catch (error) {
      return k500Error;
    }
  }

  async getTextFromVision(filePath, removeFile = true) {
    try {
      const fileData = fs.readFileSync(filePath);
      return new Promise((resolve) => {
        const client = new vision.ImageAnnotatorClient({
          keyFilename: EnvConfig.gCloudCred.appCredentials,
        });
        const request = {
          image: { content: fileData },
          imageContext: { languageHints: ['en'] },
        };
        client
          .documentTextDetection(request)
          .then(async (results) => {
            if (removeFile) await this.removeFile(filePath);
            resolve((results ?? [{}])[0].fullTextAnnotation?.text ?? '');
          })
          .catch((_) => {
            resolve(kInternalError);
          });
      });
    } catch (error) {
      return kInternalError;
    }
  }

  private async createTheFile(response, path) {
    return await new Promise((resolve) => {
      response.pipe(fs.createWriteStream(path).on('finish', resolve));
    });
  }

  async imageToPDF(reqData, outputPath) {
    try {
      const content = await PDFDocument.create();
      const certNo = reqData.certNo;

      // Add core stamp in blank pdf
      const bufferData = fs.readFileSync('./upload/statics/core-stamp.jpg');
      const img = await content.embedJpg(bufferData);
      const imagePage = content.insertPage(0);
      imagePage.drawImage(img, {
        x: 0,
        y: 0,
        width: imagePage.getWidth(),
        height: imagePage.getHeight(),
      });

      const fontSize = 12;
      const { width, height } = imagePage.getSize();
      const timesRomanFont = await content.embedFont(
        StandardFonts.HelveticaBold,
      );
      imagePage.drawText(reqData.certNo, {
        x: width / 1.6,
        y: height / 1.073,
        size: 10,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: rgb(0.14, 0.09, 0.11),
      });
      imagePage.drawText(reqData.certNo, {
        x: width / 2.4,
        y: height / 1.349,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0.14, 0.09, 0.11),
      });
      imagePage.drawText(reqData.certIssueDate, {
        x: width / 2.4,
        y: height / 1.406,
        size: fontSize,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: rgb(0.14, 0.09, 0.11),
      });
      imagePage.drawText('IMPACC (CS)/ gj13237519/ GULBAI TEKRA/ GJ-AH', {
        x: width / 2.4,
        y: height / 1.47,
        size: 11,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: rgb(0.14, 0.09, 0.11),
      });
      imagePage.drawText(reqData.docReference, {
        x: width / 2.4,
        y: height / 1.54,
        size: 11,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: rgb(0.14, 0.09, 0.11),
      });

      const h3 = height / 8.55;
      const c3 = rgb(0.01, 0, 0);
      const opacity = 0.1;
      imagePage.drawText(certNo[0], {
        opacity,
        x: width / 3.4,
        y: h3,
        size: 9,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[1], {
        opacity,
        x: width / 3.33,
        y: h3,
        size: 9,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[2], {
        opacity,
        x: width / 3.19,
        y: h3,
        size: 9,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[3], {
        opacity,
        x: width / 3.13,
        y: h3,
        size: 9,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[4], {
        opacity,
        x: width / 3.0,
        y: h3,
        size: 9,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[5], {
        opacity,
        x: width / 2.9,
        y: h3,
        size: 10.25,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[6], {
        opacity,
        x: width / 2.8,
        y: h3,
        size: 10.25,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[7], {
        opacity,
        x: width / 2.71,
        y: h3,
        size: 10.25,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[8], {
        opacity,
        x: width / 2.63,
        y: h3,
        size: 10.25,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[9], {
        opacity,
        x: width / 2.55,
        y: h3,
        size: 10.35,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[10], {
        opacity,
        x: width / 2.47,
        y: h3,
        size: 10.35,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[11], {
        opacity,
        x: width / 2.4,
        y: h3,
        size: 10.35,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[12], {
        opacity,
        x: width / 2.33,
        y: h3,
        size: 10.35,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[13], {
        opacity,
        x: width / 2.27,
        y: h3,
        size: 10.45,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[14], {
        opacity,
        x: width / 2.21,
        y: h3,
        size: 10.45,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[15], {
        opacity,
        x: width / 2.15,
        y: h3,
        size: 10.45,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[16], {
        opacity,
        x: width / 2.1,
        y: h3,
        size: 10.48,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[17], {
        opacity,
        x: width / 2.05,
        y: h3,
        size: 10.49,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[18], {
        opacity,
        x: width / 2.0,
        y: h3,
        size: 10.5,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      imagePage.drawText(certNo[19], {
        opacity,
        x: width / 1.95,
        y: h3,
        size: 10.51,
        font: await content.embedFont(StandardFonts.Helvetica),
        color: c3,
      });

      // #01 Save pdf
      await fs.writeFileSync(outputPath, await content.save());
      // #02 Convert pdf into jpg
      await this.pdfToJpg(outputPath);
      // #03 Create barcode
      const barcodePath: any = await this.createBarcodeImage(certNo);
      if (barcodePath.message) return barcodePath;
      // #04 Add barcode in stamp
      await this.addBarcode(outputPath, barcodePath);

      return outputPath;
    } catch (error) {
      return kInternalError;
    }
  }

  async pdfToJpg(filePath) {
    try {
      const instance = new ILovePDFApi(
        'project_public_097bd3f1857e852111200fa3e87fa49c_KpnVXe9320fd1481441fe69a129bbaf4fe4b5',
        'secret_key_3b181dabc3d21c56b1abc07356f17a04_jrbnV7f5babe6d9a3728ac56b9f973fbe62a3',
      );

      const task = instance.newTask('pdfjpg');
      const fileURL = await this.uploadFile(filePath);
      await task
        .start()
        .then(() => {
          return task.addFile(fileURL);
        })
        .then(() => {
          return task.process();
        })
        .then(() => {
          return task.download();
        })
        .then(async (data) => {
          const outputPath = filePath.replace('.pdf', '') + '.jpg';
          filePath = outputPath;
          await fs.writeFileSync(outputPath, data);
          return outputPath;
        });
    } catch (error) {}
  }

  async createBarcodeImage(text: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bwipjs = require('bwip-js');
      const bufferData = await bwipjs.toBuffer({
        bcid: 'code128', // Barcode type
        text, // Text to encode
        scale: 2.5,
        height: 10, // Bar height, in millimeters
        includetext: false, // Show human-readable text
        textxalign: 'center', // Always good to set this
      });

      const filePath = new Date().getTime().toString() + '.png';
      await fs.writeFileSync(filePath, bufferData);
      return filePath;
    } catch (error) {
      return kInternalError;
    }
  }

  async addBarcode(filePath, barcodePath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Jimp = require('jimp');
      filePath = filePath.replace('pdf', '') + 'jpg';
      Jimp.read(filePath, (err, fir_img) => {
        if (err) return kInternalError;
        else {
          Jimp.read(barcodePath, async (err, sec_img) => {
            if (err) return kInternalError;
            else {
              const newPath =
                './upload/stamp/' + new Date().getTime().toString() + '.jpg';
              fir_img.blit(sec_img, 700, 42);
              fir_img.write(newPath);
              await this.removeFile(barcodePath);
              await this.removeFile(filePath);
            }
          });
        }
      });
    } catch (error) {
      return kInternalError;
    }
  }

  async hbsHandlebars(templateName, data, source = null) {
    try {
      if (!source) source = fs.readFileSync(templateName, 'utf8');
      handlebars.registerHelper(
        'numberWithComma',
        this.typeService.amountNumberWithCommas,
      );
      handlebars.registerHelper('cIf', this.cIfHalper);
      const template = handlebars.compile(source);
      const output = template(data);
      return output;
    } catch (error) {
      console.log({ error });
      return k500Error;
    }
  }

  // hbsHandlebars for If else
  cIfHalper(...cnd) {
    try {
      const option = cnd[cnd.length - 1];
      const operator = cnd[cnd.length - 2];
      const value = cnd[cnd.length - 3];
      let condition;
      if (operator === 'eq') {
        if (value === '-' || value === ' ') condition = value;
      } else {
        condition = eval(cnd.slice(0, cnd.length - 1).join(' '));
      }

      if (condition) return option.fn(this);
      else return option.inverse(this);
    } catch (error) {
      return k500Error;
    }
  }

  async sharpCompression(
    filePath,
    fileName = '',
    getType = '',
    isNeedLocal = false,
    options?,
  ) {
    try {
      if (!fileName) fileName = new Date().getTime().toString();
      if (!getType) getType = filePath.split('.').reverse()[0];
      if (filePath.includes('https')) {
        filePath = await this.urlToBuffer(filePath, true, getType);
        if (filePath == k500Error) return kInternalError;
      }
      const width = options?.width;
      const height = options?.height;
      const quality = options?.quality ?? 10;
      const newPath = './upload/' + fileName + '.' + getType;
      const url = await new Promise((resolve, reject) => {
        let compress = sharp(filePath, { failOnError: false }).resize(
          width,
          height,
        );
        if (getType == 'jpg') compress = compress.jpeg({ quality });
        else if (getType == 'png') compress = compress.png({ quality });
        compress.toFile(newPath, function (err) {
          if (err) reject(err);
          else resolve(newPath);
        });
      });
      this.removeFile(filePath);
      if (!isNeedLocal) {
        const networkURL = await this.uploadFile(newPath, kCompress, getType);
        if (networkURL == k500Error) return kInternalError;
        return networkURL;
      } else return newPath;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  // check orientation and get image rotate css
  async getOrientationCSS(image) {
    let style = '';
    try {
      let orientation = 1;
      try {
        const buffer: any = await this.getBase64FromImgUrl(image, true);
        if (!buffer?.message) orientation = await getOrientation(buffer);
      } catch (error) {}
      let deg = '0';
      if (orientation === 8) deg = '270';
      else if (orientation === 6) deg = '90';
      const orientDeg = [6, 8];
      style = orientDeg.includes(orientation)
        ? `-webkit-transform: rotate(${deg}deg);-moz-transform: rotate(${deg}deg);-o-transform: rotate(${deg}deg);-ms-transform: rotate(${deg}deg);transform: rotate(${deg}deg);`
        : '';
      return style;
    } catch (error) {
      return style;
    }
  }

  // image url to base64 Buffer
  async getBase64FromImgUrl(imgUrl: string, isNeed = false) {
    try {
      const successData = await this.api.get(imgUrl, undefined, undefined, {
        responseType: 'arraybuffer',
      });
      if (successData === k500Error) return kInternalError;
      if (isNeed) return Buffer.from(successData, 'binary');
      else return Buffer.from(successData, 'binary').toString('base64');
    } catch (error) {
      return kInternalError;
    }
  }

  async objectToExcel(rawData) {
    try {
      if (!rawData.sheets || !rawData.data)
        return kParamMissing('sheets or data');

      const workbook = new excel.Workbook();
      const bigFonts = workbook.createStyle(kBigFonts);
      const smallFonts = workbook.createStyle(kSmallFonts);

      // Check if rawData.sheets is an array (multiple sheets) or a string (single sheet)
      if (Array.isArray(rawData.sheets)) {
        // Handle multiple sheets
        for (
          let sheetIndex = 0;
          sheetIndex < rawData.sheets.length;
          sheetIndex++
        ) {
          const currentSheet = workbook.addWorksheet(
            rawData.sheets[sheetIndex],
          );
          const sheetDetails = rawData.data[sheetIndex];
          await this.writeSheetData(
            currentSheet,
            sheetDetails,
            bigFonts,
            smallFonts,
          );
        }
      } else if (typeof rawData.sheets === 'string') {
        // Handle single sheet
        const currentSheet = workbook.addWorksheet(rawData.sheets);
        const sheetDetails = rawData.data;
        await this.writeSheetData(
          currentSheet,
          sheetDetails,
          bigFonts,
          smallFonts,
        );
      } else return k422ErrorMessage('Invalid sheets data');
      const sheetName = rawData?.sheetName;
      const date = this.dateService.dateToReadableFormat(new Date());
      const dateTime = `${date.hours}-${date.minutes}`;
      const extension = !(sheetName && sheetName.includes('.xlsx'))
        ? '.xlsx'
        : '';
      const filePath = sheetName
        ? `upload/report/${date.readableStr}-${dateTime}-${sheetName}${extension}`
        : 'upload/file.xlsx';
      return await new Promise((resolve) => {
        workbook.write(filePath, (err) => {
          if (err) {
            resolve(kInternalError);
          } else {
            resolve({ filePath });
          }
        });
      });
    } catch (error) {
      return kInternalError;
    }
  }

  private async writeSheetData(sheet, sheetDetails, bigFonts, smallFonts) {
    const columnWidths = [];
    // Iterate through rows in sheetDetails to find maximum content length for each column
    for (let rowIndex = 0; rowIndex < sheetDetails.length; rowIndex++) {
      const rowDetails = sheetDetails[rowIndex];
      let columnIndex = 1;

      // Iterate through key-value pairs in each row
      for (const [key, value] of Object.entries(rowDetails)) {
        // Calculate cell content length
        const cellContentLength = (value ?? '-').toString().length;

        // Update column width if the current content length is greater than the stored width
        columnWidths[columnIndex - 1] = Math.max(
          columnWidths[columnIndex - 1] || 0,
          cellContentLength,
        );
        columnIndex++;
      }
    }
    // Set column widths based on the maximum content length in each column
    for (let i = 0; i < columnWidths.length; i++) {
      const width = Math.max(columnWidths[i] * 1.75, 10); // Minimum width of 10 for readability
      sheet.column(i + 1).setWidth(width);
    }

    // Write the data to the sheet with proper formatting
    for (let rowIndex = 0; rowIndex < sheetDetails.length; rowIndex++) {
      const rowDetails = sheetDetails[rowIndex];
      let columnIndex = 1;

      for (const [key, value] of Object.entries(rowDetails)) {
        // Write header row (first row) with big fonts style
        if (rowIndex === 0)
          sheet.cell(1, columnIndex).string(key).style(bigFonts);

        // Write cell values with small fonts style
        let cellValue: any = value ?? '-';
        if (cellValue == '') cellValue = '-';
        let tempVal = cellValue;
        if (typeof tempVal == 'string') {
          tempVal = tempVal.includes(kRuppe)
            ? tempVal.replace(/[₹,]/g, '')
            : tempVal.includes(',')
            ? tempVal.replace(/,/g, '')
            : cellValue;
          cellValue = !isNaN(tempVal) ? +tempVal : cellValue;
        }
        if (typeof cellValue == 'number')
          sheet
            .cell(rowIndex + 2, columnIndex)
            .number(cellValue)
            .style(smallFonts);
        else
          sheet
            .cell(rowIndex + 2, columnIndex)
            .string(cellValue.toString())
            .style(smallFonts);

        columnIndex++;
      }
    }
  }

  async objectToExcelURL(rawData: any) {
    try {
      const excelData: any = await this.objectToExcel(rawData);
      console.log({ excelData });
      if (excelData.message) return excelData;

      const filePath = excelData.filePath;
      if (!filePath) return kInternalError;
      let fileName: any;
      if (rawData.reportStore == true) {
        let startDate = this.typeService.getDateFormatted(
          rawData.startDate ?? new Date(),
        );
        let endDate = this.typeService.getDateFormatted(
          rawData.endDate ?? new Date(),
        );
        fileName = excelData.filePath.split('/')[2] ?? '';
        fileName = fileName.replace(/ /g, '_') ?? '';
        if (startDate && endDate) {
          fileName = fileName.split('.');
          fileName = `${fileName[0]}_${startDate}_to_${endDate}.${fileName[1]}`;
        }
      }
      const urlData = await this.uploadFile(
        filePath,
        'reports',
        'xlsx',
        fileName,
      );

      if (urlData == k500Error) return kInternalError;
      return urlData;
    } catch (error) {
      console.log({ error });
      return kInternalError;
    }
  }

  // xlsx, csv file to array, key:xlsx
  async excelToArray(
    filePath,
    customColumns = {},
    needColumnName = false,
    empty?,
  ) {
    try {
      if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.csv'))
        return k422ErrorMessage(
          'Invalid file type. Only XLSX and CSV files are supported',
        );
      const Excel = require('exceljs');
      const workbook = new Excel.Workbook();
      const readFileMethod = filePath.endsWith('.xlsx') ? 'xlsx' : 'csv';
      await workbook[readFileMethod].readFile(filePath);

      let worksheet = workbook.getWorksheet(1);
      if (!worksheet) worksheet = workbook.getWorksheet();
      const finalizedArray = [];
      const keyArr = [];
      const allColumnName = [];
      // Get column names
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        try {
          const columnName = cell.value;
          keyArr[colNumber] = customColumns[columnName]
            ? customColumns[columnName]
            : columnName;
          allColumnName.push(keyArr[colNumber]);
        } catch (error) {}
      });

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        try {
          row.eachCell((cell, colNumber) => {
            const columnName = keyArr[colNumber];
            rowData[columnName] = cell.value;
          });

          finalizedArray.push(rowData);
        } catch (error) {}
      }
      if (needColumnName)
        return { columnName: allColumnName, finalData: finalizedArray };
      return finalizedArray;
    } catch (error) {
      if (empty == true) {
        if (error.message.includes('End of data reached (data length = 0')) {
          return [];
        }
      }
      return kInternalError;
    }
  }

  async downloadAndReadExcel(url, localDirectory) {
    try {
      // Ensure the local directory exists
      if (!fs.existsSync(localDirectory)) {
        fs.mkdirSync(localDirectory, { recursive: true });
      }
      // Construct the local file path with a file name
      const fileName = path.basename(url);
      const localFilePath = path.join(localDirectory, fileName);

      // Download the file
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });
      // Create a writable stream
      const writer = fs.createWriteStream(localFilePath);

      // Pipe the response data to the file
      response.data.pipe(writer);
      // Wait for the file to be fully written
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return localFilePath;
    } catch (error) {
      console.error('Error:', error);
    }
  }
}
