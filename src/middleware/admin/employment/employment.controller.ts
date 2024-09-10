// Imports
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { k500Error } from 'src/constants/misc';
import { Post } from '@nestjs/common/decorators';
import { SalaryService } from './salary.service';
import { WorkMailService } from './workMail.service';
import { EmploymentService } from './employment.service';
import { Body, Controller, Get, Query, Res } from '@nestjs/common';

@Controller('admin/employment')
export class EmploymentController {
  constructor(
    private readonly service: EmploymentService,
    private readonly salarySlipService: SalaryService,
    private readonly workMailService: WorkMailService,
  ) {}

  //#region get company verification Data
  @Get('allCompanyVerificationData')
  async funGetverificationData(@Query() query, @Res() res) {
    try {
      const result = await this.service.getVerificationData(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('allSalarySlipVerificationData')
  // @UseGuards(AdminAuthCheck)
  async funGetSalarySlip(@Query() query, @Res() res) {
    try {
      if (!query.status) return res.json(kParamsMissing);
      const result: any = await this.salarySlipService.getSalarySlipData(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get all work mail
  @Get('allWorkMailVerificationData')
  async funGetWorkMailData(@Query() query, @Res() res) {
    try {
      const result = await this.workMailService.getWorkMailData(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('changeEmployementStatus')
  async funchangeEmployementStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.changeEmployementData(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('getCompanyActivityDetails')
  async funGetCompanyActivityDetails(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.getCompanyActivity(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getEmploymentDetails')
  async funGetEmploymentDetails(@Query() query, @Res() res) {
    try {
      const result = await this.service.getEmploymentDetails(query);
      if (result === k500Error) return res.json(kInternalError);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get company details history
  @Get('getUserWorkBasicDetailsHistory')
  async funGetUserWorkBasicDetailsHistory(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.fetchUserWorkBasicDetailsHistory(
        query,
      );
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  //#region get work mail history
  @Get('getUserWorkEmailDetailsHistory')
  async funGetUserWorkEmailDetailsHistory(@Query() query, @Res() res) {
    try {
      const data: any =
        await this.workMailService.fetchUserWorkEmailDetailsHistory(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region get salary slip history
  @Get('getUserSalarySlipDetailsHistory')
  async funGetUserSalarySlipDetailsHistory(@Query() query, @Res() res) {
    try {
      const data: any =
        await this.salarySlipService.fetchUserSalarySlipDetailsHistory(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  //#region Archive notification older than 6 months
  @Post('archiveOldNotifications')
  async funArchiveNotification(@Res() res) {
    try {
      const data: any = await this.workMailService.archiveOldNotifications();
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion
}
//#endregion
