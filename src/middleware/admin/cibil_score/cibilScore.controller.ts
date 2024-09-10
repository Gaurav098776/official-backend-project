import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { CIBILScoreService } from './cibilScore.service';
import { CIBILTxtToObjectService } from './cibilTxtToObject.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';
import { MigrationSharedService } from 'src/shared/migration.service';

@Controller('admin/cibilScore')
export class CIBILScoreController {
  constructor(
    private readonly service: CIBILScoreService,
    private readonly txtToObjService: CIBILTxtToObjectService,
    private readonly migrationSharedService: MigrationSharedService,
  ) {}

  @Get('/getCIBILScore')
  async getCIBILScore(@Query() query, @Res() res) {
    try {
      const result = await this.service.getCIBILScore(query);
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('/txtToExcel')
  async getTxtToExcel(@Query() query, @Res() res) {
    try {
      const result: any = await this.txtToObjService.getTxtToExcel(query);
      if (result?.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // Add CIBIL Trigger Data from Excel
  @Post('addCIBILTriggerData')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async addCIBILTriggerData(@UploadedFile() file, @Body() body, @Res() res) {
    try {
      body.file = file;
      const data: any = await this.service.addCIBILTriggerData(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // Get CIBIL Trigger Data
  @Get('getCIBILTriggerData')
  async getCIBILTriggerData(@Query() query, @Res() res) {
    try {
      const result: any = await this.service.getCIBILTriggerData(query);
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('cibilFetchDateMigrate')
  async funCibilFetchDateMigrate(@Body() body, @Res() res) {
    try {
      const result: any =
        await this.migrationSharedService.funCibilFetchDateMigrate(body);
      if (result.message) return res.json(result);
      return res.json({ ...kSuccessData, data: result });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
