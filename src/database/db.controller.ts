// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { DataBaseService } from './db.service';
import { DbQueryInterface } from './db.query.interface';
import { APILogsEntity } from 'src/entities/apilog.entity';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { DevOpsGuard } from 'src/authentication/auth.guard';

@Controller('admin/database')
export class DBController {
  constructor(private readonly service: DataBaseService) {}

  @Post('injectQuery')
  async funInjectQuery(@Body() body, @Res() res) {
    try {
      const options: DbQueryInterface = {
        entity: APILogsEntity,
        type: 'CS',
        rawQuery: body.rawQuery,
        fineTuneRawQuery: true,
      };
      if (!body.rawQuery?.startsWith('SELECT '))
        return res.send(k422ErrorMessage());
      const data: any = await this.service.injectQuery(options);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @Get('getDatabaseQueryPerformance')
  async getDatabaseQueryPerformance(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getDatabaseQueryPerformance(query);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @UseGuards(DevOpsGuard)
  @Get('cacheDetails')
  async funCacheDetails(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.cacheDetails(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }

  @UseGuards(DevOpsGuard)
  @Post('updateCacheDetails')
  async funUpdateCacheDetails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateCacheDetails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      return res.send(kInternalError);
    }
  }
}
