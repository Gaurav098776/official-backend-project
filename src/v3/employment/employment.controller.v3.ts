// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { UserServiceV3 } from '../user/user.service.v3';
import { EmploymentServiceV3 } from './employment.service.v3';
import { IPConfig } from 'src/utils/custom.decorators';

@Controller('employment')
export class EmploymentControllerV3 {
  constructor(
    private readonly service: EmploymentServiceV3,
    private readonly userService: UserServiceV3,
  ) {}

  @Get('searchCompany')
  async funSearchCompany(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.searchCompany(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Sector, Designation, Top 10 Companies
  @Get('necessaryList')
  async funNecessaryList(@Res() res) {
    try {
      const data: any = await this.service.getNecessaryList();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('submitDetails')
  async funSubmitDetails(@Body() body, @Res() res) {
    try {
      let data: any = await this.service.submitDetails(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Work email -> Add email or Skip email
  @Post('updateWorkEmail')
  async funUpdateWorkEmail(@IPConfig() ip, @Body() body, @Res() res) {
    try {
      let data: any = await this.service.updateWorkEmail(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        const result = await this.userService.routeDetails({
          id: body.userId,
          ip,
        });

        if (result?.message) return res.send(result);
        if (data?.otpBoxValue) {
          delete result.continueRoute;
          delete data.needUserInfo;
          data = { ...result, ...data };
        } else data = result;
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Work email -> Verify otp
  @Post('verifyOTP')
  async funVerifyOTP(@IPConfig() ip, @Body() body, @Res() res) {
    try {
      let data: any = await this.service.verifyOTP(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId, ip });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Work email -> Resend otp
  @Post('generateOTP')
  async funGenerateOTP(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.generateOTP(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Post('validateManualEmails')
  async funValidateManualEmail(@IPConfig() ip, @Body() body, @Res() res) {
    try {
      let data: any = {};
      const responseData: any = await this.service.validateManualEmails(body);
      if (responseData?.message) return res.send(responseData);
      if (responseData.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId, ip });
        if (data?.message) return res.send(data);
        if (responseData.popCount) data.popCount = responseData.popCount;
      }
      return res.send({ ...kSuccessData, data: { ...data, ...responseData } });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  // Salary slip -> upload and validate
  @Post('validateSalarySlip')
  async funValidateSalarySlip(@IPConfig() ip, @Body() body, @Res() res) {
    try {
      let data: any = await this.service.validateSalarySlip(body);
      if (data?.message) return res.send(data);
      if (data.needUserInfo) {
        data = await this.userService.routeDetails({ id: body.userId, ip });
        if (data?.message) return res.send(data);
      }
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  //#region update company verify date
  @Get('verifiedCompanyDate')
  async verifiedCompanyDate(@Query() query, @Res() res) {
    try {
      let data = await this.service.verifiedCompanyDate(query);
      if (data?.message) return res.json(data);
      data = await this.userService.routeDetails({ id: query.userId });
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('empDetailsForBankingPro')
  async funEmpDetailsForBankingPro(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.empDetailsForBankingPro(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('getFieldsForSameCompany')
  async funGetFieldsForSameCompany(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getFieldsForSameCompany(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (e) {
      return res.json(kInternalError);
    }
  }

  //#region Get Employment Data from EmpId
  @Get('getEmployementData')
  async getEmployementData(@Query() query, @Res() res) {
    try {
      const data = await this.service.getEmployementData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
  //#endregion
}
