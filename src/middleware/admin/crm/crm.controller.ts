import { Controller, Get, Res, Query, Post, Body } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';

import { CRMService } from './crm.service';

@Controller('admin/crm')
export class CRMController {
  constructor(private readonly service: CRMService) {}
  @Get('migrateNewCrmTitles')
  async migrateCrnTitles(@Res() res) {
    try {
      const data = await this.service.migrateCrmTitles();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('createCrm')
  async funCreateCrm(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.createCrm(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getTodayCrmData')
  async fungetTodayCRMData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getTodayCrmData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('getCrmUserActivity')
  async funCrmUseActivity(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetUserCrmActivity(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/getSourceData')
  async getSource(@Res() res, @Query() query) {
    try {
      const data = await this.service.getSourceData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/getCrmTitleData')
  async getCrmTitleData(@Res() res, @Query() query) {
    try {
      const data: any = await this.service.getTitlesData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getDispositionData')
  async funGetDispositionData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDispositionData(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('/getCrmReasons')
  async funGetCrmReasons(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getCrmReasons(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getUnreadCrmDues')
  async funUnreadAdminCrmDues(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.fetchUnreadDueCrm(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Post('readCrmDues')
  async funReadCrmDues(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateUnreadDueCrms(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
  @Get('/migrateCrm')
  async funMigrateCrm(@Res() res) {
    try {
      const data: any = await this.service.migrateCrmData();
      if (data.message) return res.json(data);
      return res.json(data);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('/migrateOldCrmTitle')
  async funMigrateCrmTitle(@Res() res) {
    try {
      const data: any = await this.service.migaretCrmTitleData();
      if (data.message) return res.json(data);
      return res.json(data);
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('updateDisposition')
  async funUpdateDisposition(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateDisposition(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.send(kInternalError);
    }
  }

  @Get('getCrmTitleByAdmin')
  async getCrmTitleByAdmin(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getCrmTitleByAdmin(query);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Post('updateTemplateList')
  async funUpdateTemplateList(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateTemplateList(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }
}
