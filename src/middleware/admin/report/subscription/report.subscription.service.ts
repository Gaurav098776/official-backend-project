import { Op } from 'sequelize';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { CryptService } from 'src/utils/crypt.service';
import { kInternalError } from 'src/constants/responses';
import { registeredUsers } from 'src/entities/user.entity';
import { SubscriptionRepository } from 'src/repositories/subscription.repository';
import { TypeService } from 'src/utils/type.service';

@Injectable()
export class ReportSubscriptionService {
  constructor(
    private readonly cryptService: CryptService,
    private readonly subScriptionRepo: SubscriptionRepository,
    private readonly typeService: TypeService,
  ) {}

  async mandateStuckUsers() {
    try {
      const userInclude: any = { model: registeredUsers };
      userInclude.attributes = ['completedLoans', 'email', 'fullName', 'phone'];
      const include = [userInclude];

      const statuses = [
        'Failed',
        'Invited',
        'Initiated',
        'INITIALIZED',
        'Invitation_Accepted',
      ];
      const attributes = ['id'];
      const options = { include, where: { status: { [Op.or]: statuses } } };

      const subScriptionList = await this.subScriptionRepo.getTableWhereData(
        attributes,
        options,
      );
      if (subScriptionList == k500Error) return kInternalError;

      const finalizedList = [];
      subScriptionList.forEach((el) => {
        try {
          const userData = el.user ?? {};
          const data = {
            name: userData.fullName,
            phone: this.cryptService.decryptPhone(userData.phone),
            email: userData.email,
            completedLoans: userData.completedLoans ?? 0,
          };
          finalizedList.push(data);
        } catch (error) {}
      });

      const path = 'Mandate Stuck Users.xlsx';
      const rawExcelData = {
        sheets: ['Mandate Stuck Users.xlsx'],
        data: [finalizedList],
        sheetName: path,
      };
      await this.typeService._objectToExcel(rawExcelData);

      return {};
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
}
