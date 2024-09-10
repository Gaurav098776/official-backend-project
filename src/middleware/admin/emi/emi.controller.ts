// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { kInternalError } from 'src/constants/responses';
import { EMIService } from './emi.service';
import { kSuccessData } from 'src/constants/responses';

@Controller('admin/emi')
export class EmiController {
  constructor(private readonly service: EMIService) {}
  @Get('upcomingAndDueEmiNotify')
  async funNotifyUpcomingAndDueEmis(@Res() res) {
    try {
      this.service.funNotifyUpcomingAndDueEmis();
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('repaymentStatus')
  async funRepaymentStatus(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.repaymentStatus(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('updateAllEmiDues')
  async funUpdateAllEmiDues(@Res() res) {
    try {
      const data: any = await this.service.updateAllEmiDues();
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('updateAllEmiDuesPenalty')
  async updateAllEmiDuesPenalty(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.updateAllEmiDuesPenalty(query);
      if (data?.message) return res.send(data);
      return res.send(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  //#region Dashboard
  @Get('statusInsights')
  async funStatusInsights(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.statusInsights(query);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
  //#endregion Dashboard

  //#region send overdue notification
  @Get('sendOverDueNotification')
  async funSendOverDueNotification(@Query() query, @Res() res) {
    try {
      this.service.funSendOverDueNotification(query);
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  //#endregion

  @Get('getUpcomingEmi')
  async funGetTodayEmiData(@Res() res, @Query() query) {
    try {
      let finalRes;
      if (query.isCountOnly == 'true')
        finalRes = await this.service.upcomingEmiGetCount(query);
      else finalRes = await this.service.getEmidateRange(query);

      if (finalRes?.message) return res.json(finalRes);
      return res.json({ ...kSuccessData, data: finalRes });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  // Check users balance 1 day before the emi date
  @Post('checkPreEMIBalance')
  async funCheckPreEMIBalance(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.checkPreEMIBalance(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  // Purpose -> Cron
  @Get('addECSbounceCharge')
  async funAddEMIecsBounceCharge(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.addECSbounceCharge(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('FilteredUserEMIDataForWhattsappMessage')
  async funFilteredUserEMIDataForWhattsappMessage(@Res() res) {
    try {
      this.service.funFilteredUserEMIDataForWhattsappMessage();
      return res.json(kSuccessData);
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('checkCreatedEmis')
  async funcheckCreatedEmis(@Res() res) {
    try {
      const data: any = await this.service.checkCreatedEmis();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('todaysEmiCalling')
  async todaysEmiCalling(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.todaysEmiCalling(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('callUpcomingEmiContacts')
  async upcomingEmiContacts(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.upcomingEmiCalling(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data: data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('getPreEMIAAUsersData')
  async funGetPreEMIDataAA(@Res() res) {
    try {
      const data: any = await this.service.getPreEMIAAUsersData();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Post('getPostEMIAAUsersData')
  async funGetPostEMIDataAA(@Res() res) {
    try {
      const data: any = await this.service.getPostEMIAAUsersData();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }
}
