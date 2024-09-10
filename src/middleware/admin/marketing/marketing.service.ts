import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { k500Error } from 'src/constants/misc';
import { k422ErrorMessage, kParamMissing } from 'src/constants/responses';
import { FileService } from 'src/utils/file.service';
import { TypeService } from 'src/utils/type.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { bannerEntity } from 'src/entities/banner.entity';
import { CommonSharedService } from 'src/shared/common.shared.service';
import { PAGE_LIMIT } from 'src/constants/globals';
import { CreditAnalystService } from '../admin/creditAnalystRedis.service';
import { EnvConfig } from 'src/configs/env.config';
import { whatsappMSGEntity } from 'src/entities/whatsappMSGEntity';
import { CryptService } from 'src/utils/crypt.service';
import { UserRepository } from 'src/repositories/user.repository';
import { loanTransaction } from 'src/entities/loan.entity';
import { WhatsAppService } from 'src/thirdParty/whatsApp/whatsApp.service';
import { MasterEntity } from 'src/entities/master.entity';

@Injectable()
export class MarketingService {
  constructor(
    private readonly fileService: FileService,
    private readonly typeService: TypeService,
    private readonly commonShared: CommonSharedService,
    private readonly repoManager: RepositoryManager,
    private readonly creditAnalyst: CreditAnalystService,
    private readonly cryptService: CryptService,
    private readonly userRepository: UserRepository,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  //this function create , update and delete banner data
  async funManageBanner(reqData) {
    // Destructuring request data
    const { files, body } = reqData;
    const {
      action,
      title,
      description,
      adminId,
      platForm,
      screen,
      id,
      fromDate,
      toDate,
    } = body;

    //parameter validation
    if (!files && action == 'CREATE') return kParamMissing('file is required!');
    if (!action) return kParamMissing('action is required!');
    if (!adminId) return kParamMissing('adminId is required!');
    const isAllTime = body?.isAllTime ?? false;
    let imageURL = [];

    // Image URL handling
    const isValidExtension = files?.every((el) => {
      const mimetype = el?.mimetype ?? '-';

      let extension = mimetype.split('/')[1];
      if (extension == 'svg+xml') extension = extension.split('+')[0];
      return ['png', 'jpg', 'svg', 'jpeg'].includes(extension);
    });
    if (!isValidExtension) return kParamMissing('File type is invalid!');
    for (let i = 0; i < files.length; i++) {
      try {
        const ele = files[i];
        const buffer = ele?.buffer ?? '-';
        const mimetype = ele?.mimetype ?? '-';
        let extension = mimetype.split('/')[1];
        let originalname = ele?.originalname.split('.')[0];
        if (extension == 'svg+xml') extension = extension.split('+')[0];
        if (!['png', 'jpg', 'svg', 'jpeg'].includes(extension)) continue;
        const url = await this.fileService?.binaryToFileURL(
          buffer,
          extension,
          null,
          originalname,
        );
        imageURL.push(url);
      } catch (error) {}
    }

    if (typeof body?.files == 'object')
      imageURL = [...imageURL, ...body?.files];
    else if (typeof body?.files == 'string') imageURL.push(body?.files);
    // Parsing dates
    const fromDateGlobal = this.typeService.getGlobalDate(
      fromDate ?? new Date(),
    );
    const toDateGlobal = this.typeService.getGlobalDate(toDate ?? new Date());

    // Perform action based on tag
    //for create
    if (action == 'CREATE') {
      if (isAllTime == 'false') {
        if (!fromDate) return kParamMissing('fromDate is required!');
        if (!toDate) return kParamMissing('toDate is required!');
      }

      let createdData: any = {
        bannerUrl: imageURL,
        title,
        description,
        adminId,
        platForm,
        screen,
        isAllTime,
      };
      if (isAllTime == 'false') {
        createdData.fromDate = fromDateGlobal;
        createdData.toDate = toDateGlobal;
      }
      const createData = await this.repoManager.createRowData(
        bannerEntity,
        createdData,
      );
      if (createData == k500Error) throw new Error();
    }

    //for update
    else if (action == 'UPDATE') {
      // if value is comming then store value in updatedData
      let updatedData: any = {};
      if (imageURL.length) updatedData.bannerUrl = imageURL;
      if (title) updatedData.title = title;
      if (description) updatedData.description = description;
      if (fromDate) updatedData.fromDate = fromDate;
      if (toDate) updatedData.toDate = toDate;
      if (adminId) updatedData.adminId = adminId;
      if (platForm) updatedData.platForm = platForm;
      if (screen) updatedData.screen = screen;
      if (isAllTime) updatedData.isAllTime = isAllTime;
      if (isAllTime == 'true') {
        updatedData.fromDate = null;
        updatedData.toDate = null;
      }
      const updateData = await this.repoManager.updateRowData(
        bannerEntity,
        updatedData,
        +id,
      );
      if (updateData == k500Error) throw new Error();
    }

    //for delete
    else if (action == 'DELETE' && id) {
      await this.repoManager.deleteSingleData(bannerEntity, +id, false);
    }
    await this.creditAnalyst.storeBanners();
  }

  // this function get all banners data
  async funGetBannersData(query) {
    let fromDate = query?.fromDate;
    let toDate = query?.toDate;
    const attributes = [
      'id',
      'title',
      'description',
      'adminId',
      'platForm',
      'screen',
      'fromDate',
      'toDate',
      'bannerUrl',
      'isAllTime',
      'createdAt',
    ];

    let options: any = {
      where: {},
      order: [['id', 'desc']],
      offset: +(query?.page ?? 1) * PAGE_LIMIT - PAGE_LIMIT,
      limit: PAGE_LIMIT,
    };

    if (query?.searchText) {
      options.where = {
        [Op.or]: [
          { title: { [Op.iRegexp]: query.searchText } },
          { description: { [Op.iRegexp]: query.searchText } },
        ],
      };
    }

    // Parsing dates
    const dateRange = {
      fromDate: { [Op.gte]: fromDate },
      toDate: { [Op.lte]: toDate },
    };
    if (fromDate && toDate) options.where = dateRange;

    const bannerList = await this.repoManager.getTableCountWhereData(
      bannerEntity,
      attributes,
      options,
    );

    const finalList = [];
    for (let i = 0; i < bannerList.rows.length; i++) {
      try {
        const ele = bannerList.rows[i];
        let obj = {};
        let positionArr = [
          { value: '1', viewValue: 'Home Dashboard' },
          { value: '2', viewValue: 'In progress-process boosting' },
          { value: '3', viewValue: 'In progress-under verification' },
          { value: '4', viewValue: 'In progress-under verification (Night)' },
          { value: '5', viewValue: 'Repayment-Ontime User' },
          { value: '6', viewValue: 'Event for all positions' },
          { value: '7', viewValue: 'Promo Code' },
        ];
        obj['Id'] = ele?.id ?? '-';
        obj['Banner title'] = ele?.title ?? '-';
        obj['Description'] = ele?.description ?? '-';
        obj['Position'] = positionArr[+ele?.screen - 1] ?? '-';
        obj['Platform'] = ele?.platForm ?? '-';
        obj['Start Date'] = ele?.fromDate
          ? this.typeService.dateToJsonStr(ele?.fromDate)
          : '-';
        obj['End Date'] = ele?.toDate
          ? this.typeService.dateToJsonStr(ele?.toDate)
          : '-';
        obj['isAllTime'] = ele?.isAllTime ?? '-';
        obj['Created Date'] =
          this.typeService.dateToFormatStr(ele?.createdAt) ?? '-';
        obj['Last action by'] =
          (await this.commonShared.getAdminData(ele?.adminId)).fullName ?? '-';
        obj['Banner url'] = ele?.bannerUrl ?? [];
        finalList.push(obj);
      } catch (error) {}
    }
    bannerList.rows = finalList;
    return bannerList;
  }

  async getBulkWhatsAppData(reqData) {
    let { startDate, endDate } = reqData;
    let searchText = reqData?.searchText ?? '';
    let page = reqData?.page ?? 1;

    // Validate required fields
    if (!startDate) return kParamMissing('startDate');
    if (!endDate) return kParamMissing('endDate');

    const dateRange = await this.typeService.getUTCDateRange(
      startDate,
      endDate,
    );
    // Attributes and options
    const attributes = ['messageTitle', 'adminId', 'totalCount', 'createdAt'];
    const options: any = {
      where: {
        createdAt: {
          [Op.gte]: dateRange.fromDate,
          [Op.lte]: dateRange.endDate,
        },
        ...(reqData?.appType && { platform: reqData?.appType }),
      },
      order: [['id', 'desc']],
      limit: 10,
      offset: (page ?? 1) * PAGE_LIMIT - PAGE_LIMIT,
    };
    if (searchText) options.where.messageTitle = { [Op.iRegexp]: searchText };
    // Retrieve  data
    const allData = await this.repoManager.getTableCountWhereData(
      whatsappMSGEntity,
      attributes,
      options,
    );

    if (allData == k500Error) throw new Error();

    //Prepare Data
    const prepareData = await this.funprepareData(allData.rows);

    return { count: allData.count, rows: prepareData };
  }

  async sendBulkWhatsAppData(reqData) {
    const { body } = reqData;
    const { adminId, template, file } = body;

    // Validate required fields
    if (!adminId) return kParamMissing('adminId');
    if (!file) return kParamMissing('file');

    // Extract and hash phone numbers from the .xlsx file
    const fileName = file.filename ?? '-';
    const fileListData: any = await this.fileService.excelToArray(fileName, {});
    if (fileListData == k500Error) throw new Error();

    const numbers = fileListData
      .map((data) => data?.phone)
      .filter((phone) => phone !== undefined);

    if (numbers.length <= 0) return k422ErrorMessage('Invalid file');
    const hashPhone = [
      ...new Set(
        numbers.map((el) => this.cryptService.getMD5Hash(el.toString())),
      ),
    ];

    const userOption = {
      where: { hashPhone },
    };

    const userData = await this.userRepository.getTableWhereData(
      ['fullName', 'email', 'phone', 'appType', 'id'],
      userOption,
    );
    if (userData == k500Error) throw new Error();

    const userIds = userData.map((row) => row.id);
    const loanOpt = {
      where: { userId: { [Op.in]: userIds } },
      order: [['id', 'desc']],
    };
    const loanData = await this.repoManager.getTableWhereData(
      loanTransaction,
      ['id', 'appType', 'userId'],
      loanOpt,
    );
    if (loanData == k500Error) throw new Error();
    const finalData = userData.map((user) => {
      const loan = loanData.find(({ userId }) => userId === user.id);
      return loan
        ? { ...user, loanId: loan.id, loanAppType: loan.appType }
        : user;
    });

    // Create initial  log
    const createObj = {
      messageTitle: template,
      adminId,
      totalCount: userData.length,
      eligibleMsgCount: 0,
      failedMsgCount: 0,
    };
    const createdData = await this.repoManager.createRowData(
      whatsappMSGEntity,
      createObj,
    );

    if (createdData == k500Error) throw new Error();

    // Send WhatsApp messages to users
    for (const user of finalData) {
      const phone = this.cryptService.decryptPhone(user?.phone);
      await this.whatsAppService.sendWhatsAppMessageMicroService({
        title: template,
        appType: user?.loanAppType ?? user.appType,
        userId: user?.id,
        loanId: user?.loanId,
        adminId,
        number: phone,
        customerName: user?.fullName,
        email: user?.email,
      });
    }

    // Note: The update section is currently not in use and hence commented out.

    // const updateObj = {
    //   totalCount: 5,
    //   eligibleMsgCount: 10,
    //   failedMsgCount: 15,
    // };

    // const index = await this.repoManager.updateRowWhereData(
    //   whatsappMSGEntity,
    //   updateObj,
    //   { where: { id: createdData.id } },
    // );

    return {};
  }
  async funprepareData(datas) {
    const prepareData = [];
    for (const data of datas) {
      const obj = {};
      (obj['Message Title'] = data.messageTitle),
        (obj['Last Action By'] =
          (await this.commonShared.getAdminData(data.adminId))?.fullName ?? ''),
        (obj['Created Date'] =
          this.typeService.dateToFormatStr(data.createdAt) ?? ''),
        (obj['Total Count'] = data?.totalCount ?? ''),
        prepareData.push(obj);
    }
    return prepareData;
  }
}
