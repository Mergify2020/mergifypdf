import AppMaintenanceScreen from "@/components/AppMaintenanceScreen";
import type { AppSafetyCode, AppSafetyStatus } from "@/lib/appSafety";

type PreviewSearchParams = {
  code?: string;
};

const VALID_CODES: AppSafetyCode[] = [
  "DATABASE_URL_MISSING",
  "DB_UNAVAILABLE",
  "DB_SCHEMA_MISSING",
  "DB_GUARD_MISSING",
  "DB_IDENTITY_MISMATCH",
  "DB_EMPTY_USERS",
  "UNKNOWN",
];

function resolveCode(value?: string): AppSafetyCode {
  if (!value) return "DB_UNAVAILABLE";
  return VALID_CODES.includes(value as AppSafetyCode) ? (value as AppSafetyCode) : "UNKNOWN";
}

export default async function MaintenancePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<PreviewSearchParams>;
}) {
  const resolved = ((await searchParams) ?? {}) as PreviewSearchParams;
  const code = resolveCode(resolved.code);

  const status: AppSafetyStatus = {
    ok: false,
    code,
    message: `Preview for ${code}`,
    checkedAt: new Date().toISOString(),
    strict: true,
  };

  return <AppMaintenanceScreen status={status} />;
}
