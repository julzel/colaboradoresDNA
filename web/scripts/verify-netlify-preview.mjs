const isNetlifyBuild = process.env.NETLIFY === "true";
const environment = process.env.APP_ENVIRONMENT ?? "development";

if (!isNetlifyBuild && environment !== "production") {
  console.log("Netlify development guard skipped outside Netlify.");
  process.exit(0);
}

const allowedDevelopmentContexts = new Set(["production", "deploy-preview"]);

if (isNetlifyBuild && !allowedDevelopmentContexts.has(process.env.CONTEXT)) {
  throw new Error(
    `Netlify build blocked: expected production or deploy-preview context, received ${
      process.env.CONTEXT ?? "unknown"
    }.`,
  );
}

if (!["development", "production"].includes(environment)) {
  throw new Error("APP_ENVIRONMENT must be development or production.");
}
const production = environment === "production";
if (production && isNetlifyBuild && process.env.CONTEXT !== "production") {
  throw new Error("Production credentials are forbidden in Deploy Previews.");
}

const requiredVariables = [
  "BETTER_AUTH_SECRET",
  "APP_BASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "AUTH_EMAIL_FROM",
  "MONGODB_URI",
  "MONGODB_DB",
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
  throw new Error(
    `Missing Netlify development environment variables: ${missingVariables.join(", ")}.`,
  );
}

if (
  process.env.BETTER_AUTH_SECRET.length < 32 ||
  /replace|example|placeholder/i.test(process.env.BETTER_AUTH_SECRET)
) {
  throw new Error(
    "BETTER_AUTH_SECRET must be an independently generated secret of at least 32 characters.",
  );
}
if (
  !Number.isInteger(Number(process.env.SMTP_PORT)) ||
  Number(process.env.SMTP_PORT) < 1 ||
  Number(process.env.SMTP_PORT) > 65535
) {
  throw new Error("SMTP_PORT must be a valid port.");
}
if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) {
  throw new Error("Configure SMTP_USER and SMTP_PASSWORD together.");
}

if (!/^mongodb(?:\+srv)?:\/\//.test(process.env.MONGODB_URI)) {
  throw new Error("MONGODB_URI must be a MongoDB connection string.");
}

if (production) {
  let url;
  try {
    url = new URL(process.env.APP_BASE_URL);
  } catch {
    throw new Error("Production requires APP_BASE_URL with a valid HTTPS origin.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Production APP_BASE_URL must be a public HTTPS origin without credentials, path or query.",
    );
  }
  if (/(?:^|[_-])(dev|test|preview|staging)(?:$|[_-])/i.test(process.env.MONGODB_DB)) {
    throw new Error("Production requires a dedicated production MONGODB_DB.");
  }
  if (
    process.env.BOOTSTRAP_ADMIN_IDENTITIES ||
    process.env.ALLOW_PRODUCTION_ADMIN_BOOTSTRAP ||
    process.env.ALLOW_PRODUCTION_AUTH_MIGRATION
  ) {
    throw new Error(
      "Remove one-time administrator bootstrap variables before deployment.",
    );
  }
}

console.log(
  `Netlify ${environment} environment verified (${process.env.CONTEXT ?? "local"}).`,
);
