import { Injectable, OnModuleInit } from '@nestjs/common';
import { AdminRepository } from 'src/repositories/admin.repository';
import { RedisService } from 'src/redis/redis.service';
import { CREDIT_ANALYST_ROLE, CSE_ROLE } from 'src/constants/globals';
import { ConfigsRepository } from 'src/repositories/configs.repository';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { bannerEntity } from 'src/entities/banner.entity';
import { TypeService } from 'src/utils/type.service';
import { Op } from 'sequelize';
import { TemplateRepository } from 'src/repositories/template.repository';
import { k500Error } from 'src/constants/misc';
@Injectable()
export class CreditAnalystService implements OnModuleInit {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly repoManager: RepositoryManager,
    private readonly redisService: RedisService,
    private readonly configRepo: ConfigsRepository,
    private readonly typeService: TypeService,
    private readonly templateRepo: TemplateRepository,
  ) {}
  onModuleInit() {
    this.storeCreditAnalystOnRedis();
    this.storeAdmins();
    this.storeCSEOnRedis();
    this.storeConfigData();
    this.storeTempListForInsuranceFAQ();
    this.storeTempListTempIdDataOnRedis();
    this.storeDefaultKeys();
  }

  async storeCreditAnalystOnRedis() {
    try {
      const attr = ['id', 'fullName', 'isLogin'];
      const options = { where: { roleId: CREDIT_ANALYST_ROLE, isActive: '1' } };
      const adminList = await this.adminRepo.getTableWhereData(attr, options);
      const updatedCreditAnaysts = JSON.stringify(adminList);
      const result = await this.redisService.set(
        'CREDIT_ANALYSTS_ADMIN_LIST',
        updatedCreditAnaysts,
      );
      return result;
    } catch (error) {
      return false;
    }
  }

  async storeAdmins() {
    try {
      const attr = ['id', 'isLogin'];
      const options = { where: { isActive: '1' } };
      const adminList = await this.adminRepo.getTableWhereData(attr, options);
      const object = {};
      adminList.forEach(
        (item: {
          lastActivityTime: any;
          isLogin: any;
          id: string | number;
        }) => {
          object[item.id] = {
            isLogin: item.isLogin,
          };
          if (item.isLogin == 1) {
            object[item.id].lastActivityTime = new Date();
          }
        },
      );
      const updatedAdmins = JSON.stringify(object);
      const result = await this.redisService.set('ADMIN_LIST', updatedAdmins);
      return result;
    } catch (error) {
      return false;
    }
  }

  async storeCSEOnRedis() {
    try {
      const attr = ['id', 'fullName', 'isLogin'];
      const options = { where: { roleId: CSE_ROLE, isActive: '1' } };
      const adminList = await this.adminRepo.getTableWhereData(attr, options);
      const updatedCSEs = JSON.stringify(adminList);
      const result = await this.redisService.set('CSE_ADMIN_LIST', updatedCSEs);
      return result;
    } catch (error) {
      return false;
    }
  }

  async storeConfigData() {
    try {
      const attributes = [
        'androidForcefully',
        'androidVersion',
        'approvalMode',
        'bankingProKeySecret',
        'bankingProAppID',
        'chatbotData',
        'infoKeep',
        'iosForcefully',
        'iosVersion',
        'thirdPartyApi',
        'thirdPartyApiReason',
        'stuckContactUsFlow',
      ];
      const options = {};
      let configData: any = await this.configRepo.getRowWhereData(
        attributes,
        options,
      );
      configData = JSON.stringify(configData);
      const result = await this.redisService.set('CONFIG_DATA', configData);
      return result;
    } catch (error) {
      return false;
    }
  }

  // Function to Store Latest Banners In Redis(Caching)
  async storeBanners() {
    try {
      const todayDate = this.typeService.getGlobalDate(new Date());
      const attr = [
        'title',
        'description',
        'fromDate',
        'toDate',
        'adminId',
        'platForm',
        'screen',
        'createdAt',
        'updatedAt',
        'isAllTime',
        'bannerUrl',
      ];
      const options = {
        where: {
          [Op.or]: [
            {
              [Op.and]: [
                {
                  fromDate: {
                    [Op.lte]: todayDate,
                  },
                },
                {
                  toDate: {
                    [Op.gte]: todayDate,
                  },
                },
              ],
            },
            {
              isAllTime: { [Op.eq]: true },
            },
          ],
        },
      };
      const banners = await this.repoManager.getTableWhereData(
        bannerEntity,
        attr,
        options,
      );
      const bannersList = JSON.stringify(banners);
      const result = await this.redisService.set('BANNERS_LIST', bannersList);
      return result;
    } catch (error) {
      return false;
    }
  }

  async storeTempListForInsuranceFAQ() {
    const templateList = await this.templateRepo.getTableWhereData(
      ['title', 'content'],
      {
        where: {
          type: 'FAQ',
          subType: 'INSURANCE',
        },
      },
    );
    if (templateList == k500Error) throw new Error();
    let key = 'TEMPLATE_FAQ_INSURANCE';
    const updatedTempData = JSON.stringify(templateList);
    const result = await this.redisService.set(key, updatedTempData);
    return result;
  }

  async storeTempListTempIdDataOnRedis() {
    const templateList = await this.templateRepo.getTableWhereData(
      ['id', 'title', 'content', 'type', 'subType', 'isActive', 'templateId', 'lspTemplateId'],
      {
        where: { templateId: { [Op.ne]: null } },
      },
    );
    if (templateList == k500Error) throw new Error();
    let key = 'TEMPLATE_DATA_BY_TEMPID';
    const updatedTempData = JSON.stringify(templateList);
    const result = await this.redisService.set(key, updatedTempData);
    return result;
  }

  async storeDefaultKeys() {
    const key = 'MOCK_SERVICES';
    const value = { cibil_hard_pull: true };
    const result = await this.redisService.set(key, JSON.stringify(value));
    return result
  }
  
}
