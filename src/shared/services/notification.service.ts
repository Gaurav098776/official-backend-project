// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import {
  ECS_HTML,
  EMI_AMOUNT,
  kiosLink,
  kNoTemplateFound,
  kPlayStoreLink,
  kTAdminEmailOtp,
  kTCollectionSummary,
  kTEmailOtp,
  kTInterestEligible,
  kTInterestEligibleSub,
  kTMandateIn,
  kTOverDue,
  kWhatsAppNumber,
  StrDefault,
  NOCSubjectStr,
  kInfoBrandNameNBFC,
  kInfoBrandName,
  kCollectionEmail,
  kCollectionPhone,
  kTEmailVerificationLink,
  kchatScreenRoute,
  kNoReplyMail,
  kQa,
  kAdmins,
  kSupportMail,
  nbfcInfoStr,
  kHelpContact,
  kLspLogo,
  kNbfcRegisterationNo,
  kLspPrivacyPolicy,
  kLspTermAndCondition,
  kLspHelpContactBeforeDisbursement,
  KLspSupportMail,
  kNbfcPrivacyPolicy,
  kNbfcTermAndCondition,
  kNBFC,
  EMI_AMOUNT_LSP,
  ECS_HTML_LSP,
  kLspNoReplyMail,
  klspCollectionMail,
  kNBFCSuportOnlyForEmail,
  kDailyRegistrationReport,
} from 'src/constants/strings';
import { TemplateRepository } from 'src/repositories/template.repository';
import { UserRepository } from 'src/repositories/user.repository';
import * as fs from 'fs';
import { CryptService } from 'src/utils/crypt.service';
import { TypeService } from 'src/utils/type.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import {
  gIsPROD,
  GLOBAL_RANGES,
  isUAT,
  REVIEW_LINK,
  LOAN_MIN,
  MSG91,
  MSG_TITLES,
  SendReviewMsgId,
  SYSTEM_ADMIN_ID,
  GLOBAL_CHARGES,
} from 'src/constants/globals';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import * as FCM from 'fcm-node';
import {
  kAdminEmailOTPTemplatePath,
  kESignTemplate,
  kEmailEligibleInterestPath,
  kEmailOTPTemplate,
  kEmailRefundTemplatePath,
  kMandateTemplatePath,
  kNocPath,
  kpenaltyWaivePromo,
  kVerificationEmail,
  kMailBodyNoc,
  kOverDueTemplatePath,
  kOntimeNocPath,
  KSettleNocPath,
  tDailyReportCollectionTemplate,
  tDailyReportManagementTemplate,
  tDailyRegistrationReportTemplate,
} from 'src/constants/directories';
import * as nodemailer from 'nodemailer';
import {
  dayWiseFields,
  disburseFilds,
  kLspMsg91Templates,
  kMsg91Templates,
  kSendingBlueAuth,
  lcrFields,
  repaidFilds,
} from 'src/constants/objects';
import { MasterEntity } from 'src/entities/master.entity';
import { SendingBlueService } from 'src/thirdParty/sendingBlue/sendingBlue.service';
import { CommonSharedService } from '../common.shared.service';
import { APIService } from 'src/utils/api.service';
import {
  nFirebaseHeaders,
  nFirebaseNotification,
  nPaymentRedirect,
} from 'src/constants/network';
import { LoanRepository } from 'src/repositories/loan.repository';
import { FileService } from 'src/utils/file.service';
import { promoCode } from 'src/constants/network';
import { Op } from 'sequelize';
import { EnvConfig } from 'src/configs/env.config';
import { loanTransaction } from 'src/entities/loan.entity';
import { DateService } from 'src/utils/date.service';
import { RedisService } from 'src/redis/redis.service';

let transporter;
@Injectable()
export class SharedNotificationService {
  fcm: any;
  transporter = nodemailer.createTransport({
    service: 'SendinBlue',
    auth: kSendingBlueAuth,
  });
  constructor(
    private readonly templeteRepo: TemplateRepository,
    private readonly cryptService: CryptService,
    private readonly userRepo: UserRepository,
    private readonly typeService: TypeService,
    private readonly allSmsService: AllsmsService,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly sendingBlue: SendingBlueService,
    private readonly sharedCommonService: CommonSharedService,
    // Utils services
    private readonly api: APIService,
    private readonly loanRepo: LoanRepository,
    private readonly fileService: FileService,
    private readonly dateService: DateService,
    private readonly redisService: RedisService,
  ) {
    this.fcm = new FCM(process.env.FCM_SERVER_KEY);
  }

