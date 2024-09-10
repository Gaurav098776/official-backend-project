// Imports
import { Injectable } from '@nestjs/common';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { ContactSharedService } from 'src/shared/contact.service';

@Injectable()
export class ContactServiceV3 {
  constructor(private readonly sharedContacts: ContactSharedService) {}

  async syncCallLogs(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const callLogs = reqData.callLogs;
      if (!callLogs) return kParamMissing('callLogs');
      const result: any = await this.sharedContacts.syncCallLogsData(
        callLogs,
        userId,
      );
      if (result?.message) return result;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async syncContacts(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const contacts = reqData.contacts;
      if (!contacts) return kParamMissing('contacts');

      contacts.forEach((el) => {
        el.userId = userId;
      });

      const list: any = await this.sharedContacts.syncData(contacts);
      if (list.message) return list;
    } catch (error) {
      return kInternalError;
    }
  }
}
