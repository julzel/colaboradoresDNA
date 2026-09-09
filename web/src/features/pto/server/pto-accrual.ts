import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import { getTodayInCostaRica } from "@/features/calendar/domain/calendar-utils";
import type { EmployeeDocument } from "@/features/employees/domain/employee";
import type { PtoBalanceDocument, PtoBalanceLedgerDocument } from "../domain/pto";
import { ensurePtoIndexes } from "./pto-indexes";

/** One day = two half-day units. Repeated/concurrent runs cannot double-credit. */
export async function accrueMonthlyPto(now = new Date()) {
  const month = getTodayInCostaRica(now).slice(0, 7);
  const startMonth = process.env.PTO_ACCRUAL_START_MONTH;
  if (!startMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth))
    throw new Error("Configure PTO_ACCRUAL_START_MONTH (YYYY-MM).");
  if (month < startMonth) return { month, credited: 0 };
  await ensurePtoIndexes();
  const database = await getDatabase();
  const client = await getMongoClient();
  const employees = await database
    .collection<EmployeeDocument>("employees")
    .find({ employmentStatus: "active", employmentStartedOn: { $lte: `${month}-01` } })
    .toArray();
  const balances = database.collection<PtoBalanceDocument>("pto_balances");
  const ledger = database.collection<PtoBalanceLedgerDocument>("pto_balance_ledger");
  let credited = 0;
  for (const employee of employees) {
    const credit = () =>
      client.withSession((session) =>
        session.withTransaction(async () => {
          if (
            await ledger.findOne(
              {
                employeeId: employee._id,
                kind: "monthly_accrual",
                accrualMonth: month,
              },
              { session },
            )
          )
            return false;
          const balance = await balances.findOneAndUpdate(
            { employeeId: employee._id },
            {
              $setOnInsert: {
                _id: new ObjectId(),
                createdAt: now,
                currentBalanceUnits: 0,
                openingBalanceUnits: 0,
                version: 0,
                updatedAt: now,
              },
            },
            { upsert: true, returnDocument: "after", session },
          );
          if (!balance) throw new Error("Missing PTO balance");
          await balances.updateOne(
            { _id: balance._id },
            { $inc: { currentBalanceUnits: 2, version: 1 }, $set: { updatedAt: now } },
            { session },
          );
          await ledger.insertOne(
            {
              _id: new ObjectId(),
              employeeId: employee._id,
              actorPlatformUserId: null,
              kind: "monthly_accrual",
              accrualMonth: month,
              requestId: null,
              reason: `Acumulación mensual ${month}`,
              createdAt: now,
              deltaUnits: 2,
              balanceBeforeUnits: balance.currentBalanceUnits,
              balanceAfterUnits: balance.currentBalanceUnits + 2,
            },
            { session },
          );
          return true;
        }),
      );
    let applied;
    try {
      applied = await credit();
    } catch (error) {
      // MongoDB does not retry duplicate-key upserts automatically. A concurrent
      // first balance creation can race; re-read the committed ledger in a new transaction.
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      applied = await credit();
    }
    if (applied) credited++;
  }
  return { month, credited };
}
