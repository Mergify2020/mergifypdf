# Secure storage v2: upload rollout

Secure uploads are disabled unless `STORAGE_MODEL_V2_ENABLED=true`. The legacy Studio path remains active until the quarantine worker and isolated R2 resources are ready.

## Security boundary

- The browser receives short-lived write-only URLs, never bucket credentials or object keys.
- Object keys contain 256 bits of randomness and are unrelated to project or user IDs.
- Every request requires an authenticated owner, same-origin mutation, rate limit, project ownership, idempotency key, declared size, PDF content type, and SHA-256 digest.
- Files land in the private incoming bucket with `QUARANTINED` status. They are not usable as project assets until structural, malware, active-content, size, and full-checksum inspection succeeds.
- Single uploads are limited to 64 MiB. Larger files use 16 MiB resumable parts, three concurrent network transfers, and bounded-memory hashing.
- Failed deletion is recorded as a `StorageDeletionJob`; cleanup failure does not silently lose the object reference.

## Owner setup required before enabling

Create separate incoming, source, and derived private buckets for each runtime. Configure the v2 variables in the environment dashboard; never paste their values into source, logs, tickets, or chat.

The incoming bucket CORS policy must allow only the exact application origins for that runtime. Allow `PUT` and `HEAD`, allow the `content-type` and `x-amz-checksum-sha256` request headers, expose `ETag`, and do not use a wildcard origin. Keep public access and custom public domains disabled.

Apply both additive storage migrations to an isolated development database first. Run `pnpm validate:env`, the test suite, and a real disposable upload before enabling preview. Production remains last.

## Rollback

Set `STORAGE_MODEL_V2_ENABLED=false`. This immediately hides the v2 endpoints and leaves the existing Studio upload path unchanged. Do not drop the additive tables while quarantine or deletion jobs exist.
