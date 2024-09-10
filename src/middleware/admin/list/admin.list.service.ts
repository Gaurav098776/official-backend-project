import { Injectable } from '@nestjs/common';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { AdminRepository } from 'src/repositories/admin.repository';

@Injectable()
export class AdminListService {
  constructor(private readonly repository: AdminRepository) {}

  async departmentExecutive(reqData: any) {
    try {
      const departmentName = reqData.departmentName;
      if (!departmentName) return kParamMissing('departmentName');

      const attributes = ['id', 'fullName'];
      const adminList = await this.repository.getAdminsFromDepartment(
        departmentName,
        attributes,
      );
      if (adminList.message) return adminList;
      return adminList.sort((a, b) => {
        if (a.fullName < b.fullName) return -1;
        else if (a.fullName > b.fullName) return 1;
        return 0;
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
