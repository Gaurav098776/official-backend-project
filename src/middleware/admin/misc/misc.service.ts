// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { Op } from 'sequelize';
import { StaticConfigRepository } from 'src/repositories/static.config.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AssignmentService } from 'src/admin/assignment/assignment.service';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { UserPermissionRepository } from 'src/repositories/userPermission.repository';
import { FileService } from 'src/utils/file.service';
import { Configuration } from 'src/entities/configuration.entity';
import { CreditAnalystService } from '../admin/creditAnalystRedis.service';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { RBIGuidelineRepository } from 'src/repositories/rbiGuideline.repository';
import { PAGE_LIMIT } from 'src/constants/globals';
import { CommonSharedService } from 'src/shared/common.shared.service';
@Injectable()
export class MiscService {
  constructor(
    private readonly staticConfigRepo: StaticConfigRepository,
    private readonly adminRepo: AdminRepository,
    private readonly adminAssignService: AssignmentService,
    private readonly userPermissionRepo: UserPermissionRepository,
    private readonly creditAnalystService: CreditAnalystService,
    private readonly repoManager: RepositoryManager,
    private readonly configRepo: ConfigsRepository,
    private readonly rbiGuidelineRepository: RBIGuidelineRepository,
    // Utils
    private readonly fileService: FileService,
    private readonly commonSharedService: CommonSharedService,
  ) {}

