export type RuntimeEnvironment = "development" | "preview" | "production";
export type DataEnvironment = "test" | "production";

type StorageRuntimeEnv = Record<string, string | undefined>;
type RuntimeEnv = Record<string, string | undefined>;

const STORAGE_V2_REQUIRED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_INCOMING_BUCKET",
  "R2_SOURCE_BUCKET",
  "R2_DERIVED_BUCKET",
  "R2_EXPECTED_ACCOUNT_ID",
  "R2_EXPECTED_INCOMING_BUCKET",
  "R2_EXPECTED_SOURCE_BUCKET",
  "R2_EXPECTED_DERIVED_BUCKET",
] as const;

function normalizeRuntime(value: string | undefined): RuntimeEnvironment | null {
  if (value === "development" || value === "preview" || value === "production") return value;
  return null;
}

function normalizeDataEnvironment(value: string | undefined): DataEnvironment | null {
  if (value === "test" || value === "production") return value;
  return null;
}

export function resolveRuntimeEnvironment(env: RuntimeEnv = process.env): RuntimeEnvironment {
  return normalizeRuntime(env.APP_RUNTIME_ENV) ?? normalizeRuntime(env.VERCEL_ENV) ?? "development";
}

export function resolveDataEnvironment(env: RuntimeEnv = process.env): DataEnvironment {
  const declared = normalizeDataEnvironment(env.APP_DATA_ENV);
  if (declared) return declared;
  return resolveRuntimeEnvironment(env) === "production" ? "production" : "test";
}

export function validateStorageEnvironment(dataEnvironment: DataEnvironment, env: StorageRuntimeEnv) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hasLegacyStorage = Boolean(env.R2_BUCKET || env.R2_ACCOUNT_ID);
  const v2Enabled = env.STORAGE_MODEL_V2_ENABLED === "true";

  if (hasLegacyStorage && env.R2_BUCKET_ENVIRONMENT !== dataEnvironment) {
    errors.push("R2_BUCKET_ENVIRONMENT must match the data environment.");
  }
  if (!v2Enabled) {
    if (hasLegacyStorage) warnings.push("Secure storage model v2 is not enabled; legacy R2 compatibility is active.");
    return { errors, warnings };
  }

  for (const name of STORAGE_V2_REQUIRED) {
    if (!env[name]?.trim()) errors.push("Missing required variable: " + name + ".");
  }

  const identityPairs = [
    ["R2_ACCOUNT_ID", "R2_EXPECTED_ACCOUNT_ID"],
    ["R2_INCOMING_BUCKET", "R2_EXPECTED_INCOMING_BUCKET"],
    ["R2_SOURCE_BUCKET", "R2_EXPECTED_SOURCE_BUCKET"],
    ["R2_DERIVED_BUCKET", "R2_EXPECTED_DERIVED_BUCKET"],
  ] as const;
  for (const [actualName, expectedName] of identityPairs) {
    const actual = env[actualName]?.trim();
    const expected = env[expectedName]?.trim();
    if (actual && expected && actual !== expected) errors.push(actualName + " does not match its configured storage identity.");
  }

  const buckets = [env.R2_INCOMING_BUCKET?.trim(), env.R2_SOURCE_BUCKET?.trim(), env.R2_DERIVED_BUCKET?.trim()]
    .filter((value): value is string => Boolean(value));
  if (new Set(buckets).size !== buckets.length) errors.push("Secure storage requires separate incoming, source, and derived buckets.");
  if (env.R2_PUBLIC_BASE_URL?.trim()) errors.push("R2_PUBLIC_BASE_URL is forbidden when secure storage model v2 is enabled.");

  return { errors, warnings };
}

export type RuntimeEnvironmentValidation = {
  runtime: RuntimeEnvironment;
  dataEnvironment: DataEnvironment;
  errors: string[];
  warnings: string[];
};

export function emailDeliveryAllowed(env: RuntimeEnv = process.env) {
  return resolveRuntimeEnvironment(env) === "production" || env.EMAIL_DELIVERY_MODE === "sandbox";
}

export function validateRuntimeEnvironment(env: RuntimeEnv = process.env): RuntimeEnvironmentValidation {
  const runtime = resolveRuntimeEnvironment(env);
  const dataEnvironment = resolveDataEnvironment(env);
  const errors: string[] = [];
  const warnings: string[] = [];
  const declaredRuntime = normalizeRuntime(env.APP_RUNTIME_ENV);
  const vercelRuntime = normalizeRuntime(env.VERCEL_ENV);
  const declaredDataEnvironment = env.APP_DATA_ENV?.trim();
  const requiredVariables = runtime === "development" ? [] : ["DATABASE_URL", "NEXTAUTH_SECRET", "APP_RUNTIME_NAME", "APP_RUNTIME_DB_LABEL"];

  for (const name of requiredVariables) {
    if (!env[name]?.trim()) errors.push("Missing required variable: " + name + ".");
  }
  if (declaredRuntime && vercelRuntime && declaredRuntime !== vercelRuntime) errors.push("APP_RUNTIME_ENV must match VERCEL_ENV.");
  if (declaredDataEnvironment && !normalizeDataEnvironment(declaredDataEnvironment)) errors.push("APP_DATA_ENV must be test or production.");

  if (runtime !== "production" && dataEnvironment !== "test") errors.push("Development and preview require APP_DATA_ENV=test.");
  if (runtime === "production" && dataEnvironment !== "production") errors.push("Production requires APP_DATA_ENV=production.");
  if (dataEnvironment === "test" && !env.APP_RUNTIME_DB_LABEL?.toLowerCase().includes("test")) errors.push("Test data requires an APP_RUNTIME_DB_LABEL containing test.");
  if (dataEnvironment === "production" && !env.APP_RUNTIME_DB_LABEL?.toLowerCase().includes("prod")) errors.push("Production requires a production database label.");

  if (runtime !== "production" && env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) errors.push("Live Stripe credentials are forbidden outside production.");
  if (runtime === "production" && env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) errors.push("Stripe test credentials are forbidden in production.");
  if (runtime !== "production" && env.EMAIL_DELIVERY_MODE === "production") errors.push("Production email delivery is forbidden outside production.");
  if (runtime === "preview" && env.APP_RUNTIME_GUARD_STRICT !== "true") errors.push("Preview requires APP_RUNTIME_GUARD_STRICT=true.");
  if (runtime === "preview" && env.RESEND_API_KEY && env.EMAIL_DELIVERY_MODE !== "sandbox") errors.push("Preview email requires EMAIL_DELIVERY_MODE=sandbox.");

  if (env.REDIS_ENVIRONMENT && env.REDIS_ENVIRONMENT !== dataEnvironment) errors.push("REDIS_ENVIRONMENT must match the data environment.");
  const storageValidation = validateStorageEnvironment(dataEnvironment, env);
  errors.push(...storageValidation.errors);
  warnings.push(...storageValidation.warnings);

  return { runtime, dataEnvironment, errors, warnings };
}

export function assertRuntimeEnvironmentSafe(env: RuntimeEnv = process.env) {
  const result = validateRuntimeEnvironment(env);
  if (result.errors.length > 0) throw new Error(`Unsafe ${result.runtime} runtime configuration:\n- ${result.errors.join("\n- ")}`);
  return result;
}
