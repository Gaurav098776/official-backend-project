import { Injectable } from '@nestjs/common';
import { HOST_URL, Latest_Version } from 'src/constants/globals';
import { getCAMSBankStr, kGetOTPTriggers } from 'src/constants/objects';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { ResidenceSharedService } from 'src/shared/residence.service';

@Injectable()
export class WebviewServiceV3 {
  constructor(
    private readonly residenceSharedService: ResidenceSharedService,
  ) {}

  async validateResponse(data: any) {
    try {
      const type = data.type ?? data.source?.type ?? '';
      if (type == 'flipkartLogInCookie')
        return await this.residenceSharedService.handleFlipkartFlow(data);
      if (type == 'swiggyLogInCookie')
        return await this.residenceSharedService.handleSwiggyFlow(data);
      if (type == 'zomatoLogInCookie')
        return await this.residenceSharedService.handleZomatoFlow(data);
      if (type == 'cams')
        return await this.residenceSharedService.handleCamsFlow(data);
      if (type.includes('UIDAI'))
        return await this.residenceSharedService.handleUIDAIFlow(data);
      if (type == 'SUBSCRIPTION')
        return await this.residenceSharedService.handleSubscriptionFlow(data);
    } catch (error) {
      return kInternalError;
    }
  }

  async getOTPTriggers(queryData: any) {
    try {
      const rawData = queryData?.data ?? {};
      const otp = queryData?.otp ?? '';
      const type = queryData?.type ?? '';
      const tempData = queryData.tempData ?? {};
      const userId = queryData.userId ?? '';

      const jsTriggers = kGetOTPTriggers(otp, type);
      let data: any = [];
      if (jsTriggers) data.push(jsTriggers);
      if (type == 'cams') {
        data.push(
          'checkOTPValidation=document.getElementsByTagName("p")[5].innerText#Invalid OTP! Try again.#Invalid OTP! Try again.',
        );
        data.push('defaultSeconds=15');
        data.push('isProcessing=false');
        data.push(
          `Delayed=>5000, for(let index = 0; index < document.getElementsByTagName("tr").length; index++) { if (document.getElementsByTagName("tr")[index].innerText.includes("${getCAMSBankStr(
            rawData.bankCode,
          )}")) { document.getElementsByTagName("tr")[index].click(); } }`,
        );
        data.push(
          `Delayed=>5500, document.getElementsByTagName("button")[0].click();`,
        );
        data.push(
          "Delayed=>12000, document.getElementsByTagName('button')[0].innerText = 'Continue'; document.getElementsByTagName('button')[1].remove(); targetElement = document.getElementsByTagName('button')[0]; document.getElementsByTagName('section')[0].append(targetElement);",
        );
      } else if (type == 'flipkart')
        data.push(
          'Delayed=>1500,document.body.getElementsByTagName("button")[1].click();',
        );
      else if (type == 'UIDAI_FLOW') {
        const uid = await this.residenceSharedService.getAadhaarNumber(userId);
        const errorMsg = uid.message;
        if (errorMsg) return k422ErrorMessage(errorMsg);
        data = {
          callbackList: [
            {
              url: 'https://tathya.uidai.gov.in/downloadAadhaarService/api/aadhaar/download',
              urlMethod: 'POST',
              waitForCallbackResponse: true,
              callbackURL: HOST_URL + `${Latest_Version}/webview/validateResponse`,
              directSource: {
                mask: true,
                otp,
                otpTxnId: tempData.txnId,
                uid,
              },
              source: { type: 'UIDAI_DOWNLOAD' },
              needTempData: true,
            },
          ],
        };
      }

      return data;
    } catch (error) {
      return kInternalError;
    }
  }

  delay = (ms) => new Promise((res) => setTimeout(res, ms));
}