  async verificationAdmins(type) {
    try {
      const configAdmin = await this.staticConfigRepo.getRowWhereData(
        ['data'],
        { where: { type } },
      );
      if (configAdmin == k500Error) return kInternalError;
      const adminIds = await this.adminAssignService.fetchAdminAccordingRole(
        type,
      );
      if (adminIds == k500Error) return [];
      const adminData = await this.adminRepo.getTableWhereData(
        ['id', 'fullName'],
        { where: { id: { [Op.in]: adminIds } } },
      );
      if (adminData == k500Error) return kInternalError;
      return adminData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async createUserPermission(reqData) {
    // Params validation
    const title = reqData.title;
    if (!title) return kParamMissing('title');
    const img = reqData.img;
    if (!img) return kParamMissing('img');
    const description = reqData.description;
    if (!description) return kParamMissing('Description');
    const android = reqData.android;
    if (android == null || android == undefined)
      return kParamMissing('Android');
    const IOS = reqData.IOS;
    if (IOS == null || IOS == undefined) return kParamMissing('IOSmayAndroid');
    const asset = reqData.asset || 'assetPhoneInfov2';
    reqData.asset = asset;

    const options = { where: { title: reqData.title } };
    const checkTitle = await this.userPermissionRepo.getRowWhereData(
      ['id'],
      options,
    );
    if (checkTitle == k500Error) return kInternalError;
    if (checkTitle)
      return {
        valid: false,
        message: 'Already Exist!',
      };
    const result = await this.userPermissionRepo.createRowData(reqData);
    if (result == k500Error) return kInternalError;
    return result;
  }

  async editUserPermission(reqData) {
    // Params validation
    const id = reqData.id;
    if (!id) return kParamMissing('id');
    const title = reqData.title;
    if (!title) return kParamMissing('title');
    const img = reqData.img;
    if (!img) return kParamMissing('img');
    const asset = reqData.asset || 'assetPhoneInfov2';
    const description = reqData.description;
    if (!description) return kParamMissing('Description');
    const android = reqData.android;
    if (android == null || android == undefined)
      return kParamMissing('Android');
    const IOS = reqData.IOS;
    if (IOS == null || IOS == undefined) return kParamMissing('IOSmayAndroid');

    const updatedData = {
      title,
      img,
      asset,
      description,
      android,
      IOS,
    };
    const result = await this.userPermissionRepo.updateRowData(updatedData, id);
    if (result == k500Error) return kInternalError;
    return result;
  }

  async deleteUserPermission(id) {
    try {
      const result = await this.userPermissionRepo.deleteSingleData(id);
      if (result == k500Error) return k500Error;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return k500Error;
        }
  }

  async uploadFile(reqData): Promise<any> {
    const file = reqData.file;
    if (!file) return kParamMissing('file');
    const extension = reqData.extension;
    const fileName = file?.filename;
    const directory = reqData.directory;

    const url = await this.fileService.uploadFile(
      fileName,
      directory,
      extension,
    );
    return { url };
  }

  async getConfig() {
    try {
      const attributes = [
        'id',
        'androidForcefully',
        'androidVersion',
        'approvalMode',
        'bankingProKeySecret',
        'bankingProAppID',
        'iosForcefully',
        'iosVersion',
        'thirdPartyApi',
        'stuckContactUsFlow',
      ];
      const options = {};
      let configData: any = await this.configRepo.getRowWhereData(
        attributes,
        options,
      );
      if (configData == k500Error) return kInternalError;
      configData.dataValues.bankingProAppId = configData.dataValues.bankingProAppID;
      delete configData.dataValues.bankingProAppID;
      return configData
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async updateConfig(reqData) {
    try {
      const id = reqData.id;
      if (!id) return kParamMissing('id');
      const {androidForcefully, androidVersion, approvalMode, bankingProKeySecret, bankingProAppID, iosForcefully, iosVersion, thirdPartyApi, stuckContactUsFlow } = reqData
      if(androidForcefully == null || !androidVersion || approvalMode == null || !bankingProAppID || !bankingProKeySecret || iosForcefully == null || !iosVersion || thirdPartyApi == null || stuckContactUsFlow == null) return kParamMissing()
      const data = {
        androidForcefully,
        androidVersion,
        approvalMode,
        bankingProAppID,
        bankingProKeySecret,
        iosForcefully,
        iosVersion,
        thirdPartyApi,
        stuckContactUsFlow,
      };
      const updateData = await this.repoManager.updateRowData(
        Configuration,
        data,
        id,
      );
      if (updateData == k500Error) return kInternalError;
      await this.creditAnalystService.storeConfigData();
      return true;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async addRBIGuidelines(reqData) {
    const { file, body } = reqData;
    const { title, keyPoints, adminId } = body;
    if (!file) return kParamMissing('file');
    if (!title) return kParamMissing('title');
    if (!keyPoints) return kParamMissing('keyPoints');
    if (!adminId) return kParamMissing('adminId');

    const mimetype = file?.mimetype ?? '-';
    const extension = mimetype.split('/')[1];
    if (extension !== 'pdf') return kParamMissing('Invalid file!');

    const buffer = file?.buffer ?? '-';
    const originalname = file?.originalname.split('.')[0];
    const url = await this.fileService?.binaryToFileURL(
      buffer,
      extension,
      null,
      originalname,
    );

    const imageURL = url;
    const createData: any = {
      title,
      keyPoints: keyPoints,
      docUrl: imageURL,
      adminId,
    };
    const data = await this.rbiGuidelineRepository.createRowData(createData);
    if (data == k500Error) throw new Error();

    let where = {
      isActive: { [Op.eq]: '1' },
    };

    const updateData = await this.adminRepo.update(
      { latestRBIGuideline: true },
      where,
    );
    if (updateData == k500Error) throw new Error();

    return true;
  }

  async getAllRBIGuidelines(reqData) {
    const viewLatest = reqData?.viewLatest == 'true' ? true : false;
    const page = reqData?.page || 1;
    const adminId = reqData?.adminId;
    if (!adminId) return kParamMissing('adminId');

    const pageLimit = PAGE_LIMIT;
    const offsetLimit = (page - 1) * PAGE_LIMIT;

    const attributes = [
      'id',
      'adminId',
      'title',
      'keyPoints',
      'createdAt',
      'docUrl',
    ];
    const options: any = {
      where: {},
      order: viewLatest ? [['id', 'DESC']] : [['id', 'ASC']],
      limit: viewLatest ? 1 : pageLimit,
      offset: viewLatest ? null : offsetLimit,
    };

    const response =
      await this.rbiGuidelineRepository.getTableWhereDataWithCounts(
        attributes,
        options,
      );
    if (response == k500Error) throw new Error();
    const data = response?.rows || [];

    const formattedData = await Promise.all(
      data.map(async (value) => {
        const name = await this.commonSharedService.getAdminData(
          value?.adminId,
        );
        return {
          Id: value?.id || '-',
          Title: value?.title || '-',
          'Key Points': value?.keyPoints || '-',
          'Updated Date': value?.createdAt || '-',
          'Updated By': name?.fullName || '-',
          docUrl: value?.docUrl || '-',
        };
      }),
    );
    let updateValue = {
      latestRBIGuideline: false,
    };
    const updateData = await this.adminRepo.updateRowData(updateValue, adminId);
    if (updateData == k500Error) throw new Error();
    if (viewLatest) return { rows: formattedData };
    else return { count: response.count, rows: formattedData };
  }
}
