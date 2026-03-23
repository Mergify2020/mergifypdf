import { prisma, isPrismaDatabaseUnavailableError } from "@/lib/prisma";

export type AppSafetyCode =
  | "OK"
  | "DATABASE_URL_MISSING"
  | "DB_UNAVAILABLE"
  | "DB_SCHEMA_MISSING"
  | "DB_GUARD_MISSING"
  | "DB_IDENTITY_MISMATCH"
  | "DB_EMPTY_USERS"
  | "UNKNOWN";

export type AppSafetyStatus = {
  ok: boolean;
  code: AppSafetyCode;
  message: string;
  checkedAt: string;
  strict: boolean;
  details?: Record<string, unknown>;
};

const APP_RUNTIME_GUARD_ID = "primary";
const APP_SAFETY_CACHE_MS = 10_000;
const APP_SAFETY_DB_UNAVAILABLE_CACHE_MS = 1_500;
const APP_SAFETY_DB_RETRY_DELAYS_MS = [150, 400] as const;
const REQUIRED_TABLES = [
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "ResetToken",
  "Project",
] as const;

type GuardRow = {
  appName: string;
  environment: string;
  databaseLabel: string | null;
  requireUsers: boolean;
};

type CachedSafety = {
  expiresAt: number;
  status: AppSafetyStatus;
};

const globalForAppSafety = globalThis as typeof globalThis & {
  __appSafetyCache?: CachedSafety;
};

function getExpectedAppName() {
  return process.env.APP_RUNTIME_NAME?.trim() || "mergifypdf";
}

function getExpectedEnvironment() {
  return process.env.APP_RUNTIME_ENV?.trim() || process.env.NODE_ENV || "development";
}

function getExpectedDatabaseLabel() {
  return process.env.APP_RUNTIME_DB_LABEL?.trim() || null;
}

function isStrictMode() {
  const explicit = process.env.APP_RUNTIME_GUARD_STRICT?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return false;
}

function shouldRequireUsers() {
  return process.env.APP_RUNTIME_REQUIRE_USERS?.trim().toLowerCase() === "true";
}

function parseDatabaseTarget() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;

  try {
    const normalized = raw.startsWith("postgres://") || raw.startsWith("postgresql://")
      ? raw
      : raw.replace(/^prisma\+postgres:\/\//, "postgres://");
    const url = new URL(normalized);
    return {
      host: url.hostname || null,
      port: url.port || null,
      database: url.pathname.replace(/^\/+/, "") || null,
    };
  } catch {
    return { host: null, port: null, database: null };
  }
}

function buildStatus(
  ok: boolean,
  code: AppSafetyCode,
  message: string,
  details?: Record<string, unknown>,
): AppSafetyStatus {
  return {
    ok,
    code,
    message,
    checkedAt: new Date().toISOString(),
    strict: isStrictMode(),
    details,
  };
}

