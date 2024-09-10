import Admin from 'firebase-admin';
// Imports
import {
  k422ErrorMessage,
  kBadRequest,
  kInternalError,
  kNoDataFound,
  kParamMissing,
  kParamsMissing,
  kSUCCESSMessage,
} from 'src/constants/responses';
import { DefaulterService } from '../defaulter/defaulter.service';
import { Injectable } from '@nestjs/common';
import { ListService } from 'src/utils/list.service';
import { SharedNotificationService } from 'src/shared/services/notification.service';
import { MailTrackerRepository } from 'src/repositories/mail.tracker.repository';
import { LegalService } from '../legal/legal.service';
import { k500Error } from 'src/constants/misc';
import { CryptService } from 'src/utils/crypt.service';
import { employmentDetails } from 'src/entities/employment.entity';
import { WorkMailEntity } from 'src/entities/workMail.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { EmploymentServiceV4 } from 'src/v4/employment/employment.service.v4';
import { MasterEntity } from 'src/entities/master.entity';
import {
  SWorkEmailVerification,
  WorkMailVerificationSucess,
  kCC,
  kTechSupportMail,
} from 'src/constants/strings';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { Op, where } from 'sequelize';
import { WorkMailRepository } from 'src/repositories/workMail.repository';
import {
  kBlocEvents,
  kExceptionsDomains,
  kLspMSG91Headers,
  kLspMsg91Templates,
  kMSG91Headers,
  kMsg91Templates,
} from 'src/constants/objects';
import { TemplateRepository } from 'src/repositories/template.repository';
import { TypeService } from 'src/utils/type.service';
import { loanTransaction } from 'src/entities/loan.entity';
import { gIsPROD } from 'src/constants/globals';
let firebaseDB;
import * as fs from 'fs';
import { RedisService } from 'src/redis/redis.service';
import { kQueryFail } from 'src/constants/directories';
import { EnvConfig } from 'src/configs/env.config';
import { NUMBERS } from 'src/constants/numbers';
import { CommonService } from 'src/utils/common.service';
import { AllsmsService } from 'src/thirdParty/SMS/sms.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { FormUsers } from 'src/entities/formUsers.entity';
@Injectable()
export class AdminNotificationService {
  constructor(
    private readonly defaulterService: DefaulterService,
    private readonly mailTrackerRepo: MailTrackerRepository,
    private readonly userRepo: UserRepository,
    private readonly legalservice: LegalService,
    private readonly cryptService: CryptService,
    // Repositories
    private readonly workMailRepo: WorkMailRepository,
    private readonly templateRepo: TemplateRepository,
    private readonly typeService: TypeService,
    // Shared service
    private readonly notifcation: SharedNotificationService,
    // Utils
    private readonly listService: ListService,
    // V4 services
    private readonly empService: EmploymentServiceV4,
    private readonly userService: UserServiceV4,
    private readonly redisService: RedisService,
    private readonly commonService: CommonService,
    private readonly allsmsService: AllsmsService,
    private readonly repoManager: RepositoryManager,
  ) {
    if (process.env.MODE == 'PROD' || process.env.MODE == 'UAT')
      firebaseDB = Admin.firestore();
  }

