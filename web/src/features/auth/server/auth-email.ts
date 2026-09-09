import "server-only";
import nodemailer from "nodemailer";

export async function sendAuthMail(message: {
  to: string;
  subject: string;
  text: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, AUTH_EMAIL_FROM } =
    process.env;
  if (!SMTP_HOST || !SMTP_PORT || !AUTH_EMAIL_FROM)
    throw new Error("Configure SMTP_HOST, SMTP_PORT and AUTH_EMAIL_FROM.");
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_PORT === "465",
    requireTLS: process.env.APP_ENVIRONMENT === "production",
    auth:
      SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({ ...message, from: AUTH_EMAIL_FROM });
}
