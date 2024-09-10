import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { MAX_BEARING_LIMIT, MAX_LAT_LIMIT } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { kNoDataFound, kServiceUnavailableRoute } from 'src/constants/strings';
import { MasterEntity } from 'src/entities/master.entity';
import { RedisService } from 'src/redis/redis.service';
import { GoogleCordinatesRepository } from 'src/repositories/googleCordinates.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { MasterRepository } from 'src/repositories/master.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { DefaulterSharedService } from 'src/shared/defaulter.shared.service';
import { APIService } from 'src/utils/api.service';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class LocationServiceV4 {
  constructor(
    private readonly defaulterService: DefaulterSharedService,
    private readonly apiService: APIService,
    private readonly masterRepo: MasterRepository,
    private readonly repository: LocationRepository,
    private readonly typeService: TypeService,
    private readonly userRepo: UserRepository,
    private readonly googleCordinatesRepo: GoogleCordinatesRepository,
    private readonly redisService: RedisService,
  ) {}

  async syncData(reqData) {
    try {
      // Params validation
      const lat = reqData.lat;
      if (!lat) return kParamMissing('lat');
      const long = reqData.long;
      if (!long) return kParamMissing('long');
      const location = reqData.location;
      if (!location) return kParamMissing('location');
      const userId = reqData.userId;
      if (!userId) return kParamMissing('userId');

      if (reqData?.address?.countryName != 'India') {
        await this.syncNearestUsers(userId);
        let loanStatus = await this.masterRepo.getRowWhereData(['id'], {
          where: { 'status.loan': 6, userId },
        });
        if (!loanStatus) return { continueRoute: kServiceUnavailableRoute };
      }
      // Get bearing angle
      const bearing: any = await this.typeService.getBearingFromLatLong(
        lat,
        long,
      );
      if (bearing == k500Error) return kInternalError;
      reqData.bearing = bearing;

      // Check duplication
      const existingData: any = await this.checkIfAlreadyExists(reqData);
      // if (existingData.message) return {};

      // Sync latest location for user profile
      const updateResponse: any = await this.syncLatestLocationForUserProfile(
        reqData,
      );
      if (updateResponse.message) return updateResponse;

      // Add location data
      const createdData = await this.repository.createRowData(reqData);
      if (createdData == k500Error) return kInternalError;

      const key = `${userId}_USER_BASIC_DETAILS`;
      await this.redisService.del(key);

      // Check nearest users
      await this.syncNearestUsers(userId);
      if (reqData?.address?.countryName != 'India')
        return { continueRoute: kServiceUnavailableRoute };
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // checks if particular location exists for today for particular user
  private async checkIfAlreadyExists(reqData) {
    try {
      const bearing = reqData.bearing;
      const minBearingLimit = (+bearing - MAX_BEARING_LIMIT).toString();
      const maxBearingLimit = (+bearing + MAX_BEARING_LIMIT).toString();
      const minLatLimit = (reqData.lat - MAX_LAT_LIMIT).toString();
      const maxLatLimit = (reqData.lat + MAX_BEARING_LIMIT).toString();

      const todayDate = this.typeService.getGlobalDate(new Date()).toJSON();
      const range = this.typeService.getUTCDateRange(todayDate, todayDate);
      const options = {
        where: {
          userId: reqData.userId,
          bearing: {
            [Op.gte]: minBearingLimit,
            [Op.lte]: maxBearingLimit,
          },
          lat: {
            [Op.gte]: minLatLimit,
            [Op.lte]: maxLatLimit,
          },
          createdAt: {
            [Op.gte]: range.fromDate,
            [Op.lte]: range.endDate,
          },
        },
      };
      const attributes = ['id'];
      const isExists: any = await this.repository.getRowWhereData(
        attributes,
        options,
      );
      if (isExists == k500Error) return kInternalError;
      if (isExists) return k422ErrorMessage('Location already exists');
      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Add last location data in master and user data for admin panel
  async syncLatestLocationForUserProfile(reqData) {
    try {
      const masterInclude: any = { model: MasterEntity };
      masterInclude.attributes = ['miscData'];
      const include = [masterInclude];
      const attributes = ['masterId', 'stage'];
      const userId = reqData.userId;
      const options = { include, where: { id: userId } };

      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (userData == k500Error) return kInternalError;
      if (!userData) return k422ErrorMessage(kNoDataFound);
      const masterData = userData.masterData ?? {};
      const masterId = userData.masterId;
      const miscData = masterData.miscData ?? {};
      miscData.lastLocation = reqData.location;
      miscData.lastLat = reqData.lat;
      miscData.lastLong = reqData.long;
      miscData.lastLocationDateTime = new Date().getTime();
      miscData.locationStage = userData?.stage;

      // Update master data
      let updatedData: any = { miscData };
      let updateResponse: any = await this.masterRepo.updateRowData(
        updatedData,
        masterId,
      );
      if (updateResponse == k500Error) return kInternalError;
      if (updateResponse[0] == 1) {
        const key = `${userId}_USER_PROFILE`;
        await this.redisService.del(key);
      }
      // Update user data
      updatedData = {
        city: reqData.city?.toLowerCase(),
        state: reqData.state?.toLowerCase(),
      };
      updateResponse = await this.userRepo.updateRowData(updatedData, userId);
      if (updateResponse == k500Error) return kInternalError;

      return {};
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  // Check nearest users
  async syncNearestUsers(userId) {
    try {
      const normalUserData: any = await this.defaulterService.findNearestUser(
        userId,
      );
      if (!normalUserData?.message) {
        const defaulterCount = normalUserData.defaulter;
        await this.userRepo.updateRowData({ defaulterCount }, userId);
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }

  async coordinatesToAddress(lat: number, lng: number) {
    try {
      const apiParams = {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_MAP_API_KEY,
      };
      const googleRes = await this.apiService.get(
        process.env.GEOCODE_API_URL,
        apiParams,
      );
      if (!googleRes || googleRes === k500Error) return kInternalError;
      if (!googleRes.status || googleRes.status !== 'OK') return k500Error;
      if (!googleRes.results || googleRes.results.length === 0)
        return kNoDataFound;
      const finalAddrData = [];
      for (let i = 0; i < googleRes.results.length; i++) {
        try {
          const addressItem = googleRes.results[i];
          const editedAddrData: any =
            this.typeService._convertGoogleAddress(addressItem);
          if (!editedAddrData || editedAddrData === k500Error) continue;

          const coordinatesCreateObj = {
            lat: editedAddrData.coordinates.latitude,
            lng: editedAddrData.coordinates.longitude,
            bearing: this.typeService.getBearingFromLatLong(
              editedAddrData.coordinates.latitude,
              editedAddrData.coordinates.longitude,
            ),
            googleResponse: JSON.stringify(editedAddrData),
          };
          await this.googleCordinatesRepo.create(coordinatesCreateObj);

          const preciseObject: any = { ...coordinatesCreateObj };
          preciseObject.lat = lat;
          preciseObject.lng = lng;
          preciseObject.bearing = this.typeService.getBearingFromLatLong(
            lat,
            lng,
          );
          await this.googleCordinatesRepo.create(preciseObject);

          finalAddrData.push(JSON.stringify(editedAddrData));
          break;
        } catch (error) {}
      }
      return finalAddrData;
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
