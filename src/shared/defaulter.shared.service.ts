// Imports
import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  MAX_BEARING_LIMIT,
  MAX_LAT_LIMIT,
  advocate_role,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';
import { EmiEntity } from 'src/entities/emi.entity';
import { AdminRepository } from 'src/repositories/admin.repository';
import { LocationRepository } from 'src/repositories/location.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { AssignmentSharedService } from './assignment.service';
import { regEmail } from 'src/constants/validation';
import { kValidEmail } from 'src/constants/strings';
import { LocationEntity } from 'src/entities/location.entity';
import { RepositoryManager } from 'src/repositories/repository.manager';

@Injectable()
export class DefaulterSharedService {
  constructor(
    private readonly locationRepo: LocationRepository,
    private readonly userRepo: UserRepository,
    private readonly adminRepo: AdminRepository,
    private readonly sharedAssingService: AssignmentSharedService,
    private readonly repo: RepositoryManager,
  ) {}

  async findNearestUser(userId) {
    const data = { defaulter: 0, normal: 0, defaulterUser: [], normalUser: [] };
    try {
      const rawQuery = `SELECT "bearing", "id", "lat", "long"
      FROM "LocationEntities" 
      WHERE "userId" = '${userId}'`;
      const outputList = await this.repo.injectRawQuery(
        LocationEntity,
        rawQuery,
        { source: 'REPLICA' },
      );
      if (outputList == k500Error) throw new Error();

      const rowData = this.removeClosestDuplicates(outputList);
      return await this.getNearestByAllLocations(rowData, userId);
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region remove close duplicate
  private removeClosestDuplicates(locations) {
    const accurateLocations = [];
    try {
      for (let index = 0; index < locations.length; index++) {
        try {
          const locationData = locations[index];
          const isAdded = accurateLocations.find((element) => {
            const lat = parseFloat(element.lat);
            const difference = Math.abs(lat - parseFloat(locationData.lat));
            return difference <= MAX_LAT_LIMIT;
          });
          if (!isAdded) accurateLocations.push(locationData);
        } catch (erorr) {}
      }
    } catch (error) {}
    return accurateLocations;
  }
  //#endregion

  //#region  git data from db
  private async getNearestByAllLocations(locations, userId: string) {
    const data = { defaulter: 0, normal: 0, defaulterUser: [], normalUser: [] };
    try {
      const tempArray = [];
      for (let index = 0; index < locations.length; index++) {
        try {
          const location = locations[index];
          const maxBearingLimit = location.bearing + MAX_BEARING_LIMIT;
          const minBearingLimit = location.bearing - MAX_BEARING_LIMIT;
          const maxLat = (parseFloat(location.lat) + MAX_LAT_LIMIT).toString();
          const minLat = (parseFloat(location.lat) - MAX_LAT_LIMIT).toString();
          tempArray.push({
            bearing: { [Op.lte]: maxBearingLimit, [Op.gte]: minBearingLimit },
            lat: { [Op.lte]: maxLat, [Op.gte]: minLat },
          });
        } catch (error) {}
      }

      const att = ['userId', 'location', 'lat', 'long', 'bearing'];
      const orp = {
        where: { [Op.or]: tempArray, userId: { [Op.ne]: userId } },
      };
      const result = await this.locationRepo.getTableWhereData(att, orp);
      if (!result || result === k500Error) return data;
      const userList = [];
      result.forEach((ele) => {
        try {
          userList.push(ele.userId);
        } catch (error) {}
      });
      if (userList.length > 0) {
        const options = {
          where: { id: userList },
          include: [
            {
              model: EmiEntity,
              attributes: ['payment_due_status', 'penalty_days'],
            },
          ],
        };
        const att1 = ['id', 'fullName'];
        const userData = await this.userRepo.getTableWhereData(att1, options);
        if (!userData || userData === k500Error) return data;
        for (let index = 0; index < userData.length; index++) {
          try {
            const user = userData[index];
            const userLocation = result.find((f) => f.userId === user.id);
            if (user?.emiData)
              user?.emiData.sort(
                (a, b) => (b?.penalty_days ?? -1) - (a?.penalty_days ?? -1),
              );
            const find = user?.emiData.find(
              (f) => (f?.payment_due_status ?? '') === '1',
            );
            userLocation.fullName = user?.fullName;
            const dueDay = find?.penalty_days ?? 0;
            if (find) {
              userLocation.status = dueDay > 5 ? 'DEFAULTER' : 'DELAY';
              userLocation.dueDay = dueDay;
              data.defaulter += 1;
              data.defaulterUser.push(userLocation);
            } else {
              userLocation.status = 'NORMAL';
              userLocation.dueDay = dueDay;
              data.normal += 1;
              data.normalUser.push(userLocation);
            }
          } catch (error) {}
        }
      }
    } catch (error) {}
    return data;
  }
  async updateAdvocateDetails(passData, updateData = [], isUpdate = false) {
    try {
      if (isUpdate) {
        if (!updateData) return k422ErrorMessage('Advocate data not updated!');
        for (let i = 0; i < updateData.length; i++) {
          try {
            let admin = updateData[i];
            const updateAdmin = await this.adminRepo.updateRowData(
              { otherData: admin?.otherData ?? {} },
              admin.adminId,
            );
            if (updateAdmin == k500Error || updateAdmin[0] == 0)
              return k422ErrorMessage('Exiting advocates not updates');
          } catch (error) {}
        }
        return {};
      } else {
        if (!passData?.case_per) passData.case_per = 0;
        //advocate assign percantage
        let case_per = +(passData?.case_per ?? 0);
        const signature_image = passData?.signature_image;
        const address = passData?.address;
        const enrollmentNo = passData?.enrollmentNo;
        const adminId = passData?.adminId;
        const personalEmail = passData?.personalEmail;
        if (!adminId && !signature_image)
          return k422ErrorMessage('signature_image');
        else if (!adminId && !address) return k422ErrorMessage('address');
        else if (!adminId && !enrollmentNo)
          return k422ErrorMessage('enrollmentNo');
        else if (!adminId && !personalEmail)
          return k422ErrorMessage('personalEmail');
        else if (!adminId && personalEmail && !regEmail(personalEmail))
          return k422ErrorMessage(kValidEmail);

        //get all advocate data
        let advocateData =
          await this.sharedAssingService.fetchAdminAccordingRole(
            advocate_role,
            true,
          );
        if (advocateData == k500Error) return kInternalError;
        //get last advocate data
        let lastAdvocate = advocateData.find((ele) => ele.id != (adminId ?? 0));
        //check existing udpate data
        let findAdvocate = advocateData.find((ele) => ele.id == adminId);
        let exitingAdvocateUpdate: any = [];
        let totalPer = 100 - case_per;

        if (findAdvocate) {
          //prepare update
          passData.case_per =
            case_per ?? findAdvocate?.otherData?.case_per ?? 0;
          passData.signature_image =
            signature_image ?? findAdvocate?.otherData?.signature_image;
          passData.address = address ?? findAdvocate?.otherData?.address;
          passData.enrollmentNo =
            enrollmentNo ?? findAdvocate?.otherData?.address;
          passData.personalEmail =
            personalEmail ?? findAdvocate?.otherData?.personalEmail;
          //update prepare done

          const beforePEr = findAdvocate?.otherData?.case_per ?? 0;
          findAdvocate.otherData.case_per = case_per;
          const remaing = Math.abs(case_per - beforePEr) * 100;
          let sum = 0;
          advocateData.forEach((ele) => {
            if (ele.id != adminId) sum += ele.otherData.case_per ?? 0;
          });
          const finalpre = sum == 0 ? remaing : remaing / sum ?? 0;
          advocateData.forEach((ele) => {
            let otherData: any = ele?.otherData;
            if (ele.id != adminId) {
              if (beforePEr > case_per)
                otherData.case_per = Math.round(
                  (otherData?.case_per ?? 0) +
                    ((otherData?.case_per ?? 0) * finalpre) / 100,
                );
              else {
                otherData.case_per = Math.round(
                  (otherData?.case_per ?? 0) -
                    ((otherData?.case_per ?? 0) * finalpre) / 100,
                );
              }
              totalPer -= otherData?.case_per ?? 0;
              exitingAdvocateUpdate.push({ adminId: ele.id, otherData });
            }
          });
        } else {
          advocateData.forEach((ele) => {
            let otherData: any = ele?.otherData ?? {};
            let distrubtedPer = Math.round(
              ((otherData?.case_per ?? 0) * case_per) / 100,
            );
            otherData.case_per = Math.round(
              (otherData?.case_per ?? 0) - distrubtedPer,
            );
            totalPer -= otherData?.case_per ?? 0;

            exitingAdvocateUpdate.push({ adminId: ele.id, otherData });
          });
        }
        if (lastAdvocate) {
          if (!lastAdvocate.otherData) lastAdvocate.otherData = { case_per: 0 };
          if (totalPer < 0)
            lastAdvocate.otherData.case_per -= Math.abs(totalPer);
          if (totalPer > 0)
            lastAdvocate.otherData.case_per += Math.abs(totalPer);
        } else passData.case_per += totalPer;
        delete passData.adminId;
        return { newAdvocateData: passData, exitingAdvocateUpdate };
      }
    } catch (error) {
      console.error('Error in: ', error);
      return kInternalError;
    }
  }
}
