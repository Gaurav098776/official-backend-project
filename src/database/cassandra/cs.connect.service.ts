// Imports
import { Injectable } from '@nestjs/common';
import * as cassandra from 'cassandra-driver';
import { EnvConfig } from 'src/configs/env.config';
import { APILogsEntity } from 'src/entities/apilog.entity';

export let csClient: cassandra.Client;

@Injectable()
export class CsConnectService {
  async initialize() {
    try {
      if (csClient) return;

      const client = new cassandra.Client({
        contactPoints: [EnvConfig.database.cassandra.host1],
        localDataCenter: 'datacenter1',
        credentials: {
          username: EnvConfig.database.cassandra.username,
          password: EnvConfig.database.cassandra.password,
        },
      });

      await client.connect(async function (err) {
        if (err) {
          console.log({ err });
          throw new Error(
            'CsConnectService Error, Reason -> DB connection failure',
          );
        } else csClient = client;
      });

      await this.delay(2500);
      await this.injectKeySpaces();
      await this.injectTables();
      console.log('CASSANDRA CONNECTED SUCCESSFULLY xD !');
    } catch (error) {
      console.log(error);
    }
  }

  async injectKeySpaces() {
    const keySpaces = ['Litt'];

    for (let index = 0; index < keySpaces.length; index++) {
      const keySpace = keySpaces[index];
      let query = 'CREATE KEYSPACE IF NOT EXISTS ' + keySpace;
      query +=
        " WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'datacenter1' : 3 }";

      await csClient.execute(query);
    }
  }

  async injectTables() {
    const entities = [APILogsEntity];
    entities.forEach(async (entity) => {
      await this.injectTable(entity);
    });
  }

  private async injectTable(entity) {
    const tableName = entity.getTableName();
    const attributeData = entity.rawAttributes ?? {};

    let query = `CREATE TABLE IF NOT EXISTS ${tableName}(`;
    let pkQuery = '';
    let partialKeys = [];

    // Get all attributes and iterate for query preparation
    for (let index = 0; index < Object.keys(attributeData).length; index++) {
      const key = Object.keys(attributeData)[index];
      const column = key;
      const columnDetails = attributeData[key];
      const comment = columnDetails.comment ?? '';
      let isPrimaryKey = columnDetails.primaryKey ?? false;
      if (!isPrimaryKey) isPrimaryKey = comment.includes('PRIMARY KEY FOR CS');
      if (isPrimaryKey && comment.includes('PRIMARY KEY EXCEPTION')) {
        isPrimaryKey = false;
      }
      // If we do not use comment for partial key then we need to make copy of all entity for cs manually
      const isPartialKey = comment.includes('PARTIAL KEY FOR CS');
      if (isPartialKey) partialKeys.push(column);

      const type = columnDetails.type;
      let dataType = (
        type.valueOf().constructor.name ?? 'Unknown'
      ).toLowerCase();
      if (dataType == 'string') dataType = 'text';
      else if (dataType == 'integer') {
        if (columnDetails?.autoIncrement == true) dataType = 'bigint';
        else dataType = 'int';
      } else if (dataType == 'array') dataType = 'list<text>';
      else if (dataType == 'enum' || dataType == 'uuid') dataType = 'varchar';

      // Prepare query
      query += column + ' ' + dataType;
      if (isPrimaryKey) pkQuery += column + ', ';
      const isLastLength = index == Object.keys(attributeData).length - 1;
      if (!isLastLength) query += ', ';
      else {
        if (pkQuery != '') {
          if (pkQuery.endsWith(', ')) pkQuery = pkQuery.slice(0, -2);
          query += ', PRIMARY KEY(';
          const partialKeyStr = partialKeys.join(',');
          if (partialKeyStr?.length > 2) query += '(' + partialKeyStr + '), ';
          query += pkQuery + ') ';
        }

        query += ');';
      }
    }

    // Create table if not exists
    await csClient.execute('USE Litt;');
    await csClient.execute(query);
  }

  private delay = (ms) => new Promise((res) => setTimeout(res, ms));
}
