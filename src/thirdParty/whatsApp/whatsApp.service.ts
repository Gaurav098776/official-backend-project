// Imports
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { APIService } from 'src/utils/api.service';
import { MICRO_ALERT_TOPIC } from 'src/constants/objects';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import { SYSTEM_ADMIN_ID, templateDesign } from 'src/constants/globals';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { CryptService } from 'src/utils/crypt.service';
import { UserRepository } from 'src/repositories/user.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { KafkaService } from 'src/microservice/kafka/kafka.service';

@Injectable()
export class WhatsAppService {
  constructor(
    @Inject(forwardRef(() => CommonSharedService))
    private readonly sharedCommonService: CommonSharedService,
    private readonly cryptService: CryptService,
    private readonly userRepo: UserRepository,
    private readonly loanRepo: LoanRepository,
    private readonly kafkaService: KafkaService,
  ) {}

  async sendWhatsAppMessageMicroService(reqData) {
    try {
      let sentBy: string;
      let { appType, loanId, userId, adminId } = reqData;

      adminId = adminId ?? SYSTEM_ADMIN_ID;
      if (appType == null) {
        if (templateDesign == '1') {
          if (loanId) {
            const loanAtr = ['appType'];
            const loanOptions = {
              where: {
                id: loanId,
              },
            };
            const loanData = await this.loanRepo.getRowWhereData(
              loanAtr,
              loanOptions,
            );
            if (loanData === k500Error) return kInternalError;
            appType = loanData?.appType;
          } else {
            const userAtr = ['appType'];
            const userOptions = {
              where: {
                id: userId,
              },
            };
            const userData = await this.userRepo.getRowWhereData(
              userAtr,
              userOptions,
            );
            if (userData === k500Error) return kInternalError;
            appType = userData?.appType;
          }
        }
        if (templateDesign == '0') appType = 0;
      }

      if (adminId && adminId != SYSTEM_ADMIN_ID) {
        sentBy = (await this.sharedCommonService.getAdminData(adminId))
          ?.fullName;
      }

      const payload = {
        ...reqData,
        userId,
        loanId,
        adminId,
        appType,
        sentBy,
      };

      this.kafkaService.send(MICRO_ALERT_TOPIC.SEND_WHATSAPP_MESSAGE, payload);

      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  // webhook
  async storeWhatsAppWebhookResponse(body) {
    this.kafkaService.send(MICRO_ALERT_TOPIC.STORE_WHATSAPP_WEBHOOK, body);
    return {};
  }

  // send whatsapp campaign message
  async sendCampaignMessage(body) {
    let { userIds, title, appType, phone } = body;
    if (!title) return kParamMissing('title');
    if (!userIds && !phone) return kParamMissing('userIds or phone');
    let hashPhone;
    if (!userIds && phone) {
      hashPhone = [
        ...new Set(
          phone.map((el) => this.cryptService.getMD5Hash(el.toString())),
        ),
      ];
    } else userIds = [...new Set(userIds.map((ele) => ele))];

    const userOption: any = { where: { id: userIds } };
    if (hashPhone) userOption.where = { hashPhone };
    const userAtr = ['id', 'fullName', 'email', 'phone'];
    const userData = await this.userRepo.getTableWhereData(userAtr, userOption);

    if (userData === k500Error) return kInternalError;

    const payload = {
      userData,
      title,
      appType,
    };

    this.kafkaService.send(MICRO_ALERT_TOPIC.SEND_WHATSAPP_CAMPAIGN, payload);
    return {};
  }
}
