import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { SYSTEM_ADMIN_ID } from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import {
  k403Forbidden,
  k409ErrorMessage,
  k422ErrorMessage,
  kCreateSuccessData,
  kInternalError,
  kParamMissing,
  kParamsMissing,
} from 'src/constants/responses';
import { kAdminRoleNotActive } from 'src/constants/strings';
import { AdminRoleModuleEntity } from 'src/entities/role.module.entity';
import { AdminSubRoleModuleEntity } from 'src/entities/role.sub.module.entity';
import { AccessOfListRepository } from 'src/repositories/access_of_list.repository';
import { AccessOfRoleRepository } from 'src/repositories/access_of_role.repository';
import { AdminRepository } from 'src/repositories/admin.repository';
import { AdminRoleModuleRepository } from 'src/repositories/adminRoleModule.repository';
import { AdminRoleRepository } from 'src/repositories/admin_role.repository';
import { AdminSubRoleModuleRepository } from 'src/repositories/admin_sub_role_module.repository';
import { CrmDispositionRepository } from 'src/repositories/crmDisposition.repository';
import { CrmStatusRepository } from 'src/repositories/crmStatus.repository';
import { CrmTitleRepository } from 'src/repositories/crmTitle.repository';
import { DepartmentRepository } from 'src/repositories/department.repository';

