import { NextResponse } from "next/server";
import { getAppSafetyStatus } from "@/lib/appSafety";

export async function GET() {
  const status = await getAppSafetyStatus({ forceRefresh: true });
  return NextResponse.json(
    {
      ok: status.ok,
      code: status.code,
      checkedAt: status.checkedAt,
      strict: status.strict,
    },
    { status: status.ok ? 200 : 503 },
  );
}
