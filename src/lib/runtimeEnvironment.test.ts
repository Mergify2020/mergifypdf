import { describe, expect, it } from "vitest";
import {
  emailDeliveryAllowed,
  resolveRuntimeEnvironment,
  validateRuntimeEnvironment,
} from "./runtimeEnvironment";

describe("runtime environment safety", () => {
  it("derives preview from Vercel", () => {
    expect(resolveRuntimeEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
  });

  it("rejects live Stripe credentials outside production", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "development",
      STRIPE_SECRET_KEY: "sk_live_redacted",
    });
    expect(result.errors).toContain("Live Stripe credentials are forbidden outside production.");
  });

  it("requires isolated preview labels", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "preview",
      VERCEL_ENV: "preview",
      APP_RUNTIME_GUARD_STRICT: "false",
      APP_RUNTIME_DB_LABEL: "production",
      R2_BUCKET: "configured",
      R2_BUCKET_ENVIRONMENT: "production",
    });
    expect(result.errors).toContain("Preview requires APP_RUNTIME_GUARD_STRICT=true.");
    expect(result.errors).toContain("Preview requires an APP_RUNTIME_DB_LABEL containing preview.");
    expect(result.errors).toContain("Preview R2 access requires R2_BUCKET_ENVIRONMENT=preview.");
  });

  it("allows a fully labelled preview environment", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "preview",
      VERCEL_ENV: "preview",
      APP_RUNTIME_GUARD_STRICT: "true",
      APP_RUNTIME_DB_LABEL: "mergifypdf-preview",
      APP_RUNTIME_NAME: "mergifypdf",
      DATABASE_URL: "configured",
      NEXTAUTH_SECRET: "configured",
      R2_BUCKET: "configured",
      R2_BUCKET_ENVIRONMENT: "preview",
      UPSTASH_REDIS_REST_URL: "configured",
      REDIS_ENVIRONMENT: "preview",
      EMAIL_DELIVERY_MODE: "sandbox",
    });
    expect(result.errors).toEqual([]);
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

  it("denies production-labelled resources in development", () => {
    const result = validateRuntimeEnvironment({
      APP_RUNTIME_ENV: "development",
      APP_RUNTIME_DB_LABEL: "mergifypdf-production",
      R2_BUCKET_ENVIRONMENT: "production",
      REDIS_ENVIRONMENT: "production",
    });
    expect(result.errors).toHaveLength(3);
  });
});
