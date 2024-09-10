import { Controller, Get, Query, Res } from '@nestjs/common';
import { collectionDashboardService } from './collectionDashboard.service';
import { kInternalError, kSuccessData } from 'src/constants/responses';

@Controller('/admin/collectionDashboard')
export class CollectionDashboardController {
  constructor(private readonly collectionService: collectionDashboardService) {}

  @Get('totalCollection')
  async getTotalCollection(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.totalCollection(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('collectionChartData')
  async getcollectionChartData(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.collectionChartData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('collectionGoalData')
  async getcollectionGoalData(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.collectionGoalData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('ptpData')
  async getptpData(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.ptpData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('crmActivity')
  async getcrmActivity(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.crmActivity(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('recentCrmActivity')
  async getrecentCrmActivity(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.recentCrmActivity(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('bucketWiseCollection')
  async getbucketWiseCollection(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.bucketWiseCollection(
        query,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('crmStatistics')
  async getcrmStatistics(@Query() query, @Res() res) {
    try {
      const data: any = await this.collectionService.crmStatistics(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      console.error('Error in: ', error);
      return res.json(kInternalError);
    }
  }

  @Get('getCallCountDashboard')
  async getCallCountDashboard(@Query() query, @Res() res) {
    const data: any = await this.collectionService.getCallCountDashboard(query);
    if (data?.message) return res.json(data);
    return res.json({ ...kSuccessData, data });
  }
}
