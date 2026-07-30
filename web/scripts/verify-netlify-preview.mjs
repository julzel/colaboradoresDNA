const isNetlifyBuild = process.env.NETLIFY === "true";

if (!isNetlifyBuild) {
  console.log("Netlify preview guard skipped outside Netlify.");
  process.exit(0);
}

if (process.env.CONTEXT !== "deploy-preview") {
  throw new Error(
    `Netlify build blocked: expected deploy-preview context, received ${
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
    `Missing Deploy Preview environment variables: ${missingVariables.join(", ")}.`,
  );
}

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_test_")) {
  throw new Error(
    "Deploy Previews must use a Clerk development publishable key (pk_test_).",
  );
}

if (!process.env.CLERK_SECRET_KEY.startsWith("sk_test_")) {
  throw new Error(
    "Deploy Previews must use a Clerk development secret key (sk_test_).",
  );
}

if (!process.env.MONGODB_URI.startsWith("mongodb")) {
  throw new Error("MONGODB_URI must be a MongoDB connection string.");
}

console.log("Netlify Deploy Preview environment verified.");
