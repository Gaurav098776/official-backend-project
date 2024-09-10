import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import { registeredUsers } from 'src/entities/user.entity';
import { LegalNoticeRepository } from 'src/repositories/legal.notice.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import * as fs from 'fs';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { disbursementEntity } from 'src/entities/disbursement.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { employmentDetails } from 'src/entities/employment.entity';
import { admin } from 'src/entities/admin.entity';
import { loanTransaction } from 'src/entities/loan.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { kSenderMails } from 'src/constants/objects';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { kSUCCESSMessage } from 'src/constants/responses';
import {
  kAdmins,
  kLegalMail,
  kInfoBrandName,
  kInfoBrandNameNBFC,
  klspLegalMail,
} from 'src/constants/strings';
import { kLegalMailFormate } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class LegalNoticeService {
  constructor(
    private readonly legalRepo: LegalNoticeRepository,
    private readonly typeService: TypeService,
    private readonly cryptService: CryptService,
    private readonly adminRepo: AdminRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly sharedNotification: SharedNotificationService,
  ) {}

  async updateLegalNoticestatus(body: any) {
    try {
      const isSent = body.isSent ?? true;
      let update = {};
      if (body.status == '0') {
        update = {
          sendAdminId: isSent ? body.adminId : null,
          sendDate: isSent ? body.sendDate : null,
        };
      } else if (body.status == '1') {
        const legalId = body.id;
        const adminId = body.adminId;
        const ccMail = body.ccMail ?? [];
        const passData = { legalId, adminId, ccMail, sendDate: body.sendDate };
        const result = await this.sendLegalMail(passData);
        if (result == k500Error) return kInternalError;
        return result;
      } else if (body.status == '2') {
        update = {
          whatsAppAdminId: isSent ? body.adminId : null,
          whatsAppDate: isSent ? body.sendDate : null,
        };
      } else if (body.status == '3') {
        update = {
          receivedAdminId: isSent ? body.adminId : null,
          receivedDate: isSent ? body.sendDate : null,
        };
      }
      const data = await this.legalRepo.updateRowData(update, body.id);
      if (data === k500Error) return kInternalError;
      return data;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // sent legal notice mail only
  async sendLegalMail(data) {
    try {
      const { adminId, legalId } = data;
      const ccMail = data?.ccMail ?? [];
      const tranInc = {
        model: TransactionEntity,
        attributes: ['id', 'response', 'paidAmount', 'subscriptionDate'],
        where: { type: 'FULLPAY', status: 'FAILED' },
        required: false,
      };
      const disbInc = {
        model: disbursementEntity,
        attributes: ['id', 'amount', 'utr', 'account_number', 'bank_name'],
      };
      const workMailInc = {
        model: WorkMailEntity,
        attributes: ['id', 'email'],
      };
      const empInc = {
        model: employmentDetails,
        attributes: ['id'],
        include: [workMailInc],
      };
      const followerInc = {
        model: admin,
        attributes: ['id', 'email'],
        as: 'followerData',
      };
      const loanInc = {
        model: loanTransaction,
        attributes: ['id', 'netApprovedAmount', 'followerId', 'appType'],
        include: [disbInc, empInc, tranInc, followerInc],
      };
      const userInc = {
        model: registeredUsers,
        attributes: ['email', 'id', 'fullName'],
      };
      const legalOptions = {
        where: { id: legalId },
        include: [userInc, loanInc],
      };
      const legalAtttributes = ['userId', 'url', 'noticeType'];
      const userData = await this.legalRepo.getRowWhereData(
        legalAtttributes,
        legalOptions,
      );
      if (userData == k500Error) return k500Error;
      const user = userData?.registeredUsers;
      const userEmail = user?.email;
      const adminAttr = ['id', 'email'];
      const adminOptions = { where: { id: adminId } };
      const adminData: any = await this.adminRepo.getRoweData(
        adminAttr,
        adminOptions,
      );
      if (adminData == k500Error) return k500Error;
      const loan = userData?.loanData;
      const adminEmail = await this.cryptService.decryptText(adminData.email);
      ccMail.push(adminEmail);
      const followerEmail = await this.cryptService.decryptText(
        loan?.followerData?.email,
      );
      if (followerEmail) ccMail.push(followerEmail);
      const email = process.env.MODE == 'PROD' ? userEmail : kAdmins[1];
      const newDate = Date.now();
      const base64Url = await this.typeService.getBase64FromImgUrl(
        userData.url,
        true,
      );
      if (base64Url == k500Error) return kInternalError;
      const filepath = `./upload/notice-${newDate}.pdf`;
      fs.writeFileSync(filepath, base64Url);
      const subject = 'Legal Notice';
      let htmlcontent: any = fs.readFileSync(kLegalMailFormate, 'utf-8');
      const workMail = loan?.employment?.workMail?.email;
      const disbData = loan?.disbursementData[0];
      const userName = user?.fullName;
      const utr = disbData?.utr;
      const bank = disbData?.bank_name;
      const accountNumber = disbData?.account_number;
      const appType = loan?.appType;
      const appName =
        appType == '1'
          ? kInfoBrandNameNBFC.toUpperCase()
          : kInfoBrandName.toUpperCase();
      const disbAmount = this.typeService.amountNumberWithCommas(
        (disbData?.amount ?? 0) / 100,
      );
      let transData: any = loan?.transactionData ?? [];
      transData = transData.sort((a, b) => b?.id - a?.id)[0];
      const fullPayDate = this.typeService.getDateFormatted(
        transData?.subscriptionDate,
      );
      const failReason = this.commonSharedService.getFailedReason(
        transData?.response,
      );
      const fullPay = this.typeService.amountNumberWithCommas(
        transData?.paidAmount,
      );
      const approvedAmount = this.typeService.amountNumberWithCommas(
        loan?.netApprovedAmount,
      );
      htmlcontent = htmlcontent.replace('##USERNAME##', userName);
      htmlcontent = htmlcontent.replace('##DISBURSED##', disbAmount);
      htmlcontent = htmlcontent.replace('##UTR##', utr);
      htmlcontent = htmlcontent.replace('##BANK##', bank);
      htmlcontent = htmlcontent.replace('##ACCOUNTNUMBER##', accountNumber);
      htmlcontent = htmlcontent.replace('##FULLPAYDATE##', fullPayDate);
      htmlcontent = htmlcontent.replace('##FAILREASON##', failReason);
      htmlcontent = htmlcontent.replace(
        '##NETAPPROVEDAMOUNT##',
        approvedAmount,
      );
      htmlcontent = htmlcontent.replace('##FULLPAY##', fullPay);
      htmlcontent = htmlcontent.replace('##APPNAME##', appName);
      htmlcontent = htmlcontent.replace('##NBFC##', EnvConfig.nbfc.nbfcName);
      htmlcontent = htmlcontent.replace('##NBFCSHORTNAME##', EnvConfig.nbfc.nbfcCamelCaseName)
      const index = Math.floor(Math.random() * kSenderMails.length);
      const senderMail = kSenderMails[index];
      const EMAIL = workMail ? `${email},${workMail}` : email;
      let replyTo =kLegalMail;
      let fromMail = kLegalMail;
      if (appType == '0') {
        fromMail = klspLegalMail;
        replyTo = klspLegalMail;
      }
      const sentMail = await this.sharedNotification.sendMailFromSendinBlue(
        EMAIL,
        subject,
        htmlcontent,
        userData?.userId,
        ccMail,
        [{ path: filepath }],
        fromMail,
        replyTo,
      );
      if (sentMail == k500Error) return k500Error;
      let sendDate = data?.sendDate;
      sendDate = sendDate ? sendDate : new Date();
      const mailDate = this.typeService.getGlobalDate(sendDate);
      const updateType = {
        emailAdminId: adminId,
        emailDate: mailDate,
      };
      await this.legalRepo.updateRowData(updateType, legalId);
      fs.unlinkSync(filepath);
      return kSUCCESSMessage('Document Sent by Mail');
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }
}
