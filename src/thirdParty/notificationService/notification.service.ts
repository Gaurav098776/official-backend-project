import { Injectable } from '@nestjs/common';
import * as FCM from 'fcm-node';
import { gIsPROD } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import admin from 'firebase-admin';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { kLspDevGmail } from 'src/constants/strings';

@Injectable()
export class NotificationService {
  fcm: any;
  constructor(
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly sharedNotification: SharedNotificationService,
  ) {
    this.fcm = new FCM(process.env.FCM_SERVER_KEY);
  }
  async sendPushNotification(
    fcmToken: any,
    title: string,
    body: string,
    data: any = {},
    needResponse = true,
    otherData: any = {},
  ) {
    try {
      if (!gIsPROD && process.env.NOTIFICATION_STATUS != 'TRUE')
        return kInternalError;
      if (typeof fcmToken == 'string') fcmToken = [fcmToken];
      let message: any = {
        registration_ids: fcmToken,
        notification: { title, body },
      };
      if (data) message.data = data;
      return await this.fcm.send(message, (err, res) => {
        if (needResponse) {
          const type = 'NOTIFICATION';
          const userId = otherData.userId;
          const loanId = otherData.loanId;
          const passData = { loanId, userId, res, type, err, title };
          this.saveNotificationStatus(passData);
        }
      });
    } catch (error) {}
  }

  async saveNotificationStatus(data) {
    try {
      let response: any = {};
      if (data.err) response = JSON.parse(data.err);
      else if (data.res) response = JSON.parse(data.res);

      let status = 'Process';
      if (response.success) status = 'Done';
      else if (response.failure) status = 'Reject';
      const refrenceId = response.multicast_id;

      const { userId, loanId, type } = data;
      const createData: any = {
        userId,
        loanId,
        status,
        type,
        refrenceId,
        title: data.title,
      };
      if (status == 'Reject') createData.subStatus = 'notSent';

      await this.mailTrackerRepo.create(createData);
    } catch (error) {
      return k500Error;
    }
  }

  async sendChatMsgToUser(data) {
    try {
      const userId = data?.userId;
      if (!userId)
        return k422ErrorMessage('Required parameter userId is missing');
      const message = data?.message;
      if (!message)
        return k422ErrorMessage('Required parameter message is missing');

      const chatDB = admin.firestore();
      await chatDB
        .collection('Chats')
        .doc(userId)
        .collection('Chats')
        .doc(new Date().toJSON())
        .set({ message, senderId: kLspDevGmail, type: 'MESSAGE' });

      await this.sharedNotification.sendNotificationToUser(data);
      return {};
    } catch (error) {
      return kInternalError;
    }
  }
}
