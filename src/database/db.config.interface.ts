export interface DatabaseConfigAttributes {
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number | string;
  dialect?: string;
  urlDatabase?: string;
  logging?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
    handleDisconnects?: boolean;
  };
}

export interface DatabaseConfig {
  user: DatabaseConfigAttributes;
  contact: DatabaseConfigAttributes;
  netbanking: DatabaseConfigAttributes;
  indbank: DatabaseConfigAttributes;
  archived: DatabaseConfigAttributes;
}
