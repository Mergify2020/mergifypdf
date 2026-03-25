import type { AppSafetyStatus } from "@/lib/appSafety";

type IncidentContent = {
  title: string;
  instruction: string;
  referenceCode: string;
};

const INCIDENT_CONTENT: Record<string, IncidentContent> = {
  DB_UNAVAILABLE: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "201",
  },
  DB_SCHEMA_MISSING: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "301",
  },
  DB_GUARD_MISSING: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "302",
  },
  DB_IDENTITY_MISMATCH: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "303",
  },
  DATABASE_URL_MISSING: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "101",
  },
  DB_EMPTY_USERS: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "401",
  },
  UNKNOWN: {
    title: "This page couldn’t load",
    instruction: "Please refresh and try again.",
    referenceCode: "901",
  },
};

function getIncidentContent(status: AppSafetyStatus): IncidentContent {
  return INCIDENT_CONTENT[status.code] ?? INCIDENT_CONTENT.UNKNOWN;
}

export default function AppMaintenanceScreen({ status }: { status: AppSafetyStatus }) {
  const incident = getIncidentContent(status);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <div className="w-full max-w-2xl text-center">
        <p className="text-8xl font-semibold tracking-tight text-slate-800 sm:text-9xl">
          {incident.referenceCode}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {incident.title}
        </h1>
        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          {incident.instruction}
        </p>
        <p className="mt-6 text-sm text-slate-500">
          If the issue persists, please contact support.
        </p>
      </div>
    </main>
  );
}
