// Imports
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DbQueryInterface } from '../db.query.interface';
import { Op } from 'sequelize';
import { CsConnectService, csClient } from './cs.connect.service';

@Injectable()
export class CsQueryService implements OnModuleInit {
  constructor(private readonly csConnectService: CsConnectService) {}

  async onModuleInit() {
    // await this.csConnectService.initialize();
  }

  async injectQuery(
    options: DbQueryInterface,
    type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    targetData?,
    filterType?: 'ALL' | 'ONE' | 'COUNT',
  ) {
    try {
      if (!csClient) await this.csConnectService.initialize();

      if (options.raw == null) options.raw = true;
      if (filterType == null) filterType = 'ONE';

      // Table name
      const tableName = options.entity?.getTableName();
      if (!tableName) throw Error('Invalid value -> entity');
      let incrementValue;

      // Handle where condition
      let whereStr = '';
      if (options.where) {
        whereStr += 'WHERE ';
        const attributeData = options.entity.rawAttributes ?? {};

        for (const key in options.where) {
          const targetStr = key.toLowerCase();
          const columnDetails = attributeData[key];
          const type = columnDetails.type;
          let dataType = (
            type.valueOf().constructor.name ?? 'Unknown'
          ).toLowerCase();
          let value = options.where[key];
          // Sequelize operators
          const valueDataType = typeof value;
          let sequelizeAdded = false;

          // Op operators
          if (valueDataType == 'object') {
            // Op In
            if (value[Op.in]) {
              whereStr += this.handleOpInWhereStr(key, value);
              sequelizeAdded = true;
            }
            // Op lte
            else if (value[Op.lte]) {
              whereStr += this.handleOpLteWhereStr(key, value);
              sequelizeAdded = true;
            } // Op gte
            else if (value[Op.gte]) {
              whereStr += this.handleOpGteWhereStr(key, value);
              sequelizeAdded = true;
            }
          }
          if (!sequelizeAdded) {
            if (dataType == 'boolean' || dataType == 'integer')
              whereStr += `${targetStr} = ${value} AND `;
            else whereStr += `${targetStr} = '${value}' AND `;
          }
        }
        // Op and
        if (options.where[Op.and]) {
          const value = options.where[Op.and];
          value.forEach((el) => {
            for (const key in el) {
              const subValue = el[key];
              // Op lte
              if (subValue[Op.lte]) {
                whereStr += this.handleOpLteWhereStr(key, subValue);
              }
              // Op gte
              else if (subValue[Op.gte]) {
                whereStr += this.handleOpGteWhereStr(key, subValue);
              }
            }
          });
        }
        // Finetuning
        if (whereStr.endsWith('AND ')) {
          const index = whereStr.lastIndexOf('AND ');
          whereStr = whereStr.substring(0, index);
        }

        whereStr = whereStr.replace(/\[object Object\]/g, '');
      }

      let query = '';
      // READ
      const extraKeys = [];
      if (type == 'READ') {
        query += 'SELECT ';
        // Attributes
        const attributes: any = options.attributes ?? [];
        if (attributes.length == 0) {
          if (filterType == 'COUNT') query += 'COUNT(id)';
          else query += '* ';
        } else {
          const finalizedAttributes = [];
          attributes.forEach((el) => {
            const dataType = typeof el;
            if (dataType == 'object') {
              if (el.length > 0) {
                const fnData = el[0];
                let alias = '';
                const fnType = fnData.fn;
                if (fnType == 'COUNT') {
                  const countName = fnData.args[0].col;
                  if (el.length == 2) alias = el[1];
                  else alias = countName;
                  extraKeys.push(alias);
                  const strAttr = `COUNT(${countName}) AS ${alias},`;
                  query += strAttr;
                }
              }
            } else finalizedAttributes.push(el);
          });
          query += finalizedAttributes.join(',') + ' ';
        }

        query += 'FROM Litt.' + tableName + ' ';

        if (whereStr) query += whereStr;

        // Group by
        if (options.group) {
          const groupList: any = options.group ?? [];
          query += ' GROUP BY ' + groupList.join(',');
        }

        // Order by
        if (options.order) {
          let orderByStr = 'ORDER BY ';
          const orderList: any = options.order ?? [];
          const targetList = [];
          orderList.forEach((el) => {
            const targetKey = el[0];
            let type = 'ASC';
            if (el.length > 1) type = el[1];
            targetList.push(targetKey + ' ' + type);
          });
          orderByStr += targetList.join(',');
          query += orderByStr;
        }

        if (filterType == 'ONE') query += ' LIMIT 1';
        if (options.limit && filterType == 'ALL')
          query += ` LIMIT ${options.limit}`;
      }
      // CREATE
      else if (type == 'CREATE') {
        if (!targetData) throw Error('Invalid value -> data');
        const keys = Object.keys(targetData);
        if (keys.length == 0) throw Error('Invalid value -> data');

        query += 'INSERT INTO ';
        query += 'Litt.' + tableName + ' (';

        const attributeData = options.entity.rawAttributes ?? {};
        let values = '';
        for (
          let index = 0;
          index < Object.keys(attributeData).length;
          index++
        ) {
          const key = Object.keys(attributeData)[index];

          // Prepare query
          query += `"${key.toLowerCase()}"`;
          const isLastLength = index == Object.keys(attributeData).length - 1;
          if (!isLastLength) query += ', ';
          else query += ') VALUES(';

          const columnDetails = attributeData[key];
          const type = columnDetails.type;
          let dataType = (
            type.valueOf().constructor.name ?? 'Unknown'
          ).toLowerCase();
          if (['enum', 'string', 'uuid'].includes(dataType)) dataType = 'text';
          else if (dataType == 'integer') dataType = 'int';
          else if (dataType == 'array') dataType = 'list<text>';

          let keyFound = false;
          for (let i = 0; i < Object.keys(targetData).length; i++) {
            const data = Object.keys(targetData)[i];
            let value = targetData[data];
            if (data.toLowerCase() == key.toLowerCase()) {
              if (dataType == 'text') {
                if (typeof value == 'number') value = value.toString();
                // Cassandra not accept the apostophy (We can add with '' to work)
                if ((value ?? '').includes("'"))
                  value = value.replace(/'/g, '');
                if (
                  (value ?? '').includes('/') ||
                  (value ?? '').includes('\\')
                ) {
                  value = value.replace(/\\/g, '');
                  value = value.replace(/'/g, '');
                }
                if (isLastLength) values += `'${value}'`;
                else values += `'${value}', `;
              } else if (dataType == 'list<text>') {
                let arrayStr = '[';
                const arrayEl = [];
                value?.forEach((el) => {
                  arrayEl.push(`'${el}'`);
                });
                arrayStr += arrayEl.join(',');
                arrayStr += ']';
                if (isLastLength) values += `${arrayStr}`;
                else values += `${arrayStr}, `;
              } else if (dataType == 'date') {
                value = new Date(value).toJSON().substring(0, 10);
                if (isLastLength) values += `'${value}'`;
                else values += `'${value}', `;
              } else {
                if (!value || value == undefined) continue;

                if (isLastLength) values += `${value}`;
                else values += `${value}, `;
              }

              keyFound = true;
              break;
            }
          }
          // Default or null values
          if (!keyFound) {
            if (columnDetails.autoIncrement) {
              incrementValue = this.getIncrementValue();
              values += incrementValue + ', ';
            } else if (columnDetails.defaultValue)
              values += columnDetails.defaultValue + ', ';
            else if (!isLastLength) values += 'null, ';
            else {
              if (key == 'updatedAt')
                values += `'${new Date().toJSON().substring(0, 10)}'`;
              else values += 'null';
            }
          }
        }

        query += values + ')';
      }
      // UPDATE
      else if (type == 'UPDATE') {
        if (!targetData) throw Error('Invalid value -> data');
        const keys = Object.keys(targetData);
        if (keys.length == 0) throw Error('Invalid value -> data');

        query += 'UPDATE ' + 'Litt.' + tableName + ' SET ';

        const attributeData = options.entity.rawAttributes ?? {};
        const updateCombinations = [];
        let isRestrictedUpdate = false;
        for (
          let index = 0;
          index < Object.keys(attributeData).length;
          index++
        ) {
          const key = Object.keys(attributeData)[index];

          for (let i = 0; i < Object.keys(targetData).length; i++) {
            const data = Object.keys(targetData)[i];
            let value = targetData[data];

            if (data.toLowerCase() == key.toLowerCase()) {
              const columnDetails = attributeData[key];
              const type = columnDetails.type;
              let dataType = (
                type.valueOf().constructor.name ?? 'Unknown'
              ).toLowerCase();
              // Default value
              if (value == undefined || value == null) {
                if (columnDetails.defaultValue != null) {
                  value = columnDetails.defaultValue;
                }
              }
              if (dataType == 'string' || dataType == 'text') {
                updateCombinations.push(`${key} = '${value}' `);
              } else if (dataType == 'array') {
                let arrayStr = '[';
                const elList = [];
                value?.forEach((el) => {
                  elList.push(`'${el}'`);
                });
                arrayStr += elList.join(',') + ']';
                updateCombinations.push(`${key} = ${arrayStr} `);
              } else updateCombinations.push(`${key} = ${value} `);
              const comment = columnDetails.comment ?? '';
              const isPartialKey = comment.includes('PARTIAL KEY FOR CS');
              /* Cassandra does not support updating partial key
              We need to delete and insert new record due to architecture issue */
              if (isPartialKey) isRestrictedUpdate = true;
              break;
            }
          }
        }

        // Normal update
        if (!isRestrictedUpdate) {
          query += updateCombinations.join(',');
        } else {
          /* Cassandra does not support updating partial key
          We need to delete and insert new record due to architecture issue */
          const subOptions: DbQueryInterface = {
            entity: options.entity,
            type: 'CS',
            where: options.where,
          };
          const targetList = await this.injectQuery(
            subOptions,
            'READ',
            null,
            'ALL',
          );
          if (targetList.length == 0) return {};
          // Delete old records
          const deleteOptions: DbQueryInterface = {
            entity: options.entity,
            where: options.where,
            type: 'CS',
          };
          // Create new values
          await this.injectQuery(deleteOptions, 'DELETE', null, 'ALL');
          for (let index = 0; index < targetList.length; index++) {
            const data = targetList[index];
            for (const key in targetData) {
              data[key] = targetData[key];
            }
            // Create new record
            const createOptions: DbQueryInterface = {
              entity: options.entity,
              type: 'CS',
            };
            await this.injectQuery(createOptions, 'CREATE', data);
          }
          return [targetList.length];
        }

        if (whereStr) query += whereStr;
      }
      // DELETE
      else if (type == 'DELETE') {
        query += `DELETE FROM ${tableName} `;
        if (whereStr) query += whereStr;
      }

      if (type == 'READ' && options.where) query += ' ALLOW FILTERING';

      // Tail
      query += ';';
      const data: any = await csClient.execute(query);
      if (options.raw) {
        if (type == 'READ') {
          if (data.rowLength == 1 && filterType != 'ALL') {
            // Count
            if (filterType == 'COUNT') {
              const countData = data.rows[0]['system.count(id)'];
              return (countData.high ?? 0) + (countData.low ?? 0);
            }
            // Find one
            return this.fineTuneObjects(
              data.rows[0],
              options.entity,
              extraKeys,
            );
          }
          // Find all
          else if (data.rowLength >= 1) {
            return data.rows.map((el) =>
              this.fineTuneObjects(el, options.entity, extraKeys),
            );
          } else if (filterType == 'ALL') return [];
          else return null;
        } else if (type == 'CREATE') {
          if (incrementValue)
            return await this.injectQuery(
              { entity: options.entity, where: { id: incrementValue } },
              'READ',
              null,
              'ONE',
            );
        }
        return data.rows;
      }
    } catch (error) {
      console.log({ error });
    }
  }

  async injectRawQuery(options: DbQueryInterface) {
    const data = await csClient.execute(options.rawQuery);
    if (options.fineTuneRawQuery) {
      if (data.rowLength >= 1)
        return data.rows.map((el) => this.fineTuneObjects(el, options.entity));
      else return [];
    } else return data;
  }

  private handleOpInWhereStr(key, value) {
    let opInStr = '';
    value[Op.in].forEach((el, index) => {
      const isLastLength = index == value[Op.in].length - 1;
      if (isLastLength) opInStr += `'${el}'`;
      else opInStr += `'${el}'` + ', ';
    });
    value += ` IN (` + opInStr + ')';
    return `${key}${value} AND `;
  }

  private handleOpGteWhereStr(key, value) {
    if (typeof value[Op.gte] == 'object') {
      if (!isNaN(new Date(value[Op.gte]).getTime())) {
        const targetStr = new Date(value[Op.gte]).toJSON().substring(0, 10);
        value += ` <= '` + targetStr + "'";
        return `${key}${value} AND `;
      }
    } else if (typeof value[Op.gte] == 'number') {
      return `${key} >= ${value[Op.gte]} AND `;
    }
    return '';
  }

  private handleOpLteWhereStr(key, value) {
    if (typeof value[Op.lte] == 'object') {
      if (!isNaN(new Date(value[Op.lte]).getTime())) {
        const targetStr = new Date(value[Op.lte]).toJSON().substring(0, 10);
        value += ` >= '` + targetStr + "'";
        return `${key}${value} AND `;
      }
    } else if (typeof value[Op.lte] == 'number') {
      return `${key} <= ${value[Op.lte]} AND `;
    }
    return '';
  }

  private getIncrementValue() {
    const today = new Date();

    // Month combo
    const month: string = today.getMonth().toString();
    let monthInt = 0;
    for (let index = 0; index < month.length; index++) {
      monthInt += +month[index];
    }
    // Day combo
    const day: string = today.getDate().toString();
    let dayInt = 0;
    for (let index = 0; index < day.length; index++) {
      dayInt += +day[index];
    }
    // Hours combo
    const hour: string = today.getHours().toString();
    let hourInt = 0;
    for (let index = 0; index < hour.length; index++) {
      hourInt += +hour[index];
    }
    // Minutes combo
    const minute: string = today.getMinutes().toString();
    let minuteInt = 0;
    for (let index = 0; index < minute.length; index++) {
      minuteInt += +minute[index];
    } // Seconds combo
    const second: string = today.getMinutes().toString();
    let secondInt = 0;
    for (let index = 0; index < second.length; index++) {
      secondInt += +second[index];
    }
    // Milli combo
    const milliInt = today.getMilliseconds();

    const charset = '0123456789';
    const max_Length = 2;
    const charPicker = Math.floor(
      Math.random() * (max_Length - max_Length + 1) + max_Length,
    );
    let randomId = '';
    for (var i = 0; i < charPicker; i++) {
      randomId += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const totalInt =
      randomId +
      monthInt.toString() +
      randomId +
      hourInt.toString() +
      randomId +
      secondInt.toString() +
      randomId +
      milliInt.toString();

    return +totalInt;
  }

  private fineTuneObjects(rowData, entity, extraKeys = []) {
    const attributeData = entity.rawAttributes ?? {};
    const finalizedData: any = {};

    for (let i = 0; i < Object.keys(rowData).length; i++) {
      const key = Object.keys(rowData)[i];

      let isKeyFound = false;
      for (let index = 0; index < Object.keys(attributeData).length; index++) {
        const attrKey = Object.keys(attributeData)[index];
        // In case cassandra dataType is not compatible with postgres
        let isDataModified = false;
        if (attrKey.toLowerCase() == key) {
          if (typeof rowData[key] == 'object') {
            if (rowData[key]?.year && rowData[key]?.month) {
              finalizedData[attrKey] = rowData[key].date;
              isDataModified = true;
            }
          }
          // Cassandra dataType is compatible with postgres
          if (!isDataModified) {
            finalizedData[attrKey] = rowData[key];
          }
          isKeyFound = true;
        }
      }

      // Extra keys
      if (!isKeyFound) {
        for (let j = 0; j < extraKeys.length; j++) {
          const extraKey: string = extraKeys[j];
          if (extraKey.toLowerCase() == key) {
            const value = rowData[key];
            if (typeof value == 'object') {
              // Converts long to number
              if (value.low != null && value.high != null) {
                finalizedData[extraKey] = value.low + value.high;
              } else finalizedData[extraKey] = value;
            } else finalizedData[extraKey] = value;
            break;
          }
        }
      }
    }

    return finalizedData;
  }
}
