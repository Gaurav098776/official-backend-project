import { Injectable } from '@nestjs/common';
import { kInternalError } from 'src/constants/responses';
import { RepositoryManager } from 'src/repositories/repository.manager';
import { k500Error } from 'src/constants/misc';
import { EmiEntity } from 'src/entities/emi.entity';
@Injectable()
export class AlertService {
  constructor(private readonly repoManager: RepositoryManager) {}

  //to get fault in system and our loan process
  async getDeprecationInSystem() {
    try {
      const result = [];
      const queries = [
        {
          queryName: 'loan complete but emi payment status not updated',
          query: `SELECT DISTINCT l.id as loanId
        FROM public."EmiEntities" as e JOIN public."loanTransactions" l ON e."loanId" = l.id
        WHERE l."loanStatus" = 'Complete' AND e.payment_status!= '1';`,
        },
        {
          queryName: 'loan complete but loan completion date is null',
          query: `SELECT l."userId" FROM "loanTransactions" as l WHERE l."loanStatus" = 'Complete' AND l."loanCompletionDate" IS NULL;`,
        },

        {
          queryName: 'transaction complete but transactionId or utr is null',
          query: `SELECT t.id as transactionId FROM "TransactionEntities" as t WHERE t."status"= 'COMPLETED' AND t."transactionId" IS NULL or t."utr" IS NULL;`,
        },

        {
          queryName:
            'transaction completion date is not equal to emi paid date',
          query: `SELECT t.id as transactionId FROM "TransactionEntities"as t JOIN "EmiEntities" as e ON t."emiId" = e.id
        where t."type"='EMIPAY' and t."completionDate" != e."payment_done_date" and t."status"='COMPLETED';`,
        },
        {
          queryName: 'emi paid but emi payment date is null',
          query: `SELECT e.id as emiId
        FROM "EmiEntities" as e where e."payment_done_date" IS NULL  AND  e."payment_status" ='1';`,
        },
        {
          queryName: 'loan active but all emi paid',
          query: `SELECT l.id as loanId FROM "loanTransactions" as l WHERE l."loanStatus" = 'Active'
        AND NOT EXISTS ( SELECT 1 FROM "EmiEntities" as e WHERE e."loanId" = l.id AND e."payment_status" <> '1');`,
        },
        {
          queryName: 'mismatch in paid amount in transaction table',
          query: `SELECT t.id as transactionId
        FROM "TransactionEntities" as t
        WHERE  t."status" = 'COMPLETED'
        AND ABS(t."paidAmount" - (
            t."principalAmount" + t."interestAmount" + t."penaltyAmount" +
            t."forClosureAmount" + t."regInterestAmount" + t."sgstForClosureCharge" +
            t."cgstForClosureCharge" + t."legalCharge" + t."bounceCharge" +
            t."penalCharge" + t."sgstOnBounceCharge" + t."cgstOnBounceCharge" +
            t."sgstOnPenalCharge" + t."cgstOnPenalCharge" + t."sgstOnLegalCharge" +
            t."cgstOnLegalCharge")
        ) >0.5`,
        },
        {
          queryName: 'emi paid date present but emi payment status not updated',
          query: `SELECT e.id as emiId From "EmiEntities" as e where (e.payment_done_date is not null and payment_status='0') or (e.payment_done_date is null and payment_status='1') ;`,
        },
        {
          queryName: 'loan active but loan disburse date null',
          query: `SELECT l.id as loanId FROM "loanTransactions" as l where l."loanStatus"='Active' and l."loan_disbursement_date" is null`,
        },
        {
          queryName: 'loan complete but noc not sent',
          query: `SELECT l.id as loanId FROM "loanTransactions" as l where l."loanStatus"='Complete' and l."nocURL" is null`,
        },
        {
          queryName: 'multiple loan running simultaniously',
          query: `SELECT  DISTINCT l."userId" FROM "loanTransactions" AS l WHERE l."loanStatus" NOT IN ('Complete')
        AND  EXISTS (
            SELECT 1
            FROM "loanTransactions" AS lt
            WHERE lt."userId" = l."userId"
            AND lt."loanStatus" NOT IN ('Rejected', 'Complete')
            AND lt.id < l.id
        );`,
        },
        {
          queryName: 'loan active but loan status is not 6 in master',
          query: `SELECT  l."userId"
        FROM public."loanTransactions" as l
        JOIN public."registeredUsers" as r ON l."userId" = r.id
        JOIN public."MasterEntities" as m ON r."masterId" = m.id
        WHERE l."loanStatus" = 'Active'
        AND m.status->>'loan' != '6';`,
        },
      ];
      for (let i = 0; i < queries.length; i++) {
        try {
          const query = queries[i]?.query;
          const queryName = queries[i]?.queryName;
          const rows = await this.repoManager.injectRawQuery(EmiEntity, query);
          if (rows == k500Error) result.push({ [queryName]: kInternalError });
          result.push({ [queryName]: rows });
        } catch (error) {}
      }
      return result;
    } catch (error) {
            console.error("Error in: ", error);
            return kInternalError;
        }
  }
  //#endregion
}
