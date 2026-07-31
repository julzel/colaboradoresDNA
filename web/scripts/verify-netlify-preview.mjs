const isNetlifyBuild = process.env.NETLIFY === "true";

if (!isNetlifyBuild) {
  console.log("Netlify development guard skipped outside Netlify.");
  process.exit(0);
}

const allowedDevelopmentContexts = new Set(["production", "deploy-preview"]);

if (!allowedDevelopmentContexts.has(process.env.CONTEXT)) {
  throw new Error(
    `Netlify build blocked: expected production or deploy-preview context, received ${
      process.env.CONTEXT ?? "unknown"
    }.`,
  );
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

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_test_")) {
  throw new Error(
    "Netlify development deployments must use a Clerk development publishable key (pk_test_).",
  );
}

if (!process.env.CLERK_SECRET_KEY.startsWith("sk_test_")) {
  throw new Error(
    "Netlify development deployments must use a Clerk development secret key (sk_test_).",
  );
}

if (!process.env.MONGODB_URI.startsWith("mongodb")) {
  throw new Error("MONGODB_URI must be a MongoDB connection string.");
}

console.log(`Netlify development environment verified (${process.env.CONTEXT}).`);
