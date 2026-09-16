import { describe, expect, it } from "vitest";
import {
  emailDeliveryAllowed,
  resolveDataEnvironment,
  resolveRuntimeEnvironment,
  validateRuntimeEnvironment,
} from "./runtimeEnvironment";

describe("runtime environment safety", () => {
  it("derives preview runtime and Test data from Vercel", () => {
    expect(resolveRuntimeEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(resolveDataEnvironment({ VERCEL_ENV: "preview" })).toBe("test");
  });

  it("rejects live Stripe credentials outside production", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "development",
      APP_RUNTIME_DB_LABEL: "mergifypdf-test",
      STRIPE_SECRET_KEY: "sk_live_redacted",
    });
    expect(result.errors).toContain("Live Stripe credentials are forbidden outside production.");
  });

  it("requires branch deployments to use labelled Test data", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "preview",
      VERCEL_ENV: "preview",
      APP_DATA_ENV: "production",
      APP_RUNTIME_GUARD_STRICT: "false",
      APP_RUNTIME_DB_LABEL: "mergifypdf-production",
      R2_BUCKET: "configured",
      R2_BUCKET_ENVIRONMENT: "production",
    });
    expect(result.errors).toContain("Development and preview require APP_DATA_ENV=test.");
  });

  it("allows a fully labelled preview that uses Test data", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "preview",
      VERCEL_ENV: "preview",
      APP_DATA_ENV: "test",
      APP_RUNTIME_GUARD_STRICT: "true",
      APP_RUNTIME_DB_LABEL: "mergifypdf-test",
      APP_RUNTIME_NAME: "mergifypdf",
      DATABASE_URL: "configured",
      NEXTAUTH_SECRET: "configured",
      R2_BUCKET: "configured",
      R2_BUCKET_ENVIRONMENT: "test",
      UPSTASH_REDIS_REST_URL: "configured",
      REDIS_ENVIRONMENT: "test",
      EMAIL_DELIVERY_MODE: "sandbox",
    });
    expect(result.errors).toEqual([]);
  });

  it("rejects an invalid data environment", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "development",
      APP_DATA_ENV: "preview",
      APP_RUNTIME_DB_LABEL: "mergifypdf-test",
    });
    expect(result.errors).toContain("APP_DATA_ENV must be test or production.");
  });

  it("disables email by default outside production", () => {
    expect(emailDeliveryAllowed({ APP_RUNTIME_ENV: "development" })).toBe(false);
    expect(emailDeliveryAllowed({ APP_RUNTIME_ENV: "preview", EMAIL_DELIVERY_MODE: "sandbox" })).toBe(true);
    expect(emailDeliveryAllowed({ APP_RUNTIME_ENV: "production" })).toBe(true);
  });

  it("requires core preview identity variables without printing values", () => {
    const result = validateRuntimeEnvironment({ APP_RUNTIME_ENV: "preview" });
    expect(result.errors).toContain("Missing required variable: DATABASE_URL.");
    expect(result.errors).toContain("Missing required variable: NEXTAUTH_SECRET.");
  });
});
