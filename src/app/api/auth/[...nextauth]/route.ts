import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);
type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

export async function GET(req: NextRequest, context: AuthRouteContext) {
  return handler(req, context);
}

export async function POST(req: NextRequest, context: AuthRouteContext) {
  return handler(req, context);
}
