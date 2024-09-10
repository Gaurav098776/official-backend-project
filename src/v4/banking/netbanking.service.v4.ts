//#region Imports
import * as FormData from 'form-data';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import {
  HOST_URL,
  Latest_Version,
  nGoogleSearch,
  nRazorpayIFSC,
} from 'src/constants/globals';
import {
  PRIMARY_BANKINGPRO_URL,
  nConvertBase64ToPdf,
  nExtractData,
  nInsertLog,
  nNetbankingTriggers,
  nPrepareWebViewData,
  nPrepareWebviewData,
  nSyncTransactions,
} from 'src/constants/network';
import { kBankingProHeaders, kKeyTypes } from 'src/constants/objects';
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { DateService } from 'src/utils/date.service';
const cheerio = require('cheerio');
const bankCodes = {
  FEDERAL: 'FEDERAL',
  HDFC: 'HDFC',
  ICICI: 'ICICI',
  IDFC: 'IDFC',
  SBI: 'SBI',
};
import { TransactionJSON } from './transaction.interface.v4';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';
import { HDFCBankingServiceV4 } from 'src/v4/banking/hdfc.service.v4';
import { commonNetBankingServiceV4 } from './common.netbanking.service.v4';
import { FileService } from 'src/utils/file.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { employmentDetails } from 'src/entities/employment.entity';
//#endregion Imports
@Injectable()
export class NetbankingServiceV4 {
  constructor(
    // Utils
    private readonly api: APIService,
    private readonly dateService: DateService,
    private readonly typeService: TypeService,
    private readonly hdfcService: HDFCBankingServiceV4,
    private readonly commonNetbankingService: commonNetBankingServiceV4,
    private readonly fileService: FileService,
    private readonly repoManager: RepositoryManager,
  ) {}

  getNetbankingJsonData(reqData) {
    switch (reqData.bankCode) {
      case bankCodes.FEDERAL:
        return this.getFederalNetbankingData(reqData);

      case bankCodes.HDFC:
        return this.hdfcService.getHDFCNetbankingData(reqData);

      case bankCodes.ICICI:
        return this.getICICINetbankingData(reqData);

      case 'IDFC':
        return this.getIDFCNetbankingData(reqData);

      case 'KOTAK':
        return this.getKotakNetbankingData(reqData);

      case 'RBL':
        return this.getRBLNetbankingData(reqData);

      case 'SBI':
        return this.getSBINetbankingData(reqData);

      default:
        return {};
    }
  }

