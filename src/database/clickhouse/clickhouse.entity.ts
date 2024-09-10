export const APILoggerEntity = `
CREATE TABLE IF NOT EXISTS APILogger (
  id UUID DEFAULT generateUUIDv4(),
  
  type String,
  userId UUID DEFAULT NULL,
  adminId UInt256  DEFAULT NULL,
  loanId UInt256  DEFAULT NULL,
  apiEndpoint String,
  body String,
  headers String,
  data String,
  ip String,
  sourceId String,
  traceId UInt256  DEFAULT NULL,
  
  createdAt DateTime64(3) DEFAULT now(),
  updatedAt DateTime64(3) DEFAULT now()

)
ENGINE = MergeTree()
PRIMARY KEY (id)`;
