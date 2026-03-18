import { NextResponse } from "next/server";
import { getAppSafetyStatus } from "@/lib/appSafety";

export async function GET() {
  const status = await getAppSafetyStatus({ forceRefresh: true });
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
