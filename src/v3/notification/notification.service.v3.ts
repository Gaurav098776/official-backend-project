import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { kNotificationIcons } from 'src/constants/objects';
import { Op } from 'sequelize';

@Injectable()
export class NotificationServiceV3 {
  constructor(private readonly mailTrackerRepo: MailTrackerRepository) {}

  async countList(reqData) {
    try {
      // Params validation
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');
      const isCount = reqData.isCount;
      if (!isCount) return kParamMissing('isCount');

      const attributes = ['id', 'title', 'content', 'createdAt'];
      const options: any = {
        where: {
          userId,
          type: 'NOTIFICATION',
          createdAt: { [Op.gte]: '2023-11-20T10:00:00.000Z' },
        },
        order: [['id', 'DESC']],
        limit: 20,
      };
      if (isCount == 'true') {
        options.where.notificationFlag = '0';
        // Temporary disabled due to db load issue
        const counts = await this.mailTrackerRepo.getCountsWhere(options);
        if (counts === k500Error) return kInternalError;
        return { counts };
      }
      const notifications = await this.mailTrackerRepo.getTableWhereData(
        attributes,
        options,
      );
      if (notifications === k500Error) return kInternalError;
      notifications.forEach((el) => {
        try {
          el.body = el?.content;
          delete el?.content;
          if (el.title.startsWith('Sorry,')) {
            el.icon = kNotificationIcons['Loan Rejected'];
          } else {
            el.icon =
              kNotificationIcons[el.title] ?? kNotificationIcons['Default'];
          }
        } catch (error) {}
      });
      await this.mailTrackerRepo.updateRowWhereData(
        { notificationFlag: '1' },
        { where: { userId, notificationFlag: '0' } },
      );
      return { notifications };
    } catch (error) {
      return kInternalError;
    }
  }
}