export function isAppSafetyBlocking(status: AppSafetyStatus) {
  const shouldBlockDbUnavailable = status.code === "DB_UNAVAILABLE"
    && (status.strict || process.env.NODE_ENV === "production");

  return !status.ok && (
    status.strict
      || shouldBlockDbUnavailable
      || status.code === "DB_SCHEMA_MISSING"
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryExistingTables() {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  return new Set(rows.map((row) => row.table_name));
}

async function getGuardRow() {
  return prisma.appRuntimeGuard.findUnique({
    where: { id: APP_RUNTIME_GUARD_ID },
    select: {
      appName: true,
      environment: true,
      databaseLabel: true,
      requireUsers: true,
    },
  }) as Promise<GuardRow | null>;
}

async function checkAppSafetyUncached(): Promise<AppSafetyStatus> {
  const databaseTarget = parseDatabaseTarget();
  if (!process.env.DATABASE_URL?.trim()) {
    return buildStatus(false, "DATABASE_URL_MISSING", "DATABASE_URL is not configured.");
  }

  try {
    const existingTables = await queryExistingTables();
    const missingTables = REQUIRED_TABLES.filter((tableName) => !existingTables.has(tableName));

    if (missingTables.length > 0) {
      return buildStatus(
        false,
        "DB_SCHEMA_MISSING",
        "Database schema is incomplete for this app.",
        { missingTables, databaseTarget },
      );
    }

    const guardTableExists = existingTables.has("AppRuntimeGuard");
    const strict = isStrictMode();
    if (!guardTableExists) {
      if (strict) {
        return buildStatus(
          false,
          "DB_GUARD_MISSING",
          "Database identity guard table is missing for this environment.",
          { databaseTarget },
        );
      }

      return buildStatus(true, "OK", "Database reachable. Runtime guard table is not initialized.", {
        databaseTarget,
        warning: "AppRuntimeGuard table missing",
      });
    }

    const guard = await getGuardRow();
    if (!guard) {
      if (strict) {
        return buildStatus(
          false,
          "DB_GUARD_MISSING",
          "Database identity guard is not initialized for this environment.",
          { databaseTarget },
        );
      }

      return buildStatus(true, "OK", "Database reachable. Runtime guard is not initialized.", {
        databaseTarget,
        warning: "AppRuntimeGuard row missing",
      });
    }

    const expectedAppName = getExpectedAppName();
    const expectedEnvironment = getExpectedEnvironment();
    const expectedDatabaseLabel = getExpectedDatabaseLabel();
    if (
      guard.appName !== expectedAppName
      || guard.environment !== expectedEnvironment
      || (expectedDatabaseLabel !== null && guard.databaseLabel !== expectedDatabaseLabel)
    ) {
      if (!strict) {
        return buildStatus(
          true,
          "OK",
          "Database reachable. Runtime identity does not match the expected environment, but strict mode is disabled.",
          {
            databaseTarget,
            warning: "DB_IDENTITY_MISMATCH",
            expectedAppName,
            actualAppName: guard.appName,
            expectedEnvironment,
            actualEnvironment: guard.environment,
            expectedDatabaseLabel,
            databaseLabel: guard.databaseLabel,
          },
        );
      }

      return buildStatus(
        false,
        "DB_IDENTITY_MISMATCH",
        "Database identity does not match the expected app environment.",
        {
          databaseTarget,
          expectedAppName,
          actualAppName: guard.appName,
          expectedEnvironment,
          actualEnvironment: guard.environment,
          expectedDatabaseLabel,
          databaseLabel: guard.databaseLabel,
        },
      );
    }

    const requireUsers = guard.requireUsers || shouldRequireUsers();
    if (requireUsers) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        return buildStatus(
          false,
          "DB_EMPTY_USERS",
          "Database guard requires existing users, but the user table is empty.",
          { databaseTarget, databaseLabel: guard.databaseLabel },
        );
      }
    }

    return buildStatus(true, "OK", "Database safety checks passed.", {
      databaseTarget,
      databaseLabel: guard.databaseLabel,
      requireUsers,
    });
  } catch (error) {
    if (isPrismaDatabaseUnavailableError(error)) {
      return buildStatus(
        false,
        "DB_UNAVAILABLE",
        "Unable to reach the configured database.",
        { databaseTarget },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown database safety error.";
    return buildStatus(false, "UNKNOWN", message, { databaseTarget });
  }
}

export async function getAppSafetyStatus(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();
  const cached = globalForAppSafety.__appSafetyCache;

  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.status;
  }

  let status = await checkAppSafetyUncached();

  if (status.code === "DB_UNAVAILABLE") {
    for (const delayMs of APP_SAFETY_DB_RETRY_DELAYS_MS) {
      await sleep(delayMs);
      status = await checkAppSafetyUncached();
      if (status.code !== "DB_UNAVAILABLE") break;
    }
  }

  globalForAppSafety.__appSafetyCache = {
    status,
    expiresAt: now + (status.code === "DB_UNAVAILABLE"
      ? APP_SAFETY_DB_UNAVAILABLE_CACHE_MS
      : APP_SAFETY_CACHE_MS),
  };
  return status;
}

export async function assertAppSafe() {
  const status = await getAppSafetyStatus();
  if (status.ok) return;
  throw new Error("SERVICE_UNAVAILABLE");
}

export async function assertAppSafeForAuth() {
  await assertAppSafe();
}

export async function initializeAppRuntimeGuard() {
  const row = await prisma.appRuntimeGuard.upsert({
    where: { id: APP_RUNTIME_GUARD_ID },
    update: {
      appName: getExpectedAppName(),
      environment: getExpectedEnvironment(),
      databaseLabel: process.env.APP_RUNTIME_DB_LABEL?.trim() || null,
      requireUsers: shouldRequireUsers(),
    },
    create: {
      id: APP_RUNTIME_GUARD_ID,
      appName: getExpectedAppName(),
      environment: getExpectedEnvironment(),
      databaseLabel: process.env.APP_RUNTIME_DB_LABEL?.trim() || null,
      requireUsers: shouldRequireUsers(),
    },
  });

  globalForAppSafety.__appSafetyCache = undefined;
  return row;
}
