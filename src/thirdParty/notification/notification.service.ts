import { Injectable } from '@nestjs/common';
import { gIsPROD } from 'src/constants/globals';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import admin from 'firebase-admin';
import * as FCM from 'fcm-node';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { UserRepository } from 'src/repositories/user.repository';
import { kInfoBrandName, kInfoBrandNameNBFC, kLspDevGmail } from 'src/constants/strings';
@Injectable()
export class NotificationService {
  fcm: any;
  constructor(
    private readonly sharedNotification: SharedNotificationService,
    private readonly userRepo: UserRepository,
  ) {
    this.fcm = new FCM(process.env.FCM_SERVER_KEY);
  }

  async sendChatMsgToUser(data) {
    try {
      if (!gIsPROD) return kInternalError;
      const userId = data?.userId;
      if (!userId)
        return k422ErrorMessage('Required parameter userId is missing');
      const message = data?.message;
      if (!message)
        return k422ErrorMessage('Required parameter message is missing');
      const userData = await this.userRepo.getRowWhereData(['appType'], {
        where: { id: userId },
      });
      const appType = userData?.appType;
      const appName = appType == 0 ? kInfoBrandName : kInfoBrandNameNBFC;
      const chatDB = admin.firestore();
      await chatDB
        .collection('Chats')
        .doc(userId)
        .collection('Chats')
        .doc(new Date().toJSON())
        .set({ message, senderId: kLspDevGmail, type: 'MESSAGE' });
      const body = {
        userList: [userId],
        title: `${appName} Support`,
        content: message,
      };
      await this.sharedNotification.sendNotificationToUser(body);
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  async sendNotificationToUser(userId: string, title, content, adminId?) {
    try {
      const body = { userList: [userId], title, content, adminId };
      return await this.sharedNotification.sendNotificationToUser(body);
    } catch (error) {
      kInternalError;
    }
  }
}
