import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { ScoreService } from './score.service';

@Controller('admin/score/')
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  //#region Getting all Salary Grades
  @Get('getAllSalaryGrade')
  async funGetAllSalaryGrade(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.funGetAllSalaryGrade(query);
      if (result?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //#region Getting all Score grades
  @Get('getAllScoreGrade')
  async funGetAllScoreGrade(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.funGetAllScoreGrade(query);
      if (result?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endRegion

  //#region getting score versions data
  @Get('getAllScoreVersionData')
  async funGetAllScoreVersionData(@Query() query, @Res() res) {
    try {
      const page = query?.page ?? 1;
      const data: any = await this.service.getAllVersionData(+page);
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //#region getting scoring data
  @Get('getScoringData')
  async getBasicScoringData(@Res() res) {
    try {
      const data: any = await this.service.allScoringByField();
      if (data?.message) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  //#endregion

  //#region getting all employment sectors
  @Get('/getAllEmploymentSectors')
  async findAllSector(@Res() res) {
    try {
      const sectorData: any = await this.service.getAllSectorData();
      if (sectorData?.message) return res.json(sectorData);
      return res.json({ ...kSuccessData, data: sectorData });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
