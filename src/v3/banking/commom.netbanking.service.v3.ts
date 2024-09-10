import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import {
  nGoogleSearch,
  nRazorpayIFSC,
  puppeteerConfig,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { nInsertLog } from 'src/constants/network';
import { BrowserData } from 'src/main';
import { APIService } from 'src/utils/api.service';
const cheerio = require('cheerio');

@Injectable()
export class commonNetBankingService {
  constructor(private readonly api: APIService) {}
  htmlToJSON(html: string): any {
    const $ = cheerio.load(html);

    function parseElement(element): any {
      const result: any = {};

      // Parse element attributes
      const attributes: any = {};
      try {
        for (const attr of element.attribs) {
          attributes[attr] = element.attribs[attr];
        }
        result.attributes = attributes;
      } catch (error) {}

      // Parse element content
      result.content = [];

      element.children.forEach((child) => {
        if (child.type === 'tag') {
          result.content.push({
            tag: child.name,
            ...parseElement(child),
          });
        } else if (child.type === 'text') {
          result.content.push({
            text: child.data,
          });
        }
      });

      return result.content;
    }

    // Start parsing from the root element (usually 'body' in HTML)
    const rootElement = $('body').get(0);
    return parseElement(rootElement);
  }

  // Get IFSC details from google and razorpay
  async fetchIFSCFromBranchName(branchName: string, bankName) {
    try {
      const activePages = ((await BrowserData.browserInstance.pages()) ?? [])
        .length;
      if (activePages == 0)
        BrowserData.browserInstance = await puppeteer.launch(puppeteerConfig);
      const url = `https://www.google.com/search?q=${bankName} branch CODE FOR ${branchName} RAZORPAY`;
      const page = await BrowserData.browserInstance.newPage();
      await page.goto(url);
      var html = await page.content();
      if (!html.includes('Page Expired')) {
        const response = html;
        if (response != k500Error) {
          const rawHTML: string = response.toString();
          const pattern = /[A-Z]{4}0[A-Z0-9]{6}/g;
          const matches = rawHTML.match(pattern);
          if (matches?.length > 0) {
            const ifscData = await this.api.get(nRazorpayIFSC + matches[0]);
            if (ifscData != k500Error && ifscData.BANK) {
              return ifscData.IFSC;
            }
          }
        }
      }
      await page.close();
    } catch (error) {
      console.log('error : ', error);
    }
  }
  periodicFetchConsoleData(reqData) {
    return {
      combinations: ['PERIODIC_HTML_FETCH ->'],
      apiTriggers: [
        {
          url: nInsertLog,
          method: 'POST',
          needWebResponse: false,
          body: {
            loanId: reqData.loanId,
            userId: reqData.userId,
            type: 1,
            subType: 1,
            status: 2,
            values: {
              bankCode: reqData.bankCode,
              periodicFetch: true,
              step: 1,
            },
          },
        },
      ],
    };
  }

  JS_TRIGGERS = {
    PERIODIC_HTML_FETCH: `setInterval(()=> {
      try {
        const dateStr = new Date().toJSON();
        console.log(dateStr + "PERIODIC_HTML_FETCH ->" +  document.documentElement.innerHTML);
      } catch (error) {} }, 1000);`,
  };
}
