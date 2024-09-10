import { Injectable } from '@nestjs/common';
import * as Mixpanel from 'mixpanel';
import { unescape } from 'querystring';
import { ADVID, MX_TOKEN, SHARCHAT_EVENT_URL } from 'src/constants/globals';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { APIService } from 'src/utils/api.service';
import { GoogleService } from '../google/google.service';

const mx = Mixpanel.init(MX_TOKEN);

@Injectable()
export class SharChatService {
  constructor(
    private readonly apiService: APIService,
    private readonly googleService: GoogleService,
  ) {}

  async sharChatPostback(body) {
    try {
      // Keeping logs in firebase for analysis
      const logRequest = {
        body,
        path: 'Logs/Mixpanel/ShareChat',
      };
      await this.googleService.addLogsToFirebase(logRequest);

      // Params validation
      const encStr = body?.referrer;
      const eventTime = body?.eventTime ? body?.eventTime : new Date().getTime();
      
      const eventName = body?.eventType;
      if (!encStr) return {};
      if (!eventTime) return {};
      if (!eventName) return {};

      const decStr = unescape(encStr).split('&');
      const obj: any = {};
      decStr.forEach((el) => {
        try {
          obj[el.split('=')[0]] = el.split('=')[1];
        } catch (error) {}
      });
      const clickId = obj?.clickId;
      const gaid = obj?.gaid;
      const utm_source = obj?.utm_source;
      const campaignName = obj?.campaignname;
      const adId = obj?.adId;
      const userId = obj?.userId;
      const installType = eventName == 'install' ? '&installType=0' : '';

      const params = `${ADVID}/post?clickId=${clickId}&gaid=${gaid}&campaignName=${campaignName}&adId=${adId}&userId=${userId}&EventTime=${eventTime}&eventName=${eventName}&eventValue=1${installType}`;
      const url = `${SHARCHAT_EVENT_URL}${params}`;
      if (utm_source == 'sharechat') await this.apiService.get(url);
      await mx.track(eventName, { utm_source });
      return true;
    } catch (error) {
      return kInternalError;
    }
  }
}