  //#region ICICI
  // ICICI
  private getICICINetbankingData(reqData) {
    const totalSteps = this.getRelevantLoaderSteps(6);
    return {
      title: 'Verify your bank',
      initialURL:
        'https://infinity.icicibank.com/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&__START_TRAN_FLAG__=Y&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=ICI&ITM=nli_personalb_personal_login_btn&_gl=1*30xkeg*_ga*MTgzMDcxOTY5Ni4xNjIwMDM5NDU0*_ga_SKB78GHTFV*MTYyODIzNDM4NC43Ny4xLjE2MjgyMzQ1MDQuMjc.&_ga=2.92094746.1084279428.1697432242-1973315115.1690798212&_gac=1.213008672.1697523963.EAIaIQobChMI-7jpvrn8gQMVt6lmAh1nywMHEAAYASAAEgKBxfD_BwE?ITM=nli_personalb_personal_login_btn',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://infinity.icicibank.com/corp/AuthenticationController': {
          allowContains: true,
          allowAnyConsole: true,
          consoles: [
            {
              combinations: ['stopProcessing'],
              state: { isProcessing: false },
            },
            {
              combinations: ['startProcessing'],
              state: { isProcessing: true },
            },
            {
              // Metrics #01
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
                    values: { bankCode: 'ICICI', step: 1 },
                  },
                },
              ],
              // Loader #2
              combinations: ['LOADER-> #01'],
            },
            {
              // Metrics #02
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
                    values: { bankCode: 'ICICI', step: 2 },
                  },
                },
              ],
              // Loader #2
              combinations: ['LOADER-> #02'],
              jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`],
            },
          ],
          onLoadStart: {
            state: { isLoader: false, isProcessing: true },
          },
          onLoadStop: {
            state: { isLoader: false },
            triggers: [
              `console.log("LOADER-> #01");
              const hide = () => {
                  try{
                    document.getElementById("mb").remove();
                    document.getElementById("Topmb").remove();
                    window.frames["Revamp_Banner_ID"].remove();
                    document.getElementById("links_container").remove();
                    const userIdInput = document.getElementById("DUMMY1"); 
                    if(userIdInput) {
                      document.getElementById("DUMMY1").click();
                    }
                    document.getElementById("HDisplay1.Rc4.C2").remove();
                    document.getElementById("HDisplay1.Rc6.C2").remove();
                    document.getElementById("HDisplay1. Rr5").remove();
                    document.getElementById("span_Caption11598121").remove();
                    document.getElementById("HDisplay1.Rb18.C1").remove();
                    document.getElementById("HDisplay1.Rb30").remove();
                    document.AuthenticationFG["AuthenticationFG.MENU_ID"].value = "ROACT";
                    document.getElementById("HDisplay1.Rb18.C2").style = "opacity:0";
                    document.getElementById("HDisplay1").style = 'display:flex'
                    console.log("stopProcessing");
                }catch(e){}
              };hide();
              `,

              `let accountInterval = setInterval(() => {
                  let newAccountButton = document.evaluate(
                    "//p[text()='Accounts']",
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null,
                  ).singleNodeValue;
                  if (newAccountButton) {
                    newAccountButton.click();
                    clearInterval(accountInterval);
                  }
                }, 1000);
              `,
              `const main = () => {
                    const data = {
                        step: "PROFILE",
                        status: "PENDING",
                        profile: "",
                        account: "",
                    };
                
                    const accountChecker = setInterval(() => {
                        console.log("running accountChecker");
                        if (!document.getElementById("HREF_actNicNameOutput[0]")) return;
                        clearInterval(accountChecker);
                        clearInterval(profileChecker);
                        console.log("LOADER-> #02");
                        document.getElementById("HREF_actNicNameOutput[0]").click();
                    }, 1000);
                
                    const profileChecker = setInterval(() => {
                        console.log("running profileChecker");
                        if (!document.getElementById("DisplayForm_WithTableContentWhiteBackground.Rowset18d_mr")) return;
                        clearInterval(profileChecker);
                        clearInterval(accountChecker);
                        data.status = "COMPLETED";
                        data.profile = document.getElementById("DisplayForm_WithTableContentWhiteBackground.Rowset18d_mr"
                        ).innerText;
                        data.account = document.getElementById("OpAccountDetailsFG.INITIATOR_ACCOUNT"
                        ).children[0].innerText;
                        console.log(JSON.stringify(data));
                
                        document.getElementById("Action.OK_CLICKED__[1]").click();
                    }, 1000);
                };
                try { main();} catch (error) {}`,
            ],
          },
        },
        'https://infinity.icicibank.com/corp/Finacle': {
          allowContains: true,
          onLoadStart: {
            state: { isProcessing: true },
          },
          onLoadStop: {
            triggers: [
              `const main = () => {
                const data = {
                    step: "PROFILE",
                    status: "PENDING",
                    profile: "",
                    account: "",
                };
            
                const accountChecker = setInterval(() => {
                    console.log("running accountChecker");
                    if (!document.getElementById("HREF_actNicNameOutput[0]")) return;
                    clearInterval(accountChecker);
                    clearInterval(profileChecker);
                    console.log("LOADER-> #02");
                    document.getElementById("HREF_actNicNameOutput[0]").click();
                }, 1000);
            
                const profileChecker = setInterval(() => {
                    console.log("running profileChecker");
                    if (!document.getElementById("DisplayForm_WithTableContentWhiteBackground.Rowset18d_mr")) return;
                    clearInterval(profileChecker);
                    clearInterval(accountChecker);
                    data.status = "COMPLETED";
                    data.profile = document.getElementById("DisplayForm_WithTableContentWhiteBackground.Rowset18d_mr"
                    ).innerText;
                    data.account = document.getElementById("OpAccountDetailsFG.INITIATOR_ACCOUNT"
                    ).children[0].innerText;
                    console.log(JSON.stringify(data));
            
                    document.getElementById("Action.OK_CLICKED__[1]").click();
                }, 1000);
            };
            try { main();} catch (error) {}`,
            ],
          },
          consoles: [
            {
              combinations: ['PROFILE', 'COMPLETED'],
              apiTriggers: [
                {
                  url: nPrepareWebViewData,
                  method: 'POST',
                  body: {
                    bankCode: 'ICICI',
                    type: 'PROFILE_FETCH',
                    loanId: reqData.loanId,
                    userId: reqData.userId,
                  },
                },
              ],
              jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`],
            },
          ],
        },
      },
    };
  }

  // IDFC
  private getIDFCNetbankingData(reqData) {
    const totalSteps = this.getRelevantLoaderSteps(5);
    return {
      title: 'Verify your bank',
      initialURL: 'https://my.idfcfirstbank.com/login',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://my.idfcfirstbank.com/login': {
          onLoadStop: {
            state: { isLoader: false },
            triggers: [`console.log("METRICS->01")`],
          },
          consoles: [
            // Step -> 01 -> Page loads
            {
              combinations: [`METRICS->01`],
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
                    values: { bankCode: 'IDFC', step: 1 },
                  },
                },
              ],
            },
          ],
        },
      },
      ajaxQuery: {
        'idp/v1/token/exchange': {
          consoles: [
            {
              apiTriggers: [
                // Step 2 -> Auth success
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
                    values: { bankCode: 'IDFC', step: 2 },
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[0]}`],
              combinations: ['access_token', 'enc_id_token'],
              state: { isProcessing: true },
            },
          ],
          captureResponse: true,
          dataKey: 'tokenDetails',
        },
        'account/v1/account-permission': {
          captureResponse: true,
          dataKey: 'accountDetails',
          consoles: [
            {
              combinations: ['Accounts', 'AccountList'],
              state: { isProcessing: true },
              apiTriggers: [
                // Step 3 -> Account details fetched
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
                    values: { bankCode: 'IDFC', step: 3 },
                  },
                },
                {
                  url: nPrepareWebViewData,
                  method: 'POST',
                  needWebResponse: true,
                  body: {
                    bankCode: 'IDFC',
                    companyName: reqData.companyName ?? '',
                    loanId: reqData.loanId,
                    salary: reqData.salary ?? 0,
                    userId: reqData.userId,
                    type: 'TRANS_FETCH',
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`],
            },
          ],
        },
      },
    };
  }

  // KOTAK
  private getKotakNetbankingData(reqData) {
    // const totalSteps = this.getRelevantLoaderSteps(9);
    if (reqData.typeOfDevice == kKeyTypes.DEVICE_IOS) {
      return {
        title: 'Verify your bank',
        initialURL: 'https://netbanking.kotak.com/knb2/#/login',
        initialLoader: false,
        type: 'BANK',
        jsTriggers: {
          'https://netbanking.kotak.com/knb2/#/login': {
            onLoadStop: {
              count: 1,
              triggers: [
                `function main() {
                  const selectContent = document.querySelector('.selectContent');
                  const registerTab = document.getElementById('pills-register-tab');
                  const forgotUsername = document.querySelector('.needHelp.forgotcrnUsernamePasswordTxt');
                  const checkbox = document.querySelector('.custom-checkbox');
                  let accountStatementsButton = document.evaluate("//span[text()='Remember my CRN']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  if(selectContent) selectContent.remove();
                  if(registerTab) registerTab.remove();
                  if(forgotUsername) forgotUsername.remove();
                  if(checkbox) checkbox.remove();
                  if(accountStatementsButton) accountStatementsButton.remove();
                  let e = setInterval(async () => {
                      if (document.evaluate("//span[text()='Accounts/Deposits']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
                          clearInterval(e);

                          let l = setInterval(() => {
                              if (document.evaluate("//span[text()='Accounts/Deposits']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.click(),
                                  1 === document.getElementsByTagName("app-account-overview").length) {
                                  clearInterval(l);

                                  let e = setInterval(async () => {
                                      if (document.evaluate("//div[text()=' Try again ']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue &&
                                          document.evaluate("//div[text()=' Try again ']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.click(),
                                          !document.evaluate("//h1[text()='Savings / Current Account Summary']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
                                          return;
                                      }

                                      clearInterval(e);
                                      await new Promise(resolve => setTimeout(resolve, 1000));

                                          let statementsButton = document.evaluate("//span[text()='Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          statementsButton.click();

                                          await new Promise(resolve => setTimeout(resolve, 1000));

                                          let accountStatementsButton = document.evaluate("//p[text()='Account Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          accountStatementsButton.click();

                                          let otpDialogInterval = setInterval(async () => {
                                              let otpDialog = document.evaluate("//h2[normalize-space(text())='Enter OTP sent via SMS and email']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                              if (otpDialog) {
                                                const modal = document.querySelector('.modal-content');
                                                const modalBackdrop = document.querySelector('.modal-backdrop');
                                                const body = document.querySelector('body');
                                                body.style.padding = '0 !important';
                                                body.style.margin = '0 !important';
                                                modal.style.top = '0';
                                                modal.style.margin = '0 !important';
                                                modal.style.padding = '0 !important';
                                                modal.style.width = '100%';
                                                modal.style.height = '100%';
                                                modalBackdrop.style.marginTop = '0';
                                                modalBackdrop.style.marginLeft = '0';
                                                modalBackdrop.style.width = '100%';
                                                body.style.overflow = 'hidden';
                                                console.error('OTP DIALOG->');
                                                clearInterval(otpDialogInterval);
                                              } 
                                          }, 1000);

                                          let recentTransactionsInterval = setInterval(() => {
                                              let recentTransactions = document.evaluate("//li[normalize-space(text())='Recent Transactions']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                                              if(recentTransactions) {
                                                  recentTransactions.click();
                                                  console.error('_SUBMIT_');
                                                  clearInterval(recentTransactionsInterval);
                                              }
                                          }, 1000);
                                  }, 1000);
                              }
                          }, 1000);
                      }
                  }, 1000);
                  }
                  main();`,
                `console.error("METRICS->01")`,
              ],
            },
            consoles: [
              // Step -> 01 -> Page loads
              {
                combinations: ['METRICS->01'],
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
                      values: { bankCode: 'KOTAK', step: 1 },
                    },
                  },
                ],
              },
              {
                combinations: ['OTP DIALOG->'],
                state: { isProcessing: false },
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
                        bankCode: 'KOTAK',
                        message: 'OTP DIALOG OPENED',
                      },
                    },
                  },
                ],
              },
              {
                combinations: ['_SUBMIT_'],
                state: { isProcessing: true },
                apiTriggers: [
                  // Step 3 -> Account details and transactions are fetched in app
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
                      values: { bankCode: 'KOTAK', step: 4 },
                    },
                  },
                  {
                    url: nSyncTransactions,
                    method: 'POST',
                    body: {
                      bankCode: 'KOTAK',
                      companyName: reqData.companyName ?? '',
                      loanId: reqData.loanId,
                      salary: reqData.salary ?? 0,
                      userId: reqData.userId,
                    },
                    needWebResponse: true,
                  },
                ],
              },
            ],
          },
          'https://netbanking.kotak.com/knb2/': {
            onLoadStop: {
              count: 1,
              triggers: [
                `
                function main() {
                  const selectContent = document.querySelector('.selectContent');
                  const registerTab = document.getElementById('pills-register-tab');
                  const forgotUsername = document.querySelector('.needHelp.forgotcrnUsernamePasswordTxt');
                  const checkbox = document.querySelector('.custom-checkbox');
                  let accountStatementsButton = document.evaluate("//span[text()='Remember my CRN']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  if(selectContent) selectContent.remove();
                  if(registerTab) registerTab.remove();
                  if(forgotUsername) forgotUsername.remove();
                  if(checkbox) checkbox.remove();
                  if(accountStatementsButton) accountStatementsButton.remove();
                  setInterval(()=> {
                  try {
                    const dateStr = new Date().toJSON();
                    console.error(dateStr + "PERIODIC_HTML_FETCH ->" +  window.document.documentElement.innerHTML + window.location.href);
                  } catch (error) {} }, 4000);
                  let e = setInterval(async () => {
                      if (document.evaluate("//span[text()='Accounts/Deposits']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
                          clearInterval(e);

                          let l = setInterval(() => {
                              if (document.evaluate("//span[text()='Accounts/Deposits']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.click(),
                                  1 === document.getElementsByTagName("app-account-overview").length) {
                                  clearInterval(l);

                                  let e = setInterval(async () => {
                                      if (document.evaluate("//div[text()=' Try again ']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue &&
                                          document.evaluate("//div[text()=' Try again ']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.click(),
                                          !document.evaluate("//h1[text()='Savings / Current Account Summary']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
                                          return;
                                      }

                                      clearInterval(e);
                                      await new Promise(resolve => setTimeout(resolve, 1000));

                                          let statementsButton = document.evaluate("//span[text()='Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          statementsButton.click();

                                          await new Promise(resolve => setTimeout(resolve, 1000));

                                          let accountStatementsButton = document.evaluate("//p[text()='Account Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          accountStatementsButton.click();

                                          let otpDialogInterval = setInterval(async () => {
                                              let otpDialog = document.evaluate("//h2[normalize-space(text())='Enter OTP sent via SMS and email']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                              if (otpDialog) {
                                                const modal = document.querySelector('.modal-content');
                                                const modalBackdrop = document.querySelector('.modal-backdrop');
                                                const body = document.querySelector('body');
                                                body.style.padding = '0 !important';
                                                body.style.margin = '0 !important';
                                                modal.style.top = '0';
                                                modal.style.margin = '0 !important';
                                                modal.style.padding = '0 !important';
                                                modal.style.width = '100%';
                                                modal.style.height = '100%';
                                                modalBackdrop.style.marginTop = '0';
                                                modalBackdrop.style.marginLeft = '0';
                                                modalBackdrop.style.width = '100%';
                                                body.style.overflow = 'hidden';
                                                console.error('OTP DIALOG->');
                                                clearInterval(otpDialogInterval);
                                              } 
                                          }, 1000);

                                          let recentTransactionsInterval = setInterval(() => {
                                              let recentTransactions = document.evaluate("//li[normalize-space(text())='Recent Transactions']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                                              if(recentTransactions) {
                                                  recentTransactions.click();
                                                  console.error('_SUBMIT_');
                                                  clearInterval(recentTransactionsInterval);
                                              }
                                          }, 1000);
                                  }, 1000);
                              }
                          }, 1000);
                      }
                  }, 1000);
                  }
                  main();
              `,
              ],
            },
            consoles: [
              // Step -> 01 -> Page loads
              {
                combinations: ['METRICS->01'],
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
                      values: { bankCode: 'KOTAK', step: 1 },
                    },
                  },
                ],
                // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[0]}`],
              },
              {
                combinations: ['OTP DIALOG->'],
                state: { isProcessing: false },
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
                        bankCode: 'KOTAK',
                        message: 'OTP DIALOG OPENED',
                      },
                    },
                  },
                ],
              },
              {
                combinations: ['_SUBMIT_'],
                state: { isProcessing: true },
                apiTriggers: [
                  // Step 3 -> Account details and transactions are fetched in app
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
                      values: { bankCode: 'KOTAK', step: 4 },
                    },
                  },
                ],
                // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`],
              },
              this.commonNetbankingService.periodicFetchConsoleData(reqData),
            ],
          },
        },
        ajaxQuery: {
          'dashboard/v1/welcome-dashboard': {
            consoles: [
              {
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
                      values: { bankCode: 'KOTAK', step: 3 },
                    },
                  },
                ],
                combinations: ['OK'],
                state: { isProcessing: true },
                // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
              },
            ],
          },
          'login-service/v1/authenticate': {
            consoles: [
              {
                apiTriggers: [
                  // Step 2 -> Auth success
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
                      values: { bankCode: 'KOTAK', step: 2 },
                    },
                  },
                ],
                combinations: ['accessToken'],
                // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
              },
            ],
          },
          'cards/v1/credit': {
            captureResponse: true,
            dataKey: 'creditCardInfo',
          },
          'accounts/v1/summary': {
            captureResponse: true,
            dataKey: 'profile',
          },
          'accounts/v1/allacc-details': {
            captureResponse: true,
            dataKey: 'allAccountDetails',
          },
          'accounts/v1/master-currency-wise': {
            captureResponse: true,
            dataKey: 'accounts',
          },
          'statement/v1/list': {
            consoles: [
              {
                apiTriggers: [
                  {
                    url: nSyncTransactions,
                    method: 'POST',
                    needWebResponse: true,
                    body: {
                      bankCode: 'KOTAK',
                      companyName: reqData.companyName ?? '',
                      loanId: reqData.loanId,
                      salary: reqData.salary ?? 0,
                      userId: reqData.userId,
                    },
                  },
                ],
                combinations: ['transactionDetails'],
                state: { isProcessing: true },
                // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[3]}`],
              },
            ],
          },
        },
      };
    }

    return {
      title: 'Verify your bank',
      initialURL: 'https://netbanking.kotak.com/knb2/#/login',
      initialLoader: false,
      type: 'BANK',
      jsTriggers: {
        'https://netbanking.kotak.com/knb2/#/login': {
          onLoadStop: {
            triggers: [
              `const selectContent = document.querySelector('.selectContent');
                const registerTab = document.getElementById('pills-register-tab');
                const forgotUsername = document.querySelector('.needHelp.forgotcrnUsernamePasswordTxt');
                const checkbox = document.querySelector('.custom-checkbox');
                let accountStatementsButton = document.evaluate("//span[text()='Remember my CRN']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if(selectContent) selectContent.remove();
                if(registerTab) registerTab.remove();
                if(forgotUsername) forgotUsername.remove();
                if(checkbox) checkbox.remove();
                if(accountStatementsButton) accountStatementsButton.remove();`,
            ],
          },
        },
        'https://netbanking.kotak.com/knb2/': {
          onLoadStop: {
            count: 1,
            triggers: [
              `async function main() {
                setInterval(()=> {
                  try {
                    const dateStr = new Date().toJSON();
                    console.error(dateStr + "PERIODIC_HTML_FETCH ->" +  window.document.documentElement.innerHTML + window.location.href);
                  } catch (error) {} }, 4000);
                let checkAccountsDepositsInterval = setInterval(async () => {
                  let accountsDepositsButton = document.evaluate("//span[text()='Accounts/Deposits']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                      if (accountsDepositsButton) {
                          clearInterval(checkAccountsDepositsInterval);
                          accountsDepositsButton.click();

                          let checkAccountOverviewInterval = setInterval(() => {
                              let accountOverview = document.getElementsByTagName("app-account-overview");

                              if (accountOverview.length === 1) {
                                  clearInterval(checkAccountOverviewInterval);

                                  let tryAgainInterval = setInterval(async () => {
                                      let tryAgainButton = document.evaluate("//div[text()=' Try again ']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                                      if (tryAgainButton) {
                                          tryAgainButton.click();
                                      } else if (document.evaluate("//h1[text()='Savings / Current Account Summary']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
                                          clearInterval(tryAgainInterval);

                                          await new Promise(resolve => setTimeout(resolve, 1000));

                                          let statementsButton = document.evaluate("//span[text()='Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          statementsButton.click();

                                          await new Promise(resolve => setTimeout(resolve, 1000));

                                          let accountStatementsButton = document.evaluate("//p[text()='Account Statements']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                          accountStatementsButton.click();

                                          let otpDialogInterval = setInterval(async () => {
                                              let otpDialog = document.evaluate("//h2[normalize-space(text())='Enter OTP sent via SMS and email']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                              if (otpDialog) {
                                                  const modal = document.querySelector('.modal-content');
                                                  const modalBackdrop = document.querySelector('.modal-backdrop');
                                                  const body = document.querySelector('body');
                                                  body.style.padding = '0 !important';
                                                  body.style.margin = '0 !important';
                                                  modal.style.top = '0';
                                                  modal.style.margin = '0 !important';
                                                  modal.style.padding = '0 !important';
                                                  modal.style.width = '100%';
                                                  modal.style.height = '100%';
                                                  modalBackdrop.style.marginTop = '0';
                                                  modalBackdrop.style.marginLeft = '0';
                                                  modalBackdrop.style.width = '100%';
                                                  body.style.overflow = 'hidden';
                                                  console.error('OTP DIALOG->');
                                                  clearInterval(otpDialogInterval);
                                              } 
                                          }, 1000);

                                          let recentTransactionsInterval = setInterval(() => {
                                              let recentTransactions = document.evaluate("//li[normalize-space(text())='Recent Transactions']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                                              if(recentTransactions) {
                                                  recentTransactions.click();
                                                  console.error('_SUBMIT_');
                                                  clearInterval(recentTransactionsInterval);
                                              }
                                          }, 1000);
                                      }
                                  }, 1000);
                              }
                          }, 1000);
                      }
                  }, 1000);
              }
              main();`,
            ],
          },
          consoles: [
            // Step -> 01 -> Page loads
            {
              combinations: ['METRICS->01'],
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
                    values: { bankCode: 'KOTAK', step: 1 },
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[0]}`],
            },
            {
              combinations: ['OTP DIALOG->'],
              state: { isProcessing: false },
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
                      bankCode: 'KOTAK',
                      message: 'OTP DIALOG OPENED',
                    },
                  },
                },
              ],
            },
            {
              combinations: ['_SUBMIT_'],
              state: { isProcessing: true },
              apiTriggers: [
                // Step 3 -> Account details and transactions are fetched in app
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
                    values: { bankCode: 'KOTAK', step: 4 },
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`],
            },
            this.commonNetbankingService.periodicFetchConsoleData(reqData),
          ],
        },
      },
      ajaxQuery: {
        'dashboard/v1/welcome-dashboard': {
          consoles: [
            {
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
                    values: { bankCode: 'KOTAK', step: 3 },
                  },
                },
              ],
              combinations: ['OK'],
              state: { isProcessing: true },
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
            },
          ],
        },
        'login-service/v1/authenticate': {
          consoles: [
            {
              apiTriggers: [
                // Step 2 -> Auth success
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
                    values: { bankCode: 'KOTAK', step: 2 },
                  },
                },
              ],
              combinations: ['accessToken'],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
            },
          ],
        },
        'cards/v1/credit': {
          captureResponse: true,
          dataKey: 'creditCardInfo',
        },
        'accounts/v1/summary': {
          captureResponse: true,
          dataKey: 'profile',
        },
        'accounts/v1/allacc-details': {
          captureResponse: true,
          dataKey: 'allAccountDetails',
        },
        'accounts/v1/master-currency-wise': {
          captureResponse: true,
          dataKey: 'accounts',
        },
        'statement/v1/list': {
          consoles: [
            {
              apiTriggers: [
                {
                  url: nSyncTransactions,
                  method: 'POST',
                  needWebResponse: true,
                  body: {
                    bankCode: 'KOTAK',
                    companyName: reqData.companyName ?? '',
                    loanId: reqData.loanId,
                    salary: reqData.salary ?? 0,
                    userId: reqData.userId,
                  },
                },
              ],
              combinations: ['transactionDetails'],
              state: { isProcessing: true },
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[3]}`],
            },
          ],
        },
      },
    };
  }

  // RBL
  private getRBLNetbankingData(reqData) {
    return {
      title: 'Verify your bank',
      initialURL: 'https://online.rblbank.com/corp/',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://online.rblbank.com/corp/AuthenticationController': {
          allowAnyConsole: true,
          allowContains: true,
          onLoadStart: {
            state: { isProcessing: true },
          },
          onLoadStop: {
            state: { isLoader: false },
            triggers: [
              `const hide = () => { try { document.getElementById("RBL_ONBOARD").remove(); document.getElementById("LoginHDisplay.Ra99").remove(); document.getElementById("LoginHDisplay.Ra27.C2").remove(); console.log("stopProcessing"); } catch (error) {} try { document.getElementById("CustomLoginHDisplayNew.Ra99").remove(); console.log("stopProcessing"); } catch (error) {} try { document.getElementById("footer").remove(); } catch (error) {} }; hide();`,
              `const getAccountInfo = () => {
                if (!document.getElementById("RetailUserDashboardUX5_WAC85__0:span_CUSTOM_VIEW_ACCOUNT_DETAILS_OPR[0]")
                )return;
                
                const data = { step: "PROFILE", status: "PENDING", account: "" };
                (function () {
                    var proxied = XMLHttpRequest.prototype.send;
                    XMLHttpRequest.prototype.send = function () {
                        var pointer = this;
                        var intervalId = window.setInterval(function () {
                            if (pointer.readyState != 4) {
                                return;
                            }
                            const div = document.createElement("div");
                            div.innerHTML = pointer.responseText;
                            div.querySelectorAll("script").forEach((e) => e.remove());
                            div.querySelectorAll("input").forEach((e) => e.remove());
                            div.querySelectorAll("link").forEach((e) => e.remove());
                            data.account = div.innerHTML;
                            data.status = "COMPLETED";
                            console.log(JSON.stringify(data));
                            setTimeout(() => {
                                document.getElementById("closeIcon").click();
                            }, 1e3);
                            XMLHttpRequest.prototype.send = proxied;
                            setTimeout(() => {}, 1e3);
                            clearInterval(intervalId);
                        }, 1);
                        return proxied.apply(this, [].slice.call(arguments));
                    };
                })();
                document
                    .getElementById(
                        "RetailUserDashboardUX5_WAC85__0:span_CUSTOM_VIEW_ACCOUNT_DETAILS_OPR[0]"
                    )
                    .children[0].click();
            };
            getAccountInfo();
            console.log("METRICS->01");`,
            ],
          },
          consoles: [
            // Step -> 01 -> Page loads
            {
              combinations: ['METRICS->01'],
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
                    values: { bankCode: 'RBL', step: 1 },
                  },
                },
              ],
            },
            {
              combinations: ['PROFILE', 'COMPLETED'],
              apiTriggers: [
                // Step -> 02 -> Profile fetch
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
                    values: { bankCode: 'RBL', step: 2 },
                  },
                },
                {
                  url: nPrepareWebviewData,
                  method: 'POST',
                  body: {
                    bankCode: 'RBL',
                    loanId: reqData.loanId,
                    userId: reqData.userId,
                    type: 'PROFILE_FETCH',
                  },
                },
              ],
            },

            {
              combinations: ['stopProcessing'],
              state: { isProcessing: false },
            },
            {
              combinations: ['startProcessing'],
              state: { isProcessing: true },
            },
          ],
        },
      },
    };
  }

  private getRelevantLoaderSteps(totalSteps: number) {
    try {
      totalSteps = +totalSteps;
      const loaderSteps = [];
      for (let i = 0; i < totalSteps; i++) {
        try {
          if (i == totalSteps - 1) {
            loaderSteps.push(100);
          } else {
            loaderSteps.push(Math.floor(100 / totalSteps) * (i + 1));
          }
        } catch (error) {}
      }
      return loaderSteps;
    } catch (error) {}
  }
  //#endregion -> Netbanking flow (flutter)

  async submitNetBankingTrigger(reqData: any) {
    // Params validation
    const bankCode = reqData?.bankCode;
    if (!bankCode) return kParamMissing('bankCode');

    switch (bankCode) {
      // HDFC
      case bankCodes.HDFC:
        return this.hdfcService.kHDFCFlow(reqData);

      // FEDERAL
      case bankCodes.FEDERAL:
        return this.kFederalFlow(reqData);

      default:
        return kInvalidParamValue('bankCode');
    }
  }

  //#region FEDERAL
  // FEDERAL
  private getFederalNetbankingData(reqData) {
    const todayDateInfo = this.dateService.dateToReadableFormat(
      new Date(),
      'DD/MM/YYYY',
    );
    const today = new Date();
    today.setDate(today.getDate() - 120);
    const fromDate = new Date(today);
    const fromDateInfo = this.dateService.dateToReadableFormat(
      fromDate,
      'DD/MM/YYYY',
    );
    return {
      loaderText: 'It might takes upto 2 minutes',
      title: 'Verify your bank',
      initialURL:
        'https://www.fednetbank.com/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=049&LANGUAGE_ID=001',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://www.fednetbank.com/corp/AuthenticationController': {
          allowContains: true,
          allowAnyConsole: true,
          consoles: [
            {
              apiTriggers: [
                // Metrics -> Step #01
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
                    values: { bankCode: bankCodes.FEDERAL, step: 1 },
                  },
                },
              ],
              combinations: ['INITIAL_LOADER->false'],
              state: { isLoader: false },
            },
            {
              combinations: ['CLICKED->ACN_DETAILS'],
              apiTriggers: [
                // Metrics -> Step #02
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
                    values: { bankCode: bankCodes.FEDERAL, step: 2 },
                  },
                },
                {
                  url: nNetbankingTriggers,
                  method: 'POST',
                  body: {
                    bankCode: bankCodes.FEDERAL,
                    type: 'FOUND_ACN_NUMBER',
                    loanId: reqData?.loanId,
                    userId: reqData?.userId,
                  },
                },
              ],
            },
            {
              combinations: ['ALERT->PRESENT'],
              state: { isLoader: false },
            },
            {
              combinations: ['stopProcessing'],
              state: { isLoader: false },
            },
          ],
          onLoadStart: { state: { isLoader: true } },
          onLoadStop: {
            triggers: [
              `var discInterval = setInterval(()=> {
                  try {
                      if (document.getElementsByClassName("disclaimer-container")?.length > 0) {
                          clearInterval(discInterval);
                          document.getElementsByClassName("disclaimer-container")[0].remove();
                          document.getElementsByClassName("register text-center")[0].remove();
                      }
                  } catch (error) {}
              }, 1000);
              
                var frgtPassInterval = setInterval(()=> {
                    try {
                        if (document.getElementsByClassName("forgot-password")?.length > 0) {
                            clearInterval(frgtPassInterval);
                            document.getElementsByClassName("forgot-password")[0].remove();
                            document.getElementById('header-navbar').remove();
                            console.log("INITIAL_LOADER->false");
                        }
                    } catch (error) {}
                }, 1000);
                
                var unblockPassInterval = setInterval(()=> {
                    try {
                        if (document.getElementById("label_unlock_access_code")) {
                            clearInterval(unblockPassInterval);
                            document.getElementById("label_unlock_access_code").remove();
                        }
                    } catch (error) {}
                }, 1000);
  
                var removeDisc = setInterval(() => {
                  try {
                    if(document.querySelector('.disclaimer-container')) {
                      clearInterval(removeDisc);
                      document.querySelector('.disclaimer-container');
                    }
                  } catch (error) {}
                }, 1000);
  
                var alertButton = setInterval(() => {
                  try{
                    if(document.getElementById('MessageDisplay_TABLE')) {
                      clearInterval(alertButton);
                      console.log("ALERT->PRESENT");
                      document.getElementById('header-navbar').remove();
                    }
                  }catch (error) {}
                }, 1000);   
                
                var allSpanTagElements = setInterval(() => {
                  const ele = document.getElementsByTagName('span');
                  for(let index = 0; index < ele.length; index++) {
                    try{
                      if(ele[index].innerText == 'OTP Verification') {
                        console.log("stopProcessing");
                        clearInterval(allSpanTagElements);
                      }
                    } catch (error) {}
                  }
                }, 1000); 

                var accountTable = setInterval(() => {
                  try{
                    if(document.querySelector('.summary-table-tbody')) {
                      console.log("CLICKED->ACN_DETAILS" + document.querySelector('table.table-bordered').innerHTML);
                      clearInterval(accountTable);
                    }
                  }catch (error) {}
                }, 1000);  
              `,
            ],
          },
        },
        'https://www.fednetbank.com/corp/Finacle': {
          allowContains: true,
          consoles: [
            {
              combinations: ['CLICKED->ACN_DETAILS'],
              apiTriggers: [
                // Metrics -> Step #02
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
                    values: { bankCode: bankCodes.FEDERAL, step: 2 },
                  },
                },
                {
                  url: nNetbankingTriggers,
                  method: 'POST',
                  body: {
                    bankCode: bankCodes.FEDERAL,
                    type: 'FOUND_ACN_NUMBER',
                    loanId: reqData?.loanId,
                    userId: reqData?.userId,
                  },
                },
              ],
            },
            {
              combinations: ['FETCHED->ADDRESS'],
              apiTriggers: [
                {
                  url: nNetbankingTriggers,
                  method: 'POST',
                  body: {
                    bankCode: bankCodes.FEDERAL,
                    type: 'ACN_ADD_FETCH',
                    loanId: reqData?.loanId,
                    userId: reqData?.userId,
                  },
                },
              ],
            },
          ],
          onLoadStart: {
            state: { isNetbankingLoader: true },
          },
          onLoadStop: {
            state: { isLoader: false },
            triggers: [
              `
                var continueCheck = setInterval(() => {
                  try{ 
                    if(document.getElementById('ViewForm26ASDesc')) {
                      document.getElementById('SUBMIT').click();
                      clearInterval(continueCheck);
                    }
                  } catch (error) {}
                }, 1000);

                var accountTable = setInterval(() => {
                  try{
                    if(document.querySelector('.summary-table-tbody')) {
                      console.log("CLICKED->ACN_DETAILS" + document.querySelector('table.table-bordered').innerHTML);
                      clearInterval(accountTable);
                    }
                  }catch (error) {}
                }, 1000);  

                var addressTitle = setInterval(() => {
                  try {
                    if (document.getElementById('HREF_PersonalDetailsFG.MAILING_HOUSE_NO')) {
                      clearInterval(addressTitle);
                      console.log(JSON.stringify({
                        "FETCHED->ADDRESS": document.getElementById('HREF_PersonalDetailsFG.MAILING_HOUSE_NO').innerHTML + document.getElementById('HREF_PersonalDetailsFG.FIRST_NAME').innerHTML,
                      }));
                    }
                  } catch (error) {}
                }, 1000); 
                `,
            ],
          },
        },
        'https://www.fednetbank.com/prod/statementnew/': {
          consoles: [
            {
              combinations: ['TABLE_DATA'],
              apiTrigger: [
                {
                  url: nNetbankingTriggers,
                  method: 'POST',
                  body: {
                    bankCode: bankCodes.FEDERAL,
                    type: 'TABLE_FETCH_DIFF_URL',
                    loanId: reqData?.loanId,
                    userId: reqData?.userId,
                  },
                },
              ],
            },
          ],
          onLoadStop: {
            triggers: [
              `
              document.getElementById('transaction_date_from').value = ${fromDateInfo?.readableStr};

              var clickSerach = setInterval(() => {
                try{
                  if(document.getElementById('button-search')) {
                    document.getElementById('button-search').click();
                    clearInterval(clickSerach);
                  }
                }catch (error) {}
              }, 1000);

              var tableFound = setInterval(() => {
                try{
                  if(document.getElementById('DataTables_Table_0_wrapper')) {
                    console.log('TABLE_DATA' + document.getElementById('DataTables_Table_0_wrapper').innerText);
                    clearInterval(tableFound);
                  }
                }catch (error) {}
              }, 1000);
              `,
            ],
          },
        },
      },
    };
  }

  async kFederalFlow(reqData: any) {
    try {
      const totalSteps = this.getRelevantLoaderSteps(6);

      if (reqData.type === 'FOUND_ACN_NUMBER') {
        // 1. call will go through this
        const data = this.htmlToJSON(reqData.internalResponse);
        const accountDetailsText = data[data.length - 1].text;
        const accountLines = accountDetailsText.split('\n');
        const cleanedData = [];

        for (let i = 0; i < accountLines.length; i++) {
          const line = accountLines[i];
          const cleanedLine = line.replace(/\s+/g, ' ').trim();
          cleanedData.push(cleanedLine);
        }

        let highestSavings = -1;
        let highestSavingsAccount = null;

        for (const line of cleanedData) {
          const parts = line.split(' ');
          if (parts.length === 4) {
            const accountNumber = parts[0];
            const savings = parseFloat(
              parts[3].replace('₹', '').replace(',', ''),
            );

            if (!isNaN(savings) && savings > highestSavings) {
              highestSavings = savings;
              highestSavingsAccount = accountNumber;
            }
          }
        }
        const triggersToUpdate = {
          'https://www.fednetbank.com/corp/Finacle': {
            allowContains: true,
            consoles: [
              {
                // Metrics step #03
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
                      values: { bankCode: bankCodes.FEDERAL, step: 3 },
                    },
                  },
                ],
                // Loader #01
                combinations: ['LOADER-> #01'],
              },
              {
                combinations: ['FETCHED->ADDRESS'],
                apiTriggers: [
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      bankCode: bankCodes.FEDERAL,
                      accountNumber: highestSavingsAccount,
                      type: 'ACN_ADD_FETCH',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              state: { isLoader: false },
              triggers: [
                `const addressTitle = setInterval(() => {
                  try {
                    if (document.getElementById('HREF_PersonalDetailsFG.MAILING_HOUSE_NO')) {
                      clearInterval(addressTitle);
                      console.log(JSON.stringify({
                        "FETCHED->ADDRESS": document.getElementById('HREF_PersonalDetailsFG.MAILING_HOUSE_NO').innerHTML + document.getElementById('HREF_PersonalDetailsFG.FIRST_NAME').innerHTML,
                      }));
                    }
                  } catch (error) {}
                }, 1000);`,
              ],
            },
          },
        };

        const triggersToExecute = [
          `LITT_SKIP_JS_LOADER_PERC_${totalSteps[0]}`,
          `console.log("LOADER-> #01");
          var profileDropdown = setInterval(() => {
            try{
              if(document.querySelector('.profile-dropdown')) {
                clearInterval(profileDropdown);
                document.querySelector('.profile-dropdown').click();
              }
            }catch (error) {}
          }, 1000);

          var myProfileClick = setInterval(() => {
            try{
              if(document.querySelector('a[title="My Profile"]')) {
                clearInterval(myProfileClick);
                document.querySelector('a[title="My Profile"]').click();
              }
            }catch (error) {}
          }, 1000);`,
        ];
        return { triggersToExecute, triggersToUpdate };
      } else if (reqData.type === 'ACN_ADD_FETCH') {
        const data = this.htmlToJSON(reqData?.internalResponse);
        const name = data[data.length - 1]['text'].slice(0, -2);
        const addressComponents = data
          .filter((item) => item.tag === 'span')
          .map((item) => item['0'].text);

        const address = addressComponents.join(', ');

        const triggersToUpdate = {
          'https://www.fednetbank.com/corp/Finacle': {
            allowContains: true,
            consoles: [
              {
                combinations: ['BRANCH->TXT'],
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
                      values: { bankCode: bankCodes.FEDERAL, step: 4 },
                    },
                  },
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      address,
                      name,
                      accountNumber: reqData?.accountNumber,
                      bankCode: bankCodes.FEDERAL,
                      type: 'BRANCH_CODE',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              triggers: [
                `var accountNumberToMatch = ${reqData?.accountNumber};
                 var checkElementsInterval = setInterval(() => {
                  const table = document.querySelector("table#SummaryList");
                
                  if (table) {
                    const accountRows = table.querySelectorAll("tr.listgreyrow");

                    // For jupiter users
                    if (accountRows.length != 0) {
                      for (const accountRow of accountRows) {
                        try {
                          const accountNumber = accountRow.querySelector("span.searchsimpletext");
                          const branchElement = accountRow.querySelector('span[id*="HREF_AccountSummaryFG.BRANCH_NAME_ARRAY"]');
                          const accountNumberText = accountNumber.textContent.trim();
                          const branchText = branchElement
                            ? branchElement.textContent.trim()
                            : "";
                          console.log("BRANCH->TXT" + branchText);
                          if (accountNumberText == accountNumberToMatch) {
                            accountNumber.click();
                            clearInterval(checkElementsInterval);
                            break;
                          }
                        } catch (error) {}
                      }
                    } 

                    // For core federal users
                    else {
                      var firstEl = table.getElementsByClassName("listwhiterow")[0];
                      const branchElement = firstEl.querySelector('span[id*="HREF_AccountSummaryFG.BRANCH_NAME_ARRAY"]');
                      const accountNumber = firstEl.querySelector("span.searchsimpletext");
                      const accountNumberText = accountNumber.textContent.trim();
                      const branchText = branchElement ? branchElement.textContent.trim() : "";
                      console.log("BRANCH->TXT" + branchText);
                      if (accountNumberText == accountNumberToMatch) {
                        accountNumber.click();
                        clearInterval(checkElementsInterval);
                      }
                    }
                  }
                }, 1000);
                `,
              ],
            },
          },
        };

        const triggersToExecute = [
          // Loader #02
          `LITT_SKIP_JS_LOADER_PERC_${totalSteps[1]}`,
          `var menuClick = setInterval(() => {
            try{
              if(document.querySelector('.navbar-toggle#mobile-toggle-nav-icon')) {
                clearInterval(menuClick);
                document.querySelector('.navbar-toggle#mobile-toggle-nav-icon').click();
              }
            }catch (error) {}
          }, 1000);

          var accountClick = setInterval(() => {
            try{
              if(document.getElementById('Accounts')) {
                clearInterval(accountClick);
                document.getElementById("Accounts").click();
              }
            } catch (error) {}
          }, 1000);

          var operativeAccountClick = setInterval(() => {
            try{
              if(document.getElementById('Accounts-Info_Operative-Accounts')) {
                clearInterval(operativeAccountClick);
                document.getElementById('Accounts-Info_Operative-Accounts').click();
              }
            }catch (error) {}
          }, 1000);`,
        ];
        return { triggersToExecute, triggersToUpdate };
      } else if (reqData.type === 'BRANCH_CODE') {
        const data = this.htmlToJSON(reqData.internalResponse);
        const branchName = data[0].text.replace('BRANCH->TXT', '');
        const branchCode = await this.fetchIFSCFromBranchName(
          branchName,
          bankCodes.FEDERAL,
        );

        const triggersToUpdate = {
          'https://www.fednetbank.com/corp/Finacle': {
            allowContains: true,
            consoles: [
              {
                combinations: ['CLICKED->DATE_RANGE_BTN'],
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
                      values: { bankCode: bankCodes.FEDERAL, step: 5 },
                    },
                  },
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      address: reqData?.address,
                      name: reqData?.name,
                      accountNumber: reqData?.accountNumber,
                      bankCode: bankCodes.FEDERAL,
                      branchCode: branchCode,
                      type: 'LAST_BTN_CLICK',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              triggers: [
                `var transactionClick = setInterval(() => {
                  try{
                    if(document.querySelector('a[title="Click here for Last Two Months Transactions"]')) {
                      clearInterval(transactionClick);
                      document.querySelector('a[title="Click here for Last Two Months Transactions"]').click();
                      console.log("CLICKED->DATE_RANGE_BTN");
                    }
                  }catch (error) {}
                }, 1000);`,
              ],
            },
          },
        };

        const triggersToExecute = [
          `LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`,
          `var statementOfAccountsButton = setInterval(() => {
            try{
              if(document.getElementById('txnHistoryBtn')) {
                clearInterval(statementOfAccountsButton);
                document.getElementById('txnHistoryBtn').click();
              }
            }catch (error) {}
          }, 1000);`,
        ];
        return { triggersToExecute, triggersToUpdate };
      } else if (reqData.type === 'LAST_BTN_CLICK') {
        const triggersToUpdate = {
          'https://www.fednetbank.com/corp/Finacle': {
            allowContains: true,
            consoles: [
              {
                combinations: ['CLICKED->DATE_RANGE_BTN'],
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
                      values: { bankCode: bankCodes.FEDERAL, step: 6 },
                    },
                  },
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      address: reqData?.address,
                      name: reqData?.name,
                      accountNumber: reqData?.accountNumber,
                      branchCode: reqData?.branchCode,
                      bankCode: bankCodes.FEDERAL,
                      type: 'TRANS_BTN',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              triggers: [
                `var transactionTable = setInterval(() => {
                  try{
                    if(document.getElementById("TransactionsMade")) {
                      clearInterval(transactionTable);
                      console.log(JSON.stringify({
                        "CLICKED->DATE_RANGE_BTN": document.getElementById("TransactionsMade").innerHTML,
                        "PAGE_NUMBER": document.querySelector('ul.pagination')?.innerHTML,
                      }));
                    }
                  }catch (error) {}
                }, 1000);`,
              ],
            },
          },
        };

        const triggersToExecute = [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[3]}`];
        return { triggersToExecute, triggersToUpdate };
      } else if (reqData.type === 'TRANS_BTN') {
        const webResponse = JSON.parse(reqData.internalResponse);
        const isLastPage = webResponse['PAGE_NUMBER'] == undefined;
        let data: any = this.htmlToJSON(reqData.internalResponse);
        const pageNumber = isLastPage ? 1 : data[data.length - 4];
        const pageText = isLastPage ? '1' : pageNumber['0']['0']['text'];
        const parts = pageText.split(' ');
        const currPageNumber = isLastPage ? '1' : parts[1];
        const totalPageNumber = isLastPage ? '1' : parts[3];
        const transactions = [];

        data = data.filter(
          (el) => el['0'] != null && el['0']?.['text'] != null,
        );
        data = data.map((el) => el['0']['text']);
        for (let i = 0; i < data.length; i += 10) {
          const transactionData = data.slice(i, i + 10);
          const transactionObject = this.createTransactionObjectForFederal(
            transactionData,
            reqData,
          );
          transactions.push(transactionObject);
        }
        const allTransactions = (reqData.allTransactions ?? []).concat(
          transactions,
        );
        const triggersToUpdate = {
          'https://www.fednetbank.com/corp/Finacle': {
            allowContains: true,
            consoles: [
              {
                combinations: ['CLICKED->DATE_RANGE_BTN'],
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
                        bankCode: bankCodes.FEDERAL,
                        step: 7,
                        subStep: +currPageNumber,
                        totalSubStep: +totalPageNumber,
                      },
                    },
                  },
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      address: reqData?.address,
                      name: reqData?.name,
                      accountNumber:
                        reqData?.accountNumber ?? reqData?.accountId,
                      branchCode: reqData?.branchCode,
                      allTransactions,
                      bankCode: bankCodes.FEDERAL,
                      type: 'TRANS_BTN',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              triggers: [
                `var transactionTable = setInterval(() => {
                  try {
                    if(document.getElementById("TransactionsMade")) {
                      clearInterval(transactionTable);
                      console.log(JSON.stringify({
                        "CLICKED->DATE_RANGE_BTN": document.getElementById("TransactionsMade").innerHTML,
                        "PAGE_NUMBER": document.querySelector('ul.pagination')?.innerHTML,
                      }));
                    }
                  } catch (error) {}
                }, 1000);`,
              ],
            },
          },
        };

        let loaderPerc = `LITT_SKIP_JS_LOADER_PERC_${totalSteps[4]}`;
        // Increment the loader percentage based on pagination value so user can wait longer
        if (+currPageNumber < +totalPageNumber) {
          const paginationPerc = Math.floor(
            (+currPageNumber * 100) / +totalPageNumber,
          );
          loaderPerc = `LITT_SKIP_JS_LOADER_PERC_${
            totalSteps[4] +
            Math.floor(((100 - totalSteps[4]) * paginationPerc) / 100)
          }`;
        }
        let triggersToExecute = [
          `${loaderPerc}`,
          `var nextClick = setInterval(() => {
            try {
              if(document.getElementById("Action.OpTransactionListingTpr.GOTO_NEXT__")) {
                clearInterval(nextClick);
                document.getElementById("Action.OpTransactionListingTpr.GOTO_NEXT__").click();
              }
            } catch (error) {}
          }, 2000);`,
        ];
        // All transactions are fetched successfully !
        if (currPageNumber == totalPageNumber) {
          const callbackList = [
            {
              url: nSyncTransactions,
              method: 'POST',
              body: {
                bankCode: bankCodes.FEDERAL,
                webResponse: {
                  profile: {
                    accountNumber: reqData?.accountNumber,
                    inAppService: true,
                    bankCode: bankCodes.FEDERAL,
                    name: reqData?.name,
                    ifscCode: reqData?.branchCode,
                    ifscode: reqData?.branchCode,
                    ccDetails: {},
                  },
                  transactions: allTransactions,
                },
              },
            },
            {
              url: nInsertLog,
              method: 'POST',
              body: {
                loanId: reqData.loanId,
                userId: reqData.userId,
                type: 1,
                subType: 1,
                status: 3,
                values: { bankCode: bankCodes.FEDERAL, step: 8 },
              },
              needWebResponse: false,
            },
          ];
          return { callbackList };
        }
        return { triggersToExecute, triggersToUpdate };
      } else if (reqData.type === 'TABLE_FETCH_DIFF_URL') {
        // we have to fetch all details here
        const data = await this.findTuneTransaction(reqData);

        const triggersToUpdate = {
          'https://www.fednetbank.com/prod/statementnew/': {
            allowContains: true,
            consoles: [
              {
                combinations: ['TABLE_DATA'],
                apiTriggers: [
                  {
                    url: nNetbankingTriggers,
                    method: 'POST',
                    body: {
                      address: reqData?.address,
                      name: reqData?.name,
                      accountNumber: reqData?.accountNumber,
                      branchCode: reqData?.branchCode,
                      bankCode: bankCodes.FEDERAL,
                      type: 'TABLE_FETCH_DIFF_URL',
                      loanId: reqData?.loanId,
                      userId: reqData?.userId,
                    },
                  },
                ],
              },
            ],
            onLoadStop: {
              triggers: [
                `
                var tableFound = setInterval(() => {
                  try{
                    if(document.getElementById('DataTables_Table_0_wrapper')) {
                      console.log('TABLE_DATA' + document.getElementById('DataTables_Table_0_wrapper').innerText);
                      clearInterval(tableFound);
                    }
                  }catch (error) {}
                }, 1000);
                `,
              ],
            },
          },
        };

        const triggersToExecute = [
          `
          var nextClick = setInterval(() => {
            try{
              if(document.getElementById('DataTables_Table_0_next')) {
                document.getElementById('DataTables_Table_0_next').click();
                clearInterval(nextClick);
              }
            }catch (error) {}
          }, 750);
        `,
        ];
        return { triggersToExecute, triggersToUpdate };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private findTuneTransaction(reqData) {
    const data = reqData?.internalResponse;
    const finalData = data.replace(/\bTABLE_DATA\b/g, '');
    console.log('finalData', finalData);
  }

  private createTransactionObjectForFederal(transactionData, reqData) {
    const transactionObject = new TransactionJSON();

    transactionObject.bank = bankCodes.FEDERAL;
    transactionObject.amount = +transactionData[8].replace(/,/g, '');
    transactionObject.balanceAfterTransaction = +transactionData[9].replace(
      /,/g,
      '',
    );
    const typeValue = transactionData[7];
    transactionObject.type =
      typeValue[0].toLowerCase() == 'c' ? 'CREDIT' : 'DEBIT';
    transactionObject.description = transactionData[3];
    transactionObject.dateTime = this.dateService.anyToDateStr(
      transactionData[1],
    );
    transactionObject.accountId = reqData?.accountId ?? reqData?.accountNumber;

    return transactionObject;
  }
  //#endregion FEDERAL

  //#region SBI
  // SBI -> Initial webview data
  getSBINetbankingData(reqData) {
    return {
      title: 'Verify your bank',
      initialURL: 'https://retail.onlinesbi.sbi/retail/login.htm',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://retail.onlinesbi.sbi/retail/profilepwdotpconfirm.htm': {
          onLoadStart: { state: { isProcessing: true } },
          onLoadStop: {
            triggers: ["javascript: callURL('/retail/accountstatement.htm');"],
          },
        },
        'https://retail.onlinesbi.sbi/retail/loginotpsfa.htm': {
          onLoadStart: { state: { isProcessing: true } },
        },
        'https://retail.onlinesbi.sbi/retail/mypage.htm': {
          onLoadStart: { state: { isProcessing: true } },
          onLoadStop: {
            triggers: ["javascript: callURL('/retail/accountstatement.htm');"],
          },
        },
        'https://retail.onlinesbi.sbi/retail/login.htm': {
          consoles: [
            // Step -> 01 -> Page loads
            {
              combinations: ['METRICS->01'],
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
                    values: { bankCode: 'SBI', step: 1 },
                  },
                },
              ],
            },
            // Fetching HTML
            // this.periodicFetchConsoleData(reqData),
          ],
          onLoadStop: {
            state: { isLoader: false },
            triggers: [
              `const elems = document.getElementsByTagName("a"); for(let index = 0; index < elems.length; index++) { if(elems[index].innerText == 'CONTINUE TO LOGIN') { elems[index].click();  break;  } }`,
              'document.getElementsByClassName("navbar-header")[0].remove();',
              'document.getElementsByTagName("img")[4].remove();',
              `console.log("METRICS->01")`,
              this.JS_TRIGGERS.PERIODIC_HTML_FETCH,
            ],
          },
        },
        'https://retail.onlinesbi.sbi/retail/myaccountsandprofilelanding.htm': {
          onLoadStart: { state: { isProcessing: true } },
          onLoadStop: {
            triggers: ["javascript: callURL('/retail/accountstatement.htm');"],
          },
        },
        'https://retail.onlinesbi.sbi/retail/accountstatement.htm': {
          onLoadStop: {
            triggers: [
              `async function countAccount(){
                let n=document.getElementById("tblAcctd").children,t=n.item(n.length-1);
                console.log(JSON.stringify({accountHTML:t.innerHTML}))
              }
              countAccount();`,
              `console.log("METRICS->02");`,
              this.JS_TRIGGERS.PERIODIC_HTML_FETCH,
            ],
          },
          consoles: [
            // this.periodicFetchConsoleData(reqData),
            // Step -> 02 -> Count total number of accounts
            {
              combinations: ['METRICS->02'],
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
                    values: { bankCode: 'SBI', step: 2 },
                  },
                },
              ],
            }, // Step -> 03 -> Select date range from dropdown
            {
              combinations: ['METRICS->03'],
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
                    values: { bankCode: 'SBI', step: 3 },
                  },
                },
              ],
            },
            {
              combinations: ['accountHTML'],
              apiTriggers: [
                {
                  url: nPrepareWebViewData,
                  method: 'POST',
                  body: {
                    bankCode: 'SBI',
                    loanId: reqData.loanId,
                    userId: reqData.userId,
                    type: 'TRANS_FETCH',
                  },
                },
              ],
            },
          ],
        },
      },
    };
  }

  //#region Utils
  private periodicFetchConsoleData(reqData) {
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

  private JS_TRIGGERS = {
    PERIODIC_HTML_FETCH: `setInterval(()=> {
      try {
        const dateStr = new Date().toJSON();
        console.log(dateStr + "PERIODIC_HTML_FETCH ->" +  document.documentElement.innerHTML);
      } catch (error) {} }, 10000);`,
  };

  // Get IFSC details from google and razorpay
  async fetchIFSCFromBranchName(branchName: string, bankName) {
    const params = {
      q: `${bankName} branch CODE FOR ` + branchName + ' RAZORPAY',
    };
    const response = await this.api.get(nGoogleSearch, params);
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
  //#endregion Utils

  async prepareWebviewData(reqData) {
    // Params validation
    const bankCode = reqData.bankCode;
    if (!bankCode) return kParamMissing('bankCode');
    let isBankCodeFound = false;
    for (const key in bankCodes) {
      const value = bankCodes[key];
      if (bankCode == value) {
        isBankCodeFound = true;
        break;
      }
    }
    if (!isBankCodeFound) return k422ErrorMessage('Invalid bankCode');
    const type = reqData.type;
    if (!type) return kParamMissing('type');
    let webResponse = reqData.webResponse;
    if (!webResponse) webResponse = reqData.internalResponse;
    if (!webResponse) return kParamMissing('webResponse');
    let preparedData = {};
    switch (bankCode) {
      // IDFC
      case bankCodes.IDFC:
        preparedData = this.prepareIDFCFlow(reqData);
        break;
      // SBI
      case bankCodes.SBI:
        preparedData = this.prepareSBIFlow(webResponse, reqData);
        break;
      //ICICI
      case bankCodes.ICICI:
        preparedData = this.prepareICICIFlow(reqData);
        break;

      default:
        break;
    }
    return preparedData;
  }

  // IDFC -> Profile fetch
  private prepareIDFCFlow(reqData) {
    // Transaction
    if (reqData.type == 'TRANS_FETCH') {
      // Params validation
      const webResponse = reqData.webResponse;
      let tokenDetails = webResponse.tokenDetails;
      if (!tokenDetails) return kParamMissing('tokenDetails');
      tokenDetails = JSON.parse(tokenDetails);
      const accessToken = tokenDetails.access_token;
      if (!accessToken) return kParamMissing('access_token');
      const encIdToken = tokenDetails.enc_id_token;
      if (!encIdToken) return kParamMissing('enc_id_token');
      let accountDetails = webResponse.accountDetails;
      if (!accountDetails) return kParamMissing('accountDetails');
      accountDetails = JSON.parse(accountDetails);
      delete accountDetails.Permission;
      const accData = (accountDetails.Accounts?.AccountList ?? [])[0];

      const today = this.typeService.getGlobalDate(new Date());
      const periodTo = today.toJSON().substring(0, 10);
      let periodFromDate = new Date(today);
      periodFromDate.setDate(periodFromDate.getDate() - 120);
      const periodFrom = periodFromDate.toJSON().substring(0, 10);

      const totalSteps = this.getRelevantLoaderSteps(5);

      const triggersToUpdate = {
        'https://my.idfcfirstbank.com': {
          allowContains: true,
          consoles: [
            {
              combinations: ['METRICS->3'],
              apiTriggers: [
                {
                  url: nInsertLog,
                  method: 'POST',
                  body: {
                    loanId: reqData.loanId,
                    userId: reqData.userId,
                    type: 1,
                    subType: 1,
                    status: 2,
                    values: { bankCode: bankCodes.IDFC, step: 4 },
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
            },
            {
              combinations: ['GOT_TRANSACTIONS'],
              apiTriggers: [
                {
                  url: PRIMARY_BANKINGPRO_URL + 'transaction/syncData',
                  method: 'POST',
                  body: {
                    accData: JSON.stringify(accData),
                    bankCode: bankCodes.IDFC,
                  },
                },
                {
                  url: nInsertLog,
                  method: 'POST',
                  body: {
                    loanId: reqData.loanId,
                    userId: reqData.userId,
                    type: 1,
                    subType: 1,
                    status: 2,
                    values: { bankCode: bankCodes.IDFC, step: 5 },
                  },
                },
              ],
              // jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[3]}`],
            },
          ],
        },
      };
      const triggersToExecute = [
        `console.log("METRICS->3")`,
        `async function execute() {
          const headers = {Authorization: "Bearer ${accessToken}", "x-requested-with": "XMLHttpRequest", "enc-id-token": "${encIdToken}" }
          const body = { accountNumbers: ["${accData.AccountNumber}"], periodFrom: "${periodFrom}", periodTo: "${periodTo}"}
          const options = { method: 'POST', headers, body: JSON.stringify(body) }
          const response1 = await fetch("https://app.my.idfcfirstbank.com/api/pfm/v2/transactions", options);
          let transactions = await response1.json();
          transactions = JSON.stringify(transactions);
          console.log("GOT_TRANSACTIONS" + transactions);
        }
        execute();`,
      ];
      return { triggersToUpdate, triggersToExecute };
    }
  }

  private async prepareSBIFlow(webResponse, reqData) {
    if (typeof webResponse == 'string') webResponse = JSON.parse(webResponse);
    // Collects all possible bank accounts
    if (webResponse.accountHTML) {
      const targetStr: string = webResponse.accountHTML
        .replace(/\n/g, '')
        .replace(/\t/g, '')
        .trim();
      const count = targetStr.split('<tr id="dr').length - 1;

      const triggersToUpdate = {
        'https://retail.onlinesbi.sbi/retail/statementbydate.htm': {
          onLoadStop: {
            triggers: [
              `function capture(){
                let e=document.querySelector('.table.table-hover.table-bordered.content_table').children.item(0).innerText,
                t=document.querySelector('.table.table-hover.table-bordered.content_table.table-striped').children.item(1).innerHTML;
                console.log(JSON.stringify({profile:e,transactions:t}))
              }capture();`,
            ],
          },
          consoles: [
            {
              combinations: ['profile', 'transactions'],
              apiTriggers: [
                // Step -> 04 -> Account profile and transactions are fetched in APP
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
                    values: { bankCode: 'SBI', step: 4 },
                  },
                },
                {
                  url: nPrepareWebViewData,
                  method: 'POST',
                  body: {
                    internalIndex: 0,
                    totalInternalIndex: count - 1,
                    bankCode: bankCodes.SBI,
                    type: 'TRANS_FETCH',
                  },
                },
              ],
            },
          ],
        },
      };
      const triggersToExecute = [
        `console.log('METRICS->03'); 
        async function main(){
          let t=document.getElementById('tblAcctd').children,
          e=t.item(t.length-1);e.children.dr0.click(),
          await new Promise(t=>setTimeout(t,1e3)),
          document.getElementById('last6month').click(),
          await new Promise(t=>setTimeout(t,4e3));
          javascript:submitViewStatementRetail()
        }
        main();`,
      ];

      return { triggersToUpdate, triggersToExecute };
    }
    // Pagination
    else if (reqData.internalIndex != null) {
      // Pagination ends
      if (reqData.internalIndex == reqData.totalInternalIndex) {
        // Details for all accounts (profile and transactions both)
        const transList = reqData.transList ?? [];
        transList.push(webResponse);
        // Checks whether the length is correct or not
        const accDetails = this.fineTuneSBIUserProfile(webResponse.profile);
        let targetIndexTransactions = this.fineTuneSBITransactions(
          webResponse.transactions,
          accDetails,
        );
        const dateRangeAttempt = reqData?.dateRangeAttempt ?? 1;
        // Step #05
        if (targetIndexTransactions?.length >= 299 && dateRangeAttempt < 3) {
          targetIndexTransactions = targetIndexTransactions.sort(
            (b, a) => a.dateTime.getTime() - b.dateTime.getTime(),
          );
          const prevExistTransList =
            (reqData.accWiseTransactions ?? {})[accDetails.accountNumber] ?? [];
          targetIndexTransactions =
            targetIndexTransactions.concat(prevExistTransList);
          const latestTransaction = targetIndexTransactions[0];
          const todayInfo = this.dateService.dateToReadableFormat(
            this.typeService.getGlobalDate(new Date()),
            'DD/MM/YYYY',
          );
          const lastDateInfo = this.dateService.dateToReadableFormat(
            this.typeService.getGlobalDate(latestTransaction.dateTime),
            'DD/MM/YYYY',
          );
          const triggersToUpdate = {
            'https://retail.onlinesbi.sbi/retail/accountstatement.htm': {
              onLoadStop: {
                triggers: [
                  `async function main() {
                   let t = document.getElementById("tblAcctd").children,
                   e = t.item(t.length - 1);
                   e.children.dr${reqData.internalIndex}.click(),
                   await new Promise((t) => setTimeout(t, 1e3)),
                   (document.getElementById("datepicker1").value = "${lastDateInfo.readableStr}");
                   document.getElementById("datepicker2").value = "${todayInfo.readableStr}";
                   await new Promise((t) => setTimeout(t, 1e3));
                   javascript: submitViewStatementRetail(); } main();`,
                ],
              },
            },
            'https://retail.onlinesbi.sbi/retail/statementbydate.htm': {
              onLoadStop: {
                triggers: [
                  `function capture(){
                    let e=document.querySelector('.table.table-hover.table-bordered.content_table').children.item(0).innerText,
                    t=document.querySelector('.table.table-hover.table-bordered.content_table.table-striped').children.item(1).innerHTML;
                    console.log(JSON.stringify({profile:e,transactions:t}))
                  }capture();`,
                ],
              },
              consoles: [
                {
                  combinations: ['profile', 'transactions'],
                  apiTriggers: [
                    {
                      url: nPrepareWebViewData,
                      method: 'POST',
                      body: {
                        internalIndex: reqData.internalIndex,
                        totalInternalIndex: reqData.totalInternalIndex,
                        bankCode: bankCodes.SBI,
                        type: 'TRANS_FETCH',
                        dateRangeAttempt: dateRangeAttempt + 1,
                        // Account number wise profile
                        accWiseProfile: {
                          ...(reqData.accWiseProfile ?? {}),
                          [accDetails.accountNumber]: accDetails,
                        },
                        // Account number wise transactions
                        accWiseTransactions: {
                          ...(reqData.accWiseTransactions ?? {}),
                          [accDetails.accountNumber]: targetIndexTransactions,
                        },
                      },
                    },
                  ],
                },
              ],
            },
          };
          const triggersToExecute = [
            `javascript: callURL('/retail/accountstatement.htm');`,
          ];

          return { triggersToUpdate, triggersToExecute };
        }
        // Step #08 -> Predict primary account
        if (
          reqData.accWiseTransactions ||
          (targetIndexTransactions?.length < 299 && dateRangeAttempt < 3)
        ) {
          let maxTransactions = 0;
          let primaryAccNumber = null;
          let accWiseTransactions = reqData?.accWiseTransactions ?? {};
          let accWiseProfile = reqData?.accWiseProfile ?? {};

          if (!accWiseTransactions[accDetails.accountNumber]) {
            accWiseTransactions[accDetails.accountNumber] =
              targetIndexTransactions;
          } else {
            accWiseTransactions[accDetails.accountNumber] = accWiseTransactions[
              accDetails.accountNumber
            ].concat(targetIndexTransactions);
          }

          if (!accWiseProfile[accDetails.accountNumber]) {
            accWiseProfile[accDetails.accountNumber] = accDetails;
          }

          // Determine the account with the maximum transactions
          for (const key in accWiseTransactions) {
            try {
              const transList = accWiseTransactions[key];
              if (transList.length >= maxTransactions) {
                maxTransactions = transList.length;
                primaryAccNumber = key;
              }
            } catch (error) {}
          }
          // Proceed with the predicted primary account details
          return await this.api.post(nSyncTransactions, {
            webResponse: {
              profile: accWiseProfile[primaryAccNumber],
              transactions: accWiseTransactions[primaryAccNumber],
            },
            bankCode: bankCodes.SBI,
          });
        } else return kInternalError;
      }
      // In between pagination
      else if (reqData.internalIndex < reqData.totalInternalIndex) {
        const triggersToUpdate = {
          'https://retail.onlinesbi.sbi/retail/accountstatement.htm': {
            onLoadStop: {
              triggers: [
                `async function main(){
                  let t=document.getElementById('tblAcctd').children,
                  e=t.item(t.length-1);
                  e.children.dr${reqData.internalIndex + 1}.click(),
                  await new Promise(t=>setTimeout(t,1e3)),
                  document.getElementById('last6month').click(),
                  await new Promise(t=>setTimeout(t,1e3));
                  javascript:submitViewStatementRetail()
                }main();`,
              ],
            },
          },
          'https://retail.onlinesbi.sbi/retail/statementbydate.htm': {
            onLoadStop: {
              triggers: [
                "function capture(){let e=document.querySelector('.table.table-hover.table-bordered.content_table').children.item(0).innerText,t=document.querySelector('.table.table-hover.table-bordered.content_table.table-striped').children.item(1).innerHTML;console.log(JSON.stringify({profile:e,transactions:t}))}capture();",
              ],
            },
            consoles: [
              {
                combinations: ['profile', 'transactions'],
                apiTriggers: [
                  {
                    url: nPrepareWebViewData,
                    method: 'POST',
                    body: {
                      internalIndex: reqData.internalIndex + 1,
                      totalInternalIndex: reqData.totalInternalIndex,
                      bankCode: bankCodes.SBI,
                      type: 'TRANS_FETCH',
                    },
                  },
                ],
              },
            ],
          },
        };
        const triggersToExecute = [
          `javascript: callURL('/retail/accountstatement.htm');`,
        ];

        return { triggersToUpdate, triggersToExecute };
      }
    }

    return {};
  }

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

  // SBI User Details
  private fineTuneSBIUserProfile(rawProfile) {
    // Returns pre-extracted details
    if (rawProfile?.accountNumber && rawProfile?.inAppService)
      return rawProfile;

    const profile = {
      accountNumber: null,
      inAppService: true,
      bankCode: bankCodes.SBI,
      name: null,
      ifscCode: null,
      ifscode: null,
      ccDetails: {},
    };

    const splittedSpans = rawProfile.split('\n');
    splittedSpans.forEach((el: string, index) => {
      try {
        el = el.replace(/\t/g, '');
        // Account number
        if (index == 0 && !profile.accountNumber) {
          if (el.startsWith('Account Number'))
            profile.accountNumber = el.replace('Account Number', '').trim();
        }
        // Name
        if (
          index > 4 &&
          index < 10 &&
          el.startsWith('Account Name') &&
          !profile.name
        ) {
          profile.name = el.replace('Account Name', '').trim();
        } else if (
          !profile.ifscCode &&
          index > 5 &&
          el.startsWith('IFS (Indian Financial System) Code')
        ) {
          profile.ifscCode = el
            .replace('IFS (Indian Financial System) Code', '')
            .trim();
          profile.ifscode = el
            .replace('IFS (Indian Financial System) Code', '')
            .trim();
        }
      } catch (error) {}
    });

    return profile;
  }

  // SBI -> Transaction details
  private fineTuneSBITransactions(transactions, accountDetails) {
    // Returns the pre-extracted transactions
    if (Array.isArray(transactions)) return transactions;

    // Extract transactions from html
    transactions = '<table>' + transactions + '</table>';
    const htmlData = this.htmlToJSON(transactions);
    const targetTables = htmlData.filter((el) => el.tag == 'table');
    const trData = targetTables[0]['1'];

    const finalizedTransactions = [];
    for (const key in trData) {
      try {
        const rawValue = trData[key];
        const totalKeys = Object.keys(rawValue);

        // Tr
        const transData: TransactionJSON = {
          accountId: accountDetails.accountNumber,
        };
        for (let index = 0; index < totalKeys.length; index++) {
          try {
            const subKey = totalKeys[index];
            const targetValue = rawValue[subKey];
            if (typeof targetValue == 'string') continue;
            if (!targetValue['0'] && !targetValue['text']) continue;
            let textData = (targetValue['text'] ?? targetValue['0'] ?? {}).text;
            textData = textData.replace(/\t/g, '').replace(/\n/g, '').trim();
            if (textData?.length <= 1) continue;
            if (index == 6) continue;

            // Date time
            if (index == 1 && !transData.dateTime) {
              transData.dateTime = this.dateService.anyToDate(textData);
            }
            // Narration
            else if (index == 3 && !transData.description)
              transData.description = textData;
            // Balance after transaction
            else if (index == 15 && !transData.balanceAfterTransaction)
              transData.balanceAfterTransaction = +textData.replace(/,/g, '');
            // Amount credit
            else if (index == 13 && !transData.type) {
              transData.amount = +textData.replace(/,/g, '');
              transData.type = 'CREDIT';
            }
            // Amount debit
            else if (index == 11 && !transData.type) {
              transData.amount = +textData.replace(/,/g, '');
              transData.type = 'DEBIT';
            }
          } catch (error) {}
        }
        if (transData.amount) finalizedTransactions.push(transData);
      } catch (error) {}
    }

    return finalizedTransactions;
  }

  // ICICI -> Profile fetch
  private prepareICICIFlow(reqData) {
    // Params validation
    let webResponse = reqData.internalResponse;
    if (typeof webResponse == 'string') webResponse = JSON.parse(webResponse);
    const profile = webResponse.profile;
    if (!profile) return kParamMissing('profile');

    const profileData = this.fineTuneICICIUserProfile(profile, webResponse);
    const totalSteps = this.getRelevantLoaderSteps(6);
    const triggersToUpdate = {
      'https://infinity.icicibank.com/corp/Finacle': {
        allowContains: true,
        onLoadStop: {
          triggers: [
            `!(function () {
              try {
                  const buttonChecker = setInterval(() => {
                      console.log("running buttonChecker");
                      if (!document.getElementById("outerTab")["Action.VIEW_TRANSACTION_HISTORY"]) return;
                      clearInterval(buttonChecker);
                      document.getElementById("outerTab")["Action.VIEW_TRANSACTION_HISTORY"].click();
                      console.log("LOADER-> #03");
                  }, 1e3);
              } catch (error) {}
          })();`,

            `(async function () {
                let transactionPeriodClicked = false;
                
                const radioButtons = document.getElementsByName("SELECTED_RADIO_INDEX");
                for (const e of radioButtons) {
                    if (e.title === "Transaction Period") {
                        e.click();
                        transactionPeriodClicked = true;
                        break;
                    }
                }

                if (transactionPeriodClicked) {
                    document.TransactionHistoryFG["TransactionHistoryFG.TXN_PERIOD"].value = "05";
                    document.TransactionHistoryFG["Action.LOAD_HISTORY"].click();
                }

                const checkSixMonthsSelected = setInterval(() => {
                    const sixMonths = document.evaluate(
                        "//div[text()='Last 6 Months']",
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    ).singleNodeValue;

                    if (sixMonths) {
                        sixMonthsSelected = true;
                        clearInterval(checkSixMonthsSelected);
                        console.log("LOADER-> #04");
                        fetchTransactionData();
                    }
                }, 1000);

                async function fetchTransactionData() {
                    const transactionData = {
                        step: "TRANSACTION",
                        status: "PENDING",
                        transactions: "",
                    };

                    const transactionInterval = setInterval(async () => {
                        const api = document.TransactionHistoryFG.action;
                        if (api) {
                            clearInterval(transactionInterval);

                            const response = await fetch(api, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    Cookie: encodeURIComponent(document.cookie),
                                },
                                body: new URLSearchParams({
                                    'TransactionHistoryFG.OUTFORMAT': '5',
                                    'Action.GENERATE_REPORT': 'OK',
                                    FORMSGROUP_ID__: 'TransactionHistoryFG',
                                    'TransactionHistoryFG.REPORTTITLE': 'OpTransactionHistoryTpr',
                                }),
                            });
                            console.log("LOADER-> #05");
                            let arrayBuffer = await response.arrayBuffer();
                            let binary = '';
                            let bytes = new Uint8Array(arrayBuffer);
                            let len = bytes.byteLength;
                            for (let i = 0; i < len; i++) {
                              binary += String.fromCharCode(bytes[i]);
                            }
                            let base64Str = window.btoa(binary);
                            transactionData.transactions = base64Str;
                            transactionData.status = "COMPLETED";
                            console.log(JSON.stringify(transactionData));
                        }
                    }, 1000);
                }
            })();
          `,
          ],
        },
        consoles: [
          {
            // Metrics #03
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
                  values: { bankCode: 'ICICI', step: 3 },
                },
              },
            ],
            // Loader #03
            combinations: ['LOADER-> #03'],
            jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[2]}`],
          },
          {
            // Metrics #04
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
                  values: { bankCode: 'ICICI', step: 4 },
                },
              },
            ], // Loader #04
            combinations: ['LOADER-> #04'],
            jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[3]}`],
          },
          {
            // Metrics #05
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
                  values: { bankCode: 'ICICI', step: 5 },
                },
              },
            ],
            // Loader #05
            combinations: ['LOADER-> #05'],
            jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[4]}`],
          },
          {
            combinations: ['TRANSACTION', 'COMPLETED'],
            apiTriggers: [
              // Metrics #06
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
                  values: { bankCode: 'ICICI', step: 6 },
                },
              },
              {
                url: nConvertBase64ToPdf,
                method: 'POST',
                body: {
                  bankCode: bankCodes.ICICI,
                  loanId: reqData.loanId,
                  userId: reqData.userId,
                  accData: profileData,
                },
                needWebResponse: true,
              },
            ],
            // Loader #06
            jsTriggers: [`LITT_SKIP_JS_LOADER_PERC_${totalSteps[5]}`],
          },
        ],
      },
    };

    const triggersToExecute = [
      `document.getElementById("Action.OK_CLICKED__[1]").click();`,
    ];
    return { triggersToExecute, triggersToUpdate };
  }

  // ICICI -> Profile details
  private fineTuneICICIUserProfile(rawProfile, webResponse) {
    // Returns pre-extracted details
    if (rawProfile?.accountNumber && rawProfile?.inAppService)
      return rawProfile;

    const profile = {
      accountNumber: '',
      inAppService: true,
      bankCode: bankCodes.ICICI,
      name: null,
      ifscCode: '',
      ifscode: '',
      ccDetails: {},
    };
    profile.accountNumber = webResponse.account.split('(')[0].trim();

    const spans = rawProfile.split('\n').filter((el) => el.length > 1);
    for (let index = 0; index < spans.length; index++) {
      try {
        const el = spans[index];
        // Account name
        if (spans[index - 1].toLowerCase() == 'account name') {
          if (!profile.name) profile.name = el.trim();
        }
        // IFSC code
        if (spans[index - 1].toLowerCase() == 'ifsc code') {
          if (!profile.ifscCode) profile.ifscCode = el.trim();
          if (!profile.ifscode) profile.ifscode = el.trim();
        }
      } catch (error) {}
    }

    return profile;
  }

  async convertBase64ToPdf(reqData) {
    const bankCode = reqData.bankCode;
    if (!bankCode) return kParamMissing('bankCode');
    let webResponse = reqData.internalResponse;
    if (typeof webResponse == 'string') webResponse = JSON.parse(webResponse);

    const userData = await this.repoManager.getRowWhereData(
      employmentDetails,
      ['companyName', 'salary'],
      { where: { userId: reqData.userId } },
    );
    if (!userData || userData == k500Error) throw new Error();
    const pdfUrl = await this.fileService.base64ToURL(webResponse.transactions);
    const form = new FormData();
    const response = await axios.get(pdfUrl, { responseType: 'stream' });
    form.append('pdfFile', response.data, 'statements.pdf');
    form.append('bankCode', 'ICICI');
    form.append('companyName', userData.companyName);
    form.append('salary', userData.salary);
    let statementData = await this.api.post(
      nExtractData,
      form,
      {
        appId: kBankingProHeaders.appId,
        secretKey: kBankingProHeaders.secretKey,
      },
      null,
      null,
      null,
    );

    const validateEligibilityBody = {
      accountDetails: {
        accountNumber: statementData?.accountDetails?.accountNumber,
        bankCode: bankCodes.ICICI,
        inAppService: true,
        name: reqData?.accData?.name,
        ifscCode: reqData?.accData?.ifscCode,
        ifscode: reqData?.accData?.ifscode,
        ccDetails: {},
        bank: bankCodes.ICICI,
      },
      userId: reqData.userId,
      filePath: statementData.filePath,
    };

    return {
      callbackList: [
        {
          url: `${HOST_URL}${Latest_Version}/banking/validateEligibility`,
          method: 'POST',
          body: validateEligibilityBody,
          preTriggersToExecute: [`LITT_SKIP_JS_LOADER_PERC_100`],
        },
        {
          url: nInsertLog,
          method: 'POST',
          body: {
            loanId: reqData.loanId,
            userId: reqData.userId,
            type: 1,
            subType: 1,
            status: 3,
            values: { bankCode: bankCodes.ICICI, step: 7 },
          },
        },
      ],
    };
  }
}
