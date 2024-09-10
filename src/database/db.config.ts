// Imports
import * as dotenv from 'dotenv';
import { DatabaseConfig } from './db.config.interface';

dotenv.config();

export const databaseConfig: DatabaseConfig = {
  user: {
    username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
    password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
    database: process.env.DATABASE_CORE,
    host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
    port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
      handleDisconnects: true,
      max: 25,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  contact: {
    username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
    password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
    database: process.env.DATABASE_CONTACT,
    host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
    port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
      handleDisconnects: true,
      max: 25,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  netbanking: {
    username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
    password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
    database: process.env.DATABASE_NETBANKING,
    host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
    port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
      handleDisconnects: true,
      max: 25,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  indbank: {
    username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
    password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
    database: process.env.DATABASE_BANK,
    host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
    port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
      handleDisconnects: true,
      max: 25,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  archived: {
    username: process.env.DB_UBUNTU_USER ?? process.env.DB_USER,
    password: process.env.DB_UBUNTU_PASS ?? process.env.DB_PASS,
    database: process.env.DATABASE_ARCHIVED,
    host: process.env.DB_UBUNTU_HOST ?? process.env.DB_HOST,
    port: process.env.DB_UBUNTU_PORT ?? process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    pool: {
      handleDisconnects: true,
      max: 25,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
