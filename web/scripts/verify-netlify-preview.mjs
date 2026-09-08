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
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
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
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith(
    production ? "pk_live_" : "pk_test_",
  )
) {
  throw new Error(
    `The ${environment} environment requires a matching Clerk publishable key.`,
  );
}

if (!process.env.CLERK_SECRET_KEY.startsWith(production ? "sk_live_" : "sk_test_")) {
  throw new Error(
    `The ${environment} environment requires a matching Clerk secret key.`,
  );
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
    process.env.ALLOW_PRODUCTION_ADMIN_BOOTSTRAP
  ) {
    throw new Error(
      "Remove one-time administrator bootstrap variables before deployment.",
    );
  }
}

console.log(
  `Netlify ${environment} environment verified (${process.env.CONTEXT ?? "local"}).`,
);