  async sendNotificationToUser(body) {
    try {
      let userList = body?.userData?.map((el) => el.userId) || body?.userList;
      const image = body?.image;
      if (!userList) return kParamMissing('userList');
      if (!body.id && (!body.content || !body.title)) return kParamsMissing;
      if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE') {
        const userData = await this.userRepo.getTableWhereData(
          ['id', 'email'],
          { where: { id: userList } },
        );
        if (!userData || userData === k500Error) return kInternalError;
        const uatUserList = [];
        for (let index = 0; index < userData.length; index++) {
          try {
            const user = userData[index];
            const email = (user?.email ?? '').toLowerCase();
            if (
              email.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
              email.includes(EnvConfig.emailDomain.companyEmailDomain2)
            )
              uatUserList.push(user?.id);
          } catch (error) {}
        }
        userList = uatUserList;
      }
      const id = body?.id;
      let templeteData: any = {};
      if (id) {
        templeteData = await this.getTemplteData(id);
        if (templeteData?.message) return templeteData;
      }
      const adminId = body?.adminId;
      const isMsgSent = body?.isMsgSent ?? false;
      const smsService = body?.smsService ?? MSG91;
      const isForceManualTitle = body?.isManualTitle ?? false;
      const needResponse = body?.needResponse ?? true;
      const smsOptions = body.smsOptions ?? {};
      let title = templeteData?.title ?? body?.title ?? '';
      let content = templeteData?.content ?? body?.content ?? '';
      if (isForceManualTitle) {
        title = body?.title ?? '';
        content = body?.content ?? '';
      }
      let smsId = body?.smsId ?? templeteData?.templateId;
      const withVar =
        content.includes('{#') || content.includes('##') ? true : false;
      const isChat = body?.isChat;
      if (isChat) {
        const userData = await this.userRepo.getRowWhereData(
          ['id', 'typeOfDevice', 'fullName', 'phone', 'image'],
          { where: { id: userList } },
        );
        body.data = {
          title: `Chat support`,
          body: body?.content,
          userId: body?.userList[0],
          messageType: body?.messageType ?? '',
          isChat,
          route: kchatScreenRoute,
          typeOfDevice: userData?.typeOfDevice,
          userName: userData?.fullName,
          phoneNumber: this.cryptService.decryptPhone(userData?.phone),
          imageUrl: userData?.image,
        };
      }
      if (withVar) {
        const preData = await this.prepareTemplateContent(
          body?.userData ?? userList,
          content,
          templeteData,
        );
        if (preData.message) return preData;
        for (let index = 0; index < preData.length; index++) {
          try {
            const ele = preData[index];
            const appType = ele?.appType;
            await this.sendPushNotification(
              ele?.fcmToken,
              title,
              ele?.content,
              {},
              needResponse,
              adminId,
              { userId: ele?.userId },
              image,
              body.sendMode,
            );
            if (appType === 0 && id) smsId = templeteData.lspTemplateId;
            if (isMsgSent)
              await this.allSmsService.sendSMS(ele?.sms, smsService, {
                smsId,
                adminId,
                appType,
                ...smsOptions,
              });
          } catch (error) {}
        }
        return true;
      } else {
        const userPhoneFCM: any = await this.getUserPhoneFCM(
          body?.userData ?? body?.userList,
        );
        const data = body?.data ?? {};
        await this.sendPushNotification(
          userPhoneFCM?.fcmTokens,
          title,
          content,
          data,
          needResponse,
          adminId,
          { userId: userList },
          image,
          body.sendMode,
        );
        const appType0Users = userPhoneFCM.data.filter(
          (user) => user.appType === 0,
        );
        const appType1Users = userPhoneFCM.data.filter(
          (user) => user.appType === 1,
        );

        if (isMsgSent) {
          const phones0 = appType0Users.map((user) => user.phone);
          const phones1 = appType1Users.map((user) => user.phone);

          // Send SMS for appType 0 users
          if (phones0.length > 0) {
            await this.allSmsService.sendSMS(phones0, smsService, {
              smsId: id ? templeteData.lspTemplateId : smsId,
              adminId,
              appType: 0,
              ...smsOptions,
            });
          }

          // Send SMS for appType 1 users
          if (phones1.length > 0) {
            await this.allSmsService.sendSMS(phones1, smsService, {
              smsId,
              adminId,
              appType: 1,
              ...smsOptions,
            });
          }
        }

        return true;
      }
    } catch (error) {
      return kInternalError;
    }
  }

  async getTemplteData(id) {
    try {
      // Preparation -> Query
      const attributes = [
        'title',
        'content',
        'smsOptions',
        'templateId',
        'lspTemplateId',
      ];
      const options: any = { where: {} };
      if (isNaN(id)) options.where.templateId = id;
      else options.where.id = id;
      // Hit -> Query
      const existingData = await this.templeteRepo.getRowWhereData(
        attributes,
        options,
      );
      // Validation -> Query data
      if (existingData === k500Error) return kInternalError;
      if (!existingData) return k422ErrorMessage(kNoTemplateFound);

      const title = existingData?.title;
      const content = existingData?.content;
      const templateId = existingData?.templateId;
      const lspTemplateId = existingData?.lspTemplateId;
      const smsOptions = existingData?.smsOptions ?? {};
      // Decrypt sensitive data
      if (smsOptions['##CONTACTNUMBER##']) {
        smsOptions['##CONTACTNUMBER##'] = this.cryptService.decryptSyncText(
          smsOptions['##CONTACTNUMBER##'],
        );
      }

      return {
        title,
        content,
        templateSmsOptions: smsOptions,
        templateId,
        lspTemplateId,
      };
    } catch (error) {
      return kInternalError;
    }
  }

  async prepareTemplateContent(userDataList, content, templeteData = {}) {
    try {
      let userList = userDataList.map((el) =>
        typeof el === 'string' ? el : el.userId,
      );
      const userOptions = { where: { id: userList } };
      const userData = await this.userRepo.getTableWhereData(
        ['id', 'fullName', 'phone', 'fcmToken', 'appType'],
        userOptions,
      );
      if (userData === k500Error) return kInternalError;
      const users = userData.map((user) => {
        const item = userDataList.find((el) => el.userId === user.id);
        return {
          ...user,
          appType: item ? item.appType : user.appType,
        };
      });
      return await this.prepareTemplateVariable(users, content, templeteData);
    } catch (error) {
      return content;
    }
  }

  async prepareTemplateVariable(userData, oldContent, templeteData: any = {}) {
    try {
      const finalData: any = [];
      userData.forEach((user) => {
        try {
          const userId = user?.id;
          const appType = user?.appType;
          const appName = appType == 1 ? kInfoBrandNameNBFC : kInfoBrandName;
          const phone = this.cryptService.decryptPhone(user?.phone);
          const fcmToken = user?.fcmToken;
          const userName = user?.fullName ?? '';
          let preData: any = {};
          const obj: any = {};
          let content = oldContent;
          preData = this.checkVariableKey(content, obj, 'FULLNAME', userName);
          content = preData.content;
          preData = this.checkVariableKey(content, obj, 'NAME', userName);
          content = preData.content;
          preData = this.checkVariableKey(content, obj, 'name', userName);
          content = preData.content;
          preData = this.checkVariableKey(content, obj, 'LOANINMIN', LOAN_MIN);
          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            'LOANUPTO',
            GLOBAL_RANGES.MAX_LOAN_AMOUNT,
          );
          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            'WHATSAPPNUMBER',
            kWhatsAppNumber,
          );
          content = preData.content;

          // Dynamic variable -> ##CONTACTNUMBER##
          let actualValueOfContactNumber = kWhatsAppNumber;
          const dynamicValueOfContactNumber =
            (templeteData?.templateSmsOptions ?? {})['##CONTACTNUMBER##'];
          if (dynamicValueOfContactNumber)
            actualValueOfContactNumber = dynamicValueOfContactNumber;
          preData = this.checkVariableKey(
            content,
            obj,
            'CONTACTNUMBER',
            actualValueOfContactNumber,
          );

          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            'ANDROIDLINK',
            kPlayStoreLink,
          );
          content = preData.content;
          preData = this.checkVariableKey(content, obj, 'IOSLINK', kiosLink);
          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            EnvConfig.nbfc.appName,
            appName,
          );
          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            'MININTEREST',
            GLOBAL_RANGES.MIN_PER_DAY_INTEREST_RATE,
          );
          content = preData.content;
          preData = this.checkVariableKey(
            content,
            obj,
            'MAXINTEREST',
            GLOBAL_RANGES.MAX_PER_DAY_INTEREST_RATE,
          );
          content = preData.content;

          finalData.push({
            userId,
            fcmToken,
            content,
            appType,
            sms: { mobiles: phone, ...obj },
          });
        } catch (error) {}
      });
      return finalData;
    } catch (error) {
      return kInternalError;
    }
  }

  checkVariableKey(content, obj, key, value) {
    try {
      if (content.includes(`#${key}#`)) {
        content = this.typeService.replaceAll(content, `{#${key}#}`, value);
        content = this.typeService.replaceAll(content, `##${key}##`, value);
        obj[key] = value;
      }
      return { content, obj };
    } catch (error) {}
  }

  async getUserPhoneFCM(userDataList) {
    try {
      const userList = userDataList.map((el) =>
        typeof el === 'string' ? el : el.userId,
      );

      const userOptions = { where: { id: userList } };
      const userData = await this.userRepo.getTableWhereData(
        ['id', 'fcmToken', 'phone', 'appType'],
        userOptions,
      );
      if (userData === k500Error) return kInternalError;

      //collect fcm tokens and phone of users
      const fcmTokens = [];
      const data = [];
      userData.forEach((ele) => {
        fcmTokens.push(ele?.fcmToken);
        const phone = this.cryptService.decryptPhone(ele?.phone);
        const item = userDataList.find((el) => el?.userId === ele?.id);
        const appType = item ? item?.appType : ele?.appType;
        data.push({ phone, appType });
      });
      return { fcmTokens, data };
    } catch (error) {
      return kInternalError;
    }
  }

  async migrateNotificationTempletes() {
    try {
      let templetesMigrationData: any;
      try {
        templetesMigrationData = fs.readFileSync(
          './upload/notificationTempletes.json',
          'utf-8',
        );
      } catch (err) {}
      if (!templetesMigrationData) return kInternalError;
      templetesMigrationData = JSON.parse(templetesMigrationData);
      const finalData: any = [];
      for (const key in templetesMigrationData) {
        try {
          const eachData = templetesMigrationData[key];
          for (let i = 0; i < eachData.length; i++) {
            try {
              const data = eachData[i];
              const checkData = { subType: key, ...data };
              const exits = await this.templeteRepo.getRowWhereData(['id'], {
                where: checkData,
              });
              if (!exits || exits === k500Error) finalData.push(checkData);
            } catch (error) {}
          }
        } catch (error) {}
      }
      return await this.templeteRepo.bulkCreate(finalData);
    } catch (error) {
      return kInternalError;
    }
  }

  async sendPushNotification(
    fcmToken: any,
    title: string,
    body: string,
    data: any = {},
    needResponse = true,
    adminId = SYSTEM_ADMIN_ID,
    otherData: any = {},
    image = null,
    sendMode: 'API' | 'SDK' = 'SDK',
  ) {
    try {
      const masterInclude = {
        model: MasterEntity,
        attributes: ['id', 'loanId'],
        required: false,
      };
      if (typeof fcmToken == 'string') fcmToken = [fcmToken];
      const userData = await this.userRepo.getTableWhereData(
        ['id', 'email', 'fcmToken'],
        {
          where: { fcmToken: { [Op.in]: fcmToken, [Op.notIn]: [''] } },
          include: [masterInclude],
        },
      );
      if (!userData || userData === k500Error) return kInternalError;
      for (let index = 0; index < userData.length; index++) {
        try {
          const user = userData[index];
          const email = (user?.email ?? '').toLowerCase();
          if (!gIsPROD || process.env.NOTIFICATION_STATUS != 'TRUE')
            if (
              !(
                email.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
                email.includes(EnvConfig.emailDomain.companyEmailDomain2)
              )
            )
              continue;
          let message: any = {
            to: user.fcmToken,
            notification: { title, body },
            showBackendNotification: false,
          };
          if (image) message.notification.image = image;
          if (data) message.data = data;
          if (data.isChat) {
            message.notification = null;
            message.content_available = true;
          }
          message.data.showBackendNotification = false;
          // Send via api
          if (sendMode == 'API') {
            const response = await this.api.post(
              nFirebaseNotification,
              message,
              null,
              null,
              { headers: nFirebaseHeaders },
            );
            if (needResponse) {
              const type = 'NOTIFICATION';
              const userId = user.id;
              const loanId = user?.masterData?.loanId;
              const passData = {
                loanId,
                userId,
                res: response != k500Error ? JSON.stringify(response) : null,
                type,
                err:
                  response == k500Error ? JSON.stringify(kInternalError) : null,
                title,
                content: body,
                adminId,
              };
              this.saveNotificationStatus(passData);
            }
          }
          // Send via SDK
          else {
            await this.fcm.send(message, (err, res) => {
              if (needResponse) {
                const type = 'NOTIFICATION';
                const userId = user.id;
                const loanId = user?.masterData?.loanId;
                const passData = {
                  loanId,
                  userId,
                  res,
                  type,
                  err,
                  title,
                  content: body,
                  adminId,
                };
                this.saveNotificationStatus(passData);
              }
            });
          }
        } catch (error) {}
      }
    } catch (error) {}
  }

  async saveNotificationStatus(data) {
    try {
      const { userId, loanId, type, adminId } = data;
      let response: any = {};
      if (data.err) response = JSON.parse(data.err);
      else if (data.res) response = JSON.parse(data.res);
      const sentBy =
        (await this.sharedCommonService.getAdminData(adminId))?.fullName ??
        'System';
      let status = 'Process';
      if (response.success) status = 'Done';
      else if (response.failure) status = 'Reject';
      const refrenceId = response.multicast_id ?? 'NA';
      const createData: any = {
        loanId,
        status,
        type,
        refrenceId,
        title: data.title,
        content: data.content,
      };
      if (sentBy) createData.sentBy = sentBy;
      if (status == 'Reject') createData.subStatus = 'notSent';
      if (Array.isArray(userId)) {
        for (let index = 0; index < userId.length; index++) {
          try {
            const el = userId[index];
            createData.userId = el;
            await this.mailTrackerRepo.create(createData);
          } catch (error) {}
        }
      } else {
        createData.userId = userId;
        await this.mailTrackerRepo.create(createData);
      }
    } catch (error) {
      return k500Error;
    }
  }

  async sendEmail(
    type: string,
    email: string,
    data?: any,
    count?: number,
    source?: string,
  ) {
    try {
      // if (!gIsPROD) return true;
      if (!count) count = 1;
      let response;
      switch (type) {
        case kTMandateIn:
          response = await this.sendMandateInvitationMail(email, data);
          break;
        case kTEmailOtp:
          response = await this.sendEMailOTP(email, data);
          break;
        case kTAdminEmailOtp:
          response = await this.sendAdminEmailOTP(email, data);
          break;
        case kTOverDue:
          response = await this.sendMailToOverDueUser(email, data);
          break;
        case kTEmailVerificationLink:
          response = await this.sendVerificationEmail(email, data, source);
          break;
      }
      if (!response) return response;
      if (response == k500Error) {
        if (count >= 5) return response;
        count++;
        return await this.sendEmail(type, email, data, count);
      }
      return response;
    } catch (error) {
      return k500Error;
    }
  }

  private async sendMandateInvitationMail(email: string, data?: any) {
    try {
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kMandateTemplatePath,
        data.appType,
        null,
        null,
      );
      let html = (await fs.readFileSync(templatePath)).toString();
      html = html.replace('##FullName##', data.name);
      html = html.replace('##LINK##', data.link);
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = html.replace(
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##HELPCONTACT##', EnvConfig.number.helpContact);
      const subject = 'E-mandate invitation';
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (data.appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        html,
        data?.userId,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      return k500Error;
    }
  }

  //#region emailOTP
  private async sendEMailOTP(email: string, data: any) {
    try {
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kEmailOTPTemplate,
        appType,
        null,
        null,
      );
      const rawData = fs.readFileSync(templatePath);
      let html = rawData.toString();
      if (data.name && html.includes('##NAME##'))
        html = html.replace('##NAME##', data.name);
      else html = html.replace('##NAME##', 'customer');
      if (data.code && html.includes('##CODE##'))
        html = html.replace('##CODE##', data.code);
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = this.replaceAll(html, '##NBFCNAME##', EnvConfig.nbfc.nbfcName);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      html = this.replaceAll(html, '##HELPCONTACT##', kHelpContact);
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        `Verification code - ${data?.code}`,
        html,
        data?.userId,
        [],
        [],
        fromMail,
        replyTo,
        { workMail: data?.workMail },
        [],
      );
    } catch (error) {
      return k500Error;
    }
  }

  private async sendVerificationEmail(
    email: string,
    data: any,
    source: string,
  ) {
    try {
      const userId = data?.userId;
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kVerificationEmail,
        appType,
        null,
        null,
      );
      const rawData = fs.readFileSync(templatePath);
      let html = rawData.toString();
      html = html.replace('##EMAIL##', email);
      if (data.name && html.includes('##NAME##'))
        html = html.replace('##NAME##', data.name);
      else html = html.replace('##NAME##', 'User');
      if (data.link && html.includes('##LINK##'))
        html = this.replaceAll(html, '##LINK##', data.link);
      if (data.hour && html.includes('##HOUR##')) {
        html = this.replaceAll(html, '##HOUR##', data.hour);
      }
      html = this.replaceAll(html, '##NBFCLINK##', EnvConfig.url.nbfcWebUrl);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      const subject = 'Confirm your email address';
      let cc = [];
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      if (!gIsPROD) cc = kQa;
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        html,
        userId,
        cc,
        null,
        fromMail,
        replyTo,
        null,
        null,
        source,
      );
    } catch (error) {
      return k500Error;
    }
  }

  private async sendAdminEmailOTP(email: string, data: any) {
    try {
      const templatePath = kAdminEmailOTPTemplatePath;
      const rawData = fs.readFileSync(templatePath);
      let html = rawData.toString();
      if (data.name && html.includes('##NAME##'))
        html = html.replace('##NAME##', data.name);
      else html = html.replace('##NAME##', 'admin');
      if (data.code && html.includes('##CODE##'))
        html = html.replace('##CODE##', data.code);
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      html = this.replaceAll(html, '##HELPCONTACT##', kHelpContact);
      return await this.sendMailFromSendinBlue(
        email,
        `Verification code - ${data?.code}`,
        html,
        data?.userId,
      );
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion

  async sendMailFromSendinBlue(
    email: any,
    subject: string,
    html: any,
    userId?,
    cc?: string[],
    attachments?: any[],
    fromMail?: string,
    replyTo?: string,
    otherData: any = {},
    bcc = [],
    source?: string,
  ) {
    try {
      let uatSend = false;
      if (!cc || cc?.length == 0) cc = [];
      if (
        typeof email == 'string' &&
        (email.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
          email.includes(EnvConfig.emailDomain.companyEmailDomain2))
      ) {
        uatSend = true;
        cc = !gIsPROD
          ? cc.filter(
              (ele) =>
                ele.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
                ele.includes(EnvConfig.emailDomain.companyEmailDomain2),
            )
          : cc;
      } else if (!gIsPROD && typeof email == 'object') {
        email = email.filter(
          (ele) =>
            ele.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
            ele.includes(EnvConfig.emailDomain.companyEmailDomain2),
        );
        cc = cc.filter(
          (ele) =>
            ele.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
            ele.includes(EnvConfig.emailDomain.companyEmailDomain2),
        );
        uatSend = true;
      }
      if (!bcc || bcc?.length == 0) bcc = [];
      bcc = !gIsPROD
        ? bcc.filter(
            (ele) =>
              ele.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
              ele.includes(EnvConfig.emailDomain.companyEmailDomain2),
          )
        : bcc;
      let legalIdForTrack = '';
      let contentStr = '';
      if (otherData?.legalId) legalIdForTrack = otherData.legalId.toString();
      // Content handling for tags
      if (otherData?.content) {
        try {
          if (typeof otherData?.content == 'string')
            contentStr = otherData?.content;
          else contentStr = JSON.stringify(otherData?.content);
        } catch (error) {}
      }
      let workMail = 'false';
      let tags = [userId, subject, legalIdForTrack, contentStr];
      if (otherData?.workMail) {
        workMail = 'true';
        //sending static legalIdForTrack and contentStr during work mail for handling webhook return tags.
        legalIdForTrack = 'noLegalIdForTrack';
        contentStr = 'noContentStr';
        tags = [userId, subject, legalIdForTrack, contentStr, workMail];
      }
      let masterData: any = {};
      if (userId) {
        const masterInclude = {
          model: MasterEntity,
          attributes: ['id', 'loanId', 'status'],
          required: false,
        };
        const userData = await this.userRepo.getRowWhereData(
          ['id', 'appType'],
          { where: { id: userId }, include: [masterInclude] },
        );
        if (userData == k500Error) return k500Error;
        masterData = userData?.masterData;
      }
      if (!fromMail) fromMail = kNoReplyMail;
      if (!replyTo) replyTo = kSupportMail;
      let appType = 1;
      if (fromMail.includes(EnvConfig.emailDomain.companyEmailDomain1))
        appType = 0;
      const currentYear = new Date().getFullYear();
      html = html.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = this.replaceAll(html, '##NBFCNAME##', kNBFC);
      html = html.replace('##LSPLOGO##', kLspLogo);
      html = html.replace('##NBFCREGISTERATIONNUMBER##', kNbfcRegisterationNo);
      html = this.replaceAll(html, '##LSPSHORTNAME##', kInfoBrandName);
      html = html.replace('##LSPPRIVACYPOLICY##', kLspPrivacyPolicy);
      html = html.replace('##LSPTERMCONDITION##', kLspTermAndCondition);
      html = this.replaceAll(
        html,
        '##LSPHELPCONTACT##',
        kLspHelpContactBeforeDisbursement,
      );
      html = this.replaceAll(html, '##LSPSUPPORTMAIL##', KLspSupportMail);
      html = html.replace('##NBFCPRIVACYPOLICY##', kNbfcPrivacyPolicy);
      html = html.replace('##NBFCTERMCONDITION##', kNbfcTermAndCondition);
      html = this.replaceAll(html, '##NBFCHELPCONTACT##', kHelpContact);
      html = this.replaceAll(
        html,
        '##NBFCSUPPORTMAIL##',
        kNBFCSuportOnlyForEmail,
      );
      html = html.replace('##CURRENTYEAR##', currentYear);
      if (gIsPROD || uatSend) {
        const mailRes = await this.sendingBlue.sendMail({
          cc,
          email,
          from: fromMail,
          replyTo: replyTo,
          subject,
          html,
          attachments: attachments ?? [],
          bcc,
          tags,
          source,
          appType,
        });
        if (mailRes?.message) return k500Error;
        try {
          if (mailRes && userId) {
            const response = await this.cryptService.encryptText(
              JSON.stringify(mailRes),
            );
            const mailTrackerData: any = {
              userId,
              refrenceId: mailRes?.messageId,
              response: response,
              type: 'EMAIL',
              title: subject,
              loanId: masterData?.loanId,
              service: mailRes?.service,
            };
            if (otherData?.legalId) mailTrackerData.legalId = otherData.legalId;
            if (otherData.content)
              mailTrackerData.content = JSON.stringify(otherData.content);
            const createdData = await this.mailTrackerRepo.create(
              mailTrackerData,
            );
            if (
              createdData != k500Error &&
              createdData &&
              mailTrackerData.legalId
            )
              return createdData;
          }
        } catch (error) {}
        return mailRes;
      }
    } catch (error) {
      return k500Error;
    }
  }

  //send mail to refund users
  async sendRefundMail(email: string, data: any) {
    try {
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kEmailRefundTemplatePath,
        appType,
        null,
        null,
      );
      const rawData = fs.readFileSync(templatePath);
      let html = rawData.toString();
      html = html.replace('##FULLNAME##', data.name);
      html = html.replace('##LOANID##', data.loanId);
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##SUPPORTEMAIL##', EnvConfig.mail.suppportMail);
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        'Refund Amount',
        html,
        data?.userId,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      return kInternalError;
    }
  }

  async sendEmailToUser(
    type: string,
    email: string,
    userId: string,
    data?: any,
    count?: number,
    fromMail?: string,
  ) {
    if (!count) count = 1;
    try {
      let canSendMail = false;
      if (!gIsPROD) {
        if (email.includes('rahil')) {
          email = kAdmins[0];
          canSendMail = true;
        } else if (email.includes('malav')) {
          email = kQa[0];
          canSendMail = true;
        }
      } else canSendMail = true;
      if (!canSendMail) return {};
      let result;
      switch (type) {
        case 'ESIGN_INVITATION':
          result = await this.eSignInvitation(email, data);
          break;
        case kTEmailOtp:
          result = await this.sendEMailOTP(email, data);
          break;
        case StrDefault.customEmail:
          result = await this.customEmail(email, data);
          break;
        case kTCollectionSummary:
          result = await this.dailyReportInsights(email, data);
          break;
        case 'DAILY_REPORT_TO_MANAGEMENT':
          result = await this.dailyReportToManagement(email, data);
          break;
        case kDailyRegistrationReport:
          result = await this.dailyRegistrationReport(email, data);
          break;
        case kTInterestEligible:
          result = await this.emailToEligibleUser(email, userId, data);
          break;
        default:
          return k422ErrorMessage('No such type exists');
      }
      if (!result) return kInternalError;
      if (result == k500Error) {
        if (count >= 5) return kInternalError;
        count++;
        return await this.sendEmailToUser(
          type,
          email,
          userId,
          data,
          count,
          fromMail,
        );
      }
      return {};
    } catch (error) {
      return kInternalError;
    }
  }

  private async eSignInvitation(email: string, data?: any) {
    try {
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kESignTemplate,
        appType,
        null,
        null,
      );
      let html = (await fs.readFileSync(templatePath)).toString();
      if (data.link) html = html.replace('##LINK##', data.link);
      if (data.name) html = html.replace('##FullName##', data.name);
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = html.replace('##SUPPORTMAIL##', EnvConfig.mail.suppportMail);
      html = html.replace('##HELPCONTACT##', EnvConfig.number.helpContact);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      const userId = data?.userId;
      const subject = 'ESIGN INVITATON';
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        html,
        userId,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      return k500Error;
    }
  }

  private async customEmail(email: string, data?: any) {
    try {
      const appType = data?.appType;
      const subject = data.subject ?? `${EnvConfig.nbfc.nbfcName} email`;
      let replyTo = kCollectionEmail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = klspCollectionMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        data.html,
        data?.userId,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      return k500Error;
    }
  }

  //collection summary report
  private async dailyReportInsights(email, data) {
    try {
      const subject = 'Daily Collection Summary ' + data.reportDate;
      const agentNameFields = data.agent_wise.adminList;
      const dayField = "Day's";
      agentNameFields.unshift(dayField);
      const nbfcLogo = EnvConfig.url.nbfcLogo;
      const nbfcName = EnvConfig.nbfc.nbfcName;
      const nbfcRegisterationNumber = EnvConfig.nbfc.nbfcRegistrationNumber;
      const nbfcAddress = EnvConfig.nbfc.nbfcAddress;
      const hbsData = await this.fileService.hbsHandlebars(
        tDailyReportCollectionTemplate,
        {
          ...data,
          dayWiseFields,
          agentNameFields,
          nbfcName,
          nbfcLogo,
          nbfcRegisterationNumber,
          nbfcAddress,
        },
      );
      if (hbsData === k500Error) return k500Error;
      const qa = process.env.QA_EMAILS;
      const management = process.env.COLLECTION_MANAGE_EMAILS;
      let ccEmails: any = `${management}`;
      if (!gIsPROD) {
        email = kAdmins[1];
        ccEmails = kAdmins[2];
      }
      if (isUAT) ccEmails = qa;

      ccEmails = ccEmails.split(',');
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        hbsData,
        null,
        ccEmails,
      );
    } catch (error) {
      return k500Error;
    }
  }

  private async sendMailToOverDueUser(email: string, data: any) {
    try {
      const appType = data?.appType;
      const template = await this.sharedCommonService.getEmailTemplatePath(
        kOverDueTemplatePath,
        appType,
        null,
        null,
      );
      const email = data?.email;
      const overdueAmount = data?.totalAmountDue;
      const loanAmount = data?.loanAmount;
      const loanId = data?.loanId;
      const dueday = data?.dueday;
      const fullName = data?.name;
      const month = this.typeService
        .getDateFormatedWithMonthFullName(data?.dueDate)
        .split(' ')[0];
      const dueDate: any = this.typeService
        .dateTimeToDate(data?.dueDate)
        .toJSON();
      const link = data?.link;
      let due_date: any = this.dateService.dateToReadableFormat(dueDate);
      let html: any = fs.readFileSync(template, 'utf-8');
      html = html.replace('##name##', fullName);
      html = html.replace('##loanId##', loanId);
      html = html.replace('##loanAmount##', loanAmount);
      html = this.replaceAll(html, '##overdueAmount##', overdueAmount);
      html = html.replace('##dueDate##', due_date.readableStr);
      html = html.replace('##month##', month);
      html = html.replace('##dueday##', dueday);
      html = html.replace('##link##', link);
      html = html.replace('##COLLECTIONNUMBER##', kCollectionPhone);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = html.replace('##HELPCONTACT##', EnvConfig.number.helpContact);
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      html = this.replaceAll(html, '##NBFCURL##', EnvConfig.url.nbfcWebUrl);
      let replyTo = kCollectionEmail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = klspCollectionMail;
      }
      await this.sendMailFromSendinBlue(
        email,
        'Loan Overdue',
        html,
        data?.userId,
        null,
        null,
        fromMail,
        replyTo,
      );
    } catch (error) {}
  }

  async sendNocBymail(email, data) {
    try {
      let templatePath = '';
      const appType = data?.appType;
      const loanType = data?.loanType;
      if (loanType == 'SETTLED') templatePath = KSettleNocPath;
      if (loanType == 'ONTIME') templatePath = kOntimeNocPath;
      let html: any = await fs.readFileSync(templatePath, 'utf-8');
      html = this.replaceAll(html, '##NAME##', data.userData.fullName);
      html = this.replaceAll(html, '##AMOUNT##', data.loanAmount);
      html = this.replaceAll(html, '##SETTLEMENT_AMT##', data.totalAmount);
      html = this.replaceAll(html, '##ACCOUNT_NUMBER##', data.accountNumber);
      html = this.replaceAll(html, '##WAIVER_AMT##', data.totalWaiver);
      html = html.replace('##NBFCLOGO##', EnvConfig.url.nbfcLogo);
      html = html.replace('##NBFCADDRESS##', EnvConfig.nbfc.nbfcAddress);
      html = this.replaceAll(
        html,
        '##CURRENT_DATE##',
        this.typeService.getDateFormated(new Date()),
      );
      html = html.replace(
        '##DATE##',
        this.typeService.getDateFormated(data.lastPaymentDate),
      );
      html = this.replaceAll(html, '##LOANID##', data.loanId);
      html = this.replaceAll(html, '##NBFCNAME##', EnvConfig.nbfc.nbfcName);
      html = this.replaceAll(
        html,
        '##NBFCREGISTRATIONNUMBER##',
        EnvConfig.nbfc.nbfcRegistrationNumber,
      );
      html = this.replaceAll(html, '##CINNO##', EnvConfig.nbfc.nbfcCINNumber);
      html = this.replaceAll(html, '##FullName##', data.userData.fullName);
      const filePath = await this.fileService.dataToPDF(html);
      if (filePath === k500Error) return kInternalError;
      const url = await this.fileService.uploadFile(filePath, kNocPath);
      if (url === k500Error) return kInternalError;
      const res = await this.loanRepo.updateRowData(
        { nocURL: url },
        data.loanId,
      );
      if (res === k500Error) return kInternalError;
      if (res[0] == 1) {
        const key = `${data?.userData?.id}_USER_PROFILE`;
        await this.redisService.del(key);
      }
      const kMailBodyNocPath =
        await this.sharedCommonService.getEmailTemplatePath(
          kMailBodyNoc,
          appType,
          null,
          null,
        );
      html = await fs.readFileSync(kMailBodyNocPath, 'utf-8');
      try {
        html = this.replaceAll(html, '##NBFCNAME##', EnvConfig.nbfc.nbfcName);
        html = this.replaceAll(
          html,
          '##NBFCREGISTRATIONNUMBER##',
          EnvConfig.nbfc.nbfcRegistrationNumber,
        );
        html = this.replaceAll(html, '##CINNO##', EnvConfig.nbfc.nbfcCINNumber);
        html = this.replaceAll(html, '##FullName##', data.userData.fullName);
        html = this.replaceAll(html, '##COLLECTIONEMAIL##', kCollectionEmail);
        if (data.loanType == 'SETTLED') {
          html = this.replaceAll(html, '##LOANTYPE##', 'settled');
          html = this.replaceAll(html, ' ##NOCTITLE##', 'NOC with Settlement');
        } else {
          html = this.replaceAll(html, '##LOANTYPE##', 'closed');
          html = this.replaceAll(
            html,
            ' ##NOCTITLE##',
            'No Objection Certificate',
          );
        }
        html = this.replaceAll(html, '##LOANID##', data.loanId);
      } catch (error) {}
      const adminEmail = data?.adminEmail ?? null;
      const subject = NOCSubjectStr;
      const attachments = [
        {
          filename: 'noc.pdf',
          path: url,
          contentType: 'application/pdf',
        },
      ];
      const bcc = adminEmail ? [adminEmail] : [];
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      const mailRes: any = await this.sendMailFromSendinBlue(
        email,
        subject,
        html,
        data?.userData?.id,
        [],
        attachments,
        fromMail,
        replyTo,
        {},
        bcc,
      );
      if (mailRes === k500Error) return k500Error;
      mailRes.nocURL = url;
      return mailRes;
    } catch (error) {
      return k500Error;
    }
  }

  // sent review link to ontime loan completion users
  async sendReviewMessage(body) {
    try {
      let phone = body?.phoneNumber;
      if (!phone) return kParamMissing('phoneNumber');

      const appType = body?.appType;
      // SMS sent using sendSMS function
      const smsOptions: any = {
        smsId:
          appType == 1
            ? kMsg91Templates.SendReviewMsgId
            : kLspMsg91Templates.SendReviewMsgId,
        adminId: SYSTEM_ADMIN_ID,
        var1: REVIEW_LINK,
        title: MSG_TITLES.REVIEW_LINK_TITLE,
        loanId: body?.loanId,
        appType,
      };

      await this.allSmsService.sendSMS(phone, MSG91, smsOptions);
      return {};
    } catch (error) {
      return k500Error;
    }
  }
  // end of sent review link to ontime loan completion users

  async sendDefaulterWaiveOffMail(email, data) {
    try {
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kpenaltyWaivePromo,
        appType,
        null,
        null,
      );
      let html: any = await fs.readFileSync(templatePath, 'utf-8');
      // let emi = data?.appType == 1 ? EMI_AMOUT_NBFC : EMI_AMOUNT;
      // let ecs = data?.appType == 1 ? ECS_HTML_NBFC : ECS_HTML;
      let emi = appType == 1 ? EMI_AMOUNT : EMI_AMOUNT_LSP;
      let ecs = appType == 1 ? ECS_HTML : ECS_HTML_LSP;
      let emiDetails = '';
      const paymentKey = data?.loanId * 484848;
      data.link = nPaymentRedirect + paymentKey;
      html = this.replaceAll(html, '##NAME##', data?.name);
      html = this.replaceAll(html, '##PROMO_CODE##', data?.promoCode);
      html = this.replaceAll(html, '##VALID_TIME##', data?.validTime);
      html = this.replaceAll(html, '##TOTAL_AMOUNT##', data?.totalAmount);
      html = this.replaceAll(html, '##DISCOUNT_AMOUNT##', data?.discountAmount);
      html = this.replaceAll(html, '##DISCOUNT_PR##', data?.discount);
      html = this.replaceAll(html, '##REPAY_AMOUNT##', data?.rePayAmount);
      html = this.replaceAll(html, '##link##', data?.link);
      html = this.replaceAll(html, '##VALID_TILL_DATE##', data?.validTillDate);
      html = this.replaceAll(html, '##COLLECTION_EMAIL##', kCollectionEmail);
      html = this.replaceAll(html, '##COLLECTION_PHONE##', kCollectionPhone);
      html = this.replaceAll(html, '##WHATSAPP_LINK##', 'wa.link/7j68h7');
      html = this.replaceAll(html, '##NBFCINFO##', nbfcInfoStr);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = this.replaceAll(
        html,
        '##APPNAME##',
        EnvConfig.nbfc.appCamelCaseName,
      );
      let penaltyDays = 0;
      for (let i = 0; i < data?.emis.length; i++) {
        if (
          (penaltyDays == 0 && data?.emis[i]?.penaltyDays) ||
          penaltyDays < data?.emis[i]?.penaltyDays
        )
          penaltyDays = data?.emis[i]?.penaltyDays;
        const totalPenalty =
          data?.emis[i]?.penalty + data?.emis[i]?.penal + data?.emis[i]?.legal;
        emi = emi.replace('##EMI_NUMBER##', data?.emis[i]?.emiNumber);
        emi = emi.replace('##PENALTY_DAYS##', data?.emis[i]?.penaltyDays);
        emi = emi.replace('##PENALTY##', totalPenalty);
        emi = emi.replace('##EMI_AMOUNT##', data?.emis[i]?.emiAmount);
        if (data?.emis[i].ecs > 0) {
          emi = emi.replace(
            '##ECS##',
            ecs.replace('##ECS_CHARGE##', data?.emis[i]?.ecs),
          );
        } else {
          emi = emi.replace('##ECS##', '');
        }
        emiDetails += emi;
        emi = appType == 1 ? EMI_AMOUNT : EMI_AMOUNT_LSP;
      }
      html = this.replaceAll(html, '##EMI##', emiDetails);
      html = this.replaceAll(html, '##PENALTY_DAYS##', penaltyDays);

      const isSend =
        email.includes(EnvConfig.emailDomain.companyEmailDomain1) ||
        email.includes(EnvConfig.emailDomain.companyEmailDomain2);
      const subject = `Last & Final Opportunity to Settle your Loan with ${
        data?.discount ?? 80
      }% Penalty Waiver`;
      let replyTo = kCollectionEmail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = klspCollectionMail;
      }
      if (gIsPROD || isSend) {
        return await this.sendMailFromSendinBlue(
          email,
          subject,
          html,
          data.userId,
          null,
          null,
          fromMail,
          replyTo,
        );
      }
    } catch (error) {
      return k500Error;
    }
  }

  private escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }

  //#region send email to 0.1% eligible user
  private async emailToEligibleUser(email: string, userId: string, data?: any) {
    try {
      const appType = data?.appType;
      const templatePath = await this.sharedCommonService.getEmailTemplatePath(
        kEmailEligibleInterestPath,
        appType,
        null,
        null,
      );
      let html = (await fs.readFileSync(templatePath)).toString();
      if (data?.fullName) html = html.replace('##FullName##', data?.fullName);
      html = this.replaceAll(
        html,
        '##NBFCSHORTNAME##',
        EnvConfig.nbfc.nbfcCamelCaseName,
      );
      html = html.replace('##NBFCINFO##', nbfcInfoStr);
      html = html.replace('##APPNAME##', EnvConfig.nbfc.appCamelCaseName);
      const subject = kTInterestEligibleSub;
      let replyTo = kSupportMail;
      let fromMail = kNoReplyMail;
      if (appType == '0') {
        fromMail = kLspNoReplyMail;
        replyTo = KLspSupportMail;
      }
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        html,
        userId,
        [],
        [],
        fromMail,
        replyTo,
      );
    } catch (error) {
      return k500Error;
    }
  }

  //#region check app is Install
  async checkAppIsInstall(fcmToken) {
    try {
      let message: any = { to: fcmToken };
      const res: any = await new Promise(async (resolve) => {
        try {
          this.fcm.send(message, (err, res) => {
            resolve(res);
          });
        } catch (error) {
          resolve('');
        }
      });
      const result = JSON.parse(res);
      if (result?.success === 1) return true;
    } catch (error) {}
    return false;
  }
  private async dailyReportToManagement(email, data) {
    try {
      const subject = 'Daily Loan Details for ' + data.reportDate;
      const nbfcLogo = EnvConfig.url.nbfcLogo;
      const nbfcName = EnvConfig.nbfc.nbfcName;
      const nbfcRegisterationNumber = EnvConfig.nbfc.nbfcRegistrationNumber;
      const nbfcAddress = EnvConfig.nbfc.nbfcAddress;
      const hbsData = await this.fileService.hbsHandlebars(
        tDailyReportManagementTemplate,
        {
          ...data,
          disburseFilds,
          repaidFilds,
          lcrFields,
          onlineConvenienceFees: GLOBAL_CHARGES.INSURANCE_FEE,
          nbfcLogo,
          nbfcName,
          nbfcRegisterationNumber,
          nbfcAddress,
        },
      );
      if (hbsData === k500Error) return k500Error;
      const qa = process.env.QA_EMAILS;
      const management = process.env.MANAGEMENT_EMAILS;
      let ccEmails: any = `${management}`;
      if (!gIsPROD) {
        email = kAdmins[1];
        ccEmails = kAdmins[2];
      }
      if (isUAT) ccEmails = qa;

      ccEmails = ccEmails.split(',');
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        hbsData,
        null,
        ccEmails,
      );
    } catch (error) {
      return k500Error;
    }
  }

  private async dailyRegistrationReport(email, data) {
    try {
      const subject = 'Daily Registration Details for ' + data.reportDate;
      const nbfcLogo = EnvConfig.url.nbfcLogo;
      const nbfcName = EnvConfig.nbfc.nbfcName;
      const nbfcRegisterationNumber = EnvConfig.nbfc.nbfcRegistrationNumber;
      const nbfcAddress = EnvConfig.nbfc.nbfcAddress;
      const hbsData = await this.fileService.hbsHandlebars(
        tDailyRegistrationReportTemplate,
        {
          ...data,
          onlineConvenienceFees: GLOBAL_CHARGES.INSURANCE_FEE,
          nbfcLogo,
          nbfcName,
          nbfcRegisterationNumber,
          nbfcAddress,
        },
      );
      if (hbsData === k500Error) return k500Error;
      const qa = process.env.QA_EMAILS;
      const management = process.env.MANAGEMENT_EMAILS;
      let ccEmails: any = `${management}`;
      if (!gIsPROD) {
        email = kAdmins[1];
        ccEmails = kAdmins[2];
      }
      if (isUAT) ccEmails = qa;

      ccEmails = ccEmails.split(',');
      return await this.sendMailFromSendinBlue(
        email,
        subject,
        hbsData,
        null,
        ccEmails,
      );
    } catch (error) {
      return k500Error;
    }
  }
  //#endregion
}