  async sendBulkNotifications(reqData) {
    try {
      // Params validation
      const adminId = reqData.adminId;
      if (!adminId) return kParamMissing('adminId');
      const waitForNotification = reqData.waitForNotification ?? false;
      if (!reqData.id && (!reqData.content || !reqData.title))
        return kParamsMissing;

      // Returns list of chunks for sending notifications
      const targetList = await this.targetListForBulkNotifications(reqData);
      if (targetList?.message) return targetList;
      if (waitForNotification)
        return await this.triggerNotifications(targetList, reqData);
      else this.triggerNotifications(targetList, reqData);

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async targetListForBulkNotifications(reqData) {
    try {
      const type = reqData.type;
      if (!type) return kParamMissing('type');
      const queryData = reqData.queryData ?? {};
      queryData.notification = true;
      if (reqData?.adminId && !queryData.adminId)
        queryData.adminId = reqData?.adminId;
      const userData = reqData.userData;
      if (userData) return this.listService.splitListIntoParts(userData, 10);
      let targetList: any = [];

      switch (type) {
        case 'DAY_WISE_DEFAULTERS':
          targetList = await this.defaulterService.dayWiseDetails(queryData);
          break;

        case 'ONLINE_DEFAULTERS':
          targetList = await this.defaulterService.onlineDefaulterUsers(
            queryData,
          );
          break;

        default:
          break;
      }

      if (targetList?.message) return targetList;

      return this.listService.splitListIntoParts(targetList, 10);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  private async triggerNotifications(targetList, reqData) {
    for (let index = 0; index < targetList.length; index++) {
      const userData = targetList[index];
      await this.notifcation.sendNotificationToUser({ ...reqData, userData });
    }
  }

  async checkEmailStatus(response) {
    try {
      let status = 'Process';
      const errorStatuses = [
        'error',
        'blocked',
        'unsubscribed',
        'invalid_email',
        'hard_bounce',
        'deferred',
        'bounce',
        'dropped',
      ];
      const onProcess = ['soft_bounce', 'spam', 'processed'];
      const doneStatuses = [
        'click',
        'open',
        'unique_opened',
        'delivered',
        'opened',
      ];
      if (errorStatuses.includes(response.event)) status = 'Reject';
      if (doneStatuses.includes(response.event)) status = 'Done';
      if (onProcess.includes(response.event)) status = 'Process';

      return status;
    } catch (error) {
      console.error('Error in: ', error);
      return k500Error;
    }
  }

  async emailStatusUpdate(data) {
    try {
      let messageId = null;
      let service = null;
      if (data[0]?.sg_message_id) {
        messageId = data[0].sg_message_id.split('.')[0];
        if (!messageId) return kBadRequest;
        data = data[0];
        data.tags = data?.category;
        data.messageId = messageId;
        service = 'SENDGRID';
      } else {
        messageId = data['message-id'];
        if (!data['message-id']) return kBadRequest;
        service = 'BREVO';
      }

      // Tags
      if (!data.tags) data.tags = [];
      const userId = data.tags?.length > 0 ? data.tags[0] : null;
      const subject = data.tags?.length > 1 ? data.tags[1] : null;
      const legalId = data.tags?.length > 2 ? data.tags[2] : null;
      const content = data.tags?.length > 3 ? data.tags[3] : null;
      // checking for workMail webhoop popUp app side.
      let workMail = null;
      if (data.tags.includes('true')) {
        workMail = true;
      }

      let mailData: any = {};
      if (userId && subject) {
        mailData.userId = userId;
        mailData.legalId = !isNaN(parseInt(legalId)) ? parseInt(legalId) : null;
        mailData.title = subject;
        mailData.content = content === 'noContentStr' ? null : content;
      }
      // Find in db
      else {
        const attributes = [
          'content',
          'id',
          'userId',
          'loanId',
          'legalId',
          'type',
          'title',
          'status',
          'source',
        ];
        const options = {
          where: { refrenceId: messageId },
          order: [['id', 'DESC']],
        };
        mailData = await this.mailTrackerRepo.getRowWhereData(
          attributes,
          options,
        );
      }

      if (mailData == k500Error) return kInternalError;
      if (!mailData) return kNoDataFound;

      // For legal email's tracking purpose
      if (mailData?.legalId) {
        await this.legalservice.funLegalMailTrack({
          legalId: mailData?.legalId,
          response: data,
        });
      }

      // We don't need to add logs if track is already closed
      const existingStatus = mailData.status;
      const trackClosed =
        existingStatus == 'Done' || existingStatus == 'Rejected';
      let status = await this.checkEmailStatus(data);
      if (trackClosed && status == 'Process') return {};

      // Disabled -> Temporary
      // if (data.event == 'delivered')
      //   await this.updateWorkmailStatus(mailData.userId, data.email);

      if (workMail) {
        if (
          data.event == 'soft_bounce' ||
          data.event == 'hard_bounce' ||
          data.event == 'blocked' ||
          data.event == 'bounce'
        )
          await this.bounceStatus(mailData?.userId);
      }

      if (status == k500Error) return kInternalError;
      if (!status) status = mailData.status;
      if (trackClosed && status == 'Process') return {};

      // Create new data
      const rawData = {
        content: mailData.content,
        userId: mailData.userId,
        loanId: mailData?.loanId,
        refrenceId: messageId,
        response: await this.cryptService.encryptText(JSON.stringify(data)),
        type: 'EMAIL',
        title: mailData.title,
        subStatus: data.event,
        status: status,
        statusDate: data.date,
        source: data.email,
        legalId: mailData?.legalId,
        service,
      };
      await this.mailTrackerRepo.create(rawData);
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async updateWorkmailStatus(userId, email: string) {
    try {
      if (!email) return {};

      for (let index = 0; index < kExceptionsDomains.length; index++) {
        try {
          const tail = kExceptionsDomains[index];
          if (email?.toLowerCase()?.trim()?.endsWith(tail)) return {};
        } catch (error) {}
      }

      // Check earlier approved status
      let attributes = ['id'];
      let options: any = {
        where: { userId, email, status: { [Op.in]: ['1', '3'] } },
      };
      const approvedData = await this.workMailRepo.getRowWhereData(
        attributes,
        options,
      );
      if (approvedData == k500Error) return kInternalError;
      if (!approvedData) return kNoDataFound;

      // Get user data
      const empInclude: any = { model: employmentDetails };
      empInclude.attributes = ['id', 'companyUrl', 'companyName'];
      const workMailInclude: any = { model: WorkMailEntity };
      workMailInclude.attributes = ['email', 'id', 'otp', 'status'];
      workMailInclude.where = { email, status: '5' };
      const masterInclude: any = { model: MasterEntity };
      masterInclude.include = [empInclude, workMailInclude];
      masterInclude.attributes = ['status', 'loanId', 'miscData'];
      const include = [masterInclude];
      attributes = ['completedLoans', 'masterId'];
      options = { include, where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if ((userData.completedLoans ?? 0) == 0) return {};
      const masterId = userData.masterId;
      const masterData = userData.masterData ?? {};
      const empData = masterData.empData ?? {};
      const miscData = masterData?.miscData ?? {};
      const workMailData = masterData.workMailData ?? {};
      if (!workMailData?.email) return {};
      const statusData = masterData.status ?? {};
      const dates = masterData.dates ?? {};
      const isRedProfile = (userData?.isRedProfile ?? 0) === 2;

      // Work email domain verification with company url
      const isValidDomain = this.empService.domainValidation(
        workMailData.email,
        empData.companyUrl,
      );
      // Update work mail data
      const verificationData = {
        isValidDomain,
        statusData,
        userId,
        workMailData,
        masterId,
        masterData,
        empData,
        miscData,
        dates,
        isRedProfile,
      };

      if (workMailData.status === '5') {
        const result: any = await this.empService.workMailOtpVerifcation(
          verificationData,
        );
        if (result.message) return result;
        const body: any = {
          userList: [userId],
          title: SWorkEmailVerification,
          content: WorkMailVerificationSucess,
        };
        const routeData = await this.userService.routeDetails({ id: userId });
        if (routeData?.message) return routeData;
        const userData = routeData.userData ?? {};
        const route =
          routeData.continueRoute ?? routeData.nextRoute ?? routeData.rootRoute;
        body.data = {
          userData: {
            blocEvents: [kBlocEvents.workMailDone],
            userData,
            route,
            popCount: 1,
            rootRoute: routeData.rootRoute,
          },
          moveToStep: 'none',
        };
        body.sendMode = 'API';
        await this.notifcation.sendNotificationToUser(body);
      }

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async bounceStatus(userId) {
    try {
      const key = (gIsPROD ? 'PROD' : 'UAT') + '-Workmail-Status';
      await firebaseDB.collection(key).doc(userId).set({ bounce_status: true });
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #start region create template
  async createTemplate(body) {
    try {
      const title = body?.title;
      if (!title) return kParamMissing('title');
      const type = body?.type;
      if (!type) return kParamMissing('type');
      const content = body?.content;
      if (!content) return kParamMissing('content');
      const subType = body?.subType;
      const newData = {
        title,
        type,
        content,
        subType,
      };
      const createdRespone = await this.templateRepo.createRowData(newData);
      if (createdRespone === k500Error) return kInternalError;
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
  //#endregion

  // #start region getTemplatelist

  async getTemplateList(query) {
    try {
      const type = query?.type;
      if (!type) return kParamMissing('type');
      const limit = query?.limit ?? 10;
      const subType = query?.subType;
      const attributes = ['id', 'title', 'content', 'subType'];
      const options: any = {
        limit: limit,
        orderBy: [['id', 'DESC']],
        where: { type },
      };
      if (subType) options.where.subType = subType;
      const key = subType ? `${type}_${subType}_GET_LIST` : `${type}_GET_LIST`;
      let templateList;
      templateList = await this.redisService.getKeyDetails(key);
      if (!templateList) {
        templateList = await this.templateRepo.getTableWhereData(
          attributes,
          options,
        );
        if (templateList === k500Error) return kInternalError;

        await this.redisService.set(
          key,
          JSON.stringify(templateList),
          NUMBERS.SEVEN_DAYS_IN_SECONDS,
        );
      } else templateList = JSON.parse(templateList);

      return templateList;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //#endregion

  // #startregion for get Rejected TrackerCount
  async getRejectedTrackerCount() {
    try {
      const todayDate = new Date();
      const startDate = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        1,
      ).toJSON();

      const date = this.typeService.getUTCDateRange(startDate, startDate);
      const options = {
        where: {
          status: 'Reject',
          createdAt: {
            [Op.gte]: date.fromDate,
          },
        },
        group: ['userId'],
      };
      const data = await this.mailTrackerRepo.getCountsWhere(options);
      if (data === k500Error) return kInternalError;
      return data?.length;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // #startregion for get Rejected Tracker data

  async getRejectedTrackerData() {
    try {
      const todayDate = new Date();
      const startDate = new Date(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        1,
      ).toJSON();

      const date = this.typeService.getUTCDateRange(startDate, startDate);
      const attributes = ['type', 'title', 'updatedAt', 'userId', 'source'];
      const options = {
        where: {
          status: 'Reject',
          createdAt: {
            [Op.gte]: date.fromDate,
          },
        },
      };
      const trackerData = await this.mailTrackerRepo.getTableWhereData(
        attributes,
        options,
      );

      if (trackerData === k500Error) return kInternalError;
      const userIdArr = [];
      for (let index = 0; index < trackerData.length; index++) {
        try {
          const element = trackerData[index];
          userIdArr.push(element.userId);
        } catch (error) {}
      }
      const loanInclude = {
        model: loanTransaction,
        attributes: ['id'],
        orderBy: [['id', 'DESC']],
      };
      const include = [loanInclude];
      const userList = await this.userRepo.getTableWhereData(
        ['id', 'fullName', 'phone', 'email'],
        { where: { id: userIdArr }, include },
      );

      if (userList === k500Error) return kInternalError;
      for (let index = 0; index < userList.length; index++) {
        try {
          const element = userList[index];
          element.phone = this.cryptService.decryptPhone(element?.phone);
        } catch (error) {}
      }
      return { userList, trackerData };
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //get error from redis server and send mail
  async sendMailforQueryFail() {
    try {
      const template = kQueryFail;
      const MODE = process.env.MODE;
      const key = 'DB_FAILURE';

      // get error
      let errorData = await this.redisService.get(key);
      if (!errorData) return {};
      errorData = errorData.split('@@**@@');
      let tableData = '';

      // set error in html
      if (errorData.length) {
        for (let index = 0; index < errorData.length; index++) {
          try {
            let element = errorData[index];
            element = JSON.parse(element);
            const Time = element.Time;
            const SQL_Query = element.SQL_Query.replace('\n', '');
            const Error = JSON.stringify(element.Error_Message);
            tableData += `<br/>
          <table style="width:100%;padding: 10px; border: 1px solid #000000">
<tr>
  <td >
    <li>
      <strong>Time of Query Fail</strong> ${Time}
    </li>
  </td>
</tr>
<tr>
  <td>
    <br />
    <li><strong>SQL Query</strong> ${SQL_Query}</li>
  </td>
</tr>
<tr>
  <td>
    <br />
    <li><strong>Error</strong> ${Error}</li>
  </td>
</tr>
</table>`;
          } catch (error) {}
        }
      }

      let html: any = fs.readFileSync(template, 'utf-8');
      html = html.replace('##tableData##', tableData);
      html = html.replace('##NBFC##', EnvConfig.nbfc.nbfcName);

      //send mail
      const cc = kCC;
      const subject = `${MODE} Alert: Database Query Failure`;
      await this.notifcation.sendMailFromSendinBlue(
        kTechSupportMail,
        subject,
        html,
        null,
        cc,
      );

      //set error null string in redis server
      errorData = '';
      this.redisService.set(key, errorData);
    } catch (error) {}
  }

  async updateTemplateContent(reqData) {
    try {
      // Params validation
      const id = reqData?.id;
      if (!id) return kParamMissing('id');
      const tempContent = reqData?.content;
      const title = reqData?.title;
      const subType = reqData?.subType;

      const updatedData = {
        content: tempContent,
        title,
        subType,
      };
      await this.templateRepo.updateRowData(updatedData, id);
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  //UserForm
  async webFormSendOtp(body) {
    try {
      const mobileNumber = body.mobileNumber;
      const fullName = body?.fullName;
      if (!mobileNumber) return kParamMissing('mobileNumber');

      const userData = await this.repoManager.getRowWhereData(
        FormUsers,
        ['id', 'mobileNumber', 'fullName'],
        { where: { mobileNumber } },
      );
      if (userData === k500Error) return kInternalError;

      const otp = this.commonService.generateOTP();
      if (userData) {
        await this.repoManager.updateRowData(
          FormUsers,
          { OTP: otp, fullName: fullName },
          userData.id,
        );
      } else {
        const newData = {
          mobileNumber,
          OTP: otp,
          fullName: fullName,
          webType: body.webType,
        };
        await this.repoManager.createRowData(FormUsers, newData);
      }
      let webType = body.webType;
      const flow_id =
        webType == 1
          ? kMsg91Templates.SEND_OTP_TEMPLATE
          : kLspMsg91Templates.SEND_OTP_TEMPLATE;
      const sender =
        webType == 1 ? kMSG91Headers.sender : kLspMSG91Headers.sender;
      const msgData = {
        flow_id,
        sender,
        var1: otp,
        var2: '',
        mobiles: '91' + mobileNumber,
        appType: webType,
      };

      await this.allsmsService.sendSMS(mobileNumber, null, msgData);
      return kSUCCESSMessage('OTP sent on your registered mobile number');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async submitWebForm(body) {
    try {
      const fullName = body?.fullName;
      const OTP = body?.otp;
      const salaryRange = body?.salaryRange;
      const employmentType = body?.EmploymentType;
      const webType = body?.webType;
      const city = body?.city;
      const mobileNumber = body.mobileNumber;
      if (!mobileNumber) return kParamMissing('mobileNumber');
      if (!OTP) return kParamMissing('otp');

      const userData = await this.repoManager.getRowWhereData(
        FormUsers,
        ['id', 'OTP'],
        { where: { mobileNumber } },
      );
      if (body?.otp != userData.OTP) return k422ErrorMessage('Invalid OTP!');

      if (userData === k500Error) return kInternalError;
      const newData = {
        fullName,
        salaryRange,
        employmentType,
        webType,
        city,
      };
      await this.repoManager.updateRowData(FormUsers, newData, userData.id);
      return kSUCCESSMessage('Data submitted successfully.');
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
