// Imports
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { AdminService } from './admin.service';
import { DashboardDisbursement } from '../disbursement/disbursementDeshboard.service';
import { ContactSharedService } from 'src/shared/contact.service';
import { RoleManagementService } from 'src/admin/admin/roleManagement.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { LogsSharedService } from 'src/shared/logs.service';
import { k500Error } from 'src/constants/misc';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('admin/admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly dashboardDisbursement: DashboardDisbursement,
    private readonly sharedService: ContactSharedService,
    private readonly roleManagementService: RoleManagementService,
    private readonly userService: UserServiceV4,
    private readonly logsService: LogsSharedService,
  ) {}

  //#region get all admin logger data
  @Get('getAllAdminLoggerData')
  async funAllAdminLoggerData(@Query() query, @Res() res) {
    try {
      if (!query.page || !query.start_date || !query.end_date)
        return res.json(kParamsMissing);
      const data: any = await this.service.fetchAllAdminLoggerData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endrgion

  //#region To Update remark for specific loan
  @Post('addRemarkByLoanId')
  async funAddRemarkByLoanId(@Body() body, @Res() res) {
    try {
      if (!body.remark || !body.adminId || !body.loanId)
        return res.json(kParamsMissing);
      const data: any = await this.service.updateRemarkByLoanId(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('changeBlacklistUser')
  async funChangeBlackListUser(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.changeBlacklistUser(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAllOnlineDefaulters')
  async fungetAllOnlineDefaulters(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getOnlineDefaulters(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#region

  @Post('changeApprovalAmount')
  async funChangeApprovalAmount(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      let data: any = await this.service.funChangeApprovalAmount(body);
      if (data?.message) return res.json(data);
      const userId = data?.userId;
      if (data.needUserInfo && userId) {
        data = await this.userService.routeDetails({ id: userId });
        if (data?.message) return res.json(data);
      }
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.log({ error });
      return res.json(kInternalError);
    }
  }

  //#region
  @Post('updateDefaulterCount')
  async updateDefaulterCount(@Body() body, @Res() res) {
    try {
      const data: any = await this.sharedService.funUpdateDefaulterCount(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getPersonalDetails')
  async funGetPersonalDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetPersonalDetails(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('changeSalaryDate')
  async funChangeSalaryDate(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.changeSalaryDate(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //region update defaulter Contact Count
  @Post('updateDefaultersContactDefaulterCount')
  async updateDefaulters(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.sharedService.updateDefaulterCountOfDefaulters(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region Re-Initiate Disbursement
  @Post('reInitiateDisbursement')
  async funReInitiateDisbursement(@Body() body, @Res() res) {
    try {
      const data = await this.dashboardDisbursement.reInitiateDisbursement(
        body,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('reInitiateAllFailedDisbursement')
  async funReInitiateAllFailedDisbursement(@Res() res) {
    try {
      const data: any =
        await this.dashboardDisbursement.reInitiateAllFailedDisbursements();
      if (data.message) return res.json(data);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getMasterData')
  async getMasterData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getMasterData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('updateUserLoanStatus')
  async funUpdateUserLoanStatus(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.updateUserLoanStatus(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('getAdvocateData')
  async getAllAdvocateData(@Res() res) {
    try {
      const data = await this.service.getAdvocateData();
      if (data.message) res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //create new department
  @Post('createNewDepartment')
  async createNewDepartment(@Body() body, @Res() res) {
    try {
      const data = await this.roleManagementService.createNewDepartment(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('updateAdvocateData')
  async funUpdateAdminData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funUpdateAdminData(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //update access of department
  @Post('updateDepartment')
  async updateDepartment(@Body() body, @Res() res) {
    try {
      const data = await this.roleManagementService.updateDepartment(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //get all department details
  @Get('getDepartmentData')
  async getDepartmentData(@Query() query, @Res() res) {
    try {
      const data: any = await this.roleManagementService.getDepartmentData(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('testNameMissMatch')
  async testNamemissMAtch(@Res() res) {
    try {
      const data: any = await this.service.testNameMissMatch();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('ipCheckWeb')
  async funIpCheckWeb(@Body() body, @Res() res) {
    try {
      const userId = body.userId;
      if (!userId) return res.json(kParamsMissing);
      let data: any = await this.service.funIpCheckWeb(body);
      if (data?.message) return res.json(data);
      data = await this.userService.routeDetails({ id: userId });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAdminData')
  async funGetAdminData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAdminData(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region add or update sub role
  @Get('findAllRole')
  async findAllRole(@Query() query, @Res() res) {
    try {
      const data: any = await this.roleManagementService.findAllRole(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getDepartment')
  async getDepartment(@Res() res) {
    try {
      const data: any = await this.service.getDepartmentList();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('findByEmail')
  async funFindByEmail(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.fetchByEmail(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('adminPassword')
  async forgotAdminPassword(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.forgotAdminPassword(body);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getChangeableData')
  async funGetChangeableData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getChangeableData(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getAllBlacklistCompanies')
  async funcGetAllBlacklistComapnies(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllBlacklistCompanies(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('downloadKYCDocuments')
  async funDownloadKYCDocuments(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.downloadKYCDocuments(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('updateWaiver')
  async funUpdateWaiver(@Body() body, @Res() res, @IPConfig() ip) {
    try {
      body.ip = ip;
      const data: any = await this.service.checkNUpdateWaiver(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('blacklistCompanies')
  async funcBlacklistCompanies(@Body() body, @Res() res) {
    try {
      const companyName = body.companyName;
      const adminId = body.adminId;
      if (!companyName || !adminId) return res.json(kParamsMissing);
      const data: any = await this.service.blackListCompanies(
        companyName,
        adminId,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get all Admin Details
  @Get('getAllAdminDetails')
  async funGetAllAdminDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllAdminDetails(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region add or update sub role
  @Post('updateRoleAccess')
  async updateRoleAccess(@Body() body, @Res() res) {
    try {
      const data: any = await this.roleManagementService.updateRoleAccess(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Edit Admin
  @Post('editAdmin')
  async editAdmin(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.editAdmin(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region create admin role
  @Post('createAdminRole')
  async createAdminRole(@Body() body, @Res() res) {
    try {
      const data: any = await this.roleManagementService.createAdminRole(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region add or update sub role
  @Post('addOrUpdateSubRole')
  async addOrUpdateSubRoleModel(@Body() body, @Res() res) {
    try {
      const data: any =
        await this.roleManagementService.addOrUpdateSubRoleModel(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region add access List
  @Post('addAccessOfRole')
  async addAccessOfRole(@Body() body, @Res() res) {
    try {
      const data: any = await this.roleManagementService.addAccessOfRole(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region create Admin
  @Post('createAdmin')
  async createAdmin(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.createAdmin(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region Get access List
  @Get('getAccessOfRole')
  async getAccessOfRole(@Res() res) {
    try {
      const data: any = await this.roleManagementService.getAccessOfRole();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region create role model
  @Post('createRoleModel')
  async createRoleModel(@Body() body, @Res() res) {
    try {
      const data: any = await this.roleManagementService.createRoleModel(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Post('login')
  async login(@Body() body, @Req() req, @Res() res) {
    try {
      const token = req.headers['access-token'];
      const resData: any = await this.service.login(body, token);
      if (resData == k500Error) return res.json(kInternalError);
      if (resData.statusCode) return res.json(resData);
      return res.json({ ...kSuccessData, data: resData });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('logout')
  async logout(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.logOut(body);
      if (data == k500Error) return res.json(kInternalError);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getChangeLogs')
  async funGetChangeLogs(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getChangeLogs(query);
      if (data == k500Error) return res.json(kInternalError);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('removeBlacklistCompanies')
  async funcRemoveBlacklistCompanies(@Body() body, @Res() res) {
    try {
      const result: any = await this.service.removeBlacklistCompanies(body);
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('syncCreditAnalystInRedis')
  async syncCreditAnalystInRedis(@Res() res) {
    try {
      const result: any = await this.service.syncCreditAnalystInRedis();
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('syncCSEInRedis')
  async syncCSEInRedis(@Res() res) {
    try {
      const result: any = await this.service.syncCSEInRedis();
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // checkWaiverPayment
  @Get('checkWaiverPayment')
  async funCheckWaiverPayment(@Res() res) {
    try {
      const data: any = await this.logsService.funCheckWaiverPayment();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // Disable the Admin if not active for more than 30 days
  @Post('updateInActiveUsers')
  async funupdateInActiveUsers(@Res() res) {
    const data: any = await this.service.updateInActiveUsers();
    if (data.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }

  @Post('syncTempListForInsuranceFAQ')
  async syncTempListForInsuranceFAQ(@Res() res) {
    try {
      const result: any = await this.service.syncTempListForInsuranceFAQ();
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('syncTempListTempIdDataOnRedis')
  async syncTempListTempIdDataOnRedis(@Res() res) {
    try {
      const result: any = await this.service.syncTempListTempIdDataOnRedis();
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // UserForm

  @Get('userFormRegistration')
  async userFormRegistration(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getRegistrationFormUsers(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  //#region Get Duplicate Trasactions data
  @Get('duplicateTransactionUsers')
  async duplicateTransactionUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDuplicateTransactionUsers(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Get Duplicate Account transaction data
  @Get('duplicateAccountTransactions')
  async funDuplicateAccountTrasnaction(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funDuplicateAccountTransaction(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Get Transaction Matched Users of Perticular User
  @Get('getTransactionMatchedUser')
  async getTransactionMatchedUser(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getTransactionMatchedUser(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion
}
