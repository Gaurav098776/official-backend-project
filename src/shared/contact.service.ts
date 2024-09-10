// Imports
import admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { UniqueConatctsRepository } from 'src/repositories/uniqueContact.repository';
import { CryptService } from 'src/utils/crypt.service';
import { UserRepository } from 'src/repositories/user.repository';
import { kNoDataFound } from 'src/constants/strings';
import { gIsPROD, isUAT } from 'src/constants/globals';
import { Op, Sequelize } from 'sequelize';
import { registeredUsers } from 'src/entities/user.entity';
import { EMIRepository } from 'src/repositories/emi.repository';
import { LoanRepository } from 'src/repositories/loan.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { CommonSharedService } from './common.shared.service';
import { ReferenceRepository } from 'src/repositories/reference.repository';
import { AutomationService } from 'src/thirdParty/automation/automation.service';
import { ContactLogRepository } from 'src/repositories/contact.log.repository';
import { UniqueContactLogRepository } from 'src/repositories/unique.contact.log.repository';
import { APIService } from 'src/utils/api.service';
let firebaseDB: admin.firestore.Firestore;

@Injectable()
export class ContactSharedService {
  constructor(
    private readonly apiService: APIService,
    private readonly cryptService: CryptService,
    private readonly repository: UniqueConatctsRepository,
    private readonly userRepo: UserRepository,
    private readonly emiRepo: EMIRepository,
    private readonly loanRepo: LoanRepository,
    private readonly adminRepo: AdminRepository,
    private readonly commonSharedService: CommonSharedService,
    private readonly referenceRepo: ReferenceRepository,
    private readonly automationService: AutomationService,
    private readonly contactLogRepo: ContactLogRepository,
    private readonly uniqueContactLogRepo: UniqueContactLogRepository,
  ) {
    if (gIsPROD || isUAT) firebaseDB = admin.firestore();
  }

