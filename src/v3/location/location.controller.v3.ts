import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  kBadRequest,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { LocationServiceV3 } from './location.service.v3';
import { k500Error } from 'src/constants/misc';
import { LocationService } from 'src/admin/location/location.service';

@Controller('location')
export class LocationControllerV3 {
  constructor(
    private readonly service: LocationServiceV3,
    private readonly locationService: LocationService,
  ) {}

  @Post('syncData')
  async funSyncData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.syncData(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Get('coordinatesToAddress')
  async funConvertCoordinatesToAddr(@Query() query, @Res() res) {
    try {
      if (!query.lat || !query.lng) return res.json(kBadRequest);
      const lat = +query.lat;
      const lng = +query.lng;
      let finalData;
      // find if already exist
      finalData = await this.locationService.getClosestLatLongAddress(lat, lng);
      if (!finalData || finalData === k500Error)
        return res.json(kInternalError);
      if (finalData.length === 0) {
        finalData = await this.service.coordinatesToAddress(lat, lng);
        if (!finalData || finalData === k500Error) return kInternalError;
      }
      return res.json({ ...kSuccessData, data: finalData });
    } catch (error) {
      return kInternalError;
    }
  }
}
