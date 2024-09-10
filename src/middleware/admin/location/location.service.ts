import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  MAX_BEARING_ADDRESS_LIMIT,
  MAX_BEARING_LIMIT,
  MAX_LAT_ADDRESS_LIMIT,
  MAX_LAT_LIMIT,
  MAX_SINGLE_BEARING_LIMIT,
  MAX_SINGLE_LAT_LIMIT,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { kInternalError } from 'src/constants/responses';
import { LocationEntity } from 'src/entities/location.entity';
import { GoogleCordinatesRepository } from 'src/repositories/googleCordinates.repository';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class LocationService {
  constructor(
    private readonly typeService: TypeService,
    private readonly googleCordinatesRepo: GoogleCordinatesRepository,
  ) {}

  isTooNearest(
    locationA: LocationEntity,
    locationB: LocationEntity,
    singleRange = false,
  ) {
    try {
      const bearingLimit = singleRange
        ? MAX_SINGLE_BEARING_LIMIT
        : MAX_BEARING_LIMIT;
      const latLimit = singleRange ? MAX_SINGLE_LAT_LIMIT : MAX_LAT_LIMIT;
      const maxBearingLimit = locationA.bearing + bearingLimit;
      const minBearingLimit = locationA.bearing - bearingLimit;

      const maxLatLimit = (parseFloat(locationA.lat) + latLimit).toString();
      const minLatLimit = (parseFloat(locationA.lat) - latLimit).toString();
      const targetBearing = locationB.bearing;
      const isBearingMatched =
        targetBearing > minBearingLimit && targetBearing < maxBearingLimit;
      const targetLat = locationB.lat;
      const isLatMatched = targetLat > minLatLimit && targetLat < maxLatLimit;
      if (isBearingMatched && isLatMatched) return true;
      return false;
    } catch (error) {
      return false;
    }
  }

  async getClosestLatLongAddress(lat: number, lng: number) {
    try {
      const bearing = this.typeService.getBearingFromLatLong(lat, lng);
      const maxBearingLimit = bearing + MAX_BEARING_ADDRESS_LIMIT;
      const minBearingLimit = bearing - MAX_BEARING_ADDRESS_LIMIT;
      const maxLatLimit = lat + MAX_LAT_ADDRESS_LIMIT;
      const minLatLimit = lat - MAX_LAT_ADDRESS_LIMIT;
      const attributes = ['googleResponse'];
      const options = {
        where: {
          bearing: {
            [Op.lte]: maxBearingLimit,
            [Op.gte]: minBearingLimit,
          },
          lat: {
            [Op.lte]: maxLatLimit,
            [Op.gte]: minLatLimit,
          },
        },
        raw: true,
        nest: true,
      };
      const fetchData: any = await this.googleCordinatesRepo.getRowWhereData(
        attributes,
        options,
      );
      if (fetchData == k500Error) return kInternalError;
      return fetchData ? [fetchData.googleResponse] : [];
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