  async fineTuneContact(contacts, userId) {
    try {
      const references = [];
      const numbers = [];
      contacts.forEach((e) => {
        try {
          let numEntry: string = (e.number ?? '').toString().replace(/\D/g, '');
          if (numEntry.length === 13 && numEntry.startsWith('+91'))
            numEntry = numEntry.replace('+91', '');
          if (numEntry.length === 12 && numEntry.startsWith('91'))
            numEntry = numEntry.replace('91', '');
          e.userId = userId;
          e.number = numEntry;
          const find = references.find((f) => f.number == numEntry);
          if (!find && numEntry.length == 10) {
            references.push(e);
            numbers.push(numEntry);
          }
        } catch (error) {}
      });
      if (references.length < 5)
        return k422ErrorMessage('Please enter valid 10 digit number');
      const checkTrue: any = await this.validateContactInTrueCaller(numbers);
      if (checkTrue.message) return checkTrue;
      references.forEach((el) => {
        try {
          const num = el?.number;
          const find = checkTrue.find((f) => f?.number == num);
          el.isVerified = find?.isVerified ?? false;
          el.fetchedName = find?.fetchedName ?? '';
          el.fetchedState = find?.fetchedState ?? '';
          el.whatsAppURL = find?.whatsAppURL ?? '';
        } catch (error) {}
      });
      let verified = false;
      const find = checkTrue.filter((f) => f?.isVerified == true);

      if (find && find.length > 4) verified = true;
      // else {
      //   const falseFind = checkTrue.filter((f) => f?.isVerified == false);
      //   if (falseFind && falseFind.length > 0)
      //     return { notVerified: falseFind, verified };
      // }
      return { references, verified };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async validateContactInTrueCaller(contact) {
    try {
      let contactList = [];
      if (Array.isArray(contact)) contactList = contact;
      else if (typeof contact == 'string') contactList.push(contact);
      const body = { numbers: contactList };
      const checkNumber = await this.automationService.verifyContacts(body);
      if (checkNumber.message) return checkNumber;

      const checkData = [];
      contactList.forEach((num) => {
        try {
          const obj = {
            number: num,
            isVerified: false,
            fetchedName: '',
            fetchedState: '',
            whatsAppURL: `https://wa.me/+91${num}`,
          };
          const find = checkNumber.find(
            (n) => `+91${num}` == n?.phones[0]?.e164Format,
          );
          if (find) {
            const addresses = find.addresses;
            const rPhone = find?.phones[0];
            const numberType = rPhone?.numberType;
            const spamScore = find.spamScore;
            obj.fetchedName = find.name ?? '-';

            addresses.forEach((address) => {
              if (address.city) obj.fetchedState = address.city ?? '-';
            });

            if (numberType == 'MOBILE' && !spamScore && find.name) {
              obj.isVerified = true;
            }
          }
          checkData.push(obj);
        } catch (error) {}
      });
      return checkData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async syncData(rawContacts, isMigrate = false, otherData: any = null) {
    try {
      const contactsData = [];
      rawContacts.forEach((el) => {
        try {
          let numEntry: string = (el.number ?? '')
            .toString()
            .replace(/\D/g, '');
          if (numEntry.length === 13 && numEntry.startsWith('+91'))
            numEntry = numEntry.replace('+91', '');
          if (numEntry.length === 12 && numEntry.startsWith('91'))
            numEntry = numEntry.replace('91', '');
          if (numEntry.length == 10) {
            el.number = numEntry;
            if (!el.userId && otherData?.userId) el.userId = otherData?.userId;
            el.source = otherData?.source ?? 'C';
            contactsData.push(el);
          }
        } catch (error) {}
      });

      const result = await this.prepareContacts(contactsData);
      if (!result || result === k500Error) return kInternalError;
      const createData = result.filter((e) => e.isCreate);
      const limit = 100;
      const count = createData.length / limit;
      for (let index = 0; index < count + 1; index++) {
        try {
          const list = createData.slice(index * limit, index * limit + limit);
          const data = await this.repository.bulkCreate(list);
          if (!data || data === k500Error) {
            for (let index = 0; index < list.length; index++) {
              try {
                const element = list[index];
                await this.repository.createRowData(element);
              } catch (error) {}
            }
          }
        } catch (e) {}
      }
      const updateData = result.filter((e) => !e.isCreate);
      let listToupdate = [];
      for (let index = 0; index < updateData.length; index++) {
        try {
          const element = updateData[index];
          const id = element.id;
          const data = {
            userId: element.userId,
            name: element.name,
            isVerified: element.isVerified,
            source: element.source,
          };
          const update = await this.repository.updateRowData(data, id);
          if (!update || update === k500Error) continue;
          else listToupdate = [...listToupdate, ...element.idList];
        } catch (error) {}
      }
      if (isMigrate) {
        createData.forEach((e) => {
          listToupdate = [...listToupdate, ...e.idList];
        });
      }
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  async prepareContacts(list: any[]) {
    try {
      const rowData = this.prePareRowData(list);
      const finalData = rowData.finalData;
      const phoneList = rowData.phoneList;
      const opti = { where: { id: phoneList } };
      const att = ['id', 'userId', 'name', 'source'];
      const result = await this.repository.getTableWhereData(att, opti);
      if (!result || result === k500Error) return k500Error;
      const prePareData = [];
      const numberList = [];
      finalData.forEach((element) => {
        try {
          // Check data in database
          const temp = this.findAndPrepareContactInfo(element, result);
          if (temp && temp !== k500Error) {
            /// check in new prepare data
            const phone = element.id;
            const tempIndex = numberList.indexOf(phone);
            if (tempIndex === -1) {
              numberList.push(phone);
              prePareData.push(temp);
            } else {
              const find = prePareData[tempIndex];
              const temp1 = this.findAndPrepareContactInfo(temp, [find]);
              if (temp1 && temp1 !== k500Error) prePareData[tempIndex] = temp1;
            }
          }
        } catch (err) {}
      });
      prePareData.forEach((element) => {
        try {
          const find = result.find((e) => e.id == element.id);
          if (!find) element.isCreate = true;
          else element.isCreate = false;
          const targetContact = list.find((subEl) => {
            const encryptedPhone = this.cryptService
              .encryptPhone(subEl.number)
              .split('===')[1];
            if (encryptedPhone == element.id) return subEl;
          });
          if (targetContact) element.isVerified = targetContact.isVerified;
        } catch (error) {}
      });
      return prePareData;
    } catch (error) {}
  }

  private prePareRowData(list: any[]) {
    const finalData = [];
    const phoneList = [];
    for (let index = 0; index < list.length; index++) {
      const element = list[index];
      try {
        let numEntry: string = element.number.replace(/\D/g, '');
        if (numEntry.length === 12 && numEntry.startsWith('91'))
          numEntry = numEntry.replace('91', '');
        if (numEntry.length > 7) {
          const phone = +numEntry;
          if (!isNaN(phone)) {
            const encryPhone = this.cryptService.encryptPhone(phone);
            if (encryPhone !== k500Error && encryPhone) {
              const key = encryPhone.split('===')[1];
              if (key) {
                phoneList.push(key);
                const nameTxt = (element?.name ?? '').toLowerCase();
                const name = {};
                name[element.userId] = nameTxt;
                const temp = {
                  id: key,
                  oldId: element?.id ?? -1,
                  userId: element.userId,
                  name,
                  searchName: nameTxt,
                  source: element.source,
                };
                finalData.push(temp);
              }
            }
          }
        }
      } catch (error) {}
    }
    return { finalData, phoneList };
  }

  private findAndPrepareContactInfo(contact, list: any[]) {
    try {
      const id = contact.id;
      const find = list.find((e) => e.id === id);
      let temp;
      const userId = contact.userId;
      const name = contact?.name ?? {};
      const searchName: string = (contact?.searchName ?? '')
        .toLowerCase()
        .trim();
      const source = find?.source ?? {};
      if (!find) {
        source[userId] = contact.source;
        temp = {
          id,
          idList: [contact?.oldId ?? -1],
          userId: [userId],
          name,
          searchName,
          isCreate: true,
          source,
        };
      } else {
        const userList = find?.userId ?? [];
        let isUpdate = false;
        if (typeof userId == 'string') {
          if (!userList.includes(userId)) {
            isUpdate = true;
            userList.push(userId);
          }
        } else {
          try {
            userId.forEach((element) => {
              const fin = userList.find((e) => e == element);
              if (!fin) {
                isUpdate = true;
                userList.push(element);
              }
            });
          } catch (error) {}
        }
        // check search name
        const tempName = searchName.split(' ');
        tempName.forEach((e) => {
          try {
            if (!(find?.searchName ?? '').includes(e.trim())) {
              isUpdate = true;
              find.searchName = (find?.searchName ?? '') + ' ' + e;
            }
          } catch (error) {}
        });

        // Check name
        const findName = find?.name ?? {};
        try {
          const nameKey = Object.keys(name);
          nameKey.forEach((e) => {
            if (!findName[e]) {
              isUpdate = true;
              findName[e] = name[e];
            }
          });
        } catch (error) {}

        // Check source existence
        const sourceKeys = Object.keys(source);
        if (sourceKeys.length == 0) source[userId] = contact.source;
        if (!sourceKeys[userId]) source[userId] = contact.source;

        if (isUpdate) {
          let idList;
          if (contact?.oldId)
            idList = [...(find?.idList ?? []), contact?.oldId ?? -1];
          else idList = [...(find?.idList ?? []), ...contact?.idList];
          temp = {
            idList,
            id: find.id,
            userId: userList,
            name: findName,
            searchName: find.searchName,
            isCreate: false,
            source,
          };
        }
      }
      return temp;
    } catch (er) {
      return k500Error;
    }
  }

  async syncContacts(userId) {
    try {
      const attributes = ['phone', 'quantity_status'];
      const options = { where: { id: userId } };
      const userData = await this.userRepo.getRowWhereData(attributes, options);
      if (!userData) return k422ErrorMessage(kNoDataFound);
      if (userData == k500Error) return kInternalError;
      const phone = this.cryptService.decryptPhone(userData.phone);
      const contacts: any = await this.getFirebaseContacts(phone);
      if (contacts.message) return contacts;
      contacts.forEach((el) => {
        el.userId = userId;
      });

      const list: any = await this.syncData(contacts);
      if (list.message) return list;
      await this.funUpdateDefaulterCount({ userId });
      return { totalContact: list.length };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  private async getFirebaseContacts(docId: string) {
    try {
      //Get data
      const docData = await firebaseDB
        .collection('Contacts')
        .doc(docId)
        .collection('Contacts')
        .get();
      const querySnapshots = docData.docs;
      // Prepare data
      const contacts = [];
      for (let index = 0; index < querySnapshots.length; index++) {
        try {
          const snapshotData = querySnapshots[index];
          const fetchedData = JSON.parse(snapshotData.data().data);
          const contactData = fetchedData.fetchedContacts;
          for (let i = 0; i < contactData.length; i++) {
            try {
              const contact = contactData[i];
              const isAdded = contacts.find(
                (data) => data.number == contact.number,
              );
              if (!isAdded) contacts.push(contact);
            } catch (error) {}
          }
        } catch (error) {}
      }
      return contacts;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region update total defaulter count for given users
  async funUpdateDefaulterCount(body) {
    try {
      const userId = body?.userId;
      if (!userId) return kParamMissing('userId');
      /// find contact count and userId
      const opt = {
        where: {
          // [Op.and]: [
          // Sequelize.where(
          //   Sequelize.fn('array_length', Sequelize.col('userId'), 1),
          //   { [Op.gt]: 1 },
          // ),
          userId: { [Op.contains]: [userId] },
          // ],
        },
      };
      const att = ['id', 'userId'];
      const contactsData = await this.repository.getTableWhereData(att, opt);
      if (!contactsData || contactsData === k500Error) return kInternalError;
      const phoneList = [];
      const userIdList = [];
      contactsData.forEach((ele) => {
        phoneList.push({ phone: { [Op.like]: '%===' + ele.id } });
        ele.userId.forEach((id) => {
          if (!userIdList.includes(id) && userId != id) userIdList.push(id);
        });
      });
      /// find due emi user
      const userModel = {
        model: registeredUsers,
        attributes: [],
        required: true,
        where: { [Op.and]: [{ [Op.or]: phoneList }] },
      };
      const options = {
        where: { payment_due_status: '1', userId: userIdList },
        include: [userModel],
      };
      const emiAtt = ['id', 'userId'];
      const emiData = await this.emiRepo.getTableWhereData(emiAtt, options);
      if (!emiData || emiData === k500Error) return kInternalError;
      const uniqueUser = [];
      emiData.forEach((emi) => {
        if (!uniqueUser.includes(emi.userId)) uniqueUser.push(emi.userId);
      });
      if (uniqueUser.length > 0) {
        const updateData = { defaulterContactCount: uniqueUser.length };
        await this.userRepo.updateRowData(updateData, userId);
      }
      return uniqueUser;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get unique contact data
  async getUniqueContacts(data) {
    try {
      const token = data?.token ?? '';
      let viewAll: any = false;
      let viewMask: any = false;
      if (token) {
        const adminData = await this.commonSharedService.validatedToken(token);
        if (adminData) {
          const adminId = adminData?.id;
          /// check access of view all contacts
          let type = 'View All Contacts';
          viewAll = await this.adminRepo.checkHasAccess(adminId, type, 1);
          viewAll = viewAll == true;

          /// check access of view all mask contacts
          type = 'View Mask Contacts';
          viewMask = await this.adminRepo.checkHasAccess(adminId, type, 1);
          viewMask = viewMask == true;
        }
      }
      return await this.getContactList(data, viewAll, viewMask);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  private async getContactList(data, viewAll = true, viewMask = true) {
    const contactsData = [];
    let refrences: any = {};

    try {
      const userId = data?.userId;
      /// find user loan is delay more then 5 day and also emi is unpaid
      let emiCounts: any = 0;
      let loanCount: any = 0;
      if (userId) {
        const where = { loanStatus: ['InProcess', 'Accepted'], userId };
        loanCount = await this.loanRepo.getCountsWhere({ where });
        if (loanCount === k500Error) loanCount = 0;
        if (!loanCount) {
          const where = {
            userId,
            penalty_days: { [Op.gt]: 5 },
            payment_status: '0',
          };
          emiCounts = await this.emiRepo.getCountsWhere({ where });
          if (emiCounts === k500Error) emiCounts = 0;
        }
      } else loanCount = 1;
      if ((emiCounts > 0 || loanCount > 0) && viewAll) {
        /// find data in phone book
        const findData: any = await this.findDataInPhoneBook(data, userId);
        if (findData?.message) return findData;
        const contactsList = findData?.contactsList ?? [];
        const userList = findData?.userList ?? [];
        if (contactsList.length == 0) return [];
        /// get user info
        const opts = { where: { id: userList } };
        const att = ['id', 'fullName', 'phone'];
        const userData = await this.userRepo.getTableWhereData(att, opts);
        if (userData === k500Error) return kInternalError;
        //check delay user contact
        const emiOpt = {
          where: { userId: userList, penalty_days: { [Op.gt]: 0 } },
          group: ['userId'],
        };
        const emiAtt = ['userId'];
        const delayUserData = await this.emiRepo.getTableWhereData(
          emiAtt,
          emiOpt,
        );
        if (delayUserData === k500Error) return kInternalError;

        contactsList.forEach((ele) => {
          try {
            const tempData: any = {
              userId: [],
              name: '',
              isVerified: null,
              phone: '',
            };
            try {
              if (userId) tempData.name = ele?.name[userId];
              else tempData.name = Object.values(ele?.name)[0];
            } catch (error) {}
            if (!tempData.name)
              try {
                tempData.name = Object.values(ele?.name)[0];
              } catch (error) {}
            tempData.isVerified = ele?.isVerified ?? null;
            const phone = this.cryptService.decryptPhone(ele?.id);
            tempData.phone = viewMask ? phone : 'XXXXXXXXXX';
            const tempuserList = [];
            for (let index = 0; index < ele.userId.length; index++) {
              try {
                const id = ele.userId[index];
                const temp = {
                  id: '',
                  fullName: '',
                  phone: '',
                  phoneStatusVerified: '',
                  delay: false,
                  matched: false,
                };
                const find = userData.find((f) => f.id === id);
                if (find) {
                  temp.id = find.id;
                  temp.fullName = find.fullName;
                  temp.phoneStatusVerified = '1';
                  temp.phone = find.phone;
                  temp.phone = this.cryptService.decryptPhone(temp.phone);
                  const findDelay = delayUserData.find(
                    (f) => f.userId === id && f.userId != userId,
                  );
                  temp.delay = findDelay ? true : false;
                  temp.matched = phone === temp.phone;
                  temp.phone = viewMask ? temp.phone : 'XXXXXXXXXX';
                  tempuserList.push(temp);
                }
              } catch (error) {}
            }
            tempData.userId = tempuserList;
            contactsData.push(tempData);
          } catch (error) {}
        });
        await this.findPhoneNumberToUserIsMatchWith(contactsData, userId);
      }

      if (emiCounts > 0 || loanCount > 0) {
        if (userId) {
          const refConatctsAttr = ['id', 'contacts', 'userId'];
          const refContactOptions = {
            where: { userId },
            order: [['id', 'desc']],
          };
          refrences = await this.referenceRepo.findOne(
            refConatctsAttr,
            refContactOptions,
          );
          if (refrences === k500Error) return kInternalError;
          if (!viewMask) {
            refrences?.contacts.forEach((ref) => {
              try {
                ref.number = 'XXXXXXXXXX';
              } catch (error) {}
            });
          }
        }
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
    return { contactsData, refrences };
  }

  //#region find phone number to User is delay of defut
  private async findPhoneNumberToUserIsMatchWith(contactsData, userId) {
    try {
      if (userId) {
        const attri = ['defaulterContactCount'];
        const user = await this.userRepo.getRowWhereData(attri, {
          where: { id: userId },
        });
        if (!user || user === k500Error) return kInternalError;
        const defaulterContactCount = user?.defaulterContactCount ?? 0;
        let count = 0;
        const userPhoneNumberArray = [];
        contactsData.forEach((ele) => {
          const phone = this.cryptService.encryptPhone(ele?.phone);
          const filter = ele.userId.filter(
            (f) => f.delay === true && f.matched === true,
          );
          if (filter.length > 0) count += filter.length;
          userPhoneNumberArray.push({
            phone: { [Op.like]: '%===' + phone.split('===')[1] },
          });
        });
        if (defaulterContactCount > count) {
          /// find due emi user
          const userModel = {
            model: registeredUsers,
            attributes: ['id', 'fullName', 'phone'],
            required: true,
            where: { [Op.or]: userPhoneNumberArray },
          };
          const options = {
            where: { payment_due_status: '1' },
            include: [userModel],
          };
          const emiAtt = ['id', 'userId'];
          const emiData = await this.emiRepo.getTableWhereData(emiAtt, options);
          if (!emiData || emiData === k500Error) return kInternalError;

          const userIdList = [];
          const createNewData = [];
          emiData.forEach((ele) => {
            try {
              const id = ele.userId;
              if (!userIdList.includes(id)) {
                userIdList.push(id);
                const user = ele.user;
                const phone = this.cryptService.decryptPhone(user.phone);
                const find = contactsData.find((f) => f.phone == phone);
                if (find) {
                  const findUser = find.userId.find((f) => f.id == id);
                  if (!findUser) {
                    find.userId.push({
                      id,
                      fullName: user.fullName,
                      phone: phone,
                      phoneStatusVerified: '1',
                      delay: true,
                      matched: true,
                    });
                    createNewData.push({
                      userId: id,
                      number: phone,
                      name: user.fullName,
                    });
                  }
                }
              }
            } catch (error) {}
          });

          if (createNewData.length > 0) {
            for (let index = 0; index < createNewData.length; index++) {
              try {
                const ele = createNewData[index];
                await this.syncData([ele]);
              } catch (error) {}
            }
          }
        }
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find data in phone book
  private async findDataInPhoneBook(data, userId) {
    try {
      const limit = +data.pageSize ?? 10;
      const offset = +data.page * limit - limit ?? 0;
      const options: any = userId ? {} : { limit, offset };
      let where: any = {};
      if (userId) where.userId = { [Op.contains]: [userId] };
      const txt = data.searchText;
      if (txt) {
        if (isNaN(txt)) return { contactsList: [], userList: [] };
        else {
          const encrPhone = this.cryptService.encryptPhone(txt);
          if (encrPhone === k500Error) return kInternalError;
          const id = encrPhone.split('===')[1];
          if (id.length < 30) return { contactsList: [], userList: [] };
          where.id = id;
        }
      }
      options.where = where;
      options.order = [['id']];
      const attributes = ['id', 'userId', 'name', 'isVerified'];
      const contactsList = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (contactsList === k500Error) return kInternalError;
      /// get userList
      let userList: any = [];
      contactsList.map((e) => {
        try {
          userList.push(...e?.userId);
        } catch (error) {}
      });
      userList = [...new Set(userList)];
      return { contactsList, userList };
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region update total defaulter count of defaulter contacts
  async updateDefaulterCountOfDefaulters(data) {
    try {
      const penalty_days = data?.penaltyDays ?? 2;
      const defaulters: any = await this.getDefaultersByPenaltyDays(
        penalty_days,
      );
      if (defaulters?.message) return defaulters;
      const userPhone = await this.userRepo.getTableWhereData(['id', 'phone'], {
        where: { id: defaulters },
      });
      if (userPhone === k500Error) return kInternalError;
      const encrPhone = [
        ...new Set(userPhone.map((ele) => ele?.phone.split('===')[1])),
      ];
      const getAllContacts = await this.getDefaultersContactsById(encrPhone);
      if (getAllContacts?.message) return getAllContacts;
      const userCount: any = {};
      getAllContacts.forEach((element) => {
        try {
          const userList = element?.userId;
          userList.forEach((id) => {
            try {
              const find = userPhone.find(
                (f) => f.phone.includes(element.id) && f.id == id,
              );
              if (!find) {
                if (userCount[id]) userCount[id] = (userCount[id] ?? 0) + 1;
                else userCount[id] = 1;
              }
            } catch (error) {}
          });
        } catch (error) {}
      });
      const updateCountList = {};
      for (const key in userCount) {
        try {
          const count = userCount[key];
          if (updateCountList[count])
            updateCountList[count] = [...updateCountList[count], key];
          else updateCountList[count] = [key];
        } catch (error) {}
      }

      const keys = Object.keys(updateCountList);
      for (let index = 0; index < keys.length; index++) {
        try {
          const count = keys[index];
          const userId = updateCountList[count];
          const updateData = { defaulterContactCount: +count };
          await this.userRepo.updateRowData(updateData, userId);
        } catch (error) {}
      }
      return userCount;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region geeting defaulters data having penalty days less than this
  async getDefaultersByPenaltyDays(penalty_days) {
    try {
      const options = {
        where: {
          payment_due_status: '1',
          penalty_days: { [Op.lte]: penalty_days },
        },
        group: ['userId'],
      };
      const attributes = ['userId'];
      const defaulters = await this.emiRepo.getTableWhereData(
        attributes,
        options,
      );
      if (defaulters === k500Error) return kInternalError;
      return [...new Set(defaulters.map((ele) => ele?.userId))];
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get unique contact data by id
  async getDefaultersContactsById(id) {
    try {
      const options = {
        where: {
          id,
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('array_length', Sequelize.col('userId'), 1),
              { [Op.gt]: 1 },
            ),
          ],
        },
      };
      const attributes = ['id', 'userId'];
      const contactsData = await this.repository.getTableWhereData(
        attributes,
        options,
      );
      if (contactsData === k500Error) return kInternalError;
      return contactsData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region get sync call logs data
  async syncCallLogsData(callList, userId) {
    try {
      if (!userId) return kParamMissing('userId');
      const contactsData = [];
      callList.forEach((el) => {
        try {
          let numEntry: string = (el.number ?? '')
            .toString()
            .replace(/\D/g, '')
            .trim();
          if (numEntry.length === 13 && numEntry.startsWith('+91'))
            numEntry = numEntry.replace('+91', '');
          if (numEntry.length === 12 && numEntry.startsWith('91'))
            numEntry = numEntry.replace('91', '');
          if (numEntry.length == 10) {
            el.number = this.cryptService
              .encryptPhone(+numEntry)
              .split('===')[1];
            el.userId = userId;
            el.id = this.cryptService.getMD5Hash(numEntry + userId);
            contactsData.push(el);
          }
        } catch (error) {}
      });

      const ids = [...new Set(contactsData.map((ele) => ele?.id))];
      const phones = [...new Set(contactsData.map((ele) => ele?.number))];

      if (ids.length > 0) {
        // find call log data
        const contactLog = await this.findCallLogData(ids);
        if (contactLog?.message) return contactLog;
        // find call log uniques data
        const contactUniqueLog = await this.findCallLogFromUnique(phones);
        if (contactUniqueLog?.message) return contactUniqueLog;
        const result = this.prepareOfData(
          contactsData,
          contactLog,
          contactUniqueLog,
        );
        await this.updateOrCreateTheData(result);
        return result;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region  find call log data
  private async findCallLogData(id) {
    try {
      const options = { where: { id } };
      const att = ['id', 'timeStamps', 'duration'];
      const result = await this.contactLogRepo.getTableWhereData(att, options);
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find call log from unique
  async findCallLogFromUnique(id) {
    try {
      const options = { where: { id } };
      const att = ['id', 'userId'];
      const result = await this.uniqueContactLogRepo.getTableWhereData(
        att,
        options,
      );
      if (result === k500Error) return kInternalError;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region prepare of data
  private prepareOfData(contactsData, contactLog, contactUniqueLog) {
    const data = { cLog: [], uLog: [], cuLog: [], uuLog: [] };
    try {
      contactsData.forEach((ele) => {
        try {
          const key = ele.timestamp ?? 0;
          const value = ele.duration ?? 0;
          const findClog = contactLog.find((f) => f.id === ele.id);
          const cLogIndex = data.cLog.findIndex((f) => f.id === ele.id);
          if (findClog) {
            /// this for update data
            const find = (findClog?.timeStamps ?? []).find((f) => f === key);
            if (!find) {
              const uLogIndex = data.uLog.findIndex((f) => f.id === ele.id);
              if (uLogIndex === -1) {
                const temp: any = {
                  id: ele.id,
                  phone: ele.number,
                  name: ele.name ?? 'null',
                  userId: ele.userId,
                  timeStamps: [...findClog.timeStamps, key],
                  duration: findClog?.duration,
                };
                if (value) temp.duration[key] = value;
                data.uLog.push(temp);
              } else {
                const timeStamps = data.uLog[uLogIndex]?.timeStamps ?? [];
                if (!timeStamps.includes(key)) {
                  timeStamps.push(key);
                  data.uLog[uLogIndex].timeStamps = timeStamps;
                  if (value) {
                    const duration = data.uLog[uLogIndex]?.duration ?? {};
                    data.uLog[uLogIndex].duration = duration;
                  }
                }
              }
            }
          } else if (cLogIndex != -1) {
            /// this condition for same number come in create
            const timeStamps = data.cLog[cLogIndex].timeStamps ?? [];
            const find = timeStamps.find((f) => f == key);
            if (!find) {
              data.cLog[cLogIndex].timeStamps = [...timeStamps, key];
              if (value) data.cLog[cLogIndex].duration[key] = value;
            }
          } else {
            /// this for first time
            const duration = {};
            if (value) duration[key] = value;
            data.cLog.push({
              id: ele.id,
              phone: ele.number,
              userId: ele.userId,
              name: ele?.name ?? 'null',
              timeStamps: [key],
              duration,
            });
          }

          /// this create or update in contact uniquelog
          const findUClog = contactUniqueLog.find((f) => f.id == ele.number);
          const findIndex = data.cuLog.findIndex((f) => f.id == ele.number);
          if (findUClog) {
            const userId = ele.userId;
            const find = (findUClog?.userId ?? []).find((f) => f === userId);
            if (!find) {
              const index = data.uuLog.findIndex((f) => f.id == ele.number);
              if (index === -1)
                data.uuLog.push({
                  id: ele.number,
                  userId: [...(findUClog?.userId ?? []), userId],
                });
              else {
                const list = data?.uuLog[index]?.userId ?? [];
                if (!list.includes(userId))
                  data.uuLog[index].userId = [...list, userId];
              }
            }
          } else if (findIndex == -1)
            data.cuLog.push({ id: ele.number, userId: [ele.userId] });
        } catch (error) {}
      });
    } catch (error) {}
    return data;
  }
  //#endregion

  //#region update or create the data in call logs
  private async updateOrCreateTheData(data) {
    try {
      const cLog = data?.cLog ?? [];
      const uLog = data?.uLog ?? [];
      const cuLog = data?.cuLog ?? [];
      const uuLog = data?.uuLog ?? [];
      if (cLog.length > 0) await this.contactLogRepo.bulkCreate(cLog);
      if (uLog.length > 0)
        await this.contactLogRepo.bulkCreate(uLog, {
          updateOnDuplicate: ['timeStamps', 'duration'],
        });

      if (cuLog.length > 0) await this.uniqueContactLogRepo.bulkCreate(cuLog);
      if (uuLog.length > 0)
        await this.uniqueContactLogRepo.bulkCreate(uuLog, {
          updateOnDuplicate: ['userId'],
        });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  async syncRemainingContacts() {
    const attributes = ['id', 'userId', 'name'];
    const options = { limit: 1500, order: [['updatedAt', 'DESC']] };

    const contactList = await this.repository.getTableWhereData(
      attributes,
      options,
    );
    if (contactList == k500Error) return kInternalError;

    const finalizedData: any = {};
    for (let index = 0; index < contactList.length; index++) {
      try {
        const contactData = contactList[index];
        const number = this.cryptService.decryptPhone(contactData.id);
        const userIds = contactData.userId ?? [];
        const names = contactData.name ?? [];

        userIds.forEach((el) => {
          if (!finalizedData[el]) finalizedData[el] = [];
          finalizedData[el].push({ name: names[el], number });
        });
      } catch (error) {}
    }

    for (const userId in finalizedData) {
      const contacts = finalizedData[userId];

      const body = { userId, contacts };
      const url = '/v3/contact/syncContacts';

      const response = await this.apiService.requestPost(url, body);
    }
  }
}
