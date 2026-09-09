// Daily at midnight Costa Rica (06:00 UTC). Daily retries credit only once/month.
export const config = { schedule: "0 6 * * *" };

export default async function () {
  if (process.env.CONTEXT !== "production") return;
  const baseURL = process.env.APP_BASE_URL;
  const secret = process.env.CRON_SECRET;
  if (!baseURL || !secret) throw new Error("Missing PTO accrual configuration");
  const response = await fetch(new URL("/api/internal/pto-accrual", baseURL), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(25000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`PTO accrual failed: ${response.status}`);
}
