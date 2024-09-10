import { Controller, Get, Query, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { AdminListService } from './admin.list.service';

@Controller('admin/list/')
export class AdminListController {
  constructor(private readonly service: AdminListService) {}

  @Get('departmentExecutive')
  async funDepartmentExecutive(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.departmentExecutive(query);
      if (data.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
