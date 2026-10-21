import { describe, expect, it } from "vitest";
import { validateStorageEnvironment } from "@/lib/storageEnvironment";

const secureTestEnv = {
  STORAGE_MODEL_V2_ENABLED: "true", R2_BUCKET_ENVIRONMENT: "test",
  R2_ACCOUNT_ID: "test-account", R2_ACCESS_KEY_ID: "test-access", R2_SECRET_ACCESS_KEY: "test-secret", R2_INCOMING_BUCKET: "test-incoming",
  R2_SOURCE_BUCKET: "test-source", R2_DERIVED_BUCKET: "test-derived",
  R2_EXPECTED_ACCOUNT_ID: "test-account", R2_EXPECTED_INCOMING_BUCKET: "test-incoming",
  R2_EXPECTED_SOURCE_BUCKET: "test-source", R2_EXPECTED_DERIVED_BUCKET: "test-derived",
};

describe("secure storage environment validation", () => {
  it("accepts matching isolated bucket identities", () => {
    expect(validateStorageEnvironment("test", secureTestEnv).errors).toEqual([]);
  });

  it("rejects a mismatched account without exposing either value", () => {
    const result = validateStorageEnvironment("test", { ...secureTestEnv, R2_ACCOUNT_ID: "production-account" });
    expect(result.errors).toEqual(["R2_ACCOUNT_ID does not match its configured storage identity."]);
    expect(result.errors.join(" ")).not.toContain("production-account");
  });

  it("rejects shared buckets and public base URLs", () => {
    const result = validateStorageEnvironment("test", {
      ...secureTestEnv, R2_DERIVED_BUCKET: "test-source",
      R2_EXPECTED_DERIVED_BUCKET: "test-source", R2_PUBLIC_BASE_URL: "https://public.example.test",
    });
    expect(result.errors).toContain("Secure storage requires separate incoming, source, and derived buckets.");
    expect(result.errors).toContain("R2_PUBLIC_BASE_URL is forbidden when secure storage model v2 is enabled.");
  });

  it("requires the declared bucket environment to match data", () => {
    expect(validateStorageEnvironment("test", {
      R2_ACCOUNT_ID: "configured", R2_BUCKET: "configured", R2_BUCKET_ENVIRONMENT: "production",
    }).errors).toContain("R2_BUCKET_ENVIRONMENT must match the data environment.");
  });
});
