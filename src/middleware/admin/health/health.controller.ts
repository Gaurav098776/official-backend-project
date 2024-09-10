// Imports
import { HealthService } from './health.service';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('admin/health')
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get('statusCheck')
  async funStatusCheck(@Query() query) {
    return await this.service.statusCheck(query);
  }
}