@Injectable()
export class RoleManagementService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly crmStatusRepo: CrmStatusRepository,
    private readonly crmTitleRepo: CrmTitleRepository,
    private readonly crmDispositionRepo: CrmDispositionRepository,
    private readonly adminRoleModuleRepo: AdminRoleModuleRepository,
    private readonly roleRepo: AdminRoleRepository,
    private readonly accessOfRoleRepo: AccessOfRoleRepository,
    private readonly subRoleModuleRepo: AdminSubRoleModuleRepository,
    private readonly accessOfListRepo: AccessOfListRepository,
  ) {}

  //create new department
  async createNewDepartment(body) {
    try {
      const adminId = body?.adminId;
      if (!body?.department || !adminId) return kParamsMissing;
      const hasAccess = await this.adminRepo.checkHasAccess(
        adminId,
        'department',
      );
      if (hasAccess !== true) return hasAccess;
      const accessList = body?.accessList;
      if (!accessList) return kParamMissing('accessList');
      const department = (body?.department).toUpperCase().trim();
      const att = ['id'];
      const options = { where: { department } };
      const find = await this.departmentRepo.getRowWhereData(att, options);
      if (find === k500Error) return kInternalError;
      if (find) return k409ErrorMessage();
      const loanStatus = body?.loanStatus ?? [
        'InProcess',
        'Active',
        'Complete',
        'Rejected',
        'Accepted',
      ];
      const createDepartment = await this.departmentRepo.createRawData({
        department,
        loanStatus,
      });
      if (createDepartment === k500Error) return kInternalError;
      const departmentId = createDepartment?.id;
      const access = await this.addOrUpdateAccessOfDepartment(
        departmentId,
        accessList,
      );
      if (access?.message) return access;
      const data = { title: department.toLowerCase(), adminId };
      return await this.createRoleModel(data);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // add or update access of Department
  private async addOrUpdateAccessOfDepartment(departmentId, accessList) {
    try {
      const crmAccess = accessList?.crmAccess;
      const crmStatuses: number[] = crmAccess?.crmStatuses;
      const crmTitles: number[] = crmAccess?.crmTitles;
      const crmDispositions: number[] = crmAccess?.crmDispositions;
      if (crmStatuses) {
        const crmStatusAccess: any = await this.crmAccessForDepartment(
          this.crmStatusRepo,
          crmStatuses,
          departmentId,
        );
        if (crmStatusAccess?.message) return crmStatusAccess;
      }
      if (crmTitles) {
        const crmTitlesAccess: any = await this.crmAccessForDepartment(
          this.crmTitleRepo,
          crmTitles,
          departmentId,
        );
        if (crmTitlesAccess?.message) return crmTitlesAccess;
      }
      if (crmDispositions) {
        const crmDispAccess: any = await this.crmAccessForDepartment(
          this.crmDispositionRepo,
          crmDispositions,
          departmentId,
        );
        if (crmDispAccess?.message) return crmDispAccess;
      }
      return kCreateSuccessData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //common crm access update
  private async crmAccessForDepartment(repo, statuses, departmentId) {
    try {
      const attr = ['id', 'departmentIds'];
      const ops = {
        where: {
          [Op.or]: [
            { id: statuses },
            { departmentIds: { [Op.contains]: [departmentId] } },
          ],
        },
      };
      const crmData = await repo.getTableWhereData(attr, ops);
      if (crmData === k500Error) return kInternalError;
      if (crmData && crmData.length > 0) {
        for (let index = 0; index < crmData.length; index++) {
          try {
            const ele = crmData[index];
            const id = ele.id;
            const departmentIds = ele?.departmentIds ?? [];
            if (statuses.includes(id)) {
              if (!departmentIds.includes(departmentId)) {
                departmentIds.push(departmentId);
                await repo.updateRowData({ departmentIds }, id);
              }
            } else if (departmentIds.includes(departmentId)) {
              const ind = departmentIds.indexOf(departmentId);
              departmentIds.splice(ind, 1);
              await repo.updateRowData({ departmentIds }, id);
            }
          } catch (error) {}
        }
        return true;
      } else return false;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // update department access
  async updateDepartment(body) {
    try {
      const adminId = body?.adminId;
      if (!adminId) return kParamMissing('adminId');
      const departmentId = body?.departmentId;
      if (!departmentId) return kParamMissing('departmentId');
      const accessList = body?.accessList;
      if (!accessList) return kParamMissing('accessList');
      const hasAccess = await this.adminRepo.checkHasAccess(
        adminId,
        'department',
      );
      if (hasAccess !== true) return hasAccess;
      return await this.addOrUpdateAccessOfDepartment(departmentId, accessList);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //get all department details
  async getDepartmentData(query) {
    try {
      const departmentId = query?.departmentId;
      const att = ['id', 'department', 'loanStatus', 'isDelete'];
      const options: any = { where: {}, order: [['id']] };
      if (departmentId) options.where.id = departmentId;
      const departmentData = await this.departmentRepo.getTableWhereData(
        att,
        options,
      );
      if (departmentData === k500Error) return kInternalError;
      if (!departmentId) return departmentData;
      return await this.getAccessOfDepartment(departmentId);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // get all access of Department data
  private async getAccessOfDepartment(departmentId) {
    try {
      const allData: any = {};
      const options = { order: [['id']] };
      const statusAttr = ['id', 'status', 'departmentIds'];
      const crmStatus = await this.crmStatusRepo.getTableWhereData(
        statusAttr,
        options,
      );
      if (crmStatus?.message) return crmStatus;
      await this.checkCrmAccess(crmStatus, departmentId);
      allData.crmStatus = crmStatus;
      const titlesAttr = ['id', 'title', 'departmentIds'];
      const crmTitles: any = await this.crmTitleRepo.getTableWhereData(
        titlesAttr,
        options,
      );
      if (crmTitles?.message) return crmTitles;
      await this.checkCrmAccess(crmTitles, departmentId);
      allData.crmTitles = crmTitles;
      const dispAttr = ['id', 'title', 'departmentIds'];
      const crmDisposition = await this.crmDispositionRepo.getTableWhereData(
        dispAttr,
        options,
      );
      if (crmDisposition?.message) return crmDisposition;
      allData.crmDisposition = crmDisposition;
      await this.checkCrmAccess(crmDisposition, departmentId);
      return allData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //common get crm access data for department
  private async checkCrmAccess(data, departmentId) {
    try {
      data.forEach((ele) => {
        try {
          const departmentIds = ele?.departmentIds ?? [];
          let access = false;
          if (departmentIds.includes(+departmentId)) access = true;
          ele.access = access;
          delete ele.departmentIds;
        } catch (error) {}
      });
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  // create role Model
  async createRoleModel(body) {
    try {
      const title = (body?.title ?? '').toLowerCase().trim();
      const adminId = body?.adminId;
      if (!title || !adminId) return kParamsMissing;
      const att = ['id'];
      const options = { where: { title } };
      const find = await this.adminRoleModuleRepo.getRoweData(att, options);
      if (find === k500Error) return kInternalError;
      if (find) return k409ErrorMessage();
      const create = await this.adminRoleModuleRepo.create(body);
      if (!create || create === k500Error) return kInternalError;
      return create;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region bulk create of access of role
  private async createOfAccessOfRole(roleId, adminId = SYSTEM_ADMIN_ID) {
    try {
      let finalData = [];
      /// prePare
      const data: any = await this.prePareAllRoleModel(roleId, adminId);
      if (data === k500Error) return kInternalError;
      /// find
      const att = ['roleModelId', 'subRoleModelId'];
      const options = { where: { roleId } };
      const findData = await this.accessOfRoleRepo.getTableWhereData(
        att,
        options,
      );
      if (findData && findData != k500Error) {
        data.forEach((e) => {
          try {
            const find = findData.find(
              (f) =>
                f.roleModelId == e.roleModelId &&
                f.subRoleModelId == e.subRoleModelId,
            );
            if (!find) finalData.push(e);
          } catch (error) {}
        });
      } else finalData = data;

      if (finalData.length > 0) {
        /// create
        const result = await this.accessOfRoleRepo.bulkCreate(finalData);
        if (!result || result === k500Error) return kInternalError;
        return result;
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find role Data
  async findAllRole(query) {
    try {
      const roleId = query?.roleId;

      if (!roleId || roleId == 'null') {
        const att = ['id', 'title', 'isActive'];
        return await this.roleRepo.getTableWhereData(att, {
          order: [['id']],
        });
      } else {
        /// check role is exite
        const where = { id: roleId };
        const find = await this.roleRepo.getRoweData(['id', 'isActive'], {
          where,
        });
        if (find === k500Error) return kInternalError;
        if (find?.isActive != '1') return k403Forbidden;
        //// check and update if need
        const check = await this.createOfAccessOfRole(roleId);
        if (check === k500Error) return kInternalError;

        /// find data
        return await this.findAndPrePareDataOfRole(query);
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find and prePare data of role
  async findAndPrePareDataOfRole(query) {
    try {
      const roleId = query?.roleId;
      const roleModelId = query?.roleModelId;
      const roleModel = {
        model: AdminRoleModuleEntity,
        attributes: ['title', 'roleOrder'],
      };
      const options: any = { where: { roleId }, include: [roleModel] };
      if (roleModelId) options.where.roleModelId = roleModelId;
      options.order = ['roleModelId'];
      const attributes = ['title', 'access_list'];
      options.include.push({ model: AdminSubRoleModuleEntity, attributes });
      const att = ['id', 'isActive', 'subRoleModelId', 'access_list'];
      att.push('roleModelId');
      const result = await this.accessOfRoleRepo.getTableWhereData(
        att,
        options,
      );
      if (!result || result === k500Error) return kInternalError;
      const attri = ['id', 'title'];
      const access = await this.accessOfListRepo.getTableWhereData(attri, {});
      if (!access || access === k500Error) return kInternalError;
      return this.prePareDataOfRole(result, access);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region prePare the data of role
  private prePareDataOfRole(result, access) {
    try {
      const finalList = [];
      /// prePare model
      let filter = result.filter((f) => !f.subRoleModelData);
      filter.forEach((e) => {
        try {
          if (e.roleModelId == 5) return;
          const tempData = {
            roleModelId: e.roleModelId,
            title: e?.roleModelData?.title,
            isActive: e?.isActive,
            order: e.roleModelData.roleOrder,
            subRoleModel: [],
          };
          finalList.push(tempData);
        } catch (error) {}
      });

      filter.sort((a, b) => a.roleModelId - b.roleModelId);
      /// prePare sub role model
      filter = result.filter((f) => f.subRoleModelData);
      filter.forEach((e) => {
        try {
          const find = finalList.find((f) => f.roleModelId === e.roleModelId);
          if (find) {
            const subRoleModel = find.subRoleModel ?? [];
            const access_list = [];
            /// isActive
            (e.access_list ?? []).forEach((id) => {
              const find = access.find((f) => f.id === id);
              if (find) access_list.push({ ...find, isActive: '1' });
            });
            /// deActive
            if (e?.subRoleModelData?.access_list) {
              e.subRoleModelData.access_list.forEach((id) => {
                const f = access_list.find((f) => f.id === id);
                if (!f) {
                  const find = access.find((f) => f.id === id);
                  if (find) access_list.push({ ...find, isActive: '0' });
                }
              });
            }
            const subRoleModelId = e.subRoleModelId;
            const tempFind = subRoleModel.find(
              (f) => f.subRoleModelId === subRoleModelId,
            );
            try {
              access_list.sort((a, b) => a.id - b.id);
            } catch (e) {}
            const temp = {
              subRoleModelId,
              title: e?.subRoleModelData?.title,
              access_list,
            };
            let index = -1;
            if (tempFind) index = subRoleModel.indexOf(tempFind);

            if (index === -1) subRoleModel.push(temp);
            else subRoleModel[index] = temp;
            subRoleModel.sort((a, b) => a.subRoleModelId - b.subRoleModelId);
            find.subRoleModel = subRoleModel;
          }
        } catch (error) {}
      });
      finalList.sort((a, b) => a.order - b.order);
      return finalList;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region find all role model and prePare
  private async prePareAllRoleModel(roleId, adminId) {
    try {
      const prePareData = [];
      const roleModel = await this.adminRoleModuleRepo.getTableWhereData(
        ['id'],
        {},
      );

      if (roleModel && roleModel !== k500Error) {
        roleModel.forEach((e) => {
          try {
            prePareData.push({ roleModelId: e.id, roleId, adminId });
          } catch (error) {}
        });
      }
      const att = ['id', 'roleModelId'];
      const subRole = await this.subRoleModuleRepo.getTableWhereData(att, {});
      if (subRole && subRole !== k500Error) {
        subRole.forEach((e) => {
          try {
            const subRoleModelId = e.id;
            const roleModelId = e.roleModelId;
            prePareData.push({ subRoleModelId, roleModelId, roleId, adminId });
          } catch (error) {}
        });
      }

      return prePareData;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region update role access
  async updateRoleAccess(data) {
    try {
      const roleId = data?.roleId;
      const adminId = data?.adminId;
      const isActive = data?.isActive;
      const updateList = data?.updateList ?? [];

      // update roleId
      if (!roleId) return kParamMissing('title');
      if (!adminId) return kParamMissing('adminId');
      if (roleId && isActive) {
        const update = { isActive, adminId };
        const result = await this.roleRepo.updateRowData(update, roleId);
        if (!result || result === k500Error) return kInternalError;
      }

      for (let index = 0; index < updateList?.length; index++) {
        try {
          const element = updateList[index];
          const body = element;
          body.roleId = roleId;
          body.adminId = adminId;
          const roleModelId = body?.roleModelId;
          const subRoleModelId = body?.subRoleModelId;
          const isActives = body?.isActive;

          // check admin role is active
          if (roleModelId || subRoleModelId) {
            const options = { where: { id: roleId, isActive: '1' } };
            const roleActive = await this.roleRepo.getRoweData(['id'], options);
            if (!roleActive || roleActive === k500Error)
              return k422ErrorMessage(kAdminRoleNotActive);
          }

          if (roleId && roleModelId && isActives && !subRoleModelId) {
            const where = {
              roleId,
              roleModelId,
              subRoleModelId: { [Op.eq]: null },
            };
            const find = await this.accessOfRoleRepo.getRoweData(['id'], {
              where,
            });
            if (!find || find === k500Error) return kInternalError;
            const update = { isActive: isActives, adminId };
            const result = await this.accessOfRoleRepo.updateRowData(
              update,
              find.id,
            );
            if (!result || result === k500Error) return kInternalError;
          }
          if (roleId && roleModelId && subRoleModelId) {
            const result = await this.updateSubRoleModel(body);
            if (!result || result === k500Error) return kInternalError;
          }
        } catch (error) {}
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region update sub rol model
  private async updateSubRoleModel(body) {
    try {
      const roleId = body?.roleId;
      const adminId = body?.adminId;
      const isActive = body?.isActive;
      const subRoleModelId = body?.subRoleModelId;
      const roleModelId = body?.roleModelId;
      const access_list = [];
      const removeAccess = body?.removeAccess ?? [];
      // find
      const where = { roleId, subRoleModelId, roleModelId };
      const att = ['id', 'access_list'];
      const find = await this.accessOfRoleRepo.getRoweData(att, { where });
      if (!find || find === k500Error) return kInternalError;
      // find access list id and check this id is validate
      const list = await this.accessOfListRepo.getTableWhereData(['id'], {});
      if (!list || list === k500Error) return kInternalError;
      (body?.access_list ?? []).forEach((e) => {
        if (list.find((f) => f?.id === e)) access_list.push(e);
      });
      // update
      (find?.access_list ?? []).forEach((e) => {
        const find = removeAccess.find((f) => e === f);
        if (!find) if (!access_list.includes(e)) access_list.push(e);
      });
      // update sub role
      const update = { access_list, subRoleModelId, roleModelId, adminId };
      await this.addOrUpdateSubRoleModel(update);
      //
      const data = { access_list, adminId, isActive };
      return await this.accessOfRoleRepo.updateRowData(data, find.id);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region create and update sub role model
  async addOrUpdateSubRoleModel(body: any) {
    try {
      if (body?.subRoleModelId) {
        try {
          const att = ['title'];
          const options = { where: { id: body?.subRoleModelId } };
          const result = await this.subRoleModuleRepo.getRoweData(att, options);
          if (!result || result === k500Error) return kInternalError;
          body.title = result.title;
        } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
      }

      /// check params
      const title = (body?.title ?? '').toLowerCase().trim();
      const adminId = body?.adminId;
      const roleModelId = body?.roleModelId;
      const access_list = [];
      const removeAccess = body?.removeAccess ?? [];
      if (!title) return kParamMissing('title');
      if (!adminId) return kParamMissing('adminId');
      if (!roleModelId) return kParamMissing('roleModelId');

      /// check role model is exite
      const checkRoleModel = await this.adminRoleModuleRepo.getRoweData(
        ['id'],
        {
          where: { id: roleModelId },
        },
      );
      if (!checkRoleModel || checkRoleModel === k500Error)
        return kInternalError;

      /// find access list id and check this id is valide
      const list = await this.accessOfListRepo.getTableWhereData(['id'], {});
      if (!list || list === k500Error) return kInternalError;
      (body?.access_list ?? []).forEach((e) => {
        if (list.find((f) => f?.id === e)) access_list.push(e);
      });
      /// find data
      const att: any = null;
      const options = { where: { title } };
      const findData = await this.subRoleModuleRepo.getRoweData(att, options);
      if (findData === k500Error) return kInternalError;
      if (!findData) {
        /// create
        const data = { title, adminId, roleModelId, access_list };
        return await this.subRoleModuleRepo.create(data);
      } else {
        /// update
        (findData?.access_list ?? []).forEach((e) => {
          const find = removeAccess.find((f) => e === f);
          if (!find) if (!access_list.includes(e)) access_list.push(e);
        });
        const data = { access_list };
        return await this.subRoleModuleRepo.updateRowData(data, findData.id);
      }
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region create admin role
  async createAdminRole(body) {
    try {
      const title = (body?.title ?? '').toLowerCase().trim();
      const adminId = body?.adminId;
      if (!title) return kParamMissing('title');
      if (!adminId) return kParamMissing('adminId');
      const att = ['id'];
      const options = { where: { title } };
      const find = await this.roleRepo.getRoweData(att, options);
      if (find === k500Error) return kInternalError;
      if (find) return k409ErrorMessage();
      const create = await this.roleRepo.create({ title, adminId });
      if (!create || create === k500Error) return kInternalError;
      return await this.createOfAccessOfRole(create.id, adminId);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion

  //#region  add access role value in role
  async addAccessOfRole(body: any) {
    try {
      const title = (body?.title ?? '').toLowerCase().trim();
      const adminId = body?.adminId;
      if (!title) return kParamMissing('title');
      if (!adminId) return kParamMissing('adminId');
      const data = { title, adminId };
      const result = await this.accessOfListRepo.create(data);
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }

  //#region  Get access role
  async getAccessOfRole() {
    try {
      const att = ['id', 'title'];
      const result = await this.accessOfListRepo.getTableWhereData(att, {});
      if (!result || result === k500Error) return kInternalError;
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
