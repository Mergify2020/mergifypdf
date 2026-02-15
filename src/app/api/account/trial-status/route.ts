import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      authenticated: false,
      trialUsedAt: null,
      eligibleForTrial: true,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { trialUsedAt: true },
  });

  return NextResponse.json({
    authenticated: true,
    trialUsedAt: user?.trialUsedAt ?? null,
    eligibleForTrial: !user?.trialUsedAt,
  });
}
