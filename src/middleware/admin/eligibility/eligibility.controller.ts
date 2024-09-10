// Imports
import { KLOANCHANGEABLE } from 'src/constants/strings';
import { EligibilityService } from './eligibility.service';
import { UserServiceV4 } from 'src/v4/user/user.service.v4';
import { validateRights } from 'src/authentication/auth.guard';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { EligibilitySharedService } from 'src/shared/eligibility.shared.service';

@Controller('admin/eligibility')
export class EligibilityController {
  constructor(
    private readonly service: EligibilityService,
    private readonly eligibilitySharedService: EligibilitySharedService,
    private readonly userService: UserServiceV4,
  ) {}

  @Post('finalApproval')
  async funFinalApproval(@Body() body, @Res() res) {
    try {
      let data: any = await this.eligibilitySharedService.finalApproval(body);
      if (data?.message) return res.send(data);

      // Refresh user stage
      if (data?.needUserInfo === true) {
        data = await this.userService.routeDetails({ id: body.userId });
        if (data?.message) return res.send(data);
      }

      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('rejectLoanFromAdmin')
  async funrejectLoanFromAdmin(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.rejectLoanFromAdmin(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @UseGuards(validateRights(KLOANCHANGEABLE))
  @Post('reinitiateToFinalBucket')
  async funReinitiateToFinalBucket(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.reinitiateToFinalBucket(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migreateLoanAutomation')
  async migreateLoanAutomation(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.migreateLoanAutomation();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getList')
  async funGetStates(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getStates(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('updateEligibility')
  async funUpdateStateEligibility(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updatestateEligibilityData(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
