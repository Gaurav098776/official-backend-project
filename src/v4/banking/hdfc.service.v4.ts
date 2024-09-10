// Imports
import { Injectable } from '@nestjs/common';
import {
  nInsertLog,
  nNetbankingTriggers,
  nSyncTransactions,
} from 'src/constants/network';
import { DateService } from 'src/utils/date.service';
import { TransactionJSON } from './transaction.interface.v4';
import { commonNetBankingServiceV4 } from './common.netbanking.service.v4';

@Injectable()
export class HDFCBankingServiceV4 {
  constructor(
    private readonly dateService: DateService,
    private readonly commonNetbankingService: commonNetBankingServiceV4,
  ) {}

  getHDFCNetbankingData(reqData) {
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
      title: 'Verify your bank',
      initialURL: 'https://netbanking.hdfcbank.com/netbanking/',
      initialLoader: true,
      type: 'BANK',
      jsTriggers: {
        'https://netbanking.hdfcbank.com/netbanking/': {
          onLoadStop: {
            state: { isLoader: false },
            triggers: [
              `window.login_page.document.querySelectorAll("input + span > a")[0].style = 'display:none'
              var removed = 0;
                const loginPageElements = setInterval(() => {
                  const elements = window.login_page.document.getElementsByTagName("a");
                  const restrictedATags = ["Forgot Password / IPIN","Forgot Customer ID", "Credit Card only? Login here","Prepaid Card only ? Login here","Prepaid Card only? Login here", "HDFC Ltd. Home Loans? Login here","HDFC Ltd. Deposits? Login here","Retail Loan only? Login here", "Register Now", "Know More...", "Terms and Conditions", "Privacy Policy", "View a Demo", "Online Retail Loan only? Login here"];
                  for(let index = 0; index < elements.length; index++) {
                    try {
                        if (restrictedATags.includes(elements[index].innerText.trim())) {
                            elements[index].remove();
                        }
                    } catch (error) {}
                  }
                  removed++;
                setTimeout(() => {
                  clearInterval(loginPageElements);
                }, 60000);
              }, 250);
              `,
              `console.log("METRICS->01")`,
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
                    values: { bankCode: 'HDFC', step: 1 },
                  },
                },
              ],
            },
          ],
        },
        'https://netbanking.hdfcbank.com/netbanking/entry': {
          onLoadStop: {
            triggers: [
              this.mailingAddPopUpTrigger,
              `setInterval(()=> {
                try {
                  const dateStr = new Date().toJSON();
                  console.log(dateStr + "PERIODIC_HTML_FETCH ->" +  window.main_part.document.documentElement.innerHTML + window.location.href);
                } catch (error) {
                  console.log(dateStr + "PERIODIC_HTML_FETCH FAILED->" + error);
                 } }, 4000);`,
              `console.log("METRICS->02");
                  var loginPageElements = setInterval(() => {
                      const elements = document.getElementsByTagName("a");
                      const restrictedATags = ["Forgot Password / IPIN", "Forgot Customer ID", "Credit Card only? Login here", "Prepaid Card only ? Login here", "Prepaid Card only? Login here", "HDFC Ltd. Home Loans? Login here", "HDFC Ltd. Deposits? Login here", "Retail Loan only? Login here", "Register Now", "Know More...", "Terms and Conditions", "Privacy Policy", "View a Demo", "Online Retail Loan only? Login here"];
                      for (let index = 0; index < elements.length; index++) {
                          try {
                              if (restrictedATags.includes(elements[index].innerText.trim())) {
                                  console.log("stopProcessing");
                                  elements[index].remove();
                              }
                          } catch (error) {}
                      }
                  }, 250);
                const dateStr1 = new Date().toJSON();
                console.log(dateStr1 + "PERIODIC_HTML_FETCH ->" +  window.main_part.document.documentElement.innerHTML + window.location.href);
                const invalidPassword = () => {                  
                    for (let e of document.querySelectorAll("span") ?? []) {
                        if ("Your ID and IPIN do not match. Please try again" === e.innerText){
                          loginPageElements();
                            return setTimeout(() => {
                                console.log("stopProcessing");
                                console.log("WRONG_NAVIGATION->3");
                            }, 700);
                        }
                    }

                    for (let t of document.querySelectorAll("h1") ?? []) {
                        if ("More authentication needed!" === t.innerText)
                            return setTimeout(() => {
                                console.log("stopProcessing");
                            }, 700);
                    }
                };
                invalidPassword();
                const dateStr2 = new Date().toJSON();
                console.log(dateStr2 + "PERIODIC_HTML_FETCH ->" +  window.main_part.document.documentElement.innerHTML + window.location.href);
              console.log("METRICS->03");
               var loadedScreen = setInterval(() => {
                    try {
                        if (window.frames.main_part?.document.getElementById('SavingTotalSummary')) {
                            try {
                                console.log("startProcessing");
                                main();
                                clearInterval(loadedScreen);
                            } catch (error) {
                                console.log("Error in main execution->" + error);
                            }
                        }
                    } catch (error) {
                        console.log("Error in loadedScreen interval->" + error);
                    }
                }, 500);

                const main = () => {
                  let e = {
                          status: "PENDING",
                          accountNumber: "",
                          profile: "",
                          transactions: [],
                      },
                      t = (e) => {
                          let t = window.frames.main_part.document;
                          (0, window.frames.main_part).enablePeriod("T");
                          var n = window.frames.main_part.casaHostID[t.frmTxn.selAcct.selectedIndex];
                          return (
                              (t.frmTxn.fldAcctNo.value = e),
                              (t.frmTxn.fldScrnSeqNbr.value = "02"),
                              (t.frmTxn.fldTxnType.value =
                                  t.frmTxn.cmbTxnType.options[
                                      t.frmTxn.cmbTxnType.selectedIndex
                                  ].value),
                              (t.frmTxn.fldNbrStmt.value = "999"),
                              (t.frmTxn.fldAccType.value = "SCA"),
                              (t.frmTxn.fldFromDate.value = t.frmTxn.frmDatePicker.value),
                              (t.frmTxn.fldToDate.value = t.frmTxn.toDatePicker.value),
                              (t.frmTxn.fldFromDate.value = "${fromDateInfo.readableStr}"),
                              (t.frmTxn.fldToDate.value = "${todayDateInfo.readableStr}"),
                              console.log(new FormData(t.frmTxn).forEach((e) => console.log(e.toString()))),
                              t.frmTxn.submit(),
                              !1);
                      },
                      n = () => window.frames.left_menu,
                      r = () => window.frames.main_part,
                      a = (e) => new Promise((t) => setTimeout(t, e)),
                      l = setInterval(async () => {
                          console.log("runnig accountChecker");
                          let o = r().document;
                          if (!o.getElementById("SavingTotalSummary")) return;
                          clearInterval(l),
                              o.getElementById("SavingTotalSummary").click(),
                              (e.accountNumber = o
                                  .querySelector("span+a")
                                  .textContent.toString()
                                  .trim()),
                              o.querySelector("span+a").click(),
                              await a(6e3),
                              (o = r().document),
                              (e.profile = o.getElementsByName("frmTxn")[0].innerHTML),
                              n().document.getElementsByTagName("span")[0].click();
                          let c = setInterval(async () => {
                              console.log("runnig statementChecker");
                              let n = r().document;
                              if (!n.getElementById("SavingTotalSummary")) return;
                              clearInterval(c),
                                  n.getElementById("SavingTotalSummary").click(),
                                  n.querySelector(".viewBtnGrey").click(),
                                  await r(1200);
              
                              let k = setInterval(async () => {
                                  (n = r().document)
                                      .querySelectorAll("a").forEach(async (el) => {
                                          if (
                                              "Select Another Account / Period" === el.innerText) {
                                              clearInterval(k);
                                              el.click();
              
                                              let z = setInterval(async () => {
                                                  await a(1200),
                                                      (n = r().document),
                                                      await a(1e3),
                                                      t(e.accountNumber);
                                                  clearInterval(z);
                                                  let l = setInterval(() => {
                                                      (n = r().document),
                                                          console.log("running transactionsChecker"),
                                                          n.querySelector(".datatable") &&
                                                              (clearInterval(l),
                                                              (e.transactions =
                                                                  n.querySelector(
                                                                      ".datatable"
                                                                  ).innerHTML),
                                                              (e.status = "COMPLETED"),
                                                              console.log(JSON.stringify(e)));
                                                  }, 1e3);
                                              }, 1e3);
                                          }
                                      });
                              }, 1e3);
                          }, 1e3);
                      }, 1e3);
              };`,
            ],
          },
          allowAnyConsole: true,
          consoles: [
            this.commonNetbankingService.periodicFetchConsoleData(reqData),
            {
              combinations: ['CHECK IN '],
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
                    values: { bankCode: 'HDFC' },
                  },
                },
              ],
            },
            {
              combinations: ['ERROR IN '],
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
                    values: { bankCode: 'HDFC' },
                  },
                },
              ],
            },
            // Wrong navigation -> 03 -> Invalid password
            {
              combinations: ['WRONG_NAVIGATION->3'],
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
                      bankCode: 'HDFC',
                      errorMsg: 'INVALID_PASSWORD',
                    },
                  },
                },
              ],
            },
            // Step -> 02 -> Loading starts after authentication
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
                    values: { bankCode: 'HDFC', step: 2 },
                  },
                },
              ],
            },
            // Step -> 03 -> Account details fetching starts
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
                    values: { bankCode: 'HDFC', step: 3 },
                  },
                },
              ],
            },
            {
              combinations: ['status', 'COMPLETED'],
              apiTriggers: [
                {
                  url: nNetbankingTriggers,
                  method: 'POST',
                  body: {
                    bankCode: 'HDFC',
                    type: 'DETAILS_FOUND',
                    loanId: reqData.loanId,
                    userId: reqData.userId,
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
            {
              combinations: ['PERIODIC_HTML_FETCH FAILED->'],
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
                      bankCode: 'HDFC',
                      errorMsg: 'PERIODIC FETCH ERROR',
                    },
                  },
                },
              ],
            },
            {
              combinations: ['MAIN EXECUTION FAILED->'],
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
                      bankCode: 'HDFC',
                      errorMsg: 'MAIN EXECUTION FAILED',
                    },
                  },
                },
              ],
            },
          ],
        },
        'https://netportal.hdfcbank.com/nb-login/login.jsp': {
          onLoadStart: {
            triggers: [
              'window.open("https://netbanking.hdfcbank.com/netbanking/", "_self");',
              'console.log("WRONG_NAVIGATION->1");',
              'alert("Invalid Customer ID/ User ID")',
            ],
          },
          consoles: [
            {
              combinations: ['WRONG_NAVIGATION->1'],
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
                      bankCode: 'HDFC',
                      errorMsg: 'INVALID_USER_ID',
                    },
                  },
                },
              ],
            },
          ],
        },
        'https://netportal.hdfcbank.com/login': {
          onLoadStart: {
            triggers: [
              'window.open("https://netbanking.hdfcbank.com/netbanking/", "_self");',
              'console.log("WRONG_NAVIGATION->2");',
              'alert("Invalid Customer ID/ User ID")',
            ],
          },
          consoles: [
            {
              combinations: ['WRONG_NAVIGATION->2'],
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
                      bankCode: 'HDFC',
                      errorMsg: 'INVALID_USER_ID',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    };
  }

  private mailingAddPopUpTrigger = `var mailingAddCheck = setInterval(() => {
    try {
      var targetDoc =
        window?.main_part?.document ??
        window?.frames?.main_part?.document ??
        document;
      for (let t of targetDoc?.querySelectorAll('h1') ?? []) {
        try {
          if (
            t.innerText?.toLowerCase() == 'please confirm your contact details'
          ) {
            console.log(
              'CHECK IN mailingAddPopUpTrigger 4 At -> ' + new Date().toJSON(),
            );
            targetDoc?.getElementsByClassName('radioElement')[0].click();
            if (targetDoc?.getElementsByTagName('a')[2])
              targetDoc?.getElementsByTagName('a')[2].click();
            else if (targetDoc?.getElementsByTagName('a')[1])
              targetDoc?.getElementsByTagName('a')[1].click();
            console.log(
              'CHECK IN mailingAddPopUpTrigger 5 At -> ' + new Date().toJSON(),
            );
          } else if (t.innerText?.toLowerCase() == 'secure guidelines') {
            console.log(
              'CHECK IN mailingAddPopUpTrigger 6 At -> ' + new Date().toJSON(),
            );
            targetDoc.getElementsByClassName('checkboxElement')[0].click();
            targetDoc.getElementsByTagName('a')[2].click();
            console.log(
              'CHECK IN mailingAddPopUpTrigger 7 At -> ' + new Date().toJSON(),
            );
          } else {
            console.log(
              'CHECK IN mailingAddPopUpTrigger 3 At -> ' +
                new Date().toJSON() +
                t.innerText,
            );
          }
        } catch (error) {
          console.log(
            'ERROR IN mailingAddPopUpTrigger 1 At -> ' + new Date().toJSON(),
          );
        }
      }
    } catch (error) {
      console.log(
        'ERROR IN mailingAddPopUpTrigger 2 At -> ' + new Date().toJSON(),
      );
    }
  }, 5000);
  `;

  async kHDFCFlow(reqData: any) {
    if (reqData?.type === 'DETAILS_FOUND') {
      const data = JSON.parse(reqData?.internalResponse);
      const accountNumber = data?.accountNumber;
      const profile = await this.fineTuneHDFCUserProfile(data?.profile);
      const transactions = this.fineTuneHDFCTransactions(
        data?.transactions,
        accountNumber,
      );
      const callbackList = [
        {
          url: nSyncTransactions,
          method: 'POST',
          body: {
            bankCode: 'HDFC',
            webResponse: {
              profile,
              transactions,
            },
          },
        },
      ];
      return { callbackList };
    }
  }

  // HDFC -> Profile details
  private async fineTuneHDFCUserProfile(rawProfile: string) {
    const htmlData = this.commonNetbankingService.htmlToJSON(rawProfile);
    const targetTables = htmlData.filter((el) => el.tag == 'table');
    let name = targetTables[2]['1']['0']['1']['0'].text;
    let accountNumber = targetTables[1]['1']['0']['1']['1']['0'].text;
    const spans = accountNumber.split(',');

    const profile = {
      accountNumber: spans[0].trim(),
      inAppService: true,
      bankCode: 'HDFC',
      name: name.split(' (')[0],
      ifscCode: '',
      ifscode: '',
      ccDetails: {},
    };

    // Get IFSC details from google and razorpay
    const branchName = spans[1].trim();
    const ifscCode = await this.commonNetbankingService.fetchIFSCFromBranchName(
      branchName,
      'HDFC',
    );
    profile.ifscode = ifscCode;
    profile.ifscCode = ifscCode;
    return profile;
  }

  // HDFC -> Transaction details
  private fineTuneHDFCTransactions(rawTransactions: string, accountId) {
    rawTransactions = '<table>' + rawTransactions + '</table>';
    const htmlData = this.commonNetbankingService.htmlToJSON(rawTransactions);
    const targetTables = htmlData.filter((el) => el.tag == 'table');
    const trData = targetTables[0]['0'];

    const finalizedList = [];
    for (const rawKey in trData) {
      try {
        const rawData = trData[rawKey];
        const keys = Object.keys(rawData);
        const totalLength = keys.length;
        if (totalLength != 8) continue;
        const transData: TransactionJSON = { accountId };
        // Check tr individually
        for (let index = 0; index < totalLength; index++) {
          if (index == 7 || index == 3 || index == 2) continue;
          if (index > 0 && !transData.dateTime) continue;
          let value = rawData[index]['0'];
          if (!value.text) continue;
          value = value.text;

          // Date
          if (index == 0)
            transData.dateTime = this.dateService.anyToDateStr(value);
          // Narration
          else if (index == 1) transData.description = value;
          // Closing balance
          else if (index == 6)
            transData.balanceAfterTransaction = +value.replace(/,/, '').trim();
          // Amount and type
          else if (index == 4 || index == 5) {
            const amount = +value.replace(/,/, '').trim();
            if (amount != 0) {
              transData.amount = amount;
              transData.type = index == 4 ? 'DEBIT' : 'CREDIT';
            }
          }
        }

        if (transData.dateTime && transData.amount)
          finalizedList.push(transData);
      } catch (error) {}
    }
    return finalizedList;
  }
}
