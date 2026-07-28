export type StackStatus = {
  databaseConfigured: boolean;
  environment: "development" | "production" | "test";
};

export function getStackStatus(
  environment: string | undefined,
  mongoUri: string | undefined,
): StackStatus {
  const normalizedEnvironment =
    environment === "production" || environment === "test"
      ? environment
      : "development";

  return {
    databaseConfigured: Boolean(mongoUri?.trim()),
    environment: normalizedEnvironment,
  };
}
