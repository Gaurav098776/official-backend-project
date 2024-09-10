export class TransactionJSON {
  id?: number;
  transactionId?: string;
  amount?: number;
  balanceAfterTransaction?: number;
  bank?: string;
  category?: string;
  dateTime?: any;
  description?: string;
  remark?: string;
  transactionNumber?: string;
  type?: string;
  loanCompanyName?: string;
  accountId?: string;
  orderNumber?: number;
  isFraud?: boolean;
  subCategory?: string;
  organisationId?;
  constructor(
    id?: number,
    transactionId?: string,
    amount?: number,
    balanceAfterTransaction?: number,
    bank?: string,
    category?: string,
    dateTime?: any,
    description?: string,
    remark?: string,
    transactionNumber?: string,
    type?: string,
    loanCompanyName?: string,
    accountId?: string,
    orderNumber?: number,
    isFrude?: boolean,
    subCategory?: string,
    organisationId?,
  ) {
    this.id = id;
    this.transactionId = transactionId;
    this.amount = amount;
    this.balanceAfterTransaction = balanceAfterTransaction;
    this.description = description;
    this.bank = bank;
    this.category = category;
    this.dateTime = dateTime;
    this.remark = remark;
    this.transactionNumber = transactionNumber;
    this.type = type;
    this.loanCompanyName = loanCompanyName;
    this.accountId = accountId;
    this.orderNumber = orderNumber;
    this.isFraud = isFrude;
    this.subCategory = subCategory;
    this.organisationId = organisationId;
  }
}
